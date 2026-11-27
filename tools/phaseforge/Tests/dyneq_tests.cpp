// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — DynamicEQ unit tests (standalone, no JUCE). Exit code ≠ 0 on any failure.
// Build: g++ -std=c++20 -O2 -I tools/phaseforge/Source tools/phaseforge/Tests/dyneq_tests.cpp
//            tools/phaseforge/Source/DSP/DynamicEQ.cpp -o /tmp/pf_dyneq_tests
#include "DSP/DynamicEQ.h"

#include <chrono>
#include <cmath>
#include <cstdarg>
#include <cstdio>
#include <algorithm>
#include <functional>
#include <random>
#include <string>
#include <vector>

using namespace pf;

static int gFail = 0, gPass = 0;
static void check(bool ok, const char* fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    std::printf("%s ", ok ? "  ok  " : "**FAIL**");
    std::vprintf(fmt, ap);
    std::printf("\n");
    va_end(ap);
    if (ok) ++gPass; else ++gFail;
}

using Vec = std::vector<float>;
static const double kTwoPi = 2.0 * kPi;
static const char* modeName(FilterMode m) { return m == FilterMode::LinearPhaseFIR ? "FIR" : "IIR"; }

static Vec sine(double fs, double sec, double f, double amp, double ph = 0.0, double t0 = 0.0, double t1 = 1e9) {
    const int n = (int) std::lround(sec * fs);
    Vec v((size_t) n, 0.f);
    for (int i = 0; i < n; ++i) {
        const double t = i / fs;
        if (t >= t0 && t < t1) v[(size_t) i] = (float) (amp * std::sin(kTwoPi * f * t + ph));
    }
    return v;
}
static Vec add(const Vec& a, const Vec& b) { Vec r = a; for (size_t i = 0; i < r.size(); ++i) r[i] += b[i]; return r; }

// amplitude of the f component in y[start, start+len)
static double ampAt(const Vec& y, int start, int len, double f, double fs) {
    double re = 0, im = 0;
    for (int i = 0; i < len; ++i) {
        const double ph = kTwoPi * f * (start + i) / fs;
        re += y[(size_t) (start + i)] * std::cos(ph);
        im -= y[(size_t) (start + i)] * std::sin(ph);
    }
    return 2.0 / len * std::sqrt(re * re + im * im);
}
static double db(double x) { return 20.0 * std::log10(std::max(x, 1e-30)); }

// Runs eq over (L,R) in place with varying block sizes (incl. > maxBlock). perBlock(start,len) before each block.
static void run(DynamicEQ& eq, Vec& L, Vec* R, const Vec* sL, const Vec* sR,
                const std::function<void(int, int)>& perBlock = {}, const int* pattern = nullptr, int npat = 0) {
    static const int defPat[] = {64, 17, 128, 333, 512, 1, 700, 256, 90};
    if (!pattern) { pattern = defPat; npat = 9; }
    const int n = (int) L.size();
    int pos = 0, k = 0;
    while (pos < n) {
        const int len = std::min(pattern[k++ % npat], n - pos);
        if (perBlock) perBlock(pos, len);
        float* m[2] = {L.data() + pos, R ? R->data() + pos : nullptr};
        const float* s[2] = {sL ? sL->data() + pos : nullptr, sR ? sR->data() + pos : nullptr};
        const int sc = sL ? (sR ? 2 : 1) : 0;
        eq.process(m, R ? 2 : 1, sc ? s : nullptr, sc, len);
        pos += len;
    }
}

static NodeParams node(float f, float range, float thr, float q, NodeChannel ch = NodeChannel::Stereo,
                       float att = 5.f, float rel = 80.f) {
    NodeParams p;
    p.active = true; p.freqHz = f; p.rangeDb = range; p.thresholdDb = thr; p.q = q;
    p.attackMs = att; p.releaseMs = rel; p.channel = ch;
    return p;
}

// ─────────────────────────────────────────────── 1) sidechain burst at 60 Hz, all rates, both modes
static void testSidechainBurst(double fs, FilterMode mode) {
    const double sec = 1.4;
    Vec main = add(add(sine(fs, sec, 60, 0.25), sine(fs, sec, 300, 0.25, 0.4)), sine(fs, sec, 1000, 0.25, 1.1));
    Vec L = main, R = main;
    Vec sc = sine(fs, sec, 60, 0.5, 0.0, 0.3);
    DynamicEQ eq;
    eq.prepare(fs, 512, mode);
    eq.setNode(0, node(60, 6, -30, 1));
    run(eq, L, &R, &sc, &sc);
    const int w0 = (int) std::lround(0.8 * fs), wl = (int) std::lround(0.4 * fs);
    const int p0 = (int) std::lround(0.15 * fs), pl = (int) std::lround(0.1 * fs);
    const double r60 = db(ampAt(L, w0, wl, 60, fs) / 0.25), r300 = db(ampAt(L, w0, wl, 300, fs) / 0.25);
    const double r1k = db(ampAt(L, w0, wl, 1000, fs) / 0.25), rR = db(ampAt(R, w0, wl, 60, fs) / 0.25);
    const double pre = db(ampAt(L, p0, pl, 60, fs) / 0.25);
    check(std::fabs(r60 + 6.0) <= 1.0 && std::fabs(rR + 6.0) <= 1.0,
          "[%s %6.0f Hz] SC burst: 60 Hz L %.2f dB R %.2f dB (target -6 ±1)", modeName(mode), fs, r60, rR);
    check(std::fabs(r300) <= 0.5 && std::fabs(r1k) <= 0.5,
          "[%s %6.0f Hz] SC burst: 300 Hz %.3f dB, 1 kHz %.3f dB (±0.5)", modeName(mode), fs, r300, r1k);
    check(std::fabs(pre) < 0.1, "[%s %6.0f Hz] before burst: 60 Hz %.4f dB (<0.1)", modeName(mode), fs, pre);
    check(std::fabs(eq.reductionDb(0) - 6.f) < 0.05, "[%s %6.0f Hz] reductionDb = %.3f", modeName(mode), fs, eq.reductionDb(0));
}

