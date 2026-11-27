// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
#include "PluginEditor.h"

namespace pf {

using namespace ui;

// ───────────────────────────── Card
void ui::Card::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(r, 12);
    g.setColour(col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 12, 1);
    if (title.isNotEmpty()) {
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(11.0f, juce::Font::bold).withKerningFactor(0.08f));
        g.drawText(upper(title), 14, 8, getWidth() - 28, 16, juce::Justification::centredLeft);
    }
}

// ───────────────────────────── NodeStrip
ui::NodeStrip::NodeStrip(PhaseForgeProcessor& p)
    : proc(p),
      freq(p.apvts, id::node(0, "freq"), L("Frequency", "Frekans")),
      range(p.apvts, id::node(0, "range"), L("Reduction", "Azaltma"), col::reduction),
      thr(p.apvts, id::node(0, "thr"), L("Threshold", "Eşik")),
      q(p.apvts, id::node(0, "q"), "Q"),
      att(p.apvts, id::node(0, "att"), L("Attack", "Atak")),
      rel(p.apvts, id::node(0, "rel"), L("Release", "Bırakma")),
      ch(p.apvts, id::node(0, "ch"), {"Stereo", "Mid", "Side"}),
      solo(p.apvts, id::node(0, "solo"), "Solo", col::warn),
      byp(p.apvts, id::node(0, "byp"), "Bypass", col::fgFaint) {
    freq.setTooltip(L("Centre frequency of the node.", "Düğümün merkez frekansı."));
    range.setTooltip(L("Maximum cut when the trigger is well above the threshold (up to −18 dB).",
                       "Tetik eşiğin epey üstündeyken uygulanan en fazla kesme (en çok −18 dB)."));
    thr.setTooltip(L("Level the trigger (sidechain band, or the main band without sidechain) must exceed before the node starts to cut.",
                     "Düğümün kesmeye başlaması için tetiğin (sidechain bandı; sidechain yoksa ana bant) geçmesi gereken seviye."));
    q.setTooltip(L("Width of the node: higher = narrower.", "Düğümün genişliği: yüksek = dar."));
    att.setTooltip(L("How fast the cut engages.", "Kesmenin ne kadar hızlı devreye girdiği."));
    rel.setTooltip(L("How fast the cut recovers.", "Kesmenin ne kadar hızlı geri bıraktığı."));
    ch.setTooltip(L("Process the full stereo signal, only the Mid (centre) or only the Side (width).",
                    "Tüm stereo sinyali, yalnız Mid'i (orta) ya da yalnız Side'ı (genişlik) işler."));
    solo.setTooltip(L("Hear only this node's band.", "Yalnız bu düğümün bandını dinle."));
    byp.setTooltip(L("Bypass this node.", "Bu düğümü devre dışı bırak."));
    del.setButtonText(L("Delete", "Sil"));
    del.onClick = [this] { if (onDelete) onDelete(); };
    listen.setButtonText(L("Hold: hear removed", "Basılı tut: kesileni dinle"));
    listen.setTooltip(L("While held, you hear only what this node removes (delta).", "Basılı tutarken yalnız bu düğümün kestiği sesi duyarsın (delta)."));
    listen.onStateChange = [this] { proc.setDeltaAudition(listen.isDown() ? current : -1); };
    for (auto* c : std::initializer_list<juce::Component*>{&freq, &range, &thr, &q, &att, &rel, &ch, &solo, &byp, &del, &listen}) addChildComponent(c);
}

void ui::NodeStrip::setNode(int i) {
    if (i >= 0 && proc.apvts.getRawParameterValue(id::node(i, "on"))->load() < 0.5f) i = -1;
    current = i;
    const bool show = i >= 0;
    if (show) {
        freq.rebind(proc.apvts, id::node(i, "freq"));
        range.rebind(proc.apvts, id::node(i, "range"));
        thr.rebind(proc.apvts, id::node(i, "thr"));
        q.rebind(proc.apvts, id::node(i, "q"));
        att.rebind(proc.apvts, id::node(i, "att"));
        rel.rebind(proc.apvts, id::node(i, "rel"));
        ch.rebind(proc.apvts, id::node(i, "ch"));
        solo.rebind(proc.apvts, id::node(i, "solo"));
        byp.rebind(proc.apvts, id::node(i, "byp"));
    }
    for (auto* c : std::initializer_list<juce::Component*>{&freq, &range, &thr, &q, &att, &rel, &ch, &solo, &byp, &del, &listen}) c->setVisible(show);
    repaint();
}

