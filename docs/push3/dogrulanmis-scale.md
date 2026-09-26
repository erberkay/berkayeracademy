Bu bölüm önceki taslağın doğrulanmış ve düzeltilmiş halidir.

# Push 3 Note Modu + Scale Modu: doğrulanmış, uygulamaya hazır spesifikasyon (rev. 2)

> **Kaynak hiyerarşisi**
> - **[P3]** Push 3 kılavuzu PDF 2024-11-05, s.72–83 ve 139–143. Metni pdftotext ile kendim okudum.
> - **[RN]** Push release notes, 2.0–2.4.6.
> - **[P2M]** Live 12 "Using Push 2".
> - **[KOD]** Live 12 pushbase/Push2 script'leri (decompile).
>
> Push 3 script'i herkese açık değil. Formüller **[KOD]**'dan alındı ve **[P3]** metniyle tutarlı.

## 0. Varsayılanlar
| Öğe | Değer |
|---|---|
| Enstrümanlı MIDI track seçilince düzen | 64 Notes [P3 s.73] |
| Varsayılan kök / gam | C / Major. Liste Live'dan gelir: `SCALES[0]` |
| In Key | açık |
| Fixed | kapalı |
| Layout | 4ths (`interval=3`) |
| Sol alt pad | C1 = MIDI 36 |
| Nota adı | `NOTE_NAMES[m%12] + (floor(m/12)−2)` → C3 = 60, C-2 = 0, G8 = 127 |
| NOTE_NAMES | C, D♭, D, E♭, E, F, G♭, G, A♭, A, B♭, B |
| Pad koordinatı | x = 0..7 soldan sağa, y = 0..7 alttan üste |

## 1. Scale menüsü
- **Açma/kapama.** Kısa basış menüyü açar/kapar. Basılı tutunca (≥0,3 s) menü yalnızca basılı kaldığı sürece açık kalır.
- **Nerede çalışır.** Note Mode'da. Push 2.3'ten beri audio track'te de açılır [RN].
- **Ekran dizilimi (8 sütun):**
  - **Sütun 1:** Encoder 1 = Layout. Sıra `4ths → 3rds → Sequential`, clamp uygulanır, wrap yok. Alt düğme 1 = **In Key ⇄ Chromatic**; LED iki durumda da beyaz.
  - **Sütun 2–7, kök notalar:** Üst düğmeler 2–7 = **C G D A E B**. Alt düğmeler 2–7 = **F B♭ E♭ A♭ D♭ G♭**.
    - `ROOT_NOTES=[0,7,2,9,4,11,5,10,3,8,1,6]`; indeks 0–5 üst sıra, 6–11 alt sıra.
    - Seçili kök beyaz, diğerleri koyu gri.
  - **Sütun 2–7, gam listesi:** Encoder 2–7 her tıkta ±1 kaydırır. Liste 4 satırlı, sütun sütun dolar; ekranda 6 sütun görünür.
  - **D-pad:** ↑ −1, ↓ +1, ← −4, → +4. clamp 0..34. Uçtaki ok devre dışı ve koyu gri.
  - **Sütun 8:** Alt düğme 8 = **Fixed**; açıkken beyaz, kapalıyken koyu gri. "+ Tuning" bir üst ekran düğmesidir (Push 2.2+), konumu doğrulanamadı; emülatörde üst düğme 8 önerilir. Encoder 8 = Direction yalnızca Push 2'de var; Push 3 kılavuzunda yok, emülatöre koymayın.
- **Seçili gam kutusu:** ters renk (açık zemin, koyu yazı). Push 2.2'den beri vurgu clip renginde [RN].

## 2. Gam listesi (35 gam, Live 12 sırası)
- **Ad ve sıra:** 3 bağımsız kaynakta aynı.
- **Aralıklar:** Live'ın `scale_intervals` değeriyle karşılaştırılan bir referansta aynı.

