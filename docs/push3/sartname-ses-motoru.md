## 1. Sinyal grafiği
```
[AudioWorkletNode 'p3-wavetable' ×synth track] → trackGain(dB) → StereoPanner → muteGain ┐
[Drum: AudioBufferSource/pad → padGain(vel) → chokeBus] → drumGain → pan → muteGain ──────┼→ mixBus → softClip (WaveShaper, Lab makeSoftClipCurve, oversample '2x') → mainGain (Main Output dB) → destination
[Metronome osc/noise] → cueGain (Cue dB) ─────────────────────────────────────────────────────────────────────────────→ destination
```
- **Worklet içi:** voices → toplam → DC blocker (`R = 1−2π·10/fs`) → `tanh(1.2x)/1.2` → stereo çıkış. Ses başına kazanç 0.25.
- **Node ayarları:** `new AudioWorkletNode(ctx,'p3-wavetable',{numberOfInputs:0, numberOfOutputs:1, outputChannelCount:[2], processorOptions:{maxVoices:8, spare:4, profile}})`.
- **Tek çıkış varsayımı (VARSAYIM):** Tarayıcıda tek çıkış olduğu için `Headphones` hedefi Main ile aynıdır. `Cue` yalnız metronom seviyesini ayarlar (Push kılavuzu: metronom seviyesi Cue'dan).

## 2. Parametreler (`P3.wtp`)
Varsayılanlar ve çoğu aralık Wavetable.adv'den doğrulandı. `mod` sütunu: 0 = modüle edilemez, 1 = toplamsal, 2 = çarpımsal.
```js
function P(k,min,max,def,curve,unit,mod){ return {k:k,min:min,max:max,def:def,curve:curve,unit:unit||'',mod:mod||0}; }
function OSC(p,on,fx){ return [P(p+'On',0,1,on,'bool'),P(p+'Cat',0,5,0,'enum'),P(p+'Tab',0,15,0,'enum'),P(p+'Pos',0,1,0,'lin','%',1),
  P(p+'Transp',-24,24,0,'int','st',1),P(p+'Det',-.5,.5,0,'lin','st',1),P(p+'Fx',0,3,fx,'enum'),P(p+'Fx1',-1,1,0,'lin','%',1),
  P(p+'Fx2',0,1,0,'lin','%',1),P(p+'Pan',-1,1,0,'lin','pan',1),P(p+'Gain',0,1,1,'gain','dB',1)]; }
function FLT(p,on,type,freq){ return [P(p+'On',0,1,on,'bool'),P(p+'Type',0,4,type,'enum'),P(p+'Circ',0,4,0,'enum'),P(p+'CircB',0,1,0,'enum'),
  P(p+'Slope',0,1,0,'enum'),P(p+'Freq',20,20480,freq,'exp','Hz',1),P(p+'Res',0,1.25,0,'lin','%',1),P(p+'Drive',0,24,0,'lin','dB',1),P(p+'Morph',0,1,0,'lin','%',1)]; }
function ENV(p,amp){ return [P(p+'A',0,20,.001,'time','s',1),P(p+'D',.0015,20,.6,'time','s',1),
  amp?P(p+'S',0,1,.5011876,'gain','dB',2):P(p+'S',0,1,.5,'lin','%',1),P(p+'R',.0015,20,.6,'time','s',1),
  P(p+'ASl',-1,1,0,'lin','%'),P(p+'DSl',-1,1,.5,'lin','%'),P(p+'RSl',-1,1,.5,'lin','%'),P(p+'Loop',0,2,0,'enum')]
  .concat(amp?[]:[P(p+'Init',0,1,0,'lin','%',2),P(p+'Peak',0,1,1,'lin','%',1),P(p+'Fin',0,1,0,'lin','%',1)]); }
function LFO(p){ return [P(p+'Shape',0,4,0,'enum'),P(p+'Shp',-1,1,0,'lin','%',1),P(p+'Amt',0,1,1,'lin','%',2),P(p+'Phase',0,360,0,'lin','°'),
  P(p+'Sync',0,1,0,'enum'),P(p+'Rate',.01,30,1,'exp','Hz',1),P(p+'SRate',0,21,15,'enum'),P(p+'Att',0,20,0,'time','s',1),P(p+'Retrig',0,1,1,'bool')]; }
var WT_PARAMS = [].concat(OSC('o1',1,3), OSC('o2',0,0),
  [P('subOn',0,1,0,'bool'),P('subGain',0,1,.5011875,'gain','dB',1),P('subTone',0,1,0,'lin','%',1),P('subOct',0,2,1,'enum')],
  FLT('f1',1,0,20480), FLT('f2',0,1,20), [P('route',0,2,0,'enum')],
  ENV('amp',1), ENV('e2',0), ENV('e3',0), LFO('l1'), LFO('l2'),
  [P('modTime',-1,1,0,'lin','%',1),P('modAmt',0,2,1,'lin','%',2),P('transp',-48,48,0,'int','st',1),P('glide',0,20,0,'time','s'),
   P('vol',0,1,.3548134,'gain','dB',2),P('mono',0,1,0,'bool'),P('polyIdx',0,7,6,'enum'),P('uniMode',0,6,0,'enum'),
   P('uniVoices',2,8,3,'int'),P('uniAmt',0,1,.3,'lin','%',2),P('hq',0,1,0,'bool')],
  [P('AMP',0,1,1,'lin','%',2), P('PITCH',-48,48,0,'lin','st',1)]);   // 104,105: yalnız matris hedefi
// id = dizideki sıra (0..105). Sıra değişirse P3.K.V ve preset şeması sürümü artırılır.
var ENUMS = { Fx:['None','FM','Classic','Modern'], Type:['Lowpass','Highpass','Bandpass','Notch','Morph'], Circ:['Clean','OSR','MS2','SMP','PRD'],
  CircB:['Clean','OSR'], Slope:['12 dB','24 dB'], route:['Serial','Parallel','Split'], Loop:['None','Trigger','Loop'], subOct:['0','-1','-2'],
  Shape:['Sine','Triangle','Saw','Square','Random'], Sync:['Hz','Sync'], polyIdx:[2,3,4,5,6,7,8,16],
  uniMode:['None','Classic','Shimmer','Noise','Phase Sync','Position Spread','Random Note'],
  SRate:['1/64','1/48','1/32','1/24','1/16','1/12','1/8','1/6','3/16','1/4','5/16','1/3','3/8','1/2','3/4','1','1.5','2','3','4','6','8'] }; // VARSAYIM: 22 adım, 15='1' (bar)
```
- **Başlangıçta açık matris girişleri (.adv):**
  - `o1Pos` ← ModWheel 1.0, Slide 0.33
  - `o1Fx1` ← Pressure 0.07
  - `AMP` ← Velocity 0.5
  - `PITCH` ← PB 2/48, NotePB 1.0
- **Eğriler** (encoder'ın normalize değeri n ∈ [0,1] ile gerçek değer arasındaki dönüşüm):
  - `lin`: `min+n·(max−min)`
  - `exp`: `min·(max/min)^n`
  - `time`: `min+(max−min)·n³` (VARSAYIM)
  - `gain`: `dB = −70+70n`; n=0 ise −inf
  - `int/enum/bool`: yuvarlanır
- **Encoder hassasiyeti:**
  - Sürekli değerler: 200 px = tam aralık; Shift ile ×0.1. Tekerlek: çentik başına 0.01.
  - Enum: 24 px veya 1 çentik başına 1 adım.
  - `Osc Pitch` = Transp + Det (tek encoder): 8 px'te 1 st. Shift ile px başına 0.01 st. Ayrıştırma: `t=round(p), det=p−t`.
- **Ekran formatları (`fmt`)** (Figma/M3'te görülenler dışındakiler VARSAYIM):
  - Hz: <1000 ise `440 Hz`, üstünde `4.0 kHz`
  - Res: `0.0 %`
  - Pos, Mod Time: `51 %`
  - dB: `-6.0 dB`, `-inf dB`
  - Süre: <1 s ise `600 ms`, <10 ms ise `1.5 ms`, üstünde `1.20 s`
  - st: `+12 st` / `+0.35 st`
  - Pan: `C` / `25 L` / `25 R`
  - Derece: `90°`

## 3. Push'a özel sanal parametreler (`S.wtui`)
| Ad | Değerler | Varsayılan |
|---|---|---|
| Oscillator | 1, 2, S, Mix | 1 |
| Filter (Main Filter Switch ile ortak) | 1, 2 | 1 |
| Envelopes | Amp, Env2, Env3 | Amp |
| LFO | 1, 2 | 1 |
| Envelope View | Time, Slope (+Value mod env'lerde) | Time |
| Expression Mode | MPE, Mono/Poly | MPE |
| Mod Target | son eklenen hedef | — |

Osc N kapalıyken Category, Table, Effect Type ve Pitch sütunları gri (disabled) görünür.

## 4. Tablo veri modeli ve mip
- **Boyutlar:** kare boyu N0 = 2048, F = 64 kare. Position: `x=p·(F−1), i=floor(x), t=x−i, j=min(i+1,F−1)`.
- **Mip seviyeleri** L = 0..10: `H_L = min(1024>>L, len_L/2−1)`.
  - `std`/`hq` profilinde `len` her seviyede 2048 → H = 1023, 512 … 1.
  - `eco` profilinde len = 2048, 1024, 512, 256, 256… → H = 1023, 511, 255, 127, 64…
- **Bellek yerleşimi:** her kare `len+3` örnek tutar: `[s(len−1) | s0…s(len−1) | s0, s1]`. `base(L,f) = levelBase[L] + f·(len_L+3) + 1`. Doğrusal okuma `T[b+i], T[b+i+1]`, Hermite okuma `T[b+i−1..b+i+2]`; maske gerekmez.
- **Üretim (Worker):**
  - Kare başına c_k, s_k (k ≤ 1023).
  - Her seviyede `X[k] = (len/2)(c_k − i·s_k)`, k ≤ H_L; IFFT.
  - Tepe normalizasyonu L0'da hesaplanır (0.9), karenin tüm seviyelerine aynı katsayı uygulanır.
  - UI için ayrıca `disp: Float32Array(64·256)` üretilir.
  - PRNG: `mulberry32(1234)`, deterministik.
- **Mip seçimi:** f = en yüksek efektif temel frekans (pitch + en uç unison detune + efekt çarpanı).
  - `std`: `fmax_L = (2/3)·fs/H_L`
  - `hq`: `0.5·fs/H_L`
  - L = `f ≤ fmax_L` koşulunu sağlayan ilk seviye.
  - Seviye geçişi crossfade: `w = clamp((log2(f/fmax_L)+0.5)/0.5, 0, 1)`.
  - Örnek: 48 kHz, 440 Hz, std → L = 4.
- **Okuma:** faz float64. Doğrusal (std/eco) veya Niemitalo Hermite (hq/Hi-Quality):
  `c1=½(y1−y−1), c2=y−1−2.5y0+2y1−½y2, c3=½(y2−y−1)+1.5(y0−y1)`.
  Kareler arasında doğrusal karışım: 4 okuma, mip crossfade bölgesinde 8.
- **Önbellek:** Worklet global `Map` içinde tutulur, instance'lar paylaşır. Ana thread LRU yönetir: en fazla 6 tablo, `eco`'da 4. `{t:'drop',id}`.

## 5. Ses işleme sırası (ses başına)
**Kontrol dilimi (32 örnekte bir):**
- Kaynaklar `src[0..12]` hesaplanır:
  - 0 Amp, 1 Env2, 2 Env3, 3 LFO1, 4 LFO2
  - 5 Velocity `v/127`, 6 Key `(n−60)/120`
  - 7 PB (−1..1), 8 Pressure, 9 ModWheel
  - 10 Random (note-on'da −1..1), 11 Slide, 12 NotePB
- Hedefler normalize uzayda hesaplanır:
  - Toplamsal: `n' = clamp(n + modAmt·Σ a_s·src_s, 0, 1)`
  - Çarpımsal: `v' = v·Π(1 − |a|·modAmt + |a|·modAmt·u_s)`; `u` = kaynağın 0..1 hali (LFO/PB için `(x+1)/2`).
  - `exp` parametrelerde n bir oktav ölçeği gibi davranır: Freq için Δn = 0.1 = 1 oktav. Key kaynağıyla %100 = tam izleme.
  - Pitch hedefleri: `PITCH` için `a·48 st`, `oNTransp`/`oNDet` için `a·24 st`.
- Pos, faz artışı, mip seviyesi ve ağırlığı, filtre katsayıları ve pan hesaplanır; önceki dilim değerinden doğrusal rampayla geçilir.

**Her örnek:**
- `osc1 = Σ_u readFx(T1, pos1, φ_u)·g_u`, osc2 aynı şekilde; `sub = readSub(φs)`.
- Routing → F1/F2 (ses başına stereo durum).
- `× ampEnv(t)` (örnek başına) `× AMP × 0.25` → pan → toplama eklenir.

**Ses bitişi:** Amp < 1e−4 ve Release safhasındaysa. **Denormal koruması:** her blok sonunda `|s|<1e−15` olan filtre durumları 0 yapılır.

## 6. Osilatör efektleri (formüller kontrol edildi; ölçekler VARSAYIM, kulakla ayarlanır)
Efekt tipi değişince fx1/fx2 değerleri korunur.
- **FM** (Push: Pitch = fx1, Amount = fx2):
  - `r = 2^(2·tune)` (±%50 = ±1 oktav), `β = 4π·amt²`
  - `φm += r·inc`, `y = readWT(frac(φ + (β/2π)·sin2πφm))`
  - Mip seçimi `f0·max(1,r)·(1+0.5β)` ile.
- **Classic PW:** `w = 0.98·pw`, `s = 1/(1−w)`, `u = (φ−0.5)·s`, `y = |u|<0.5 ? readWT(u+0.5) : 0`. Mip seçimi `f0·s` ile.
- **Classic Sync:** `ρ = 2^(2·sync)`, `y = readWT(frac(φρ))`.
  - Master sarmasında `Δ = readWT(0) − readWT(frac ρ)`, `y += (Δ/2)·blep(φ, inc)`.
  - `blep`: t<dt ise `2x−x²−1` (x=t/dt); t>1−dt ise `x²+2x+1` (x=(t−1)/dt).
- **Modern Warp:** `d = 0.5−0.49·warp`; `φw = φ<d ? 0.5φ/d : 0.5+0.5(φ−d)/(1−d)`. Mip seçimi `f0·0.5/d` ile.
- **Modern Fold:**
  - `u = (1+7·fold)·x`
  - ADAA1: `y = (F1(u)−F1(u₋₁))/(u−u₋₁)`, `F1 = −(2/π)cos(πu/2)`; `|Δu|<1e−5` ise `sin(π/2·ū)`.
  - Çıkış `lerp((x+x₋₁)/2, y, min(1,10·fold))`. `hq`'da 2× oversample.
- **Sub:** `f = f0·2^(−oct)`, `k = 10·tone`.
  - `tone<0.001` ise saf sinüs; değilse `tanh(k·sin)/tanh(k)`.
  - Aliasing'e karşı dalga, 16 Tone karesi olan mip'li bir tablo olarak önceden üretilir ve aynı okuyucuyla çalınır.

## 7. Filtreler
- **Clean SVF (Simper):**
  - `g = tan(π·fc/fs)`, `q = res/1.25`, `k = 2 − 1.98·q`
  - `a1 = 1/(1+g(g+k))`, `a2 = g·a1`, `a3 = g·a2`
  - Adım: `v3 = v0−ic2; v1 = a1·ic1+a2·v3; v2 = ic2+a2·ic1+a3·v3; ic1 = 2v1−ic1; ic2 = 2v2−ic2`
  - Çıkışlar: low = v2, band = v1, high = v0−k·v1−v2, notch = v0−k·v1
  - `fc` sınırı: `[20, min(20000, 0.45·fs)]`
- **24 dB:** iki kademe. `k1 = 1/0.5412`, `k2 = 1/(1.3066 + q·(25−1.3066))`.
- **Morph:** `seg = floor(4m)`; `[low, k·band, high, notch, low]` dizisinde doğrusal karışım. Sıra LP→BP→HP→Notch→LP.
- **Drive:** 0–24 dB → `tanh(g·x)` → filtre → `÷√g`. Yalnız LP/HP/BP'de ve devre Clean değilken (kılavuz). Push script'i Notch'ta da gösteriyor; emülatör kılavuzu izler.
- **Devreler (Faz 2, yaklaşık):**
  - OSR: SVF + `ic1` sert kırpma ±1.2
  - MS2: SVF + `tanh(ic1)`
  - SMP: `x/(1+|x|)` + hafif drive
  - PRD: TPT ladder `u = (x−kS)/(1+kG⁴)`, sonra `tanh(drive·u)`, k ∈ [0,4]
  - MS2/SMP/PRD yalnız LP/HP'de.
- **Routing:**
  - Serial: F1→F2
  - Parallel: `0.5(F1+F2)`
  - Split: osc1→F1, osc2→F2, sub her birine yarı yarıya
  - Kapalı filtre bypass olur, sesi kesmez.

## 8. Zarf, LFO, matris, unison, polifoni
- **Zarf:**
  - Yükselen segment `curve(x,s) = s>0 ? 1−(1−x)^(1+4s) : s<0 ? x^(1+4|s|) : x`; düşen segment `1−curve(x,s)`.
  - Amp zarfı örnek başına, Env2/3 dilim başına hesaplanır.
  - Loop: None; Trigger (Decay bitince Release'e geçer, tuş tutulsa bile); Loop (A→D→R→A tuş tutuldukça döner; note-off'ta anlık değerden Release).
  - Mono legato'da zarf yeniden tetiklenmez.
- **Mod Time:** zarf süreleri `× 2^(3·modTime)`, LFO hızları `÷` aynı değer. **Mod Amt** tüm matris miktarlarını çarpar.
- **LFO** (ses başına):
  - Hız: `Rate` (Hz) veya `bpm/60/(bars·4)`.
  - Retrig açıksa note-on'da faz = Phase; kapalıysa instance'ın serbest fazı + Phase.
  - Attack: `min(1, t/att)`. Çıkış −1..1 × Amt.
  - Shape (VARSAYIM):
    - Sine/Saw: faz eğmesi `φ' = s≥0 ? φ^(1+3s) : 1−(1−φ)^(1+3|s|)`
    - Triangle: simetri `d = 0.5+0.49s`
    - Square: PW `0.5+0.49s`
    - Random: döngü başına S&H, `sign(u)·|u|^(2^(−2s))`
  - Saw aşağı doğru iner: `1−2φ`.
- **Unison** (osilatör başına, n = 2..8):
  - Ortak: `e_i = 2i/(n−1)−1`, kazanç `1/√n`, rastgele başlangıç fazı, pan `±|e_i|` dönüşümlü.
  - Classic: `A·50·e_i` cent.
  - Shimmer: 50–150 ms'de bir yeni hedef ±A·30 ct.
  - Noise: 1–3 ms'de bir ±A·15 ct.
  - Phase Sync: Classic + note-on'da faz 0.
  - Position Spread: pos ±0.5A·e_i, A·5 ct.
  - Random Note: note-on'da ±A·50 ct ve pos ±0.25A.
  - Mip seçimi en uçtaki sese göre yapılır.
  - Shimmer/Noise genlikleri VARSAYIM.
- **Poly:** ses sayısı `ENUMS.polyIdx`'ten (16 yalnız `hq` + unison kapalıyken), +4 kuyruk slotu.
  - Çalma sırası: aynı nota → boş ses → Release'teki en sessiz → en eski (en alt ve en üst tutulan nota korunur).
  - Çalınan ses kuyruk slotunda 3 ms'de söner.
- **Mono:** son-nota yığını, legato. Glide yalnız Mono'da, yarım ton domeninde doğrusal.

## 9. Worklet protokolü ve zamanlama
- **Ana thread → worklet:**
  - `{t:'p', i:Uint16Array, v:Float32Array}` (rAF'te birleştirilir, ≤60 Hz)
  - `{t:'m', tgt, src, amt}`
  - `{t:'on', id, n, v, at}`, `{t:'off', id, at}`
  - `{t:'x', id, bend, slide, press, at}`
  - `{t:'pb'|'mw'|'press', v, at}`
  - `{t:'tempo', bpm}`
  - `{t:'tab', osc:1|2, id}`, `{t:'tdata', id, F, levels:[{len,H,base}], buf}` (Transferable), `{t:'drop', id}`
  - `{t:'panic'}`
- **Worklet → ana thread:** `{t:'meter', l, r, voices, cpu, pos1, pos2}` her 12 blokta bir; `{t:'need', id}`.
- **Olay kuyruğu:** `onmessage` yalnız önceden ayrılmış halka kuyruğa (`Float64Array(1024·6)`) yazar. `process()` içinde bellek ayrılmaz ve her zaman `true` döner.
- **Blok boyu:** `n = outputs[0][0].length` her çağrıda okunur; tamponlar 2048'e göre ayrılır. Olay ofseti `round((at−currentTime)·sampleRate)`. Blok olay noktalarından alt bloklara bölünür, alt bloklar 32'lik dilimlerle işlenir.
- **Hata:** `node.onprocessorerror` → node yeniden kurulur, tablolar tekrar gönderilir, toast gösterilir.

## 10. Profiller ve CPU koruması
| Profil | Okuma | Mip | Unison | Fold | Seçim |
|---|---|---|---|---|---|
| `hq` | Hermite | 0.5·fs | ≤8 (unison-osc ≤128) | 2×OS | Hi-Quality param'ı açıksa |
| `std` | doğrusal | 2/3·fs | ≤8 | ADAA | masaüstü varsayılanı |
| `eco` | doğrusal, eco uzunluklar | 2/3·fs | ≤4 (unison-osc ≤48) | ADAA | mobil UA veya `hardwareConcurrency ≤ 4` |

- **Ölçüm:** 32 bloğun `Date.now()` farkı / blok süresi.
- **Eşik:** 3 ardışık ölçüm %70'i aşarsa bir kademe düşülür: hq→std→eco, ardından poly 6, sonra 4. Kullanıcıya toast: `Ses kalitesi CPU için düşürüldü`.
- **Toplam ses bütçesi (VARSAYIM):** tüm synth track'lerde ≤16 (std), ≤10 (eco).

## 11. Tablolar
Hepsi prosedürel ve kendi isimlerimizle; Ableton'ın fabrika tabloları kullanılmaz.

| # | Kategori (Cat) | Tablo | Tarif (64 kare boyunca) | Faz |
|---|---|---|---|---|
| 0 | Temel | Temel Şekiller | sine→tri→saw→square, her geçişte 21 kare spektral karışım. tri `(8/π²)(−1)^((k−1)/2)/k²`, saw `(2/π)(−1)^(k+1)/k`, square `4/(πk)` (tek k) | 1 |
| 1 | Temel | Pulse | w 0.5→0.02: `s_k=−(2/πk)(1−cos2πkw)`, `c_k=−(2/πk)sin2πkw` | 1 |
| 2 | Temel | Sinüs Katlama | g 0→8: `s_n = 2·J_n(πg/2)`, yalnız tek n | 1 |
| 3 | Harmonik | Harmonik Tarama | f. karede ilk `1+f` harmonik, `1/k` | 1 |
| 4 | Harmonik | Tek↔Çift | tek harmonikler (1−t), çift harmonikler t, `1/k` | 1 |
| 5 | Harmonik | Organ | 16' temel: harmonikler 1,3,2,4,6,8,10,12,16. 8 drawbar kaydı arasında interpolasyon | 1 |
| 6 | Vokal | Vokaller | A→E→I→O→U. Peterson & Barney erkek F1/F2/F3: a 730/1090/2440, e 530/1840/2480, i 270/2290/3010, o 570/840/2410, u 300/870/2240. f0 = 130.8 Hz'de Lorentz BW 80/90/120 Hz, `×k^−0.5` | 1 |
| 7 | FM | FM Tarama | oran 1, indeks 0→6. 8× zaman domeninde → FFT → k≤1023 | 1 |
| 8 | Sync | Sync Tarama | ρ 1→8, 8× OS → FFT | 2 |
| 9 | Dijital | Bitcrush | saw, 64→2 seviye, 8× OS | 2 |
| 10 | Gürültü | Gürültü Spektrumu | seed'li rastgele faz, eğim −6→0 dB/okt | 2 |
| 11 | Dijital | Rezonans Tarama | saw × tepe (harmonik 2→40, Q 8) | 2 |

## 12. Presetler (`P3.wtp.PRESETS`)
Burada yazılmayan her parametre WT_PARAMS varsayılanındadır. Değerler VARSAYIM, kulakla ayarlanır.
1. `init` — **Init:** tablo 0, pos 0 (sinüs).
2. `saw-lead` — **Süper Testere:** tablo 0 pos .66; unison Classic 5 ses, 0.35; f1 LP 6 kHz; amp A 5 ms, D 600 ms, S −3 dB, R 300 ms.
3. `deep-bass` — **Derin Bas:** mono, glide 40 ms; tablo 0 pos .66; sub açık −1 okt −3 dB; f1 LP 24 dB 400 Hz, res .3; Env2 (D 250 ms, S 0) → f1Freq +0.4; amp D 300 ms, S −6 dB, R 100 ms.
4. `pluck` — **Pluck:** tablo 3 pos .3; f1 LP 12 dB 1.2 kHz; Env2 D 180 ms, S 0 → f1Freq +0.6; amp S −inf, D 400 ms.
5. `pos-pad` — **Pozisyon Pad:** tablo 6; LFO1 0.12 Hz → o1Pos +0.4; unison Shimmer 4 ses; amp A 800 ms, R 1.8 s; LP 3 kHz.
6. `wobble` — **Wobble Bas:** tablo 0 (Faz 2'de tablo 8); mono; LFO1 Sync 1/8 → f1Freq +0.5; LP 24 dB.
7. `fm-bell` — **FM Çan:** tablo 0 pos 0; FX FM, fx1 +.5 (×2), fx2 .35; amp D 1.2 s, S −inf, R 1 s.
8. `organ` — **Organ:** tablo 5 pos .5; amp S 0 dB; LFO1 5.5 Hz → PITCH +0.003.
9. `vocal-lead` — **Vokal Lead:** tablo 6; ModWheel → o1Pos 1.0; Env2 → o1Pos +0.3.
10. `fold-bass` — **Katlanmış Bas:** tablo 2; FX Modern, fx2 .4; mono.
11. `noise-atmo` — **Atmosfer:** tablo 3 (Faz 2'de tablo 10); f1 HP 300 Hz; LFO1 0.05 Hz → o1Pos; amp A 2 s, R 3 s.
12. `acid` — **Acid:** tablo 0 pos .66; f1 LP 24 dB res .9; Env2 D 150 ms, S 0 → f1Freq +0.5; mono glide 60 ms.

## 13. Drum kit ve metronom
- **`p3kit` pad'leri** (pad = nota − 36):
  - 0 `Kick.wav`
  - 2 `Snare.wav`
  - 6 `Close Hat.wav`
  - 10 `Open Hat (1).wav`
  - Faz 2'de prosedürel eklenecekler (Lab'deki `synthDrum` tarifleri): 1 Rim, 3 Clap, 5 Low Tom, 13 Crash.
- **Choke:** Closed Hat, Open Hat'i susturur (VARSAYIM).
- **Pad kazancı:** `0.8·vel/127` (VARSAYIM).
- **Zamanlama:** `AudioBufferSource.start(when)` ana thread'den planlanır.
- **Metronom** (downbeat için frekans ×1.5, seviye Cue'dan):
  - Classic: 1 kHz sinüs, 30 ms üstel sönüm
  - Click: 5 ms gürültü, HP 3 kHz
  - Wood: gürültü → BP 2.2 kHz, Q 8, 40 ms

## 14. Fallback (worklet yoksa veya güvenli bağlam değilse)
- Ses başına 2 `OscillatorNode` ve kareden üretilen `PeriodicWave`. Pos değişince en fazla 15 Hz ile yeniden üretilir.
- Sub: sinüs osilatörü.
- Filtre: `BiquadFilter` (24 dB için iki tane; Morph → LP).
- Zarf: `GainNode` ADSR, `setTargetAtTime` ile.
- FX ve unison yok.
- LCD'de rozet `Basic audio`, panelde açıklama.
- `S.app.audio = 'fallback'`.