void ui::NodeStrip::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panelHi);
    g.fillRoundedRectangle(r, 12);
    g.setColour(col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 12, 1);
    auto head = getLocalBounds().reduced(16, 0).removeFromLeft(150);
    if (current < 0) {
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(11.0f, juce::Font::bold).withKerningFactor(0.08f));
        g.drawText(L("DYNAMIC EQ NODES", "DİNAMİK EQ DÜĞÜMLERİ"), head.withHeight(40), juce::Justification::centredLeft);
        g.setColour(col::fgSoft);
        g.setFont(juce::FontOptions(14.0f));
        g.drawFittedText(L("Press RESOLVE CONFLICTS to place nodes automatically, or double-click the analyzer to add one. "
                           "Click a node to edit it here; drag it to move; Delete removes it.",
                           "Düğümleri otomatik yerleştirmek için ÇAKIŞMALARI ÇÖZ'e bas ya da eklemek için analizöre çift tıkla. "
                           "Düzenlemek için düğüme tıkla; taşımak için sürükle; Delete siler."),
                         getLocalBounds().reduced(16, 30).withTrimmedTop(6), juce::Justification::centredLeft, 2);
        return;
    }
    g.setColour(col::accent);
    g.fillEllipse((float) head.getX(), 24, 30, 30);
    g.setColour(juce::Colours::white);
    g.setFont(juce::FontOptions(15.0f, juce::Font::bold));
    g.drawText(juce::String(current + 1), head.getX(), 24, 30, 30, juce::Justification::centred);
    g.setColour(col::fg);
    g.drawText(L("NODE ", "DÜĞÜM ") + juce::String(current + 1), head.getX() + 40, 24, 110, 30, juce::Justification::centredLeft);
    const float gr = proc.nodeReductionDb(current);
    g.setColour(col::reduction);
    g.setFont(juce::FontOptions(12.0f));
    g.drawText(L("now ", "şimdi ") + fmtNum(-gr, 1) + " dB", head.getX(), 62, 150, 18, juce::Justification::centredLeft);
}

void ui::NodeStrip::resized() {
    auto r = getLocalBounds().reduced(16, 10);
    r.removeFromLeft(160);
    auto right = r.removeFromRight(220);
    for (auto* k : {&freq, &range, &thr, &q, &att, &rel}) k->setBounds(r.removeFromLeft(96));
    r.removeFromLeft(12);
    auto col1 = r.withSizeKeepingCentre(r.getWidth(), 76);
    ch.setBounds(col1.removeFromTop(32));
    col1.removeFromTop(10);
    solo.setBounds(col1.removeFromLeft(col1.getWidth() / 2).withTrimmedRight(4).withHeight(32));
    byp.setBounds(col1.withTrimmedLeft(4).withHeight(32));
    auto c2 = right.withSizeKeepingCentre(right.getWidth() - 12, 76);
    listen.setBounds(c2.removeFromTop(32));
    c2.removeFromTop(10);
    del.setBounds(c2.withHeight(32));
}

