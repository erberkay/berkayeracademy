// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "PluginEditor.h"

namespace kb {

using namespace ui;
static juce::String S(const char* utf8) { return juce::String::fromUTF8(utf8); }

static void styleLabel(juce::Label& l, const juce::String& t, juce::Colour c = col::fgSoft, float size = 12.5f, bool bold = false) {
    l.setText(t, juce::dontSendNotification);
    l.setColour(juce::Label::textColourId, c);
    l.setFont(juce::FontOptions(size, bold ? juce::Font::bold : juce::Font::plain));
}

static void setupSlider(juce::Slider& s, double lo, double hi, double v, double step, const juce::String& title, const juce::String& tip,
                        const juce::String& suffix) {
    s.setSliderStyle(juce::Slider::LinearHorizontal);
    s.setTextBoxStyle(juce::Slider::TextBoxRight, false, 66, 20);
    s.setRange(lo, hi, step);
    s.setValue(v, juce::dontSendNotification);
    s.setTextValueSuffix(suffix);
    s.setNumDecimalPlacesToDisplay(step < 1 ? 1 : 0);
    s.setTitle(title);
    s.setTooltip(tip);
}

// bağımlı kontrol: kapalıyken soluk ve tıklanmaz
static void dim(juce::Component& c, bool on) {
    c.setEnabled(on);
    c.setAlpha(on ? 1.0f : 0.38f);
}

static float textW(const juce::String& t, float size, bool bold = true) {
    return juce::GlyphArrangement::getStringWidth(juce::FontOptions(size, bold ? juce::Font::bold : juce::Font::plain), t);
}

// ───────────────────────────── Readout (sonuç kartı)
void Readout::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 12);
    g.setColour(juce::Colours::white.withAlpha(0.05f));
    g.drawHorizontalLine(1, r.getX() + 12, r.getRight() - 12);
    auto in = r.reduced(16, 12);
    const double gain = meters.rmsGainDb();
    const bool has = meters.hasData();
    const bool tall = getHeight() >= 125;
    const double d = proc.engine.uiD.load(), th = std::fmod(proc.engine.uiTh.load() + 3600.0, 360.0);
    juce::String note = S("\u2014");
    auto hs = proc.align.recentHits();
    for (auto it = hs.rbegin(); it != hs.rend(); ++it) if (it->note >= 0) { note = noteName(it->note); break; }
    auto heroArea = tall ? in.removeFromTop(56) : in.removeFromLeft(in.getWidth() * 0.5f);
    {
        auto h = heroArea;
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(11.0f, juce::Font::bold).withKerningFactor(0.06f));
        g.drawText(L("LOW-END GAIN", "ALT BANT KAZANCI"), h.removeFromTop(14), juce::Justification::centredLeft);
        auto big = h.removeFromTop(42);
        const float fs = tall ? 34.0f : 30.0f;
        g.setColour(!has ? col::fgFaint : gain >= 0.05 ? col::ok : gain <= -0.05 ? col::warn : col::fg);
        g.setFont(juce::FontOptions(fs, juce::Font::bold));
        const juce::String v = has ? fmtNum(gain, 1, true) : S("\u2014");
        g.drawText(v, big, juce::Justification::centredLeft);
        if (has) {
            g.setColour(col::fgSoft);
            g.setFont(juce::FontOptions(15.0f, juce::Font::bold));
            g.drawText("dB", big.withTrimmedLeft(textW(v, fs) + 6), juce::Justification::centredLeft);
        }
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(11.0f));
        if (tall) g.drawText(L("kick + bass vs. unaligned", "kick + bas, hizalamasıza göre"), big, juce::Justification::bottomRight);
        else g.drawText(L("vs. unaligned", "hizalamasıza göre"), h.removeFromTop(14), juce::Justification::centredLeft);
    }
    if (tall) {
        in.removeFromTop(8);
        g.setColour(col::line);
        g.drawHorizontalLine((int) in.getY(), in.getX(), in.getRight());
        in.removeFromTop(8);
        const float w = in.getWidth() / 3;
        auto cell = [&](const juce::String& k, const juce::String& val) {
            auto c = in.removeFromLeft(w);
            g.setColour(col::fgFaint);
            g.setFont(juce::FontOptions(10.5f, juce::Font::bold).withKerningFactor(0.06f));
            g.drawText(k, c.removeFromTop(14), juce::Justification::centredLeft);
            g.setColour(col::fg);
            g.setFont(juce::FontOptions(17.0f, juce::Font::bold));
            g.drawText(val, c.removeFromTop(24), juce::Justification::centredLeft);
        };
        cell(L("SHIFT", "KAYDIRMA"), fmtNum(d, 2, true) + " ms");
        cell(L("PHASE", "FAZ"), fmtNum(th, 0) + S("\u00b0"));
        cell(L("BASS NOTE", "BAS NOTASI"), note);
    } else {
        g.setColour(col::line);
        g.drawVerticalLine((int) in.getX() - 4, in.getY() + 2, in.getBottom() - 2);
        in.removeFromLeft(10);
        const float rh = in.getHeight() / 3;
        auto row = [&](const juce::String& k, const juce::String& val) {
            auto c = in.removeFromTop(rh);
            g.setColour(col::fgFaint);
            g.setFont(juce::FontOptions(10.5f, juce::Font::bold).withKerningFactor(0.06f));
            g.drawText(k, c, juce::Justification::centredLeft);
            g.setColour(col::fg);
            g.setFont(juce::FontOptions(15.0f, juce::Font::bold));
            g.drawText(val, c, juce::Justification::centredRight);
        };
        row(L("SHIFT", "KAYDIRMA"), fmtNum(d, 2, true) + " ms");
        row(L("PHASE", "FAZ"), fmtNum(th, 0) + S("\u00b0"));
        row(L("NOTE", "NOTA"), note);
    }
}

// ───────────────────────────── ViewTabs
juce::Rectangle<float> ViewTabs::itemRect(int i) const {
    float x = 0;
    for (int k = 0; k < i; ++k) x += textW(items[k], 13.0f) + 28;
    return {x, 0, textW(items[i], 13.0f) + 28, (float) getHeight()};
}

void ViewTabs::paint(juce::Graphics& g) {
    for (int i = 0; i < items.size(); ++i) {
        auto r = itemRect(i);
        const bool on = i == sel;
        g.setColour(on ? col::fg : col::fgSoft);
        g.setFont(juce::FontOptions(13.0f, juce::Font::bold));
        g.drawText(items[i], r.withTrimmedBottom(4), juce::Justification::centred);
        if (on) { g.setColour(col::accent); g.fillRoundedRectangle(r.reduced(12, 0).removeFromBottom(2.5f), 1.25f); }
    }
    if (hasKeyboardFocus(false)) { g.setColour(col::accent.withAlpha(0.6f)); g.drawRoundedRectangle(itemRect(sel).reduced(4, 2), 6, 1.2f); }
}

void ViewTabs::mouseDown(const juce::MouseEvent& e) {
    for (int i = 0; i < items.size(); ++i)
        if (itemRect(i).contains(e.position)) { sel = i; repaint(); if (onChange) onChange(i); return; }
}

bool ViewTabs::keyPressed(const juce::KeyPress& k) {
    int n = sel;
    if (k.getKeyCode() == juce::KeyPress::leftKey) n = std::max(0, sel - 1);
    else if (k.getKeyCode() == juce::KeyPress::rightKey) n = std::min(items.size() - 1, sel + 1);
    else return false;
    if (n != sel) { sel = n; repaint(); if (onChange) onChange(n); }
    return true;
}

