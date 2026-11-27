// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "PluginEditor.h"

namespace kb {

using namespace ui;
static juce::String U(const char* s) { return juce::String::fromUTF8(s); }

static void styleLabel(juce::Label& l, const juce::String& t, juce::Colour c = col::fgSoft, float size = 12.5f) {
    l.setText(t, juce::dontSendNotification);
    l.setColour(juce::Label::textColourId, c);
    l.setFont(juce::FontOptions(size));
}

static void setupSlider(juce::Slider& s, double lo, double hi, double v, double step, const juce::String& title, const juce::String& tip) {
    s.setSliderStyle(juce::Slider::LinearHorizontal);
    s.setTextBoxStyle(juce::Slider::TextBoxRight, false, 52, 18);
    s.setRange(lo, hi, step);
    s.setValue(v, juce::dontSendNotification);
    s.setTitle(title);
    s.setTooltip(tip);
}

// ───────────────────────────── Readout
void Readout::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 10);
    auto in = r.reduced(14, 10);
    const double d = proc.engine.uiD.load(), th = std::fmod(proc.engine.uiTh.load() + 3600.0, 360.0);
    auto cell = [&](juce::Rectangle<float> c, const juce::String& k, const juce::String& v, juce::Colour vc) {
        g.setColour(col::fgFaint); g.setFont(juce::FontOptions(11.0f, juce::Font::bold));
        g.drawText(k, c.removeFromTop(14), juce::Justification::centredLeft);
        g.setColour(vc); g.setFont(juce::FontOptions(22.0f, juce::Font::bold));
        g.drawText(v, c.removeFromTop(28), juce::Justification::centredLeft);
    };
    auto top = in.removeFromTop(44);
    const float w = top.getWidth() / 2;
    cell(top.removeFromLeft(w), U("KAYDIRMA"), (d > 0 ? "+" : "") + juce::String(d, 2) + " ms", col::accent);
    cell(top, U("FAZ"), juce::String(th, 1) + U("°"), col::accent);
    in.removeFromTop(6);
    auto bot = in.removeFromTop(40);
    double gain = meters.rmsGainDb();
    if (std::abs(gain) < 0.05) gain = 0.0;
    cell(bot.removeFromLeft(w), U("TOPLAM ALT BANT"), meters.hasData() ? (gain >= 0 ? "+" : "") + juce::String(gain, 1) + " dB" : U("—"),
         !meters.hasData() ? col::fgFaint : gain >= 0.05 ? col::ok : gain <= -0.05 ? col::warn : col::fg);
    juce::String note = U("—");
    auto hs = proc.align.recentHits();
    for (auto it = hs.rbegin(); it != hs.rend(); ++it) if (it->note >= 0) { note = noteName(it->note); break; }
    cell(bot, U("BAS NOTASI"), note, col::fg);
}

