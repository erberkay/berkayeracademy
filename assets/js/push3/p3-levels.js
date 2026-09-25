/* Push 3 Laboratuvarı — oyun seviyeleri (p3-levels.js)
 *
 * Seviye 1 "Kontrolü Bul": 27 görev, her biri registry'deki bir kontrol kimliğine (ya da 'enc*' / 'pads'
 * gibi bir gruba) bağlı. Cihaz pasiftir: p3-app gate'i bu seviyede 'in' olaylarını P3.modes'a değil
 * P3.levels.onEvent('in', ev)'e yollar (README §I2); ses ve mod çalışmaz. Doğru kontrol → LED flash +
 * açıklama paneli; yanlış → "Hayır, o X. Aradığın: Y." İlerleme ve en iyi süre P3.save 'level1'.
 *
 * Seviye 2 "Görevler": 6 görev gerçek emülatörde (gate açık, P3.modes çalışır). Koşullar yalnız P3.S'den
 * okunur (sartname-ogretici §6): Tap Tempo 128 ±2, Octave +2, D Minor, Swing %58 ±2, Track 2 Mute,
 * Record. Her görevin aşamalı ipucu hedefi durumdan hesaplanır (ör. Scale kapalıyken 'scale', açıkken
 * 'upper4', kök D iken 'enc2'). İlerleme P3.save 'level2'.
 *
 * Sözleşme: README §G12, §I2; metin düzeltmeleri dogrulanmis-donanim.md §6; eski oyun (1baa361^).
 *
 * SAPMA / EKLEME:
 * - Olay yolları: onEvent(type, payload) ana giriştir. Modül ayrıca etkin seviyede bus'a ('in', 'state',
 *   'transport', 'restore', 'lang') kendisi abone olur, böylece p3-app hangi olayları yollarsa yollasın
 *   çalışır. Aynı 'in' nesnesi iki yoldan gelirse bir kez işlenir (nesne kimliği); durum değerlendirmesi
 *   idempotenttir.
 * - Seviye 1'de encoder etkinleştirmesi: fare hover'ı p3-input'ta touch:true ürettiği için dokunma
 *   sayılmaz (imleç hedefe giderken encoder'ların üstünden geçmek "yanlış" olurdu). Sayılanlar: press,
 *   reset, dönüş ve encoder hotspot'una DOM click / Enter (Enc1..8'e tık p3-input'ta olay üretmez).
 * - İpucu: P3.S.prefs.hints açıkken hedef P3.leds.setTarget ile hemen gösterilir (eski oyun). Kapalıyken
 *   2 yanlıştan sonra konum ipucu metni, 4 yanlıştan sonra hedef çerçevesi (sartname-ogretici §4 kademeleri).
 * - Seviye 1 kaydına 'ms' (bu turda geçen etkin süre) eklendi: yarıda bırakılan tur kaldığı yerden sürer.
 *   Kayıtta 'ms' yoksa (eski kayıt ya da app migrate'i sildiyse) devam eden tur en iyi süreye sayılmaz.
 * - Seviye 2 girişte senaryo durumunu kurar (120 BPM, C Major, varsayılan oktav, mute/solo kapalı,
 *   Track 1 seçili, transport duruk); her görev de kendi başlangıcını sabitler (ör. Octave tabanı).
 *   Yazılar undo'suzdur, geçmişe girmez.
 * - Ek API: TASKS, TASKS2, hint(on?), fmtTime(ms), check().
 * - Devam'dan sonra odak (paneldeyse) P3.input.focus ile sahneye döner. Kazanma kartında Tab döngüsü ve
 *   Escape (kapatır) vardır, kart açıkken #p3Game inert'tir. Kart düğmeleri P3.app.go kullanır.
 */