// ─────────────────────────────────────────────── 2) no sidechain activity → no reduction
static void testNoActivity(FilterMode mode) {
    const double fs = 48000, sec = 1.2;
    Vec main = add(sine(fs, sec, 60, 0.25), sine(fs, sec, 1000, 0.25));
    for (int variant = 0; variant < 3; ++variant) {
        Vec L = main, R = main;
        Vec sc = variant == 0 ? sine(fs, sec, 1000, 0.5) : (variant == 1 ? Vec(L.size(), 0.f) : Vec());
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setNode(0, node(60, 6, -30, 1));
        run(eq, L, &R, variant < 2 ? &sc : nullptr, variant < 2 ? &sc : nullptr);
        const int w0 = (int) (0.6 * fs), wl = (int) (0.5 * fs);
        const double r = db(ampAt(L, w0, wl, 60, fs) / 0.25);
        const char* nm[] = {"SC = loud 1 kHz only", "SC = silence", "SC = nullptr"};
        check(std::fabs(r) < 0.1 && eq.reductionDb(0) < 0.1, "[%s] no SC activity (%s): 60 Hz %.4f dB, red %.4f dB",
              modeName(mode), nm[variant], r, eq.reductionDb(0));
    }
}

// ─────────────────────────────────────────────── 3) attack / release time constants
static void testBallistics(FilterMode mode) {
    const double fs = 48000;
    struct C { float f, att, rel; } cs[] = {{1000, 5, 80}, {1000, 1, 300}, {1000, 20, 150}, {1000, 50, 500},
                                             {200, 10, 200}, {3000, 2, 40}};
    for (auto c : cs) {
        const double t1 = 0.1, t2 = 0.7, sec = 2.0;
        Vec L(size_t(sec * fs), 0.f), R = L;
        Vec sc = sine(fs, sec, c.f, 0.5, 0.0, t1, t2);
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        const float range = 12.f;
        eq.setNode(0, node(c.f, range, -40, 1, NodeChannel::Stereo, c.att, c.rel));
        std::vector<float> red;
        static const int pat[] = {8};
        run(eq, L, &R, &sc, &sc, [&](int, int) { red.push_back(eq.reductionDb(0)); }, pat, 1);
        red.push_back(eq.reductionDb(0));
        // red[k] = reduction after k·8 samples
        // IIR: reductionDb is the live value. FIR: it is the value entering the kernel, i.e. delayed by M/2
        // (= latency − B) samples and sampled once per FIR block.
        const double lat = (eq.latency() - eq.firBlockSize()) / fs;
        double ta = -1, tr = -1;
        for (size_t k = 0; k < red.size(); ++k) {
            const double t = k * 8 / fs;
            if (ta < 0 && t > t1 && red[k] >= 0.632 * range) ta = t - t1 - lat;
            if (tr < 0 && t > t2 + lat && red[k] <= 0.368 * range) tr = t - t2 - lat;
        }
        // FIR: reduction is sampled per FIR block (B samples) → allow ±1 block on top of ±20 %
        const double slack = mode == FilterMode::LinearPhaseFIR ? eq.firBlockSize() / fs : 0.0;
        const bool okA = std::fabs(ta * 1e3 - c.att) <= 0.2 * c.att + slack * 1e3;  // FIR: + up to one block
        const bool okR = std::fabs(tr * 1e3 - c.rel) <= 0.2 * c.rel + slack * 1e3;
        check(okA && okR, "[%s] ballistics %4.0f Hz: attack %5.1f ms → %6.2f ms (%+5.1f %%), release %5.0f ms → %6.1f ms (%+5.1f %%)",
              modeName(mode), c.f, c.att, ta * 1e3, (ta * 1e3 / c.att - 1) * 100, c.rel, tr * 1e3, (tr * 1e3 / c.rel - 1) * 100);
    }
}

// max |a[i] − b[i − delay]| over [from, end)
static double maxErr(const Vec& out, const Vec& ref, int delay, int from) {
    double e = 0;
    for (size_t i = (size_t) from; i < out.size(); ++i) {
        const long j = (long) i - delay;
        const double r = j >= 0 ? ref[(size_t) j] : 0.0;
        e = std::max(e, std::fabs(out[i] - r));
    }
    return e;
}

