// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Engine.h"

#include <algorithm>
#include <chrono>
#include <cmath>

namespace kb {

static constexpr int64_t kHistSize = 1 << 20;  // ≥ 5,4 s @192 kHz

// ═════════════════════════════════════════════════════════ AudioEngine

void AudioEngine::prepare(double sampleRate, int /*maxBlock*/, int numChannels, LatencyMode lm, bool crossover,
                          double fc, double xf) {
    fs = sampleRate;
    lmode = lm;
    xover = crossover;
    xfadeMs = xf;
    fcCur = fc;
    nch = std::max(1, numChannels);
    L = latencySamples(fs, lm);
    hsamp = hilbertHalfSamples(fs, lm);
    X = std::max(1, (int) std::lround(xfadeMs * fs / 1000.0));
    const auto h = hilbertFir(fs, latencySpec(lm).hilbertMs);
    const int64_t ringSize = L + (int64_t) (0.06 * fs) + 1024;
    ch.assign((size_t) nch, Chan{});
    for (auto& c : ch) {
        c.lp.design(fs, fc, false);
        c.hp.design(fs, fc, true);
        c.conv.prepare(h, kConvBlock);
        c.lo.allocate(ringSize);
        c.v.allocate(ringSize);
        c.hi.allocate(ringSize);
        c.dry.allocate(ringSize);
    }
    aKick.design(fs, kAnalysisHz, false);
    aBass.design(fs, kAnalysisHz, false);
    onset.prepare(fs);
    kickDelay.allocate(ringSize);
    for (HistoryRing* r : {&hKickLow, &hBassLow, &hBassRaw, &hKickRaw, &hOut}) r->allocate(kHistSize);
    reset();
}

void AudioEngine::reset() {
    for (auto& c : ch) {
        c.lp.reset(); c.hp.reset(); c.conv.reset();
        c.lo.clear(); c.v.clear(); c.hi.clear(); c.dry.clear();
        c.monoLp.design(fs, 100, false); c.monoHp.design(fs, 100, true);
        c.monoMlp.design(fs, 100, false); c.monoMhp.design(fs, 100, true);
    }
    aKick.reset(); aBass.reset(); onset.reset();
    kickDelay.clear();
    nIn = 0;
    nInPub.store(0);
    curD = curTh = nextD = nextTh = 0;
    fadeStart = fadeEnd = -1;
    nPending = nPendTgt = 0;
    tgtD = tgtTh = 0;
    knobInit = false;
    nDuck = 0; duckStart = -1; lastBeat = -1;
    {
        const auto ph = placeholderCurve();
        curveN = (int) ph.size();
        for (int q = 0; q < curveN; ++q) curve[(size_t) q] = ph[(size_t) q];
    }
    bypassMix = monoMix = 0;
    polGain = 1;
    ParamEvent e;
    while (events.pop(e)) {}
    while (contTargets.pop(e)) {}
    OnsetEvent o;
    while (onsets.pop(o)) {}
    for (HistoryRing* r : {&hKickLow, &hBassLow, &hBassRaw, &hKickRaw, &hOut}) r->publish(0);
    onsetCount.store(0);
}

void AudioEngine::process(float* const* bass, int numCh, const float* const* kick, int kickCh, int n,
                          const BlockParams& bp) noexcept {
    // analizden gelen olaylar → sıralı bekleme listesi
    ParamEvent e;
    while (events.pop(e)) {
        dbgPopped.fetch_add(1, std::memory_order_relaxed);
        if (nPending >= (int) pending.size()) continue;
        int k = nPending++;
        while (k > 0 && pending[(size_t) k - 1].c > e.c) { pending[(size_t) k] = pending[(size_t) k - 1]; --k; }
        pending[(size_t) k] = e;
    }
    while (contTargets.pop(e)) {
        if (nPendTgt < (int) pendingTargets.size()) pendingTargets[(size_t) nPendTgt++] = e;
    }
    if (bp.curvePts && bp.curveN >= 2) {
        curveN = std::min(bp.curveN, kMaxCurvePoints);
        for (int q = 0; q < curveN; ++q) curve[(size_t) q] = bp.curvePts[q];
    }  // aksi hâlde reset()'te yüklenen yer tutucu eğri kalır
    if (std::abs(bp.fc - fcCur) > 1e-6) {
        fcCur = bp.fc;
        for (auto& c : ch) { c.lp.retune(fs, fcCur, false); c.hp.retune(fs, fcCur, true); }
    }
    onset.setTriggerHz(bp.trigHz);
    if (bp.bassMono) for (auto& c : ch) {
        c.monoLp.retune(fs, bp.monoHz, false); c.monoHp.retune(fs, bp.monoHz, true);
        c.monoMlp.retune(fs, bp.monoHz, false); c.monoMhp.retune(fs, bp.monoHz, true);
    }
    if (!knobInit) { knobD = bp.manualD; knobTh = bp.manualTh; knobInit = true; }
    const double knobStepD = 50.0 / fs;    // ms/örnek (50 ms/s)
    const double knobStepT = 1800.0 / fs;  // °/örnek
    const double scShift = bp.scOffsetMs;
    const int64_t scSamples = (int64_t) std::llround(bp.scOffsetMs * fs / 1000.0);
    const double stepD = bp.rateMsPerS / fs, stepT = bp.rateDegPerS / fs;
    const double dMin = -(double) (L - hsamp - kConvBlock - 3) * 1000.0 / fs;
    const double dMax = 50.0;
    const double bypassStep = 1.0 / (0.02 * fs), monoStep = bypassStep;
    const double ppqPerSample = bp.bpm / 60.0 / fs;

    auto chain = [&](const Chan& c, int64_t t, double d, double th) {
        d = std::clamp(d, dMin, dMax);
        const double D = L + d * fs / 1000.0;
        const double s = std::sin(th * kPi / 180.0), co = std::cos(th * kPi / 180.0);
        return co * fracRead(c.lo, t, D) - s * fracRead(c.v, t, D - hsamp - kConvBlock);
    };

    double monoOut = 0;
    float pkIn = 0, pkOut = 0, pkKick = 0;
    for (int i = 0; i < n; ++i) {
        const int64_t t = nIn + i;
        double k = 0;
        for (int c = 0; c < kickCh; ++c) k += kick[c][i];
        if (kickCh > 0) k /= kickCh;
        double b = 0;
        for (int c = 0; c < numCh; ++c) { b += bass[c][i]; pkIn = std::max(pkIn, std::abs(bass[c][i])); }
        pkKick = std::max(pkKick, (float) std::abs(k));
        b /= std::max(1, numCh);
        hKickLow.write(t, (float) aKick.process(k));
        hBassLow.write(t, (float) aBass.process(b));
        hBassRaw.write(t, (float) b);
        hKickRaw.write(t, (float) k);
        kickDelay.write(t, (float) k);
        const long long on = onset.process(k, t);
        if (on >= 0) {
            onsets.push({on});
            const int idx = onsetCount.load(std::memory_order_relaxed);
            onsetHist[(size_t) (idx % kOnsetHist)].store(on - scSamples, std::memory_order_relaxed);
            onsetCount.store(idx + 1, std::memory_order_release);
            if (!bp.duckTempo && nDuck < (int) duckOnsets.size()) duckOnsets[(size_t) nDuck++] = on - scSamples;
        }
        for (int c = 0; c < numCh && c < nch; ++c) {
            auto& C = ch[(size_t) c];
            const double x = bass[c][i];
            C.dry.write(t, (float) x);
            double lo = x, hi = 0;
            if (xover) { lo = C.lp.process(x); hi = C.hp.process(x); }
            C.lo.write(t, (float) lo);
            C.v.write(t, (float) C.conv.process(lo));
            C.hi.write(t, (float) hi);
        }

        // ── parametre durumu (içerik zamanı cc)
        const int64_t cc = t - L;
        while (nPending > 0 && pending[0].c - X <= cc) {
            const auto ev = pending[0];
            for (int q = 1; q < nPending; ++q) pending[(size_t) q - 1] = pending[(size_t) q];
            --nPending;
            if (fadeEnd > cc) { curD = nextD; curTh = nextTh; }  // önceki geçişi bitir
            nextD = ev.d; nextTh = ev.th;
            fadeStart = std::max(ev.c - X, cc);
            fadeEnd = fadeStart + X;
        }
        if (fadeEnd >= 0 && cc >= fadeEnd) { curD = nextD; curTh = nextTh; fadeStart = fadeEnd = -1; }
        if (continuous.load(std::memory_order_relaxed)) {
            int keep = 0;
            for (int q = 0; q < nPendTgt; ++q) {
                if (pendingTargets[(size_t) q].c <= cc) { tgtD = pendingTargets[(size_t) q].d; tgtTh = pendingTargets[(size_t) q].th; }
                else pendingTargets[(size_t) keep++] = pendingTargets[(size_t) q];
            }
            nPendTgt = keep;
            curD += std::clamp(tgtD - curD, -stepD, stepD);
            const double dt = std::fmod(tgtTh - curTh + 540.0, 360.0) - 180.0;
            curTh += std::clamp(dt, -stepT, stepT);
        }
        knobD += std::clamp(bp.manualD - knobD, -knobStepD, knobStepD);
        knobTh += std::clamp(bp.manualTh - knobTh, -knobStepT, knobStepT);
        const double offD = knobD - scShift;

        // ducking zarfı
        while (nDuck > 0 && duckOnsets[0] <= cc) {
            duckStart = duckOnsets[0];
            for (int q = 1; q < nDuck; ++q) duckOnsets[(size_t) q - 1] = duckOnsets[(size_t) q];
            --nDuck;
        }
        double lenS = bp.duckLenMs / 1000.0;
        if (bp.duckTempo && bp.hasPpq && bp.playing) {
            // VARSAYIM: host ppq'su blok başındaki GİRİŞ örneğine aittir → içerik zamanı = giriş − L
            const double ppqC = bp.ppq + (i - L) * ppqPerSample;
            const double beat = std::floor(ppqC / std::max(1e-6, bp.duckBeats));
            if (beat != lastBeat) { if (lastBeat >= 0 || ppqC >= 0) duckStart = cc; lastBeat = beat; }
            lenS = bp.duckBeats * 60.0 / std::max(1.0, bp.bpm);
        }
        double g = 1.0;
        if (bp.duck && duckStart >= 0) {
            const double u = (double) (cc - duckStart) / (lenS * fs);
            if (u >= 0 && u < 1) g = 1.0 - bp.duckDepth * (1.0 - curveEvalN(curve.data(), curveN, u));
        }

        const bool fading = fadeEnd >= 0 && cc >= fadeStart && cc < fadeEnd;
        const double w = fading ? 0.5 - 0.5 * std::cos(kPi * (double) (cc - fadeStart) / X) : 0.0;
        bypassMix = std::clamp(bypassMix + (bp.bypass ? bypassStep : -bypassStep), 0.0, 1.0);
        monoMix = std::clamp(monoMix + (bp.bassMono && numCh == 2 ? monoStep : -monoStep), 0.0, 1.0);
        polGain = std::clamp(polGain + (bp.polarity ? -2.0 : 2.0) / (0.01 * fs), -1.0, 1.0);
        double outs[2] = {0, 0};
        for (int c = 0; c < numCh && c < nch; ++c) {
            auto& C = ch[(size_t) c];
            double yl = chain(C, t, curD + offD, curTh + knobTh);
            if (fading) yl = (1.0 - w) * yl + w * chain(C, t, nextD + offD, nextTh + knobTh);
            yl *= polGain;
            const double yh = xover ? (double) C.hi.read(t - L) : 0.0;
            double y;
            if (bp.listen == Listen::LowSolo) y = yl * g;
            else if (bp.duckTarget == DuckTarget::LowBand) y = yl * g + yh;
            else y = (yl + yh) * g;
            if (bp.listen == Listen::KickPlusBass) y += kickDelay.read(t - L + scSamples);
            outs[c < 2 ? c : 1] = y;
            if (numCh != 2) bass[c][i] = (float) ((1.0 - bypassMix) * y * bp.outGain + bypassMix * C.dry.read(t - L));
        }
        if (numCh == 2) {
            double l = outs[0], r = outs[1];
            if (monoMix > 0) {
                auto& A = ch[0];
                const double M = 0.5 * (l + r), S = 0.5 * (l - r);
                const double Map = A.monoMlp.process(M) + A.monoMhp.process(M);
                const double Sout = A.monoHp.process(S) + bp.monoWidth * A.monoLp.process(S);
                l = (1 - monoMix) * l + monoMix * (Map + Sout);
                r = (1 - monoMix) * r + monoMix * (Map - Sout);
            }
            bass[0][i] = (float) ((1.0 - bypassMix) * l * bp.outGain + bypassMix * ch[0].dry.read(t - L));
            bass[1][i] = (float) ((1.0 - bypassMix) * r * bp.outGain + bypassMix * ch[1].dry.read(t - L));
            monoOut = 0.5 * (bass[0][i] + bass[1][i]);
        } else {
            monoOut = bass[0][i];
        }
        hOut.write(t, (float) monoOut);
        for (int c = 0; c < numCh; ++c) pkOut = std::max(pkOut, std::abs(bass[c][i]));
    }
    nIn += n;
    nInPub.store(nIn, std::memory_order_release);
    for (HistoryRing* r : {&hKickLow, &hBassLow, &hBassRaw, &hKickRaw, &hOut}) r->publish(nIn);
    uiInPeak.store(std::max(uiInPeak.load(std::memory_order_relaxed), pkIn), std::memory_order_relaxed);
    uiOutPeak.store(std::max(uiOutPeak.load(std::memory_order_relaxed), pkOut), std::memory_order_relaxed);
    uiKickPeak.store(std::max(uiKickPeak.load(std::memory_order_relaxed), pkKick), std::memory_order_relaxed);
    uiD.store(curD + knobD - scShift, std::memory_order_relaxed);
    uiTh.store(curTh + knobTh, std::memory_order_relaxed);
    uiPos.store(nIn, std::memory_order_relaxed);
    phValid.store(bp.hasPpq, std::memory_order_relaxed);
    phPpq.store(bp.ppq, std::memory_order_relaxed);
    phBpm.store(bp.bpm, std::memory_order_relaxed);
    phPlaying.store(bp.playing, std::memory_order_relaxed);
    phPos.store(nIn - n, std::memory_order_release);
}

// ═════════════════════════════════════════════════════════ AlignEngine

AlignEngine::AlignEngine() = default;

void AlignEngine::prepare(AudioEngine* e, double sampleRate, double fcIn) {
    std::lock_guard<std::mutex> g(mtx);
    eng = e;
    fs = sampleRate;
    fc = fcIn;
    an = std::make_unique<Analyzer>(fs, fc);
    pend.clear();
    learnSegs.clear();
    noteSegs.clear();
    contC.clear();
    gCs.clear();
    gEst.reset();
    contLastT = -1;
    cur = {0, 0};
    pendingNext.reset();
    hits.clear();
}

void AlignEngine::setSettings(const AlignSettings& s) {
    std::lock_guard<std::mutex> g(mtx);
    const bool modeChanged = s.mode != set.mode;
    set = s;
    if (modeChanged && eng) {
        eng->continuous.store(s.mode == Mode::Continuous);
        contC.clear();
        contLastT = -1;
        if (s.mode == Mode::Manual) {  // otomatik payı sıfırla (crossfade ile)
            eng->events.push({eng->inputCount() - eng->latency() + eng->latency() / 2, 0.0, 0.0});
            cur = {0, 0};
        }
    }
}

AlignSettings AlignEngine::settings() { std::lock_guard<std::mutex> g(mtx); return set; }

void AlignEngine::startLearn() {
    std::lock_guard<std::mutex> g(mtx);
    learnSegs.clear();
    learnCollected.store(0);
    learnResult.reset();
    learning.store(true);
}

std::optional<std::pair<double, double>> AlignEngine::takeLearnResult() {
    std::lock_guard<std::mutex> g(mtx);
    auto r = learnResult;
    learnResult.reset();
    return r;
}

std::map<int, NoteEntry> AlignEngine::noteTable() { std::lock_guard<std::mutex> g(mtx); return table; }
void AlignEngine::setNoteTable(const std::map<int, NoteEntry>& t) { std::lock_guard<std::mutex> g(mtx); table = t; noteSegs.clear(); }
void AlignEngine::clearNote(int note) { std::lock_guard<std::mutex> g(mtx); table.erase(note); noteSegs.erase(note); }
void AlignEngine::lockNote(int note, bool lock) { std::lock_guard<std::mutex> g(mtx); if (table.count(note)) table[note].locked = lock; }
void AlignEngine::setNoteValue(int note, double d, double th) {
    std::lock_guard<std::mutex> g(mtx);
    auto& e = table[note];
    e.d = d; e.th = th; e.manual = true; e.locked = true;
}
std::vector<AlignEngine::HitInfo> AlignEngine::recentHits() { std::lock_guard<std::mutex> g(mtx); return hits; }

bool AlignEngine::copyRegion(const HistoryRing& r, int64_t a, int64_t b, std::vector<double>& out) {
    out.assign((size_t) std::max<int64_t>(0, b - a), 0.0);
    return r.copy(a, b, out.data());
}

void AlignEngine::emit(int64_t c, double d, double th) {
    eng->events.push({c, d, th});
    dbgEmitted.fetch_add(1);
    cur = {d, th};
}

double AlignEngine::objAt(const std::vector<const HitSegment*>& segs, double d, double th) const {
    ExactEval ex(segs);
    const cplx z = ex(d * an->fa() / 1000.0);
    return (z * std::polar(1.0, -th * kPi / 180.0)).real();
}

void AlignEngine::step() {
    std::lock_guard<std::mutex> g(mtx);
    if (!eng || !an) return;
    OnsetEvent o;
    while (eng->onsets.pop(o)) {
        if (set.mode == Mode::Manual) continue;
        if (pendingNext) { emit(o.t - (int64_t) (0.001 * fs), pendingNext->first, pendingNext->second); pendingNext.reset(); }
        pend.push_back({o.t});
    }
    const int64_t written = std::min(eng->hKickLow.available(), eng->hBassLow.available());
    // her bekleyen vuruşu dene (nota modunda aşama 0 bir öncekinin tam analizini beklemez)
    for (size_t i = 0; i < pend.size();) {
        const auto t0c = std::chrono::steady_clock::now();
        const bool done = processHit(pend[i], written);
        const double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0c).count();
        dbgSumMs.store(dbgSumMs.load() + ms);
        if (ms > dbgMaxMs.load()) dbgMaxMs.store(ms);
        if (done) pend.erase(pend.begin() + (ptrdiff_t) i);
        else ++i;
    }
    if (hits.size() > 64) hits.erase(hits.begin(), hits.begin() + (ptrdiff_t) (hits.size() - 64));
}

