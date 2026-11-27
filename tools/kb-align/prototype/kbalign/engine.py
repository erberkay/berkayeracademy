"""Plugin ses yolunun çevrimdışı (offline) birebir modeli.

Sinyal akışı (spec §3.1):
  bas ─┬─ LR4 LP ─→ u = low(t-Hs-B) ve v = FIR_Hilbert(low)(t-B)  (ikisi aynı hizada;
       │            B = bölümlü evrişim bloğu)
       │            y_low(o) = cosθ·u(o - D') - sinθ·v(o - D'),  D' = L + d - Hs - B
       └─ LR4 HP ─→ y_high(o) = high(o - L)
  çıkış = y_low + y_high   (crossover kapalıysa low = tüm sinyal, high = 0)

Hilbert gecikmeyle sıra değiştirebildiği için (ikisi de LTI) dönüşüm, kesirli
gecikmeden ÖNCE bir kez hesaplanır; parametre değişimi iki okuma zinciri arasında
crossfade ile yapılır. Zincirlerin durumu yoktur → geçiş anında geçici olay yok.

Zaman: "içerik zamanı" c = çıkış indeksi - L. Kick'in çıkıştaki konumu da c'dir
(host kick'i L kadar geciktirir). Parametre listesindeki zamanlar içerik zamanıdır.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy import signal

from . import dsp

# Gecikme modları (spec §3.4) — (negatif aralık ms, Hilbert yarı-boy ms, lookahead ms)
LATENCY_MODES = {
    "dusuk": (10.0, 25.0, 0.0),
    "tam": (50.0, 25.0, 0.0),
    "tam_lookahead": (50.0, 25.0, 60.0),
}
MARGIN = 4  # Lagrange okuması için güvenlik payı (örnek)
CONV_BLOCK = 128  # Hilbert FIR, C++'ta bölümlü FFT evrişimiyle: B örnek ek gecikme (sabit)


@dataclass
class Config:
    fs: float = 48000.0
    fc: float = 120.0
    crossover: bool = True
    latency_mode: str = "tam"
    xfade_ms: float = 10.0
    frac: str = "lagrange"
    hilbert_beta: float = 8.0
    hilbert_ms_override: float | None = None
    _cache: dict = field(default_factory=dict, repr=False)

    @property
    def neg_ms(self):
        return LATENCY_MODES[self.latency_mode][0]

    @property
    def hilbert_ms(self):
        if self.hilbert_ms_override is not None:
            return self.hilbert_ms_override
        return LATENCY_MODES[self.latency_mode][1]

    @property
    def lookahead_ms(self):
        return LATENCY_MODES[self.latency_mode][2]

    @property
    def hs(self) -> int:
        return int(round(self.hilbert_ms * self.fs / 1000.0))

    @property
    def latency(self) -> int:
        """Host'a bildirilen sabit gecikme (örnek)."""
        return int(round((self.neg_ms + self.lookahead_ms) * self.fs / 1000.0)) + self.hs + CONV_BLOCK + MARGIN

    @property
    def d_min_ms(self):
        return -self.neg_ms

    d_max_ms = 50.0

    def hilbert(self):
        key = ("h", self.fs, self.hilbert_ms, self.hilbert_beta)
        if key not in self._cache:
            self._cache[key] = dsp.hilbert_fir(self.fs, self.hilbert_ms, self.hilbert_beta)
        return self._cache[key]


def split(bass: np.ndarray, cfg: Config):
    if cfg.crossover:
        return dsp.lr4_split(bass, cfg.fs, cfg.fc)
    return bass.copy(), np.zeros_like(bass)


def prepare(bass: np.ndarray, cfg: Config):
    """u, v, high dizileri — ses thread'indeki halka tamponların içeriği."""
    low, high = split(bass, cfg)
    h = cfg.hilbert()
    v = np.concatenate([np.zeros(CONV_BLOCK), signal.oaconvolve(low, h)])[: len(low)]
    u = np.concatenate([np.zeros(cfg.hs + CONV_BLOCK), low])[: len(low)]
    return u, v, high


def _chain(u, v, o_idx, d_ms, th_deg, cfg: Config):
    dprime = cfg.latency + np.asarray(d_ms) * cfg.fs / 1000.0 - cfg.hs - CONV_BLOCK
    th = np.deg2rad(th_deg)
    return np.cos(th) * dsp.frac_read(u, o_idx, dprime, cfg.frac) - np.sin(th) * dsp.frac_read(v, o_idx, dprime, cfg.frac)


def render(bass: np.ndarray, cfg: Config, events=None, d_arr=None, th_arr=None, return_low=False):
    """Bas çıkışını üretir. Uzunluk len(bass) + L.

    events: [(içerik_zamanı_örnek, d_ms, θ_derece), ...] — sıralı, ilki başlangıç değeri.
            Her değişimde crossfade [c - X, c] aralığında biter (kick'ten hemen önce).
    d_arr/th_arr: içerik zamanına göre örnek başına değerler (Sürekli mod rampası).
    """
    L = cfg.latency
    n_out = len(bass) + L
    bass_p = np.concatenate([bass, np.zeros(L)])
    u, v, high = prepare(bass_p, cfg)
    o = np.arange(n_out)
    if d_arr is not None:
        c = np.clip(o - L, 0, len(d_arr) - 1)
        y_low = _chain(u, v, o, d_arr[c], th_arr[c], cfg)
    else:
        events = events or [(0, 0.0, 0.0)]
        X = max(1, int(round(cfg.xfade_ms * cfg.fs / 1000.0)))
        y_low = _chain(u, v, o, events[0][1], events[0][2], cfg)
        for (c_t, d, th) in events[1:]:
            o_end = c_t + L
            o_start = o_end - X
            if o_start >= n_out:
                continue
            new = _chain(u, v, o[max(o_start, 0):], d, th, cfg)
            seg = slice(max(o_start, 0), n_out)
            ramp = np.ones(n_out - max(o_start, 0))
            k = np.arange(len(ramp)) + (max(o_start, 0) - o_start)
            fade = k < X
            ramp[fade] = 0.5 - 0.5 * np.cos(np.pi * k[fade] / X)
            y_low[seg] = (1.0 - ramp) * y_low[seg] + ramp * new
    y_high = np.concatenate([np.zeros(L), high])[:n_out] if cfg.crossover else np.zeros(n_out)
    out = y_low + y_high
    if return_low:
        return out, y_low
    return out


def bypass(bass: np.ndarray, cfg: Config) -> np.ndarray:
    """Gecikmeyi koruyan bypass: saf L örnek gecikme."""
    return np.concatenate([np.zeros(cfg.latency), bass])
