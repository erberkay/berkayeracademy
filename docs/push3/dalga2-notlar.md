# Dalga 2 entegrasyon notları ve API özetleri (ajan raporlarından)


## engine

### API
P3.audio = { ctx, state ('off'|'running'|'suspended'|'interrupted'|'failed'|'fallback'), ready (bool), profile ('hq'|'std'|'eco'), master:{mixBus, drive, softClip, main, cue}, metroOut (GainNode → cue → destination), unlock() → Promise<bool> (A10 sırası: audioSession.type='playback' | iOS'ta audioSession yoksa sessiz <audio> döngüsü → new AudioContext({latencyHint:'interactive'}) → resume() → init()), init() → Promise (idempotent; master + track zincirleri + Worker + worklet yükleme + P3.drums.load()), trackInput(i) → GainNode (gain(dB) → StereoPanner → mute → mixBus), setMainDb(db), setCueDb(db), setTrackDb(i,db), setTrackPan(i,v -1..1), setTrackMute(i,bool), latency() → {base, output}, toCtxTime(perfMs) }.
P3.wt = { onFallback (bool), ensureTrack(i) → {kind:'wl'|'fb'} | null, setParam(i, k|idx, v) (rAF'te toplu 'p'), setMod(i, tgtK, srcIdx, amt) (anında {t:'m'}), applyPreset(i, id) (store.tx('Preset') ile tracks.i.p yeni Float32Array + mods + preset; §H3), setTable(i, osc, tableId) (store.tx('Table') ile oNCat/oNTab yazar), noteOn(i, id, midi, vel, at) → bool (drum track'te false), noteOff(i, id, at), expr(i, id, {bend,slide,press}, at), pb(i, v, at), mw(i, v, at), press(i, v, at) [EKLEME], tableDisp(tableId) → Float32Array(64*256) | null (Faz 2 id'si Temel Şekiller'e eşlenir; hazır olunca bus 'table' {id} + P3.lcd.invalidate()), meter(i) → {voices, cpu, pos1, pos2, l, r} | null, panic() }.
Dinlenen bus olayları (init'te kurulur): 'state' (tracks.i.p bütün → 106 parametre; tracks.i.p.K → tek; tracks.i.mods(.*) → rAF'te {t:'init', mods} ile matris bütün; oNCat/oNTab/oNOn → rAF'te tablo seçimi; tracks.i.vol/pan/mute/solo → mikser + solo mantığı; vol.* → main/cue; transport.bpm → tempo; prefs.quality → profil; '*' / 'tracks' / 'tracks.i' → tam senkron), 'transport' {bpm} → {t:'tempo'}, 'panic' → tüm worklet'lere {t:'panic'} / fallback seslerini söndürür. Yayınlanan: 'toast' {text}, 'table' {id}; store'a yazılan: app.audio, app.profile. document 'visibilitychange' → main 20 ms'de 0 / geri + resume.

### Sapmalar
- softClip eğrisi [-4,4] girişini kapsar: WaveShaper ±1 dışını kırptığı için önüne ×1/4 'drive' GainNode'u eklendi (master.drive), eğri f(4u); f: |x|<0.7 doğrusal, üstü tanh diz, tavan 1.0 (§H7, worklet'le aynı biçim).
- S.vol.phones sese etki etmez (tek çıkış VARSAYIMI, sartname §1).
- tracks.i.vol dB, tracks.i.pan -1..1 kabul edildi (VARSAYIM; Mix modu Faz 2).
- Matris değişikliği tek tek 'm' yerine rAF'te {t:'init', mods} ile bütün gönderilir (worklet init'i params'sız kabul ediyor, koddan doğrulandı). P3.wt.setMod doğrudan {t:'m'} gönderir.
- Cat/Tab/On değişiklikleri rAF'te birleşir: kategori değişince Tab sıfırlandığında ara tablo üretilmez. Faz 2 tabloları P3.wtp.audibleTable ile 0'a düşer; tableDisp de aynı eşlemeyi kullanır.
- Tablo tamponu worklet'e Transferable ile aktarılır, ana thread'de tutulmaz (yalnız disp saklanır). Worklet tabloyu kaybederse 'need' ile yeniden üretilir; processorerror sonrası tablolar AudioWorkletGlobalScope'taki global Map'te kaldığı için yeniden gönderilmez, eksik olan 'need' ile gelir.
- Tablo yalnız bir osilatör kullanıyorsa ya da worklet 'need' ile istediyse kurulur; LCD'nin tableDisp isteği yalnız disp üretir (LRU çalkalanmasın). Kapalı osilatörün tablosu üretilmez (açılınca worklet 'need' gönderiyor). LRU sayımına 'sub' girmez; kullanılan (pinned) tablolar düşürülmez. Başarısız üretim ('terr') aynı sınıfta tekrar denenmez.
- Worklet hazır olmadan gelen tablo sonuçları bekletilir, node kurulunca gönderilir.
- eco ile std/hq farklı mip uzunlukları kullandığı için tablo sınıfı ('eco' | 'std') değişince yüklü tablolar ve 'sub' düşürülüp yeni sınıfta üretilir; hq ve std aynı veriyi ('std') ister.
- CPU: worklet cpu'yu 32 blokta bir yeniler, meter 12 blokta bir gelir → aynı cpu değeri yeni ölçüm sayılmaz; kademe düşünce 2 sn yeni ölçüm beklenir. Kademeler hq→std→eco→poly 6→poly 4 ({t:'profile', p, cap}); toplam ses bütçesi (16 std/hq, 10 eco) synth track sayısına bölünür. CPU kademeleri yalnız prefs.quality değişince sıfırlanır.
- S.prefs.quality: 'auto'|'hq'|'std'|'eco'; auto = mobil UA veya hardwareConcurrency<=4 → eco, değilse std.
- processorerror: node yeniden kurulur + toast 'Ses motoru yeniden başlatıldı'; 3 hatadan sonra PeriodicWave yoluna geçilir + toast 'Ses motoru basit moda geçti'.
- Fallback (§14) sadeleştirildi: filtreler Serial (f1→f2), Mono = tek ses (legato/glide yok), matristen yalnız Velocity→Amp ile PB/Note PB aralıkları okunur; Pan, FX, unison, Env2/3, LFO, Mod Wheel ve basınç yok; ADSR Slope'ları yok; ses tavanı 8. PeriodicWave katsayıları ana thread P3TableGen.coefs'ten (<=256 harmonik, script dinamik yüklenir); o yüklenene dek Worker disp verisinin DFT'si (127 harmonik), o da yoksa sinüs. Position/tablo değişimi <=15 Hz ile dalgayı yeniler; filtre ve seviye canlı güncellenir, diğerleri sonraki notada.
- Panic ve visibilitychange(hidden) panic'i p3-input'ta (zaten var); engine gizlenince yalnız master'ı 20 ms'de 0'a çeker, görünür olunca geri getirir ve askıdaki context'i resume eder.
- drums.load() init içinde bir mikro görevde çağrılır (init'in dönen Promise'i drum yüklemesini beklemez).
- GOREV B: worklet §H4/§H5 kodu gözden geçirildi, değişiklik gerekmedi; yalnız extras.mjs'e §H4 testi eklendi.

### Entegrasyon
- p3-app.boot(): mod kartı click'inde P3.audio.unlock() çağrılmalı; yedek capture dinleyicileri (pointerup, touchend, mousedown, keydown, click) de unlock() çağırabilir (idempotent, tek context). S.app.audio 'interrupted' veya 'suspended' ise 'Sesi yeniden başlat' çipi gösterilip dokunuşta unlock() çağrılmalı.
- p3-app bus 'toast' {text} olayını göstermeli (engine CPU düşürme ve processorerror için yayınlar).
- p3-lcd: rozet için S.app.audio === 'fallback' → 'Basic audio'. Wavetable görselleştirmesi P3.wt.tableDisp(tableId) kullanmalı; null dönerse bus 'table' {id} olayında (engine ayrıca P3.lcd.invalidate() de çağırır) yeniden çizmeli. Position çizgisi P3.wt.meter(0).pos1/pos2 (modüle edilmiş) olabilir.
- p3-modes: canlı notalar P3.wt.noteOn(track, 'p:'+src, midi, vel) / noteOff(track, 'p:'+src); drum track'te P3.wt.noteOn false döner (P3.drums.trigger kullanılır). Preset için P3.modes.applyPreset P3.wt.applyPreset'e delege edebilir (store.tx('Preset') zaten orada). Parametre yazımı store üzerinden (P3.wtp.slotTurn → store.set) yeterli; engine 'state' olayından gönderir, ayrıca P3.wt.setParam çağrılması gerekmez.
- Strip: P3.wt.pb(0, v) ve P3.wt.mw(0, v) (−1..1 / 0..1). Kanal basıncı için EKLEME P3.wt.press(i, v).
- p3-seq: P3.wt.noteOn/noteOff(..., when) ctx zamanıyla; metronom P3.audio.metroOut'a bağlanmalı; kayıt zamanı için P3.audio.toCtxTime(performance.now anı). Tempo için bus 'transport' {bpm} yeterli (engine worklet'e iletir).
- Motor bus 'state' dinleyicisini init() içinde kurar (dosya yüklenirken yan etki yok); init'ten önceki store değişiklikleri init/ensureTrack sırasında tam durum olarak gönderilir.
- p3-drums: output() P3.audio.trackInput(1)'i kullanıyor; zincirler drums.load'dan önce kuruluyor.
- Test ortamı: /private/tmp/claude-501/-Users-berkayer/15ce0e09-4467-4865-a6d2-4851bba74590/scratchpad/p3test/engine.test.mjs taze vm bağlamında gerçek core + wt-params + engine yükler; Dalga 3 entegrasyon testinde örnek alınabilir.

### Açık sorular (README §I'da karara bağlandı)
- tracks.i.vol / tracks.i.pan birimleri (dB ve −1..1 kabul edildi) Mix modu (Faz 2) yazılırken kesinleşmeli.
- Headphones (S.vol.phones) tarayıcıda ayrı çıkış olmadığı için sessiz; Volume encoder'ı phones hedefindeyken main'i mi etkilemeli?
- iOS 'interrupted' durumunda resume başarısızsa close + yeni AudioContext yapılmadı (doğrulanmamış, dogrulanmis-dsp-web HALA BELIRSIZ); gerçek cihazda denenmeli.
- CPU eşiği ve kademeler gerçek cihazda (orta segment Android, eski iPhone) ölçülmeli; 2 sn bekleme süresi VARSAYIM.
- Safari'de Blob URL ile audioWorklet.addModule davranışı doğrulanmadı (ilk yol statik mutlak sürümlü dosya olduğu için normalde gerekmiyor).

## leds

### API
P3.leds = {
  init()                  // bus: state, transport, tick, note, panic, in, history, drums, step, overlay, mode, restore, layout, lang; prefers-reduced-motion izlenir; idempotent (2. cagri invalidate('*'))
  invalidate(ids|'*')     // id, 'upper*' gibi desen, 'dpad'/'octpage' grubu, 'pads', 'strip', 'encN', {pad:[x,y]}
  padColor(x, y)          // -> hex (saf kural; y alttan). 64 Notes / Drum Loop Selector
  padLabel(x, y)          // -> aria-label metni (EKLEME)
  controlLed(id)          // -> {m:'off'|'dim'|'on'|'blink'|'pulse', c, k?, o?} (saf kural, basili tutma dahil; gate/flash/reduced-motion HARIC)
  shown(id)               // -> gosterilen durum (gate + flash + reduced-motion dahil) (EKLEME, test/ogretici icin)
  flash(ids, ms=300)      // beyaz kisa yanma; ids: kontrol id/desen/grup, {pad:[x,y]}, 'pads'
  setTarget(ids)          // #p3Live P3.dev.targetG icine beyaz cerceve (grup = tek cerceve, 1.2 s pulse, reduced-motion sabit) + hotspot .p3-hl.target; [] temizler
  setDisabled(ids)        // LED/pad ledOff/off; hotspot aria-disabled="true" + p3-disabled (hotspot ve .p3-hl); {pad:[x,y]} gridcell'e de aria-disabled; [] hepsini acar
  isLit(track, midi)      // 'note' olaylarindan calan perde (EKLEME)
  color: {shade, tint, mix}
}
Boyama: #p3Live elemanlarina yalniz el.style.color yazilir (klonlar currentColor), son yazilan deger onbellekte; tek rAF + dirty set; blink/pulse ve hedef cercevesi varken <=30 fps setTimeout ile uyanir (bosta rAF donmez). Faz: calarken P3.seq.beatNow(), yoksa son 'tick' + bpm, durukken 120 BPM ic saat.

### Sapmalar
- Dosya diskte vardi (ilk denemeden). Sifirdan yazilmadi: okundu, sozlesmeye gore duzeltildi ve test edildi. Duzeltmeler asagida.
- Basiliyken yanma yalniz 'dim' LED'lere uygulanir (onceden off olanlar da yaniyordu). Kullanilamayan kontrol (sinirdaki Octave, bos Undo, islevsiz light bar) basinca da sonuk kalir (dogrulanmis-donanim §4: kullanilabilir = dim, basiliyken on). User ve Convert hic yanmaz.
- Blink/pulse zamanlamasi kontrol haritasini izler: blink 1 vurus/%50, pulse 2 vurus sinus. dogrulanmis-donanim §4'teki 1/8 blink ve 1/4 pulse '(ç)' isaretli bir cikarim ve 120 BPM'de 4 Hz yanip sonme demek, bu da WCAG 2.3.1'in 3 Hz sinirini asar. Ayni nedenle 180 BPM'in ustunde blink periyodu 2 vurusa cikiyor.
- Drum 'note' olayi: `note` MIDI numarasi (36+pad) sayilir. Olay `note` yerine `pad` tasirsa 36+pad kullanilir.
- Drum pad solo/mute icin §D'de alan yok. Bu yuzden t.padSolo[pad] ve t.padMute[pad] okunuyor, alan yoksa ikisi de kapali sayilir.
- Step'ler ve loop pad'leri track'in calan clip'ini okur, calan clip yoksa slot 0'i (VARSAYIM: Faz 1'de tek slot var). Clip uzunlugunun disindaki step off (VARSAYIM). Clip yokken gorunen sayfanin loop pad'leri beyaz, digerleri off. Basili tutulan step'in blink'i (F2) yok.
- Record LED'i: 'rec' ve 'overdub' durumlarinda kirmizi on. 'countin', 'pending' ve 'armed' durumlarinda blink. Diger durumlarda kirmizi x0.3 (dim), basiliyken kirmizi on.
- Page ◀▶: drum track'te gidilecek sayfa varsa dim, yoksa off. Learn'de dim, 64 Notes'ta off. D-pad: Scale menusunde gam listesinin ucunda off, digerlerinde dim. Scale menusu disinda dim.
- Bank gorunumunde switch option'lari (Filter 1/2, Slope vb.) her zaman beyaz (VARSAYIM: In Key LED'i gibi iki durum da gecerli bir secim). Action option'i etkinse dim, degilse off. Drum track'te bank gorunumu yok, zincir kurallari gecerli.
- Learn overlay acikken upper1..8 dim, lower off (VARSAYIM: bolum baslatma dugmeleri).
- Zincir gorunumunde lower dugmesi sonuk: muted track, solo varken solosuz track, Stop Clip basiliyken durmus track. Secili track her zaman beyaz.
- aria-pressed registry'deki toggle'lara ek olarak Scale ve Learn'e de yazilir. Pad aria-label'i sartname-mobil bicimini izler ve konum eki tasir: 'C1, kök nota, satır 1 sütun 1'. Nota adlari p3-scale'den geldigi icin bemollu (D♭1, C#1 degil). Drum: 'Kick, pad 1'. Bos drum pad: 'E1, boş pad'. Step: 'Adım 5, nota var|boş|susturulmuş'. Loop: 'Loop sayfası 2'.
- S.prefs.noteNames aciksa pad'lere nota/ses adi yazilir ve kok pad'lere ic cerceve cizilir (WCAG 1.4.1). Bunun icin kendi grubumuz .p3-live-padmarks, pad'lerin hemen ustunde durur.
- Strip noktasi ve encoder dokunma halkalari da bu modulde boyanir. Nokta S.strip'ten gelir (drum track'te bank konumu). Halka 'in' touch olayindan ya da S.wtui.touched'dan.
- Drum playhead 'tick' ile her karede boyanmaz. Pad'ler yalniz playhead yeni bir step'e ya da loop pad'ine gecince kirlenir. seq'in 'step' olayi da pad'leri kirletir.
- Bu turdaki duzeltmeler: step aria-label'i artik calarken playhead rengine degil clip icerigine bakiyor (stepInfo). setTarget sonrasi hedef opaklik onbellegi sifirlaniyor. 'in' olayinda dpad/octpage icin ev.id tercih ediliyor. Transport durunca tick anahtari sifirlaniyor.

