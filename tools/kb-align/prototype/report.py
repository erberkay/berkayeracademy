# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Berkay Er — KB-Align. Lisans: LICENSE (GNU AGPL v3 ya da sonrası).
"""Aşama 3 raporu: tüm ölçütleri sentetik setlerde ölçer, rapor/ozet.md + grafikler yazar.

Çalıştırma:  python3 -I report.py   (prototype/ klasöründen; ~10 dk, 4 çekirdek)
"""
from __future__ import annotations

import json
import os
import sys
import time
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402

from kbalign import align, datasets as ds, dsp, engine, evaluate, metrics, modes, pitch  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rapor")
SEED = 20261127


def _f(v):
    return float(v) if isinstance(v, (np.floating, float, int, np.integer)) else v


# ─────────────────────────────── A. kimlik seti (ölçüt 3)

def job_identity(args):
    fs, kind, i, snr = args
    rng = np.random.default_rng([SEED, fs, i, list(ds.KICKS).index(kind), 0 if snr is None else snr])
    d0, th0 = rng.uniform(-20, 20), rng.uniform(0, 360)
    h = ds.identity_hit(fs, kind, d0, th0, rng, snr_db=snr)
    r = evaluate.eval_hit(h, engine.Config(fs=fs))
    return {k: _f(v) for k, v in r.items()} | dict(fs=fs)


# ─────────────────────────────── B. müzikal set (ölçüt 1, 2)

def job_musical(args):
    fs, i, search = args
    rng = np.random.default_rng([SEED, fs, i, 7, int(search)])
    kind = list(ds.KICKS)[rng.integers(5)]
    btype = ds.BASS_TYPES[rng.integers(4)]
    note = int(rng.choice([16, 21, 24, 28, 31, 33, 36, 38, 40, 43, 45, 48]))
    snr = [None, 60, 40, 20][rng.integers(4)]
    h = ds.musical_hit(fs, kind, note, btype, rng, attack_off_ms=float(rng.choice([0, 0, 8, 20, -15])),
                       d0_ms=rng.uniform(-8, 8), th0=rng.uniform(0, 360), snr_db=snr, duck=bool(rng.integers(2)))
    cfg = engine.Config(fs=fs)
    ap = align.AnalysisParams(d_min_ms=-search, d_max_ms=search)
    r = evaluate.eval_hit(h, cfg, ap)
    return {k: _f(v) for k, v in r.items()} | dict(fs=fs, search=search)


def job_compatible(args):
    fs, i = args
    rng = np.random.default_rng([SEED, fs, i, 9])
    kind = list(ds.KICKS)[i % 5]
    h = ds.compatible_hit(fs, kind, rng, d0_ms=rng.uniform(-8, 8), th0=rng.uniform(0, 360),
                          snr_db=[None, 60, 40][i % 3])
    ap = align.AnalysisParams(d_min_ms=-10, d_max_ms=10)
    r = evaluate.eval_hit(h, engine.Config(fs=fs), ap)
    return {k: _f(v) for k, v in r.items()} | dict(fs=fs, search=10.0)


# ─────────────────────────────── G. modlar

SCEN = {
    "nota_degisir_faz_sabit": dict(notes=(33, 33, 36, 31), retrigger_phase=True),
    "nota_degisir_faz_serbest": dict(notes=(33, 33, 36, 31), retrigger_phase=False),
    "tek_nota": dict(notes=(33,), retrigger_phase=True),
    "genis_aralik_E1_C3": dict(notes=(28, 40, 35, 48), retrigger_phase=True),
}


