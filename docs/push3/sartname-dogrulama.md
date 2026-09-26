## 0. Ortam
- **Yerel sunucu:** `.claude/launch.json` içindeki `firebase-hosting` ile `firebase serve --only hosting --port 8123`. Test adresleri `http://localhost:8123/ders-push3#serbest` ve `…#ogretici/scale`.
  - Basit bir statik sunucu kullanılmaz: cleanUrls ve redirect nedeniyle 404 verir.
  - `file://` kullanılmaz: güvenli bağlam değil, worklet çalışmaz.
- **Debug modu (`?p3debug=1`):** `p3-selftest.js` yüklenir, `window.P3` açılır.
  - Registry debug katmanı: her kontrolün bölgesi id etiketiyle çizilir. Figma render'ıyla gözle karşılaştırılır.
  - Olay günlüğü paneli, FPS göstergesi, worklet meter'ı (ses sayısı, CPU %).
- **Konsol:** `P3.test.run()` tüm birim testlerini çalıştırıp tablo halinde döndürür.

## 1. Otomatik testler (`P3.test`)
1. **Scale test vektörleri:** scaleNoteMantigi §10'daki vektörlerin hepsi. Ek olarak:
   - Her gam, kök ve Fixed kombinasyonunda `padNote` hiçbir zaman 127'yi aşmamalı.
   - `realign` sonrası `0 ≤ pos < posCount`.
   - C Major'da oktav sınırları: 3 kez aşağı, 7 kez yukarı.
2. **Drum eşlemesi:** `drumCell` pad 0 = (0,0), (3,3) = 15; triplet'te sütun 6–7 `none`; `loopPadBeats` her çözünürlükte tablodaki değeri verir.
3. **Registry:** 64 pad formülü; Frame 34 ve Frame 35 çapraz hit-test'i 4 köşe ve merkezde doğru sonucu verir; hiçbir hit bölgesi başka bir bölgeyle çakışmaz (dikdörtgen kesişim testi).
4. **Öğretici:** Her adımda `setup()` + `stepSetup()` çalıştırıldıktan sonra `check(S, rt) === false`. Her adımın `targets` listesi registry'de var ve `allow` içinde yer alıyor.
5. **Parametreler:** `WT_PARAMS` 106 kayıt. Her parametrede `def` aralık içinde, `fmt()` hata vermiyor, eğrinin gidiş-dönüşü ≤1e−6 hatalı.
6. **LED kuralları:** Durum → beklenen `{m, c}` eşleşmesi. Örnekler: Repeat açık ve rate 5 iken scene6 yeşil; Octave Up `canUp` false iken off.

## 2. Ses ölçümleri (OfflineAudioContext, 48 kHz, worklet `addModule` ile)
`P3.test.audio.render(presetId, notes, sec)` bir `Float32Array` döndürür. Analiz için `fftDb`, `maxStepDiff`, `onset` kullanılır.

| Test | Yöntem | Geçiş ölçütü |
|---|---|---|
| Aliasing | Saw ile C0→C8 süpürme; std ve hq profili. Sync/PW/Warp/Fold %100 ve Sub Tone %100 (oktav 0) ile tekrarlanır | std: fs/3 altında aşağı katlanan kısmi −60 dB'in altında. hq: fs/2 altında aşağı katlanan kısmi yok |
| Sub | Tone %0 | 3. harmonik < −90 dB |
| Mip geçişi | Yavaş glide (2 sn, 3 oktav) | örnekler arası sıçrama bir süreklilik eşiğini aşmıyor; kulakla tık yok |
| Position süpürmesi | LFO 0.2 Hz → Pos | RMS'te −3 dB'den derin çukur yok |
| Zamanlama | `at` ile planlanan nota; ayrıca `renderSizeHint:'hardware'` | onset sapması < 1 örnek |
| Voice steal | 9. nota | steal anında `maxStepDiff` < 0.05 |
| Seviye | 8 ses, vel 127, init ve saw-lead | tepe < −1 dBFS, soft-clip devrede değil |
| Denormal | 60 sn sessizlik | CPU meter'ında artış yok |
| Envelope | A=500 ms | %90 seviyeye 500 ±10 ms'de ulaşıyor |

