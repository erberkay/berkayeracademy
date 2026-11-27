// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — PhaseRotator + PhaseAnalyzer tests (standalone, no framework). Returns nonzero on failure.
// Build: g++ -std=c++20 -O2 -I tools/phaseforge/Source tools/phaseforge/Tests/phase_tests.cpp
//        tools/phaseforge/Source/DSP/PhaseRotator.cpp tools/phaseforge/Source/DSP/PhaseAnalyzer.cpp -o /tmp/pf_phase_tests
#include "DSP/PhaseAnalyzer.h"
#include "DSP/PhaseRotator.h"

#include <cstdarg>
#include <chrono>
#include <cstdio>
#include <random>
#include <string>

using namespace pf;

static int gFail = 0, gPass = 0;
static void check(bool ok, const char* fmt, ...) __attribute__((format(printf, 2, 3)));
static void check(bool ok, const char* fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    std::printf(ok ? "  [PASS] " : "  [FAIL] ");
    std::vprintf(fmt, ap);
    std::printf("\n");
    va_end(ap);
    (ok ? gPass : gFail)++;
}

static const double kRates[6] = {44100, 48000, 88200, 96000, 176400, 192000};

static double wrapDeg(double a) {
    a = std::fmod(a, 360.0);
    if (a > 180.0) a -= 360.0;
    if (a <= -180.0) a += 360.0;
    return a;
}

static double toDb(double v) { return v > 0 ? 20.0 * std::log10(v) : -400.0; }

// least-squares fit y[n] ≈ a·cos(ωn) + b·sin(ωn) over [start, start+len) where ω refers to sample index n − ref
struct Fit { double amp, phaseDeg; };
static Fit fitSine(const std::vector<float>& y, double f, double fs, int start, int len, int ref) {
    double cc = 0, ss = 0, cs = 0, yc = 0, ys = 0;
    for (int i = start; i < start + len; ++i) {
        const double ph = 2.0 * kPi * f * (i - ref) / fs;
        const double c = std::cos(ph), s = std::sin(ph);
        cc += c * c; ss += s * s; cs += c * s; yc += y[(size_t) i] * c; ys += y[(size_t) i] * s;
    }
    const double det = cc * ss - cs * cs;
    const double a = (yc * ss - ys * cs) / det, b = (ys * cc - yc * cs) / det;
    return {std::hypot(a, b), std::atan2(-b, a) * 180.0 / kPi};   // y = A·cos(ωn + φ)
}

static void runRot(PhaseRotator& r, std::vector<float>& x) {
    float* p[1] = {x.data()};
    r.process(p, 1, (int) x.size());
}

// ═════════════════════════════ FIR rotator
static void testFirZero() {
    std::printf("\n== FIR: theta = 0 preserves input (after latency), all rates, stereo, random block sizes\n");
    for (double fs : kRates) {
        PhaseRotator r;
        r.prepare(fs, 512, 2, FilterMode::LinearPhaseFIR, 20, 200);
        const int L = r.latency();
        const int n = (int) (0.6 * fs);
        std::mt19937 rng(1);
        std::normal_distribution<float> nd(0.f, 0.3f);
        std::vector<float> a((size_t) n), b((size_t) n), a0, b0;
        for (int i = 0; i < n; ++i) { a[(size_t) i] = nd(rng); b[(size_t) i] = nd(rng); }
        a0 = a; b0 = b;
        std::uniform_int_distribution<int> bs(1, 1500);   // > maxBlock too
        for (int pos = 0; pos < n;) {
            const int m = std::min(bs(rng), n - pos);
            float* p[2] = {a.data() + pos, b.data() + pos};
            r.process(p, 2, m);
            pos += m;
        }
        double err = 0, ref = 0;
        for (int i = L; i < n; ++i) {
            err = std::max({err, (double) std::fabs(a[(size_t) i] - a0[(size_t) (i - L)]), (double) std::fabs(b[(size_t) i] - b0[(size_t) (i - L)])});
            ref = std::max(ref, (double) std::fabs(a0[(size_t) i - L]));
        }
        bool zeroHead = true;
        for (int i = 0; i < L; ++i) zeroHead &= (a[(size_t) i] == 0.f);
        check(err == 0.0 && zeroHead, "fs=%6.0f latency=%5d (Hs=%d+B=128)  max|err| = %.3g (%s dB re peak), head silent=%d",
              fs, L, PhaseRotator::firHalf(fs), err, err == 0 ? "-inf" : std::to_string(toDb(err / ref)).c_str(), (int) zeroHead);
    }
    // excursion 0 → 120° → 0 : exact again after the ramp has finished
    {
        const double fs = 48000;
        PhaseRotator r;
        r.prepare(fs, 256, 1, FilterMode::LinearPhaseFIR, 20, 200);
        const int L = r.latency(), n = (int) fs;
        std::mt19937 rng(2);
        std::normal_distribution<float> nd(0.f, 0.3f);
        std::vector<float> x((size_t) n), x0;
        for (auto& v : x) v = nd(rng);
        x0 = x;
        for (int pos = 0; pos < n; pos += 256) {
            if (pos == 4800) r.setAngle(120);
            if (pos == 14336) r.setAngle(0);
            float* p[1] = {x.data() + pos};
            r.process(p, 1, std::min(256, n - pos));
        }
        // the 0-ramp ends at 14336 + 960; band filters forget the rotated past after 2·Hs + B more samples
        const int from = 14336 + 960 + 2 * PhaseRotator::firHalf(fs) + 2 * L;
        double err = 0;
        for (int i = from; i < n; ++i) err = std::max(err, (double) std::fabs(x[(size_t) i] - x0[(size_t) (i - L)]));
        check(err < 1e-6 * 0.3, "after 0 -> 120 -> 0 excursion: max|err| = %.3g (%.1f dB re 1)", err, toDb(err));
    }
}

