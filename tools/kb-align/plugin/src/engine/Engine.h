// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// KB-Align — ses yolu (AudioEngine, ses thread'i) ve hizalama motoru (AlignEngine, analiz thread'i).
// Python referansı: prototype/kbalign/engine.py (ses yolu) ve modes.py (modlar).
#pragma once

#include "../analysis/Analyzer.h"
#include "../dsp/Dsp.h"
#include "Fifo.h"

#include <array>
#include <atomic>
#include <cstdint>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <vector>

namespace kb {

enum class LatencyMode { Low = 0, Full = 1, FullLookahead = 2 };
struct LatencySpec { double negMs, hilbertMs, lookaheadMs; };
inline LatencySpec latencySpec(LatencyMode m) {
    switch (m) {
        case LatencyMode::Low: return {10.0, 25.0, 0.0};
        case LatencyMode::Full: return {50.0, 25.0, 0.0};
        default: return {50.0, 25.0, 60.0};
    }
}
constexpr int kMargin = 4;
constexpr double kAnalysisHz = 120.0;  // analiz bandı (kick bölgesi) — crossover frekansından bağımsız (Python Config.analysis_fc)
constexpr int kConvBlock = 128;
constexpr double kRtMarginMs = 20.0;
constexpr int kGlobalHits = 16;  // Python modes.GLOBAL_HITS  // VARSAYIM (Python modes.RT_MARGIN_MS ile aynı)

inline int hilbertHalfSamples(double fs, LatencyMode m) { return (int) std::lround(latencySpec(m).hilbertMs * fs / 1000.0); }
inline int latencySamples(double fs, LatencyMode m) {
    const auto s = latencySpec(m);
    return (int) std::lround((s.negMs + s.lookaheadMs) * fs / 1000.0) + hilbertHalfSamples(fs, m) + kConvBlock + kMargin;
}

struct ParamEvent { int64_t c; double d, th; };  // içerik zamanı; crossfade [c - X, c] aralığında biter
struct OnsetEvent { int64_t t; };

enum class Mode { Manual = 0, Learn = 1, PerHit = 2, PerNote = 3, Continuous = 4 };
enum class Listen { Normal = 0, KickPlusBass = 1, LowSolo = 2 };
enum class DuckTarget { LowBand = 0, Full = 1 };

// Ses thread'ine her blokta verilen parametreler (APVTS'ten)
struct BlockParams {
    double manualD = 0, manualTh = 0;      // ince ayar / elle (Learn sonucu da buraya yazılır)
    double scOffsetMs = 0;                 // sidechain ofseti (Ableton PDC belirsizliği için)
    double trigHz = 150;
    bool bassMono = false; double monoHz = 100; double monoWidth = 0;
    bool duck = false; double duckDepth = 0.6; double duckLenMs = 250; DuckTarget duckTarget = DuckTarget::LowBand;
    bool duckTempo = false; double duckBeats = 1.0;
    Listen listen = Listen::Normal;
    bool bypass = false;
    double outGain = 1.0;  // çıkış kazancı (doğrusal), yalnız işlenmiş sinyale
    bool polarity = false;  // alt bant (işlenen bölüm) ters çevrilir = 180°; 10 ms geçişle
    double fc = 120;
    const CurvePoint* curvePts = nullptr;  // ses thread'ine ait kopya (bellek ayırmadan)
    int curveN = 0;
    // tempo (playhead)
    bool hasPpq = false; double ppq = 0; double bpm = 120; bool playing = false;
    // Sürekli mod rampası
    double rateMsPerS = 0.5, rateDegPerS = 45;
};

class AudioEngine {
public:
    void prepare(double fs, int maxBlock, int numChannels, LatencyMode lm, bool crossover, double fc, double xfadeMs = 10.0);
    void reset();
    int latency() const { return L; }
    int hs() const { return hsamp; }
    double sampleRate() const { return fs; }
    LatencyMode latencyMode() const { return lmode; }

    // bas: yerinde işlenir (numChannels kanal); kick: sidechain (kickCh kanal, 0 olabilir)
    void process(float* const* bass, int numCh, const float* const* kick, int kickCh, int n, const BlockParams& bp) noexcept;

