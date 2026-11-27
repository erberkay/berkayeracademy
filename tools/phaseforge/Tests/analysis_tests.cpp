// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 ya da sonrası).
// Standalone tests for LockFree.h, FFTAnalyzer, ConflictDetector, LoudnessMeter. Exit code 0 = all passed.
// Build (one line; add -pthread on older toolchains):
//   g++ -std=c++20 -O2 -I tools/phaseforge/Source tools/phaseforge/Tests/analysis_tests.cpp
//       tools/phaseforge/Source/DSP/FFTAnalyzer.cpp tools/phaseforge/Source/DSP/ConflictDetector.cpp
//       tools/phaseforge/Source/DSP/LoudnessMeter.cpp -o /tmp/pf_analysis_tests
// Run: /tmp/pf_analysis_tests [--no-timing]
#include "DSP/ConflictDetector.h"
#include "DSP/FFTAnalyzer.h"
#include "DSP/LockFree.h"
#include "DSP/LoudnessMeter.h"

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <new>
#include <random>
#include <string>
#include <thread>
#include <vector>

using namespace pf;

// ───────────────────────────── allocation counter (real-time checks)
#if defined(__GNUC__) && !defined(__clang__)
#pragma GCC diagnostic ignored "-Wmismatched-new-delete"
#endif
static std::atomic<long> gAllocs{0};
void* operator new(std::size_t n) {
    gAllocs.fetch_add(1, std::memory_order_relaxed);
    if (void* p = std::malloc(n == 0 ? 1 : n)) return p;
    throw std::bad_alloc();
}
void* operator new[](std::size_t n) { return operator new(n); }
void operator delete(void* p) noexcept { std::free(p); }
void operator delete[](void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }
void operator delete[](void* p, std::size_t) noexcept { std::free(p); }

static int gFail = 0, gPass = 0;
static void check(bool ok, const char* name, const char* fmt = "", double a = 0, double b = 0, double c = 0) {
    char buf[256];
    std::snprintf(buf, sizeof buf, fmt, a, b, c);
    std::printf("[%s] %-62s %s\n", ok ? "PASS" : "FAIL", name, buf);
    (ok ? gPass : gFail)++;
}

// ───────────────────────────── helpers
static std::vector<float> sine(double fs, double f, double dbfs, double seconds, double phase = 0.0) {
    const size_t n = (size_t) std::llround(seconds * fs);
    std::vector<float> x(n);
    const double a = std::pow(10.0, dbfs / 20.0);
    for (size_t i = 0; i < n; ++i) x[i] = (float) (a * std::sin(2.0 * kPi * f * (double) i / fs + phase));
    return x;
}
static void append(std::vector<float>& a, const std::vector<float>& b) { a.insert(a.end(), b.begin(), b.end()); }

// feed in blocks of 512 like a host
static void lufsFeed(LoudnessMeter& m, const std::vector<float>& l, const std::vector<float>* r) {
    const int B = 512;
    for (size_t i = 0; i < l.size(); i += B) {
        const int n = (int) std::min<size_t>(B, l.size() - i);
        const float* ch[2] = {l.data() + i, r != nullptr ? r->data() + i : nullptr};
        m.process(ch, r != nullptr ? 2 : 1, n);
    }
}
static int nearestPoint(const std::vector<float>& hz, double f) {
    int best = 0;
    for (int i = 1; i < (int) hz.size(); ++i)
        if (std::fabs(std::log2(hz[(size_t) i] / f)) < std::fabs(std::log2(hz[(size_t) best] / f))) best = i;
    return best;
}
static int argmaxv(const std::vector<float>& v) { return (int) (std::max_element(v.begin(), v.end()) - v.begin()); }
static float maxIn(const std::vector<float>& v, const std::vector<float>& hz, double f0, double f1) {
    float m = -1e9f;
    for (size_t i = 0; i < v.size(); ++i) if (hz[i] >= f0 && hz[i] <= f1) m = std::max(m, v[i]);
    return m;
}

// ───────────────────────────── Loudness
static void testKWeighting() {
    Biquad s, h;
    LoudnessMeter::designKWeighting(48000.0, s, h);
    // ITU-R BS.1770-4 Table 1 / Table 2 (48 kHz)
    const double ref[10] = {1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585,
                            1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621};
    const double got[10] = {s.b0, s.b1, s.b2, s.a1, s.a2, h.b0, h.b1, h.b2, h.a1, h.a2};
    double maxErr = 0;
    for (int i = 0; i < 10; ++i) maxErr = std::max(maxErr, std::fabs(ref[i] - got[i]));
    check(maxErr < 1e-8, "K-weighting 48 kHz coefficients == BS.1770-4 table", "max |err| = %.2e", maxErr);

    for (double fs : {44100.0, 88200.0, 96000.0, 192000.0}) {
        // compare with the 48 kHz reference filter, 10 Hz … 15 kHz (above that the 48 kHz bilinear filter itself
        // bends towards its own Nyquist, so it is no longer a meaningful reference)
        double worst = 0, worstF = 0;
        for (int i = 0; i <= 400; ++i) {
            const double f = 10.0 * std::pow(15000.0 / 10.0, i / 400.0);
            const double d = std::fabs(LoudnessMeter::kWeightingMagnitudeDb(fs, f) - LoudnessMeter::kWeightingMagnitudeDb(48000.0, f));
            if (d > worst) { worst = d; worstF = f; }
        }
        char name[96];
        std::snprintf(name, sizeof name, "K-weighting @ %.1f kHz vs 48 kHz ref (10 Hz-15 kHz)", fs / 1000);
        check(worst < 0.1, name, "max dev %.4f dB at %.0f Hz", worst, worstF);
    }
    // the meter's own calibration point: 997 Hz K gain (the −0.691 constant compensates it)
    const double g997 = LoudnessMeter::kWeightingMagnitudeDb(48000.0, 997.0);
    check(std::fabs(g997 - 0.691) < 0.01, "K-weighting gain at 997 Hz ≈ +0.691 dB", "%.4f dB", g997);
}

