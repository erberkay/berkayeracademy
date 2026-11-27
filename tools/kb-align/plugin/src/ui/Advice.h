// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// "Öneriler" paneli: Danışman'ın (engine/Advisor) üç önerisi — kick akordu, synth retrigger, ducking.
// Kick'e hiçbir zaman dokunulmaz; öneriler kullanıcının DAW'da yapacağı değişikliklerdir. Ducking ve mod
// önerileri tek tıkla uygulanabilir (geri al ile geri alınır).
#pragma once

#include "Widgets.h"

namespace kb::ui {

struct AdviceCard {
    enum State { Waiting = 0, Good = 1, Suggest = 2, Info = 3 };
    State state = Waiting;
    juce::String title, headline, detail, action, actionShort;  // actionShort: kısa görünümün düğmesi
};

struct AdviceContext {
    Mode mode = Mode::Manual;
    LatencyMode latency = LatencyMode::Full;
    bool duckOn = false;
    bool sidechain = true;
};

// Saf metin üretimi (Türkçe). Üç kart: 0 akort, 1 retrigger, 2 ducking.
std::array<AdviceCard, 3> describeAdvice(const Advice& a, const AdviceContext& c);

class AdvicePanel : public juce::Component, private juce::Timer {
public:
    AdvicePanel(KBAlignProcessor& p, bool compact);
    ~AdvicePanel() override;
    void paint(juce::Graphics&) override;
    void resized() override;
    std::function<void()> onDetails;  // kısa görünümde "Ayrıntı" → Gelişmiş > Öneriler
    void refresh();

private:
    void timerCallback() override;
    void apply(int card);
    juce::Rectangle<int> cardRect(int i) const;

    KBAlignProcessor& proc;
    const bool compact;
    std::array<AdviceCard, 3> cards;
    Advice last;
    int lastVer = -1;
    juce::String lastCtx;
    std::array<juce::TextButton, 3> act;
    juce::TextButton reset{juce::String::fromUTF8("Yeniden ölç")}, details{juce::String::fromUTF8("Ayrıntı →")};
};

} // namespace kb::ui
