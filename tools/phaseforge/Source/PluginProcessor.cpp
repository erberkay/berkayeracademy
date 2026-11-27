// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
#include "PluginProcessor.h"
#include "PluginEditor.h"

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <map>

namespace pf {

namespace {
double nowMs() {
    return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now().time_since_epoch()).count();
}
float finiteOr(float v, float def) { return std::isfinite(v) ? v : def; }

// ───────────────────────────── factory presets (ids → plain values; everything else = default)
struct FactoryPreset {
    const char* name;
    std::vector<std::pair<juce::String, float>> v;
};
struct NodeSpec { float freq, range, thr, q, att, rel; int ch; };
void addNode(std::vector<std::pair<juce::String, float>>& v, int i, const NodeSpec& n) {
    v.push_back({id::node(i, "on"), 1.f});
    v.push_back({id::node(i, "freq"), n.freq});
    v.push_back({id::node(i, "range"), n.range});
    v.push_back({id::node(i, "thr"), n.thr});
    v.push_back({id::node(i, "q"), n.q});
    v.push_back({id::node(i, "att"), n.att});
    v.push_back({id::node(i, "rel"), n.rel});
    v.push_back({id::node(i, "ch"), (float) n.ch});
}
const std::vector<FactoryPreset>& factory() {
    static const std::vector<FactoryPreset> f = [] {
        std::vector<FactoryPreset> p;
        p.push_back({"Default", {}});
        {   // kick fundamental + first harmonic, mid only, low-end phase band
            FactoryPreset x{"Kick & Bass \xe2\x80\x94 Low End", {{id::phaseRange, 0.f}, {id::phaseOn, 1.f}, {id::sensitivity, 3.f}}};
            addNode(x.v, 0, {55.f, 6.f, -30.f, 1.4f, 10.f, 150.f, 1});
            addNode(x.v, 1, {110.f, 4.f, -30.f, 2.0f, 8.f, 120.f, 1});
            p.push_back(x);
        }
        p.push_back({"Kick & Bass \xe2\x80\x94 Phase Only", {{id::phaseRange, 0.f}, {id::phaseOn, 1.f}}});
        {
            FactoryPreset x{"Vocal Space (Mid)", {{id::phaseOn, 0.f}, {id::phaseRange, 1.f}, {id::sensitivity, 3.f}}};
            addNode(x.v, 0, {300.f, 3.f, -36.f, 1.0f, 5.f, 80.f, 1});
            addNode(x.v, 1, {1200.f, 4.f, -36.f, 1.2f, 3.f, 70.f, 1});
            addNode(x.v, 2, {3000.f, 4.f, -36.f, 1.5f, 2.f, 60.f, 1});
            p.push_back(x);
        }
        {
            FactoryPreset x{"Synth Layers (Side)", {{id::phaseOn, 0.f}, {id::phaseRange, 1.f}, {id::sensitivity, 4.5f}}};
            addNode(x.v, 0, {400.f, 3.f, -36.f, 0.8f, 5.f, 120.f, 2});
            addNode(x.v, 1, {2500.f, 4.f, -36.f, 1.0f, 5.f, 120.f, 2});
            addNode(x.v, 2, {6000.f, 3.f, -36.f, 1.0f, 5.f, 120.f, 2});
            p.push_back(x);
        }
        {
            FactoryPreset x{"Transparent Duck", {{id::dynMode, 1.f}, {id::mix, 0.85f}, {id::phaseOn, 0.f}}};
            addNode(x.v, 0, {60.f, 4.f, -30.f, 1.0f, 15.f, 200.f, 0});
            addNode(x.v, 1, {120.f, 3.f, -30.f, 1.4f, 12.f, 160.f, 0});
            p.push_back(x);
        }
        return p;
    }();
    return f;
}

juce::String floatsToText(const std::vector<float>& v) {
    juce::String s;
    s.preallocateBytes(v.size() * 14);
    char tmp[32];
    for (size_t i = 0; i < v.size(); ++i) {
        std::snprintf(tmp, sizeof(tmp), i ? " %.9g" : "%.9g", (double) v[i]);
        s += tmp;
    }
    return s;
}
bool textToFloats(const juce::String& s, std::vector<float>& out) {
    out.clear();
    const std::string str = s.toStdString();
    const char* p = str.c_str();
    char* end = nullptr;
    while (*p != 0) {
        while (*p == ' ') ++p;
        if (*p == 0) break;
        const float v = std::strtof(p, &end);
        if (end == p || !std::isfinite(v)) return false;
        out.push_back(v);
        p = end;
    }
    return true;
}
}  // namespace

// ═════════════════════════════════════════════════════════════════ delay line
void PhaseForgeProcessor::DelayLine::prepare(int maxDelay) {
    std::int64_t sz = 1;
    while (sz < (std::int64_t) maxDelay + 1) sz <<= 1;
    for (auto& b : buf) b.assign((size_t) sz, 0.f);
    mask = sz - 1;
    w = 0;
}
void PhaseForgeProcessor::DelayLine::clear() {
    for (auto& b : buf) std::fill(b.begin(), b.end(), 0.f);
    w = 0;
}
void PhaseForgeProcessor::DelayLine::process(const float* const* in, float* const* out, int numCh, int n, int delay) noexcept {
    if (mask == 0 && delay > 0) return;
    for (int c = 0; c < numCh && c < 2; ++c) {
        float* b = buf[c].data();
        const float* x = in[c];
        float* y = out[c];
        std::int64_t wi = w;
        for (int i = 0; i < n; ++i, ++wi) {
            b[(size_t) (wi & mask)] = x[i];
            y[i] = b[(size_t) ((wi - delay) & mask)];
        }
    }
    w += n;
}

// ═════════════════════════════════════════════════════════════════ construction
PhaseForgeProcessor::PhaseForgeProcessor()
    : juce::AudioProcessor(BusesProperties()
                               .withInput("Input", juce::AudioChannelSet::stereo(), true)
                               .withOutput("Output", juce::AudioChannelSet::stereo(), true)
                               .withInput("Sidechain", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, &undo, "PHASEFORGE", createParameterLayout()) {
    auto raw = [this](const juce::String& pid) {
        auto* p = apvts.getRawParameterValue(pid);
        jassert(p != nullptr);
        return p;
    };
    pInGain = raw(id::inGain);
    pOutGain = raw(id::outGain);
    pMix = raw(id::mix);
    pBypass = raw(id::bypass);
    pDelta = raw(id::delta);
    pPhaseOn = raw(id::phaseOn);
    pAngle = raw(id::phaseAngle);
    pDynMode = raw(id::dynMode);
    pScOn = raw(id::scOn);
    pFixMain = raw(id::fixMain);
    pFixSc = raw(id::fixSc);
    pSens = raw(id::sensitivity);
    for (int i = 0; i < id::kNodes; ++i)
        pNode[(size_t) i] = {raw(id::node(i, "on")), raw(id::node(i, "freq")), raw(id::node(i, "range")), raw(id::node(i, "thr")),
                             raw(id::node(i, "q")), raw(id::node(i, "att")), raw(id::node(i, "rel")), raw(id::node(i, "ch")),
                             raw(id::node(i, "byp")), raw(id::node(i, "solo"))};
    for (auto* pid : {id::filterMode, id::phaseMode, id::phaseRange, id::phaseLo, id::phaseHi, id::matchBlend, id::phaseOn})
        apvts.addParameterListener(pid, this);
    for (auto& b : popBuf) b.assign(4096, 0.f);
    worker.startThread(juce::Thread::Priority::normal);
}

PhaseForgeProcessor::~PhaseForgeProcessor() {
    cancelPendingUpdate();
    for (auto* pid : {id::filterMode, id::phaseMode, id::phaseRange, id::phaseLo, id::phaseHi, id::matchBlend, id::phaseOn})
        apvts.removeParameterListener(pid, this);
    worker.stopThread(10000);
}

juce::AudioProcessorParameter* PhaseForgeProcessor::getBypassParameter() const { return apvts.getParameter(id::bypass); }

bool PhaseForgeProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
    const auto in = layouts.getMainInputChannelSet(), out = layouts.getMainOutputChannelSet();
    if (in != out) return false;
    if (in != juce::AudioChannelSet::mono() && in != juce::AudioChannelSet::stereo()) return false;
    if (layouts.inputBuses.size() > 2 || layouts.outputBuses.size() > 1) return false;
    if (layouts.inputBuses.size() > 1) {
        const auto sc = layouts.getChannelSet(true, 1);
        if (!sc.isDisabled() && sc != juce::AudioChannelSet::mono() && sc != juce::AudioChannelSet::stereo()) return false;
    }
    return true;
}