static void testLufsLevels() {
    for (double fs : {44100.0, 48000.0, 96000.0, 192000.0}) {
        char name[128];
        // EBU Tech 3341 case 1: stereo 1 kHz −23 dBFS → M, S, I = −23.0 ±0.1
        {
            LoudnessMeter m; m.prepare(fs, 2);
            auto x = sine(fs, 1000.0, -23.0, 20.0);
            lufsFeed(m, x, &x);
            std::snprintf(name, sizeof name, "%6.1f k: 3341 #1 stereo 1k -23 dBFS -> -23 (M/S/I)", fs / 1000);
            const bool ok = std::fabs(m.momentaryLufs() + 23) < 0.1 && std::fabs(m.shortTermLufs() + 23) < 0.1 &&
                            std::fabs(m.integratedLufs() + 23) < 0.1;
            check(ok, name, "M %.3f S %.3f I %.3f", m.momentaryLufs(), m.shortTermLufs(), m.integratedLufs());
        }
        // EBU Tech 3341 case 2: −33 dBFS → −33.0
        {
            LoudnessMeter m; m.prepare(fs, 2);
            auto x = sine(fs, 1000.0, -33.0, 20.0);
            lufsFeed(m, x, &x);
            std::snprintf(name, sizeof name, "%6.1f k: 3341 #2 stereo 1k -33 dBFS -> -33", fs / 1000);
            check(std::fabs(m.integratedLufs() + 33) < 0.1, name, "I %.3f", m.integratedLufs());
        }
        // 997 Hz −20 dBFS on BOTH channels → −20.0 (2 channels × (−23.01) summed); one channel → −23.0
        {
            LoudnessMeter m; m.prepare(fs, 2);
            auto x = sine(fs, 997.0, -20.0, 10.0);
            lufsFeed(m, x, &x);
            std::snprintf(name, sizeof name, "%6.1f k: 997 Hz -20 dBFS stereo (both ch) -> -20.0", fs / 1000);
            check(std::fabs(m.integratedLufs() + 20.0) < 0.1, name, "I %.3f", m.integratedLufs());
            LoudnessMeter m1; m1.prepare(fs, 1);
            lufsFeed(m1, x, nullptr);
            std::snprintf(name, sizeof name, "%6.1f k: 997 Hz -20 dBFS mono (1 ch) -> -23.0", fs / 1000);
            check(std::fabs(m1.integratedLufs() + 23.0) < 0.1, name, "I %.3f", m1.integratedLufs());
        }
        // 1 kHz −18 dBFS mono → −21.0 (−18 − 3.01)
        {
            LoudnessMeter m; m.prepare(fs, 1);
            auto x = sine(fs, 1000.0, -18.0, 10.0);
            lufsFeed(m, x, nullptr);
            std::snprintf(name, sizeof name, "%6.1f k: 1 kHz -18 dBFS mono -> -21.0", fs / 1000);
            check(std::fabs(m.integratedLufs() + 21.0) < 0.1 && std::fabs(m.momentaryLufs() + 21.0) < 0.1, name,
                  "M %.3f I %.3f", m.momentaryLufs(), m.integratedLufs());
        }
        // sample peak
        {
            LoudnessMeter m; m.prepare(fs, 2);
            auto x = sine(fs, 1000.0, -6.0, 1.0);
            lufsFeed(m, x, &x);
            std::snprintf(name, sizeof name, "%6.1f k: sample peak of -6 dBFS sine", fs / 1000);
            check(std::fabs(m.samplePeakDb() + 6.0) < 0.05, name, "%.3f dB", m.samplePeakDb());
        }
    }
}

static double gated(double fs, const std::vector<std::pair<double, double>>& sections /*(dBFS or NaN=silence, s)*/) {
    LoudnessMeter m; m.prepare(fs, 2);
    std::vector<float> x;
    for (auto [db, sec] : sections) {
        if (std::isnan(db)) append(x, std::vector<float>((size_t) std::llround(sec * fs), 0.0f));
        else append(x, sine(fs, 1000.0, db, sec));
    }
    lufsFeed(m, x, &x);
    return m.integratedLufs();
}

static void testLufsGating() {
    const double nan = std::nan("");
    for (double fs : {44100.0, 48000.0, 96000.0, 192000.0}) {
        char name[128];
        double v;
        v = gated(fs, {{-36, 10}, {-23, 60}, {-36, 10}});
        std::snprintf(name, sizeof name, "%6.1f k: 3341 #3 (-36/-23/-36) gated -> -23.0", fs / 1000);
        check(std::fabs(v + 23) < 0.1, name, "I %.3f", v);
        v = gated(fs, {{-72, 10}, {-36, 10}, {-23, 60}, {-36, 10}, {-72, 10}});
        std::snprintf(name, sizeof name, "%6.1f k: 3341 #4 (-72/-36/-23 60 s/-36/-72) -> -23.0", fs / 1000);
        check(std::fabs(v + 23) < 0.1, name, "I %.3f", v);
        v = gated(fs, {{-26, 20}, {-20, 20.1}, {-26, 20}});
        std::snprintf(name, sizeof name, "%6.1f k: 3341 #5 (-26/-20/-26) -> -23.0", fs / 1000);
        check(std::fabs(v + 23) < 0.1, name, "I %.3f", v);
        // 10 s tone between silences: 97 full blocks + 6 partial (¼ ½ ¾ at each edge) pass both gates →
        // exact BS.1770 result −23 + 10·log10(100/103) = −23.128
        v = gated(fs, {{nan, 10}, {-23, 10}, {nan, 10}});
        const double expect = -23.0 + 10.0 * std::log10(100.0 / 103.0);
        std::snprintf(name, sizeof name, "%6.1f k: silence/tone 10 s/silence -> -23.128 (edge blocks)", fs / 1000);
        check(std::fabs(v - expect) < 0.05, name, "I %.3f", v);
    }
    // relative gate actually acts: −23 for 10 s plus −40 for 10 s. Ungated mean would be −25.9; the relative gate
    // (−26.0 − 10 = −36 LUFS) removes the −40 part → −23.0
    const double v = gated(48000.0, {{-23, 10}, {-40, 10}});
    check(std::fabs(v + 23) < 0.1, "48 k: relative gate drops -40 part of (-23 10 s, -40 10 s)", "I %.3f", v);
    LoudnessMeter m; m.prepare(48000.0, 2);
    auto z = std::vector<float>(48000 * 5, 0.0f);
    lufsFeed(m, z, &z);
    check(std::isinf(m.integratedLufs()) && std::isinf(m.momentaryLufs()), "48 k: digital silence -> -inf (I and M)",
          "I %.1f M %.1f", m.integratedLufs(), m.momentaryLufs());
}

