## Faz 1: Çalınabilir Push 3 ve ayrı seçilebilen bölümler
**Hedef:** Öğrenci menüden bir mod seçer ve ses çıkarır. Note/Scale, Wavetable ve Drum'ın temel iş akışı gerçek Push davranışıyla çalışır.

**Kabuk**
- Mod menüsü (4 kart) ve hash router.
- Seviye 1 ve Seviye 2 bağımsız seçilebilir. Seviye 1 pasiftir, ses motoru çalışmaz.
- Mevcut hatalar düzeltilir:
  - Hotspot bölmeleri sabit registry'ye geçer.
  - Açıklama metinleri düzeltilir: Touch Strip, Layout, Quantize, Double Loop, Duplicate, Convert, New.
  - 26/27 sayacı `TASKS.length`'ten okunur.
  - Swing görevi `Knob_10`'a taşınır.
  - Scale görevi gerçek menü akışına çevrilir.

**Cihaz**
- Nötrleştirme.
- CONTROLS registry'si (yaklaşık 75 kontrol).
- Pad/LED canvas ve LCD canvas.
- ResizeObserver.
- Mobil için Pad Odak görünümü.

**Girdi**
- Pointer: multi-touch pad, encoder (drag/wheel/touch/press), strip, jog.
- Klavye: Düzen A ve kısayollar.
- Slider ve grid için klavye erişimi.

**Ses**
- Tek AudioContext ve worklet Wavetable çekirdeği:
  - Osc 1/2: FX None/FM/Classic/Modern.
  - Sub.
  - Filter 1/2: Clean SVF, LP/HP/BP/Notch/Morph, 12/24 dB.
  - Serial/Parallel/Split.
  - Amp/Env2/Env3 (loop modları dahil).
  - LFO 1/2 (Hz ve Sync).
  - 13 kaynaklı matris, Mod Time/Amt.
  - Poly 2–8, Mono + Glide.
  - Unison None/Classic.
