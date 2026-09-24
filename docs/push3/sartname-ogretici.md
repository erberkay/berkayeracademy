## 1. Mod seçim menüsü
- **DOM:** `<section class="p3-modes" id="p3Modes" aria-labelledby="p3ModesTitle">`, `main.p3-game`'den önce gelir. Hash boşken görünür; o sırada `.p3-game` `hidden` olur. SVG arka planda yüklenmeye devam eder.
- **İçerik:**
  - h1 `.h2`: `Push 3 Laboratuvarı`
  - Lead: `Push 3'ü satın almadan, tarayıcında gerçeğine sadık bir kopyasıyla öğren ve çal. Kulaklık önerilir.`
  - 4 adet `button.card.p3-mode-card[data-mode]`
  - `İlerlemeyi sıfırla` (`.btn btn-ghost btn-sm`), onay `.modal` ile alınır.
  - `← Eğitime dön` linki (`egitim`).
- **CSS (yalnız token):**
  - `.p3-mode-grid`: ≥900px'te 2×2; 600–899px'te 2 sütun; <600px'te tek sütun. `gap: var(--s4)`.
  - Kart: üstte `.badge`, başlık `var(--ff-disp) var(--fs-h3)`, 2 satır açıklama `var(--fg-2)`, meta satırı `var(--ff-mono) var(--fs-micro)`.
  - İlerleme çubuğu: 4px yüksek, zemin `var(--line)`, dolgu `var(--accent)`. Genişlik inline `style="width:NN%"` (runtime durumu).
  - `:hover` ve odakta kenar `var(--accent)`. Radius 0.
- **Kartlar** (metinler template literal içinde):
  | data-mode | Rozet | Başlık | Açıklama | Meta | CTA durumları |
  |---|---|---|---|---|---|
  | `tutorial` | ÖNERİLEN | Öğretici | Push 3'ü sıfırdan adım adım öğren: nota çalmaktan Wavetable ile ses tasarımına, davul programlamaktan kayda. | `11 bölüm · 69 adım · ~60 dk` (F1'de `7 bölüm · 47 adım`) | `Başla` / `Devam et · Bölüm 4: Dizilim` / `Tamamlandı ✓ · Tekrar göz at` |
  | `level1` | OYUN | Seviye 1 · Kontrolü Bul | Push 3'ün gerçek kontrollerini cihazın üstünde tek tek bul, her birinin ne işe yaradığını öğren. | `${TASKS.length} kontrol · ~5 dk` | `Başla` / `Devam et · 12/27` / `En iyi süre 2:14 · Tekrar oyna` |
  | `level2` | GÖREV | Seviye 2 · Görevler | Tempoyu dokunarak ayarla, oktav değiştir, gamı seç, swing ver, track sustur, kayda başla. | `6 görev · ~5 dk` | `Başla` / `Devam et · 3/6` / `Tamamlandı ✓` |
  | `free` | EMÜLATÖR | Serbest Çal | Kural yok, ipucu yok. Wavetable synth ve davul setiyle Push 3'ü gerçek bir cihaz gibi çal. Learn düğmesi seni derslere götürür. | `Tüm kontroller açık` | `Aç` |
  - İlk ziyarette Öğretici kartında şu satır görünür: `İlk kez mi? Buradan başla.`

## 2. Router ve mod yaşam döngüsü (`P3.app`)
- **Rotalar:** `#ogretici`, `#ogretici/<bolum>`, `#ogretici/<bolum>/<adim>`, `#seviye-1`, `#seviye-2`, `#serbest`. Hash yoksa menü açılır. `hashchange` dinlenir; tarayıcıdaki Geri menüye döner. Mevcut redirect `location.hash`'i koruduğu için derin linkler çalışır.
- **Kart tıklaması** (kullanıcı etkileşimi; ses kilidi burada açılır):
  1. `initAudio()` çalışır: önce `navigator.audioSession.type='playback'` (özellik tespitiyle), ardından `new AudioContext({latencyHint:'interactive'})` ve `resume()`.
  2. `location.hash` ayarlanır.