static void testLufsTiming() {
    for (double fs : {44100.0, 48000.0, 96000.0, 192000.0}) {
        LoudnessMeter m; m.prepare(fs, 2);
        const int sub = m.subBlockLength();
        auto x = sine(fs, 1000.0, -23.0, 3.2);
        // feed sub-block by sub-block, record M and S after each
        std::vector<float> M, S;
        for (int b = 0; b < 32; ++b) {
            const float* ch[2] = {x.data() + (size_t) b * sub, x.data() + (size_t) b * sub};
            m.process(ch, 2, sub);
            M.push_back(m.momentaryLufs());
            S.push_back(m.shortTermLufs());
        }
        // expected from a window partly filled with silence: L = −23 + 10·log10(k/K)
        const double m1 = -23 + 10 * std::log10(1.0 / 4), m2 = -23 + 10 * std::log10(2.0 / 4), m4 = -23.0;
        const double s15 = -23 + 10 * std::log10(15.0 / 30), s30 = -23.0;
        char name[128];
        std::snprintf(name, sizeof name, "%6.1f k: momentary 100/200/400 ms after onset", fs / 1000);
        check(std::fabs(M[0] - m1) < 0.15 && std::fabs(M[1] - m2) < 0.1 && std::fabs(M[3] - m4) < 0.1, name,
              "%.2f %.2f %.2f", M[0], M[1], M[3]);
        std::snprintf(name, sizeof name, "%6.1f k: short-term 1.5 s / 3 s after onset (-26.01/-23)", fs / 1000);
        check(std::fabs(S[14] - s15) < 0.1 && std::fabs(S[29] - s30) < 0.1, name, "%.3f %.3f", S[14], S[29]);
        // offset: 200 ms after the tone stops the window is half tone; at 400 ms only the K-filter ring-down of the
        // cut (in the first silent sub-block) is left; at 500 ms that has left the window too
        auto zz = std::vector<float>((size_t) sub * 4, 0.0f);
        const float* chz[2] = {zz.data(), zz.data()};
        m.process(chz, 2, sub * 2);
        const float half = m.momentaryLufs();
        m.process(chz, 2, sub * 2);
        const float at400 = m.momentaryLufs();
        m.process(chz, 2, sub);
        std::snprintf(name, sizeof name, "%6.1f k: momentary 200/400/500 ms after offset", fs / 1000);
        check(std::fabs(half - m2) < 0.1 && at400 < -60.0f && m.momentaryLufs() < -90.0f, name, "%.2f %.1f %.1f", half, at400,
              m.momentaryLufs());
    }
}

// ───────────────────────────── Spectrum
static void feedStereo(FFTAnalyzer& a, const std::vector<float>& L, const std::vector<float>& R,
                       const std::vector<float>* SL = nullptr, const std::vector<float>* SR = nullptr) {
    const int B = 480;
    for (size_t i = 0; i < L.size(); i += B) {
        const int n = (int) std::min<size_t>(B, L.size() - i);
        a.feed(L.data() + i, R.data() + i, SL ? SL->data() + i : nullptr, SR ? SR->data() + i : nullptr, n);
    }
}

static void testSpectrum() {
    for (double fs : {48000.0, 96000.0}) {
        for (int order = 10; order <= 13; ++order) {
            for (double f0 : {100.0, 1000.0, 5432.1}) {
                if (f0 < 2.0 * fs / (1 << order)) {  // tone below 2 bins: image interference, not resolvable
                    std::printf("[SKIP] %3.0f k N=%4d sine %6.1f Hz: below 2 FFT bins (%.1f Hz/bin), see limitations\n", fs / 1000,
                                1 << order, f0, fs / (1 << order));
                    continue;
                }
                FFTAnalyzer a; a.prepare(fs, order, 400);
                auto x = sine(fs, f0, -12.0, 1.5);
                feedStereo(a, x, x);
                const auto& fr = a.frame();
                const int pk = argmaxv(fr.mainMid);
                const int near = nearestPoint(fr.hz, f0);
                const double errOct = std::fabs(std::log2(fr.hz[(size_t) pk] / f0));
                const double bin = fs / (1 << order);
                // allowed peak position error: one display point or a quarter bin, whichever is larger
                const double tolOct = std::max(std::log2(fr.hz[1] / fr.hz[0]) * 1.01, std::log2((f0 + bin / 4) / f0));
                char name[128];
                std::snprintf(name, sizeof name, "%3.0f k N=%4d sine %6.1f Hz -12 dBFS: peak position", fs / 1000, 1 << order, f0);
                check(errOct <= tolOct, name, "peak @ %.1f Hz (err %.4f oct)", fr.hz[(size_t) pk], errOct);
                std::snprintf(name, sizeof name, "%3.0f k N=%4d sine %6.1f Hz -12 dBFS: level ±1 dB", fs / 1000, 1 << order, f0);
                check(std::fabs(fr.mainMid[(size_t) near] + 12.0) < 1.0 && std::fabs(fr.mainMid[(size_t) pk] + 12.0) < 1.0,
                      name, "at nearest %.2f dB, at peak %.2f dB", fr.mainMid[(size_t) near], fr.mainMid[(size_t) pk]);
                if (order == 12 && f0 == 100.0) {
                    const bool pkOk = !fr.peaksMain.empty() && std::fabs(std::log2(fr.hz[(size_t) fr.peaksMain[0]] / f0)) < 1.0 / 12;
                    check(pkOk, "  peaksMain[0] marks the tone", "%.1f Hz", pkOk ? fr.hz[(size_t) fr.peaksMain[0]] : 0.0);
                    const float side = *std::max_element(fr.mainSide.begin(), fr.mainSide.end());
                    check(side <= -140.0f, "  L=R tone: Side ≈ -inf", "max side %.1f dB", side);
                }
            }
        }
    }
    // worst-case scalloping sweep: 4096 @ 48 k, sines placed between bins
    {
        double worst = 0, worstF = 0;
        for (int k = 0; k < 40; ++k) {
            const double f0 = 200.0 * std::pow(2.0, k / 8.0) + 3.7;  // 200 Hz … 6.4 kHz, arbitrary bin offsets
            FFTAnalyzer a; a.prepare(48000.0, 12, 400);
            auto x = sine(48000.0, f0, -12.0, 0.5);
            feedStereo(a, x, x);
            const float v = a.frame().mainMid[(size_t) argmaxv(a.frame().mainMid)];
            if (std::fabs(v + 12.0) > worst) { worst = std::fabs(v + 12.0); worstF = f0; }
        }
        check(worst < 0.5, "48 k N=4096: 40 off-bin sines 200 Hz-6.4 kHz read -12 dB", "worst %.3f dB @ %.0f Hz", worst, worstF);
    }
    // L = −R: Mid ≈ −inf, Side at level
    {
        FFTAnalyzer a; a.prepare(48000.0, 12, 400);
        auto x = sine(48000.0, 440.0, -12.0, 1.0);
        auto y = x;
        for (auto& v : y) v = -v;
        feedStereo(a, x, y);
        const auto& fr = a.frame();
        const float mid = *std::max_element(fr.mainMid.begin(), fr.mainMid.end());
        const float side = fr.mainSide[(size_t) nearestPoint(fr.hz, 440.0)];
        check(mid <= -140.0f && std::fabs(side + 12.0f) < 1.0f, "L=-R tone: Mid ≈ -inf, Side = -12 dB", "mid %.1f side %.2f", mid, side);
    }
    // only L: Mid and Side both −6 dB (M = S = L/2)
    {
        FFTAnalyzer a; a.prepare(48000.0, 12, 400);
        auto x = sine(48000.0, 440.0, -12.0, 1.0);
        std::vector<float> z(x.size(), 0.0f);
        feedStereo(a, x, z);
        const int i = nearestPoint(a.frame().hz, 440.0);
        check(std::fabs(a.frame().mainMid[(size_t) i] + 18.02f) < 1.0f && std::fabs(a.frame().mainSide[(size_t) i] + 18.02f) < 1.0f,
              "L-only tone: Mid = Side = -18 dB", "mid %.2f side %.2f", a.frame().mainMid[(size_t) i], a.frame().mainSide[(size_t) i]);
    }
    // default FFT size by sample rate, display grid bounds
    {
        FFTAnalyzer a; a.prepare(48000.0);
        FFTAnalyzer b; b.prepare(96000.0);
        FFTAnalyzer c; c.prepare(44100.0, 0, 400);
        check(a.fftSize() == 4096 && b.fftSize() == 8192 && a.hopSize() == 1024, "default N: 4096 @ 48 k, 8192 @ 96 k, hop N/4",
              "%g %g", a.fftSize(), b.fftSize());
        check(c.frame().hz.size() == 400 && std::fabs(c.frame().hz.front() - 20.0f) < 1e-3 && std::fabs(c.frame().hz.back() - 20000.0f) < 0.1,
              "display grid: 400 points 20 Hz-20 kHz", "%.2f-%.1f", c.frame().hz.front(), c.frame().hz.back());
    }
}

