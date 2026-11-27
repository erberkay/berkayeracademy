"""Hizalama analizi: onset tespiti + karmaşık çapraz korelasyonla (d, θ).

Model (dsp-yontemleri.md §0, §1.3):
  b'(t) = Re(e^{jθ} b_a(t - d))
  Σ k·b'  ≈ ½·Re(e^{-jθ} c(d)),   c(d) = Σ_w k_a(t)·conj(b_a(t - d))
  → θ* = arg c(d),  en iyi çapraz terim = ½|c(d)|

Hedef fonksiyon NORMALİZE KORELASYONDUR: ρ(d) = |c(d)| / √(E_k · E_b(d)).
Ham toplam enerji ya da ham çapraz terim, bası kaydırıp pencereye daha çok bas
enerjisi sokarak da büyür (faz uyumu olmadan) ve kick'in kendisiyle bile
sıfırdan farklı bir gecikme verir. Bkz. rapor "hedef fonksiyon" bölümü.

Analiz alt bantta (LR4 LP, fc), desimasyonlu hızda (fa ≈ 3 kHz) yapılır.
Aynı LTI filtre hem kick'e hem basa uygulandığından bağıl hizalama değişmez.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import signal

from . import dsp

FA_TARGET = 3000.0
INTERP_HALF = 16  # örnek altı ara değerleme: ±16 komşu, Kaiser-sinc


@dataclass
class AnalysisParams:
    win_start_ms: float = 0.0  # pencere onset'te başlar (ölçüm penceresiyle aynı; −5 ms korelasyonu bozuyordu)
    win_ms: float = 150.0
    d_min_ms: float = -10.0  # varsayılan otomatik arama aralığı ±10 ms (rapor: ±50 bası ritimden kaydırabiliyor)
    d_max_ms: float = 10.0
    auto: str = "both"  # "both" | "delay" | "phase"
    ambiguity_tol: float = 0.005  # en iyi korelasyonun %0,5'i içindeki adaylardan en küçük |d|


@dataclass
class HitResult:
    d_ms: float
    theta: float
    xcorr: float  # ulaşılan ½|c| (çapraz terim, alt bant, desimasyonlu ölçek)
    rho: float  # analitik normalize korelasyon (0..1) — güven
    lags: np.ndarray  # tamsayı gecikmeler (fa örnek)
    c: np.ndarray  # karmaşık korelasyon (normalize)
    norm: float
    seg: tuple = None  # (kick penceresi, bas segmenti, j0, E_k) — kesin inceltme için


def analytic_pow2(x: np.ndarray) -> np.ndarray:
    """Analitik sinyal, 2'nin kuvveti FFT ile (C++ ile birebir aynı)."""
    n = 1 << int(np.ceil(np.log2(len(x))))
    return signal.hilbert(x, N=n)[:len(x)]


def make_exact(segs):
    """Kesirli gecikmede KESİN normalize korelasyon (bas segmenti FFT ile kaydırılır).

    Birden çok vuruş verilirse ortalama alınır (Learn / nota tablosu birleşik hedefi).
    """
    pre = []
    for kw, ba, j0, ek in segs:
        n = len(ba)
        nfft = 1 << int(np.ceil(np.log2(n)))
        B = np.fft.fft(ba, nfft)
        f = np.fft.fftfreq(nfft)
        pre.append((kw, B, f, j0, ek, len(kw)))

    def exact(tau: float) -> complex:
        acc = 0j
        for kw, B, f, j0, ek, W in pre:
            bs = np.fft.ifft(B * np.exp(-2j * np.pi * f * tau))[j0:j0 + W]
            acc += np.vdot(bs, kw) / (np.sqrt(ek * np.sum(np.abs(bs) ** 2)) + 1e-30)
        return acc / len(pre)

    return exact


