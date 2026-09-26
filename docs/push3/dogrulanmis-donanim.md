# Push 3 Donanım Spesifikasyonu (emülatör için, doğrulanmış)

Kaynak kısaltmaları:
- **[M]**: Push 3 Manual PDF 2025-09-17, §17 ve ilgili bölümler.
- **[PH]**: federico-pepe/ableton-push-hack, topluluk kaynağı.
- **[P2]**: Push 2 resmi MIDI dokümanı. **Yalnız Push 2 için geçerlidir.**
- **[FIG]**: push3-device.svg; render edilerek ve koordinatları ölçülerek doğrulandı.
- **(ç)**: çıkarım.

## 1. Geometri ilkeleri (SVG birimi, viewBox "161 135 2116 1725")
- `getBBox` **kullanılmaz**. Aşağıdaki sabit bölgeler kullanılır; gölge, overlay ve ikon kaynaklı sapmalar ayıklandı.
- Encoder'larda merkez hesabı için **yüz** katmanı (`Frame 11_n`) kullanılır, gölge katmanı (`Frame 12_n`) kullanılmaz.
- Hücre sınırları ayırıcı rect'lerin (3 birim genişlik) ortasından geçer.

## 2. Kontrol registry'si (yerleşim → id → resmi ad → CC [PH] → bölge x,y,w,h)

### 2.1 Sol üst: `SessionSettings` (236,360.3,298,66)
Sınırlar x = 309.75 / 385 / 460.25.

| Bölge x | id / ikon | Resmi ad | CC |
|---|---|---|---|
| 236–309.75 | `TransparentButton` / `file` (belge) | **Sets** | 80 |
| 309.75–385 | `_2` / `settings` (dişli) | **Setup** | 30 |
| 385–460.25 | `_3` / `tutorial` (ampul) | **Learn** | 81 |
| 460.25–534 | `_4` / `stamp` (kişi) | **User** | 59 |

### 2.2 Sol ikinci sıra: `SessionSettings_3` (236,757.3,298,66)
Hücre sınırları 2.1 ile aynı.

| Sıra | id | Resmi ad | CC |
|---|---|---|---|
| 1 | `lock` (kapalı kilit) | **Lock** | 83 |
| 2 | `sqaure` (kare) | **Stop Clip** | 29 |
| 3 | `mute` ("M") | **Mute** | 60 |
| 4 | `solo` ("S") | **Solo** | 61 |

### 2.3 Sağ üst: `SessionSettings_2` (1852,360.3,298,66)
Sınırlar x = 1925.75 / 2001 / 2076.25.

| Sıra | id / ikon | Resmi ad | CC |
|---|---|---|---|
| 1 | `track` (açık halka) | **Device** | 110 |
| 2 | `mixer` (çubuklar) | **Mix** | 112 |
| 3 | `player` (çerçeve içinde play) | **Clip** | 113 |
| 4 | `layout` (\|\|\|) | **Session** (Session Screen Mode) | 34 |

### 2.4 Ekran çevresi
- **Upper Display Buttons 1–8**: `SelectionButton`..`_8`. Konum x = 590+153·i, y = 360, boyut 136×66. CC 102–109. LED: `light`..`light_8`, konum x = 604+153·i, y = 403, boyut 108×6.
- **Lower Display Buttons 1–8**: `SelectionButton_9`..`_16`. Konum y = 757, x formülü aynı. CC 20–27. LED: `light_9..16`, y = 774.
- **Display**: `LCD Display` içindeki ilk rect: 581,482,1222,220, rx6, #101010. Mantıksal çözünürlük 960×160 kabul edilir ([P2] resmi, Push 3 için [PH] ölçümü). Figma'daki oran 5.55:1, 6:1 değil. Ekran içeriği letterbox ile ortalanır.
- **Undo**: `TextButton_2` (iç id `Save_2`, üzerinde "Undo" yazıyor), 468,482,66,66, CC119.
- **Save**: `TextButton`, 468,636,66,66, CC82.
- **Add**: `IconButton` / `add`, 1852,481,66,66, CC32.
- **Swap**: `IconButton_2` / `replace`, 1852,636,66,66, CC33.
- **Main Track** (ç): `MiscButton`, 1852,757,62,66, CC28. LED `light_17` 1866,774,34,6.

