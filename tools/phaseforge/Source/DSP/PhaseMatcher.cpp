// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — PHASE MATCH implementation. Contract and thresholds: PhaseMatcher.h.
#include "PhaseMatcher.h"

#include <algorithm>
#include <cmath>

namespace pf {

namespace {

using cd = std::complex<double>;

inline double smoothstep01(double x) {
    x = std::clamp(x, 0.0, 1.0);
    return x * x * (3.0 - 2.0 * x);
}
inline double wrapDeg(double d) {  // → (−180, 180]
    d = std::fmod(d, 360.0);
    if (d <= -180.0) d += 360.0;
    if (d > 180.0) d -= 360.0;
    return d;
}
inline int halfSamples(double fs) { return (int) std::lround(PhaseMatcher::kHalfMs * 1e-3 * fs); }

// log-frequency linear interpolation of y(x) on an ascending grid; clamped at the ends
double interpLog(const std::vector<float>& hz, const std::vector<float>& y, double f) {
    const int n = (int) hz.size();
    if (n == 0) return 0.0;
    if (f <= hz.front()) return y.front();
    if (f >= hz.back()) return y.back();
    const auto it = std::upper_bound(hz.begin(), hz.end(), (float) f);
    int i = (int) (it - hz.begin());
    i = std::clamp(i, 1, n - 1);
    const double x0 = std::log((double) hz[(size_t) i - 1]), x1 = std::log((double) hz[(size_t) i]);
    const double t = x1 > x0 ? (std::log(f) - x0) / (x1 - x0) : 0.0;
    return (double) y[(size_t) i - 1] + t * ((double) y[(size_t) i] - (double) y[(size_t) i - 1]);
}

// Core FIR design. corrDeg is the (unwrapped) in-band correction on the log grid `hz`, already multiplied by blend.
PhaseMatchDesign designFromGrid(const std::vector<float>& hz, const std::vector<float>& corrDeg, double lo, double hi,
                                double fs) {
    PhaseMatchDesign d;
    d.fs = fs;
    const int hs = halfSamples(fs);
    const int L = 2 * hs + 1;
    d.hs = hs;
    const int order = std::max(14, ceilPow2Order(8 * L));
    FFT fft(order);
    const int Nd = fft.size();
    const int half = Nd / 2;
    const double df = fs / Nd;
    lo = std::max(lo, df);
    hi = std::clamp(hi, lo * 1.01, 0.45 * fs);

    auto c = [&](double f) { return hz.empty() ? 0.0 : interpLog(hz, corrDeg, f); };
    const double cLo = c(lo), cHi = c(hi);
    const double aL = 360.0 * std::round(cLo / 360.0);
    double aH = 360.0 * std::round(cHi / 360.0);
    const double fHard = std::min(hi * std::pow(2.0, PhaseMatcher::kHardOct), fs * 0.5);
    const int kHard = std::min(half, (int) std::ceil(fHard / df));

    std::vector<double> T((size_t) half + 1), lowv((size_t) half + 1), upv((size_t) half + 1), psi((size_t) half + 1);
    std::vector<cd> buf((size_t) Nd);
    std::vector<double> gainv((size_t) half + 1, 1.0), magv((size_t) half + 1, 1.0), phr((size_t) half + 1, 0.0);
    std::vector<cd> hr((size_t) half + 1);
    std::vector<double> win((size_t) L);
    {
        const double i0b = besselI0(PhaseMatcher::kKaiserBeta);
        for (int i = 0; i < L; ++i) {
            const double r = (double) (i - hs) / (double) hs;
            win[(size_t) i] = besselI0(PhaseMatcher::kKaiserBeta * std::sqrt(std::max(0.0, 1.0 - r * r))) / i0b;
        }
    }
    const double fFadeHi = hi * std::pow(2.0, PhaseMatcher::kFadeOct);
    const double fMagHi = std::min(20000.0, 0.49 * fs);

    double tauMs = PhaseMatcher::kGroupDelayLimitMs;
    for (int iter = 0; iter < 10; ++iter) {
        const double s = 360.0 * tauMs * 1e-3 * df;  // max |Δψ| per bin (degrees)
        // the two identity anchors must be reachable within the slope limit
        while (std::fabs(aH - aL) > s * kHard && aH != aL) aH += (aH > aL ? -360.0 : 360.0);
        auto rcos = [](double u) { return 0.5 + 0.5 * std::cos(kPi * std::clamp(u, 0.0, 1.0)); };
        for (int k = 0; k <= half; ++k) {
            const double f = k * df;
            double t;
            if (f < lo) {
                // below lo: linear ramp in frequency to the identity at DC = constant group delay, the gentlest
                // possible fade (a log-frequency fade costs tens of ms of group delay at 20 Hz)
                t = aL + (cLo - aL) * f / lo;
            } else if (f > hi) {
                t = (f >= fFadeHi) ? aH : aH + rcos(std::log2(f / hi) / PhaseMatcher::kFadeOct) * (cHi - aH);
            } else {
                t = c(f);
            }
            T[(size_t) k] = t;
        }
        // McShane–Whitney: best s-Lipschitz approximation in the sup norm = mean of the lower and upper envelopes
        lowv = T; upv = T;
        for (int k = 1; k <= half; ++k) {
            lowv[(size_t) k] = std::min(lowv[(size_t) k], lowv[(size_t) k - 1] + s);
            upv[(size_t) k] = std::max(upv[(size_t) k], upv[(size_t) k - 1] - s);
        }
        for (int k = half - 1; k >= 0; --k) {
            lowv[(size_t) k] = std::min(lowv[(size_t) k], lowv[(size_t) k + 1] + s);
            upv[(size_t) k] = std::max(upv[(size_t) k], upv[(size_t) k + 1] - s);
        }
        // hard identity at DC (aL) and above fHard (aH): clamp into both anchor cones (keeps the s-Lipschitz bound)
        for (int k = 0; k <= half; ++k) {
            const double dL = s * k, dH = s * std::max(0, kHard - k);
            const double lb = std::max(aL - dL, aH - dH), ub = std::min(aL + dL, aH + dH);
            psi[(size_t) k] = std::clamp(0.5 * (lowv[(size_t) k] + upv[(size_t) k]), lb, std::max(lb, ub));
        }
        psi[0] = aL;
        for (int k = kHard; k <= half; ++k) psi[(size_t) k] = aH;

        // frequency sampling → real zero-phase IR → circular shift by hs → Kaiser window. The window attenuates the
        // delayed/advanced parts of the IR, i.e. |H| sags where the group delay is large; a few iterations of magnitude
        // pre-compensation (target magnitude ← target / realized, clamped) flatten it. Phase target is unchanged.
        double magDev = 0, eMax = 0, eSq = 0;
        int eN = 0;
        std::fill(gainv.begin(), gainv.end(), 1.0);
        for (int mi = 0; mi < 4; ++mi) {
            for (int k = 0; k <= half; ++k) buf[(size_t) k] = std::polar(gainv[(size_t) k], psi[(size_t) k] * kPi / 180.0);
            buf[0] = cd(buf[0].real(), 0.0);
            buf[(size_t) half] = cd(buf[(size_t) half].real(), 0.0);
            for (int k = 1; k < half; ++k) buf[(size_t) (Nd - k)] = std::conj(buf[(size_t) k]);
            fft.perform(buf.data(), true);
            d.h.assign((size_t) L, 0.0);
            for (int i = 0; i < L; ++i) d.h[(size_t) i] = buf[(size_t) ((i - hs + Nd) % Nd)].real() / Nd * win[(size_t) i];

            // verification: realized response
            std::fill(buf.begin(), buf.end(), cd{});
            for (int i = 0; i < L; ++i) buf[(size_t) i] = d.h[(size_t) i];
            fft.perform(buf.data(), false);
            magDev = 0; eMax = 0; eSq = 0; eN = 0;
            for (int k = 0; k <= half; ++k) {
                const double f = k * df;
                const cd H = buf[(size_t) k] * std::polar(1.0, 2.0 * kPi * k * hs / Nd);
                magv[(size_t) k] = std::abs(H);
                phr[(size_t) k] = std::arg(H);
                hr[(size_t) k] = buf[(size_t) k];
                if (f >= 20.0 && f <= fMagHi) magDev = std::max(magDev, std::fabs(20.0 * std::log10(magv[(size_t) k] + 1e-300)));
                if (f >= lo && f <= hi) {
                    const double err = wrapDeg(std::arg(H) * 180.0 / kPi - psi[(size_t) k]);
                    eMax = std::max(eMax, std::fabs(err));
                    eSq += err * err;
                    ++eN;
                }
            }
            if (magDev <= 0.1) break;
            for (int k = 0; k <= half; ++k)
                gainv[(size_t) k] = std::clamp(gainv[(size_t) k] / std::max(magv[(size_t) k], 1e-6), 0.5, 2.0);
        }
        d.magDevDb = magDev;
        d.phaseErrMaxDeg = eMax;
        d.phaseErrRmsDeg = eN ? std::sqrt(eSq / eN) : 0.0;
        d.groupDelayLimitMs = tauMs;
        d.magWithinSpec = magDev <= PhaseMatcher::kMagSpecDb;
        if (d.magWithinSpec) break;
        tauMs *= 0.75;
    }

    // metrics of the final design
    {
        // Pre-ringing, measured where the correction acts: band-limit the realized kernel to [lo, hi] (half-octave
        // cos² skirts) and take the fraction of its energy that arrives more than kAggressivePreMs before the main
        // tap, minus the same fraction for the band-limited identity (band-limiting alone spreads a pulse
        // symmetrically). Reported in dB of the band energy; a kernel-wide figure would be meaningless because a
        // 20–250 Hz correction touches only ~1 % of the spectrum at 48 kHz.
        auto bandW = [&](double f) {
            if (f <= 0) return 0.0;
            const double u = f < lo ? std::log2(lo / f) : (f > hi ? std::log2(f / hi) : 0.0);
            if (u >= 0.5) return 0.0;
            const double cu = std::cos(kPi * u);  // u in [0, 0.5): cos² fade to 0 at half an octave
            return cu * cu;
        };
        auto preFrac = [&](bool identity) {
            for (int k = 0; k <= half; ++k) {
                const cd H = identity ? std::polar(1.0, -2.0 * kPi * k * hs / Nd) : hr[(size_t) k];
                buf[(size_t) k] = H * bandW(k * df);
            }
            buf[0] = cd(buf[0].real(), 0.0);
            buf[(size_t) half] = cd(buf[(size_t) half].real(), 0.0);
            for (int k = 1; k < half; ++k) buf[(size_t) (Nd - k)] = std::conj(buf[(size_t) k]);
            fft.perform(buf.data(), true);
            const int pre = (int) std::lround(PhaseMatcher::kAggressivePreMs * 1e-3 * fs);
            double ePre = 0, eAll = 0;
            for (int n = 0; n < Nd; ++n) {
                int t = n - hs;  // time offset re the main tap, circular in (−Nd/2, Nd/2]
                if (t <= -Nd / 2) t += Nd;
                if (t > Nd / 2) t -= Nd;
                const double v = std::norm(buf[(size_t) n]);
                eAll += v;
                if (t < -pre) ePre += v;
            }
            return eAll > 0 ? ePre / eAll : 0.0;
        };
        const double excess = preFrac(false) - preFrac(true);
        d.preRingDb = 10.0 * std::log10(std::max(excess, 1e-6));
        double gMin = 1e9, gMax = -1e9, wMax = 0;
        int kArg = -1;
        const int k0 = std::max(1, (int) std::ceil(lo / df)), k1 = std::min(half - 1, (int) std::floor(hi / df));
        // group delay of the REALIZED kernel (the target's grid-level jitter would inflate a target-based figure at
        // 20–40 Hz, where 0.5° between neighbouring points is already several ms; the 50 ms FIR cannot realize it)
        for (int k = k0; k <= k1; ++k) {
            const double dp = std::remainder(phr[(size_t) k + 1] - phr[(size_t) k - 1], 2.0 * kPi);
            const double tau = -dp / (2.0 * kPi * 2.0 * df) * 1e3;  // ms
            gMin = std::min(gMin, tau);
            gMax = std::max(gMax, tau);
            const double w = std::fabs(wrapDeg(psi[(size_t) k] - aL));
            if (w > wMax) { wMax = w; kArg = k; }
        }
        d.groupDelaySpreadMs = (gMax >= gMin) ? gMax - gMin : 0.0;
        d.maxCorrectionDeg = wMax;
        // narrow-band check: width of the region around the maximum where |wrapped correction| > 45°
        bool narrow = false;
        if (wMax > 90.0 && kArg > 0) {
            int a = kArg, b = kArg;
            while (a > 1 && std::fabs(wrapDeg(psi[(size_t) a - 1] - aL)) > 45.0) --a;
            while (b < half && std::fabs(wrapDeg(psi[(size_t) b + 1] - aL)) > 45.0) ++b;
            narrow = std::log2((double) b / (double) a) < 1.0;
        }
        unsigned r = 0;
        if (d.groupDelaySpreadMs > PhaseMatcher::kAggressiveSpreadMs) r |= 1u;
        if (narrow) r |= 2u;
        if (d.preRingDb > PhaseMatcher::kAggressivePreDb) r |= 4u;
        d.aggressiveReasons = r;
        d.aggressive = r != 0;
    }
    d.targetDeg.resize(hz.size());
    for (size_t i = 0; i < hz.size(); ++i) {
        const double x = hz[i] / df;
        const int k = std::clamp((int) x, 0, half - 1);
        const double t = std::clamp(x - k, 0.0, 1.0);
        d.targetDeg[i] = (float) (psi[(size_t) k] + t * (psi[(size_t) k + 1] - psi[(size_t) k]));
    }
    return d;
}

} // namespace

// ═══════════════════════════════════════════════════════════════════════ estimate
PhaseMatchEstimate PhaseMatcher::estimate(const float* dom, const float* sub, int n, double fs, double loHz,
                                          double hiHz) const {
    PhaseMatchEstimate e;
    e.fs = fs;
    if (!(fs > 0) || !(loHz > 0) || !(hiHz > loHz)) return e;
    loHz = std::max(loHz, 10.0);
    hiHz = std::min(hiHz, 0.45 * fs);
    if (hiHz <= loHz * 1.05) return e;
    e.loHz = loHz;
    e.hiHz = hiHz;
    const int G = kGridPoints;
    e.hz.resize(G);
    for (int i = 0; i < G; ++i) e.hz[(size_t) i] = (float) (loHz * std::pow(hiHz / loHz, (double) i / (G - 1)));
    e.phaseDeg.assign(G, 0.f);
    e.coherence.assign(G, 0.f);
    e.correctionDeg.assign(G, 0.f);
    e.weight.assign(G, 0.f);
    if (!dom || !sub || n <= 0) return e;

    const int order = ceilPow2Order((int) std::lround(kFrameSec * fs));
    const int Nf = 1 << order;
    const int hop = Nf / 4;
    if (n < Nf) return e;
    const int frames = 1 + (n - Nf) / hop;
    e.totalFrames = frames;
    const double binHz = fs / Nf;
    const int kTop = std::min(Nf / 2 - 1, (int) std::ceil(hiHz * std::pow(2.0, kSmoothOct) / binHz) + 4);
    const int kB0 = std::max(2, (int) std::floor(loHz / binHz)), kB1 = std::min(kTop, (int) std::ceil(hiHz / binHz));

    std::vector<double> w((size_t) Nf);
    double w2 = 0;
    for (int i = 0; i < Nf; ++i) {
        w[(size_t) i] = 0.5 - 0.5 * std::cos(2.0 * kPi * i / Nf);  // periodic Hann
        w2 += w[(size_t) i] * w[(size_t) i];
    }
    const int K = kTop + 1;
    std::vector<cd> Dk((size_t) frames * K), Sk((size_t) frames * K);
    std::vector<double> Ed((size_t) frames), Es((size_t) frames);
    FFT fft(order);
    std::vector<cd> z((size_t) Nf);
    for (int f = 0; f < frames; ++f) {
        const float* a = dom + (size_t) f * hop;
        const float* b = sub + (size_t) f * hop;
        for (int i = 0; i < Nf; ++i) z[(size_t) i] = cd((double) a[i] * w[(size_t) i], (double) b[i] * w[(size_t) i]);
        fft.perform(z.data(), false);
        double ed = 0, es = 0;
        for (int k = 0; k < K; ++k) {  // unpack two real spectra from one complex FFT
            const cd Z = z[(size_t) k], Zc = std::conj(z[(size_t) ((Nf - k) % Nf)]);
            const cd D = 0.5 * (Z + Zc);
            const cd S = cd(0.0, -0.5) * (Z - Zc);
            Dk[(size_t) f * K + k] = D;
            Sk[(size_t) f * K + k] = S;
            if (k >= kB0 && k <= kB1) { ed += std::norm(D); es += std::norm(S); }
        }
        Ed[(size_t) f] = ed;
        Es[(size_t) f] = es;
    }
    const double msScale = 2.0 / ((double) Nf * w2);  // Σ|X|² over band → band mean-square
    const double maxEd = *std::max_element(Ed.begin(), Ed.end()), maxEs = *std::max_element(Es.begin(), Es.end());
    const double rel = std::pow(10.0, kGateRelDb / 10.0), absMs = std::pow(10.0, kGateAbsDb / 10.0);
    std::vector<cd> Gx((size_t) K);
    std::vector<double> Pd((size_t) K), Ps((size_t) K);
    int active = 0;
    for (int f = 0; f < frames; ++f) {
        if (Ed[(size_t) f] < maxEd * rel || Es[(size_t) f] < maxEs * rel) continue;
        if (Ed[(size_t) f] * msScale < absMs || Es[(size_t) f] * msScale < absMs) continue;
        ++active;
        for (int k = 0; k < K; ++k) {
            const cd D = Dk[(size_t) f * K + k], S = Sk[(size_t) f * K + k];
            Gx[(size_t) k] += D * std::conj(S);
            Pd[(size_t) k] += std::norm(D);
            Ps[(size_t) k] += std::norm(S);
        }
    }
    e.activeFrames = active;
    if (active < kMinActiveFrames) return e;  // NotEnoughAudio

    // leakage indicator per bin: power re the strongest bin within ±2 bins (the Hann main lobe). A bin far below its
    // neighbour is the skirt of a nearby strong component (a kick's fundamental): its phase is that component's phase,
    // not information about this frequency.
    std::vector<double> lam((size_t) K, 1.0);
    for (int k = 2; k < K; ++k) {
        double md = 0, ms = 0;
        for (int j = std::max(2, k - 2); j <= std::min(K - 1, k + 2); ++j) {
            md = std::max(md, Pd[(size_t) j]);
            ms = std::max(ms, Ps[(size_t) j]);
        }
        lam[(size_t) k] = std::min(md > 0 ? Pd[(size_t) k] / md : 0.0, ms > 0 ? Ps[(size_t) k] / ms : 0.0);
    }

    // fractional-octave complex smoothing on the log grid (average complex G, never angles)
    std::vector<cd> Gs((size_t) G);
    std::vector<double> Pds((size_t) G), Pss((size_t) G), lamS((size_t) G);
    for (int g = 0; g < G; ++g) {
        const double fg = e.hz[(size_t) g];
        const double hwL = std::max(fg * (1.0 - std::pow(2.0, -0.5 * kSmoothOct)), 1.5 * binHz);
        const double hwR = std::max(fg * (std::pow(2.0, 0.5 * kSmoothOct) - 1.0), 1.5 * binHz);
        const int k0 = std::max(2, (int) std::floor((fg - hwL) / binHz));
        const int k1 = std::min(kTop, (int) std::ceil((fg + hwR) / binHz));
        cd acc{};
        double pd = 0, ps = 0, la = 0, wsum = 0;
        for (int k = k0; k <= k1; ++k) {
            const double fk = k * binHz;
            const double hw = fk < fg ? hwL : hwR;
            const double u = (fk - fg) / hw;
            if (std::fabs(u) >= 1.0) continue;
            const double c = std::cos(0.5 * kPi * u);
            const double wk = c * c / hw;  // equal mass on both sides → no bias toward the denser upper side
            acc += wk * Gx[(size_t) k];
            pd += wk * Pd[(size_t) k];
            ps += wk * Ps[(size_t) k];
            la += wk * lam[(size_t) k];
            wsum += wk;
        }
        lamS[(size_t) g] = wsum > 0 ? la / wsum : 0.0;
        Gs[(size_t) g] = acc;
        Pds[(size_t) g] = pd;
        Pss[(size_t) g] = ps;
    }
    const double pdMax = *std::max_element(Pds.begin(), Pds.end()), psMax = *std::max_element(Pss.begin(), Pss.end());
    std::vector<double> wgt((size_t) G), phi((size_t) G);
    double cohNum = 0, cohDen = 0;
    for (int g = 0; g < G; ++g) {
        const double den = Pds[(size_t) g] * Pss[(size_t) g];
        const double coh = den > 0 ? std::clamp(std::norm(Gs[(size_t) g]) / den, 0.0, 1.0) : 0.0;
        e.coherence[(size_t) g] = (float) coh;
        phi[(size_t) g] = std::arg(Gs[(size_t) g]) * 180.0 / kPi;
        const double lvl = 10.0 * std::log10(std::max(1e-30, std::min(Pds[(size_t) g] / std::max(pdMax, 1e-300),
                                                                          Pss[(size_t) g] / std::max(psMax, 1e-300))));
        const double wE = smoothstep01((lvl + 45.0) / 25.0);   // 0 at −45 dB, 1 at −20 dB (re each signal's peak)
        const double wC = smoothstep01((coh - 0.25) / 0.45);   // 0 at γ² 0.25, 1 at γ² 0.7
        const double lamDb = 10.0 * std::log10(std::max(lamS[(size_t) g], 1e-30));
        const double wL = smoothstep01((lamDb + 20.0) / 10.0); // 0 at −20 dB, 1 at −10 dB re the ±2-bin peak
        wgt[(size_t) g] = wE * wC * wL;
        e.weight[(size_t) g] = (float) wgt[(size_t) g];
        cohNum += wE * coh;
        cohDen += wE;
    }
    e.confidence = (cohDen > 0 ? cohNum / cohDen : 0.0) * std::min(1.0, active / 16.0);

    // careful unwrapping: reliable points (w ≥ 0.15) are unwrapped along the grid; a gap > 1/3 octave restarts the
    // reference (the gap is pulled to 0 anyway); the lowest reliable point is placed in (−180°, 180°]
    std::vector<double> un((size_t) G, 0.0);
    int last = -1;
    for (int g = 0; g < G; ++g) {
        const bool reliable = wgt[(size_t) g] >= 0.15;
        if (last < 0) {
            un[(size_t) g] = wrapDeg(phi[(size_t) g]);
        } else if (reliable && std::log2((double) e.hz[(size_t) g] / e.hz[(size_t) last]) > 1.0 / 3.0) {
            un[(size_t) g] = wrapDeg(phi[(size_t) g]);
        } else {
            un[(size_t) g] = un[(size_t) last] + wrapDeg(phi[(size_t) g] - phi[(size_t) last]);
        }
        if (reliable) last = g;
    }
    for (int g = 0; g < G; ++g) e.phaseDeg[(size_t) g] = (float) un[(size_t) g];

    if (e.confidence < kUnrelatedConfidence) {
        e.status = PhaseMatchEstimate::Status::Unrelated;
        return e;  // zero correction
    }
    e.status = PhaseMatchEstimate::Status::Ok;

    // regularization = normalized convolution in the complex domain with an identity prior:
    //   z(f) = Σ_j K(f, f_j)·(w_j·e^{jφ_j} + ε),  correction = arg z (unwrapped)
    // K is a Gaussian in log-frequency (σ = kRegSigmaOct). Where reliable points are near, z follows them (narrow
    // unreliable gaps — e.g. a kick's leakage skirt — are bridged by their neighbours instead of being dragged to 0);
    // where nothing reliable is within ~3σ the prior ε (the identity, i.e. 0° ≡ any multiple of 360°) wins and the
    // correction is pulled to 0. Averaging complex values avoids the ±180° ambiguity of averaging angles. The prior
    // biases a reliable point by at most ε rad ≈ 1.1°.
    std::vector<float> reg((size_t) G);
    {
        const double dOct = std::log2(hiHz / loHz) / (G - 1);
        const double sig = std::max(0.5, kRegSigmaOct / dOct);  // in grid points
        const int span = (int) std::ceil(4.0 * sig);
        std::vector<double> ang((size_t) G);
        for (int g = 0; g < G; ++g) {
            cd zs{};
            for (int j = std::max(0, g - span); j <= std::min(G - 1, g + span); ++j) {
                const double u = (j - g) / sig;
                const double kj = std::exp(-0.5 * u * u);
                zs += kj * (wgt[(size_t) j] * std::polar(1.0, phi[(size_t) j] * kPi / 180.0) + kPriorEps);
            }
            ang[(size_t) g] = std::arg(zs) * 180.0 / kPi;
        }
        double prev = wrapDeg(ang[0]);
        reg[0] = (float) prev;
        for (int g = 1; g < G; ++g) {
            prev += wrapDeg(ang[(size_t) g] - ang[(size_t) g - 1]);
            reg[(size_t) g] = (float) std::clamp(prev, -kMaxUnwrappedDeg, kMaxUnwrappedDeg);
        }
    }

    const PhaseMatchDesign d = designFromGrid(e.hz, reg, loHz, hiHz, fs);
    e.correctionDeg = d.targetDeg;
    e.maxCorrectionDeg = d.maxCorrectionDeg;
    e.groupDelaySpreadMs = d.groupDelaySpreadMs;
    e.aggressive = d.aggressive;
    e.aggressiveReasons = d.aggressiveReasons;
    e.realizedMagDevDb = d.magDevDb;
    e.realizedPhaseErrDeg = d.phaseErrMaxDeg;
    e.realizedPhaseErrRmsDeg = d.phaseErrRmsDeg;
    e.preRingDb = d.preRingDb;
    e.groupDelayLimitMs = d.groupDelayLimitMs;
    return e;
}

PhaseMatchDesign PhaseMatcher::designCorrection(const PhaseMatchEstimate& e, double blend01, double fs) {
    const double b = std::clamp(blend01, 0.0, 1.0);
    std::vector<float> c(e.correctionDeg.size());
    for (size_t i = 0; i < c.size(); ++i) c[i] = (float) (b * e.correctionDeg[i]);
    if (e.status != PhaseMatchEstimate::Status::Ok || e.hz.size() < 2 || c.size() != e.hz.size())
        std::fill(c.begin(), c.end(), 0.f);
    return designFromGrid(e.hz, c, e.loHz > 0 ? e.loHz : 20.0, e.hiHz > 0 ? e.hiHz : 2000.0, fs);
}

// ═══════════════════════════════════════════════════════════════════════ real-time part
void PhaseMatcher::prepare(double fs, int /*maxBlock*/, int numCh) {
    fs_ = fs;
    hs_ = halfSamples(fs);
    numCh_ = std::max(1, numCh);
    const int L = 2 * hs_ + 1;
    fft_.setOrder(ceilPow2Order(2 * kBlock));
    N_ = fft_.size();
    P_ = (L + kBlock - 1) / kBlock;
    pairs_.assign((size_t) (numCh_ + 1) / 2, Pair{});
    for (auto& p : pairs_) {
        p.X.assign((size_t) P_ * N_, cd{});
        p.acc.assign((size_t) N_, cd{});
        p.accB.assign((size_t) N_, cd{});
        p.in.assign((size_t) 2 * kBlock, cd{});
        p.outA.assign((size_t) kBlock, cd{});
        p.outB.assign((size_t) kBlock, cd{});
    }
    identity_.assign((size_t) L, 0.0);
    identity_[(size_t) hs_] = 1.0;
    for (auto& s : slots_) s.assign((size_t) P_ * N_, cd{});
    spectraOf(identity_, slots_[0]);
    fadeLen_ = std::max(1, (int) std::lround(kCrossfadeMs * 1e-3 * fs));
    fadeGain_.resize((size_t) fadeLen_ + 1);
    for (int i = 0; i <= fadeLen_; ++i) fadeGain_[(size_t) i] = (float) (0.5 - 0.5 * std::cos(kPi * i / fadeLen_));
    cur_ = 0; nxt_ = -1; requested_ = -1; fading_ = false; fadePos_ = 0;
    pos_ = 0; head_ = 0;
    {
        std::lock_guard<std::mutex> lk(writerMtx_);
        pending_.store(-1, std::memory_order_relaxed);
        wCur_ = 0; wPrev_ = 1; lastPub_ = -1;
    }
    prepared_ = true;
}

void PhaseMatcher::reset() {
    if (!prepared_) return;
    for (auto& p : pairs_) {
        std::fill(p.X.begin(), p.X.end(), cd{});
        std::fill(p.in.begin(), p.in.end(), cd{});
        std::fill(p.outA.begin(), p.outA.end(), cd{});
        std::fill(p.outB.begin(), p.outB.end(), cd{});
    }
    if (fading_) { cur_ = nxt_; nxt_ = -1; fading_ = false; }  // snap to the new kernel
    fadePos_ = 0; pos_ = 0; head_ = 0;
}

void PhaseMatcher::spectraOf(const std::vector<double>& h, std::vector<cd>& dst) const {
    FFT f(ceilPow2Order(2 * kBlock));
    std::vector<cd> tmp((size_t) N_);
    dst.assign((size_t) P_ * N_, cd{});
    for (int p = 0; p < P_; ++p) {
        std::fill(tmp.begin(), tmp.end(), cd{});
        for (int i = 0; i < kBlock; ++i) {
            const size_t k = (size_t) (p * kBlock + i);
            if (k < h.size()) tmp[(size_t) i] = h[k];
        }
        f.perform(tmp.data(), false);
        std::copy(tmp.begin(), tmp.end(), dst.begin() + (ptrdiff_t) p * N_);
    }
}

void PhaseMatcher::publish(const std::vector<double>& h) {
    std::vector<cd> spec;
    spectraOf(h, spec);  // allocate/transform outside the hand-over
    std::lock_guard<std::mutex> lk(writerMtx_);
    const int old = pending_.exchange(-1, std::memory_order_acq_rel);
    if (old < 0 && lastPub_ >= 0) { wPrev_ = wCur_; wCur_ = lastPub_; }  // last publication was consumed
    // (old ≥ 0: reclaimed before the audio thread saw it — it is free again)
    int f = 0;
    while (f == wCur_ || f == wPrev_) ++f;
    std::copy(spec.begin(), spec.end(), slots_[(size_t) f].begin());
    pending_.store(f, std::memory_order_release);
    lastPub_ = f;
}

bool PhaseMatcher::setCorrection(const PhaseMatchEstimate& e, double blend01, PhaseMatchDesign* report) {
    if (!prepared_ || e.status != PhaseMatchEstimate::Status::Ok || e.hz.size() < 2 ||
        e.correctionDeg.size() != e.hz.size())
        return false;
    PhaseMatchDesign d = designCorrection(e, blend01, fs_);
    publish(d.h);
    if (report) *report = std::move(d);
    return true;
}

void PhaseMatcher::clearCorrection() {
    if (!prepared_) return;
    publish(identity_);
}

void PhaseMatcher::runBlock() noexcept {
    if (fading_ && fadePos_ >= fadeLen_) { cur_ = nxt_; nxt_ = -1; fading_ = false; }
    if (!fading_ && requested_ >= 0) {
        nxt_ = requested_; requested_ = -1; fading_ = true; fadePos_ = 0;
    }
    const cd* Hc = slots_[(size_t) cur_].data();
    const cd* Hn = fading_ ? slots_[(size_t) nxt_].data() : nullptr;
    const double sc = 1.0 / N_;
    for (auto& p : pairs_) {
        cd* xs = p.X.data() + (ptrdiff_t) head_ * N_;
        for (int i = 0; i < 2 * kBlock; ++i) xs[i] = p.in[(size_t) i];
        for (int i = 2 * kBlock; i < N_; ++i) xs[i] = 0.0;
        fft_.perform(xs, false);
        std::fill(p.acc.begin(), p.acc.end(), cd{});
        if (Hn) std::fill(p.accB.begin(), p.accB.end(), cd{});
        for (int q = 0; q < P_; ++q) {
            const int slot = (head_ - q + P_) % P_;
            const cd* xp = p.X.data() + (ptrdiff_t) slot * N_;
            const cd* hp = Hc + (ptrdiff_t) q * N_;
            cd* a = p.acc.data();
            for (int k = 0; k < N_; ++k) a[k] += xp[k] * hp[k];
            if (Hn) {
                const cd* hn = Hn + (ptrdiff_t) q * N_;
                cd* b = p.accB.data();
                for (int k = 0; k < N_; ++k) b[k] += xp[k] * hn[k];
            }
        }
        fft_.perform(p.acc.data(), true);
        for (int i = 0; i < kBlock; ++i) p.outA[(size_t) i] = p.acc[(size_t) (kBlock + i)] * sc;
        if (Hn) {
            fft_.perform(p.accB.data(), true);
            for (int i = 0; i < kBlock; ++i) p.outB[(size_t) i] = p.accB[(size_t) (kBlock + i)] * sc;
        }
        for (int i = 0; i < kBlock; ++i) p.in[(size_t) i] = p.in[(size_t) (kBlock + i)];
    }
    head_ = (head_ + 1) % P_;
}

void PhaseMatcher::process(float* const* ch, int numCh, int n) noexcept {
    if (!prepared_ || !ch || n <= 0) return;
    if (!fading_ && requested_ < 0 && pending_.load(std::memory_order_relaxed) >= 0) {
        const int s = pending_.exchange(-1, std::memory_order_acq_rel);
        if (s >= 0) requested_ = s;
    }
    const int nc = std::min(numCh, numCh_);
    int i = 0;
    while (i < n) {
        const int m = std::min(n - i, kBlock - pos_);
        for (size_t pi = 0; pi < pairs_.size(); ++pi) {
            const int c0 = (int) pi * 2, c1 = c0 + 1;
            Pair& p = pairs_[pi];
            if (c0 >= nc || !ch[c0]) {  // channel not supplied this call: feed silence, keep the pair's history sane
                for (int t = 0; t < m; ++t) p.in[(size_t) (kBlock + pos_ + t)] = cd{};
                continue;
            }
            float* a = ch[c0] + i;
            float* b = (c1 < nc && ch[c1]) ? ch[c1] + i : nullptr;
            for (int t = 0; t < m; ++t) {
                const int idx = pos_ + t;
                cd y = p.outA[(size_t) idx];
                if (fading_) {
                    const double g = fadeGain_[(size_t) std::min(fadePos_ + t, fadeLen_)];
                    y = (1.0 - g) * y + g * p.outB[(size_t) idx];
                }
                p.in[(size_t) (kBlock + idx)] = cd((double) a[t], b ? (double) b[t] : 0.0);
                a[t] = (float) y.real();
                if (b) b[t] = (float) y.imag();
            }
        }
        if (fading_) fadePos_ = std::min(fadePos_ + m, fadeLen_);
        pos_ += m;
        i += m;
        if (pos_ == kBlock) { runBlock(); pos_ = 0; }
    }
}

} // namespace pf
