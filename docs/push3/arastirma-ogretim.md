# Push 3 Öğretici: Uygulamaya Hazır Spesifikasyon (Konu 9)

Hedef dosya: `/Users/berkayer/site/ders-push3.html` (bugün ~660 satır: Seviye 1'de 27 kontrol, Seviye 2'de 6 görev var; Seviye 1 bitince Seviye 2'ye kendiliğinden geçiyor; localStorage hiç kullanılmıyor).
Cihaz çizimi: `/Users/berkayer/site/assets/img/push3-device.svg`.

Kaynak türlerinin kısaltmaları:
- **[M]**: Push 3 Reference Manual (PDF 2025-08-20 ve ableton.com/en/push/manual)
- **[L12]**: Live 12 kılavuzu
- **[RN]**: Push with Live 12 sürüm notları
- **[P2S]**: Live 12.4 MIDI Remote Scripts, Push2/pushbase. Resmî olmayan decompile kopyası; Push 2 için geçerli. Push 3'e uyduğu çıkarımdır.
- **[LS]**: learningsynths.ableton.com lesson.json
- **[LM]**: learningmusic.ableton.com

---

## 0. Kararların özeti

1. Sayfanın açılış görünümü bir **mod seçim menüsü** olur. 4 kart var: Öğretici / Seviye 1 · Kontrolü Bul / Seviye 2 · Görevler / Serbest Çal · Emülatör. Hiçbir mod kilitli değil, hepsi doğrudan seçilebilir. İlk kez gelen öğrenciye "Önerilen: Öğretici" rozeti gösterilir.
2. Öğretici **11 bölüm, 69 adımdan** oluşur. Bunların 64'ü çekirdek, 5'i "İleri" etiketli ve atlanabilir. Süre yaklaşık 50–60 dk, her bölüm 3–8 dk.
3. Pedagojik model Ableton Learning Synths'ten alınır [LS]. Her sayfa sırayla şunları içerir: başlık, 1–3 cümle kavram, vurgulu "Yap:" talimatı, etkileşimli araç (burada Push'un kendisi) ve altında kısa bir "ne dinlemeli" notu. Araçta odaklanılmayan kontroller **kilitli** olur (LS'deki `"lock": ["decay","sustain","release"]` alanı gibi). Alt kısımda "Sonraki: <sayfa adı> ›" ve "‹ Geri" bulunur. İçindekiler tablosu bölümlere katlanır. "Serbest Çal'da aç" düğmesi, LS'deki "Open in Playground" karşılığıdır.
4. Push 3'e sadakat için gerçek cihazdaki **Learn** düğmesi de öğreticiyi açar. [M] şöyle tanımlar: *"Learn – Here you can launch lessons to learn about Push's new features."* SVG'deki `tutorial` id'li ikon büyük olasılıkla bu düğmedir; doğrulanmalı (bkz. §9).
5. "Push ekranı" (LCD) yalnızca gerçek Push'un gösterdiği türden bilgileri gösterir. Öğretici açıklamaları, nota adları ve ipuçları **ayrı öğretici panelinde** durur (mevcut `.p3-game-taskbar` / `.p3-explain-panel`). Böylece sahte cihaz davranışı öğretilmemiş olur.
6. Tamamlanma koşulları **durum tabanlıdır**: adım başında alınan snapshot ile güncel durum karşılaştırılır. Sıra gerektiren adımlar olay günlüğüne (nota/basış log'u) bakar. Adım kimlikleri kalıcı slug'lardır (`scale.kok-d`); ekrandaki numaralar hesaplanır.

---

## 1. Kaynaklardan çıkan öğretim modeli

### 1.1 Ableton'ın Push 3 için kendi öğretimi
- **İlk açılış:** *"Push starts in Standalone Mode the first time it is powered on. A short onboarding tutorial will guide you through some of its features."* [M §2]. Bu onboarding'in adım adım içeriği kamuya açık belgelerde yok (bkz. belirsizlikler).
- **Learn düğmesi:** Ders başlatır, video/kılavuz bağlantılarına QR kodla ulaşılır; *"New lessons and tutorials will be added here over time."* [M §17]
- **Live 12.3:** Push 3 ilk kez çalıştırıldığında "an onboarding lesson is displayed, showing some of the new Push features" [RN].
- **Learn Push (Push 3) video sırası** [ableton.com/en/push/learn-push]:
  - Getting started: Overview, Switching from Standalone to Control Mode, Authorizing and Updating, Installing Packs, Transferring Files and Sets, Using the Audio Interface
  - Connecting: ADAT, Link, MIDI
  - Creating: Pad Sensitivity and Expression Settings, Warping Audio, Expressive Pads
  - Bu seri kurulum ağırlıklı; müzik yapımı sırasını vermiyor.
- **Learn Push 2 (Push 2!) sırası** [ableton.com/en/help/learn-push-2]:
  - Önce davul: Step sequencing beats → Playing drums → Drum variations → Sound design: drums
  - Sonra melodi: Play melodies → Play chords → Chromatic Note Mode → Sound design: melodic → Melodic Step Sequencer → Note Mode settings → 32-Note Sequencer
  - Sonra Sampling, Session, Mixing/Automation, Clip View, Routing/Sidechain, Navigate and Browse, Device visualizations
  - Çıkarım: Ableton davulla başlıyor, çünkü anında müzikal sonuç veriyor.

### 1.2 Learning Synths veri modeli (doğrudan lesson.json'dan) [LS]
- **Bölümler ve sayfa sayıları:**
  - get-started (1)
  - making-changes (3: Amplitude, Pitch, Play with amplitude and pitch)
  - synth-basics (8)
  - envelopes (8: Change over time, Synthesizer envelopes, Attack, Decay and sustain, Release, Putting the envelope together, Modulating amplitude with envelopes, Matching envelopes)
  - lfos (5)
  - oscillators (5)
  - filters (3)
  - recipes (18)
  - learning-more (1)
- **Sayfa = `chunks[]` dizisi.** Her chunk ya `markdown` taşır ya da `metadata.embed` (`synth-adsr`, `synth-xy`, `one-shot-sampler`) içerir.
- **Kullanılan desenler:**
  - `classes:"highlighted"` → talimat kutusu, örn. "Press the button to play a note."
  - `classes:"centered caption"` → aracın altındaki eylem cümlesi, örn. "Drag the **Attack** control left…"
  - `lock:[…]` → odak dışı parametreler kilitli
  - `preset` → sayfa açılınca bilinen başlangıç sesi
  - `showResetButton`
  - Footer: `NextLink(text = sonraki sayfanın adı)` + `PrevLink`; son bölümden sonra Playground'a gider.
- **Bizim için kurallar:**
  - (a) Her adım bir başlangıç durumu (`setup`) yükler.
  - (b) Tek bir şeye odaklanılır, diğer her şey kilitlidir.
  - (c) Talimat emir kipinde tek cümledir.
  - (d) Eylemden sonra "ne duyduğunu" söyleyen bir cümle gelir.
  - (e) Sonraki adımın adı düğmede yazar.

### 1.3 Learning Music [LM]
- **Bölümler:** Beats (10 sayfa) → Notes and Scales (6: Explore pitch, Make patterns with pitch, Keys and scales, Minor scales, Adding more notes, Play with notes and scales) → Chords (7) → Basslines (7) → Melodies (7) → Song structure (4) → The Playground → Advanced topics → Where to go from here.
- Başlıkta "6/6: Notes and scales" ilerlemesi ve "‹ Previous / Next: Make some chords ›" gezinmesi var.
- Her bölüm bir **"Play with …" serbest sayfasıyla** biter. Bizde her bölümün sonunda 1 serbest adım olabilir; en sonda da "Mini Proje" var.

### 1.4 Popüler YouTube Push 3 başlangıç dersleri
- **"PUSH 3 - Learn It In 1 Hour!" (Meta Mind Music) bölüm sırası:**
  1. Introduction
  2. Overview
  3. Exploring the Interface
  4. Understanding the Different Modes
  5. Configurations
  6. Settings
  7. Connectivity
  8. Navigating Sets
  9. Devices and Tracks
  10. Push As An Instrument
  11. Rhythm Instrument (15:47)
  12. Melodic Instrument (23:22)
  13. MPE Melodies and Harmonies
  14. Melodic Sequencer
  15. Loop Length Controls and Loop Selectors
  16. Recording and Editing MIDI
  17. Recording and Editing Audio
  18. Working With Samples
  19. Parameter Automation
  20. Recording Automation
  21. Mixing Controls
  22. Session View
  23. Conclusion
- **Push Patterns (Craig, Londra'da üniversite eğitmeni):** "Learn Ableton Push 3 – The Step-By-Step Guide" kursu, 3+ saat, her bölümde alıştırma var.
- **MusicRadar "10 tips":** Hold/momentary basışlar; Quantize'ı basılı tutup pad'e basarak drum-başına swing; Shift + track düğmesi ile renk/Freeze.
- **Ortak sıra:** arayüz → modlar → enstrüman olarak çalma (ritim, melodi) → sequencer → kayıt → otomasyon/miks → Session.

### 1.5 Tasarım ilkeleri (çıkarım)
1. İlk 60 saniyede ses çıksın (Learning Synths ilk sayfada hemen sürükletip çaldırıyor).
2. Bir adım = bir kontrol + bir kavram.
3. Doğru eylem anında onaylansın (≤150 ms görsel geri bildirim).
4. Yanlış eylem cezalandırılmasın; sadece yönlendirilsin.
5. Her bölüm bilinen bir başlangıç durumuyla açılsın; bölümler arasında atlamak bozulmasın.
6. Kavram adımları "Devam →" ile, eylem adımları otomatik (1.2 s sonra) ilerlesin.
7. Resmî kontrol adları İngilizce kalsın (Scale, Layout, Fixed Length…); açıklamalar Türkçe olsun.
8. Her bölüm serbest bir "çal" adımıyla bitsin.

---

## 2. Mod seçim menüsü

### 2.1 Yerleşim
- `<main class="p3-game">` öncesine eklenecek:

```html
<section class="p3-modes" id="p3Modes" aria-labelledby="p3ModesTitle">
  <h1 class="h2" id="p3ModesTitle">Push 3 Laboratuvarı</h1>
  <p class="p3-modes-lead">…</p>
  <div class="p3-mode-grid">
    <button type="button" class="card p3-mode-card" data-mode="tutorial">…</button>
    <!-- 4 kart -->
  </div>
  <button type="button" class="btn btn-ghost btn-sm" id="p3ResetProgress">İlerlemeyi sıfırla</button>
</section>
```

- **Grid:** ≥900px'te 2×2; 600–899px'te 2 sütun; <600px'te tek sütun (ui.css kırılımları 600/900/1024).
- **Kart içeriği:**
  - üstte `.badge` (tag)
  - başlık Instrument Serif (`--fs-h3`)
  - 2 satır açıklama (`--fg-2`)
  - meta satırı Space Mono (`--fs-micro`)
  - ilerleme çubuğu: `height:4px; background: var(--line)`, dolgu `var(--accent)`, genişlik inline `style="width:NN%"` (runtime state; CLAUDE.md'ye uygun)
  - CTA metni
- Radius 0, gradient / !important / backdrop-filter yok. Seçili kartın kenarı `var(--accent)`.
- **Mod içindeyken:** taskbar'ın soluna `← Modlar` (`.btn btn-ghost btn-sm`) ve 4'lü `.seg` / `.seg-btn` mod anahtarı. Mobilde yalnızca `← Modlar` görünür.

### 2.2 Kart metinleri (template literal ile)

| data-mode | Tag | Başlık | Açıklama | Meta | CTA (duruma göre) |
|---|---|---|---|---|---|
| `tutorial` | ÖNERİLEN | Öğretici | Push 3'ü sıfırdan, adım adım öğren. Her adımda neye basacağını söyler, doğru yaptığında seni bir sonrakine taşır: nota çalmaktan Wavetable ile ses tasarımına, davul programlamaktan kayda kadar. | `11 bölüm · 69 adım · ~60 dk` | `Başla` / `Devam et · Bölüm 4: Dizilim` / `Tamamlandı ✓ · Tekrar göz at` |
| `level1` | OYUN | Seviye 1 · Kontrolü Bul | Push 3'ün 27 gerçek kontrolünü cihazın üzerinde tek tek bul. Her doğru dokunuşta o düğmenin ne işe yaradığını öğren. | `27 kontrol · ~5 dk` | `Başla` / `Devam et · 12/27` / `En iyi süre 2:14 · Tekrar oyna` |
| `level2` | GÖREV | Seviye 2 · Görevler | Gerçek görevler: tempoyu dokunarak ayarla, oktav değiştir, gamı seç, swing ver, track sustur, kayda başla. Sonucu ekranda canlı gör. | `6 görev · ~5 dk` | `Başla` / `Devam et · 3/6` / `Tamamlandı ✓` |
| `free` | EMÜLATÖR | Serbest Çal | Kural yok, ipucu yok. Wavetable synth ve davul setiyle Push 3'ü gerçek bir cihaz gibi çal, kaydet, sahneleri başlat. Learn düğmesi seni öğreticiye geri götürür. | `Tüm kontroller açık` | `Aç` |

- Menü üstü açıklama (lead): `Push 3'ü satın almadan, tarayıcında gerçeğine sadık bir kopyasıyla öğren ve çal. Kulaklık önerilir.`
- İlk ziyarette (ilerleme kaydı yoksa) Öğretici kartında şu satır görünür: `İlk kez mi? Buradan başla.`

### 2.3 Yönlendirme (hash)
- Rotalar:
  - `#ogretici`
  - `#ogretici/<chapterId>` ve `#ogretici/<chapterId>/<stepId>`
  - `#seviye-1`
  - `#seviye-2`
  - `#serbest`
  - hash yoksa menü açılır
- `hashchange` dinlenir, tarayıcı Geri düğmesi menüye döner.
- **Seviye 1 → Seviye 2 geçişi:** Bugünkü otomatik geçiş kalır, ama `startLevel(2)` doğrudan da çağrılabilmeli. Bugün `state.level` ve `restart()` her zaman Seviye 1'den başlıyor.
- Mod değişince ses çalınıyorsa tüm sesler `allNotesOff()` ile kesilir ve transport durur.

---

## 3. Öğretici motoru

### 3.1 Adım veri şeması (düz `<script>`, `var` kullanılır; CLAUDE.md gereği `type="module"` değil)

```js
var P3_TUTORIAL = { id: 'push3-ogretici', version: 1, chapters: [
  { id: 'scale', title: `Scale ve Kök Nota`, estMin: 5,
    setup: function (emu) { emu.loadPreset('tutorial-base'); emu.set({ 'scale.root': 0, 'scale.name': 'Major', 'scale.inKey': true, 'scale.fixed': false, 'scale.layout': '4ths', mode: 'note', track: 0 }); },
    steps: [
      { id: 'kok-d', kind: 'action',            // 'action' = otomatik ilerler, 'concept' = "Devam →" ister, 'free' = serbest
        title: `Kök notayı D yap`,
        body: `Üst ve alt display düğmeleri 12 kök notayı gösterir. Seçtiğin nota bütün pad dizilimini yeniden kurar.`,
        do: `Ekranın üstündeki sırada "D" yazan düğmeye bas.`,
        listen: `Pad'lerin renkleri kaydı: artık track renginde yananlar D.`,
        targets: ['upper:3'],                   // vurgulanacak mantıksal kontrol(ler)
        allow: ['upper:*', 'lower:*', 'enc:*', 'dpad:*', 'scale', 'pads'],
        stepSetup: function (emu) { emu.openOverlay('scale'); },
        check: function (st, rt) { return st.scale.root === 2; },
        success: `Tamam — kök nota D.`,
        hints: [`D, üst sırada C ve G'den sonra üçüncü düğme.`, null /* 2. kademe: hedefi titret */],
        optional: false }
    ] }
] };
```

Mantıksal kontrol adları ve SVG eşlemesi (§9):
- `pad:x,y`: x 0–7 soldan sağa, y 0–7 aşağıdan yukarı
- `upper:1..8`, `lower:1..8`
- `enc:1..8`
- `volume`, `swingTempo`, `jog`, `dpad:up|down|left|right|center`
- `strip`
- `note`, `session`, `device`, `mix`, `clip`, `add`, `swap`, `learn`, `setup`, `user`, `sets`
- `scale`, `layout`, `repeat`, `accent`, `octaveUp`, `octaveDown`, `pageLeft`, `pageRight`
- `shift`, `select`, `delete`, `duplicate`, `doubleLoop`, `convert`, `quantize`
- `tapTempo`, `metronome`, `fixedLength`, `automate`, `new`, `capture`, `record`, `play`
- `mute`, `solo`, `stopClip`, `lock`, `undo`, `save`, `mainTrack`
- `scene:1..8` (yukarıdan aşağıya)

### 3.2 Emülatörün yayması gereken olaylar (event bus: `emu.on(type, fn)`)

| Olay | Yük | Not |
|---|---|---|
| `button:down` | `{id}` | |
| `button:up` | `{id, heldMs}` | Tap/hold ayrımı: `heldMs < 300` = kısa basış (latch), `≥ 300` = momentary. Eşik bizim seçimimiz; Ableton'ın değeri doğrulanamadı. |
| `pad:on` | `{x,y,note,velocity,padIndex?}` | Drum'da `padIndex` 0–15 |
| `pad:off` | `{x,y,note}` | |
| `step:toggle` | `{track,pad,step,on}` | sequencer |
| `encoder:touch` / `encoder:release` | `{id}` | [M]: encoder'lara dokunmak algılanır |
| `encoder:turn` | `{id, delta}` | `delta` detent cinsinden; Shift basılıyken ince adım |
| `encoder:press` | `{id}` | `volume`, `swingTempo`, `jog` |
| `strip:move` | `{value}` | -1..1 (pitch bend) veya 0..1 (mod) |
| `state` | `{path, value, prev}` | her durum değişikliği |
| `transport` | `{playing, recording, overdub}` | |
| `clip:created` | `{track, slot, via:'record'|'capture'}` | |
| `clip:changed` | `{track, slot, noteCount}` | |
| `repeat:hit` | `{note, rate}` | Repeat'in her tetiklemesi |

### 3.3 Koşullarda kullanılan durum ağacı (`st`) ve çalışma zamanı (`rt`)
- **`st` alanları:**
  - `st.mode`: `'note'|'session'`
  - `st.view`: `'device'|'mix'|'clip'|'browse'`
  - `st.overlay`: `null|'scale'|'fixedLength'|'quantize'|'metronome'|'learn'|'bankSelect'`
  - `st.track`: `0` (Wavetable) | `1` (Drums)
  - `st.scale`: `{root:0..11, name, inKey, fixed, layout:'4ths'|'3rds'|'Sequential'}`
  - `st.octave` (başlangıca göre tam sayı)
  - `st.strip`: `{mode:'pb'|'mod', pb, mod}`
  - `st.volume`: `{target:'Main'|'Headphones'|'Main Track'|'Cue', mainDb}`
  - `st.tempo`, `st.swing`, `st.swingTempoTarget`: `'Tempo'|'Swing'`
  - `st.transport`: `{playing, recording, overdub}`
  - `st.metronome`
  - `st.repeat`: `{on, rate}`
  - `st.accent`: `{on}`
  - `st.fixedLength`: `{on, len}`
  - `st.drumLayout`: `'Loop Selector'|'16 Velocities'|'64 Pads'`
  - `st.melodicLayout`: `'64 Notes'|'Melodic Sequencer'|'Melodic Sequencer + 32 Notes'`
  - `st.wt` (Wavetable, §7.9 banka adları): `{bank, oscSel:'1'|'2'|'S'|'Mix', filterSel, envSel:'Amp'|'Env2'|'Env3', lfoSel, osc1:{on,category,table,pos,effType,fx1,fx2,pitch,gain}, osc2:{…}, sub:{on,gain,tone,octave}, filter1:{on,type,circuit,slope,freq,res,drive,morph}, filter2:{…}, routing, amp:{attack,decay,sustain,release}, env2, env3, lfo1, lfo2, matrix:{ '<targetName>': {amp,env2,env3,lfo1,lfo2} }, modTime, modAmt}`
  - `st.drums`: `{selectedPad, steps:{[pad]:Set<step>}, mutedSteps:Set, loopPages}`
  - `st.clips[track][slot]`: `{notes:[{pitch,start,dur,vel}], playing}`
- **`rt` alanları:**
  - `rt.base`: adım başındaki `st` derin kopyası
  - `rt.notes`: son 32 `pad:on` → `{note,x,y,vel,t}`
  - `rt.held`: basılı notalar kümesi
  - `rt.presses`: son 16 buton olayı
  - `rt.repeatHits`: `{[note]: count}`
  - `rt.flags`: adım içi ara hedefler
- **Yardımcılar:**
  - `seq(arr)`: son N nota tam olarak bu dizi mi
  - `pcs(set)`: pitch-class kümesi
  - `moved(path, amt)`: `|get(st,path) − get(rt.base,path)| ≥ amt`
  - `after(evType)`: koşul sağlandıktan sonra bu olay geldi mi

### 3.4 Kilit, ipucu, hata ve geçiş zamanlamaları
- **Kilit:**
  - `allow` listesinde olmayan kontroller: opaklık 0.35, `aria-disabled="true"`.
  - Tıklanınca ses/işlem yok. Geri bildirim satırında şu görünür (2 s): `Bu adımda <hedef adı> ile ilgileniyoruz.` Bu satır mevcut `#p3Feedback` alanıdır (`aria-live=assertive`).
  - Transport ve Volume her zaman izinlidir (öğrenci sesi kısabilmeli ve durdurabilmeli).
