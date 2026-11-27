// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — STFT spectrum analyzer for main + sidechain, Mid/Side per pair (analysis thread only, JUCE-free).
//
// STFT: periodic Hann window, N = 2^fftOrder, hop = N/4 (75 % overlap). Per pair M = (L+R)/2, S = (L−R)/2; Mid and
// Side share one complex FFT (z = M + jS, separated by conjugate symmetry), so a frame costs 2 complex FFTs.
//
// Display level of point i (frequency f_i, log-spaced 20 Hz … min(20 kHz, 0.49·fs)) = weighted band power
//   P_i = Σ_k K_i(k)·|X_k|² / G_i
// K_i = Tukey kernel in FFT bins around c_i = f_i/Δf: flat for |k − c_i| ≤ a, raised-cosine taper of length b, with
//   W = 1/6-octave width in bins = f_i·(2^(1/12) − 2^(−1/12))/Δf,  a = clamp((W − 3)/2, 0, 1.5),  b = max(3, W − 2a)
//   → equivalent noise bandwidth 2a + b = W (1/6 octave) wherever W ≥ 3 bins, never narrower than 3 bins (the Hann
//   main lobe is 4 bins wide), and always a curved top so a tone gives a unique maximum at its own frequency.
// G_i = response of K_i to the analytic Hann spectrum of a sine exactly at f_i (relative to its total power), so a
//   sine of peak amplitude A at a display frequency reads 20·log10(A) dBFS exactly (full-scale sine = 0 dBFS); a sine
//   between display points or between bins reads within ≈0.1 dB (measured, see tests). Normalisation uses Parseval
//   with the window's Σw². Broadband signals read as 1/6-octave band levels (3-bin bands at the lowest frequencies).
// Floor kFloorDb (−150 dB) stands for "silence".
// Limitation: below ≈ 2 bins (e.g. < 100 Hz at N = 1024 / 96 kHz) the negative-frequency image of a tone interferes
// with its positive lobe; levels there are not reliable at small FFT sizes (the default sizes avoid this).
// Time ballistics (display frame only): per point in dB, y += (x − y)·(1 − e^(−Δt/τ)), τ = attack when rising,
// release when falling, Δt = hop/fs.
//
// Two frames per hop:
//   frame()  — ballistic-smoothed display frame, conflict computed on it, peaks marked.
//   raw      — frequency-smoothed but not time-smoothed; given to an attached SpectrumAccumulator (learn mode).
// Conflict math lives in ConflictDetector.h (computeConflict / resolveConflicts).
#pragma once

#include "Common.h"

#include <complex>
#include <cstdint>
#include <memory>
#include <vector>

namespace pf {

constexpr float kFloorDb = -150.0f;

struct SpectrumFrame {
    std::vector<float> hz;                                // display points, log-spaced
    std::vector<float> mainMid, mainSide, scMid, scSide;  // dBFS (band power, see above)
    std::vector<float> conflictMid, conflictSide;         // 0..1
    std::vector<int> peaksMain, peaksSc;                  // indices of prominent peaks (Mid+Side power), loudest first
    bool hasSidechain = false;  // a sidechain pointer was fed AND it carried signal (|x| > 1e-9) within the last 5 s
    float binHz = 0.0f;  // FFT bin spacing fs/N of the analyzer that made the frame (0 = unknown)
    // Levels while the sidechain is active (sidechain-power-weighted average, dB). Filled only by
    // SpectrumAccumulator::average(); empty in the analyzer's own frames. resolveConflicts() prefers them.
    std::vector<float> mainMidActive, mainSideActive, scMidActive, scSideActive;
};

class ConflictDetector;
class SpectrumAccumulator;

// Prominent peaks of the Mid+Side power sum: local maximum within ±1/6 oct, ≥ 6 dB above the higher of the two
// minima within ±max(1/2 oct, 5 bins) (a side cut off by the grid edge is ignored), within 60 dB of the spectrum
// maximum and above −120 dBFS. Loudest first, at most maxPeaks. binHz = FFT bin spacing (0 = ignore the bin rule).
void findSpectralPeaks(const std::vector<float>& hz, const std::vector<float>& mid, const std::vector<float>& side,
                       std::vector<int>& out, int maxPeaks = 16, float binHz = 0.0f);

class FFTAnalyzer {
public:
    static constexpr int kMaxPeaks = 16;

