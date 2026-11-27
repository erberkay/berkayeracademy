// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
#include "ConflictDetector.h"

#include <algorithm>
#include <cmath>

namespace pf {

namespace {
inline float smoothstep01(float x) noexcept {
    x = std::clamp(x, 0.0f, 1.0f);
    return x * x * (3.0f - 2.0f * x);
}
inline double dbToPow(float db) noexcept { return std::pow(10.0, (double) db / 10.0); }
inline float powToDb(double p) noexcept { return p > 1e-15 ? (float) (10.0 * std::log10(p)) : kFloorDb; }
inline float powSumDb(float a, float b) noexcept { return powToDb(dbToPow(a) + dbToPow(b)); }
} // namespace

// ───────────────────────────── ConflictDetector
void ConflictDetector::prepare(const std::vector<float>& hz, const ConflictParams& p) {
    prm = p;
    hzGrid = hz;
    const int n = (int) hz.size();
    logHz.resize((size_t) n);
    for (int i = 0; i < n; ++i) logHz[(size_t) i] = std::log2(std::max(1e-3f, hz[(size_t) i]));
    tilt.resize((size_t) n);
    for (int i = 0; i < n; ++i) tilt[(size_t) i] = prm.tiltDbPerOct * (logHz[(size_t) i] - std::log2(1000.0f));
    tm.assign((size_t) n, kFloorDb);
    ts.assign((size_t) n, kFloorDb);
    spreadLo.resize((size_t) n);
    spreadHi.resize((size_t) n);
    for (int i = 0; i < n; ++i) {
        int lo = i, hi = i;
        while (lo > 0 && logHz[(size_t) i] - logHz[(size_t) (lo - 1)] <= prm.spreadOct) --lo;
        while (hi + 1 < n && logHz[(size_t) (hi + 1)] - logHz[(size_t) i] <= prm.spreadOct) ++hi;
        spreadLo[(size_t) i] = lo;
        spreadHi[(size_t) i] = hi;
    }
    spread.assign((size_t) n, kFloorDb);
    scratch.assign((size_t) n, kFloorDb);
}

float ConflictDetector::floorOf(const std::vector<float>& xt, float maxAll, float belowMaxDb) {
    const int n = (int) xt.size();
    float pct = kFloorDb;
    if (n > 0) {
        std::copy(xt.begin(), xt.end(), scratch.begin());
        const int k = std::clamp((int) std::floor(prm.floorPercentile * (float) (n - 1)), 0, n - 1);
        std::nth_element(scratch.begin(), scratch.begin() + k, scratch.begin() + n);
        pct = scratch[(size_t) k];
    }
    // the percentile term may raise the floor, but never above max − 12 dB (a flat spectrum is not "all noise bed")
    return std::max(maxAll - belowMaxDb, std::min(pct + prm.floorAbovePercentileDb, maxAll - 12.0f));
}

// m, s: channel levels (dB). Presence is judged on tilted levels (+tilt dB/oct around 1 kHz) against floors fM/fS
// (tilted); the ratio uses the untilted levels (the tilt cancels in a difference anyway).
void ConflictDetector::channel(const std::vector<float>& m, const std::vector<float>& s, float fM, float fS, float g,
                               std::vector<float>& out) {
    const int n = (int) m.size();
    for (int i = 0; i < n; ++i) {
        float best = kFloorDb;
        for (int j = spreadLo[(size_t) i]; j <= spreadHi[(size_t) i]; ++j) {
            const float v = s[(size_t) j] - prm.spreadSlopeDbPerOct * std::fabs(logHz[(size_t) j] - logHz[(size_t) i]);
            best = std::max(best, v);
        }
        spread[(size_t) i] = best;
    }
    for (int i = 0; i < n; ++i) {
        const float t = tilt[(size_t) i];
        // absolute floor on the real (untilted) level
        const float pmAbs = smoothstep01((m[(size_t) i] - prm.floorAbsDb) / prm.presenceRampDb);
        const float psAbs = smoothstep01((spread[(size_t) i] - prm.floorAbsDb) / prm.presenceRampDb);
        const float pm = pmAbs * smoothstep01((m[(size_t) i] + t - fM) / prm.presenceRampDb);
        const float ps = psAbs * smoothstep01((spread[(size_t) i] + t - fS) / prm.presenceRampDb);
        // gap = how far the gain-staged main sits under the (spread) sidechain; conflict while gap < target
        const float gap = spread[(size_t) i] - (m[(size_t) i] - g);
        const float r = smoothstep01((prm.targetGapDb - gap) / std::max(0.1f, prm.gapRampDb));
        out[(size_t) i] = pm * ps * r;
    }
}

void ConflictDetector::compute(SpectrumFrame& f, float gainOffsetDb) {
    const size_t n = f.hz.size();
    if (hzGrid.size() != n || (n > 0 && hzGrid[0] != f.hz[0]) || (n > 0 && hzGrid[n - 1] != f.hz[n - 1])) prepare(f.hz, prm);
    f.conflictMid.assign(n, 0.0f);
    f.conflictSide.assign(n, 0.0f);
    if (!f.hasSidechain || n == 0) return;
    // signal-wide maximum on tilted levels, Mid and Side together
    auto tiltedMax = [this, n](const std::vector<float>& a, const std::vector<float>& b) {
        float v = kFloorDb;
        for (size_t i = 0; i < n; ++i) v = std::max({v, a[i] + tilt[i], b[i] + tilt[i]});
        return v;
    };
    auto tilted = [this, n](const std::vector<float>& a, std::vector<float>& out) {
        for (size_t i = 0; i < n; ++i) out[i] = a[i] + tilt[i];
    };
    const float maxMain = tiltedMax(f.mainMid, f.mainSide);
    const float maxSc = tiltedMax(f.scMid, f.scSide);
    tilted(f.mainMid, tm);
    const float fMM = floorOf(tm, maxMain, prm.floorBelowMaxDb);
    tilted(f.mainSide, tm);
    const float fMS = floorOf(tm, maxMain, prm.floorBelowMaxDb);
    tilted(f.scMid, ts);
    const float fSM = floorOf(ts, maxSc, prm.scFloorBelowMaxDb);
    tilted(f.scSide, ts);
    const float fSS = floorOf(ts, maxSc, prm.scFloorBelowMaxDb);
    channel(f.mainMid, f.scMid, fMM, fSM, gainOffsetDb, f.conflictMid);
    channel(f.mainSide, f.scSide, fMS, fSS, gainOffsetDb, f.conflictSide);
}

void computeConflict(SpectrumFrame& f, float gainOffsetDb, const ConflictParams& p) {
    ConflictDetector d;
    d.prepare(f.hz, p);
    d.compute(f, gainOffsetDb);
}

// ───────────────────────────── SpectrumAccumulator
void SpectrumAccumulator::reset() {
    count = 0;
    anySc = false;
    binHz = 0.0f;
    hz.clear();
    for (auto* v : {&pMM, &pMS, &pSM, &pSS, &cM, &cS, &wM, &wS, &aMM, &aMS, &aSM, &aSS}) v->clear();
}

void SpectrumAccumulator::add(const SpectrumFrame& f) {
    const size_t n = f.hz.size();
    if (n == 0) return;
    if (hz.size() != n) {
        reset();
        hz = f.hz;
        for (auto* v : {&pMM, &pMS, &pSM, &pSS, &cM, &cS, &wM, &wS, &aMM, &aMS, &aSM, &aSS}) v->assign(n, 0.0);
    }
    const bool hasC = f.conflictMid.size() == n && f.conflictSide.size() == n;
    for (size_t i = 0; i < n; ++i) {
        const double mm = dbToPow(f.mainMid[i]), ms = dbToPow(f.mainSide[i]);
        pMM[i] += mm;
        pMS[i] += ms;
        const double sm = dbToPow(f.scMid[i]), ss = dbToPow(f.scSide[i]);
        pSM[i] += sm;
        pSS[i] += ss;
        // sidechain-power-weighted sums: levels "while the sidechain is active"
        aMM[i] += mm * sm;
        aMS[i] += ms * ss;
        aSM[i] += sm * sm;
        aSS[i] += ss * ss;
        if (hasC && f.hasSidechain) {
            cM[i] += (double) f.conflictMid[i] * sm;
            cS[i] += (double) f.conflictSide[i] * ss;
            wM[i] += sm;
            wS[i] += ss;
        }
    }
    anySc = anySc || f.hasSidechain;
    binHz = f.binHz;
    ++count;
}

SpectrumFrame SpectrumAccumulator::average() const {
    SpectrumFrame out;
    out.hz = hz;
    const size_t n = hz.size();
    out.mainMid.resize(n);
    out.mainSide.resize(n);
    out.scMid.resize(n);
    out.scSide.resize(n);
    out.conflictMid.assign(n, 0.0f);
    out.conflictSide.assign(n, 0.0f);
    out.mainMidActive.resize(n);
    out.mainSideActive.resize(n);
    out.scMidActive.resize(n);
    out.scSideActive.resize(n);
    out.hasSidechain = anySc;
    out.binHz = binHz;
    if (count == 0) return out;
    const double inv = 1.0 / count;
    for (size_t i = 0; i < n; ++i) {
        out.mainMid[i] = powToDb(pMM[i] * inv);
        out.mainSide[i] = powToDb(pMS[i] * inv);
        out.scMid[i] = powToDb(pSM[i] * inv);
        out.scSide[i] = powToDb(pSS[i] * inv);
        out.conflictMid[i] = wM[i] > 0.0 ? (float) (cM[i] / wM[i]) : 0.0f;
        out.conflictSide[i] = wS[i] > 0.0 ? (float) (cS[i] / wS[i]) : 0.0f;
        // Σ x·p_sc / Σ p_sc (p_sc > 0 always: the −150 dB floor is 1e−15)
        out.mainMidActive[i] = pSM[i] > 0 ? powToDb(aMM[i] / pSM[i]) : out.mainMid[i];
        out.mainSideActive[i] = pSS[i] > 0 ? powToDb(aMS[i] / pSS[i]) : out.mainSide[i];
        out.scMidActive[i] = pSM[i] > 0 ? powToDb(aSM[i] / pSM[i]) : out.scMid[i];
        out.scSideActive[i] = pSS[i] > 0 ? powToDb(aSS[i] / pSS[i]) : out.scSide[i];
    }
    findSpectralPeaks(out.hz, out.mainMid, out.mainSide, out.peaksMain, 16, binHz);
    findSpectralPeaks(out.hz, out.scMid, out.scSide, out.peaksSc, 16, binHz);
    return out;
}

// ───────────────────────────── resolveConflicts
std::vector<NodeSuggestion> resolveConflicts(const SpectrumFrame& in, float sensitivityDb, int maxNodes, float gainOffsetDb,
                                             const ConflictParams& base) {
    std::vector<NodeSuggestion> result;
    const int n = (int) in.hz.size();
    const float targetGap = std::clamp(sensitivityDb, 0.0f, 9.0f);
    if (maxNodes <= 0 || !in.hasSidechain || n < 3) return result;

    // working frame: levels while the sidechain is active (if the frame carries them), conflict recomputed with
    // the sensitivity as the target gap
    SpectrumFrame f;
    f.hz = in.hz;
    f.hasSidechain = true;
    f.binHz = in.binHz;
    auto pick = [n](const std::vector<float>& act, const std::vector<float>& plain) -> const std::vector<float>& {
        return (int) act.size() == n ? act : plain;
    };
    f.mainMid = pick(in.mainMidActive, in.mainMid);
    f.mainSide = pick(in.mainSideActive, in.mainSide);
    f.scMid = pick(in.scMidActive, in.scMid);
    f.scSide = pick(in.scSideActive, in.scSide);
    for (const auto* v : {&f.mainMid, &f.mainSide, &f.scMid, &f.scSide})
        if ((int) v->size() != n) return result;
    ConflictParams prm = base;
    prm.targetGapDb = targetGap;
    {
        ConflictDetector det;
        det.prepare(f.hz, prm);
        det.compute(f, gainOffsetDb);
    }

    constexpr float kCMin = 0.2f;
    constexpr float kMergeOct = 1.0f / 3.0f;
    constexpr float kRangeCap = 12.0f;
    constexpr float kMinRangeDb = 0.5f;
    constexpr float kMinRelScore = 0.1f;   // candidates weaker than 10 % of the strongest are ignored (conservative)
    const float kTiltDbPerOct = prm.tiltDbPerOct;

    std::vector<float> c((size_t) n), mTot((size_t) n), lg((size_t) n), sc((size_t) n);
    float mTmax = kFloorDb, sTmax = kFloorDb;
    for (int i = 0; i < n; ++i) {
        c[(size_t) i] = std::max(f.conflictMid[(size_t) i], f.conflictSide[(size_t) i]);
        mTot[(size_t) i] = powSumDb(f.mainMid[(size_t) i], f.mainSide[(size_t) i]);
        lg[(size_t) i] = std::log2(f.hz[(size_t) i]);
        const float t = kTiltDbPerOct * (lg[(size_t) i] - std::log2(1000.0f));
        mTmax = std::max(mTmax, mTot[(size_t) i] + t);
        sTmax = std::max(sTmax, powSumDb(f.scMid[(size_t) i], f.scSide[(size_t) i]) + t);
    }
    // score = conflict × overlap energy (the weaker of the two signals, tilted, relative to its own maximum, amplitude)
    float sMax = 0;
    for (int i = 0; i < n; ++i) {
        const float t = kTiltDbPerOct * (lg[(size_t) i] - std::log2(1000.0f));
        const float rm = mTot[(size_t) i] + t - mTmax;
        const float rs = powSumDb(f.scMid[(size_t) i], f.scSide[(size_t) i]) + t - sTmax;
        sc[(size_t) i] = c[(size_t) i] * (float) std::pow(10.0, std::min(rm, rs) / 20.0);
        sMax = std::max(sMax, sc[(size_t) i]);
    }
    if (sMax <= 0) return result;

    struct Cand { int peak, lo, hi; float score, cPeak; double centreLog; bool merged; };
    std::vector<Cand> cands;
    for (int i = 0; i < n; ++i) {
        const float v = sc[(size_t) i];
        if (c[(size_t) i] < kCMin || v < kMinRelScore * sMax) continue;
        const bool leftOk = (i == 0) || v >= sc[(size_t) (i - 1)];
        const bool rightOk = (i == n - 1) || v > sc[(size_t) (i + 1)];
        if (!leftOk || !rightOk) continue;
        const float half = 0.5f * v;
        int lo = i, hi = i;
        while (lo > 0 && sc[(size_t) (lo - 1)] > half && sc[(size_t) (lo - 1)] <= sc[(size_t) lo] + 1e-9f) --lo;
        while (hi + 1 < n && sc[(size_t) (hi + 1)] > half && sc[(size_t) (hi + 1)] <= sc[(size_t) hi] + 1e-9f) ++hi;
        double wsum = 0, lsum = 0;
        float cp = 0;
        for (int j = lo; j <= hi; ++j) {
            const double w = (double) (sc[(size_t) j] - half);
            wsum += w;
            lsum += w * lg[(size_t) j];
            cp = std::max(cp, c[(size_t) j]);
        }
        const double centre = wsum > 0 ? lsum / wsum : lg[(size_t) i];
        cands.push_back({i, lo, hi, v, cp, centre, false});
    }
    std::sort(cands.begin(), cands.end(), [](const Cand& a, const Cand& b) { return a.score > b.score; });

    std::vector<Cand> acc;
    for (const Cand& k : cands) {
        bool merged = false;
        for (Cand& a : acc) {
            if (std::fabs(k.centreLog - a.centreLog) < kMergeOct) {
                if (k.score >= 0.5f * a.score) {
                    a.lo = std::min(a.lo, k.lo);
                    a.hi = std::max(a.hi, k.hi);
                    a.merged = true;
                }
                merged = true;
                break;
            }
        }
        if (merged) continue;
        if ((int) acc.size() >= maxNodes) continue;  // keep scanning only to merge weaker ones into accepted nodes
        acc.push_back(k);
    }
    // merged nodes: centre and conflict over the widened region, then re-check the 1/3-octave spacing
    for (Cand& a : acc) {
        if (!a.merged) continue;
        const float half = 0.5f * a.score;
        double wsum = 0, lsum = 0;
        float cp = 0;
        for (int j = a.lo; j <= a.hi; ++j) {
            const double w = std::max(0.0, (double) (sc[(size_t) j] - half));
            wsum += w;
            lsum += w * lg[(size_t) j];
            cp = std::max(cp, c[(size_t) j]);
        }
        if (wsum > 0) a.centreLog = lsum / wsum;
        a.cPeak = cp;
    }
    {
        std::vector<Cand> kept;
        for (const Cand& a : acc) {  // acc is in score order
            bool clash = false;
            for (const Cand& b : kept) clash = clash || std::fabs(a.centreLog - b.centreLog) < kMergeOct;
            if (!clash) kept.push_back(a);
        }
        acc.swap(kept);
    }

    auto lerpLog = [](float f, float f0, float f1) {
        return std::clamp((float) (std::log(f / f0) / std::log(f1 / f0)), 0.0f, 1.0f);
    };
    for (const Cand& a : acc) {
        // levels are read at the region's strongest point (for a merged node: the stronger candidate's peak), so a
        // merged node is sized for the worse of its two conflicts, not for the dip between them
        const int p = a.peak;
        float cm = 0, cs = 0;
        for (int j = a.lo; j <= a.hi; ++j) {
            cm = std::max(cm, f.conflictMid[(size_t) j]);
            cs = std::max(cs, f.conflictSide[(size_t) j]);
        }
        int ch = 0;
        if (cs < 0.5f * cm) ch = 1;
        else if (cm < 0.5f * cs) ch = 2;

        float mainLv, scLv;
        if (ch == 1) { mainLv = f.mainMid[(size_t) p]; scLv = f.scMid[(size_t) p]; }
        else if (ch == 2) { mainLv = f.mainSide[(size_t) p]; scLv = f.scSide[(size_t) p]; }
        else { mainLv = mTot[(size_t) p]; scLv = powSumDb(f.scMid[(size_t) p], f.scSide[(size_t) p]); }

        // reduction that puts the (gain-staged) main targetGap dB under the sidechain at the node frequency
        const float needed = (mainLv - gainOffsetDb) - (scLv - targetGap);
        const float range = std::min(kRangeCap, needed);
        if (range < kMinRangeDb) continue;

        const float freq = std::clamp((float) std::exp2(a.centreLog), 20.0f, 20000.0f);
        const float widthOct = std::max(0.0f, lg[(size_t) a.hi] - lg[(size_t) a.lo]);
        // remove the 1/6-oct analysis smear in quadrature (widths of convolved humps add roughly as squares)
        const float bw = std::sqrt(std::max(widthOct * widthOct - 1.0f / 36.0f, 1.0f / 64.0f));
        const float r = std::exp2(bw);
        const float q = std::clamp(std::sqrt(r) / (r - 1.0f), 0.5f, 8.0f);

        const float t = lerpLog(freq, 50.0f, 2000.0f);
        const float attack = 10.0f * std::pow(2.0f / 10.0f, t);
        const float release = 150.0f * std::pow(60.0f / 150.0f, t);
        const float thr = std::clamp(scLv - 6.0f, -60.0f, 0.0f);

        result.push_back({freq, range, thr, q, attack, release, ch, a.cPeak});
    }
    return result;
}

} // namespace pf