    // analiz → ses: parametre olayları ve sürekli mod hedefleri
    SpscFifo<ParamEvent> events{256};
    SpscFifo<ParamEvent> contTargets{256};  // c: hedefin geçerli olduğu içerik zamanı
    // ses → analiz: onset olayları
    SpscFifo<OnsetEvent> onsets{1024};
    // geçmiş (analiz + osiloskop): mono
    HistoryRing hKickLow, hBassLow, hBassRaw, hKickRaw, hOut;
    // UI için: uygulanmakta olan (d, θ)
    std::atomic<double> uiD{0}, uiTh{0};
    std::atomic<float> uiInPeak{0}, uiOutPeak{0}, uiKickPeak{0};  // blok tepe değerleri (UI söndürür)
    std::atomic<int64_t> uiPos{0};
    // UI için onset geçmişi (içerik zamanı)
    static constexpr int kOnsetHist = 64;
    std::array<std::atomic<int64_t>, kOnsetHist> onsetHist{};
    std::atomic<int> onsetCount{0};
    // playhead anlık görüntüsü
    std::atomic<double> phPpq{0}, phBpm{120};
    std::atomic<int64_t> phPos{0};
    std::atomic<bool> phValid{false}, phPlaying{false};
    // Sürekli mod etkin mi (ses thread'i rampa uygular)
    std::atomic<bool> continuous{false};
    // ölçüm: blok başına işlem süresi (UI'da CPU göstergesi değil; test için)
    int64_t inputCount() const { return nInPub.load(std::memory_order_acquire); }
    std::atomic<int> dbgPopped{0};

private:
    struct Chan {
        LR4 lp, hp, dlp, dhp;           // ses crossover + (gerekirse) ikinci zincir
        PartitionedConvolver conv;
        Ring<float> lo, v, hi, dry;
        LR4 monoLp, monoHp, monoMlp, monoMhp;
    };
    double fs = 48000, xfadeMs = 10;
    int L = 0, hsamp = 0, X = 480, nch = 1;
    LatencyMode lmode = LatencyMode::Full;
    bool xover = true;
    double fcCur = 120;
    std::vector<Chan> ch;
    LR4 aKick, aBass;  // analiz alt bandı (mono)
    OnsetDetector onset;
    int64_t nIn = 0;   // mutlak giriş indeksi (= çıkış indeksi)
    std::atomic<int64_t> nInPub{0};  // analiz thread'i için yayımlanan kopya
    // parametre zinciri
    double curD = 0, curTh = 0, nextD = 0, nextTh = 0;
    int64_t fadeStart = -1, fadeEnd = -1;  // içerik zamanında
    std::array<ParamEvent, 64> pending{};
    int nPending = 0;
    double tgtD = 0, tgtTh = 0;
    std::array<ParamEvent, 64> pendingTargets{};
    int nPendTgt = 0;
    double knobD = 0, knobTh = 0;  // yumuşatılmış elle değerler
    bool knobInit = false;
    // ducking
    std::array<int64_t, 64> duckOnsets{};
    int nDuck = 0;
    int64_t duckStart = -1;
    double lastBeat = -1;
    std::array<CurvePoint, kMaxCurvePoints> curve{};
    int curveN = 0;
    // bypass / mono / dinleme geçişleri
    double bypassMix = 0, monoMix = 0, polGain = 1;
    Ring<float> kickDelay;  // önizleme için
};

// ─────────────────────────────── hizalama motoru (analiz thread'i)
struct AlignSettings {
    Mode mode = Mode::Manual;
    AnalysisParams ap;
    int learnHits = 8;
    double confMin = 0.15, accept = 0.005;
    int noteMaxSegs = 16;
    double contTauS = 1.0;
    double fmin = 19.0;
};

struct NoteEntry { double d = 0, th = 0; int count = 0; bool locked = false; bool manual = false; };

class AlignEngine {
public:
    AlignEngine();
    void prepare(AudioEngine* eng, double fs, double fc);
    void setSettings(const AlignSettings& s);  // mesaj thread'i
    AlignSettings settings();
    // Learn'ü başlat (mesaj thread'i). Sonuç hazır olunca learnResult dolar.
    void startLearn();
    bool learnInProgress() const { return learning.load(); }
    std::optional<std::pair<double, double>> takeLearnResult();
    // analiz adımı: yeni onset'leri al, hazır olan vuruşları işle (analiz thread'i)
    // nonRealtime: veri tam olarak hazır olunca işler (çevrimdışı render ile aynı sonuç)
    void step();
    // nota tablosu (UI ve durum kaydı)
    std::map<int, NoteEntry> noteTable();
    void setNoteTable(const std::map<int, NoteEntry>& t);
    void clearNote(int note);
    void lockNote(int note, bool lock);
    void setNoteValue(int note, double d, double th);
    // UI: son vuruş bilgileri
    struct HitInfo { int64_t t0; double d, th, rho; int note; bool applied; };
    std::vector<HitInfo> recentHits();
    double lastConfidence() const { return lastRho.load(); }
    std::atomic<int> learnCollected{0};
    std::atomic<int> dbgEmitted{0};
    std::atomic<double> dbgMaxMs{0}, dbgSumMs{0}, dbgLateMs{0};  // tanı: test ve UI için
    // durum: en son uygulanan değer (analiz tarafı)
    std::pair<double, double> current() { std::lock_guard<std::mutex> g(mtx); return cur; }

private:
    struct Pending { int64_t t0; int stage = 0; int note = -1; };
    bool processHit(Pending& pd, int64_t written);
    bool copyRegion(const HistoryRing& r, int64_t a, int64_t b, std::vector<double>& out);
    double objAt(const std::vector<const HitSegment*>& segs, double d, double th) const;
    void emit(int64_t c, double d, double th);

    AudioEngine* eng = nullptr;
    double fs = 48000, fc = 120;
    std::unique_ptr<Analyzer> an;
    std::mutex mtx;  // ayarlar ve tablo (ses thread'i hiç kilitlemez)
    AlignSettings set;
    std::vector<Pending> pend;
    std::vector<HitSegment> learnSegs;
    std::atomic<bool> learning{false};
    std::optional<std::pair<double, double>> learnResult;
    std::map<int, std::vector<HitSegment>> noteSegs;
    std::map<int, NoteEntry> table;
    std::vector<std::vector<cplx>> gCs;  // nota modu: son vuruşların korelasyonları (nota bilinmezse genel değer)
    std::optional<std::pair<double, double>> gEst;
    std::vector<cplx> contC;
    std::vector<int> contLags;
    double contLastT = -1;
    std::pair<double, double> cur{0, 0};
    std::optional<std::pair<double, double>> pendingNext;
    std::vector<HitInfo> hits;
    std::atomic<double> lastRho{0};
    std::vector<double> bufK, bufB, bufR;
};

} // namespace kb