// ─────────────────────────────────────────────── 4) bypass
static void testBypass(FilterMode mode) {
    const double fs = 48000, sec = 1.5;
    Vec main = add(sine(fs, sec, 60, 0.4), sine(fs, sec, 700, 0.3, 0.2));
    Vec sc = sine(fs, sec, 60, 0.5);
    {   // bypassed from the start
        Vec L = main, R = main;
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        NodeParams p = node(60, 12, -40, 1);
        p.bypass = true;
        eq.setNode(0, p);
        run(eq, L, &R, &sc, &sc);
        const double e = std::max(maxErr(L, main, eq.latency(), 0), maxErr(R, main, eq.latency(), 0));
        const bool ok = mode == FilterMode::ZeroLatencyIIR ? e == 0.0 : db(e) < -100.0;
        check(ok, "[%s] bypass (from start): max |out − in(delayed)| = %.3g (%.1f dB)", modeName(mode), e, db(e));
    }
    {   // active, reducing, then bypassed at 0.5 s
        Vec L = main, R = main;
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        NodeParams p = node(60, 12, -40, 1);
        run(eq, L, &R, &sc, &sc, [&](int start, int) {
            p.bypass = start >= (int) (0.5 * fs);
            eq.setNode(0, p);
        });
        const int from = (int) (0.5 * fs) + eq.latency() + (int) (0.05 * fs);
        const double e = std::max(maxErr(L, main, eq.latency(), from), maxErr(R, main, eq.latency(), from));
        const bool ok = mode == FilterMode::ZeroLatencyIIR ? e == 0.0 : db(e) < -100.0;
        check(ok, "[%s] bypass after activity (≥50 ms after toggle): max err = %.3g (%.1f dB)", modeName(mode), e, db(e));
    }
}

// ─────────────────────────────────────────────── 5) Mid/Side routing
static void testMidSide(FilterMode mode) {
    const double fs = 48000, sec = 1.4;
    Vec M = add(sine(fs, sec, 60, 0.3), sine(fs, sec, 1000, 0.1));
    Vec S = add(sine(fs, sec, 60, 0.25, 1.3), sine(fs, sec, 400, 0.1));
    Vec L0(M.size()), R0(M.size());
    for (size_t i = 0; i < M.size(); ++i) { L0[i] = M[i] + S[i]; R0[i] = M[i] - S[i]; }
    Vec sc = sine(fs, sec, 60, 0.5);
    for (int which = 0; which < 2; ++which) {
        const NodeChannel ch = which == 0 ? NodeChannel::Mid : NodeChannel::Side;
        Vec L = L0, R = R0;
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setNode(0, node(60, 6, -30, 1, ch));
        run(eq, L, &R, &sc, &sc);
        Vec Mo(L.size()), So(L.size()), Mref(L.size()), Sref(L.size());
        for (size_t i = 0; i < L.size(); ++i) {
            Mo[i] = (float) (0.5 * ((double) L[i] + R[i]));
            So[i] = (float) (0.5 * ((double) L[i] - R[i]));
            Mref[i] = (float) (0.5 * ((double) L0[i] + R0[i]));
            Sref[i] = (float) (0.5 * ((double) L0[i] - R0[i]));
        }
        const Vec& touched = which == 0 ? Mo : So;
        const Vec& other = which == 0 ? So : Mo;
        const Vec& otherRef = which == 0 ? Sref : Mref;
        const double amp0 = which == 0 ? 0.3 : 0.25;
        const int w0 = (int) (0.8 * fs), wl = (int) (0.5 * fs);
        const double r = db(ampAt(touched, w0, wl, 60, fs) / amp0);
        const double e = maxErr(other, otherRef, eq.latency(), 0);
        const double tol = mode == FilterMode::ZeroLatencyIIR ? 1e-6 : 1e-5;  // = −100 dB
        check(std::fabs(r + 6.0) <= 1.0 && e <= tol, "[%s] %s-only node: %s 60 Hz %.2f dB; %s untouched, max err %.3g (%.1f dB)",
              modeName(mode), which == 0 ? "Mid" : "Side", which == 0 ? "M" : "S", r, which == 0 ? "S" : "M", e, db(e));
    }
}

// ─────────────────────────────────────────────── 6) mono input
static void testMono(FilterMode mode) {
    const double fs = 48000, sec = 1.4;
    Vec main = add(sine(fs, sec, 60, 0.3), sine(fs, sec, 1000, 0.2));
    Vec sc = sine(fs, sec, 60, 0.5);
    const NodeChannel chs[] = {NodeChannel::Stereo, NodeChannel::Mid, NodeChannel::Side};
    const char* nm[] = {"Stereo", "Mid", "Side"};
    for (int c = 0; c < 3; ++c) {
        Vec L = main;
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setNode(0, node(60, 6, -30, 1, chs[c]));
        run(eq, L, nullptr, &sc, nullptr);
        const int w0 = (int) (0.8 * fs), wl = (int) (0.5 * fs);
        const double r = db(ampAt(L, w0, wl, 60, fs) / 0.3);
        if (c < 2) {
            check(std::fabs(r + 6.0) <= 1.0, "[%s] mono, %s node: 60 Hz %.2f dB (-6 ±1)", modeName(mode), nm[c], r);
        } else {
            const double e = maxErr(L, main, eq.latency(), 0);
            check(e == 0.0, "[%s] mono, Side node: no effect, max err %.3g", modeName(mode), e);
        }
    }
}

