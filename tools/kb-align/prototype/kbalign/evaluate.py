# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Tek vuruş uçtan uca değerlendirme: analiz → ses yolu (engine) → ölçütler."""
from __future__ import annotations

import numpy as np

from . import align, dsp, engine, metrics


def eval_hit(hit, cfg: engine.Config, ap: align.AnalysisParams | None = None, analyzer=None):
    fs = hit.fs
    ap = ap or align.AnalysisParams(d_min_ms=cfg.d_min_ms, d_max_ms=cfg.d_max_ms)
    an = analyzer or align.Analyzer(fs, cfg.analysis_fc)
    k_low = dsp.lowpass4(hit.kick, fs, cfg.analysis_fc)
    b_low = dsp.lowpass4(hit.bass, fs, cfg.analysis_fc)
    r = an.hit(k_low, b_low, hit.onset, ap)
    out = engine.render(hit.bass, cfg, events=[(0, r.d_ms, r.theta)])
    L = cfg.latency
    # ölçüm GERÇEK çıktıda: tüm çıkış (crossover açıksa iki bandın toplamı), analiz bandında
    y_al = dsp.lowpass4(out[L:], fs, cfg.analysis_fc)  # içerik zamanı
    st = metrics.window_stats(k_low, y_al, hit.onset, fs)
    bf = metrics.brute_force(k_low, b_low, hit.onset, fs, ap.d_min_ms, ap.d_max_ms, ap.auto)
    W = int(round(metrics.METRIC_WIN_MS * fs / 1000))
    seg = slice(hit.onset, hit.onset + W)
    return dict(
        d_est=r.d_ms, th_est=r.theta, rho_conf=r.rho,
        d_true=hit.true_d_ms, th_true=hit.true_theta,
        d_err=None if hit.true_d_ms is None else r.d_ms - hit.true_d_ms,
        rho_ach=st["rho"], rho_star=bf.rho, d_star=bf.d_ms, th_star=bf.theta,
        e_gap_db=metrics.energy_gap_db(st["ek"], st["eb"], st["rho"], bf.rho),
        ideal_gap_db=metrics.ideal_gap_db(k_low[seg], y_al[seg]),
        cancel_before=metrics.cancel_db(k_low[seg], b_low[seg]),
        cancel_after=metrics.cancel_db(k_low[seg], y_al[seg]),
        **hit.meta,
    )


def eval_loop(kick, bass, onsets, cfg: engine.Config, ap: align.AnalysisParams, sim=None, notes=None):
    """Döngüde vuruş başına ölçütler. sim None → hizalama yok (nötr)."""
    from . import modes
    fs = cfg.fs
    k_low = dsp.lowpass4(kick, fs, cfg.analysis_fc)
    b_low = dsp.lowpass4(bass, fs, cfg.analysis_fc)
    out = engine.render(bass, cfg) if sim is None else modes.render(bass, cfg, sim)
    y_al = dsp.lowpass4(out[cfg.latency:], fs, cfg.analysis_fc)  # gerçek çıktı, analiz bandında
    rows = []
    for i, t0 in enumerate(onsets):
        st = metrics.window_stats(k_low, y_al, int(t0), fs)
        bf = metrics.brute_force(k_low, b_low, int(t0), fs, ap.d_min_ms, ap.d_max_ms, ap.auto)
        rows.append(dict(i=i, note=None if notes is None else int(notes[i]), rho=st["rho"], rho_star=bf.rho,
                         e_gap=metrics.energy_gap_db(st["ek"], st["eb"], st["rho"], bf.rho)))
    return rows
