// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
// Editor. Everything is laid out once at a fixed base size (EditorContent::kW × kH) and scaled as a whole with an
// affine transform, so the window can be resized freely (fixed aspect ratio) without re-layout glitches.
// English by default; the EN | TR switch rebuilds the content in the other language.
//
//   ┌ top bar: brand · presets · A | B · copy · undo/redo · in/out meters · BYPASS · EN|TR · settings ┐
//   │ FrequencyDisplay (spectra, conflicts, nodes)                       │ PhasePanel (rotate / match) │
//   │ node strip: the selected node's controls                                                          │
//   └ Dynamics (Sensitivity · RESOLVE · mode · sidechain · mix · delta) │ Processing │ Gain │ Loudness ┘
#pragma once

#include "PluginProcessor.h"
#include "UI/FrequencyDisplay.h"
#include "UI/MeterComponent.h"
#include "UI/PhasePanel.h"
#include "UI/Theme.h"

namespace pf {

namespace ui {
// titled card background
class Card : public juce::Component {
public:
    explicit Card(juce::String t = {}) : title(std::move(t)) { setInterceptsMouseClicks(false, false); }
    void paint(juce::Graphics&) override;
    juce::String title;
};

// controls of the node selected in the analyzer (rebinds its knobs when the selection changes)
class NodeStrip : public juce::Component {
public:
    explicit NodeStrip(PhaseForgeProcessor& p);
    void setNode(int i);
    int node() const { return current; }
    void paint(juce::Graphics&) override;
    void resized() override;
    std::function<void()> onDelete;
private:
    PhaseForgeProcessor& proc;
    int current = -1;
    Knob freq, range, thr, q, att, rel;
    Segmented ch;
    PillToggle solo, byp;
    juce::TextButton del, listen;
};
}  // namespace ui

struct UiTestAccess;   // Tests/ui_tests.cpp

class EditorContent : public juce::Component, private juce::Timer {
    friend struct UiTestAccess;
public:
    static constexpr int kW = 1280, kH = 820;
    explicit EditorContent(PhaseForgeProcessor& p);
    ~EditorContent() override;
    void paint(juce::Graphics&) override;
    void resized() override;
    bool keyPressed(const juce::KeyPress&) override;
    void mouseDown(const juce::MouseEvent&) override;
    std::function<void()> onLanguage;            // language switched → owner rebuilds the content
    std::function<void(float)> onScale;          // UI scale chosen from the settings menu
    ui::FrequencyDisplay& analyzer() { return display; }

private:
    void timerCallback() override;
    void fillPresets();
    void presetChosen();
    void savePreset();
    void settingsMenu();

    PhaseForgeProcessor& proc;
    juce::SharedResourcePointer<ui::Look> look;
    // top bar
    juce::ComboBox presets;
    juce::TextButton savePre, slotA, slotB, copyAB, undoB, redoB, langB, menuB;
    ui::PillToggle bypass;
    ui::MeterComponent inTop{"IN"}, outTop{"OUT"};
    juce::Array<juce::File> userFiles;
    // centre
    ui::FrequencyDisplay display;
    ui::PhasePanel phase;
    ui::NodeStrip nodeStrip;
    // bottom
    ui::Card cDyn, cProc, cGain, cLoud;
    ui::Knob sensitivity, mix, fixMain, fixSc, inGain, outGain;
    juce::TextButton resolve;
    juce::Label resolveStatus, latency, fixNote;
    ui::Segmented dynMode, filterMode;
    ui::PillToggle scOn, delta;
    ui::MeterComponent mIn, mOut, mSc;
    ui::LevelMatch levelMatch;
    juce::TooltipWindow tooltips{this, 700};
    std::unique_ptr<juce::FileChooser> chooser;
    bool resolveWaiting = false;
    std::uint64_t resolveShown = ~0ull;
};

class PhaseForgeEditor : public juce::AudioProcessorEditor {
public:
    explicit PhaseForgeEditor(PhaseForgeProcessor& p);
    ~PhaseForgeEditor() override;
    void paint(juce::Graphics& g) override { g.fillAll(ui::col::bg); }
    void resized() override;
    EditorContent& getContent() { return *content; }

private:
    void build();
    PhaseForgeProcessor& proc;
    std::unique_ptr<EditorContent> content;
};

}  // namespace pf
