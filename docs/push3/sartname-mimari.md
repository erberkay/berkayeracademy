## 0. İlkeler (bağlayıcı)
- **Build yok.** Yeni kodun tamamı `assets/js/push3/` altında düz `<script>` dosyası olarak durur. Her dosya bir IIFE'dir ve dışarıya yalnızca `window.P3.<modül>` açar. İçeride `var` ve template literal kullanılır; `type="module"` yok (CLAUDE.md). Worklet ve Worker dosyaları kendi global scope'larında çalıştığı için orada `class`/`const` serbest.
- **Yollar mutlak ve sürümlü olmalı:** `/assets/js/push3/p3-wt-worklet.js?v=${P3.K.V}`. Yol yanlışsa Firebase'in `**`→`/index.html` rewrite'ı HTML döndürür, `nosniff` başlığı da `addModule`'ü düşürür. `P3.K.V` değeri, paylaşılan `?v=` damgasıyla aynı commit'te artırılır.
- **Enjekte edilen cihaz SVG'si yüklemeden sonra hiç değiştirilmez.** Bu mevcut performans kuralıdır (commit bf82b0c). `filter` yalnız `.p3-device-wrap` üzerinde kalır. Dinamik görüntünün tamamı kardeş katmanlarda (canvas ve div) çizilir.
- **Tek `AudioContext` kullanılır.** ableton-lab'deki 7 context deseni kopyalanmaz.
- **Cihaz içi renkler temadan bağımsız sabit hex'tir.** Böylece açık temada LCD'nin koyu zemin üstüne koyu yeşil yazı hatası tekrarlanmaz. Sayfa kabuğunda yalnız token kullanılır: radius 0; gradient, `!important` ve `backdrop-filter` yok.

