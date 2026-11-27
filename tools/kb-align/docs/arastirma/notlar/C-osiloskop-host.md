# KB-Align araştırması — Bölüm C (osiloskop eklentileri + host/teknik bilgiler)

Tarih: 2026-11-27. Yöntem: WebSearch (standard) + WebFetch.
**Ağ kısıtı:** Bu oturumda WebFetch yalnız `github.com` / `raw.githubusercontent.com` adreslerine ulaşabildi. `kvraudio.com`, `schulz.audio`, `bedroomproducersblog.com`, `sakhnovkrg.github.io` için DNS çözülemedi (oturumun ağ izin listesinde yoklar). `audija.com`, `meldaproduction.com`, `ableton.com`, `help.ableton.com`, `juce.com`, `steinbergmedia.github.io` gibi diğer siteler de büyük olasılıkla aynı nedenle kapalı olduğundan denenmedi. Bu sitelerden gelen bilgiler **yalnız arama motoru özetlerinden** alındı (aşağıda "[arama özeti]" diye işaretli). Sayfanın kendisi okunmadıysa durum "ULAŞILAMADI" diye yazıldı. Tam doğrulama için bu sitelerin ağ izin listesine eklenmesi gerekir.

---

## BÖLÜM 1 — Osiloskop eklentileri

### 1.1 Oszillos Mega Scope (schulz.audio / Ben Schulz)