// ───────────────────────────── GuideSteps
void GuideSteps::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(14.0f, juce::Font::bold));
    const bool all = done[0] && done[1] && done[2];
    g.drawText(all ? L("Ready — kick and bass are aligned", "Hazır — kick ile bas hizalı") : L("Get started in 3 steps", "3 adımda başla"),
               r.removeFromTop(22), juce::Justification::centredLeft);
    r.removeFromTop(4);
    const juce::String t[3] = {L("Put KB-Align on the BASS track and pick the KICK track as sidechain.",
                                 "Eklentiyi BAS kanalına koy, sidechain kaynağı olarak KICK kanalını seç."),
                               L("Play and press Learn (bass notes change? use Per Note).", "Çal ve Learn'e bas (notalar değişiyorsa Nota başına)."),
                               L("Compare Before / After, then check the suggestions.", "Önce / Sonra ile dinle, sonra önerilere bak.")};
    for (int i = 0; i < 3; ++i) {
        auto row = r.removeFromTop(30);
        auto c = row.removeFromLeft(22).withSizeKeepingCentre(18, 18);
        if (done[i]) {
            g.setColour(col::ok);
            g.fillEllipse(c);
            g.setColour(col::bg);
            juce::Path tick;
            tick.startNewSubPath(c.getX() + 4.5f, c.getCentreY() + 0.5f);
            tick.lineTo(c.getX() + 7.8f, c.getCentreY() + 3.8f);
            tick.lineTo(c.getRight() - 4.2f, c.getY() + 5.0f);
            g.strokePath(tick, juce::PathStrokeType(2.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
        } else {
            g.setColour(col::line.withAlpha(0.5f));
            g.drawEllipse(c, 1.5f);
            g.setColour(col::fgSoft);
            g.setFont(juce::FontOptions(11.0f, juce::Font::bold));
            g.drawText(juce::String(i + 1), c, juce::Justification::centred);
        }
        row.removeFromLeft(8);
        g.setColour(done[i] ? col::fgFaint : col::fgSoft);
        g.setFont(juce::FontOptions(13.0f));
        g.drawFittedText(t[i], row.toNearestInt(), juce::Justification::centredLeft, 2, 0.9f);
    }
}

// ───────────────────────────── Card
void Card::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 12);
    g.setColour(juce::Colours::white.withAlpha(0.05f));
    g.drawHorizontalLine(1, r.getX() + 12, r.getRight() - 12);
    if (title.isNotEmpty()) {
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(11.0f, juce::Font::bold).withKerningFactor(0.06f));
        g.drawText(title, r.reduced(16, 10).removeFromTop(14), juce::Justification::centredLeft);
    }
}

