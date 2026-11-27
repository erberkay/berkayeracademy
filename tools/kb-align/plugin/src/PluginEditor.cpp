// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "PluginEditor.h"

namespace kb {

using namespace ui;

static void styleLabel(juce::Label& l, const juce::String& t) {
    l.setText(t, juce::dontSendNotification);
    l.setColour(juce::Label::textColourId, col::fgSoft);
}

static void setupSlider(juce::Slider& s, double lo, double hi, double v, double step, const juce::String& title) {
    s.setSliderStyle(juce::Slider::LinearHorizontal);
    s.setTextBoxStyle(juce::Slider::TextBoxRight, false, 56, 18);
    s.setRange(lo, hi, step);
    s.setValue(v, juce::dontSendNotification);
    s.setTitle(title);
}

EditorContent::EditorContent(KBAlignProcessor& p)
    : proc(p),
      mode(p.apvts, pid::mode, ""), autoTarget(p.apvts, pid::autoTarget, ""), latency(p.apvts, pid::latency, ""),
      bypass(p.apvts, pid::bypass, "Bypass"),
      scope(p), meters(p, scope),
      predelay(p.apvts, pid::predelay, "Pre-delay"), phase(p.apvts, pid::phase, juce::String::fromUTF8("Faz döndürme"), true),
      search(p.apvts, pid::search, juce::String::fromUTF8("Arama aralığı ±")), learnHits(p.apvts, pid::learnHits, juce::String::fromUTF8("Learn vuruşu")),
      winStart(p.apvts, pid::winStart, juce::String::fromUTF8("Pencere başı")), winMs(p.apvts, pid::winMs, juce::String::fromUTF8("Pencere uzunluğu")),
      scOffset(p.apvts, pid::scOffset, "Sidechain ofseti"), trigHz(p.apvts, pid::trigHz, "Tetik frekans"),
      contRate(p.apvts, pid::contRate, juce::String::fromUTF8("Takip hızı")),
      crossover(p.apvts, pid::crossover, juce::String::fromUTF8("Crossover (yalnız alt bant işlenir)")),
      bassMono(p.apvts, pid::bassMono, "Bass Mono"), duck(p.apvts, pid::duck, "Ducking"), duckSync(p.apvts, pid::duckSync, "Tempoya kilitli"),
      fc(p.apvts, pid::fc, "Crossover frekans"), monoHz(p.apvts, pid::monoHz, "Mono frekans"),
      monoWidth(p.apvts, pid::monoWidth, juce::String::fromUTF8("Alt bant genişlik")), duckDepth(p.apvts, pid::duckDepth, "Derinlik"),
      duckLen(p.apvts, pid::duckLen, "Uzunluk"), listen(p.apvts, pid::listen, "Dinleme"), duckBeats(p.apvts, pid::duckBeats, "Nota"),
      duckTarget(p.apvts, pid::duckTarget, "Hedef"), curve(p), notes(p) {
    setLookAndFeel(&look);
    title.setText("KB-Align", juce::dontSendNotification);
    title.setFont(juce::FontOptions(20.0f, juce::Font::bold));
    title.setColour(juce::Label::textColourId, col::accent);
    addAndMakeVisible(title);
    for (juce::Component* c : {(juce::Component*) &mode, (juce::Component*) &autoTarget, (juce::Component*) &latency,
                               (juce::Component*) &learn, (juce::Component*) &ab, (juce::Component*) &copyAB, (juce::Component*) &undoB,
                               (juce::Component*) &redoB, (juce::Component*) &save, (juce::Component*) &load, (juce::Component*) &factory,
                               (juce::Component*) &scale, (juce::Component*) &bypass, (juce::Component*) &scWarn})
        addAndMakeVisible(c);
    mode.box.setTooltip(juce::String::fromUTF8("Elle: yalnız pre-delay/faz · Learn: tek tuşla öğren · Her vuruşta · Nota başına · Sürekli takip"));
    learn.setTooltip(juce::String::fromUTF8("Sonraki N kick'i dinler, birleşik en iyi (d, θ)'yı bulur ve sabitler"));
    learn.onClick = [this] {
        if (auto* m = proc.apvts.getParameter(pid::mode)) m->setValueNotifyingHost(m->convertTo0to1((float) Mode::Learn));
        proc.startLearn();
    };
    ab.setClickingTogglesState(false);
    ab.onClick = [this] { proc.toggleAB(); ab.setButtonText(proc.slotBActive ? "B" : "A"); };
    ab.setButtonText("A");
    ab.setTooltip(juce::String::fromUTF8("A/B karşılaştırma: iki ayar durumu arasında geç"));
    copyAB.onClick = [this] { proc.copyAtoB(); };
    copyAB.setTooltip(juce::String::fromUTF8("Geçerli durumu öbür yuvaya kopyala"));
    undoB.onClick = [this] { proc.undo.undo(); };
    redoB.onClick = [this] { proc.undo.redo(); };
    about.setTooltip(juce::String::fromUTF8("Hakkında · lisans · kaynak kodu"));
    about.setTitle(juce::String::fromUTF8("Hakkında"));
    about.onClick = [] {
        juce::AlertWindow::showMessageBoxAsync(juce::MessageBoxIconType::InfoIcon, "KB-Align " JucePlugin_VersionString,
            juce::String::fromUTF8(
                "Kick ile bası zaman ve faz olarak hizalar.\n\n"
                "© 2026 Berkay Er · berkayeracademy.com\n"
                "Ücretsizdir. GNU Affero Genel Kamu Lisansı v3 (ya da sonrası) ile dağıtılır: "
                "kaynak kodunu alma, değiştirme ve aynı lisansla paylaşma hakkın var. Hiçbir garanti verilmez.\n\n"
                "Kaynak kodu: Ders Paneli'ndeki indirme kartında (KB-Align kaynak kodu .zip).\n"
                "JUCE (AGPLv3), VST3 SDK (MIT), CLAP (MIT), clap-juce-extensions (MIT) kullanır."));
    };
    addAndMakeVisible(about);
    save.onClick = [this] { savePreset(); };
    load.onClick = [this] { loadPreset(); };
    for (int i = 0; i < proc.getNumPrograms(); ++i) factory.addItem(proc.getProgramName(i), i + 1);
    factory.setTextWhenNothingSelected(juce::String::fromUTF8("Fabrika presetleri"));
    factory.setTitle("Fabrika presetleri");
    factory.onChange = [this] { if (factory.getSelectedId() > 0) proc.setCurrentProgram(factory.getSelectedId() - 1); };
    for (int s : {75, 100, 125, 150, 175, 200}) scale.addItem(juce::String(s) + " %", s);
    scale.setSelectedId(100, juce::dontSendNotification);
    scale.setTitle(juce::String::fromUTF8("Arayüz ölçeği"));
    scale.onChange = [this] { if (onScale) onScale(scale.getSelectedId() / 100.0f); };
    scWarn.setColour(juce::Label::textColourId, col::warn);
    scWarn.setFont(juce::FontOptions(12.5f));

    addAndMakeVisible(scope);
    addAndMakeVisible(meters);
    scope.onFrame = [this] { meters.update(); };
    trig.addItemList({juce::String::fromUTF8("Kick'e kilitli"), "Tempo", "Serbest"}, 1);
    trig.setSelectedId(1, juce::dontSendNotification);
    trig.setTitle("Tetik");
    trig.onChange = [this] { scope.trigger = (Trigger) (trig.getSelectedId() - 1); tempoBeats.setEnabled(scope.trigger == Trigger::Tempo); };
    tempoBeats.addItemList({"1/16", "1/8", "1/4", "1/2", juce::String::fromUTF8("1 ölçü"), juce::String::fromUTF8("2 ölçü"), juce::String::fromUTF8("4 ölçü")}, 1);
    tempoBeats.setSelectedId(3, juce::dontSendNotification);
    tempoBeats.setTitle("Tempo penceresi");
    tempoBeats.onChange = [this] {
        static constexpr double b[] = {0.25, 0.5, 1, 2, 4, 8, 16};
        scope.tempoBeats = b[tempoBeats.getSelectedId() - 1];
    };
    tempoBeats.setEnabled(false);
    setupSlider(zoom, 1, 500, 120, 0.1, juce::String::fromUTF8("Zaman ekseni (ms)"));
    zoom.setSkewFactorFromMidPoint(60);
    zoom.onValueChange = [this] { scope.windowMs = zoom.getValue(); };
    setupSlider(pre, 0, 50, 10, 0.1, juce::String::fromUTF8("Ön-tetik (ms)"));
    pre.onValueChange = [this] { scope.preMs = pre.getValue(); };
    setupSlider(viewHz, 40, 400, 200, 1, juce::String::fromUTF8("Görüntü filtresi (Hz)"));
    viewHz.onValueChange = [this] { scope.viewHz = viewHz.getValue(); };
    setupSlider(avg, 1, 16, 1, 1, juce::String::fromUTF8("Ortalama (vuruş)"));
    avg.onValueChange = [this] { scope.average = (int) avg.getValue(); };
    styleLabel(zoomL, "Zaman"); styleLabel(preL, juce::String::fromUTF8("Ön-tetik")); styleLabel(viewL, "Filtre"); styleLabel(avgL, "Ortalama");
    lowView.setToggleState(true, juce::dontSendNotification);
    lowView.onClick = [this] { scope.lowView = lowView.getToggleState(); };
    persist.onClick = [this] { scope.persistence = persist.getToggleState(); };
    freeze.onClick = [this] { scope.frozen = freeze.getToggleState(); };
    for (auto* t : {&tKick, &tBass, &tSum}) t->setToggleState(true, juce::dontSendNotification);
    tKick.onClick = [this] { scope.showKick = tKick.getToggleState(); };
    tBass.onClick = [this] { scope.showBass = tBass.getToggleState(); };
    tSum.onClick = [this] { scope.showSum = tSum.getToggleState(); };
    tBefore.onClick = [this] { scope.showBefore = tBefore.getToggleState(); };
    for (juce::Component* c : {(juce::Component*) &trig, (juce::Component*) &tempoBeats, (juce::Component*) &zoom, (juce::Component*) &pre,
                               (juce::Component*) &viewHz, (juce::Component*) &avg, (juce::Component*) &lowView, (juce::Component*) &persist,
                               (juce::Component*) &freeze, (juce::Component*) &tKick, (juce::Component*) &tBass, (juce::Component*) &tSum,
                               (juce::Component*) &tBefore, (juce::Component*) &zoomL, (juce::Component*) &preL, (juce::Component*) &viewL,
                               (juce::Component*) &avgL})
        addAndMakeVisible(c);

    for (juce::Component* c : {(juce::Component*) &predelay, (juce::Component*) &phase, (juce::Component*) &search, (juce::Component*) &learnHits,
                               (juce::Component*) &winStart, (juce::Component*) &winMs, (juce::Component*) &scOffset, (juce::Component*) &trigHz,
                               (juce::Component*) &contRate})
        pAlign.addAndMakeVisible(c);
    for (juce::Component* c : {(juce::Component*) &crossover, (juce::Component*) &fc, (juce::Component*) &bassMono, (juce::Component*) &monoHz,
                               (juce::Component*) &monoWidth, (juce::Component*) &listen, (juce::Component*) &xoverNote})
        pXover.addAndMakeVisible(c);
    for (juce::Component* c : {(juce::Component*) &duck, (juce::Component*) &duckDepth, (juce::Component*) &duckLen, (juce::Component*) &duckSync,
                               (juce::Component*) &duckBeats, (juce::Component*) &duckTarget, (juce::Component*) &curve, (juce::Component*) &duckNote})
        pDuck.addAndMakeVisible(c);
    styleLabel(xoverNote, juce::String::fromUTF8("Kick + bas önizlemesi kick'i ikinci kez çalar: yalnız kontrol için, mikste kapalı tut."));
    styleLabel(duckNote, juce::String::fromUTF8("VARSAYIM: varsayılan eğri yer tutucu — kendi çizdiğin eğri varsayılan preset olacak."));
    scOffset.slider.setTooltip(juce::String::fromUTF8("Host sidechain'i geç veriyorsa (+) bu kadar telafi edilir. Ableton testinde ölçülür."));
    trigHz.slider.setTooltip(juce::String::fromUTF8("Onset tespiti bu frekansın altını dinler (davul bus'ında kick'i ayırmak için)"));
    tabs.addTab("Hizalama", col::panel, &pAlign, false);
    tabs.addTab(juce::String::fromUTF8("Crossover · Mono · Dinleme"), col::panel, &pXover, false);
    tabs.addTab("Ducking", col::panel, &pDuck, false);
    tabs.addTab("Nota tablosu", col::panel, &notes, false);
    tabs.setOutline(0);
    tabs.setTabBarDepth(30);
    addAndMakeVisible(tabs);
    startTimerHz(15);
}

EditorContent::~EditorContent() { setLookAndFeel(nullptr); }

void EditorContent::timerCallback() {
    proc.pollLearn();
    scWarn.setText(proc.sidechainConnected() ? juce::String()
                                             : juce::String::fromUTF8("Sidechain yok — kick kanalını sidechain girişine bağla"),
                   juce::dontSendNotification);
    learn.setButtonText(proc.align.learnInProgress()
                            ? juce::String::fromUTF8("Dinliyor ") + juce::String(proc.align.learnCollected.load()) + "/" +
                                  juce::String((int) proc.apvts.getRawParameterValue(pid::learnHits)->load())
                            : juce::String("Learn"));
    undoB.setEnabled(proc.undo.canUndo());
    redoB.setEnabled(proc.undo.canRedo());
    static int tick = 0;
    if (++tick % 8 == 0) proc.undo.beginNewTransaction();
}

void EditorContent::paint(juce::Graphics& g) { g.fillAll(col::bg); }

void EditorContent::resized() {
    auto r = getLocalBounds().reduced(12);
    auto top = r.removeFromTop(34);
    title.setBounds(top.removeFromLeft(110));
    mode.setBounds(top.removeFromLeft(150).reduced(2));
    learn.setBounds(top.removeFromLeft(110).reduced(2));
    autoTarget.setBounds(top.removeFromLeft(140).reduced(2));
    latency.setBounds(top.removeFromLeft(150).reduced(2));
    bypass.setBounds(top.removeFromRight(96).reduced(2));
    about.setBounds(top.removeFromRight(36).reduced(2));
    scale.setBounds(top.removeFromRight(80).reduced(2));
    redoB.setBounds(top.removeFromRight(64).reduced(2));
    undoB.setBounds(top.removeFromRight(56).reduced(2));
    copyAB.setBounds(top.removeFromRight(52).reduced(2));
    ab.setBounds(top.removeFromRight(44).reduced(2));
    load.setBounds(top.removeFromRight(48).reduced(2));
    save.setBounds(top.removeFromRight(64).reduced(2));
    factory.setBounds(top.reduced(2));
    scWarn.setBounds(r.removeFromTop(16));
    r.removeFromTop(4);

    auto bottom = r.removeFromBottom(250);
    auto right = r.removeFromRight(300);
    meters.setBounds(right.reduced(4, 0));
    auto tool = r.removeFromBottom(58);
    scope.setBounds(r.reduced(0, 2));
    auto t1 = tool.removeFromTop(29);
    trig.setBounds(t1.removeFromLeft(130).reduced(2));
    tempoBeats.setBounds(t1.removeFromLeft(80).reduced(2));
    zoomL.setBounds(t1.removeFromLeft(44)); zoom.setBounds(t1.removeFromLeft(170).reduced(2));
    preL.setBounds(t1.removeFromLeft(54)); pre.setBounds(t1.removeFromLeft(150).reduced(2));
    avgL.setBounds(t1.removeFromLeft(62)); avg.setBounds(t1.reduced(2));
    auto t2 = tool;
    lowView.setBounds(t2.removeFromLeft(170));
    viewL.setBounds(t2.removeFromLeft(40)); viewHz.setBounds(t2.removeFromLeft(130).reduced(2));
    persist.setBounds(t2.removeFromLeft(102)); freeze.setBounds(t2.removeFromLeft(86));
    tKick.setBounds(t2.removeFromLeft(76)); tBass.setBounds(t2.removeFromLeft(68)); tSum.setBounds(t2.removeFromLeft(92)); tBefore.setBounds(t2);

    tabs.setBounds(bottom.withTrimmedTop(6));
    auto pa = juce::Rectangle<int>(0, 0, bottom.getWidth(), bottom.getHeight() - 36).reduced(10);
    {
        auto c = pa;
        phase.setBounds(c.removeFromRight(130));
        auto col1 = c.removeFromLeft(c.getWidth() / 2).reduced(4, 0), col2 = c.reduced(4, 0);
        const int h = 30;
        predelay.setBounds(col1.removeFromTop(h)); search.setBounds(col1.removeFromTop(h)); learnHits.setBounds(col1.removeFromTop(h));
        contRate.setBounds(col1.removeFromTop(h)); trigHz.setBounds(col1.removeFromTop(h));
        winStart.setBounds(col2.removeFromTop(h)); winMs.setBounds(col2.removeFromTop(h)); scOffset.setBounds(col2.removeFromTop(h));
    }
    {
        auto c = pa;
        auto col1 = c.removeFromLeft(c.getWidth() / 2).reduced(4, 0), col2 = c.reduced(4, 0);
        crossover.setBounds(col1.removeFromTop(30)); fc.setBounds(col1.removeFromTop(30)); listen.setBounds(col1.removeFromTop(30));
        xoverNote.setBounds(col1.removeFromTop(40));
        bassMono.setBounds(col2.removeFromTop(30)); monoHz.setBounds(col2.removeFromTop(30)); monoWidth.setBounds(col2.removeFromTop(30));
    }
    {
        auto c = pa;
        auto left = c.removeFromLeft(c.getWidth() * 5 / 11).reduced(4, 0);
        duck.setBounds(left.removeFromTop(28)); duckDepth.setBounds(left.removeFromTop(28)); duckLen.setBounds(left.removeFromTop(28));
        duckSync.setBounds(left.removeFromTop(28)); duckBeats.setBounds(left.removeFromTop(28)); duckTarget.setBounds(left.removeFromTop(28));
        curve.setBounds(c.removeFromTop(c.getHeight() - 20).reduced(4, 0));
        duckNote.setBounds(c);
    }
}

juce::File EditorContent::presetDir() const {
    auto d = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory).getChildFile("KB-Align").getChildFile("Presets");
    d.createDirectory();
    return d;
}

