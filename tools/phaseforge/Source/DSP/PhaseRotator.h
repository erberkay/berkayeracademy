// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — band-limited continuous phase rotation of the main (submissive) signal.
//
// Convention (docs/ARCHITECTURE.md): y = x·cos θ − H{x}·sin θ, θ in degrees, −180..+180.
// For x = cos(ωt) this gives y = cos(ωt + θ): positive θ advances the phase. θ = 0 → y = x (latency-delayed).
//
// ─── LinearPhaseFIR (latency Hs + B, Hs = round(25 ms·fs), B = 128) ───────────────────────────────────────────
//   y = D(x) + (cos θ − 1)·BP(x) − sin θ·H{BP}(x)          (≡ D(x) − BP(x) + cos θ·BP(x) − sin θ·H{BP}(x))
//   D = pure delay of Hs + B, BP = linear-phase band-pass FIR (length 2·Hs+1, Kaiser β = 4), H{BP} its Hilbert
//   transform from the analytic formula (cos ωa·k − cos ωb·k)/(π·k), same window. Both run in a PartitionedConvolver
//   (delay Hs + B, equal to D). Written this way θ = 0 gives cos θ − 1 = 0 and sin θ = 0 exactly, so the output is
//   bit-exactly the delayed input (no cancellation residue at all).
//   Band edges: a 50 ms Kaiser(β=4) window has a full transition width tw ≈ 2.58/(2·Hs/fs) ≈ 51.5 Hz (independent of
//   fs). The design edges are moved OUTWARD so that the whole user band [lo, hi] is rotated accurately (measured ≤ 0.2° /
//   ≤ 0.06 dB at 30–150 Hz, ≤ 0.3° / 0.09 dB at 180–200 Hz for band 20–200), and the transition skirt lies just outside the band:
//     upper design edge fb = hi + 0.6·tw (clamped below Nyquist);
//     lower design edge fa = 0 when lo < 0.6·tw (≈ 31 Hz, e.g. the default 20 Hz): the band then extends to DC, i.e.
//       BP is a low-pass and only the Hilbert's own low-frequency roll-off limits the rotation. Consequence: below
//       ~20 Hz the rotation is partial — DC is scaled by cos θ and sub-sonic content is attenuated by up to |sin θ|
//       (a gentle sub-sonic high-pass at θ ≈ ±90°, none at 0° or 180°). There is no notch at the low edge.
//     otherwise fa = max(0.5·tw, lo − 0.6·tw) and BP(DC) = 0 exactly (both low-passes are normalised to DC gain 1).
//   LIMITATION (inherent to any complementary "x − BP + rotated BP" split): inside a transition skirt BP is partial
//   (0 < g < 1), so the output there is a mix of the dry and rotated signal; at |θ| → 180° this becomes a notch at the
//   frequency where g = ½ (≈ hi + 32 Hz for the upper skirt). The skirt is ~50 Hz wide because Hs is fixed at 25 ms.
//
// ─── ZeroLatencyIIR (latency 0) ─────────────────────────────────────────────────────────────────────────────────
//   (I, Q) = IirQuadrature(x): two polyphase all-pass chains in z⁻² (halfband/Hilbert design, Valenzuela–Constantinides,
//   coefficients from Jacobi elliptic functions as in de Soras' HIIR — Niemitalo's "Hilbert IIR" is the 8-coefficient
//   44.1 kHz member of this family). Coefficients are computed per sample rate so that the 90° phase difference holds
//   to ≤ 0.05° from fLo = max(2 Hz, L/4) to fs/2 − fLo (the order is chosen automatically, ≤ 40 sections).
//   I = A0(z²)·x, Q = z⁻¹·A1(z²)·x ≈ H{I}. Then, with one crossover pair applied identically to both paths,
//     wet = AP_L·AP_H·I + Band(r − I),   r = I·cos θ − Q·sin θ,   Band = HP_L·LP_H
//   which equals LP_L·AP_H·I + Band·r + HP_H·HP_L·I (Linkwitz–Riley LP + HP = all-pass AP). At steady θ the wet path
//   is magnitude-flat outside the band and rotates the band by θ RELATIVE TO the all-pass reference I.
//   Crossover choice (deviation from a plain LR4 pair at lo/hi, measured — see Tests/phase_tests.cpp):
//     LR4 at exactly lo and hi leaks ~6 % unrotated signal at 0.5·hi, giving −0.8 dB at 100 Hz (band 20–200, θ=120°),
//     −13.7 dB at 180 Hz and a complete null AT lo and hi for θ = 180° (g = ½ at the crossover point). Therefore the
//     IIR mode uses LR8 (Butterworth-4 squared, 48 dB/oct) with the corners half an octave OUTSIDE the band
//     (L = lo/√2, H = hi·√2): in-band ripple ≤ ~0.1 dB / ≤ ~0.3° from 1.4·lo to 0.7·hi, about −1.1 dB at the band
//     edges for θ = 180°, and the unavoidable θ→180° notch (complementary split, g = ½) lies at L and H, outside the band.
//   At θ = 0 the wet path is still an all-pass of x (not x), so at θ = 0 the rotator crossfades (20 ms) to the exact
//   dry input; leaving 0 crossfades back in. The wet path always runs, so the crossfades are click-free.
//   LIMITATIONS (documented, by design):
//     • The processed signal carries the frequency-dependent phase of the all-pass network (I = A0·x and the LR8
//       all-passes); only differences of θ are exact rotations. The angle the PhaseAnalyzer measures is the relative
//       phase kick↔bass as produced by the FIR mode (pure rotation); applying it in IIR mode does not reproduce that
//       alignment exactly. Phase Match is FIR-only for the same reason.
//     • Between the band edge and the crossover corner (half an octave) the rotation is partial (dry/rotated mix).
//     • During the 20 ms crossfade to/from θ = 0 the output is a mix of dry and all-passed signal (brief comb).
//
// Angle smoothing (both modes): setAngle() stores the target (atomic, callable from any thread). The audio thread
// ramps linearly along the shortest arc (wrap-aware: 170° → −170° goes through 180°) in 20 ms; cos/sin are
// recomputed per sample while ramping. No allocation in process(); any n is processed sample by sample, so blocks
// larger than maxBlock need no special handling.
#pragma once