// ───────────────────────────── EditorContent
EditorContent::EditorContent(KBAlignProcessor& p)
    : proc(p),
      modeSeg(p.apvts, pid::mode,
              {U("Elle"), "Learn", U("Her vuruş"), U("Nota başına"), U("Takip")},
              {U("Elle: yalnız Pre-delay, Faz ve Ø ayarların uygulanır."),
               U("Learn: Learn düğmesine basınca birkaç kick dinler, en iyi kaydırma ve fazı bulup sabitler. Bas tek notaysa ideal."),
               U("Her vuruş: her kick'te yeniden hesaplar. Bas fazı serbest dolaşan synth'lerde en iyisi; 'Tam + lookahead' gecikme moduyla kullan."),
               U("Nota başına: her bas notası için ayrı ayar öğrenir ve o nota gelince uygular. Notalar değişiyorsa en iyisi."),
               U("Takip: yavaşça ve kesintisiz izler; canlı çalım ya da yavaş değişen bas için.")}),
      autoTarget(p.apvts, pid::autoTarget, ""), latency(p.apvts, pid::latency, ""),
      scope(p), meters(p, scope), phasePlot(meters, 0), xyPlot(meters, 1),
      readout(p, meters),
      predelay(p.apvts, pid::predelay, "Pre-delay"), phase(p.apvts, pid::phase, "Faz", true), outGain(p.apvts, pid::outGain, U("Çıkış")),
      polarity(p.apvts, pid::polarity, U("Ø Polarite")),
      sCrossover(p.apvts, pid::crossover, U("Crossover: yalnız alt bandı işle")), sBassMono(p.apvts, pid::bassMono, "Bass Mono"),
      sDuck(p.apvts, pid::duck, "Sidechain ducking"), sFc(p.apvts, pid::fc, U("Crossover sınırı")),
      search(p.apvts, pid::search, U("Arama aralığı ±")), learnHits(p.apvts, pid::learnHits, U("Learn vuruşu")),
      winStart(p.apvts, pid::winStart, U("Pencere başı")), winMs(p.apvts, pid::winMs, U("Pencere uzunluğu")),
      scOffset(p.apvts, pid::scOffset, "Sidechain ofseti"), trigHz(p.apvts, pid::trigHz, "Tetik frekans"),
      contRate(p.apvts, pid::contRate, U("Takip hızı")),
      crossover(p.apvts, pid::crossover, U("Crossover (açıkken yalnız alt bant işlenir)")),
      bassMono(p.apvts, pid::bassMono, "Bass Mono"), duck(p.apvts, pid::duck, "Ducking"), duckSync(p.apvts, pid::duckSync, "Tempoya kilitli"),
      fc(p.apvts, pid::fc, "Crossover frekans"), monoHz(p.apvts, pid::monoHz, "Mono frekans"),
      monoWidth(p.apvts, pid::monoWidth, U("Alt bant genişlik")), duckDepth(p.apvts, pid::duckDepth, "Derinlik"),
      duckLen(p.apvts, pid::duckLen, "Uzunluk"), listen(p.apvts, pid::listen, "Dinleme"), duckBeats(p.apvts, pid::duckBeats, "Nota"),
      duckTarget(p.apvts, pid::duckTarget, "Hedef"), curve(p), notes(p) {
    setLookAndFeel(&look);
    setTitle("KB-Align");

    // ── üst çubuk
    styleLabel(title, "KB-Align", col::accent, 21.0f);
    title.setFont(juce::FontOptions(21.0f, juce::Font::bold));
    styleLabel(subtitle, U("kick–bas faz hizalama"), col::fgFaint, 11.5f);
    for (auto* c : std::initializer_list<juce::Component*>{&title, &subtitle, &presetPrev, &factory, &presetNext, &save, &load, &ab, &copyAB, &undoB,
                                                         &redoB, &viewSimple, &viewAdv, &help, &scale, &compare})
        addAndMakeVisible(c);
    for (int i = 0; i < proc.getNumPrograms(); ++i) factory.addItem(proc.getProgramName(i), i + 1);
    factory.setTextWhenNothingSelected(U("Preset seç…"));
    factory.setTitle("Preset");
    factory.setTooltip(U("Hazır ayarlar. ‹ › ile sırayla gez."));
    factory.onChange = [this] { if (factory.getSelectedId() > 0) proc.setCurrentProgram(factory.getSelectedId() - 1); };
    presetPrev.onClick = [this] { stepPreset(-1); };
    presetNext.onClick = [this] { stepPreset(+1); };
    presetPrev.setTooltip(U("Önceki preset"));
    presetNext.setTooltip(U("Sonraki preset"));
    save.setTooltip(U("Ayarlarını preset dosyası olarak kaydet (nota tablosu ve ducking eğrisi dahil)."));
    load.setTooltip(U("Kaydettiğin bir preset'i aç."));
    save.onClick = [this] { savePreset(); };
    load.onClick = [this] { loadPreset(); };
    ab.setTooltip(U("A/B: iki ayar durumu arasında geç (karşılaştırma için)."));
    ab.onClick = [this] { proc.toggleAB(); ab.setButtonText(proc.slotBActive ? "B" : "A"); };
    copyAB.setTooltip(U("Geçerli ayarı öbür A/B yuvasına kopyala."));
    copyAB.onClick = [this] { proc.copyAtoB(); };
    undoB.setTooltip(U("Geri al"));
    redoB.setTooltip(U("Yinele"));
    undoB.onClick = [this] { proc.undo.undo(); };
    redoB.onClick = [this] { proc.undo.redo(); };
    viewSimple.setRadioGroupId(0x71e);
    viewAdv.setRadioGroupId(0x71e);
    viewSimple.setTooltip(U("Basit görünüm: yalnız gerekenler."));
    viewAdv.setTooltip(U("Gelişmiş görünüm: crossover, Bass Mono, ducking, nota tablosu, analiz ayarları, osiloskop araçları."));
    viewSimple.onClick = [this] { setAdvanced(false); };
    viewAdv.onClick = [this] { setAdvanced(true); };
    help.setTooltip(U("Tur, yardım ve hakkında"));
    help.onClick = [this] { showHelpMenu(); };
    for (int s : {75, 100, 125, 150, 175, 200}) scale.addItem(juce::String(s) + " %", s);
    scale.setSelectedId(100, juce::dontSendNotification);
    scale.setTitle(U("Arayüz ölçeği"));
    scale.setTooltip(U("Pencere boyutu"));
    scale.onChange = [this] { if (onScale) onScale(scale.getSelectedId() / 100.0f); };
    compare.setClickingTogglesState(true);
    compare.setTooltip(U("Önce / Sonra: tıkla, orijinal bası dinle; tekrar tıkla, hizalanmış hâle dön. Gecikme aynı kalır, karşılaştırma adildir."));
    compareAtt = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(proc.apvts, pid::bypass, compare);

    // ── mod çubuğu
    addAndMakeVisible(modeSeg);
    addAndMakeVisible(learn);
    addAndMakeVisible(autoTarget);
    addAndMakeVisible(latency);
    addAndMakeVisible(status);
    learn.setTooltip(U("Learn: çalarken bas. Sonraki kick'leri dinler, en iyi kaydırma + fazı bulur ve sabitler."));
    learn.onClick = [this] {
        if (auto* m = proc.apvts.getParameter(pid::mode)) m->setValueNotifyingHost(m->convertTo0to1((float) Mode::Learn));
        proc.startLearn();
    };
    autoTarget.box.setTooltip(U("Otomatik ne ayarlasın: zaman + faz (önerilen), yalnız zaman ya da yalnız faz."));
    latency.box.setTooltip(U("Gecikme modu: Düşük ±10 ms (38 ms gecikme) · Tam ±50 ms (78 ms) · Tam + lookahead (138 ms, 'Her vuruş' modu için)."));
    status.setFont(juce::FontOptions(12.5f));
    status.setJustificationType(juce::Justification::centredRight);

    // ── orta alan
    for (auto* b : {&vWave, &vPhase, &vXY}) { b->setRadioGroupId(0x7a1); addAndMakeVisible(b); }
    vWave.setTooltip(U("Osiloskop: kick, bas ve toplam dalga biçimi, her kick'te yenilenir."));
    vPhase.setTooltip(U("Frekansa göre faz farkı: hizalı olunca noktalar 0° çizgisine toplanır."));
    vXY.setTooltip(U("XY (Lissajous): sağa yatık ince çizgi = aynı faz."));
    vWave.onClick = [this] { setView(0); };
    vPhase.onClick = [this] { setView(1); };
    vXY.onClick = [this] { setView(2); };
    addAndMakeVisible(scope);
    addChildComponent(phasePlot);
    addChildComponent(xyPlot);
    scope.setDescription(U("Bas izini (mavi) sürükle: pre-delay. Tık: imleç A · sağ tık: imleç B (fark ms/örnek/derece). Tekerlek: zaman yakınlaştır. F: dondur."));
    scope.onFrame = [this] { meters.update(); };
    meters.onUpdate = [this] { readout.repaint(); if (view) { phasePlot.repaint(); xyPlot.repaint(); } };
    trig.addItemList({U("Kick'e kilitli"), "Tempo", "Serbest"}, 1);
    trig.setSelectedId(1, juce::dontSendNotification);
    trig.setTitle("Tetik");
    trig.setTooltip(U("Osiloskop neye kilitlensin: kick vuruşu, tempo ızgarası ya da serbest."));
    trig.onChange = [this] { scope.trigger = (Trigger) (trig.getSelectedId() - 1); tempoBeats.setEnabled(scope.trigger == Trigger::Tempo); };
    tempoBeats.addItemList({"1/16", "1/8", "1/4", "1/2", U("1 ölçü"), U("2 ölçü"), U("4 ölçü")}, 1);
    tempoBeats.setSelectedId(3, juce::dontSendNotification);
    tempoBeats.setTitle("Tempo penceresi");
    tempoBeats.onChange = [this] { static constexpr double b[] = {0.25, 0.5, 1, 2, 4, 8, 16}; scope.tempoBeats = b[tempoBeats.getSelectedId() - 1]; };
    tempoBeats.setEnabled(false);
    setupSlider(zoom, 1, 500, 120, 0.1, U("Zaman ekseni"), U("Osiloskobun gösterdiği süre (ms)."));
    zoom.setSkewFactorFromMidPoint(60);
    zoom.onValueChange = [this] { scope.windowMs = zoom.getValue(); };
    setupSlider(pre, 0, 50, 10, 0.1, U("Ön-tetik"), U("Kick vuruşundan önce gösterilen süre (ms)."));
    pre.onValueChange = [this] { scope.preMs = pre.getValue(); };
    setupSlider(viewHz, 40, 400, 200, 1, U("Görüntü filtresi"), U("Yalnız görüntüyü süzer (sesi değil): bu frekansın altı gösterilir."));
    viewHz.onValueChange = [this] { scope.viewHz = viewHz.getValue(); };
    setupSlider(avg, 1, 16, 1, 1, U("Ortalama"), U("Son N kick vuruşunun ortalaması: gürültülü malzemede izi sakinleştirir."));
    avg.onValueChange = [this] { scope.average = (int) avg.getValue(); };
    styleLabel(zoomL, "Zaman"); styleLabel(preL, U("Ön-tetik")); styleLabel(viewL, "Filtre"); styleLabel(avgL, "Ortalama");
    lowView.setToggleState(true, juce::dontSendNotification);
    lowView.setTooltip(U("Açıkken yalnız alt bant gösterilir — hizalamanın önemli olduğu bölge."));
    lowView.onClick = [this] { scope.lowView = lowView.getToggleState(); };
    persist.setTooltip(U("Önceki vuruşların izleri soluk kalır."));
    persist.onClick = [this] { scope.persistence = persist.getToggleState(); };
    freeze.setTooltip(U("Görüntüyü dondur (F)."));
    freeze.onClick = [this] { scope.frozen = freeze.getToggleState(); };
    for (auto* t : {&tKick, &tBass, &tSum}) t->setToggleState(true, juce::dontSendNotification);
    tKick.onClick = [this] { scope.showKick = tKick.getToggleState(); };
    tBass.onClick = [this] { scope.showBass = tBass.getToggleState(); };
    tSum.onClick = [this] { scope.showSum = tSum.getToggleState(); };
    tBefore.setTooltip(U("Hizalamadan önceki bası gri kesikli göster."));
    tBefore.onClick = [this] { scope.showBefore = tBefore.getToggleState(); };
    for (auto* c : std::initializer_list<juce::Component*>{&trig, &tempoBeats, &zoom, &pre, &viewHz, &avg, &lowView, &persist, &freeze, &tKick, &tBass,
                                                         &tSum, &tBefore, &zoomL, &preL, &viewL, &avgL})
        addChildComponent(c);

    // ── sağ sütun
    addAndMakeVisible(readout);
    addAndMakeVisible(meters);
    for (auto* c : std::initializer_list<juce::Component*>{&predelay, &phase, &outGain, &polarity, &mKick, &mIn, &mOut}) addAndMakeVisible(c);
    predelay.stacked = outGain.stacked = true;
    predelay.slider.setTooltip(U("Pre-delay: bası ms olarak kaydırır (eksi = öne al). Otomatik modlarda otomatiğin üstüne eklenir. Shift: ince ayar, çift tık: sıfır."));
    phase.slider.setTooltip(U("Faz: alt bandı frekanstan bağımsız döndürür (0–360°). Otomatik modlarda üstüne eklenir."));
    polarity.button.setTooltip(U("Ø: işlenen bandın polaritesini çevirir (= 180°)."));
    outGain.slider.setTooltip(U("Çıkış seviyesi (yalnız işlenmiş ses; Önce/Sonra karşılaştırmasında seviye farkını eşitlemek için)."));
    mKick.setTooltip(U("Sidechain'e gelen kick seviyesi. Hiç oynamıyorsa sidechain bağlı değil."));
    mIn.setTooltip(U("Bas giriş seviyesi"));
    mOut.setTooltip(U("Bas çıkış seviyesi"));

    // ── alt alan: basit
    addAndMakeVisible(simplePane);
    styleLabel(stepsTitle, U("3 adımda kullanım"), col::fg, 14.0f);
    stepsTitle.setFont(juce::FontOptions(14.0f, juce::Font::bold));
    styleLabel(step1, U("1  Eklentiyi BAS kanalına koy, sidechain kaynağı olarak KICK kanalını seç."), col::fgSoft, 13.0f);
    styleLabel(step2, U("2  Çal ve Learn'e bas (notalar değişiyorsa 'Nota başına')."), col::fgSoft, 13.0f);
    styleLabel(step3, U("3  Önce / Sonra ile dinle; yandaki önerilere göz at."), col::fgSoft, 13.0f);
    for (auto* l : {&step1, &step2, &step3}) l->setMinimumHorizontalScale(1.0f);
    for (auto* c : std::initializer_list<juce::Component*>{&stepsTitle, &step1, &step2, &step3, &sCrossover, &sBassMono, &sDuck, &sFc, &adviceMini})
        simplePane.addAndMakeVisible(c);
    adviceMini.onDetails = [this] {
        setAdvanced(true);
        userSettings().setValue("advanced", true);
        tabs.setCurrentTabIndex(0);
    };
    sCrossover.button.setTooltip(U("Açıkken yalnız sınırın altındaki bas hizalanır, üstü hiç değişmez. Kapalıyken (önerilen) bütün bas birlikte kaydırılır: "
                                   "ölçümde kazanç kapalıyken 1,5–2 dB, 120 Hz'te açıkken 0,3–0,5 dB. Açacaksan sınırı yüksek tut (250 Hz ve üstü)."));
    sFc.slider.setTooltip(U("Crossover sınırı (yalnız crossover açıkken): bu frekansın altı hizalanır. Öneri 250 Hz ve üstü — düşük sınır kazancı azaltır."));
    sBassMono.button.setTooltip(U("Alt bandı mono yapar (stereo baslarda faz sorunlarını azaltır)."));
    sDuck.button.setTooltip(U("Kick vuruşunda basın altını (≤120 Hz) kısar, üstü korunur; kick'e dokunmaz. Eğri ve uzunluk: Gelişmiş > Ducking. "
                              "Öneriler paneli gerekip gerekmediğini ve uzunluğu söyler."));

    // ── alt alan: gelişmiş
    for (auto* c : std::initializer_list<juce::Component*>{&search, &learnHits, &winStart, &winMs, &scOffset, &trigHz, &contRate}) pAlign.addAndMakeVisible(c);
    for (auto* c : std::initializer_list<juce::Component*>{&crossover, &fc, &bassMono, &monoHz, &monoWidth, &listen, &xoverNote}) pXover.addAndMakeVisible(c);
    for (auto* c : std::initializer_list<juce::Component*>{&duck, &duckDepth, &duckLen, &duckSync, &duckBeats, &duckTarget, &curve, &duckNote}) pDuck.addAndMakeVisible(c);
    styleLabel(xoverNote, U("Kick + bas önizlemesi kick'i ikinci kez çalar: yalnız kontrol için, mikste kapalı tut."));
    styleLabel(duckNote, U("VARSAYIM: varsayılan eğri yer tutucu — kendi çizdiğin eğri varsayılan preset olacak."));
    search.slider.setTooltip(U("Otomatik modların bası en fazla ne kadar kaydırabileceği. Büyük değer ritmi bozabilir; öneri ±10 ms."));
    learnHits.slider.setTooltip(U("Learn'ün dinlediği kick sayısı."));
    winStart.slider.setTooltip(U("Analiz penceresi kick'ten ne kadar sonra başlasın (osiloskopta kenarı sürükleyebilirsin)."));
    winMs.slider.setTooltip(U("Analiz penceresinin uzunluğu: kick'in hangi bölümü hizalansın."));
    scOffset.slider.setTooltip(U("Host sidechain'i geç veriyorsa (+) bu kadar telafi edilir. Ableton testinde ölçülür."));
    trigHz.slider.setTooltip(U("Kick tespiti bu frekansın altını dinler (davul bus'ında kick'i ayırmak için)."));
    contRate.slider.setTooltip(U("Takip modunda kaydırmanın en hızlı değişimi (ms/s). Düşük = pürüzsüz."));
    listen.box.setTooltip(U("Bas · Kick + bas önizleme · Alt bant solo"));
    duckTarget.box.setTooltip(U("Alt bant: yalnız 120 Hz altı kısılır (crossover açıksa crossover sınırının altı), faz kaydırmadan — basın üstü korunur. "
                                "Tüm sinyal: basın tamamı kısılır (klasik pompalama)."));
    tabs.addTab(U("Öneriler"), col::panel, &adviceTab, false);
    tabs.addTab(U("Analiz"), col::panel, &pAlign, false);
    tabs.addTab(U("Crossover · Mono · Dinleme"), col::panel, &pXover, false);
    tabs.addTab("Ducking", col::panel, &pDuck, false);
    tabs.addTab("Nota tablosu", col::panel, &notes, false);
    tabs.setOutline(0);
    tabs.setTabBarDepth(30);
    addChildComponent(tabs);

    addAndMakeVisible(helpBar);
    helpBar.setDefault(U("Fareyi bir kontrolün üzerine getir: ne yaptığı burada yazar.  ·  ? menüsünden tanıtım turunu yeniden başlatabilirsin."));
    setAdvanced(userSettings().getBoolValue("advanced", false));
    setView(0);
    startTimerHz(20);
}

