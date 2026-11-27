# Rakipler — KB-Align

> Aşama 1 çıktısı. Tarih: 2026-11-27.
> Ayrıntılı notlar ve her bilginin kaynak URL'si: `notlar/A-hizalayicilar-1.md`, `notlar/B-hizalayicilar-2.md`, `notlar/C-osiloskop-host.md` (toplam ~240 URL).

## 0. Bu araştırma ne kadar sağlam?

- **Sayfalar doğrudan açılamadı.** Bu oturumun ağ izinleri üretici sitelerine (soundradix.com, voxengo.com, cycling74.com, kvraudio.com, maxforlive.com, ableton.com, juce.com…) doğrudan erişime izin vermedi. Yalnız github.com açılabildi. Bilgilerin çoğu **arama motoru sonuç özetlerinden** geliyor.
- **Doğrudan okunanlar:** JUCE, VST3 SDK, CLAP, pluginval, clap-validator, Scyllascope belgeleri ve PhasePaw (hepsi GitHub üzerinde).
- **Reddit erişilemedi.** Kullanıcı yorumları KVR, Gearspace, Sound Radix forumu, Tape Op, SOS, MusicRadar gibi kaynaklardan.
- **Ekran görüntüsü görülmedi.** Arayüz tarifleri inceleme ve kılavuz metinlerinden.
- **Etiketler:** [Ü] üretici iddiası · [B] bağımsız kaynak · [?] bulunamadı.
- **Fiyatlar** 2026-11-27'de arama sonuçlarında görülen değerlerdir; satın alma ya da yayın kararından önce mağazada doğrulanmalı.

---

## 1. Ürün kartları

### 1.1 Doğrudan rakipler (kick → bas, sidechain)

**Fluctor Audio PhaseLock 2.5 / 2.5.1** — Max for Live (en yakın rakip)
- **Yöntem:** gecikme + faz döndürme + polarite. İki mod:
  - "Auto-Align": tek tık, 4 kick dinler; "statik baslar için" [Ü].
  - "Realtime": her kick'i ve ardından gelen bası **duyulmadan önce** ölçer, o vuruş için Rotation/Polarity/Delay ayarlar; "bas notası değişince hizalama takip eder" [Ü].
- **Aralık:** Delay −100…+150 ms (negatif var), Rotation ±180° [Ü].
- **Ek özellikler:** kick tetiklemeli hacim şekillendirici (2.5'te 40–300 Hz; 2.5.1'de çok bantlı, 40–800 Hz); Stereo/Mono/Bass Mono (50–500 Hz); **çift osiloskop** (zoom, pan) [Ü].
- **Gecikme:** Realtime açıkken ~1 vuruş + 150 ms; 2.5.1'de 120 BPM'de "yaklaşık yarım saniye". Kapalıyken ~120 ms [Ü].
- **Platform:** yalnız Ableton Live 12 + Max 9. **$19,90** [Ü].
- **Bağımsız inceleme:** bulunamadı.
- Not: "Jelly – PhaseLock" ayrı bir üründür (Jelly Audio, çok mikrofonlu kayıt aracı; bkz. 1.3).

**StereoGhost PhaseKicker** — Kasım 2026'da çıktı
- **Yöntem:** bas kanalında, kick sidechain'de; **her kick transient'inde fazı yeniden hesaplar**, faz kaymaları arasında enterpolasyon yapar [Ü].
  - Gerekçe olarak açıkça "kick–bas ilişkisi bas notasıyla değişir" diyor [Ü].
  - Temsilciye göre **zaman kaydırma ya da gecikme yok**, saf faz [Ü, KVR forumu].
  - v1.1.0'da "LightMode" eklendi: normal ve ters polariteli bası karşılaştırır.
