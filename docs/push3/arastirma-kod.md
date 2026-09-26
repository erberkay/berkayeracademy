# KONU 8: Yerel Kod Haritası (berkayeracademy.com, /Users/berkayer/site)

Hiçbir dosya değiştirilmedi. SVG geometrisi, tarayıcı panelinde `getBBox()` ile canlı ölçüldü. Ölçüm sırasında viewBox yalnızca tarayıcı DOM'unda değişti, dosyaya dokunulmadı.

---
## 0. Özet: kritik bulgular (hesaplanmış görev metnine göre düzeltmeler)

| # | Bulgu | Etki |
|---|---|---|
| 1 | Seviye 1'de **27** görev var, 26 değil (`TASKS.length`=27). HTML'deki statik `1 / 26` ve `26` değerleri eski kalmış, JS bunları çalışma anında 27 ile değiştiriyor. egitim kartı da doğru olarak "27" diyor. | Menüde sayıyı `TASKS.length`'ten okuyun. |
| 2 | Arka plan **çalışma anında kaldırılmıyor**, kaldırma işlemi dosya seviyesinde yapılmış (commit 308a07a): tam kanvas `pattern0` rect'i silindi, viewBox `0 0 2400 2006` iken `161 135 2116 1725` yapıldı. Ayrıca 256 `<filter>` silindi (45e66f9) ve 57 pattern dolgusu `fill="none"` yapıldı (1dd81f2). | Çalışma anında ek bir işlem gerekmiyor. |
| 3 | `getBBox()` tuzakları: `LCD Display` bbox'ı = 553,447,1278,289, çünkü görünmez `Pixels` rect'ini de kapsıyor. Gerçek ekran **581,482,1222,220**. 8 pad'in bbox'ı 169×123'e şişiyor (mavi `Rectangle 12*` overlay'i yüzünden), gerçek pad boyutu **146×108**. | Mevcut LCD overlay'i her yönde yaklaşık 28 birim taşıyor. Emülatörde sabit geometri veya iç rect kullanılmalı. |
| 4 | Birden fazla düğmeyi tek grupta tutan split'ler hatalı: `Tempo` 3 düğme (Tap Tempo / Metronome / Quantize), `RecordControls` 3 düğme (New / Capture / Record), `NoteSettings` 2 düğme (Fixed Length / Automate), `LayoutScale` 2×2 (üstte 2 ikon düğmesi, altta Scale / Layout). | "Quantize" hotspot'u Metronome'u, "New" Capture'ı, "Fixed Length" Automate'i, "Scale/Layout" ise üstlerindeki ikon düğmelerini de kapsıyor. |
| 5 | `mute`/`solo`/`JogControls*` hotspot'ları yalnızca ikon veya etiket bbox'ına bağlı (9×14 ile 56×19 birim arası). | Mobilde birkaç piksellik dokunma hedefi kalıyor. Düğme hücresi kullanılmalı. |
| 6 | Ableton Lab'de **AudioWorklet VAR**: Sidechain dersinde (satır 3908-3970) Blob URL + `audioWorklet.addModule` kullanılıyor, try/catch fallback'i de var. Synth modülü ise worklet'siz, node graph ile çalışıyor. firebase.json'da CSP başlığı yok, dolayısıyla Blob worklet çalışır. | Wavetable için worklet yolu sitede zaten denenmiş durumda. |
| 7 | Lab'in `playNote(freq, dur, vel)` fonksiyonu **sabit süreli** çalışıyor, note-off / gate yok. | Push pad'lerini basılı tutmak için noteOn/noteOff'lu yeni bir voice katmanı gerekli. |
| 8 | Lab'in ana script'i `<script type="module">` (satır 500) içinde. | Fonksiyonlar başka sayfadan çağrılamaz. Kopyalanıp yeni bir düz `<script>` dosyasına (ör. `assets/js/p3-audio.js`, `var`) taşınmalı. |
| 9 | Seviye 2 Swing görevi TopKnobs'u (8 encoder) sürüklüyor. Resmi kılavuza göre Push 3'te Swing/Tempo için ayrı bir encoder var (basınca Swing ve Tempo arasında geçiş yapar, Tempo modunda 1 BPM adımla çalışır). SVG'de bu büyük ihtimalle `Knob_10`. | Pedagojik bir yanlışlık. Emülatörde Swing/Tempo `Knob_10`'a bağlanmalı. |
| 10 | Açık temada `.p3-lcd` zemini sabit `#0a0f0d`, yazı rengi ise `var(--ok)`. Açık temada `--ok` #1a7a40 oluyor, yani koyu zemin üstünde koyu yeşil yazı çıkıyor (kontrast sorunu). | Cihaz içi renkler temadan bağımsız sabit hex olmalı. |
| 11 | Yerel test **mutlaka** `firebase serve` ile yapılmalı (port 8123). Sayfanın `<head>`'indeki redirect `/ders-push3.html` adresini `/ders-push3` yapıyor, basit bir statik sunucuda bu adres 404 döner (cleanUrls yok). | Test ortamı notu. |

---
## 1. ders-push3.html: tam yapı (660 satır, 38.274 bayt)

### 1.1 Dosya iskeleti
| Satır | İçerik |
|---|---|
| 5 | `.html` adresinden temiz URL'ye redirect script'i |
| 6-29 | meta/OG/canonical (`https://berkayeracademy.com/ders-push3`), font, `ui.css?v=202609210030`, `theme-init.js`, `themes.css`, `auth-ui.js`, Firebase app+auth compat 10.12.2 |
| 30-111 | Sayfa `<style>` bloğu (tamamı `.p3-*`) |
| 113-169 | DOM: `#homeLogo`, `#authBar`, `main.p3-game#p3Game`, `#p3Win`, `nav.bottom-nav` (themes.css:44 ile site genelinde gizli) |
| 170 | `i18n.js` |
| 171-218 | Firebase auth ve authBar IIFE'si (ADMIN_EMAIL karşılaştırması) |
| 220-656 | Oyun IIFE'si (düz `<script>`, `var`) |

### 1.2 DOM id'leri
`p3Game` > `.p3-game-taskbar` [geri linki `egitim`, `#p3Progress` (badge accent), `#p3TaskText` (aria-live polite), `#p3HintBtn` (aria-pressed, i-help ikonu)] > `.p3-game-stage` [`#p3DeviceWrap` (role=img, SVG buraya enjekte edilir), `#p3HotspotLayer` (kardeş eleman; içinde `#p3Lcd` > `#p3LcdLabel`/`#p3LcdValue`/`#p3LcdSub`), `.p3-attribution` (Greg Hadala, CC BY 4.0, Figma linki)] > `.p3-game-bottom` [`#p3Feedback` (aria-live assertive), `#p3ExplainPanel` > `#p3ExplainText` + `#p3ContinueBtn`]. `#p3Win` > `.p3-win-card` (h1 "Tebrikler! 🎉", `#p3WinCount`, `#p3RestartBtn`).