// ───────────────────────────── Conflict
struct KickBass { std::vector<float> kick, bass; };
static KickBass makeKickBass(double fs, double seconds, double bassAmp = 0.25) {
    KickBass kb;
    const size_t n = (size_t) (seconds * fs);
    kb.kick.assign(n, 0.0f);
    kb.bass.assign(n, 0.0f);
    const size_t period = (size_t) (0.5 * fs);
    double ph = 0;
    for (size_t i = 0; i < n; ++i) {
        const double t = (double) (i % period) / fs;
        if (i % period == 0) ph = 0;
        const double f = 55.0 + 65.0 * std::exp(-t / 0.02);  // 120 → 55 Hz pitch drop
        ph += 2.0 * kPi * f / fs;
        kb.kick[i] = (float) (0.7 * std::exp(-t / 0.15) * std::sin(ph));
        const double tt = (double) i / fs;
        kb.bass[i] = (float) (bassAmp * std::sin(2 * kPi * 55.0 * tt) + bassAmp * std::sin(2 * kPi * 300.0 * tt));
    }
    return kb;
}

static void checkNodesSeparated(const std::vector<NodeSuggestion>& nodes, const char* name) {
    double minSep = 99;
    for (size_t i = 0; i < nodes.size(); ++i)
        for (size_t j = i + 1; j < nodes.size(); ++j)
            minSep = std::min(minSep, (double) std::fabs(std::log2(nodes[i].freqHz / nodes[j].freqHz)));
    check(minSep >= 1.0 / 3.0 - 1e-4, name, "min separation %.3f oct (%g nodes)", nodes.size() > 1 ? minSep : 99.0, (double) nodes.size());
}

static void printNodes(const std::vector<NodeSuggestion>& nodes) {
    for (auto& n : nodes)
        std::printf("       node %7.1f Hz  range %5.2f dB  thr %6.1f dB  Q %4.2f  att %4.1f ms  rel %5.1f ms  ch %d  c %.2f\n",
                    n.freqHz, n.rangeDb, n.thresholdDb, n.q, n.attackMs, n.releaseMs, n.channel, n.conflict);
}

static SpectrumFrame learn(const std::vector<float>& mL, const std::vector<float>& mR, const std::vector<float>& sL,
                           const std::vector<float>& sR, float gainOffset = 0.0f, float* dispMax55 = nullptr) {
    FFTAnalyzer a; a.prepare(48000.0, 0, 400);
    a.setGainOffsetDb(gainOffset);
    SpectrumAccumulator acc;
    a.setAccumulator(&acc);
    const int B = 480;
    for (size_t i = 0; i < mL.size(); i += B) {
        const int n = (int) std::min<size_t>(B, mL.size() - i);
        a.feed(mL.data() + i, mR.data() + i, sL.data() + i, sR.data() + i, n);
        if (dispMax55 != nullptr) *dispMax55 = std::max(*dispMax55, maxIn(a.frame().conflictMid, a.frame().hz, 50, 60));
    }
    return acc.average();
}

