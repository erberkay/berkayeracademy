# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Danışman: kick'e DOKUNMADAN üç öneri (spec §5c).

1. Kick akordu — "kick'i n yarım ses akort edersen bu loop'ta beklenen kazanç".
   Ölçüm tahmin değil: son vuruşlarda kick, sampler'ın Warp kapalı transpozu gibi (hız
   değişimi: perde ve uzunluk birlikte) yeniden örneklenir ve gerçek basla en iyi (d, θ)
   korelasyonu yeniden aranır. Aday aralığı ±MAX_ST (2 yarım ses) — kick karakterini
   korumak için; küçük |n| tercih edilir. Eklenti kick'i hiçbir zaman değiştirmez.
2. Synth retrigger — aynı notanın vuruşlarında bas–kick faz ilişkisi tutarlı mı?
   (dairesel ortalama uzunluğu R; retrigger açık/örnek ≈ 1, serbest osilatör ≈ 0,3–0,6)
3. Ducking — bas kick'in gövdesiyle uyuşmuyorsa (akort da yetmiyorsa): yalnız alt bantta,
   kick gövdesi kadar, %60.

C++ karşılığı: plugin/src/engine/Advisor.cpp (aynı eşikler).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from . import align, dsp, pitch

MAX_ST = 2.0          # önerilecek en büyük akort (yarım ses)
STEP_ST = 0.25        # aday adımı (25 cent)
MIN_GAIN_DB = 0.25    # bundan küçük kazanç önerilmez
WORST_DB = -0.5       # hiçbir vuruş bundan fazla kötüleşmemeli
SHARE = 0.9           # en iyi kazancın %90'ına ulaşan en küçük |n|
LAST_HITS = 12        # akort için kullanılan son vuruş sayısı
WIN_MS = 150.0
R_ON, R_FREE = 0.85, 0.65
MIN_NOTE_HITS = 6
DUCK_RHO = 0.2        # akorttan sonra da ρ* bunun altındaysa ducking önerilir…
DUCK_NEAR_ST = 5.0    # …ve bas notası kick'e bu kadar yakınsa (yavaş vuruşma = duyulan dalgalanma).
#                       Bas kick'in çok üstündeyse (ör. A2 ↔ 53 Hz) çakışma azdır: ducking önerilmez.
DUCK_MAX_MS = 300.0
BODY_DB = -12.0       # kick gövdesi: alt bant zarfının tepeden bu kadar düşmesine kadar
DUCK_DEPTH = 0.6


def tune_candidates(max_st=MAX_ST, step=STEP_ST):
    k = int(round(max_st / step))
    return [i * step for i in range(-k, k + 1)]


def retune_segment(x: np.ndarray, t0: int, n_st: float) -> np.ndarray:
    """x'i t0 etrafında hız değişimiyle yeniden örnekler: y(t0 + τ) = x(t0 + r·τ), r = 2^(n/12).
    (Sampler, Warp kapalı: +n yarım ses → kick 1/r kadar kısalır.) Doğrusal ara değerleme."""
    r = 2.0 ** (n_st / 12.0)
    idx = t0 + (np.arange(len(x)) - t0) * r
    return np.interp(idx, np.arange(len(x)), x, left=0.0, right=0.0)


def kick_peak_hz(an: align.Analyzer, k_low: np.ndarray, t0: int) -> float | None:
    """Analiz penceresinde (0–150 ms) kick alt bandının baskın frekansı (desimasyonlu, tepe inceltmeli)."""
    W = int(round(WIN_MS * an.fa / 1000))
    kd = an.decimate(k_low, t0, W)
    if np.max(np.abs(kd)) < 1e-6:
        return None
    n = 8192
    S = np.abs(np.fft.rfft(kd, n))
    f = np.arange(len(S)) * an.fa / n
    lo, hi = int(np.ceil(25 * n / an.fa)), int(np.floor(150 * n / an.fa))
    i = lo + int(np.argmax(S[lo:hi + 1]))
    a, b, c = S[i - 1], S[i], S[i + 1]
    den = a - 2 * b + c
    off = 0.5 * (a - c) / den if abs(den) > 1e-12 else 0.0
    return float(f[i] + np.clip(off, -1, 1) * an.fa / n)


