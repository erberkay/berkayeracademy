// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
#include "FFTAnalyzer.h"

#include "ConflictDetector.h"

#include <algorithm>
#include <cmath>

namespace pf {

namespace {
inline double dbToPow(float db) noexcept { return std::pow(10.0, (double) db / 10.0); }
} // namespace

FFTAnalyzer::FFTAnalyzer() : conflict(std::make_unique<ConflictDetector>()) {}
FFTAnalyzer::~FFTAnalyzer() = default;

void FFTAnalyzer::prepare(double rate, int fftOrder, int points) {
    fs = rate > 0 ? rate : 48000.0;
    order = fftOrder <= 0 ? defaultFftOrder(fs) : std::clamp(fftOrder, 10, 13);
    N = 1 << order;
    hop = N / 4;
    numPoints = std::max(16, points);
    fft.setOrder(order);

    window.resize((size_t) N);
    double sumW2 = 0;
    for (int i = 0; i < N; ++i) {
        window[(size_t) i] = 0.5 - 0.5 * std::cos(2.0 * kPi * i / N);  // periodic Hann (COLA at 75 % overlap)
        sumW2 += window[(size_t) i] * window[(size_t) i];
    }
    normPow = 4.0 / ((double) N * sumW2);

    for (auto& r : ring) r.assign((size_t) N, 0.0f);
    zMain.assign((size_t) N, {});
    zSc.assign((size_t) N, {});
    pM.assign((size_t) N / 2 + 1, 0.0);
    pS.assign((size_t) N / 2 + 1, 0.0);

    const double fMin = 20.0, fMax = std::min(20000.0, 0.49 * fs);
    const double binHz = fs / N;
    const int half = N / 2;
    std::vector<float> hz((size_t) numPoints);
    kStart.assign((size_t) numPoints, 0);
    kCount.assign((size_t) numPoints, 0);
    wOff.assign((size_t) numPoints, 0);
    kw.clear();
    // |Hann spectrum|² at a fractional bin offset d (large-N form, W(0) = 1, W(±1) = ½, zeros at |d| = 2, 3, …)
    auto hannPow = [](double d) {
        d = std::fabs(d);
        if (d < 1e-9) return 1.0;
        if (std::fabs(d - 1.0) < 1e-9) return 0.25;
        const double s = std::sin(kPi * d) / (kPi * d) / (1.0 - d * d);
        return s * s;
    };
    for (int i = 0; i < numPoints; ++i) {
        const double f = fMin * std::pow(fMax / fMin, (double) i / (numPoints - 1));
        hz[(size_t) i] = (float) f;
        const double c = f / binHz;
        const double W = f * (std::pow(2.0, 1.0 / 12.0) - std::pow(2.0, -1.0 / 12.0)) / binHz;
        const double a = std::clamp((W - 3.0) / 2.0, 0.0, 1.5);
        const double b = std::max(3.0, W - 2.0 * a);
        auto kern = [a, b](double x) {
            x = std::fabs(x);
            if (x <= a) return 1.0;
            if (x >= a + b) return 0.0;
            return 0.5 * (1.0 + std::cos(kPi * (x - a) / b));
        };
        const int k0 = std::clamp((int) std::ceil(c - a - b), 0, half);
        const int k1 = std::clamp((int) std::floor(c + a + b), 0, half);
        // G: kernel response to a sine at exactly f (fraction of its total lobe power, image ignored)
        double num = 0, den = 0;
        for (int k = (int) std::floor(c) - 64; k <= (int) std::ceil(c) + 64; ++k) {
            const double pw = hannPow(k - c);
            den += pw;
            if (k >= k0 && k <= k1) num += kern(k - c) * pw;
        }
        const double g = num > 1e-12 ? num / den : 1.0;
        kStart[(size_t) i] = k0;
        kCount[(size_t) i] = std::max(0, k1 - k0 + 1);
        wOff[(size_t) i] = (int) kw.size();
        for (int k = k0; k <= k1; ++k) kw.push_back((float) (kern(k - c) / g));
    }

    for (SpectrumFrame* fr : {&raw, &disp}) {
        fr->hz = hz;
        for (auto* v : {&fr->mainMid, &fr->mainSide, &fr->scMid, &fr->scSide}) v->assign((size_t) numPoints, kFloorDb);
        fr->conflictMid.assign((size_t) numPoints, 0.0f);
        fr->conflictSide.assign((size_t) numPoints, 0.0f);
        fr->peaksMain.clear();
        fr->peaksSc.clear();
        fr->peaksMain.reserve(kMaxPeaks);
        fr->peaksSc.reserve(kMaxPeaks);
        fr->hasSidechain = false;
        fr->binHz = (float) binHz;
    }
    conflict->prepare(hz, conflict->params());  // keeps a target gap set before prepare()
    scratchA.assign((size_t) numPoints, 0.0f);
    scratchB.assign((size_t) numPoints, 0.0f);
    setBallistics(attackMs, releaseMs);
    reset();
}

void FFTAnalyzer::reset() {
    for (auto& r : ring) std::fill(r.begin(), r.end(), 0.0f);
    ringPos = 0;
    sinceHop = 0;
    samplesSeen = 0;
    lastScSample = 0;
    scConnected = false;
    dispInit = false;
    frameCount = 0;
    for (SpectrumFrame* fr : {&raw, &disp}) {
        for (auto* v : {&fr->mainMid, &fr->mainSide, &fr->scMid, &fr->scSide}) std::fill(v->begin(), v->end(), kFloorDb);
        std::fill(fr->conflictMid.begin(), fr->conflictMid.end(), 0.0f);
        std::fill(fr->conflictSide.begin(), fr->conflictSide.end(), 0.0f);
        fr->peaksMain.clear();
        fr->peaksSc.clear();
        fr->hasSidechain = false;
    }
}

void FFTAnalyzer::setTargetGapDb(float x) noexcept { conflict->setTargetGapDb(std::clamp(x, 0.0f, 9.0f)); }
float FFTAnalyzer::targetGapDb() const noexcept { return conflict->params().targetGapDb; }

void FFTAnalyzer::setBallistics(float att, float rel) noexcept {
    attackMs = std::max(0.0f, att);
    releaseMs = std::max(0.0f, rel);
    const double dt = (double) hop / fs;
    aAtt = attackMs <= 0 ? 1.0 : 1.0 - std::exp(-dt / (attackMs * 1e-3));
    aRel = releaseMs <= 0 ? 1.0 : 1.0 - std::exp(-dt / (releaseMs * 1e-3));
}

void FFTAnalyzer::feed(const float* mainL, const float* mainR, const float* scL, const float* scR, int n) {
    if (n <= 0) return;
    if (scL != nullptr || scR != nullptr) scConnected = true;
    const float* src[4] = {mainL, mainR, scL, scR};
    int i = 0;
    while (i < n) {
        const int chunk = std::min(n - i, hop - sinceHop);
        bool scActive = false;
        for (int c = 0; c < 4; ++c) {
            float* r = ring[c].data();
            int p = ringPos;
            const float* x = src[c];
            for (int k = 0; k < chunk; ++k) {
                const float v = x != nullptr ? x[i + k] : 0.0f;
                r[p] = v;
                if (c >= 2 && std::fabs(v) > 1e-9f) scActive = true;
                if (++p == N) p = 0;
            }
        }
        ringPos = (ringPos + chunk) % N;
        i += chunk;
        sinceHop += chunk;
        samplesSeen += (std::uint64_t) chunk;
        if (scActive) lastScSample = samplesSeen;
        if (sinceHop >= hop) {
            sinceHop = 0;
            runFrame();
        }
    }
}

void FFTAnalyzer::bandLevels(const std::vector<std::complex<double>>& Z, std::vector<float>& mid, std::vector<float>& side) {
    const int half = N / 2;
    for (int k = 0; k <= half; ++k) {
        const std::complex<double> a = Z[(size_t) k];
        const std::complex<double> b = std::conj(Z[(size_t) ((N - k) & (N - 1))]);
        const std::complex<double> xm = 0.5 * (a + b);
        const std::complex<double> xs = (a - b) * std::complex<double>(0.0, -0.5);  // (a − b) / (2j)
        pM[(size_t) k] = std::norm(xm);
        pS[(size_t) k] = std::norm(xs);
    }
    for (int i = 0; i < numPoints; ++i) {
        const float* w = kw.data() + wOff[(size_t) i];
        const double* am = pM.data() + kStart[(size_t) i];
        const double* as = pS.data() + kStart[(size_t) i];
        double sm = 0, ss = 0;
        for (int k = 0, e = kCount[(size_t) i]; k < e; ++k) { sm += w[k] * am[k]; ss += w[k] * as[k]; }
        sm *= normPow;
        ss *= normPow;
        mid[(size_t) i] = sm > 1e-15 ? std::max(kFloorDb, (float) (10.0 * std::log10(sm))) : kFloorDb;
        side[(size_t) i] = ss > 1e-15 ? std::max(kFloorDb, (float) (10.0 * std::log10(ss))) : kFloorDb;
    }
}

void FFTAnalyzer::runFrame() {
    // oldest sample is at ringPos
    const float* L = ring[0].data();
    const float* R = ring[1].data();
    const float* SL = ring[2].data();
    const float* SR = ring[3].data();
    const bool scOn = scConnected && lastScSample > 0 && (samplesSeen - lastScSample) < (std::uint64_t) (5.0 * fs);
    int p = ringPos;
    for (int k = 0; k < N; ++k) {
        const double w = window[(size_t) k];
        zMain[(size_t) k] = {w * 0.5 * ((double) L[p] + R[p]), w * 0.5 * ((double) L[p] - R[p])};
        if (scOn) zSc[(size_t) k] = {w * 0.5 * ((double) SL[p] + SR[p]), w * 0.5 * ((double) SL[p] - SR[p])};
        if (++p == N) p = 0;
    }
    fft.perform(zMain.data(), false);
    bandLevels(zMain, raw.mainMid, raw.mainSide);
    if (scOn) {
        fft.perform(zSc.data(), false);
        bandLevels(zSc, raw.scMid, raw.scSide);
    } else {
        std::fill(raw.scMid.begin(), raw.scMid.end(), kFloorDb);
        std::fill(raw.scSide.begin(), raw.scSide.end(), kFloorDb);
    }
    raw.hasSidechain = scOn;
    disp.hasSidechain = scOn;

    if (accumulator != nullptr) {
        conflict->compute(raw, gainOffsetDb);
        accumulator->add(raw);
    }

    // ballistics (dB domain)
    auto ballistic = [this](const std::vector<float>& x, std::vector<float>& y) {
        for (size_t i = 0; i < x.size(); ++i) {
            const float d = x[i] - y[i];
            y[i] += (float) ((d > 0 ? aAtt : aRel) * d);
        }
    };
    if (!dispInit) {
        disp.mainMid = raw.mainMid;
        disp.mainSide = raw.mainSide;
        disp.scMid = raw.scMid;
        disp.scSide = raw.scSide;
        dispInit = true;
    } else {
        ballistic(raw.mainMid, disp.mainMid);
        ballistic(raw.mainSide, disp.mainSide);
        ballistic(raw.scMid, disp.scMid);
        ballistic(raw.scSide, disp.scSide);
    }
    conflict->compute(disp, gainOffsetDb);
    findSpectralPeaks(disp.hz, disp.mainMid, disp.mainSide, disp.peaksMain, kMaxPeaks, disp.binHz);
    if (scOn) findSpectralPeaks(disp.hz, disp.scMid, disp.scSide, disp.peaksSc, kMaxPeaks, disp.binHz);
    else disp.peaksSc.clear();
    ++frameCount;
}

// ───────────────────────────── peaks
void findSpectralPeaks(const std::vector<float>& hz, const std::vector<float>& mid, const std::vector<float>& side,
                       std::vector<int>& out, int maxPeaks, float binHz) {
    out.clear();
    const int n = (int) hz.size();
    if (n < 3 || (int) mid.size() != n || (int) side.size() != n) return;
    // points per octave of this grid
    const double ppo = (n - 1) / std::log2((double) hz[(size_t) (n - 1)] / hz[0]);
    const int wPeak = std::max(1, (int) std::lround(ppo / 6.0));
    const int wPromOct = std::max(2, (int) std::lround(ppo / 2.0));
    thread_local std::vector<float> t;
    t.resize((size_t) n);
    float tMax = kFloorDb;
    for (int i = 0; i < n; ++i) {
        const double pw = dbToPow(mid[(size_t) i]) + dbToPow(side[(size_t) i]);
        t[(size_t) i] = pw > 1e-15 ? (float) (10.0 * std::log10(pw)) : kFloorDb;
        tMax = std::max(tMax, t[(size_t) i]);
    }
    struct P { int i; float v; };
    thread_local std::vector<P> cand;
    cand.clear();
    for (int i = 0; i < n; ++i) {
        const float v = t[(size_t) i];
        if (v < -120.0f || v < tMax - 60.0f) continue;
        bool isMax = true;
        for (int j = std::max(0, i - wPeak); j <= std::min(n - 1, i + wPeak) && isMax; ++j) {
            if (j < i && t[(size_t) j] >= v) isMax = false;   // plateau: leftmost point wins
            if (j > i && t[(size_t) j] > v) isMax = false;
        }
        if (!isMax) continue;
        // window: ±max(1/2 oct, 5 bins)
        int jl = i - wPromOct, jr = i + wPromOct;
        if (binHz > 0.0f) {
            const float fl = hz[(size_t) i] - 5.0f * binHz, fr = hz[(size_t) i] + 5.0f * binHz;
            while (jl > 0 && hz[(size_t) jl] > fl) --jl;
            while (jr < n - 1 && hz[(size_t) jr] < fr) ++jr;
        }
        const bool lCut = jl < 0 || (binHz > 0.0f && hz[0] > hz[(size_t) i] - 5.0f * binHz && jl <= 0);
        const bool rCut = jr > n - 1 || (binHz > 0.0f && hz[(size_t) (n - 1)] < hz[(size_t) i] + 5.0f * binHz && jr >= n - 1);
        float lMin = v, rMin = v;
        for (int j = std::max(0, jl); j < i; ++j) lMin = std::min(lMin, t[(size_t) j]);
        for (int j = i + 1; j <= std::min(n - 1, jr); ++j) rMin = std::min(rMin, t[(size_t) j]);
        float ref;
        if (lCut && rCut) ref = std::min(lMin, rMin);
        else if (lCut) ref = rMin;
        else if (rCut) ref = lMin;
        else ref = std::max(lMin, rMin);
        if (v - ref < 6.0f) continue;
        cand.push_back({i, v});
    }
    std::sort(cand.begin(), cand.end(), [](const P& a, const P& b) { return a.v > b.v; });
    for (size_t k = 0; k < cand.size() && (int) out.size() < maxPeaks; ++k) out.push_back(cand[k].i);
}

} // namespace pf
