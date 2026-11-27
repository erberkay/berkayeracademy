# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Tekrarlanabilir sentetik test setleri (sabit seed). Spec §5.1."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import signal

from . import dsp

SAMPLE_RATES = (44100, 48000, 96000, 192000)

# 5 kick karakteri: (f_başlangıç, f_bitiş, sweep τ s, genlik τ s, tık seviyesi)
KICKS = {
    "kisa": (160.0, 55.0, 0.012, 0.09, 0.3),
    "uzun": (130.0, 45.0, 0.030, 0.30, 0.2),
    "808": (65.0, 48.0, 0.040, 0.60, 0.05),
    "sert_tik": (180.0, 52.0, 0.010, 0.15, 1.0),
    "yumusak": (100.0, 50.0, 0.025, 0.16, 0.0),
}
BASS_TYPES = ("sinus", "testere", "kare", "fm")


def midi_to_hz(n):
    return 440.0 * 2.0 ** ((np.asarray(n, dtype=float) - 69.0) / 12.0)


def note_name(n: int) -> str:
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    return f"{names[n % 12]}{n // 12 - 1}"


# Bilimsel adlandırma: E0 = MIDI 16 (20,6 Hz), E1 = 28 (41,2 Hz), C3 = 48 (130,8 Hz)
NOTES_E0_C3 = list(range(16, 49))


def kick(fs, kind="kisa", length_s=0.45, rng=None):
    f0, f1, tf, ta, click = KICKS[kind]
    t = np.arange(int(length_s * fs)) / fs
    f = f1 + (f0 - f1) * np.exp(-t / tf)
    ph = 2 * np.pi * np.cumsum(f) / fs
    y = np.sin(ph) * np.exp(-t / ta)
    y *= np.minimum(1.0, t / 0.0005)  # 0,5 ms atak
    if click > 0:
        rng = rng or np.random.default_rng(0)
        nclk = int(0.004 * fs)
        noise = rng.standard_normal(nclk) * np.exp(-np.arange(nclk) / (0.0008 * fs))
        b, a = signal.butter(2, 1500, "high", fs=fs)
        y[:nclk] += click * 0.5 * signal.lfilter(b, a, noise)
    return y / np.max(np.abs(y))


def bass_tone(fs, freq, length_s, kind="sinus", phase0=0.0, attack_s=0.003, release_s=0.01, cutoff=400.0):
    n = int(round(length_s * fs))
    t = np.arange(n) / fs
    f = np.broadcast_to(np.asarray(freq, dtype=float), t.shape)
    ph = phase0 + 2 * np.pi * np.cumsum(f) / fs
    if kind == "sinus":
        y = np.sin(ph)
    elif kind == "testere":
        y = 2.0 * ((ph / (2 * np.pi)) % 1.0) - 1.0
    elif kind == "kare":
        y = np.sign(np.sin(ph))
    elif kind == "fm":
        y = np.sin(ph + 1.5 * np.sin(2 * ph))
    else:
        raise ValueError(kind)
    if kind in ("testere", "kare"):
        b, a = signal.butter(2, cutoff, "low", fs=fs)
        y = signal.lfilter(b, a, y)
    env = np.ones(n)
    na, nr = max(1, int(attack_s * fs)), max(1, int(release_s * fs))
    env[:na] = np.linspace(0, 1, na)
    env[-nr:] *= np.linspace(1, 0, nr)
    y = y * env
    return y / (np.max(np.abs(y)) + 1e-12)


def add_noise(x, snr_db, rng):
    p = np.mean(x ** 2) + 1e-20
    return x + rng.standard_normal(len(x)) * np.sqrt(p / 10 ** (snr_db / 10))


@dataclass
class Hit:
    """Tek vuruşluk test: kick + bas, bilinen bozulma."""

    fs: float
    kick: np.ndarray
    bass: np.ndarray
    onset: int  # kick onset indeksi
    true_d_ms: float | None  # bası kick'e hizalayan doğru gecikme (biliniyorsa)
    true_theta: float | None
    meta: dict


def identity_hit(fs, kind, d0_ms, th0, rng, snr_db=None, pre_s=0.1):
    """Bas = kick'in kendisi, bilinen kesirli kayma ve döndürme ile (gecikme doğruluğu testi).

    bas(t) = Re(e^{jθ0} · k_a(t - d0)) → doğru cevap d = -d0, θ = -θ0.
    """
    k = kick(fs, kind, rng=rng)
    pre = int(pre_s * fs)
    kk = np.concatenate([np.zeros(pre), k, np.zeros(pre)])
    ka = dsp.analytic(kk)
    shifted_r = dsp.delay_ideal(np.real(ka), d0_ms * fs / 1000)
    shifted_i = dsp.delay_ideal(np.imag(ka), d0_ms * fs / 1000)
    b = dsp.rotate(shifted_r, shifted_i, th0)
    b = 0.8 * b / np.max(np.abs(b))
    if snr_db is not None:
        kk = add_noise(kk, snr_db, rng)
        b = add_noise(b, snr_db, rng)
    return Hit(fs, kk, b, pre, -d0_ms, (-th0 + 180) % 360 - 180,
               dict(set="kimlik", kick=kind, d0=d0_ms, th0=th0, snr=snr_db))


