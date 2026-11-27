# DSP yöntemleri — KB-Align

> Aşama 1 çıktısı. Her yöntem için: ne yapar, kaynak, artı/eksi, plugin'de nerede kullanılır.
> "ÖLÇÜLDÜ" diye işaretli sayılar bu oturumda Python ile hesaplandı (numpy/scipy, 48 kHz).
> "VARSAYIM" diye işaretli maddeler Python aşamasında ölçülüp `docs/spec.md`'ye kesinleşecek.

## 0. Plugin'in matematiksel modeli

Bas'ın alt bandına iki parametre uygulanır:

- `d` — zaman kayması (ms). Frekansa göre **doğrusal** faz: `φ_d(f) = −360° · f · d`.
- `θ` — faz döndürme (°). Frekanstan **bağımsız** sabit faz.

Toplam: `φ(f) = θ − 360° · f · d`. Yani plugin, faz-frekans grafiğinde bir **doğru** (eğim = gecikme, kesişim = döndürme) uygular. Bundan iki sonuç çıkar:

1. **Gecikme ile döndürme birbirinin yerine geçebilir.** Tek frekanslı (saf tonal) bir bas için `d` ve `θ` arasında sonsuz eşdeğer çözüm vardır: `θ = 360° · f · d`. Çözümü tekilleştirmek için bir tercih kuralı gerekir (en küçük `|d|`, ya da "yalnız faz").
2. **Aynı `d`, farklı notada farklı faz derecesidir.** ÖLÇÜLDÜ:

   | Nota | f (Hz) | 1 ms kayma = | YIN için 2 periyot |
   |---|---|---|---|
   | E0 | 20,6 | 7,4° | 97 ms |
   | E1 | 41,2 | 14,8° | 48,5 ms |
   | A1 | 55,0 | 19,8° | 36,4 ms |
   | E2 | 82,4 | 29,7° | 24,3 ms |

   Bir notada mükemmel olan `(d, θ)` başka notada 10–20° hata bırakır. "Nota başına" modunun gerekçesi budur.

**Hedef fonksiyon.** Kick penceresinde alt bant toplam enerjisi:

```
E(d, θ) = Σ (k(t) + b_{d,θ}(t))²  =  E(k) + E(b) + 2 · Σ k(t) · b_{d,θ}(t)
```

Gecikme ve tüm-geçiren faz döndürme bas'ın enerjisini (pencere kenar etkisi dışında) değiştirmez, dolayısıyla **E'yi büyütmek = çapraz terimi büyütmek = korelasyonu büyütmek**. Ölçüt 1 (enerji) ile ölçüt 2 (korelasyon) aynı optimumu paylaşır. Bu, tek bir tahminci ile ikisinin birden karşılanabileceğini gösterir.

---

## 1. Gecikme tahmini

### 1.1 Zaman/frekans bölgesinde çapraz korelasyon

- **Ne yapar:** `r(τ) = Σ k(t) · b(t + τ)`; tepe noktası gecikmedir. FFT ile `r = IFFT(K · conj(B))`, maliyet `O(N log N)`.
- **Kaynak:** Knapp & Carter, "The generalized correlation method for estimation of time delay", *IEEE Trans. ASSP* 24(4), 1976.
- **Artı:** Basit, kararlı; hedef fonksiyonla (çapraz terim) **birebir aynı** büyüklüğü ölçer.
- **Eksi:** Tonal bas'ta korelasyon periyodiktir → periyodun katlarında neredeyse eşit tepeler (belirsizlik). Pencere kenarları sonucu çarpıtır.
- **Plugin'de:** Ana tahmincinin temeli; belirsizlik "en küçük |d|" kuralı ve güven skoruyla çözülür.

### 1.2 GCC-PHAT ve ağırlıklı GCC

