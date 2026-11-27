# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Bas notası tespiti — YIN (de Cheveigné & Kawahara 2002), desimasyonlu hızda.

Nota anahtarı MIDI numarası (bilimsel adlandırma: E1 = 28 = 41,2 Hz).
Pencere ihtiyacı ≈ 2 periyot: E0 ~97 ms, E1 ~49 ms (dsp-yontemleri.md §7).
"""
from __future__ import annotations

import numpy as np


def yin(x: np.ndarray, fa: float, fmin: float = 19.0, fmax: float = 400.0, thr: float = 0.15):
    """Döner (f0 Hz | None, belirsizlik 0..1). x en az 2·fa/fmin örnek olmalı."""
    tmax = int(np.ceil(fa / fmin))
    tmin = max(2, int(np.floor(fa / fmax)))
    W = len(x) - tmax
    if W < tmax // 2 or np.max(np.abs(x)) < 1e-6:
        return None, 1.0
    d = np.array([np.sum((x[:W] - x[t:t + W]) ** 2) for t in range(tmax + 1)])
    cmnd = np.ones_like(d)
    cs = np.cumsum(d[1:])
    cmnd[1:] = d[1:] * np.arange(1, tmax + 1) / (cs + 1e-30)
    tau = None
    for t in range(tmin, tmax):
        if cmnd[t] < thr:
            while t + 1 < tmax and cmnd[t + 1] < cmnd[t]:
                t += 1
            tau = t
            break
    if tau is None:
        tau = tmin + int(np.argmin(cmnd[tmin:tmax]))
        if cmnd[tau] > 0.5:
            return None, float(cmnd[tau])
    # parabolik inceltme
    if 1 <= tau < tmax:
        a, b, c = cmnd[tau - 1], cmnd[tau], cmnd[tau + 1]
        den = a - 2 * b + c
        off = 0.5 * (a - c) / den if abs(den) > 1e-12 else 0.0
    else:
        off = 0.0
    off = float(np.clip(off, -1.0, 1.0))
    if tau + off <= 0:
        off = 0.0
    return fa / (tau + off), float(cmnd[tau])


def hz_to_midi(f: float) -> int:
    return int(round(69 + 12 * np.log2(f / 440.0)))


def detect_note(bass_dec: np.ndarray, fa: float, fmin: float = 19.0):
    f0, ap = yin(bass_dec, fa, fmin=fmin)
    if f0 is None:
        return None, ap
    return hz_to_midi(f0), ap
