# Dalga 1 API özetleri ve notları (ajan raporlarından)


## core

### API
P3.K = { V:'20260925a', HOLD_MS:300, DOUBLE_MS:500, TOUCH_POPUP_MS:400, POPUP_MS:1500, UNDO_MAX:100, SAVE_KEY:'bk_push3_v1', SAVE_MS:300, VB:'161 135 2116 1725', LCD:{x,y,w,h,W:960,H:160}, C:{off,gray,grayL,white,green,red,blueD,ledOff,ledDim,ledOn,playGreen,repeatGreen,automateRed,lcdBg,lcdName,lcdTrack,lcdDisabled,lcdWhite,lcdMono}, TRACKS:[{id:0,name:'Wavetable',kind:'synth',color:'#0088DE',preset:'init'},{id:1,name:'Drums',kind:'drum',color:'#D87635',kit:'p3kit'}], UNSUPPORTED:{id:{tr,phase:0|2|3,partial?}}, kbVel:100, kbVelShift:70 }
P3.bus.on(type, fn) -> off(); P3.bus.off(type, fn); P3.bus.emit(type, payload)  // ozel dinleyici fn(payload, type); '*' dinleyici fn(type, payload); hata -> console.warn, digerleri devam
P3.initState() -> §D birebir (synth: p=Float32Array(0), mods={}, pos=21; drum: selPad/bank/page/loopOff; ikisinde repeat/grid/clips[8]/playing)
P3.store.S; P3.S
P3.store.init(S?) -> S   // S yoksa initState(); synth p bossa P3.wtp.defaults() + deepClone(DEFAULT_MODS); gecmisi siler; P3.bridgeI18n() cagirir
P3.store.get(path)       // 'scale.root', 'tracks.0.clips.3', 'tracks.0.p.12'; '' -> S; yoksa undefined
P3.store.set(path, value, {undo:'etiket', merge:'anahtar', silent:true}) -> bool (degistiyse true)
P3.store.endMerge(key?)  // acik merge'i kapatir (key verilirse yalniz o anahtar)
P3.store.tx(label, fn) -> fn donusu   // fn icindeki tum set'ler tek kayit; ic ice tx disa katilir; hata -> geri al + yeniden at
P3.store.undo() / redo() -> bool; canUndo(); canRedo(); undoLabel(); redoLabel(); clearHistory()
P3.store.snapshot() -> derin kopya; P3.store.restore(snap) -> bool (yerinde, gecmisi siler)
Olaylar: 'state' {path,value,prev} | 'history' {canUndo,canRedo} | 'undo'/'redo' {label} | 'restore' {} | 'panic' {reason} | 'lang' l
P3.save.load() -> obj; get(key /*noktali olabilir*/); patch(key, value /*undefined = sil*/); flush(); reset()
P3.t(o) -> string; P3.bridgeI18n() (idempotent)
P3.u.clamp(v,lo,hi), mod(n,m), lerp(a,b,t), dbToGain(db), gainToDb(g), mulberry32(seed)->fn, deepClone(v), rafThrottle(fn)->w{.cancel}, debounce(fn,ms)->w{.cancel,.flush}, isIOS(), isMobile(), hasPointerFine()
P3.panic(reason) -> bus.emit('panic',{reason})

### Sapmalar
- EKLEME: set opts.merge + P3.store.endMerge(key?). Ayni merge anahtarli ardisik undo'lu set'ler, endMerge cagrilana kadar tek kayitta birlesir. Kayit icinde ayni path bir kez tutulur: ilk prev ve son next. Farkli bir anahtarla ya da merge'siz undo'lu bir set, tx, undo veya redo merge'i kendiliginden kapatir. Undo etiketi olmayan set merge'i kapatmaz.
- EKLEME: Deger degismiyorsa set hic bir sey yapmaz ve false doner: olay da undo kaydi da yok. Encoder ucta dururken bos undo kaydi ve LED/LCD yeniden cizimi olusmasin diye. Float32Array'de karsilastirma Math.fround ile yapilir.
- EKLEME: set(path, undefined) duz nesnede anahtari siler (orn. held[id]). Undo silinen anahtari geri koyar.
- EKLEME: tx icindeki set'ler opts.undo'dan bagimsiz kaydedilir. fn hata atarsa o ana kadarki degisiklikler geri alinir ('state' yayinlanir) ve hata yeniden atilir. Bos tx kayit birakmaz.
- EKLEME: Undo kayitlari prev/next degerlerini deepClone ile tutar. Bir clip nesnesi set edildikten sonra yerinde degistirilirse gecmis bozulmaz. Undo/redo geri yazdiklari degerleri de kopyalar.
- EKLEME: bus 'history' {canUndo, canRedo} olayi (Undo LED'i icin), store.undoLabel()/redoLabel() (popup metni icin), P3.K.UNDO_MAX/SAVE_KEY/SAVE_MS sabitleri.
- SAPMA/NETLESTIRME: restore(snap) yeni nesne atamaz, P3.S'yi yerinde degistirir; P3.S'yi tutan moduller bozulmaz. Gecmisi siler ve sirasiyla 'history', 'state' {path:'*', value:S, prev:null}, 'restore' yayinlar. 'state' dinleyenlerin path==='*' durumunu 'her sey degisti' diye ele almasi gerekir.
- SAPMA/NETLESTIRME: p ve mods yalniz kind==='synth' track'lerde vardir; §D'de drum track'te de yok. init/restore sirasinda JSON'dan gelen p (dizi ya da {"0":..} nesnesi) Float32Array'e cevrilir. p bos ve P3.wtp varsa defaults() ile doldurulur; mods yalniz bossa DEFAULT_MODS'un kopyasiyla doldurulur.
- SAPMA: i18n koprusu dosya yuklenirken kurulmaz (README §C: yukleme aninda yan etki yok). P3.bridgeI18n() olarak disa acilir; idempotenttir ve P3.store.init tarafindan cagrilir. Sarmalayici orijinal setLang'i cagirir, ardindan bus.emit('lang', l) yayinlar.
- EKLEME: P3.save.load() ilk cagrida pagehide ve visibilitychange(hidden) olaylarina flush baglar; 300 ms icindeki bekleyen yazi kaybolmaz. flush, kayitta v yoksa v:1 ekler. get ve patch noktali anahtar kabul eder ('tutorial.current'). patch(key, undefined) anahtari siler. Bozuk JSON, dizi ya da okunamayan depolama bos nesneye duser; setItem hatasi sessizce yutulur.
- UNSUPPORTED kararlari: Kontrol haritasindaki Faz 1'de calismayan tum id'ler listede: sets(3), setup(3), user(0), lock(2), save(3), add(3), swap(2), mix(2), clip(3), sessionScreen(2), quantize(2), fixedLength(2), automate(3), new(2), capture(2), session(2), repeat(2), doubleLoop(2), duplicate(2), convert(0), dpadC(2). Faz 3 kayitlari da planli ozellik oldugu icin '(yakında)' der; '(bu simülatörde yok)' yalniz phase 0'da kullanilir. README A17 yalniz Faz 2'den soz ettigi icin bu bir secimdir.
- EKLEME: UNSUPPORTED.layout ve UNSUPPORTED.mainTrack partial:true ile isaretli. Bu kontroller Faz 1'de tepki verir (Layout: 'Melodic: 64 Notes' popup'i; Main Track: VARSAYIM popup) ama asil islevleri Faz 2'de gelir. Aciklama metni buradan okunur, phase 2'dir. mainTrack yaninda '// VARSAYIM: MiscButton = Main Track eslemesi cikarim' yorumu var.
- NETLESTIRME: hasPointerFine() '(any-pointer: fine)' kullanir; dokunmatik dizustude fare de sayilir. isMobile() = isIOS() || /Android|Mobi/i. dbToGain: -70 dB alti, -Infinity ve NaN icin 0; tam -70 dB sifir degildir.

