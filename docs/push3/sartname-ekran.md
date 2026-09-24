## 0. Yerleşim ve temel sabitler
- **Canvas:** `#p3LcdCanvas`, mantıksal boyut 960×160. SVG kutusu: `x = 581 + 1.2729167·px`, `y = 490.167 + 1.2729167·py`, yani 1222 × 203.67. LCD kutusu 581,482,1222,220 olduğundan üstte ve altta 8.17 birimlik şerit kalır; bu şeritler nötrleştirilmiş rect ile `#000` görünür.
- **Arka plan tamponu:** CSS px × DPR (en fazla 2). Çizim `ctx.setTransform(k,0,0,k,0,0)` ile yapılır, `k = cssW·dpr/960`.
- **Sütunlar:** `COL(k) = 121k+14`, `COLR(k) = 121k+100`, düğme kutusu `121k+4 … 121k+110`, çip kutusu `x = 121k+9, w = 105, h = 17`.
- **Satırlar:** `rowTop(r) = 20r+1`.
  | Satır | Baseline | Kullanım |
  |---|---|---|
  | r0 | 15 | üst düğme etiketleri, çip y=2 |
  | r1 | 34 | parametre adı |
  | r2 | 54 | küçük değer |
  | r7 | 155 | alt düğme etiketleri, çip y=140 |
  - Görselleştirme alanı y 61–139 (alt sınır VARSAYIM).
- **Renkler (tema bağımsız):**
  | Kullanım | Değer |
  |---|---|
  | Arka plan | `#000000` |
  | Parametre adı | `#8A8F93` (Figma `#60666B`, okunurluk için açıldı; VARSAYIM) |
  | Pasif liste öğesi / halka izi | `#383E43` |
  | Beyaz | `#FFFFFF` |
  | Disabled | `#3A3F44` |
  | Vurgu | seçili track rengi |
  | Monokrom sayfalarda seçili olmayan | `#6B7075` |
- **Font:** `"Instrument Sans", system-ui, sans-serif`. Ableton Sans lisanslanamaz.
  | Öğe | Ağırlık / boyut |
  |---|---|
  | Etiket, çip | 600 12px |
  | Ad | 500 13px |
  | Küçük değer | 600 13px |
  | Büyük değer | 500 26px |
  | Popup | 500 28px |
  - İlk çizimden önce `document.fonts.load('600 13px "Instrument Sans"')` beklenir, sonra `invalidate()` çağrılır.
- **Metin taşması:** sütun genişliğinde (104 px) sert kesilir, "…" eklenmez. M3'teki "1-Instrumen" örneğiyle aynı davranış.

## 1. Bileşenler
- **Çip (seçili etiket):**
  - Dolgu track rengi, metin siyah, x = `COL(k)`.
  - Mix ve Setup sekmelerinde dolgu beyaz.
- **Normal parametre slot'u:**
  - r1'de ad.
  - Büyük değer 26px, baseline 68, x = `COL(k)`.
  - Halka: merkez `(COL(k)+21, 97)`, r = 21.
    - İz: `#383E43`, 1.5px.
    - Yay: track rengi, 2.5px, round cap.
    - Boşluk altta 65°, toplam tarama 295°. Başlangıç `a0 = 122.5°` (canvas açısı, saat yönünde, 0 = +x).
    - Unipolar: `a0 → a0 + 295·f`.
    - Bipolar: tepe `270° ± 147.5·f`.
- **Küçültülmüş slot (görselleştirmenin altındaki sütun):** r1'de ad, r2'de küçük değer (track rengi). Halka yok.
- **Enum (yatay liste):**
  - r2'de küçük metinler, aralık 8 px.
  - Seçili öğe track rengi, diğerleri `#383E43`.
  - Sütun sağında kesilir.
  - `Oscillator` Main bankında ve 1/2 seçiliyken `1 2 S Mix` listesi olarak çizilir; diğer bank ve durumlarda ikon listesi.
- **İkon enum:** 16×10 px, kendi vektör çizimimiz.
  - Filtre: LP, HP, BP, Notch, Morph (LP+HP üst üste).
  - LFO: sine, triangle, saw down, square, random.
  - Diğer: routing, loop, unison, osc (1/2/S/Mix).
  - Seçili track rengi, diğerleri `#383E43`.
- **Disabled:** ad ve değer `#3A3F44`.
- **Dokunulan encoder:** adı `#FFFFFF`.