- **Ne yapar:** Çapraz spektrum genliğe bölünür: `R = IFFT(G / |G|^β)`. β=1 PHAT, β<1 kısmi beyazlatma; SCOT ve ML (Hannan–Thomson) ağırlıkları da vardır.
- **Kaynak:** Knapp & Carter 1976; Carter, "Coherence and time delay estimation", *Proc. IEEE* 75(2), 1987.
- **Artı:** Tepeyi keskinleştirir, yankı/yayılmaya dayanıklı; geniş bantlı sinyalde (kick tık'ı) çok kesin gecikme.
- **Eksi:** Dar bantta (alt bant, birkaç FFT bin'i) düşük SNR'li bin'leri de yükseltir → gürültülü. **Enerji hedefini değil, saf gecikmeyi** ölçer; faz döndürmeyle birlikte kullanıldığında optimum enerji noktasını kaçırabilir.
- **Plugin'de:** Yardımcı tahminci (β ≈ 0,5–0,8) — tonal belirsizlikte "hangi periyot?" sorusunu kick'in geniş bantlı atağıyla çözmek için. VARSAYIM: faydası Python'da ölçülecek.

### 1.3 Analitik sinyalle karmaşık çapraz korelasyon (ana yöntem)

- **Ne yapar:** `k_a = k + j·H{k}`, `b_a = b + j·H{b}` (H = Hilbert). Karmaşık korelasyon `c(τ) = Σ k_a(t) · conj(b_a(t − τ))`.
  - `|c(τ)|` → döndürme serbestken o gecikmede ulaşılabilecek en iyi çapraz terim (korelasyonun zarfı);
  - `arg c(τ)` → o gecikme için en iyi `θ`.
  - Böylece `(d, θ)` **tek geçişte** bulunur. İşaret kuralı (θ = +arg mi −arg mi) testle sabitlenecek.
- **Kaynak:** Analitik sinyal: Gabor 1946; karmaşık korelasyon zarfı: Bendat & Piersol, *Random Data*, 4. baskı, Wiley 2010, Hilbert dönüşümü bölümü.
- **Artı:** Hedef fonksiyonun (E) tam optimumunu verir; "yalnız gecikme" modunda `Re c(τ)`, "yalnız faz" modunda `τ=0`'daki `arg c`, "ikisi" modunda `|c|` tepesi kullanılır — üç kullanıcı seçimi aynı hesaptan çıkar.
- **Eksi:** Dar bantta `|c(τ)|` geniş ve yayvan → `d` belirsiz (ama `θ` bunu telafi eder; enerji yine optimumdadır). Hilbert'in alt frekans doğruluğu gecikme ister (bkz. 3).
- **Plugin'de:** Ana tahminci. Analiz arka plan thread'inde, alt banda indirgenmiş (desimasyonlu) sinyalde yapılır.

### 1.4 Örnek altı tepe inceltme

- **Ne yapar:** Tamsayı tepe çevresindeki 3 noktaya parabol (ya da Gauss) oturtma; FFT'de sıfır doldurma (bant sınırlı ara değerleme); çapraz spektrum fazına doğru oturtma (faz eğimi = gecikme, coherence ağırlıklı).
- **Kaynak:** Moddemeijer, "On the determination of the position of extrema of sampled correlators", *IEEE Trans. SP* 39(1), 1991; Jacobsen & Kootsookos, "Fast, accurate frequency estimators", *IEEE SP Magazine* 24(3), 2007.
- **Artı/eksi:** Parabol ucuz ama tamsayıya doğru sapar (bias, bant genişliğine bağlı); sinc ara değerleme yansız ama pahalı; faz-eğimi geniş bantta çok kesin, dar bantta zayıf.
- **Plugin'de:** Parabol ile tohum → bant sınırlı hedefte Brent araması ile inceltme. Hedef: ≤ 0,1 ms (48 kHz'te 4,8 örnek — örnek altı doğruluk zorunlu değil ama 192 kHz'te de ms cinsinden tutarlı olmalı). Düşük örnekleme hızına indirilmiş analizde (ör. 1,5 kHz → 0,67 ms/örnek) örnek altı inceltme **zorunludur**.

---

## 2. Kesirli gecikme

| Yöntem | Kaynak | Artı | Eksi | Değişen gecikme |
|---|---|---|---|---|
| Pencereli sinc (Kaiser, N=32–64) | Laakso, Välimäki, Karjalainen, Laine, "Splitting the unit delay", *IEEE SP Mag.* 13(1), 1996 | Tüm bantta düz genlik ve faz | N/2 örnek ek gecikme, N çarpım/örnek | Katsayı tablosu (çok fazlı) ile mümkün |
| Lagrange (3.–7. derece) | Laakso vd. 1996 | **DC civarında maksimum düz** → bas için ideal; ucuz | Yüksek frekansta genlik düşüşü | İyi |
| Farrow yapısı | Farrow, "A continuously variable digital delay element", *IEEE ISCAS* 1988 | Kesir değişince katsayı yeniden hesaplanmaz; yumuşak modülasyon | Lagrange/sinc'e göre biraz daha çok işlem | **En iyi** |
| Thiran tüm-geçiren | Thiran, "Recursive digital filters with maximally flat group delay", *IEEE Trans. Circuit Theory* 18(6), 1971 | Genlik tam düz, çok ucuz | Özyinelemeli: gecikme değişince geçici olay (transient); yüksek frekansta faz hatası | Kötü |

**Gecikme değişimi:**
- **Rampa (sürekli kaydırma)** perdeyi Doppler etkisiyle kaydırır. ÖLÇÜLDÜ: 100 ms'de 1 ms'lik rampa ≈ **17,4 cent** (duyulur); saniyede 0,1 ms ≈ **0,17 cent** (duyulmaz).
- **Çift gecikme hattı + crossfade:** yeni `d` ikinci hatta kurulur, 10–50 ms eşit kazançlı geçiş. Geçiş anında iki kopya kısa süre toplanır (tarak filtresi), ama perde kaymaz.

**Plugin'de (VARSAYIM, Python'da ölçülecek):** Farrow-Lagrange (5. derece) varsayılan aday; pencereli sinc karşılaştırma için. Sıçramalarda (Learn, Her vuruşta, Nota başına) crossfade; Sürekli takipte hız sınırlı rampa (≤ 0,1 ms/s ölçeğinde). Seçim, ideal FFT gecikmesine karşı null testi ve CPU ölçümüyle yapılacak.

---

## 3. Frekanstan bağımsız faz döndürme

**Formül:** `y = x · cos θ − H{x} · sin θ`. θ=0 → `y = x`; θ=180° → polarite ters; θ=90° → Hilbert.

### 3.1 FIR Hilbert (doğrusal fazlı)

- **Kaynak:** Oppenheim & Schafer, *Discrete-Time Signal Processing*, 3. baskı, Hilbert dönüştürücü tasarımı.
- **Artı:** `x` aynı gecikmeyle alınırsa θ=0'da **bit-düzeyinde x** — null testi geçer. Faz tüm bantta tam 90°.
- **Eksi:** Alt frekans doğruluğu uzunluk ister → gecikme. ÖLÇÜLDÜ (48 kHz, Blackman pencereli ideal Hilbert, genlik hatası):

  | Yarı-boy (= ek gecikme) | 25 Hz | 30 Hz | 41 Hz | 55 Hz | 82 Hz | 120 Hz |
  |---|---|---|---|---|---|---|
  | 10 ms | −7,9 dB | −6,5 dB | −4,2 dB | −2,3 dB | −0,6 dB | −0,03 dB |
  | 25 ms | −1,7 dB | −0,9 dB | −0,15 dB | 0,00 | 0,00 | 0,00 |
  | 50 ms | −0,02 dB | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |

  Optimize tasarım (Remez/en küçük kareler) daha kısa olabilir; ama mertebe aynı: **41 Hz için ~25 ms, 25 Hz için ~50 ms.**
- **Maliyet:** 48 kHz'te 2400 dokunuş; alt bant önce desimasyonla (ör. ÷16 → 3 kHz) indirgenirse ~150 dokunuş. Yine de gecikme ms cinsinden aynıdır.

### 3.2 IIR tüm-geçiren çifti (90° faz farkı ağı)

- **Kaynak:** Olli Niemitalo, "Hilbert transform" (IIR 90° faz farkı katsayıları, yeg.fi); Regalia, Mitra & Vaidyanathan, "The digital all-pass filter: a versatile signal processing building block", *Proc. IEEE* 76(1), 1988.
- **Ne yapar:** İki tüm-geçiren zinciri A ve B; çıkışları arasında geniş bantta ~90° fark. `y = A·cos θ − B·sin θ`.
- **Artı:** **Sıfır gecikme**, çok ucuz.
- **Eksi:** A'nın kendisi frekansa bağlı faz kaydırır → θ=0'da bile `y ≠ x` (faz dağılması). Alt bant ile üst bant arasındaki faz ilişkisi bozulur; null testi geçmez.

### 3.3 Seçim (VARSAYIM)

Plugin zaten sabit `L = 50 ms` gecikme bildirecek (negatif kayma için). Bu bütçenin bir kısmı FIR Hilbert'e verilebilir. Ancak bütçe paylaşılır:

```
L ≥ max(−d) + Hilbert yarı-boyu + crossover yarı-boyu (lineer fazlı ise) + lookahead
```

Öneri: "Tam" modda FIR Hilbert (25 ms yarı-boy, 41 Hz'te −0,15 dB), "Düşük" modda IIR çifti. Kesin sayılar Python'da enerji ölçütüyle (ölçüt 1) belirlenecek.

---

## 4. Frekansa bağlı faz (gelişmiş)

- **Ne yapar:** 2. dereceden tüm-geçiren bölümler (merkez frekans + Q) belirli bir frekans çevresinde fazı döndürür; zincirleme (Disperser mantığı) grup gecikmesini frekansa göre değiştirir. Grup gecikmesi `τ_g = −dφ/dω`.
- **Kaynak:** Robert Bristow-Johnson, "Audio EQ Cookbook" (W3C notu olarak yayımlandı) — tüm-geçiren biquad; Regalia vd. 1988.
- **Artı:** Doğru (d, θ) modelinin kapatamadığı kalan faz eğriliğini düzeltebilir (ör. bas sentezindeki filtrelerin fazı).
- **Eksi:** Kullanıcıya açıklaması zor; transient'i "yayar" (smearing).
- **Plugin'de:** 1. sürümde yok. "Nota başına" mod, notalar arası farkı zaten karşılıyor. Python raporunda "ideal sınır" ile "(d, θ) sınırı" arasındaki fark bu özelliğin gerekip gerekmediğini gösterecek.

---

## 5. Crossover

### 5.1 Linkwitz–Riley LR4

- **Kaynak:** Linkwitz, "Active crossover networks for noncoincident drivers", *JAES* 24(1), 1976; Lipshitz & Vanderkooy, "In-phase crossover network design", *JAES* 34(11), 1986.
- **Ne yapar:** İki ardışık 2. derece Butterworth. `LP + HP` toplamı genlikte düz bir **2. derece tüm-geçirendir** (AP2).
- **Artı:** Sıfır gecikme, ucuz; bantlar fc'de aynı fazda.
- **Eksi:** Toplam `AP2(x)`, yani `x`'in kendisi değil → saf gecikmeli kopyayla null testinde fark kalır. Üst bant işlenmeden bırakılsa bile, alt bant `d, θ` ile değişince fc çevresinde toplam artık düz olmayabilir (iki bandın örtüştüğü bölge).
- **Telafi:** Alt bandın işlem zincirine konulan her faz kaydırması, fc civarında üst bantla etkileşir. Spec ölçütü ±0,05 dB sadece "hizalama nötr" durumda (d=0, θ=0) ölçülür; aktif hizalamada fc civarındaki etki raporlanır.

### 5.2 Doğrusal fazlı FIR crossover

- **Ne yapar:** `LP_FIR`, `HP = gecikme − LP_FIR` (tamamlayıcı) → toplam **tam olarak gecikmiş x**; null testi geçer.
- **Eksi:** 40 Hz civarında keskin bir LP için uzun filtre → gecikme (fc=40 Hz, 4. derece eşdeğeri eğimde onlarca ms). Doğrusal faz ön-yankı (pre-ringing) yapar, ama bu alt bantta ve bas'ta (kick'te değil) olduğu için kritik değil.
- **Plugin'de:** LR4 varsayılan (spec), lineer faz seçenek. Lineer fazın gecikme maliyeti Python'da fc'ye göre tablo hâline getirilecek.

---

## 6. Vuruş (onset) tespiti

- **Kaynak:** Bello, Daudet, Abdallah, Duxbury, Davies, Sandler, "A tutorial on onset detection in music signals", *IEEE Trans. Speech & Audio Proc.* 13(5), 2005; Dixon, "Onset detection revisited", *DAFx* 2006.
- **Yöntemler:** spektral akı (spectral flux), enerji türevi, faz sapması, karmaşık alan.
- **Bizim durumumuz:** Sidechain **izole kick kanalıdır** — müzik karışımı değil. Bu yüzden ağır spektral yöntemler gereksiz; yeterli olan:
  - alt geçirgen (~150 Hz) + hızlı atak/yavaş bırakma zarf takipçisi;
  - uyarlanır eşik (kayan ortanca + δ);
  - histerezis ve yeniden tetikleme kilidi (ör. 60 ms) → çift tetik olmaz.
- **Neden kesin olması gerekmiyor:** Onset sadece analiz penceresinin yerini belirler; hizalamayı korelasyon yapar. Pencere onset'ten ~5 ms önce başlatılır (tampon geçmişten okunur).
- **Plugin'de:** Kick'e özel düşük bant tetik; spektral akı yedek olarak (tık ağırlıklı, alt bandı zayıf kick'ler için). VARSAYIM: 5 kick karakterinde ≥ %99 doğru tetik Python'da ölçülecek.

---

## 7. Perde (bas notası) tespiti

- **Kaynak:** de Cheveigné & Kawahara, "YIN, a fundamental frequency estimator for speech and music", *JASA* 111(4), 2002; Mauch & Dixon, "pYIN: A fundamental frequency estimator using probabilistic threshold distributions", *IEEE ICASSP* 2014; Hermes, "Measurement of pitch by subharmonic summation", *JASA* 83(1), 1988.
- **Artı/eksi:** YIN basit ve gürbüz; pYIN oktav hatalarını HMM ile azaltır ama gecikmeli (geçmişe bakar). Harmonik toplam zengin harmonikli bas'ta iyi, saf sinüste gereksiz.
- **Pencere–gecikme ödünleşimi:** En az 2 periyot gerekir (tablo, bölüm 0): E0 için ~97 ms, E1 için ~49 ms.
- **Bizim avantajımız:** Notayı **kick'ten önce** de ölçebiliriz — bas çoğunlukla kick'ten önce başlar ya da sürer. Ayrıca plugin çıkışı `L` kadar geciktiği için onset'ten sonrasını da (bkz. 9) görebiliriz.
- **Ek yöntem:** Alt banttaki analitik sinyalin anlık frekansı (faz türevi) tek sesli, sinüse yakın bas için ucuz ve hızlıdır; YIN ile çapraz kontrol.
- **Plugin'de:** "Nota başına" modunda YIN tabanlı, oktav-düzeltmeli, nota (yarım ton) seviyesine yuvarlanmış tespit. Mod tablo anahtarı = MIDI nota numarası. VARSAYIM: pYIN'in HMM katmanı gerçek zamanda gerekli mi, Python'da karar verilecek.
- **Fikir (araştırılacak):** MIDI girişi. Ableton'da ses efektine MIDI yönlendirmek kısıtlı; yine de destekleyen host'larda bas klibinin MIDI notası doğrudan anahtar olabilir.

---

## 8. Ölçerler

| Ölçer | Formül | Kaynak | Not |
|---|---|---|---|
| Pearson korelasyonu | `Σ k·b / √(Σk²·Σb²)` (alt bant, kick penceresi) | — | Ölçüt 2. Ortalama çıkarılmaz (ses sinyali, DC ≈ 0) — VARSAYIM, raporda belirtilecek |
| İptal ölçer | `10·log10(E(k+b) / (E(k)+E(b)))` dB | — | +3 dB = mükemmel tutarlı toplam (eşit genlik), 0 dB = ilişkisiz, −∞ = tam iptal |
| Coherence (genlik-kare) | `|G_kb|² / (G_kk·G_bb)`, Welch ortalaması | Carter 1987 | Faz grafiğinde güvenilmez bölgeleri soluklaştırmak için |
| Frekansa göre faz farkı | `arg G_kb(f)`, coherence ağırlıklı | Bendat & Piersol 2010 | Grafikte doğru = (d, θ) ile düzeltilebilir; eğri = frekansa bağlı faz |
| XY (Lissajous) | x = kick, y = bas | — | 45° çizgi = aynı faz; çember = 90°; −45° = ters faz |

---

## 9. Negatif gecikme ve PDC

**Mekanizma:** Plugin host'a `L` örnek gecikme bildirir; host diğer bütün kanalları `L` kadar geciktirir (gecikme telafisi, PDC). Plugin bas'ı içeride `L + d` kadar geciktirirse bas'ın kick'e göre **etkin kayması `d`** olur; `d` negatif de olabilir (en fazla `−L`).

**"Bedava" lookahead:** Çıkıştaki `T` anı, girişteki `T − L − d` anına karşılık gelir. t0'daki kick vuruşu için karar, çıkış t0'a ulaştığında, yani gerçek zamanda `t0 + L + d` anında hazır olmalıdır. O ana kadar girişte görülebilen kick süresi:

```
kullanılabilir lookahead = L + d
```

- d = +50 ms, L = 50 ms → 100 ms ileriyi görebiliriz;
- d = 0 → 50 ms;
- d = −50 ms → **0 ms** (lookahead yok).

Yani negatif kayma lookahead'i yer. "Her vuruşta" modunda W = 40 ms pencere her `d` için garanti edilecekse `L = 50 + 40 = 90 ms` gerekir ("Tam + lookahead"). Spec bu tabloyu kesinleştirecek.

**Sidechain ve PDC:** Host'un sidechain sinyalini ana girişle hizalayıp hizalamadığı host'a bağlıdır. Bizim için kritik: kick ve bas plugin girişine **aynı anda** gelmeli. Ableton davranışı için araştırma bulguları `rakipler.md` ekinde; kesin doğrulama Ableton testinde (spec 6.3, madde 3). VARSAYIM olarak bırakılmayacak.

**Gecikme değiştirme:** Bildirilen gecikme sadece "Gecikme modu" değişince güncellenir; otomasyonla değişen bir parametre gecikmeyi asla değiştirmez.

---

## 10. Tempo senkronu (host'tan zaman bilgisi)

| API | Nereden | Ne gelir |
|---|---|---|
| JUCE | `getPlayHead()->getPosition()` → `Optional<PositionInfo>` | `getPpqPosition()`, `getBpm()`, `getIsPlaying()`, `getPpqPositionOfLastBarStart()`, `getTimeSignature()` — her biri `Optional`, host vermezse boş |
| VST3 | `ProcessData::processContext` (`ProcessContext`) | `projectTimeMusic` (PPQ), `tempo`, `barPositionMusic`, `state` bayrakları (`kPlaying`, `kTempoValid`, `kProjectTimeMusicValid`…) |
| AU v2 | `HostCallbackInfo` (`beatAndTempoProc`, `musicalTimeLocationProc`, `transportStateProc2`) | vuruş, tempo, ölçü, çalma durumu |
| CLAP | `clap_process.transport` (`clap_event_transport`) | `song_pos_beats` (sabit nokta, `CLAP_BEATTIME_FACTOR`), `tempo`, `flags` (`CLAP_TRANSPORT_IS_PLAYING`…) |

**Plugin'de:** Yalnız JUCE `PositionInfo` kullanılır; her alan `Optional` kontrol edilir. Bilgi yoksa (host durmuş, offline render başlangıcı) osiloskop kick tetiğine düşer. Döngü (loop) atlamasında PPQ geri sıçrar → tempo senkron penceresi sıfırlanır. API ayrıntıları araştırma notlarıyla doğrulanacak (bkz. `rakipler.md` ek).

---

## 11. Kararlar ve açık sorular (Python aşamasına devredilenler)

1. Kesirli gecikme: Farrow-Lagrange 5. derece mi, pencereli sinc mi? → null testi + CPU.
2. Hilbert: FIR (25 ms) mi, IIR çifti mi, mod bazlı mı? → ölçüt 1 ve null testi.
3. Analiz örnekleme hızı (desimasyon katsayısı) ve pencere boyu (varsayılan 40 ms yeterli mi, 41 Hz bas için 2 periyot = 48,5 ms).
4. GCC-PHAT yardımcısı tonal belirsizliği gerçekten azaltıyor mu?
5. Nota tespiti: YIN mi, pYIN mi; kick'ten önceki bas bölümü yeterli mi?
6. `L` değerleri: Düşük / Tam / Tam+lookahead için kesin ms.
7. Ortalama çıkarmadan Pearson (ölçüt 2'nin tam tanımı).