### Diğer modüllere notlar
- Hepsi: P3.S gecerli olmadan once P3.store.init() cagrilmali (P3.app.boot). Cagrilmadan P3.S null'dir. restore() P3.S kimligini korur; P3.S'yi saklamak guvenlidir.
- Hepsi: bus 'state' payload'i {path, value, prev}. Snapshot restore'da path '*' gelir: bu durumda her seyi yeniden hesaplayin (leds.invalidate('*'), lcd.invalidate()). Undo/redo geri alinan her path icin normal 'state' yayinlar, ardindan 'undo'/'redo' {label} gelir.
- Hepsi: set degisiklik yoksa false doner ve olay yaymaz. Ayni degeri yazip olay beklemeyin.
- modes/input (encoder): donuslerde P3.store.set(path, v, {undo:'Etiket', merge:'enc:'+id}) kullanin, dokunus birakilinca (enc touch:false) P3.store.endMerge('enc:'+id) cagirin. Boylece bir dokunus tek undo kaydi olur. Undo LED'i icin 'history' {canUndo, canRedo} olayini dinleyin. Popup metni icin P3.store.undoLabel()/redoLabel() var.
- modes: Bilesik islemleri (scale degisimi + realign, preset uygulama, clip islemleri) P3.store.tx('Etiket', fn) ile sarin. tx icindeki set'lere undo etiketi gerekmez. held gibi gecici durumlari undo'suz set edin; silmek icin set('held.x', undefined).
- modes/lcd: Desteklenmeyen kontrol -> P3.lcd.popup('Not in this simulator') + #p3Feedback'e P3.t(P3.K.UNSUPPORTED[id]). UNSUPPORTED[id].partial===true olan layout ve mainTrack Faz 1'de kendi popup'ini gosterir (Layout: 'Melodic: 64 Notes'); aciklama yine UNSUPPORTED'dan alinir. D-pad merkezi icin anahtar 'dpadC'. Faz 1'de calisan kontrollerin Faz 2 kombinasyonlari (orn. metronome basili tut -> menu, Shift+Layout) icin UNSUPPORTED'da kayit yok; modes bunlar icin kendi metnini kullanmali ya da sessiz kalmali.
- engine/wt: synth track parametreleri P3.S.tracks[i].p (Float32Array, P3.wtp.PARAMS sirasiyla) ve mods {hedefK: {srcIdx: amt}}. Parametre path'i 'tracks.0.p.'+P3.wtp.IDX[k]. Drum track'te p/mods yok (kind==='drum').
- engine/input/seq/drums: P3.panic(reason) yalniz bus.emit('panic', {reason}) yapar. Asili nota temizligini her modul kendi 'panic' dinleyicisinde yapar.
- seq/input: velocity sabitleri P3.K.kbVel (100) ve P3.K.kbVelShift (70). Accent 127 (README A6).
- app: P3.save.load() boot'ta bir kez cagrilmali (pagehide flush'i baglar). Ilerleme icin P3.save.patch('tutorial.current', {...}) gibi noktali anahtarlar kullanilabilir. Sifirlama P3.save.reset(). Serbest mod snapshot'i JSON'a yazilirken Float32Array {"0":..} nesnesine donusur; store.restore bunu otomatik Float32Array'e cevirir.
- app/tutorial/levels: dil degisimi icin bus 'lang' dinleyin (store.init koprüyü kurar). Metinler {tr:`...`} nesneleri + P3.t(o).
- leds/lcd: renkler P3.K.C, LCD kutusu P3.K.LCD, viewBox P3.K.VB. Zaman sabitleri HOLD_MS/DOUBLE_MS/TOUCH_POPUP_MS/POPUP_MS.
- Yardimcilar: P3.u.rafThrottle(fn) ve debounce(fn, ms) .cancel() dondurur (debounce'ta .flush() da var). P3.u.mod negatif sayida dogru calisir (pad/oktav indeksleri icin).

## scale

### API
P3.scale = {
  NOTE_NAMES (bemollu, 12), ROOT_NOTES [0,7,2,9,4,11,5,10,3,8,1,6], LAYOUTS [{name,iv}],
  SCALES (35 x ['Ad',[araliklar]], Live 12 sirasi), GRID (8 x {n,b,tr?}), GRID_DEF:3, REPEAT_DEF:5, CLIP_LEN:[2,4,4,8,8,16,16,32], DRUM_ROW:4,
  noteName(m) -> 'C1' (null icin ''), iv(S), n(S), L(S), pcs(S) -> Set (salt okunur), P(S), posCount(S), R(S), W(S), A(S) -> dizi (salt okunur),
  padNote(S, pos, x, y) -> midi | null (x soldan, y alttan; kesirli pos yuvarlanir),
  padClass(S, m) -> 'root' | 'scale' | 'out' | 'none',
  defaultPos(S) -> 3L+P; realign(Sold, Snew, pos) -> yeni pos (t'yi degistirmez),
  octUp(S, t), octDown(S, t), shiftStep(S, t, d) -> t.pos'u YERINDE degistirir ve yeni pos'u dondurur; canUp/canDown false ise hicbir sey yapmaz,
  canUp(S, t), canDown(S, t) -> bool (Octave LED'i),
  rangeText(S, t) -> 'C1 - C5',
  drumCell(x, y, t) -> {k:'drum',pad} | {k:'step',step} | {k:'loop',page} | {k:'none'},
  pageBeats(t), loopPadBeats(t),
  drumBankUp(t) (+16), drumBankDown(t) (-16), drumBankShift(t, d) -> t.bank'i YERINDE degistirir (-36..76 araliginda sinirlar) ve yeni bank'i dondurur,
  drumCanUp(t) (bank < 76), drumCanDown(t) (bank > -36),
  scaleName(S) -> 'D Minor', rootName(S) -> 'D'
}

### Sapmalar
- octUp / octDown / shiftStep / drumBank*: sartnamedeki gibi t'yi yerinde degistirir, ek olarak yeni degeri dondurur. canUp/canDown false iken hicbir sey yapmaz. Sartnamedeki ciplak min()/clamp(), realign sonrasi pos > posCount-L oldugunda Octave Up'a basilinca konumu asagi cekiyordu.
- realign: ust tasmada tek 'if' yerine 'while (p >= posCount) p -= L' kullanildi. Hatayi test yakaladi: Chromatic + Fixed'de pos 138'den (bu konum yalniz realign ile olusur) koku Ab-B olan In Key + Fixed'e geciste 138 -> 80.5 -> 73.5 cikiyor, oysa posCount 70. Ayrica 0'in altina dusen sonuc 0'a sabitleniyor: pos < P_old iken Fixed acilinca -f cikiyor. Sartname alt tasmayi hic ele almiyor.
- rangeText, README G2'deki 'C1 - C5' bicimini izler. Sartnamedeki 'Play C1 to C5' Push 2 metni; Push 3'teki metin dogrulanamadi (VARSAYIM). Araligi sol alt ve sag ust pad yerine izgaradaki en dusuk ve en yuksek gecerli nota belirler. Sartnamedeki 'hi == null ? 127' Sequential pentatonikte sag sutunlar bos oldugu icin, 127 sinirinda da gam disi notalarda yanlis sonuc veriyordu.
- drumCanUp/Down 'bir adim daha kayabilir mi' demek: bank < 76 / bank > -36. Sartnamedeki 'canUp = bank+16 <= 76', clamp'li Octave Up bank'i hala 64'ten 76'ya tasiyabilirken LED'i sonduruyordu. Melodik canUp (slide.py) ile ayni mantiga getirildi. Octave Up dizisi: 0 -> 16 -> 32 -> 48 -> 64 -> 76. Octave Down dizisi: -16 -> -32 -> -36.
- EKLEME: DRUM_ROW = 4 disa acildi (Shift+Octave ve Shift+strip bunu kullanir). P3.u.clamp yerine yerel clamp kullanildi, cunku modulun P3 disinda bagimliligi olmamali ve p3-core olmadan Node'da test edilebilmeli.
- VARSAYIM isaretleri: Sequential + In Key'de kok tekrari (W = n+1, koddan; Push 2 metniyle celisiyor). Fixed On secimi (C1 veya ustundeki ilk gam notasi, koddan; kilavuz 'C'ye en yakin' diyor, E Minor Pentatonic'te koda gore 38, kilavuza gore 35). REPEAT_DEF = 5. Loop pad okuma yonu. rangeText metni. 9-10 notali gamlarda Sequential satirinda 1-2 derecenin gorunmemesi de kod davranisi olarak yorumlandi.
- SCALES, sartnamedeki gibi ['Ad', [araliklar]] demeti olarak tutuldu (nesne degil). Ad SCALES[i][0], araliklar SCALES[i][1].

### Diğer modüllere notlar
- Mutasyon: octUp, octDown, shiftStep ve drumBank* verilen t nesnesini dogrudan degistirir. store.set ve undo akisi isteniyorsa kopya gecin: var p = P3.scale.octUp(S, {pos: tr.pos}); P3.store.set('tracks.0.pos', p, {undo: ...}). Drum icin: P3.scale.drumBankUp({bank: tr.bank}).
- Octave dugmesine basmadan once canUp/canDown (drumda drumCanUp/drumCanDown) kontrol edin. Bu fonksiyonlar LED kuralinin kendisidir: false ise dugme soner ve cagri hicbir sey yapmaz.
- Kaydirma miktarlari: Octave = octUp/octDown veya drumBankUp/drumBankDown. Shift+Octave = shiftStep(S, t, +-1) veya drumBankShift(t, +-P3.scale.DRUM_ROW).
- Scale menusu (modes): kok, gam, In Key veya Fixed degisince HER synth track'i icin tr.pos = P3.scale.realign(Sold, Snew, tr.pos) yapin (pos track basina, S global). Layout degisimi realign gerektirmez, cunku L/P/posCount'u degistirmez. Enc1 layoutIdx 0..2, Enc2-7 ve D-pad idx 0..34 araliginda sinirlanir, basa sarmaz (bu module degil modes'a ait).
- realign pos'u kesirli birakabilir (L'/L orani). padNote icerde yuvarlar. pos'u gosterirken veya karsilastirirken Math.round kullanin.
- LEDs: padColor icin padClass(S, P3.scale.padNote(S, tr.pos, x, y)) kullanin. 'root' track rengi, 'scale' beyaz, 'out' (yalniz Chromatic'te, soluk ama calar) ve 'none' (null, calmaz) off.
- LCD: gam listesi icin SCALES[i][0]; secili kok ve gam icin scaleName(S) -> 'D Minor'. Octave degisince popup: P3.lcd.popup(P3.scale.rangeText(S, tr)).
- Drum (seq/modes): drumCell 'drum' -> MIDI = 36 + pad. 'step' -> t.page (sequencer sayfasi, sayfa = pageBeats beat) icinde mutlak step indeksi; beat = step * GRID[t.grid].b. 'loop' -> 'page' LOOP PAD biriminde, yani loopPadBeats(t) beat (1/32t disinda 1 bar). Sequencer sayfasiyla (pageBeats) ayni birim DEGIL. Ornek: 1/16'da 1 sequencer sayfasi = 2 loop pad.
- Yeni drum clip'i: ilk step girilince CLIP_LEN[t.grid] beat; loop pad'e basilinca (pad+1) bar (seq modulu).
- Ogretici: 'dizilim' kontrolu padNote(S, pos, 0, 1) - padNote(S, pos, 0, 0) === 12 Sequential + In Key'de dogru calisiyor (test edildi). 'scale' adiminda kok D = ROOT_NOTES[2] (upper4) dogrulandi.
- Yukleme: modul yalniz window.P3.scale tanimlar ve baska P3 alt modulune ihtiyac duymaz. p3-core'dan once veya sonra yuklenebilir.

## params

### API
P3.wtp = {
  PARAMS[106] {k,min,max,def,curve:'lin'|'exp'|'time'|'gain'|'int'|'enum'|'bool',unit,mod:0|1|2,name,en?}  (sıra = sartname §2 WT_PARAMS; 104 AMP, 105 PITCH; tek fark oNCat max 6, oNTab max 3)
  IDX {k→indeks}
  ENUMS {Cat,Fx,Type,Circ,CircB,Slope,route,Loop,subOct,Shape,Sync,polyIdx(sayı),uniMode,SRate(22),Bool,Osc,Flt,Env,Lfo,AmpView,ModView,Expr}  — Tab YOK (dinamik)
  SRATE_BARS[22] (SRate'in bar karşılığı; 15 = 1 bar)
  CATS ['Temel','Harmonik','Vokal','FM','Sync','Dijital','Gürültü'], TABLES[12] {id,cat,tab,name,phase}
  tableId(cat,tab)→id (taşan değer kelepçelenir), tablesOf(cat)→kopya dizi, tableName(id)→ad (+' (yakında)'), audibleTable(id)→Faz 1'de çalınacak id (Faz 2 → 0)
  SOURCES[13] ['Amp','Env 2','Env 3','LFO 1','LFO 2','Velocity','Key','PB','Pressure','Mod Wheel','Random','Slide','Note PB'], SRC {AMP_ENV:0,…,MW:9,RAND:10,SLIDE:11,NOTE_PB:12}
  DEFAULT_MODS {o1Pos:{9:1,11:.33}, o1Fx1:{8:.07}, AMP:{5:.5}, PITCH:{7:2/48,12:1}}
  toNorm(p,v)→0..1, fromNorm(p,n)→v, step(p,v,turn,steps,fine)→yeni değer (sürekli: turn, fine ×0.1; int/enum/bool: steps), fmt(p,v,tr?)→LCD metni (oNTab için tr gerekli), enumValues(p,tr?)→string[]
  defaults()→Float32Array(106), PRESETS {id:{name:{tr,en},params,mods}} (12, şartname sırası), applyPreset(tr,id)→tr (yerinde; mods = DEFAULT_MODS + preset)
  lfoShape(shape,shaping,phase,u?)→−1..1, envCurve(x,s)→0..1
  BANKS[8] {name, vis(S,tr)→{type:'wavetable'|'filter'|'env'|'lfo', cols:[a,b], osc|flt|env|lfo, next?}|null,
            slots(S,tr)→8×({k,label,dis?} | {v,label,src?,dis?} | null),
            options(S,tr)→7×({label,kind:'toggle',get(S,tr)→bool,set(S,tr,bool,opts)} | {label,kind:'switch',values,get(S,tr)→i,set(S,tr,i,opts)} | {label,kind:'action',run(S,tr,opts),enabled?(S,tr)} | null)}
  VIRTUAL {osc,flt,env,lfo,ampView,modView,expr,pitch1,pitch2,modTarget,modAmt}: {label, values?, def?, bipolar?, modKey?, get(S,tr,slot), set(S,tr,v,slot,opts)→değişiklikler, step(S,tr,turn,steps,fine,slot)→yeni değer, fmt(S,tr,v?,slot), norm?(S,tr,slot)}
  slotView(S,tr,slot)→{label,text,value,norm,bipolar,list,index,disabled,modulatable,k|v}|null
  slotTurn(S,tr,slot,turn,steps,fine,opts)→değişiklikler, slotReset(S,tr,slot,opts)→değişiklikler (Delete+dokunma), setBank(S,i,opts)→değişiklikler
  modTarget(S,tr)→etkin hedef k|null, targetName(k,tr)→matris satır adı ('Filter 1 Freq','Osc 1 Warp','Pitch'…)
}
Değişiklik kaydı: {t:'p',k,path:'p.<i>',value,prev} | {t:'mod',k,src,path:'mods.<k>.<src>',value(undefined=silindi),prev} | {t:'row',k,path:'mods.<k>',value:{},prev:undefined} | {t:'ui',key,path:'wtui.<key>',value,prev}. P3.store bu S'nin sahibiyse yazma P3.store.set('tracks.<i>.'+path | path, value, opts) ile yapılır (olay + undo/merge, çok parçalıysa tx); değilse nesneler doğrudan değişir.

### Sapmalar
- PARAMS kayıtlarına `name` (Live parametre adı) eklendi. Neden: Current Mod Target slotunun etiketi hedefin kendi adı olmalı (dogrulanmis §C); slot etiketi yoksa yedek olarak da kullanılıyor. Worklet için zararsız ek alan.
- fmt(p, v, tr): üçüncü argüman `tr` opsiyonel ama oNTab için gerekli, çünkü tablo adı kategoriye bağlı. ENUMS.Tab tanımlı değil; dinamik liste enumValues(p, tr) ile alınıyor.
- Tab: param aralığı görevdeki gibi 0..3. Etkin üst sınır kategorideki tablo sayısı − 1 ve bunu slotTurn kelepçeliyor. Kategori değişince Tab 0'a dönüyor (VARSAYIM). tableId aralık dışı bir Tab'ı kategorinin son tablosuna oturtuyor.
- vis(S,tr) sözleşmedeki gibi tek nesne döndürüyor. Main bankında osc 1/2 seçiliyken ikinci görselleştirme (filter 3–5) `next` alanında, çünkü Push script'i Main'de wavetable 0–2 ile filter 3–5'i birlikte çiziyor. `next`'i okumayan bir LCD çökmez, yalnız filtre eğrisini çizmez. Nesneye bağlam alanı da eklendi: osc | flt | env | lfo.
- Slot'lara opsiyonel `dis:true` eklendi: Osc N kapalıyken Category, Table, Effect Type ve Pitch gri görünür (dogrulanmis §B). modAmt slot'u `src` taşıyor. README G3'teki `virtual:` yerine görevdeki `v:` anahtarı kullanıldı.
- VIRTUAL imzaları options ile aynı düzende: get(S,tr,slot), set(S,tr,v,slot,opts), step(S,tr,turn,steps,fine,slot), fmt(S,tr,v?,slot). Görevdeki `get(S), set(S,i)` kısaltması yerine her yerde (S, tr, …) sırası var; seçiciler indeksle çalışıyor. DİKKAT: osc.set(S, 2) değil osc.set(S, tr, 2).
- Yazma yolu: set, run, slotTurn, slotReset ve setBank önce değişiklik listesi kurup döndürüyor. P3.store bu S'nin sahibiyse (P3.store.S === S) yazma P3.store.set(yol, değer, opts) ile yapılıyor: bus 'state' olayı ve opts.undo/merge ile undo. Çok parçalı işlem merge anahtarı olmadan gelirse tek tx kaydına sarılıyor. Store yoksa (Node) nesneler doğrudan değişiyor. Neden: engine ve LCD 'state' olaylarıyla, undo da core'un store'uyla tek yoldan çalışsın. applyPreset bilinçli olarak store dışında (toplu yeniden kurulum).
- Ek yardımcılar: slotView, slotTurn ve slotReset (LCD ile modes aynı etiket, metin, liste ve disabled mantığını paylaşsın diye); setBank (prevBank kuralı); modTarget ve targetName; audibleTable ve tableName (Faz kapısı); enumValues; SRC; SRATE_BARS; envCurve. Add to Matrix option'ına enabled(S,tr) eklendi.
- Back/prevBank: Matrix ve MIDI & MPE 'önceki banka' olarak kaydedilmiyor, Back hep son ses bankasına dönüyor (dogrulanmis §C'nin önerisi). Script'in 'MIDI' adından doğan hatası taklit edilmedi, yoksa Back MIDI & MPE'ye dönebilirdi. README A5'teki 'düzeltme uygulanmaz' ilkesi yalnız Main Enc4 için yazılmış.
- Matris hedef takma adları (Live'daki gibi): Volume → 'AMP', Transpose → 'PITCH', Osc N Pitch (Transp+Det) → 'oNTransp'. Current Mod Target slotu bunları tersine çeviriyor: AMP → Volume, PITCH → Transpose, oNTransp → pitchN sanalı. Böylece Transpose'a Add to Matrix yapmak PB/Note PB'nin bulunduğu 'Pitch' satırını açıyor, ayrı bir satır oluşmuyor. 'vol', 'transp' ve 'oNDet' hiçbir zaman matris hedefi olmuyor.
- Mod Target listesi = miktarı olan satırlar + seçili hedef. Boş satır yalnız seçiliyken görünüyor (Live: tıklanan parametre matriste geçici görünür). Etkin hedef: S.wtui.target bu track'in matrisinde yoksa ilk satır.
- Osc Pitch: normal çevirmede `steps` ile yarım ton (detune korunur), fine'da `turn` ile sürekli (turn×0.1×20, yani px başına 0.01 st, şartnameye uygun). Şartnamedeki 'normal: 8 px'te 1 st' uygulanmadı: step durumsuz olduğu için tam yarım tona oturmanın tek yolu detent. Push davranışı da 'normal = yarım ton, Shift = ince ayar'. Normal modda hız detent başına 1 st (input'ta 24 px).
- Env 3 + Slope görünümünde Enc3 etiketi 'Attack' kaldı. Bu gerçek cihazdaki Ableton tutarsızlığı; README A5'teki 'gerçek cihazdaki gibi' ilkesiyle korundu.
- Filters Enc7, Notch + OSR'de de Drive gösteriyor, çünkü birincil kaynak script. DSP ise kılavuzu izliyor (sartname §7).
- Main ve Oscillators bankalarında Mix seçiliyken Osc toggle option'ı null (VARSAYIM: tek bir osilatör seçili değil).
- Kök nesne: `window` yoksa `globalThis` (README B'deki `window.P3` kalıbının genişletilmesi). Neden: Node testleri ve istenirse AudioWorklet kapsamında aynı dosya yüklenebilsin. Tarayıcıda yine window.P3; core ve scale ile aynı nesne (test edildi).
- SOURCES README sırasını izliyor (11 Slide, 12 Note PB). Araştırmadaki .adv indeks sırası (11 Note PB, 12 Slide) farklı, ama .adv yüklenmediği için etkisi yok; DEFAULT_MODS isimle kuruldu.
- Presetler: mods DEFAULT_MODS'un üstüne yazılıyor, yani PB→Pitch ve Velocity→Amp tüm presetlerde kalıyor. Adlar {tr, en}. Şartnamede verilmeyen değerler VARSAYIM: testere için pos 2/3 ('.66' yerine saf testere karesi); pos-pad ve noise-atmo'da taban pos .5 (noise-atmo LFO miktarı .5); wobble'da testere + 800 Hz taban (sinüs LP'de duyulmaz); acid'de 400 Hz taban. Faz 2 tablo notları (wobble → 8, noise-atmo → 10) yorumda.
- lfoShape: Triangle sinüsle aynı hizada başlıyor (VARSAYIM). Random için opsiyonel 4. argüman u (worklet kendi PRNG'sini verir); u yoksa döngü indeksinden deterministik hash. Slope option değerleri Push'taki gibi '12dB'/'24dB'; ENUMS.Slope şartnamedeki gibi '12 dB'.
- Şartnamede olmayan biçim hassasiyetleri VARSAYIM: Hz <10 → 2 ondalık ('1.00 Hz'), <100 → 1 ondalık; süre ≥10 s → 1 ondalık; mod miktarında PB/Note PB için 'st' birimi ('2 st'); '-0.0' yazılmıyor.
- Delete + dokunma: seçiciler (Oscillator/Filter/Envelopes/LFO/View) ve Mod Target sıfırlanmıyor. Pitch 0'a, mod miktarı 0'a dönüyor (anahtar siliniyor). Gri (dis) slot'lar da çevrilebilir, Live'da kapalı osilatörün ayarı değiştirilebildiği gibi.

### Diğer modüllere notlar
- [input] Shift ince ayarının ×0.1 ölçeğini step/slotTurn uyguluyor (görev sözleşmesi). Input, Shift basılıyken yalnız ivmeyi kapatıp fine:true göndermeli; turn'ü ayrıca ×0.1 ile ölçeklememeli. README G11 bunu input'a da yüklüyor; iki taraf birden uygularsa ince ayar ×0.01'e düşer. steps = detent (24 px / tekerlek çentiği / ok tuşu). Enum, int ve bool parametreler ile Osc Pitch'in normal modu yalnız steps ile hareket eder; sürekli parametreler yalnız turn ile.
- [modes] Encoder dönüşü: `var s = P3.wtp.BANKS[S.wtui.bank].slots(S, tr)[i]; P3.wtp.slotTurn(S, tr, s, ev.turn, ev.steps, ev.fine, {undo:'Encoder', merge:'enc'+i});` Dokunma bitince `P3.store.endMerge('enc'+i)`. Dokunmada S.wtui.touched = i yazılmalı, bırakınca −1 (Add to Matrix'in enabled'ı buna bakar). Delete basılıyken dokunma: `P3.wtp.slotReset(S, tr, s, {undo:'Delete'})`.
- [modes] Bank görünümünde upper k (2..8) → `o = BANKS[b].options(S,tr)[k-2]`. toggle: o.set(S,tr,!o.get(S,tr),opts). switch: o.set(S,tr,(o.get(S,tr)+1)%o.values.length,opts). action: `if (!o.enabled || o.enabled(S,tr)) o.run(S,tr,opts)`. null → popup yok, sessiz (gerçek cihazda boş). lower k → `P3.wtp.setBank(S, k-1)`; S.wtui.bank'ı doğrudan yazmayın, prevBank kuralı setBank'ta. upper1 = '< Wavetable' (bank görünümünü kapatır, modes'un işi).
- [modes/engine] Tüm set/run/slotTurn/slotReset/setBank çağrıları, P3.store bu S'nin sahibiyse P3.store.set ile yazar. bus 'state' yolları: 'tracks.<i>.p.<idx>', 'tracks.<i>.mods.<k>.<src>' (value undefined = miktar 0/silindi), 'tracks.<i>.mods.<k>' (satır eklendi/silindi), 'wtui.<key>'. Dönen değişiklik listesi aynı bilgiyi {t,k,src,key,path,value,prev} olarak taşır; motor olaylar yerine bunu da kullanabilir.
- [engine] Parametre indeksi = PARAMS sırası (106 kayıt; 104 AMP, 105 PITCH). mod: 0 modüle edilemez, 1 toplamsal, 2 çarpımsal. SOURCES sırası (README): 0 Amp Env, 1 Env2, 2 Env3, 3 LFO1, 4 LFO2, 5 Velocity, 6 Key, 7 PB, 8 Pressure, 9 Mod Wheel, 10 Random, 11 Slide, 12 Note PB (P3.wtp.SRC.*). Matris hedefleri: 'PITCH' = a·48 st, 'oNTransp' (Osc N Pitch) = a·24 st, 'AMP' çarpımsal. UI 'vol', 'transp' ve 'oNDet' için hiç satır açmaz (takma adla AMP/PITCH/oNTransp'a yönlenir).
- [engine] Çalınacak tablo: `P3.wtp.audibleTable(P3.wtp.tableId(p[IDX.o1Cat], p[IDX.o1Tab]))`. Faz 1'de Sync/Dijital/Gürültü kategorileri 0'a (Temel Şekiller) düşer. oNCat/oNTab değişimi 'state' olayıyla gelir; kategori değişince Tab da 0'a yazılır (ikinci olay). LFO senkron hızı: P3.wtp.SRATE_BARS[idx] bar → Hz = bpm/60/(bar·4). Ses sayısı: ENUMS.polyIdx[idx] (sayı).
- [engine] P3.wtp.applyPreset(tr, id) store'dan geçmez ve olay yaymaz; tr.p ve tr.mods'u yerinde yeniden kurar (referanslar korunur, mods = DEFAULT_MODS + preset). P3.wt.applyPreset(i, id) içinde bunu çağırıp tüm parametreleri ve mod'ları worklet'e yeniden gönderin, LCD'yi invalidate edin. Undo geçmişini temizlemek ya da snapshot almak çağıranın kararı.
- [engine/worklet] lfoShape(shape, shaping, phase, u?) ve envCurve(x, s), UI ile ortak formül. p3-wt-params.js window'suz kapsamda da yüklenir (globalThis.P3.wtp, vm ile test edildi), yani worklet ikinci bir addModule ile aynı dosyayı kullanabilir; ya da formül kopyalanır. Random için worklet kendi PRNG değerini u (−1..1) olarak verir; u yoksa döngü indeksinden deterministik değer üretilir. Çıkış Amount uygulanmamış −1..1.
- [lcd] Sütun başına `P3.wtp.slotView(S, tr, slot)` → {label, text, value, norm 0..1, bipolar, list, index, disabled, modulatable, k|v}. list varsa liste/ikon görünümü: Oscillator, Main bankında ve osc '1'/'2' iken '1 2 S Mix' yatay listesi, diğer durumlarda ikon. list yoksa büyük değer + halka (bipolar ise tepeden iki yana). disabled → #3A3F44. Tab adı fmt/slotView'a tr ile gelir ve '… (yakında)' ekli olabilir; sütunda kesilir.
- [lcd] Görselleştirmeler: `for (var v = b.vis(S,tr); v; v = v.next) …`. Main'de osc 1/2 seçiliyken iki tane gelir (wavetable 0–2 + filter 3–5). v.osc, v.flt, v.env ve v.lfo bağlam verir; kapsanan sütunların slot'ları küçültülür. Tablo verisi: P3.wt.tableDisp(audibleTable(tableId(cat,tab))). Envelope eğrisi envCurve ile, LFO lfoShape ile çizilir. Vurgu bayrakları dokunulan slot'un k'sinden çıkar: oNPos/oNTab → AdjustingPosition; fNType/fNFreq/fNRes → AdjustingFilter; l1*/l2* → AdjustingLfo; ampA/ampASl → Attack segmenti vb.
- [lcd] r0'daki options (sütun 1..7 = options[0..6]): toggle `${o.label} ${o.get(S,tr) ? 'On' : 'Off'}` (VARSAYIM biçim, sartname-ekran §3); switch → o.values yan yana, seçili o.get(S,tr) beyaz; action → o.label, Add to Matrix enabled false iken sönük. r7 bank sekmeleri BANKS[i].name, seçili S.wtui.bank. Mod Target değeri slotView().text ile gelir (matris adı, ör. 'Filter 1 Freq'); Enc2 etiketi parametrenin kendi adı ('Flt 1 Freq', 'Volume', 'Osc 1 Pitch').
- [leds] upper2..8 light bar: options[i] null → off; toggle → get true ise on, değilse dim; switch → dim (VARSAYIM); action → dim, Add to Matrix enabled(S,tr) false iken off (VARSAYIM). Bank görünümünde lower sekmeleri BANKS'ten, seçili S.wtui.bank.
- [tutorial] Değer okuma: tr.p[P3.wtp.IDX.k]. DİKKAT: subGain varsayılanı 0.501 (−6 dB). 'sub: enc2 ≥0.5' eşiği kurulumda zaten doğru olur ve check(setup)===false kuralını bozar; ≥0.7 ya da rt.base'e göre artış kullanın. Pluck 'S ≤ %1' = ampS ≤ 0.01 (doğrusal kazanç, ≈−40 dB). Effect Classic = o1Fx===2, PW = o1Fx1. LFO→Position: P3.wtp.modTarget(S,tr)==='o1Pos' && (tr.mods.o1Pos[3]||0)!==0 (LFO 1 = src 3). Varsayılan matriste Mod Wheel → o1Pos 1.0 zaten var (src 9).
- [app/modes] Preset seçici: Object.keys(P3.wtp.PRESETS) şartname sırasında (init … acid); görünen ad P3.t(P3.wtp.PRESETS[id].name). [core] hydrate'in kullandığı defaults() ve DEFAULT_MODS sözleşmeye uygun; init preseti = defaults + DEFAULT_MODS, yani hydrate ile aynı sonuç.

## tables

### API
WORKER (dosya Worker olarak acilinca; tespit: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope):
  giris:  {t:'gen', id: 0..11 | 'sub', profile: 'hq'|'std'|'eco'}
  cikis:  postMessage({t:'tdata', id, F, N0:2048, profile, levels:[{len,H,base}] (11 seviye), buf: Float32Array, disp: Float32Array(F*256)}, [buf.buffer, disp.buffer])
  hata:   {t:'terr', id, msg}

ANA THREAD / HER IKI KAPSAM: self.P3TableGen = {
  N0: 2048, K: 1023, LEVELS: 11, GUARD: 3, IDS: [0..11, 'sub'],
  generate(id, profile) -> yukaridaki tdata nesnesinin aynisi (senkron),
  generateAsync(id, profile, cb(err, result)) -> iptal fonksiyonu; ~8 ms dilimler, aralarda setTimeout(0) (README A13),
  coefs(id, frame) -> {c: Float64Array(1024), s: Float64Array(1024)} ham (normalize edilmemis) harmonik katsayilari, indeks = harmonik; PeriodicWave fallback'i icin real=c, imag=s,
  layout(profile, F=64) -> [{len,H,base}]
}

Bellek yerlesimi: levels[L].base = seviyenin baslangici (levelBase[L]); kare f'nin i. ornegi buf[base + f*(len+3) + 1 + i]; kare dizilimi [s(len-1) | s0..s(len-1) | s0, s1]. H_L = min(1024>>L, len/2-1). std/hq: len hep 2048 (H 1023,512,...,1), eco: 2048,1024,512,256,256... (H 1023,511,255,127,64,...,1). std tablo = 11*64*2051 float = 5.5 MB; eco ~1.4 MB. Her karenin L0 tepesi 0.9, ayni katsayi tum seviyelerine. disp: kare basina L0'dan 256 nokta, tepe = 1 (buf/0.9).

### Sapmalar
- Pulse (1): dogrulanmis s_k/c_k formulunun isareti ters cevrildi. Boylece w=0.5 karesi Temel Sekiller kare dalgasiyla birebir ayni fazda (+sin konvansiyonu, iki osilator/morph arasinda faz iptali yok). Test: fark 6e-14.
- Sinus Katlama (2): g=0 karesi (z=0) sessiz olurdu; limit alindi (saf sinus). Diger kareler s_n = 2*J_n(pi*g/2), g 0->8 dogrusal; Bessel Miller geri ozyinelemesiyle.
- FM (7), Sync (8), Bitcrush (9): sartnamedeki 8x oversample + FFT yerine kapali form katsayilar. FM: s_k = J_{k-1}(b) + (-1)^k J_{k+1}(b) (8x yolla ayni sonuc, 1e-15; FM tablosu 290 ms -> 44 ms). Sync: s_k = S(a-b)-S(a+b), c_k = C(a-b)+C(a+b). Bitcrush: N seviyeli merdiven = testerenin N'in kati olan harmonikleri silinmis hali (kesin). Sync/Bitcrush sureksiz oldugu icin 8x OS'ta ~-84 dB kesme artigi alias kalirdi; kapali form tam band-limited. Sub sartnamedeki gibi 8x ornekleme + FFT ile.
- Harmonik Tarama (3), Tek<->Cift (4), Rezonans (11): 1/k genlikleri Temel testereyle ayni isaret duzeniyle ((-1)^(k+1)) kullanildi; t=0'da yukselen sifir gecisi, tablolar arasinda faz tutarli.
- Normalizasyon tum tablolarda kare basina (sartname §4). Arastirmadaki tini-tarama tablolarinda tablo geneli normalizasyon secenegi kullanilmadi.
- disp uzunlugu F*256: 0..11 icin 64*256 (sozlesmeyle ayni), 'sub' icin 16*256. disp degerleri tepe=1'e olcekli (buf/0.9), LCD dogrudan +-34 px ile carpabilir.
- EKLEME: cikti nesnesine `profile` alani; hata mesaji {t:'terr', id, msg}; generateAsync() (README A13 'setTimeout(0) ile kare kare' icin), coefs() (PeriodicWave fallback'i), layout().
- hq ve std ayni veriyi uretir (len hep 2048); fark yalniz worklet'teki okuma ve mip seciminde.
- VARSAYIM'lar (kodda isaretli): FM indeksi 0->6 dogrusal; Sync rho 1->8 dogrusal; Bitcrush seviye sayisi 2^(6-5j/63) yuvarli (6 bit -> 1 bit); Organ'in 8 drawbar kaydi (800000000 -> 888888888, koyudan parlaga, kare 0 = saf 16'), drawbar duzeyi d/8; Gurultu genligi k^-alpha, alpha 1->0 (-6->0 dB/okt), temel harmonik fazi 0 (+sin), digerleri mulberry32(1234); Rezonans tepesi = testere x (1 + (Q-1)*bant geciren genligi), merkez harmonik 2->40 ustel, Q=8; Vokaller arastirma-dsp formulu (G = 1/0.5/0.25, formantlar log-frekansta interpole).

### Diğer modüllere notlar
- engine: Worker'i `/assets/js/push3/p3-wt-tables.worker.js?v=${P3.K.V}` ile ac (README A13 sirasi). Worker acilamazsa dosyayi normal <script> olarak yukle; `self.P3TableGen` window'a tanimlanir, onmessage kurulmaz. Ana thread'de `P3TableGen.generateAsync(id, profile, cb)` kullan (setTimeout(0) dilimleri); `generate()` senkron ve ~50-90 ms bloklar.
- engine -> worklet: Worker'dan gelen tdata'yi worklet'e iletirken yalniz {t:'tdata', id, F, levels, buf} gonder ve [buf.buffer] transfer et; `disp` ana thread'de P3.wt.tableDisp(id) icin kalir. Iki farkli osilatore/track'e ayni tablo gerekiyorsa buf transfer edildikten sonra ana thread'de kullanilamaz — worklet global Map'i paylasildigi icin bir kez gondermek yeterli.
- engine: id tipi korunur (sayi gonderirsen sayi, 'sub' gonderirsen 'sub' doner); '3' gibi string id de kabul edilir ama geri '3' olarak doner — Map anahtarini tutarli tut.
- engine: 'sub' tablosu her track icin gerekir (Sub osilatoru); F=16, Tone ekseni kare ekseni: x = subTone*(16-1). Profil degisince (std<->eco) tablolar yeniden uretilmeli (levels farkli); hq<->std arasinda veri aynidir.
- engine (PeriodicWave fallback): `P3TableGen.coefs(id, frame)` -> {c, s} Float64Array(1024), indeks = harmonik, c[0]=0. `ctx.createPeriodicWave(c, s)` dogrudan kullanilabilir (Position icin iki karenin katsayilarini dogrusal karistir). Bunun icin tablo dosyasi ana thread'de de yuklenmis olmali.
- worklet: ornek okuma `o = lv.base + f*(lv.len+3) + 1`; dogrusal: T[o+i], T[o+i+1]; Hermite: T[o+i-1..o+i+2]; maske gerekmez. Mip secimi icin levels[L].H'nin GERCEK degerini kullan (eco'da L1 H=511). Bazi karelerin ust seviyeleri tamamen sessizdir (or. Tek<->Cift kare 63'te L10, Sync kare 63'te L>=8) — bu dogru band siniridir.
- lcd: disp = Float32Array(64*256), kare f'nin noktalari disp[f*256 .. f*256+255], tepe = 1 (buf/0.9); ekranda y = 100 - 34*v. Kareler arasi interpolasyonu lcd yapar (x = pos*63).
- Tum tablolar +sin konvansiyonunda (t=0'da yukselen sifir gecisi; kare 0'lari cogunlukla saf sinus: 0,2,3,5,7,8 ve sub). Temel Sekiller anahtar kareleri: 0 sinus, 21 ucgen, 42 testere, 63 kare — ogretici metinleri buna dayanabilir (pos 0.33 ~ ucgen, 0.66 ~ testere, 1.0 kare).

## worklet

### API
registerProcessor('p3-wavetable', P3Wavetable)  — AudioWorkletGlobalScope; global paylaşılan tablo önbelleği: const TABLES = new Map() (id → tablo), Sub için yerleşik yedek tablo.
Node seçenekleri: new AudioWorkletNode(ctx,'p3-wavetable',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{maxVoices /*ses tavanı, yoksa 16*/, profile:'hq'|'std'|'eco'}})
Ana thread → worklet (zamanlar ctx saniyesi; `at` yoksa/geçmişteyse hemen, varsa örnek doğruluğunda):
  {t:'init', params:[{k,min,max,curve,mod}], def:Float32Array|Array (params sırasıyla), mods:{k:{srcIdx:amt}}, bpm, profile}   — ilk mesaj; eşleme ADLA (k)
  {t:'p', i:Uint16Array, v:Float32Array}   — gerçek birimler; i = init'teki params indeksi; son değer kazanır, blok başında uygulanır
  {t:'m', tgt:k (ya da params indeksi), src:0..12, amt:-1..1}
  {t:'on', id:number|string, n:0..127, v:1..127, at}   {t:'off', id, at}   {t:'x', id, bend:-1..1 (NotePB, 1 = 48 st), slide:0..1, press:0..1, at}
  {t:'pb', v:-1..1, at}  {t:'mw', v:0..1, at}  {t:'press', v:0..1, at}  {t:'tempo', bpm}
  {t:'tab', osc:1|2, id}   {t:'tdata', id:0..11|'sub', F, levels:[{len,H,base}], buf:Float32Array|ArrayBuffer}   {t:'drop', id}
  {t:'panic'}  (bekleyen planlı olayları da siler; sesler 3 ms'de söner, PB/press 0)
  {t:'profile', p:'hq'|'std'|'eco', cap?:1..16}
Worklet → ana thread:
  {t:'meter', voices /*çalan (st=1)*/, cpu /*32 blok işlem süresi / gerçek süre, 0..1*/, pos1, pos2 /*en yeni sesin modüle edilmiş Osc1/2 Position'ı; ses yoksa taban*/, l, r /*son meter'dan beri çıkış tepe*/}  — 12 blokta bir
  {t:'need', id}  — osilatör açık ve tablosu Map'te yok; id başına bir kez (tdata/drop sonrası yeniden istenebilir)
İç yapı: 106 param (sartname §2 düzeni), 13 kaynak (sartname §5 sırası = P3.wtp.SOURCES), havuz 16+4 ses, kontrol dilimi 32 örnek, olay kuyruğu Float64Array(1024·6) zamana göre sıralı.

### Sapmalar
- Parametre eşleme: iç düzen sartname §2 sırası, ama ana thread indeksleri 'init'teki k adlarıyla eşlenir (ters sırayla gönderilen init birebir aynı çıktıyı verdi). init gelmeden 'p' indeksleri iç düzen sayılır; bilinmeyen adlar yok sayılır.
- 'p' mesajları kuyruğa değil önceden ayrılmış bir ara belleğe yazılır (son değer kazanır, taşma yok), blok başında uygulanır. Zamanlı olaylar halka değil zamana göre SIRALI kuyrukta tutulur: sequencer'ın ileri tarihli notaları ile anlık olaylar karışık gelir. 'init' ve 'tdata' onmessage'da doğrudan işlenir (yapısal, zamansız).
- Çıkış sınırlayıcısı: tanh(1.2x)/1.2 yerine 0.7 altında tam doğrusal, üstünde tanh diz. Gerekçe: tanh her seviyede 3. harmonik üretir (−35 dBFS sinüste ≈ −88 dB) ve Sub Tone %0 < −90 dB ölçütünü bozar; ayrıca 'soft-clip devrede değil' ölçütü eşiği olan bir sınırlayıcı gerektirir.
- Bandpass çıkışı k·band (tepe kazancı 0 dB, Morph'taki normalizasyonla aynı); şartnamedeki ham band (v1) yüksek rezonansta +34 dB'e çıkıyordu.
- Parallel'de kapalı filtre bypass kuralı birebir: çıkış 0.5·(F1(x) + x).
- Aynı notaya yeniden basış: eski ses 3 ms'de söner (kuyruk slotu), yeni ses zarflara eskisinin o anki seviyesinden başlar (tık ve seviye çukuru yok). Trigger döngüsünde note-off yok sayılır (VARSAYIM).
- Unison ses sayısı ve modu note-on'da sabitlenir (VARSAYIM), Amount canlı. eco: ≤4 ses/osc ve toplam unison'lu osilatör ≤48; bütçe dolunca yeni notada unison 1'e düşer, nota yine çalar. Shimmer/Noise'a ±0.02·A pozisyon titreşimi eklendi (arastirma §8.2).
- Efektler: Classic PW = max(0, fx1); Modern Warp çift yönlü d = 0.5 − 0.49·fx1, mip çarpanı 0.5/min(d,1−d). Fold %0'da tamamen bypass. EKLEME: PW/Warp sıkıştırması ve Fold kazancı perdeye göre tavanlanır (sıkıştırılmış dalganın temeli 0.45·fs'i aşmasın) — yalnız üst oktavlarda devreye girer, en kaba katlanmayı önler (VARSAYIM).
- Çarpımsal hedefte negatif miktar kaynağı ters çevirir (1 − u); çift yönlü kaynaklar (LFO, Key, PB, Random, Note PB) (x+1)/2 ile 0..1'e taşınır.
- Sub perdesi sesin perdesini izler (nota + Transpose + PITCH), Osc 1'in Transp/Det'ini izlemez (VARSAYIM). Sub tablosu: Worker'dan tdata id 'sub' geldiyse o kullanılır, yoksa worklet kendi üretir (16 Tone karesi, 8 mip seviyesi, ≤255. harmonik; ilk kurucuda ~25 ms, process dışında).
- Mono: Glide legato'da ve release sırasında yeniden basışta da uygulanır; legato'da velocity güncellenir; Poly⇄Mono değişiminde çalan sesler 3 ms'de söner.
- Nota id'si string olabilir (ör. 'p3'); onmessage'da negatif tamsayılara eşlenir (tek küçük Map girdisi, process dışında).
- {t:'profile', p, cap}: cap opsiyonel ses tavanı (README A9 bütçesi). processorOptions.maxVoices da aynı tavan (varsayılan 16); spare yok sayılır (kuyruk sabit 4). Poly Voices 16 yalnız hq + unison kapalı + tavan 16 iken.
- Tablo değişimi anlık (7 ms geçiş Faz 2). Eksik tabloda osilatör sessiz, {t:'need'} bir kez.
- Faz 1: OSR/MS2/SMP/PRD devreleri Clean gibi çalışır (// Faz 2); Drive kuralı yine 'devre ≠ Clean' ve tip LP/HP/BP'ye bakar.
- Bellek ayırma yok kuralı için V8'e özgü önlem: sıcak döngülerde tablo okuma blok halinde (readBlock), rampa değerleri argüman yerine nesne alanlarıyla taşınır, zarf ve sınırlayıcı değer döndürmez. Satır içine alınmayan çağrıya double argüman/dönüş V8'de HeapNumber ayırıyordu (ilk sürümde blok başına ~400 KB çöp; şimdi 3.2 sn yoğun seste 1 scavenge).
- LFO: Random S&H ham faz sarmasında yenilenir; Phase ofseti okumada eklenir (çalan seste Phase değişimi anında etkili). Şekil formülleri P3.wtp.lfoShape ile birebir aynı.

### Diğer modüllere notlar
- engine: İlk mesaj {t:'init', params: P3.wtp.PARAMS.map(p=>({k:p.k,min:p.min,max:p.max,curve:p.curve,mod:p.mod})), def: tr.p, mods: tr.mods, bpm, profile}. Sonraki 'p' indeksleri PARAMS indeksi (init sırası). Worklet sabit indeks varsaymaz; preset uygulamada tüm p'yi tek 'p' mesajında göndermek yeterli, mods değişimi için 'm' (tgt = param adı; MOD_ALIAS'lı adlar 'AMP','PITCH','o1Transp' doğrudan çalışır) ya da yeni bir 'init'.
- engine: 'tab' id'si P3.wtp.audibleTable(P3.wtp.tableId(cat, tab)) olmalı (Faz 1'de Sync/Dijital/Gürültü → 0). tdata'yı 'tab'tan önce göndermek iyi; göndermezse worklet {t:'need', id} ister (id başına bir kez), osilatör tablo gelene kadar sessiz. 'sub' tdata'sı opsiyonel (gelmezse worklet kendi Sub tablosunu kullanır). buf Float32Array ya da ArrayBuffer (Transferable) olabilir; levels[L].base = seviye başlangıcı (Worker çıktısıyla aynı).
- engine: processorOptions.maxVoices ses TAVANIDIR (varsayılan 16). Şartnamedeki maxVoices:8 verilirse Poly Voices 16 çalışmaz. README A9 bütçesi (std ≤16, eco ≤10 toplam) için {t:'profile', p, cap} ile track başına tavan verin.
- engine: CPU koruması (3 ardışık %70 → hq→std→eco, sonra poly 6/4, toast 'Ses kalitesi CPU için düşürüldü') ana thread'in işi: worklet meter.cpu (0..1, 32 blok ortalaması) raporlar ve {t:'profile'} ile gelen kararı uygular. eco'ya geçişte eco uzunluklu tabloları yeniden gönderin.
- engine/input: nota id'leri sayı ya da string olabilir ('p'+pointerId gibi). note-off idempotent. {t:'x'} bend normalize: 1.0 = 48 st (varsayılan matris PITCH ← NotePB 1.0). PB −1..1 (PITCH ← PB 2/48 → ±2 st), mw 0..1, press 0..1.
- engine/seq: planlı olaylar `at` (ctx saniyesi) ile örnek doğruluğunda uygulanır (blok 64–1024'te 0 örnek sapma). {t:'panic'} bekleyen planlı notaları da siler — transport durunca/panic'te ayrıca off göndermeye gerek yok.
- lcd: meter 12 blokta bir gelir (~31 Hz @48k); pos1/pos2 en yeni çalan sesin MODÜLE EDİLMİŞ Position'ı (ses yoksa taban değer) — LCD'deki Position çizgisi için. l/r son meter'dan beri çıkış tepesi. voices = çalan ses (sönenler hariç).
- lcd/params: LFO şekilleri P3.wtp.lfoShape ile birebir (Triangle φ=0'da 0'dan yukarı, Saw +1'den aşağı). Zarf eğrisi envCurve ile aynı; zarf süreleri Mod Time ile × 2^(3t), LFO hızı ÷ aynı çarpan.
- modes: Poly⇄Mono değişiminde çalan sesler 3 ms'de söner (asılı nota olmaz). Hi-Quality parametresi (hq) taban profil 'eco' değilse o track'i hq okumaya geçirir.
- tümü: Worklet dosyası yalnız tanım + registerProcessor yapar; ilk AudioWorkletNode kurulumunda Sub tablosu ~25 ms'de üretilir (ses başlamadan, kurucuda). Test harness'ı: scratchpad/p3test/worklet-harness.mjs (sahte AudioWorkletProcessor + gerçek P3.wtp + P3TableGen) diğer ses testlerinde tekrar kullanılabilir.

## drums

### API
P3.drums = {
  KIT,        // 16 slot: {pad 0..15, note 36+pad, name, kind:'sample'|'synth'|null, file? (yalniz sample)}
              // 0 Kick(sample) 1 Rim(synth) 2 Snare(sample) 3 Clap(synth) 5 Tom(synth) 6 Closed Hat(sample) 10 Open Hat(sample) 13 Crash(synth); digerleri name:'' kind:null
  ready,      // bool; load() tum sample'lar sonuclaninca true
  load(),     // -> Promise<bool>. Tek seferlik (ayni promise). ctx yoksa warn + resolve(false), sonra tekrar denenebilir. Sample: fetch('/assets/audio/'+encodeURIComponent(file)) -> decodeAudioData (callback+promise uyumlu). Hata -> o pad sessiz + console.warn. Bitince bus.emit('drums', {ready:true, failed:[pad...]}). Ilk cagrida bus 'panic' dinleyicisini kurar ve gurultu tamponunu (2.5 s, mulberry32 ile deterministik) uretir.
  hasSound(pad),          // slot dolu && sample yuklemesi basarisiz olmadiysa true (yukleme surerken true)
  trigger(pad, vel, when),// -> bool (ses planlandi mi). vel 1..127'ye kirpilir, sayi degilse P3.K.kbVel||100. when yoksa/gecmisse ctx.currentTime. Kazanc 0.8*vel/127. Cikis: P3.audio.trackInput(1) || P3.audio.master.mixBus || ctx.destination. Choke grubu uygulanir.
  choke(pad, when),       // pad'in `when` aninda veya once baslamis seslerini 10 ms dogrusal rampayla susturur, kaynaklari durdurur; sonra baslayacak (ileriye planlanmis) seslere dokunmaz
  panic()                 // tum sesleri (ileriye planlanmislar dahil) su an 10 ms'de susturur; bus 'panic' olayi da bunu cagirir
}

### Sapmalar
- Lab'deki synthDrum (ableton-lab.html:1082) yalniz Kick/Snare/Hat/Bass tarifi iceriyor; Rim, Clap, Tom, Crash tarifi Lab'de YOK. Bunlar ayni sentez fikriyle (osilator + perde zarfi, gurultu + filtre, ustel sonum) sifirdan tasarlandi: Rim = 480 Hz ucgen + 1.72 kHz sinus, HP 300, 55 ms + 4 kHz gurultu tiki; Clap = BP 1.2 kHz gurultu, 11 ms arayla 3 patlama + 220 ms kuyruk; Tom = 170->95 Hz sinus, 500 ms + tik; Crash = HP 4.5 kHz gurultu + 808 tarzi 6 kare osilator (BP 8k/HP 6k), 2.3 s. Hepsi VARSAYIM, kulakla ayarlanacak.
- Seviyeler Chrome OfflineAudioContext ile olculup sample'lara (tepe ~0 dBFS) gore ayarlandi: pad kazanci haric tepe Rim -1.4, Clap ~-2, Tom -1.1, Crash -1.0 dB.
- Choke simetrik choke grubu olarak uygulandi (Drum Rack gibi): CHOKE_GROUP {6:1, 10:1}. Sozlesmedeki 'Closed Hat Open Hat'i susturur' bunun ozel hali; Open Hat da calan Closed Hat'i keser (duyulmaz). Ayni pad'in tekrari kendini kesmez.
- choke(pad, when) semantigi: 'pad'in seslerini when aninda sustur' (tetikleyen pad degil, susturulan pad). Grup mantigi trigger icinde.
- KIT slotlarina ek alanlar: note (36+pad) ve sample slotlarinda file. Bos slot name ''.
- hasSound: yukleme surerken dolu sample pad icin true doner (LED'ler acilista gri yanip sonmesin); yalniz yukleme basarisiz olursa false.
- EKLEME: load() bitince P3.bus.emit('drums', {ready:true, failed:[...]}).
- EKLEME: ayni anda en fazla 24 drum sesi (VARSAYIM, CPU); asilirsa en eski choke edilmemis ses 10 ms'de susturulur.
- Spec 'Low Tom' diyor, gorev metni 'Tom' dedi; LCD adi 'Tom'.
- load() ctx yokken reject yerine warn + resolve(false) doner (yakalanmamis promise hatasi olmasin), memoize edilmez.
- Bus 'panic' dinleyicisi yukleme aninda degil load() icinde kurulur (README §C: dosyalar yuklenirken yan etki uretmez); load'dan once zaten ses yoktur.

### Diğer modüllere notlar
- engine (p3-wt-engine): P3.audio.trackInput(i) fonksiyonunu saglayin; drums her trigger'da trackInput(1)'i cagirir (drumGain -> pan -> mute zinciri sizde). Yoksa master.mixBus'a baglanir. Sample tepeleri ~0 dBFS; ust uste binen vuruslarda tepe >1 olabilir, softClip gerekli.
- app: P3.drums.load() P3.audio.unlock()/init sonrasi (ctx hazir) cagrilmali; Promise<bool> doner. Synth pad'ler load() cagrilir cagrilmaz calar, sample'lar decode bitince.
- seq: P3.drums.trigger(pad, vel, when) ctx zamaniyla ileriye planlanabilir; choke da when zamanina gore dogru calisir (100 ms lookahead guvenli). Drum track pad = nota - 36; pad > 15 veya bos pad -> trigger false doner, sessiz.
- modes/input: trigger bus 'note' olayi ATMAZ; 'note' olayini modes atmali (README G10). Drum track'te 'Select+pad' ses cikarmamali -> trigger cagirmayin.
- leds/lcd: bos pad gri icin P3.drums.hasSound(pad) veya KIT[pad].kind kullanin; sample yuklemesi basarisiz olursa hasSound false olur ve bus 'drums' {ready, failed} olayi atilir -> invalidate edin. LCD pad adi KIT[pad].name (Ingilizce kisa); bos slotta name '' -> nota adini (KIT[pad].note) gosterebilirsiniz.
- panic: P3.panic() -> bus 'panic' -> drums.panic() otomatik (load sonrasi kayitli). drums.panic P3.panic'i cagirmaz (dongu yok).
- Metronom (sartname-ses-motoru §13) bu dosyada DEGIL; seq veya engine'e ait.

## device

### API
P3.dev = {
  load() → Promise<P3.dev>   // fetch('/assets/img/push3-device.svg') → DOMParser nötrleştirme (mimari §5 + A1) → #p3DeviceWrap'e adoptNode → #p3Live → hotspot DOM → ResizeObserver(wrap) + visualViewport.resize + DPR değişimi → align(). İkinci çağrı aynı promise'i döner. HTML (Firebase rewrite) ya da 404 → reject; sonraki load() yeniden dener.
  svg, live, view ('full'), stripDot (<circle>), targetG (<g>, öğretici çerçeveleri için boş)
  CONTROLS: id → { id, kind:'btn'|'enc'|'pad'|'strip'|'dpad'|'octpage'|'lcd', svgId, label (cihazdaki EN ad = aria-label), hit:{x,y,w,h}|{cx,cy,r}, led:'label'|'bar'|'none', glyphIds:[…], ek: bar?{x,y,w,h}, text? (scene), dir?'up'|'down'|'left'|'right'|'center', group?'dpad'|'octpage', toggle?true, keys? (aria-keyshortcuts) }  — 85 kayıt
  GROUPS: { dpad:{x,y,w,h,cx,cy,center:'dpadC',up,down,left,right}, octpage:{…} }
  PAD {x0:589,y0:866,w:146,h:108,px:152,py:114}; VIEWS {full,pads,padsStrip,controls}
  toSvg(clientX, clientY) → {x,y} | null (yüklenmeden)
  hitTest(x, y) → id | {pad:[x,y]} | null   (SVG birimi; D-pad ve Octave/Page için her zaman yaprak id)
  padAt(x, y) → [x, y (alttan)] | null   (6 birimlik boşluk ortadan bölünür; NaN → null)
  svgRect(t) → {x,y,w,h} SVG birimi; t = id | 'dpad' | 'octpage' | {pad:[x,y]}
  controlRect(t) → {x,y,w,h} CSS px, #p3HotspotLayer'a (= kabuktaki .p3-device-frame dolgu kutusu) göre | null
  align() → bool (sahne gizliyse false)
  setView('full'|'pads'|'padsStrip'|'controls') → bool; iki SVG'nin viewBox'ı birlikte, sonra align(); load'dan önce çağrılırsa load'da uygulanır
  glyph(id) → <g data-id>  (LED rengi = el.style.color; içerik currentColor)
  padEl(i) → pad <rect> (i = r*8+c üstten), bar(id) → light bar <rect> (upper1..8, lower1..8, mainTrack), ring('enc1'..'enc8') → dokunma halkası <circle>
  hotspotEl(id | {pad:[x,y]}) → hotspot div | pad gridcell
  stripY(v 0..1 alttan) → SVG y;  stripValue(y) → 0..1
  expand(patterns) → id[] registry sırasında ('upper*' önek, 'dpad'/'octpage' grup, tam id; string olmayanlar yok sayılır)
}
Bus olayı: 'layout' { view, scale (px/SVG birimi), lcdResized } — her başarılı align() sonrası.

### Sapmalar
- SAPMA: Kontrol haritasındaki tek `dpad` kimliği yerine dpadUp/dpadDown/dpadLeft/dpadRight + dpadC var (her okun kendi LED glifi — Vector 1_4/2_2/2_3/1_5 — ve kendi erişilebilir düğmesi olsun diye; p3-core UNSUPPORTED zaten `dpadC` kullanıyor). `dpad` ve `octpage` CONTROLS değil GROUPS kaydıdır: expand('dpad') 5 kimliği, svgRect('dpad') bütün Frame 35 kutusunu verir; hitTest her zaman yaprak kimliği döner.
- SAPMA: Klon matrisi önce karar A1'deki `svg.getScreenCTM().inverse().multiply(el.getScreenCTM())` ile alınır; sahne gizliyken (menü açıkken load) ekran CTM'i null/tekil olduğundan aynı matris ataların transform listelerinden (consolidate) kurulur. Tarayıcıda gizli sahneyle yükleyip sonra göstererek doğrulandı: 57 klonun sapması 0 px.
- SAPMA: setView anlıktır; sartname-mobil'deki 200 ms viewBox interpolasyonu yok. README 'filter bu değişimde bir kez yeniden rasterize olur' diyor; animasyon her karede filtreli cihazı yeniden rasterize ederdi.
- EKLEME (nötrleştirme): strip'in statik noktası `Group 8` gizlenir (yoksa hareketli canlı noktayla iki nokta görünürdü). Boşalan soft-light blend grubu `Rectangle 39` silinir. 'Arka plan kaldırma' kuralı: desen dolgulu rect'ler ve pattern/image tanımları silinir. Mevcut dosyada arka plan yok (commit 308a07a dosyadan kaldırmış), kural yeniden export'a karşı duruyor. Hiçbir durumda dosyaya dokunulmuyor.
- Netleştirme: '57 no-op rect' kuralı `rect[fill=none]` ve stroke'suz olarak uygulandı. Dosyada tam 57 tane var; 55'inin fill-opacity'si 0.04, ikisininki (Pixels 0.3, Rectangle 39 0.1) farklı.
- Netleştirme: SessionSettings satırlarında y = 360.328 / 757.328, yani SVG'deki kesin değer (harita 360.3'e yuvarlıyor). Enc1..8 hit 150×120 yüz merkezine ortalandı.
- EKLEME (API): GROUPS, PAD, VIEWS, view, svgRect, ring, stripDot, stripY, stripValue, targetG, expand. hotspotEl, controlRect ve svgRect `{pad:[x,y]}` (hitTest'in döndürdüğü biçim) de kabul eder.
- EKLEME: align() LCD canvas'ın konumuna ek olarak arka tamponunu da kurar (sartname-ekran: CSS px × DPR, en çok 2) ve bus'a 'layout' yayar. Tampon değişince canvas silinir; p3-lcd bu olayla yeniden çizer.
- Karar: Hotspot katmanı offsetParent'ın dolgu kutusunu kaplar (kabukta .p3-device-frame), controlRect de bu px uzayındadır; aynı çerçevedeki #p3Coach doğrudan kullanabilir. Hotspot'lar px ile konumlanır, pad hücreleri yüzeyin yüzdesiyle bir kez yerleşir. pads/controls görünümlerinde görünür SVG kutusunun tamamen dışında kalan hotspot'lar ve LCD canvas `style.visibility='hidden'` olur, böylece görünmeyen kontrol odak almaz.
- Karar: pads/padsStrip/controls görünümlerinde letterbox şeritleri kırpılmaz. Şeritlerde komşu kontroller görünür ve çalışır, çünkü SVG 'meet' ile viewBox dışını da çizer.
- Kabuk uyumu: kabuk (ders-push3.html, başka ajan) .p3-hotspot/.p3-enc/.p3-jog/.p3-strip/.p3-pad-surface sınıflarına CSS yazmış. Sınıflar classList.add ile eklenir, kabuğun sınıfları korunur. Pad yüzeyi `.p3-pad-surface p3-hs-pad` alır, `.p3-hotspot` almaz; almasaydı kabuğun hover vurgusu bütün ızgarayı %22 beyazla örterdi. Diğerleri `p3-hotspot p3-hs-<kind>` (+p3-enc | p3-jog | p3-strip).
- Tıklama şekli: dairesel kontrollerde (volume, swingTempo, jog) inline border-radius:50% var; tarayıcı isabeti ve odak halkası daireyi izler. Çapraz bölgelerde (D-pad okları, Octave/Page) inline clip-path üçgeni ve data-shape='tri' var. elementFromPoint ile hitTest'in her kontrolde ve köşegen yakınlarında aynı sonucu verdiği doğrulandı.
- Erişilebilirlik: slider'larda aria-valuemin/max/now yer tutucudur (0/100/0), değeri bilen modül yazmalı. aria-pressed='false' yalnız Mute, Solo, Metronome, Fixed Length, Repeat ve Accent'te var. aria-keyshortcuts yalnız klavye düzeninden bağımsız tuşlarda: Space, Enter, Backspace, Shift, 9, 0, oklar, Ctrl/⌘+Z/S. Slash/Period/Backquote/Backslash TR klavyede farklı tuşa düştüğü için yazılmadı. aria-label'lar cihazdaki İngilizce adlardır. Grid etiketi TR, hücre etiketi başlangıçta `Pad, satır Y sütun X` (satır Push gibi alttan).
- VARSAYIM: scene etiketleri Instrument Sans 500, 14.5 birim, Figma konumunda (sol +12.36, taban +26). Encoder dokunma halkası r42, stroke 3; bu bizim tasarımımız. Scene sırası, MiscButton = Main Track ve Knob_10 = Swing&Tempo kodda VARSAYIM olarak işaretli.
- EKLEME: kabukta #p3Live, #p3LcdCanvas ya da #p3HotspotLayer eksikse wrap'ın kardeşi olarak oluşturulur ve console.warn('[p3] …') yazılır, böylece emülatör açılmaya devam eder. Cihaz SVG kökü width/height 100%, aria-hidden ve focusable=false alır; içerik <g id="p3-art"> altında sarmalanır (mimari §5.7).

### Diğer modüllere notlar
- GENEL: P3.dev.CONTROLS dosya yüklenince hazırdır (load beklemez). DOM elemanları (glyph/padEl/bar/ring/hotspotEl/stripDot/targetG) load() resolve olunca vardır, öncesinde null döner. load() sahne gizliyken çağrılabilir; hizalama sahne görününce ResizeObserver ile olur.
- p3-leds: #p3Live'da LED rengi CSS color'dır: `P3.dev.glyph(id).style.color = hex` (padEl(i), bar(id), ring(id) ve P3.dev.stripDot için de aynı). Fill/stroke yazma, içerik currentColor. Başlangıç renkleri: pad C.off, bar C.ledOff, glif C.ledDim, halka ve nokta C.ledOn. Halkalar `style.visibility='hidden'` başlar, dokunmada 'visible' yap. Blink/pulse için style.opacity kullanılabilir. Strip noktası: `P3.dev.stripDot.setAttribute('cy', P3.dev.stripY(v))` (v 0..1 alttan). Öğretici çerçevesi: P3.dev.targetG içine rect; geometri `P3.dev.svgRect(id | {pad:[x,y]} | 'dpad')`, SVG biriminde. LED türü CONTROLS[id].led ('label' → glyph, 'bar' → bar). D-pad yön LED'leri dpadUp/Down/Left/Right, dpadC'nin LED'i yok. padEl(i): i = r*8+c üstten, yani Push (x,y) için i = (7-y)*8+x.
- p3-input: hotspot'lar [data-id]; `e.target.closest('[data-id]')` güvenilir, üçgen ve daire isabeti tarayıcıda hitTest ile birebir. Kind → olay eşlemesi: btn ve lcd → {k:'btn', id}. enc (enc1..8, volume, swingTempo, jog) → {k:'enc', id}. strip → v = P3.dev.stripValue(P3.dev.toSvg(cx,cy).y). dpad → {k:'dpad', dir: CONTROLS[id].dir} ('center' = dpadC). octpage → {k:'octpage', dir}. Pad yüzeyi #p3PadSurface (.p3-pad-surface; .p3-hotspot DEĞİL): pointerdown'da setPointerCapture ve `P3.dev.padAt(p.x, p.y)` ile `p = P3.dev.toSvg(clientX, clientY)`. Yakalama sırasında yüzey dışına taşan nokta null döner. Hücreler .p3-pad-cell[role=gridcell][data-x][data-y][data-i]; roving tabindex başlangıçta (0,0) sol alt; odak taşıma ve tabindex senin işin; `P3.dev.hotspotEl({pad:[x,y]})`. Jog merkezi CONTROLS.jog.hit.cx/cy (açısal dönüş için). role=button div'lerde Enter/Space etkinleştirmesi senin işin. Play'de aria-keyshortcuts 'Space', Record'da 'Enter': odaklı bir hotspot'ta Space/Enter o düğmeyi mi basar, global kısayol mu, kuralı sen koy. toSvg, align()'ın önbelleğe aldığı CTM'i kullanır (RO, visualViewport, setView tazeler).
- p3-lcd: #p3LcdCanvas'ın konumunu VE arka tamponunu P3.dev.align() kurar (CSS px × min(2, DPR)). canvas.width/height'ı değiştirme. Çizim `ctx.setTransform(k,0,0,k,0,0)`, k = canvas.width / P3.K.LCD.W (960). P3.bus 'layout' olayında lcdResized true ise tampon silinmiştir, yeniden çiz. pads/padsStrip görünümünde LCD görünür alanın dışındaysa canvas.style.visibility 'hidden' olur; bu durumda çizim atlanabilir.
- p3-modes: CONTROLS[id].kind/dir/group ve id listesi registry'den okunabilir. D-pad olayları dpadUp/Down/Left/Right/dpadC, Octave/Page olayları octaveUp/octaveDown/pageLeft/pageRight kimlikleriyle gelir. `P3.dev.expand(['dpad'])` 5 kimliği verir.
- p3-app / p3-levels / p3-tutorial: allow/targets desenlerini `P3.dev.expand(list)` ile çöz ('upper*', 'enc*', 'dpad*', 'dpad', 'octpage', 'pads', 'lcd'). Seviye 1 hedefleri: 'lcd' (581,482,1222,220) ve 'pads' (bütün ızgara) registry'de var. Vurgu için `P3.dev.hotspotEl(id).querySelector('.p3-hl')` üzerinde .target/.correct/.wrong kullan; pad yüzeyinde de .p3-hl var. #p3Coach aynı .p3-device-frame içinde olduğundan `P3.dev.controlRect(id)` px değeri doğrudan left/top olur; 'layout' olayında yeniden konumla. Kilit (aria-disabled) için hotspotEl(id). Hotspot'ların style.visibility'sini align() yönetir, başka modül yazmasın. prefs.view 'auto' çözümü (≤600px → padsStrip) p3-app'te kalır, sonra P3.dev.setView(name) çağrılır. ResizeObserver olmayan eski tarayıcıda sahneyi gösterdikten sonra P3.dev.align() çağır.
- Kabuk (ders-push3.html; dosyaya dokunmadım, yalnız okudum): yapı ve CSS ile uyumlu, kabuğa benzer bir test sayfasıyla doğrulandı. (1) data-shape='tri' hotspot'larda clip-path odak outline'ını keser; `.p3-hotspot[data-shape="tri"]:focus-visible .p3-hl { opacity:.5; background:… }` gibi bir odak göstergesi eklenmeli. (2) .p3-enc::after (en az 44 px kare), telefonda full görünümde komşu encoder'ların alanlarını üst üste bindirir (DOM sırası kazanır). Volume ve Swing'de dairenin köşelerini de isabete katar; bu zararsız, çünkü başka bölgeyle çakışmıyor. (3) Pad yüzeyi .p3-hotspot olmadığından `.p3-hotspot[aria-disabled]` karartması ona uygulanmaz; gerekirse `.p3-pad-surface[aria-disabled="true"]` kuralı eklenmeli.
- engine / seq / drums: p3-device'a bağımlılık yok.

## shell

### API
Bu dosya yalnız sayfa kabuğunu (DOM ve CSS) sağlar, JS API'si açmaz.

DOM (README §E'nin tamamı, 41 id):
- section#p3Modes > h1#p3ModesTitle, #p3ModeGrid (4 adet button.card.p3-mode-card[data-mode=tutorial|level1|level2|free]). Her kartın içinde şunlar var: .p3-mode-badge, .p3-mode-title, .p3-mode-desc, .p3-mode-meta, .p3-mode-first (yalnız tutorial kartında, varsayılan hidden), .p3-mode-bar > .p3-mode-fill (genişlik inline style ile verilir), .p3-mode-action > .p3-mode-cta (metin) + ok ikonu. Menü altında #p3ResetProgress, "Eğitime dön" linki ve #p3Disclaimer var.
- main#p3Game[hidden] > .p3-game-taskbar. Taskbar içeriği:
  - #p3BackBtn
  - #p3ModeSeg (.seg, 4 adet .seg-btn[data-mode], aria-pressed)
  - #p3Progress (boşken gizli)
  - #p3TaskText (polite)
  - #p3HintBtn
  - #p3PresetSel (select.select, hidden)
  - #p3KbToggle (role=switch, aria-checked=true, hidden)
  - #p3ViewSeg (.seg-btn[data-view=full|pads|controls])
- #p3Stage (.p3-game-stage) > .p3-device-frame. Frame'in içinde sırayla şu kardeşler var: #p3DeviceWrap, svg#p3Live (viewBox 161 135 2116 1725, xMidYMid meet), canvas#p3LcdCanvas (960x160), #p3LcdLive (sr-only, polite), #p3HotspotLayer > #p3PadSurface (role=grid, boş), #p3Coach[hidden] > #p3CoachText + #p3CoachClose. Frame'in dışında, stage içinde .p3-attribution duruyor.
- .p3-game-bottom içinde:
  - #p3Feedback (assertive)
  - #p3ExplainPanel[hidden] > #p3ExplainText, #p3ContinueBtn
  - #p3TutPanel[hidden] > h2#p3TutTitle (tabindex=-1), #p3TutBody, #p3TutListen (boşken gizli), #p3TutPrev, #p3TutSkip, #p3TutToc, #p3TutFree, #p3TutNext
- Diğer katmanlar:
  - #p3Toc (.modal-overlay.p3-toc[hidden] > .modal.modal-lg > #p3TocClose, #p3TocTitle, ol#p3TocList)
  - #p3ResetModal[hidden] > #p3ResetCancel, #p3ResetConfirm
  - #p3Win[hidden] > #p3WinTitle, #p3WinText, #p3WinPrimary, #p3WinSecondary
  - #p3Toast (.toast-wrap, polite)

CSS sınıflarının anlamı:
- .p3-hotspot (absolute, pointer-events:auto) + .p3-hl (target/correct/wrong).
- .p3-hotspot[aria-disabled=true] gate için karartılır.
- .p3-hotspot.draggable ve .p3-enc: ns-resize imleci; .p3-enc'te 44 px ::after hit alanı var.
- .p3-hotspot, .p3-pad-surface, .p3-enc, .p3-strip ve .p3-jog enstrüman yüzeyidir: touch-action:none, callout yok, seçim yok.

Script'ler: i18n.js ve auth IIFE'den sonra 14 dosya README §C sırasıyla yükleniyor, her biri /assets/js/push3/X.js?v=20260925a. p3-selftest.js yüklenmiyor.

### Sapmalar
- EKLEME: #p3PadSurface kabukta boş bir div olarak #p3HotspotLayer içinde duruyor (role=grid, aria-label 'Pad ızgarası'). README §E bu id'yi katmanın içinde listeliyor, görev metni ise saymıyor. Satırları ve hücreleri JS kuracak. p3-device veya p3-input bu elemanı YENİDEN OLUŞTURMAMALI, getElementById ile bulup doldurmalı.
- EKLEME: §E dışında şu id'ler eklendi: #p3CoachText, #p3CoachClose (coach balonunda metin ve Kapat), #p3TocClose, #p3TocList (İçindekiler listesi), #p3ResetModal, #p3ResetTitle, #p3ResetCancel, #p3ResetConfirm (şartname §1 'onay .modal ile alınır' dediği için), #p3ModesTitle (aria-labelledby).
- EKLEME: global `html body [hidden] { display:none; }` kuralı. ui.css'teki .seg, html .btn, html .card ve html .modal-overlay display verdiği için, bu kural olmadan hidden özniteliği çalışmıyordu. Kuralın özgüllüğü (0,1,2) olduğu için !important gerekmiyor. Kırılım kuralları da :not([hidden]) ile yazıldı.
- SAPMA: Öğretici kartının meta satırı statik olarak '8 bölüm' yazıyor. README §F Faz 1'de 8 bölüm diyor, modulasyon bölümü de dahil. Şartnamedeki '7 bölüm · 47 adım' README ile çelişiyor. Adım sayısını p3-app, P3.tut.CURRICULUM'dan doldurmalı.
- SAPMA: '#p3Disclaimer' yalnız mod menüsünün (#p3Modes) altında görünüyor. Oyun ekranı tek ekran ve kaydırmasız olduğu için orada gösterilemiyor. Oyun ekranında yalnız Greg Hadala atfı (.p3-attribution) kalıyor.
- SAPMA: 'İlk kez mi? Buradan başla.' satırı (.p3-mode-first) varsayılan olarak hidden. Böylece geri dönen kullanıcıda bir an görünüp kaybolmuyor. İlk ziyarette p3-app'in göstermesi gerekiyor.
- EKLEME: ≥1024 px'te taskbar'a padding-right:200px verildi. themes.css'teki sabit #authBar taskbar'ın sağ üst köşesini örtüyordu; eski sayfada da bu çakışma vardı.
- EKLEME: Taskbar iki .p3-tb-group grubundan oluşuyor ve flex-wrap ile sarılıyor. 375 px'te araç düğmeleri ikinci satıra iniyor, yatay taşma yok (tarayıcıda ölçüldü). Görünümler: #p3ModeSeg yalnız ≥900 px'te, #p3ViewSeg yalnız <900 px'te görünüyor.
- EKLEME: keywords meta'sı yeni konumlandırmaya göre güncellendi. head sırası, asset'ler ve ?v= damgaları değişmedi, bunu test doğruladı.
- EKLEME: Durağan metinlere data-i18n='p3_*' anahtarları eklendi (README §A16). i18n.js'te bu anahtarlar yok; apply() eksik anahtarda hiçbir şey yapmadığı için TR metin olduğu gibi kalıyor. Dinamik alanlara (CTA, meta, task, progress, tut içerikleri) bilerek eklenmedi, yoksa dil değişince üzerlerine yazılırdı.
- SAPMA: Eski win kartındaki emoji (🎉) ve eski .p3-lcd, #p3Lcd, #p3RestartBtn, #p3WinCount kaldırıldı. .p3-hl'deki 3px radius 0'a indi (radius 0 kuralı). Hotspot hover rengi cihaz içi sabit hex #E6E6E6 (P3.K.C.white) oldu; tema token'ı kullanılmadı, çünkü cihaz açık temada da koyu kalıyor.
- EKLEME: Kimlik doğrulama için bir <noscript> uyarısı eklendi (JS gerektiği bilgisi).

### Diğer modüllere notlar
- p3-device: #p3DeviceWrap ve svg#p3Live aynı kutuyu dolduruyor (absolute inset:0, 100%x100%) ve ikisinde de preserveAspectRatio xMidYMid meet var. Enjekte edilen cihaz SVG'sine viewBox=P3.K.VB ve preserveAspectRatio='xMidYMid meet' verilirse #p3Live CTM hesabı olmadan kendiliğinden hizalanır. #p3HotspotLayer da inset:0 ile aynı kutuda. align() yalnız şunlara left/top/width/height vermeli: canvas#p3LcdCanvas (varsayılan absolute left:0 top:0), #p3PadSurface ve hotspot div'leri. Konum referansı .p3-device-frame (offsetParent). setView() iki SVG'nin viewBox'ını birlikte değiştirmeli.
- p3-device/p3-input: #p3PadSurface kabukta HAZIR olarak var (boş, role=grid). Yeni bir tane OLUŞTURMAYIN. getElementById ile alın, 8 role=row ve 64 gridcell'i içine koyun, konumunu align() ile verin. Hotspot div'lerine class 'p3-hotspot' verin, içine '.p3-hl' koyun (target/correct/wrong sınıfları CSS'te hazır). Encoder'lara ek olarak 'p3-enc' verin (ns-resize imleci ve 44 px hit alanı). Strip'e 'p3-strip', jog'a 'p3-jog' verin. Hepsinde touch-action:none var.
- p3-app gate: kilitli kontrolde hotspot'a aria-disabled='true' vermek yeterli; CSS karartmayı (%35 siyah ::before) ve not-allowed imlecini kendisi uyguluyor.
- p3-lcd: canvas#p3LcdCanvas'ın başlangıç width/height öznitelikleri 960x160. DPR'a göre backing boyutunu p3-lcd ayarlamalı. #p3LcdLive, class sr-only ve aria-live=polite ile hazır.
- p3-leds/p3-lcd: CSS yalnız hotspot animasyonlarını (p3TargetPulse ve flash'lar) prefers-reduced-motion ile kapatıyor. #p3Live ve canvas'taki blink/pulse için reduced-motion'ı JS tarafı matchMedia ile uygulamalı.
- p3-app: görünürlük hidden özniteliğiyle yönetilir. #p3Modes ve #p3Game'den biri görünür. #p3PresetSel ve #p3KbToggle varsayılan hidden (yalnız serbest modda açılır). #p3ViewSeg varsayılan görünür; CSS onu ≥900 px'te zaten gizliyor. #p3ModeSeg <900 px'te CSS ile gizli. Aktif seg düğmesine '.active' sınıfı ve aria-pressed='true' verilmeli. #p3KbToggle'ın aria-checked değeri prefs.kbOn ile eşitlenmeli.
- p3-app menuRender: kart elemanlarına '[data-mode=X] .p3-mode-cta|.p3-mode-meta|.p3-mode-fill(style.width)|.p3-mode-first(hidden)' ile ulaşılır. Serbest kartında .p3-mode-bar hidden. Sıfırlama akışı: #p3ResetProgress → #p3ResetModal.hidden=false → #p3ResetConfirm / #p3ResetCancel.
- p3-app: #p3Progress boşken CSS ile gizleniyor (:empty); serbest modda textContent='' yapmak yeterli. #p3Toast bir .toast-wrap; içine 'div.toast' ekleyin.
- p3-tutorial: #p3TutListen bir <p>; boşken CSS gizliyor. Adım değişince odağı #p3TutTitle'a taşıyın (tabindex=-1). İçindekiler için #p3Toc.hidden=false kullanın; liste #p3TocList (ol), kapatma #p3TocClose. Coach: #p3Coach.hidden=false, metin #p3CoachText, konum style.left/top (.p3-device-frame'e göre absolute), Kapat #p3CoachClose.
- p3-levels/p3-app: #p3Win içinde #p3WinTitle, #p3WinText, #p3WinPrimary ve #p3WinSecondary var ve boş. Göstermeden önce doldurun, kullanılmayan ikincil düğmeyi hidden yapın. Eski #p3RestartBtn ve #p3WinCount artık yok.
- Tüm modüller: mod menüsü dışında sayfa kaydırması yok (html body overflow:hidden). Alt panel (#p3TutPanel) en fazla 40dvh yüksekliğe çıkıyor ve kendi içinde kayıyor.