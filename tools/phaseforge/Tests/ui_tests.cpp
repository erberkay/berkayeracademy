// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
// Editor interaction tests: synthesized mouse / keyboard events against the real editor (no host).
// Checks that every gesture documented in UI/FrequencyDisplay.h changes the parameters it claims to, that undo works,
// that the language switch rebuilds the editor, that A/B and the phase buttons reach the processor, and that the
// window scales. Run under a display (xvfb-run on Linux).
#include "../Source/PluginEditor.h"

#include <cstdio>

namespace pf {

struct UiTestAccess {
    static juce::TextButton& lang(EditorContent& c) { return c.langB; }
    static juce::TextButton& slotA(EditorContent& c) { return c.slotA; }
    static juce::TextButton& slotB(EditorContent& c) { return c.slotB; }
    static juce::TextButton& analyze(EditorContent& c) { return c.phase.analyze; }
    static juce::TextButton& resolve(EditorContent& c) { return c.resolve; }
    static ui::NodeStrip& strip(EditorContent& c) { return c.nodeStrip; }
};

}  // namespace pf

using namespace pf;

static int passed = 0, failed = 0;
static void check(bool ok, const char* what, const juce::String& detail = {}) {
    std::printf("  [%s] %s %s\n", ok ? "PASS" : "FAIL", what, detail.toRawUTF8());
    (ok ? passed : failed)++;
}

static void pump(int ms = 30) { juce::MessageManager::getInstance()->runDispatchLoopUntil(ms); }

static juce::MouseEvent ev(juce::Component& c, juce::Point<float> pos, juce::Point<float> down, juce::ModifierKeys mods, int clicks, bool dragged) {
    auto src = juce::Desktop::getInstance().getMainMouseSource();
    const auto now = juce::Time::getCurrentTime();
    return juce::MouseEvent(src, pos, mods, juce::MouseInputSource::defaultPressure, 0, 0, 0, 0, &c, &c, now, down, now, clicks, dragged);
}

static float pv(PhaseForgeProcessor& p, const juce::String& pid) { return p.apvts.getRawParameterValue(pid)->load(); }

