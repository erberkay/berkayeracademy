// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Analyzer.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace kb {

// scipy.signal.firwin(numtaps, cutoff, fs) — Hamming pencereli, DC kazancı 1
static std::vector<double> firwin(int ntaps, double cutoff, double fs) {
    std::vector<double> h((size_t) ntaps);
    const double fc = cutoff / (fs / 2.0);  // Nyquist'e göre
    const double alpha = 0.5 * (ntaps - 1);
    double sum = 0;
    for (int n = 0; n < ntaps; ++n) {
        const double m = n - alpha;
        const double x = fc * m;
        const double sinc = (std::abs(x) < 1e-15) ? 1.0 : std::sin(kPi * x) / (kPi * x);
        const double win = 0.54 - 0.46 * std::cos(2.0 * kPi * n / (ntaps - 1));
        h[(size_t) n] = fc * sinc * win;
        sum += h[(size_t) n];
    }
    for (auto& v : h) v /= sum;
    return h;
}

std::vector<cplx> analyticPow2(const std::vector<double>& x) {
    const int order = ceilPow2Order((int) x.size());
    FFT fft(order);
    const int n = fft.size();
    std::vector<cplx> X((size_t) n);
    for (size_t i = 0; i < x.size(); ++i) X[i] = x[i];
    fft.perform(X.data(), false);
    // scipy.signal.hilbert: h[0]=1, h[1..n/2-1]=2, h[n/2]=1, kalan 0
    for (int k = 1; k < n / 2; ++k) X[(size_t) k] *= 2.0;
    for (int k = n / 2 + 1; k < n; ++k) X[(size_t) k] = 0.0;
    fft.perform(X.data(), true);
    std::vector<cplx> out(x.size());
    for (size_t i = 0; i < x.size(); ++i) out[i] = X[i] / (double) n;
    return out;
}

Analyzer::Analyzer(double fs, double fc) : fs_(fs), fc_(fc) {
    M = std::max(1, (int) std::lround(fs / kFaTarget));
    fa_ = fs / M;
    if (M > 1) taps = firwin(8 * M + 1, 0.4 * fa_, fs);
    else taps = {1.0};
    gd = (int) (taps.size() - 1) / 2;
}

std::vector<double> Analyzer::decimate(const double* x, long long n, long long start, int count) const {
    std::vector<double> out((size_t) count, 0.0);
    const int nt = (int) taps.size();
    for (int i = 0; i < count; ++i) {
        const long long c = start + (long long) i * M;
        double acc = 0;
        // Σ_k h[k]·x[c + gd - k]
        for (int k = 0; k < nt; ++k) {
            const long long idx = c + gd - k;
            if (idx >= 0 && idx < n) acc += taps[(size_t) k] * x[idx];
        }
        out[(size_t) i] = acc;
    }
    return out;
}

static inline double objOf(cplx z, AutoTarget a) { return a == AutoTarget::Both ? std::abs(z) : z.real(); }

cplx Analyzer::interpC(const std::vector<int>& lags, const std::vector<cplx>& c, double tau) {
    const double fl = std::floor(tau);
    const int i0 = (int) fl - lags.front();
    const double mu = tau - fl;
    const double i0b = besselI0(8.0);
    cplx acc = 0;
    for (int j = -kInterpHalf + 1; j <= kInterpHalf; ++j) {
        const int idx = i0 + j;
        if (idx < 0 || idx >= (int) c.size()) continue;
        const double t = mu - j;
        const double sinc = std::abs(t) < 1e-15 ? 1.0 : std::sin(kPi * t) / (kPi * t);
        const double r = std::max(0.0, 1.0 - (t / kInterpHalf) * (t / kInterpHalf));
        acc += c[(size_t) idx] * (sinc * besselI0(8.0 * std::sqrt(r)) / i0b);
    }
    return acc;
}

