// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
#include "Theme.h"

#include <BinaryData.h>

namespace pf::ui {

static bool gTr = false;
bool isTurkish() { return gTr; }
void setTurkish(bool tr) { gTr = tr; }

juce::String fmtNum(double v, int decimals, bool plus) {
    const double q = std::pow(10.0, decimals);
    double r = std::round(v * q) / q;
    if (r == 0.0) r = 0.0;
    juce::String s = decimals == 0 ? juce::String((int) std::lround(std::abs(r))) : juce::String(std::abs(r), decimals);
    if (gTr) s = s.replaceCharacter('.', ',');
    if (r < 0) return juce::String::fromUTF8("−") + s;
    return (plus && r > 0 ? "+" : "") + s;
}

juce::String fmtHz(double hz) { return hz >= 1000 ? fmtNum(hz / 1000.0, hz >= 10000 ? 1 : 2) + " kHz" : fmtNum(hz, hz < 100 ? 1 : 0) + " Hz"; }

juce::PropertiesFile& userSettings() {
    static juce::PropertiesFile::Options o = [] {
        juce::PropertiesFile::Options x;
        x.applicationName = "PHASEFORGE";
        x.filenameSuffix = ".settings";
        x.folderName = "PHASEFORGE";
        x.osxLibrarySubFolder = "Application Support";
        return x;
    }();
    static juce::PropertiesFile f(o);
    return f;
}

Look::Look() {
    setColour(juce::ResizableWindow::backgroundColourId, col::bg);
    setColour(juce::Label::textColourId, col::fgSoft);
    setColour(juce::Slider::textBoxTextColourId, col::fg);
    setColour(juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
    setColour(juce::Slider::textBoxBackgroundColourId, juce::Colours::transparentBlack);
    setColour(juce::Slider::thumbColourId, col::accent);
    setColour(juce::ComboBox::backgroundColourId, col::panelHi);
    setColour(juce::ComboBox::textColourId, col::fg);
    setColour(juce::ComboBox::outlineColourId, col::line);
    setColour(juce::ComboBox::arrowColourId, col::fgSoft);
    setColour(juce::PopupMenu::backgroundColourId, col::panelHi);
    setColour(juce::PopupMenu::textColourId, col::fg);
    setColour(juce::PopupMenu::highlightedBackgroundColourId, col::accent.withAlpha(0.35f));
    setColour(juce::TextButton::buttonColourId, col::panelHi);
    setColour(juce::TextButton::buttonOnColourId, col::accent);
    setColour(juce::TextButton::textColourOffId, col::fg);
    setColour(juce::TextButton::textColourOnId, juce::Colours::white);
    setColour(juce::TextEditor::backgroundColourId, col::panelHi);
    setColour(juce::TextEditor::textColourId, col::fg);
    setColour(juce::TextEditor::outlineColourId, col::line);
    setColour(juce::TextEditor::focusedOutlineColourId, col::accent);
    setColour(juce::CaretComponent::caretColourId, col::accentHi);
    setColour(juce::TooltipWindow::backgroundColourId, col::panelHi);
    setColour(juce::TooltipWindow::textColourId, col::fg);
    setColour(juce::AlertWindow::backgroundColourId, col::panelHi);
    setColour(juce::AlertWindow::textColourId, col::fg);
    tfRegular = juce::Typeface::createSystemTypefaceFor(PFRes::InterRegular_otf, PFRes::InterRegular_otfSize);
    tfSemi = juce::Typeface::createSystemTypefaceFor(PFRes::InterSemiBold_otf, PFRes::InterSemiBold_otfSize);
    tfDisplay = juce::Typeface::createSystemTypefaceFor(PFRes::InterDisplayBold_otf, PFRes::InterDisplayBold_otfSize);
}

juce::Typeface::Ptr Look::getTypefaceForFont(const juce::Font& f) {
    if (f.getTypefaceName() != juce::Font::getDefaultSansSerifFontName() || tfRegular == nullptr) return LookAndFeel_V4::getTypefaceForFont(f);
    if (f.isBold()) return f.getHeight() >= 19.0f && tfDisplay ? tfDisplay : tfSemi;
    return tfRegular;
}

void Look::drawRotarySlider(juce::Graphics& g, int x, int y, int w, int h, float pos, float a0, float a1, juce::Slider& s) {
    const auto r = juce::Rectangle<float>((float) x, (float) y, (float) w, (float) h).reduced(3);
    const float rad = std::min(r.getWidth(), r.getHeight()) / 2;
    const auto c = r.getCentre();
    const float a = a0 + pos * (a1 - a0);
    const double mn = s.getMinimum(), mx = s.getMaximum();
    const float az = (mn < 0 && mx > 0) ? a0 + (float) ((0 - mn) / (mx - mn)) * (a1 - a0) : a0;
    const auto colour = s.findColour(juce::Slider::rotarySliderFillColourId);
    g.setColour(col::panelHi2);
    g.fillEllipse(r.withSizeKeepingCentre(rad * 1.36f, rad * 1.36f));
    juce::Path bgArc, arc;
    bgArc.addCentredArc(c.x, c.y, rad - 2, rad - 2, 0, a0, a1, true);
    arc.addCentredArc(c.x, c.y, rad - 2, rad - 2, 0, std::min(az, a), std::max(az, a), true);
    g.setColour(juce::Colours::white.withAlpha(0.08f));
    g.strokePath(bgArc, juce::PathStrokeType(3.5f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    g.setColour(s.isEnabled() ? colour : col::fgFaint);
    g.strokePath(arc, juce::PathStrokeType(3.5f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    g.setColour(col::fg);
    const float rr = rad * 0.62f;
    g.drawLine(c.x + rr * 0.35f * std::sin(a), c.y - rr * 0.35f * std::cos(a), c.x + rr * std::sin(a), c.y - rr * std::cos(a), 2.2f);
    if (s.hasKeyboardFocus(true)) { g.setColour(col::accentHi.withAlpha(0.7f)); g.drawEllipse(r, 1.2f); }
}

void Look::drawLinearSlider(juce::Graphics& g, int x, int y, int w, int h, float pos, float, float, juce::Slider::SliderStyle st, juce::Slider& s) {
    if (st != juce::Slider::LinearHorizontal) { LookAndFeel_V4::drawLinearSlider(g, x, y, w, h, pos, 0, 0, st, s); return; }
    const float cy = y + h * 0.5f;
    g.setColour(juce::Colours::white.withAlpha(0.08f));
    g.fillRoundedRectangle((float) x, cy - 2, (float) w, 4, 2);
    g.setColour(col::accent);
    g.fillRoundedRectangle((float) x, cy - 2, pos - (float) x, 4, 2);
    g.setColour(s.hasKeyboardFocus(true) ? col::fg : col::accentHi);
    g.fillEllipse(pos - 6, cy - 6, 12, 12);
}

void Look::drawButtonBackground(juce::Graphics& g, juce::Button& b, const juce::Colour& c, bool over, bool down) {
    auto r = b.getLocalBounds().toFloat().reduced(0.5f);
    auto fill = b.getToggleState() ? b.findColour(juce::TextButton::buttonOnColourId) : c;
    if (down) fill = fill.brighter(0.15f); else if (over) fill = fill.brighter(0.07f);
    const float rad = std::min(8.0f, r.getHeight() / 2);
    g.setColour(fill);
    g.fillRoundedRectangle(r, rad);
    g.setColour(b.hasKeyboardFocus(true) ? col::accentHi : col::line);
    g.drawRoundedRectangle(r, rad, 1.0f);
}

void Look::drawToggleButton(juce::Graphics& g, juce::ToggleButton& b, bool over, bool) {
    auto r = b.getLocalBounds().toFloat();
    const float h = std::min(16.0f, r.getHeight() - 4);
    auto sw = juce::Rectangle<float>(r.getX() + 2, r.getCentreY() - h / 2, h * 1.8f, h);
    g.setColour(b.getToggleState() ? col::accent : col::panelHi2.brighter(over ? 0.1f : 0));
    g.fillRoundedRectangle(sw, h / 2);
    const float kx = b.getToggleState() ? sw.getRight() - h + 2 : sw.getX() + 2;
    g.setColour(b.getToggleState() ? juce::Colours::white : col::fgSoft);
    g.fillEllipse(kx, sw.getY() + 2, h - 4, h - 4);
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(12.5f));
    g.drawText(b.getButtonText(), r.withLeft(sw.getRight() + 8), juce::Justification::centredLeft);
}

void Look::drawComboBox(juce::Graphics& g, int w, int h, bool, int, int, int, int, juce::ComboBox& b) {
    auto r = juce::Rectangle<float>(0, 0, (float) w, (float) h).reduced(0.5f);
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(r, 6);
    g.setColour(b.hasKeyboardFocus(true) ? col::accentHi : col::line);
    g.drawRoundedRectangle(r, 6, 1);
    juce::Path p;
    const float cx = (float) w - 14, cy = h * 0.5f;
    p.startNewSubPath(cx - 4, cy - 2); p.lineTo(cx, cy + 2); p.lineTo(cx + 4, cy - 2);
    g.setColour(col::fgSoft);
    g.strokePath(p, juce::PathStrokeType(1.5f));
}

void Look::drawTooltip(juce::Graphics& g, const juce::String& text, int w, int h) {
    auto r = juce::Rectangle<float>(0, 0, (float) w, (float) h);
    g.setColour(col::panelHi2);
    g.fillRoundedRectangle(r, 8);
    g.setColour(col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 8, 1);
    juce::AttributedString as;
    as.append(text, juce::FontOptions(13.0f), col::fg);
    as.setWordWrap(juce::AttributedString::byWord);
    as.setLineSpacing(1.5f);
    as.draw(g, r.reduced(12, 9));
}

juce::Rectangle<int> Look::getTooltipBounds(const juce::String& text, juce::Point<int> pos, juce::Rectangle<int> parent) {
    juce::AttributedString as;
    as.append(text, juce::FontOptions(13.0f), col::fg);
    as.setWordWrap(juce::AttributedString::byWord);
    as.setLineSpacing(1.5f);
    juce::TextLayout tl;
    tl.createLayout(as, 340.0f);
    const int w = (int) std::ceil(tl.getWidth()) + 24, h = (int) std::ceil(tl.getHeight()) + 18;
    return juce::Rectangle<int>(pos.x > parent.getCentreX() ? pos.x - (w + 12) : pos.x + 18, pos.y > parent.getCentreY() ? pos.y - (h + 8) : pos.y + 14, w, h)
        .constrainedWithin(parent);
}

// ───────────────────────────── Knob
Knob::Knob(juce::AudioProcessorValueTreeState& s, const juce::String& paramId, const juce::String& l, juce::Colour c) : label(l), colour(c) {
    slider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    slider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 80, 18);
    slider.setColour(juce::Slider::rotarySliderFillColourId, c);
    slider.setVelocityModeParameters(1.0, 1, 0.1, false, juce::ModifierKeys::shiftModifier);
    slider.setTitle(l);
    addAndMakeVisible(slider);
    rebind(s, paramId);
}
void Knob::rebind(juce::AudioProcessorValueTreeState& s, const juce::String& paramId) {
    att.reset();
    if (auto* p = s.getParameter(paramId)) {
        att = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(s, paramId, slider);
        slider.setDoubleClickReturnValue(true, p->convertFrom0to1(p->getDefaultValue()));
    }
}
void Knob::resized() {
    auto r = getLocalBounds();
    r.removeFromTop(16);
    slider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, std::max(48, r.getWidth()), 18);
    slider.setBounds(r);
}
void Knob::paint(juce::Graphics& g) {
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(10.5f, juce::Font::bold).withKerningFactor(0.06f));
    g.drawText(label.toUpperCase(), getLocalBounds().removeFromTop(16), juce::Justification::centred);
}

// ───────────────────────────── PillToggle
PillToggle::PillToggle(juce::AudioProcessorValueTreeState& s, const juce::String& paramId, const juce::String& text, juce::Colour on) {
    setButtonText(text);
    setClickingTogglesState(true);
    setColour(juce::TextButton::buttonOnColourId, on);
    rebind(s, paramId);
}
void PillToggle::rebind(juce::AudioProcessorValueTreeState& s, const juce::String& paramId) {
    att.reset();
    if (s.getParameter(paramId)) att = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(s, paramId, *this);
}

// ───────────────────────────── Segmented
Segmented::Segmented(juce::AudioProcessorValueTreeState& s, const juce::String& paramId, const juce::StringArray& l) : labels(l) {
    setWantsKeyboardFocus(true);
    rebind(s, paramId);
}
void Segmented::rebind(juce::AudioProcessorValueTreeState& s, const juce::String& paramId) {
    att.reset();
    if (auto* p = s.getParameter(paramId)) {
        att = std::make_unique<juce::ParameterAttachment>(*p, [this](float v) { sel = juce::roundToInt(v); repaint(); }, nullptr);
        att->sendInitialUpdate();
    }
}
void Segmented::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat().reduced(0.5f);
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 8);
    g.setColour(hasKeyboardFocus(false) ? col::accentHi : col::line);
    g.drawRoundedRectangle(r, 8, 1);
    auto in = r.reduced(3);
    const float w = in.getWidth() / std::max(1, labels.size());
    for (int i = 0; i < labels.size(); ++i) {
        auto c = juce::Rectangle<float>(in.getX() + i * w, in.getY(), w, in.getHeight());
        if (i == sel) { g.setColour(col::accent); g.fillRoundedRectangle(c.reduced(1), 6); }
        g.setColour(i == sel ? juce::Colours::white : col::fgSoft);
        g.setFont(juce::FontOptions(12.5f, juce::Font::bold));
        g.drawFittedText(labels[i], c.toNearestInt(), juce::Justification::centred, 1, 0.8f);
    }
}
void Segmented::mouseDown(const juce::MouseEvent& e) {
    const int i = juce::jlimit(0, labels.size() - 1, (int) (e.position.x / (getWidth() / (float) std::max(1, labels.size()))));
    if (att) att->setValueAsCompleteGesture((float) i);
}

}  // namespace pf::ui
