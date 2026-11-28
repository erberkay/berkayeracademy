// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
//
// pf_render — runs real stems through the plugin offline and writes a report.
//   pf_render <bass.wav> <kick.wav> <outDir> [name]
// The bass goes to the main input, the kick to the sidechain (looped if it is shorter than the bass).
// For each filter mode (Linear Phase FIR, Zero Latency IIR):
//   pass 1: RESOLVE CONFLICTS + ANALYZE PHASE on the material, results applied (as the buttons + APPLY would);
//   pass 2: fresh render with the applied settings, latency compensated;
// then writes <name>-<mode>-bas.wav (processed bass), <name>-<mode>-toplam.wav (kick + processed bass),
// <name>-orijinal-toplam.wav, and appends the measurements to <outDir>/<name>-rapor.md.
#include "../Source/PluginProcessor.h"

#include <juce_audio_formats/juce_audio_formats.h>

#include <chrono>
#include <cmath>
#include <cstdarg>
#include <complex>
#include <cstdio>
#include <thread>
#include <vector>

using namespace pf;

namespace {

struct Stereo { std::vector<float> L, R; size_t size() const { return L.size(); } };

bool readWav(const juce::File& f, Stereo& s, double& fs) {
    juce::AudioFormatManager fm;
    fm.registerBasicFormats();
    std::unique_ptr<juce::AudioFormatReader> r(fm.createReaderFor(f));
    if (!r) return false;
    fs = r->sampleRate;
    const int n = (int) r->lengthInSamples;
    juce::AudioBuffer<float> b((int) std::max(1u, r->numChannels), n);
    r->read(&b, 0, n, 0, true, true);
    s.L.assign(b.getReadPointer(0), b.getReadPointer(0) + n);
    const int rc = b.getNumChannels() > 1 ? 1 : 0;
    s.R.assign(b.getReadPointer(rc), b.getReadPointer(rc) + n);
    return true;
}

bool writeWav(const juce::File& f, const Stereo& s, double fs) {
    f.deleteFile();
    juce::WavAudioFormat wav;
    std::unique_ptr<juce::OutputStream> os = f.createOutputStream();
    if (!os) return false;
    auto opts = juce::AudioFormatWriterOptions{}.withSampleRate(fs).withNumChannels(2).withBitsPerSample(24);
    auto w = wav.createWriterFor(os, opts);
    if (!w) return false;
    const float* ch[2] = {s.L.data(), s.R.data()};
    return w->writeFromFloatArrays(ch, 2, (int) s.size());
}

// ── simple radix-2 FFT for band energies
void fft(std::vector<std::complex<double>>& a) {
    const size_t n = a.size();
    for (size_t i = 1, j = 0; i < n; ++i) {
        size_t bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) std::swap(a[i], a[j]);
    }
    for (size_t len = 2; len <= n; len <<= 1) {
        const double ang = -2 * M_PI / (double) len;
        const std::complex<double> wl(std::cos(ang), std::sin(ang));
        for (size_t i = 0; i < n; i += len) {
            std::complex<double> w(1);
            for (size_t k = 0; k < len / 2; ++k) {
                const auto u = a[i + k], v = a[i + k + len / 2] * w;
                a[i + k] = u + v;
                a[i + k + len / 2] = u - v;
                w *= wl;
            }
        }
    }
}

// energy (dB, mean square) of the mid signal between lo and hi Hz
double bandDb(const Stereo& s, double fs, double lo, double hi) {
    size_t n = 1;
    while (n < s.size()) n <<= 1;
    std::vector<std::complex<double>> a(n);
    for (size_t i = 0; i < s.size(); ++i) a[i] = 0.5 * ((double) s.L[i] + (double) s.R[i]);
    fft(a);
    double e = 0;
    for (size_t k = 1; k < n / 2; ++k) {
        const double f = (double) k * fs / (double) n;
        if (f >= lo && f < hi) e += std::norm(a[k]);
    }
    return 10 * std::log10(2 * e / ((double) n * (double) s.size()) + 1e-30);
}

