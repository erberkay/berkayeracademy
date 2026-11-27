# Kick–Bas Faz Hizalama Plugin'i — Geliştirme Talimatı

> Bu metni boş bir klasörde açılan yeni bir Claude Code oturumuna olduğu gibi yapıştır.
> Tüm çalışma bu klasörde yürür; başka repoya dokunma.

---

## 0. Rolün ve hedef

Sen bir ses DSP mühendisi ve plugin geliştiricisisin. Görevin, **kick ile bası faz ve zaman olarak hizalayan**, içinde **kick'e kilitli bir osiloskop** bulunan bir ses plugin'i geliştirmek (VST3 / AU / CLAP).

Plugin **bas kanalına** takılır, **kick sidechain girişine** bağlanır. Yalnız bası işler; kick'e asla dokunmaz.

Çalışma adı: **KB-Align** (geçici). Kalıcı ad için kullanıcıya sor ve önerdiğin adların marka/ürün çakışmasını araştır.

İş sırası değişmez:
1. Araştırma
2. Spesifikasyon
3. Python'da algoritma kanıtı
4. JUCE ile plugin
5. Doğrulama
6. Yayın hazırlığı

Bir aşamanın kabul ölçütleri sağlanmadan sonrakine geçme.

---

## 1. Değişmez kurallar

1. **Kullanıcıya sormadan yapılmayacaklar:**
   - para gerektiren her şey: JUCE ticari lisansı, Apple Developer hesabı, kod imzalama sertifikası, ücretli kütüphane ya da örnek paketi, rakip plugin satın almak;
   - imzalama ve notarization;
   - herhangi bir mağazaya, siteye ya da GitHub'a public yayın;
   - lisans seçimi (GPL / AGPL / ticari).
2. **Rakiplerden kod, grafik, ad ya da preset kopyalama.** Yalnız fikir ve özellik düzeyinde incele. Açık kaynaklı projelerin (ör. PhasePaw) kodunu okumadan önce lisansını kontrol et. Kapalı kaynaklı bir ürün düşünülüyorsa GPL kodu türetme; sadece yöntemi kaynak göstererek kendin yaz.
3. **Ölçmediğin hiçbir şeyi "çalışıyor" diye raporlama.** Her iddiaya bir test, sayı ya da grafik bağla.
4. **Gerçek zaman kuralları:**
   - ses thread'inde bellek ayırma, kilit, dosya işlemi ya da log yok;
   - analiz ayrı bir thread'de çalışır;
   - ses ile arayüz arasındaki veri lock-free FIFO ya da atomic ile taşınır.
5. **Belirsiz yerleri tahmin etme.** "VARSAYIM:" diye işaretle ve özet raporunda listele.
6. **Mac gerektiren adımlar.** Bu ortam Linux ise AU derlemesi, `auval`, imzalama ve Ableton testleri kullanıcının Mac'inde yapılır. Bu adımlar için kullanıcıya adım adım bir kontrol listesi hazırla; yapmış gibi davranma.

---

## 2. Aşama 1 — Araştırma

**Çıktı:** `docs/arastirma/rakipler.md` ve `docs/arastirma/dsp-yontemleri.md`.

Her ürün için şunları çıkar:
- ne yapıyor;
- hangi hizalama yöntemini kullanıyor (sadece gecikme mi, faz döndürme mi, frekansa bağlı faz mı, tek seferlik mi, sürekli mi);
- kullanıcı akışı (kaç tıklama);
- gecikme / PDC davranışı;
- sidechain gerekiyor mu;
- desteklenen formatlar;
- fiyat;
- kullanıcıların şikâyetleri (forum ve inceleme yorumları);
- ekran görüntüsünün sözlü tarifi.

### 2.1 Hizalama / faz araçları