float PhaseForgeProcessor::pv(const juce::String& pid) const {
    auto* p = apvts.getRawParameterValue(pid);
    return p != nullptr ? p->load(std::memory_order_relaxed) : 0.f;
}

void PhaseForgeProcessor::setParam(const juce::String& pid, float value) {
    if (auto* p = apvts.getParameter(pid)) {
        const float nv = p->convertTo0to1(p->getNormalisableRange().snapToLegalValue(value));
        p->beginChangeGesture();
        p->setValueNotifyingHost(nv);
        p->endChangeGesture();
    }
}

void PhaseForgeProcessor::effectiveBandHz(double& lo, double& hi) const {
    const int r = juce::jlimit(0, 3, (int) std::lround(pv(id::phaseRange)));
    float l = pv(id::phaseLo), h = pv(id::phaseHi);
    if (r < 3) phaseRangePreset(r, l, h);
    const double fs = sr.load(std::memory_order_relaxed);
    const double hiMax = std::min(20000.0, 0.45 * fs);
    lo = juce::jlimit(10.0, hiMax / 1.25, (double) l);
    hi = juce::jlimit(lo * 1.25, hiMax, (double) h);
}

PhaseForgeProcessor::Config PhaseForgeProcessor::currentConfig() const {
    Config c;
    c.filterMode = juce::jlimit(0, 1, (int) std::lround(pv(id::filterMode)));
    c.phaseMode = juce::jlimit(0, 1, (int) std::lround(pv(id::phaseMode)));
    effectiveBandHz(c.lo, c.hi);
    return c;
}

// ═════════════════════════════════════════════════════════════════ prepare / reconfigure
void PhaseForgeProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    const juce::ScopedLock pl(prepareLock);
    prepareInternal(sampleRate, samplesPerBlock);
}

void PhaseForgeProcessor::prepareInternal(double fsIn, int block) {
    const double fs = fsIn > 1000.0 ? fsIn : 48000.0;
    sr.store(fs);
    {
        std::lock_guard<std::mutex> al(analysisMutex);
        std::lock_guard<std::mutex> ml(matcherMutex);
        {
            const juce::SpinLock::ScopedLockType g(audioGuard);
            maxBlockSize = std::max(1, block);
            prep = currentConfig();
            const auto fm = prep.filterMode == 1 ? FilterMode::LinearPhaseFIR : FilterMode::ZeroLatencyIIR;
            rotator.prepare(fs, kSubBlock, 2, fm, prep.lo, prep.hi);
            rotator.snapAngle(pPhaseOn->load() > 0.5f ? (double) pAngle->load() : 0.0);
            matcher.prepare(fs, kSubBlock, 2);
            dyn.prepare(fs, kSubBlock, fm);
            latPhaseSamples = prep.phaseMode == 1 ? matcher.latency() : rotator.latency();
            latTotalSamples = latPhaseSamples + dyn.latency();
            dryDelay.prepare(latTotalSamples + 1);
            scDelay.prepare(latPhaseSamples + 1);
            dryBuf.setSize(2, kSubBlock, false, true, true);
            scBuf.setSize(2, kSubBlock, false, true, true);
            // keep loudness history / spectrum across a filter-mode change at the same rate and layout
            const int mainCh = juce::jlimit(1, 2, getMainBusNumInputChannels());
            const int scCh = getBusCount(true) > 1 && getBus(true, 1)->isEnabled() ? juce::jlimit(0, 2, getBus(true, 1)->getNumberOfChannels()) : 0;
            const bool newRate = std::abs(fs - preparedFs) > 1e-6;
            if (newRate || mainCh != preparedMainCh || scCh != preparedScCh) {
                inMeter.prepare(fs, mainCh);    // mono is measured as one channel (BS.1770)
                outMeter.prepare(fs, mainCh);
                scMeter.prepare(fs, std::max(1, scCh));
                preparedMainCh = mainCh;
                preparedScCh = scCh;
            }
            if (newRate) {
                capture.prepare(fs, 0.5, kHistorySeconds);
                analyzer.prepare(fs);
                analyzer.setAccumulator(resolveWaiting ? &accumulator : nullptr);
                accumulator.reset();
                lastFrameCount = 0;
                phaseStart = 0;
                phaseLastWritten = 0;
                preparedFs = fs;
            }
            inGainSm.reset(fs, kGainSmoothMs * 1e-3);
            outGainSm.reset(fs, kGainSmoothMs * 1e-3);
            inGainSm.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(pInGain->load()));
            outGainSm.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(pOutGain->load()));
            bypassStep = 1.0 / std::max(1.0, kBypassFadeMs * 1e-3 * fs);
            bypassGain = pBypass->load() > 0.5f ? 1.0 : 0.0;
            latPhase.store(latPhaseSamples);
            latDyn.store(dyn.latency());
            prepared = true;
        }
        matchApplied = Applied{false, -1.f, 0, true};   // matcher.prepare() reset it to identity
        updateMatcherLocked();
    }
    setLatencySamples(latTotalSamples);
}

void PhaseForgeProcessor::reconfigureIfNeeded() {
    const juce::ScopedLock pl(prepareLock);
    if (!prepared) return;
    const Config want = currentConfig();
    if (want.filterMode != prep.filterMode || want.phaseMode != prep.phaseMode) {
        suspendProcessing(true);
        prepareInternal(sr.load(), maxBlockSize);
        suspendProcessing(false);
        return;
    }
    if (std::abs(want.lo - prep.lo) < 1e-6 && std::abs(want.hi - prep.hi) < 1e-6) return;
    // band redesign: only the rotator; latency is unchanged (Hs + 128 or 0)
    const bool rotatorLive = prep.phaseMode == 0;
    if (rotatorLive) suspendProcessing(true);
    {
        const juce::SpinLock::ScopedLockType g(audioGuard);
        const auto fm = prep.filterMode == 1 ? FilterMode::LinearPhaseFIR : FilterMode::ZeroLatencyIIR;
        rotator.prepare(sr.load(), kSubBlock, 2, fm, want.lo, want.hi);
        rotator.snapAngle(pPhaseOn->load() > 0.5f ? (double) pAngle->load() : 0.0);
        prep.lo = want.lo;
        prep.hi = want.hi;
        jassert((prep.phaseMode == 1 ? matcher.latency() : rotator.latency()) == latPhaseSamples);
    }
    if (rotatorLive) suspendProcessing(false);
}

