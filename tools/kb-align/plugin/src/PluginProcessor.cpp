// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace kb {

using APF = juce::AudioParameterFloat;
using APC = juce::AudioParameterChoice;
using APB = juce::AudioParameterBool;
using NR = juce::NormalisableRange<float>;

static juce::String fmtMs(float v, int) { return juce::String(v, 3) + " ms"; }
static juce::String fmtHz(float v, int) { return juce::String(v, 1) + " Hz"; }
static juce::String fmtDeg(float v, int) { return juce::String(v, 1) + juce::String::fromUTF8(" \xc2\xb0"); }
static juce::String fmtPct(float v, int) { return juce::String(juce::roundToInt(v * 100)) + " %"; }

// Seçim parametreleri: metin → değer, ASCII dışı karakterler bozulsa da (ör. CLAP sarmalayıcısı UTF-8'i farklı
// çözerse) eşleşsin diye karşılaştırma yalnız ASCII harf/rakamlarla yapılır; sayı da kabul edilir.
static juce::String asciiKey(const juce::String& s) {
    juce::String o;
    for (auto c : s) if (c < 128 && juce::CharacterFunctions::isLetterOrDigit(c)) o += juce::CharacterFunctions::toLowerCase(c);
    return o;
}
static std::unique_ptr<juce::AudioParameterChoice> choice(const char* id, const juce::String& name, const juce::StringArray& items, int def) {
    auto attr = juce::AudioParameterChoiceAttributes()
                    .withStringFromValueFunction([items](int i, int) { return items[i]; })
                    .withValueFromStringFunction([items](const juce::String& t) {
                        const auto k = asciiKey(t);
                        for (int i = 0; i < items.size(); ++i)
                            if (items[i] == t || asciiKey(items[i]) == k) return i;
                        if (t.containsOnly("0123456789")) return juce::jlimit(0, items.size() - 1, t.getIntValue());
                        return 0;
                    });
    return std::make_unique<juce::AudioParameterChoice>(juce::ParameterID{id, 1}, name, items, def, attr);
}