## 1. Dosya yapısı
| Dosya | Sorumluluk | Dışa açılan |
|---|---|---|
| `ders-push3.html` | Kabuk DOM (mod menüsü, taskbar, sahne, alt panel), sayfa CSS'i, script sırası. Auth IIFE aynen kalır. Eski `#p3Lcd` DOM'u ve oyun IIFE'si silinir, mantık `p3-levels.js`'e taşınır. | — |
| `p3-core.js` | `P3.K` sabitleri (V, HOLD_MS=300, DOUBLE_MS=500, TOUCH_POPUP_MS=400, renkler, TRACKS). `P3.bus` (on/off/emit, `'*'` joker). `P3.store` (get/set/tx, undo/redo). `P3.save` (localStorage `bk_push3_v1`). `P3.t` (i18n köprüsü). `P3.u` (clamp, mod, dbToGain, mulberry32) | `P3.K, P3.bus, P3.store, P3.save, P3.t, P3.u` |
| `p3-scale.js` | Scale/Note matematiği, saf fonksiyonlar (bkz. scaleNoteMantigi) | `P3.scale` |
| `p3-wt-params.js` | `WT_PARAMS` (104 + 2 sanal hedef), `ENUMS`, `WT_BANKS`, eğriler, `fmt()`, `lfoShape()` (UI ve worklet aynı formülü kullanır), 12 preset | `P3.wtp` |
| `p3-device.js` | SVG fetch, `DOMParser` ile nötrleştirme, enjeksiyon. `CONTROLS` registry'si (sabit geometri, getBBox yok). Hit-test, katman hizalama, ResizeObserver ve `visualViewport`, görünümler (viewBox), Path2D glif önbelleği | `P3.dev` |
| `p3-leds.js` | Her kontrolün LED durumunu `{m:'off'|'dim'|'on'|'blink'|'pulse', c:hex}` biçiminde hesaplar. `#p3LedCanvas` ve `#p3PadCanvas` çizimi (dirty-rect, rAF) | `P3.leds` |
| `p3-lcd.js` | 960×160 canvas renderer ve sayfa çizicileri, popup katmanı | `P3.lcd` |
| `p3-input.js` | Pointer (tek pad yakalama yüzeyi, encoder, strip, jog, düğme), klavye (`e.code`), Web MIDI (Faz 2). Hepsini `P3.bus.emit('in', ev)` olayına indirger | `P3.input` |
| `p3-modes.js` | Push durum makinesi: buton sınıfları, modifier kombinasyonları, pad modu / görünüm / overlay geçişleri, encoder yönlendirmesi | `P3.modes` |
| `p3-wt-engine.js` | AudioContext, master zinciri, worklet yükleme ve çökünce yeniden kurma, synth track başına bir `AudioWorkletNode`, tablo LRU, param/nota mesajları (rAF'te toplu), PeriodicWave fallback | `P3.audio, P3.wt` |
| `p3-wt-tables.worker.js` | Prosedürel wavetable ve mip üretimi (kendi radix-2 FFT'si). Worker olarak çalışır; açılamazsa ana thread'de `requestIdleCallback` ile parça parça üretir | — |
| `p3-wt-worklet.js` | `registerProcessor('p3-wavetable', …)` DSP'si. Tablolar worklet global `Map`'inde tutulur ve tüm instance'lar paylaşır | — |
| `p3-drums.js` | Sample yükleme (`decodeAudioData`), pad sesi, choke, drum layout eşlemesi | `P3.drums` |
| `p3-seq.js` | Transport (beat zaman tabanı), 25 ms / 100 ms lookahead scheduler, clip/step modeli, Record FSM, Tap, Metronome, Repeat, Swing, Quantize, Fixed Length | `P3.seq` |
| `p3-levels.js` | Seviye 1 (`TASKS`, 27, pasif) ve Seviye 2 (emülatör üstünde 6 görev) | `P3.levels` |
| `p3-tutorial.js` | Öğretici motoru ve `P3_TUTORIAL` müfredatı | `P3.tut` |
| `p3-app.js` | Hash router, mod menüsü, mod başlatma/bitirme, ses kilidini açma, bootstrap, `gate()` | `P3.app` |
| `p3-selftest.js` | Yalnız `?p3debug=1` ile yüklenir: birim testleri, OfflineAudioContext ölçümleri, registry debug katmanı | `P3.test` |

Yükleme sırası (body sonunda, `i18n.js`'ten sonra):
```html
<script src="/assets/js/push3/p3-core.js?v=…"></script> <!-- sonra: p3-scale, p3-wt-params, p3-device, p3-leds, p3-lcd, p3-wt-engine, p3-drums, p3-seq, p3-modes, p3-input, p3-levels, p3-tutorial, p3-app -->
```

## 2. Veri akışı
```
Pointer / Klavye / MIDI ──P3.input (padAt, encoder delta, basılı tutma süresi, src kimliği)
   ▼  ev = {k:'btn'|'pad'|'enc'|'strip'|'jog', id, down, dt, x, y, vel, delta, fine, touch, press, src}
P3.bus.emit('in', ev) ──► P3.app.gate(ev)   // öğretici allow listesi / Seviye 1 pasif / menü açık
   ▼ (geçerse)
P3.modes.dispatch(ev) ── held modifier tablosu → overlay → pad modu → görünüm
   ├─► P3.store.set(path,v,{undo})  → bus 'state' {path,value,prev}
   ├─► P3.wt.noteOn/noteOff/param/mod  → port.postMessage (param'lar rAF'te birleşir, ≤60 Hz)
   ├─► P3.drums.trigger(pad,vel,when)
   └─► P3.seq.* (play, rec, step, tap…) → bus 'transport', 'tick'(beat)
bus 'state'|'transport'|'tick'|'note' ─► P3.leds.invalidate(ids) ─► rAF: yalnız kirli bölgeler
                                        └► P3.lcd.invalidate()     ─► rAF: tek çizim
bus '*' ─► P3.tut.onEvent / P3.levels.onEvent → step.check(S, rt)
```
Pad notaları hıza bağlı olduğu için store'dan geçmez. Doğrudan `P3.wt`/`P3.drums`'a gider, ardından bus'a `'note'` olayı atılır.

## 3. Durum modeli
```js
P3.S = {
  v:1,
  app:{ mode:'menu' /*menu|tutorial|level1|level2|free*/, audio:'off' /*off|running|suspended|interrupted|failed|fallback*/ },
  pad:'note',            // pad modu: 'note'|'session'
  view:'device',         // ekran: 'device'|'mix'|'clip'|'session'
  overlay:null,          // null|'scale'|'bank'|'fixedLength'|'quantize'|'metronome'|'learn'|'setup'
  popup:null,            // {text, until}
  held:{},               // id → {t0, used:false}
  sel:{ track:0, scene:0 },
  tracks:[],             // P3.K.TRACKS derin kopyası
  scale:{ root:0, idx:0, inKey:true, fixed:false, layoutIdx:0 },   // global (Live 12 Song scale)
  transport:{ playing:false, rec:'idle' /*idle|countin|rec|play|overdub*/, bpm:120, swing:0, sig:[4,4], metro:false, countIn:0, sound:0, t0:0 },
  swingTempo:'tempo', vol:{ target:'main', main:-10, phones:-10, track:0, cue:-10 },
  fixedLen:{ on:false, idx:3, phraseSync:false }, quant:{ to:4, amount:100, rec:false, recTo:4 },
  strip:{ mode:'pb', pb:0, mod:0 },
  wtui:{ bank:0, osc:'1', flt:1, env:'amp', lfo:1, ampView:'time', modView:'time', expr:'mpe', target:null, prevBank:0, touched:-1 },
  session:{ trackOff:0, sceneOff:0 },
  prefs:{ workflow:'scene', notePB:'auto', kb:'grid', kbOn:true, quality:'auto', noteNames:false, hints:true, view:'auto' }
};
// P3.K.TRACKS (Faz 1: ilk ikisi; Faz 2: dördü)
[{id:0,name:'Wavetable',kind:'synth',color:'#0088DE',preset:'init'},
 {id:1,name:'Drums',kind:'drum',color:'#D87635',kit:'p3kit'},
 {id:2,name:'Bass',kind:'synth',color:'#1ABE40',preset:'deep-bass'},
 {id:3,name:'Pad',kind:'synth',color:'#B670EE',preset:'pos-pad'}]
// her track'e eklenenler: mute, solo, arm:true, vol:0 (dB), pan:0, p:Float32Array(WT_PARAMS.length), mod:{tgtId:Float32Array(13)},
//   pos (64 Notes position), pos32, mel:0 (0 64 Notes | 1 Mel Seq | 2 Mel Seq+32), lock:false, repeat:{on:false,rate:5}, grid:3,
//   clips:[8×null], playing:-1, queued:-1
//   yalnız drum: drumLayout:0 (0 Loop Sel | 1 16 Vel | 2 64 Pads), selPad:0, bank:0, velPad:15, page:0, loopOff:0
// Clip: {len:8 /*beat*/, loop:[0,8], color, name:'', notes:[{t,p,d,v,m:false,pr:1}]}
```
**Undo.** `P3.store.set(path, v, {undo:'etiket'})` bir `{path, prev, next}` kaydı iter. Bileşik işlemler `P3.store.tx(etiket, fn)` ile tek kayda sarılır. Encoder hareketleri dokunuştan bırakmaya kadar tek kayıt olarak birleştirilir. Yığın 100 kayıttır; yeni işlem gelince redo temizlenir. Kapsam: step/nota/clip işlemleri, scale ayarları, cihaz parametreleri.

## 4. SVG üstündeki katmanlar (`.p3-game-stage` içinde)
| z | Eleman | İçerik | Olay | Güncelleme |
|---|---|---|---|---|
| 1 | `#p3DeviceWrap > svg` | Nötrleştirilmiş statik cihaz, `drop-shadow` | yok | hiç |
| 2 | `canvas#p3PadCanvas` | 64 pad (rx5) ve öğretici hedef çerçevesi | `pointer-events:none` | kirli pad, rAF |
| 2 | `canvas#p3LedCanvas` | Düğme etiket/ikon glifleri (Path2D), 17 light bar, 8 scene etiketi + ▶, strip noktası, encoder dokunma halkası | yok | dirty-rect, rAF; blink/pulse varsa ≤30 fps |
| 3 | `canvas#p3LcdCanvas` | 960×160 mantıksal ekran; SVG kutusu 581, 490.167, 1222×203.67 | yok | invalidate→rAF; animasyon varsa ≤30 fps |
| 4 | `#p3HotspotLayer` | Düğme div'leri (`role=button`), encoder div'leri (`role=slider`), `#p3PadSurface` (`role=grid` + 64 gridcell), `#p3Strip`, `#p3Jog`. Her birinde mevcut `.p3-hl` | tüm pointer ve klavye | yalnız resize |
| 5 | `#p3Coach` | Öğretici ipucu balonu | Kapat | adım değişince |

**Hizalama.** `alignHotspotLayer` genelleştirilir ve `P3.dev.align()` olur. `m = svgRoot.getScreenCTM()` katman orijinine göre ötelenir. Canvas'larda `ctx.setTransform(dpr*m.a,0,0,dpr*m.d,dpr*(m.e-L),dpr*(m.f-T))` kurulur, böylece çizim doğrudan SVG biriminde yapılır. DPR üst sınırı 2'dir. Tetikleyiciler: `ResizeObserver(wrap)` ve `visualViewport.resize`; ardından tam yeniden çizim yapılır. Mevcut 120 ms `resize` debounce'u kaldırılır.

## 5. Enjeksiyondan önce tek seferlik nötrleştirme (`DOMParser`)
1. `Rectangle 12…12_8` silinir.
2. `light_2..6` ve `light_10..14` içindeki renkli rect'ler `#414548` yapılır. `Group 1..5`, `Group 1_2..5_2`, `Ellipse 1_11` ve `Ellipse 1_12` silinir.
3. `LCD Display` içinde ilk rect dışındaki her şey silinir, o rect'in fill'i `#000000` yapılır. `Pixels` silinir.
4. 64 pad rect'inin fill'i `#1D1C22` yapılır; ışıklar canvas'ta çizilir.
5. Canvas'ın çizeceği glifler **silinmez**, `visibility="hidden"` yapılır. Bu sayede enjeksiyondan sonra `getBBox()`/`getCTM()` ile ölçülebilirler (DOM mutasyonu yok). Kapsam: `Label…Label_15`, `Save`, `Save_2`, `file`, `settings`, `tutorial`, `stamp`, `track`, `mixer`, `player`, `layout`, `lock`, `sqaure`, `mute`, `solo`, `add`, `replace`, `icon/quantize`, `icon-big-focus`, `record`, `play`, `icon-big-pads`, `icon-big-tracks`, `Octave`, `Octave_2`, `Page`, `Page_2`, `Vector 1…` (chevron'lar), `Group 11`, `Group 12`, `icon/play…_8`, `1/32t…1/32t_8`. Sonuncular Figma'da yanlış etiketlendiği için canvas bunları kendi metniyle çizer.
6. `fill="none" fill-opacity="0.04"` olan 57 no-op rect silinir.
7. Kökün içeriği `<g id="p3-art">` ile sarılır (mobil `<use>` için).

Enjeksiyondan sonra her gizli glif için bir kez `Path2D(d)`, `getCTM()`, fill/stroke/stroke-width ve fill-rule alınıp `P3.dev.glyphs[id]` içine yazılır.

## 6. Buton davranış sınıfları (`P3.modes`)
| Sınıf | Kontroller | down | up <300 ms | up ≥300 ms |
|---|---|---|---|---|
| `latchMom` | repeat, accent | `prev=on; on=true` | `on=!prev` | `on=prev` (momentary) |
| `modTap` | mute, solo, stopClip, delete, duplicate, quantize | `held[id]` açılır. Tutulurken başka kontrol gelirse kombinasyon, `used=true` | `!used` ise tek başına işlev | `!used` ise hiçbir şey yapılmaz; quantize'da menü kapanır |
| `pureMod` | shift, select | durum | durum | durum |
| `toggleMenu` | metronome, fixedLength (quantize'da menü kısmı) | 300 ms zamanlayıcı → overlay açılır | toggle | overlay kapanır |
| `overlay` | scale | açıksa kapanır, kapalıysa açılır | — | bu basışta açıldıysa kapanır |
| `padMode` | note, session | `prev=pad; pad=id` | — | `pad=prev` |
| `layout` | layout | Shift basılıysa kilitler | sonraki düzen / kilidi açar | geçici alternatif (Faz 2) |
| `action` | play, record, tapTempo, undo, save, new, capture, doubleLoop, octave/page, scene, upper/lower, device/mix/clip/sessionScreen, learn, add, swap, setup, sets, user, convert, mainTrack, automate | işlev hemen çalışır; held modifier'lar dikkate alınır | — | — |

Encoder olayları: `turn{delta,fine}`, `touch{on}`, `press` (yalnız volume, swingTempo ve jog).

## 7. i18n
- Statik kabuk metinleri `data-i18n="p3_*"` olarak `i18n.js`'e eklenir (yaklaşık 30 anahtar: menü, taskbar, düğmeler).
- Uzun dinamik içerik (öğretici, seviyeler) `i18n.js`'i şişirmemek için sayfaya özel `{tr:`…`, en:`…`}` nesneleriyle tutulur. `P3.t(o) = o[_i18n.getLang()] || o.tr`.
- Dil değişimi şöyle yakalanır (theme-init, `setLang`'i tıklama anında çağırdığı için sarmalama yeterli):
```js
var _set = window._i18n.setLang; window._i18n.setLang = function (l) { _set(l); P3.bus.emit('lang', l); };
```
- LCD, Push gibi İngilizce kalır. Yalnız Learn sayfası ve "Not in this simulator" açıklama paneli çevrilir.

## Kritik dosyalar
- /Users/berkayer/site/ders-push3.html
- /Users/berkayer/site/assets/img/push3-device.svg (dosyası salt okunur; nötrleştirme çalışma anında yapılır)
- /Users/berkayer/site/assets/js/push3/p3-modes.js (yeni)
- /Users/berkayer/site/assets/js/push3/p3-wt-worklet.js (yeni)
- /Users/berkayer/site/assets/js/i18n.js (`p3_*` anahtarları, `eg_modpush3_*` güncellemesi)
- /Users/berkayer/site/egitim.html (satır 886–901, kart metni)
- /Users/berkayer/site/ableton-lab.html (referans: scheduler 1055–1185, `makeSoftClipCurve` 764, worklet kalıbı 3908–3970)
- /Users/berkayer/site/assets/css/ui.css (token ve bileşen referansı)