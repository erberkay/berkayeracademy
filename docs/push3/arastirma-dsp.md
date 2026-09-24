# KONU 6 — Wavetable sentezi: DSP ve tarayıcıda uygulama tarifi

> Kapsam: berkayeracademy.com'daki Push 3 emülatörü (`ders-push3.html`) için tarayıcıda çalışan, Ableton **Wavetable**'a davranış olarak sadık bir synth motoru. Build adımı yok, statik JS, Firebase Hosting. Hiçbir dosya değiştirilmedi; bu belge yalnızca araştırma ve tasarım içerir.
> Etiketler: **[RESMİ]** Ableton kılavuzu veya spesifikasyon · **[KOD]** açık kaynak veya decompile edilmiş kaynak kod · **[İKİNCİL]** makale, inceleme, forum · **[ÇIKARIM]** bizim tasarım kararımız veya tahminimiz; test edilip ayarlanmalı.

---

## 0. Özet kararlar

| Konu | Karar | Dayanak |
|---|---|---|
| Motor | Tek bir `AudioWorkletProcessor`. Tüm sesler, filtreler ve modülasyon içinde çalışır. Saf JS (WASM yok, sonra eklenebilir). | Chrome'un AudioWorklet tasarım desenleri; MDN |
| İletişim | `port.postMessage` + Transferable `ArrayBuffer`. **SharedArrayBuffer kullanılmaz** (COOP/COEP başlığı gerektirir, sitedeki Firebase Auth popup akışını bozar). | MDN SharedArrayBuffer [RESMİ]; Auth riski [ÇIKARIM] |
| Blok boyu | Varsayılan 128. Kodda asla sabitlenmez: `outputs[0][0].length` okunur. Chrome 153+ `renderSizeHint` destekler, Safari ve Firefox desteklemez. | MDN process(); Chrome 153 notları |
| Kare (frame) | 2048 örnek/kare (Serum, Vital, EarLevel standardı). Kare sayısı 64 (dahili tablolar); içe aktarmada en fazla 256. | Serum clm, Vital `kWaveformBits=11`, EarLevel |
| Anti-aliasing | Oktav başına 1 mip seviyesi (11 seviye: 1023…1 harmonik). FFT ile harmonik kesilir. Seviye seçimi EarLevel'in “fs/3 kuralı” ile yapılır, komşu seviyelere yarım oktavlık crossfade uygulanır. | EarLevel serisi |
| İnterpolasyon | Kare içinde doğrusal (varsayılan), HQ modunda 4 noktalı Hermite. Kareler (Position) arasında doğrusal crossfade: toplam 4 okuma, crossfade bölgesinde 8. | EarLevel, Niemitalo |
| Filtre | Cytomic/Simper trapez SVF (LP/BP/HP/Notch/Morph, 12 dB). 24 dB için iki SVF kaskadı. PRD için Zavalishin TPT 4 kutuplu ladder + tanh. | Cytomic PDF, Zavalishin |
| Modülasyon hızı | Amp zarfı örnek başına. Diğer mod kaynakları 32 örnekte bir hesaplanıp doğrusal interpolasyonla uygulanır (Ableton'ın Hi-Quality kapalı modu bunu yapar). | Ableton Live 12 kılavuzu [RESMİ] |
| Polifoni | Poly Voices 2–8, Unison Voices 2–8 (Ableton'ın Push script'indeki değerler). Ek olarak 4 “kuyruk” slotu çalınan sesleri 3 ms'de söndürür. | Push2 remote script [KOD] |
| Mobil | Eco profili: unison ≤ 4, Fold için oversampling yok, filtre katsayısı 32 örnekte bir güncellenir. `navigator.audioSession.type='playback'` ayarlanır. AudioContext kullanıcı hareketiyle `resume()` edilir. | [ÇIKARIM] + WebKit/MDN |

---

## 1. Referans: Ableton Wavetable'ın resmi davranışı (neyi taklit ediyoruz)

### 1.1 Mimari [RESMİ — Live 12 kılavuzu, Bölüm 31.13]
- 2 wavetable osilatörü + 1 sub osilatör, 2 analog modelli filtre, modülasyon bölümü (Matrix, Mod Sources ve MIDI sekmeleri).
- **Band-limit garantisi:** “Modülasyon uygulanmadığı sürece osilatörlerin ham çıkışı her perdede tam band-limited'dir ve aliasing üretmez.” Hedefimiz de bu: statik ayarda aliasing olmayacak, efekt ve modülasyon sırasında kontrollü bir uzlaşma yapılacak.
- Her osilatörün parametreleri: On/Off, Gain, Pan, Semi, Detune, kategori seçici, tablo seçici (oklar kategori sonunda bir sonraki kategoriye geçer), Wave Position, görselleştirme (Linear: dalgalar alttan üste, zaman soldan sağa; Polar: içten dışa halkalar, zaman saat yönünde).
- **Osilatör efektleri** (iki parametre, efekt tipi değişince değerleri korunur):
  - **FM:** `Amt` modülasyon yoğunluğu, `Tune` modülatör frekansı. Tune %50 (−%50) iken modülatör 1 oktav yukarıda (aşağıda), %100 (−%100) iken 2 oktav yukarıda (aşağıda). Aradaki değerler inharmonik oranlardır.
  - **Classic:** `PW` pulse width. Kılavuza göre donanımdan farklı olarak her wavetable'a uygulanabilir. `Sync` fazı resetleyen “gizli” bir osilatördür.
  - **Modern:** `Warp` (kılavuz: “pulse width'e benzer”), `Fold` (wavefolding).
- **Sub:** On/Off, Gain, `Tone` (%0 = saf sinüs, arttıkça harmonik eklenir), Octave (0, −1, −2).
- **Filtreler:** LP, HP, BP, Notch, Morph. Eğim 12 veya 24 dB. Devreler:
  - `Clean`: EQ Eight ile aynı, CPU dostu, tüm tiplerde var.
  - `OSR`: state-variable, rezonans hard-clip diyotla sınırlı, tüm tiplerde var.
  - `MS2`: Sallen-Key + soft clip, yalnızca LP/HP.
  - `SMP`: özel tasarım, MS2 ile PRD arası, yalnızca LP/HP.
  - `PRD`: ladder, açık rezonans sınırı yok, yalnızca LP/HP.
  - `Drive` yalnızca LP/HP/BP'de ve Clean dışı devrelerde bulunur.
  - Morph süpürme sırası: **LP → BP → HP → Notch → LP**.
- **Routing:**
  - `Serial`: tüm osilatörler → F1 → F2. Sub her iki filtreye gider.
  - `Parallel`: iki ana osilatör hem F1'e hem F2'ye gider. Sub her ikisine gider.
  - `Split`: Osc1 → F1, Osc2 → F2. Sub yarıya bölünüp iki filtreye gider. Bir filtre kapalıysa ilgili osilatör yine duyulur.
- **Matrix:** kaynaklar yatay, hedefler dikey.
  - *Additive* hedefler: kaynakların toplamı parametre değerine eklenir. Nötr değer 0'dır, bipolar olabilir.
  - *Multiplicative* hedefler: kaynakların çarpımı değerle çarpılır. Nötr değer 1, minimum 0'dır.
  - Multiplicative hedefler: Matrix Amount, Sustain, env Initial, LFO Amount, Volume, Unison Amount.
  - `Time`: tüm modülatör sürelerini ölçekler (negatif daha hızlı, pozitif daha yavaş).
  - `Amount`: matrisin genel miktarıdır (multiplicative).
- **Zarflar:** Amp, Env 2, Env 3.
  - Attack/Decay/Sustain/Release ve her segment için Slope (pozitif: başta hızlı sonra yavaş; negatif: uzun süre düz sonra hızlı; 0: doğrusal).
  - Env 2/3'te ek olarak Initial, Peak ve Final değerleri vardır.
  - Loop modu: `None` (Note Off'a kadar sustain tutar), `Trigger` (note-on ile tüm segmentleri bir kez çalar, sustain beklemez), `Loop` (sustain tutmadan ses bitene kadar döngü).
- **LFO ×2:** 5 dalga (Sine, Triangle, Saw, Square, Random) ve `Shape` ayarı:
  - Sine/Saw: artan veya azalan eğim.
  - Triangle: simetri Ramp ile Saw arasında değişir, ortada Triangle olur.
  - Square: pulse width.
  - Random: uç değerlerin dağılımı.
  - Diğer parametreler: `Sync` (Hz veya tempo), `Rate`, `Amount` (multiplicative), `Offset` (faz; modüle edilemez), `Attack` (fade-in), `Retrigger`.
- **MIDI sekmesi:** Velocity, Note (C3 merkezli; Filter Freq'e %100 atanırsa filtre notayı tam izler), Pitch Bend, Aftertouch, Mod Wheel, Random (her note-on'da yeni değer).
- **Global:** Transpose, Volume (multiplicative), Poly/Mono (Mono = tek ses ve legato zarflar), Poly Voices, Glide (yalnızca Mono'da), Unison (None + 6 mod), Voices, Amount (multiplicative).
- **Unison modları:**
  - `Classic`: eşit aralıklı detune, sesler dönüşümlü olarak sol ve sağa panlanır.
  - `Shimmer`: rastgele aralıklarla pitch jitter + küçük wavetable ofseti.
  - `Noise`: Shimmer gibi ama çok daha hızlı jitter.
  - `Phase Sync`: Classic detune, nota başında fazlar senkronlanır (phaser benzeri süpürme).
  - `Position Spread`: wavetable pozisyonları eşit yayılır + az detune.
  - `Random Note`: her notada pozisyon ve detune rastgele.
- **Hi-Quality:** kapalıyken modülasyon **32 örnekte bir** hesaplanır ve düşük güçlü Cytomic filtreleri kullanılır. Bu %25'e kadar CPU kazandırır. Live 11.1'den beri yeni instance'larda varsayılan olarak kapalıdır.
- **Kullanıcı wavetable'ı:** WAV/AIFF sürüklenebilir. Raw kapalıyken otomatik işlem uygulanır. [İKİNCİL] kaynaklara göre işlem şöyle: 1024 örneklik ardışık kareler, en fazla 256 kare; baş ve sondaki sessizlik atılır, kare kenarları sıfıra fade edilir, komşu karelerin faz farkı azaltılır, normalize edilir. Raw açıkken 1024'lük eşit parçalara bölünür.
- **CPU uyarısı** [RESMİ help, yalnızca arama özetiyle görüldü]:
  - Örnek hesap: 8 nota × 3 osilatör × 8 unison = 192 ses.
  - FM, her unison sesi için bir iç modülatör açar.
  - **Fold en pahalı efekttir.**
  - Analog filtreler Clean'den pahalıdır.

### 1.2 Push'ta Wavetable nasıl görünür (encoder bankaları) [KOD — Live 12 Push2 remote script, decompile]
Kaynak: `Push2/custom_bank_definitions.py` ('InstrumentVector' = Wavetable'ın iç adı) ve `ableton/v2/control_surface/wavetable_decoration.py`.

Script'teki sabitler:
- `available_effect_modes = ('None','Fm','Classic','Modern')`
- Unison modları: `('None','Classic','Shimmer','Noise','Phase Sync','Position Spread','Random Note')`
- `MIN/MAX_UNISON_VOICE_COUNT = 2/8`
- `poly_voices_values = ('2'…'8')`
- Routing: `('Serial','Parallel','Split')`
- Osilatör seçici `["1","2","S","Mix"]`, filtre seçici `["1","2"]`
- Zarf seçici `["Amp","Env2","Env3"]`, zarf görünümü Amp için `["Time","Slope"]`, Env2/3 için `["Time","Slope","Value"]`
- LFO seçici `["LFO1","LFO2"]`

| Banka | Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 | Üst düğmeler / görselleştirme |
|---|---|---|---|---|---|---|---|---|---|
| Main | Oscillator (1/2/S/Mix) | Table (S: Gain, Mix: Gain 1) | Position (S: Tone, Mix: Gain 2) | Filter Type (S: Octave, Mix: Gain Sub) | Frequency | Resonance | **Mod Time** | **Mod Amt** | Osc/Sub On, Filter Switch, Filter On, Add to Matrix; `mainbank_visualisation` |
| Oscillators | Oscillator | Category | Table | Position | Pitch | Effect Type | Effect 1 (Classic: Pulse Width, Modern: Warp, FM: Pitch) | Effect 2 (Sync / Fold / Amount) | `oscillators_visualisation` |
| Filters | Filter (1/2) | Filter On | Filter Type | Frequency | Resonance | Filter Circuit | Morph / Drive | Routing | Filter 1/2 Slope: 12dB/24dB |
| Global | Mono On | Glide / Poly Voices | Unison Mode | Unison Voices | Unison Amount | Transpose | — | Volume | Add to Matrix |
| Envelopes | Envelopes (Amp/Env2/Env3) | Env View | Attack / A Slope / Init | Decay / D Slope / Peak | Sustain | Release / R Slope / Final | Loop | — | Add to Matrix |
| LFOs | LFO (1/2) | LFO Type | Shape | Rate (S. Rate senkronda) | Amount | Attack | Offset | Retrigger | LFO Sync |
| Matrix | Mod Target Names | Current Mod Target | — | Amp Env | Env 2 | Env 3 | LFO 1 | LFO 2 | Back, Go to Amp Env…LFO 2 |
| MIDI | Mod Target Names | Current Mod Target | Velocity | Key | PB Range | Pressure | Mod Wheel | Random | Back |

Emülatördeki Figma LCD çiziminde görünen “Oscillator / Graph / Mod Time / 26 %” etiketleri Main bankla tutarlı. Push 3'ün bu bankaları birebir kullandığı doğrulanamadı (Bölüm Belirsizlikler).

---

## 2. Wavetable veri modeli

### 2.1 Tanımlar
- **Kare (frame):** tek periyotluk dalga, `N0 = 2048` örnek (float32).
- **Tablo:** `F` kare. Dahili tablolar için `F = 64`, içe aktarmada `F ≤ 256`.
- **Position** `p ∈ [0,1]` → kare indeksi `x = p·(F−1)`, `i = floor(x)`, `t = x − i`, `j = min(i+1, F−1)`.
- **Mip seviyesi** `L = 0..10`. Harmonik sayısı `H_L = min(1023, 1024 >> L)` → 1023, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1. Nyquist bin'i (k = N/2) her zaman 0 olur.

### 2.2 Bellek yerleşimi (tek `Float32Array` / tablo)
```
offset(L, f) = levelBase[L] + f * (len_L + G)      // G = 3 guard örnek (Vital: kExtraValues = 3)
frame verisi: [s0 … s(len−1), s0, s1, s2]           // wrap kopyaları → okumada & maskesi gerekmez
```

| Profil | `len_L` | Tablo başına bellek (64 kare) |
|---|---|---|
| **Kalite** (EarLevel: “tüm seviyeler 2048”) | 2048 | 11 × 64 × 2051 × 4 B ≈ **5,8 MB** |
| **Eco** | `max(256, 2048 >> L)` ve `H_L ≤ len_L/2 − 1` sınırı: L0=2048 (H 1023), L1=1024 (511), L2=512 (255), L3=256 (127), L4..10=256 | ≈ **1,5 MB** |

- Yalnızca kullanılan tablolar üretilir: 2 osilatör + önizleme LRU önbelleği (en fazla 4 tablo).
- UI tarafı LCD çizimi için her karenin L0 versiyonunun 128 noktalık küçültülmüş kopyasını tutar.

### 2.3 Dosya formatları (kullanıcı içe aktarma, opsiyonel)
- **Serum/Vital WAV:** RIFF içinde `clm ` chunk'ı, içerik `"<!>2048 01000000 wavetable (…)"`. İlk alan kare boyu, ikinci alanın ilk hanesi interpolasyon tipi (0 yok, 1 doğrusal crossfade, 2/3/4 spektral) [İKİNCİL].
- **Surge `.wt`:** `vawt` başlığı + WaveSize (u32), WaveCount (u16), Flags (u16), int16 veya float32 veri [İKİNCİL].
- **Ableton tarzı:** chunk yoksa ve uzunluk 2048'e bölünüyorsa 2048, değilse 1024 örnek/kare varsay (Ableton importu 1024 kullanır [İKİNCİL]). 1024'lük kareler FFT ile 2048'e yeniden örneklenir (sıfır dolgulu spektrum).
- Raw kapalıyken Ableton benzeri işlem [ÇIKARIM]:
  1. Sessizliği kırp.
  2. Her karenin FFT'sinde bin 0'ı sıfırla (DC).
  3. Kare sınırlarına 16 örneklik fade uygula (yalnız Raw ham yolunda).
  4. Faz hizala: komşu karenin temel harmonik fazına döndür, yani `X_k ← X_k · e^{−i k Δφ1}`.
  5. Tablo genelinde tepe değere normalize et.

---

## 3. Anti-aliasing: oktav başına mipmap

### 3.1 Üretim (FFT ile) [EarLevel]
Her kare için harmonik katsayılar `c_k` (cos) ve `s_k` (sin), `k = 1..1023`, tutulur. Seviye L için:
```
X[k] = (len_L/2) · (c_k − i·s_k)   (1 ≤ k ≤ H_L),   X[k] = 0 diğer
x[n] = IFFT(X)[n]                  // gerçel, x[n] = Σ c_k cos(2πkn/len) + s_k sin(2πkn/len)
```
- **Normalizasyon:** ölçek L0'ın tepe değerinden hesaplanır ve o karenin tüm seviyelerine **aynı katsayı** uygulanır (seviye geçişinde seviye sıçraması olmasın).
- **FFT kütüphanesi:** `fft.js` (MIT) veya `dsp.js` (MIT). Alternatif: ~60 satırlık radix-2 kod yazmak.
- **Maliyet:** 64 kare × 11 seviye = 704 IFFT (≤ 2048 nokta). JS'te tipik olarak < 150 ms [ÇIKARIM]. İş ana thread'de veya bir Worker'da yapılır, sonuç Transferable olarak worklet'e gönderilir.

### 3.2 Seviye seçimi
`inc = f/fs` (döngü/örnek). `f` burada efektif en yüksek temel frekanstır: pitch + unison detune + efekt çarpanı.

- **Relaxed (varsayılan, EarLevel “fs/3” mantığı):** tepe harmonik [fs/3, 2fs/3) aralığında kalır. Katlanan (alias) bileşenler ≥ fs/3'te kalır (48 kHz'de ≥ 16 kHz), duyulması zordur.
  ```
  fmax_L = (2/3)·fs / H_L          // seviye L'nin kullanılabileceği en yüksek f
  L = ilk L öyle ki f ≤ fmax_L     (L ∈ 0..10; bulunamazsa 10)
  ```
- **Strict (HQ):** `fmax_L = 0.5·fs / H_L`. Aliasing yok ama biraz daha donuk.
- **Seviye geçişinde tık önleme** (EarLevel yüksek oktavlarda geçiş tıklarını not eder): oktavın üst yarısında bir sonraki seviyeye crossfade:
  ```
  w = clamp( (log2(f / fmax_L) + 0.5) / 0.5 , 0, 1 )     // f = fmax_L·2^-0.5 → 0 ; f = fmax_L → 1
  y = (1−w)·read(L) + w·read(L+1)
  ```
- **Örnek** (fs = 48 kHz, f = 440 Hz, relaxed): `fmax_4 = 32000/64 = 500 Hz` → L = 4 (64 harmonik). Tepe harmonik 28,16 kHz, alias görüntüsü 19,84 kHz'te (> 16 kHz).

### 3.3 Faz akümülatörü ve okuma
- `phase` JS `number` (float64), `phase ∈ [0,1)`, her örnekte `phase += inc; if (phase >= 1) phase -= 1;`.
- **Doğrusal okuma** (EarLevel'e göre truncation'a göre belirgin iyileşme; 512'lik sinüs tablosunda hata ≈ −97 dB):
  ```js
  const x = phase * len; const i = x | 0; const fr = x - i;
  const a = T[o + i], b = T[o + i + 1];          // guard örnekleri sayesinde wrap yok
  y = a + (b - a) * fr;
  ```
- **Hermite 4 nokta** (HQ; Niemitalo, “x-form”):
  ```
  c0 = y0; c1 = 0.5(y1 − y−1); c2 = y−1 − 2.5y0 + 2y1 − 0.5y2; c3 = 0.5(y2 − y−1) + 1.5(y0 − y1)
  y = ((c3·fr + c2)·fr + c1)·fr + c0
  ```
  Bunun için bir ön-guard örneği gerekir: `G = 3`, frame başına 1 örnek önce.
- **Position (kareler arası):** `y = (1−t)·read(frame i) + t·read(frame j)`. Bu, Serum `clm` alanındaki “1 = linear crossfade” moduna karşılık gelir. Spektral morph (bin genliklerinin ve fazlarının interpolasyonu) opsiyoneldir, CPU pahalıdır.
- **Position yumuşatma:** mod kaynaklarından gelen `p` değeri 32 örnekte bir hesaplanır, aradaki örneklerde doğrusal rampa uygulanır.

### 3.4 Neden PeriodicWave değil?
`OscillatorNode` + `PeriodicWave` tarayıcının kendi band-limited uygulamasıdır. Spesifikasyon Nyquist üstünün atılmasını “MUST” olarak ister, ancak **kareler arası süpürme (Position) yok** ve dalga değişimi anlıktır (tık). Bu yöntem yalnızca AudioWorklet olmayan eski tarayıcılar için bir *fallback* olarak düşünülmelidir (sitedeki Ableton Lab node-graph synth'i gibi). Chrome'un `wavetable-synth` demosu bu yöntemi kullanır.

---

## 4. Prosedürel (telifsiz) kare üretimi

Tüm tablolar harmonik domeninde tanımlanır. Ortak konvansiyon: temel harmonik `+sin`, t = 0'da yükselen sıfır geçişi. Bu, morph sırasında faz iptalini önler.

| # | Tablo adı (öneri) | Kareler (F = 64) | Formül / yöntem |
|---|---|---|---|
| 1 | **Basic Shapes** (Ableton varsayılanı sine→tri→saw→square morph eder [İKİNCİL: SOS]) | 0–21: sine→tri, 21–42: tri→saw, 42–63: saw→square | sine: `s1 = 1`. tri: `s_k = (8/π²)(−1)^((k−1)/2)/k²` (tek k). saw: `s_k = (2/π)(−1)^(k+1)/k`. square: `s_k = 4/(πk)` (tek k). Ara kareler katsayıların doğrusal interpolasyonudur. |
| 2 | **Pulse Width** | w_j = 0,5 − 0,48·j/63 | EarLevel: `pulse(t;w) = saw(t) − saw(t−w)`. Yükselen `r(t)=2frac(t)−1` için: `s_k = −(2/(πk))(1−cos2πkw)`, `c_k = −(2/(πk)) sin2πkw`. DC = 0. |
| 3 | **Harmonic Sweep** | N_j = 1024^(j/63) | `s_k = 1/k` (k ≤ floor N_j) + son harmoniğe kesirli ağırlık `frac(N_j)`. Parlaklık kare kare açılır. |
| 4 | **Odd ↔ Even** | g_j = j/63 | `s_k = 1/k`. Çift harmonikler `(1−g_j)` ile çarpılır (saw → kare-benzeri). |
| 5 | **Vowels** (A-E-I-O-U) | 5 ünlü, aralar log-frekansta interpole | `f_ref = 130,81 Hz` (C3). `A_k = k^−0,5 · Σ_m G_m / sqrt(1 + ((k·f_ref − F_m)/(B_m/2))²)`, G = (1; 0,5; 0,25), B = (80; 90; 120) Hz. Formantlar (Peterson & Barney 1952, erkek ortalaması): /a/ 730/1090/2440, /ɛ/ 530/1840/2480, /i/ 270/2290/3010, /ɔ/ 570/840/2410, /u/ 300/870/2240. Formant sabit harmoniklerde olduğu için perdeyle kayar; wavetable doğası budur. |
| 6 | **FM Ratio** | β_j = 8·(j/63)², r = 2 | `y(t) = sin(2πt + β_j·sin(2π r t))`. 16384 örnekte (8× oversample) çiz → rFFT → k ≤ 1023 tut. |
| 7 | **Sine Fold** | g_j = 1 → 10 | **Kapalı form (Jacobi–Anger):** `sin(z·sinθ) = 2 Σ_{n tek} J_n(z)·sin(nθ)`. Dolayısıyla `s_n = 2·J_n(π g_j/2)` (tek n). Bessel serisi veya oversample + FFT ile hesaplanır. |
| 8 | **Sync Sweep** | ρ_j = 1 → 8 | `y(t) = sin(2π ρ_j·frac(t))`. Süreksiz olduğu için **mutlaka** 8× oversample + FFT + kesme. Doğrudan 2048'de çizilirse tablo içinde alias oluşur. |
| 9 | **Bitcrush** | Q_j = 64 → 2 | `y = round(saw·Q_j)/Q_j`. 8× oversample + FFT. |
| 10 | **Noise Spectra** | 8 anahtar kare, aralar interpolasyon | Tohumlu PRNG (mulberry32, seed = tablo id). `A_k = u_k·k^(−α_j)`, α: 2 → 0,3. Rastgele fazlar anahtar kareler arasında sabit tutulur (faz iptali olmasın). |
| 11 | **Drawbars** | 8 registrasyon | Harmonik 1, 2, 3, 4, 6, 8 (8', 4', 2⅔', 2', 1⅓', 1') ağırlıkları `(0..8)/8`. |

**Genel boru hattı:**
1. Katsayıları hesapla.
2. Mip seviyelerini üret (Bölüm 3.1).
3. Normalize et. Şekil morph tablolarında kare başına tepe = 0,9. Tımbr süpürme tablolarında tablo genelinde tepe = 0,9 (doğal ses seviyesi değişimi korunur) [ÇIKARIM].
4. Kategori adları Ableton'ı birebir kopyalamaz (telif ve marka). “Temel”, “Harmonik”, “Vokal”, “FM”, “Gürültü” gibi kendi adlarımız kullanılır.

---

## 5. Osilatör efektleri: DSP karşılıkları

Ableton yalnızca davranışı tarif eder, algoritmayı açıklamaz. Aşağıdaki algoritmalar **[ÇIKARIM]**, fikirler Vital (GPL-3) kodundan alındı. Kod kopyalanmaz.

Parametre slotları `fx1`, `fx2 ∈ [0,1]` (Tune için `[−1,1]`). Efekt tipi değişince değerler korunur [RESMİ]. Push etiketleri: FM → Effect 1 “Pitch”, Effect 2 “Amount”; Classic → “Pulse Width”, “Sync”; Modern → “Warp”, “Fold”.

### 5.1 FM (gizli sinüs modülatörü, faz modülasyonu)
```
r   = 2^(2·tune)              // tune=±0.5 → ×2/×½, ±1 → ×4/×¼  (resmi çapa noktalarından geçer)
β   = 2π · 2.0 · amt²         // en fazla ≈ 12.6 rad; amt² eğrisi Vital'in FM amount'u karelemesinden esinlendi
φm += r·inc                   // modülatör fazı (her unison sesi için ayrı; Ableton da ses başına modülatör açar)
φr  = frac(φ + (β/2π)·sin(2π φm))
y   = readWT(φr)
```
**Aliasing:** Carson kuralı BW ≈ 2(Δf + f_m). Mip seçimi için `f_eff = f0 · max(1,r) · (1 + 0.5·β)` kullanılır [ÇIKARIM, kulakla ayarlanacak]. HQ modunda 2× oversampling opsiyoneldir.

### 5.2 Classic — PW (her tabloya uygulanabilir)
Vital `pulseWidthPhase` fikri: dalga periyodun `(1−w)` kısmına sıkıştırılır, kalan kısım sessizdir.
```
w  = 0.98·pw;  s = 1/(1−w)
φc = φ − 0.5                   // merkezli faz ∈ [−0.5, 0.5)
u  = φc·s
y  = (|u| < 0.5) ? readWT(u + 0.5) : 0
```
Mip seçimi `f0·s` ile yapılır. Pencere kenarındaki süreksizlik için polyBLEP opsiyoneldir.

### 5.3 Classic — Sync (gizli master)
```
ρ  = 2^(2·sync)                // %100 = 2 oktav [İKİNCİL: SOS]; Vital en fazla ×16 kullanır
φs = frac(φ·ρ)                 // φ = nota fazı (master), okunan faz slave
y  = readWT(φs)
```
- Mip seçimi `f0·ρ` ile yapılır. Vital sync/formant için bin seçimini ×16 (kMaxSync) ile kaydırır.
- Master reset anındaki sıçrama `Δ = readWT(0) − readWT(frac(ρ))` polyBLEP ile düzeltilir (Finke/Tale; lisans WDL/IPlug):
  ```
  dt = inc
  blep(t): t<dt → x=t/dt; b = 2x − x² − 1
           t>1−dt → x=(t−1)/dt; b = x² + 2x + 1
           aksi 0
  y += (Δ/2)·blep(φ)
  ```
  Kontrol: naive testere için Δ = −2 → `y − blep`, yani Finke'nin formülü.

### 5.4 Modern — Warp (“PW'ye benzer”, dalganın döngü içindeki dağılımını değiştirir)
İki segmentli faz eğme (Casio CZ tipi phase distortion). Süreklidir, süreksizlik yaratmaz:
```
d  = 0.5 − 0.49·warp
φw = φ < d ? 0.5·φ/d : 0.5 + 0.5·(φ − d)/(1 − d)
y  = readWT(φw)
```
Mip seçimi `f0 · 0.5/d` ile yapılır (maksimum eğim çarpanı). Alternatif: Vital `bendPhase` kübik eğrisi.

### 5.5 Modern — Fold (wavefolder) — en pahalı efekt [RESMİ help]
Sinüs katlayıcı + **ADAA1** (Parker, Zavalishin, Le Bivic, DAFx-16; Esqueda ve ark. 2017 wavefolder'larda birinci derece antiderivative önerir):
```
g  = 1 + 7·fold;  u = g·x
f(u)  = sin(π/2·u)            F1(u) = −(2/π)·cos(π/2·u)
y[n]  = |u[n]−u[n−1]| > 1e−5 ? (F1(u[n]) − F1(u[n−1]))/(u[n] − u[n−1]) : f((u[n]+u[n−1])/2)
çıkış = lerp(x, y, min(1, 10·fold))     // %0'da şeffaf
```
- Alternatif üçgen katlayıcı: `tri(u) = 1 − 4·|frac((u+1)/4) − 0.5|`.
- HQ modunda ek 2× oversampling. ADAA yarım örnek gecikme ve hafif lowpass getirir, önemsizdir.
- Faust `aanl.lib` hazır ADAA fonksiyonları içerir (referans olarak).

### 5.6 Sub osilatör
```
f_sub = f0 · 2^(−oct)       (oct ∈ {0,1,2})
k     = 1 + 9·tone
y     = tanh(k·sin(2π φ)) / tanh(k)          // tone=0 → saf sinüs [RESMİ davranış]
```
Sadece tek harmonikler vardır ve hızla söner. Sub frekansında aliasing pratikte yoktur [ÇIKARIM].

---

## 6. Filtreler (ses başına, stereo)

### 6.1 Cytomic trapez SVF (Clean, 12 dB) — Simper, birebir algoritma
```
g  = tan(π·fc/fs);  k = 2 − 2·res;       // res ∈ [0, 0.98] → k ≥ 0.04 (Q ≤ 25) [sınır: ÇIKARIM]
a1 = 1/(1 + g(g + k));  a2 = g·a1;  a3 = g·a2
tick:  v3 = v0 − ic2eq
       v1 = a1·ic1eq + a2·v3
       v2 = ic2eq + a2·ic1eq + a3·v3
       ic1eq = 2·v1 − ic1eq;  ic2eq = 2·v2 − ic2eq
low = v2;  band = v1;  high = v0 − k·v1 − v2;  notch = v0 − k·v1;  peak = v0 − k·v1 − 2·v2
```
- Audio-rate modülasyona uygundur (ZDF).
- `fc` aralığı `[20, min(20000, 0.45·fs)]`.
- `g, k, a*` 32 örnekte bir hesaplanır, aradaki örneklerde doğrusal interpolasyon.

### 6.2 24 dB (Clean)
İki SVF kaskadı, aynı `fc`:
- 1. kat Q = 0,5412 (sabit).
- 2. kat Q = 1,3066 + res·(25 − 1,3066).
- res = 0 iken 4. derece Butterworth elde edilir [ÇIKARIM]. `Q → k = 1/Q`.

### 6.3 Morph (LP → BP → HP → Notch → LP) [sıra RESMİ]
```
m ∈ [0,1); seg = floor(4m); t = 4m − seg
out = [low, k·band, high, notch, low]      // k·band: BP tepe kazancı 1'e normalize
y   = (1−t)·out[seg] + t·out[seg+1]
```

### 6.4 PRD (ladder) — Zavalishin TPT 4 kutup
```
g = tan(π fc/fs); G = g/(1+g)                  // tek kutup anlık kazanç
her kat: y_i = G·x_i + S_i,  S_i = s_i/(1+g)   // s_i durum
Gtot = G⁴;  S = G³S1 + G²S2 + G·S3 + S4
u = (x − k·S)/(1 + k·Gtot)                     // lineer ZDF çözümü, k ∈ [0,4]; k ≥ 4 self-osc
u = tanh(drive·u)                               // “cheap method”: doğrusal çöz, sonra nonlineerliği uygula
her kat: v = (x_i − s_i)·G; y = v + s_i; s_i = y + v
```
- Zavalishin: k ≥ 4'te filtre kararsızdır. Doyurucu (tanh) geri besleme noktasına konursa self-oscillation mümkün olur. Bu, PRD'nin “açık rezonans sınırı yok” tarifine uygundur.
- 12 dB PRD için 2. kat çıkışı (y2) alınabilir [ÇIKARIM].

### 6.5 Diğer devreler (yaklaşık karşılıklar) [ÇIKARIM]
| Ableton devresi | Bizim modelimiz |
|---|---|
| OSR | SVF + band durumunda hard clip: `ic1eq = clamp(ic1eq, −1.2, 1.2)` |
| MS2 | SVF + band durumunda soft clip: `ic1eq = tanh(ic1eq)` |
| SMP | MS2 ile PRD arası: SVF + `x/(1+|x|)` doyurucu + hafif drive |

- **Drive:** `x·10^(drive_dB/20)`, drive_dB ∈ [0, 24] → tanh → filtre → `÷ sqrt(gain)` telafisi. Clean ve Notch/Morph'ta gizlenir [RESMİ kural].

### 6.6 Routing
Bölüm 1.1'deki resmi semantik uygulanır. Parallel'de çıkış `0.5·(F1 + F2)` [ÇIKARIM].

---

## 7. Zarflar, LFO'lar ve matris

### 7.1 Zarf
- Amp zarfı örnek başına güncellenir. Env2/3 32 örnekte bir güncellenir ve interpolasyonla uygulanır.
- Segment ilerlemesi `x ∈ [0,1]` (doğrusal zaman), slope `s ∈ [−1,1]`:
  ```
  curve(x,s) = s>0 ? 1 − (1−x)^(1+4s) : s<0 ? x^(1+4|s|) : x     // pozitif: hızlı başla; negatif: düz kal sonra hızlan [RESMİ tarif, formül ÇIKARIM]
  value = start + (end − start)·curve(x, s)
  ```
- Segmentler:
  - A: Initial → Peak (Amp için 0 → 1).
  - D: Peak → Sustain.
  - R: *o anki değer* → Final (Amp için → 0).
- Loop: `Trigger` → sustain'e ulaşınca doğrudan R'ye geçer. `Loop` → R bitince o anki değerden A'ya döner, ses bitene kadar sürer.
- Önerilen süre aralıkları (Ableton aralıkları doğrulanamadı): A 0–20 s, D 1 ms–60 s, R 1 ms–60 s, logaritmik taper.
- Alternatif (analog tarzı üstel, EarLevel ADSR):
  ```
  coef = exp(−ln((1+ratio)/ratio)/rateSamples)
  attackBase = (1+ratioA)(1−coef)
  y = base + y·coef
  ```
  ratio: 0,0001–0,01 üstel, ~100 neredeyse doğrusal.
- Ses bitişi: Amp < 1e−4 (−80 dB) ve R safhasındaysa ses boşa çıkar (idle).

### 7.2 LFO
- `phase += rate/fs`. Senkron modda `rate = BPM/60 / beatsPerCycle`.
- Önerilen Hz aralığı 0,01–40 (log). Sync bölümleri: 1/64, 1/32, 1/16T, 1/16, 1/8T, 1/8, 1/4T, 1/4, 1/2, 1, 2, 4, 8 bar [ÇIKARIM].
- Shape `h ∈ [0,1]` [RESMİ tarif, formüller ÇIKARIM]:
  - Triangle: `w = 1−h`; `y = p<w ? −1 + 2p/w : 1 − 2(p−w)/(1−w)`.
  - Square: `y = p < (0.01 + 0.98h) ? 1 : −1`.
  - Sine/Saw: faz eğme `p' = p^(2^(4(h−0.5)))` ile artan veya azalan eğim.
  - Random: döngü başına S&H, `v = sign(u)·|u|^(2^(4(0.5−h)))`, `u ∈ U(−1,1)`.
- Attack: note-on'dan sonra 0 → 1 kazanç rampası.
- Offset: başlangıç fazı (0–360°).
- Retrigger: açıksa ses başına faz her notada sıfırlanır, kapalıysa global serbest faz.

### 7.3 Matris
- Kaynaklar: Amp Env, Env2, Env3, LFO1, LFO2, Velocity (0..1), Note = `(nota − 60)/12` oktav (C3 = 60 merkez), Pitch Bend (±1), Aftertouch, Mod Wheel, Random (note-on'da U(0,1)).
- **Additive:** `v = base + Σ amt_i·src_i·range(param)`.
- **Multiplicative:** `v = base · Π (1 − |amt_i| + |amt_i|·src_i^u)`, `src^u` = unipolar (LFO için `(x+1)/2`), sonuç ≥ 0 [RESMİ kural, eşleme ÇIKARIM].
- Global `Amount` tüm `amt_i` değerlerini çarpar.
- `Time`: tüm zarf ve LFO sürelerini `2^(3·Time)` ile ölçekler (Time ∈ [−1,1] → ×⅛…×8) [ÇIKARIM]. Push Main bankta bu “Mod Time”dır.
- Filtre frekansı oktav cinsinden modüle edilir: `fc = base·2^(Σ...)`. Note kaynağı %100 → tam key-tracking.

---

## 8. Polifoni, unison, glide

### 8.1 Ses havuzu ve voice stealing
- Havuz = `polyVoices` (2–8, varsayılan 8) + 4 “kuyruk” slotu. Tüm nesneler başlangıçta yaratılır (GC olmaz).
- Note-on algoritması:
  1. Aynı nota çalıyorsa o sesi yeniden tetikle (zarf o anki değerden başlar).
  2. Boş ses varsa onu kullan.
  3. Yoksa R safhasındaki en düşük seviyeli sesi çal.
  4. Yoksa en yaşlı basılı sesi çal, **en alt ve en üst tutulan notalar korunur** (JUCE `findVoiceToSteal` varsayılanı).
- Çalınan ses bir kuyruk slotuna taşınır ve **3 ms** (48 kHz'de 144 örnek) doğrusal fade ile susturulur. Yeni nota hemen başlar (tık olmaz).
- **Mono:** son-nota öncelikli nota yığını. Basılıyken yeni nota gelirse pitch değişir, zarf yeniden tetiklenmez (legato; RESMİ: “legato envelopes”). Bırakılan nota yığında başka nota varsa önceki notaya döner.
- **Glide** (yalnız Mono, RESMİ): sabit süreli, yarım ton domeninde doğrusal. `semis += (target − start)/glideSamples`. Önerilen aralık 0–2000 ms.

### 8.2 Unison (osilatör başına n = 2..8 ses, her birinin kendi fazı var)
Ortak kurallar:
- `gain = 1/sqrt(n)`.
- Başlangıç fazları rastgele (Szabo: Super Saw fazları serbest ve rastgele).
- `pan_i` eşit güç yasasıyla: `L = cos((pan+1)π/4)`, `R = sin(...)`.

| Mod | Detune `d_i` (cent), i = 0..n−1, `e_i = 2i/(n−1) − 1` | Pan | Diğer |
|---|---|---|---|
| Classic | `A·50·e_i` | dönüşümlü −W, +W (RESMİ: “alternating”) | — |
| Shimmer | `A·30·ξ_i(t)`. ξ her 50–150 ms'de yeni U(−1,1) hedefi, 20 ms yumuşatma | dönüşümlü | pos ± 0,02·A·ξ |
| Noise | Shimmer gibi ama hedef her 1–3 ms'de yenilenir | dönüşümlü | pos ± 0,02·A·ξ |
| Phase Sync | Classic gibi | dönüşümlü | note-on'da **tüm fazlar = 0** |
| Position Spread | `A·5·e_i` | dönüşümlü | `pos_i = pos + 0.5·A·e_i` (clamp) |
| Random Note | note-on'da `A·50·U(−1,1)` | dönüşümlü | note-on'da `pos_i = pos + 0.5·A·U(−1,1)` |

(Mod tarifleri RESMİ, sayılar ÇIKARIM.) Daha gerçekçi dağılım için referans: Szabo'nun JP-8000 Super Saw ölçümü.
- 7 osilatör ofsetleri: −0,11002313; −0,06288439; −0,01952356; 0; +0,01991221; +0,06216538; +0,10745242.
- Mix eğrileri: merkez `−0,55366x + 0,99785`, yanlar `−0,73764x² + 1,2841x + 0,044372`.
- Detune eğrisi 11. dereceden polinomdur (tezde verilmiştir).
- Vital sabitleri: `kCenterLowAmplitude = 0.4`, `kDetunedHighAmplitude = 0.6`, `kMaxUnison = 16`.

**Mip seçimi unison için:** en yüksek detune'lu sesin frekansı kullanılır (tek seçim, tüm unison sesleri paylaşır).

---

## 9. Yumuşatma, denormal, çıkış güvenliği

- **Parametre yumuşatma:** UI'dan gelen hedefler için tek kutuplu lowpass `b1 = exp(−2π·fc/fs)`, `a0 = 1 − b1`, fc ≈ 30 Hz (τ ≈ 5 ms; EarLevel: “de-zipper” için alt-ses frekansı). Daha ucuz alternatif: 128'lik blok boyunca doğrusal rampa. Pitch yumuşatması cent domeninde yapılır, Hz'de yapılmaz.
- **Denormal:**
  - JS sayıları float64 olduğu için denormal eşiği ~2e−308'dir, ama `Float32Array`'e yazılan durumlarda ~1e−38'dir.
  - EarLevel önerisi: ~1e−15 (−300 dB) mertebesinde küçük DC eklemek.
  - Pratik çözüm: her blok sonunda filtre ve reverb durumları için `if (Math.abs(s) < 1e-15) s = 0`. Idle seslerin işlenmemesi zaten büyük kısmı çözer.
- **DC blocker (master):** `y = x − x1 + R·y1`, `R = 1 − 2π·10/fs` (≈ 0,99869 @ 48k).
- **Master koruma:** `out = tanh(1.2·x)/1.2` yumuşak sınırlayıcı. Ses başı ön kazanç 0,25 [ÇIKARIM].

---

## 10. AudioWorklet mimarisi (SharedArrayBuffer olmadan)

### 10.1 Dosyalar
| Dosya | İçerik |
|---|---|
| `assets/js/push3-wt-engine.js` | Ana thread: AudioContext kurulumu, tablo üretimi (veya Worker), mesaj API'si, sequencer |
| `assets/js/push3-wt.worklet.js` | `registerProcessor('push3-wavetable', …)` |
| `assets/js/push3-wt-tables.worker.js` | Opsiyonel: FFT ile mip üretimi |

**Firebase notu:** `firebase.json`'daki `"**" → /index.html` rewrite'ı yüzünden worklet yolu yanlışsa HTML döner. `addModule` bu durumda SyntaxError verir, yol dikkatle kontrol edilmeli. Sitede `ableton-lab.html` Blob-URL ile `addModule` yapıyor; bu da çalışır, ama statik dosya daha taşınabilirdir.

### 10.2 Başlatma (ana thread)
```js
if ('audioSession' in navigator) navigator.audioSession.type = 'playback'; // iOS sessiz tuşu; AudioContext'ten ÖNCE
const ctx = new AudioContext({ latencyHint: 'interactive' });           // renderSizeHint verme (yalnız Chrome 153+)
await ctx.audioWorklet.addModule('/assets/js/push3-wt.worklet.js');
const node = new AudioWorkletNode(ctx, 'push3-wavetable', {
  numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
  processorOptions: { maxVoices: 8, spare: 4, quality: isMobile ? 'eco' : 'hq' }
});
node.connect(ctx.destination);
// ilk dokunuşta:
padEl.addEventListener('pointerdown', () => ctx.state !== 'running' && ctx.resume(), { once: true });
```

### 10.3 Mesaj protokolü
| Yön | Mesaj | Not |
|---|---|---|
| UI→W | `{t:'table', id, F, levels:[{len,H}], buf:Float32Array}` | `postMessage(msg,[msg.buf.buffer])`: **Transferable**, kopya yok |
| UI→W | `{t:'on', n, v, at}` / `{t:'off', n, at}` | `at` = `ctx.currentTime` tabanlı zaman. 0 = hemen |
| UI→W | `{t:'p', i:Uint16Array, v:Float32Array}` | Parametre toplu güncelleme. Encoder hareketleri rAF ile ≤ 60 Hz'e birleştirilir |
| UI→W | `{t:'panic'}` | Tüm sesler 3 ms'de söner |
| W→UI | `{t:'meter', l, r, voices, pos1, pos2}` | Her 12 blokta bir (~31 Hz @48k). LCD'de Position ve seviye çizimi için |

- `port.onmessage` worklet'te **ses thread'inde** çalışır. İşleyici hafif tutulmalı: gelen olayı önceden ayrılmış bir halka kuyruğuna yazıp çıkmalı.
- Chrome ekibi MessagePort'un tahsis ve gecikme maliyetine dikkat çeker. Kontrol hızındaki mesajlar için bu kabul edilebilir [ÇIKARIM].

### 10.4 Örnek-doğru zamanlama
- Worklet global'leri: `currentTime`, `currentFrame`, `sampleRate`.
- Olay ofseti: `off = Math.round((at − currentTime)·sampleRate)`, `[0, n−1]` aralığına sıkıştırılır. `off ≥ n` ise olay kuyrukta bir sonraki bloğa kalır.
- `process()` bloğu olay ofsetlerinde alt bloklara bölerek render eder.
- Sequencer (Push step sequencer, Session klipleri) Chris Wilson'ın “A Tale of Two Clocks” desenini kullanır: **25 ms** `setTimeout` aralığı, **100 ms** ileriye zamanlama. Olaylar ileri tarihli `at` ile gönderilir. Sitede Ableton Lab'in beat motoru zaten lookahead scheduler kullanıyor.

### 10.5 `process()` iskeleti
```js
process(_, outputs) {
  const L = outputs[0][0], R = outputs[0][1], n = L.length;   // 128 varsayma!
  let s = 0;
  while (s < n) {
    const e = this.q.peekDue(currentFrame + s, currentFrame + n); // sıradaki olayın mutlak frame'i
    const end = e ? e.frame - currentFrame : n;
    for (let c = s; c < end; c += CTRL) {                       // CTRL = 32
      const m = Math.min(c + CTRL, end);
      this.updateControl();                                     // env2/3, LFO, matris, g/k, mip seçimi
      for (let v = 0; v < this.nActive; v++) this.voices[this.active[v]].render(L, R, c, m);
    }
    if (e) this.apply(this.q.pop());
    s = end;
  }
  this.master(L, R, n);  // DC blocker + soft limiter
  return true;           // kaynak node: sürekli canlı
}
```
- `process()` içinde **tahsis yok** (`new`, dizi, closure yok). Tüm tamponlar kurucuda `Float32Array` olarak ayrılır.
- Hata olursa node sessize düşer ve `processorerror` olayı gelir. UI bunu dinleyip motoru yeniden kurmalı.

### 10.6 WASM (sonraki faz, opsiyonel)
- Casey Primozic deseni: `.wasm` baytları ana thread'de fetch edilir, `postMessage` ile worklet'e gönderilir, worklet içinde `WebAssembly.instantiate` edilir.
- 128 örneğin tamamı tek wasm çağrısıyla işlenir. Modül `wasm-opt -O4` + strip sonrası ~6,5 KB gzip.
- Chrome örneği `wasm-supersaw`: Emscripten ≥ 3.1.48, FreeQueue.
- Nihai ölçüm yapılmadan WASM'a geçilmemeli. JS sürümü 8 poly için muhtemelen yeterli [ÇIKARIM].

---

## 11. CPU bütçesi [ÇIKARIM: tahmin, mutlaka ölçülmeli]

- Blok süresi: 128/48000 = **2,667 ms**. Hedef: ortalamada ≤ %40 (≈ 1,07 ms), en kötü durumda ≤ %70.
- Unison-osilatör-örneği başına tahmini iş:
  - faz güncelleme + 4 okuma + 3 lerp + pan ≈ 20–25 JS işlemi → masaüstü V8'de ~10–20 ns, orta segment mobilde ~40–80 ns.
  - mip crossfade bölgesinde ×1,6; FM ×1,5; Fold+ADAA ×2 (+2× OS ise ×4).
- SVF stereo ≈ 2 × 15 işlem/örnek.

| Senaryo | Unison-osc sayısı | Masaüstü tahmini (% tek çekirdek) | Mobil tahmini |
|---|---|---|---|
| 8 ses × 2 osc × 1 unison, 2 SVF | 16 | ~1–2 % | ~4–8 % |
| 8 × 2 × 4 | 64 | ~4–8 % | ~15–30 % |
| 8 × 2 × 8 (Ableton'ın uyardığı durum) | 128 | ~8–15 % | ~30–60 % ⚠ |
| 16 × 2 × 8 (görevdeki üst sınır) | 256 | ~15–30 % | kabul edilemez |

**Uyarlamalı kalite:**
- `quality='eco'` (mobil varsayılan, `navigator.maxTouchPoints > 0 && innerWidth < 1024` gibi bir sezgi):
  - unison sınırı 4
  - toplam unison-osc tavanı 48; aşılırsa yeni notalarda unison otomatik düşer
  - Fold'da yalnız ADAA
  - Hermite yok
  - Strict mip yok
- HQ (masaüstü): Hermite + 2× OS Fold, unison tavanı 128.
- Worklet içinde 32 blokluk ortalama süre `Date.now()` ile kaba olarak ölçülebilir. 3 ardışık aşımda kalite bir kademe düşer.
- Chrome DevTools WebAudio paneli “render capacity” gösterir (geliştirme sırasında kullanılmalı).

---

## 12. Mobil Safari kontrol listesi
1. AudioWorklet Safari 14.1'den beri var (WebKit). Eski cihazlar için PeriodicWave fallback'i tutulmalı.
2. `AudioContext` yalnızca kullanıcı hareketinde (`pointerdown`/`touchend`) `resume()` edilir.
3. Sessiz tuş: `navigator.audioSession.type = 'playback'` AudioContext oluşturulmadan önce ve bir kez ayarlanır. Özellik tespitiyle kullanılır (API deneysel; iOS 16 ve öncesinde yok).
4. `sampleRate` sabitlenmez. iOS genelde 48 kHz; tüm katsayılar `sampleRate` global'inden hesaplanır.
5. Arka plana geçişte `ctx.suspend()`, geri dönüşte `resume()`. `statechange` 'interrupted' durumu ele alınır.
6. Blob-URL yerine statik worklet dosyası tercih edilir [ÇIKARIM: Safari'de Blob-URL addModule davranışı doğrulanmadı].
7. Pad dokunuşlarında `touch-action: none` ve pointer events kullanılır (gecikme ve kaydırma olmasın).

---

## 13. Açık kaynak referanslar (lisans ve alınacak fikir)

| Proje | Lisans | Ne alınabilir | Dikkat |
|---|---|---|---|
| EarLevel Engineering wavetable serisi + C++ kodu | Sayfada lisans bulunamadı | Mip yapısı (`topFreq` tablosu), 2048 kare, fs/3 kuralı, FFT ile kesme | Kod değil, yöntem alınır |
| mtytel/vital | **GPL-3.0** | 2048 kare, 3 guard örnek, PW/bend/squeeze/sync faz eğme fikirleri, sync için ×16 bin kaydırma, unison genlik sabitleri, 7 ms tablo geçiş fade'i (`kWavetableFadeTime`) | Kod kopyalanırsa site JS'i GPL olur. Yalnızca fikir alınır |
| surge-synthesizer/surge | GPL-3.0 | `.wt` formatı, wavetable osilatör fikirleri | Aynı GPL uyarısı |
| GoogleChromeLabs/web-audio-samples | Apache-2.0 (bazı dosyalarda BSD başlığı) | AudioWorklet desenleri (message-port, wasm, FreeQueue, wasm-supersaw), PeriodicWave wavetable demo | Doğrudan kullanılabilir (atıf ile) |
| looshi/wavetable-synth-2 | MIT | PeriodicWave tabanlı web wavetable synth, arpeggiator ve UI fikirleri | Position morph yok |
| Ameobea/web-synth | GPL (LICENSE: GPL v2 veya sonrası, Faust türevi) | Rust→WASM worklet, WaveEdit tablo yükleme, IFFT ile dalga üretimi | GPL |
| cprimozic.net makalesi | Makale | WASM'ı worklet'e taşıma, çok boyutlu wavetable interpolasyonu | Makalede band-limit yok |
| AndrewBelt/WaveEdit | GPL-3.0 | 64 × 256 örnek tablo formatı (E352), eğitim amaçlı düzenleyici fikirleri | — |
| martinfinke/PolyBLEP | WDL/IPlug (dosya başlığı; izin verici) | polyBLEP ve polyBLAMP polinomları | — |
| indutny/fft.js · corbanbrook/dsp.js | MIT · MIT | Mip üretimi için FFT | — |
| Faust `aanl.lib` | Faust kütüphaneleri (lisans sayfada açık değil) | ADAA1/ADAA2 hazır fonksiyonları (sine, tanh, hardclip…) | Referans olarak |
| Tone.js / Elementary | MIT / MIT | Zamanlama ve Transport fikirleri | Motor olarak gerekli değil |
| Ableton Learning Synths | Tescilli | Pedagojik akış (öğretici mod ilhamı) | Yalnız fikir |

---

## 14. Parametre tablosu (motor ↔ Push bankaları)

Aralıklar ve varsayılanlar **öneridir**; Ableton'ın gerçek sayısal aralıkları doğrulanamadı.

| ID | Parametre | Aralık | Varsayılan | Tip |
|---|---|---|---|---|
| 0/20 | Osc1/2 On | 0/1 | 1 / 0 (Ableton varsayılanında yalnız Osc1 açık [İKİNCİL]) | — |
| 1/21 | Table | 0..T−1 | 0 (“Basic Shapes” karşılığı) | enum |
| 2/22 | Position | 0..1 | 0 | additive |
| 3/23 | Semi | −48..+48 st | 0 | additive |
| 4/24 | Detune | −50..+50 cent | 0 | additive |
| 5/25 | Gain | 0..1 (−∞..0 dB) | 0,7 | multiplicative |
| 6/26 | Pan | −1..1 | 0 | additive |
| 7/27 | Effect Type | None/FM/Classic/Modern | None | enum |
| 8/28 | Effect 1 (Tune/PW/Warp) | FM: −1..1, diğer 0..1 | 0 | additive |
| 9/29 | Effect 2 (Amt/Sync/Fold) | 0..1 | 0 | additive |
| 40–43 | Sub On / Gain / Tone / Octave | — / 0..1 / 0..1 / 0,−1,−2 | 0 / 0,5 / 0 / 0 | — |
| 50–57 | F1 On, Type, Circuit, Slope, Freq, Res, Drive, Morph | —, LP/HP/BP/Notch/Morph, Clean/OSR/MS2/SMP/PRD, 12/24, 20–20k Hz (log), 0..1, 0–24 dB, 0..1 | 1, LP, Clean, 12, 20k, 0, 0, 0 | freq/res additive |
| 60–67 | F2 aynısı | — | 0 (kapalı) | — |
| 70 | Routing | Serial/Parallel/Split | Serial | enum |
| 80–99 | Amp/Env2/Env3: A, D, S, R, A/D/R Slope, Initial, Peak, Final, Loop | yukarıdaki aralıklar | Amp: 0 ms, 600 ms, 1,0, 50 ms | S multiplicative |
| 100–115 | LFO1/2: Type, Shape, Sync, Rate, Amount, Attack, Offset, Retrig | — | Sine, 0,5, off, 1 Hz, 1, 0, 0, off | Amount multiplicative |
| 120 | Mod Time | −1..1 | 0 | — |
| 121 | Mod Amount | 0..1 | 1 | multiplicative |
| 130–137 | Transpose, Volume, Mono, Poly Voices, Glide, Unison Mode, Unison Voices, Unison Amount | ±48, 0..1, 0/1, 2..8, 0–2000 ms, 7 enum, 2..8, 0..1 | 0, 0,7, 0, 8, 0, None, 2, 0,25 | Volume ve Unison Amount multiplicative |
| 140 | Quality | eco/hq | cihaza göre | — |

Push encoder'ları bu ID'lere Bölüm 1.2'deki banka düzeniyle eşlenir. LCD'de her banka için 8 etiket + değer gösterilir. Main ve Oscillators bankasında wavetable görselleştirmesi (Linear veya Polar) çizilir.

---

## 15. Doğrulama ve test planı
1. **Aliasing:**
   - Basic Shapes'te saw karesi, C0 → C8 glissando. `AnalyserNode` fftSize 32768, relaxed modda fs/3 altında aşağı inen kısmi olmamalı; strict modda hiç olmamalı.
   - Aynı test Sync %100, PW %90, Warp %100, Fold %100 ile tekrarlanır.
2. **Mip geçişi:** 1 oktavlık yavaş glide sırasında tık olmamalı. Crossfade kapalı ve açık dinlenerek karşılaştırılır.
3. **Position:** 0 → 1 LFO taraması (0,2 Hz) sırasında faz iptali ve dip olmamalı (faz hizalama testi).
4. **Zamanlama:** 16'lık notalar 128 BPM'de, AudioWorklet çıktısı `OfflineAudioContext` ile kaydedilir. Onset sapması < 1 örnek olmalı.
5. **CPU:** 8 × 2 × 8 unison + 2 PRD filtre, Chrome DevTools render capacity ölçümü. iPhone (A14 ve üstü) ve orta segment Android'de eco profili ölçülür.
6. **Stealing:** 9. nota basıldığında tık olmamalı. En alt ve en üst nota korunmalı.
7. **Denormal:** 60 s sessizlik sonrası CPU artışı olmamalı.


## BULGULAR
- [resmi/yuksek] Ableton Wavetable: 2 wavetable osilatörü + sub, 2 filtre. Modülasyon yoksa osilatör çıkışı tam band-limited ve aliasing'siz. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Osilatör efektleri: FM (Amt, Tune; Tune %50 = 1 oktav, %100 = 2 oktav, arası inharmonik), Classic (PW her wavetable'a uygulanır; Sync fazı resetleyen gizli osilatör), Modern (Warp 'pulse width'e benzer', Fold wavefolding). Efekt tipi değişince iki parametrenin değeri korunur. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Sub osilatör: Tone %0'da saf sinüs, arttıkça harmonik eklenir. Octave anahtarlarıyla 1 veya 2 oktav aşağı kaydırılır. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Filtre tipleri LP/HP/BP/Notch/Morph, 12/24 dB. Devreler: Clean (EQ Eight ile aynı), OSR (SVF, hard-clip diyotla sınırlı rezonans), MS2 (Sallen-Key + soft clip, LP/HP), SMP (MS2 ile PRD arası, LP/HP), PRD (ladder, rezonans sınırı yok, LP/HP). Drive yalnız LP/HP/BP'de ve Clean dışı devrelerde var. Morph sırası LP→BP→HP→Notch→LP. Filtreler Cytomic ile geliştirildi. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Routing: Serial (tüm osilatörler F1→F2, sub her ikisine), Parallel (iki ana osilatör F1 ve F2'ye), Split (Osc1→F1, Osc2→F2, sub yarıya bölünür; filtre kapalıysa osilatör yine duyulur). (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Matris: additive hedeflerde kaynaklar toplanıp değere eklenir (nötr 0); multiplicative hedeflerde çarpılır (nötr 1, min 0). Time tüm modülatör sürelerini ölçekler; Amount matrisin genel miktarıdır. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Zarflar: Amp, Env2, Env3. Slope pozitifse başta hızlı, negatifse önce düz, 0'da doğrusal. Env2/3'te Initial, Peak, Final var. Loop modları None, Trigger, Loop. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] LFO ×2: Sine/Saw, Triangle (Ramp↔Saw simetri), Square (PW), Random (uç değer dağılımı) ve Shape ayarı. Sync, Rate, Amount (multiplicative), Offset (modüle edilemez), Attack, Retrigger. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] MIDI kaynakları: Velocity, Note (C3 merkezli; Filter Freq'e %100 atanırsa tam key-tracking), Pitch Bend, Aftertouch, Mod Wheel, Random (her note-on'da). (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Unison modları Classic (eşit detune, dönüşümlü pan), Shimmer, Noise, Phase Sync, Position Spread, Random Note. Voices osilatör başına eşzamanlı osilatör sayısıdır. Glide yalnız Mono'da çalışır. Mono = legato zarflar. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [resmi/yuksek] Hi-Quality kapalıyken modülasyon 32 örnekte bir hesaplanır ve düşük güçlü Cytomic filtreler kullanılır (%25'e kadar CPU tasarrufu). Live 11.1'den beri yeni instance'larda varsayılan olarak kapalı. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [kod/orta] Push (Live 12 Push2 remote script) Wavetable bankaları: Main (Oscillator, Table, Position, Filter Type, Frequency, Resonance, Mod Time, Mod Amt), Oscillators, Filters, Global, Envelopes, LFOs, Matrix, MIDI. FM modunda Effect 1 'Pitch', Effect 2 'Amount' olarak etiketlenir. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/custom_bank_definitions.py)
- [kod/orta] Push script sabitleri: efekt modları None/Fm/Classic/Modern; unison sesleri 2–8; poly voices '2'..'8'; osilatör seçici 1/2/S/Mix; filtre routing Serial/Parallel/Split. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/ableton/v2/control_surface/wavetable_decoration.py)
- [resmi/yuksek] Ableton Wavetable pack sayfası: Push ekranında detaylı wavetable görselleştirmesi var, 100'den fazla wavetable, iki Cytomic filtre (12/24 dB). (https://www.ableton.com/en/packs/wavetable/)
- [ikincil/orta] Ableton kullanıcı wavetable importu: 1024 örneklik kareler, en fazla 256 kare. Raw kapalıyken sessizlik atılır, kenarlar fade edilir, faz farkları azaltılır, normalize edilir. Raw açıkken 1024'lük eşit parçalara bölünür. (https://www.subaqueousmusic.com/making-your-own-epic-custom-wavetables-in-live/)
- [resmi/orta] Ableton CPU yardım makalesi: 8 nota × 3 osilatör × 8 unison = 192 ses; FM her unison sesi için iç modülatör açar; Fold en pahalı efekt; analog filtreler Clean'den pahalı. (https://help.ableton.com/hc/en-us/articles/360000036930-Managing-CPU-load-when-using-Wavetable)
- [ikincil/yuksek] EarLevel: 2048 örneklik float kareler, double faz akümülatörü, oktav başına bir alt tablo (ör. 9–10 tablo). Her üst oktav için FFT'de harmoniklerin üst yarısı sıfırlanıp IFFT alınır. Tablo seçimi phaseInc ile topFreq karşılaştırılarak yapılır. (https://www.earlevel.com/main/2012/05/25/a-wavetable-oscillator-the-code/)
- [ikincil/yuksek] EarLevel: PWM, aynı frekansta ve farklı fazdaki iki testerenin farkıyla elde edilir. Yüksek oktavlarda tablo geçişlerinde 'tick' duyulabilir; çare olarak crossfade veya daha yüksek örnekleme önerilir. (https://www.earlevel.com/main/2012/05/09/a-wavetable-oscillator-part-3/)
- [ikincil/orta] EarLevel: tepe harmoniği ~fs/3'e koymak, bir oktav yukarı kaydırıldığında aliasing'i yine ~fs/3 civarına katlar, duyulması çok zordur ('3.0 factor'). 40 Hz tabanlı tablo için 368 harmonik ≈ 14,72 kHz. (https://www.earlevel.com/main/2012/05/08/a-wavetable-oscillator%E2%80%94part-2/)
- [ikincil/yuksek] EarLevel: doğrusal interpolasyon küçük ek maliyetle belirgin iyileşme sağlar (512'lik sinüs tablosunda hata ≈ −97 dB). Tablolar önceden filtrelenip perdeye göre seçilir. (https://www.earlevel.com/main/2020/01/04/further-thoughts-on-wave-table-oscillators/)
- [ikincil/orta] Serum wavetable formatı: 2048 örnek/kare, en fazla 256 kare, 32-bit float. WAV içinde 'clm ' chunk'ı ('<!>2048 …'). Format Vital, Pigments ve u-he gibi synth'lerde de kullanılır. (https://gist.github.com/iicaras/f63dc9fcc3f9a83ccaf2de3fbc9fbb5a)
- [kod/yuksek] Vital: kWaveformBits = 11 (2048 örnek), kExtraValues = 3 guard örnek, kMaxUnison = 16. Distortion tipleri Sync, Formant, Quantize, Bend, Squeeze, PulseWidth, FM/RM. Sync/Formant için frekans bin'i ×16 (kMaxSync) kaydırılır; PW faktörü 1/(1−amount); FM amount karesi alınır. Lisans GPL-3.0. (https://github.com/mtytel/vital)
- [ikincil/yuksek] Cytomic SVF: g = tan(π fc/fs), k = 2 − 2·res, a1 = 1/(1+g(g+k)), a2 = g·a1, a3 = g·a2. v3 = v0 − ic2eq; v1 = a1·ic1eq + a2·v3; v2 = ic2eq + a2·ic1eq + a3·v3; ic1eq = 2v1 − ic1eq; ic2eq = 2v2 − ic2eq. low = v2, band = v1, high = v0 − k·v1 − v2, notch = v0 − k·v1. (https://www.cytomic.com/files/dsp/SvfLinearTrapOptimised2.pdf)
- [ikincil/yuksek] Zavalishin TPT ladder: 4 kutbun anlık yanıtı Gξ + S (G = g⁴, S = g³s1 + g²s2 + g·s3 + s4); geri besleme noktası u = (x − kS)/(1 + kG). k ≥ 4'te kararsız; tanh doyurucuyla self-oscillation mümkün. (https://noisehack.com/research/VAFilterDesign_1.0.3.pdf)
- [ikincil/yuksek] Szabo (JP-8000 Super Saw): 7 osilatörün ofsetleri ±0,11002313 / ±0,06288439 / ±0,01952356 (yaklaşık); mix eğrileri merkez −0,55366x + 0,99785, yanlar −0,73764x² + 1,2841x + 0,044372; detune eğrisi doğrusal değil (11. derece polinom); fazlar rastgele. (https://www.adamszabo.com/internet/adam_szabo_how_to_emulate_the_super_saw.pdf)
- [ikincil/yuksek] ADAA (antiderivative anti-aliasing) nonlineer waveshaping'de aliasing'i belirgin azaltır; düşük oversampling ile birlikte daha etkilidir. (https://dafx.de/paper-archive/2016/dafxpapers/20-DAFx-16_paper_41-PN.pdf)
- [ikincil/yuksek] Lockhart ve Serge wavefolder VA modelleri: aliasing için birinci derece antiderivative yöntemi önerilir, yüksek oversampling gerekmeden gerçek zamanlı çalışır. (https://www.research.ed.ac.uk/en/publications/virtual-analog-model-of-the-lockhart-and-serge-wave-folders/)
- [ikincil/yuksek] Faust aanl.lib ADAA1/ADAA2 fonksiyonları sunar (EPS eşiğiyle kötü koşullu yola geçiş); sine, tanh, hardclip vb. (https://faustlibraries.grame.fr/libs/aanl/)
- [resmi/yuksek] AudioWorkletProcessor.process() blokları şu an 128 frame, ancak boyut değişebilir; dizi uzunluğu her zaman kontrol edilmeli. a-rate parametre 128, k-rate 1 değer içerir. true döndürmek node'u canlı tutar. (https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process)
- [resmi/yuksek] Chrome 153 (8 Eylül 2026) renderSizeHint'i gönderdi (tamsayı, 'default' = 128 veya 'hardware'). Spesifikasyon 64–2048 arası 2'nin kuvvetlerini zorunlu kılar. Firefox için sinyal yok. (https://developer.chrome.com/release-notes/153)
- [resmi/yuksek] Chrome AudioWorklet desenleri: 128 frame bütçesi (~3 ms @44,1k), WASM entegrasyonu, ring buffer, SAB + Worker. process() içinde tahsisten kaçınılmalı; MessagePort tekrarlı tahsis ve gecikme getirir. (https://developer.chrome.com/blog/audio-worklet-design-pattern)
- [resmi/yuksek] SharedArrayBuffer secure context ve cross-origin isolation (COOP: same-origin + COEP: require-corp/credentialless) gerektirir. (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [resmi/yuksek] AudioWorkletGlobalScope'ta currentFrame, currentTime, sampleRate ve port global olarak mevcut. (https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope)
- [resmi/yuksek] AudioWorkletNode seçenekleri: numberOfInputs, numberOfOutputs, outputChannelCount, parameterData, processorOptions (structured clone ile işlemciye geçer). (https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/AudioWorkletNode)
- [resmi/yuksek] Web Audio spesifikasyonu: osilatörler Nyquist üstünü atmalıdır (MUST). Temel dalgalar, eşdeğer Fourier serisiyle oluşturulmuş PeriodicWave ile aynı sonucu vermelidir. (https://webaudio.github.io/web-audio-api/)
- [ikincil/yuksek] Zamanlama: setTimeout tek başına onlarca ms kayabilir. Önerilen desen 25 ms zamanlayıcı + 100 ms ileriye zamanlama ve AudioContext.currentTime ile planlama. (https://web.dev/articles/audio-scheduling)
- [resmi/yuksek] Safari 14.1 Audio Worklet desteğini getirdi. (https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/)
- [resmi/orta] navigator.audioSession.type ('playback' vb.) deneysel Audio Session API'sidir. 'playback' iOS'ta sessiz tuşa rağmen Web Audio'nun duyulmasını sağlar (ikincil kaynaklara göre Safari 17+). (https://developer.mozilla.org/en-US/docs/Web/API/AudioSession)
- [resmi/yuksek] JUCE Synthesiser varsayılan voice stealing: çalan en alt ve en üst nota dışındaki en yaşlı sesi seçer. (https://docs.juce.com/master/classjuce_1_1Synthesiser.html)
- [ikincil/yuksek] EarLevel tek kutuplu filtre: b1 = exp(−2π·Fc), a0 = 1 − b1. Kaydırıcı ve knob'ları alt-ses frekanslı one-pole'dan geçirmek zipper gürültüsünü giderir. (https://www.earlevel.com/main/2012/12/15/a-one-pole-filter/)
- [ikincil/yuksek] Denormaller özyinelemeli DSP'de sıfıra sönümlenirken oluşur ve CPU'yu ciddi yavaşlatır. Çare olarak ~1e−15 (−300 dB) küçük DC eklemek veya FTZ. (https://www.earlevel.com/main/2019/04/19/floating-point-denormals/)
- [ikincil/yuksek] EarLevel ADSR: rate örnek sayısıdır; targetRatio 0,0001–0,01 üstel, ~100 neredeyse doğrusal; coef = exp(−log((1+ratio)/ratio)/rate). (https://www.earlevel.com/main/2013/06/03/envelope-generators-adsr-code/)
- [kod/yuksek] PolyBLEP (Finke, Tale'den): t<dt için −(t/dt − 1)², t>1−dt için ((t−1)/dt + 1)²; testere düzeltmesi. Dosya WDL/IPlug lisansı altında. (https://github.com/martinfinke/PolyBLEP/blob/master/PolyBLEP.cpp)
- [ikincil/yuksek] Rust/WASM wavetable synth: wasm baytları ana thread'de fetch edilip postMessage ile worklet'e gönderilir; 128 örnek tek wasm çağrısında işlenir; modül ~6,5 KB gzip; makaledeki örnek band-limit içermez. (https://cprimozic.net/blog/buliding-a-wavetable-synthesizer-with-rust-wasm-and-webaudio/)
- [kod/yuksek] GoogleChromeLabs/web-audio-samples Apache-2.0 lisanslıdır. İçinde AudioWorklet örnekleri (message-port, wasm, wasm-ring-buffer, shared-buffer, wasm-supersaw) ve PeriodicWave tabanlı wavetable-synth demoları var. (https://github.com/GoogleChromeLabs/web-audio-samples)
- [kod/yuksek] Açık kaynak lisanslar (GitHub API ve LICENSE dosyaları): looshi/wavetable-synth-2 MIT; Surge GPL-3.0; WaveEdit GPL-3.0 (64 dalga × 256 örnek); Ameobea/web-synth LICENSE dosyasına göre GPL (v2 veya sonrası, Faust türevi). (https://github.com/Ameobea/web-synth)
- [kod/yuksek] fft.js package.json lisansı MIT; dsp.js MIT. (https://github.com/indutny/fft.js)
- [ikincil/orta] Sound On Sound (Live 10 dönemi): FM Tune ±2 oktav; Sync gizli osilatör %100'de 2 oktav; 12 kategoride 194 wavetable; varsayılan preset'te yalnız Osc1 açık ve Basic Shapes (sine→tri→saw→square). 'Custom wavetable import edilemez' ifadesi Live 10.1 ile geçersiz oldu. (https://www.soundonsound.com/techniques/wavetable-abletons-new-synth)
- [kod/yuksek] Sitenin firebase.json'ında '**' → /index.html rewrite'ı var ve COOP/COEP başlığı yok. ableton-lab.html AudioWorklet'i Blob URL ile addModule ediyor. ders-push3.html'de şu an ses kodu yok. (file:///Users/berkayer/site/firebase.json)
- [ikincil/orta] Peterson & Barney (1952) erkek ortalama formantları: /i/ 270/2290/3010, /a/ 730/1090/2440, /u/ 300/870/2240 vb. Praat bu tabloyu üretebilir. (https://www.fon.hum.uva.nl/praat/manual/Create_formant_table__Peterson___Barney_1952_.html)

## BELIRSIZ
- Ableton Wavetable'ın sayısal parametre aralıkları (Filter Freq, Res, Drive dB, zarf süreleri, LFO Hz ve sync bölümleri, Glide ms, Detune cent) resmi kaynakta bulunamadı. Bölüm 14'teki değerler öneridir.
- Warp, Fold, PW, Sync ve FM'in Ableton'daki tam algoritmaları ve modülasyon indeksi ölçekleri yayımlanmamış. Verilen formüller Vital, EarLevel ve VA literatürüne dayalı çıkarımdır; kulakla ayarlanmalıdır.
- OSR, MS2, SMP ve PRD devrelerinin gerçek Cytomic modelleri tescillidir. Önerilen SVF+clip ve TPT ladder karşılıkları yaklaşıktır.
- Ableton'ın dahili kare boyu ve fabrika tablolarındaki kare sayısı doğrulanamadı. Import için 1024 örnek/kare ve en fazla 256 kare bilgisi ikincil kaynaklardan geliyor (help.ableton.com Cloudflare nedeniyle doğrudan okunamadı).
- Push bank düzeni Live 12'nin Push2 remote script'inden (decompile) alındı. Push 3'ün (Control ve Standalone) aynı bankaları kullandığı doğrulanamadı. Figma LCD'deki 'Oscillator / Mod Time' etiketleri tutarlılığı destekliyor.
- poly_voices_values = '2'..'8' Push script'indeki gösterim değerleri. Live arayüzündeki Poly Voices seçeneklerinin tam listesi resmi kılavuzda yazmıyor.
- Unison modlarının (Shimmer ve Noise jitter hızları, Position Spread miktarı, Classic maksimum detune) sayısal değerleri çıkarımdır.
- CPU tahminleri (ns/örnek, yüzdeler) ölçüme dayanmıyor; gerçek cihazda benchmark şart. Mobil Safari AudioWorklet performansı ve kararlılığı hakkında (iOS 16–18 hata raporları) kesin veri yok.
- navigator.audioSession'ın hangi Safari sürümünde sessiz tuşu aştığı yalnızca ikincil kaynaklarda (Safari 16.4 veya 17+ çelişkili) geçiyor; MDN deneysel olarak işaretliyor.
- Safari'de Blob-URL ile audioWorklet.addModule davranışı doğrulanmadı; statik dosya önerildi.
- AudioRenderCapacity/playbackStats API'lerinin tarayıcı desteği net değil; uyarlamalı kalite için worklet içinde kaba Date.now() ölçümü önerildi.
- EarLevel C++ kodunun lisansı sayfada bulunamadı. Faust kütüphane lisansı ve Ameobea/web-synth'in kesin GPL sürümü (LICENSE dosyasında 'v2 veya sonrası') GitHub API'de NOASSERTION olarak görünüyor.
- Ableton help CPU makalesinin içeriği (192 ses örneği, Fold en pahalı) yalnızca arama özetinden alındı, sayfa doğrudan okunamadı.
- COOP: same-origin başlığının sitedeki Firebase Auth popup akışını bozacağı çıkarımdır (bilinen genel davranış); sitede test edilmedi.