// expected range/threshold of a node from the frame's active levels: the resolver reads them at the region's
// strongest point, which lies near (here: within 1/3 oct of) the node frequency → bracket [lo, hi] over those points.
// Exact sizing is checked on the synthetic frames below, where the needed reduction is known in closed form.
struct Expect { float rLo, rHi, tLo, tHi; };
static Expect nodeExpect(const SpectrumFrame& f, const NodeSuggestion& nd, float X, float g) {
    Expect e{1e9f, -1e9f, 1e9f, -1e9f};
    auto ps = [](float a, float b) { return (float) (10 * std::log10(std::pow(10.0, a / 10) + std::pow(10.0, b / 10))); };
    for (size_t p = 0; p < f.hz.size(); ++p) {
        if (std::fabs(std::log2(f.hz[p] / nd.freqHz)) > 1.0 / 3.0) continue;
        float m, sc;
        if (nd.channel == 1) { m = f.mainMidActive[p]; sc = f.scMidActive[p]; }
        else if (nd.channel == 2) { m = f.mainSideActive[p]; sc = f.scSideActive[p]; }
        else { m = ps(f.mainMidActive[p], f.mainSideActive[p]); sc = ps(f.scMidActive[p], f.scSideActive[p]); }
        const float r = std::min(12.0f, (m - g) - (sc - X)), t = std::clamp(sc - 6.0f, -60.0f, 0.0f);
        e.rLo = std::min(e.rLo, r); e.rHi = std::max(e.rHi, r);
        e.tLo = std::min(e.tLo, t); e.tHi = std::max(e.tHi, t);
    }
    return e;
}
static bool within(float v, float lo, float hi) { return v >= lo - 0.01f && v <= hi + 0.01f; }