juce::AudioProcessorValueTreeState::ParameterLayout KBAlignProcessor::createLayout() {
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> p;
    auto attrMs = juce::AudioParameterFloatAttributes().withStringFromValueFunction(fmtMs).withLabel("ms");
    auto attrHz = juce::AudioParameterFloatAttributes().withStringFromValueFunction(fmtHz).withLabel("Hz");
    auto attrDeg = juce::AudioParameterFloatAttributes().withStringFromValueFunction(fmtDeg);
    auto attrPct = juce::AudioParameterFloatAttributes().withStringFromValueFunction(fmtPct)
                       .withValueFromStringFunction([](const juce::String& t) { return (float) (t.getDoubleValue() / 100.0); });
    const juce::StringArray modes{juce::String::fromUTF8("Elle"), "Learn", juce::String::fromUTF8("Her vuruşta"),
                                  juce::String::fromUTF8("Nota başına"), juce::String::fromUTF8("Sürekli takip")};
    p.push_back(choice(pid::mode, "Mod", modes, 0));
    p.push_back(choice(pid::autoTarget, "Otomatik hedef",
        juce::StringArray{"Gecikme + faz", juce::String::fromUTF8("Yalnız gecikme"), juce::String::fromUTF8("Yalnız faz")}, 0));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::predelay, 1}, "Pre-delay", NR(-50.f, 50.f, 0.001f), 0.f, attrMs));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::phase, 1}, juce::String::fromUTF8("Faz döndürme"), NR(0.f, 360.f, 0.01f), 0.f, attrDeg));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::search, 1}, juce::String::fromUTF8("Arama aralığı"), NR(1.f, 50.f, 0.1f), 10.f, attrMs));
    p.push_back(choice(pid::latency, "Gecikme modu",
        juce::StringArray{juce::String::fromUTF8("Düşük (±10 ms)"), juce::String::fromUTF8("Tam (±50 ms)"), "Tam + lookahead"}, 1));
    p.push_back(std::make_unique<APB>(juce::ParameterID{pid::crossover, 1}, "Crossover", true));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::fc, 1}, "Crossover frekans", NR(40.f, 300.f, 0.1f, 0.5f), 120.f, attrHz));
    p.push_back(std::make_unique<juce::AudioParameterInt>(juce::ParameterID{pid::learnHits, 1}, juce::String::fromUTF8("Learn vuruş sayısı"), 1, 32, 8));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::winStart, 1}, juce::String::fromUTF8("Analiz penceresi başı"), NR(0.f, 50.f, 0.1f), 0.f, attrMs));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::winMs, 1}, juce::String::fromUTF8("Analiz penceresi"), NR(20.f, 150.f, 0.1f), 150.f, attrMs));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::scOffset, 1}, "Sidechain ofseti", NR(-20.f, 20.f, 0.001f), 0.f, attrMs));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::trigHz, 1}, "Tetik frekans", NR(40.f, 400.f, 0.1f, 0.5f), 150.f, attrHz));
    p.push_back(std::make_unique<APB>(juce::ParameterID{pid::bassMono, 1}, "Bass Mono", false));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::monoHz, 1}, "Mono frekans", NR(40.f, 300.f, 0.1f, 0.5f), 100.f, attrHz));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::monoWidth, 1}, juce::String::fromUTF8("Alt bant genişlik"), NR(0.f, 1.f, 0.001f), 0.f, attrPct));
    p.push_back(std::make_unique<APB>(juce::ParameterID{pid::duck, 1}, "Ducking", false));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::duckDepth, 1}, "Ducking derinlik", NR(0.f, 1.f, 0.001f), 0.6f, attrPct));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::duckLen, 1}, "Ducking uzunluk", NR(20.f, 1000.f, 0.1f, 0.5f), 250.f, attrMs));
    p.push_back(std::make_unique<APB>(juce::ParameterID{pid::duckSync, 1}, "Ducking tempo", false));
    p.push_back(choice(pid::duckBeats, "Ducking nota",
        juce::StringArray{"1/16", "1/8", "1/4", "1/2", juce::String::fromUTF8("1 ölçü")}, 2));
    p.push_back(choice(pid::duckTarget, "Ducking hedef",
        juce::StringArray{"Alt bant", juce::String::fromUTF8("Tüm sinyal")}, 0));
    p.push_back(choice(pid::listen, "Dinleme",
        juce::StringArray{"Bas", juce::String::fromUTF8("Kick + bas (önizleme)"), "Alt bant solo"}, 0));
    p.push_back(std::make_unique<APB>(juce::ParameterID{pid::bypass, 1}, "Bypass", false));
    p.push_back(std::make_unique<APF>(juce::ParameterID{pid::contRate, 1}, juce::String::fromUTF8("Takip hızı"), NR(0.1f, 5.f, 0.01f, 0.5f), 0.5f,
        juce::AudioParameterFloatAttributes().withStringFromValueFunction([](float v, int) { return juce::String(v, 2) + " ms/s"; })));
    return {p.begin(), p.end()};
}

KBAlignProcessor::KBAlignProcessor()
    : juce::AudioProcessor(BusesProperties()
                               .withInput("Bas", juce::AudioChannelSet::stereo(), true)
                               .withOutput("Bas", juce::AudioChannelSet::stereo(), true)
                               .withInput("Kick (sidechain)", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, &undo, "KBAlign", createLayout()) {
    for (auto* id : {pid::mode, pid::autoTarget, pid::search, pid::learnHits, pid::winStart, pid::winMs,
                     pid::latency, pid::crossover})
        apvts.addParameterListener(id, this);
    thread.startThread(juce::Thread::Priority::normal);
}

KBAlignProcessor::~KBAlignProcessor() { thread.stopThread(2000); }

bool KBAlignProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
    const auto in = layouts.getMainInputChannelSet(), out = layouts.getMainOutputChannelSet();
    if (in != out) return false;
    if (in != juce::AudioChannelSet::mono() && in != juce::AudioChannelSet::stereo()) return false;
    if (layouts.inputBuses.size() > 1) {
        const auto sc = layouts.getChannelSet(true, 1);
        if (!sc.isDisabled() && sc != juce::AudioChannelSet::mono() && sc != juce::AudioChannelSet::stereo()) return false;
    }
    return true;
}

void KBAlignProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    // analiz thread'i motorun tamponlarını okur: yeniden kurulumda durdurulur
    thread.stopThread(2000);
    sr = sampleRate;
    maxBlock = samplesPerBlock;
    numCh = std::max(1, getMainBusNumInputChannels());
    preparedLm = (LatencyMode) (int) apvts.getRawParameterValue(pid::latency)->load();
    preparedXover = apvts.getRawParameterValue(pid::crossover)->load() > 0.5f;
    const double fc = apvts.getRawParameterValue(pid::fc)->load();
    engine.prepare(sr, std::min(samplesPerBlock, 256), numCh, preparedLm, preparedXover, fc);
    align.prepare(&engine, sr, fc);
    pushAlignSettings();
    if (learned && (int) apvts.getRawParameterValue(pid::mode)->load() == (int) Mode::Learn)
        engine.events.push({0, learned->first, learned->second});
    setLatencySamples(engine.latency());
    thread.startThread(juce::Thread::Priority::normal);
}

