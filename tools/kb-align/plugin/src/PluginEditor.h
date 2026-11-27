// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// Editör (arayüz v4): İngilizce varsayılan, Türkçe seçeneği; dil değişince içerik yeniden kurulur.
#pragma once

#include "PluginProcessor.h"
#include "ui/Advice.h"
#include "ui/Extras.h"
#include "ui/Scope.h"
#include "ui/Widgets.h"

namespace kb {

// Sonuç kartı: alt bant kazancı (büyük), uygulanan kaydırma / faz / nota
class Readout : public juce::Component {
public:
    Readout(KBAlignProcessor& p, ui::MeterPanel& m) : proc(p), meters(m) {}
    void paint(juce::Graphics&) override;
private:
    KBAlignProcessor& proc;
    ui::MeterPanel& meters;
};

// Görünüm sekmeleri (Waveform · Phase · Spectrum · XY): seçili olanın altı çizili
class ViewTabs : public juce::Component {
public:
    explicit ViewTabs(juce::StringArray names) : items(std::move(names)) { setWantsKeyboardFocus(true); }
    void paint(juce::Graphics&) override;
    void mouseDown(const juce::MouseEvent&) override;
    bool keyPressed(const juce::KeyPress&) override;
    void setSelected(int i) { sel = i; repaint(); }
    std::function<void(int)> onChange;
    juce::StringArray tips;
private:
    juce::Rectangle<float> itemRect(int i) const;
    juce::StringArray items;
    int sel = 0;
};

// Basit görünümdeki 3 adım: yapıldıkça işaretlenir
class GuideSteps : public juce::Component {
public:
    void set(bool a, bool b, bool c) { if (a != done[0] || b != done[1] || c != done[2]) { done[0] = a; done[1] = b; done[2] = c; repaint(); } }
    void paint(juce::Graphics&) override;
private:
    bool done[3] = {false, false, false};
};

// Kart zemini (başlıklı panel)
class Card : public juce::Component {
public:
    explicit Card(juce::String t = {}) : title(std::move(t)) { setInterceptsMouseClicks(false, true); }
    void paint(juce::Graphics&) override;
    juce::String title;
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
    std::function<void()> onLanguage;  // dil değişti: editör içeriği yeniden kurar

    void setAdvanced(bool adv);
    void setView(int v);  // 0 dalga, 1 faz, 2 spektrum, 3 XY
    void startTour(int step = 0);
    void maybeAutoTour();
    juce::TabbedComponent& advancedTabs() { return tabs; }

private:
    void timerCallback() override;
    void savePreset();
    void loadPreset();
    void showHelpMenu();
    void stepPreset(int dir);
    void updateEnablement();
    juce::File presetDir() const;

    KBAlignProcessor& proc;
    juce::SharedResourcePointer<ui::KBLook> look;  // ortak: varsayılan L&F (gömülü yazı tipi)
    bool advanced = false;
    int view = 0;

    // üst çubuk
    juce::Label title, subtitle;
    juce::Rectangle<int> brandMark;
    juce::TextButton presetPrev, presetNext;
    juce::ComboBox factory, scale;
    juce::TextButton save, load, copyAB, undoB, redoB, help;
    ui::TwoWaySwitch abSwitch{"A", "B"}, viewSwitch{"", ""}, langSwitch{"EN", "TR"};

    // kontrol çubuğu
    ui::StatusPill statusPill;
    ui::SegmentedChoice modeSeg;
    ui::ParamCombo modeCombo, autoTarget, latency;
    ui::PrimaryButton learn;

    // orta alan
    ViewTabs viewTabs;
    ui::ScopeView scope;
    ui::MeterPanel meters;
    ui::PlotView phasePlot, xyPlot, specPlot;
    juce::ComboBox trig, tempoBeats;
    juce::Slider zoom, pre, viewHz, avg;
    juce::ToggleButton lowView;
    juce::TextButton persist, freeze, tKick, tBass, tSum, tBefore;  // çipler
    juce::Label zoomL, preL, viewL, avgL;

    // sağ sütun
    ui::TwoWaySwitch compare{"", ""};
    std::unique_ptr<juce::ParameterAttachment> compareAtt;
    Readout readout;
    Card trimCard, meterCard;
    ui::ParamSlider predelay, phase, outGain;
    ui::ParamToggle polarity;
    ui::LevelMeter mKick{"KICK"}, mIn{"IN"}, mOut{"OUT"};

    // alt alan — basit
    juce::Component simplePane;
    GuideSteps guide;
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
    juce::Label xoverNote, alignNote;
    ui::AdvicePanel adviceTab{proc, false}, adviceMini{proc, true};

    ui::HelpBar helpBar{*this};
    juce::TooltipWindow tooltips{this, 600};
    std::unique_ptr<ui::TourOverlay> tour;
    std::unique_ptr<juce::FileChooser> chooser;
    int tick = 0, lastOnsets = 0;
    bool compared = false;
};

class KBAlignEditor : public juce::AudioProcessorEditor, private juce::Timer {
public:
    explicit KBAlignEditor(KBAlignProcessor& p);
    void resized() override {}
    void paint(juce::Graphics& g) override { g.fillAll(ui::col::bg); }
    EditorContent& getContent() { return *content; }
private:
    void timerCallback() override { stopTimer(); content->maybeAutoTour(); }
    void build();
    void applyScale(float s);
    KBAlignProcessor& proc;
    std::unique_ptr<EditorContent> content;
    float scale = 1.0f;
};

} // namespace kb
