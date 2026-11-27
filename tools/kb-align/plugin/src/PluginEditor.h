// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#pragma once

#include "PluginProcessor.h"
#include "ui/Advice.h"
#include "ui/Extras.h"
#include "ui/Scope.h"
#include "ui/Widgets.h"

namespace kb {

// Büyük okunur gösterge: uygulanan kaydırma, faz, toplamdaki kazanç, nota
class Readout : public juce::Component {
public:
    Readout(KBAlignProcessor& p, ui::MeterPanel& m) : proc(p), meters(m) {
        setTitle(juce::String::fromUTF8("Uygulanan hizalama"));
        setDescription(juce::String::fromUTF8("Şu an uygulanan kaydırma (ms) ve faz (°), ve kick + bas toplamının hizalamayla ne kadar değiştiği."));
    }
    void paint(juce::Graphics&) override;
private:
    KBAlignProcessor& proc;
    ui::MeterPanel& meters;
};

// Tüm içerik sabit taban boyutta (1180×780) çizilir; "UI ölçeği" %75–200 dönüşümle uygulanır.
class EditorContent : public juce::Component, private juce::Timer {
public:
    static constexpr int kW = 1180, kH = 780;
    static inline bool autoTour = true;  // ekran görüntüsü aracı kapatır

    explicit EditorContent(KBAlignProcessor& p);
    ~EditorContent() override;
    void paint(juce::Graphics&) override;
    void resized() override;
    std::function<void(float)> onScale;

    void setAdvanced(bool adv);
    void setView(int v);  // 0 dalga, 1 faz, 2 XY
    void startTour(int step = 0);
    void maybeAutoTour();
    juce::TabbedComponent& advancedTabs() { return tabs; }

private:
    void timerCallback() override;
    void savePreset();
    void loadPreset();
    void showHelpMenu();
    void stepPreset(int dir);
    juce::File presetDir() const;

    KBAlignProcessor& proc;
    ui::KBLook look;
    bool advanced = false;
    int view = 0;

    // üst çubuk
    juce::Label title, subtitle;
    juce::TextButton presetPrev{juce::String::fromUTF8("‹")}, presetNext{juce::String::fromUTF8("›")};
    juce::ComboBox factory, scale;
    juce::TextButton save{"Kaydet"}, load{juce::String::fromUTF8("Aç")};
    juce::TextButton ab{"A"}, copyAB{juce::String::fromUTF8("A→B")}, undoB{juce::String::fromUTF8("↶")}, redoB{juce::String::fromUTF8("↷")};
    juce::TextButton viewSimple{"Basit"}, viewAdv{juce::String::fromUTF8("Gelişmiş")};
    juce::TextButton help{"?"};
    juce::TextButton compare;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> compareAtt;

    // mod çubuğu
    ui::SegmentedChoice modeSeg;
    juce::TextButton learn{juce::String::fromUTF8("Learn'ü başlat")};
    ui::ParamCombo autoTarget, latency;
    juce::Label status;

    // orta alan
    juce::TextButton vWave{"Dalga"}, vPhase{"Faz"}, vXY{"XY"};
    ui::ScopeView scope;
    ui::MeterPanel meters;
    ui::PlotView phasePlot, xyPlot;
    juce::ComboBox trig, tempoBeats;
    juce::Slider zoom, pre, viewHz, avg;
    juce::ToggleButton lowView{juce::String::fromUTF8("Alt bant görünümü")}, persist{juce::String::fromUTF8("Kalıcılık")}, freeze{"Dondur"},
        tKick{"Kick"}, tBass{"Bas"}, tSum{"Toplam"}, tBefore{juce::String::fromUTF8("Önceki bas")};
    juce::Label zoomL, preL, viewL, avgL;

    // sağ sütun
    Readout readout;
    ui::ParamSlider predelay, phase, outGain;
    ui::ParamToggle polarity;
    ui::LevelMeter mKick{"KICK"}, mIn{juce::String::fromUTF8("GİRİŞ")}, mOut{juce::String::fromUTF8("ÇIKIŞ")};

    // alt alan — basit
    juce::Component simplePane;
    juce::Label stepsTitle, step1, step2, step3;
    ui::ParamToggle sCrossover, sBassMono, sDuck;
    ui::ParamSlider sFc;

    // alt alan — gelişmiş
    juce::TabbedComponent tabs{juce::TabbedButtonBar::TabsAtTop};
    juce::Component pAlign, pXover, pDuck;
    ui::ParamSlider search, learnHits, winStart, winMs, scOffset, trigHz, contRate;
    ui::ParamToggle crossover, bassMono, duck, duckSync;
    ui::ParamSlider fc, monoHz, monoWidth, duckDepth, duckLen;
    ui::ParamCombo listen, duckBeats, duckTarget;
    ui::CurveEditor curve;
    ui::NoteTable notes;
    juce::Label xoverNote, duckNote;
    ui::AdvicePanel adviceTab{proc, false}, adviceMini{proc, true};  // Danışman: Gelişmiş > Öneriler ve basit görünüm

    ui::HelpBar helpBar{*this};
    juce::TooltipWindow tooltips{this, 600};
    std::unique_ptr<ui::TourOverlay> tour;
    std::unique_ptr<juce::FileChooser> chooser;
    int tick = 0;
};

class KBAlignEditor : public juce::AudioProcessorEditor, private juce::Timer {
public:
    explicit KBAlignEditor(KBAlignProcessor& p);
    void resized() override {}
    void paint(juce::Graphics& g) override { g.fillAll(ui::col::bg); }
    EditorContent& getContent() { return content; }
private:
    void timerCallback() override { stopTimer(); content.maybeAutoTour(); }
    void applyScale(float s);
    EditorContent content;
    float scale = 1.0f;
};

} // namespace kb