double peakDb(const Stereo& s) {
    float p = 0;
    for (size_t i = 0; i < s.size(); ++i) p = std::max({p, std::abs(s.L[i]), std::abs(s.R[i])});
    return 20 * std::log10(p + 1e-30);
}

double lufs(const Stereo& s, double fs) {
    LoudnessMeter m;
    m.prepare(fs, 2);
    const int blk = 512;
    for (size_t pos = 0; pos < s.size(); pos += blk) {
        const int k = (int) std::min<size_t>(blk, s.size() - pos);
        const float* ch[2] = {s.L.data() + pos, s.R.data() + pos};
        m.process(ch, 2, k);
    }
    return m.integratedLufs();
}

Stereo add(const Stereo& a, const Stereo& b) {
    Stereo o = a;
    for (size_t i = 0; i < o.size() && i < b.size(); ++i) { o.L[i] += b.L[i]; o.R[i] += b.R[i]; }
    return o;
}

// kick onsets: the 10 ms-release envelope rises through −12 dB of the kick's peak; at least 120 ms between onsets
// and re-armed only after it fell below −24 dB (a 2 ms release re-armed inside a single 50 Hz cycle)
std::vector<size_t> onsets(const Stereo& k, double fs) {
    const double a = std::exp(-1.0 / (0.010 * fs));
    double env = 0, pk = 0;
    std::vector<double> e(k.size());
    for (size_t i = 0; i < k.size(); ++i) {
        const double x = 0.5 * std::abs((double) k.L[i] + (double) k.R[i]);
        env = std::max(x, env * a);
        e[i] = env;
        pk = std::max(pk, env);
    }
    std::vector<size_t> on;
    bool armed = true;
    const size_t minGap = (size_t) (0.120 * fs);
    for (size_t i = 0; i < e.size(); ++i) {
        if (armed && e[i] > pk * 0.25 && (on.empty() || i - on.back() >= minGap)) { on.push_back(i); armed = false; }
        else if (!armed && e[i] < pk * 0.063) armed = true;
    }
    return on;
}

// mask of "inside a hit": onset − 5 ms .. onset + 150 ms
std::vector<char> hitMask(const std::vector<size_t>& on, size_t n, double fs) {
    std::vector<char> m(n, 0);
    for (size_t o : on) {
        const size_t a = o > (size_t) (0.005 * fs) ? o - (size_t) (0.005 * fs) : 0;
        const size_t b = std::min(n, o + (size_t) (0.150 * fs));
        for (size_t i = a; i < b; ++i) m[i] = 1;
    }
    return m;
}

double msDb(const std::vector<double>& v) {
    double e = 0;
    for (double x : v) e += x * x;
    return 10 * std::log10(e / std::max<size_t>(1, v.size()) + 1e-30);
}

struct Artefacts {
    double diffOutsideDb = 0;     // RMS of (processed − original) bass outside hits, relative to the bass RMS there
    double levelOutsideDb = 0;    // RMS level change of the bass outside hits (phase-blind)
    double levelInsideDb = 0;     // RMS level change of the bass inside hits (the intended ducking)
    double preRingDb = 0;         // difference energy in the 20 ms before onsets relative to the bass energy there
    double postDiffDb = 0;        // same for the 20 ms after onsets (where the intended change happens)
    double sumPeakChangeDb = 0;   // change of the summed signal's peak inside hits
    double bassInHitsPct = 0;     // share of the original bass energy that falls inside the kick hits
    double hitTimePct = 0;        // share of the time covered by the hits
    int hits = 0;
};