- **İpucu kademeleri:**
  - (1) 8 sn hareketsizlik **veya** 2 yanlış kontrol → `hints[0]` metni gösterilir.
  - (2) 20 sn **veya** 4 yanlış → hedef kontrol vurgulanır (mevcut `.target` highlight sınıfı; `prefers-reduced-motion` açıksa titreşim yok, sadece çerçeve).
  - Taskbar'daki mevcut `#p3HintBtn` "ipucu hep açık" moduna geçer; açıkken hedef baştan vurgulu olur.
- **Başarı:** Hedef kontrolde 400 ms yeşil çerçeve (`--ok`) ve `success` metni.
  - `kind:'action'` → 1200 ms sonra otomatik ilerler.
  - `kind:'concept'` → `Devam →` düğmesi (mevcut `#p3ContinueBtn`) odaklanır.
  - `kind:'free'` → `Bitirdim →` düğmesi; koşul sağlanınca etkinleşir.
- **Atla:** Her adımda `Atla` (ghost). Atlanan adım `skipped` olarak kaydedilir; bölüm yine de "tamamlandı (atlanan var)" sayılır.
- **Geri:** `‹ Geri` bir önceki adımın `stepSetup`'ını yeniden çalıştırır, `rt`'yi sıfırlar.
- **Bölüm başı:** Bölümün `setup()`'ı her girişte çalışır. İçindekilerden bölüme atlamak serbesttir; kilit yok.