// ───────────────────────────── EditorContent
EditorContent::EditorContent(KBAlignProcessor& p)
    : proc(p),
      modeSeg(p.apvts, pid::mode, {L("Manual", "Elle"), "Learn", L("Per Hit", "Her vuruş"), L("Per Note", "Nota başına"), L("Follow", "Takip")},
              {L("Manual: only your Delay, Phase and polarity trims are applied.", "Elle: yalnız gecikme, faz ve polarite ayarların uygulanır."),
               L("Learn: listens to a few kicks after you press Learn, finds the best shift + phase and holds it. Ideal for a one-note bass.",
                 "Learn: Learn'e basınca birkaç kick dinler, en iyi kaydırma + fazı bulup sabitler. Tek notalı bas için ideal."),
               L("Per Hit: recalculates on every kick. Best for free-running synths; use the Full + Lookahead latency mode.",
                 "Her vuruş: her kick'te yeniden hesaplar. Fazı serbest dolaşan synth'ler için; 'Tam + lookahead' ile kullan."),
               L("Per Note: learns a setting for every bass note and recalls it when the note comes back. Best when notes change.",
                 "Nota başına: her bas notası için ayar öğrenir, nota gelince uygular. Notalar değişiyorsa en iyisi."),
               L("Follow: tracks slowly and smoothly; for live playing or slowly changing bass.",
                 "Takip: yavaşça ve kesintisiz izler; canlı çalım ya da yavaş değişen bas için.")}),
      modeCombo(p.apvts, pid::mode, "", {L("Manual", "Elle"), "Learn", L("Per Hit", "Her vuruş"), L("Per Note", "Nota başına"), L("Follow", "Takip")}),
      autoTarget(p.apvts, pid::autoTarget, "", {L("Delay + Phase", "Gecikme + faz"), L("Delay only", "Yalnız gecikme"), L("Phase only", "Yalnız faz")}),
      latency(p.apvts, pid::latency, "", {L("Low latency (±10 ms)", "Düşük (±10 ms)"), L("Full (±50 ms)", "Tam (±50 ms)"),
                                          L("Full + Lookahead", "Tam + lookahead")}),
      viewTabs({L("Waveform", "Dalga"), L("Phase", "Faz"), L("Spectrum", "Spektrum"), "XY"}),
      scope(p), meters(p, scope), phasePlot(meters, 0), xyPlot(meters, 1), specPlot(meters, 2),
      readout(p, meters), trimCard(L("MANUAL TRIM", "ELLE İNCE AYAR")), meterCard(),
      predelay(p.apvts, pid::predelay, L("Delay", "Gecikme"), true), phase(p.apvts, pid::phase, L("Phase", "Faz"), true),
      outGain(p.apvts, pid::outGain, L("Output", "Çıkış"), true), polarity(p.apvts, pid::polarity, L("Invert", "Ters çevir")),
      sCrossover(p.apvts, pid::crossover, L("Crossover: process lows only", "Crossover: yalnız altı işle")),
      sBassMono(p.apvts, pid::bassMono, "Bass Mono"), sDuck(p.apvts, pid::duck, "Ducking"),
      sFc(p.apvts, pid::fc, L("Split", "Sınır")),
      search(p.apvts, pid::search, L("Search range ±", "Arama aralığı ±")), learnHits(p.apvts, pid::learnHits, L("Learn hits", "Learn vuruşu")),
      winStart(p.apvts, pid::winStart, L("Window start", "Pencere başı")), winMs(p.apvts, pid::winMs, L("Window length", "Pencere uzunluğu")),
      scOffset(p.apvts, pid::scOffset, L("Sidechain offset", "Sidechain ofseti")), trigHz(p.apvts, pid::trigHz, L("Trigger freq", "Tetik frekansı")),
      contRate(p.apvts, pid::contRate, L("Follow rate", "Takip hızı")),
      crossover(p.apvts, pid::crossover, L("Crossover (process lows only)", "Crossover (yalnız alt bant işlenir)")),
      bassMono(p.apvts, pid::bassMono, "Bass Mono"), duck(p.apvts, pid::duck, "Ducking"), duckSync(p.apvts, pid::duckSync, L("Tempo sync", "Tempoya kilitli")),
      fc(p.apvts, pid::fc, L("Crossover freq", "Crossover frekansı")), monoHz(p.apvts, pid::monoHz, L("Mono below", "Mono sınırı")),
      monoWidth(p.apvts, pid::monoWidth, L("Low width", "Alt bant genişliği")), duckDepth(p.apvts, pid::duckDepth, L("Depth", "Derinlik")),
      duckLen(p.apvts, pid::duckLen, L("Length", "Uzunluk")),
      listen(p.apvts, pid::listen, L("Listen", "Dinleme"), {L("Bass", "Bas"), L("Kick + bass (preview)", "Kick + bas (önizleme)"),
                                                            L("Low band solo", "Alt bant solo")}),
      duckBeats(p.apvts, pid::duckBeats, L("Note", "Nota"), {"1/16", "1/8", "1/4", "1/2", L("1 bar", "1 ölçü")}),
      duckTarget(p.apvts, pid::duckTarget, L("Target", "Hedef"), {L("Low band (<120 Hz)", "Alt bant (<120 Hz)"), L("Full signal", "Tüm sinyal")}),
      curve(p), notes(p) {
    setLookAndFeel(&look.get());
    juce::LookAndFeel::setDefaultLookAndFeel(&look.get());  // yazı tipi çözümü varsayılan L&F'ten geçer
    setTitle("KB-Align");

    // ── üst çubuk
    styleLabel(title, "KB-Align", col::fg, 20.0f, true);
    styleLabel(subtitle, L("BE AKADEMI · KICK & BASS ALIGNER", "BE AKADEMİ · KICK–BAS HİZALAYICI"), col::fgFaint, 10.5f, true);
    subtitle.setFont(juce::FontOptions(10.5f, juce::Font::bold).withKerningFactor(0.08f));
    presetPrev.setButtonText(S("‹"));
    presetNext.setButtonText(S("›"));
    save.setButtonText(L("Save", "Kaydet"));
    load.setButtonText(L("Load", "Aç"));
    copyAB.setButtonText(S("A→B"));
    undoB.setButtonText(S("↶"));
    redoB.setButtonText(S("↷"));
    help.setButtonText("?");
    for (auto* c : std::initializer_list<juce::Component*>{&title, &subtitle, &presetPrev, &factory, &presetNext, &save, &load, &abSwitch, &copyAB,
                                                         &undoB, &redoB, &viewSwitch, &langSwitch, &help, &scale})
        addAndMakeVisible(c);
    for (int i = 0; i < proc.getNumPrograms(); ++i) factory.addItem(proc.getProgramName(i), i + 1);
    factory.setTextWhenNothingSelected(L("Presets", "Hazır ayarlar"));
    factory.setTitle("Preset");
    factory.setTooltip(L("Factory presets. Use ‹ › to step through.", "Hazır ayarlar. ‹ › ile sırayla gez."));
    factory.onChange = [this] { if (factory.getSelectedId() > 0) proc.setCurrentProgram(factory.getSelectedId() - 1); };
    presetPrev.onClick = [this] { stepPreset(-1); };
    presetNext.onClick = [this] { stepPreset(+1); };
    presetPrev.setTooltip(L("Previous preset", "Önceki hazır ayar"));
    presetNext.setTooltip(L("Next preset", "Sonraki hazır ayar"));
    save.setTooltip(L("Save your settings as a preset file (including the note table and ducking curve).",
                      "Ayarlarını preset dosyası olarak kaydet (nota tablosu ve ducking eğrisi dahil)."));
    load.setTooltip(L("Open a preset you saved.", "Kaydettiğin bir preset'i aç."));
    save.onClick = [this] { savePreset(); };
    load.onClick = [this] { loadPreset(); };
    abSwitch.setTooltip(L("A/B: switch between two settings to compare them.", "A/B: iki ayar arasında geç ve karşılaştır."));
    abSwitch.onFirst = abSwitch.onSecond = col::fgSoft;
    abSwitch.setSecond(proc.slotBActive);
    abSwitch.onChange = [this](bool b) { if (b != proc.slotBActive) proc.toggleAB(); };
    copyAB.setTooltip(L("Copy the current setting to the other A/B slot.", "Geçerli ayarı öbür A/B yuvasına kopyala."));
    copyAB.onClick = [this] { proc.copyAtoB(); };
    undoB.setTooltip(L("Undo", "Geri al"));
    redoB.setTooltip(L("Redo", "Yinele"));
    undoB.onClick = [this] { proc.undo.undo(); };
    redoB.onClick = [this] { proc.undo.redo(); };
    viewSwitch.setLabels(L("Simple", "Basit"), L("Advanced", "Gelişmiş"));
    viewSwitch.onFirst = viewSwitch.onSecond = col::fgSoft;
    viewSwitch.setTooltip(L("Simple: just the essentials. Advanced: suggestion details, crossover, ducking curve, note table, analysis and scope tools.",
                            "Basit: yalnız gerekenler. Gelişmiş: öneri ayrıntısı, crossover, ducking eğrisi, nota tablosu, analiz ve osiloskop araçları."));
    viewSwitch.onChange = [this](bool adv) { setAdvanced(adv); };
    langSwitch.onFirst = langSwitch.onSecond = col::fgSoft;
    langSwitch.fontSize = 12.0f;
    langSwitch.setSecond(isTurkish());
    langSwitch.setTooltip(L("Interface language", "Arayüz dili"));
    langSwitch.onChange = [this](bool trk) {
        setTurkish(trk);
        userSettings().setValue("lang", trk ? "tr" : "en");
        userSettings().saveIfNeeded();
        if (onLanguage) juce::MessageManager::callAsync([cb = onLanguage] { cb(); });
    };
    help.setTooltip(L("Tour, help and about", "Tur, yardım ve hakkında"));
    help.onClick = [this] { showHelpMenu(); };
    for (int s : {75, 100, 125, 150, 175, 200}) scale.addItem(juce::String(s) + "%", s);
    scale.setSelectedId(juce::jlimit(75, 200, userSettings().getIntValue("scale", 100)), juce::dontSendNotification);
    scale.setTitle(L("Interface size", "Arayüz boyutu"));
    scale.setTooltip(L("Window size", "Pencere boyutu"));
    scale.onChange = [this] {
        userSettings().setValue("scale", scale.getSelectedId());
        if (onScale) onScale(scale.getSelectedId() / 100.0f);
    };

    // ── kontrol çubuğu
    for (auto* c : std::initializer_list<juce::Component*>{&statusPill, &modeSeg, &modeCombo, &learn, &autoTarget, &latency}) addAndMakeVisible(c);
    learn.setButtonText("Learn");
    learn.setTooltip(L("Learn: press while playing. It listens to the next kicks, finds the best shift + phase and holds it.",
                       "Learn: çalarken bas. Sonraki kick'leri dinler, en iyi kaydırma + fazı bulur ve sabitler."));
    learn.onClick = [this] {
        if (auto* m = proc.apvts.getParameter(pid::mode)) m->setValueNotifyingHost(m->convertTo0to1((float) Mode::Learn));
        proc.startLearn();
    };
    modeCombo.box.setTooltip(L("How alignment runs. Per Note is best when the bass notes change.", "Hizalama nasıl çalışsın. Notalar değişiyorsa Nota başına en iyisi."));
    autoTarget.box.setTooltip(L("What the automatic modes adjust: time + phase (recommended), time only or phase only.",
                                "Otomatik modlar neyi ayarlasın: zaman + faz (önerilen), yalnız zaman ya da yalnız faz."));
    latency.box.setTooltip(L("Latency mode: Low ±10 ms (38 ms) · Full ±50 ms (78 ms) · Full + Lookahead (138 ms, for Per Hit). "
                             "Your DAW compensates it.",
                             "Gecikme modu: Düşük ±10 ms (38 ms) · Tam ±50 ms (78 ms) · Tam + lookahead (138 ms, Her vuruş için). "
                             "DAW bunu telafi eder."));
    statusPill.setTooltip(L("Sidechain status. The light flashes on every kick it detects.", "Sidechain durumu. Işık algılanan her kick'te yanıp söner."));

    // ── orta alan
    addAndMakeVisible(viewTabs);
    viewTabs.onChange = [this](int v) { setView(v); };
    addAndMakeVisible(scope);
    addChildComponent(phasePlot);
    addChildComponent(xyPlot);
    addChildComponent(specPlot);
    viewTabs.setDescription(L("Waveform: kick, bass and sum after every kick · Phase: phase difference by frequency · "
                              "Spectrum: where kick and bass overlap · XY: Lissajous.",
                              "Dalga: her kick'ten sonra kick, bas ve toplam · Faz: frekansa göre faz farkı · "
                              "Spektrum: kick ile basın çakıştığı yer · XY: Lissajous."));
    phasePlot.setDescription(L("Phase difference by frequency: aligned = dots gather on the 0° line.", "Frekansa göre faz farkı: hizalıyken noktalar 0° çizgisinde toplanır."));
    specPlot.setDescription(L("Kick and bass spectrum after each kick. Red = both are strong at the same frequencies (they compete).",
                              "Her kick'ten sonra kick ve bas spektrumu. Kırmızı = ikisi aynı frekanslarda güçlü (çakışıyorlar)."));
    xyPlot.setDescription(L("XY: a thin line leaning right = in phase, leaning left = opposite.", "XY: sağa yatık ince çizgi = aynı faz, sola yatık = ters."));
    scope.onFrame = [this] { meters.update(); };
    meters.onUpdate = [this] { readout.repaint(); if (view) { phasePlot.repaint(); xyPlot.repaint(); specPlot.repaint(); } };
    trig.addItemList({L("Kick-locked", "Kick'e kilitli"), "Tempo", L("Free", "Serbest")}, 1);
    trig.setSelectedId(1, juce::dontSendNotification);
    trig.setTitle(L("Trigger", "Tetik"));
    trig.setTooltip(L("What the scope locks to: kick hits, the tempo grid or free-running.", "Osiloskop neye kilitlensin: kick vuruşu, tempo ızgarası ya da serbest."));
    trig.onChange = [this] { scope.trigger = (Trigger) (trig.getSelectedId() - 1); updateEnablement(); };
    tempoBeats.addItemList({"1/16", "1/8", "1/4", "1/2", L("1 bar", "1 ölçü"), L("2 bars", "2 ölçü"), L("4 bars", "4 ölçü")}, 1);
    tempoBeats.setSelectedId(3, juce::dontSendNotification);
    tempoBeats.setTitle(L("Tempo window", "Tempo penceresi"));
    tempoBeats.onChange = [this] { static constexpr double b[] = {0.25, 0.5, 1, 2, 4, 8, 16}; scope.tempoBeats = b[tempoBeats.getSelectedId() - 1]; };
    setupSlider(zoom, 1, 500, 120, 0.1, L("Time", "Zaman"), L("Time span shown by the scope.", "Osiloskobun gösterdiği süre."), " ms");
    zoom.setSkewFactorFromMidPoint(60);
    zoom.onValueChange = [this] { scope.windowMs = zoom.getValue(); };
    setupSlider(pre, 0, 50, 10, 0.1, L("Pre-trigger", "Ön tetik"), L("Time shown before the kick hit.", "Kick vuruşundan önce gösterilen süre."), " ms");
    pre.onValueChange = [this] { scope.preMs = pre.getValue(); };
    setupSlider(viewHz, 40, 400, 200, 1, L("Display filter", "Görüntü filtresi"),
                L("Filters the display only (not the audio): shows the range below this frequency.", "Yalnız görüntüyü süzer (sesi değil): bu frekansın altı gösterilir."), " Hz");
    viewHz.onValueChange = [this] { scope.viewHz = viewHz.getValue(); };
    setupSlider(avg, 1, 16, 1, 1, L("Average", "Ortalama"), L("Average of the last N kick hits: calms the trace on noisy material.",
                                                              "Son N kick vuruşunun ortalaması: gürültülü malzemede izi sakinleştirir."), "x");
    avg.onValueChange = [this] { scope.average = (int) avg.getValue(); };
    styleLabel(zoomL, L("Time", "Zaman")); styleLabel(preL, L("Pre", "Ön")); styleLabel(viewL, L("Filter", "Filtre")); styleLabel(avgL, L("Avg", "Ort."));
    lowView.setButtonText(L("Low band", "Alt bant"));
    lowView.setToggleState(true, juce::dontSendNotification);
    lowView.setTooltip(L("Show only the low band (below Filter) — where alignment matters.", "Yalnız alt bandı göster (Filtre'nin altı) — hizalamanın önemli olduğu bölge."));
    lowView.onClick = [this] { scope.lowView = lowView.getToggleState(); updateEnablement(); };
    makeChip(tKick, "Kick", col::kick, L("Show / hide the kick trace.", "Kick izini göster / gizle."));
    makeChip(tBass, L("Bass", "Bas"), col::bass, L("Show / hide the bass trace.", "Bas izini göster / gizle."));
    makeChip(tSum, L("Sum", "Toplam"), col::sum, L("Show / hide kick + bass.", "Kick + bas toplamını göster / gizle."));
    makeChip(tBefore, L("Before", "Önceki"), col::fgSoft, L("Show the unaligned bass as a grey dashed line.", "Hizalamadan önceki bası gri kesikli göster."));
    makeChip(persist, L("Persist", "İz bırak"), col::fgSoft, L("Earlier hits stay as faint traces.", "Önceki vuruşların izleri soluk kalır."));
    makeChip(freeze, L("Freeze", "Dondur"), col::accent, L("Freeze the display (F).", "Görüntüyü dondur (F)."));
    for (auto* t : {&tKick, &tBass, &tSum}) t->setToggleState(true, juce::dontSendNotification);
    persist.onClick = [this] { scope.persistence = persist.getToggleState(); };
    freeze.onClick = [this] { scope.frozen = freeze.getToggleState(); };
    tKick.onClick = [this] { scope.showKick = tKick.getToggleState(); };
    tBass.onClick = [this] { scope.showBass = tBass.getToggleState(); };
    tSum.onClick = [this] { scope.showSum = tSum.getToggleState(); };
    tBefore.onClick = [this] { scope.showBefore = tBefore.getToggleState(); };
    for (auto* c : std::initializer_list<juce::Component*>{&trig, &tempoBeats, &zoom, &pre, &viewHz, &avg, &lowView, &persist, &freeze, &tKick, &tBass,
                                                         &tSum, &tBefore, &zoomL, &preL, &viewL, &avgL})
        addChildComponent(c);

    // ── sağ sütun
    addAndMakeVisible(compare);
    compare.setLabels(L("BEFORE", "ÖNCE"), L("AFTER", "SONRA"));
    compare.onFirst = col::fgSoft;
    compare.onSecond = col::accent;
    compare.fontSize = 13.5f;
    compare.setTooltip(L("Before / After: hear the original bass, then the aligned one. Latency stays the same, so the comparison is fair.",
                         "Önce / Sonra: orijinal bası, sonra hizalanmışı dinle. Gecikme aynı kalır, karşılaştırma adildir."));
    compareAtt = std::make_unique<juce::ParameterAttachment>(*proc.apvts.getParameter(pid::bypass),
                                                             [this](float v) { compare.setSecond(v < 0.5f); }, &proc.undo);
    compareAtt->sendInitialUpdate();
    compare.onChange = [this](bool after) { compared = true; compareAtt->setValueAsCompleteGesture(after ? 0.0f : 1.0f); };
    addAndMakeVisible(readout);
    addAndMakeVisible(trimCard);
    addAndMakeVisible(meters);
    for (auto* c : std::initializer_list<juce::Component*>{&predelay, &phase, &outGain, &polarity, &mKick, &mIn, &mOut}) addAndMakeVisible(c);
    predelay.slider.setTooltip(L("Delay trim: shifts the bass in ms (negative = earlier). Added on top of the automatic modes. Shift: fine, double-click: reset.",
                                 "Gecikme: bası ms olarak kaydırır (eksi = öne). Otomatik modların üstüne eklenir. Shift: ince ayar, çift tık: sıfır."));
    phase.slider.setTooltip(L("Phase trim: rotates the bass phase (0–360°), independent of frequency. Added on top of the automatic modes.",
                              "Faz: bası frekanstan bağımsız döndürür (0–360°). Otomatik modların üstüne eklenir."));
    polarity.button.setTooltip(L("Inverts the processed signal (= 180°).", "İşlenen sinyalin polaritesini çevirir (= 180°)."));
    outGain.slider.setTooltip(L("Output level of the processed bass — use it to level-match Before / After.",
                                "İşlenmiş basın çıkış seviyesi — Önce / Sonra seviyesini eşitlemek için."));
    mKick.setTooltip(L("Kick level at the sidechain. Not moving = no sidechain.", "Sidechain'e gelen kick seviyesi. Hiç oynamıyorsa sidechain bağlı değil."));
    mIn.setTooltip(L("Bass input level", "Bas giriş seviyesi"));
    mOut.setTooltip(L("Bass output level", "Bas çıkış seviyesi"));

    // ── alt alan: basit
    addAndMakeVisible(simplePane);
    for (auto* c : std::initializer_list<juce::Component*>{&guide, &sCrossover, &sBassMono, &sDuck, &sFc, &adviceMini}) simplePane.addAndMakeVisible(c);
    adviceMini.onDetails = [this] { viewSwitch.setSecond(true); setAdvanced(true); tabs.setCurrentTabIndex(0); };
    sCrossover.button.setTooltip(L("On: only the bass below the split is aligned, the rest is untouched. Off (recommended): the whole bass moves together — "
                                   "measured gain is clearly higher. If you turn it on, keep the split high (250 Hz+).",
                                   "Açık: yalnız sınırın altındaki bas hizalanır, üstü değişmez. Kapalı (önerilen): bütün bas birlikte kaydırılır — "
                                   "ölçülen kazanç belirgin yüksek. Açacaksan sınırı yüksek tut (250 Hz ve üstü)."));
    sFc.slider.setTooltip(L("Crossover split (only when crossover is on).", "Crossover sınırı (yalnız crossover açıkken)."));
    sBassMono.button.setTooltip(L("Makes the low band mono (fewer phase issues with stereo basses).", "Alt bandı mono yapar (stereo baslarda faz sorunlarını azaltır)."));
    sDuck.button.setTooltip(L("Ducks the bass lows (<120 Hz) on every kick; the bass tone stays and the kick is untouched. The suggestions tell you if you need it.",
                              "Her kick'te basın altını (<120 Hz) kısar; basın tınısı kalır, kick'e dokunulmaz. Gerekip gerekmediğini öneriler söyler."));

    // ── alt alan: gelişmiş
    for (auto* c : std::initializer_list<juce::Component*>{&search, &learnHits, &winStart, &winMs, &scOffset, &trigHz, &contRate, &alignNote})
        pAlign.addAndMakeVisible(c);
    for (auto* c : std::initializer_list<juce::Component*>{&crossover, &fc, &bassMono, &monoHz, &monoWidth, &listen, &xoverNote}) pXover.addAndMakeVisible(c);
    for (auto* c : std::initializer_list<juce::Component*>{&duck, &duckDepth, &duckLen, &duckSync, &duckBeats, &duckTarget, &curve}) pDuck.addAndMakeVisible(c);
    styleLabel(xoverNote, L("The kick + bass preview plays the kick a second time: for checking only, keep it off in the mix.",
                            "Kick + bas önizlemesi kick'i ikinci kez çalar: yalnız kontrol için, mikste kapalı tut."), col::fgFaint);
    styleLabel(alignNote, L("Drag the edges of the analysis window on the scope to change what part of the kick is aligned.",
                            "Kick'in hangi bölümünün hizalanacağını değiştirmek için osiloskoptaki analiz penceresinin kenarlarını sürükle."), col::fgFaint);
    search.slider.setTooltip(L("How far the automatic modes may move the bass. Large values can shift the groove; ±10 ms is recommended.",
                               "Otomatik modların bası en fazla ne kadar kaydırabileceği. Büyük değer ritmi bozabilir; öneri ±10 ms."));
    learnHits.slider.setTooltip(L("How many kicks Learn listens to.", "Learn'ün dinlediği kick sayısı."));
    winStart.slider.setTooltip(L("Where the analysis window starts after the kick.", "Analiz penceresinin kick'ten ne kadar sonra başladığı."));
    winMs.slider.setTooltip(L("Length of the analysis window: which part of the kick gets aligned.", "Analiz penceresinin uzunluğu: kick'in hangi bölümü hizalansın."));
    scOffset.slider.setTooltip(L("Compensates a host that delivers the sidechain late (+).", "Host sidechain'i geç veriyorsa (+) bu kadar telafi edilir."));
    trigHz.slider.setTooltip(L("Kick detection listens below this frequency (to pick the kick out of a drum bus).",
                               "Kick tespiti bu frekansın altını dinler (davul bus'ında kick'i ayırmak için)."));
    contRate.slider.setTooltip(L("Follow mode: maximum change speed (ms/s). Lower = smoother.", "Takip modunda en hızlı değişim (ms/s). Düşük = pürüzsüz."));
    duckTarget.box.setTooltip(L("Low band: only below 120 Hz is ducked, without phase shift — the bass tone stays. Full signal: classic pumping.",
                                "Alt bant: yalnız 120 Hz altı kısılır, faz kaydırmadan — basın tınısı kalır. Tüm sinyal: klasik pompalama."));
    tabs.addTab(L("Suggestions", "Öneriler"), col::panel, &adviceTab, false);
    tabs.addTab(L("Analysis", "Analiz"), col::panel, &pAlign, false);
    tabs.addTab(L("Crossover & Mono", "Crossover ve Mono"), col::panel, &pXover, false);
    tabs.addTab("Ducking", col::panel, &pDuck, false);
    tabs.addTab(L("Note table", "Nota tablosu"), col::panel, &notes, false);
    tabs.setOutline(0);
    tabs.setTabBarDepth(38);
    addChildComponent(tabs);

    addAndMakeVisible(helpBar);
    helpBar.setDefault(L("Hover over any control to see what it does here.  ·  Restart the tour from the ? menu.",
                         "Bir kontrolün ne yaptığını görmek için fareyle üzerine gel.  ·  Turu ? menüsünden yeniden başlat."));
    const bool adv = userSettings().getBoolValue("advanced", false);
    viewSwitch.setSecond(adv);
    setAdvanced(adv);
    setView(0);
    updateEnablement();
    startTimerHz(20);
}

