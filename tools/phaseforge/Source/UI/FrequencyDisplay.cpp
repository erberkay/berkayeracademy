// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
#include "FrequencyDisplay.h"

#include "../Parameters/ParameterLayout.h"

namespace pf::ui {

static constexpr float kDbTop = 0.0f, kDbBottom = -96.0f, kGrMax = 18.0f;

FrequencyDisplay::FrequencyDisplay(PhaseForgeProcessor& p) : proc(p) {
    setWantsKeyboardFocus(true);
    setTitle(L("Frequency analyzer", "Frekans analizörü"));
    setDescription(L("Grey: main input · white: sidechain · red: mid conflict · yellow: side conflict · cyan: live reduction. "
                     "Double-click to add a node, drag to move, wheel on a node = Q, right-click = options.",
                     "Gri: ana giriş · beyaz: sidechain · kırmızı: mid çakışma · sarı: side çakışma · camgöbeği: anlık azaltma. "
                     "Düğüm eklemek için çift tıkla, taşımak için sürükle, düğümde tekerlek = Q, sağ tık = seçenekler."));
    startTimerHz(30);
}

FrequencyDisplay::~FrequencyDisplay() { stopTimer(); }

void FrequencyDisplay::resized() { plot = getLocalBounds().toFloat().reduced(46, 14).withTrimmedBottom(16).withTrimmedRight(6); }

float FrequencyDisplay::xOfHz(float hz) const { return plot.getX() + std::log(hz / fMin) / std::log(fMax / fMin) * plot.getWidth(); }
float FrequencyDisplay::hzOfX(float x) const { return juce::jlimit(20.0f, 20000.0f, fMin * std::pow(fMax / fMin, (x - plot.getX()) / plot.getWidth())); }
float FrequencyDisplay::yOfDb(float db) const { return plot.getY() + (kDbTop - juce::jlimit(kDbBottom, kDbTop, db)) / (kDbTop - kDbBottom) * plot.getHeight(); }
float FrequencyDisplay::yOfGr(float gr) const { return plot.getY() + juce::jlimit(0.0f, kGrMax, gr) / kGrMax * plot.getHeight() * 0.55f; }
float FrequencyDisplay::grOfY(float y) const { return juce::jlimit(0.0f, kGrMax, (y - plot.getY()) / (plot.getHeight() * 0.55f) * kGrMax); }

float FrequencyDisplay::param(int i, const char* what) const {
    if (auto* v = proc.apvts.getRawParameterValue(id::node(i, what))) return v->load();
    return 0.0f;
}

void FrequencyDisplay::setParam(int i, const char* what, float v) {
    if (auto* prm = proc.apvts.getParameter(id::node(i, what))) prm->setValueNotifyingHost(prm->convertTo0to1(v));
}

juce::Point<float> FrequencyDisplay::nodePos(int i) const { return {xOfHz(param(i, "freq")), yOfGr(param(i, "range"))}; }

int FrequencyDisplay::hitNode(juce::Point<float> p) const {
    for (int i = id::kNodes - 1; i >= 0; --i)
        if (nodeOn(i) && nodePos(i).getDistanceFrom(p) < 11.0f) return i;
    return -1;
}

void FrequencyDisplay::selectNode(int i) {
    selection.clearQuick();
    if (i >= 0) selection.add(i);
    primary = i;
    if (onSelectionChanged) onSelectionChanged(i);
    repaint();
}

int FrequencyDisplay::createNode(float hz) {
    for (int i = 0; i < id::kNodes; ++i) {
        if (nodeOn(i)) continue;
        proc.undo.beginNewTransaction("Add node");
        for (auto [w, v] : {std::pair<const char*, float>{"freq", hz}, {"range", 6.0f}, {"thr", -30.0f}, {"q", 1.5f}, {"att", 5.0f},
                            {"rel", 80.0f}, {"ch", 0.0f}, {"byp", 0.0f}, {"solo", 0.0f}, {"on", 1.0f}})
            setParam(i, w, v);
        return i;
    }
    return -1;
}

void FrequencyDisplay::deleteNodes(const juce::Array<int>& ids) {
    proc.undo.beginNewTransaction("Delete nodes");
    for (int i : ids) { setParam(i, "on", 0.0f); setParam(i, "solo", 0.0f); }
    selectNode(-1);
}

void FrequencyDisplay::nodeMenu(int i) {
    juce::PopupMenu m;
    m.addItem(1, "Solo", true, param(i, "solo") > 0.5f);
    m.addItem(2, "Bypass", true, param(i, "byp") > 0.5f);
    juce::PopupMenu ch;
    ch.addItem(10, "Stereo", true, juce::roundToInt(param(i, "ch")) == 0);
    ch.addItem(11, "Mid", true, juce::roundToInt(param(i, "ch")) == 1);
    ch.addItem(12, "Side", true, juce::roundToInt(param(i, "ch")) == 2);
    m.addSubMenu(L("Channel", "Kanal"), ch);
    m.addSeparator();
    m.addItem(3, L("Delete", "Sil"));
    m.showMenuAsync(juce::PopupMenu::Options().withTargetScreenArea(localAreaToGlobal(juce::Rectangle<int>(4, 4).withCentre(nodePos(i).toInt()))),
                    [sp = juce::Component::SafePointer<FrequencyDisplay>(this), i](int r) {
                        if (!sp) return;
                        if (r == 1) sp->setParam(i, "solo", sp->param(i, "solo") > 0.5f ? 0.0f : 1.0f);
                        if (r == 2) sp->setParam(i, "byp", sp->param(i, "byp") > 0.5f ? 0.0f : 1.0f);
                        if (r >= 10 && r <= 12) sp->setParam(i, "ch", (float) (r - 10));
                        if (r == 3) sp->deleteNodes({i});
                    });
}

void FrequencyDisplay::timerCallback() {
    if (proc.getSpectrum(frame)) hasFrame = frame.hz.size() > 2;
    for (int i = 0; i < id::kNodes; ++i) liveGr[i] = proc.nodeReductionDb(i);
    repaint();
}

void FrequencyDisplay::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 12);
    // grid
    g.setFont(juce::FontOptions(10.5f));
    for (float hz : {20.f, 30.f, 40.f, 50.f, 60.f, 80.f, 100.f, 200.f, 300.f, 500.f, 1000.f, 2000.f, 3000.f, 5000.f, 10000.f, 20000.f}) {
        if (hz < fMin || hz > fMax) continue;
        const float x = xOfHz(hz);
        const bool major = hz == 100.f || hz == 1000.f || hz == 10000.f;
        g.setColour(major ? col::line : col::grid);
        g.drawVerticalLine((int) x, plot.getY(), plot.getBottom());
        g.setColour(col::fgFaint);
        g.drawText(hz >= 1000 ? juce::String((int) (hz / 1000)) + "k" : juce::String((int) hz), (int) x - 16, (int) plot.getBottom() + 3, 32, 12,
                   juce::Justification::centred);
    }
    for (float db : {0.f, -12.f, -24.f, -36.f, -48.f, -60.f, -72.f, -84.f}) {
        g.setColour(col::grid);
        g.drawHorizontalLine((int) yOfDb(db), plot.getX(), plot.getRight());
        g.setColour(col::fgFaint);
        g.drawText(fmtNum(db, 0), (int) plot.getX() - 40, (int) yOfDb(db) - 6, 34, 12, juce::Justification::centredRight);
    }
    // right-hand reduction scale
    for (float gr : {0.f, 6.f, 12.f, 18.f}) {
        g.setColour(col::reduction.withAlpha(0.7f));
        g.drawText(fmtNum(-gr, 0), (int) plot.getRight() - 30, (int) yOfGr(gr) - 6, 28, 12, juce::Justification::centredRight);
    }
    g.saveState();
    g.reduceClipRegion(plot.toNearestInt());
    if (hasFrame) {
        auto pathOf = [&](const std::vector<float>& v, bool close) {
            juce::Path p;
            bool started = false;
            for (size_t k = 0; k < frame.hz.size() && k < v.size(); ++k) {
                const float hz = frame.hz[k];
                if (hz < fMin * 0.9f || hz > fMax * 1.1f) continue;
                const float x = xOfHz(hz), y = yOfDb(v[k]);
                if (!started) { p.startNewSubPath(x, close ? plot.getBottom() : y); if (close) p.lineTo(x, y); started = true; }
                else p.lineTo(x, y);
            }
            if (close && started) { p.lineTo(p.getCurrentPosition().x, plot.getBottom()); p.closeSubPath(); }
            return p;
        };
        // conflicts as bars from the bottom (intensity → height), mid red, side yellow
        auto conflictBars = [&](const std::vector<float>& c, juce::Colour colr) {
            for (size_t k = 0; k + 1 < frame.hz.size() && k < c.size(); ++k) {
                if (c[k] < 0.05f) continue;
                const float x0 = xOfHz(frame.hz[k]), x1 = xOfHz(frame.hz[k + 1]);
                const float h = c[k] * plot.getHeight() * 0.25f;
                g.setColour(colr.withAlpha(0.10f + 0.40f * c[k]));
                g.fillRect(juce::Rectangle<float>(x0, plot.getBottom() - h, std::max(1.0f, x1 - x0), h));
            }
        };
        conflictBars(frame.conflictSide, col::conflictSide);
        conflictBars(frame.conflictMid, col::conflictMid);
        // main input (grey, filled), sidechain (white line)
        std::vector<float> mainSum(frame.mainMid.size()), scSum(frame.scMid.size());
        for (size_t k = 0; k < mainSum.size(); ++k)
            mainSum[k] = 10.0f * std::log10(std::pow(10.0f, frame.mainMid[k] / 10.0f) + std::pow(10.0f, (k < frame.mainSide.size() ? frame.mainSide[k] : -150.0f) / 10.0f) + 1e-20f);
        for (size_t k = 0; k < scSum.size(); ++k)
            scSum[k] = 10.0f * std::log10(std::pow(10.0f, frame.scMid[k] / 10.0f) + std::pow(10.0f, (k < frame.scSide.size() ? frame.scSide[k] : -150.0f) / 10.0f) + 1e-20f);
        g.setColour(col::mainSpec.withAlpha(0.22f));
        g.fillPath(pathOf(mainSum, true));
        g.setColour(col::mainSpec);
        g.strokePath(pathOf(mainSum, false), juce::PathStrokeType(1.4f));
        if (frame.hasSidechain) {
            g.setColour(col::scSpec.withAlpha(0.9f));
            g.strokePath(pathOf(scSum, false), juce::PathStrokeType(1.6f));
        }
        // peak labels (largest 3 of each)
        g.setFont(juce::FontOptions(10.5f, juce::Font::bold));
        auto labelPeaks = [&](const std::vector<int>& pk, const std::vector<float>& lvl, juce::Colour c) {
            int shown = 0;
            for (int idx : pk) {
                if (idx < 0 || idx >= (int) frame.hz.size() || shown >= 3) continue;
                const float x = xOfHz(frame.hz[(size_t) idx]), y = yOfDb(lvl[(size_t) idx]);
                if (!plot.contains(x, y)) continue;
                bool nearNode = false;   // keep the node markers readable
                for (int n = 0; n < id::kNodes; ++n) nearNode = nearNode || (nodeOn(n) && nodePos(n).getDistanceFrom({x, y - 10}) < 30.0f);
                if (nearNode) continue;
                g.setColour(c);
                g.drawText(fmtHz(frame.hz[(size_t) idx]), (int) x - 30, (int) y - 16, 60, 12, juce::Justification::centred);
                ++shown;
            }
        };
        labelPeaks(frame.peaksMain, mainSum, col::mainSpec);
        if (frame.hasSidechain) labelPeaks(frame.peaksSc, scSum, col::scSpec);
    } else {
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(14.0f));
        g.drawText(L("Play audio to see the spectra", "Spektrumları görmek için çal"), plot, juce::Justification::centred);
    }
    // live gain-reduction overlay (cyan, hanging from the top)
    {
        juce::Path gr;
        bool any = false;
        const int N = 240;
        for (int k = 0; k <= N; ++k) {
            const float hz = fMin * std::pow(fMax / fMin, k / (float) N);
            const float v = proc.totalReductionDbAt(hz);
            any = any || v > 0.05f;
            const float x = xOfHz(hz), y = yOfGr(v);
            if (k == 0) { gr.startNewSubPath(x, plot.getY()); gr.lineTo(x, y); } else gr.lineTo(x, y);
        }
        gr.lineTo(plot.getRight(), plot.getY());
        gr.closeSubPath();
        if (any) {
            g.setColour(col::reduction.withAlpha(0.18f));
            g.fillPath(gr);
            g.setColour(col::reduction.withAlpha(0.8f));
            g.strokePath(gr, juce::PathStrokeType(1.2f));
        }
    }
    // nodes
    for (int i = 0; i < id::kNodes; ++i) {
        if (!nodeOn(i)) continue;
        const auto p = nodePos(i);
        const bool sel = selection.contains(i), byp = param(i, "byp") > 0.5f, solo = param(i, "solo") > 0.5f;
        const int ch = juce::roundToInt(param(i, "ch"));
        // live reduction ring
        const float gr = liveGr[i], rr = 9.0f + std::min(10.0f, gr * 0.9f);
        if (gr > 0.1f && !byp) { g.setColour(col::reduction.withAlpha(0.35f)); g.drawEllipse(p.x - rr, p.y - rr, rr * 2, rr * 2, 2.0f); }
        g.setColour(byp ? col::fgFaint : sel ? col::accentHi : col::accent);
        g.fillEllipse(p.x - 8, p.y - 8, 16, 16);
        g.setColour(sel ? juce::Colours::white : col::bg);
        g.drawEllipse(p.x - 8, p.y - 8, 16, 16, 1.5f);
        g.setColour(juce::Colours::white);
        g.setFont(juce::FontOptions(10.0f, juce::Font::bold));
        g.drawText(juce::String(i + 1), juce::Rectangle<float>(16, 16).withCentre(p), juce::Justification::centred);
        if (ch != 0 || solo) {
            g.setColour(ch == 1 ? col::conflictMid : ch == 2 ? col::conflictSide : col::fgSoft);
            g.drawText(solo ? "S" : ch == 1 ? "M" : "S̶", juce::Rectangle<float>(18, 12).withCentre(p.translated(0, 15)), juce::Justification::centred);
        }
    }
    if (drag == Drag::Lasso) {
        auto lr = juce::Rectangle<float>(dragStart, lassoEnd);
        g.setColour(col::accent.withAlpha(0.15f));
        g.fillRect(lr);
        g.setColour(col::accentHi);
        g.drawRect(lr, 1.0f);
    }
    g.restoreState();
    // hover cursor readout
    if (plot.contains(hover)) {
        g.setColour(col::fg.withAlpha(0.35f));
        g.drawVerticalLine((int) hover.x, plot.getY(), plot.getBottom());
        const float hz = hzOfX(hover.x);
        const float db = kDbTop - (hover.y - plot.getY()) / plot.getHeight() * (kDbTop - kDbBottom);
        g.setColour(col::fg);
        g.setFont(juce::FontOptions(11.5f, juce::Font::bold));
        g.drawText(fmtHz(hz) + "  " + fmtNum(db, 1) + " dB", (int) plot.getRight() - 170, (int) plot.getY() + 4, 164, 14, juce::Justification::centredRight);
    }
    g.setColour(hasKeyboardFocus(false) ? col::accent.withAlpha(0.6f) : col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 12, 1.0f);
}

