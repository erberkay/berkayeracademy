# KONU 5: Ableton Wavetable (Live 12) ve Push 3 parametre bankaları

## 0. Kaynaklar ve sürüm notu (önce bunu oku)

**Hangi kaynağı nereden aldım:**
- **Resmi metin:** Live 12 Reference Manual, bölüm 31.13 "Wavetable". Bu bölümde sayısal aralık **yok**. İsimleri, davranışları ve "multiplicative/additive" kurallarını buradan aldım.
- **Kesin aralık ve varsayılanlar:** Kullanıcının makinesinde **Ableton Live 12 Suite 12.4.6** (2026-09-10 build) kurulu. Oradan salt-okunur olarak şunları çıkardım:
  - `…/App-Resources/Core Library/Defaults/Instruments/Wavetable.adv`: Live'ın **init (varsayılan) Wavetable preset'i**. gzip içinde XML; her parametre için `Manual` ve `MidiControllerRange Min/Max` değerleri var.
  - 269 fabrika preset'i (`Core Library/Devices/Instruments/Wavetable/**.adv`): enum dağılımlarını ve modülasyon kaynağı sırasını bunlardan çıkardım.
  - `…/Builtin/Samples/Vector/Sprites/*.wav`: fabrika wavetable dosyaları.
- **Push 3 bankaları için ana kaynak:** `…/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/`. Bu, **Push 3 control-mode script'i** (Live 12.4.6 içinde gelen, derlenmiş Python 3.11 .pyc). Şu dosyaları bellekte disassemble ettim:
  - `custom_bank_definitions.pyc`
  - `wavetable.pyc`
  - `device_parameter_icons.pyc`
  - `parameter_mapping_sensitivities.pyc`
  - Dosyalara yazma yapılmadı.
- **Karşılaştırma için:** gluon/AbletonLive12_MIDIRemoteScripts deposundaki `Push2/custom_bank_definitions.py`. Bu Live 12.0 dönemi (2024-03), yani **eski** bir sürüm. Push 3 ile Push 2 farkı §8'de.

**Önemli bulgu:** Ableton'ın ayrı, public bir "Push parameter banks" dokümanı bulunamadı. Bankaların tek kesin kaynağı Ableton'ın kendi script'i; aşağıdaki banka tabloları doğrudan oradan geliyor.

**Lisans uyarısı:** Wavetable WAV'ları, Push ikonları ve .pyc dosyaları Ableton'ın telifli içeriğidir. Siteye **kopyalanmamalı**. Tabloları ve ikonları kendin üret (bkz. §3.4).

---

## 1. Mimari ve sinyal akışı (Live 12 manual)

```
Osc 1 (wavetable + FX) ─┐
Osc 2 (wavetable + FX) ─┼─► [Filter Routing: Serial | Parallel | Split] ─► Filter 1 / Filter 2 ─► Amp (Amp Env × Volume) ─► out (stereo)
Sub Osc (sine+Tone)    ─┘
Mod kaynakları: Amp Env, Env 2, Env 3, LFO 1, LFO 2, MIDI (Velocity, Note, Pitch Bend, Aftertouch, Mod Wheel, Random), MPE (Note PB, Slide, Press)
```

**Routing:**

| Routing | Davranış |
|---|---|
| Serial (0) | Tüm osilatörler Filter 1'e gider, Filter 1 de Filter 2'ye. Sub her iki filtreye gider. |
| Parallel (1) | İki ana osilatör hem Filter 1'e hem Filter 2'ye gider. Sub her ikisine gider. |
| Split (2) | Osc 1 → Filter 1, Osc 2 → Filter 2. Sub yarı yarıya bölünür. Filtrelerden biri kapalıysa ilgili osilatör yine de duyulur. |

**Oscillator kalitesi:** Modülasyon yokken ham osilatör çıkışı "perfectly band-limited", yani aliasing üretmiyor.