static void testFirRotation() {
    std::printf("\n== FIR: in-band sinusoid rotates by exactly theta (band 20-200 Hz)\n");
    const double angles[] = {-150, -90, -45, 30, 73, 100, 150, 180};
    for (double fs : kRates) {
        const bool full = (fs == 48000 || fs == 44100);
        const std::vector<double> freqs = full ? std::vector<double>{25, 30, 40, 60, 100, 150, 180, 200}
                                               : std::vector<double>{30, 60, 100, 150};
        double worstP = 0, worstM = 0, worstP30 = 0;
        std::string worstAt;
        double edgeP = 0, edgeM = 0, e25P = 0, e25M = 0;
        for (double f : freqs)
            for (double th : angles) {
                PhaseRotator r;
                r.prepare(fs, 512, 1, FilterMode::LinearPhaseFIR, 20, 200);
                r.snapAngle(th);
                const int L = r.latency(), n = L + (int) (0.1 * fs) + (int) (0.4 * fs);
                std::vector<float> x((size_t) n);
                for (int i = 0; i < n; ++i) x[(size_t) i] = (float) (0.5 * std::cos(2 * kPi * f * i / fs));
                runRot(r, x);
                const int st = L + (int) (0.1 * fs), len = n - st;
                const Fit F = fitSine(x, f, fs, st, len, L);
                const double pe = std::fabs(wrapDeg(F.phaseDeg - th)), me = std::fabs(toDb(F.amp / 0.5));
                if (f == 200 || f == 180) { edgeP = std::max(edgeP, pe); edgeM = std::max(edgeM, me); continue; }
                if (f == 25) { e25P = std::max(e25P, pe); e25M = std::max(e25M, me); continue; }
                if (f == 30) worstP30 = std::max(worstP30, pe);
                if (pe > worstP) { worstP = pe; worstAt = std::to_string((int) f) + "Hz@" + std::to_string((int) th); }
                worstM = std::max(worstM, me);
            }
        check(worstP < 0.5 && worstM < 0.1, "fs=%6.0f  f in {%s}, 8 angles: worst phase err %.3f deg (%s), worst |mag| %.4f dB, 30 Hz %.3f deg",
              fs, full ? "30,40,60,100,150" : "30,60,100,150", worstP, worstAt.c_str(), worstM, worstP30);
        if (full)
            std::printf("         (info) 25 Hz: %.3f deg / %.3f dB   180-200 Hz (band edge): %.3f deg / %.3f dB\n", e25P, e25M, edgeP, edgeM);
    }
}

static void testFirOutOfBand() {
    std::printf("\n== FIR: out-of-band sinusoids unchanged\n");
    const double angles[] = {-120, 90, 180};
    for (double fs : kRates) {
        double wp = 0, wm = 0;
        for (double f : {500.0, 1000.0, 5000.0})
            for (double th : angles) {
                PhaseRotator r;
                r.prepare(fs, 512, 1, FilterMode::LinearPhaseFIR, 20, 200);
                r.snapAngle(th);
                const int L = r.latency(), n = L + (int) (0.06 * fs) + (int) (0.2 * fs);
                std::vector<float> x((size_t) n);
                for (int i = 0; i < n; ++i) x[(size_t) i] = (float) (0.5 * std::cos(2 * kPi * f * i / fs));
                runRot(r, x);
                const int st = L + (int) (0.06 * fs);
                const Fit F = fitSine(x, f, fs, st, n - st, L);
                if (f >= 1000) { wp = std::max(wp, std::fabs(wrapDeg(F.phaseDeg))); wm = std::max(wm, std::fabs(toDb(F.amp / 0.5))); }
                else if (fs == 48000) std::printf("         (info) 500 Hz @ %4.0f deg: %.4f deg / %.4f dB\n", th, F.phaseDeg, toDb(F.amp / 0.5));
            }
        check(wp < 0.5 && wm < 0.05, "fs=%6.0f  1 kHz & 5 kHz, theta in {-120,90,180}: worst phase %.4f deg, worst |mag| %.5f dB", fs, wp, wm);
    }
}