bool AlignEngine::processHit(Pending& pd, int64_t written) {
    const int64_t t0 = pd.t0;
    const double fa = an->fa();
    const int M = an->decimFactor();
    const auto& ap = set.ap;
    const double L_ms = eng->latency() * 1000.0 / fs;
    const double budget = L_ms - 10.0 - 1.0 - kRtMarginMs;  // Python modes.simulate ile aynı
    // tam analiz için gereken aralık (Python Analyzer.hit segment sınırları)
    auto segBounds = [&](const AnalysisParams& p) {
        const int ws = (int) std::lround(p.winStartMs * fa / 1000.0);
        const int W = (int) std::lround(p.winMs * fa / 1000.0);
        const int tmin = (int) std::floor(p.dMinMs * fa / 1000.0) - Analyzer::kInterpHalf - 1;
        const int tmax = (int) std::ceil(p.dMaxMs * fa / 1000.0) + Analyzer::kInterpHalf + 1;
        const int segStart = -tmax - Analyzer::kPad + ws;
        const int segLen = W + (tmax - tmin) + 2 * Analyzer::kPad;
        const int gd = 4 * M;
        return std::pair<int64_t, int64_t>{(int64_t) segStart * M - gd - 2, (int64_t) (segStart + segLen) * M + gd + 2};
    };
    auto runHit = [&](const AnalysisParams& p, std::optional<double> availMs) -> std::optional<HitResult> {
        auto [pre, post] = segBounds(p);
        int64_t end = t0 + post;
        int64_t nValid = post - pre;
        if (availMs) {
            const int64_t lim = t0 + (int64_t) std::floor(*availMs * fs / 1000.0);
            end = std::min(end, lim);
            nValid = std::max<int64_t>(0, lim - (t0 + pre));
        }
        if (written < end) return std::nullopt;
        const int64_t a = t0 + pre;
        if (!copyRegion(eng->hKickLow, a, end, bufK) || !copyRegion(eng->hBassLow, a, end, bufB)) {
            HitResult bad; bad.ok = false; return bad;  // veri ezildi: vuruşu atla
        }
        return an->hit(bufK.data(), bufB.data(), std::min<int64_t>(nValid, (int64_t) bufK.size()), -pre, p);
    };

    const Mode mode = set.mode;
    HitInfo info{t0, cur.first, cur.second, 0, -1, false};

    if (mode == Mode::PerHit) {
        const double W = std::clamp(budget - ap.winStartMs - std::max(0.0, -ap.dMinMs) - 1.0, 10.0, 150.0);
        AnalysisParams hp = ap;
        hp.winMs = W;
        const double need = ap.winStartMs + W + std::max(0.0, -ap.dMinMs);
        auto r = runHit(hp, budget);
        if (!r) return false;
        if (r->ok) {
            const double objCur = objAt({&r->seg}, cur.first, cur.second);
            lastRho.store(r->rho);
            info.rho = r->rho;
            if (r->rho >= set.confMin && r->rho >= objCur + set.accept) {
                const int64_t c = t0 - (int64_t) (0.001 * fs);
                const int64_t outContent = eng->inputCount() - eng->latency();  // ses thread'inin konumu
                dbgLateMs.store((double) (outContent - (c - (int64_t) (0.010 * fs))) * 1000.0 / fs);
                if (need <= budget && outContent < c - (int64_t) (0.010 * fs)) {
                    emit(c, r->dMs, r->theta);
                    info.applied = true;
                } else {
                    pendingNext = std::make_pair(r->dMs, r->theta);
                }
                info.d = r->dMs; info.th = r->theta;
            }
        }
        hits.push_back(info);
        return true;
    }

    // Nota modu, aşama 0 (zamanında): nota tespiti + tablodan uygulama — tam analizi beklemez
    if (mode == Mode::PerNote && pd.stage == 0) {
        const double avail = std::max(10.0, budget);
        const double fmin = std::max(set.fmin, 1.15 * 2000.0 / avail);
        const int nPts = (int) (avail * fa / 1000.0);
        const int64_t a = t0 - 8 * M, bEnd = t0 + (int64_t) nPts * M + 8 * M + 1;
        if (written < bEnd) return false;
        std::vector<double> raw;
        if (copyRegion(eng->hBassRaw, a, bEnd, raw)) {
            auto bd = an->decimate(raw.data(), (long long) raw.size(), 8 * M, nPts);
            auto note = detectNote(bd, fa, fmin);
            std::optional<std::pair<double, double>> target;
            if (note) {
                pd.note = *note;
                auto it = table.find(*note);
                if (it != table.end() && it->second.count + (it->second.manual ? 1 : 0) > 0) target = std::make_pair(it->second.d, it->second.th);
            }
            if (!target && gEst) target = gEst;  // nota bilinmiyor ya da tabloda yok → genel değer
            if (target && (target->first != cur.first || target->second != cur.second)) {
                const int64_t c = t0 - (int64_t) (0.001 * fs);
                if (eng->inputCount() - eng->latency() < c - (int64_t) (0.010 * fs)) emit(c, target->first, target->second);
            }
        }
        pd.stage = 1;
    }
    // Learn / Nota (aşama 1) / Sürekli: tam pencereli analiz (son tarih yok)
    auto full = runHit(ap, std::nullopt);
    if (!full) return false;
    if (!full->ok) { hits.push_back(info); return true; }
    info.rho = full->rho;
    lastRho.store(full->rho);

    if (mode == Mode::Learn) {
        if (learning.load()) {
            if (full->rho >= set.confMin) learnSegs.push_back(full->seg);
            learnCollected.store((int) learnSegs.size());
            if ((int) learnSegs.size() >= set.learnHits) {
                std::vector<const HitSegment*> ps;
                for (auto& s : learnSegs) ps.push_back(&s);
                auto pk = an->joint(ps, full->lags, ap);
                pendingNext = std::make_pair(pk.dMs, pk.theta);
                learnResult = std::make_pair(pk.dMs, pk.theta);
                learning.store(false);
                // bir sonraki onset zaten geldiyse ona uygula
                for (auto& q : pend) if (q.t0 > t0) { emit(q.t0 - (int64_t) (0.001 * fs), pk.dMs, pk.theta); pendingNext.reset(); break; }
            }
        }
    } else if (mode == Mode::PerNote) {
        int key = pd.note;
        if (key < 0) {  // zamanında bilinmedi: geç (uzun pencereli) tespit yalnız tabloyu doldurur
            std::vector<double> raw2;
            const int n2 = (int) (0.12 * fa);
            if (copyRegion(eng->hBassRaw, t0 - 8 * M, t0 + (int64_t) n2 * M + 8 * M + 1, raw2)) {
                auto bd2 = an->decimate(raw2.data(), (long long) raw2.size(), 8 * M, n2);
                if (auto late = detectNote(bd2, fa, set.fmin)) key = *late;
            }
        }
        info.note = key;
        if (key >= 0 && full->rho >= set.confMin) {
            auto& segs = noteSegs[key];
            segs.push_back(full->seg);
            if ((int) segs.size() > set.noteMaxSegs) segs.erase(segs.begin());
            auto& te = table[key];
            if (!te.locked) {
                std::vector<const HitSegment*> ps;
                for (auto& sg : segs) ps.push_back(&sg);
                auto pk = an->joint(ps, full->lags, ap);
                if (te.count == 0 || pk.value >= objAt(ps, te.d, te.th) + set.accept) { te.d = pk.dMs; te.th = pk.theta; }
                te.count++;
            }
        }
        if (full->rho >= set.confMin) {
            gCs.push_back(full->c);
            if ((int) gCs.size() > kGlobalHits) gCs.erase(gCs.begin());
            std::vector<cplx> gm(full->c.size(), 0.0);
            for (auto& v : gCs) if (v.size() == gm.size()) for (size_t i = 0; i < gm.size(); ++i) gm[i] += v[i];
            for (auto& z : gm) z /= (double) gCs.size();
            auto pk = Analyzer::pick(full->lags, gm, fa, ap, nullptr, nullptr);
            if (!gEst) gEst = std::make_pair(pk.dMs, pk.theta);
            else {
                const cplx zo = Analyzer::interpC(full->lags, gm, gEst->first * fa / 1000.0);
                if (pk.value >= (zo * std::polar(1.0, -gEst->second * kPi / 180.0)).real() + set.accept) gEst = std::make_pair(pk.dMs, pk.theta);
            }
        }
    } else if (mode == Mode::Continuous) {
        const double tS = (double) t0 / fs;
        const double decay = contLastT < 0 ? 1.0 : std::exp(-(tS - contLastT) / set.contTauS);
        contLastT = tS;
        double mx = 0;
        for (auto& z : full->c) mx = std::max(mx, std::abs(z));
        if (contC.size() != full->c.size()) { contC.assign(full->c.size(), 0.0); contLags = full->lags; }
        for (size_t i = 0; i < contC.size(); ++i) contC[i] = decay * contC[i] + full->c[i] * (full->rho / (mx + 1e-30));
        auto pk = Analyzer::pick(contLags, contC, fa, ap, nullptr, nullptr);
        const int64_t ready = t0 + (int64_t) ((ap.winStartMs + ap.winMs) * fs / 1000.0);
        eng->contTargets.push({ready - eng->latency(), pk.dMs, pk.theta});
        cur = {pk.dMs, pk.theta};
        info.d = pk.dMs; info.th = pk.theta;
    }
    hits.push_back(info);
    return true;
}

} // namespace kb