**Hi-Quality modu (context menu):**
- Kapalıyken modülasyon **her 32 sample'da bir** hesaplanır ve filtrelerin low-power sürümleri kullanılır. Yaklaşık %25 CPU tasarrufu sağlar.
- Live 11.1'den beri yeni Wavetable'da **varsayılan kapalı** (init preset'te `HiQ=false`).
- Emülatör önerisi: control-rate = 32 sample. Web Audio'nun 128-sample'lık render quantum'u içinde 4 güncelleme yapılır.

---

## 2. Tam parametre listesi

**Sütunların anlamı:**
- **Push/LOM adı:** Live 12.4'te `device.parameters[].name`.
- **XML:** `.adv` içindeki etiket.
- **İç aralık:** XML'deki Min..Max.
- **Gösterim:** UI birimi. "(ç)" işaretliler çıkarımdır.
- **Init:** `Defaults/Instruments/Wavetable.adv` değeri.
- **Mod hedef adı:** Matrix'te görünen isim.
- **Mod tipi:** A = additive, M = multiplicative. Manual'da açıkça "multiplicative" denenler M olarak işaretlendi, gerisi A.

### 2.1 Osc 1 / Osc 2 (N = 1, 2)

| Push/LOM adı | XML | İç aralık | Gösterim | Init Osc1 / Osc2 | Mod hedef adı |
|---|---|---|---|---|---|
| Osc N On | Voice_OscillatorN_On | bool | On/Off | **On / Off** | – |
| Osc N Category | (LOM `oscillator_N_wavetable_category`) | enum | kategori adı | Basics / Basics | – |
| Osc N Table | `SpriteNameN` + LOM `oscillator_N_wavetable_index` | enum | tablo adı | **Basic Shapes / Basic Shapes** | – |
| Osc N Pos | Voice_OscillatorN_Wavetables_WavePosition | 0..1 | 0–100 % | 0 / 0 | `Osc N Pos` (A) |
| Osc N Transp (UI: "Semi") | Voice_OscillatorN_Pitch_Transpose | **−24..+24** (tamsayı) | st | 0 / 0 | `Osc N Pitch` (A) |
| Osc N Detune (UI: "Det") | Voice_OscillatorN_Pitch_Detune | **−0.5..+0.5** st | **±50 ct** | 0 / 0 | (`Osc N Pitch`) |
| Osc N Pitch (Push sanal parametresi) | Transp + Detune | −24.5..+24.5 st | ondalıklı st | 0 | `Osc N Pitch` |
| Osc N Effect Type | Voice_OscillatorN_Effects_EffectMode | **0 None, 1 Fm, 2 Classic, 3 Modern** | – | **3 Modern / 0 None** | – |
| Osc N Effect 1 | …_Effects_Effect1 | **−1..+1** | ±100 % | 0 / 0 | mode'a göre isim alır (bkz. §2.2) |
| Osc N Effect 2 | …_Effects_Effect2 | **0..1** | 0–100 % | 0 / 0 | mode'a göre isim alır |
| Osc N Pan | Voice_OscillatorN_Pan | −1..+1 | 50L..C..50R (ç) | 0 / 0 | `Osc N Pan` (A) |
| Osc N Gain | Voice_OscillatorN_Gain | 0..1 lineer genlik | dB, −inf..0 dB (ç) | **1 (=0 dB)** / 1 | `Osc N Gain` |

Ek alanlar: `UseRawUserWavetableN` (Raw modu, bool, init false).

**Tuning notu (manual):** Semi ve Detune, global Transpose'a görelidir.

**Push davranışı:** Push'ta Transp ve Detune tek bir **"Pitch"** encoder'ında birleşir (`PitchParameter`).
- Normal çevirme: yarım ton adımları.
- **Shift basılıyken:** ince ayar (`adjust_finegrain`). Push 11 release notes, ince değerlerin de gösterildiğini doğruluyor.
- Encoder hassasiyeti: normal 10.0, fine 0.4.

### 2.2 Oscillator efektleri (Effect Type'a göre 2 parametre)

| Effect Type | Effect 1: Live UI / Push adı / mod hedefi | Effect 2: Live UI / Push adı / mod hedefi | Anlam (manual ve SOS) |
|---|---|---|---|
| None (0) | – / – / `Osc N FX 1` | – / – / `Osc N FX 2` | Efekt yok. Push'ta bu iki slot **boş** kalır. |
| Fm (1) | Tune / **"Pitch"** / `Osc N FM Pitch` | Amt / **"Amount"** / `Osc N FM Amt` | Gizli modülatör osilatör. Tune ±50 % = modülatör ±1 oktav, ±100 % = ±2 oktav. Aradaki değerler inharmonik. |
| Classic (2) | PW / **"Pulse Width"** / `Osc N PW` | Sync / **"Sync"** / `Osc N Sync` | PW **her** wavetable'a uygulanabilir. Sync'te gizli osilatör, duyulan osilatörün fazını resetler. SOS: 100 % = iki oktav. |
| Modern (3) | Warp / **"Warp"** / `Osc N Warp` | Fold / **"Fold"** / `Osc N Fold` | Warp pulse width'e benzer. Fold wavefolding'dir. |

Manual: iki efekt parametresinin değeri efekt tipi değişince **korunur**.

Emülatör formül önerileri (çıkarım):
- FM oranı = 2^(2·tune).
- Sync'te duyulan osilatör frekansı = f·2^(2·sync), her master periyodunda faz resetlenir.

### 2.3 Sub oscillator

| Adı | XML | İç aralık | Gösterim | Init | Mod hedefi |
|---|---|---|---|---|---|
| Sub On | Voice_SubOscillator_On | bool | – | **Off** | – |
| Sub Gain | Voice_SubOscillator_Gain | 0..1 | dB | **0.5011875 (= −6.0 dB)** | `Sub Gain` |
| Sub Tone | Voice_SubOscillator_Tone | 0..1 | 0–100 % | 0 | `Sub Tone` |
| Sub Transpose (UI: Octave) | Voice_SubOscillator_Transpose | **0..2**: 0 = 0 oct, 1 = −1 oct, 2 = −2 oct | ikon: `wavetable_octave_0/_minus_1/_minus_2` | **1 (−1 oct)** | – |

- Tone 0 % = saf sinüs; açtıkça harmonik eklenir.
- Sub'ın perdesi = çalınan nota + global Transpose.

### 2.4 Filter 1 / Filter 2

| Push/LOM adı (12.4) | XML | İç aralık | Gösterim | Init F1 / F2 | Mod hedefi |
|---|---|---|---|---|---|
| Flt N On | Voice_FilterN_On | bool | – | **On / Off** | – |
| Flt N Type | Voice_FilterN_Type | **0 Lowpass, 1 Highpass, 2 Bandpass, 3 Notch, 4 Morph** | ikon | **0 Lowpass / 1 Highpass** | – |
| Flt N LP/HP (circuit) | Voice_FilterN_CircuitLpHp | **0 Clean, 1 OSR, 2 MS2, 3 SMP, 4 PRD** | ikon | 0 / 0 | – |
| Flt N BP/NO/MO (circuit) | Voice_FilterN_CircuitBpNoMo | **0 Clean, 1 OSR** | ikon | 0 / 0 | – |
| Flt N Slope | Voice_FilterN_Slope | **0 = 12 dB, 1 = 24 dB** | "12dB"/"24dB" | 0 / 0 | – |
| Flt N Freq | Voice_FilterN_Frequency | **20 Hz .. 20480 Hz** (tam 10 oktav) | Hz/kHz | **20480 / 20** (ikisi de tamamen açık) | `Filter N Freq` |
| Flt N Res | Voice_FilterN_Resonance | **0..1.25** | 0–125 % (ç) | 0 / 0 | `Filter N Res` |
| Flt N Drive | Voice_FilterN_Drive | **0..24** | dB | 0 / 0 | `Filter N Drive` |
| Flt N Morph | Voice_FilterN_Morph | 0..1 | 0–100 % | 0 / 0 | `Filter N Morph` |
| Filter Routing | Voice_Global_FilterRouting | **0 Serial, 1 Parallel, 2 Split** | ikon | **0 Serial** | – |

**Circuit uygunluğu (manual):**
- Clean ve OSR tüm filtre tiplerinde kullanılabilir.
- MS2, SMP ve PRD sadece LP/HP'de var.
- Clean, EQ Eight ile aynı filtre.

| Circuit | Yapısı (manual) |
|---|---|
| OSR | State-variable, hard-clip diyotla rezonans sınırlı |
| MS2 | Sallen-Key, soft clip |
| SMP | Custom (MS2 ile PRD arası) |
| PRD | Ladder, rezonans limiti yok |

**Drive:**
- Manual'a göre LP/HP/BP'de ve circuit Clean dışındaysa aktif.
- Push script'i Notch + non-Clean durumunda da Drive'ı gösteriyor. Manual ile küçük bir fark var.

**Morph filtresi:** Morph 0→1 boyunca sırasıyla LP → BP → HP → Notch → LP arasında sürekli geçer.

**Mod hedefi isim uyuşmazlığı:** Matrix hedef adları hâlâ eski formda (`Filter 1 Freq`). Push/LOM parametre adları ise 12.4'te `Flt 1 Freq`.

### 2.5 Envelope'lar (Amp, Env 2, Env 3)

| Adı | XML | İç aralık | Init | Mod hedefi |
|---|---|---|---|---|
| Amp/Env N Attack | …Times_Attack | **0..20 s** | **0.001 s (1 ms)** | `Amp Attack` / `Env N Attack` |
| … Decay | …Times_Decay | **0.0015..20 s** | **0.6 s** | ✓ |
| … Release | …Times_Release | **0.0015..20 s** | **0.6 s** | ✓ |
| … A/D/R Slope | …Slopes_Attack/Decay/Release | **−1..+1** (±100 %) | **A 0, D 0.5, R 0.5** | – (slope'lar mod hedefi değil) |
| Amp Sustain | AmpEnvelope_Sustain | 0..1 | **0.50118756 (= −6 dB; dB gösterimi ç)** | `Amp Sustain` (**M**) |
| Env 2/3 Initial | Values_Initial | 0..1 | 0 | `Env N Initial` (**M**) |
| Env 2/3 Peak | Values_Peak | 0..1 | 1 | ✓ |
| Env 2/3 Sustain | Values_Sustain | 0..1 | 0.5 (50 %) | ✓ (M) |
| Env 2/3 Final | Values_Final | 0..1 | 0 | ✓ |
| Loop Mode | …LoopMode | **0 None, 1 Trigger, 2 Loop** | 0 | – |

**Envelope davranışı (manual):**
- Amp envelope'ta Initial, Peak ve Final **yok**.
- Slope > 0: segment başta hızlı, sonra yavaş ilerler.
- Slope < 0: uzun süre düz kalır, sonda hızlanır.
- Slope 0: lineer.
- None: Note Off'a kadar Sustain'de bekler.
- Trigger: Note On'da tüm segmentleri bir kez çalar.
- Loop: tüm envelope'u Sustain'de beklemeden, ses bitene kadar döngüler.

Slope formülü önerisi (çıkarım): segment ilerlemesi t∈[0,1] için
- s > 0: y = 1 − (1 − t)^(1 + 4s)
- s < 0: y = t^(1 + 4|s|)
- değer = başlangıç + (hedef − başlangıç) · y

### 2.6 LFO 1 / LFO 2

| Adı (Push/LOM) | XML | İç aralık | Init | Mod hedefi |
|---|---|---|---|---|
| LFO N Shape (dalga tipi; Push'ta "Type") | Lfo N_Shape_Type | **0 Sine, 1 Triangle, 2 Saw, 3 Square, 4 Random** | 0 Sine | – |
| LFO N Shaping (Push'ta "Shape") | Shape_Shaping | −1..+1 | 0 | `LFO N Shaping` |
| LFO N Amount | Shape_Amount | 0..1 | **1 (100 %)** | `LFO N Amount` (**M**) |
| LFO N Phase Offset | Shape_PhaseOffset | **0..360°** | 0 | **modüle edilemez** |
| LFO N Sync | Time_Sync | **0 = Hz (Free), 1 = Tempo** | 0 | – |
| LFO N Rate | Time_Rate | **0.01..30 Hz** | **1.00 Hz** | `LFO N Rate` |
| LFO N S. Rate | Time_SyncedRate | **0..21** (22 adım) | **15** | (`LFO N Rate`) |
| LFO N Attack Time | Time_AttackTime | 0..20 s (fade-in) | 0 | – |
| LFO N Retrigger | Lfo N_Retrigger | bool | **On** | – |

**Shaping'in dalga tipine göre anlamı (manual):**
- Sine ve Saw: artan/azalan slope.
- Triangle: Ramp ↔ Saw arası simetri, ortada Triangle.
- Square: pulse width.
- Random: uç değerlerin dağılımı.

**Diğer LFO davranışları:**
- Live 12 notu: Retrigger kapalıysa LFO'lar transport'a senkronlanır.
- Synced-rate etiketleri doğrulanamadı; önerilen liste §9'da.

### 2.7 Matrix (global mod kontrolleri)

| Adı | XML | Aralık | Init | Mod hedefi |
|---|---|---|---|---|
| Time (Push: "Mod Time") | Voice_Modulators_TimeScale | −1..+1 (±100 %) | 0 | `Time` |
| Global Mod Amount (Push: "Mod Amt") | Voice_Modulators_Amount | **0..2 (0–200 %)** | 1 (100 %) | `Global Mod Amount` (**M**) |

- **Time:** negatif değer tüm envelope ve LFO'ları hızlandırır, pozitif yavaşlatır.
- **Global Mod Amount:** tüm kaynakların genel modülasyon miktarı.

### 2.8 Global / Voice / Unison

| Adı | XML | Aralık | Init | Mod hedefi |
|---|---|---|---|---|
| Transpose | Voice_Global_Transpose | **−48..+48 st** | 0 | `Pitch` (global pitch) |
| Volume | Volume | 0..1 lineer | **0.3548134 (= −9.0 dB) (ç)** | `Amp` (**M**, manual'da Volume multiplicative) |
| Mono On (LOM `mono_poly`: 0 Mono, 1 Poly) | MonoPoly | enum | **1 Poly** | – |
| Poly Voices | PolyVoices | index → **2, 3, 4, 5, 6, 7, 8, 16** | **index 6 = 8 ses** | – |
| Glide | Voice_Global_Glide | 0..20 (birim muhtemelen s, ç) | 0 | `Glide` |
| Unison Mode | Voice_Unison_Mode | **0 None, 1 Classic, 2 Shimmer, 3 Noise, 4 Phase Sync, 5 Position Spread, 6 Random Note** | **0 None** | – |
| Unison Voices | Voice_Unison_VoiceCount | **2..8** (gerçek sayı) | **3** | – |
| Unison Amount | Voice_Unison_Amount | 0..1 | **0.3** | `Unison Amount` (**M**) |

**Ses sayısı:**
- 16 poly voice seçeneği Live 12'de eklendi.
- Glide yalnız Mono'da etkin. Poly Voices yalnız Poly'de etkin.
- Mono modunda envelope'lar legato çalışır.

**Unison modları (manual):**

| Mod | Davranış |
|---|---|
| Classic | Eşit aralıklı detune, alternatif pan |
| Shimmer | Rastgele pitch jitter + az wavetable offset |
| Noise | Shimmer'ın çok hızlısı |
| Phase Sync | Classic gibi, ama Note On'da fazlar senkron (phaser benzeri) |
| Position Spread | Wavetable pozisyonları Amount kadar eşit yayılır + az detune |
| Random Note | Her notada pozisyon ve detune rastgele |

İç enum adlarında Shimmer = `slow_shimmer`, Noise = `fast_shimmer`.

**CPU notu:** Toplam ses sayısı = nota × aktif osilatör × unison voices.

### 2.9 MIDI ve MPE mod kaynakları

- **Velocity:** notanın süresi boyunca sabit.
- **Note:** C3 (MIDI 60) merkezli. Filter Freq'e **%100** atanınca filtre notayı birebir izler.
- **Pitch Bend, Aftertouch, Mod Wheel:** standart MIDI kontrolleri.
- **Random:** her Note On'da yeni rastgele değer.
- **MPE tab** (Live 11+): Velocity, **Note PB** (per-note pitch bend), **Slide** (per-note Y ekseni), **Press** (per-note aftertouch).

---

## 3. Wavetable kütüphanesi (Live 12.4.6 yerel dosyalar)

### 3.1 Format
- Her tablo: **mono, 16-bit PCM, 44.1 kHz WAV**. Frame (tek periyot) = **1024 sample**. Tablo başına **en fazla 256 frame**.
- Frame sayısı tabloya göre değişir:

| Tablo | Frame sayısı |
|---|---|
| Basic Shapes | 4 |
| Harmonic Series | 7 |
| OB6 Shapes | 71 |
| White Noise | 255 |
| AEIOU | 256 |
| 256 frame'li tablo sayısı | 46 |

- **Help makalesi (user wavetable import):**
  - Dosyanın ilk birkaç saniyesi okunur (≤256 tablo), mono'ya indirilir, en az 2 tablo garanti edilir.
  - Serum dosyaları (2048 sample/tablo) 1024'e indirilir.
  - Raw kapalıysa: baştaki/sondaki sessizlik atılır, her tablonun kenarları sıfıra fade edilir, komşu tablolar arası faz farkı minimize edilir, normalize edilir.

### 3.2 Kategoriler ve tablolar (dosya adı öneki = kategori; 11 kategori, 193 tablo)

SOS, Live 10.0 için "194 tablo, 12 kategori" diyordu.

- **Basics (29):** 5th Brutal, Basic Shapes, Beating 1–5, FM Feedback, FM Fold, FM Harmonics, Galactica, Harmonic Series, No Primes, Primes, Pulse Dual, Pulse PW, Quad Saw, Saw Dual 1–3, Saw Harmonics, Saw PW Bass, Saw PW Detune, Sub 1–3, Sync Additive, Sync Digital, White Noise
- **Collection (15):** Amber, Aureolin, Beige, Charcoal, Cobalt, Copper, Graphite, Olive, Pearl, Ruby, Rust, Sapphire, Slate, Squash, Violet
- **Complex (16):** Bit Ring, Bitkart, Bitten Filter, Bitten Sync, Dubstep Organ, Kicked, Menace, Noise Manipulator, Octa Phase, Plastic Shimmer, Ring Mod, Ripped Sync, Transformations, Verbed, Void, Xmod Drive
- **Distortion (9):** Brutal Metal, Clipped Sweep, DP Fold, Freak, JN60 Bitter, Malice, Phased, Westcost Fold, Wow
- **Filter (14):** Acid Pulse, Acid Saw, Bit Sweep, Dark Throaty, Frequency FM, JUP Sweep, Modern Sweep 1–2, Nasal, Super Phased, Sweep 1–4
- **Formant (17):** AEIOU, AhOhOoh, Aligned Form, Crispy Form, Digital Ah, FOF, Gremlin, Harsh Vowel, Real Voice, Riser, Sparkle Form, Stepped Vowels, Tuvan, Unaligned Form, VOSM, Voice Harmonics, Yahie
- **Harmonics (19):** Biharmonic Steps, Buzz Bell, Crispy Sines, Crystal Shifter, Shrinking Saws, Sines 1–5, Sines Bunch, Spectral 1–3, Squarrely, Strong Seventh, Synced Sines, Transistor Saw, Transistor Square
- **Instrument (19):** Afrobeat, Beauty Vox, Bell, Digi Piano, Finger Off, Harmonica, Jazz Buzz, Marimba, Nylon Bass, Nylon Guitar, Oboe, Organ, Piano, Sarod, Sitar, Strings 1–3, Trombone
  - UI'daki etiket "Instrument" mı "Instruments" mı, doğrulanamadı.
- **Noise (23):** Applause, Bad Bits, Bitter, Broken Filter, Brown Noise, Crash, Dizzy, Formula 1, HP Noise, Helicopter, Junk 1–2, Modulated Kodiak, Pink Noise, Pouring Rain, Radio 1–2, Redux Noise, Swepdustry, Swept Noise, Vintage Noise, Vinyl Dirt Constant, Vinyl Dirt Soft
- **Retro (15):** Echoes, Harmonics 1–4, Percusive Organ, Polated, Resonant 1–2, Robotic, Sweep Pulse, Sweep Random, Sweep Saw 1–2, Wind Synth
- **Vintage (17):** BS Sync, Brds Dual Saw, JN6 Double Saws, JUN Square Stack, JUP Double Pulse, JUP SawPulse, JX10 Sync, Logue Saw, Logue Saw Dist, MG Memo, Minifilter, Miniwaves, OB6 Shapes, Sloppy Saw, Sloppy Square, Sub3 Shapes, Sys8 Comb

Oklarla gezinme: kategori sonuna gelince bir sonraki kategoriye geçer (manual).

### 3.3 Basic Shapes (init tablosu): ölçülmüş içerik
| Frame | Dalga | Doğrulama |
|---|---|---|
| 0 | sine, 0'dan başlayıp yükselir | h1 = 1.0 |
| 1 | triangle (tepe 1/4'te, dip 3/4'te) | h1 .811, h3 .090, h5 .032 (= 8/π²n²) |
| 2 | saw: 0'dan yükselir, 1/2'de +1'den −1'e sıçrar, sonra tekrar yükselir | hn ≈ 0.637/n |
| 3 | square: ilk yarı +1, ikinci yarı −1 | hn = 1.273/n, tek harmonikler |

Bu dört frame matematiksel olarak birebir üretilebilir. Ableton dosyasına gerek yok.

### 3.4 Emülatör için tablo önerisi (tasarım)
- Fabrika dosyalarını kopyalama. Her kategori için benzer karakterde **kendi** tablolarını üret:
  - additive (Harmonics)
  - PWM ve saw-dual (Basics)
  - vowel formant sentezi (Formant)
  - noise frame'leri (Noise)
- 1024 sample/frame, 2–256 frame, Float32Array tut.

---

## 4. Init patch: emülatörün "yeni Wavetable" durumu (kesin değerler)

```js
const WAVETABLE_INIT = {
  osc1:{on:true,  category:'Basics', table:'Basic Shapes', pos:0, transp:0, detune:0, effectMode:3/*Modern*/, fx1:0, fx2:0, pan:0, gain:1.0},
  osc2:{on:false, category:'Basics', table:'Basic Shapes', pos:0, transp:0, detune:0, effectMode:0/*None*/,   fx1:0, fx2:0, pan:0, gain:1.0},
  sub:{on:false, gain:0.5011875/*-6dB*/, tone:0, transpose:1/*-1 oct*/},
  filter1:{on:true,  type:0/*LP*/, circuitLpHp:0, circuitBpNoMo:0, slope:0/*12dB*/, freq:20480, res:0, drive:0, morph:0},
  filter2:{on:false, type:1/*HP*/, circuitLpHp:0, circuitBpNoMo:0, slope:0, freq:20,    res:0, drive:0, morph:0},
  routing:0/*Serial*/,
  ampEnv:{a:0.001,d:0.6,r:0.6, aSlope:0,dSlope:0.5,rSlope:0.5, sustain:0.50118756, loop:0},
  env2:{a:0.001,d:0.6,r:0.6, aSlope:0,dSlope:0.5,rSlope:0.5, initial:0,peak:1,sustain:0.5,final:0, loop:0},
  env3:{/* env2 ile aynı */},
  lfo1:{type:0/*Sine*/, amount:1, shaping:0, offset:0, sync:0/*Hz*/, rate:1.0, syncedRate:15, attack:0, retrigger:true},
  lfo2:{/* lfo1 ile aynı */},
  modTime:0, modAmount:1,
  unison:{mode:0, voices:3, amount:0.3},
  transpose:0, glide:0, volume:0.3548134/*-9dB*/, monoPoly:1/*Poly*/, polyVoicesIndex:6/*8*/, hiQ:false,
  // Init preset'teki varsayılan modülasyon bağlantıları (kaynak indeksleri §5.1):
  mods:{ 'Osc 1 Pos':{9:1.0 /*Mod Wheel 100%*/, 12:0.33 /*MPE Slide*/},
         'Osc 1 Warp':{8:0.07 /*Aftertouch/Press*/},
         'Amp':{5:0.5 /*Velocity 50%*/},
         'Pitch':{7:0.0416667 /*PB = 2 st*/, 11:1.0 /*MPE Note PB = 48 st*/} }
};
```

---

## 5. Modülasyon matrisi motoru

### 5.1 Kaynak sırası (XML'de `ModulationAmounts.0..12`, 13 kaynak)

| Index | Kaynak |
|---|---|
| 0 | Amp Env |
| 1 | Env 2 |
| 2 | Env 3 |
| 3 | LFO 1 |
| 4 | LFO 2 |
| 5 | Velocity |
| 6 | Note (Key) |
| 7 | Pitch Bend |
| 8 | Aftertouch/Pressure (MPE Press) |
| 9 | Mod Wheel |
| 10 | Random |
| 11 | MPE Note PB |
| 12 | MPE Slide |

Bu sıra çıkarımdır ama güveni yüksek:
- Init preset: Velocity→Amp idx5, PB→Pitch idx7 = 2/48, MPE Note PB→Pitch idx11 = 1.0, Mod Wheel→Osc 1 Pos idx9 = 1.0.
- 269 preset istatistiği: idx7 ve idx11 hemen hep `Pitch` hedefinde, idx5 çoğunlukla `Amp` hedefinde.

Modülasyon miktarı aralığı **−1..+1**, gösterimi ±100 %.

### 5.2 Hedef listesi (52 satır; mode'a bağlı isimler dahil)
- `Osc N Pitch`, `Osc N Pos`, mode'a göre FX isimleri (`Osc N FX 1/FX 2` | `FM Pitch/FM Amt` | `PW/Sync` | `Warp/Fold`), `Osc N Pan`, `Osc N Gain` (N = 1, 2)
- `Sub Tone`, `Sub Gain`
- `Filter N Freq/Res/Drive/Morph` (N = 1, 2)
- `Amp Attack/Decay/Release/Sustain`
- `Env N Attack/Decay/Release/Initial/Peak/Sustain/Final` (N = 2, 3)
- `LFO N Amount/Shaping/Rate` (N = 1, 2)
- `Time`, `Global Mod Amount`, `Unison Amount`, `Amp`, `Pitch`, `Glide`

### 5.3 Matematik
- **Additive (manual):** kaynak çıkışları **toplanır**, toplam parametreye **eklenir**. 0 nötrdür. Bipolar ve unipolar kaynak ayrımı var.
- **Multiplicative (manual):** kaynak çıkışları **çarpılır**, parametre ile **çarpılır**. Nötr 1, minimum 0.
- **Normalize alan önerisi (çıkarım):** additive modülasyonu parametrenin normalize [0,1] alanında uygula; miktar 1.0 = tüm aralık. Push script'teki dönüşümler bununla tutarlı:
  - Global `Pitch` hedefine PB/Note PB = miktar × **48 st**.
  - `Osc N Pitch` hedefine = miktar × **24 st**.
  - Filter Freq 10 oktav olduğu için Note kaynağı (nota − 60)/120 alınırsa %100'de birebir key tracking oluşur (manual iddiasıyla uyumlu).
- **Matrix görünürlüğü:** Live'da tıklanan parametre matrix'te geçici görünür; modülasyon verilirse kalır (manual).

---

## 6. PUSH 3: Wavetable parametre bankaları (EMÜLATÖR EKRANI BUNA GÖRE)

### 6.1 Push 3 device view mekaniği

**Genel kontroller (Push 3 manual):**
- Device adının üstündeki display butonuna basınca cihazın **parametre sekmeleri** (bankalar) alt display butonlarında listelenir. Sekmeye alt butonla geçilir.
- Delete basılı tutup device butonuna basmak cihazı siler. Mute basılı tutup basmak cihazı mute'lar ve parametreler grileşir.

**Sütun ve buton eşleşmesi (Drift ekran görüntüsü ve script ile doğrulandı):**
- Üst sıra buton 1'de device adı, track renginde dolu kutu içinde durur: "< Drift".
- Bankadaki `Options` listesinin **i. elemanı üst sıra buton (i+2)'ye** denk gelir, yani options 7 elemandır ve sütun 2–8'i kaplar.
- Toggle option'lar "Ad On/Off" biçiminde yazılır, örneğin "Osc Retrig Off", "Osc 1 On".

**Encoder davranışı (script):**
- Encoder'a dokunmak parametreyi seçer (touch). Sonra "Add to Matrix" basılırsa parametre matrise eklenir ve **Matrix bankasına atlanır**, dokunulan parametre `Current Mod Target` olur.
- Delete basılı + encoder'a dokunmak parametreyi varsayılana döndürür. Pitch parametresinde klip otomasyonu varsa envelope silinir.

**Encoder hassasiyetleri (script):**
- Sürekli parametre: 1.0, Shift ile ince ayar 0.01.
- Kuantize parametre: 1/15 ≈ 0.0667.
- Wavetable `Osc 1/2 Pitch`: normal 10.0, fine 0.4.

### 6.2 Banka sırası (alt display butonları 1–8)
**1 Main · 2 Oscillators · 3 Filters · 4 Global · 5 Envelopes · 6 LFOs · 7 Matrix · 8 MIDI & MPE**

### 6.3 Sanal seçici parametreler (Push'a özel, cihazda yok)

| Ad | Değerler | Varsayılan |
|---|---|---|
| Oscillator | '1', '2', 'S', 'Mix' | '1' |
| Filter / Internal Filter | '1', '2' | '1' |
| Envelopes | 'Amp', 'Env2', 'Env3' | 'Amp' |
| LFO | 'LFO1', 'LFO2' | 'LFO1' |
| Amp Env View | 'Time', 'Slope' | 'Time' |
| Mod Env View | 'Time', 'Slope', 'Value' | 'Time' |
| Expression Mode | 'MPE', 'Mono/Poly' | 'MPE' |
| Modulation Target Names | matrisin görünür hedef listesi | – |
| Current Mod Target | seçili hedefin **kendi parametresi**, yani encoder hedefin taban değerini çevirir | – |

**Oscillator seçicinin görünümü:** yatay küçük metin listesi "1 2 S Mix", seçili olan vurgulu (`HorizontalSmallTextListView`).

**Osc Off olunca:** o osilatörün Category, Table, Effect Type ve Pitch kontrolleri **disabled** (gri) görünür.

### 6.4 Banka içerikleri

Gösterim: `LOM adı → ekrandaki etiket`. `—` = boş slot. Sütunlar 1–8 = encoder 1–8.

**1) Main** (`view_description: mainbank_visualisation`)

| Durum | Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|---|
| Oscillator=1 | Oscillator | Osc 1 Table→**Table** | Osc 1 Pos→**Position** | Flt F Type→**Filter Type** | Flt F Freq→**Frequency** | Flt F Res→**Resonance** | Time→**Mod Time** | Global Mod Amount→**Mod Amt** |
| Oscillator=2 | Oscillator | Osc 2 Table→Table | Osc 2 Pos→Position | (aynı) | (aynı) | (aynı) | Mod Time | Mod Amt |
| Oscillator=S | Oscillator | Sub Gain→**Gain** | Sub Tone→**Tone** | Filter Type* | Frequency | Resonance | Mod Time | Mod Amt |
| Oscillator=Mix | Oscillator | Osc 1 Gain→**Gain 1** | Osc 2 Gain→**Gain 2** | Filter Type* | Frequency | Resonance | Mod Time | Mod Amt |

- F = Internal Filter seçimi (1/2).
- \*Kodda Enc4 için S→"Octave" (Sub Transpose) ve Mix→"Gain Sub" dalları da var. Ama koşul sırası nedeniyle (Internal Filter her zaman 1 ya da 2) pratikte hep Filter Type gösterilir.
- Kodda Filter 2 için eski ad `Filter 2 Type` kullanılmış. Filter 2 seçiliyken bu slot boş kalabilir; **doğrulanamadı**.

Options (üst butonlar 2–8):

| Buton | İçerik |
|---|---|
| 2 | **Osc** (Osc N On toggle); S seçiliyse **Sub** (Sub On toggle) |
| 3 | — |
| 4 | **Filter Switch** ("Filter 1"/"Filter 2") |
| 5 | "Filter" (script'te bu adda bir option yaratılmıyor, büyük olasılıkla boş görünür; ç) |
| 6 | — |
| 7 | — |
| 8 | **Add to Matrix** |

Görselleştirmeler (0 tabanlı, kapsayıcı sütun indeksleri):
- **wavetable:** sütun 0–2 (Enc1–3). Yalnız Oscillator 1/2 seçiliyken görünür.
- **filter eğrisi:** sütun 3–5 (Enc4–6).

**2) Oscillators** (`view_description: oscillators_visualisation`)

| Durum | Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|---|
| 1 veya 2 | Oscillator | **Category** | **Table** | **Position** | **Pitch** | **Effect Type** | FX1: Classic→**Pulse Width** / Modern→**Warp** / Fm→**Pitch** / None→— | FX2: Classic→**Sync** / Modern→**Fold** / Fm→**Amount** / None→— |
| S | Oscillator | Sub Gain→Gain | Sub Tone→Tone | Sub Transpose→**Octave** | — | — | — | — |
| Mix | Oscillator | Osc 1 Pitch→**Pitch 1** | Osc 2 Pitch→**Pitch 2** | Sub Transpose→**Octave Sub** | Osc 1 Gain→**Gain 1** | Osc 2 Gain→**Gain 2** | — | Sub Gain→**Gain Sub** |

- Options: buton 2 = Osc/Sub On toggle, buton 8 = Add to Matrix.
- Görselleştirme: **wavetable**, sütun 1–3 (Category, Table, Position). Yalnız osc 1/2 seçiliyken.

**3) Filters**

| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| **Filter** (1/2 seçici) | Flt N On→**Filter** | Flt N Type→**Type** | **Frequency** | **Resonance** | Type LP/HP ise Flt N LP/HP, değilse Flt N BP/NO/MO → **Filter Circuit** | Type=Morph ise **Morph**; LP/HP/BP/Notch ve circuit≠Clean ise **Drive**; aksi halde — | Filter Routing→**Routing** |

- Options: buton 3 = **Flt N Slope** ("12dB"/"24dB"), buton 8 = Add to Matrix.
- Görselleştirme: **filter**, sütun 2–4 (Type, Frequency, Resonance).

**4) Global**

| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| Mono On→**Mono** (Off/On) | Mono=On ise **Glide**, değilse **Poly Voices** | **Unison Mode** | **Unison Voices** | **Unison Amount** | **Transpose** | — | **Volume** |

Options: buton 8 = Add to Matrix.

**5) Envelopes**

| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| **Envelopes** (Amp/Env2/Env3) | **Envelope View** (Amp: Time/Slope · Env2/3: Time/Slope/Value) | Time: **Attack** · Slope: **Attack Slope** · Value: **Initial** | Time: **Decay** · Slope: **Decay Slope** · Value: **Peak** | **Sustain** | Time: **Release** · Slope: **Release Slope** · Value: **Final** | **Loop Mode** | — |

- Kod notu: Env 3 + Slope görünümünde Enc3 etiketi "Attack Slope" değil **"Attack"**. Ableton tutarsızlığı.
- Options: buton 8 = Add to Matrix.
- Görselleştirme: **envelope**, sütun 2–5. Dokunulan encoder'ın segmenti vurgulanır (AttackLine, DecayLine, SustainLine, ReleaseLine).

**6) LFOs**

| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| **LFO** (LFO1/LFO2) | LFO N Shape→**Type** | LFO N Shaping→**Shape** | Sync=Free ise LFO N Rate, Tempo ise LFO N S. Rate → **Rate** | **Amount** | LFO N Attack Time→**Attack** | **Phase Offset** | **Retrigger** |

- Options: buton 4 = **LFO N Sync** ("Hz"/"Sync"), buton 8 = Add to Matrix.
- Görselleştirme: **lfo**, sütun 0–3.

**7) Matrix**

| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| Modulation Target Names→**Mod Target** | Current Mod Target (hedef parametrenin kendisi) | — | **Amp Envelope** | **Envelope 2** | **Envelope 3** | **LFO 1** | **LFO 2** |

- Options: buton 2 = **Back** (matrise girmeden önceki bankaya döner), buton 3 = —, buton 4–8 = **Go to Amp Env / Go to Env 2 / Go to Env 3 / Go to LFO 1 / Go to LFO 2**.
- "Go to" butonları Envelopes veya LFOs bankasına ilgili seçimle atlar.

**8) MIDI & MPE**

| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| **Mod Target** | Current Mod Target | **Velocity** | MIDI Note→**Key** | MPE modunda **Note PB**, Mono/Poly modunda **PB Range** | MIDI Aftertouch→**Pressure** | MPE modunda **Slide**, Mono/Poly modunda **Mod Wheel** | **Random** |

