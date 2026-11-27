// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// İşlemciyi host gibi sürer: sidechain'li bus düzeni, gerçek zamanlı (analiz thread'i) ↔ çevrimdışı render eşliği,
// durum kaydı/geri yükleme, mod geçişleri. Çalıştırma: kb_plugin_test <tests/parity klasörü>
#include "../src/PluginProcessor.h"

#include <chrono>
#include <cstdlib>
#include <cstdio>
#include <fstream>
#include <thread>

using namespace kb;

static int failures = 0;
#define CHECK(c, ...) do { if (!(c)) { ++failures; std::printf("  HATA: "); std::printf(__VA_ARGS__); std::printf("\n"); } } while (0)

static std::vector<double> load(const std::string& p) {
    std::ifstream f(p, std::ios::binary | std::ios::ate);
    const size_t n = (size_t) f.tellg() / 8;
    std::vector<double> v(n);
    f.seekg(0);
    f.read((char*) v.data(), (std::streamsize) (n * 8));
    return v;
}

static void setParam(KBAlignProcessor& p, const char* id, float v) {
    auto* prm = p.apvts.getParameter(id);
    prm->setValueNotifyingHost(prm->convertTo0to1(v));
}

static std::unique_ptr<KBAlignProcessor> make(double fs, int block) {
    auto p = std::make_unique<KBAlignProcessor>();
    auto layout = p->getBusesLayout();
    layout.inputBuses.getReference(0) = juce::AudioChannelSet::mono();
    layout.outputBuses.getReference(0) = juce::AudioChannelSet::mono();
    layout.inputBuses.getReference(1) = juce::AudioChannelSet::mono();
    CHECK(p->setBusesLayout(layout), "bus düzeni reddedildi");
    p->setRateAndBufferSizeDetails(fs, block);  // host'lar prepareToPlay'den önce bunu çağırır
    p->prepareToPlay(fs, block);
    return p;
}

static std::vector<float> run(KBAlignProcessor& p, const std::vector<double>& k, const std::vector<double>& b, int block, bool realtimePace) {
    const int n = (int) b.size() + p.getLatencySamples();
    std::vector<float> out((size_t) n);
    juce::AudioBuffer<float> buf(2, block);  // kanal 0: bas, kanal 1: sidechain kick
    juce::MidiBuffer midi;
    const double fs = p.getSampleRate();
    for (int pos = 0; pos < n; pos += block) {
        const int m = std::min(block, n - pos);
        buf.setSize(2, m, false, false, true);
        for (int i = 0; i < m; ++i) {
            const size_t s = (size_t) (pos + i);
            buf.setSample(0, i, s < b.size() ? (float) b[s] : 0.0f);
            buf.setSample(1, i, s < k.size() ? (float) k[s] : 0.0f);
        }
        p.processBlock(buf, midi);
        for (int i = 0; i < m; ++i) out[(size_t) (pos + i)] = buf.getSample(0, i);
        if (realtimePace) std::this_thread::sleep_for(std::chrono::microseconds((int) (m / fs * 1e6)));
    }
    return out;
}

