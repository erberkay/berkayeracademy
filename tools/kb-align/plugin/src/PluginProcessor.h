// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#pragma once

#include "engine/Engine.h"

#include <chrono>
#include <thread>

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>

namespace kb {

namespace pid {
inline constexpr const char* mode = "mode";
inline constexpr const char* autoTarget = "autoTarget";
inline constexpr const char* predelay = "predelay";
inline constexpr const char* phase = "phase";
inline constexpr const char* search = "search";
inline constexpr const char* latency = "latencyMode";
inline constexpr const char* crossover = "crossover";
inline constexpr const char* fc = "fc";
inline constexpr const char* learnHits = "learnHits";
inline constexpr const char* winStart = "winStart";
inline constexpr const char* winMs = "winMs";
inline constexpr const char* scOffset = "scOffset";
inline constexpr const char* trigHz = "trigHz";
inline constexpr const char* bassMono = "bassMono";
inline constexpr const char* monoHz = "monoHz";
inline constexpr const char* monoWidth = "monoWidth";
inline constexpr const char* duck = "duck";
inline constexpr const char* duckDepth = "duckDepth";
inline constexpr const char* duckLen = "duckLen";
inline constexpr const char* duckSync = "duckSync";
inline constexpr const char* duckBeats = "duckBeats";
inline constexpr const char* duckTarget = "duckTarget";
inline constexpr const char* listen = "listen";
inline constexpr const char* bypass = "bypass";
inline constexpr const char* contRate = "contRate";
inline constexpr const char* polarity = "polarity";
inline constexpr const char* outGain = "outGain";
} // namespace pid

class AnalysisThread : public juce::Thread {
public:
    explicit AnalysisThread(AlignEngine& a) : juce::Thread("KB-Align analiz"), align(a) {}
    void run() override {
        while (!threadShouldExit()) {
            align.step();
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }
private:
    AlignEngine& align;
};

class KBAlignProcessor : public juce::AudioProcessor, private juce::AudioProcessorValueTreeState::Listener {
public:
    static constexpr int kStateVersion = 1;

    KBAlignProcessor();
    ~KBAlignProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }
    const juce::String getName() const override { return "KB-Align"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    juce::AudioProcessorParameter* getBypassParameter() const override { return apvts.getParameter(pid::bypass); }

    int getNumPrograms() override;
    int getCurrentProgram() override { return currentProgram; }
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // UI erişimi
    juce::AudioProcessorValueTreeState apvts;
    juce::UndoManager undo;
    AudioEngine engine;
    AlignEngine align;
    std::vector<CurvePoint> curve = placeholderCurve();  // mesaj thread'i düzenler
    void setCurve(const std::vector<CurvePoint>& c);
    void startLearn() { align.startLearn(); }
    std::optional<std::pair<double, double>> learned;  // Learn sonucu (durumla kaydedilir)
    void pollLearn();  // mesaj thread'i (editör zamanlayıcısı)
    bool sidechainConnected() const { return scConnected.load(); }
    double currentSampleRate() const { return sr; }
    // A/B
    juce::ValueTree slotA, slotB;
    bool slotBActive = false;
    void toggleAB();
    void copyAtoB();
    juce::ValueTree snapshot();
    void restore(const juce::ValueTree& t);

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout();

private:
    void parameterChanged(const juce::String& id, float v) override;
    void pushAlignSettings();
    void reconfigure();  // gecikme modu / crossover değişti
    BlockParams makeBlockParams(juce::AudioPlayHead* ph, int n);

    AnalysisThread thread{align};
    double sr = 48000;
    int maxBlock = 512, numCh = 2;
    std::atomic<bool> scConnected{false};
    std::atomic<bool> needReconfigure{false};
    int currentProgram = 0;
    std::vector<CurvePoint> curveAudio = placeholderCurve();  // ses thread'i kopyası
    std::atomic<bool> curveDirty{true};
    std::array<CurvePoint, kMaxCurvePoints> curveLocal{};
    int curveLocalN = 0;
    juce::SpinLock curveLock;
    LatencyMode preparedLm = LatencyMode::Full;
    bool preparedXover = true;
};

} // namespace kb
