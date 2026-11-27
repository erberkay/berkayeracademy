// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// Arayüz ekleri: düğme sırası (seçim parametresi), seviye ölçeri, alt bilgi çubuğu, tanıtım turu.
#pragma once

#include "Widgets.h"

namespace kb::ui {

// Seçim parametresine bağlı düğme sırası (radyo grubu). Klavye: oklar / Tab.
class SegmentedChoice : public juce::Component {
public:
    SegmentedChoice(juce::AudioProcessorValueTreeState& s, const char* id, const juce::StringArray& labels,
                    const juce::StringArray& tips = {});
    void resized() override;
    void paint(juce::Graphics&) override;
    juce::OwnedArray<juce::TextButton> buttons;
private:
    void sync(float v);
    std::unique_ptr<juce::ParameterAttachment> att;
};

// Dikey tepe ölçeri (dBFS), tepe tutma
class LevelMeter : public juce::Component, public juce::SettableTooltipClient {
public:
    explicit LevelMeter(const juce::String& name) : label(name) { setTitle(name); }
    void push(float peak);
    void paint(juce::Graphics&) override;
private:
    juce::String label;
    float level = 0, hold = 0;
    int holdFrames = 0;
};

// Pencerenin altındaki bilgi çubuğu: fare hangi kontrolün üzerindeyse onun ipucunu yazar
class HelpBar : public juce::Component {
public:
    explicit HelpBar(juce::Component& root);
    ~HelpBar() override;
    void paint(juce::Graphics&) override;
    void setDefault(const juce::String& t) { def = t; repaint(); }
    void update(juce::Component* c);
private:
    struct Listener : juce::MouseListener {
        HelpBar& h;
        explicit Listener(HelpBar& b) : h(b) {}
        void mouseEnter(const juce::MouseEvent& e) override { h.update(e.eventComponent); }
        void mouseMove(const juce::MouseEvent& e) override { h.update(e.eventComponent); }
    } listener{*this};
    juce::Component& root;
    juce::String text, def;
};

// Tanıtım turu: hedef bileşeni vurgulayan, metinli adımlar. Esc: kapat, Enter/→: ileri, ←: geri.
class TourOverlay : public juce::Component {
public:
    struct Step { juce::Component* target; juce::String title, body; };
    explicit TourOverlay(std::vector<Step> steps);
    std::function<void()> onFinish;
    void paint(juce::Graphics&) override;
    void resized() override;
    bool keyPressed(const juce::KeyPress&) override;
    void mouseDown(const juce::MouseEvent&) override {}
    int current() const { return idx; }
    void go(int i);
private:
    juce::Rectangle<float> targetRect() const;
    juce::Rectangle<int> bubbleRect() const;
    std::vector<Step> steps;
    int idx = 0;
    juce::TextButton next, back, skip;
};

// Sidechain durum hapı: LED (yeşil = kick geliyor, her vuruşta yanıp söner; kırmızı = sidechain yok) + metin
class StatusPill : public juce::Component, public juce::SettableTooltipClient {
public:
    void set(int state, const juce::String& text, bool pulse);  // 0 bekliyor, 1 iyi, 2 sorun, 3 meşgul (Learn)
    void paint(juce::Graphics&) override;
private:
    int st = 0;
    juce::String txt;
    float glow = 0;
};

// Birincil eylem düğmesi (Learn): altın dolgulu; dinlerken ilerleme çubuğu, bitince onay
class PrimaryButton : public juce::Button {
public:
    PrimaryButton() : juce::Button("primary") {}
    void setProgress(float p) { if (p != progress) { progress = p; repaint(); } }  // < 0: yok
    void setDone(bool d) { if (d != done) { done = d; repaint(); } }
    void paintButton(juce::Graphics&, bool over, bool down) override;
private:
    float progress = -1;
    bool done = false;
};

// İki parçalı anahtar (ÖNCE | SONRA, EN | TR, Basit | Gelişmiş): seçili parça dolu
class TwoWaySwitch : public juce::Component, public juce::SettableTooltipClient {
public:
    TwoWaySwitch(const juce::String& a, const juce::String& b) : la(a), lb(b) { setWantsKeyboardFocus(true); }
    void setLabels(const juce::String& a, const juce::String& b) { la = a; lb = b; repaint(); }
    void setSecond(bool s) { if (s != second) { second = s; repaint(); } }
    bool isSecond() const { return second; }
    std::function<void(bool)> onChange;
    juce::Colour onFirst = col::fgSoft, onSecond = col::accent;  // seçili parçanın dolgusu
    float fontSize = 13.0f;
    void paint(juce::Graphics&) override;
    void mouseDown(const juce::MouseEvent&) override;
    bool keyPressed(const juce::KeyPress&) override;
private:
    juce::String la, lb;
    bool second = false;
};

// Kalıcı kullanıcı ayarları (tur gösterildi mi vb.) — makine başına
juce::PropertiesFile& userSettings();

} // namespace kb::ui