- **Akış:** Threshold → dalga ekranında "Optimize At" tutamacını sürükle → ReTrigger. 3–4 adım [Ü].
- **Gecikme:** "kayda değer", sayı verilmemiş; canlı ya da kayıt için değil [Ü].
- **Format ve fiyat:** VST3/AU/AAX (Win/Mac), Linux VST3; CLAP yok. €39 tanıtım (30 Kasım'a kadar), sonra **€49**; 14 gün deneme.
- **Uyarılar ve şikâyetler:**
  - [Ü] Hizalanmış tepe noktası 6 dB'ye kadar yükselebilir.
  - [B, Gearspace] "Optimize At'i nereye koyacağım?" sorusu; Logic sidechain gecikmesi endişesi (tartışmalı); davul bus'ında kick ayrılamadığı için "yalnız belli frekansın altını dinlesin" isteği.

**Wagner Who "Kick & Bass Auto Mix"**
- **Yöntem:** tek tık, 1/2/4 ölçü analiz → **vuruş başına faz döndürme** (zaman kaydırma yok) + seviye dengesi + 130 Hz altı ducking [Ü].
- **Üreticinin kendi örneği:** 8 vuruşta −8°…115° farklı açılar. Bu, sabit açının yetmediğinin üretici kanıtı.
- **Gecikme:** ~80 ms (30 Hz'e kadar döndürme için lookahead) [Ü].
- **Format ve fiyat:** VST3/AU, **$37**.

**Mastering The Mix FUSER**
- **Yöntem:** bas kanalında, kick sidechain'de.
  - Phase Rotate: ±180°, elle.
  - Otomatik faz optimizasyonu: tek seferlik.
  - "Phase Match": frekans frekans; üreticinin kendisi "yıkıcı olabilir" diyor.
- **Gecikme:** "sıfır" [Ü].
- **Şikâyetler:** yüksek CPU [B, mağaza yorumları].
- **Fiyat:** bulunamadı.

**BruceJames DeepPerfection** (Audioblob inceledi; Audioblob üretici değil)
- **Yöntem:** hizalama değil. 20–160 Hz'te iptalle kaybolan enerjiyi **toplamsal olarak geri ekler**, sürekli çalışır; zaman kaydırma yok [Ü].
- **Gecikme:** 240 örnek.
- **Format ve fiyat:** VST3/AU/**CLAP** (+AAX?), **$49,99**.
- **Şikâyetler [B, Audioblob]:** tek kanal işliyor; birden çok kopyada CPU ağır; uygulanan düzeltmenin sayısal göstergesi yok.

**Slypork KerBy** — kick + bas *enstrümanı*
- **Yöntem:** **her bas notası için** kick kuyruğuna karşı en az iptal eden fazı seçer, kendi bas filtresinin fazını da hesaba katar [Ü].
- **Sınırı:** yalnız kendi ürettiği sesle çalışır; harici bas işlemez.
- **Format ve fiyat:** VST3/AU, $49.

**M:G Audio PHASE** — ücretsiz
- **Yöntem:** "Smart Assist" ~4 sn ve en az 6 kick dinler. Ayarı yalnız şu durumda uygular: alt bant ≥ 0,35 dB iyileşmeli, vuruşların ¾'ü iyileşmeli, hiçbir vuruş 0,5 dB'den fazla kötüleşmemeli [Ü]. Bu güven/kabul kuralı fikir olarak iyi.
- **Gecikme:** ~30 ms. Kontroller sıfırdayken çıkış girişle bit bit aynı [Ü].

### 1.2 Genel hizalayıcılar (çok mikrofon / iki iz)

**Sound Radix Auto-Align 2** ($199)
- **Yöntem:** tek seferlik analiz. Tek gecikme + tek takım statik "Spectral Phase Optimization" (allpass), "tüm parça için" [Ü, Sound Radix forumu].
- **Akış:** tüm izlere takılır, bir kopyada Align'a basılır, çalınır. Yaklaşık 1 tık + bir çalma.
- **Referans:** sidechain yok; kopyalar birbirini kendisi bulur.
- **Gecikme:** ARA2'de sıfır. Negatif kaydırma ("öne") var. Örnek altı hassasiyet ve aralık: bulunamadı.
- **Görüntü:** renkli faz göstergesi + spektral görünüm; osiloskop yok.
- **Şikâyetler [B, resmi forum başlıkları]:** "izleri kick'ten öne alıyor", "davulda flam", ARA'da ayarların kaybolması.

**Sound Radix Auto-Align Post 2** ($399)
- **Yöntem:** diyalog mikrofonları için dinamik mod (hareket eden mikrofon), ±100 ms [Ü].
- **Şikâyet [B]:** bir kullanıcıya göre müzikte dinamik mod "harmonik tıklamalar" yapıyor.

**Sound Radix Pi** ($249)
- **Yöntem:** tüm miks için sürekli, frekansa bağlı faz döndürme; kopyalar arası iletişimle [Ü].
- **Odak:** kick→bas değil.
- **Gecikme:** "çok fazla" (sayı yok) [Ü].
- **Durum:** son güncelleme 1.1.3, Aralık 2022.

**MeldaProduction MAutoAlign** (~$54–59, sık indirimde)
- **Yöntem:** tek seferlik gecikme + polarite; isteğe bağlı spektral faz (gecikme ekler) [Ü].
- **Şikâyetler [B, KVR]:**
  - her analizde farklı sonuç;
  - gerçek gecikmenin **katlarına** atlama;
  - spektral modda "phasey" ses.
- **Referans:** sidechain yok; kopyalar birbirini bulur.

**Waves InPhase** ($35–40 sokak fiyatı)
- **Yöntem:** elle. Sidechain referans; gecikme ±20 ms (20 ms gecikme bildirir; "Live" bileşenleri sıfır gecikme ama yalnız ileri); iki allpass filtre; polarite [Ü].
- **Görüntü:** **yakalanmış** dalga görüntüsü (en çok 2 sn) + korelasyon ölçer. Rakipler içinde osiloskoba en yakın şey, ama canlı değil.
- **Şikâyetler [B]:** otomatik mod yok; kontroller "hantal".

**SSL X-Phase** ($99)
- **Yöntem:** elle allpass (frekans, Q, 1./2. derece, 180°) + gecikme. Sidechain ve otomatik mod yok.
- **Değerlendirme [B, MusicRadar]:** "pahalı", "efekt değil sorun çözücü".

**Voxengo PHA-979** (~€62)
- **Yöntem:** elle, lineer fazlı faz döndürme (derece) + ± gecikme (sabit gecikme bildirimiyle). Eski kılavuzda 48 ms gecikme [Ü].
- **Görüntü:** çok bantlı korelasyon ölçer.
- **Kullanım:** forumlarda kick/bas için en çok önerilen elle araç.
- **Şikâyet [B]:** pre-ringing.

### 1.3 Faz araçları (hizalama yapmayan ya da tek iz)

| Ürün | Ne yapar | Fiyat |
|---|---|---|
| Little Labs IBP (UAD) | Elle allpass 90/180°, 0–4 ms gecikme; UAD donanımı gerekiyor, native sürüm bulunamadı | $29–99 (çelişkili) |
| Kilohearts Disperser | Statik allpass yığını (grup gecikmesi); sidechain yok | $59 |
| iZotope Neutron 5 – Phase | Rotation + Delay + polarite; sidechain ile **tek seferlik Learn**; osiloskop tarzı ekran (ana, sidechain, toplam) | $299 (Neutron 5) |
| JMG DropKick | Yalnız kick işlemcisi ("Warp" allpass); bas hizalaması yok | 2024'te £59 |
| Jelly Audio PhaseLock | Çok mikrofon: polarite, allpass "Phase Coherence", Time Align; Tape Op "a gem" dedi, room mikrofonlarını incelttiği görüldü | bulunamadı |

### 1.4 Osiloskoplar

| Ürün | Tetik | Çok iz | Görüntü filtresi | Ölçüm | Korelasyon / XY | Format | Fiyat |
|---|---|---|---|---|---|---|---|
| Oszillos Mega Scope | BPM'e kilitli (1/32 nota – 16 ölçü) | Kopyalar arası, ayrık ya da birleşik, toplama kipi | Band-pass (v1.13) | dB ölçeği; birimler [?] | [?] | VST/VST3/AU/AAX | €19,99–59 (çelişkili) |
| Audija OScope 2 | Vuruş ızgarası; freeze | Full: kopyalar birbirini bulur, sidechain, overlay | [?] | true peak | [?] | — (macOS'ta Gatekeeper uyarısı) | ücretsiz / Full €19 (normal €38) |
| Scyllascope (resmi belgeler okundu) | Sync, **Sync to Start** ("Ableton PDC kaymasını telafi etmek için"), Free, Scroll | Overlay, Sum, harici sidechain (giriş 3/4) | Yalnız görüntüde band-pass (istenirse dinlenir) | ms, Peak/RMS/Crest — örnek ve derece yok | yok | VST3/AU/LV2 | ücretsiz |
| MOscilloscope | Perde dedektörü, tek periyoda kilitlenir | [?] | [?] | [?] | [?] | Melda | ücretsiz |
| PhasePaw (GitHub) | — (osiloskop yok; faz iğnesi + 1/3 oktav çubuklar) | — | 20–200 Hz | — | — | derlemesi yok | **AGPL-3.0** — koduna bakılmadı, kopyalanmayacak |

**KVR'de kullanıcıların tekniği:** stereo osiloskopta kick sol, bas sağ → önce polarite → örnek/ms kaydırma (ör. FaSampleDelay) → kick kuyruğunda faz döndürme (PHA-979) → bas başlangıç fazı / retrigger. Kural olarak: "kick ve bas birlikte çalınınca tepe noktası kick'inkinden yalnız ~1 dB yüksekse faz sorunu var." Karşı görüş: kick bir sinüs süpürmesi, tamamını fazda tutmak zor.

**Bulgu:** İncelenen belgelerde **kick'in kendi vuruşuyla tetiklenen** bir osiloskop yok. Var olanlar tempoya kilitli, serbest ya da perdeye kilitli; PhaseLock'un çift osiloskobunun tetik kipi [?]. Örnek ve derece cinsinden imleç ölçümü de bulunamadı.

---

## 2. Özellik tablosu

İşaretler: ✓ var · ✗ yok · E elle · ? bulunamadı · — uygulanamaz. Hepsi üretici iddiası, aksi belirtilmedikçe.

| Ürün | Oto. gecikme | Faz döndürme | Frekansa bağlı faz | Vuruş başına | Nota hafızası | Sürekli | Negatif gecikme | Örnek altı | Osiloskop | Kick tetik | Tempo senk. | Alt bant crossover | Bass Mono | SC ducking | Gecikme | Formatlar | Fiyat |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **KB-Align (hedef)** | ✓ | ✓ 0–360° | ✗ (1. sürüm) | ✓ | **✓** | ✓ | ✓ ±50 ms | ✓ | ✓ | **✓** | ✓ | ✓ | ✓ | ✓ çizilebilir | 10 / 50 / 90 ms (mod) | VST3/AU/CLAP | — |
| Fluctor PhaseLock 2.5 | ✓ | ✓ ±180° | ? | ✓ (Realtime) | ✗ | ✗ | ✓ −100 ms | ? | ✓ çift | ? | ? | kısmen (ducking bandı) | ✓ | ✓ | ~0,5 s (RT) / ~120 ms | yalnız M4L, Live 12 | $19,90 |
| PhaseKicker | ✗ | ✓ | ? | ✓ | ✗ | ✗ | ✗ | — | ✗ (dalga ekranı) | — | nota değeriyle ReTrigger | ✗ | ✗ | ✗ | "kayda değer" | VST3/AU/AAX | €49 |
| Wagner Who K&B | ✗ | ✓ | ? | ✓ (analiz sonrası) | ✗ | ✗ | ✗ | — | ? | — | ölçü analizi | ✓ (130 Hz ducking) | ? | ✓ | ~80 ms | VST3/AU | $37 |
| FUSER | ✗ | ✓ ±180° | ✓ (Phase Match) | ✗ | ✗ | ✗ | ✗ | — | ? | ✗ | ✗ | ? | ? | ✗ | 0 | ? | ? |
| DeepPerfection | ✗ | — (enerji ekler) | ✓ | — | ✗ | ✓ | ✗ | — | ✗ | ✗ | ✗ | ✓ 20–160 Hz | ✗ | ✗ | 240 örnek | VST3/AU/CLAP | $49,99 |
| M:G PHASE | ✓? | ✓ | ? | ✗ | ✗ | ✗ | ? | ? | ? | ✗ | ✗ | ? | ? | ✗ | ~30 ms | VST3/AU | ücretsiz |
| Auto-Align 2 | ✓ | polarite | ✓ statik | ✗ | ✗ | ✗ | ✓ | ? | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 0 (ARA) / ? | AAX/AU/VST3/ARA2 | $199 |
| Auto-Align Post 2 | ✓ | ? | ✓ dinamik | ✗ | ✗ | ✓ (diyalog) | ? | ? | ? | ✗ | ✗ | ✗ | ✗ | ✗ | ? | AAX/VST3/AU/ARA2 | $399 |
| Pi | ✗ | ✓ dinamik | ✓ | ✗ | ✗ | ✓ (miks) | ✗ | — | ✗ | ✗ | ✗ | LF odak modu | ✗ | ✗ | "çok" | AAX/AU/VST/VST3 | $249 |
| MAutoAlign | ✓ | polarite | ✓ (seçenek) | ✗ | ✗ | ✗ | dolaylı | ? | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | spektralde var | VST2/VST3/AU/AAX | ~$55 |
| InPhase | ✗ (E ±20 ms) | ✓ allpass | ✓ E | ✗ | ✗ | ✗ | ✓ | ? | yakalanmış dalga ≤2 sn | ✗ | ✗ | ✗ | ✗ | ✗ | 20 ms / 0 (Live) | AAX/AU/VST2/3 | ~$40 |
| X-Phase | ✗ (E) | ✓ E | ✓ E | ✗ | ✗ | ✗ | ? | ? | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ? | VST3/AU/AAX | $99 |
| PHA-979 | ✗ (E) | ✓ E (derece) | ✗ (lineer) | ✗ | ✗ | ✗ | ✓ | ? | ✗ (çok bantlı korelasyon) | ✗ | ✗ | ✗ | Force Mono | ✗ | 48 ms (eski kılavuz) | VST/VST3/AU/AAX | ~€62 |
| Neutron 5 Phase | ✓ (Learn) | ✓ | ? | ✗ | ✗ | ✗ | ? | ? | ✓ | ? | ✗ | ✗ | ✗ | ✗ | ? | AU/AAX/VST3 | $299 |
| IBP (UAD) | ✗ (E 0–4 ms) | ✓ E | ✓ | ✗ | ✗ | ✗ | ✗ | ? | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ? | UAD | $29–99 |
| Disperser | ✗ | — | ✓ | ✗ | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ? | VST/VST3/AU/AAX | $59 |
| KerBy (enstrüman) | — | ✓ | ✓ (filtre fazı) | ✓ | ✓ (kendi sesi) | — | — | — | ? | — | — | — | — | DucKy ayrı | ? | VST3/AU | $49 |

**CLAP:** yalnız DeepPerfection'da görüldü. **Örnek altı hassasiyet:** hiçbir ürün belirtmiyor (Eventide Precision Time Align derleme makalelerinde "örnek altı" diye geçiyor; kick/bas ürünü değil).

---

## 3. Rakiplerin zayıf yanları ve bizim cevabımız

### 3.1 Bas notası değişince hizalamanın bozulması (ana konu)

`φ = 360° · f · Δt` — 1 ms kayma 41 Hz'te 14,8°, 82 Hz'te 29,7° demektir (`dsp-yontemleri.md` §0).

| Durum | Ürünler | Kanıt |
|---|---|---|
| **Çözmüyor** (tek, statik ayar) | Auto-Align 2, MAutoAlign, InPhase, X-Phase, PHA-979, IBP, Disperser, Neutron Phase (Learn), FUSER (oto. mod), Fluctor "Auto-Align" modu | Sound Radix: "tüm parça için tek düzeltme" [Ü forum]; Fluctor Auto-Align "statik baslar için" [Ü]; diğerleri elle/tek seferlik tasarım |
| **Vuruş başına yeniden hesaplıyor** (notayı dolaylı yakalar) | Fluctor PhaseLock Realtime, PhaseKicker, Wagner Who | Üçü de açıkça nota/vuruş değişimini gerekçe gösteriyor [Ü]. **Bağımsız doğrulama yok.** |
| **Nota başına** | KerBy | Yalnız kendi ürettiği bas sesi için [Ü] |
| Hizalamadan başka yol | DeepPerfection (kayıp enerjiyi geri ekler) | [Ü] |

Vuruş başına çalışan ürünlerin üç zayıflığı var:

1. **Bedeli gecikme.** PhaseLock Realtime ~0,5 sn, Wagner ~80 ms, PhaseKicker "kayda değer".
2. **Hafıza yok.** Her vuruş tek başına tahmin edilir. Gürültülü, kısa ya da bastırılmış (ducked) bir vuruşta kötü bir tahmin doğrudan sese yansır; aynı nota tekrar geldiğinde önceki iyi sonuç kullanılmaz.
3. **İki ürün yalnız faz döndürüyor.** PhaseKicker ve Wagner'de zaman kaydırma yok. Faz döndürme sabit derecedir; gerçek bir zaman kaymasını yalnız tek frekansta düzeltir, kick'in geniş bantlı atağında ise düzeltemez.

**Bizim cevabımız:**
- **"Nota başına" mod.** Nota → `(d, θ)` tablosu öğrenilir, sonraki tekrarlarda vuruş vuruş tahmin yerine öğrenilmiş ortalama kullanılır. Bu, düşük gecikmeyle (lookahead gerekmez) notayı takip eder. Tablo görünür ve düzenlenebilir.
- **"Her vuruşta" modu** isteyen için var. Gecikme bütçesi açıkça seçilir (`L + d` kuralı, `dsp-yontemleri.md` §9).
- **İkisi birden.** Zaman kayması ve faz döndürme birlikte; hangisinin otomatik olacağı kullanıcıya bırakılır.
- **Kanıt.** Python raporunda değişen notalı basta "sabit hizalama" ile "nota başına" farkı dB ve korelasyonla ölçülüp yayımlanacak. Rakiplerin hiçbirinde bu ölçüm yok.

### 3.2 Platform ve kurulum kısıtları

- **PhaseLock** yalnız Live 12 + Max for Live'da çalışıyor. **IBP** UAD donanımı istiyor. **Sound Radix ve Melda** her iki ize de kopya takmayı istiyor.
- **Cevap:** tek kopya, bas kanalında, standart sidechain; VST3 + AU (+ CLAP).

### 3.3 Görselleştirme

- Kick vuruşuyla tetiklenen osiloskop bulunamadı. InPhase'in görüntüsü durağan (≤ 2 sn). Scyllascope tempo/sidechain overlay yapıyor ama kick tetiği, örnek/derece ölçümü ve korelasyon yok. PhaseKicker'da yalnız dalga ekranı var.
- **Cevap:**
  - kick'e kilitli osiloskop;
  - ms / örnek / derece imleçleri;
  - korelasyon, iptal (dB), frekansa göre faz ve XY ölçerleri;
  - izi sürükleyerek kaydırma.

### 3.4 Şeffaflık ve güvenilirlik

- **MAutoAlign:** her analizde farklı sonuç, gecikmenin katlarına atlama.
- **DeepPerfection:** sayısal gösterge yok.
- **Hiçbir ürün** doğruluğunu ölçülmüş sayıyla yayımlamıyor.
- **Cevap:**
  - güven skoru ve vuruşlar arası dağılım gösterimi;
  - belirsizlikte "en küçük |d|" kuralı (talimat §3.3) — MAutoAlign'ın "katlara atlama" şikâyetine doğrudan cevap;
  - M:G PHASE'inkine benzer bir **kabul kuralı**: yeni değer alt bant enerjisini belirli bir eşik kadar iyileştirmiyorsa uygulanmaz;
  - 4 ölçütün ölçülmüş sonuçlarının kılavuzda yayımlanması.

### 3.5 Tıklama ve artefaktlar

- Auto-Align Post 2'nin müzikte dinamik modda tıklaması [B]; vuruş başına faz değiştiren ürünlerde geçişler.
- **Cevap:**
  - sıçramalarda crossfade;
  - Sürekli modda hız sınırı (≤ 0,1 ms/s ≈ 0,17 cent Doppler, ÖLÇÜLDÜ);
  - tıklama ölçütü testte (talimat §4 ek ölçütler).

### 3.6 Kullanılabilirlik

- **PhaseKicker:** "Optimize At'i nereye koyacağım?" sorusu [B]. Fikrin kendisi değerli: kick kuyruğunun hangi bölümünde hizalanacağı sesi gerçekten değiştirir.
- **Cevap:** analiz penceresi varsayılan olarak otomatik. Ama osiloskop üzerinde **görünür ve sürüklenebilir** bir pencere olarak da sunulur, dolayısıyla gizli bir ayar olmaz. Learn yine tek tuş.

### 3.7 Tetik

- **Gearspace isteği:** davul bus'ında (kick ayrı değil) "yalnız belli frekansın altını dinlesin".
- **Cevap:** onset tespiti zaten alt bantta (`dsp-yontemleri.md` §6). Tetik frekansı ayarlanabilir yapılır.

### 3.8 Tepe noktası artışı

- Hizalama tutarlı toplam üretir, bu yüzden tepe noktası ~6 dB'ye kadar artabilir (PhaseKicker uyarısı). Bu bir hata değil, fiziğin sonucudur; ama kullanıcıyı şaşırtır.
- **Cevap:** ölçer panelinde "hizalama öncesi/sonrası tepe ve RMS farkı" göstergesi.

---

## 4. Host ve teknik bulgular (spesifikasyonu etkileyenler)

| Konu | Bulgu | Kaynak türü | Etkisi |
|---|---|---|---|
| Ableton sidechain PDC | Sidechain'in ana girişle PDC açısından hizalandığını gösteren **resmi belge yok**. Forumlarda "sidechain geç kalıyor" iddiası var. Scyllascope'un "Sync to Start" kipi PDC kayması için var. | forum + üçüncü taraf belge | **Elle "sidechain ofseti"** parametresi ekle; Ableton testinde ölç (talimat §6.3 madde 3) |
| Ableton RLWM | "Reduced Latency When Monitoring" açıkken kayda hazır izlerde telafi atlanıyor | Ableton yardım (özet) | Kılavuzda uyarı; plugin içinde "ölçüm şüpheli" uyarısı düşünülebilir |
| Ableton grafikleri | "Grafikler telafi edilmiyor" | Ableton yardım (özet) | Osiloskop host playhead'iyle hizalı olmayabilir; kendi zaman tabanımızı kullanırız |
| Gecikmeyi çalışırken değiştirmek | VST3 SDK: `restartComponent(kLatencyChanged)` çalmada kesintiye yol açabilir | VST3 SDK | Talimattaki "gecikme yalnız mod değişince" kuralını doğruluyor |
| Ableton + CLAP | Live CLAP desteklemiyor (Live 13 beta duyurusunda da yok) | haber + forum | **Öncelik VST3 + AU**; CLAP ikinci planda |
| Ableton eklenti sidechain'i | Live 10.1'den beri (VST3 desteği de 10.1) | Ableton blog/KVR | Hedef: Live 11+ (kesin alt sınır testte) |
| JUCE | Güncel 9.0.6. **Yerel CLAP yok** → `clap-juce-extensions` (MIT, resmi değil; JUCE 9 uyumu test edilmeli) | GitHub (doğrudan) | Aşama 4'te deneme derlemesi |
| JUCE lisansı | AGPLv3 ya da ticari. Starter ücretsiz (gelir ≤ ~20 bin $), Indie ~40 $/ay, Pro ~175 $/ay | forum (resmi sayfa açılamadı) | **Kullanıcı kararı** — bkz. özet |
| VST3 SDK | 3.8'den beri **MIT** | GitHub LICENSE.txt (doğrudan) | Lisans engeli yok |
| CLAP | MIT | GitHub (doğrudan) | — |
| pluginval | v1.0.4 kararlı, v2.0.0-beta3; strictness 1–10 (host uyumluluğu için en az 5). **CLAP yok** | GitHub (doğrudan) | VST3/AU için pluginval, CLAP için clap-validator |
| Transport | VST3 `processContext` ve CLAP `transport` **null olabilir**; JUCE `getPosition()` yalnız `processBlock` içinden çağrılır, alanlar `Optional` | header'lar (doğrudan) | `dsp-yontemleri.md` §10 doğrulandı; testlere null transport durumu eklenecek |

---

## 5. Talimata önerilen değişiklikler (onay bekliyor)

1. **Elle "sidechain ofseti" parametresi** (±20 ms, örnek altı). Ableton'da sidechain PDC'si belirsiz olduğu için kurtarma yolu; Ableton testinde gerekip gerekmediği ölçülecek.
2. **Analiz penceresi osiloskopta görünür ve sürüklenebilir** olsun (varsayılan otomatik).
3. **Kabul kuralı:** yeni `(d, θ)` alt bant enerjisini en az X dB iyileştirmiyorsa uygulanmaz (X Python'da belirlenecek; M:G PHASE ~0,35 dB kullanıyor).
4. **Tepe/RMS farkı göstergesi** (hizalama öncesi/sonrası).
5. **Tetik frekansı ayarlanabilir** (davul bus'ında kullanım).
6. **Format önceliği:** VST3 + AU birinci, CLAP ikinci (Live CLAP desteklemiyor; JUCE'de yerel değil).

---

## 6. Doğrulanması gerekenler

- Fiyatların ve gecikme değerlerinin hepsi (ağ kısıtı yüzünden doğrudan sayfadan okunamadı).
- PhaseLock 2.5 osiloskobunun tetik kipi; gerçek zamanlı modun gerçekten nota değişimini takip edip etmediği (bağımsız test yok). Rakip ürün satın alıp denemek **para gerektirir → kullanıcıya sorulacak**.
- PhaseKicker'ın gerçek gecikmesi (14 gün ücretsiz deneme var; Mac/Windows'ta kullanıcı deneyebilir).
- Ableton'ın sidechain PDC davranışı (kendi testimizle).
- Ağ izni verilirse (ör. soundradix.com, voxengo.com, cycling74.com, kvraudio.com, ableton.com, juce.com) bu belge doğrudan kaynaklarla güncellenebilir.