class Analyzer:
    def __init__(self, fs: float, fc: float = 120.0, fa_target: float = FA_TARGET):
        self.fs = float(fs)
        self.fc = fc
        self.M = max(1, int(round(fs / fa_target)))
        self.fa = self.fs / self.M
        ntap = 8 * self.M + 1
        self.taps = signal.firwin(ntap, 0.4 * self.fa, fs=self.fs) if self.M > 1 else np.array([1.0])
        self.gd = (len(self.taps) - 1) // 2

    # ─── desimasyon: z[i] ≈ x[start + i·M]  (FIR merkezli, grup gecikmesi telafili)
    def decimate(self, x: np.ndarray, start: int, count: int) -> np.ndarray:
        """z[i] = Σ_k h[k]·x[start + i·M + gd - k]; dizi dışı örnekler sıfır."""
        lo = start - self.gd
        hi = start + (count - 1) * self.M + self.gd + 1
        buf = np.zeros(hi - lo)
        a, b = max(lo, 0), min(hi, len(x))
        if b > a:
            buf[a - lo:b - lo] = x[a:b]
        y = np.convolve(buf, self.taps, mode="valid")  # y[n] ↔ merkez lo + gd + n
        return y[::self.M][:count]

    def hit(self, k_low: np.ndarray, b_low: np.ndarray, onset: int, p: AnalysisParams,
            avail_ms: float | None = None) -> HitResult:
        """avail_ms: onset'ten sonra gerçek zamanda görülebilen süre — sonrası sıfır sayılır
        (Her vuruşta modunun nedenselliği). None → kayıt tamamen mevcut (Learn / tablo)."""
        fa = self.fa
        if avail_ms is not None:
            end = onset + int(np.floor(avail_ms * self.fs / 1000))
            k_low = k_low[:max(0, end)]
            b_low = b_low[:max(0, end)]
        ws = int(round(p.win_start_ms * fa / 1000))
        W = int(round(p.win_ms * fa / 1000))
        tmin = int(np.floor(p.d_min_ms * fa / 1000)) - INTERP_HALF - 1
        tmax = int(np.ceil(p.d_max_ms * fa / 1000)) + INTERP_HALF + 1
        pad = 256
        # segment (desimasyonlu indeks): kick penceresi [j0, j0+W), bas [j0 - tmax, j0 + W - tmin)
        seg_start = -tmax - pad + ws  # onset'e göre
        seg_len = W + (tmax - tmin) + 2 * pad
        full_start = onset + seg_start * self.M
        k_d = self.decimate(k_low, full_start, seg_len)
        b_d = self.decimate(b_low, full_start, seg_len)
        ka = analytic_pow2(k_d)
        ba = analytic_pow2(b_d)
        j0 = tmax + pad  # pencerenin segment içindeki başlangıcı
        kw = ka[j0:j0 + W]
        lags = np.arange(tmin, tmax + 1)
        # c[τ] = Σ_j kw[j] conj(ba[j0 + j - τ])
        c = np.array([np.vdot(ba[j0 - t:j0 - t + W], kw) for t in lags])
        ek = np.sum(np.abs(kw) ** 2)
        eb = np.array([np.sum(np.abs(ba[j0 - t:j0 - t + W]) ** 2) for t in lags])
        # normalize korelasyon (gecikme başına): pencereye giren bas enerjisi değişse de yansız
        cn = c / (np.sqrt(ek * eb) + 1e-30)
        valid = eb >= 0.3 * eb.max()  # bas pencereden kaçmışsa aday sayma
        exact = make_exact([(kw, ba, j0, ek)])
        d_ms, th, val = pick(lags, cn, fa, p, valid, exact)
        tau = d_ms * fa / 1000
        ebt = float(np.interp(tau, lags, eb))
        norm = float(np.sqrt(ek * ebt))
        rho = val
        return HitResult(d_ms, th, 0.5 * val * norm, float(min(1.0, rho)), lags, np.where(valid, cn, 0), norm,
                         (kw, ba, j0, ek))


def interp_c(lags: np.ndarray, c: np.ndarray, tau: float) -> complex:
    """Kaiser-sinc ile tamsayı gecikmeler arasında bant sınırlı ara değerleme."""
    i0 = int(np.floor(tau)) - lags[0]
    mu = tau - np.floor(tau)
    j = np.arange(-INTERP_HALF + 1, INTERP_HALF + 1)
    idx = i0 + j
    ok = (idx >= 0) & (idx < len(c))
    t = mu - j
    w = np.sinc(t) * np.i0(8.0 * np.sqrt(np.clip(1 - (t / INTERP_HALF) ** 2, 0, None))) / np.i0(8.0)
    return complex(np.sum(c[np.clip(idx, 0, len(c) - 1)] * w * ok))


def _obj(z: complex, auto: str) -> float:
    return abs(z) if auto == "both" else z.real


def pick(lags: np.ndarray, c: np.ndarray, fa: float, p: AnalysisParams, valid=None, exact=None):
    """Aday seçimi + örnek altı inceltme. Döner (d_ms, θ°, amaç değeri).

    exact: kesirli τ → normalize korelasyon (yoksa tamsayı gecikmeler arası sinc ara değerleme).
    """
    ev = exact if exact is not None else (lambda t: interp_c(lags, c, t))
    if p.auto == "phase":
        z = ev(0.0)
        return 0.0, float(np.degrees(np.angle(z))), abs(z)
    lo = p.d_min_ms * fa / 1000
    hi = p.d_max_ms * fa / 1000
    sel = (lags >= np.ceil(lo)) & (lags <= np.floor(hi))
    if valid is not None:
        sel &= valid
    L, C = lags[sel], c[sel]
    obj = np.abs(C) if p.auto == "both" else C.real
    # yerel tepeler (uçlar dahil)
    peaks = [i for i in range(len(obj))
             if (i == 0 or obj[i] >= obj[i - 1]) and (i == len(obj) - 1 or obj[i] >= obj[i + 1])]
    best = max(obj[i] for i in peaks)
    refined = []
    for i in peaks:
        if obj[i] < best * (1 - 3 * p.ambiguity_tol) or obj[i] <= 0:
            continue
        refined.append(_refine(ev, float(L[i]), lo, hi, p.auto))
    vmax = max(v for _, v in refined)
    cands = [(t, v) for t, v in refined if v >= vmax * (1 - p.ambiguity_tol)]
    tau, val = min(cands, key=lambda tv: (abs(tv[0]), -tv[1]))
    z = ev(tau)
    th = float(np.degrees(np.angle(z))) if p.auto == "both" else 0.0
    return tau * 1000 / fa, th, _obj(z, p.auto)