Artefacts artefacts(const Stereo& orig, const Stereo& proc, const Stereo& kick, double fs) {
    Artefacts r;
    const auto on = onsets(kick, fs);
    const auto m = hitMask(on, orig.size(), fs);
    std::vector<double> dOut, oOut, pOut, oIn, pIn;
    for (size_t i = 0; i < orig.size(); ++i) {
        const double o = 0.5 * ((double) orig.L[i] + orig.R[i]), p = 0.5 * ((double) proc.L[i] + proc.R[i]);
        if (m[i]) { oIn.push_back(o); pIn.push_back(p); }
        else { dOut.push_back(p - o); oOut.push_back(o); pOut.push_back(p); }
    }
    r.diffOutsideDb = msDb(dOut) - msDb(oOut);
    {
        double eIn = 0, eAll = 0;
        for (double x : oIn) eIn += x * x;
        eAll = eIn;
        for (double x : oOut) eAll += x * x;
        r.bassInHitsPct = 100.0 * eIn / (eAll + 1e-30);
        r.hitTimePct = 100.0 * (double) oIn.size() / (double) orig.size();
        r.hits = (int) on.size();
    }
    r.levelOutsideDb = msDb(pOut) - msDb(oOut);
    r.levelInsideDb = msDb(pIn) - msDb(oIn);
    const size_t w = (size_t) (0.020 * fs);
    double pre = 0, post = 0, preRef = 0, postRef = 0;
    double pkO = 0, pkP = 0;
    const Stereo so = add(orig, kick), sp = add(proc, kick);
    for (size_t o : on) {
        for (size_t i = (o > w ? o - w : 0); i < o; ++i) {
            const double d = 0.5 * ((double) proc.L[i] + proc.R[i] - orig.L[i] - orig.R[i]);
            const double b = 0.5 * ((double) orig.L[i] + orig.R[i]);
            pre += d * d;
            preRef += b * b;
        }
        for (size_t i = o; i < std::min(orig.size(), o + w); ++i) {
            const double d = 0.5 * ((double) proc.L[i] + proc.R[i] - orig.L[i] - orig.R[i]);
            const double b = 0.5 * ((double) orig.L[i] + orig.R[i]);
            post += d * d;
            postRef += b * b;
            pkO = std::max({pkO, (double) std::abs(so.L[i]), (double) std::abs(so.R[i])});
            pkP = std::max({pkP, (double) std::abs(sp.L[i]), (double) std::abs(sp.R[i])});
        }
    }
    r.preRingDb = 10 * std::log10((pre + 1e-30) / (preRef + 1e-30));
    r.postDiffDb = 10 * std::log10((post + 1e-30) / (postRef + 1e-30));
    r.sumPeakChangeDb = 20 * std::log10((pkP + 1e-30) / (pkO + 1e-30));
    return r;
}

// printf into a juce::String, keeping UTF-8 (juce::String::formatted reads the format as Latin-1)
juce::String fmt(const char* f, ...) {
    char buf[4096];
    va_list ap;
    va_start(ap, f);
    std::vsnprintf(buf, sizeof buf, f, ap);
    va_end(ap);
    return juce::String::fromUTF8(buf);
}

void setP(PhaseForgeProcessor& p, const juce::String& pid, float v) {
    if (auto* prm = p.apvts.getParameter(pid)) prm->setValueNotifyingHost(prm->convertTo0to1(v));
}
float getP(PhaseForgeProcessor& p, const juce::String& pid) {
    auto* prm = p.apvts.getParameter(pid);
    return prm->convertFrom0to1(prm->getValue());
}

std::unique_ptr<PhaseForgeProcessor> make(double fs, int block) {
    auto p = std::make_unique<PhaseForgeProcessor>();
    auto layout = p->getBusesLayout();
    layout.inputBuses.getReference(0) = juce::AudioChannelSet::stereo();
    layout.outputBuses.getReference(0) = juce::AudioChannelSet::stereo();
    layout.inputBuses.getReference(1) = juce::AudioChannelSet::stereo();
    p->setBusesLayout(layout);
    p->setRateAndBufferSizeDetails(fs, block);
    p->prepareToPlay(fs, block);
    return p;
}

