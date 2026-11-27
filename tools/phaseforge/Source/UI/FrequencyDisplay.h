// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
// Central analyzer: main (grey) and sidechain (white) spectra, mid (red) / side (yellow) conflict intensity, live gain-reduction
// overlay, and the interactive dynamic-EQ nodes. Pure drawing + parameter edits — all analysis comes from the processor.
//
// Node gestures: double-click empty space = new node · drag = frequency (x) and reduction amount (y, right-hand scale) ·
// Shift-drag = fine · mouse wheel on a node = Q · drag on empty space = rubber-band multi-select (dragging any selected node
// moves the whole selection) · right-click a node = menu (solo, bypass, Mid/Side, delete) · Delete/Backspace = delete selection ·
// mouse wheel on empty space = frequency zoom around the cursor · double-click the axis strip = reset zoom.
#pragma once

#include "../PluginProcessor.h"
#include "Theme.h"

namespace pf::ui {

class FrequencyDisplay : public juce::Component, private juce::Timer {
public:
    explicit FrequencyDisplay(PhaseForgeProcessor& p);
    ~FrequencyDisplay() override;
    void paint(juce::Graphics&) override;
    void resized() override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;
    void mouseUp(const juce::MouseEvent&) override;
    void mouseMove(const juce::MouseEvent&) override;
    void mouseExit(const juce::MouseEvent&) override;
    void mouseDoubleClick(const juce::MouseEvent&) override;
    void mouseWheelMove(const juce::MouseEvent&, const juce::MouseWheelDetails&) override;
    bool keyPressed(const juce::KeyPress&) override;

    int selectedNode() const { return primary; }
    void selectNode(int i);
    std::function<void(int)> onSelectionChanged;  // primary node (−1 none)
    const juce::Array<int>& selectedNodes() const { return selection; }
    // local coordinates of (frequency, reduction) — for tests and accessibility helpers
    juce::Point<float> pointFor(float hz, float reductionDb) const { return {xOfHz(hz), yOfGr(reductionDb)}; }

private:
    void timerCallback() override;
    float xOfHz(float hz) const;
    float hzOfX(float x) const;
    float yOfDb(float db) const;       // spectrum scale (left)
    float yOfGr(float grDb) const;     // reduction scale (right): 0 dB at top band, −18 at bottom
    float grOfY(float y) const;
    juce::Point<float> nodePos(int i) const;
    int hitNode(juce::Point<float> p) const;
    float param(int i, const char* what) const;
    void setParam(int i, const char* what, float v);
    bool nodeOn(int i) const { return param(i, "on") > 0.5f; }
    int createNode(float hz);
    void deleteNodes(const juce::Array<int>& ids);
    void nodeMenu(int i);

    PhaseForgeProcessor& proc;
    SpectrumFrame frame;
    bool hasFrame = false;
    juce::Rectangle<float> plot;
    float fMin = 20.0f, fMax = 20000.0f;
    juce::Array<int> selection;
    int primary = -1;
    // dragging
    enum class Drag { None, Nodes, Lasso } drag = Drag::None;
    juce::Point<float> dragStart, lassoEnd;
    struct Start { int id; float hz, range; };
    std::vector<Start> starts;
    bool gesture = false;
    juce::Point<float> hover{-1, -1};
    float liveGr[16] = {};
};

}  // namespace pf::ui