def kick_body_ms(an: align.Analyzer, k_low: np.ndarray, t0: int, max_ms=600.0) -> float | None:
    """Alt bant zarfı (5 ms kayan RMS, desimasyonlu) tepeden BODY_DB düşene kadar geçen süre."""
    n = int(round(max_ms * an.fa / 1000))
    kd = an.decimate(k_low, t0, n)
    w = max(1, int(round(0.005 * an.fa)))
    env = np.sqrt(np.convolve(kd ** 2, np.ones(w) / w, "same"))
    if env.max() < 1e-6:
        return None
    pk = int(np.argmax(env))
    thr = env[pk] * 10 ** (BODY_DB / 20)
    below = np.nonzero(env[pk:] < thr)[0]
    j = pk + (below[0] if len(below) else n - pk)
    return 1000.0 * j / an.fa


def lag0_phase(an: align.Analyzer, k_low, b_low, t0):
    """Kick penceresinde (0–150 ms) bas ile kick arasındaki faz (gecikme 0): arg Σ k_a·conj(b_a)."""
    W = int(round(WIN_MS * an.fa / 1000))
    kd = an.decimate(k_low, t0, W)
    bd = an.decimate(b_low, t0, W)
    z = np.vdot(align.analytic_pow2(bd), align.analytic_pow2(kd))
    return z


def gain_db(rho, ek, eb):
    return 10 * np.log10((ek + eb + 2 * rho * np.sqrt(ek * eb)) / (ek + eb + 1e-30) + 1e-30)


@dataclass
class Advice:
    hits: int = 0
    kick_hz: float | None = None
    kick_body_ms: float | None = None
    notes: dict = field(default_factory=dict)       # midi → vuruş sayısı
    top_note: int | None = None
    retrig_R: float | None = None
    retrig: str = "belirsiz"                        # "tutarli" | "serbest" | "belirsiz"
    tune_st: float = 0.0                            # önerilen akort (0 = öneri yok)
    tune_gain0: float = 0.0                         # bugünkü (akortsuz) ortalama kazanç
    tune_gain: float = 0.0                          # önerilen akortla beklenen
    tune_best_st: float = 0.0
    tune_worst: float = 0.0                         # önerilen akortta en kötü vuruşun değişimi
    tune_far_st: float | None = None                # en çok çalan notaya uzaklık (yarım ses)
    tune_curve: dict = field(default_factory=dict)  # n → ortalama kazanç
    rho: float = 0.0                                # akortsuz ortalama ρ*
    rho_tuned: float = 0.0
    duck: bool = False
    duck_len_ms: float = 0.0
    duck_depth: float = DUCK_DEPTH
    mode: str = ""                                  # önerilen mod: "nota" | "learn" | "her_vurus"