EditorContent::~EditorContent() {
    stopTimer();
    setLookAndFeel(nullptr);
    if (look.getReferenceCount() == 1) juce::LookAndFeel::setDefaultLookAndFeel(nullptr);
}

void EditorContent::setAdvanced(bool adv) {
    advanced = adv;
    viewSwitch.setSecond(adv);
    simplePane.setVisible(!adv);
    meters.compact = !adv;
    meters.repaint();
    tabs.setVisible(adv);
    modeSeg.setVisible(adv);
    modeCombo.setVisible(!adv);
    autoTarget.setVisible(adv);
    latency.setVisible(adv);
    for (auto* c : std::initializer_list<juce::Component*>{&trig, &tempoBeats, &zoom, &pre, &viewHz, &avg, &lowView, &persist, &freeze, &tKick, &tBass,
                                                         &tSum, &tBefore, &zoomL, &preL, &viewL, &avgL})
        c->setVisible(adv);
    userSettings().setValue("advanced", adv);
    resized();
}

void EditorContent::setView(int v) {
    view = v;
    viewTabs.setSelected(v);
    scope.setVisible(v == 0);
    phasePlot.setVisible(v == 1);
    specPlot.setVisible(v == 2);
    xyPlot.setVisible(v == 3);
}

void EditorContent::stepPreset(int dir) {
    const int n = proc.getNumPrograms();
    const int cur = factory.getSelectedId() > 0 ? factory.getSelectedId() - 1 : proc.getCurrentProgram();
    factory.setSelectedId(((cur + dir) % n + n) % n + 1);
}