EditorContent::~EditorContent() { setLookAndFeel(nullptr); }

void EditorContent::setAdvanced(bool adv) {
    advanced = adv;
    viewSimple.setToggleState(!adv, juce::dontSendNotification);
    viewAdv.setToggleState(adv, juce::dontSendNotification);
    simplePane.setVisible(!adv);
    tabs.setVisible(adv);
    for (auto* c : std::initializer_list<juce::Component*>{&trig, &tempoBeats, &zoom, &pre, &viewHz, &avg, &lowView, &persist, &freeze, &tKick, &tBass,
                                                         &tSum, &tBefore, &zoomL, &preL, &viewL, &avgL})
        c->setVisible(adv);
    userSettings().setValue("advanced", adv);
    resized();
}

void EditorContent::setView(int v) {
    view = v;
    vWave.setToggleState(v == 0, juce::dontSendNotification);
    vPhase.setToggleState(v == 1, juce::dontSendNotification);
    vXY.setToggleState(v == 2, juce::dontSendNotification);
    scope.setVisible(v == 0);
    phasePlot.setVisible(v == 1);
    xyPlot.setVisible(v == 2);
}

void EditorContent::stepPreset(int dir) {
    const int n = proc.getNumPrograms();
    const int cur = factory.getSelectedId() > 0 ? factory.getSelectedId() - 1 : proc.getCurrentProgram();
    factory.setSelectedId(((cur + dir) % n + n) % n + 1);
}

