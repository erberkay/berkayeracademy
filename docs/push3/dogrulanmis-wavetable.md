# Push 3 Wavetable ekranı ve bankaları: doğrulanmış nihai spesifikasyon

Birincil kaynak: Live 12 Suite 12.4.6 içindeki `Helpers/Push3.app/.../python/Push2/*.pyc` (bellekte çözüldü) ve `Defaults/Instruments/Wavetable.adv`. Davranış kaynağı: Live 12 manual, bölüm 31.13 (https://www.ableton.com/en/live-manual/12/live-instrument-reference/). Ableton dosyaları, ikonları ve WAV'ları telifli; siteye kopyalanmaz, yalnız isimler ve sayılar kullanılır.

## A. Wavetable parametre modeli (emülatör state'i)
Aralık ve init değerleri doğrulandı (Wavetable.adv):
```js
const WT_INIT = {
  osc1:{on:true, cat:'Basics', table:'Basic Shapes', pos:0, transp:0/*-24..24 int*/, detune:0/*-0.5..0.5 st*/, fxMode:3/*0 None,1 Fm,2 Classic,3 Modern*/, fx1:0/*-1..1*/, fx2:0/*0..1*/, pan:0/*-1..1*/, gain:1/*0..1*/},
  osc2:{on:false, cat:'Basics', table:'Basic Shapes', pos:0, transp:0, detune:0, fxMode:0, fx1:0, fx2:0, pan:0, gain:1},
  sub:{on:false, gain:0.5011875/*-6 dB*/, tone:0, transpose:1/*0=0,1=-1oct,2=-2oct*/},
  f1:{on:true,  type:0/*0 LP,1 HP,2 BP,3 Notch,4 Morph*/, lphp:0/*Clean,OSR,MS2,SMP,PRD*/, bpnomo:0/*Clean,OSR*/, slope:0/*12dB,24dB*/, freq:20480/*20..20480*/, res:0/*0..1.25*/, drive:0/*0..24 dB*/, morph:0},
  f2:{on:false, type:1, lphp:0, bpnomo:0, slope:0, freq:20, res:0, drive:0, morph:0},
  routing:0/*Serial,Parallel,Split*/,
  amp:{a:0.001/*0..20 s*/, d:0.6/*0.0015..20*/, r:0.6, aS:0, dS:0.5, rS:0.5/*-1..1*/, sus:0.5011876, loop:0/*None,Trigger,Loop*/},
  env2:{a:0.001, d:0.6, r:0.6, aS:0, dS:0.5, rS:0.5, init:0, peak:1, sus:0.5, fin:0, loop:0}, env3:'env2 ile aynı',
  lfo1:{shape:0/*Sine,Triangle,Saw,Square,Random*/, shaping:0, amount:1, phase:0/*0..360*/, sync:0/*Free(Hz),Tempo*/, rate:1.0/*0.01..30*/, sRate:15/*0..21*/, attack:0, retrig:true}, lfo2:'lfo1 ile aynı',
  modTime:0/*-1..1*/, modAmt:1/*0..2*/, transpose:0/*-48..48*/, glide:0/*0..20*/, volume:0.3548134/*-9 dB*/,
  monoPoly:1/*0 Mono,1 Poly*/, polyVoicesIdx:6/*[2,3,4,5,6,7,8,16] → 8*/, unison:{mode:0, voices:3/*2..8*/, amount:0.3}, hiQ:false,
  mods:{'Osc 1 Pos':{modWheel:1.0, mpeSlide:0.33}, 'Osc 1 Warp':{pressure:0.07}, 'Amp':{velocity:0.5}, 'Pitch':{pitchBend:2/48, mpeNotePB:1.0}}
};
```
DSP kuralları (manual'dan doğrulandı):
- Hi-Quality kapalıyken modülasyon her 32 sample'da bir hesaplanır.
- FM Tune ±50% = ±1 oktav, ±100% = ±2 oktav.
- Morph sırası: LP→BP→HP→Notch→LP.
- Drive yalnız LP/HP/BP'de ve circuit ≠ Clean iken var.
- MS2, SMP ve PRD yalnız LP/HP'de. Clean ve OSR tüm tiplerde.
- Additive modülasyon: kaynaklar toplanır, sonuç parametreye eklenir.
- Multiplicative modülasyon: kaynaklar çarpılır, sonuç parametreyle çarpılır (nötr 1, en düşük 0). Multiplicative olanlar: Amp Sustain, Env Initial, LFO Amount, Volume, Unison Amount, Global Mod Amount.
- Note kaynağı C3 merkezli; %100'de filtre notayı birebir izler.
- LFO Phase Offset modüle edilemez.
- Glide yalnız Mono'da, Poly Voices yalnız Poly'de etkin.

## B. Sanal (Push'a özel) parametreler

| Ad | Değerler | Varsayılan | Görünüm |
|---|---|---|---|
| Oscillator | 1, 2, S, Mix | 1 | Main + (1/2) → yatay küçük metin listesi "1 2 S Mix". Diğer durumlar → ikon listesi osc_1/2/sub/mix |
| Internal Filter (Main) = Filter (Filters Enc1) | 1, 2 | 1 | Aynı state'i paylaşırlar. İkon filter_switch_1/2 |
| Envelopes | Amp, Env2, Env3 | Amp | |
| LFO | LFO1, LFO2 | LFO1 | |
| Amp Env View | Time, Slope | Time | |
| Mod Env View | Time, Slope, Value | Time | |
| Expression Mode | MPE, Mono/Poly | MPE | |
| Osc N Pitch | Transp + Detune tek encoder | | Hassasiyet 10.0; Shift ile ince ayar 0.4 |
| Current Mod Target | seçili hedefin gerçek parametresi | | Etiketi hedefin kendi adı |

Osc N On kapalıysa o osilatörün Category, Table, Effect Type ve Pitch kontrolleri disabled (gri) gösterilir.

## C. Banka tablosu (alt display butonları 1–8)
Enc sütunları 1–8. Options sütunu = üst display butonları 2–8; 1. üst buton "< Wavetable" (geri). `—` = boş slot.

**1 Main**
| Seçim | Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|---|
| Osc 1 | Oscillator | Table | Position | Filter Type | Frequency | Resonance | Mod Time | Mod Amt |
| Osc 2 | Oscillator | Table | Position | Filter Type | Frequency | Resonance | Mod Time | Mod Amt |
| S | Oscillator | Gain | Tone | Filter Type | Frequency | Resonance | Mod Time | Mod Amt |
| Mix | Oscillator | Gain 1 | Gain 2 | Filter Type | Frequency | Resonance | Mod Time | Mod Amt |

- Enc2/Enc3 parametreleri: Osc 1/2'de Osc N Table / Osc N Pos; S'de Sub Gain / Sub Tone; Mix'te Osc 1 Gain / Osc 2 Gain.
- Enc4 = seçili filtrenin tipi. Ableton script'inde Filter 2 için eski ad `Filter 2 Type` kullanıldığı için gerçek cihazda bu slot boş kalabilir. Emülatörde Flt 2 Type göster ve bunu "düzeltilmiş davranış" olarak not et.
- Enc5/Enc6 = seçili filtrenin Freq/Res.
- Options: 2 = Osc (seçili osc'un On toggle'ı; S'de 'Sub') · 3 — · 4 = Filter Switch [Filter 1 | Filter 2] · 5 — (tanım 'Filter' istiyor ama option yaratılmıyor) · 6 — · 7 — · 8 = Add to Matrix.
- Görselleştirme: wavetable sütun 1–3 (yalnız Osc 1/2 seçiliyken); filter sütun 4–6.

**2 Oscillators**
| Seçim | Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|---|
| 1 / 2 | Oscillator | Category | Table | Position | Pitch | Effect Type | Classic: Pulse Width · Modern: Warp · Fm: Pitch · None: — | Classic: Sync · Modern: Fold · Fm: Amount · None: — |
| S | Oscillator | Gain | Tone | Octave | — | — | — | — |
| Mix | Oscillator | Pitch 1 | Pitch 2 | Octave Sub | Gain 1 | Gain 2 | — | Gain Sub |

- Options: 2 = Osc/Sub · 8 = Add to Matrix.
- Görselleştirme: wavetable sütun 2–4 (yalnız Osc 1/2).

**3 Filters** (N = seçili filtre)
| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| Filter (1/2) | Filter (Flt N On) | Type | Frequency | Resonance | Filter Circuit | Morph / Drive / — | Routing |

- Enc6: Type LP/HP ise Flt N LP/HP (5 circuit), değilse Flt N BP/NO/MO (2 circuit).
- Enc7: Type=Morph ise Morph. LP/HP'de LP/HP circuit ≠ Clean ise Drive. BP/Notch'ta BP/NO/MO circuit ≠ Clean ise Drive. Aksi halde boş.
- Enc8 = Filter Routing.
- Options: 3 = Flt N Slope [12dB | 24dB] · 8 = Add to Matrix.
- Görselleştirme: filter sütun 3–5.

**4 Global**
| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| Mono (Off/On) | Glide (Mono=On) / Poly Voices | Unison Mode | Unison Voices | Unison Amount | Transpose | — | Volume |

- Options: 8 = Add to Matrix.

**5 Envelopes** (E = seçili envelope)
| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| Envelopes | Envelope View | Attack / Attack Slope / Initial | Decay / Decay Slope / Peak | Sustain | Release / Release Slope / Final | Loop Mode | — |

- Enc3, Enc4 ve Enc6'daki üç seçenek sırasıyla Time / Slope / Value görünümüne karşılık gelir.
- Amp envelope'ta Value görünümü yok.
- Gerçek cihazda Env3 + Slope görünümünde Enc3 etiketi "Attack" yazıyor (Ableton hatası).
- Options: 8 = Add to Matrix.
- Görselleştirme: envelope sütun 3–6. Her zaman AttackLine, DecayLine, SustainLine ve ReleaseLine çizilir; dokunulan parametrenin segmenti vurgulanır.

**6 LFOs** (N = seçili LFO)
| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| LFO | Type | Shape | Rate | Amount | Attack | Phase Offset | Retrigger |

- Enc4: Sync = Free ise Rate (Hz), Tempo ise S. Rate.
- Options: 4 = LFO N Sync [Hz | Sync] · 8 = Add to Matrix.
- Görselleştirme: lfo sütun 1–4.

**7 Matrix**
| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| Mod Target | (hedef parametre, kendi adıyla) | — | Amp Envelope | Envelope 2 | Envelope 3 | LFO 1 | LFO 2 |

- Enc4–8: seçili hedef için ilgili kaynağın modülasyon miktarı, −100..+100 %.
- Options: 2 = Back · 3 — · 4 = Go to Amp Env · 5 = Go to Env 2 · 6 = Go to Env 3 · 7 = Go to LFO 1 · 8 = Go to LFO 2.
- "Go to" butonları Envelopes veya LFOs bankasını ilgili seçimle açar.

**8 MIDI & MPE**
| Enc1 | Enc2 | Enc3 | Enc4 | Enc5 | Enc6 | Enc7 | Enc8 |
|---|---|---|---|---|---|---|---|
| Mod Target | (hedef) | Velocity | Key | Note PB / PB Range | Pressure | Slide / Mod Wheel | Random |

- Enc5 ve Enc7'de ilk değer MPE modunda, ikincisi Mono/Poly modunda gösterilir.
- Options: 2 = Back · 5 = Expression Mode Switch [MPE | Mono/Poly].
- Hedef global Pitch ise PB ve Note PB değeri `round(x·48·10)/10` st olarak gösterilir; hedef Osc 1/2 Pitch ise ×24 kullanılır. Tamsayı sonuçta ".0" yazılmaz.

**Add to Matrix akışı**
- Tek bir encoder'a dokunuluyken ve parametre modüle edilebiliyorsa aktif olur.
- Basılınca: parametre matrise eklenir → Mod Target = o parametre olur → Matrix bankasına geçilir.
- Back: Matrix ve MIDI & MPE dışındaki son bankaya döner.
- Delete basılı + encoder'a dokunmak parametreyi varsayılana döndürür. Pitch parametresinde klip otomasyonu varsa otomasyon silinir.

## D. Enum ikonları (kendi çizimin, bu anlamlarla)

| Parametre | İkonlar (değer sırasıyla) |
|---|---|
| Oscillator | osc_1, osc_2, osc_sub, osc_mix |
| Effect Type | none, fm, classic, modern |
| Sub Octave | 0, −1, −2 |
| Filter seçici | switch_1, switch_2 |
| Flt Type | low_24, high_24, band_24, notch_12, morph_24 |
| Circuit | clean, osr, ms2, smp, prd |
| On/Off (Flt On, LFO Retrigger, Mono) | activate |
| Routing | serial, parallel, split |
| Env View | time, slope, value |
| Loop | none, trigger, loop |
| LFO | sine, triangle, saw_down, square, random (küçük boy) |
| Unison | none, classic, shimmer, noise, phase_sync, position_spread, random |
| Voices | 2…8, 16 |

## E. Ekran geometrisi (960×160 mantıksal canvas)
- Sütun k (0..7): `lightLeft = 121k+14`, `lightRight = 121k+100`.
- Satır r (0..7): `y = 20r+1`.
- Görselleştirme alanı y = 61'den başlar (alt sınır yaklaşık 139, çıkarım). x aralığı `lightLeft(i)..lightRight(j)`:

| Görselleştirme | Bank | Sütunlar | x aralığı |
|---|---|---|---|
| wavetable | Main | 0–2 | 14–342 |
| wavetable | Oscillators | 1–3 | 135–463 |
| filter | Main | 3–5 | 377–705 |
| filter | Filters | 2–4 | 256–584 |
| lfo | LFOs | 0–3 | 14–463 |
| envelope | Envelopes | 2–5 | 256–705 |

- Görselleştirme görünürken altındaki slotlar küçültülür (shrink): ad + küçük değer, halka yok.
- Dokunma bayrakları:
  - AdjustingPosition: Osc N Pos veya "Position" etiketi.
  - AdjustingFilter: Flt N Type/Freq/Res veya "Frequency"/"Resonance".
  - AdjustingLfo: LFO parametreleri.
- Renk: zemin #000, vurgu track rengi, parametre adları gri.
- Satırlar: r0 = options, r7 = bank sekmeleri (seçili sekme track renginde dolu kutu, siyah yazı).
- SVG yerleşimi: canvas'ı `x = 581 + 1.2729167·px`, `y = 490.167 + 1.2729167·py` ile görünür LCD rect'ine (581, 482, 1222×220) oturt. getBBox('LCD Display') KULLANMA, çünkü Pixels rect'i yüzünden 553, 447, 1278×289 döner.
- Figma çizimindeki düzeltmeler:
  - 8. etiket "Mod Amt" olmalı.
  - Filter Type 5 ikon göstermeli.
  - Oscillator listesi "1 2 S Mix" olmalı.
  - Halka yayı değere orantılı olmalı (toplam 295°, tahmini).

## F. XY Control (Push 3)
Wavetable için X = Time (Mod Time), Y = Osc 1 Pos, Z = yok.

## CURUTULEN
- KONU 4 §5.1: 8. banka 'MIDI'; 'Live 11 ve Live 12'de aynı' -> Push 3 script'inde (Live 12.4.6) 8. bankanın adı 'MIDI & MPE'. 'MIDI' adı Push 2 / eski Live script'ine ait. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/custom_bank_definitions.pyc)
- KONU 4 §5.2 MIDI bankası: Modulation Target Names | Current Mod Target | Velocity | Pitch | Pitch Bend | Aftertouch | Mod Wheel | Random -> Push 3: Mod Target | (hedef parametre) | Velocity | Key | Note PB (MPE) / PB Range (Mono/Poly) | Pressure | Slide (MPE) / Mod Wheel (Mono/Poly) | Random. Options: 'Back' 2. butonda, 'Expression Mode Switch' 5. butonda. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/custom_bank_definitions.pyc)
- KONU 4 §5.2 Envelopes etiketleri: Env View, A Slope, Init, D Slope, R Slope, Loop -> Push 3 etiketleri: Envelope View, Attack Slope, Initial, Decay Slope, Release Slope, Final, Loop Mode (with_name ile). ()
- KONU 4 §5.2 LFOs: LFO Type | Shape | Rate | Amount | Attack | Offset | Retrigger -> Push 3: Type | Shape | Rate | Amount | Attack | Phase Offset | Retrigger. 1. slot 'LFO' seçicisi. Toplam 8 slot: LFO, Type, Shape, Rate, Amount, Attack, Phase Offset, Retrigger. ()
- KONU 4 §5.2 Matrix etiketleri 'Amp Env | Env 2 | Env 3 | LFO 1 | LFO 2' -> Push 3 etiketleri: 'Amp Envelope', 'Envelope 2', 'Envelope 3', 'LFO 1', 'LFO 2'. Bunlar envelope/LFO parametresi DEĞİL; seçili hedef için ilgili kaynağın modülasyon miktarı (ModMatrixParameter: Amp Env Mod Amount … Lfo 2 Mod Amount, −1..+1). ()
- KONU 4 §5.2 Main seçenekleri: sütun 4'te 'Filter On/Off' -> Bank tanımı 4. option için 'Filter' adını istiyor. Ama _create_options bu adda bir option yaratmıyor: yaratılanlar Osc, Flt, Retrigger, Add to Matrix, Sub, Flt 1/2 Slope, Filter Switch, Expression Mode Switch, LFO 1/2 Sync, Go to…, Back. Filter-on toggle'ının adı 'Flt' ve hiçbir bankada kullanılmıyor. Sonuç: slot büyük olasılıkla BOŞ. Emülatörde boş bırakılmalı. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/wavetable.pyc)
- KONU 4 §5.2 Main S3: Oscillator=S iken 'Octave', Mix iken 'Gain Sub' gösterilir -> Koşul sırası yüzünden bu dallar ölü kod. Internal Filter=1 → 'Filter Type' (Flt 1 Type). Internal Filter=2 → 'Filter 2 Type' adı aranır. Live 12.4 adları 'Flt …' olduğundan bu parametre büyük olasılıkla bulunmaz; find_if None döner ve slot BOŞ kalır. ()
- KONU 4 §5.5: Filter Type ikonları wavetable_filter_1..5; Unison/Poly Voices 2–8; LFO ikonları lfo_sine… -> Push 3 asset adları: filter_low_24, filter_high_24, filter_band_24, filter_notch_12, filter_morph_24. LFO ikonları *_small (lfo_sine_small …). Voices listesi voices_2 … voices_8 + voices_16. Unison Voices 2..8, Poly Voices 2..8 ve 16. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/device_parameter_icons.pyc)
- KONU 4 §5.2 Filters Enc2 etiketi 'Filter On' -> with_name('Filter') ile ekranda 'Filter' yazar; ikonu ACTIVATE (on/off). Enc1 de 'Filter' (1/2 seçici), yani yan yana iki 'Filter' etiketi olur. ()
- KONU 4 §4.2: Drift sekmesi RS'te 'LFOs', Push 3'te 'LFO' (script ile görüntü arasında fark) -> Push 3 script'inde Drift bankasının adı zaten 'LFO'. Fark yok; 'LFOs' eski Push 2 script'inden geliyor. 'LFOs' adı Wavetable bankasına ait. ()
- KONU 5 §6.3: Oscillator seçici 'yatay küçük metin listesi 1 2 S Mix' olarak görünür (genel) -> get_view_for_parameter: yatay küçük liste (HorizontalSmallTextListView, etiket 'Oscillator', track rengi) YALNIZCA Main bankasında (index 0) ve değer 1/2 iken kullanılır, çünkü slot orada görselleştirmenin altında. Diğer durumlarda (Oscillators bankası, S/Mix seçiliyken) normal ikonlu enum görünümü kullanılır: wavetable_osc_1/2/sub/mix. (file:///Applications/Ableton%20Live%2012%20Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/wavetable.pyc)
- KONU 5 §6.1: Toggle option'lar 'Osc 1 On' biçiminde yazılır -> Wavetable için option adı 'Osc' (seçili osc 1/2'nin On parametresi) veya 'Sub' (Sub On). 'Osc 1 On' Drift/Simpler görüntülerinden genelleme. Durum metninin tam biçimi ('Osc On'?) Wavetable için doğrulanamadı. ()
- KONU 5 §6.4 Matrix Enc4–8 'Amp Envelope…LFO 2' (anlamı belirtilmemiş) -> Bu slotlar, 'Mod Target'ta seçili hedef için kaynak başına modülasyon miktarıdır (−100..+100 %). Enc2'nin etiketi hedef parametrenin kendi adıdır (ör. 'Osc 1 Pos'); değeri hedefin taban değeridir. ()
- KONU 5 §6.4 / §5: Back her zaman matrise girmeden önceki bankaya döner -> _set_bank_index yalnızca ('Matrix','MIDI') adlı bankalardan çıkılırken 'önceki banka'yı kaydetmez. Push 3'te banka adı 'MIDI & MPE' olduğu için bu banka da 'önceki banka' olarak kaydedilebilir (Ableton hatası). Emülatörde doğru davranış önerilir: Matrix ve MIDI & MPE dışındaki son bankaya dön. ()