void PhaseForgeProcessor::parameterChanged(const juce::String& pid, float) {
    if (pid == id::matchBlend || pid == id::phaseOn) {
        markMatcherDirty();
        return;
    }
    // filterMode / phaseMode / band: coalesced on the message thread (AsyncUpdater is cancelled in the destructor,
    // unlike MessageManager::callAsync, which could run after the processor was deleted)
    triggerAsyncUpdate();
}

void PhaseForgeProcessor::handleAsyncUpdate() {
    if (resolveReady.exchange(false) && autoApplyResolve) applyResolveResult();
    reconfigureIfNeeded();
}

// ═════════════════════════════════════════════════════════════════ audio
void PhaseForgeProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) { process(buffer, false); }
void PhaseForgeProcessor::processBlockBypassed(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) { process(buffer, true); }

void PhaseForgeProcessor::process(juce::AudioBuffer<float>& buffer, bool forceBypass) noexcept {
    juce::ScopedNoDenormals noDenormals;
    const int n = buffer.getNumSamples();
    const int mainCh = getMainBusNumInputChannels();
    for (int c = std::max(1, getMainBusNumOutputChannels()); c < getTotalNumOutputChannels(); ++c)
        if (c >= getTotalNumInputChannels()) buffer.clear(c, 0, n);
    if (n <= 0 || mainCh <= 0 || buffer.getNumChannels() < mainCh) return;

    const float* scIn[2] = {nullptr, nullptr};
    int scCh = 0;
    if (getBusCount(true) > 1) {
        if (auto* bus = getBus(true, 1); bus != nullptr && bus->isEnabled() && bus->getNumberOfChannels() > 0) {
            const int off = bus->getChannelIndexInProcessBlockBuffer(0);
            const int cnt = std::min(2, bus->getNumberOfChannels());
            if (off + cnt <= buffer.getNumChannels()) {
                scCh = cnt;
                for (int c = 0; c < cnt; ++c) scIn[c] = buffer.getReadPointer(off + c);
            }
        }
    }
    scBusActive.store(scCh > 0, std::memory_order_relaxed);

    const juce::SpinLock::ScopedTryLockType guard(audioGuard);
    if (!guard.isLocked() || !prepared) {
        for (int c = 0; c < mainCh; ++c) buffer.clear(c, 0, n);
        return;
    }
    const int ch = std::min(2, mainCh);
    for (int c = 2; c < mainCh; ++c) buffer.clear(c, 0, n);   // (layouts > 2 ch are rejected; defensive)

    if (meterResetRequest.exchange(false)) { inMeter.reset(); outMeter.reset(); scMeter.reset(); }

    // ── per-block parameters
    inGainSm.setTargetValue(juce::Decibels::decibelsToGain(pInGain->load(std::memory_order_relaxed)));
    outGainSm.setTargetValue(juce::Decibels::decibelsToGain(pOutGain->load(std::memory_order_relaxed)));
    const bool phaseOn = pPhaseOn->load(std::memory_order_relaxed) > 0.5f;
    rotator.setAngle(phaseOn ? (double) pAngle->load(std::memory_order_relaxed) : 0.0);
    for (int i = 0; i < id::kNodes; ++i) {
        const auto& q = pNode[(size_t) i];
        NodeParams np;
        np.active = q.on->load(std::memory_order_relaxed) > 0.5f;
        np.bypass = q.byp->load(std::memory_order_relaxed) > 0.5f;
        np.solo = q.solo->load(std::memory_order_relaxed) > 0.5f;
        np.freqHz = q.freq->load(std::memory_order_relaxed);
        np.rangeDb = q.range->load(std::memory_order_relaxed);
        np.thresholdDb = q.thr->load(std::memory_order_relaxed);
        np.q = q.q->load(std::memory_order_relaxed);
        np.attackMs = q.att->load(std::memory_order_relaxed);
        np.releaseMs = q.rel->load(std::memory_order_relaxed);
        np.channel = (NodeChannel) juce::jlimit(0, 2, (int) std::lround(q.ch->load(std::memory_order_relaxed)));
        dyn.setNode(i, np);
    }
    dyn.setMode(pDynMode->load(std::memory_order_relaxed) > 0.5f ? DynMode::Difference : DynMode::Sidechain);
    dyn.setSidechainEnabled(pScOn->load(std::memory_order_relaxed) > 0.5f);
    dyn.setMix(pMix->load(std::memory_order_relaxed));
    dyn.setRelativeOffsetDb(pFixMain->load(std::memory_order_relaxed) - pFixSc->load(std::memory_order_relaxed));
    const int audition = deltaAudition.load(std::memory_order_relaxed);
    dyn.setDelta(audition >= 0 ? audition : (pDelta->load(std::memory_order_relaxed) > 0.5f ? -1 : -2));
    const double bypassTarget = (forceBypass || pBypass->load(std::memory_order_relaxed) > 0.5f) ? 1.0 : 0.0;
    const bool match = prep.phaseMode == 1;

    for (int pos = 0; pos < n; pos += kSubBlock) {
        const int m = std::min(kSubBlock, n - pos);
        float* io[2] = {buffer.getWritePointer(0, pos), ch > 1 ? buffer.getWritePointer(1, pos) : nullptr};
        const float* sc[2] = {scIn[0] != nullptr ? scIn[0] + pos : nullptr, scIn[1] != nullptr ? scIn[1] + pos : nullptr};
        float* dry[2] = {dryBuf.getWritePointer(0), dryBuf.getWritePointer(1)};

        dryDelay.process(io, dry, ch, m, latTotalSamples);   // latency-compensated dry (bypass)

        if (inGainSm.isSmoothing()) {
            for (int i = 0; i < m; ++i) {
                const float g = inGainSm.getNextValue();
                for (int c = 0; c < ch; ++c) io[c][i] *= g;
            }
        } else if (const float g = inGainSm.getTargetValue(); std::abs(g - 1.0f) > 0.0f) {
            for (int c = 0; c < ch; ++c) juce::FloatVectorOperations::multiply(io[c], g, m);
        }

        inMeter.process(io, ch, m);
        if (scCh > 0) scMeter.process(sc, scCh, m);
        capture.push(io, ch, scCh > 0 ? sc : nullptr, scCh, m);

        if (match) matcher.process(io, ch, m);
        else rotator.process(io, ch, m);

        const float* scd[2] = {nullptr, nullptr};
        if (scCh > 0) {
            float* sd[2] = {scBuf.getWritePointer(0), scBuf.getWritePointer(1)};
            scDelay.process(sc, sd, scCh, m, latPhaseSamples);
            scd[0] = sd[0];
            scd[1] = scCh > 1 ? sd[1] : nullptr;
        }
        dyn.process(io, ch, scCh > 0 ? scd : nullptr, scCh, m);

        if (outGainSm.isSmoothing()) {
            for (int i = 0; i < m; ++i) {
                const float g = outGainSm.getNextValue();
                for (int c = 0; c < ch; ++c) io[c][i] *= g;
            }
        } else if (const float g = outGainSm.getTargetValue(); std::abs(g - 1.0f) > 0.0f) {
            for (int c = 0; c < ch; ++c) juce::FloatVectorOperations::multiply(io[c], g, m);
        }

        if (std::abs(bypassGain - bypassTarget) > 0.0) {
            for (int i = 0; i < m; ++i) {
                bypassGain = bypassTarget > bypassGain ? std::min(bypassTarget, bypassGain + bypassStep)
                                                       : std::max(bypassTarget, bypassGain - bypassStep);
                const float b = (float) bypassGain;
                for (int c = 0; c < ch; ++c) io[c][i] = io[c][i] * (1.0f - b) + dry[c][i] * b;
            }
        } else if (bypassGain >= 1.0) {
            for (int c = 0; c < ch; ++c) juce::FloatVectorOperations::copy(io[c], dry[c], m);
        }

        outMeter.process(io, ch, m);
    }
}

