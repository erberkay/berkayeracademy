MENU: Öğretici (Önerilen) — Push 3'ü sıfırdan, adım adım öğren: 9 bölüm, 61 adım, yaklaşık 60 dakika. Her adımda neye basacağın söylenir, doğru yaptığında sıradaki adıma geçilir. Konular: nota çalmak, Scale, Wavetable ile ses tasarımı, davul programlama, kayıt ve Session. Bölümlere İçindekiler'den istediğin sırayla atlayabilirsin; ilerlemen tarayıcında saklanır.
MENU: Seviye 1 · Kontrolü Bul — Oyun: Push 3'ün 27 gerçek kontrolünü cihazın üstünde tek tek bul. Her doğru dokunuşta o düğmenin ne işe yaradığını öğrenirsin. Yaklaşık 5 dakika.
MENU: Seviye 2 · Görevler — 6 kısa görev: Tap Tempo ile 128 BPM tut, oktav değiştir, D Minor seç, swing ver, track'i sustur, kayda başla. Sonucu ekranda canlı görürsün. Yaklaşık 5 dakika.
MENU: Serbest Çal · Online Push 3 — Kural yok, ipucu yok. Wavetable synth ve davul setiyle Push 3'ü gerçek cihaz gibi çal, kaydet, sahneleri başlat. Scale menüsü, Repeat, Accent, Session ve bütün kontroller açık. Learn düğmesi seni öğreticiye geri götürür. Kulaklık önerilir.

## Bölüm 1: Pad'ler ve Note Mode — Push 3'ten ilk sesi çıkar. Volume'u ayarla, Note Mode'a geç, 64 pad'in nasıl dizildiğini ve her yerde çalışan akor şeklini öğren. Başlangıç durumu: Öğretici Seti, Wavetable track'i seçili, C Major, In Key, 4ths, Session Pad Mode (pad'ler sönük), Volume -10 dB.
1. Ekranın solundaki büyük Volume encoder'ına sadece dokun. Çevirme.
   hedef: Knob_9 (Volume Encoder)
   kosul: // Kısaltmalar (bütün adımlarda geçerli): state = emülatörün güncel durumu, base = adım başında alınan derin kopya, ev = adım başından beri gelen olaylar (pad:on/off, button:down/up, encoder:touch/turn, state, repeat:hit, clip:created), held = basılı nota kümesi, padNote(s,x,y) = Scale spesifikasyonundaki pad→MIDI formülü (x 0-7 soldan sağa, y 0-7 alttan üste)
ev.some(e => e.type === 'encoder:touch' && e.id === 'volume')
   aciklama: Encoder'a dokununca ekranda hangi çıkışın seçili olduğunu görürsün (Main Output). Push'un encoder'ları dokunmayı algılar.
2. Volume'u çevirip sesi en az 3 dB değiştir. Shift'i basılı tutarsan 0.1 dB'lik adımlarla ince ayar yaparsın.
   hedef: Knob_9 (Volume Encoder)
   kosul: Math.abs(state.volume.mainDb - base.volume.mainDb) >= 3
   aciklama: Her tık 1 dB. Kulağını yormayacak bir seviye bul, derslerin geri kalanı boyunca böyle kalsın.
3. Sağ taraftaki Note düğmesine bas. Session D-pad'in hemen altında, ızgara ikonlu düğme.
   hedef: LayoutScale → icon-big-pads (sol üst hücre, Note)
   kosul: state.padMode === 'note'
   aciklama: Note Mode'da pad'ler enstrüman gibi çalar. Session Mode'da ise clip başlatırlar.
4. Sol alttaki pad'e bas.
   hedef: PadButton_57 (pad x0,y0: sol alt)
   kosul: ev.some(e => e.type === 'pad:on' && e.x === 0 && e.y === 0 && e.note === 36)
   aciklama: Bu nota C1 (MIDI 36). Varsayılan dizilimde sol alt pad her zaman kök notadır.