def job_mode(args):
    scen, kind, btype, mode, lm = args
    fs = 48000
    k, b, on, notes = ds.loop(fs, bars=4, kind=kind, btype=btype, d0_ms=3.0, th0=70.0,
                              rng=np.random.default_rng([SEED, list(SCEN).index(scen), list(ds.KICKS).index(kind)]), **SCEN[scen])
    cfg = engine.Config(fs=fs, latency_mode=lm)
    ap = align.AnalysisParams(d_min_ms=-10, d_max_ms=10)
    sim = None if mode == "yok" else modes.simulate(k, b, cfg, ap, modes.ModeParams(mode=mode))  # onset'ler tespit edilir
    rows = evaluate.eval_loop(k, b, on, cfg, ap, sim, notes)
    s = slice(8, None)  # ilk 8 vuruş: Learn öğrenme süresi — tüm modlar aynı aralıkta ölçülür
    eg = np.array([r["e_gap"] for r in rows])[s]
    rh = np.array([r["rho"] for r in rows])[s]
    rs = np.array([r["rho_star"] for r in rows])[s]
    return dict(scen=scen, kind=kind, btype=btype, mode=mode, lm=lm, egap=float(eg.mean()),
                egap_min=float(eg.min()), pass_frac=float(np.mean(eg >= -0.5)), rho=float(rh.mean()),
                rho_star=float(rs.mean()), latency_ms=cfg.latency / fs * 1000)


# ─────────────────────────────── yardımcı ölçümler

def measure_fracdelay():
    fs = 48000
    rng = np.random.default_rng(SEED)
    out = {}
    x_lo = dsp.lowpass4(rng.standard_normal(fs), fs, 300)
    x_fb = rng.standard_normal(fs)
    x_fb = signal.sosfilt(signal.butter(8, 18000, fs=fs, output="sos"), x_fb)
    t = np.arange(3000, fs - 3000)
    for m in ("lagrange", "sinc"):
        row = {}
        for name, x in (("alt_bant", x_lo), ("tum_bant_18k", x_fb)):
            worst = -999
            for mu in (0.1, 0.25, 0.5, 0.75, 0.9):
                D = 40 + mu
                err = dsp.frac_read(x, t, D, m) - dsp.delay_ideal(x, D)[t]
                worst = max(worst, 20 * np.log10(np.max(np.abs(err)) / np.max(np.abs(x))))
            row[name] = worst
        row["carpma_ornek"] = 6 if m == "lagrange" else 32
        out[m] = row
    return out


def measure_hilbert():
    rows = []
    for half in (10, 15, 25, 35, 50):
        h = dsp.hilbert_fir(48000, half)
        w, H = signal.freqz(h, worN=np.array([20.6, 27.5, 30.9, 41.2, 55.0, 82.4, 120.0]), fs=48000)
        # rotasyon hatası θ=90°: |1-|H|| (genlik), faz tip III'te tam 90°
        rows.append(dict(half_ms=half, **{f"{f:.1f}": float(20 * np.log10(abs(v))) for f, v in zip(w, H)}))
    return rows


def measure_nulls():
    res = {}
    rng = np.random.default_rng(SEED)
    for fs in ds.SAMPLE_RATES:
        b = ds.bass_tone(fs, 55.0, 0.5, "testere") + 0.1 * rng.standard_normal(int(0.5 * fs))
        cfg = engine.Config(fs=fs, crossover=False)
        y = engine.render(b, cfg, events=[(0, 0.0, 0.0)])
        cfg2 = engine.Config(fs=fs)
        out, y_low = engine.render(b, cfg2, events=[(0, 7.3, 123.0)], return_low=True)
        _, ref_hi = dsp.lr4_split(np.concatenate([b, np.zeros(cfg2.latency)]), fs, cfg2.fc)
        ref = np.concatenate([np.zeros(cfg2.latency), ref_hi])[:len(out)]
        res[fs] = dict(notr_xover_kapali=metrics.null_db(y, engine.bypass(b, cfg)),
                       ust_bant=metrics.null_db(out - y_low, ref),
                       bypass=metrics.null_db(engine.bypass(b, cfg), np.concatenate([np.zeros(cfg.latency), b])))
    lr = {}
    for fs in ds.SAMPLE_RATES:
        dev = 0
        for fc in (40, 120, 300):
            lp, hp = dsp.lr4_sos(fs, fc)
            _, hl = signal.sosfreqz(lp, worN=8192, fs=fs)
            _, hh = signal.sosfreqz(hp, worN=8192, fs=fs)
            dev = max(dev, float(np.max(np.abs(20 * np.log10(np.abs(hl + hh))))))
        lr[fs] = dev
    return res, lr