int main() {
    juce::ScopedJuceInitialiser_GUI init;
    // keep the user's language / size settings untouched
    const juce::String oldLang = ui::userSettings().getValue("lang", "en");
    const double oldScale = ui::userSettings().getDoubleValue("uiScale", 1.0);
    ui::userSettings().setValue("lang", "en");
    ui::userSettings().setValue("uiScale", 1.0);

    PhaseForgeProcessor p;
    p.setRateAndBufferSizeDetails(48000, 256);
    p.prepareToPlay(48000, 256);
    std::unique_ptr<juce::AudioProcessorEditor> ed(p.createEditor());
    auto* pe = dynamic_cast<PhaseForgeEditor*>(ed.get());
    ed->setVisible(true);
    pump();
    check(pe != nullptr && ed->getWidth() == EditorContent::kW && ed->getHeight() == EditorContent::kH, "editor opens at base size",
          juce::String(ed->getWidth()) + "x" + juce::String(ed->getHeight()));

    std::printf("\nAnalyzer gestures\n");
    auto& d = pe->getContent().analyzer();
    // 1. double-click empty space → node 1 at that frequency / reduction
    auto at = d.pointFor(100.0f, 9.0f);
    d.mouseDoubleClick(ev(d, at, at, {}, 2, false));
    pump();
    check(pv(p, id::node(0, "on")) > 0.5f, "double-click creates node 1");
    check(std::abs(pv(p, id::node(0, "freq")) - 100.0f) < 2.0f, "  at the clicked frequency", juce::String(pv(p, id::node(0, "freq")), 2) + " Hz");
    check(std::abs(pv(p, id::node(0, "range")) - 9.0f) < 0.3f, "  with the clicked reduction", juce::String(pv(p, id::node(0, "range")), 2) + " dB");
    check(d.selectedNode() == 0 && UiTestAccess::strip(pe->getContent()).node() == 0, "  selected, node strip shows it");

    // 2. drag one octave right and 3 dB deeper
    auto from = d.pointFor(100.0f, 9.0f), to = d.pointFor(200.0f, 12.0f);
    d.mouseDown(ev(d, from, from, juce::ModifierKeys::leftButtonModifier, 1, false));
    d.mouseDrag(ev(d, to, from, juce::ModifierKeys::leftButtonModifier, 1, true));
    d.mouseUp(ev(d, to, from, {}, 1, true));
    pump();
    check(std::abs(pv(p, id::node(0, "freq")) - 200.0f) < 4.0f, "drag moves frequency", juce::String(pv(p, id::node(0, "freq")), 1) + " Hz");
    check(std::abs(pv(p, id::node(0, "range")) - 12.0f) < 0.3f, "drag sets reduction", juce::String(pv(p, id::node(0, "range")), 2) + " dB");

    // 3. Shift-drag is fine (15 %)
    from = d.pointFor(200.0f, 12.0f);
    to = d.pointFor(400.0f, 12.0f);
    d.mouseDown(ev(d, from, from, juce::ModifierKeys(juce::ModifierKeys::leftButtonModifier | juce::ModifierKeys::shiftModifier), 1, false));
    d.mouseDrag(ev(d, to, from, juce::ModifierKeys(juce::ModifierKeys::leftButtonModifier | juce::ModifierKeys::shiftModifier), 1, true));
    d.mouseUp(ev(d, to, from, juce::ModifierKeys::shiftModifier, 1, true));
    const float fine = pv(p, id::node(0, "freq"));
    check(std::abs(fine - 200.0f * std::pow(2.0f, 0.15f)) < 4.0f, "shift-drag is fine (0.15 oct for 1 oct of mouse)", juce::String(fine, 1) + " Hz");

    // 4. wheel on the node = Q
    const float q0 = pv(p, id::node(0, "q"));
    const auto np = d.pointFor(fine, 12.0f);
    juce::MouseWheelDetails w{0, 1.0f, false, false, false};
    d.mouseWheelMove(ev(d, np, np, {}, 0, false), w);
    check(pv(p, id::node(0, "q")) > q0 * 1.1f, "wheel on node raises Q", juce::String(q0, 2) + " -> " + juce::String(pv(p, id::node(0, "q")), 2));

    // 5. second node, rubber-band select both, drag moves both
    at = d.pointFor(1000.0f, 6.0f);
    d.mouseDoubleClick(ev(d, at, at, {}, 2, false));
    check(pv(p, id::node(1, "on")) > 0.5f, "second double-click creates node 2");
    const float f0 = pv(p, id::node(0, "freq")), f1 = pv(p, id::node(1, "freq"));
    auto la = d.pointFor(60.0f, 1.0f), lb = d.pointFor(3000.0f, 15.0f);
    d.mouseDown(ev(d, la, la, juce::ModifierKeys::leftButtonModifier, 1, false));
    d.mouseDrag(ev(d, lb, la, juce::ModifierKeys::leftButtonModifier, 1, true));
    d.mouseUp(ev(d, lb, la, {}, 1, true));
    check(d.selectedNodes().size() == 2, "rubber band selects both nodes", juce::String(d.selectedNodes().size()));
    from = d.pointFor(f1, pv(p, id::node(1, "range")));
    to = from.translated(d.pointFor(200.0f, 0).x - d.pointFor(100.0f, 0).x, 0);   // + 1 octave
    d.mouseDown(ev(d, from, from, juce::ModifierKeys::leftButtonModifier, 1, false));
    d.mouseDrag(ev(d, to, from, juce::ModifierKeys::leftButtonModifier, 1, true));
    d.mouseUp(ev(d, to, from, {}, 1, true));
    check(std::abs(pv(p, id::node(0, "freq")) / f0 - 2.0f) < 0.05f && std::abs(pv(p, id::node(1, "freq")) / f1 - 2.0f) < 0.05f,
          "dragging one moves the whole selection", juce::String(pv(p, id::node(0, "freq")) / f0, 3) + ", " + juce::String(pv(p, id::node(1, "freq")) / f1, 3));

    // 6. Delete key removes the selection; undo brings it back
    pump(400);   // APVTS writes parameter changes into the undo history from its own timer
    d.keyPressed(juce::KeyPress(juce::KeyPress::deleteKey));
    pump(400);
    check(pv(p, id::node(0, "on")) < 0.5f && pv(p, id::node(1, "on")) < 0.5f, "Delete removes the selected nodes");
    p.undo.undo();
    pump(400);
    check(pv(p, id::node(0, "on")) > 0.5f && pv(p, id::node(1, "on")) > 0.5f, "undo restores them");

    // 7. wheel on empty space zooms; 'R' resets (the node keeps its frequency, only its x position changes)
    const float xBefore = d.pointFor(1000.0f, 0).x;
    auto empty = d.pointFor(5000.0f, 17.0f);
    d.mouseWheelMove(ev(d, empty, empty, {}, 0, false), w);
    const float xZoom = d.pointFor(1000.0f, 0).x;
    d.keyPressed(juce::KeyPress('r'));
    check(std::abs(xZoom - xBefore) > 5.0f && std::abs(d.pointFor(1000.0f, 0).x - xBefore) < 0.01f, "wheel zooms, R resets",
          juce::String(xBefore, 1) + " -> " + juce::String(xZoom, 1));

    std::printf("\nNode strip\n");
    d.selectNode(1);
    auto& strip = UiTestAccess::strip(pe->getContent());
    check(strip.node() == 1, "selecting node 2 rebinds the strip");

    std::printf("\nButtons\n");
    UiTestAccess::slotB(pe->getContent()).triggerClick();
    pump(80);
    check(p.isB(), "B button switches to slot B");
    UiTestAccess::slotA(pe->getContent()).triggerClick();
    pump(80);
    check(!p.isB(), "A button switches back");
    UiTestAccess::analyze(pe->getContent()).triggerClick();
    pump(120);
    check(p.getPhaseResult().state == AnalysisState::Waiting, "ANALYZE PHASE starts listening");
    UiTestAccess::analyze(pe->getContent()).triggerClick();
    pump(150);
    check(p.getPhaseResult().state != AnalysisState::Waiting, "second click cancels");
    UiTestAccess::resolve(pe->getContent()).triggerClick();
    pump(120);
    check(p.getResolveResult().state == AnalysisState::Waiting, "RESOLVE CONFLICTS starts listening");
    UiTestAccess::resolve(pe->getContent()).triggerClick();
    pump(150);
    check(p.getResolveResult().state != AnalysisState::Waiting, "second click cancels");

    std::printf("\nLanguage + scaling\n");
    auto* before = &pe->getContent();
    UiTestAccess::lang(*before).triggerClick();
    pump(150);
    check(ui::isTurkish() && &pe->getContent() != before, "EN -> TR rebuilds the editor content");
    check(UiTestAccess::lang(pe->getContent()).getButtonText() == "TR", "  switch shows TR");
    UiTestAccess::lang(pe->getContent()).triggerClick();
    pump(150);
    check(!ui::isTurkish(), "TR -> EN");
    check(pv(p, id::node(0, "on")) > 0.5f, "rebuild keeps the session (nodes untouched)");

    ed->setSize(EditorContent::kW * 3 / 2, EditorContent::kH * 3 / 2);
    pump();
    const auto t = pe->getContent().getTransform();
    check(std::abs(t.mat00 - 1.5f) < 1e-3f && std::abs(t.mat11 - 1.5f) < 1e-3f, "150 % window scales the content", juce::String(t.mat00, 3));
    auto img = ed->createComponentSnapshot(ed->getLocalBounds(), true, 1.0f);
    check(img.getWidth() == EditorContent::kW * 3 / 2, "renders at 150 %");

    ed.reset();
    ui::userSettings().setValue("lang", oldLang);
    ui::userSettings().setValue("uiScale", oldScale);
    ui::userSettings().saveIfNeeded();
    std::printf("\n%d passed, %d failed\n", passed, failed);
    return failed == 0 ? 0 : 1;
}