static void clickTest(FilterMode mode, double fs) {
    PhaseRotator r;
    r.prepare(fs, 512, 1, mode, 20, 200);
    const int n = (int) (2.0 * fs);
    std::vector<float> x((size_t) n), x0;
    for (int i = 0; i < n; ++i)
        x[(size_t) i] = (float) (0.5 * std::sin(2 * kPi * 60 * i / fs) + 0.2 * std::sin(2 * kPi * 1000 * i / fs));
    x0 = x;
    std::mt19937 rng(7);
    std::uniform_real_distribution<double> ang(-180, 180);
    std::uniform_int_distribution<int> bs(16, 700);
    int pos = 0, nextChange = 0;
    while (pos < n) {
        if (pos >= nextChange) {
            // include hard cases: jumps across ±180 and back to exactly 0
            const int k = nextChange / 512;
            r.setAngle(k % 7 == 3 ? 0.0 : (k % 5 == 1 ? (k % 2 ? 179.0 : -179.0) : ang(rng)));
            nextChange += 512;
        }
        const int m = std::min(bs(rng), n - pos);
        float* p[1] = {x.data() + pos};
        r.process(p, 1, m);
        pos += m;
    }
    const int L = r.latency();
    double dx = 0, dy = 0;
    for (int i = 1; i < n; ++i) dx = std::max(dx, (double) std::fabs(x0[(size_t) i] - x0[(size_t) i - 1]));
    for (int i = L + 1; i < n; ++i) dy = std::max(dy, (double) std::fabs(x[(size_t) i] - x[(size_t) i - 1]));
    // reference: the same sweep without smoothing (hard switch every 512 samples) would jump by up to ~1.0
    check(dy < 2.0 * dx, "%s fs=%6.0f  random target every 512 samples (10.7 ms): max|dy| = %.4f vs max|dx| = %.4f (ratio %.2f, bound 2.0)",
          mode == FilterMode::LinearPhaseFIR ? "FIR" : "IIR", fs, dy, dx, dy / dx);
}

static void testSmoothing() {
    std::printf("\n== Angle smoothing: no clicks, 20 ms ramp, wrap-aware\n");
    clickTest(FilterMode::LinearPhaseFIR, 48000);
    clickTest(FilterMode::LinearPhaseFIR, 192000);
    clickTest(FilterMode::ZeroLatencyIIR, 48000);
    clickTest(FilterMode::ZeroLatencyIIR, 192000);
    {
        PhaseRotator r;
        r.prepare(48000, 64, 1, FilterMode::LinearPhaseFIR, 20, 200);
        r.snapAngle(170);
        r.setAngle(-170);
        std::vector<float> x(64, 0.f);
        double minAbs = 1e9;
        int steps = 0;
        for (int b = 0; b < 30; ++b) {
            for (int i = 0; i < 64; i += 1) {
                float* p[1] = {x.data() + i};
                r.process(p, 1, 1);
                minAbs = std::min(minAbs, std::fabs(r.currentAngleDeg()));
                ++steps;
                if (r.currentAngleDeg() == -170.0) goto done;
            }
        }
    done:
        check(minAbs >= 170.0 && r.currentAngleDeg() == -170.0 && steps == 960,
              "170 -> -170 takes the short arc through 180 (min |angle| on the way %.3f) and lands after %d samples (20 ms @48k)", minAbs, steps);
    }
    {   // chunking independence: one big call vs many tiny calls are bit-identical
        std::vector<float> a((size_t) 20000), b;
        std::mt19937 rng(3);
        std::normal_distribution<float> nd(0.f, 0.3f);
        for (auto& v : a) v = nd(rng);
        b = a;
        for (FilterMode m : {FilterMode::LinearPhaseFIR, FilterMode::ZeroLatencyIIR}) {
            std::vector<float> A = a, Bv = b;
            PhaseRotator r1, r2;
            r1.prepare(48000, 128, 1, m, 20, 200);
            r2.prepare(48000, 128, 1, m, 20, 200);
            r1.setAngle(65); r2.setAngle(65);
            float* p1[1] = {A.data()};
            r1.process(p1, 1, (int) A.size());          // n ≫ maxBlock
            for (int pos = 0; pos < (int) Bv.size(); pos += 37) {
                float* p2[1] = {Bv.data() + pos};
                r2.process(p2, 1, std::min(37, (int) Bv.size() - pos));
            }
            check(A == Bv, "%s: n = 20000 in one call (maxBlock 128) is bit-identical to 37-sample chunks",
                  m == FilterMode::LinearPhaseFIR ? "FIR" : "IIR");
        }
    }
}

