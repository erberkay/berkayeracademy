// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
#include "PhaseRotator.h"

#include <algorithm>

namespace pf {

namespace {

// (−180, 180]
inline double wrapDeg(double a) noexcept {
    a = std::fmod(a, 360.0);
    if (a > 180.0) a -= 360.0;
    else if (a <= -180.0) a += 360.0;
    return a;
}

// exact values at multiples of 90° (θ = 0 must be bit-exact)
inline void sinCosDeg(double a, double& c, double& s) noexcept {
    if (a == 0.0) { c = 1.0; s = 0.0; return; }
    if (a == 90.0) { c = 0.0; s = 1.0; return; }
    if (a == -90.0) { c = 0.0; s = -1.0; return; }
    if (a == 180.0 || a == -180.0) { c = -1.0; s = 0.0; return; }
    const double r = a * (kPi / 180.0);
    c = std::cos(r);
    s = std::sin(r);
}

double agm(double a, double b) {
    for (int i = 0; i < 64; ++i) {
        const double an = 0.5 * (a + b), bn = std::sqrt(a * b);
        a = an; b = bn;
        if (std::fabs(a - b) <= 1e-17 * a) break;
    }
    return a;
}

} // namespace

// ───────────────────────────── IirQuadrature
// Polyphase IIR halfband design (Valenzuela & Constantinides; formulation of L. de Soras, HIIR
// PolyphaseIir2Designer). The halfband prototype H(z) = ½(A0(z²) + z⁻¹A1(z²)) shifted by fs/4 (z → j·z) yields the
// analytic pair A0(−z²), z⁻¹A1(−z²): sections (c − z⁻²)/(1 − c·z⁻²). The nome q is computed exactly from complete
// elliptic integrals (AGM) instead of HIIR's 4-term series, which loses accuracy for the tiny transition widths needed
// at high sample rates (e.g. 2 Hz / 192 kHz) and caps the 90° error at ~0.3–0.8°.
void IirQuadrature::computeCoefs(int nCoefs, double transition, double* out) {
    double k = std::tan((1.0 - 2.0 * transition) * kPi / 4.0);
    k *= k;
    const double kp = std::sqrt(std::max(0.0, 1.0 - k * k));
    const double q = std::exp(-kPi * agm(1.0, kp) / agm(1.0, k));
    const int order = 2 * nCoefs + 1;
    for (int idx = 0; idx < nCoefs; ++idx) {
        const int c = idx + 1;
        double num = 0, den = 0;
        {
            int i = 0, j = 1;
            for (;;) {
                const double v = std::pow(q, (double) i * (i + 1)) * std::sin((i * 2 + 1) * c * kPi / order) * j;
                num += v; j = -j; ++i;
                if (std::fabs(v) <= 1e-100 || i > 10000) break;
            }
            num *= std::pow(q, 0.25);
        }
        {
            int i = 1, j = -1;
            for (;;) {
                const double v = std::pow(q, (double) i * i) * std::cos(i * 2 * c * kPi / order) * j;
                den += v; j = -j; ++i;
                if (std::fabs(v) <= 1e-100 || i > 10000) break;
            }
            den += 0.5;
        }
        const double ww = num / den, wwsq = ww * ww;
        const double x = std::sqrt((1.0 - wwsq * k) * (1.0 - wwsq / k)) / (1.0 + wwsq);
        out[idx] = (1.0 - x) / (1.0 + x);
    }
}

double IirQuadrature::phaseDiffDeg(double fs, double f) const {
    const double w = 2.0 * kPi * f / fs;
    const std::complex<double> z1 = std::polar(1.0, -w), z2 = z1 * z1;   // z⁻¹, z⁻²
    std::complex<double> a0 = 1.0, a1 = 1.0;
    for (int k = 0; k < n; ++k) {
        const auto sec = (c[k] - z2) / (1.0 - c[k] * z2);
        if (k & 1) a1 *= sec; else a0 *= sec;
    }
    a1 *= z1;
    return std::arg(a0 / a1) * 180.0 / kPi;
}

void IirQuadrature::design(double fs, double fLo, double maxErrDeg) {
    fLo = std::clamp(fLo, 1e-6 * fs, 0.2 * fs);
    const double tr = fLo / fs;
    double best = 1e9;
    int bestN = 8;
    double tmp[kMaxCoefs];
    for (int nc = 6; nc <= kMaxCoefs; ++nc) {
        computeCoefs(nc, tr, tmp);
        std::copy(tmp, tmp + nc, c);
        n = nc;
        double e = 0;
        const int pts = 256;
        const double l0 = std::log(fLo), l1 = std::log(0.5 * fs - fLo);
        for (int p = 0; p < pts; ++p) {
            const double f = std::exp(l0 + (l1 - l0) * p / (pts - 1));
            e = std::max(e, std::fabs(phaseDiffDeg(fs, f) - 90.0));
        }
        if (e < best) { best = e; bestN = nc; }
        if (e <= maxErrDeg) break;
    }
    n = bestN;
    computeCoefs(n, tr, c);
    errDeg = best;
    reset();
}

void IirQuadrature::reset() noexcept {
    for (auto& s : sec) s = Sec{};
    bDelay = 0;
}

// ───────────────────────────── LR8Band
namespace {
// 2nd-order Butterworth-family section (bilinear, pre-warped), quality q
Biquad bwSection(double fs, double fc, double q, bool highpass) {
    const double k = std::tan(kPi * fc / fs);
    const double norm = 1.0 / (1.0 + k / q + k * k);
    Biquad b;
    if (highpass) { b.b0 = norm; b.b1 = -2.0 * norm; b.b2 = norm; }
    else { b.b0 = k * k * norm; b.b1 = 2.0 * b.b0; b.b2 = b.b0; }
    b.a1 = 2.0 * (k * k - 1.0) * norm;
    b.a2 = (1.0 - k / q + k * k) * norm;
    return b;
}
// all-pass with the same poles: A(−s)/A(s) → mirrored denominator
Biquad apSection(const Biquad& p) {
    Biquad b;
    b.b0 = p.a2; b.b1 = p.a1; b.b2 = 1.0; b.a1 = p.a1; b.a2 = p.a2;
    return b;
}
} // namespace

void LR8Band::design(double fs, double fL, double fH) {
    const double q1 = 1.0 / (2.0 * std::cos(kPi / 8.0)), q2 = 1.0 / (2.0 * std::cos(3.0 * kPi / 8.0));   // BW4
    hp[0] = hp[2] = bwSection(fs, fL, q1, true);
    hp[1] = hp[3] = bwSection(fs, fL, q2, true);
    lp[0] = lp[2] = bwSection(fs, fH, q1, false);
    lp[1] = lp[3] = bwSection(fs, fH, q2, false);
    ap[0] = apSection(hp[0]); ap[1] = apSection(hp[1]);
    ap[2] = apSection(lp[0]); ap[3] = apSection(lp[1]);
    reset();
}

void LR8Band::reset() noexcept {
    for (auto& b : hp) b.reset();
    for (auto& b : lp) b.reset();
    for (auto& b : ap) b.reset();
}

// ───────────────────────────── PhaseRotator
void PhaseRotator::prepare(double sampleRate, int /*maxBlock*/, int numCh, FilterMode m, double loHz, double hiHz) {
    fs = sampleRate;
    fmode = m;
    nch = std::clamp(numCh, 1, kMaxCh);
    hs = firHalf(fs);
    rampLen = std::max(1, (int) std::lround(kRampMs * 1e-3 * fs));
    const double nyq = 0.5 * fs;
    double lo = std::clamp(loHz, 1.0, 0.4 * fs);
    double hi = std::clamp(hiHz, lo * 1.01, 0.45 * fs);

    if (fmode == FilterMode::LinearPhaseFIR) {
        const double tw = 2.58 * fs / (2.0 * hs);   // Kaiser β = 4 full transition width (≈ 51.5 Hz)
        double fb = std::min(hi + 0.6 * tw, nyq - 0.6 * tw);
        double fa = (lo < 0.6 * tw) ? 0.0 : std::max(0.5 * tw, lo - 0.6 * tw);
        if (fa >= fb - tw) fa = 0.0;   // band too narrow for a separate lower edge
        designLo = fa;
        designHi = fb;
        std::vector<double> lpB, hlpB, lpA, hlpA;
        lowpassFirPair(fs, fb, hs, lpB, hlpB, 4.0);
        std::vector<double> bp = lpB, hb = hlpB;
        if (fa > 0.0) {
            lowpassFirPair(fs, fa, hs, lpA, hlpA, 4.0);
            for (size_t i = 0; i < bp.size(); ++i) { bp[i] -= lpA[i]; hb[i] -= hlpA[i]; }
        }
        dryDelay = hs + kBlock;
        for (int c = 0; c < nch; ++c) {
            bpConv[c].prepare(bp, kBlock);
            hbConv[c].prepare(hb, kBlock);
            dry[c].allocate(dryDelay + 1);
        }
    } else {
        const double fL = lo / std::sqrt(2.0), fH = std::min(hi * std::sqrt(2.0), 0.45 * fs);
        designLo = fL;
        designHi = fH;
        const double fLo = std::max(2.0, fL / 4.0);
        for (int c = 0; c < nch; ++c) {
            quad[c].design(fs, fLo, 0.05);
            xo[c].design(fs, fL, fH);
        }
    }
    reset();
}

void PhaseRotator::reset() {
    for (int c = 0; c < nch; ++c) {
        if (fmode == FilterMode::LinearPhaseFIR) {
            bpConv[c].reset();
            hbConv[c].reset();
            dry[c].clear();
        } else {
            quad[c].reset();
            xo[c].reset();
        }
    }
    t = 0;
    snapAngle(target.load(std::memory_order_relaxed));
}

int PhaseRotator::latency() const {
    return fmode == FilterMode::LinearPhaseFIR ? hs + kBlock : 0;
}

void PhaseRotator::setAngle(double deg) noexcept {
    if (!std::isfinite(deg)) return;
    target.store(std::clamp(deg, -180.0, 180.0), std::memory_order_relaxed);
}

void PhaseRotator::snapAngle(double deg) noexcept {
    if (!std::isfinite(deg)) deg = 0.0;
    deg = std::clamp(deg, -180.0, 180.0);
    target.store(deg, std::memory_order_relaxed);
    lastTarget = deg;
    phiDeg = phiEnd = deg;
    rampLeft = 0;
    sinCosDeg(phiDeg, cs, sn);
    mixTarget = mix = (deg != 0.0) ? 1.0 : 0.0;
    mixLeft = 0;
}

void PhaseRotator::startRamp(double tgt) noexcept {
    lastTarget = tgt;
    const double delta = wrapDeg(tgt - phiDeg);   // shortest arc
    phiEnd = tgt;
    if (delta == 0.0) {
        phiDeg = tgt;
        rampLeft = 0;
        sinCosDeg(phiDeg, cs, sn);
    } else {
        phiInc = delta / rampLen;
        rampLeft = rampLen;
    }
    const double mt = (tgt != 0.0) ? 1.0 : 0.0;
    if (mt != mixTarget) {
        mixTarget = mt;
        mixInc = (mixTarget - mix) / rampLen;
        mixLeft = rampLen;
    }
}

inline void PhaseRotator::stepAngle() noexcept {
    if (rampLeft > 0) {
        if (--rampLeft == 0) phiDeg = phiEnd;
        else phiDeg = wrapDeg(phiDeg + phiInc);
        sinCosDeg(phiDeg, cs, sn);
    }
    if (mixLeft > 0) {
        if (--mixLeft == 0) mix = mixTarget;
        else mix += mixInc;
    }
}

void PhaseRotator::process(float* const* ch, int numCh, int n) noexcept {
    const int nc = std::min(numCh, nch);
    if (nc <= 0 || n <= 0) return;
    const double tgt = target.load(std::memory_order_relaxed);
    if (tgt != lastTarget) startRamp(tgt);

    if (fmode == FilterMode::LinearPhaseFIR) {
        for (int i = 0; i < n; ++i) {
            stepAngle();
            const double cm1 = cs - 1.0, s = sn;
            for (int c = 0; c < nc; ++c) {
                const float x = ch[c][i];
                dry[c].write(t, x);
                const double d = (double) dry[c].read(t - dryDelay);
                const double b = bpConv[c].process((double) x);
                const double h = hbConv[c].process((double) x);
                ch[c][i] = (float) (d + cm1 * b - s * h);
            }
            ++t;
        }
    } else {
        for (int i = 0; i < n; ++i) {
            stepAngle();
            const double cm1 = cs - 1.0, s = sn, m = mix;
            for (int c = 0; c < nc; ++c) {
                const double x = (double) ch[c][i];
                double I, Q;
                quad[c].process(x, I, Q);
                const double band = xo[c].band(cm1 * I - s * Q);
                const double wet = xo[c].allpass(I) + band;
                if (m <= 0.0) continue;                         // exact bypass (wet path keeps running)
                ch[c][i] = (float) (m >= 1.0 ? wet : x + m * (wet - x));
            }
            ++t;
        }
    }
}

} // namespace pf
