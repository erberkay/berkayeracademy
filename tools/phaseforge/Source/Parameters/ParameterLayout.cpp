// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
#include "ParameterLayout.h"

namespace pf {

using APF = juce::AudioParameterFloat;
using APB = juce::AudioParameterBool;
using APC = juce::AudioParameterChoice;
using NR = juce::NormalisableRange<float>;

static juce::AudioParameterFloatAttributes fmt(std::function<juce::String(float)> f, const juce::String& label = {}) {
    return juce::AudioParameterFloatAttributes().withStringFromValueFunction([f](float v, int) { return f(v); }).withLabel(label);
}
static juce::String db1(float v) { return (v > 0 ? "+" : "") + juce::String(v, 1) + " dB"; }
static juce::String hz(float v) { return v >= 1000 ? juce::String(v / 1000.0f, 2) + " kHz" : juce::String(v, v < 100 ? 1 : 0) + " Hz"; }
static juce::String ms(float v) { return juce::String(v, v < 10 ? 1 : 0) + " ms"; }
static juce::String pct(float v) { return juce::String(juce::roundToInt(v * 100)) + " %"; }
static juce::String deg(float v) { return (v > 0 ? "+" : "") + juce::String(v, 1) + juce::String::fromUTF8("°"); }

static NR logRange(float lo, float hi, float centre) { NR r(lo, hi); r.setSkewForCentre(centre); return r; }

juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout() {
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> p;
    auto pctAttr = fmt(pct).withValueFromStringFunction([](const juce::String& t) { return (float) (t.getDoubleValue() / 100.0); });
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::inGain, 1}, "Input Gain", NR(-24.f, 24.f, 0.01f), 0.f, fmt(db1, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::outGain, 1}, "Output Gain", NR(-24.f, 24.f, 0.01f), 0.f, fmt(db1, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::mix, 1}, "Mix", NR(0.f, 1.f, 0.001f), 1.f, pctAttr));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::bypass, 1}, "Bypass", false));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::delta, 1}, "Delta", false));
    p.push_back(std::make_unique<APC>(juce::ParameterID{id::phaseMode, 1}, "Phase Mode", juce::StringArray{"Phase Rotate", "Phase Match"}, 0));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::phaseOn, 1}, "Phase On", true));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::phaseAngle, 1}, "Phase Angle", NR(-180.f, 180.f, 0.1f), 0.f, fmt(deg)));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::matchBlend, 1}, "Phase Match Blend", NR(0.f, 1.f, 0.001f), 1.f, pctAttr));
    p.push_back(std::make_unique<APC>(juce::ParameterID{id::phaseRange, 1}, "Phase Range", juce::StringArray{"Low", "Mid", "High", "Custom"}, 0));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::phaseLo, 1}, "Phase Low Cut", logRange(20.f, 10000.f, 200.f), 20.f, fmt(hz, "Hz")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::phaseHi, 1}, "Phase High Cut", logRange(40.f, 20000.f, 400.f), 200.f, fmt(hz, "Hz")));
    p.push_back(std::make_unique<APC>(juce::ParameterID{id::filterMode, 1}, "Filter Mode", juce::StringArray{"Zero Latency IIR", "Linear Phase FIR"}, 1));
    p.push_back(std::make_unique<APC>(juce::ParameterID{id::dynMode, 1}, "Dynamic Mode", juce::StringArray{"Sidechain", "Difference"}, 0));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::scOn, 1}, "Sidechain On", true));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::sensitivity, 1}, "Conflict Sensitivity", NR(0.f, 9.f, 0.1f), 4.5f, fmt(db1, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::fixMain, 1}, "Gain Fix Main Fader", NR(-60.f, 12.f, 0.1f), 0.f, fmt(db1, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::fixSc, 1}, "Gain Fix Sidechain Fader", NR(-60.f, 12.f, 0.1f), 0.f, fmt(db1, "dB")));
    for (int i = 0; i < id::kNodes; ++i) {
        const juce::String n = "Node " + juce::String(i + 1) + " ";
        p.push_back(std::make_unique<APB>(juce::ParameterID{id::node(i, "on"), 1}, n + "On", false));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "freq"), 1}, n + "Freq", logRange(20.f, 20000.f, 500.f), 100.f, fmt(hz, "Hz")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "range"), 1}, n + "Reduction", NR(0.f, 18.f, 0.1f), 6.f, fmt([](float v) { return juce::String(-v, 1) + " dB"; }, "dB")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "thr"), 1}, n + "Threshold", NR(-80.f, 0.f, 0.1f), -30.f, fmt(db1, "dB")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "q"), 1}, n + "Q", logRange(0.1f, 20.f, 1.5f), 1.f,
                                          fmt([](float v) { return juce::String(v, 2); })));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "att"), 1}, n + "Attack", logRange(0.1f, 200.f, 10.f), 5.f, fmt(ms, "ms")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "rel"), 1}, n + "Release", logRange(5.f, 1000.f, 120.f), 80.f, fmt(ms, "ms")));
        p.push_back(std::make_unique<APC>(juce::ParameterID{id::node(i, "ch"), 1}, n + "Channel", juce::StringArray{"Stereo", "Mid", "Side"}, 0));
        p.push_back(std::make_unique<APB>(juce::ParameterID{id::node(i, "byp"), 1}, n + "Bypass", false));
        p.push_back(std::make_unique<APB>(juce::ParameterID{id::node(i, "solo"), 1}, n + "Solo", false));
    }
    return {p.begin(), p.end()};
}

}  // namespace pf