void KBAlignProcessor::releaseResources() {}

void KBAlignProcessor::reconfigure() {
    // yalnız gecikme modu ya da crossover değişince: ses durur, motor yeniden kurulur, host'a yeni gecikme bildirilir
    suspendProcessing(true);
    prepareToPlay(sr, maxBlock);
    suspendProcessing(false);
}

void KBAlignProcessor::parameterChanged(const juce::String& id, float) {
    if (id == pid::latency || id == pid::crossover) {
        if (juce::MessageManager::getInstanceWithoutCreating() && juce::MessageManager::getInstance()->isThisTheMessageThread())
            reconfigure();
        else
            juce::MessageManager::callAsync([this] { reconfigure(); });
        return;
    }
    pushAlignSettings();
}

void KBAlignProcessor::pushAlignSettings() {
    AlignSettings s;
    s.mode = (Mode) (int) apvts.getRawParameterValue(pid::mode)->load();
    s.ap.autoTarget = (AutoTarget) (int) apvts.getRawParameterValue(pid::autoTarget)->load();
    const double search = apvts.getRawParameterValue(pid::search)->load();
    const double negLimit = latencySpec(preparedLm).negMs;
    s.ap.dMinMs = -std::min(search, negLimit);
    s.ap.dMaxMs = search;
    s.ap.winStartMs = apvts.getRawParameterValue(pid::winStart)->load();
    s.ap.winMs = apvts.getRawParameterValue(pid::winMs)->load();
    s.learnHits = (int) apvts.getRawParameterValue(pid::learnHits)->load();
    align.setSettings(s);
}

void KBAlignProcessor::setCurve(const std::vector<CurvePoint>& c) {
    curve = c;
    const juce::SpinLock::ScopedLockType l(curveLock);
    curveAudio = c;
    curveDirty.store(true);
}

void KBAlignProcessor::pollLearn() {
    if (auto r = align.takeLearnResult()) learned = r;
}

BlockParams KBAlignProcessor::makeBlockParams(juce::AudioPlayHead* ph, int) {
    auto v = [this](const char* id) { return (double) apvts.getRawParameterValue(id)->load(); };
    BlockParams bp;
    bp.manualD = v(pid::predelay);
    double th = v(pid::phase);
    bp.manualTh = th;
    bp.scOffsetMs = v(pid::scOffset);
    bp.trigHz = v(pid::trigHz);
    bp.bassMono = v(pid::bassMono) > 0.5;
    bp.monoHz = v(pid::monoHz);
    bp.monoWidth = v(pid::monoWidth);
    bp.duck = v(pid::duck) > 0.5;
    bp.duckDepth = v(pid::duckDepth);
    bp.duckLenMs = v(pid::duckLen);
    bp.duckTempo = v(pid::duckSync) > 0.5;
    static constexpr double beats[] = {0.25, 0.5, 1.0, 2.0, 4.0};
    bp.duckBeats = beats[juce::jlimit(0, 4, (int) v(pid::duckBeats))];
    bp.duckTarget = (DuckTarget) (int) v(pid::duckTarget);
    bp.listen = (Listen) (int) v(pid::listen);
    bp.bypass = v(pid::bypass) > 0.5;
    bp.fc = v(pid::fc);
    bp.rateMsPerS = v(pid::contRate);
    if (ph) {
        if (auto pos = ph->getPosition()) {
            if (auto ppq = pos->getPpqPosition()) { bp.hasPpq = true; bp.ppq = *ppq; }
            if (auto bpm = pos->getBpm()) bp.bpm = *bpm;
            bp.playing = pos->getIsPlaying();
        }
    }
    return bp;
}

void KBAlignProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) {
    juce::ScopedNoDenormals nd;
    auto main = getBusBuffer(buffer, true, 0);
    const int n = buffer.getNumSamples();
    const int ch = main.getNumChannels();
    for (int c = ch; c < getTotalNumOutputChannels(); ++c) buffer.clear(c, 0, n);
    const float* kickPtrs[2] = {nullptr, nullptr};
    int kickCh = 0;
    if (getBusCount(true) > 1 && getBus(true, 1)->isEnabled()) {
        auto sc = getBusBuffer(buffer, true, 1);
        kickCh = std::min(2, sc.getNumChannels());
        for (int c = 0; c < kickCh; ++c) kickPtrs[c] = sc.getReadPointer(c);
    }
    scConnected.store(kickCh > 0);
    BlockParams bp = makeBlockParams(getPlayHead(), n);
    {   // eğri: kilit alınabilirse sabit boyutlu yerel diziye kopyala (bellek ayırmadan); alınamazsa motor eskisini kullanır
        const juce::SpinLock::ScopedTryLockType l(curveLock);
        if (l.isLocked() && curveDirty.exchange(false)) {
            curveLocalN = (int) std::min<size_t>(curveAudio.size(), (size_t) kMaxCurvePoints);
            for (int q = 0; q < curveLocalN; ++q) curveLocal[(size_t) q] = curveAudio[(size_t) q];
            bp.curvePts = curveLocal.data();
            bp.curveN = curveLocalN;
        }
    }
    const bool offline = isNonRealtime();
    // alt bloklar (≤ 256): çevrimdışı render'da analiz her alt bloktan sonra eşzamanlı çalışır →
    // gerçek zamanlı ile aynı sonuç (Ableton dışa aktarım / freeze).
    for (int pos = 0; pos < n; pos += 256) {
        const int m = std::min(256, n - pos);
        float* chans[2] = {main.getWritePointer(0, pos), ch > 1 ? main.getWritePointer(1, pos) : nullptr};
        const float* kk[2] = {kickPtrs[0] ? kickPtrs[0] + pos : nullptr, kickPtrs[1] ? kickPtrs[1] + pos : nullptr};
        if (bp.hasPpq && pos > 0) bp.ppq += 256.0 * bp.bpm / 60.0 / sr;
        engine.process(chans, std::min(ch, 2), kk, kickCh, m, bp);
        if (offline) align.step();
    }
}

// ───────────────────────────── durum
juce::ValueTree KBAlignProcessor::snapshot() {
    auto st = apvts.copyState();
    st.setProperty("version", kStateVersion, nullptr);
    juce::ValueTree notes("Notes");
    for (auto& [note, e] : align.noteTable()) {
        juce::ValueTree n("N");
        n.setProperty("note", note, nullptr);
        n.setProperty("d", e.d, nullptr);
        n.setProperty("th", e.th, nullptr);
        n.setProperty("count", e.count, nullptr);
        n.setProperty("locked", e.locked, nullptr);
        n.setProperty("manual", e.manual, nullptr);
        notes.appendChild(n, nullptr);
    }
    st.removeChild(st.getChildWithName("Notes"), nullptr);
    st.appendChild(notes, nullptr);
    juce::ValueTree cv("Curve");
    for (auto& p : curve) {
        juce::ValueTree q("P");
        q.setProperty("t", p.t, nullptr);
        q.setProperty("g", p.g, nullptr);
        q.setProperty("c", p.c, nullptr);
        cv.appendChild(q, nullptr);
    }
    st.removeChild(st.getChildWithName("Curve"), nullptr);
    st.appendChild(cv, nullptr);
    st.removeChild(st.getChildWithName("Learn"), nullptr);
    if (learned) {
        juce::ValueTree l("Learn");
        l.setProperty("d", learned->first, nullptr);
        l.setProperty("th", learned->second, nullptr);
        st.appendChild(l, nullptr);
    }
    return st;
}