void EditorContent::savePreset() {
    chooser = std::make_unique<juce::FileChooser>(juce::String::fromUTF8("Preset kaydet"), presetDir(), "*.kbpreset");
    chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fc) {
        auto f = fc.getResult();
        if (f == juce::File()) return;
        if (auto xml = proc.snapshot().createXml()) xml->writeTo(f.withFileExtension("kbpreset"));
    });
}

void EditorContent::loadPreset() {
    chooser = std::make_unique<juce::FileChooser>(juce::String::fromUTF8("Preset aç"), presetDir(), "*.kbpreset");
    chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fc) {
        auto f = fc.getResult();
        if (!f.existsAsFile()) return;
        if (auto xml = juce::XmlDocument::parse(f)) proc.restore(juce::ValueTree::fromXml(*xml));
    });
}

KBAlignEditor::KBAlignEditor(KBAlignProcessor& p) : juce::AudioProcessorEditor(p), content(p) {
    addAndMakeVisible(content);
    content.setBounds(0, 0, kW, kH);
    content.onScale = [this](float s) { applyScale(s); };
    setResizable(false, false);
    setSize(kW, kH);
}

void KBAlignEditor::applyScale(float s) {
    scale = juce::jlimit(0.75f, 2.0f, s);
    content.setTransform(juce::AffineTransform::scale(scale));
    setSize(juce::roundToInt(kW * scale), juce::roundToInt(kH * scale));
}

void KBAlignEditor::resized() {}

} // namespace kb
