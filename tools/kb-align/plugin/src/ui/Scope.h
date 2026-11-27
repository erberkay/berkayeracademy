// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#pragma once

#include "Widgets.h"

namespace kb::ui {

// Osiloskop verisi: motorun geçmiş tamponlarından tetiklenmiş anlık görüntü (UI thread'i, 60 fps)
struct ScopeFrame {
    std::vector<float> kick, bass, sum, bassIn;  // görüntü filtresi uygulanmış (alt bant görünümü açıksa)
    std::vector<float> mk, mb, mbi;  // ölçüm için: hizalamanın yapıldığı alt bant (LR4, crossover frekansı)
    std::vector<float> rk, rb;       // filtresiz kick ve bas çıkışı (spektrum görünümü)
    int64_t c0 = 0;          // ilk örneğin içerik zamanı
    double fs = 48000;
    double preMs = 10;       // tetikten önceki süre
    bool valid = false;
};

enum class Trigger { Kick = 0, Tempo = 1, Free = 2 };

class ScopeView : public juce::Component, private juce::Timer {
public:
    explicit ScopeView(KBAlignProcessor& p);
    ~ScopeView() override;
    void paint(juce::Graphics&) override;
    void resized() override;
    void mouseDown(const juce::MouseEvent&) override;
    void mouseDrag(const juce::MouseEvent&) override;
    void mouseUp(const juce::MouseEvent&) override;
    void mouseDoubleClick(const juce::MouseEvent&) override;
    void mouseWheelMove(const juce::MouseEvent&, const juce::MouseWheelDetails&) override;
    bool keyPressed(const juce::KeyPress&) override;

    // ayarlar (araç çubuğu)
    Trigger trigger = Trigger::Kick;
    double windowMs = 120, preMs = 10;
    bool lowView = true; double viewHz = 200;
    int average = 1;
    bool persistence = false, frozen = false;
    bool showKick = true, showBass = true, showSum = true, showBefore = false;
    double tempoBeats = 1.0;
    double refHz = 55.0;         // derece için referans frekans (otomatik: son tespit edilen nota)
    bool refAuto = true;
    std::function<void()> onFrame;  // ölçerlere haber ver

    const ScopeFrame& frame() const { return cur; }
    // ölçer verisi: analiz penceresi aralığı (frame içinde örnek indeksi)
    juce::Range<int> analysisWindowSamples() const;
    double cursorA = -1e9, cursorB = -1e9;  // ms (tetiğe göre); -1e9 = yok

private:
    void timerCallback() override;
    bool acquire(ScopeFrame& f);
    void displayFilter(std::vector<float>& v, double fs) const;
    float xOf(double ms) const;
    double msOf(float x) const;
    float yOf(float v) const;
    KBAlignProcessor& proc;
    ScopeFrame cur;
    std::deque<ScopeFrame> history;  // kalıcılık / ortalama
    juce::Rectangle<float> plot;
    float vScale = 1.0f;
    enum class Drag { None, Bass, CursorA, CursorB, WinStart, WinEnd } drag = Drag::None;
    double dragStartMs = 0, dragStartVal = 0;
    int64_t lastOnset = -1;
};

class MeterPanel : public juce::Component {
public:
    MeterPanel(KBAlignProcessor& p, ScopeView& s) : proc(p), scope(s) {}
    void paint(juce::Graphics&) override;
    void update();
    void paintPhase(juce::Graphics&, juce::Rectangle<float>) const;
    void paintXY(juce::Graphics&, juce::Rectangle<float>) const;
    void paintSpectrum(juce::Graphics&, juce::Rectangle<float>) const;
    double correlation() const { return corr; }
    double rmsGainDb() const { return rmsAfter - rmsBefore; }
    double peakGainDb() const { return peakAfter - peakBefore; }
    bool hasData() const { return has; }
    std::function<void()> onUpdate;
    bool compact = false;  // basit görünüm: yalnız ana ölçüler
private:
    bool has = false;
    KBAlignProcessor& proc;
    ScopeView& scope;
    double corr = 0, cancelDb = 0, peakBefore = 0, peakAfter = 0, rmsBefore = 0, rmsAfter = 0;
    std::vector<float> phaseHz, phaseDeg, coh;
    std::vector<juce::Point<float>> xy;
    std::deque<std::vector<std::complex<double>>> gkb;
    std::deque<std::vector<double>> gkk, gbb;
    std::vector<float> specHz, specK, specB;  // 20–500 Hz, dB (yumuşatılmış)
};

} // namespace kb::ui

namespace kb::ui {
// Faz-frekans ya da XY büyük görünümü (osiloskop alanında sekme)
class PlotView : public juce::Component {
public:
    PlotView(MeterPanel& m, int which) : meters(m), kind(which) {}
    void paint(juce::Graphics& g) override {
        auto r = getLocalBounds().toFloat();
        g.setColour(col::panel);
        g.fillRoundedRectangle(r, 10);
        if (kind == 0) meters.paintPhase(g, r.reduced(16, 12));
        else if (kind == 1) meters.paintXY(g, r.reduced(16, 12));
        else meters.paintSpectrum(g, r.reduced(16, 12));
    }
private:
    MeterPanel& meters;
    int kind;
};
} // namespace kb::ui