(function () {
  'use strict';
  var P3 = window.P3 = window.P3 || {};

  // ---------------------------------------------------------------- Seviye 1 görevleri
  // target: registry kimliği ya da P3.dev.expand deseni. where: 2 yanlıştan sonra gösterilen konum ipucu.
  var TASKS = [
    { id: 'ekran', target: 'lcd', label: { tr: `Ekran` },
      task: { tr: `Ekrana dokun.` },
      where: { tr: `Cihazın üst ortasındaki geniş siyah alan.` },
      explain: { tr: `Ekran seçili cihazın parametrelerini ve Push'un menülerini gösterir. Üstündeki 8 encoder ekrandaki 8 sütunla eşleşir; ekranın hemen üstündeki ve altındaki düğme sıraları da ekrandaki seçenekleri seçer.` } },
    { id: 'padler', target: 'pads', label: { tr: `Pad ızgarası` },
      task: { tr: `8×8 pad ızgarasına dokun.` },
      where: { tr: `Cihazın ortasındaki 64 kare pad.` },
      explain: { tr: `64 pad velocity'ye ve basınca duyarlıdır. Seçili moda göre nota çalar, sequencer'a adım girer ya da clip başlatır.` } },
    { id: 'encoderlar', target: 'enc*', label: { tr: `Encoder'lar` },
      task: { tr: `8 encoder'dan birini bul.` },
      where: { tr: `Ekranın üstündeki sekiz düğme (knob).` },
      explain: { tr: `8 dokunmatik encoder ekrandaki parametreleri değiştirir. Birine dokunmak bile o parametreyi seçer ve ekranda vurgular.` } },
    { id: 'jog', target: 'jog', label: { tr: `Jog Wheel` },
      task: { tr: `Jog Wheel'i bul.` },
      where: { tr: `Sağ üstteki büyük tekerlek.` },
      explain: { tr: `Jog Wheel ile listelerde ve menülerde gezinirsin: çevirerek ilerler, basarak seçer, sola iterek bir üst menüye dönersin.` } },
    { id: 'strip', target: 'strip', label: { tr: `Touch Strip` },
      task: { tr: `Touch Strip'i bul.` },
      where: { tr: `Pad'lerin solundaki ince dikey şerit.` },
      explain: { tr: `Touch Strip varsayılan olarak pitch bend yapar: parmağını kaydırdıkça ses bükülür, bırakınca ortaya döner. Select basılıyken dokunursan mod wheel'e geçer; Drum Rack'te pad bankları arasında gezinir.` } },
    { id: 'play', target: 'play', label: { tr: `Play` },
      task: { tr: `Play düğmesini bul.` },
      where: { tr: `Sol alt köşedeki üçgenli düğme.` },
      explain: { tr: `Play transport'u başlatır ve durdurur. Çalarken yeşil, dururken beyaz yanar.` } },
    { id: 'record', target: 'record', label: { tr: `Record` },
      task: { tr: `Record düğmesini bul.` },
      where: { tr: `Sol sütunda, Play'in hemen üstündeki daire.` },
      explain: { tr: `Record seçili track'e kaydı başlatır; track'te clip varsa üstüne ekler (overdub). Tekrar basınca kayıt biter ve clip döngüde çalmaya devam eder.` } },
    { id: 'new', target: 'new', label: { tr: `New` },
      task: { tr: `New düğmesini bul.` },
      where: { tr: `Sol sütunda, Capture ve Record'un üstünde.` },
      explain: { tr: `New seçili track'teki clip'i durdurur ve yeni bir fikir kaydetmen için boş bir slot hazırlar. Scene Workflow'da yeni bir scene de açar.` } },
    { id: 'fixed-length', target: 'fixedLength', label: { tr: `Fixed Length` },
      task: { tr: `Fixed Length'i bul.` },
      where: { tr: `Sol sütunda, Automate'in hemen üstünde.` },
      explain: { tr: `Fixed Length açıkken yeni kayıtlar belirlediğin uzunlukta (ör. 2 bar) biter ve kendiliğinden döngüye girer. Basılı tutunca uzunluk ayarı açılır.` } },
    { id: 'tap-tempo', target: 'tapTempo', label: { tr: `Tap Tempo` },
      task: { tr: `Tap Tempo'yu bul.` },
      where: { tr: `Sol sütunda, küçük Swing and Tempo encoder'ının altında.` },
      explain: { tr: `Tap Tempo'ya ritimle art arda dokunarak tempoyu kulağınla belirlersin; 4/4'te dördüncü dokunuşta çalma o tempoda başlar.` } },
    { id: 'quantize', target: 'quantize', label: { tr: `Quantize` },
      task: { tr: `Quantize'ı bul.` },
      where: { tr: `Sol sütunda, Metronome'un altında.` },
      explain: { tr: `Quantize bir işlemdir, açık kalan bir mod değildir: basınca seçili clip'in ya da notaların zamanlaması grid'e hizalanır. Kayıt sırasında otomatik hizalama için Rec. Quantize ayarı kullanılır; ayarlar Quantize basılı tutulunca açılır.` } },
    { id: 'mute', target: 'mute', label: { tr: `Mute` },
      task: { tr: `Mute (M) düğmesini bul.` },
      where: { tr: `Sol tarafta, Volume'un altındaki dört düğmeden üçüncüsü.` },
      explain: { tr: `Mute seçili track'i susturur. Mute'u basılı tutup bir alt ekran düğmesine basarsan o track'i, bir drum pad'e basarsan o pad'i susturursun.` } },
    { id: 'solo', target: 'solo', label: { tr: `Solo` },
      task: { tr: `Solo (S) düğmesini bul.` },
      where: { tr: `Sol tarafta, Mute'un hemen sağında.` },
      explain: { tr: `Solo seçili track'i tek başına çalar, diğerlerini susturur. Solo'yu basılı tutup bir alt ekran düğmesine basarak başka bir track'i solo yaparsın.` } },
    { id: 'scale', target: 'scale', label: { tr: `Scale` },
      task: { tr: `Scale düğmesini bul.` },
      where: { tr: `Sağ sütunda, Note düğmesinin altında.` },
      explain: { tr: `Scale menüsünü açar: kök notayı ekran düğmeleriyle, gamı encoder'larla seçersin. 4ths / 3rds / Sequential dizilimi de bu menüdeki ilk encoder'dadır.` } },
    { id: 'layout', target: 'layout', label: { tr: `Layout` },
      task: { tr: `Layout düğmesini bul.` },
      where: { tr: `Sağ sütunda, Scale'in hemen sağında.` },
      explain: { tr: `Layout pad düzenleri arasında geçiş yapar: melodik track'te 64 Notes ve Melodic Sequencer, Drum Rack'te Loop Selector, 16 Velocities ve 64 Pads gibi. 4ths / 3rds / Sequential ise Scale menüsündedir.` } },
    { id: 'repeat', target: 'repeat', label: { tr: `Repeat` },
      task: { tr: `Repeat'i bul.` },
      where: { tr: `Sağ sütunda, Scale'in altında solda.` },
      explain: { tr: `Repeat açıkken basılı tuttuğun pad, scene düğmelerinde seçili aralıkta (1/32t … 1/4) kendini tekrar eder; hi-hat ruloları için idealdir. Kısa basış açık bırakır, basılı tutmak yalnız o an açar.` } },
    { id: 'accent', target: 'accent', label: { tr: `Accent` },
      task: { tr: `Accent'i bul.` },
      where: { tr: `Sağ sütunda, Repeat'in hemen sağında.` },
      explain: { tr: `Accent açıkken çaldığın ve step'le girdiğin tüm notalar tam şiddette (velocity 127) çalar. Kısa basış açık bırakır, basılı tutmak yalnız o an açar.` } },
    { id: 'double-loop', target: 'doubleLoop', label: { tr: `Double Loop` },
      task: { tr: `Double Loop'u bul.` },
      where: { tr: `Sağ sütunda, Repeat'in altında solda.` },
      explain: { tr: `Double Loop clip'in loop uzunluğunu ikiye katlar ve içindeki notaları yeni yarıya kopyalar. Kısa bir fikri büyütüp ikinci yarısına varyasyon eklemenin en hızlı yolu.` } },
    { id: 'duplicate', target: 'duplicate', label: { tr: `Duplicate` },
      task: { tr: `Duplicate'i bul.` },
      where: { tr: `Sağ sütunda, Double Loop'un hemen sağında.` },
      explain: { tr: `Duplicate çalıştığın yere göre kopyalar: Session'da clip'i ya da scene'i çoğaltır; step sequencer'da Duplicate basılıyken loop pad'lerine basarak bir sayfayı başka bir sayfaya kopyalarsın.` } },
    { id: 'convert', target: 'convert', label: { tr: `Convert` },
      task: { tr: `Convert'i bul.` },
      where: { tr: `Sağ sütunda, Double Loop'un altında.` },
      explain: { tr: `Convert seçili öğeyi başka bir biçime dönüştürür: Simpler, Drum Rack ve audio arasındaki dönüşümler buradan yapılır.` } },
    { id: 'delete', target: 'delete', label: { tr: `Delete` },
      task: { tr: `Delete'i bul.` },
      where: { tr: `Sağ sütunda, Convert'in hemen sağında.` },
      explain: { tr: `Delete tek başına seçili clip'i siler. Basılı tutup bir pad'e, step'e ya da encoder'a dokunursan onu siler ya da varsayılan değerine döndürür.` } },
    { id: 'octave-up', target: 'octaveUp', label: { tr: `Octave ↑` },
      task: { tr: `Octave ↑ (yukarı) düğmesini bul.` },
      where: { tr: `Sağ alttaki çapraz bölünmüş karenin üst üçgeni.` },
      explain: { tr: `Octave ↑ pad'lerde çalınan nota aralığını bir oktav yukarı taşır; gidilecek oktav kalmayınca söner. Drum Rack'te 16 pad'lik bankı kaydırır.` } },
    { id: 'octave-down', target: 'octaveDown', label: { tr: `Octave ↓` },
      task: { tr: `Octave ↓ (aşağı) düğmesini bul.` },
      where: { tr: `Sağ alttaki çapraz bölünmüş karenin alt üçgeni.` },
      explain: { tr: `Octave ↓ nota aralığını bir oktav aşağı taşır. Shift basılıyken gamda tek nota kayar.` } },
    { id: 'page-left', target: 'pageLeft', label: { tr: `Page ◀` },
      task: { tr: `Page ◀ (sol) düğmesini bul.` },
      where: { tr: `Sağ alttaki çapraz bölünmüş karenin sol üçgeni.` },
      explain: { tr: `Page ◀ step sequencer'da önceki sayfaya geçer; Session'da track'leri kaydırır. Kullanılamadığında sönük kalır.` } },
    { id: 'page-right', target: 'pageRight', label: { tr: `Page ▶` },
      task: { tr: `Page ▶ (sağ) düğmesini bul.` },
      where: { tr: `Sağ alttaki çapraz bölünmüş karenin sağ üçgeni.` },
      explain: { tr: `Page ▶ step sequencer'da sonraki sayfaya geçer. Page düğmesini basılı tutmak, çalan sayfayı izleyen auto-follow'u yeniden açar.` } },
    { id: 'shift', target: 'shift', label: { tr: `Shift` },
      task: { tr: `Shift'i bul.` },
      where: { tr: `Sağ alt köşede, en alttaki iki düğmeden soldaki.` },
      explain: { tr: `Shift diğer düğmelerin ikinci işlevini açar: Shift + Undo = Redo, Shift ile çevrilen encoder ince ayar yapar.` } },
    { id: 'select', target: 'select', label: { tr: `Select` },
      task: { tr: `Select'i bul.` },
      where: { tr: `Sağ alt köşede, Shift'in hemen sağında.` },
      explain: { tr: `Select basılıyken bir pad'e dokunursan onu çalmadan seçersin (ör. drum pad seçmek). Select + Touch Strip, strip'i pitch bend ile mod wheel arasında değiştirir.` } }
  ];

  // Görev listesinde olmayan kontrollerin "Hayır, o X" adı. Cihaz adları (CONTROLS.label) İngilizce kalır.
  var NAMES = {
    volume: { tr: `Volume encoder'ı` }, swingTempo: { tr: `Swing and Tempo encoder'ı` },
    dpadUp: { tr: `D-pad ↑` }, dpadDown: { tr: `D-pad ↓` }, dpadLeft: { tr: `D-pad ◀` },
    dpadRight: { tr: `D-pad ▶` }, dpadC: { tr: `D-pad ortası` }
  };

  // ---------------------------------------------------------------- Seviye 2 görevleri
  var BPM_TARGET = 128, BPM_TOL = 2, SWING_TARGET = 58, SWING_TOL = 2;
  // VARSAYIM: Swing görevi %50'den başlar (eski oyunla aynı). %0'dan %58'e 58 detent gerekir; sürüklemede
  // 24 px/detent ile ~1400 px eder, bu da görevi ergonomik olarak zorlaştırırdı.
  var SWING_START = 50;
  // VARSAYIM: "gerçek tap" = aynı seri içinde en az 4 dokunuş (p3-seq'in tapTimes'ı; 4. dokunuş çalmayı
  // başlatır). Swing & Tempo encoder'ıyla 128'e çevirmek görevi tamamlamaz.
  var TAPS_MIN = 4;
  var REC_ON = { pending: 1, countin: 1, rec: 1, overdub: 1 };

  function tr0() { return P3.S.tracks[0]; }
  function sel() { var s = P3.S.sel; return (s && s.track) || 0; }
  function scaleName(S) { var e = P3.scale.SCALES[S.scale.idx]; return e ? e[0] : ''; }
  function octCount(n) { return (n > 0 ? '+' : '') + n; }

  var TASKS2 = [
    { id: 'tap-tempo',
      task: { tr: `Tempoyu Tap Tempo ile 128 BPM'e ayarla.` },
      explain: { tr: `Tap Tempo'ya dokunduğunda Push dokunuşlar arasındaki süreden tempoyu hesaplar ve dördüncü dokunuşta çalmayı o tempoda başlatır. Kulağınla yakaladığın bir ritme Live'ı böyle uydurursun.` },
      setup: function (rt) {
        setBpm(120);
        P3.store.set('transport.tapTimes', [], { silent: true });
      },
      // Tempo dokunuşlardan hesaplanır (p3-seq tap() ile aynı formül): 4 dokunuştan sonra encoder'la 128'e
      // çevirmek tapTimes'ı değiştirmez, bu yüzden görevi tamamlamaz. Tempo da hâlâ o değerde olmalı.
      done: function (S) {
        var taps = S.transport.tapTimes || [], n = taps.length;
        if (n < TAPS_MIN || !(taps[n - 1] > taps[0])) return false;
        var tapBpm = 60000 / ((taps[n - 1] - taps[0]) / (n - 1));
        return Math.abs(tapBpm - BPM_TARGET) <= BPM_TOL && Math.abs(S.transport.bpm - BPM_TARGET) <= BPM_TOL;
      },
      stage: function () {
        return { target: 'tapTempo', text: { tr: `Tap Tempo'ya eşit aralıklarla en az 4 kez dokun: 128 BPM, saniyede iki vuruştan biraz hızlı.` } };
      },
      status: function (S) { return { tr: `Tempo: ${(+S.transport.bpm).toFixed(1)} BPM · Hedef: 128 ±2` }; } },

    { id: 'octave',
      task: { tr: `Pad'leri 2 oktav yukarı taşı.` },
      explain: { tr: `Her Octave ↑ basışı pad'lerdeki aralığı bir oktav yukarı taşır; yeni aralık ekranda görünür. Gidilecek oktav kalmayınca düğme söner.` },
      // Taban sabitlenir: synth track varsayılan konumda, hedef = iki Octave ↑ (P3.scale.octUp).
      setup: function (rt) {
        selectTrack(0);
        var S = P3.S, base = P3.scale.defaultPos(S.scale), p = { pos: base };
        P3.store.set('tracks.0.pos', base);
        P3.scale.octUp(S.scale, p);
        P3.scale.octUp(S.scale, p);
        rt.base = base;
        rt.target = p.pos;
      },
      done: function (S, rt) { return Math.abs(tr0().pos - rt.target) < 1e-6; },
      stage: function (S, rt) {
        if (sel() !== 0) return { target: 'lower1', text: { tr: `Önce alt ekran sırasındaki 1. düğmeyle Wavetable track'ini seç.` } };
        if (tr0().pos > rt.target) return { target: 'octaveDown', text: { tr: `Fazla yukarı çıktın: Octave ↓'ye bas.` } };
        return { target: 'octaveUp', text: { tr: `Octave ↑'ye (sağ alttaki karenin üst üçgeni) iki kez bas.` } };
      },
      status: function (S, rt) {
        var L = P3.scale.L(S.scale), d = (tr0().pos - rt.base) / L;
        var txt = Math.abs(d - Math.round(d)) < 1e-6 ? `${octCount(Math.round(d))} oktav` : `${octCount(Math.round(tr0().pos - rt.base))} nota`;
        return { tr: `Aralık: ${P3.scale.rangeText(S.scale, tr0())} · ${txt} · Hedef: +2 oktav` };
      } },

    { id: 'scale',
      task: { tr: `Gamı D Minor yap.` },
      explain: { tr: `Scale menüsünde kök notayı ekran düğmeleriyle, gamı encoder'larla seçtin. Pad'ler artık yalnız D minor'un notalarını çalar; track renginde yananlar kök nota D. Menüyü kapatmak için Scale'e yeniden basarsın.` },
      setup: function () {
        if (scaleDone(P3.S)) setScaleDefault();
      },
      done: function (S) { return scaleDone(S); },
      stage: function (S) {
        if (S.overlay !== 'scale') return { target: 'scale', text: { tr: `Scale düğmesine bas: ekranda Scale menüsü açılır.` } };
        if (S.scale.root !== 2) return { target: 'upper4', text: { tr: `Ekranın üstündeki sırada D yazan düğmeye bas (soldan 4.).` } };
        return { target: 'enc2', text: { tr: `Bir encoder'ı (2–7) çevirerek listede Minor'u seç. D-pad ↓ ya da Jog Wheel de olur.` } };
      },
      status: function (S) { return { tr: `Gam: ${P3.scale.scaleName(S.scale)} · Hedef: D Minor` }; } },

    { id: 'swing',
      task: { tr: `Swing'i %58'e getir.` },
      explain: { tr: `Swing and Tempo encoder'ına basmak modu Tempo ile Swing arasında değiştirir; çevirmek seçili değeri ayarlar. Swing ara vuruşları biraz geciktirerek ritme gruv katar. (Bu simülatörde swing'in sese etkisi yakında.)` },
      setup: function () {
        P3.store.set('swingTempo', 'tempo');
        setSwing(SWING_START);
      },
      done: function (S) { return Math.abs(S.transport.swing - SWING_TARGET) <= SWING_TOL; },
      stage: function (S) {
        if (S.swingTempo !== 'swing') return { target: 'swingTempo', text: { tr: `Swing and Tempo encoder'ına (Tap Tempo'nun üstündeki küçük knob) bir kez tıkla: mod Swing'e geçer.` } };
        return { target: 'swingTempo', text: { tr: `Şimdi aynı encoder'ı yukarı çevir (sürükle ya da tekerlek): Swing %58 olsun.` } };
      },
      status: function (S) {
        var mode = S.swingTempo === 'swing' ? `Swing` : `Tempo`;
        return { tr: `Swing: %${Math.round(S.transport.swing)} · Encoder modu: ${mode} · Hedef: %58 ±2` };
      } },

    { id: 'mute',
      task: { tr: `Track 2'yi (Drums) sustur.` },
      explain: { tr: `Track'i seçip Mute'a basmak onu susturur; Mute'u basılı tutup alt ekran düğmesine basmak ise seçim yapmadan susturur. Susturulan track'in alt ekran düğmesi söner.` },
      setup: function () {
        P3.store.set('tracks.1.mute', false);
        selectTrack(0);
      },
      done: function (S) { return !!S.tracks[1].mute; },
      stage: function () {
        if (sel() !== 1 && !(P3.modes && P3.modes.isHeld && P3.modes.isHeld('mute'))) {
          return { target: 'lower2', text: { tr: `Alt ekran sırasındaki 2. düğmeye basarak Drums track'ini seç. (Kısa yol: Mute'u basılı tutup 2. alt düğmeye bas.)` } };
        }
        return { target: 'mute', text: { tr: `Şimdi Mute'a (M) bas.` } };
      },
      status: function (S) {
        var m = S.tracks[1].mute ? `susturuldu` : `açık`;
        var extra = S.tracks[0].mute ? ` · Track 1 de susturuldu: seçip Mute'a basınca geri açılır` : ``;
        return { tr: `Track 2 (Drums): ${m} · Seçili: Track ${sel() + 1}${extra}` };
      } },

    { id: 'record',
      task: { tr: `Kaydı başlat.` },
      explain: { tr: `Record seçili track'e kaydı başlatır: transport duruyorsa baştan, çalıyorsa bir sonraki ölçüden. Tekrar basınca kayıt biter ve clip döngüde çalmaya devam eder.` },
      setup: function () {
        if (REC_ON[P3.S.transport.rec] && P3.seq && typeof P3.seq.stop === 'function') P3.seq.stop();
      },
      done: function (S) { return !!REC_ON[S.transport.rec]; },
      stage: function () { return { target: 'record', text: { tr: `Record'a (sol alttaki kırmızı daire) bas.` } }; },
      status: function (S) {
        var t = S.transport.playing ? `çalıyor` : `duruk`;
        return { tr: `Transport: ${t} · Kayıt: bekliyor` };
      } }
  ];

  function scaleDone(S) { return S.scale.root === 2 && scaleName(S) === 'Minor'; }

  // ---------------------------------------------------------------- emülatör yardımcıları (Seviye 2)
  function set(path, v) { return P3.store.set(path, v); }
  function setBpm(v) { if (P3.seq && typeof P3.seq.setBpm === 'function') P3.seq.setBpm(v); else set('transport.bpm', v); }
  function setSwing(v) { if (P3.seq && typeof P3.seq.setSwing === 'function') P3.seq.setSwing(v); else set('transport.swing', v); }
  function selectTrack(i) {
    if (P3.modes && typeof P3.modes.selectTrack === 'function') P3.modes.selectTrack(i);
    else set('sel.track', i);
  }
  function closeOverlay() {
    if (!P3.S.overlay) return;
    if (P3.modes && typeof P3.modes.openOverlay === 'function') P3.modes.openOverlay(null);
    else set('overlay', null);
  }

  // Kök C, Major, In Key, 4ths, Fixed kapalı; synth konumları "oktav + derece" korunarak hizalanır.
  function setScaleDefault() {
    var S = P3.S, before = scaleCopy(S.scale), after = { root: 0, idx: 0, inKey: true, fixed: false, layoutIdx: 0 };
    Object.keys(after).forEach(function (k) { set('scale.' + k, after[k]); });
    S.tracks.forEach(function (t, i) {
      if (t.kind === 'synth' && typeof t.pos === 'number') set('tracks.' + i + '.pos', P3.scale.realign(before, after, t.pos));
    });
  }
  function scaleCopy(sc) { return { root: sc.root, idx: sc.idx, inKey: sc.inKey, fixed: sc.fixed, layoutIdx: sc.layoutIdx }; }

  // Seviye 2 senaryosu: görevlerin hepsi bilinen bir durumdan başlar. Undo'suz yazılır.
  function baseline() {
    var S = P3.S;
    closeOverlay();
    if (P3.seq && typeof P3.seq.stop === 'function') P3.seq.stop();
    setBpm(120);
    setSwing(0);
    P3.store.set('transport.tapTimes', [], { silent: true });
    set('swingTempo', 'tempo');
    setScaleDefault();
    S.tracks.forEach(function (t, i) {
      set('tracks.' + i + '.mute', false);
      set('tracks.' + i + '.solo', false);
      if (t.kind === 'synth') set('tracks.' + i + '.pos', P3.scale.defaultPos(S.scale));
    });
    selectTrack(0);
  }

  // ---------------------------------------------------------------- DOM
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  function text(id, s) { var e = $(id); if (e && e.textContent !== s) e.textContent = s; }
  function show(id, on) { var e = $(id); if (e) e.hidden = !on; }

  function feedback(s, cls) {
    var e = $('p3Feedback');
    if (!e) return;
    e.hidden = false;
    e.className = 'p3-game-feedback' + (cls ? ' ' + cls : '');
    if (e.textContent !== s) e.textContent = s;
  }

  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }

  function fmtTime(ms) {
    if (!(ms >= 0)) return '';
    var s = Math.round(ms / 1000), m = Math.floor(s / 60);
    s -= m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function devExpand(t) {
    if (P3.dev && typeof P3.dev.expand === 'function') { var l = P3.dev.expand([t]); if (l.length) return l; }
    return [t];
  }

  // Hotspot vurgusu (.p3-hl.correct / .wrong). Seviye bitince temizlenir.
  var marked = [];
  function hlOf(id) {
    var el = P3.dev && typeof P3.dev.hotspotEl === 'function' ? P3.dev.hotspotEl(id) : null;
    return el && el.querySelector ? el.querySelector('.p3-hl') : null;
  }
  function mark(target, cls) {
    devExpand(target).forEach(function (id) {
      var hl = hlOf(id);
      if (!hl) return;
      hl.classList.remove(cls);
      void hl.offsetWidth;   // animasyonu yeniden başlat
      hl.classList.add(cls);
      marked.push(hl);
    });
  }
  function unmarkAll() {
    marked.forEach(function (hl) { hl.classList.remove('correct', 'wrong'); });
    marked = [];
  }

  function leds(fnName, arg, ms) {
    if (P3.leds && typeof P3.leds[fnName] === 'function') P3.leds[fnName](arg, ms);
  }

  // ---------------------------------------------------------------- ortak durum
  var level = 0;            // 0 | 1 | 2
  var idx = 0;
  var advancing = false;    // açıklama paneli açık: görev tamam, Devam bekleniyor
  var finished = false;
  var offs = [];            // bus aboneliklerinin kapatıcıları
  var lastIn = null;        // aynı 'in' nesnesi iki yoldan gelirse bir kez işlenir
  var shownTarget = null;   // P3.leds.setTarget'a son verilen hedef (anahtar)
  var domBound = null;      // Seviye 1 DOM dinleyicilerinin bağlı olduğu #p3HotspotLayer
  var continueFn = null, winFns = null, winKeyBound = null;

  // Seviye 1
  var wrongs = 0, lastAct = null, runT0 = 0, runMs = 0, runEligible = true, runStartedAt = 0;
  // Seviye 2
  var rt = {}, lastStatus = '';

  function hintsOn() { var S = P3.S; return !(S && S.prefs && S.prefs.hints === false); }

  function tasks() { return level === 2 ? TASKS2 : TASKS; }

  function setTarget(t) {
    var key = t ? [].concat(t).join(',') : '';
    if (key === shownTarget) return;
    shownTarget = key;
    leds('setTarget', t ? [].concat(t) : []);
  }

  // ---------------------------------------------------------------- kayıt
  function saved(n) {
    var o = P3.save && typeof P3.save.get === 'function' ? P3.save.get('level' + n) : null;
    return o && typeof o === 'object' ? o : {};
  }
  function store(n, o) { if (P3.save && typeof P3.save.patch === 'function') P3.save.patch('level' + n, o); }

  function elapsed() { return runMs + (runT0 ? now() - runT0 : 0); }

  function save1(extra) {
    var o = saved(1), rec = {
      idx: idx, completedAt: o.completedAt || null, bestMs: typeof o.bestMs === 'number' ? o.bestMs : null,
      startedAt: runStartedAt || o.startedAt || 0, ms: runEligible ? Math.round(elapsed()) : null
    };
    for (var k in extra) rec[k] = extra[k];
    store(1, rec);
    return rec;
  }

  function save2(extra) {
    var o = saved(2), rec = { idx: idx, completedAt: o.completedAt || null };
    for (var k in extra) rec[k] = extra[k];
    store(2, rec);
    return rec;
  }

  // ---------------------------------------------------------------- panel ve kazanma kartı
  function openExplain(body, last) {
    var fb = $('p3Feedback');
    if (fb) fb.hidden = true;
    text('p3ExplainText', body);
    var btn = $('p3ContinueBtn');
    if (btn) {
      btn.textContent = last ? `Bitir` : `Devam →`;
      continueFn = function () { if (advancing) next(); };
      btn.onclick = continueFn;
    }
    show('p3ExplainPanel', true);
    if (btn && btn.focus) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
  }

  function activeEl() { return typeof document !== 'undefined' ? document.activeElement : null; }
  function focusStage() { if (P3.input && typeof P3.input.focus === 'function') P3.input.focus(); }

  // noFocus: seviye kapanıyor ya da kazanma kartı açılacak. Aksi halde odak paneldeyse (Devam) sahneye
  // döner: gizlenen düğmedeki odak body'ye düşer ve p3-input'un klavye kısayolları (sahne odağı ister) susardı.
  function closeExplain(noFocus) {
    var panel = $('p3ExplainPanel'), ae = activeEl();
    var had = !!(panel && ae && typeof panel.contains === 'function' && panel.contains(ae));
    show('p3ExplainPanel', false);
    var btn = $('p3ContinueBtn');
    if (btn && btn.onclick === continueFn) btn.onclick = null;
    continueFn = null;
    if (had && !noFocus) focusStage();
  }

  // P3.app.go girişi değiştirir (replaceState, README §G14 gezinme); location.hash yeni bir geçmiş girişi
  // açardı ve tarayıcının Geri'si biten seviyeyi yeniden başlatırdı. Hash yalnız app yokken yedektir.
  var MODE_HASH = { level2: '#seviye-2', free: '#serbest', menu: '' };
  function go(mode) {
    if (P3.app && typeof P3.app.go === 'function') { P3.app.go(mode); return; }
    if (typeof location !== 'undefined') location.hash = MODE_HASH[mode] || '';
  }

  // Kazanma kartı (aria-modal): Tab iki düğme arasında döner, Escape kartı kapatıp odağı sahneye verir.
  // Kart açıkken oyun alanı inert: klavye odağı karartmanın arkasına geçmez.
  function onWinKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); hideWin(); focusStage(); return; }
    if (e.key !== 'Tab') return;
    var p = $('p3WinPrimary'), s = $('p3WinSecondary'), ae = activeEl();
    if (!p || !s) return;
    if (e.shiftKey && ae === p) { e.preventDefault(); s.focus(); }
    else if (!e.shiftKey && ae === s) { e.preventDefault(); p.focus(); }
  }

  function setInert(on) { var g = $('p3Game'); if (g) g.inert = !!on; }

  function showWin(title, body, primary, secondary) {
    text('p3WinTitle', title);
    text('p3WinText', body);
    var w = $('p3Win'), p = $('p3WinPrimary'), s = $('p3WinSecondary');
    winFns = { p: primary.fn, s: secondary.fn };
    if (p) { p.textContent = primary.label; p.hidden = false; p.onclick = winFns.p; }
    if (s) { s.textContent = secondary.label; s.hidden = false; s.onclick = winFns.s; }
    if (w && !winKeyBound) { w.addEventListener('keydown', onWinKey); winKeyBound = w; }
    setInert(true);
    show('p3Win', true);
    if (p && p.focus) p.focus();
  }

  function hideWin() {
    if (!winFns) return;
    var p = $('p3WinPrimary'), s = $('p3WinSecondary');
    if (p && p.onclick === winFns.p) p.onclick = null;
    if (s && s.onclick === winFns.s) s.onclick = null;
    winFns = null;
    if (winKeyBound) { winKeyBound.removeEventListener('keydown', onWinKey); winKeyBound = null; }
    setInert(false);
    show('p3Win', false);
  }

  function progressText() {
    var n = tasks().length, i = Math.min(idx + 1, n);
    return level === 2 ? `Seviye 2 · ${i} / ${n}` : `${i} / ${n}`;
  }

  // ---------------------------------------------------------------- Seviye 1
  function controlName(id) {
    for (var i = 0; i < TASKS.length; i++) if (devExpand(TASKS[i].target).indexOf(id) >= 0) return P3.t(TASKS[i].label);
    if (NAMES[id]) return P3.t(NAMES[id]);
    var m = /^(upper|lower|enc)(\d)$/.exec(id);
    if (m) return m[1] === 'enc' ? `Encoder ${m[2]}` : m[1] === 'upper' ? `${m[2]}. üst ekran düğmesi` : `${m[2]}. alt ekran düğmesi`;
    var c = P3.dev && P3.dev.CONTROLS && P3.dev.CONTROLS[id];
    return c ? c.label : id;
  }

  function hits(target, id) { return devExpand(target).indexOf(id) >= 0; }

  function render1() {
    var t = TASKS[idx];
    advancing = false;
    wrongs = 0;
    closeExplain();
    unmarkAll();
    text('p3Progress', progressText());
    text('p3TaskText', P3.t(t.task));
    feedback(`Cihaz üzerinde göreve uyan kontrole dokun.`);
    target1();
  }

  function target1() {
    if (level !== 1 || finished) { setTarget(null); return; }
    var t = TASKS[idx];
    setTarget(!advancing && (hintsOn() || wrongs >= 4) ? t.target : null);
  }

  // Olaydan "etkinleştirilen kontrol" (Seviye 1). Bırakışlar, hover dokunuşu ve 'escape' sayılmaz.
  function activated(ev) {
    if (!ev) return null;
    switch (ev.k) {
      case 'btn': return ev.down && ev.id && ev.id !== 'escape' ? ev.id : null;
      case 'dpad':
      case 'octpage': {
        if (!ev.down) return null;
        if (ev.id) return ev.id;
        var g = P3.dev && P3.dev.GROUPS && P3.dev.GROUPS[ev.k];
        return g ? (ev.dir === 'center' ? g.center : g[ev.dir]) || null : null;
      }
      case 'pad': return ev.down ? 'pads' : null;
      case 'strip': return ev.down ? 'strip' : null;
      case 'enc': return ev.press || ev.reset || ev.nudge || ev.steps || ev.turn ? ev.id : null;
    }
    return null;
  }

  function activate(id) {
    if (level !== 1 || finished || !id) return;
    // Sürükleme art arda dönüş olayı üretir; aynı kontrolün kısa süredeki tekrarları tek sayılır.
    var t0 = now();
    if (lastAct && lastAct.id === id && t0 - lastAct.t < 400) { lastAct.t = t0; return; }
    lastAct = { id: id, t: t0 };
    if (advancing) return;
    var t = TASKS[idx];
    if (hits(t.target, id)) {
      advancing = true;
      setTarget(null);
      leds('flash', [t.target], 600);
      mark(t.target, 'correct');
      save1({ idx: idx + 1 });
      openExplain(P3.t(t.explain), idx + 1 >= TASKS.length);
      return;
    }
    wrongs++;
    mark(id, 'wrong');
    var msg = `Hayır, o ${controlName(id)}. Aradığın: ${P3.t(t.label)}.`;
    if (wrongs >= 2) msg += ' ' + P3.t(t.where);
    feedback(msg, 'err');
    target1();
  }

  function finish1() {
    finished = true;
    var ms = Math.round(elapsed()), o = saved(1), best = typeof o.bestMs === 'number' ? o.bestMs : null;
    runT0 = 0;
    runMs = ms;
    var record = runEligible && (best === null || ms < best);
    if (record) best = ms;
    idx = TASKS.length;
    save1({ idx: idx, completedAt: Date.now(), bestMs: best, ms: runEligible ? ms : null });
    closeExplain(true);
    setTarget(null);
    text('p3Progress', `${TASKS.length} / ${TASKS.length}`);
    text('p3TaskText', `Seviye 1 tamamlandı ✓`);
    feedback('');
    var body = `${TASKS.length} kontrolün hepsini buldun.`;
    if (runEligible) body += ` Süren: ${fmtTime(ms)}.`;
    if (best !== null) body += record ? ` Yeni en iyi süre!` : ` En iyi süre: ${fmtTime(best)}.`;
    body += ` Şimdi bu kontrolleri gerçek emülatörde kullanma zamanı.`;
    showWin(`Seviye 1 tamamlandı`, body,
      { label: `Seviye 2'ye geç`, fn: function () { go('level2'); } },
      { label: `Modlara dön`, fn: function () { go('menu'); } });
  }

  function onLayerClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    var id = el && el.getAttribute('data-id'), c = id && P3.dev && P3.dev.CONTROLS[id];
    if (c && c.kind === 'enc') activate(id);
  }
  function onLayerKey(e) {
    if (e.key !== 'Enter' || e.repeat) return;
    onLayerClick(e);
  }

  function bindDom1() {
    var layer = $('p3HotspotLayer');
    if (!layer || domBound) return;
    layer.addEventListener('click', onLayerClick);
    layer.addEventListener('keydown', onLayerKey);
    domBound = layer;
  }
  function unbindDom1() {
    if (!domBound) return;
    domBound.removeEventListener('click', onLayerClick);
    domBound.removeEventListener('keydown', onLayerKey);
    domBound = null;
  }

  function start1() {
    var o = saved(1);
    idx = typeof o.idx === 'number' && o.idx > 0 && o.idx < TASKS.length ? Math.floor(o.idx) : 0;
    if (idx > 0) {
      runMs = typeof o.ms === 'number' && o.ms >= 0 ? o.ms : 0;
      runEligible = typeof o.ms === 'number';
      runStartedAt = o.startedAt || Date.now();
    } else {
      runMs = 0;
      runEligible = true;
      runStartedAt = Date.now();
    }
    runT0 = now();
    lastAct = null;
    bindDom1();
    save1();
    render1();
  }

  // ---------------------------------------------------------------- Seviye 2
  var busy = false;   // görev kurulumu sırasında gelen 'state' olayları değerlendirilmez

  function enter2() {
    var t = TASKS2[idx];
    advancing = false;
    rt = {};
    lastStatus = '';
    closeExplain();
    unmarkAll();
    busy = true;
    // Açık kalan menü (ör. önceki görevin Scale menüsü) alt ekran düğmelerini kök nota seçimine çevirirdi.
    try { closeOverlay(); t.setup(rt); } finally { busy = false; }
    text('p3Progress', progressText());
    text('p3TaskText', P3.t(t.task));
    check();
  }

  // Koşul ve ipucu değerlendirmesi: her 'state' / 'transport' / 'in' olayında (idempotent).
  function check() {
    if (level !== 2 || finished || advancing || busy || !P3.S) return;
    var S = P3.S, t = TASKS2[idx];
    if (t.done(S, rt)) { success2(t); return; }
    var st = t.stage(S, rt), on = hintsOn();
    setTarget(on ? st.target : null);
    var msg = P3.t(t.status(S, rt));
    if (on) msg = P3.t(st.text) + ' ' + msg;
    if (msg !== lastStatus) { lastStatus = msg; feedback(msg); }
  }

  function success2(t) {
    advancing = true;
    var st = t.stage(P3.S, rt);
    setTarget(null);
    leds('flash', [st.target], 600);
    mark(st.target, 'correct');
    save2({ idx: idx + 1 });
    openExplain(P3.t(t.explain), idx + 1 >= TASKS2.length);
  }

  function finish2() {
    finished = true;
    idx = TASKS2.length;
    save2({ idx: idx, completedAt: Date.now() });
    closeExplain(true);
    setTarget(null);
    // Kayıt açık kalmasın: kazanma kartı açıkken clip büyümeye devam ederdi.
    if (P3.seq && typeof P3.seq.stop === 'function') P3.seq.stop();
    text('p3Progress', `Seviye 2 · ${TASKS2.length} / ${TASKS2.length}`);
    text('p3TaskText', `Seviye 2 tamamlandı ✓`);
    feedback('');
    showWin(`Seviye 2 tamamlandı`,
      `Tempo, oktav, gam, swing, mute ve kayıt: Push 3'ün temel iş akışını gerçek emülatörde yaptın. Şimdi kural olmadan çal.`,
      { label: `Serbest Çal'a geç`, fn: function () { go('free'); } },
      { label: `Modlara dön`, fn: function () { go('menu'); } });
  }

  function start2() {
    var o = saved(2);
    idx = typeof o.idx === 'number' && o.idx > 0 && o.idx < TASKS2.length ? Math.floor(o.idx) : 0;
    busy = true;
    try { baseline(); } finally { busy = false; }
    save2();
    enter2();
  }

  // ---------------------------------------------------------------- yaşam döngüsü
  function next() {
    if (!level || finished) return;
    advancing = false;
    idx++;
    if (level === 1) {
      if (idx >= TASKS.length) finish1();
      else { save1(); render1(); }
    } else if (idx >= TASKS2.length) finish2();
    else { save2(); enter2(); }
  }

  function subscribe() {
    var bus = P3.bus;
    if (!bus || typeof bus.on !== 'function') return;
    ['in', 'state', 'transport', 'restore', 'lang'].forEach(function (type) {
      offs.push(bus.on(type, function (p) { onEvent(type, p); }));
    });
  }

  function start(n) {
    n = +n;
    if (n !== 1 && n !== 2) return false;
    if (level) stop();
    if (!P3.S || !P3.store) { console.warn(`[p3] levels: store hazır değil`); return false; }
    if (n === 2 && !P3.scale) { console.warn(`[p3] levels: p3-scale yok`); return false; }
    level = n;
    finished = false;
    shownTarget = null;
    lastIn = null;
    hideWin();
    subscribe();
    if (n === 1) start1(); else start2();
    return true;
  }

  function stop() {
    if (!level) return;
    if (level === 1 && !finished) { save1(); runT0 = 0; }
    else if (level === 2 && !finished) save2();
    offs.forEach(function (off) { if (typeof off === 'function') off(); });
    offs = [];
    unbindDom1();
    setTarget(null);
    unmarkAll();
    closeExplain(true);
    hideWin();
    feedback('');
    level = 0;
    advancing = false;
    finished = false;
    rt = {};
  }

  // Tüm metinler yeniden çizilir (dil değişimi).
  function rerender() {
    if (!level || finished) return;
    text('p3Progress', progressText());
    text('p3TaskText', P3.t(tasks()[idx].task));
    if (advancing) text('p3ExplainText', P3.t(tasks()[idx].explain));
    else if (level === 2) { lastStatus = ''; check(); }
  }

  function onEvent(type, payload) {
    if (!level) return;
    switch (type) {
      case 'in':
        if (payload === lastIn) return;
        lastIn = payload;
        if (level === 1) activate(activated(payload));
        else { check(); setTimeout(check, 0); }   // gate → modes bu olaydan sonra da çalışabilir
        break;
      case 'state':
        if (payload && (payload.path === 'prefs.hints' || payload.path === '*')) {
          shownTarget = null;
          if (level === 1) target1();
          lastStatus = '';
        }
        if (level === 2) check();
        break;
      case 'transport':
      case 'restore':
        if (level === 2) check();
        break;
      case 'lang':
        rerender();
        break;
    }
  }

  // İpucu anahtarı: argümansız çağrı açıp kapatır. Kalıcılık (settings.hints) p3-app'in işi.
  function hint(on) {
    var S = P3.S;
    if (!S || !S.prefs) return false;
    var v = on === undefined ? !hintsOn() : !!on;
    P3.store.set('prefs.hints', v);
    return v;
  }

  function progressOf(n) {
    var list = n === 1 ? TASKS : TASKS2, o = saved(n);
    var i = typeof o.idx === 'number' ? Math.max(0, Math.min(list.length, Math.floor(o.idx))) : 0;
    var r = { idx: i, total: list.length, pct: Math.round(i / list.length * 100), completedAt: o.completedAt || null };
    if (n === 1) r.bestMs = typeof o.bestMs === 'number' ? o.bestMs : null;
    return r;
  }

  // Menü rozetleri için: {active, idx, level1:{idx,total,pct,completedAt,bestMs}, level2:{…}}.
  function progress() {
    return { active: level, idx: level ? idx : -1, level1: progressOf(1), level2: progressOf(2) };
  }

  P3.levels = {
    start: start,
    stop: stop,
    onEvent: onEvent,
    progress: progress,
    hint: hint,
    check: check,
    fmtTime: fmtTime,
    TASKS: TASKS,
    TASKS2: TASKS2
  };
})();