### 3.5 UI yerleşimi (mevcut DOM'u yeniden kullan)
- `#p3Progress` (badge): `Bölüm 3 · 2/6`
- `#p3TaskText`: `step.do` (emir cümlesi)
- `.p3-explain-panel`: `title` (h3) + `body` + `listen`. Kavram adımında `Devam →`, eylem adımında gizli.
- **Yeni öğeler:**
  - `‹ Geri` / `Atla` düğmeleri
  - `İçindekiler` düğmesi → sağdan açılan panel (`.modal` desenine uygun; backdrop-filter yok). Her satırda bölüm adı, `3/6` ve durumdaki ✓.
  - `Serbest Çal'da aç` (ghost): mevcut sesi ve seti koruyarak `#serbest`'e geçer (LS "Open in Playground" karşılığı).
- **LCD (`#p3Lcd`):** Mevcut 3 satırlık (label/value/sub) yapı Scale menüsü ve Wavetable bankaları için yetmez. 8 sütunlu bir ızgara (`.p3-lcd-grid`) önerilir:
  - üst satır: upper button etiketleri
  - orta satır: 8 parametre adı + değer (+ opsiyonel mini grafik)
  - alt satır: lower button etiketleri
  - Sütunlar SVG'deki `SelectionButton..SelectionButton_8` (üst) ve `SelectionButton_9.._16` (alt) ile hizalanır.

### 3.6 Learn düğmesi (sadakat özelliği)
- Serbest Çal veya Öğretici modunda `learn` basılınca `st.overlay='learn'` olur. LCD'de 8 sütunda bölüm adları listelenir (11 bölüm → 2 sayfa; `pageLeft`/`pageRight` veya jog ile geçilir). Tamamlananlar ✓ ile gösterilir.
- Üst display düğmesi → o bölüm başlar (`#ogretici/<id>`). `learn`'e tekrar basmak veya jog'u sola itmek (nudge left) çıkarır.
- [M]: jog *"nudge the jog wheel left to return to previous menus"*.

---

## 4. "Öğretici Seti" (preset `tutorial-base`)

| Alan | Değer | Kaynak / not |
|---|---|---|
| Tempo / ölçü | 120 BPM, 4/4 | Live varsayılanı (çıkarım) |
| Swing | %0 | çıkarım |
| Track 1 | "Wavetable", MIDI, renk `var(--accent)` altın | Kök pad'ler track renginde yanar [P2S skin: `NoteBase = selected track color`] |
| Track 2 | "Drums", Drum Rack, renk `var(--info)` | |
| Drum Rack | C1 (36) `Kick.wav`, D1 (38) `Snare.wav`, F#1 (42) `Close Hat.wav`, A#1 (46) `Open Hat (1).wav`; diğer 12 pad boş (gri) | GM davul eşlemesi; dosyalar `assets/audio/` |
| Scale | C Major, In Key, Fixed Off, Layout 4ths | [M §7] varsayılanı C major |
| Octave | 0 (sol alt pad C1 = MIDI 36) | [M §7]; P2S `pitch_index_to_string`: 36 → "C1" |
| Melodik layout | 64 Notes | [M] |
| Drum layout | Loop Selector | [M §6] |
| Repeat | Off, rate 1/16 | Push 3 varsayılan rate'i doğrulanamadı |
| Accent | Off | |
| Fixed Length | Off, uzunluk 2 Bars | [P2S] `DEFAULT_LENGTH_OPTION_INDEX` = 2 Bars |
| Metronome | Off, count-in None | |
| Volume | target Main, −10 dB | bizim seçimimiz |
| Wavetable | Wavetable konusunun "init" preseti (Osc 1 açık, Osc 2 / Sub kapalı, Filter 1 LP) | Ayrıntı: Wavetable spesifikasyon konusu |
| View | Device (Wavetable Main bankası) | |

---

## 5. Müfredat: 11 bölüm, 69 adım

Tablo sütunları: **Adım** (id) | **Öğrenci ne yapar** (`do` metni) | **Vurgu → izin** | **Tamamlanma koşulu** | **Ekran / panel / ipucu**. (İ) = İleri, atlanabilir.

### Bölüm 0: Başlarken: Ses, Ekran ve Learn (`baslarken`, 5 adım, ~3 dk)
Bölüm setup'ı: `tutorial-base`, view Device.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 0.1 `ses-ac` (concept) | `Kulaklığını tak ve "Sesi Aç"a bas.` (cihaz dışındaki sayfa düğmesi) | Sayfa düğmesi | `audioCtx.state === 'running'` | Tarayıcı autoplay kuralı yüzünden gerekli. LCD: "Push 3" açılış ekranı (bizim metnimiz). Panel: `Push 3, cihaz içinde kendi ses kartı olan bağımsız bir enstrüman.` |
| 0.2 `volume-dokun` | `Volume encoder'ına dokun — çevirme, sadece dokun.` | `volume` | `ev encoder:touch id=volume` | LCD popup: `Main Output −10.0 dB`. [M]: *"Tap the encoder to see which volume option is selected."* |
| 0.3 `volume-cevir` | `Volume'u çevirerek sesi en az 3 dB değiştir.` | `volume` | `moved('volume.mainDb', 3)` | Panel: `Her tık 1 dB. Shift'i basılı tutarsan 0.1 dB.` [M] |
| 0.4 `encoder-ekran` | `Ekranın üstündeki 8 encoder'dan herhangi birine dokun.` | `enc:*` | `ev encoder:touch id ∈ enc:1..8` | LCD: dokunulan sütunun parametresi büyür ve değeri görünür. Panel: `Ekranda gördüğün her parametreyi hemen üstündeki encoder kontrol eder.` [M §17] |
| 0.5 `learn` | `Learn düğmesine bas; bu dersler her zaman buradan açılır.` | `learn` → `learn, upper:*` | `ev button:down id=learn` sonra `st.overlay==='learn'`; ardından `upper:1` → Bölüm 1 | LCD: bölüm listesi. [M]: Learn ders başlatır. |

