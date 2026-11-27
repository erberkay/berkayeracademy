# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""'%100 hizalama' ölçütleri (talimat §4) ve kaba kuvvet teorik sınır.

Hepsi TAM örnekleme hızında, alt bantta (LR4 LP), kick penceresinde
[onset, onset + 150 ms] hesaplanır.

Teorik sınır: ρ*(d, θ) = Σ k·b'(d,θ) / √(Σk² · Σb'²) üzerinde kaba kuvvet,
  d: ±50 ms (tamsayı örnek gecikmeleri + 0,01 ms ızgarada kübik inceltme)
  θ: 1° adım; b' ideal (FFT) Hilbert ile döndürülür.

Ölçüt 1 (enerji): ulaşılan toplam enerji, AYNI bas enerjisiyle en iyi korelasyonda
elde edilecek enerjiye göre ≥ −0,5 dB:
  E_lim = E_k + E_b' + 2·ρ*·√(E_k E_b'),  E_ach = E_k + E_b' + 2·ρ_ach·√(E_k E_b')
(Ham enerji maksimumu bas enerjisini pencereye kaydırarak da büyür — rapor §hedef.)
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import signal
from scipy.interpolate import CubicSpline

from . import dsp

METRIC_WIN_MS = 150.0


@dataclass
class Brute:
    rho: float
    d_ms: float
    theta: float


def _xcorr_win(a_win: np.ndarray, x: np.ndarray, w0: int, lags: np.ndarray) -> np.ndarray:
    """Σ_j a_win[j]·x[w0 + j - τ] tüm τ için (FFT)."""
    W = len(a_win)
    lo = w0 - lags.max()
    hi = w0 + W - lags.min()
    seg = x[lo:hi]
    full = signal.fftconvolve(seg, a_win[::-1], mode="valid")  # full[i] = Σ a[j] seg[i + j]
    # i = w0 - τ - lo
    return full[(w0 - lags) - lo]


def _sliding_win(y: np.ndarray, w0: int, W: int, lags: np.ndarray) -> np.ndarray:
    cs = np.concatenate([[0.0], np.cumsum(y)])
    s = w0 - lags
    return cs[s + W] - cs[s]


def brute_force(k_low: np.ndarray, b_low: np.ndarray, onset: int, fs: float,
                d_min_ms=-50.0, d_max_ms=50.0, auto="both", win_ms=METRIC_WIN_MS) -> Brute:
    W = int(round(win_ms * fs / 1000))
    lag_lo = int(np.floor(d_min_ms * fs / 1000))
    lag_hi = int(np.ceil(d_max_ms * fs / 1000))
    pad = lag_hi - lag_lo + W + 10
    kk = np.concatenate([np.zeros(pad), k_low, np.zeros(pad)])
    bb = np.concatenate([np.zeros(pad), b_low, np.zeros(pad)])
    hb = dsp.hilbert_ideal(bb)
    w0 = onset + pad
    kw = kk[w0:w0 + W]
    ek = np.sum(kw ** 2)
    lags = np.arange(lag_lo, lag_hi + 1)
    P = _xcorr_win(kw, bb, w0, lags)
    Q = _xcorr_win(kw, hb, w0, lags)
    A = _sliding_win(bb ** 2, w0, W, lags)
    B = _sliding_win(hb ** 2, w0, W, lags)
    C = _sliding_win(bb * hb, w0, W, lags)

    th = np.deg2rad(np.arange(0, 360)) if auto != "delay" else np.array([0.0])
    if auto == "phase":
        sel = lags == 0
        P, Q, A, B, C, lags = P[sel], Q[sel], A[sel], B[sel], C[sel], lags[sel]

    def rho_grid(P, Q, A, B, C):
        cth, sth = np.cos(th)[None, :], np.sin(th)[None, :]
        num = P[:, None] * cth - Q[:, None] * sth
        eb = A[:, None] * cth ** 2 + B[:, None] * sth ** 2 - 2 * C[:, None] * sth * cth
        return num / np.sqrt(ek * np.maximum(eb, 1e-30))

    R = rho_grid(P, Q, A, B, C)
    i, j = np.unravel_index(np.argmax(R), R.shape)
    best = Brute(float(R[i, j]), lags[i] * 1000 / fs, float(np.degrees(th[j])))
    if auto != "phase" and len(lags) > 8:
        # 0,01 ms ızgarada kübik inceltme (en iyi tamsayı gecikmenin ±0,5 ms çevresi)
        sl = slice(max(0, i - int(0.0006 * fs) - 2), min(len(lags), i + int(0.0006 * fs) + 3))
        L = lags[sl] * 1000 / fs
        fine = np.arange(max(L[0], best.d_ms - 0.5), min(L[-1], best.d_ms + 0.5) + 1e-9, 0.01)
        cs = [CubicSpline(L, v[sl])(fine) for v in (P, Q, A, B, C)]
        Rf = rho_grid(*cs)
        a, b = np.unravel_index(np.argmax(Rf), Rf.shape)
        if Rf[a, b] > best.rho:
            best = Brute(float(Rf[a, b]), float(fine[a]), float(np.degrees(th[b])))
    return best