void FrequencyDisplay::mouseDown(const juce::MouseEvent& e) {
    grabKeyboardFocus();
    const int hit = hitNode(e.position);
    if (e.mods.isPopupMenu() && hit >= 0) { selectNode(hit); nodeMenu(hit); return; }
    if (hit >= 0) {
        if (e.mods.isCommandDown() || e.mods.isShiftDown()) { if (!selection.contains(hit)) selection.add(hit); }
        else if (!selection.contains(hit)) selection = {hit};
        primary = hit;
        if (onSelectionChanged) onSelectionChanged(hit);
        drag = Drag::Nodes;
        dragStart = e.position;
        starts.clear();
        for (int i : selection) starts.push_back({i, param(i, "freq"), param(i, "range")});
        proc.undo.beginNewTransaction("Move nodes");
        for (auto& s : starts) for (auto* w : {"freq", "range"}) if (auto* prm = proc.apvts.getParameter(id::node(s.id, w))) prm->beginChangeGesture();
        gesture = true;
    } else {
        drag = Drag::Lasso;
        dragStart = lassoEnd = e.position;
        if (!e.mods.isShiftDown()) selection.clearQuick();
    }
    repaint();
}

void FrequencyDisplay::mouseDrag(const juce::MouseEvent& e) {
    if (drag == Drag::Nodes) {
        const float k = e.mods.isShiftDown() ? 0.15f : 1.0f;
        const float dOct = (e.position.x - dragStart.x) / plot.getWidth() * std::log2(fMax / fMin) * k;
        const float dGr = grOfY(dragStart.y + (e.position.y - dragStart.y) * k) - grOfY(dragStart.y);
        for (auto& s : starts) {
            setParam(s.id, "freq", juce::jlimit(20.0f, 20000.0f, s.hz * std::pow(2.0f, dOct)));
            setParam(s.id, "range", juce::jlimit(0.0f, kGrMax, s.range + dGr));
        }
    } else if (drag == Drag::Lasso) {
        lassoEnd = e.position;
        const auto lr = juce::Rectangle<float>(dragStart, lassoEnd);
        selection.clearQuick();
        for (int i = 0; i < id::kNodes; ++i) if (nodeOn(i) && lr.contains(nodePos(i))) selection.add(i);
    }
    repaint();
}

