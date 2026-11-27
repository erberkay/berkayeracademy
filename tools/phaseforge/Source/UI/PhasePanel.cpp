// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
#include "PhasePanel.h"

namespace pf::ui {

// ───────────────────────────── PhaseCurve
void PhaseCurve::setRotate(const std::vector<float>& c, double bestDeg, double currentDeg, bool valid) {
    mode = c.size() == 361 ? 1 : 0;
    a = c;
    best = bestDeg;
    cur = currentDeg;
    ok = valid;
    repaint();
}

void PhaseCurve::setMatch(const std::vector<float>& hz, const std::vector<float>& deg, const std::vector<float>& weight, double l, double h) {
    mode = hz.size() > 1 && hz.size() == deg.size() ? 2 : 0;
    a = hz;
    b = deg;
    w = weight;
    lo = l;
    hi = h;
    repaint();
}

void PhaseCurve::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 8);
    g.setColour(col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 8, 1);
    auto p = r.reduced(10, 8).withTrimmedBottom(12);
    g.setFont(juce::FontOptions(9.5f));
    if (mode == 0) {
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(12.0f));
        g.drawFittedText(L("Press ANALYZE PHASE while kick and bass play together", "Kick ve bas birlikte çalarken FAZI ANALİZ ET'e bas"),
                         p.toNearestInt(), juce::Justification::centred, 2);
        return;
    }
    g.setColour(col::grid);
    g.drawHorizontalLine((int) p.getCentreY(), p.getX(), p.getRight());
    if (mode == 1) {
        // x: −180..180°, y: normalized score −1..1
        auto xOf = [&](double d) { return (float) (p.getX() + (d + 180.0) / 360.0 * p.getWidth()); };
        float mn = 1e9f, mx = -1e9f;
        for (float v : a) { mn = std::min(mn, v); mx = std::max(mx, v); }
        const float span = std::max(0.05f, mx - mn);
        auto yOf = [&](float v) { return p.getBottom() - (v - mn) / span * p.getHeight(); };
        for (int d : {-180, -90, 0, 90, 180}) {
            g.setColour(d == 0 ? col::line : col::grid);
            g.drawVerticalLine((int) xOf(d), p.getY(), p.getBottom());
            g.setColour(col::fgFaint);
            g.drawText(juce::String(d) + juce::String::fromUTF8("°"), (int) xOf(d) - 18, (int) p.getBottom() + 1, 36, 11, juce::Justification::centred);
        }
        juce::Path path;
        for (size_t i = 0; i < a.size(); ++i) {
            const float x = xOf(-180.0 + (double) i), y = yOf(a[i]);
            if (i == 0) path.startNewSubPath(x, y); else path.lineTo(x, y);
        }
        g.setColour(col::accentHi);
        g.strokePath(path, juce::PathStrokeType(1.6f));
        g.setColour(col::fgSoft.withAlpha(0.8f));
        g.drawVerticalLine((int) xOf(cur), p.getY(), p.getBottom());
        if (ok) {
            const float x = xOf(best);
            const int idx = juce::jlimit(0, 360, (int) std::lround(best + 180.0));
            g.setColour(col::ok);
            g.fillEllipse(x - 4, yOf(a[(size_t) idx]) - 4, 8, 8);
        }
        return;
    }
    // mode 2: correction (deg) vs log frequency over the band
    const double l = std::max(10.0, lo * 0.8), h = hi * 1.25;
    auto xOf = [&](double hz) { return (float) (p.getX() + std::log(hz / l) / std::log(h / l) * p.getWidth()); };
    float mx = 30.0f;
    for (float v : b) mx = std::max(mx, std::abs(v));
    auto yOf = [&](float v) { return p.getCentreY() - v / mx * p.getHeight() * 0.5f; };
    for (double f : {20.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0, 5000.0, 10000.0}) {
        if (f < l || f > h) continue;
        g.setColour(col::grid);
        g.drawVerticalLine((int) xOf(f), p.getY(), p.getBottom());
        g.setColour(col::fgFaint);
        g.drawText(fmtHz(f), (int) xOf(f) - 22, (int) p.getBottom() + 1, 44, 11, juce::Justification::centred);
    }
    g.setColour(col::fgFaint);
    g.drawText("+" + juce::String((int) mx) + juce::String::fromUTF8("°"), (int) p.getX(), (int) p.getY(), 40, 11, juce::Justification::centredLeft);
    juce::Path path;
    bool started = false;
    for (size_t i = 0; i < a.size(); ++i) {
        if (a[i] < l || a[i] > h) continue;
        const float x = xOf(a[i]), y = yOf(b[i]);
        if (!started) { path.startNewSubPath(x, y); started = true; } else path.lineTo(x, y);
        if (i < w.size()) { g.setColour(col::accent.withAlpha(0.15f + 0.6f * juce::jlimit(0.0f, 1.0f, w[i]))); g.fillRect(x - 0.5f, p.getBottom() - 4, 1.5f, 4.0f); }
    }
    g.setColour(col::accentHi);
    g.strokePath(path, juce::PathStrokeType(1.6f));
}

