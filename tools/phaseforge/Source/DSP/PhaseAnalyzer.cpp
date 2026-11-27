// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
#include "PhaseAnalyzer.h"

#include <algorithm>

namespace pf {

namespace {

using cd = std::complex<double>;

struct BandWeight {
    double lo0, lo1, hi0, hi1;
    double operator()(double f) const noexcept {
        if (f <= lo0 || f >= hi1) return 0.0;
        if (f < lo1) return 0.5 - 0.5 * std::cos(kPi * (f - lo0) / (lo1 - lo0));
        if (f <= hi0) return 1.0;
        return 0.5 + 0.5 * std::cos(kPi * (f - hi0) / (hi1 - hi0));
    }
};

inline double finiteOr0(float v) noexcept { return std::isfinite(v) ? (double) v : 0.0; }

struct Sums {
    double ed = 0, es = 0, eh = 0, c1 = 0, c2 = 0, csh = 0;
    void add(double d, double s, double h) noexcept {
        ed += d * d; es += s * s; eh += h * h;
        c1 += d * s; c2 += d * h; csh += s * h;
    }
    // Σ d·r_θ and Σ r_θ²
    void at(double deg, double& num, double& er) const noexcept {
        const double r = deg * kPi / 180.0, c = std::cos(r), s = std::sin(r);
        num = c * c1 - s * c2;
        er = std::max(0.0, c * c * es - 2.0 * c * s * csh + s * s * eh);
    }
    double score(double deg) const noexcept {
        double num, er;
        at(deg, num, er);
        const double den = std::sqrt(ed * er);
        return den > 0.0 ? num / den : 0.0;
    }
};

inline double wrapDeg(double a) noexcept {
    a = std::fmod(a, 360.0);
    if (a > 180.0) a -= 360.0;
    else if (a <= -180.0) a += 360.0;
    return a;
}

} // namespace

PhaseAnalysis PhaseAnalyzer::analyze(const float* dom, const float* sub, int n, double fs, double loHz, double hiHz,
                                     double gainOffsetDb) const {
    PhaseAnalysis res;
    res.curve.assign(361, 0.0f);
    if (dom == nullptr || sub == nullptr || n <= 0 || !(fs > 0.0)) return res;
    if ((double) n / fs < kMinActiveSec) { res.status = PhaseAnalysis::Status::NotEnoughAudio; return res; }

    const double lo = std::clamp(loHz, 1.0, 0.3 * fs);
    const double hi = std::clamp(hiHz, lo * 1.05, 0.3 * fs);
    const BandWeight W{0.5 * lo, lo, hi, std::min(1.5 * hi, 0.45 * fs)};
    const double g = std::isfinite(gainOffsetDb) ? std::pow(10.0, std::clamp(gainOffsetDb, -60.0, 60.0) / 20.0) : 1.0;

    // ── block geometry (overlap-save in the frequency domain)
    std::int64_t G = (std::int64_t) std::ceil(0.3 * fs);
    int nbOrder = std::min(ceilPow2Order((int) std::min<std::int64_t>(8 * G, (std::int64_t) n + 2 * G)), 26);
    nbOrder = std::max(nbOrder, 12);
    int Nb = 0, M = 0, R = 1;
    std::int64_t H = 0;
    for (;; ++nbOrder) {
        Nb = 1 << nbOrder;
        const double needRate = 6.0 * W.hi1;
        int mOrder = ceilPow2Order((int) std::ceil((double) Nb * needRate / fs));
        mOrder = std::clamp(mOrder, 6, nbOrder);
        M = 1 << mOrder;
        R = Nb / M;
        const std::int64_t Gr = (G + R - 1) / R * R;
        H = (std::int64_t) Nb - 2 * Gr;
        if (H >= Nb / 2 || (H > 0 && (std::int64_t) n + 2 * Gr <= Nb)) { G = Gr; break; }
    }
    const double fsd = fs / R;                      // decimated rate
    const std::int64_t nd = ((std::int64_t) n + R - 1) / R;
    std::vector<double> db((size_t) nd, 0.0), sb((size_t) nd, 0.0), hb((size_t) nd, 0.0);

    FFT fftN(nbOrder), fftM(ceilPow2Order(M));
    std::vector<cd> xb((size_t) Nb), za((size_t) M), zs((size_t) M);
    const int kLo = std::max(1, (int) std::floor(W.lo0 * Nb / fs));
    const int kHi = std::min(M / 2 - 1, (int) std::ceil(W.hi1 * Nb / fs));
    const double inv = 1.0 / Nb;
    for (std::int64_t b = 0; b * H < n; ++b) {
        const std::int64_t s0 = b * H - G;
        for (int i = 0; i < Nb; ++i) {
            const std::int64_t gi = s0 + i;
            if (gi >= 0 && gi < n) xb[(size_t) i] = cd(finiteOr0(dom[gi]), g * finiteOr0(sub[gi]));
            else xb[(size_t) i] = 0.0;
        }
        fftN.perform(xb.data(), false);
        std::fill(za.begin(), za.end(), cd{});
        std::fill(zs.begin(), zs.end(), cd{});
        for (int k = kLo; k <= kHi; ++k) {
            const double w = W((double) k * fs / Nb);
            if (w <= 0.0) continue;
            const cd xk = xb[(size_t) k], xm = std::conj(xb[(size_t) (Nb - k)]);
            const cd D = 0.5 * (xk + xm);
            const cd S = cd(0.0, -0.5) * (xk - xm);
            za[(size_t) k] = 2.0 * w * D;
            zs[(size_t) k] = 2.0 * w * S;
        }
        fftM.perform(za.data(), true);
        fftM.perform(zs.data(), true);
        const std::int64_t m0 = G / R, m1 = (Nb - G) / R, base = s0 / R;
        for (std::int64_t m = m0; m < m1; ++m) {
            const std::int64_t gm = base + m;
            if (gm < 0 || gm >= nd) continue;
            db[(size_t) gm] = za[(size_t) m].real() * inv;
            sb[(size_t) gm] = zs[(size_t) m].real() * inv;
            hb[(size_t) gm] = zs[(size_t) m].imag() * inv;
        }
    }

    // ── windows + gate
    const int Lw = std::max(8, (int) std::lround(kWindowSec * fsd));
    const int hop = std::max(1, Lw / 2);
    if (nd < Lw) { res.status = PhaseAnalysis::Status::NotEnoughAudio; return res; }
    const int nw = (int) ((nd - Lw) / hop) + 1;
    std::vector<Sums> ws((size_t) nw);
    double maxD = 0, maxS = 0;
    for (int w = 0; w < nw; ++w) {
        Sums& S = ws[(size_t) w];
        const std::int64_t a = (std::int64_t) w * hop;
        for (int i = 0; i < Lw; ++i) S.add(db[(size_t) (a + i)], sb[(size_t) (a + i)], hb[(size_t) (a + i)]);
        maxD = std::max(maxD, std::sqrt(S.ed / Lw));
        maxS = std::max(maxS, std::sqrt(S.es / Lw));
    }
    const double absFloor = std::pow(10.0, kAbsFloorDb / 20.0), rel = std::pow(10.0, kRelGateDb / 20.0);
    if (maxD < absFloor || maxS < absFloor) { res.status = PhaseAnalysis::Status::Silent; return res; }
    const double thrD = std::max(absFloor, maxD * rel), thrS = std::max(absFloor, maxS * rel);

    std::vector<unsigned char> mask((size_t) nd, 0);
    int active = 0;
    double sumAbsV = 0, sumEd = 0, sumEsh = 0;
    cd sumV = 0;
    for (int w = 0; w < nw; ++w) {
        const Sums& S = ws[(size_t) w];
        if (std::sqrt(S.ed / Lw) < thrD || std::sqrt(S.es / Lw) < thrS) continue;
        ++active;
        const std::int64_t a = (std::int64_t) w * hop;
        std::fill(mask.begin() + a, mask.begin() + a + Lw, (unsigned char) 1);
        const cd v(S.c1, S.c2);
        sumV += v;
        sumAbsV += std::abs(v);
        sumEd += S.ed;
        sumEsh += 0.5 * (S.es + S.eh);
    }
    std::int64_t covered = 0;
    Sums T;
    for (std::int64_t i = 0; i < nd; ++i)
        if (mask[(size_t) i]) { ++covered; T.add(db[(size_t) i], sb[(size_t) i], hb[(size_t) i]); }
    res.windowsUsed = active;
    if (active < kMinWindows || (double) covered / fsd < kMinActiveSec || T.ed <= 0.0 || T.es <= 0.0) {
        res.status = PhaseAnalysis::Status::NotEnoughAudio;
        return res;
    }

    // ── scan + refine
    int bi = 0;
    double bs = -2.0;
    for (int i = 0; i <= 360; ++i) {
        const double sc = T.score((double) (i - 180));
        res.curve[(size_t) i] = (float) sc;
        if (sc > bs) { bs = sc; bi = i; }
    }
    double best = (double) (bi - 180);
    const double centre = best;
    for (int j = -10; j <= 10; ++j) {
        const double a = centre + 0.1 * j;
        const double sc = T.score(a);
        if (sc > bs) { bs = sc; best = a; }
    }
    best = wrapDeg(std::round(best * 10.0) / 10.0);
    if (best == -180.0) best = 180.0;

    const double coherence = (sumEd > 0 && sumEsh > 0) ? std::min(1.0, sumAbsV / std::sqrt(sumEd * sumEsh)) : 0.0;
    const double R_ = sumAbsV > 0 ? std::abs(sumV) / sumAbsV : 0.0;
    res.coherence = coherence;
    res.consistency = R_;
    res.bestAngleDeg = best;
    res.scoreAt0 = T.score(0.0);
    auto clamp01 = [](double v) { return std::clamp(v, 0.0, 1.0); };
    res.confidence = clamp01((coherence - kUnrelatedCoherence) / (0.90 - kUnrelatedCoherence))
                   * clamp01((R_ - kInconsistentR) / (0.95 - kInconsistentR))
                   * std::sqrt(std::min(1.0, active / 12.0));

    if (coherence < kUnrelatedCoherence) res.status = PhaseAnalysis::Status::Unrelated;
    else if (R_ < kInconsistentR) res.status = PhaseAnalysis::Status::Inconsistent;
    else res.status = PhaseAnalysis::Status::Ok;

    if (res.status != PhaseAnalysis::Status::Ok) {
        res.angleDeg = 0.0;
        res.score = res.scoreAt0;
        res.sumGainDb = 0.0;
        return res;
    }
    res.angleDeg = best;
    res.score = T.score(best);
    double num, er;
    T.at(best, num, er);
    const double eRot = T.ed + 2.0 * num + er;
    const double eRef = T.ed + 2.0 * T.c1 + T.es;
    const double fl = 1e-12 * (T.ed + T.es);
    res.sumGainDb = std::clamp(10.0 * std::log10(std::max(eRot, fl) / std::max(eRef, fl)), -60.0, 60.0);
    return res;
}

} // namespace pf
