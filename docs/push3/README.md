# Push 3 Laboratuvarı — uygulama sözleşmesi

Bu klasör `/ders-push3` emülatörünün tek doğruluk kaynağıdır. Öncelik sırası:
1. **Bu dosya** (kararlar + arayüz sözleşmesi) — diğer her şeyi geçersiz kılar.
2. `dogrulanmis-*.md` — şüpheci turundan geçmiş nihai spesifikasyonlar.
3. `sartname-*.md` — uygulama şartnamesi (plan agent'ı).
4. `arastirma-*.md` — ham araştırma (ayrıntı ve kaynak için).
5. `mufredat.md`, `elestiri.md`, `kaynaklar.md`.

Yayınlanmaz: `firebase.json` `**/*.md` dosyalarını ignore ediyor.

---

## A. Plan onayıyla gelen kararlar (şartnameyi geçersiz kılar)

1. **Canvas yerine `#p3Live` SVG'si.** Pad ışıkları, LED'li düğme glifleri, light bar'lar, scene etiketleri, strip noktası ve encoder dokunma halkaları cihazla **aynı viewBox'a** (`161 135 2116 1725`) sahip, filtresiz, `pointer-events:none` bir kardeş `<svg id="p3Live">` içinde çizilir. `sartname-mimari.md` §4'teki `#p3PadCanvas` ve `#p3LedCanvas` **yoktur**. Glifler `Path2D` ile değil `cloneNode(true)` ile taşınır; klonun konumu, enjekte edilmiş (değişmeyen) cihaz SVG'sindeki orijinalin `svgRoot.getScreenCTM().inverse().multiply(el.getScreenCTM())` matrisiyle `<g transform="matrix(…)">` sarmalayıcısına verilir. Orijinal glif, DOMParser aşamasında `visibility="hidden"` yapılır (ölçüm için DOM'da kalır). Yalnız LCD bir canvas'tır (`#p3LcdCanvas`, mantıksal 960×160).
2. **Cihaz SVG'si enjeksiyondan sonra asla değiştirilmez.** `filter` yalnız `.p3-device-wrap` üzerinde; `#p3Live`, LCD canvas ve hotspot katmanı bu elemanın **dışında** (kardeş) durur.
3. **Wavetable kategorisi:** `Cat` 0..6 = `['Temel','Harmonik','Vokal','FM','Sync','Dijital','Gürültü']`; `Tab` kategori içi indekstir. Tablo kimliği `tableId(cat, tab)` ile bulunur. Faz 1'de Sync/Dijital/Gürültü kategorileri görünür ama içlerindeki tablolar Faz 2'ye kadar `Temel Şekiller`e düşer ve LCD'de tablo adı `(yakında)` ekiyle gösterilir.
4. **Matrix ve MIDI & MPE bankaları Faz 1'dedir** (öğreticinin `modulasyon` bölümü için). Add to Matrix, Matrix bankında kaynak miktarları, Mod Target gösterimi çalışır.
5. **Main bankında Filter 2 seçiliyken Enc4 boştur** (gerçek cihazdaki gibi). "Düzeltilmiş davranış" uygulanmaz.
6. **Velocity:** varsayılan sabit 100; Accent açıkken 127; bilgisayar klavyesinde Shift basılıyken 70. `P3.S.prefs.velMode = 'fixed' | 'position'` (position: pad içi dokunma yüksekliği 40..127). Pen pressure Faz 3.
7. **Drum kit Faz 1'de 8 ses:** pad 0 Kick.wav, 2 Snare.wav, 6 `Close Hat.wav`, 10 `Open Hat (1).wav` (yollar `encodeURI` ile), 1 Rim, 3 Clap, 5 Tom, 13 Crash prosedürel (Lab `synthDrum` tariflerinden uyarlanır, `ableton-lab.html:1082`). Diğer 8 pad boş (gri) ve sessiz — gerçek bir Drum Rack'teki boş pad gibi.
8. **Kayıt zamanlaması:** Transport durukken Record → beat 0'dan kayıt başlar (count-in Faz 2). Çalarken Record → bir sonraki bar başında kayıt başlar. Fixed Length kapalıyken kayıt durdurulunca clip uzunluğu yukarı doğru tam bar'a yuvarlanır ve döngüye girer. Overdub notaları birleştirir. Launch quantization 1 bar (VARSAYIM, Live varsayılanı).
9. **Ses bütçesi:** tüm synth track'lerinde toplam ≤16 ses (std), ≤10 (eco).
10. **iOS ses:** kilit açılırken önce `navigator.audioSession && (navigator.audioSession.type = 'playback')`, sonra `new AudioContext({latencyHint:'interactive'})` + `resume()`. `audioSession` yoksa ve iOS ise tek seferlik sessiz `<audio>` döngüsü başlatılır (sessiz tuşu aşmak için).
11. **Asılı nota:** `pointerup`, `pointercancel`, `lostpointercapture` → idempotent `endVoice`. `blur`, `visibilitychange(hidden)`, `pagehide`, Escape, mod değişimi, overlay açılışı → `P3.panic()`. Octave/scale değişince **basılı tutulan** pad'lerin notaları eski perdelerinde kapanır (yeni perdeden yeniden tetiklenmez).
12. **Arka plan sekmesi:** gizlenince master 20 ms'de 0'a rampalanır, transport durmaz; görünür olunca master geri gelir ve scheduler beat konumunu `ctx.currentTime`'dan yeniden hesaplar.
13. **Worklet/Worker yükleme:** önce mutlak sürümlü yol (`/assets/js/push3/p3-wt-worklet.js?v=${P3.K.V}`), başarısızsa `fetch()` → `Blob` → `URL.createObjectURL` → `addModule`, o da olmazsa PeriodicWave fallback (`S.app.audio = 'fallback'`, LCD'de `Basic audio` rozeti). Worker için aynı sıra; Worker hiç açılamazsa tablolar ana thread'de `setTimeout(0)` ile kare kare üretilir (`requestIdleCallback` kullanılmaz).
14. **Marka:** `<title>` = `Push 3 Laboratuvarı — İnteraktif Push 3 Simülatörü · Berkay Er Academy`. Sayfa altında bağımsızlık notu (TR): `Ableton, Live ve Push, Ableton AG'nin ticari markalarıdır. Bu simülatör, Berkay Er Academy tarafından hazırlanmış bağımsız bir eğitim aracıdır; Ableton AG tarafından yetkilendirilmemiş, desteklenmemiş veya onaylanmamıştır.` LCD kendi tipografimizle (Instrument Sans) ve kendi ikonlarımızla çizilir. Ableton'ın dosyaları, ikonları, wavetable'ları ve script kodu **kopyalanmaz**; yalnız isimler ve sayılar kullanılır. Greg Hadala (CC BY 4.0) atfı korunur.
15. **Müfredat tek kaynağı** `§F` tablosudur (slug'lı). Faz 1 bölümleri: `baslarken, padler, scale, dizilim, osilator, filtre-env, modulasyon, drum`. Faz 2: `repeat-accent, kayit, session, final`.
16. **Dil:** Faz 1 yalnız TR. Tüm kullanıcı metinleri `{tr:`…`}` nesneleri veya `data-i18n="p3_*"` anahtarlarıyla yazılır; `P3.t(o)` EN yoksa TR döner. LCD metinleri Push gibi İngilizce kalır.
17. **Faz 1 dışı her kontrol** sessiz kalmaz: `P3.lcd.popup('Not in this simulator')` + `#p3Feedback`'e TR açıklama (`P3.K.UNSUPPORTED[id]`). Faz 2'de gelecekler `(yakında)` der.

---

## B. Kodlama kuralları (tüm dosyalar)

- Düz `<script>` IIFE: `(function(){ 'use strict'; var P3 = window.P3 = window.P3 || {}; … P3.scale = {…}; })();`. `type="module"`, `import`, `export`, `class` (ana thread'de) **yok**; `var` ve `function`. Worklet ve Worker dosyaları kendi global scope'unda `class`/`const` kullanabilir.
- Türkçe metinler **yalnız template literal** içinde (tek tırnaklı Türkçe string kesme işaretiyle script'i bozar — CLAUDE.md).
- Doğrulanamayan her davranışın yanına `// VARSAYIM: …` yorumu.
- `console.log` yok; beklenmeyen hatalarda `console.warn('[p3] …')`.
- Yorum yoğunluğu mevcut `ders-push3.html` kadar: neden'i anlatan kısa bloklar, gereksiz satır yorumu yok.
- DOM'a dokunan modüller yalnız `§E`'deki id'leri kullanır. CSS sınıfları `p3-` önekli.
- Sayfa kabuğu CSS'i yalnız `ui.css` token'ları: radius 0, gradient / `!important` / `backdrop-filter` yok. Cihaz içi renkler sabit hex (`P3.K.C`).
- Zaman: kullanıcı etkileşim zamanları `performance.now()` (ms); ses zamanları `P3.audio.ctx.currentTime` (s); müzikal konum **beat** (float, 1 beat = çeyrek nota).

---

## C. Yükleme sırası ve isim alanı

`ders-push3.html` gövde sonunda, `i18n.js`'ten sonra (hepsi `?v=${P3.K.V}` ile aynı damga):
```
p3-core.js → p3-scale.js → p3-wt-params.js → p3-device.js → p3-leds.js → p3-lcd.js →
p3-wt-engine.js → p3-drums.js → p3-seq.js → p3-modes.js → p3-input.js →
p3-levels.js → p3-tutorial.js → p3-app.js   [+ p3-selftest.js yalnız ?p3debug=1]
```
Dosyalar yalnız tanım yapar; hiçbiri yüklenirken yan etki üretmez. Tek giriş noktası `P3.app.boot()` — `p3-app.js`'in sonunda `DOMContentLoaded` (veya hemen, yüklendiyse) ile çağrılır. Worker ve worklet `p3-wt-engine.js` tarafından yüklenir.

---

## D. Durum modeli (`P3.S`, `P3.initState()` üretir)

```js
{
  v: 1,
  app: { mode: 'menu' /*menu|tutorial|level1|level2|free*/, audio: 'off' /*off|running|suspended|interrupted|failed|fallback*/, profile: 'std' /*hq|std|eco*/ },
  pad: 'note',             // pad modu. Faz 1: yalnız 'note' (session → popup)
  view: 'device',          // LCD görünümü. Faz 1: yalnız 'device' (mix/clip/sessionScreen → popup)
  overlay: null,           // null | 'scale' | 'learn'   (Faz 2: 'fixedLength'|'quantize'|'metronome'|'setup')
  bankView: false,         // device: false = zincir görünümü, true = bank görünümü (upper1 ile aç/kapa)
  popup: null,             // { text, sub, until }  — P3.lcd.popup() yazar
  held: {},                // kontrol id → { t0, used }   (modifier ve basılı tutma takibi)
  sel: { track: 0 },
  tracks: [                // P3.K.TRACKS'tan derin kopya + çalışma alanları
    { id:0, name:'Wavetable', kind:'synth', color:'#0088DE', preset:'init',
      mute:false, solo:false, arm:true, vol:0, pan:0,
      p: Float32Array(P3.wtp.PARAMS.length) /* gerçek birimli değerler */,
      mods: {} /* hedef param k → { src index(0..12): amount(-1..1) } */,
      pos: 21 /* 64 Notes konumu, P3.scale.defaultPos */, repeat:{on:false, rate:5}, grid:3,
      clips: [null,null,null,null,null,null,null,null], playing:-1 },
    { id:1, name:'Drums', kind:'drum', color:'#D87635', kit:'p3kit',
      mute:false, solo:false, arm:true, vol:0, pan:0,
      selPad:0, bank:0 /* drum pad 0 = nota 36 + bank */, page:0, loopOff:0, grid:3,
      repeat:{on:false, rate:5}, clips:[null,…8], playing:-1 }
  ],
  scale: { root:0, idx:0, inKey:true, fixed:false, layoutIdx:0 },       // global
  transport: { playing:false, rec:'idle' /*idle|rec|play|overdub*/, bpm:120, swing:0, metro:false, tapTimes:[] },
  swingTempo: 'tempo',     // Swing&Tempo encoder modu
  vol: { target:'main' /*main|phones|track|cue*/, main:-10, phones:-10, cue:-10 },
  accent: { on:false },
  strip: { mode:'pb' /*pb|mod*/, pb:0, mod:0 },
  wtui: { bank:0 /*0 Main,1 Oscillators,2 Filters,3 Global,4 Envelopes,5 LFOs,6 Matrix,7 MIDI & MPE*/, osc:'1' /*'1'|'2'|'S'|'Mix'*/, flt:1, env:'amp' /*amp|e2|e3*/, lfo:1, ampView:'time' /*time|slope*/, modView:'time' /*time|slope|value*/, expr:'mpe' /*mpe|monopoly*/, target:null /*mod hedefi param k*/, prevBank:0, touched:-1 /*dokunulan enc 0..7*/ },
  prefs: { velMode:'fixed', kbOn:true, kbLayout:'grid', kbWin:0, noteNames:false, hints:true, view:'auto' /*auto|full|pads|padsStrip|controls*/, quality:'auto' }
}
```
Clip: `{ len: 8 /*beat*/, loop:[0,8], notes:[ {t:beat, p:midi, d:beat, v:1..127, m:false} ] }`.
Undo kapsamı: step/nota/clip işlemleri, scale ayarları, cihaz parametreleri, track mute/solo. Encoder dönüşleri dokunuştan bırakmaya kadar tek undo kaydı.

---

## E. DOM kimlikleri (kabuk `ders-push3.html` sağlar)

```
#p3Modes (section, mod menüsü)            #p3ModeGrid, #p3ResetProgress
#p3Game (main)                           .p3-game-taskbar:
  #p3BackBtn  #p3ModeSeg (.seg, 4 .seg-btn[data-mode])  #p3Progress  #p3TaskText (aria-live polite)
  #p3HintBtn  #p3PresetSel (select, yalnız free)  #p3KbToggle (role=switch)  #p3ViewSeg (.seg: full/pads/controls)
  #p3Stage (.p3-game-stage):
    #p3DeviceWrap (.p3-device-wrap; SVG buraya enjekte edilir; filter yalnız burada)
    svg#p3Live (kardeş, viewBox aynı, pointer-events:none)
    canvas#p3LcdCanvas (kardeş, LCD kutusuna hizalı)
    #p3LcdLive (sr-only, aria-live polite)
    #p3HotspotLayer (kardeş): kontrol div'leri + #p3PadSurface (role=grid)
    #p3Coach (öğretici balonu, hidden)
  .p3-game-bottom:
    #p3Feedback (aria-live assertive)
    #p3ExplainPanel > #p3ExplainText, #p3ContinueBtn     (seviyeler)
    #p3TutPanel > #p3TutTitle, #p3TutBody, #p3TutListen, #p3TutPrev, #p3TutSkip, #p3TutToc, #p3TutFree, #p3TutNext  (öğretici)
#p3Toc (.modal-overlay > .modal.modal-lg, İçindekiler)
#p3Win (bitiş kartı: #p3WinTitle, #p3WinText, #p3WinPrimary, #p3WinSecondary)
#p3Toast (.toast-wrap)
#p3Disclaimer (sayfa altı bağımsızlık notu) · .p3-attribution (Greg Hadala)
```

---

## F. Müfredat (tek kaynak; adım metinleri `mufredat.md` + `sartname-ogretici.md` §5'ten birleştirilir)

| Slug | Faz | İçerik |
|---|---|---|
| `baslarken` | 1 | ses aç, Volume'a dokun/çevir, encoder = ekran sütunu, Learn |
| `padler` | 1 | Note mode, ilk nota (36), kök rengi, sağa gam, yukarı dörtlü, ilk akor, (İ) velocity |
| `scale` | 1 | Scale aç, kök D (`upper4`), Minor seç, D minor çal, Chromatic, Fixed |
| `dizilim` | 1 | 3rds, Sequential (kontrol: `(0,1)−(0,0) === 12`), 4ths'e dön, oktav yukarı, oktav aşağı (−2), pitch bend (|pb|≥0.5) |
| `osilator` | 1 | Device + bank görünümü, Position (≥0.30), Table, Osc 2, Oscillators bankı, Detune, Effect (Classic + PW≥0.2), Sub |
| `filtre-env` | 1 | cutoff (oran ≥4), resonance, filtre tipi HP, Envelopes bankı, attack ≥0.5 s, release ≥1 s, pluck (A≤10 ms, D≤300 ms, S≤%1) |
| `modulasyon` | 1 | *Wavetable nedir* (concept; LCD'de kareler ve Position; mip neden aliasing'i önler), Touch Strip Mod modunda (Select+strip) → Position taraması (varsayılan matris ModWheel→Pos), LFOs bankı, Position'a dokun → Add to Matrix → Matrix'te LFO 1 miktarı ≠ 0, Mod Amt, Global: Unison Classic + Amount |
| `drum` | 1 | drum track (`lower2`), kick {0,4,8,12}, snare {4,12}, Select+hat (selPad 6, ses yok), hi-hat ≥6 step, step mute, Delete+pad |
| `repeat-accent` | 2 | Repeat, hat rulosu, 1/8t (scene5), Accent (vel 127), accent momentary, swing 60 |
| `kayit` | 2 | metronom, Tap Tempo, Fixed Length, kayıt ≥4 nota, overdub +2, undo, quantize, capture |
| `session` | 2 | Session pad, clip başlat/durdur, scene2, geçici Note |
| `final` | 2 | serbest proje: ≥3 drum sesi + ≥8 notalı melodi birlikte çalıyor |

Koşullar yalnız doğrulanmış davranışa dayanır (§3 Scale VARSAYIM'ları hariç tutulur). Her adım için `check(setupState) === false` birim testi zorunlu.

---

## G. Modül sözleşmeleri

### G1. `p3-core.js`
```js
P3.K = {
  V: '20260925a',                       // sürüm damgası; sayfadaki ?v= ile aynı
  HOLD_MS: 300, DOUBLE_MS: 500, TOUCH_POPUP_MS: 400, POPUP_MS: 1500,
  VB: '161 135 2116 1725',              // cihaz viewBox
  LCD: { x:581, y:490.167, w:1222, h:203.67, W:960, H:160 },
  C: { off:'#1D1C22', gray:'#3A3A40', grayL:'#7A7A80', white:'#E6E6E6', green:'#38D65A', red:'#FA325E', blueD:'#2448C8',
       ledOff:'#2E3236', ledDim:'#7C858A', ledOn:'#FFFFFF', playGreen:'#0BC049', repeatGreen:'#46DD43', automateRed:'#E12020',
       lcdBg:'#000000', lcdName:'#8A8F93', lcdTrack:'#383E43', lcdDisabled:'#3A3F44', lcdWhite:'#FFFFFF', lcdMono:'#6B7075' },
  TRACKS: [ /* §D'deki iki track'in sabit alanları */ ],
  UNSUPPORTED: { /* kontrol id → {tr:`açıklama`, phase:2|3|0} ; 0 = kapsam dışı */ },
  kbVel: 100, kbVelShift: 70
};
P3.bus = { on(type, fn) /*→ off fonksiyonu*/, off(type, fn), emit(type, payload) };   // type '*' tüm olayları (type, payload) ile alır
P3.initState();                    // §D'yi üretir (tracks[i].p = P3.wtp.defaults() — p3-wt-params sonra yüklendiği için tembel doldurulur: P3.store.init çağrısında)
P3.store = {
  S: null,                         // aktif durum (P3.S ile aynı nesne)
  init(S), get(path), set(path, value, opts /*{undo:'etiket', silent:true}*/),
  tx(label, fn), undo(), redo(), canUndo(), canRedo(), clearHistory(),
  snapshot() /*derin kopya*/, restore(snap)
};                                 // set → bus.emit('state', {path, value, prev}); path 'scale.root', 'tracks.0.mute' gibi noktalı
P3.S;                              // P3.store.S için kısa ad (getter değil; init'te atanır)
P3.save = { load() /*→obj*/, get(key), patch(key, value) /*300 ms debounce, try/catch*/, flush(), reset() };   // localStorage 'bk_push3_v1'
P3.t = function (o) {…};           // o string ise aynen; {tr,en} ise dil seçimi (window._i18n?.getLang?.() || localStorage._lang || 'tr')
P3.u = { clamp, mod, lerp, dbToGain, gainToDb, mulberry32, deepClone, rafThrottle(fn), debounce(fn, ms), isIOS(), isMobile(), hasPointerFine() };
P3.panic = function (reason) {…}; // bus.emit('panic', {reason}); dinleyenler: wt, drums, input (basılı pad'leri bırakır), seq (repeat'i durdurur)
// i18n köprüsü: window._i18n.setLang sarmalanır → bus.emit('lang', l)
```

### G2. `p3-scale.js` — saf fonksiyonlar (`sartname-scale-note.md`, `dogrulanmis-scale.md`)
```js
P3.scale = {
  NOTE_NAMES, ROOT_NOTES, LAYOUTS, SCALES /*35*/, GRID /*8 çözünürlük*/, GRID_DEF:3, REPEAT_DEF:5, CLIP_LEN,
  noteName(m), iv(S), n(S), L(S), pcs(S), P(S), posCount(S), R(S), W(S), A(S),
  padNote(S, pos, x, y) /*→ midi | null*/, padClass(S, m) /*'root'|'scale'|'out'|'none'*/,
  defaultPos(S), realign(Sold, Snew, pos), octUp(S, t), octDown(S, t), shiftStep(S, t, d), canUp(S, t), canDown(S, t),
  rangeText(S, t) /*'C1 - C5' popup metni*/,
  drumCell(x, y, t) /*{k:'drum',pad}|{k:'step',step}|{k:'loop',page}|{k:'none'}*/, pageBeats(t), loopPadBeats(t),
  drumBankUp(t), drumBankDown(t), drumBankShift(t, d), drumCanUp(t), drumCanDown(t),
  scaleName(S) /*'D Minor'*/, rootName(S)
};   // S = P3.S.scale, t = track nesnesi. Test vektörleri: sartname-scale-note.md §10
```

### G3. `p3-wt-params.js` (`sartname-ses-motoru.md` §2,§12; `dogrulanmis-wavetable.md`)
```js
P3.wtp = {
  PARAMS,               // [{k,min,max,def,curve:'lin'|'exp'|'time'|'gain'|'int'|'enum'|'bool',unit,mod:0|1|2, en?}] — 104 gerçek + AMP, PITCH
  IDX,                  // k → indeks
  ENUMS,                // Fx, Type, Circ, CircB, Slope, route, Loop, subOct, Shape, Sync, polyIdx, uniMode, SRate, Osc('1','2','S','Mix'), ...
  CATS,                 // ['Temel','Harmonik','Vokal','FM','Sync','Dijital','Gürültü']
  TABLES,               // [{id:0..11, cat, tab, name, phase}]  — §4 tablo listesi
  tableId(cat, tab), tablesOf(cat),
  SOURCES,              // 13 matris kaynağı: ['Amp','Env 2','Env 3','LFO 1','LFO 2','Velocity','Key','PB','Pressure','Mod Wheel','Random','Slide','Note PB']
  BANKS,                // 8 banka: {name, slots(S,tr) → 8 × {k|virtual|null, label}, options(S,tr) → 7 × {label, kind:'toggle'|'switch'|'action', get, set}|null, vis:{type:'wavetable'|'filter'|'env'|'lfo'|null, cols:[a,b]} }
  toNorm(p, v), fromNorm(p, n), step(p, v, turn, steps, fine) /*encoder → yeni değer*/, fmt(p, v) /*LCD metni*/,
  defaults() /*Float32Array*/, DEFAULT_MODS,        // .adv başlangıç matrisi
  PRESETS,              // {id: {name, params:{k:v}, mods:{k:{srcIdx:amt}}}} — 12 preset
  applyPreset(track, id), lfoShape(shape, shaping, phase) /*UI ve worklet ortak formül*/
};
```
`BANKS` Push 3 script'inin banka tanımlarını birebir izler (`dogrulanmis-wavetable.md` §C). Sanal parametreler (Oscillator, Filter, Envelopes, LFO, Env View, Expression Mode, Osc Pitch, Current Mod Target) `S.wtui` üzerinde yaşar ve slot tanımında `virtual:'osc'` vb. ile işaretlenir.

### G4. `p3-device.js`
```js
P3.dev = {
  load() /*→ Promise: fetch SVG → DOMParser nötrleştirme (sartname-mimari §5 + karar A1) → #p3DeviceWrap'e enjekte → #p3Live kur → registry → align*/,
  svg /*enjekte kök*/, live /*#p3Live kök*/,
  CONTROLS,             // id → { id, kind:'btn'|'enc'|'pad'|'strip'|'dpad'|'octpage'|'lcd', svgId, hit:{x,y,w,h}|{cx,cy,r}, label, led:'label'|'bar'|'none', glyphIds:[…] }
  toSvg(clientX, clientY) /*→ {x,y} SVG birimi*/, hitTest(x, y) /*→ id veya {pad:[x,y]}*/, padAt(x, y) /*→ [x,y] 0..7 (y alttan) | null*/,
  controlRect(id) /*→ CSS px rect, katmana göre*/,
  align() /*hotspot katmanı + #p3Live + LCD canvas; ResizeObserver ve visualViewport tetikler*/,
  setView(name /*full|pads|padsStrip|controls*/) /*iki SVG'nin (cihaz + #p3Live) viewBox'ını birlikte değiştirir, sonra align()*/,
  glyph(id) /*#p3Live içindeki klon <g>*/, padEl(i) /*#p3Live pad rect, i = r*8+c üstten*/, bar(id) /*light bar rect*/,
  hotspotEl(id)
};
```
**Görünüm istisnası:** "Cihaz SVG'sine enjeksiyondan sonra dokunma" kuralının tek istisnası `setView()`'dir. Görünüm değişimi seyrek bir kullanıcı eylemidir (mobilde otomatik seçim veya taskbar anahtarı); cihaz SVG'si ile `#p3Live`'ın `viewBox`'ı aynı anda değiştirilir. Filter bu değişimde bir kez yeniden rasterize olur, bu kabul edilir. LCD canvas ve hotspot'lar `align()` ile CTM'den yeniden hizalanır. Etkileşim sırasında (pad, encoder, LED) cihaz SVG'si **asla** değişmez.

### G5. `p3-leds.js`
```js
P3.leds = {
  init(),                // bus dinleyicileri: state, transport, tick, note, overlay, mode
  invalidate(ids /*dizi | '*'*/),
  padColor(x, y) /*→ hex — mevcut moda göre (sartname-scale-note §5)*/,
  controlLed(id) /*→ {m:'off'|'dim'|'on'|'blink'|'pulse', c}*/,
  flash(ids, ms), setTarget(ids) /*öğretici hedef çerçevesi*/, setDisabled(ids) /*gate: soluk*/
};
```
Pad basılıyken yanma (`green`/`red`) `bus('note')` olaylarından tutulur. Blink/pulse fazı transport'tan (durukken 120 BPM iç saat). `prefers-reduced-motion` → blink/pulse yerine sabit `on`.

### G6. `p3-lcd.js` (`sartname-ekran.md`, `dogrulanmis-wavetable.md` §C–D)
```js
P3.lcd = {
  init(canvas), invalidate(),
  popup(text, sub, ms) /*ortada büyük metin; ms varsayılan P3.K.POPUP_MS*/,
  pages: { device, bank, scale, learn, unsupported },   // her biri (ctx, S) → çizer
  summary() /*#p3LcdLive metni*/
};
```
Görselleştirmeler: wavetable (seçili tablonun `disp` verisi, Position çizgisi — veri `P3.wt.tableDisp(id)`), filtre eğrisi (Simper SVF genlik yanıtı analitik), envelope (ADSR+slope), LFO (şekil). 30 fps üstü çizim yok; statikken çizim yok.

### G7. `p3-wt-engine.js`
```js
P3.audio = {
  ctx: null, state: 'off',
  unlock() /*→ Promise; karar A10; kullanıcı etkileşiminde çağrılır*/, init() /*unlock sonrası graf + worklet + tablolar*/,
  master: { mixBus, softClip, main, cue }, setMainDb(db), setCueDb(db), setTrackDb(i, db), setTrackPan(i, v), setTrackMute(i, bool),
  latency() /*→ {base, output}*/, toCtxTime(perfNowMs) /*getOutputTimestamp ile*/, profile /*hq|std|eco*/
};
P3.wt = {
  ensureTrack(i) /*AudioWorkletNode veya fallback*/, setParam(i, k, v), setMod(i, tgtK, srcIdx, amt), applyPreset(i, id),
  noteOn(i, id, midi, vel, at), noteOff(i, id, at), expr(i, id, {bend, slide, press}, at), pb(i, v), mw(i, v),
  setTable(i, osc /*1|2*/, tableId), tableDisp(tableId) /*Float32Array(64*256) | null*/, meter(i) /*{voices,cpu,pos1,pos2}*/,
  panic(), onFallback /*true ise PeriodicWave yolu*/
};
```
Worklet protokolü ve DSP: `sartname-ses-motoru.md` §4–§10 aynen. Tablo üretimi Worker'da (`p3-wt-tables.worker.js`): giriş `{t:'gen', id, profile}`, çıkış `{t:'tdata', id, F, levels:[{len,H,base}], buf, disp}` (Transferable). Dosya ayrıca `self.P3TableGen = { generate(id, profile) }` tanımlar; Worker değilse ana thread fallback bunu kullanır.

### G8. `p3-drums.js`
```js
P3.drums = { load() /*→ Promise; sample'lar + prosedürel sesler*/, trigger(pad, vel, when), choke(pad, when), KIT /*16 slot: {pad, name, kind:'sample'|'synth'|null}*/, hasSound(pad), ready };
```

### G9. `p3-seq.js`
```js
P3.seq = {
  init(), play(), stop(), toggle(), isPlaying(), beatNow() /*ctx zamanından*/, beatToTime(b), timeToBeat(t),
  tap() /*Tap Tempo; 4. dokunuşta play*/, setBpm(bpm), setSwing(pct), metronome(on),
  recPress() /*Record FSM, karar A8*/, recordNote(track, midi, vel, onAtCtx, offAtCtx),
  clip(track, slot) /*→ clip | null*/, ensureClip(track, slot, lenBeats),
  stepToggle(track, stepIndex, pad) /*drum step*/, stepMute(track, stepIndex), deletePadNotes(track, pad), setLoopPage(track, page) ,
  playhead(track) /*→ beat içinde clip konumu*/
};   // emit: 'transport' {playing, rec, bpm}, 'tick' {beat} (rAF'te), 'step' {track, step}
```
Scheduler: 25 ms aralık, 100 ms lookahead (Lab deseni). Clip notaları ve metronom `when` zamanıyla `P3.wt.noteOn/noteOff` ve `P3.drums.trigger`'a planlanır.

### G10. `p3-modes.js`
```js
P3.modes = { init(), reset(), dispatch(ev) /*bus 'in' olayı — gate'ten geçmiş*/, isHeld(id), heldIds() };
```
Buton sınıfları, modifier kombinasyonları, overlay ve encoder yönlendirmesi `sartname-mimari.md` §6 + `sartname-kontrol-haritasi.md` + `dogrulanmis-donanim.md`. Faz 1 kapsamı `§A` ve plan §2. Pad olayı → aktif moda göre: synth track'te 64 Notes (`P3.scale.padNote` → `P3.wt.noteOn` + `bus('note')` + kayıttaysa `P3.seq.recordNote`), drum track'te Loop Selector (`drumCell`).

### G11. `p3-input.js`
```js
P3.input = { init(), setKeyboard(on), releaseAll() };
// Tüm fiziksel girdi → P3.bus.emit('in', ev):
// {k:'btn', id, down:true}  /  {k:'btn', id, down:false, dt}
// {k:'pad', x, y /*0..7, y alttan*/, down:true, vel, src /*'p'+pointerId | 'key:KeyA' | 'midi:60'*/, t /*performance.now*/}  /  {k:'pad', x, y, down:false, src, t}
// {k:'enc', id /*enc1..enc8|volume|swingTempo|jog*/, turn /*normalize: +1 = tam aralık*/, steps /*tamsayı detent*/, fine}
// {k:'enc', id, touch:true|false}   {k:'enc', id, press:true}
// {k:'strip', v /*0..1 alttan*/, down|move|up:true}
// {k:'dpad', dir:'up'|'down'|'left'|'right'|'center', down}   {k:'octpage', dir:'up'|'down'|'left'|'right', down}
```
Encoder: dikey sürükleme 200 px = `turn` 1.0 (ivme `1+min(3,hız/1.5)`, Shift'te ivme yok ve ×0.1), her 24 px bir `steps`; tekerlek çentiği `turn` ±0.01, `steps` ±1; klavye ok ±0.01/±1, PgUp/PgDn ±0.1/±10. Çift tık → `{k:'enc', id, reset:true}`. Fare hover ve klavye odağı = `touch:true`.

### G12. `p3-levels.js`
```js
P3.levels = { start(n /*1|2*/), stop(), onEvent(type, payload), progress() };
```
Seviye 1: 27 görev (mevcut `TASKS`, registry id'lerine bağlanır, metin düzeltmeleri plan §2), ses yok, cihaz pasif (yalnız hotspot tıklaması). Seviye 2: 6 görev emülatör üstünde (`sartname-ogretici.md` §6), toleranslar korunur.

### G13. `p3-tutorial.js`
```js
P3.tut = { start(chapterSlug, stepSlug), stop(), next(), prev(), skip(), toc(), onEvent(type, payload), CURRICULUM, progress() };
```
Adım şeması ve motor: `sartname-ogretici.md` §4, müfredat `§F`. Emülatör API'si öğreticiye `emu` nesnesiyle verilir: `emu.load(presetOrScene)`, `emu.set({path: value})`, `emu.openOverlay(name)`, `emu.select(track)`.

### G14. `p3-app.js`
```js
P3.app = { boot(), route() /*hashchange*/, startMode(m, arg), stopMode(), gate(ev) /*→ bool*/, allow(list) /*öğretici kilidi*/, toast(text), menuRender() };
```
Rotalar `#ogretici[/bolum[/adim]]`, `#seviye-1`, `#seviye-2`, `#serbest`; hash yoksa menü. Ses kilidi mod kartı tıklamasında (`P3.audio.unlock()`), yedek capture dinleyicileri. Taskbar ve `#p3ModeSeg`. `?p3debug=1` → `p3-selftest.js` dinamik yüklenir.

### G15. `p3-selftest.js`
`P3.test = { run() /*→ tablo*/, audio: { render(presetId, notes, sec) } }` — `sartname-dogrulama.md` §1–§2.

---

## H. Dalga 1 sonrası kararlar (Dalga 2 ve 3 bunları izler; §G ile çelişirse H geçerli)

Dalga 1 dosyaları yazıldı ve testleri geçti: `p3-core.js`, `p3-scale.js`, `p3-wt-params.js`, `p3-wt-tables.worker.js`, `p3-wt-worklet.js`, `p3-drums.js`, `p3-device.js`, `ders-push3.html`. Dalga 2 ajanları **gerçek koda** bakar; sözleşme ile kod ayrışırsa kod + bu bölüm geçerlidir.

1. **Shift ince ayarı tek yerde:** `p3-input` `turn` değerini **ölçeklemez** ve Shift'te ivme uygulamaz; yalnız `fine:true` bayrağını gönderir. ×0.1 ölçeği `P3.wtp.step()` (ve Volume/Swing&Tempo için `p3-modes`) uygular. README §G11'deki "Shift ×0.1" ifadesi bu karar ile geçersizdir.
2. **Görselleştirme:** `BANKS[i].vis()` tek nesne döner; Main bankında ikinci görselleştirme `vis.next` alanındadır (`{type:'filter', cols:[3,5]}`). LCD `vis` ve `vis.next`'i çizer.
3. **Preset değişimi undo'ludur:** `P3.store.tx('Preset', …)` içinde `tracks.i.p` (yeni Float32Array), `tracks.i.mods`, `tracks.i.preset` set edilir. Engine `'state'` olayında `tracks.i.p` (bütün dizi) ya da `tracks.i.mods` yolunu görünce o track'in tüm parametre/modülasyonlarını yeniden gönderir; `tracks.i.p.K` (tek eleman) yolunu görünce yalnız o parametreyi.
4. **Aynı perde, iki pad:** Ses kimliği olay `id`'sidir (pad/pointer). Aynı perdeye farklı id ile basmak **ayrı bir ses** açar (Push 3 MPE davranışı); "aynı nota" steal kuralı yalnız aynı id yeniden tetiklendiğinde uygulanır. Note-off id ile. (Worklet'te küçük düzeltme — Dalga 2 engine ajanı.)
5. **Unison pan:** `pan_i = e_i · width` (detune sırasına göre yayılım); dönüşümlü ±|e_i| kaldırılır. (Worklet düzeltmesi — engine ajanı.)
6. **Sub tablosu:** Engine, Worker'dan `'sub'` tablosunu üretip worklet'e `tdata` olarak gönderir; worklet'in iç yedeği yalnız o gelmezse kullanılır.
7. **Master softClip:** Lab'in `makeSoftClipCurve` eğrisi (her seviyede tanh) **kullanılmaz**. Master eğrisi |x|<0.7'de doğrusal, üstünde yumuşak diz (worklet'teki çıkış sınırlayıcısıyla aynı biçim); böylece normal seviyelerde renklendirme olmaz.
8. **Doğrulama ölçütleri güncellendi:** Envelope testi "tepeye 500±10 ms" (doğrusal attack .adv varsayılanı). Efekt aliasing'i (PW/Warp/Fold %100, üst oktavlar) Faz 1'de bilgi amaçlı; Faz 2'de polyBLAMP (PW/Warp) ve 2–4× oversampling (Fold) eklenecek.
9. **Parallel routing'de kapalı filtre** dalı kuru sinyal geçirir: `0.5·(F1(x)+x)` (bypass kuralı). Kalır.
10. **ARIA sahipliği:** `p3-lcd` encoder slider'larının `aria-valuenow/aria-valuetext`'ini (param değerini bilen o) günceller; `p3-leds` toggle düğmelerin `aria-pressed`'ini ve pad hücrelerinin `aria-label`'ını (nota adı + "kök nota"/"gam içi") günceller.
11. **D-pad kimlikleri:** Registry ok başına kimlik kullanır (`dpadUp/dpadDown/dpadLeft/dpadRight/dpadC`) + `GROUPS.dpad`. Input olayı README §G11'deki gibi `{k:'dpad', dir}`; öğretici/seviye hedefleri `'dpad'` grup adını kullanabilir (`P3.dev.expand('dpad')`).
12. **Görünümler:** pads/padsStrip/controls görünümlerinde letterbox kırpılmaz; komşu kontroller görünür ve kullanılabilir kalır.
13. **Main Track (MiscButton):** Faz 1'de LCD popup `Main Track` + alt satır `Not in this simulator`; açıklama `P3.K.UNSUPPORTED.mainTrack`.
14. **Drum track device sayfası (Faz 1, VARSAYIM):** r0 çip `Drum Rack`; görselleştirme alanında 4×4 pad adı ızgarası (seçili pad track renginde, boş pad `—`); encoder slot'ları boş. Seçili pad adı popup'ı Select+pad ile.
15. **Boş drum pad adı** LCD'de `—`.
16. **Taskbar'a `#p3KeysBtn`** (klavye kısayolları katmanı) ve oyun ekranında `.p3-attribution` yanına kısa bağımsızlık notu Dalga 3'te eklenir.