// ═════════════════════════════ IIR
static void testIir() {
    std::printf("\n== IIR (zero latency): quadrature pair accuracy, all rates (IirQuadrature designed for fLo = 5 Hz)\n");
    for (double fs : kRates) {
        IirQuadrature q;
        q.design(fs, 5.0, 0.05);
        double worstA = 0, worstT = 0, worstMag = 0;
        for (double f : {5.0, 10.0, 20.0, 50.0, 100.0, 200.0, 1000.0, 5000.0, 15000.0}) {
            worstA = std::max(worstA, std::fabs(q.phaseDiffDeg(fs, f) - 90.0));
            if (f < 20) continue;
            q.reset();
            const int settle = (int) (1.0 * fs), len = (int) (0.25 * fs);
            std::vector<float> I((size_t) (settle + len)), Q((size_t) (settle + len));
            for (int i = 0; i < settle + len; ++i) {
                double a, b;
                q.process(std::cos(2 * kPi * f * i / fs), a, b);
                I[(size_t) i] = (float) a;
                Q[(size_t) i] = (float) b;
            }
            const Fit fi = fitSine(I, f, fs, settle, len, 0), fq = fitSine(Q, f, fs, settle, len, 0);
            worstT = std::max(worstT, std::fabs(wrapDeg(fi.phaseDeg - fq.phaseDeg) - 90.0));
            worstMag = std::max({worstMag, std::fabs(toDb(fi.amp)), std::fabs(toDb(fq.amp))});
        }
        check(worstA < 0.1 && worstT < 0.1 && worstMag < 0.01,
              "fs=%6.0f  %2d all-pass sections: 90 deg error analytic %.4f / measured (20 Hz-15 kHz) %.4f deg, |I|,|Q| dev %.5f dB",
              fs, q.numCoefs(), worstA, worstT, worstMag);
        PhaseRotator pr;
        pr.prepare(fs, 512, 1, FilterMode::ZeroLatencyIIR, 20, 200);
        std::printf("         (info) rotator band 20-200: LR8 corners %.1f / %.1f Hz, quadrature fLo %.2f Hz: %d sections, design error %.4f deg\n",
                    pr.designLoHz(), pr.designHiHz(), std::max(2.0, pr.designLoHz() / 4), pr.quadrature(0).numCoefs(),
                    pr.quadrature(0).designErrorDeg());
    }

    std::printf("\n== IIR: theta = 0 is an exact bypass; leaving and returning to 0\n");
    for (double fs : {44100.0, 192000.0}) {
        PhaseRotator r;
        r.prepare(fs, 512, 2, FilterMode::ZeroLatencyIIR, 20, 200);
        const int n = (int) (0.8 * fs);
        std::mt19937 rng(5);
        std::normal_distribution<float> nd(0.f, 0.3f);
        std::vector<float> a((size_t) n), b((size_t) n);
        for (int i = 0; i < n; ++i) { a[(size_t) i] = nd(rng); b[(size_t) i] = nd(rng); }
        std::vector<float> a0 = a, b0 = b;
        float* p[2] = {a.data(), b.data()};
        r.process(p, 2, n);
        check(a == a0 && b == b0 && r.latency() == 0, "fs=%6.0f  theta=0: output bit-identical to input, latency %d", fs, r.latency());
        // 0 → 90 → 0
        std::vector<float> c = a0;
        const int t1 = (int) (0.1 * fs), t2 = (int) (0.4 * fs), ramp = (int) std::lround(0.02 * fs);
        PhaseRotator r2;
        r2.prepare(fs, 512, 1, FilterMode::ZeroLatencyIIR, 20, 200);
        for (int pos = 0; pos < n;) {
            if (pos == t1) r2.setAngle(90);
            if (pos == t2) r2.setAngle(0);
            const int m = std::min({256, n - pos, pos < t1 ? t1 - pos : (pos < t2 ? t2 - pos : n)});
            float* pp[1] = {c.data() + pos};
            r2.process(pp, 1, m);
            pos += m;
        }
        bool exactBefore = true, exactAfter = true, changed = false;
        for (int i = 0; i < t1; ++i) exactBefore &= (c[(size_t) i] == a0[(size_t) i]);
        for (int i = t2 + ramp; i < n; ++i) exactAfter &= (c[(size_t) i] == a0[(size_t) i]);
        for (int i = t1 + ramp; i < t2; ++i) changed |= (c[(size_t) i] != a0[(size_t) i]);
        check(exactBefore && exactAfter && changed, "fs=%6.0f  0 -> 90 -> 0: exact before, processed during, exact again %d samples (20 ms) after return",
              fs, ramp);
    }

    std::printf("\n== IIR: relative rotation inside the band (difference of two angles, band 20-200 Hz)\n");
    for (double fs : kRates) {
        double worst = 0, worstMag = 0;
        std::string at;
        for (double f : {30.0, 40.0, 63.0, 100.0, 140.0}) {
            Fit F[2];
            const double th[2] = {30, 120};
            for (int k = 0; k < 2; ++k) {
                PhaseRotator r;
                r.prepare(fs, 512, 1, FilterMode::ZeroLatencyIIR, 20, 200);
                r.snapAngle(th[k]);
                const int n = (int) (1.5 * fs), st = (int) (1.0 * fs);
                std::vector<float> x((size_t) n);
                for (int i = 0; i < n; ++i) x[(size_t) i] = (float) (0.5 * std::cos(2 * kPi * f * i / fs));
                runRot(r, x);
                F[k] = fitSine(x, f, fs, st, n - st, 0);
            }
            const double d = std::fabs(wrapDeg(F[1].phaseDeg - F[0].phaseDeg) - 90.0);
            if (d > worst) { worst = d; at = std::to_string((int) f) + " Hz"; }
            worstMag = std::max({worstMag, std::fabs(toDb(F[0].amp / 0.5)), std::fabs(toDb(F[1].amp / 0.5))});
        }
        check(worst < 0.5 && worstMag < 0.15, "fs=%6.0f  30/40/63/100/140 Hz: |(phase@120 - phase@30) - 90| worst %.3f deg (%s), |mag| dev %.3f dB",
              fs, worst, at.c_str(), worstMag);
    }
    for (double th : {120.0, 180.0}) {   // informative: magnitude across the spectrum (all-pass outside the band)
        const double fs = 48000;
        std::printf("         (info) IIR @48k theta=%3.0f: ", th);
        for (double f : {10.0, 14.1, 20.0, 25.0, 30.0, 100.0, 150.0, 200.0, 283.0, 400.0, 1000.0}) {
            PhaseRotator r;
            r.prepare(fs, 512, 1, FilterMode::ZeroLatencyIIR, 20, 200);
            r.snapAngle(th);
            const int n = (int) (2.0 * fs), st = (int) (1.5 * fs);
            std::vector<float> x((size_t) n);
            for (int i = 0; i < n; ++i) x[(size_t) i] = (float) (0.5 * std::cos(2 * kPi * f * i / fs));
            runRot(r, x);
            std::printf("%g:%.2f ", f, toDb(fitSine(x, f, fs, st, n - st, 0).amp / 0.5));
        }
        std::printf("dB\n");
    }
}

