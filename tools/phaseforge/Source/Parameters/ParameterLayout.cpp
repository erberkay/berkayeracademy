// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
#include "ParameterLayout.h"

namespace pf {

using APF = juce::AudioParameterFloat;
using APB = juce::AudioParameterBool;
using NR = juce::NormalisableRange<float>;

static juce::AudioParameterFloatAttributes fmt(std::function<juce::String(float)> f, const juce::String& label = {}) {
    return juce::AudioParameterFloatAttributes().withStringFromValueFunction([f](float v, int) { return f(v); }).withLabel(label);
}
static juce::String db1(float v) { return (v > 0 ? "+" : "") + juce::String(v, 1) + " dB"; }
static juce::String hz(float v) { return v >= 1000 ? juce::String(v / 1000.0f, 2) + " kHz" : (v < 100 ? juce::String(v, 1) : juce::String(juce::roundToInt(v))) + " Hz"; }
static juce::String ms(float v) { return (v < 10 ? juce::String(v, 1) : juce::String(juce::roundToInt(v))) + " ms"; }
static juce::String pct(float v) { return juce::String(juce::roundToInt(v * 100)) + " %"; }
static juce::String deg(float v) { return (v > 0 ? "+" : "") + juce::String(v, 1) + juce::String::fromUTF8("°"); }

static NR logRange(float lo, float hi, float centre) { NR r(lo, hi); r.setSkewForCentre(centre); return r; }

// ── text → value (hosts and pluginval round-trip the display strings; "1.50 kHz" must not read back as 1.5 Hz)
static double numberIn(juce::String t) {
    t = t.replace(juce::String::fromUTF8("\xe2\x88\x92"), "-").trim();   // U+2212 minus sign
    return t.getDoubleValue();
}
static float parseHz(const juce::String& t) {
    const double v = numberIn(t);
    return (float) (t.containsIgnoreCase("k") ? v * 1000.0 : v);
}
static float parsePlain(const juce::String& t) { return (float) numberIn(t); }
static float parseMs(const juce::String& t) {
    const double v = numberIn(t);
    const auto l = t.toLowerCase();
    return (float) ((l.endsWith("s") && !l.endsWith("ms")) ? v * 1000.0 : v);
}
static juce::AudioParameterFloatAttributes fmtP(std::function<juce::String(float)> f, std::function<float(const juce::String&)> parse,
                                                const juce::String& label = {}) {
    return fmt(std::move(f), label).withValueFromStringFunction(std::move(parse));
}

// Choice parameters: match the text on ASCII letters/digits only (a wrapper that mangles UTF-8 still finds the item),
// also accept the index as a number; never throw / never return an out-of-range index.
static juce::String asciiKey(const juce::String& s) {
    juce::String o;
    for (auto c : s)
        if (c < 128 && juce::CharacterFunctions::isLetterOrDigit(c)) o += juce::CharacterFunctions::toLowerCase(c);
    return o;
}
static std::unique_ptr<juce::AudioParameterChoice> choice(const juce::String& pid, const juce::String& name,
                                                          const juce::StringArray& items, int def) {
    auto attr = juce::AudioParameterChoiceAttributes()
                    .withStringFromValueFunction([items](int i, int) { return items[juce::jlimit(0, items.size() - 1, i)]; })
                    .withValueFromStringFunction([items, def](const juce::String& t) {
                        const auto k = asciiKey(t);
                        for (int i = 0; i < items.size(); ++i)
                            if (items[i] == t || (k.isNotEmpty() && asciiKey(items[i]) == k)) return i;
                        const auto tt = t.trim();
                        if (tt.isNotEmpty() && tt.containsOnly("0123456789")) return juce::jlimit(0, items.size() - 1, tt.getIntValue());
                        return def;
                    });
    return std::make_unique<juce::AudioParameterChoice>(juce::ParameterID{pid, 1}, name, items, def, attr);
}

juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout() {
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> p;
    auto pctAttr = fmt(pct).withValueFromStringFunction([](const juce::String& t) { return (float) (t.getDoubleValue() / 100.0); });
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::inGain, 1}, "Input Gain", NR(-24.f, 24.f, 0.01f), 0.f, fmtP(db1, parsePlain, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::outGain, 1}, "Output Gain", NR(-24.f, 24.f, 0.01f), 0.f, fmtP(db1, parsePlain, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::mix, 1}, "Mix", NR(0.f, 1.f, 0.001f), 1.f, pctAttr));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::bypass, 1}, "Bypass", false));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::delta, 1}, "Delta", false));
    p.push_back(choice(id::phaseMode, "Phase Mode", juce::StringArray{"Phase Rotate", "Phase Match"}, 0));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::phaseOn, 1}, "Phase On", true));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::phaseAngle, 1}, "Phase Angle", NR(-180.f, 180.f, 0.1f), 0.f, fmtP(deg, parsePlain)));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::matchBlend, 1}, "Phase Match Blend", NR(0.f, 1.f, 0.001f), 1.f, pctAttr));
    p.push_back(choice(id::phaseRange, "Phase Range", juce::StringArray{"Low", "Mid", "High", "Custom"}, 0));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::phaseLo, 1}, "Phase Low Cut", logRange(20.f, 10000.f, 200.f), 20.f, fmtP(hz, parseHz, "Hz")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::phaseHi, 1}, "Phase High Cut", logRange(40.f, 20000.f, 400.f), 200.f, fmtP(hz, parseHz, "Hz")));
    p.push_back(choice(id::filterMode, "Filter Mode", juce::StringArray{"Zero Latency IIR", "Linear Phase FIR"}, 1));
    p.push_back(choice(id::dynMode, "Dynamic Mode", juce::StringArray{"Sidechain", "Difference"}, 0));
    p.push_back(std::make_unique<APB>(juce::ParameterID{id::scOn, 1}, "Sidechain On", true));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::sensitivity, 1}, "Conflict Sensitivity", NR(0.f, 9.f, 0.1f), 4.5f, fmtP(db1, parsePlain, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::fixMain, 1}, "Gain Fix Main Fader", NR(-60.f, 12.f, 0.1f), 0.f, fmtP(db1, parsePlain, "dB")));
    p.push_back(std::make_unique<APF>(juce::ParameterID{id::fixSc, 1}, "Gain Fix Sidechain Fader", NR(-60.f, 12.f, 0.1f), 0.f, fmtP(db1, parsePlain, "dB")));
    for (int i = 0; i < id::kNodes; ++i) {
        const juce::String n = "Node " + juce::String(i + 1) + " ";
        p.push_back(std::make_unique<APB>(juce::ParameterID{id::node(i, "on"), 1}, n + "On", false));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "freq"), 1}, n + "Freq", logRange(20.f, 20000.f, 500.f), 100.f, fmtP(hz, parseHz, "Hz")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "range"), 1}, n + "Reduction", NR(0.f, 18.f, 0.1f), 6.f, fmtP([](float v) { return juce::String(-v, 1) + " dB"; },
                                              [](const juce::String& t) { return std::abs(parsePlain(t)); }, "dB")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "thr"), 1}, n + "Threshold", NR(-80.f, 0.f, 0.1f), -30.f, fmtP(db1, parsePlain, "dB")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "q"), 1}, n + "Q", logRange(0.1f, 20.f, 1.5f), 1.f,
                                          fmtP([](float v) { return juce::String(v, 2); }, parsePlain)));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "att"), 1}, n + "Attack", logRange(0.1f, 200.f, 10.f), 5.f, fmtP(ms, parseMs, "ms")));
        p.push_back(std::make_unique<APF>(juce::ParameterID{id::node(i, "rel"), 1}, n + "Release", logRange(5.f, 1000.f, 120.f), 80.f, fmtP(ms, parseMs, "ms")));
        p.push_back(choice(id::node(i, "ch"), n + "Channel", juce::StringArray{"Stereo", "Mid", "Side"}, 0));
        p.push_back(std::make_unique<APB>(juce::ParameterID{id::node(i, "byp"), 1}, n + "Bypass", false));
        p.push_back(std::make_unique<APB>(juce::ParameterID{id::node(i, "solo"), 1}, n + "Solo", false));
    }
    return {p.begin(), p.end()};
}

}  // namespace pf
