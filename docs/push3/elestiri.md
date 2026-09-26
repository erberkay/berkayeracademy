# Tamlık eleştirisi: Push 3 emülatörü şartnamesinde eksikler (önem sırasıyla)

Not: Bana gelen şartname `scaleNoteMantigi` içinde, `SCALES` dizisinin "Messiaen 4" satırında kesiliyor. Kesik kısmın incelenmesi ayrıca gerekiyor: pad→nota formülü, In Key/Chromatic pad renkleri, drum pad eşlemesi, pointer'dan velocity türetme ve varsa `P3_TUTORIAL` adım tanımları. Aşağıda "görünmüyor" dediğim yerler bu kesikten etkilenmiş olabilir.

## A. Kritik: kullanıcının isteği karşılanmıyor veya şartname kendi içinde çelişiyor

1. **Müfredat ile şartname birbirini tutmuyor.**
   - Müfredat özetinde 9 bölüm (1–9) ve 61 adım var.
   - Şartname ise şunlardan söz ediyor:
     - Faz 1'de "Bölüm 0–6, 47 adım".
     - Faz 2'de "Bölüm 7–10".
     - Learn sayfası için "sayfa 2: 8–10", yani toplam 11 bölüm.
   - Bölüm 0 ("Başlarken") ve Bölüm 10 müfredatta hiç yok.
   - Hesap da tutmuyor. Bölüm 1–6 = 8+6+6+8+7+8 = 43 adım. 47'ye ulaşmak için Bölüm 0'ın 6 adım olması gerekir, ama bu yazılmamış.
   - "5.8 hariç" ve "6.9 hariç" diye anılan adımlar müfredatta yok: Bölüm 5'te 7, Bölüm 6'da 8 adım var.
   - Tek bir numaralandırma kaynağı belirlenmeli.

2. **Wavetable'ın özü öğreticide yok.** Kullanıcı açıkça "Ableton'ın Wavetable'ı gibi" dedi. Oysa müfredatta aşağıdakilerin hiçbiri için bölüm yok:
   - Position modülasyonu
   - LFO
   - Mod Matrix
   - Unison
   - Mod Time/Amt
   - MPE/Slide→Position

   Bölüm 4–5 yalnız osilatör, filtre ve zarfı kapsıyor. Bir "LFO & Modülasyon (Position tarama)" bölümü eklenmeli. "Wavetable nedir?" konusu da (kare, position, mip, neden aliasing olmaz) öğrenciye görsel olarak anlatılmıyor. Şartnamede yalnız DSP var, pedagojik bir anlatım yok.

3. **Öğretici adımlarının içeriği görünmüyor.** Yalnız başlıklar ve adım sayıları var. 61 adımın her biri için şunlar tanımlanmalı:
   - Adım metni (TR/EN)
   - `allow` listesi (gate)
   - `check(S, rt)` koşulu
   - İpucu kademeleri
   - Hedef kontrol id'si
   - Başarı toleransı

   Bunlar olmadan öğretici ile emülatörün bağlantısı test edilemez.

4. **Wavetable Category enum'u taşıyor.** `o1Cat` için `P(p+'Cat',0,5,…)` yalnız 6 değer veriyor. Ama tablo listesinde 7 kategori var: Temel, Harmonik, Vokal, FM, Sync, Dijital, Gürültü. Ayrıca:
   - `Tab` 0–15 aralığında ama yalnız 12 tablo var.
   - `Tab`'ın kategori içi bir indeks mi, genel indeks mi olduğu tanımlanmamış.
   - `o1Cat` ve `o1Tab` için `ENUMS` girdisi yok.
   - Param adından `ENUMS` anahtarına nasıl geçildiği (`f1CircB`→`CircB`, `ampLoop`→`Loop`, `l1Shape`→`Shape`) yazılmamış.

