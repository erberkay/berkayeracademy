// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#pragma once

#include "../PluginProcessor.h"

#include <juce_gui_basics/juce_gui_basics.h>

namespace kb::ui {

// Renk körlüğüne uygun (Okabe–Ito) iz renkleri; izler çizgi tipiyle de ayrılır
namespace col {
inline const juce::Colour bg{0xff0b0b0e}, panel{0xff15151b}, panelHi{0xff1d1d25}, line{0x22ffffff}, grid{0x14ffffff};
inline const juce::Colour fg{0xfff3efe6}, fgSoft{0xffb9b3a8}, fgFaint{0xff8a857c};
inline const juce::Colour accent{0xffe8b84b};
inline const juce::Colour kick{0xffe69f00}, bass{0xff56b4e9}, sum{0xfff0e442}, ok{0xff009e73}, warn{0xffd55e00};
} // namespace col

class KBLook : public juce::LookAndFeel_V4 {
public:
    KBLook();
    void drawRotarySlider(juce::Graphics&, int x, int y, int w, int h, float pos, float a0, float a1, juce::Slider&) override;
    void drawLinearSlider(juce::Graphics&, int x, int y, int w, int h, float pos, float minP, float maxP,
                          juce::Slider::SliderStyle, juce::Slider&) override;
    void drawButtonBackground(juce::Graphics&, juce::Button&, const juce::Colour&, bool over, bool down) override;
    void drawToggleButton(juce::Graphics&, juce::ToggleButton&, bool over, bool down) override;
    juce::Font getComboBoxFont(juce::ComboBox&) override { return juce::FontOptions(13.0f); }
    juce::Font getTextButtonFont(juce::TextButton&, int) override { return juce::FontOptions(13.0f, juce::Font::bold); }
    juce::Font getLabelFont(juce::Label&) override { return juce::FontOptions(12.5f); }
};

// Etiketli parametre kontrolü (slider + değer kutusu + APVTS bağlantısı)
class ParamSlider : public juce::Component {
public:
    ParamSlider(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& label, bool rotary = false);
    bool stacked = false;  // etiket üstte, kaydırıcı altta (dar sütunlar için)
    void resized() override;
    juce::Slider slider;
private:
    juce::Label label;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> att;
    bool rotary;
};

class ParamToggle : public juce::Component {
public:
    ParamToggle(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& label);
    void resized() override { button.setBounds(getLocalBounds()); }
    juce::ToggleButton button;
private:
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> att;
};

class ParamCombo : public juce::Component {
public:
    ParamCombo(juce::AudioProcessorValueTreeState& s, const char* id, const juce::String& label);
    void resized() override;
    juce::ComboBox box;
private:
    juce::Label label;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> att;
};

// Ducking eğri düzenleyici: tık = nokta ekle, çift tık = sil, sürükle = taşı, Alt+sürükle = eğrilik
class CurveEditor : public juce::Component {
public:
    explicit CurveEditor(KBAlignProcessor& p) : proc(p) { setWantsKeyboardFocus(true); setTitle(juce::String::fromUTF8("Ducking eğrisi")); }
    void paint(juce::Graphics&) override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;
    void mouseUp(const juce::MouseEvent&) override;
    void mouseDoubleClick(const juce::MouseEvent&) override;
    bool keyPressed(const juce::KeyPress&) override;
private:
    juce::Point<float> toScreen(const CurvePoint& p) const;
    CurvePoint fromScreen(juce::Point<float> s) const;
    int hit(juce::Point<float> s) const;
    KBAlignProcessor& proc;
    int drag = -1, selected = 1;
    float dragStartY = 0, dragStartC = 0;
};

// Nota tablosu: nota, d, θ, vuruş sayısı, kilit, sil; değerler çift tıkla düzenlenir
class NoteTable : public juce::Component, public juce::TableListBoxModel, private juce::Timer {
public:
    explicit NoteTable(KBAlignProcessor& p);
    void resized() override;
    int getNumRows() override { return (int) rows.size(); }
    void paintRowBackground(juce::Graphics&, int row, int w, int h, bool selected) override;
    void paintCell(juce::Graphics&, int row, int col, int w, int h, bool selected) override;
    juce::Component* refreshComponentForCell(int row, int col, bool selected, juce::Component* existing) override;
    void refresh();
private:
    void timerCallback() override { refresh(); }
    KBAlignProcessor& proc;
    juce::TableListBox table;
    juce::TextButton clearAll{juce::String::fromUTF8("Tabloyu temizle")};
    juce::Label hint;
    std::vector<std::pair<int, NoteEntry>> rows;
};

juce::String noteName(int midi);

} // namespace kb::ui