| # | Ad | Aralıklar |
|---|---|---|
| 1 | Major | 0 2 4 5 7 9 11 |
| 2 | Minor | 0 2 3 5 7 8 10 |
| 3 | Dorian | 0 2 3 5 7 9 10 |
| 4 | Mixolydian | 0 2 4 5 7 9 10 |
| 5 | Lydian | 0 2 4 6 7 9 11 |
| 6 | Phrygian | 0 1 3 5 7 8 10 |
| 7 | Locrian | 0 1 3 5 6 8 10 |
| 8 | Whole Tone | 0 2 4 6 8 10 |
| 9 | Half-whole Dim. | 0 1 3 4 6 7 9 10 |
| 10 | Whole-half Dim. | 0 2 3 5 6 8 9 11 |
| 11 | Minor Blues | 0 3 5 6 7 10 |
| 12 | Minor Pentatonic | 0 3 5 7 10 |
| 13 | Major Pentatonic | 0 2 4 7 9 |
| 14 | Harmonic Minor | 0 2 3 5 7 8 11 |
| 15 | Harmonic Major | 0 2 4 5 7 8 11 |
| 16 | Dorian #4 | 0 2 3 6 7 9 10 |
| 17 | Phrygian Dominant | 0 1 4 5 7 8 10 |
| 18 | Melodic Minor | 0 2 3 5 7 9 11 |
| 19 | Lydian Augmented | 0 2 4 6 8 9 11 |
| 20 | Lydian Dominant | 0 2 4 6 7 9 10 |
| 21 | Super Locrian | 0 1 3 4 6 8 10 |
| 22 | 8-Tone Spanish | 0 1 3 4 5 6 8 10 |
| 23 | Bhairav | 0 1 4 5 7 8 11 |
| 24 | Hungarian Minor | 0 2 3 6 7 8 11 |
| 25 | Hirajoshi | 0 2 3 7 8 |
| 26 | In-Sen | 0 1 5 7 10 |
| 27 | Iwato | 0 1 5 6 10 |
| 28 | Kumoi | 0 2 3 7 9 |
| 29 | Pelog Selisir | 0 1 3 7 8 |
| 30 | Pelog Tembung | 0 1 5 7 8 |
| 31 | Messiaen 3 | 0 2 3 4 6 7 8 10 11 |
| 32 | Messiaen 4 | 0 1 2 5 6 7 8 11 |
| 33 | Messiaen 5 | 0 1 5 6 7 11 |
| 34 | Messiaen 6 | 0 2 4 5 6 8 10 11 |
| 35 | Messiaen 7 | 0 1 2 3 5 6 7 8 9 11 |

## 3. In Key / Chromatic / Fixed
- **In Key:** yalnızca gam notaları var ("folded").
- **Chromatic:** 12 notanın hepsi var. Gam dışı pad'ler sönük ama çalar; basınca yeşil yanar.
- **Fixed Off:** sol alt pad = seçili kökün (şu anki oktavdaki) notası.
- **Fixed On:** sol alt = C1 veya üstündeki ilk gam notası (kod davranışı).
  - Kılavuz "C yoksa C'ye en yakın nota" diyor; bu, aşağıdaki notanın daha yakın olduğu gamlarda koddan ayrışır. Emülatör kodu izlesin.
  - Örnekler: D major → C♯1 (37); A minor → C1 (36); E minor pentatonik → D1 (38).
- **Chromatic + Fixed:** sol alt her zaman C.

## 4. Pad → MIDI (çekirdek)
```js
const NOTE_NAMES=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const ROOT_NOTES=[0,7,2,9,4,11,5,10,3,8,1,6];
const LAYOUTS=[{name:'4ths',iv:3},{name:'3rds',iv:2},{name:'Sequential',iv:null}];
const CHROMA=[0,2,4,5,7,9,10,11];
const n   = s => s.scale.intervals.length;
const L   = s => s.inKey ? n(s) : 12;                     // page_length
const pcs = s => new Set(s.scale.intervals.map(i => (i + s.root) % 12));
const f   = s => s.inKey ? [...pcs(s)].sort((a,b) => a-b).indexOf(s.root) : s.root;
const P   = s => s.fixed ? 0 : f(s);                      // page_offset
const posCount = s => s.inKey ? P(s) + n(s) * (s.root < 8 ? 11 : 10) : 139;
const R   = s => { const iv = LAYOUTS[s.layoutIndex].iv;
  return iv === null ? (s.inKey ? n(s) : 8) : (s.inKey ? iv : CHROMA[iv]); };
const W   = s => (LAYOUTS[s.layoutIndex].iv === null && s.inKey) ? n(s) + 1 : 8;
function A(s){ const set = pcs(s), a = [];
  for (let m = 0; m < 200; m++) if (!s.inKey || set.has(m % 12)) a.push(m); return a; }
function padNote(s, x, y){ if (x >= W(s)) return null;
  const m = A(s)[Math.round(s.position) + x + R(s) * y];
  return (m === undefined || m > 127) ? null : m; }
function padColor(s, m){ if (m === null) return 'off';
  const pc = m % 12; return pc === s.root ? 'root' : (pcs(s).has(pc) ? 'scale' : 'off'); }
// Chromatic'te 'off' + m !== null → sönük ama çalar.
```
- **Varsayılan konum:** `position = 3·L + P`. C major'da 21, Chromatic C'de 36.
- **Durum değişince** (kök, gam, In Key, Fixed): `p' = P' + (p − P_old)·L'/L_old`; `if (p' ≥ posCount') p' −= L'`; kullanırken `round()`.
- **Satır adımı R:**