def measure_click():
    fs = 48000
    b = ds.bass_tone(fs, 45.0, 1.0, "testere")
    cfg = engine.Config(fs=fs, crossover=False)
    ref = engine.render(b, cfg, events=[(0, 0.0, 0.0)])
    out = {}
    for xf in (0.02, 2.0, 10.0, 20.0):
        c2 = engine.Config(fs=fs, crossover=False, xfade_ms=xf)
        y = engine.render(b, c2, events=[(0, 0.0, 0.0), (int(0.5 * fs), 4.0, 150.0)])
        seg = slice(c2.latency + int(0.45 * fs), c2.latency + int(0.55 * fs))
        out[xf] = metrics.click_metric(y[seg], ref[seg], fs)
    return out


def measure_objective_example():
    """Ham enerji maksimumu vs normalize korelasyon: bas, kick'ten 20 ms sonra başlıyor."""
    fs = 48000
    rng = np.random.default_rng(5)
    h = ds.musical_hit(fs, "kisa", 33, "sinus", rng, attack_off_ms=20)
    k = dsp.lowpass4(h.kick, fs, 120)
    b = dsp.lowpass4(h.bass, fs, 120)
    W = int(0.15 * fs)
    best_e, best_r = (-1, None), (-1, None)
    hb = dsp.hilbert_ideal(b)
    for d in np.arange(-50, 50.01, 0.25):
        sh = int(round(d * fs / 1000))
        bs = np.roll(b, sh)
        hs = np.roll(hb, sh)
        for th in np.arange(0, 360, 5):
            y = dsp.rotate(bs, hs, th)[h.onset:h.onset + W]
            kk = k[h.onset:h.onset + W]
            e = np.sum((kk + y) ** 2)
            r = np.sum(kk * y) / np.sqrt(np.sum(kk ** 2) * np.sum(y ** 2))
            if e > best_e[0]:
                best_e = (e, (d, th, r))
            if r > best_r[0]:
                best_r = (r, (d, th))
    return dict(ham_enerji_d=best_e[1][0], ham_enerji_rho=best_e[1][2], korelasyon_d=best_r[1][0],
                korelasyon_rho=best_r[0])


def measure_pitch():
    rows = []
    for lm in ("tam", "tam_lookahead"):
        cfg = engine.Config(fs=48000, latency_mode=lm)
        an = align.Analyzer(48000)
        budget = cfg.latency / 48 - cfg.xfade_ms - 1 - modes.RT_MARGIN_MS
        fmin = max(19.0, 1.15 * 2000 / budget)
        ok = tot = 0
        lowest_ok = None
        for note in range(16, 49):
            good = 0
            for btype in ds.BASS_TYPES:
                x = ds.bass_tone(48000, ds.midi_to_hz(note), 0.3, btype, phase0=1.0)
                got, _ = pitch.detect_note(an.decimate(x, 0, int(budget * an.fa / 1000)), an.fa, fmin=fmin)
                good += got == note
                ok += got == note
                tot += 1
            if good == 4 and lowest_ok is None:
                lowest_ok = note
        rows.append(dict(lm=lm, pencere_ms=budget, fmin=fmin, dogru=ok / tot, en_dusuk_tam_dogru=ds.note_name(lowest_ok)))
    return rows


