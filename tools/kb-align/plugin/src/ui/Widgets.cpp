// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Widgets.h"

#include <BinaryData.h>

namespace kb::ui {

static bool gTurkish = false;
bool isTurkish() { return gTurkish; }
void setTurkish(bool tr) { gTurkish = tr; }

juce::String fmtNum(double v, int decimals, bool plusSign) {
    const double q = std::pow(10.0, decimals);
    double r = std::round(v * q) / q;
    if (r == 0.0) r = 0.0;  // −0 → 0
    juce::String s = juce::String(std::abs(r), decimals);
    if (isTurkish()) s = s.replaceCharacter('.', ',');
    if (r < 0) return juce::String::fromUTF8("\u2212") + s;
    return (plusSign && r > 0 ? "+" : "") + s;
}

juce::String noteName(int midi) {
    static const char* n[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
    return juce::String(n[((midi % 12) + 12) % 12]) + juce::String(midi / 12 - 1);
}

KBLook::KBLook() {
    setColour(juce::ResizableWindow::backgroundColourId, col::bg);
    setColour(juce::Label::textColourId, col::fgSoft);
    setColour(juce::Slider::textBoxTextColourId, col::fg);
    setColour(juce::Slider::textBoxOutlineColourId, col::line);
    setColour(juce::Slider::textBoxBackgroundColourId, col::panelHi);
    setColour(juce::Slider::thumbColourId, col::accent);
    setColour(juce::Slider::trackColourId, col::accent.withAlpha(0.6f));
    setColour(juce::Slider::rotarySliderFillColourId, col::accent);
    setColour(juce::ComboBox::backgroundColourId, col::panelHi);
    setColour(juce::ComboBox::textColourId, col::fg);
    setColour(juce::ComboBox::outlineColourId, col::line);
    setColour(juce::ComboBox::arrowColourId, col::fgSoft);
    setColour(juce::PopupMenu::backgroundColourId, col::panel);
    setColour(juce::PopupMenu::textColourId, col::fg);
    setColour(juce::PopupMenu::highlightedBackgroundColourId, col::accent.withAlpha(0.25f));
    setColour(juce::TextButton::buttonColourId, col::panelHi);
    setColour(juce::TextButton::buttonOnColourId, col::accent);
    setColour(juce::TextButton::textColourOffId, col::fg);
    setColour(juce::TextButton::textColourOnId, col::bg);
    setColour(juce::ToggleButton::textColourId, col::fg);
    setColour(juce::ToggleButton::tickColourId, col::accent);
    setColour(juce::TabbedButtonBar::tabTextColourId, col::fgSoft);
    setColour(juce::TabbedButtonBar::frontTextColourId, col::accent);
    setColour(juce::TableHeaderComponent::backgroundColourId, col::panelHi);
    setColour(juce::TableHeaderComponent::textColourId, col::fgSoft);
    setColour(juce::ListBox::backgroundColourId, col::panel);
    setColour(juce::TextEditor::backgroundColourId, col::panelHi);
    setColour(juce::TextEditor::textColourId, col::fg);
    setColour(juce::CaretComponent::caretColourId, col::accent);
    setColour(juce::TooltipWindow::backgroundColourId, col::panelHi);
    setColour(juce::TooltipWindow::textColourId, col::fg);
    setColour(juce::TooltipWindow::outlineColourId, col::line);
    tfRegular = juce::Typeface::createSystemTypefaceFor(KBFonts::InterRegular_otf, KBFonts::InterRegular_otfSize);
    tfSemi = juce::Typeface::createSystemTypefaceFor(KBFonts::InterSemiBold_otf, KBFonts::InterSemiBold_otfSize);
    tfDisplay = juce::Typeface::createSystemTypefaceFor(KBFonts::InterDisplayBold_otf, KBFonts::InterDisplayBold_otfSize);
}

juce::Typeface::Ptr KBLook::getTypefaceForFont(const juce::Font& f) {
    if (f.getTypefaceName() != juce::Font::getDefaultSansSerifFontName() || tfRegular == nullptr)
        return LookAndFeel_V4::getTypefaceForFont(f);
    if (f.isBold()) return f.getHeight() >= 19.0f && tfDisplay ? tfDisplay : tfSemi;
    return tfRegular;
}

void KBLook::drawTabButton(juce::TabBarButton& b, juce::Graphics& g, bool over, bool) {
    auto r = b.getActiveArea().toFloat().reduced(3, 5);
    const bool front = b.isFrontTab();
    if (front || over) {
        g.setColour(front ? col::panelHi : col::panelHi.withAlpha(0.5f));
        g.fillRoundedRectangle(r, r.getHeight() / 2);
    }
    if (front) {
        g.setColour(col::accent.withAlpha(0.55f));
        g.drawRoundedRectangle(r, r.getHeight() / 2, 1.0f);
    }
    if (b.hasKeyboardFocus(false)) { g.setColour(col::accent); g.drawRoundedRectangle(r.expanded(1.5f), r.getHeight() / 2 + 1.5f, 1.2f); }
    g.setColour(front ? col::fg : over ? col::fg : col::fgSoft);
    g.setFont(juce::FontOptions(13.0f, front ? juce::Font::bold : juce::Font::plain));
    g.drawText(b.getButtonText(), r, juce::Justification::centred);
}

int KBLook::getTabButtonBestWidth(juce::TabBarButton& b, int) {
    return (int) std::ceil(juce::GlyphArrangement::getStringWidth(juce::FontOptions(13.0f, juce::Font::bold), b.getButtonText())) + 36;
}

void KBLook::drawTabAreaBehindFrontButton(juce::TabbedButtonBar&, juce::Graphics& g, int w, int h) {
    g.setColour(col::line);
    g.drawHorizontalLine(h - 1, 0.0f, (float) w);
}

void KBLook::drawTooltip(juce::Graphics& g, const juce::String& text, int w, int h) {
    auto r = juce::Rectangle<float>(0, 0, (float) w, (float) h);
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(r, 8);
    g.setColour(col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 8, 1);
    juce::AttributedString as;
    as.append(text, juce::FontOptions(13.0f), col::fg);
    as.setWordWrap(juce::AttributedString::byWord);
    as.setLineSpacing(1.5f);
    as.draw(g, r.reduced(12, 9));
}

juce::Rectangle<int> KBLook::getTooltipBounds(const juce::String& text, juce::Point<int> pos, juce::Rectangle<int> parent) {
    juce::AttributedString as;
    as.append(text, juce::FontOptions(13.0f), col::fg);
    as.setWordWrap(juce::AttributedString::byWord);
    as.setLineSpacing(1.5f);
    juce::TextLayout tl;
    tl.createLayout(as, 340.0f);
    const int w = (int) std::ceil(tl.getWidth()) + 24, h = (int) std::ceil(tl.getHeight()) + 18;
    return juce::Rectangle<int>(pos.x > parent.getCentreX() ? pos.x - (w + 12) : pos.x + 18,
                                pos.y > parent.getCentreY() ? pos.y - (h + 8) : pos.y + 14, w, h).constrainedWithin(parent);
}

void makeChip(juce::TextButton& b, const juce::String& text, juce::Colour on, const juce::String& tip) {
    b.setButtonText(text);
    b.setClickingTogglesState(true);
    b.setColour(juce::TextButton::buttonOnColourId, on);
    b.setColour(juce::TextButton::textColourOnId, col::bg);
    b.setColour(juce::TextButton::textColourOffId, col::fgSoft);
    b.setTooltip(tip);
    b.setTitle(text);
}

void KBLook::drawRotarySlider(juce::Graphics& g, int x, int y, int w, int h, float pos, float a0, float a1, juce::Slider& s) {
    const auto r = juce::Rectangle<float>((float) x, (float) y, (float) w, (float) h).reduced(4);
    const float rad = std::min(r.getWidth(), r.getHeight()) / 2;
    const auto c = r.getCentre();
    const float a = a0 + pos * (a1 - a0);
    // iki yönlü parametrede (−…+) yay sıfırdan başlar
    const double mn = s.getMinimum(), mx = s.getMaximum();
    const float az = (mn < 0 && mx > 0) ? a0 + (float) ((0 - mn) / (mx - mn)) * (a1 - a0) : a0;
    juce::Path bgArc, arc;
    bgArc.addCentredArc(c.x, c.y, rad - 3, rad - 3, 0, a0, a1, true);
    arc.addCentredArc(c.x, c.y, rad - 3, rad - 3, 0, std::min(az, a), std::max(az, a), true);
    g.setColour(col::line.withAlpha(0.4f));
    g.strokePath(bgArc, juce::PathStrokeType(4, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    g.setColour(col::accent);
    g.strokePath(arc, juce::PathStrokeType(4, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    g.setColour(col::fg);
    g.drawLine(c.x, c.y, c.x + (rad - 8) * std::sin(a), c.y - (rad - 8) * std::cos(a), 2.0f);
    if (s.hasKeyboardFocus(true)) { g.setColour(col::accent.withAlpha(0.6f)); g.drawEllipse(r, 1.5f); }
}

void KBLook::drawLinearSlider(juce::Graphics& g, int x, int y, int w, int h, float pos, float, float,
                              juce::Slider::SliderStyle st, juce::Slider& s) {
    if (st != juce::Slider::LinearHorizontal) { LookAndFeel_V4::drawLinearSlider(g, x, y, w, h, pos, 0, 0, st, s); return; }
    const float cy = y + h * 0.5f;
    g.setColour(col::line.withAlpha(0.5f));
    g.fillRoundedRectangle((float) x, cy - 2, (float) w, 4, 2);
    // nötr noktası 0 olan iki yönlü kontrollerde dolgu 0'dan başlar
    const double mn = s.getMinimum(), mx = s.getMaximum();
    float zero = (float) x;
    if (mn < 0 && mx > 0) zero = (float) (x + w * (0 - mn) / (mx - mn));
    g.setColour(col::accent.withAlpha(0.75f));
    g.fillRoundedRectangle(std::min(zero, pos), cy - 2, std::abs(pos - zero), 4, 2);
    g.setColour(s.hasKeyboardFocus(true) ? col::fg : col::accent);
    g.fillEllipse(pos - 7, cy - 7, 14, 14);
}

void KBLook::drawButtonBackground(juce::Graphics& g, juce::Button& b, const juce::Colour& c, bool over, bool down) {
    auto r = b.getLocalBounds().toFloat().reduced(0.5f);
    auto fill = b.getToggleState() ? b.findColour(juce::TextButton::buttonOnColourId) : c;
    if (down) fill = fill.brighter(0.2f); else if (over) fill = fill.brighter(0.08f);
    g.setColour(fill);
    g.fillRoundedRectangle(r, r.getHeight() / 2);
    const bool flat = (bool) b.getProperties().getWithDefault("flat", false);
    if (!flat || b.hasKeyboardFocus(true)) {
        g.setColour(b.hasKeyboardFocus(true) ? col::accent : col::line);
        g.drawRoundedRectangle(r, r.getHeight() / 2, 1.0f);
    }
}

void KBLook::drawToggleButton(juce::Graphics& g, juce::ToggleButton& b, bool over, bool) {
    auto r = b.getLocalBounds().toFloat();
    const float h = std::min(18.0f, r.getHeight() - 4);
    auto sw = juce::Rectangle<float>(r.getX() + 2, r.getCentreY() - h / 2, h * 1.8f, h);
    g.setColour(b.getToggleState() ? col::accent : col::panelHi.brighter(over ? 0.1f : 0));
    g.fillRoundedRectangle(sw, h / 2);
    g.setColour(b.hasKeyboardFocus(true) ? col::fg : col::line);
    g.drawRoundedRectangle(sw, h / 2, 1);
    const float kx = b.getToggleState() ? sw.getRight() - h + 2 : sw.getX() + 2;
    g.setColour(b.getToggleState() ? col::bg : col::fgSoft);
    g.fillEllipse(kx, sw.getY() + 2, h - 4, h - 4);
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(13.0f));
    g.drawText(b.getButtonText(), r.withLeft(sw.getRight() + 8), juce::Justification::centredLeft);
}

ParamSlider::ParamSlider(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& text, bool rot) : rotary(rot) {
    slider.setSliderStyle(rot ? juce::Slider::RotaryHorizontalVerticalDrag : juce::Slider::LinearHorizontal);
    slider.setTextBoxStyle(juce::Slider::TextBoxRight, false, 86, 20);
    slider.setTitle(text);
    slider.setWantsKeyboardFocus(true);
    att = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(s, id, slider);
    if (rot) slider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 86, 20);
    // ince ayar: Shift ile sürükleme ×0,1 (JUCE velocity modu yerine)
    slider.setVelocityModeParameters(1.0, 1, 0.1, false, juce::ModifierKeys::shiftModifier);
    slider.setDoubleClickReturnValue(true, s.getParameter(id)->convertFrom0to1(s.getParameter(id)->getDefaultValue()));
    label.setText(text, juce::dontSendNotification);
    label.setJustificationType(rot ? juce::Justification::centred : juce::Justification::centredLeft);
    addAndMakeVisible(label);
    addAndMakeVisible(slider);
}

void ParamSlider::resized() {
    auto r = getLocalBounds();
    if (rotary) {
        label.setBounds(r.removeFromTop(16));
        slider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, std::max(40, r.getWidth() - 6), 20);
        slider.setBounds(r);
    }
    else if (stacked) { label.setBounds(r.removeFromTop(16)); slider.setTextBoxStyle(juce::Slider::TextBoxRight, false, 78, 20); slider.setBounds(r); }
    else { label.setBounds(r.removeFromLeft(std::min(150, r.getWidth() / 3))); slider.setBounds(r); }
}

ParamToggle::ParamToggle(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& text) {
    button.setButtonText(text);
    button.setTitle(text);
    att = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(s, id, button);
    addAndMakeVisible(button);
}

ParamCombo::ParamCombo(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& text, const juce::StringArray& items) {
    if (!items.isEmpty()) box.addItemList(items, 1);  // arayüz dilinde etiketler (sıra parametreyle aynı)
    else if (auto* p = dynamic_cast<juce::AudioParameterChoice*>(s.getParameter(id))) box.addItemList(p->choices, 1);
    box.setTitle(text);
    att = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(s, id, box);
    label.setText(text, juce::dontSendNotification);
    addAndMakeVisible(label);
    addAndMakeVisible(box);
}

void ParamCombo::resized() {
    auto r = getLocalBounds();
    if (label.getText().isNotEmpty()) label.setBounds(r.removeFromLeft(std::min(150, r.getWidth() / 3)));
    box.setBounds(r.reduced(0, 1));
}

// ───────────────────────────── CurveEditor
static juce::Rectangle<float> curveArea(juce::Rectangle<float> r) { return r.withTrimmedLeft(40).withTrimmedBottom(36).reduced(14, 14); }
juce::Point<float> CurveEditor::toScreen(const CurvePoint& p) const {
    auto r = curveArea(getLocalBounds().toFloat());
    return {r.getX() + (float) p.t * r.getWidth(), r.getBottom() - (float) p.g * r.getHeight()};
}
CurvePoint CurveEditor::fromScreen(juce::Point<float> s) const {
    auto r = curveArea(getLocalBounds().toFloat());
    return {juce::jlimit(0.0, 1.0, (double) ((s.x - r.getX()) / r.getWidth())), juce::jlimit(0.0, 1.0, (double) ((r.getBottom() - s.y) / r.getHeight())), 0.0};
}
int CurveEditor::hit(juce::Point<float> s) const {
    for (int i = 0; i < (int) proc.curve.size(); ++i) if (toScreen(proc.curve[(size_t) i]).getDistanceFrom(s) < 9) return i;
    return -1;
}

void CurveEditor::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 8);
    auto in = curveArea(r);
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(in.expanded(6), 6);
    g.setFont(juce::FontOptions(11.0f));
    for (int i = 0; i <= 4; ++i) {
        const float y = in.getY() + in.getHeight() * i / 4, x = in.getX() + in.getWidth() * i / 4;
        g.setColour(col::grid);
        if (i > 0 && i < 4) { g.drawHorizontalLine((int) y, in.getX(), in.getRight()); g.drawVerticalLine((int) x, in.getY(), in.getBottom()); }
        g.setColour(col::fgFaint);
        g.drawText(juce::String(100 - 25 * i) + "%", (int) in.getX() - 46, (int) y - 7, 36, 14, juce::Justification::centredRight);
        g.drawText(juce::String(25 * i) + "%", (int) x - 20, (int) in.getBottom() + 8, 40, 14, juce::Justification::centred);
    }
    g.drawText(L("gain \u2191   time \u2192 (share of duck length)", "kazanç \u2191   zaman \u2192 (ducking uzunluğu)"),
               in.withY(in.getBottom() + 20).withHeight(14).toNearestInt(), juce::Justification::centred);
    juce::Path p;
    for (int i = 0; i <= 200; ++i) {
        const double u = i / 200.0;
        const double v = curveEval(proc.curve, u);
        const float x = in.getX() + (float) u * in.getWidth(), y = in.getBottom() - (float) v * in.getHeight();
        if (i == 0) p.startNewSubPath(x, y); else p.lineTo(x, y);
    }
    juce::Path fill(p);
    fill.lineTo(in.getRight(), in.getBottom());
    fill.lineTo(in.getX(), in.getBottom());
    fill.closeSubPath();
    g.setColour(col::accent.withAlpha(0.10f));
    g.fillPath(fill);
    g.setColour(col::accent);
    g.strokePath(p, juce::PathStrokeType(2.0f));
    for (int i = 0; i < (int) proc.curve.size(); ++i) {
        auto s = toScreen(proc.curve[(size_t) i]);
        g.setColour(col::bg);
        g.fillEllipse(s.x - 6, s.y - 6, 12, 12);
        g.setColour(i == selected && hasKeyboardFocus(false) ? col::fg : col::accent);
        g.drawEllipse(s.x - 5, s.y - 5, 10, 10, 2.0f);
    }
}

void CurveEditor::mouseDown(const juce::MouseEvent& e) {
    drag = hit(e.position);
    if (drag < 0) {
        auto np = fromScreen(e.position);
        auto& c = proc.curve;
        size_t at = 1;
        while (at < c.size() && c[at].t < np.t) ++at;
        if (at > 0 && at < c.size() && (int) c.size() < kMaxCurvePoints) { c.insert(c.begin() + (ptrdiff_t) at, np); drag = (int) at; }
    }
    selected = drag >= 0 ? drag : selected;
    if (drag >= 0) { dragStartY = e.position.y; dragStartC = (float) proc.curve[(size_t) drag].c; }
    proc.setCurve(proc.curve);
    repaint();
}

void CurveEditor::mouseDrag(const juce::MouseEvent& e) {
    if (drag < 0) return;
    auto& c = proc.curve;
    auto& pt = c[(size_t) drag];
    if (e.mods.isAltDown()) {
        pt.c = juce::jlimit(-1.0, 1.0, (double) dragStartC + (e.position.y - dragStartY) / 100.0);
    } else {
        auto np = fromScreen(e.position);
        const double lo = drag > 0 ? c[(size_t) drag - 1].t : 0.0, hi = drag + 1 < (int) c.size() ? c[(size_t) drag + 1].t : 1.0;
        pt.t = (drag == 0) ? 0.0 : (drag == (int) c.size() - 1 ? 1.0 : juce::jlimit(lo, hi, np.t));
        pt.g = np.g;
    }
    proc.setCurve(c);
    repaint();
}

void CurveEditor::mouseUp(const juce::MouseEvent&) { drag = -1; }

void CurveEditor::mouseDoubleClick(const juce::MouseEvent& e) {
    const int i = hit(e.position);
    if (i > 0 && i < (int) proc.curve.size() - 1) { proc.curve.erase(proc.curve.begin() + i); proc.setCurve(proc.curve); selected = 1; repaint(); }
}

bool CurveEditor::keyPressed(const juce::KeyPress& k) {
    auto& c = proc.curve;
    if (c.empty()) return false;
    selected = juce::jlimit(0, (int) c.size() - 1, selected);
    auto& p = c[(size_t) selected];
    const double st = k.getModifiers().isShiftDown() ? 0.002 : 0.02;
    if (k == juce::KeyPress::tabKey) return false;
    if (k.getKeyCode() == juce::KeyPress::leftKey && k.getModifiers().isCommandDown()) selected = std::max(0, selected - 1);
    else if (k.getKeyCode() == juce::KeyPress::rightKey && k.getModifiers().isCommandDown()) selected = std::min((int) c.size() - 1, selected + 1);
    else if (k.getKeyCode() == juce::KeyPress::upKey) p.g = std::min(1.0, p.g + st);
    else if (k.getKeyCode() == juce::KeyPress::downKey) p.g = std::max(0.0, p.g - st);
    else if (k.getKeyCode() == juce::KeyPress::leftKey && selected > 0 && selected < (int) c.size() - 1) p.t = std::max(c[(size_t) selected - 1].t, p.t - st);
    else if (k.getKeyCode() == juce::KeyPress::rightKey && selected > 0 && selected < (int) c.size() - 1) p.t = std::min(c[(size_t) selected + 1].t, p.t + st);
    else return false;
    proc.setCurve(c);
    repaint();
    return true;
}

// ───────────────────────────── NoteTable
NoteTable::NoteTable(KBAlignProcessor& p) : proc(p) {
    table.setModel(this);
    auto& h = table.getHeader();
    h.addColumn(L("Note", "Nota"), 1, 110);
    h.addColumn(L("Shift (ms)", "Kaydırma (ms)"), 2, 130);
    h.addColumn(L("Phase (\u00b0)", "Faz (\u00b0)"), 3, 130);
    h.addColumn(L("Hits", "Vuruş"), 4, 90);
    h.addColumn(L("Lock", "Kilit"), 5, 80);
    h.addColumn("", 6, 60);
    h.setStretchToFitActive(true);
    table.setRowHeight(26);
    table.setTitle(L("Note table", "Nota tablosu"));
    addAndMakeVisible(table);
    clearAll.onClick = [this] { for (auto& r : rows) proc.align.clearNote(r.first); refresh(); };
    addAndMakeVisible(clearAll);
    clearAll.setButtonText(L("Clear all", "Tümünü sil"));
    hint.setText(L("Per Note mode learns a shift and phase for every bass note. Double-click a value to edit it (the note gets locked).",
                   "Nota başına modunda her bas notası için kaydırma ve faz öğrenilir. Değeri çift tıkla düzenle (nota kilitlenir)."),
                 juce::dontSendNotification);
    hint.setColour(juce::Label::textColourId, col::fgFaint);
    addAndMakeVisible(hint);
    startTimerHz(4);
}

void NoteTable::resized() {
    auto r = getLocalBounds().reduced(6);
    auto top = r.removeFromTop(28);
    clearAll.setBounds(top.removeFromRight(150).reduced(2));
    hint.setBounds(top);
    table.setBounds(r);
}

void NoteTable::refresh() {
    {   // çalan nota (vurgulanır)
        int cn = -1;
        auto hs = proc.align.recentHits();
        for (auto it = hs.rbegin(); it != hs.rend(); ++it) if (it->note >= 0) { cn = it->note; break; }
        if (cn != curNote) { curNote = cn; table.repaint(); }
    }
    auto t = proc.align.noteTable();
    std::vector<std::pair<int, NoteEntry>> nr(t.begin(), t.end());
    const bool changed = nr.size() != rows.size() || !std::equal(nr.begin(), nr.end(), rows.begin(), [](auto& a, auto& b) {
        return a.first == b.first && a.second.d == b.second.d && a.second.th == b.second.th && a.second.count == b.second.count && a.second.locked == b.second.locked; });
    if (changed) { rows = std::move(nr); table.updateContent(); table.repaint(); }
}

void NoteTable::paintRowBackground(juce::Graphics& g, int row, int, int, bool sel) {
    g.fillAll(sel ? col::accent.withAlpha(0.18f) : (row % 2 ? col::panel : col::panelHi));
}

void NoteTable::paintCell(juce::Graphics& g, int row, int c, int w, int h, bool) {
    if (row >= (int) rows.size()) return;
    const auto& [note, e] = rows[(size_t) row];
    juce::String s;
    if (c == 1) s = noteName(note);
    else if (c == 4) s = juce::String(e.count) + (e.manual ? " *" : "");
    const bool playing = note == curNote;
    g.setColour(playing && c == 1 ? col::accent : col::fg);
    g.setFont(juce::FontOptions(13.0f, c == 1 ? juce::Font::bold : juce::Font::plain));
    g.drawText(s, 8, 0, w - 16, h, c == 1 ? juce::Justification::centredLeft : juce::Justification::centredRight);
}

juce::Component* NoteTable::refreshComponentForCell(int row, int c, bool, juce::Component* existing) {
    delete existing;
    if (row >= (int) rows.size()) return nullptr;
    const int note = rows[(size_t) row].first;
    const auto e = rows[(size_t) row].second;
    if (c == 2 || c == 3) {
        auto* l = new juce::Label();
        l->setEditable(false, true);
        l->setText(c == 2 ? fmtNum(e.d, 2, true) : fmtNum(e.th, 0), juce::dontSendNotification);
        l->setJustificationType(juce::Justification::centredRight);
        l->setColour(juce::Label::textColourId, col::fg);
        l->onTextChange = [this, note, c, l] {
            auto t = proc.align.noteTable();
            auto cur = t[note];
            const double v = l->getText().replaceCharacter(',', '.').replace(juce::String::fromUTF8("\u2212"), "-").getDoubleValue();
            proc.align.setNoteValue(note, c == 2 ? juce::jlimit(-50.0, 50.0, v) : cur.d, c == 3 ? v : cur.th);
        };
        return l;
    }
    if (c == 5) {
        auto* b = new juce::ToggleButton();
        b->setToggleState(e.locked, juce::dontSendNotification);
        b->setTitle(L("lock ", "kilit ") + noteName(note));
        b->onClick = [this, note, b] { proc.align.lockNote(note, b->getToggleState()); };
        return b;
    }
    if (c == 6) {
        struct Small : juce::Component {
            juce::TextButton b;
            Small() { addAndMakeVisible(b); }
            void resized() override { b.setBounds(getLocalBounds().withSizeKeepingCentre(30, 22)); }
        };
        auto* w = new Small();
        w->b.setButtonText(juce::String::fromUTF8("\u00d7"));
        w->b.setTitle(L("remove ", "sil ") + noteName(note));
        w->b.setTooltip(L("Remove this note", "Bu notayı sil"));
        w->b.onClick = [this, note] { proc.align.clearNote(note); juce::MessageManager::callAsync([this] { refresh(); }); };
        return w;
    }
    return nullptr;
}

} // namespace kb::ui