int main(int argc, char** argv) {
    juce::ScopedJuceInitialiser_GUI init;
    const std::string dir = argc > 1 ? argv[1] : "tests/parity";
    auto k = load(dir + "/mloop_k.f64"), b = load(dir + "/mloop_b.f64");
    const double fs = 48000;
    for (int mode : {(int) Mode::Learn, (int) Mode::PerHit, (int) Mode::PerNote}) {
        std::printf("Mod %d: gerçek zamanlı ↔ çevrimdışı\n", mode);
        std::vector<float> outs[2];
        for (int offline = 0; offline < 2; ++offline) {
            auto p = make(fs, 512);
            setParam(*p, pid::mode, (float) mode);
            setParam(*p, pid::latency, mode == (int) Mode::PerHit ? 2.0f : 1.0f);
            p->prepareToPlay(fs, 512);  // gecikme modu değişti → yeniden kur (host bunu gecikme bildirimiyle yapar)
            if (mode == (int) Mode::Learn) p->startLearn();
            p->setNonRealtime(offline == 1);
            const auto w0 = std::chrono::steady_clock::now();
            outs[offline] = run(*p, k, b, 512, offline == 0);
            std::printf("    süre: %.2f s duvar saati, %.2f s ses\n", std::chrono::duration<double>(std::chrono::steady_clock::now() - w0).count(), (b.size() + p->getLatencySamples()) / fs);
            p->pollLearn();
            if (mode == (int) Mode::Learn) {
                CHECK(p->learned.has_value(), "Learn sonucu yok");
                if (p->learned) std::printf("  Learn: d %.4f ms θ %.2f°\n", p->learned->first, p->learned->second);
            }
            const auto hs = p->align.recentHits();
            std::printf("  [olay: üretilen %d, alınan %d, analiz en uzun %.1f ms toplam %.0f ms, son geç kalma %.1f ms] ", p->align.dbgEmitted.load(), p->engine.dbgPopped.load(), p->align.dbgMaxMs.load(), p->align.dbgSumMs.load(), p->align.dbgLateMs.load());
            std::printf("  %s: gecikme %d örnek, uygulanan d %.3f θ %.2f, vuruş %zu, uygulanan vuruş %d\n", offline ? "çevrimdışı" : "gerçek zamanlı",
                        p->getLatencySamples(), p->engine.uiD.load(), p->engine.uiTh.load(), hs.size(),
                        (int) std::count_if(hs.begin(), hs.end(), [](auto& h) { return h.applied; }));
        }
        if (const char* dump = std::getenv("KB_DUMP")) {
            std::ofstream f(std::string(dump) + "/mod" + std::to_string(mode) + ".f32", std::ios::binary);
            f.write((const char*) outs[1].data(), (std::streamsize) (outs[1].size() * 4));
        }
        double m = 0;
        for (size_t i = 0; i < outs[0].size(); ++i) m = std::max(m, (double) std::abs(outs[0][i] - outs[1][i]));
        std::printf("  fark: %.1f dBFS\n", 20 * std::log10(m + 1e-30));
        CHECK(m < 1e-6, "gerçek zamanlı ve çevrimdışı çıktı farklı (%.2e)", m);
    }
    std::printf("Durum kaydı / geri yükleme\n");
    {
        auto p = make(fs, 256);
        setParam(*p, pid::predelay, 3.25f);
        setParam(*p, pid::phase, 123.0f);
        setParam(*p, pid::bassMono, 1.0f);
        setParam(*p, pid::mode, (float) Mode::PerNote);
        p->align.setNoteValue(33, 1.5, 42.0);
        p->setCurve({{0, 0, 0}, {0.5, 0.3, 0.2}, {1, 1, 0}});
        juce::MemoryBlock mb;
        p->getStateInformation(mb);
        auto q = make(fs, 256);
        q->setStateInformation(mb.getData(), (int) mb.getSize());
        auto v = [&](const char* id) { return q->apvts.getRawParameterValue(id)->load(); };
        CHECK(std::abs(v(pid::predelay) - 3.25f) < 1e-3 && std::abs(v(pid::phase) - 123.0f) < 1e-2 && v(pid::bassMono) > 0.5f &&
              (int) v(pid::mode) == (int) Mode::PerNote, "parametreler geri gelmedi: %.3f %.3f %.1f %d", v(pid::predelay), v(pid::phase), v(pid::bassMono), (int) v(pid::mode));
        std::printf("  tablo: %zu nota\n", q->align.noteTable().size());
        auto t = q->align.noteTable();
        CHECK(t.count(33) && std::abs(t[33].d - 1.5) < 1e-9 && t[33].locked, "nota tablosu geri gelmedi");
        CHECK(q->curve.size() == 3 && std::abs(q->curve[1].g - 0.3) < 1e-9, "eğri geri gelmedi");
        std::printf("  parametreler, nota tablosu, eğri: %s\n", failures ? "HATA" : "tamam");
    }
    std::printf("Sidechain yokken çökme yok, bas yalnız gecikir\n");
    {
        auto p = std::make_unique<KBAlignProcessor>();
        auto layout = p->getBusesLayout();
        layout.inputBuses.getReference(0) = juce::AudioChannelSet::stereo();
        layout.outputBuses.getReference(0) = juce::AudioChannelSet::stereo();
        layout.inputBuses.getReference(1) = juce::AudioChannelSet::disabled();
        CHECK(p->setBusesLayout(layout), "sidechain kapalı düzen reddedildi");
        p->setRateAndBufferSizeDetails(fs, 333);
        p->prepareToPlay(fs, 333);
        juce::AudioBuffer<float> buf(2, 333);
        juce::MidiBuffer midi;
        for (int i = 0; i < 100; ++i) { buf.clear(); buf.setSample(0, 7, 1.0f); p->processBlock(buf, midi); }
        CHECK(!p->sidechainConnected(), "sidechain bağlı görünüyor");
        std::printf("  tamam\n");
    }
    std::printf("\n%d hata\n", failures);
    return failures ? 1 : 0;
}
