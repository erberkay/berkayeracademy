# KONU 4 — PUSH 3 EKRAN ARAYÜZÜ (uygulamaya hazır spesifikasyon)

## 0. Kaynaklar ve bu belgede güvenilirlik nasıl işaretlendi

| Kod | Kaynak | Ne işe yaradı | Güven |
|---|---|---|---|
| **M3** | Ableton Push 3 Reference Manual, PDF 2024-11-05, 144 sayfa. Ekran görüntüleri tek tek açılıp incelendi; aşağıda "M3 s.X" diye sayfa numarası veriliyor | Push 3'ün gerçek ekran görüntüleri: Device, Rack, Browse, Hot-Swap, Scale, Clip, Mix, Session, Setup ve popup'lar | resmi |
| **P2DOC** | Ableton/push-interface GitHub, "Push 2 MIDI and Display Interface Manual" | Piksel boyutu, renk formatı, fps | resmi (Push 2) |
| **SOS** | Sound On Sound, Push 3 incelemesi (Simon Sherbourne, Temmuz 2023): "While the screen is the same…" | Push 3 ekranının Push 2 ile aynı donanım olduğu | ikincil |
| **RS** | Live 11/12 MIDI Remote Scripts, Push2 klasörü. Resmi olmayan decompile, gluon/AbletonLive11/12_MIDIRemoteScripts deposu | Bank tanımları, görselleştirme ızgarası, renk paleti, ikon adları, ekranın veri modeli | kod. Push 3 kendi yazılımıyla çalışıyor ve Push 3 kodu açık değil. Ama M3 s.27'deki Push 3 Drift ekranı, RS'teki Drift "Main" bank'ıyla ve seçenekleriyle birebir aynı (Osc Select / Osc 1 Wave / Osc 1 Shape / Osc 1 Oct / Osc 1 Gain / LP Freq / LP Reso / Volume; seçenekler "Osc Retrig" ve "Osc 1"). Bu yüzden Push 3'ün aynı bank tanımlarını kullandığı güçlü bir çıkarım. |
| **FIG** | `/Users/berkayer/site/assets/img/push3-device.svg`, "LCD Display" grubu. Yazılar path'e çevrilmiş; tarayıcıda viewBox daraltılıp render edilerek okundu | Figma'nın çizdiği Wavetable ekranı | kod/yerel |

> Lisans notu: RS, Ableton'ın decompile edilmiş kodu. Buradan yalnızca olgular alındı (isimler, sayılar). Siteye kod kopyalanmamalı.

---

## 1. Donanım ekranı

| Özellik | Değer | Kaynak / güven |
|---|---|---|
| Çözünürlük | **960 × 160 px** (en-boy 6:1) | P2DOC (Push 2 için). Push 3 için SOS "screen is the same" diyor. Push 3 tech-specs sayfası çözünürlük vermiyor, bu yüzden Push 3 için **çıkarım (orta güven)** |
| Renk | 16 bit RGB565 (Push 2 USB protokolü) | P2DOC |
| Tazeleme | 60 fps, double-buffer; 2 sn frame gelmezse ekran kararır | P2DOC |
| Parlaklık | Setup > Status > **Display Light** (varsayılan 100 %) | M3 s.8–9 |
| Ekranı çevreleyen kontroller | Üstte 8 dokunmatik encoder ve 8 "upper display button". Altta 8 "lower display button". Ekranın solunda Volume encoder, sağında Add/Swap/Device/Mix/Clip/Session ve jog wheel | M3 s.139–141 |
| Genel kural | "if you see a parameter or option in the display, the encoder above it will affect it" | M3 s.141 |
| Tipografi | **Ableton Sans**: "First introduced in Push 2", yalnızca Ableton arayüzleri için yapılmış, kamuya açık değil | lettersfromsweden.se |

---

## 2. Ekran ızgarası (RS `Push2/visualisation_settings.py`, birebir sabitler)

```
screen_width = 960, screen_height = 160
button_spacing = 121          // sütun aralığı (8 sütun, 1 sütun = 1 encoder = 1 üst + 1 alt buton)
button_left  = 4   light_left = 14   light_right = 100   button_right = 110   // sütun içi x ofsetleri
row_spacing  = 20             // 8 satır x 20 px = 160
row_top = 1  body_top = 5  body_bottom = 15  row_bottom = 19                 // satır içi y ofsetleri
visualisation_left = 4
visualisation_top  = row_spacing*3 + row_top = 61                          // grafikler 4. satırdan başlar
```

**Sütun formülleri** (k = 0..7): `buttonLeft = 121k+4`, `lightLeft = 121k+14`, `lightRight = 121k+100`, `buttonRight = 121k+110`.

| k | buttonLeft | lightLeft | lightRight | buttonRight |
|---|---|---|---|---|
| 0 | 4 | 14 | 100 | 110 |
| 1 | 125 | 135 | 221 | 231 |
| 2 | 246 | 256 | 342 | 352 |
| 3 | 367 | 377 | 463 | 473 |
| 4 | 488 | 498 | 584 | 594 |
| 5 | 609 | 619 | 705 | 715 |
| 6 | 730 | 740 | 826 | 836 |
| 7 | 851 | 861 | 947 | 957 |

**Satır formülleri** (r = 0..7): `rowTop = 20r+1`, `bodyTop = 20r+5`, `bodyBottom = 20r+15`, `rowBottom = 20r+19`.

Satırların kullanımı M3 ekran görüntülerinden ve FIG eşlemesinden çıkarıldı (orta-yüksek güven):

| Satır | y (px) | İçerik |
|---|---|---|
| r0 | 1–19 | **Üst buton etiketleri**: cihaz zinciri, sekmeler, seçenekler, "X" / "<" |
| r1 | 21–39 | Parametre adları (küçük, gri) |
| r2 | 41–59 | Değerler (küçük, track renginde). Büyük değer r2–r3'e taşar |
| r3–r6 | 61–139 | Görselleştirme (Wavetable, filtre, envelope, LFO, waveform, nota) **veya** büyük değer + halka (knob ring) |
| r7 | 141–159 | **Alt buton etiketleri**: track adları veya bank sekmeleri |

Bir görselleştirmenin x aralığı `lightLeft(i)` ile `lightRight(j)` arasıdır (sütun i'den j'ye).

---

## 3. Ortak görsel dil (bütün modlar)