### 2.5 Döner kontroller (yüz merkezi, yarıçap)
| id | Merkez, r | Kontrol | CC |
|---|---|---|---|
| `Knob`..`Knob_8` | cx 646.8 / 801.0 / 956.3 / 1113.2 / 1265.8 / 1423.2 / 1579.0 / 1731.1; cy 273.2; r 33 | **Encoders 1–8** | 71–78; touch note 0–7 |
| `Knob_9` | c(297,586) r61 | **Volume Encoder** | CC79, press CC111, touch note 8 |
| `Knob_10` | c(296.1,905.4) r40.3 | **Swing and Tempo Encoder** (ç: konumu Tap Tempo'nun hemen üstü) | CC14, press CC15, touch note 10 |
| `Knob_11` | c(2071.6,585.2) r104.3 | **Jog Wheel** | dönüş CC70, press CC94, nudge sol CC93, sağ CC95, touch note 11 |

### 2.6 Sol sütun (x 236–381)
| id | y aralığı | Kontrol | CC |
|---|---|---|---|
| `Tempo` → `TextTransparentButton` | 980–1077.5 | **Tap Tempo** | 3 |
| `IconTransparentButton` (`icon/quantize`, ama ikon ○●) | 1077.5–1137 | **Metronome** | 9 |
| `TextTransparentButton_2` | 1137–1194 | **Quantize** | 116 |
| `NoteSettings` → `_3` | 1257–1315.5 | **Fixed Length** | 90 |
| `NoteSettings` → `_4` | 1315.5–1374 | **Automate** | 89 |
| `RecordControls` → `_13` | 1437–1496.5 | **New** | 92 |
| `TransparentBigButton_3` (köşe parantezi) | 1496.5–1561.5 | **Capture** | 65 |
| `TransparentBigButton_4` (daire) | 1561.5–1653 | **Record** | 86 |
| `ButtonBigPlay` | 1668–1767 | **Play** | 85 |

- **Touch Strip**: `TouchSlider` 426,865,107,907. İz `Frame 32` 511,884,8×866. Touch note 12; konum pitch bend olarak gelir [PH].

### 2.7 Pad'ler
- `PadButton` (i=0) ve `PadButton_{i+1}`, satır öncelikli, **sol üstten**.
- r = floor(i/8) (0 = üst sıra), c = i%8.
- Konum: x = 589+152c, y = 866+114r, boyut 146×108, rx5.
- **MIDI notu = 36 + (7−r)·8 + c** (sol alt = 36 = C1 [M, PH]).

### 2.8 Sağ sütun
- **Scenes & Repeat Intervals**: `SideButton`..`_8`, x = 1852, y = 869+115i, boyut 62×98. Etiketler SVG'den **alınmaz**, overlay olarak çizilir. Yukarıdan aşağı: **1/32t (CC43), 1/32 (42), 1/16t (41), 1/16 (40), 1/8t (39), 1/8 (38), 1/4t (37), 1/4 (36)**.
- **Session D-pad**: `SimpleButton_18` / Frame 35, 1952,757,209,208.
  - Merkez düğme 2021–2092 × 825–896 → CC91.
  - Merkezin dışında (2056.5, 861) etrafında hesap: `|dy|>|dx| ? (dy<0 ? Up CC46 : Down CC47) : (dx<0 ? Left CC44 : Right CC45)`.
- **LayoutScale** 1953,980,208,167. Ayırıcılar: dikey x = 2057.5, yatay y = 1084.5.

| Konum | id | Kontrol | CC |
|---|---|---|---|
| Sol üst | `icon-big-pads` | **Note** | 50 |
| Sağ üst | `icon-big-tracks` | **Session** (Session Pad Mode) | 51 |
| Sol alt | `_11` | **Scale** | 58 |
| Sağ alt | `_12` | **Layout** | 31 |

- **RepeatAccent** 1953,1209,208,102, x = 2057.5'te bölünür: **Repeat** (56) solda, **Accent** (57) sağda.
- **LoopingSection** 1953,1324,208,160, x = 2057.5 ve y = 1405.5'te bölünür:

| Konum | id | Kontrol | CC |
|---|---|---|---|
| Sol üst | `_7` | **Double Loop** | 117 |
| Sağ üst | `_9` | **Duplicate** | 88 |
| Sol alt | `_8` | **Convert** | 35 |
| Sağ alt | `_10` | **Delete** | 118 |

- **Frame 34** (`SimpleButton_17`) 1953,1499,208,208, merkez (2057,1603). Hit-test: `|dy|>|dx| ? (dy<0 ? Octave Up 55 : Octave Down 54) : (dx<0 ? Page Left 62 : Page Right 63)`.
- **NoteSelection** 1953,1725,208,46, x = 2057.5'te bölünür: **Shift** (49) solda, **Select** (48) sağda.

## 3. Tek seferlik SVG nötrleştirme (DOMParser, enjeksiyondan önce)
Aşağıdaki öğeler silinir veya sönük renge çekilir; dinamik ışıklar overlay katmanında çizilir.
- `Rectangle 12*` (8 adet) silinir.
- `light_2..6` ve `light_10..14` içindeki renkli rect'ler #414548 yapılır; `Group 1..5` ve `Group 1_2..5_2` silinir.
- `Ellipse 1_11` silinir.
- **SideButton_4**: `icon/play_4` stroke'u **ve** `1/32t_4` etiket fill'i (#46DD43) → #383E43 yapılır.
- `Label_4` (Automate) #D4E2E4 yapılır, `Ellipse 1_12` silinir.
- `LCD Display` içinde ilk rect dışındaki her şey silinir; `Pixels` silinir.

## 4. LED durum modeli
Durum şeması: `{led:'off'|'dim'|'on'|'blink'|'pulse', color}`. Zamanlama: pulse = 1/4 nota sinüs, blink = 1/8 nota kare dalga (ç; Push 2'nin MIDI clock senkronundan türetildi).

| Kontrol | Kural | Kaynak |
|---|---|---|
| Record | Count-in'de blink, kayıtta sabit kırmızı (#FA325E), boştayken dim | [M] |
| Automate | Açık = kırmızı (#E12020), kapalı = beyaz | [M] |
| Metronome | Açık = pulse (beyaz), kapalı = dim | [M] |
| Repeat | Aktif = pulse; seçili interval düğmesi yeşil (#46DD43), diğerleri dim | [M] |
| Lock | Kilit aktifken Lock ve kilitli düğme blink | [M]. Mute kırmızı, Solo mavi [MSL] |
| Mute / Solo | Seçili track mute/solo durumundaysa on | [M] |
| Octave Up/Down | Gidilecek oktav yoksa off, varsa on | [M] |
| Page Left/Right | Kullanılamıyorsa dim | (ç), [FIG] |
| Play | Çalarken yeşil (#0BC049), dururken beyaz | [MSL] |
| Üst ekran düğmeleri | Clip/track rengi (RGB); arm'lı track'in boş slotu seçiliyse kırmızı | [M] |
| Alt ekran düğmeleri | Track rengi (ç, [FIG]). Unlit durumları: muted track; solo varken diğer track'ler; Stop Clip basılıyken durmuş track'ler | [M] |
| Accent, Fixed Length | Açıkken on | (ç) |
| Diğerleri | Kullanılabilir = dim, basılıyken on | (ç) |

- Session Screen'de kuyruğa alınmış clip: **ekrandaki hücre** yeşil pulse yapar. Düğme LED'i için dogrulanamadi.
- Pad renk tabloları [M]:
  - Drum Rack: sesli pad = track rengi, boş = gri, çalan = yeşil, seçili = beyaz, solo = koyu mavi, mute = track renginin koyusu.
  - Step: boş = gri, nota = clip rengi (velocity yükseldikçe daha parlak), mute = clip renginin açığı, triplet'te sağdaki 2 sütun off. Playhead çalarken yeşil, kayıtta kırmızı.
  - Loop length: loop dışı off, görünmeyen gri, görünen beyaz, çalan yeşil, kaydeden kırmızı.
  - 32 Notes / 64 Notes: kök = track rengi, skala içi = beyaz, çalan = yeşil, seçili = açık ton; Chromatic'te skala dışı off. 64 Notes için ayrı liste yok, 32 Notes listesinden (ç).
  - Session Pad: clip rengi, kuyruk = yeşil blink, boş = off.
  - Overview: seçili blok beyaz, çalan blok yeşil, track/scene yoksa renksiz.

## 5. Davranış kuralları (kodlanacak)
- **Shift ince ayar**:
  - Volume 1 → 0.1 dB.
  - Tempo 1 → 0.1 BPM.
  - Swing %1 adım, aralık 0–100, Shift'te de %1.
  - Clip Start/Loop/Length Shift'te 16'lık adım; Transpose Shift'te cent.
  - 8 encoder'da Shift ile adım/10 (ç).
- **Encoder dokunma ve basma**:
  - Volume: dokun = seçili seçeneği göster; bas = Main → Headphones → Main track → Cue arasında geçiş.
  - Swing and Tempo: dokun = modu göster; bas = Tempo/Swing geçişi.
  - Delete + encoder'a dokun = otomasyonu sil; otomasyon yoksa varsayılan değere döndür.
- **Latch/momentary** (Repeat, Accent): kısa bas-bırak latch, basılı tut momentary. Eşik resmi olarak verilmemiş; öneri ~300 ms (ç).
- **Geçici görünümler**:
  - Note Mode'da Session basılı tutulursa geçici Session Pad Mode; tersi de geçerli.
  - Layout basılı tut = geçici görünüm; Shift+Layout kilitler; Layout'a tekrar basmak kilidi açar; kilit track başına saklanır.
- **Octave**:
  - Melodik: ±1 oktav; Shift ile skalada 1 nota (Melodic Sequencer / 32 Notes).
  - Drum: ±16 pad; Shift ile 1 sıra.
  - Session: ±8 scene.
- **Page**: sequencer'da sayfa değiştirir; Session'da ±8 track. Page'i basılı tutmak auto-follow'u geri açar.
- **Scale menüsü**:
  - Tonik üst/alt ekran düğmeleriyle, scale encoder'lar veya D-pad ile seçilir.
  - En soldaki encoder: 4ths / 3rds / Sequential.
  - En soldaki alt ekran düğmesi: In Key / Chromatic. En sağdaki alt ekran düğmesi: Fixed.
  - Fixed açıkken sol alt pad C (skalada yoksa en yakın nota); kapalıyken tonik.
  - Varsayılan: C major, 4ths, In Key, sol alt pad C1 = 36.
- **Diğer kombinasyonlar**:
  - Shift+Undo = Redo. Shift+Stop Clip = tüm clip'leri durdur.
  - Record basılı + alt ekran düğmesi = arm. Alt ekran düğmesine hızlı çift basış = arm (Session Pad).
  - Mute/Solo basılı + alt ekran düğmesi veya drum pad. Mute + step = step'i devre dışı bırak. Mute + üst ekran düğmesi = device'ı kapat.
  - Delete + pad / clip / ekran düğmesi / loop pad'i. Delete + Automate = tüm otomasyonu sil. Shift+Automate = override edilmiş otomasyonu geri etkinleştir.
  - Shift + alt ekran düğmesi = Track Options. Shift + üst ekran düğmesi (Rack) = Ungroup.
  - Select + pad = tetiklemeden seç. Select + touch strip = PB/Mod geçişi.
  - Session basılı tut + New = yeni Set.
  - D-pad merkezi veya jog'a basış: Scene Workflow'da scene, Clip Workflow'da clip tetikler; Shift ile tersi. Clip Workflow'da Shift+Duplicate = yeni scene.
  - Jog: döndür = gezin, bas = seç, sola nudge = geri, sağa nudge = rename/bağlam menüsü. Yukarı/aşağı eğme **yok**.
- **Tap Tempo**: son dokunuşların ortalamasından tempo hesaplanır; 4/4'te 4 dokunuştan sonra çalma başlar.

## 6. ders-push3.html'de düzeltilecekler
- **Hotspot bölmeleri**:
  - Tempo'yu 3'e böl (Metronome ekle).
  - NoteSettings'i 2'ye böl (Automate ekle).
  - RecordControls'u 3'e böl (Capture ekle).
  - LayoutScale'i 2×2 yap (Note ve Session ekle).
  - Mute ve Solo için §2.2 hücrelerini kullan.
  - Octave/Page için §2.8'deki köşegen hit-test'i kullan.
  - Seviye 2 Swing görevini TopKnobs'tan `Knob_10`'a taşı (Swing modu için encoder'a basma adımı gerekir).
- **Metin düzeltmeleri**:
  - "Touch Slider" → **Touch Strip**.
  - Layout = pad layout'ları arasında geçiş; 4ths/3rds/Sequential Scale menüsünde.
  - Double Loop = materyali **ve** loop uzunluğunu ikiye katlar.
  - Convert = Simpler/Drum Rack/audio dönüşümleri.
  - Quantize = basınca quantize eder; otomatik quantize için Rec. Quantize.
  - New = seçili clip'i durdurur ve boş slot hazırlar (Scene Workflow'da yeni scene de açar).


## CURUTULEN
- Konu 1 §2b: Üst ekran düğmesi LED'i için 'Kuyruktaki clip yeşil pulse yapar [M]' -> Kılavuz yalnızca Session Screen Mode'da 'the selected clip will pulse in green' diyor, yani ekrandaki clip hücresinden söz ediyor. Üst ekran düğmesinin pulse yaptığı yazılmıyor. Emülatörde pulse ekrandaki hücreye uygulanmalı; düğme LED'i için dogrulanamadi. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- Konu 1 §8.5: Encoder merkezleri x ≈ 651, 805, 958, 1113, 1265, 1420, 1574, 1727; y ≈ 278. Knob_9 bbox 236,525-374,652. -> Bu değerler gölge katmanını (Frame 12_n, +8 birim kayık) da içeren bbox'tan hesaplanmış. Döndürme ve hotspot için yüz (Frame 11_n) merkezi kullanılmalı: cx = 646.8, 801.0, 956.3, 1113.2, 1265.8, 1423.2, 1579.0, 1731.1; cy = 273.2; r ≈ 33. Knob_9 yüzü c(297,586) r61, Knob_10 c(296.1,905.4) r40.3, Knob_11 c(2071.6,585.2) r104.3. (file:///Users/berkayer/site/assets/img/push3-device.svg)
- Konu 8 belirsizlik: 'Frame 34'teki Octave/Page üçgenlerinin gerçek donanımda ayrı düğmeler olup olmadığı doğrulanmadı' -> Dört ayrı kontrol olduğu doğrulandı. Kılavuz 'Octave Up / Down' ve 'Page Left / Right'ı ayrı girişler olarak tanımlıyor ('These buttons will be unlit if no additional octaves are available'). Topluluk haritasında da dört ayrı CC var: 55, 54, 62, 63. SVG'deki X şeklindeki 4 üçgen bölge doğru model. (https://raw.githubusercontent.com/federico-pepe/ableton-push-hack/main/core/push3/buttons.go)
- Konu 8 belirsizlik: Scene/repeat-rate düğmelerinin gerçek sırası doğrulanamadı -> Güçlü çıkarımla çözüldü. Push 2 resmi dokümanına göre scene 1 üsttedir ve CC43'tür; Push 3 topluluk haritasında CC43 = 1/32t. Figma'da yanık çizilen 4. düğme 1/16 ve kılavuza göre varsayılan step 16'lık, bu da tutarlı. Yukarıdan aşağı sıra: 1/32t, 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4. Figma'daki 2. etiket (1/32t) ile 7-8. etiketler (1/4, 1/4t) hatalı. (https://raw.githubusercontent.com/Ableton/push-interface/master/doc/AbletonPush2MIDIDisplayInterface.asc)
- Konu 8 belirsizlik: Figma ikon düğmelerinin resmi adları doğrulanamadı (file, stamp, track, layout, icon-big-pads/tracks, MiscButton) -> Büyük ölçüde çözüldü. Satır sırası kılavuzun §17 sırasıyla birebir örtüşüyor: Sets/Setup/Learn/User, Lock/Stop Clip/Mute/Solo, Device/Mix/Clip/Session. Konum ifadeleri de uyuyor: Session 'above the jog wheel' (x 2077-2150, jog cx 2071.6), Note ve Session Pad 'under the Session D-pad' (LayoutScale y 980 > D-pad alt kenarı 965). Dişli ve ampul ikonları ikincil kaynakla doğrulandı. Yalnızca MiscButton = Main Track çıkarım olarak kalıyor. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- Konu 8 §2.6: Tek seferlik nötrleştirmede SideButton için yalnızca 'icon/play_4 stroke'u #383E43 yapılır' -> Bu yetersiz. SideButton_4'ün etiketi ('1/32t_4' grubu içindeki path) de fill=#46DD43 ile yeşil çizilmiş. İkisi birlikte #383E43 yapılmalı; aksi halde '1/16' etiketi hep yeşil kalır. SVG'de toplam 2 adet #46DD43 var ve ikisi de bu düğmeye ait. (file:///Users/berkayer/site/assets/img/push3-device.svg)
- Konu 1 §2c: Accent '16 Velocities pad'lerini de geçersiz kılar' -> Kılavuz yalnızca 'all played or step-sequenced notes will be at full velocity (127)' diyor. 16 Velocities ile etkileşimi yazmıyor. Dogrulanamadi. Emülatörde Accent açıkken tüm çalınan ve step'e girilen notalar 127 olsun; 16 Velocities davranışı çıkarım olarak işaretlensin. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- Konu 1 §7: CC düğmelerinde değer parlaklıktır ('lit white' = 122) [PH] -> İncelenen buttons.go dosyasında LED rengi veya parlaklık bilgisi yok. 122 değeri bu kaynakta dogrulanamadi. Web MIDI ile gerçek cihaza LED göndermek bu spesifikasyonun kapsamı dışında tutulmalı. (https://raw.githubusercontent.com/federico-pepe/ableton-push-hack/main/core/push3/buttons.go)
- Konu 1 §2c: Layout Drum Rack sırası 'Loop Selector → 16 Velocities → 64 Pads' -> §17 bu layout'ları '64 Pads, Loop Selector, and 16 Velocities' sırasıyla sayıyor, bölüm 6 ise 6.1 Loop Selector, 6.2 16 Velocities, 6.3 64 Pads diye ilerliyor. Döngü sırası açıkça yazılmamış. Bölüm sırası (Loop Selector → 16 Velocities → 64 Pads) kullanılabilir ama çıkarım olarak işaretlenmeli. Melodik sıra ise 64 Notes → Melodic Sequencer → Melodic Sequencer + 32 Notes; bu metinden destekleniyor ('press Layout twice' from 64 Notes). (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- Konu 1 §6: Push 3'te yeni düğmeler 'Sets, Learn, Save, Lock, Capture, Session Screen Mode' (Push 2'de yok) -> Push 3 tarafı kılavuzla doğru. Ancak bu düğmelerin Push 2'de bulunmadığı (özellikle Capture) bu incelemede resmi kaynakla doğrulanamadi. Emülatör metninde 'Push 2'de yoktu' ifadesi kullanılmamalı. (https://www.soundonsound.com/reviews/ableton-push-3)
- Konu 1 §2b tablo: Upper Display Buttons LED 'RGB' ([M] işaretsiz dayanak) -> Doğru, ancak dayanak farklı: kılavuzdaki 'upper display buttons, reflect the color of a selected clip' cümlesi ve üst düğmenin kırmızı yanması. Alt ekran düğmelerinin track rengi göstermesi ise yalnızca Figma'dan geliyor; kılavuzda yalnızca lit/unlit durumları var. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)

## DOGRULANAN
- [M §17, s.147-151, PDF'ten birebir okundu] Kontrol listesi ve sırası: Sets, Setup, Learn, User, Volume Encoder, Undo, Save, Lock, Stop Clip, Mute, Solo, Swing and Tempo Encoder, Tap Tempo, Metronome, Quantize, Fixed Length, Automate, New, Capture, Record, Play, Touch Strip, Encoders, Upper/Lower Display Buttons, Display, Pad Grid, Scenes & Repeat Intervals, Main Track, Swap, Add, Device, Mix, Clip, Session Screen Mode, Jog Wheel, Session D-pad, Note, Session Pad Mode, Scale, Layout, Repeat, Accent, Double Loop, Duplicate, Convert, Delete, Octave Up/Down, Page Left/Right, Shift, Select. https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf
- [M] Volume Encoder: dokununca seçili seçenek görünür, basınca seçenek değişir. Döndürme 1 dB, Shift ile 0.1 dB adım. Push açıldığında varsayılan seçenek main output. Encoder, ekranın solunda yer alıyor.
- [M] Swing and Tempo Encoder: dokununca Tempo mu Swing mi seçili olduğu görünür, basınca ikisi arasında geçiş yapılır. Tempo 1 BPM (Shift ile 0.1 BPM), Swing %1 adım, aralık %0-100. Swing ayrıca Quantize basılı tutulunca açılan menünün 1. encoder'ından da ayarlanabilir.
- [M] Tap Tempo: 4/4'te dört vuruş sonrası çalma o tempoda başlar. Metronome: basınca açılır/kapanır, açıkken düğme pulse yapar. Basılı tutunca Count-in, ses tipi (Classic/Click/Wood) ve Rhythm (varsayılan Auto) ile ölçü ayarları açılır.
- [M] Record count-in boyunca yanıp söner, kayıt başlayınca sabit kırmızıya geçer. Automate açıkken kırmızı, kapalıyken beyazdır. Repeat aktifken pulse yapar ve seçili repeat interval düğmesi yeşil yanar. Octave düğmeleri gidilecek oktav kalmadığında söner.
- [M] Lock: Lock basılıyken Stop Clip, Mute veya Solo'ya basılırsa Lock ve seçilen düğme yanıp sönmeye başlar. Kilidi açmak için Lock'a ya da kilitli düğmeye tekrar basılır. Seçili track mute'daysa Mute yanar; solodaysa Solo yanar ve diğer track'lerin alt ekran düğmeleri söner. Stop Clip basılıyken durmuş clip'i olan track'lerin alt ekran düğmeleri söner. Shift+Stop Clip tüm clip'leri durdurur.
- [M] Upper display buttons ve ekran öğeleri seçili clip'in rengini alır ("as well as the upper display buttons, reflect the color of a selected clip"), yani RGB'dir. Session Screen'de arm'lı track'in boş slotu seçiliyse ilgili üst ekran düğmesi kırmızı yanar.
- [M] Jog wheel şu hareketleri destekler: döndür, bas, sola nudge (bir üst menüye dönüş), sağa nudge (rename veya bağlam menüsü, metin girişinde imleç). Dokununca Session Screen'de scene adları görünür. Yukarı/aşağı eğme kılavuzda yok; dört yön ayrı Session D-pad'dedir (oklar ve merkez düğme).
- [M] Konum ifadeleri: 'Add button at the right of the display', 'Session button above the jog wheel', 'Session button under/underneath the Session D-pad', 'Volume encoder to the left of Push's display'.
- [M] Geçici modlar: Note Mode'da Session basılı tutulursa geçici olarak Session Pad Mode'a geçilir, Session Pad Mode'da Note basılı tutulursa geçici olarak Note Mode'a geçilir. Layout basılı tutmak geçici görünüm verir, Shift+Layout bu görünümü kilitler, Layout'a tekrar basmak kilidi açar; kilit durumu track başına saklanır. Repeat ve Accent kısa basışta açık kalır (latch), basılı tutulunca bırakılınca kapanır (momentary). Repeat durumu track başına saklanır. Accent tüm notaları velocity 127 ile çaldırır.
- [M] 64 Notes varsayılanı: C major, sol alt pad C1. Yukarı her pad bir dörtlü, sağa her pad skaladaki sonraki nota. Scale menüsü: tonik üst/alt ekran düğmeleriyle, scale encoder'lar veya D-pad ile seçilir. En soldaki encoder 4ths/3rds/Sequential, en soldaki alt ekran düğmesi In Key/Chromatic, en sağdaki alt ekran düğmesi Fixed. Chromatic modda skala dışı pad'ler söner.
- [M] Octave ile Shift: Melodic Sequencer ve 32 Notes'ta skalada 1 nota kaydırır; Drum Rack'te (touch strip ile de) tek sıra kaydırır. Touch strip Melodic Sequencer'da Shift'le kaydırılırsa oktav, Shift'siz kaydırılırsa skala notası değişir. Select basılıyken touch strip'e dokunmak pitch bend ile mod wheel arasında geçiş yapar.
- [M] Pad renk listeleri doğrulandı. Drum pad'ler: track rengi, gri, yeşil, beyaz, koyu mavi (solo), track renginin koyusu (mute). Step'ler: gri, clip rengi (velocity yükseldikçe daha parlak), clip renginin açığı (mute), triplet'te sağdaki 2 sütun sönük, kayıtta playhead kırmızı. Loop length: sönük, gri, beyaz, yeşil, kırmızı. 32 Notes: kök = track rengi, seçili = açık ton, çalan = yeşil, skala içi = beyaz. Session Pad: clip rengi, kuyruk = yeşil yanıp söner, boş = sönük. Session Overview: beyaz, yeşil, renksiz (track/scene yok).
- [M] Workflow: Scene Workflow varsayılandır; Clip Workflow'da Shift+Duplicate yeni scene oluşturur. D-pad merkezine basış Scene Workflow'da scene'i, Clip Workflow'da clip'i tetikler; Shift ile tersi olur. Exclusive Arm ve Exclusive Solo varsayılan olarak On. Display Light ve LED Brightness varsayılanı %100. Power 3 sn basılı tutulunca kapanır, 10 sn'de zorla kapanır. Session basılı tutup New'e basmak yeni Set açar.
- [M] Clip View'da 1. encoder Zoom'dur; Shift ile Start/Loop/Length değerleri 16'lık nota adımıyla, Transpose cent adımıyla değişir. Step sequencer'ın varsayılan adımı 16'lık notadır ve Scenes düğmeleriyle değiştirilir.
- [P2 raw doc] Push 2'de 'scene 1 button' CC43 ve üsttedir, 'scene 8' CC36'dır. Encoder'lar tam turda yaklaşık 210 adım gönderir, tempo encoder'ı 18 adım. Touch strip'te 31 LED var. Ekran 960x160, pikseller 16 bit b-g-r. Bunların hepsi yalnız Push 2 için resmidir. https://raw.githubusercontent.com/Ableton/push-interface/master/doc/AbletonPush2MIDIDisplayInterface.asc
- [PH] Push 3 CC haritası (topluluk kaynağı) birebir doğrulandı. Üst ekran düğmeleri CC102-109, alt ekran düğmeleri CC20-27. Encoder'lar CC71-78, Volume CC79, Tempo CC14 (basış CC15), Volume basış CC111. Touch note'ları: encoder 0-7, Volume 8, Tempo 10, Jog 11, touch strip 12, D-pad merkezi 13. Jog: dönüş CC70, basış CC94, sol CC93, sağ CC95. D-pad: yukarı 46, sağ 45, aşağı 47, sol 44, merkez 91. Scene/step CC36-43 = 1/4, 1/4t, 1/8, 1/8t, 1/16, 1/16t, 1/32, 1/32t. Pad'ler note 36-99, sol alttan sağ üste. Kaynak dosyada LED rengi bilgisi yok. https://raw.githubusercontent.com/federico-pepe/ableton-push-hack/main/core/push3/buttons.go
- [FIG, render edilip gözle doğrulandı] Sol üst ikonlar: belge, dişli, ampul, kişi (baş ve omuz). Sol ikinci sıra: kapalı kilit, kare, M, S. Sağ üst: açık halka, seviye çubukları, çerçeve içinde play, |||. Ekranın sağında + ve dönen oklar. Undo düğmesinin id'si Save_2, ama üzerinde 'Undo' yazıyor. Tempo grubu: 'Tap Tempo', boş ve dolu iki daire (Metronome), 'Quantize'. NoteSettings: 'Fixed Length' ve kırmızı 'Automate'. RecordControls: 'New', köşe parantezi (Capture), kırmızı daire. Yeşil üçgen Play. LayoutScale: ızgara ikonu, |||, 'Scale', 'Layout'. Ayrıca Repeat/Accent, Double Loop/Duplicate/Convert/Delete, X ile bölünmüş Octave↑, Page◀ (sönük), Page▶ (sönük), Octave↓ ve Shift/Select.
- [FIG, path genişliği ölçüldü] SideButton etiketleri yukarıdan aşağı: 1/32t, 1/32t (1. ile birebir aynı path), 1/16t, 1/16, 1/8t, 1/8, 1/4, 1/4t. 7. etiket 6. ile aynı genişlikte ('t'siz), 8. etiket daha geniş. Figma hatası doğrulandı. Yalnızca SideButton_4 ('1/16') yeşil #46DD43: hem etiket dolgusu hem play ikonunun stroke'u. Bu, kılavuzdaki 'varsayılan step 16'lık' bilgisiyle ve doğru sıradaki 4. düğmeyle (1/16) tutarlı.
- [FIG] Ayırıcı rect'ler x=308.25/383.5/458.75 (sağda 1924.25/1999.5/2074.75), genişlik 3. Hücre sınırları (ayırıcı ortası) 309.75, 385 ve 460.25. Knob yüz geometrisi: Knob_9 236,525 Ø122; Knob_10 255.74,865.02 Ø80.68; Knob_11 1967.35,480.87 Ø208.58. D-pad Frame 35 kutusu 1952,757,209,208; ok path'leri Vector 1_4 (yukarı, 2047,792), Vector 2_2 (aşağı, 931), Vector 1_5 (sağ, 2126), Vector 2_3 (sol, 1987). JogControls etiketlerinin başlangıç koordinatları: Octave↑ y1566, Octave↓ y1639, Page◀ x2018, Page▶ x2093.
- [SOS] Push 2'deki Browse düğmesinin yerini Add ve Swap aldı. En soldaki iki encoder kaldırıldı, yerine aşağıda daha büyük knob'lar geldi. Sağa jog wheel eklendi. Kayıt işlevleri solda, düzenleme işlevleri sağda. Pad'ler MPE ve beyaz. https://www.soundonsound.com/reviews/ableton-push-3
- [MSL, ikincil] Play çalarken yeşil, çalmıyorken beyaz. Mute kilitliyken kırmızı, Solo kilitliyken mavi yanıp söner. Learn düğmesinde ampul, Setup'ta dişli ikonu var ve ikisi sol üstte. https://www.mslinn.com/av_studio/ableton-push-standalone.html

## HALA BELIRSIZ
- MiscButton = Main Track eşlemesi hâlâ çıkarım. Kılavuzda Main düğmesi var ('The Main Track Button' figürü), ama konumu metinde yazmıyor. Figma'da tek sahipsiz düğme bu; CC28'in alt ekran düğmelerinin CC'lerine (20-27) komşu olması da bunu destekliyor.
- Knob_10 = Swing and Tempo Encoder yalnızca konumdan çıkarıldı (Tap Tempo'nun hemen üstü). Kılavuz metni bu encoder'ın konumunu vermiyor.
- Scene düğmelerinin yukarıdan aşağı sırası (1/32t ... 1/4) Push 3 için doğrudan resmi kaynaktan değil, Push 2 resmi CC43 = üst bilgisi ile Push 3 topluluk CC haritasının birleştirilmesinden çıkarıldı.
- Push 3 ekranının 960x160 olduğu resmi olarak yayımlanmamış (Push 2 için resmi, Push 3 için topluluk ölçümü). Fiziksel boyutu bilinmiyor.
- Push 3 encoder çözünürlüğü (adım/tur) yayımlanmamış. 210 ve 18 adım değerleri yalnız Push 2 için geçerli.
- Hangi düğmelerin RGB, hangilerinin yalnız beyaz LED'li olduğu Push 3 için listelenmemiş. Play (yeşil/beyaz) ile Mute ve Solo'nun kilitliyken renkli yanıp sönmesi yalnızca ikincil kaynakta [MSL] geçiyor.
- 'dim = kullanılabilir, on = aktif' kuralı; Stop Clip, Capture, Fixed Length, Accent, Note/Session, Device/Mix/Clip/Session, Add/Swap, Sets/Setup/Learn/User ve Undo/Save LED durumları dokümante değil.
- Session Screen'de kuyruktaki clip için yeşil pulse'ın ekrandaki hücrede mi yoksa üst ekran düğmesinde mi olduğu belirsiz. Kılavuz yalnızca 'the selected clip will pulse in green' diyor.
- Push 3 touch strip'inde LED olup olmadığı ve varsa sayısı doğrulanamadı. Figma'da tek beyaz nokta var, Push 2'de 31 LED vardı.
- Encoder'a dokunmanın ekranda değer gösterip göstermediği belirsiz. Kılavuzda dokunmanın yalnızca parametreyi seçtiği bağlamlar var (Macro Map, Delete+touch).
- Drum Rack Layout döngüsünün kesin sırası kılavuzda açıkça yazmıyor. §17 ile bölüm 6 farklı sırayla sayıyor.
- Accent'in 16 Velocities pad'lerini geçersiz kılıp kılmadığı doğrulanamadı.
- Latch ile momentary ayrımındaki basış süresi eşiği resmi olarak verilmemiş.
- Capture gibi düğmelerin Push 2'de bulunmadığı resmi kaynakla doğrulanmadı.
- Topluluk MIDI haritası tersine mühendisliğe dayanıyor ve LED değer kodlamasını içermiyor ('lit white = 122' doğrulanamadı).