// ─────────────────────────────────────────────── 7) Difference mode
static void testDifference(FilterMode mode) {
    const double fs = 48000, sec = 1.4;
    struct C { double mainAmp, scAmp, off, expect; const char* what; } cs[] = {
        {0.1, 0.25, 0, 0.0, "main −20, sc −12 (main ≤ sc−3) → none"},
        {0.5, 0.25, 0, 9.0, "main −6,  sc −12 → excess 9"},
        {0.3162, 0.25, 0, 5.0, "main −10, sc −12 → excess 5"},
        {0.5, 0.0, 0, 0.0, "main −6,  sc silent (< thr) → none"},
        {0.1, 0.25, 10, 5.0, "main −20 + offset 10, sc −12 → 5"},
        {0.1778, 0.25, 0, 0.0, "main −15, sc −12 (exactly sc−margin) → ~0"},
    };
    for (auto c : cs) {
        Vec L = sine(fs, sec, 60, c.mainAmp), R = L;
        Vec sc = sine(fs, sec, 60, c.scAmp, 0.7);
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setMode(DynMode::Difference);
        eq.setDifferenceMarginDb(3.f);
        eq.setRelativeOffsetDb((float) c.off);
        eq.setNode(0, node(60, 12, -30, 1));
        run(eq, L, &R, &sc, &sc);
        const int w0 = (int) (0.8 * fs), wl = (int) (0.5 * fs);
        const double r = -db(ampAt(L, w0, wl, 60, fs) / c.mainAmp);
        const double tol = c.expect == 0.0 && c.mainAmp != 0.1778 ? 0.1 : 0.5;
        check(std::fabs(r - c.expect) <= tol, "[%s] Difference: %-42s red %.3f dB (expect %.1f ±%.1f), ui %.3f",
              modeName(mode), c.what, r, c.expect, tol, eq.reductionDb(0));
    }
}

// ─────────────────────────────────────────────── 8) self-keyed (sidechain disabled)
static void testSelfKeyed(FilterMode mode) {
    const double fs = 48000, sec = 1.4;
    Vec sc = sine(fs, sec, 60, 0.5);      // present but must be ignored
    for (int loud = 0; loud < 2; ++loud) {
        const double a = loud ? 0.5 : 0.003;
        Vec main = add(sine(fs, sec, 60, a), sine(fs, sec, 1000, 0.2));
        Vec L = main, R = main;
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setSidechainEnabled(false);
        eq.setNode(0, node(60, 6, -30, 1));
        run(eq, L, &R, &sc, &sc);
        const int w0 = (int) (0.8 * fs), wl = (int) (0.5 * fs);
        const double r = db(ampAt(L, w0, wl, 60, fs) / a);
        const double r1k = db(ampAt(L, w0, wl, 1000, fs) / 0.2);
        if (loud) check(std::fabs(r + 6.0) <= 1.0 && std::fabs(r1k) < 0.5,
                        "[%s] self-keyed, main 60 Hz at −6 dBFS: 60 Hz %.2f dB, 1 kHz %.3f dB", modeName(mode), r, r1k);
        else check(std::fabs(r) < 0.1, "[%s] self-keyed, main 60 Hz at −50 dBFS (< thr), SC loud but ignored: %.4f dB",
                   modeName(mode), r);
    }
}

// ─────────────────────────────────────────────── 9) mix
static void testMix(FilterMode mode) {
    const double fs = 48000, sec = 1.4;
    Vec main = add(sine(fs, sec, 60, 0.3), sine(fs, sec, 500, 0.2));
    Vec sc = sine(fs, sec, 60, 0.5);
    {
        Vec L = main, R = main;
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setMix(0.f);
        eq.reset();
        eq.setNode(0, node(60, 12, -40, 1));
        run(eq, L, &R, &sc, &sc);
        const double e = std::max(maxErr(L, main, eq.latency(), 0), maxErr(R, main, eq.latency(), 0));
        check(e == 0.0, "[%s] mix 0 → exact (delayed) dry: max err %.3g", modeName(mode), e);
    }
    {
        Vec L = main, R = main;
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setMix(0.5f);
        eq.reset();
        eq.setNode(0, node(60, 6, -40, 1));
        run(eq, L, &R, &sc, &sc);
        const int w0 = (int) (0.8 * fs), wl = (int) (0.5 * fs);
        const double r = db(ampAt(L, w0, wl, 60, fs) / 0.3);
        const double expect = db(0.5 * std::pow(10.0, -6.0 / 20.0) + 0.5);
        check(std::fabs(r - expect) < 0.3, "[%s] mix 0.5: 60 Hz %.2f dB (expect %.2f)", modeName(mode), r, expect);
    }
}

