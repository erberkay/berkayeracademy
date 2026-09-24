## 1. Sabitler (doğrulandı: KOD + P3)
```js
var NOTE_NAMES = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
function noteName(m){ return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 2); }   // 36→C1, 60→C3, 0→C-2, 127→G8
var ROOT_NOTES = [0,7,2,9,4,11,5,10,3,8,1,6];   // upper2..7 = idx0..5 (C G D A E B); lower2..7 = idx6..11 (F B♭ E♭ A♭ D♭ G♭)
var LAYOUTS = [{name:'4ths',iv:3},{name:'3rds',iv:2},{name:'Sequential',iv:null}];
var CHROMA = [0,2,4,5,7,9,10,11];
var SCALES = [
 ['Major',[0,2,4,5,7,9,11]],['Minor',[0,2,3,5,7,8,10]],['Dorian',[0,2,3,5,7,9,10]],['Mixolydian',[0,2,4,5,7,9,10]],
 ['Lydian',[0,2,4,6,7,9,11]],['Phrygian',[0,1,3,5,7,8,10]],['Locrian',[0,1,3,5,6,8,10]],['Whole Tone',[0,2,4,6,8,10]],
 ['Half-whole Dim.',[0,1,3,4,6,7,9,10]],['Whole-half Dim.',[0,2,3,5,6,8,9,11]],['Minor Blues',[0,3,5,6,7,10]],['Minor Pentatonic',[0,3,5,7,10]],
 ['Major Pentatonic',[0,2,4,7,9]],['Harmonic Minor',[0,2,3,5,7,8,11]],['Harmonic Major',[0,2,4,5,7,8,11]],['Dorian #4',[0,2,3,6,7,9,10]],
 ['Phrygian Dominant',[0,1,4,5,7,8,10]],['Melodic Minor',[0,2,3,5,7,9,11]],['Lydian Augmented',[0,2,4,6,8,9,11]],['Lydian Dominant',[0,2,4,6,7,9,10]],
 ['Super Locrian',[0,1,3,4,6,8,10]],['8-Tone Spanish',[0,1,3,4,5,6,8,10]],['Bhairav',[0,1,4,5,7,8,11]],['Hungarian Minor',[0,2,3,6,7,8,11]],
 ['Hirajoshi',[0,2,3,7,8]],['In-Sen',[0,1,5,7,10]],['Iwato',[0,1,5,6,10]],['Kumoi',[0,2,3,7,9]],['Pelog Selisir',[0,1,3,7,8]],
 ['Pelog Tembung',[0,1,5,7,8]],['Messiaen 3',[0,2,3,4,6,7,8,10,11]],['Messiaen 4',[0,1,2,5,6,7,8,11]],['Messiaen 5',[0,1,5,6,7,11]],
 ['Messiaen 6',[0,2,4,5,6,8,10,11]],['Messiaen 7',[0,1,2,3,5,6,7,8,9,11]] ];
// 25–35 arasındaki gamların aralıkları üçüncü taraf bir referanstan (Live ile çalışma anında karşılaştırılmış). Live 9'daki 6 notalı 'Pelog' KULLANILMAZ.
```

## 2. Pad → MIDI dönüşümü (S = {root, idx, inKey, fixed, layoutIdx}, t.pos = position)
```js
var iv  = function(S){ return SCALES[S.idx][1]; };
var n   = function(S){ return iv(S).length; };
var L   = function(S){ return S.inKey ? n(S) : 12; };                      // page_length
var pcs = function(S){ return new Set(iv(S).map(function(i){ return (i + S.root) % 12; })); };
var f   = function(S){ return S.inKey ? Array.from(pcs(S)).sort(function(a,b){return a-b;}).indexOf(S.root) : S.root; };
var P   = function(S){ return S.fixed ? 0 : f(S); };                        // page_offset
var posCount = function(S){ return S.inKey ? P(S) + n(S) * (S.root < 8 ? 11 : 10) : 139; };
var R   = function(S){ var v = LAYOUTS[S.layoutIdx].iv; return v === null ? (S.inKey ? n(S) : 8) : (S.inKey ? v : CHROMA[v]); };
var W   = function(S){ return (LAYOUTS[S.layoutIdx].iv === null && S.inKey) ? n(S) + 1 : 8; };
var _A = {};                                                                // önbellek anahtarı: root|idx|inKey
function A(S){ var k = S.root + '|' + S.idx + '|' + S.inKey; if (_A[k]) return _A[k];
  var set = pcs(S), a = []; for (var m = 0; m < 200; m++) if (!S.inKey || set.has(m % 12)) a.push(m); return (_A[k] = a); }
function padNote(S, pos, x, y){ if (x >= W(S)) return null; var m = A(S)[Math.round(pos) + x + R(S) * y];
  return (m === undefined || m > 127) ? null : m; }                          // x 0..7 soldan, y 0..7 alttan
function padClass(S, m){ if (m === null) return 'none'; var pc = m % 12;
  return pc === S.root ? 'root' : (pcs(S).has(pc) ? 'scale' : 'out'); }     // 'out': yalnız Chromatic'te var, sönük görünür ama çalar
function defaultPos(S){ return 3 * L(S) + P(S); }                            // C Major: 21; Chromatic C: 36
function realign(Sold, Snew, pos){                                          // kök, gam, In Key veya Fixed değişince
  var p = P(Snew) + (pos - P(Sold)) * L(Snew) / L(Sold); if (p >= posCount(Snew)) p -= L(Snew); return p; }
```
- **Fixed On:** Kod, C1'den (36) başlayıp yukarı doğru ilk gam notasını alır (`P = 0`, `pos = 3L`). Örnekler: D major 37, A minor 36, E minor pentatonik 38. Kılavuzda "C'ye en yakın nota" yazıyor ve bu kodla ayrışabilir; emülatör kodu izler.
- **Chromatic + Fixed:** sol alt pad her zaman C.
- **Sequential + In Key:** Satırın son pad'i, üst satırın ilk pad'iyle aynı notadır (kod böyle davranıyor; Push 2 metni bununla çelişiyor, doğrulanamadı).

