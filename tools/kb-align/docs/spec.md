# KB-Align — Spesifikasyon (Aşama 2, Aşama 3 ölçümleriyle kesinleşmiş)

> Talimat: `docs/talimat.md`. Ölçüm raporu: `prototype/rapor/ozet.md`.
> Talimattan sapmalar **[SAPMA]** ile, doğrulanmamış varsayımlar **VARSAYIM** ile işaretli.
> Kullanıcı onayı (2026-11-27): rakip araştırmasındaki 6 öneri dahil.

## 1. Sinyal akışı

```
Bas ─┬─ LR4 LP (fc) ──→ lo ─┬─→ halka tampon "lo"
     │                      └─→ FIR Hilbert (bölümlü FFT evrişimi, blok B=128) → halka tampon "v"
     │      y_low(t) = cosθ·lo(t − L − d) − sinθ·v(t − L − d + Hs + B)        (5. derece Lagrange okuma)
     ├─ LR4 HP (fc) ──→ y_high(t) = hi(t − L)            (işlenmez, yalnız sabit gecikme)
     └─ ham ──────────→ bypass(t) = x(t − L)
çıkış = ducking(y_low [+ y_high]) → Bass Mono (stereo) → bypass karışımı (20 ms geçiş)

Kick sidechain ─→ onset tespiti (ses thread'i) + LR4 LP geçmiş tamponu ─→ analiz thread'i ─→ (d, θ) olayları
```

- Kick ses yoluna **hiç girmez** (önizleme dinleme modu dışında). `engine.render` ve `AudioEngine::process` ses yolu kick'i yalnız analiz tamponuna yazar.
- Hilbert, gecikmeyle sıra değiştirdiği için kesirli gecikmeden önce bir kez hesaplanır. Parametre değişimi iki okuma zinciri arasında 10 ms yükseltilmiş-kosinüs crossfade ile yapılır; zincirlerin durumu yoktur → geçişte geçici olay yok (ölçülen tıklama artışı +0,0 dB).
- Crossover kapalıysa `lo = x`, `hi = 0` (tüm sinyal işlenir).

## 2. Gecikme bütçesi (ölçülmüş)

`L = round((neg + lookahead)·fs) + Hs + B + 4`, `Hs = 25 ms` (FIR Hilbert yarı-boyu), `B = 128 örnek`.

| Mod | negatif aralık | lookahead | L @48 kHz | Her vuruşta modunun analiz penceresi |
|---|---|---|---|---|
| Düşük | −10 ms | 0 | 37,8 ms | yok (sonraki vuruşa uygulanır) |
| Tam (varsayılan) | −50 ms | 0 | 77,8 ms | ~36 ms |
| Tam + lookahead | −50 ms | 60 ms | 137,8 ms | ~96 ms |

