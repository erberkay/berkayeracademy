Koordinatlar SVG birimindedir (viewBox 161 135 2116 1725). Hit bölgesi separator orta çizgilerinden ölçüldü, getBBox kullanılmıyor.

LED modları:
- `off` = `#2E3236`
- `dim` = `#7C858A` (etiket) / renk ×0.4 (light bar)
- `on` = `#FFFFFF` veya renk
- `blink` = 1 vuruş periyot, %50 duty
- `pulse` = 2 vuruş periyot, sinüs

Animasyon transport fazından türetilir. Transport durukken 120 BPM iç saat kullanılır.

Klavye kısayolları yalnız sahne odaktayken ve "Klavyeyle çal" açıkken çalışır (WCAG 2.1.4).

## Sol üst ve sol ikinci sıra
| id | SVG · hit (x,y,w,h) | İşlev | LED | Klavye |
|---|---|---|---|---|
| `sets` | `TransparentButton`/`file` · 236,360.3,73.75,66 | F1 popup `Not in this simulator`; F3 snapshot listesi | dim | — |
| `setup` | `_2`/`settings` · 309.75,360.3,75.25,66 | F3 Setup ekranı (F1 popup) | açıkken on, değilse dim | — |
| `learn` | `_3`/`tutorial` · 385,360.3,75.25,66 | Learn sayfası: bölüm listesi, upper = başlat | overlay açıkken on, değilse dim | — |
| `user` | `_4`/`stamp` · 460.25,360.3,73.75,66 | popup (User Mode yok) | off | — |
| `lock` | `lock` · 236,757.3,73.75,66 | F2: Lock + Stop/Mute/Solo | kilitliyken blink | — |
| `stopClip` | `sqaure` · 309.75,757.3,75.25,66 | tek başına: seçili track'i durdur. Shift: tümünü durdur. + alt düğme (F2) | dim; basılıyken on | — |
| `mute` | `mute` · 385,757.3,75.25,66 | tek başına: seçili track mute. + drum pad / step / alt düğme | track mute ise on, değilse dim | — |
| `solo` | `solo` · 460.25,757.3,73.75,66 | tek başına: solo (exclusive). + pad / alt düğme | on / dim | — |
| `undo` | `TextButton_2` · 468,482,66,66 | Undo. Shift+Undo = Redo | yığın doluysa dim, boşsa off (VARSAYIM) | Ctrl/⌘+Z, Ctrl/⌘+Shift+Z |
| `save` | `TextButton` · 468,636,66,66 | Serbest mod snapshot'ını kaydeder, popup `Saved` | dim | Ctrl/⌘+S |
| `volume` | `Knob_9` · c(297,586) r61, hit r70 | çevir: hedefin dB'i ±1 (Shift ±0.1), −inf…+6. dokun: popup. bas: Main → Headphones → Main Track → Cue | — | odakta ↑/↓ |