// ───────────────────────────── EditorContent
EditorContent::EditorContent(PhaseForgeProcessor& p)
    : proc(p),
      bypass(p.apvts, id::bypass, "BYPASS", col::bad),
      display(p),
      phase(p),
      nodeStrip(p),
      cDyn(L("Dynamics", "Dinamik")),
      cProc(L("Processing", "İşleme")),
      cGain(L("Gain", "Kazanç")),
      cLoud(L("Loudness (LUFS)", "Ses yüksekliği (LUFS)")),
      sensitivity(p.apvts, id::sensitivity, L("Sensitivity", "Hassasiyet")),
      mix(p.apvts, id::mix, "Mix"),
      fixMain(p.apvts, id::fixMain, L("Main fader", "Ana fader")),
      fixSc(p.apvts, id::fixSc, L("SC fader", "SC fader")),
      inGain(p.apvts, id::inGain, L("Input", "Giriş")),
      outGain(p.apvts, id::outGain, L("Output", "Çıkış")),
      dynMode(p.apvts, id::dynMode, {"Sidechain", L("Difference", "Fark")}),
      filterMode(p.apvts, id::filterMode, {L("Zero Latency", "Sıfır gecikme"), L("Linear Phase", "Doğrusal faz")}),
      scOn(p.apvts, id::scOn, L("SIDECHAIN", "SIDECHAIN")),
      delta(p.apvts, id::delta, "DELTA", col::warn),
      mIn(L("INPUT", "GİRİŞ")), mOut(L("OUTPUT", "ÇIKIŞ")), mSc("SIDECHAIN") {
    setLookAndFeel(&look.get());
    setWantsKeyboardFocus(true);
    for (auto* c : std::initializer_list<juce::Component*>{&cDyn, &cProc, &cGain, &cLoud})
        addAndMakeVisible(c);
    for (auto* c : std::initializer_list<juce::Component*>{&presets, &savePre, &slotA, &slotB, &copyAB, &undoB, &redoB, &langB, &menuB, &bypass,
                                                           &inTop, &outTop, &display, &phase, &nodeStrip, &sensitivity, &mix, &fixMain, &fixSc,
                                                           &inGain, &outGain, &resolve, &resolveStatus, &latency, &fixNote, &dynMode, &filterMode,
                                                           &scOn, &delta, &mIn, &mOut, &mSc, &levelMatch})
        addAndMakeVisible(c);
    inTop.compact = outTop.compact = true;

    // ── top bar
    presets.setTextWhenNothingSelected(L("Presets", "Presetler"));
    presets.setTooltip(L("Factory and user presets", "Fabrika ve kullanıcı presetleri"));
    presets.onChange = [this] { presetChosen(); };
    fillPresets();
    savePre.setButtonText(L("Save", "Kaydet"));
    savePre.setTooltip(L("Save the current settings as a user preset", "Mevcut ayarları kullanıcı preseti olarak kaydet"));
    savePre.onClick = [this] { savePreset(); };
    slotA.setButtonText("A");
    slotB.setButtonText("B");
    for (auto* b : {&slotA, &slotB}) b->setClickingTogglesState(false);
    slotA.setTooltip(L("A/B: two complete settings to compare", "A/B: karşılaştırmak için iki ayrı ayar"));
    slotB.setTooltip(slotA.getTooltip());
    slotA.onClick = [this] { if (proc.isB()) proc.toggleAB(); };
    slotB.onClick = [this] { if (!proc.isB()) proc.toggleAB(); };
    copyAB.setButtonText(juce::String::fromUTF8("Copy →"));
    copyAB.setTooltip(L("Copy the active slot to the other one", "Etkin slotu diğerine kopyala"));
    copyAB.onClick = [this] { proc.copyActiveToInactive(); };
    undoB.setButtonText(L("Undo", "Geri al"));
    redoB.setButtonText(L("Redo", "Yinele"));
    undoB.onClick = [this] { proc.undo.undo(); };
    redoB.onClick = [this] { proc.undo.redo(); };
    bypass.setTooltip(L("Bypass the whole plugin (latency-compensated dry signal)", "Tüm eklentiyi devre dışı bırak (gecikmesi denkleştirilmiş kuru sinyal)"));
    langB.setButtonText(isTurkish() ? "TR" : "EN");
    langB.setTooltip(L("Language: English / Türkçe", "Dil: English / Türkçe"));
    langB.onClick = [this] {
        setTurkish(!isTurkish());
        userSettings().setValue("lang", isTurkish() ? "tr" : "en");
        userSettings().saveIfNeeded();
        if (onLanguage) onLanguage();
    };
    menuB.setButtonText(juce::String::fromUTF8("···"));
    menuB.setTooltip(L("Settings", "Ayarlar"));
    menuB.onClick = [this] { settingsMenu(); };

    // ── centre
    display.onSelectionChanged = [this](int i) {
        nodeStrip.setNode(i);
        proc.setUiProperty("selectedNode", i);
    };
    nodeStrip.onDelete = [this] {
        const int i = nodeStrip.node();
        if (i < 0) return;
        proc.undo.beginNewTransaction("Delete node");
        for (auto* w : {"on", "solo"})
            if (auto* prm = proc.apvts.getParameter(id::node(i, w))) prm->setValueNotifyingHost(0.0f);
        display.selectNode(-1);
    };
    display.selectNode((int) proc.getUiProperty("selectedNode", -1));

    // ── bottom
    sensitivity.setTooltip(L("Conflict sensitivity: how much louder the sidechain must be than the main signal in a band before it counts as a conflict "
                             "(0 dB = any overlap, 9 dB = only clear masking). Also sets how deep RESOLVE cuts.",
                             "Çakışma hassasiyeti: bir bantta sidechain'in ana sinyalden ne kadar yüksek olması gerektiği (0 dB = her örtüşme, "
                             "9 dB = yalnız belirgin maskeleme). ÇAKIŞMALARI ÇÖZ'ün kesme derinliğini de belirler."));
    resolve.setButtonText(L("RESOLVE CONFLICTS", "ÇAKIŞMALARI ÇÖZ"));
    resolve.setColour(juce::TextButton::buttonColourId, col::accent);
    resolve.setTooltip(L("Listens for 3 s, then places up to 8 conservative nodes on the strongest conflicts (replaces nodes 1–8). Undo restores the previous ones.",
                         "3 sn dinler, sonra en güçlü çakışmalara en çok 8 ölçülü düğüm yerleştirir (1–8. düğümlerin yerine). Geri al öncekileri getirir."));
    resolve.onClick = [this] {
        if (resolveWaiting) { proc.cancelResolveConflicts(); return; }
        proc.undo.beginNewTransaction("Resolve conflicts");
        proc.requestResolveConflicts();
    };
    for (auto* l : {&resolveStatus, &latency, &fixNote}) {
        l->setFont(juce::FontOptions(12.0f));
        l->setColour(juce::Label::textColourId, col::fgSoft);
        l->setMinimumHorizontalScale(0.75f);
    }
    fixNote.setText(L("GAIN STAGE FIX · your mixer fader values", "KAZANÇ DÜZELTME · mikser fader değerlerin"), juce::dontSendNotification);
    fixNote.setJustificationType(juce::Justification::centred);
    dynMode.setTooltip(L("Sidechain: nodes cut when the sidechain band is loud. Difference: they cut only when the sidechain is louder than the main signal in the band.",
                         "Sidechain: sidechain bandı yüksekken düğümler keser. Fark: yalnız bantta sidechain ana sinyalden yüksekken keser."));
    scOn.setTooltip(L("Off: nodes are triggered by the main signal itself (self-keyed dynamic EQ).",
                      "Kapalı: düğümleri ana sinyalin kendisi tetikler (kendinden tetikli dinamik EQ)."));
    mix.setTooltip(L("Amount of the dynamic EQ (the phase stage is not affected).", "Dinamik EQ miktarı (faz katmanını etkilemez)."));
    delta.setTooltip(L("Hear only what the dynamic EQ removes.", "Yalnız dinamik EQ'nun kestiği sesi dinle."));
    filterMode.setTooltip(L("Zero Latency: minimum-phase IIR, no delay. Linear Phase: FIR, no phase shift outside the processed bands, adds latency.",
                            "Sıfır gecikme: minimum faz IIR, gecikme yok. Doğrusal faz: FIR, işlenen bantların dışında faz kayması yok, gecikme ekler."));
    fixMain.setTooltip(L("Gain Stage Fix: the fader value of the track this plugin is on. Lets conflict detection compare the levels you actually hear.",
                         "Kazanç düzeltme: bu eklentinin olduğu kanalın fader değeri. Çakışma tespiti duyduğun seviyeleri karşılaştırır."));
    fixSc.setTooltip(L("Gain Stage Fix: the fader value of the sidechain (e.g. kick) track.", "Kazanç düzeltme: sidechain (ör. kick) kanalının fader değeri."));
    inGain.setTooltip(L("Input gain (before analysis and processing)", "Giriş kazancı (analiz ve işlemeden önce)"));
    outGain.setTooltip(L("Output gain", "Çıkış kazancı"));
    mIn.setTooltip(L("Input: sample peak and BS.1770 momentary / short-term / integrated loudness. Click to reset integrated.",
                     "Giriş: örnek tepe ve BS.1770 anlık / kısa süreli / bütünleşik ses yüksekliği. Bütünleşiği sıfırlamak için tıkla."));
    mOut.setTooltip(mIn.getTooltip());
    mSc.setTooltip(mIn.getTooltip());
    for (auto* m : {&mIn, &mOut, &mSc}) m->addMouseListener(this, false);
    levelMatch.setTooltip(L("Short-term loudness of the main signal vs the sidechain, after the Gain Stage Fix faders.",
                            "Kazanç düzeltme fader'larından sonra ana sinyal ile sidechain'in kısa süreli ses yüksekliği farkı."));
    timerCallback();
    startTimerHz(20);
}

