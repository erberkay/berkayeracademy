// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — main/sidechain masking ("conflict") estimate and node suggestions (analysis thread only, JUCE-free).
//
// ── Conflict formula (per display point i, separately for Mid and Side) ──────────────────────────────────────────
//   m_i   main level (dB, band power from FFTAnalyzer),  s_i sidechain level,  g = gain offset (main − sc, dB)
//   ŝ_i   sidechain after 1/3-octave masking spread:  ŝ_i = max_j ( s_j − 36 dB/oct · |log2(f_j / f_i)| ),
//         |log2(f_j/f_i)| ≤ 1/3   (max-combining, so the spread never raises the level of a flat spectrum)
//   t_i   spectral tilt +3 dB/oct around 1 kHz (pink → flat), used only to judge "meaningful energy"
//   F_x   adaptive floor of signal x ∈ {main, sc}, per channel, on tilted levels:
//         F = max( Tmax_x − D_x,  min(P10(channel + t) + 3 dB, Tmax_x − 12 dB) ),  D_main = 36 dB, D_sc = 24 dB
//         Tmax_x = maximum of the tilted levels over Mid AND Side of that signal (a Side far under the Mid is
//         "no energy"); P10 = 10th percentile (raises the floor above a dense noise bed). The sidechain floor is
//         stricter because with the target-gap rule R saturates wherever the main dominates: a band the kick
//         barely has (e.g. −30 dB under its peak at 300 Hz) must not ask for ducking there.
//   presence  P(x) = S((x + t − F)/18 dB) · S((x + 80 dB)/18 dB)    S = smoothstep on [0,1]
//             → 0 at the adaptive floor, 1 at 18 dB above it; and nothing below −80 dBFS (absolute)
//   gap       Δ_i = ŝ_i − (m_i − g)   (how many dB the gain-staged main sits UNDER the sidechain)
//   ratio     R = S( (X − Δ_i) / 3 dB ),  X = targetGapDb = Conflict Sensitivity (0…9 dB, default 3)
//             → 0 when the main is at least X dB under the sidechain (no conflict), 1 when it is ≥ 3 dB short of
//             that gap. X = 0: conflict only where the main is louder than the sidechain.
//   conflict  C_i = P_main(m_i) · P_sc(ŝ_i) · R_i            ∈ [0, 1]
//   No sidechain (frame.hasSidechain == false) → C ≡ 0.
//   Resolution caveat: C is computed on the display grid, so at low frequencies it is as broad as the FFT bin
//   (11.7 Hz at 4096 / 48 kHz): a 55 Hz kick against a 55 Hz bass also lights up ≈ 25–95 Hz. The resolver below
//   weights by energy, which puts the node back on the actual overlap.
//
// ── Resolve (resolveConflicts) ───────────────────────────────────────────────────────────────────────────────────
//   Levels: the frame's *Active arrays when present (SpectrumAccumulator::average(): main and sidechain power
//   weighted by the sidechain power of the same point/channel = levels while the sidechain is sounding), otherwise
//   the plain levels. Conflict is RECOMPUTED on those levels with X = sensitivityDb as the target gap (the frame's
//   own conflict arrays, computed with the analyzer's gap, are for display only).
//   c_i = max(C_mid, C_side).  e_i = 10^( min(Mt_i − Mt_max, St_i − St_max) / 20 )  (Mt, St = tilted Mid+Side power
//   of main and sidechain): the amplitude of the WEAKER of the two at i relative to its own maximum.
//   score_i = c_i · e_i. Candidates = local maxima of score with c ≥ 0.2 and score ≥ 0.1·max(score).
//   Region = contiguous points around the candidate with score > ½·peak (stopping at a local minimum).
//   Greedy by score: a candidate whose centre is within 1/3 oct of an accepted node is merged into it (region widened
//   if its score ≥ ½ of the node's; centre/conflict recomputed over the widened region); at most maxNodes; a final pass
//   guarantees ≥ 1/3 oct between all nodes.
//   freq    = score-weighted log-frequency centre of the region
//   Q       = bell Q for BW = √(width² − (1/6)²) oct (the 1/6-oct analysis smear removed in quadrature),
//             Q = √(2^BW) / (2^BW − 1), clamped 0.5 … 8
//   range   = min( 12 dB,  (m − g) − (s − X) )  at the region's strongest point, in the node's channel
//             (m, s = active band levels; for a merged node the stronger candidate's peak):
//             exactly the reduction that leaves the main X dB under the sidechain; nodes needing < 0.5 dB are dropped.
//   thresh  = sidechain (active) band level at that point − 6 dB, clamped −60 … 0 dBFS.
//             NOTE: DynamicEQ's Sidechain-mode detector reaches the full range only ~10–12 dB above threshold (soft
//             knee), so at the sidechain's active level (6 dB over threshold) it applies roughly half of rangeDb.
//             To actually reach the target gap on hits, either set the threshold ≈ 12 dB under the band level or
//             scale rangeDb in the EQ; this function deliberately keeps −6 dB as specified.
//   attack / release: log-frequency interpolation 10 ms / 150 ms @ ≤ 50 Hz → 2 ms / 60 ms @ ≥ 2 kHz
//   channel: Mid (1) if C_side < ½·C_mid in the region, Side (2) if C_mid < ½·C_side, else Stereo (0)
//   Output order: highest score first.
#pragma once

