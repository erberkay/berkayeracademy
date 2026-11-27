# KB-Align: rakip araştırması (research_B)

Tarih: 2026-11-27 (tüm fiyatlar bu tarihte görüldü).

## Yöntem ve sınırlar (önce bunu okuyun)

- **WebFetch bu oturumda çalışmadı.** Denenen her host DNS/izin listesi hatası verdi: `cycling74.com`, `www.kvraudio.com`, `maxforlive.com`. Sonuç: **sayfaların hiçbiri doğrudan okunmadı.** Aşağıdaki her bilgi, WebSearch sonuçlarındaki özetlerden ve kısa alıntılardan geliyor. Kaynak URL'si, bilgiyi özetleyen arama sonucunun URL'si.
- Reddit, arama aracı tarafından engelli (`reddit.com` "not accessible to our user agent"). **Reddit'ten hiçbir kullanıcı yorumu toplanamadı → ULAŞILAMADI.**
- **Ekran görüntüleri görülmedi.** "UI" satırları yalnızca metindeki arayüz tarifleri. Görsel tarifi yoksa "bulunamadı" yazıyor.
- Etiketler: **[ÜRETİCİ]** = üretici iddiası, ürün sayfası, üreticinin forum duyurusu ya da duyurudan haber yazısına aktarılmış bilgi. **[BAĞIMSIZ]** = bağımsız inceleme ya da kullanıcı raporu.
- İstemdeki iki kaynak adı yanlış eşleşmiş çıktı:
  - "Audioblob DeepPerfection": Audioblob ürünün yapımcısı değil, bir inceleme sitesi. Ürün **BruceJames**'in.
  - "Jelly – PhaseLock": **Jelly Audio**'nun ayrı bir PhaseLock eklentisi. Çok mikrofonlu kayıtlar için; Fluctor PhaseLock ile adaşı.

---

## 1. PhaseKicker (StereoGhost)

- **Ne yapar:** Kick ile bas arasındaki faz ilişkisini, sidechain'den gelen her kick vuruşunda otomatik ayarlıyor. Bern'de ikiz kardeşler Gregor ve Joachim Budweiser'in ilk ürünü. [ÜRETİCİ, haber aktarımı]
  - https://bedroomproducersblog.com/2026/11/13/stereoghost-releases-phasekicker-an-automatic-kick-bass-phase-alignment-plugin/
  - https://www.noizefield.com/news/stereoghost-phasekicker-automates-kick-bass-phase-alignment
  - https://rekkerd.org/stereoghost-launches-phasekicker-automatic-kick-bass-phase-alignment-plugin/
- **Hizalama yöntemi:**
  - Algılanan her kick transient'inde hizalamayı yeniden hesaplıyor (vuruş başına, sürekli). Gerekçe, metinde açıkça şöyle: kick–bas ilişkisi bas notasına ve zamanlamaya göre değişir, bu yüzden bir vuruşa uyan ayar sonrakini zayıflatabilir. [ÜRETİCİ] (Noizefield / BPB)
  - Bir StereoGhost temsilcisine göre eklenti basa zaman germe ya da gecikme uygulamıyor. Her kick transient'inde faz kaymaları arasında enterpolasyon yaparak yumuşak geçiş sağlıyor. Yani **saf faz döndürme var, zaman kaydırma yok**. [ÜRETİCİ, forum] https://www.kvraudio.com/forum/viewtopic.php?p=9324469
  - v1.1.0'da "LightMode" eklendi: orijinal ve polaritesi ters çevrilmiş bası karşılaştıran, dalga simetrisini koruyan alternatif bir mod. [ÜRETİCİ] https://www.kvraudio.com/news/stereoghost-updates-phasekicker-automatic-kick-bass-phase-alignment-plugin-to-v1-1-0-70137
  - Frekansa bağlı mı (allpass mı, sabit derece mi)? **bulunamadı**
- **Kullanıcı akışı:**
  1. Bas kanalına ekle.
  2. Kick'i sidechain'e yolla. Gönderim kick'in efektlerinden sonra olmalı.
  3. Threshold'u her kick tetikleyecek şekilde ayarla.
  4. Dalga ekranında "Optimize At" tutamacını sürükle. Önerilen yer: duck'lı basın kick'ten devraldığı nokta ya da geçişin ortası.
  5. Gerekirse ReTrigger aralığını artır.
  - Toplam 3–4 adım ve en az 2 elle ayar. Tek tık değil.
  - v1.1.0 ile Optimize At / ReTrigger nota değeri olarak girilebiliyor (noktalı, triole dahil), ReTrigger en çok 1000 ms. [ÜRETİCİ] (BPB, Noizefield, KVR v1.1.0 haberi)
- **Gecikme / PDC:**
  - "Kayda değer gecikme" var. Üretici bunun işleme yönteminden kaynaklandığını, kaçınılmaz olduğunu ve DAW'ın PDC ile telafi ettiğini söylüyor. Canlı kullanım ve kayıt için değil. Milisaniye değeri **bulunamadı**. [ÜRETİCİ] https://www.kvraudio.com/news/stereoghost-releases-phasekicker---automatic-kick-bass-phase-alignment-plugin-aax-au-and-vst3-69680
  - Negatif gecikme / alt-örnek hassasiyeti / gecikme aralığı: yok, çünkü zaman kaydırma yapmıyor (temsilci beyanı). Ayrıca **bulunamadı**.