void KBAlignProcessor::restore(const juce::ValueTree& tIn) {
    auto t = tIn.createCopy();
    // sürüm geçişleri: v1 ilk sürüm; daha yeni sürümler burada eski alanları dönüştürür
    const int ver = (int) t.getProperty("version", 1);
    juce::ignoreUnused(ver);
    std::map<int, NoteEntry> table;
    for (auto n : t.getChildWithName("Notes")) {
        NoteEntry e;
        e.d = n.getProperty("d", 0.0); e.th = n.getProperty("th", 0.0); e.count = n.getProperty("count", 0);
        e.locked = n.getProperty("locked", false); e.manual = n.getProperty("manual", false);
        table[(int) n.getProperty("note", 0)] = e;
    }
    align.setNoteTable(table);
    std::vector<CurvePoint> cv;
    for (auto q : t.getChildWithName("Curve")) cv.push_back({q.getProperty("t", 0.0), q.getProperty("g", 1.0), q.getProperty("c", 0.0)});
    if (cv.size() >= 2) setCurve(cv);
    auto l = t.getChildWithName("Learn");
    if (l.isValid()) learned = std::make_pair((double) l.getProperty("d", 0.0), (double) l.getProperty("th", 0.0));
    else learned.reset();
    for (auto name : {"Notes", "Curve", "Learn"}) t.removeChild(t.getChildWithName(name), nullptr);
    if (t.hasType(apvts.state.getType())) {
        apvts.replaceState(t);
        // JUCE, kayıtlı değer güncel değerin yuvarlanmış hâline eşitse (bool/choice) güncellemeyi atlar →
        // her parametreyi açıkça ayarla (pluginval "state restoration")
        for (auto child : t) {
            if (!child.hasType("PARAM")) continue;
            if (auto* prm = apvts.getParameter(child.getProperty("id").toString())) {
                const float v = (float) (double) child.getProperty("value", prm->convertFrom0to1(prm->getDefaultValue()));
                prm->setValueNotifyingHost(prm->convertTo0to1(v));
            }
        }
    }
    pushAlignSettings();
    if (learned && (int) apvts.getRawParameterValue(pid::mode)->load() == (int) Mode::Learn)
        engine.events.push({engine.inputCount() - engine.latency() + 480, learned->first, learned->second});
}

void KBAlignProcessor::getStateInformation(juce::MemoryBlock& destData) {
    auto st = snapshot();
    st.setProperty("abB", slotBActive, nullptr);
    if (auto xml = st.createXml()) copyXmlToBinary(*xml, destData);
}

void KBAlignProcessor::setStateInformation(const void* data, int sizeInBytes) {
    if (auto xml = getXmlFromBinary(data, sizeInBytes)) restore(juce::ValueTree::fromXml(*xml));
}

void KBAlignProcessor::toggleAB() {
    auto cur = snapshot();
    if (!slotBActive) { slotA = cur; if (slotB.isValid()) restore(slotB); else slotB = cur; }
    else { slotB = cur; if (slotA.isValid()) restore(slotA); }
    slotBActive = !slotBActive;
}

void KBAlignProcessor::copyAtoB() {
    auto cur = snapshot();
    if (slotBActive) slotA = cur; else slotB = cur;
}

// ───────────────────────────── fabrika presetleri
struct FactoryPreset { const char* name; std::vector<std::pair<const char*, float>> v; };
static const std::vector<FactoryPreset>& factory() {
    static const std::vector<FactoryPreset> f = {
        {"Varsayılan", {}},
        {"Learn — sabit bas (techno)", {{pid::mode, 1}, {pid::search, 10}}},
        {"Nota başına — retrigger synth", {{pid::mode, 3}, {pid::search, 10}}},
        {"Her vuruşta — serbest faz (lookahead)", {{pid::mode, 2}, {pid::latency, 2}, {pid::search, 10}}},
        {"Sürekli takip — canlı", {{pid::mode, 4}, {pid::latency, 0}, {pid::contRate, 0.5f}}},
        {"Yalnız faz — gecikmesiz düzen", {{pid::mode, 1}, {pid::autoTarget, 2}}},
        {"Ducking + Bass Mono", {{pid::duck, 1}, {pid::bassMono, 1}, {pid::duckSync, 1}}},
    };
    return f;
}

int KBAlignProcessor::getNumPrograms() { return (int) factory().size(); }
const juce::String KBAlignProcessor::getProgramName(int i) {
    return juce::isPositiveAndBelow(i, getNumPrograms()) ? juce::String::fromUTF8(factory()[(size_t) i].name) : juce::String();
}

void KBAlignProcessor::setCurrentProgram(int index) {
    if (!juce::isPositiveAndBelow(index, getNumPrograms())) return;
    currentProgram = index;
    for (auto* prm : getParameters())
        if (auto* r = dynamic_cast<juce::RangedAudioParameter*>(prm)) r->setValueNotifyingHost(r->getDefaultValue());
    for (auto& [id, val] : factory()[(size_t) index].v)
        if (auto* r = apvts.getParameter(id)) r->setValueNotifyingHost(r->convertTo0to1(val));
    setCurve(placeholderCurve());  // VARSAYIM: kullanıcının eğrisi gelince varsayılan bu olacak
}

juce::AudioProcessorEditor* KBAlignProcessor::createEditor() { return new KBAlignEditor(*this); }

} // namespace kb

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new kb::KBAlignProcessor(); }
