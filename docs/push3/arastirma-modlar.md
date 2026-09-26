# KONU 3: Push 3 Drum / Session / Sequencer / Transport, Emülatör Spesifikasyonu

## 0. Kaynaklar ve etiketler

Her satırın sonundaki etiket, bilginin hangi kaynaktan geldiğini gösterir:

| Etiket | Kaynak | Güven |
|---|---|---|
| **[P3]** | Ableton Push 3 resmi kılavuzu. Bakılan sürüm: PDF 2025-09-17, 153 sayfa (`cdn-resources.ableton.com/.../3/2025-09-17/push3-manual-en.pdf`). HTML sürümü: ableton.com/en/push/manual/ | Yüksek |
| **[P2M]** | Live 12 kılavuzu, "Using Push 2" bölümü | Yüksek, ama yalnızca **Push 2** için geçerli |
| **[P2S]** | Live 12 MIDI Remote Scripts'in decompile edilmiş hâli (github gluon/AbletonLive12_MIDIRemoteScripts), `pushbase/` ve `Push2/` klasörleri. **Push 3 script'i herkese açık değil.** Bu satırlar Push 1/2 kodudur; Push 3 için "büyük olasılıkla aynı" diye ele alınmalı. | Orta |
| **[P2MIDI]** | Ableton'ın resmi Push 2 MIDI arayüz dokümanı (github Ableton/push-interface) | Yüksek (Push 2) |
| **[LOM]** | Live Object Model (docs.cycling74.com/apiref/lom) | Yüksek (Live motoru) |
| **[SVG]** | Yerel `assets/img/push3-device.svg` dosyasının incelenmesi | Kod |
| **[ÇIKARIM]** | Benim tasarım önerim. Kaynağa dayanmıyor, uygulamada serbestçe değiştirilebilir. | — |

---

## 1. SVG katmanlarının gerçek Push 3 kontrollerine eşlenmesi

Doğrulama yöntemi: [P3] Bölüm 17'deki Control Reference sırası, SVG'deki konumlarla (y koordinatı) ve etiket glif analiziyle karşılaştırıldı.

**Genel öneri:** Grupları `split` / `frac` ile bölmek yerine her alt butonun kendi id'sine `getBBox()` uygulayın. Kesirli bölme şu an birkaç hotspot'u yanlış yere koyuyor (ayrıntılar aşağıdaki tabloda).