#include "FFTAnalyzer.h"

#include <vector>

namespace pf {

struct NodeSuggestion {
    float freqHz, rangeDb, thresholdDb, q, attackMs, releaseMs;
    int channel;  // 0 stereo, 1 mid, 2 side
    float conflict;
};

struct ConflictParams {
    float floorBelowMaxDb = 36.0f;    // main (submissive): presence floor under its own tilted maximum
    float scFloorBelowMaxDb = 24.0f;  // sidechain (dominant): stricter — only bands that matter for the dominant
    float floorAbsDb = -80.0f;      // presence also ramps up from this absolute (untilted) level
    float tiltDbPerOct = 3.0f;      // presence is judged on levels tilted +3 dB/oct around 1 kHz (pink → flat)
    float floorPercentile = 0.10f;
    float floorAbovePercentileDb = 3.0f;
    float presenceRampDb = 18.0f;
    float targetGapDb = 3.0f;         // Conflict Sensitivity X (0…9 dB): main should sit ≥ X dB under the sidechain
    float gapRampDb = 3.0f;           // R ramps 0 → 1 as the gap falls from X to X − gapRampDb
    float spreadOct = 1.0f / 3.0f;
    float spreadSlopeDbPerOct = 36.0f;
};

class ConflictDetector {
public:
    // Allocates scratch for this display grid. compute() then does not allocate as long as the grid is the same.
    void prepare(const std::vector<float>& hz, const ConflictParams& p = {});
    void compute(SpectrumFrame& f, float gainOffsetDb);
    const ConflictParams& params() const noexcept { return prm; }
    void setParams(const ConflictParams& p) { prepare(hzGrid, p); }
    void setTargetGapDb(float x) noexcept { prm.targetGapDb = x; }

private:
    void channel(const std::vector<float>& m, const std::vector<float>& s, float floorM, float floorS, float g,
                 std::vector<float>& out);
    float floorOf(const std::vector<float>& x, float maxAll, float belowMaxDb);
    ConflictParams prm;
    std::vector<float> hzGrid;
    std::vector<int> spreadLo, spreadHi;    // per point: neighbour index range within spreadOct
    std::vector<float> logHz;
    std::vector<float> spread, scratch, tilt, tm, ts;
};

// Convenience: one-shot (allocates a detector).
void computeConflict(SpectrumFrame& f, float gainOffsetDb, const ConflictParams& p = {});

// Learn-mode average: levels averaged in the power domain; conflict averaged with the sidechain power of the same
// point and channel as weight (= "how much conflict there is while the sidechain is actually sounding").
class SpectrumAccumulator {
public:
    void reset();
    void add(const SpectrumFrame& f);
    int frames() const noexcept { return count; }
    SpectrumFrame average() const;  // also fills the *Active levels; peaks via findSpectralPeaks

private:
    int count = 0;
    bool anySc = false;
    float binHz = 0.0f;
    std::vector<float> hz;
    std::vector<double> pMM, pMS, pSM, pSS, cM, cS, wM, wS, aMM, aMS, aSM, aSS;
};

// sensitivityDb = target gap X (0…9 dB). gainOffsetDb = Gain Stage Fix (main − sc), as in FFTAnalyzer.
// base supplies the presence/spread parameters; its targetGapDb is replaced by sensitivityDb.
std::vector<NodeSuggestion> resolveConflicts(const SpectrumFrame& averaged, float sensitivityDb /*0..9*/, int maxNodes = 8,
                                             float gainOffsetDb = 0.0f, const ConflictParams& base = {});

} // namespace pf