- **`startMode(m)`:** `P3.modes.reset()` → `allNotesOff()` → transport durdurulur → modun setup'ı çalışır → taskbar şablonu uygulanır → `P3.save.lastMode = m`.
- **`stopMode()`:** panic + ilerleme kaydedilir.
- **Ses kilidi yedeği:** `pointerup`, `touchend`, `mousedown`, `keydown` ve `click` olaylarına `{capture:true}` ile `resume()`. Dokunmatik `pointerdown` kullanılmaz.
- **Taskbar:**
  - Solda `← Modlar` düğmesi (hash temizlenir).
  - ≥900px'te 4'lü `.seg` mod anahtarı.
  - `#p3Progress`, `#p3TaskText`, `#p3HintBtn` mevcut haliyle kalır.
  - Serbest modda ek olarak: preset `<select class="select">`, `Klavyeyle çal` (`role=switch`), `?` (tuş katmanı), F2'de `MIDI Bağlan`, mobilde görünüm anahtarı.

## 3. İlerleme kaydı: `localStorage['bk_push3_v1']`
- Yazma 300 ms debounce ve `try/catch` ile yapılır; gizli modda sessizce yutulur.
- Menü rozetleri `storage` olayıyla güncellenir.
```js
{ v:1, lastMode:'tutorial', lastVisit:0,
  tutorial:{ cv:1, current:{ch:'dizilim', st:'oktav-yukari'}, steps:{'scale/kok-d':{done:t}, 'padler/velocity':{skipped:t}}, chapters:{padler:{done:t, skipped:1}}, completedAt:null, badge:false },
  level1:{ idx:12, completedAt:null, bestMs:null, startedAt:0 }, level2:{ idx:3, completedAt:null },
  free:{ snapshot:null /* track presetleri, parametreler, clip'ler, scale; ≤50 KB */ }, settings:{ hints:true, kb:'grid', view:'auto' } }
```
- Anahtarlar `bolum/adim` slug biçimindedir, indeks kullanılmaz; müfredat değişince eski kayıt bozulmaz.
- `migrate()`: bilinmeyen anahtarlar atlanır. `cv` artarsa `current` en yakın sonraki geçerli adıma taşınır.
- Menüdeki yüzdeler: Öğretici `(done+skipped)/toplam`, Seviye 1 `idx/TASKS.length`, Seviye 2 `idx/6`.

## 4. Öğretici motoru (`P3.tut`)
**Adım şeması**
```js
var P3_TUTORIAL = { id:'push3-ogretici', version:1, chapters:[
 { id:'scale', phase:1, title:{tr:`Scale ve Kök Nota`, en:`Scale and Key`}, estMin:5,
   setup:function(emu){ emu.load('tutorial-base'); emu.set({'scale.root':0,'scale.idx':0,'scale.inKey':true,'scale.fixed':false,'scale.layoutIdx':0,'pad':'note','sel.track':0}); },
   steps:[ { id:'kok-d', kind:'action',                    // 'action' otomatik ilerler | 'concept' Devam ister | 'free' Bitirdim ister
     title:{tr:`Kök notayı D yap`}, body:{tr:`Üst ve alt display düğmeleri 12 kök notayı gösterir…`},
     do:{tr:`Ekranın üstündeki sırada "D" yazan düğmeye bas.`}, listen:{tr:`Track renginde (mavi) yananlar artık D.`},
     targets:['upper4'], allow:['upper*','lower*','enc*','dpad*','scale','pads'],
     stepSetup:function(emu){ emu.openOverlay('scale'); },
     check:function(S, rt){ return S.scale.root === 2; },
     success:{tr:`Tamam, kök nota D.`}, hints:[{tr:`Üst sıra: C, G, D, A, E, B.`}], optional:false, phase:1 } ] } ] };
```
**Çalışma zamanı**
- Adıma girişte sırayla: `stepSetup` → `rt = {base: deepClone(S), notes: [] (son 32), held: Set, presses: [] (son 16), repeatHits: {}, flags: {}, t0}`.
- Değerlendirme: her `bus` olayında (`in`, `state`, `note`, `transport`) rAF ile en fazla karede bir `check(S, rt)` çalışır.
- Yardımcılar: `seq(arr)`, `moved(path, amt)`, `pcsHeld()`, `after(evType)`.
- **Birim test kuralı:** her adım için `check(setupState)` **false** olmalı (`p3-selftest.js`).