- **Sidechain:** zorunlu (kick).
- **Formatlar / işletim sistemi:** VST3 ve AAX (Win/macOS), AU (macOS), Linux'ta VST3 (glibc ≥ 2.39). CLAP: listede yok. [ÜRETİCİ]
  - https://www.kvraudio.com/product/phasekicker-by-stereoghost
  - BPB
- **Fiyat:** 30 Kasım 2026'ya kadar tanıtım fiyatı €39, normal fiyat €49. 14 günlük ücretsiz deneme var. (2026-11-27'de görüldü) [ÜRETİCİ] BPB / Noizefield / Rekkerd
- **Görselleştirme:** "Optimize At" tutamaçlı bir dalga ekranı. Başka ölçer anlatılmıyor. Korelasyon ve faz grafiği **bulunamadı**.
- **Uyarılar ve zayıf yönler:**
  - [ÜRETİCİ] Hizalanmış kick+bas tepeleri tek başlarına olduklarından 6 dB'ye kadar yüksek çıkabiliyor. Sidechain ducking PhaseKicker'dan sonra konmalı. (Noizefield)
  - [BAĞIMSIZ, Gearspace] Kullanıcıların çoğu olumlu ("great plugin", "default olarak kullanacağım").
  - [BAĞIMSIZ, Gearspace] Logic'in sidechain gecikmesini doğru telafi etmeyebileceği endişesi var. Tartışmalı: bir kullanıcı 12.4'te sorun olmadığını yazmış.
  - [BAĞIMSIZ, Gearspace] Çoklu çıkışı olmayan davul kanalında kick ayrılamadığı için "yalnız belli frekansın altını dinle" isteği gelmiş. Üretici frekansa bağlı tetiklemeyi ileriye planlamış.
  - [BAĞIMSIZ, Gearspace] "Optimize At'i nereye koyacağım" sorusu soruldu; bu, bir kullanılabilirlik sürtünmesi.
  - Kaynak: https://gearspace.com/threads/stereoghost-releases-phasekicker-automatic-kick-bass-phase-alignment-vst3-aax-au.1471073/
- **UI (metin tarifi):** Optimize At tutamaçlı dalga ekranı, Threshold ve ReTrigger kontrolleri. Ekran görüntüsü görülmedi.
- **Bas notası değişimini ele alıyor mu?** **EVET, üretici iddiası.** Hesap her kick'te yeniden yapılıyor. Gerekçe açıkça "ilişki bas notasıyla değişir" diye veriliyor. Rekkerd de "her ses ya da nota için elle ayar gerekmez" diye aktarıyor. Bağımsız ölçüm **bulunamadı**.

---

## 2a. PhaseLock 2 / 2.5 / 2.5.1 (Fluctor Audio, Max for Live)

Not: Cycling '74 sayfası yalnızca bir proje vitrini. Ürün Fluctor Audio'nun.

- **Ne yapar:** Bas kanalına konuyor, kick'i hedefliyor, her kick'i hizalıyor. 2.5'te kick tetiklemeli bir hacim şekillendirici de var: yalnız bas bandını, 40–300 Hz arasında seçilen bir frekansın altında düşürüyor. 2.5.1'de bu çok bantlı oldu ve 40–800 Hz'de bölüyor. [ÜRETİCİ]
  - https://cycling74.com/projects/fluctor-audio-phaselock-25-or-realtime-kick-and-bass-phase-alignment
  - https://cycling74.com/projects/fluctor-audio-phaselock-251-or-realtime-kick-and-bass-phase-alignment-multiband-ducking
