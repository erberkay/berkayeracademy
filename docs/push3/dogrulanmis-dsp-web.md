# Push 3 Emülatörü: Wavetable Motoru ve Web Girdi/Ses Katmanı (doğrulanmış nihai spesifikasyon)

> Etiketler: **[R]** resmi kaynak (Ableton kılavuzu, W3C/WHATWG, MDN BCD) · **[K]** kaynak kod (Push2 script, Vital) · **[M]** matematiksel olarak doğrulandı · **[Ö]** bizim önerimiz (kulakla ya da ölçümle ayarlanacak).

## 0. Dosyalar ve kurallar
- `assets/js/push3-wt.worklet.js`: `registerProcessor('push3-wavetable', …)`. Statik dosya ve mutlak yol kullanılır. Blob URL kullanılmaz [Ö].
- `assets/js/push3-wt-engine.js`: AudioContext, tablo üretimi, mesaj API'si, lookahead sequencer.
- `assets/js/push3-wt-tables.worker.js` (opsiyonel): FFT ile mip üretimi.
- Firebase: yol yanlışsa `"**" → /index.html` rewrite'ı HTML döndürür. `nosniff` başlığı yüzünden `addModule` başarısız olur. Yolu `?v=N` ile sürümle [R/yerel].
- Tek AudioContext kullanılır. ableton-lab'deki 7 context deseni kopyalanmaz.
- SharedArrayBuffer kullanılmaz (COOP/COEP gerekir, sitede yok) [R].