## 2. DEVICE: zincir görünümü (varsayılan)
- **r0:**
  - sütun 0 çip: `Wavetable` (synth) veya `Drum Rack` (drum).
  - sütun 1–7 boş (zincirde tek cihaz var).
- **r1–r6:** seçili bank. Başlangıçta Main.
- **r7:**
  - track adları, seçili track çipte.
  - Diğer adlar kendi track renginde.
  - Kayıt için arm'lı track adının önünde `○` (daire, 5 px).

## 3. DEVICE: bank görünümü (upper:1)
- **r0:** sütun 0 `< Wavetable`, sütun 1–7 = options. Option `i` (upper `i+1`) → sütun `i`.
  - Toggle option: `Osc On` / `Sub On` (VARSAYIM biçim).
  - Switch option: iki kelime, seçili olan beyaz.
- **r7:** 8 bank sekmesi `Main | Oscillators | Filters | Global | Envelopes | LFOs | Matrix | MIDI & MPE`. Seçili sekme çipte.
- **Kapatma:** tekrar upper:1 (VARSAYIM) → zincir görünümü.
- **Bankalar** (Enc 1–8; `/` = seçime bağlı):
  | Bank | Enc 1–8 | Options | Görselleştirme |
  |---|---|---|---|
  | Main | Oscillator · Table/Gain/Gain 1 · Position/Tone/Gain 2 · Filter Type · Frequency · Resonance · Mod Time · Mod Amt | 2 `Osc`/`Sub`, 4 Filter Switch `1 2`, 8 Add to Matrix | wavetable sütun 0–2 (yalnız osc 1/2), filter sütun 3–5 |
  | Oscillators | Oscillator · Category/Gain/Pitch 1 · Table/Tone/Pitch 2 · Position/Octave/Octave Sub · Pitch/—/Gain 1 · Effect Type/—/Gain 2 · (Classic Pulse Width, Modern Warp, FM Pitch) · (Sync, Fold, Amount / Gain Sub) | 2 Osc/Sub, 8 Add | wavetable sütun 1–3 |
  | Filters | Filter `1 2` · Filter (On) · Type · Frequency · Resonance · Circuit (LP/HP → 5, diğerleri → 2) · Morph/Drive/— · Routing | 3 Slope `12dB 24dB`, 8 Add | filter sütun 2–4 |
  | Global | Mono · Glide/Poly Voices · Unison Mode · Unison Voices · Unison Amount · Transpose · — · Volume | 8 Add | — |
  | Envelopes | Envelopes · Envelope View · Attack/Attack Slope/Initial · Decay/Decay Slope/Peak · Sustain · Release/Release Slope/Final · Loop Mode · — | 8 Add | envelope sütun 2–5 |
  | LFOs | LFO · Type · Shape · Rate/S. Rate · Amount · Attack · Phase Offset · Retrigger | 4 Sync `Hz Sync`, 8 Add | lfo sütun 0–3 |
  | Matrix (Faz 2) | Mod Target · (hedefin kendi adı) · — · Amp Envelope · Envelope 2 · Envelope 3 · LFO 1 · LFO 2 (−100..+100 %, bipolar halka) | 2 Back, 4–8 Go to … | — |
  | MIDI & MPE (Faz 2) | Mod Target · (hedef) · Velocity · Key · Note PB/PB Range · Pressure · Slide/Mod Wheel · Random | 2 Back, 5 Expression `MPE Mono/Poly` | — |
- **Main bankı + Filter 2 durumu:** Enc 4'te `Flt 2 Type` gösterilir. Gerçek cihazda bu slot boş olabilir; bu fark "düzeltilmiş davranış" olarak not edilir.

