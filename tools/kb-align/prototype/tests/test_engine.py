import numpy as np

from kbalign import datasets as ds, dsp, engine, metrics


def _bass(fs):
    rng = np.random.default_rng(3)
    return ds.bass_tone(fs, 55.0, 0.5, "testere") + 0.1 * rng.standard_normal(int(0.5 * fs))


def test_bypass_saf_gecikme():
    for fs in (44100, 192000):
        cfg = engine.Config(fs=fs)
        b = _bass(fs)
        y = engine.bypass(b, cfg)
        assert np.array_equal(y[cfg.latency:], b)


def test_notr_crossover_kapali_null():
    for fs in (44100, 48000, 96000, 192000):
        cfg = engine.Config(fs=fs, crossover=False)
        b = _bass(fs)
        y = engine.render(b, cfg, events=[(0, 0.0, 0.0)])
        assert metrics.null_db(y, engine.bypass(b, cfg)) <= -100


def test_ust_bant_dokunulmaz():
    fs = 48000
    cfg = engine.Config(fs=fs)
    b = _bass(fs)
    _, y_low = engine.render(b, cfg, events=[(0, 7.3, 123.0)], return_low=True)
    out = engine.render(b, cfg, events=[(0, 7.3, 123.0)])
    hi = out - y_low
    _, ref_hi = dsp.lr4_split(np.concatenate([b, np.zeros(cfg.latency)]), fs, cfg.fc)
    ref = np.concatenate([np.zeros(cfg.latency), ref_hi])[:len(hi)]
    assert metrics.null_db(hi, ref) <= -100


def test_cikis_kickten_bagimsiz():
    # ses yolu kick'i hiç almaz: engine.render imzasında kick yok — kick yalnız analize gider
    import inspect
    assert "kick" not in inspect.signature(engine.render).parameters


def test_gecikme_modlari():
    fs = 48000
    for mode, (neg, hil, la) in engine.LATENCY_MODES.items():
        cfg = engine.Config(fs=fs, latency_mode=mode)
        assert cfg.latency == round((neg + la) * fs / 1000) + round(hil * fs / 1000) + engine.CONV_BLOCK + engine.MARGIN
        # en negatif kaymada bile okuma gecikmesi ≥ 3 örnek
        assert cfg.latency + cfg.d_min_ms * fs / 1000 - cfg.hs - engine.CONV_BLOCK >= 3


def test_negatif_gecikme_basi_one_alir():
    fs = 48000
    cfg = engine.Config(fs=fs, crossover=False)
    b = np.zeros(fs // 2)
    b[10000] = 1.0
    y = engine.render(b, cfg, events=[(0, -20.0, 0.0)])
    peak = np.argmax(np.abs(y)) - cfg.latency
    assert abs(peak - (10000 - 960)) <= 1