void EditorContent::updateEnablement() {
    auto on = [this](const char* id) { return proc.apvts.getRawParameterValue(id)->load() > 0.5f; };
    const Mode mode = (Mode) (int) proc.apvts.getRawParameterValue(pid::mode)->load();
    const bool xo = on(pid::crossover), dk = on(pid::duck), ds = on(pid::duckSync), bm = on(pid::bassMono);
    dim(sFc, xo); dim(fc, xo);
    dim(monoHz, bm); dim(monoWidth, bm);
    for (juce::Component* c : {(juce::Component*) &duckDepth, (juce::Component*) &duckSync, (juce::Component*) &duckTarget, (juce::Component*) &curve}) dim(*c, dk);
    dim(duckLen, dk && !ds);
    dim(duckBeats, dk && ds);
    dim(contRate, mode == Mode::Continuous);
    dim(learnHits, mode == Mode::Learn);
    dim(tempoBeats, scope.trigger == Trigger::Tempo);
    dim(viewHz, lowView.getToggleState());
    dim(viewL, lowView.getToggleState());
    dim(autoTarget, mode != Mode::Manual);
}

void EditorContent::timerCallback() {
    proc.pollLearn();
    const bool sc = proc.sidechainConnected();
    const int onsets = proc.engine.onsetCount.load();
    const bool pulse = onsets != lastOnsets;
    lastOnsets = onsets;
    const bool learning = proc.align.learnInProgress();
    const int need = (int) proc.apvts.getRawParameterValue(pid::learnHits)->load();
    const Mode mode = (Mode) (int) proc.apvts.getRawParameterValue(pid::mode)->load();
    if (!sc) statusPill.set(2, L("No sidechain", "Sidechain yok"), false);
    else if (learning) statusPill.set(3, L("Learning ", "Öğreniyor ") + juce::String(proc.align.learnCollected.load()) + " / " + juce::String(need), pulse);
    else if (onsets == 0) statusPill.set(0, L("Waiting for kick", "Kick bekleniyor"), false);
    else statusPill.set(1, L("Kick detected", "Kick algılandı"), pulse);
    const bool learnedNow = proc.learned.has_value() && mode == Mode::Learn;
    if (learning) {
        learn.setProgress((float) proc.align.learnCollected.load() / (float) std::max(1, need));
        learn.setButtonText(L("Listening ", "Dinliyor ") + juce::String(proc.align.learnCollected.load()) + "/" + juce::String(need));
    } else {
        learn.setProgress(-1);
        learn.setDone(learnedNow);
        learn.setButtonText(learnedNow ? L("Learned", "Öğrendi") : juce::String("Learn"));
    }
    guide.set(sc && onsets > 0, mode != Mode::Manual && (mode != Mode::Learn || learnedNow), compared);
    abSwitch.setSecond(proc.slotBActive);
    undoB.setEnabled(proc.undo.canUndo());
    redoB.setEnabled(proc.undo.canRedo());
    mKick.push(proc.engine.uiKickPeak.exchange(0.0f));
    mIn.push(proc.engine.uiInPeak.exchange(0.0f));
    mOut.push(proc.engine.uiOutPeak.exchange(0.0f));
    if (++tick % 4 == 0) { readout.repaint(); updateEnablement(); proc.undo.beginNewTransaction(); }
}

