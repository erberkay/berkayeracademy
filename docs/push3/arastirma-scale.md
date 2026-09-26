# Push 3 Note Mode + Scale Mode — Uygulamaya Hazır Spesifikasyon

> **Kaynak katmanları (güven sırası):**
> 1. **Push 3 kullanım kılavuzu**: web (ableton.com/en/push/manual) ve PDF (2024-11-05 baskısı, bölüm 7 s.72–83, bölüm 17 s.139–143). Ekran görüntüleri Push 3'e ait.
> 2. **Push release notes** (Push 2.0 … 2.4.6 / Live 12.0 … 12.4.6; en yenisi 2026) ve Live 12 release notes.
> 3. **Live 12 kılavuzu "Using Push 2"**: aynı mantık, ama Push 2 için yazılmış.
> 4. **Ableton'ın Live 12 MIDI Remote Script'leri** (`pushbase/*`, `Push2/*`, gluon/AbletonLive12_MIDIRemoteScripts reposu, decompile edilmiş hali). Push 3'ün kontrol script'i herkese açık değil. Aşağıdaki **formüller Push 2/pushbase kodundan** alındı ve **Push 3 kılavuzundaki pad şemalarıyla sağlaması yapıldı**: s.73'teki 64 Notes görseli ve s.81'deki 32 Notes görselinde kök notaların konumları formülle birebir tutuyor.
>
> Push 2 ile Push 3 arasında fark olan yerler ayrıca işaretlendi (bkz. §11).

---

## 0. Temel kavramlar ve varsayılanlar

| Öğe | Değer | Kaynak |
|---|---|---|
| Enstrümanlı MIDI track seçilince pad düzeni | **64 Notes** | P3 manual s.73 |
| Varsayılan ton / gam | **C / Major** (`SCALES[0]`) | P3 manual s.73, `instrument_component.py` |
| Varsayılan mod | **In Key** açık, **Fixed** kapalı | manual s.75-76, kod: `is_in_key=True`, `is_fixed=False` |
| Varsayılan Layout | **4ths** (kodda `interval=3`) | manual, kod `push-note-layout-interval` varsayılanı 3 |
| Sol alt pad | **C1 = MIDI 36** | manual: "The bottom left pad plays C1" |
| Yukarı gidiş | her satır bir **4'lü** yukarı (In Key'de 3 gam derecesi) | manual s.73 |
| Sağa gidiş | gamdaki bir sonraki nota | manual s.73 |
| Nota adlandırma | `NOTE_NAMES[m % 12] + (floor(m/12) − 2)` → MIDI 60 = **C3**, MIDI 36 = C1, MIDI 0 = C-2 | `melodic_pattern.py: pitch_index_to_string` |
| Nota adları (bemol yazım) | `C, D♭, D, E♭, E, F, G♭, G, A♭, A, B♭, B` | `melodic_pattern.py: NOTE_NAMES` |
| Pad koordinatı (emülatör) | x = 0..7 soldan sağa, y = 0..7 alttan üste | kod `_invert_and_swap_coordinates` |
| Donanım pad MIDI notaları (User/ham) | sol alt 36 … sağ üst 99; `36 + 8y + x` | Push 2 MIDI doc (Push 3 için doğrulanamadı) |

---

## 1. Scale menüsü (Scale düğmesi)

### 1.1 Açma / kapama
- Scale **Note Mode'da** çalışır. Push 2.3 ile audio track'lerde de açılabiliyor.
- **Kısa bas** → menü açılır; tekrar kısa bas → kapanır (toggle). Kod: `_enter_dialog_mode`: aynı mod açıksa `None` yapar.
- **Basılı tut (>0.3 s)** → menü yalnızca basılıyken açık kalır (momentary). Kod: `released_delayed` → `_exit_dialog_mode`; `MOMENTARY_DELAY = 0.3 s`.

### 1.2 Ekran dizilimi (Push 3 kılavuz görseli, s.75)
Ekranda 8 sütun var, her sütunun üstünde 1 encoder + 1 üst ekran düğmesi, altında 1 alt ekran düğmesi.

| Sütun | Üst ekran düğmesi etiketi | Orta alan | Alt ekran düğmesi etiketi | Encoder |
|---|---|---|---|---|
| 1 | (etiket yok) | küçük başlık "Layout", büyük yazı seçili layout, örn. **`3rds`** beyaz, sonraki `Sequential` gri ve kırpık | **`In Key` / `Chromatic`** (seçili beyaz, diğeri gri) | **Encoder 1 = Layout** |
| 2 | **C** | gam listesi sütunu | **F** | gam listesinde ±1 |
| 3 | **G** | gam listesi sütunu | **B♭** | gam ±1 |
| 4 | **D** | gam listesi sütunu | **E♭** | gam ±1 |
| 5 | **A** | gam listesi sütunu | **A♭** | gam ±1 |
| 6 | **E** | gam listesi sütunu | **D♭** | gam ±1 |
| 7 | **B** | gam listesi sütunu | **G♭** | gam ±1 |
| 8 | (2024 görselinde boş; Push 2.2+ ile **"+ Tuning"** geldi, konumu doğrulanamadı) | — | **`Fixed off` / `Fixed on`** | (Push 2'de Direction; Push 3'te belgelenmemiş) |

- **Kök nota sırası = beşli çember.** Üst sıra `C G D A E B`, alt sıra `F B♭ E♭ A♭ D♭ G♭`.
  - Kod: `CIRCLE_OF_FIFTHS = [7*k % 12 for k in 0..11] = [0,7,2,9,4,11,6,1,8,3,10,5]`
  - `ROOT_NOTES = CoF[0:6] + CoF[-1:5:-1] = [0,7,2,9,4,11, 5,10,3,8,1,6]`
  - Buton indeksi 0–5 üst düğmeler 2–7'ye, 6–11 alt düğmeler 2–7'ye bağlı.
- Seçili kök: etiketi **beyaz**, düğme LED'i **beyaz** (`Scales.OptionOn`). Diğerleri **gri** (`Scales.OptionOff` = DARK_GREY). Push 2 manual: "currently selected key appears in white, while the other key options appear in gray".
- Seçili gam ters renkli (beyaz zemin, siyah yazı) bir kutu içinde. Push 2.2'den beri "The Scales menu now uses the clip color", yani vurgu clip renginde olabilir.
- **In Key/Chromatic** düğmesinin LED'i her iki durumda da beyaz. **Fixed** açıkken beyaz, kapalıyken koyu gri (`Push2/scales_component.py`).