// ─────────────────────────────────────────────── 10) node frequency sweep 50 → 200 Hz in 50 ms: no clicks
static void testNoClicks(FilterMode mode, double fs) {
    const double sec = 1.2, a = 0.5;
    Vec main = sine(fs, sec, 60, a), L = main, R = main;
    Vec sc = sine(fs, sec, 60, 0.5);
    DynamicEQ eq;
    eq.prepare(fs, 512, mode);
    NodeParams p = node(50, 12, -40, 1);
    static const int pat[] = {32};
    const double tm0 = 0.5, tm1 = 0.55;
    run(eq, L, &R, &sc, &sc, [&](int start, int) {
        const double t = start / fs;
        const double u = std::clamp((t - tm0) / (tm1 - tm0), 0.0, 1.0);
        p.freqHz = (float) (50.0 + 150.0 * u);
        eq.setNode(0, p);
    }, pat, 1);
    // spectrum of the segment around the move (Blackman-Harris, 2^k samples)
    int nfft = 1;
    while (nfft < (int) (0.3 * fs)) nfft <<= 1;
    const int st = (int) (0.42 * fs) + eq.latency();
    std::vector<std::complex<double>> X((size_t) nfft);
    for (int i = 0; i < nfft; ++i) {
        const double w = 0.35875 - 0.48829 * std::cos(kTwoPi * i / (nfft - 1)) + 0.14128 * std::cos(2 * kTwoPi * i / (nfft - 1))
                         - 0.01168 * std::cos(3 * kTwoPi * i / (nfft - 1));
        X[(size_t) i] = L[(size_t) (st + i)] * w;
    }
    FFT fft(ceilPow2Order(nfft));
    fft.perform(X.data(), false);
    double peak = 0, hiMax = 0, hiE = 0, totE = 0;
    for (int k = 1; k < nfft / 2; ++k) {
        const double m = std::abs(X[(size_t) k]);
        const double f = k * fs / nfft;
        peak = std::max(peak, m);
        totE += m * m;
        if (f > 5000) { hiMax = std::max(hiMax, m); hiE += m * m; }
    }
    double maxD = 0;
    for (size_t i = (size_t) (0.3 * fs) + (size_t) eq.latency(); i + 1 < L.size(); ++i)
        maxD = std::max(maxD, (double) std::fabs(L[i + 1] - L[i]));
    const double dSine = a * 2.0 * std::sin(kPi * 60 / fs);
    const double hiRel = db(hiMax / peak), hiERel = 10 * std::log10(std::max(hiE, 1e-300) / totE);
    check(hiRel < -60.0 && hiERel < -60.0 && maxD <= 1.001 * dSine,
          "[%s %6.0f Hz] freq sweep 50→200 Hz/50 ms on 60 Hz sine: >5 kHz peak %.1f dB, energy %.1f dB rel.; max|Δ| %.5f ≤ %.5f",
          modeName(mode), fs, hiRel, hiERel, maxD, dSine);
}

// ─────────────────────────────────────────────── 11) solo
static void testSolo(FilterMode mode) {
    const double fs = 48000, sec = 1.2;
    Vec main = add(add(sine(fs, sec, 60, 0.25), sine(fs, sec, 300, 0.25)), sine(fs, sec, 1000, 0.25));
    Vec L = main, R = main;
    DynamicEQ eq;
    eq.prepare(fs, 512, mode);
    NodeParams p = node(1000, 6, -30, 4);
    p.solo = true;
    eq.setNode(0, p);
    eq.setNode(1, node(60, 6, -30, 1));
    run(eq, L, &R, nullptr, nullptr);
    const int w0 = (int) (0.6 * fs), wl = (int) (0.5 * fs);
    const double a1k = db(ampAt(L, w0, wl, 1000, fs) / 0.25), a300 = db(ampAt(L, w0, wl, 300, fs) / 0.25),
                 a60 = db(ampAt(L, w0, wl, 60, fs) / 0.25);
    check(std::fabs(a1k) < 0.5 && a300 < -15 && a60 < -30,
          "[%s] solo node 1 kHz Q4: 1 kHz %.2f dB, 300 Hz %.1f dB, 60 Hz %.1f dB", modeName(mode), a1k, a300, a60);
}

// ─────────────────────────────────────────────── 12) delta
static void testDelta(FilterMode mode) {
    const double fs = 48000, sec = 1.4;
    Vec main = add(add(sine(fs, sec, 60, 0.25), sine(fs, sec, 1000, 0.25, 0.3)), sine(fs, sec, 4000, 0.25, 0.9));
    Vec sc = sine(fs, sec, 60, 0.5, 0.0, 0.2);
    auto mk = [&](DynamicEQ& eq, int delta, float mix) {
        eq.prepare(fs, 512, mode);
        eq.setMix(mix);
        eq.setDelta(delta);
        eq.reset();
        eq.setNode(0, node(60, 6, -30, 6));
        eq.setNode(1, node(1000, 3, -30, 1));
        eq.setNode(2, node(4000, 4, -30, 2, NodeChannel::Mid));
    };
    for (float mix : {1.f, 0.6f}) {   // combined delta + wet == dry (delayed)
        Vec Lw = main, Rw = main, Ld = main, Rd = main;
        DynamicEQ a, b;
        mk(a, -2, mix);
        mk(b, -1, mix);
        // keyed on the main itself as well, so every node moves (nodes 1,2 get sidechain content too)
        Vec scAll = add(sc, add(sine(fs, sec, 1000, 0.3, 0.0, 0.4), sine(fs, sec, 4000, 0.3, 0.0, 0.6)));
        run(a, Lw, &Rw, &scAll, &scAll);
        run(b, Ld, &Rd, &scAll, &scAll);
        Vec sumL(Lw.size()), sumR(Lw.size());
        for (size_t i = 0; i < Lw.size(); ++i) { sumL[i] = Lw[i] + Ld[i]; sumR[i] = Rw[i] + Rd[i]; }
        const double e = std::max(maxErr(sumL, main, a.latency(), 0), maxErr(sumR, main, a.latency(), 0));
        const double w = ampAt(Ld, (int) (0.9 * fs), (int) (0.4 * fs), 60, fs);
        check(db(e) < -100.0 && w > 0.05, "[%s] combined delta + wet = dry(delayed), mix %.1f: max err %.3g (%.1f dB); delta 60 Hz %.3f",
              modeName(mode), mix, e, db(e), w);
    }
    {   // single-node delta of the 60 Hz node
        Vec L = main, R = main;
        DynamicEQ eq;
        mk(eq, 0, 1.f);
        Vec scAll = add(sc, sine(fs, sec, 1000, 0.3));  // node 1 also reduces — must not show up in node-0 delta
        run(eq, L, &R, &scAll, &scAll);
        const int w0 = (int) (0.9 * fs), wl = (int) (0.4 * fs);
        const double d60 = ampAt(L, w0, wl, 60, fs), d1k = ampAt(L, w0, wl, 1000, fs), d4k = ampAt(L, w0, wl, 4000, fs);
        const double expect = 0.25 * (1.0 - std::pow(10.0, -6.0 / 20.0));
        // FIR: a Q6 bell at 60 Hz (10 Hz wide) is near the kernel's resolution → it is ~0.6 dB shallower
        const double tol = mode == FilterMode::ZeroLatencyIIR ? 0.5 : 1.0;
        check(std::fabs(db(d60 / expect)) < tol && db(d1k / 0.25) < -40 && db(d4k / 0.25) < -40,
              "[%s] node-0 delta (60 Hz, Q6, −6 dB): 60 Hz %.4f (expect %.4f, %.2f dB); 1 kHz %.1f dB, 4 kHz %.1f dB rel. input",
              modeName(mode), d60, expect, db(d60 / expect), db(d1k / 0.25), db(d4k / 0.25));
        const double e = maxErr(R, L, 0, 0);
        check(e == 0.0, "[%s] node-0 delta: L == R for a Stereo node (%.3g)", modeName(mode), e);
    }
}

