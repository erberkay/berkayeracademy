// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
// PHASEFORGE — the host-facing AudioProcessor. Wires parameters, threads and the JUCE-free DSP in Source/DSP/.
//
// ─── Audio thread (processBlock), per sub-block of ≤ 256 samples; no allocation / locks / I/O ────────────────────
//   in ─┬─ dry delay line (total latency) ─────────────────────────────────────────────────────┐ bypass crossfade
//       └─ input gain (smoothed 20 ms) → [capture: main post input gain + raw sidechain → AnalysisCapture]
//          → PHASE stage: Rotate (PhaseRotator, angle smoothed inside, phaseOn off → 0°)
//                         | Match (PhaseMatcher, last applied correction × blend; none/off → identity)
//          → DynamicEQ (12 nodes, sidechain delayed by the phase-stage latency so the detectors stay aligned)
//          → output gain (smoothed 20 ms) → bypass crossfade (10 ms) with the dry path → out
//   Delta: DynamicEQ's own latency-aligned dry (= the post-phase signal) − wet; the output gain applies to it too.
//   The audio thread only ever tryLocks `audioGuard` (a SpinLock held by prepare/reconfigure): when it cannot take
//   it the block is output silent instead of waiting.
//
// ─── Latency (fixed per (filterMode, phaseMode, fs); a band change never changes it) ─────────────────────────────
//   phase stage = Rotate+FIR: Hs + 128 | Rotate+IIR: 0 | Match (always FIR): Hs + 128        (Hs = round(25 ms · fs))
//   + DynamicEQ: FIR M/32 + M/2 (4352 @ 48 kHz) | IIR 0.      Total is reported with setLatencySamples().
//   Changing filterMode / phaseMode → full reconfigure; phaseRange / phaseLo / phaseHi → the rotator is redesigned
//   (no latency change). Both run on the message thread (AsyncUpdater) under prepareLock + suspendProcessing.
//
// ─── Analysis thread (juce::Thread, normal priority, ~4 ms sleep) ──────────────────────────────────────────────
//   pops the capture FIFO into FFTAnalyzer → publishes SpectrumFrame (mutex; the UI side only try_locks);
//   handles requestPhaseAnalysis() / requestResolveConflicts() and re-designs the Phase Match kernel when
//   matchBlend / phaseOn change. Results are never applied automatically except Resolve (as documented for FUSER:
//   "Resolve Conflicts" places the nodes) — the node parameters are written on the message thread.
//
// ─── Resolve → node thresholds ─────────────────────────────────────────────────────────────────────────────────
//   resolveConflicts() returns threshold = sidechain active band level − 6 dB. DynamicEQ (Sidechain mode) reaches its
//   full range only kFullRangeDb = 10 dB above the threshold (soft knee 4 dB), so at −6 dB it would apply about half
//   the suggested reduction on the hits. The processor therefore writes threshold = suggestion − 6 dB, i.e. sidechain
//   active band level − 12 dB, so a node reaches its full range on the hits.
#pragma once

#include "DSP/ConflictDetector.h"
#include "DSP/DynamicEQ.h"
#include "DSP/FFTAnalyzer.h"
#include "DSP/LockFree.h"
#include "DSP/LoudnessMeter.h"
#include "DSP/PhaseAnalyzer.h"
#include "DSP/PhaseMatcher.h"
#include "DSP/PhaseRotator.h"
#include "Parameters/ParameterLayout.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <array>
#include <atomic>
#include <mutex>