- **Hizalama yöntemi:** Gecikme + faz döndürme + polarite.
  - **Auto-Align (tek tık):**
    - PhaseLock 2.0 sürümünde 2 saniyelik kick+bas analiziyle gecikmeyi ve polariteyi ayarlıyor. https://maxforlive.com/library/device/15591/phaselock-2
    - 2.5.1'de sonraki 4 kick'i dinliyor ve "statik baslar" için öneriliyor.
  - **Realtime (2.5'te yeni):** Her kick'i ve ardından gelen bası duyulmadan önce ölçüyor. O kick'in Rotation/Polarity/Delay değerlerini, kick çalmadan hemen önce ayarlıyor; üreticiye göre "klik olmadan". [ÜRETİCİ]
    - Cycling '74 2.5 / 2.5.1
    - https://maxforlive.com/library/device/17311/fluctor-audio-phaselock-2-5-1
- **Elle kontroller:**
  - Delay −100…+150 ms (negatif dahil).
  - Rotation −180…+180°.
  - Stereo / Mono / Bass Mono modları, Bass Mono kesimi 50–500 Hz. [ÜRETİCİ] (Cycling '74 2.5)
  - Alt-örnek hassasiyeti: **bulunamadı**.
- **Kullanıcı akışı:** Bas kanalına koy → kick'i hedef seç → Auto-Align'a bas ya da Realtime'ı aç. 2–3 adım. [ÜRETİCİ]
- **Gecikme / PDC:**
  - 2.5: Realtime açıkken yaklaşık 1 vuruş + ~150 ms, kapalıyken ~120 ms.
  - 2.5.1: Realtime açıkken 120 BPM'den itibaren "yaklaşık yarım saniye".
  - Her durumda Live'ın Delay Compensation'ı telafi ediyor. [ÜRETİCİ] (Cycling '74 2.5 ve 2.5.1)
- **Sidechain:** gerekli. Kick hedef olarak seçiliyor.
- **Format / işletim sistemi:** Yalnız Max for Live. Ableton Live 12 + Max 9 ya da üstü şart; Live 11 / Max 8 ile çalışmıyor. Win + macOS. [ÜRETİCİ]
- **Fiyat:** PhaseLock 2, fluctoraudio.com'da $19.90. Tek seferlik ödeme, güncellemeler ücretsiz. Kara Cuma'da %30 indirim var (2026-11-27'de görüldü). PhaseLock 1 sahiplerine indirimli yükseltme. 2.5.x'in ayrı fiyatı **bulunamadı**; ürün sayfası "PhaseLock 2" adını kullanıyor. [ÜRETİCİ] https://fluctoraudio.com/products/phaselock/
- **Görselleştirme:** Çift osiloskop. Zoom, Pan, Max Kick ve Max Bass büyütme ayarları var. [ÜRETİCİ] (Cycling '74 2.5)
- **Şikâyetler:** Bağımsız inceleme ya da forum şikâyeti **bulunamadı**. Reddit ULAŞILAMADI. Çıkarım (kaynaklı değil): kendi beyan ettiği Realtime gecikmesi (~0,5 s) ve yalnız Live 12 desteği belirgin sınırlar.
- **UI:** metin tarifi "çift osiloskop + Delay/Rotation/mod kontrolleri". Görsel **bulunamadı**.
- **Bas notası değişimi:** **EVET, üretici iddiası, açıkça.**
  - "When your bassline changes notes, the alignment follows." (maxforlive 2.5.1)
  - Ürün sayfasına göre synth her notayı rastgele fazla başlatsa bile nota nota takip ediyor.
  - Auto-Align modu ise açıkça statik baslar için.
  - Bağımsız doğrulama **bulunamadı**.

## 2b. "Jelly – PhaseLock reviews" = Jelly Audio PhaseLock (Tape Op incelemesi)

- **Ne:** Çok kanallı, otomatik faz düzeltme eklentisi. Kick/bas'a özel değil.
- **Yöntem:** 3 tür otomatik düzeltme anlatılıyor:
  - Polarite çevirme.
  - "Phase Coherence": allpass filtrelerle frekans bölgelerini hizalıyor, yani frekansa bağlı.
  - "Time Align": izi öne/geri kaydırıyor, iz başına açılıyor, varsayılan kapalı.
  - [BAĞIMSIZ, Tape Op incelemesi, yöntem tarifi] https://tapeop.com/reviews/gear/176/phaselock-phase-alignment-plug-in
- **Bağımsız deneyim (Larry Crane, Tape Op):**
  - Çok mikrofonlu ve DI'lı elektrik baste iyi sonuç verdi.
  - Akustik gitar + vokalde Time Align iyi çalıştı.
  - Room mikrofonlarını öne çekip incelttiği görüldü (zayıf yön).
  - Hüküm: "a gem".
- **Fiyat / format / işletim sistemi / gecikme / görselleştirme:** **bulunamadı**.
- **Bas notası değişimi:** kanıt **bulunamadı**. Kick–bas sidechain ürünü değil.

---

## 3. DeepPerfection (BruceJames). İnceleme: Audioblob

- **Ne yapar:** Alçak frekans "faz restorasyonu". Kick ya da bas kanalına konuyor, öteki kaynak sidechain'e veriliyor.
  - 20–160 Hz bandında iki kaynağın faz ilişkisini analiz ediyor.
  - İptalle kaybolan enerjiyi **toplamsal olarak geri ekliyor**, gerçek zamanlı.
  - Duck yapmıyor; pitch warp ya da zaman kaydırma yapmadığını söylüyor.
  - [ÜRETİCİ] https://www.kvraudio.com/product/deepperfection-by-brucejames · https://www.kvraudio.com/forum/viewtopic.php?t=630747 · https://brucejames.studio/
- **Yöntem:**
  - Hizalama değil, sinyal ekleme. Sürekli ve gerçek zamanlı çalışıyor.
  - Bant içinde frekansa bağlı çalıştığı ima ediliyor; algoritma ayrıntısı **bulunamadı**.
  - v2.2.0 ile frekans aralığının üst sınırı açılabiliyor; ne kadar yükseğe çıkılırsa CPU yükü o kadar artıyor. [ÜRETİCİ] https://gearspace.com/threads/low-end-phase-restoration-deepperfection-2-2-0-update-is-out-and-the-frequency-range-can-now-be-unlocked.1467106/
  - Eski demo başlığı "250 Hz altı" diyor. Sürüme göre değişmiş.
- **Kontroller:** Source Priority, gerçek zamanlı "collision analyser", Restore %, Cutoff, More, Tighten, Behaviour, Greater, isteğe bağlı saturasyon, dry/wet, Null Test. [ÜRETİCİ] (KVR marketplace)
- **Kullanıcı akışı:** Ekle → sidechain'i yönlendir → Cutoff/Restore. Yaklaşık 2–3 adım. [ÜRETİCİ]
- **Gecikme:** 240 örnek. Bir Gearspace kullanıcısı sordu, geliştirici doğruladı ve "kayıt için değil, miks eklentisi" dedi. Negatif gecikme ya da zaman kaydırma yok. [ÜRETİCİ, forum] https://gearspace.com/board/new-product-alert/1465149-new-release-deepperfection-real-time-low-end-phase-correction-vst3-au-clap-3.html
- **Sidechain:** zorunlu.
- **Formatlar:** VST3 / AU / CLAP. KVR ürün sayfası AAX'i de listeliyor. macOS / Windows; geliştirici listesinde Linux da var. Kaynaklar arasında tutarsızlık var.
- **Fiyat:** $49.99, demo mevcut (2026-11-27'de görüldü). [ÜRETİCİ] KVR marketplace / brucejames.studio
- **Görselleştirme:** "real-time collision analyser" (üretici adı). Ayrıntı **bulunamadı**.
- **Zayıf yönler [BAĞIMSIZ]:**
  - Audioblob (Marty G, Bitwig'de test, 31 Tem 2026; geliştirici inceleme lisansı vermiş, editoryal müdahale yokmuş):
    - Tek seferde tek kanal işliyor; gerçek stereo alçak frekans zahmetli.
    - Üst üste kullanınca CPU'yu zorluyor.
    - Uygulanan düzeltmenin sayısal göstergesi yok.
    - https://audioblob.com/deepperfection/
  - KVR'deki tek kullanıcı incelemesi (5★, Haz 2026) de değer göstergesi istiyor. https://www.kvraudio.com/product/deepperfection-by-brucejames/reviews
- **UI:** görsel tarifi **bulunamadı**.
- **Bas notası değişimi:** Açık kanıt **bulunamadı**. Sürekli ve gerçek zamanlı ek yapıldığı için notaya özel bir mantığa gerek olmayabilir, ama bu bir çıkarım. Sabit gecikme ya da derece kullanmıyor.

---

## 4. Little Labs IBP (UAD eklentisi + donanım)

- **Ne yapar:** Elle sürekli değişken faz kaydırma.
  - "Phase Adjust" kontrolü; aralığı bir anahtarla 180° (devre dışı) ya da 90° (devrede).
  - Ayrı bir Phase Invert anahtarı.
  - "Phase Center" lo/hi anahtarı alçak ya da yüksek frekanslı malzemeye odaklıyor.
  - "Workstation" sürümünde Delay Adjust 0.0–4.0 ms.
  - Donanım analog allpass filtre kullanıyor; UAD eklentisi onun modeli.
  - [ÜRETİCİ]
    - https://www.uaudio.com/uad-plugins/special-processing/little-labs-ibp.html
    - https://help.uaudio.com/hc/en-us/articles/35454419978388-Little-Labs-IBP-Manual
- **Yöntem:** Allpass ile faz döndürme (frekansa bağlı) + küçük bir gecikme (0–4 ms). Elle, statik, tek seferlik ayar. Otomatik analiz yok.
- **Akış:** Kulakla ya da ölçerle Phase Adjust ayarlanıyor. Sabit adım sayısı yok.
- **Gecikme / negatif gecikme / alt-örnek:** **bulunamadı**. Negatif gecikme yok (aralık 0–4 ms).
- **Sidechain:** yok.
- **Formatlar:** VST2 / VST3 / AU / AAX, macOS / Windows (KVR). UAD-2 DSP eklentisi; Apollo ya da UAD Accelerator gerekiyor.
  - **Native/UADx sürümü bulunamadı.** Arama sonuçlarındaki ürün sayfası hâlâ donanım şartını yazıyor. Little Labs Voice of God 2 Nis 2026'da native'e geçti, IBP için böyle bir duyuru bulunamadı.
  - https://www.kvraudio.com/product/uad-little-labs-ibp-phase-alignment-tool-by-universal-audio
- **Fiyat:**
  - UAD eklentisi: ürün sayfası özetinde normal $99, indirimde $49. Yapısal veride $29 (priceValidUntil 2026-11-30). Çelişkili, canlı mağazadan doğrulanmalı. https://www.uaudio.com/products/little-labs-ibp
  - Donanım IBP: Sweetwater'da $630; liste fiyatı $700 olarak görünüyor. IBP Jr $490. https://www.sweetwater.com/store/detail/IBP--little-labs-ibp-analog-phase-alignment-tool
- **Görselleştirme:** **bulunamadı** (görünen o ki yok).
- **Şikâyetler [BAĞIMSIZ]:**
  - Sound On Sound: kılavuz kullanıcı övgüleriyle dolu, pratik yardım az. Kick ve baste sonuçlar "beautiful".
    - https://www.soundonsound.com/reviews/little-labs-ibp
    - https://www.soundonsound.com/node/4915989
  - MusicRadar'ın eksiler bölümü **ULAŞILAMADI**.
- **UI:** görsel tarifi **bulunamadı**.
- **Bas notası değişimi:** **Hayır, kanıt yok.** Statik elle ayar; sabit derece tek bir frekansta doğru.

---

## 5. Kilohearts Disperser

- **Ne yapar:** Frekansa bağlı gecikme üretmek için ayarlanmış bir allpass filtre yığını. Kazanç eklemiyor.
  - Amount: düşük ayarda duyulmayacak kadar küçük faz kayması, ama crest factor'ü azaltabiliyor.
  - Pinch: grup gecikmesini dar bir banda topluyor.
  - [ÜRETİCİ] https://kilohearts.com/docs/disperser · https://kilohearts.com/products/disperser
- **Yöntem:** Statik allpass, frekansa bağlı faz/grup gecikmesi. Analiz yok, sidechain yok, kick–bas hizalama aracı değil.
- **Kick ve bas:**
  - Belgelere göre davulun basını yayıyor ve daha yüksek gibi duyuruyor. [ÜRETİCİ]
  - Equipboard'da anekdot: az kullanılırsa kick–bas faz sorununu çözebiliyor, aşırısı punch kaybettiriyor. [BAĞIMSIZ ama kullanıcı kaynaklı] https://equipboard.com/items/kilohearts-disperser
- **Gecikme:** **bulunamadı**. Negatif gecikme / alt-örnek: uygulanamaz.
- **Sidechain:** yok.
- **Formatlar:** VST / VST3 / AU / AAX + Kilohearts Snapin (Snap Heap / Multipass / Phase Plant içinde). Win / macOS. KVR sürümü 2.4.6.
  - https://blog.dubspot.com/plugins/disperser
  - https://www.kvraudio.com/product/disperser-by-kilohearts/details
- **Fiyat:** $59, ayrıca Kilohearts aboneliğinde ($9.99/ay, Dubspot'a göre). Bax-shop'ta £49. 2013 çıkışında €15 / $19.
- **Görselleştirme:** **bulunamadı**.
- **Zayıf yönler [BAĞIMSIZ]:**
  - MusicRadar: yumuşak, transient'siz kaynaklarda pek bir şey yapmıyor. https://www.musicradar.com/reviews/tech/kilohearts-disperser-581504
  - Dubspot: ne kazandırdığını bilmeyene etkisi ince geliyor; aşırı kullanımda punch ve RMS kaybı.
- **UI:** Kontroller Amount ve Pinch (+ frekans). Kontrol sayısında kaynaklar çelişiyor (2 ya da 3). Görsel **bulunamadı**.
- **Bas notası değişimi:** **Hayır.** Statik filtre, kick'e duyarlı değil, kanıt yok.

---

## 6. iZotope Neutron 5, Phase modülü

- **Ne yapar:** Rotation, Delay, polarite ve "Learn". Kendi başına kullanıldığında asimetrik dalgayı "düzleştirip" tepe seviyesini düşürüyor. Sidechain ile kullanıldığında zaman/faz hizalaması yapıyor (çok mikrofonlu davul, kick/snare örnek katmanlama). Modül Neutron 5 ile geldi. [ÜRETİCİ]
  - https://www.izotope.com/en/learn/phase-module-neutron.html
  - https://www.izotope.com/en/learn/whats-new-in-neutron-5.html
  - https://www.izotope.com/en/products/neutron/features/phase
- **Yöntem:** Faz döndürme (derece) + zaman kaydırma (Delay). Learn tek seferlik bir analiz. Sürekli ya da vuruş başına izleme olduğuna dair kanıt **bulunamadı**. Frekansa bağlı (allpass) olup olmadığı **bulunamadı**.
  - MusicRadar: Learn ana girişin ve sidechain'in fazını analiz edip düzeltme yapıyor. [BAĞIMSIZ] https://www.musicradar.com/music-tech/software-apps/its-biggest-asset-is-its-ease-of-use-izotope-neutron-5-review
- **Akış:** Kaynak izi hedefin sidechain'ine yolla (DAW'da) → çal → Learn → gerekirse Rotation/Delay ile ince ayar. [BAĞIMSIZ, Mix Online] https://www.mixonline.com/technology/reviews/plug-ins/izotope-neutron-5-a-mix-real-world-review
- **Gecikme:** Neutron genel olarak gecikme getiriyor ve DAW telafi ediyor. Modüllerde işlemeyi değiştiren sıfır gecikme seçeneği var. [BAĞIMSIZ, SOS] https://www.soundonsound.com/reviews/izotope-neutron-5
  - Delay aralığı, negatif gecikme ve alt-örnek hassasiyeti: **bulunamadı**.
- **Sidechain:** otomatik hizalama için gerekli.
- **Formatlar:** AU (yalnız Mac), AAX, VST3; 64-bit. Win / macOS.
- **Fiyat:** Neutron 5 $299, Elements $55, sadakat fiyatı $199 (2026-11-27'de görüldü). https://www.native-instruments.com/en/products/izotope/neutron-5/pricing/
- **Görselleştirme:** Osiloskop tarzı ekran: ana iz, sidechain, ikisi birden ya da toplam dalga. [BAĞIMSIZ, Mix Online] Korelasyon ölçer **bulunamadı**.
- **Zayıf yönler [BAĞIMSIZ, genel Neutron]:** Phase modülüne özel şikâyet bulunamadı. Genel Neutron eleştirileri:
  - Çok örnekte yüksek CPU.
  - Yoğun arayüz.
  - Yüksek tam fiyat.
  - Kaynaklar: Dubspot, https://pluginoise.com/neutron-5-review/
- **UI:** Osiloskop + Rotation düğmesi + belirgin Learn düğmesi + Delay (metin tarifi).
- **Bas notası değişimi:** **Kanıt bulunamadı.** Learn bir kez yakalanan bir ayar olarak anlatılıyor. Dolayısıyla tek bir derece ancak tek bir notaya uyar; bu bir çıkarım, belgelenmiş davranış değil.

---

## 7. JMG Sound DropKick (Sound On Sound, Paul White, Nisan 2024)

- **Ne yapar:** Kick davul işlemcisi, tek düğmeli 8 işlemciden oluşuyor:
  - Phase bölümü: "Warp" analog modellenmiş allpass filtrelerle alçak frekansları zamanda kaydırıyor; "X Filter" kaç allpass kullanılacağını seçiyor.
  - Power (HPF).
  - Fire: psikoakustik yeniden sentez.
  - Kompresyon, atak vurgusu, alt-orta temizliği, tiz sönümleme.
  - [BAĞIMSIZ, SOS] https://www.soundonsound.com/reviews/jmg-dropkick
- **Yöntem:** Statik allpass, frekansa bağlı. Yalnız kick'i şekillendiriyor; basa göre hizalama yapmıyor.
- **Sidechain:** **bulunamadı**. Bas hizalaması için sidechain olduğuna dair kanıt yok.
- **Gecikme / negatif gecikme / alt-örnek:** **bulunamadı**.
- **Formatlar:** VST / VST3 / AU / AAX, Mac / Win; United Plugins üzerinden, anahtar dosyası birden çok bilgisayarda çalışıyor. https://www.gearnews.com/jmg-sound-dropkick
- **Fiyat:** 2024'te £59 / $74, basım sırasında £16 / $20'ye indirimli. Güncel fiyat **bulunamadı**. 15 günlük deneme var (Bonedo).
- **Görselleştirme:** **bulunamadı**.
- **Zayıf yönler [BAĞIMSIZ, SOS]:** Logic'te ikinci monitörde grafik bozulması. Genel hüküm çok olumlu.
- **UI:** "çok sezgisel arayüz", tek düğmeli işlemciler (metin). Görsel **bulunamadı**.
- **Bas notası değişimi:** **Hayır, kanıt yok.** Bas ile ilişki kurmuyor.

---

## 8. Derleme / açıklayıcı makaleler

### Integraudio: "Top 7 Phase Alignment Plugins To Fix Your Bass & Drums" (yaklaşık 400 günlük)
https://integraudio.com/7-best-phase-alignment-plugins/

Listede kick/bas'a özel bir ürün yok; hepsi genel faz araçları:
- SSL Native X-Phase: allpass, seçilen frekansta faz ofseti.
- FLUX Evo In: gecikmesiz, 180°'ye kadar döndürme, çok mikrofonlu kayıt.
- MeldaProduction MAutoAlign: tam otomatik örnek gecikmesi bulma.
- Sound Radix Auto-Align: otomatik + elle.
- MAAT RSPhaseShifter: analog faz döndürücü emülasyonu, otomatik değil.
- Voxengo PHA-979: lineer faz, gecikme hesaplayıcı, kick/bas için "Force Mono" önerisi.
- Waves InPhase.
- Bonus: Eventide Precision Time Align.

### Audiophiles: "Best Phase Alignment Plugins 2026"
https://audiophiles.co/phase-alignment-plugin/

Dört ürün; arama sonucuna göre içerik ince ve tekrar ediyor:
- SSL Native X-Phase.
- MAutoAlign: yoğun mikrofon sızıntısında tutarsız olabiliyor.
- MAAT RSPhaseShifter.
- Eventide Precision Time Align: alt-örnek gecikme.

Kick/bas'a özel ürün yok.

### Mastering The Mix: "Automatic Phase Fixing in Mixing" → FUSER
https://www.masteringthemix.com/blogs/learn/automatic-phase-fixing-in-mixing · https://www.masteringthemix.com/products/fuser

FUSER **kick/bas'a özel kullanılıyor**:
- Basa konuyor, kick sidechain'e veriliyor. Tipik çakışma bandı 50–120 Hz.
- Modlar:
  - **Phase Rotate:** ±180°, elle.
  - **Automatic Phase Optimization:** analiz edip toplamı en güçlü yapan dönüşe atlıyor. Tek seferlik.
  - **Phase Match:** frekans frekans, saldırgan; üretici kendisi "yıkıcı olabilir" uyarısı yapıyor.
- "Sıfır gecikme" iddiası var. [ÜRETİCİ]
- Plugin Boutique kullanıcı özetleri: yüksek CPU, daha derin ayar isteği.
- Notaya göre izleme kanıtı **bulunamadı**.

### Aramada çıkan, kick/bas'a özel diğer rakipler (kısa)

- **Slypork KerBy** (kick+bas *enstrümanı*, VST3 / AU, mac / Win, AAX yok)
  - Fiyat: tanıtım $39, 24 Kasım 2026'dan sonra $49.
  - Auto-align, **her bas vuruşunda o nota için** kick kuyruğuna karşı en az iptal eden fazı seçiyor ve bas filtresinin faz kaymasını da hesaba katıyor. [ÜRETİCİ] Yani **açıkça nota başına**, ama yalnız kendi bas sesi için.
  - Ücretsiz DucKy ducker eşlik ediyor.
  - Kaynaklar: https://www.kvraudio.com/product/kerby-by-slypork · https://www.noizefield.com/news/slypork-kerby-kick-and-bass-instrument-plugin
- **Wagner Who "Kick & Bass Auto Mix"** ($37, VST3 / AU, Win / macOS, AAX ve Pro Tools yok)
  - Tek tık: 1, 2 ya da 4 ölçü analiz.
  - Vuruş başına **faz döndürme** (zaman kaydırma yok), seviye dengesi, 130 Hz altı ducking (0–24 dB).
  - Bas örneği ~80 ms gecikme ekliyor; 30 Hz'e kadar döndürme için look-ahead gerekiyor.
  - Bas notasını izleyen ek katmanlar (Bass Textures, Stabs).
  - Örnek techno döngüsünde 8 vuruşta yaklaşık −8°…115° arası farklı açılar gösteriyor: sabit açının yetmediğine dair üretici kanıtı. [ÜRETİCİ]
  - Kaynaklar: https://wagnerwho.com/en/plugins/kick-bass-auto-mix/ · https://wagnerwho.com/fr/apprendre/plugin-alignement-de-phase/
- **M:G Audio PHASE** (ücretsiz, VST3 / AU)
  - SMART ASSIST yaklaşık 4 s dinliyor, en az 6 kick istiyor.
  - Değişikliği yalnızca şu koşullarda uyguluyor: alçak frekans ≥0.35 dB iyileşmeli, vuruşların ¾'ü iyileşmeli, hiçbir vuruş >0.5 dB kötüleşmemeli.
  - ~30 ms gecikme. Tüm kontroller sıfırdayken çıkış girişle bit bit aynı.
  - [ÜRETİCİ] https://www.kvraudio.com/product/phase-by-m-g-audio
- **FREAK PHASE** (ücretsiz M4L): faz döndürme, örnek düzeyinde gecikme, polarite; elle. https://www.maxforlive.com/library/device.php?id=15505
- Kick/bas'a özel olmayan ama bağlamda geçenler:
  - Sound Radix Pi: mikserde dinamik faz döndürme.
  - RiverFlux PHIXER (ücretsiz).
  - ConjureDSP ConjureAlign (ücretsiz).
  - Soundins OmniPass (ücretsiz).
  - Process.Audio Protility: 1. derece allpass.

---

## Bas notası (φ = 360·f·Δt) özet tablosu

| Ürün | Analiz | Zaman kaydırma? | Nota değişimini ele alıyor mu? | Kanıt türü |
|---|---|---|---|---|
| PhaseKicker | Kick vuruşu başına | Hayır (faz enterpolasyonu) | Evet (iddia, gerekçe açık) | Üretici |
| Fluctor PhaseLock 2.5 Realtime | Kick vuruşu başına | Evet, −100…+150 ms + döndürme + polarite | Evet (açık iddia) | Üretici |
| Fluctor Auto-Align | Tek seferlik (4 kick) | Evet | Hayır, "statik baslar için" | Üretici |
| DeepPerfection | Sürekli, toplamsal | Hayır | Açık kanıt yok | Üretici |
| KerBy (enstrüman) | Bas notası başına | ? | Evet, filtre fazı dahil | Üretici |
| Wagner Who K&B Auto Mix | Tek tık analiz, vuruş başına değerler | Hayır | Vuruş başına evet, nota ayrımı belirtilmemiş | Üretici |
| M:G PHASE | Tek seferlik (4 s) | ? | Kanıt yok | Üretici |
| FUSER | Tek seferlik optimizasyon | Hayır | Kanıt yok | Üretici |
| Neutron Phase | Learn, tek seferlik | Evet (Delay) | Kanıt yok | Üretici / bağımsız |
| IBP, Disperser, DropKick | Elle / statik | IBP 0–4 ms, diğerleri allpass | Hayır | — |

**Hiçbir üründe bağımsız bir ölçüm (ör. değişen bas notasında hizalama doğruluğu) bulunamadı.**

---

## Kullanılan URL'ler

Arama sonuçlarından. Doğrudan WebFetch başarısız oldu (cycling74.com, kvraudio.com, maxforlive.com).

**PhaseKicker (StereoGhost)**
- https://bedroomproducersblog.com/2026/11/13/stereoghost-releases-phasekicker-an-automatic-kick-bass-phase-alignment-plugin/
- https://www.noizefield.com/news/stereoghost-phasekicker-automates-kick-bass-phase-alignment
- https://rekkerd.org/stereoghost-launches-phasekicker-automatic-kick-bass-phase-alignment-plugin/
- https://www.kvraudio.com/news/stereoghost-releases-phasekicker---automatic-kick-bass-phase-alignment-plugin-aax-au-and-vst3-69680
- https://www.kvraudio.com/news/stereoghost-updates-phasekicker-automatic-kick-bass-phase-alignment-plugin-to-v1-1-0-70137
- https://www.kvraudio.com/product/phasekicker-by-stereoghost
- https://www.kvraudio.com/forum/viewtopic.php?p=9324469
- https://www.kvraudio.com/forum/viewtopic.php?p=9325736
- https://gearspace.com/threads/stereoghost-releases-phasekicker-automatic-kick-bass-phase-alignment-vst3-aax-au.1471073/
- https://stereoghost.ch/phasekicker (yalnız arama sonucu başlığı)

**PhaseLock (Fluctor Audio)**
- https://cycling74.com/projects/fluctor-audio-phaselock-25-or-realtime-kick-and-bass-phase-alignment
- https://cycling74.com/projects/fluctor-audio-phaselock-251-or-realtime-kick-and-bass-phase-alignment-multiband-ducking
- https://maxforlive.com/library/device/15591/phaselock-2
- https://maxforlive.com/library/device/17311/fluctor-audio-phaselock-2-5-1
- https://www.maxforlive.com/library/device/15192/phaselock
- https://fluctoraudio.com/products/phaselock/
- https://fluctoraudio.com/blog/fix-kick-and-bass-phase-ableton/

**PhaseLock (Jelly Audio)**
- https://tapeop.com/reviews/gear/176/phaselock-phase-alignment-plug-in

**DeepPerfection (BruceJames)**
- https://audioblob.com/deepperfection/
- https://www.kvraudio.com/product/deepperfection-by-brucejames
- https://www.kvraudio.com/marketplace/deepperfection-by-brucejames
- https://www.kvraudio.com/product/deepperfection-by-brucejames/reviews
- https://www.kvraudio.com/forum/viewtopic.php?t=630747
- https://gearspace.com/board/new-product-alert/1465149-new-release-deepperfection-real-time-low-end-phase-correction-vst3-au-clap-3.html
- https://gearspace.com/threads/low-end-phase-restoration-deepperfection-2-2-0-update-is-out-and-the-frequency-range-can-now-be-unlocked.1467106/
- https://brucejames.studio/

**Little Labs IBP**
- https://www.uaudio.com/uad-plugins/special-processing/little-labs-ibp.html
- https://www.uaudio.com/products/little-labs-ibp
- https://help.uaudio.com/hc/en-us/articles/35454419978388-Little-Labs-IBP-Manual
- https://www.kvraudio.com/product/uad-little-labs-ibp-phase-alignment-tool-by-universal-audio
- https://www.soundonsound.com/reviews/little-labs-ibp
- https://www.soundonsound.com/node/4915989
- https://www.musicradar.com/reviews/tech/uad-little-labs-ibp-203114
- https://www.sweetwater.com/store/detail/IBP--little-labs-ibp-analog-phase-alignment-tool
- https://help.uaudio.com/hc/en-us/articles/32181404310420-UAD-Native-Plug-Ins-Release-Notes

**Kilohearts Disperser**
- https://kilohearts.com/docs/disperser
- https://kilohearts.com/products/disperser
- https://www.musicradar.com/reviews/tech/kilohearts-disperser-581504
- https://blog.dubspot.com/plugins/disperser
- https://equipboard.com/items/kilohearts-disperser
- https://www.kvraudio.com/product/disperser-by-kilohearts/details
- https://www.sweetwater.com/store/detail/kHsDisperser--kilohearts-disperser-transient-shaping-plug-in

**iZotope Neutron 5 (Phase modülü)**
- https://www.izotope.com/en/learn/phase-module-neutron.html
- https://www.izotope.com/en/learn/whats-new-in-neutron-5.html
- https://www.izotope.com/en/products/neutron/features/phase
- https://www.mixonline.com/technology/reviews/plug-ins/izotope-neutron-5-a-mix-real-world-review
- https://www.musicradar.com/music-tech/software-apps/its-biggest-asset-is-its-ease-of-use-izotope-neutron-5-review
- https://www.soundonsound.com/reviews/izotope-neutron-5
- https://mixdownmag.com.au/features/in-focus-izotope-neutron-5/
- https://www.native-instruments.com/en/products/izotope/neutron-5/pricing/
- https://pluginoise.com/neutron-5-review/

**JMG Sound DropKick**
- https://www.soundonsound.com/reviews/jmg-dropkick
- https://www.gearnews.com/jmg-sound-dropkick

**Derleme / açıklayıcı makaleler (FUSER dahil)**
- https://integraudio.com/7-best-phase-alignment-plugins/
- https://audiophiles.co/phase-alignment-plugin/
- https://www.masteringthemix.com/blogs/learn/automatic-phase-fixing-in-mixing
- https://www.masteringthemix.com/products/fuser
- https://isotonikstudios.com/fix-your-kick-bass-phase-issues-in-seconds/

**Aramada çıkan diğer rakipler**
- https://www.kvraudio.com/product/kerby-by-slypork
- https://www.noizefield.com/news/slypork-kerby-kick-and-bass-instrument-plugin
- https://wagnerwho.com/en/plugins/kick-bass-auto-mix/
- https://wagnerwho.com/en/learn/mix-kick-and-bass-automatically/
- https://wagnerwho.com/fr/apprendre/plugin-alignement-de-phase/
- https://www.kvraudio.com/product/phase-by-m-g-audio
- https://www.maxforlive.com/library/device.php?id=15505