static std::pair<double, double> refine(const std::function<cplx(double)>& ev, double t0, double lo, double hi,
                                        AutoTarget a, int iters = 40) {
    double A = std::max(lo, t0 - 1.0), Bb = std::min(hi, t0 + 1.0);
    const double g = (std::sqrt(5.0) - 1.0) / 2.0;
    auto f = [&](double t) { return -objOf(ev(t), a); };
    double x1 = Bb - g * (Bb - A), x2 = A + g * (Bb - A);
    double f1 = f(x1), f2 = f(x2);
    for (int i = 0; i < iters; ++i) {
        if (f1 < f2) { Bb = x2; x2 = x1; f2 = f1; x1 = Bb - g * (Bb - A); f1 = f(x1); }
        else { A = x1; x1 = x2; f1 = f2; x2 = A + g * (Bb - A); f2 = f(x2); }
    }
    const double t = 0.5 * (A + Bb);
    return {t, -f(t)};
}

Analyzer::Pick Analyzer::pick(const std::vector<int>& lags, const std::vector<cplx>& c, double fa,
                              const AnalysisParams& p, const std::vector<bool>* valid,
                              const std::function<cplx(double)>& evIn) {
    std::function<cplx(double)> ev = evIn ? evIn : [&](double t) { return interpC(lags, c, t); };
    if (p.autoTarget == AutoTarget::Phase) {
        const cplx z = ev(0.0);
        return {0.0, std::arg(z) * 180.0 / kPi, std::abs(z)};
    }
    const double lo = p.dMinMs * fa / 1000.0, hi = p.dMaxMs * fa / 1000.0;
    std::vector<int> L;
    std::vector<double> obj;
    for (size_t i = 0; i < lags.size(); ++i) {
        if (lags[i] < std::ceil(lo) || lags[i] > std::floor(hi)) continue;
        if (valid && !(*valid)[i]) continue;
        L.push_back(lags[i]);
        obj.push_back(objOf(c[i], p.autoTarget));
    }
    if (L.empty()) return {0.0, 0.0, 0.0};
    std::vector<size_t> peaks;
    for (size_t i = 0; i < obj.size(); ++i)
        if ((i == 0 || obj[i] >= obj[i - 1]) && (i + 1 == obj.size() || obj[i] >= obj[i + 1])) peaks.push_back(i);
    double best = -std::numeric_limits<double>::infinity();
    for (auto i : peaks) best = std::max(best, obj[i]);
    std::vector<std::pair<double, double>> refined;
    for (auto i : peaks) {
        if (obj[i] < best * (1 - 3 * p.ambiguityTol) || obj[i] <= 0) continue;
        refined.push_back(refine(ev, (double) L[i], lo, hi, p.autoTarget));
    }
    if (refined.empty()) return {0.0, 0.0, 0.0};
    double vmax = -1e300;
    for (auto& r : refined) vmax = std::max(vmax, r.second);
    std::pair<double, double> sel{0, -1e300};
    bool have = false;
    for (auto& r : refined) {
        if (r.second < vmax * (1 - p.ambiguityTol)) continue;
        if (!have || std::abs(r.first) < std::abs(sel.first) ||
            (std::abs(r.first) == std::abs(sel.first) && r.second > sel.second)) {
            sel = r; have = true;
        }
    }
    const cplx z = ev(sel.first);
    const double th = p.autoTarget == AutoTarget::Both ? std::arg(z) * 180.0 / kPi : 0.0;
    return {sel.first * 1000.0 / fa, th, objOf(z, p.autoTarget)};
}

ExactEval::ExactEval(const std::vector<const HitSegment*>& s) : segs(s) {
    for (auto* g : segs) ffts.emplace_back(g->nfftOrder);
}

cplx ExactEval::operator()(double tau) {
    cplx acc = 0;
    for (size_t s = 0; s < segs.size(); ++s) {
        const auto& g = *segs[s];
        auto& fft = ffts[s];
        const int n = fft.size();
        scratch.resize((size_t) n);
        for (int k = 0; k < n; ++k) {
            const double f = (k < n / 2) ? (double) k / n : (double) (k - n) / n;  // numpy.fft.fftfreq
            scratch[(size_t) k] = g.B[(size_t) k] * std::polar(1.0, -2.0 * kPi * f * tau);
        }
        fft.perform(scratch.data(), true);
        const int W = (int) g.kw.size();
        cplx dot = 0;
        double eb = 0;
        for (int j = 0; j < W; ++j) {
            const cplx bs = scratch[(size_t) (g.j0 + j)] / (double) n;
            dot += std::conj(bs) * g.kw[(size_t) j];
            eb += std::norm(bs);
        }
        acc += dot / (std::sqrt(g.ek * eb) + 1e-30);
    }
    return acc / (double) segs.size();
}