5. **Kaynak URL'leri eksik.** Kural her iddiaya URL istiyor. Şartnamede ise yalnız "M3", ".adv", "KOD + P3", "Push script'i" gibi etiketler var, hiç URL yok. Bağlanması gerekenler:
   - Push 3 kılavuzu: https://www.ableton.com/en/push/manual/
   - Live 12 Wavetable bölümü: https://www.ableton.com/en/manual/live-instrument-reference/#wavetable
   - Wavetable.adv'nin hangi Live sürümünden okunduğu
   - Push parametre bankasının hangi Remote Script dosyasından alındığı

   DSP formüllerinin literatür kaynakları da eklenmeli:
   - Simper SVF: Cytomic "SvfLinearTrapOptimised2.pdf"
   - Niemitalo Hermite: "Polynomial Interpolators for High-Quality Resampling"
   - ADAA: Parker, Zavalishin, Le Bivic, DAFx 2016
   - PolyBLEP: Välimäki ve Huovilainen 2007
   - Wavetable mip yaklaşımı: EarLevel Engineering "Wavetable oscillator" serisi

6. **Doğrulanmamış Push davranışları.** Hepsinin kaynaklanması ve Push 2 ile Push 3 ayrımının yapılması gerekiyor:
   - **Tap Tempo:** "4. dokunuşta çalma başlar" Live'ın "Start Playback with Tap Tempo" tercihine bağlı olabilir.
   - **Swing:** Swing'in neye uygulandığı yazılmamış. Seçenekler: yalnız Note Repeat / Quantize / step girişine mi, yoksa çalma anında mı. Step saklama modeli buna göre değişir.
   - **Mute:** Mute'un tek başına seçili track'i susturması.
   - **Play ve Shift+Play:** Davranışları.
   - **Metronom:** Seviyesinin Cue'dan gelmesi.
   - **Açık VARSAYIM'lar:** Bank görünümünü "upper:1 ile kapatma", popup süresi 1500 ms, `SRate` için 22 adım, `time` eğrisi n³.

## B. Yüksek: mobil ve iOS riskleri

7. **iOS sessiz anahtarı Web Audio'yu susturuyor.** Şartnamede buna karşı bir önlem yok. Gerekenler:
   - Safari 16.4+/17 için `navigator.audioSession.type='playback'`.
   - Eski sürümler için kilidi açarken sessiz bir `<audio>` döngüsü.
   - Bu yapılmazsa iPhone'da "ses yok" şikâyeti kaçınılmaz.

8. **Asılı nota kurtarma mekanizması eksik.** Çıkış kriteri "asılı nota yok" diyor ama mekanizma listelenmemiş. Olması gerekenler:
   - `pointercancel` ve `lostpointercapture` olaylarında note-off.
   - `visibilitychange`, `blur` ve `pagehide` olaylarında panic.
   - Track değişimi, mod değişimi, overlay açılışı ve Octave basışında basılı tutulan pad'lerin notalarını kapatma kuralı. Push'ta çalan nota, oktav değişince eski perdesinde kapanır.

9. **iOS/Android jest çatışmaları tanımsız.**
   - Touch strip SVG'nin sol kenarında. iOS'taki kenardan geri kaydırma hareketiyle çakışabilir.
   - Uzun basmada callout ve seçim açılabilir. Mevcut sayfada `-webkit-touch-callout` yok; `user-select` yalnız svg'de var.
   - Çift dokunuşta zoom.
   - Yatay yön zorunluluğu: iOS'ta `screen.orientation.lock` ve Fullscreen API çalışmaz. "Cihazı çevir" ekranı gerekiyor.

10. **Android ve Bluetooth gecikmesi ele alınmamış.** Burada 100–250 ms gecikme olağan. Gerekenler:
    - `latencyHint:'interactive'`.
    - `baseLatency + outputLatency` ölçümü ve kullanıcıya uyarı. Safari'de `outputLatency` yok, fallback gerekir.
    - Kayıtta gecikme telafisi: pointer `timeStamp` değerinin `performance.now` ve `ctx.getOutputTimestamp()` üzerinden ctx zamanına çevrilmesi. Bu yoksa kaydedilen notalar kayar.
    - LED/playhead animasyonunun ses çıkış zamanıyla hizalanması.