### Entegrasyon
- p3-app.boot() icinde P3.dev.load() cozuldukten sonra P3.leds.init() cagrilmali. Cihaz yuklenmeden once gelen kirli isaretler bekler; p3-device'in 'layout' olayi bunlari yeniden tetikler.
- p3-modes: canli pad'ler icin 'note' {track, note, on, src} yayinlamali. Drum'da note = 36+pad olmali (ya da pad alani). on:false mutlaka gonderilmeli; pad kaynakli yanmayi yalniz panic temizler.
- p3-seq: 'note' src:'seq' olaylarinda on:false da yayinlamali (drum dahil). Transport durunca 'transport' {playing:false} yayinlanmali; seq kaynakli yanmalar o anda temizlenir. P3.seq.playhead(track) calmiyorsa null veya -1 donmeli. Clip notalari yerinde degistirilirse 'step' olayi ya da ilgili yol icin store.set 'state' olayi yayinlanmali, yoksa step'ler yeniden boyanmaz.
- Record FSM'in bekleme durumlari 'countin', 'pending' ya da 'armed' adlarindan biriyle yazilirsa LED blink yapar. Baska bir ad secilirse p3-leds'teki WAIT_STATES'e eklenmeli.
- p3-app/tut: setTarget ve setDisabled 'upper*' desenini, 'dpad'/'octpage' grup adlarini, 'pads' kimligini ve {pad:[x,y]} bicimini kabul eder. Bos dizi temizler. Kabuk CSS'i .p3-hotspot[aria-disabled] ile karartiyor; p3-disabled sinifi icin kabukta ayrica stil yok (hotspot ve .p3-hl'e ekleniyor), gerekirse Dalga 3 CSS ekleyebilir. Pad yuzeyi .p3-hotspot sinifi tasimadigindan kabugun ::before karartmasi pad'lere uygulanmaz; pad'ler LED olarak off'a iner.
- LCD encoder slider'larinin aria-valuenow ve aria-valuetext'i p3-lcd'de (§H10). p3-leds yalniz aria-pressed, pad aria-label ve aria-disabled yazar.
- Nota adlari katmani S.prefs.noteNames ile acilir; 'state' olayi yeterli, ayrica cagri gerekmez.