// ───────────────────────────── PhasePanel
PhasePanel::PhasePanel(PhaseForgeProcessor& p)
    : proc(p),
      power(p.apvts, id::phaseOn, L("ON", "AÇIK")),
      mode(p.apvts, id::phaseMode, {L("Phase Rotate", "Faz Döndür"), L("Phase Match", "Faz Eşle")}),
      range(p.apvts, id::phaseRange, {L("Low", "Alçak"), L("Mid", "Orta"), L("High", "Yüksek"), L("Custom", "Özel")}),
      angle(p.apvts, id::phaseAngle, L("Phase angle", "Faz açısı")),
      blend(p.apvts, id::matchBlend, L("Match blend", "Eşleme oranı")),
      lo(p.apvts, id::phaseLo, L("Low cut", "Alt sınır")),
      hi(p.apvts, id::phaseHi, L("High cut", "Üst sınır")) {
    power.setTooltip(L("Phase stage on/off. Off = no rotation and no match correction (latency stays the same).",
                       "Faz katmanı açık/kapalı. Kapalı = döndürme ve eşleme yok (gecikme aynı kalır)."));
    mode.setTooltip(L("Phase Rotate: one all-pass angle for the whole band. Phase Match: a frequency-dependent correction (always linear-phase FIR).",
                      "Faz Döndür: bütün bant için tek açı. Faz Eşle: frekansa göre değişen düzeltme (her zaman doğrusal faz FIR)."));
    range.setTooltip(L("Band that is analysed and rotated. Low 20–200 Hz (kick/bass), Mid 200–2000, High 2–16 kHz, Custom = the two knobs.",
                       "Analiz edilip döndürülen bant. Alçak 20–200 Hz (kick/bas), Orta 200–2000, Yüksek 2–16 kHz, Özel = iki düğme."));
    angle.setTooltip(L("Rotation applied to the main (submissive) signal inside the band. 0° is a bit-exact pass-through.",
                       "Bant içinde ana (geri planda kalan) sinyale uygulanan döndürme. 0° sesi hiç değiştirmez."));
    blend.setTooltip(L("How much of the measured Phase Match correction is applied.", "Ölçülen Faz Eşle düzeltmesinin ne kadarı uygulanır."));
    for (auto* c : std::initializer_list<juce::Component*>{&power, &mode, &range, &angle, &blend, &lo, &hi, &analyze, &apply, &clearMatch, &curve, &status, &detail})
        addAndMakeVisible(c);
    analyze.setButtonText(L("ANALYZE PHASE", "FAZI ANALİZ ET"));
    analyze.setColour(juce::TextButton::buttonColourId, col::accent);
    analyze.setTooltip(L("Listens to 2–5 s of main + sidechain playing together, then suggests a setting. Nothing changes until you press APPLY.",
                         "Ana sinyal ve sidechain birlikte çalarken 2–5 sn dinler, sonra bir ayar önerir. UYGULA'ya basana kadar hiçbir şey değişmez."));
    analyze.onClick = [this] {
        if (waiting) proc.cancelPhaseAnalysis(); else proc.requestPhaseAnalysis();
    };
    apply.setButtonText(L("APPLY", "UYGULA"));
    apply.onClick = [this] { proc.applyPhaseResult(); shownId = ~0ull; };
    clearMatch.setButtonText(L("Clear match", "Eşlemeyi sil"));
    clearMatch.setTooltip(L("Remove the applied Phase Match correction (back to identity).", "Uygulanan Faz Eşle düzeltmesini kaldırır."));
    clearMatch.onClick = [this] { proc.clearMatchCorrection(); };
    status.setFont(juce::FontOptions(14.0f, juce::Font::bold));
    status.setColour(juce::Label::textColourId, col::fg);
    status.setMinimumHorizontalScale(0.7f);
    detail.setFont(juce::FontOptions(12.0f));
    detail.setColour(juce::Label::textColourId, col::fgSoft);
    detail.setJustificationType(juce::Justification::topLeft);
    timerCallback();
    startTimerHz(15);
}