def musical_hit(fs, kind, note, btype, rng, attack_off_ms=0.0, d0_ms=0.0, th0=0.0,
                snr_db=None, duck=False, pre_s=0.12, length_s=0.45):
    """Kick + bas notası: bas kick'ten attack_off kadar sonra başlar, d0/θ0 ile bozulur."""
    k = kick(fs, kind, rng=rng)
    n = int((pre_s + length_s + 0.12) * fs)
    kk = np.zeros(n)
    on = int(pre_s * fs)
    kk[on:on + len(k)] += k
    f = midi_to_hz(note)
    b_start = on + int(round(attack_off_ms * fs / 1000))
    tone = bass_tone(fs, f, length_s, btype, phase0=rng.uniform(0, 2 * np.pi))
    b = np.zeros(n)
    end = min(n, b_start + len(tone))
    if b_start < 0:
        tone = tone[-b_start:]
        b_start = 0
        end = min(n, len(tone))
    b[b_start:end] = tone[: end - b_start]
    if d0_ms or th0:
        ba = dsp.analytic(b)
        b = dsp.rotate(dsp.delay_ideal(np.real(ba), d0_ms * fs / 1000),
                       dsp.delay_ideal(np.imag(ba), d0_ms * fs / 1000), th0)
    if duck:
        b *= dsp.ducking_gain(n, fs, [on], 0.25, 0.7)
    b *= 0.7
    if snr_db is not None:
        kk = add_noise(kk, snr_db, rng)
        b = add_noise(b, snr_db, rng)
    return Hit(fs, kk, b, on, None, None,
               dict(set="muzikal", kick=kind, note=note, btype=btype, att=attack_off_ms,
                    d0=d0_ms, th0=th0, snr=snr_db, duck=duck))


def loop(fs, bpm=125.0, bars=4, notes=(33, 33, 36, 31), kind="kisa", btype="testere",
         d0_ms=0.0, th0=0.0, rng=None, retrigger_phase=True, legato=False, snr_db=None):
    """4/4 kick döngüsü + her vuruşta bas notası (nota dizisi vuruşlara döngüsel atanır).

    Synth'ler çoğunlukla notayı rastgele/sabit fazla başlatır: retrigger_phase=False
    rastgele başlangıç fazı verir → her vuruşta farklı faz ilişkisi.
    """
    rng = rng or np.random.default_rng(1)
    beat = 60.0 / bpm
    nb = bars * 4
    n = int((nb * beat + 0.6) * fs)
    kk = np.zeros(n)
    b = np.zeros(n)
    k = kick(fs, kind, rng=rng)
    onsets, hit_notes = [], []
    start = int(0.1 * fs)
    for i in range(nb):
        on = start + int(round(i * beat * fs))
        onsets.append(on)
        kk[on:on + len(k)] += k[: max(0, min(len(k), n - on))]
        note = notes[i % len(notes)]
        hit_notes.append(note)
        dur = beat * (1.0 if legato else 0.6)
        tone = bass_tone(fs, midi_to_hz(note), dur, btype,
                         phase0=0.0 if retrigger_phase else rng.uniform(0, 2 * np.pi),
                         release_s=0.002 if legato else 0.01)
        e = min(n, on + len(tone))
        b[on:e] += tone[: e - on]
    if d0_ms or th0:
        ba = dsp.analytic(b)
        b = dsp.rotate(dsp.delay_ideal(np.real(ba), d0_ms * fs / 1000),
                       dsp.delay_ideal(np.imag(ba), d0_ms * fs / 1000), th0)
    b *= 0.7
    if snr_db is not None:
        kk = add_noise(kk, snr_db, rng)
        b = add_noise(b, snr_db, rng)
    return kk, b, np.array(onsets), np.array(hit_notes)


def compatible_hit(fs, kind, rng, d0_ms=0.0, th0=0.0, snr_db=None, pre_s=0.12):
    """Uyumlu vuruş: bas, kick'in kuyruk frekansında bir sub sinüs ve kick zarfıyla söner
    (808 katmanı gibi). Kaba kuvvet korelasyonu ρ* ≥ 0,95 olabilecek tek gerçekçi durum."""
    f0, f1, tf, ta, _ = KICKS[kind]
    k = kick(fs, kind, rng=rng)
    n = int((pre_s + 0.6) * fs)
    kk = np.zeros(n)
    on = int(pre_s * fs)
    kk[on:on + len(k)] += k[: n - on]
    t = np.arange(n - on) / fs
    sub = np.sin(2 * np.pi * f1 * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / (ta * 1.3))
    sub *= np.minimum(1.0, t / 0.004)
    b = np.zeros(n)
    b[on:] = sub
    ba = dsp.analytic(b)
    b = dsp.rotate(dsp.delay_ideal(np.real(ba), d0_ms * fs / 1000), dsp.delay_ideal(np.imag(ba), d0_ms * fs / 1000), th0)
    b *= 0.7
    if snr_db is not None:
        kk = add_noise(kk, snr_db, rng)
        b = add_noise(b, snr_db, rng)
    return Hit(fs, kk, b, on, None, None, dict(set="uyumlu", kick=kind, note=-1, btype="sub", att=0.0,
                                                d0=d0_ms, th0=th0, snr=snr_db, duck=False))