EditorContent::~EditorContent() {
    stopTimer();
    for (auto* m : {&mIn, &mOut, &mSc}) m->removeMouseListener(this);
    setLookAndFeel(nullptr);
}

void EditorContent::fillPresets() {
    presets.clear(juce::dontSendNotification);
    const auto names = PhaseForgeProcessor::factoryPresetNames();
    presets.addSectionHeading(L("Factory", "Fabrika"));
    for (int i = 0; i < names.size(); ++i) presets.addItem(names[i], i + 1);
    userFiles = PhaseForgeProcessor::userPresetDirectory().findChildFiles(juce::File::findFiles, false, "*.pfpreset");
    userFiles.sort();
    if (!userFiles.isEmpty()) {
        presets.addSeparator();
        presets.addSectionHeading(L("User", "Kullanıcı"));
        for (int i = 0; i < userFiles.size(); ++i) presets.addItem(userFiles[i].getFileNameWithoutExtension(), 1000 + i);
    }
    presets.addSeparator();
    presets.addItem(L("Load from file…", "Dosyadan yükle…"), 9001);
    presets.addItem(L("Show preset folder", "Preset klasörünü göster"), 9002);
}

void EditorContent::presetChosen() {
    const int idv = presets.getSelectedId();
    if (idv <= 0) return;
    if (idv < 1000) {
        proc.undo.beginNewTransaction("Preset");
        proc.setCurrentProgram(idv - 1);
    } else if (idv < 9000) {
        const int i = idv - 1000;
        if (juce::isPositiveAndBelow(i, userFiles.size())) { proc.undo.beginNewTransaction("Preset"); proc.loadPresetFile(userFiles[i]); }
    } else if (idv == 9001) {
        chooser = std::make_unique<juce::FileChooser>(L("Load preset", "Preset yükle"), PhaseForgeProcessor::userPresetDirectory(), "*.pfpreset");
        chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles,
                             [sp = juce::Component::SafePointer<EditorContent>(this)](const juce::FileChooser& fc) {
                                 if (sp && fc.getResult().existsAsFile()) sp->proc.loadPresetFile(fc.getResult());
                             });
        presets.setSelectedId(0, juce::dontSendNotification);
    } else if (idv == 9002) {
        PhaseForgeProcessor::userPresetDirectory().createDirectory();
        PhaseForgeProcessor::userPresetDirectory().startAsProcess();
        presets.setSelectedId(0, juce::dontSendNotification);
    }
    display.selectNode(-1);
}