MeterReadout PhaseForgeProcessor::readMeter(const LoudnessMeter& m) noexcept {
    auto f = [](float v) { return std::isfinite(v) ? std::max(-150.f, v) : -150.f; };
    return {f(m.samplePeakDisplayDb()), f(m.momentaryLufs()), f(m.shortTermLufs()), f(m.integratedLufs())};
}

// ═════════════════════════════════════════════════════════════════ analysis thread
void PhaseForgeProcessor::Worker::run() {
    while (!threadShouldExit()) {
        {
            std::lock_guard<std::mutex> lk(owner.analysisMutex);
            owner.analysisStep();
        }
        wait(4);
    }
}

void PhaseForgeProcessor::analysisStep() {
    if (preparedFs <= 0) return;
    analyzer.setGainOffsetDb(pFixMain->load() - pFixSc->load());
    analyzer.setTargetGapDb(pSens->load());
    pumpCapture();
    resolveStep();
    phaseStep();
    if (matcherDirty.exchange(false)) {
        std::lock_guard<std::mutex> ml(matcherMutex);
        updateMatcherLocked();
    }
}

void PhaseForgeProcessor::pumpCapture() {
    float* out[kCaptureChannels] = {popBuf[0].data(), popBuf[1].data(), popBuf[2].data(), popBuf[3].data()};
    const int chunk = (int) popBuf[0].size();
    int budget = (int) (preparedFs * 0.5);   // bounded work per iteration
    const bool sc = scBusActive.load(std::memory_order_relaxed);
    while (budget > 0 && !worker.threadShouldExit()) {
        const int got = capture.pop(out, std::min(chunk, budget));
        if (got <= 0) break;
        analyzer.feed(out[0], out[1], sc ? out[2] : nullptr, sc ? out[3] : nullptr, got);
        budget -= got;
    }
    if (analyzer.framesProduced() != lastFrameCount) {
        lastFrameCount = analyzer.framesProduced();
        std::lock_guard<std::mutex> lk(spectrumMutex);
        published = analyzer.frame();
        ++publishedVersion;
        scSignal.store(published.hasSidechain, std::memory_order_relaxed);
    }
}

bool PhaseForgeProcessor::getSpectrum(SpectrumFrame& dst, std::uint64_t& version) const {
    std::unique_lock<std::mutex> lk(spectrumMutex, std::try_to_lock);
    if (!lk.owns_lock() || publishedVersion == version || publishedVersion == 0) return false;
    dst = published;
    version = publishedVersion;
    return true;
}

// ── Resolve Conflicts
void PhaseForgeProcessor::requestResolveConflicts() {
    resolveCancel.store(false);
    resolveRequest.store(true);
    {
        std::lock_guard<std::mutex> lk(resultMutex);
        resolveResult.state = AnalysisState::Waiting;
        resolveResult.progress = 0.f;
    }
    worker.notify();
}

void PhaseForgeProcessor::cancelResolveConflicts() {
    resolveRequest.store(false);
    resolveCancel.store(true);
    worker.notify();
}

void PhaseForgeProcessor::resolveStep() {
    if (resolveCancel.exchange(false) && resolveWaiting) {
        analyzer.setAccumulator(nullptr);
        resolveWaiting = false;
        std::lock_guard<std::mutex> lk(resultMutex);
        resolveResult.state = AnalysisState::Idle;
    }
    if (resolveRequest.exchange(false)) {
        accumulator.reset();
        analyzer.setAccumulator(&accumulator);
        resolveWaiting = true;
        resolveLastFrames = 0;
        resolveLastProgressMs = nowMs();
    }
    if (!resolveWaiting) return;
    const int target = std::max(1, (int) std::ceil(kResolveSeconds * preparedFs / analyzer.hopSize()));
    const int f = accumulator.frames();
    const double now = nowMs();
    if (f != resolveLastFrames) {
        resolveLastFrames = f;
        resolveLastProgressMs = now;
        std::lock_guard<std::mutex> lk(resultMutex);
        resolveResult.state = AnalysisState::Waiting;
        resolveResult.progress = std::min(1.f, (float) f / (float) target);
    }
    if (f >= target) finishResolve(true);
    else if (now - resolveLastProgressMs > 2000.0) finishResolve(f >= target / 3);
}

void PhaseForgeProcessor::finishResolve(bool enough) {
    analyzer.setAccumulator(nullptr);
    resolveWaiting = false;
    ResolveResult r;
    r.state = AnalysisState::Done;
    r.progress = 1.f;
    r.framesUsed = accumulator.frames();
    r.sensitivityDb = pSens->load();
    r.gainOffsetDb = pFixMain->load() - pFixSc->load();
    if (!enough) {
        r.status = ResolveResult::Status::NotEnoughAudio;
    } else {
        const SpectrumFrame avg = accumulator.average();
        if (!avg.hasSidechain) {
            r.status = ResolveResult::Status::NoSidechain;
        } else {
            r.nodes = resolveConflicts(avg, (float) r.sensitivityDb, 8, (float) r.gainOffsetDb);
            r.status = r.nodes.empty() ? ResolveResult::Status::NoConflict : ResolveResult::Status::Ok;
        }
    }
    {
        std::lock_guard<std::mutex> lk(resultMutex);
        r.id = resolveResult.id + 1;
        resolveResult = std::move(r);
        resolveId.store(resolveResult.id);
    }
    resolveReady.store(true);
    triggerAsyncUpdate();
}

ResolveResult PhaseForgeProcessor::getResolveResult() const {
    std::lock_guard<std::mutex> lk(resultMutex);
    return resolveResult;
}

bool PhaseForgeProcessor::applyResolveResult() {
    ResolveResult r;
    {
        std::lock_guard<std::mutex> lk(resultMutex);
        if (resolveResult.state != AnalysisState::Done || resolveResult.applied) return false;
        if (resolveResult.status != ResolveResult::Status::Ok && resolveResult.status != ResolveResult::Status::NoConflict) return false;
        resolveResult.applied = true;
        r = resolveResult;
    }
    for (int i = 0; i < id::kNodes; ++i) {
        if (i < (int) r.nodes.size() && i < 8) {
            const auto& s = r.nodes[(size_t) i];
            setParam(id::node(i, "freq"), s.freqHz);
            setParam(id::node(i, "range"), s.rangeDb);
            setParam(id::node(i, "thr"), juce::jlimit(-80.f, 0.f, s.thresholdDb + (float) kResolveThresholdShiftDb));
            setParam(id::node(i, "q"), s.q);
            setParam(id::node(i, "att"), s.attackMs);
            setParam(id::node(i, "rel"), s.releaseMs);
            setParam(id::node(i, "ch"), (float) juce::jlimit(0, 2, s.channel));
            setParam(id::node(i, "byp"), 0.f);
            setParam(id::node(i, "solo"), 0.f);
            setParam(id::node(i, "on"), 1.f);
        } else {
            setParam(id::node(i, "solo"), 0.f);
            setParam(id::node(i, "on"), 0.f);
        }
    }
    return true;
}

// ── Phase Analyze / Match
void PhaseForgeProcessor::requestPhaseAnalysis() {
    phaseCancel.store(false);
    phaseRequestFrame.store(capture.history.framesWritten());
    phaseRequestMode.store(juce::jlimit(0, 1, (int) std::lround(pv(id::phaseMode))));
    phaseRequestFilter.store(juce::jlimit(0, 1, (int) std::lround(pv(id::filterMode))));
    phaseRequest.store(true);
    {
        std::lock_guard<std::mutex> lk(resultMutex);
        phaseRes.state = AnalysisState::Waiting;
        phaseRes.progress = 0.f;
    }
    worker.notify();
}