void EditorContent::paint(juce::Graphics& g) {
    g.fillAll(col::bg);
    // BE Akademi işareti (sitedeki marka: koyu kare, üstte ince kor şerit, altın "BE")
    if (!brandMark.isEmpty()) {
        auto m = brandMark.toFloat();
        juce::Path clip;
        clip.addRoundedRectangle(m, 10.0f);
        g.saveState();
        g.reduceClipRegion(clip);
        g.setColour(juce::Colour(0xff060609));
        g.fillRect(m);
        juce::ColourGradient ember(juce::Colour(0xffb82d45), m.getX(), 0, juce::Colour(0xffb82d45), m.getRight(), 0, false);
        ember.addColour(0.25, juce::Colour(0xffd4722a));
        ember.addColour(0.5, col::accent);
        ember.addColour(0.75, juce::Colour(0xffd4722a));
        g.setGradientFill(ember);
        g.fillRect(m.withHeight(3.0f));
        g.restoreState();
        g.setColour(col::line);
        g.drawRoundedRectangle(m.reduced(0.5f), 10.0f, 1.0f);
        g.setColour(col::accent);
        g.setFont(juce::FontOptions(15.0f, juce::Font::bold));
        g.drawText("BE", m.withTrimmedTop(2), juce::Justification::centred);
    }
    g.setColour(col::line);
    g.drawHorizontalLine(68, 14.0f, (float) getWidth() - 14.0f);
}

