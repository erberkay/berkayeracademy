// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
// Level meter: sample-peak bar (−60…+6 dBFS, peak hold) + momentary / short-term / integrated LUFS readouts.
#pragma once

#include "Theme.h"

namespace pf::ui {

struct MeterValues { float peakDb = -100, momentary = -100, shortTerm = -100, integrated = -100; };

class MeterComponent : public juce::Component, public juce::SettableTooltipClient {
public:
    explicit MeterComponent(juce::String title) : name(std::move(title)) {}
    void set(const MeterValues& v);
    void paint(juce::Graphics&) override;
    bool compact = false;   // bar only (top bar)
private:
    juce::String name;
    MeterValues val;
    float bar = -100, hold = -100;
    int holdFrames = 0;
};

// Level-match indicator: main vs sidechain short-term loudness (after Gain Stage Fix)
class LevelMatch : public juce::Component, public juce::SettableTooltipClient {
public:
    void set(float mainLufs, float scLufs, bool hasSc) { m = mainLufs; s = scLufs; sc = hasSc; repaint(); }
    void paint(juce::Graphics&) override;
private:
    float m = -100, s = -100;
    bool sc = false;
};

}  // namespace pf::ui
