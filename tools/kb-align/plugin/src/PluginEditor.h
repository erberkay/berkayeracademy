#pragma once

#include "PluginProcessor.h"
#include "ui/Scope.h"
#include "ui/Widgets.h"

namespace kb {

// Tüm içerik sabit taban boyutta (1180×760) çizilir; "UI ölçeği" %75–200 dönüşümle uygulanır.
class EditorContent : public juce::Component, private juce::Timer {
public:
    explicit EditorContent(KBAlignProcessor& p);
    ~EditorContent() override;
    void paint(juce::Graphics&) override;
    void resized() override;
    std::function<void(float)> onScale;

private:
    void timerCallback() override;
    void savePreset();
    void loadPreset();
    juce::File presetDir() const;

    KBAlignProcessor& proc;
    ui::KBLook look;

    // üst çubuk
    juce::Label title;
    ui::ParamCombo mode, autoTarget, latency;
    juce::TextButton learn{"Learn"}, ab{"A / B"}, copyAB{juce::String::fromUTF8("A→B")}, undoB{"Geri"}, redoB{"Yinele"};
    juce::TextButton save{"Kaydet"}, load{juce::String::fromUTF8("Aç")};
    juce::ComboBox factory, scale;
    ui::ParamToggle bypass;
    juce::Label scWarn;

    // osiloskop + araç çubuğu
    ui::ScopeView scope;
    ui::MeterPanel meters;
    juce::ComboBox trig, tempoBeats;
    juce::Slider zoom, pre, viewHz, avg;
    juce::ToggleButton lowView{juce::String::fromUTF8("Alt bant görünümü")}, persist{juce::String::fromUTF8("Kalıcılık")}, freeze{"Dondur"},
        tKick{"Kick"}, tBass{"Bas"}, tSum{"Toplam"}, tBefore{juce::String::fromUTF8("Önceki bas")};
    juce::Label zoomL, preL, viewL, avgL;

    // alt sekmeler
    juce::TabbedComponent tabs{juce::TabbedButtonBar::TabsAtTop};
    juce::Component pAlign, pXover, pDuck;
    ui::ParamSlider predelay, phase, search, learnHits, winStart, winMs, scOffset, trigHz, contRate;
    ui::ParamToggle crossover, bassMono, duck, duckSync;
    ui::ParamSlider fc, monoHz, monoWidth, duckDepth, duckLen;
    ui::ParamCombo listen, duckBeats, duckTarget;
    ui::CurveEditor curve;
    ui::NoteTable notes;
    juce::Label xoverNote, duckNote;
    std::unique_ptr<juce::FileChooser> chooser;
};

class KBAlignEditor : public juce::AudioProcessorEditor {
public:
    explicit KBAlignEditor(KBAlignProcessor& p);
    void resized() override;
    void paint(juce::Graphics& g) override { g.fillAll(ui::col::bg); }
    static constexpr int kW = 1180, kH = 760;
private:
    void applyScale(float s);
    EditorContent content;
    float scale = 1.0f;
};

} // namespace kb
