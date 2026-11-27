// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — PHASE MATCH: estimate the frequency-dependent phase difference between the dominant (sidechain, e.g.
// kick) and the submissive (main, e.g. bass) signal and apply a unity-magnitude phase-correction FIR to the main signal,
// so that their summed low end cancels less. JUCE-free, C++20.
//
// ─── What it does (and what it does not)
// * estimate(): STFT cross-spectrum G(f) = E[D(f)·conj(S(f))] over frames where both signals are active, magnitude-
//   squared coherence, 1/6-octave complex smoothing, φ(f) = arg G. φ > 0 means the dominant leads; the correction adds
//   φ to the submissive's phase. Regularized (coherence/energy weighting, careful unwrapping, magnitude limit, group-
//   delay limit, fades) so the correction is a stable, realizable filter.
// * The correction is a single static filter. It can only help where the two signals are COHERENT (layered/derived
//   sounds, same sample, bleed, a bass that follows the kick's pitch). Two independent sources (a kick and an unrelated
//   bass line) have low coherence → Status::Unrelated and no correction: a static filter cannot fix random phase.
//   It never removes cancellation completely: resolution below ~40 Hz is limited by the 170 ms analysis frame and by
//   the ±25 ms kernel, and the group-delay limit keeps it from fully inverting steep phase features.
// * Latency is identical to the FIR phase rotator: Hs + 128 (Hs = round(0.025·fs)); kernel length 2·Hs+1, centered.
//
// ─── Threading contract
// * estimate() and designCorrection() are const/static and allocate: background thread only.
// * prepare()/reset() must not run concurrently with process() or setCorrection().
// * setCorrection()/clearCorrection() (message/background thread, serialized internally by a mutex) design the kernel,
//   transform it and hand it to the audio thread lock-free (3 kernel slots + one atomic index; the writer never touches
//   a slot the audio thread may read and never waits for the audio thread).
// * process() never allocates, locks or waits. A new kernel is picked up at the next 128-sample partition boundary and
//   crossfaded old→new over 20 ms (raised cosine, both kernels run on the same input history). A crossfade between two
//   kernels whose phases differ a lot at some frequency dips that frequency briefly (≤ 20 ms); it does not click.
//
// ─── Caller rules
// * setCorrection() refuses (returns false, nothing changes) unless e.status == Status::Ok. The UI must not offer
//   "apply" for NotEnoughAudio / Unrelated; estimate() returns zero correction for those.
// * `aggressive` = the correction is likely to change the sound audibly (smearing / pre-ringing). Thresholds:
//     - groupDelaySpreadMs > 3 ms in [lo, hi]                                   (kAggressiveSpreadMs)
//     - a narrow-band correction: max |wrapped correction| > 90° and the region where it exceeds 45° is < 1 octave wide
//     - pre-ringing: of the kernel's response band-limited to [lo, hi], the share of energy arriving > 2 ms before the
//       main tap exceeds that of the band-limited identity by more than −15 dB (≈ 3 %) of the band energy
//       (kAggressivePreMs / kAggressivePreDb). Measured in band so it does not depend on fs or on how much of the
//       spectrum lies outside the band.
//   `aggressiveReasons` says which (bit 0 spread, bit 1 narrow band, bit 2 pre-ringing).
#pragma once

#include "Common.h"

#include <array>
#include <atomic>
#include <complex>
#include <mutex>
#include <vector>

namespace pf {

struct PhaseMatchEstimate {
    enum class Status { Ok, NotEnoughAudio, Unrelated } status = Status::NotEnoughAudio;
    // smoothed estimate on a log grid (kGridPoints points, loHz..hiHz)
    std::vector<float> hz, phaseDeg, coherence;  // phaseDeg = measured φ = arg G (unwrapped, lowest reliable point in ±180°)
    double confidence = 0;          // 0..1: energy-weighted mean coherence in band × data-amount factor
    double maxCorrectionDeg = 0;    // max |correction| actually applied in band at blend 1 (wrapped, ≤ 180°)
    double groupDelaySpreadMs = 0;  // max−min group delay of the realized correction in band — smearing indicator
    bool aggressive = false;        // see thresholds above

