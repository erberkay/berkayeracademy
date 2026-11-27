// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — detector building blocks for the dynamic EQ (JUCE-free, real-time safe, no allocation).
//
//  * SvfCoefs / SvfState — TPT state-variable filter (Zavalishin, "The Art of VA Filter Design"; A. Simper,
//    "SvfLinearTrapOptimised2"). Trapezoidal integration = bilinear transform with pre-warped cutoff, so the
//    magnitude at f0 is exact and the structure stays stable when g/k are modulated every sample.
//    Outputs: v1 = band-pass (gain 1/k = Q at f0), v2 = low-pass (DC gain 1, gain Q at f0, 90° behind v1).
//  * BandEnvelope — 4th-order band detector with a ripple-free quadrature envelope:
//        u   = k·BP₁(x)                (unity-peak band-pass)
//        e²  = k²·(BP₂(u)² + LP₂(u)²)  (second SVF on u; at f0 its BP and LP outputs have equal magnitude and
//                                       are 90° apart, so e² of a steady sine at f0 is exactly its amplitude²)
//    Both outputs of stage 2 are band-pass with respect to x (BP·BP and BP·LP), so DC and far-away content are
//    rejected (≥ 12 dB/oct below f0, ≥ 12 dB/oct above). Level is calibrated to the sine peak: a 0 dBFS sine at
//    the node frequency reads 0 dB.
//  * EnvelopeFollower — one-pole follower with separate attack/release coefficients
//        a = exp(−1 / (τ·fs)),   τ = time constant (63 % step response)
//    Peak mode: smooth-branching peak follower on the value itself (used on the reduction in dB → log-domain
//    "smooth decoupled" ballistics, Giannoulis/Massberg/Reiss 2012, so attack/release are the true 63 % times of
//    the gain reduction, independent of threshold and knee). Rms mode: the same follower on x², sqrt on read.
#pragma once

#include "Common.h"

#include <cmath>

namespace pf {

struct SvfCoefs {
    double g = 0.0, k = 1.0, a1 = 1.0, a2 = 0.0, a3 = 0.0;
    inline void set(double gIn, double kIn) noexcept {
        g = gIn;
        k = kIn;
        a1 = 1.0 / (1.0 + g * (g + k));
        a2 = g * a1;
        a3 = g * a2;
    }
};

// g = tan(π·f/fs); f is clamped below Nyquist by the caller
inline double svfG(double fHz, double fs) noexcept { return std::tan(kPi * fHz / fs); }

struct SvfState {
    double ic1 = 0.0, ic2 = 0.0;
    // returns the band-pass output v1, writes the low-pass output v2 into lp
    inline double tick(double x, const SvfCoefs& c, double& lp) noexcept {
        const double v3 = x - ic2;
        const double v1 = c.a1 * ic1 + c.a2 * v3;
        const double v2 = ic2 + c.a2 * ic1 + c.a3 * v3;
        ic1 = 2.0 * v1 - ic1;
        ic2 = 2.0 * v2 - ic2;
        lp = v2;
        return v1;
    }
    // band-pass only, generic coefficient set (a1,a2,a3 precomputed by the caller)
    inline double tickBp(double x, double a1, double a2, double a3) noexcept {
        const double v3 = x - ic2;
        const double v1 = a1 * ic1 + a2 * v3;
        const double v2 = ic2 + a2 * ic1 + a3 * v3;
        ic1 = 2.0 * v1 - ic1;
        ic2 = 2.0 * v2 - ic2;
        return v1;
    }
    void reset() noexcept { ic1 = ic2 = 0.0; }
    // flush tiny states to zero (denormal safety of the recursion when the input goes silent)
    inline void flush() noexcept {
        if (std::fabs(ic1) < 1e-20) ic1 = 0.0;
        if (std::fabs(ic2) < 1e-20) ic2 = 0.0;
    }
};

class BandEnvelope {
public:
    // returns the instantaneous squared envelope (amplitude²) of x in the band given by c (k = 1/Q)
    inline double process(double x, const SvfCoefs& c) noexcept {
        double lp1, lp2;
        const double u = c.k * s1.tick(x, c, lp1);
        const double b2 = s2.tick(u, c, lp2);
        return c.k * c.k * (b2 * b2 + lp2 * lp2);
    }
    void reset() noexcept { s1.reset(); s2.reset(); }
    void flush() noexcept { s1.flush(); s2.flush(); }
private:
    SvfState s1, s2;
};

inline double onePoleCoef(double ms, double fs) noexcept {
    const double n = ms * 1e-3 * fs;
    return n <= 0.0 ? 0.0 : std::exp(-1.0 / n);
}

class EnvelopeFollower {
public:
    enum class Mode { Peak = 0, Rms = 1 };
    void setTimes(double attackMs, double releaseMs, double fs) noexcept {
        aAtt = onePoleCoef(attackMs, fs);
        aRel = onePoleCoef(releaseMs, fs);
    }
    void setCoefs(double attackCoef, double releaseCoef) noexcept { aAtt = attackCoef; aRel = releaseCoef; }
    void setMode(Mode m) noexcept { mode = m; }
    // Peak: follows x. Rms: follows x², value() returns √state.
    inline double process(double x) noexcept {
        const double in = mode == Mode::Rms ? x * x : x;
        const double a = in > st ? aAtt : aRel;
        st = in + a * (st - in);
        if (st < 1e-30) st = 0.0;  // denormal / snap
        return value();
    }
    // follow an already squared input (Rms mode) or the plain value (Peak mode) without squaring
    inline double processRaw(double in) noexcept {
        const double a = in > st ? aAtt : aRel;
        st = in + a * (st - in);
        if (st < 1e-30) st = 0.0;
        return st;
    }
    inline double value() const noexcept { return mode == Mode::Rms ? std::sqrt(st) : st; }
    inline double state() const noexcept { return st; }
    void setState(double s) noexcept { st = s; }
    void reset() noexcept { st = 0.0; }
private:
    Mode mode = Mode::Peak;
    double aAtt = 0.0, aRel = 0.0, st = 0.0;
};

} // namespace pf