void EditorContent::resized() {
    auto r = getLocalBounds().reduced(14, 12);
    // ── üst çubuk (44)
    auto top = r.removeFromTop(44);
    {
        auto brand = top.removeFromLeft(220);
        brandMark = brand.removeFromLeft(40).withSizeKeepingCentre(40, 40);
        brand.removeFromLeft(10);
        title.setBounds(brand.removeFromTop(23).withTrimmedTop(1));
        subtitle.setBounds(brand.withTrimmedTop(1));
        auto row = top.withSizeKeepingCentre(top.getWidth(), 32);
        help.setBounds(row.removeFromRight(32));
        row.removeFromRight(6);
        scale.setBounds(row.removeFromRight(70));
        row.removeFromRight(6);
        langSwitch.setBounds(row.removeFromRight(76));
        row.removeFromRight(6);
        viewSwitch.setBounds(row.removeFromRight(176));
        row.removeFromRight(16);
        presetPrev.setBounds(row.removeFromLeft(30));
        row.removeFromLeft(4);
        factory.setBounds(row.removeFromLeft(150));
        row.removeFromLeft(4);
        presetNext.setBounds(row.removeFromLeft(30));
        row.removeFromLeft(6);
        save.setBounds(row.removeFromLeft(56));
        row.removeFromLeft(4);
        load.setBounds(row.removeFromLeft(52));
        row.removeFromLeft(12);
        abSwitch.setBounds(row.removeFromLeft(66));
        row.removeFromLeft(4);
        copyAB.setBounds(row.removeFromLeft(48));
        row.removeFromLeft(8);
        undoB.setBounds(row.removeFromLeft(32));
        row.removeFromLeft(4);
        redoB.setBounds(row.removeFromLeft(32));
    }
    r.removeFromTop(13);
    // ── kontrol çubuğu (40)
    auto cb = r.removeFromTop(40);
    statusPill.setBounds(cb.removeFromLeft(178).reduced(0, 4));
    cb.removeFromLeft(12);
    if (advanced) {
        modeSeg.setBounds(cb.removeFromLeft(462));
        cb.removeFromLeft(10);
        learn.setBounds(cb.removeFromLeft(150).reduced(0, 1));
        latency.setBounds(cb.removeFromRight(170).reduced(0, 5));
        cb.removeFromRight(6);
        autoTarget.setBounds(cb.removeFromRight(150).reduced(0, 5));
    } else {
        modeCombo.setBounds(cb.removeFromLeft(190).reduced(0, 5));
        cb.removeFromLeft(10);
        learn.setBounds(cb.removeFromLeft(170).reduced(0, 1));
    }
    r.removeFromTop(12);
    // ── alt bilgi + alt alan
    helpBar.setBounds(r.removeFromBottom(26));
    r.removeFromBottom(10);
    auto bottom = r.removeFromBottom(advanced ? 216 : 132);
    r.removeFromBottom(12);
    if (advanced) tabs.setBounds(bottom);
    else {
        simplePane.setBounds(bottom);
        auto b = simplePane.getLocalBounds();
        auto quick = b.removeFromRight(260);
        b.removeFromRight(16);
        adviceMini.setBounds(b.removeFromRight(452));
        b.removeFromRight(20);
        guide.setBounds(b.withTrimmedLeft(4));
        quick.removeFromTop(6);
        sCrossover.setBounds(quick.removeFromTop(28));
        sFc.setBounds(quick.removeFromTop(30));
        quick.removeFromTop(4);
        auto row = quick.removeFromTop(28);
        sBassMono.setBounds(row.removeFromLeft(120));
        sDuck.setBounds(row);
    }
    // ── sağ sütun (340)
    auto right = r.removeFromRight(340);
    r.removeFromRight(14);
    const int gap = advanced ? 8 : 10;
    compare.setBounds(right.removeFromTop(advanced ? 34 : 38));
    right.removeFromTop(gap);
    readout.setBounds(right.removeFromTop(advanced ? 98 : 132));
    right.removeFromTop(gap);
    auto tc = right.removeFromTop(advanced ? 128 : 140);
    trimCard.setBounds(tc);
    {
        auto in = tc.reduced(14, 8);
        auto head = in.removeFromTop(20);
        head.removeFromRight(86);
        polarity.setBounds(head.removeFromRight(132));
        auto metersArea = in.removeFromRight(78);
        const int mw = metersArea.getWidth() / 3;
        mKick.setBounds(metersArea.removeFromLeft(mw));
        mIn.setBounds(metersArea.removeFromLeft(mw));
        mOut.setBounds(metersArea);
        in.removeFromRight(8);
        const int kw = in.getWidth() / 3;
        predelay.setBounds(in.removeFromLeft(kw));
        phase.setBounds(in.removeFromLeft(kw));
        outGain.setBounds(in);
    }
    right.removeFromTop(gap);
    meterCard.setBounds(right);
    meters.setBounds(right);
    // ── orta: görünüm sekmeleri + grafik + (gelişmiş) araç çubuğu
    auto vt = r.removeFromTop(30);
    viewTabs.setBounds(vt.removeFromLeft(440));
    r.removeFromTop(6);
    if (advanced) {
        auto tool = r.removeFromBottom(64);
        auto t1 = tool.removeFromTop(32).reduced(0, 2);
        trig.setBounds(t1.removeFromLeft(130));
        t1.removeFromLeft(6);
        tempoBeats.setBounds(t1.removeFromLeft(78));
        t1.removeFromLeft(14);
        const int sw = (t1.getWidth() - 3 * 44 - 2 * 14) / 3;
        zoomL.setBounds(t1.removeFromLeft(44)); zoom.setBounds(t1.removeFromLeft(sw));
        t1.removeFromLeft(14);
        preL.setBounds(t1.removeFromLeft(44)); pre.setBounds(t1.removeFromLeft(sw));
        t1.removeFromLeft(14);
        avgL.setBounds(t1.removeFromLeft(44)); avg.setBounds(t1);
        auto t2 = tool.reduced(0, 2);
        lowView.setBounds(t2.removeFromLeft(104));
        viewL.setBounds(t2.removeFromLeft(44)); viewHz.setBounds(t2.removeFromLeft(sw));
        t2.removeFromLeft(10);
        auto chip = [&](juce::TextButton& b) {
            b.setBounds(t2.removeFromRight((int) std::ceil(textW(b.getButtonText(), 13.0f)) + 26).reduced(2, 1));
        };
        chip(freeze); chip(persist);
        t2.removeFromRight(12);
        chip(tBefore); chip(tSum); chip(tBass); chip(tKick);
        r.removeFromBottom(6);
    }
    scope.setBounds(r);
    phasePlot.setBounds(r);
    xyPlot.setBounds(r);
    specPlot.setBounds(r);
    // ── gelişmiş sekme içerikleri
    auto pa = juce::Rectangle<int>(0, 0, tabs.getWidth(), tabs.getHeight() - 38).reduced(16, 12);
    {
        auto c = pa;
        auto col1 = c.removeFromLeft(c.getWidth() / 2).reduced(6, 0), col2 = c.reduced(6, 0);
        const int h = 34;
        search.setBounds(col1.removeFromTop(h)); learnHits.setBounds(col1.removeFromTop(h)); contRate.setBounds(col1.removeFromTop(h));
        trigHz.setBounds(col1.removeFromTop(h));
        winStart.setBounds(col2.removeFromTop(h)); winMs.setBounds(col2.removeFromTop(h)); scOffset.setBounds(col2.removeFromTop(h));
        alignNote.setBounds(col2.removeFromTop(h + 6));
    }
    {
        auto c = pa;
        auto col1 = c.removeFromLeft(c.getWidth() / 2).reduced(6, 0), col2 = c.reduced(6, 0);
        crossover.setBounds(col1.removeFromTop(30)); fc.setBounds(col1.removeFromTop(34)); listen.setBounds(col1.removeFromTop(34));
        xoverNote.setBounds(col1.removeFromTop(40));
        bassMono.setBounds(col2.removeFromTop(30)); monoHz.setBounds(col2.removeFromTop(34)); monoWidth.setBounds(col2.removeFromTop(34));
    }
    {
        auto c = pa;
        auto left = c.removeFromLeft(c.getWidth() * 6 / 11);
        auto a = left.removeFromLeft(left.getWidth() / 2).reduced(6, 0), b = left.reduced(6, 0);
        duck.setBounds(a.removeFromTop(30)); a.removeFromTop(6); duckDepth.setBounds(a.removeFromTop(32)); a.removeFromTop(6); duckLen.setBounds(a.removeFromTop(32));
        duckSync.setBounds(b.removeFromTop(30)); b.removeFromTop(6); duckBeats.setBounds(b.removeFromTop(32)); b.removeFromTop(6); duckTarget.setBounds(b.removeFromTop(32));
        curve.setBounds(c.reduced(6, 0));
    }
    if (tour) tour->setBounds(getLocalBounds());
}