### 1.3 CSS sınıfları (.p3-*)
| Sınıf | Kural özeti |
|---|---|
| `.p3-game` | flex column, `height:100dvh`; <1024px'te `calc(100dvh - var(--topbar-h))` (56px) |
| `.p3-game-taskbar` | flex, gap s3, padding s3/s4, border-bottom line, bg surface. ≤600px'te padding 10px/s3 |
| `.p3-game-task` | fs-small 600, ≥600px'te fs-body |
| `.p3-game-stage` | flex:1, center, padding s2/s3, relative, overflow hidden, bg `--bg` |
| `.p3-device-wrap` | **tek filter taşıyıcı**: `filter:drop-shadow(0 16px 34px rgba(0,0,0,.55))`; SVG 100%×100% ve user-select none |
| `.p3-hotspot-layer` | absolute, z2, pointer-events none; px konumu JS ile wrap'a hizalanır |
| `.p3-hotspot` | absolute, pointer-events auto, `touch-action:none`, focus-visible 2px accent outline; `.draggable` → `cursor:ns-resize` |
| `.p3-lcd` (+`.visible`) | bg `#0a0f0d`; opacity 0→1 ve scale .97→1 geçişi, .25s |
| `.p3-lcd-label/-value/-sub` | Space Mono; label 9px (≥900px'te 11px) `--ok`; value `clamp(13px,2.6vw,26px)` 700 `--ok`; sub 8px (≥900px'te 9px) rgba(255,255,255,.4) |
| `.p3-hl` | inset 0, `border-radius:3px` (site kuralı radius 0; cihaz içi istisna), opacity geçişi .18s |
| `.p3-hl.target` | `--ok` %14 tint + inset 2px ring, `p3TargetPulse` 1.8s (opacity .4↔.8) |
| `.p3-hl.correct` | accent %35 + inset 3px, `p3CorrectFlash` .5s (scale 1.06) |
| `.p3-hl.wrong` | bg `--err`, `p3WrongFlash` .35s (±6px sallanma) |
| `.p3-game-feedback` (.ok/.err) | min-height 40px, fs-small, fg-3 |
| `.p3-explain-panel` | `p3PanelIn` .2s (translateY 6px) |
| `.p3-attribution` | 9px mono, sağ alt köşe, opacity .55 |
| `.p3-win*` | fixed overlay, `rgba(0,0,0,.82)`, z `--z-modal` (1000), kart max 380px |

### 1.4 TASKS (Seviye 1, 27 kayıt): satır 228-256; key = `svgId + '__' + index`
| # | svgId | label | split | Gerçek hotspot alanı (SVG birimi) | Doğru mu? |
|---|---|---|---|---|---|
|0|LCD Display|Ekran|, |553,447,1278,289|Şişkin (gerçek 581,482,1222,220)|
|1|Pads|Pad ızgarası|, |578,858,1233,921|Şişkin (çerçeve 585,862,1218,914)|
|2|TopKnobs|Encoder'lar|, |613.3,240.3,1151.3,76.7|Doğru|
|3|Knob_11|Jog Wheel|, |1936.6,480.9,239.4,217.1|Doğru (gölge dahil)|
|4|TouchSlider|Touch Slider|, |426,865,107,907|Doğru|
|5|ButtonBigPlay|Play|, |236,1668,145,99|Doğru|
|6|RecordControls|Record|y, bottom, .57|y 1560.1-1653|Doğru|
|7|RecordControls|New|y, top, .57|y 1437-1560.1|Capture'ı da kapsıyor|
|8|NoteSettings|Fixed Length|, |236,1257,145,117|Automate'i de kapsıyor|
|9|Tempo|Tap Tempo|y, top, .45|y 980-1076.3|Doğru|
|10|Tempo|Quantize|y, bottom, .45|y 1076.3-1194|Metronome'u da kapsıyor|
|11|mute|Mute|, |415.6,784.3,14,13|Yalnızca ikon; hücre 386.5-458.8 × 757.3-823.3|
|12|solo|Solo|, |493.9,783.3,9,14|Yalnızca ikon; hücre 461.8-534|
|13|LayoutScale|Scale|x, left|1953-2057 × 980-1147|Üstteki ızgara ikonlu düğmeyi de kapsıyor|
|14|LayoutScale|Layout|x, right|2057-2161 × 980-1147|Üstteki \|\|\| ikonlu düğmeyi de kapsıyor|
|15-16|RepeatAccent|Repeat / Accent|x, left/right|1953,1209,208,102 (ayırıcı x=2056)|Doğru|
|17-20|LoopingSection|Double Loop / Duplicate / Convert / Delete|quad|1953,1324,208,160 (ayırıcılar x=2056, y=1404)|Doğru|
|21|JogControls|Octave ↑|, |2030.9,1529.2,49.3,37.3|Yalnızca etiket+chevron|
|22|JogControls_2|Octave ↓|, |2030.9,1639,49.3,40.2|Aynı sorun|
|23|JogControls_3|Page ◀|, |1962.9,1593,55.6,19.4|Aynı sorun|
|24|JogControls_4|Page ▶|, |2093,1593,56.4,19.4|Aynı sorun|
|25-26|NoteSelection|Shift / Select|x|1953,1725,208,46 (ayırıcı x=2056)|Doğru|

Her kaydın `task` (TR) ve `explain` (TR) metinleri var. Hepsi tek tırnaklı JS string'i; kesme işaretleri `\'` ile escape edilmiş (CLAUDE.md template literal öneriyor).

### 1.5 SIM_TASKS (Seviye 2, 6 kayıt): satır 290-355
Her kaydın arayüzü: `{hotspotKey, type:'tap'|'press'|'cycle'|'drag'|'toggle', lcdLabel, sub, task, explain, init(s), onTap(s), isDone(s), displayValue(s)}`. Drag türü için ek alanlar: `min, max, sensitivity`.
| # | Kontrol | type | Mantık | Bitiş koşulu |
|---|---|---|---|---|
|1|Tap Tempo|tap|Son ≤5 dokunuşun aralık ortalaması ile BPM=60000/avgMs, clamp 20-999; başlangıç 120|≥3 dokunuş ve \|bpm-128\|≤2|
|2|Octave ↑|press|offset 0 → +1 (en fazla 4)|offset===2|
|3|Scale|cycle|`['C Major','G Major','A Minor','D Minor','E Minor']`|'D Minor'|
|4|TopKnobs|drag|value 50, 0-100, px başına 0.6 (dikey)|\|v-58\|≤2 (pointerup anında)|
|5|Mute|toggle|muted|true|
|6|Record|toggle|recording=true|true|