- Kullanılabilir lookahead = `L − X − 1 ms − RT_PAY` (X = 10 ms crossfade, RT_PAY = 20 ms). **VARSAYIM:** host bloğu ≤ 512 örnek @48 kHz ve analiz ≤ 9 ms; C++'ta ölçülen "Her vuruşta" analizi 2,4–3 ms, Learn birleşik hesabı ≤ 57 ms (son tarihsiz).
- **[SAPMA]** Talimat "Tam + lookahead" için `L = 50 + 40` öneriyordu. Ölçüm: 40 ms pencere ölçütleri geçmiyor (enerji ölçütü %42), 90 ms pencere geçiyor (%100). Gerçek zaman payıyla bu 60 ms lookahead ister.
- Bildirilen gecikme yalnız **gecikme modu** ya da **crossover** değişince değişir (motor yeniden kurulur, host'a yeni gecikme bildirilir). Otomasyonla değişen hiçbir parametre gecikmeyi değiştirmez.

## 3. Otomatik hizalama

### 3.1 Tahminci (ortak)
- Alt bant (LR4 LP, fc), desimasyon (fa ≈ 3 kHz, Hamming FIR 8M+1), analitik sinyal (2'nin kuvveti FFT).
- Karmaşık korelasyon `c(τ) = Σ k_a·conj(b_a(t−τ))`, **normalize**: `ρ(τ) = |c(τ)| / √(E_k·E_b(τ))`.
- **[SAPMA] Hedef fonksiyon normalize korelasyondur, ham enerji değil.** Ölçüm: bas kick'ten 20 ms sonra başladığında ham enerjiyi en büyüten kayma −28,5 ms (bası pencereye çekiyor), korelasyonu en büyüten −0,5 ms.
- Aday: yerel tepeler; en iyinin %0,5'i içindekilerden en küçük |d|. İnceltme: kesin değerlendirme (bas segmenti FFT ile kesirli kaydırılır) + altın oran araması.
- Bas enerjisi pencerede en büyüğün %30'unun altına düşen gecikmeler aday değildir.
- Analiz penceresi varsayılanı **[0, 150] ms** (onset'e göre). **[SAPMA]** Talimat örneği −5 ms başlangıçtı; ölçüm: ölçüm penceresiyle aynı başlangıç korelasyon ölçütünü %62,5 → %94,2 yükseltiyor.
- **Otomatik arama aralığı varsayılanı ±10 ms** (1–50 ayarlanabilir; elle pre-delay ±50 ms). Gerekçe: ±50 ms aramada tonu uyuşmayan kick/basta tahminci bası +50 ms sınırına itebiliyor (ritmi bozar).
- Güven = ulaşılan ρ. Güven eşiği 0,15; **kabul kuralı**: yeni değer mevcut değere göre ρ'yu en az 0,005 artırmalı (öneri 3).

### 3.2 Modlar
| Mod | Nasıl | Sonuç (ölçüm, 48 kHz, nota değişen döngü) |
|---|---|---|
| Learn | N vuruş (varsayılan 8) **birleşik** hedef (vuruşların normalize korelasyon ortalaması) → sabit | tek notada sınıra eşit; nota değişince ortalama 0,18 korelasyon |
| Her vuruşta | her vuruş; pencere = bütçenin izin verdiği en uzun; yetmezse sonraki vuruşa | Tam: %42 · Tam+LA: %100 (serbest fazda da) |
| Nota başına | bas notası (YIN, zamanında) → tablo; tablo birleşik hedefle güncellenir; kilitlenebilir | retrigger synth'te sınıra ulaşır (%100), lookahead gerektirmez; serbest fazda işe yaramaz |
| Sürekli takip | vuruşlarda üstel unutmalı birikim (τ 1 s), hız sınırlı rampa (0,5 ms/s ≈ 0,9 cent; 45°/s) | tek nota/yavaş değişim için; vuruş vuruş nota değişiminde geride kalır |

- Nota tespiti zamanında: Tam modda onset sonrası 47 ms veri → güvenilir alt sınır ~G1 (49 Hz); Tam+LA 107 ms → F0. Zamanında tespit edilemeyen nota tabloyu geç tespitle doldurur, o vuruşa uygulanmaz.
- Learn sonucu durumla kaydedilir; Learn modunda yeniden açılışta uygulanır. Elle pre-delay ve faz, tüm modlarda **ince ayar** olarak eklenir.
- Çevrimdışı render (`isNonRealtime`): ses ≤256 örneklik alt bloklarda işlenir, analiz her alt bloktan sonra eşzamanlı çalışır → **gerçek zamanlı ile bit düzeyinde aynı çıktı** (ölçüldü, üç modda −600 dBFS fark).

## 4. Pre-delay ve sidechain

- Pre-delay ±50 ms, 0,001 ms adım; osiloskopta bas izi sürüklenerek ayarlanır (Shift ×0,1, çift tık sıfır). Negatif kayma, Düşük modda −10 ms ile sınırlı.
- **Sidechain ofseti** ±20 ms (öneri 1): host sidechain'i geç veriyorsa uygulanan kaymadan düşülür, osiloskopta ve ducking tetiğinde de hesaba katılır. **VARSAYIM:** Ableton'da gerekip gerekmediği Ableton testinde ölçülecek (madde 3).
- Tetik frekansı 40–400 Hz (öneri 5), varsayılan 150 Hz.

## 5. Osiloskop ve ölçerler

- İzler: Kick (turuncu, düz), Bas (mavi, kesikli), Toplam (sarı, noktalı), isteğe bağlı "önceki bas" (gri, ince kesikli) — Okabe–Ito paleti, çizgi tipiyle ayrılır.
- Tetik: kick'e kilitli (ön-tetik 0–50 ms), tempo (1/16 … 4 ölçü, **VARSAYIM:** host ppq'su blok başındaki giriş örneğine aittir), serbest.
- Görüntü filtresi (yalnız görüntü, sıfır faz LR4, 40–400 Hz). Zaman 1–500 ms. Ortalama 1–16 vuruş, kalıcılık, dondurma.
- İmleçler A/B: Δ ms, örnek ve derece (referans: son tespit edilen nota). Analiz penceresi görünür ve kenarları sürüklenebilir (öneri 2).
- Ölçerler (analiz penceresi, alt bant görünümü): korelasyon, iptal/güçlenme dB, tepe ve RMS önce→sonra (öneri 4), uygulanan (d, θ), güven, L; faz farkı 20–300 Hz (8 vuruş çapraz spektrum ortalaması, coherence ile soluklaşır); XY.

## 5b. Crossover varsayılanı ve analiz bandı (ölçüm, 2026-11-27)

**[SAPMA] Crossover varsayılanı KAPALI** (talimat: LR4 120 Hz açık). Eklentinin gerçek çıktısında, kick + bas toplam enerjisi (120 Hz altı), Nota başına modu, 48 kHz:

| Malzeme | Crossover açık 120 Hz | açık 200 Hz | açık 300 Hz | **kapalı** |
|---|---|---|---|---|
| Testere bas, A1-A1-C2-G1 | +0,25 dB | +1,08 dB | +1,37 dB | **+1,92 dB** (en kötü vuruş +0,27) |
| Sinüs sub | +0,51 dB | +1,62 dB | +1,93 dB | **+2,11 dB** |
| 808 + kare | +0,41 dB | +1,17 dB | +1,37 dB | **+1,52 dB** |

Neden: kick bölgesindeki bas harmonikleri (ör. A1'in 110 Hz'i) crossover sınırında iki banda bölünür; yalnız alt bandı kaydırmak toplamı yeniden karıştırır.
- **Analiz bandı crossover'dan ayrıldı:** analiz ve ölçüm hep 120 Hz altında (`kAnalysisHz`, Python `Config.analysis_fc`).
- Crossover açılırsa varsayılan sınır 250 Hz (60–400 Hz).
- Önceki raporlar ölçümü yalnız işlenen alt bant yolunda yapıyordu; artık tüm ölçümler **gerçek çıktıda** (bütün bantlar, analiz bandında süzülmüş). Yeni varsayılanla ölçütler değişmedi (rapor/ozet.md).

## 6. Ek özellikler
- Faz döndürme 0–360°, Hilbert tabanlı, yalnız alt bantta (crossover açıkken).
- Crossover: LR4, varsayılan kapalı (§5b), açıkken 60–400 Hz (varsayılan 250). **[SAPMA] Lineer fazlı crossover 1. sürümde yok.**
- Polarite (Ø): işlenen bandın işareti 10 ms geçişle çevrilir. Çıkış kazancı −24…+12 dB (yalnız işlenmiş ses).
- Bass Mono: fc altındaki side, genişlik 0–1; mid aynı tüm-geçirenden geçer.
- Ducking: kick ya da tempo tetikli çizilebilir eğri (≤32 nokta, eğrilik), derinlik, ms ya da nota uzunluğu, alt bant/tüm sinyal. **VARSAYIM:** varsayılan eğri yer tutucu; kullanıcının eğrisi gelince varsayılan preset olacak.
- Dinleme: Bas · Kick+bas önizleme (uyarılı) · Alt bant solo.
- Presetler: 7 fabrika, kullanıcı presetleri (`~/Documents/KB-Align/Presets/*.kbpreset`), A/B, geri al/yinele (APVTS UndoManager), tüm parametreler otomasyona açık; durum sürümlü (`version=1`), nota tablosu + eğri + Learn sonucu dahil.
- Bypass: gecikmeyi koruyan, 20 ms geçişli.
- Arayüz (v2): 1180×780 taban, %75–200 ölçek. Mod düğme sırası, büyük gösterge (kaydırma, faz, toplam alt bant kazancı, bas notası), Önce/Sonra düğmesi, kick/giriş/çıkış seviye ölçerleri, Dalga · Faz · XY sekmeleri, Basit/Gelişmiş görünüm (basitte 3 adımlık kullanım), preset ‹ › okları, her kontrolde ipucu + alt bilgi çubuğu.
- İlk açılışta 12 adımlık yazılı tanıtım turu (hedefi vurgular; Esc/Enter/oklar; `? > Tanıtım turunu başlat`). Gösterildiği makine başına `KB-Align.settings` dosyasında tutulur.
- Klavye: osiloskopta oklar (imleç), [ ] (zaman), F (dondur); eğri düzenleyicide oklar.

## 7. "%100" ölçütleri — tanım ve sonuç (rapor §1–4)

| Ölçüt | Tanım (kesinleşmiş) | Sonuç |
|---|---|---|
| 1 Enerji | `E_ach ≥ E_lim − 0,5 dB`, `E_lim = E_k + E_b + 2ρ*√(E_kE_b)` (aynı bas enerjisinde en iyi korelasyon) **[SAPMA: ham enerji maksimumu yerine]** | müzikal 480 vuruş: %100, en kötü −0,039 dB |
| 2 Korelasyon | ρ* ≥ 0,95 ise ρ ≥ 0,95; değilse ρ ≥ 0,98·ρ* **veya** ρ ≥ ρ* − 0,005 **[SAPMA: mutlak taban önerisi]** | göreli %93,8 · tabanlı %99,8 · 0,95 dalı (kimlik seti) %100 |
| 3 Gecikme hatası | kimlik setinde |d − d_doğru| ≤ 0,1 ms, 4 örnekleme hızı, gürültü 60/40 dB | 480 vuruş %100, en kötü 0,042 ms; Learn sapması 0,0001 ms |
| 4 Kick transient'i | kick çıkışa girmez; üst bant ve nötr/bypass null | −300…−600 dBFS (bit düzeyinde) |
| Ek: tıklama | crossfade'li geçiş | +0,0 dB |
| Ek: CPU | 48 kHz, 64 örnek, stereo, tüm özellikler | %1,30 tek çekirdek (hedef %2); 192 kHz %10,4 |

## 8. Kalan VARSAYIM'lar
1. Ableton sidechain PDC davranışı (sidechain ofseti gerekli mi) — Ableton testi madde 3.
2. Host ppq'sunun hangi örneğe ait olduğu (tempo tetik/ducking) — Ableton testi madde 5.
3. Gerçek zaman payı 20 ms (blok ≤512 @48 kHz) — büyük bloklu kurulumda Her vuruşta modu sonucu sonraki vuruşa kayabilir.
4. Ducking varsayılan eğrisi — kullanıcının eğrisi bekleniyor.
5. Gerçek kayıtlar: tüm ölçümler sentetik; kullanıcının stem'leriyle tekrarlanacak.