static void testConflict() {
    const double fs = 48000.0;
    // bass (−6 dBFS sines at 55 + 300 Hz) is LOUDER than the kick at 55 Hz while the kick sounds
    auto kb = makeKickBass(fs, 6.0, 0.5);
    float dispMax55 = 0;
    const SpectrumFrame avg = learn(kb.bass, kb.bass, kb.kick, kb.kick, 0.0f, &dispMax55);
    const auto& hz = avg.hz;
    const float c55 = maxIn(avg.conflictMid, hz, 50, 60);
    const float c300 = maxIn(avg.conflictMid, hz, 270, 330);
    const float c1k = maxIn(avg.conflictMid, hz, 800, 1250);
    const float cSide = *std::max_element(avg.conflictSide.begin(), avg.conflictSide.end());
    check(avg.hasSidechain && avg.mainMidActive.size() == hz.size(), "learn: sidechain detected, active levels filled");
    check(c55 > 0.5f, "kick 55 Hz vs louder bass 55+300 Hz (gap 3): conflict ~55 Hz", "avg C(55) = %.3f, display max %.3f", c55, dispMax55);
    check(c300 < 0.1f, "  no conflict at 300 Hz (bass only)", "C(300) = %.3f", c300);
    check(c1k < 0.05f, "  no conflict at 1 kHz", "C(1k) = %.3f", c1k);
    check(cSide < 0.01f, "  mono material: no Side conflict", "max C_side = %.4f", cSide);
    const double probe[] = {25.0, 40.0, 55.0, 70.0, 93.0, 120.0, 150.0, 200.0, 300.0, 1000.0, 3000.0};
    auto row = [&](const char* label, const std::vector<float>& v, const char* fmt) {
        std::printf("       %-17s", label);
        for (double fq : probe) std::printf(fmt, v[(size_t) nearestPoint(hz, fq)]);
        std::printf("\n");
    };
    std::printf("       %-17s", "f [Hz]");
    for (double fq : probe) std::printf("%7.0f", fq);
    std::printf("\n");
    row("main avg dB", avg.mainMid, "%7.1f");
    row("main active dB", avg.mainMidActive, "%7.1f");
    row("sc avg dB", avg.scMid, "%7.1f");
    row("sc active dB", avg.scMidActive, "%7.1f");
    row("C_mid (gap 3)", avg.conflictMid, "%7.2f");

    // resolve at X = 0, 3, 6, 9: range = exactly the reduction to the target gap (capped at 12)
    float prevRange = -1;
    bool monotone = true;
    for (float X : {0.0f, 3.0f, 6.0f, 9.0f}) {
        auto nodes = resolveConflicts(avg, X, 8);
        std::printf("     X = %.0f dB:\n", X);
        printNodes(nodes);
        char name[128];
        std::snprintf(name, sizeof name, "resolve(X=%.0f): 1..8 nodes, top within 1/4 oct of 55 Hz, Mid", X);
        const bool top = !nodes.empty() && nodes.size() <= 8 && std::fabs(std::log2(nodes[0].freqHz / 55.0)) < 0.25 && nodes[0].channel == 1;
        check(top, name, "%g nodes, top %.1f Hz", (double) nodes.size(), nodes.empty() ? 0.0 : nodes[0].freqHz);
        if (nodes.empty()) continue;
        const Expect e = nodeExpect(avg, nodes[0], X, 0.0f);
        std::snprintf(name, sizeof name, "  X=%.0f: range == main - (sc - X) (bracket +-1/3 oct)", X);
        check(within(nodes[0].rangeDb, e.rLo, e.rHi) && nodes[0].rangeDb <= 12.0f, name, "range %.2f dB, expected %.2f..%.2f",
              nodes[0].rangeDb, e.rLo, e.rHi);
        std::snprintf(name, sizeof name, "  X=%.0f: threshold == sc band level - 6 dB", X);
        check(within(nodes[0].thresholdDb, e.tLo, e.tHi), name, "thr %.2f, expected %.2f..%.2f", nodes[0].thresholdDb, e.tLo, e.tHi);
        monotone = monotone && nodes[0].rangeDb >= prevRange - 0.05f;
        prevRange = nodes[0].rangeDb;
        bool clean = true;
        for (auto& n : nodes)
            if (std::fabs(std::log2(n.freqHz / 1000.0)) < 0.5 || std::fabs(std::log2(n.freqHz / 300.0)) < 1.0 / 6.0) clean = false;
        std::snprintf(name, sizeof name, "  X=%.0f: no node near 300 Hz or 1 kHz", X);
        check(clean, name);
        std::snprintf(name, sizeof name, "  X=%.0f: Q in [0.5,8], slow att/rel at 55 Hz", X);
        check(nodes[0].q >= 0.5f && nodes[0].q <= 8.0f && nodes[0].attackMs >= 8.0f && nodes[0].releaseMs >= 130.0f, name,
              "Q %.2f, %.1f / %.1f ms", nodes[0].q, nodes[0].attackMs, nodes[0].releaseMs);
        std::snprintf(name, sizeof name, "  X=%.0f: no two nodes within 1/3 oct", X);
        checkNodesSeparated(nodes, name);
    }
    check(monotone, "range grows with the target gap X");

    // main QUIETER than the sidechain at 55 Hz (bass −14 dBFS, gap ≈ 5 dB): X = 0 → nothing to do;
    // X = 9 → only the missing 9 − gap dB
    {
        auto q = makeKickBass(fs, 6.0, 0.2);
        const SpectrumFrame av = learn(q.bass, q.bass, q.kick, q.kick);
        const int p = nearestPoint(av.hz, 55.0);
        const float gap = av.scMidActive[(size_t) p] - av.mainMidActive[(size_t) p];
        auto n0 = resolveConflicts(av, 0.0f, 8);
        check(n0.empty(), "main under sc (active gap > 0): X=0 → no nodes", "gap at 55 Hz %.1f dB, %g nodes", gap, (double) n0.size());
        auto n9 = resolveConflicts(av, 9.0f, 8);
        printNodes(n9);
        const Expect e = n9.empty() ? Expect{0, 0, 0, 0} : nodeExpect(av, n9[0], 9.0f, 0.0f);
        check(!n9.empty() && within(n9[0].rangeDb, e.rLo, e.rHi) && n9[0].rangeDb < 9.0f && std::fabs(std::log2(n9[0].freqHz / 55.0)) < 0.25,
              "  X=9 → node at 55 Hz sized to the remaining gap (< 9 dB)", "range %.2f, expected %.2f..%.2f",
              n9.empty() ? 0.0 : n9[0].rangeDb, e.rLo, e.rHi);
    }
    // no sidechain → no conflict
    {
        FFTAnalyzer b; b.prepare(fs, 0, 400);
        feedStereo(b, kb.bass, kb.bass);
        const float mx = *std::max_element(b.frame().conflictMid.begin(), b.frame().conflictMid.end());
        check(!b.frame().hasSidechain && mx == 0.0f && resolveConflicts(b.frame(), 9.0f).empty(),
              "no sidechain: conflict 0, no nodes", "max %.2f", mx);
    }
    // gain stage fix: kick 30 dB down, bass −12 dBFS. Raw: main far louder → conflict, range capped at 12.
    // Offset +40 dB (main − sc) → the gain-staged main is ~8 dB under the kick → no conflict (gap ≥ 3).
    {
        auto loud = makeKickBass(fs, 4.0, 0.25);
        for (auto& v : loud.kick) v *= 0.0316f;
        const SpectrumFrame a0 = learn(loud.bass, loud.bass, loud.kick, loud.kick, 0.0f);
        const SpectrumFrame a40 = learn(loud.bass, loud.bass, loud.kick, loud.kick, 40.0f);
        const float c0 = maxIn(a0.conflictMid, a0.hz, 50, 60), c40 = maxIn(a40.conflictMid, a40.hz, 50, 60);
        check(c0 > 0.5f && c40 < 0.1f, "gain offset 0 / +40 dB: conflict at 55 Hz present / gone", "C(55) %.3f / %.3f", c0, c40);
        auto n0 = resolveConflicts(a0, 3.0f, 8, 0.0f);
        auto n40 = resolveConflicts(a0, 3.0f, 8, 40.0f);
        check(!n0.empty() && std::fabs(n0[0].rangeDb - 12.0f) < 1e-4f, "  offset 0: range capped at 12 dB", "%.2f dB",
              n0.empty() ? 0.0 : n0[0].rangeDb);
        check(n40.empty(), "  resolve with gainOffset +40: no nodes", "%g nodes", (double) n40.size());
    }
    // Side-only conflict: 2 kHz side bursts on the sidechain, louder 2 kHz side tone + 500 Hz mid tone on main
    {
        const size_t n = (size_t) (4.0 * fs);
        std::vector<float> mL(n), mR(n), sL(n), sR(n);
        for (size_t i = 0; i < n; ++i) {
            const double t = (double) i / fs;
            const double tb = std::fmod(t, 0.25);
            const double side = 0.4 * std::sin(2 * kPi * 2000 * t);
            const double mid = 0.2 * std::sin(2 * kPi * 500 * t);
            mL[i] = (float) (mid + side);
            mR[i] = (float) (mid - side);
            const double burst = 0.3 * std::exp(-tb / 0.06) * std::sin(2 * kPi * 2000 * t);
            sL[i] = (float) burst;
            sR[i] = (float) -burst;
        }
        const SpectrumFrame av = learn(mL, mR, sL, sR);
        auto nd = resolveConflicts(av, 3.0f, 8);
        printNodes(nd);
        const bool ok = !nd.empty() && nd[0].channel == 2 && std::fabs(std::log2(nd[0].freqHz / 2000.0)) < 0.25;
        check(ok, "side-only conflict at 2 kHz → Side node near 2 kHz", "%.0f Hz ch %g", nd.empty() ? 0.0 : nd[0].freqHz,
              nd.empty() ? -1.0 : nd[0].channel);
        if (!nd.empty()) {
            const Expect e = nodeExpect(av, nd[0], 3.0f, 0.0f);
            check(within(nd[0].rangeDb, e.rLo, e.rHi), "  range == side gap to X", "%.2f dB, expected %.2f..%.2f", nd[0].rangeDb, e.rLo, e.rHi);
            check(nd[0].attackMs < 2.5f && nd[0].releaseMs < 70.0f, "  fast attack/release at 2 kHz", "%.1f / %.1f ms", nd[0].attackMs, nd[0].releaseMs);
        }
        bool no500 = true;
        for (auto& x : nd) if (std::fabs(std::log2(x.freqHz / 500.0)) < 0.5) no500 = false;
        check(no500, "  no node at the main-only 500 Hz tone");
    }
    // synthetic frames (levels): pink sidechain (−20 dB at 1 kHz, −3 dB/oct), main 20 dB under it with bumps up to the
    // sidechain level → conflicts at the bumps, each needing exactly X
    {
        FFTAnalyzer g; g.prepare(48000.0, 12, 400);
        SpectrumFrame f = g.frame();
        f.hasSidechain = true;
        for (size_t i = 0; i < f.hz.size(); ++i) f.scMid[i] = (float) (-20.0 - 3.0 * std::log2(f.hz[i] / 1000.0));
        std::fill(f.mainSide.begin(), f.mainSide.end(), kFloorDb);
        std::fill(f.scSide.begin(), f.scSide.end(), kFloorDb);
        auto bumps = [&](const std::vector<double>& centres) {
            for (size_t i = 0; i < f.hz.size(); ++i) {
                double v = 0;
                for (double c : centres) {
                    const double d = std::log2(f.hz[i] / c) / 0.08;
                    v = std::max(v, std::exp(-d * d));
                }
                f.mainMid[i] = (float) (f.scMid[i] - 20.0 + 20.0 * v);
            }
        };
        std::vector<double> many;
        for (int k = 0; k < 14; ++k) many.push_back(100.0 * std::pow(2.0, k * 0.5));  // 14 peaks, 1/2 oct apart
        bumps(many);
        for (int mx : {6, 8}) {
            auto nd = resolveConflicts(f, 3.0f, mx);
            char name[96];
            std::snprintf(name, sizeof name, "synthetic 14 conflict peaks, maxNodes %d", mx);
            check((int) nd.size() <= mx && (int) nd.size() >= mx - 1, name, "%g nodes", (double) nd.size());
            checkNodesSeparated(nd, "  separation >= 1/3 oct");
            bool sized = true;
            float worst = 0;
            for (auto& x : nd) { sized = sized && std::fabs(x.rangeDb - 3.0f) < 0.05f; worst = std::max(worst, std::fabs(x.rangeDb - 3.0f)); }
            check(sized, "  range == X exactly (main == sc at every bump top)", "max |range - 3| = %.3f dB", worst);
            float ws = 0;
            for (auto& x : nd) ws = std::max(ws, std::fabs(x.thresholdDb - (float) (-26.0 - 3.0 * std::log2(x.freqHz / 1000.0))));
            check(ws < 0.1f, "  threshold == sc level - 6 dB", "max err %.3f dB", ws);
        }
        bumps({200.0, 200.0 * std::pow(2.0, 1.0 / 6.0), 1000.0, 1000.0 * std::pow(2.0, 0.2)});
        auto nd = resolveConflicts(f, 3.0f, 8);
        printNodes(nd);
        check(nd.size() == 2, "two pairs of peaks 1/6 and 1/5 oct apart → 2 merged nodes", "%g nodes", (double) nd.size());
        checkNodesSeparated(nd, "  separation >= 1/3 oct");
        check(resolveConflicts(f, 0.0f, 8).empty(), "  X=0 with main never louder than sc → no nodes");
        auto n6 = resolveConflicts(f, 6.0f, 8);
        bool six = n6.size() == 2;
        for (auto& x : n6) six = six && std::fabs(x.rangeDb - 6.0f) < 0.05f;
        check(six, "  X=6 → the same 2 nodes, range 6 dB", "%g nodes, first %.2f dB", (double) n6.size(), n6.empty() ? 0.0 : n6[0].rangeDb);
    }
    // analyzer gap setter survives prepare
    {
        FFTAnalyzer z; z.setTargetGapDb(7.0f); z.prepare(48000.0);
        check(std::fabs(z.targetGapDb() - 7.0f) < 1e-6f, "FFTAnalyzer::setTargetGapDb kept across prepare()", "%.1f", z.targetGapDb());
    }
}

