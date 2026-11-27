#include "Widgets.h"

namespace kb::ui {

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
}

void KBLook::drawRotarySlider(juce::Graphics& g, int x, int y, int w, int h, float pos, float a0, float a1, juce::Slider& s) {
    const auto r = juce::Rectangle<float>((float) x, (float) y, (float) w, (float) h).reduced(4);
    const float rad = std::min(r.getWidth(), r.getHeight()) / 2;
    const auto c = r.getCentre();
    const float a = a0 + pos * (a1 - a0);
    juce::Path bgArc, arc;
    bgArc.addCentredArc(c.x, c.y, rad - 3, rad - 3, 0, a0, a1, true);
    arc.addCentredArc(c.x, c.y, rad - 3, rad - 3, 0, a0, a, true);
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
    auto fill = b.getToggleState() ? col::accent : c;
    if (down) fill = fill.brighter(0.2f); else if (over) fill = fill.brighter(0.08f);
    g.setColour(fill);
    g.fillRoundedRectangle(r, r.getHeight() / 2);
    g.setColour(b.hasKeyboardFocus(true) ? col::accent : col::line);
    g.drawRoundedRectangle(r, r.getHeight() / 2, 1.0f);
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
    if (rotary) { label.setBounds(r.removeFromTop(16)); slider.setBounds(r); }
    else { label.setBounds(r.removeFromLeft(std::min(150, r.getWidth() / 3))); slider.setBounds(r); }
}

ParamToggle::ParamToggle(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& text) {
    button.setButtonText(text);
    button.setTitle(text);
    att = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(s, id, button);
    addAndMakeVisible(button);
}

ParamCombo::ParamCombo(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& text) {
    if (auto* p = dynamic_cast<juce::AudioParameterChoice*>(s.getParameter(id))) box.addItemList(p->choices, 1);
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
juce::Point<float> CurveEditor::toScreen(const CurvePoint& p) const {
    auto r = getLocalBounds().toFloat().reduced(10);
    return {r.getX() + (float) p.t * r.getWidth(), r.getBottom() - (float) p.g * r.getHeight()};
}
CurvePoint CurveEditor::fromScreen(juce::Point<float> s) const {
    auto r = getLocalBounds().toFloat().reduced(10);
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
    auto in = r.reduced(10);
    g.setColour(col::grid);
    for (int i = 1; i < 4; ++i) {
        g.drawHorizontalLine((int) (in.getY() + in.getHeight() * i / 4), in.getX(), in.getRight());
        g.drawVerticalLine((int) (in.getX() + in.getWidth() * i / 4), in.getY(), in.getBottom());
    }
    juce::Path p;
    for (int i = 0; i <= 200; ++i) {
        const double u = i / 200.0;
        const double v = curveEval(proc.curve, u);
        const float x = in.getX() + (float) u * in.getWidth(), y = in.getBottom() - (float) v * in.getHeight();
        if (i == 0) p.startNewSubPath(x, y); else p.lineTo(x, y);
    }
    g.setColour(col::accent);
    g.strokePath(p, juce::PathStrokeType(2.0f));
    for (int i = 0; i < (int) proc.curve.size(); ++i) {
        auto s = toScreen(proc.curve[(size_t) i]);
        g.setColour(i == selected && hasKeyboardFocus(false) ? col::fg : col::accent);
        g.fillEllipse(s.x - 5, s.y - 5, 10, 10);
    }
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(11.5f));
    g.drawText(juce::String::fromUTF8("tık: ekle · çift tık: sil · Alt+sürükle: eğrilik · oklar: seçili nokta"), in.removeFromBottom(14), juce::Justification::centredRight);
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
    h.addColumn("Nota", 1, 70);
    h.addColumn("d (ms)", 2, 90);
    h.addColumn(juce::String::fromUTF8("θ (°)"), 3, 90);
    h.addColumn(juce::String::fromUTF8("vuruş"), 4, 60);
    h.addColumn("kilit", 5, 60);
    h.addColumn("", 6, 60);
    table.setRowHeight(24);
    table.setTitle(juce::String::fromUTF8("Nota tablosu"));
    addAndMakeVisible(table);
    clearAll.onClick = [this] { for (auto& r : rows) proc.align.clearNote(r.first); refresh(); };
    addAndMakeVisible(clearAll);
    hint.setText(juce::String::fromUTF8("Nota başına modunda her bas notası için (d, θ) öğrenilir. Değeri çift tıkla düzenle → nota kilitlenir."),
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
    if (c == 1) s = noteName(note) + "  (" + juce::String(note) + ")";
    else if (c == 4) s = juce::String(e.count) + (e.manual ? " *" : "");
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(13.0f));
    g.drawText(s, 6, 0, w - 8, h, juce::Justification::centredLeft);
}

juce::Component* NoteTable::refreshComponentForCell(int row, int c, bool, juce::Component* existing) {
    delete existing;
    if (row >= (int) rows.size()) return nullptr;
    const int note = rows[(size_t) row].first;
    const auto e = rows[(size_t) row].second;
    if (c == 2 || c == 3) {
        auto* l = new juce::Label();
        l->setEditable(false, true);
        l->setText(juce::String(c == 2 ? e.d : e.th, c == 2 ? 3 : 1), juce::dontSendNotification);
        l->setColour(juce::Label::textColourId, col::fg);
        l->onTextChange = [this, note, c, l] {
            auto t = proc.align.noteTable();
            auto cur = t[note];
            const double v = l->getText().getDoubleValue();
            proc.align.setNoteValue(note, c == 2 ? juce::jlimit(-50.0, 50.0, v) : cur.d, c == 3 ? v : cur.th);
        };
        return l;
    }
    if (c == 5) {
        auto* b = new juce::ToggleButton();
        b->setToggleState(e.locked, juce::dontSendNotification);
        b->setTitle("kilit " + noteName(note));
        b->onClick = [this, note, b] { proc.align.lockNote(note, b->getToggleState()); };
        return b;
    }
    if (c == 6) {
        auto* b = new juce::TextButton("sil");
        b->setTitle("sil " + noteName(note));
        b->onClick = [this, note] { proc.align.clearNote(note); juce::MessageManager::callAsync([this] { refresh(); }); };
        return b;
    }
    return nullptr;
}

} // namespace kb::ui
