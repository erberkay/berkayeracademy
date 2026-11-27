// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
// Right-hand phase panel: Rotate | Match, the angle (or blend) knob, the analysis band, ANALYZE PHASE → result
// (status, confidence, score curve or correction curve) → APPLY. Everything shown comes from the processor's
// published PhaseResult; nothing is applied without the user pressing APPLY.
#pragma once

#include "../PluginProcessor.h"
#include "Theme.h"

namespace pf::ui {

// score-vs-angle curve (Rotate) or correction-vs-frequency curve (Match)
class PhaseCurve : public juce::Component {
public:
    void paint(juce::Graphics&) override;
    void setRotate(const std::vector<float>& c, double bestDeg, double currentDeg, bool valid);
    void setMatch(const std::vector<float>& hz, const std::vector<float>& deg, const std::vector<float>& weight, double lo, double hi);
    void clear() { mode = 0; repaint(); }
private:
    int mode = 0;   // 0 empty, 1 rotate, 2 match
    std::vector<float> a, b, w;
    double best = 0, cur = 0, lo = 20, hi = 200;
    bool ok = false;
};

}  // namespace pf::ui
namespace pf { struct UiTestAccess; }
namespace pf::ui {

class PhasePanel : public juce::Component, private juce::Timer {
    friend struct pf::UiTestAccess;
public:
    explicit PhasePanel(PhaseForgeProcessor& p);
    ~PhasePanel() override;
    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;
    void refreshResult(const PhaseResult& r);
    juce::String statusText(const PhaseResult& r) const;

    PhaseForgeProcessor& proc;
    PillToggle power;
    Segmented mode, range;
    Knob angle, blend, lo, hi;
    juce::TextButton analyze, apply, clearMatch;
    PhaseCurve curve;
    juce::Label status, detail;
    std::uint64_t shownId = ~0ull;
    float progress = 0;
    bool waiting = false, isMatch = false, custom = false;
    double confidence = -1;
    juce::Rectangle<int> confBar;
};

}  // namespace pf::ui