### Açık sorular (README §I'da karara bağlandı)
- Fixed Length ve Lock icin §D'de durum alani yok. Faz 2'de alan eklenince fixedLength kurali (acikken on) ve aria-pressed bu alana baglanmali. Su an her zaman dim / false.
- Drum pad solo/mute alan adlari (padSolo/padMute) p3-modes ile birlikte kesinlesmeli. Faz 1'de bunlari kimse yazmiyor.
- Page ▶ kurali (clip uzunlugu icinde sonraki sayfa varsa dim) p3-modes'un sayfa gezinme sinirlariyla ayni olmali. Gercek Push'ta clip disina sayfalamanin mumkun olup olmadigi dogrulanmadi.
- Kayit disi transport.rec degerinin adi ('play') ve bekleme durumu adi p3-seq'e bagli. Yukaridaki entegrasyon notuna bakin.

## lcd

### API
P3.lcd = {
  init(canvas?)        // canvas yoksa #p3LcdCanvas; #p3LcdLive'ı bulur; bus dinleyicileri bir kez kurulur (tekrar çağrı güvenli); fontları bekler; invalidate() eder. Arka tamponu P3.dev.align() kurar (P3.dev yoksa kendisi CSS px × DPR≤2).
  invalidate()         // tek rAF'te çizim, en çok 30 fps (durum olaylarından gelen çizimler dahil); statikken döngü yok
  popup(text, sub?, ms?) // S.popup = {text, sub, until} store'a {silent:true} (undo ve 'state' olayı yok); ms varsayılan P3.K.POPUP_MS; bitişte kendiliğinden kapanır
  pages: { device, bank, scale, learn, unsupported }   // her biri (ctx, S) → 960×160 mantıksal koordinatta çizer
  summary()            // #p3LcdLive metni (TR çerçeve + EN parametre adları)
  // EKLEME:
  render()             // anında tam çizim + ARIA + canlı bölge (test/selftest)
  filterResponse(fp, f, fs?) // |H(f)|, fp = {type 0..4, slope, res 0..1.25, morph, freq}; fs verilirse worklet'in dijital (TPT/bilineer) yanıtı birebir, yoksa analog w=f/fc
  learnChapterAt(k)    // Learn açıkken upper k (1..8) hangi bölüm slug'ını açar (sayfa dahil) | null
  text: { volume(S?) → 'Main Output: -10.0 dB' | 'Headphones: …' | 'Main Track: …' | 'Cue: …', swingTempo(S?) → 'Tempo: 120.00 BPM' | 'Swing Amount: 58%' }
}
Dinlediği olaylar: 'state' (held/strip/popup yolları hariç hepsi → invalidate), 'in' (enc touch), 'note' (on → canlı Position izleme), 'restore' (popup temizlenir), 'layout', 'lang', 'transport', 'drums', 'overlay', 'mode'.
Okuduğu dış API: P3.wtp (BANKS[i].slots/options/vis(+vis.next), slotView, VIRTUAL, PARAMS, IDX, tableId, audibleTable, lfoShape, envCurve, SRATE_BARS), P3.scale, P3.drums.KIT/hasSound, P3.wt.tableDisp(id) ve P3.wt.meter(track) (isteğe bağlı), P3.audio.ctx.sampleRate (isteğe bağlı, yoksa 48000), P3.tut.CURRICULUM (isteğe bağlı), P3.save.get('tutorial'), P3.dev.hotspotEl/CONTROLS.
Yazdığı DOM: #p3LcdCanvas (çizim), #p3LcdLive (textContent), enc1..8 hotspot'larında aria-label / aria-valuenow / aria-valuetext ('Frequency 20.5 kHz'), volume ve swingTempo'da aria-valuenow / aria-valuetext. aria-disabled'a ve aria-pressed'e dokunmaz (p3-leds'in).