    // ── extensions (filled by estimate(), consumed by setCorrection())
    std::vector<float> correctionDeg;  // regularized correction at blend 1 on `hz` (zeros unless Ok); unwrapped
    std::vector<float> weight;         // 0..1 reliability per point = energy × coherence × (not leakage) weights
    double loHz = 0, hiHz = 0, fs = 0;
    int activeFrames = 0, totalFrames = 0;
    unsigned aggressiveReasons = 0;    // bit 0 spread, bit 1 narrow band, bit 2 pre-ringing
    // realized blend-1 kernel (at the estimate's fs)
    double realizedMagDevDb = 0;       // max | |H| in dB | over 20 Hz–20 kHz
    double realizedPhaseErrDeg = 0;    // max |realized − target| phase in [lo, hi]
    double realizedPhaseErrRmsDeg = 0;
    double preRingDb = -60;            // excess in-band energy > 2 ms before the main tap (dB of band energy; −60 = none)
    double groupDelayLimitMs = 0;      // slope limit that was finally used
};

// Result of the FIR design (also usable by the UI to draw the realized curve).
struct PhaseMatchDesign {
    std::vector<double> h;        // 2·hs+1 taps, main tap at index hs
    int hs = 0;
    double fs = 0;
    double groupDelayLimitMs = 0; // slope limit finally used (reduced automatically until |H| is within ±0.5 dB)
    double magDevDb = 0;          // max | |H| in dB | over 20 Hz–min(20 kHz, 0.49·fs)
    bool magWithinSpec = false;   // magDevDb ≤ 0.5
    double phaseErrMaxDeg = 0, phaseErrRmsDeg = 0;  // realized vs regularized target in [lo, hi]
    double preRingDb = -60;       // see PhaseMatchEstimate::preRingDb
    double groupDelaySpreadMs = 0;// of the realized kernel in [lo, hi]
    double maxCorrectionDeg = 0;
    bool aggressive = false;
    unsigned aggressiveReasons = 0;
    // regularized target sampled back on the estimate grid (unwrapped degrees)
    std::vector<float> targetDeg;
};

class PhaseMatcher {
public:
    static constexpr int kBlock = 128;          // partition block B
    static constexpr int kGridPoints = 200;
    static constexpr double kHalfMs = 25.0;     // Hs = round(0.025·fs)
    // STFT frame: next power of two ≥ 0.25 s (341 ms @ 48 kHz, 371 ms @ 44.1 kHz), hop 1/4 (75 % overlap). 170 ms frames
    // were tried first: their ±11.7 Hz Hann main lobe biased the phase of a tonal kick by ~20° at 37 Hz (the 45 Hz
    // fundamental leaks into neighbouring bins); 341 ms halves the bias at the cost of fewer averages.
    static constexpr double kFrameSec = 0.25;
    static constexpr double kSmoothOct = 1.0 / 6.0;
    static constexpr double kGateRelDb = -45.0; // frame active if band energy ≥ loudest frame −45 dB (both signals)
    static constexpr double kGateAbsDb = -100.0;// … and band RMS ≥ −100 dBFS
    static constexpr int kMinActiveFrames = 8;
    static constexpr double kUnrelatedConfidence = 0.3;
    static constexpr double kRegSigmaOct = 1.0 / 12.0; // regularization kernel (log-frequency Gaussian σ)
    static constexpr double kPriorEps = 0.02;          // identity prior weight (re a fully reliable point)
    static constexpr double kMaxUnwrappedDeg = 360.0;  // |correction| limit (unwrapped, relative to identity at lo)
    static constexpr double kGroupDelayLimitMs = 7.5;  // initial slope limit |dφ/dω|
    static constexpr double kFadeOct = 0.5;     // above hi: cos fade over ½ oct to the nearest identity (k·360°);
                                                // below lo: linear-in-Hz ramp to 0° at DC (constant group delay)
    static constexpr double kHardOct = 1.0;     // identity enforced above hi·2^kHardOct (and at DC)
    static constexpr double kKaiserBeta = 2.5;
    static constexpr double kMagSpecDb = 0.5;
    static constexpr double kAggressiveSpreadMs = 3.0;
    static constexpr double kAggressivePreMs = 2.0;
    static constexpr double kAggressivePreDb = -15.0;
    static constexpr double kCrossfadeMs = 20.0;

    PhaseMatcher() = default;
    PhaseMatcher(const PhaseMatcher&) = delete;
    PhaseMatcher& operator=(const PhaseMatcher&) = delete;

    // offline, background thread: dominant = sidechain, submissive = main, mono, aligned, n samples (2–5 s)
    PhaseMatchEstimate estimate(const float* dominant, const float* submissive, int n, double fs,
                                double loHz, double hiHz) const;

    // FIR design from an estimate (blend scales the corrected phase). Background/message thread.
    static PhaseMatchDesign designCorrection(const PhaseMatchEstimate& e, double blend01, double fs);

    void prepare(double fs, int maxBlock, int numCh);  // allocates convolvers and kernel buffers
    void reset();
    int latency() const { return hs_ + kBlock; }       // Hs + 128

    // Message/background thread. Returns false (and changes nothing) if not prepared or e.status != Ok.
    bool setCorrection(const PhaseMatchEstimate& e, double blend01, PhaseMatchDesign* report = nullptr);
    void clearCorrection();                             // → pure delay (identity)

    void process(float* const* ch, int numCh, int n) noexcept;  // in place

    bool isCrossfading() const noexcept { return fading_; }    // audio thread / tests only

private:
    using cd = std::complex<double>;
    struct Pair {                 // two real channels packed into one complex stream (h is real → exact)
        std::vector<cd> X, acc, accB, in, outA, outB;
    };
    void publish(const std::vector<double>& h);
    void spectraOf(const std::vector<double>& h, std::vector<cd>& dst) const;
    void runBlock() noexcept;

    double fs_ = 0;
    int hs_ = 0, P_ = 1, N_ = 2 * kBlock, numCh_ = 0, pos_ = 0, head_ = 0;
    bool prepared_ = false;
    FFT fft_{8};
    std::vector<Pair> pairs_;
    std::array<std::vector<cd>, 3> slots_;
    std::vector<double> identity_;
    std::vector<float> fadeGain_;  // fadeLen_+1 values, 0 → 1
    int fadeLen_ = 1;

    // audio-thread state
    int cur_ = 0, nxt_ = -1, requested_ = -1, fadePos_ = 0;
    bool fading_ = false;

    // hand-over
    std::atomic<int> pending_{-1};
    std::mutex writerMtx_;
    int wCur_ = 0, wPrev_ = 1, lastPub_ = -1;  // writer-side view of slots the audio thread may use
};

} // namespace pf
