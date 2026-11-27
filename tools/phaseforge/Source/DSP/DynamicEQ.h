// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — multiband sidechain dynamic EQ (JUCE-free, real-time safe after prepare()).
//
// ─ Signal path per node i ───────────────────────────────────────────────────────────────────────────────────
//   detector:  BandEnvelope(f_i, Q_i) on  sidechain Mid  (sidechain enabled)  or  the node's own main channel
//              (sidechain disabled = self-keyed)  → level in dB (sine-peak calibrated, optional RMS averaging)
//   computer:  Sidechain mode   r* = min(range, kneeRamp(det − thr, 4 dB) · range / 10 dB)
//                               → soft knee ±2 dB around the threshold, full range reached 10 dB above it.
//              Difference mode  excess = (main + relOffset) − (sc − margin);  r* = min(range, kneeRamp(excess, 2 dB))
//                               × gate,  gate = smoothstep over sc ∈ [thr − 2, thr + 2] dB.
//                               (main ≤ sc − margin → no reduction; above → exactly the excess is removed.)
//              With the sidechain disabled the mode is ignored and the node is a classic self-keyed dynamic EQ.
//   ballistics: EnvelopeFollower(Peak) on r* in dB: attack/release are the 63 % time constants of the reduction.
//   gain:      applied_i = enable_i · r_i (enable fades 0↔1 in ~5 ms on bypass / delete / channel change);
//              freq / Q smoothed in the log domain (τ = 20 ms), range linearly (τ = 20 ms).
//
// ─ Filter modes ─────────────────────────────────────────────────────────────────────────────────────────────
//   ZeroLatencyIIR: each node is a TPT-SVF bell  y = x + k_b(A²−1)·BP(x),  A = 10^(−r/40), k_b = 1/(Q·A)
//                   (Simper) with per-sample gain/coefficient update and per-sample interpolated g → no zipper,
//                   stable under modulation, latency 0. Stereo nodes run on L/R, then (only if a Mid/Side node is
//                   live) M/S encode → Mid / Side nodes → decode. r = 0 ⇒ the bell is the identity bit-exactly.
//   LinearPhaseFIR: the summed (product of all bells, per M/S channel) zero-phase magnitude |G(f)| is rebuilt
//                   at every FIR block from the bells' exact digital magnitude responses (same curves as the IIR
//                   bells), sampled on an M-point grid, IFFT → circularly centred → Tukey(α = 0.2) windowed
//                   (M−1 taps, symmetric = linear phase), and applied with a uniformly partitioned FFT
//                   convolution (block B = M/32, 32 partitions). Consecutive kernels are cross-faded linearly
//                   over one block (both kernels share the frequency-domain delay line), so gain trajectories are
//                   piecewise linear with knots every B samples.
//                   Grid M = 8192 · 2^round(log2(fs/48 kHz)):  44.1/48 k → 8192, 88.2/96 k → 16384,
//                   176.4/192 k → 32768. Latency = B + M/2 samples (4352 @ 48 k = 90.7 ms, 98.7 ms @ 44.1 k),
//                   fixed, independent of node settings. Update rate fs/B (187.5 Hz @ 48 k, 5.33 ms; same in ms
//                   at every rate). Reductions are delayed by exactly M/2 samples (16 blocks) before they enter
//                   the kernel, so that the gain stays aligned with the latency-compensated audio. Mix, solo and
//                   delta are part of the kernel / the latency-aligned dry path, so all outputs share one latency.
//
// ─ Solo / mix / delta ───────────────────────────────────────────────────────────────────────────────────────
//   any node solo → output = Σ_solo unity-peak band-pass(f_i, Q_i) of the node's channel (linear-phase |BP| in
//   FIR mode), cross-faded (5 ms). out = (1 − soloW)·(mix·wet + (1 − mix)·dry) + Σ soloW_i·BP_i(dry).
//   Delta: −2 off, −1 → dry − out (out as above, latency-aligned), i ≥ 0 → mix·(dry − Bell_i(dry)) (node i alone,
//   on its own channel). Switching the delta mode fades the output down/up in ~3 ms (FIR: + one block).
#pragma once

#include "Common.h"
#include "EnvelopeFollower.h"
#include "FilterMode.h"
#include "MidSide.h"

#include <array>
#include <atomic>
#include <cstdint>
#include <vector>

