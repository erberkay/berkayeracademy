# KONU 7: Web platformu ve etkileşim (Push 3 emülatörü)

> Kapsam: ders-push3.html içine eklenecek "Serbest Mod" (online Push 3), "Öğretici", "Seviye 1" ve "Seviye 2" modları için ortak girdi ve ses katmanı.
> **[R]** etiketi resmi kaynaktan gelen bilgiyi, **[K]** yerel koddan ya da gözlenen sitelerin JS'inden gelen bilgiyi, **[Ö]** bizim tasarım önerimizi gösterir. [Ö] sayıların Ableton'da doğrulanmış bir karşılığı yoktur, ayar olarak düşünülmelidir.

---

## 0. Özet kararlar

| Konu | Karar | Dayanak |
|---|---|---|
| Girdi API'si | Yalnızca **Pointer Events** kullanılacak. Touch Events ve mouse olayları ayrıca dinlenmeyecek. Pad yüzeyinde `touch-action:none`. | Pointer Events Safari 13+, iOS 13.2+ ve Chrome 55+ ile tam destekli [R] |
| Pad isabet tespiti | 64 ayrı hotspot yerine **tek bir capture yüzeyi** kullanılacak, pad indeksi SVG koordinatından hesaplanacak. Erişilebilirlik için 64 odaklanabilir gridcell ayrıca tutulacak. | MPE hareketinde parmak bir paddan diğerine geçer. Tek yüzeyle yakalama (capture) daha basit kalır [Ö] |
| Velocity | Gerçek basınç varsa (pen ya da değişken pressure) basınçtan hesaplanır. Yoksa **sabit 100** kullanılır; **Accent = 127**, klavyeden ±20. | Basınç desteği olmayan donanım `0.5` döndürür [R]. Accent'in 127 vermesi Push 3'te de böyledir [R] |
| MPE | Push 3'teki gibi varsayılan olarak açık. Expression Mode MPE, In Tune Location = Finger, Note Pitch Bend = Auto (Wavetable'da açık). | Push 3 kılavuzu [R] |
| Encoder | Dikey sürüklemede 200 px tüm aralığı gezer. Shift ×0.1 hassasiyet verir. Wheel desteklenir. Dokunmak parametreyi LCD'de gösterir. Çift tık ya da Delete+dokunma varsayılana döndürür. | Push'ta Shift ince ayar ve Delete+touch reset var [R]. 200 px değeri [Ö] |
| Klavye | `KeyboardEvent.code` kullanılır. İki düzen var: **Pad Izgarası** (varsayılan, 4 sıra) ve **Piyano (Live)**. | Live Computer MIDI Keyboard [R], Learning Synths ve Launchpad Arcade [K] |
| Web MIDI | Yalnızca kullanıcı butona basınca istenir, varsayılan kapalıdır. Safari'de buton gizlenir. | Safari'de Web MIDI yok. Chrome 124+ her MIDI erişimi için izin sorar [R] |
| Ses | Tek AudioContext. Mod kartına tıklama (kullanıcı etkileşimi) anında oluşturulur. `navigator.audioSession.type='playback'`, `latencyHint:'interactive'`. AudioWorklet varsa kullanılır, yoksa PeriodicWave fallback. | [R] |
| Mobil | Üç görünüm: **Tam Cihaz**, **Pad Odak** (viewBox kırpma) ve **Bölünmüş** (telefon yatay). Telefonda Tam Cihaz görünümünde çalma yapılmaz. | Telefonda tam cihaz görünümünde pad yüksekliği yaklaşık 20 px kalır, bu WCAG 2.5.8'in 24 px sınırının altında [R + hesap] |
| Marka | Başlık "Ableton" ile başlamayacak, logo kullanılmayacak, bağımsızlık notu eklenecek. | Ableton Branding Guidelines [R] |

---

## 1. Tarayıcı destek matrisi (2026-09 itibarıyla)