5. Altın renkte (track rengi) yanan 3 farklı pad'e bas.
   hedef: PadButton..PadButton_64 (kök renkli pad'ler)
   kosul: new Set(ev.filter(e => e.type === 'pad:on' && e.note % 12 === state.scale.root).map(e => e.x + ',' + e.y)).size >= 3
   aciklama: Track renginde yanan pad'ler kök notadır (şu an C). Beyazlar gamdaki diğer notalar. Gam dışındaki notalar ızgarada hiç yok: buna In Key modu denir.
6. En alt sıradaki 8 pad'i soldan sağa sırayla çal.
   hedef: PadButton_57 … PadButton_64 (alt sıra, y=0)
   kosul: ev.filter(e => e.type === 'pad:on').slice(-8).map(e => e.note).join(',') === '36,38,40,41,43,45,47,48'
   aciklama: Do-re-mi-fa-sol-la-si-do. Sağa her adım gamdaki bir sonraki notadır.
7. Sol alt pad'e, sonra hemen üstündeki pad'e bas.
   hedef: PadButton_57 (x0,y0) → PadButton_49 (x0,y1)
   kosul: (function(){ var p = ev.filter(e => e.type === 'pad:on').slice(-2); return p.length === 2 && p[0].x === 0 && p[0].y === 0 && p[1].x === 0 && p[1].y === 1 && p[0].note === 36 && p[1].note === 41; })()
   aciklama: Bir sıra yukarı çıkmak dörtlü (4ths) yukarı çıkmak demek: C'den F'ye. Push'un varsayılan dizilimi budur.
8. Üç pad'e aynı anda bas ve basılı tut: sol alt pad, onun iki sağındaki pad ve bir yukarı-bir sağdaki pad. Fareyle tek pad'e basabilirsin; klavyede Z, C ve S tuşlarına birlikte bas ya da dokunmatik ekranda üç parmak kullan.
   hedef: PadButton_57 (x0,y0) + PadButton_59 (x2,y0) + PadButton_50 (x1,y1)
   kosul: [36, 40, 43].every(n => held.has(n))
   aciklama: Bu bir C majör akoru. Aynı üçgen şekli ızgaranın neresinde çalarsan çal majör akor verir. Push'ta akor çalmak bir şekli ezberlemek kadar kolay.

## Bölüm 2: Scale ve Kök Nota — Scale menüsünden kök notayı ve gamı değiştir, In Key, Chromatic ve Fixed arasındaki farkı duy. Başlangıç: C Major, In Key, Fixed kapalı, 4ths, Note Mode, Scale menüsü kapalı.
1. Scale düğmesine bas.
   hedef: LayoutScale → TextTransparentButton_11 (Scale, sol alt hücre)
   kosul: state.overlay === 'scale'
   aciklama: Ekranda kök notalar, gam listesi ve dizilim ayarı açıldı. Kısa basınca menü açılır veya kapanır. Basılı tutarsan menü sadece bastığın sürece açık kalır.
2. Ekranın üstündeki sırada 'D' yazan düğmeye bas. Soldan 4. düğme.
   hedef: SelectionButton_4 (üst ekran düğmesi 4)
   kosul: state.scale.root === 2
   aciklama: Üst sıra C G D A E B, alt sıra F B♭ E♭ A♭ D♭ G♭ diye gider; bu beşliler çemberidir. Seçili kök beyaz, diğerleri gri görünür.
3. Encoder 2'yi bir tık sağa çevirerek gamı Minor yap. İstersen Session D-pad'in aşağı okunu da kullanabilirsin.
   hedef: Knob_2 … Knob_7 (Encoder 2-7) veya Frame 35 (Session D-pad) alt ok
   kosul: state.scale.name === 'Minor'
   aciklama: Gam listesi Major, Minor, Dorian, Mixolydian… diye 35 gama kadar gider. D-pad'de yukarı ve aşağı bir adım, sağ ve sol dört adım atlar.
4. Scale'e tekrar basıp menüyü kapat, sonra sol alt pad'i çal.
   hedef: LayoutScale → TextTransparentButton_11 (Scale) + PadButton_57
   kosul: state.overlay === null && ev.some(e => e.type === 'pad:on' && e.x === 0 && e.y === 0 && e.note === 38)
   aciklama: Fixed kapalıyken sol alt pad her zaman kök notadır, şu an D1. Pad renkleri de yeni köke göre değişti. Artık D Minor'dasın.
5. Scale menüsünü aç ve sol alttaki ekran düğmesiyle Chromatic'e geç. Birkaç sönük pad çal, sonra aynı düğmeyle In Key'e dön.
   hedef: LayoutScale → TextTransparentButton_11 (Scale) + SelectionButton_9 (alt ekran düğmesi 1: In Key / Chromatic)
   kosul: ev.some(e => e.type === 'state' && e.path === 'scale.inKey' && e.value === false) && ev.some(e => e.type === 'pad:on' && !e.inScale) && state.scale.inKey === true
   aciklama: Chromatic'te 12 notanın hepsi ızgarada olur. Gam dışındaki pad'ler sönük görünür ama çalar. In Key sadece gamdaki notaları gösterdiği için yanlış nota çalmak imkânsızlaşır.
6. Scale menüsünde sağ alttaki ekran düğmesiyle Fixed'i aç. Menüyü kapat ve sol alt pad'i çal.
   hedef: SelectionButton_16 (alt ekran düğmesi 8: Fixed) + Scale + PadButton_57
   kosul: state.scale.fixed === true && state.overlay === null && ev.some(e => e.type === 'pad:on' && e.x === 0 && e.y === 0 && e.note === 36)
   aciklama: Fixed açıkken kök ne olursa olsun sol alt pad hep C kalır ve kök değişince pad'ler kaymaz. D Minor'da C notası olduğu için sol alt pad C1'dir. Gamda C yoksa en yakın gam notası gelir.

## Bölüm 3: Dizilim, Oktav ve Touch Strip — 4ths, 3rds ve Sequential dizilimlerini karşılaştır, Octave düğmeleriyle ızgarayı kaydır, Touch Strip ile pitch bend yap. Başlangıç: D Minor, In Key, Fixed kapalı, 4ths, Scale menüsü kapalı.
1. Scale menüsünü aç ve en soldaki encoder'ı (Encoder 1) çevirip 3rds'i seç. Sonra sol alt pad'i ve hemen üstündekini sırayla çal.
   hedef: Scale + Knob (Encoder 1: Layout) + PadButton_57 → PadButton_49
   kosul: state.scale.layout === '3rds' && (function(){ var p = ev.filter(e => e.type === 'pad:on').slice(-2); return p.length === 2 && p[0].x === 0 && p[0].y === 0 && p[1].x === 0 && p[1].y === 1; })()
   aciklama: Artık bir sıra yukarısı bir üçlü: D'den F'ye. Akorların notaları dikeyde üst üste gelir.
2. Encoder 1'i bir tık daha çevirip Sequential'ı seç. Alt sırayı soldan sağa, sonra ikinci sıranın ilk pad'ini çal.
   hedef: Knob (Encoder 1) + PadButton_57 … PadButton_64 + PadButton_49
   kosul: state.scale.layout === 'Sequential' && ev.some(e => e.type === 'pad:on' && e.x === 0 && e.y === 1)
   aciklama: Sequential'da notalar piyano gibi satır satır sıralanır ve her sıra alttakinin bittiği yerden devam eder.
3. Encoder 1 ile tekrar 4ths'e dön ve Scale'e basıp menüyü kapat.
   hedef: Knob (Encoder 1) + LayoutScale → TextTransparentButton_11 (Scale)
   kosul: state.scale.layout === '4ths' && state.overlay === null
   aciklama: 4ths Push'un varsayılanıdır: aynı akor ve gam şekli ızgaranın her yerinde çalışır. Dikkat: dizilim ayarı Layout düğmesinde değil, Scale menüsünde. Layout düğmesi 64 Notes ve Sequencer görünümleri arasında geçiş yapar.
4. Octave Up'a bir kez bas.
   hedef: Frame 34 üst üçgen (JogControls: Octave Up)
   kosul: padNote(state, 0, 0) === padNote(base, 0, 0) + 12
   aciklama: Bütün ızgara bir oktav yukarı kaydı, sol alt pad artık D2. Daha yukarı gidilemeyince Octave Up'ın ışığı söner.
5. Octave Down'a iki kez bas.
   hedef: Frame 34 alt üçgen (JogControls_2: Octave Down)
   kosul: padNote(state, 0, 0) === padNote(base, 0, 0) - 24
   aciklama: İki oktav aşağı indin. Shift basılıyken Octave'a basarsan ızgara oktav oktav değil, gamda bir nota kayar.
6. Bir pad'i basılı tutarken Touch Strip'te yukarı ya da aşağı kaydır. Fareyle yapıyorsan pad'i klavyeden tut (örneğin Z tuşu) ve strip'i fareyle sürükle.
   hedef: TouchSlider (Touch Strip) + herhangi bir pad
   kosul: held.size > 0 && state.strip.mode === 'pb' && Math.abs(state.strip.pb) >= 0.5
   aciklama: Touch Strip varsayılan olarak pitch bend yapar. Select'i basılı tutup strip'e dokunursan Mod Wheel'e geçer.

## Bölüm 4: Wavetable Osilatörleri — Device görünümünde Wavetable synth'in kalbini keşfet: Position ile dalgayı gezdir, tablo değiştir, ikinci osilatörü ve Sub'ı ekle, osilatör efektini dene. Başlangıç: Wavetable track'i, Mix görünümü, Wavetable init sesi (Osc 1 açık, Osc 2 ve Sub kapalı, Filter 1 Lowpass), C Major.
1. Device düğmesine bas. Ekranın sağ üstündeki dört düğmenin ilki, halka ikonlu.
   hedef: SessionSettings_2 → track (Device, 1. hücre)
   kosul: state.view === 'device' && base.view !== 'device'
   aciklama: Ekranda Wavetable'ın Main bankası açıldı: Oscillator, Table, Position, Filter Type, Frequency, Resonance, Mod Time, Mod Amt. Ekrandaki her parametreyi hemen üstündeki encoder kontrol eder.
2. Bir pad'i basılı tut ve Encoder 3 (Position) ile dalgayı baştan sona gezdir.
   hedef: Knob_3 (Encoder 3: Position) + herhangi bir pad
   kosul: ev.some(e => e.type === 'encoder:turn' && e.id === 'enc:3' && e.heldCount > 0) && Math.abs(state.wt.osc1.pos - base.wt.osc1.pos) >= 0.3
   aciklama: Nota aynı kalıyor, ses rengi değişiyor. Wavetable sentezi tam olarak bu: bir tablodaki dalgalar arasında gezinmek. Ekrandaki dalga çizimi de Position ile birlikte değişir.
3. Encoder 2 (Table) ile başka bir wavetable seç ve bir nota çal.
   hedef: Knob_2 (Encoder 2: Table) + herhangi bir pad
   kosul: state.wt.osc1.table !== base.wt.osc1.table && ev.some(e => e.type === 'pad:on' && e.t > tLast(ev, x => x.type === 'state' && x.path === 'wt.osc1.table'))
   aciklama: Her tablo ayrı bir dalga ailesidir. Tablo grupları (Category) arasında Oscillators bankasından geçebilirsin.
4. Ekranın üstünde 'Wavetable' yazan ilk düğmeye bas. Parametre bankaları alt sırada açılacak.
   hedef: SelectionButton (üst ekran düğmesi 1: cihaz adı)
   kosul: state.wt.bankView === true && state.wt.bank === 'Main'
   aciklama: Alt sırada artık track'ler yerine Wavetable'ın 8 bankası var: Main, Oscillators, Filters, Global, Envelopes, LFOs, Matrix, MIDI & MPE. Üst sırada da seçenek düğmeleri belirdi.
5. Encoder 1 (Oscillator) ile '2'yi seç. Sonra üst sıradaki 'Osc' düğmesiyle (soldan 2.) Osc 2'yi aç.
   hedef: Knob (Encoder 1: Oscillator) + SelectionButton_2 (üst ekran düğmesi 2: Osc)
   kosul: state.wt.oscSel === '2' && state.wt.osc2.on === true && base.wt.osc2.on === false
   aciklama: İki osilatör artık birlikte çalıyor. Bir osilatör kapalıyken Table, Position gibi kontrolleri ekranda gri görünür.
6. Alt sıradan Oscillators bankasını seç (soldan 2.). Encoder 5 (Pitch) ile Osc 2'nin perdesini biraz kaydır ve bir nota çal. Shift basılıyken ince ayar yaparsın.
   hedef: SelectionButton_10 (alt ekran düğmesi 2: Oscillators) + Knob_5 (Encoder 5: Pitch)
   kosul: state.wt.bank === 'Oscillators' && state.wt.oscSel === '2' && (state.wt.osc2.transp !== 0 || Math.abs(state.wt.osc2.detune) >= 0.1) && ev.some(e => e.type === 'pad:on')
   aciklama: İki osilatör arasındaki küçük bir detune sesi genişletir. 7 yarım ses bir beşli, 12 yarım ses bir oktav katmanı ekler.
7. Encoder 6 (Effect Type) ile Classic'i seç, Encoder 7 (Pulse Width) ile en az %30'a çıkar ve bir nota çal.
   hedef: Knob_6 (Encoder 6: Effect Type) + Knob_7 (Encoder 7: Pulse Width)
   kosul: state.wt.osc2.fxMode === 2 && state.wt.osc2.fx1 >= 0.3 && ev.some(e => e.type === 'pad:on')
   aciklama: Osilatör efektleri dalgayı büker. Classic'te Pulse Width ve Sync, Modern'de Warp ve Fold, FM'de Pitch ve Amount var. Efekt tipini değiştirsen de ayarların kaybolmaz.
8. Encoder 1 ile 'S'yi seç. Üst sıradaki 'Sub' düğmesiyle (soldan 2.) Sub'ı aç ve Encoder 2 (Gain) ile -3 dB'nin üstüne çıkar.
   hedef: Knob (Encoder 1) + SelectionButton_2 (üst ekran düğmesi 2: Sub) + Knob_2 (Encoder 2: Gain)
   kosul: state.wt.oscSel === 'S' && state.wt.sub.on === true && state.wt.sub.gain >= 0.708 // 0.708 ≈ -3 dB
   aciklama: Sub bir oktav aşağıya sade bir dalga ekleyip sesi kalınlaştırır. Tone %0'da saf sinüstür, Octave ayarıyla -1 veya -2 oktav seçilir.

## Bölüm 5: Wavetable Filtre ve Envelope — Filtreyle sesin parlaklığını, envelope ile zaman içindeki şeklini kontrol et; sonunda kısa bir pluck sesi kur. Başlangıç: Device görünümü, bank görünümü açık, Main bankası, Filter 1 Lowpass (Frequency 20.5 kHz, Resonance %0), Amp envelope varsayılan.
1. Bir pad'i basılı tutarken Encoder 5 (Frequency) ile filtreyi 500 Hz'in altına indir, sonra tekrar 5 kHz'in üstüne aç.
   hedef: Knob_5 (Encoder 5: Frequency) + herhangi bir pad
   kosul: ev.some(e => e.type === 'state' && e.path === 'wt.f1.freq' && e.value <= 500 && e.heldCount > 0) && state.wt.f1.freq >= 5000
   aciklama: Frequency (cutoff) düştükçe ses boğuklaşır, çünkü Lowpass filtre tizleri keser. Ekrandaki filtre eğrisi de değerle birlikte kayar.
2. Encoder 6 (Resonance) ile %50'nin üstüne çık, sonra Frequency'yi yeniden gezdir.
   hedef: Knob_6 (Encoder 6: Resonance) + Knob_5 (Encoder 5: Frequency)
   kosul: state.wt.f1.res >= 0.5 && freqRatioSince(ev, x => x.path === 'wt.f1.res' && x.value >= 0.5) >= 2 // Resonance %50'yi geçtikten sonra Frequency'nin max/min oranı en az 2 (bir oktav tarama)
   aciklama: Resonance, cutoff noktasının hemen çevresini öne çıkarır. Frequency'yi gezdirince tanıdık 'vuuu' sesi duyulur.
3. Alt sıradan Filters bankasını seç (soldan 3.). Encoder 3 (Type) ile Highpass'e geç ve dinle, sonra tekrar Lowpass'e dön.
   hedef: SelectionButton_11 (alt ekran düğmesi 3: Filters) + Knob_3 (Encoder 3: Type)
   kosul: state.wt.bank === 'Filters' && ev.some(e => e.type === 'state' && e.path === 'wt.f1.type' && e.value === 1) && state.wt.f1.type === 0
   aciklama: Highpass, Lowpass'in tersini yapar: basları keser ve sesi inceltir. Wavetable'daki filtre tipleri Lowpass, Highpass, Bandpass, Notch ve Morph.
4. Alt sıradan Envelopes bankasını seç (soldan 5.; Amp seçili kalsın). Encoder 3 (Attack) ile en az 500 ms yap ve bir nota çal.
   hedef: SelectionButton_13 (alt ekran düğmesi 5: Envelopes) + Knob_3 (Encoder 3: Attack)
   kosul: state.wt.bank === 'Envelopes' && state.wt.envSel === 'Amp' && state.wt.amp.a >= 0.5 && ev.some(e => e.type === 'pad:on' && e.t > tLast(ev, x => x.path === 'wt.amp.a'))
   aciklama: Attack, sesin sıfırdan tam seviyeye çıkana kadar geçen süredir. Uzun attack yavaşça açılan yumuşak pad sesleri verir. Ekranda dokunduğun envelope parçası vurgulanır.
5. Encoder 6 (Release) ile en az 1 saniye yap. Bir nota çal, bırak ve sesin sönüşünü dinle.
   hedef: Knob_6 (Encoder 6: Release) + herhangi bir pad
   kosul: state.wt.amp.r >= 1.0 && ev.some(e => e.type === 'pad:off' && e.t > tLast(ev, x => x.path === 'wt.amp.r'))
   aciklama: Release, pad'i bıraktıktan sonra sesin sönme süresidir. Uzun release notaların birbirine karışmasını sağlar.
6. Bir pluck sesi yap: Attack 10 ms veya daha kısa, Decay (Encoder 4) 300 ms veya daha kısa, Sustain (Encoder 5) en düşük değerde olsun. Sonra birkaç nota çal.
   hedef: Knob_3 (Attack) + Knob_4 (Decay) + Knob_5 (Sustain)
   kosul: state.wt.amp.a <= 0.01 && state.wt.amp.d <= 0.3 && state.wt.amp.sus <= 0.01 && ev.some(e => e.type === 'pad:on' && e.t > tLast(ev, x => x.path && x.path.indexOf('wt.amp.') === 0))
   aciklama: Kısa attack, kısa decay ve sıfır sustain: nota hemen vurur ve hemen söner. Pluck ve pek çok bas sesi bu şekilde kurulur.
7. (İleri, atlanabilir) Alt sıradan Main bankasına dön (soldan 1.). Encoder 5'e (Frequency) dokun, hemen ardından üst sıradaki 'Add to Matrix' düğmesine bas (en sağdaki). Açılan Matrix'te Encoder 7 (LFO 1) ile miktarı en az %30 yap ve bir nota çal.
   hedef: SelectionButton_9 (Main) + Knob_5 (dokun) + SelectionButton_8 (üst ekran düğmesi 8: Add to Matrix) + Knob_7 (Encoder 7: LFO 1)
   kosul: state.wt.bank === 'Matrix' && state.wt.modTarget === 'Flt 1 Freq' && Math.abs(state.wt.mods['Flt 1 Freq'].lfo1) >= 0.3 && ev.some(e => e.type === 'pad:on') // emülatör notu: fareyle kullanımda son dokunulan encoder bırakıldıktan sonra 2 sn boyunca 'dokunulu' sayılır, böylece Add to Matrix etkin kalır
   aciklama: LFO 1 artık filtreyi ritmik olarak açıp kapatıyor. Matrix'te her hedefe 3 envelope ve 2 LFO bağlanabilir. Back düğmesi seni önceki bankaya geri götürür.

## Bölüm 6: Davul ve Step Sequencer — Drums track'inde Loop Selector dizilimiyle 2 ölçülük bir beat programla: kick, snare, hi-hat, adım susturma, silme ve geri alma. Başlangıç: Device görünümü (alt sırada track'ler), Wavetable track'i seçili, transport durmuş, Drums track'inde boş clip; Kick = C1, Snare = D1, Closed Hat = F♯1, Open Hat = A♯1.
1. Alt ekran sırasından 'Drums' track'ini seç (soldan 2.).
   hedef: SelectionButton_10 (alt ekran düğmesi 2: Drums track'i)
   kosul: state.track === 1 && state.drumLayout === 'Loop Selector'
   aciklama: Pad'ler üç bölgeye ayrıldı: sol alt 4x4 davul pad'leri, üst 4 sıra 32 adımlık step sequencer, sağ alt 4x4 loop uzunluğu. Ses atanmış pad'ler track renginde, boş pad'ler gri yanar.
2. Sol alt bölgenin en alttaki ilk pad'ine, yani Kick'e bas.
   hedef: PadButton_57 (davul pad 1: Kick, C1)
   kosul: ev.some(e => e.type === 'pad:on' && e.padIndex === 0) && state.drums.selectedPad === 0
   aciklama: Kick çaldı ve seçildi; seçili pad beyaz yanar. Step sequencer bundan sonra bu sesi yazar.
3. Üst bölgede 1, 5, 9 ve 13. adımlara bas: üst sıranın 1. ve 5. pad'i, ikinci sıranın 1. ve 5. pad'i.
   hedef: PadButton, PadButton_5, PadButton_9, PadButton_13 (step 1, 5, 9, 13)
   kosul: [0, 4, 8, 12].every(s => state.drums.steps[0].has(s))
   aciklama: İlk adımı eklediğin anda çalma başladı. Her adım varsayılan olarak 1/16 uzunluğunda, yani 32 adım 2 ölçü eder. Yeşil ilerleyen pad çalma imleci (playhead).
4. Snare pad'ini seç (sol alt bölgede alt sıranın 3. pad'i) ve 5. ile 13. adımlara koy.
   hedef: PadButton_59 (davul pad 3: Snare) + PadButton_5, PadButton_13
   kosul: state.drums.selectedPad === 2 && state.drums.steps[2].has(4) && state.drums.steps[2].has(12)
   aciklama: Adıma basmak sadece seçili pad'in notasını ekler veya siler. Kick adımlarına dokunulmadı, iki ses aynı adımda üst üste çalabilir.
5. Select'i basılı tut ve Closed Hat pad'ine bas (sol alt bölgede ikinci sıranın 3. pad'i). Pad ses çıkarmadan seçilir.
   hedef: NoteSelection → Select (sağ yarı) + PadButton_51 (davul pad 7: Closed Hat)
   kosul: state.drums.selectedPad === 6 && !ev.some(e => e.type === 'pad:on' && e.padIndex === 6 && e.sounded === true)
   aciklama: Select ile bir pad'i çalmadan seçebilirsin. Beat çalarken sessizce ses değiştirmek için çok kullanışlı.
6. Hi-hat'i iki adımda bir koy (1, 3, 5, 7…). En az 6 adım olsun.
   hedef: Üst 4 sıra step pad'leri (PadButton … PadButton_32)
   kosul: state.drums.steps[6].size >= 6
   aciklama: Artık tam bir ritim var. Nota olan adımlar clip renginde yanar; velocity yükseldikçe renk parlaklaşır.
7. Mute'u basılı tut ve hi-hat adımlarından birine dokun.
   hedef: SessionSettings_3 → mute (3. hücre) + bir hi-hat step pad'i
   kosul: Array.from(state.drums.mutedSteps).some(k => k.pad === 6)
   aciklama: Adım silinmedi, sadece susturuldu ve clip renginin açık tonunda görünüyor. Aynı kombinasyonla tekrar açabilirsin.
8. Delete'i basılı tut ve Snare pad'ine bas: bütün snare adımları silinir. Sonra Undo'ya basıp geri getir.
   hedef: LoopingSection → TextTransparentButton_10 (Delete) + PadButton_59 (Snare) + TextButton_2 (Undo)
   kosul: base.drums.steps[2].size > 0 && ev.some(e => e.type === 'state' && e.path === 'drums.steps.2.size' && e.value === 0) && state.drums.steps[2].size === base.drums.steps[2].size
   aciklama: Delete + pad, o pad'in bu clip'teki bütün notalarını siler. Pad'in hiç notası yoksa pad'deki sesi siler, dikkatli ol. Undo son işlemi geri alır, Shift + Undo ise Redo yapar.

## Bölüm 7: Repeat, Accent ve Swing — Note Repeat ile hi-hat ruloları çal, Accent ile tam güçte vur, Swing ile ritme groove kat. Başlangıç: Drums track'i, 4/4 kick pattern'i çalıyor, Repeat kapalı (hız 1/8), Accent kapalı, Swing %0, Swing and Tempo encoder'ı Tempo modunda.
1. Repeat düğmesine kısa bas.
   hedef: RepeatAccent → Repeat (sol yarı, TextTransparentButton_5)
   kosul: state.repeat.on === true && ev.some(e => e.type === 'button:up' && e.id === 'repeat' && e.heldMs < 300)
   aciklama: Kısa basış Repeat'i açık bırakır (latch) ve düğme nabız gibi yanıp söner. Sağdaki sütunda seçili tekrar hızı (1/8) yeşil yanar.
2. Closed Hat pad'ini 2 saniye basılı tut.
   hedef: PadButton_51 (Closed Hat)
   kosul: ev.filter(e => e.type === 'repeat:hit' && e.note === 42).length >= 6
   aciklama: Pad basılı kaldıkça nota tempoya kilitli şekilde tekrar eder, parmağını kaldırınca durur.
3. Sağdaki sütundan 1/16'yı seç (yukarıdan 4. düğme) ve hi-hat'i yine basılı tut.
   hedef: SideButton_4 (1/16) + PadButton_51
   kosul: state.repeat.rate === '1/16' && ev.filter(e => e.type === 'repeat:hit' && e.note === 42 && e.rate === '1/16').length >= 8
   aciklama: Sağ sütun yukarıdan aşağıya 1/32t, 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4 diye sıralanır. 't' triplet (üçleme) demek; trap hi-hat ruloları için 1/32t'yi dene.
4. Tap Tempo'nun hemen üstündeki Swing and Tempo encoder'ına bas ve Swing moduna geç. Çevirip %60 yap, sonra hi-hat'i basılı tutup farkı dinle.
   hedef: Knob_10 (Swing and Tempo Encoder: bas, sonra çevir) + PadButton_51
   kosul: state.swingTempoTarget === 'Swing' && Math.abs(state.swing - 60) <= 1 && ev.some(e => e.type === 'repeat:hit' && e.t > tLast(ev, x => x.path === 'swing'))
   aciklama: Swing, arka vuruşları biraz geciktirip ritme sallantı verir. Push'ta swing her notaya değil, sadece Repeat ile çalınan ve Quantize ile hizalanan notalara uygulanır.
5. Repeat'e basıp kapat. Accent'e kısa bas, sonra bir pad'e çok hafif dokun.
   hedef: RepeatAccent → Accent (sağ yarı, TextTransparentButton_6) + herhangi bir davul pad'i
   kosul: state.accent.on === true && ev.some(e => e.type === 'pad:on' && e.velocity === 127 && e.t > tLast(ev, x => x.type === 'button:down' && x.id === 'accent'))
   aciklama: Accent açıkken çaldığın ya da step'e yazdığın her nota 127 velocity ile, yani tam güçte çıkar.
6. Accent'i basılı tut, bir pad çal ve Accent'i bırak. Accent kendiliğinden kapanır.
   hedef: RepeatAccent → Accent (sağ yarı) + herhangi bir davul pad'i
   kosul: // stepSetup: state.accent.on = false
ev.some(e => e.type === 'button:up' && e.id === 'accent' && e.heldMs >= 300) && ev.some(e => e.type === 'pad:on' && e.velocity === 127) && state.accent.on === false
   aciklama: Basılı tutunca Accent geçici (momentary) çalışır, tek bir vuruşu vurgulamak için idealdir. Repeat de aynı kısa bas / basılı tut mantığıyla çalışır.

## Bölüm 8: Kayıt ve Clip — Metronome ve Tap Tempo ile tempoyu tut, Wavetable ile bir melodi kaydet, üstüne ekle, Quantize ile hizala ve Capture ile kaçırdığın fikri yakala. Başlangıç: Wavetable track'i, Note Mode, 64 Notes, C Major, transport durmuş, clip yok, Metronome kapalı, 120 BPM, count-in yok.
1. Metronome'u aç. Tap Tempo'nun altındaki, iki daire ikonlu düğme.
   hedef: Tempo → IconTransparentButton (Metronome)
   kosul: state.metronome === true
   aciklama: Metronome açıkken düğme nabız gibi yanar. Basılı tutarsan count-in, klik sesi (Classic, Click, Wood) ve ölçü ayarları açılır.
2. Tap Tempo'ya düzenli aralıklarla 4 kez bas.
   hedef: Tempo → TextTransparentButton (Tap Tempo)
   kosul: ev.filter(e => e.type === 'button:down' && e.id === 'tapTempo').length >= 4 && state.transport.playing === true
   aciklama: 4/4'te dört dokunuş, çalmayı dokunduğun tempoda başlatır. Tempoya ince ayar yapmak için Swing and Tempo encoder'ını kullan (Shift ile 0.1 BPM).
3. Record'a bas ve en az 4 nota çal.
   hedef: RecordControls → TransparentBigButton_4 (Record) + pad'ler
   kosul: state.transport.recording === true && state.clips[0][state.selectedSlot] && state.clips[0][state.selectedSlot].notes.length >= 4
   aciklama: Record kırmızı yandı, çaldığın her nota yeni clip'e yazılıyor. Note Mode'da bir MIDI track seçtiğinde track kayda otomatik hazırlanır (arm).
4. Record'a tekrar bas.
   hedef: RecordControls → TransparentBigButton_4 (Record)
   kosul: state.transport.recording === false && state.transport.playing === true && state.clips[0][state.selectedSlot].playing === true
   aciklama: İkinci basış kaydı durdurur ama clip döngüde çalmaya devam eder. Kaydettiğin melodiyi dinle.
5. Record'a bir kez daha bas (overdub) ve 2 nota daha ekle.
   hedef: RecordControls → TransparentBigButton_4 (Record) + pad'ler
   kosul: ev.some(e => e.type === 'transport' && e.overdub === true) && state.clips[0][state.selectedSlot].notes.length >= base.clips[0][state.selectedSlot].notes.length + 2
   aciklama: Üçüncü basış overdub'ı açar: clip çalarken üstüne yazarsın ve eski notalar silinmez. Sonraki basışlar çalma ile overdub arasında gidip gelir.
6. Quantize'a bas. Notalar en yakın 1/16 çizgisine oturacak.
   hedef: Tempo → TextTransparentButton_2 (Quantize)
   kosul: ev.some(e => e.type === 'button:down' && e.id === 'quantize') && state.clips[0][state.selectedSlot].notes.every(n => Math.abs(n.start * 4 - Math.round(n.start * 4)) < 1e-6) // n.start beat cinsinden
   aciklama: Quantize açılıp kapanan bir ayar değil, bir işlem düğmesi: her basışta notaları grid'e çeker. Basılı tutarsan Quantize To, Quantize Amount, Swing ve kayıt sırasında otomatik hizalama (Rec. Quantize) ayarları açılır.
7. Record'a basıp overdub'ı kapat (kırmızı söner). Kayıt yapmadan birkaç nota çal, sonra Capture'a bas; Record'un hemen üstündeki düğme.
   hedef: RecordControls → TransparentBigButton_3 (Capture) + pad'ler
   kosul: state.transport.overdub === false && ev.some(e => e.type === 'clip:created' && e.via === 'capture' && e.noteCount >= 3)
   aciklama: Capture, Record'a basmadan çaldıklarını yakalayıp yeni bir clip'e yazar ve hemen çalar. 'Keşke kaydetseydim' dediğin anlar için var.

## Bölüm 9: Session: Clip ve Sahneler — Session Mode'da clip'leri ve sahneleri başlatıp durdur, bir şarkıyı parça parça kurmanın mantığını gör. Başlangıç: 1. sahnede Wavetable ve Drums clip'leri, 2. sahnede ikisinin varyasyonları, transport durmuş, Note Mode.
1. Session düğmesine bas. Note düğmesinin sağındaki, dikey çizgi ikonlu düğme.
   hedef: LayoutScale → icon-big-tracks (sağ üst hücre, Session Pad Mode)
   kosul: state.padMode === 'session'
   aciklama: Session Mode'da her sütun bir track, her satır bir sahne, her pad bir clip'tir. Dolu slotlar clip renginde, boş slotlar sönük görünür.
2. Sol üstteki pad'e bas (Wavetable track'i, 1. sahne).
   hedef: PadButton (sütun 1, sahne 1)
   kosul: state.clips[0][0].playing === true
   aciklama: Pad önce yeşil yanıp söner, yani sırada bekler; ölçü başında çalmaya başlar. Bir track'te aynı anda sadece tek clip çalabilir.
3. Aynı sütunda boş bir pad'e bas.
   hedef: Sütun 1'deki boş pad'ler (PadButton_17, PadButton_25, … PadButton_57)
   kosul: ev.some(e => e.type === 'pad:on' && e.track === 0 && e.emptySlot === true) && state.clips[0].every(c => !c || !c.playing)
   aciklama: Session'da boş bir pad'e basmak o track'i durdurur. Clip silinmez, sadece durur.
4. Sağdaki sütundan 2. sahne düğmesine bas (yukarıdan 2.).
   hedef: SideButton_2 (sahne 2)
   kosul: [0, 1].every(t => state.clips[t][1] && state.clips[t][1].playing === true)
   aciklama: Session Mode'da sağdaki düğmeler sahne başlatır: o satırdaki bütün clip'ler birlikte çalar. Note Mode'da aynı düğmeler tekrar hızını ve step çözünürlüğünü seçer.
5. Shift'i basılı tut ve Stop Clip'e bas.
   hedef: NoteSelection → Shift (sol yarı) + SessionSettings_3 → sqaure (Stop Clip, 2. hücre)
   kosul: ev.some(e => e.type === 'button:down' && e.id === 'stopClip' && e.shift === true) && state.clips.every(tr => tr.every(c => !c || !c.playing))
   aciklama: Shift + Stop Clip bütün clip'leri durdurur. Tebrikler: Push 3'ün temel iş akışını baştan sona kullandın. Şimdi Serbest Çal'da kendi döngünü kurabilirsin.