def _refine(ev, t0, lo, hi, auto, iters=40):
    """Altın oran araması [t0-1, t0+1] (sınırlar içinde)."""
    a, b = max(lo, t0 - 1.0), min(hi, t0 + 1.0)
    g = (np.sqrt(5) - 1) / 2
    f = lambda t: -_obj(ev(t), auto)
    x1, x2 = b - g * (b - a), a + g * (b - a)
    f1, f2 = f(x1), f(x2)
    for _ in range(iters):
        if f1 < f2:
            b, x2, f2 = x2, x1, f1
            x1 = b - g * (b - a)
            f1 = f(x1)
        else:
            a, x1, f1 = x1, x2, f2
            x2 = a + g * (b - a)
            f2 = f(x2)
    t = 0.5 * (a + b)
    return t, -f(t)


# ─────────────────────────────── Onset (kick'e özel, alt bant zarf)

@dataclass
class OnsetParams:
    trig_hz: float = 150.0  # tetik bandı (ayarlanabilir — davul bus'ı için)
    fast_attack_ms: float = 0.3
    fast_release_ms: float = 8.0
    slow_ms: float = 60.0  # yavaş zarf (tek kutuplu, simetrik)
    ratio_db: float = 6.0  # tetik: hızlı zarf yavaşın bu kadar üstünde
    rearm_db: float = 1.0  # yeniden kurulma: hızlı zarf yavaşın en çok bu kadar üstüne inmeli
    abs_db: float = -45.0  # kapı: bunun altındaki sinyal tetiklemez
    rel_db: float = -30.0  # son 2 s'nin tepesine göre alt sınır
    hold_ms: float = 60.0


def detect_onsets(kick: np.ndarray, fs: float, p: OnsetParams = OnsetParams()):
    """Nedensel tetik: hızlı/yavaş zarf oranı (üst üste binen kuyruklarda da çalışır).

    Ses thread'inde örnek örnek çalışan algoritmanın birebiri. Tetikten sonra hızlı zarf
    yavaş zarfa yaklaşana (rearm_db) kadar yeniden tetik yok. Onset, tetik anından geriye
    doğru hızlı zarfın kesintisiz yükselişinin başladığı örneğe çekilir (≤ 10 ms) —
    üst üste binen bir önceki kuyruk azalırken yeni vuruş yükseliş başlatır.
    """
    b, a = signal.butter(2, p.trig_hz, "low", fs=fs)
    x = np.abs(signal.lfilter(b, a, kick))
    ga = np.exp(-1.0 / (p.fast_attack_ms * fs / 1000))
    gr = np.exp(-1.0 / (p.fast_release_ms * fs / 1000))
    gs = np.exp(-1.0 / (p.slow_ms * fs / 1000))
    ratio = 10 ** (p.ratio_db / 20)
    thr_abs = 10 ** (p.abs_db / 20)
    rel = 10 ** (p.rel_db / 20)
    pk_decay = np.exp(-1.0 / (2.0 * fs))
    hold = int(p.hold_ms * fs / 1000)
    back = int(0.010 * fs)
    fast = slow = peak = 0.0
    last = -hold
    armed = True
    rearm = 10 ** (p.rearm_db / 20)
    hist_f = np.zeros(back + 1)  # son 10 ms'nin hızlı ve yavaş zarfı (halka tampon)
    hist_s = np.zeros(back + 1)
    out = []
    for i, v in enumerate(x):
        g = ga if v > fast else gr
        fast = g * fast + (1 - g) * v
        slow = gs * slow + (1 - gs) * v
        peak = max(peak * pk_decay, fast)
        hist_f[i % (back + 1)] = fast
        hist_s[i % (back + 1)] = slow
        if not armed and i - last >= hold and fast <= rearm * slow:
            armed = True
        if armed and i - last >= hold and fast > max(thr_abs, rel * peak) and fast > ratio * slow:
            armed = False
            last = i
            o = i
            # geriye: zarf yükselişinin başladığı yere (önceki kuyruk azalıyordu)
            nxt_f = fast
            for k in range(1, back + 1):
                j = (i - k) % (back + 1)
                if i - k < 0 or hist_f[j] >= nxt_f:
                    break
                nxt_f = hist_f[j]
                o = i - k
            out.append(o)
    return np.array(out, dtype=int)