## 4. Görselleştirmeler (y 61–139)
Aralık hesabı: `x0 = COL(i)`, `x1 = COLR(j)`.
- **wavetable** (Main 14–342, Oscillators 135–463):
  - Merkez y = 100, genlik ±34.
  - Görünen kare: `disp` içinden, efektif pos'ta, kareler arası interpolasyonla 160 nokta. Efektif pos, meter mesajındaki `pos1/pos2`'den gelir; nota yoksa taban pos kullanılır.
  - Çizgi 2px track rengi.
  - `AdjustingPosition` (Position/Table'a dokunulmuşken): ±0.06 aralıklarla 3+3 komşu kare, 1px, %35 alfa.
  - Osc kapalıysa çizgi `#3A3F44`.
- **filter** (Main 377–705, Filters 256–584):
  - x ekseni log: `x0 + (x1−x0)·log(f/20)/log(1000)`.
  - y: `84 − dB·1.1`, 61–139 arasına kırpılır.
  - Analitik SVF yanıtı, w = f/fc, 96 nokta:
    | Tip | Formül |
    |---|---|
    | LP | `1/√((1−w²)²+(kw)²)` |
    | HP | `w²/…` |
    | BP | `kw/…` |
    | Notch | `|1−w²|/…` |
    | 24 dB | iki kademenin çarpımı |
    | Morph | komşu tipler arasında karışım |
  - Routing: Serial → çarpım; Parallel → iki eğri de çizilir.
  - Seçili filtre 2px ve dolu node (r4, fc noktasında); diğeri 1px, %40, içi boş node.
  - `AdjustingFilter` açıkken 2.5px.
- **envelope** (256–705):
  - Genişlikler `t^(1/3)` ile sıkıştırılır; Sustain sabit 0.18W.
  - y: seviye 0 → 135, seviye 1 → 66.
  - Slope eğrisi segment başına 24 noktayla çizilir.
  - Her zaman çizilir: Attack/Decay/Sustain/Release çizgileri.
  - Dokunulan parametrenin öğeleri 2.5px %100, diğerleri 1.5px %55; node'lar r3.
    | Dokunulan | Vurgulanan öğeler |
    |---|---|
    | Attack | AttackLine, AttackNode, DecayLine |
    | Decay | DecayLine, DecayNode, SustainLine |
    | Sustain | Decay, SustainLine, SustainNode, ReleaseLine |
    | Release | ReleaseLine, ReleaseNode |
    | Initial | InitNode, AttackLine |
    | Peak | Attack, AttackNode, Decay |
    | Final | Release, ReleaseNode |
- **lfo** (14–463):
  - 2 periyot, `P3.wtp.lfoShape` fonksiyonuyla.
  - Genlik `34·Amount`; Attack'ta başta rampa.
  - Random: periyot başına 8 deterministik basamak.
  - `AdjustingLfo` açıkken 2.5px.

## 5. Drum Rack cihaz sayfası (Faz 1, emülatör sadeleştirmesi, VARSAYIM)
- r0: `Drum Rack` çipi.
- Sütun 0–3: seçili pad için `Pad` (`C1 Kick`, enum), `Volume` (dB), `Pan`, `Transpose` (±24 st, playbackRate ile).
- Sütun 4–7 boş.
- r7: track'ler.

## 6. SCALE menüsü (monokrom)
- **r0:**
  - Sütun 1–6: `C G D A E B`. Seçili kök `#FFFFFF`, diğerleri `#6B7075`.
  - Sütun 0 ve 7 boş (Tuning yok).
- **r7:**
  - Sütun 0: `In Key` (x=COL(0)) ve `Chromatic` (x=COL(0)+42), 11px. Seçili beyaz.
  - Sütun 1–6: `F B♭ E♭ A♭ D♭ G♭`.
  - Sütun 7: `Fixed On` / `Fixed Off`. On ise beyaz.
- **Sütun 0 (Layout):**
  - r1: `Layout` (ad rengi).
  - Baseline 54 / 74 / 94: `4ths`, `3rds`, `Sequential`. Seçili 15px beyaz, diğerleri `#6B7075`.
- **Gam ızgarası:**
  - 4 satır × 6 görünür sütun (sütun k = 1..6).
  - Hücre: `x = 121k+9`, `y = 41+20i` (i = 0..3), `w = 105`, `h = 18`. Metin 12px, baseline `y+13`.
  - Seçili hücre beyaz dolgu, siyah metin. Diğerleri `#8A8F93`.
  - Liste sütun sütun dolar (9 sütun, son sütunda 3 öğe).
  - Kaydırma: `sc = floor(idx/4)`, `c0 = clamp(c0, sc−5, sc)`, `c0 ∈ [0,3]` (VARSAYIM).

## 7. Popup katmanı
- **Kutu:** `x = 12, y = 46, h = 68, w = metinGenişliği+48` (en fazla 936). Dolgu `#000`, 1px `#FFFFFF` kenar.
- **Metin:** 28px beyaz, x = 36, baseline 90.
- **Süre:** son güncellemeden 1500 ms sonra kapanır (VARSAYIM).
- **Metinler:**
  | Durum | Metin | Kaynak |
  |---|---|---|
  | Tempo | `Tempo: 120.00 BPM` | M3 |
  | Swing | `Swing Amount: 35%` | M3 |
  | Volume | `Main Output: -10.0 dB`, `Headphones: …`, `Main Track: …`, `Cue: …` | Main M3; diğer hedefler VARSAYIM |
  | Oktav | `Play C1 to C5` | Push 2 metni, VARSAYIM |
  | Layout | `Melodic: 64 Notes` / `Melodic: Sequencer` / `Melodic: Sequencer + 32 Notes` / `Drums: Loop Selector` / `Drums: 16 Velocities` / `Drums: 64 Pads` | drum metinleri VARSAYIM |
  | Kilit | `Solo: Locked` | M3 |
  | Kayıt | `Saved` | — |
  | Desteklenmeyen işlev | `Not in this simulator` | — |

## 8. Diğer sayfalar
- **Learn (kendi tasarımımız):**
  - r0: sayfa başına 8 bölüm kısaltması. Tamamlanan bölümlerde `✓`.
  - Sayfa 1: 0–7, sayfa 2: 8–10. Geçiş: Page ◀▶ veya jog.
  - r2–r4: seçili bölümün TR/EN başlığı (26px) ve `3/6` ilerlemesi.
  - Başlatma: upper düğmesi. Çıkış: Learn'e tekrar basma veya jog'u sola itme.
- **Açılış ekranı (kendi tasarımımız):** ortada `Push 3` (26px beyaz), altında `Pad Lab simülatörü` (13px gri). 1 sn gösterilir. Logo kullanılmaz.
- **Count-in çubuğu:** y 0–3, soldan sağa beyaz dolgu, her vuruşta yanıp söner.
- **Fixed Length (Faz 2):**
  - r0: sütun 0 `Fixed Length On/Off`, sütun 7 `Phrase Sync On/Off` (upper:1 ve upper:8, VARSAYIM).
  - Orta: `Recording Length: 2 Bars` 26px, x = COL(1), baseline 82.
  - r7: `1 Beat, 2 Beats, 1 Bar, 2 Bars, 4 Bars, 8 Bars, 16 Bars, 32 Bars`; seçili beyaz çipte.
- **Quantize (Faz 2, konumlar VARSAYIM):**
  - Sütun 0: `Swing Amount` (halka).
  - Sütun 1–2: `Quantize To` listesi `1/4 1/8 1/8T 1/8+T 1/16 1/16T 1/16+T 1/32`.
  - Sütun 3: `Quantize Amount` (halka, varsayılan 100 %).
  - Sütun 5: `Rec. Quantize On/Off` (upper:6), sütun 6: rec değeri.
- **Metronome (Faz 2):**
  - Sütun 0: `Count-In` (None / 1 Bar / 2 Bars / 4 Bars).
  - Sütun 1: `Sound` (Classic / Click / Wood).
  - Sütun 2: `Rhythm` (Auto).
  - Sütun 3: `Time Sig.` 4/4 (salt okunur).
- **Step düzenleme (Faz 2):** step basılı tutulunca sütun 0–5'te `Nudge | Length | Fine | Velocity | Vel Range | Probability` (VARSAYIM konum). Farklı değerler `92–127` biçiminde aralık olarak gösterilir.
- **Mix (Faz 2):**
  - r0 sekmeleri: `Volumes | Pans`, beyaz çip.
  - Track başına büyük değer ve halka (pan bipolar).
  - r7: track'ler.
- **Session Screen (Faz 2):**
  - Satır r0–r6, slot `x = 121k+6, y = 20r+2, w = 108, h = 16`.
  - Dolu slot: clip rengi, 11px siyah ad. Çalıyorsa `▶` + pulse; kuyruktaysa yeşil blink.
  - Seçili slot 1px beyaz çerçeve.
  - r7: track'ler.
- **Faz 3:** Setup (monokrom, r7 sekmeleri `Status | Expression | Sensitivity | Audio`), Clip ve Note Edit, Browse/Hot-Swap.

## 9. Çizim politikası
- Tam çizim yalnız `invalidate()` çağrıldıktan sonraki rAF'te yapılır.
- Animasyon (count-in, pulse, popup süresi, meter pos) varsa 30 fps; yoksa 0 fps.
- Fontlar hazır olmadan çizim yapılmaz.