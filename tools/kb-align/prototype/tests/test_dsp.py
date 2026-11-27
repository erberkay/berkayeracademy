import numpy as np
from scipy import signal

from kbalign import dsp


def test_lr4_toplam_genlikte_duz():
    for fs in (44100, 48000, 96000, 192000):
        for fc in (40, 120, 300):
            lp, hp = dsp.lr4_sos(fs, fc)
            w, hl = signal.sosfreqz(lp, worN=4096, fs=fs)
            _, hh = signal.sosfreqz(hp, worN=4096, fs=fs)
            dev = np.max(np.abs(20 * np.log10(np.abs(hl + hh))))
            assert dev <= 0.05, (fs, fc, dev)


def test_lagrange_tamsayi_gecikmede_kesin():
    x = np.random.default_rng(0).standard_normal(2000)
    t = np.arange(100, 1900)
    y = dsp.frac_read(x, t, 37.0)
    assert np.max(np.abs(y - x[t - 37])) < 1e-12


def test_lagrange_alt_bantta_dogru():
    fs = 48000
    rng = np.random.default_rng(1)
    x = dsp.lowpass4(rng.standard_normal(fs), fs, 300)
    for D in (5.25, 10.5, 123.77):
        t = np.arange(2000, fs - 2000)
        y = dsp.frac_read(x, t, D)
        ref = dsp.delay_ideal(x, D)[t]
        err = 20 * np.log10(np.max(np.abs(y - ref)) / np.max(np.abs(x)))
        assert err < -90, (D, err)  # ölçülen en kötü ≈ −95,7 dB (μ=0,25)


def test_hilbert_dondurme_55hz():
    fs = 48000
    h = dsp.hilbert_fir(fs, 25)
    hs = (len(h) - 1) // 2
    t = np.arange(fs) / fs
    x = np.sin(2 * np.pi * 55 * t)
    v = signal.lfilter(h, 1, x)
    u = np.concatenate([np.zeros(hs), x])[:len(x)]
    y = dsp.rotate(u, v, 90)  # sin → -H{sin} = cos → beklenen: cos(ωt) gecikmeli
    ref = np.cos(2 * np.pi * 55 * (t - hs / fs))
    s = slice(4 * hs, len(x) - 4 * hs)
    # y = -sin90·H{x} = -(-cos) = cos  (H{sin} = -cos)
    err = np.max(np.abs(y[s] - ref[s]))
    assert err < 0.01, err


def test_bass_mono_side_alt_bantta_silinir():
    fs = 48000
    t = np.arange(fs) / fs
    lo = np.sin(2 * np.pi * 40 * t)
    hi = np.sin(2 * np.pi * 2000 * t)
    L, R = lo + hi, -lo + hi  # alt bant tamamen side, üst bant mid
    l2, r2 = dsp.bass_mono(L, R, fs, 120, 0.0)
    side = 0.5 * (l2 - r2)
    s = slice(fs // 4, None)
    assert 20 * np.log10(np.max(np.abs(side[s]))) < -30
    mid = 0.5 * (l2 + r2)
    assert abs(np.max(np.abs(mid[s])) - 1.0) < 0.01


def test_ducking_egrisi_uclari():
    g = dsp.ducking_gain(48000, 48000, [0], 0.25, 1.0)
    assert g[0] == 0.0 and abs(g[int(0.25 * 48000) - 1] - 1.0) < 0.01 and g[-1] == 1.0