void EditorContent::timerCallback() {
    proc.pollLearn();
    const bool sc = proc.sidechainConnected();
    juce::String st;
    juce::Colour sc_col = col::fgSoft;
    if (!sc) { st = U("Sidechain yok — kick kanalını sidechain girişine bağla"); sc_col = col::warn; }
    else if (proc.align.learnInProgress())
        { st = U("Learn dinliyor: ") + juce::String(proc.align.learnCollected.load()) + " / " +
               juce::String((int) proc.apvts.getRawParameterValue(pid::learnHits)->load()) + U(" vuruş"); sc_col = col::accent; }
    else if (proc.learned && (int) proc.apvts.getRawParameterValue(pid::mode)->load() == (int) Mode::Learn) st = U("Learn tamam — ayar sabit");
    else st = U("Kick algılanıyor");
    status.setText(st, juce::dontSendNotification);
    status.setColour(juce::Label::textColourId, sc_col);
    learn.setButtonText(proc.align.learnInProgress() ? U("Dinliyor… ") + juce::String(proc.align.learnCollected.load()) : U("Learn'ü başlat"));
    const bool before = proc.apvts.getRawParameterValue(pid::bypass)->load() > 0.5f;
    compare.setButtonText(before ? U("ÖNCE · orijinal") : U("SONRA · hizalı"));
    undoB.setEnabled(proc.undo.canUndo());
    redoB.setEnabled(proc.undo.canRedo());
    mKick.push(proc.engine.uiKickPeak.exchange(0.0f));
    mIn.push(proc.engine.uiInPeak.exchange(0.0f));
    mOut.push(proc.engine.uiOutPeak.exchange(0.0f));
    if (++tick % 4 == 0) { readout.repaint(); proc.undo.beginNewTransaction(); }
}