### Bölüm 1: Pad'ler ve Nota Çalma (`padler`, 7 adım, ~5 dk)
Setup: `mode='session'` (boş Session; pad'ler sönük), track 0.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 1.1 `note-modu` | `Note düğmesine bas.` | `note` | `st.mode==='note'` | Pad'ler 64 Notes dizilimiyle yanar. Panel: `Note Mode'da pad'ler enstrüman gibi çalar. Session Mode'da ise clip başlatır.` [M §17] |
| 1.2 `ilk-nota` | `Sol alttaki pad'e bas.` | `pad:0,0` → `pads` | `pad:on x=0,y=0` (note 36) | Panel: `Bu C1. Pad'ler velocity duyarlıdır.` Nota adı panelde yazar, LCD'de değil. |
| 1.3 `kok-renk` | `Track renginde (altın) yanan 3 farklı pad'e bas.` | kök pad'ler → `pads` | `rt.notes`'ta 3 farklı (x,y) ve hepsinde `note%12 === st.scale.root` | Panel: `Renkli pad = kök nota (C). Beyaz = gamdaki diğer notalar.` [P2S skin: NoteBase = track rengi, NoteScale = beyaz] |
| 1.4 `saga-gam` | `En alt sıradaki 8 pad'i soldan sağa sırayla çal.` | `pad:0..7,0` | `seq([36,38,40,41,43,45,47,48])` | Dinle: `Do-Re-Mi… Sağa gitmek gamdaki bir sonraki notadır.` [M §7] |
| 1.5 `yukari-dortlu` | `Sol alt pad'e, sonra hemen üstündekine bas.` | `pad:0,0`, `pad:0,1` | `seq([36,41])` ve koordinatlar (0,0) → (0,1) | Panel: `Bir sıra yukarısı bir dörtlü (4ths) yukarısı: C → F.` [M] |
| 1.6 `ilk-akor` | `Şu üç pad'e birlikte bas: sol alt, onun iki sağı ve çaprazda bir yukarı-bir sağ.` | `pad:0,0`, `pad:2,0`, `pad:1,1` | Aynı anda basılı ve `pcs(rt.held) ⊇ {0,4,7}` göreli (majör üçlü; herhangi bir kökte kabul) | [M §7]: *"To play triads, try out the following shape anywhere on the grid."* In Key 4ths'te index = x + 3y → (0,0)=C, (2,0)=E, (1,1)=G. |
| 1.7 `velocity` (İ) | `Bir pad'e önce hafif, sonra güçlü vur.` | `pads` | İki ardışık nota arasında `|vel1−vel2| ≥ 40` | Emülatör yaklaşımı: pad içinde tıklama yüksekliği → velocity (üst = güçlü), dokunmatikte `PointerEvent.pressure` varsa o. Panelde "gerçek Push'ta vuruş gücü" diye not düşülür. |

### Bölüm 2: Scale ve Kök Nota (`scale`, 6 adım, ~5 dk)
Setup: C Major, In Key, Fixed Off, 4ths, `mode='note'`.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 2.1 `scale-ac` | `Scale düğmesine bas.` | `scale` | `st.overlay==='scale'` | LCD Scale menüsü (§7.1 yerleşimi). |
| 2.2 `kok-d` | `Ekranın üst sırasında "D" yazan düğmeye bas.` | `upper:4` (§7.1 düzeninde D) → `upper:*`, `lower:*` | `st.scale.root===2` | İpucu: `Üst sıra: C, G, D, A, E, B.` |
| 2.3 `minor-sec` | `Encoder'ı çevirerek (veya D-pad ▼) gamı Minor yap.` | `enc:2..8`, `dpad:*` | `st.scale.name==='Minor'` | [M]: *"Use the encoders or the Session D-pad to select a scale."* |
| 2.4 `d-minor-cal` | `Scale'e tekrar basıp menüyü kapat, sonra sol alt pad'i çal.` | `scale`, `pad:0,0` | `st.overlay===null` ve `pad:on (0,0) note%12===2` | Panel: `Fixed kapalıyken sol alt pad her zaman kök notadır. Şu an D.` [M] |
| 2.5 `chromatic` | `Scale menüsünü aç, sol alttaki display düğmesiyle Chromatic'e geç, sonra tekrar In Key'e dön.` | `scale`, `lower:1` | Ara hedef `inKey===false` görüldü; sonra `inKey===true` | Panel: `Chromatic'te gam dışı notalar da çalar ama pad'leri sönüktür.` [M] |
| 2.6 `fixed` | `Sağ alttaki display düğmesiyle Fixed'i aç, menüyü kapat ve sol alt pad'i çal.` | `lower:8`, `scale`, `pad:0,0` | `st.scale.fixed===true` ve `pad:on (0,0) note%12===0` | Panel: `Fixed açıkken sol alt pad hep C kalır; gamda C yoksa en yakın nota çalar. Scale ayarı Set ile birlikte kaydedilir.` [M] |

### Bölüm 3: Dizilim, Oktav ve Touch Strip (`dizilim`, 6 adım, ~4 dk)
Setup: D Minor, In Key, Fixed Off, 4ths.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 3.1 `3rds` | `Scale menüsünde en soldaki encoder'ı çevirip 3rds'i seç, sonra sol alt pad ve üstündekini çal.` | `scale`, `enc:1`, `pad:0,0`, `pad:0,1` | `layout==='3rds'` ve `(0,0)→(0,1)` sırası | Panel: `Bir sıra yukarısı artık bir üçlü.` [M] |
| 3.2 `sequential` | `Sequential'ı seç; alt sıranın en sağındaki pad'den bir üst sıranın ilk pad'ine geç.` | `enc:1`, `pad:7,0`, `pad:0,1` | `layout==='Sequential'` ve `(7,0)→(0,1)` | Panel: `Sequential'da notalar satır satır, piyano gibi devam eder.` |
| 3.3 `4ths-geri` | `Tekrar 4ths'e dön ve menüyü kapat.` | `enc:1`, `scale` | `layout==='4ths' && overlay===null` | Panel: `4ths, Push'un varsayılanı. Aynı akor şekli her yerde çalışır.` |
| 3.4 `oktav-yukari` | `Octave ↑'a bir kez bas.` | `octaveUp` | `st.octave === rt.base.octave + 1` | LCD kısa popup: yeni aralık. [M]: *"The updated range will be shown in the display."* Sınırda düğme söner [M]. |
| 3.5 `oktav-asagi` | `Octave ↓'a iki kez bas.` | `octaveDown` | `st.octave === rt.base.octave − 2` | |
| 3.6 `pitch-bend` | `Bir pad'i basılı tutarken parmağını Touch Strip'te kaydır.` | `strip` + `pads` | `rt.held.size>0 && Math.abs(st.strip.pb) ≥ 0.5` | Panel: `Varsayılan işlev pitch bend. Select'i basılı tutup strip'e dokunursan Mod Wheel'e geçer.` [M §17] |

### Bölüm 4: Wavetable Osilatörü (`osilator`, 8 adım, ~7 dk)
Setup: track 0, **view Mix** (4.1'de Device'a geçilsin diye), Wavetable init, `wt.bank='Main'`.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 4.1 `device` | `Device düğmesine bas.` | `device` | `st.view==='device'` | LCD Main bankası: `Oscillator [1 2 S Mix]`, Table, Position (dalga görseli), Filter Type, Frequency / Resonance (filtre eğrisi), Mod Time, Mod Amt. Figma LCD'si ve P2S ile aynı. |
| 4.2 `position` | `Bir pad'i basılı tut ve 3. encoder'la (Position) dalgayı gezdir.` | `enc:3` + `pads` | `rt.held.size>0` sırasında `moved('wt.osc1.pos', 0.30)` (0..1) | Dinle: `Aynı nota, değişen renk. Wavetable sentezi budur: tablo içindeki dalgalar arasında gezinmek.` [L12 §31.13.1] |
| 4.3 `table` | `2. encoder'la (Table) başka bir wavetable seç ve çal.` | `enc:2` + `pads` | `st.wt.osc1.table !== rt.base.wt.osc1.table` ve ardından `pad:on` | |
| 4.4 `osc2` | `1. encoder'la Oscillator'ı "2" yap, ardından "Osc" seçeneğiyle Osc 2'yi aç.` | `enc:1`, `upper:2` (Osc seçeneği) | `oscSel==='2' && st.wt.osc2.on` | P2S Main options: 1 `Osc/Sub` on-off, 3 `Filter Switch`, 4 `Filter`, 7 `Add to Matrix`. Seçenek-düğme eşlemesi çıkarım. |
| 4.5 `oscillators-bank` | `Cihaz adının üstündeki display düğmesine bas; alt sırada "Oscillators" bankasını seç.` | `upper:1`, `lower:*` | `st.wt.bank==='Oscillators'` | [M §4.2]: *"Press the display button above the device's name to view all of the available parameter tabs… access the individual tabs using the corresponding lower display buttons."* |
| 4.6 `detune` | `Osc 2 seçiliyken Pitch'i (5. encoder) değiştir; iki osilatörün birlikte sesini dinle.` | `enc:5` + `pads` | `st.wt.osc2.pitch !== 0` ve ardından `pad:on` | Panel: `Shift'le ince ayar.` |
| 4.7 `effect` | `Effect Type'ı (6. encoder) Classic yap, Pulse Width'i (7. encoder) çevir.` | `enc:6`, `enc:7` + `pads` | `osc(sel).effType==='Classic' && moved('wt.osc?.fx1', 0.2)` | Adlar P2S'ten: Classic → Pulse Width/Sync, Modern → Warp/Fold, FM → Pitch/Amount. [L12]: FM = Amt/Tune, Classic = PW/Sync, Modern = Warp/Fold. |
| 4.8 `sub` | `Oscillator'ı "S" yap, Sub'ı aç ve Gain'i yarının üstüne çıkar.` | `enc:1`, `upper:2`, `enc:2` | `st.wt.sub.on && st.wt.sub.gain ≥ 0.5` (normalize) | [L12]: Sub'da Tone %0 = saf sinüs; Octave −1/−2. |

### Bölüm 5: Filtre ve Envelope (`filtre-env`, 8 adım, ~7 dk)
Setup: view Device, `bank='Main'`, `filter1` Lowpass, `res=0`.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 5.1 `cutoff` | `Bir pad'i basılı tutarken 5. encoder'la (Frequency) filtreyi kapat ve aç.` | `enc:5` + `pads` | Basılıyken `max(freq)/min(freq) ≥ 4` (≥2 oktav tarama) | LCD filtre eğrisi canlı. Dinle: `Frekans düştükçe ses boğuklaşır: Low-pass tizleri keser.` [L12] |
| 5.2 `resonance` | `6. encoder'la Resonance'ı yarının üstüne çıkar ve tekrar Frequency'yi tara.` | `enc:6`, `enc:5` | `res ≥ 0.5` sonrası `freq` oranı ≥ 2 | |
| 5.3 `filter-type` | `Filters bankasına geç, Filter Type'ı Highpass yap.` | `upper:1`, `lower:*`, `enc:3` | `st.wt.filter1.type==='Highpass'` | P2S Filters bankası: Filter, Filter On, Filter Type, Frequency, Resonance, Filter Circuit, Drive/Morph, Routing. Slope 12/24 dB seçenek düğmesinde. |
| 5.4 `envelopes-bank` | `Envelopes bankasına geç (Amp seçili kalsın).` | `upper:1`, `lower:*` | `bank==='Envelopes' && envSel==='Amp'` | |
| 5.5 `attack` | `Attack'ı en az 500 ms yap ve bir nota çal.` | `enc:3` + `pads` | `amp.attack ≥ 0.5` ve sonra `pad:on` | Dinle: `Ses yavaşça açılıyor.` (LS "Attack" sayfası) |
| 5.6 `release` | `Release'i en az 1 saniye yap; notayı bırak ve sönümü dinle.` | `enc:6` + `pads` | `amp.release ≥ 1.0` ve sonra `pad:off` | |
| 5.7 `pluck` | `Pluck sesi yap: Attack ≤ 10 ms, Decay ≤ 300 ms, Sustain %0, sonra çal.` | `enc:3..5` + `pads` | `a≤0.01 && d≤0.3 && s≤0.01` ve sonra `pad:on` | LS "Matching envelopes" mantığı: kısa attack, sıfır sustain = davul/pluck karakteri. |
| 5.8 `lfo-matrix` (İ) | `Main bankasında Frequency encoder'ına dokun, "Add to Matrix"e bas, Matrix'te LFO 1 miktarını aç.` | `enc:5` (touch), `upper:8`, `enc:7` | `st.wt.matrix['Filter 1 Freq'].lfo1 !== 0` | P2S: Add to Matrix → Matrix bankası (Amp Env, Env 2, Env 3, LFO 1, LFO 2 miktarları; `Back`, `Go to LFO 1`…). Seçenek düğme indeksi çıkarım. |

### Bölüm 6: Drum Modu (`drum`, 9 adım, ~7 dk)
Setup: track 1 (Drums), `drumLayout='Loop Selector'`, transport durmuş, adım yok.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 6.1 `drum-track` | `Alt display sırasından "Drums" track'ini seç.` | `lower:2` | `st.track===1` | Pad'ler Loop Selector düzeninde: sol alt 4×4 drum pad'leri, üst 4 sıra step sequencer (32 adım), sağ alt 4×4 loop length. [M §6.1] |
| 6.2 `kick-cal` | `Sol alt bölgenin ilk pad'ine (Kick) bas.` | `pad:0,0` | `pad:on padIndex=0` | Panel renk anahtarı [M]: track rengi = ses var, gri = boş, yeşil = çalıyor, beyaz = seçili, koyu mavi = solo, koyu track rengi = mute. |
| 6.3 `kick-4` | `Kick seçiliyken üst bölgede 1, 5, 9 ve 13. adımlara bas.` | step pad'leri | `steps[0] ⊇ {0,4,8,12}` | [M]: *"As soon as a step is added to the sequencer, playback will begin."* Adım başına 1/16; 32 adım = 2 ölçü. |
| 6.4 `snare` | `Snare'i seç ve 5 ile 13. adımlara koy.` | `pad:2,0`, steps | `steps[2] ⊇ {4,12}` | |
| 6.5 `select-hat` | `Select'i basılı tutarak Closed Hat pad'ine bas: ses çıkmadan seçilir.` | `select`, `pad:2,1` | `drums.selectedPad===6` ve bu basışta `pad:on` sesi tetiklenmedi | [M]: *"press and hold the Select button while tapping a drum pad"* |
| 6.6 `hat-8` | `Hi-hat'i her iki adımda bir koy (en az 6 adım).` | steps | `steps[6].size ≥ 6` | |
| 6.7 `step-mute` | `Mute'u basılı tutup bir hi-hat adımına dokun.` | `mute`, steps | `mutedSteps.size ≥ 1` | [M]: muted adım = clip renginin açık tonu. |
| 6.8 `delete-pad` | `Delete'i basılı tutup Snare pad'ine bas: snare adımları silinir.` | `delete`, `pad:2,0` | `rt.base.steps[2].size>0 && steps[2].size===0` | [M]: pad'de adım yokken Delete+pad cihazları siler. Uyarı panelde yazar. |
| 6.9 `16-velocities` (İ) | `Layout'a bas (16 Velocities), sağ alttaki velocity pad'lerinden birine bas.` | `layout`, sağ alt 4×4 | `drumLayout==='16 Velocities'` ve velocity pad'e basıldı | [M §6.2]: Layout sırası Loop Selector → 16 Velocities → 64 Pads. |

### Bölüm 7: Repeat, Accent ve Swing (`repeat-accent`, 6 adım, ~4 dk)
Setup: Drums, kick 4/4 pattern çalıyor, Repeat Off (rate 1/16), Accent Off, swing %0.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 7.1 `repeat-ac` | `Repeat'e kısa bas.` | `repeat` | `st.repeat.on===true` | [M]: Repeat düğmesi yanıp söner, seçili rate düğmesi yeşil yanar. |
| 7.2 `repeat-hat` | `Closed Hat pad'ini 2 saniye basılı tut.` | `pad:2,1` | `rt.repeatHits[42] ≥ 8` | [M]: parmak basıncı repeat seslerinin volümünü değiştirir (emülatörde: dikey konum). |
| 7.3 `rate-1-8t` | `Sağdaki sütundan 1/8t'yi seç (yukarıdan 4.) ve hat'i yine basılı tut.` | `scene:4`, `pad:2,1` | `rate==='1/8t'` ve bu rate'te ≥ 4 hit | Sıra yukarıdan aşağıya: 1/4, 1/4t, 1/8, 1/8t, 1/16, 1/16t, 1/32, 1/32t. [M] |
| 7.4 `accent` | `Accent'e kısa bas, sonra bir pad'e çok hafif dokun.` | `accent` + `pads` | `accent.on` ve sonraki `pad:on.velocity===127` | [M]: *"all played or step-sequenced notes will be at full velocity (127)"* |
| 7.5 `accent-momentary` | `Accent'i basılı tut, bir pad çal ve bırak: Accent kapanır.` | `accent` | `button:up accent heldMs≥300` ve `accent.on===false` | [M]: kısa basış açık bırakır; basılı tutmak momentary çalışır. Önce 7.4'ten gelen açık Accent'i kapatmak gerekir; setup bunu kapatır. |
| 7.6 `swing` | `Swing & Tempo encoder'ına bas (Swing'e geç), %60'a getir.` | `swingTempo` | `swingTempoTarget==='Swing' && Math.abs(st.swing−60)≤1` | [M]: dokun = hangisi seçili; bas = Tempo/Swing geçişi; %1 adım, %0–100. |

### Bölüm 8: Kayıt ve Clip (`kayit`, 8 adım, ~7 dk)
Setup: track 0, Note mode, 64 Notes, C Major, transport durmuş, clip yok, metronome off, Fixed Length off (2 Bars).

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 8.1 `metronome` | `Metronome'u aç.` | `metronome` | `st.metronome===true` | [M]: açıkken düğme nabız gibi yanıp söner; basılı tutmak ayarları açar (count-in, Classic/Click/Wood). |
| 8.2 `tap-tempo` | `Tap Tempo'ya düzenli aralıklarla 4 kez bas.` | `tapTempo` | 4 tap sonrası `st.transport.playing===true` | [M]: *"it takes four taps to start song playback at the tapped tempo"* (4/4). Panelde hesaplanan BPM gösterilir. |
| 8.3 `fixed-length` | `Fixed Length'i basılı tut, "1 Bar"ı seç ve Fixed Length'i açık bırak.` | `fixedLength`, `lower:*` | `fixedLength.on && len==='1 Bar'` | Seçenekler: 1 Beat, 2 Beats, 1 Bar, 2 Bars, 4 Bars, 8 Bars, 16 Bars, 32 Bars [P2S]; Phrase Sync [M]. |
| 8.4 `kayit` | `Record'a bas ve 1 ölçü içinde en az 4 nota çal.` | `record` + `pads` | `clips[0][slot].notes.length ≥ 4` | Record kırmızı yanar [M]. Fixed Length açıkken 1 ölçü sonra kayıt biter ve clip döngüye girer (çıkarım). |
| 8.5 `overdub` | `Record'a tekrar bas (overdub) ve 2 nota daha ekle.` | `record` + `pads` | `overdub` görüldü ve `noteCount ≥ base+2` | [M]: 1. basış kayıt, 2. basış kaydı durdurur (çalma sürer), 3. basış overdub. |
| 8.6 `undo` (İ) | `Undo'ya bas: son overdub geri alınır. Shift + Undo ile geri getir.` | `undo`, `shift` | Önce `noteCount === base`, sonra redo ile eski değere dönüş | [M §17] |
| 8.7 `quantize` | `Quantize'a bas: notalar grid'e oturur.` | `quantize` | Tüm nota başlangıçları 1/16 grid'de | [M]: basılı tutunca ayarlar açılır: Swing Amount, Quantize To, Quantize Amount, Rec. Quantize. |
| 8.8 `capture` | `Record'a basmadan birkaç nota çal, sonra Capture'a bas.` | `pads`, `capture` | `clip:created via='capture'` ve `noteCount ≥ 3` | [M]: Capture yeni bir MIDI clip oluşturup hemen çalar; tempo ve loop sınırlarını algılar. Emülatörde basitleştirilmiş: mevcut tempo korunur, son 1–4 ölçü alınır. |

### Bölüm 9: Session: Clip ve Sahneler (`session`, 5 adım, ~4 dk)
Setup: Scene 1'de Wavetable clip + Drums clip, Scene 2'de ikisinin varyasyonu, transport durmuş.

| Adım | Öğrenci ne yapar | Vurgu → izin | Koşul | Ekran / panel / ipucu |
|---|---|---|---|---|
| 9.1 `session-pad` | `Session düğmesine bas.` | `session` | `st.mode==='session'` | [M §15.2]: her sütun bir track, her pad bir clip, boş slot sönük. |
| 9.2 `clip-baslat` | `Bir clip pad'ine bas.` | clip pad'leri | O clip `playing===true` | Panel: `Önce yeşil yanıp söner (kuyrukta), ölçü başında çalmaya başlar.` [M] |
| 9.3 `clip-durdur` | `Aynı track'te boş bir pad'e bas: clip durur.` | boş pad | Aynı track'in clip'i `playing===false` | [M]: *"To stop a clip in a given track, press an empty pad in that track."* |
| 9.4 `scene` | `Sağdaki sütundan 2. sahne düğmesine bas.` | `scene:2` | Scene 2'deki tüm clip'ler çalıyor | [M]: Session Mode'da sağ sütun sahne başlatır. |
| 9.5 `note-gecici` (İ) | `Session'dayken Note'u basılı tut: geçici olarak Note Mode'a geçersin; bırakınca geri dönersin.` | `note` | `button:down note` sırasında `mode==='note'`; `up` sonrası `mode==='session'` | [M]: *"pressing and holding Note while in Session Pad Mode will temporarily toggle Note Mode."* |

### Bölüm 10: Mini Proje: İlk Döngün (`final`, 1 adım, ~5 dk)

| Adım | Öğrenci ne yapar | Koşul | Sonuç |
|---|---|---|---|
| 10.1 `proje` (free) | `Drums'ta en az 3 farklı sesle 1 ölçülük bir pattern kur; Wavetable'a en az 8 notalık bir melodi kaydet; ikisini aynı anda çal.` | `steps` 3+ pad'de dolu ve `clips[0]` ≥ 8 nota ve iki track aynı anda `playing` | "Push 3 Öğretici ✓" rozeti, `Serbest Çal'a geç` CTA'sı, kazanım özeti. Mevcut `#p3Win` kartına benzer. |

**Toplam:** 5 + 7 + 6 + 6 + 8 + 8 + 9 + 6 + 8 + 5 + 1 = **69 adım** (İleri: 1.7, 5.8, 6.9, 8.6, 9.5 → çekirdek 64).

**Alternatif hızlı yol (isteğe bağlı):** Ableton'ın Learn Push 2 sırası gibi davulla başlamak isteyenler için menüde `Hızlı başlangıç: Davul → Pad'ler → Kayıt` bağlantısı olabilir (Bölüm 6 → 1 → 8). Bölüm setup'ları bağımsız olduğu için sorunsuz çalışır.

---

## 6. İlerleme kaydı (localStorage)

- **Anahtar:** `bk_push3_v1`. Sitedeki mevcut `site-theme` ve `_lang` anahtarlarıyla çakışmaz.
- **Yazma:** `JSON.stringify`, 300 ms debounce, `try/catch` (Safari gizli mod / kota).
- **Okuma:** hata olursa varsayılan nesne kullanılır. Sekmeler arası tutarlılık için `window.addEventListener('storage', …)` ile menü rozetleri güncellenir.

```js
// localStorage['bk_push3_v1'] = JSON.stringify(şu nesne)
{
  v: 1,
  lastMode: 'tutorial',                 // 'tutorial'|'level1'|'level2'|'free'
  lastVisit: 1790000000000,
  tutorial: {
    curriculumVersion: 1,
    current: { chapter: 'dizilim', step: 'oktav-yukari' },
    steps: { 'baslarken/ses-ac': { done: 1789990000000 }, 'padler/velocity': { skipped: 1789990500000 } },
    chapters: { baslarken: { done: 1789990400000 }, padler: { done: 1789991000000, skipped: 1 } },
    completedAt: null,
    badge: false
  },
  level1: { idx: 12, found: ['Scale__13', 'Layout__14'], completedAt: null, bestMs: null, startedAt: 1789980000000 },
  level2: { idx: 3, completedAt: null },
  free:   { presetId: 'tutorial-base', snapshot: null },   // İsteğe bağlı: Serbest Çal'ın son durumu (≤ 50 KB)
  settings: { hintsAlways: true, volumeDb: -10 }
}
```

- **Anahtar formatı:** Kayıtlarda `chapterId/stepId` kullanılır, indeks kullanılmaz. Müfredat değişince eski kayıtlar bozulmaz.
- **Migrasyon:** `v` farklıysa `migrate(old)`; bilinmeyen adım anahtarları görmezden gelinir. `curriculumVersion` artarsa `current`, geçerli bir adıma "en yakın sonraki" olarak eşlenir.
- **Menü hesapları:**
  - Öğretici yüzdesi = (done + skipped) / 69.
  - Seviye 1 = `idx/27`.
  - Seviye 2 = `idx/6`.
  - `bestMs`, Seviye 1 bitince `min(bestMs, Date.now() − startedAt)` olarak güncellenir.
- **Sıfırlama:** Menüdeki `İlerlemeyi sıfırla` → onay (`.modal`): `Tüm Push 3 ilerlemen silinecek. Emin misin?` → `localStorage.removeItem('bk_push3_v1')`.
- **İsteğe bağlı bulut senkronu (şart değil):** Firestore `userSettings/{uid}` belgesinde `push3` alanı olabilir; önce güvenlik kurallarının izin verdiği alanlar kontrol edilmeli. Yerel kayıt her zaman birincil kaynaktır.

---

## 7. Öğreticide kullanılan Push 3 davranış referansı

### 7.1 Scale menüsü
- Scale'e basınca menü açılır.
- **Kök nota:** üst ve alt display düğmeleri. **Gam:** encoder'lar veya Session D-pad. **En soldaki encoder:** Layout (4ths / 3rds / Sequential). **Sol alt düğme:** In Key / Chromatic. **Sağ alt düğme:** Fixed On/Off. [M §7.1]
- **Kök notaların dizilişi** [P2S `ROOT_NOTES` = beşliler çemberi]: üst sıra C G D A E B, alt sıra F B♭ E♭ A♭ D♭ G♭.
  - Önerilen düğme eşlemesi (çıkarım): `upper:2..7` = C G D A E B, `lower:2..7` = F B♭ E♭ A♭ D♭ G♭, `lower:1` = In Key/Chromatic, `lower:8` = Fixed, `upper:1` ve `upper:8` boş.
  - Adım 2.2'de D = `upper:4`.
- **Gam listesi** 4 satırlık sütunlar halinde. D-pad ▲/▼ ±1, ◀/▶ ±4 kaydırır [P2S `NUM_DISPLAY_ROWS = 4`]. Liste Live 12'nin gam listesidir (`Live.Song.get_all_scales_ordered`); tam liste Scale konusunda.
- **Pad renkleri** [P2S skin]: kök = track rengi, gam içi = beyaz, gam dışı (Chromatic'te) = sönük.

### 7.2 Nota ızgarası
- Varsayılan: 64 Notes, C major, sol alt pad C1 (MIDI 36). Yukarı = dörtlü, sağa = gamdaki sonraki nota [M].
- In Key'de indeks = x·1 + y·3 (4ths), y·2 (3rds), y·8 (Sequential) [P2S `Layout("4ths",3)`, `("3rds",2)`, `Sequential None`].
- Fixed Off'ta sol alt pad = kök. Fixed On'da C (gamda yoksa en yakın nota) [M].

### 7.3 Layout düğmesi
- Melodik track: 64 Notes ↔ Melodic Sequencer ↔ Melodic Sequencer + 32 Notes. Drum: Loop Selector ↔ 16 Velocities ↔ 64 Pads [M §17].
- **4ths / 3rds / Sequential Layout düğmesinde değil, Scale menüsündedir.**

### 7.4 Octave ve Touch Strip
- Octave: her basış 1 oktav kaydırır; Drum'da 16 pad; daha fazla oktav yoksa düğme söner. Shift + Octave (sequencer'da) = gamda 1 nota [M].
- Touch Strip: varsayılan pitch bend; Select + dokunuş → Mod Wheel; Drum'da bank kaydırır [M].

### 7.5 Loop Selector
- Sol alt 4×4 = drum pad'leri, üst 4 sıra = step, sağ alt 4×4 = loop length.
- 1/16'da iki sayfa = 2 ölçü. Çalan adım yeşil, kayıtta kırmızı [M §6.1, §6.5].
- Adım renkleri: gri = boş; clip rengi = nota var (velocity yükseldikçe daha parlak); açık ton = mute; triplet'te sağdaki 2 sütun sönük.

### 7.6 Repeat ve Accent
- Repeat rate'leri sağ sütunda, yukarıdan aşağıya: 1/4, 1/4t, 1/8, 1/8t, 1/16, 1/16t, 1/32, 1/32t.
- Repeat açıkken düğme yanıp söner, seçili rate yeşil yanar. Kısa basış açık bırakır, basılı tutmak momentary çalışır. Durum track başına saklanır [M §8.3].
- Accent: tüm notalar 127, kısa/uzun basış mantığı aynı [M §8.1].

### 7.7 Tempo, Swing, Volume
- Swing & Tempo encoder: dokun = hangisi seçili; bas = Tempo/Swing geçişi. Tempo 1 BPM adım (Shift ile 0.1), Swing %1 adım, %0–100 [M §4.4].
- Tap Tempo: 4/4'te 4 dokunuş çalmayı başlatır.
- Volume encoder: 1 dB adım (Shift ile 0.1). Basış sırayla Main / Headphones / Main track / Cue arasında geçer. Açılışta Main seçili [M §3.1.2].

### 7.8 Kayıt
- Record: 1. basış kayıt → 2. basış kaydı durdurur, çalma sürer → 3. basış overdub. Count-in sırasında yanıp söner, sonra düz kırmızı.
- Fixed Length: aç/kapa; basılı tutunca uzunluk ve Phrase Sync.
- New: seçili clip'i durdurur, boş slot hazırlar (Scene Workflow'da çalan clip'lerin kopyasıyla yeni sahne oluşturur).
- Capture: armed track gerekir.
- Quantize: basınca uygular; basılı tutunca ayarlar açılır.
- Automate: açıkken kırmızı, kapalıyken beyaz. [M §8, §13, §17]

### 7.9 Wavetable Push bankaları [P2S `Push2/custom_bank_definitions.py` → `InstrumentVector`, Live 12.4]

| Banka | Enc 1 | Enc 2 | Enc 3 | Enc 4 | Enc 5 | Enc 6 | Enc 7 | Enc 8 | Seçenek düğmeleri |
|---|---|---|---|---|---|---|---|---|---|
| Main | Oscillator (1/2/S/Mix) | Table · (S) Gain · (Mix) Gain 1 | Position · (S) Tone · (Mix) Gain 2 | Filter Type · (S) Octave · (Mix) Gain Sub | Frequency | Resonance | Mod Time | Mod Amt | Osc/Sub, Filter Switch, Filter, Add to Matrix |
| Oscillators | Oscillator | Category · (S) Gain · (Mix) Pitch 1 | Table · (S) Tone · (Mix) Pitch 2 | Position · (S) Octave · (Mix) Octave Sub | Pitch · (Mix) Gain 1 | Effect Type · (Mix) Gain 2 | FX1: Pulse Width / Warp / Pitch(FM) | FX2: Sync / Fold / Amount(FM) | Osc/Sub, Add to Matrix |
| Filters | Filter (1/2) | Filter On | Filter Type | Frequency | Resonance | Filter Circuit | Drive / Morph | Routing | Slope 12/24 dB, Add to Matrix |
| Global | Mono On | Glide / Poly Voices | Unison Mode | Unison Voices | Unison Amount | Transpose | — | Volume | Add to Matrix |
| Envelopes | Envelopes (Amp/Env2/Env3) | Env View (Time/Slope/…) | Attack | Decay | Sustain | Release | Loop | — | Add to Matrix |
| LFOs | LFO (1/2) | LFO Type | Shape | Rate | Amount | Attack | Offset | Retrigger | Sync (Hz/Sync), Add to Matrix |
| Matrix | Target adları | Current Mod Target | — | Amp Env | Env 2 | Env 3 | LFO 1 | LFO 2 | Back, Go to Amp Env/Env 2/Env 3/LFO 1/LFO 2 |
| MIDI | Target adları | Current | Velocity | Key | PB Range | Pressure | Mod Wheel | Random | Back |

- Sitedeki Figma LCD çizimi bu Main bankasıyla örtüşüyor: `Oscillator` + seçenekler `1`, `2`, `S`, `Mix`; `Graph`; `Mod Time 26 %`.
- Ableton, Wavetable'ı *"the first synth that's designed for deep sound sculpting from Push"* diye tanıtıyor (ableton.com/en/packs/wavetable).

---

## 8. Mevcut sayfada düzeltilmesi gereken içerik (öğretici ile çelişmesin)

| Yer (ders-push3.html) | Bugünkü metin/davranış | Gerçek (kaynak) | Öneri |
|---|---|---|---|
| TASKS `Layout` explain | "pad dizilimini 4ths / 3rds / Sequential … değiştirir" | Layout düğmesi 64 Notes / Melodic Sequencer / +32 Notes (drum: Loop Selector / 16 Velocities / 64 Pads) arasında geçer; 4ths/3rds/Sequential Scale menüsündeki en soldaki encoder'dadır [M §7.1, §17] | `Layout, pad ızgarasının düzenini değiştirir: melodik track'te 64 Notes, Melodic Sequencer ve Melodic Sequencer + 32 Notes; davulda Loop Selector, 16 Velocities ve 64 Pads.` |
| TASKS `Quantize` explain | "Quantize açıkken çaldığın notalar en yakın grid çizgisine hizalanır" | Quantize bir eylemdir: basınca seçili notaları (seçim yoksa tüm clip'i) hizalar; kayıt sırasında otomatik hizalama `Rec. Quantize` ayarıdır [M §8.5] | `Quantize'a bastığında clip'teki notalar grid'e oturur. Basılı tutarsan ayarları (Quantize To, Amount, Swing, Rec. Quantize) açarsın.` |
| TASKS `Duplicate` explain | "seçili sayfa veya clip içeriğini başka bir sayfaya kopyalar" | Scene Workflow'da çalan clip'lerle yeni sahne; Clip Workflow'da seçili clip'i bir sonraki slota kopyalar; Duplicate + pad → pad kopyası [M §17] | Metni güncelle. |
| SIM_TASKS `Scale` görevi | "Scale'e arka arkaya dokunarak listede ilerle" (C Major → G Major → A Minor → D Minor) | Scale menüyü açar; kök display düğmeleriyle, gam encoder/D-pad ile seçilir [M §7.1] | Görev 3 alt adıma bölünür: Scale'e bas → `upper:4` (D) → encoder ile Minor. Öğretici 2.1–2.3 ile aynı motor kullanılır. |
| SIM_TASKS `Swing` görevi | 8 track encoder'ından birini sürükle | Swing, Swing & Tempo encoder'ındadır (bas → Swing'e geç) veya Quantize basılıyken 1. encoder [M §4.4, §8.5] | Hotspot'u Swing & Tempo encoder'ına taşı; "önce bas, sonra çevir" adımı ekle. |
| Sayaçlar | HTML'de "1 / 26" ve "26 kontrol"; `TASKS.length` 27; i18n `eg_modpush3_t1` 27 diyor | — | Hepsini 27 yap veya `TASKS.length`'ten üret. |
| Akış | Seviye 1 bitince Seviye 2'ye zorunlu geçiş; `restart()` hep Seviye 1 | Kullanıcı isteği: modlar ayrı seçilebilsin | `startLevel(n)` fonksiyonunu ayır; menü ve hash buna yönlensin. |

---

## 9. SVG kontrol eşlemesi (öğretici için ek hotspot'lar)

- **Pad'ler:** `PadButton…PadButton_64` numaralarına güvenme. Runtime'da 64 elemanın `getBBox()` değerlerini y'ye göre azalan, x'e göre artan sırala: satır 0 = en alt → `pad:x,y`.
- **Display düğmeleri:**
  - `SelectionButton…_8` → `upper:1..8`. Grup `MainTopButtons`, y ≈ 360, LCD'nin (y ≈ 482) üstünde.
  - `SelectionButton_9…_16` → `lower:1..8` (y ≈ 757).
  - Her iki satırı da x'e göre sırala.
- **Encoder'lar ve sahne düğmeleri:**
  - `Knob…Knob_8` (y ≈ 249) → `enc:1..8`, x'e göre sırala.
  - `Knob_11` → `jog` (mevcut kod da böyle kullanıyor).
  - `Knob_9` ve `Knob_10` → `volume` / `swingTempo` adayları. Konumdan çıkarım: `Knob_9` sol üstte (Volume, Sets/Setup/Learn/User'ın yanında), `Knob_10` sol ortada (Swing & Tempo, Lock/Stop/Mute/Solo'nun altında). Doğrulanmalı.
  - `SideButton…_8` → `scene:1..8` (y'ye göre, yukarıdan aşağı).
- **Sol üst ikon grubu (çıkarım, doğrulanmalı):** `file` = Sets, `settings` = Setup, `tutorial` = **Learn**, `stamp` = User. [M]'deki sıra Sets, Setup, Learn, User; Figma id'leriyle birebir uyuşuyor.
- **Sol orta grup:** `lock`, `sqaure` (= Stop Clip), `mute`, `solo` → [M] Lock, Stop Clip, Mute, Solo sırasıyla uyumlu.
- **Sağ üst grup:** `track`, `mixer`, `player`, `layout` → [M] sırası "Main Track, Swap, Add, Device, Mix, Clip, Session Screen". Aday eşleme: `mixer` = Mix, `player` = Clip, `track` = Device?, `layout` = Session Screen?. `add` = Add, `replace` = Swap (IconButton). Doğrulanmalı.
- **Sağ büyük ikonlar:** `icon-big-pads` / `icon-big-tracks` = Note / Session Pad adayları. `icon-big-focus` = Capture adayı (RecordControls grubunda). `Tempo` grubundaki `icon/quantize` ikonu Metronome da olabilir. Doğrulanmalı.
- **Doğrulama yöntemi:** Geçici bir debug katmanı her adayın bbox'ını id etiketiyle çizer, [M §1.2.1] "Push's Controls" görseliyle karşılaştırılır. Kesinleşmeyen kontrol öğreticide kullanılmaz.

---

## 10. Kabul kriterleri / test listesi

1. Menüden 4 modun her biri doğrudan açılıyor. `#seviye-2` doğrudan Seviye 2'yi başlatıyor. Tarayıcı Geri'si menüye dönüyor.
2. Öğretici her bölüme İçindekiler'den atlanabiliyor. Bölüm `setup()` sonrası koşullar ilk durumda **yanlış** (örn. 4.1'de view Mix). Hiçbir adım açılır açılmaz kendiliğinden tamamlanmıyor (birim testi: her adım için `check(setupState)` false olmalı).
3. Kilitli kontrole basılınca ses/işlem yok, geri bildirim satırı değişiyor. Volume ve Play her zaman çalışıyor.
4. İpucu kademeleri 8 sn / 20 sn ve 2 / 4 yanlış eşiklerinde tetikleniyor. `prefers-reduced-motion`'da titreşim yok.
5. Sayfa yenilenince öğretici kaldığı adımdan devam ediyor. `İlerlemeyi sıfırla` her şeyi temizliyor. Gizli modda (localStorage hatası) sayfa çökmüyor.
6. Klavye: hotspot'lar Tab ile geziliyor. Enter/Space = bas; basılı tutma keydown/keyup ile ölçülüyor. Odaklı encoder'da ↑/↓ = ±1 detent. `aria-live` talimatları okunuyor.
7. Dokunmatik: pad'ler multi-touch (Pointer Events, `touch-action: none` pad katmanında). Akor adımı (1.6) iki elle çalışıyor.
8. Türkçe metinler template literal içinde; kesme işaretleri (`Push 3'ün`) script'i bozmuyor.
9. Yeni CSS yalnızca token kullanıyor: radius 0; gradient / !important / backdrop-filter yok.

## BULGULAR
- [resmi/yuksek] Push 3 ilk açılışta Standalone Mode'da başlar ve 'kısa bir onboarding tutorial' bazı özellikleri tanıtır. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Push 3'te bir Learn düğmesi var: Push'un yeni özellikleri hakkında ders başlatır, video ve kılavuz bağlantıları QR kodla verilir, zamanla yeni dersler eklenir. Push Control Reference sırası: Sets, Setup, Learn, User, Volume Encoder, Undo, Save, Lock, Stop Clip, Mute, Solo, Swing and Tempo Encoder... (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Live 12.3 ile Push 3 ilk kez çalıştırıldığında yeni Push özelliklerini gösteren bir onboarding dersi açılır. (https://www.ableton.com/en/release-notes/push-12/)
- [resmi/yuksek] Learn Push (Push 3) sayfası 12 videodan oluşur: Overview, Switching from Standalone to Control Mode, Authorizing and Updating, Installing Packs, Transferring Files and Sets, Using the Audio Interface, ADAT, Link, MIDI, Pad Sensitivity and Expression Settings, Warping Audio, Expressive Pads. Seri kurulum ağırlıklı. (https://www.ableton.com/en/push/learn-push/)
- [resmi/yuksek] Learn Push 2 (yalnızca Push 2) video sırası davulla başlar (Step sequencing beats, Playing drums...), sonra melodi (Play melodies, Play chords, Chromatic Note Mode, Melodic Step Sequencer, 32-Note), sonra sampling, Session, miks ve otomasyon gelir. (https://www.ableton.com/en/help/learn-push-2/)
- [resmi/yuksek] Varsayılan 64 Notes dizilimi C majördür. Sol alt pad C1'dir; yukarı her pad bir dörtlü, sağa her pad gamdaki bir sonraki notadır. Triad için 'bu şekli ızgarada herhangi bir yerde dene' önerilir. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Scale menüsünde kök nota üst ve alt display düğmeleriyle, gam encoder'lar veya Session D-pad ile seçilir. En soldaki encoder 4ths/3rds/Sequential seçer, en soldaki alt düğme In Key/Chromatic, en sağdaki alt düğme Fixed'i değiştirir. Fixed açıkken sol alt pad C (yoksa en yakın nota) olur; kapalıyken kök notadır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [kod/orta] Push script'lerinde kök nota düğmeleri beşliler çemberi sırasındadır (C G D A E B / F B♭ E♭ A♭ D♭ G♭). Gam listesi 4 satırlık sütunlardır; D-pad ▲/▼ ±1, ◀/▶ ±4 kaydırır. Layout'lar: 4ths (interval 3), 3rds (2), Sequential. MIDI 36 'C1' diye adlandırılır. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/melodic_pattern.py)
- [kod/orta] Push 2 skin'inde melodik pad renkleri: NoteBase (kök) = seçili track rengi, NoteScale = beyaz, NoteNotScale = siyah (sönük). (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/skin_default.py)
- [resmi/yuksek] Layout düğmesi melodik track'te 64 Notes / Melodic Sequencer / Melodic Sequencer + 32 Notes, Drum Rack'te 64 Pads / Loop Selector / 16 Velocities arasında geçer. 4ths/3rds/Sequential ise Scale menüsündedir. Sitedeki mevcut Layout açıklaması bu yüzden hatalı. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Loop Selector'da 16 drum pad sol altta 4x4 dizilir. Renkler: track rengi = ses var, gri = boş, yeşil = çalıyor, beyaz = seçili, koyu mavi = solo, koyu track rengi = mute. Adım eklenince çalma başlar; Select + pad ses çıkarmadan seçer; Delete + pad o pad'in adımlarını siler; Mute + adım susturur. 1/16'da iki sayfa = 2 ölçü. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Repeat aralıkları sahne düğmelerindedir: 1/4, 1/4t, 1/8, 1/8t, 1/16, 1/16t, 1/32, 1/32t. Repeat açıkken düğme yanıp söner, seçili rate yeşil yanar. Kısa basış açık bırakır, basılı tutmak momentary çalışır. Accent açıkken tüm notalar velocity 127 olur. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Swing and Tempo encoder: dokunmak hangisinin seçili olduğunu gösterir, basmak Tempo/Swing arasında geçer. Tempo 1 BPM adım (Shift ile 0.1), Swing %1 adım, %0–100. Tap Tempo 4/4'te dört dokunuşla çalmayı başlatır. Volume encoder 1 dB adım (Shift ile 0.1); basış Main/Headphones/Main track/Cue arasında geçer, açılışta Main seçilidir. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Record: 1. basış kayıt, 2. basış kaydı durdurur ve çalma sürer, 3. basış overdub. Count-in sırasında yanıp söner, sonra düz kırmızı yanar. Capture, çalınan notaları yeni bir MIDI clip'e kaydedip hemen çalar ve tempoyu algılar. Quantize basınca uygulanır, basılı tutunca Swing Amount / Quantize To / Quantize Amount / Rec. Quantize açılır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [kod/orta] Fixed Length seçenekleri 1 Beat, 2 Beats, 1 Bar, 2 Bars, 4 Bars, 8 Bars, 16 Bars, 32 Bars. Varsayılan seçenek indeksi 2 Bars. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/fixed_length.py)
- [resmi/yuksek] Session Pad Mode'da her sütun bir track, her pad bir clip'tir. Yanıp sönen yeşil = kuyrukta; boş pad'e basmak o track'i durdurur. Note Mode'dayken Session basılı tutulursa geçici olarak Session'a geçilir (tersi de geçerli). (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [resmi/yuksek] Device View'da cihaz adının üstündeki display düğmesi parametre sekmelerini gösterir; sekmeler alt display düğmeleriyle seçilir. Ekranda görünen parametreyi genelde hemen üstündeki encoder kontrol eder. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-08-20/push3-manual-en.pdf)
- [kod/orta] Push 2'de Wavetable (InstrumentVector) bankaları: Main (Oscillator 1/2/S/Mix, Table, Position, Filter Type, Frequency, Resonance, Mod Time, Mod Amt), Oscillators, Filters, Global, Envelopes, LFOs, Matrix, MIDI. Seçenekler: Osc/Sub, Filter Switch, Filter, Add to Matrix, Slope 12/24 dB, LFO Sync Hz/Sync, Go to Amp Env/Env 2/Env 3/LFO 1/LFO 2. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/custom_bank_definitions.py)
- [kod/orta] Sitedeki Figma Push 3 çiziminin LCD katmanı Wavetable Main bankasına uyuyor: 'Oscillator' ayarı ve seçenekleri 1, 2, S, Mix; 'Graph'; 'Mod Time 26 %'. Bu, P2S bank düzeninin Push 3 ekranında da kullanıldığını destekliyor. (file:///Users/berkayer/site/assets/img/push3-device.svg)
- [resmi/yuksek] Ableton, Wavetable'ı 'Push'tan derin ses tasarımı için tasarlanmış ilk synth' olarak tanıtıyor; Push ekranında ayrıntılı wavetable görselleri var. (https://www.ableton.com/en/packs/wavetable/)
- [resmi/yuksek] Wavetable: iki wavetable osilatörü + Sub (Tone %0 = sinüs, Octave −1/−2). Osilatör efektleri FM (Amt/Tune), Classic (PW/Sync), Modern (Warp/Fold). Filtre routing Serial/Parallel/Split. Amp/Env 2/Env 3 zarfları slope'lu; 2 LFO; Matrix; Unison modları Classic, Shimmer, Noise, Phase Sync, Position spread, Random note. (https://www.ableton.com/en/manual/live-instrument-reference/)
- [kod/yuksek] Learning Synths içeriği lesson.json'dadır. Bölümler: get-started, making-changes, synth-basics, envelopes (8 sayfa), lfos, oscillators, filters, recipes (18), learning-more. Her sayfa chunks[] (markdown + embed) olarak kuruludur; 'highlighted' talimat, 'centered caption' eylem cümlesi, 'lock' ile kilitlenen parametreler, preset başlangıç sesi, Next/Prev footer ve 'Open in Playground' düğmesi kullanılır. (https://learningsynths.ableton.com/content/lessons/en/synthesis/lesson.json)
- [resmi/yuksek] Learning Music: Beats, Notes and Scales (6 sayfa), Chords, Basslines, Melodies, Song structure bölümleri, ardından The Playground ve Advanced topics. Başlıkta '6/6' tarzı ilerleme ve 'Next: <sayfa adı> ›' gezinmesi var; her bölüm 'Play with …' serbest sayfasıyla biter. (https://learningmusic.ableton.com/notes-and-scales/play-with-notes-and-scales.html)
- [ikincil/yuksek] 'PUSH 3 - Learn It In 1 Hour!' (Meta Mind Music) bölüm sırası: Interface → Modes → Configurations → Settings → Connectivity → Sets → Devices and Tracks → Rhythm Instrument → Melodic Instrument → MPE → Melodic Sequencer → Loop Length → Recording/Editing MIDI → Audio → Samples → Automation → Mixing → Session View. (https://www.youtube.com/watch?v=TjC5CjRGPOg)
- [ikincil/orta] Push Patterns'in 'Learn Ableton Push 3 - The Step-By-Step Guide' kursu 3+ saattir ve her bölümde alıştırma içerir; eğitmen Londra'da üniversitelerde Push dersi veriyor. (https://www.youtube.com/watch?v=Yvglc2AqBRc)
- [ikincil/orta] MusicRadar'ın Push 3 ipuçları: görünüm/layout düğmelerini basılı tutarak momentary kullanım, Quantize'ı basılı tutup pad'e basarak drum başına swing, Shift + track düğmesiyle renk, Freeze/Flatten. (https://www.musicradar.com/news/10-tips-ableton-push-3)
- [resmi/yuksek] Push 2 MIDI şemasında sahne düğmeleri CC 43 (scene 1, üst) ile CC 36 (scene 8, alt) arasındadır. Ayrı adlandırılmış Scale (58), Layout (31), Repeat (56), Accent (57), Note (50), Session (51) düğmeleri vardır. (https://github.com/Ableton/push-interface/blob/master/doc/AbletonPush2MIDIDisplayInterface.asc)
- [kod/yuksek] Mevcut ders-push3.html: TASKS 27 öğe içeriyor ama HTML '1 / 26' ve '26 kontrol' diyor. Seviye 1 bitince Seviye 2'ye zorunlu geçiliyor, localStorage kullanılmıyor. Seviye 2'nin Scale görevi (Scale'e basarak listede dolaşma) ve Swing görevi (8 track encoder'ı) gerçek Push davranışıyla uyuşmuyor. (file:///Users/berkayer/site/ders-push3.html)

## BELIRSIZ
- Push 3'ün yerleşik onboarding'inin adım adım içeriği (ekran metinleri, sırası, hangi düğmelere bastırdığı) resmi kaynaklarda yok. help.ableton.com'un kurulum makalesine Cloudflare yüzünden erişilemedi. Bir arama özetindeki 'Welcome to Push → Next → kulaklık/volume' akışı doğrulanamadı.
- Learn düğmesindeki derslerin güncel listesi doğrulanamadı; yalnızca işlevi ve 12.3 onboarding dersinin varlığı biliniyor.
- Wavetable banka düzeni Push 2 script'inden (Live 12.4, resmi olmayan decompile) alındı. Push 3'ün kapalı kaynak arayüzünde aynı olduğu çıkarımdır; Figma LCD çizimi bunu destekliyor ama kesin değil.
- Seçenek düğmelerinin (Osc, Filter Switch, Add to Matrix vb.) hangi üst display düğmesine düştüğü ve Scale menüsünde C…B / F…G♭'nin tam olarak 2–7. düğmelere oturduğu doğrulanamadı (kod + kılavuzdan çıkarım).
- Repeat rate'lerinin yukarıdan aşağıya 1/4 → 1/32t olduğu kılavuzdaki sıradan ve 3. taraf dokümandan çıkarıldı. Script'teki liste indeksleri ters eşleme ihtimali bırakıyor; Push 3 fotoğrafıyla doğrulanmalı.
- Push 3'te varsayılan Repeat rate'i (script'lerde 1/16 ve 1/8 değerleri görülüyor), varsayılan Quantize To / Amount ve varsayılan count-in doğrulanamadı.
- Tap ile hold arasındaki ms eşiği Ableton belgelerinde yok; spesifikasyondaki 300 ms bizim seçimimiz.
- Fixed Length açıkken kaydın seçilen uzunluk sonunda kendiliğinden bitip döngüye girmesi kılavuzda açıkça yazmıyor (Live davranışından çıkarım).
- SVG id eşlemeleri çıkarımdır: tutorial = Learn, file/settings/stamp = Sets/Setup/User, track/mixer/player/layout = Device/Mix/Clip/Session Screen?, icon-big-pads/icon-big-tracks = Note/Session?, icon-big-focus = Capture?, Knob_9/Knob_10 = Volume/Swing & Tempo?. Debug katmanıyla kılavuzdaki 'Push's Controls' görseline karşı doğrulanmalı.
- Learning Synths ve Learning Music'in chunk/sayfa yapısı doğrudan okundu. Etkileşimli bileşenlerin tam görsel davranışı (animasyon, zamanlama) yalnızca JSON'dan çıkarıldı.
- Live 12'nin tam gam listesi ve sırası bu konuda doğrulanmadı (Scale konusuna bırakıldı). Öğretici yalnızca Major/Minor kullanıyor.
- Push 3'te 'Welcome'/splash ekranının gerçek görünümü bilinmiyor; 0.1'deki LCD açılış metni bizim tasarımımız ve öyle etiketlenmeli.