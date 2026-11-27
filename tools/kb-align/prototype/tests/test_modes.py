import numpy as np

from kbalign import align, datasets as ds, engine, evaluate, modes


def _loop(retrig):
    return ds.loop(48000, bars=3, notes=(33, 33, 36, 31), kind="kisa", btype="testere", d0_ms=3,
                   th0=70, rng=np.random.default_rng(2), retrigger_phase=retrig)


def _score(mode, retrig, lm="tam"):
    k, b, on, notes = _loop(retrig)
    cfg = engine.Config(fs=48000, latency_mode=lm)
    ap = align.AnalysisParams(d_min_ms=-10, d_max_ms=10)
    sim = modes.simulate(k, b, cfg, ap, modes.ModeParams(mode=mode), onsets=on)
    rows = evaluate.eval_loop(k, b, on, cfg, ap, sim, notes)
    return np.array([r["e_gap"] for r in rows])[8:], sim


def test_learn_donar():
    _, sim = _score("learn", True)
    assert len(sim.events) == 2  # başlangıç + öğrenilen değer, sonra sabit


def test_nota_modu_tekrar_fazli_synth_ile_sinira_ulasir():
    eg, _ = _score("note", True)
    assert np.all(eg >= -0.5)


def test_her_vurus_lookahead_ile_sinira_ulasir():
    eg, _ = _score("hit", False, "tam_lookahead")
    assert np.mean(eg >= -0.5) >= 0.85