## 1. Davranış referansı (Ableton Wavetable, Live 12 kılavuzu 31.13) [R]
- 2 wavetable osilatörü + sub + 2 filtre. Modülasyon yokken çıkış her perdede band-limited olmalı.
- **Efektler** (tip değişince fx1/fx2 değerleri korunur):
  - FM: Amt ve Tune. Tune ±%50 = ±1 oktav, ±%100 = ±2 oktav.
  - Classic: PW (tüm tablolara uygulanır) ve Sync ("hidden" osilatör).
  - Modern: Warp (PW'ye benzer) ve Fold.
  - Push etiketleri [K]: FM "Pitch"/"Amount", Classic "Pulse Width"/"Sync", Modern "Warp"/"Fold".
- **Sub:** Tone %0 = saf sinüs. Octave 0 / −1 / −2.
- **Filtreler:** LP/HP/BP/Notch/Morph, 12/24 dB.
  - Devreler: Clean ve OSR tüm tiplerde; MS2, SMP ve PRD yalnız LP/HP'de.
  - Drive: LP/HP/BP'de ve devre ≠ Clean iken. Push script'i Notch için de gösteriyor [K]; emülatör kılavuzu izler.
  - Morph sırası: LP→BP→HP→Notch→LP.
- **Routing:** Serial / Parallel / Split (kılavuzdaki semantik). Split'te sub yarı yarıya iki filtreye gider; kapalı filtre sesi kesmez.
- **Matris:**
  - Additive: kaynaklar toplanır.
  - Multiplicative: çarpılır, nötr 1, minimum 0. Multiplicative hedefler: Volume, Sustain, LFO Amount, Unison Amount, matris Amount, env Initial.
  - Time: negatif = modülatörler hızlanır, pozitif = yavaşlar.
- **Zarflar:**
  - Amp, Env2, Env3. Slope: + başta hızlı, − önce düz, 0 doğrusal.
  - Loop modları: None, Trigger (sustain'e varınca Release'e geçer), Loop (sustain tutmadan döngü).
- **LFO ×2:**
  - Dalgalar: Sine, Tri, Saw, Square, Random.
  - Shape: Sine/Saw eğim, Tri Ramp↔Saw simetrisi, Square PW, Random uç dağılımı.
  - Diğer: Sync Hz/tempo, Amount (mult.), Offset (modüle edilemez), Attack (fade-in), Retrigger.
- **MIDI kaynakları:** Velocity, Note (C3 merkez; Filter Freq'e %100 = tam izleme), PB, Aftertouch, Mod Wheel, Random.
- **Global ve Unison:** Poly/Mono (Mono = legato zarflar), Poly Voices 2–8 [K], Glide yalnız Mono'da, Unison None + 6 mod, Voices 2–8 [K].
- **Hi-Quality:** kapalıyken modülasyon her 32 örnekte bir. Live 11.1+ yeni instance'larda varsayılan kapalı. Bizim motorun varsayılanı da bu olur.

## 2. Push bankaları (Live 12 Push2 script, InstrumentVector) [K]

| Banka | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 |
|---|---|---|---|---|---|---|---|---|
| Main | Oscillator (1/2/S/Mix) | Table · S: Gain · Mix: Gain 1 | Position · S: Tone · Mix: Gain 2 | Filter Type · S: Octave · Mix: Gain Sub | Frequency | Resonance | Mod Time | Mod Amt |
| Oscillators | Oscillator | Category · S: Gain · Mix: Pitch 1 | Table · S: Tone · Mix: Pitch 2 | Position · S: Octave · Mix: Octave Sub | Pitch · Mix: Gain 1 | Effect Type · Mix: Gain 2 | Effect 1 | Effect 2 · Mix: Gain Sub |
| Filters | Filter (1/2) | Filter On | Filter Type | Frequency | Resonance | Filter Circuit | Morph / Drive | Routing |
| Global | Mono On | Glide (Mono) / Poly Voices | Unison Mode | Unison Voices | Unison Amount | Transpose | — | Volume |
| Envelopes | Amp/Env2/Env3 | Env View (Time/Slope[/Value]) | Attack/A Slope/Init | Decay/D Slope/Peak | Sustain | Release/R Slope/Final | Loop | — |
| LFOs | LFO1/2 | LFO Type | Shape | Rate (Sync'te S. Rate) | Amount | Attack | Offset | Retrigger |

Seçenek düğmeleri:
- Main: Osc/Sub On, Filter Switch, Filter On, Add to Matrix.
- Filters: Slope 12/24.
- LFOs: Sync.

Görselleştirme: Main'de `mainbank_visualisation`, Oscillators'da `oscillators_visualisation`. Push 3'ün bu bankaları birebir kullandığı doğrulanamadı.

## 3. Wavetable veri modeli
- Kare boyu N0 = 2048, F = 64 kare (içe aktarmada ≤ 256). Position p ∈ [0,1] için: `x = p·(F−1)`, `i = floor(x)`, `t = x − i`, `j = min(i+1, F−1)`.
- Mip seviyesi L = 0..10. Her seviye için `len_L` ve **gerçek harmonik sayısı** tutulur:
  - `H_L = min(1024 >> L, len_L/2 − 1)`, ayrıca H_L ≤ 1023.
  - **Kalite profili** (len hep 2048): H = 1023, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1.
  - **Eco profili**: len = 2048, 1024, 512, 256, 256… → H = 1023, **511**, 255, 127, 64, 32…1.
- **Yerleşim (düzeltildi)** [M]:
  - Her kare `len + 3` örnek kaplar: `[s(len−1) | s0 … s(len−1) | s0, s1]`.
  - `base(L,f) = levelBase[L] + f·(len_L + 3) + 1`.
  - Doğrusal okuma T[base+i], T[base+i+1]; Hermite okuma T[base+i−1 … base+i+2]. Hiçbiri mask gerektirmez.
- Bellek (64 kare): Kalite ≈ 11·64·2051·4 B ≈ 5,8 MB; Eco ≈ 1,5 MB. Yalnızca kullanılan tablolar üretilir, LRU ile en fazla 4 tablo.

## 4. Mip üretimi ve seçimi
- **Üretim:** kare başına c_k, s_k (k ≤ 1023). Seviye L için:
  - `X[k] = (len/2)(c_k − i·s_k)` (1 ≤ k ≤ H_L), diğer bin'ler 0; IFFT alınır.
  - Normalizasyon katsayısı L0 tepe değerinden hesaplanır ve karenin tüm seviyelerine aynı katsayı uygulanır.
  - FFT kütüphanesi: fft.js veya dsp.js (ikisi de MIT).
- **Seçim** [M], `f` = efektif en yüksek temel frekans (pitch + en uç unison detune + efekt çarpanı):
  - Relaxed (varsayılan): `fmax_L = (2/3)·fs / H_L`. Alias bileşenleri ≥ fs/3'te kalır (EarLevel "3.0 factor").
  - Strict (HQ): `fmax_L = 0.5·fs / H_L`.
  - `L` = f ≤ fmax_L koşulunu sağlayan ilk seviye; yoksa 10.
  - Crossfade: `w = clamp((log2(f/fmax_L) + 0.5)/0.5, 0, 1)`, `y = (1−w)·read(L) + w·read(L+1)`. Seviye sınırında süreklidir.
  - Örnek (48 kHz, 440 Hz, relaxed): L = 4, alias 19,84 kHz'te.
- **Okuma:**
  - Faz float64, `phase ∈ [0,1)`.
  - Doğrusal okuma varsayılan. HQ modunda Niemitalo Hermite: `c1 = ½(y1 − y−1)`, `c2 = y−1 − 2.5y0 + 2y1 − ½y2`, `c3 = ½(y2 − y−1) + 1.5(y0 − y1)`.
  - Kareler arası doğrusal crossfade: 4 okuma, mip crossfade bölgesinde 8.
  - Position, mip seçimi ve filtre katsayıları 32 örnekte bir hesaplanır, aradaki örneklerde doğrusal rampa uygulanır.
- PeriodicWave yalnızca AudioWorklet'siz tarayıcılar için fallback'tir (Position süpürmesi yok).

## 5. Prosedürel tablolar (katsayılar doğrulandı) [M]
- **Temel**: sine → tri → saw → square. Katsayılar:
  - tri `(8/π²)(−1)^((k−1)/2)/k²`
  - saw `(2/π)(−1)^(k+1)/k`
  - square `4/(πk)`, yalnız tek k
- **Pulse**: `s_k = −(2/(πk))(1−cos2πkw)`, `c_k = −(2/(πk)) sin2πkw`.
- **Sine Fold**: `s_n = 2·J_n(πg/2)`, yalnız tek n.
- **Diğerleri**: Harmonic Sweep, Odd↔Even, Vowels (Peterson & Barney erkek formantları), FM Ratio, Sync Sweep, Bitcrush, Noise Spectra, Drawbars. Süreksiz olanlar (Sync, Bitcrush) 8× oversample → FFT → k ≤ 1023 kesme ile üretilir.
- Kategori adları kendi adlarımızdır (Temel, Harmonik, Vokal, FM, Gürültü…).

## 6. Osilatör efektleri [Ö, formüller kontrol edildi]
- **FM**:
  - `r = 2^(2·tune)`, `β = 4π·amt²`.
  - `φm += r·inc`, `y = readWT(frac(φ + (β/2π)·sin 2πφm))`.
  - Modülatör her unison sesi için ayrı tutulur.
  - Mip seçimi `f0·max(1,r)·(1 + 0.5β)` ile yapılır.
- **PW**:
  - `w = 0.98·pw`, `s = 1/(1−w)`, `u = (φ−0.5)·s`.
  - `y = |u| < 0.5 ? readWT(u + 0.5) : 0`.
  - Mip seçimi `f0·s` ile.
- **Sync**:
  - `ρ = 2^(2·sync)`, `y = readWT(frac(φ·ρ))`. Mip seçimi `f0·ρ` ile.
  - Master sarmasında `Δ = readWT(0) − readWT(frac ρ)`, düzeltme `y += (Δ/2)·blep(φ, inc)`.
  - `blep`: t < dt için `2x − x² − 1` (x = t/dt); t > 1−dt için `x² + 2x + 1` (x = (t−1)/dt).
- **Warp**:
  - `d = 0.5 − 0.49·warp`.
  - `φw = φ < d ? 0.5φ/d : 0.5 + 0.5(φ−d)/(1−d)`.
  - Mip seçimi `f0·0.5/d` ile. Kırılma noktasında eğim süreksizdir; yüksek warp'ta hafif alias kabul edilir.
- **Fold**:
  - `u = (1 + 7·fold)·x`.
  - ADAA1: `y = (F1(u) − F1(u₋₁))/(u − u₋₁)`, `F1 = −(2/π)cos(πu/2)`. |Δu| < 1e−5 ise `sin(π/2·ū)` kullanılır.
  - Çıkış `lerp(x₋½, y, min(1, 10·fold))`. `x₋½ = (x + x₋₁)/2`: ADAA'nın yarım örnek gecikmesiyle hizalamak içindir, comb etkisi oluşmaz.
  - HQ'da ek 2× oversampling uygulanır.
- **Sub (düzeltildi)**:
  - `f_sub = f0·2^(−oct)`, `k = 10·tone`.
  - `tone < 0.001` ise `y = sin 2πφ`; aksi halde `tanh(k sin 2πφ)/tanh(k)`.
  - Aliasing'i önlemek için bu dalga 16 Tone karesi olan mip'li bir tablo olarak önceden üretilir ve aynı okuyucu kullanılır.

## 7. Filtreler
- **Clean SVF** (Simper) [M]:
  - `g = tan(π fc/fs)`, `k = 1/Q = 2 − 2·res` (res ≤ 0,98).
  - `a1 = 1/(1 + g(g+k))`, `a2 = g·a1`, `a3 = g·a2`.
  - Tick: `v3 = v0 − ic2eq`, `v1 = a1·ic1eq + a2·v3`, `v2 = ic2eq + a2·ic1eq + a3·v3`, `ic1eq = 2v1 − ic1eq`, `ic2eq = 2v2 − ic2eq`.
  - Çıkışlar: `low = v2`, `band = v1`, `high = v0 − k·v1 − v2`, `notch = v0 − k·v1`.
  - `fc ∈ [20, min(20000, 0.45·fs)]`.
- **24 dB**: iki SVF kaskadı. Q1 = 0,5412 sabit, Q2 = 1,3066 + res·(25 − 1,3066).
- **Morph**: `seg = floor(4m)`, `[low, k·band, high, notch, low]` dizisinde doğrusal karışım.
- **PRD**: TPT ladder, `u = (x − kS)/(1 + kG⁴)`, ardından `tanh(drive·u)`, `k ∈ [0,4]`.
- **Diğer devreler**: OSR = SVF + `ic1eq` hard clip ±1,2; MS2 = SVF + `tanh(ic1eq)`; SMP = `x/(1+|x|)` + hafif drive. Hepsi yaklaşıktır.
- **Drive**: 0–24 dB → tanh → filtre → `÷sqrt(gain)`. Notch, Morph ve Clean'de gizli.
- Parallel çıkış `0.5(F1 + F2)`.

## 8. Modülasyon, polifoni, unison [Ö]
- **Zarflar:**
  - Eğri: `curve(x,s) = s>0 ? 1−(1−x)^(1+4s) : s<0 ? x^(1+4|s|) : x`.
  - Amp zarfı örnek başına, Env2/3 32 örnekte bir hesaplanır.
  - Ses bitişi: Amp < 1e−4 ve R safhasındaysa.
- **LFO:** Rate 0,01–40 Hz. Sync bölümleri 1/64…8 bar. Shape formülleri önceki taslaktaki gibi.
- **Matris:** Multiplicative eşleme `base·Π(1 − |a| + |a|·src_u)`. Time ölçeği `2^(3·Time)`. Filtre frekansı oktav cinsinden modüle edilir.
- **Ses havuzu:**
  - Poly Voices 2–8 (varsayılan 8) + 4 kuyruk slotu.
  - Çalma sırası: aynı nota → boş ses → R safhasındaki en sessiz → en eski (en alt ve en üst tutulan nota korunur, JUCE varsayılanı).
  - Çalınan ses kuyruk slotunda 3 ms'de söner.
  - Mono: son-nota yığını, legato. Glide yarım ton domeninde doğrusal, 0–2000 ms.
- **Unison** (n = 2..8, osilatör başına):
  - Ortak: gain `1/√n`, rastgele başlangıç fazları, dönüşümlü pan.
  - Classic: detune `A·50·e_i` cent.
  - Shimmer: 50–150 ms'de bir yeni hedef. Noise: 1–3 ms'de bir.
  - Phase Sync: note-on'da tüm fazlar 0.
  - Position Spread: pozisyon `±0.5A`, detune `A·5` cent.
  - Random Note: detune ve pozisyon note-on'da rastgele.
  - Mip seçimi en uç detune'lu sesin frekansıyla yapılır.

## 9. Güvenlik ve yumuşatma
- UI parametreleri one-pole ile yumuşatılır: `b1 = exp(−2π·30/fs)`.
- Pitch cent domeninde yumuşatılır.
- Her blok sonunda filtre durumlarında `|s| < 1e−15 → 0`.
- Master: DC blocker (`R = 1 − 2π·10/fs`), ardından `tanh(1.2x)/1.2`. Ses başı kazanç 0,25.

## 10. AudioWorklet
- **Node:** `new AudioWorkletNode(ctx,'push3-wavetable',{numberOfInputs:0, numberOfOutputs:1, outputChannelCount:[2], processorOptions:{maxVoices:8, spare:4, quality}})`.
- **Blok boyu:**
  - `n = outputs[0][0].length` her çağrıda okunur; 128 varsayılmaz.
  - Chrome 153+ `renderSizeHint` destekliyor (64–2048 arası 2'nin kuvvetleri zorunlu). Varsayılan verilmezse blok 128'dir.
  - Tamponlar kurucuda 2048'e göre ayrılır.
- **Mesajlar:** `port.postMessage` ve Transferable ArrayBuffer.
  - Tablo: `{t:'table', id, F, levels:[{len,H}], buf}`.
  - Notalar: `{t:'on'|'off', n, v, at}`.
  - Parametreler: `{t:'p', i:Uint16Array, v:Float32Array}`, rAF ile ≤ 60 Hz'e birleştirilir.
  - Diğer: `{t:'panic'}`; worklet → UI yönünde `{t:'meter', …}` 12 blokta bir.
  - `port.onmessage` ses thread'inde çalışır; handler yalnızca önceden ayrılmış halka kuyruğuna yazar.
- **Zamanlama:** `off = round((at − currentTime)·sampleRate)`. Blok, olay ofsetlerinde alt bloklara bölünür; alt bloklar 32'lik kontrol dilimleriyle işlenir. Sequencer 25 ms timer ile 100 ms ileriye zamanlar.
- `process()` içinde tahsis yapılmaz ve her zaman `true` döner. `processorerror` dinlenir ve motor yeniden kurulur.
- **CPU:** `Date.now()` ile 32 blokluk ortalama ölçülür; 3 ardışık aşımda kalite bir kademe düşer.
  - Eco profili: unison ≤ 4, toplam unison-osc ≤ 48, Hermite yok, Fold OS yok.
  - HQ profili: Hermite + 2× OS Fold, unison-osc ≤ 128.

## 11. Ses başlatma (düzeltildi) [R]
1. AudioContext **mod kartının `click` handler'ında** oluşturulur ve `resume()` edilir. `navigator.audioSession.type='playback'` bundan ÖNCE ve özellik tespitiyle ayarlanır: API Safari/iOS 16.4+, sessiz tuş etkisi iOS 17+'da güvenilir; Chrome'da yok, Firefox'ta yalnız önizleme.
2. Yedek `resume()`: `pointerup`, `touchend`, `mousedown`, `keydown` ve `click` olaylarına `{capture:true}` ile bağlanır. **Dokunmatik `pointerdown` kullanılmaz**, çünkü activation-triggering değildir.
3. `latencyHint:'interactive'` (Firefox yok sayar). `sampleRate` sabitlenmez.
4. `visibilitychange`: gizlenince gain 0'a rampalanır ve panic çağrılır; görününce `resume()`. `statechange` 'interrupted' ise "Sesi yeniden başlat" çipi gösterilir ve kullanıcı dokunuşunda resume ya da close+yeniden oluşturma yapılır.
5. AudioWorklet yoksa (`!ctx.audioWorklet` veya `!isSecureContext`) PeriodicWave fallback'e geçilir. Destek: Chrome 66, Firefox 76, Safari 14.1.

## 12. Girdi katmanı (düzeltildi)
- **Pointer Events + tek yakalama yüzeyi:**
  - Yüzey SVG shape'i değil, SVG üstünde bir HTML `div` olmalı; `touch-action:none` ve `user-select:none` verilir.
  - `pointerdown`'da **her zaman** `setPointerCapture` çağrılır.
  - Pad indeksi `padAt(toSvg(x,y))` ile koordinattan hesaplanır: `PAD = {x0:589, y0:866, w:146, h:108, px:152, py:114}`, `i = r·8 + c`, r = 0 en üst satır.
  - Glissando (NotePB kapalı) koordinat değişince retrigger ile yapılır.
  - Voice `pointerup`, `pointercancel` ve `lostpointercapture` ile kapanır; `endVoice` idempotent olmalı.
- **getCoalescedEvents:** Chrome 58, Firefox 59, Safari 18.2+. Özellik tespitiyle kullanılır, sentetik olaylarda boş liste gelir. `pointerrawupdate` Chrome 77+ ve Firefox 148+'da var, Safari'de yok; opsiyonel.
- **Velocity:**
  - `pressure` spesifikasyonu: desteklenmeyen donanımda basılıyken 0,5.
  - pen ya da değişken pressure varsa gerçek basınç kullanılır; yoksa sabit 100. Accent 127, klavyede ±20.
- **MPE (Push 3):** Expression Mode MPE, In Tune Location Finger, Note PB Auto. mm ölçüleri `5.568 birim/mm` ile birime çevrilir (±%3 hata payı; çizim oranı cihazla tam tutmuyor).
- **Web MIDI:** yalnızca [Bağlan] butonuyla istenir (`sysex:false`).
  - Safari'de yok, bunun yerine açıklama metni gösterilir.
  - Firefox 108+ add-on ister.
  - Chrome 124+'ta her erişimde izin istemi çıkar.
  - `onstatechange` tetiklenince tüm girişler yeniden bağlanır.
- **Klavye:** `KeyboardEvent.code` kullanılır. Etiketler yalnız Chromium'da `getLayoutMap` ile okunur, diğerlerinde sabit TR-Q tablosu. `e.repeat` yok sayılır. `blur` ve `visibilitychange` olaylarında panic.
- **Mobil:** `screen.orientation.lock` iOS'ta yok. Android Chrome'da ve Firefox 144+'da tam ekranla denenir, hata yutulur. Vibration yalnız Android Chrome'da. `dvh` iOS 15.4+.

## 13. Test planı
1. **Aliasing:** saw, C0→C8. Relaxed modda fs/3 altında aşağı inen kısmi olmamalı, strict modda hiç olmamalı. Aynı test Sync/PW/Warp/Fold %100 ve **Sub Tone %100, oct 0** ile tekrarlanır.
2. **Sub:** Tone %0'da FFT'de 3. harmonik < −90 dB olmalı.
3. **Mip geçişi:** yavaş glide sırasında tık olmamalı.
4. **Position:** 0,2 Hz LFO taramasında dip olmamalı.
5. **Zamanlama:** OfflineAudioContext ile onset sapması < 1 örnek olmalı. `renderSizeHint:'hardware'` ile de test edilir.
6. **Voice stealing:** 9. notada tık olmamalı.
7. **Asılı nota:** telefonda parmak yüzeyden dışarı kaydırılıp kaldırılınca nota susmalı (capture testi).
8. **iOS ses kilidi:** ilk ses mod kartı tıklamasıyla gelmeli. Sessiz tuş açıkken iOS 17+'da ses duyulmalı.
9. **Denormal:** 60 sn sessizlikten sonra CPU artışı olmamalı.

## CURUTULEN
- Sub osilatör: k = 1 + 9·tone, y = tanh(k·sin)/tanh(k) → 'tone=0 → saf sinüs' -> YANLIŞ. tone = 0'da k = 1 olur ve tanh(sin θ)/tanh(1) saf sinüs değildir (belirgin 3. harmonik içerir). Resmi davranış '%0 = pure sine' olduğu için formül k = 10·tone olmalı ve k < 1e-3 iken y = sin θ kullanılmalı. İkinci sorun: k ≈ 10'da dalga kareye yaklaşır, harmonikler 1/n ile söner ('hızla söner' değil). Sub oct 0 iken C8 ≈ 4,2 kHz'de aliasing duyulur, yani 'pratikte aliasing yok' iddiası da yanlış. Çözüm: sub'ı Tone'a göre 16 karelik küçük bir mip'li tablo (tanh-sinüs kareleri) olarak üretip aynı band-limited okuyucudan geçirmek. (https://www.ableton.com/en/manual/live-instrument-reference/)
- Bellek yerleşimi [s0 … s(len−1), s0, s1, s2] (G = 3 yalnızca sonda) ile 'Hermite için 1 ön-guard, G = 3' aynı anda geçerli -> Tutarsız. Hermite y[i−1..i+2] okur. Yerleşim [s(len−1) | s0 … s(len−1) | s0, s1] olmalı: 1 ön + 2 arka = 3 guard, kare taban ofseti +1. Doğrusal okuma i ve i+1'i, Hermite i−1..i+2'yi maskesiz okur. Vital'in kExtraValues = 3 değeri de toplam 3 ek örnektir; hepsinin sonda olduğu iddiası kaynakta yok. (https://github.com/mtytel/vital/blob/main/src/synthesis/lookups/wavetable.h)
- H_L = min(1023, 1024>>L) → 1023, 512, 256 … ve Eco profilinde L1 len = 1024 -> Kalite profilinde (len hep 2048) doğru. Eco'da len = 1024 olan seviyede Nyquist bin'i 512 olduğu için H en fazla 511, len = 256 olan seviyelerde en fazla 127 olur. fmax_L hesabında o seviyenin GERÇEK H değeri kullanılmalı: H_L = min(1024>>L, len_L/2 − 1). Tabloda L1 için '512' yazıyor, bu Eco'da hatalı. (https://www.earlevel.com/main/2012/05/25/a-wavetable-oscillator-the-code/)
- Konu 6 §10.2: padEl.addEventListener('pointerdown', () => ctx.resume(), {once:true}) ile ilk dokunuşta ses açılır -> Dokunmatik pointerdown activation-triggering değildir (yalnızca mouse pointerdown öyledir). iOS/Android'de bu handler sesi açamaz ve {once:true} yüzünden bir daha denenmez. Doğrusu: AudioContext'i mod kartının 'click' handler'ında oluşturup resume etmek, yedek olarak pointerup, touchend, mousedown, keydown ve click olaylarına capture ile bağlamak. Konu 7 §10 bunu doğru söylüyor; Konu 6 kendi içinde çelişiyor. (https://html.spec.whatwg.org/multipage/interaction.html#user-activation-processing-model)
- getCoalescedEvents Safari (macOS/iOS) desteği 'doğrulanamadı' -> BCD'ye göre Safari 18.2+ (iOS mirror) destekliyor, getPredictedEvents de 18.2'de geldi. Chrome 58+, Firefox 59+. Güvenli bağlam gerekli. Özellik tespiti (e.getCoalescedEvents varsa) yine de korunmalı. (https://github.com/mdn/browser-compat-data/blob/main/api/PointerEvent.json)
- pointerrawupdate yalnızca Chromium'da var -> Eskimiş bilgi. Firefox 148+ tam destekliyor (140–147 arasında kısmi, movementX/Y = 0). Chrome 77+. Safari'de yok. (https://github.com/mdn/browser-compat-data/blob/main/api/Element.json)
- navigator.audioSession Firefox 159'da destekleniyor (caniuse) -> MDN BCD Firefox için yalnızca 'preview' (Nightly/önizleme) gösteriyor, stable sürüm yok. Safari 16.4+ (iOS mirror). Chrome yok. (https://github.com/mdn/browser-compat-data/blob/main/api/AudioSession.json)
- Konu 6 §12.3: navigator.audioSession iOS 16 ve öncesinde yok -> API Safari/iOS 16.4'te geldi, yani iOS 16.4–16.7 cihazlarda var. Sessiz tuşu aşma davranışının iOS 17'den itibaren güvenilir olduğunu WebKit mühendisi söylüyor. Doğru ifade: 'API 16.4+, sessiz tuş etkisi 17+ için güvenilir'. Özellik tespiti yeterli. (https://bugs.webkit.org/show_bug.cgi?id=237322)
- Konu 7 §4 pad yüzeyi: notePB kapalıyken (glissando) releasePointerCapture yapılır -> Tek bir yakalama yüzeyinde pad indeksi zaten koordinattan hesaplandığı için capture'ı bırakmanın glissando'ya katkısı yok. Tersine, parmak yüzeyin dışına çıkıp orada kalkarsa pointerup yüzeye gelmez ve nota asılı kalır. Capture her zaman tutulmalı; glissando padAt(koordinat) değişimiyle yapılmalı. endVoice idempotent olmalı, çünkü pointerup'tan sonra lostpointercapture da gelir. (https://www.w3.org/TR/pointerevents3/)
- Drive yalnızca LP/HP/BP'de ve Clean dışı devrelerde (Push'ta da aynı) -> Kılavuz için doğru. Ancak Live 12 Push2 script'i Filters bankasında Drive'ı 'Bandpass veya Notch' ve BP/NO/Morph devresi Clean değilken de gösteriyor. Kılavuzla Push script'i arasında Notch için tutarsızlık var. Emülatör kılavuzu izlemeli (Notch'ta Drive gizli), fark not edilmeli. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/custom_bank_definitions.py)
- Pad fiziksel ölçüsü: 1 birim ≈ 0,1796 mm (380 mm / 2116), pad ≈ 26,2 × 19,4 mm -> Oran tutarsız. Cihaz 380 × 318 mm (oran 1,195), viewBox 2116 × 1725 (oran 1,227). Genişliğe göre ölçeklenirse yükseklik 309,8 mm çıkıyor, 318 değil. Ya çizim tam ölçekli değil ya da viewBox cihaz dışını da kapsıyor. mm tabanlı değerler (In Tune Width, Slide Height) için ±%3 hata payı kabul edilmeli. (https://www.ableton.com/en/push/tech-specs/)
- Konu 6 §0 tablosu: 'Chrome 153+ renderSizeHint destekler, kodda 128 sabitlenmez' yeterli bir önlem -> Doğru, ancak eksik: renderSizeHint verilmezse render quantum 128'de kalır. Yine de kodda outputs[0][0].length okunmalı; ön-tahsisli tamponlar 2048'e göre boyutlanmalı ya da boy değişince bir kez yeniden ayrılmalı. renderSizeHint:'hardware' Android'de büyük blok (ör. 192/256+) seçtirebilir ve olay zamanlaması alt-blok bölme sayesinde bundan etkilenmez. (https://www.w3.org/TR/webaudio-1.1/)

## DOGRULANAN
- [RESMİ, doğrudan okundu] Live 12 kılavuzu 31.13.2: modülasyon yokken osilatörlerin ham çıkışı 'perfectly band-limited', hiçbir perdede aliasing yok. https://www.ableton.com/en/manual/live-instrument-reference/
- [RESMİ] FM Tune: %50 (−%50) = modülatör 1 oktav üstte (altta), %100 (−%100) = 2 oktav; aradaki değerler inharmonik. Formül r = 2^(2·tune) bu çapa noktalarından geçiyor. Aynı URL.
- [RESMİ] Classic: PW her wavetable'a uygulanır, Sync fazı resetleyen 'hidden' osilatördür. Modern: Warp 'similar to pulse width', Fold wavefolding. Efekt tipi değişince iki efekt parametresinin değeri korunur. Aynı URL.
- [RESMİ] Sub: Tone %0 = saf sinüs, arttıkça harmonik artar. Octave anahtarlarıyla 1 ya da 2 oktav aşağı. Aynı URL.
- [RESMİ] Clean = EQ Eight ile aynı, tüm tiplerde var. OSR = SVF + hard-clip diyot, tüm tiplerde var. MS2 = Sallen-Key + soft clip, SMP = MS2 ile PRD arası, PRD = ladder, 'no explicit resonance limiting'. Son üçü yalnızca LP/HP'de var. Morph sırası LP→BP→HP→Notch→LP. Aynı URL.
- [RESMİ] Drive: 'low-pass, high-pass, or band-pass filter with any circuit type besides Clean'. Aynı URL.
- [RESMİ] Routing (Serial, Parallel, Split) metinleri spesifikasyondakiyle birebir aynı. Split'te 'Sub is split in half', filtre kapalıysa osilatör yine duyulur. Aynı URL.
- [RESMİ] Matris: additive toplanır. Multiplicative çarpılır, nötr değeri 1, minimumu 0. Time negatifken daha hızlı, pozitifken daha yavaş. Amount multiplicative. Aynı URL.
- [RESMİ] Zarf Slope tarifi, Loop modları (None / Trigger / Loop; Loop 'without holding the Sustain, until the voice ends'), LFO Shape tarifleri, Offset modüle edilemez, Retrigger, Attack fade-in, Note kaynağı C3 merkezli ve %100'de Filter Freq'i tam izler. Aynı URL.
- [RESMİ] Hi-Quality kapalıyken modülasyon 32 örnekte bir hesaplanır, düşük güçlü Cytomic filtreler kullanılır, CPU kazancı %25'e kadar. Live 11.1'den beri yeni instance'larda ve Core Library preset'lerinde varsayılan kapalı; eski setler HQ açık yüklenir. Aynı URL.
- [RESMİ] Unison modlarının tarifleri (Classic eşit aralık + dönüşümlü pan, Shimmer, Noise, Phase Sync, Position Spread, Random Note). Voices = osilatör başına eşzamanlı osilatör sayısı. Glide yalnızca Mono'da. Mono = legato zarflar. Aynı URL.
- [KOD, doğrudan okundu] Push2 custom_bank_definitions.py 'InstrumentVector' bankaları: Main (Oscillator, Table/Gain/Gain 1, Position/Tone/Gain 2, Filter Type/Octave/Gain Sub, Frequency, Resonance, Mod Time, Mod Amt) + VIEW 'mainbank_visualisation'; Oscillators; Filters (8. slot Routing, Slope seçenek düğmesinde); Global (Mono On, Glide/Poly Voices, Unison Mode, Unison Voices, Unison Amount, Transpose, boş, Volume); Envelopes (8. slot boş); LFOs (Rate Sync'e göre Rate veya S. Rate); Matrix; MIDI. FM etiketleri 'Pitch'/'Amount', Classic 'Pulse Width'/'Sync', Modern 'Warp'/'Fold'. https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/custom_bank_definitions.py
- [KOD] wavetable_decoration.py: MIN/MAX_UNISON_VOICE_COUNT = 2/8, available_effect_modes = ('None','Fm','Classic','Modern'), poly_voices_values = '2'..'8', routing Serial/Parallel/Split, osilatör seçici 1/2/S/Mix, filtre seçici 1/2. https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/ableton/v2/control_surface/wavetable_decoration.py
- [KOD] Vital: kWaveformBits = 11 (2048), kExtraValues = 3, kMaxUnison = 16. https://github.com/mtytel/vital (src/synthesis/lookups/wavetable.h, wave_frame.h, producers/synth_oscillator.h)
- [İKİNCİL] EarLevel '3.0 factor': fs/3'teki harmonik bir oktav kaydırılınca 2fs/3'e çıkar ve fs/3'e katlanır. 40 Hz için 368 harmonik ≈ 14,72 kHz (fs = 44,1 kHz). Relaxed seviye formülü fmax_L = (2/3)·fs/H_L bununla tutarlı. https://www.earlevel.com/main/2012/05/08/a-wavetable-oscillator%E2%80%94part-2/
- [MATEMATİK, bizim kontrolümüz] 440 Hz @48k örneği: fmax_4 = 32000/64 = 500 Hz → L = 4; tepe harmonik 28,16 kHz, alias 19,84 kHz. Crossfade ağırlığı w seviye sınırında süreklidir (f = fmax_L'de w = 1, sonraki seviyede w = 0 ile başlar).
- [MATEMATİK] Fourier katsayıları doğru: saw s_k = (2/π)(−1)^(k+1)/k (t = 0'da yükselen sıfır geçişi), square 4/(πk) tek k, triangle (8/π²)(−1)^((k−1)/2)/k². Pulse = r(t) − r(t−w) için s_k = −(2/(πk))(1−cos 2πkw), c_k = −(2/(πk)) sin 2πkw, DC = 0. Jacobi–Anger: sin(z sinθ) = 2Σ_{n tek} J_n(z) sin nθ.
- [MATEMATİK] Niemitalo 4 noktalı Hermite katsayıları (c0..c3) doğru.
- [İKİNCİL] Cytomic/Simper SVF: g = tan(πfc/fs), k = 1/Q (PDF: 'k = 1/Q'), a1/a2/a3, v1/v2/v3 ve ic1eq/ic2eq güncellemesi doğru. Simper'ın kendi tanımında peak = v0 − k·v1 − 2·v2. k·band tepe kazancını 1'e normalize eder (|H_bp(j)| = 1/k). https://www.cytomic.com/files/dsp/SvfLinearTrapOptimised2.pdf
- [MATEMATİK] 4. derece Butterworth kaskad Q değerleri 0,5412 / 1,3066 doğru.
- [İKİNCİL] Zavalishin TPT ladder denklemleri doğru: G = g/(1+g), S = G³S1 + G²S2 + G·S3 + S4, u = (x − kS)/(1 + kG⁴), tek kutuplu TPT güncellemesi v = (x − s)G; y = v + s; s = y + v. https://noisehack.com/research/VAFilterDesign_1.0.3.pdf
- [KOD] PolyBLEP (Finke/Tale) polinomları ve 'y += (Δ/2)·blep' işaret kontrolü doğru (naive saw için Δ = −2). Sync'te Δ = readWT(0) − readWT(frac(ρ)).
- [MATEMATİK] ADAA1 sinüs katlayıcı: F1(u) = −(2/π)cos(πu/2) doğru antitürev. Kötü koşullu durumda f(orta nokta) kullanmak standart yöntem (Parker ve ark. DAFx-16).
- [İKİNCİL] Szabo Super Saw ofsetleri ve mix eğrileri spesifikasyondakiyle aynı.
- [MATEMATİK] Eşit güçlü pan, DC blocker R = 1 − 2π·10/fs ≈ 0,99869 @48k, one-pole b1 = exp(−2π fc/fs) (τ ≈ 5,3 ms @30 Hz), 12 blokta bir meter ≈ 31,25 Hz @48k: hepsi doğru.
- [RESMİ] Chrome 153 (stable 8 Eylül 2026) AudioContext/OfflineAudioContext için renderSizeHint getirdi: tamsayı, 'default' (128) ya da 'hardware'. Spesifikasyon 64–2048 arası 2'nin kuvvetlerinin desteklenmesini zorunlu tutuyor. https://developer.chrome.com/release-notes/153 ; https://www.w3.org/TR/webaudio-1.1/
- [RESMİ/BCD] AudioWorklet: Chrome 66, Firefox 76, Safari 14.1 (iOS mirror). latencyHint: Chrome 58, Safari 14.1, Firefox yok. https://github.com/mdn/browser-compat-data
- [RESMİ/BCD] Web MIDI: Safari'de yok (webkit.org/b/107250). Firefox 108+ site permission add-on + güvenli bağlam + Permissions-Policy midi ile. Chrome 43+. Chrome 124'ten itibaren tüm Web MIDI erişimi için izin istemi kademeli olarak devreye girdi. https://developer.chrome.com/blog/web-midi-permission-prompt
- [RESMİ/BCD] PointerEvent.pressure: Chrome 55, Firefox 59, Safari 13. Spesifikasyon: basınç desteklemeyen donanımda buton basılıyken 0,5, değilken 0. https://www.w3.org/TR/pointerevents3/
- [RESMİ] HTML activation-triggering olayları: keydown (Esc hariç), mousedown, yalnızca pointerType 'mouse' olan pointerdown, mouse olmayanlarda pointerup, touchend. Dokunmatik pointerdown bu listede yok. https://html.spec.whatwg.org/multipage/interaction.html#user-activation-processing-model
- [BCD] screen.orientation.lock: Safari ve iOS'ta yok. Firefox ve Firefox Android 144+. Vibration: Safari yok, Firefox 129'da kaldırıldı. Keyboard.getLayoutMap yalnızca Chromium'da (69+).
- [YEREL] firebase.json'da '**' → /index.html rewrite var, COOP/COEP yok, X-Content-Type-Options: nosniff var. Worklet yolu yanlışsa HTML döner ve nosniff yüzünden modül yüklenmez. ders-push3.html'de ses kodu yok. ableton-lab.html'de 7 AudioContext ve Blob URL ile addModule var.
- [YEREL] SVG ölçümleri doğrulandı: PadButton (589,866) 146×108, PadButton_8 (1653,866), PadButton_57 (589,1664), PadButton_64 (1653,1664), pad adımı 152/114, TouchSlider (426,865) 107×907, Knob_9 126 çap (248,526), Knob_10 83,3 çap (263,7; 865,7), Knob_11 215,4 çap (1936,6; 482,6), LCD (581,482) 1222×220.
- [RESMİ] Push 3 genişliği 380 mm, derinliği 318 mm. 64 MPE pad, her birinde XY sensör. https://www.ableton.com/en/push/tech-specs/

## HALA BELIRSIZ
- Ableton Wavetable'ın sayısal parametre aralıkları (Filter Freq, Res, Drive dB, zarf süreleri, LFO Hz ve sync bölümleri, Glide ms, Detune cent) kılavuzda yok. Spesifikasyondaki değerler öneridir.
- Warp, Fold, PW, Sync ve FM'in Ableton'daki gerçek algoritmaları ve indeks ölçekleri yayımlanmamış. Verilen formüller çıkarımdır, kulakla ayarlanmalı.
- OSR, MS2, SMP ve PRD'nin gerçek Cytomic modelleri tescilli; SVF+clip ve TPT ladder karşılıkları yaklaşıktır.
- help.ableton.com CPU makalesi (192 ses, 'Fold en pahalı') 403 döndüğü için doğrudan okunamadı; bu bilgi yalnızca arama özetinden geliyor.
- Ableton'ın import kare boyu (1024) ve 256 kare sınırı yalnızca ikincil kaynakta geçiyor. Fabrika tablolarının kare boyu bilinmiyor.
- Push 3'ün (Control/Standalone) Wavetable bankalarını Live 12 Push2 script'iyle birebir aynı kullandığı doğrulanamadı. Push script'i Notch için Drive gösteriyor, kılavuz göstermiyor; gerçek cihazda hangisinin geçerli olduğu bilinmiyor.
- iPhone ve Android'de parmakla dokunmada PointerEvent.pressure'ın gerçekte ne döndürdüğü (0, 0,5 ya da force değeri) cihaza bağlı ve doğrulanmadı.
- Safari'de Blob URL ile audioWorklet.addModule davranışı doğrulanmadı; statik dosya önerisi bu yüzden duruyor.
- iOS 'interrupted' durumunda close + yeniden oluşturma çözümünün etkinliği test edilmedi.
- Chrome'un ses render thread'inde FTZ/DAZ (DenormalDisabler) ayarının AudioWorklet JS kodunu da kapsayıp kapsamadığı doğrulanmadı; Safari ve Firefox için bilgi yok. Denormal temizliği savunma amaçlı tutuldu.
- Push SVG çiziminin ölçeği cihazla tam uyuşmuyor (viewBox oranı 1,227, cihaz oranı 1,195). mm tabanlı MPE değerleri ±%3 hatalı olabilir; Knob_9 ve Knob_10'un Volume ve Tempo/Swing encoder'ı olduğu tahmin.
- CPU tahminleri ölçüme dayanmıyor; gerçek cihazda (iPhone A14+, orta segment Android) benchmark yapılmalı.
- EarLevel'in '512'lik sinüste doğrusal interpolasyon hatası ≈ −97 dB' değeri yeniden hesaplanmadı. Kaba tahminim ~−94 dB, yani aynı mertebe.
- Vital kWavetableFadeTime (7 ms) ve Surge/Serum dosya formatı ayrıntıları bu turda yeniden doğrulanmadı.