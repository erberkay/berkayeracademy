// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Advisor.h"

#include <algorithm>
#include <numeric>

namespace kb {

void Advisor::prepare(AudioEngine* e, double sampleRate) {
    std::lock_guard<std::mutex> g(mtx);
    eng = e;
    fs = sampleRate;
    an = std::make_unique<Analyzer>(fs, kAnalysisHz);
    queue.clear();
    hits.clear();
    seen = eng ? eng->onsetCount.load() : 0;
    lastT = -1;
    res = Advice{};
    ver.fetch_add(1);
}

void Advisor::clear() { clearReq.store(true); }

static double median(std::vector<double> v) {
    if (v.empty()) return std::numeric_limits<double>::quiet_NaN();
    std::sort(v.begin(), v.end());
    const size_t n = v.size();
    return n % 2 ? v[n / 2] : 0.5 * (v[n / 2 - 1] + v[n / 2]);
}

static double gainDb(double rho, double ek, double eb) {
    return 10.0 * std::log10((ek + eb + 2.0 * rho * std::sqrt(ek * eb)) / (ek + eb + 1e-30) + 1e-30);
}

void Advisor::step() {
    std::lock_guard<std::mutex> g(mtx);
    if (!eng || !an) return;
    if (clearReq.exchange(false)) { queue.clear(); hits.clear(); res = Advice{}; ver.fetch_add(1); }
    // yeni onset'ler (ses thread'inin geçmişi; 64'lük halka — taşan eskiler atlanır)
    const int cnt = eng->onsetCount.load(std::memory_order_acquire);
    if (cnt - seen > AudioEngine::kOnsetHist) seen = cnt - AudioEngine::kOnsetHist;
    for (; seen < cnt; ++seen) {
        const int64_t t = eng->onsetRaw[(size_t) (seen % AudioEngine::kOnsetHist)].load(std::memory_order_relaxed);
        if (t > lastT + (int64_t) (0.05 * fs)) { queue.push_back(t); lastT = t; }
    }
    // hazır olan en eski vuruşu işle (adım başına bir vuruş: thread'i kısa tutar)
    const int64_t written = std::min({eng->hKickLow.available(), eng->hBassLow.available(), eng->hBassRaw.available()});
    while (!queue.empty()) {
        AdvHit h;
        const int64_t t0 = queue.front();
        const int64_t need = t0 + (int64_t) (0.70 * fs);
        if (written < need) break;
        queue.pop_front();
        if (!analyse(t0, h)) continue;  // veri ezildi
        hits.push_back(h);
        while ((int) hits.size() > adv::kKeepHits) hits.pop_front();
        res = aggregate(hits);
        ver.fetch_add(1);
        break;
    }
}

bool Advisor::analyse(int64_t t0, AdvHit& h) {
    const double fa = an->fa();
    const int M = an->decimFactor();
    AnalysisParams ap;
    ap.dMinMs = -adv::kSearchMs;
    ap.dMaxMs = adv::kSearchMs;
    // Analyzer::hit segmenti (onset'e göre, tam hız) — akort adayları için %15 pay
    const int W = (int) std::lround(ap.winMs * fa / 1000.0);
    const int tmin = (int) std::floor(ap.dMinMs * fa / 1000.0) - Analyzer::kInterpHalf - 1;
    const int tmax = (int) std::ceil(ap.dMaxMs * fa / 1000.0) + Analyzer::kInterpHalf + 1;
    const int segStart = -tmax - Analyzer::kPad;
    const int segLen = W + (tmax - tmin) + 2 * Analyzer::kPad;
    const int64_t pre = (int64_t) std::floor(1.15 * ((double) segStart * M - 4 * M - 2)) - 8;
    const int64_t post = std::max<int64_t>((int64_t) std::ceil(1.15 * ((double) (segStart + segLen) * M + 4 * M + 2)),
                                           (int64_t) (0.62 * fs)) + 8;
    const int64_t a = t0 + pre, b = t0 + post;
    auto cp = [&](const HistoryRing& r, std::vector<double>& out) {
        out.assign((size_t) (b - a), 0.0);
        return r.copy(a, b, out.data());
    };
    if (!cp(eng->hKickLow, bk) || !cp(eng->hBassLow, bb) || !cp(eng->hBassRaw, br)) return false;
    const long long n = (long long) bk.size();
    const long long i0 = -pre;  // onset'in tampondaki indeksi
    h.t = t0;

    // kick baskın frekansı (0–150 ms, desimasyonlu, sıfır dolgulu FFT tepesi + parabolik inceltme)
    {
        const auto kd = an->decimate(bk.data(), n, i0, W);
        double mx = 0;
        for (double v : kd) mx = std::max(mx, std::abs(v));
        if (mx > 1e-6) {
            constexpr int order = 13, N = 1 << order;
            FFT f(order);
            std::vector<cplx> X((size_t) N, 0.0);
            for (int i = 0; i < W && i < N; ++i) X[(size_t) i] = kd[(size_t) i];
            f.perform(X.data(), false);
            const int lo = (int) std::ceil(25.0 * N / fa), hi = (int) std::floor(150.0 * N / fa);
            int pk = lo;
            for (int i = lo; i <= hi; ++i) if (std::abs(X[(size_t) i]) > std::abs(X[(size_t) pk])) pk = i;
            const double A = std::abs(X[(size_t) pk - 1]), B = std::abs(X[(size_t) pk]), C = std::abs(X[(size_t) pk + 1]);
            const double den = A - 2 * B + C;
            const double off = std::abs(den) > 1e-12 ? std::clamp(0.5 * (A - C) / den, -1.0, 1.0) : 0.0;
            h.kickHz = (pk + off) * fa / N;
        }
    }
    // kick gövdesi: 5 ms kayan RMS zarfı tepeden kBodyDb düşene kadar
    {
        const int nb = (int) std::lround(600.0 * fa / 1000.0);
        const auto kd = an->decimate(bk.data(), n, i0, nb);
        const int w = std::max(1, (int) std::lround(0.005 * fa));
        std::vector<double> env((size_t) nb, 0.0);
        const int off = (w - 1) / 2;  // numpy convolve "same" hizası
        for (int i = 0; i < nb; ++i) {
            double s = 0;
            for (int k = 0; k < w; ++k) {
                const int j = i + off - k;
                if (j >= 0 && j < nb) s += kd[(size_t) j] * kd[(size_t) j];
            }
            env[(size_t) i] = std::sqrt(s / w);
        }
        const int pk = (int) (std::max_element(env.begin(), env.end()) - env.begin());
        if (env[(size_t) pk] > 1e-6) {
            const double thr = env[(size_t) pk] * std::pow(10.0, adv::kBodyDb / 20.0);
            int j = nb;
            for (int i = pk; i < nb; ++i) if (env[(size_t) i] < thr) { j = i; break; }
            h.bodyMs = 1000.0 * j / fa;
        }
    }
    // bas notası (120 ms, YIN) ve gecikme 0'da faz ilişkisi
    {
        const int n2 = (int) (0.12 * fa);
        const auto bd = an->decimate(br.data(), n, i0, n2);
        if (auto note = detectNote(bd, fa)) h.note = *note;
        const auto kd = an->decimate(bk.data(), n, i0, W);
        const auto bl = an->decimate(bb.data(), n, i0, W);
        const auto ka = analyticPow2(kd), ba = analyticPow2(bl);
        cplx z = 0;
        for (int i = 0; i < W; ++i) z += std::conj(ba[(size_t) i]) * ka[(size_t) i];
        h.z = z;
    }
    // akort adayları: kick'i Warp kapalı sampler gibi yeniden örnekle, gerçek basla en iyi (d, θ)
    {
        const int Wf = (int) std::lround(adv::kWinMs * fs / 1000.0);
        double eb = 0;
        for (int i = 0; i < Wf; ++i) eb += bb[(size_t) (i0 + i)] * bb[(size_t) (i0 + i)];
        kk.assign(bk.size(), 0.0);
        const auto bd = an->segment(bb.data(), n, i0, ap);
        for (int c = 0; c < adv::kNCand; ++c) {
            const double st = adv::candSt(c);
            const double r = std::pow(2.0, st / 12.0);
            const std::vector<double>* src = &bk;
            if (st != 0.0) {
                for (long long i = 0; i < n; ++i) {
                    const double x = (double) i0 + (double) (i - i0) * r;
                    const long long xi = (long long) std::floor(x);
                    const double mu = x - (double) xi;
                    kk[(size_t) i] = (xi < 0 || xi + 1 >= n) ? 0.0 : (1.0 - mu) * bk[(size_t) xi] + mu * bk[(size_t) xi + 1];
                }
                src = &kk;
            }
            double ek = 0;
            for (int i = 0; i < Wf; ++i) ek += (*src)[(size_t) (i0 + i)] * (*src)[(size_t) (i0 + i)];
            h.rho[(size_t) c] = an->rhoQuick(an->segment(src->data(), n, i0, ap), bd, ap);
            h.g[(size_t) c] = gainDb(h.rho[(size_t) c], ek, eb);
        }
    }
    return true;
}

Advice Advisor::aggregate(const std::deque<AdvHit>& hs) {
    Advice A;
    A.hits = (int) hs.size();
    if (hs.empty()) return A;
    std::vector<double> fk, body;
    std::map<int, std::vector<cplx>> byNote;
    for (auto& h : hs) {
        if (std::isfinite(h.kickHz)) fk.push_back(h.kickHz);
        if (std::isfinite(h.bodyMs)) body.push_back(h.bodyMs);
        if (h.note >= 0) { A.notes[h.note]++; byNote[h.note].push_back(h.z); }
    }
    A.kickHz = median(fk);
    A.kickBodyMs = median(body);
    int best = 0;
    for (auto& [nt, c] : A.notes) if (c > best) { best = c; A.topNote = nt; }  // eşitlikte küçük nota (Python ile aynı)
    // retrigger
    double num = 0, den = 0;
    for (auto& [nt, zs] : byNote) {
        cplx m = 0;
        int k = 0;
        for (auto& z : zs) if (std::abs(z) > 0) { m += z / std::abs(z); ++k; }
        if (k >= 3) { num += std::abs(m); den += k; }  // k·|ortalama| = |toplam|
    }
    if (den > 0) {
        A.retrigR = num / den;
        if (den >= adv::kMinNoteHits)
            A.retrig = A.retrigR >= adv::kROn ? Retrig::Consistent : (A.retrigR < adv::kRFree ? Retrig::Free : Retrig::Unknown);
    }
    // akort (son kLastHits vuruş)
    const int n0 = std::max(0, (int) hs.size() - adv::kLastHits);
    const int nu = (int) hs.size() - n0;
    std::array<double, adv::kNCand> mean{}, rmean{}, worst{};
    const int ic = adv::kNCand / 2;
    for (int c = 0; c < adv::kNCand; ++c) {
        double s = 0, sr = 0, w = 1e9;
        for (int j = n0; j < (int) hs.size(); ++j) {
            s += hs[(size_t) j].g[(size_t) c];
            sr += hs[(size_t) j].rho[(size_t) c];
            w = std::min(w, hs[(size_t) j].g[(size_t) c] - hs[(size_t) j].g[(size_t) ic]);
        }
        mean[(size_t) c] = s / nu; rmean[(size_t) c] = sr / nu; worst[(size_t) c] = w;
    }
    A.tuneCurve = mean;
    A.tuneGain0 = mean[(size_t) ic];
    A.rho = rmean[(size_t) ic];
    int ib = 0;
    for (int c = 1; c < adv::kNCand; ++c) if (mean[(size_t) c] > mean[(size_t) ib]) ib = c;
    A.tuneBestSt = adv::candSt(ib);
    const double target = A.tuneGain0 + adv::kShare * (mean[(size_t) ib] - A.tuneGain0);
    int pick = ic;
    bool have = false;
    for (int c = 0; c < adv::kNCand; ++c) {
        if (mean[(size_t) c] < target || worst[(size_t) c] < adv::kWorstDb) continue;
        if (!have || std::abs(adv::candSt(c)) < std::abs(adv::candSt(pick)) ||
            (std::abs(adv::candSt(c)) == std::abs(adv::candSt(pick)) && mean[(size_t) c] > mean[(size_t) pick])) { pick = c; have = true; }
    }
    if (have && pick != ic && mean[(size_t) pick] - A.tuneGain0 >= adv::kMinGainDb) {
        A.tuneSt = adv::candSt(pick);
        A.tuneGain = mean[(size_t) pick];
        A.tuneWorst = worst[(size_t) pick];
        A.rhoTuned = rmean[(size_t) pick];
    } else {
        A.tuneGain = A.tuneGain0;
        A.rhoTuned = A.rho;
    }
    if (std::isfinite(A.kickHz) && A.topNote >= 0)
        A.tuneFarSt = 12.0 * std::log2(440.0 * std::pow(2.0, (A.topNote - 69) / 12.0) / A.kickHz);
    // ducking
    const bool near = std::isfinite(A.tuneFarSt) && std::abs(A.tuneFarSt - A.tuneSt) <= adv::kDuckNearSt;
    if (A.rhoTuned < adv::kDuckRho && near && std::isfinite(A.kickBodyMs)) {
        A.duck = true;
        A.duckLenMs = std::clamp(A.kickBodyMs, adv::kDuckMinMs, adv::kDuckMaxMs);
    }
    // mod
    int multi = 0;
    for (auto& [nt, c] : A.notes) if (c >= 2) ++multi;
    A.mode = A.retrig == Retrig::Free ? SuggestMode::PerHit : (multi >= 2 ? SuggestMode::PerNote : SuggestMode::Learn);
    return A;
}

} // namespace kb