// ─────────────────────────────────────────────── 12b) FIR depth accuracy vs bell width (resolution limit)
static void testFirAccuracy() {
    const double fs = 48000, sec = 1.6;
    struct C { float f, q; double tol; } cs[] = {{60, 1, 0.1}, {60, 2, 0.1}, {60, 4, 0.5}, {120, 4, 0.1}, {120, 10, 1.5},
                                                 {60, 10, 3.5}, {1000, 10, 0.05}, {5000, 20, 0.05}, {30, 2, 0.5}};
    for (auto c : cs) {
        double r[2];
        for (int m = 0; m < 2; ++m) {
            Vec L = sine(fs, sec, c.f, 0.25), sc = sine(fs, sec, c.f, 0.5, 0.3);
            DynamicEQ eq;
            eq.prepare(fs, 512, m ? FilterMode::LinearPhaseFIR : FilterMode::ZeroLatencyIIR);
            eq.setNode(0, node(c.f, 12, -30, c.q));
            run(eq, L, nullptr, &sc, nullptr);
            r[m] = db(ampAt(L, (int) (1.0 * fs), (int) (0.5 * fs), c.f, fs) / 0.25);
        }
        check(std::fabs(r[0] + 12.0) < 0.01 && std::fabs(r[1] - r[0]) <= c.tol,
              "FIR depth accuracy %5.0f Hz Q%-4.1f (BW %6.1f Hz): IIR %.2f dB, FIR %.2f dB (|Δ| %.2f ≤ %.2f)",
              c.f, c.q, c.f / c.q, r[0], r[1], std::fabs(r[1] - r[0]), c.tol);
    }
}

// ─────────────────────────────────────────────── 12c) FIR gain trajectory is aligned with the reported latency
static void testFirAlignment() {
    const double fs = 48000, sec = 1.6;
    Vec main = sine(fs, sec, 60, 0.3), sc = sine(fs, sec, 60, 0.5, 0.0, 0.4, 0.9);
    Vec Li = main, Lf = main;
    DynamicEQ a, b;
    a.prepare(fs, 512, FilterMode::ZeroLatencyIIR);
    b.prepare(fs, 512, FilterMode::LinearPhaseFIR);
    a.setNode(0, node(60, 9, -30, 1, NodeChannel::Stereo, 20, 120));
    b.setNode(0, node(60, 9, -30, 1, NodeChannel::Stereo, 20, 120));
    run(a, Li, nullptr, &sc, nullptr);
    run(b, Lf, nullptr, &sc, nullptr);
    const int lat = b.latency(), per = (int) std::lround(fs / 60.0);
    double worst = 0;
    for (int i = (int) (0.3 * fs); i + per + lat < (int) Lf.size() && i < (int) (1.4 * fs); i += per / 4) {
        double ei = 0, ef = 0;
        for (int k = 0; k < per; ++k) { ei += Li[(size_t) (i + k)] * Li[(size_t) (i + k)]; ef += Lf[(size_t) (i + k + lat)] * Lf[(size_t) (i + k + lat)]; }
        worst = std::max(worst, std::fabs(10 * std::log10(ef / ei)));
    }
    check(worst < 1.0, "[FIR] gain trajectory vs IIR (FIR shifted by latency %d): worst short-time level diff %.2f dB (attack 20 / release 120 ms)",
          lat, worst);
}

