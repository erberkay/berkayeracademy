# Aşama 3 — Python algoritma kanıtı: rapor

Üretim: `python3 -I report.py` · süre 3.0 dk · seed 20261127 · ham sonuçlar `sonuclar.json`.

Bütün sinyaller sentetik (talimat §5.1). Gerçek kick/bas stem'leri henüz yok — kullanıcıdan bekleniyor.

## Ölçüt 3 — gecikme hatası ≤ 0,1 ms (kimlik seti)

Bas = kick'in bilinen kesirli kayma (±20 ms) ve döndürme (0–360°) uygulanmış kopyası; 480 vuruş (4 örnekleme hızı × 5 kick × 8 rastgele × gürültüsüz/60/40 dB).

| fs | n | en kötü (ms) | %95 (ms) | ort. (ms) | θ en kötü (°) | geçen |
|---|---|---|---|---|---|---|
| 44100 | 120 | 0.0335 | 0.0160 | 0.0036 | 0.65 | 100.0 % |
| 48000 | 120 | 0.0367 | 0.0240 | 0.0043 | 0.71 | 100.0 % |
| 96000 | 120 | 0.0421 | 0.0247 | 0.0044 | 0.81 | 100.0 % |
| 192000 | 120 | 0.0416 | 0.0221 | 0.0040 | 0.81 | 100.0 % |

- Gürültü yok: en kötü 0.0384 ms, %95 0.0202 ms.

- Gürültü 60: en kötü 0.0421 ms, %95 0.0253 ms.

- Gürültü 40: en kötü 0.0384 ms, %95 0.0230 ms.

**Sonuç: 100.0 % geçti** (hedef ≥ %98).

Learn tutarlılığı (8 vuruş, 40 dB gürültü, 6 tekrar): 48000 Hz: sapma 0.0001 ms, ortalama hata +0.0001 ms, 192000 Hz: sapma 0.0001 ms, ortalama hata -0.0000 ms — hedef ≤ 0,05 ms.

## Ölçüt 1 ve 2 — enerji ve korelasyon (müzikal set)

Kick + bas notası (E0–C3, 4 bas tipi), rastgele kayma ±8 ms ve faz, bas atağı −15…+20 ms, gürültü yok/60/40/20 dB, rastgele ducking. Teorik sınır: tam örnekleme hızında kaba kuvvet (tamsayı gecikmeler + 0,01 ms kübik inceltme, θ 1°).

### Varsayılan arama aralığı ±10 ms (4 örnekleme hızı)

- Vuruş: 480 · enerji ölçütü (≥ −0,5 dB) geçen: **100.0 %** · en kötü -0.039 dB · ortalama -0.0014 dB
- Korelasyon ölçütü geçen: **93.8 %** · uyumlu (ρ* ≥ 0,95) vuruş: 0, bunlarda ρ ≥ 0,95: nan %
- Korelasyon, mutlak 0,005 tabanıyla (ρ ≥ 0,98·ρ* **veya** ρ ≥ ρ* − 0,005): **99.8 %** · en kötü ρ − ρ* = -0.0098
- Ölçüt 1 ve 2 birlikte: yalnız göreli **93.8 %**, tabanlı **99.8 %**
- İptal ölçer, hizalama öncesi→sonrası ortalama değişim: +0.81 dB (en kötü -0.02, en iyi +7.41)
- Bilgi: ideal (frekans başına faz) sınıra göre ortalama -0.60 dB, en kötü -1.18 dB

Tabanlı ölçütü de geçmeyen vuruşlar:

| kick | bas | nota | gürültü | duck | ρ | ρ* | enerji farkı dB | d / d* (ms) |
|---|---|---|---|---|---|---|---|---|
| 808 | kare | E2 | 20.0 | 0.0 | 0.063 | 0.073 | -0.04 | -10.00 / 10.00 |

### Geniş arama aralığı ±50 ms (48 kHz)