namespace pf {

enum class NodeChannel { Stereo = 0, Mid = 1, Side = 2 };
enum class DynMode { Sidechain = 0, Difference = 1 };
constexpr int kMaxNodes = 16;

struct NodeParams {
    bool active = false, bypass = false, solo = false;
    float freqHz = 100.f;        // 20..20000
    float rangeDb = 6.f;         // maximum reduction (positive number, 0..18)
    float thresholdDb = -30.f;   // detector threshold (dBFS of the band-limited detector signal)
    float q = 1.f;               // 0.1..20
    float attackMs = 5.f;        // 0.1..200
    float releaseMs = 80.f;      // 5..1000
    NodeChannel channel = NodeChannel::Stereo;
};

namespace detail {

// split-array radix-2 complex FFT (in place). forward: e^{−j}, inverse: e^{+j}, unscaled.
class FftSoA {
public:
    void prepare(int n);
    int size() const noexcept { return n_; }
    void forward(double* re, double* im) const noexcept;
    void inverse(double* re, double* im) const noexcept { forward(im, re); }
    // step-wise transform (for spreading work over time): bitReverse, then pass(0 … passes()−1)
    int passes() const noexcept { return passes_; }
    void bitReverse(double* re, double* im) const noexcept;
    void pass(double* re, double* im, int k) const noexcept;
private:
    int n_ = 0, passes_ = 0;
    std::vector<int> rev_;
    std::vector<double> twr_, twi_;  // per-stage contiguous twiddles, stage with half h at offset h−1
};

// Two-channel (M,S packed as one complex signal) uniformly partitioned linear-phase FIR with kernel cross-fade.
class LinPhaseFir {
public:
    enum class Update { Same, Identity, New };
    void prepare(double fs);
    void reset();
    int latency() const noexcept { return B + M / 2; }
    int block() const noexcept { return B; }
    int grid() const noexcept { return M; }
    int delayBlocks() const noexcept { return (M / 2) / B; }
    double* gainM() noexcept { return gM.data(); }   // M/2+1 bins, zero-phase target magnitude (input to New)
    double* gainS() noexcept { return gS.data(); }
    const double* binTan() const noexcept { return tn.data(); }  // tan(π·n/M), n < M/2
    // one sample per channel in, the (latency-delayed) output out; returns true when a block is due
    inline bool push(double m, double s, double& om, double& os) noexcept {
        om = outM[(size_t) pos];
        os = outS[(size_t) pos];
        inM[(size_t) (B + pos)] = m;
        inS[(size_t) (B + pos)] = s;
        ringM[(size_t) (cnt & ringMask)] = m;
        ringS[(size_t) (cnt & ringMask)] = s;
        ++cnt;
        if (++pos == B) { pos = 0; return true; }
        return false;
    }
    // Kernel design, split into designSteps() independent steps so it can be spread over a block:
    // step 0 loads gM/gS (packed) + bit reversal, steps 1…passes the M-point inverse FFT, then one step per partition.
    int designSteps() const noexcept { return 1 + fftM.passes() + P; }
    void designStep(int slot, int k) noexcept;
    int freeSlot() const noexcept { return cur == 0 ? 1 : 0; }
    int posInBlock() const noexcept { return pos; }
    // true while the samples being output come from the identity kernel only (pure delay, no cross-fade)
    bool outputIsIdentity() const noexcept { return outIdentity; }
    // Update::New switches to `slot` (fully designed beforehand)
    void runBlock(Update u, int slot) noexcept;
private:
    void convolve(int slot, double* ym, double* ys) noexcept;
    int M = 8192, B = 256, N = 512, P = 32, H = 257, pos = 0, head = 0, cur = -1;
    bool outIdentity = true;
    std::int64_t cnt = 0, ringMask = 0;
    FftSoA fftN, fftM;
    std::vector<double> win, tn, gM, gS;
    std::vector<double> inM, inS, outM, outS, ringM, ringS;
    std::vector<double> fdlMr, fdlMi, fdlSr, fdlSi;       // P × H
    std::vector<double> kMr, kMi, kSr, kSi;               // 2 slots × P × H
    std::vector<double> wr, wi, zr, zi, yPm, yPs, yCm, yCs, aMr, aMi, aSr, aSi;
};

} // namespace detail

class DynamicEQ {
public:
    void prepare(double fs, int maxBlock, FilterMode mode);  // allocates (FIR kernels etc.)
    void reset();
    int latency() const;                    // IIR: 0; FIR: latency of the linear-phase band filters (fixed)
    void setNode(int i, const NodeParams& p) noexcept;   // audio thread, called each block; smooth (no zipper)
    void setMode(DynMode m) noexcept;
    void setSidechainEnabled(bool on) noexcept;  // off → detectors listen to the main input itself (self-keyed)
    void setMix(float mix01) noexcept;           // global wet/dry of the node processing only (latency-aligned)
    void setRelativeOffsetDb(float db) noexcept; // Gain Stage Fix: (main fader − sidechain fader); Difference mode
    // main: in place, numCh 1 or 2 (L,R). side: sidechain (may be nullptr / sideCh 0). n any size.
    void process(float* const* main, int numCh, const float* const* side, int sideCh, int n) noexcept;
    float reductionDb(int i) const noexcept;     // current reduction for UI (relaxed atomic), ≥ 0
    float totalReductionDbAt(float hz) const noexcept; // UI overlay: −Σ 20·log10|Bell_i(hz)| (exact per node)

