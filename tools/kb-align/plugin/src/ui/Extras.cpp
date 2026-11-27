// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Extras.h"

namespace kb::ui {

// ───────────────────────────── SegmentedChoice
SegmentedChoice::SegmentedChoice(juce::AudioProcessorValueTreeState& s, const char* id, const juce::StringArray& labels,
                                 const juce::StringArray& tips) {
    auto* prm = s.getParameter(id);
    setTitle(prm->getName(64));
    for (int i = 0; i < labels.size(); ++i) {
        auto* b = buttons.add(new juce::TextButton(labels[i]));
        b->setClickingTogglesState(false);
        b->setRadioGroupId(0x5e9);
        b->setTitle(labels[i]);
        if (i < tips.size()) b->setTooltip(tips[i]);
        b->onClick = [this, i] { if (att) att->setValueAsCompleteGesture((float) i); };
        addAndMakeVisible(b);
    }
    att = std::make_unique<juce::ParameterAttachment>(*prm, [this](float v) { sync(v); }, nullptr);
    att->sendInitialUpdate();
}

void SegmentedChoice::sync(float v) {
    const int sel = juce::roundToInt(v);
    for (int i = 0; i < buttons.size(); ++i) buttons[i]->setToggleState(i == sel, juce::dontSendNotification);
    repaint();
}

void SegmentedChoice::resized() {
    auto r = getLocalBounds();
    const int n = buttons.size();
    for (int i = 0; i < n; ++i) {
        const int w = r.getWidth() / (n - i);
        buttons[i]->setBounds(r.removeFromLeft(w).reduced(2, 0));
    }
}

void SegmentedChoice::paint(juce::Graphics& g) {
    g.setColour(col::panel);
    g.fillRoundedRectangle(getLocalBounds().toFloat(), (float) getHeight() / 2);
}

// ───────────────────────────── LevelMeter
void LevelMeter::push(float peak) {
    level = std::max(peak, level * 0.86f);
    if (peak >= hold) { hold = peak; holdFrames = 45; }
    else if (--holdFrames < 0) hold *= 0.93f;
    repaint();
}

void LevelMeter::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    auto lab = r.removeFromBottom(14);
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(10.5f));
    g.drawText(label, lab, juce::Justification::centred);
    auto bar = r.reduced(r.getWidth() * 0.28f, 0);
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(bar, 3);
    auto toY = [&](float lin) {
        const float db = juce::Decibels::gainToDecibels(lin, -60.0f);
        return bar.getBottom() - (db + 60.0f) / 66.0f * bar.getHeight();  // −60…+6 dBFS
    };
    const float y = toY(level);
    juce::ColourGradient grad(col::ok, 0, bar.getBottom(), col::warn, 0, toY(1.0f), false);
    grad.addColour(0.75, col::sum);
    g.setGradientFill(grad);
    g.fillRoundedRectangle(bar.withTop(y), 3);
    g.setColour(hold >= 0.999f ? col::warn : col::fg);
    g.fillRect(bar.getX(), toY(hold) - 1, bar.getWidth(), 2.0f);
    g.setColour(col::line);
    g.drawHorizontalLine((int) toY(1.0f), bar.getX() - 3, bar.getRight() + 3);  // 0 dBFS
}

// ───────────────────────────── HelpBar
HelpBar::HelpBar(juce::Component& r) : root(r) { root.addMouseListener(&listener, true); }
HelpBar::~HelpBar() { root.removeMouseListener(&listener); }

void HelpBar::update(juce::Component* c) {
    juce::String t;
    for (auto* p = c; p != nullptr && p != &root; p = p->getParentComponent()) {
        if (auto* tc = dynamic_cast<juce::TooltipClient*>(p)) { t = tc->getTooltip(); if (t.isNotEmpty()) break; }
        if (p->getDescription().isNotEmpty()) { t = p->getDescription(); break; }
    }
    if (t != text) { text = t; repaint(); }
}


void HelpBar::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 6);
    g.setColour(text.isNotEmpty() ? col::fgSoft : col::fgFaint);
    g.setFont(juce::FontOptions(12.5f));
    g.drawText(text.isNotEmpty() ? text : def, r.reduced(12, 0), juce::Justification::centredLeft, true);
}

// ───────────────────────────── TourOverlay
TourOverlay::TourOverlay(std::vector<Step> s) : steps(std::move(s)) {
    setWantsKeyboardFocus(true);
    setTitle("Tur");
    next.setButtonText(juce::String::fromUTF8("İleri →"));
    back.setButtonText(juce::String::fromUTF8("← Geri"));
    skip.setButtonText(juce::String::fromUTF8("Turu kapat"));
    next.onClick = [this] { go(idx + 1); };
    back.onClick = [this] { go(idx - 1); };
    skip.onClick = [this] { if (onFinish) onFinish(); };
    for (auto* b : {&next, &back, &skip}) addAndMakeVisible(b);
    go(0);
}