// ═════════════════════════════ analyzer signals
// exact rotation by alpha (degrees) of a finite signal: FFT, e^{+jα} on positive and e^{-jα} on negative frequencies
static std::vector<double> rotateExact(const std::vector<double>& x, double alphaDeg) {
    const int n = (int) x.size();
    const int order = ceilPow2Order(4 * n);
    FFT f(order);
    const int N = f.size(), off = N / 4;
    std::vector<std::complex<double>> X((size_t) N);
    for (int i = 0; i < n; ++i) X[(size_t) (off + i)] = x[(size_t) i];
    f.perform(X.data(), false);
    const std::complex<double> ep = std::polar(1.0, alphaDeg * kPi / 180.0);
    X[0] *= std::cos(alphaDeg * kPi / 180.0);
    for (int k = 1; k < N / 2; ++k) { X[(size_t) k] *= ep; X[(size_t) (N - k)] *= std::conj(ep); }
    X[(size_t) N / 2] *= std::cos(alphaDeg * kPi / 180.0);
    f.perform(X.data(), true);
    std::vector<double> y((size_t) N);
    for (int i = 0; i < N; ++i) y[(size_t) i] = X[(size_t) ((i + off) % N)].real() / N;   // y[0] ↔ x[0], tails wrap
    return y;   // index i (0..N-1): sample i for i < N − off, else negative time (i − N)
}

