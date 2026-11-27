# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""C++ sayısal eşleşme testleri için referans verileri üretir → plugin/tests/parity/.

Çalıştırma: python3 -I export_parity.py   (prototype/ klasöründen)
Biçim: her dizi ham float64 (little-endian) .f64 dosyası; manifest.json skalerleri ve olay listelerini tutar.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402

from kbalign import advisor, align, datasets as ds, dsp, engine, modes, pitch  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "plugin", "tests", "parity")
os.makedirs(OUT, exist_ok=True)
man = {}


def save(name, arr):
    np.asarray(arr, dtype="<f8").tofile(os.path.join(OUT, name + ".f64"))
    man.setdefault("arrays", {})[name] = int(np.asarray(arr).size)


fs = 48000
rng = np.random.default_rng(42)
x = rng.standard_normal(fs // 2)
save("x", x)
lp, hp = dsp.lr4_split(x, fs, 120.0)
save("lr4_lp", lp)
save("lr4_hp", hp)
xl = dsp.lowpass4(rng.standard_normal(fs // 2), fs, 300)
save("xl", xl)
t = np.arange(1000, fs // 2 - 1000)
man["frac_delays"] = [3.0, 5.25, 40.5, 123.77, 999.999]
for i, D in enumerate(man["frac_delays"]):
    save(f"frac_{i}", dsp.frac_read(xl, t, D))
h = dsp.hilbert_fir(fs, 25.0)
save("hilbert", h)
v = np.concatenate([np.zeros(engine.CONV_BLOCK), signal.oaconvolve(xl, h)])[: len(xl)]
save("conv", v)

# ses yolu: olaylarla render (mono, crossover açık)
b = ds.bass_tone(fs, 55.0, 1.2, "testere") + 0.05 * rng.standard_normal(int(1.2 * fs))
save("bass", b)
for lm in ("dusuk", "tam", "tam_lookahead"):
    cfg = engine.Config(fs=fs, latency_mode=lm)
    ev = [(0, 0.0, 0.0), (int(0.2 * fs), 3.7, 40.0), (int(0.5 * fs), -6.2, 200.0), (int(0.9 * fs), 1.1, -30.0)]
    if lm == "dusuk":
        ev[2] = (ev[2][0], -6.2, 200.0)
    out = engine.render(b, cfg, events=ev)
    save(f"render_{lm}", out)
    man[f"render_{lm}"] = dict(latency=cfg.latency, events=ev)
cfg = engine.Config(fs=fs, crossover=False)
save("render_noxover", engine.render(b, cfg, events=[(0, 2.5, 77.0)]))
man["render_noxover"] = dict(latency=cfg.latency, events=[(0, 2.5, 77.0)])

# analiz
an = align.Analyzer(fs)
hits = []
for i, (kind, d0, th0) in enumerate([("kisa", 3.3, 40.0), ("808", -7.1, 200.0), ("sert_tik", 12.0, 300.0)]):
    hh = ds.identity_hit(fs, kind, d0, th0, rng)
    kl, bl = dsp.lowpass4(hh.kick, fs, 120), dsp.lowpass4(hh.bass, fs, 120)
    save(f"hit{i}_k", kl)
    save(f"hit{i}_b", bl)
    r = an.hit(kl, bl, hh.onset, align.AnalysisParams(d_min_ms=-50, d_max_ms=50))
    hits.append(dict(onset=hh.onset, d=r.d_ms, th=r.theta, rho=r.rho, dmin=-50, dmax=50))
mh = ds.musical_hit(fs, "uzun", 33, "testere", rng, d0_ms=4, th0=100)
kl, bl = dsp.lowpass4(mh.kick, fs, 120), dsp.lowpass4(mh.bass, fs, 120)
save("hit3_k", kl)
save("hit3_b", bl)
r = an.hit(kl, bl, mh.onset, align.AnalysisParams())
hits.append(dict(onset=mh.onset, d=r.d_ms, th=r.theta, rho=r.rho, dmin=-10, dmax=10))
r = an.hit(kl, bl, mh.onset, align.AnalysisParams(), avail_ms=40.0)
hits.append(dict(onset=mh.onset, d=r.d_ms, th=r.theta, rho=r.rho, dmin=-10, dmax=10, avail_ms=40.0, src=3))
man["hits"] = hits
man["decim"] = dict(M=an.M, fa=an.fa, ntap=len(an.taps))
save("decim_taps", an.taps)

# onset + nota
k, bb, on, notes = ds.loop(fs, bpm=128, bars=2, kind="808", btype="kare", rng=np.random.default_rng(2), snr_db=60)
save("loop_k", k)
save("loop_b", bb)
man["onsets"] = [int(o) for o in align.detect_onsets(k, fs)]
pn = []
for note in (28, 33, 40, 47):
    xx = ds.bass_tone(fs, ds.midi_to_hz(note), 0.2, "fm")
    save(f"pitch_{note}", xx)
    got, _ = pitch.detect_note(an.decimate(xx, 0, int(0.1 * an.fa)), an.fa)
    pn.append(dict(note=note, got=got))
man["pitch"] = pn

# modlar: Learn ve Nota (gerçek zamanlı C++ motoru ile karşılaştırılır)
k2, b2, on2, notes2 = ds.loop(fs, bars=3, notes=(33, 33, 36, 31), kind="kisa", btype="testere", d0_ms=3,
                              th0=70, rng=np.random.default_rng(2), retrigger_phase=True)
save("mloop_k", k2)
save("mloop_b", b2)
cfgm = engine.Config(fs=fs)
apm = align.AnalysisParams(d_min_ms=-10, d_max_ms=10)
res = {}
for m in ("learn", "note", "hit"):
    sim = modes.simulate(k2, b2, cfgm, apm, modes.ModeParams(mode=m))
    res[m] = [(int(c), float(d), float(th)) for c, d, th in sim.events]
man["modes"] = res

# Danışman (advisor.py): üç döngü — retrigger açık/kapalı, akort önerisi
RT = {"belirsiz": 0, "tutarli": 1, "serbest": 2}
MD = {"": 0, "nota": 1, "learn": 2, "her_vurus": 3}
adv = []
for i, (kind, bt, notes, rt) in enumerate((("kisa", "testere", (29, 29, 29, 36), True),
                                           ("kisa", "testere", (33, 33, 36, 31), False),
                                           ("yumusak", "sinus", (31,), True))):
    ka, ba, _, _ = ds.loop(fs, 125, 4, notes, kind, bt, rng=np.random.default_rng(3), retrigger_phase=rt, d0_ms=2.0, th0=70)
    ka = np.concatenate([ka, np.zeros(fs)]); ba = np.concatenate([ba, np.zeros(fs)])
    save(f"adv{i}_k", ka)
    save(f"adv{i}_b", ba)
    A = advisor.advise(ka, ba, fs)
    adv.append(dict(hits=A.hits, kick_hz=A.kick_hz, body=A.kick_body_ms, top=A.top_note, R=float(A.retrig_R), rt=RT[A.retrig],
                    tune=A.tune_st, g0=A.tune_gain0, g=A.tune_gain, duck=A.duck, mode=MD[A.mode]))
man["advisor"] = adv
with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(man, f, indent=1)
print("yazıldı:", OUT)

# C++ testlerinin okuyacağı beklenen değerler (JSON ayrıştırıcıya gerek kalmasın)
LMI = {"dusuk": 0, "tam": 1, "tam_lookahead": 2}
with open(os.path.join(OUT, "expected.inc"), "w") as f:
    f.write("// export_parity.py tarafından üretildi — elle düzenleme\n")
    f.write("static const double kFracDelays[] = {%s};\n" % ", ".join(repr(d) for d in man["frac_delays"]))
    f.write("static const RenderCase kRenderCases[] = {\n")
    for name in ("render_dusuk", "render_tam", "render_tam_lookahead", "render_noxover"):
        lm = name.split("_", 1)[1]
        mi = LMI.get(lm, 1)
        xo = "false" if lm == "noxover" else "true"
        ev = ", ".join("{%d, %r, %r}" % (c, d, th) for c, d, th in man[name]["events"])
        f.write('  {"%s", %d, %d, %s, {%s}},\n' % (name, man[name]["latency"], mi, xo, ev))
    f.write("};\n")
    f.write("static const HitCase kHitCases[] = {\n")
    for i, h in enumerate(man["hits"]):
        src = h.get("src", i)
        f.write("  {%d, %d, %r, %r, %r, %r, %r, %r},\n" % (src, h["onset"], float(h["d"]), float(h["th"]), float(h["rho"]),
                                                    float(h["dmin"]), float(h["dmax"]), float(h.get("avail_ms", -1.0))))
    f.write("};\n")
    f.write("static const long long kOnsets[] = {%s};\n" % ", ".join(str(o) for o in man["onsets"]))
    f.write("static const int kPitch[][2] = {%s};\n" % ", ".join("{%d, %d}" % (p["note"], -1 if p["got"] is None else p["got"]) for p in man["pitch"]))
    for m in ("learn", "note", "hit"):
        f.write("static const ParamEvent kMode_%s[] = {%s};\n" % (m, ", ".join("{%d, %r, %r}" % (c, float(d), float(t)) for c, d, t in man["modes"][m])))
    f.write("struct AdvCase { int hits; double kickHz, body; int top; double R; int rt; double tune, g0, g; bool duck; int mode; };\n")
    f.write("static const AdvCase kAdv[] = {%s};\n" % ", ".join(
        "{%d, %r, %r, %d, %r, %d, %r, %r, %r, %s, %d}" % (a["hits"], a["kick_hz"], a["body"], a["top"], a["R"], a["rt"], a["tune"],
                                                         a["g0"], a["g"], "true" if a["duck"] else "false", a["mode"]) for a in man["advisor"]))
print("expected.inc yazıldı")