- Vuruş: 60 · enerji ölçütü (≥ −0,5 dB) geçen: **100.0 %** · en kötü -0.006 dB · ortalama -0.0011 dB
- Korelasyon ölçütü geçen: **96.7 %** · uyumlu (ρ* ≥ 0,95) vuruş: 0, bunlarda ρ ≥ 0,95: nan %
- Korelasyon, mutlak 0,005 tabanıyla (ρ ≥ 0,98·ρ* **veya** ρ ≥ ρ* − 0,005): **100.0 %** · en kötü ρ − ρ* = -0.0024
- Ölçüt 1 ve 2 birlikte: yalnız göreli **96.7 %**, tabanlı **100.0 %**
- İptal ölçer, hizalama öncesi→sonrası ortalama değişim: +0.86 dB (en kötü +0.11, en iyi +3.34)
- Bilgi: ideal (frekans başına faz) sınıra göre ortalama -0.56 dB, en kötü -0.95 dB

### Uyumlu set: bas = kick kuyruk frekansında sönen sub (808 katmanı), ±10 ms

- Vuruş: 120 · enerji ölçütü (≥ −0,5 dB) geçen: **100.0 %** · en kötü -0.006 dB · ortalama -0.0003 dB
- Korelasyon ölçütü geçen: **100.0 %** · uyumlu (ρ* ≥ 0,95) vuruş: 0, bunlarda ρ ≥ 0,95: nan %
- Korelasyon, mutlak 0,005 tabanıyla (ρ ≥ 0,98·ρ* **veya** ρ ≥ ρ* − 0,005): **100.0 %** · en kötü ρ − ρ* = -0.0024
- Ölçüt 1 ve 2 birlikte: yalnız göreli **100.0 %**, tabanlı **100.0 %**
- İptal ölçer, hizalama öncesi→sonrası ortalama değişim: +2.49 dB (en kötü +0.02, en iyi +9.64)
- Bilgi: ideal (frekans başına faz) sınıra göre ortalama -0.42 dB, en kötü -0.78 dB

**Korelasyon ≥ 0,95 dalı:** müzikal ve uyumlu setlerde kaba kuvvet sınırı bile 0,95'e ulaşmıyor (ρ* en çok 0.902): kick'in perde süpürmesi sabit perdeli bir basla 150 ms boyunca aynı dalga biçimini paylaşamaz. 0,95 dalı yalnız kimlik setinde (bas = kick kopyası) geçerli: orada ulaşılan korelasyon en az **0.9993**, %100.0 vuruşta ≥ 0,95.

## Ölçüt 4 — kick transient'i değişmez (null testleri)

| fs | bypass | nötr, crossover kapalı | üst bant (d=7,3 ms, θ=123°) | LR4 toplam sapma (dB) |
|---|---|---|---|---|
| 44100 | -600 dBFS | -600 dBFS | -319 dBFS | 0.0000 |
| 48000 | -600 dBFS | -600 dBFS | -319 dBFS | 0.0000 |
| 96000 | -600 dBFS | -600 dBFS | -319 dBFS | 0.0000 |
| 192000 | -600 dBFS | -600 dBFS | -319 dBFS | 0.0000 |

- Kick ses yoluna hiç girmez: `engine.render` kick almaz (testte imzadan doğrulanır); C++'ta da sidechain yalnız analiz FIFO'suna yazılır.
- −300 dBFS civarı değerler bit düzeyinde eşitlik demektir.

## Ek kalite ölçütleri

**Tıklama** (45 Hz testere, ani d=4 ms / θ=150° değişimi; 2 kHz üstü fark tepesi / referans): crossfade 0.02 ms → +0.1 dB, crossfade 2.0 ms → +0.0 dB, crossfade 10.0 ms → +0.0 dB, crossfade 20.0 ms → +0.0 dB. 0,02 ms ≈ ani geçiş.

