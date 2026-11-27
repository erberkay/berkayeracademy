// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Advice.h"

namespace kb::ui {

static constexpr int kMinHits = 6;

static juce::String db(double v) { return fmtNum(v, 2, true) + " dB"; }

// −1,75 yarım ses → sampler'da "Transpose −2 · Detune +25 ct"
static juce::String transpText(double st) {
    const int n = (int) std::lround(st);
    const int ct = (int) std::lround((st - n) * 100.0);
    juce::String s = L("Transpose ", "Transp ") + fmtNum((double) n, 0, true);
    if (ct != 0) s << juce::String::fromUTF8(" · Detune ") << fmtNum((double) ct, 0, true) << " ct";
    return s;
}
static juce::String stText(double st) {
    const double a = std::abs(st);
    const juce::String v = std::abs(a - std::round(a)) < 1e-9 ? juce::String((int) std::lround(a)) : fmtNum(a, 2);
    return (st < 0 ? juce::String::fromUTF8("−") : juce::String("+")) + v + L(" semitones", " yarım ses");
}

std::array<AdviceCard, 3> describeAdvice(const Advice& a, const AdviceContext& c) {
    std::array<AdviceCard, 3> k;
    k[0].title = L("KICK TUNING", "KICK AKORDU");
    k[1].title = L("SYNTH RETRIGGER", "SYNTH RETRIGGER");
    k[2].title = "DUCKING";
    if (!c.sidechain) {
        for (auto& x : k) { x.state = AdviceCard::Waiting; x.headline = L("No sidechain", "Sidechain bağlı değil"); }
        k[0].detail = L("Suggestions come from listening to the kick: pick the KICK track as the sidechain source.",
                        "Öneriler kick'i dinleyerek çıkar: sidechain kaynağı olarak KICK kanalını seç.");
        return k;
    }
    if (a.hits < kMinHits) {
        for (auto& x : k) {
            x.state = AdviceCard::Waiting;
            x.headline = L("Listening… ", "Dinliyorum… ") + juce::String(a.hits) + " / " + juce::String(kMinHits) + L(" hits", " vuruş");
        }
        k[0].detail = L("Measures while kick and bass play together. The kick is never touched: these are small changes you make in your DAW.",
                        "Kick ile bas birlikte çalarken ölçer. Kick'e dokunulmaz: öneriler, DAW'da yapacağın küçük değişiklikler.");
        k[1].detail = L("Checks whether the bass starts each note at the same phase.", "Basın her notada aynı fazdan başlayıp başlamadığına bakar.");
        k[2].detail = L("If alignment and tuning can't fix the overlap, it suggests a short low-band duck.",
                        "Hizalama ve akort yetmezse kısa bir alt bant ducking'i önerir.");
        return k;
    }
    const juce::String kick = std::isfinite(a.kickHz) ? juce::String("Kick ~") + fmtNum(a.kickHz, 1) + " Hz" : juce::String("Kick");
    const juce::String note = a.topNote >= 0 ? noteName(a.topNote) + " (" + fmtNum(440.0 * std::pow(2.0, (a.topNote - 69) / 12.0), 1) + " Hz)"
                                             : juce::String::fromUTF8("—");
    const juce::String mostly = L(", bass mostly ", ", bas en çok ");

    // ── 0 · akort
    if (a.tuneSt != 0.0) {
        const double lenPct = (std::pow(2.0, -a.tuneSt / 12.0) - 1.0) * 100.0;
        k[0].state = AdviceCard::Suggest;
        k[0].headline = L("Tune the kick ", "Kick'i ") + stText(a.tuneSt) + L("", " akort et");
        k[0].detail = kick + mostly + note + L(". Measured on the last hits: low end ", ". Son vuruşlarda ölçüldü: alt bant ") + db(a.tuneGain0)
            + juce::String::fromUTF8(" → ") + db(a.tuneGain) + ".\n" + L("In Simpler/Sampler: ", "Simpler/Sampler'da: ") + transpText(a.tuneSt)
            + L(" (Warp off: kick gets ", " (Warp kapalı: kick %") + fmtNum(std::abs(lenPct), 0) + (isTurkish() ? (lenPct > 0 ? " uzar)." : " kısalır).")
                                                                                                           : (lenPct > 0 ? "% longer)." : "% shorter)."))
            + L(" Max ±2 semitones, so the kick keeps its character. Press Re-measure afterwards.",
                " En fazla ±2 yarım ses: kick karakterini korur. Sonra 'Yeniden ölç'.");
    } else if (std::isfinite(a.tuneFarSt) && std::abs(a.tuneFarSt) > adv::kMaxSt + 0.5 && a.rho < 0.4) {
        k[0].state = AdviceCard::Info;
        k[0].headline = L("Tuning not recommended", "Akort önerilmez");
        k[0].detail = kick + mostly + note + L(": ", ": arada ") + fmtNum(std::abs(a.tuneFarSt), 1) + L(" semitones apart. Moving the kick that far would change its character.",
                                                                                                     " yarım ses var. Kick'i bu kadar oynatmak karakterini bozar.");
    } else {
        k[0].state = AdviceCard::Good;
        k[0].headline = L("No tuning needed", "Akort gerekmiyor");
        k[0].detail = kick + mostly + note + L(". No tuning within ±2 semitones adds more than 0.25 dB.",
                                               ". ±2 yarım ses içinde hiçbir akort 0,25 dB'den fazla kazandırmıyor.");
    }

    // ── 1 · retrigger + mod
    const juce::String R = a.retrigR >= 0 ? L(" (consistency ", " (tutarlılık ") + fmtNum(a.retrigR, 2) + ")" : juce::String();
    if (a.retrig == Retrig::Free) {
        k[1].state = AdviceCard::Suggest;
        k[1].headline = L("Synth oscillator is free-running", "Synth'in osilatörü serbest çalışıyor");
        k[1].detail = L("The phase changes on every hit, even on the same note", "Aynı notada bile faz her vuruşta değişiyor") + R
            + L(". Turn on oscillator retrigger: Operator R · Drift Retrigger · Meld Phase Reset · Serum Random Phase 0. "
                "Can't? Use Per Hit + Full + Lookahead.",
                ". Osilatör retrigger'ını aç: Operator R · Drift Retrigger · Meld Phase Reset · Serum Random Phase 0. "
                "Açamıyorsan: Her vuruş + Tam + lookahead.");
        if (c.mode != Mode::PerHit || c.latency != LatencyMode::FullLookahead) { k[1].action = L("Use Per Hit + Lookahead", "Her vuruş + lookahead"); k[1].actionShort = L("Apply", "Uygula"); }
    } else if (a.retrig == Retrig::Consistent) {
        k[1].state = AdviceCard::Good;
        k[1].headline = L("Bass starts every note in phase", "Bas her notada aynı fazdan başlıyor");
        const bool multi = a.mode == SuggestMode::PerNote;
        k[1].detail = L("Retrigger is on, or the bass is an audio sample", "Retrigger açık ya da bas bir audio örneği") + R + ". "
            + (multi ? L("Several notes: Per Note gives each note its own setting.", "Birden çok nota: Nota başına her notaya kendi ayarını verir.")
                     : L("One main note: Learn finds it once and holds it.", "Tek nota ağırlıkta: Learn bir kez bulup sabit tutar."));
        const Mode want = multi ? Mode::PerNote : Mode::Learn;
        if (c.mode != want) {
            k[1].action = multi ? L("Switch to Per Note", "Nota başına moduna geç") : L("Switch to Learn", "Learn moduna geç");
            k[1].actionShort = multi ? L("Per Note", "Nota başına") : juce::String("Learn");
        }
    } else {
        k[1].state = AdviceCard::Waiting;
        k[1].headline = a.retrigR >= 0 ? L("Not sure yet", "Henüz karar yok") + R : L("No clear bass note", "Bas notası okunamadı");
        k[1].detail = a.retrigR >= 0 ? L("Needs at least 6 hits of the same note and a clear result. Keep playing.",
                                         "Aynı notadan en az 6 vuruş ve net bir sonuç gerekiyor; biraz daha çal.")
                                     : L("The bass doesn't play a clear note on the kick hits (or it's very short).",
                                         "Bas, kick vuruşlarında net bir nota çalmıyor (ya da çok kısa).");
    }

    // ── 2 · ducking
    if (a.duck && !c.duckOn) {
        k[2].state = AdviceCard::Suggest;
        k[2].headline = L("Duck the bass lows under the kick", "Kick gövdesinde basın altını kıs");
        k[2].detail = L("Same region, different pitch: alignment and tuning can't fix it (match ", "Aynı bölge, farklı perde: hizalama ve akort yetmiyor (uyum ")
            + fmtNum(a.rhoTuned, 2) + "). " + fmtNum(a.duckLenMs, 0) + L(" ms (kick body), ", " ms (kick gövdesi), %") + fmtNum(a.duckDepth * 100, 0)
            + L("%, below 120 Hz only — the bass tone stays, the kick is untouched.", ", yalnız 120 Hz altı — basın tınısı kalır, kick'e dokunulmaz.");
        k[2].action = L("Apply ducking", "Ducking'i uygula");
        k[2].actionShort = L("Apply", "Uygula");
    } else if (c.duckOn) {
        k[2].state = AdviceCard::Good;
        k[2].headline = L("Ducking is on", "Ducking açık");
        k[2].detail = a.duck ? L("Suggested: ", "Önerilen: ") + fmtNum(a.duckLenMs, 0) + " ms, " + fmtNum(a.duckDepth * 100, 0)
                                   + L("%. Shape it in Advanced › Ducking.", "%. Eğriyi Gelişmiş › Ducking'de şekillendir.")
                             : L("Not needed for this bass line. Keep it if you want the pumping effect.",
                                 "Bu bas hattı için gerekli değil. Pompalama etkisi istiyorsan açık kalsın.");
    } else {
        k[2].state = AdviceCard::Good;
        k[2].headline = L("No ducking needed", "Ducking gerekmiyor");
        k[2].detail = L("The bass fits the kick, or plays well above it: leave it as it is.",
                        "Bas kick'le uyumlu ya da kick'in çok üstünde çalıyor: olduğu gibi kalsın.");
    }
    return k;
}

// ───────────────────────────── panel
AdvicePanel::AdvicePanel(KBAlignProcessor& p, bool c) : proc(p), compact(c) {
    setTitle(L("Suggestions", "Öneriler"));
    for (int i = 0; i < 3; ++i) {
        act[(size_t) i].onClick = [this, i] { apply(i); };
        addChildComponent(act[(size_t) i]);
    }
    reset.setButtonText(L("Re-measure", "Yeniden ölç"));
    details.setButtonText(L("Details", "Ayrıntı"));
    reset.setTooltip(L("Starts measuring again, e.g. after you retuned the kick.", "Ölçümü baştan başlatır, örneğin kick'i akort ettikten sonra."));
    reset.onClick = [this] { proc.advisor.clear(); };
    addAndMakeVisible(reset);
    if (compact) {
        details.onClick = [this] { if (onDetails) onDetails(); };
        details.setTooltip(L("Details: Advanced \u203a Suggestions", "Ayrıntı: Gelişmiş \u203a Öneriler"));
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
        b.setButtonText(compact ? cards[(size_t) i].actionShort : cards[(size_t) i].action);
        b.setTooltip(cards[(size_t) i].action);
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
    proc.undo.beginNewTransaction("Apply suggestion");
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
        if (compact) act[(size_t) i].setBounds(c.removeFromRight(100).reduced(3, 3));
        else act[(size_t) i].setBounds(c.reduced(12, 10).removeFromBottom(28).removeFromRight(190));
    }
}

void AdvicePanel::paint(juce::Graphics& g) {
    auto r = getLocalBounds();
    auto top = r.removeFromTop(compact ? 20 : 24);
    const juce::String sub = L("never touches the kick \u00b7 ", "kick'e dokunmaz \u00b7 ") + juce::String(last.hits) + L(" hits analysed", " vuruş dinlendi");
    if (compact) {
        g.setColour(col::fg);
        g.setFont(juce::FontOptions(14.0f, juce::Font::bold));
        g.drawText(L("Suggestions", "Öneriler"), top, juce::Justification::centredLeft);
        top.removeFromLeft((int) std::ceil(juce::GlyphArrangement::getStringWidth(juce::FontOptions(14.0f, juce::Font::bold), L("Suggestions", "Öneriler"))) + 12);
    }
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(12.0f));
    g.drawText(sub, top.withTrimmedRight(compact ? 96 : 120), juce::Justification::centredLeft);
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
            g.drawText(c.title, in.removeFromLeft(112), juce::Justification::centredLeft);
            if (c.action.isNotEmpty()) in.removeFromRight(100);
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
