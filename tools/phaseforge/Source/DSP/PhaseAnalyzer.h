// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — offline phase-relationship analysis (background thread, NOT the audio callback; allocates).
//
// Finds the rotation θ (convention y = x·cos θ − H{x}·sin θ, same as PhaseRotator) that makes the main/submissive
// signal (bass) most in phase with the sidechain/dominant signal (kick) inside [lo, hi].
//
// Method
//  1. Band-limit + analytic signal + decimation in one step, block-wise in the frequency domain (overlap-save,
//     blocks of 2^k samples with 0.3 s guards): one complex FFT per block carries both signals (d + j·g·s), the
//     zero-phase band weight W(f) is 1 on [lo, hi] with raised-cosine skirts lo/2→lo and hi→1.5·hi, and the
//     positive-frequency bins (×2) are inverse-transformed at a reduced size M (spectral-truncation resampling to
//     fs' = fs·M/N ≥ 6·1.5·hi). This yields d_b, s_b and H{s_b} exactly at the decimated instants, at any fs.
//  2. Windows of 150 ms, hop 75 ms. A window is active only when BOTH signals pass the gate: band RMS ≥ loudest
//     window − 30 dB (per signal) AND ≥ −70 dBFS absolute. Needs ≥ 4 active windows and ≥ 0.5 s covered.
//  3. Score(θ) = Σ d·r_θ / √(Σd² · Σr_θ²) over the samples of active windows (loudness-independent),
//     r_θ = s·cos θ − H{s}·sin θ, evaluated in closed form from six sums. Scan −180..180 (1°, stored in `curve`),
//     refine ±1° in 0.1° steps.
//  4. Per window w: complex cross term v_w = Σ d·s + j·Σ d·H{s} (its best angle is −arg v_w).
//     coherence  = Σ|v_w| / √(Σ Ed_w · Σ ½(Es_w + Eh_w))   (relatedness inside the hits, phase-consistency ignored)
//     resultant R = |Σ v_w| / Σ|v_w|                          (magnitude-weighted circular consistency of the angles)
//     coherence < 0.35 → Unrelated; R < 0.70 → Inconsistent (phase relation changes from hit to hit). In every
//     status except Ok the recommended angle is 0 (and score = scoreAt0, sumGainDb = 0): no arbitrary angle is ever
//     returned when the information is insufficient.
//     confidence = clamp((coherence − 0.35)/0.55) · clamp((R − 0.70)/0.25) · √min(1, activeWindows/12).
//  5. sumGainDb = 10·log10(E(d + r_best) / E(d + s)) over the active samples (clamped to ±60 dB).
// gainOffsetDb (Gain Stage Fix = main fader − sidechain fader) scales s by 10^(dB/20) before everything; it changes
// the gate and sumGainDb, not the angle.
// Cost: O(n log N_block); 5 s at 192 kHz ≈ 3 blocks of 2^19 (see Tests/phase_tests.cpp for the measured time).
#pragma once

#include "Common.h"

#include <vector>

namespace pf {

struct PhaseAnalysis {
    enum class Status { Ok, NotEnoughAudio, Silent, Unrelated, Inconsistent };
    Status status = Status::NotEnoughAudio;
    double angleDeg = 0;      // recommended rotation for the main (submissive) signal, −180..180, 0.1° resolution
    double score = 0;         // normalized cross-term at angleDeg, −1..1
    double scoreAt0 = 0;      // same at 0°
    double confidence = 0;    // 0..1
    double sumGainDb = 0;     // energy of (dominant + rotated) vs (dominant + original) in band, dB
    int windowsUsed = 0;
    std::vector<float> curve; // 361 scores for −180..180 (1° steps)

    // diagnostics (informative, filled whenever windows were analysed)
    double coherence = 0;     // see header comment, 0..1
    double consistency = 0;   // resultant length R, 0..1
    double bestAngleDeg = 0;  // argmax of the curve even when not recommended
};

class PhaseAnalyzer {
public:
    // dominant = sidechain (kick), submissive = main (bass); mono, same length n, sample-aligned. gainOffsetDb = Gain Stage Fix:
    // (main fader − sidechain fader) in dB, applied to the submissive level before analysis.
    PhaseAnalysis analyze(const float* dominant, const float* submissive, int n, double fs, double loHz, double hiHz,
                          double gainOffsetDb = 0.0) const;

    // tuning (defaults match the header comment)
    static constexpr double kWindowSec = 0.150;
    static constexpr double kRelGateDb = -30.0;
    static constexpr double kAbsFloorDb = -70.0;
    static constexpr int kMinWindows = 4;
    static constexpr double kMinActiveSec = 0.5;
    static constexpr double kUnrelatedCoherence = 0.35;
    static constexpr double kInconsistentR = 0.70;
};

} // namespace pf