- Options: buton 2 = Back, buton 5 = **Expression Mode Switch** (MPE / Mono/Poly).
- **PB Range ve Note PB gösterimi semitone cinsinden:** hedef global Pitch ise miktar×48, Osc Pitch ise miktar×24.

### 6.5 Enum ikonları (Push 3 asset adları; kendi ikonlarını bu anlamlarla çiz)

| Parametre | İkonlar (değer sırasıyla) |
|---|---|
| Oscillator | osc_1, osc_2, osc_sub, osc_mix |
| Effect Type | effect_none, effect_fm, effect_classic, effect_modern |
| Sub Transpose | octave_0, octave_minus_1, octave_minus_2 |
| Filter seçici | filter_switch_1, filter_switch_2 |
| Flt Type | filter_low_24, filter_high_24, filter_band_24, filter_notch_12, filter_morph_24 |
| Circuit | circuit_clean, circuit_osr, circuit_ms2, circuit_smp, circuit_prd |
| Filter On / Retrigger / Mono On | control_off, control_on |
| Routing | routing_serial, routing_parallel, routing_split |
| Amp Env View | env_time, env_slope |
| Mod Env View | env_time, env_slope, env_value |
| Loop Mode | env_loop_none, env_loop_trigger, env_loop |
| LFO Shape | lfo_sine, lfo_triangle, lfo_saw_down, lfo_square, lfo_random |
| Unison Mode | unison_none, classic, shimmer, noise, phase_sync, position_spread, random |
| Unison / Poly Voices | voices_2 … voices_8, voices_16 |
| LFO Sync | lfo_free, lfo_sync |