static std::vector<double> kickHit(double fs, double len = 0.45) {
    const int n = (int) (len * fs);
    std::vector<double> h((size_t) n);
    double ph = 0;
    for (int i = 0; i < n; ++i) {
        const double t = i / fs;
        const double f = 45.0 + 110.0 * std::exp(-t / 0.03);
        const double env = std::exp(-t / 0.15) * std::min(1.0, t / 0.002);
        h[(size_t) i] = 0.8 * env * std::sin(ph);
        ph += 2 * kPi * f / fs;
    }
    return h;
}

// kick track + bass track (each hit rotated by alpha[k]); hits every 0.5 s
static void makePair(double fs, double seconds, const std::vector<double>& alphas, double bassGain, double noise,
                     std::vector<float>& kick, std::vector<float>& bass, unsigned seed = 11) {
    const int n = (int) (seconds * fs);
    kick.assign((size_t) n, 0.f);
    bass.assign((size_t) n, 0.f);
    const auto hit = kickHit(fs);
    const int hits = (int) (seconds / 0.5);
    std::vector<double> lastRot;
    double lastA = 1e9;
    for (int k = 0; k < hits; ++k) {
        const int p = (int) std::lround(k * 0.5 * fs);
        const double a = alphas[(size_t) k % alphas.size()];
        if (a != lastA) { lastRot = rotateExact(hit, a); lastA = a; }
        for (size_t i = 0; i < hit.size() && p + (int) i < n; ++i) kick[(size_t) p + i] += (float) hit[i];
        const int N = (int) lastRot.size();
        for (int i = 0; i < N; ++i) {
            const int ti = i < N - N / 4 ? i : i - N;
            const int q = p + ti;
            if (q >= 0 && q < n) bass[(size_t) q] += (float) (bassGain * lastRot[(size_t) i]);
        }
    }
    std::mt19937 rng(seed);
    std::normal_distribution<double> nd(0.0, noise);
    for (auto& v : bass) v += (float) nd(rng);
}

static const char* st(PhaseAnalysis::Status s) {
    switch (s) {
        case PhaseAnalysis::Status::Ok: return "Ok";
        case PhaseAnalysis::Status::NotEnoughAudio: return "NotEnoughAudio";
        case PhaseAnalysis::Status::Silent: return "Silent";
        case PhaseAnalysis::Status::Unrelated: return "Unrelated";
        case PhaseAnalysis::Status::Inconsistent: return "Inconsistent";
    }
    return "?";
}

static void testAnalyzerKnown() {
    std::printf("\n== Analyzer: known relationship (bass = kick rotated by alpha, x0.8, + white noise sigma 0.01), 5 s\n");
    PhaseAnalyzer an;
    for (double fs : kRates)
        for (double alpha : {73.0, -120.0, 0.0}) {
            std::vector<float> k, b;
            makePair(fs, 5.0, {alpha}, 0.8, 0.01, k, b);
            const auto r = an.analyze(k.data(), b.data(), (int) k.size(), fs, 20, 200);
            const double err = std::fabs(wrapDeg(r.angleDeg + alpha));
            check(r.status == PhaseAnalysis::Status::Ok && err <= 1.0 && r.confidence >= 0.8 && r.score > 0.95 && (alpha == 0 || r.sumGainDb > 0.5),
                  "fs=%6.0f alpha=%6.1f -> angle %7.1f (err %.2f) %s conf %.3f score %.4f (at0 %.3f) coh %.3f R %.4f gain %+.2f dB win %d",
                  fs, alpha, r.angleDeg, err, st(r.status), r.confidence, r.score, r.scoreAt0, r.coherence, r.consistency, r.sumGainDb, r.windowsUsed);
        }
    std::printf("\n== Analyzer: destructive (bass = -kick) -> 180 deg\n");
    for (double fs : {44100.0, 96000.0, 192000.0}) {
        std::vector<float> k, b;
        makePair(fs, 5.0, {0.0}, 1.0, 0.0, k, b);
        for (auto& v : b) v = -v;
        const auto r = an.analyze(k.data(), b.data(), (int) k.size(), fs, 20, 200);
        check(r.status == PhaseAnalysis::Status::Ok && std::fabs(wrapDeg(r.angleDeg - 180.0)) <= 1.0 && r.confidence > 0.8 && r.scoreAt0 < -0.99,
              "fs=%6.0f  angle %.1f %s conf %.3f scoreAt0 %.4f score %.4f gain %+.1f dB (clamped at +60)", fs, r.angleDeg, st(r.status),
              r.confidence, r.scoreAt0, r.score, r.sumGainDb);
    }
    std::printf("\n== Analyzer: Gain Stage Fix changes gain/gate, not the angle\n");
    {
        const double fs = 48000;
        std::vector<float> k, b;
        makePair(fs, 5.0, {60.0}, 0.8, 0.01, k, b);
        const auto r0 = an.analyze(k.data(), b.data(), (int) k.size(), fs, 20, 200, 0.0);
        const auto r6 = an.analyze(k.data(), b.data(), (int) k.size(), fs, 20, 200, +6.0);
        const auto rm = an.analyze(k.data(), b.data(), (int) k.size(), fs, 20, 200, -12.0);
        check(r0.angleDeg == r6.angleDeg && r0.angleDeg == rm.angleDeg && std::fabs(rm.sumGainDb - r0.sumGainDb) > 0.1,
              "angle %.1f / %.1f / %.1f at 0 / +6 / -12 dB; sumGainDb %+.2f / %+.2f / %+.2f", r0.angleDeg, r6.angleDeg, rm.angleDeg,
              r0.sumGainDb, r6.sumGainDb, rm.sumGainDb);
    }
}