## 3. Manuel senaryolar (her faz sonunda; Chrome, Safari, Firefox masaüstü + iPhone Safari + Android Chrome)
**Faz 1**
1. Menüden 4 modun her biri doğrudan açılıyor. `#seviye-2` derin linki Seviye 2'yi başlatıyor. Geri tuşu menüye dönüyor.
2. İlk kart tıklamasında ses açılıyor (iPhone'da sessiz tuş açıkken de, iOS 17+).
3. C Major'da sol alt pad C1 çalıyor. Sağ alt → üst sıraya geçiş 4ths düzenine uyuyor. Üç parmakla majör akor tutulabiliyor.
4. Scale → D → Minor → kapat: pad renkleri ve notalar D minor test vektörüyle aynı. LCD Scale sayfası §6 yerleşiminde.
5. Octave sınırında Octave LED'i sönüyor. Popup çıkıyor.
6. Device'ta Main bankı görünüyor. Position çevrilirken dalga çizimi değişiyor ve ses değişiyor. Bank görünümüne geçiş, Filters/Envelopes/LFOs bankaları ve görselleştirmeler çalışıyor.
7. Drum: Kick 1–5–9–13, Snare 5–13; playhead yeşil; 1/8t seçilince sağdaki 2 sütun sönüyor.
8. Tap Tempo'ya 4 dokunuş → çalma başlıyor. Knob_10'a basıp Swing'e geçiliyor, popup `Swing Amount: 58%`.
9. Record → kayıt → Record → çalma → Record → overdub. LED'ler kurala uygun.
10. Undo/Redo step ekleme ve scale değişikliği için çalışıyor.
11. Parmak yüzeyden dışarı kaydırılıp kaldırılınca nota susuyor. Sekme değişince ses kısılıyor. Asılı nota yok.
12. Öğretici Bölüm 0–6 baştan sona tamamlanıyor. Sayfa yenilenince kalınan adımdan devam ediyor. `İlerlemeyi sıfırla` her şeyi temizliyor. Gizli modda sayfa çökmüyor.
13. Seviye 1'in 27 görevi ve Seviye 2'nin 6 görevi tamamlanıyor. Sayaçlar tutarlı.

**Faz 2**
14. Repeat 1/8t hi-hat rulosu.
15. Fixed Length 1 Bar ile kayıt kendiliğinden döngüye giriyor.
16. Session'da scene 2 tetikleniyor, boş pad stop yapıyor.
17. Web MIDI klavye ile çalınınca pad'ler yeşil yanıyor.
18. Öğretici 7–10.

## 4. Performans bütçesi (Chrome DevTools)
- **Etkileşim:** Pad basışından LED değişimine en fazla 1 kare; basış başına main-thread işi < 4 ms. Paint Flashing'de `#p3DeviceWrap` hiç boyanmıyor.
- **Boşta:** Pulse LED varken CPU < %3; ısı ve fan artışı yok.
- **Bellek:** Heap < 60 MB (6 tablo, std profili).
- **Gecikme:** Setup veya debug panelinde `baseLatency + outputLatency` gösteriliyor. Masaüstünde dokunuştan sese hedef < 30 ms (VARSAYIM).
- **Mobil:** Orta segment Android'de 8 sesli pad ve eco profilinde çıtırtı yok.

## 5. Erişilebilirlik
- Yalnız klavyeyle Öğretici Bölüm 2 (Scale) tamamlanabiliyor.
- VoiceOver (iOS/macOS) ve NVDA ile slider değeri, grid hücresi ve adım sonucu okunuyor.
- axe DevTools menüde ve oyunda kritik hata vermiyor.
- 200% zoom ve pinch-zoom sayfada çalışıyor.
- `prefers-reduced-motion` açıkken titreşim/animasyon yok.

## 6. Regresyon ve yayın
- egitim.html kartı güncel, EN/TR geçişi dinamik metinleri de değiştiriyor.
- Paylaşılan `?v=` damgası ve `P3.K.V` artırıldı.
- Deploy sonrası canlı sitede aynı senaryolar kısaca (1, 2, 3, 8, 11) tekrarlanıyor. Worklet'in 200 döndüğü ve içerik tipinin JavaScript olduğu Network sekmesinde görülüyor.