void EditorContent::paint(juce::Graphics& g) {
    g.fillAll(col::bg);
    // üst çubuğun altında ince çizgi
    g.setColour(col::line);
    g.drawHorizontalLine(56, 12.0f, (float) getWidth() - 12.0f);
}

void EditorContent::resized() {
    auto r = getLocalBounds().reduced(12);
    // üst çubuk
    auto top = r.removeFromTop(40);
    {
        auto brand = top.removeFromLeft(170);
        title.setBounds(brand.removeFromTop(24));
        subtitle.setBounds(brand);
        compare.setBounds(top.removeFromRight(150).reduced(2));
        top.removeFromRight(6);
        scale.setBounds(top.removeFromRight(78).reduced(2, 5));
        help.setBounds(top.removeFromRight(36).reduced(2, 4));
        viewAdv.setBounds(top.removeFromRight(88).reduced(1, 4));
        viewSimple.setBounds(top.removeFromRight(64).reduced(1, 4));
        top.removeFromRight(8);
        redoB.setBounds(top.removeFromRight(36).reduced(2, 4));
        undoB.setBounds(top.removeFromRight(36).reduced(2, 4));
        copyAB.setBounds(top.removeFromRight(50).reduced(2, 4));
        ab.setBounds(top.removeFromRight(36).reduced(2, 4));
        top.removeFromRight(8);
        load.setBounds(top.removeFromRight(46).reduced(2, 4));
        save.setBounds(top.removeFromRight(62).reduced(2, 4));
        presetNext.setBounds(top.removeFromRight(30).reduced(2, 4));
        presetPrev.setBounds(top.removeFromLeft(30).reduced(2, 4));
        factory.setBounds(top.reduced(2, 5));
    }
    r.removeFromTop(10);
    // mod çubuğu
    auto mb = r.removeFromTop(40);
    modeSeg.setBounds(mb.removeFromLeft(470));
    mb.removeFromLeft(8);
    learn.setBounds(mb.removeFromLeft(120).reduced(0, 2));
    mb.removeFromLeft(8);
    autoTarget.setBounds(mb.removeFromLeft(150).reduced(0, 6));
    latency.setBounds(mb.removeFromLeft(160).reduced(4, 6));
    status.setBounds(mb);
    r.removeFromTop(8);
    // yardım çubuğu
    helpBar.setBounds(r.removeFromBottom(26));
    r.removeFromBottom(8);
    // alt alan
    auto bottom = r.removeFromBottom(advanced ? 232 : 128);
    r.removeFromBottom(8);
    if (advanced) tabs.setBounds(bottom);
    else {
        simplePane.setBounds(bottom);
        auto b = simplePane.getLocalBounds().reduced(14, 10);
        auto right = b.removeFromRight(262);
        b.removeFromRight(14);
        adviceMini.setBounds(b.removeFromRight(430));
        b.removeFromRight(14);
        stepsTitle.setBounds(b.removeFromTop(22));
        step1.setBounds(b.removeFromTop(30));
        step2.setBounds(b.removeFromTop(30));
        step3.setBounds(b.removeFromTop(30));
        sCrossover.setBounds(right.removeFromTop(26));
        sFc.setBounds(right.removeFromTop(30));
        auto row = right.removeFromTop(28);
        sBassMono.setBounds(row.removeFromLeft(108));
        sDuck.setBounds(row);
    }
    // sağ sütun
    auto right = r.removeFromRight(330);
    r.removeFromRight(10);
    readout.setBounds(right.removeFromTop(104));
    right.removeFromTop(8);
    auto ctl = right.removeFromTop(150);
    {
        auto knob = ctl.removeFromLeft(110);
        phase.setBounds(knob.removeFromTop(118));
        polarity.setBounds(knob.reduced(4, 2));
        auto meters3 = ctl.removeFromRight(96);
        const int mw = meters3.getWidth() / 3;
        mKick.setBounds(meters3.removeFromLeft(mw));
        mIn.setBounds(meters3.removeFromLeft(mw));
        mOut.setBounds(meters3);
        ctl.removeFromTop(14);
        predelay.setBounds(ctl.removeFromTop(48).reduced(6, 0));
        ctl.removeFromTop(14);
        outGain.setBounds(ctl.removeFromTop(48).reduced(6, 0));
    }
    right.removeFromTop(8);
    meters.setBounds(right);
    // orta: görünüm sekmeleri + osiloskop + (gelişmiş) araç çubuğu
    auto vt = r.removeFromTop(28);
    vWave.setBounds(vt.removeFromLeft(80).reduced(2, 1));
    vPhase.setBounds(vt.removeFromLeft(64).reduced(2, 1));
    vXY.setBounds(vt.removeFromLeft(56).reduced(2, 1));
    r.removeFromTop(6);
    if (advanced) {
        auto tool = r.removeFromBottom(60);
        auto t1 = tool.removeFromTop(30);
        trig.setBounds(t1.removeFromLeft(124).reduced(2));
        tempoBeats.setBounds(t1.removeFromLeft(74).reduced(2));
        zoomL.setBounds(t1.removeFromLeft(44)); zoom.setBounds(t1.removeFromLeft(150).reduced(2));
        preL.setBounds(t1.removeFromLeft(52)); pre.setBounds(t1.removeFromLeft(130).reduced(2));
        avgL.setBounds(t1.removeFromLeft(60)); avg.setBounds(t1.reduced(2));
        auto t2 = tool;
        lowView.setBounds(t2.removeFromLeft(166));
        viewL.setBounds(t2.removeFromLeft(38)); viewHz.setBounds(t2.removeFromLeft(118).reduced(2));
        persist.setBounds(t2.removeFromLeft(96)); freeze.setBounds(t2.removeFromLeft(78));
        tKick.setBounds(t2.removeFromLeft(62)); tBass.setBounds(t2.removeFromLeft(56)); tSum.setBounds(t2.removeFromLeft(78));
        tBefore.setBounds(t2);
        r.removeFromBottom(4);
    }
    scope.setBounds(r);
    phasePlot.setBounds(r);
    xyPlot.setBounds(r);
    // gelişmiş sekme içerikleri
    auto pa = juce::Rectangle<int>(0, 0, tabs.getWidth(), tabs.getHeight() - 30).reduced(12, 10);
    {
        auto c = pa;
        auto col1 = c.removeFromLeft(c.getWidth() / 2).reduced(4, 0), col2 = c.reduced(4, 0);
        const int h = 32;
        search.setBounds(col1.removeFromTop(h)); learnHits.setBounds(col1.removeFromTop(h)); contRate.setBounds(col1.removeFromTop(h));
        trigHz.setBounds(col1.removeFromTop(h));
        winStart.setBounds(col2.removeFromTop(h)); winMs.setBounds(col2.removeFromTop(h)); scOffset.setBounds(col2.removeFromTop(h));
    }
    {
        auto c = pa;
        auto col1 = c.removeFromLeft(c.getWidth() / 2).reduced(4, 0), col2 = c.reduced(4, 0);
        crossover.setBounds(col1.removeFromTop(30)); fc.setBounds(col1.removeFromTop(32)); listen.setBounds(col1.removeFromTop(32));
        xoverNote.setBounds(col1.removeFromTop(40));
        bassMono.setBounds(col2.removeFromTop(30)); monoHz.setBounds(col2.removeFromTop(32)); monoWidth.setBounds(col2.removeFromTop(32));
    }
    {
        auto c = pa;
        auto left = c.removeFromLeft(c.getWidth() * 5 / 11).reduced(4, 0);
        duck.setBounds(left.removeFromTop(28)); duckDepth.setBounds(left.removeFromTop(28)); duckLen.setBounds(left.removeFromTop(28));
        duckSync.setBounds(left.removeFromTop(28)); duckBeats.setBounds(left.removeFromTop(28)); duckTarget.setBounds(left.removeFromTop(28));
        curve.setBounds(c.removeFromTop(c.getHeight() - 20).reduced(4, 0));
        duckNote.setBounds(c);
    }
    if (tour) { tour->setBounds(getLocalBounds()); }
}