static void testEndToEnd() {
    std::printf("\n== End to end: analyzer angle applied with the FIR PhaseRotator re-aligns the bass\n");
    PhaseAnalyzer an;
    for (double fs : {48000.0, 96000.0}) {
        std::vector<float> k, b;
        makePair(fs, 5.0, {-110.0}, 0.8, 0.01, k, b);
        const auto r1 = an.analyze(k.data(), b.data(), (int) k.size(), fs, 20, 200);
        PhaseRotator rot;
        rot.prepare(fs, 512, 1, FilterMode::LinearPhaseFIR, 20, 200);
        rot.snapAngle(r1.angleDeg);
        const int L = rot.latency();
        std::vector<float> b2 = b;
        b2.resize(b.size() + (size_t) L, 0.f);
        runRot(rot, b2);
        std::vector<float> b3(b2.begin() + L, b2.end());   // latency-compensated
        const auto r2 = an.analyze(k.data(), b3.data(), (int) k.size(), fs, 20, 200);
        check(r2.status == PhaseAnalysis::Status::Ok && std::fabs(r2.angleDeg) <= 1.0 && r2.scoreAt0 > 0.99,
              "fs=%6.0f  before: angle %.1f scoreAt0 %.3f -> after rotating by it: residual angle %.1f, scoreAt0 %.4f", fs, r1.angleDeg,
              r1.scoreAt0, r2.angleDeg, r2.scoreAt0);
    }
}