- Sound Radix **Auto-Align 2**, **Auto-Align Post 2**, **Pi**
- MeldaProduction **MAutoAlign**
- Waves **InPhase**
- **PhaseKicker**
- **PhaseLock** (Cycling '74 / Max for Live, 2.5)
- Audioblob **DeepPerfection**
- SSL **X-Phase**
- Voxengo **PHA-979**
- Little Labs **IBP** (UAD)
- Kilohearts **Disperser**
- iZotope **Neutron Phase** modülü
- JMG **DropKick**

### 2.2 Osiloskoplar

- **Oszillos Mega Scope** (ve kılavuzu)
- Audija **OScope**
- **Scyllascope**
- MeldaProduction **MOscilloscope**

### 2.3 Kaynaklar

Başlıkla ara, bulunan sayfanın URL'sini rapora yaz:

- Bedroom Producers Blog – PhaseKicker
- Noizefield – PhaseKicker
- Integraudio – 7 phase alignment plugins
- Audiophiles – Best phase alignment plugins 2026
- Jelly – PhaseLock reviews
- Audioblob – DeepPerfection
- Cycling '74 – PhaseLock 2.5
- Sound Radix – Auto-Align
- Introducing Auto-Align 2
- Auto-Align 2.2 manual
- Auto-Align Post 2
- Sound Radix Pi
- Oszillos Mega Scope
- Oszillos manual
- Scyllascope
- PhasePaw (GitHub) — önce lisansı oku
- KVR – oscilloscope alignment (forum başlığı)
- Soundbridge – PHA-979 kick/bass
- Mastering The Mix – Automatic phase fixing
- iZotope – Neutron Phase
- SSL X-Phase
- Sound On Sound – JMG DropKick

Ek olarak üretici kılavuzlarına, KVR, Gearspace ve Reddit (r/audioengineering, r/edmproduction, r/ableton) tartışmalarına bak.

Bir kaynağa ulaşamazsan bunu açıkça yaz; içeriğini uydurma.

### 2.4 İncelenecek DSP yöntemleri

`dsp-yontemleri.md` dosyasında her yöntem için şunları yaz: kısa açıklama, kaynak (makale / kitap / doküman), artı ve eksileri, bu plugin'de nerede kullanılacağı.

- **Gecikme tahmini:**
  - zaman ve frekans bölgesinde çapraz korelasyon;
  - GCC-PHAT ve ağırlıklı GCC;
  - analitik sinyalle (Hilbert) karmaşık çapraz korelasyon: tepe noktasının konumu gecikmeyi, açısı faz döndürmeyi aynı anda verir;
  - parabolik / sinc ile tepe inceltme (örnek altı çözünürlük).
- **Kesirli gecikme:**
  - pencereli sinc;
  - Lagrange ve Farrow yapısı;
  - Thiran allpass;
  - gecikme değişirken iki gecikme hattı arasında crossfade (zipper ve Doppler olmasın).
- **Frekanstan bağımsız faz döndürme:**
  - Hilbert dönüştürücü: IIR allpass çifti ya da FIR;
  - formül: `y = x·cosθ − H{x}·sinθ`.
- **Frekansa bağlı faz:**
  - allpass zincirleri (IBP / Disperser mantığı);
  - grup gecikmesi.
- **Crossover:**
  - Linkwitz–Riley LR4 ve üst bant faz telafisi;
  - lineer fazlı FIR seçeneği ve getirdiği gecikme.
- **Vuruş (onset) tespiti:**
  - spektral akı;
  - enerji türevi;
  - kick'e özel düşük bant tetik;
  - yanlış tetiklemeye karşı histerezis.
- **Perde (bas notası) tespiti:**
  - YIN ve pYIN;
  - harmonik toplam;
  - düşük frekansta pencere uzunluğu ile gecikme arasındaki ödünleşim.
- **Ölçerler:**
  - Pearson korelasyonu;
  - coherence;
  - çapraz spektrumdan frekansa göre faz farkı (coherence ağırlıklı);
  - iptal ölçümü: `E(k+b)` ile `E(k)+E(b)` karşılaştırması, dB cinsinden.
- **Negatif gecikme:** PDC (gecikme bildirimi) ile nasıl yapılır; Ableton sidechain sinyalinin PDC'den nasıl etkilendiği.
- **Tempo senkronu:** host'tan PPQ, BPM ve oynatma durumu nasıl okunur (VST3 / AU / CLAP farkları).

### 2.5 Özellik tablosu ve boşluk analizi

`rakipler.md` dosyasının sonunda iki bölüm olsun:

**Özellik tablosu.** Satırlar ürünler; sütunlar şunlar:
- otomatik gecikme
- faz döndürme
- frekansa bağlı faz
- vuruş başına analiz
- nota başına hafıza
- sürekli takip
- negatif gecikme
- örnek altı hassasiyet
- dahili osiloskop
- kick'e kilitli tetik
- tempo senkronu
- alt bant crossover
- Bass Mono
- sidechain ducking
- gecikme (ms)
- formatlar
- fiyat

**Rakiplerin zayıf yanları ve bizim cevabımız.** Özellikle şu konuya bak: **bas notası değişince hizalamanın bozulması.** Aynı zaman kayması farklı notalarda farklı faz derecesi demektir: `φ = 360° · f · Δt`. Örneğin 1 ms kayma 41 Hz'te yaklaşık 15°, 82 Hz'te yaklaşık 30°'dir. Hangi ürünün bunu çözdüğünü, hangisinin çözmediğini kanıtla birlikte yaz.

**Aşama sonu:** Kullanıcıya bir sayfalık özet sun: en güçlü 3 rakip, yakalanan 3 boşluk, önerdiğin değişiklikler. Onay almadan spesifikasyona geçme.

---

## 3. Aşama 2 — Spesifikasyon

**Çıktı:** `docs/spec.md`. Aşağıdaki maddeler minimumdur. Araştırma daha iyi bir yol gösterirse gerekçesiyle öner.

### 3.1 Sinyal akışı

```
Bas girişi ─┬─ Crossover (LR4, fc 40–300 Hz, varsayılan 120 Hz)
            │     ├─ ALT BANT → Kesirli gecikme (±50 ms) → Faz döndürme (0–360°) → Bass Mono → Ducking ─┐
            │     └─ ÜST BANT → yalnız sabit PDC gecikmesi (işlenmez) ──────────────────────────────────┤
            │                                                                                          ├─→ Çıkış
            └─ (Crossover KAPALI ise tüm sinyal gecikme + faz yolundan geçer) ─────────────────────────┘

Kick sidechain ─→ Onset tespiti + analiz (yalnız ölçüm, çıkışa gitmez) ─→ Hizalama motoru ─→ (d, θ)
```

- Crossover açıkken iki bandın toplamı genlikte düz olmalı (`|H| = 1`, sapma ±0,05 dB). Hizalama kapalıyken üst bant ile alt bantın faz ilişkisi korunmalı.
- **Kick hiçbir zaman çıkışa gitmez.** Bu "kick transient'i değişmez" garantisinin temelidir.
- İsteğe bağlı **dinleme** düğmesi: Bas / Kick+Bas önizleme. Varsayılan kapalıdır. Önizlemede kick iki kez duyulabileceği için arayüzde uyarı gösterilir.

### 3.2 Osiloskop

- **İzler:** Kick, Bas (hizalanmış), Toplam (kick + bas). Her birinin rengi ayrıdır, ayrı ayrı açılıp kapanır, görünürlük kaydı tutulur.
- **Tetik:**
  - (a) kick vuruşuna kilitli: onset 0 ms noktasına oturur, ön-tetik −5…−50 ms;
  - (b) tempo senkronu: 1/16…4 ölçü pencere, host PPQ'ya kilitli;
  - (c) serbest.
- **Görüntü filtresi:** yalnız alt bandı gösterir (aynı crossover frekansı ya da ayrı ayar). **Sadece görüntüyü etkiler, sesi değil.**
- **Zaman ekseni:** 1–500 ms yakınlaştırma; ortalama alma (N vuruş); kalıcılık (persistence); dondurma.
- **İki imleç (A/B):** Δ değeri **ms**, **örnek** ve **derece** cinsinden gösterilir. Derece, seçilen referans frekansa göre hesaplanır: tespit edilen bas notası ya da elle girilen değer.
- **Sürükleyerek kaydırma:** bas izini yatay sürüklemek pre-delay değerini değiştirir.
  - Shift ile ince ayar (×0,1);
  - çift tık ile sıfırlama;
  - imleç örnek altı konuma yerleşebilir.
- **Ölçerler:**
  - **Korelasyon:** alt bant, kick penceresi içinde, −1…+1.
  - **İptal ölçer:** `10·log10(E(k+b) / (E(k)+E(b)))` dB. Pozitif değer güçlenme, negatif değer iptal demektir.
  - **Frekansa göre faz farkı grafiği:** 20–300 Hz, coherence düşük olan bölgeler soluk gösterilir.
  - **XY (Lissajous):** kick X ekseninde, bas Y ekseninde.

### 3.3 Otomatik hizalama — dört mod

Her mod `(d, θ)` üretir: `d` zaman kayması (ms), `θ` faz döndürme (°). Kullanıcı hangi parametrelerin otomatik olacağını seçer: yalnız gecikme / yalnız faz / ikisi birden.

1. **Learn (tek tuş):**
   - basıldıktan sonra N vuruş dinlenir (varsayılan 8, ayar 1–32);
   - her vuruş için `(d, θ)` hesaplanır;
   - sonuçların dairesel/robust ortancası alınır, değer dondurulur;
   - arayüz bir güven skoru ve vuruşlar arasındaki dağılımı gösterir.
2. **Her vuruşta:**
   - her kick onset'inde analiz penceresi (varsayılan 40 ms, ayar 10–120 ms) içinde yeniden hesaplanır;
   - değişim crossfade ile uygulanır.
   - Analiz geleceği görmek zorunda olduğu için lookahead gerekir. Bunun gecikmeye etkisini (bkz. 3.4) spesifikasyonda açıkça hesapla.
   - Lookahead kapalıysa sonuç **bir sonraki vuruşa** uygulanır. Bu seçenek de sunulur.
3. **Bas notasına göre** (ana farkımız):
   - her vuruşta bas notası tespit edilir (pYIN, alt bant);
   - nota → `(d, θ)` tablosu öğrenilir;
   - aynı nota tekrar gelince tablodaki değer kullanılır;
   - hiç görülmemiş notada en yakın notadan faz/zaman ilişkisiyle tahmin yapılır;
   - tablo arayüzde düzenlenebilir: kilit, sil, elle değer gir.
   - Gerekçe: aynı zaman kayması farklı notada farklı faz derecesidir (`φ = 360°·f·Δt`).
4. **Sürekli takip:**
   - kayan pencereyle sürekli tahmin yapılır;
   - zaman sabiti (50 ms–5 s) ve histerezis ayarlanır;
   - değişen bas hatları ve canlı performans içindir;
   - titreşim yapmaması için değişim hızı sınırlanır.

**Ortak kurallar:**
- Kick yoksa (sessiz sidechain) motor son değeri korur.
- Güven skoru eşiğin altındaysa değer güncellenmez.
- Gecikme belirsizliği (bas periyodunun katları) varsa en küçük `|d|` seçilir. Bu tercih ayarlanabilir.

### 3.4 Pre-delay ve gecikme bütçesi

- Aralık **±50 ms**, çözünürlük **0,01 ms** veya daha iyisi. Gösterim ms / örnek / derece arasında değiştirilebilir.
- **Negatif gecikme** şöyle sağlanır: plugin host'a sabit `L = 50 ms (+ lookahead)` gecikme bildirir ve bası içeride `L + d` kadar geciktirir. Böylece etkin kayma `d ∈ [−50, +50]` ms olur.
- Bildirilen gecikme **çalışırken değişmez** (Ableton'da gecikme değiştirmek sorun çıkarır). Sadece "Gecikme modu" ayarı değişince güncellenir:
  - **Düşük:** ±10 ms;
  - **Tam:** ±50 ms;
  - **Tam + lookahead.**
- Sidechain'den gelen kick de host tarafından PDC'ye tabi tutulabilir. Ableton'da gerçek davranışı 6.3'teki testle doğrula ve sonucu spesifikasyona yaz. VARSAYIM olarak bırakma.
- Tüm örnekleme hızlarında doğru çalışmalı: 44,1 / 48 / 88,2 / 96 / 176,4 / 192 kHz. 50 ms, 192 kHz'te 9600 örnek eder.

### 3.5 Ek özellikler

- **Faz döndürme 0–360°:** frekanstan bağımsız, Hilbert tabanlı, yalnız alt bantta. Tam tur sarmalı (wrap) olarak çalışır; otomasyonda kesinti olmaz.
- **Crossover:**
  - LR4 (varsayılan) ya da lineer faz (ek gecikme);
  - fc 40–300 Hz;
  - "alt bant solo" dinleme.
- **Bass Mono:** fc altındaki side (S) bileşeni sıfırlanır. Ayrı frekans ayarı ve genişlik kontrolü vardır.
- **Sidechain ducking eğrisi:**
  - kick'te ya da tempo senkronuyla tetiklenen, kullanıcının çizdiği zarf: noktalar, eğrilik, 1/4…1 ölçü ya da ms;
  - derinlik ve karışım (mix) ayarı;
  - yalnız alt banda ya da tüm sinyale uygulanabilir.
  - **Varsayılan preset kullanıcının kendi çizdiği eğridir.** İşe başlarken kullanıcıdan bu eğrinin noktalarını ya da görselini iste. Gelene kadar yer tutucu bir eğri kullan ve "VARSAYIM" diye işaretle.
- **Preset sistemi:**
  - fabrika ve kullanıcı presetleri;
  - A/B karşılaştırma;
  - geri al / yinele;
  - tüm parametreler host otomasyonuna açık.
- **Bypass:** gecikmeyi koruyan, tıklama yapmayan bypass.

### 3.6 Arayüz

- Ölçeklenebilir arayüz (%75–200), HiDPI desteği.
- Osiloskop ana alandadır; mod, pre-delay ve faz kontrolleri hemen altında durur.
- Klavye ile kullanılabilir.
- Renk körlüğüne uygun iz renkleri; izler yalnız renkle değil çizgi tipiyle de ayrılır.

---

## 4. "%100 hizalama"nın ölçülebilir tanımı

"%100", aşağıdaki **dört ölçütün aynı anda** sağlanmasıdır. Her ölçütün nasıl ölçüldüğü test kodunda tanımlanır; raporda sayıyla yer alır.

1. **Alt bant enerjisi teorik sınırın en fazla 0,5 dB altında.**
   - **Teorik sınır:** plugin'in sunduğu parametre uzayında (d ±50 ms için 0,01 ms adım, θ için 1° adım) kaba kuvvetle bulunan en büyük `E(k_lp + b_lp(d, θ))`. Ölçüm kick penceresi içinde yapılır (onset'ten itibaren varsayılan 150 ms).
   - Raporda ayrıca bilgi amaçlı **ideal sınır** da verilir: frekans başına faz eşleşmesiyle elde edilebilecek tutarlı toplam, yani `Σ(|K(f)|+|B(f)|)²`.
2. **Korelasyon ≥ 0,95:** alt bant, kick penceresi içinde, kick ile hizalanmış bas arasında Pearson korelasyonu.
   - Not: kick ile bas penceresi içinde farklı baskın frekanslardaysa 0,95'e ulaşmak fiziksel olarak imkânsız olabilir.
   - Bu ölçüt **uyumlu test setinde** (aynı temel frekans bölgesi) zorunludur.
   - Diğer durumlarda ölçüt şudur: kaba kuvvet ile bulunan en iyi korelasyonun ≥ %98'i.
   - Bu ayrımı raporda açıkça göster.
3. **Gecikme hatası ≤ 0,1 ms:** bilinen kesirli kaymayla üretilmiş sentetik testlerde tahmin ile gerçek değer arasındaki fark. Tüm örnekleme hızlarında, %95 güven aralığında ölçülür.
4. **Kick transient'i değişmez:**
   - kick sinyali çıkışa hiç karışmaz;
   - crossover açıkken bas üst bandı, gecikme telafisinden sonra bypass yolu ile null testinde ≤ −100 dBFS fark verir;
   - hizalama kapalıyken tüm plugin, saf gecikmeli kopyaya karşı null testinde ≤ −100 dBFS fark verir (crossover kapalı modda).

**Ek kalite ölçütleri:**
- Gecikme ya da faz değişiminde tıklama yok: geçiş anındaki fark sinyalinde ani sıçrama ölçümü.
- CPU: 48 kHz'te ve 64 örnek tamponda, tek örnek başına bütçe ölçülür. Hedef: tek çekirdekte %2'nin altı.
- Learn modunda 8 vuruşla tutarlılık: tekrarlanan denemelerde d sapması ≤ 0,05 ms.

---

## 5. Aşama 3 — Python'da algoritma kanıtı

**Klasör:** `prototype/`. Kullanılacaklar: Python 3.11+, numpy, scipy, soundfile, matplotlib, pytest. Bağımlılıkları sabitle (`requirements.txt`, sürümlü).

### 5.1 Test verisi

`prototype/datasets.py` tekrarlanabilir (sabit seed) sentetik setler üretir:

- **Kick:**
  - sinüs sweep (ör. 150 → 45 Hz) + üstel zarf + tık transient'i;
  - 5 farklı karakter: kısa, uzun, 808 tipi, sert tıklı, yumuşak.
- **Bas:**
  - sinüs, testere + alçak geçiren, kare + filtre, FM;
  - notalar E0–C3;
  - legato ve staccato;
  - tek nota ve değişen nota dizileri.
- **Bilinen bozulmalar:**
  - kesirli zaman kayması (−20…+20 ms rastgele);
  - faz döndürme (0–360°);
  - kick ve bas arasında farklı atak zamanlaması;
  - gürültü (SNR 60 / 40 / 20 dB);
  - bas'ta sidechain ducking.
- **Örnekleme hızları:** 44,1 / 48 / 96 / 192 kHz.
- **Gerçek kayıtlar:** kullanıcıdan kick ve bas stem'leri iste (prodüktör; kendi projeleri vardır). Gelene kadar yalnız sentetik setle ilerle. Telifli örnek indirme.

### 5.2 Uygulanacaklar

- **`align.py`:**
  - onset tespiti;
  - karmaşık çapraz korelasyonla `(d, θ)` tahmini;
  - örnek altı tepe inceltme;
  - kaba kuvvet referansı (teorik sınır).
- **`modes.py`:** dört mod (Learn, Her vuruşta, Nota başına, Sürekli), gerçek zamanlıyı taklit eden blok blok işleme ile.
- **`pitch.py`:** pYIN tabanlı bas notası tespiti ve nota tablosu.
- **`dsp.py`:**
  - kesirli gecikme (en az iki yöntem karşılaştırmalı);
  - Hilbert faz döndürme;
  - LR4 crossover;
  - Bass Mono;
  - ducking zarfı.
- **`metrics.py`:** 4. bölümdeki tüm ölçütler.
- **`report.py`:** `prototype/rapor/` altına grafikler ve tek sayfalık bir `ozet.md` üretir:
  - ölçüt tablosu;
  - başarısız durumlar;
  - modların karşılaştırması;
  - nota değişen basta "sabit hizalama" ile "nota başına hizalama" farkı (dB ve korelasyon).

### 5.3 Kabul

- `pytest` tamamen yeşil olmalı.
- 4. bölümdeki ölçütler sentetik setin en az %98'inde sağlanmalı; kalanlar rapora gerekçesiyle yazılmalı.
- Yöntem seçimleri (hangi kesirli gecikme, pencere boyu, lookahead) **ölçüme dayanarak** sabitlenip `docs/spec.md`'ye işlenmeli.
- **Aşama sonu:** Raporu kullanıcıya göster, onay al.

---

## 6. Aşama 4 — JUCE ile plugin

### 6.1 Kurulum

- **JUCE:** güncel kararlı sürüm; CMake ile, git submodule ya da CPM.
- **CLAP:** JUCE'nin güncel sürümünün CLAP desteğini kontrol et. Destek yoksa `clap-juce-extensions` kullan.
- **Lisanslar:** VST3 SDK, JUCE, CLAP lisanslarının güncel hâlini dokümandan doğrula ve `docs/lisanslar.md` dosyasına yaz.
- **JUCE lisans modeli** (AGPL / ticari) için karar kullanıcınındır; **sor.**
- **Klasör yapısı:**

  ```
  plugin/
    CMakeLists.txt
    src/dsp/        # saf C++, JUCE'den bağımsız olabildiğince
    src/analysis/   # onset, pitch, hizalama motoru (arka plan thread)
    src/ui/         # osiloskop, ölçerler, kontroller
    src/PluginProcessor.*  src/PluginEditor.*
    tests/          # Catch2 veya GoogleTest
  ```

- **FFT:** `juce::dsp::FFT` ya da pffft. Seçimi ölçümle yap.

### 6.2 Uygulama kuralları

- DSP çekirdeği Python prototipiyle **sayısal olarak eşleşmeli**. Aynı test girdisiyle C++ ve Python çıktılarının farkı belgelenmiş bir toleransın içinde kalmalı (ör. ≤ −90 dB). Bunu otomatik test olarak yaz: Python referans `.wav`/`.npy` dosyaları üretir, C++ testi bunları okur.
- **Sidechain bus:** VST3'te ikinci giriş bus'ı, AU'da sidechain, CLAP'ta ikinci giriş portu. Bus yapılandırması değişirse plugin çökmez; sidechain yoksa uyarı verir.
- **Gecikme:** `setLatencySamples` yalnız 3.4'teki durumlarda çağrılır.
- **Osiloskop verisi:** ses thread'inden lock-free halka tampona yazılır; arayüz 60 fps okur.
- **Parametreler:** `AudioProcessorValueTreeState`. Durum kaydı sürümlü olmalı; eski kayıtlar yeni sürümde yüklenebilmeli.
- **Stres testleri:**
  - 1, 32, 64, 512 ve 4096 örneklik tamponlar;
  - değişken tampon boyu;
  - sıfır örnekli blok;
  - örnekleme hızı değişimi;
  - mono/stereo.

### 6.3 Doğrulama

- **Birim testleri:** DSP, analiz, preset kaydı.
- **pluginval:** strictness 10, tüm formatlar, hatasız. Raporu `docs/dogrulama/` altına koy.
- **CLAP:** `clap-validator`.
- **AU:** `auval -v`. Kullanıcının Mac'inde çalıştırılır; komutu ve beklenen çıktıyı hazırla.
- **Ableton Live testleri.** Kullanıcının bilgisayarında yapılır. Adım adım kontrol listesi hazırla:
  1. Bas kanalına plugin, kick kanalı sidechain kaynağı.
  2. Sidechain'in "Pre FX / Post FX / Post Mixer" seçeneklerinin etkisi.
  3. PDC doğrulaması: plugin bypass ile aktif arasında gecikme kayması yok mu? (Bilinen ofsetli test projesi hazırla ve klasöre koy.)
  4. Negatif gecikme gerçekten öne alıyor mu? (Ableton'ın kendi kanal delay'i ile karşılaştır.)
  5. Tempo değişimi ve döngü (loop) sırasında tempo senkronlu osiloskop.
  6. Dört mod tek tek; nota değişen bas hattında "Nota başına" modunun farkı.
  7. Otomasyon, preset kaydetme ve set'i yeniden açma.
  8. Freeze / flatten ve dışa aktarım (offline render) sonuçlarının gerçek zamanlıyla aynı olması.
  9. CPU ölçümü.

  Kullanıcının dönüşlerini `docs/dogrulama/ableton.md` dosyasına işle.

- **Diğer DAW'lar** (isteğe bağlı, kullanıcıya sor): Logic (AU), Reaper, Bitwig (CLAP), FL Studio.

---

## 7. Aşama 5 — Yayın hazırlığı (yalnız onayla)

Aşağıdakilerin her biri için **önce kullanıcıya sor**, maliyet ve seçenekleri göster:

- Ürün adı ve marka kontrolü.
- Lisans modeli ve JUCE lisansı.
- Kod imzalama:
  - macOS: Developer ID ve notarization;
  - Windows: Authenticode sertifikası.
- Kurulum paketi: macOS `.pkg`, Windows Inno Setup; VST3 / AU / CLAP konumları.
- Kopya koruma ve lisans anahtarı sistemi (gerekiyor mu?).
- Kullanım kılavuzu (TR + EN), ürün sayfası metni, demo videosu planı.
- Yayın kanalı: kendi site / KVR / Plugin Boutique / Gumroad.

Kullanıcı onaylamadan **hiçbir şey yayınlama, satın alma, imzalama.**

---

## 8. Çalışma düzeni

- Kök klasörde git deposu başlat. Anlamlı, küçük commit'ler at. Uzak depo (GitHub) için kullanıcıya sor.
- `docs/ilerleme.md` dosyasını tut: her aşamada yapılanlar, ölçüm sonuçları, açık VARSAYIM'lar, sıradaki iş.
- Her aşama sonunda kullanıcıya kısa bir özet ver:
  - ne bitti;
  - hangi ölçüt geçti, hangisi geçmedi (sayılarla);
  - ondan ne lazım (stem, eğri, onay, Mac'te test).
- İngilizce teknik terimleri ilk geçtiği yerde Türkçe açıklamasıyla kullan. Kullanıcıya Türkçe yaz.

## 9. İlk adım

1. Bu talimatı oku ve kendi cümlelerinle 10 maddelik bir plan çıkar.
2. Kullanıcıdan şunları iste (beklerken araştırmaya başla):
   - (a) çizdiği sidechain eğrisi (noktalar ya da görsel);
   - (b) varsa gerçek kick ve bas stem'leri;
   - (c) kullandığı işletim sistemi ve Ableton sürümü;
   - (d) ürün adı fikri.
3. Aşama 1'e başla.