| Gerçek Push 3 kontrolü | SVG id (üst grup → alt öğe) | Not |
|---|---|---|
| Sets / Setup / Learn / User | `SessionSettings` → `file`, `settings`, `tutorial`, `stamp` | Sol üst sıra. Soldan sağa sıra [P3] ile birebir aynı. |
| Volume Encoder | `Knob_9` (y≈526) | [P3] sırası: Volume, Undo, Save |
| Undo | `TextButton_2` (468,482) | Figma bu katmana hatalı olarak "Save_2" adını vermiş. **[ÇIKARIM]**: [P3] sırasına göre üstteki buton Undo. |
| Save | `TextButton` (468,636) | |
| Lock / Stop Clip / Mute / Solo | `SessionSettings_3` → `lock`, `sqaure`, `mute`, `solo` | `sqaure` = Stop Clip (kare ikon) |
| **Swing and Tempo Encoder** | `Knob_10` (y≈865, Touch Strip'in solunda) | Mevcut Seviye 2'de Swing görevi genel "Encoder'lar" hotspot'una bağlı. Bu yanlış; bu knob'a bağlanmalı. |
| Tap Tempo | `Tempo` → `TextTransparentButton` (y 980–1076) | Etiket iki satırlı: "Tap / Tempo" |
| **Metronome** | `Tempo` → `IconTransparentButton` (y 1076–1136) | Figma ikona "icon/quantize" adını vermiş, ama ikon ○● (boş + dolu daire). [P3] sırası "Tap Tempo, Metronome, Quantize" olduğu için bu Metronome. **Mevcut sayfada Metronome hiç yok.** |
| **Quantize** | `Tempo` → `TextTransparentButton_2` (y 1136–1194) | Glif analizi: etiket "Q" ile başlıyor, yani "Quantize". Mevcut `frac:0.45` bölmesi Quantize hotspot'una Metronome'u da katıyor. |
| Fixed Length | `NoteSettings` → `TextTransparentButton_3` | |
| **Automate** | `NoteSettings` → `TextTransparentButton_4` | Mevcut sayfada yok. Fixed Length hotspot'u bütün grubu kaplıyor. |
| New | `RecordControls` → `TextTransparentButton_13` (y 1437–1495) | |
| **Capture** | `RecordControls` → `TransparentBigButton_3` (`icon-big-focus`, y 1495–1560) | Mevcut sayfada yok. `frac:0.57` bölmesi Capture'ı New hotspot'una katıyor. |
| Record | `RecordControls` → `TransparentBigButton_4` (`record`) | |
| Play | `ButtonBigPlay` → `TransparentBigButton_5` | |
| Scale / Layout | `LayoutScale` → `TextTransparentButton_11` (Scale), `_12` (Layout) | |
| Note / Session (Pad Mode) | `LayoutScale` → `TransparentBigButton` (`icon-big-pads`), `_2` (`icon-big-tracks`) | **[ÇIKARIM]** pads ikonu = Note, tracks ikonu = Session. Mevcut x-bölmesi Scale+Note ile Layout+Session'ı tek hotspot'ta birleştiriyor. |
| Repeat / Accent | `RepeatAccent` → `TextTransparentButton_5` / `_6` | |
| Double Loop / Convert / Duplicate / Delete | `LoopingSection` → `_7` sol üst / `_8` sol alt / `_9` sağ üst / `_10` sağ alt | Mevcut quad eşlemesi doğru. |
| Octave ↑↓, Page ◀▶ | `JogControls`…`JogControls_4` | |
| Shift / Select | `NoteSelection` → `_14` / `_15` | |
| Add / Swap | `IconButton` (`add`) / `IconButton_2` (`replace`) | |
| Session D-pad | `Frame 35` (Group 11/12) | **[ÇIKARIM]** |
| Main Track | `MiscButton` | **[ÇIKARIM]** |
| Device / Mix / Clip / Session Screen | `SessionSettings_2` → `track`, `mixer`, `player`, `layout` | **[ÇIKARIM]**. Hangi ikonun hangi mod olduğu doğrulanamadı. |
| Jog wheel | `Knob_11` | |
| 8 Scene / Repeat Intervals butonu | `SideButton` (en üst, y=869) … `SideButton_8` (en alt, y=1674) | Figma etiketleri **hatalı**: 1. ve 2. buton ikisi de "1/32t", 7. "1/4", 8. "1/4t" diye çizilmiş. Emülatörde etiketleri Bölüm 2'deki tabloya göre overlay ile doğru yazın. |

---

## 2. Scene / Repeat Intervals butonları (sağdaki 8 buton)

Resmi sıra, **yukarıdan aşağıya**. Kaynak: [P2MIDI] Push 2 MIDI haritası ve `Push2-map.json`. [P2S] `side_buttons_raw` sırası 43→36, yani index 0 en üstteki buton.

| Index (yukarıdan) | Etiket | Push 2 CC | Nota uzunluğu (beat, 1 beat = 1/4) | Grid default | Repeat default |
|---|---|---|---|---|---|
| 0 | **1/32t** | 43 | 1/12 ≈ 0.0833 | | |
| 1 | 1/32 | 42 | 0.125 | | |
| 2 | 1/16t | 41 | 1/6 ≈ 0.1667 | | |
| 3 | **1/16** | 40 | 0.25 | ✔ step sequencer varsayılanı [P3][P2S] | |
| 4 | 1/8t | 39 | 1/3 ≈ 0.333 | | |
| 5 | **1/8** | 38 | 0.5 | | ✔ note repeat varsayılanı [P2S] |
| 6 | 1/4t | 37 | 2/3 ≈ 0.667 | | |
| 7 | **1/4** | 36 | 1.0 | | |

- Görevde önerilen "1/4, 1/4t, 1/8 …" sırası **ters**. Fiziksel sıra yukarıdan aşağıya 1/32t → 1/4.
- **Push 3 için:** Performodule'ün Push 3 User Mode yazısı, D-pad Left'in Push 2'deki gibi CC 44 gönderdiğini söylüyor. SVG'de 1., 3., 5. ve 6. butonun etiketleri de Push 2 sırasıyla uyuşuyor. Push 3'e özel resmi bir MIDI haritası bulunamadı, bu yüzden güven: orta-yüksek.
- **Note Mode'da** [P3]: bu butonlar step sequencer grid çözünürlüğünü ayarlar. Repeat açıkken aynı butonlar tekrar hızını da seçer.
- **Session Mode'da** [P3]: aynı butonlar sahne (scene) tetikler.
- **LED'ler:**
  - Repeat açıkken seçili hız **yeşil** yanar [P3]. Seçili olmayanlar [P2S]'de beyaz.
  - Grid seçiminde (Repeat kapalıyken) [P2S]: seçili beyaz, diğerleri koyu gri.
  - Her butonun altında bir ▶ (scene launch) ikonu var [SVG].

---

## 3. Genel zamanlama ve etkileşim sabitleri

| Sabit | Değer | Kaynak |
|---|---|---|
| Hızlı basıp bırakma ile basılı tutma (latch / momentary) ayrımı | Hızlı basıp bırakınca buton açık kalır (latch). Basılı tutulursa bırakınca kapanır (momentary). Repeat, Accent, Layout ve Session/Note geçişleri için geçerli. | [P3] |
| Momentary eşiği | **0.3 sn** (`MOMENTARY_DELAY`) | [P2S] `ableton/v2/control_surface/defaults.py` |
| Çift tıklama penceresi | **0.5 sn** (`DOUBLE_CLICK_DELAY`). Loop length pad'ine çift dokunmak = loop tam 1 sayfa olur. | [P2S] + [P3] |
| Swing/Tempo encoder'a dokununca değer gösterme gecikmesi | 0.4 sn (`TEMPO_SWING_TOUCH_DELAY`) | [P2S] |
| Step'e basılı tutma → düzenleme moduna geçiş | 0.3 sn sonra step "modified" olur ve bırakınca silinmez | [P2S] `note_editor_component` |
| LED animasyonları tempoya senkron | Pulse speed 48 = **yarım nota periyodu**. Blink speed 24 = **çeyrek nota periyodu**. | [P2MIDI] LED transition tablosu (kanal 6–10 pulse, 11–15 blink; 4/6/12/24/48 MIDI clock) + [P2S] `pushbase/colors.py` |

---

## 4. Drum Rack modu (Note Mode + Drum Rack track)

### 4.1 Layout döngüsü
- `Layout` butonu şu sırayla döner: **Loop Selector → 16 Velocities → 64 Pads → Loop Selector** [P3 6.1–6.3].
- Drum Rack yüklendiğinde hangi layout ile başladığı doğrulanamadı. **[ÇIKARIM]** Loop Selector ile başlatın.
- Layout'u **basılı tutmak** geçici (momentary) alternatif açar [P3]:
  - Loop Selector'dayken → 16 Velocities.
  - 16 Velocities'dayken → loop length pad'leri.
  - 64 Pads'teyken → loop length pad'leri **en üst sırada** belirir.
- `Shift + Layout` alternatifi kalıcı kilitler. Tekrar `Layout`'a basmak kilidi açar. Kilit durumu **track başına** saklanır [P3 7.4].

### 4.2 Loop Selector layout ızgara haritası
Satır 0 = en üst, sütun 0 = en sol. Kaynak: [P2S] `matrix_rows_raw`, not = 36 + (7−row)·8 + col.

```
        col: 0  1  2  3 | 4  5  6  7
row 0  [S1 S2 S3 S4  S5  S6  S7  S8 ]   ← STEP SEQUENCER: üst 4 sıra = 32 step
row 1  [S9 ...                  S16]      (soldan sağa, yukarıdan aşağı okunur)
row 2  [S17 ...                 S24]
row 3  [S25 ...                 S32]
row 4  [D13 D14 D15 D16 | L1  L2  L3  L4 ]  ← sol alt 4x4: DRUM PAD'LER
row 5  [D9  D10 D11 D12 | L5  L6  L7  L8 ]  ← sağ alt 4x4: LOOP LENGTH (sayfa) pad'leri
row 6  [D5  D6  D7  D8  | L9  L10 L11 L12]
row 7  [D1  D2  D3  D4  | L13 L14 L15 L16]  ← D1 = C1 (MIDI 36), sol alt
```

- **Step index:** `step = row*8 + col` (row 0..3).
  - Triplet çözünürlükte (1/32t, 1/16t, 1/8t, 1/4t) sağdaki 2 sütun **söner ve kullanılmaz**, satır başına 6 step kalır: `step = row*6 + col` (col < 6), toplam 24 step [P3 6.5] [P2S].
- **Drum pad index:** `pad = bankOffset + (7-row)*4 + col` (row 4..7, col 0..3). MIDI notu = `36 + pad`.
  - "Klasik 4x4" diziliminde D1 sol altta [P2M]; varsayılan başlangıç C1 [P2M].
- **Loop pad index:** `page = pageOffset + (row-4)*4 + (col-4)`. Okuma sırası sol üstten sağ alta.
  - [P2S] `x + y*width`. Push 3 kılavuzu bu yönü açıkça yazmıyor, güven: orta.
- **Banking** [P3]:
  - Touch strip veya Octave ↑/↓ drum pad görünümünü **16 pad** kaydırır.
  - `Shift + Octave` veya `Shift + touch strip` **tek sıra (4 pad)** kaydırır.
  - Drum Rack'te 128 pad var (0–127).
  - Daha fazla oktav yoksa Octave butonları söner.

### 4.3 Sayfa ve loop matematiği
Kaynak: [P2S] `grid_resolution.py` + `loop_selector_component.py`.

- **Sequencer sayfası** = görünen step sayısı × step uzunluğu:
  - Normal çözünürlük: 32 × step
  - Triplet: 24 × step
- **Tek bir loop pad'inin süresi** = `clamp(sayfaUzunluğu, 0.25 beat, 1 ölçü)`. 4/4'te 1 ölçü = 4 beat.
  - Sonuç: 1/32t hariç her çözünürlükte **1 loop pad = 1 bar**.
  - [P3]'teki "varsayılan 16'lıkta aynı anda iki sayfa görünür, toplam iki bar" cümlesi şu demek: 32 step = 2 bar = 2 loop pad beyaz görünür.
- Loop Selector'da 16 loop pad olduğu için ekranda 16 bar görünür. Daha uzun clip'lerde `pageOffset` kayar.

| Grid | Step (beat) | Kullanılan step | Sequencer sayfası | Loop pad süresi | Yeni clip uzunluğu (ilk step'te) |
|---|---|---|---|---|---|
| 1/32t | 1/12 | 24 | 2 beat | 2 beat (½ bar) | 2 beat |
| 1/32 | 1/8 | 32 | 4 beat (1 bar) | 1 bar | 4 beat |
| 1/16t | 1/6 | 24 | 4 beat | 1 bar | 4 beat |
| **1/16** | 1/4 | 32 | **8 beat (2 bar)** | 1 bar | **8 beat = 2 bar** |
| 1/8t | 1/3 | 24 | 8 beat | 1 bar | 8 beat |
| 1/8 | 1/2 | 32 | 16 beat | 1 bar | 16 beat |
| 1/4t | 2/3 | 24 | 16 beat | 1 bar | 16 beat |
| 1/4 | 1 | 32 | 32 beat (8 bar) | 1 bar | 32 beat |

(`CLIP_LENGTH_LIST = [2,4,4,8,8,16,16,32]` beat. Index sırası Bölüm 2'deki tabloyla aynı.)

- **Clip yokken:**
  - Bir step'e basınca yeni clip oluşur ve playback başlar [P3 6.1].
  - Loop pad'ine basınca `(pad+1)` bar uzunluğunda clip oluşur [P2S].
- **Loop ayarlama** [P3]:
  - Bir loop pad'ini basılı tut, bitiş pad'ine dokun → loop o aralık olur.
  - Pad'e **çift dokun** → loop tam o sayfa olur.
  - Loop içindeki bir pad'e **tek dokun** → loop uzunluğu değişmez, görünüm o sayfaya kilitlenir ve auto-follow kapanır.
  - Page ◀/▶ önceki/sonraki sayfaya gider.
  - Auto-follow'u tekrar açmanın iki yolu var: loop'u ilk ve son pad'le yeniden seçmek, ya da Page ◀ veya ▶'yi basılı tutmak [P3 7.3.1].
  - Loop dışındaki bir sayfaya tek dokunmak loop'u hemen o sayfaya ayarlar [P3].
- **Auto-follow** [P3]: loop ayarlanınca görünen sayfa, çalan sayfayı takip eder. "Gördüğün sayfa her zaman duyduğun sayfa olmayabilir."

### 4.4 Step sequencer davranışı
Kaynak: [P3 6.1, 6.5, 9.3.2], ayrıca [P2S] `note_editor_component`.

- Önce sol alttaki bir drum pad'ine dokun. Pad hem seçilir hem çalar.
  - Pad'i **çalmadan** seçmek için: `Select` basılıyken pad'e dokun.
- **Step'e kısa dokunuş:**
  - Boş step'e dokunmak seçili pad'in notasını ekler.
  - Dolu step'e dokunmak notayı siler [P3].
  - Eklenen notanın velocity'si: **100** (`DEFAULT_VELOCITY`) [P2S]. Accent açıksa **127** [P3]. 16 Velocities layout'unda son seçilen velocity pad'inin değeri [P3 6.2].
  - Nota süresi = 1 step [P2S].
- **Step'e basılı tutma (0.3 sn üstü)** → ekranda şu parametreler açılır, encoder'larla değiştirilir [P3 9.3.2] [P2S]:
  - Push 2 parametre seti: **Nudge, Length (coarse), Fine, Velocity, Vel Range, Probability**.
  - Push 3 kılavuzu "Nudge, Length, Velocity, etc." diyor. Note Edit'te ayrıca Position, Pitch / Drum Pad ve Probability var.
  - Birden çok step'i birlikte basılı tutmak hepsini birlikte düzenler. Değerler farklıysa ekranda aralık olarak gösterilir.
- **Uzun nota (tie):** Dolu bir step basılı tutulurken sağdaki başka bir step'e basılırsa notanın süresi o step'in sonuna kadar uzar [P2S `_find_continued_step`]. Push 3 kılavuzunda bu anlatılmıyor, güven: orta.
- **Kombinasyonlar:**
  - `Mute` basılıyken step'e dokunmak step'i siler değil, **mute eder (deactivate)** [P3].
  - `Mute + drum pad` → pad'i mute eder. `Solo + drum pad` → pad'i solo yapar.
  - `Delete` tek başına → sequence'in tamamını, yani seçili clip'i siler [P3].
  - `Delete basılı + drum pad` → o pad'in bu clip'teki bütün notalarını siler. Pad'in hiç notası yoksa **pad'deki cihazları siler** [P3].
  - `Delete basılı + loop pad` → o sayfadaki bütün step'leri temizler [P3].
  - `Duplicate basılı + loop pad A → loop pad B` → A sayfasını B'ye kopyalar. **Üzerine ekler**, B'deki mevcut step'leri silmez [P3].
  - `Duplicate basılı + drum pad A → drum pad B` → cihazları kopyalar (sesi değiştirir), notaları kopyalamaz [P3 6.4.1].
  - `Select basılı → pad'e bas → Select'i bırak → encoder çevir` → o pad'e ait **bütün step'lerin** parametresini değiştirir [P3 9.3.2].
  - `Shift + drum pad` → dış halkadaki pad'lerden renk seçme ekranı açılır [P3 6.4.1].
  - `Quantize basılı + drum pad` → yalnızca o pad'in notalarını quantize eder [P3 8.5].
- **Playhead** [P3]: hareket eden **yeşil** pad. Record açıkken **kırmızı**.

### 4.5 Pad renkleri (Push 3 resmi) ve emülatör için hex önerileri

**Drum pad'leri (sol alt 4x4)** [P3 6.1]:

| Durum | Renk | Hex önerisi [ÇIKARIM] |
|---|---|---|
| Ses var | Track rengi | track.color |
| Boş | Gri | `#3a3a40` |
| O an çalıyor | Yeşil | `#38d65a` |
| Seçili | Beyaz | `#f2f2f2` |
| Solo | Koyu mavi | `#2448c8` |
| Mute | Track renginin koyusu | track.color × 0.4 |

Not: Push 2 script'inde muted = açık gri, solo = BLUE ([P2S]). **Push 3 değerleri kullanılmalı.**

**Step sequencer alanı** [P3 6.5]:
- Nota yok → gri
- Nota var → clip rengi. Velocity arttıkça daha parlak.
  - [P2S] eşikleri: velocity ≥127 → tam parlak (shade 0), ≥100 → shade 1, diğerleri → shade 2.
- Mute edilmiş nota → clip renginin açık tonu
- Triplet modunda sağ 2 sütun → sönük
- Basılı tutulan / düzenlenen step → beyaz ile açık gri arasında pulse [P2S]

**Loop length pad'leri** [P3 7.3.1, melodic için yazılmış; drum'da aynı mantık [P2S LoopSelector]]:
- Loop dışı → sönük
- Loop içinde ama görünmüyor → gri
- Sequencer'da görünüyor → **beyaz**
- Şu an çalıyor → **yeşil**
- Şu an kayıt yapıyor → **kırmızı**

**16 Velocities pad'leri** [P2S VelocityLevels]:
- Düşük velocity → koyu gri, orta → açık gri, yüksek → beyaz
- Seçili seviye → drum pad rengi

### 4.6 16 Velocities layout [P3 6.2]
- Sağ alttaki 16 pad, seçili drum pad'i için 16 farklı velocity değeridir.
- Bu pad'ler:
  - gerçek zamanlı çalınabilir,
  - Repeat ile birlikte çalınabilir (değişken velocity'li tekrarlar),
  - step'e eklenebilir: velocity pad'ine dokunup sonra step'e basınca o velocity ile nota eklenir.
- Mevcut bir step'in velocity'sini değiştirmek için: step'i basılı tut ve bir velocity pad'ine bas.
- `Accent` açıksa velocity pad'lerini ezer, her şey 127 olur [P3 8.1].
- 16 seviyenin tam değerleri ve sırası resmi olarak yazılmamış. **[ÇIKARIM]**:
  - Sol alt en düşük, sağ üst en yüksek.
  - `v_i = round((i+1)*127/16)` → 8, 16, 24 … 127.

### 4.7 64 Pads layout [P3 6.3]
- 8x8 ızgaranın tamamı gerçek zamanlı çalmak içindir. Rack'te kaç dolu pad varsa (en fazla 64) o kadarı görünür.
- Sequencer yoktur.
- 64 Pads'ten Loop Selector'a dönünce sequencer'daki 16 pad kendiliğinden değişmez. Octave veya touch strip ile ayarlanması gerekir.

---

## 5. Session modu

### 5.1 İki görünüm [P3 15]
- **Session Pad Mode:** D-pad'in altındaki `Session` butonu. Pad'ler clip matrisi olur.
- **Session Screen Mode:** Jog wheel'in üstündeki `Session` butonu. Clip grid'i ekranda görünür, pad'ler Note Mode'da kalır.
  - Üst ekran butonları seçili sahnedeki clip'leri tetikler.
  - Jog wheel'e basmak veya D-pad ortasına basmak sahneyi tetikler.
- **Momentary geçiş:**
  - Note Mode'dayken `Session` basılı tutulursa geçici olarak Session Pad Mode açılır.
  - Session'dayken `Note` basılı tutulursa geçici olarak Note Mode açılır.

### 5.2 Izgara ve navigasyon [P3 15.2]
- Izgaraya yaklaşım:
  - **Sütun = track** (8 track), **satır = sahne**. Satır 0 = görünen ilk sahne (en üst).
  - Bir track'te aynı anda tek clip çalar.
- Navigasyon:
  - D-pad ←/→ → 1 track kayar. ↑/↓ → 1 sahne kayar.
  - Page ◀/▶ → **8 track** kayar. Octave ↑/↓ → **8 sahne** kayar.
  - Navigasyon yalnızca görünümü değiştirir, seçili clip'i değiştirmez.
- Tetikleme:
  - Pad → clip'i tetikler.
  - Sağdaki Scene butonu (satırın hizasındaki), D-pad ortası veya jog wheel basışı → **sahneyi** tetikler.
  - Bir track'te **boş pad'e basmak o track'teki clip'i durdurur** [P3].
  - Silahlı (armed) track'te boş slot, basılınca kayda başlar. Push 2'de bu slot sönük kırmızı görünür [P2S]. **[ÇIKARIM]** Live'ın genel davranışı.
- Sahne tetiklenince o sahnede boş slotu olan track'lerin clip'leri durur. Live'da boş slot = Clip Stop butonu.
  - **[ÇIKARIM]** Live genel davranışı. Live 12 kılavuzu stop butonlarından bahsediyor.

### 5.3 Session clip renkleri
Push 3 kılavuzu yalnızca üç durumu yazıyor [P3 15.2]:
- clip rengi → slotta clip var,
- **yanıp sönen yeşil** → clip launch için kuyrukta,
- sönük → boş slot.

Diğer durumlar için Push 2 davranışı en iyi tahmin olarak aşağıda. [P2M] ve [P2S] `Push2/session_component.py`. Push 3 için doğrulanamadı.

| Durum | LED | Animasyon |
|---|---|---|
| Durmuş, dolu clip | Clip rengi | Sabit |
| **Çalan clip** | Clip renginin koyusu ↔ clip rengi | **Pulse**, yarım nota periyodu. [P2M]: "Playing clips pulse in their color" |
| **Kayıt yapan clip** | Clip renginin koyusu ↔ **kırmızı** | Pulse, yarım nota. [P2M]: "Recording clips pulse between red and the clip's color" |
| Kuyruktaki clip (triggered) | Yeşil ↔ clip rengi | Blink, çeyrek nota. [P3]'te "flashing green". |
| Kuyruktaki boş slot (stop / play) | Yeşil ↔ siyah | Blink, çeyrek nota |
| Kayda başlamak üzere (triggered to record) | Kırmızı ↔ siyah | Blink, çeyrek nota |
| Armed track'te boş slot | Sönük kırmızı (RED_SHADE) | Sabit |
| Boş slot | Sönük | — |

Not: Push 1'de çalan clip yeşil↔beyaz, kayıt yapan clip kırmızı↔beyaz pulse eder [Push 1 kılavuzu]. **Bunu Push 3 ile karıştırmayın.**

**Scene butonları** [P2S, Push 2]:
- Sahne varsa: yeşil, ya da sahnenin kendi rengi.
- Tetiklenmişse: yeşil blink.
- Sahne yoksa: sönük.

### 5.4 Session kombinasyonları [P3 15, 17]
- `Stop Clip`: seçili track'in clip'ini durdurur.
- `Stop Clip basılı + alt ekran butonu`: o track'i durdurur. Stop Clip basılıyken, clip'i durmuş track'lerin alt butonları söner.
- `Shift + Stop Clip`: **bütün clip'leri** durdurur.
- `Duplicate basılı + clip pad → hedef pad`: clip'i kopyalar.
- `Delete basılı + clip pad`: clip'i siler.
- `Shift + clip pad → dış halkadan pad`: clip rengini değiştirir.
- `Select basılı + clip pad`: clip'i tetiklemeden seçer ve adını ekranda gösterir.
- `Record basılı + alt ekran butonu`, ya da alt butona hızlı çift basış: track'i arm eder.
  - Session Pad Mode'da arm elle yapılır. Note Mode'da MIDI track seçildiği anda otomatik arm edilir [P3 8].
- Push 2'de ayrıca: `Duplicate + Scene butonu` sahneyi çoğaltır, `Delete + Scene butonu` sahneyi siler [P2S]. Push 3 için doğrulanamadı.
- `Lock basılı + Stop Clip / Mute / Solo`: o işlevi alt ekran butonlarına kilitler. Buton yanıp söner. Kilidi açmak için `Lock`'a ya da kilitli butona tekrar basılır [P3 14.1].

### 5.5 Session Overview [P3 15.3]
- Session Pad Mode'da `Layout` basılı tutulursa açılır. `Shift + Layout` ile kilitlenir.
- Her pad = 8 sahne × 8 track'lik bir blok. Toplam matris 64 sahne × 64 track.
  - Örnek: 3. satır, 1. sütundaki pad → sahneler 17–24, track'ler 1–8.
- Renkler:
  - Beyaz → seçili blok
  - Yeşil → blokta çalan clip var
  - Renksiz → o aralıkta track veya sahne yok
- Scene butonlarının her biri 64 sahnelik bir blok temsil eder.

### 5.6 Workflow tercihi [P3 2.2.7]
Setup → Preferences → Workflow. Seçenekler: **Scene** (varsayılan) ve **Clip**.

| Buton | Scene Workflow | Clip Workflow |
|---|---|---|
| Duplicate | Çalan bütün clip'lerle yeni bir sahne yaratır ve kesintisiz ona geçer. Live'daki "Capture and Insert Scene" ile aynı. | Seçili clip'i bir sonraki slota kopyalar. `Shift + Duplicate` = yeni sahne. |
| New | Yeni sahne yaratır; seçili track hariç çalan clip'leri kopyalar. Seçili track'te boş slot hazırlar. | Yalnızca seçili track'te boş slot hazırlar. |
| D-pad ortası | Sahneyi tetikler (`Shift` ile: clip'i tetikler) | Clip'i tetikler (`Shift` ile: sahneyi tetikler) |

- Exclusive Arm ve Exclusive Solo varsayılan olarak **On**.

---

## 6. Transport, kayıt ve düzenleme butonları

### 6.1 Play [P3 17]
- Playback'i açar ve kapatır.
- [P2S] LED: çalarken **yeşil**, dururken beyaz.

### 6.2 Record: durum makinesi [P3 8.1, 17]

```
IDLE --Record--> (count-in varsa: COUNT_IN; Record LED yanıp söner, ekranın üstünde sayım çubuğu)
     ----------> RECORDING (Record LED sabit kırmızı; armed track'e nota yazılır)
RECORDING --Record--> PLAYBACK (kayıt durur, clip çalmaya devam eder)
PLAYBACK  --Record--> OVERDUB (clip çalarken üstüne kaydeder)
OVERDUB   --Record--> PLAYBACK    ... sonraki basışlar PLAYBACK <-> OVERDUB arasında gider
Herhangi bir durum --Play--> transport durur (kayıt da biter)
```

- Kayıttayken step sequencer playhead'i kırmızı olur.
- `Shift + Record` → Arrangement Recording. Bu yalnızca Control Mode'da anlamlı; emülatörde gerekmez.

### 6.3 New [P3 8.1, 17]
- Seçili clip'i durdurur ve track'te boş bir slot hazırlar.
- Scene/Clip Workflow farkı için Bölüm 5.6'ya bakın.

### 6.4 Fixed Length [P3 8.2, 17] [P2S `fixed_length.py`]
- Kısa basış: açar / kapatır.
  - [P2S] LED: açıkken yavaş pulse, kapalıyken yanık.
- Basılı tutma: seçenekler ekranı açılır. 8 ekran butonuna 8 seçenek dağıtılır:
  - **1 Beat, 2 Beats, 1 Bar, 2 Bars (varsayılan), 4 Bars, 8 Bars, 16 Bars, 32 Bars** [P2S].
  - Push 3'te seçenekler yalnızca kılavuzdaki görselde var, metinde yazmıyor. Güven: orta.
  - Ek olarak Fixed Length On/Off toggle ve **Phrase Sync** toggle (varsayılan Off) bulunur.
- Uzunluk formülü [P2S]: `length_beats = 2^index` (index 0..7). index > 1 için `length = 2^index * num / den` (bar cinsine çevirir).
- **Kapalıyken:** kayıt; Record, New veya Play'e basılana kadar sürer.
- **Açıkken:** seçilen uzunlukta boş clip oluşur. Kayıt global launch quantization'a uyarak clip başından başlar.
- **Phrase Sync açıkken:** kayıt ifade (phrase) içindeki konumdan başlar. Örnek [P3]: 4 bar + Phrase Sync, transport 7. bardayken → 4 barlık clip'in **3. barından** kayda başlar. Formül: `startInClip = (songBar-1) mod lengthBars`.
- **İpucu** [P3]: kayıt sürerken Fixed Length'i açmak kaydı kapatır ve son N barı loop'a alır.

### 6.5 Capture [P3 8.4, 17] [Live 12 kılavuzu, Capture MIDI]
- Record'a basmadan çalınanları yeni bir MIDI clip'e yazar ve hemen çalar.
- **Track'in armed olması şart.**
- Transport durukken ve set boşken: tempo **80–160 BPM aralığında** tespit edilir, loop sınırları ayarlanır, notalar grid'e oturtulur.
- Transport çalışıyorsa ya da set'te başka clip varsa: mevcut tempo kullanılır, bir müzikal phrase tespit edilip loop yapılır.

### 6.6 Metronome [P3 4.4, 8.1, 17]
- Kısa basış: açar / kapatır. Açıkken buton **pulse** eder.
- Basılı tutma: ayarlar ekranı açılır:
  - **Count-in:** None / 1 Bar / 2 Bars / 4 Bars ([LOM] `count_in_duration` 0..3)
  - **Sound:** Classic, Click, Wood
  - **Rhythm:** varsayılan **Auto** (tık aralığı time signature paydasını izler). Diğer seçeneklerin listesi doğrulanamadı.
  - **Time signature:** pay ve payda için iki ayrı encoder
- Metronome ses seviyesi: Volume encoder'a basılıp Cue Volume seçilerek ayarlanır.
- Link açıkken count-in kullanılamaz.

### 6.7 Tap Tempo [P3 4.4, 17] [LOM]
- Tempoya art arda basılarak ayarlanır. Yeni tempo, dokunuşlar arasındaki süreden hesaplanır [LOM].
- **4/4'te 4 dokunuş song playback'i dokunulan tempoda başlatır** [P3 17].
- Ortalama alma algoritması yayınlanmamış. **[ÇIKARIM]**:
  - Son 4 aralığın ortalamasını al.
  - 2 sn'den uzun boşluk olursa diziyi sıfırla.
  - `bpm = clamp(60000/avgMs, 20, 999)`.

### 6.8 Swing and Tempo Encoder [P3 4.4, 17] [P2S] [LOM]

| İşlem | Davranış |
|---|---|
| Dokunma (touch) | O an Tempo mu Swing mi seçili olduğunu ve değerini gösterir |
| Basma | Tempo ile Swing arasında geçiş yapar |
| Çevirme (Tempo) | **±1 BPM** adım. `Shift` ile **±0.1 BPM**. Aralık **20–999 BPM** [LOM]. |
| Çevirme (Swing) | **%1** adım, **%0–100** aralığı |

- [P2S] iç eşleme: `swing_amount(Live) = display% / 200`, yani %100 = 0.5.
- **Swing yalnızca quantize edilen ve Repeat ile tekrarlanan notalara etki eder** [P3]. Global bir playback groove'u **değildir**. Uygulamada Quantize'a basınca veya Rec Quantize ve Repeat sırasında devreye girer [MusicRadar ipucu 7–8] [LOM `Clip.quantize` "song's swing_amount into account"].
- Swing'in ofbeat notayı kaç ms kaydırdığı resmi olarak yazılmamış. **[ÇIKARIM]** Emülatör formülü:
  - `delay = (S/100) * 0.5 * gridStep`. Yalnızca çift indeksli olmayan grid noktalarına (ofbeat) uygulanır.
  - Bu formülde %66.7 ≈ triplet hissi değil, yaklaşık 1/3 step gecikme verir. Uygulayıcı isterse MPC tarzı `off = 50%..75%` eşlemesi de seçebilir.
  - Belirsiz; UI'da yalnızca "%" gösterin.
- Yeni bir Set'te varsayılan swing değeri doğrulanamadı. **[ÇIKARIM]** %0 alın.

### 6.9 Quantize [P3 8.5, 17] [P2S `quantization_component.py`]
- **Kısa basış = tek seferlik işlem.** Seçili notaları, seçim yoksa clip'in tamamını grid'e çeker. Bir toggle **değildir**.
- Basılı tutma: ayarlar ekranı açılır:

| Encoder / buton | Parametre | Değerler | Varsayılan |
|---|---|---|---|
| Encoder 1 | Swing Amount | %0–100 (Swing/Tempo encoder ile aynı değer) | — |
| Encoder 2 | Quantize To | 1/4, 1/8, 1/8T, 1/8+T, **1/16**, 1/16T, 1/16+T, 1/32 | 1/16 |
| Encoder 3 | Quantize Amount | %0–100 | **%100** |
| Ekran butonu + encoder | Rec. Quantize On/Off + değeri | Quantize To ile aynı liste | Off |

- Rec. Quantize açıkken kayıt sırasında swing değiştirmek, otomatik quantize edilen notaları etkilemez [P3].
- **Emülatör formülü** (amount A, grid g, swing):
  `newStart = start + A * (nearestGrid(start, g, swing) - start)`

### 6.10 Repeat (Note Repeat) [P3 8.3, 17] [P2S]
- Repeat açıkken Scene butonları tekrar hızını seçer. Seçili hız yeşil yanar. Repeat butonu açıkken pulse eder.
- Pad basılı tutulduğu sürece nota seçili hızda tekrar eder. Parmak basıncı ses seviyesini değiştirir.
- Latch / momentary kuralı geçerli: hızlı basış açık bırakır, basılı tutmak geçici açar.
- Açık/kapalı durumu ve seçili hız **track başına saklanır**. Push 2'de varsayılan hız 1/8.
- Swing, tekrarlanan notalara uygulanır.
- Tekrarlar transport'a senkron. **[ÇIKARIM]** İlk vuruş, basış anından sonraki grid noktasında; emülatörde tekrarları `nextGridTime`'a hizalayın.

### 6.11 Accent [P3 8.1, 17]
- Açıkken çalınan ve step'lenen bütün notalar **velocity 127** olur.
- Hızlı basış açık bırakır, basılı tutmak geçici açar.
- 16 Velocities pad'lerini ezer.
- [P2S] LED: açıkken yavaş pulse.

### 6.12 Double Loop [P3 17] [LOM `duplicate_loop`]
- Loop içeriğini kopyalar ve loop uzunluğunu **iki katına** çıkarır.
  - Örnek: 2 barlık drum loop → 4 bar olur, ikinci yarı birincinin kopyasıdır.
- Emülatör: `loop_end += loopLen` ve `[start, end)` aralığındaki notaları `+loopLen` ofsetle kopyala.

### 6.13 Duplicate [P3 17]
Bölüm 4.4, 5.4 ve 5.6'daki tabloları birleştirir. Ek olarak: `Duplicate basılı + alt ekran butonu` = track'i çoğaltır.

### 6.14 Delete [P3 17]
- Note Mode'da tek başına: seçili clip'i siler.
- `Delete basılı +`:
  - drum pad → o pad'in notaları siler; notası yoksa pad'i siler.
  - clip (Session) → clip'i siler.
  - üst ekran butonu → cihazı siler. Alt ekran butonu → track'i siler.
  - encoder'a **dokunma** → o parametrenin otomasyonunu siler; otomasyon yoksa parametreyi **varsayılan değerine sıfırlar**.
  - `Automate` → clip'teki bütün otomasyonu siler.
  - loop pad → o sayfayı temizler.

### 6.15 Undo / Redo [P3 17]
- `Undo` son işlemi geri alır. `Shift + Undo` = **Redo**.
- Emülatörde komut yığını (undo stack) tutulmalı. Her step ekleme, silme, loop ve clip işlemi bir kayıt olarak saklanmalı.

### 6.16 Automate [P3 13, 17]
- Toggle. Açıkken **kırmızı**, kapalıyken **beyaz**.
- Açıkken `Record` basılıp encoder'lar çevrilirse değişiklikler clip'e otomasyon olarak yazılır.
- Otomasyonlu parametrenin yanında **beyaz nokta** görünür. Otomasyon elle ezilmişse nokta **gri** olur.
- `Shift + Automate` ezilen otomasyonları geri açar.
- **Step otomasyonu:** step(ler) basılı tutulurken encoder çevirmek o step süresine otomasyon yazar. Notası olmayan step'lerde de çalışır [P3 13.2].

---

## 7. Modifier kombinasyonları (tek tablo)

| Basılı tutulan | + | Sonuç | Kaynak |
|---|---|---|---|
| Shift | Undo | Redo | P3 |
| Shift | Stop Clip | Bütün clip'leri durdur | P3 |
| Shift | Layout | Alternatif layout'u kilitle | P3 |
| Shift | Automate | Re-enable automation | P3 |
| Shift | Drum pad veya clip pad | Renk seçici | P3 |
| Shift | Octave ↑↓ veya touch strip | Drum: 1 sıra (4 pad). Melodik: 1 skala notası. | P3 |
| Shift | Tempo encoder | ±0.1 BPM | P3 |
| Shift | Duplicate (Clip Workflow) | Yeni sahne | P3 |
| Shift | Encoder'lar | İnce ayar | P3 |
| Select | Drum pad | Pad'i çalmadan seç | P3 |
| Select | Clip pad | Clip'i tetiklemeden seç | P3 |
| Select | Touch strip'e dokunma | Pitch bend ↔ Mod wheel | P3 |
| Select → pad → Select'i bırak | Encoder | Pad'in bütün step'lerini düzenle | P3 |
| Mute / Solo | Drum pad | Pad'i mute / solo et | P3 |
| Mute | Step | Step'i mute et | P3 |
| Mute / Solo / Stop Clip | Alt ekran butonu | Track'e uygula | P3 |
| Record | Alt ekran butonu | Track'i arm et | P3 |
| Quantize | Drum pad | Yalnızca o pad'i quantize et | P3 |
| Duplicate | Pad A → Pad B | Drum cihazı, sayfa ya da clip kopyala | P3 |
| Delete | Pad, loop pad, clip, encoder, Automate, ekran butonu | Bölüm 6.14 | P3 |
| Lock | Stop Clip / Mute / Solo | Alt ekran butonlarına kilitle | P3 |
| Layout (basılı) | — | Geçici alternatif layout / Session Overview | P3 |

---

## 8. Emülatör motoru için mimari önerisi [ÇIKARIM]

- **Zamanlama:**
  - Web Audio `currentTime` üzerinde look-ahead scheduler kurun: 25 ms'de bir tick, 100 ms ileriye planlama.
  - Tüm zaman birimi **beat** olsun. Dönüşüm: `sec = beat*60/bpm`.
  - LED animasyonlarını beat fazından türetin: pulse periyodu = 2 beat, blink = 1 beat.
- **Veri modeli:**
  - `Set{bpm, swing, sig:[4,4], metronome, countIn, fixedLen:{on,index,phraseSync}, workflow:'scene'|'clip', tracks[8], scenes[]}`
  - `Track{type:'drum'|'synth', color, armed, mute, solo, repeat:{on,rateIdx}, gridIdx, layout, slots[]}`
  - `Clip{color, loopStart, loopEnd, notes:[{t,pitch,dur,vel,mute,prob,velDev}], automation{}}`
- **Durum makineleri:**
  - Record: IDLE → COUNT_IN → REC → PLAY ↔ OVERDUB (Bölüm 6.2).
  - Clip slot: empty / stopped / triggered / playing / recording / triggeredRec.
  - Launch quantization **1 Bar**. Live'ın global varsayılanı olarak yaygın bilinir, resmi metinde doğrulanamadı.
- **Buton olayları:** `down` / `up` ve `heldMs` tutun.
  - `up && heldMs < 300` → latch/toggle.
  - `heldMs ≥ 300` → momentary.
  - `up` gelince geçici modu geri al.
  - Pad'e çift dokunma penceresi 500 ms.
- **Sesler:**
  - Drum track: mevcut `assets/audio/Kick.wav`, `Snare.wav`, `Close Hat.wav`, `Open Hat (1).wav`. D1 = Kick, D2 = Snare, D3 = Closed Hat, D4 = Open Hat (önerilen yerleşim).
  - Synth track: Wavetable motoru (KONU 1/2).
  - Metronome sesleri Classic, Click, Wood: sentezlenmiş kısa tık. Downbeat 1.5 kat yüksek frekansla.

---

## 9. Öğrenci için öncelik sırası [ÇIKARIM, gerekçeli]

1. **Transport çekirdeği:** Play, Swing/Tempo encoder (bas → Tempo/Swing geçişi, ±1 / ±0.1), Tap Tempo (4 dokunuşla başlat), Metronome (toggle + basılı tutunca count-in/sound). Ucuz ve her şeyin temeli.
2. **Drum Rack Loop Selector + step sequencer:** 4x4 pad, 32 step, Scene butonlarıyla çözünürlük, loop length pad'leri, playhead renkleri, hold ile Velocity/Length/Nudge. Push'u "Push" yapan temel beceri; öğrenci değeri en yüksek.
3. **Kayıt döngüsü:** Record (rec → play → overdub), Accent, **Repeat + hız tablosu** (hi-hat rulosu), Metronome count-in.
4. **Hata düzeltme:** Undo/Redo, Delete + pad, Delete + loop pad, Mute + step, Duplicate sayfa kopyalama.
5. **Fixed Length + New + Capture:** fikirleri clip'e dönüştürme iş akışı.
6. **Quantize** (basma ve basılı tutma ekranı) ve swing'in yalnızca quantize ve repeat'e etki ettiğini öğretmek.
7. **Session Pad Mode:** 8x8 clip matrisi, scene tetikleme, renk durumları, Stop Clip, Shift + Stop Clip, Duplicate/Delete + clip. Şarkı kurma aşaması.
8. **Double Loop:** 2 bar'dan 4 bar'a, varyasyon için.
9. **16 Velocities** ve **64 Pads** layout'ları.
10. **Automate** ve step otomasyonu.
11. Düşük öncelik: Session Overview, Lock, Clip/Scene Workflow tercihi, Session Screen Mode, Convert, Arrangement.

**Öğretici (tutorial) mod senaryosu önerileri.** Her adım bir hedef durumu kontrol eder:
1. "Tempo'yu 100 BPM yap": Swing/Tempo encoder.
2. "Metronome'u aç".
3. "Kick'i seç, 1-5-9-13. step'lere koy" (1/16).
4. "Snare'i 5 ve 13'e koy".
5. "Hi-hat'i çözünürlüğü 1/8 yaparak her step'e koy".
6. "Bir step'i basılı tutup Velocity'yi 60'a indir".
7. "Loop'u 2 bara çıkar, 2. sayfayı Duplicate ile kopyala".
8. "Repeat'i 1/16'da açıp hat rulosu kaydet (Record)".
9. "Double Loop".
10. "Session'a geç, sahne 2'yi tetikle".
11. "Undo".

---

## 10. Mevcut `ders-push3.html` içinde düzeltilmesi gereken bilgiler

| Satır / öğe | Mevcut metin | Doğrusu |
|---|---|---|
| Quantize açıklaması | "Quantize açıkken çaldığın notalar… hizalanır" | Quantize bir **işlem butonudur**, toggle değildir. Basınca seçili ya da tüm notaları grid'e çeker. Kayıt sırasında otomatik quantize için basılı tutup **Rec. Quantize**'ı açmak gerekir [P3 8.5]. |
| Layout açıklaması | "4ths / 3rds / Sequential arasında değiştirir" | Layout, **pad ızgarası layout'ları** arasında geçiş yapar. Melodik track: 64 Notes / Melodic Sequencer / Melodic Sequencer + 32 Notes. Drum track: Loop Selector / 16 Velocities / 64 Pads [P3 17]. 4ths / 3rds / Sequential ise Scale menüsündeki bir seçenektir (KONU 2). |
| Double Loop | "sequencer sayfasının uzunluğunu ikiye katlar" | Loop içeriğini **kopyalayarak** loop uzunluğunu iki katına çıkarır [P3][LOM]. |
| Duplicate | "sayfa veya clip içeriğini başka sayfaya kopyalar" | Tek başına basınca: Scene Workflow'da çalan clip'lerle yeni sahne, Clip Workflow'da clip'i sonraki slota kopyalar. Sayfa kopyalama **Duplicate + loop pad → loop pad** kombinasyonuyla yapılır [P3]. |
| Convert | "cihazları tek Rack'e gruplar" | Simpler → Drum Rack, Drum pad → Simpler/Sampler, audio → Simpler / Drum Pad / Audio-to-MIDI (Harmony, Melody, Drums) [P3 17]. |
| Seviye 2 Swing | Genel "Encoder'lar" hotspot'u; başlangıç %50 | **Swing and Tempo Encoder** (`Knob_10`). Önce basılarak Swing'e geçilir. Aralık %0–100, adım %1. |
| Seviye 2 Tap Tempo | Dokunuşlar ortalanıyor | Doğru; ayrıca "4/4'te 4 dokunuş playback'i başlatır" bilgisi eklenebilir. |
| Seviye 2 Record | Tek toggle | Record → Play → Overdub döngüsü (Bölüm 6.2). |
| Seviye 2 Octave | "+2", en fazla 4 | Aralık, seçili enstrümanın ve kök notanın erişilebilir oktavlarına göre değişir. Daha fazla oktav yoksa buton söner [P3 17]. |
| Tempo grubu | 2'ye bölünmüş (frac 0.45) | 3 ayrı buton: Tap Tempo / **Metronome** / Quantize. |
| RecordControls | New ve Record | 3 ayrı buton: New / **Capture** / Record. |
| NoteSettings | Yalnızca Fixed Length | Fixed Length / **Automate**. |
| LayoutScale | x ekseninde 2'ye bölünmüş | Scale, Layout, Note, Session: 4 ayrı buton. |


## BULGULAR
- [resmi/yuksek] Drum Rack ile Push 3 pad ızgarası üç layout arasında Layout butonuyla döner: Loop Selector, 16 Velocities, 64 Pads. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Loop Selector layout'ta 16 Drum Rack pad'i sol altta 4x4 dizilir, step sequencer üst 4 sıradadır, loop length kontrolleri sağ alttadır. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Push 3 drum pad renkleri: track rengi = ses var, gri = boş, yeşil = çalıyor, beyaz = seçili, koyu mavi = solo, track renginin koyusu = mute. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Step sequencer'da her pad varsayılan olarak 16'lık notadır; step boyutu Scenes butonlarıyla değişir; triplet seçilince sağ iki sütun söner ve satır başına 6 step kullanılır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Step renkleri: gri = boş, clip rengi = nota var (velocity arttıkça daha parlak), clip renginin açığı = mute edilmiş nota. Playhead yeşil, Record açıkken kırmızı. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Loop length pad renkleri: sönük = loop dışı, gri = loop içinde ama görünmüyor, beyaz = görünüyor, yeşil = çalıyor, kırmızı = kaydediyor. Bir pad'i basılı tutup diğerine dokunmak loop'u ayarlar; çift dokunuş loop'u tek sayfa yapar; tek dokunuş görünümü kilitler. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Push 2 MIDI haritasında sağdaki 8 buton yukarıdan aşağıya 1/32t (CC43), 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4 (CC36) sırasındadır. (https://github.com/Ableton/push-interface/blob/main/doc/AbletonPush2MIDIDisplayInterface.asc)
- [ikincil/orta] Push 3 User Mode'da D-pad Left, Push 2'deki gibi CC 44 gönderir. Bu, ortak kontrollerde Push 2 MIDI haritasının korunduğuna işaret eder. (https://performodule.com/2025/02/21/push-3-user-mode-free-template/)
- [kod/orta] Live 12 Push script'inde grid çözünürlüğü listesi [2,3,4,6,8,12,16,24]/24 beat'tir; varsayılan index 3 (1/16); yeni clip uzunlukları [2,4,4,8,8,16,16,32] beat'tir. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/grid_resolution.py)
- [kod/orta] Note repeat hızları script'te 1/32t'den 1/4'e sıralıdır; varsayılan index 5 = 1/8'dir (Push 1/2). (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/note_repeat_component.py)
- [kod/orta] Loop selector pad'inin süresi clamp(sequencer sayfa uzunluğu, 0.25 beat, 1 ölçü) ile hesaplanır; clip yokken pad'e basınca (sayfa+1) bar uzunluğunda clip oluşur. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/loop_selector_component.py)
- [kod/orta] Step sequencer ile eklenen notanın varsayılan velocity'si 100'dür, Accent ile 127 olur; dolu step basılıyken sonraki bir step'e basmak notayı uzatır (tie). (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/note_editor_component.py)
- [kod/orta] Momentary eşiği 0.3 sn, çift tıklama penceresi 0.5 sn, Tempo/Swing encoder'da dokunma gösterme gecikmesi 0.4 sn'dir. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/ableton/v2/control_surface/defaults.py)
- [kod/orta] Push 2 step düzenleme parametreleri: Nudge, Length (coarse), Fine, Velocity, Velocity Range, Probability. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/note_settings.py)
- [resmi/yuksek] 16 Velocities layout'unda sağ alttaki 16 pad, seçili drum pad'inin 16 farklı velocity'sidir. Step'e o velocity ile nota eklenebilir; Accent bu pad'leri ezer. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Session Pad Mode'da sütun = track, pad = clip. Renkler: clip rengi = clip var, yanıp sönen yeşil = kuyrukta, sönük = boş. Boş pad'e basmak o track'i durdurur. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Push 2'de çalan clip kendi renginde pulse eder; kayıt yapan clip kırmızı ile clip rengi arasında pulse eder. (https://www.ableton.com/en/manual/using-push-2/)
- [kod/orta] Push 2 script'inde: kuyruktaki clip yeşil ile clip rengi arasında blink eder (speed 24); çalan clip koyu tonla clip rengi arasında pulse eder (speed 48); kayıtta hedef renk kırmızı; armed track'teki boş slot RED_SHADE; sahne rengi yeşil, tetiklenmiş sahne yeşil blink. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/session_component.py)
- [resmi/yuksek] Push 2 LED animasyonları MIDI clock'a senkrondur: kanal 6–10 pulse, 11–15 blink; süreler 24'lük, 16'lık, 8'lik, çeyrek ve yarım notadır. (https://github.com/Ableton/push-interface/blob/main/doc/AbletonPush2MIDIDisplayInterface.asc)
- [resmi/yuksek] Session navigasyonu: D-pad 1 track/sahne kaydırır, Page 8 track, Octave 8 sahne. Layout basılı = Session Overview (her pad 8x8 blok, toplam 64x64). Shift + Stop Clip = bütün clip'leri durdurur. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Workflow tercihinde varsayılan Scene. Scene'de Duplicate çalan clip'lerle yeni sahne yaratır; Clip'te seçili clip'i sonraki slota kopyalar. Exclusive Arm ve Exclusive Solo varsayılan olarak On. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Record sırası: ilk basış kayda başlar, ikincisi kaydı durdurup playback'e geçer, üçüncüsü overdub açar; sonraki basışlar playback ile overdub arasında geçer. Count-in sırasında Record yanıp söner, sonra sabit kırmızı olur. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Accent açıkken bütün notalar 127 olur. Repeat ve Accent'te hızlı basış açık bırakır, basılı tutmak geçici açar. Repeat durumu track başına saklanır; seçili hız yeşil yanar. (https://www.ableton.com/en/push/manual/)
- [kod/orta] Fixed Length seçenekleri script'te 1 Beat, 2 Beats, 1 Bar, 2 Bars, 4 Bars, 8 Bars, 16 Bars, 32 Bars; varsayılan 2 Bars; Phrase Sync varsayılan kapalı. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/fixed_length.py)
- [resmi/yuksek] Phrase Sync örneği: 4 bar fixed length ile transport 7. bardayken kayıt, 4 barlık clip'in 3. barından başlar. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [kod/orta] Quantize ayarlarında Quantize To listesi 1/4, 1/8, 1/8T, 1/8+T, 1/16 (varsayılan), 1/16T, 1/16+T, 1/32'dir; Quantize Amount varsayılanı %100; encoder sırası Swing, Quantize To, Amount. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/quantization_component.py)
- [resmi/yuksek] Swing and Tempo encoder: dokununca durumu gösterir, basınca Tempo ile Swing arasında geçer. Tempo ±1 BPM, Shift ile ±0.1 BPM; Swing %1 adımla %0–100. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [kod/orta] Push script'i swing'i Live'a display/200 olarak yazar (%100 = 0.5). (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/push_base.py)
- [resmi/yuksek] Live'da swing_amount 0–1 aralığındadır ve MIDI Recording Quantization ile Clip.quantize'a etki eder; tempo aralığı 20–999 BPM; count-in seçenekleri None, 1 Bar, 2 Bars, 4 Bars. (https://docs.cycling74.com/apiref/lom/song/)
- [resmi/yuksek] duplicate_loop, loop_end'i sağa taşıyarak loop'u iki kat uzatır ve notaları ile envelope'ları kopyalar. (https://docs.cycling74.com/apiref/lom/clip/)
- [resmi/yuksek] 4/4'te Tap Tempo'ya 4 kez basmak song playback'i dokunulan tempoda başlatır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Metronome basılı tutulunca count-in, ses (Classic, Click, Wood), Rhythm (varsayılan Auto) ve time signature ayarları açılır; açıkken buton pulse eder. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Capture yalnızca armed track'te çalışır; Live boş set'te ve transport durukken tempoyu 80–160 BPM aralığında tespit eder. (https://www.ableton.com/en/manual/recording-new-clips/)
- [resmi/yuksek] Automate açıkken kırmızı, kapalıyken beyazdır. Otomasyonlu parametrede beyaz nokta, ezilmişte gri nokta görünür. Shift + Automate geri açar, Delete + Automate hepsini siler. Step'ler basılı tutulurken encoder çevirmek step otomasyonu yazar. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Delete kombinasyonları: pad → notaları siler, notası yoksa pad'i siler; loop pad → sayfayı temizler; encoder'a dokunma → otomasyonu siler ya da varsayılana sıfırlar. Duplicate + loop pad kopyası hedefteki step'leri silmeden ekler. Shift + Undo = Redo. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [ikincil/orta] Push'ta swing yalnızca quantize edilen notalara etki eder; pad basılıyken Quantize'a basmak swing'i tek bir sese uygular. (https://www.musicradar.com/news/10-tips-ableton-push-3)
- [kod/orta] Yerel SVG'de Tempo grubunda üç buton var: Tap Tempo, ○● ikonlu Metronome (Figma adı icon/quantize) ve Quantize (etiket Q ile başlıyor). RecordControls grubu New, Capture (icon-big-focus) ve Record'dan oluşuyor. Scene buton etiketleri Figma'da hatalı çizilmiş. (file:///Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] Mevcut ders-push3.html'de Quantize (toggle olarak anlatılmış), Layout (4ths/3rds olarak anlatılmış), Duplicate, Convert ve Swing hotspot açıklamaları Push 3 kılavuzuyla çelişiyor. (file:///Users/berkayer/site/ders-push3.html)

## BELIRSIZ
- Push 3'e özgü MIDI haritası ve control surface script'i herkese açık değil. Scene/Repeat sırası (en üstte 1/32t) Push 2 resmi haritasına, Push 3 User Mode'daki CC 44 örneğine ve SVG etiketlerinin kısmi uyumuna dayanıyor; güven orta-yüksek.
- Push 3'te çalan, kayıt yapan ve armed-boş slotların tam LED animasyonu Push 3 kılavuzunda yazılmıyor (yalnızca clip rengi, yanıp sönen yeşil ve sönük var). Tablodaki pulse/blink değerleri Push 2 kılavuzu ve Push 2 script'inden alındı.
- Fixed Length seçeneklerinin (1 Beat … 32 Bars) ve Quantize To listesinin Push 3'teki hâli kılavuzda yalnızca görsel olarak var. Metin değerleri Push 1/2 script'inden.
- 16 Velocities pad'lerinin kesin velocity değerleri ve dizilim yönü yayınlanmamış. Önerilen 8..127 doğrusal dizi ve sol alttan sağ üste sıra bir çıkarım.
- Swing yüzdesinin milisaniye / step cinsinden gecikmeye nasıl çevrildiği resmi olarak yazılmamış. Forumlardaki bilgiler çelişkili (%100 = 1/32 gecikme mi, triplet mi). Önerilen formül bir çıkarım.
- Yeni bir Set'te varsayılan swing değeri, Tap Tempo'nun ortalama alma algoritması ve Metronome Rhythm seçeneklerinin tam listesi doğrulanamadı.
- Global launch quantization'ın varsayılanı olan 1 Bar yaygın bilgi, ancak resmi metinde açıkça bulunamadı.
- Dolu bir step basılıyken ileri bir step'e basınca notanın uzaması (tie) Push 1/2 kodunda var; Push 3 kılavuzu bundan söz etmiyor.
- Loop selector ve step'lerin okuma yönü (sol üstten, satır satır) Push 2 kodundan (row 0 = üst) çıkarıldı. Push 3 kılavuzu yönü açıkça yazmıyor.
- Drum Rack yüklendiğinde varsayılan layout'un Loop Selector olup olmadığı doğrulanamadı.
- SVG'de Note/Session (icon-big-pads/tracks), Device/Mix/Clip/Session Screen (track/mixer/player/layout ikonları), Session D-pad (Frame 35) ve Main (MiscButton) eşlemeleri konuma dayalı çıkarım; Figma etiketleri path'e çevrildiği için doğrudan okunamadı.
- Sahne tetiklenince boş slotlu track'lerin durması Live'ın genel davranışı. Push 3 kılavuzunda ayrıca belirtilmiyor.
- Duplicate + Scene butonu ve Delete + Scene butonu Push 2 script'inde var; Push 3 için doğrulanamadı.