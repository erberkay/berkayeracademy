# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Gerçek kick ve bas loop'larında KB-Align ölçümü.

Kullanım (Mac/Linux, prototype/ klasöründen):
    pip3 install -r requirements.txt
    python3 -I gercek_olcum.py KICK.wav BAS1.wav [BAS2.wav ...] [--cikti klasor] [--fc 120] [--arama 10]

- Kick ve bas loop'ları aynı tempoda ve 1. vuruştan başlıyor kabul edilir (DAW'da alt alta dizilmiş gibi).
  Kısa olan uzun olanın boyuna döngüyle uzatılır. Stereo → mono. Örnekleme hızları farklıysa kick'inkine çevrilir.
- Her bas için dört durum ölçülür: hizalama yok · Learn · Nota başına · Her vuruşta (Tam + lookahead).
- Ölçüm her kick vuruşunda 150 ms, alt bantta (LR4 fc): korelasyon, kick+bas toplam enerjisi, tepe;
  ayrıca kaba kuvvetle o vuruşta ulaşılabilecek en iyi korelasyon (sınır).
- Çıktı: rapor.md + grafik + her mod için hizalanmış bas WAV'ı (gecikmesi çıkarılmış, aynı uzunlukta;
  DAW'da orijinal basın yerine koyup kulakla karşılaştırabilirsin). Kick'e dokunulmaz.