void EditorContent::savePreset() {
    auto dir = PhaseForgeProcessor::userPresetDirectory();
    dir.createDirectory();
    chooser = std::make_unique<juce::FileChooser>(L("Save preset", "Preseti kaydet"), dir.getChildFile("My preset.pfpreset"), "*.pfpreset");
    chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::warnAboutOverwriting,
                         [sp = juce::Component::SafePointer<EditorContent>(this)](const juce::FileChooser& fc) {
                             if (!sp) return;
                             auto f = fc.getResult();
                             if (f == juce::File()) return;
                             f = f.withFileExtension("pfpreset");
                             if (sp->proc.savePresetFile(f, f.getFileNameWithoutExtension())) sp->fillPresets();
                         });
}

void EditorContent::settingsMenu() {
    juce::PopupMenu m, sc;
    const float cur = (float) userSettings().getDoubleValue("uiScale", 1.0);
    for (int pct : {75, 90, 100, 115, 125, 150, 175, 200}) sc.addItem(100 + pct, juce::String(pct) + " %", true, std::abs(cur * 100 - pct) < 1);
    m.addSubMenu(L("UI size", "Arayüz boyutu"), sc);
    m.addItem(1, "English", true, !isTurkish());
    m.addItem(2, juce::String::fromUTF8("Türkçe"), true, isTurkish());
    m.addSeparator();
    m.addItem(3, L("Reset integrated loudness", "Bütünleşik ses yüksekliğini sıfırla"));
    m.addSeparator();
    m.addItem(4, L("About PHASEFORGE", "PHASEFORGE hakkında"));
    m.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(menuB), [sp = juce::Component::SafePointer<EditorContent>(this)](int r) {
        if (!sp) return;
        if (r > 100 && sp->onScale) sp->onScale((r - 100) / 100.0f);
        if ((r == 1 && isTurkish()) || (r == 2 && !isTurkish())) sp->langB.onClick();
        if (r == 3) sp->proc.resetIntegratedLoudness();
        if (r == 4)
            juce::AlertWindow::showAsync(juce::MessageBoxOptions()
                                             .withIconType(juce::MessageBoxIconType::InfoIcon)
                                             .withTitle("PHASEFORGE")
                                             .withMessage(L("Phase alignment and frequency-conflict resolution.\nBE Akademi · Berkay Er\n"
                                                            "Free software: GNU AGPL v3 or later. Inter typeface: SIL Open Font License 1.1.",
                                                            "Faz hizalama ve frekans çakışması çözümü.\nBE Akademi · Berkay Er\n"
                                                            "Özgür yazılım: GNU AGPL v3 ya da sonrası. Inter yazı tipi: SIL Open Font License 1.1."))
                                             .withButton("OK", 1),
                                         nullptr);
    });
}