PhasePanel::~PhasePanel() { stopTimer(); }

juce::String PhasePanel::statusText(const PhaseResult& r) const {
    using S = PhaseResult::Status;
    switch (r.status) {
        case S::Ok: return r.match ? L("Match found", "Eşleme bulundu") : L("Suggested angle", "Önerilen açı");
        case S::NotEnoughAudio: return L("Not enough audio — play longer", "Yetersiz ses — daha uzun çal");
        case S::Silent: return L("Too quiet in this band", "Bu bantta ses çok kısık");
        case S::Unrelated: return L("Signals don't interact here", "Sinyaller bu bantta etkileşmiyor");
        case S::Inconsistent: return L("Relationship keeps changing", "İlişki sürekli değişiyor");
        case S::NoSidechain: return L("Connect a sidechain first", "Önce sidechain bağla");
    }
    return {};
}

void PhasePanel::refreshResult(const PhaseResult& r) {
    using S = PhaseResult::Status;
    if (r.id == 0) {
        status.setText(L("No analysis yet", "Henüz analiz yok"), juce::dontSendNotification);
        detail.setText(proc.sidechainConnected() ? L("Route the kick (or the dominant sound) to the sidechain input, play both, press ANALYZE PHASE.",
                                                     "Kick'i (ya da baskın sesi) sidechain girişine yönlendir, ikisini çal, FAZI ANALİZ ET'e bas.")
                                                 : L("No sidechain connected. In your DAW, send the kick to PHASEFORGE's sidechain input.",
                                                     "Sidechain bağlı değil. DAW'da kick'i PHASEFORGE'un sidechain girişine gönder."),
                       juce::dontSendNotification);
        confidence = -1;
        curve.clear();
        return;
    }
    const bool good = r.status == S::Ok;
    status.setText(statusText(r) + (good && !r.match ? ":  " + fmtNum(r.angleDeg, 1, true) + juce::String::fromUTF8("°") : juce::String()),
                   juce::dontSendNotification);
    status.setColour(juce::Label::textColourId, good ? col::fg : col::warn);
    juce::String d;
    if (r.match) {
        const auto& e = r.estimate;
        if (good) {
            d << L("max correction ", "en büyük düzeltme ") << fmtNum(e.maxCorrectionDeg, 0) << juce::String::fromUTF8("° · ")
              << L("smear ", "yayılma ") << fmtNum(e.groupDelaySpreadMs, 1) << " ms";
            if (r.aggressive)
                d << "\n" << L("Strong correction — listen for transient smearing before applying.",
                               "Güçlü düzeltme — uygulamadan önce vuruşlarda yayılma var mı dinle.");
        } else {
            d << L("The main signal is left untouched.", "Ana sinyale dokunulmadı.");
        }
        curve.setMatch(e.hz, e.correctionDeg, e.weight, r.loHz, r.hiHz);
        confidence = e.confidence;
    } else {
        if (good) {
            d << L("band level ", "bant seviyesi ") << fmtNum(r.sumGainDb, 1, true) << " dB " << L("vs 0°", "(0°'ye göre)")
              << juce::String::fromUTF8(" · ") << fmtNum(r.seconds, 1) << " s " << L("analysed", "analiz");
            if (r.confidence < 0.3)
                d << "\n" << L("Low confidence — A/B it by ear (Bypass) before keeping it.", "Güven düşük — saklamadan önce kulakla karşılaştır (Bypass).");
            if (r.filterMode != juce::roundToInt(proc.apvts.getRawParameterValue(id::filterMode)->load()))
                d << "\n" << L("Filter mode changed since the analysis — analyse again.", "Analizden sonra filtre modu değişti — yeniden analiz et.");
        } else {
            d << L("Angle stays at its current value (0° recommended).", "Açı olduğu gibi kalır (0° önerilir).");
        }
        curve.setRotate(r.curve, r.angleDeg, proc.apvts.getRawParameterValue(id::phaseAngle)->load(), good);
        confidence = r.confidence;
    }
    if (r.applied && good) d << "\n" << L("Applied.", "Uygulandı.");
    detail.setText(d, juce::dontSendNotification);
}