## 3. Oktav
```js
function rem(S,p){ return ((p - P(S)) % L(S) + L(S)) % L(S); }
function octUp(S,t){ t.pos = Math.min(t.pos + (L(S) - rem(S,t.pos)), posCount(S) - L(S)); }
function octDown(S,t){ var r = rem(S,t.pos); t.pos = Math.max(t.pos - (r === 0 ? L(S) : r), 0); }
function shiftStep(S,t,d){ t.pos = P3.u.clamp(t.pos + d, 0, posCount(S) - L(S)); }       // Shift+Octave = ±1
function canUp(S,t){ return t.pos < posCount(S) - L(S); }  function canDown(S,t){ return t.pos > 0; }   // LED kuralı: [P3] 'unlit if no additional octaves'
function rangeText(S,t){ var lo = padNote(S,t.pos,0,0), hi = padNote(S,t.pos,7,7);
  return 'Play ' + noteName(lo) + ' to ' + noteName(hi == null ? 127 : hi); }            // metin VARSAYIM
```
- C Major'da varsayılan pozisyondan 3 kez aşağı, 7 kez yukarı gidilebilir. Kök A♭–B iken 10 oktav vardır. Chromatic'te pos 0–127.
- **Touch strip + Shift:** strip boyunun her 1/8'i bir oktav adımıdır (VARSAYIM).

## 4. Scale menüsü olayları
| Girdi | İşlev |
|---|---|
| upper k (2..7) | `root = ROOT_NOTES[k−2]` |
| lower k (2..7) | `root = ROOT_NOTES[k+4]` |
| lower1 | inKey ⇄ |
| lower8 | fixed ⇄ |
| enc1 | layoutIdx ±1, 0..2 aralığında sınırlanır, döngü yok |
| enc2..7 | idx ±1 (0..34) |
| D-pad ↑ / ↓ / ← / → | −1 / +1 / −4 / +4, sınırlanır |

Her değişiklikte sırasıyla: `realign` → pad nota ve renk tabloları yeniden hesaplanır → LED ve LCD güncellenir. Tempo, gam ve kök **global**dir (Live 12 Song scale). `pos` her track'te ayrı tutulur.

## 5. Pad renkleri (emülatör hex değerleri; tonlar VARSAYIM)
```js
var PC = { off:'#1D1C22', gray:'#3A3A40', grayL:'#7A7A80', white:'#E6E6E6', green:'#38D65A', red:'#FA325E', blueD:'#2448C8' };
function shade(hex,k){ /* rgb × k */ } function tint(hex,t){ /* hex → beyaz, t oranında */ }
```
- **64 Notes:** Öncelik sırası: çalıyor (kayıtta `red`, değilse `green`) > `root` (track rengi) > `scale` (`white`) > `out` ve `none` (`off`). Yanma durumu nota numarasına bağlıdır; aynı perdeyi çalan tüm pad'ler birlikte yanar (çıkarım).
- **Drum pad'leri (P3):** Öncelik sırası: çalıyor `green` > seçili `white` > solo `blueD` > mute `shade(track, 0.4)` > sesli `track` > boş `gray`.
- **Step'ler:**
  - Boş: `gray`.
  - Nota var: clip rengi velocity'ye göre kısılır. vel ≥ 120 → ×1.0; ≥ 60 → ×0.65; altı → ×0.4 (VARSAYIM).
  - Mute: `tint(clip, .55)`.
  - Playhead: `green`, kayıtta `red`.
  - Basılı tutulan step: `white` ile `grayL` arasında blink.
  - Triplet'te sağdaki 2 sütun: `off`.
- **Loop pad'leri:** loop dışı `off` / loop içinde ama görünmüyor `gray` / görünüyor `white` / çalıyor `green` / kayıtta `red`.
- **Melodic Sequencer (F2):**
  - Satır zemini: kök satırı `grayL`, gam içi satırlar `gray`, gam dışı `off`.
  - Seçili nota: `tint(clip, .5)`.
- **32 Notes yarısı (F2):** Melodic Sequencer + 32 Notes düzeninin nota yarısı. Seçili nota `tint(track, .5)`.

