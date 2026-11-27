import numpy as np

from kbalign import align, datasets as ds, dsp, metrics


def _est(h, ap=None):
    an = align.Analyzer(h.fs)
    return an.hit(dsp.lowpass4(h.kick, h.fs, 120), dsp.lowpass4(h.bass, h.fs, 120), h.onset,
                  ap or align.AnalysisParams(d_min_ms=-50, d_max_ms=50))


def test_kimlik_gecikme_dogrulugu():
    rng = np.random.default_rng(11)
    for fs in (44100, 48000, 96000, 192000):
        for kind in ds.KICKS:
            d0, th0 = rng.uniform(-20, 20), rng.uniform(0, 360)
            h = ds.identity_hit(fs, kind, d0, th0, rng)
            r = _est(h)
            assert abs(r.d_ms - h.true_d_ms) <= 0.1, (fs, kind, r.d_ms, h.true_d_ms)
            assert abs((r.theta - h.true_theta + 180) % 360 - 180) <= 3.0


def test_yalniz_faz_modu():
    rng = np.random.default_rng(12)
    h = ds.identity_hit(48000, "kisa", 0.0, 77.0, rng)
    r = _est(h, align.AnalysisParams(auto="phase"))
    assert r.d_ms == 0.0 and abs((r.theta + 77 + 180) % 360 - 180) < 2


def test_yalniz_gecikme_modu():
    rng = np.random.default_rng(13)
    h = ds.identity_hit(48000, "sert_tik", 6.2, 0.0, rng)
    r = _est(h, align.AnalysisParams(auto="delay"))
    assert r.theta == 0.0 and abs(r.d_ms + 6.2) < 0.1


def test_kaba_kuvvet_kimlikte_bire_ulasir():
    rng = np.random.default_rng(14)
    h = ds.identity_hit(48000, "uzun", 4.0, 30.0, rng)
    bf = metrics.brute_force(dsp.lowpass4(h.kick, 48000, 120), dsp.lowpass4(h.bass, 48000, 120), h.onset, 48000)
    assert bf.rho > 0.999 and abs(bf.d_ms + 4.0) < 0.05


def test_onset_dongude():
    for fs in (48000, 96000):
        for kind in ds.KICKS:
            k, b, on, _ = ds.loop(fs, bpm=125, bars=2, kind=kind, rng=np.random.default_rng(2), snr_db=40)
            det = align.detect_onsets(k, fs)
            assert len(det) == len(on) and np.max(np.abs(det - on)) < 0.003 * fs


def test_nota_tespiti():
    from kbalign import pitch
    fs = 48000
    an = align.Analyzer(fs)
    for note in (28, 33, 36, 40, 45):
        for btype in ds.BASS_TYPES:
            x = ds.bass_tone(fs, ds.midi_to_hz(note), 0.2, btype)
            got, _ = pitch.detect_note(an.decimate(x, 0, int(0.1 * an.fa)), an.fa)
            assert got == note, (note, btype, got)