### Sapmalar
- r7 taban çizgisi 155 değil 153 (çip y+13; r0'daki 2/15 ile aynı iç boşluk). 155'te çip içinde alt boşluk 2 px kalıyordu.
- Görselleştirme altında olmayan enum sütunlarında liste r2'de, halka yok. İkon listelerinde (filtre tipi, LFO şekli, Loop, Routing) seçili değerin adı r3'te küçük yazılır.
- Enum listesi, seçili öğeyle biten ve sütuna sığan en uzun diziden başlar (seçili öğe hep görünür). Sağda kesilen öğeden 3 harften azı kalacaksa o öğe çizilmez ('Temel Şekiller P' gibi kalıntı okunmuyordu). İkon aralığı 6 px (5 filtre ikonu 104 px'e tam sığar), metin aralığı 8 px.
- Listesi ve halka normu olmayan sanal değer (Mod Target) r2'de küçük metindir. On/Off parametreleri 'Off On' metin listesi olarak çizilir ('activate' ikonu yok).
- Osilatör ikonları kendi çizimimiz: kutu içinde 1 / 2 / S / M. Filter Switch option'ı 'Filter 1  Filter 2' yazar (P3.wtp'nin değerleri '1','2').
- Option satırı: toggle'da ad track renginde, 'On' beyaz. Switch'te seçili kelime beyaz, diğeri track renginde. Etkin olmayan action (Add to Matrix) gri.
- Wavetable: AdjustingPosition Table ve Category'ye dokunmayı da kapsar. Komşu kareler (3+3, ±0.06, %35, 1 px) hafif çapraz kaydırmayla 3B istif olarak çizilir. Position işareti vis altında ince iz + 2 px çentik. Tablo verisi yoksa düz çizgi çizilir ve veri gelene dek 400 ms'de bir bakılır.
- Filtre eğrisi worklet'in birebir dijital yanıtıdır: aynı SVF katsayıları, bilineer eşleme ve fc kırpması (min(20 kHz, 0.45·fs)). Şartnamedeki analog w=f/fc, 12 kHz'te 6.5 dB sapıyordu. Drive gösterilmez. Serial'de açık filtrelerin çarpımı + diğer filtrenin eğrisi 1 px %40; Parallel/Split'te iki ayrı eğri; kapalı seçili filtre gri.
- Envelope: A/D/R genişlikleri t^(1/3) ile göreli sığdırılır, kenarlarda 4 px pay. Dokunulan yokken tüm öğeler 2 px ve tam opak.
- LFO: 1 px sıfır çizgisi. Random, lfoShape(4, shaping, basamak) ile periyot başına 8 deterministik basamaktır. Attack doğrusal açılır; Mod Time periyot/Attack oranını değiştirmediği için çizime katılmaz.
- Drum Rack (§H14): 4×4 ad ızgarası sütun 0–3 ve r3–r6'da, fiziksel pad yerleşimiyle aynı (sol alt = bank'ın ilk pad'i). Sesi olmayan (boş ya da yüklenemeyen) pad soluk. Drum track'te bank görünümü yok.
- Scale ızgarasının kaydırma durumu (c0) LCD modülünde tutulur; görünüm durumudur, undo'ya girmez.
- Learn tek renkli. Seçili bölüm beyaz çipte, tamamlanan bölümlerde vektör ✓ var; Faz 2 bölümleri gri ve '(yakında)'. r7'de TR ipucu ve sayfa göstergesi var. İlerleme P3.save 'tutorial' kaydından (sartname-ogretici §3) okunur. EKLEME: isteğe bağlı S.learnPage ve S.learnSel.
- Ses durumu r6 sağ altında: 'fallback' → 'Basic audio' rozeti (sesli sayılır, ipucu yok). 'failed' → 'Ses başlatılamadı'. Diğer running-dışı durumlar → 'Ses kapalı — bir pad'e dokun'. level1 ve menu modunda ipucu yok.
- Faz 1'de olmayan overlay/view değerleri (mix, clip, fixedLength…) için 'unsupported' sayfası: ad + 'Not in this simulator'.
- ARIA: boş slot'ta aria-label kayıttaki ad ('Encoder 3'), aria-valuetext 'boş'. aria-valuenow 0..100'dür (hotspot min/max): Volume −70..+6 dB, Tempo 20..999, Swing 0..100 üzerinden. Volume hedefi 'track' için S.vol.track okunur, yoksa 0 dB (VARSAYIM).
- #p3LcdLive'da açılıştaki ilk çizim duyurulmaz. Sonraki sayfa/bank/seçici değişimlerinde son durum en çok 500 ms'de bir yazılır.
- Popup'ta sub varsa iki satır olur (ana taban 82, alt satır 104, gri 13 px). 'restore' olayında popup temizlenir; boş metin yok sayılır.
- Font bekleme en çok 2.5 s; sonra sistem fontuyla çizilir, font geç gelirse ölçüm önbelleği boşalır ve yeniden çizilir. ARIA ve canlı bölge fontu beklemez.
- Çizim hatası sayfayı durdurmaz: yakalanır, console.warn(`[p3] lcd çizim hatası:`) yazılır.

### Entegrasyon
- p3-app.boot(): P3.store.init()'ten sonra P3.lcd.init() çağrılmalı (argümansız çağrı #p3LcdCanvas'ı kendisi bulur). P3.dev.load()'dan önce ya da sonra olabilir: align() 'layout' yayınca LCD yeniden çizer. Tekrar init güvenli, dinleyiciler çoğalmaz.
- p3-modes: encoder dokunuşunda S.wtui.touched (0..7, bırakınca −1) store üzerinden yazılmalı. Dokunulan adın beyaz olması, Adjusting* vurguları ve 'Add to Matrix'in etkinliği buna bağlı. LCD ayrıca 'in' enc touch olayında da yeniden çizer.
- p3-modes popup metinleri: P3.lcd.popup(text, sub, ms). Volume, Swing ve Tempo için P3.lcd.text.volume(S) / text.swingTempo(S) kullanılırsa popup ile ARIA metni aynı biçimde kalır ('Main Output: -10.0 dB', 'Tempo: 120.00 BPM', 'Swing Amount: 58%'). Main Track: popup('Main Track', 'Not in this simulator') (§H13).
- Learn overlay: upper k için P3.lcd.learnChapterAt(k) açılacak bölüm slug'ını verir; LCD ve modes aynı sayfa mantığını paylaşır. Page ◀▶ ya da jog ile sayfa değiştirmek için S.learnPage (sayı) store'a yazılabilir; S.learnSel (sayı) seçili bölümü zorlar. İkisi de isteğe bağlı; yoksa kayıttaki güncel bölüm seçilir ve onun sayfası gösterilir.
- p3-tutorial: P3.tut.CURRICULUM dizi ya da {chapters:[…]} olabilir. Bölüm: {id(slug), phase, title:{tr,en}, short?, steps:[{id, phase?}]}. İlerleme P3.save 'tutorial' kaydından okunur: steps['bolum/adim'] = {done|skipped}, chapters[slug].done, current.ch. Tutorial bu biçimde yazarsa Learn sayfası ✓ ve '3/6' gösterir.
- p3-wt-engine: P3.wt.tableDisp(id) (Float32Array F·256) ve P3.wt.meter(trackIndex) → {voices, pos1, pos2} yeterli; LCD için ek olay gerekmez. Veri yoksa LCD 400 ms'de bir bakar; nota çalarken 'note' olayından sonra meter'i ≤30 fps izler. Filtre eğrisi P3.audio.ctx.sampleRate'i kullanır (yoksa 48000).
- S.app.audio ('running' | 'fallback' | 'off' | 'suspended' | 'interrupted' | 'failed') store üzerinden yazılmalı; 'Basic audio' rozeti ve ses ipucu buna göre güncellenir. level1 ve menu modunda ipucu çıkmaz.
- ARIA sahipliği (§H10): LCD yalnız enc1..8 (aria-label, valuenow, valuetext) ile volume/swingTempo (valuenow, valuetext) yazar. aria-disabled (gate) ve aria-pressed p3-leds'te kalır; çakışma yok.
- p3-selftest (Dalga 3): P3.lcd.render() senkron çizer, P3.lcd.filterResponse(fp, f, sampleRate) worklet ile birebir karşılaştırma için kullanılabilir.
- S.view Faz 1'de 'device' kalmalı. modes Faz 2 overlay'lerini (fixedLength, quantize, metronome, setup) S.overlay'e yazarsa LCD 'unsupported' sayfasını gösterir; yazmazsa yalnız popup görünür. İkisi de doğru çalışır.

### Açık sorular (README §I'da karara bağlandı)
- Volume hedefi 'track' (Main Track) hangi değeri gösterecek? §D'de S.vol.track yok. LCD S.vol.track'i okuyor, yoksa 0 dB gösteriyor. modes bu alanı yazacak mı?
- Learn sayfa ve seçim durumu için S.learnPage ve S.learnSel adları modes/app (Dalga 3) ile onaylanmalı. Alternatif olarak yalnız learnChapterAt kullanılıp sayfa hep güncel bölümün sayfası olabilir.
- Learn'de Faz 2 bölümleri (repeat-accent, kayit, session, final) gri ve '(yakında)' olarak listeleniyor. CURRICULUM Faz 1'de bunları içermeyecekse sayfa tek kalır. Hangisi isteniyor?
- Ses ipucu metni ('Ses kapalı — bir pad'e dokun') görevde verildiği için Türkçe; A16'ya göre LCD metinleri İngilizce. Bu istisna kalacak mı?
- Drum Rack sayfasında sütun 4–7 boş (§H14 en sade biçim). Seçili pad'in adı ve notası orada büyük yazılsın mı?
- Instrument Sans'ta ♭ ve ↔ glifleri yok (Scale'deki B♭, 'Tek↔Çift' tablo adı); tarayıcı sistem fontuna düşüyor. Görsel olarak kabul edilebilir göründü; kendi vektör ♭ çizimi istenir mi?

## seq

