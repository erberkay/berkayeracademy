"""KB-Align DSP yapı taşları (Python referansı).

Her fonksiyon C++ tarafında birebir taşınacak biçimde yazıldı: durum tutan
filtreler biquad (sos) zinciri, kesirli gecikme sabit katsayı formülleri,
Hilbert FIR açık katsayı dizisi.

Sözleşme:
  - Bas çıkışı b'(t) = b(t - d)·cosθ - H{b}(t - d)·sinθ    (d > 0 → bas geç)
  - Bu, analitik sinyalde Re(e^{jθ} · b_a(t - d)) ile aynıdır.
"""
from __future__ import annotations

import numpy as np
from scipy import signal

# ─────────────────────────────── Crossover (LR4)

def lr4_sos(fs: float, fc: float):
    """Linkwitz–Riley 4. derece: iki ardışık 2. derece Butterworth.

    Döner: (lp_sos, hp_sos). LP + HP toplamı genlikte düz 2. derece tüm-geçiren.
    """
    lp = signal.butter(2, fc, "low", fs=fs, output="sos")
    hp = signal.butter(2, fc, "high", fs=fs, output="sos")
    return np.vstack([lp, lp]), np.vstack([hp, hp])


def lr4_split(x: np.ndarray, fs: float, fc: float):
    lp, hp = lr4_sos(fs, fc)
    return signal.sosfilt(lp, x), signal.sosfilt(hp, x)


def lowpass4(x: np.ndarray, fs: float, fc: float):
    """Analiz ve görüntü için alt bant: LR4'ün LP yarısı (sesle aynı)."""
    return signal.sosfilt(lr4_sos(fs, fc)[0], x)


# ─────────────────────────────── Kesirli gecikme

LAGRANGE_NODES = np.arange(-2, 4)  # 6 nokta, 5. derece; değerlendirme 0 ≤ μ < 1


def lagrange_weights(mu: np.ndarray) -> np.ndarray:
    """5. derece Lagrange ağırlıkları. mu: (...,) → (..., 6).

    y(t - m - μ) = Σ_j w_j(μ) · x[t - m - j],  j ∈ {-2,-1,0,1,2,3}
    """
    mu = np.asarray(mu, dtype=np.float64)[..., None]
    nodes = LAGRANGE_NODES.astype(np.float64)
    w = np.ones(mu.shape[:-1] + (6,))
    for k in range(6):
        for i in range(6):
            if i != k:
                w[..., k] *= (mu[..., 0] - nodes[i]) / (nodes[k] - nodes[i])
    return w


def sinc_weights(mu: np.ndarray, half: int = 16, beta: float = 8.0) -> np.ndarray:
    """Kaiser pencereli sinc, 2·half nokta (j = -half+1 … half)."""
    mu = np.asarray(mu, dtype=np.float64)[..., None]
    j = np.arange(-half + 1, half + 1, dtype=np.float64)
    t = mu - j
    # sürekli Kaiser penceresi: I0(β√(1-(t/half)²))/I0(β)
    arg = np.clip(1.0 - (t / half) ** 2, 0.0, None)
    return np.sinc(t) * np.i0(beta * np.sqrt(arg)) / np.i0(beta)


def frac_read(x: np.ndarray, t: np.ndarray, delay: np.ndarray, method: str = "lagrange") -> np.ndarray:
    """x dizisinden (t - delay) anlarını okur. t tamsayı indeks dizisi, delay ≥ 3 örnek.

    Ses yolundaki halka tampon okumasının birebir karşılığı.
    """
    t = np.asarray(t)
    delay = np.broadcast_to(np.asarray(delay, dtype=np.float64), t.shape)
    m = np.floor(delay).astype(np.int64)
    mu = delay - m
    if method == "lagrange":
        nodes, w = LAGRANGE_NODES, lagrange_weights(mu)
    elif method == "sinc":
        nodes, w = np.arange(-15, 17), sinc_weights(mu)
    else:
        raise ValueError(method)
    idx = (t - m)[..., None] - nodes[None, :]
    valid = (idx >= 0) & (idx < len(x))
    vals = np.where(valid, x[np.clip(idx, 0, len(x) - 1)], 0.0)
    return np.sum(vals * w, axis=-1)