### 3.1 Renk
- **Zemin: saf siyah** (M3 ekran görüntüleri). FIG'de `#101010`.
- **Vurgu = seçili track'in (veya clip'in) rengi.** "The elements in the display such as parameter names, notes or waveform colors, as well as the upper display buttons, reflect the color of a selected clip" (M3 s.94). Device ekranında değerler, sekme yazıları ve seçili kutu track renginde.
- **Setup, Scale, Fixed Length ve Quantize menüleri monokrom** (beyaz/gri) (M3 s.8–12, 75, 88, 92).
- Parametre adları gri. Seçilmemiş liste elemanları koyu gri. Pasif (mute'lu / disabled) cihazın parametreleri gri: "When a device is muted, its parameters will be grayed out" (M3 s.28). Tam hex değerleri dokümante değil; ekran görüntüsünden tahmin: ad ≈ `#8A8A8A`, pasif liste ≈ `#4A4A4A`. **Doğrulanamadı.**
- **Track renk paleti** (RS `Push2/colors.py`, `PUSH_INDEX_TO_SCREEN_COLOR`, sıra korunmuş, 0 = beyaz):
  `255,255,255 | 237,89,56 | 209,23,10 | 255,100,0 | 255,50,0 | 128,71,19 | 88,35,7 | 237,218,60 | 228,194,0 | 148,255,24 | 0,230,49 | 0,157,50 | 51,158,19 | 0,185,85 | 0,113,78 | 0,204,137 | 0,187,173 | 0,113,164 | 0,106,202 | 73,50,179 | 0,90,98 | 82,96,221 | 171,80,255 | 225,87,227 | 136,66,91 | 255,30,50 | 255,74,150`
- **Gölge formülleri** (RS): `shade1 = rgb×0.8`, `shade2 = ×0.5`, `shade3 = ×0.3`, `shade4 = ×0.3 ve saturation −20 %`, `shade5 = saturation −70 %`. Display buton LED'leri `DISPLAY_BUTTON_SHADE_LEVEL = 1` ile gösteriliyor.

### 3.2 Tipografi (M3 görüntülerinden ölçülen yaklaşık boyutlar, 960 px uzayında; **doğrulanamadı**)
- Buton etiketi ve parametre adı: yaklaşık 12–13 px.
- Küçük değer: yaklaşık 13 px.
- Büyük değer: yaklaşık 26–28 px. Birim ("kHz", "dB", "Hz", "ms", "st", "%") değerin yanında, küçük ve aynı renkte ("20.0 kHz", "-6.0 dB").
- Popup metni: yaklaşık 28–32 px.
- Font önerisi: Ableton Sans lisanslanamaz. Sitenin kendi fontu (Instrument Sans) veya Figma'daki Inter benzeri bir sans kullanılabilir.

### 3.3 Bileşen kataloğu

| Bileşen | Görünüm | Kaynak |
|---|---|---|
| Buton etiketi (r0/r7) | Tek satır, sütunun lightLeft'inden başlar, uzunsa kesilir ("1-Instrumen", "Chorus-Ensem") | M3 s.27–31 |
| **Seçili etiket** | Track rengiyle dolu kutu, siyah yazı ("4-Drift", "Main", "Drift"). Mix sekmesi ("Pans") ve Setup sekmesi beyaz kutu | M3 s.27, 127, 8 |
| Geri etiketi | `< Drift`, `< 7-Drift` (r0, sütun 0) | M3 s.27, 24 |
| Kapat | `X` (r0 sol üst) | M3 s.23 |
| Büyük değer + halka | Değer r2'de büyük. Altında, lightLeft'e hizalı açık-alt dairesel halka. Gri iz ince, değer yayı kalın ve track renginde | M3 s.27, 127; FIG |
| Bipolar halka (pan) | Yay tepe merkezden sağa/sola açılır ("11 L", "10 R", "C") | M3 s.127 |
| Liste seçici (enum) | Yatay dizi: seçili parlak, diğerleri koyu; taşan kısım kesilir veya soluklaşır ("Osc 1 Os…", "1 2 3 4 5 6 7 8 16", "Classic One-Sh…") | M3 s.27, 112–114 |
| İkonlu enum | `valueItemImages` ile küçük ikon dizisi (dalga şekli, filtre tipi…) | RS model; M3 s.27 |
| On/Off seçeneği (r0) | "Osc Retrig Off", "Osc 1 On", "Loop Off", "Retrigger On" | M3 s.27, 112, 114 |
| Switch seçeneği (r0) | İki etiket, seçili olan parlak ("Trigger Gate", "Hz Sync", "12dB 24dB") | M3 s.113; RS |
| Checkbox | `■ Loop`, `□ Preview`, `□ Play Sync` | M3 s.94, 23, 8 |
| Armed track | Track adından önce "○" ikonu (FIG'de `icon/circle-dot`) | M3 s.84, 2049. satır: "a circle icon is displayed before the track name" |
| Rack/Drum/Group ikonları | Instrument Rack "∿", Drum Rack "⠿" (nokta ızgarası), MIDI Effect Rack ayrı ikon. Açılmış Rack/Group'ta içerdiği öğeler boyunca alt çizgi | M3 s.30–31, 130 |
| Otomasyon noktası | Değerin yanında beyaz nokta = otomasyon var; gri nokta = override edilmiş | M3 s.123, 140 |
| Popup | Ekranın sol-orta kısmında siyah kutu, büyük beyaz metin, `Etiket: değer` biçiminde: "Tempo: 85.00 BPM", "Swing Amount: 35%", "Main Output: -8.3 dB", "Solo: Locked" | M3 s.20, 34, 90, 126 |
| Count-in çubuğu | Kayıt öncesi ekranın üstünde soldan sağa ilerler, tempoya göre yanıp söner | M3 s.85 |
| Çalma ilerleme çubuğu | Çalan clip'i olan track'in adının altında ince çubuk | M3 s.94–95 |
| Pil ikonu | Pil %7'nin altına inince her ekranda görünür | M3 s.9 |

### 3.4 Display butonlarının LED'leri (M3 s.27–28, 127)
- Üst butonlar: seçili cihaz veya sekme **beyaz**. Diğer cihazlar track renginin sönük tonunda. Boş sütun sönük.
- Alt butonlar: her track kendi renginde, seçili track **beyaz**.
- Stop Clip basılıyken durmuş track'lerin butonu söner. Mute'lu track'in butonu söner ve kontrolleri gri olur. Solo'da diğer track'ler söner (M3 s.125).
- Session Screen'de armed track'in boş slotu seçiliyse üst buton **kırmızı** (M3 s.134).
- FIG LED renkleri: kapalı `#414548`, beyaz `#DBEAEB`/`#CEDEEB`, yeşil `#168A31`, turuncu `#D87635`, mavi `#0088DE`, mor `#9C62CA`. Işık çubuğu 108×6 birim, köşe yarıçapı 2.

---

## 4. DEVICE modu (Device butonu)

### 4.1 Varsayılan görünüm. M3 s.27, "A Loaded Device" (Drift)
| Satır | İçerik |
|---|---|
| r0 | Track'in **cihaz zinciri**. Seçili cihaz track renginde dolu kutu ("Drift"). Rack'ler ikonlu ("Keys & Scale", "Instrument R", "Foggy Pad"…) (M3 s.31) |
| r1 | Seçili cihazın **"Main" bank'ındaki 8 parametrenin adı** (RS `BANK_MAIN_KEY = "Main"`) |
| r2 | Değerler (track renginde) |
| r3–r6 | Cihaza özel görselleştirme ve/veya büyük değer + halka |
| r7 | **Track'ler** (adlar track renginde, seçili track dolu kutu, armed track "○" ile). Ör. "1-Instrumen, Foggy Pad, Orbit Mallets, 2-Buchla Per, 3-Audio, 4-Drift (seçili), 5-Audio, 6-Drift" |

Drift örneği:
- r1: `Osc Select | Osc 1 Wave | Osc 1 Shape | Osc 1 Oct | Osc 1 Gain | LP Freq | LP Reso | Volume`
- r2: `Osc 1 Os… | [dalga ikonları] | 0.0 | 0 | -6.0 dB | 20.0 kHz | 0.0 | -6.0 dB`
- Sütun 1–4'ün altında Drift'in dalga grafiği var. Son üç sütunda büyük değer + halka.

### 4.2 Bank ("Edit") görünümü
"Press the display button above the device's name to view all of the available parameter tabs … access the individual tabs using the corresponding lower display buttons" (M3 s.27).
- r0: sütun 0 = `< CihazAdı` (geri). Sütun 1–7 = cihazın **OPTIONS** listesi; RS'te 7 elemanlı tuple, **indeks i → sütun i+1**. Drift'te "Osc Retrig" sütun 1'de, "Osc 1" sütun 4'te; bu hem M3 s.27'de hem RS'te aynı.
- r7: **bank sekmeleri** (track renginde yazı, seçili sekme dolu kutu). Drift: `Main | Oscillator | Filter | Envelopes | LFO | Fixed Mod | Custom Mod | Global`. RS'te "LFOs" yazıyor, M3 görüntüsünde "LFO" okunuyor; küçük bir fark.
- Bank 8'den fazlaysa sağdaki alt buton ok olur (Push 2 kılavuzu).
- Çıkış: aynı üst butona tekrar basmak (Simpler için M3 s.112).

### 4.3 Parametre çizim kuralı: `shrink_parameters` (RS `wavetable.py` / `device_component.py`)
- Görselleştirmenin kapladığı sütunlardaki parametreler **küçültülür**: ad + küçük değer, halka yok.
- Diğer sütunlar: **büyük değer + birim + halka**.
- Enum parametreler: liste veya ikon dizisi.
- Ekranın veri modeli (RS `Push2/model/__init__.py` DeviceParameter): `name, original_name, min, max, value, valueItems[], valueItemImages[], valueItemSmallImages[], displayValue, unit, is_enabled, hasAutomation, automationActive, isActive`. Bir emülatörde her parametre için bu alanlar tutulmalı.

### 4.4 Encoder'a dokunma
- Veri modelinde `Encoder.touched` alanı var, yani ekran dokunmaya tepki veriyor (RS).
- Wavetable'da dokunma şu bayrakları açar: `AdjustingPosition` (Position), `AdjustingFilter` (Filter Type/Freq/Res), `AdjustingLfo` (LFO parametreleri), `EnvelopeFocus` (dokunulan envelope segmenti vurgulanır).
- Tempo/Swing ve Volume encoder'ına dokunmak popup açar (M3 s.20, 34).
- **Doğrulanamadı:** normal bir cihaz parametresine dokununca değerin "büyüyüp" ayrı gösterilmesi. Ne M3'te ne Push 2 kılavuzunda anlatılıyor. M3 s.32'deki vurgulu sütun, kılavuzun kendi odak stili olabilir.
- Emülatör önerisi: dokunulan sütunda adı beyaz yap. Küçültülmüş (shrunk) bir parametreye dokunulduğunda geçici popup göster: `Position: 51 %`.
- Delete basılıyken encoder'a dokunmak parametreyi varsayılana döndürür veya otomasyonu siler (M3 s.143).

### 4.5 Diğer Device ekranları
- **Cihaz taşıma:** r0'da zincir, taşınan cihaz beyaz kutuda; ortada büyük metin "Choose the position of Reverb" (M3 s.28).
- **Mute'lu cihaz:** bütün parametreleri gri (M3 s.28).
- **Instrument Rack chain'leri:** Rack'in üst butonu basılı tutulunca chain'ler r7'de listelenir ("Foggy Pad", "Orbit Mallets") (M3 s.32).
- **Track Options** (Shift + track'in alt butonu): ekranda büyük "4-Drift"; r7 `Rename | Group | Ungroup | Freeze | Flatten` (M3 s.29).
- **Hot-Swap:** r0 `< Drift | □ Preview | ■ Favorites | ← Load | Load →`; altında 3 sütunlu preset listesi (M3 s.29).

---

## 5. WAVETABLE'ın Push ekranı (RS `Push2/custom_bank_definitions.py`, Live 11 ve Live 12'de aynı)

Ableton: "you can see detailed wavetable visualisations … right from Push's display", "You can easily assign sounds to the modulation matrix" (Wavetable pack sayfası). Aşağıdaki bank ve seçenek tabloları RS'ten.

### 5.1 Bank sırası (r7 sekmeleri)
`Main | Oscillators | Filters | Global | Envelopes | LFOs | Matrix | MIDI` (indeks 0–7). Matrix ve MIDI'nin sekme olarak görünüp görünmediği ekran görüntüsüyle doğrulanamadı.

### 5.2 Bank → 8 parametre (r1 adları) → seçenekler (r0, sütun 1–7)
`Oscillator` seçicisi 4 değer alır: **1, 2, S (Sub), Mix**. Ad ve parametre bu seçime göre değişir.

| Bank | S0 | S1 | S2 | S3 | S4 | S5 | S6 | S7 |
|---|---|---|---|---|---|---|---|---|
| **Main** | Oscillator | Table (osc 1/2) · Gain (S = Sub Gain) · Gain 1 (Mix) | Position (1/2) · Tone (S) · Gain 2 (Mix) | Filter Type (seçili filtre) · Octave (S = Sub Transpose) · Gain Sub (Mix) | Frequency | Resonance | **Mod Time** (param "Time") | **Mod Amt** ("Global Mod Amount") |
| **Oscillators** | Oscillator | Category · Gain (S) · Pitch 1 (Mix) | Table · Tone (S) · Pitch 2 (Mix) | Position · Octave (S) · Octave Sub (Mix) | Pitch (1/2) · Gain 1 (Mix) | Effect Type · Gain 2 (Mix) | FX1: Classic→**Pulse Width**, Modern→**Warp**, FM→**Pitch** | FX2: Classic→**Sync**, Modern→**Fold**, FM→**Amount** · Gain Sub (Mix) |
| **Filters** | Filter (1/2 seçici) | Filter On | Filter Type | Frequency | Resonance | Filter Circuit (LP/HP veya BP/NO/Morph) | Morph (tip Morph ise) · Drive (circuit ≠ Clean) | Routing |
| **Global** | Mono On | Glide (Mono açıksa) · Poly Voices | Unison Mode | Unison Voices | Unison Amount | Transpose | — | Volume |
| **Envelopes** | Envelopes (Amp/Env2/Env3) | Env View (Time/Slope, mod env'de +Value) | Attack · A Slope · Init | Decay · D Slope · Peak | Sustain | Release · R Slope · Final | Loop | — |
| **LFOs** | LFO (1/2) | LFO Type | Shape | Rate (Free → Rate, Tempo → S. Rate) | Amount | Attack | Offset | Retrigger |
| **Matrix** | Modulation Target Names | Current Mod Target | — | Amp Env | Env 2 | Env 3 | LFO 1 | LFO 2 |
| **MIDI** | Modulation Target Names | Current Mod Target | Velocity | Pitch | Pitch Bend | Aftertouch | Mod Wheel | Random |

**Seçenekler (r0, sütun 1→7):**
- Main: `Osc On / Sub On (Osc=S) | — | Filter Switch [Filter 1 | Filter 2] | Filter On/Off | — | — | Add to Matrix`
- Oscillators: `Osc/Sub | — | — | — | — | — | Add to Matrix`
- Filters: `— | Filter 1/2 Slope [12dB | 24dB] | — | — | — | — | Add to Matrix`
- Global ve Envelopes: `… | Add to Matrix` (sütun 7)
- LFOs: `— | — | LFO Sync [Hz | Sync] | — | — | — | Add to Matrix`
- Matrix: `Back | — | Go to Amp Env | Go to Env 2 | Go to Env 3 | Go to LFO 1 | Go to LFO 2`
- MIDI: `Back`

Seçenek etiketinin durum yazısı ("Osc On" gibi) Drift ve Simpler görüntülerinden çıkarıldı.

### 5.3 Görselleştirme konumları (RS `VISUALISATION_CONFIGURATION`)
| Görselleştirme | Bank | Sütun | x (px, 960 uzayı) | Görünürlük şartı |
|---|---|---|---|---|
| wavetable (osilatör dalgası) | Main | 0–2 | 14–342 (w 328) | Oscillator = 1 veya 2 (S/Mix'te gizli) |
| filter (filtre eğrisi) | Main | 3–5 | 377–705 (w 328) | her zaman |
| wavetable | Oscillators | 1–3 | 135–463 (w 328) | Oscillator = 1 veya 2 |
| filter | Filters | 2–4 | 256–584 (w 328) | her zaman |
| envelope | Envelopes | 2–5 | 256–705 (w 449) | her zaman |
| lfo | LFOs | 0–3 | 14–463 (w 449) | her zaman |

- Formül: `start = 121·i + 14`, `width = (121·j + 100) − (121·i + 14)`.
- Dikey başlangıç y = 61. Alt sınır kodda yok; r6 sonu olan y ≈ 139 varsayılabilir (çıkarım).
- Ekrana giden görünüm verisi: `SelectedOscillator, SelectedFilter, SelectedLfo, SelectedEnvelope, WavetableVisualisationStart/Width/Visible, FilterCurve…, Lfo…, Envelope…, AdjustingPosition/Filter/Lfo, EnvelopeShow[], EnvelopeFocus[], IsActive, TrackColor`.

### 5.4 Envelope segment vurgusu (RS `ENVELOPE_FEATURES_FOR_PARAMETER`)
- Her zaman çizilenler: `AttackLine, DecayLine, SustainLine, ReleaseLine`. Bank'ta olan parametrelere göre node'lar eklenir.
- Dokunulan parametrenin vurguladığı öğeler:

| Parametre | Vurgulanan öğeler |
|---|---|
| Attack | AttackLine, AttackNode, DecayLine |
| Decay | DecayLine, DecayNode, SustainLine |
| Sustain | DecayLine, DecayNode, SustainLine, SustainNode, ReleaseLine |
| Release | ReleaseLine, ReleaseNode |
| Init / Initial | InitNode, AttackLine |
| Peak | AttackLine, AttackNode, DecayLine |
| Final / End | ReleaseLine, ReleaseNode |
| A Slope / D Slope / R Slope | ilgili Line |

### 5.5 Enum ve ikon listeleri (RS `device_parameter_icons.py`)
| Parametre | Değerler |
|---|---|
| Oscillator | 1, 2, Sub, Mix |
| Effect Type | None, FM, Classic, Modern |
| Filter Type | 5 ikon: `wavetable_filter_1..5`. Wavetable'ın sırasıyla Lowpass/Highpass/Bandpass/Notch/Morph olduğu çıkarım |
| Circuit | Clean, OSR, MS2, SMP, PRD |
| Filter Routing | Serial, Parallel, Split |
| Sub Transpose | 0, −1, −2 oktav |
| LFO Shape | Sine, Triangle, Saw Down, Square, Random |
| Env View | Time, Slope (mod env'de + Value) |
| Env Loop Mode | None, Trigger, Loop |
| Unison Mode | None, Classic, Shimmer, Noise, Phase Sync, Position Spread, Random |
| Unison/Poly Voices | 2–8 |
| On/Off | control_off / control_on |

### 5.6 Mod Matrix akışı (RS)
- Bir encoder'a **tek** başına dokunulduğunda, parametre modüle edilebiliyorsa `Add to Matrix` aktif olur.
- Basınca parametre matrise eklenir ve **Matrix** bank'ına atlanır.
- Matrix'te `Back` → Matrix'e girmeden önceki bank.
- `Go to Amp Env / Env 2 / Env 3` → Envelopes bank'ı ilgili envelope seçili açılır; `Go to LFO 1/2` → LFOs bank'ı.
- Shift basılıyken Osc Pitch ince ayar yapar.

### 5.7 Emülatör çizim önerileri (**çıkarım**; ekran görüntüsü yok)
- **Wavetable:** seçili tablonun o anki frame'i, 1 periyot, track renginde ~2 px çizgi. `AdjustingPosition` açıkken komşu frame'leri soluk çizgiler olarak da göster.
- **Filtre:** log frekans ekseni 20 Hz–20 kHz. 12 dB için `|H| = 1/√((1−(f/fc)²)² + (f/(fc·Q))²)`, 24 dB için karesi. fc noktasında node dairesi.
- **Envelope:** 5.4'teki öğeler.
- **LFO:** seçili şeklin 1–2 periyodu.

---

## 6. SCALE ekranı (M3 s.75–76; RS `scales_component.py`, `melodic_pattern.py`)
| Konum | İçerik |
|---|---|
| Sütun 0, r1–r2 | "Layout" etiketi; büyük "3rds Seq…" gibi liste. Sıra: **4ths, 3rds, Sequential**; 1. encoder ile değişir |
| Üst butonlar 2–7 (r0) | Kök nota, beşliler çemberi: **C G D A E B** |
| Alt butonlar 2–7 (r7) | **F B♭ E♭ A♭ D♭ G♭** |
| Alt buton 1 | "**In Key** Chromatic" (seçili parlak) |
| Alt buton 8 | "Fixed off" / "Fixed on" |
| Orta alan | Scale ızgarası, **4 satır × ⌈N/4⌉ sütun**, sütun sütun dolar. Seçili scale beyaz kutu, siyah yazı. Encoder veya D-pad ile seçilir; yukarı/aşağı ±1, sol/sağ ±4 |

- Seçili kök beyaz, diğer kökler gri: "The currently selected key appears in white, while the other key options appear in gray" (Push 2 kılavuzu; M3 görüntüsü de aynı). Seçili kökün üst buton LED'i beyaz.
- M3'te görünen 24 scale, sütun sırasıyla: Major, Minor, Dorian, Mixolydian | Lydian, Phrygian, Locrian, Whole Tone | Half-whole Dim., Whole-half Dim., Minor Blues, Minor Pentatonic | Major Pentatonic, Harmonic Minor, Harmonic Major, Dorian #4 | Phrygian Dominant, Melodic Minor, Lydian Augmented, Lydian Dominant | Super Locrian, 8-Tone Spanish, Bhairav, Hungarian Minor.
- Listenin tamamı `Live.Song.get_all_scales_ordered()` fonksiyonundan geliyor. Tam içerik scale konusunda araştırılmalı.

---

## 7. MIX ekranı (M3 s.104, 126–130)
Mix butonu her basışta iki mod arasında geçiş yapar.

**Global Mix Mode**
- r0 sekmeleri: `Volumes | Pans | A Sends | B Sends | C Sends | D Sends | E Sends | →`. Seçili sekme beyaz kutu, siyah yazı; altında beyaz ayırıcı çizgi var.
- 6 veya daha fazla return track varsa en sağdaki üst buton ok olur. Volumes ve Pans hep görünür.
- r2–r5: 8 track için büyük değer + halka, track renginde ("11 L", "10 R", "16 L", "14 R", "C"). Pan halkası bipolar.
- r7: track adları; seçili track dolu kutu.
- Master butonu Master track'i gösterir.
- Volumes sekmesinin görseli M3'te yok (**doğrulanamadı**).

**Track Mix Mode**
- r0: `Mix | Input & Output`.
- Mix sütunları: **Track Volume** (stereo seviye göstergesi, 2 dikey çubuk, + "0.0 dB") | Track Panning ("5 L") | A-Reverb "-48.9 dB" | B-Delay "-65.9 dB" … Altı sütunu aşan send'ler için r0'ın sağında ← → oku.
- Input & Output sayfası:
  - Monitoring listesi: In / Auto / Off
  - I/O: büyük "Input"/"Output" + ok ikonu
  - Output Type: Master / Ext. Out / … / Sends Only
  - Output Channel: "1/2"
  - MIDI track'lerde Input Channel ve Position: Pre FX / Post FX / Post Mixer
- Rack veya Group açılınca içerdiği track'ler boyunca alt çizgi çıkar (M3 s.130).
- Lock + Solo popup'ı: "Solo: Locked".

---

## 8. CLIP ekranı (M3 s.94–100)
- r0 sol üst: **clip adı kutusu**, clip renginde. Adsızsa "MIDI Clip" / "Audio Clip"; clip yoksa "No Clip". Boş audio track'te ortada "Press ⟲ to load a sample".
- r0 devamı: `■ Loop` (2. üst buton) | `Crop` (3.) | … | sağda `Edit`. Audio clip'te ayrıca `■ Warp`.
- r1: `Zoom | Loop Position | Loop Length | Start Offset`. Audio'da ek olarak `Warp (Beats Tones Tex…) | Transpose | Gain`. Değerler "1.1.1", "4.0.0", "0.00 st", "0.00 dB" biçiminde.
- Zoom sütununda bütün clip'i temsil eden mini çubuk; ekranda görünen kısım vurgulu.
- r3–r6 zaman çizgisi: bar numaraları (1.2, 1.3, 1.4 …), loop başı/sonu üçgen bayraklar. MIDI notaları yatay çubuklar; renk = track veya Drum pad rengi, **velocity = opaklık**. Audio'da dalga formu clip renginde.
- Sequencer layout'ta: yarı saydam beyaz "sequenceable area" kutusu. Solda pitch aralığı kutusu ve nota yoğunluğu çizgileri; kalın çizgi = yoğun aralık.
- Oynatma sırasında ekran kendiliğinden kayar.
- **Note Edit** (Edit butonu veya jog wheel): r0 `Select All | Deselect All | … | Done ✓`; r1 `Zoom | Position | Nudge | Length | Pitch (Drum'da Drum Pad) | Velocity | Vel Range | Probability`.
  - Vurgulanan (highlighted) nota: beyaz çerçeve + nabız animasyonu.
  - Seçili nota: dolu beyaz.
  - Çoklu seçimde değerler aralık olarak gösterilir ("C2–C3", "92–127").

## 9. SESSION SCREEN (M3 s.132–134)
- 8 track × 8 sahne slot ızgarası.
- Dolu slot: clip renginde çubuk + clip adı ("▶ Analog v. 1"). Seçili slot beyaz çerçeveli.
- Sağ kenarda sahne numaraları 1–8; seçili sahne "▶1" hapı.
- r7 track adları.
- Sahne zaten çalıyorsa kuyruğa giren clip yeşil nabızla atar.

## 10. BROWSE (Add) ve HOT-SWAP (M3 s.23–29)
- r0: sol `X` (veya `< 1-MIDI` geri) | `□ Preview` (2. üst buton) | koleksiyon etiketi `■ Favorites` / `□ Green` (5. sütun civarı) | sağda `Packs ↗`. Hot-Swap'ta sağda `← Load` ve `Load →`.
- Gövde **3 sütunlu liste**, her sütunda 5 satır görünür:
  1. Breadcrumb: "+ Add", "Device", "Instruments"…; atalar gri, geçerli beyaz.
  2. Aktif liste: seçili satır açık gri/beyaz bar, siyah yazı; sağda `>` (alt menü) veya `+` (yükle).
  3. Sonraki alt menünün önizlemesi.
- Satır ikonları: Collections □, Sounds ♫, Drums ⠿, Instruments ◠, Audio Effects, MIDI Effects, Max For Live, Samples, Packs, User Library, Current Project.
- Navigasyon: jog wheel veya D-pad; sola itmek = geri; 1. encoder alt menüler arasında gezer.

## 11. SETUP (M3 s.8–12)
Monokrom ekran. r7 sekmeleri: `Status | Expression | Sensitivity | Audio | MIDI | Pedals & CV | Wi-Fi | Software*`. Seçili sekme ters renkli.

| Sekme | İçerik |
|---|---|
| Status | Sol blok: "Control Live" butonu, "Push is Standalone", pil "38%", "76.8 GB available", "Name Push d93-e51". Sütunlar: Display Light 100 % (halka), LED Brightness 100 % (halka), Workflow **Scene**/Clip (noktalı ızgara ikonu), Exclusive Arm **On** (dolu daire), Link Off (üstü çizili daire), □ Play Sync |
| Expression | Expression Mode: MPE / Poly Aftertouch / Mono Aftertouch (seçili büyük beyaz, diğerleri soluk). Note Pitch Bend: Automatic/On/Off. In Tune Location: Finger/Pad. In Tune Width 0–20 mm (10mm). Slide Height 10–16 mm (13mm). İkonlu |
| Sensitivity | Threshold 7, Drive +4, Compand −26, Range 38; hız eğrisi grafiği; sağ üstte Reset |
| Audio | Sample Rate listesi (44100, 48000, 88200…), Buffer Size (128…2048; varsayılan 128), 1/2 Preamp Type (Line/Inst./High) + seviye göstergeleri "0.00 dB", Outputs, □ Link 1 & 2 |
| MIDI | ■ Track □ Remote □ Sync □ MPE; I/O (Input/Output); Port adı |

## 12. Diğer menüler
- **Fixed Length** (basılı tut): r0 "Fixed Length OFF … Phrase Sync OFF"; ortada büyük "Recording Length: 2 Bars"; r7 `1 Beat | 2 Beats | 1 Bar | 2 Bars (seçili, beyaz kutu) | 4 Bars | 8 Bars | 16 Bars | 32 Bars` (M3 s.88).
- **Quantize** (basılı tut): `Swing Amount 67 %` (halka) | `Quantize To ¼ ⅛ ⅛T…` | `Quantize Amount 100 %` (halka) | `Rec. Quantize OFF` + `Quantize To 1/16 1/16T` (M3 s.92).
- **Tempo/Swing encoder:** dokunma = popup; basma = mod değiştirir; 1 BPM adım, Shift ile 0.1 BPM; swing 0–100 % arası 1 % adım (M3 s.33, 139).

---

## 13. FIG: `push3-device.svg` "LCD Display" grubu analizi

**Geometri**
- Görünür ekran: `<rect x=581 y=482 w=1222 h=220 rx=6 fill=#101010>`, clip-path `clip10_13_10919`.
- Oran **1222 : 220 = 5.5545 : 1**. 960×160 (6 : 1) ile **uyumlu değil**: aynı genişlikte 6 : 1 için yükseklik 203.67 olmalı (%7.4 fazla yükseklik). Aynı yükseklikte 6 : 1 için genişlik 1320 olmalı.
- **Hata riski:** grupta `Pixels` adlı `<rect x=553 y=447 w=1278 h=289 fill=none>` var (soft-light blend). `getBBox('LCD Display')` bu yüzden **553, 447, 1278, 289** döndürüyor; oran 4.42. `ders-push3.html` içindeki `rectFor()` fonksiyonu ve `.p3-lcd` overlay'i bu büyük kutuyu kullanıyor, yani görünür ekrandan her yönde yaklaşık 28–35 birim taşıyor. Doğru kutu `clip10` rect'i veya gruptaki ilk `<rect>`: **581, 482, 1222, 220**.

**Önerilen eşleme (uniform, genişliğe sığdır)**
```
s = 1222/960 = 1.2729167
X_svg = 581     + s·x_px
Y_svg = 490.167 + s·y_px     // (220 − 160·s)/2 = 8.167 dikey boşluk, üst ve alt
```
Figma içeriği bu şeride tam oturuyor (üst etiket 493 ≥ 490.17, alt etiket 690 ≤ 693.83) ve Push ızgarasıyla örtüşüyor:
- Grafik clip'i y 568 → **61.1 px** (tam `visualisation_top`).
- Parametre adları → r1 (25.8–35.2 px).
- Değerler → r2 (45.4–54.9 px).
- Alt etiket kutusu → r7 (139.7–157.0 px).
- Metin başlangıçları (x_px): 18.9, 139.9, 261.6, 381.8, 503.0, 624.2, 737.2, 855.7. Push'taki `lightLeft` değerleri 14, 135, 256, 377, 498, 619, 740, 861; sapma ±5 px.
- Display butonlarının aralığı 153 birim; Push'ta 121 px × s = 154.0 birim. Sütunlar butonlarla hizalı.

**İçerik** (render edilerek okundu; layer id'leri yanıltıcı, ör. "Oscillator_2" aslında "Table" yazısı)

| Öğe | Değer |
|---|---|
| Sol üst kutu | 595,493 134×22, dolgu `#0088DE`, siyah "**Wavetable**". Seçili cihaz, r0 |
| r1 adları (`#60666B`) | Oscillator · Table · Position · Filter Type · Frequency · Resonance · Mod Time · Mod Time |
| r2 değerleri (`#0088DE`) | "**1** 2 S Mix Mix Mi…" (1 mavi, diğerleri `#383E43`; 120 birim genişlikte %65–100 arası `#101010`'a solma) · "**Squarely** Stron…" · "51 %" · 4 filtre ikonu (LP mavi, HP/BP/Notch `#383E43`) · "4.0 kHz" · "0.0 %" · büyük "**26 %**" · büyük "**68 %**" |
| Sütun 0–2 görsel | "Graph": 26 noktalı yumuşak basamaklı stilize dalga; x 595–1017, y 584–644; `#0088DE`, 2 birim |
| Sütun 3–5 görsel | Stilize filtre: LP eğrisi (y 610'da düz, 659'a iner) + içi boş node (1258,653 r6) + tepe/bant eğrisi + dolu node (1365,653 r7); `#0088DE`, 2 birim |
| Sütun 6–7 halkaları | Merkez (1548.14, 614) ve (1699, 614), r = 27. İz `#383E43` 1.5, yay `#0088DE` 2.5, round cap. Açıklık altta 65°, toplam tarama **295°**, başlangıç saat 7 civarı |
| r7 etiketleri | Wavetable `#0088DE` · [**○ Pads**: `#0088DE` dolu kutu 746,668 134×22, siyah yazı; armed ikonu] · Wavetable `#D87635` · Wavetable `#1ABE40` · Vocal `#1ABE40` · FX `#B670EE` · MoogPhatty `#1ABE40` · Drum Machine `#D87635` |

**Figma'nın gerçek Push ile çelişen noktaları**
1. 8. sütunun adı RS'e göre "**Mod Amt**" olmalı; Figma iki kez "Mod Time" yazmış.
2. Oscillator listesinde "Mix Mix" dolgu metni var; gerçek değerler 1 / 2 / S / Mix.
3. Filter Type 4 ikon gösteriyor; Wavetable'da 5 tip var (Morph eksik).
4. 26 % ve 68 % için aynı yay çizilmiş. 26 % yaklaşık 77°, 68 % yaklaşık 201° taramalı.
5. "Squarely" gerçek bir tablo adı mı, doğrulanamadı.
6. r7'de track adlarının track renginde olması ve armed "○" gerçek Push 3 ile **uyumlu**. Ancak bank görünümünde r7'de sekmeler olmalı.
7. Sol üstte seçili cihazın dolu kutu olması M3 ile uyumlu.

**Ölçek karşılıkları** (s = 1.273): halka Ø 54 birim ≈ 42 px, merkez yaklaşık (759.8, 97.3) px, yani sütunun lightLeft'ine hizalı. Ad ve değer yazıları yaklaşık 13 px, büyük değer yaklaşık 27–28 px.

---

## 14. Emülatör için reçete

```js
var P3 = {
  W: 960, H: 160, COL: 121, ROW: 20,
  colX: k => 121*k + 14,  colR: k => 121*k + 100,
  rowY: r => 20*r + 1,    VIS_TOP: 61,
  toSvg: (x, y) => ({ x: 581 + 1.2729167*x, y: 490.167 + 1.2729167*y }),
  vis: {
    Main:        { wavetable: [0,2], filter: [3,5] },
    Oscillators: { wavetable: [1,3] },
    Filters:     { filter: [2,4] },
    Envelopes:   { envelope: [2,5] },
    LFOs:        { lfo: [0,3] }
  }
};
```

- Canvas 960×160 mantıksal boyutta; `devicePixelRatio` ile ölçeklenir. SVG'de 581, 490.17, 1222×203.67 kutusuna yerleştirilir; LCD'nin kalan kısmı `#000` / `#101010` dolgu.
- Ekran durum makinesi: `DEVICE (chain | bank) | MIX (global | track) | CLIP (clip | noteEdit) | SESSION | BROWSE | HOTSWAP | SCALE | SETUP(tab) | OVERLAY(fixedLength | quantize)`.
- Popup katmanı ayrı: 1–1.5 sn göster, sonra kaybolsun (süre çıkarım).
- Tasarım kuralı: CSS'te gradient yasak, ama canvas içindeki cihaz simülasyonu bu kuralın dışında. Figma'daki %65→%100 solma efekti canvas `createLinearGradient` ile yapılabilir; istenirse düz kesmeyle de olur.

## BULGULAR
- [resmi/yuksek] Push 2 ekranı 960 piksel × 160 satır, 16 bit RGB565 (B/G/R bit düzeni), 60 fps, double-buffer; 2 sn frame gelmezse ekran kararır (https://github.com/Ableton/push-interface/blob/main/doc/AbletonPush2MIDIDisplayInterface.asc)
- [ikincil/orta] Push 3 incelemesi ekranın Push 2 ile aynı olduğunu söylüyor ('While the screen is the same there are new things it can do'); buradan Push 3 = 960x160 çıkarımı yapıldı (https://www.soundonsound.com/reviews/ableton-push-3)
- [resmi/yuksek] Push 3 tech-specs sayfası ekran çözünürlüğü vermiyor (pad, işlemci, boyut ve ağırlık var) (https://www.ableton.com/en/push/tech-specs/)
- [resmi/yuksek] Push 3 Device görünümünde üst satır cihaz zincirini, alt satır track'leri gösteriyor; cihazın üst butonuna tekrar basınca parametre sekmeleri alt butonlarda açılıyor (Drift: Main, Oscillator, Filter, Envelopes, LFO, Fixed Mod, Custom Mod, Global) (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Mute'lu cihazın parametreleri ekranda gri görünür; cihaz taşırken ekranda 'Choose the position of Reverb' yazar; Track Options Rename/Group/Ungroup/Freeze/Flatten (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Tempo/Swing ve Volume encoder'ına dokunmak veya çevirmek 'Tempo: 85.00 BPM', 'Swing Amount: 35%', 'Main Output: -8.3 dB' biçiminde siyah kutulu büyük beyaz popup gösterir; Lock'ta 'Solo: Locked' (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Otomasyonlu parametrelerde değerin yanında beyaz nokta, override edilmişlerde gri nokta; armed track adının önünde daire ikonu (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Scale menüsü: üst butonlar C G D A E B, alt butonlar F B♭ E♭ A♭ D♭ G♭; en sol alt In Key/Chromatic, en sağ alt Fixed; 1. encoder Layout seçer (4ths/3rds/Sequential); scale'ler encoder veya D-pad ile seçilir (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [kod/orta] Scale ızgarası 4 satır (NUM_DISPLAY_ROWS=4); layout listesi ('4ths',3), ('3rds',2), ('Sequential',None); kök notalar beşliler çemberinden türetiliyor (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/scales_component.py)
- [resmi/yuksek] Seçili key beyaz, diğer key seçenekleri gri; seçili scale tipi vurgulanır (Push 2) (https://www.ableton.com/en/manual/using-push-2/)
- [resmi/yuksek] Global Mix sekmeleri Volumes/Pans/A–E Sends; 6+ return varsa en sağ üst buton ok olur; Track Mix'te Mix ve Input & Output sayfaları, Track Volume stereo seviye göstergesiyle (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Clip View: clip adı sol üstte (yoksa 'MIDI Clip'/'Audio Clip'/'No Clip'); ekran öğeleri clip renginde; MIDI notalarında velocity opaklık olarak; Note Edit'te vurgulu nota beyaz çerçeve + nabız, seçili nota dolu beyaz (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Setup sekmeleri Status/Expression/Sensitivity/Audio/MIDI/Pedals & CV/Wi-Fi/Software; Display Light ve LED Brightness varsayılan 100%; In Tune Width 0–20 mm, Slide Height 10–16 mm; buffer 128–2048 (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [kod/orta] Push ekran ızgarası: button_spacing=121, button_left=4, light_left=14, light_right=100, button_right=110, row_spacing=20, row_top=1, body 5–15, row_bottom=19, screen 960x160, visualisation_top=61 (https://github.com/gluon/AbletonLive11_MIDIRemoteScripts/blob/main/Push2/visualisation_settings.py)
- [kod/orta] Wavetable (InstrumentVector) Push bank'ları: Main, Oscillators, Filters, Global, Envelopes, LFOs, Matrix, MIDI; Main = Oscillator, Table, Position, Filter Type, Frequency, Resonance, Mod Time, Mod Amt; seçenekler Osc/Sub, Filter Switch, Filter, Add to Matrix (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/custom_bank_definitions.py)
- [kod/orta] Wavetable görselleştirmeleri: wavetable Main'de sütun 0–2, Oscillators'ta 1–3 (yalnız Osc 1/2 seçiliyken); filter Main'de 3–5, Filters'ta 2–4; envelope Envelopes'ta 2–5; lfo LFOs'ta 0–3; görselleştirme altındaki parametreler küçültülür (shrink_parameters) (https://github.com/gluon/AbletonLive11_MIDIRemoteScripts/blob/main/Push2/wavetable.py)
- [kod/orta] Dokunulan Wavetable parametresine göre AdjustingPosition/AdjustingFilter/AdjustingLfo bayrakları ve EnvelopeFocus (ör. Attack → AttackLine, AttackNode, DecayLine) ekrana gönderiliyor (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/device_component.py)
- [kod/orta] Ekran veri modeli: DeviceParameter {name, min, max, value, valueItems, valueItemImages, displayValue, unit, is_enabled, hasAutomation, automationActive, isActive} ve Encoder.touched alanı (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/model/__init__.py)
- [kod/orta] Wavetable enum ikonları: 5 filtre tipi, circuit Clean/OSR/MS2/SMP/PRD, routing Serial/Parallel/Split, LFO Sine/Triangle/Saw Down/Square/Random, Unison None/Classic/Shimmer/Noise/Phase Sync/Position Spread/Random, voices 2–8, Sub oktav 0/−1/−2 (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/device_parameter_icons.py)
- [kod/orta] Track rengi ekran paleti 27 RGB değer ve gölge formülleri (×0.8, ×0.5, ×0.3, ×0.3 sat−20%, sat−70%) (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/colors.py)
- [kod/yuksek] Main bank'ın görünen adı 'Main' (BANK_MAIN_KEY) (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/ableton/v2/control_surface/banking_util.py)
- [resmi/yuksek] Wavetable Push için tasarlandı: 'detailed wavetable visualisations … right from Push's display' ve mod matrix'e Push'tan atama (https://www.ableton.com/en/packs/wavetable/)
- [ikincil/orta] Ableton Sans ilk kez Push 2'de kullanıldı, yalnız Ableton arayüzleri için geliştirildi (kamuya açık değil) (https://lettersfromsweden.se/ableton/)
- [kod/yuksek] Figma LCD: ekran rect 581,482 1222×220 rx6 (oran 5.5545:1, 6:1 değil); 'Pixels' rect'i yüzünden getBBox 553,447,1278,289 döndürüyor; içerik Wavetable Main bank'ı (Oscillator/Table/Position/Filter Type/Frequency/Resonance/Mod Time/Mod Time), renkler #101010/#0088DE/#60666B/#383E43 (file:///Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] ders-push3.html rectFor() getBBox kullanıyor; .p3-lcd overlay'i LCD grubunun büyük bbox'ına (Pixels dahil) oturuyor (file:///Users/berkayer/site/ders-push3.html)
- [ikincil/orta] MusicRadar: Push 3 dokunmatik rotary'lere ve yönlü tuş işlevli jog wheel'e sahip; yeni Clip Edit modu notaları ekranda daha ayrıntılı gösteriyor (https://www.musicradar.com/reviews/ableton-push-3)

## BELIRSIZ
- Push 3'ün 960x160 çözünürlüğü resmi Push 3 spec'lerinde yok. Push 2 dokümanı ve SOS'un 'screen is the same' ifadesinden çıkarıldı.
- Push 3 standalone ve Control Mode UI kodu açık değil. Bank ve görselleştirme tanımları Push 2 script'inden (Live 11/12 decompile, resmi olmayan) alındı. Push 3 Drift ekranı bu tanımlarla birebir eşleşiyor, fakat Drift sekmesi RS'te 'LFOs', Push 3 görüntüsünde 'LFO' okunuyor; küçük farklar olabilir.
- Wavetable'ın Push 3 ekranındaki gerçek görüntüsü (wavetable dalga çizimi, AdjustingPosition'da frame yığını, filtre eğrisi, LFO/envelope stili) kılavuzda ekran görüntüsüyle yok. Figma çizimi stilize.
- Wavetable için Matrix ve MIDI bank'larının alt satırda sekme olarak görünüp görünmediği doğrulanamadı.
- Normal cihaz parametresine dokununca değerin büyütülüp ayrı gösterilmesi dokümante değil. Encoder.touched modeli var ama görsel davranış bilinmiyor.
- Ekrandaki gri tonların tam hex değerleri, font boyutları ve halka tarama açısı (Figma'da 295°) resmi olarak doğrulanamadı; ekran görüntüsünden tahmin.
- Global Mix 'Volumes' sekmesinin görseli (seviye göstergesi var mı) kılavuzda yok.
- Push 3/Live 12'deki tam scale listesi (ekran görüntüsündeki 24'ten fazla olabilir) bu konunun dışında; scale konusunda araştırılmalı.
- Wavetable 'Mod Time' (Time) ve 'Mod Amt' parametrelerinin aralıkları ve varsayılanları burada araştırılmadı (Wavetable konusu).
- Figma'daki 'Squarely' tablo adı gerçek bir Ableton wavetable adı mı, doğrulanamadı.
- Live 10 release notes'taki 'Push 2'ye Wavetable osilatör ve filtre eğrisi görselleştirmesi eklendi' ifadesi yalnız arama özetinden geldi; sayfa kesildiği için birebir doğrulanamadı.
- Push 3 kılavuzunun incelenen PDF'i 2024-11-05 tarihli; daha yeni Push yazılım sürümleri ekranı değiştirmiş olabilir.
- help.ableton.com Push 3 Technical FAQ Cloudflare korumasından dolayı okunamadı.