### 1.6 Fonksiyonlar (satır numaralarıyla)
- `findTaskByLabel(label)` 279
- `rectFor(t)` 357-377: `svgRoot.getElementById(t.svgId).getBBox()`. `split:'x'|'y'` için `frac` kullanır (varsayılan .5), `'quad'` için `half` ('top-left' vb.).
- `svgPointToLayerPct(x,y)` 382-391: `createSVGPoint` → `matrixTransform(svgRoot.getScreenCTM())` → hotspotLayer rect'ine göre yüzde. `preserveAspectRatio` letterbox'ını otomatik hesaba katar.
- `alignHotspotLayer()` 396-403: layer'ın left/top/width/height değerlerini px cinsinden wrap'ın `getBoundingClientRect()`'ine eşitler. `inset:0` kullanılmadı, çünkü stage padding'i yüzünden yanlış kutuya çözülür.
- `positionHotspots()` 405-429: hizalama sonrası her TASK'ın yüzde kutusu hesaplanır, `#p3Lcd` de `TASKS[0]` (LCD) rect'ine oturur.
- `buildHotspots()` 431-464: her TASK için `div.p3-hotspot[tabindex=0][role=button][aria-label]` > `div.p3-hl` oluşturur. Olaylar: click, keydown (Enter/Space), pointerdown (drag için). `resize` sonrası 120ms debounce ile `positionHotspots`. ResizeObserver yok.
- `clearStates` 466, `applyTargetHighlight` 470, `renderTask` 475, `next` 487 (son görevde `startLevel2Intro`), `onHotspotClick` 494 (doğruysa açıklama paneli açılır; yanlışsa "Hayır, o X. Aradığın: Y.").
- `renderLcd` 516, `simSuccess` 522, `onSimClick` 533 (drag hariç), `onSimPointerDown` 542. Global `window` pointermove 551 ve pointerup 558 dinleyicileri.
- `renderSimTask` 565, `nextSim` 581, `startLevel2Intro` 587 (`state.level='transition'`), `showWin` 601, `restart` 608 (her zaman Seviye 1'e döner), `toggleHint` 616.
- `continueBtn` 629: level 1 ise `next()`; 'transition' ise level=2, LCD `.visible`, `renderSimTask()`; aksi halde `nextSim()`.
- Yükleme 642-655: `fetch('assets/img/push3-device.svg')` → `wrap.innerHTML = svgText` → `svgRoot.setAttribute('preserveAspectRatio','xMidYMid meet')` → `buildHotspots(); renderTask();`. Hata olursa feedback'e hata metni yazılır. Fetch URL'inde `?v=` cache-bust yok.
- `state = {idx, advancing, hintsOn:true, level:1|'transition'|2, simIdx, simDone, dragKey, dragStartY, dragStartValue}`.

### 1.7 Performans mimarisi (commit bf82b0c/45e66f9/1dd81f2 mesajlarındaki ölçümler)
- Kural: SVG enjekte edildikten sonra **asla değiştirilmez**. Filter sadece `.p3-device-wrap` üzerinde. Hotspot'lar, vurgular ve LCD kardeş katmanda yer alır ve yalnızca opacity/transform ile animasyon yapar. Gerekçe: filtrelenmiş alt ağaçtaki her DOM değişikliği SVG'nin tamamını render boyutunda yeniden rasterize ettiriyordu (masaüstünde telefondan daha yavaş olmasının sebebi buydu).
- Ölçülen etki (1440px): paint 71→10ms (-%85), GPU raster 677→169ms. Filter silinmesi: main-thread 9750→2448ms. Pattern silinmesi: SVG 567.794→422.326 bayt.
- SVG'nin şu anki durumu: 715 id, 65 radialGradient, 113 linearGradient, 29 clipPath, 38 `mix-blend-mode` (soft-light/hue/plus-lighter), 0 filter, 57 no-op `fill="none" fill-opacity="0.04"` rect (silinebilir), `Pixels` ve `Rectangle 39` soft-light rect'leri fill none.

### 1.8 Emülatöre geçiş: tekrar kullanılabilecekler ve yeniden yazılması gerekenler
| Parça | Karar | Not |
|---|---|---|
| fetch+inject, `preserveAspectRatio` | **Kullan** | Enjeksiyondan önce `DOMParser` ile tek seferlik nötrleştirme eklenmeli (bkz. 2.9). |
| Filter'lı wrap + kardeş etkileşim katmanı | **Kullan (zorunlu)** | Pad LED'leri ve LCD de bu katmanda olmalı. |
| `svgPointToLayerPct`, `alignHotspotLayer` | **Kullan** | Genelleştir: `placeRect(el, {x,y,w,h})`. |
| `rectFor` + split modeli | **Yeniden yaz** | TASKS'a bağımlı. Kontrol registry'si gerekli (bkz. 2.2); ölçüler sabit koordinattan veya iç rect'ten alınmalı. |
| `positionHotspots` | **Uyarla** | Registry üzerinde dönmeli; ResizeObserver(wrap) eklenmeli. |
| `.p3-hl` sınıfları ve keyframe'ler | **Kullan** | Öğretici modunda hedef, doğru ve yanlış geri bildirimi. |
| Taskbar, explain paneli, feedback, win modal, hint toggle | **Kullan** | Öğretici adım motoru buraya oturur. |
| SIM_TASKS kalıbı (init/onTap/isDone/displayValue) | **Kavram olarak kullan** | Öğretici adımları gerçek emülatör state'ini dinlemeli (`isDone(emuState)`). |
| click tabanlı giriş | **Yeniden yaz** | Pad/düğme için pointerdown/up ayrı, çoklu dokunma (`setPointerCapture` per pointerId), velocity (Y veya `pressure`), uzun basma (Shift/Select kombinasyonları). |
| `state.level` (1/'transition'/2) ve `restart()` | **Yeniden yaz** | Mod yönlendirici: Menü → {Seviye 1, Seviye 2, Öğretici, Serbest Çalış}. Deep link için `location.hash` (#mod=...). |
| `#p3Lcd` (3 satır metin) | **Yeniden yaz** | 8 sütunlu LCD renderer (canvas önerilir), opak #101010 zemin ile Figma'nın hazır Wavetable ekranını örter. |
| Encoder drag (dikey, 0.6/px) | **Uyarla** | 8 encoder ayrı, göreli (delta), Shift ile ince ayar, dokunma (touch) olayı, klavye erişimi. |
| Ses | **Yok → yeni** | Lab'den kopyalanıp gate'li motora dönüştürülmeli (bkz. §3). |
| i18n | **Yok → yeni** | Oyun metinlerinin hepsi sabit TR. |

---
## 2. assets/img/push3-device.svg haritası
Genel: `width=2116 height=1725 viewBox="161 135 2116 1725"`, oran 1.2267. Kök `<g id="Ableton Push 3">` > `Body` (rect 200,167, 2000×1671.66, rx16, linear+radial gradyan). Metinlerin hepsi path'e dönüştürülmüş (font yok). id'lerde boşluk var ("LCD Display"): `getElementById` çalışır; `querySelector` için `[id="LCD Display"]` gerekir. `icon/play`, `1/32t` gibi id'lerde `/` var.

### 2.1 Kontrol geometri tablosu (SVG birimi; x,y,w,h)
| Figma id | Anlam (kaynak) | Geometri | İç bölme |
|---|---|---|---|
| Knob..Knob_8 (grup TopKnobs) | 8 parametre encoder'ı | yüz (Frame 11_n) x=613.3/768.1/923.4/1080.3/1232.8/1390.3/1546.1/1697.7; y=240.3; ≈66×66 | merkezler cx≈646.8/801.0/956.3/1113.2/1265.8/1423.2/1579.0/1731.1, cy=273.2, r≈33. Gölge (Frame 12_n) +8 birim aşağıda |
| Knob_9 | **Volume encoder** (resmi: "to the left of Push's display") | yüz 236,525, Ø122 → c(297,586) r61 | |
| Knob_10 | Swing/Tempo encoder (**çıkarım**, konumdan) | yüz 255.7,865, Ø80.7 → c(296.1,905.4) r40.3 | |
| Knob_11 | Jog wheel | yüz 1967.3,480.9, Ø208.6 → c(2071.6,585.2) r104.3 | bbox gölge dahil 1936.6,480.9,239.4,217.1 |
| SelectionButton..._8 | Ekran üstü 8 düğme | x=590+153·i, y=360, 136×66, rx8 | LED `light..light_8`: x=604+153·i, y=403, 108×6, rx2 |
| SelectionButton_9..._16 | Ekran altı 8 düğme | x=590+153·i, y=757, 136×66 | LED `light_9..16`: y=774 |
| LCD Display | Ekran | **iç rect 581,482,1222,220, rx6, #101010** | bbox 553,447,1278,289 (Pixels dahil) |
| PadButton…PadButton_64 | 64 pad | formül §2.2 | |
| SideButton..._8 | Sağdaki 8 sahne (scene) / repeat-rate düğmesi | x=1852, y=869+115·i, 62×98, rx4 | play ikonu `icon/play_n`; `icon/play_4` yeşil #46DD43 (yanık görünüyor) |
| SessionSettings (sol üst) | 4 ikon düğmesi | 236,360.3,298,66 | hücreler x: [236-308.3] file, [311.3-383.5] settings, [386.5-458.8] tutorial, [461.8-534] stamp |
| SessionSettings_2 (sağ üst) | 4 ikon düğmesi | 1852,360.3,298,66 | [1852-1924.3] track, [1927.3-1999.5] mixer, [2002.5-2074.8] player, [2077.8-2150] layout |
| SessionSettings_3 (sol 2. sıra) | 4 ikon düğmesi | 236,757.3,298,66 | lock, sqaure, mute (M), solo (S); aynı x hücreleri |
| TextButton_2 | **Undo** (glif "Save_2" id'li ama görünen metin Undo) | 468,482,66,66 | |
| TextButton | **Save** | 468,636,66,66 | |
| IconButton (`add`) | **Add** (resmi: Add, ekranın sağında) | 1852,481,66,66 | |
| IconButton_2 (`replace`) | **Swap** (resmi: Hot-Swap) | 1852,636,66,66 | |
| MiscButton | Alt düğme sırasının sağındaki tek düğme (anlamı doğrulanamadı) | 1852,757,62,66 | LED `light_17` 1866,774,34,6 (beyaz glow) |
| Frame 35 | **Session D-pad** + orta düğme (resmi: "Session D-pad... center button") | 1952,757,209,208 | orta düğme 2021,825,71,71 (nokta c 2056.5,860.5); oklar ↑(2047-2067,782-792) ↓(931-941) ←(1977-1987,851-871) →(2126-2136) |
| LayoutScale | 2×2 | 1953,980,208,167 | üst satır y 980-1083: sol `icon-big-pads` (ızgara ikonu), sağ `icon-big-tracks` (\|\|\|); alt satır y 1086-1147: Scale / Layout; dikey ayırıcı x=2056 |
| RepeatAccent | Repeat / Accent | 1953,1209,208,102 | x=2056 |
| LoopingSection | Double Loop / Duplicate / Convert / Delete | 1953,1324,208,160 | x=2056, y=1404 |
| Frame 34 | Octave ↑↓ / Page ◀▶ (X şeklinde köşegen ayırıcılar) | 1953,1499,208,208, merkez (2057,1603) | 4 üçgen bölge; Page etiketleri sönük #383E43 |
| NoteSelection | Shift / Select | 1953,1725,208,46 | x=2056 |
| Tempo | Tap Tempo / Metronome (○● ikonu, Figma adı yanlış olarak `icon/quantize`) / Quantize | 236,980,145,214 | y: 980-1076 / 1079-1135.5 / 1138.5-1194 |
| NoteSettings | Fixed Length / Automate (kırmızı #E12020 + glow) | 236,1257,145,117 | y: 1257-1314 / 1317-1374 |
| RecordControls | New / Capture (`icon-big-focus`) / Record (#FA325E) | 236,1437,145,216 | y: 1437-1495 / 1498-1560 / 1563-1653 |
| ButtonBigPlay | Play (#0BC049) | 236,1668,145,99 | |
| TouchSlider | Touch strip | 426,865,107,907 | LED şeridi `Frame 32` 511,884,8×866 rx4; gösterge `Group 8` c(526.5,1315.5) r6.5, şeridin tam ortasında |

Üçgen D-pad hit-test formülü (Frame 34): `dx=x-2057, dy=y-1603; |dy|>|dx| ? (dy<0?OctUp:OctDown) : (dx<0?PageL:PageR)`. Frame 35 için önce orta kare testi (2021-2092 × 825-896), ardından merkez (2056.5,861) etrafında aynı test.

### 2.2 Pad ızgarası
- Sıralama: **satır öncelikli; soldan sağa, yukarıdan aşağıya.** `PadButton` = sol üst, `PadButton_8` = sağ üst, `PadButton_57` = sol alt, `PadButton_64` = sağ alt.
- id: `i` (0-63) için `i===0 ? 'PadButton' : 'PadButton_'+(i+1)`; `r=floor(i/8)` (0 = üst), `c=i%8`.
- Formül: `x=589+152·c, y=866+114·r, w=146, h=108, rx=5`. Aralık (gap) 6 birim. Çerçeve rect 585,862,1218,914 rx9 #605D65; kenar stroke gradyanı paint148 (#2F2D2D→#6A6868).
- İlk pad 589,866,146,108 (bbox 578,858,169,123, şişkin). Son pad 1653,1664,146,108 (bbox 1642,1656,169,123, şişkin).
- Push not/koordinat notu: Push'un not düzeninde köken sol alttır. SVG satırı `r` iken donanım satırı `7-r` olur (kullanıcı MIDI modunda pad notası 36+(7-r)·8+c; bu eşleme web araştırmasıyla doğrulanmalı).
- Dolgu: her pad `fill=url(#paintN_radial)` kullanıyor, merkez (x+73,y+54), `rotate(90) scale(71 95.98)`. İki stop seti var: A = #EFECEC(0) #E3E0E0(.07) #E1DFDF(.22) #D0CED4(.34) #BCB9C4(.46) #797792(.96); B = #EFECEC(0) #E3E0E0(.23) #CBC7D6(.46) #9391A9(.96). Görünüm: sönük, süt beyazı silikon.
- Figma'daki "yanık" pad'ler: clip-path grubunda `Rectangle 12…Rectangle 12_8` soft-light overlay'i var (169×123, #0E8CD3, pad'in -11/-8 ofsetinde). Pad sırası (1 tabanlı): **1, 11, 21, 31, 34, 44, 54, 64**.

### 2.3 LED ve renk durumları (Figma'da hazır çizili)
- Selection LED'leri: sönük = `#414548` + gradyan paint23 (#323A3F→#45474C→#3C4145). light_2 ve light_10 beyaz glow'lu (`Group 1`, `Group 1_2` elips #DBEAEB/#CEDEEB, hue ve plus-lighter blend). light_3/11 yeşil #168A31, light_4/12 turuncu #D87635, light_5/13 mavi #0088DE, light_6/14 mor #9C62CA (glow grupları `Group 2..5`, `Group 2_2..5_2`). light_7/8/15/16 sönük.
- Diğer sabit renkler: düğme gövdesi #272124, stroke #161B20 (grup stroke'u #24292E), knob yüzü #27262D, knob gölgesi #0C0A0A, etiket #D4E2E4, sönük etiket veya ikon #383E43, LCD etiket grisi #60666B, LCD vurgu #0088DE, LCD track renkleri #0088DE / #D87635 / #1ABE40 / #B670EE.

### 2.4 SideButton etiketleri (Figma'da çizilen, glif analizi ve render ile doğrulandı)
Yukarıdan aşağıya: `1/32t, 1/32t, 1/16t, 1/16, 1/8t, 1/8, 1/4, 1/4t`. Bütün path id'leri "1/32t_n" olsa da görünen metinler farklı. 2. düğme "1/32" olmalıydı; 7 ve 8 yer değiştirmiş görünüyor, yani **muhtemelen Figma hatası**. Gerçek sıra resmi kaynaktan doğrulanmalı. Emülatörde etiketler SVG'den değil, veri tablosundan overlay olarak çizilmeli.

### 2.5 LCD Display içeriği (Figma'nın çizdiği Wavetable ekranı)
Sol üstte mavi çip (595,493, 134×22, #0088DE) ve siyah "Wavetable" yazısı. 8 sütun; etiket x≈604, 758, 913, 1067, 1221, 1375, 1520, 1670, yani yaklaşık 153 birim adımla encoder'lara hizalı. Parametreler: Oscillator (1 2 S Mix Mix Mix), Table (Squarely Str…), Position 51 %, Filter Type (ikonlar), Frequency 4.0 kHz, Resonance 0.0 %, Mod Time 26 % (dairesel gösterge), Mod Time 68 %. Grafikler: sütun 1-3 wavetable dalga eğrisi (`Graph`), sütun 4-6 filtre eğrisi (`Frame 37`). Alt satır (y 668-690, `Buttons` > `DisplayLabel_2..9`): Wavetable (mavi), ⊙ Pads (seçili çip), Wavetable (turuncu), Wavetable (yeşil), Vocal (yeşil), FX (mor), MoogPhatty (yeşil), Drum Machine (turuncu). LCD oranı 1222:220 = 5.55:1.

### 2.6 Pad/LED renklendirme stratejisi (performans kurallarına uygun)
1. **SVG'yi çalışma anında boyamayın.** Filter'lı wrap içindeki her fill değişikliği tam yeniden rasterize tetikler; 38 blend-mode maliyeti de buna eklenir.
2. **Tek seferlik nötrleştirme**: SVG metni `DOMParser` ile ayrıştırılır, DOM'a eklenmeden önce şunlar yapılır: `Rectangle 12*` (8 adet) silinir; `light_2..6` ve `light_10..14` içinde renkli rect → #414548 yapılır ve glow grupları (`Group 1..5`, `Group 1_2..5_2`) silinir; `Ellipse 1_11` (MiscButton glow) silinir; `icon/play_4` stroke'u #383E43 yapılır; `Label_4` (Automate) #D4E2E4 yapılır ve `Ellipse 1_12` silinir; `LCD Display` içinde ilk rect dışındaki çocuklar gizlenir; `Pixels` rect'i silinir (LCD bbox'ı da düzelir); 57 no-op rect silinir. Bunun maliyeti tek bir rasterize.
3. **Dinamik ışıklar overlay katmanında**: 64 pad için pad çerçevesi boyunda bir `<canvas>` (DPR ölçekli; yalnızca state değişince rAF ile tek çizim) veya 64 div (background-color + opacity). Selection LED'leri için 16 ince div (108×6), SideButton için 8 div, touch strip için 1 canvas. Site CSS kuralı gereği gradyan yok; ışıma istenirse canvas içinde çizilmeli.
4. Hotspot'lar pad başına ayrı (64 adet); geometri formülden hesaplanır, getBBox kullanılmaz.

### 2.7 Mobil ölçek uyarısı
375px'lik telefonda cihaz genişliği yaklaşık 351px, ölçek 0.166 olur. Bu durumda pad yaklaşık 24×18 px, SelectionButton yaklaşık 23×11 px, Mute hücresi yaklaşık 12×11 px. Dar ekranda "yakınlaştırılmış pad görünümü" veya viewBox kırpma modu önerilir. Hotspot yüzde hesabı viewBox değişse bile getScreenCTM sayesinde çalışır.

---
## 3. ableton-lab.html: tekrar kullanılabilir ses motoru (5048 satır; ana script `<script type="module">` satır 500)

### 3.1 Synth sinyal zinciri (`getSynthCtx` 810-888)
```
voice(osc×unison → gain → StereoPanner) → envGain → synthInput(Gain 1.0)
 → driveShaper(WaveShaper, oversample 2x, tanh(k·x)/tanh(k), k=1+9·drive; drive=0 → curve null)
 → filterNode(Biquad) [→ filterNode2(Biquad) if slope 24] → analyser(fft 4096)
 → masterAmp(Gain 1) ┬→ dry(Gain 1) ─────────────┐
                     ├→ Delay(max 2s) ⟲ fb(Gain) → delayWet ─┤→ masterBus → softClip(tanh, 1024pt, 2x) → destination
                     └→ Convolver(IR: 2s, stereo noise·(1-i/n)^3) → reverbWet ┘
LFO: Oscillator(rate) → lfoCutG(×5000Hz)→both filter.frequency; lfoVolG(×0.5)→masterAmp.gain; lfoPitchG(×100 cent)→her osc.detune
```
### 3.2 Parça parça tekrar kullanım kararı
| Satır | Parça | Karar |
|---|---|---|
|652-681|`state` varsayılanları: adsr {a .01, d .15, s .7, r .25}; volume .3; filter {cutoff 8000, res 1, lowpass, slope 12, drive 0}; osc1 {sine, unison 3, uniDetune 8, uniWidth .5}; osc2 {enabled false, saw, detune 7, mix .5}; sub .4; noise .2; lfo {rate 5}; modEnv {a .01, d .25, s .3, r .25}; fx {delaySync '1/8', fb .3, wet 0, reverb 0}; bpm 125; swing 0|Referans|
|705-710|`makeNoiseBuffer` (1s mono)|Kopyala|
|713-724|`makeReverbIR(ctx,2,3)`|Kopyala (Push Reverb/Hybrid sadeleştirmesi için)|
|728-743|`DELAY_DIVS` {'1/2':2,'1/4':1,'1/4.':1.5,'1/8':.5,'1/8.':.75,'1/8T':1/3,'1/16':.25,'1/32':.125} + `currentDelaySeconds` (≤1.95s)|Kopyala|
|747-771|`makeDriveCurve`, `makeSoftClipCurve`|Kopyala (master soft-clip)|
|776-798|`syncFilterNodes`, `applyFilterSlope` (12/24 dB kaskad; 2. kademe Q=0, BP/Notch'ta 1)|Kopyala; Wavetable filtre tipleri için genişlet|
|803-808|`applyLfoAmounts`|Kavram|
|893-1050|`playNote(freq,dur,vel)`: ADSR (linear attack/decay, exponential release→0.0001), mono mod 20ms fade, sustain pedalı (release≥5s), filter env (peakCut=base+amt·(18000-base)), glide (exponential), pitch mod env (cent), `spawnUnison` (n≤8, konum -1..1, det=detune+pos·spread, seviye mix/√n, uçlar ×0.85, pan=pos·width), sub (square, -1 oktav), noise|**Yeniden yaz**: gate'li `noteOn(midi,vel)`/`noteOff(id)` API'si, release'in anlık değerden başlaması (`cancelAndHoldAtTime` veya `setTargetAtTime`), polifoni sınırı ve voice stealing, osc kaynağı OscillatorNode yerine wavetable|
|1055-1185|Beat motoru: `BEAT_TRACKS` (5 sample), `getBeatCtx`, `synthDrum` (sample yoksa prosedürel kick/snare/hat/bass), `scheduleStep` (swing: tek 16'lıklar `(swing/100)·(60/bpm/4)·0.66` gecikir), `beatSchedulerLoop` (setTimeout 20ms, lookahead 0.12s), `startBeat`/`stopBeat` (generation sayacı)|**Kopyala**: Push sequencer, clip çalma ve metronom için temel. Görsel step için setTimeout yerine rAF + zaman kuyruğu önerilir|
|1198-1265|`startOsc` (osiloskop/spektrum, canvas)|LCD'de dalga önizlemesi için kavram|
|1271-1338|`makeSlider` (pointer + klavye + aria)|Erişilebilir encoder için kalıp|
|1343-1389|`SYNTH_PRESETS` (11 adet: pad, lead, bass, pluck, bell, organ, supersaw, wobble, strings, acid, ambient)|Yapı referansı; Wavetable preset şeması ayrı olmalı|
|1395-1445|`applyPreset(p)`: eksik alanları nötr varsayılanlarla doldurur, eski {target,depth} LFO formatını çevirir|Kalıp olarak kullan|
|575-607|Firestore `users/{uid}/presets` (save/load/delete); kural: sadece sahibi okur/yazar (firestore.rules:26-28)|Push presetleri de buraya `type:'push3-wavetable'` ile yazılabilir (yeni koleksiyon kural gerektirir)|
|1711-1727|`_C4_HZ=261.63`, `getCurrentNotes`|MIDI→Hz için `440·2^((m-69)/12)` tercih edin (2643'teki formül)|
|2734-2761|Klavye: A S D F G H J K; Shift → vel .45, CapsLock → 1.0, varsayılan .75; Space = sustain|Emülatöre bilgisayar klavyesi haritası için referans|
|3908-3970|**AudioWorklet** (Blob URL → `audioWorklet.addModule`, `c._scWorkletReady` bayrağı, try/catch fallback)|Wavetable osilatör worklet'i için hazır kalıp|

### 3.3 Eksikler ve riskler
- `createPeriodicWave` sitede hiç kullanılmıyor. Wavetable (frame interpolasyonu ve Position mod'u) için ya PeriodicWave frame seti ile crossfade ya da AudioWorklet gerekli.
- `state.pitchBend`/`modWheel` tanımlı (674) ama **hiçbir yerde kullanılmıyor**. Touch strip için yeni.
- LFO 'sample-hold' seçeneği sine'a düşüyor (gerçek S&H yok).
- Her modülün kendi AudioContext'i var (synth, beat, eq, arr, demo, dly, lim, chain). Emülatörde **tek paylaşılan AudioContext** kullanılmalı (Safari'nin context limiti).
- `makeReverbIR` rastgele üretiliyor (deterministik değil).

### 3.4 Ses dosyaları (assets/audio)
| Dosya | Format | Süre | Boyut | Lab'de kullanım |
|---|---|---|---|---|
|Kick.wav|float32 stereo 48k|~0.36s|138 KB|BEAT_TRACKS, sidechain, compressor demo|
|Snare.wav|float32 stereo 48k|~1.32s|510 KB|BEAT_TRACKS|
|Close Hat.wav|float32 stereo 48k|~0.73s|282 KB|BEAT_TRACKS, arrangement|
|Open Hat (1).wav|PCM24 stereo 44.1k|~1.0s|265 KB|BEAT_TRACKS|
|bass.wav|float32 stereo 48k|~0.12s|48 KB|BEAT_TRACKS, arrangement|
|Lead.wav|float32 stereo 48k|~0.12s|48 KB|(listelenmiş; Lab'de referans bulunamadı)|
|Lead 1.wav|PCM24 stereo 44.1k|~34.8s|9.2 MB|EQ test tonu (3212)|
|Lead Loop.wav|PCM24 stereo 44.1k|~30.7s|8.1 MB|delay/limiter/reverb demoları, mastering|
|Pad Loop.wav|PCM24 stereo 44.1k|~7.7s|2.0 MB|arrangement, mastering|
|bildirim sesi.wav|float32 stereo 48k|~1.39s|536 KB|bildirim|
Drum Rack için ilk 5 sample yeterli (toplam ~1.25 MB). Büyük loop'lar Push emülatörü için gereksiz.

---
## 4. egitim.html, i18n.js, tema
- **egitim.html 886-901**: `<a href="ders-push3" class="module module-featured">`; `ÜCRETSİZ` badge (`eg_mod_free`); `eg_modpush3_tag` "OYUN"/"GAME"; `eg_modpush3_title` "Ableton Push 3'ü Tanı"/"Meet Ableton Push 3"; `eg_modpush3_level` "İnteraktif Alıştırma"/"Interactive Exercise"; `eg_modpush3_t1` "27 gerçek kontrolü tek tek keşfet"; `eg_modpush3_t2` "Göreve göre doğru düğmeye dokun, anında öğren"; `eg_modpush3_t3` "Cihaz görseli gerçek Figma tasarımından"; `eg_modpush3_btn` "Oyunu Aç →"/"Open the Game →". Stil: style.css:161 `.module-featured {border-left:2px solid var(--gold)}`. Emülatör eklenince kart metni güncellenmeli (ör. "Oyun + Öğretici + Online Push 3").
- **i18n.js 288-294**: yukarıdaki 7 `eg_modpush3_*` anahtarı. ders-push3 için oyun anahtarı **yok**; sayfada yalnızca bottom-nav `data-i18n` kullanıyor. Mekanizma: `T[key]={tr,en}`, `localStorage['_lang']`, `window._i18n.t(key)` (bulamazsa key'i döner), `apply()` yalnızca `[data-i18n]`, `[data-i18n-html]` ve `[data-i18n-ph]` elemanlarını günceller; `setLang` bir **event yayınlamıyor**. JS ile üretilen metinler dil değişince güncellenmez, sayfa kendi yeniden render'ını tetiklemeli (ör. `setLang`'ı sarmalamak). Yeni anahtar önerisi: `p3_*` öneki.
- **Tema**: `theme-init.js` `localStorage['site-theme']` ('dark' varsayılan) değerine göre boyamadan önce `html.theme-light` ekliyor. ders-push3 CSS'i token kullanıyor, dolayısıyla kabuk renkleri tema ile değişiyor. Cihaz SVG'si sabit koyu kalıyor. `.p3-lcd` zemini sabit ama yazısı `var(--ok)`; açık temada kontrast bozuluyor (bkz. §0-10). ≥1024px'te themes.css:77 `body{padding-left:calc(var(--nav-w)+16px)!important}` ile sayfanın `padding:0` değerini eziyor (masaüstünde 236px sol boşluk); <1024px'te topbar 56px.

## 5. Yerel sunucu
- `/Users/berkayer/site/.claude/launch.json`: `{name:"firebase-hosting", runtimeExecutable:"firebase", runtimeArgs:["serve","--only","hosting","--port","8123"], port:8123}`.
- `.claude/settings.local.json`: yalnızca bir grep izni.
- firebase.json: `public:"."`, `cleanUrls:true`, `**` → `/index.html` rewrite, başlıklar nosniff / Referrer-Policy / Permissions-Policy (camera, microphone ve geolocation kapalı) / X-Frame-Options SAMEORIGIN. **CSP yok.** `Permissions-Policy` mikrofon kapalı, ama Web MIDI izni listede yok, yani kısıtlanmıyor.
- Kökte package.json yok (yalnızca functions/ altında var); build adımı yok.

## 6. Kod tabanından çıkan emülatör iskeleti önerisi
1. `assets/js/p3-audio.js` (düz script, `var`): tek AudioContext, Lab'den kopyalanan FX/soft-clip, gate'li voice, worklet'li wavetable osilatörü (fallback: PeriodicWave).
2. `assets/js/p3-device.js`: SVG yükleme + nötrleştirme, kontrol registry'si (§2.1 tablosu veri olarak), hit-test, overlay katmanları (hotspot, LED canvas, LCD canvas).
3. ders-push3.html: mod menüsü (`.seg`/`.card` bileşenleri), mevcut Seviye 1/2 kodu registry'ye taşınır, öğretici adım motoru emülatör olaylarını dinler (`emu.on('pad', …)`).
4. i18n: `p3_*` anahtarları ve dil değişince yeniden render.


## BULGULAR
- [kod/yuksek] Seviye 1'deki TASKS dizisinde 27 görev var (satır 228-256). HTML'deki '1 / 26' ve '26' değerleri eski kalmış statik metin; JS winCountEl'e TASKS.length (27) yazıyor. (/Users/berkayer/site/ders-push3.html)
- [kod/yuksek] SVG fetch edilip wrap.innerHTML ile enjekte ediliyor ve preserveAspectRatio='xMidYMid meet' ayarlanıyor (satır 642-655). Arka plan çalışma anında kaldırılmıyor; commit 308a07a'da pattern0 zemin rect'i silinmiş ve viewBox 161 135 2116 1725'e sıkıştırılmış. (/Users/berkayer/site/ders-push3.html)
- [kod/yuksek] Performans mimarisi: filter yalnızca .p3-device-wrap üzerinde; hotspot'lar kardeş HTML katmanında ve yalnızca opacity/transform ile animasyon yapıyor. SVG'deki 256 filter ve 57 pattern dolgusu dosyadan silinmiş (commit 45e66f9, 1dd81f2, bf82b0c). (/Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] 'LCD Display' getBBox değeri 553,447,1278,289, çünkü fill=none olan 'Pixels' rect'ini kapsıyor. Görünen ekran rect'i 581,482,1222,220 rx6 #101010. (/Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] Pad'ler satır öncelikli: PadButton sol üst, PadButton_64 sağ alt. Formül x=589+152c, y=866+114r, 146x108 rx5. 8 pad'in (1,11,21,31,34,44,54,64) bbox'ı soft-light 'Rectangle 12*' overlay'i yüzünden 169x123'e şişiyor. (/Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] SelectionButton 1-8: x=590+153i, y=360, 136x66; 9-16: y=757. LED bar light_n 108x6 (üst sırada y=403, alt sırada y=774). Renkli LED'ler: #168A31, #D87635, #0088DE, #9C62CA; sönük LED #414548. (/Users/berkayer/site/assets/img/push3-device.svg)
- [kod/orta] SideButton 1-8: x=1852, y=869+115i, 62x98. Figma'da çizilen etiketler yukarıdan aşağıya 1/32t, 1/32t, 1/16t, 1/16, 1/8t, 1/8, 1/4, 1/4t (tutarsız, muhtemelen Figma hatası). (/Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] Tempo grubu 3 düğme içeriyor (Tap Tempo / Metronome ikonu / Quantize), RecordControls 3 (New / Capture / Record), NoteSettings 2 (Fixed Length / Automate), LayoutScale 2x2 (üstte iki ikon düğmesi, altta Scale/Layout). Mevcut split'ler bu yüzden komşu düğmeleri de kapsıyor. (/Users/berkayer/site/ders-push3.html)
- [kod/yuksek] Mute/Solo hotspot'ları yalnızca ikon bbox'ına bağlı (14x13, 9x14); JogControls hotspot'ları yalnızca etiket+chevron bbox'ına bağlı. Gerçek dokunma alanları çok daha büyük hücreler ve üçgenler. (/Users/berkayer/site/assets/img/push3-device.svg)
- [resmi/yuksek] Push 3'te Volume encoder ekranın solunda yer alıyor; SVG'de bu Knob_9 (c 297,586, r61). (https://www.ableton.com/en/push/manual/)
- [resmi/orta] Push 3'te ayrı bir Swing ve Tempo encoder'ı var: basınca Swing ile Tempo arasında geçiş yapıyor, Tempo modunda 1 BPM adımla çalışıyor. SVG'deki karşılığı büyük ihtimalle Knob_10 (konumdan çıkarım). Seviye 2 Swing görevi bunun yerine TopKnobs'u kullanıyor. (https://www.ableton.com/en/push/manual/)
- [resmi/orta] Add düğmesi ekranın sağında (Browse Mode), Swap düğmesi Hot-Swap Mode'a giriyor; Session D-pad'in orta düğmesi var. SVG karşılıkları: IconButton (+), IconButton_2 (replace), Frame 35. (https://www.ableton.com/en/push/manual/)
- [kod/yuksek] Ableton Lab synth zinciri: synthInput → tanh drive (2x oversample) → 1-2 Biquad (12/24dB) → analyser → masterAmp → dry + delay (feedback) + convolver reverb → masterBus → tanh soft-clip → destination (getSynthCtx, satır 810-888). (/Users/berkayer/site/ableton-lab.html)
- [kod/yuksek] playNote(freq, dur, velocity) sabit süreli çalışıyor ve note-off desteği yok (satır 893-1050); Push pad'lerini basılı tutmak için gate'li yeni bir voice API'si gerekli. (/Users/berkayer/site/ableton-lab.html)
- [kod/yuksek] Ableton Lab'de AudioWorklet kullanılıyor: sidechain processor Blob URL üzerinden audioWorklet.addModule ile yükleniyor ve try/catch fallback'i var (satır 3908-3970). 'AudioWorklet YOK' ifadesi yalnızca synth modülü için doğru. (/Users/berkayer/site/ableton-lab.html)
- [kod/yuksek] Lab'in ana script'i <script type="module"> içinde (satır 500); fonksiyonlar başka sayfadan erişilebilir değil, kopyalanıp paylaşılan düz bir JS dosyasına taşınmaları gerekiyor. (/Users/berkayer/site/ableton-lab.html)
- [kod/yuksek] Beat motoru lookahead scheduler kullanıyor (setTimeout 20ms, lookahead 0.12s); swing tek 16'lıkları (swing/100)*(60/bpm/4)*0.66 kadar geciktiriyor; sample yoksa synthDrum prosedürel fallback'i devreye giriyor (satır 1055-1185). (/Users/berkayer/site/ableton-lab.html)
- [kod/yuksek] createPeriodicWave sitede hiç kullanılmıyor; state.pitchBend/modWheel tanımlı ama kullanılmıyor; LFO 'sample-hold' seçeneği sine'a düşüyor. (/Users/berkayer/site/ableton-lab.html)
- [kod/yuksek] Ses dosyaları: Kick, Snare, Close Hat, bass ve Lead float32 stereo 48kHz; Open Hat, Lead 1, Lead Loop ve Pad Loop PCM24 stereo 44.1kHz. Lead Loop yaklaşık 30.7s / 8.1MB, Lead 1 yaklaşık 34.8s / 9.2MB. (/Users/berkayer/site/assets/audio)
- [kod/yuksek] egitim.html satır 886-901'deki Push 3 kartı ders-push3'e bağlanıyor ve eg_modpush3_* i18n anahtarlarını kullanıyor (i18n.js satır 288-294). ders-push3'ün oyun metinleri için i18n anahtarı yok. (/Users/berkayer/site/egitim.html)
- [kod/yuksek] i18n.js setLang yalnızca data-i18n özelliği taşıyan elemanları güncelliyor ve event yayınlamıyor; JS ile üretilen metinler dil değişiminde otomatik güncellenmiyor. (/Users/berkayer/site/assets/js/i18n.js)
- [kod/yuksek] Açık temada --ok değeri #1a7a40 oluyor; .p3-lcd zemini ise sabit #0a0f0d. Sonuç olarak LCD'de koyu zemin üstünde koyu yeşil yazı çıkıyor (kontrast sorunu). (/Users/berkayer/site/assets/css/ui.css)
- [kod/yuksek] Yerel sunucu ayarı: .claude/launch.json → firebase serve --only hosting --port 8123. firebase.json'da cleanUrls true ve CSP başlığı yok. (/Users/berkayer/site/.claude/launch.json)
- [kod/yuksek] Firestore users/{uid}/presets koleksiyonu yalnızca sahibine okuma/yazma izni veriyor; yeni bir alt koleksiyon için ayrı kural eklemek gerekir. (/Users/berkayer/site/firestore.rules)
- [cikarim/orta] SVG dinamik renklendirme için çalışma anında değiştirilmemeli; Figma'da hazır çizili yanık durumlar yükleme anında tek seferlik nötrleştirilmeli, dinamik ışıklar ise kardeş overlay katmanında (canvas veya div) çizilmeli. (/Users/berkayer/site/ders-push3.html)

## BELIRSIZ
- Figma ikon düğmelerinin resmi Push 3 adları doğrulanamadı: file (Sets olabilir), settings (Setup), tutorial (ampul), stamp (kişi/User?), track (yay ikonu, Device?), mixer (Mix), player (Clip), layout (|||, Session?), lock, sqaure (Stop Clip?), icon-big-pads ve icon-big-tracks (Note/Session?), MiscButton (Master?). Resmi kılavuzdaki konum diyagramıyla karşılaştırılmalı.
- Knob_10'un Swing/Tempo encoder olduğu yalnızca konumdan çıkarıldı; kılavuzda bu encoder'ın varlığı geçiyor ama çekilen metinde konumu yoktu.
- Scene/repeat-rate düğmelerinin gerçek sırası (yukarıdan aşağıya 1/32t, 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4 mü?) doğrulanamadı; Figma çizimi tutarsız.
- Frame 35'in (4 ok ve orta düğme) Session D-pad olduğu kılavuzdaki 'Session D-pad ... center button' ifadesine dayanan bir eşleştirme; Frame 34'teki Octave/Page üçgenlerinin gerçek donanımda ayrı düğmeler olup olmadığı doğrulanmadı.
- Push 3 ekran çözünürlüğü (Push 2 için bilinen 960x160) bu inceleme kapsamında doğrulanmadı; Figma LCD oranı 5.55:1, 960x160 ise 6:1.
- Push pad MIDI not eşlemesi (sol alt = 36) ve Note modundaki düzen web araştırmasıyla teyit edilmeli.
- Lead.wav dosyasının Lab'de doğrudan kullanıldığına dair bir referans bulunamadı (grep'te yalnızca 'Lead 1.wav' ve 'Lead Loop.wav' çıktı).
- Açık temada cihaz sayfasının kabuğunun da açık olması isteniyor mu, yoksa emülatör sayfası tema bağımsız koyu mu kalmalı? Bu bir ürün kararı.