bool EditorContent::keyPressed(const juce::KeyPress& k) {
    if (k == juce::KeyPress('z', juce::ModifierKeys::commandModifier, 0)) { proc.undo.undo(); return true; }
    if (k == juce::KeyPress('z', juce::ModifierKeys::commandModifier | juce::ModifierKeys::shiftModifier, 0) ||
        k == juce::KeyPress('y', juce::ModifierKeys::commandModifier, 0)) { proc.undo.redo(); return true; }
    return false;
}

static MeterValues mv(const MeterReadout& r) { return {r.peakDb, r.momentary, r.shortTerm, r.integrated}; }

void EditorContent::timerCallback() {
    const auto in = proc.inputMeter(), out = proc.outputMeter(), sc = proc.sidechainMeter();
    inTop.set(mv(in));
    outTop.set(mv(out));
    mIn.set(mv(in));
    mOut.set(mv(out));
    mSc.set(mv(sc));
    const float fm = proc.apvts.getRawParameterValue(id::fixMain)->load(), fs = proc.apvts.getRawParameterValue(id::fixSc)->load();
    levelMatch.set(in.shortTerm <= -99 ? -100 : in.shortTerm + fm, sc.shortTerm <= -99 ? -100 : sc.shortTerm + fs, proc.sidechainBusActive());

    slotA.setToggleState(!proc.isB(), juce::dontSendNotification);
    slotB.setToggleState(proc.isB(), juce::dontSendNotification);
    slotA.setColour(juce::TextButton::buttonColourId, proc.isB() ? col::panelHi : col::accent);
    slotB.setColour(juce::TextButton::buttonColourId, proc.isB() ? col::accent : col::panelHi);
    copyAB.setButtonText(proc.isB() ? juce::String::fromUTF8("B → A") : juce::String::fromUTF8("A → B"));
    undoB.setEnabled(proc.undo.canUndo());
    redoB.setEnabled(proc.undo.canRedo());

    const int lat = proc.getLatencySamples();
    const double sr = std::max(1.0, proc.currentSampleRate());
    latency.setText(L("latency ", "gecikme ") + fmtNum(1000.0 * lat / sr, 1) + " ms", juce::dontSendNotification);

    // resolve state
    const auto rr = proc.getResolveResult();
    const bool w = rr.state == AnalysisState::Waiting;
    if (w != resolveWaiting) {
        resolveWaiting = w;
        resolve.setButtonText(w ? L("CANCEL", "İPTAL") : L("RESOLVE CONFLICTS", "ÇAKIŞMALARI ÇÖZ"));
    }
    if (w) {
        resolveStatus.setText(L("Listening… ", "Dinleniyor… ") + juce::String(juce::roundToInt(rr.progress * 100)) + " %", juce::dontSendNotification);
        resolveStatus.setColour(juce::Label::textColourId, col::accentHi);
    } else if (rr.id != resolveShown || rr.id == 0) {
        resolveShown = rr.id;
        using S = ResolveResult::Status;
        juce::String t;
        juce::Colour c = col::fgSoft;
        if (rr.id == 0) t = proc.sidechainBusActive() ? L("Play the mix, then resolve", "Mixi çal, sonra çöz") : L("Needs a sidechain", "Sidechain gerekli");
        else if (rr.status == S::Ok) { t = juce::String((int) rr.nodes.size()) + (rr.nodes.size() == 1 ? L(" node placed", " düğüm yerleştirildi") : L(" nodes placed", " düğüm yerleştirildi")); c = col::ok; }
        else if (rr.status == S::NoConflict) t = L("No conflict above the sensitivity", "Hassasiyetin üstünde çakışma yok");
        else if (rr.status == S::NoSidechain) { t = L("No sidechain signal", "Sidechain sinyali yok"); c = col::warn; }
        else { t = L("Not enough audio", "Yetersiz ses"); c = col::warn; }
        resolveStatus.setText(t, juce::dontSendNotification);
        resolveStatus.setColour(juce::Label::textColourId, c);
        if (rr.id != 0 && rr.status == S::Ok) display.selectNode(-1);
    }
    if (nodeStrip.node() >= 0) {
        if (proc.apvts.getRawParameterValue(id::node(nodeStrip.node(), "on"))->load() < 0.5f) display.selectNode(-1);
        else nodeStrip.repaint(0, 0, 190, nodeStrip.getHeight());
    }
}