// ─────────────────────────────────────────────── 12d) misc: RMS detector, channel switch / delete fades, denormals
static void testMisc(FilterMode mode) {
    const double fs = 48000;
    {   // RMS detector option: a steady sine reads the same level → same reduction
        const double sec = 1.4;
        Vec L = sine(fs, sec, 60, 0.25), R = L, sc = sine(fs, sec, 60, 0.5);
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setDetectorRmsMs(20.f);
        eq.setNode(0, node(60, 6, -30, 1));
        run(eq, L, &R, &sc, &sc);
        const double r = db(ampAt(L, (int) (0.8 * fs), (int) (0.5 * fs), 60, fs) / 0.25);
        check(std::fabs(r + 6.0) < 0.1, "[%s] RMS detector (20 ms): 60 Hz %.3f dB", modeName(mode), r);
    }
    {   // channel switch Stereo → Mid → Side and delete while reducing: no clicks, exact after delete
        const double sec = 2.0, a = 0.4;
        Vec Lin = sine(fs, sec, 60, a), Rin = sine(fs, sec, 60, a, 0.8);
        Vec L = Lin, R = Rin, sc = sine(fs, sec, 60, 0.5);
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        NodeParams p = node(60, 12, -40, 1);
        static const int pat[] = {64};
        run(eq, L, &R, &sc, &sc, [&](int start, int) {
            const double t = start / fs;
            p.channel = t < 0.4 ? NodeChannel::Stereo : (t < 0.7 ? NodeChannel::Mid : NodeChannel::Side);
            p.active = t < 1.0;
            eq.setNode(0, p);
        }, pat, 1);
        // spectrum over the switches and the delete (0.3 … 1.67 s): fades are 10 ms gain ramps → no click energy
        int nfft = 1;
        while (nfft < (int) (1.2 * fs)) nfft <<= 1;
        double hiRel = -400;
        for (const Vec* y : {&L, &R}) {
            const int st = (int) (0.3 * fs) + eq.latency();
            std::vector<std::complex<double>> X((size_t) nfft);
            for (int i = 0; i < nfft; ++i) {
                const double w = 0.35875 - 0.48829 * std::cos(kTwoPi * i / (nfft - 1)) + 0.14128 * std::cos(2 * kTwoPi * i / (nfft - 1))
                                 - 0.01168 * std::cos(3 * kTwoPi * i / (nfft - 1));
                X[(size_t) i] = (*y)[(size_t) (st + i)] * w;
            }
            FFT fft(ceilPow2Order(nfft));
            fft.perform(X.data(), false);
            double peak = 0, hi = 0;
            for (int k = 1; k < nfft / 2; ++k) {
                peak = std::max(peak, std::abs(X[(size_t) k]));
                if (k * fs / nfft > 2000) hi = std::max(hi, std::abs(X[(size_t) k]));
            }
            hiRel = std::max(hiRel, db(hi / peak));
        }
        const int from = (int) (1.1 * fs) + eq.latency();
        const double e = std::max(maxErr(L, Lin, eq.latency(), from), maxErr(R, Rin, eq.latency(), from));
        check(hiRel < -60.0 && e == 0.0, "[%s] channel switch Stereo→Mid→Side + delete: peak >2 kHz %.1f dB rel.; after delete exact (%.3g)",
              modeName(mode), hiRel, e);
    }
    {   // denormals: long silence after a loud signal must not slow processing down
        const int n = (int) (4 * fs);
        Vec Ln((size_t) n), Rn((size_t) n), Ls((size_t) n, 0.f), Rs((size_t) n, 0.f);
        std::mt19937 rng(3);
        std::normal_distribution<float> nd(0.f, 0.2f);
        for (int i = 0; i < n; ++i) { Ln[(size_t) i] = nd(rng); Rn[(size_t) i] = nd(rng); }
        DynamicEQ eq;
        eq.prepare(fs, 512, mode);
        eq.setSidechainEnabled(false);
        for (int i = 0; i < 8; ++i) eq.setNode(i, node(60.f * (float) (i + 1), 6, -60, 2));
        auto t0 = std::chrono::steady_clock::now();
        run(eq, Ln, &Rn, nullptr, nullptr);
        const double tNoise = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
        t0 = std::chrono::steady_clock::now();
        run(eq, Ls, &Rs, nullptr, nullptr);
        const double tSil = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
        double mx = 0;
        for (int i = n / 2; i < n; ++i) mx = std::max(mx, (double) std::fabs(Ls[(size_t) i]));
        check(tSil < 2.0 * tNoise && mx == 0.0, "[%s] denormals: 4 s silence after noise %.1f ms vs noise %.1f ms; output exactly 0 after 2 s: %s",
              modeName(mode), tSil * 1e3, tNoise * 1e3, mx == 0.0 ? "yes" : "no");
    }
}

// ─────────────────────────────────────────────── 13) latency is fixed
static void testLatency() {
    const double rates[] = {44100, 48000, 88200, 96000, 176400, 192000};
    for (double fs : rates) {
        DynamicEQ a, b;
        a.prepare(fs, 512, FilterMode::LinearPhaseFIR);
        b.prepare(fs, 512, FilterMode::ZeroLatencyIIR);
        const int l0 = a.latency();
        for (int i = 0; i < 8; ++i) a.setNode(i, node(50.f * (i + 1), 18, -60, 20));
        Vec L(4096, 0.1f), R = L;
        run(a, L, &R, nullptr, nullptr);
        check(a.latency() == l0 && b.latency() == 0, "latency @ %6.0f Hz: FIR %d samples (%.2f ms, block %d), IIR %d",
              fs, a.latency(), 1e3 * a.latency() / fs, a.firBlockSize(), b.latency());
    }
}

// ─────────────────────────────────────────────── 14) UI reduction curve
static void testUiCurve() {
    const double fs = 48000, sec = 1.0;
    Vec L = sine(fs, sec, 60, 0.3), R = L, sc = sine(fs, sec, 60, 0.5);
    DynamicEQ eq;
    eq.prepare(fs, 512, FilterMode::ZeroLatencyIIR);
    eq.setNode(0, node(60, 6, -30, 1));
    run(eq, L, &R, &sc, &sc);
    const float at60 = eq.totalReductionDbAt(60), at1k = eq.totalReductionDbAt(1000), at20k = eq.totalReductionDbAt(20000);
    check(std::fabs(at60 - 6.f) < 0.01f && at1k < 0.1f && at1k >= 0.f && at20k < 0.01f,
          "totalReductionDbAt: 60 Hz %.3f, 1 kHz %.3f, 20 kHz %.4f", at60, at1k, at20k);
}

