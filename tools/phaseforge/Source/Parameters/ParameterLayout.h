// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
// All DAW-facing parameters (English names; stable IDs — never rename an ID, saved projects depend on them).
#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

namespace pf::id {
inline constexpr const char* inGain = "inGain";
inline constexpr const char* outGain = "outGain";
inline constexpr const char* mix = "mix";
inline constexpr const char* bypass = "bypass";
inline constexpr const char* delta = "delta";
inline constexpr const char* phaseMode = "phaseMode";     // 0 Rotate, 1 Match
inline constexpr const char* phaseOn = "phaseOn";
inline constexpr const char* phaseAngle = "phaseAngle";   // −180..180
inline constexpr const char* matchBlend = "matchBlend";   // 0..1
inline constexpr const char* phaseRange = "phaseRange";   // 0 Low, 1 Mid, 2 High, 3 Custom
inline constexpr const char* phaseLo = "phaseLo";
inline constexpr const char* phaseHi = "phaseHi";
inline constexpr const char* filterMode = "filterMode";   // 0 Zero Latency IIR, 1 Linear Phase FIR
inline constexpr const char* dynMode = "dynMode";         // 0 Sidechain, 1 Difference
inline constexpr const char* scOn = "scOn";
inline constexpr const char* sensitivity = "sensitivity"; // 0..9 dB
inline constexpr const char* fixMain = "fixMain";         // Gain Stage Fix: main channel fader (dB)
inline constexpr const char* fixSc = "fixSc";             // sidechain channel fader (dB)
constexpr int kNodes = 12;
inline juce::String node(int i, const char* what) { return "n" + juce::String(i + 1) + "_" + what; }
// node fields: on, freq, range, thr, q, att, rel, ch, byp, solo
}  // namespace pf::id

namespace pf {
juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();
// band presets for the phase analysis/rotation range
inline void phaseRangePreset(int idx, float& lo, float& hi) {
    switch (idx) { case 0: lo = 20; hi = 200; break; case 1: lo = 200; hi = 2000; break; case 2: lo = 2000; hi = 16000; break; default: break; }
}
}  // namespace pf
