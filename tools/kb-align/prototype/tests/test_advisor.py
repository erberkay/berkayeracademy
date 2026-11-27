# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Danışman (kbalign.advisor): retrigger tespiti, akort önerisinin sınırları, ducking kuralı."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np  # noqa: E402

from kbalign import advisor, datasets as ds  # noqa: E402

FS = 48000


def _loop(kind, bt, notes, retrig=True, seed=3):
    kk, b, on, _ = ds.loop(FS, 125, 4, notes, kind, bt, rng=np.random.default_rng(seed), retrigger_phase=retrig,
                           d0_ms=2.0, th0=70)
    return advisor.advise(kk, b, FS, onsets=on)


def test_retrigger_detection():
    on = _loop("kisa", "testere", (33, 33, 36, 31), True)
    off = _loop("kisa", "testere", (33, 33, 36, 31), False)
    assert on.retrig == "tutarli" and on.retrig_R > 0.95
    assert off.retrig == "serbest" and off.retrig_R < 0.5
    assert off.mode == "her_vurus" and on.mode == "nota"


def test_tuning_bounded_and_safe():
    for kind, bt, notes in (("yumusak", "sinus", (31,)), ("kisa", "testere", (29, 29, 29, 36)), ("uzun", "kare", (28, 28, 31, 26))):
        A = _loop(kind, bt, notes)
        assert abs(A.tune_st) <= advisor.MAX_ST
        if A.tune_st:
            assert A.tune_gain - A.tune_gain0 >= advisor.MIN_GAIN_DB
            assert A.tune_worst >= advisor.WORST_DB
            # yön: kick'i bas notasına doğru
            assert np.sign(A.tune_st) == np.sign(A.tune_far_st)


def test_kick_measures():
    A = _loop("808", "sinus", (33,))
    assert abs(A.kick_hz - 50) < 4          # 808: 65 → 48 Hz süpürme, pencerede ~50 Hz
    assert A.kick_body_ms > 300              # uzun 808 gövdesi
    B = _loop("kisa", "sinus", (33,))
    assert B.kick_body_ms < 200


def test_no_duck_when_bass_far_above():
    A = _loop("sert_tik", "fm", (45, 48, 43, 45))  # A2..C3: kick'in çok üstünde
    assert not A.duck