**Kesirli gecikme** (ideal FFT gecikmesine göre en kötü hata, μ ∈ {0,1…0,9}):

| yöntem | alt bant (≤300 Hz) | tüm bant (≤18 kHz) | çarpma/örnek |
|---|---|---|---|
| lagrange | -100.9 dB | -19.4 dB | 6 |
| sinc | -87.9 dB | -87.7 dB | 32 |

Seçim: **Lagrange 5. derece** — alt bantta yeterli, 5 kat ucuz. Crossover kapalı (tüm bant) modunda yüksek frekans hatası görünür; o mod için sinc seçeneği C++'ta parametre olarak kalır.

**Hilbert FIR yarı-boyu** (Kaiser β=8, 48 kHz; θ=90°'de genlik hatası, dB):

| yarı-boy | 20.6 Hz | 27.5 Hz | 30.9 Hz | 41.2 Hz | 55.0 Hz | 82.4 Hz | 120.0 Hz |
|---|---|---|---|---|---|---|---|
| 10 ms | -9.16 | -6.85 | -5.96 | -3.90 | -2.14 | -0.50 | -0.01 |
| 15 ms | -5.96 | -3.89 | -3.14 | -1.55 | -0.49 | -0.01 | +0.00 |
| 25 ms | -2.50 | -1.09 | -0.68 | -0.10 | +0.00 | +0.00 | +0.00 |
| 35 ms | -0.91 | -0.18 | -0.06 | +0.00 | +0.00 | +0.00 | -0.00 |
| 50 ms | -0.10 | +0.00 | -0.00 | +0.00 | +0.00 | -0.00 | -0.00 |

Seçim: **25 ms** (41 Hz'te −0,1 dB'nin altı). E0 (20,6 Hz) için 35–50 ms gerekir; E0 vuruşları raporda ayrı izlenir.

## Hedef fonksiyon: neden ham enerji değil, normalize korelasyon

Bas, kick'ten 20 ms sonra başlıyor (A1 sinüs). Ham toplam enerjiyi en büyüten kayma **d = -28.50 ms** (korelasyon 0.685); normalize korelasyonu en büyüten **d = -0.50 ms** (korelasyon 0.760). Ham enerji, bası kaydırıp pencereye daha çok bas enerjisi sokarak büyüyor — faz uyumu olmadan. Bu yüzden:

- Tahminci normalize korelasyonu en büyütür (ölçüt 2 ile aynı).
- Ölçüt 1 "teorik sınır", **aynı bas enerjisiyle** en iyi korelasyonda ulaşılacak enerji olarak hesaplanır: `E_lim = E_k + E_b + 2ρ*√(E_k·E_b)`. Talimattaki tanımın düzeltilmiş hâli — spec'e işlendi.

## Modlar — nota değişen döngülerde (48 kHz, 4 ölçü, 125 BPM)

İlk 8 vuruş (Learn'ün öğrenme süresi) hariç; her satır 3 kick/bas çiftinin ortalaması. "geçen" = enerji ölçütünü geçen vuruş oranı.

| senaryo | mod | gecikme | L (ms) | ρ ort. | ρ* ort. | enerji farkı ort. (dB) | geçen |
|---|---|---|---|---|---|---|---|
| nota_degisir_faz_sabit | yok | tam | 78 | 0.033 | 0.504 | -1.94 | 50 % |
| nota_degisir_faz_sabit | learn | tam | 78 | 0.178 | 0.504 | -1.30 | 58 % |
| nota_degisir_faz_sabit | hit | tam | 78 | 0.151 | 0.504 | -1.23 | 42 % |
| nota_degisir_faz_sabit | hit | tam_lookahead | 138 | 0.472 | 0.504 | -0.09 | 100 % |
| nota_degisir_faz_sabit | note | tam | 78 | 0.494 | 0.504 | -0.04 | 96 % |
| nota_degisir_faz_sabit | note | tam_lookahead | 138 | 0.494 | 0.504 | -0.04 | 96 % |
| nota_degisir_faz_sabit | cont | tam | 78 | -0.078 | 0.504 | -2.52 | 29 % |
| nota_degisir_faz_serbest | yok | tam | 78 | -0.078 | 0.516 | -2.53 | 29 % |
| nota_degisir_faz_serbest | learn | tam | 78 | -0.094 | 0.516 | -2.38 | 25 % |
| nota_degisir_faz_serbest | hit | tam | 78 | 0.166 | 0.516 | -1.21 | 42 % |
| nota_degisir_faz_serbest | hit | tam_lookahead | 138 | 0.484 | 0.516 | -0.09 | 100 % |
| nota_degisir_faz_serbest | note | tam | 78 | 0.018 | 0.516 | -2.10 | 29 % |
| nota_degisir_faz_serbest | note | tam_lookahead | 138 | 0.018 | 0.516 | -2.10 | 29 % |
| nota_degisir_faz_serbest | cont | tam | 78 | 0.113 | 0.516 | -1.51 | 29 % |
| tek_nota | yok | tam | 78 | 0.015 | 0.610 | -2.43 | 33 % |
| tek_nota | learn | tam | 78 | 0.611 | 0.610 | -0.00 | 100 % |
| tek_nota | hit | tam | 78 | 0.204 | 0.610 | -1.43 | 33 % |
| tek_nota | hit | tam_lookahead | 138 | 0.566 | 0.610 | -0.12 | 100 % |
| tek_nota | note | tam | 78 | 0.611 | 0.610 | -0.00 | 100 % |
| tek_nota | note | tam_lookahead | 138 | 0.611 | 0.610 | -0.00 | 100 % |
| tek_nota | cont | tam | 78 | 0.205 | 0.610 | -1.60 | 33 % |
| genis_aralik_E1_C3 | yok | tam | 78 | 0.028 | 0.201 | -0.68 | 67 % |
| genis_aralik_E1_C3 | learn | tam | 78 | 0.056 | 0.201 | -0.56 | 75 % |
| genis_aralik_E1_C3 | hit | tam | 78 | 0.134 | 0.201 | -0.25 | 83 % |
| genis_aralik_E1_C3 | hit | tam_lookahead | 138 | 0.129 | 0.201 | -0.26 | 83 % |
| genis_aralik_E1_C3 | note | tam | 78 | 0.166 | 0.201 | -0.12 | 100 % |
| genis_aralik_E1_C3 | note | tam_lookahead | 138 | 0.173 | 0.201 | -0.10 | 100 % |
| genis_aralik_E1_C3 | cont | tam | 78 | -0.013 | 0.201 | -0.88 | 50 % |

**Sabit hizalama (Learn) ↔ nota başına** (nota değişir, synth fazı her notada aynı başlar): enerji farkı -1.30 → -0.04 dB, korelasyon 0.178 → 0.494.

Yorum:
- **Nota başına**, synth her notayı aynı fazla başlatıyorsa (çoğu synth'te "retrigger") sınıra ulaşır ve lookahead gerektirmez.
- Faz serbest koşuyorsa (free-running osilatör) nota tablosu öngöremez → **Her vuruşta** gerekir; uzun pencere ister (Tam+lookahead).
- **Sürekli takip** hız sınırlı (0,5 ms/s, 45°/s) olduğu için vuruş vuruş değişen notalarda geride kalır; tek nota/yavaş değişim içindir.

## Nota tespiti

| gecikme modu | onset sonrası veri | fmin | doğru (E0–C3 × 4 bas tipi) | 4 tipte de doğru olan en düşük nota |
|---|---|---|---|---|
| tam | 47 ms | 49.2 Hz | 55 % | G1 |
| tam_lookahead | 107 ms | 21.5 Hz | 97 % | F0 |