static void testAnalyzerNegative() {
    PhaseAnalyzer an;
    std::printf("\n== Analyzer: silence / not enough audio -> angle 0\n");
    for (double fs : kRates) {
        const int n = (int) (5 * fs);
        std::vector<float> z((size_t) n, 0.f), k, b;
        makePair(fs, 5.0, {40.0}, 0.8, 0.0, k, b);
        const auto a = an.analyze(z.data(), z.data(), n, fs, 20, 200);
        const auto c = an.analyze(k.data(), z.data(), n, fs, 20, 200);
        std::vector<float> tiny((size_t) n);
        std::mt19937 rng(9);
        std::normal_distribution<float> nd(0.f, 1e-5f);   // −100 dBFS noise
        for (auto& v : tiny) v = nd(rng);
        const auto d = an.analyze(k.data(), tiny.data(), n, fs, 20, 200);
        const auto e = an.analyze(k.data(), b.data(), (int) (0.3 * fs), fs, 20, 200);
        // a single short (0.15 s) burst in 5 s of silence: too little co-active audio (< 0.5 s covered)
        std::vector<float> k1((size_t) n, 0.f), b1((size_t) n, 0.f);
        for (int i = 0; i < (int) (0.15 * fs); ++i) { k1[(size_t) i + n / 2] = k[(size_t) i]; b1[(size_t) i + n / 2] = b[(size_t) i]; }
        const auto f = an.analyze(k1.data(), b1.data(), n, fs, 20, 200);
        using S = PhaseAnalysis::Status;
        const bool ok = a.status == S::Silent && c.status == S::Silent && d.status == S::Silent && e.status == S::NotEnoughAudio &&
                        f.status == S::NotEnoughAudio && a.angleDeg == 0 && c.angleDeg == 0 && d.angleDeg == 0 && e.angleDeg == 0 &&
                        f.angleDeg == 0;
        check(ok, "fs=%6.0f  zeros:%s  kick+silent bass:%s  kick+(-100 dBFS noise):%s  0.3 s:%s  0.15 s burst:%s (%d win)", fs, st(a.status),
              st(c.status), st(d.status), st(e.status), st(f.status), f.windowsUsed);
    }

    std::printf("\n== Analyzer: unrelated / inconsistent -> angle 0\n");
    for (double fs : kRates) {
        const int n = (int) (5 * fs);
        std::mt19937 rng(21);
        std::normal_distribution<float> nd(0.f, 0.3f);
        std::vector<float> noise((size_t) n), tone((size_t) n), tone2((size_t) n);
        for (int i = 0; i < n; ++i) {
            noise[(size_t) i] = nd(rng);
            tone[(size_t) i] = (float) (0.5 * std::sin(2 * kPi * 80 * i / fs));
            tone2[(size_t) i] = (float) (0.5 * std::sin(2 * kPi * 50 * i / fs + 0.3));
        }
        const auto u1 = an.analyze(noise.data(), tone.data(), n, fs, 20, 200);
        const auto u2 = an.analyze(tone2.data(), tone.data(), n, fs, 20, 200);
        // random phase per hit (e.g. free-running oscillator)
        std::vector<double> al;
        std::mt19937 r2(1234);
        std::uniform_real_distribution<double> ua(-180, 180);
        for (int i = 0; i < 10; ++i) al.push_back(ua(r2));
        std::vector<float> k, b;
        makePair(fs, 5.0, al, 0.8, 0.01, k, b);
        const auto u3 = an.analyze(k.data(), b.data(), n, fs, 20, 200);
        using S = PhaseAnalysis::Status;
        check(u1.status == S::Unrelated && u1.angleDeg == 0, "fs=%6.0f  white noise vs 80 Hz tone : %s angle %.1f coh %.3f R %.3f conf %.3f",
              fs, st(u1.status), u1.angleDeg, u1.coherence, u1.consistency, u1.confidence);
        check(u2.status == S::Unrelated && u2.angleDeg == 0, "fs=%6.0f  50 Hz vs 80 Hz tones      : %s angle %.1f coh %.3f R %.3f conf %.3f",
              fs, st(u2.status), u2.angleDeg, u2.coherence, u2.consistency, u2.confidence);
        check(u3.status == S::Inconsistent && u3.angleDeg == 0,
              "fs=%6.0f  random phase per hit     : %s angle %.1f coh %.3f R %.3f conf %.3f (argmax would be %.1f)", fs, st(u3.status),
              u3.angleDeg, u3.coherence, u3.consistency, u3.confidence, u3.bestAngleDeg);
    }
}

static void testTiming() {
    std::printf("\n== Analyzer timing (one core)\n");
    PhaseAnalyzer an;
    for (double fs : {48000.0, 192000.0}) {
        std::vector<float> k, b;
        makePair(fs, 5.0, {73.0}, 0.8, 0.01, k, b);
        double best = 1e9, worst = 0;
        PhaseAnalysis r;
        for (int it = 0; it < 5; ++it) {
            const auto t0 = std::chrono::steady_clock::now();
            r = an.analyze(k.data(), b.data(), (int) k.size(), fs, 20, 200);
            const double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
            best = std::min(best, ms);
            worst = std::max(worst, ms);
        }
        check(worst < 300.0, "fs=%6.0f  5 s analysis: min %.1f ms, max %.1f ms over 5 runs (limit 300 ms), angle %.1f", fs, best, worst, r.angleDeg);
    }
    {   // real-time cost of the FIR rotator (informative)
        for (double fs : {48000.0, 192000.0}) {
            PhaseRotator r;
            r.prepare(fs, 512, 2, FilterMode::LinearPhaseFIR, 20, 200);
            r.setAngle(45);
            const int n = (int) fs;
            std::vector<float> a((size_t) n, 0.1f), b((size_t) n, 0.1f);
            const auto t0 = std::chrono::steady_clock::now();
            for (int pos = 0; pos < n; pos += 512) {
                float* p[2] = {a.data() + pos, b.data() + pos};
                r.process(p, 2, std::min(512, n - pos));
            }
            const double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
            std::printf("         (info) FIR rotator stereo fs=%6.0f: %.1f ms per second of audio (%.1f %% of one core)\n", fs, ms, ms / 10.0);
        }
    }
}

int main() {
    std::printf("PHASEFORGE phase tests\n");
    testFirZero();
    testFirRotation();
    testFirOutOfBand();
    testSmoothing();
    testIir();
    testAnalyzerKnown();
    testEndToEnd();
    testAnalyzerNegative();
    testTiming();
    std::printf("\n%d passed, %d failed\n", gPass, gFail);
    return gFail == 0 ? 0 : 1;
}