11. **Arka plan sekmesinde scheduler donuyor.** `setInterval(25 ms)` arka plan sekmesinde 1 s'ye kısılır. Scheduler bir Worker zamanlayıcıya taşınmalı ya da sekme gizlenince transport'un duraklatılma davranışı tanımlanmalı.

12. **Safari'de `requestIdleCallback` yok.** Worker açılamazsa önerilen fallback yolu çalışmaz; `setTimeout` ile parçalama gerekir.

13. **Canvas bellek ve performans sınırları.**
    - DPR 2 ile LED ve pad canvas'ları tüm cihaz boyutunda. Büyük ekranda yaklaşık 3200×2600 piksel, yani canvas başına yaklaşık 33 MB. iOS'un canvas bellek sınırı karşısında bütçe yazılmamış.
    - SVG'de 113 linear ve 65 radial gradient, 29 clipPath var. Mobildeki `<use>` ile tüm çizimi çoğaltmak raster maliyetini ikiye katlar.
    - Canvas'ların `filter:drop-shadow` uygulanan `.p3-device-wrap`'in **içinde** olmadığı açıkça yazılmalı. İçindeyse her LED karesinde filtre yeniden hesaplanır.

14. **Tablo belleği hesaplanmamış.**
    - Tablo başına: 64 kare × 11 seviye × 2051 örnek × 4 B ≈ 5.8 MB.
    - 6 tablo LRU ile worklet'te ≈ 35 MB, üstüne sub tablosu ve UI `disp` verisi.
    - Mobil ve eco profili için net bütçe konmalı.

## C. Orta: ses motoru ve emülatör eksikleri

15. **SVG glif önbelleği `Path2D(d)` ile yetinemez.** Kontrol ettim: `sqaure`, `icon-big-pads` ve `icon-big-tracks` gibi glifler `<rect rx>` elemanlarından oluşuyor. Chevron'lar `stroke-linecap` kullanıyor, gruplar iç içe. Gerekenler:
    - rect'ler için `roundRect` (Safari 16+) ya da elle path üretimi.
    - Stroke özelliklerinin taşınması.
    - Her yaprak eleman için ayrı `getCTM`.

16. **Ses efekti yok.** Kullanıcı "her şeyiyle" diyor. Gerçek Push iş akışında Add ile Reverb, Delay veya Auto Filter eklemek temel bir adım. En azından sabit bir Reverb ve Delay send'i ya da tek bir efekt slotu Faz 2 kapsamına alınmalı.

17. **Drum kit Faz 1'de yalnız 4 sample.** 16 pad'in 12'si sessiz kalıyor ve bu öğrenciyi şaşırtır. Lab'deki `synthDrum` prosedürel sesleri (Rim, Clap, Tom, Crash) Faz 1'e çekilmeli. Ayrıca:
    - Dosya adlarında boşluk ve parantez var (`Open Hat (1).wav`), `encodeURI` gerekiyor.
    - Snare 510 KB. Ön yükleme ve yükleniyor durumu tanımlanmamış.

18. **Session ve kayıt zamanlaması tanımsız.**
    - Global launch quantization (Live varsayılanı 1 Bar) tanımlanmamış.
    - Record başlangıcının bar'a hizalanıp hizalanmadığı belirsiz.
    - Fixed Length kapalıyken kayıt bitince clip uzunluğunun nasıl yuvarlandığı belirsiz.
    - Overdub birleştirme ve note-on/off çiftleşmesi belirsiz.

19. **Velocity kaynağı görünmüyor.** Mouse ve touch'ta velocity yok, `pressure` tutarsız. Sabit değer, basış süresinden türetme ya da y-konumu seçeneklerinden hangisinin kullanılacağı ve Accent ile etkileşimi yazılmalı. Kesik bölümde olabilir.

20. **Toplam ses bütçesi tanımsız.** Birden çok synth track arasında ses çalma önceliği tanımlanmamış; "≤16" yalnızca varsayım olarak geçiyor.