void EditorContent::startTour(int step) {
    std::vector<TourOverlay::Step> s = {
        {nullptr, U("KB-Align'a hoş geldin"),
         U("Kick ile bası zaman ve faz olarak hizalar: ikisi birbirini yemez, birlikte vurur. Yalnız bası işler, kick'e dokunmaz. "
           "Bu kısa tur her bölümü gösterir — Esc ile kapatabilir, ? menüsünden yeniden açabilirsin.")},
        {&status, U("1 · Sidechain'i bağla"),
         U("Eklentiyi BAS kanalına koy. Ableton'da cihaz başlığındaki sidechain bölümünü aç ve kaynak olarak KICK kanalını seç. "
           "Bağlı değilse burada turuncu bir uyarı görürsün.")},
        {&scope, U("2 · Osiloskop"),
         U("Turuncu düz çizgi kick, mavi kesikli çizgi bas, sarı noktalı çizgi ikisinin toplamı. Görüntü her kick vuruşunda yenilenir. "
           "Mavi izi fareyle sağa-sola sürükleyerek bası elle kaydırabilirsin. Tıkla ve sağ tıkla: iki imleç arasındaki farkı ms ve derece olarak ölçer.")},
        {&vPhase, U("3 · Dalga · Faz · XY"),
         U("Faz sekmesi frekansa göre faz farkını gösterir: hizalı olunca noktalar 0° çizgisine toplanır. "
           "XY sekmesinde sağa yatık ince bir çizgi = kick ile bas aynı yönde.")},
        {&modeSeg, U("4 · Modu seç"),
         U("Elle: yalnız senin ayarın. Learn: birkaç vuruş dinler, en iyi ayarı sabitler. Her vuruş: her kick'te yeniden hesaplar. "
           "Nota başına: her bas notası için ayrı ayar öğrenir — notalar değişiyorsa en iyisi. Takip: yavaşça izler.")},
        {&learn, U("5 · Learn"),
         U("Parça çalarken bas. Sonraki 8 kick'i dinler (Gelişmiş > Analiz'den değiştirilebilir), kaydırma ve fazı kendisi bulup sabitler.")},
        {&readout, U("6 · Ne yapıldı?"),
         U("Uygulanan kaydırma (ms) ve faz (°) burada. 'Toplam alt bant' kick + basın hizalamadan önceye göre ne kadar güçlendiğini söyler; "
           "artı değer = birlikte vuruyorlar.")},
        {&predelay, U("7 · İnce ayar"),
         U("Pre-delay bası ms olarak kaydırır (eksi = öne). Faz düğmesi alt bandı döndürür, Ø polariteyi çevirir. "
           "Otomatik modlarda bunlar otomatiğin üstüne eklenir; çift tık sıfırlar.")},
        {&meters, U("8 · Ölçüm"),
         U("Korelasyon +1'e ne kadar yakınsa kick ile bas o kadar aynı yönde hareket ediyor. "
           "Güçlenme pozitifse toplam büyüyor, negatifse birbirini yiyor.")},
        {&compare, U("9 · Önce / Sonra"),
         U("Tıkla ve orijinal bası dinle; tekrar tıkla, hizalanmış hâle dön. Gecikme değişmez, karşılaştırma adil olur. "
           "Seviye farkı varsa Çıkış ile eşitle.")},
        {advanced ? static_cast<juce::Component*>(&tabs) : static_cast<juce::Component*>(&adviceMini), U("10 · Öneriler"),
         U("Eklenti kick'i ve bası dinler, üç şey söyler: kick'i birkaç cent/yarım ses akort etmek kazandırır mı (ölçerek; en fazla ±2), "
           "synth'in retrigger'ı açık mı, ducking gerekiyor mu. Kick'e hiçbir zaman dokunmaz; ducking ve mod önerisi tek tıkla uygulanır.")},
        {&viewAdv, U("11 · Gelişmiş görünüm"),
         U("Önerilerin ayrıntısı, crossover, Bass Mono, sidechain ducking eğrisi, nota tablosu, analiz penceresi ve osiloskop araçları burada.")},
        {&help, U("Hazırsın"),
         U("Bir kontrolün ne yaptığını merak edersen fareyle üzerine gel: alttaki çubuk anlatır. Turu ? menüsünden her zaman yeniden açabilirsin.")},
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
    m.addItem(1, U("Tanıtım turunu başlat"));
    m.addItem(2, U("Hakkında · lisans · kaynak kodu"));
    m.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(&help), [this](int r) {
        if (r == 1) startTour(0);
        if (r == 2)
            juce::AlertWindow::showMessageBoxAsync(juce::MessageBoxIconType::InfoIcon, "KB-Align " JucePlugin_VersionString,
                U("Kick ile bası zaman ve faz olarak hizalar.\n\n© 2026 Berkay Er · berkayeracademy.com\n"
                  "Ücretsizdir. GNU Affero Genel Kamu Lisansı v3 (ya da sonrası) ile dağıtılır: kaynak kodunu alma, değiştirme ve aynı "
                  "lisansla paylaşma hakkın var. Hiçbir garanti verilmez.\n\nKaynak kodu: Ders Paneli'ndeki indirme kartında.\n"
                  "JUCE (AGPLv3), VST3 SDK (MIT), CLAP (MIT), clap-juce-extensions (MIT) kullanır."));
    });
}