// ───────────────────────────── Lock-free capture
static void testFifoMapping() {
    CaptureFifo f; f.prepare(64);
    float mono[8] = {1, 2, 3, 4, 5, 6, 7, 8};
    const float* m[1] = {mono};
    f.push(m, 1, nullptr, 0, 8);
    std::vector<float> o[4];
    for (auto& v : o) v.assign(8, -1.0f);
    float* out[4] = {o[0].data(), o[1].data(), o[2].data(), o[3].data()};
    const int got = f.pop(out, 8);
    bool ok = got == 8;
    for (int i = 0; i < 8; ++i) ok = ok && o[0][i] == mono[i] && o[1][i] == mono[i] && o[2][i] == 0 && o[3][i] == 0;
    check(ok, "FIFO: mono main duplicated, missing sidechain = zeros");
    // overflow: never blocks, counts drops
    CaptureFifo g; g.prepare(16);
    float big[40] = {};
    const float* b2[2] = {big, big};
    const int w1 = g.push(b2, 2, b2, 2, 40);
    check(w1 == 16 && g.droppedFrames() == 24 && g.available() == 16, "FIFO: overflow writes what fits, counts the rest",
          "wrote %g dropped %g", w1, (double) g.droppedFrames());
}

static void testFifoStress() {
    constexpr std::uint64_t kTotal = 6'000'000;
    CaptureFifo fifo; fifo.prepare(4096);
    HistoryBuffer hist; hist.prepareFrames(6000);  // small on purpose: the writer laps readers often
    std::atomic<bool> producerDone{false};
    std::atomic<bool> stopReaders{false};
    // channel c of absolute frame k carries value (k·4 + c) mod 2^24 (exact in float)
    auto val = [](std::uint64_t k, int c) { return (float) ((k * 4 + (std::uint64_t) c) & 0xFFFFFFu); };

    std::thread producer([&] {
        std::mt19937 rng(1);
        std::vector<float> ch[4];
        for (auto& v : ch) v.resize(1024);
        std::uint64_t k = 0;
        while (k < kTotal) {
            const int n = (int) std::min<std::uint64_t>(1 + rng() % 1024, kTotal - k);
            for (int c = 0; c < 4; ++c)
                for (int i = 0; i < n; ++i) ch[c][(size_t) i] = val(k + (std::uint64_t) i, c);
            const float* mainP[2] = {ch[0].data(), ch[1].data()};
            const float* sideP[2] = {ch[2].data(), ch[3].data()};
            hist.write(mainP, 2, sideP, 2, n);  // history gets everything exactly once
            int done = 0;
            while (done < n) {  // test producer re-offers the rest (a real audio thread would drop it)
                const float* mp[2] = {ch[0].data() + done, ch[1].data() + done};
                const float* sp[2] = {ch[2].data() + done, ch[3].data() + done};
                done += fifo.push(mp, 2, sp, 2, n - done);
                if (done < n) std::this_thread::yield();
            }
            k += (std::uint64_t) n;
        }
        producerDone.store(true);
    });

    std::atomic<std::uint64_t> histOk{0}, histRetryFail{0}, histBad{0};
    std::thread histReader([&] {
        std::vector<float> o[4];
        for (auto& v : o) v.resize(4096);
        float* out[4] = {o[0].data(), o[1].data(), o[2].data(), o[3].data()};
        std::mt19937 rng(7);
        while (!stopReaders.load()) {
            const int want = 256 + (int) (rng() % 3840);
            std::uint64_t end = 0;
            const int got = hist.readLatest(want, out, &end, 4);
            if (got == 0) { histRetryFail++; continue; }
            bool ok = true;
            const std::uint64_t start = end - (std::uint64_t) got;
            for (int i = 0; i < got && ok; ++i)
                for (int c = 0; c < 4; ++c) ok = ok && o[c][(size_t) i] == val(start + (std::uint64_t) i, c);
            (ok ? histOk : histBad)++;
        }
    });

    std::uint64_t k = 0, bad = 0;
    {
        std::vector<float> o[4];
        for (auto& v : o) v.resize(2048);
        float* out[4] = {o[0].data(), o[1].data(), o[2].data(), o[3].data()};
        std::mt19937 rng(3);
        while (k < kTotal) {
            const int got = fifo.pop(out, 1 + (int) (rng() % 2048));
            for (int i = 0; i < got; ++i)
                for (int c = 0; c < 4; ++c) if (o[c][(size_t) i] != val(k + (std::uint64_t) i, c)) ++bad;
            k += (std::uint64_t) got;
            if (got == 0) std::this_thread::yield();
        }
    }
    producer.join();
    stopReaders.store(true);
    histReader.join();
    check(bad == 0 && k == kTotal,
          "FIFO stress (2 threads, 6 M frames, random block sizes): exact", "frames %.0f, corrupt %.0f", (double) k, (double) bad);
    check(histBad.load() == 0 && histOk.load() > 100, "History seqlock under concurrent writes: no torn snapshot",
          "ok %.0f, torn %.0f, gave up %.0f", (double) histOk.load(), (double) histBad.load(), (double) histRetryFail.load());
}