// ─────────────────────────────────────────────── 15) CPU
// scenario 0: kick-modulated sidechain (reductions move → FIR kernel rebuilt every block = worst case)
// scenario 1: sidechain saturating every node (reductions clamped at range → FIR kernel reused)
// scenario 2: silent sidechain (no reduction → FIR identity path)
static void testCpu(FilterMode mode, int scenario, double fs = 48000, int blk = 256) {
    const double sec = 10.0;
    const int n = (int) (sec * fs);
    std::mt19937 rng(1);
    std::normal_distribution<float> nd(0.f, 0.1f);
    const float fr[] = {60, 120, 250, 500, 1000, 2000, 4000, 8000};
    Vec L((size_t) n), R((size_t) n), sL((size_t) n, 0.f), sR((size_t) n, 0.f);
    for (int i = 0; i < n; ++i) {
        L[(size_t) i] = nd(rng); R[(size_t) i] = 0.7f * L[(size_t) i] + nd(rng) * 0.5f;
        float k = 0.f;
        if (scenario == 0) {
            const double t = std::fmod(i / fs, 0.5);   // decaying 55 Hz every 500 ms + noise burst
            k = (float) (0.8 * std::exp(-t * 12.0) * std::sin(kTwoPi * 55 * t)) + nd(rng) * 3.f * (float) std::exp(-t * 30.0);
        } else if (scenario == 1) {
            for (float f : fr) k += 0.1f * (float) std::sin(kTwoPi * f * i / fs + f);
        }
        sL[(size_t) i] = k; sR[(size_t) i] = k;
    }
    DynamicEQ eq;
    eq.prepare(fs, blk, mode);
    for (int i = 0; i < 8; ++i)
        eq.setNode(i, node(fr[i], 6, -45, 1.5f, i == 3 ? NodeChannel::Mid : (i == 5 ? NodeChannel::Side : NodeChannel::Stereo), 3, 60));
    std::vector<double> calls;
    calls.reserve((size_t) (n / blk + 1));
    const auto t0 = std::chrono::steady_clock::now();
    for (int pos = 0; pos < n; pos += blk) {
        const int len = std::min(blk, n - pos);
        float* m[2] = {L.data() + pos, R.data() + pos};
        const float* s[2] = {sL.data() + pos, sR.data() + pos};
        const auto c0 = std::chrono::steady_clock::now();
        eq.process(m, 2, s, 2, len);
        calls.push_back(std::chrono::duration<double>(std::chrono::steady_clock::now() - c0).count());
    }
    const double el = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    bool finite = true;
    for (int i = 0; i < n; ++i) finite = finite && std::isfinite(L[(size_t) i]) && std::isfinite(R[(size_t) i]);
    std::sort(calls.begin(), calls.end());
    const double p999 = calls[(size_t) (0.999 * (double) (calls.size() - 1))], worst = calls.back();
    const char* nm[] = {"kick-modulated SC", "saturating SC", "silent SC"};
    check(finite && el < sec, "[%s] CPU 8 nodes stereo %3.0f kHz, %-17s: RTF %.4f (%.2f %% core); %4d-sample calls: p99.9 %.3f ms, max %.3f ms (budget %.2f ms)",
          modeName(mode), fs / 1000, nm[scenario], el / sec, 100 * el / sec, blk, p999 * 1e3, worst * 1e3, 1e3 * blk / fs);
}

int main() {
    std::printf("PHASEFORGE DynamicEQ tests\n");
    const double rates[] = {44100, 48000, 88200, 96000, 176400, 192000};
    for (FilterMode m : {FilterMode::ZeroLatencyIIR, FilterMode::LinearPhaseFIR})
        for (double fs : rates) testSidechainBurst(fs, m);
    for (FilterMode m : {FilterMode::ZeroLatencyIIR, FilterMode::LinearPhaseFIR}) {
        testNoActivity(m);
        testBallistics(m);
        testBypass(m);
        testMidSide(m);
        testMono(m);
        testDifference(m);
        testSelfKeyed(m);
        testMix(m);
        testNoClicks(m, 48000);
        testNoClicks(m, 96000);
        testSolo(m);
        testDelta(m);
        testMisc(m);
    }
    testFirAccuracy();
    testFirAlignment();
    testLatency();
    testUiCurve();
    for (FilterMode m : {FilterMode::ZeroLatencyIIR, FilterMode::LinearPhaseFIR})
        for (int sc = 0; sc < 3; ++sc) testCpu(m, sc);
    testCpu(FilterMode::LinearPhaseFIR, 0, 48000, 64);
    testCpu(FilterMode::ZeroLatencyIIR, 0, 96000);
    testCpu(FilterMode::LinearPhaseFIR, 0, 96000);
    testCpu(FilterMode::ZeroLatencyIIR, 0, 192000);
    testCpu(FilterMode::LinearPhaseFIR, 0, 192000);
    testCpu(FilterMode::LinearPhaseFIR, 0, 192000, 1024);
    std::printf("\n%d passed, %d failed\n", gPass, gFail);
    return gFail == 0 ? 0 : 1;
}