## DOGRULANAN
- Push3.app script'i yerelde gerçekten var: /Applications/Ableton Live 12 Suite.app/Contents/Helpers/Push3.app/Contents/Resources/python/Push2/ (237 .pyc). Python 3.11 bytecode'unu kendi yazdığım salt-okunur marshal okuyucuyla bellekte çözdüm; dosyalara yazma yapılmadı. Bu yüzden aşağıdaki her şey BİRİNCİL kaynaktan geliyor: custom_bank_definitions.pyc, wavetable.pyc, device_parameter_icons.pyc, parameter_mapping_sensitivities.pyc, parameter_slot_description.pyc.
- Push 3 Wavetable (InstrumentVector) banka sırası birebir doğru: Main, Oscillators, Filters, Global, Envelopes, LFOs, Matrix, 'MIDI & MPE' (custom_bank_definitions.pyc).
- Main bankası: Oscillator | Table/Gain/Gain 1 | Position/Tone/Gain 2 | Filter Type | Frequency | Resonance | Mod Time ('Time') | Mod Amt ('Global Mod Amount'). Enc4 koşul zinciri şu sırayla: Internal Filter=1 → 'Flt 1 Type'; Internal Filter=2 → 'Filter 2 Type' (ESKİ ad); Oscillator=S → Sub Transpose 'Octave'; Mix → 'Gain Sub'. Internal Filter hep 1 ya da 2 olduğu için S/Mix dalları hiçbir zaman çalışmaz.
- Main options tuple'ı (7 eleman): (Osc [osc 1/2] | Sub [S], '', 'Filter Switch', 'Filter', '', '', 'Add to Matrix'). i. eleman → üst display butonu i+2. view_description = 'mainbank_visualisation'.
- Oscillators bankası doğru: Oscillator | Category/Gain(S)/Pitch 1(Mix) | Table/Tone/Pitch 2 | Position/Octave(S)/Octave Sub(Mix) | Gain 1(Mix) veya Pitch | Effect Type/Gain 2(Mix) | FX1 (Classic 'Pulse Width', Modern 'Warp', Fm 'Pitch') | FX2 (Classic 'Sync', Modern 'Fold', Fm 'Amount') veya Gain Sub(Mix). Options: (Osc/Sub, '', '', '', '', '', 'Add to Matrix'). view_description = 'oscillators_visualisation'.
- Filters bankası doğru: Filter | Flt N On → 'Filter' | Type | Frequency | Resonance | Filter Circuit (LP/HP ise 'Flt N LP/HP', aksi halde 'Flt N BP/NO/MO') | Morph (Type=Morph) / Drive (LP/HP ve LP/HP circuit≠Clean ya da BP/Notch ve BP/NO/MO circuit≠Clean) / boş | Routing. Options: ('', Flt N Slope [12dB|24dB], '', '', '', '', 'Add to Matrix').
- Global bankası doğru: Mono ('Mono On') | Mono On='On' ise Glide, değilse Poly Voices | Unison Mode | Unison Voices | Unison Amount | Transpose | (boş) | Volume. Options: yalnızca 8. butonda Add to Matrix.
- Envelopes bankası doğru: Envelopes | Envelope View | Attack/Attack Slope/Initial | Decay/Decay Slope/Peak | Sustain | Release/Release Slope/Final | Loop Mode | (boş). Env 3 + Slope görünümünde Enc3 with_name('Attack') ile 'Attack' yazıyor (Ableton tutarsızlığı, doğrulandı).
- LFOs bankası doğru: LFO | Type (LFO N Shape) | Shape (LFO N Shaping) | Rate (Sync='Free' → LFO N Rate, 'Tempo' → LFO N S. Rate) | Amount | Attack | Phase Offset | Retrigger. Options: ('', '', LFO N Sync [Hz|Sync], '', '', '', 'Add to Matrix').
- Matrix bankası: Mod Target | Current Mod Target | (boş) | Amp Envelope | Envelope 2 | Envelope 3 | LFO 1 | LFO 2. Options: ('Back', '', 'Go to Amp Env', 'Go to Env 2', 'Go to Env 3', 'Go to LFO 1', 'Go to LFO 2').
- MIDI & MPE bankası: Mod Target | Current Mod Target | Velocity | Key | Note PB (Expression Mode=MPE) veya PB Range | Pressure | Slide (MPE) veya Mod Wheel | Random. Options: ('Back', '', '', 'Expression Mode Switch', '', '', ''), yani Expression switch 5. üst butonda.
- Görünen ad kuralı: with_name() slot'a const display_name_transformer koyar; ekrandaki etiketi bu belirler (parameter_slot_description._calc_content, device_parameter_bank._collect_parameter). NAME_REMAPPING (ör. 'MIDI Aftertouch Mod Amount'→'Press') yalnız with_name olmayan yerlerde geçerli. Bu yüzden 6. slotta 'Pressure' yazar.
- Sanal parametreler (wavetable.pyc): Oscillator ['1','2','S','Mix'] varsayılan 1; Internal Filter ve Filter ['1','2'] (aynı provider'ı paylaşırlar); Envelopes ['Amp','Env2','Env3']; LFO ['LFO1','LFO2']; Amp Env View ['Time','Slope']; Mod Env View ['Time','Slope','Value']; Expression Mode ['MPE','Mono/Poly'] varsayılan MPE; Osc 1/2 Pitch = PitchParameter (Transp + Detune); Osc N Category/Table/Effect Type enum sarmalayıcıları.
- Decorator sabitleri: effect modes ('None','Fm','Classic','Modern'); unison ('None','Classic','Shimmer','Noise','Phase Sync','Position Spread','Random Note'); Mono ('Off','On'); poly voices ('2'…'8','16'); routing ('Serial','Parallel','Split'); unison voice sayısı 2..8.
- PB ve Note PB gösterimi: hedef Global Pitch ise semitone_conversion(x, 48), Osc 1/2 Pitch ise (x, 24). Biçim: 1 ondalığa yuvarlanır, tamsayıysa '.0' atılır.
- Shift basılıyken osc_1_pitch/osc_2_pitch.adjust_finegrain = True. Hassasiyet: Osc 1/2 Pitch için normal 10.0, fine 0.4. Genel sabitler 1.0 / 0.01 / 0.0667 (=1/15) dosyada mevcut.
- VISUALISATION_CONFIGURATION: wavetable {Main: 0-2, Oscillators: 1-3, yalnız Oscillator 1/2 seçiliyken}, filter {Main: 3-5, Filters: 2-4}, lfo {LFOs: 0-3}, envelope {Envelopes: 2-5}. x = light_left_x(i), genişlik = light_right_x(j) − light_left_x(i).
- Dokunma bayrakları: regex'lerle belirlenir. AdjustingPosition '^(Osc (1|2) Pos)$|^Position$'; AdjustingFilter '^(Flt (1|2) (Type|Freq|Res))$|^Flt Type$|^Frequency$|^Resonance$'; AdjustingLfo LFO parametre adları. Envelope: her zaman AttackLine, DecayLine, SustainLine, ReleaseLine çizilir; dokunulanlar EnvelopeFocus olur.
- Add to Matrix: yalnızca TEK encoder'a dokunuluyken ve parametre modüle edilebiliyorsa aktif olur (PitchParameter her zaman modüle edilebilir). Basınca parametre matrise eklenir, current_mod_target_id ayarlanır ve 'Matrix' bankasına atlanır. Back → _bank_before_mod_matrix.
- Current Mod Target slotu: gerçekte hedef parametrenin kendisi gösterilir ve etiketi hedef parametrenin kendi adıdır (_get_provided_parameters).
- İkonlar (device_parameter_icons.pyc): Oscillator wavetable_osc_1/2/sub/mix; Effect Type wavetable_effect_none/fm/classic/modern; Sub Transpose wavetable_octave_0/_minus_1/_minus_2; Filter wavetable_filter_switch_1/2; Flt Type filter_low_24, filter_high_24, filter_band_24, filter_notch_12, filter_morph_24; circuit_clean/osr/ms2/smp/prd; Flt On, LFO Retrigger ve Mono On için ACTIVATE; routing_serial/parallel/split; env_time/slope/value; env_loop_none/trigger/loop; LFO lfo_sine_small, lfo_triangle_small, lfo_saw_down_small, lfo_square_small, lfo_random_small; unison_none…unison_random; voices_2…voices_8, voices_16.
- XY_CONTROL_MAPPINGS['InstrumentVector'] = ('Time', 'Osc 1 Pos', None).
- Init preset (Core Library/Defaults/Instruments/Wavetable.adv, gzip okundu) bire bir doğrulandı: Transpose −24..24 (0); Detune −0.5..0.5; EffectMode Osc1=3, Osc2=0; Effect1 −1..1; Effect2 0..1; Osc Gain 1; Osc2 On false; Sub Transpose 1 (0..2); Sub Gain 0.5011875; F1 Freq 20479.998, F2 Freq 20.000309 (aralık 19.9999981..20479.998); Res 0..1.25; Drive 0..24; F1 Type 0, F2 Type 1, F2 On false; Amp Sustain 0.5011876; Attack 0.001 (0..20); Decay 0.6 (0.0015..20); D Slope 0.5; LFO Rate 1.0 (0.01..30); SyncedRate 15 (0..21); PhaseOffset 0..360; TimeScale −1..1 (0); Mod Amount 1 (0..2); Global Transpose −48..48; Glide 0..20; Unison Mode 0, Voices 3, Amount 0.3; Volume 0.3548134; PolyVoices 6; MonoPoly 1; Routing 0; LFO Retrigger true; HiQ false; SpriteName1 'Basic Shapes'.
- Live 12 manual Wavetable bölümü (curl ile metin çıkarıldı) şunları birebir doğruluyor: Hi-Quality kapalıyken modülasyon her 32 sample'da hesaplanır, Cytomic filtrelerin low-power sürümleri kullanılır, %25'e kadar CPU tasarrufu sağlar, 11.1'den beri varsayılan. FM: Tune ±50% = ±1 oktav, ±100% = ±2 oktav, arası inharmonik. Efekt değerleri tip değişince korunur. Drive, Clean dışı LP/HP/BP'de var. Morph sırası LP→BP→HP→Notch→LP. MS2 yalnız LP/HP'de; OSR tüm tiplerde. Routing Serial/Parallel/Split ve Sub yönlendirmesi manual'daki gibi. Additive/multiplicative formülleri doğru. Note kaynağı C3 merkezli, %100'de filtre notayı birebir izler. Slope tanımı doğru. Initial/Peak/Final amp envelope'ta yok. Loop modları None/Trigger/Loop. LFO Offset modüle edilemez; Amount, Sustain, Initial, Volume ve Unison Amount multiplicative. Sub: Tone 0% = saf sinüs, Octave ile −1/−2 oktav. Glide yalnız Mono'da, Poly Voices yalnız Poly'de aktif.
- Figma SVG: 'LCD Display' grubunda görünür ekran <rect x=581 y=482 width=1222 height=220 rx=6 fill=#101010> ve 'Pixels' <rect x=553 y=447 width=1278 height=289 fill=none, mix-blend-mode:soft-light> var. ders-push3.html'deki rectFor() ve .p3-lcd overlay'i 'LCD Display' bbox'ını (Pixels dahil) kullanıyor (satır 229, 357, 419-420).

## HALA BELIRSIZ
- Main bankasında Filter 2 seçiliyken Enc4 gerçekten boş mu? Script 'Filter 2 Type' adını arıyor; Live 12.4 parametre adları 'Flt 2 Type' (Filters bankası bu adı kullanıyor). Parametre adları Live binary'sinde düz metin olarak bulunamadı, kesin doğrulama için Live çalıştırılmalı.
- Main bankasındaki 'Filter' option slotu (üst buton 5) boş mu kalıyor? Aynı adda option yaratılmadığı için büyük olasılıkla boş; ekran görüntüsüyle doğrulanamadı.
- DeviceToggleOption 'Osc'/'Sub' etiketinin ekrandaki durum yazısı ('Osc On' / 'Osc Off' vb.) Wavetable için ekran görüntüsüyle doğrulanamadı.
- Standalone Push 3 firmware'inin, Live 12.4.6'daki Push3.app script'iyle birebir aynı bankaları kullandığı doğrulanamadı (çok olası).
- Push 3 ekranındaki Wavetable görselleştirmelerinin (dalga, filtre eğrisi, LFO, envelope) çizim stili: yalnız sütun aralıkları ve vurgu bayrakları biliniyor. Resmi ekran görüntüsü yok.
- Görünen birimler doğrulanamadı: Osc/Sub Gain, Volume ve Amp Sustain dB mi; Pan 50L..50R mi; Resonance 0–125 % mü; Classic PW gösterimi; Glide birimi.
- 22 adımlı LFO synced-rate etiket listesi; 13 mod kaynağının indeks sırası (6 Note, 8 Pressure, 10 Random, 12 Slide) preset istatistiğinden çıkarım.
- Push 3'ün 960×160 çözünürlüğü resmi Push 3 spec'lerinde yok. Push 2 dokümanı ve SOS'un 'screen is the same' ifadesinden çıkarıldı.
- Ekran fontu, gri tonların hex değerleri ve halka tarama açısı (Figma'da 295°) tahmini.