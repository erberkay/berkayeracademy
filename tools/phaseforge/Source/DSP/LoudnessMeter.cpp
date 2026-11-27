// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
#include "LoudnessMeter.h"

#include <algorithm>
#include <cmath>

namespace pf {

namespace {
constexpr double kNegInf = -std::numeric_limits<double>::infinity();

inline double energyToLufs(double meanEnergy) noexcept {
    return meanEnergy > 0.0 ? -0.691 + 10.0 * std::log10(meanEnergy) : kNegInf;
}
inline float toDb(double lin) noexcept { return lin > 0.0 ? (float) (20.0 * std::log10(lin)) : -std::numeric_limits<float>::infinity(); }

// |H(e^{jω})| of a biquad
double biquadMag(const Biquad& q, double w) {
    const std::complex<double> z1 = std::polar(1.0, -w), z2 = std::polar(1.0, -2.0 * w);
    const auto num = q.b0 + q.b1 * z1 + q.b2 * z2;
    const auto den = 1.0 + q.a1 * z1 + q.a2 * z2;
    return std::abs(num / den);
}
} // namespace

void LoudnessMeter::designKWeighting(double rate, Biquad& shelf, Biquad& highpass) {
    // Stage 1: high-shelf, analog prototype f0 = 1681.97 Hz, G = +4.0 dB, Q = 0.7072 (BS.1770 / libebur128 values)
    {
        const double f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
        const double K = std::tan(kPi * f0 / rate);
        const double Vh = std::pow(10.0, G / 20.0);
        const double Vb = std::pow(Vh, 0.4996667741545416);
        const double a0 = 1.0 + K / Q + K * K;
        shelf = Biquad{};
        shelf.b0 = (Vh + Vb * K / Q + K * K) / a0;
        shelf.b1 = 2.0 * (K * K - Vh) / a0;
        shelf.b2 = (Vh - Vb * K / Q + K * K) / a0;
        shelf.a1 = 2.0 * (K * K - 1.0) / a0;
        shelf.a2 = (1.0 - K / Q + K * K) / a0;
    }
    // Stage 2: RLB high-pass, f0 = 38.135 Hz, Q = 0.5003 (numerator 1, −2, 1 as in the BS.1770 table)
    {
        const double f0 = 38.13547087602444, Q = 0.5003270373238773;
        const double K = std::tan(kPi * f0 / rate);
        const double a0 = 1.0 + K / Q + K * K;
        highpass = Biquad{};
        highpass.b0 = 1.0;
        highpass.b1 = -2.0;
        highpass.b2 = 1.0;
        highpass.a1 = 2.0 * (K * K - 1.0) / a0;
        highpass.a2 = (1.0 - K / Q + K * K) / a0;
    }
}

double LoudnessMeter::kWeightingMagnitudeDb(double rate, double f) {
    Biquad s, h;
    designKWeighting(rate, s, h);
    const double w = 2.0 * kPi * f / rate;
    return 20.0 * std::log10(biquadMag(s, w) * biquadMag(h, w));
}

void LoudnessMeter::prepare(double rate, int numCh) {
    fs = rate;
    numChannels = std::clamp(numCh, 1, kMaxChannels);
    subLen = std::max(1, (int) std::lround(fs * 0.1));
    Biquad s, h;
    designKWeighting(fs, s, h);
    for (int c = 0; c < kMaxChannels; ++c) { shelfF[(size_t) c] = s; hpF[(size_t) c] = h; }
    weight.fill(1.0);
    if (numChannels == 5) { weight[3] = 1.41; weight[4] = 1.41; }
    if (numChannels == 6) { weight[3] = 0.0; weight[4] = 1.41; weight[5] = 1.41; }
    peakFallPerSub = std::pow(10.0, -20.0 * 0.1 / 20.0);  // 20 dB/s, applied every 100 ms
    histCount.assign((size_t) kHistBins, 0);
    histEnergy.assign((size_t) kHistBins, 0.0);
    reset();
}

void LoudnessMeter::reset() {
    for (int c = 0; c < kMaxChannels; ++c) { shelfF[(size_t) c].reset(); hpF[(size_t) c].reset(); }
    acc.fill(0.0);
    subEnergy.fill(0.0);
    subHead = 0;
    subCount = 0;
    subPos = 0;
    runPeak = peakAll = peakDispLin = 0.0;
    std::fill(histCount.begin(), histCount.end(), 0);
    std::fill(histEnergy.begin(), histEnergy.end(), 0.0);
    blocksTotal = 0;
    energyTotal = 0.0;
    const float ninf = -std::numeric_limits<float>::infinity();
    mom.store(ninf, std::memory_order_relaxed);
    st.store(ninf, std::memory_order_relaxed);
    integ.store(ninf, std::memory_order_relaxed);
    peak.store(ninf, std::memory_order_relaxed);
    peakDisp.store(ninf, std::memory_order_relaxed);
}

void LoudnessMeter::process(const float* const* ch, int numCh, int n) noexcept {
    if (ch == nullptr || n <= 0) return;
    const int nc = std::min(numCh, numChannels);
    int i = 0;
    while (i < n) {
        const int chunk = std::min(n - i, subLen - subPos);
        for (int c = 0; c < nc; ++c) {
            const float* x = ch[c];
            if (x == nullptr) continue;
            Biquad& s = shelfF[(size_t) c];
            Biquad& h = hpF[(size_t) c];
            double a = 0.0, pk = runPeak;
            for (int k = 0; k < chunk; ++k) {
                const double v = (double) x[i + k];
                const double y = h.process(s.process(v));
                a += y * y;
                pk = std::max(pk, std::fabs(v));
            }
            acc[(size_t) c] += a;
            runPeak = pk;
        }
        i += chunk;
        subPos += chunk;
        if (subPos >= subLen) endSubBlock();
    }
    if (runPeak > peakAll) {
        peakAll = runPeak;
        peak.store(toDb(peakAll), std::memory_order_relaxed);
    }
}

void LoudnessMeter::endSubBlock() noexcept {
    double z = 0.0;
    for (int c = 0; c < numChannels; ++c) {
        z += weight[(size_t) c] * acc[(size_t) c];
        acc[(size_t) c] = 0.0;
    }
    subPos = 0;
    subEnergy[(size_t) subHead] = z;
    subHead = (subHead + 1) % kShortTermSubBlocks;
    ++subCount;

    auto sumLast = [this](int count) noexcept {
        double s = 0.0;
        for (int k = 1; k <= count; ++k) s += subEnergy[(size_t) ((subHead - k + kShortTermSubBlocks) % kShortTermSubBlocks)];
        return s;
    };
    const double mEnergy = sumLast(kMomentarySubBlocks) / ((double) kMomentarySubBlocks * subLen);
    const double sEnergy = sumLast(kShortTermSubBlocks) / ((double) kShortTermSubBlocks * subLen);
    mom.store((float) energyToLufs(mEnergy), std::memory_order_relaxed);
    st.store((float) energyToLufs(sEnergy), std::memory_order_relaxed);

    // gating block = the last 400 ms (only once 4 real sub-blocks exist)
    if (subCount >= (std::uint64_t) kMomentarySubBlocks) {
        const double l = energyToLufs(mEnergy);
        if (l > kHistMinLufs) {
            const int bin = std::clamp((int) std::floor((l - kHistMinLufs) / kHistStepLu), 0, kHistBins - 1);
            histCount[(size_t) bin] += 1;
            histEnergy[(size_t) bin] += mEnergy;
            blocksTotal += 1;
            energyTotal += mEnergy;
            updateIntegrated();
        }
    }

    peakDispLin = std::max(runPeak, peakDispLin * peakFallPerSub);
    peakDisp.store(toDb(peakDispLin), std::memory_order_relaxed);
    if (runPeak > peakAll) {
        peakAll = runPeak;
        peak.store(toDb(peakAll), std::memory_order_relaxed);
    }
    runPeak = 0.0;
}

void LoudnessMeter::updateIntegrated() noexcept {
    if (blocksTotal == 0) return;
    const double relGate = energyToLufs(energyTotal / (double) blocksTotal) - 10.0;
    // bins whose centre lies above the relative gate are included
    const double pos = (relGate - kHistMinLufs) / kHistStepLu - 0.5;
    int first = (int) std::floor(pos) + 1;
    first = std::clamp(first, 0, kHistBins);
    std::uint64_t cnt = 0;
    double e = 0.0;
    for (int b = first; b < kHistBins; ++b) { cnt += histCount[(size_t) b]; e += histEnergy[(size_t) b]; }
    integ.store(cnt > 0 ? (float) energyToLufs(e / (double) cnt) : -std::numeric_limits<float>::infinity(),
                std::memory_order_relaxed);
}

} // namespace pf
