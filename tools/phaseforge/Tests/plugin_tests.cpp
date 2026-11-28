// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
// Drives PhaseForgeProcessor like a host: bus layouts, latency, bypass, phase analysis → apply, sidechain-keyed nodes,
// delta, state/A-B round trip, missing sidechain, realtime vs offline render, CPU. Run: pf_plugin_tests
#include "../Source/PluginProcessor.h"

#pragma GCC diagnostic ignored "-Wfloat-equal"  // exact comparisons are the point of these tests

#include <chrono>
#include <functional>
#include <cstdarg>
#include <cstdio>
#include <random>
#include <thread>

using namespace pf;

static int gPass = 0, gFail = 0;
static void check(bool ok, const char* fmt, ...) __attribute__((format(printf, 2, 3)));
static void check(bool ok, const char* fmt, ...) {
    (ok ? gPass : gFail)++;
    std::printf("  [%s] ", ok ? "PASS" : "FAIL");
    va_list ap;
    va_start(ap, fmt);
    std::vprintf(fmt, ap);
    va_end(ap);
    std::printf("\n");
    std::fflush(stdout);
}
static void info(const char* fmt, ...) __attribute__((format(printf, 1, 2)));
static void info(const char* fmt, ...) {
    std::printf("         (info) ");
    va_list ap;
    va_start(ap, fmt);
    std::vprintf(fmt, ap);
    va_end(ap);
    std::printf("\n");
    std::fflush(stdout);
}

static double toDb(double v) { return v > 0 ? 20.0 * std::log10(v) : -400.0; }
static double wrapDeg(double a) {
    a = std::fmod(a, 360.0);
    if (a > 180) a -= 360;
    if (a <= -180) a += 360;
    return a;
}

// ───────────────────────────── signals
struct Sig {
    std::vector<float> L, R, sL, sR;
    size_t size() const { return L.size(); }
    void pad(size_t extra) {
        for (auto* v : {&L, &R, &sL, &sR}) v->resize(v->size() + extra, 0.f);
    }
};