void EditorContent::mouseDown(const juce::MouseEvent& e) {
    if (e.eventComponent == &mIn || e.eventComponent == &mOut || e.eventComponent == &mSc) proc.resetIntegratedLoudness();
}

void EditorContent::paint(juce::Graphics& g) {
    g.fillAll(col::bg);
    // brand
    g.setColour(col::accent);
    juce::Path mark;
    mark.addRoundedRectangle(20.0f, 16.0f, 26.0f, 26.0f, 7.0f);
    g.fillPath(mark);
    g.setColour(juce::Colours::white);
    juce::Path wave;
    for (int i = 0; i <= 20; ++i) {
        const float x = 24.0f + i, y = 29.0f + 6.0f * std::sin(i / 20.0f * juce::MathConstants<float>::twoPi);
        if (i == 0) wave.startNewSubPath(x, y); else wave.lineTo(x, y);
    }
    g.strokePath(wave, juce::PathStrokeType(2.0f));
    g.setColour(col::fg);
    g.setFont(juce::FontOptions(19.0f, juce::Font::bold).withKerningFactor(0.06f));
    g.drawText("PHASEFORGE", 56, 14, 160, 30, juce::Justification::centredLeft);
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(10.5f));
    g.drawText("BE AKADEMI", 56, 38, 160, 12, juce::Justification::centredLeft);
    // sidechain status chip
    const bool scBus = proc.sidechainBusActive(), scSig = proc.sidechainSignalPresent();
    auto chip = juce::Rectangle<float>(216, 19, 118, 22);
    g.setColour((scSig ? col::ok : scBus ? col::warn : col::fgFaint).withAlpha(0.18f));
    g.fillRoundedRectangle(chip, 11);
    g.setColour(scSig ? col::ok : scBus ? col::warn : col::fgFaint);
    g.setFont(juce::FontOptions(11.0f, juce::Font::bold));
    g.drawText(scSig ? L("SC: signal", "SC: sinyal var") : scBus ? L("SC: silent", "SC: sessiz") : L("SC: not connected", "SC: bağlı değil"), chip,
               juce::Justification::centred);
}

