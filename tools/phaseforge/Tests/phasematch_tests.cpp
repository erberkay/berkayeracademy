// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASE MATCH unit tests (standalone, nonzero exit on failure).
// Build: g++ -std=c++20 -O2 -I tools/phaseforge/Source tools/phaseforge/Tests/phasematch_tests.cpp
//        tools/phaseforge/Source/DSP/PhaseMatcher.cpp -o /tmp/pf_phasematch_tests
#include "DSP/PhaseMatcher.h"

#include <atomic>
#include <chrono>
#include <cstdio>
#include <functional>
#include <random>
#include <thread>

using namespace pf;
using cd = std::complex<double>;

static int gFail = 0, gPass = 0;
#define CHECK(cond, ...)                                                    \
    do {                                                                    \
        if (cond) { ++gPass; } else {                                       \
            ++gFail;                                                        \
            std::printf("  FAIL %s:%d: %s — ", __FILE__, __LINE__, #cond);  \
            std::printf(__VA_ARGS__);                                       \
            std::printf("\n");                                              \
        }                                                                   \
    } while (0)

// ───────────────────────────── signal helpers
struct Coefs { double b0, b1, b2, a1, a2; };
static Coefs allpass2(double fs, double f0, double Q) {
    const double w0 = 2 * kPi * f0 / fs, al = std::sin(w0) / (2 * Q), a0 = 1 + al;
    return {(1 - al) / a0, -2 * std::cos(w0) / a0, (1 + al) / a0, -2 * std::cos(w0) / a0, (1 - al) / a0};
}
static Coefs allpass1(double fs, double f0) {
    const double t = std::tan(kPi * f0 / fs), c = (t - 1) / (t + 1);
    return {c, 1, 0, c, 0};
}
static std::vector<float> filt(const Coefs& c, const std::vector<float>& x) {
    Biquad q;
    q.b0 = c.b0; q.b1 = c.b1; q.b2 = c.b2; q.a1 = c.a1; q.a2 = c.a2;
    std::vector<float> y(x.size());
    for (size_t i = 0; i < x.size(); ++i) y[i] = (float) q.process(x[i]);
    return y;
}
static double phaseDegOf(const Coefs& c, double fs, double f) {  // arg H(e^{jω})
    const cd z1 = std::polar(1.0, -2 * kPi * f / fs), z2 = z1 * z1;
    return std::arg((c.b0 + c.b1 * z1 + c.b2 * z2) / (1.0 + c.a1 * z1 + c.a2 * z2)) * 180 / kPi;
}
static double wrapD(double d) { d = std::fmod(d, 360.0); if (d <= -180) d += 360; if (d > 180) d -= 360; return d; }
static std::vector<float> butterChain(const std::vector<float>& x, double fs, double fc, bool hp, int stages) {
    std::vector<float> y = x;
    for (int s = 0; s < stages; ++s) {
        Biquad q = butter2(fs, fc, hp);
        for (auto& v : y) v = (float) q.process(v);
    }
    return y;
}
static std::vector<float> lfNoise(int n, double fs, unsigned seed, double lp = 400, double hp = 20) {
    std::mt19937 rng(seed);
    std::normal_distribution<float> nd(0.f, 1.f);
    std::vector<float> x((size_t) n);
    for (auto& v : x) v = nd(rng);
    x = butterChain(x, fs, lp, false, 2);
    x = butterChain(x, fs, hp, true, 1);
    double ms = 0;
    for (auto v : x) ms += (double) v * v;
    const float g = (float) (0.25 / std::sqrt(ms / n));
    for (auto& v : x) v *= g;
    return x;
}
static std::vector<float> kickTrain(int n, double fs, double periodSec) {
    std::vector<float> x((size_t) n, 0.f);
    const int per = (int) (periodSec * fs);
    for (int s0 = (int) (0.01 * fs); s0 < n; s0 += per) {
        double ph = 0;
        for (int i = 0; i < (int) (0.45 * fs) && s0 + i < n; ++i) {
            const double t = i / fs;
            const double f = 45 + 110 * std::exp(-t / 0.03);
            ph += 2 * kPi * f / fs;
            const double env = std::exp(-t / 0.12) * std::min(1.0, t / 0.0008);
            x[(size_t) (s0 + i)] += (float) (0.6 * env * std::sin(ph));
        }
    }
    return x;
}
static double gNoiseFs = 48000;
static std::vector<float> addNoise(std::vector<float> x, double rmsLevel, unsigned seed) {
    std::mt19937 rng(seed);
    std::normal_distribution<float> nd(0.f, (float) rmsLevel);
    std::vector<float> w(x.size());
    for (auto& v : w) v = nd(rng);
    w = butterChain(w, gNoiseFs, 2000, false, 1);
    for (size_t i = 0; i < x.size(); ++i) x[i] += w[i];
    return x;
}
// run a mono signal through the matcher with irregular host block sizes
static std::vector<float> runMono(PhaseMatcher& pm, const std::vector<float>& x, unsigned seed = 7,
                                  const std::function<void(size_t)>& perBlock = {}) {
    std::vector<float> y = x;
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int> bs(1, 700);
    size_t i = 0;
    while (i < y.size()) {
        const int m = (int) std::min<size_t>((size_t) bs(rng), y.size() - i);
        if (perBlock) perBlock(i);
        float* p = y.data() + i;
        pm.process(&p, 1, m);
        i += (size_t) m;
    }
    return y;
}
static cd kernelResp(const std::vector<double>& h, int hs, double fs, double f) {
    cd a{};
    for (size_t i = 0; i < h.size(); ++i) a += h[i] * std::polar(1.0, -2 * kPi * f * ((double) i - hs) / fs);
    return a;
}
static double kernelMagDevDb(const std::vector<double>& h, int hs, double fs) {
    double dev = 0;
    for (int i = 0; i <= 400; ++i) {
        const double f = 20.0 * std::pow(std::min(20000.0, 0.49 * fs) / 20.0, i / 400.0);
        dev = std::max(dev, std::fabs(20 * std::log10(std::abs(kernelResp(h, hs, fs, f)))));
    }
    return dev;
}
static const char* statusName(PhaseMatchEstimate::Status s) {
    switch (s) {
        case PhaseMatchEstimate::Status::Ok: return "Ok";
        case PhaseMatchEstimate::Status::NotEnoughAudio: return "NotEnoughAudio";
        default: return "Unrelated";
    }
}

struct SumResult { double gainDb, corrBefore, corrAfter, shortfallDb; };
// band-limited sum energy before/after correction, evaluated on [evalA, end)
static SumResult sumGain(const std::vector<float>& D, const std::vector<float>& S, const std::vector<float>& Sc, int lat,
                         double fs, size_t evalA, double bLo, double bHi) {
    auto band = [&](std::vector<float> x) { return butterChain(butterChain(x, fs, bLo, true, 2), fs, bHi, false, 2); };
    std::vector<float> Dd(D.size(), 0.f);
    for (size_t i = (size_t) lat; i < D.size(); ++i) Dd[i] = D[i - (size_t) lat];
    const auto bD = band(D), bS = band(S), bDd = band(Dd), bSc = band(Sc);
    double e0 = 0, e1 = 0, eIdeal = 0, xy0 = 0, xx0 = 0, yy0 = 0, xy1 = 0, xx1 = 0, yy1 = 0;
    for (size_t i = evalA; i < D.size(); ++i) {
        const double a = bD[i], b = bS[i], c = bDd[i], d = bSc[i];
        e0 += (a + b) * (a + b);
        e1 += (c + d) * (c + d);
        eIdeal += (std::fabs(c) + std::fabs(d)) * (std::fabs(c) + std::fabs(d));
        xy0 += a * b; xx0 += a * a; yy0 += b * b;
        xy1 += c * d; xx1 += c * c; yy1 += d * d;
    }
    // shortfall vs perfectly coherent sum of the same band energies: (√Ed + √Es)²
    const double ideal = std::pow(std::sqrt(xx1) + std::sqrt(yy1), 2);
    (void) eIdeal;
    return {10 * std::log10(e1 / e0), xy0 / std::sqrt(xx0 * yy0), xy1 / std::sqrt(xx1 * yy1), 10 * std::log10(ideal / e1)};
}

// ───────────────────────────── tests
static void testIdentity() {
    std::printf("\n[identity / latency]\n");
    for (double fs : {44100.0, 48000.0, 96000.0, 192000.0}) {
        PhaseMatcher pm;
        pm.prepare(fs, 512, 2);
        const int L = pm.latency();
        CHECK(L == (int) std::lround(0.025 * fs) + 128, "latency %d", L);
        const int n = (int) (0.6 * fs);
        auto a = lfNoise(n, fs, 1, 15000, 5), b = lfNoise(n, fs, 2, 15000, 5);
        std::vector<float> ya = a, yb = b;
        std::mt19937 rng(3);
        std::uniform_int_distribution<int> bs(1, 1024);
        for (int i = 0; i < n;) {
            const int m = std::min(n - i, bs(rng));
            float* p[2] = {ya.data() + i, yb.data() + i};
            pm.process(p, 2, m);
            i += m;
        }
        double err = 0, ref = 0;
        for (int i = L; i < n; ++i) {
            err += std::pow((double) ya[i] - a[i - L], 2) + std::pow((double) yb[i] - b[i - L], 2);
            ref += (double) a[i - L] * a[i - L] + (double) b[i - L] * b[i - L];
        }
        const double db = 10 * std::log10(err / ref + 1e-300);
        std::printf("  fs %6.0f  latency %5d (Hs %d + 128)  identity error %.1f dB\n", fs, L, L - 128, db);
        CHECK(db < -120, "identity error %.1f dB", db);
    }
}

// two real channels share one complex convolution: each must equal its own mono run (3 channels: odd pair too)
static void testChannelPacking() {
    std::printf("\n[channel packing]\n");
    const double fs = 48000;
    const int n = (int) (2 * fs);
    auto D = lfNoise(n, fs, 71);
    auto S = addNoise(filt(allpass2(fs, 80, 0.707), D), 0.005, 3);
    PhaseMatcher est;
    const auto e = est.estimate(D.data(), S.data(), n, fs, 20, 250);
    std::vector<std::vector<float>> in = {lfNoise(n, fs, 72, 5000), lfNoise(n, fs, 73, 5000), lfNoise(n, fs, 74, 5000)};
    PhaseMatcher pm;
    pm.prepare(fs, 512, 3);
    pm.setCorrection(e, 1.0);
    auto out = in;
    for (int i = 0; i < n; i += 300) {
        float* p[3] = {out[0].data() + i, out[1].data() + i, out[2].data() + i};
        pm.process(p, 3, std::min(300, n - i));
    }
    double worst = -400;
    for (int c = 0; c < 3; ++c) {
        PhaseMatcher m;
        m.prepare(fs, 512, 1);
        m.setCorrection(e, 1.0);
        const auto ref = runMono(m, in[(size_t) c]);
        double err = 0, en = 0;
        for (int i = (int) (0.1 * fs); i < n; ++i) {
            err += std::pow((double) out[(size_t) c][(size_t) i] - ref[(size_t) i], 2);
            en += (double) ref[(size_t) i] * ref[(size_t) i];
        }
        worst = std::max(worst, 10 * std::log10(err / en + 1e-300));
    }
    std::printf("  3 channels (pair + odd) vs individual mono runs: worst error %.1f dB\n", worst);
    CHECK(worst < -120, "packing error %.1f dB", worst);
}

struct ApCase {
    PhaseMatchEstimate e;
    PhaseMatchDesign d;
    SumResult sr;
    double maxErr = 0, rmsErr = 0;       // measured φ vs truth where γ² ≥ 0.9
    double maxErrRel = 0;                // measured φ vs truth where γ² ≥ 0.9 and weight ≥ 0.5
    double maxErrApplied = 0;            // realized blend-1 kernel phase vs truth where weight ≥ 0.5
    int nCoh = 0, nRel = 0;
    double estMs = 0;
};

// submissive = dominant through a 2nd-order allpass (fc 80 Hz) + noise
static ApCase runAllpassCase(double fs, bool kick, double lo, double hi, bool verbose, double estSec = 3.0) {
    ApCase r;
    const int n = (int) (6.0 * fs);
    std::vector<float> D = kick ? kickTrain(n, fs, 0.5) : lfNoise(n, fs, 11);
    gNoiseFs = fs;
    const Coefs ap = allpass2(fs, 80, 0.707);
    std::vector<float> S = addNoise(filt(ap, D), 0.01, 99);  // ~ −28 dB re the noise dominant
    const int nEst = (int) (estSec * fs);
    PhaseMatcher pm;
    const auto t0 = std::chrono::steady_clock::now();
    r.e = pm.estimate(D.data(), S.data(), nEst, fs, lo, hi);
    r.estMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
    double se = 0;
    for (size_t g = 0; g < r.e.hz.size(); ++g) {
        if (r.e.coherence[g] < 0.9) continue;
        const double truth = -phaseDegOf(ap, fs, r.e.hz[g]);
        const double err = std::fabs(wrapD(r.e.phaseDeg[g] - truth));
        r.maxErr = std::max(r.maxErr, err);
        se += err * err;
        ++r.nCoh;
        if (r.e.weight[g] >= 0.5) { r.maxErrRel = std::max(r.maxErrRel, err); ++r.nRel; }
    }
    r.rmsErr = r.nCoh ? std::sqrt(se / r.nCoh) : 0;
    pm.prepare(fs, 512, 1);
    const bool ok = pm.setCorrection(r.e, 1.0, &r.d);
    CHECK(ok, "setCorrection refused (status %s)", statusName(r.e.status));
    for (size_t g = 0; g < r.e.hz.size(); ++g) {
        if (r.e.weight[g] < 0.5) continue;
        const double truth = -phaseDegOf(ap, fs, r.e.hz[g]);
        const double real = std::arg(kernelResp(r.d.h, r.d.hs, fs, r.e.hz[g])) * 180 / kPi;
        r.maxErrApplied = std::max(r.maxErrApplied, std::fabs(wrapD(real - truth)));
    }
    const auto Sc = runMono(pm, S);
    r.sr = sumGain(D, S, Sc, pm.latency(), fs, (size_t) nEst, std::max(lo, 25.0), hi);
    if (verbose) {
        std::printf("  %-5s fs %6.0f band %3.0f–%4.0f Hz: status %s conf %.2f frames %d/%d | phase err (γ²≥0.9, %d pts) "
                    "max %.2f° rms %.2f°; w≥0.5 (%d pts) max %.2f°; applied vs truth max %.2f° | corr max %.0f° "
                    "spread %.2f ms aggr %d(r%u) | FIR mag dev %.3f dB, phase err "
                    "max %.2f° rms %.2f°, pre %.1f dB, τlim %.2f ms | sum %+.2f dB, corr %.3f→%.3f, shortfall %.2f dB | "
                    "est %.0f ms (%.0f s)\n",
                    kick ? "kick" : "noise", fs, lo, hi, statusName(r.e.status), r.e.confidence, r.e.activeFrames,
                    r.e.totalFrames, r.nCoh, r.maxErr, r.rmsErr, r.nRel, r.maxErrRel, r.maxErrApplied, r.e.maxCorrectionDeg,
                    r.e.groupDelaySpreadMs,
                    (int) r.e.aggressive, r.e.aggressiveReasons, r.d.magDevDb, r.d.phaseErrMaxDeg, r.d.phaseErrRmsDeg,
                    r.d.preRingDb, r.d.groupDelayLimitMs, r.sr.gainDb, r.sr.corrBefore, r.sr.corrAfter,
                    r.sr.shortfallDb, r.estMs, estSec);
    }
    return r;
}

static void testKnownPhase() {
    std::printf("\n[known phase: allpass 2nd order fc 80 Hz]\n");
    for (bool kick : {false, true}) {
        ApCase r = runAllpassCase(48000, kick, 20, 250, true);
        CHECK(r.e.status == PhaseMatchEstimate::Status::Ok, "status %s", statusName(r.e.status));
        CHECK(r.nCoh > 100 && r.nRel > 100, "too few coherent points %d / %d", r.nCoh, r.nRel);
        if (!kick) CHECK(r.maxErr < 10.0, "max phase error %.2f°", r.maxErr);  // broadband: every coherent point
        CHECK(r.maxErrRel < 10.0, "max phase error (reliable) %.2f°", r.maxErrRel);
        CHECK(r.maxErrApplied < 10.0, "applied correction error %.2f°", r.maxErrApplied);
        CHECK(r.sr.gainDb > 1.0, "sum gain %.2f dB", r.sr.gainDb);
        CHECK(r.sr.corrAfter > 0.95 && r.sr.corrAfter > r.sr.corrBefore, "corr %.3f → %.3f", r.sr.corrBefore,
              r.sr.corrAfter);
        CHECK(r.d.magWithinSpec && r.d.magDevDb <= 0.5, "mag dev %.3f dB", r.d.magDevDb);
        CHECK(kernelMagDevDb(r.d.h, r.d.hs, 48000) <= 0.5, "independent mag dev %.3f dB",
              kernelMagDevDb(r.d.h, r.d.hs, 48000));
        CHECK(r.e.aggressive, "inverting an 80 Hz allpass should be flagged aggressive");
    }
    std::printf("  shortest supported capture (2 s):\n");
    ApCase r = runAllpassCase(48000, false, 20, 250, true, 2.0);
    CHECK(r.e.status == PhaseMatchEstimate::Status::Ok && r.maxErr < 10.0 && r.sr.corrAfter > 0.95, "2 s capture");
}

static void testBlend() {
    std::printf("\n[blend]\n");
    const double fs = 48000;
    const int n = (int) (3 * fs);
    auto D = lfNoise(n, fs, 21);
    const Coefs ap = allpass1(fs, 400);
    auto S = addNoise(filt(ap, D), 0.005, 5);
    PhaseMatcher pm;
    const auto e = pm.estimate(D.data(), S.data(), n, fs, 20, 250);
    CHECK(e.status == PhaseMatchEstimate::Status::Ok, "status %s", statusName(e.status));
    const auto d1 = PhaseMatcher::designCorrection(e, 1.0, fs);
    const auto d5 = PhaseMatcher::designCorrection(e, 0.5, fs);
    const auto d0 = PhaseMatcher::designCorrection(e, 0.0, fs);
    double maxE = 0, maxE1 = 0, maxR = 0;
    for (size_t g = 0; g < e.hz.size(); g += 4) {
        const double f = e.hz[g];
        const double p1 = std::arg(kernelResp(d1.h, d1.hs, fs, f)) * 180 / kPi;
        const double p5 = std::arg(kernelResp(d5.h, d5.hs, fs, f)) * 180 / kPi;
        maxE = std::max(maxE, std::fabs(wrapD(p5 - 0.5 * e.correctionDeg[g])));
        maxE1 = std::max(maxE1, std::fabs(wrapD(p1 - e.correctionDeg[g])));
        if (std::fabs(e.correctionDeg[g]) > 10) maxR = std::max(maxR, std::fabs(p5 / p1 - 0.5));
    }
    double d0dev = 0;
    for (size_t i = 0; i < d0.h.size(); ++i) d0dev = std::max(d0dev, std::fabs(d0.h[i] - (i == (size_t) d0.hs ? 1.0 : 0.0)));
    std::printf("  1st-order allpass 400 Hz, band 20–250: max corr %.1f°; realized@1 vs target max err %.2f°; realized@0.5 "
                "vs 0.5·target max err %.2f°; |ratio−0.5| max %.3f; blend 0 kernel vs δ max %.2e; aggressive %d (spread "
                "%.2f ms, pre %.1f dB)\n",
                e.maxCorrectionDeg, maxE1, maxE, maxR, d0dev, (int) e.aggressive, e.groupDelaySpreadMs, e.preRingDb);
    CHECK(maxE < 3.0, "blend 0.5 error %.2f°", maxE);
    CHECK(maxR < 0.06, "ratio error %.3f", maxR);
    CHECK(d0dev < 1e-9, "blend 0 not identity %.2e", d0dev);
    CHECK(!e.aggressive, "mild correction flagged aggressive (reasons %u)", e.aggressiveReasons);
    // blend 0 through the processor → identity
    PhaseMatcher pr;
    pr.prepare(fs, 512, 1);
    CHECK(pr.setCorrection(e, 0.0), "setCorrection(0) refused");
    const auto y = runMono(pr, D);
    const int L = pr.latency();
    double err = 0, ref = 0;
    for (int i = L + (int) (0.05 * fs); i < n; ++i) {
        err += std::pow((double) y[i] - D[i - L], 2);
        ref += (double) D[i - L] * D[i - L];
    }
    const double db = 10 * std::log10(err / ref + 1e-300);
    std::printf("  blend 0 via processor: error vs delayed input %.1f dB\n", db);
    CHECK(db < -120, "blend-0 processor error %.1f dB", db);
}

static void testUnrelatedAndSilence() {
    std::printf("\n[unrelated / not enough audio]\n");
    const double fs = 48000;
    const int n = (int) (3 * fs);
    PhaseMatcher pm;
    pm.prepare(fs, 512, 1);
    {
        auto D = lfNoise(n, fs, 31), S = lfNoise(n, fs, 32);
        const auto e = pm.estimate(D.data(), S.data(), n, fs, 20, 250);
        double mx = 0, mc = 0;
        for (auto v : e.correctionDeg) mx = std::max(mx, (double) std::fabs(v));
        for (auto v : e.coherence) mc += v;
        mc /= std::max<size_t>(1, e.coherence.size());
        std::printf("  independent noises: status %s confidence %.3f mean γ² %.3f max |corr| %.1f°\n", statusName(e.status),
                    e.confidence, mc, mx);
        CHECK(e.status == PhaseMatchEstimate::Status::Unrelated, "status %s", statusName(e.status));
        CHECK(mx == 0 && e.maxCorrectionDeg == 0 && !e.aggressive, "nonzero correction");
        CHECK(!pm.setCorrection(e, 1.0), "setCorrection accepted an Unrelated estimate");
    }
    {
        auto D = kickTrain(n, fs, 0.5), S = lfNoise(n, fs, 33);  // kick vs an unrelated bass-like noise
        const auto e = pm.estimate(D.data(), S.data(), n, fs, 20, 250);
        std::printf("  kick vs unrelated LF noise: status %s confidence %.3f\n", statusName(e.status), e.confidence);
        CHECK(e.status == PhaseMatchEstimate::Status::Unrelated, "status %s", statusName(e.status));
    }
    {
        std::vector<float> z((size_t) n, 0.f);
        const auto e = pm.estimate(z.data(), z.data(), n, fs, 20, 250);
        std::printf("  silence: status %s\n", statusName(e.status));
        CHECK(e.status == PhaseMatchEstimate::Status::NotEnoughAudio, "status %s", statusName(e.status));
        CHECK(!pm.setCorrection(e, 1.0), "accepted NotEnoughAudio");
        auto D = lfNoise(n, fs, 34);
        const auto e2 = pm.estimate(D.data(), z.data(), n, fs, 20, 250);
        std::printf("  dominant only (main silent): status %s\n", statusName(e2.status));
        CHECK(e2.status == PhaseMatchEstimate::Status::NotEnoughAudio, "status %s", statusName(e2.status));
        const auto e3 = pm.estimate(D.data(), D.data(), 4000, fs, 20, 250);
        std::printf("  4000 samples: status %s\n", statusName(e3.status));
        CHECK(e3.status == PhaseMatchEstimate::Status::NotEnoughAudio, "status %s", statusName(e3.status));
        auto Dq = D;  // −110 dBFS: below the absolute gate
        for (auto& v : Dq) v *= 1e-5f;
        const auto e4 = pm.estimate(Dq.data(), Dq.data(), n, fs, 20, 250);
        std::printf("  identical signals at −110 dBFS: status %s\n", statusName(e4.status));
        CHECK(e4.status == PhaseMatchEstimate::Status::NotEnoughAudio, "status %s", statusName(e4.status));
    }
    {
        auto D = lfNoise(n, fs, 35);
        const auto e = pm.estimate(D.data(), D.data(), n, fs, 20, 250);
        double mx = 0;
        for (auto v : e.correctionDeg) mx = std::max(mx, (double) std::fabs(v));
        std::printf("  identical signals: status %s conf %.3f max |corr| %.3f° aggressive %d\n", statusName(e.status),
                    e.confidence, mx, (int) e.aggressive);
        CHECK(e.status == PhaseMatchEstimate::Status::Ok && mx < 0.5 && !e.aggressive, "identical: max corr %.3f", mx);
    }
}

static void testAggressive() {
    std::printf("\n[aggressive flag]\n");
    const double fs = 48000;
    const int n = (int) (3 * fs);
    auto D = lfNoise(n, fs, 41);
    PhaseMatcher pm;
    struct C { const char* name; Coefs c; bool expect; };
    const C cases[] = {
        {"allpass2 100 Hz Q 4 (steep)", allpass2(fs, 100, 4.0), true},
        {"allpass2 60 Hz Q 2", allpass2(fs, 60, 2.0), true},
        {"allpass1 400 Hz (mild)", allpass1(fs, 400), false},
        {"allpass1 1 kHz (mild)", allpass1(fs, 1000), false},
    };
    {   // submissive lags by 3 ms (not time-aligned): the correction is a 3 ms advance → pre-ringing
        std::vector<float> S((size_t) n, 0.f);
        const int dl = (int) std::lround(0.003 * fs);
        for (int i = dl; i < n; ++i) S[(size_t) i] = D[(size_t) (i - dl)];
        S = addNoise(S, 0.005, 6);
        const auto e = pm.estimate(D.data(), S.data(), n, fs, 20, 250);
        std::printf("  %-30s status %s maxCorr %.0f° spread %.2f ms pre %.1f dB mag %.3f dB → aggressive %d (reasons "
                    "%u)\n",
                    "submissive 3 ms late", statusName(e.status), e.maxCorrectionDeg, e.groupDelaySpreadMs, e.preRingDb,
                    e.realizedMagDevDb, (int) e.aggressive, e.aggressiveReasons);
        CHECK(e.status == PhaseMatchEstimate::Status::Ok && e.aggressive && (e.aggressiveReasons & 4u),
              "3 ms advance not flagged for pre-ringing (reasons %u)", e.aggressiveReasons);
    }
    for (const auto& c : cases) {
        auto S = addNoise(filt(c.c, D), 0.005, 6);
        const auto e = pm.estimate(D.data(), S.data(), n, fs, 20, 250);
        std::printf("  %-30s status %s maxCorr %.0f° spread %.2f ms pre %.1f dB mag %.3f dB → aggressive %d (reasons "
                    "%u)\n",
                    c.name, statusName(e.status), e.maxCorrectionDeg, e.groupDelaySpreadMs, e.preRingDb,
                    e.realizedMagDevDb, (int) e.aggressive, e.aggressiveReasons);
        CHECK(e.status == PhaseMatchEstimate::Status::Ok, "status");
        CHECK(e.aggressive == c.expect, "%s: aggressive %d", c.name, (int) e.aggressive);
        CHECK(e.realizedMagDevDb <= 0.5, "mag dev %.3f", e.realizedMagDevDb);
    }
}

// Kernel swaps during playback (another thread calls setCorrection/clearCorrection while audio runs).
static void testSwapNoClicks() {
    std::printf("\n[kernel swap during playback]\n");
    const double fs = 48000;
    const int n = (int) (3 * fs);
    auto D = lfNoise(n, fs, 51);
    auto S = addNoise(filt(allpass2(fs, 80, 0.707), D), 0.005, 7);
    PhaseMatcher est;
    const auto e = est.estimate(D.data(), S.data(), n, fs, 20, 250);
    CHECK(e.status == PhaseMatchEstimate::Status::Ok, "status");

    // test tone: 55 + 90 + 140 Hz (where the correction is large)
    const int m = (int) (4 * fs);
    std::vector<float> x((size_t) m);
    for (int i = 0; i < m; ++i)
        x[(size_t) i] = (float) (0.3 * std::sin(2 * kPi * 55 * i / fs) + 0.3 * std::sin(2 * kPi * 90 * i / fs + 1) +
                                 0.3 * std::sin(2 * kPi * 140 * i / fs + 2));
    auto d2max = [](const std::vector<float>& y, size_t a, size_t b) {
        double mx = 0;
        for (size_t i = a + 1; i + 1 < b; ++i) mx = std::max(mx, std::fabs((double) y[i + 1] - 2.0 * y[i] + y[i - 1]));
        return mx;
    };
    // references: steady identity / steady corrected
    PhaseMatcher pa, pb;
    pa.prepare(fs, 512, 1);
    pb.prepare(fs, 512, 1);
    pb.setCorrection(e, 1.0);
    const auto ya = runMono(pa, x), yb = runMono(pb, x);
    const size_t s0 = (size_t) (0.3 * fs);
    const double refD2 = std::max(d2max(ya, s0, (size_t) m), d2max(yb, s0, (size_t) m));
    // hard switch (what a swap without crossfade would do)
    std::vector<float> yh = ya;
    for (size_t i = (size_t) (2 * fs) + 37; i < (size_t) m; ++i) yh[i] = yb[i];
    const double hardRatio = d2max(yh, s0, (size_t) m) / refD2;

    // live: writer thread toggles corrected / blend 0.5 / identity while the audio loop runs
    PhaseMatcher pm;
    pm.prepare(fs, 512, 1);
    std::atomic<size_t> audioPos{0};
    std::atomic<bool> done{false};
    std::atomic<int> sets{0};
    std::thread writer([&] {
        int k = 0;
        while (!done.load()) {
            const size_t p = audioPos.load();
            if (p > (size_t) (0.3 * fs) + (size_t) k * (size_t) (0.11 * fs)) {
                if (k % 3 == 0) pm.setCorrection(e, 1.0);
                else if (k % 3 == 1) pm.setCorrection(e, 0.5);
                else pm.clearCorrection();
                ++k;
                sets.fetch_add(1);
            }
            std::this_thread::yield();
        }
    });
    std::vector<float> y = x;
    int fades = 0;
    bool wasFading = false;
    std::mt19937 rng(9);
    std::uniform_int_distribution<int> bs(16, 512);
    for (size_t i = 0; i < y.size();) {
        const int b = (int) std::min<size_t>((size_t) bs(rng), y.size() - i);
        float* p = y.data() + i;
        pm.process(&p, 1, b);
        if (pm.isCrossfading() && !wasFading) ++fades;
        wasFading = pm.isCrossfading();
        i += (size_t) b;
        audioPos.store(i);
        // emulate real time (4× faster) so the writer interleaves with the audio loop
        std::this_thread::sleep_for(std::chrono::microseconds((long) (b / fs * 1e6 / 4)));
    }
    done.store(true);
    writer.join();
    const double liveRatio = d2max(y, s0, (size_t) m) / refD2;
    // fast back-to-back sets (faster than the fade): must not click either
    PhaseMatcher pq;
    pq.prepare(fs, 512, 1);
    std::vector<float> yq = x;
    for (size_t i = 0, blk = 0; i < yq.size(); ++blk) {
        const int b = (int) std::min<size_t>(256, yq.size() - i);
        if (blk > 60 && blk % 3 == 0) { if ((blk / 3) % 2) pq.setCorrection(e, 1.0); else pq.clearCorrection(); }
        float* p = yq.data() + i;
        pq.process(&p, 1, b);
        i += (size_t) b;
    }
    const double fastRatio = d2max(yq, s0, (size_t) m) / refD2;
    std::printf("  max|Δ²y| ratio vs steady state: live swaps %.3f (%d sets, %d crossfades), back-to-back every 16 ms %.3f, "
                "hard switch (no crossfade) %.1f\n",
                liveRatio, sets.load(), fades, fastRatio, hardRatio);
    CHECK(fades >= 10, "only %d crossfades happened", fades);
    CHECK(liveRatio < 1.5, "live swap ratio %.3f", liveRatio);
    CHECK(fastRatio < 1.5, "fast swap ratio %.3f", fastRatio);
    CHECK(hardRatio > 20, "click metric not sensitive (%.1f)", hardRatio);
    // final state after the live run: identity / corrected depending on last set — check it settles to a valid kernel
    std::vector<float> tail(x.begin(), x.begin() + (long) (0.5 * fs));
    auto yt = runMono(pm, tail);
    CHECK(!pm.isCrossfading(), "still crossfading");
}

static void testSampleRates() {
    std::printf("\n[sample rates: allpass fc 80 Hz, band 20–250 Hz]\n");
    for (double fs : {44100.0, 48000.0, 88200.0, 96000.0, 176400.0, 192000.0}) {
        ApCase r = runAllpassCase(fs, false, 20, 250, true);
        CHECK(r.e.status == PhaseMatchEstimate::Status::Ok, "fs %.0f status %s", fs, statusName(r.e.status));
        CHECK(r.maxErr < 10.0, "fs %.0f phase err %.2f", fs, r.maxErr);
        CHECK(r.sr.gainDb > 1.0 && r.sr.corrAfter > 0.95, "fs %.0f sum gain %.2f corr %.3f", fs, r.sr.gainDb,
              r.sr.corrAfter);
        CHECK(r.d.magDevDb <= 0.5, "fs %.0f mag dev %.3f", fs, r.d.magDevDb);
        CHECK(kernelMagDevDb(r.d.h, r.d.hs, fs) <= 0.5, "fs %.0f independent mag dev %.3f", fs,
              kernelMagDevDb(r.d.h, r.d.hs, fs));
        CHECK(r.maxErrApplied < 10.0, "fs %.0f applied err %.2f", fs, r.maxErrApplied);
        CHECK(r.d.hs == (int) std::lround(0.025 * fs) && (int) r.d.h.size() == 2 * r.d.hs + 1, "kernel length");
    }
    std::printf("  wide band 20–2000 Hz:\n");
    for (double fs : {48000.0, 192000.0}) {
        ApCase r = runAllpassCase(fs, false, 20, 2000, true);
        CHECK(r.e.status == PhaseMatchEstimate::Status::Ok && r.maxErr < 10.0 && r.d.magDevDb <= 0.5,
              "wide fs %.0f", fs);
    }
}

static void testTiming() {
    std::printf("\n[timing]\n");
    {
        const double fs = 192000;
        const int n = (int) (5 * fs);
        auto D = lfNoise(n, fs, 61);
        gNoiseFs = fs;
        auto S = addNoise(filt(allpass2(fs, 80, 0.707), D), 0.005, 8);
        PhaseMatcher pm;
        double best = 1e9;
        PhaseMatchEstimate e;
        for (int k = 0; k < 3; ++k) {
            const auto t0 = std::chrono::steady_clock::now();
            e = pm.estimate(D.data(), S.data(), n, fs, 20, 2000);
            best = std::min(best, std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count());
        }
        pm.prepare(fs, 512, 2);
        const auto t1 = std::chrono::steady_clock::now();
        pm.setCorrection(e, 1.0);
        const double setMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t1).count();
        std::printf("  estimate(): 5 s @ 192 kHz, band 20–2000 Hz: %.0f ms (best of 3; includes the blend-1 design)\n", best);
        std::printf("  setCorrection() @ 192 kHz (design + verify + partition FFTs): %.0f ms\n", setMs);
        CHECK(best < 5000, "estimate too slow %.0f ms", best);
    }
    for (double fs : {48000.0, 192000.0}) {
        PhaseMatcher pm;
        pm.prepare(fs, 512, 2);
        const int n = (int) (10 * fs);
        std::vector<float> a((size_t) n), b((size_t) n);
        for (int i = 0; i < n; ++i) { a[(size_t) i] = (float) std::sin(i * 0.01); b[(size_t) i] = (float) std::cos(i * 0.013); }
        const auto t0 = std::chrono::steady_clock::now();
        for (int i = 0; i < n; i += 512) {
            float* p[2] = {a.data() + i, b.data() + i};
            pm.process(p, 2, std::min(512, n - i));
        }
        const double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
        std::printf("  process(): stereo @ %.0f kHz, steady: %.1f ms per 10 s of audio → %.2f %% of one core "
                    "(×2 during a 20 ms crossfade)\n",
                    fs / 1000, ms, ms / 100.0);
    }
}

int main() {
    std::printf("PHASEFORGE — PhaseMatcher tests\n");
    testIdentity();
    testChannelPacking();
    testKnownPhase();
    testBlend();
    testUnrelatedAndSilence();
    testAggressive();
    testSwapNoClicks();
    testSampleRates();
    testTiming();
    std::printf("\n%d passed, %d failed\n", gPass, gFail);
    return gFail ? 1 : 0;
}
