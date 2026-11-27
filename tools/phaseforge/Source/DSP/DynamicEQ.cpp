// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — multiband sidechain dynamic EQ. Design notes: DynamicEQ.h.
#include "DynamicEQ.h"

#include <algorithm>
#include <cmath>

namespace pf {

namespace {
constexpr int kSub = 16;                                  // parameter / coefficient sub-block
constexpr double kC40 = 2.302585092994045684 / 40.0;      // ln(10)/40 : 10^(r/40) = exp(kC40·r)
constexpr double kDbPerLn = 4.342944819032518277;         // 10/ln(10)
// Kernel window: Tukey (cosine taper over the outer 20 % of each half). The zero-phase bell responses decay
// exponentially, so a window that stays flat over most of the support keeps narrow low bells deep; its higher
// sidelobes only matter where the response has not decayed yet (see the accuracy table in the report/tests).
constexpr double kTukeyAlpha = 0.2;

inline double toDb2(double e2) noexcept { return kDbPerLn * std::log(e2 + 1e-30); }  // 10·log10(e²)
inline double kneeRamp(double x, double w) noexcept {
    if (x <= -0.5 * w) return 0.0;
    if (x >= 0.5 * w) return x;
    const double u = x + 0.5 * w;
    return u * u / (2.0 * w);
}
inline double gate(double x) noexcept {     // 0 at thr − 2 dB … 1 at thr + 2 dB
    double u = (x + 2.0) * 0.25;
    u = u < 0.0 ? 0.0 : (u > 1.0 ? 1.0 : u);
    return u * u * (3.0 - 2.0 * u);
}
inline double clampd(double v, double lo, double hi) noexcept { return v < lo ? lo : (v > hi ? hi : v); }
inline float clampf(float v, float lo, float hi) noexcept {
    if (!(v == v)) return lo;  // NaN
    return v < lo ? lo : (v > hi ? hi : v);
}
} // namespace

// ═════════════════════════════════════════════════════════════ FftSoA
namespace detail {

void FftSoA::prepare(int n) {
    n_ = n;
    int lg = 0;
    while ((1 << lg) < n) ++lg;
    rev_.assign((size_t) n, 0);
    for (int i = 0; i < n; ++i) {
        int r = 0;
        for (int b = 0; b < lg; ++b) if (i & (1 << b)) r |= 1 << (lg - 1 - b);
        rev_[(size_t) i] = r;
    }
    passes_ = n >= 4 ? lg - 1 : lg;
    twr_.assign((size_t) std::max(1, n - 1), 1.0);
    twi_.assign((size_t) std::max(1, n - 1), 0.0);
    for (int h = 1; h < n; h <<= 1)
        for (int j = 0; j < h; ++j) {
            const double a = -kPi * j / h;
            twr_[(size_t) (h - 1 + j)] = std::cos(a);
            twi_[(size_t) (h - 1 + j)] = std::sin(a);
        }
}

void FftSoA::bitReverse(double* re, double* im) const noexcept {
    for (int i = 0; i < n_; ++i) {
        const int r = rev_[(size_t) i];
        if (i < r) { std::swap(re[i], re[r]); std::swap(im[i], im[r]); }
    }
}

// pass 0 (n ≥ 4): stages h = 1 and 2 fused into one multiplication-free radix-4 pass; pass k ≥ 1: radix-2 stage h = 2^(k+1)
void FftSoA::pass(double* re, double* im, int k) const noexcept {
    const int n = n_;
    if (n < 4) {   // tiny sizes: plain radix-2 stage h = 2^k
        const int h = 1 << k;
        for (int i = 0; i < n; i += 2 * h)
            for (int j = 0; j < h; ++j) {
                const double cr = twr_[(size_t) (h - 1 + j)], ci = twi_[(size_t) (h - 1 + j)];
                const double tr = re[i + j + h] * cr - im[i + j + h] * ci, ti = re[i + j + h] * ci + im[i + j + h] * cr;
                re[i + j + h] = re[i + j] - tr; im[i + j + h] = im[i + j] - ti;
                re[i + j] += tr; im[i + j] += ti;
            }
        return;
    }
    if (k == 0) {
        for (int i = 0; i < n; i += 4) {
            const double a0r = re[i] + re[i + 1], a0i = im[i] + im[i + 1];
            const double a1r = re[i] - re[i + 1], a1i = im[i] - im[i + 1];
            const double b0r = re[i + 2] + re[i + 3], b0i = im[i + 2] + im[i + 3];
            const double b1r = re[i + 2] - re[i + 3], b1i = im[i + 2] - im[i + 3];
            re[i] = a0r + b0r; im[i] = a0i + b0i;
            re[i + 2] = a0r - b0r; im[i + 2] = a0i - b0i;
            re[i + 1] = a1r + b1i; im[i + 1] = a1i - b1r;   // b1·(−j)
            re[i + 3] = a1r - b1i; im[i + 3] = a1i + b1r;
        }
        return;
    }
    const int h = 1 << (k + 1);
    const double* cr = twr_.data() + (h - 1);
    const double* ci = twi_.data() + (h - 1);
    for (int i = 0; i < n; i += 2 * h) {
        double* __restrict ar = re + i; double* __restrict ai = im + i;
        double* __restrict br = re + i + h; double* __restrict bi = im + i + h;
        for (int j = 0; j < h; ++j) {
            const double tr = br[j] * cr[j] - bi[j] * ci[j];
            const double ti = br[j] * ci[j] + bi[j] * cr[j];
            br[j] = ar[j] - tr; bi[j] = ai[j] - ti;
            ar[j] += tr; ai[j] += ti;
        }
    }
}

void FftSoA::forward(double* re, double* im) const noexcept {
    bitReverse(re, im);
    for (int k = 0; k < passes_; ++k) pass(re, im, k);
}

// ═════════════════════════════════════════════════════════════ LinPhaseFir
void LinPhaseFir::prepare(double fs) {
    int e = (int) std::lround(std::log2(fs / 48000.0));
    e = std::clamp(e, -2, 3);
    M = e >= 0 ? (8192 << e) : (8192 >> -e);
    B = M / 32;
    N = 2 * B;
    P = M / B;
    H = B + 1;
    fftN.prepare(N);
    fftM.prepare(M);
    win.assign((size_t) M, 0.0);
    const double half = M / 2;
    for (int n = 1; n < M; ++n) {
        const double r = std::fabs(n - half) / half;           // 0 at the centre … 1 at the ends
        const double x = (r - (1.0 - kTukeyAlpha)) / kTukeyAlpha;
        win[(size_t) n] = x <= 0.0 ? 1.0 : 0.5 * (1.0 + std::cos(kPi * std::min(1.0, x)));
    }
    tn.assign((size_t) M / 2, 0.0);
    for (int n = 0; n < M / 2; ++n) tn[(size_t) n] = std::tan(kPi * n / M);
    gM.assign((size_t) M / 2 + 1, 1.0);
    gS.assign((size_t) M / 2 + 1, 1.0);
    inM.assign((size_t) N, 0.0); inS.assign((size_t) N, 0.0);
    outM.assign((size_t) B, 0.0); outS.assign((size_t) B, 0.0);
    ringM.assign((size_t) 2 * M, 0.0); ringS.assign((size_t) 2 * M, 0.0);
    ringMask = 2 * M - 1;
    const size_t ph = (size_t) P * H;
    fdlMr.assign(ph, 0.0); fdlMi.assign(ph, 0.0); fdlSr.assign(ph, 0.0); fdlSi.assign(ph, 0.0);
    kMr.assign(2 * ph, 0.0); kMi.assign(2 * ph, 0.0); kSr.assign(2 * ph, 0.0); kSi.assign(2 * ph, 0.0);
    wr.assign((size_t) N, 0.0); wi.assign((size_t) N, 0.0);
    zr.assign((size_t) M, 0.0); zi.assign((size_t) M, 0.0);
    yPm.assign((size_t) B, 0.0); yPs.assign((size_t) B, 0.0); yCm.assign((size_t) B, 0.0); yCs.assign((size_t) B, 0.0);
    aMr.assign((size_t) H, 0.0); aMi.assign((size_t) H, 0.0); aSr.assign((size_t) H, 0.0); aSi.assign((size_t) H, 0.0);
    reset();
}

void LinPhaseFir::reset() {
    std::fill(inM.begin(), inM.end(), 0.0); std::fill(inS.begin(), inS.end(), 0.0);
    std::fill(outM.begin(), outM.end(), 0.0); std::fill(outS.begin(), outS.end(), 0.0);
    std::fill(ringM.begin(), ringM.end(), 0.0); std::fill(ringS.begin(), ringS.end(), 0.0);
    std::fill(fdlMr.begin(), fdlMr.end(), 0.0); std::fill(fdlMi.begin(), fdlMi.end(), 0.0);
    std::fill(fdlSr.begin(), fdlSr.end(), 0.0); std::fill(fdlSi.begin(), fdlSi.end(), 0.0);
    std::fill(gM.begin(), gM.end(), 1.0); std::fill(gS.begin(), gS.end(), 1.0);
    pos = 0; head = 0; cur = -1; cnt = 0; outIdentity = true;
}

void LinPhaseFir::designStep(int slot, int k) noexcept {
    const int h2 = M / 2;
    const int np = fftM.passes();
    if (k == 0) {
        // inverse FFT via the swap trick: inverse(re, im) = forward(im, re)
        for (int n = 0; n <= h2; ++n) { zr[(size_t) n] = gM[(size_t) n]; zi[(size_t) n] = gS[(size_t) n]; }
        for (int n = 1; n < h2; ++n) { zr[(size_t) (M - n)] = gM[(size_t) n]; zi[(size_t) (M - n)] = gS[(size_t) n]; }
        fftM.bitReverse(zi.data(), zr.data());
        return;
    }
    if (k <= np) { fftM.pass(zi.data(), zr.data(), k - 1); return; }
    // real-even spectra → real-even impulse responses (packed M + jS); window + cut partition p, FFT, split
    const int p = k - 1 - np;
    const double sc = 1.0 / M;
    const size_t base = (size_t) slot * (size_t) P * (size_t) H;
    for (int i = 0; i < B; ++i) {
        const int n = p * B + i;
        const int idx = (n - h2 + M) & (M - 1);  // time 0 of the zero-phase response sits at tap M/2
        const double w = win[(size_t) n] * sc;
        wr[(size_t) i] = zr[(size_t) idx] * w;
        wi[(size_t) i] = zi[(size_t) idx] * w;
    }
    for (int i = B; i < N; ++i) { wr[(size_t) i] = 0.0; wi[(size_t) i] = 0.0; }
    fftN.forward(wr.data(), wi.data());
    double* hmr = kMr.data() + base + (size_t) p * H; double* hmi = kMi.data() + base + (size_t) p * H;
    double* hsr = kSr.data() + base + (size_t) p * H; double* hsi = kSi.data() + base + (size_t) p * H;
    for (int kk = 0; kk <= B; ++kk) {
        const int k2 = (N - kk) & (N - 1);
        const double a = wr[(size_t) kk], b = wi[(size_t) kk], c = wr[(size_t) k2], d = wi[(size_t) k2];
        hmr[kk] = 0.5 * (a + c); hmi[kk] = 0.5 * (b - d);
        hsr[kk] = 0.5 * (b + d); hsi[kk] = -0.5 * (a - c);
    }
}

void LinPhaseFir::convolve(int slot, double* ym, double* ys) noexcept {
    if (slot < 0) {  // identity kernel = pure delay of B + M/2 samples, read bit-exactly from the ring
        const std::int64_t base = cnt - B - M / 2;
        for (int i = 0; i < B; ++i) {
            const std::int64_t idx = base + i;
            ym[i] = idx >= 0 ? ringM[(size_t) (idx & ringMask)] : 0.0;
            ys[i] = idx >= 0 ? ringS[(size_t) (idx & ringMask)] : 0.0;
        }
        return;
    }
    std::fill(aMr.begin(), aMr.end(), 0.0); std::fill(aMi.begin(), aMi.end(), 0.0);
    std::fill(aSr.begin(), aSr.end(), 0.0); std::fill(aSi.begin(), aSi.end(), 0.0);
    const size_t base = (size_t) slot * (size_t) P * (size_t) H;
    double* amr = aMr.data(); double* ami = aMi.data(); double* asr = aSr.data(); double* asi = aSi.data();
    for (int p = 0; p < P; ++p) {
        const size_t fo = (size_t) ((head - p + P) % P) * H;
        const double* xmr = fdlMr.data() + fo; const double* xmi = fdlMi.data() + fo;
        const double* xsr = fdlSr.data() + fo; const double* xsi = fdlSi.data() + fo;
        const size_t ko = base + (size_t) p * H;
        const double* hmr = kMr.data() + ko; const double* hmi = kMi.data() + ko;
        const double* hsr = kSr.data() + ko; const double* hsi = kSi.data() + ko;
        for (int k = 0; k < H; ++k) {
            amr[k] += xmr[k] * hmr[k] - xmi[k] * hmi[k];
            ami[k] += xmr[k] * hmi[k] + xmi[k] * hmr[k];
            asr[k] += xsr[k] * hsr[k] - xsi[k] * hsi[k];
            asi[k] += xsr[k] * hsi[k] + xsi[k] * hsr[k];
        }
    }
    // Y = Ym + j·Ys (both Hermitian) → one complex IFFT gives m (real part) and s (imaginary part)
    for (int k = 0; k <= B; ++k) { wr[(size_t) k] = amr[k] - asi[k]; wi[(size_t) k] = ami[k] + asr[k]; }
    for (int k = 1; k < B; ++k) { wr[(size_t) (N - k)] = amr[k] + asi[k]; wi[(size_t) (N - k)] = asr[k] - ami[k]; }
    fftN.inverse(wr.data(), wi.data());
    const double s = 1.0 / N;
    for (int i = 0; i < B; ++i) { ym[i] = wr[(size_t) (B + i)] * s; ys[i] = wi[(size_t) (B + i)] * s; }
}

void LinPhaseFir::runBlock(Update u, int slot) noexcept {
    // 1) newest input block (overlap-save, last 2B samples) → half spectra of M and S into the delay line
    for (int i = 0; i < N; ++i) { wr[(size_t) i] = inM[(size_t) i]; wi[(size_t) i] = inS[(size_t) i]; }
    fftN.forward(wr.data(), wi.data());
    {
        const size_t fo = (size_t) head * H;
        for (int k = 0; k <= B; ++k) {
            const int kk = (N - k) & (N - 1);
            const double a = wr[(size_t) k], b = wi[(size_t) k], c = wr[(size_t) kk], d = wi[(size_t) kk];
            fdlMr[fo + k] = 0.5 * (a + c); fdlMi[fo + k] = 0.5 * (b - d);
            fdlSr[fo + k] = 0.5 * (b + d); fdlSi[fo + k] = -0.5 * (a - c);
        }
    }
    // 2) kernel
    const int prev = cur;
    if (u == Update::New) {
        cur = slot;
    } else if (u == Update::Identity) {
        cur = -1;
    }
    outIdentity = prev < 0 && cur < 0;
    // 3) output: new kernel, linearly cross-faded from the previous one over this block
    convolve(cur, yCm.data(), yCs.data());
    if (prev != cur) {
        convolve(prev, yPm.data(), yPs.data());
        const double inv = 1.0 / B;
        for (int i = 0; i < B; ++i) {
            const double a = (i + 1) * inv;
            outM[(size_t) i] = yPm[(size_t) i] + a * (yCm[(size_t) i] - yPm[(size_t) i]);
            outS[(size_t) i] = yPs[(size_t) i] + a * (yCs[(size_t) i] - yPs[(size_t) i]);
        }
    } else {
        std::copy(yCm.begin(), yCm.end(), outM.begin());
        std::copy(yCs.begin(), yCs.end(), outS.begin());
    }
    for (int i = 0; i < B; ++i) { inM[(size_t) i] = inM[(size_t) (B + i)]; inS[(size_t) i] = inS[(size_t) (B + i)]; }
    head = (head + 1) % P;
}

} // namespace detail

// ═════════════════════════════════════════════════════════════ DynamicEQ
void DynamicEQ::prepare(double sampleRate, int maxBlock, FilterMode mode) {
    fs = sampleRate > 1000.0 ? sampleRate : 48000.0;
    maxBlk = std::max(1, maxBlock);
    fmode = mode;
    cMix = 1.0 - std::exp(-1.0 / (0.01 * fs));
    if (fmode == FilterMode::LinearPhaseFIR) {
        fir.prepare(fs);
        const size_t h = (size_t) fir.grid() / 2 + 1;
        g2a.assign(h, 1.0); g2b.assign(h, 1.0); g2c.assign(h, 1.0);
        soloM.assign(h, 0.0); soloS.assign(h, 0.0);
        std::int64_t sz = 1;
        while (sz < 2 * (std::int64_t) fir.latency() + 2) sz <<= 1;
        dryL.assign((size_t) sz, 0.f); dryR.assign((size_t) sz, 0.f);
        dryMask = sz - 1;
    } else {
        g2a.clear(); g2b.clear(); g2c.clear(); soloM.clear(); soloS.clear(); dryL.clear(); dryR.clear();
        dryMask = 0;
    }
    if (rmsMsSaved > 0.f) rmsCoef = onePoleCoef(rmsMsSaved, fs);
    prepared = true;
    reset();
}

void DynamicEQ::reset() {
    for (auto& nd : nodes) {
        nd.idle = true; nd.enT = nd.soloT = false;
        nd.en = nd.solo = nd.applied = 0.0;
        nd.bal.reset();
        nd.dSc.reset(); nd.dMain[0].reset(); nd.dMain[1].reset();
        nd.rmsSc = nd.rmsMain = 0.0;
        for (int c = 0; c < 2; ++c) { nd.bell[c].reset(); nd.soloF[c].reset(); nd.dBell[c].reset(); }
        nd.lastApplied = -1.0; nd.cAtt = nd.cRel = -1.f;
        nd.uiRed.store(0.f, std::memory_order_relaxed);
    }
    mixS = mixT;
    sw = 0.0;
    deltaCur = deltaT; deltaFade = 1.0; deltaHold = 0;
    scOnPrev = scOn;
    for (auto& h : hist) h.fill(0.0);
    histIdx = 0;
    keyLast.fill(KernelKey{});
    lastSw = lastMix = -1.0; lastDelta = deltaCur; lastIdentity = true;
    pending = detail::LinPhaseFir::Update::Same; pendingSlot = 0; jobActive = false; jobStepIdx = jobTotal = 0;
    if (fmode == FilterMode::LinearPhaseFIR && prepared) {
        fir.reset();
        std::fill(dryL.begin(), dryL.end(), 0.f); std::fill(dryR.begin(), dryR.end(), 0.f);
    }
    dryCnt = 0;
}

int DynamicEQ::latency() const { return fmode == FilterMode::LinearPhaseFIR && prepared ? fir.latency() : 0; }

void DynamicEQ::setNode(int i, const NodeParams& p) noexcept {
    if (i < 0 || i >= kMaxNodes) return;
    NodeParams q = p;
    q.freqHz = clampf(p.freqHz, 20.f, 20000.f);
    q.rangeDb = clampf(p.rangeDb, 0.f, 18.f);
    q.thresholdDb = clampf(p.thresholdDb, -150.f, 24.f);
    q.q = clampf(p.q, 0.1f, 20.f);
    q.attackMs = clampf(p.attackMs, 0.1f, 200.f);
    q.releaseMs = clampf(p.releaseMs, 5.f, 1000.f);
    nodes[(size_t) i].p = q;
}
void DynamicEQ::setMode(DynMode m) noexcept { dmode = m; }
void DynamicEQ::setSidechainEnabled(bool on) noexcept { scOn = on; }
void DynamicEQ::setMix(float m) noexcept { mixT = clampf(m, 0.f, 1.f); }
void DynamicEQ::setRelativeOffsetDb(float db) noexcept { relOff = clampf(db, -60.f, 60.f); }
void DynamicEQ::setDifferenceMarginDb(float db) noexcept { margin = clampf(db, -24.f, 24.f); }
void DynamicEQ::setDetectorRmsMs(float ms) noexcept {
    rmsMsSaved = clampf(ms, 0.f, 500.f);
    rmsCoef = rmsMsSaved > 0.f ? onePoleCoef(rmsMsSaved, fs) : 0.0;
}
void DynamicEQ::setDelta(int mode) noexcept { deltaT = (mode < -2 || mode >= kMaxNodes) ? -2 : mode; }

float DynamicEQ::reductionDb(int i) const noexcept {
    if (i < 0 || i >= kMaxNodes) return 0.f;
    return std::max(0.f, nodes[(size_t) i].uiRed.load(std::memory_order_relaxed));
}

float DynamicEQ::totalReductionDbAt(float hz) const noexcept {
    if (!prepared) return 0.f;
    const double f = clampd(hz, 1.0, 0.499 * fs);
    const double th = std::tan(kPi * f / fs);
    double sum = 0.0;
    for (const auto& nd : nodes) {
        const double r = nd.uiRed.load(std::memory_order_relaxed);
        if (r <= 0.0) continue;
        const double f0 = nd.uiF.load(std::memory_order_relaxed), q = nd.uiQ.load(std::memory_order_relaxed);
        const double o = th / std::tan(kPi * clampd(f0, 1.0, 0.45 * fs) / fs);
        const double E = std::exp(kC40 * r), A = 1.0 / E, kb = E / q, kA2 = kb * A * A;
        const double o2 = o * o, u = 1.0 - o2, u2 = u * u;
        sum += 10.0 * std::log10((u2 + kA2 * kA2 * o2) / (u2 + kb * kb * o2));
    }
    return (float) std::max(0.0, -sum);
}

void DynamicEQ::wake(NodeState& nd) noexcept {
    const auto& p = nd.p;
    nd.idle = false;
    nd.ch = p.channel;
    nd.lf = std::log(clampd(p.freqHz, 20.0, std::min(20000.0, 0.45 * fs)));
    nd.lq = std::log(clampd(p.q, 0.1, 20.0));
    nd.range = p.rangeDb;
    nd.f = std::exp(nd.lf); nd.q = std::exp(nd.lq); nd.invQ = 1.0 / nd.q;
    nd.gCur = nd.gPrev = svfG(nd.f, fs);
    nd.det.set(nd.gCur, nd.invQ);
    nd.en = nd.solo = nd.applied = 0.0;
    nd.bal.reset();
    nd.dSc.reset(); nd.dMain[0].reset(); nd.dMain[1].reset();
    nd.rmsSc = nd.rmsMain = 0.0;
    for (int c = 0; c < 2; ++c) { nd.bell[c].reset(); nd.soloF[c].reset(); nd.dBell[c].reset(); }
    nd.lastApplied = -1.0;
    nd.cAtt = nd.cRel = -1.f;
}

void DynamicEQ::beginSub(int len, int numCh) noexcept {
    nAct = nLR = nM = nS = 0;
    anySoloT = false;
    const double cp = 1.0 - std::exp(-(double) len / (0.02 * fs));
    const double fMax = std::min(20000.0, 0.45 * fs);
    for (int i = 0; i < kMaxNodes; ++i) {
        NodeState& nd = nodes[(size_t) i];
        const NodeParams& p = nd.p;
        const bool chanOk = !(numCh == 1 && p.channel == NodeChannel::Side);
        bool wantEn = p.active && !p.bypass && chanOk;
        bool wantSolo = p.active && p.solo && chanOk;
        if (nd.idle) {
            if (!wantEn && !wantSolo) continue;
            wake(nd);
        }
        if (p.channel != nd.ch) {   // channel switch: fade the node out, swap, fade back in
            if (nd.en == 0.0 && nd.solo == 0.0) {
                nd.ch = p.channel;
                for (int c = 0; c < 2; ++c) { nd.bell[c].reset(); nd.soloF[c].reset(); nd.dBell[c].reset(); }
                nd.dMain[0].reset(); nd.dMain[1].reset(); nd.rmsMain = 0.0;
                nd.lastApplied = -1.0;
            } else {
                wantEn = wantSolo = false;
            }
        }
        if (wantSolo && !nd.soloT && nd.solo == 0.0) { nd.soloF[0].reset(); nd.soloF[1].reset(); }
        nd.enT = wantEn;
        nd.soloT = wantSolo;
        anySoloT = anySoloT || wantSolo;
        // parameter smoothing (log f, log Q, linear range)
        const double tlf = std::log(clampd(p.freqHz, 20.0, fMax));
        const double tlq = std::log(clampd(p.q, 0.1, 20.0));
        nd.lf += (tlf - nd.lf) * cp; if (std::fabs(tlf - nd.lf) < 1e-7) nd.lf = tlf;
        const double lqOld = nd.lq;
        nd.lq += (tlq - nd.lq) * cp; if (std::fabs(tlq - nd.lq) < 1e-7) nd.lq = tlq;
        if (nd.lq != lqOld) nd.lastApplied = -1.0;
        nd.range += (p.rangeDb - nd.range) * cp; if (std::fabs(p.rangeDb - nd.range) < 1e-6) nd.range = p.rangeDb;
        nd.f = std::exp(nd.lf);
        nd.q = std::exp(nd.lq);
        nd.invQ = 1.0 / nd.q;
        nd.gPrev = nd.gCur;
        nd.gCur = svfG(nd.f, fs);
        nd.det.set(nd.gCur, nd.invQ);
        if (p.attackMs != nd.cAtt || p.releaseMs != nd.cRel) {
            nd.bal.setTimes(p.attackMs, p.releaseMs, fs);
            nd.cAtt = p.attackMs; nd.cRel = p.releaseMs;
        }
        if (numCh == 1) nd.eff = nd.ch == NodeChannel::Side ? 0 : 1;
        else nd.eff = nd.ch == NodeChannel::Stereo ? 1 : (nd.ch == NodeChannel::Mid ? 2 : 3);
        act[(size_t) nAct++] = i;
        if (nd.eff == 1) lrList[(size_t) nLR++] = i;
        else if (nd.eff == 2) mList[(size_t) nM++] = i;
        else if (nd.eff == 3) sList[(size_t) nS++] = i;
    }
}

void DynamicEQ::endSub() noexcept {
    const bool iir = fmode == FilterMode::ZeroLatencyIIR;
    for (int a = 0; a < nAct; ++a) {
        NodeState& nd = nodes[(size_t) act[(size_t) a]];
        if (!nd.enT && !nd.soloT && nd.en == 0.0 && nd.solo == 0.0) {
            nd.idle = true;
            nd.applied = 0.0;
            nd.bal.reset();
            if (iir) nd.uiRed.store(0.f, std::memory_order_relaxed);
        } else {
            for (int c = 0; c < 2; ++c) { nd.bell[c].flush(); nd.soloF[c].flush(); nd.dBell[c].flush(); }
            nd.dSc.flush(); nd.dMain[0].flush(); nd.dMain[1].flush();
            if (iir) nd.uiRed.store((float) nd.applied, std::memory_order_relaxed);
        }
        nd.uiF.store((float) nd.f, std::memory_order_relaxed);
        nd.uiQ.store((float) nd.q, std::memory_order_relaxed);
    }
}

namespace {
struct BellC { double a1, a2, a3, m1; };
} // namespace

void DynamicEQ::process(float* const* main, int numCh, const float* const* side, int sideCh, int n) noexcept {
    if (!prepared || main == nullptr || main[0] == nullptr || n <= 0) return;
    numCh = (numCh >= 2 && main[1] != nullptr) ? 2 : 1;
    const bool scAvail = scOn && side != nullptr && sideCh >= 1 && side[0] != nullptr;
    const bool scSt = scAvail && sideCh >= 2 && side[1] != nullptr;
    if (scOn != scOnPrev) {
        for (auto& nd : nodes) { nd.dSc.reset(); nd.rmsSc = 0.0; }
        scOnPrev = scOn;
    }
    const bool selfKey = !scOn;
    const bool diff = !selfKey && dmode == DynMode::Difference;
    const bool needMain = selfKey || diff;
    const bool firMode = fmode == FilterMode::LinearPhaseFIR;
    const double rampStep = 1.0 / (0.01 * fs);     // enable / solo: linear 10 ms
    const double fadeStep = 1.0 / (0.003 * fs);    // delta switch: 3 ms down / up
    const int lat = firMode ? fir.latency() : 0;
    float* Lp = main[0];
    float* Rp = numCh == 2 ? main[1] : nullptr;
    const double rc = rmsCoef;

    // bell coefficients for node nd at interpolated g (cached while gain and g are unchanged)
    auto bellCoefs = [](NodeState& nd, double g) noexcept {
        if (nd.applied != nd.lastApplied || g != nd.lastG) {
            const double E = std::exp(kC40 * nd.applied), invE = 1.0 / E;
            const double kb = nd.invQ * E;
            nd.ca1 = 1.0 / (1.0 + g * (g + kb));
            nd.ca2 = g * nd.ca1;
            nd.ca3 = g * nd.ca2;
            nd.cm1 = nd.invQ * (invE - E);          // k_b·(A² − 1); exactly 0 when applied == 0
            nd.lastApplied = nd.applied;
            nd.lastG = g;
        }
    };

    int done = 0;
    while (done < n) {
        const int len = std::min(kSub, n - done);
        beginSub(len, numCh);
        const double invLen = 1.0 / len;
        for (int s = 0; s < len; ++s) {
            const int t = done + s;
            const double L = Lp[t];
            const double R = Rp ? (double) Rp[t] : L;
            double sc = 0.0;
            if (scAvail) sc = scSt ? 0.5 * ((double) side[0][t] + (double) side[1][t]) : (double) side[0][t];
            const double Mi = 0.5 * (L + R), Si = 0.5 * (L - R);

            // ── detection, gain computer, ballistics
            for (int a = 0; a < nAct; ++a) {
                NodeState& nd = nodes[(size_t) act[(size_t) a]];
                if (nd.enT) { nd.en += rampStep; if (nd.en > 1.0) nd.en = 1.0; }
                else if (nd.en > 0.0) { nd.en -= rampStep; if (nd.en < 0.0) nd.en = 0.0; }
                if (nd.soloT) { nd.solo += rampStep; if (nd.solo > 1.0) nd.solo = 1.0; }
                else if (nd.solo > 0.0) { nd.solo -= rampStep; if (nd.solo < 0.0) nd.solo = 0.0; }
                double tgt = 0.0;
                if (nd.eff != 0 && (nd.en > 0.0 || nd.enT)) {
                    double scDb = -300.0, mainDb = -300.0;
                    if (!selfKey) {
                        double e2 = nd.dSc.process(sc, nd.det);
                        if (rc > 0.0) { nd.rmsSc = e2 + rc * (nd.rmsSc - e2); e2 = nd.rmsSc; }
                        scDb = toDb2(e2);
                    }
                    if (needMain) {
                        double e2;
                        if (nd.eff == 1)
                            e2 = numCh == 2 ? 0.5 * (nd.dMain[0].process(L, nd.det) + nd.dMain[1].process(R, nd.det))
                                            : nd.dMain[0].process(L, nd.det);
                        else
                            e2 = nd.dMain[0].process(nd.eff == 2 ? Mi : Si, nd.det);
                        if (rc > 0.0) { nd.rmsMain = e2 + rc * (nd.rmsMain - e2); e2 = nd.rmsMain; }
                        mainDb = toDb2(e2);
                    }
                    const double thr = nd.p.thresholdDb;
                    if (!diff) {
                        const double lev = selfKey ? mainDb : scDb;
                        tgt = kneeRamp(lev - thr, kKneeDb) * nd.range * (1.0 / kFullRangeDb);
                    } else {
                        const double ex = mainDb + relOff - (scDb - margin);
                        tgt = kneeRamp(ex, kDiffKneeDb) * gate(scDb - thr);
                    }
                    if (tgt > nd.range) tgt = nd.range;
                }
                double r = nd.bal.processRaw(tgt);
                if (r < 1e-6) { r = 0.0; nd.bal.setState(0.0); }
                nd.applied = nd.en * r;
            }
            // ── global smoothers
            if (anySoloT) { sw += rampStep; if (sw > 1.0) sw = 1.0; }
            else if (sw > 0.0) { sw -= rampStep; if (sw < 0.0) sw = 0.0; }
            if (mixS != mixT) { mixS += (mixT - mixS) * cMix; if (std::fabs(mixT - mixS) < 1e-7) mixS = mixT; }
            // ── delta mode switch: fade out → switch → (FIR: wait for the kernel) → fade in
            if (deltaT != deltaCur) {
                deltaFade -= fadeStep;
                if (deltaFade <= 0.0) {
                    deltaFade = 0.0;
                    deltaCur = deltaT;
                    if (deltaCur >= 0) { auto& d = nodes[(size_t) deltaCur]; d.dBell[0].reset(); d.dBell[1].reset(); }
                    deltaHold = firMode ? 3 * fir.block() : 0;   // FIR: decided next boundary, active one later, + fade
                }
            } else if (deltaHold > 0) {
                --deltaHold;
            } else if (deltaFade < 1.0) {
                deltaFade += fadeStep;
                if (deltaFade > 1.0) deltaFade = 1.0;
            }

            double oL, oR;
            if (!firMode) {
                const double frac = (s + 1) * invLen;
                double yL = L, yR = R;
                for (int a = 0; a < nLR; ++a) {
                    NodeState& nd = nodes[(size_t) lrList[(size_t) a]];
                    bellCoefs(nd, nd.gPrev + (nd.gCur - nd.gPrev) * frac);
                    yL += nd.cm1 * nd.bell[0].tickBp(yL, nd.ca1, nd.ca2, nd.ca3);
                    if (numCh == 2) yR += nd.cm1 * nd.bell[1].tickBp(yR, nd.ca1, nd.ca2, nd.ca3);
                }
                if (numCh == 2 && (nM > 0 || nS > 0)) {
                    double M = 0.5 * (yL + yR), S = 0.5 * (yL - yR);
                    for (int a = 0; a < nM; ++a) {
                        NodeState& nd = nodes[(size_t) mList[(size_t) a]];
                        bellCoefs(nd, nd.gPrev + (nd.gCur - nd.gPrev) * frac);
                        M += nd.cm1 * nd.bell[0].tickBp(M, nd.ca1, nd.ca2, nd.ca3);
                    }
                    for (int a = 0; a < nS; ++a) {
                        NodeState& nd = nodes[(size_t) sList[(size_t) a]];
                        bellCoefs(nd, nd.gPrev + (nd.gCur - nd.gPrev) * frac);
                        S += nd.cm1 * nd.bell[0].tickBp(S, nd.ca1, nd.ca2, nd.ca3);
                    }
                    yL = M + S;
                    yR = M - S;
                }
                if (mixS != 1.0) { yL = mixS * yL + (1.0 - mixS) * L; yR = mixS * yR + (1.0 - mixS) * R; }
                if (sw > 0.0 || anySoloT) {
                    double sL = 0, sR = 0, sM = 0, sS = 0;
                    for (int a = 0; a < nAct; ++a) {
                        NodeState& nd = nodes[(size_t) act[(size_t) a]];
                        if (nd.eff == 0 || (nd.solo == 0.0 && !nd.soloT)) continue;
                        const SvfCoefs& c = nd.det;
                        const double w = nd.solo * c.k;
                        if (nd.eff == 1) {
                            sL += w * nd.soloF[0].tickBp(L, c.a1, c.a2, c.a3);
                            if (numCh == 2) sR += w * nd.soloF[1].tickBp(R, c.a1, c.a2, c.a3);
                        } else if (nd.eff == 2) {
                            sM += w * nd.soloF[0].tickBp(Mi, c.a1, c.a2, c.a3);
                        } else {
                            sS += w * nd.soloF[0].tickBp(Si, c.a1, c.a2, c.a3);
                        }
                    }
                    yL = (1.0 - sw) * yL + sL + sM + sS;
                    yR = (1.0 - sw) * yR + sR + sM - sS;
                }
                if (deltaCur == -1) {
                    oL = L - yL; oR = R - yR;
                } else if (deltaCur >= 0) {
                    oL = oR = 0.0;
                    NodeState& nd = nodes[(size_t) deltaCur];
                    if (!nd.idle && nd.eff != 0) {
                        bellCoefs(nd, nd.gPrev + (nd.gCur - nd.gPrev) * frac);
                        const double g = -mixS * nd.cm1;    // removed part = mix·(x − bell(x)) = −mix·m1·BP_b(x)
                        if (nd.eff == 1) {
                            oL = g * nd.dBell[0].tickBp(L, nd.ca1, nd.ca2, nd.ca3);
                            oR = numCh == 2 ? g * nd.dBell[1].tickBp(R, nd.ca1, nd.ca2, nd.ca3) : oL;
                        } else if (nd.eff == 2) {
                            oL = oR = g * nd.dBell[0].tickBp(Mi, nd.ca1, nd.ca2, nd.ca3);
                        } else {
                            oL = g * nd.dBell[0].tickBp(Si, nd.ca1, nd.ca2, nd.ca3);
                            oR = -oL;
                        }
                    }
                } else {
                    oL = yL; oR = yR;
                }
            } else {
                double om, os;
                const bool due = fir.push(numCh == 2 ? Mi : L, numCh == 2 ? Si : 0.0, om, os);
                dryL[(size_t) (dryCnt & dryMask)] = (float) L;
                dryR[(size_t) (dryCnt & dryMask)] = (float) R;
                const std::int64_t di = dryCnt - lat;
                ++dryCnt;
                const double dL = di >= 0 ? (double) dryL[(size_t) (di & dryMask)] : 0.0;
                const double dR = di >= 0 ? (double) dryR[(size_t) (di & dryMask)] : 0.0;
                double yL, yR;
                if (fir.outputIsIdentity()) { yL = dL; yR = dR; }   // bit-exact delayed dry (M/S round trip skipped)
                else if (numCh == 2) { yL = om + os; yR = om - os; }
                else { yL = yR = om; }
                if (deltaCur != -2) {   // −1: kernel = full processing; i ≥ 0: kernel = node i alone
                    oL = dL - yL; oR = dR - yR;
                } else {
                    oL = yL; oR = yR;
                }
                if (due) {
                    firBlock(numCh);
                } else if (jobActive) {
                    // spread the design job evenly over the block (finished before the next boundary)
                    const int target = (int) (((std::int64_t) fir.posInBlock() * jobTotal) / fir.block()) + 1;
                    while (jobActive && jobStepIdx < target) jobStep();
                }
            }
            if (deltaFade != 1.0) { oL *= deltaFade; oR *= deltaFade; }
            Lp[t] = (float) oL;
            if (Rp) Rp[t] = (float) oR;
        }
        endSub();
        done += len;
    }
}

// FIR block boundary j: (1) record the applied reductions, (2) switch to the kernel designed during block j−1,
// (3) decide the kernel for boundary j+1 from the reductions of input time t_(j+1) − M/2 (already in the history,
// 15 blocks old) and start designing it; the job is executed in small steps while block j is being filled
// (jobStep from process()), so no single callback carries a whole kernel design.
void DynamicEQ::firBlock(int numCh) noexcept {
    const int D = fir.delayBlocks();
    for (int i = 0; i < kMaxNodes; ++i) {
        const NodeState& nd = nodes[(size_t) i];
        hist[(size_t) i][(size_t) (histIdx & 63)] = nd.idle ? 0.0 : nd.applied;
    }
    const int j = histIdx++;
    jobFinish();                                     // normally already done
    fir.runBlock(pending, pendingSlot);
    {
        const int rdNow = (j - D) & 63;
        for (int i = 0; i < kMaxNodes; ++i)
            nodes[(size_t) i].uiRed.store((float) hist[(size_t) i][(size_t) rdNow], std::memory_order_relaxed);
    }
    // ── decide the kernel for boundary j+1
    const int rd = (j + 1 - D) & 63;
    bool allR0 = true, anyS = false;
    for (int i = 0; i < kMaxNodes; ++i) {
        NodeState& nd = nodes[(size_t) i];
        KernelKey k;
        k.r = hist[(size_t) i][(size_t) rd];
        k.s = nd.idle ? 0.0 : nd.solo;
        k.f = nd.f;
        k.q = nd.q;
        k.grp = (k.r > 0.0 || k.s > 0.0) ? nd.eff : -1;
        if (k.grp <= 0) { k.grp = -1; k.r = 0.0; k.s = 0.0; }
        keyNow[(size_t) i] = k;
        if (k.r > 0.0) allR0 = false;
        if (k.s > 0.0) anyS = true;
    }
    bool identity;
    if (deltaCur >= 0) {
        const KernelKey& k = keyNow[(size_t) deltaCur];
        identity = k.r == 0.0 || mixS == 0.0;
    } else {
        identity = sw == 0.0 && !anyS && (mixS == 0.0 || allR0);
    }
    using U = detail::LinPhaseFir::Update;
    if (identity) {
        pending = lastIdentity ? U::Same : U::Identity;
    } else {
        bool changed = lastIdentity || lastDelta != deltaCur || std::fabs(sw - lastSw) > 1e-6
                       || std::fabs(mixS - lastMix) > 1e-6;
        for (int i = 0; i < kMaxNodes && !changed; ++i) {
            const KernelKey& a = keyNow[(size_t) i];
            const KernelKey& b = keyLast[(size_t) i];
            if (a.grp != b.grp || std::fabs(a.r - b.r) > 0.002 || std::fabs(a.s - b.s) > 1e-6) changed = true;
            else if (a.grp > 0 && (std::fabs(a.f - b.f) > 1e-6 * b.f || std::fabs(a.q - b.q) > 1e-6 * b.q)) changed = true;
        }
        pending = changed ? U::New : U::Same;
        if (changed) {
            keyLast = keyNow;
            lastSw = sw;
            lastMix = mixS;
            // set up the job
            jobKey = keyNow;
            jobNumCh = numCh;
            jobDelta = deltaCur;
            jobSw = deltaCur >= 0 ? 0.0 : sw;
            jobMix = mixS;
            jobNDyn = jobNSolo = 0;
            for (int i = 0; i < kMaxNodes; ++i) {
                const KernelKey& k = jobKey[(size_t) i];
                if (k.grp <= 0) continue;
                if (k.r > 0.0 && jobMix > 0.0 && jobSw < 1.0 && (jobDelta < 0 || i == jobDelta)) jobDyn[(size_t) jobNDyn++] = i;
                if (k.s > 0.0 && jobDelta < 0) jobSolo[(size_t) jobNSolo++] = i;
            }
            jobAnySolo = jobNSolo > 0;
            pendingSlot = fir.freeSlot();
            jobStepIdx = 0;
            jobTotal = 1 + jobNDyn + jobNSolo + 1 + fir.designSteps();
            jobActive = true;
        }
    }
    lastIdentity = identity;
    lastDelta = deltaCur;
}

void DynamicEQ::jobStep() noexcept {
    if (!jobActive) return;
    const int s = jobStepIdx++;
    const int h2 = fir.grid() / 2;
    const double* tn = fir.binTan();
    if (s == 0) {
        std::fill(g2a.begin(), g2a.end(), 1.0);
        std::fill(g2b.begin(), g2b.end(), 1.0);
        std::fill(g2c.begin(), g2c.end(), 1.0);
        if (jobAnySolo) { std::fill(soloM.begin(), soloM.end(), 0.0); std::fill(soloS.begin(), soloS.end(), 0.0); }
    } else if (s < 1 + jobNDyn) {
        // |Bell|² of the SVF bell at the bilinear-warped frequency Ω = tan(πf/fs)/tan(πf0/fs)
        const KernelKey& k = jobKey[(size_t) jobDyn[(size_t) (s - 1)]];
        const double E = std::exp(kC40 * k.r), A = 1.0 / E;
        const double kb = E / k.q, kA2 = kb * A * A;
        const double kb2 = kb * kb, kA22 = kA2 * kA2;
        const double invT0 = 1.0 / svfG(k.f, fs);
        double* arr = k.grp == 1 ? g2a.data() : (k.grp == 2 ? g2b.data() : g2c.data());
        for (int b = 0; b < h2; ++b) {
            const double o = tn[b] * invT0, o2 = o * o, u = 1.0 - o2, u2 = u * u;
            arr[b] *= (u2 + kA22 * o2) / (u2 + kb2 * o2);
        }
    } else if (s < 1 + jobNDyn + jobNSolo) {
        // unity-peak band-pass magnitude for solo audition
        const KernelKey& k = jobKey[(size_t) jobSolo[(size_t) (s - 1 - jobNDyn)]];
        const double kk = 1.0 / k.q, kk2 = kk * kk;
        const double invT0 = 1.0 / svfG(k.f, fs);
        const bool toM = k.grp == 1 || k.grp == 2, toS = k.grp == 1 || k.grp == 3;
        for (int b = 0; b < h2; ++b) {
            const double o = tn[b] * invT0, o2 = o * o, u = 1.0 - o2;
            const double v = k.s * kk * o / std::sqrt(u * u + kk2 * o2);
            if (toM) soloM[(size_t) b] += v;
            if (toS) soloS[(size_t) b] += v;
        }
    } else if (s == 1 + jobNDyn + jobNSolo) {
        double* gm = fir.gainM();
        double* gs = fir.gainS();
        const double dryW = (1.0 - jobSw) * (1.0 - jobMix), wetW = (1.0 - jobSw) * jobMix;
        for (int b = 0; b <= h2; ++b) {
            const double dm = std::sqrt(g2a[(size_t) b] * g2b[(size_t) b]);
            const double vm = wetW * dm + dryW + (jobAnySolo ? soloM[(size_t) b] : 0.0);
            gm[b] = vm;
            if (jobNumCh == 2) {
                const double ds = std::sqrt(g2a[(size_t) b] * g2c[(size_t) b]);
                gs[b] = wetW * ds + dryW + (jobAnySolo ? soloS[(size_t) b] : 0.0);
            } else {
                gs[b] = vm;
            }
        }
    } else {
        fir.designStep(pendingSlot, s - (2 + jobNDyn + jobNSolo));
    }
    if (jobStepIdx >= jobTotal) jobActive = false;
}

} // namespace pf