| Özellik | Chrome / Edge | Firefox | Safari macOS | Safari iOS/iPadOS | Chrome Android |
|---|---|---|---|---|---|
| Pointer Events | 55+ / 79+ | 59+ | 13+ | 13.2+ (13.0 kısmi) | ✓ |
| `touch-action` | 36+ | 52+ | — (masaüstünde gerek yok) | 13+ tam, 9.3–12.5 kısmi | ✓ |
| `PointerEvent.pressure` | Baseline (2020) | ✓ | ✓ | ✓ (değer donanıma bağlı) | ✓ |
| `getCoalescedEvents()` | ✓ | ✓ | doğrulanamadı | doğrulanamadı | ✓ |
| Web MIDI | 43+ / 79+ (124+ her erişimde izin istemi) | 108+ (site permission add-on gerekli) | **✗** | **✗** | ✓ |
| AudioWorklet | 66+ / 79+ | 76+ | 14.1+ | 14.5+ | ✓ |
| `latencyHint` | 58+ | **✗** (yok sayılır) | 14.1+ | 14.5+ | ✓ |
| `navigator.audioSession` | ✗ | 159 (caniuse'a göre; doğrulanamadı) | 16.4+ | 16.4+ (WebKit mühendisine göre "iOS 17'den beri") | ✗ |
| `screen.orientation.lock()` | masaüstünde kısmi | 144+ | ✗ | **✗** | ✓ (genelde fullscreen şartı) |
| Fullscreen API | ✓ | ✓ | 16.4+ | kısmi | ✓ |
| Vibration API | ✓ | 129+ sürümde kaldırıldı | ✗ | ✗ | ✓ |
| `dvh/svh/lvh` | 108+ | 101+ | 15.4+ | 15.4+ | ✓ |

Güvenli bağlam (HTTPS) gerektirenler: Web MIDI, AudioWorklet, `getCoalescedEvents`, `navigator.keyboard.getLayoutMap`. Firebase Hosting HTTPS olduğu için sorun yok. Yerel testte `file://` çalışmaz. `http://localhost` güvenli bağlam sayıldığı için yerel sunucu kullanılmalı.

---

## 2. Girdi mimarisi

Bütün kaynaklar tek bir olay biçimine indirgenir. Ses motoru ve LCD yalnızca bu olayları dinler.

```js
// Olay biçimi (MPE benzeri, kaynak bağımsız) [Ö]
// src: 'ptr:<pointerId>' | 'key:<KeyboardEvent.code>' | 'midi:<ch>:<note>'
P3In.noteOn  ({ src, pad, note, vel })          // vel 1..127
P3In.expr    ({ src, bend, slide, press })      // bend: yarım ses (±48), slide 0..1, press 0..1
P3In.noteOff ({ src })
P3In.ctrl    ({ id:'enc1', delta, fine, touch:true|false })   // encoder/jog/strip
P3In.button  ({ id:'accent', down:true|false })
P3In.panic   ()                                                // all notes off
```

- **Voice haritası:** `Map<src, voice>` kullanılır. Aynı `src` için gelen ikinci noteOn önce eskisini kapatır.
- **Polifoni:** Ses motoru belirler (Wavetable konusunda). Burada öneri: 8 ses, en eski notayı çalma (steal oldest) [Ö].
- **Panic tetikleyicileri:** `window.blur`, `document.visibilitychange` (hidden), `contextmenu` ve Escape tuşu. Learning Synths da `blur` ve `contextmenu` olaylarında tüm notaları kapatıyor ve sekme gizlendiğinde master gain'i 0'a rampalıyor [K].
- Site kuralı gereği ortak durum `type="module"` olmayan düz `<script>` içinde, `var` ile tutulmalı (CLAUDE.md).

---

## 3. Pad geometrisi ve isabet tespiti (push3-device.svg'den ölçüldü) [K]

| Öğe | SVG koordinatı (user units) |
|---|---|
| viewBox | `161 135 2116 1725` |
| `PadButton` (sol üst, indeks 0) | rect x=589, y=866, **146×108** |
| `PadButton_8` (sağ üst) | x=1653, y=866 |
| `PadButton_57` (**sol alt**, Fixed kapalıyken kök notası) | x=589, y=1664 |
| `PadButton_64` (sağ alt) | x=1653, y=1664 |
| Pad aralığı (pitch) | yatay **152**, dikey **114** (aralık boşluğu 6) |
| Pad ızgarası kapsamı | x 589–1799, y 866–1772 |
| `TouchSlider` | rect x=426, y=865, 107×907 (padlerin solunda dikey) |
| 8 üst encoder (`Knob`…) | çap yaklaşık 68, merkezler arası 153.6, y yaklaşık 249–317 |
| `Knob_9` / `Knob_10` | çap 126 (x=248, y=526) ve 83 (x=264, y=866). Volume ve Tempo/Swing encoder'ı oldukları düşünülüyor, doğrulanmalı |
| `Knob_11` (jog wheel) | çap 215, (1936.6, 482.6) |
| `LCD Display` | 1222×220, (581, 482) |
| `SelectionButton` (üst/alt sıra) | 136×66, y=360 ve y=757 |
| `SideButton` | 62×98, x=1852 |
| `ButtonBigPlay` | 145×99, (236, 1668) |

Sıralama satır-öncelikli ve yukarıdan aşağıya: indeks `i = r*8 + c`, burada r=0 en üst satır. Push'un "alttan satır" numarası `7 - r` olur. Push kılavuzuna göre Fixed kapalıyken sol alt pad her zaman kökü çalar [R].

**Ölçek varsayımı:** Push 3 genişliği 380 mm [R], viewBox genişliği 2116 birim. Buradan **1 birim ≈ 0.1796 mm** ve **1 mm ≈ 5.568 birim** çıkar. Buna göre çizimdeki pad yaklaşık 26.2×19.4 mm, pad aralığı yaklaşık 27.3 mm'dir. Bu değer çizimin cihazı tam kapladığı varsayımına dayanıyor, gerçek pad ölçüsü doğrulanamadı.

```js
var PAD = { x0:589, y0:866, w:146, h:108, px:152, py:114 };
var inv = null;                                   // pointerdown'da ve resize'da tazelenir
function toSvg(cx, cy){ var p = svgRoot.createSVGPoint(); p.x = cx; p.y = cy; return p.matrixTransform(inv); }
function padAt(u){                                // aradaki boşluk en yakın pada verilir (+3)
  var c = Math.floor((u.x - PAD.x0 + 3) / PAD.px), r = Math.floor((u.y - PAD.y0 + 3) / PAD.py);
  return (c < 0 || c > 7 || r < 0 || r > 7) ? -1 : r * 8 + c;
}
function padCenter(i){ var r = i >> 3, c = i & 7; return { x: PAD.x0 + c*PAD.px + PAD.w/2, y: PAD.y0 + r*PAD.py + PAD.h/2 }; }
// inv = svgRoot.getScreenCTM().inverse();
```

---

## 4. (a) Çoklu dokunma: Pointer Events, setPointerCapture ve touch-action

**Kurallar [R]:**
- Tarayıcı bir dokunuşu kaydırma ya da yakınlaştırma için devralırsa `pointercancel` gönderir. Bu event'i iptal ederek engellemek mümkün değildir. Niyet önceden `touch-action` ile bildirilmelidir. Hareket başladıktan sonra `touch-action` değiştirmek etkisizdir.
- Touch (direct manipulation) pointer'ları `pointerdown` anında hedef elemana **örtük olarak capture edilir**. Capture sürerken diğer elemanlara hit-test yapılmaz. `pointerdown` içinde `releasePointerCapture()` çağrılırsa diğer elemanlarda `pointerover/enter/leave` olayları gelir.
- `touch-action:none` tarayıcı yakınlaştırmasını da engeller ve az gören kullanıcıları etkiler. Bu yüzden yalnızca enstrüman yüzeylerine uygulanmalı, sayfanın geri kalanında pinch-zoom açık kalmalı.

**CSS [Ö]:**
```css
.p3-surface, .p3-enc, .p3-strip, .p3-jog { touch-action:none; user-select:none; -webkit-user-select:none;
  -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent; }
/* Sayfa genelinde user-scalable=no KULLANMA. Launchpad Arcade kullanıyor, bu bir anti-pattern. */
```
`-webkit-touch-callout` standart dışıdır ve iOS'ta uzun basınca açılan menüyü engeller [R].

**Pad yüzeyi olay akışı [Ö]:**
```js
surface.addEventListener('pointerdown', function(e){
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault(); inv = svgRoot.getScreenCTM().inverse();
  var u = toSvg(e.clientX, e.clientY), i = padAt(u); if (i < 0) return;
  if (expr.notePB) surface.setPointerCapture(e.pointerId);            // MPE: parmak başka pada geçse de aynı nota büküledursun
  else if (surface.hasPointerCapture(e.pointerId)) surface.releasePointerCapture(e.pointerId); // glissando
  startPadVoice('ptr:' + e.pointerId, i, u, e);
});
surface.addEventListener('pointermove', function(e){
  var v = voices.get('ptr:' + e.pointerId); if (!v) return;
  var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  var last = list.length ? list[list.length - 1] : e;              // sentetik olaylarda liste boş gelir
  var u = toSvg(last.clientX, last.clientY);
  if (!expr.notePB) { var j = padAt(u); if (j !== v.pad && j >= 0) retrigger(v, j); return; }  // glissando
  updateExpression(v, u, last);
});
['pointerup','pointercancel','lostpointercapture'].forEach(function(t){
  surface.addEventListener(t, function(e){ endVoice('ptr:' + e.pointerId); });
});
surface.addEventListener('contextmenu', function(e){ e.preventDefault(); });
```
- Akor çalmak için her `pointerId` ayrı bir voice alır. Mouse tek pointer olduğundan mouse ile akor klavye ya da MIDI üzerinden çalınır. İsteğe bağlı bir "Latch" anahtarı eklenebilir [Ö].
- `pointerrawupdate` yalnızca Chromium'da var ve isteğe bağlıdır [Ö].
- İfade (expression) parametrelerinde fermuar sesi (zipper noise) oluşmaması için değerler `AudioParam.setTargetAtTime(v, t, τ)` ile yumuşatılmalı: bend için τ ≈ 8 ms, slide ve pressure için τ ≈ 15 ms [Ö].

---

## 5. (b) Velocity

**Donanımın gerçek davranışı [R]:** Push 3 padleri velocity'ye duyarlıdır. Setup > **Sensitivity** sekmesinde **Threshold**, **Drive**, **Compand** ve **Range** ayarları ile **Reset** butonu bulunur. Eğri formülleri yayınlanmamış. **Accent** tüm notaları 127'de çalar; kısa basınca açık kalır, basılı tutulursa bırakınca kapanır. Push 2'de ayarlar farklıdır: Pad Sensitivity, Gain ve Dynamics (0–10), lineer eğri için Gain 4 / Dynamics 7. Push 2 ile karıştırılmamalı.

**Web tarafında girdi kaynakları:**

| pointerType / platform | `e.pressure` davranışı | Kullanım [Ö] |
|---|---|---|
| mouse | basılıyken **0.5**, değilken 0 (spec zorunluluğu) [R] | sabit velocity |
| touch, iPhone (3D Touch olmayan, XR/11 ve sonrası) | gerçek basınç ölçülmüyor. 3D Touch iPhone 11 ile kaldırıldı. Kesin değer doğrulanamadı | sabit velocity |
| touch, Android | cihaza göre değişir, çoğu zaman sabit. Doğrulanamadı | değişkenlik testi |
| pen (Apple Pencil, Wacom) | sürekli 0..1 değer, Pencil'da 240 Hz örnekleme [ikincil kaynak] | gerçek velocity ve aftertouch |

```js
// Gerçek basınç sezgisi [Ö]: pen ise ya da değer {0, 0.5, 1} dışında ve dokunuş boyunca değişiyorsa gerçek kabul et
function looksReal(e){ return e.pointerType === 'pen' || (e.pressure > 0 && e.pressure !== 0.5 && e.pressure !== 1); }
```

**Sabit velocity (fallback):** varsayılan **100** [Ö]. Accent 127 verir [R]. Klavyede Live gibi ±20 adım: 20, 40 … 120 ve 127 [R: Live C/V tuşlarının 20'lik adımları].
**Dokunma konumundan velocity** önerilmez. Push 3'te padin Y ekseni Slide boyutudur ve farklı yüksekliklerde vurmak farklı slide değeri üretir [R]. Aynı ekseni velocity için kullanmak çakışır. Öğretici modda öğrenciye "Basınç bu cihazda yok, Accent'i dene" gibi bir not gösterilebilir.

**Sensitivity benzeri eğri (isimler Push 3'ten, matematik bizim önerimiz, Ableton'ın formülü değil):**
```js
// p: 0..1 ham basınç; s = { threshold:0.05 (0..0.5), drive:0 (-1..1), compand:0 (-1..1), range:1 (0.2..1) }
function velCurve(p, s){
  if (p < s.threshold) return 0;                                         // tetikleme yok
  var x = Math.min(1, (p - s.threshold) / Math.max(0.01, s.range - s.threshold));
  x = Math.pow(x, Math.pow(2, -2 * s.drive));                            // Drive>0: yüksek değerlere daha çabuk ulaşır
  var S  = x < .5 ? .5*Math.pow(2*x, 3)   : 1 - .5*Math.pow(2 - 2*x, 3);   // uçlara iter
  var Si = x < .5 ? .5*Math.pow(2*x, 1/3) : 1 - .5*Math.pow(2 - 2*x, 1/3); // ortaya toplar
  var y = s.compand >= 0 ? x + (S - x)*s.compand : x + (Si - x)*(-s.compand);
  return Math.max(1, Math.round(1 + y * 126));
}
```
Pen için nota başlangıcında ilk ≤10 ms içindeki en yüksek pressure değeri alınabilir. Bu küçük bir gecikme ekler ve isteğe bağlı olmalıdır [Ö].

---

## 6. (c) MPE: Push 3'ün gerçek davranışı ve web eşlemesi

**Push 3 Setup > Expression sekmesi [R]:**

| Ayar | Değerler | Varsayılan | Etki |
|---|---|---|---|
| Expression Mode | MPE / Poly Aftertouch / Mono Aftertouch | **MPE** | Poly: her pad kendi basıncını gönderir. Mono: tüm notalar aynı basınca tepki verir |
| Note Pitch Bend | Auto / On / Off | **Auto** | Auto: cihaz destekliyorsa per-note PB. Desteklemiyorsa yatay kaydırma notayı yeniden tetikler (glissando) |
| In Tune Location | **Finger** / Pad | **Finger** | Finger: parmağın ilk değdiği yer sıfır bend. Pad: pad merkezi sıfır, merkez dışına basınca hemen bükülür |
| In Tune Width | 0–20 mm | doğrulanamadı | Küçük değer (örn. 3 mm) bend'i daha erken ve hızlı başlatır, büyük değer (örn. 15 mm) daha yavaş büker |
| Slide Height | 10–16 mm | doğrulanamadı | Slide için kullanılan dikey aralık |

Diğer bilinen davranışlar [R]:
- Pressure dokunuştan sonraki basınçtır (aftertouch).
- Slide dikey hareket ya da vuruş yüksekliğidir.
- Per-note PB yatay harekettir; Live'da "NotePB" olarak görünür.
- Bend bir paddan diğerine gitar perdesi gibi sürer. **In Key** modunda bend her zaman tonda kalır, **Chromatic** modunda yarım sesler halinde ilerler.
- MPE'de Push her basışta MIDI kanalı değiştirir.
- MPE standardı: her nota kendi kanalını alır. Lower Zone'da master kanal 1, üye kanallar 2–16'dır. Üye kanallarda PB aralığı **±48 yarım ses**, master kanalda ±2'dir. Slide için **CC74**, basınç için **Channel Pressure** kullanılır ve nota başlarken ilk CC74 değeri gönderilir.
- Live 11 ve sonrasında Wavetable MPE destekler [ikincil kaynak].

**Web eşlemesi [Ö]:** mm değerleri SVG birimine çevrilir, böylece yakınlaştırmadan bağımsız olarak pad oranlarına sadık kalınır.
```js
var MM = 2116 / 380;                 // 5.568 birim/mm
var expr = { mode:'mpe', notePB:true, loc:'finger', inTuneMm:6, slideMm:13 };  // 6 ve 13 [Ö]
function onStrike(v, u){ v.x0 = (expr.loc === 'finger') ? u.x : padCenter(v.pad).x; v.cy = padCenter(v.pad).y; }
// Yatay yol → "pad adımı" (sürekli). Her pad merkezinde genişliği W olan bir in-tune bölgesi var.
function padSteps(dx){
  var u = dx / PAD.px, w = Math.min(0.9, expr.inTuneMm * MM / PAD.px);  // 20 mm için w ≈ 0.73
  var k = Math.round(u), r = u - k, a = Math.abs(r);
  return k + Math.sign(r) * (a <= w/2 ? 0 : (a - w/2) / (1 - w));     // |r| = 0.5 noktasında süreklidir
}
// Yarım ses cinsinden bend: aynı satırda sağdaki padlerin notaları arasında lineer interpolasyon (sanal olarak ızgaranın dışına da uzar)
function bendSemis(pad, f){ var k = Math.floor(f), t = f - k, a = noteRightOf(pad, k), b = noteRightOf(pad, k + 1);
  return Math.max(-48, Math.min(48, a + (b - a)*t - noteOf(pad))); }
function slideOf(u, v){ return Math.max(0, Math.min(1, 0.5 + (v.cy - u.y) / (expr.slideMm * MM))); } // yukarı = 1
```
- `noteRightOf` fonksiyonu In Key modunda bir sonraki ölçek derecesini, Chromatic modunda +1 yarım sesi döndürür. Scale ve Layout mantığı Scale konusundan gelir.
- In Tune Width modeli yoruma dayanıyor. Ableton formülü yayınlamıyor. Kılavuzun eski sürümünde bend'in "daha erken" başladığı, yeni sürümünde "daha hızlı" değiştiği yazıyor ve iki ifade birlikte bir **in-tune bölgesi** yorumunu destekliyor. Kenar geçişini yumuşatmak için bölge sınırına smoothstep eklenebilir.
- Pressure: gerçek basınç varsa `press = e.pressure` (nota başladıktan sonra), yoksa 0. Masaüstünde isteğe bağlı olarak **pad basılıyken mouse wheel** basıncı taklit edebilir; bu Push'ta olmayan bir özellik, öğretici metinde belirtilmeli [Ö].
- Expression Mode = Poly AT ya da Mono AT seçilince bend ve slide kapanır, yalnız basınç gönderilir (Push ile aynı).
- Expression parametreleri için ölçek: pad aralığı 152 birim; telefonda yatay Pad Odak görünümünde (ölçek 0.37) 1 mm ≈ 2.06 px, pad aralığı ≈ 56 px, 20 mm In Tune Width ≈ 41 px.

---

## 7. (d) Encoder, jog wheel, touch strip ve düğmeler

**Donanım gerçekleri [R]:**
- Encoder'ların üstü dokunmaya duyarlıdır. Bu jog wheel, Swing & Tempo encoder'ı ve Volume encoder'ı için de geçerlidir: dokunmak MIDI nota, çevirmek CC gönderir. User Mode'da "Relative (lin. 2's comp.)" önerilir.
- Push 1/2 encoder'ları saat yönünde 1–63, ters yönde 127–64 relative değer gönderir ve ivmelidir (help.ableton.com, orta güven).
- Shift + encoder daha ince çözünürlük verir. Tempo'da adım 1 BPM, Shift ile **0.1 BPM**. Swing %1 adımlarla %0–100 arası.
- Tempo encoder'ına dokunmak Tempo mu Swing mi seçili olduğunu gösterir, basmak ikisi arasında geçiş yapar. Volume encoder'ında da aynı şekilde dokunmak seçili hedefi gösterir, basmak Main/Cue/Headphones arasında dolaşır.
- **Delete + encoder'a dokunma:** otomasyon varsa siler, yoksa parametreyi varsayılana döndürür.
- Jog wheel çevrilir, basılır ve sağa/sola itilir (nudge; örneğin sağa itmek bağlam menüsünü açar).
- **Touch strip:** instrument track seçiliyken pitch bend ya da mod wheel kontrol eder; varsayılan pitch bend'dir. Select basılıyken strip'e dokunmak ikisi arasında geçiş yapar. Drum Rack'te bank seçer. Melodic sequencer'da not aralığını değiştirir, Shift ile oktav.
- Accent ve Repeat: kısa basınca açık kalır, basılı tutunca bırakıldığında kapanır.

**Web etkileşim tablosu [Ö]:**

| Hareket | Encoder (8 adet ve Volume/Tempo) | Jog wheel (`Knob_11`) | Touch strip |
|---|---|---|---|
| pointerdown ("touch") | LCD'de parametre vurgulanır, değer büyük gösterilir, `P3In.ctrl({touch:true})` | touch olayı | değer = konum |
| Dikey sürükleme | `dv = -dy/200` (normalize), Shift ile ×0.1 | önerilmez, yerine açısal sürükleme | `v = 1-(y-top)/h` |
| Açısal sürükleme | — | `Δθ = atan2 farkı`, 15°'de 1 adım (24 adım/tur [Ö]; Push detent sayısı doğrulanamadı) | — |
| Wheel | `delta = -(deltaY × (deltaMode 1 ise 16, 2 ise 400, 0 ise 1)) / 100` adım | aynı formül, adım başına 1 | — |
| Kısa tık (< 5 px hareket, < 300 ms) | basma (Tempo↔Swing, Volume hedefi) | press (seç) | — |
| Yatay "fırlatma" (> 20 px, < 200 ms) | — | nudge ←/→ | — |
| Çift tık | varsayılana dön (Live'daki çift tık reset alışkanlığı) | — | — |
| Delete basılı + dokunma | varsayılana dön (Push'taki gibi) | — | — |
| Bırakma | touch:false, LCD vurgusu yaklaşık 1 s içinde söner | — | **PB modunda merkeze döner** (τ ≈ 30 ms; Push'ta geri dönüş doğrulanamadı), Mod modunda yerinde kalır |

- Wheel listener'ı `{passive:false}` ile eklenmeli, yoksa `preventDefault()` çalışmaz. `ctrlKey=true` gelirse trackpad pinch hareketidir, yok sayılmalı [R].
- Kademeli parametrelerde (Tempo, Swing) kesirli değer birikir; Tempo için 4 px = 1 BPM, Shift ile 0.1 BPM [Ö].
- İvme: `hız = |dy/dt|` (px/ms) üzerinden `çarpan = 1 + min(3, hız/1.5)`. Shift basılıyken ivme uygulanmaz [Ö].
- Push'un Shift düğmesi fiziksel Shift tuşuyla ya da ekrandaki Shift hotspot'u basılı tutularak kullanılır. İkisi aynı `shiftHeld` durumunu besler.
- Düğmelerde latch/momentary eşiği 400 ms: bundan kısa basış latch, uzun basış momentary sayılır [Ö; Push'taki eşik doğrulanamadı].
- Hit-area: telefonda encoder görsel olarak yaklaşık 20 px'tir; hit-area encoder aralığının izin verdiği ölçüde ≥ 44 px'e genişletilir (bkz. §11).

---

## 8. (e) Bilgisayar klavyesi eşlemesi

**Referanslar:**
- **Live Computer MIDI Keyboard [R]:** orta harf sırası beyaz tuşlardır ve C3'ten başlar (Live'da C3 = MIDI 60). Üst sıra siyah tuşlardır. Z/X oktav değiştirir, C/V velocity'yi 20'şer adımla değiştirir. Aç/kapa kısayolu Cmd/Ctrl+Shift+K. Bu mod açıkken tek harfli kısayollar Shift ile kullanılır.
- **Learning Synths (kodundan okundu) [K]:**
  - `e.code` kullanıyor.
  - Piyano dizisi `KeyA KeyW KeyS KeyE KeyD KeyF KeyT KeyG KeyY KeyH KeyU KeyJ KeyK KeyO KeyL KeyP Semicolon Quote` ve **60 + 12·oktav + indeks** formülü. Oktav −4..+3 aralığında sınırlı.
  - Isomorphic mod: sağa her tuş **+2 yarım ses**, yukarı her sıra **+3**. Taban Z-sırası = 48.
  - `blur` ve `contextmenu` olaylarında panic.
  - Ayarlar: Keyboard Layout = Isomorphic (varsayılan) / Piano.
- **Launchpad Arcade [K]:** QWERTY ile aynı anda 4 sıra çalınır. P ve ; üst/alt dört sıra arasında geçer, [ ve ] bir sıra kaydırır, ? tuş etiketlerini gösterir, Space başlat/durdur. Not düşülmüş: "yalnızca US klavye düzeni". Biz `e.code` kullanarak bu sınırı aşıyoruz.

**Düzen A: "Pad Izgarası" (varsayılan) [Ö]**, 4 klavye sırası 4 pad satırına denk gelir:

| Klavye sırası (`e.code`) | Pad satırı (penceredeki, alttan) |
|---|---|
| `Digit1 … Digit8` | 4 |
| `KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI` | 3 |
| `KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK` | 2 |
| `KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma` | 1 |

Pencere ofseti 0..4 arasındadır; 0, Push'un alttaki 4 satırı demektir ve kök sol alttadır. `BracketLeft` / `BracketRight` pencereyi bir satır aşağı/yukarı kaydırır. `Shift+Slash` ("?") tuş etiketlerini padlerin üstünde gösterir. Push'un 4'lü düzeninde her satır bir dörtlü yukarıdadır; QWERTY sıralarının kaydırmalı dizilişi bu düzene doğal olarak uyar.

**Düzen B: "Piyano (Live)"**, Live ile birebir aynı: A=C3 (60) … Quote, W E T Y U O P siyah tuşlar, Z/X oktav, C/V velocity ±20. Çalınan nota hangi padlerde varsa o padler yeşil yanar; Push'ta çalan pad yeşil gösterilir [R].

**Ortak kontroller (her iki düzende):**

| Tuş (`code`) | İşlev |
|---|---|
| `Space` | Play/Stop (Push Play, Live Space) |
| `ArrowUp` / `ArrowDown` | Octave Up/Down (Push'taki gibi Shift ile ölçekte bir derece) |
| `ArrowLeft` / `ArrowRight` | Page Left/Right |
| `ShiftLeft` / `ShiftRight` | Push Shift (basılı tut) |
| `Minus` / `Equal` | Velocity −20 / +20 (Düzen A'da C/V pad tuşu olduğu için) |
| `Backquote` | Accent (kısa basış latch, basılı tutma momentary) |
| `Escape` | Panic ve klavyeyle çalma odağından çıkış |

**Uygulama kuralları:**
- `e.repeat === true` ise yok sayılır.
- `keyup` ile noteOff gelir. Basılı tuşlar `Set<code>` içinde tutulur, panic'te hepsi kapatılır.
- Odak bir `<input>`, `<select>` veya `[role=slider]` üzerindeyken pad eşlemesi devre dışıdır. Slider üzerinde ok tuşları slider'a aittir.
- **WCAG 2.1.4:** tek karakterlik kısayolların kapatılabilmesi gerekir. Bu yüzden `role="switch"` olan "Klavyeyle çal" anahtarı eklenir ve kısayollar yalnızca emülatör alanı odaktayken (`focusin` içinde `#p3Stage`) çalışır.
- Türkçe Q klavye: `e.code` fiziksel konumu verir. Etiketler Chromium'da `navigator.keyboard.getLayoutMap()` ile yerel karakterden okunur, desteklemeyen tarayıcılarda sabit TR-Q etiket tablosu kullanılır.

---

## 9. (f) Web MIDI (MIDI klavyesi takan öğrenci)

- **Destek:** Chrome 43+, Edge 79+, Opera, Samsung ve Chrome Android'de var. Firefox 108+'da **site permission add-on** kurulumu gerekiyor ve bağlı cihaz yoksa otomatik olarak reddedebiliyor (Mozilla bug 1805582 başlığına göre). **Safari macOS ve iOS'ta hiç yok.**
- Chrome 124'ten beri sysex olmadan da her MIDI erişiminde izin istemi çıkıyor. Güvenli bağlam şart. Sayfa iframe içinde çalışırsa `Permissions-Policy: midi` ve `allow="midi"` gerekir.
- **Akış [Ö]:** Push 3'ün Setup > MIDI sekmesindeki "Input: Track" ayarına benzer bir "MIDI Klavye" satırı ve **[Bağlan]** butonu olur. Varsayılan kapalıdır; Learning Synths'te de MIDI Input varsayılanı Off [K]. `requestMIDIAccess({sysex:false})` yalnızca bu butona tıklanınca çağrılır.
  - Safari'de buton yerine şu metin gösterilir: `Safari MIDI klavye desteklemiyor, Chrome ya da Edge ile aç.`
  - Firefox'ta hata alınırsa add-on açıklaması ve "önce cihazı tak, sonra sayfayı yenile" notu gösterilir. Learning Synths Firefox'ta Web MIDI'yi tamamen kapatıyor, Launchpad Arcade ise `sysex:true` ile istiyor ve `onstatechange` ile cihaz listesini tazeliyor [K].
- `access.onstatechange` her tetiklendiğinde bütün `inputs` için `onmidimessage` yeniden bağlanır (hot-plug).
- **Ayrıştırma:**
```js
function onMidi(ev){ var d = ev.data, st = d[0] & 0xF0, ch = d[0] & 0x0F, src = 'midi:' + ch + ':' + d[1];
  if (st === 0x90 && d[2] > 0) P3In.noteOn({ src:src, note:d[1], vel:d[2] });
  else if (st === 0x80 || (st === 0x90 && d[2] === 0)) P3In.noteOff({ src:src });
  else if (st === 0xE0) chanBend(ch, (((d[2] << 7) | d[1]) - 8192) / 8192);  // ×48 (MPE üye kanal) ya da ×2 (master veya MPE olmayan)
  else if (st === 0xD0) chanPress(ch, d[1] / 127);          // MPE'de o kanaldaki notanın basıncı
  else if (st === 0xA0) polyPress(ch, d[1], d[2] / 127);    // Poly AT
  else if (st === 0xB0) { if (d[1] === 74) chanSlide(ch, d[2] / 127); else if (d[1] === 1) modWheel(d[2] / 127); else if (d[1] === 64) sustain(d[2] >= 64); }
}
```
- MPE algılama: 2–16 arası kanallarda notalar geliyorsa MPE kabul edilir ve PB aralığı ±48 olur. Aksi halde kanal genelinde ±2 kullanılır. ±2'nin genel MIDI varsayılanı olması yaygın bilgidir, burada ayrıca doğrulanmadı.
- Gelen MIDI notaları padlerde yeşil yanar. Öğretici modda "MIDI klavyeden çaldığın nota Push'ta nerede?" türünde bir alıştırma yapılabilir.

---

## 10. (g) Ses: AudioContext kilidi, iOS, latencyHint ve AudioWorklet

**Kurallar [R]:**
- AudioContext kullanıcı hareketi olmadan `suspended` başlar; `resume()` bir tıklama ya da tuş handler'ı içinde çağrılmalıdır.
- HTML spec'ine göre **activation-triggering** olaylar şunlardır: `keydown` (Esc hariç), `mousedown`, yalnızca mouse için `pointerdown`, **mouse olmayan pointer'larda `pointerup`**, ve `touchend`. Bu yüzden **touch ile ilk pad dokunuşunun `pointerdown` anında ses açılamayabilir.**
- iOS'ta Web Audio varsayılan olarak `ambient` kategorisindedir ve sessiz mod anahtarı açıksa susturulur. `navigator.audioSession.type = 'playback'` bunu çözer (WebKit mühendisi: "iOS 17'den beri"; caniuse: Safari 16.4+). Audio Session spec'ine göre `playback` türü diğer playback seslerle karışmaz, yani arkada çalan müziği durdurabilir.
- `latencyHint` değerleri: `interactive` (varsayılan), `balanced`, `playback` ya da saniye cinsinden sayı. Firefox bu ayarı desteklemiyor.
- AudioWorklet: Chrome 66, Firefox 76, Safari 14.1, iOS 14.5 ve sonrası. Yalnızca güvenli bağlamda çalışır.
- iOS'ta `interrupted` durumunda takılı kalma (telefon araması, arka plana alma) bilinen bir hata olarak raporlanmış (WebKit 263627, web-audio-api #2585).
- Push 3'ün kendi Audio sekmesi: 44.1–96 kHz, buffer 128–2048 sample, varsayılan 128.

**Uygulama [Ö]:**
1. **Mod seçim kartına tıklama** (Öğretici, Seviye 1, Seviye 2, Serbest) kullanıcı etkileşimidir. AudioContext tam bu handler içinde oluşturulur. Bu en güvenilir kilit açma noktasıdır.
2. Yedek olarak `pointerup`, `touchend`, `mousedown`, `keydown` ve `click` olaylarına `{capture:true}` ile bir kerelik `resume()` bağlanır. Learning Synths aynı işi touchstart, touchend, mousedown, mouseup ve click ile yapıyor [K].
3. Kod:
```js
var P3Audio = { ctx:null, master:null };
function initAudio(){                         // YALNIZCA kullanıcı olayı içinde çağır
  if (P3Audio.ctx){ if (P3Audio.ctx.state !== 'running') P3Audio.ctx.resume(); return P3Audio.ctx; }
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch(_){}   // context'ten ÖNCE
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = P3Audio.ctx = new AC({ latencyHint:'interactive' });
  P3Audio.master = ctx.createGain(); P3Audio.master.connect(ctx.destination);
  ctx.onstatechange = function(){ showAudioChip(ctx.state !== 'running'); };   // "Sesi yeniden başlat" çipi
  return ctx;
}
document.addEventListener('visibilitychange', function(){
  var c = P3Audio.ctx; if (!c) return; var t = c.currentTime;
  P3Audio.master.gain.setTargetAtTime(document.hidden ? 0 : 1, t, 0.02);
  if (document.hidden) P3In.panic(); else if (c.state !== 'running') c.resume().catch(function(){});
});
```
4. `interrupted` durumu ya da ardışık `resume()` başarısızlıklarında `ctx.close()` ile context kapatılıp bir sonraki dokunuşta yeniden oluşturulur. Bu bir workaround'dur, etkinliği doğrulanamadı.
5. **Tek AudioContext kullanılmalı.** Safari'de sayfa başına yaklaşık 4 context sınırı olduğu bir blog yorumunda geçiyor (düşük güven). ableton-lab.html'de 7 ayrı context oluşturuluyor; Push sayfası bu deseni kopyalamamalı.
6. **AudioWorklet:** `if (window.isSecureContext && ctx.audioWorklet) await ctx.audioWorklet.addModule('/assets/js/p3-wt-worklet.js?v=1')`. Modül ayrı bir statik dosya olmalı ve aynı origin'den gelmeli. Başarısız olursa `createPeriodicWave` tabanlı fallback'e geçilir. Motor ayrıntıları Wavetable konusunda.
7. Örnekleme hızı `ctx.sampleRate` ile okunur; iOS'ta çoğu zaman 48000'dir. Wavetable motoru sabit 44100 varsaymamalı.
8. Setup ekranında Learning Synths'teki gibi bir **"Ses kalitesi"** ayarı sunulur [K]: Yüksek = `interactive` ve tam polifoni, Orta = `balanced`, Düşük = `playback` ve 4 ses [Ö]. Learning Synths'in notu: "ses sorunu yaşarsan düşük kaliteyi dene". `ctx.baseLatency` ve `ctx.outputLatency` değerleri tanı için Setup'ta gösterilir.
9. Titreşimli geri bildirim (`navigator.vibrate(8)`) yalnızca Android'de çalışır, varsayılan kapalı. iOS'ta API yok.

---

## 11. (h) Mobil yerleşim

**Kısıtlar [R]:**
- iOS Safari `screen.orientation.lock()` desteklemiyor ve iPhone'da element fullscreen yalnızca kısmi. Yatay moda zorlanamaz, yalnızca önerilebilir.
- Android Chrome'da lock çoğu zaman fullscreen şartıyla çalışıyor.
- `dvh/svh` iOS 15.4+ sürümünde var.
- WCAG 2.5.8 (AA): hedef en az **24×24 CSS px** olmalı ya da 24 px'lik aralık istisnasını sağlamalı. 2.5.5 (AAA) için hedef 44×44.

**Görünümler (aynı SVG, farklı `viewBox`) [Ö]:**
```js
var VIEWS = {
  full:      '161 135 2116 1725',   // tüm cihaz
  pads:      '583 860 1222 918',    // yalnız 8×8 pad
  padsStrip: '420 860 1385 918',    // pad + touch strip
  controls:  '575 240 1234 590'     // 8 encoder + üst/alt display düğmeleri + LCD
};
// ölçek s = min(availW / vbW, availH / vbH); pad = 146·s × 108·s px
```

| Cihaz / alan (CSS px, tahmini) | Görünüm | s | Pad (px) | Encoder çapı | Karar |
|---|---|---|---|---|---|
| Masaüstü, sahne yaklaşık 1100×760 | full | 0.44 | 64×48 | 30 | tam kullanım |
| iPad yatay, yaklaşık 1180×740 | full | 0.43 | 63×46 | 29 | tam kullanım |
| iPad dikey, yaklaşık 820×1000 | full | 0.39 | 57×42 | 26 | tam kullanım |
| Telefon yatay, yaklaşık 844×340 | full | 0.197 | 29×**21** | 13 | **çalma için değil** (Seviye 1 "bul" oyunu olabilir) |
| Telefon yatay | padsStrip | 0.37 | 54×40 | — | çalma |
| Telefon yatay, **Bölünmüş** (480 px pad + 364 px kontrol) | pads + controls | 0.37 / 0.295 | 54×40 | 20 görsel, aralık 45 px, hit-area 44 | **önerilen varsayılan** |
| Telefon dikey, yaklaşık 390×700 | full | 0.184 | 27×**20** | 12.5 | çalma için değil, "Telefonu yan çevir" ipucu gösterilir |
| Telefon dikey | controls (üstte, 186 px) + pads (altta, 293 px) | 0.316 / 0.319 | 47×34 | 21 | dikeyde kullanılabilir yığın düzeni |

**Uygulama notları [Ö]:**
- Bölünmüş görünümde SVG iki kez enjekte edilmez; 422 KB'lık DOM iki katına çıkar. Enjeksiyon sırasında içerik `<g id="p3-art">` ile sarılır ve ikinci pane `<svg viewBox="…"><use href="#p3-art"/></svg>` ile çizilir. Kök grubun mevcut id'si ("Ableton Push 3") boşluk içerdiği için `href` hedefi olarak kullanılamaz. Düşük donanımlı telefonlarda `<use>` pahalı kalırsa kontrol pane'i sade HTML ile yeniden çizilir: LCD, 8 encoder ve 16 düğme.
- Hotspot hizalama `getScreenCTM` matematiğiyle aynen çalışır, yalnızca her pane'in kendi `svgRoot` değeri kullanılır. Pencere `resize` debounce'u (120 ms) yerine **ResizeObserver** ve `visualViewport.resize` kullanılmalı, çünkü iOS'ta toolbar açılıp kapanınca yükseklik değişir.
- Yakınlaştırma geçişi `viewBox`'ın rAF içinde interpolasyonuyla yapılabilir (200 ms). `prefers-reduced-motion` açıksa geçiş anlık olur.
- Yükseklik için `height: 100dvh`, çentikli cihazlar için `viewport-fit=cover` ve `padding: env(safe-area-inset-*)`. Kırılım noktaları site ile aynı: 600 / 900 / 1024.
- `@media (max-width:600px) and (orientation:portrait)` durumunda Tam Cihaz görünümüne geçilirse "Daha rahat çalmak için telefonu yatay çevir" çipi gösterilir, ama dikey yığın düzeni de çalışır durumda kalır.
- Android'de isteğe bağlı "Tam ekran" butonu `requestFullscreen()` ve ardından `screen.orientation.lock('landscape')` çağırır, hata sessizce yutulur.
- Sayfanın genelinde pinch-zoom açık kalmalı; `touch-action:none` yalnızca enstrüman yüzeylerinde.

---

## 12. (i) Erişilebilirlik

| Bileşen | Rol ve öznitelikler | Klavye |
|---|---|---|
| Pad ızgarası | `role="grid"` + 8×`role="row"` + 64×`role="gridcell"` (roving tabindex, tek tab durağı). `aria-label` örneği: "C3, kök nota, satır 1 sütun 1"; ölçek değişince güncellenir | Oklar hücre değiştirir; Enter/Space keydown noteOn, keyup noteOff; Home/End satır başı/sonu; Ctrl+Home ilk hücre (APG grid) |
| Encoder'lar | `role="slider"`, `aria-valuemin/max/now` ve `aria-valuetext` (örneğin "Filtre frekansı 1,2 kHz") | Sağ/Yukarı +1 adım, Sol/Aşağı −1, PageUp/PageDown ±10, Home/End min/max (APG slider). Shift+ok ince ayar, Delete/Backspace varsayılan [Ö], Enter = encoder'a basma |
| Düğmeler | `<button>` ya da mevcut `role="button"` hotspot. Toggle'lar (Accent, Repeat, Mute, Solo) `aria-pressed`, kısayollar `aria-keyshortcuts` | Enter/Space (mevcut kod zaten destekliyor) |
| "Klavyeyle çal" | `role="switch"` + `aria-checked` (MDN'nin ses aç/kapa için önerdiği pratik) | Space |
| LCD | Özet bölgesi `aria-live="polite"`. Yalnız mod ya da sayfa değişiminde güncellenir, en sık 500 ms'de bir. Değerler slider'ın `aria-valuetext` özniteliğiyle zaten okunur | — |
| Öğretici adımları | Her adım görsel işaretin yanında metin talimatı da içerir; odak adım başlığına taşınır | "Devam" butonu (mevcut `continueBtn.focus()` deseni) |

- **Renk tek gösterge olmamalı (1.4.1).** Push kökü track rengi, ölçek içini beyaz, ölçek dışını sönük gösterir [R]. Emülatörde isteğe bağlı "Nota adlarını göster" seçeneği ve kök pad için ek bir iç kenarlık deseni olmalı.
- Odak halkası `outline:2px solid var(--accent); outline-offset:2px` olmalı. Gradient ve `!important` kullanılmaz.
- `prefers-reduced-motion` açıksa pad flaş ve ölçek animasyonları kapatılır, yalnızca renk değişir.
- Hedef boyutu: telefonda çalma görünümünde padler ≥ 34 px. Encoder'lar görsel olarak 20 px olsa da hit-area ::after ile ≥ 44 px yapılır; sitedeki `.btn::after` deseni aynı işi görüyor.
- Ekran okuyucu için her nota çalındığında duyuru yapılmaz, bu gürültü yaratır. Yalnızca öğretici görevinin sonucu duyurulur ("Doğru: Scale düğmesi").
- Gözlenen eksikler ve kaçınılacaklar [K]:
  - Learning Synths slider'ları `tabindex=0` olan div'lerdir ama `role="slider"` taşımazlar.
  - Learning Music'teki ikon-yalnız play butonunun `aria-label`'ı yok ve grid hücrelerine klavyeyle ulaşılamıyor.
  - Launchpad Arcade `user-scalable=no` kullanıyor.

---

## 13. Mevcut web araçlarından çıkarılacak dersler

| Araç | Gözlenen (kaynak) | Bize ders |
|---|---|---|
| **Ableton Learning Synths** (Playground) | Ayarlar: Audio Quality Low/Medium/**High**, Keyboard Layout **Isomorphic**/Piano, MIDI Input On/**Off** (kalın olanlar varsayılan). "Open in Playground" derin linki, Perform XY pad ve Map butonu, en fazla 60 sn Record, Export to Live, durum `localStorage['synth_state']` içinde [K][R] | Setup'ta ses kalitesi, klavye düzeni ve MIDI ayarları; derslerden "Serbest Mod'da aç" linki; durumun localStorage'da saklanması; `e.code`; blur'da panic |
| **Ableton Learning Music** | Ders sayfalamasında "1/10" ve ‹ Previous / Next ›; kontrole bağlı ipucu balonu ("Click this button to start and stop playback" + Close); Reset/Clear/Export to Live; Türkçe dahil 20'den fazla dil; "Reset all lessons"; grid'de `touch-action: manipulation` [K] | Öğretici için ilerleme sayacı ve kontrole iliştirilmiş coach-mark (getScreenCTM ile konumlanır); "Tüm ilerlemeyi sıfırla"; kendi erişilebilirlik eksiklerini tekrarlamamak |
| **Novation Launchpad Arcade** | QWERTY 4 sıra, P/; , [ ], ?, Space; "Launchpad Not Connected" durumu ve yardım overlay'i; Web MIDI (`sysex:true`, statechange); dar ekranda 8×8 ızgara 3'lü bloklar halinde yeniden akıyor [K] | Klavye penceresi mantığı; MIDI bağlantı durum rozeti; ama Push'un pad düzeni öğretildiği için ızgara yeniden akıtılmaz, viewBox ile kırpılır |
| **gridinstruments** (açık kaynak) | Web'de isomorphic grid, MPE/MIDI, dokunma; Shift basılıyken vibrato, Space sustain; kaydırma yok, tüm enstrüman tek ekranda | Kaydırmasız tek ekran ilkesi (ders-push3 zaten böyle) |

**Mod menüsü ve öğretici için platform notları [Ö]:**
- Rotalar hash tabanlı olmalı: `#/ogretici`, `#/seviye-1`, `#/seviye-2`, `#/serbest`. Site statik ve `cleanUrls` açık olduğu için geri tuşu ve derin link bu şekilde çalışır.
- İlerleme `localStorage['p3.progress.v1']` içinde tutulur.
- Mod kartına tıklama AudioContext'i başlatır (§10). Öğretici adımları olay veriyolunu dinleyerek (`P3In.*`) görevin tamamlandığını algılar, örneğin "Scale'e bas, D Minor seç, bir akor çal".

---

## 14. Marka ve ticari kullanım (Ableton / Push)

**Ableton Branding & Trademark Guidelines [R]:**
- Word mark'lar ("Ableton", "Live", "Push", "Link") uyumluluk ya da öğretim bağlamında **referans amaçlı** kullanılabilir, ama **kendi ürün adınızdan daha az belirgin** olmalı. Ürün veya şirket adının parçası olamaz, kısaltılamaz ve Ableton'la bağlantı ima edemez.
- Eğitim başlıklarında "Ableton" ilk kelime olamaz; yazım ve büyük harf kullanımı Trademark List ile birebir aynı olmalı.
- **Ableton logosu ve Live ikonu kullanılamaz.** "Don't imitate the distinctive Ableton packaging, typefaces and other visual assets (incl. user interface, graphics, graphic symbols)".
- Eğitim dokümanlarında ekran görüntüsü ve ikonlar işlevleriyle ilgili bağlamda ve **değiştirilmeden** kullanılabilir. Ürün görseli olarak gerçek ürünün fotoğrafı istenir; Ableton'ın kendi fotoğrafları için yazılı izin gerekir.
- **"Ableton" alan adında kullanılamaz**; "Push" kullanılabilir.
- Hazır metin kalıpları: "(Title) is an independent (workshop/publication) and has not been authorized, sponsored, or otherwise approved by Ableton AG" ve "This website is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Ableton AG". İletişim: iprights[at]ableton[dot]com.
- Trademark List'te **Push®** tescilli; Live™, Link™, Max for Live™, Drum Rack™, Operator™ vb. de listede. "Wavetable" ve "Drift" listede yok.

**Hukuki çerçeve (hukuki tavsiye değildir):**
- SMK 6769 md. 7/5: marka sahibi, dürüstçe ve ticari hayatın olağan akışı içinde yapılan, kullanım amacını belirten açıklamaları engelleyemez.
- AB 2015/2436 sayılı Direktif md. 14(1)(c): markanın sahibinin mallarına referans vermek için kullanılması serbesttir, "honest practices" şartıyla.
- Bu hükümler "Push 3 öğrenmek için simülatör" gibi referans amaçlı kullanımı destekler. Ancak cihaz tasarımını ve ekran arayüzünü taklit eden bir emülatör, rehberdeki "UI ve grafik taklidi" maddesine takılabilir. Bu **gri alandır** ve kesin güvence için Ableton'dan yazılı onay almak gerekir.

**Somut öneriler [Ö]:**
1. Mevcut `<title>` "Ableton Push 3 — İnteraktif Kontrol Oyunu · Berkay Er Academy" "Ableton" ile başlıyor ve rehbere aykırı. Önerilen: **"Pad Lab: Push 3 Eğitim Simülatörü · Berkay Er Academy"**. Kendi ürün adımız (Pad Lab) önde, "Push 3" açıklayıcı ve daha az belirgin. H1 ve og:title de buna göre güncellenmeli.
2. Footer ve Setup ekranına TR ve EN not (i18n anahtarı ile):
   - TR: `Ableton, Live ve Push, Ableton AG'nin ticari markalarıdır. Bu simülatör, Berkay Er Academy tarafından hazırlanmış bağımsız bir eğitim aracıdır; Ableton AG tarafından yetkilendirilmemiş, desteklenmemiş veya onaylanmamıştır.`
   - EN: `Ableton, Live and Push are trademarks of Ableton AG. This simulator is an independent educational tool by Berkay Er Academy and has not been authorized, sponsored, or otherwise approved by Ableton AG.`
3. Logo kullanılmamalı. SVG'de logo katmanı id düzeyinde bulunmadı (yalnızca kök grup "Ableton Push 3"), ama çizimde görsel olarak "Ableton" yazısı ya da logosu varsa o katman gizlenmeli.
4. LCD içinde Figma'nın çizdiği Wavetable ekranı Live/Push arayüzünün taklidi sayılabilir. Bunun yerine sitenin tipografisiyle (Space Mono, altın vurgu) **kendi sade görselleştirmemiz** çizilmeli; mevcut `.p3-lcd` overlay zaten bu yaklaşıma uygun.
5. Cihaz çizimi Greg Hadala'nın CC BY 4.0 lisanslı Figma çizimi. Bu lisans çizimin telif hakkını kapsar, **Ableton'ın marka ve tasarım haklarını kapsamaz**. Atıf korunmalı; çizim reklam, ürün satışı veya merchandise için kullanılmamalı.
6. Firebase projesi `ableton-tutorial` (.firebaserc). Firebase Hosting içeriği `PROJECT_ID.web.app` ve `PROJECT_ID.firebaseapp.com` adreslerinde de otomatik yayınlıyor, yani büyük ihtimalle "ableton-tutorial.web.app" erişilebilir durumda ve rehberin alan adı kuralına ters. `location.hostname` bu alan adlarıyla bitiyorsa `berkayeracademy.com`'a yönlendirme ya da kanonik link eklenmeli (düşük öncelik).

---

## 15. Mevcut koddaki riskler (ders-push3.html, ableton-lab.html) [K]
- Seviye 2'deki sürükleme `window` üzerinde `pointermove` ve `pointerup` ile yapılıyor; `pointercancel` ve `lostpointercapture` dinlenmiyor ve `setPointerCapture` yok. Tarayıcı dokunuşu iptal ederse `dragKey` açık kalır. Tek pointer varsayıldığı için multi-touch'ta da bozulur. Yeni emülatörde §4'teki desen kullanılmalı.
- Hotspot'lar `click` ve ayrı bir `pointerdown` handler'ı birlikte kullanıyor. Pad çalmada gecikmesiz olması için yalnızca `pointerdown` kullanılmalı.
- Hizalama `window.resize` ve 120 ms debounce ile yapılıyor; ResizeObserver ve visualViewport'a geçilmeli.
- ableton-lab.html'de synthCtx, beatCtx, eqACtx, arrACtx, demoCtx, dlyCtx ve limCtx olmak üzere 7 ayrı AudioContext oluşturuluyor. Push sayfasında tek context kullanılmalı (§10).


## BULGULAR
- [resmi/yuksek] Push 3 padleri varsayılan olarak MPE modundadır ve her pad için pressure, slide ve per-note pitch bend olmak üzere üç ifade boyutu sunar. Slide dikey harekettir ve farklı Y konumlarında vurmak farklı sonuç verir. Per-note PB yatay harekettir, Live'da 'NotePB' olarak görünür ve bir paddan diğerine gitar perdesi gibi büküler. In Key modunda bend tonda kalır, Chromatic modunda yarım seslerle ilerler. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Setup > Expression sekmesinin seçenekleri: Expression Mode MPE (varsayılan), Poly Aftertouch veya Mono Aftertouch. Note Pitch Bend Auto (varsayılan), On veya Off; cihaz desteklemiyorsa yatay kaydırma glissando yapar. In Tune Location Finger (ilk dokunulan yer sıfır bend) veya Pad (merkez sıfır). In Tune Width 0–20 mm. Slide Height 10–16 mm. (https://www.ableton.com/en/push/manual/)
- [resmi/orta] Kılavuzun eski sürümünde In Tune Width için bend değişikliklerinin 'ne kadar çabuk başladığını' belirlediği ve küçük genişlikte bend'in 'daha erken' başladığı yazıyor. Yeni sürümde 'daha hızlı' ifadesi kullanılıyor. İki ifade birlikte bir in-tune bölgesi yorumunu destekliyor; kesin formül yayınlanmamış. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Push 3 Setup > Sensitivity sekmesinde Threshold, Drive, Compand ve Range parametreleri ile Reset butonu vardır. Accent tüm notaları 127'de çalar; kısa basınca açık kalır, basılı tutunca momentary çalışır. Repeat da aynı latch/momentary davranışını gösterir. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Push 3'te Tempo encoder'ı 1 BPM adımla çalışır, Shift ile 0.1 BPM. Swing %1 adımlarla %0–100 arasıdır. Encoder'a dokunmak Tempo mu Swing mi seçili olduğunu gösterir, basmak ikisi arasında geçiş yapar. Shift ile encoder çevirmek ince çözünürlük verir. Delete basılıyken encoder'a dokunmak otomasyonu siler ya da parametreyi varsayılana döndürür. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Push 3 encoder'larının (jog wheel, Swing/Tempo ve Volume dahil) üstüne dokunmak MIDI nota, çevirmek CC gönderir. User Mode'da 'Relative (lin. 2's comp.)' mapping önerilir. Touch strip, instrument track'te varsayılan olarak pitch bend yapar; Select basılıyken dokunmak mod wheel'e geçirir; Drum Rack'te bank seçer. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Note modunda pad renkleri şöyledir: track rengi kök notası, track renginin açık tonu seçili pad, yeşil çalan pad, beyaz ölçekte olan ama kök olmayan nota. Fixed kapalıyken sol alt pad her zaman kökü çalar. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Push 3 Setup > Audio sekmesinde örnekleme hızı 44,100–96,000 Hz, buffer 128–2048 sample aralığındadır ve varsayılan 128'dir. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Push 3'ün ölçüleri 380 mm × 318 mm'dir. Cihazda her biri XY sensörlü 64 MPE pad bulunur. (https://www.ableton.com/en/push/tech-specs/)
- [ikincil/orta] Push 1/2 encoder'ları relative çalışır ve ivmelidir: saat yönünde 1–63, ters yönde 127–64 gönderir. Sayfa 403 döndürdüğü için bilgi arama özetinden alındı. (https://help.ableton.com/hc/en-us/articles/209071249-Push-User-Mode-for-custom-MIDI-mappings)
- [resmi/yuksek] Push 2 kılavuzunda (Push 3 değil): Shift + encoder ince ayar yapar, Delete + touch varsayılana döndürür, Select + tap touch strip modunu değiştirir. Setup'ta Pad Sensitivity, Gain ve Dynamics 0–10 aralığındadır; lineer eğri için Gain 4, Dynamics 7 önerilir. (https://www.ableton.com/en/live-manual/12/using-push-2/)
- [resmi/yuksek] MPE standardı: her nota kendi kanalını alır. Lower Zone'da master kanal 1, üye kanallar 2–16'dır. PB aralığı üye kanallarda ±48, master kanalda ±2 yarım sestir. Slide için CC74, basınç için Channel Pressure kullanılır ve nota başlarken ilk CC74 değeri gönderilir. (https://midi.org/midi-polyphonic-expression-mpe-specification-adopted)
- [ikincil/orta] Live 11 ile birlikte Wavetable, Sampler ve Arpeggiator yerleşik MPE desteği kazandı. (https://synthanatomy.com/2021/02/ableton-live-11-is-out-with-comping-mpe-new-devices-more.html)
- [resmi/yuksek] PointerEvent.pressure 0–1 aralığındadır. Basınç desteklemeyen donanımda değer active buttons durumunda 0.5, diğer durumlarda 0 olmak zorundadır. Temas geometrisi olmayan girdilerde width/height 1 döner. (https://www.w3.org/TR/pointerevents3/)
- [resmi/yuksek] Direct manipulation (touch) pointer'ları pointerdown anında hedef elemana örtük olarak capture edilir. pointerdown içinde releasePointerCapture çağrılırsa diğer elemanlarda boundary olayları (pointerover/enter/leave) gelir. Viewport manipülasyonu pointer olayı iptal edilerek engellenemez, touch-action ile önceden bildirilmelidir; aksi halde pointercancel gelir. (https://www.w3.org/TR/pointerevents3/)
- [resmi/yuksek] setPointerCapture Temmuz 2020'den beri Baseline'dır. Capture sırasında pointermove ve pointerup olayları capture eden elemana gider. (https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
- [resmi/yuksek] touch-action:none tüm pan ve zoom hareketlerini kapatır, manipulation ise double-tap zoom'u kapatır. touch-action hareket başladıktan sonra değiştirilirse etkisizdir. none değeri tarayıcı zoom'unu engellediği için erişilebilirlik riski taşır (WCAG 1.4.4). (https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- [ikincil/yuksek] touch-action iOS Safari 13+ sürümde tam, 9.3–12.5 arasında kısmi olarak desteklenir. Masaüstü Safari desteklemez. (https://caniuse.com/css-touch-action)
- [ikincil/yuksek] Pointer Events Safari macOS 13+, iOS 13.2+, Chrome 55+ ve Firefox 59+ sürümlerde desteklenir. (https://caniuse.com/pointer)
- [resmi/orta] getCoalescedEvents yalnızca güvenli bağlamda çalışır ve 'Limited availability' durumundadır. Sentetik olaylarda boş liste döndürür. (https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents)
- [ikincil/orta] Apple Pencil 240 Hz'de sürekli 0..1 basınç verir. Parmakla dokunmada ve mouse'ta e.pressure güvenilir değildir. (https://dev.to/sendotltd/reading-apple-pencil-pressure-in-the-browser-pointerevent-getcoalescedevents-and-the-2e23)
- [ikincil/orta] 3D Touch iPhone 11 ve sonrasında kaldırıldı. Bu nedenle modern iPhone'larda parmak basıncı ölçülmüyor. (https://en.wikipedia.org/wiki/Force_Touch)
- [ikincil/yuksek] Web MIDI desteği: Chrome 43+, Edge 79+, Firefox 108+ ve Chrome Android'de var. Safari macOS ve iOS hiçbir sürümde desteklemiyor. (https://caniuse.com/midi)
- [resmi/yuksek] Chrome 124'ten itibaren sysex olmasa da tüm Web MIDI erişimi izin istemine bağlandı. (https://developer.chrome.com/blog/web-midi-permission-prompt)
- [resmi/yuksek] Web MIDI yalnızca güvenli bağlamda çalışır. Permissions-Policy 'midi' direktifiyle sınırlanabilir. MIDIConnectionEvent/statechange ile cihaz takıp çıkarma izlenir. (https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [ikincil/orta] Firefox'ta Web MIDI için 'site permission add-on' kurulumu gerekir; kurulmazsa requestMIDIAccess localhost dışında reddedilir. (https://blog.karimratib.me/2022/04/23/firefox-webmidi.html)
- [ikincil/dusuk] Firefox, bağlı MIDI cihazı olmadığında MIDI erişimini otomatik olarak reddedebiliyor (bug başlığından çıkarım). (https://bugzilla.mozilla.org/show_bug.cgi?id=1805582)
- [ikincil/yuksek] AudioWorklet desteği: Chrome 66+, Firefox 76+, Safari 14.1+, iOS Safari 14.5+. (https://caniuse.com/mdn-api_audioworklet)
- [resmi/yuksek] AudioWorklet yalnızca güvenli bağlamda (HTTPS) kullanılabilir. (https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [resmi/yuksek] latencyHint değerleri interactive (varsayılan), balanced, playback ya da saniye cinsinden sayıdır. baseLatency ve outputLatency özellikleri mevcuttur. (https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext)
- [ikincil/yuksek] latencyHint seçeneği Chrome 58+, Safari 14.1+ ve iOS 14.5+ sürümlerde desteklenir; Firefox desteklemez. (https://caniuse.com/mdn-api_audiocontext_audiocontext_options_latencyhint_parameter)
- [resmi/yuksek] Kullanıcı hareketi dışında oluşturulan AudioContext suspended başlar; resume() click gibi bir kullanıcı hareketi içinde çağrılmalıdır. Ses aç/kapa kontrolünde role='switch' önerilir. (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [resmi/yuksek] Activation-triggering input event'ler şunlardır: keydown (Esc hariç), mousedown, yalnız mouse için pointerdown, mouse olmayanlar için pointerup ve touchend. Dolayısıyla touch ile gelen pointerdown ses kilidini açan bir kullanıcı etkileşimi sayılmaz. (https://html.spec.whatwg.org/multipage/interaction.html#user-activation-processing-model)
- [resmi/yuksek] iOS'ta Web Audio varsayılan olarak 'ambient' kategorisindedir ve telefon sessizdeyken susar. WebKit mühendisine göre iOS 17'den beri navigator.audioSession.type='playback' ile çözülür. (https://bugs.webkit.org/show_bug.cgi?id=237322)
- [ikincil/orta] navigator.audioSession Safari macOS ve iOS 16.4+ sürümde destekleniyor; Chrome desteklemiyor; Firefox 159'da desteklendiği görünüyor. (https://caniuse.com/mdn-api_navigator_audiosession)
- [resmi/yuksek] Audio Session API Editor's Draft durumundadır (13 Kasım 2024). 'playback' türü diğer playback seslerle karışmaz, 'ambient' türü karışabilir. Durumlar active, interrupted ve inactive'dir. (https://w3c.github.io/audio-session/)
- [ikincil/orta] iOS'ta AudioContext'in 'interrupted' durumunda takılı kaldığı ve resume() ile düzelmediği raporlanmıştır. (https://github.com/WebAudio/web-audio-api/issues/2585)
- [ikincil/dusuk] Ses açma tekniği touchstart, touchend, mousedown ve keydown olaylarında resume() çağırmaktır. Blog yorumlarında Safari'de sayfa başına yaklaşık 4 AudioContext sınırı olduğu belirtiliyor. (https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [ikincil/yuksek] screen.orientation.lock() iOS ve macOS Safari'de hiçbir sürümde desteklenmiyor; Chrome Android ve Firefox 144+ destekliyor. (https://caniuse.com/mdn-api_screenorientation_lock)
- [resmi/yuksek] Orientation lock genellikle yalnızca tam ekranda etkindir. Doküman gizliyse SecurityError, desteklenmeyen yön için NotSupportedError atılır. (https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock)
- [ikincil/orta] Fullscreen API iOS Safari'de kısmi, macOS Safari 16.4+ sürümde tam destekleniyor. (https://caniuse.com/fullscreen)
- [ikincil/yuksek] svh, lvh ve dvh birimleri iOS Safari 15.4+, Chrome 108+ ve Firefox 101+ sürümlerde desteklenir. (https://caniuse.com/viewport-unit-variants)
- [ikincil/yuksek] Vibration API iOS Safari'de desteklenmiyor; Firefox 129 ile kaldırıldı; Android Chrome'da çalışıyor. (https://caniuse.com/vibration)
- [resmi/yuksek] WCAG 2.5.8 (AA) pointer hedeflerinin en az 24×24 CSS px olmasını ister; 24 px'lik çember aralık istisnası vardır. AAA seviyesindeki 2.5.5 için hedef 44×44'tür. (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [resmi/yuksek] WCAG 2.1.4 (A): tek karakterlik kısayollar kapatılabilmeli, yeniden atanabilmeli ya da yalnızca ilgili bileşen odaktayken etkin olmalıdır. (https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html)
- [resmi/yuksek] APG slider deseni: role=slider, aria-valuenow/min/max/valuetext kullanılır; oklar ±1 adım, Home/End min/max, PageUp/PageDown isteğe bağlı büyük adım. Dikey slider için aria-orientation=vertical gerekir, varsayılan yatay. (https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- [resmi/yuksek] APG grid deseni: grid, row ve gridcell rolleri; roving tabindex ile tek tab durağı; oklar hücre değiştirir, Home/End ve Ctrl+Home desteklenir. Buton ızgaraları için layout grid uygundur. (https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [resmi/yuksek] KeyboardEvent.code fiziksel tuşu verir ve klavye düzeninden ya da modifier tuşlardan etkilenmez; oyunlarda fiziksel konum için önerilir. (https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
- [resmi/orta] navigator.keyboard.getLayoutMap() fiziksel tuşun yerel karakterini verir. Güvenli bağlam gerektirir, deneysel ve Baseline değildir. (https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap)
- [resmi/yuksek] preventDefault() için wheel listener'ı {passive:false} ile eklenmelidir. deltaMode 0 piksel, 1 satır, 2 sayfadır. Trackpad pinch hareketinde ctrlKey=true gelir. (https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event)
- [resmi/yuksek] -webkit-touch-callout:none iOS'ta uzun basınca açılan menüyü kapatır; standart dışı bir özelliktir. (https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout)
- [resmi/orta] Live Computer MIDI Keyboard: orta harf sırası beyaz tuşlardır ve C3'ten başlar, üst sıra siyah tuşlardır. Z/X oktav değiştirir, C/V velocity'yi 20'şer aralıkla değiştirir. Aç/kapa kısayolu Cmd/Ctrl+Shift+K. (https://www.ableton.com/en/manual/midi-and-key-remote-control/)
- [resmi/orta] Live'da Shift ile sürüklemek ince ayar yapar, Delete parametreyi varsayılana döndürür, Pan kontrolüne çift tıklamak da varsayılana döndürür. (https://www.ableton.com/en/live-manual/12/live-keyboard-shortcuts/)
- [kod/yuksek] Learning Synths kodu: KeyboardEvent.code kullanıyor. Piyano dizisi KeyA,KeyW,KeyS,KeyE,KeyD,KeyF,KeyT,KeyG,KeyY,KeyH,KeyU,KeyJ,KeyK,KeyO,KeyL,KeyP,Semicolon,Quote ve nota = 60+12·oktav+indeks; oktav −4..+3 ile sınırlı. Isomorphic modda Z-sırası 48 tabanlı, sağa her tuş +2, yukarı her sıra +3 yarım ses. Klavyede keypress ve keyup dinleniyor, blur ve contextmenu olaylarında panic yapılıyor. Ses kilidi touchstart, touchend, mousedown, mouseup ve click olaylarında capture ile resume() çağırarak açılıyor. visibilitychange'de master gain rampalanıyor. Web MIDI Firefox'ta kapalı ve statechange ile yeniden bağlanıyor. (https://learningsynths.ableton.com/js/musiclab.js)
- [kod/yuksek] Learning Synths Playground ayarlarında varsayılanlar şöyle: Audio Quality High, Keyboard Layout Isomorphic, MIDI Input Off. Arayüzde 'You can play this synth by pressing the letter and number keys' notu var. Slider'lar tabindex=0 olan div'ler ama role=slider taşımıyor. Durum localStorage 'synth_state' anahtarında tutuluyor. (https://learningsynths.ableton.com/en/playground)
- [resmi/yuksek] Learning Synths'e Export (Live Set içinde Max for Live synth), 60 saniyelik kayıt, yapılandırılabilir XY pad ve 'Open in Playground' butonları eklendi; Türkçe dil desteği de var. (https://www.ableton.com/en/blog/new-in-learning-synths-export-to-live-record-your-creations-and-more/)
- [kod/yuksek] Learning Music ders sayfası: '1/10' sayacı ve ‹ Previous / Next › gezinmesi var. Kontrole iliştirilmiş bir ipucu balonu ('Click this button to start and stop playback' + Close) gösteriliyor. Reset, Clear ve Export to Live butonları, Türkçe dil seçeneği ve 'Reset all lessons' var. Grid'de touch-action:manipulation kullanılıyor. Grid hücreleri klavyeyle odaklanamıyor ve ikon-yalnız play butonunun etiketi yok. (https://learningmusic.ableton.com/make-beats/make-beats.html)
- [kod/yuksek] Launchpad Arcade/Intro'da QWERTY aynı anda 4 pad sırasını çalar. P ve ; üst/alt 4 sıra arasında geçer, [ ve ] bir sıra kaydırır, ? tuş etiketlerini gösterir, Space başlat/durdur yapar. Eşlemenin yalnızca US klavye düzeni için yapıldığı belirtiliyor. Web MIDI sysex:true ile isteniyor ve statechange ile cihazlar taranıyor. Viewport'ta user-scalable=no var. Dar ekranda ızgara 3'lü bloklar halinde yeniden akıyor. (https://intro.novationmusic.com/viral-hiphop?overlay=qwerty-support)
- [ikincil/orta] gridinstruments web tabanlı bir isomorphic grid synth'tir: MPE MIDI, dokunma ve bilgisayar klavyesi desteği var; Shift vibrato, Space sustain yapar; kaydırma yok ve tüm enstrüman tek ekranda. (https://github.com/zitongcharliedeng/gridinstruments)
- [resmi/yuksek] Ableton rehberi: word mark'lar referans amaçlı ve ürün adından daha az belirgin kullanılmalı. Eğitim başlıklarında 'Ableton' ilk kelime olamaz. Logo kullanılamaz. Arayüz, grafik ve sembol taklit edilemez. Eğitimde ekran görüntüleri değiştirilmeden kullanılabilir. Ürün görseli gerçek fotoğraf olmalı. 'Ableton' alan adında kullanılamaz. 'independent… not authorized, sponsored, or otherwise approved by Ableton AG' ve 'not affiliated… with Ableton AG' metin kalıpları verilmiş. İletişim adresi iprights@ableton.com. (https://www.ableton.com/en/legal/branding-trademark-guidelines/)
- [resmi/yuksek] Ableton Trademark List'te Push® tescilli; Live™, Link™, Max for Live™, Drum Rack™, Operator™ vb. de var. Wavetable ve Drift listede yok. (https://www.ableton.com/en/legal/trademark-list/)
- [ikincil/orta] SMK 6769 md. 7/5: marka sahibi, markanın dürüstçe ve ticari hayatın olağan akışı içinde kullanım amacı gibi niteliklere ilişkin açıklamalarda kullanılmasını engelleyemez. (https://www.lexpera.com.tr/mevzuat/kanunlar/sinai-mulkiyet-kanunu-6769-1)
- [resmi/yuksek] AB 2015/2436 sayılı Direktif md. 14(1)(c): markanın sahibinin mallarına referans vermek için kullanılması, honest practices şartıyla engellenemez. (https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32015L2436)
- [resmi/orta] Firebase Hosting her deploy'u PROJECT_ID.web.app ve PROJECT_ID.firebaseapp.com adreslerine de yayınlar. Sitenin projesi 'ableton-tutorial' olduğu için içerik büyük ihtimalle 'ableton' içeren alt alan adında da erişilebilir. (https://firebase.google.com/docs/hosting/quickstart)
- [kod/yuksek] Yerel SVG ölçümleri: pad rect 146×108, pitch 152×114. PadButton sol üstte (589,866), PadButton_57 sol altta (589,1664), PadButton_64 sağ altta (1653,1664). TouchSlider (426,865, 107×907). Üst encoder'lar yaklaşık 68 çapında ve 153.6 aralıklı; Knob_9 126, Knob_10 83, Knob_11 (jog) 215 çapında. LCD 1222×220 (581,482). SelectionButton 136×66 (y=360 ve y=757). SideButton 62×98. (file:///Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] ders-push3.html: Seviye 2 sürüklemesi window üzerinde pointermove ve pointerup ile yapılıyor; pointercancel/lostpointercapture ve setPointerCapture yok. Hotspot'lar role=button, tabindex=0, Enter/Space ve touch-action:none kullanıyor. Sayfa başlığı 'Ableton Push 3 — …' ile başlıyor. ableton-lab.html'de 7 ayrı AudioContext oluşturuluyor. (file:///Users/berkayer/site/ders-push3.html)

## BELIRSIZ
- In Tune Width'in kesin matematiği (in-tune bölgesi mi, eğim mi) ve fabrika varsayılanı yayınlanmamış; spesifikasyondaki bölge modeli bir yorum.
- Slide Height'in varsayılanı, yönü (yukarının yüksek değer olduğu) ve pad merkezinin 64'e karşılık gelip gelmediği doğrulanamadı.
- Sensitivity parametrelerinin (Threshold, Drive, Compand, Range) aralıkları, varsayılanları ve eğri formülleri yayınlanmamış; önerilen velCurve kendi yaklaşımımız.
- Push 3 touch strip'in pitch bend modunda bırakınca merkeze dönüp dönmediği kılavuzda açıkça yazmıyor.
- Push 3 encoder ve jog wheel'in tur başına detent sayısı ve ivme eğrisi bilinmiyor; 200 px/tam aralık ve 15°/adım değerleri kendi seçimimiz.
- Accent ve Repeat için kısa basış (latch) ile basılı tutma (momentary) arasındaki süre eşiği yayınlanmamış; 400 ms kendi seçimimiz.
- Parmak dokunuşunda iPhone ve Android'in PointerEvent.pressure olarak tam ne döndürdüğü cihaza göre değişiyor ve doğrulanamadı; 'gerçek basınç' tespiti sezgisel.
- getCoalescedEvents'in Safari (macOS/iOS) desteği net değil.
- navigator.audioSession'ın hangi sürümde geldiği iki kaynakta farklı (caniuse Safari 16.4 diyor, WebKit mühendisi iOS 17 diyor). Firefox 159 desteği yalnız caniuse'da görünüyor.
- iOS 'interrupted' durumu için AudioContext'i kapatıp yeniden oluşturma çözümü test edilmedi.
- Safari'de sayfa başına yaklaşık 4 AudioContext sınırı yalnızca bir blog yorumunda geçiyor.
- Firefox'un bağlı cihaz yokken MIDI erişimini otomatik reddetmesi yalnızca bug başlığından çıkarıldı; mevcut Firefox sürümünde site permission add-on akışının hâlâ geçerli olup olmadığı doğrulanmadı.
- Pad fiziksel ölçüsü (yaklaşık 26×19 mm) SVG'nin 380 mm genişliği tam kapladığı varsayımına dayanıyor; gerçek pad ölçüsü doğrulanamadı.
- Knob_9 ve Knob_10'un sırasıyla Volume ve Tempo/Swing encoder'ı olduğu SVG konumundan tahmin edildi.
- Push 3'te Wavetable seçiliyken bir encoder'a dokunmanın ekranda özel bir görselleştirme açıp açmadığı bu konuda doğrulanmadı (Wavetable/Display konusunun kapsamında).
- Launchpad Arcade'in pad bazında tam tuş eşlemesi koddan çıkarılamadı; yalnızca yardım metnindeki kurallar biliniyor.
- Hukuki değerlendirme hukuki tavsiye değildir. Ableton rehberi emülatörleri açıkça ele almıyor; cihaz ve arayüz taklidi gri alan. Kesin güvence için iprights@ableton.com adresinden yazılı onay gerekir.
- Figma çiziminde görsel olarak Ableton logosu ya da 'Ableton' yazısı bulunup bulunmadığı yalnızca id düzeyinde kontrol edildi; render edilerek bakılmalı.
- ableton-tutorial.web.app ve .firebaseapp.com adreslerinin gerçekten yayında olduğu canlı olarak kontrol edilmedi (Firebase dokümanına ve .firebaserc'ye dayanan çıkarım).