void PhasePanel::timerCallback() {
    const auto r = proc.getPhaseResult();
    const bool w = r.state == AnalysisState::Waiting;
    const bool m = proc.apvts.getRawParameterValue(id::phaseMode)->load() > 0.5f;
    const bool c = juce::roundToInt(proc.apvts.getRawParameterValue(id::phaseRange)->load()) == 3;
    if (m != isMatch || c != custom) { isMatch = m; custom = c; resized(); }
    if (w != waiting) {
        waiting = w;
        analyze.setButtonText(w ? L("CANCEL", "İPTAL") : L("ANALYZE PHASE", "FAZI ANALİZ ET"));
    }
    if (w) {
        progress = r.progress;
        status.setText(L("Listening… ", "Dinleniyor… ") + juce::String(juce::roundToInt(progress * 100)) + " %", juce::dontSendNotification);
        status.setColour(juce::Label::textColourId, col::accentHi);
        detail.setText(L("Keep both signals playing.", "İki sinyal de çalmaya devam etsin."), juce::dontSendNotification);
        repaint();
    } else if (r.id != shownId || (r.id == 0 && shownId != 0) || !r.match) {
        // rotate curve marker follows the angle knob, so refresh rotate results continuously (cheap)
        shownId = r.id;
        refreshResult(r);
        repaint();
    }
    const bool canApply = !w && r.state == AnalysisState::Done && r.status == PhaseResult::Status::Ok && !r.applied &&
                          r.match == m && (r.match || r.filterMode == juce::roundToInt(proc.apvts.getRawParameterValue(id::filterMode)->load()));
    apply.setEnabled(canApply);
    apply.setColour(juce::TextButton::buttonColourId, canApply ? col::ok.darker(0.35f) : col::panelHi);
    clearMatch.setEnabled(proc.hasMatchCorrection());
}

void PhasePanel::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(r, 12);
    g.setColour(col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 12, 1);
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(15.0f, juce::Font::bold).withKerningFactor(0.08f));
    g.drawText(L("PHASE", "FAZ"), 16, 12, 120, 22, juce::Justification::centredLeft);
    if (waiting) {
        auto b = analyze.getBounds().toFloat().removeFromBottom(3).reduced(6, 0);
        g.setColour(col::accentHi);
        g.fillRect(b.withWidth(b.getWidth() * juce::jlimit(0.0f, 1.0f, progress)));
    }
    if (confidence >= 0 && !waiting) {
        auto b = confBar.toFloat();
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(10.5f, juce::Font::bold));
        g.drawText(L("CONFIDENCE", "GÜVEN"), b.removeFromLeft(86), juce::Justification::centredLeft);
        auto t = b.removeFromRight(40);
        g.drawText(juce::String(juce::roundToInt(confidence * 100)) + " %", t, juce::Justification::centredRight);
        b = b.reduced(0, b.getHeight() * 0.3f);
        g.setColour(col::panel);
        g.fillRoundedRectangle(b, 3);
        g.setColour(confidence > 0.6 ? col::ok : confidence > 0.3 ? col::warn : col::bad);
        g.fillRoundedRectangle(b.withWidth(b.getWidth() * (float) juce::jlimit(0.0, 1.0, confidence)), 3);
    }
}

void PhasePanel::resized() {
    auto r = getLocalBounds().reduced(16, 12);
    auto top = r.removeFromTop(24);
    power.setBounds(top.removeFromRight(56));
    r.removeFromTop(8);
    mode.setBounds(r.removeFromTop(32));
    r.removeFromTop(6);
    auto knobRow = r.removeFromTop(104);
    angle.setVisible(!isMatch);
    blend.setVisible(isMatch);
    (isMatch ? blend : angle).setBounds(knobRow.withSizeKeepingCentre(120, 104));
    r.removeFromTop(6);
    range.setBounds(r.removeFromTop(30));
    lo.setVisible(custom);
    hi.setVisible(custom);
    if (custom) {
        r.removeFromTop(4);
        auto row = r.removeFromTop(74);
        lo.setBounds(row.removeFromLeft(row.getWidth() / 2).reduced(10, 0));
        hi.setBounds(row.reduced(10, 0));
    }
    r.removeFromTop(10);
    auto btns = r.removeFromTop(38);
    analyze.setBounds(btns.removeFromLeft(btns.getWidth() * 3 / 5).withTrimmedRight(6));
    apply.setBounds(btns.withTrimmedLeft(6));
    r.removeFromTop(8);
    auto st = r.removeFromTop(22);
    clearMatch.setVisible(isMatch);
    if (isMatch) clearMatch.setBounds(st.removeFromRight(110).withSizeKeepingCentre(110, 24));
    status.setBounds(st);
    confBar = r.removeFromTop(18);
    r.removeFromTop(2);
    detail.setBounds(r.removeFromTop(44));
    r.removeFromTop(4);
    curve.setBounds(r);
}

}  // namespace pf::ui