    // ── additions
    // Delta monitoring: −2 off, −1 combined (dry − out), i ≥ 0 node i alone (mix·(dry − node_i(dry))).
    void setDelta(int mode) noexcept;
    void setDifferenceMarginDb(float db) noexcept;   // Difference-mode target "main ≤ sc − margin", default 3 dB
    void setDetectorRmsMs(float ms) noexcept;        // 0 (default) = instantaneous quadrature peak envelope
    FilterMode filterMode() const noexcept { return fmode; }
    int firBlockSize() const noexcept { return fmode == FilterMode::LinearPhaseFIR ? fir.block() : 0; }
    double sampleRate() const noexcept { return fs; }

    static constexpr double kKneeDb = 4.0;        // Sidechain-mode soft knee width
    static constexpr double kFullRangeDb = 10.0;  // Sidechain mode: full range reached this far above threshold
    static constexpr double kDiffKneeDb = 2.0;    // Difference-mode knee width

private:
    struct NodeState {
        NodeParams p{};
        bool idle = true, enT = false, soloT = false;
        NodeChannel ch = NodeChannel::Stereo;
        int eff = 0;                                  // 0 none, 1 L/R (or mono), 2 Mid, 3 Side
        double lf = 0, lq = 0, range = 0, f = 100, q = 1, invQ = 1;
        double gPrev = 0, gCur = 0;
        SvfCoefs det;                                 // detector + solo band-pass (k = 1/Q)
        double en = 0, solo = 0, applied = 0;
        EnvelopeFollower bal;                         // reduction ballistics (dB, Peak mode)
        float cAtt = -1.f, cRel = -1.f;
        BandEnvelope dSc, dMain[2];
        double rmsSc = 0, rmsMain = 0;
        SvfState bell[2], soloF[2], dBell[2];         // dBell: node-only delta copy
        double lastApplied = -1, lastG = -1, ca1 = 1, ca2 = 0, ca3 = 0, cm1 = 0;
        std::atomic<float> uiRed{0.f}, uiF{100.f}, uiQ{1.f};
    };
    struct KernelKey { double r = 0, f = 0, q = 0, s = 0; int grp = -1; };

    void wake(NodeState& nd) noexcept;
    void beginSub(int len, int numCh) noexcept;
    void endSub() noexcept;
    void firBlock(int numCh) noexcept;
    void jobStep() noexcept;            // one unit of the pipelined kernel design
    void jobFinish() noexcept { while (jobActive) jobStep(); }

    double fs = 48000.0;
    int maxBlk = 512;
    FilterMode fmode = FilterMode::ZeroLatencyIIR;
    bool prepared = false;
    std::array<NodeState, kMaxNodes> nodes;
    DynMode dmode = DynMode::Sidechain;
    bool scOn = true, scOnPrev = true;
    double relOff = 0.0, margin = 3.0, rmsCoef = 0.0;
    float rmsMsSaved = 0.f;
    double mixT = 1.0, mixS = 1.0, sw = 0.0;
    bool anySoloT = false;
    // per-sample / per-sub-block smoothing coefficients
    double cEn = 0, cSolo = 0, cMix = 0, cPar = 0;
    // delta state machine
    int deltaT = -2, deltaCur = -2, deltaHold = 0;
    double deltaFade = 1.0, deltaStep = 0.0;
    // live node lists for the current sub-block
    int nAct = 0, nLR = 0, nM = 0, nS = 0;
    std::array<int, kMaxNodes> act{}, lrList{}, mList{}, sList{};
    // FIR
    detail::LinPhaseFir fir;
    std::array<std::array<double, 64>, kMaxNodes> hist{};
    int histIdx = 0;
    std::array<KernelKey, kMaxNodes> keyNow{}, keyLast{};
    double lastSw = -1, lastMix = -1;
    int lastDelta = -3;
    bool lastIdentity = true;
    // pipelined design job: decided at boundary j for boundary j+1, executed in small steps during block j
    detail::LinPhaseFir::Update pending = detail::LinPhaseFir::Update::Same;
    int pendingSlot = 0;
    bool jobActive = false;
    int jobStepIdx = 0, jobTotal = 0, jobNumCh = 2, jobDelta = -2, jobNDyn = 0, jobNSolo = 0;
    double jobSw = 0, jobMix = 1;
    bool jobAnySolo = false;
    std::array<int, kMaxNodes> jobDyn{}, jobSolo{};
    std::array<KernelKey, kMaxNodes> jobKey{};
    std::vector<double> g2a, g2b, g2c, soloM, soloS;
    std::vector<float> dryL, dryR;
    std::int64_t dryMask = 0, dryCnt = 0;
};

} // namespace pf