Wavetable ikonları 180×176 px, beyaz glyph + alpha.

### 6.6 XY Control (Push 3, Live 12.3+ XYZ layout; MPE modunda)
Wavetable için varsayılan eşleme: **X = `Time` (Mod Time), Y = `Osc 1 Pos`, Z = yok**.

---

## 7. Push 3 ekranının görünümü (emülatör çizimi için)

**Donanım:**
- Ekran **960×160 px**. Push 2 dokümanı: 960×160, 16-bit, 60 fps. SOS Push 3 incelemesi: "screen is the same".
- 8 sütun × 120 px.

**Push 3 manual'daki Drift ekran görüntüsünden ölçülen yerleşim (piksel değerleri yaklaşık):**

| Öğe | Konum | Görünüm |
|---|---|---|
| Arka plan | tüm ekran | **#000000** |
| Device adı kutusu | sol üst, y 0–16, x 0–110 | **track renginde** dolu, siyah yazı (örnekte track rengi #00CC89) |
| Option satırı | en üst | aktif toggle track renginde, pasif gri |
| Parametre etiketleri | y ≈ 25–35 | gri |
| Değerler | y ≈ 40–65 | track renginde. Dial'lı parametrelerde büyük font ("20.0 kHz", "-6.0 dB"); görselleştirme altında kalanlarda küçük font |
| Dial | merkez y ≈ 95, r ≈ 20 | arka halka koyu gri (~#1E1E1E), dolu yay track renginde |
| Görselleştirme | ilgili sütunlar arasında y ≈ 75–115 | track renginde tek çizgi (örnekte Drift dalga formu sütun 2–5'i kaplıyor) |
| Alt satır, y ≈ 142–160 | normal device view'da | track adları, her biri kendi renginde; seçili olan dolu kutu |
| Alt satır, y ≈ 142–160 | banka görünümünde | sekme adları; seçili sekme track renginde dolu kutu, siyah yazı ("Main" vb.) |

**Görselleştirme kuralları:**
- Görselleştirme altında kalan parametreler "shrunk" çizilir: dial yok, küçük değer.
- Wavetable görselleştirmesinde Position çevrilirken `AdjustingPosition` vurgusu olur. Filter parametresine dokununca `AdjustingFilter`, LFO parametresine dokununca `AdjustingLfo`.

**Sitedeki Figma SVG notu:** SVG'deki "LCD Display" (mavi #0088DE, "Oscillator / Graph / Mod Time / 26 %") stilize bir konsept çizim. Yerleşim Main bankasıyla uyumlu (Enc1 Oscillator listesi "1 2 S Mix", Enc2–6 grafik, Enc7 Mod Time, Enc8 Mod Amt). Ama gerçek Push 3'te vurgu rengi **track rengi**, zemin saf siyah.

---

## 8. Push 2 ve Push 3 farkları (karıştırma)

**Push 3 (Live 12.4.6, Push3.app):**
- 8. banka **"MIDI & MPE"**. Expression Mode (MPE / Mono/Poly) switch'i var, Note PB ve Slide slotları var.
- Parametre adları: Flt 1 …
- Etiketler: Envelope View, Attack Slope, Loop Mode, Type/Shape, Phase Offset, Amp Envelope/Envelope 2…

**Push 2 (Live 12.0 script, gluon deposu):**
- 8. banka **"MIDI"**: Velocity, Key, PB Range, Pressure, Mod Wheel, Random. MPE yok.
- Parametre adları: Filter 1 Type/Freq…
- Etiketler: Env View, Init, Loop, LFO Type, Offset, Amp Env/Env 2/Env 3…
- Banka sırası ve Main/Oscillators/Filters yapısı aynı.

**Standalone Push 3:** aynı script'i kullandığı doğrulanamadı; büyük olasılıkla aynı.

**Push'a özel olmayan genel kontrolcü bankaları** (ableton.v3 default_bank_definitions): Main (Osc 1 Pos, Osc 1 Transp, Osc 2 Pos, Osc 2 Transp, Filter 1 Freq, Filter 1 Res, Global Mod Amount, Volume), Oscillator 1, Oscillator 2, Filter 1, Filter 2, Amp Envelope, Envelope 2/3, LFO 1/2, Global. **Push'ta kullanılmaz.**

---

## 9. DSP uygulama önerileri (çıkarım/tasarım; Ableton iç algoritması değil)

**Osilatör:**
- Band-limited mipmap: her oktav için bir tablo, 20 Hz–20 kHz arası ~10 tablo (EarLevel).
- Faz akümülatörü ve lineer interpolasyon kullan.
- Position için komşu iki frame arasında lineer crossfade: frameIdx = pos × (frameCount − 1).

**Filtreler:**
- Clean: ZDF/TPT state-variable filtre (Cytomic "SVF"). 24 dB = iki 12 dB kademesi.
- OSR: SVF + rezonans yolunda hard-clip.
- MS2: Sallen-Key + tanh.
- PRD: ZDF ladder.
- Filtre frekansı taper'ı: f = 20·1024^x.

**Unison (Amount ölçeği doğrulanamadı):** Classic'te detune = ±Amount × 50 ct, voice'lar simetrik yayılır ve pan alternatif.

**Synced LFO etiketleri (doğrulanamadı; 22 adım, 21 = en yavaş, init 15):** önerilen liste: 1/64, 1/48, 1/32, 1/24, 1/16, 1/12, 1/8, 1/6, 3/16, 1/4, 5/16, 1/3, 3/8, 1/2, 3/4, 1, 1.5, 2, 3, 4, 6, 8 (bar).

**Control-rate:** 32 sample (HiQ off gibi). Envelope ve LFO'lar ses başına çalışır.

**Varsayılan modülasyon bağlantıları:** init'teki Mod Wheel→Osc 1 Pos 100 %, Velocity→Amp 50 %, PB→Pitch ±2 st bağlantıları mutlaka olmalı. Push pad'leri velocity gönderir; touch strip mod wheel/pitch bend olarak kullanılabilir.

## BULGULAR
- [resmi/yuksek] Wavetable: 2 wavetable osilatör, sub osc, 2 analog-modelled filtre (Cytomic), modülasyon matrisi. Efektler FM (Amt/Tune: ±50% = 1 oktav, ±100% = 2 oktav), Classic (PW/Sync), Modern (Warp/Fold); efekt değerleri tip değişince korunur. (https://www.ableton.com/en/live-manual/12/live-instrument-reference/#wavetable)
- [resmi/yuksek] Filter circuit'leri: Clean ve OSR tüm tiplerde; MS2, SMP, PRD sadece LP/HP'de. 12/24 dB. Drive, Clean dışı LP/HP/BP'de. Morph LP→BP→HP→Notch→LP. Routing Serial/Parallel/Split ve Sub yönlendirmesi manual'da tarif edilmiş. (https://www.ableton.com/en/live-manual/12/live-instrument-reference/#wavetable)
- [resmi/yuksek] Additive modülasyon: kaynaklar toplanıp parametreye eklenir (nötr 0). Multiplicative: kaynaklar çarpılıp parametreyle çarpılır (nötr 1, min 0). Global Amount, Sustain, Initial, LFO Amount, Volume ve Unison Amount multiplicative. (https://www.ableton.com/en/live-manual/12/live-instrument-reference/#wavetable)
- [resmi/yuksek] Envelope Loop modları None/Trigger/Loop. Slope pozitif = önce hızlı, negatif = sonda hızlı, 0 = lineer. Amp envelope'ta Initial/Peak/Final yok. LFO dalgaları Sine, Triangle, Saw, Square, Random. Offset modüle edilemez. Note kaynağı C3 merkezli; %100'de filtre notayı birebir izler. (https://www.ableton.com/en/live-manual/12/live-instrument-reference/#wavetable)
- [resmi/yuksek] Unison modları Classic, Shimmer, Noise, Phase Sync, Position Spread, Random Note (+None). Glide sadece Mono'da, Poly Voices sadece Poly'de etkin. Hi-Quality kapalıyken modülasyon her 32 sample'da hesaplanır, ~%25 CPU tasarrufu; 11.1'den beri varsayılan kapalı. (https://www.ableton.com/en/live-manual/12/live-instrument-reference/#wavetable)
- [kod/yuksek] Init Wavetable değerleri: Osc1 On (Modern, 0/0), Osc2 Off; Sub Off, Gain 0.5011875 (-6 dB), Transpose 1 (-1 oct); F1 LP Clean 12dB 20480 Hz On; F2 HP 20 Hz Off; env A 1 ms, D/R 0.6 s, slope'lar 0/0.5/0.5; Amp Sustain 0.5011876; LFO Sine 1 Hz Amount 1 Retrig On SyncedRate 15; Mod Amount 1; Unison None/3/0.3; Volume 0.3548 (-9 dB); Poly, PolyVoices idx 6 (=8); HiQ false. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/App-Resources/Core%20Library/Defaults/Instruments/Wavetable.adv)
- [kod/yuksek] İç parametre aralıkları: Osc Transpose -24..24; Detune -0.5..0.5; Position 0..1; Effect1 -1..1; Effect2 0..1; Pan -1..1; Gain 0..1; Sub Transpose 0..2; Filter Freq 20..20480; Res 0..1.25; Drive 0..24; Attack 0..20; Decay/Release 0.0015..20; Slope -1..1; LFO Rate 0.01..30; SyncedRate 0..21; PhaseOffset 0..360; Mod Time -1..1; Mod Amount 0..2; Global Transpose -48..48; Glide 0..20. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/App-Resources/Core%20Library/Defaults/Instruments/Wavetable.adv)
- [kod/yuksek] Init preset'teki varsayılan modülasyonlar: Osc 1 Pos ← idx9 1.0 ve idx12 0.33; Osc 1 Warp ← idx8 0.07; Amp ← idx5 0.5; Pitch ← idx7 0.0416667 ve idx11 1.0. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/App-Resources/Core%20Library/Defaults/Instruments/Wavetable.adv)
- [cikarim/orta] 13 mod kaynağının indeks sırası: 0 Amp Env, 1 Env2, 2 Env3, 3 LFO1, 4 LFO2, 5 Velocity, 6 Note, 7 Pitch Bend, 8 Aftertouch/Press, 9 Mod Wheel, 10 Random, 11 MPE Note PB, 12 MPE Slide. Init preset ve 269 preset istatistiğinden çıkarıldı. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/App-Resources/Core%20Library/Devices/Instruments/Wavetable/)
- [kod/yuksek] Push 3 Wavetable banka sırası: Main, Oscillators, Filters, Global, Envelopes, LFOs, Matrix, 'MIDI & MPE'. Her bankanın 8 slotu, koşullu isimleri ve Options listeleri (Add to Matrix, Filter Switch, Flt N Slope 12dB/24dB, LFO N Sync Hz/Sync, Back, Go to Amp Env…, Expression Mode Switch) §6.4'teki gibi. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/custom_bank_definitions.pyc)
- [kod/yuksek] Push Wavetable sanal seçicileri: Oscillator ('1','2','S','Mix'; default '1'), Internal Filter ('1','2'), Envelopes (Amp/Env2/Env3), LFO (LFO1/LFO2), Amp Env View (Time/Slope), Mod Env View (Time/Slope/Value), Expression Mode ('MPE','Mono/Poly', default MPE). Unison Voices 2..8; poly voices listesi 2,3,4,5,6,7,8,16; effect modları None/Fm/Classic/Modern. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/wavetable.pyc)
- [kod/yuksek] Push'ta PB ve Note PB modülasyon miktarı semitone olarak gösterilir: hedef global Pitch ise ×48, Osc 1/2 Pitch ise ×24. Osc Pitch = Transp + Detune; Shift ile ince ayar yapılır. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/wavetable.pyc)
- [kod/yuksek] Push görselleştirme aralıkları: wavetable Main'de sütun 0-2, Oscillators'ta 1-3 (sadece osc 1/2 seçiliyken); filter Main'de 3-5, Filters'ta 2-4; lfo LFOs'ta 0-3; envelope Envelopes'ta 2-5. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/wavetable.pyc)
- [kod/yuksek] Enum sıraları Push ikon dizilerinden: Filter Type 0 LP, 1 HP, 2 BP, 3 Notch, 4 Morph; Circuit Clean/OSR/MS2/SMP/PRD; Loop None/Trigger/Loop; LFO Sine/Triangle/Saw(down)/Square/Random; Routing Serial/Parallel/Split. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/device_parameter_icons.pyc)
- [kod/yuksek] Push encoder hassasiyetleri: sürekli 1.0, fine 0.01, kuantize 1/15. Wavetable Osc 1/2 Pitch için normal 10.0, fine 0.4. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/parameter_mapping_sensitivities.pyc)
- [kod/orta] XY Control'de Wavetable eşlemesi: X='Time', Y='Osc 1 Pos', Z=None. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/custom_bank_definitions.pyc)
- [resmi/yuksek] Push 3'te device adının üstündeki display butonuna basınca parametre sekmeleri gösterilir; sekmelere alt display butonlarıyla geçilir. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Push 3 device ekranı: 960x160, siyah zemin, track rengi vurgu (örnekte #00CC89), sol üstte device adı kutusu, alt satırda track veya sekme adları, sağda dial'lı parametreler. Sekmeler Drift için Main…Global; option'lar üst sıra buton 2-8'de. (https://ableton-production.imgix.net/push-manual/device-parameter-tabs.png)
- [resmi/yuksek] Push 2 ekranı 960x160 piksel, 16-bit RGB565, 60 fps. SOS'a göre Push 3 ekranı Push 2 ile aynı. (https://github.com/Ableton/push-interface/blob/main/doc/AbletonPush2MIDIDisplayInterface.asc)
- [ikincil/orta] Push 3 incelemesi: 'While the screen is the same' (Push 2 ile aynı ekran), device'lar ekranla animasyonlu entegre. (https://www.soundonsound.com/reviews/ableton-push-3)
- [resmi/yuksek] User wavetable: tablo 1024 sample; ≤256 tablo okunur, mono'ya indirilir, en az 2 tablo; Serum 2048 → 1024; Raw kapalıyken sessizlik kırpma, kenar fade, faz hizalama ve normalize yapılır. (https://help.ableton.com/hc/en-us/articles/360002719179-User-Wavetables)
- [resmi/yuksek] Varsayılanlar: 8 ses polifoni, sadece Osc1 açık, unison default 3 ses. Fold en CPU yoğun osc FX; FM her unison voice için modülatör çalıştırır. (https://help.ableton.com/hc/en-us/articles/360000036930-Managing-CPU-load-when-using-Wavetable)
- [resmi/yuksek] Live 11: Wavetable MPE tab'ı eklendi (Velocity, Note PB, Slide, Press); Hi-Quality context menu seçeneği geldi. (https://www.ableton.com/en/release-notes/live-11/)
- [resmi/yuksek] Live 12: Wavetable maksimum 16 ses. Retrigger kapalı yeni Wavetable'da LFO'lar transport'a senkron. (https://www.ableton.com/en/release-notes/live-12/)
- [resmi/yuksek] Push release notes: Wavetable Pitch parametresi Shift'siz de ara değerleri gösteriyor; PB range Live ile Push'ta tutarlı. (https://www.ableton.com/en/release-notes/push-11/)
- [resmi/yuksek] LOM enumları: filter_routing 0 Serial, 1 Parallel, 2 Split; mono_poly 0 Mono, 1 Poly; effect_mode 0 None, 1 Fm, 2 Classic, 3 Modern; unison_mode 0-6. Mod kaynak indeksleri LOM'da belgelenmemiş. (https://docs.cycling74.com/apiref/lom/wavetabledevice/)
- [kod/yuksek] Fabrika wavetable'ları: 193 WAV, 11 kategori (Basics 29, Collection 15, Complex 16, Distortion 9, Filter 14, Formant 17, Harmonics 19, Instrument 19, Noise 23, Retro 15, Vintage 17); mono 16-bit 44.1 kHz, 1024 sample/frame. Basic Shapes 4 frame (sine, tri, saw, square), harmonikleri ideal. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/App-Resources/Builtin/Samples/Vector/Sprites/)
- [ikincil/orta] SOS (Live 10.0): 194 wavetable, 12 kategori. Default Osc 1 'Basic Shapes'. Mod wheel pozisyonu tarar. FM relative tuning ±2 oktav. Classic Sync %100 = iki oktav. (https://www.soundonsound.com/techniques/wavetable-abletons-new-synth)
- [ikincil/orta] Push 2 için Live 12.0 script'i: aynı 7 bankanın yanında 8. banka 'MIDI' (Velocity, Key, PB Range, Pressure, Mod Wheel, Random); parametre adları 'Filter 1 Type' vb. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/custom_bank_definitions.py)
- [ikincil/orta] Push dışı genel kontrolcüler (ableton.v3) için Wavetable bankaları: Main, Oscillator 1, Oscillator 2, Filter 1, Filter 2, Amp Envelope, Envelope 2/3, LFO 1/2, Global. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/ableton/v3/control_surface/default_bank_definitions.py)
- [resmi/yuksek] Ableton: 'Wavetable is the first synth that's designed for deep sound sculpting from Push'; Push ekranında detaylı wavetable görselleştirmeleri var. (https://www.ableton.com/en/packs/wavetable/)
- [ikincil/yuksek] Band-limited wavetable oscillator: 20 Hz-20 kHz için yaklaşık 10 tablo (oktav başına 1), phase increment'e göre tablo seçimi, lineer interpolasyon. (https://www.earlevel.com/main/2012/05/25/a-wavetable-oscillator-the-code/)
- [ikincil/orta] Wavetable'ın varsayılan kategori/tablo seçicisi 'Basics' / 'Basic Shapes'. (https://www.studiobrootle.com/ableton-wavetable-tutorial/)

## BELIRSIZ
- Ableton'ın ayrı, public bir 'Push parameter banks' dokümanı bulunamadı. Bankalar Live 12.4.6'daki Push3.app script'inden (derlenmiş .pyc, bellekte disassemble) çıkarıldı. Standalone Push 3 firmware'inin birebir aynı script'i kullandığı doğrulanamadı.
- Görünen birimler doğrulanamadı: Osc Gain, Sub Gain, Volume ve Amp Sustain'in dB, Pan'in 50L..50R, Resonance'ın 0-125%, Classic PW'nin (iç aralık -1..1) nasıl gösterildiği. dB çıkarımı varsayılanların tam -6/-9 dB karşılığı olmasına dayanıyor.
- Glide'ın birimi doğrulanamadı (iç aralık 0..20; saniye olduğu tahmin ediliyor).
- 22 adımlı LFO synced rate etiket listesi doğrulanamadı. Yalnızca 0..21 aralığı, init 15 ve benzer M4L LFO tablosunda 21 = 8 bar olduğu biliniyor. Verilen liste öneri.
- 13 mod kaynağının indeks sırası (özellikle 6 = Note, 8 = Aftertouch/Press, 10 = Random, 12 = Slide) preset istatistiğinden çıkarım. 5, 7, 9 ve 11 init preset ile güçlü şekilde destekleniyor.
- Main bankasında Enc4'ün S/Mix modunda 'Octave'/'Gain Sub' gösterip göstermediği belirsiz: koşul sırası yüzünden pratikte hep Filter Type görünmeli. Ayrıca Filter 2 için eski ad 'Filter 2 Type' kullanılmış, Push 3'te bu slot boş kalabilir. Main'deki 'Filter' option'ı script'te yaratılmıyor, muhtemelen boş.
- Kategori etiketinin UI'da 'Instrument' mı 'Instruments' mı olduğu doğrulanamadı (dosya adları 'Instrument').
- Ableton'ın iç DSP algoritmaları yayınlanmamış: FM index ölçeği, PW/Warp/Fold formülleri, unison detune ölçeği, Mod Time çarpanı, Cytomic devre detayları, pozisyon interpolasyon tipi. §9 tasarım önerisidir.
- Push 3 ekranındaki Wavetable görselleştirmelerinin (wavetable, filter, LFO, envelope) çizim detayları Push3 binary'sinde; yalnız sütun aralıkları ve vurgu bayrakları biliniyor. Gerçek bir Push 3 Wavetable ekran görüntüsü resmi kaynaklarda bulunamadı; genel stil Drift ekran görüntüsünden çıkarıldı.
- Ableton'ın wavetable WAV'ları, ikonları ve script'leri telifli. Sitede kullanılmamalı; kendi tablolarını ve ikonlarını üretmek gerekiyor.