### 1.3 Gam listesi gezinme
- Liste **4 satır × N sütun**, sütun sütun doluyor. 35 gam için `ceil(35/4) = 9` sütun olur. Ekranda aynı anda **6 gam sütunu** görünür (sütun 2–7), seçim ilerledikçe liste yatayda kayar.
- **Encoder 2–7**: her tık seçimi **±1** kaydırır (listede aşağı/yukarı).
- **Session D-pad**: Up/Down **±1**, Left/Right **±4**, yani bir sütun. Uçlarda `clamp` uygulanır (wrap yok). Uçtaki yön tuşu devre dışı, LED koyu gri.
- **Encoder 1**: Layout seçimi `clamp(0..2)`, wrap yok. Sıra: `4ths` → `3rds` → `Sequential`.

### 1.4 Gam listesi (Push 3'te görünen sıra)
İlk 24 ad Push 3 kılavuz ekran görüntüsünden birebir okundu. 25–35 arası ikincil kaynaktan geliyor. Push 1/Live 9 script'inde bulunan gamların aralıkları Ableton kodundan doğrulandı (✔). Diğerleri standart müzik teorisi tanımı / ikincil kaynak (≈).

| # | Ad (ekrandaki yazım) | Aralıklar (yarım ton, kökten) | n | Doğrulama |
|---|---|---|---|---|
| 1 | Major | 0 2 4 5 7 9 11 | 7 | ✔ |
| 2 | Minor | 0 2 3 5 7 8 10 | 7 | ✔ |
| 3 | Dorian | 0 2 3 5 7 9 10 | 7 | ✔ |
| 4 | Mixolydian | 0 2 4 5 7 9 10 | 7 | ✔ |
| 5 | Lydian | 0 2 4 6 7 9 11 | 7 | ✔ |
| 6 | Phrygian | 0 1 3 5 7 8 10 | 7 | ✔ |
| 7 | Locrian | 0 1 3 5 6 8 10 | 7 | ✔ |
| 8 | Whole Tone | 0 2 4 6 8 10 | 6 | ✔ |
| 9 | Half-whole Dim. | 0 1 3 4 6 7 9 10 | 8 | ✔ (Live 9'da "Diminished") |
| 10 | Whole-half Dim. | 0 2 3 5 6 8 9 11 | 8 | ✔ (Live 9'da "Whole-half") |
| 11 | Minor Blues | 0 3 5 6 7 10 | 6 | ✔ |
| 12 | Minor Pentatonic | 0 3 5 7 10 | 5 | ✔ |
| 13 | Major Pentatonic | 0 2 4 7 9 | 5 | ✔ |
| 14 | Harmonic Minor | 0 2 3 5 7 8 11 | 7 | ✔ |
| 15 | Harmonic Major | 0 2 4 5 7 8 11 | 7 | ≈ |
| 16 | Dorian #4 | 0 2 3 6 7 9 10 | 7 | ≈ |
| 17 | Phrygian Dominant | 0 1 4 5 7 8 10 | 7 | ≈ (Live 9'daki "Minor Gypsy" ile aynı) |
| 18 | Melodic Minor | 0 2 3 5 7 9 11 | 7 | ✔ |
| 19 | Lydian Augmented | 0 2 4 6 8 9 11 | 7 | ≈ |
| 20 | Lydian Dominant | 0 2 4 6 7 9 10 | 7 | ≈ |
| 21 | Super Locrian | 0 1 3 4 6 8 10 | 7 | ✔ |
| 22 | 8-Tone Spanish | 0 1 3 4 5 6 8 10 | 8 | ✔ (Live 9 "Spanish") |
| 23 | Bhairav | 0 1 4 5 7 8 11 | 7 | ✔ |
| 24 | Hungarian Minor | 0 2 3 6 7 8 11 | 7 | ✔ |
| 25 | Hirajoshi | 0 2 3 7 8 | 5 | ✔ (Live 9 "Hirojoshi") |
| 26 | In-Sen | 0 1 5 7 10 | 5 | ✔ |
| 27 | Iwato | 0 1 5 6 10 | 5 | ✔ |
| 28 | Kumoi | 0 2 3 7 9 | 5 | ✔ |
| 29 | Pelog Selisir | 0 1 3 7 8 | 5 | ≈ |
| 30 | Pelog Tembung | 0 1 5 7 8 | 5 | ≈ |
| 31 | Messiaen 3 | 0 2 3 4 6 7 8 10 11 | 9 | ≈ |
| 32 | Messiaen 4 | 0 1 2 5 6 7 8 11 | 8 | ≈ |
| 33 | Messiaen 5 | 0 1 5 6 7 11 | 6 | ≈ |
| 34 | Messiaen 6 | 0 2 4 5 6 8 10 11 | 8 | ≈ |
| 35 | Messiaen 7 | 0 1 2 3 5 6 7 8 9 11 | 10 | ≈ |

Ekrandaki sütun dağılımı (4'erli): [Major, Minor, Dorian, Mixolydian] [Lydian, Phrygian, Locrian, Whole Tone] [Half-whole Dim., Whole-half Dim., Minor Blues, Minor Pentatonic] [Major Pentatonic, Harmonic Minor, Harmonic Major, Dorian #4] [Phrygian Dominant, Melodic Minor, Lydian Augmented, Lydian Dominant] [Super Locrian, 8-Tone Spanish, Bhairav, Hungarian Minor] [Hirajoshi, In-Sen, Iwato, Kumoi] [Pelog Selisir, Pelog Tembung, Messiaen 3, Messiaen 4] [Messiaen 5, Messiaen 6, Messiaen 7].

> Kodda liste `Live.Song.get_all_scales_ordered()` ile Live'dan çekiliyor. Push kendi listesini tutmuyor, Live'ın listesini gösteriyor. Live 12 release notes'ta yeni hazır gam eklendiğine dair kayıt bulunamadı.

---

## 2. In Key / Chromatic / Fixed (kılavuzun kelimesi kelimesine anlamı)
- **In Key**: pad ızgarası "katlanmış" durumda, sadece gamdaki notalar var.
- **Chromatic**: 12 notanın hepsi çalınabilir. Gam dışı notaların pad'leri **sönük (unlit)** ama çalar. Kodda `NoteNotScale = BLACK`. Sönük pad'e basınca yine nota çıkar, basılıyken yeşil yanar.
- **Fixed On**: ton değişince notalar yerinde kalır. Sol alt pad **hep C** çalar. Tonda C yoksa "C'ye en yakın nota" çalar. Kodun davranışı: sol alt, **C'den başlayarak yukarı doğru ilk gam notası** olur. Örnek: D major'da C♯1 = MIDI 37.
- **Fixed Off**: ızgara kayar, sol alt pad **hep seçili kök** olur.
- Chromatic + Fixed On: sol alt her zaman C1 olur.

---

## 3. PAD → MIDI FORMÜLÜ (çekirdek algoritma)

### 3.1 Sadeleştirilmiş eşdeğer model (önerilen implementasyon)
Kod `MelodicPattern` + `InstrumentComponent._get_pattern` üzerinde matematiksel olarak şu forma indirgenebiliyor. Denklik türetildi ve kılavuz görselleriyle doğrulandı.

1. **Nota listesi `A`**: 0'dan başlayan artan MIDI listesi.
   - In Key: `pc(m) ∈ {(r + i) mod 12 | i ∈ scale.intervals}` koşulunu sağlayan tüm m.
   - Chromatic: tüm m (0,1,2,…).
2. **Konum `p`** (`_first_note`): sol alt pad'in `A` içindeki indeksi. Chromatic'te p = MIDI numarası.
3. **Satır adımı `R`**:

| Layout | In Key (gam derecesi) | Chromatic (yarım ton) |
|---|---|---|
| 4ths (`interval=3`) | **3** | **5** (`[0,2,4,5,7,9,10,11][3]`) |
| 3rds (`interval=2`) | **2** | **4** (majör 3'lü) |
| Sequential (`None`) | **n** (gamdaki nota sayısı), yani her satır 1 oktav yukarı | **8** (64 ardışık yarım ton) |

4. **Pad notası**: `MIDI(x, y) = A[ round(p) + x + R·y ]`
   - Geçersiz sayılan durumlar: sonuç > 127 ise pad **sönük ve çalmaz**.
   - **In Key + Sequential**: `x ≥ n+1` olan sütunlar geçersiz. Kodda `width = n + 1`. Sonuç: 7 notalı gamda 8 sütunun hepsi dolu (son sütun bir üst oktavın kökü). 5 notalıda sütun 6–7 sönük. 6 notalıda sütun 7 sönük. 8+ notalıda hepsi dolu.
5. **Varsayılan konum**: `p₀ = 3·L + P`
   - `L` (page_length) = In Key ise `n`, Chromatic ise `12`
   - `P` (page_offset) = Fixed açıksa `0`; değilse `f`
   - `f` = **kökün, gamın C'den sıralanmış perde sınıfları içindeki sırası** (Chromatic'te f = r)
   - Örnek: A minor perdeleri C D E F G A B → A'nın sırası 5 → f = 5.
   - Sonuç: sol alt = kökün 1. oktavı (MIDI 36 + r). Fixed açıkken sol alt = 1. oktavdaki en küçük gam perdesi.
6. **Renk**:
   - pc(m) == r → **ROOT** (track rengi)
   - pc(m) gamda → **WHITE**
   - değilse → **OFF** (yalnız Chromatic'te olur)
   - geçersiz pad → **OFF**

### 3.2 Kodun orijinal formu (referans, Push 2/pushbase Live 12)
```
N = sorted(scale.intervals) + r             # 11'i aşabilir (A minor: [9,11,12,14,16,17,19])
L = inKey ? n : 12
f = inKey ? (r==0 ? 0 : n − indexOf(first N[i] ≥ 12)) : r
P = fixed ? 0 : f
o   = floor(p / L);  off = (p mod L) − f
E   = inKey ? N : [r, r+1, …, r+11]
idx = off + x + R·y                           # yatay (varsayılan): steps=[1,R], origin=[off,0]
MIDI = 12·o + 12·floor(idx/|E|) + E[idx mod |E|]   # floor bölme, negatifte de
geçerli: 0 ≤ MIDI ≤ 127 ve x < width
renk: E[idx mod |E|] == N[0] → "NoteBase"; ∈ N → "NoteScale"; aksi "NoteNotScale"
```

### 3.3 JavaScript referans implementasyonu
```js
const NOTE_NAMES = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const ROOT_NOTES = [0,7,2,9,4,11, 5,10,3,8,1,6]; // üst 2-7: C G D A E B | alt 2-7: F B♭ E♭ A♭ D♭ G♭
const LAYOUTS = [{name:'4ths',interval:3},{name:'3rds',interval:2},{name:'Sequential',interval:null}];
const CHROMA_MAP = [0,2,4,5,7,9,10,11];
const noteName = m => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 2);

// state: { root:0..11, scale:{name, intervals:[...]}, inKey:true, fixed:false, layoutIndex:0, position:21 }
const n        = s => s.scale.intervals.length;
const L        = s => s.inKey ? n(s) : 12;
const pcsSet   = s => new Set(s.scale.intervals.map(i => (i + s.root) % 12));
const rootRank = s => s.inKey ? [...pcsSet(s)].sort((a,b)=>a-b).indexOf(s.root) : s.root;
const P        = s => s.fixed ? 0 : rootRank(s);
const posCount = s => s.inKey ? P(s) + n(s) * (s.root < 8 ? 11 : 10) : 139;
const rowStep  = s => { const iv = LAYOUTS[s.layoutIndex].interval;
  return iv === null ? (s.inKey ? n(s) : 8) : (s.inKey ? iv : CHROMA_MAP[iv]); };
const widthLim = s => (LAYOUTS[s.layoutIndex].interval === null && s.inKey) ? n(s) + 1 : 8;
function noteList(s){ const set = pcsSet(s), a = [];
  for (let m = 0; m < 200; m++) if (!s.inKey || set.has(m % 12)) a.push(m); return a; }
function padNote(s, x, y){                  // x:0..7 soldan, y:0..7 alttan
  if (x >= widthLim(s)) return null;
  const m = noteList(s)[Math.round(s.position) + x + rowStep(s) * y];
  return (m === undefined || m > 127) ? null : m;
}
function padRole(s, m){ if (m === null) return 'off';
  const pc = m % 12; if (pc === s.root) return 'root';
  return pcsSet(s).has(pc) ? 'scale' : 'off'; }   // Chromatic'te gam dışı = sönük ama ÇALAR
// Chromatic'te gam dışı pad: padNote != null ama rol 'off' → çalar, LED kapalı.
```

### 3.4 Durum değişince konumun yeniden hizalanması (`_align_first_note`)
Kök, gam, In Key veya Fixed değişince:
```
p' = P' + (p − P_eski) · L' / L_eski        // float kalabilir; kullanırken round()
if (p' ≥ posCount') p' −= L'
```
Sonuç: oktav numarası korunur.
- C1'deyken kök G yapılırsa sol alt **G1** olur (G0 değil).
- Chromatic (p=36) → In Key C major: `36·7/12 = 21` olur.

### 3.5 Test vektörleri (birim testi için)

| Durum | Beklenen |
|---|---|
| **C Major, In Key, 4ths, Fixed Off** (varsayılan) | Satır 0: C1 D1 E1 F1 G1 A1 B1 C2 (36 38 40 41 43 45 47 48). Satır 1: F1 G1 A1 B1 **C2** D2 E2 F2. Satır 2: B1 **C2** D2 E2 F2 G2 A2 B2. Satır 3: E2 F2 G2 A2 B2 **C3** D3 E3. Satır 4: A2 B2 **C3** D3 E3 F3 G3 A3. Satır 5: D3 E3 F3 G3 A3 B3 **C4** D4. Satır 6: G3 A3 B3 **C4** D4 E4 F4 G4. Satır 7: **C4** D4 E4 F4 G4 A4 B4 **C5**. Sağ üst = MIDI 84. Kök (track rengi) konumları kılavuz s.73 görseliyle aynı. |
| Majör akor şekli (kılavuz s.74) | (0,0)+(2,0)+(1,1) = C1+E1+G1 |
| **D Minor, In Key, 4ths** (C'den geçiş, p=22) | Satır 0: D1 E1 F1 G1 A1 B♭1 C2 D2 (38 40 41 43 45 46 48 50). Satır 1: G1 A1 B♭1 C2 D2 E2 F2 G2 |
| **A Minor, Fixed Off** | sol alt A1 (45), p=26 |
| **A Minor, Fixed On** | p=21, sol alt C1 (36) |
| **D Major, Fixed On** | sol alt C♯1 (37), sonra D1 E1 F♯1 G1 A1 B1 C♯2 |
| **C, Chromatic, 4ths** | `MIDI = 36 + x + 5y`. (1,0)=37 çalar ama sönük. Sağ üst = 78 (G♭4) |
| **C, Chromatic, 3rds** | `36 + x + 4y` |
| **C, Chromatic, Sequential** | `36 + x + 8y` → 36…99 |
| **C Minor Pentatonic, In Key, Sequential** | p=15, R=5, width=6 → satır 0: C1 E♭1 F1 G1 B♭1 C2, sütun 6–7 sönük |
| **C Major, In Key, Sequential, en üst oktav** (p=70) | satır 0: C8 D8 E8 F8 G8 (120…127), sonraki pad'ler (>127) sönük |

---

## 4. Octave, Shift+Octave, Touch Strip

### 4.1 Octave düğmeleri (kod: `SlideComponent`)
```
rem = ((p − P) mod L + L) mod L
Octave Up:   p += (L − rem)
Octave Down: p −= (rem == 0 ? L : rem)            // hizasızsa önce hizaya iner
Shift+Octave Up/Down: p += ±1                      // In Key'de 1 gam derecesi, Chromatic'te 1 yarım ton
clamp(p, 0, posCount − L)
Octave Up LED  = p < posCount − L  ise yanık, değilse sönük
Octave Down LED = p > 0  ise yanık, değilse sönük
```
- Kılavuz: "These buttons will be unlit if no additional octaves are available."
- **posCount**: In Key için `P + n·(r < 8 ? 11 : 10)`, Chromatic için `139`. Chromatic'te p en fazla 127 olabilir.
- **Aralık**:
  - C Major In Key: sol alt **C-2 (0) … C8 (120)**. Varsayılan C1'den **3 kez aşağı, 7 kez yukarı** gidilebilir.
  - Kök A♭/A/B♭/B ise en yüksek sol alt kök 7. oktavda kalır (örn. A7 = 117).
  - Chromatic: sol alt 0…127.
- Konum değişince bilgi mesajı çıkar. Push 2 script metni: **`"Play C1 to C5"`**, sol alt → sağ üst notası. Push 3'teki birebir metin doğrulanamadı.

### 4.2 Touch Strip
- **64 Notes**: varsayılan **pitch bend**. **Select basılıyken strip'e dokunmak** pitch bend ↔ mod wheel arasında geçiş yapar (kılavuz s.140).
- **Shift + strip = oktav kaydırma** (kod: `octave_strip = with_shift(touch_strip)`).
- **Melodic Sequencer**: pitch bend / mod çalışmaz. Shift'siz kaydırma nota nota gezinir, Shift ile oktav oktav.

---

## 5. Pad renkleri (Note Mode)

### 5.1 64 Notes
| Durum | Renk | Kaynak |
|---|---|---|
| Kök nota | **track rengi** | manual + skin `Instrument.NoteBase = selected track color` |
| Gam içi (kök değil) | **beyaz** | `NoteScale = WHITE` |
| Gam dışı (Chromatic) | **sönük** | `NoteNotScale = BLACK` |
| Geçersiz (>127 / Sequential genişlik dışı) | sönük, çalmaz | `NoteInvalid = BLACK` |
| Basılı / çalan nota | **yeşil** | `Instrument.Feedback = GREEN` |
| Kayıt sırasında çalan | **kırmızı** | `FeedbackRecord = RED` |

**Çıkarım:** feedback nota numarasına göre çalıştığı için aynı perdeyi taşıyan tüm pad'ler birlikte yeşil yanar. Örneğin 4ths düzeninde C'ye basınca diğer C pad'leri de yanar.

### 5.2 Push 2 LED paleti (Push 2 MIDI/Display doc, LED sürüş değerleri)
| İndeks | RGB | Anlam |
|---|---|---|
| 0 | 0,0,0 | siyah/sönük |
| 122 | 204,204,204 | white |
| 123 | 64,64,64 | light gray |
| 124 | 20,20,20 | dark gray |
| 125 | 0,0,255 | blue |
| 126 | 0,255,0 | green |
| 127 | 255,0,0 | red |

Bunlar LED sürüş değerleri. Ekranda algısal olarak "aydınlatılmış pad" gibi gösterilmeli; ekran hex'lerini tasarım tarafı belirler. Push 3 paleti doğrulanamadı.

---

## 6. Layout düğmesi ve melodik düzenler

### 6.1 Döngü sırası (enstrümanlı MIDI track)
**64 Notes → Melodic Sequencer → Melodic Sequencer + 32 Notes → (64 Notes)**

Kılavuz: 64 Notes'tan "32 Notes"a geçmek için Layout'a **iki kez** basılır.

Rack'e bağlı ek düzenler de döngüye katılır; sıraları doğrulanamadı:
- Macro Variations layout'ları (Live 12.1+).
- XYZ Control (Live 12.3+): "press the Layout button until you see the XYZ notification".
- Push 2.3 ile düzen bildirimine sayfa göstergesi eklendi (sıradaki konum / toplam düzen sayısı).

Ekran bildirim metinleri (Push 2 script `consts.py`):
- `Melodic: 64 Notes`
- `Melodic: Sequencer`
- `Melodic: Sequencer + 32 Notes`
- `Loop Selector`
- Kilitlenince `… : Locked`, kilit açılınca `… : Unlocked`

### 6.2 Kısa basma / uzun basma / Shift
| Hareket | Kılavuz (2024) ve kod | Push 2.3.5+ (Ocak 2026) |
|---|---|---|
| Kısa bas (<0.3 s) | sonraki düzen; kilitliyse kilidi açar | aynı |
| Basılı tut (≥0.3 s) | **Loop Selector anlık görünür**. Melodic Sequencer'da üst sırada, 32 Notes'ta 5. sırada; bırakınca kapanır | **"Holding the Layout button now opens a menu on the display for selecting one of the available layouts."** |
| Shift + Layout | Loop Selector kilitlenir, Layout LED'i "Alert" (yanıp söner). Kilit durumu **track başına** saklanır | kaynaklarda değişiklik bildirilmedi |

Emülatör önerisi: güncel davranış (basılı tut = düzen menüsü) + Shift+Layout = Loop Selector kilidi.

### 6.3 Melodic Sequencer (8×8)
- **Satırlar** = 8 ardışık perde: `satır y = A[p + y]`, alttan üste. Kodda `pattern[row]` doğrusal indeks. 64 Notes'taki sol alt nota = sequencer'ın alt satırı.
  - In Key: 8 ardışık gam derecesi, örn. C1…C2.
  - Chromatic: 8 yarım ton. Gam dışı satırlar sönük.
- Satır zemin renkleri:
  - kök satırı **açık gri**. Kılavuz bunu "white row" diye anıyor.
  - gam içi satırlar **koyu gri**.
  - gam dışı satırlar sönük.
  - Kod: `NoteEditor.NoteBase = LIGHT_GREY`, `NoteScale = DARK_GREY`.
- **Sütunlar** = adımlar. Çözünürlük Scene düğmeleriyle seçilir, yukarıdan aşağı:

| Scene düğmesi | Çözünürlük | Adım uzunluğu (vuruş) |
|---|---|---|
| 1 (en üst) | 1/32t | 0.0833 |
| 2 | 1/32 | 0.125 |
| 3 | 1/16t | 0.1667 |
| 4 | **1/16** (varsayılan, `DEFAULT_INDEX=3`) | 0.25 |
| 5 | 1/8t | 0.333 |
| 6 | 1/8 | 0.5 |
| 7 | 1/4t | 0.667 |
| 8 (en alt) | 1/4 | 1.0 |

Seçili çözünürlük düğmesi beyaz, diğerleri koyu gri. Kılavuz görselinde seçili 1/16 yeşil görünüyor.

- **Triplet** seçiliyken sağdaki 2 sütun sönük; 6 adım kullanılır (kod: `triplet_factor 0.75`).
- 1 sayfa = 8 adım = 1/16'da **2 vuruş**.
- Adım düzenleme:
  - pad'e bas → nota ekler; transport duruyorsa çalmayı başlatır.
  - tekrar bas → siler.
  - aynı sütunda birden fazla pad → akor.
  - **Mute + adım** → adımı devre dışı bırakır (açık gri).
  - **Delete** → clip'i siler.
  - adımı basılı tut → encoder'larla **Nudge, Length, Fine, Velocity, Vel Range, Probability**.
  - varsayılan velocity **100**; **Accent** açıkken 127.
- Adım rengi velocity eşiğine göre (Push 2 eşikleri `[120, 60, 0]`):
  - ≥120 → clip rengi tam
  - ≥60 → clip rengi 1 kademe koyu
  - diğerleri → 2 kademe koyu
  - muted → açık gri
  - seçili → beyaz
  - boş → koyu gri
- **Oynatma çizgisi**: hareket eden sütun **yeşil**, kayıtta **kırmızı**.
- Octave Up/Down → aralık 1 oktav kayar; Shift+Octave → 1 gam derecesi.
- Bilgi mesajı (Push 2 script): `"Sequence C1 to C2"`.

### 6.4 Loop Selector (loop uzunluğu pad'leri)
- Her pad = 1 sayfa.
- Bir pad'i tut + başka pad'e dokun → loop aralığı olur.
- Bir pad'e **çift dokun** → loop tam 1 sayfa olur.
- **Tek dokunuş** → görünüm o sayfaya kilitlenir (auto-follow kapanır); loop dışındaki bir sayfaya tek dokunuş loop'u o sayfaya ayarlar.
- Auto-follow'u geri açmak için: ilk ve son sayfayı yeniden seç **veya** Page Left/Right'ı basılı tut.
- **Page ◀ ▶** önceki/sonraki sayfaya geçer.
- **Duplicate** + kaynak sayfa + hedef sayfa → sayfa kopyalanır (mevcut notalara eklenir).
- **Delete** + sayfa → sayfa temizlenir.
- Renkler:
  - **sönük**: loop dışında
  - **gri**: loop içinde ama görünmüyor
  - **beyaz**: görünen ama çalmayan sayfa
  - **yeşil**: çalan sayfa
  - **kırmızı**: kayıttaki sayfa

### 6.5 Melodic Sequencer + 32 Notes
- **Üst 4 satır** = 32 adımlık sequencer (1/16'da 2 ölçü).
- **Alt 4 satır** = 32 nota. Aynı Scale/Layout formülü `y = 0..3` için geçerli. Kılavuz s.81 görselindeki kök konumları 4ths/In Key formülüyle birebir tutuyor. Varsayılan sol alt C1, seçili nota C1 (`DEFAULT_START_NOTE = 36`).
- Nota pad renkleri:
  - kök = track rengi
  - **seçili = track renginin açık tonu**
  - çalan = yeşil
  - gam içi = beyaz
  - Push 2.4 (Mayıs 2026) bu düzende "root note pads and the selected note" renklerini güncelledi; yeni değerler bilinmiyor.
- Nota pad'ine basmak notayı **seçer ve çalar**. **Select + pad** sessiz seçer. Aynı anda basılan pad'ler akor olarak seçilir.
- Üstte bir adıma dokunmak **seçili tüm notaları** o adıma ekler. Birden çok adım tutulursa hepsine eklenir.
- Adımı tutmak, adımdaki notaları alt yarıda açık track tonuyla gösterir; bunlara dokunmak o notayı adımdan çıkarır.
- Sequencer renkleri:
  - clip rengi = nota var
  - yeşil = çalıyor
  - beyaz = seçili
  - açık gri = muted
  - gri = boş
  - sönük = triplet'te sağdaki 2 sütun
- Loop pad'leri: Layout basılı tutulunca **5. sırada** çıkar; Shift+Layout ile kilitlenir.
- Octave ve Shift+Octave ile touch strip: §4'teki gibi.

---

## 7. Live 12 Scale senkronu
- Push'un kök/gam durumu doğrudan **`Song.root_note` (0–11)** ve **`Song.scale_name`** özelliklerine okunup yazılıyor. Bunlar Live'ın Control Bar'daki **Current Scale Root Note / Current Scale Name** seçicileri. Ableton'ın resmi ifadesi: "Any changes in Live will be reflected in Push, and vice versa."
- Live 12'de Control Bar seçili clip(ler)in scale'ini gösterir ve ayarlar. Clip değişince Push'un gamı da değişir.
- **`Song.scale_mode`** (Scale Mode açık/kapalı) Push script'inde kullanılmıyor. Push pad'leri Scale Mode kapalıyken de seçili gamı uygular (çıkarım).
- Kalıcılık:
  - Kılavuz: "Scale options are saved with the Set and are defaulted to whenever the Set is loaded."
  - Kodda Layout aralığı ve yönü Set'e yazılıyor (`push-note-layout-interval`, `push-note-layout-horizontal`).
  - **In Key ve Fixed ise control-surface tercihlerinde** tutuluyor. Kılavuzla çelişiyor, bkz. belirsizlikler.
- Tuning System yüklüyse:
  - 12 notalı eşit olmayan sistemde kök seçici gizlenir.
  - 12 olmayan sistemlerde Layout satır ofseti **yarım ton cinsinden** seçilir; kodda varsayılan 5, ekranda "5st".
  - Pad'lerde sistemin kökü track rengi, diğer notalar beyaz.
- Emülatör önerisi: LCD'de küçük bir "Clip Scale: D Minor" etiketi ile tek bir `scaleState` kaynağı tutmak. Ders (tutorial) adımları bu kaynağı gözleyebilir.

---

## 8. MPE / Expression (pad etkileşimi için)
- Expression Mode: **MPE** (varsayılan), Poly Aftertouch veya Mono Aftertouch.
- MPE boyutları:
  - **Pressure**
  - **Slide** (dikey)
  - **Per-note pitch bend** (yatay). In Key'de bükme gamda kalır, Chromatic'te yarım ton yarım ton ilerler.
- Ayarlar:
  - Note Pitch Bend: Automatic / On / Off
  - In Tune Location: Finger / Pad
  - In Tune Width: 0–20 mm (görselde 10 mm)
  - Slide Height: 10–16 mm (görselde 13 mm)
- Emülatörde fare/dokunmatik ile tahmini karşılıklar (çıkarım):
  - dikey sürükleme = slide
  - yatay sürükleme = pitch bend, In Key'de sonraki gam notasına kadar

---

## 9. Emülatör durum modeli ve olay tablosu

```js
state = {
  mode: 'note',                 // 'note' | 'session'
  layout: '64notes',            // '64notes' | 'melodicSeq' | 'melodicSeq32'
  loopSelectorLocked: false,    // track başına
  scaleMenuOpen: false,
  root: 0, scaleIndex: 0, inKey: true, fixed: false, layoutIndex: 0,
  position: 21,                 // 64 Notes; 32 Notes için ayrı position (varsayılan yine 3L+P)
  gridIndex: 3,                 // 1/16
  touchStrip: 'pitchbend',      // 'pitchbend' | 'modwheel'
  shift: false, select: false
}
```

| Girdi | Scale menüsü açık | Scale menüsü kapalı (64 Notes) |
|---|---|---|
| Üst ekran düğmesi 2–7 | kök = ROOT_NOTES[i−2] | (device/bank işlevi, kapsam dışı) |
| Alt ekran düğmesi 2–7 | kök = ROOT_NOTES[6 + i−2] | (track seçimi, kapsam dışı) |
| Alt ekran düğmesi 1 | In Key ⇄ Chromatic | — |
| Alt ekran düğmesi 8 | Fixed ⇄ | — |
| Encoder 1 | layoutIndex ±1 (clamp 0..2) | parametre |
| Encoder 2–7 | scaleIndex ±1 (clamp 0..34) | parametre |
| D-pad ↑/↓, ←/→ | scale ±1 / ±4 | Session gezinme |
| Octave ▲/▼ | (pad'ler görünmüyor, işlemsiz bırakılabilir) | §4.1 |
| Shift + Octave | — | p ± 1 |
| Layout (kısa / uzun / Shift) | — | §6.2 |

Her durum değişikliğinde sırasıyla:
1. §3.4 hizalama
2. pad notaları ve renklerinin yeniden hesaplanması
3. LCD bilgi mesajı (`Play X to Y`, `Melodic: …`)

---

## 10. Öğretici (tutorial) mod için kılavuzdan türetilebilecek adımlar
1. "Sol alttaki pad C1'dir. Alt sıranın ilk 3 pad'ini, sonra üst sıranın ilk 3 pad'ini çal" → majör gam. (Push 2 kılavuzundaki alıştırma, aynı düzen.)
2. Majör akor şekli: (0,0)+(2,0)+(1,1).
3. Octave ▲ ile C2'ye çık; bilgi mesajını gözlemle.
4. Scale → kök **D** (üst düğme 4) → gam **Minor** (encoder veya D-pad) → sol alt D1 olur.
5. In Key → Chromatic: gam dışı pad'ler söner.
6. Fixed On: sol alt C'ye döner.
7. Layout (encoder 1) = 3rds / Sequential farkını dinle.
8. Layout düğmesi → Melodic Sequencer → 1/16'da 8 adım gir → Layout tut / Shift+Layout ile Loop Selector.

---

## 11. Push 2 ↔ Push 3 farkları (karıştırılmaması gerekenler)
| Özellik | Push 2 (Live 12 kılavuzu / script) | Push 3 (kılavuz) |
|---|---|---|
| Scale menüsünde **Direction** (Encoder 8: "Vert." / "Horiz.", 90° döndürme) | var; varsayılan Vert. | kılavuzda **yok**, 2024 ekran görüntüsünde encoder 8 alanı boş (varlığı doğrulanamadı) |
| Layout adları | kılavuzda "4ths / 3rds / Sequent" | "4ths / 3rds / Sequential" |
| Gam seçimi | "encoders 2 through 7" | "encoders **or the Session D-pad**" |
| Pad ifadesi | aftertouch | **MPE** (varsayılan), In-Tune Width / Slide Height |
| Hold Layout (2.3.5+) | düzen menüsü (Push 2 ve 3 ortak) | aynı |
| "+ Tuning" düğmesi | Push 2.2+ (ikisinde de) | aynı |


## BULGULAR
- [resmi/yuksek] Enstrümanlı MIDI track seçilince 8x8 ızgara 64 Notes düzenine geçer; varsayılan ton C major, sol alt pad C1, her satır bir 4'lü yukarı, sağa doğru bir sonraki gam notası. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Scale menüsünde kök nota üst ve alt ekran düğmeleriyle, gam encoder'lar veya Session D-pad ile seçilir; ekran görüntüsünde üst sıra C G D A E B, alt sıra F B♭ E♭ A♭ D♭ G♭, solda Layout ve In Key/Chromatic, sağ altta 'Fixed off'. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] En soldaki encoder layout'u seçer: 4ths, 3rds, Sequential. En soldaki alt ekran düğmesi In Key/Chromatic, en sağdaki alt düğme Fixed açık/kapalı. Chromatic'te gam dışı notalar sönük. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Fixed açıkken sol alt pad hep C çalar (tonda C yoksa en yakın nota); Fixed kapalıyken sol alt pad hep seçili kökü çalar. Scale seçenekleri Set ile kaydedilir. (https://www.ableton.com/en/push/manual/)
- [resmi/yuksek] Push 3 kılavuz ekran görüntüsündeki gam listesinin ilk 24 öğesi sırasıyla: Major, Minor, Dorian, Mixolydian, Lydian, Phrygian, Locrian, Whole Tone, Half-whole Dim., Whole-half Dim., Minor Blues, Minor Pentatonic, Major Pentatonic, Harmonic Minor, Harmonic Major, Dorian #4, Phrygian Dominant, Melodic Minor, Lydian Augmented, Lydian Dominant, Super Locrian, 8-Tone Spanish, Bhairav, Hungarian Minor (4 satırlık sütunlar halinde). (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [ikincil/orta] Listenin kalanı Hirajoshi, In-Sen, Iwato, Kumoi, Pelog Selisir, Pelog Tembung, Messiaen 3–7 (toplam 35 gam); aralık dizileri üçüncü taraf kodda listeleniyor. (https://github.com/tolgazafer/TonalityFinder)
- [kod/yuksek] Push gam listesini kendisi tutmaz, Live'dan alır: SCALES = Live.Song.get_all_scales_ordered(). Kök düğme sırası CIRCLE_OF_FIFTHS[:6] + CIRCLE_OF_FIFTHS[-1:5:-1] = [0,7,2,9,4,11,5,10,3,8,1,6]. Nota adları bemol yazımlı; oktav = floor(m/12) − 2. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/melodic_pattern.py)
- [kod/yuksek] Pad notası: steps=[1,interval], index = steps·(origin+(x,y)), octave = index // scale_size, MIDI = 12·octave + scale[index % size] + root_note. Renkler NoteBase (kök), NoteScale (gam içi), NoteNotScale (gam dışı). (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/melodic_pattern.py)
- [kod/yuksek] NoteLayout varsayılanları is_in_key=True, is_fixed=False, interval=3 (4ths), is_horizontal=True. Chromatic'te satır aralığı [0,2,4,5,7,9,10,11][interval] ile yarım tona çevrilir (4ths=5, 3rds=4). Sequential'da In Key için interval = gam uzunluğu ve width = n+1, Chromatic için interval = 8. Varsayılan konum first_note = 3·page_length + page_offset. In Key position_count = offset + n·(11 veya 10), Chromatic 139. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/instrument_component.py)
- [kod/yuksek] Push 2 Scale bileşeni: 4 satırlık liste; D-pad yukarı/aşağı ±1, sol/sağ ±4; encoder 2–7 ±1; Layout encoder'ı clamp 0..2 (4ths, 3rds, Sequential); Direction encoder'ı (Push 2) is_horizontal; In Key toggle her iki durumda beyaz, Fixed açık beyaz / kapalı koyu gri. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/scales_component.py)
- [kod/yuksek] Push 2 bağlantıları: kök düğmeleri = üst ekran düğmeleri 2–7 ve alt ekran düğmeleri 2–7; In Key = alt düğme 1; Fixed = alt düğme 8; Layout = encoder 1; Direction = encoder 8; scale encoder'ları 2–7; D-pad gezinme. Scale düğmesine kısa basış toggle, basılı tutmak momentary. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/push2.py)
- [kod/yuksek] Octave kaydırma sayfa sınırına hizalanır (up: L − remainder; down: remainder varsa −remainder, yoksa −L). Konum [0, position_count − page_length] aralığına kısıtlanır. Shift+Octave ±1 konum kaydırır. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/ableton/v2/control_surface/components/slide.py)
- [resmi/yuksek] Octave Up/Down düğmeleri, ek oktav yoksa sönük kalır. Instrument track'te pad'leri bir oktav kaydırır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Pad renkleri: kök = track rengi, gam içi = beyaz, çalan = yeşil. 32 Notes'ta seçili nota = track renginin açık tonu. Loop pad'leri: sönük / gri / beyaz / yeşil / kırmızı. Sequencer adımları: clip rengi / yeşil / beyaz / açık gri (muted) / gri (boş) / triplet'te sağdaki 2 sütun sönük. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [kod/yuksek] Push 2 skin: Instrument.NoteBase = seçili track rengi, NoteScale = WHITE, NoteNotScale = BLACK, Feedback = GREEN, FeedbackRecord = RED. NoteEditor zemini: NoteBase LIGHT_GREY, NoteScale DARK_GREY. LoopSelector: Playhead GREEN, SelectedPage WHITE, InsideLoop LIGHT_GREY, OutsideLoop BLACK. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/Push2/skin_default.py)
- [resmi/orta] Push 2 varsayılan LED paleti: 122 = 204,204,204 (white), 123 = 64,64,64 (light gray), 124 = 20,20,20 (dark gray), 125 blue, 126 green, 127 red. Pad notaları sol alt 36 … sağ üst 99. (https://github.com/Ableton/push-interface/blob/master/doc/AbletonPush2MIDIDisplayInterface.asc)
- [resmi/yuksek] Layout düğmesi melodik track'te 64 Notes, Melodic Sequencer ve Melodic Sequencer + 32 Notes arasında geçiş yapar. 64 Notes'tan 32 Notes'a gitmek için iki kez basılır. Basılı tutmak loop length pad'lerini anlık gösterir (sequencer'da üst sıra, 32 Notes'ta 5. sıra). Shift+Layout kilitler; kilit track başına saklanır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Push 2.3.5 (Live 12.3.5, Ocak 2026): Layout düğmesini basılı tutmak ekranda düzen seçme menüsü açar. Push 2.3: düzen bildirimine sayfa göstergesi eklendi. Push 2.2: Scales menüsü clip rengini kullanıyor. Push 2.4: Melodic Sequencer + 32 Notes'ta kök ve seçili nota renkleri güncellendi. (https://www.ableton.com/en/release-notes/push-12/)
- [resmi/yuksek] Push 2.0 (Live 12.0.1): Tuning System desteği geldi; 12 olmayan sistemlerde Layout satır ofseti yarım ton cinsinden ayarlanır (örn. 5st); pad'lerde sistem kökü track rengi, diğer notalar beyaz. Push 2.2'den itibaren tuning, Scale → '+ Tuning' üst ekran düğmesiyle yüklenir. (https://www.ableton.com/en/release-notes/push-12/)
- [resmi/yuksek] Live 12'de seçili clip'in scale'i Control Bar'dan ayarlanır ve 'Any changes in Live will be reflected in Push, and vice versa.' (https://www.ableton.com/en/live/all-new-features/)
- [resmi/yuksek] Song.root_note (0–11), Song.scale_name (Current Scale Name seçicisindeki ad), Song.scale_intervals ve Song.scale_mode LOM özellikleri mevcut. Push NoteLayout doğrudan root_note ve scale_name'i okuyup yazıyor. (https://docs.cycling74.com/apiref/lom/song/)
- [resmi/yuksek] Melodic Sequencer: In Key'de her satır bir gam perdesi, Chromatic'te gam dışı satırlar sönük, kök satırı altta 'white row'. Sütunlar Scene düğmeleriyle seçilen çözünürlükte adım (1/32t…1/4). Sayfa başına 8 adım = 2 vuruş. Playhead yeşil, kayıtta kırmızı. Adımı basılı tutunca Nudge, Length, Fine, Velocity, Vel Range, Probability düzenlenir. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [kod/yuksek] Sequencer satırları instrument.pattern[row] ile doğrusal indekslenir. 8 note editor var, satır zemin rengi NoteEditor.<renk>. Bilgi metni 'Sequence %s to %s'. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/melodic_component.py)
- [kod/yuksek] 32 Notes bölümü aynı NoteLayout'u kullanan SelectedNotesInstrumentComponent ile ızgaranın alt 4 satırına bağlı. Varsayılan seçili nota 36. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/push_base.py)
- [kod/yuksek] Çözünürlük listesi [2,3,4,6,8,12,16,24]/24 vuruş (1/32t…1/4), varsayılan indeks 3 (1/16). Triplet'te ızgara genişliği ×0.75. Push 2 velocity renk eşikleri [120,60,0], varsayılan velocity 100. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/grid_resolution.py)
- [kod/yuksek] Layout düğmesi: kısa basış (released_immediately) sonraki düzen veya kilit açma; basılı tutma (pressed_delayed / released_delayed) alternatif düzeni anlık açar; Shift+Layout kilitler ve '<mod>: Locked' bildirimi gösterir. MOMENTARY_DELAY = 0.3 s, DOUBLE_CLICK_DELAY = 0.5 s. Bildirim metinleri 'Melodic: 64 Notes', 'Melodic: Sequencer', 'Melodic: Sequencer + 32 Notes', 'Loop Selector'. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/note_layout_switcher.py)
- [resmi/yuksek] Push 2'de Direction kontrolü (Encoder 8, 'Vert.' / 'Horiz.') var; 'Sequent' düzeninde tekrarlanan nota yok. Push 2 kılavuzu tatbikatı: alt sıranın ilk 3 pad'i + üst sıranın ilk 3 pad'i = majör gam. (https://www.ableton.com/en/manual/using-push-2/)
- [kod/yuksek] Push 1/Live 9 script'inde gam aralıkları sabit kodlanmıştı (Major … Spanish, 25 gam). Bu tablo, Live 11+ listesindeki eski adların aralıklarını doğruluyor. (https://github.com/gluon/AbletonLive9_RemoteScripts/blob/master/Push/consts.py)
- [resmi/yuksek] Touch strip melodik track'te varsayılan pitch bend. Select basılıyken dokunmak pitch bend/mod wheel arasında geçiş yapar. Melodic Sequencer'da pitch bend/mod yoktur; strip nota aralığını kaydırır, Shift ile oktav kaydırır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [resmi/yuksek] Expression sekmesi: MPE (varsayılan), Poly AT veya Mono AT; Note Pitch Bend Automatic/On/Off; In Tune Location Finger/Pad; In Tune Width 0–20 mm; Slide Height 10–16 mm. In Key'de per-note pitch bend gamda kalır, Chromatic'te yarım ton adımlarıyla gider. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2024-11-05/push3-manual-en.pdf)
- [cikarim/yuksek] Pad → MIDI formülü, 'sol alt pad'in artan gam notaları listesindeki indeksi p' modeline indirgenir: MIDI(x,y) = A[p + x + R·y]. 64 Notes (s.73) ve 32 Notes (s.81) görsellerindeki kök konumlarıyla uyumlu. (https://github.com/gluon/AbletonLive12_MIDIRemoteScripts/blob/main/pushbase/instrument_component.py)

## BELIRSIZ
- Push 3'ün kontrol script'i herkese açık değil. Formüller, renk anahtarları ve zamanlamalar Live 12'nin Push 2/pushbase kodundan alındı; Push 3 kılavuz görselleriyle sağlaması yapıldı, ama Push 3 firmware'inin birebir aynı olduğu doğrulanamadı.
- Push 3'te Scale menüsündeki Direction (Vert./Horiz.) seçeneğinin olup olmadığı doğrulanamadı: Push 3 kılavuzu bu seçenekten bahsetmiyor ve 2024 ekran görüntüsünde encoder 8 alanı boş.
- Layout basılı tutma davranışı değişti: kılavuz (2024) 'basılı tut = anlık Loop Selector' diyor; Push 2.3.5 (Ocak 2026) notu 'basılı tut = düzen seçme menüsü' diyor. Bu sürümden sonra Loop Selector'ın anlık açılışının nasıl yapıldığı ve menünün görünümü doğrulanamadı.
- Gam listesinin 25–35. öğelerinin (Hirajoshi…Messiaen 7) Push 3'teki birebir yazımı ('In-Sen' mi 'IN-sen' mi) ve bazı gamların (Harmonic Major, Dorian #4, Lydian Augmented/Dominant, Pelog, Messiaen) Ableton'daki tam aralık tanımları resmi kaynaktan doğrulanamadı. Aralıklar standart teori ve üçüncü taraf koddan geliyor. Live 12.x ile yeni gam eklenip eklenmediği de doğrulanamadı; release notes'ta kayıt bulunamadı.
- Push 3 LED paleti ve ekran renkleri doğrulanamadı; verilen RGB değerleri Push 2 dokümanından. Push 2.4'te (Mayıs 2026) 32 Notes düzenindeki kök ve seçili nota renkleri güncellendi, yeni değerler bilinmiyor.
- '+ Tuning' üst ekran düğmesinin Scale menüsündeki konumu (muhtemelen 8. üst düğme) doğrulanamadı.
- Clip çalarken pad'lerin çalan notaları yeşil göstermesi ve aynı perdenin tüm kopyalarının birlikte yanması, feedback mekanizmasından çıkarıldı; resmi metinde açıkça yazmıyor.
- Octave değişiminde Push 3 ekranında çıkan bilgi metni ('Play C1 to C5' Push 2 script'inden) Push 3 için doğrulanamadı.
- Kalıcılık çelişkisi: kılavuz 'Scale options are saved with the Set' diyor; kodda Layout Set'e yazılıyor ama In Key/Fixed control-surface tercihlerinde (global) tutuluyor.
- Live'da Scale Mode (Song.scale_mode) kapalıyken Push'un gamının davranışı resmi kaynakta açık değil. Kodda scale_mode kullanılmıyor, bu yüzden pad'lerin gamı yine uygulayacağı çıkarıldı.
- Instrument Rack'lerde Macro Variations ve XYZ düzenlerinin Layout döngüsündeki sırası doğrulanamadı.
- Push 3 donanım pad MIDI numaraları (36–99) Push 2 dokümanından alındı; Push 3 için doğrulanamadı.
- help.ableton.com 'Keys and Scales in Live 12 FAQ' makalesi Cloudflare doğrulaması nedeniyle okunamadı; bu kaynakta ek Push/scale ayrıntısı olabilir.
- Web kılavuzu 2024-11-05 PDF'iyle aynı içerikte görünüyor; Push 2.2–2.4 özellikleri (16 Pitches, XYZ, düzen menüsü, tuning yükleme) kılavuza işlenmemiş, sadece release notes'ta var.