def delay_ideal(x: np.ndarray, delay_samples: float) -> np.ndarray:
    """FFT ile ideal (bant sınırlı) kesirli gecikme — yalnız referans/test için."""
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(n + abs(delay_samples) + 64)))
    X = np.fft.rfft(x, nfft)
    f = np.fft.rfftfreq(nfft)
    y = np.fft.irfft(X * np.exp(-2j * np.pi * f * delay_samples), nfft)
    return y[:n]


# ─────────────────────────────── Hilbert / faz döndürme

def hilbert_fir(fs: float, half_ms: float, beta: float = 8.0) -> np.ndarray:
    """Doğrusal fazlı (tip III) FIR Hilbert, Kaiser pencereli ideal yanıt.

    Uzunluk 2·Hs+1, grup gecikmesi Hs = round(half_ms·fs/1000) örnek.
    """
    hs = int(round(half_ms * fs / 1000.0))
    n = np.arange(-hs, hs + 1)
    h = np.zeros(2 * hs + 1)
    odd = n % 2 != 0
    h[odd] = 2.0 / (np.pi * n[odd])
    return h * np.kaiser(2 * hs + 1, beta)


def hilbert_ideal(x: np.ndarray) -> np.ndarray:
    """FFT ile ideal Hilbert (teorik sınır için)."""
    return np.imag(signal.hilbert(x))


def analytic(x: np.ndarray) -> np.ndarray:
    return signal.hilbert(x)


def rotate(x: np.ndarray, hx: np.ndarray, theta_deg) -> np.ndarray:
    th = np.deg2rad(theta_deg)
    return x * np.cos(th) - hx * np.sin(th)


# ─────────────────────────────── Bass Mono

def bass_mono(left: np.ndarray, right: np.ndarray, fs: float, fc: float, width: float = 0.0):
    """fc altındaki side bileşenini width ile ölçekler (0 = tam mono)."""
    mid = 0.5 * (left + right)
    side = 0.5 * (left - right)
    s_lo, s_hi = lr4_split(side, fs, fc)
    m_lo, m_hi = lr4_split(mid, fs, fc)
    # mid de aynı tüm-geçirenden geçmeli ki M ve S fazca hizalı kalsın
    mid2 = m_lo + m_hi
    side2 = s_hi + width * s_lo
    return mid2 + side2, mid2 - side2


# ─────────────────────────────── Ducking zarfı

# VARSAYIM: kullanıcının çizdiği eğri gelene kadar yer tutucu.
# (zaman 0..1, kazanç 0..1, eğrilik −1..+1) — eğrilik segmentin şeklini verir.
PLACEHOLDER_CURVE = [
    (0.00, 0.00, 0.0),
    (0.04, 0.00, 0.0),
    (0.35, 0.85, -0.5),
    (1.00, 1.00, 0.0),
]


def curve_eval(points, u: np.ndarray) -> np.ndarray:
    """Kırılma noktalı eğri: her segmentte üs biçimli geçiş (Ableton benzeri tension)."""
    u = np.clip(np.asarray(u, dtype=np.float64), 0.0, 1.0)
    out = np.ones_like(u)
    for (t0, g0, _), (t1, g1, c) in zip(points[:-1], points[1:]):
        sel = (u >= t0) & (u <= t1)
        if t1 <= t0:
            continue
        p = (u[sel] - t0) / (t1 - t0)
        k = 2.0 ** (4.0 * c)  # c=0 doğrusal, c<0 hızlı başlar, c>0 yavaş başlar
        out[sel] = g0 + (g1 - g0) * p ** k
    return out


def ducking_gain(n: int, fs: float, triggers, length_s: float, depth: float, points=PLACEHOLDER_CURVE):
    """Her tetikte (örnek indeksi) eğriyi length_s boyunca oynatır. depth 0..1."""
    g = np.ones(n)
    for i, t in enumerate(triggers):
        end = min(n, t + int(round(length_s * fs)))
        if i + 1 < len(triggers):
            end = min(end, triggers[i + 1])
        idx = np.arange(t, end)
        cur = curve_eval(points, (idx - t) / (length_s * fs))
        g[t:end] = 1.0 - depth * (1.0 - cur)
    return g