HitResult Analyzer::hit(const double* kLow, const double* bLow, long long n, long long onset,
                        const AnalysisParams& p) const {
    HitResult R;
    const double fa = fa_;
    const int ws = (int) std::lround(p.winStartMs * fa / 1000.0);
    const int W = (int) std::lround(p.winMs * fa / 1000.0);
    const int tmin = (int) std::floor(p.dMinMs * fa / 1000.0) - kInterpHalf - 1;
    const int tmax = (int) std::ceil(p.dMaxMs * fa / 1000.0) + kInterpHalf + 1;
    const int segStart = -tmax - kPad + ws;
    const int segLen = W + (tmax - tmin) + 2 * kPad;
    const long long fullStart = onset + (long long) segStart * M;
    const auto kd = decimate(kLow, n, fullStart, segLen);
    const auto bd = decimate(bLow, n, fullStart, segLen);
    const auto ka = analyticPow2(kd);
    const auto ba = analyticPow2(bd);
    const int j0 = tmax + kPad;
    std::vector<cplx> kw(ka.begin() + j0, ka.begin() + j0 + W);
    double ek = 0;
    for (auto& z : kw) ek += std::norm(z);
    std::vector<int> lags;
    std::vector<cplx> cn;
    std::vector<double> eb;
    for (int t = tmin; t <= tmax; ++t) {
        cplx c = 0;
        double e = 0;
        for (int j = 0; j < W; ++j) {
            const cplx b = ba[(size_t) (j0 + j - t)];
            c += std::conj(b) * kw[(size_t) j];
            e += std::norm(b);
        }
        lags.push_back(t);
        cn.push_back(c);
        eb.push_back(e);
    }
    const double ebMax = *std::max_element(eb.begin(), eb.end());
    std::vector<bool> valid(lags.size());
    for (size_t i = 0; i < lags.size(); ++i) {
        cn[i] = cn[i] / (std::sqrt(ek * eb[i]) + 1e-30);
        valid[i] = eb[i] >= 0.3 * ebMax;
    }
    HitSegment seg;
    seg.kw = kw;
    seg.j0 = j0;
    seg.ek = ek;
    seg.nfftOrder = ceilPow2Order((int) ba.size());
    {
        FFT fft(seg.nfftOrder);
        seg.B.assign((size_t) fft.size(), 0.0);
        std::copy(ba.begin(), ba.end(), seg.B.begin());
        fft.perform(seg.B.data(), false);
    }
    ExactEval ex({&seg});
    auto pk = pick(lags, cn, fa, p, &valid, [&](double t) { return ex(t); });
    R.dMs = pk.dMs;
    R.theta = pk.theta;
    R.rho = std::min(1.0, pk.value);
    for (size_t i = 0; i < cn.size(); ++i) if (!valid[i]) cn[i] = 0;
    R.lags = std::move(lags);
    R.c = std::move(cn);
    R.seg = std::move(seg);
    R.ok = ek > 1e-20 && ebMax > 1e-20;
    return R;
}

Analyzer::Pick Analyzer::joint(const std::vector<const HitSegment*>& segs, const std::vector<int>& lags,
                               const AnalysisParams& p) const {
    ExactEval ex(segs);
    std::vector<cplx> cs;
    cs.reserve(lags.size());
    for (int t : lags) cs.push_back(ex((double) t));
    return pick(lags, cs, fa_, p, nullptr, [&](double t) { return ex(t); });
}