    FFTAnalyzer();
    ~FFTAnalyzer();
    FFTAnalyzer(const FFTAnalyzer&) = delete;
    FFTAnalyzer& operator=(const FFTAnalyzer&) = delete;

    static int defaultFftOrder(double fs) noexcept { return fs > 50000.0 ? 13 : 12; }  // 4096 @ 44.1/48 k, 8192 @ 88.2 k+

    // fftOrder ≤ 0 → defaultFftOrder(fs); otherwise clamped to 10..13 (1024 … 8192).
    void prepare(double fs, int fftOrder = 0, int points = 400);
    void reset();  // clears audio history and ballistics (keeps the configuration)

    // Consume new audio (any pointer may be nullptr = silence; scL == scR == nullptr = no sidechain connected).
    // Produces one frame per completed hop.
    void feed(const float* mainL, const float* mainR, const float* scL, const float* scR, int n);

    const SpectrumFrame& frame() const noexcept { return disp; }
    const SpectrumFrame& rawFrame() const noexcept { return raw; }
    std::uint64_t framesProduced() const noexcept { return frameCount; }

    void setGainOffsetDb(float mainMinusScDb) noexcept { gainOffsetDb = mainMinusScDb; }
    // Conflict Sensitivity X (0…9 dB) as the target gap of the conflict math (default 3 dB).
    void setTargetGapDb(float x) noexcept;
    float targetGapDb() const noexcept;
    float gainOffset() const noexcept { return gainOffsetDb; }
    void setBallistics(float attackMs, float releaseMs) noexcept;
    // When set, every hop's raw frame (with conflict) is added to it. Not owned. nullptr detaches.
    void setAccumulator(SpectrumAccumulator* a) noexcept { accumulator = a; }

    int fftSize() const noexcept { return N; }
    int hopSize() const noexcept { return hop; }
    double sampleRate() const noexcept { return fs; }

private:
    void runFrame();
    void bandLevels(const std::vector<std::complex<double>>& Z, std::vector<float>& mid, std::vector<float>& side);

    double fs = 48000.0;
    int order = 12, N = 4096, hop = 1024, numPoints = 400;
    FFT fft{12};
    std::vector<double> window;
    double normPow = 1.0;  // converts Σ|X|² over a band to sine-amplitude² (4 / (N·Σw²))
    // input history: 4 channels, ring of N samples each
    std::vector<float> ring[4];
    int ringPos = 0;
    int sinceHop = 0;
    std::uint64_t samplesSeen = 0;
    std::uint64_t lastScSample = 0;   // sample index of the last non-silent sidechain input
    bool scConnected = false;
    std::vector<std::complex<double>> zMain, zSc;
    std::vector<double> pM, pS;       // per-bin power scratch
    // display point i → bins kStart[i] … kStart[i] + kCount[i] − 1, weights at wOff[i] in kw (already divided by G_i)
    std::vector<int> kStart, kCount, wOff;
    std::vector<float> kw;

    SpectrumFrame raw, disp;
    bool dispInit = false;
    float attackMs = 5.0f, releaseMs = 300.0f;
    double aAtt = 1.0, aRel = 0.1;
    float gainOffsetDb = 0.0f;
    std::uint64_t frameCount = 0;
    SpectrumAccumulator* accumulator = nullptr;
    std::unique_ptr<ConflictDetector> conflict;
    std::vector<float> scratchA, scratchB;
};

} // namespace pf