**Kilit (`P3.app.gate`)**
- `allow` dışındaki kontroller: hotspot `opacity:.35` ve `aria-disabled="true"`, LED'leri off.
- Kilitli kontrole basılınca olay yutulur ve `#p3Feedback`'e 2 sn şu yazılır: `Bu adımda ${hedefAdı} ile ilgileniyoruz.`
- `play`, `volume` ve Escape (panic) her zaman izinlidir.

**İpucu kademeleri**
1. 8 sn hareketsizlik veya 2 yanlış kontrol → `hints[0]` gösterilir.
2. 20 sn veya 4 yanlış → hedef vurgulanır:
   - Hotspot: `.p3-hl.target`.
   - Pad: canvas'ta 2 birimlik beyaz çerçeve, 1.2 sn periyotla pulse.
   - LCD sütunu: 1px beyaz dikdörtgen.
   - `prefers-reduced-motion` açıksa animasyonsuz çerçeve.
- `#p3HintBtn` "ipucu hep açık" durumuna geçer.

**Başarı ve gezinme**
- Başarıda: hedefte 400 ms `.p3-hl.correct` + `success` metni. `action` adımı 1200 ms sonra otomatik ilerler; `concept` adımında `#p3ContinueBtn` odaklanır; `free` adımında `Bitirdim →` düğmesi koşul sağlanınca etkinleşir.
- Alt panelde: `title` (h3), `body`, `listen`, `‹ Geri`, `Atla` (ghost, `skipped` olarak kaydedilir), `İçindekiler` (sağdan açılan `.modal-lg` panel: bölüm, `3/6`, ✓), `Serbest Çal'da aç` (ses ve set korunarak `#serbest`'e geçer).
- Bölüm geçişi: içindekilerden her bölüme atlanabilir. Her girişte bölümün `setup()`'ı çalışır.
- **Coach balonu** (`#p3Coach`, opsiyonel): hedefin CTM konumuna demirlenir, metni `do`, `Kapat` düğmesi var.
- **Learn düğmesi:** `S.overlay = 'learn'` → LCD Learn sayfası. Upper düğmesi `#ogretici/<id>` rotasını açar.
- **Bitiş:** son adımda mevcut `#p3Win` kartı yeniden kullanılır: `Push 3 Öğretici ✓`, `Serbest Çal'a geç`.

## 5. Müfredat
Emülatör çıkarımları öğreticiye yansıtılır. "İ" = ileri, atlanabilir adım.

| Bölüm | Faz | Adımlar | Not / düzeltme |
|---|---|---|---|
| 0 `baslarken` | 1 | ses-ac, volume-dokun, volume-cevir (≥3 dB), encoder-ekran, learn | 0.2'de popup `Main Output: -10.0 dB` |
| 1 `padler` | 1 | note-modu, ilk-nota (36), kok-renk (3 kök pad), saga-gam (36…48), yukari-dortlu (36→41), ilk-akor (majör üçlü), velocity (İ) | kök rengi **track rengi (mavi)**, altın değil |
| 2 `scale` | 1 | scale-ac, kok-d (`upper4`), minor-sec (enc/D-pad), d-minor-cal, chromatic (ara bayrak), fixed | — |
| 3 `dizilim` | 1 | 3rds, sequential, 4ths-geri, oktav-yukari, oktav-asagi (−2), pitch-bend (|pb| ≥ 0.5) | sequential kontrolü: `(0,1).note − (0,0).note === 12`; kök tekrar etse de etmese de doğru çalışır |
| 4 `osilator` | 1 | device, position (≥0.30), table, osc2 (`enc1` = 2, `upper2` Osc), oscillators-bank (`upper1` → `lower2`), detune (enc5), effect (enc6 Classic, enc7 ≥0.2), sub (S, `upper2` Sub, enc2 ≥0.5) | — |
| 5 `filtre-env` | 1 | cutoff (oran ≥4), resonance, filter-type (Filters bank, enc3 HP), envelopes-bank (`lower5`), attack (enc3 ≥0.5 s), release (enc6 ≥1 s), pluck (A ≤10 ms, D ≤300 ms, S ≤ %1), lfo-matrix (İ, F2: enc5'e dokun → `upper8` → enc7 ≠ 0) | — |
| 6 `drum` | 1 | drum-track (`lower2`), kick-cal (0,0), kick-4 {0,4,8,12}, snare (2,0) {4,12}, select-hat (Select + (2,1), selPad 6, ses yok), hat-8 (≥6), step-mute, delete-pad, 16-velocities (İ, F2) | pad 0/2/6/10 = Kick/Snare/CH/OH |
| 7 `repeat-accent` | 2 | repeat-ac, repeat-hat (≥6 vuruş, rate 1/8), rate-1-8t (**scene5**; sıra yukarıdan 1/32t…1/4), accent (vel 127), accent-momentary, swing (Knob_10, 60 ±1) | önceki taslaktaki rate sırası ters verilmişti, düzeltildi |
| 8 `kayit` | 2 | metronome, tap-tempo (4 dokunuş → playing), fixed-length (1 Bar), kayit (≥4 nota), overdub (+2), undo (İ), quantize, capture | — |
| 9 `session` | 2 | session-pad, clip-baslat, clip-durdur, scene (`scene2`), note-gecici (İ) | — |
| 10 `final` | 2 | proje (free): ≥3 drum sesi + ≥8 notalı melodi, ikisi birlikte çalıyor | — |

- Toplam 69 adım. Faz 1'de Bölüm 0–6 (47 adım; 5.8 ve 6.9 gizli).
- Setup başlangıç durumu `tutorial-base`:
  - 120 BPM, 4/4, swing 0.
  - Track 0 Wavetable (`init`), track 1 Drums (`p3kit`).
  - C Major, In Key, 4ths, pos 21.
  - Repeat rate 1/8, Fixed Length 2 Bars, Volume −10 dB, view device.

## 6. Seviye 1 ve Seviye 2 (`P3.levels`)
**Seviye 1**
- 27 görev (`TASKS`) kontrol id'lerine bağlanır: Ekran → `lcd` (581,482,1222,220); Pad ızgarası → `pads`; Encoder'lar → `enc*`; Touch Strip → `strip`; Record/New, Tap/Quantize, Scale/Layout → registry bölgeleri; Mute/Solo → hücreleri; Octave/Page → çapraz hit-test.
- Metin düzeltmeleri (araştırmadaki doğru ifadelerle):
  - "Touch Slider" → "Touch Strip".
  - Layout: pad düzenleri arasında geçiş. 4ths/3rds/Sequential Scale menüsündedir.
  - Quantize bir işlemdir (toggle değil); otomatik hizalama için Rec. Quantize kullanılır.
  - Double Loop materyali **ve** loop uzunluğunu ikiye katlar.
  - Duplicate workflow'a bağlıdır; sayfa kopyalama Duplicate + loop pad ile yapılır.
  - Convert: Simpler/Drum Rack/audio dönüşümleri.
  - New: clip'i durdurur ve boş slot hazırlar.
- Seviye 1 **pasiftir**: ses ve modlar çalışmaz, yalnız bulma oyunu. Sayaçlar `TASKS.length`'ten okunur. Bitince menüye döner; `Seviye 2'ye geç` CTA'sı gösterilir.

**Seviye 2** (gerçek emülatörde, `kind:'action'` adımları, kilit yok)
1. Tap Tempo 128 ±2 (gerçek tap; 4. dokunuşta çalma başlar).
2. Octave +2: `pos === base + 2L`.
3. Scale → `upper4` → encoder ile Minor: `root===2 && idx===1`.
4. Knob_10'a bas (Swing modu), sonra çevir: `swing` 58 ±1.
5. Track 2'yi sustur (Mute + `lower2`, ya da track'i seçip Mute): `tracks[1].mute`.
6. Record: `rec ∈ {countin, rec}`.

LCD gerçek sayfaları gösterir; eski `.p3-lcd` overlay'i kaldırılır.

## 7. egitim.html kartı
- `eg_modpush3_title`: `Push 3 Laboratuvarı`
- `eg_modpush3_t1`: `Öğretici + oyunlar + online Push 3`
- `eg_modpush3_t2`: `Wavetable synth ve davulla gerçek gibi çal`
- `eg_modpush3_btn`: `Laboratuvarı Aç →`
- EN karşılıkları da eklenir.