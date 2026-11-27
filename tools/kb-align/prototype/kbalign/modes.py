# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Dört otomatik hizalama modu — gerçek zaman nedenselliğiyle (causality) simülasyon.

Zaman çizgisi: kick vuruşu içerik zamanı t0'da. Çıkışta bas ile kick, gerçek zamanda
t0 + L anında duyulur. Bir parametre değişimi, crossfade [t0 - X - 1 ms, t0 - 1 ms]
aralığında biter; kararın gerçek zamanda t0 + L - X - 1 ms'e kadar verilmesi gerekir.
O ana kadar girişte görülen kick/bas = "kullanılabilir lookahead".

Modlar:
  learn — ilk N vuruş birlikte (birleşik hedef) → dondur
  hit   — her vuruş; lookahead yetmezse sonuç sonraki vuruşa
  note  — bas notası → (d, θ) tablosu (birleşik hedef, nota başına)
  cont  — vuruşlarda üstel unutmalı birikim, hız sınırlı rampa
Ortak: güven eşiği, kabul kuralı (yeni değer en az accept kadar iyileştirmeli).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from . import align, dsp, engine, pitch

# VARSAYIM: gerçek zamanda analiz sonucu, crossfade başlamadan en az bu kadar önce hazır olmalı
# (host bloğu ≤ 512 örnek @48 kHz ≈ 10,7 ms + analiz süresi ≤ ~9 ms). C++ ölçümüyle doğrulanacak.
RT_MARGIN_MS = 20.0
GLOBAL_HITS = 16  # nota modunun genel (nota bilinmeyen) değeri için son vuruş sayısı


@dataclass
class ModeParams:
    mode: str = "learn"
    learn_hits: int = 8
    hit_win_ms: float | None = None  # None → gecikme bütçesinin izin verdiği en uzun (≤150 ms)
    conf_min: float = 0.15
    accept: float = 0.005  # kabul kuralı: normalize korelasyonda en az bu kadar artış
    note_max_segs: int = 16
    cont_tau_s: float = 1.0
    cont_rate_ms_s: float = 0.5  # ≈0,9 cent Doppler
    cont_rate_deg_s: float = 45.0
    fmin: float = 19.0


@dataclass
class SimResult:
    events: list = field(default_factory=list)  # [(içerik_zamanı, d, θ)]
    d_arr: np.ndarray | None = None
    th_arr: np.ndarray | None = None
    hits: list = field(default_factory=list)  # vuruş başına bilgi


def _obj_at(exact, d_ms, th, fa):
    z = exact(d_ms * fa / 1000)
    return float(np.real(z * np.exp(-1j * np.deg2rad(th))))


def _joint(segs, an: align.Analyzer, ap: align.AnalysisParams, lags):
    exact = align.make_exact(segs)
    cs = np.array([exact(float(t)) for t in lags])
    return align.pick(lags, cs, an.fa, ap, None, exact), exact


