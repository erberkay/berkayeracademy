// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// KB-Align — hizalama analizi (arka plan thread'i). Python referansı: prototype/kbalign/align.py, pitch.py
// Ses thread'inde ÇAĞRILMAZ (bellek ayırır). Ses thread'inde çalışan tek parça OnsetDetector'dır.
#pragma once

#include "../dsp/Dsp.h"

#include <complex>
#include <functional>
#include <optional>
#include <vector>

namespace kb {

using cplx = std::complex<double>;

enum class AutoTarget { Both = 0, Delay = 1, Phase = 2 };

struct AnalysisParams {
    double winStartMs = 0.0;
    double winMs = 150.0;
    double dMinMs = -10.0;
    double dMaxMs = 10.0;
    AutoTarget autoTarget = AutoTarget::Both;
    double ambiguityTol = 0.005;
};

// Kesin inceltme için vuruş segmenti
struct HitSegment {
    std::vector<cplx> kw;   // kick analitik penceresi
    std::vector<cplx> B;    // bas analitik segmentinin FFT'si (nfft)
    int nfftOrder = 0;
    int j0 = 0;
    double ek = 0;
};

struct HitResult {
    double dMs = 0, theta = 0, rho = 0;
    std::vector<int> lags;
    std::vector<cplx> c;  // normalize korelasyon (geçersiz gecikmeler 0)
    HitSegment seg;
    bool ok = false;
};

// birden çok vuruş üzerinde kesin normalize korelasyon (ortalama)
class ExactEval {
public:
    explicit ExactEval(const std::vector<const HitSegment*>& segs);
    cplx operator()(double tau);
private:
    std::vector<const HitSegment*> segs;
    std::vector<FFT> ffts;
    std::vector<cplx> scratch;
};

class Analyzer {
public:
    static constexpr double kFaTarget = 3000.0;
    static constexpr int kInterpHalf = 16;
    static constexpr int kPad = 256;

    Analyzer(double fs, double fc = 120.0);
    double fa() const { return fa_; }
    int decimFactor() const { return M; }

    // z[i] = Σ_k h[k]·x[start + i·M + gd - k]; x dışı örnekler sıfır
    std::vector<double> decimate(const double* x, long long n, long long start, int count) const;

    // k_low/b_low: tam hızlı alt bant (aynı zaman tabanı), onset: indeks; n: kullanılabilir örnek sayısı
    HitResult hit(const double* kLow, const double* bLow, long long n, long long onset, const AnalysisParams& p) const;

    // Aday seçimi + örnek altı inceltme (Python align.pick). Döner (d_ms, θ°, amaç)
    struct Pick { double dMs, theta, value; };
    static Pick pick(const std::vector<int>& lags, const std::vector<cplx>& c, double fa, const AnalysisParams& p,
                     const std::vector<bool>* valid, const std::function<cplx(double)>& ev);

    static cplx interpC(const std::vector<int>& lags, const std::vector<cplx>& c, double tau);

    // Hızlı ρ* (Danışman'ın akort adayları; Python Analyzer.segment / rho_quick): hit() ile aynı segment,
    // kesin inceltme yok — tamsayı gecikmelerde en büyük |normalize korelasyon|.
    std::vector<double> segment(const double* x, long long n, long long onset, const AnalysisParams& p) const;
    double rhoQuick(const std::vector<double>& kd, const std::vector<double>& bd, const AnalysisParams& p) const;

    // Python modes._joint: segmentlerin birleşik hedefi
    Pick joint(const std::vector<const HitSegment*>& segs, const std::vector<int>& lags, const AnalysisParams& p) const;

private:
    double fs_, fc_, fa_;
    int M, gd;
    std::vector<double> taps;
};

std::vector<cplx> analyticPow2(const std::vector<double>& x);

// ───────────────────────────── YIN (Python pitch.yin)
struct PitchResult { std::optional<double> f0; double aperiodicity = 1.0; };
PitchResult yin(const std::vector<double>& x, double fa, double fmin = 19.0, double fmax = 400.0, double thr = 0.15);
std::optional<int> detectNote(const std::vector<double>& x, double fa, double fmin = 19.0);
inline int hzToMidi(double f) { return (int) std::lround(69.0 + 12.0 * std::log2(f / 440.0)); }

// ───────────────────────────── Onset (ses thread'i, örnek örnek; Python align.detect_onsets)
struct OnsetParams {
    double trigHz = 150.0, fastAttackMs = 0.3, fastReleaseMs = 8.0, slowMs = 60.0;
    double ratioDb = 6.0, rearmDb = 1.0, absDb = -45.0, relDb = -30.0, holdMs = 60.0;
};

class OnsetDetector {
public:
    void prepare(double fs, const OnsetParams& p = {});
    void setTriggerHz(double hz);
    void reset();
    // örnek işler; tetik olursa onset'in mutlak indeksini döndürür (≤ i), yoksa -1
    long long process(double x, long long i) noexcept;
private:
    OnsetParams p;
    double fs = 48000;
    Biquad lp;
    double ga = 0, gr = 0, gs = 0, ratio = 2, rearm = 1.12, thrAbs = 0, rel = 0, pkDecay = 1;
    double fast = 0, slow = 0, peak = 0;
    long long last = 0, hold = 0;
    bool armed = true;
    int back = 0;
    std::vector<double> histF;  // prepare'de ayrılır
};

} // namespace kb