void PhaseForgeProcessor::cancelPhaseAnalysis() {
    phaseRequest.store(false);
    phaseCancel.store(true);
    worker.notify();
}

void PhaseForgeProcessor::phaseStep() {
    if (phaseCancel.exchange(false) && phaseWaiting) {
        phaseWaiting = false;
        std::lock_guard<std::mutex> lk(resultMutex);
        phaseRes.state = AnalysisState::Idle;
    }
    const std::uint64_t written = capture.history.framesWritten();
    const double now = nowMs();
    if (phaseRequest.exchange(false)) {
        phaseWaiting = true;
        phaseStart = std::min(phaseRequestFrame.load(), written);
        phaseMode = phaseRequestMode.load();
        phaseFilterMode = phaseRequestFilter.load();
        phaseLastWritten = written;
        phaseLastProgressMs = now;
    }
    if (!phaseWaiting) return;
    if (written < phaseStart) phaseStart = 0;   // history was reset (sample-rate change)
    const std::uint64_t got = written - phaseStart;
    const double fs = preparedFs;
    const auto need = (std::uint64_t) std::ceil(kPhaseWaitSeconds * fs);
    const auto maxN = (std::uint64_t) std::floor(kPhaseMaxSeconds * fs);
    const auto minN = (std::uint64_t) std::ceil(kPhaseMinSeconds * fs);
    if (written != phaseLastWritten) {
        phaseLastWritten = written;
        phaseLastProgressMs = now;
        std::lock_guard<std::mutex> lk(resultMutex);
        phaseRes.state = AnalysisState::Waiting;
        phaseRes.progress = std::min(1.f, (float) got / (float) need);
    }
    if (got >= need) {
        runPhaseAnalysis((int) std::min(got, maxN));
    } else if (now - phaseLastProgressMs > 1000.0) {   // audio stopped: use what exists if it is enough
        const std::uint64_t total = std::min<std::uint64_t>(written, (std::uint64_t) capture.history.capacity() * 7 / 8);
        if (got >= minN) runPhaseAnalysis((int) got);
        else if (total >= minN) runPhaseAnalysis((int) std::min(total, maxN));
        else runPhaseAnalysis(0);
    }
}

// Zero Latency IIR rotator: wet(θ) = AP·I + Band((cos θ − 1)·I − sin θ·Q)  (PhaseRotator.h), i.e. NOT a pure rotation of
// x — the in-band part also carries the all-pass phase of A0 and of the LR8 all-pass, and θ = 0 is the exact dry signal.
// An angle measured as a pure rotation (PhaseAnalyzer, FIR) therefore does not align in IIR mode (measured: −1.7 … +2.6 dB
// instead of +2 … +4.7 dB). The relationship is still found by PhaseAnalyzer (gating, Unrelated/Inconsistent); for an Ok
// result this replaces the angle by the one that maximises the band energy of kick + wet(θ) for the ACTUAL IIR network,
// in closed form: with A = AP·I − Band(I), B = Band(I), C = Band(Q) (all band-limited to [lo, hi] with LR4),
//   E(θ) = Σ (k + A + cos θ·B − sin θ·C)²   — six sums, scanned in 0.1° steps.
// If no θ beats the dry sum (θ = 0 → dry), the angle is 0. score/curve = normalised cross-term Σk·wet / √(Σk²·Σwet²).
static void iirOptimalAngle(const float* k, const float* x, int n, double fs, double lo, double hi, double gainOffsetDb,
                            PhaseResult& r) {
    const double fL = lo / std::sqrt(2.0), fH = std::min(hi * std::sqrt(2.0), 0.45 * fs);
    IirQuadrature q;
    q.design(fs, std::max(2.0, fL / 4.0), 0.05);
    LR8Band apx, bI, bQ;   // separate state per path
    apx.design(fs, fL, fH);
    bI.design(fs, fL, fH);
    bQ.design(fs, fL, fH);
    LR4 h[5], l[5];        // evaluation band for k, A, B, C, x
    for (int i = 0; i < 5; ++i) { h[i].design(fs, lo, true); l[i].design(fs, hi, false); }
    const double g = std::pow(10.0, gainOffsetDb / 20.0);
    double kk = 0, kA = 0, kB = 0, kC = 0, AA = 0, BB = 0, CC = 0, AB = 0, AC = 0, BC = 0, xx = 0, kx = 0;
    for (int i = 0; i < n; ++i) {
        const double xi = g * (double) x[i];
        double I, Q;
        q.process(xi, I, Q);
        const double bi = bI.band(I), bq = bQ.band(Q);
        const double a = apx.allpass(I) - bi;
        const double K = l[0].process(h[0].process((double) k[i]));
        const double A = l[1].process(h[1].process(a));
        const double B = l[2].process(h[2].process(bi));
        const double C = l[3].process(h[3].process(bq));
        const double X = l[4].process(h[4].process(xi));
        kk += K * K; kA += K * A; kB += K * B; kC += K * C;
        AA += A * A; BB += B * B; CC += C * C; AB += A * B; AC += A * C; BC += B * C;
        xx += X * X; kx += K * X;
    }
    const double eDry = kk + 2 * kx + xx;
    if (!(eDry > 0) || !(kk > 0)) return;
    auto eval = [&](double deg, double& energy, double& score) {
        const double th = deg * kPi / 180.0, c = std::cos(th), s = std::sin(th);
        const double kw = kA + c * kB - s * kC;
        const double ww = AA + c * c * BB + s * s * CC + 2 * c * AB - 2 * s * AC - 2 * c * s * BC;
        energy = kk + 2 * kw + ww;
        score = ww > 0 ? kw / std::sqrt(kk * ww) : 0.0;
    };
    double best = -1e300, bestDeg = 0, bestScore = 0;
    r.curve.assign(361, 0.f);
    for (int d = -1800; d <= 1800; ++d) {
        double e, sc;
        eval(d * 0.1, e, sc);
        if (d % 10 == 0) r.curve[(size_t) (d / 10 + 180)] = (float) sc;
        if (e > best) { best = e; bestDeg = d * 0.1; bestScore = sc; }
    }
    r.scoreAt0 = kx / std::sqrt(kk * std::max(xx, 1e-300));
    if (best > eDry) {
        r.angleDeg = bestDeg;
        r.score = bestScore;
        r.sumGainDb = juce::jlimit(-60.0, 60.0, 10.0 * std::log10(best / eDry));
    } else {
        r.angleDeg = 0;
        r.score = r.scoreAt0;
        r.sumGainDb = 0;
    }
}

