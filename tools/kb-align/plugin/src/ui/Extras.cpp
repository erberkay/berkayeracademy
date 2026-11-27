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
        b->getProperties().set("flat", true);
        b->setColour(juce::TextButton::buttonColourId, juce::Colours::transparentBlack);
        b->setColour(juce::TextButton::buttonOnColourId, juce::Colour(0xff2c2c37));
        b->setColour(juce::TextButton::textColourOnId, col::accent);
        b->setColour(juce::TextButton::textColourOffId, col::fgSoft);
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
    auto r = getLocalBounds().reduced(3);
    const int n = buttons.size();
    for (int i = 0; i < n; ++i) {
        const int w = r.getWidth() / (n - i);
        buttons[i]->setBounds(r.removeFromLeft(w).reduced(1, 0));
    }
}

void SegmentedChoice::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat().reduced(0.5f);
    g.setColour(juce::Colour(0xff111117));
    g.fillRoundedRectangle(r, r.getHeight() / 2);
    g.setColour(col::line);
    g.drawRoundedRectangle(r, r.getHeight() / 2, 1.0f);
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
    juce::ColourGradient grad(col::bass, 0, bar.getBottom(), col::warn, 0, toY(1.0f), false);
    grad.addColour(0.8, col::accent);
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
    setTitle(L("Tour", "Tur"));
    next.setButtonText(L("Next", "İleri"));
    back.setButtonText(L("Back", "Geri"));
    skip.setButtonText(L("Skip tour", "Turu kapat"));
    next.setColour(juce::TextButton::buttonColourId, col::accent);
    next.setColour(juce::TextButton::textColourOffId, col::bg);
    next.onClick = [this] { go(idx + 1); };
    back.onClick = [this] { go(idx - 1); };
    skip.onClick = [this] { if (onFinish) onFinish(); };
    for (auto* b : {&next, &back, &skip}) addAndMakeVisible(b);
    go(0);
}

void TourOverlay::go(int i) {
    if (i >= (int) steps.size()) { if (onFinish) onFinish(); return; }
    idx = juce::jlimit(0, (int) steps.size() - 1, i);
    back.setVisible(idx > 0);
    next.setButtonText(idx + 1 == (int) steps.size() ? L("Get started", "Başla") : L("Next", "İleri"));
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
    const int w = 400;
    juce::AttributedString as;
    as.append(steps[(size_t) idx].body, juce::FontOptions(13.5f), col::fg);
    as.setLineSpacing(2.0f);
    juce::TextLayout tl;
    tl.createLayout(as, (float) w - 32);
    const int h = 14 + 24 + 4 + (int) std::ceil(tl.getHeight()) + 14 + 34 + 14;
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
    in.removeFromBottom(34);
    in.removeFromTop(4);
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

// ───────────────────────────── StatusPill
void StatusPill::set(int state, const juce::String& text, bool pulse) {
    if (pulse) glow = 1.0f;
    else glow *= 0.82f;
    if (state != st || text != txt || glow > 0.02f) { st = state; txt = text; repaint(); }
}

void StatusPill::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat().reduced(0.5f);
    const juce::Colour c = st == 1 ? col::ok : st == 2 ? col::warn : st == 3 ? col::accent : col::fgFaint;
    g.setColour(c.withAlpha(0.10f));
    g.fillRoundedRectangle(r, r.getHeight() / 2);
    g.setColour(c.withAlpha(0.45f));
    g.drawRoundedRectangle(r, r.getHeight() / 2, 1.0f);
    auto led = juce::Rectangle<float>(9, 9).withCentre({r.getX() + 15, r.getCentreY()});
    if (st == 1 && glow > 0.02f) { g.setColour(c.withAlpha(0.35f * glow)); g.fillEllipse(led.expanded(5 * glow)); }
    g.setColour(st == 1 ? c.interpolatedWith(juce::Colours::white, 0.35f * glow) : c);
    g.fillEllipse(led);
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(12.5f, juce::Font::bold));
    g.drawFittedText(txt, r.withTrimmedLeft(28).withTrimmedRight(12).toNearestInt(), juce::Justification::centredLeft, 1, 0.85f);
}

// ───────────────────────────── PrimaryButton
void PrimaryButton::paintButton(juce::Graphics& g, bool over, bool down) {
    auto r = getLocalBounds().toFloat().reduced(0.5f);
    const float rad = r.getHeight() / 2;
    auto base = col::accent;
    if (!isEnabled()) base = base.withAlpha(0.4f);
    else if (down) base = base.darker(0.15f);
    else if (over) base = base.brighter(0.08f);
    if (progress >= 0) {
        g.setColour(base.withAlpha(0.22f));
        g.fillRoundedRectangle(r, rad);
        juce::Path clip;
        clip.addRoundedRectangle(r, rad);
        g.saveState();
        g.reduceClipRegion(clip);
        g.setColour(base);
        g.fillRect(r.withWidth(r.getWidth() * juce::jlimit(0.0f, 1.0f, progress)));
        g.restoreState();
        g.setColour(base);
        g.drawRoundedRectangle(r, rad, 1.0f);
    } else {
        g.setColour(base);
        g.fillRoundedRectangle(r, rad);
    }
    if (hasKeyboardFocus(false)) { g.setColour(col::fg); g.drawRoundedRectangle(r.reduced(2), rad - 2, 1.5f); }
    g.setColour(progress >= 0 && progress < 0.55f ? col::fg : col::bg);
    g.setFont(juce::FontOptions(14.0f, juce::Font::bold));
    juce::String t = getButtonText();
    if (done && progress < 0) t = juce::String::fromUTF8("\u2713  ") + t;
    g.drawText(t, r, juce::Justification::centred);
}

// ───────────────────────────── TwoWaySwitch
void TwoWaySwitch::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat().reduced(0.5f);
    g.setColour(juce::Colour(0xff111117));
    g.fillRoundedRectangle(r, r.getHeight() / 2);
    g.setColour(hasKeyboardFocus(false) ? col::accent : col::line);
    g.drawRoundedRectangle(r, r.getHeight() / 2, 1.0f);
    auto in = r.reduced(3);
    auto a = in.withWidth(in.getWidth() / 2), b = in.withTrimmedLeft(in.getWidth() / 2);
    auto sel = second ? b : a;
    g.setColour(second ? onSecond : onFirst);
    g.fillRoundedRectangle(sel, sel.getHeight() / 2);
    g.setFont(juce::FontOptions(fontSize, juce::Font::bold));
    g.setColour(second ? col::fgSoft : col::bg);
    g.drawText(la, a, juce::Justification::centred);
    g.setColour(second ? col::bg : col::fgSoft);
    g.drawText(lb, b, juce::Justification::centred);
}

void TwoWaySwitch::mouseDown(const juce::MouseEvent& e) {
    const bool s = e.position.x >= getWidth() / 2.0f;
    if (s != second) { second = s; repaint(); if (onChange) onChange(second); }
}

bool TwoWaySwitch::keyPressed(const juce::KeyPress& k) {
    if (k == juce::KeyPress::spaceKey || k == juce::KeyPress::returnKey || k.getKeyCode() == juce::KeyPress::leftKey ||
        k.getKeyCode() == juce::KeyPress::rightKey) {
        second = k.getKeyCode() == juce::KeyPress::leftKey ? false : k.getKeyCode() == juce::KeyPress::rightKey ? true : !second;
        repaint();
        if (onChange) onChange(second);
        return true;
    }
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