"""
from __future__ import annotations

import argparse
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from scipy import signal  # noqa: E402

from kbalign import align, dsp, engine, metrics, modes  # noqa: E402

MODES = [("yok", None, "tam"), ("learn", "learn", "tam"), ("nota", "note", "tam"), ("her_vurus", "hit", "tam_lookahead")]
MODE_TR = {"yok": "Hizalama yok", "learn": "Learn (sabit)", "nota": "Nota başına", "her_vurus": "Her vuruşta (Tam+LA)"}


def load_mono(path, fs_target=None):
    x, fs = sf.read(path, always_2d=True)
    x = x.mean(axis=1)
    if fs_target and fs != fs_target:
        g = np.gcd(int(fs), int(fs_target))
        x = signal.resample_poly(x, int(fs_target) // g, int(fs) // g)
        fs = fs_target
    return x.astype(np.float64), int(fs)


def tile(x, n):
    if len(x) >= n:
        return x[:n]
    return np.tile(x, int(np.ceil(n / len(x))))[:n]


def measure(kick, bass, fs, fc, search, out_dir, stem):
    k_low = dsp.lowpass4(kick, fs, fc)
    b_low = dsp.lowpass4(bass, fs, fc)
    onsets = align.detect_onsets(kick, fs)
    W = int(0.150 * fs)
    onsets = onsets[onsets + W < len(kick)]
    ap = align.AnalysisParams(d_min_ms=-search, d_max_ms=search)
    # vuruş başına sınır (kaba kuvvet, ±arama)
    limits = [metrics.brute_force(k_low, b_low, int(t), fs, -search, search).rho for t in onsets]
    res = {}
    for name, mode, lm in MODES:
        cfg = engine.Config(fs=fs, fc=fc, latency_mode=lm)
        if mode is None:
            out, y_low = engine.render(bass, cfg, return_low=True)
            sim = None
        else:
            sim = modes.simulate(kick, bass, cfg, ap, modes.ModeParams(mode=mode), onsets=onsets)
            out, y_low = modes.render(bass, cfg, sim, return_low=True)
        L = cfg.latency
        y_al = y_low[L:L + len(bass)]
        full = out[L:L + len(bass)]
        rows = []
        for t in onsets:
            st = metrics.window_stats(k_low, y_al, int(t), fs)
            seg = slice(int(t), int(t) + W)
            rows.append(dict(rho=st["rho"], e_sum=st["e_sum"], peak=float(np.max(np.abs(k_low[seg] + y_al[seg]))),
                             cancel=metrics.cancel_db(k_low[seg], y_al[seg])))
        applied = [(int(c), float(d), float(th)) for c, d, th in (sim.events[1:] if sim else [])]
        res[name] = dict(rows=rows, applied=applied, y_al=y_al)
        if mode is not None:
            sf.write(os.path.join(out_dir, f"{stem}__kbalign_{name}.wav"), full.astype(np.float32), fs, subtype="PCM_24")
    return onsets, np.array(limits), res


def summarize(onsets, limits, res, skip):
    base = res["yok"]["rows"]
    out = {}
    for name in res:
        rows = res[name]["rows"]
        s = slice(skip, None)
        rho = np.array([r["rho"] for r in rows])[s]
        gain = np.array([10 * np.log10(r["e_sum"] / (b["e_sum"] + 1e-30)) for r, b in zip(rows, base)])[s]
        pk = np.array([20 * np.log10(r["peak"] / (b["peak"] + 1e-30)) for r, b in zip(rows, base)])[s]
        canc = np.array([r["cancel"] for r in rows])[s]
        lim = limits[s]
        out[name] = dict(rho=rho.mean(), rho_lim=lim.mean(), gap=float(np.mean(lim - rho)), gain=gain.mean(),
                         gain_max=gain.max() if len(gain) else 0, gain_min=gain.min() if len(gain) else 0,
                         peak=pk.mean(), cancel=canc.mean(), n=len(rho))
    return out


def plot(kick_low, res, onsets, fs, path, best_i):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    t0 = int(onsets[best_i])
    n = int(0.12 * fs)
    tt = np.arange(n) / fs * 1000
    fig, ax = plt.subplots(2, 1, figsize=(10, 6), sharex=True)
    for a, name in zip(ax, ("yok", "nota")):
        y = res[name]["y_al"][t0:t0 + n]
        k = kick_low[t0:t0 + n]
        a.plot(tt, k, color="#e69f00", lw=1.8, label="kick (alt bant)")
        a.plot(tt, y, color="#56b4e9", lw=1.6, ls="--", label="bas (alt bant)")
        a.plot(tt, k + y, color="#555", lw=1.0, ls=":", label="toplam")
        a.set_title(MODE_TR[name] + f" — vuruş {best_i + 1}")
        a.legend(loc="upper right", fontsize=8)
        a.grid(alpha=0.2)
    ax[-1].set_xlabel("ms (kick vuruşundan sonra)")
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("kick")
    p.add_argument("bas", nargs="+")
    p.add_argument("--cikti", default=None)
    p.add_argument("--fc", type=float, default=120.0, help="crossover / alt bant frekansı (Hz)")
    p.add_argument("--arama", type=float, default=10.0, help="otomatik arama aralığı ± ms")
    a = p.parse_args()
    out_dir = a.cikti or os.path.join(os.getcwd(), "kbalign-olcum-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
    os.makedirs(out_dir, exist_ok=True)
    kick0, fs = load_mono(a.kick)
    lines = [f"# KB-Align — gerçek loop ölçümü\n", f"Kick: `{os.path.basename(a.kick)}` · {fs} Hz · alt bant {a.fc:.0f} Hz · arama ±{a.arama:g} ms\n",
             "Ölçüm: her kick vuruşunda 150 ms, alt bantta. Learn'ün ilk 8 vuruşu (öğrenme) özetten çıkarıldı (her modda aynı vuruşlar).",
             "**Sınır** = o vuruşta (d, θ) ile ulaşılabilecek en yüksek korelasyon (kaba kuvvet). "
             "**Toplam enerji** = kick + bas alt bant enerjisinin hizalamasız duruma göre değişimi.\n"]
    for bp in a.bas:
        bass0, _ = load_mono(bp, fs)
        n = max(len(kick0), len(bass0))
        kick, bass = tile(kick0, n), tile(bass0, n)
        stem = os.path.splitext(os.path.basename(bp))[0]
        print(f"ölçülüyor: {stem} ({n / fs:.1f} s)", flush=True)
        onsets, limits, res = measure(kick, bass, fs, a.fc, a.arama, out_dir, stem)
        if len(onsets) < 2:
            lines.append(f"## {stem}\n\nKick vuruşu bulunamadı (onset {len(onsets)}). Kick dosyası doğru mu?\n")
            continue
        skip = min(8, max(0, len(onsets) - 2))
        sm = summarize(onsets, limits, res, skip)
        lines.append(f"## {stem}\n")
        lines.append(f"Vuruş: {len(onsets)} (özette {sm['yok']['n']}). Vuruşta ulaşılabilecek korelasyon (sınır) ortalaması: **{sm['yok']['rho_lim']:.2f}**.\n")
        lines.append("| durum | korelasyon | sınıra uzaklık | toplam enerji (ort.) | en iyi / en kötü vuruş | tepe | iptal ölçer |\n|---|---|---|---|---|---|---|")
        for name in res:
            s = sm[name]
            lines.append(f"| {MODE_TR[name]} | {s['rho']:+.2f} | {s['gap']:.3f} | {s['gain']:+.2f} dB | {s['gain_max']:+.2f} / {s['gain_min']:+.2f} dB | "
                         f"{s['peak']:+.2f} dB | {s['cancel']:+.2f} dB |")
        ap_ = res["learn"]["applied"]
        if ap_:
            lines.append(f"\nLearn'ün bulduğu: d = {ap_[-1][1]:+.3f} ms, θ = {ap_[-1][2] % 360:.1f}°.")
        best = max(range(len(onsets)), key=lambda i: res["nota"]["rows"][i]["e_sum"] / (res["yok"]["rows"][i]["e_sum"] + 1e-30))
        png = f"{stem}__grafik.png"
        plot(dsp.lowpass4(kick, fs, a.fc), res, onsets, fs, os.path.join(out_dir, png), best)
        lines.append(f"\n![{stem}]({png})\n\nDinle: `{stem}__kbalign_learn.wav`, `{stem}__kbalign_nota.wav`, `{stem}__kbalign_her_vurus.wav` "
                     "(orijinal basın yerine koy; kick aynı kalır).\n")
    with open(os.path.join(out_dir, "rapor.md"), "w") as f:
        f.write("\n".join(lines) + "\n")
    print("rapor:", os.path.join(out_dir, "rapor.md"))


if __name__ == "__main__":
    main()