void PhaseForgeProcessor::runPhaseAnalysis(int frames) {
    phaseWaiting = false;
    PhaseResult r;
    r.state = AnalysisState::Done;
    r.progress = 1.f;
    r.match = phaseMode == 1;
    r.filterMode = phaseFilterMode;
    effectiveBandHz(r.loHz, r.hiHz);
    r.gainOffsetDb = pFixMain->load() - pFixSc->load();
    const double fs = preparedFs;
    std::vector<float> b[kCaptureChannels];
    int m = 0;
    if (frames > 0) {
        for (auto& v : b) v.assign((size_t) frames, 0.f);
        float* out[kCaptureChannels] = {b[0].data(), b[1].data(), b[2].data(), b[3].data()};
        m = capture.readLatest(frames, out);
    }
    r.seconds = m / fs;
    if (m < (int) std::floor(kPhaseMinSeconds * fs * 0.95)) {
        r.status = PhaseResult::Status::NotEnoughAudio;
    } else {
        std::vector<float> mainMono((size_t) m), scMono((size_t) m);
        bool scAny = false;
        for (int i = 0; i < m; ++i) {
            mainMono[(size_t) i] = 0.5f * (b[0][(size_t) i] + b[1][(size_t) i]);
            scMono[(size_t) i] = 0.5f * (b[2][(size_t) i] + b[3][(size_t) i]);
            scAny = scAny || std::abs(scMono[(size_t) i]) > 1e-9f;
        }
        if (!scAny) {
            r.status = PhaseResult::Status::NoSidechain;
        } else if (!r.match) {
            const PhaseAnalyzer an;
            r.rotate = an.analyze(scMono.data(), mainMono.data(), m, fs, r.loHz, r.hiHz, r.gainOffsetDb);
            switch (r.rotate.status) {
                case PhaseAnalysis::Status::Ok: r.status = PhaseResult::Status::Ok; break;
                case PhaseAnalysis::Status::NotEnoughAudio: r.status = PhaseResult::Status::NotEnoughAudio; break;
                case PhaseAnalysis::Status::Silent: r.status = PhaseResult::Status::Silent; break;
                case PhaseAnalysis::Status::Unrelated: r.status = PhaseResult::Status::Unrelated; break;
                case PhaseAnalysis::Status::Inconsistent: r.status = PhaseResult::Status::Inconsistent; break;
            }
            r.angleDeg = r.rotate.angleDeg;
            r.confidence = r.rotate.confidence;
            r.score = r.rotate.score;
            r.scoreAt0 = r.rotate.scoreAt0;
            r.sumGainDb = r.rotate.sumGainDb;
            r.curve = r.rotate.curve;
            if (phaseFilterMode == 0 && r.status == PhaseResult::Status::Ok)
                iirOptimalAngle(scMono.data(), mainMono.data(), m, fs, r.loHz, r.hiHz, r.gainOffsetDb, r);
        } else {
            r.estimate = estimator.estimate(scMono.data(), mainMono.data(), m, fs, r.loHz, r.hiHz);
            switch (r.estimate.status) {
                case PhaseMatchEstimate::Status::Ok: r.status = PhaseResult::Status::Ok; break;
                case PhaseMatchEstimate::Status::NotEnoughAudio: r.status = PhaseResult::Status::NotEnoughAudio; break;
                case PhaseMatchEstimate::Status::Unrelated: r.status = PhaseResult::Status::Unrelated; break;
            }
            r.confidence = r.estimate.confidence;
            r.aggressive = r.estimate.aggressive;
        }
    }
    std::lock_guard<std::mutex> lk(resultMutex);
    r.id = phaseRes.id + 1;
    phaseRes = std::move(r);
    phaseId.store(phaseRes.id);
}

PhaseResult PhaseForgeProcessor::getPhaseResult() const {
    std::lock_guard<std::mutex> lk(resultMutex);
    return phaseRes;
}

bool PhaseForgeProcessor::analysisIdle() const {
    std::lock_guard<std::mutex> lk(resultMutex);
    return !phaseRequest.load() && !resolveRequest.load() && phaseRes.state != AnalysisState::Waiting &&
           resolveResult.state != AnalysisState::Waiting && !matcherDirty.load();
}

bool PhaseForgeProcessor::applyPhaseResult() {
    PhaseResult r;
    {
        std::lock_guard<std::mutex> lk(resultMutex);
        if (phaseRes.state != AnalysisState::Done || phaseRes.status != PhaseResult::Status::Ok) return false;
        if (!phaseRes.match && phaseRes.filterMode != juce::jlimit(0, 1, (int) std::lround(pv(id::filterMode)))) return false;
        r = phaseRes;
        phaseRes.applied = true;
    }
    if (!r.match) {
        setParam(id::phaseAngle, (float) juce::jlimit(-180.0, 180.0, r.angleDeg));
    } else {
        std::lock_guard<std::mutex> ml(matcherMutex);
        matchEst = r.estimate;
        hasMatch = true;
        ++matchEstId;
        updateMatcherLocked();
    }
    if (pv(id::phaseOn) < 0.5f) setParam(id::phaseOn, 1.f);   // → matcherDirty → thread re-applies (no-op if same)
    return true;
}

void PhaseForgeProcessor::updateMatcherLocked() {
    if (!prepared) return;
    const bool on = pPhaseOn->load() > 0.5f;
    const float blend = juce::jlimit(0.f, 1.f, pv(id::matchBlend));
    if (on && hasMatch) {
        if (!matchApplied.valid || !matchApplied.on || std::abs(matchApplied.blend - blend) > 0.0f || matchApplied.est != matchEstId) {
            PhaseMatchDesign d;
            if (matcher.setCorrection(matchEst, blend, &d)) {
                matchDesign = std::move(d);
                matchApplied = Applied{true, blend, matchEstId, true};
            } else {
                matcher.clearCorrection();
                matchDesign = PhaseMatchDesign{};
                matchApplied = Applied{false, -1.f, 0, true};
            }
        }
    } else if (!matchApplied.valid || matchApplied.on) {
        matcher.clearCorrection();
        matchDesign = PhaseMatchDesign{};
        matchApplied = Applied{false, -1.f, 0, true};
    }
}

bool PhaseForgeProcessor::hasMatchCorrection() const {
    std::lock_guard<std::mutex> ml(matcherMutex);
    return hasMatch;
}
PhaseMatchEstimate PhaseForgeProcessor::getMatchEstimate() const {
    std::lock_guard<std::mutex> ml(matcherMutex);
    return hasMatch ? matchEst : PhaseMatchEstimate{};
}
PhaseMatchDesign PhaseForgeProcessor::getMatchDesign() const {
    std::lock_guard<std::mutex> ml(matcherMutex);
    return matchDesign;
}
void PhaseForgeProcessor::clearMatchCorrection() {
    std::lock_guard<std::mutex> ml(matcherMutex);
    hasMatch = false;
    matchEst = PhaseMatchEstimate{};
    ++matchEstId;
    updateMatcherLocked();
}

// ═════════════════════════════════════════════════════════════════ UI API (editor contract)
bool PhaseForgeProcessor::getSpectrum(SpectrumFrame& out) const {
    std::unique_lock<std::mutex> lk(spectrumMutex, std::try_to_lock);
    if (!lk.owns_lock() || publishedVersion == 0) return false;
    out = published;
    return true;
}

MeterUi PhaseForgeProcessor::meter(int which) const noexcept {
    const MeterReadout r = which == 1 ? outputMeter() : (which == 2 ? sidechainMeter() : inputMeter());
    auto f = [](float v) { return std::max(-100.f, v); };
    return {f(r.peakDb), f(r.momentary), f(r.shortTerm), f(r.integrated)};
}

bool PhaseForgeProcessor::phaseAnalysisPending() const {
    std::lock_guard<std::mutex> lk(resultMutex);
    return phaseRequest.load() || phaseRes.state == AnalysisState::Waiting;
}

bool PhaseForgeProcessor::resolvePending() const {
    std::lock_guard<std::mutex> lk(resultMutex);
    return resolveRequest.load() || resolveResult.state == AnalysisState::Waiting;
}