namespace pf {

struct MeterReadout {
    float peakDb = -150.f;       // sample peak, display (falls 20 dB/s)
    float momentary = -150.f;    // LUFS (−inf → −150)
    float shortTerm = -150.f;
    float integrated = -150.f;
};

enum class AnalysisState { Idle, Waiting, Done };

// Phase Analyze / Phase Match result (published by the analysis thread, read on the message thread).
struct PhaseResult {
    enum class Status { Ok, NotEnoughAudio, Silent, Unrelated, Inconsistent, NoSidechain };
    std::uint64_t id = 0;          // increments when a new result is finished
    AnalysisState state = AnalysisState::Idle;
    float progress = 0.f;          // 0..1 while Waiting (captured audio / 3 s)
    bool match = false;            // false: Phase Rotate result (rotate), true: Phase Match result (estimate)
    int filterMode = 1;            // filter mode at request time (0 IIR, 1 FIR); a Rotate angle is only valid for it
    Status status = Status::NotEnoughAudio;
    double seconds = 0;            // audio analysed
    double loHz = 20, hiHz = 200;  // band used
    double gainOffsetDb = 0;       // Gain Stage Fix used
    // Rotate (PhaseAnalyzer)
    double angleDeg = 0, confidence = 0, score = 0, scoreAt0 = 0, sumGainDb = 0;
    std::vector<float> curve;      // 361 scores, −180..180°
    PhaseAnalysis rotate;          // full analyzer output (diagnostics)
    // Match (PhaseMatcher::estimate)
    PhaseMatchEstimate estimate;
    bool aggressive = false;
    bool applied = false;          // applyPhaseResult() succeeded for this id
};

struct ResolveResult {
    enum class Status { Ok, NoConflict, NoSidechain, NotEnoughAudio };
    std::uint64_t id = 0;
    AnalysisState state = AnalysisState::Idle;
    float progress = 0.f;
    Status status = Status::NotEnoughAudio;
    int framesUsed = 0;
    double sensitivityDb = 0, gainOffsetDb = 0;
    std::vector<NodeSuggestion> nodes;   // as returned by resolveConflicts() (threshold = band level − 6 dB)
    bool applied = false;
};

// ── UI-facing compatibility types (the editor is written against these)
struct PhaseUiResult {                 // published by the analysis thread
    int status = -1;                   // -1 none yet, else (int) pf::PhaseAnalysis::Status (rotate) / PhaseMatchEstimate::Status (match)
    bool isMatch = false;
    double angleDeg = 0, confidence = 0, score = 0, scoreAt0 = 0, sumGainDb = 0;
    std::vector<float> curve;          // 361 rotate scores (-180..180), empty for match
    std::vector<float> matchHz, matchCorrectionDeg;
    bool aggressive = false;
    int serial = 0;                    // increments on each new result
};
struct MeterUi { float peakDb = -100, momentary = -100, shortTerm = -100, integrated = -100; };

class PhaseForgeProcessor : public juce::AudioProcessor,
                            private juce::AudioProcessorValueTreeState::Listener,
                            private juce::AsyncUpdater {
public:
    static constexpr int kStateVersion = 1;
    static constexpr int kSubBlock = 256;
    static constexpr double kBypassFadeMs = 10.0;
    static constexpr double kGainSmoothMs = 20.0;
    static constexpr double kHistorySeconds = 6.0;
    static constexpr double kPhaseWaitSeconds = 3.0;   // audio needed after requestPhaseAnalysis()
    static constexpr double kPhaseMinSeconds = 2.0;    // … or this much when the audio stops
    static constexpr double kPhaseMaxSeconds = 5.0;
    static constexpr double kResolveSeconds = 3.0;
    static constexpr double kResolveThresholdShiftDb = -6.0;  // see header comment

    PhaseForgeProcessor();
    ~PhaseForgeProcessor() override;

    // ── juce::AudioProcessor
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    void processBlockBypassed(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using juce::AudioProcessor::processBlock;
    using juce::AudioProcessor::processBlockBypassed;
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }
    const juce::String getName() const override { return "PHASEFORGE"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    juce::AudioProcessorParameter* getBypassParameter() const override;
    int getNumPrograms() override;
    int getCurrentProgram() override { return currentProgram; }
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int, const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // ── parameters (the UI attaches to these). `undo` is the apvts undo manager (declared first: init order).
    juce::UndoManager undo;
    juce::AudioProcessorValueTreeState apvts;

    // ── UI API (editor contract; all message-thread safe, none of them blocks the audio thread)
    bool sidechainConnected() const noexcept { return sidechainBusActive(); }
    bool getSpectrum(SpectrumFrame& out) const;     // copy of the latest frame; false if none yet (or lock busy)
    MeterUi meter(int which) const noexcept;        // 0 input, 1 output, 2 sidechain
    bool phaseAnalysisPending() const;
    PhaseUiResult phaseResult() const;
    void requestResolve() { requestResolveConflicts(); }
    bool resolvePending() const;
    bool isB() const noexcept { return isSlotBActive(); }
    int latencyMs10() const noexcept;               // reported latency in 0.1 ms units

    // ── status (any thread)
    bool sidechainBusActive() const noexcept { return scBusActive.load(std::memory_order_relaxed); }  // bus enabled + channels delivered (last block)
    bool sidechainSignalPresent() const noexcept { return scSignal.load(std::memory_order_relaxed); } // analyzer saw sidechain signal (last 5 s)
    int phaseStageLatency() const noexcept { return latPhase.load(std::memory_order_relaxed); }
    int dynamicEqLatency() const noexcept { return latDyn.load(std::memory_order_relaxed); }
    double currentSampleRate() const noexcept { return sr.load(std::memory_order_relaxed); }
    // band the phase stage uses: phaseRange 0..2 → preset (20–200, 200–2000, 2000–16000 Hz), 3 Custom → phaseLo/phaseHi
    // (hi forced ≥ 1.25·lo, both clamped below Nyquist)
    void effectiveBandHz(double& lo, double& hi) const;

    // ── spectrum (UI thread; never blocks: returns false when nothing newer than `version` or the lock is busy)
    bool getSpectrum(SpectrumFrame& dst, std::uint64_t& version) const;

    // ── meters (any thread)
    MeterReadout inputMeter() const noexcept { return readMeter(inMeter); }       // main, post input gain
    MeterReadout outputMeter() const noexcept { return readMeter(outMeter); }
    MeterReadout sidechainMeter() const noexcept { return readMeter(scMeter); }
    void resetIntegratedLoudness() noexcept { meterResetRequest.store(true); }   // applied by the audio thread
    float nodeReductionDb(int node) const noexcept { return dyn.reductionDb(node); }          // ≥ 0 dB
    float totalReductionDbAt(float hz) const noexcept { return dyn.totalReductionDbAt(hz); }  // UI overlay

    // ── Phase Analyze / Match (message thread). Uses the phase mode and filter mode selected at request time.
    //    Rotate + Zero Latency IIR: status from PhaseAnalyzer, angle re-optimised for the actual IIR network (it is not
    //    a pure rotation, see iirOptimalAngle in the .cpp); the IIR angle differs from the FIR (pure rotation) angle.
    void requestPhaseAnalysis();
    void cancelPhaseAnalysis();
    PhaseResult getPhaseResult() const;
    std::uint64_t phaseResultId() const noexcept { return phaseId.load(); }
    // Rotate: writes phaseAngle (and phaseOn = true). Match: stores the estimate and applies it × matchBlend.
    // Only when the result status is Ok — and, for Rotate, only while the filter mode is still the one analysed
    // (the IIR and FIR angles differ); returns false otherwise.
    bool applyPhaseResult();
    bool hasMatchCorrection() const;
    PhaseMatchEstimate getMatchEstimate() const;   // the applied estimate (status NotEnoughAudio when none)
    PhaseMatchDesign getMatchDesign() const;       // realised kernel report of the current correction (UI curve)
    void clearMatchCorrection();

    // ── Resolve Conflicts (message thread). The suggestion is written into nodes 1..8 when it is ready
    //    (others switched off) — automatically on the message thread, or call applyResolveResult() yourself.
    void requestResolveConflicts();
    void cancelResolveConflicts();
    ResolveResult getResolveResult() const;
    bool applyResolveResult();
    bool autoApplyResolve = true;

    // ── Delta audition of one node (UI, e.g. while hovering/holding a node). −1 = none.
    //    Priority: an auditioned node beats the global Delta parameter.
    void setDeltaAudition(int nodeIndex) noexcept { deltaAudition.store(juce::jlimit(-1, id::kNodes - 1, nodeIndex)); }
    int getDeltaAudition() const noexcept { return deltaAudition.load(); }

    // ── A/B (message thread). Two full snapshots (parameters + Phase Match estimate). copy = active → inactive.
    bool isSlotBActive() const noexcept { return slotBActive; }
    void toggleAB();
    void copyActiveToInactive();

    // ── presets
    static juce::StringArray factoryPresetNames();
    static juce::File userPresetDirectory();     // <user app data>/BE Akademi/PHASEFORGE/Presets
    bool savePresetFile(const juce::File& file, const juce::String& name = {});
    bool loadPresetFile(const juce::File& file);

    // ── UI selection etc. (saved with the session, not part of A/B or presets)
    void setUiProperty(const juce::Identifier& key, const juce::var& v);
    juce::var getUiProperty(const juce::Identifier& key, const juce::var& def = {}) const;

    // ── snapshots (message thread; also used by tests)
    juce::ValueTree snapshot() const;            // parameters + match estimate
    void restore(const juce::ValueTree& t);      // sets EVERY parameter explicitly (missing → default)

    // Runs deferred message-thread work now (reconfigure, Resolve apply). Tests / hosts without a message loop.
    void processPendingWork() { handleUpdateNowIfNeeded(); }
    // Analysis thread work: true when no request is pending (tests poll this).
    bool analysisIdle() const;

private:
    struct DelayLine {
        std::vector<float> buf[2];
        std::int64_t mask = 0, w = 0;
        void prepare(int maxDelay);
        void clear();
        // writes in[c][i], outputs the value written `delay` samples earlier (delay ≤ prepared maximum)
        void process(const float* const* in, float* const* out, int numCh, int n, int delay) noexcept;
    };
    struct Config {
        int filterMode = 1, phaseMode = 0;
        double lo = 20, hi = 200;
    };
    class Worker : public juce::Thread {
    public:
        explicit Worker(PhaseForgeProcessor& p) : juce::Thread("PHASEFORGE analysis"), owner(p) {}
        void run() override;
    private:
        PhaseForgeProcessor& owner;
    };

    void parameterChanged(const juce::String& paramID, float newValue) override;
    void handleAsyncUpdate() override;
    Config currentConfig() const;
    void prepareInternal(double fs, int block);
    void reconfigureIfNeeded();
    void process(juce::AudioBuffer<float>& buffer, bool forceBypass) noexcept;
    float pv(const juce::String& pid) const;     // raw parameter value
    void setParam(const juce::String& pid, float value);  // host-notifying, with gesture
    static MeterReadout readMeter(const LoudnessMeter& m) noexcept;

    // analysis thread
    void analysisStep();
    void pumpCapture();
    void phaseStep();
    void resolveStep();
    void runPhaseAnalysis(int frames);
    void finishResolve(bool enough);
    void updateMatcherLocked();                  // matcherMutex held
    void markMatcherDirty() noexcept { matcherDirty.store(true); worker.notify(); }

    // state helpers
    juce::ValueTree estimateToTree(const PhaseMatchEstimate& e) const;
    static bool treeToEstimate(const juce::ValueTree& t, PhaseMatchEstimate& e);

    // ── DSP (audio thread after prepare)
    PhaseRotator rotator;
    PhaseMatcher matcher;
    PhaseMatcher estimator;   // analysis thread only (estimate() is const and allocates; never prepared)
    DynamicEQ dyn;
    LoudnessMeter inMeter, outMeter, scMeter;
    AnalysisCapture capture;
    DelayLine dryDelay, scDelay;
    juce::AudioBuffer<float> dryBuf, scBuf;
    juce::SmoothedValue<float> inGainSm, outGainSm;
    double bypassGain = 0.0, bypassStep = 0.0;
    std::atomic<bool> meterResetRequest{false};

    // prepared configuration (changed only under audioGuard)
    Config prep;
    bool prepared = false;
    int latPhaseSamples = 0, latTotalSamples = 0;
    double preparedFs = 0;
    int preparedMainCh = 0, preparedScCh = -1;
    int maxBlockSize = 512;
    std::atomic<double> sr{48000.0};
    std::atomic<int> latPhase{0}, latDyn{0};
    std::atomic<bool> scBusActive{false}, scSignal{false};
    std::atomic<int> deltaAudition{-1};

    // raw parameter pointers (read on the audio thread)
    std::atomic<float>* pInGain = nullptr, * pOutGain = nullptr, * pMix = nullptr, * pBypass = nullptr, * pDelta = nullptr;
    std::atomic<float>* pPhaseOn = nullptr, * pAngle = nullptr, * pDynMode = nullptr, * pScOn = nullptr;
    std::atomic<float>* pFixMain = nullptr, * pFixSc = nullptr, * pSens = nullptr;
    struct NodePtrs { std::atomic<float>* on, * freq, * range, * thr, * q, * att, * rel, * ch, * byp, * solo; };
    std::array<NodePtrs, id::kNodes> pNode{};

    // locks: prepareLock → analysisMutex → matcherMutex → audioGuard (always in this order)
    juce::CriticalSection prepareLock;
    std::mutex analysisMutex;
    mutable std::mutex matcherMutex;
    juce::SpinLock audioGuard;

    // analysis thread state (analysisMutex)
    FFTAnalyzer analyzer;
    SpectrumAccumulator accumulator;
    std::vector<float> popBuf[kCaptureChannels];
    std::uint64_t lastFrameCount = 0;
    std::atomic<bool> phaseRequest{false}, phaseCancel{false}, resolveRequest{false}, resolveCancel{false};
    std::atomic<std::uint64_t> phaseRequestFrame{0};
    std::atomic<int> phaseRequestMode{0}, phaseRequestFilter{1};
    bool phaseWaiting = false, resolveWaiting = false;
    std::uint64_t phaseStart = 0, phaseLastWritten = 0;
    double phaseLastProgressMs = 0, resolveLastProgressMs = 0;
    int resolveLastFrames = 0, phaseMode = 0, phaseFilterMode = 1;

    // published results
    mutable std::mutex resultMutex;
    PhaseResult phaseRes;
    ResolveResult resolveResult;
    std::atomic<std::uint64_t> phaseId{0}, resolveId{0};
    std::atomic<bool> resolveReady{false};
    mutable std::mutex spectrumMutex;
    SpectrumFrame published;
    std::uint64_t publishedVersion = 0;

    // Phase Match correction (matcherMutex)
    PhaseMatchEstimate matchEst;
    bool hasMatch = false;
    std::uint64_t matchEstId = 0;
    struct Applied { bool on = false; float blend = -1.f; std::uint64_t est = 0; bool valid = false; } matchApplied;
    PhaseMatchDesign matchDesign;
    std::atomic<bool> matcherDirty{false};

    // A/B, UI, programs (message thread)
    juce::ValueTree slotA, slotB;
    bool slotBActive = false;
    mutable juce::CriticalSection uiLock;
    juce::ValueTree uiState{"UI"};
    int currentProgram = 0;

    Worker worker{*this};

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PhaseForgeProcessor)
};

}  // namespace pf
