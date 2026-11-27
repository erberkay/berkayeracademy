// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// Danışman: kick'e DOKUNMADAN üç öneri — kick akordu (ölçülmüş "ne olurdu"), synth retrigger, ducking.
// Python referansı: prototype/kbalign/advisor.py (aynı eşikler, spec §5c). Kendi thread'inde çalışır
// (düşük öncelik); ses thread'inin geçmiş tamponlarını yalnız okur, ses yoluna hiçbir şey yazmaz.
#pragma once

#include "Engine.h"

#include <array>
#include <atomic>
#include <cmath>
#include <deque>
#include <limits>
#include <map>
#include <memory>
#include <mutex>

namespace kb {

namespace adv {
constexpr double kMaxSt = 2.0, kStepSt = 0.25;   // aday akort aralığı (kick karakterini korur)
constexpr int kNCand = 17;                        // −2 … +2, 25 cent adımla
constexpr double kMinGainDb = 0.25, kWorstDb = -0.5, kShare = 0.9;
constexpr int kLastHits = 12, kKeepHits = 32;
constexpr double kWinMs = 150.0, kSearchMs = 10.0;
constexpr double kROn = 0.85, kRFree = 0.65;
constexpr int kMinNoteHits = 6;
constexpr double kDuckRho = 0.2, kDuckNearSt = 5.0, kDuckMaxMs = 300.0, kDuckMinMs = 60.0, kDuckDepth = 0.6;
constexpr double kBodyDb = -12.0;
inline double candSt(int i) { return (i - kNCand / 2) * kStepSt; }
}  // namespace adv

enum class Retrig { Unknown = 0, Consistent = 1, Free = 2 };
enum class SuggestMode { None = 0, PerNote = 1, Learn = 2, PerHit = 3 };

struct Advice {
    int hits = 0;                       // değerlendirilen vuruş
    double kickHz = std::numeric_limits<double>::quiet_NaN();
    double kickBodyMs = std::numeric_limits<double>::quiet_NaN();
    std::map<int, int> notes;           // MIDI → vuruş sayısı
    int topNote = -1;
    double retrigR = -1;
    Retrig retrig = Retrig::Unknown;
    double tuneSt = 0, tuneGain0 = 0, tuneGain = 0, tuneBestSt = 0, tuneWorst = 0;
    double tuneFarSt = std::numeric_limits<double>::quiet_NaN();  // en çok çalan notaya uzaklık
    std::array<double, adv::kNCand> tuneCurve{};
    double rho = 0, rhoTuned = 0;
    bool duck = false;
    double duckLenMs = 0, duckDepth = adv::kDuckDepth;
    SuggestMode mode = SuggestMode::None;
};

struct AdvHit {
    int64_t t = 0;
    double kickHz = std::numeric_limits<double>::quiet_NaN();
    double bodyMs = std::numeric_limits<double>::quiet_NaN();
    int note = -1;
    cplx z{0, 0};
    std::array<double, adv::kNCand> g{}, rho{};
};

class Advisor {
public:
    void prepare(AudioEngine* e, double fs);
    void clear();                    // ölçümü baştan başlat (ör. kick değiştirildi)
    void step();                     // danışman thread'i
    Advice result() { std::lock_guard<std::mutex> g(mtx); return res; }
    int version() const { return ver.load(); }
    // vuruş özelliklerinden öneri (saf fonksiyon; test edilir)
    static Advice aggregate(const std::deque<AdvHit>& hs);

private:
    bool analyse(int64_t t0, AdvHit& out);
    AudioEngine* eng = nullptr;
    double fs = 48000;
    std::unique_ptr<Analyzer> an;
    std::deque<int64_t> queue;
    std::deque<AdvHit> hits;
    int seen = 0;
    int64_t lastT = -1;
    std::mutex mtx;
    Advice res;
    std::atomic<int> ver{0};
    std::atomic<bool> clearReq{false};
    std::vector<double> bk, bb, br, kk;
};

} // namespace kb
