// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
// Look & feel: dark charcoal, black panels, purple accent, embedded Inter typeface (SIL OFL 1.1). EN (default) / TR text.
#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

namespace pf::ui {

namespace col {
inline const juce::Colour bg{0xff141418}, panel{0xff0b0b0e}, panelHi{0xff1b1b22}, panelHi2{0xff24242d}, line{0x26ffffff}, grid{0x14ffffff};
inline const juce::Colour fg{0xfff2f0f7}, fgSoft{0xffb8b4c6}, fgFaint{0xff8a8698};
inline const juce::Colour accent{0xff8b5cf6}, accentHi{0xffa78bfa}, accentLo{0xff5b3bb0};
inline const juce::Colour mainSpec{0xff9aa0ab}, scSpec{0xfff5f5f7}, conflictMid{0xffef4444}, conflictSide{0xfffacc15};
inline const juce::Colour reduction{0xff22d3ee}, ok{0xff22c55e}, warn{0xfff59e0b}, bad{0xffef4444};
}  // namespace col

bool isTurkish();
void setTurkish(bool tr);
inline juce::String L(const char* en, const char* tr) { return juce::String::fromUTF8(isTurkish() ? tr : en); }
juce::String fmtNum(double v, int decimals, bool plus = false);
juce::String fmtHz(double hz);
juce::String upper(const juce::String& s);   // Turkish-aware (i → İ, ı → I, ş → Ş …); JUCE's toUpperCase misses these
juce::PropertiesFile& userSettings();

class Look : public juce::LookAndFeel_V4 {
public:
    Look();
    juce::Typeface::Ptr getTypefaceForFont(const juce::Font&) override;
    void drawRotarySlider(juce::Graphics&, int x, int y, int w, int h, float pos, float a0, float a1, juce::Slider&) override;
    void drawLinearSlider(juce::Graphics&, int x, int y, int w, int h, float pos, float, float, juce::Slider::SliderStyle, juce::Slider&) override;
    void drawButtonBackground(juce::Graphics&, juce::Button&, const juce::Colour&, bool over, bool down) override;
    void drawToggleButton(juce::Graphics&, juce::ToggleButton&, bool over, bool down) override;
    juce::Font getTextButtonFont(juce::TextButton&, int) override { return juce::FontOptions(13.0f, juce::Font::bold); }
    juce::Font getComboBoxFont(juce::ComboBox&) override { return juce::FontOptions(13.0f); }
    juce::Font getLabelFont(juce::Label& l) override { return l.getFont(); }
    void drawComboBox(juce::Graphics&, int w, int h, bool down, int bx, int by, int bw, int bh, juce::ComboBox&) override;
    void drawTooltip(juce::Graphics&, const juce::String&, int w, int h) override;
    juce::Rectangle<int> getTooltipBounds(const juce::String&, juce::Point<int>, juce::Rectangle<int>) override;
private:
    juce::Typeface::Ptr tfRegular, tfSemi, tfDisplay;
};

// Knob bound to a parameter: label above, value below (parameter's own text), double-click = default.
class Knob : public juce::Component {
public:
    Knob(juce::AudioProcessorValueTreeState& s, const juce::String& paramId, const juce::String& label, juce::Colour c = col::accent);
    void resized() override;
    void paint(juce::Graphics&) override;
    juce::Slider slider;
    void setTooltip(const juce::String& t) { slider.setTooltip(t); }
    void rebind(juce::AudioProcessorValueTreeState& s, const juce::String& paramId);  // bottom bar follows the selected node
private:
    juce::String label;
    juce::Colour colour;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> att;
};

// Pill toggle bound to a bool parameter
class PillToggle : public juce::TextButton {
public:
    PillToggle(juce::AudioProcessorValueTreeState& s, const juce::String& paramId, const juce::String& text, juce::Colour on = col::accent);
    void rebind(juce::AudioProcessorValueTreeState& s, const juce::String& paramId);
private:
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> att;
};

// Segmented choice bound to a choice parameter
class Segmented : public juce::Component, public juce::SettableTooltipClient {
public:
    Segmented(juce::AudioProcessorValueTreeState& s, const juce::String& paramId, const juce::StringArray& labels);
    void paint(juce::Graphics&) override;
    void mouseDown(const juce::MouseEvent&) override;
    void rebind(juce::AudioProcessorValueTreeState& s, const juce::String& paramId);
private:
    juce::StringArray labels;
    int sel = 0;
    std::unique_ptr<juce::ParameterAttachment> att;
};

}  // namespace pf::ui