- 8 prosedürel tablo, 12 preset (taskbar'daki `<select>` ile).
- PeriodicWave fallback.
- Drum: 4 sample.

**Push davranışı**
- Note Mode 64 Notes.
- Scale menüsü: 35 gam, In Key/Chromatic, Fixed, 4ths/3rds/Sequential, D-pad.
- Octave ve Shift+Octave.
- Touch Strip: PB/Mod, Select+strip, Shift+strip.
- Accent (latch/momentary).
- Device view: Wavetable'ın 6 bankı (Main, Oscillators, Filters, Global, Envelopes, LFOs) ve 4 görselleştirme.
- Volume ve Swing&Tempo encoder'ları, popup'lar.
- Tap Tempo (4 dokunuşta çalma), Play, Metronome (toggle).
- **Kayıt çekirdeği:** Record FSM idle→rec→play→overdub. Count-in yok. Kayıt seçili track'in 1. slot'una yazılır.
- Drum track Loop Selector:
  - 4×4 drum pad, 32 step, 16 loop pad.
  - Scene düğmeleriyle 8 çözünürlük.
  - Select+pad, Delete+pad, Mute+step, Octave ±16 / Shift ±4.
- Undo/Redo.
- Desteklenmeyen düğme basılınca popup `Not in this simulator` + panelde TR açıklama.

**Öğretici**
- Motor, İçindekiler, ipucu kademeleri, localStorage ilerleme.
- Bölüm 0–6: Başlarken, Pad'ler, Scale, Dizilim, Osilatör, Filtre & Envelope (5.8 hariç), Drum (6.9 hariç). Toplam 47 adım.

**Marka**
- Başlık önerisi ve bağımsızlık notu. Greg Hadala atfı korunur.

**Neden bu sıra:** Ses motoru ve scale matematiği her şeyin temeli. Öğreticinin ilk 7 bölümü yalnız bunlara dayanıyor. Seviye 2'nin Record görevi en az bir kayıt çekirdeği gerektiriyor. Bu kapsamla "Push'u çalmak" deneyimi kendi başına tamamlanmış oluyor.

**Çıkış kriteri:** dogrulamaPlani'ndaki F1 senaryolarının hepsi geçer. Chrome, Safari, Firefox, iPhone ve Android'de asılı nota ve tık yok.

## Faz 2: Kayıt, sequencer, Session
**Kayıt**
- Count-in, Fixed Length (menü + Phrase Sync), New, Capture (sadeleştirilmiş).
- Quantize: kısa basış işlem yapar, basılı tutunca menü açılır, Rec. Quantize.
- Metronome menüsü (Count-In, Sound).
- Repeat: latch/momentary, 8 rate, swing.
- Double Loop.
- Duplicate: sayfa, clip, workflow.
- Delete kombinasyonları.
- Step basılı tutma → Nudge/Length/Fine/Velocity/Vel Range/Probability, tie.

**Layout**
- Melodik: Melodic Sequencer ve Melodic Sequencer + 32 Notes.
- Drum: 16 Velocities ve 64 Pads.
- Layout basılı tutulunca geçici görünüm; Shift+Layout kilitler.

**Session**
- Session Pad Mode: 8×8, scene launch, boş pad = stop, Shift+Stop Clip, Note⇄Session momentary.
- Session Screen (basit).
- Mix view (Volumes/Pans).
- Mute/Solo/Stop Clip + alt düğme, Lock.
- 4 track.

**Wavetable**
- Matrix ve MIDI & MPE bankaları, Add to Matrix, Delete+dokunma = varsayılana dön.
- Unison'ın 6 modu.
- OSR/MS2/SMP/PRD devre yaklaşıkları, Drive, Hi-Quality.
- +4 tablo, drum'a +4 prosedürel ses.
- Swap: Hot-Swap preset listesi.

**Diğer**
- Web MIDI ([Bağlan] ile), klavye Düzen B, Bölünmüş mobil görünüm.
- Öğretici: Bölüm 7–10 ve ileri adımlar (5.8, 6.9, 8.6, 9.5).
- Seviye 1'e +6 kontrol → 33 (Metronome, Automate, Capture, Note, Session, Swing&Tempo).

**Neden:** Hepsi Faz 1'in transport ve clip modelinin üzerine kuruluyor. Öğrenci değeri yüksek ama çekirdek olmadan anlamsız.

## Faz 3: Derinlik ve cila
- **MPE:** pen/pressure varsa per-note PB, Slide, Pressure; In Tune bölgesi.
- **Setup ekranı:** Expression, Sensitivity eğrisi, ses kalitesi, Workflow.
- **Otomasyon ve düzenleme:**
  - Automate ve step otomasyonu.
  - Clip view ve Note Edit.
  - Add ile preset tarayıcı (jog).
  - Session Overview.
  - Learn ekranı zenginleştirme.
- **Kayıt ve içe aktarma:**
  - Firestore preset kaydı: `users/{uid}/presets` içinde `type:'push3-wavetable'`. Mevcut kural sahibine izin veriyor, kural değişikliği gerekmez.
  - Kullanıcı wavetable içe aktarma: WAV → 2048'lik kareler, en fazla 256.
  - Sets/Save = Serbest mod snapshot listesi.
- **Çeviri:** Öğreticinin EN çevirisi.

**Neden:** Bunlar sadakati artırıyor ama öğrenmenin çekirdeği değil. Basınç gibi platform desteği değişken, EN çevirisi de büyük bir içerik işi.

## Kapsam dışı
Bu kontrollere basılınca popup ve açıklama gösterilir:
- Standalone/Control Mode geçişi
- Audio track, sampling, warp
- Convert
- Arrangement kaydı
- User Mode
- Link, Wi-Fi, pedal/CV, ses kartı
- Expressive Chords, Macro Variations, XYZ
- Tuning