void EditorContent::resized() {
    auto r = getLocalBounds();
    auto top = r.removeFromTop(58).reduced(16, 13);
    top.removeFromLeft(330);
    presets.setBounds(top.removeFromLeft(180));
    top.removeFromLeft(6);
    savePre.setBounds(top.removeFromLeft(60));
    top.removeFromLeft(12);
    slotA.setBounds(top.removeFromLeft(32));
    top.removeFromLeft(2);
    slotB.setBounds(top.removeFromLeft(32));
    top.removeFromLeft(6);
    copyAB.setBounds(top.removeFromLeft(66));
    top.removeFromLeft(12);
    undoB.setBounds(top.removeFromLeft(56));
    top.removeFromLeft(4);
    redoB.setBounds(top.removeFromLeft(56));
    menuB.setBounds(top.removeFromRight(40));
    top.removeFromRight(6);
    langB.setBounds(top.removeFromRight(40));
    top.removeFromRight(10);
    bypass.setBounds(top.removeFromRight(84));
    top.removeFromRight(14);
    auto meters = top.removeFromRight(130);
    inTop.setBounds(meters.removeFromTop(meters.getHeight() / 2));
    outTop.setBounds(meters);

    r = r.reduced(16, 0);
    auto bottom = r.removeFromBottom(188).withTrimmedBottom(12);
    auto strip = r.removeFromBottom(98).withTrimmedBottom(8);
    nodeStrip.setBounds(strip);
    auto centre = r.withTrimmedBottom(8);
    phase.setBounds(centre.removeFromRight(352));
    centre.removeFromRight(8);
    display.setBounds(centre);

    // bottom cards
    auto dyn = bottom.removeFromLeft(470);
    bottom.removeFromLeft(8);
    auto prc = bottom.removeFromLeft(290);
    bottom.removeFromLeft(8);
    auto gain = bottom.removeFromLeft(190);
    bottom.removeFromLeft(8);
    auto loud = bottom;
    cDyn.setBounds(dyn);
    cProc.setBounds(prc);
    cGain.setBounds(gain);
    cLoud.setBounds(loud);

    auto d = dyn.reduced(14, 10).withTrimmedTop(18);
    sensitivity.setBounds(d.removeFromLeft(92).withSizeKeepingCentre(92, 112));
    d.removeFromLeft(8);
    auto mid = d.removeFromLeft(190);
    resolve.setBounds(mid.removeFromTop(40));
    resolveStatus.setBounds(mid.removeFromTop(22));
    mid.removeFromTop(6);
    dynMode.setBounds(mid.removeFromTop(30));
    d.removeFromLeft(10);
    auto right = d;
    mix.setBounds(right.removeFromTop(86).withSizeKeepingCentre(92, 86));
    auto toggles = right.removeFromBottom(30);
    scOn.setBounds(toggles.removeFromLeft(toggles.getWidth() / 2).withTrimmedRight(3));
    delta.setBounds(toggles.withTrimmedLeft(3));

    latency.setBounds(prc.getX() + 110, prc.getY() + 6, prc.getWidth() - 124, 20);
    latency.setJustificationType(juce::Justification::centredRight);
    auto p = prc.reduced(14, 10).withTrimmedTop(18);
    filterMode.setBounds(p.removeFromTop(30));
    p.removeFromTop(6);
    fixNote.setBounds(p.removeFromTop(16));
    fixMain.setBounds(p.removeFromLeft(p.getWidth() / 2).withSizeKeepingCentre(92, std::min(100, p.getHeight())));
    fixSc.setBounds(p.withSizeKeepingCentre(92, std::min(100, p.getHeight())));

    auto gn = gain.reduced(10, 10).withTrimmedTop(18);
    inGain.setBounds(gn.removeFromLeft(gn.getWidth() / 2).withSizeKeepingCentre(84, 112));
    outGain.setBounds(gn.withSizeKeepingCentre(84, 112));

    auto l = loud.reduced(14, 10).withTrimmedTop(22);
    mIn.setBounds(l.removeFromTop(24));
    mOut.setBounds(l.removeFromTop(24));
    mSc.setBounds(l.removeFromTop(24));
    l.removeFromTop(10);
    levelMatch.setBounds(l.removeFromTop(44));
}

// ───────────────────────────── PhaseForgeEditor
PhaseForgeEditor::PhaseForgeEditor(PhaseForgeProcessor& p) : juce::AudioProcessorEditor(p), proc(p) {
    setTurkish(userSettings().getValue("lang", "en") == "tr");
    build();
    const double s = juce::jlimit(0.6, 2.0, userSettings().getDoubleValue("uiScale", 1.0));
    setResizable(true, true);
    setResizeLimits((int) (EditorContent::kW * 0.6), (int) (EditorContent::kH * 0.6), EditorContent::kW * 2, EditorContent::kH * 2);
    if (auto* c = getConstrainer()) c->setFixedAspectRatio((double) EditorContent::kW / EditorContent::kH);
    setSize(juce::roundToInt(EditorContent::kW * s), juce::roundToInt(EditorContent::kH * s));
}

PhaseForgeEditor::~PhaseForgeEditor() { content.reset(); }

void PhaseForgeEditor::build() {
    content = std::make_unique<EditorContent>(proc);
    content->onLanguage = [this] {
        juce::MessageManager::callAsync([sp = juce::Component::SafePointer<PhaseForgeEditor>(this)] {
            if (!sp) return;
            sp->build();
            sp->resized();
        });
    };
    content->onScale = [this](float s) {
        userSettings().setValue("uiScale", s);
        userSettings().saveIfNeeded();
        setSize(juce::roundToInt(EditorContent::kW * s), juce::roundToInt(EditorContent::kH * s));
    };
    addAndMakeVisible(*content);
}

void PhaseForgeEditor::resized() {
    if (!content) return;
    const float s = getWidth() / (float) EditorContent::kW;
    content->setBounds(0, 0, EditorContent::kW, EditorContent::kH);
    content->setTransform(juce::AffineTransform::scale(s));
    if (std::abs(s - (float) userSettings().getDoubleValue("uiScale", 1.0)) > 0.01f) {
        userSettings().setValue("uiScale", s);
        userSettings().saveIfNeeded();
    }
}

}  // namespace pf