def learn_consistency():
    out = []
    for fs in (48000, 192000):
        ds_ = []
        for rep in range(6):
            rng = np.random.default_rng([SEED, rep, fs])
            an = align.Analyzer(fs)
            segs, lags = [], None
            for i in range(8):
                h = ds.identity_hit(fs, "kisa", 6.37, 40.0, rng, snr_db=40)
                r = an.hit(dsp.lowpass4(h.kick, fs, 120), dsp.lowpass4(h.bass, fs, 120), h.onset, align.AnalysisParams())
                segs.append(r.seg)
                lags = r.lags
            exact = align.make_exact(segs)
            cs = np.array([exact(float(t)) for t in lags])
            d, th, v = align.pick(lags, cs, an.fa, align.AnalysisParams(), None, exact)
            ds_.append(d)
        out.append(dict(fs=fs, std_ms=float(np.std(ds_)), ort_hata_ms=float(np.mean(ds_) + 6.37)))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    jobs_a = [(fs, kind, i, snr) for fs in ds.SAMPLE_RATES for kind in ds.KICKS for i in range(8) for snr in (None, 60, 40)]
    jobs_b = [(fs, i, 10.0) for fs in ds.SAMPLE_RATES for i in range(120)] + [(48000, i, 50.0) for i in range(60)]
    jobs_g = [(sc, kind, bt, m, lm) for sc in SCEN for kind, bt in (("kisa", "testere"), ("808", "sinus"), ("uzun", "fm"))
              for m in ("yok", "learn", "hit", "note", "cont") for lm in ("tam", "tam_lookahead")
              if not (m in ("yok", "learn", "cont") and lm == "tam_lookahead")]
    with Pool(4) as pool:
        A = pool.map(job_identity, jobs_a, chunksize=4)
        print(f"A bitti {time.time()-t0:.0f}s", flush=True)
        B = pool.map(job_musical, jobs_b, chunksize=4)
        C = pool.map(job_compatible, [(fs, i) for fs in ds.SAMPLE_RATES for i in range(30)], chunksize=4)
        print(f"B bitti {time.time()-t0:.0f}s", flush=True)
        G = pool.map(job_mode, jobs_g, chunksize=1)
        print(f"G bitti {time.time()-t0:.0f}s", flush=True)
    extra = dict(frac=measure_fracdelay(), hilbert=measure_hilbert(), nulls=measure_nulls(), click=measure_click(),
                 objective=measure_objective_example(), pitch=measure_pitch(), learn=learn_consistency())
    with open(os.path.join(OUT, "sonuclar.json"), "w") as f:
        json.dump(dict(A=A, B=B, C=C, G=G, extra=extra), f, default=str, indent=1)
    write_report(A, B, C, G, extra, time.time() - t0)


def _crit_rho(r, floor=0.0):
    """Ölçüt 2. floor > 0: ρ* küçükken göreli %2 yerine mutlak taban (öneri, rapor §ölçüt 2)."""
    if r["rho_star"] >= 0.95:
        return r["rho_ach"] >= 0.95
    return r["rho_ach"] >= 0.98 * r["rho_star"] or (floor > 0 and r["rho_ach"] >= r["rho_star"] - floor)