void EditorContent::startTour(int step) {
    std::vector<TourOverlay::Step> s = {
        {nullptr, L("Welcome to KB-Align", "KB-Align'a hoş geldin"),
         L("It aligns the bass to the kick in time and phase, so they punch together instead of cancelling. It only processes the bass — the kick is never touched. "
           "Esc closes this tour; restart it any time from the ? menu.",
           "Bası kick'e zaman ve faz olarak hizalar: ikisi birbirini yemez, birlikte vurur. Yalnız bası işler, kick'e dokunmaz. "
           "Esc turu kapatır; ? menüsünden her zaman yeniden açabilirsin.")},
        {&statusPill, L("1 · Connect the sidechain", "1 · Sidechain'i bağla"),
         L("Put KB-Align on the BASS track. In Ableton, open the sidechain section in the device title bar and pick the KICK track. "
           "The light turns green and flashes on every kick.",
           "Eklentiyi BAS kanalına koy. Ableton'da cihaz başlığındaki sidechain bölümünü aç ve KICK kanalını seç. "
           "Işık yeşil yanar ve her kick'te yanıp söner.")},
        {&learn, L("2 · Press Learn", "2 · Learn'e bas"),
         L("Press it while the track plays. It listens to the next kicks, finds the best shift + phase and holds it. If the bass notes change, choose Per Note.",
           "Parça çalarken bas. Sonraki kick'leri dinler, en iyi kaydırma + fazı bulup sabitler. Bas notaları değişiyorsa Nota başına'yı seç.")},
        {&readout, L("3 · The result", "3 · Sonuç"),
         L("Low-end gain tells you how much stronger kick + bass are together than before. Plus = they punch together. Below: the applied shift, phase and bass note.",
           "Alt bant kazancı, kick + basın birlikte öncekine göre ne kadar güçlendiğini söyler. Artı = birlikte vuruyorlar. Altında uygulanan kaydırma, faz ve bas notası.")},
        {&compare, L("4 · Before / After", "4 · Önce / Sonra"),
         L("Switch to hear the original bass, then the aligned one. Latency stays the same, so the comparison is fair.",
           "Orijinal bası, sonra hizalanmışı dinle. Gecikme aynı kalır, karşılaştırma adil olur.")},
        {&viewTabs, L("5 · See it", "5 · Gör"),
         L("Waveform shows kick, bass and sum after every kick (drag the blue bass trace to shift it). Phase, Spectrum and XY show the same thing in other ways.",
           "Dalga, her kick'ten sonra kick, bas ve toplamı gösterir (mavi bas izini sürükleyerek kaydırabilirsin). Faz, Spektrum ve XY aynı şeyi başka açıdan gösterir.")},
        {advanced ? static_cast<juce::Component*>(&tabs) : static_cast<juce::Component*>(&adviceMini), L("6 · Suggestions", "6 · Öneriler"),
         L("KB-Align measures three things that lock the phases even better: kick tuning (max ±2 semitones), synth retrigger and ducking. "
           "Ducking and mode suggestions apply with one click.",
           "KB-Align fazları daha da oturtan üç şeyi ölçer: kick akordu (en fazla ±2 yarım ses), synth retrigger ve ducking. "
           "Ducking ve mod önerisi tek tıkla uygulanır.")},
        {&trimCard, L("7 · Manual trim", "7 · Elle ince ayar"),
         L("Delay, Phase and Invert add to whatever the automatic modes do. Double-click a knob to reset it.",
           "Gecikme, Faz ve Ters çevir, otomatik modların yaptığının üstüne eklenir. Düğmeye çift tıklayınca sıfırlanır.")},
        {&viewSwitch, L("8 · Advanced", "8 · Gelişmiş"),
         L("Suggestion details, crossover, Bass Mono, the ducking curve, the note table, analysis settings and scope tools.",
           "Öneri ayrıntısı, crossover, Bass Mono, ducking eğrisi, nota tablosu, analiz ayarları ve osiloskop araçları.")},
        {&help, L("You're ready", "Hazırsın"),
         L("Hover over any control: the bar at the bottom explains it. Switch the language with EN | TR.",
           "Bir kontrolün üzerine gel: alttaki çubuk anlatır. Dili EN | TR ile değiştirebilirsin.")},
    };
    tour = std::make_unique<TourOverlay>(std::move(s));
    tour->onFinish = [this] {
        userSettings().setValue("tourDone", true);
        userSettings().saveIfNeeded();
        juce::MessageManager::callAsync([sp = juce::Component::SafePointer<EditorContent>(this)] { if (sp) sp->tour.reset(); });
    };
    addAndMakeVisible(*tour);
    tour->setBounds(getLocalBounds());
    tour->go(step);
    tour->grabKeyboardFocus();
}

void EditorContent::maybeAutoTour() {
    if (autoTour && !userSettings().getBoolValue("tourDone", false)) startTour(0);
}

void EditorContent::showHelpMenu() {
    juce::PopupMenu m;
    m.addItem(1, L("Start the tour", "Tanıtım turunu başlat"));
    m.addItem(2, L("About · license · source code", "Hakkında · lisans · kaynak kodu"));
    m.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(&help), [this](int r) {
        if (r == 1) startTour(0);
        if (r == 2)
            juce::AlertWindow::showMessageBoxAsync(juce::MessageBoxIconType::InfoIcon, "KB-Align " JucePlugin_VersionString,
                L("Aligns the bass to the kick in time and phase.\n\n© 2026 Berkay Er · BE Akademi · berkayeracademy.com\n"
                  "Free. Distributed under the GNU Affero General Public License v3 (or later): you may get, change and share the source code under "
                  "the same license. No warranty.\n\nSource code: in the download card of the Ders Paneli.\n"
                  "Uses JUCE (AGPLv3), VST3 SDK (MIT), CLAP (MIT), clap-juce-extensions (MIT) and the Inter typeface (SIL OFL 1.1).",
                  "Bası kick'e zaman ve faz olarak hizalar.\n\n© 2026 Berkay Er · BE Akademi · berkayeracademy.com\n"
                  "Ücretsizdir. GNU Affero Genel Kamu Lisansı v3 (ya da sonrası) ile dağıtılır: kaynak kodunu alma, değiştirme ve aynı "
                  "lisansla paylaşma hakkın var. Hiçbir garanti verilmez.\n\nKaynak kodu: Ders Paneli'ndeki indirme kartında.\n"
                  "JUCE (AGPLv3), VST3 SDK (MIT), CLAP (MIT), clap-juce-extensions (MIT) ve Inter yazı tipini (SIL OFL 1.1) kullanır."));
    });
}

juce::File EditorContent::presetDir() const {
    auto d = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory).getChildFile("KB-Align").getChildFile("Presets");
    d.createDirectory();
    return d;
}

void EditorContent::savePreset() {
    chooser = std::make_unique<juce::FileChooser>(L("Save preset", "Preset kaydet"), presetDir(), "*.kbpreset");
    chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fch) {
        auto f = fch.getResult();
        if (f == juce::File()) return;
        if (auto xml = proc.snapshot().createXml()) xml->writeTo(f.withFileExtension("kbpreset"));
    });
}

void EditorContent::loadPreset() {
    chooser = std::make_unique<juce::FileChooser>(L("Load preset", "Preset aç"), presetDir(), "*.kbpreset");
    chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fch) {
        auto f = fch.getResult();
        if (!f.existsAsFile()) return;
        if (auto xml = juce::XmlDocument::parse(f)) proc.restore(juce::ValueTree::fromXml(*xml));
    });
}

// ───────────────────────────── KBAlignEditor
KBAlignEditor::KBAlignEditor(KBAlignProcessor& p) : juce::AudioProcessorEditor(p), proc(p) {
    setTurkish(userSettings().getValue("lang", "en") == "tr");
    setResizable(false, false);
    build();
    startTimer(700);  // ilk açılışta tanıtım turu (bir kez)
}

void KBAlignEditor::build() {
    if (content) removeChildComponent(content.get());
    content = std::make_unique<EditorContent>(proc);
    addAndMakeVisible(*content);
    content->setBounds(0, 0, EditorContent::kW, EditorContent::kH);
    content->onScale = [this](float s) { applyScale(s); };
    content->onLanguage = [sp = juce::Component::SafePointer<KBAlignEditor>(this)] { if (sp) sp->build(); };
    applyScale(juce::jlimit(75, 200, userSettings().getIntValue("scale", 100)) / 100.0f);
}

void KBAlignEditor::applyScale(float s) {
    scale = juce::jlimit(0.75f, 2.0f, s);
    content->setTransform(juce::AffineTransform::scale(scale));
    setSize(juce::roundToInt(EditorContent::kW * scale), juce::roundToInt(EditorContent::kH * scale));
}

} // namespace kb