// ───────────────────────────── Timing
static void timing() {
    std::printf("\n-- timing --\n");
    for (auto [fs, order] : {std::pair{48000.0, 12}, std::pair{192000.0, 13}, std::pair{48000.0, 13}}) {
        FFTAnalyzer a; a.prepare(fs, order, 400);
        SpectrumAccumulator acc;
        const double secs = 10.0;
        auto kb = makeKickBass(fs, secs);
        auto t0 = std::chrono::steady_clock::now();
        const int B = 512;
        for (size_t i = 0; i < kb.bass.size(); i += B) {
            const int n = (int) std::min<size_t>(B, kb.bass.size() - i);
            a.feed(kb.bass.data() + i, kb.bass.data() + i, kb.kick.data() + i, kb.kick.data() + i, n);
        }
        const double el = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
        a.setAccumulator(&acc);
        auto t1 = std::chrono::steady_clock::now();
        for (size_t i = 0; i < kb.bass.size(); i += B) {
            const int n = (int) std::min<size_t>(B, kb.bass.size() - i);
            a.feed(kb.bass.data() + i, kb.bass.data() + i, kb.kick.data() + i, kb.kick.data() + i, n);
        }
        const double el2 = std::chrono::duration<double>(std::chrono::steady_clock::now() - t1).count();
        const double frames = secs * fs / a.hopSize();
        std::printf("FFTAnalyzer fs %6.0f N %5d hop %4d: %7.1f us/frame, %6.3f %% of real time (one core); with learn: %7.1f us/frame, %6.3f %%\n",
                    fs, a.fftSize(), a.hopSize(), el / frames * 1e6, el / secs * 100, el2 / frames * 1e6, el2 / secs * 100);
    }
    for (double fs : {48000.0, 192000.0}) {
        LoudnessMeter m; m.prepare(fs, 2);
        auto x = sine(fs, 1000.0, -20.0, 20.0);
        auto t0 = std::chrono::steady_clock::now();
        lufsFeed(m, x, &x);
        const double el = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
        std::printf("LoudnessMeter fs %6.0f stereo: %.2f ns/sample-frame, %.4f %% of real time\n", fs, el / (20.0 * fs) * 1e9, el / 20.0 * 100);
    }
}

static void testRealtimeNoAlloc() {
    const double fs = 48000.0;
    auto x = sine(fs, 1000.0, -20.0, 2.0);
    LoudnessMeter m; m.prepare(fs, 2);
    AnalysisCapture cap; cap.prepare(fs, 0.5, 6.0);
    const long before = gAllocs.load();
    for (size_t i = 0; i + 512 <= x.size(); i += 512) {
        const float* ch[2] = {x.data() + i, x.data() + i};
        m.process(ch, 2, 512);
        cap.push(ch, 2, ch, 1, 512);
        float* o[4] = {nullptr, nullptr, nullptr, nullptr};
        cap.pop(o, 512);
    }
    const long allocs = gAllocs.load() - before;
    check(allocs == 0, "audio-thread calls (LoudnessMeter::process, capture push) allocate nothing", "%g allocations",
          (double) allocs);
    // analysis thread: after the first frames the analyzer runs allocation-free as well
    FFTAnalyzer a; a.prepare(fs, 0, 400);
    for (size_t i = 0; i + 512 <= 48000; i += 512) a.feed(x.data() + i, x.data() + i, x.data() + i, x.data() + i, 512);
    const long b2 = gAllocs.load();
    for (size_t i = 48000; i + 512 <= x.size(); i += 512) a.feed(x.data() + i, x.data() + i, x.data() + i, x.data() + i, 512);
    check(gAllocs.load() - b2 == 0, "FFTAnalyzer::feed steady state allocates nothing", "%g allocations", (double) (gAllocs.load() - b2));
}

int main(int argc, char** argv) {
    std::printf("== LoudnessMeter ==\n");
    testKWeighting();
    testLufsLevels();
    testLufsGating();
    testLufsTiming();
    std::printf("\n== FFTAnalyzer ==\n");
    testSpectrum();
    std::printf("\n== ConflictDetector ==\n");
    testConflict();
    std::printf("\n== LockFree ==\n");
    testFifoMapping();
    testFifoStress();
    testRealtimeNoAlloc();
    if (!(argc > 1 && std::string(argv[1]) == "--no-timing")) timing();
    std::printf("\n%d passed, %d failed\n", gPass, gFail);
    return gFail == 0 ? 0 : 1;
}
