// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Advice.h"

namespace kb::ui {

static juce::String U(const char* s) { return juce::String::fromUTF8(s); }
static constexpr int kMinHits = 6;

// Türkçe sayı: ondalık virgül, gerçek eksi işareti
static juce::String num(double v, int dec, bool sign = false) {
    // juce::String(double, 0) tam hassasiyet yazar: tam sayıyı ayrıca yuvarla
    juce::String s = dec == 0 ? juce::String((int) std::lround(std::abs(v))) : juce::String(std::abs(v), dec).replaceCharacter('.', ',');
    if (v < 0 && s.containsAnyOf("123456789")) return U("−") + s;
    return (sign && v > 0 && s.containsAnyOf("123456789") ? "+" : "") + s;
}
static juce::String db(double v) { return num(v, 2, true) + " dB"; }

// −1,75 yarım ses → sampler'da "Transp −2 · Detune +25 ct"
static juce::String transpText(double st) {
    const int n = (int) std::lround(st);
    const int ct = (int) std::lround((st - n) * 100.0);
    juce::String s = U("Transp ") + num((double) n, 0, true);
    if (ct != 0) s << U(" · Detune ") << num((double) ct, 0, true) << " ct";
    return s;
}
static juce::String stText(double st) {
    const double a = std::abs(st);
    juce::String v = std::abs(a - std::round(a)) < 1e-9 ? juce::String((int) std::lround(a)) : num(a, 2);
    return (st < 0 ? U("−") : U("+")) + v + U(" yarım ses");
}

std::array<AdviceCard, 3> describeAdvice(const Advice& a, const AdviceContext& c) {
    std::array<AdviceCard, 3> k;
    k[0].title = U("KICK AKORDU");
    k[1].title = U("SYNTH RETRIGGER");
    k[2].title = U("DUCKING");
    if (!c.sidechain) {
        for (auto& x : k) { x.state = AdviceCard::Waiting; x.headline = U("Sidechain bağlı değil"); }
        k[0].detail = U("Öneriler kick'i dinleyerek çıkar: sidechain kaynağı olarak KICK kanalını seç.");
        return k;
    }
    if (a.hits < kMinHits) {
        for (auto& x : k) { x.state = AdviceCard::Waiting; x.headline = U("Dinliyorum… ") + juce::String(a.hits) + " / " + juce::String(kMinHits) + U(" vuruş"); }
        k[0].detail = U("Kick ile bas birlikte çalarken ölçer. Eklenti kick'e dokunmaz: öneriler, senin DAW'da yapacağın küçük değişiklikler.");
        k[1].detail = U("Aynı notanın vuruşlarında bas ile kick arasındaki faz ilişkisi tutarlı mı, ona bakar.");
        k[2].detail = U("Hizalama ve akort yetmiyorsa, kick'in gövdesi kadar kısa bir alt bant ducking'i önerir.");
        return k;
    }
    const juce::String kick = std::isfinite(a.kickHz) ? U("Kick ~") + num(a.kickHz, 1) + " Hz" : U("Kick");
    const juce::String note = a.topNote >= 0
        ? noteName(a.topNote) + " (" + num(440.0 * std::pow(2.0, (a.topNote - 69) / 12.0), 1) + " Hz)" : U("—");

    // ── 0 · akort
    if (a.tuneSt != 0.0) {
        const double lenPct = (std::pow(2.0, -a.tuneSt / 12.0) - 1.0) * 100.0;
        k[0].state = AdviceCard::Suggest;
        k[0].headline = U("Kick'i ") + stText(a.tuneSt) + U(" akort et");
        k[0].detail = kick + U(", bas en çok ") + note + U(" çalıyor. Son vuruşlarda ölçüldü: toplam alt bant ") + db(a.tuneGain0)
            + U(" → ") + db(a.tuneGain) + U(".\nSimpler/Sampler'da ") + transpText(a.tuneSt) + U(" (Warp kapalı: kick %") + num(std::abs(lenPct), 0)
            + (lenPct > 0 ? U(" uzar") : U(" kısalır")) + U("). En fazla ±2 yarım ses önerilir; hiçbir vuruş ") + num(0.5, 1)
            + U(" dB'den fazla kötüleşmez. Akort ettikten sonra 'Yeniden ölç'.");
    } else if (std::isfinite(a.tuneFarSt) && std::abs(a.tuneFarSt) > adv::kMaxSt + 0.5 && a.rho < 0.4) {
        k[0].state = AdviceCard::Info;
        k[0].headline = U("Akort önerilmez");
        k[0].detail = kick + U(", bas en çok ") + note + U(" çalıyor: arada ") + num(std::abs(a.tuneFarSt), 1)
            + U(" yarım ses var. Kick'i bu kadar oynatmak karakterini bozar; ±2 yarım ses içinde ölçülen kazanç ")
            + num(adv::kMinGainDb, 2) + U(" dB'yi geçmiyor.");
    } else {
        k[0].state = AdviceCard::Good;
        k[0].headline = U("Akort gerekmiyor");
        k[0].detail = kick + U(", bas en çok ") + note + U(" çalıyor. ±2 yarım ses içinde hiçbir akort toplamı ")
            + num(adv::kMinGainDb, 2) + U(" dB'den fazla artırmıyor (bugün ") + db(a.tuneGain0) + U(").");
    }

    // ── 1 · retrigger + mod
    const juce::String R = a.retrigR >= 0 ? U(" (tutarlılık ") + num(a.retrigR, 2) + ")" : juce::String();
    if (a.retrig == Retrig::Free) {
        k[1].state = AdviceCard::Suggest;
        k[1].headline = U("Synth'in osilatörü serbest çalışıyor");
        k[1].detail = U("Aynı notada bile faz her vuruşta değişiyor") + R + U(": tek ayar hepsine oturmaz. Synth'te osilatör retrigger'ını aç — "
                        "Operator: osilatördeki R · Drift: Retrigger · Meld: Phase Reset · Serum: Random Phase 0. "
                        "Açamıyorsan 'Her vuruşta' + 'Tam + LA'.");
        if (c.mode != Mode::PerHit || c.latency != LatencyMode::FullLookahead) k[1].action = U("Her vuruşta (Tam+LA)");
    } else if (a.retrig == Retrig::Consistent) {
        k[1].state = AdviceCard::Good;
        k[1].headline = U("Bas her notada aynı fazdan başlıyor");
        const bool multi = a.mode == SuggestMode::PerNote;
        k[1].detail = U("Retrigger açık ya da bas bir audio örneği") + R + U(". ")
            + (multi ? U("Birden çok nota var: 'Nota başına' her notaya kendi kalıcı ayarını verir.")
                     : U("Tek nota ağırlıkta: 'Learn' bir kez öğrenip sabit tutar."));
        const Mode want = multi ? Mode::PerNote : Mode::Learn;
        if (c.mode != want) k[1].action = multi ? U("Nota başına moduna geç") : U("Learn moduna geç");
    } else {
        k[1].state = AdviceCard::Waiting;
        k[1].headline = a.retrigR >= 0 ? U("Henüz karar yok") + R : U("Bas notası okunamadı");
        k[1].detail = a.retrigR >= 0 ? U("Aynı notadan en az 6 vuruş ve net bir sonuç gerekiyor; biraz daha çal.")
                                     : U("Bas, kick vuruşlarında net bir nota çalmıyor (ya da çok kısa).");
    }

    // ── 2 · ducking
    if (a.duck && !c.duckOn) {
        k[2].state = AdviceCard::Suggest;
        k[2].headline = U("Kick gövdesinde basın altını kıs");
        k[2].detail = U("Bas kick'le aynı bölgede ama başka frekansta: hizalama ve akort yetmiyor (uyum ") + num(a.rhoTuned, 2)
            + U("). Öneri: ") + num(a.duckLenMs, 0) + U(" ms (kick gövdesi), %") + num(a.duckDepth * 100, 0)
            + U(", yalnız 120 Hz altı — basın üstü korunur, kick'e dokunulmaz.");
        k[2].action = U("Ducking'i uygula");
    } else if (c.duckOn) {
        k[2].state = AdviceCard::Good;
        k[2].headline = U("Ducking açık");
        k[2].detail = a.duck ? U("Önerilen ayar: ") + num(a.duckLenMs, 0) + U(" ms, %") + num(a.duckDepth * 100, 0)
                                   + U(". Gelişmiş > Ducking'de eğriyi değiştirebilirsin.")
                             : U("Bu bas hattı için gerekli görünmüyor: bas kick'le uyumlu ya da kick'in çok üstünde çalıyor. "
                                 "Pompalama efekti istiyorsan açık kalsın.");
    } else {
        k[2].state = AdviceCard::Good;
        k[2].headline = U("Ducking gerekmiyor");
        k[2].detail = U("Bas kick'le uyumlu ya da kick'in çok üstünde çalıyor: bas olduğu gibi kalsın.");
    }
    return k;
}

// ───────────────────────────── panel
AdvicePanel::AdvicePanel(KBAlignProcessor& p, bool c) : proc(p), compact(c) {
    setTitle(U("Öneriler"));
    for (int i = 0; i < 3; ++i) {
        act[(size_t) i].onClick = [this, i] { apply(i); };
        addChildComponent(act[(size_t) i]);
    }
    reset.setTooltip(U("Ölçümü baştan başlatır — örneğin kick'i akort ettikten sonra."));
    reset.onClick = [this] { proc.advisor.clear(); };
    addAndMakeVisible(reset);
    if (compact) {
        details.onClick = [this] { if (onDetails) onDetails(); };
        details.setTooltip(U("Önerilerin ayrıntısı: Gelişmiş > Öneriler"));
        addAndMakeVisible(details);
        reset.setVisible(false);
    }
    refresh();
    startTimerHz(4);
}

AdvicePanel::~AdvicePanel() { stopTimer(); }

void AdvicePanel::timerCallback() {
    const int v = proc.advisor.version();
    AdviceContext cx;
    cx.mode = (Mode) (int) proc.apvts.getRawParameterValue(pid::mode)->load();
    cx.latency = (LatencyMode) (int) proc.apvts.getRawParameterValue(pid::latency)->load();
    cx.duckOn = proc.apvts.getRawParameterValue(pid::duck)->load() > 0.5f;
    cx.sidechain = proc.sidechainConnected();
    const juce::String key = juce::String((int) cx.mode) + "/" + juce::String((int) cx.latency) + "/" + juce::String((int) cx.duckOn) + "/"
                             + juce::String((int) cx.sidechain);
    if (v == lastVer && key == lastCtx) return;
    lastVer = v;
    lastCtx = key;
    last = proc.advisor.result();
    cards = describeAdvice(last, cx);
    for (int i = 0; i < 3; ++i) {
        auto& b = act[(size_t) i];
        b.setButtonText(cards[(size_t) i].action);
        b.setVisible(cards[(size_t) i].action.isNotEmpty());
    }
    juce::String d;
    for (auto& c : cards) d << c.title << ": " << c.headline << ". " << c.detail << "\n";
    setDescription(d);  // ekran okuyucu ve yardım çubuğu
    resized();
    repaint();
}

void AdvicePanel::refresh() { lastVer = -1; timerCallback(); }

void AdvicePanel::apply(int i) {
    auto set = [this](const char* id, float v) {
        if (auto* prm = proc.apvts.getParameter(id)) {
            prm->beginChangeGesture();
            prm->setValueNotifyingHost(prm->convertTo0to1(v));
            prm->endChangeGesture();
        }
    };
    proc.undo.beginNewTransaction(U("Öneriyi uygula"));
    if (i == 1) {
        if (last.retrig == Retrig::Free) {
            set(pid::mode, (float) Mode::PerHit);
            set(pid::latency, (float) LatencyMode::FullLookahead);
        } else if (last.retrig == Retrig::Consistent) {
            set(pid::mode, (float) (last.mode == SuggestMode::PerNote ? Mode::PerNote : Mode::Learn));
        }
    } else if (i == 2 && last.duck) {
        set(pid::duckTarget, 0.0f);   // alt bant
        set(pid::duckSync, 0.0f);
        set(pid::duckDepth, (float) last.duckDepth);
        set(pid::duckLen, (float) last.duckLenMs);
        set(pid::duck, 1.0f);
    }
    refresh();
}

juce::Rectangle<int> AdvicePanel::cardRect(int i) const {
    auto r = getLocalBounds();
    if (compact) {
        r.removeFromTop(22);
        const int h = r.getHeight() / 3;
        return r.withY(r.getY() + i * h).withHeight(h).reduced(0, 2);
    }
    r.removeFromTop(28);
    const int w = (r.getWidth() - 16) / 3;
    return r.withX(r.getX() + i * (w + 8)).withWidth(w);
}

static juce::Colour stateCol(AdviceCard::State s) {
    switch (s) {
        case AdviceCard::Good: return col::ok;
        case AdviceCard::Suggest: return col::accent;
        case AdviceCard::Info: return col::bass;
        default: return col::fgFaint;
    }
}

void AdvicePanel::resized() {
    auto r = getLocalBounds();
    auto top = r.removeFromTop(compact ? 20 : 24);
    if (compact) details.setBounds(top.removeFromRight(90));
    else reset.setBounds(top.removeFromRight(110));
    for (int i = 0; i < 3; ++i) {
        auto c = cardRect(i);
        if (compact) act[(size_t) i].setBounds(c.removeFromRight(150).reduced(2, 1));
        else act[(size_t) i].setBounds(c.reduced(12, 10).removeFromBottom(28).removeFromRight(190));
    }
}

void AdvicePanel::paint(juce::Graphics& g) {
    auto r = getLocalBounds();
    auto top = r.removeFromTop(compact ? 20 : 24);
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(compact ? 14.0f : 13.5f, juce::Font::bold));
    g.drawText(U("Öneriler"), top, juce::Justification::centredLeft);
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(12.0f));
    const juce::String sub = U("kick'e dokunmaz · ") + juce::String(last.hits) + U(" vuruş dinlendi");
    g.drawText(sub, top.withTrimmedLeft(compact ? 74 : 76).withTrimmedRight(compact ? 96 : 116), juce::Justification::centredLeft);
    for (int i = 0; i < 3; ++i) {
        const auto& c = cards[(size_t) i];
        auto cr = cardRect(i);
        const auto sc = stateCol(c.state);
        if (compact) {
            auto row = cr.toFloat();
            g.setColour(col::panelHi);
            g.fillRoundedRectangle(row, 6);
            auto in = cr.reduced(8, 0);
            g.setColour(sc);
            g.fillEllipse(in.removeFromLeft(9).withSizeKeepingCentre(9, 9).toFloat());
            in.removeFromLeft(8);
            g.setColour(col::fgFaint);
            g.setFont(juce::FontOptions(11.0f, juce::Font::bold));
            g.drawText(c.title, in.removeFromLeft(118), juce::Justification::centredLeft);
            if (c.action.isNotEmpty()) in.removeFromRight(150);
            g.setColour(col::fg);
            g.setFont(juce::FontOptions(13.0f));
            g.drawFittedText(c.headline, in, juce::Justification::centredLeft, 1, 0.85f);
            continue;
        }
        g.setColour(col::panelHi);
        g.fillRoundedRectangle(cr.toFloat(), 10);
        g.setColour(sc);
        g.fillRoundedRectangle(cr.removeFromLeft(4).toFloat().withTrimmedTop(8).withTrimmedBottom(8), 2);
        auto in = cr.reduced(12, 10);
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(11.0f, juce::Font::bold));
        g.drawText(c.title, in.removeFromTop(16), juce::Justification::centredLeft);
        g.setColour(c.state == AdviceCard::Waiting ? col::fgSoft : col::fg);
        g.setFont(juce::FontOptions(15.0f, juce::Font::bold));
        g.drawFittedText(c.headline, in.removeFromTop(22), juce::Justification::centredLeft, 1, 0.8f);
        in.removeFromTop(4);
        if (c.action.isNotEmpty()) in.removeFromBottom(32);
        juce::AttributedString as;
        as.append(c.detail, juce::FontOptions(12.0f), col::fgSoft);
        as.setLineSpacing(1.5f);
        as.setWordWrap(juce::AttributedString::byWord);
        as.draw(g, in.toFloat());
    }
}

} // namespace kb::ui