juce::File EditorContent::presetDir() const {
    auto d = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory).getChildFile("KB-Align").getChildFile("Presets");
    d.createDirectory();
    return d;
}

void EditorContent::savePreset() {
    chooser = std::make_unique<juce::FileChooser>(U("Preset kaydet"), presetDir(), "*.kbpreset");
    chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fc) {
        auto f = fc.getResult();
        if (f == juce::File()) return;
        if (auto xml = proc.snapshot().createXml()) xml->writeTo(f.withFileExtension("kbpreset"));
    });
}

void EditorContent::loadPreset() {
    chooser = std::make_unique<juce::FileChooser>(U("Preset aç"), presetDir(), "*.kbpreset");
    chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fc) {
        auto f = fc.getResult();
        if (!f.existsAsFile()) return;
        if (auto xml = juce::XmlDocument::parse(f)) proc.restore(juce::ValueTree::fromXml(*xml));
    });
}

// ───────────────────────────── KBAlignEditor
KBAlignEditor::KBAlignEditor(KBAlignProcessor& p) : juce::AudioProcessorEditor(p), content(p) {
    addAndMakeVisible(content);
    content.setBounds(0, 0, EditorContent::kW, EditorContent::kH);
    content.onScale = [this](float s) { applyScale(s); };
    setResizable(false, false);
    setSize(EditorContent::kW, EditorContent::kH);
    startTimer(700);  // ilk açılışta tanıtım turu (bir kez)
}

void KBAlignEditor::applyScale(float s) {
    scale = juce::jlimit(0.75f, 2.0f, s);
    content.setTransform(juce::AffineTransform::scale(scale));
    setSize(juce::roundToInt(EditorContent::kW * scale), juce::roundToInt(EditorContent::kH * scale));
}

} // namespace kb