| Layout | In Key | Chromatic |
|---|---|---|
| 4ths | 3 derece | 5 yarım ton |
| 3rds | 2 derece | 4 yarım ton |
| Sequential | n derece (1 oktav) | 8 yarım ton |

- **Sequential + In Key, genişlik n+1:**
  - 7 notalı gamda satır sonundaki kök, üst satırın başında tekrar eder. Kod böyle; Push 2 kılavuzu "no duplicated notes" diyor, çelişki.
  - 5 notalı gamda sütun 6–7 sönük; 6 notalıda sütun 7 sönük.

### Test vektörleri (hepsi elle doğrulandı)
- **C Major / In Key / 4ths (p=21):** satır 0 = 36 38 40 41 43 45 47 48; satır 1 = 41 43 45 47 48 50 52 53; satır 7 = 72…84. Sağ üst = 84 (C5).
- **Sol alt C3 (p=35, Octave ▲×2):** ikinci satırın ilk pad'i **F3 = 65**. Aynı durumda 3rds'te E3 = 64, Sequential'da C4 = 72.
- **Majör akor:** (0,0) + (2,0) + (1,1).
- **D Minor (C'den geçiş):** p=22, satır 0 = 38 40 41 43 45 46 48 50.
- **A Minor:** Fixed Off → 45 (p=26); Fixed On → 36 (p=21).
- **D Major Fixed On:** 37.
- **Chromatic C:**
  - 4ths: 36 + x + 5y; sağ üst 78.
  - 3rds: 36 + x + 4y.
  - Sequential: 36 + x + 8y.
- **C Minor Pentatonic Sequential:** p=15, satır 0 = 36 39 41 43 46 48; sütun 6–7 sönük.
- **C Major In Key p=70:** 120 122 124 125 127, sonrası geçersiz.

## 5. Octave / Shift+Octave / Touch strip
```
rem = ((p − P) % L + L) % L
Up:   p += L − rem
Down: p −= (rem === 0 ? L : rem)
Shift+Up/Down: p ± 1
p = clamp(p, 0, posCount − L)
LED Up   = p < posCount − L
LED Down = p > 0        // ek oktav yoksa sönük [P3]
```
- **C major aralığı:** sol alt C-2…C8. Varsayılandan 3 kez aşağı, 7 kez yukarı.
- **Kök A♭–B:** 10 oktav.
- **Chromatic:** p = 0…127.
- **Bildirim:** `Play C1 to C5` (Push 2 script metni). Push 3'teki metin doğrulanamadı.
- **Touch strip:**
  - Varsayılan pitch bend. Select basılıyken strip'e dokunmak pitch ⇄ mod geçişi yapar [P3 s.140].
  - Shift + strip = oktav kaydırma [KOD].
  - Melodic Sequencer'da pitch/mod yok. Strip Shift'siz nota nota, Shift ile oktav oktav kaydırır [P3].

## 6. Renkler
| Durum | Renk |
|---|---|
| 64 Notes: kök | track rengi |
| 64 Notes: gam içi | beyaz |
| 64 Notes: gam dışı / geçersiz | sönük |
| Basılı | yeşil |
| Kayıtta basılı | kırmızı |

- **Feedback:** nota numarası üzerinden çalışır, aynı perdedeki tüm pad'ler birlikte yanar (çıkarım).
- **Melodic Sequencer satır zemini:** kök satırı açık gri ("white row"), gam içi satırlar koyu gri, gam dışı satırlar sönük.
- **Melodic Sequencer adımları:**
  - nota olan adım = clip rengi (velocity ≥120 tam; ≥60 bir kademe koyu; altı iki kademe koyu)
  - **seçili nota = clip renginin açık tonu** [P3 s.78]
  - muted = açık gri
  - boş = koyu gri
  - playhead = yeşil, kayıtta kırmızı
- **Melodic Sequencer + 32 Notes, sequencer yarısı:** clip rengi / yeşil / **beyaz = seçili** / açık gri = muted / gri = boş / triplet'te sağdaki 2 sütun sönük.
- **32 Notes yarısı:** kök = track rengi, seçili = açık track tonu, çalan = yeşil, gam içi = beyaz. Push 2.4 bu tonları güncelledi, yeni değerler bilinmiyor.
- **Loop pad'leri:** sönük = loop dışı, gri = loop içi ama görünmüyor, beyaz = görünen, yeşil = çalan, kırmızı = kayıtta.
- **Push 2 LED paleti (yalnız referans):** 122 = #CCCCCC, 123 = #404040, 124 = #141414.

## 7. Layout düğmesi
- **Döngü:** 64 Notes → Melodic Sequencer → Melodic Sequencer + 32 Notes → 64 Notes [P3 s.81, s.142]. Macro Variations ve XYZ gibi Rack'e bağlı düzenler de döngüye katılır; sıraları doğrulanamadı.
- **Bildirimler:** `Melodic: 64 Notes`, `Melodic: Sequencer`, `Melodic: Sequencer + 32 Notes`, `Loop Selector`. Push 2.3'ten beri sayfa göstergesi var: sıra/toplam [RN].
- **Kısa bas:** sonraki düzen; kilit varsa kilidi açar.
- **Basılı tut:**
  - Push 2.3.5+ [RN]: ekranda düzen seçme menüsü. Emülatörde bunu kullanın.
  - [P3] 2024: loop pad'leri anlık görünür (Sequencer'da üst sıra, 32 Notes'ta 5. sıra).
- **Shift + Layout:** Loop Selector kilitlenir; Layout LED'i Alert olur; `…: Locked` bildirimi çıkar. Kilit track başına saklanır.
- **Melodic Sequencer:**
  - 8 satır = `A[p+y]`.
  - Çözünürlük Scene düğmeleriyle (yukarıdan aşağı): 1/32t, 1/32, 1/16t, **1/16 (varsayılan)**, 1/8t, 1/8, 1/4t, 1/4.
  - Sayfa = 8 adım (1/16'da 2 vuruş). Triplet'te 6 adım.
  - Pad'e bas = ekle; transport duruyorsa başlatır. Tekrar bas = sil.
  - Mute + pad = adımı deaktive et. Delete = clip'i sil.
  - Adımı tut → Nudge / Length / Fine / Velocity / Vel Range / Probability.
  - Varsayılan velocity 100, Accent açıkken 127.
- **Loop Selector:**
  - tut + dokun = loop aralığı; çift dokunuş = 1 sayfa
  - tek dokunuş = görünümü o sayfaya kilitle; loop dışı bir sayfaya tek dokunuş loop'u o sayfa yapar
  - Page ◀▶ = sayfa değiştir; basılı tutmak auto-follow'u geri açar
  - Duplicate + kaynak + hedef = kopyala (üstüne ekler); Delete + sayfa = temizle
- **Melodic Sequencer + 32 Notes:**
  - Üst 4 satır = 32 adım.
  - Alt 4 satır = aynı nota formülü (y = 0..3), ayrı bir position. Varsayılan seçili nota 36.
  - Pad'e basmak seçer ve çalar; Select + pad sessiz seçer.
  - Adıma dokunmak seçili notaları ekler.

## 8. Live 12 senkronu
- **Tek kaynak:** `scaleState {root 0–11, scaleName}` ⇄ Song.root_note / Song.scale_name. Live'daki değişiklik Push'a, Push'taki Live'a yansır.
- **Emülatör:** LCD'de "Clip Scale: D Minor" etiketi.
- **Kalıcılık:**
  - Layout (interval) Set'e yazılır.
  - In Key ve Fixed kodda global tercihte tutulur, ama kılavuz "Set ile kaydedilir" diyor. Emülatörde hepsini proje/localStorage'da tutun.

## 9. Olay tablosu (Scale menüsü açıkken)
| Girdi | İşlev |
|---|---|
| Üst düğme 2–7 | `root = ROOT_NOTES[i−2]` |
| Alt düğme 2–7 | `root = ROOT_NOTES[4+i]`. i = 2..7 için indeks 6..11 (formül `ROOT_NOTES[6+(i−2)]` ile aynı) |
| Alt düğme 1 | In Key ⇄ Chromatic |
| Alt düğme 8 | Fixed ⇄ |
| Encoder 1 | layout ±1, clamp 0..2 |
| Encoder 2–7 | gam ±1, clamp 0..34 |
| D-pad | ±1 / ±4 |

Her değişiklikte sırasıyla: hizalama → pad nota ve renklerini yeniden hesapla → bildirim.

## CURUTULEN
- Melodic Sequencer'da (8x8, tam ekran) seçili adım/nota BEYAZ görünür (§6.3 'seçili → beyaz'). -> Push 3 kılavuzu 7.3 (s.78): 'Selected notes are represented by a lighter version of the clip's color.' Tam ekran Melodic Sequencer'da seçili nota clip renginin açık tonunda görünür. 'White = step is selected' ifadesi yalnızca Melodic Sequencer + 32 Notes'un sequencer yarısı için yazılmış (s.82). (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- Fixed On'da kodun davranışı (sol alt = C'den yukarı doğru ilk gam notası) kılavuzdaki 'C yoksa C'ye en yakın nota' ifadesiyle aynıdır. -> İkisi her durumda aynı sonucu vermez. Kılavuz 'nearest note to C' diyor. Kodda p=3L seçiliyor, bu da C1 veya üstündeki ilk gam notasını verir. Eşitlik durumunda (D major: B0 ve C♯1 eşit uzaklıkta) kod yukarıdakini, C♯1'i seçer. Aşağıdaki nota daha yakınsa sonuç ayrışır. Örnek: E Minor Pentatonic (E G A B D), Fixed On. Kılavuza göre B0 (35, 1 yarım ton), koda göre D1 (38). Emülatörde kodu izleyin (yukarı yönlü) ve bu farkı not edin. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/instrument_component.py)
- In Key + Sequential: 7 notalı gamda 8 sütunun hepsi dolu, son sütun bir üst oktavın kökü. (Kodla tutarlı, ama Ableton belgesiyle çelişen bir nokta atlanmış.) -> Kod (interval=n, width=n+1) bu davranışı verir: satır sonundaki kök, bir üst satırın başında tekrar çıkar. Live 12 'Using Push 2' kılavuzu ise Sequent için 'it has no duplicated notes' diyor. Push 3 kılavuzu bu konuda bir şey söylemiyor. Kod ile Push 2 metni çelişiyor. Emülatör kodu izlemeli, ama bu 'doğrulanamadı' olarak işaretlenmeli. (https://www.ableton.com/en/manual/using-push-2/)
- Kılavuz s.73'teki pad görseli ve s.75'teki Scale menüsü ekran görüntüsü (C G D A E B / F B♭ E♭ A♭ D♭ G♭, '3rds' seçili, 'Fixed off', 24 gam adı) 'birebir okundu'. -> Bu görselleri bağımsız olarak doğrulayamadım: PDF'teki ekran görüntüleri raster, tarayıcı erişimi de reddedildi. Kök düğme dizilimi kodla (ROOT_NOTES + push2.py düğme matrisi) doğrulandı. Gam sırası üç bağımsız üçüncü taraf listesiyle doğrulandı. Ekrandaki birebir tipografiyi, '3rds' seçimini ve 8. sütunun boş olmasını ise ayrıca teyit etmek gerekir. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- Push 3 64 Notes'ta kök = track rengi ifadesi 'manual' kaynaklı. -> Push 3 kılavuzu 'track's color = root' ifadesini yalnızca 32 Notes bölümünde (s.82) açıkça yazıyor. 64 Notes için kaynaklar: Live 12 'Using Push 2' kılavuzu (Push 2 için: 'The track's color — root note… White — in the scale') ve Push2 skin. Push 3 için de geçerli olduğu çok muhtemel, ama kaynak Push 2 metni. (https://www.ableton.com/en/manual/using-push-2/)
- Push 1 / Live 9 script'inde 25 gam var ve 'Pelog' karşılığı tabloda gösterilmemiş; Pelog Selisir/Tembung ≈ olarak işaretlenmiş. -> Live 9'daki 'Pelog' 6 notalıydı: [0,1,3,4,7,8]. Live 11/12'deki 'Pelog Selisir' [0,1,3,7,8] ve 'Pelog Tembung' [0,1,5,7,8] bundan farklı. Live 9 aralığını kullanmayın. Live 12 aralıkları, Live'ın scale_intervals değeriyle çalışma anında karşılaştırılan üçüncü taraf referansta tabloyla aynı. (https://github.com/gluon/AbletonLive9_RemoteScripts/blob/master/Push/consts.py)

## DOGRULANAN
- [Push 3 kılavuzu PDF s.73, pdftotext ile kendim okudum] Enstrümanlı MIDI track seçilince ızgara 64 Notes düzenine geçer. Varsayılan C major. Sol alt pad C1. Yukarı her pad bir 4'lü, sağa her pad gamdaki bir sonraki nota. https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf
- [Push 3 kılavuzu s.75] Kök nota üst/alt ekran düğmeleriyle, gam 'encoders or the Session D-pad' ile seçilir. En soldaki encoder düzeni seçer: 4ths / 3rds / Sequential. Kılavuzdaki yazım 'Sequential'. https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf
- [Push 3 kılavuzu s.76] En soldaki alt ekran düğmesi In Key/Chromatic değiştirir. Chromatic'te gam dışı notaların pad'leri söner ama çalar. En sağdaki alt ekran düğmesi Fixed'i açar/kapar. 'Scale options are saved with the Set'. https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf
- [Kod: pushbase/melodic_pattern.py] CIRCLE_OF_FIFTHS = [7k mod 12]. ROOT_NOTES = CoF[:6] + CoF[-1:5:-1], yani [0,7,2,9,4,11,5,10,3,8,1,6]. NOTE_NAMES bemollü yazılır. Nota adı = NOTE_NAMES[m%12] + (m//12 − 2), yani MIDI 60 = C3. SCALES = Live.Song.get_all_scales_ordered(); liste Push'ta değil, Live'da tutuluyor. https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/melodic_pattern.py
- [Kod: Push2/push2.py + pushbase/elements.py] Kök düğme matrisinin 1. satırı track_state_buttons_raw[1:-1] (CC 102–109, üst ekran düğmeleri 2–7), 2. satırı select_buttons_raw[1:-1] (CC 20–27, alt ekran düğmeleri 2–7). In Key = select_buttons_raw[0] (alt 1), Fixed = select_buttons_raw[-1] (alt 8), Layout = encoder 1, Direction = encoder 8, gam = encoder 2–7, D-pad = gam gezinme. Bu dağılım Push 3 kılavuzundaki metinle çelişmiyor. https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/push2.py
- [Kod: Push2/scales_component.py] Liste 4 satırlık. Down +1, Up −1, Right +4, Left −4, clamp uygulanıyor (wrap yok); uçtaki ok devre dışı ve NavigationDisabled = DARK_GREY. Encoder 2–7 değeri ±adım. Layout encoder'ı clamp(0..2): ('4ths',3), ('3rds',2), ('Sequential',None). In Key LED iki durumda da OptionOn (beyaz). Fixed açıkken beyaz, kapalıyken DARK_GREY. Scale düğmesi: pressed → aç/kapa toggle, released_delayed → kapat (basılı tutunca momentary). https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/scales_component.py
- [Kod: pushbase/instrument_component.py] Varsayılanlar: is_in_key=True, is_fixed=False (control-surface preferences'ta), interval=3 (Set verisi 'push-note-layout-interval'), is_horizontal=True. first_note = 3·page_length + page_offset. Chromatic satır adımı [0,2,4,5,7,9,10,11][interval]. Sequential + In Key: interval=n, width=n+1. Sequential + Chromatic: interval=8. position_count: In Key için offset + n·(kök<8 ? 11 : 10), Chromatic için 139. _align_first_note formülü spesifikasyondaki gibi. 'Play {start} to {end}' bildirimi var. https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/instrument_component.py
- [Kendi türetmem] A[p + x + R·y] sadeleştirmesi kodla cebirsel olarak denk: 12·floor(idx/n) + N[idx mod n] = A[idx+f], dolayısıyla MIDI = A[n·o + (p mod n) − f + x + R·y + f] = A[p + x + R·y]. Chromatic'te MIDI = p + x + R·y. Tüm test vektörlerini elle hesapladım ve tuttu: C major satır 0–7, sağ üst 84; D minor p=22 → 38…50; A minor Fixed Off 45, Fixed On 36; D major Fixed On 37; Chromatic 4ths sağ üst 78 (G♭4); C minor pentatonik Sequential satır 0 = 36,39,41,43,46,48 ve sütun 6–7 sönük; p=70 → 120,122,124,125,127 ve sonrası geçersiz.
- [Kod: ableton/v2/control_surface/components/slide.py] Octave: remainder = (p − page_offset) mod L. Up için +L−rem, Down için rem==0 ise −L, değilse −rem. clamp(0, posCount−L). Up LED p < posCount−L iken yanar, Down LED p > 0 iken yanar. Shift+Octave = scroll ±1 (push2.py'de scale_up/down_button = with_shift(octave)). Shift+touch strip = octave_strip. https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/ableton/v2/control_surface/components/slide.py
- Oktav sınırları hesapla doğrulandı. C Major In Key: posCount=77, p ∈ [0,70], sol alt C-2…C8. Varsayılan p=21'den 3 kez aşağı, 7 kez yukarı gidilir. Chromatic'te p ∈ [0,127].
- [Kod: Push2/skin_default.py] Instrument: NoteBase = seçili track rengi, NoteScale = WHITE, NoteNotScale = BLACK, NoteInvalid = BLACK, Feedback = GREEN, FeedbackRecord = RED, SelectedNote = track rengi (shade_level=2). NoteEditor: NoteBase = LIGHT_GREY, NoteScale = DARK_GREY. Scales: OptionOn = WHITE, OptionOff = DARK_GREY. https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/skin_default.py
- [Push 2 MIDI doc] Sol alt pad nota 36, sağ üst 99. Palet: 122 = 204,204,204; 123 = 64,64,64; 124 = 20,20,20; 125 mavi; 126 yeşil. Yalnızca Push 2 için. https://github.com/Ableton/push-interface/blob/master/doc/AbletonPush2MIDIDisplayInterface.asc
- [Push 3 kılavuzu s.77–83] Melodic Sequencer: In Key'de her satır bir gam perdesi. Chromatic'te gam dışı satırlar sönük. Kök notası alttaki 'white row'da. Sütunlar Scenes düğmeleriyle seçilen çözünürlükte adımlar. Yeşil playhead, kayıtta kırmızı. Sayfa = 8 adım = 2 vuruş. Hold Layout → loop length pad'leri anlık görünür (Sequencer'da üst sıra, 32 Notes'ta 5. sıra). Shift+Layout kilitler, kilit track başına saklanır. 64 Notes'tan 32 Notes'a Layout'a iki kez basılarak gidilir. Loop pad renkleri: sönük/gri/beyaz/yeşil/kırmızı. 32 Notes pad renkleri: track rengi = kök, açık ton = seçili, yeşil = çalıyor, beyaz = gam içi. 32 Notes sequencer: clip rengi, yeşil, beyaz = seçili, açık gri = muted, gri = boş, triplet'te sağdaki 2 sütun sönük. https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf
- [Push 3 kılavuzu s.140] Touch strip instrument track'te varsayılan olarak pitch bend. 'hold Select and then tap the touch strip' ile pitch bend ⇄ mod wheel geçişi yapılır. Melodic Sequencer'da pitch bend/mod yok. s.142: Layout döngüsü melodik track'te '64 Notes, Melodic Sequencer, and Melodic Sequencer + 32 Notes'. Accent = tam velocity. https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf
- [Kod: pushbase/consts.py, note_layout_switcher.py, grid_resolution.py] Metinler: 'Melodic: 64 Notes', 'Melodic: Sequencer', 'Melodic: Sequencer + 32 Notes', 'Loop Selector'. Kilitlenince '<mesaj>: Locked', açılınca ': Unlocked'. Kilitliyken Layout LED'i 'DefaultButton.Alert'. Kilit, track verisinde 'alternative_mode_locked' olarak saklanıyor. QUANTIZATION_FACTOR = 24, DEFAULT_INDEX = 3 (1/16). https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/note_layout_switcher.py
- [Push release notes] Push 2.0: tuning desteği ve kök track renginde. Push 2.2: '+ Tuning upper display button', 'The Scales menu now uses the clip color', 16 Pitches, Expressive Chords. Push 2.3: 'The Scales menu is now available in audio tracks', layout bildirimine sayfa göstergesi, XYZ. Push 2.3.5: 'Holding the Layout button now opens a menu on the display for selecting one of the available layouts.' Push 2.4: 32 Notes'ta kök ve seçili nota renkleri güncellendi. https://www.ableton.com/en/release-notes/push-12/
- 35 gamın adları ve sırası birbirinden bağımsız üç kaynakta aynı çıktı: tolgazafer 'Ableton Scales.txt', cavi-ai live-scale-reference.mjs ve ClyphX Pro. cavi-ai dosyası aralıkları Live'ın Song.scale_intervals değeriyle çalışma anında karşılaştırıyor; 35 aralık dizisinin hepsi spesifikasyondaki tabloyla aynı. https://github.com/cavi-ai/ableton-mcp/blob/main/apps/ableton-mcp/src/live-scale-reference.mjs
- [Live 9 Push consts.py] Major…Spanish arası 25 gamın aralıkları kodda sabit. 'Diminished' = Half-whole, 'Minor Gypsy' = Phrygian Dominant, 'Hirojoshi' = Hirajoshi, 'Spanish' = 8-Tone Spanish; aralıklar tabloyla aynı. https://github.com/gluon/AbletonLive9_RemoteScripts/blob/master/Push/consts.py
- ŞÜPHECİ SORUNUN CEVABI: C Major, In Key, 4ths, sol alt pad C3 (MIDI 60, p=35; varsayılandan Octave ▲ ×2) ise ikinci satırın ilk pad'i F3 (MIDI 65) olur, yani 3 gam derecesi yukarısı = tam 4'lü. Karşılaştırma için: 3rds'te E3 (64). Sequential'da C4 (72); bu nota satır 0'ın son pad'inde de var. Chromatic 4ths'te F3 (65), Chromatic 3rds'te E3 (64), Chromatic Sequential'da A♭3 (68).

## HALA BELIRSIZ
- Push 3 kılavuzundaki ekran görüntülerini (s.73 pad düzeni, s.75 Scale menüsü) kendim göremedim: PDF görselleri raster, tarayıcı erişimi reddedildi. Ekrandaki birebir tipografi, varsayılan olarak '3rds' seçili görünüp görünmediği ve 8. sütunun içeriği doğrulanmadı.
- Sequential + In Key'de kök notanın tekrar edip etmediği: kod (width=n+1, interval=n) tekrar ettiriyor. Live 12 'Using Push 2' kılavuzu ise 'no duplicated notes' diyor. Push 3'teki gerçek davranış doğrulanamadı.
- Fixed On'da 'C'ye en yakın nota' (kılavuz) ile 'C1 ve üstündeki ilk gam notası' (kod) farkı, aşağıdaki notanın daha yakın olduğu gamlarda (örn. E minor pentatonik: B0 mu D1 mi) Push 3'te test edilmedi.
- Push 3'te '+ Tuning' üst ekran düğmesinin sütun konumu belirsiz.
- Push 3'te Direction (Vert./Horiz.) seçeneğinin olmadığı yalnızca kılavuzun bu seçenekten söz etmemesine dayanıyor.
- Push 2.3.5 sonrası 'Layout basılı tut = düzen menüsü' ile Loop Selector'ın anlık açılışının nasıl birlikte çalıştığı ve menünün görünümü belgelenmemiş.
- Push 3'ün LED paleti ve Push 2.4'teki yeni 32 Notes kök/seçili nota renk değerleri bilinmiyor.
- Octave değişiminde Push 3 ekranında çıkan metin ('Play C1 to C5' Push 2 script'inden) doğrulanamadı.
- Scale ayarlarının kalıcılığı çelişkili: kılavuz Set'e kaydedildiğini söylüyor, kodda In Key/Fixed global tercihte tutuluyor.
- Instrument Rack'lerde Macro Variations, XYZ ve Expressive Chords düzenlerinin Layout döngüsündeki sırası doğrulanamadı.
- Push 3 donanımındaki pad MIDI numaraları (36–99) yalnızca Push 2 dokümanından alındı.
- 25–35. gamların aralıkları resmi Ableton belgesinde yayınlanmamış. Kaynak, çalışma anında Live ile karşılaştırma yapan üçüncü taraf bir referans (cavi-ai). 'In-Sen' yazımı: ClyphX ve cavi-ai 'In-Sen', tolgazafer 'IN-sen'.