def advise(kick: np.ndarray, bass: np.ndarray, fs: float, onsets=None, fc=120.0, search_ms=10.0) -> Advice:
    an = align.Analyzer(fs, fc)
    k_low = dsp.lowpass4(kick, fs, fc)
    b_low = dsp.lowpass4(bass, fs, fc)
    if onsets is None:
        onsets = align.detect_onsets(kick, fs)
    post = int(0.62 * fs)
    onsets = [int(t) for t in onsets if t + post < len(kick)]
    A = Advice(hits=len(onsets))
    if not onsets:
        return A
    ap = align.AnalysisParams(d_min_ms=-search_ms, d_max_ms=search_ms)
    fk, body, by_note = [], [], {}
    for t in onsets:
        f = kick_peak_hz(an, k_low, t)
        if f:
            fk.append(f)
        bm = kick_body_ms(an, k_low, t)
        if bm:
            body.append(bm)
        n2 = int(0.12 * an.fa)
        bd = an.decimate(bass, t, n2)
        note, _ = pitch.detect_note(bd, an.fa)
        if note is not None:
            A.notes[note] = A.notes.get(note, 0) + 1
            by_note.setdefault(note, []).append(lag0_phase(an, k_low, b_low, t))
    A.kick_hz = float(np.median(fk)) if fk else None
    A.kick_body_ms = float(np.median(body)) if body else None
    if A.notes:
        A.top_note = max(A.notes, key=lambda k: (A.notes[k], -k))
    # retrigger: notası belli vuruşlarda faz tutarlılığı (nota başına, vuruş sayısıyla ağırlıklı)
    num = den = 0.0
    for z in by_note.values():
        z = np.array([v for v in z if abs(v) > 0])
        if len(z) >= 3:
            num += len(z) * abs(np.mean(z / np.abs(z)))
            den += len(z)
    if den > 0:
        A.retrig_R = num / den
        if den >= MIN_NOTE_HITS:
            A.retrig = "tutarli" if A.retrig_R >= R_ON else ("serbest" if A.retrig_R < R_FREE else "belirsiz")
    # akort: son vuruşlarda her aday için gerçek korelasyon
    use = onsets[-LAST_HITS:]
    W = int(round(WIN_MS * fs / 1000))
    cands = tune_candidates()
    G = np.zeros((len(cands), len(use)))
    RH = np.zeros_like(G)
    for j, t in enumerate(use):
        eb = float(np.sum(b_low[t:t + W] ** 2))
        b_d = an.segment(b_low, t, ap)
        lo, hi = t - int(0.4 * fs), t + int(0.7 * fs)   # yeniden örnekleme yalnız vuruşun çevresinde
        for i, n in enumerate(cands):
            kk = k_low.copy()
            if n:
                kk[max(0, lo):hi] = retune_segment(k_low[max(0, lo):hi], t - max(0, lo), n)
            RH[i, j] = an.rho_quick(an.segment(kk, t, ap), b_d, ap)
            ek = float(np.sum(kk[t:t + W] ** 2))
            G[i, j] = gain_db(RH[i, j], ek, eb)
    mean = G.mean(axis=1)
    i0 = cands.index(0.0)
    A.tune_curve = {float(n): float(m) for n, m in zip(cands, mean)}
    A.tune_gain0 = float(mean[i0])
    A.rho = float(RH[i0].mean())
    ib = int(np.argmax(mean))
    A.tune_best_st = float(cands[ib])
    target = A.tune_gain0 + SHARE * (mean[ib] - A.tune_gain0)
    ok = [i for i in range(len(cands)) if mean[i] >= target and np.min(G[i] - G[i0]) >= WORST_DB]
    pick = min(ok, key=lambda i: (abs(cands[i]), -mean[i])) if ok else i0
    if mean[pick] - A.tune_gain0 >= MIN_GAIN_DB and cands[pick] != 0.0:
        A.tune_st = float(cands[pick])
        A.tune_gain = float(mean[pick])
        A.tune_worst = float(np.min(G[pick] - G[i0]))
        A.rho_tuned = float(RH[pick].mean())
    else:
        A.tune_gain = A.tune_gain0
        A.rho_tuned = A.rho
    if A.kick_hz and A.top_note is not None:
        A.tune_far_st = float(12 * np.log2(pitch_hz(A.top_note) / A.kick_hz))
    # ducking: akorttan sonra da uyumsuzsa
    near = A.tune_far_st is not None and abs(A.tune_far_st - A.tune_st) <= DUCK_NEAR_ST
    if A.rho_tuned < DUCK_RHO and near and A.kick_body_ms:
        A.duck = True
        A.duck_len_ms = float(np.clip(A.kick_body_ms, 60.0, DUCK_MAX_MS))
    # mod önerisi
    if A.retrig == "serbest":
        A.mode = "her_vurus"
    elif len([n for n, c in A.notes.items() if c >= 2]) >= 2:
        A.mode = "nota"
    else:
        A.mode = "learn"
    return A


def pitch_hz(midi: int) -> float:
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)