def simulate(kick, bass, cfg: engine.Config, ap: align.AnalysisParams, mp: ModeParams,
             onsets=None, analyzer=None) -> SimResult:
    fs = cfg.fs
    an = analyzer or align.Analyzer(fs, cfg.analysis_fc)
    fa = an.fa
    k_low = dsp.lowpass4(kick, fs, cfg.analysis_fc)
    b_low = dsp.lowpass4(bass, fs, cfg.analysis_fc)
    if onsets is None:
        onsets = align.detect_onsets(kick, fs)
    L_ms = cfg.latency * 1000 / fs
    X_ms = cfg.xfade_ms
    budget = L_ms - X_ms - 1.0 - RT_MARGIN_MS  # kick onset'inden sonra, kararda kullanılabilen veri (ms)
    res = SimResult()
    cur = (0.0, 0.0)  # (d, θ)
    res.events.append((0, 0.0, 0.0))
    learn_segs = []
    frozen = False
    table: dict[int, list] = {}
    table_est: dict[int, tuple] = {}
    pending = None  # (d, θ) — sonraki vuruşa uygulanacak
    g_cs: list = []  # nota modu: son vuruşların normalize korelasyonları (nota bilinmezse genel değer)
    g_est = None
    cont_C = None
    cont_last_t = None
    cont_targets = []  # (gerçek zamanda uygulanabilir olduğu içerik zamanı, d, θ)

    def apply(t0, val, why):
        nonlocal cur
        cur = val
        res.events.append((t0 - int(0.001 * fs), val[0], val[1]))
        return why

    for i, t0 in enumerate(onsets):
        info = dict(onset=int(t0), applied=None, note=None, why="")
        if pending is not None:
            info["why"] = apply(t0, pending, "önceki vuruşun sonucu")
            pending = None
        # tam pencereli analiz (gecikmesiz kararlar için değil, öğrenme/tablo için)
        full = an.hit(k_low, b_low, t0, ap)
        if mp.mode == "learn" and not frozen:
            if full.rho >= mp.conf_min:
                learn_segs.append(full.seg)
            if len(learn_segs) >= mp.learn_hits:
                (d, th, v), _ = _joint(learn_segs, an, ap, full.lags)
                pending = (d, th)
                frozen = True
        elif mp.mode == "hit":
            W = mp.hit_win_ms
            if W is None:
                W = float(np.clip(budget - ap.win_start_ms - max(0.0, -ap.d_min_ms) - 1.0, 10.0, 150.0))
            need = ap.win_start_ms + W + max(0.0, -ap.d_min_ms)
            info["win_ms"] = W
            hp = align.AnalysisParams(ap.win_start_ms, W, ap.d_min_ms, ap.d_max_ms, ap.auto)
            r = an.hit(k_low, b_low, t0, hp, avail_ms=budget)
            ex = align.make_exact([r.seg])
            ok = r.rho >= mp.conf_min and r.rho >= _obj_at(ex, *cur, fa) + mp.accept
            if ok:
                if need <= budget:
                    info["why"] = apply(t0, (r.d_ms, r.theta), "bu vuruş (lookahead yeterli)")
                else:
                    pending = (r.d_ms, r.theta)
                    info["why"] = "sonraki vuruşa (lookahead yetersiz)"
        elif mp.mode == "note":
            # nota tespiti: onset'ten sonra bütçe kadar veri (gerçek zamanda görülebilen)
            avail = max(10.0, budget)
            fmin = max(mp.fmin, 1.15 * 2000.0 / avail)
            n_pts = int(avail * fa / 1000)
            bd = an.decimate(bass, int(t0), n_pts)
            note, ap_ = pitch.detect_note(bd, fa, fmin=fmin)
            if note is None:  # erken veri yetmedi: tam pencereden (yalnız tabloyu doldurmak için)
                bd2 = an.decimate(bass, int(t0), int(0.12 * fa))
                note_late, _ = pitch.detect_note(bd2, fa, fmin=mp.fmin)
            else:
                note_late = note
            info["note"] = note
            target = None
            if note is not None and note in table_est:
                target, why = table_est[note], f"tablo: {note}"
            elif g_est is not None:  # nota bilinmiyor ya da tabloda yok → bütün vuruşlardan öğrenilen genel değer
                target, why = g_est, "genel (nota yok)"
            if target is not None and target != cur:
                info["why"] = apply(t0, target, why)
            if full.rho >= mp.conf_min:
                g_cs.append(full.c)
                del g_cs[:-GLOBAL_HITS]
                gm = np.mean(g_cs, axis=0)
                gd, gth, gv = align.pick(full.lags, gm, fa, ap)
                if g_est is None:
                    g_est = (gd, gth)
                else:
                    zo = align.interp_c(full.lags, gm, g_est[0] * fa / 1000)
                    if gv >= float(np.real(zo * np.exp(-1j * np.deg2rad(g_est[1])))) + mp.accept:
                        g_est = (gd, gth)
            # tabloyu güncelle (vuruştan sonra, son tarih yok)
            key = note if note is not None else note_late
            if key is not None and full.rho >= mp.conf_min:
                segs = table.setdefault(key, [])
                segs.append(full.seg)
                del segs[:-mp.note_max_segs]
                (d, th, v), ex = _joint(segs, an, ap, full.lags)
                old = table_est.get(key)
                if old is None or v >= _obj_at(ex, *old, fa) + mp.accept:
                    table_est[key] = (d, th)
                if note is None and key in table_est:
                    pending = None  # nota zamanında bilinmedi: bu vuruşa uygulanamaz
        elif mp.mode == "cont":
            t_s = t0 / fs
            decay = 1.0 if cont_last_t is None else np.exp(-(t_s - cont_last_t) / mp.cont_tau_s)
            cont_last_t = t_s
            cn = full.c * full.rho / (np.max(np.abs(full.c)) + 1e-30)
            cont_C = cn if cont_C is None else decay * cont_C + cn
            d, th, v = align.pick(full.lags, cont_C, fa, ap)
            ready = int(t0 + (ap.win_start_ms + ap.win_ms) * fs / 1000)  # analiz bitince
            cont_targets.append((ready, d, th))
        info["applied"] = cur
        res.hits.append(info)

    if mp.mode == "cont":
        n = len(bass)
        d_arr = np.zeros(n)
        th_arr = np.zeros(n)
        dcur, tcur = 0.0, 0.0
        tgt_d, tgt_t = 0.0, 0.0
        it = iter(sorted(cont_targets))
        nxt = next(it, None)
        step_d = mp.cont_rate_ms_s / fs
        step_t = mp.cont_rate_deg_s / fs
        # hedefler gerçek zamanda "ready - L" içerik anından itibaren geçerli
        for s in range(n):
            while nxt is not None and nxt[0] - cfg.latency <= s:
                _, tgt_d, tgt_t = nxt
                nxt = next(it, None)
            dcur += np.clip(tgt_d - dcur, -step_d, step_d)
            dt = (tgt_t - tcur + 180) % 360 - 180
            tcur += np.clip(dt, -step_t, step_t)
            d_arr[s], th_arr[s] = dcur, tcur
        res.d_arr, res.th_arr = d_arr, th_arr
    return res


def render(bass, cfg, sim: SimResult, return_low=False):
    if sim.d_arr is not None:
        return engine.render(bass, cfg, d_arr=sim.d_arr, th_arr=sim.th_arr, return_low=return_low)
    return engine.render(bass, cfg, events=sim.events, return_low=return_low)