// ───────────────────────────── YIN
PitchResult yin(const std::vector<double>& x, double fa, double fmin, double fmax, double thr) {
    const int tmax = (int) std::ceil(fa / fmin);
    const int tminv = std::max(2, (int) std::floor(fa / fmax));
    const int W = (int) x.size() - tmax;
    double mx = 0;
    for (double v : x) mx = std::max(mx, std::abs(v));
    if (W < tmax / 2 || mx < 1e-6) return {std::nullopt, 1.0};
    std::vector<double> d((size_t) tmax + 1, 0.0), cm((size_t) tmax + 1, 1.0);
    for (int t = 0; t <= tmax; ++t) {
        double s = 0;
        for (int j = 0; j < W; ++j) { const double e = x[(size_t) j] - x[(size_t) (j + t)]; s += e * e; }
        d[(size_t) t] = s;
    }
    double cs = 0;
    for (int t = 1; t <= tmax; ++t) { cs += d[(size_t) t]; cm[(size_t) t] = d[(size_t) t] * t / (cs + 1e-30); }
    int tau = -1;
    for (int t = tminv; t < tmax; ++t) {
        if (cm[(size_t) t] < thr) {
            while (t + 1 < tmax && cm[(size_t) t + 1] < cm[(size_t) t]) ++t;
            tau = t;
            break;
        }
    }
    if (tau < 0) {
        tau = tminv;
        for (int t = tminv; t < tmax; ++t) if (cm[(size_t) t] < cm[(size_t) tau]) tau = t;
        if (cm[(size_t) tau] > 0.5) return {std::nullopt, cm[(size_t) tau]};
    }
    double off = 0;
    if (tau >= 1 && tau < tmax) {
        const double a = cm[(size_t) tau - 1], b = cm[(size_t) tau], c = cm[(size_t) tau + 1];
        const double den = a - 2 * b + c;
        off = std::abs(den) > 1e-12 ? 0.5 * (a - c) / den : 0.0;
    }
    off = std::clamp(off, -1.0, 1.0);
    if (tau + off <= 0) off = 0.0;
    return {fa / (tau + off), cm[(size_t) tau]};
}

std::optional<int> detectNote(const std::vector<double>& x, double fa, double fmin) {
    auto r = yin(x, fa, fmin);
    if (!r.f0) return std::nullopt;
    return hzToMidi(*r.f0);
}

// ───────────────────────────── Onset
void OnsetDetector::prepare(double sampleRate, const OnsetParams& params) {
    fs = sampleRate;
    p = params;
    lp = butter2(fs, p.trigHz, false);
    ga = std::exp(-1.0 / (p.fastAttackMs * fs / 1000.0));
    gr = std::exp(-1.0 / (p.fastReleaseMs * fs / 1000.0));
    gs = std::exp(-1.0 / (p.slowMs * fs / 1000.0));
    ratio = std::pow(10.0, p.ratioDb / 20.0);
    rearm = std::pow(10.0, p.rearmDb / 20.0);
    thrAbs = std::pow(10.0, p.absDb / 20.0);
    rel = std::pow(10.0, p.relDb / 20.0);
    pkDecay = std::exp(-1.0 / (2.0 * fs));
    hold = (long long) (p.holdMs * fs / 1000.0);
    back = (int) (0.010 * fs);
    histF.assign((size_t) back + 1, 0.0);
    reset();
}

void OnsetDetector::setTriggerHz(double hz) {
    if (std::abs(hz - p.trigHz) < 1e-9) return;
    p.trigHz = hz;
    auto q = butter2(fs, hz, false);
    q.z1 = lp.z1; q.z2 = lp.z2;
    lp = q;
}

void OnsetDetector::reset() {
    lp.reset();
    fast = slow = peak = 0;
    last = -hold;
    armed = true;
    std::fill(histF.begin(), histF.end(), 0.0);
}

long long OnsetDetector::process(double xin, long long i) noexcept {
    const double v = std::abs(lp.process(xin));
    const double g = v > fast ? ga : gr;
    fast = g * fast + (1 - g) * v;
    slow = gs * slow + (1 - gs) * v;
    peak = std::max(peak * pkDecay, fast);
    const int L = back + 1;
    histF[(size_t) (((i % L) + L) % L)] = fast;
    if (!armed && i - last >= hold && fast <= rearm * slow) armed = true;
    if (armed && i - last >= hold && fast > std::max(thrAbs, rel * peak) && fast > ratio * slow) {
        armed = false;
        last = i;
        long long o = i;
        double nxt = fast;
        for (int k = 1; k <= back; ++k) {
            const long long ii = i - k;
            if (ii < 0) break;
            const double hf = histF[(size_t) (((ii % L) + L) % L)];
            if (hf >= nxt) break;
            nxt = hf;
            o = ii;
        }
        return o;
    }
    return -1;
}

} // namespace kb