static std::vector<double> rotateExact(const std::vector<double>& x, double alphaDeg) {
    const int n = (int) x.size();
    FFT f(ceilPow2Order(4 * n));
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
    for (int i = 0; i < N; ++i) y[(size_t) i] = X[(size_t) ((i + off) % N)].real() / N;
    return y;
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

// kick on the sidechain, bass = kick rotated by alpha × gain (+ noise) on the main; hits every 0.5 s
static Sig kickBass(double fs, double seconds, double alpha, double gain = 0.8, double noise = 0.01) {
    const int n = (int) (seconds * fs);
    Sig s;
    s.L.assign((size_t) n, 0.f);
    s.sL.assign((size_t) n, 0.f);
    const auto hit = kickHit(fs);
    const auto rot = rotateExact(hit, alpha);
    const int N = (int) rot.size();
    for (int k = 0; k < (int) (seconds / 0.5); ++k) {
        const int p = (int) std::lround(k * 0.5 * fs);
        for (size_t i = 0; i < hit.size() && p + (int) i < n; ++i) s.sL[(size_t) p + i] += (float) hit[i];
        for (int i = 0; i < N; ++i) {
            const int ti = i < N - N / 4 ? i : i - N;
            const int q = p + ti;
            if (q >= 0 && q < n) s.L[(size_t) q] += (float) (gain * rot[(size_t) i]);
        }
    }
    std::mt19937 rng(11);
    std::normal_distribution<double> nd(0.0, noise);
    for (auto& v : s.L) v += (float) nd(rng);
    s.R = s.L;
    s.sR = s.sL;
    return s;
}

static std::vector<float> noiseVec(size_t n, double rms, unsigned seed) {
    std::mt19937 rng(seed);
    std::normal_distribution<double> nd(0.0, rms);
    std::vector<float> v(n);
    for (auto& x : v) x = (float) nd(rng);
    return v;
}

// ───────────────────────────── host helpers
static void setP(PhaseForgeProcessor& p, const juce::String& pid, float v) {
    auto* prm = p.apvts.getParameter(pid);
    if (prm == nullptr) { std::printf("  !! no parameter %s\n", pid.toRawUTF8()); return; }
    prm->setValueNotifyingHost(prm->convertTo0to1(v));
}
static float getP(PhaseForgeProcessor& p, const juce::String& pid) {
    auto* prm = p.apvts.getParameter(pid);
    return prm->convertFrom0to1(prm->getValue());
}

static std::unique_ptr<PhaseForgeProcessor> make(double fs, int block, int mainCh = 2, int scCh = 2) {
    auto p = std::make_unique<PhaseForgeProcessor>();
    auto layout = p->getBusesLayout();
    const auto set = [](int c) {
        return c == 0 ? juce::AudioChannelSet::disabled() : (c == 1 ? juce::AudioChannelSet::mono() : juce::AudioChannelSet::stereo());
    };
    layout.inputBuses.getReference(0) = set(mainCh);
    layout.outputBuses.getReference(0) = set(mainCh);
    layout.inputBuses.getReference(1) = set(scCh);
    if (!p->setBusesLayout(layout)) std::printf("  !! bus layout rejected (main %d, sc %d)\n", mainCh, scCh);
    p->setRateAndBufferSizeDetails(fs, block);
    p->prepareToPlay(fs, block);
    return p;
}

// re-run the deferred message-thread work (reconfigure after a mode change), like a host's message loop would
static void settle(PhaseForgeProcessor& p) { p.processPendingWork(); }

struct Out { std::vector<float> L, R; };
static Out run(PhaseForgeProcessor& p, const Sig& s, int block, bool pace = false, bool bypassedCall = false,
               std::vector<double>* callMs = nullptr, const std::function<void(size_t)>& beforeBlock = {}) {
    const int mainCh = p.getMainBusNumInputChannels();
    const int total = p.getTotalNumInputChannels();
    const int scCh = total - mainCh;
    const size_t n = s.size();
    Out o;
    o.L.assign(n, 0.f);
    o.R.assign(n, 0.f);
    juce::AudioBuffer<float> buf(std::max(total, 1), block);
    juce::MidiBuffer midi;
    const double fs = p.getSampleRate();
    for (size_t pos = 0; pos < n; pos += (size_t) block) {
        const int m = (int) std::min<size_t>((size_t) block, n - pos);
        buf.setSize(std::max(total, 1), m, false, false, true);
        for (int i = 0; i < m; ++i) {
            const size_t t = pos + (size_t) i;
            buf.setSample(0, i, s.L[t]);
            if (mainCh > 1) buf.setSample(1, i, s.R[t]);
            if (scCh > 0) buf.setSample(mainCh, i, s.sL[t]);
            if (scCh > 1) buf.setSample(mainCh + 1, i, s.sR[t]);
        }
        if (beforeBlock) beforeBlock(pos);
        const auto t0 = std::chrono::steady_clock::now();
        if (bypassedCall) p.processBlockBypassed(buf, midi);
        else p.processBlock(buf, midi);
        if (callMs) callMs->push_back(std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count());
        for (int i = 0; i < m; ++i) {
            o.L[pos + (size_t) i] = buf.getSample(0, i);
            o.R[pos + (size_t) i] = mainCh > 1 ? buf.getSample(1, i) : buf.getSample(0, i);
        }
        if (pace) std::this_thread::sleep_for(std::chrono::microseconds((int) (m / fs * 1e6)));
    }
    return o;
}

template <typename F>
static bool waitFor(F pred, double timeoutMs, PhaseForgeProcessor* p = nullptr) {
    const auto t0 = std::chrono::steady_clock::now();
    while (std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count() < timeoutMs) {
        if (p) p->processPendingWork();
        if (pred()) return true;
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
    return pred();
}

// max |out[t] − ref[t − lat]| for t ≥ from
static double maxDelayedErr(const std::vector<float>& out, const std::vector<float>& ref, int lat, size_t from = 0) {
    double e = 0;
    for (size_t t = std::max(from, (size_t) lat); t < out.size(); ++t) e = std::max(e, (double) std::abs(out[t] - ref[t - (size_t) lat]));
    return e;
}

struct Fit { double amp, ph; };
static Fit fitSine(const std::vector<float>& y, double f, double fs, size_t start, size_t len) {
    double sc = 0, ss = 0, cc = 0, s2 = 0, cs = 0;
    for (size_t i = start; i < start + len && i < y.size(); ++i) {
        const double w = 2 * kPi * f * (double) i / fs;
        const double c = std::cos(w), s = std::sin(w);
        sc += y[i] * c; ss += y[i] * s; cc += c * c; s2 += s * s; cs += c * s;
    }
    const double det = cc * s2 - cs * cs;
    const double a = (sc * s2 - ss * cs) / det, b = (ss * cc - sc * cs) / det;
    return {std::sqrt(a * a + b * b), std::atan2(b, a)};
}

static int expectedPhaseLat(double fs, int fm, int pm) { return (fm == 1 || pm == 1) ? (int) std::lround(0.025 * fs) + 128 : 0; }

// ═════════════════════════════ (1) bypass + 0° identity
static void testIdentity() {
    std::printf("\n== (1) Bypass and 0 deg identity: output = input delayed by the reported latency\n");
    const double fs = 48000;
    for (int fm : {1, 0})
        for (int pm : {0, 1}) {
            auto p = make(fs, 512);
            setP(*p, id::filterMode, (float) fm);
            setP(*p, id::phaseMode, (float) pm);
            settle(*p);
            const int L = p->getLatencySamples();
            Sig s;
            s.L = noiseVec(48000, 0.2, 1);
            s.R = noiseVec(48000, 0.2, 2);
            s.sL = noiseVec(48000, 0.2, 3);
            s.sR = s.sL;
            s.pad((size_t) L);
            const auto o = run(*p, s, 512);
            const double e = std::max(maxDelayedErr(o.L, s.L, L), maxDelayedErr(o.R, s.R, L));
            check(e == 0.0, "%s %s, nodes off, 0 deg: latency %d, max |out - in(t-L)| = %.3g (bit-exact expected)",
                  fm ? "FIR" : "IIR", pm ? "Match" : "Rotate", L, e);
        }
    for (int fm : {1, 0}) {
        // bypass while the processing would change the signal (90 deg, active node keyed by a loud sidechain)
        for (int viaHost : {0, 1}) {
            auto p = make(fs, 256);
            setP(*p, id::filterMode, (float) fm);
            settle(*p);
            setP(*p, id::phaseAngle, 90.f);
            setP(*p, id::node(0, "on"), 1.f);
            setP(*p, id::node(0, "freq"), 200.f);
            setP(*p, id::node(0, "range"), 12.f);
            setP(*p, id::node(0, "thr"), -60.f);
            setP(*p, id::inGain, 6.f);
            if (!viaHost) setP(*p, id::bypass, 1.f);
            p->prepareToPlay(fs, 256);   // bypass state taken at prepare: no fade at the start
            const int L = p->getLatencySamples();
            Sig s;
            s.L = noiseVec(48000, 0.2, 4);
            s.R = noiseVec(48000, 0.2, 5);
            s.sL = noiseVec(48000, 0.3, 6);
            s.sR = s.sL;
            s.pad((size_t) L);
            const auto o = run(*p, s, 256, false, viaHost == 1);
            const double e = std::max(maxDelayedErr(o.L, s.L, L, 0), maxDelayedErr(o.R, s.R, L, 0));
            // (the first 10 ms of the host-bypass run cross-fade from processed to dry, as the param is off)
            const double eTail = std::max(maxDelayedErr(o.L, s.L, L, (size_t) L + 1000), maxDelayedErr(o.R, s.R, L, (size_t) L + 1000));
            check((viaHost ? eTail : e) == 0.0, "%s bypass (%s), 90 deg + node + 6 dB in: latency %d, max |out - in(t-L)| = %.3g",
                  fm ? "FIR" : "IIR", viaHost ? "processBlockBypassed" : "bypass parameter", L, viaHost ? eTail : e);
        }
    }
    {   // bypass toggled mid-stream: 10 ms crossfade, no discontinuity beyond the signal's own slope
        auto p = make(fs, 128);
        Sig s;
        const int n = 48000;
        s.L.resize(n); s.sL.assign(n, 0.f);
        for (int i = 0; i < n; ++i) s.L[(size_t) i] = 0.5f * (float) std::sin(2 * kPi * 100.0 * i / fs);
        s.R = s.L; s.sR = s.sL;
        setP(*p, id::phaseAngle, 180.f);   // processed = −dry: the worst case for a hard switch
        Out o;
        o.L.resize(n);
        juce::AudioBuffer<float> buf(4, 128);
        juce::MidiBuffer midi;
        for (int pos = 0; pos < n; pos += 128) {
            if (pos == 24000) setP(*p, id::bypass, 1.f);
            for (int i = 0; i < 128; ++i) { buf.setSample(0, i, s.L[(size_t) (pos + i)]); buf.setSample(1, i, s.L[(size_t) (pos + i)]); buf.setSample(2, i, 0); buf.setSample(3, i, 0); }
            p->processBlock(buf, midi);
            for (int i = 0; i < 128; ++i) o.L[(size_t) (pos + i)] = buf.getSample(0, i);
        }
        double maxStep = 0;
        for (int i = 20000; i < 30000; ++i) maxStep = std::max(maxStep, (double) std::abs(o.L[(size_t) i] - o.L[(size_t) i - 1]));
        const double sigStep = 0.5 * 2 * kPi * 100.0 / fs;
        check(maxStep < 1.2 * sigStep, "bypass switch at 180 deg (processed = -dry): max sample step %.5f vs sine slope %.5f (10 ms fade)",
              maxStep, sigStep);
    }
}

// ═════════════════════════════ (6) latency vs measured impulse delay
static void testLatency() {
    std::printf("\n== (6) Reported latency = measured impulse delay, all (filterMode, phaseMode), 44.1/48/96/192 kHz\n");
    std::printf("     fs      filter  phase   reported  expected(phase+eq)  measured  peak\n");
    for (double fs : {44100.0, 48000.0, 96000.0, 192000.0})
        for (int fm : {0, 1})
            for (int pm : {0, 1}) {
                auto p = make(fs, 480);
                setP(*p, id::filterMode, (float) fm);
                setP(*p, id::phaseMode, (float) pm);
                settle(*p);   // async reconfigure path (setLatencySamples on the message thread)
                const int L = p->getLatencySamples();
                const int Lp = expectedPhaseLat(fs, fm, pm);
                const int Ld = p->dynamicEqLatency();
                const int Mgrid = 8192 << std::max(0, (int) std::lround(std::log2(fs / 48000.0)));
                const int LdExp = fm == 1 ? Mgrid / 32 + Mgrid / 2 : 0;
                Sig s;
                const size_t n = (size_t) (L + 4000 + 1000);
                s.L.assign(n, 0.f); s.R.assign(n, 0.f); s.sL.assign(n, 0.f); s.sR.assign(n, 0.f);
                s.L[1000] = 1.f; s.R[1000] = -0.5f;
                const auto o = run(*p, s, 480);
                size_t at = 0;
                float pk = 0;
                for (size_t i = 0; i < n; ++i) if (std::abs(o.L[i]) > pk) { pk = std::abs(o.L[i]); at = i; }
                const int meas = (int) at - 1000;
                const bool ok = meas == L && L == Lp + LdExp && p->phaseStageLatency() == Lp && Ld == LdExp && std::abs(pk - 1.f) < 1e-6f &&
                                std::abs(o.R[at] + 0.5f) < 1e-6f;
                check(ok, "%6.0f  %s  %-6s  %8d  %8d + %-8d  %8d  %.6f", fs, fm ? "FIR" : "IIR", pm ? "Match" : "Rotate", L, Lp, LdExp, meas, pk);
            }
    {   // band change keeps the latency; a mode change updates it through the AsyncUpdater
        auto p = make(48000, 512);
        const int L0 = p->getLatencySamples();
        setP(*p, id::phaseRange, 3.f);
        setP(*p, id::phaseLo, 60.f);
        setP(*p, id::phaseHi, 900.f);
        settle(*p);
        const int L1 = p->getLatencySamples();
        setP(*p, id::filterMode, 0.f);
        const int Lbefore = p->getLatencySamples();
        settle(*p);
        const int L2 = p->getLatencySamples();
        check(L0 == L1 && Lbefore == L0 && L2 == 0, "band 60-900 Hz keeps latency %d -> %d; FIR -> IIR: %d before message thread, %d after", L0, L1, Lbefore, L2);
    }
}

// ═════════════════════════════ (2) kick/bass: analyze → apply → summed low band improves
static double bandEnergy(const std::vector<float>& a, const std::vector<float>* b, int bShift, double fs, size_t from, size_t to) {
    LR4 hp, lp;
    hp.design(fs, 20, true);
    lp.design(fs, 200, false);
    double e = 0;
    for (size_t t = 0; t < to && t < a.size(); ++t) {
        double x = a[t];
        if (b) {
            const long q = (long) t - bShift;
            x += q >= 0 && q < (long) b->size() ? (*b)[(size_t) q] : 0.0;
        }
        const double y = lp.process(hp.process(x));
        if (t >= from) e += y * y;
    }
    return e;
}

static PhaseResult analyzeThrough(PhaseForgeProcessor& p, const Sig& s, int block, double timeoutMs = 30000) {
    p.requestPhaseAnalysis();
    run(p, s, block);
    waitFor([&] { return p.getPhaseResult().state == AnalysisState::Done; }, timeoutMs, &p);
    return p.getPhaseResult();
}

static const char* stName(PhaseResult::Status s) {
    switch (s) {
        case PhaseResult::Status::Ok: return "Ok";
        case PhaseResult::Status::NotEnoughAudio: return "NotEnoughAudio";
        case PhaseResult::Status::Silent: return "Silent";
        case PhaseResult::Status::Unrelated: return "Unrelated";
        case PhaseResult::Status::Inconsistent: return "Inconsistent";
        case PhaseResult::Status::NoSidechain: return "NoSidechain";
    }
    return "?";
}

static void testKickBass() {
    std::printf("\n== (2) Kick (sidechain) / bass = kick rotated by alpha: Analyze -> apply -> low band sum improves\n");
    for (double fs : {48000.0, 96000.0})
        for (double alpha : {-110.0, 75.0})
            for (int fm : {1, 0}) {
                auto p = make(fs, 512);
                setP(*p, id::filterMode, (float) fm);
                settle(*p);
                const Sig s = kickBass(fs, 4.5, alpha);
                const auto r = analyzeThrough(*p, s, 512);
                const double expect = wrapDeg(-alpha);
                const double err = std::abs(wrapDeg(r.angleDeg - expect));
                if (fm == 1)
                    check(r.status == PhaseResult::Status::Ok && err <= 1.0,
                          "FIR fs %.0f alpha %+.0f: status %s, angle %+.1f (expected %+.1f, err %.2f), conf %.2f, score %.3f (at 0: %.3f), "
                          "predicted sum %+.2f dB, %.2f s analysed",
                          fs, alpha, stName(r.status), r.angleDeg, expect, err, r.confidence, r.score, r.scoreAt0, r.sumGainDb, r.seconds);
                else
                    check(r.status == PhaseResult::Status::Ok,
                          "IIR fs %.0f alpha %+.0f: status %s, angle %+.1f vs IIR all-pass reference (pure-rotation angle %+.1f), conf %.2f, "
                          "predicted sum %+.2f dB",
                          fs, alpha, stName(r.status), r.angleDeg, expect, r.confidence, r.sumGainDb);
                if (fm == 1 && fs == 48000.0 && alpha < 0) {   // a Rotate angle is tied to the filter mode it was measured for
                    setP(*p, id::filterMode, 0.f);
                    settle(*p);
                    const bool refused = !p->applyPhaseResult();
                    setP(*p, id::filterMode, 1.f);
                    settle(*p);
                    check(refused && getP(*p, id::phaseAngle) == 0.f, "  FIR result is refused while the filter mode is IIR");
                }
                const bool applied = p->applyPhaseResult();
                const float written = getP(*p, id::phaseAngle);
                check(applied && std::abs(written - (float) juce::jlimit(-180.0, 180.0, r.angleDeg)) < 0.051f,
                      "  applyPhaseResult wrote phaseAngle = %+.1f", written);
                const int L = p->getLatencySamples();
                Sig s2 = kickBass(fs, 6.0, alpha);
                s2.pad((size_t) L);
                const auto o = run(*p, s2, 512);
                const size_t from = (size_t) (1.0 * fs) + (size_t) L, to = (size_t) (5.5 * fs) + (size_t) L;
                const double before = bandEnergy(s2.sL, &s2.L, 0, fs, from - (size_t) L, to - (size_t) L);
                const double after = bandEnergy(o.L, &s2.sL, L, fs, from, to);
                const double gain = 10 * std::log10(after / before);
                if (fm == 1) {
                    std::vector<float> aligned(o.L.begin() + L, o.L.end());
                    const auto rr = PhaseAnalyzer().analyze(s2.sL.data(), aligned.data(), (int) (5.5 * fs), fs, 20, 200);
                    check(gain > 0.5 && std::abs(gain - r.sumGainDb) < 1.0 && std::abs(rr.angleDeg) <= 1.0,
                          "  FIR: summed 20-200 Hz energy %+.2f dB (analyzer predicted %+.2f); residual angle after processing %+.1f",
                          gain, r.sumGainDb, rr.angleDeg);
                } else {
                    // the IIR network is not a pure rotation: the achievable gain can be much smaller than in FIR mode;
                    // what must hold is that the prediction is realised and the sum never gets worse
                    check(gain > -0.1 && std::abs(gain - r.sumGainDb) < 0.5,
                          "  IIR: summed 20-200 Hz energy %+.2f dB (predicted for the IIR network %+.2f)", gain, r.sumGainDb);
                }
            }
    {   // Phase Match path through the processor (FIR only), same material
        const double fs = 48000;
        auto p = make(fs, 512);
        setP(*p, id::phaseMode, 1.f);
        settle(*p);
        const Sig s = kickBass(fs, 4.5, -110.0);
        const auto r = analyzeThrough(*p, s, 512);
        const bool applied = p->applyPhaseResult();
        waitFor([&] { return p->analysisIdle(); }, 5000, p.get());
        const int L = p->getLatencySamples();
        Sig s2 = kickBass(fs, 6.0, -110.0);
        s2.pad((size_t) L);
        const auto o = run(*p, s2, 512);
        const size_t from = (size_t) (1.0 * fs) + (size_t) L, to = (size_t) (5.5 * fs) + (size_t) L;
        const double before = bandEnergy(s2.sL, &s2.L, 0, fs, from - (size_t) L, to - (size_t) L);
        const double after = bandEnergy(o.L, &s2.sL, L, fs, from, to);
        const auto d = p->getMatchDesign();
        check(r.status == PhaseResult::Status::Ok && applied && p->hasMatchCorrection() && after > before,
              "Phase Match: status %s conf %.2f aggressive %d, applied %d; summed 20-200 Hz energy %+.2f dB "
              "(kernel max corr %.0f deg, mag dev %.3f dB)",
              stName(r.status), r.confidence, (int) r.aggressive, (int) applied, 10 * std::log10(after / before), d.maxCorrectionDeg, d.magDevDb);
        // Phase On off → identity (kernel re-published by the analysis thread, 20 ms crossfade); on again → correction back
        setP(*p, id::phaseOn, 0.f);
        waitFor([&] { return p->analysisIdle(); }, 5000, p.get());
        const auto o2 = run(*p, s2, 512);
        const double eOff = std::max(maxDelayedErr(o2.L, s2.L, L, (size_t) (0.1 * fs)), maxDelayedErr(o2.R, s2.R, L, (size_t) (0.1 * fs)));
        setP(*p, id::phaseOn, 1.f);
        setP(*p, id::matchBlend, 0.5f);
        waitFor([&] { return p->analysisIdle(); }, 5000, p.get());
        const auto o3 = run(*p, s2, 512);
        const double half = 10 * std::log10(bandEnergy(o3.L, &s2.sL, L, fs, from, to) / before);
        check(eOff < 1e-5 && half > 0.3 && half < 10 * std::log10(after / before),
              "Phase On off -> max |out - in(t-L)| = %.2g; blend 50 %% -> summed energy %+.2f dB (between 0 and full)", eOff, half);
    }
}

// ═════════════════════════════ (3) sidechain-triggered node reduces only its band
static void testNodeBand() {
    std::printf("\n== (3) Sidechain-keyed node (60 Hz, range 12 dB) reduces only its band; main = 60 Hz + 1 kHz + 5 kHz\n");
    const double fs = 48000;
    for (int fm : {0, 1}) {
        auto p = make(fs, 512);
        setP(*p, id::filterMode, (float) fm);
        setP(*p, id::phaseOn, 0.f);
        setP(*p, id::node(0, "on"), 1.f);
        setP(*p, id::node(0, "freq"), 60.f);
        setP(*p, id::node(0, "range"), 12.f);
        setP(*p, id::node(0, "thr"), -40.f);
        setP(*p, id::node(0, "q"), 2.f);
        setP(*p, id::node(0, "att"), 1.f);
        setP(*p, id::node(0, "rel"), 50.f);
        settle(*p);
        const int L = p->getLatencySamples();
        const int n = (int) (4 * fs);
        Sig s;
        s.L.resize((size_t) n); s.sL.resize((size_t) n);
        for (int i = 0; i < n; ++i) {
            const double t = i / fs;
            s.L[(size_t) i] = (float) (0.1 * (std::sin(2 * kPi * 60 * t) + std::sin(2 * kPi * 1000 * t) + std::sin(2 * kPi * 5000 * t)));
            const bool on = std::fmod(t, 2.0) < 1.0;   // sidechain: 60 Hz at −6 dBFS for 1 s, silent for 1 s
            s.sL[(size_t) i] = on ? (float) (0.5 * std::sin(2 * kPi * 60 * t + 0.3)) : 0.f;
        }
        s.R = s.L; s.sR = s.sL;
        s.pad((size_t) L);
        const auto o = run(*p, s, 512);
        auto ratio = [&](double f, double t0) {   // output vs input amplitude (dB) over 0.5 s starting at t0
            const size_t st = (size_t) (t0 * fs);
            const auto a = fitSine(o.L, f, fs, st + (size_t) L, (size_t) (0.5 * fs));
            const auto b = fitSine(s.L, f, fs, st, (size_t) (0.5 * fs));
            return toDb(a.amp / b.amp);
        };
        const double on60 = ratio(60, 2.3), on1k = ratio(1000, 2.3), on5k = ratio(5000, 2.3);
        const double off60 = ratio(60, 3.4), off1k = ratio(1000, 3.4), off5k = ratio(5000, 3.4);
        check(on60 < -10.0 && std::abs(on1k) < 0.3 && std::abs(on5k) < 0.1 && std::abs(off60) < 0.2 && std::abs(off1k) < 0.1 &&
                  std::abs(off5k) < 0.1 && p->nodeReductionDb(0) < 1.0,
              "%s: sidechain on: 60 Hz %+.2f dB, 1 kHz %+.3f dB, 5 kHz %+.3f dB | off: %+.3f / %+.3f / %+.3f dB",
              fm ? "FIR" : "IIR", on60, on1k, on5k, off60, off1k, off5k);
    }
}

// ═════════════════════════════ (4) delta + wet = delayed dry
static void testDelta() {
    std::printf("\n== (4) Delta: wet + delta = dry (post phase) delayed; single-node audition = combined delta for one node\n");
    const double fs = 48000;
    for (int fm : {0, 1}) {
        auto build = [&](int deltaMode) {
            auto p = make(fs, 512);
            setP(*p, id::filterMode, (float) fm);
            setP(*p, id::node(0, "on"), 1.f);
            setP(*p, id::node(0, "freq"), 80.f);
            setP(*p, id::node(0, "range"), 9.f);
            setP(*p, id::node(0, "thr"), -36.f);
            setP(*p, id::node(0, "q"), 1.5f);
            setP(*p, id::node(0, "ch"), 1.f);   // Mid
            if (deltaMode == 1) setP(*p, id::delta, 1.f);
            if (deltaMode == 2) p->setDeltaAudition(0);
            settle(*p);
            return p;
        };
        Sig s = kickBass(fs, 3.0, 30.0, 0.8, 0.05);
        for (auto& v : s.R) v *= 0.7f;   // some Side content
        auto pw = build(0), pd = build(1), pa = build(2);
        const int L = pw->getLatencySamples();
        s.pad((size_t) L);
        const auto w = run(*pw, s, 512), d = run(*pd, s, 512), a = run(*pa, s, 512);
        double err = 0, diffA = 0, peakD = 0;
        for (size_t t = (size_t) (0.5 * fs) + (size_t) L; t < s.size(); ++t) {
            err = std::max({err, (double) std::abs(w.L[t] + d.L[t] - s.L[t - (size_t) L]), (double) std::abs(w.R[t] + d.R[t] - s.R[t - (size_t) L])});
            diffA = std::max({diffA, (double) std::abs(a.L[t] - d.L[t]), (double) std::abs(a.R[t] - d.R[t])});
            peakD = std::max(peakD, (double) std::abs(d.L[t]));
        }
        check(err < 1e-5 && peakD > 0.05, "%s: max |wet + delta - dry(t-L)| = %.2g (delta peak %.3f)", fm ? "FIR" : "IIR", err, peakD);
        check(diffA < (fm ? 0.02 * peakD : 1e-5), "%s: node-1 audition vs combined delta (one node): max diff %.2g (%.2f %% of delta peak)",
              fm ? "FIR" : "IIR", diffA, 100 * diffA / peakD);
    }
}

// ═════════════════════════════ (5) state round trip incl. A/B
static bool sameParams(PhaseForgeProcessor& a, PhaseForgeProcessor& b, juce::String* firstDiff = nullptr) {
    auto pa = a.getParameters(), pb = b.getParameters();
    if (pa.size() != pb.size()) return false;
    for (int i = 0; i < pa.size(); ++i)
        if (std::abs(pa[i]->getValue() - pb[i]->getValue()) > 1e-6f) {
            if (firstDiff) *firstDiff = dynamic_cast<juce::RangedAudioParameter*>(pa[i])->getParameterID();
            return false;
        }
    return true;
}
static std::vector<float> paramVector(PhaseForgeProcessor& p) {
    std::vector<float> v;
    for (auto* x : p.getParameters()) v.push_back(x->getValue());
    return v;
}
// exact except for 1-ulp float re-quantisation of skewed ranges (normalised → plain → normalised is not idempotent)
static bool sameVec(const std::vector<float>& a, const std::vector<float>& b) {
    if (a.size() != b.size()) return false;
    for (size_t i = 0; i < a.size(); ++i)
        if (std::abs(a[i] - b[i]) > 1e-6f) return false;
    return true;
}
static bool sameEstimate(const PhaseMatchEstimate& a, const PhaseMatchEstimate& b) {
    return a.status == b.status && a.hz == b.hz && a.correctionDeg == b.correctionDeg && a.phaseDeg == b.phaseDeg &&
           a.coherence == b.coherence && a.weight == b.weight && a.loHz == b.loHz && a.hiHz == b.hiHz && a.aggressive == b.aggressive;
}

static void testState() {
    std::printf("\n== (5) State save/restore round trip incl. A/B, Phase Match estimate, presets, garbage\n");
    const double fs = 48000;
    auto p1 = make(fs, 512);
    setP(*p1, id::phaseMode, 1.f);
    settle(*p1);
    const auto r = analyzeThrough(*p1, kickBass(fs, 4.0, -60.0), 512);
    const bool applied = p1->applyPhaseResult();
    check(applied && p1->hasMatchCorrection(), "Phase Match estimate obtained (%s) and applied", stName(r.status));
    // slot A: random values for every parameter except the phase mode (keeps Match so the estimate is used)
    std::mt19937 rng(5);
    std::uniform_real_distribution<float> u(0.f, 1.f);
    for (auto* prm : p1->getParameters()) {
        auto* rp = dynamic_cast<juce::RangedAudioParameter*>(prm);
        if (rp->getParameterID() == id::phaseMode || rp->getParameterID() == id::bypass) continue;
        prm->setValueNotifyingHost(u(rng));
    }
    setP(*p1, id::phaseOn, 1.f);
    settle(*p1);
    const auto valsA = paramVector(*p1);
    p1->setUiProperty("selectedNode", 3);
    p1->toggleAB();   // → B (first time: copy of A)
    const bool bIsCopy = sameVec(paramVector(*p1), valsA) && p1->isSlotBActive();
    setP(*p1, id::outGain, -7.5f);
    setP(*p1, id::node(4, "freq"), 3333.f);
    setP(*p1, id::filterMode, getP(*p1, id::filterMode) > 0.5f ? 0.f : 1.f);
    settle(*p1);
    const auto valsB = paramVector(*p1);
    juce::MemoryBlock blob;
    p1->getStateInformation(blob);

    auto p2 = make(fs, 512);
    p2->setStateInformation(blob.getData(), (int) blob.getSize());
    settle(*p2);
    juce::String diff;
    const bool same = sameParams(*p1, *p2, &diff);
    check(bIsCopy && same && p2->isSlotBActive() && p2->hasMatchCorrection() && sameEstimate(p1->getMatchEstimate(), p2->getMatchEstimate()) &&
              (int) p2->getUiProperty("selectedNode", -1) == 3 && p2->getLatencySamples() == p1->getLatencySamples(),
          "restore: %d params identical (|diff| <= 1e-6 normalised)%s, slot B active, match estimate identical (%zu points), UI state, latency %d",
          p1->getParameters().size(), same ? "" : (" (first diff " + diff + ")").toRawUTF8(), p2->getMatchEstimate().hz.size(),
          p2->getLatencySamples());
    p2->toggleAB();
    settle(*p2);
    check(sameVec(paramVector(*p2), valsA) && !p2->isSlotBActive(), "restored processor: toggle -> slot A values (|diff| <= 1e-6 normalised)");
    p2->toggleAB();
    settle(*p2);
    check(sameVec(paramVector(*p2), valsB), "toggle again -> slot B values");
    p2->copyActiveToInactive();   // B → A
    p2->toggleAB();
    settle(*p2);
    check(sameVec(paramVector(*p2), valsB) && !p2->isSlotBActive(), "copy active -> inactive, toggle: slot A now equals B, active slot untouched");

    // audio: restored processor renders identically
    p1->prepareToPlay(fs, 512);
    p2->setStateInformation(blob.getData(), (int) blob.getSize());
    settle(*p2);
    p2->prepareToPlay(fs, 512);
    waitFor([&] { return p1->analysisIdle() && p2->analysisIdle(); }, 5000);
    const Sig s = kickBass(fs, 2.0, 20.0);
    const auto o1 = run(*p1, s, 512), o2 = run(*p2, s, 512);
    double e = 0;
    for (size_t t = 0; t < o1.L.size(); ++t) e = std::max({e, (double) std::abs(o1.L[t] - o2.L[t]), (double) std::abs(o1.R[t] - o2.R[t])});
    check(e == 0.0, "original vs restored processor: max output difference %.3g over 2 s (bit-exact expected)", e);

    // presets
    const juce::File tmp = juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("pf_test_preset.pfpreset");
    const bool saved = p1->savePresetFile(tmp, "test");
    const auto before = paramVector(*p1);
    p1->setCurrentProgram(1);
    const bool progOk = std::abs(getP(*p1, id::node(0, "freq")) - 55.f) < 0.5f && getP(*p1, id::node(0, "on")) > 0.5f && !p1->hasMatchCorrection();
    const bool loaded = p1->loadPresetFile(tmp);
    check(saved && loaded && sameVec(paramVector(*p1), before) && p1->hasMatchCorrection() && progOk && p1->getNumPrograms() == 6,
          "preset file save/load round trip; factory program 1 '%s' sets node 1 = 55 Hz and clears the match estimate", p1->getProgramName(1).toRawUTF8());
    tmp.deleteFile();

    // garbage
    auto p3 = make(fs, 256);
    const auto def = paramVector(*p3);
    std::vector<char> junk(4000);
    for (auto& c : junk) c = (char) (rng() & 0xff);
    p3->setStateInformation(junk.data(), (int) junk.size());
    p3->setStateInformation(nullptr, 0);
    juce::MemoryBlock wrong;
    juce::AudioProcessor::copyXmlToBinary(juce::XmlElement("SOMETHING_ELSE"), wrong);
    p3->setStateInformation(wrong.getData(), (int) wrong.getSize());
    const bool untouched = paramVector(*p3) == def;
    juce::XmlElement bad("PHASEFORGE_STATE");
    auto* snap = bad.createNewChildElement("Snapshot");
    auto* ps = snap->createNewChildElement("Params");
    auto add = [&](const char* pid, const char* v) { auto* pe = ps->createNewChildElement("P"); pe->setAttribute("id", pid); pe->setAttribute("v", v); };
    add(id::inGain, "abc");
    add(id::outGain, "1e30");
    add(id::phaseAngle, "nan");
    add(id::filterMode, "7");
    add(id::mix, "-5");
    auto* m = snap->createNewChildElement("Match");
    m->setAttribute("status", 0);
    m->setAttribute("hz", "1 2 x");
    juce::MemoryBlock badBlob;
    juce::AudioProcessor::copyXmlToBinary(bad, badBlob);
    p3->setStateInformation(badBlob.getData(), (int) badBlob.getSize());
    settle(*p3);
    bool inRange = true;
    for (auto* x : p3->getParameters()) inRange = inRange && x->getValue() >= 0.f && x->getValue() <= 1.f && std::isfinite(x->getValue());
    check(untouched && inRange && !p3->hasMatchCorrection() && getP(*p3, id::outGain) == 24.f && getP(*p3, id::mix) == 0.f &&
              getP(*p3, id::filterMode) == 1.f,
          "garbage blobs ignored; bad values clamped/defaulted (outGain 1e30 -> %.0f, mix -5 -> %.1f, filterMode 7 -> %.0f, inGain 'abc' -> %.1f)",
          getP(*p3, id::outGain), getP(*p3, id::mix), getP(*p3, id::filterMode), getP(*p3, id::inGain));
    const auto o3 = run(*p3, kickBass(fs, 0.5, 0.0), 256);
    bool finite = true;
    for (float v : o3.L) finite = finite && std::isfinite(v);
    check(finite, "processor still renders finite audio after garbage state");
}

// ═════════════════════════════ (7) no sidechain bus
static void testNoSidechain() {
    std::printf("\n== (7) Missing sidechain: disabled bus (mono and stereo main), mono sidechain\n");
    const double fs = 48000;
    for (int mainCh : {1, 2})
        for (int scCh : {0, 1}) {
            for (int fm : {0, 1}) {
                auto p = make(fs, 333, mainCh, scCh);
                setP(*p, id::filterMode, (float) fm);
                setP(*p, id::phaseAngle, 45.f);
                setP(*p, id::node(0, "on"), 1.f);
                setP(*p, id::node(1, "on"), 1.f);
                setP(*p, id::node(1, "ch"), 2.f);   // Side node on a mono bus
                setP(*p, id::node(1, "freq"), 900.f);
                settle(*p);
                Sig s = kickBass(fs, 3.5, 40.0);
                p->requestPhaseAnalysis();
                p->requestResolveConflicts();
                const auto o = run(*p, s, 333);
                waitFor([&] { return p->getPhaseResult().state == AnalysisState::Done && p->getResolveResult().state == AnalysisState::Done; },
                        15000, p.get());
                bool finite = true;
                double peak = 0;
                for (size_t t = 0; t < o.L.size(); ++t) {
                    finite = finite && std::isfinite(o.L[t]) && std::isfinite(o.R[t]);
                    peak = std::max(peak, (double) std::abs(o.L[t]));
                }
                const auto pr = p->getPhaseResult();
                const auto rr = p->getResolveResult();
                const bool okPhase = scCh == 0 ? pr.status == PhaseResult::Status::NoSidechain : pr.status == PhaseResult::Status::Ok;
                const bool okRes = scCh == 0 ? rr.status == ResolveResult::Status::NoSidechain : rr.state == AnalysisState::Done;
                check(finite && peak > 0.1 && okPhase && okRes && p->sidechainBusActive() == (scCh > 0),
                      "main %d ch, sidechain %s, %s: finite output (peak %.2f), phase analysis -> %s, resolve -> status %d (%zu nodes), "
                      "sidechain reported %s",
                      mainCh, scCh ? "mono" : "disabled", fm ? "FIR" : "IIR", peak, stName(pr.status), (int) rr.status, rr.nodes.size(),
                      p->sidechainBusActive() ? "connected" : "not connected");
            }
        }
    {   // layouts the processor must refuse
        PhaseForgeProcessor p;
        auto l = p.getBusesLayout();
        l.inputBuses.getReference(0) = juce::AudioChannelSet::mono();
        l.outputBuses.getReference(0) = juce::AudioChannelSet::stereo();
        const bool a = p.checkBusesLayoutSupported(l);
        l.outputBuses.getReference(0) = juce::AudioChannelSet::mono();
        l.inputBuses.getReference(1) = juce::AudioChannelSet::create5point1();
        const bool b = p.checkBusesLayoutSupported(l);
        l.inputBuses.getReference(1) = juce::AudioChannelSet::disabled();
        const bool c = p.checkBusesLayoutSupported(l);
        check(!a && !b && c, "layouts: mono->stereo refused, 5.1 sidechain refused, mono + disabled sidechain accepted");
    }
}

// ═════════════════════════════ Resolve Conflicts → node parameters
static void testResolve() {
    std::printf("\n== Resolve Conflicts through the processor (kick on sidechain, bass on main)\n");
    const double fs = 48000;
    auto p = make(fs, 512);
    p->requestResolveConflicts();
    const Sig s = kickBass(fs, 4.0, 0.0, 1.0, 0.002);
    run(*p, s, 512, false);
    waitFor([&] { return p->getResolveResult().state == AnalysisState::Done && p->getResolveResult().applied; }, 15000, p.get());
    const auto r = p->getResolveResult();
    bool thrOk = !r.nodes.empty(), offOk = true;
    for (size_t i = 0; i < r.nodes.size(); ++i)
        thrOk = thrOk && std::abs(getP(*p, id::node((int) i, "thr")) - juce::jlimit(-80.f, 0.f, r.nodes[i].thresholdDb - 6.f)) < 0.051f &&
                getP(*p, id::node((int) i, "on")) > 0.5f;
    for (int i = (int) r.nodes.size(); i < id::kNodes; ++i) offOk = offOk && getP(*p, id::node(i, "on")) < 0.5f;
    check(r.status == ResolveResult::Status::Ok && r.applied && thrOk && offOk && r.nodes.size() <= 8,
          "%zu node(s) from %d frames; node 1: %.1f Hz, range %.1f dB, Q %.2f, ch %d, suggested thr %.1f -> written %.1f dB "
          "(band level - 12 dB); others off",
          r.nodes.size(), r.framesUsed, r.nodes.empty() ? 0.f : r.nodes[0].freqHz, r.nodes.empty() ? 0.f : r.nodes[0].rangeDb,
          r.nodes.empty() ? 0.f : r.nodes[0].q, r.nodes.empty() ? -1 : r.nodes[0].channel, r.nodes.empty() ? 0.f : r.nodes[0].thresholdDb,
          getP(*p, id::node(0, "thr")));
    // the written node actually reduces the main during the hits
    const int L = p->getLatencySamples();
    Sig s2 = kickBass(fs, 3.0, 0.0, 1.0, 0.002);
    s2.pad((size_t) L);
    run(*p, s2, 512);
    float maxRed = 0;
    {
        Sig s3 = kickBass(fs, 1.0, 0.0, 1.0, 0.002);
        juce::AudioBuffer<float> buf(4, 64);
        juce::MidiBuffer midi;
        for (size_t pos = 0; pos + 64 <= s3.size(); pos += 64) {
            for (int i = 0; i < 64; ++i) {
                buf.setSample(0, i, s3.L[pos + (size_t) i]); buf.setSample(1, i, s3.R[pos + (size_t) i]);
                buf.setSample(2, i, s3.sL[pos + (size_t) i]); buf.setSample(3, i, s3.sR[pos + (size_t) i]);
            }
            p->processBlock(buf, midi);
            maxRed = std::max(maxRed, p->nodeReductionDb(0));
        }
    }
    check(!r.nodes.empty() && maxRed > 0.6f * r.nodes[0].rangeDb, "node 1 reduction on the kick hits reaches %.1f dB of %.1f dB range",
          maxRed, r.nodes.empty() ? 0.f : r.nodes[0].rangeDb);
}

// ═════════════════════════════ UI contract (names the editor is written against)
static void testUiApi() {
    std::printf("\n== UI API: phaseResult / pending flags / spectrum / meters / latencyMs10 / isB\n");
    const double fs = 48000;
    auto p = make(fs, 512);
    const auto none = p->phaseResult();
    SpectrumFrame f0;
    const bool noSpec = !p->getSpectrum(f0);
    p->requestPhaseAnalysis();
    const bool pending = p->phaseAnalysisPending();
    run(*p, kickBass(fs, 4.0, -110.0), 512);
    waitFor([&] { return !p->phaseAnalysisPending(); }, 20000, p.get());
    const auto u = p->phaseResult();
    SpectrumFrame f;
    const bool spec = waitFor([&] { return p->getSpectrum(f); }, 2000);
    const auto mi = p->meter(0), ms = p->meter(2);
    p->requestResolve();
    const bool rp = p->resolvePending();
    check(none.status == -1 && none.serial == 0 && noSpec && pending && u.serial == 1 && u.status == (int) PhaseAnalysis::Status::Ok &&
              !u.isMatch && std::abs(u.angleDeg - 110.0) <= 1.0 && u.curve.size() == 361 && spec && f.hasSidechain && !f.hz.empty() &&
              mi.shortTerm > -60.f && ms.shortTerm > -60.f && rp && p->sidechainConnected() && p->latencyMs10() == 1183 && !p->isB(),
          "result serial %d status %d angle %+.1f curve %zu; spectrum %zu points (sidechain %d); meters in %.1f / sc %.1f LUFS-S; "
          "latency %.1f ms; resolve pending %d",
          u.serial, u.status, u.angleDeg, u.curve.size(), f.hz.size(), (int) f.hasSidechain, mi.shortTerm, ms.shortTerm,
          p->latencyMs10() / 10.0, (int) rp);
}

// ═════════════════════════════ (8) realtime vs offline render
static void testOffline() {
    std::printf("\n== (8) Realtime (paced, analysis thread running) vs offline render: identical output\n");
    const double fs = 48000;
    for (int fm : {1, 0}) {
        std::vector<Out> outs;
        for (int offline = 0; offline < 2; ++offline) {
            auto p = make(fs, 256);
            setP(*p, id::filterMode, (float) fm);
            setP(*p, id::phaseAngle, -35.f);
            setP(*p, id::node(0, "on"), 1.f);
            setP(*p, id::node(0, "freq"), 55.f);
            setP(*p, id::node(0, "thr"), -36.f);
            setP(*p, id::node(1, "on"), 1.f);
            setP(*p, id::node(1, "freq"), 2000.f);
            setP(*p, id::node(1, "ch"), 2.f);
            setP(*p, id::inGain, 2.f);
            settle(*p);
            p->setNonRealtime(offline == 1);
            p->requestResolveConflicts();   // analysis work running concurrently (auto-apply off: it must not change params)
            p->autoApplyResolve = false;
            Sig s = kickBass(fs, 3.0, 50.0, 0.8, 0.05);
            for (auto& v : s.R) v *= 0.6f;
            outs.push_back(run(*p, s, 256, offline == 0));
        }
        double e = 0;
        for (size_t t = 0; t < outs[0].L.size(); ++t)
            e = std::max({e, (double) std::abs(outs[0].L[t] - outs[1].L[t]), (double) std::abs(outs[0].R[t] - outs[1].R[t])});
        check(e == 0.0, "%s: max |realtime - offline| = %.3g over 3 s", fm ? "FIR" : "IIR", e);
    }
    {   // block-size independence (informative)
        std::vector<Out> outs;
        for (int b : {64, 512, 1000, 37}) {
            auto p = make(fs, b);
            setP(*p, id::phaseAngle, -35.f);
            setP(*p, id::node(0, "on"), 1.f);
            setP(*p, id::node(0, "freq"), 55.f);
            setP(*p, id::node(0, "thr"), -36.f);
            settle(*p);
            outs.push_back(run(*p, kickBass(fs, 2.0, 50.0), b));
        }
        for (size_t k = 1; k < outs.size(); ++k) {
            double e = 0;
            for (size_t t = 0; t < outs[0].L.size(); ++t) e = std::max(e, (double) std::abs(outs[0].L[t] - outs[k].L[t]));
            info("FIR, block 64 vs %s: max difference %.3g", k == 1 ? "512" : (k == 2 ? "1000" : "37"), e);
        }
    }
}

// ═════════════════════════════ CPU
// Info only (no pass/fail): 48 kHz, stereo main + stereo sidechain, 4 active nodes keyed by a kick, 20 s of audio.
// "static" = parameters fixed; "automated" = node 1 frequency/threshold and the phase angle change every block (host
// automation), which exercises the kernel/coefficient redesign paths. Times are per processBlock call.
static void testCpu() {
    const double fs = 48000;
    struct Case { int fm, pm; const char* name; };
    for (int block : {64, 128})
        for (int automate : {0, 1}) {
            std::printf("\n== CPU: 48 kHz, %d-sample blocks, 4 active nodes, %s parameters\n", block, automate ? "automated" : "static");
            for (const Case c : {Case{1, 0, "FIR  Rotate"}, Case{0, 0, "IIR  Rotate"}, Case{1, 1, "FIR  Match "}, Case{0, 1, "IIR  Match "}}) {
                auto p = make(fs, block);
                setP(*p, id::filterMode, (float) c.fm);
                setP(*p, id::phaseMode, (float) c.pm);
                setP(*p, id::phaseAngle, 30.f);
                const float fr[4] = {55, 110, 800, 3000};
                for (int i = 0; i < 4; ++i) {
                    setP(*p, id::node(i, "on"), 1.f);
                    setP(*p, id::node(i, "freq"), fr[i]);
                    setP(*p, id::node(i, "thr"), -40.f);
                    setP(*p, id::node(i, "ch"), (float) (i % 3));
                }
                settle(*p);
                Sig s = kickBass(fs, 20.0, 30.0, 0.8, 0.05);
                for (auto& v : s.R) v *= 0.7f;
                std::vector<double> ms;
                ms.reserve(s.size() / (size_t) block + 1);
                std::function<void(size_t)> hook;
                if (automate)
                    hook = [&](size_t pos) {
                        const double ph = (double) pos / fs;
                        setP(*p, id::node(0, "freq"), (float) (55.0 * std::pow(2.0, std::sin(ph * 1.3))));
                        setP(*p, id::node(0, "thr"), (float) (-40.0 + 10.0 * std::sin(ph * 0.7)));
                        setP(*p, id::phaseAngle, (float) (90.0 * std::sin(ph * 0.5)));
                    };
                const auto t0 = std::chrono::steady_clock::now();
                run(*p, s, block, false, false, &ms, hook);
                const double total = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
                double sum = 0;
                for (double v : ms) sum += v;
                const double mean = sum / (double) ms.size();
                std::sort(ms.begin(), ms.end());
                const double budget = block / fs * 1000.0;
                int over = 0;
                for (double v : ms) over += v > budget ? 1 : 0;
                std::printf("     %s: %.2f %% of one core (process calls %.2f %%), per call mean %.4f ms, p99 %.3f, p99.9 %.3f, max %.3f ms, "
                            "%d / %zu over the %.3f ms budget\n",
                            c.name, 100.0 * total / 20000.0, 100.0 * sum / 20000.0, mean, ms[(size_t) (ms.size() * 0.99)],
                            ms[(size_t) (ms.size() * 0.999)], ms.back(), over, ms.size(), budget);
            }
        }
}

int main(int argc, char** argv) {
    juce::ScopedJuceInitialiser_GUI init;
    std::printf("PHASEFORGE plugin tests\n");
    const juce::String only = argc > 1 ? argv[1] : "";
    auto want = [&](const char* k) { return only.isEmpty() || only == k; };
    if (want("identity")) testIdentity();
    if (want("latency")) testLatency();
    if (want("kickbass")) testKickBass();
    if (want("node")) testNodeBand();
    if (want("delta")) testDelta();
    if (want("state")) testState();
    if (want("nosc")) testNoSidechain();
    if (want("resolve")) testResolve();
    if (want("ui")) testUiApi();
    if (want("offline")) testOffline();
    if (want("cpu")) testCpu();
    std::printf("\n%d passed, %d failed\n", gPass, gFail);
    return gFail ? 1 : 0;
}