## Ekran çevresi
| id | SVG · hit | İşlev | LED | Klavye |
|---|---|---|---|---|
| `upper1..8` | `SelectionButton…_8` · x=590+153(k−1), y=360, 136×66 | LCD r0 bağlamı | light bar 604+153(k−1),403,108×6 (kurallar aşağıda) | — |
| `lower1..8` | `SelectionButton_9…_16` · y=757 | LCD r7 bağlamı | light bar y=774 | — |
| `enc1..8` | `Knob…Knob_8` · cx 646.8/801.0/956.3/1113.2/1265.8/1423.2/1579.0/1731.1, cy 273.2, r33; hit 150×120 | LCD sütun k parametresi; dokunma = touched | yok (halka LCD'de) | odakta ↑/↓, PgUp/PgDn, Home/End |
| `mainTrack` | `MiscButton` · 1852,757,62,66 | Main track'i seçer (VARSAYIM); F2 Mix'te master | light_17 · 1866,774,34,6, dim | — |
| `add` | `IconButton` · 1852,481,66,66 | F3 Browse; F1 popup | dim | — |
| `swap` | `IconButton_2` · 1852,636,66,66 | F2 Hot-Swap preset listesi (jog ile) | açıkken on, değilse dim | — |
| `device` | `track` · 1852,360.3,73.75,66 | view = device | on / dim | — |
| `mix` | `mixer` · 1925.75,360.3,75.25,66 | F2 Mix (her basış Global ⇄ Track) | on / dim | — |
| `clip` | `player` · 2001,360.3,75.25,66 | F3 Clip | on / dim | — |
| `sessionScreen` | `layout` · 2076.25,360.3,73.75,66 | F2 Session Screen | on / dim | — |
| `jog` | `Knob_11` · c(2071.6,585.2) r104.3 | çevir: 15°'de bir adımla liste/bank/preset gezinme. bas: seç. yatay fırlatma (>20 px, <200 ms): sola = geri, sağa = bağlam | — | — |

## Sol sütun
| id | SVG · hit | İşlev | LED | Klavye |
|---|---|---|---|---|
| `swingTempo` | `Knob_10` · c(296.1,905.4) r40.3, hit r55 | Tempo modu: ±1 BPM (Shift ±0.1), 20–999. Swing modu: ±%1, 0–100. bas: Tempo ⇄ Swing. dokun: 400 ms sonra popup | — | — |
| `tapTempo` | `Tempo` üst · 236,980,145,97.5 | son 4 aralığın ortalaması; 2 sn boşluk sıfırlar; 4. dokunuşta çalma başlar | dim; basılıyken on | `Slash` |
| `metronome` | `IconTransparentButton` · 236,1077.5,145,59.5 | kısa bas: toggle. ≥300 ms: menü (F2) | açıksa beyaz pulse, kapalıysa dim | — |
| `quantize` | `TextTransparentButton_2` · 236,1137,145,57 | kısa bas: seçili clip'i quantize eder (F2). basılı: menü. + drum pad | dim | — |
| `fixedLength` | `NoteSettings` üst · 236,1257,145,58.5 | toggle. basılı: menü (F2) | açıksa on, değilse dim | — |
| `automate` | alt · 236,1315.5,145,58.5 | F3 | açıksa `#E12020`, kapalıysa beyaz dim | — |
| `new` | `RecordControls` · 236,1437,145,59.5 | F2 | dim | — |
| `capture` | · 236,1496.5,145,65 | F2 | dim | — |
| `record` | · 236,1561.5,145,91.5 | Record FSM idle→rec→play→overdub ⇄ play | idle: `#FA325E`×0.3; countin: blink; rec/overdub: `#FA325E` on | `Enter` |
| `play` | `ButtonBigPlay` · 236,1668,145,99 | Play / Stop | çalıyorsa `#0BC049`, duruyorsa beyaz dim | `Space` |
| `strip` | `TouchSlider` · 426,865,107,907 (iz 511,884,8,866) | Melodik: PB (bırakınca 30 ms'de 0'a döner) veya Mod (yerinde kalır). Select + dokunma: PB ⇄ Mod. Shift + kaydırma: 1/8 yükseklikte 1 oktav. Drum: bank (Shift ile 4'er) | nokta r6.5 `#FFFFFF`, konumu gösterir | — |

## Pad'ler
| id | SVG · hit | İşlev | LED | Klavye |
|---|---|---|---|---|
| `pad x,y` | `PadButton…_64` · i=0..63, r=floor(i/8) (üstten), c=i%8; rect 589+152c, 866+114r, 146×108 rx5; x=c, y=7−r | moda göre (bkz. scaleNoteMantigi) | pad canvas | Düzen A: 4 klavye sırası (aşağıda) |

## Sağ sütun
| id | SVG · hit | İşlev | LED | Klavye |
|---|---|---|---|---|
| `scene1..8` | `SideButton…_8` · 1852, 869+115(k−1), 62×98 | Note: grid çözünürlüğü (drum/sequencer) veya Repeat açıksa rate. Session: sahne başlatır (F2) | Repeat açık: seçili rate `#46DD43`, diğerleri dim. Repeat kapalı: seçili grid beyaz, diğerleri dim. Etiketler canvas'ta: 1/32t, 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4 | — |
| `dpad` | `Frame 35` · 1952,757,209,208. Merkez kare 2021,825,71,71 → `dpadC`. Dışı: c(2056.5,861) etrafında `|dy|>|dx| ? up/down : left/right` | Scale menüsü: ↑ −1, ↓ +1, ← −4, → +4. F2 Session: 1 track/sahne kaydırır; merkez = scene launch | kullanılabilirse dim, uçtaysa off | — |
| `note` | `TransparentBigButton`/`icon-big-pads` · 1953,980,104.5,104.5 | pad = note. Session'dayken basılı = geçici | pad note ise on | — |
| `session` | `_2`/`icon-big-tracks` · 2057.5,980,103.5,104.5 | F2 Session Pad Mode | on / dim | — |
| `scale` | `TextTransparentButton_11` · 1953,1084.5,104.5,62.5 | Scale overlay. Kısa bas: aç/kapa. ≥300 ms: momentary | açıkken on, değilse dim | `Digit9` |
| `layout` | `_12` · 2057.5,1084.5,103.5,62.5 | F1: tek düzen + popup. F2: döngü, basılı tutma, Shift ile kilit | kilitliyken blink, değilse dim | `Digit0` |
| `repeat` | `RepeatAccent` sol · 1953,1209,104.5,102 | F2 latchMom | açıksa pulse | `Period` |
| `accent` | sağ · 2057.5,1209,103.5,102 | latchMom; açıkken velocity 127 | açıksa on | `Backquote` |
| `doubleLoop` | `LoopingSection` · 1953,1324,104.5,81.5 | F2 | dim | — |
| `duplicate` | · 2057.5,1324,103.5,81.5 | F2 modifier | dim; basılıyken on | — |
| `convert` | · 1953,1405.5,104.5,78.5 | popup (yok) | off | — |
| `delete` | · 2057.5,1405.5,103.5,78.5 | modifier; tek başına: seçili clip'i siler (undo'lu) | dim; basılıyken on | `Backspace` (basılı) |
| `octaveUp` / `octaveDown` / `pageLeft` / `pageRight` | `Frame 34` · 1953,1499,208,208, c(2057,1603): `|dy|>|dx| ? (dy<0 ? up : down) : (dx<0 ? left : right)` | Octave: scale position; drum bank ±16. Shift: ±1 (drum ±4). Page: sequencer sayfası | Octave: gidilecek yer varsa on, yoksa off. Page: kullanılabilirse dim, değilse off | ↑ ↓ ← → (odak slider'da değilken) |
| `shift` | `NoteSelection` sol · 1953,1725,104.5,46 | modifier | basılıyken on, değilse dim | `ShiftLeft` / `ShiftRight` |
| `select` | sağ · 2057.5,1725,103.5,46 | modifier | basılıyken on, değilse dim | `Backslash` (basılı) |

## upper / lower light bar kuralları
- **Device zincir görünümü:**
  - upper1 beyaz; upper2–8 off.
  - lower: track rengi ×0.5; seçili track beyaz; boş sütun off.
- **Bank görünümü:**
  - upper1 beyaz.
  - Option: açıksa beyaz, kapalıysa dim; boş slot off.
  - lower: seçili sekme beyaz, diğerleri track rengi ×0.5.
- **Scale menüsü:**
  - Kök düğmeleri: seçili beyaz, diğerleri dim.
  - lower1 beyaz; lower8: Fixed açıksa beyaz, kapalıysa dim.
  - upper1 ve upper8 off.

## Ek klavye kısayolları
- `Escape`: panic + overlay'i kapatır.
- `Minus` / `Equal`: velocity ±20.
- `BracketLeft` / `BracketRight`: Düzen A penceresini bir satır kaydırır.
- `Shift+Slash`: tuş etiketi katmanını açar/kapatır.

**Düzen A (Pad Izgarası, varsayılan).** Pencere ofseti w = 0..4. Klavye sırası → pad satırı:
| Klavye sırası | Pad satırı |
|---|---|
| `Digit1..8` | y=w+3 |
| `KeyQ..KeyI` | y=w+2 |
| `KeyA..KeyK` | y=w+1 |
| `KeyZ..Comma` | y=w |

**Düzen B (Piyano, F2).** Live Computer MIDI Keyboard düzeni:
- `KeyA` = C3 (60) … `Quote`.
- `W E T Y U O P` siyah tuşlar.
- `Z/X` oktav, `C/V` velocity ±20.

Ortak kısayollar iki düzende de serbest tuşlara yerleştirildi, çakışma yok.