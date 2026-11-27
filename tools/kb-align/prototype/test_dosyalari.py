"""Ableton testleri için bilinen ofsetli WAV dosyaları (48 kHz, 24 bit, mono) → ../test-dosyalari/

Çalıştırma: python3 -I test_dosyalari.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402

from kbalign import datasets as ds, dsp  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test-dosyalari")
os.makedirs(OUT, exist_ok=True)
fs = 48000
bpm = 125.0
rng = np.random.default_rng(7)


def w(name, x):
    sf.write(os.path.join(OUT, name), (0.8 * x / np.max(np.abs(x))).astype(np.float32), fs, subtype="PCM_24")


k, b, on, notes = ds.loop(fs, bpm=bpm, bars=4, notes=(33,), kind="kisa", btype="sinus", rng=rng)
w("01_kick_125bpm.wav", k)
# kimlik basları: bas = kick'in analitik kopyası → doğru cevap kesin bilinir
ka = dsp.analytic(k)
for d0, th0, name in ((0.0, 0.0, "02_bas_kimlik_hizali.wav"), (3.0, 90.0, "03_bas_kimlik_3ms_gec_90derece.wav"),
                      (-2.5, 0.0, "04_bas_kimlik_2.5ms_erken.wav")):
    sh = d0 * fs / 1000
    w(name, dsp.rotate(dsp.delay_ideal(np.real(ka), sh), dsp.delay_ideal(np.imag(ka), sh), th0))
_, b2, _, _ = ds.loop(fs, bpm=bpm, bars=4, notes=(33, 33, 36, 31), kind="kisa", btype="testere", d0_ms=3.0, th0=70.0,
                      rng=np.random.default_rng(2), retrigger_phase=True)
w("05_bas_nota_degisen_A1_A1_C2_G1.wav", b2)
imp = np.zeros(int(4 * fs))
imp[fs] = 1.0
w("06_impuls_1s.wav", imp)
with open(os.path.join(OUT, "BENIOKU.txt"), "w") as f:
    f.write("""KB-Align test dosyaları — 48 kHz, 24 bit, mono, 125 BPM, 4 ölçü (Ableton'da Warp KAPALI)

01_kick_125bpm.wav                  Kick kanalı (sidechain kaynağı)
02_bas_kimlik_hizali.wav            Bas = kick'in kopyası, hizalı      → Learn: d ≈ 0,00 ms, θ ≈ 0°
03_bas_kimlik_3ms_gec_90derece.wav  3,00 ms geç ve +90° döndürülmüş → Learn: d ≈ −3,00 ms, θ ≈ −90° (= 270°)
04_bas_kimlik_2.5ms_erken.wav       2,50 ms erken                     → Learn: d ≈ +2,50 ms, θ ≈ 0°
05_bas_nota_degisen_*.wav           Nota değişen bas (retrigger)       → Nota başına modunda tabloda A1, C2, G1
06_impuls_1s.wav                    1,000 s'de tek örnek (PDC testi)

Beklenen değerlerin toleransı: d ±0,1 ms, θ ±3°. Arama aralığı ±10 ms (varsayılan) yeterli.
Ayrıntılı adımlar: docs/dogrulama/ableton-kontrol-listesi.md
""")
print("yazıldı:", os.listdir(OUT))