def write_report(A, B, C, G, extra, secs):
    L = []
    w = L.append
    w("# Aşama 3 — Python algoritma kanıtı: rapor\n")
    w(f"Üretim: `python3 -I report.py` · süre {secs/60:.1f} dk · seed {SEED} · ham sonuçlar `sonuclar.json`.\n")
    w("Bütün sinyaller sentetik (talimat §5.1). Gerçek kick/bas stem'leri henüz yok — kullanıcıdan bekleniyor.\n")

    # ölçüt 3
    derr = np.array([abs(r["d_err"]) for r in A])
    th_err = np.array([abs((r["th_est"] - r["th_true"] + 180) % 360 - 180) for r in A])
    w("## Ölçüt 3 — gecikme hatası ≤ 0,1 ms (kimlik seti)\n")
    w(f"Bas = kick'in bilinen kesirli kayma (±20 ms) ve döndürme (0–360°) uygulanmış kopyası; {len(A)} vuruş "
      "(4 örnekleme hızı × 5 kick × 8 rastgele × gürültüsüz/60/40 dB).\n")
    w("| fs | n | en kötü (ms) | %95 (ms) | ort. (ms) | θ en kötü (°) | geçen |\n|---|---|---|---|---|---|---|")
    for fs in ds.SAMPLE_RATES:
        sel = np.array([r["fs"] == fs for r in A])
        e = derr[sel]
        w(f"| {fs} | {sel.sum()} | {e.max():.4f} | {np.percentile(e, 95):.4f} | {e.mean():.4f} | {th_err[sel].max():.2f} | {np.mean(e <= 0.1)*100:.1f} % |")
    for snr in (None, 60, 40):
        sel = np.array([r["snr"] == snr for r in A])
        w(f"\n- Gürültü {snr or 'yok'}: en kötü {derr[sel].max():.4f} ms, %95 {np.percentile(derr[sel], 95):.4f} ms.")
    w(f"\n**Sonuç: {np.mean(derr <= 0.1)*100:.1f} % geçti** (hedef ≥ %98).\n")
    lc = extra["learn"]
    w("Learn tutarlılığı (8 vuruş, 40 dB gürültü, 6 tekrar): " + ", ".join(
        f"{r['fs']} Hz: sapma {r['std_ms']:.4f} ms, ortalama hata {r['ort_hata_ms']:+.4f} ms" for r in lc) +
      " — hedef ≤ 0,05 ms.\n")

    # ölçüt 1-2
    def table_b(rows, title):
        w(f"### {title}\n")
        eg = np.array([r["e_gap_db"] for r in rows])
        cr = np.array([_crit_rho(r) for r in rows])
        uy = np.array([r["rho_star"] >= 0.95 for r in rows])
        w(f"- Vuruş: {len(rows)} · enerji ölçütü (≥ −0,5 dB) geçen: **{np.mean(eg >= -0.5)*100:.1f} %** · "
          f"en kötü {eg.min():.3f} dB · ortalama {eg.mean():.4f} dB")
        w(f"- Korelasyon ölçütü geçen: **{np.mean(cr)*100:.1f} %** · uyumlu (ρ* ≥ 0,95) vuruş: {uy.sum()}, "
          f"bunlarda ρ ≥ 0,95: {np.mean([r['rho_ach'] >= 0.95 for r, u in zip(rows, uy) if u])*100 if uy.any() else float('nan'):.1f} %")
        cr2 = np.array([_crit_rho(r, 0.005) for r in rows])
        dr = np.array([r["rho_ach"] - r["rho_star"] for r in rows])
        w(f"- Korelasyon, mutlak 0,005 tabanıyla (ρ ≥ 0,98·ρ* **veya** ρ ≥ ρ* − 0,005): **{np.mean(cr2)*100:.1f} %** · "
          f"en kötü ρ − ρ* = {dr.min():+.4f}")
        w(f"- Ölçüt 1 ve 2 birlikte: yalnız göreli **{np.mean((eg >= -0.5) & cr)*100:.1f} %**, tabanlı **{np.mean((eg >= -0.5) & cr2)*100:.1f} %**")
        canc = np.array([r["cancel_after"] - r["cancel_before"] for r in rows])
        w(f"- İptal ölçer, hizalama öncesi→sonrası ortalama değişim: {canc.mean():+.2f} dB "
          f"(en kötü {canc.min():+.2f}, en iyi {canc.max():+.2f})")
        ig = np.array([r["ideal_gap_db"] for r in rows])
        w(f"- Bilgi: ideal (frekans başına faz) sınıra göre ortalama {ig.mean():.2f} dB, en kötü {ig.min():.2f} dB\n")
        bad = [r for r in rows if not (r["e_gap_db"] >= -0.5 and _crit_rho(r, 0.005))]
        if bad:
            w("Tabanlı ölçütü de geçmeyen vuruşlar:\n")
            w("| kick | bas | nota | gürültü | duck | ρ | ρ* | enerji farkı dB | d / d* (ms) |\n|---|---|---|---|---|---|---|---|---|")
            for r in bad[:15]:
                w(f"| {r['kick']} | {r['btype']} | {ds.note_name(int(r['note']))} | {r['snr']} | {r['duck']} | {r['rho_ach']:.3f} | "
                  f"{r['rho_star']:.3f} | {r['e_gap_db']:.2f} | {r['d_est']:.2f} / {r['d_star']:.2f} |")
            w("")

    w("## Ölçüt 1 ve 2 — enerji ve korelasyon (müzikal set)\n")
    w("Kick + bas notası (E0–C3, 4 bas tipi), rastgele kayma ±8 ms ve faz, bas atağı −15…+20 ms, "
      "gürültü yok/60/40/20 dB, rastgele ducking. Teorik sınır: tam örnekleme hızında kaba kuvvet "
      "(tamsayı gecikmeler + 0,01 ms kübik inceltme, θ 1°).\n")
    table_b([r for r in B if r["search"] == 10.0], "Varsayılan arama aralığı ±10 ms (4 örnekleme hızı)")
    table_b([r for r in B if r["search"] == 50.0], "Geniş arama aralığı ±50 ms (48 kHz)")
    table_b(C, "Uyumlu set: bas = kick kuyruk frekansında sönen sub (808 katmanı), ±10 ms")
    rA = np.array([r["rho_ach"] for r in A])
    w(f"**Korelasyon ≥ 0,95 dalı:** müzikal ve uyumlu setlerde kaba kuvvet sınırı bile 0,95'e ulaşmıyor "
      f"(ρ* en çok {max(r['rho_star'] for r in B + C):.3f}): kick'in perde süpürmesi sabit perdeli bir basla 150 ms "
      f"boyunca aynı dalga biçimini paylaşamaz. 0,95 dalı yalnız kimlik setinde (bas = kick kopyası) geçerli: "
      f"orada ulaşılan korelasyon en az **{rA.min():.4f}**, %{np.mean(rA >= 0.95)*100:.1f} vuruşta ≥ 0,95.\n")

    w("## Ölçüt 4 — kick transient'i değişmez (null testleri)\n")
    nulls, lr = extra["nulls"]
    w("| fs | bypass | nötr, crossover kapalı | üst bant (d=7,3 ms, θ=123°) | LR4 toplam sapma (dB) |\n|---|---|---|---|---|")
    for fs in ds.SAMPLE_RATES:
        n = nulls[fs]
        w(f"| {fs} | {n['bypass']:.0f} dBFS | {n['notr_xover_kapali']:.0f} dBFS | {n['ust_bant']:.0f} dBFS | {lr[fs]:.4f} |")
    w("\n- Kick ses yoluna hiç girmez: `engine.render` kick almaz (testte imzadan doğrulanır); C++'ta da sidechain "
      "yalnız analiz FIFO'suna yazılır.\n- −300 dBFS civarı değerler bit düzeyinde eşitlik demektir.\n")

    w("## Ek kalite ölçütleri\n")
    ck = extra["click"]
    w("**Tıklama** (45 Hz testere, ani d=4 ms / θ=150° değişimi; 2 kHz üstü fark tepesi / referans): " + ", ".join(
        f"crossfade {k} ms → {v:+.1f} dB" for k, v in ck.items()) + ". 0,02 ms ≈ ani geçiş.\n")
    fr = extra["frac"]
    w("**Kesirli gecikme** (ideal FFT gecikmesine göre en kötü hata, μ ∈ {0,1…0,9}):\n")
    w("| yöntem | alt bant (≤300 Hz) | tüm bant (≤18 kHz) | çarpma/örnek |\n|---|---|---|---|")
    for m, r in fr.items():
        w(f"| {m} | {r['alt_bant']:.1f} dB | {r['tum_bant_18k']:.1f} dB | {r['carpma_ornek']} |")
    w("\nSeçim: **Lagrange 5. derece** — alt bantta yeterli, 5 kat ucuz. Crossover kapalı (tüm bant) modunda yüksek "
      "frekans hatası görünür; o mod için sinc seçeneği C++'ta parametre olarak kalır.\n")
    w("**Hilbert FIR yarı-boyu** (Kaiser β=8, 48 kHz; θ=90°'de genlik hatası, dB):\n")
    hb = extra["hilbert"]
    keys = [k for k in hb[0] if k != "half_ms"]
    w("| yarı-boy | " + " | ".join(f"{k} Hz" for k in keys) + " |\n|---|" + "---|" * len(keys))
    for r in hb:
        w(f"| {r['half_ms']} ms | " + " | ".join(f"{r[k]:+.2f}" for k in keys) + " |")
    w("\nSeçim: **25 ms** (41 Hz'te −0,1 dB'nin altı). E0 (20,6 Hz) için 35–50 ms gerekir; E0 vuruşları raporda ayrı izlenir.\n")

    w("## Hedef fonksiyon: neden ham enerji değil, normalize korelasyon\n")
    ob = extra["objective"]
    w(f"Bas, kick'ten 20 ms sonra başlıyor (A1 sinüs). Ham toplam enerjiyi en büyüten kayma **d = {ob['ham_enerji_d']:.2f} ms** "
      f"(korelasyon {ob['ham_enerji_rho']:.3f}); normalize korelasyonu en büyüten **d = {ob['korelasyon_d']:.2f} ms** "
      f"(korelasyon {ob['korelasyon_rho']:.3f}). Ham enerji, bası kaydırıp pencereye daha çok bas enerjisi sokarak "
      "büyüyor — faz uyumu olmadan. Bu yüzden:\n")
    w("- Tahminci normalize korelasyonu en büyütür (ölçüt 2 ile aynı).")
    w("- Ölçüt 1 \"teorik sınır\", **aynı bas enerjisiyle** en iyi korelasyonda ulaşılacak enerji olarak hesaplanır: "
      "`E_lim = E_k + E_b + 2ρ*√(E_k·E_b)`. Talimattaki tanımın düzeltilmiş hâli — spec'e işlendi.\n")

    w("## Modlar — nota değişen döngülerde (48 kHz, 4 ölçü, 125 BPM)\n")
    w("İlk 8 vuruş (Learn'ün öğrenme süresi) hariç; her satır 3 kick/bas çiftinin ortalaması. "
      "\"geçen\" = enerji ölçütünü geçen vuruş oranı.\n")
    w("| senaryo | mod | gecikme | L (ms) | ρ ort. | ρ* ort. | enerji farkı ort. (dB) | geçen |\n|---|---|---|---|---|---|---|---|")
    for sc in SCEN:
        for m in ("yok", "learn", "hit", "note", "cont"):
            for lm in ("tam", "tam_lookahead"):
                rs = [g for g in G if g["scen"] == sc and g["mode"] == m and g["lm"] == lm]
                if not rs:
                    continue
                w(f"| {sc} | {m} | {lm} | {rs[0]['latency_ms']:.0f} | {np.mean([g['rho'] for g in rs]):.3f} | "
                  f"{np.mean([g['rho_star'] for g in rs]):.3f} | {np.mean([g['egap'] for g in rs]):.2f} | "
                  f"{np.mean([g['pass_frac'] for g in rs])*100:.0f} % |")
    sel = lambda m, sc, lm="tam": [g for g in G if g["mode"] == m and g["scen"] == sc and g["lm"] == lm]  # noqa: E731
    a, b_ = sel("learn", "nota_degisir_faz_sabit"), sel("note", "nota_degisir_faz_sabit")
    w(f"\n**Sabit hizalama (Learn) ↔ nota başına** (nota değişir, synth fazı her notada aynı başlar): "
      f"enerji farkı {np.mean([g['egap'] for g in a]):.2f} → {np.mean([g['egap'] for g in b_]):.2f} dB, "
      f"korelasyon {np.mean([g['rho'] for g in a]):.3f} → {np.mean([g['rho'] for g in b_]):.3f}.\n")
    w("Yorum:\n- **Nota başına**, synth her notayı aynı fazla başlatıyorsa (çoğu synth'te \"retrigger\") sınıra ulaşır ve "
      "lookahead gerektirmez.\n- Faz serbest koşuyorsa (free-running osilatör) nota tablosu öngöremez → **Her vuruşta** "
      "gerekir; uzun pencere ister (Tam+lookahead).\n- **Sürekli takip** hız sınırlı (0,5 ms/s, 45°/s) olduğu için vuruş "
      "vuruş değişen notalarda geride kalır; tek nota/yavaş değişim içindir.\n")

    w("## Nota tespiti\n")
    w("| gecikme modu | onset sonrası veri | fmin | doğru (E0–C3 × 4 bas tipi) | 4 tipte de doğru olan en düşük nota |\n|---|---|---|---|---|")
    for r in extra["pitch"]:
        w(f"| {r['lm']} | {r['pencere_ms']:.0f} ms | {r['fmin']:.1f} Hz | {r['dogru']*100:.0f} % | {r['en_dusuk_tam_dogru']} |")
    w("")
    with open(os.path.join(OUT, "ozet.md"), "w") as f:
        f.write("\n".join(L) + "\n")

    # grafikler
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.6))
    ax[0].hist(derr, bins=40, color="#3a7bd5")
    ax[0].axvline(0.1, color="#c0392b", ls="--", label="sınır 0,1 ms")
    ax[0].set_xlabel("gecikme hatası (ms)")
    ax[0].set_title("Ölçüt 3 — kimlik seti")
    ax[0].legend()
    eg = np.array([r["e_gap_db"] for r in B])
    ax[1].hist(np.clip(eg, -2, 0.01), bins=40, color="#2e8b57")
    ax[1].axvline(-0.5, color="#c0392b", ls="--", label="sınır −0,5 dB")
    ax[1].set_xlabel("enerji farkı (dB)")
    ax[1].set_title("Ölçüt 1 — müzikal set")
    ax[1].legend()
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "olcutler.png"), dpi=110)


if __name__ == "__main__":
    main()