def window_stats(k_low_al: np.ndarray, y_low_al: np.ndarray, onset: int, fs: float, win_ms=METRIC_WIN_MS):
    """Hizalanmış (içerik zamanında) kick ve bas alt bandı için pencere istatistikleri."""
    W = int(round(win_ms * fs / 1000))
    k = k_low_al[onset:onset + W]
    y = y_low_al[onset:onset + W]
    ek, eb, x = np.sum(k ** 2), np.sum(y ** 2), np.sum(k * y)
    rho = x / np.sqrt(ek * eb + 1e-30)
    return dict(ek=ek, eb=eb, rho=float(rho), e_sum=float(np.sum((k + y) ** 2)))


def energy_gap_db(ek, eb, rho_ach, rho_star) -> float:
    """Ölçüt 1: ulaşılan enerji − sınır (dB). ≥ −0,5 geçer."""
    num = ek + eb + 2 * rho_ach * np.sqrt(ek * eb)
    den = ek + eb + 2 * max(rho_star, rho_ach) * np.sqrt(ek * eb)
    return float(10 * np.log10(max(num, 1e-30) / den))


def ideal_gap_db(k: np.ndarray, y: np.ndarray) -> float:
    """Bilgi: frekans başına faz eşleşmesiyle elde edilebilecek tutarlı toplama göre fark (dB)."""
    n = 1 << int(np.ceil(np.log2(len(k) * 2)))
    K, Y = np.fft.rfft(k, n), np.fft.rfft(y, n)
    ideal = np.sum((np.abs(K) + np.abs(Y)) ** 2)
    ach = np.sum(np.abs(K + Y) ** 2)
    return float(10 * np.log10(ach / ideal))


def cancel_db(k: np.ndarray, b: np.ndarray) -> float:
    """İptal ölçer: 10·log10(E(k+b) / (E(k)+E(b))). +3 dB tam tutarlı (eşit genlik), −∞ tam iptal."""
    return float(10 * np.log10(np.sum((k + b) ** 2) / (np.sum(k ** 2) + np.sum(b ** 2) + 1e-30) + 1e-30))


def null_db(a: np.ndarray, b: np.ndarray) -> float:
    """İki sinyalin farkının tepe değeri (dBFS)."""
    n = min(len(a), len(b))
    return float(20 * np.log10(np.max(np.abs(a[:n] - b[:n])) + 1e-30))


def click_metric(y: np.ndarray, ref: np.ndarray, fs: float) -> float:
    """Geçişte tıklama ölçüsü: fark sinyalinin 2. türevinin, referansınkine oranı (dB).

    Sürekli bir geçiş referansın kendi eğriliğini aşmaz (≤ 0 dB civarı); tıklama
    ani türev sıçraması yapar (+20 dB ve üzeri).
    """
    hp = signal.butter(2, 2000, "high", fs=fs, output="sos")
    e = signal.sosfilt(hp, y)
    r = signal.sosfilt(hp, ref)
    return float(20 * np.log10((np.max(np.abs(e)) + 1e-12) / (np.max(np.abs(r)) + 1e-12)))