## 6. Drum Loop Selector eşlemesi (y alttan sayılır)
```js
var GRID = [{n:'1/32t',b:1/12,tr:1},{n:'1/32',b:1/8},{n:'1/16t',b:1/6,tr:1},{n:'1/16',b:1/4},
            {n:'1/8t',b:1/3,tr:1},{n:'1/8',b:1/2},{n:'1/4t',b:2/3,tr:1},{n:'1/4',b:1}];   // index = scene düğmesi − 1 (yukarıdan)
var GRID_DEF = 3, REPEAT_DEF = 5;   // grid 1/16 [P3]; repeat 1/8 [P2S] (Push 3 için VARSAYIM)
var CLIP_LEN = [2,4,4,8,8,16,16,32]; // yeni clip uzunluğu (beat); index = grid
function drumCell(x, y, t){ var g = GRID[t.grid], spp = g.tr ? 24 : 32;
  if (y >= 4){ var row = 7 - y; if (g.tr && x >= 6) return {k:'none'};
    return {k:'step', step: t.page * spp + row * (g.tr ? 6 : 8) + x}; }
  if (x < 4) return {k:'drum', pad: t.bank + y * 4 + x};                   // nota = 36 + pad; pad 0 = sol alt
  return {k:'loop', page: t.loopOff + (3 - y) * 4 + (x - 4)}; }            // sol üstten okunur
function pageBeats(t){ var g = GRID[t.grid]; return (g.tr ? 24 : 32) * g.b; }
function loopPadBeats(t){ return P3.u.clamp(pageBeats(t), 0.25, 4); }     // 1/32t dışındaki tüm çözünürlüklerde 1 bar
// bank: −36…76 aralığında sınırlanır; Octave ±16, Shift ±4; canUp = bank+16 ≤ 76 → LED
```
**Step sequencer davranışı**
- İlk step girilince clip `CLIP_LEN[grid]` beat uzunluğunda açılır ve çalma başlar.
- Boş step'e dokunmak seçili pad'in notasını ekler: velocity 100 (Accent açıksa 127), süre 1 step.
- Dolu step'e dokunmak notayı siler.
- Step 300 ms'den uzun tutulursa düzenleme moduna geçer; bırakınca silinmez (F2).
- Loop pad'e bas-tut ve sonra başka bir loop pad'e dokun → loop aralığı. Çift dokunuş (500 ms içinde) → loop tek sayfa olur. Tek dokunuş → görünüm o sayfaya kilitlenir.
- Loop pad'ine basıldığında clip yoksa `(pad+1)` bar uzunluğunda clip açılır.
- Mute + step → step devre dışı. Delete + drum pad → o pad'in notaları silinir; notası yoksa pad boşaltılır (undo'lu). Select + pad → sessiz seçim.

## 7. Session eşlemesi (F2)
- `track = trackOff + x`, `scene = sceneOff + (7 − y)`.
- Boş pad'e basmak o track'teki clip'i durdurur. Launch quantization 1 bar (VARSAYIM, Live varsayılanı).

## 8. Velocity
```js
function velOf(ev, S){ if (S.accent) return 127; if (ev.src.indexOf('key:') === 0) return P3.K.kbVel;          // klavye: 100 ± 20'lik adımlar
  if (ev.pointerType === 'pen' || (ev.pressure > 0 && ev.pressure !== 0.5 && ev.pressure !== 1)) return velCurve(ev.pressure);   // F3
  return 100; }
```

## 9. Swing, Repeat, Quantize (VARSAYIM formüller)
- **Swing** yalnız Quantize, Rec. Quantize ve Repeat'e uygulanır [P3]. Tek indeksli grid noktası `(S/100)·(1/3)·gridStep` kadar geciktirilir; %100'de triplet hissi verir. Step'e girilen notalar etkilenmez.
- **Repeat:** Pad basılıyken ilk tetik `ceil(beatNow/rate)·rate` noktasındadır, ardından rate aralığıyla tekrarlar. Velocity sabittir (Accent açıksa 127).
- **Quantize:** `start' = start + A·(nearestGrid(start, to, swing) − start)`. Varsayılanlar: A = %100, to = 1/16.

## 10. Test vektörleri
- **C Major / In Key / 4ths (p=21):**
  - Satır 0: 36 38 40 41 43 45 47 48.
  - Satır 1: 41 43 45 47 48 50 52 53.
  - Sağ üst: 84.
  - Majör akor şekli: (0,0)+(2,0)+(1,1).
- **C'den D Minor'a geçiş:** p=22, satır 0: 38 40 41 43 45 46 48 50.
- **A Minor:** Fixed Off → 45 (p=26); Fixed On → 36. D Major Fixed On → 37.
- **Chromatic C:**
  - 4ths: `36+x+5y`, sağ üst 78.
  - 3rds: `36+x+4y`.
  - Sequential: `36+x+8y`.
- **C Minor Pentatonic Sequential:** p=15, satır 0: 36 39 41 43 46 48; sütun 6–7 sönük.
- **C Major p=70:** satır 0: 120 122 124 125 127, sonrası `null`.
- **Octave ▲×2 (p=35):** (0,1)=65; 3rds'te 64, Sequential'da 72.