// runs main + sidechain through p; pace > 0 sleeps block/pace seconds per block (lets the analysis thread keep up)
Stereo run(PhaseForgeProcessor& p, const Stereo& main, const Stereo& sc, int block, double pace) {
    const size_t n = main.size();
    Stereo o;
    o.L.assign(n, 0.f);
    o.R.assign(n, 0.f);
    juce::AudioBuffer<float> buf(4, block);
    juce::MidiBuffer midi;
    const double fs = p.getSampleRate();
    for (size_t pos = 0; pos < n; pos += (size_t) block) {
        const int m = (int) std::min<size_t>((size_t) block, n - pos);
        buf.setSize(4, m, false, false, true);
        for (int i = 0; i < m; ++i) {
            const size_t t = pos + (size_t) i;
            buf.setSample(0, i, main.L[t]);
            buf.setSample(1, i, main.R[t]);
            buf.setSample(2, i, t < sc.size() ? sc.L[t] : 0.f);
            buf.setSample(3, i, t < sc.size() ? sc.R[t] : 0.f);
        }
        p.processBlock(buf, midi);
        for (int i = 0; i < m; ++i) {
            o.L[pos + (size_t) i] = buf.getSample(0, i);
            o.R[pos + (size_t) i] = buf.getSample(1, i);
        }
        if (pace > 0) std::this_thread::sleep_for(std::chrono::microseconds((long) (m / fs * 1e6 / pace)));
        p.processPendingWork();
    }
    return o;
}

template <typename F>
bool waitFor(F pred, double timeoutMs, PhaseForgeProcessor& p) {
    const auto t0 = std::chrono::steady_clock::now();
    while (std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count() < timeoutMs) {
        p.processPendingWork();
        if (pred()) return true;
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
    return pred();
}

const char* phaseStatus(PhaseResult::Status s) {
    switch (s) {
        case PhaseResult::Status::Ok: return "Ok";
        case PhaseResult::Status::NotEnoughAudio: return "NotEnoughAudio (yetersiz ses)";
        case PhaseResult::Status::Silent: return "Silent (sessiz)";
        case PhaseResult::Status::Unrelated: return "Unrelated (ilişkisiz: reddetti)";
        case PhaseResult::Status::Inconsistent: return "Inconsistent (tutarsız: reddetti)";
        case PhaseResult::Status::NoSidechain: return "NoSidechain";
    }
    return "?";
}
const char* resolveStatus(ResolveResult::Status s) {
    switch (s) {
        case ResolveResult::Status::Ok: return "Ok";
        case ResolveResult::Status::NoConflict: return "NoConflict (çakışma yok)";
        case ResolveResult::Status::NoSidechain: return "NoSidechain";
        case ResolveResult::Status::NotEnoughAudio: return "NotEnoughAudio";
    }
    return "?";
}

}  // namespace