#include "Common.h"

#include <atomic>

// FilterMode is shared with the dynamic EQ; use the common header when present, same guard otherwise.
#if __has_include("FilterMode.h")
#include "FilterMode.h"
#endif
#ifndef PF_FILTER_MODE_DEFINED
#define PF_FILTER_MODE_DEFINED
namespace pf {
enum class FilterMode { ZeroLatencyIIR = 0, LinearPhaseFIR = 1 };
} // namespace pf
#endif

namespace pf {

// 90° phase-difference pair from two polyphase all-pass chains (see header comment).
class IirQuadrature {
public:
    static constexpr int kMaxCoefs = 40;
    // Choose the smallest order whose 90° error is ≤ maxErrDeg on [fLo, fs/2 − fLo]; allocation-free.
    void design(double fs, double fLo, double maxErrDeg = 0.05);
    void reset() noexcept;
    // i ≈ A0(z²)·x, q ≈ H{i} (q lags i by 90° for every positive frequency in the design range)
    inline void process(double x, double& i, double& q) noexcept {
        double a = x, b = x;
        for (int k = 0; k < n; ++k) {
            Sec& s = sec[k];
            double& v = (k & 1) ? b : a;
            const double y = c[k] * (v + s.y2) - s.x2;   // (c − z⁻²)/(1 − c·z⁻²)
            s.x2 = s.x1; s.x1 = v;
            s.y2 = s.y1; s.y1 = y;
            v = y;
        }
        i = a;
        q = bDelay;
        bDelay = b;
    }
    int numCoefs() const noexcept { return n; }
    double designErrorDeg() const noexcept { return errDeg; }
    // analytic phase(I) − phase(Q) at f (degrees, ideal +90)
    double phaseDiffDeg(double fs, double f) const;
    // HIIR-style coefficient formula for nCoefs all-pass sections and normalised transition width (0 < t < 0.25)
    static void computeCoefs(int nCoefs, double transition, double* out);

private:
    struct Sec { double x1 = 0, x2 = 0, y1 = 0, y2 = 0; };
    double c[kMaxCoefs] = {};
    Sec sec[kMaxCoefs];
    double bDelay = 0;
    int n = 0;
    double errDeg = 0;
};

// Linkwitz–Riley 8 band path HP_L·LP_H and its matching all-pass AP_L·AP_H (LR8 LP + HP = BW4 all-pass)
struct LR8Band {
    Biquad hp[4], lp[4], ap[4];
    void design(double fs, double fL, double fH);
    void reset() noexcept;
    inline double band(double x) noexcept {
        for (auto& b : hp) x = b.process(x);
        for (auto& b : lp) x = b.process(x);
        return x;
    }
    inline double allpass(double x) noexcept {
        for (auto& b : ap) x = b.process(x);
        return x;
    }
};

class PhaseRotator {
public:
    static int firHalf(double fs) { return (int) std::lround(0.025 * fs); }   // Hs
    static constexpr int kBlock = 128;
    static constexpr int kMaxCh = 2;
    static constexpr double kRampMs = 20.0;

    void prepare(double fs, int maxBlock, int numCh, FilterMode mode, double loHz, double hiHz); // allocates; loHz<hiHz, e.g. 20..200
    void reset();
    int latency() const;                 // FIR: firHalf(fs)+kBlock ; IIR: 0
    void setAngle(double deg) noexcept;  // target; internally smoothed (~20 ms ramp, wrap-aware) – no zipper noise
    void process(float* const* ch, int numCh, int n) noexcept; // in place, numCh 1..2 (extra channels untouched), any n

    // Jump to deg without a ramp (state restore). Call only when process() is not running concurrently.
    void snapAngle(double deg) noexcept;
    double currentAngleDeg() const noexcept { return phiDeg; }    // smoothed angle (audio-thread value)
    FilterMode mode() const noexcept { return fmode; }
    double designLoHz() const noexcept { return designLo; }        // FIR: fa (0 = band reaches DC); IIR: LR8 corner L
    double designHiHz() const noexcept { return designHi; }        // FIR: fb; IIR: LR8 corner H
    const IirQuadrature& quadrature(int c) const noexcept { return quad[c]; }

private:
    void startRamp(double target) noexcept;
    void stepAngle() noexcept;

    double fs = 48000;
    FilterMode fmode = FilterMode::LinearPhaseFIR;
    int nch = 0, hs = 0, rampLen = 1;
    double designLo = 0, designHi = 0;

    // FIR
    PartitionedConvolver bpConv[kMaxCh], hbConv[kMaxCh];
    Ring<float> dry[kMaxCh];
    std::int64_t t = 0;
    int dryDelay = 0;

    // IIR
    IirQuadrature quad[kMaxCh];
    LR8Band xo[kMaxCh];
    double mix = 0, mixInc = 0, mixTarget = 0;
    int mixLeft = 0;

    // angle
    std::atomic<double> target{0.0};
    double lastTarget = 0;
    double phiDeg = 0, phiInc = 0, phiEnd = 0;
    int rampLeft = 0;
    double cs = 1, sn = 0;
};

} // namespace pf