void TourOverlay::go(int i) {
    if (i >= (int) steps.size()) { if (onFinish) onFinish(); return; }
    idx = juce::jlimit(0, (int) steps.size() - 1, i);
    back.setEnabled(idx > 0);
    next.setButtonText(idx + 1 == (int) steps.size() ? juce::String::fromUTF8("Başla ✓") : juce::String::fromUTF8("İleri →"));
    resized();
    repaint();
    setDescription(steps[(size_t) idx].title + ". " + steps[(size_t) idx].body);  // ekran okuyucu
}

juce::Rectangle<float> TourOverlay::targetRect() const {
    auto* t = steps[(size_t) idx].target;
    if (!t) return {};
    for (auto* c = t; c != nullptr && c != getParentComponent(); c = c->getParentComponent())
        if (!c->isVisible()) return {};
    return getLocalArea(t, t->getLocalBounds()).toFloat().expanded(6);
}

juce::Rectangle<int> TourOverlay::bubbleRect() const {
    const int w = 380, h = 188;
    auto tr = targetRect();
    auto area = getLocalBounds().reduced(16);
    if (tr.isEmpty()) return juce::Rectangle<int>(w, h).withCentre(area.getCentre());
    juce::Rectangle<int> b(w, h);
    // hedefin altına; sığmazsa üstüne; o da olmazsa sağına/soluna
    if (tr.getBottom() + 12 + h <= area.getBottom()) b.setPosition((int) tr.getCentreX() - w / 2, (int) tr.getBottom() + 12);
    else if (tr.getY() - 12 - h >= area.getY()) b.setPosition((int) tr.getCentreX() - w / 2, (int) tr.getY() - 12 - h);
    else if (tr.getRight() + 12 + w <= area.getRight()) b.setPosition((int) tr.getRight() + 12, (int) tr.getCentreY() - h / 2);
    else b.setPosition((int) tr.getX() - 12 - w, (int) tr.getCentreY() - h / 2);
    return b.constrainedWithin(area);
}

void TourOverlay::resized() {
    auto b = bubbleRect().reduced(14);
    auto row = b.removeFromBottom(30);
    skip.setBounds(row.removeFromLeft(110));
    next.setBounds(row.removeFromRight(100));
    row.removeFromRight(6);
    back.setBounds(row.removeFromRight(90));
}

void TourOverlay::paint(juce::Graphics& g) {
    auto tr = targetRect();
    juce::Path dim;
    dim.addRectangle(getLocalBounds().toFloat());
    if (!tr.isEmpty()) { dim.addRoundedRectangle(tr, 10); dim.setUsingNonZeroWinding(false); }
    g.setColour(juce::Colours::black.withAlpha(0.66f));
    g.fillPath(dim);
    if (!tr.isEmpty()) { g.setColour(col::accent); g.drawRoundedRectangle(tr, 10, 2.0f); }
    auto b = bubbleRect().toFloat();
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(b, 12);
    g.setColour(col::accent.withAlpha(0.7f));
    g.drawRoundedRectangle(b, 12, 1.2f);
    auto in = b.reduced(16, 14);
    auto top = in.removeFromTop(24);
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(11.5f));
    g.drawText(juce::String(idx + 1) + " / " + juce::String((int) steps.size()), top, juce::Justification::centredRight);
    g.setColour(col::accent);
    g.setFont(juce::FontOptions(16.0f, juce::Font::bold));
    g.drawText(steps[(size_t) idx].title, top.withTrimmedRight(50), juce::Justification::centredLeft);
    in.removeFromBottom(36);
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(13.5f));
    juce::AttributedString as;
    as.append(steps[(size_t) idx].body, juce::FontOptions(13.5f), col::fg);
    as.setLineSpacing(2.0f);
    as.draw(g, in);
}

bool TourOverlay::keyPressed(const juce::KeyPress& k) {
    if (k == juce::KeyPress::escapeKey) { if (onFinish) onFinish(); return true; }
    if (k == juce::KeyPress::returnKey || k.getKeyCode() == juce::KeyPress::rightKey) { go(idx + 1); return true; }
    if (k.getKeyCode() == juce::KeyPress::leftKey) { go(idx - 1); return true; }
    return false;
}

juce::PropertiesFile& userSettings() {
    static juce::PropertiesFile::Options o = [] {
        juce::PropertiesFile::Options x;
        x.applicationName = "KB-Align";
        x.filenameSuffix = ".settings";
        x.folderName = "KB-Align";
        x.osxLibrarySubFolder = "Application Support";
        return x;
    }();
    static juce::PropertiesFile f(o);
    return f;
}

} // namespace kb::ui