- **Ürün sayfası (schulz.audio):** ULAŞILAMADI (DNS çözülmedi).
- **Kılavuz:** ULAŞILAMADI. Kılavuzun URL'si de aramada bulunamadı.
- Bilgi yalnız ikincil kaynaklardan geliyor [arama özeti]:
  - BPM'e kilitli bir osiloskop; birden çok izi/kanalı aynı anda gösterir. Zoom 1/32 notadan 16 bara kadar. İki görünüm kipi var: "separate waves" (ayrı dalgalar) ve "combined waves" (birleşik dalgalar). — https://www.kvraudio.com/news/benjamin_schulz_releases_oszillos_mega_scope_multi_channel_bpm_synced_oscilloscope_14230 , https://www.dontcrack.com/news/2010/04/oszillos-mega-scope-a-free-multi-channel-bpm-synced-oscilloscope/
  - v1.3 beta (2011): dört yeni çizim kipi ve dalga biçimlerinin örnek düzeyinde (sample-perfect) hizalanması. — https://bedroomproducersblog.com/2011/03/09/oszillos-mega-scope-updated-to-v1-3-beta-1/
  - Sonraki güncellemeler: v1.11.x ile logaritmik (dB) dalga gösterimi geldi — https://www.kvraudio.com/news/ben-schulz-updates-oszillos-mega-scope---adds-decibel-waveform-display-46584 ; v1.12 ile izler tek tek gösterilip gizlenebiliyor — https://www.kvraudio.com/news-print.php?id=48390 ; v1.13 ile renkler ayarlanabiliyor ve **band-pass filtre** geldi — https://rekkerd.org/?p=162169 ; başka bir sürümde "summing mode" (toplama kipi) eklendi — https://rekkerd.org/?p=217061
  - Biçimler: VST, VST3, AU, AAX ve standalone; macOS ve Windows. — https://www.kvraudio.com/product/oszillos-mega-scope-by-schulz-audio , https://rekkerd.org/?p=162169
  - KVR ürün sayfasında görünen sürüm "25.1.8" [arama özeti]. — https://www.kvraudio.com/product/oszillos-mega-scope-by-schulz-audio
  - **Fiyat:** Kaynaklar birbirini tutmuyor. İlk sürümler ücretsizdi (bağış kabul ediliyordu). 2016'da €19,99; v1.11'de €49 ve 14 günlük deneme; v1.13 haberinde "normal fiyatı 59 EUR". Güncel fiyat: bulunamadı. — https://www.dontcrack.com/news/2010/04/... , https://www.kvraudio.com/news/ben-schulz-updates-oszillos-mega-scope-1-11-211-41418 , https://rekkerd.org/?p=162169
  - **Diğer izlerin sinyali nasıl geliyor:** Bir karşılaştırma sayfasına göre Oszillos'ta yönlendirme daha kolay ve eklenti **diğer örnekleri (instance) kendisi buluyor**. Aynı sayfaya göre faz hizalama için gereken zoom yok. Örnekler arası iletişimin mekanizması resmi bir kaynakta doğrulanamadı. — https://equipboard.com/items/oszillos-mega-scope [arama özeti]
  - **Tetik kipleri (sidechain/kick'e kilitli), imleçler/ölçüm birimleri, korelasyon/XY metreleri, freeze/averaging:** bulunamadı.
  - **Şikâyetler:** Bir yorumcu eklentinin DAW'ını sürekli çökerttiğini yazmış. — https://bedroomproducersblog.com/2011/07/05/bpb-freeware-studio-best-free-oscilloscope-vstau-plugins/ [arama özeti]
  - **Arayüz:** boyutlandırılabilir; birden çok giriş var. Ayrıntılı tarif: bulunamadı.

### 1.2 Audija OScope (OScope 1 → OScope 2)

- **Ürün sayfası (audija.com/oscope):** ULAŞILAMADI (denenmedi; ağ kısıtı).
- OScope 1: KVR onu "beat grid synced true peak sidechain oscilloscope" diye tanımlıyor. Amacı tepe noktalarını (peak) görmek ve ızgara hizasını kontrol etmek. AU ve VST3; macOS ve Windows. Ücretsiz sürümün yanında €8'lık ücretli sürüm var. — https://kvraudio.com/product/oscope-by-audija [arama özeti]
- Geliştiricinin KVR forum duyurusuna göre [arama özeti] — https://kvraudio.com/forum/viewtopic.php?p=8875757 :
  - "True peak" gösterimi her piksel sütunu için en düşük ve en yüksek örneği bulup çiziyor.
  - Kayıt döngüsünün uzunluğu ızgaraya göre ayarlanıyor: uzun bölümler de tek vuruşlar da görüntülenebiliyor.
  - Osilogram dondurulabiliyor (freeze).
  - **Sidechain girişi** ve **kanal üst üste bindirme (channel overlay)** yalnız ücretli sürümde.
- OScope 2 (Eylül 2026) [arama özeti] — https://bedroomproducersblog.com/2026/09/30/audija-oscope-2-free/ , https://rekkerd.org/audija-updates-oscope-2-updates-kickdrum-to-v2-9-0/ :
  - Ücretsiz sürümde tek iz analizinin çoğu var: vuruşa kilitli ızgara ve freeze. Şu an yalnız VST3, Windows 64-bit.
  - "OScope 2 Full" tanıtım fiyatı €19 (normal €38).
  - Full sürümde farklı izlerdeki **örnekler birbirini kendiliğinden buluyor ve sinyallerini aynı pencerede gösteriyor**. Ayrı şeritler (lane), ilişkili izleri üst üste bindirme, 4 yığın grubu (stack group), birden çok izi birlikte düzenleme var.
  - Çok izli kullanım ve iz toplama (summing), spektrogram, canlı spektrum analizörü eklendi. Ücretsiz sürümde çok iz ve sidechain yok.
  - **Şikâyet:** Bir incelemeci macOS paketinde Gatekeeper uyarısı aldı; imza geçersiz görünüyor.
  - Aynı geliştiricinin "Kickdrum" ürünü kick/bas faz hizalamada övülmüş (KVR forumu).
- Low-pass görünüm filtresi, imleçler/birimler, korelasyon/XY metreleri: bulunamadı.

### 1.3 Scyllascope (DsgDnB) — resmi belgeler okundu (GitHub kaynağı)

Belge kaynağı: https://github.com/sakhnovkrg/Scyllascope-Docs (yayımlanmış hâli sakhnovkrg.github.io, ULAŞILAMADI. Aynı markdown dosyaları github.com üzerinden okundu.)
- **Fiyat/platform:** Ücretsiz; Windows, macOS, Linux. — get-started/introduction.md. Biçimler: VST3, AU, LV2; KVR'de sürüm 1.3.0. — https://www.kvraudio.com/product/scyllascope-by-dsgdnb [arama özeti], https://soundshockaudio.com/dsgdnb-scyllascope/
- **Kipler** (header/mode-selector.md):
  - **Sync:** Transport'a kilitli; yalnız aranjman çalarken akar. Görünen süreyi Division seçici belirler.
  - **Sync to Start:** Ableton Live'daki **PDC kaymasını telafi etmek** için var. Transport'a bağlı kalır ama tamponun başından çizer. (KB-Align için önemli: Live'da PDC görsel hizayı kaydırabiliyor.)
  - **Free:** Transport'tan bağımsız; ses gelince başlar (canlı girişi izlemek için).
  - **Freeze:** tamponu durdurur. **Scroll:** sağdan sola sürekli akış.
  - Sinyal seviyesiyle tetikleme (trigger-on-signal) ya da kick'e kilitli tetik: belgelerde **yok**.
- **Division** (footer/division-selector.md): 1/4, 1/2, 1, 2, 4, 8 **bar**; "T" düğmesi triole geçirir.
- **Örnekler arası overlay** (main/instance-overlay.md): Bağlam menüsünde başka bir aktif Scyllascope örneği seçilir. Onun dalga biçimi bu örneğe sidechain sinyali olarak gönderilir ve üste bindirilir. Seçenekler:
  - "SC from instance"
  - "Colorize": DAW iz rengini kullanır, yalnız VST3
  - "Sum": iki sinyalin toplamını gösterir
  - "None"
  Bağlı örneklerin Division ayarı aynı olmalı; 1.2.6'dan beri bu otomatik. Sidechain kaynak önceliği: (1) Side2SC, (2) örnek sidechain'i, (3) harici sidechain (giriş 3/4). Belgede açıkça yazan kullanım örneği: kick ile bası üst üste koyup faz sorunlarını görmek.
- **Side2SC** (footer/side2sc.md): L−R (side) sinyalini sidechain overlay olarak gösterir. BP ile birlikte alçak frekanslardaki side içeriği kontrol edilir.
- **BP (band-pass) görüntü filtresi** (footer/bp.md): Kesim frekansı düğmeyle ayarlanır. Normalde yalnız görüntüyü etkiler. Düğme sürüklenirken filtre geçici olarak sese de uygulanır (dinleme). Ctrl/Cmd+tık kalıcı dinleme kipini açar. Belgedeki amaç kick ile basın etkileşimini ve faz sorunlarını görmek. Eğim ve aralık belirtilmemiş.
- **Ölçüm** (main/time-selection.md): Ctrl/Cmd+sürükle ile bölge seçilir. Seçimin süresi **ms** cinsinden, Peak dB, RMS dB ve Crest dB gösterilir. Örnek (sample) ya da derece cinsinden ölçüm **yok**.
- **Hold/Reset** (footer/hold-reset.md): Hold, anlık dalgayı arka plan referansı olarak dondurur; canlı dalga üstüne çizilmeye devam eder (önce/sonra karşılaştırması). Reset canlı tamponu temizler.
- **Görünüm** (header/waveform-modes.md, header/menu.md): "Spectral" kipi dalgayı 5 frekans bandına göre renklendirir (sub/low/mid/high/air). AA kenar yumuşatma. Temalar, çevrimiçi tema editörü, UI ölçeği, kaynak seçimi (L/R/Mid/Peak), dB ölçekli kılavuz çizgiler, yerleşik kaydedici (kayıt klasörü).
- Korelasyon, XY/Lissajous ve faz metresi: belgelerde **yok**.
- Reaper'a özel gömülü entegrasyon: yalnız üçüncü taraf bir kaynakta geçiyor. — https://soundshockaudio.com/dsgdnb-scyllascope/

### 1.4 MeldaProduction MOscilloscope

- **Ürün sayfası (meldaproduction.com/MOscilloscope):** ULAŞILAMADI (ağ kısıtı). Bilgiler arama özetinden:
  - Perde (pitch) dedektörlü osiloskop; dedektör dalga biçiminin **tek bir periyoduna kilitlenir**. Bu, frekansa kilitli bir tetik demek. — https://meldaproduction.com/MOscilloscope , https://www.kvraudio.com/product/moscilloscope-by-meldaproduction
  - Arayüz stillenebilir, boyutlandırılabilir, GPU hızlandırmalı. Klasik metreler ve zaman grafikleri var. M/S, tek kanal ve 8 kanala kadar surround işleme. — https://www.kvraudio.com/product/moscilloscope-by-meldaproduction
  - Ücretsiz. KVR "Free / €49 (diğer eklentiler dahil)" diye listeliyor. Dongle ve internet aktivasyonu gerekmiyor. VST, VST3, AU, AAX. Şubat 2016'da (v9.17) çıktı. — https://bedroomproducersblog.com/2016/02/13/meldaproduction-moscilloscope-vst/
- Sidechain/BPM tetik, çok izli overlay, low-pass görünüm, imleçler, korelasyon/XY: bulunamadı (kılavuza ulaşılamadı).

### 1.5 PhasePaw (GitHub: SpeakingColors/phasepaw)

- **LICENSE dosyası (ilk okunan):** https://github.com/SpeakingColors/phasepaw/blob/main/LICENSE
  - Başlık: "GNU AFFERO GENERAL PUBLIC LICENSE"
  - Sürüm satırı: "Version 3, 19 November 2007"
  - Telif satırı: "Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>"
  - İlk paragraf: "Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed."
  - Yani dosya standart **AGPL-3.0** metni. README lisansı **AGPL-3.0-or-later** olarak belirtiyor.
  - **KB-Align için sonuç:** PhasePaw'dan kod alınırsa türetilmiş eser de AGPL olur; ağ üzerinden kullanım dahil kaynak açma yükümlülüğü doğar. Kod kopyalanmadı.
- **Ne yapıyor** (README; https://github.com/SpeakingColors/phasepaw):
  - Kick ile bas arasında faz hizalama yapan, mono uyumluluğunu hedefleyen ücretsiz ve açık kaynak bir VST3. **Erken geliştirme aşamasında; yayımlanmış derleme yok** (Releases boş). Analiz ve düzeltme çekirdeği C++; sentetik kick/bas örnekleri üzerinde uçtan uca testi geçmiş. Repo topic'lerinde `juce` var.
  - Kurulum: **bas izine** takılır, kick **sidechain** girişinden gelir. Bu, KB-Align'ın kurgusuyla aynı.
  - Görüntü: kick, bas ve toplamları (mono alçak frekans) üst üste. Toplanıp toplanmadıklarını gösteren bir "faz iğnesi". Üçte bir oktav çubuklar; bir bant sürüklenince yalnız o bandın fazı değişir. **Osiloskoptan söz edilmiyor.** Görsel bir maket (mockup), gerçek ekran görüntüsü değil.
  - Karar göstergesi: "in phase / careful / cancelling". Birlikte ulaşılabilecek en yüksek seviye ve alçak frekans seviye değişimi dB cinsinden. Sürgülerde fazın korunduğu bölgeyi gösteren bir "sweet spot" çerçevesi.
  - Düzeltme kontrolleri:
    - polarite çevirme
    - yalnız bir bantta 0–360° faz döndürme (varsayılan 20–200 Hz, EQ etkisi yok)
    - bütün basa uygulanan −10…+10 ms zaman kaydırma
    - üçünü birden ayarlayan "Auto Align"
    - "fix at the source" önerisi (synth başlangıç fazı ya da klibi ms ile kaydırma)
    - vuruştan vuruşa faz değişiyorsa (serbest çalışan osilatör) uyarı ve "retrigger açın" önerisi
  - Dinleme düğmeleri: Mono fold-down, Low-end.
  - Algoritma (çapraz korelasyon vb.): README'de **belirtilmemiş**.
  - Planlanan platformlar: önce Linux VST3, sonra Windows ve macOS.

### 1.6 Aramada çıkan, KB-Align'a yakın diğer ürünler (bağlam için)

- **Scrollscope** (ardura, GitHub): VST3/CLAP/standalone, nih-plug ile yazılmış. Diğer kanallardan **5'e kadar sidechain girişi** çizer, beat/bar senkronu var, farklı DAW zaman tutma biçimleri için "Alt Sync" seçeneği var. README'de lisans görünmüyor. — https://github.com/ardura/Scrollscope
- **Tracer** (KVR forumu): bas izine takılır, kick sidechain'den gelir. Toplanmış görünüm her noktada hangi sinyalin daha yüksek olduğunu renkle gösteriyor. — https://www.kvraudio.com/forum/viewtopic.php?p=9318198 [arama özeti]
- **Fluctor PhaseLock 2.5** (M4L): gerçek zamanlı gecikme, polarite ve faz döndürme hizalaması; çift osiloskop görünümü. — https://cycling74.com/projects/fluctor-audio-phaselock-25-or-realtime-kick-and-bass-phase-alignment
- **Moonbass** (Tsuga Audio): vuruşa kilitli; iki kanal (bas ve kick) yakalayıp yan yana gösteriyor. — https://www.kvraudio.com/product/moonbass-by-tsuga-audio [arama özeti]
- **Sub Ninja:** low-pass filtreli, senkronlu osiloskop; ~29 $. — https://www.pluginboutique.com/product/2-Effects/25-Spectral-Analysis/13437-Sub-Ninja/
- **Cableguys ShaperBox:** osiloskobu vuruşa/bara kilitli (audio ya da MIDI); harici sidechain overlay var. — https://www.kvraudio.com/forum/viewtopic.php?t=588399&start=105 [arama özeti]

### 1.7 KVR forumu — kick/bas hizalamasında osiloskop tekniği (özet, yalnız arama özetlerinden)

Thread sayfaları açılamadı (kvraudio.com ULAŞILAMADI). Arama özetlerinden çıkan teknikler:
1. **Stereo osiloskopla L/R yöntemi:** Kick ile bası scope'un sol ve sağ kanallarına yönlendirip faz ya da başlangıç fazı ayarlanırken ikisi birlikte izleniyor. — "Phase Settings of Synths": https://www.kvraudio.com/forum/viewtopic.php?p=9115313 (aynı thread: p=9116963, p=9118625)
2. **Bas başlangıç fazı:** Basın başlangıç fazını değiştirmek kick ile hizayı iyileştiriyor; 180° farkta ortak frekanslar birbirini siliyor. Synth'te retrigger ya da başlangıç fazı ayarı önemli (aynı thread).
3. **Kick kuyruğuna hizalama:** Psytrance kullanıcıları, kick kuyruğuyla bas üst üste bindiği bölgede bası Pha-979 (faz döndürme) ile hizalıyor; bir kullanıcı ücretsiz FaSampleDelay ile örnek düzeyinde gecikme veriyor. Bir yanıta göre basit gecikme yalnız bazı frekansları hizalayabilir, çünkü hangi frekansların hizalanacağını gecikme uzunluğu belirler; bu yüzden faz döndürme farklı bir araç. — https://www.kvraudio.com/forum/viewtopic.php?p=7860634 , https://www.kvraudio.com/forum/viewtopic.php?p=8085745 , https://kvraudio.com/product/fasampledelay-by-forward-audio
4. **Önce polarite:** Aynı frekans alanında çakışan iki enstrümanda EQ ya da kompresyondan önce polarite çevirmeyi denemek. — "Mixing low end (inverting phase on tracks)": https://www.kvraudio.com/forum/viewtopic.php?p=8908635
5. **Sidechain overlay'li beat-synced scope:** Scope bas izine takılıyor, kick sidechain'e yönlendiriliyor, ikisi aynı ızgarada izleniyor (Tracer, ShaperBox, Audija OScope, Kickdrum). — https://www.kvraudio.com/forum/viewtopic.php?p=9318198 , https://kvraudio.com/forum/viewtopic.php?p=8875757
6. **Toplam tepe seviyesi testi (scope'suz):** Sidechain ducking kapalıyken kick ile bas birlikte çalınıyor; toplam tepe seviyesi solo tepeden yalnız ~1 dB yüksekse faz sorunu var demek. — Bitwig forumu "Oscilloscope alignment issues": https://www.kvraudio.com/forum/viewtopic.php?t=529481 [arama özeti]
7. **Karşı görüş:** EDM kick'i genelde bir sinüs süpürmesi (sweep); tamamını fazda tutmak zor. Bas vuruşları arasında boşluk bırakmak daha mantıklı. Lineer faz EQ hizayı bozmuyor ama zamanlamayı ayrıca dert etmek gerekiyor. — https://www.kvraudio.com/forum/viewtopic.php?p=7545449 ve "Phase Settings of Synths" thread'i
8. "Visual Mixing Techniques" thread'i: osiloskopla kompresyon izleniyor, goniometre ve faz döndürme araçları öneriliyor. — https://www.kvraudio.com/forum/viewtopic.php?p=7552782
- Forum dışından destekleyen kaynak: Phil Speiser — kick sidechain ile scope'a getiriliyor, bas polaritesi çevriliyor, iki dalganın aynı yöne gittiği sürüm seçiliyor. — https://www.philspeiser.com/blog/kick-and-bass-mixing

### 1.8 Karşılaştırma tablosu

| Ürün | Tetik/senkron | Diğer iz sinyali | Görüntü filtresi | Ölçüm | Metre | Freeze/hold | Biçim | Fiyat |
|---|---|---|---|---|---|---|---|---|
| Oszillos Mega Scope | BPM (1/32 not–16 bar) | çok kanal; örnekleri kendisi bulduğu söyleniyor (doğrulanmadı) | band-pass (v1.13) | bulunamadı | dB görünümü | bulunamadı | VST/VST3/AU/AAX/standalone | €19,99→€59 (çelişkili) |
| Audija OScope 2 | beat grid | Full: örnekler birbirini bulur, lane/overlay/stack; sidechain (ücretli) | bulunamadı | true peak | spektrum/spektrogram (v2) | freeze | VST3/AU (free: Win VST3) | Free / Full €19 (normal €38) |
| Scyllascope | Sync / Sync to Start (Live PDC) / Free / Scroll | örnek overlay + Sum, harici SC 3/4, Side2SC | BP (kesim düğmesi, dinlenebilir) | ms, Peak/RMS/Crest dB | yok | Hold + Freeze | VST3/AU/LV2 | Ücretsiz |
| MOscilloscope | perde dedektörü tek periyoda kilitlenir | bulunamadı | bulunamadı | bulunamadı | klasik metreler, zaman grafikleri | bulunamadı | VST/VST3/AU/AAX | Ücretsiz |
| PhasePaw | (scope yok) | bas izinde, kick sidechain'den | 20–200 Hz bant | faz iğnesi, dB değişimi | 1/3 oktav çubuklar | – | VST3 (plan) | Ücretsiz, AGPL-3.0-or-later, derleme yok |

---

## BÖLÜM 2 — Host ve teknik bilgiler

### 2a) Ableton Live

- **PDC genel:** Delay Compensation varsayılan olarak açık. Bütün izleri gereken miktarda kaydırarak ses, otomasyon ve modülasyonu telafi ediyor; bütün izler en uzun iz gecikmesine kadar geciktiriliyor. Dışa aktarmada uygulanması için export'tan önce açık olmalı. — https://help.ableton.com/hc/en-us/articles/209072409 (Delay Compensation FAQ) [arama özeti; sayfa ULAŞILAMADI]
- **Telafi edilmeyenler:** Grafik öğeleri telafi edilmiyor. Hedef izdeki Send açıkken bir audio ize geri yönlendirilen Return izleri de telafi edilmiyor. Lookahead'li dinamik işlemciler sidechain sinyaline **negatif gecikme** uyguluyor; Compressor, Gate ve Limiter lookahead kadar gecikme ekliyor. — aynı FAQ [arama özeti]
  - **KB-Align açısından:** "Graphics not compensated" ifadesi, eklentinin kendi çizdiği scope'un host ekranındaki playhead'le hizasız görünebileceği anlamına gelebilir. Bu bir yorumdur.
- **Sidechain sinyali, eklentiyi barındıran ize göre delay-compensated mı?**
  - Ableton'ın bunu açıkça yazan bir belgesi **bulunamadı**.
  - Ableton forumundaki "Sync Latency Compensation DISASTER" thread'inde kullanıcılar Live'ın ses gecikmesini telafi ettiğini ama kanal senkron zamanlamasını telafi etmediğini, bu yüzden sidechain'in hep biraz geç kaldığını yazıyor. Önerilen geçici çözüm sidechain tetiklemeyi MIDI ile yapmak. Bunlar doğrulanmamış kullanıcı iddiaları. — https://forum.ableton.com/viewtopic.php?p=1772592 , https://forum.ableton.com/viewtopic.php?p=1824619 [arama özeti]
  - "is PDC fixed in 12?" thread'inde Live 12'de de çözülmediği iddia ediliyor. — https://forum.ableton.com/viewtopic.php?t=248746 [arama özeti]
  - **Dolaylı kanıt:** Scyllascope'un "Sync to Start" kipi özellikle "Ableton Live'daki PDC kaymalarını telafi etmek" için var. — https://github.com/sakhnovkrg/Scyllascope-Docs/blob/main/header/mode-selector.md
  - **Sonuç:** Sidechain PDC davranışı resmi olarak doğrulanamadı. KB-Align bunu kendi içinde ölçmeli (ör. kalibrasyon ya da kullanıcıya uyarı) ve test edilmeli.
- **Reduced Latency When Monitoring (RLWM):** Set ile birlikte kaydedilen bir ayar. Yalnız izlenen izlerde (Monitor "In" ya da "Auto" ve kayda hazır) delay compensation'ı atlıyor; bu izler kendi işlemleri biter bitmez çalıyor. Açıkken Monitor'ü "In" yapmak ya da kaydı açmak, izin telafisi aniden değiştiği için tıklamaya yol açabiliyor. — https://help.ableton.com/hc/en-us/articles/209072249 [arama özeti]
  - **KB-Align açısından:** Kick ya da bas izi kayda hazırsa hizalama ölçümü bozulabilir. Bu bir yorumdur.
  - Forumda RLWM'nin zamana dayalı efektlerin zamanlamasını bozduğu şikâyet ediliyor. — https://forum.ableton.com/viewtopic.php?p=1836767
- **Çalışırken gecikme değiştiren eklentiler:** Live'a özgü resmi belge bulunamadı. VST3 tarafında SDK, gecikme kullanım sırasında değişirse eklentinin host'u `restartComponent(kLatencyChanged)` ile bilgilendirmesi gerektiğini söylüyor. SDK'ya göre bu, host yeniden yapılandırma yaptığı için çalmada kesintiye yol açabilir; bu yüzden gecikme sıfır ya da küçük olmalı. — `ivstaudioprocessor.h`, `IAudioProcessor::getLatencySamples` yorumu: https://raw.githubusercontent.com/steinbergmedia/vst3_pluginterfaces/master/vst/ivstaudioprocessor.h
  - Forumdaki eski (Live 9.5) iddia: kapatılan eklenti yalnız çıkışını susturuyor; gecikmesini kaldırmak için Set'ten silmek gerekiyor. — https://www.kvraudio.com/forum/viewtopic.php?p=6286746 [arama özeti]
- **İlgili Live 12 sürüm notları:**
  - Çevrimdışı işleme için ayrı gecikme bildiren eklentilerde bounce edilen seste gecikmenin doğru telafi edilmemesi düzeltildi.
  - Kaynak Group Track iken ve "Include Master and Return Effects" açıkken export'ta sidechain'in çalışmaması düzeltildi.
  - 12.4.5b1: Pre-FX sidechain varken "Bounce to New Track" seçeneğinin devre dışı kalması düzeltildi.
  - — https://www.ableton.com/en/release-notes/live-12/ , https://www.ableton.com/en/release-notes/live-12-beta/ [arama özeti]
- **Eklenti sidechain desteği:** Eklentilerdeki sidechain yönlendirme paneli **Live 10.1** ile geldi ve Ableton'ın kendi kompresörlerindeki gibi çalışıyor. Eklenti harici sidechain desteklemiyorsa bu panel görünmüyor. — https://help.ableton.com/hc/en-us/articles/209775325-Sidechaining-a-3rd-party-plug-in [arama özeti]
  - **VST3 desteği de Live 10.1 ile geldi.** — https://www.kvraudio.com/news/ableton-announces-live-10-1---adds-user-wavetables-new-devices-workflow-upgrades-vst3-support-and-more-44192 , https://www.ableton.com/es/blog/live-101-user-wavetables-new-devices-and-workflow-upgrades
  - Sonuç: VST3 sidechain için en düşük sürüm Live 10.1 olarak görünüyor. Bu iki kaynağın birleştirilmesinden çıkan bir sonuç.
  - UAD notu: VST3'te sidechain anahtarı kendiliğinden açılıyor, AU'da elle açmak gerekiyor. — https://help.uaudio.com/hc/en-us/articles/18479403068820
- **CLAP:** Ableton Live'ın CLAP desteklediğine dair **hiçbir kanıt bulunamadı** (Kasım 2026).
  - Ableton forumunda 2022'den beri süren bir istek thread'i var. — https://forum.ableton.com/viewtopic.php?p=1802875
  - KVR'deki 2024 tarihli "Tracking CLAP hosts" thread'inde CLAP'siz kalan tek büyük DAW'ın Ableton olduğu yazıyor. — https://www.kvraudio.com/forum/viewtopic.php?p=8997562
  - **Live 13** 10 Kasım 2026'da duyuruldu; public beta 13.0b25, tam sürüm 2027 başında. Duyurudaki öne çıkanlar ARA 2 (VST3 kaynağı açık olmalı, yalnız Arrangement görünümünde, aynı anda tek ARA eklentisi) ve Step Sequencer. Haberlerde CLAP geçmiyor. — https://ra.co/news/86362 , https://www.synthtopia.com/content/2026/11/11/ableton-announces-live-13-adding-step-sequencing-ara-2-support-new-sound-design-tools/ , https://thefader.com/2026/11/10/ableton-announces-live-13-with-ara-2-support-and-a-new-step-sequencer
  - Live 13 beta sürüm notlarının kendisi: ULAŞILAMADI.

### 2b) JUCE

- **Güncel kararlı sürüm: 9.0.6.**
  - `juce_StandardHeader.h` (master): `JUCE_MAJOR_VERSION 9`, `JUCE_MINOR_VERSION 0`, `JUCE_BUILDNUMBER 6`. — https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_core/system/juce_StandardHeader.h
  - GitHub Releases'ta 9.0.6 "19 Nov", 9.0.5 "02 Nov" tarihli; yıl gösterilmiyor. Aynı gün 8.0.17-security ve 7.0.14-security yamaları da yayımlanmış. — https://github.com/juce-framework/JUCE/releases
  - 9.0.0 "21 July" tarihli. Öne çıkanlar: SVG ayrıştırıcı, değişken fontlar, yeni macOS CoreAudio, daha hızlı yazılım renderı, Linux'ta OpenGL ES. — https://github.com/juce-framework/JUCE/releases/tag/9.0.0
- **CLAP:** JUCE 9.0.6'da **yerel CLAP dışa aktarımı görünmüyor**:
  - README'deki biçim listesi: "VST, VST3, AU, AUv3, AAX and LV2". — https://github.com/juce-framework/JUCE
  - `modules/juce_audio_plugin_client` klasöründe CLAP dosyası ya da klasörü yok (AAX, AU, AUv3, ARA, LV2, Standalone, Unity, VST2, VST3 var). — https://github.com/juce-framework/JUCE/tree/master/modules/juce_audio_plugin_client
  - CHANGE_LIST.md'de CLAP geçmiyor. — https://github.com/juce-framework/JUCE/blob/master/CHANGE_LIST.md
  - JUCE'un Q3 2024 yol haritası JUCE 9 için doğrudan CLAP yazmayı vaat etmişti. — https://juce.com/?p=1627 [arama özeti]
  - JUCE 9 preview duyurusunda "AudioProcessor v2", örnek düzeyinde otomasyonun temeli, CLAP'e özgü özellikler ve UMP MIDI hâlâ geliştiriliyordu. — https://forum.juce.com/t/the-juce-9-preview-branch-is-available-now/68864 [arama özeti]
  - **Sonuç: CLAP için hâlâ `free-audio/clap-juce-extensions` gerekiyor.** Bu proje MIT lisanslı ve resmi değil. JUCE 6/7/8 için yazılmış; JUCE 9 uyumluluğu README'de belirtilmemiş, test edilmeli. CLAP hosting desteklemiyor. — https://github.com/free-audio/clap-juce-extensions
- **Lisans:**
  - JUCE, AGPLv3 ve ticari JUCE lisansı arasında ikili lisanslı. — https://github.com/juce-framework/JUCE (README, LICENSE.md)
  - JUCE 9 ile fiyat ya da EULA değişikliği yok. — https://forum.juce.com/t/juce-9-no-pricing-or-eula-changes/69000 [arama özeti]
  - Kademeler (JUCE 8 EULA, forumdan aktarılan bilgi) — https://forum.juce.com/t/amendments-to-the-juce-end-user-licence-agreement-for-juce-8/61265 , https://forum.juce.com/t/revenue-limits-for-juce-tiers/61058 [arama özeti]:
    - **Starter:** ücretsiz, gelir sınırı ~20.000 $
    - **Indie:** gelir sınırı ~300.000 $, aylık 40 $/kullanıcı (en az 1 ay) ya da kalıcı ~800 $
    - **Pro:** sınırsız, aylık 175 $/kullanıcı (en az 12 ay) ya da kalıcı ~3.500 $
  - Güncel resmi fiyat sayfası (juce.com/get-juce): ULAŞILAMADI. Rakamlar forumdan, yeniden doğrulanmalı.

### 2c) VST3 SDK ve CLAP lisansı

- **VST3 SDK: MIT.**
  - LICENSE.txt "MIT License" ile başlıyor; telif satırı "Copyright (c) 2026, Steinberg Media Technologies GmbH". — https://github.com/steinbergmedia/vst3sdk/blob/master/LICENSE.txt
  - Geliştirici portalına göre VST 3, **3.8 sürümünden beri MIT** ile lisanslı; GPLv3 ve Steinberg'in özel lisansı artık sunulmuyor. Logo ya da marka kullanımı zorunlu değil, ama kullanılırsa marka kurallarına uymak gerekiyor. — https://steinbergmedia.github.io/vst3_dev_portal/pages/VST+3+Licensing/VST3+License [arama özeti]
  - Basın bülteni 29 Ekim 2025; 3.8.0'ın değişiklik kaydı tarihi 20 Ekim 2025. 3.8 ile MIDI 2.0 arayüzleri (IMidiLearn2, IMidiMapping2) de geldi. — https://www.soundonsound.com/news/steinberg-adopt-mit-license-vst3 , https://cdm.link/open-steinberg-vst3-and-asio/ , https://steinbergmedia.github.io/vst3_dev_portal/pages/Versions/Version+3.8.0.html [arama özeti]
- **CLAP: MIT.** — https://github.com/free-audio/clap (About: "MIT license"). GitHub Releases boş; sürümler tag olarak tutuluyor. Güncel sürüm numarası bu oturumda okunamadı.

### 2d) pluginval ve clap-validator

- **pluginval** (Tracktion; GPLv3). README: https://github.com/Tracktion/pluginval , sürümler: https://github.com/Tracktion/pluginval/releases
  - **Son kararlı sürüm: v1.0.4** ("04 Dec", "Latest" etiketli; yıl gösterilmiyor). Bu sürümde LV2 desteği geldi, JUCE 8.0.3'e geçildi, auval stres testi 20 saniyeyle sınırlandı, CTest için CMake modülü eklendi.
  - **Ön sürüm: v2.0.0-beta3 (14 Oct).** CI için `--junit-xml` ve `--json-results` raporları, referans WAV'lerle çıktı karşılaştıran kabul testi, alt komutlara bölünmüş CLI, JSON `--config`, "Discrete parameter state restoration" testi, JUCE 9.0.3. Beta1/2'deki macOS başlatma hatası düzeltildi.
  - **Strictness seviyeleri 1–10.** README'ye göre 5, host uyumluluğu için genel kabul gören en düşük seviye. Düşük seviyeler hızlı çağrı kapsamı ve çökme testleri yapıyor; yüksek seviyeler parametre fuzzing ve tekrarlanan state restore gibi yavaş testler ekliyor. Kullanım: `pluginval --strictness-level 5 <plugin>`; çıkış kodu 0 = geçti, 1 = başarısız. Forum: 10 en kapsamlı seviye; DAW uyumluluğunu en üst düzeye çıkarır ama hatasızlığı garanti etmez. — https://forum.juce.com/t/anouncing-pluginval-an-open-source-cross-platform-plugin-validation-tool/27710 [arama özeti]
  - Desteklenen biçimler: VST3 (Steinberg validator'ı da çalıştırılıyor), AU (auval), LV2, isteğe bağlı VST2. **CLAP desteği belirtilmemiş.**
- **clap-validator** (free-audio; Rust; MIT). — https://github.com/free-audio/clap-validator
  - CLAP eklentileri için doğrulayıcı ve otomatik test paketi. Varsayılan olarak "pedantic" testler dahil hepsini çalıştırıyor; regex ya da `clap-validator.toml` ile test seçilebiliyor.
  - Deneysel çok süreçli fuzzer: rastgele parametre değişimi, nota açma/kapama ve **transport değişimi** uygulayıp çökme, takılma ve spec ihlali arıyor.
  - Komutlar: `clap-validator validate <plugin.clap>`, `--only-failed`, `--in-process`, `--trace` (Perfetto), `fuzz`, `--reproduce <seed>`.
  - Releases boş; nightly.link derlemeleri var. Sürüm numarası bulunamadı.

### 2e) Tempo / PPQ / transport okuma

- **VST3:**
  - `ProcessData::processContext` bir `ProcessContext*`; başlangıç değeri `nullptr`. Header yorumu "optional, but most welcome" diyor, yani null olabilir ve kontrol edilmeli. — https://raw.githubusercontent.com/steinbergmedia/vst3_pluginterfaces/master/vst/ivstaudioprocessor.h (satır ~255)
  - `ProcessContext` alanları — https://github.com/steinbergmedia/vst3_pluginterfaces/blob/master/vst/ivstprocesscontext.h :
    - Her zaman geçerli: `sampleRate`, `projectTimeSamples`.
    - Bayrakla korunan isteğe bağlı alanlar: `systemTime` (ns, kSystemTimeValid), `continousTimeSamples` (döngüyü yok sayar, kContTimeValid), `projectTimeMusic` (çeyrek nota, kProjectTimeMusicValid), `barPositionMusic` (son barın başı, çeyrek nota, kBarPositionValid), `cycleStartMusic/EndMusic` (kCycleValid), `tempo` (BPM, kTempoValid), `timeSigNumerator/Denominator` (kTimeSigValid), `chord`, `smpteOffsetSubframes` + `frameRate` (kSmpteValid), `samplesToNextClock` (24 PPQ MIDI clock, kClockValid).
    - Durum bayrakları: `kPlaying`, `kRecording`, `kCycleActive`.
- **CLAP:**
  - `clap_process_t::transport` bir `const clap_event_transport_t*` ve **örnek 0'daki** zamanı veriyor. **Null olabilir**: bu durumda host serbest çalışıyor ve transport olayı göndermiyor. — https://github.com/free-audio/clap/blob/main/include/clap/process.h
  - Blok ortasındaki değişiklikler `CLAP_EVENT_TRANSPORT` olayıyla örnek düzeyinde geliyor. — https://github.com/free-audio/clap/blob/main/include/clap/events.h
  - `clap_event_transport_t` alanları: `flags`, `song_pos_beats`, `song_pos_seconds`, `tempo`, `tempo_inc` (örnek başına tempo artışı), `loop_start/end_beats|seconds`, `bar_start` (vuruş cinsinden), `bar_number` (0'dan başlar), `tsig_num/denom`.
  - Bayraklar: HAS_TEMPO, HAS_BEATS_TIMELINE, HAS_SECONDS_TIMELINE, HAS_TIME_SIGNATURE, IS_PLAYING, IS_RECORDING, IS_LOOP_ACTIVE, IS_WITHIN_PRE_ROLL.
  - `clap_beattime` ve `clap_sectime` birer `int64_t` sabit noktalı sayı; `CLAP_BEATTIME_FACTOR = CLAP_SECTIME_FACTOR = 2^31`. Vuruş değeri bu çarpanla çarpılıp yuvarlanıyor. — https://github.com/free-audio/clap/blob/main/include/clap/fixedpoint.h
  - `steady_time`: örneğe özel monoton örnek sayacı; yoksa −1. — process.h
- **AU** (JUCE wrapper'larından doğrulandı; Apple dokümanı ULAŞILAMADI):
  - **AUv2:** host callback'leri `kAudioUnitProperty_HostCallbacks` ile geliyor. AUBase üzerinden `CallHostBeatAndTempo(ppq, bpm)`, `CallHostMusicalTimeLocation(nextBeat'e örnek ofseti, ölçü pay/payda, ölçü başı vuruşu)` ve `CallHostTransportState(playing, playChanged, timeline'daki örnek, looping, cycle başı/sonu)` çağrılıyor. Host bir callback'i desteklemiyorsa JUCE son zaman damgasının `mSampleTime` değerini kullanıyor. — https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_audio_plugin_client/juce_audio_plugin_client_AU_1.mm (satır ~1270–1320)
  - **AUv3:** `AUAudioUnit.musicalContextBlock` (`AUHostMusicalContextBlock`: tempo, ölçü pay/payda, güncel vuruş konumu, sonraki vuruşa örnek ofseti, ölçünün ilk vuruşunun konumu) ve `transportStateBlock` (`AUHostTransportStateBlock`: Moving/Cycling/Recording bayrakları, timeline'daki güncel örnek, cycle başı/sonu vuruşu). — https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_audio_plugin_client/juce_audio_plugin_client_AUv3.mm (satır ~566, ~729–753)
- **JUCE:**
  - `AudioPlayHead::getPosition()` bir `Optional<PositionInfo>` döndürüyor. **Yalnız `processBlock()` içinden (ses iş parçacığından) çağrılmalı**; header başka yerden çağrının yanlış sonuç ya da çoklu iş parçacığı sorunu doğurabileceğini söylüyor. Eski `getCurrentPosition()` deprecated. — https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_audio_basics/audio_play_head/juce_AudioPlayHead.h (satır ~285–537)
  - `PositionInfo` "geçerli audio callback'in başındaki" zamanı tarif ediyor. Getter'ların çoğu `Optional`: `getTimeInSamples`, `getTimeInSeconds`, `getBpm`, `getTimeSignature`, `getLoopPoints`, `getBarCount`, `getPpqPositionOfLastBarStart`, `getFrameRate`, `getPpqPosition`, `getEditOriginTime`, `getHostTimeNs`. `bool` dönenler: `getIsPlaying`, `getIsRecording`, `getIsLooping`.

---

## KB-Align için çıkarımlar (yorum; kaynaklardaki bilgilerden türetildi)

1. Pazarda "sidechain'den gelen kick ile bas overlay'i ve tempoya kilitli görüntü" var (Scyllascope, Audija Full, Tracer, Scrollscope, ShaperBox). **Sinyalin kendisiyle (kick transient'iyle) tetiklenen** bir scope'a incelenen belgelerde rastlanmadı. Yalnız MOscilloscope'ta perdeye kilitli tetik var. Bu bir farklılaşma noktası olabilir.
2. Kullanıcıların tekniği şöyle: polarite → örnek ya da ms düzeyinde kaydırma → faz döndürme (ör. Pha-979) → bas başlangıç fazı/retrigger. PhasePaw aynı üç kontrolü planlıyor ama derlemesi yok ve AGPL lisanslı; ondan kod alınmamalı.
3. Live'da sidechain PDC'si ve RLWM resmi olarak belirsiz. Scyllascope'un "Sync to Start" kipi gibi bir PDC uyarısı ya da ofset seçeneği eklemek mantıklı olabilir. Host gecikmesi çalışırken değiştirilmemeli (VST3 uyarısı).
4. CLAP: JUCE 9.0.6 yerel CLAP üretmiyor, Live de CLAP desteklemiyor. Live'ı hedefleyen bir ürün için VST3 + AU yeterli. CLAP için clap-juce-extensions (MIT) gerekir ve JUCE 9 ile uyumu test edilmeli.
5. Doğrulama: pluginval ≥5 (hedef 10) + clap-validator. Transport null/geçersiz durumları test edilmeli (CLAP `transport` null, VST3 `processContext` null, JUCE `Optional` boş).

---

## URL listesi

**Bölüm 1**
- https://www.kvraudio.com/product/oszillos-mega-scope-by-schulz-audio (ULAŞILAMADI, arama özeti)
- https://www.kvraudio.com/news/benjamin_schulz_releases_oszillos_mega_scope_multi_channel_bpm_synced_oscilloscope_14230
- https://www.kvraudio.com/news/ben-schulz-updates-oszillos-mega-scope-1-11-211-41418
- https://www.kvraudio.com/news/ben-schulz-updates-oszillos-mega-scope---adds-decibel-waveform-display-46584
- https://www.kvraudio.com/news-print.php?id=48390
- https://rekkerd.org/?p=162169
- https://rekkerd.org/?p=217061
- https://bedroomproducersblog.com/2011/03/09/oszillos-mega-scope-updated-to-v1-3-beta-1/
- https://bedroomproducersblog.com/2011/07/05/bpb-freeware-studio-best-free-oscilloscope-vstau-plugins/
- https://www.dontcrack.com/news/2010/04/oszillos-mega-scope-a-free-multi-channel-bpm-synced-oscilloscope/
- https://equipboard.com/items/oszillos-mega-scope
- schulz.audio (ürün sayfası + kılavuz) — ULAŞILAMADI
- https://kvraudio.com/product/oscope-by-audija
- https://kvraudio.com/forum/viewtopic.php?p=8875757
- https://bedroomproducersblog.com/2026/09/30/audija-oscope-2-free/
- https://rekkerd.org/audija-updates-oscope-2-updates-kickdrum-to-v2-9-0/
- https://github.com/sakhnovkrg/Scyllascope-Docs (get-started/introduction.md, header/mode-selector.md, header/menu.md, header/waveform-modes.md, main/instance-overlay.md, main/context-menu.md, main/time-selection.md, footer/bp.md, footer/division-selector.md, footer/side2sc.md, footer/hold-reset.md)
- https://www.kvraudio.com/product/scyllascope-by-dsgdnb
- https://soundshockaudio.com/dsgdnb-scyllascope/
- https://meldaproduction.com/MOscilloscope (ULAŞILAMADI, arama özeti)
- https://www.kvraudio.com/product/moscilloscope-by-meldaproduction
- https://bedroomproducersblog.com/2016/02/13/meldaproduction-moscilloscope-vst/
- https://github.com/SpeakingColors/phasepaw
- https://github.com/SpeakingColors/phasepaw/blob/main/LICENSE
- https://github.com/ardura/Scrollscope
- https://www.kvraudio.com/forum/viewtopic.php?p=9318198
- https://cycling74.com/projects/fluctor-audio-phaselock-25-or-realtime-kick-and-bass-phase-alignment
- https://www.kvraudio.com/product/moonbass-by-tsuga-audio
- https://www.pluginboutique.com/product/2-Effects/25-Spectral-Analysis/13437-Sub-Ninja/
- https://www.kvraudio.com/forum/viewtopic.php?t=588399&start=105
- https://www.kvraudio.com/forum/viewtopic.php?p=9115313
- https://www.kvraudio.com/forum/viewtopic.php?p=9116963
- https://www.kvraudio.com/forum/viewtopic.php?p=9118625
- https://www.kvraudio.com/forum/viewtopic.php?p=7860634
- https://www.kvraudio.com/forum/viewtopic.php?p=8085745
- https://www.kvraudio.com/forum/viewtopic.php?p=8908635
- https://www.kvraudio.com/forum/viewtopic.php?p=7545449
- https://www.kvraudio.com/forum/viewtopic.php?p=7552782
- https://www.kvraudio.com/forum/viewtopic.php?t=529481
- https://kvraudio.com/product/fasampledelay-by-forward-audio
- https://www.philspeiser.com/blog/kick-and-bass-mixing

**Bölüm 2**
- https://help.ableton.com/hc/en-us/articles/209072409 (Delay Compensation FAQ)
- https://help.ableton.com/hc/en-us/articles/209072249 (RLWM FAQ)
- https://help.ableton.com/hc/en-us/articles/360001820360
- https://help.ableton.com/hc/en-us/articles/209775325-Sidechaining-a-3rd-party-plug-in
- https://forum.ableton.com/viewtopic.php?p=1772592
- https://forum.ableton.com/viewtopic.php?p=1824619
- https://forum.ableton.com/viewtopic.php?t=248746
- https://forum.ableton.com/viewtopic.php?p=1836767
- https://www.kvraudio.com/forum/viewtopic.php?p=6286746
- https://www.ableton.com/en/release-notes/live-12/
- https://www.ableton.com/en/release-notes/live-12-beta/
- https://www.kvraudio.com/news/ableton-announces-live-10-1---adds-user-wavetables-new-devices-workflow-upgrades-vst3-support-and-more-44192
- https://www.ableton.com/es/blog/live-101-user-wavetables-new-devices-and-workflow-upgrades
- https://help.uaudio.com/hc/en-us/articles/18479403068820
- https://forum.ableton.com/viewtopic.php?p=1802875
- https://www.kvraudio.com/forum/viewtopic.php?p=8997562
- https://ra.co/news/86362
- https://www.synthtopia.com/content/2026/11/11/ableton-announces-live-13-adding-step-sequencing-ara-2-support-new-sound-design-tools/
- https://thefader.com/2026/11/10/ableton-announces-live-13-with-ara-2-support-and-a-new-step-sequencer
- https://github.com/juce-framework/JUCE
- https://github.com/juce-framework/JUCE/releases
- https://github.com/juce-framework/JUCE/releases/tag/9.0.0
- https://github.com/juce-framework/JUCE/blob/master/CHANGE_LIST.md
- https://github.com/juce-framework/JUCE/tree/master/modules/juce_audio_plugin_client
- https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_core/system/juce_StandardHeader.h
- https://juce.com/?p=1627
- https://forum.juce.com/t/the-juce-9-preview-branch-is-available-now/68864
- https://forum.juce.com/t/juce-9-is-available-now/69175
- https://forum.juce.com/t/juce-9-no-pricing-or-eula-changes/69000
- https://forum.juce.com/t/amendments-to-the-juce-end-user-licence-agreement-for-juce-8/61265
- https://forum.juce.com/t/revenue-limits-for-juce-tiers/61058
- https://github.com/free-audio/clap-juce-extensions
- https://github.com/steinbergmedia/vst3sdk/blob/master/LICENSE.txt
- https://steinbergmedia.github.io/vst3_dev_portal/pages/VST+3+Licensing/VST3+License
- https://steinbergmedia.github.io/vst3_dev_portal/pages/Versions/Version+3.8.0.html
- https://www.soundonsound.com/news/steinberg-adopt-mit-license-vst3
- https://cdm.link/open-steinberg-vst3-and-asio/
- https://github.com/free-audio/clap
- https://github.com/free-audio/clap/blob/main/include/clap/events.h
- https://github.com/free-audio/clap/blob/main/include/clap/process.h
- https://github.com/free-audio/clap/blob/main/include/clap/fixedpoint.h
- https://github.com/Tracktion/pluginval
- https://github.com/Tracktion/pluginval/releases
- https://forum.juce.com/t/anouncing-pluginval-an-open-source-cross-platform-plugin-validation-tool/27710
- https://github.com/free-audio/clap-validator
- https://raw.githubusercontent.com/steinbergmedia/vst3_pluginterfaces/master/vst/ivstaudioprocessor.h
- https://github.com/steinbergmedia/vst3_pluginterfaces/blob/master/vst/ivstprocesscontext.h
- https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_audio_basics/audio_play_head/juce_AudioPlayHead.h
- https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_audio_plugin_client/juce_audio_plugin_client_AU_1.mm
- https://raw.githubusercontent.com/juce-framework/JUCE/master/modules/juce_audio_plugin_client/juce_audio_plugin_client_AUv3.mm