PhaseUiResult PhaseForgeProcessor::phaseResult() const {
    const PhaseResult r = getPhaseResult();
    PhaseUiResult u;
    u.serial = (int) r.id;
    if (r.id == 0) return u;   // nothing finished yet (status −1)
    u.isMatch = r.match;
    // own statuses mapped onto the DSP enums: NoSidechain → Silent (rotate) / NotEnoughAudio (match)
    if (!r.match) {
        switch (r.status) {
            case PhaseResult::Status::Ok: u.status = (int) PhaseAnalysis::Status::Ok; break;
            case PhaseResult::Status::NotEnoughAudio: u.status = (int) PhaseAnalysis::Status::NotEnoughAudio; break;
            case PhaseResult::Status::Silent:
            case PhaseResult::Status::NoSidechain: u.status = (int) PhaseAnalysis::Status::Silent; break;
            case PhaseResult::Status::Unrelated: u.status = (int) PhaseAnalysis::Status::Unrelated; break;
            case PhaseResult::Status::Inconsistent: u.status = (int) PhaseAnalysis::Status::Inconsistent; break;
        }
        u.curve = r.curve;
    } else {
        u.status = r.status == PhaseResult::Status::Ok ? (int) PhaseMatchEstimate::Status::Ok
                 : r.status == PhaseResult::Status::Unrelated ? (int) PhaseMatchEstimate::Status::Unrelated
                                                             : (int) PhaseMatchEstimate::Status::NotEnoughAudio;
        u.matchHz = r.estimate.hz;
        u.matchCorrectionDeg = r.estimate.correctionDeg;
        u.aggressive = r.aggressive;
    }
    u.angleDeg = r.angleDeg;
    u.confidence = r.confidence;
    u.score = r.score;
    u.scoreAt0 = r.scoreAt0;
    u.sumGainDb = r.sumGainDb;
    return u;
}

int PhaseForgeProcessor::latencyMs10() const noexcept {
    const double fs = sr.load(std::memory_order_relaxed);
    return fs > 0 ? (int) std::lround(getLatencySamples() * 10000.0 / fs) : 0;
}

// ═════════════════════════════════════════════════════════════════ state
juce::ValueTree PhaseForgeProcessor::estimateToTree(const PhaseMatchEstimate& e) const {
    juce::ValueTree t("Match");
    t.setProperty("status", (int) e.status, nullptr);
    t.setProperty("confidence", e.confidence, nullptr);
    t.setProperty("maxCorrectionDeg", e.maxCorrectionDeg, nullptr);
    t.setProperty("groupDelaySpreadMs", e.groupDelaySpreadMs, nullptr);
    t.setProperty("aggressive", e.aggressive, nullptr);
    t.setProperty("aggressiveReasons", (int) e.aggressiveReasons, nullptr);
    t.setProperty("loHz", e.loHz, nullptr);
    t.setProperty("hiHz", e.hiHz, nullptr);
    t.setProperty("fs", e.fs, nullptr);
    t.setProperty("activeFrames", e.activeFrames, nullptr);
    t.setProperty("totalFrames", e.totalFrames, nullptr);
    t.setProperty("realizedMagDevDb", e.realizedMagDevDb, nullptr);
    t.setProperty("realizedPhaseErrDeg", e.realizedPhaseErrDeg, nullptr);
    t.setProperty("realizedPhaseErrRmsDeg", e.realizedPhaseErrRmsDeg, nullptr);
    t.setProperty("preRingDb", e.preRingDb, nullptr);
    t.setProperty("groupDelayLimitMs", e.groupDelayLimitMs, nullptr);
    t.setProperty("hz", floatsToText(e.hz), nullptr);
    t.setProperty("phaseDeg", floatsToText(e.phaseDeg), nullptr);
    t.setProperty("coherence", floatsToText(e.coherence), nullptr);
    t.setProperty("correctionDeg", floatsToText(e.correctionDeg), nullptr);
    t.setProperty("weight", floatsToText(e.weight), nullptr);
    return t;
}

bool PhaseForgeProcessor::treeToEstimate(const juce::ValueTree& t, PhaseMatchEstimate& e) {
    if (!t.hasType("Match")) return false;
    PhaseMatchEstimate x;
    if ((int) t.getProperty("status", -1) != (int) PhaseMatchEstimate::Status::Ok) return false;
    x.status = PhaseMatchEstimate::Status::Ok;
    if (!textToFloats(t.getProperty("hz").toString(), x.hz) || !textToFloats(t.getProperty("phaseDeg").toString(), x.phaseDeg) ||
        !textToFloats(t.getProperty("coherence").toString(), x.coherence) ||
        !textToFloats(t.getProperty("correctionDeg").toString(), x.correctionDeg) ||
        !textToFloats(t.getProperty("weight").toString(), x.weight))
        return false;
    const size_t n = x.hz.size();
    if (n < 2 || n > 4096 || x.correctionDeg.size() != n) return false;
    for (size_t i = 0; i < n; ++i)
        if (!(x.hz[i] > 0.f) || (i > 0 && !(x.hz[i] > x.hz[i - 1])) || std::abs(x.correctionDeg[i]) > 1.0e4f) return false;
    auto d = [&t](const char* k, double def) {
        const double v = (double) t.getProperty(k, def);
        return std::isfinite(v) ? v : def;
    };
    x.confidence = d("confidence", 0);
    x.maxCorrectionDeg = d("maxCorrectionDeg", 0);
    x.groupDelaySpreadMs = d("groupDelaySpreadMs", 0);
    x.aggressive = (bool) t.getProperty("aggressive", false);
    x.aggressiveReasons = (unsigned) (int) t.getProperty("aggressiveReasons", 0);
    x.loHz = d("loHz", 20);
    x.hiHz = d("hiHz", 200);
    x.fs = d("fs", 48000);
    if (!(x.loHz > 0) || !(x.hiHz > x.loHz)) return false;
    x.activeFrames = (int) t.getProperty("activeFrames", 0);
    x.totalFrames = (int) t.getProperty("totalFrames", 0);
    x.realizedMagDevDb = d("realizedMagDevDb", 0);
    x.realizedPhaseErrDeg = d("realizedPhaseErrDeg", 0);
    x.realizedPhaseErrRmsDeg = d("realizedPhaseErrRmsDeg", 0);
    x.preRingDb = d("preRingDb", -60);
    x.groupDelayLimitMs = d("groupDelayLimitMs", 0);
    e = std::move(x);
    return true;
}

juce::ValueTree PhaseForgeProcessor::snapshot() const {
    juce::ValueTree t("Snapshot");
    t.setProperty("version", kStateVersion, nullptr);
    juce::ValueTree ps("Params");
    for (auto* p : getParameters())
        if (auto* r = dynamic_cast<juce::RangedAudioParameter*>(p)) {
            juce::ValueTree c("P");
            c.setProperty("id", r->getParameterID(), nullptr);
            c.setProperty("v", r->convertFrom0to1(r->getValue()), nullptr);   // plain value (readable, range-change safe)
            c.setProperty("n", (double) r->getValue(), nullptr);              // normalised: exact round trip
            ps.appendChild(c, nullptr);
        }
    t.appendChild(ps, nullptr);
    std::lock_guard<std::mutex> ml(matcherMutex);
    if (hasMatch) t.appendChild(estimateToTree(matchEst), nullptr);
    return t;
}