void FrequencyDisplay::mouseUp(const juce::MouseEvent&) {
    if (gesture) {
        for (auto& s : starts) for (auto* w : {"freq", "range"}) if (auto* prm = proc.apvts.getParameter(id::node(s.id, w))) prm->endChangeGesture();
        gesture = false;
    }
    if (drag == Drag::Lasso) {
        primary = selection.isEmpty() ? -1 : selection.getFirst();
        if (onSelectionChanged) onSelectionChanged(primary);
    }
    drag = Drag::None;
    repaint();
}

void FrequencyDisplay::mouseMove(const juce::MouseEvent& e) { hover = e.position; }
void FrequencyDisplay::mouseExit(const juce::MouseEvent&) { hover = {-1, -1}; }

void FrequencyDisplay::mouseDoubleClick(const juce::MouseEvent& e) {
    if (!plot.contains(e.position)) { fMin = 20.0f; fMax = 20000.0f; repaint(); return; }
    const int hit = hitNode(e.position);
    if (hit >= 0) return;
    const int n = createNode(hzOfX(e.position.x));
    if (n >= 0) {
        setParam(n, "range", juce::jlimit(0.5f, kGrMax, grOfY(e.position.y)));
        selectNode(n);
    }
}

void FrequencyDisplay::mouseWheelMove(const juce::MouseEvent& e, const juce::MouseWheelDetails& w) {
    const int hit = hitNode(e.position);
    if (hit >= 0) {
        const float q = param(hit, "q") * std::pow(1.15f, w.deltaY > 0 ? 1.0f : -1.0f);
        setParam(hit, "q", juce::jlimit(0.1f, 20.0f, q));
        return;
    }
    const float c = hzOfX(e.position.x), z = w.deltaY > 0 ? 0.85f : 1.0f / 0.85f;
    const float lo = std::max(20.0f, c * std::pow(fMin / c, z)), hi = std::min(20000.0f, c * std::pow(fMax / c, z));
    if (hi / lo > 4.0f) { fMin = lo; fMax = hi; }
    repaint();
}

bool FrequencyDisplay::keyPressed(const juce::KeyPress& k) {
    if ((k == juce::KeyPress::deleteKey || k == juce::KeyPress::backspaceKey) && !selection.isEmpty()) { deleteNodes(selection); return true; }
    if (k.getTextCharacter() == 'r' || k.getTextCharacter() == 'R' || k.getKeyCode() == 'r' || k.getKeyCode() == 'R') { fMin = 20.0f; fMax = 20000.0f; repaint(); return true; }
    return false;
}

}  // namespace pf::ui