### API
P3.seq = {
  init() — bus 'state' ve 'panic' dinleyicilerini ve document 'visibilitychange' dinleyicisini bir kez kurar (tekrar çağrılabilir). Store'daki bpm'i sınırlar, playing=false ve rec='idle' yazar.
  play() → bool — beat 0 = ctx.currentTime + 50 ms. 25 ms setInterval ile 100 ms ilerisi planlanır, 'tick' için rAF başlar. launch fazlarını sıfırlar.
  stop() → bool — kaydı bitirir ('rec' ise uzunluğu tam bar'a yuvarlar), açık synth notalarına noteOff gönderir, rec='idle' yapar.
  toggle(), isPlaying()
  beatNow() — çalarken ctx zamanından hesaplanır (≥0), durukken 0.
  beatToTime(b), timeToBeat(t) — tempo bölütleri üzerinden; tempo değişince beat sürekli kalır.
  tap(tMs?) → bpm — son 4 aralığın ortalaması, 2 sn boşluk seriyi sıfırlar, 4. dokunuş duruk transport'u başlatır. S.transport.tapTimes'a silent yazar.
  setBpm(v) → bpm — 20..999, 0.01'e yuvarlanır. setSwing(pct) → 0..100 tamsayı, Faz 1'de yalnız değer. metronome(on?) → bool; argümansız çağrı açıp kapatır.
  recPress() → yeni durum. Durumlar: idle | pending | rec | play | overdub.
  recordNote(track, midi, vel, onAt, offAt?) → bool — offAt'siz çağrı notayı açar; offAt'li ikinci çağrı aynı track+perdedeki açık notayı kapatır; ikisi birlikte verilirse tam nota eklenir. Zamanlar ctx saniyesi; onAt null ise 'şimdi'.
  recording() → {state, track, start}
  clip(track, slot=0) → clip | null
  ensureClip(track, slot, lenBeats) → clip — undo'lu; tx içinde çağrılırsa tx'e katılır.
  deleteClip(track, slot=0) → bool (undo 'Delete Clip')
  stepToggle(track, step, pad=selPad) → 'add' | 'del' | null. Undo etiketi 'Step'. İlk step clip'i CLIP_LEN[grid] beat ile açar; transport duruksa çalmayı başlatır.
  stepMute(track, step, pad=selPad) → true(muted) | false | null(boş step). Undo etiketi 'Step Mute'.
  deletePadNotes(track, pad) → silinen nota sayısı (undo 'Delete Notes'; 0 ise modes karar verir).
  setLoopPage(track, page) → 'new' | 'view' | 'loop' (loop pad'ine tek dokunuş). setLoopRange(track, pageA, pageB) → bool (bas-tut + dokunuş; çift dokunuşta a === b). setFollow(track, on).
  playhead(track) → clip içindeki beat konumu ya da -1.
  BAR: 4
}
Yayınlanan olaylar:
- 'transport' {playing, rec, bpm, swing, metro}
- 'tick' {beat} — rAF'te, yalnız çalarken.
- 'note' {track, note, vel, on, src:'seq'} — ses anında (rAF + zamanlayıcı kuyruğu). 'on'u yayınlanan her notanın 'off'u da yayınlanır.
- 'step' {track, step, pad, op:'add'|'del'|'mute'|'unmute'} — yalnız step düzenlemesinde.
Store yolları:
- transport.playing, transport.rec, transport.bpm, transport.swing, transport.metro, transport.tapTimes: undo'suz yazılır.
- tracks.i.clips.0: bütün clip nesnesi, undo'lu. Bir kayıt geçişi tek undo kaydında birleşir (merge anahtarı).
- tracks.i.page ve tracks.i.follow: loop selector ve auto-follow.

### Sapmalar
- S.transport.rec'e 'pending' eklendi (§D'de yalnız idle|rec|play|overdub vardı). Transport çalarken boş slota kayıt bir sonraki bar'ı bekler. p3-leds bu durumda Record LED'ini zaten yanıp söndürüyor (WAIT_STATES.pending). 'pending'de Record'a tekrar basmak bekleyen kaydı iptal eder (VARSAYIM).
- Record FSM seçili track'in slot 0'ına bakar. Clip varsa Record doğrudan overdub açar ve transport duruksa beat 0'dan çalmayı başlatır; bu Live'ın Session Record davranışı, aksi hâlde kayıt mevcut pattern'i silerdi. Clip yoksa yeni kayıt başlar: durukken beat 0'dan, çalarken sonraki bar'dan. Böylece §A8'deki idle→rec→play→overdub↔play zinciri korunur. 'play' durumunda seçili track'in clip'i yoksa Record o track'e yeni kayıt başlatır.
- Kayıt yalnız şu durumlarda yazılır: 'rec'te kaydedilen track'e, 'overdub'da slot 0'ında clip olan track'e. t.arm === false ise yazılmaz (Faz 1'de arm hep açık).
- Fixed Length kapalıyken kayıt sürdükçe clip bar bar büyür, böylece LED'ler notaları görür. Kayıt bitince uzunluk yukarı tam bar'a yuvarlanır. VARSAYIM: bar çizgisinden sonraki 1/16 nota (REC_GRACE = 0.25 beat) içinde durdurulursa aşağı yuvarlanır; o arada girilen notalar döngü başına sarılır.
- 'rec' sürerken kaydedilen clip çalınmaz (notalar zaten canlı duyuldu). 'play'e geçince clip, kaydın başladığı bar'dan itibaren döngüye girer. Bu launch fazı seq içinde tutulur ve play() sıfırlar.
- Bir kayıt ya da overdub geçişinin tüm yazıları tek undo kaydında birleşir (store merge anahtarı 'rec:N'). Etiketler 'Record' / 'Overdub'. Araya başka bir undo'lu işlem girerse sonraki notalar yeni bir kayıt açar.
- Overdub, aynı yere (±1e-6 beat) aynı perdeyi ikinci kez yazmaz; bunun dışında birleştirme ya da kırpma yapmaz. Döngüdeki clip'te nota süresi loop sonunda kesilir, çalarken de loop sonunda kesilir.
- 'step' olayı playhead için değil, step düzenlemesi için yayınlanır: {track, step, pad, op}. Playhead için 'tick' yeterli (ortak sözleşme). 'transport' yüküne swing ve metro eklendi.
- Stop sırasında ileriye planlanmış (≤100 ms) drum vuruşu varsa P3.drums.panic() çağrılır. P3.drums yalnız gelecekteki sesleri iptal eden bir API sunmadığı için o an çalan drum kuyrukları da 10 ms'de kısılır; bu, stop'tan sonra 'hayalet vuruş' duyulmasından iyidir. Synth'te gelecekteki noteOn'un off'u max(now, onZamanı) ile gönderilir, çünkü worklet olayları zaman sırasıyla işler; bu yüzden en kötü durumda çok kısa bir release duyulabilir.
- Drum track'te t.padMute[pad] ve t.padSolo[pad] (p3-leds'in okuduğu alanlar) çalmayı da etkiler.
- Auto-follow eklendi: çalarken drum track'in tracks.i.page değeri çalan sayfayı izler. tracks.i.follow === false iken izlemez. setLoopPage'de loop içine tek dokunuş izlemeyi kapatır, setLoopRange açar. setLoopRange ve setFollow sözleşmede yoktu (EKLEME).
- AudioContext yoksa ya da 'running' değilse transport performance.now saatiyle çalışır: LED, tick ve 'note' olayları sürer ama ses planlanmaz. Ctx çalışır hâle gelince saat, beat korunarak ona devredilir.
- Faz 1'de tracks[i].playing yazılmaz: her track'in çalan clip'i slot 0'dır (Session Faz 2). p3-leds bununla uyumlu (playing<0 ise slot 0'ı okuyor).
- Kaçırılan olay toleransı LATE_S = 50 ms (VARSAYIM): bu kadar geciken olay hemen çalar, daha geç kalan atlanır. Note-off'lar asla atlanmaz; ufka giren her açık nota kapanır.
- Stop'tan sonra play her zaman beat 0'dan başlar (Session clip'leri baştan). Durukken beatNow() = 0 döner.
- Store restore ('*') transport'u başlatmaz: çalıyorsa durur, bpm sınırlanır, rec='idle' yapılır.
- Drum clip çalarken nota numarası mutlaktır: pad = note − 36. Bank ofseti yalnız pad seçiminde (drumCell) kullanılır; step'e selPad (bank dahil) + 36 yazılır.

### Entegrasyon
- p3-app.boot() şu sırayı izlemeli: P3.store.init() → P3.seq.init(). init store'a transport.playing=false ve rec='idle' yazar; kayıtlı durumdan gelen 'playing:true' transport'u başlatmaz.
- p3-modes, Play düğmesinde P3.seq.toggle(), Record'da P3.seq.recPress(), Tap Tempo'da P3.seq.tap(), Metronome'un kısa basışında P3.seq.metronome() çağırır. Swing&Tempo encoder'ı tempo için P3.seq.setBpm(bpm ± 1, Shift'te ± 0.1), swing için P3.seq.setSwing() kullanır. Store'a doğrudan transport.bpm yazmak da çalışır: seq dinler, 20..999 aralığına sınırlar ve yeniden bağlar.
- Canlı pad kaydı: note-on'da P3.seq.recordNote(track, midi, vel, onCtx), note-off'ta P3.seq.recordNote(track, midi, vel, onCtx, offCtx). onCtx için P3.audio.toCtxTime(ev.t) ya da ctx.currentTime kullanılır. Durum kontrolü seq'te: kayıt yoksa false döner, modes her zaman çağırabilir. Drum pad'lerinde midi = 36 + pad (bank dahil).
- Drum Loop Selector (drumCell) eşlemesi: {k:'step'} → P3.seq.stepToggle(1, step) (Mute basılıyken stepMute). {k:'loop'} tek dokunuş → setLoopPage(1, page); bas-tut + ikinci pad → setLoopRange(1, a, b); 500 ms içinde çift dokunuş → setLoopRange(1, p, p). Delete + drum pad → deletePadNotes; 0 dönerse 'pad boşaltılır' davranışı modes'ta (Faz 1'de popup). Delete tek başına → deleteClip(sel.track). Page ◀▶ tek basış modes'ta tracks.i.page'i değiştirir ve setFollow(i, false) çağırır; basılı tutunca setFollow(i, true).
- p3-leds hazır: playhead(track), beatNow(), 'tick', 'transport', 'note' {src:'seq'} ve rec='pending' → Record LED blink ile uyumlu. Step renkleri için clip.notes[].m kullanılıyor.
- p3-wt-engine: P3.wt.noteOn(i, 'seq:N', midi, vel, at) ve noteOff(i, id, at) 'at' değerini ctx saniyesi olarak alır; seq geçmiş zaman göndermez (her zaman ≥ currentTime). Engine tempo için 'transport' olayını ya da state 'transport.bpm'i dinleyebilir (LFO sync / worklet 'tempo' mesajı).
- p3-wt-engine şunu sağlamalı: P3.audio.metroOut (Cue yoluna bağlı GainNode). Yoksa seq sırayla master.cue'ya, o da yoksa ctx.destination'a düşer. Metronom seviyesi 0.5 (VARSAYIM); Cue Volume ile ayarlanır.
- §A12: gizli sekmede engine master'ı kısar. seq zamanlayıcıyı durdurmaz; görünür olunca (visibilitychange) hemen beat'i yeniden hesaplar ve kaçırılan olayları atlar. P3.panic (blur / gizlenme) transport'u durdurmaz, yalnız açık kayıt notalarını kapatır.
- Undo/redo: clip işlemleri store kayıtlarıdır (etiketler 'Step', 'Step Mute', 'Delete Notes', 'Delete Clip', 'Loop', 'Clip', 'Record', 'Overdub'). Transport alanları undo'ya girmez. modes, play/recPress/stepToggle'ı başka bir store.tx içinden ÇAĞIRMAMALI; aksi hâlde transport yazıları o undo kaydına karışır.
- Öğretici 'drum' bölümü: kick {0,4,8,12} ve benzeri koşullar P3.S.tracks[1].clips[0].notes üzerinden kontrol edilebilir (p = 36 + pad, t = step·0.25 beat, grid 1/16). Adım düzenlemeleri 'step' olayıyla izlenebilir. Tap tempo koşulu: S.transport.playing && bpm.
- p3-lcd, Tempo/Swing popup'ı için S.transport.bpm ve S.transport.swing'i, kayıt durumu için P3.seq.recording() ya da S.transport.rec'i okuyabilir.

### Açık sorular (README §I'da karara bağlandı)
- P3.drums'a yalnız gelecekteki (henüz başlamamış) sesleri iptal eden bir API eklensin mi, örneğin cancelAfter(t)? Eklenirse stop()'taki drums.panic() yerine o kullanılır ve çalan drum kuyrukları kesilmez. Aynı ihtiyaç worklet için de var: gelecekteki noteOn'u iptal eden bir mesaj ({t:'cancel', id}) stop'taki kısa release'i önler.
- Clip varken Record'un doğrudan overdub açması (Live Session Record) ile §A8'in harfiyen uygulanması (her zaman yeni kayıt, mevcut clip'in üzerine yazma) arasında seçim: overdub'ı seçtim. Onay gerekiyor.
- Kayıt bitişindeki REC_GRACE (bar'dan sonra 1/16 içinde durdurunca aşağı yuvarlama) ve 50 ms'lik kaçırılan olay toleransı (LATE_S) kulakla doğrulanmalı.
- 'pending' durumunda Record'a tekrar basmak bekleyen kaydı iptal ediyor (VARSAYIM). Gerçek Push'ta bu durumun nasıl davrandığı doğrulanamadı.

## input

### API
P3.input = { init() -> bool, setKeyboard(on) -> bool, releaseAll(), focus() /*sahneyi (#p3Stage) odaklar*/, kbVelocity() -> 1..127, util: {accel, encDrag, wheelNotch, kbPad, jogDelta, flickDir, posVel, groupLeaf, ENC_PX, STEP_PX, JOG_DEG, KB_ROWS} }. Tum girdi P3.bus.emit('in', ev): {k:'pad', x, y(alttan), down:true, vel, src:'p<id>'|'key:<code>', t} / {k:'pad', x, y, down:false, src, t}; {k:'btn', id, down:true} / {k:'btn', id, down:false, dt}; {k:'dpad'|'octpage', id(dpadUp..dpadC | octaveUp/Down, pageLeft/Right), dir, down[, dt]}; {k:'enc', id, turn, steps, fine}; {k:'enc', id, touch:true|false}; {k:'enc', id, press:true}; {k:'enc', id, reset:true}; {k:'enc', id:'jog', nudge:'left'|'right'}; {k:'strip', v(0..1 alttan), down|move|up:true}; {k:'btn', id:'escape', down[, dt]}; {k:'btn', id:'lcd', down}. Ek bus olayi: 'keys' {} (Shift+Slash, tus etiketi katmani). Dinledigi: bus 'panic' (yalniz pad'leri birakir), bus 'state' (prefs.kbOn kapaninca klavye basililarini birakir).

### Sapmalar
- Dosya ilk denemeden diskte vardi; sifirdan yazilmadi. Tamami okundu ve sozlesmeye gore incelendi. Duzeltmeler: (1) padMove'da konumu hesaplanamayan ornek (toSvg null, katman hizasiz) artik notayi kesmiyor, atlaniyor. Eskiden hucre yedegi capture sonrasi hep null donuyor ve notayi erken kapatiyordu (padHit -> padHitAt + cellHit). (2) keydown'da e.isComposing (IME) ve bos e.code yok sayiliyor. (3) Ivme hiz biriminin VARSAYIM'i (px/ms) ve slider tekrar kurali dosya basina eklendi.
- dpad/octpage olaylari dir'e ek olarak yaprak id tasir (dpadLeft, octaveUp...); dt yalniz down:false'ta.
- LCD hotspot'una tiklama {k:'btn', id:'lcd', down} uretir (Seviye 1 'Ekran' gorevi icin); modes bunu yok saymali.
- Jog yatay firlatma (>20 px, <200 ms) {k:'enc', id:'jog', nudge:'left'|'right'} verir; firlatmayla karismasin diye donus ilk 200 ms bekletilir. Jog yalniz tam centikte (15 derece) olay verir.
- Cift tik reset'i yalniz enc1..8'de. Volume/Swing&Tempo/Jog'da tik = press:true oldugundan cift tik iki basis sayilir. Bunlar odakta Delete tusuyla ya da Delete basiliyken dokunarak sifirlanir.
- Delete (dugme ya da Backspace) basiliyken encodera dokunmak touch:true'nun ardindan reset:true yayar.
- Encoder: 4 px'in altindaki hareket surukleme sayilmaz. press yalniz HOLD_MS'den (300 ms) kisa tikta gelir. steps ivmesiz ham px'ten sayilir (enum/int parametreler ivmeyle secenek atlamasin); ivme yalniz turn'e uygulanir ve yalniz fine degilken.
- Tekerlek: |delta| >= 40 px tam bir centik sayilir; trackpad'in kucuk delta'lari 40 px'te bir centik olur, 300 ms bosluk ya da yon degisimi birikimi sifirlar.
- Ctrl/Cmd+Shift+Z: Shift basili degilse gecici Shift + Undo bas/birak (Push'taki Shift+Undo = Redo). Ctrl/Cmd+S -> Save dugmesi (haritada var). Kombinasyonlar tek tus olmadigi icin kbOn'dan bagimsiz ama yine yalniz sahne odaktayken calisir.
- Escape metin alani disinda her yerde releaseAll + P3.panic('escape') yapar. {k:'btn', id:'escape'} yalniz sahne odaktayken gonderilir (modal acikken overlay kapanmasin). kbOn kapaliyken de calisir.
- contextmenu: sahnede yalniz engellenir, panic yok. Android'de pad'e uzun basmak contextmenu uretir; panic orada basili notayi keserdi. Sahne disinda menu acilirsa ve basili bir sey varsa releaseAll + panic yapilir.
- bus 'panic' (mod degisimi, overlay acilisi) yalniz pad'leri birakir; parmak kalkana dek o pointer yeni nota uretmez. Dugmeler birakilmaz: Scale basiliyken acilan overlay momentary kalmali. blur/visibilitychange(hidden)/pagehide/Escape ise tam releaseAll + panic yapar.
- Odak: #p3Stage'e tabindex=-1 verilir ve pointerdown'da sahne odaklanir. Tek tus kisayollari sahne ya da icindeki bir kontrol odaktayken ve kbOn iken calisir. Odakli kontrolun kendi tuslari (encoder/strip slider oklari, grid oklari, dugmede Enter/Space) once gelir ve kbOn'dan bagimsizdir (erisilebilirlik).
- Encodera klavye odagi (:focus-visible) touch:true verir; fareyle gelen odak vermez. Hover, pointerover/out + relatedTarget ile izlenir (pointerenter kabarcik yapmadigi icin); dokunmatik pointer hover sayilmaz.
- Klavye velocity'si (Minus/Equal ±20, 1..127) yalniz oturumda tutulur ve LCD popup gosterir ('Key Velocity'). BracketLeft/Right prefs.kbWin'i (0..4) undo'suz store'a yazar, popup 'Keyboard / Pad rows a-b'. Shift+Slash bus 'keys' {} yayar; Slash tek basina Tap Tempo.
- Strip klavyeyle (odaktayken): yukari/sag ok +0.1, asagi/sol ok -0.1, PgUp/PgDn ±0.25, Home/End 0/1. Baslangic degeri S.strip'ten (PB -1..1 -> 0..1). Tus basiliyken down/move, birakinca up.
- e.repeat tek tus kisayollarinda ve pad tuslarinda yok sayilir; odakli slider'da (encoder, strip) ok ve PgUp/PgDn tekrarlari ARIA slider gelenegine gore degeri surdurur.
- macOS'ta Cmd basiliyken diger tuslarin keyup'i gelmez: Cmd birakilinca klavyeyle basili her sey birakilir.
- Pen pressure kullanilmaz (karar A6: Faz 3). velMode 'position' yalniz pointer pad'lerinde gecerli; klavye pad'lerinde kbVelocity (Shift'te P3.K.kbVelShift=70).

### Entegrasyon
- p3-app.boot(): P3.input.init() P3.dev.load() tamamlandiktan SONRA cagrilmali (#p3HotspotLayer gerekli; dinleyiciler katmanda oldugu icin hotspot yeniden kurulumu sorun degil). Baglanti: P3.bus.on('in', function(ev){ if (P3.app.gate(ev)) P3.modes.dispatch(ev); }).
- p3-app oyuna girerken P3.input.focus() cagirmali; aksi halde klavye kisayollari sahne odaklanana (ilk dokunusa) kadar calismaz (WCAG 2.1.4 geregi yalniz sahne odaginda).
- #p3KbToggle P3.input.setKeyboard(on) cagirir (prefs.kbOn store'a yazilir, undo'suz); aria-checked ve P3.save kaliciligi p3-app'in isi. prefs.kbWin de undo'suz yazilir; kalicilik p3-app'te.
- p3-modes: {k:'btn', id:'escape'} -> overlay kapat; {k:'btn', id:'lcd'} ve {k:'enc', id:'jog', nudge} Faz 1'de yok sayilabilir. dpad/octpage olaylarinda id de var. Shift ince ayari: fine:true gelir, turn olceklenmez (x0.1'i wtp.step ve volume/swingTempo icin modes uygular). reset:true Delete+dokunmada input'tan gelir, modes'un ayrica yapmasina gerek yok.
- p3-modes accent'i uygular (input vel 100/position/kbVel gonderir). Octave/scale degisiminde basili pad'lerin eski perdede kapanmasi (A11) modes'un isi; input o pad'ler icin up'i ayni x,y ile gonderir.
- p3-app 'keys' bus olayini dinleyip tus etiketi katmanini (#p3KeysBtn, §H16) acip kapatmali.
- Mod degisimi / overlay acilisi P3.panic() cagirir; input yalniz pad'leri birakir. Tam birakma icin P3.input.releaseAll() ayrica cagrilabilir (P3.panic cagirmaz).
- p3-leds 'in' olaylarini zaten dinliyor (btn/dpad/octpage basisi ve enc touch); input'un olay bicimi leds'in onIn'iyle uyumlu dogrulandi.
- Ses kilidi (A10) input'ta degil: p3-app document'e capture ile pointerup/touchend/mousedown/keydown/click baglamali. Input stopPropagation yapmadigi icin bu dinleyiciler olaylari alir.
- Tarayicida uctan uca dogrulama yapilmadi: p3-app/p3-modes henuz yok, sayfa input'u boot etmiyor. Dalga 3 sonrasi gercek cihazda (iOS/Android) asili nota ve contextmenu uzun basis davranisi test edilmeli.

### Açık sorular (README §I'da karara bağlandı)
- Escape'in {k:'btn', id:'escape'} olayi yalniz sahne odaktayken gonderiliyor. Odak taskbar'dayken (ornek #p3HintBtn) Escape overlay'i kapatmiyor, yalniz panic yapiyor. Istenirse odak body'deyken de gonderilebilir; ama o zaman #p3Toc modali acikken cakisma riski var.
- Sahnedeki contextmenu'da panic bilerek yapilmiyor: Android'de pad'e uzun basmak basili notayi keserdi. Sartnamedeki 'contextmenu -> panic' maddesi yalniz sahne disi icin uygulandi. Onay gerekli.
- Klavye velocity alt siniri 1 (100 -> 80 -> ... -> 20 -> 1). Alt sinirin 20 olmasi (±20 adimlarla simetrik) tercih edilirse tek satirlik degisiklik.
- Volume/Swing&Tempo/Jog'da cift tik reset yok (tik = press). Push'ta bu kontrollerin varsayilana donmesi Delete+dokunma ile yapiliyor; dogrulanmis kaynakta cift tik beklentisi varsa gozden gecirilmeli.

## modes

### API
P3.modes = { init(), reset(), dispatch(ev), isHeld(id), heldIds(), applyPreset(i, id), openOverlay(name), selectTrack(i) }

- init(): tekrar çağrılabilir. Bus'ta 'panic' (canlı notaları kapatır, note-off yayar, süren PB'yi bitirir) ve 'restore' (held, dokunuş ve jestleri temizler) dinlenir. 'in' olayına abone OLMAZ.
- dispatch(ev): gate'ten geçmiş girdi olayını işler. Olay biçimleri: btn / dpad / octpage (id yoksa dir'den bulunur), pad, enc (turn / steps / fine, touch, press, reset, jog nudge), strip (down / move / up), sahte düğmeler 'escape' (overlay kapanır) ve 'lcd' (yok sayılır).
- reset(): mod değişiminde çağrılır. Overlay kapanır, S.held = {}, canlı notalar kapanır, momentary Accent eski haline döner, touched = −1, strip.pb = 0, ardından P3.panic('mode').
- isHeld(id) ve heldIds(): S.held'den okur. Her kayıt {t0, used} biçimindedir ve store'a sessiz yazılır.
- applyPreset(i, id): tx 'Preset' içinde tracks.i.p (yeni Float32Array), tracks.i.mods ve tracks.i.preset yazılır; tek undo kaydıdır. Drum track için false döner.
- openOverlay(name): name null, 'scale' ya da 'learn' olabilir. Açılışta P3.panic('overlay') çağrılır (A11) ve bus 'overlay' {name, prev} yayınlanır. Learn açılırken S.learnPage silinir.
- selectTrack(i): sel.track'i değiştirir, bank görünümünü kapatır, bırakılmış encoder dokunuşunu siler.

Yayınlanan bus olayları:
- 'note' {track, note, vel, on, src, x, y}. Drum pad'de note = 36 + pad.
- 'overlay' {name, prev}
- 'feedback' {text}: P3.t ile çevrilmiş açıklama.
- 'learn' {chapter}: P3.lcd.learnChapterAt(k)'dan gelen bölüm slug'ı. LCD bu yardımcıyı vermiyorsa k−1 sayısı.

Kullanılan dış API'ler:
- P3.wt: noteOn(i, 'p:'+src, midi, vel), noteOff(i, 'p:'+src), pb(i, v), mw(i, v).
- P3.drums: trigger(pad, vel).
- P3.seq: toggle, recPress, tap, setBpm, setSwing, metronome, recordNote(i, midi, vel, onT) ile nota açılır, recordNote(i, midi, vel, onT, offT) ile kapanır; stepToggle(i, step, selPad), stepMute(i, step), deletePadNotes(i, pad), deleteClip(i, slot), setLoopPage(i, page), setLoopRange(i, a, b), setFollow(i, on). stopClip ve stopAllClips varsa kullanılır.
- P3.lcd: popup(text, sub), learnChapterAt(k).
- P3.audio: toCtxTime(t) ya da ctx.currentTime.
- P3.wtp: BANKS, VIRTUAL, slotTurn, slotReset, setBank, applyPreset.
- P3.scale: padNote, drumCell, realign, octUp, octDown, shiftStep, drumBank*, rangeText, noteName.

Store'a yazılan yollar:
- held.* (sessiz), overlay, bankView, view, pad, sel.track
- wtui.touched (olay yayınlanır), wtui.bank ve seçiciler (wtp üzerinden)
- scale.*, tracks.i.pos, bank, page, grid, selPad, repeat.rate, mute, solo, padMute, padSolo, clips.slot, p, mods, preset
- accent.on, strip.pb, strip.mod, strip.mode
- vol.target, vol.main, vol.phones, vol.track, vol.cue
- swingTempo, learnPage
- transport.bpm, transport.swing, transport.metro (yalnız seq yoksa)

### Sapmalar
- S.wtui.touched store'a olay yayınlanarak yazılıyor (görev 'silent' diyordu). Böylece LCD, LED halkası ve öğretici koşulu ek bir çağrı gerekmeden güncelleniyor.
- Fareyle dokunmak hover demek, bu yüzden bırakılan dokunuş 2 sn geçerli kalıyor (imleç upper8 = Add to Matrix'e yetişebilsin). Bu sürede yolda geçilen başka bir encoder dokunuşu ancak 150 ms üstünde durulursa devralıyor. Bank, track ya da overlay değişince bırakılmış dokunuş siliniyor. Çevirmek dokunuşu hemen taşıyor.
- Enc1..8'e dokununca popup çıkmıyor (görev 400 ms'lik popup istiyordu). LCD dokunulan sütunun adını beyaz çiziyor; popup görselleştirmeyi örterdi. Kaynaklarda dokunmanın ekranda değer gösterdiği de doğrulanamamış. Volume dokunma popup'ı da Swing & Tempo gibi 400 ms gecikmeli; çevirmede popup hemen çıkıyor.
- Undo etiketi 'Param' değil, slot adı ('Frequency', 'Position', 'LFO 1'). Seçiciler (Oscillator / Filter / Envelopes / LFO / View / Mod Target), Filter Switch, Expression Mode, Add to Matrix, Back ve Go to undo'ya girmiyor. Scale değişikliği yeniden hizalanan pos'larla tek 'Scale' kaydı; Scale menüsündeki encoder ve jog dönüşleri dokunuş boyunca birleşiyor. Octave, bank, sayfa, grid, seçim, volume ve tempo undo'suz.
- Basılı bir düğme varken başka bir kontrol gelirse (düğme ya da pad basışı, encoder dokunuşu ya da dönüşü, strip dokunuşu) basılı olanların hepsi 'used' işaretleniyor.
- Stop Clip ve Shift+Stop Clip: gerçek p3-seq'te stopClip / stopAllClips yok (Faz 1 seq'i her track'te slot 0'ı çalıyor). Bu yüzden şimdilik popup 'Not in this simulator' + 'Stop Clip' ve Türkçe açıklama gösteriliyor. Seq bu işlevleri eklerse modes onları kendiliğinden kullanır.
- Loop pad ve sayfa: tek dokunuşta bırakınca setLoopPage çağrılıyor. Bas-tut + ikinci pad ve çift dokunuş (500 ms) setLoopRange(a, b) çağırıyor (gerçek seq API'si). Page ◀▶ sayfayı değiştirip setFollow(false) çağırıyor; Page'i 300 ms'den uzun basılı tutmak setFollow(true) çağırıyor (kılavuz 7.3.1).
- EKLEME: Mute/Solo + drum pad çalışıyor (kılavuzda var; Faz 1 listesinde yoktu). p3-leds ve p3-seq t.padMute / t.padSolo alanlarını zaten okuyor. Solo exclusive; undo 'Mute' / 'Solo'. Susturulan pad canlı çalınırken de sessiz kalıyor. Mute/Solo/Stop Clip + alt ekran düğmesi o track'e uygulanıyor (Seviye 2'deki 'Mute + lower2' için). Delete + alt düğme, Delete/Select + step ve Delete + loop pad işlevsiz (Faz 2).
- Metronome'u basılı tutmak (menü Faz 2'de) popup 'Metronome' / 'Settings: coming soon' ve açıklama veriyor, aç/kapa yapmıyor (gerçek cihaz davranışı). Kısa basış aç/kapa yapıyor.
- Desteklenmeyen kontrollerde popup metni 'Not in this simulator', alt satırı kontrolün adı. Layout düzen adını gösteriyor ('Melodic: 64 Notes' / 'Drums: Loop Selector') ve alt satırda 'Other layouts: coming soon'. Main Track §H13'e göre. Scale menüsü dışında D-pad okları popup ve yerel açıklama veriyor; orta düğme UNSUPPORTED.dpadC kaydını kullanıyor.
- Volume: 'track' hedefi Main Track'e karşılık geliyor ve S.vol.track'e yazılıyor (initState'te yok, varsayılan 0 dB; LCD de böyle varsayıyor). −inf −71 olarak tutuluyor (P3.u.dbToGain 0 veriyor, JSON'a da yazılabiliyor). Sıfırlama değerleri: Main, Headphones, Cue −10 dB, Main Track 0 dB, Tempo 120 BPM, Swing %0.
- Scene düğmeleri: Repeat açıkken ya da synth track'te repeat.rate'i, drum track'te grid'i değiştiriyor. Grid değişince görünen sayfa aynı zaman konumunda kalıyor.
- Jog: Scale menüsünde gam ±1, Learn'de sayfa ±1, bank görünümünde bank ±1. Sola itmek overlay'i kapatıyor ya da bank görünümünden çıkıyor.
- Track değişince bank görünümü kapanıyor (VARSAYIM). Drum track'te upper1 işlevsiz (§H14).
- Drum strip Drum Rack'in −36…76 bank aralığını gösteriyor. Dokunulan yere 16'şar, Shift ile 4'er pad adımıyla gidiliyor. Octave ve strip bank popup'ı görünen 16 pad'in aralığını yazıyor, ör. 'E2 - G3'.
- Select + drum pad popup'ı nota adı + kit adı gösteriyor, ör. 'G♭1 Closed Hat' (boş pad '—').
- Pitch bend'in 30 ms'lik merkeze dönüşü 4 adımda, zamanlayıcıyla gönderiliyor. Worklet PB'yi yumuşatmıyor; zamanlayıcı yeni bir dokunuşta iptal edilebiliyor.
- Learn: bölüm, upper k için P3.lcd.learnChapterAt(k)'dan geliyor (müfredat 12 bölüm, 2 sayfa). Page ◀▶ ve jog LCD'nin isteğe bağlı S.learnPage alanını değiştiriyor; Learn açılırken bu alan siliniyor.

### Entegrasyon
- p3-app.boot() sırası: önce P3.store.init(), sonra P3.leds / P3.lcd / P3.seq / P3.modes.init(). Ardından P3.bus.on('in', ev => { if (P3.app.gate(ev)) P3.modes.dispatch(ev); }) bağlanmalı. modes 'in' olayına kendisi abone olmuyor.
- gate, down'ını geçirdiği bir kontrolün bırakış olayını (btn/dpad/octpage down:false, pad down:false, enc touch:false, strip up) her zaman geçirmeli. Aksi halde S.held'de asılı kayıt kalır (ör. Shift takılı kalırsa Octave ±1 adım atar). Mod değişiminde P3.modes.reset() held'i zaten temizliyor.
- startMode(): P3.modes.reset() çağrılmalı. Overlay kapanıyor, held temizleniyor, canlı notalar kapanıyor ve P3.panic('mode') çalışıyor.
- bus 'feedback' {text} olayı #p3Feedback'e yazılmalı.
- bus 'learn' {chapter} olayında chapter bir bölüm slug'ıdır (P3.lcd.learnChapterAt(k)); #ogretici/<slug>'a yönlendirilmeli. LCD bu yardımcıyı vermezse chapter sayıdır (k−1); p3-app iki biçimi de kabul etmeli. Faz 2 bölümleri de gelebilir, p3-app '(yakında)' göstermeli.
- Taskbar'daki preset <select> P3.modes.applyPreset(0, id) çağırmalı: tek undo kaydı 'Preset' oluşuyor, motor 'tracks.0.p' ve 'tracks.0.mods' yollarından track'i yeniden kuruyor. Öğretici emu için: emu.openOverlay(name) → P3.modes.openOverlay(name) (açılış A11 gereği panic yapar), emu.select(i) → P3.modes.selectTrack(i).
- p3-seq'te stopClip(track) ve stopAllClips() yok; Faz 1 seq'i tracks.i.playing'i yok sayıyor. Stop Clip ve Shift+Stop Clip şu an popup ve açıklama veriyor. Seq bu iki işlevi eklerse (kuantize durdurma + çalan seq notalarını kapatma) modes onları kendiliğinden kullanır.
- p3-seq, Record'a basıldıktan sonraki 50 ms içinde (beat 0'dan önce) basılan notayı kayda almıyor (recordNote false dönüyor). Live beat 0'a çok yakın gelen notayı clip başına yazar; seq tarafında küçük bir tolerans önerilir. modes'un recordNote aç/kapat protokolü gerçek seq ile doğrulandı.
- p3-wt-engine yalnız vol.main ve vol.cue değerlerini uyguluyor. modes S.vol.track (Main Track, varsayılan 0 dB) ve S.vol.phones da yazıyor; Main Track'in mixBus kazancına bağlanması gerekiyor (Headphones'un sessiz kalması motorun bilinçli seçimi).
- LCD entegrasyonu: LCD 'state' olayıyla S.wtui.touched'ı okuyor. Dokunuş 2 sn'lik süre boyunca vurgulu kalıyor; Add to Matrix option'ının etkin/gri durumu wtp enabled() ile aynı kaynaktan geldiği için LCD, LED ve işlev tutarlı. S.learnPage LCD'nin isteğe bağlı alanı; modes onu Page ◀▶ ve jog ile yazıyor, Learn açılırken siliyor.
- Pad'ler Faz 1'de S.pad'den bağımsız olarak her zaman 64 Notes / Loop Selector çalıyor (Session desteklenmiyor). Pad sesinin kimliği 'p:'+src (§H4). Kayıt zamanı P3.audio.toCtxTime(ev.t) ile hesaplanıyor; yoksa ctx.currentTime kullanılıyor.
- S.held snapshot'a giriyor. P3.store.restore sonrası modes 'restore' olayında held'i ve dokunuşu kendisi temizliyor.

### Açık sorular (README §I'da karara bağlandı)
- Stop Clip Faz 1'de gerçekten çalışsın mı? Çalışacaksa p3-seq'e track başına bir 'durduruldu' durumu + stopClip / stopAllClips eklenmeli (Dalga 3 ya da seq düzeltmesi). Şu an 'yakında' açıklaması gösteriliyor.
- Enc1..8'e dokununca popup göstermedim; LCD vurgusuyla yetindim. Görevdeki 400 ms'lik popup istenirse DWELL ile birlikte kolayca eklenebilir.
- Fareyle Add to Matrix için 2 sn'lik dokunuş süresi ve 150 ms'lik devralma bekleme süresi uygun mu? Bu sürede LED halkası ve LCD vurgusu açık kalıyor.
- Metronome uzun basış: gerçek cihaz gibi aç/kapa yapmayıp açıklama göstermek mi, yoksa görevdeki 'Faz 1 yalnız toggle' ifadesine göre her basışta aç/kapa mı istenir?
- Mute/Solo + drum pad'i Faz 1'de etkinleştirdim, çünkü LED ve seq bu alanları zaten destekliyordu. Bunun Faz 1 kapsamına alınması onaylanıyor mu?
- Delete + notası olmayan drum pad: kılavuza göre pad'in sesi silinir; bu simülatörde yok. Şu an sessizce hiçbir şey olmuyor. Bir popup gösterilsin mi?