int main(int argc, char** argv) {
    juce::ScopedJuceInitialiser_GUI init;
    if (argc < 4) {
        std::printf("usage: pf_render <bass.wav> <kick.wav> <outDir> [name]\n");
        return 2;
    }
    const juce::File bassF(juce::File::getCurrentWorkingDirectory().getChildFile(argv[1]));
    const juce::File kickF(juce::File::getCurrentWorkingDirectory().getChildFile(argv[2]));
    const juce::File outDir(juce::File::getCurrentWorkingDirectory().getChildFile(argv[3]));
    const juce::String name = argc > 4 ? argv[4] : bassF.getFileNameWithoutExtension();
    outDir.createDirectory();

    Stereo bass, kick;
    double fsB = 0, fsK = 0;
    if (!readWav(bassF, bass, fsB) || !readWav(kickF, kick, fsK)) { std::printf("cannot read input files\n"); return 1; }
    if (fsB != fsK) { std::printf("sample rates differ (%g vs %g)\n", fsB, fsK); return 1; }
    const double fs = fsB;
    const bool control = argc > 5 && juce::String(argv[5]) == "--kontrol";   // bass := −kick (a 180° case the analyzer must find)
    const size_t kickLen = kick.size();
    if (kick.size() < bass.size()) {   // loop the kick under the bass
        Stereo k2;
        k2.L.resize(bass.size());
        k2.R.resize(bass.size());
        for (size_t i = 0; i < bass.size(); ++i) { k2.L[i] = kick.L[i % kickLen]; k2.R[i] = kick.R[i % kickLen]; }
        kick = k2;
    } else {
        kick.L.resize(bass.size());
        kick.R.resize(bass.size());
    }

    if (control) {
        bass = kick;
        for (auto& v : bass.L) v = -v;
        for (auto& v : bass.R) v = -v;
    }

    juce::String rep;
    auto line = [&](const juce::String& s) { rep << s << "\n"; std::printf("%s\n", s.toRawUTF8()); };
    line("# " + name + juce::String::fromUTF8(control ? " (KONTROL: bas yerine ters çevrilmiş kick)" : ""));
    line("");
    line(fmt("Girdi: bas `%s`, kick `%s` (%.2f sn, %.0f Hz%s).", bassF.getFileName().toRawUTF8(),
                                 kickF.getFileName().toRawUTF8(), bass.size() / fs, fs,
                                 kickLen < bass.size() ? fmt(", kick %.2f sn'lik loop tekrarlandı", kickLen / fs).toRawUTF8() : ""));
    const Stereo sumO = add(bass, kick);
    writeWav(outDir.getChildFile(name + "-orijinal-toplam.wav"), sumO, fs);
    const double bandO = bandDb(sumO, fs, 20, 200), pkO = peakDb(sumO), luO = lufs(sumO, fs);
    const double bandBassO = bandDb(bass, fs, 20, 200);
    line(fmt("Orijinal kick + bas: 20–200 Hz enerji %.2f dB, tepe %.2f dBFS, %.2f LUFS.", bandO, pkO, luO));
    line("");

    const int block = 256;
    for (int fm : {1, 0}) {
        const char* mode = fm ? "FIR" : "IIR";
        line(juce::String("## ") + (fm ? "Linear Phase (FIR)" : "Zero Latency (IIR)"));
        auto p = make(fs, block);
        setP(*p, id::filterMode, (float) fm);
        p->processPendingWork();

        // pass 1: analysis (resolve auto-applies its nodes; phase applied by hand like the APPLY button)
        p->requestResolveConflicts();
        p->requestPhaseAnalysis();
        Stereo loopB = bass, loopK = kick;   // analysis wants ≥ 3 s; loop the material if it is short
        while (loopB.size() < (size_t) (8 * fs)) {
            loopB.L.insert(loopB.L.end(), bass.L.begin(), bass.L.end());
            loopB.R.insert(loopB.R.end(), bass.R.begin(), bass.R.end());
            loopK.L.insert(loopK.L.end(), kick.L.begin(), kick.L.end());
            loopK.R.insert(loopK.R.end(), kick.R.begin(), kick.R.end());
        }
        run(*p, loopB, loopK, block, 8.0);
        waitFor([&] { return p->getPhaseResult().state == AnalysisState::Done && p->getResolveResult().state == AnalysisState::Done &&
                             (p->getResolveResult().status != ResolveResult::Status::Ok || p->getResolveResult().applied); },
                30000, *p);
        const auto rr = p->getResolveResult();
        const auto pr = p->getPhaseResult();
        line(fmt("- RESOLVE: %s, %d düğüm%s", resolveStatus(rr.status), (int) rr.nodes.size(), rr.applied ? " (uygulandı)" : ""));
        for (int i = 0; i < id::kNodes; ++i)
            if (getP(*p, id::node(i, "on")) > 0.5f)
                line(fmt("  - düğüm %d: %.0f Hz, aralık %.1f dB, eşik %.1f dB, Q %.2f, atak %.0f ms, bırakma %.0f ms, kanal %s", i + 1,
                                             getP(*p, id::node(i, "freq")), getP(*p, id::node(i, "range")), getP(*p, id::node(i, "thr")),
                                             getP(*p, id::node(i, "q")), getP(*p, id::node(i, "att")), getP(*p, id::node(i, "rel")),
                                             (int) getP(*p, id::node(i, "ch")) == 1 ? "Mid" : ((int) getP(*p, id::node(i, "ch")) == 2 ? "Side" : "Stereo")));
        bool applied = false;
        if (pr.status == PhaseResult::Status::Ok) applied = p->applyPhaseResult();
        p->processPendingWork();
        line(fmt("- ANALYZE PHASE: %s, açı %+.1f°, güven %.2f, tahmini 20–200 Hz toplam değişimi %+.2f dB, %.1f sn analiz%s",
                                     phaseStatus(pr.status), pr.angleDeg, pr.confidence, pr.sumGainDb, pr.seconds,
                                     applied ? fmt(" → uygulandı (phaseAngle = %+.1f)", getP(*p, id::phaseAngle)).toRawUTF8()
                                             : " → uygulanmadı"));

        // pass 2: clean render with the applied settings
        p->prepareToPlay(fs, block);
        p->processPendingWork();
        const int L = p->getLatencySamples();
        Stereo inB = bass, inK = kick;
        inB.L.resize(bass.size() + (size_t) L, 0.f);
        inB.R.resize(bass.size() + (size_t) L, 0.f);
        inK.L.resize(inB.size(), 0.f);
        inK.R.resize(inB.size(), 0.f);
        const Stereo raw = run(*p, inB, inK, block, 0);
        Stereo proc;
        proc.L.assign(raw.L.begin() + L, raw.L.end());
        proc.R.assign(raw.R.begin() + L, raw.R.end());
        const Stereo sumP = add(proc, kick);
        writeWav(outDir.getChildFile(name + "-" + mode + "-bas.wav"), proc, fs);
        writeWav(outDir.getChildFile(name + "-" + mode + "-toplam.wav"), sumP, fs);
        const double bandP = bandDb(sumP, fs, 20, 200), pkP = peakDb(sumP), luP = lufs(sumP, fs);
        const auto a = artefacts(bass, proc, kick, fs);
        line(fmt("- Örtüşme: %d kick vuruşu; vuruşlar zamanın %%%.0f'ini kaplıyor, orijinal bas enerjisinin %%%.0f'i bu anlara düşüyor.",
                 a.hits, a.hitTimePct, a.bassInHitsPct));
        line(fmt("- Gecikme %d örnek (%.1f ms), sonuç buna göre hizalandı.", L, 1000.0 * L / fs));
        line(fmt("- Kick + bas 20–200 Hz enerji: %.2f → %.2f dB (**%+.2f dB**). Bas tek başına 20–200 Hz: %+.2f dB.", bandO, bandP,
                                     bandP - bandO, bandDb(proc, fs, 20, 200) - bandBassO));
        line(fmt("- Tepe: %.2f → %.2f dBFS (%+.2f dB). Loudness: %.2f → %.2f LUFS (%+.2f).", pkO, pkP, pkP - pkO, luO, luP, luP - luO));
        line(fmt("- Bas, vuruşlar dışında: seviye %+.2f dB, dalga farkı %.1f dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).",
                                     a.levelOutsideDb, a.diffOutsideDb));
        line(fmt("- Bas, vuruşlarda (kick başı −5…+150 ms): seviye %+.2f dB (istenen kısma).", a.levelInsideDb));
        line(fmt("- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark %.1f dB, sonraki 20 ms'de %.1f dB "
                 "(ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).", a.preRingDb, a.postDiffDb));
        line(fmt("- Toplamın vuruştaki tepe değişimi: %+.2f dB.", a.sumPeakChangeDb));
        line("");
    }
    outDir.getChildFile(name + "-rapor.md").replaceWithText(rep);
    return 0;
}
