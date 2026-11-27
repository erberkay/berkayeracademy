// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — loudness meter after ITU-R BS.1770-4 / EBU R128 (EBU Tech 3341 "EBU mode"), JUCE-free.
//
// * K-weighting = high-shelf (stage 1) + RLB high-pass (stage 2), designed for any sample rate by the bilinear
//   transform of the analog prototypes (f0/Q/gain as in libebur128 / BS.1770 Annex 1), pre-warped at f0.
//   At 48 kHz the coefficients equal the table in BS.1770-4 to < 1e-8 (unit-tested).
// * Loudness of a block = −0.691 + 10·log10( Σ_i G_i · mean(y_i²) ), y_i = K-weighted channel i.
//   Channel weights G: 1.0 for L, R, C; 1.41 for Ls, Rs; LFE excluded. Defaults by channel count:
//   1–4 ch → all 1.0;  5 ch → L R C Ls Rs;  6 ch → L R C LFE Ls Rs (5.1);  7+ → all 1.0 (override with setChannelWeight).
//   A mono signal is measured as ONE channel (standard behaviour; a "dual mono" meter would read +3.01 LU).
// * Everything is accumulated in 100 ms sub-blocks (round(fs/10) samples):
//     momentary  = last 4 sub-blocks  (400 ms window, updated every 100 ms)
//     short-term = last 30 sub-blocks (3 s window, updated every 100 ms)
//   Before the window is full the missing part counts as silence (the meter behaves as if fed zeros before reset()).
//   Integrated: gating blocks of 400 ms with 75 % overlap (one per sub-block once 4 exist), absolute gate −70 LUFS,
//   relative gate −10 LU. Blocks are kept in a fixed histogram (0.01 LU bins from −70 to +10 LUFS; each bin stores
//   the block count AND the exact sum of block energies), so the result is exact except for blocks that fall in the
//   one bin containing the relative threshold (≤ 0.01 LU decision error), and memory is bounded for any duration.
// * process() is real-time safe: no allocation, no locks. Results are published as relaxed atomics at every
//   sub-block boundary, so getters may be called from any thread.
#pragma once

#include "Common.h"

#include <array>
#include <atomic>
#include <cstdint>
#include <limits>
#include <vector>

namespace pf {

class LoudnessMeter {
public:
    static constexpr int kMaxChannels = 8;
    static constexpr double kHistMinLufs = -70.0;
    static constexpr double kHistMaxLufs = 10.0;
    static constexpr double kHistStepLu = 0.01;
    static constexpr int kHistBins = 8000;          // (kHistMaxLufs − kHistMinLufs) / kHistStepLu
    static constexpr int kShortTermSubBlocks = 30;  // 3 s
    static constexpr int kMomentarySubBlocks = 4;   // 400 ms

    void prepare(double fs, int numCh);
    void reset();
    // ch[c] for c < numCh (numCh is clamped to the prepared channel count; channels beyond it are ignored)
    void process(const float* const* ch, int numCh, int n) noexcept;

    float momentaryLufs() const noexcept { return mom.load(std::memory_order_relaxed); }
    float shortTermLufs() const noexcept { return st.load(std::memory_order_relaxed); }
    float integratedLufs() const noexcept { return integ.load(std::memory_order_relaxed); }   // −inf until a block passes the gates
    float samplePeakDb() const noexcept { return peak.load(std::memory_order_relaxed); }      // max |x| since reset, dBFS
    float samplePeakDisplayDb() const noexcept { return peakDisp.load(std::memory_order_relaxed); }  // falls 20 dB/s
    std::uint64_t gatingBlocks() const noexcept { return blocksTotal; }  // blocks above the absolute gate (audio thread)

    void setChannelWeight(int ch, double w) noexcept { if (ch >= 0 && ch < kMaxChannels) weight[(size_t) ch] = w; }
    double sampleRate() const noexcept { return fs; }
    int subBlockLength() const noexcept { return subLen; }

    // K-weighting design (stage 1 shelf, stage 2 high-pass) for sample rate fs, and its magnitude in dB at f Hz.
    static void designKWeighting(double fs, Biquad& shelf, Biquad& highpass);
    static double kWeightingMagnitudeDb(double fs, double f);

private:
    void endSubBlock() noexcept;
    void updateIntegrated() noexcept;

    double fs = 48000.0;
    int numChannels = 2;
    int subLen = 4800;
    int subPos = 0;
    std::array<Biquad, kMaxChannels> shelfF{}, hpF{};
    std::array<double, kMaxChannels> weight{};
    std::array<double, kMaxChannels> acc{};             // Σ y² of the running sub-block, per channel
    std::array<double, kShortTermSubBlocks> subEnergy{};  // Σ_i G_i Σ y_i² per finished sub-block (ring)
    int subHead = 0;          // next write slot in subEnergy
    std::uint64_t subCount = 0;
    double runPeak = 0.0;     // |x| max of the running sub-block
    double peakAll = 0.0;     // since reset
    double peakDispLin = 0.0;
    double peakFallPerSub = 1.0;

    std::vector<std::uint64_t> histCount;  // allocated in prepare
    std::vector<double> histEnergy;
    std::uint64_t blocksTotal = 0;
    double energyTotal = 0.0;

    std::atomic<float> mom{-std::numeric_limits<float>::infinity()};
    std::atomic<float> st{-std::numeric_limits<float>::infinity()};
    std::atomic<float> integ{-std::numeric_limits<float>::infinity()};
    std::atomic<float> peak{-std::numeric_limits<float>::infinity()};
    std::atomic<float> peakDisp{-std::numeric_limits<float>::infinity()};
};

} // namespace pf