void PhaseForgeProcessor::restore(const juce::ValueTree& t) {
    if (!t.isValid() || !t.hasType("Snapshot")) return;
    // version migrations go here (v1 = first)
    auto num = [](const juce::var& v, double& out) {
        if (!(v.isDouble() || v.isInt() || v.isInt64() || v.isBool() || v.isString())) return false;
        const double d = v.isString() ? std::strtod(v.toString().toRawUTF8(), nullptr) : (double) v;
        if (!std::isfinite(d)) return false;
        out = d;
        return true;
    };
    std::map<juce::String, float> vals, norms;
    for (auto c : t.getChildWithName("Params")) {
        if (!c.hasType("P")) continue;
        const auto pid = c.getProperty("id").toString();
        double d = 0;
        if (num(c.getProperty("v"), d)) vals[pid] = (float) d;
        if (num(c.getProperty("n"), d) && d >= 0.0 && d <= 1.0) norms[pid] = (float) d;
    }
    // JUCE skips a host update when the stored value equals the current one after rounding (bool/choice), so every
    // parameter is set explicitly, missing ones to their default (pluginval "state restoration").
    for (auto* p : getParameters())
        if (auto* r = dynamic_cast<juce::RangedAudioParameter*>(p)) {
            float norm = r->getDefaultValue();
            if (auto it = vals.find(r->getParameterID()); it != vals.end()) {
                const auto& range = r->getNormalisableRange();
                const float plain = juce::jlimit(range.start, range.end, finiteOr(it->second, range.start));
                norm = r->convertTo0to1(plain);
                // the exact normalised value when it agrees with the plain one (same version / range)
                if (auto jt = norms.find(r->getParameterID());
                    jt != norms.end() && std::abs(r->convertFrom0to1(jt->second) - plain) <= 1e-4f * std::max(1.f, std::abs(plain)))
                    norm = jt->second;
            }
            r->setValueNotifyingHost(norm);
        }
    {
        std::lock_guard<std::mutex> ml(matcherMutex);
        PhaseMatchEstimate e;
        if (treeToEstimate(t.getChildWithName("Match"), e)) {
            matchEst = std::move(e);
            hasMatch = true;
        } else {
            matchEst = PhaseMatchEstimate{};
            hasMatch = false;
        }
        ++matchEstId;
        updateMatcherLocked();
    }
}

void PhaseForgeProcessor::getStateInformation(juce::MemoryBlock& destData) {
    juce::ValueTree root("PHASEFORGE_STATE");
    root.setProperty("version", kStateVersion, nullptr);
    const auto cur = snapshot();
    root.appendChild(cur.createCopy(), nullptr);
    {
        const juce::ScopedLock l(uiLock);
        if (slotBActive) slotB = cur; else slotA = cur;
        juce::ValueTree a("SlotA"), b("SlotB");
        if (slotA.isValid()) a.appendChild(slotA.createCopy(), nullptr);
        if (slotB.isValid()) b.appendChild(slotB.createCopy(), nullptr);
        root.appendChild(a, nullptr);
        root.appendChild(b, nullptr);
        root.setProperty("abB", slotBActive, nullptr);
        root.appendChild(uiState.createCopy(), nullptr);
        root.setProperty("program", currentProgram, nullptr);
    }
    if (auto xml = root.createXml()) copyXmlToBinary(*xml, destData);
}

void PhaseForgeProcessor::setStateInformation(const void* data, int sizeInBytes) {
    if (data == nullptr || sizeInBytes <= 0) return;
    auto xml = getXmlFromBinary(data, sizeInBytes);
    if (xml == nullptr) return;
    const auto root = juce::ValueTree::fromXml(*xml);
    if (!root.isValid() || !root.hasType("PHASEFORGE_STATE")) return;
    const auto cur = root.getChildWithName("Snapshot");
    if (!cur.isValid()) return;
    restore(cur);
    const juce::ScopedLock l(uiLock);
    auto slot = [](const juce::ValueTree& w) {
        const auto s = w.getChildWithName("Snapshot");
        return s.isValid() ? s.createCopy() : juce::ValueTree();
    };
    slotA = slot(root.getChildWithName("SlotA"));
    slotB = slot(root.getChildWithName("SlotB"));
    slotBActive = (bool) root.getProperty("abB", false);
    const auto ui = root.getChildWithName("UI");
    uiState = ui.isValid() ? ui.createCopy() : juce::ValueTree("UI");
    currentProgram = juce::jlimit(0, (int) factory().size() - 1, (int) root.getProperty("program", 0));
}

void PhaseForgeProcessor::setUiProperty(const juce::Identifier& key, const juce::var& v) {
    const juce::ScopedLock l(uiLock);
    uiState.setProperty(key, v, nullptr);
}
juce::var PhaseForgeProcessor::getUiProperty(const juce::Identifier& key, const juce::var& def) const {
    const juce::ScopedLock l(uiLock);
    return uiState.getProperty(key, def);
}

// ── A/B
void PhaseForgeProcessor::toggleAB() {
    const auto cur = snapshot();
    juce::ValueTree target;
    {
        const juce::ScopedLock l(uiLock);
        if (!slotBActive) {
            slotA = cur;
            if (!slotB.isValid()) slotB = cur.createCopy();
            target = slotB;
        } else {
            slotB = cur;
            if (!slotA.isValid()) slotA = cur.createCopy();
            target = slotA;
        }
        slotBActive = !slotBActive;
    }
    restore(target);
}

void PhaseForgeProcessor::copyActiveToInactive() {
    const auto cur = snapshot();
    const juce::ScopedLock l(uiLock);
    if (slotBActive) slotA = cur; else slotB = cur;
}

// ── programs / presets
juce::StringArray PhaseForgeProcessor::factoryPresetNames() {
    juce::StringArray s;
    for (const auto& p : factory()) s.add(juce::String::fromUTF8(p.name));
    return s;
}
int PhaseForgeProcessor::getNumPrograms() { return (int) factory().size(); }
const juce::String PhaseForgeProcessor::getProgramName(int i) {
    return juce::isPositiveAndBelow(i, getNumPrograms()) ? juce::String::fromUTF8(factory()[(size_t) i].name) : juce::String();
}

void PhaseForgeProcessor::setCurrentProgram(int index) {
    if (!juce::isPositiveAndBelow(index, getNumPrograms())) return;
    currentProgram = index;
    std::map<juce::String, float> v;
    for (const auto& kv : factory()[(size_t) index].v) v[kv.first] = kv.second;
    for (auto* p : getParameters())
        if (auto* r = dynamic_cast<juce::RangedAudioParameter*>(p)) {
            auto it = v.find(r->getParameterID());
            r->setValueNotifyingHost(it != v.end() ? r->convertTo0to1(it->second) : r->getDefaultValue());
        }
    clearMatchCorrection();
}

juce::File PhaseForgeProcessor::userPresetDirectory() {
    auto base = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory);
   #if JUCE_MAC
    base = base.getChildFile("Application Support");   // JUCE's user data folder is ~/Library on macOS
   #endif
    return base.getChildFile("BE Akademi").getChildFile("PHASEFORGE").getChildFile("Presets");
}

bool PhaseForgeProcessor::savePresetFile(const juce::File& file, const juce::String& name) {
    juce::ValueTree root("PHASEFORGE_PRESET");
    root.setProperty("version", kStateVersion, nullptr);
    root.setProperty("name", name.isNotEmpty() ? name : file.getFileNameWithoutExtension(), nullptr);
    root.appendChild(snapshot(), nullptr);
    auto xml = root.createXml();
    if (xml == nullptr) return false;
    file.getParentDirectory().createDirectory();
    return xml->writeTo(file);
}

bool PhaseForgeProcessor::loadPresetFile(const juce::File& file) {
    if (!file.existsAsFile() || file.getSize() > 16 * 1024 * 1024) return false;
    auto xml = juce::parseXML(file);
    if (xml == nullptr) return false;
    const auto root = juce::ValueTree::fromXml(*xml);
    if (!root.hasType("PHASEFORGE_PRESET")) return false;
    const auto s = root.getChildWithName("Snapshot");
    if (!s.isValid()) return false;
    restore(s);
    return true;
}

juce::AudioProcessorEditor* PhaseForgeProcessor::createEditor() { return new PhaseForgeEditor(*this); }

}  // namespace pf

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new pf::PhaseForgeProcessor(); }