21. **Seviye 2 görevleri emülatöre taşınırken toleranslar yazılmamış.** Mevcut kodda Tap için ±2 BPM, Swing için ±2 tolerans var (`/Users/berkayer/site/ders-push3.html` 290–345). Ek olarak:
    - "Track 2'yi sustur" görevi yeni modelde önce lower2 ile track seçmeyi gerektiriyor; görev metni güncellenmeli.
    - Octave +2 görevi başlangıç oktavına bağlı.

## D. Erişilebilirlik ve i18n

22. **LCD canvas ekran okuyucuya kapalı.** LCD içeriğini yansıtan gizli bir `aria-live` metin katmanı gerekiyor. Mevcut sayfada `aria-live` yalnız görev ve geri bildirim alanlarında var.

23. **Hareket azaltma yok.** Blink/pulse LED'leri ve LCD animasyonları için `prefers-reduced-motion` kuralı tanımlanmamış.

24. **Encoder "touch" olayının karşılıkları tanımsız.** Klavye (focus) ve mouse karşılığı belirsiz. Oysa öğretici adımları "encoder'a dokun, adı beyaz olur" gibi dokunuşa dayanıyor.

25. **Tanıtım kartı ve öğretici EN metinleri güncellenmemiş.**
    - `egitim.html` 886–901 satırlarındaki kart hâlâ "OYUN · 27 kontrol · Oyunu Aç" diyor.
    - `i18n.js` 288–294 satırlarındaki `eg_modpush3_*` anahtarlarının yeni metinleri (emülatör, öğretici, synth) yazılmamış.
    - Öğreticinin EN metni Faz 3'te. EN kullanıcıları Faz 1'de TR metin görecek; bu açıkça belirtilmeli.

## E. Test edilemeyen veya doğrulanamayan alanlar

26. **Gerçek cihazla karşılaştırma planı yok.** Sadakat testi için kaynak yazılmamış. Seçenekler: YouTube kayıtlarından kare kare LCD referansı ya da Live 12'deki Push 3 Remote Script kaynağıyla karşılaştırma. VARSAYIM etiketli maddelerin (yaklaşık 30) nasıl doğrulanacağına dair tablo yok.

27. **Mobil cihaz testi için yol yok.** Çoklu dokunma ve iOS ses davranışı masaüstünde test edilemez. `firebase hosting:channel:deploy` ile önizleme kanalı üzerinden gerçek cihaz testi planlanmalı. `?p3debug=1` yalnız elle çalışıyor, otomatik bir CI yok.

28. **Safari'de OfflineAudioContext + AudioWorklet desteği doğrulanmamış.** `p3-selftest` ölçümleri buna dayanıyor.

29. **Worklet yükleme riski.** Harici dosya yolu için Firebase'in `**`→`/index.html` rewrite'ı ve `nosniff` başlığı birlikte risk oluşturuyor (`/Users/berkayer/site/firebase.json`). ableton-lab zaten Blob URL deseniyle çalışıyor (`ableton-lab.html` 3963–3965). Yedek olarak Blob'dan yükleme eklenmeli. Aynı risk Worker dosyası için de geçerli.

## F. Düşük

30. **Öğretici ilerlemesi hesapla senkronize değil.** İlerleme yalnız localStorage'da; girişli kullanıcı için Firestore senkronu yok. Sayfada Firebase auth zaten yüklü.

31. **Web MIDI Safari'de yok.** Bu durumda [Bağlan] düğmesinin gizlenmesi gerekiyor.

32. **Main bankında "Flt 2 Type" farkı.** Şartname bunu "düzeltilmiş davranış" olarak işaretliyor, ama öğretici gerçek cihazda görülmeyecek bir şeyi öğretmemeli.

## İlgili dosyalar
- /Users/berkayer/site/ders-push3.html
- /Users/berkayer/site/assets/img/push3-device.svg
- /Users/berkayer/site/assets/js/i18n.js
- /Users/berkayer/site/egitim.html
- /Users/berkayer/site/ableton-lab.html
- /Users/berkayer/site/firebase.json
- /Users/berkayer/site/assets/audio/