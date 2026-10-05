/* be-assistant-kb.js — Ders Paneli asistanının BİLGİ TABANI (window.beAssistantKB).
   Kurallar ve rakamlar booking.html'den alınmıştır; değişirse ikisi birlikte güncellenir:
   - fiyatlar: LESSON_PRICE / LESSON_PRICE_SINGLE / PACKAGES (arayüz bunları sayfadan okur → {price} …)
   - saat değiştirme: SELF_RESCHED_MIN_MS (5 sa), aynı Pzt–Paz haftası, ders başına bir kez, ücretsiz
   - erteleme: N aylık paket = N hak (havuz), ≥24 sa önce (MIN_LEAD_MS), Berkay Er onaylar, ek hak 500 TL
   - Derse Katıl: 15 dk önce (BK_JOIN_MS) · ders 60 dk · onay/itiraz penceresi 48 sa (BK_CFM_WINDOW_MS)
   - kurallar: RULES_CONSENT_ITEMS (geç kalma 10 dk, devamsızlık, telif, iptal/devir yok)
   - IBAN / banka: "Yapman gereken" kartı ve showExtraCreditModal ile aynı
   Niyet alanları:
     id      benzersiz kimlik            ex  { tr:[…], en:[…] } örnek sorular (her biri en az 8)
     a       cevap şablonu: { tr, en } ya da varyant dizisi [{ if:'bayrak !bayrak', tr, en }]
             {yer_tutucu} bağlamdan dolar (be-assistant-ui.js → buildContext); dolmayan varyant atlanır
     actions [{ do, label:{tr,en}, if?, … }] cevabın altındaki düğmeler
     pub     giriş yapmamış ziyaretçiye de cevaplanır     states  öne çıktığı öğrenci durumları
     topic   takip sorularında ("peki kaç tane?") taşınan konu belirteçleri   follow  tercih edilen sonraki niyetler
     kw      ek anahtar kelimeler
     need    bu kavram/köklerden en az biri soruda yoksa puan ve kapsam düşer ("talebim onaylandı mı"da
             "ertele" yok → erteleme durumu değil)
     avoid   bunlardan biri soruda varsa başka konudur, puan ve kapsam düşer ("talebimi iptal" → iptal politikası değil)
     strong  bu kavram geçerse niyet kesin konu (korsan yazılım isteği her zaman reddedilir); geçmezse
             niyet "Bunu mu demek istedin?" seçeneklerine girmez
     label   { tr, en } seçenek düğmesinde görünen soru (yoksa örneklerden biri)
   Eş anlamlar (SYN): çok kelimeli ifade her kelimeye ek alabilir; tek kelime kökle eşlenir; "=kelime"
   yalnız o biçimle başlayan kelimeyle, "=kelime$" tam olarak o kelimeyle eşlenir (kökü başka fiillerle
   çakışanlar için). Satırın üçüncü alanı 'flag' ise kavram eşleşmede belirteç olmaz, yalnız need/avoid
   ve cevap bayrağı için işaret olur (@oneri → "en iyi kulaklık" "en iyi paket" örneğine benzemesin).
   Soruya bağlı cevap bayrakları (arayüz koyar): qProd (prodüksiyon sorusu), qOneri (marka/model önerisi).
   Metin işaretlemesi: **kalın**, satır başı "- " madde, boş satır paragraf (arayüz güvenli çizer). */
(function (root) {
  'use strict';

  var FACTS = {
    bank: `Garanti Bankası`,
    ibanName: `Muhammet Berkay Er`,
    iban: `TR35 0006 2000 6870 0006 8982 06`,
    ibanRaw: `TR350006200068700006898206`,
    wa: `905523070067`,          // .wa-fab ile aynı (arayüz önce sayfadaki bağlantıyı okur)
    waDisplay: `+90 552 307 00 67`,
    extraCreditPrice: 500,
    selfChangeH: 5, reschH: 24, joinMin: 15, lessonMin: 60, cfmH: 48, lateMin: 10, trialMinDays: 3,
  };

  // [kavram, [ifadeler]] — çok kelimeli ifadeler normalleştirilmiş metinde (her kelimeye ek gelebilir),
  // tekler kök düzeyinde eşlenir. "=" ile başlayan tek kelime yalnız yazıldığı biçimin başıyla eşlenir:
  // kökü başka fiillerle çakışanlar için ("=yazıyor" → "yaz-" fiilinin her biçimi değil).
  var SYN = [
    ['zoom', [`zoom`, `link`, `linki`, `bağlantı`, `toplantı`, `meeting`, `görüşme linki`, `ders linki`, `zum`]],
    ['katil', [`katıl`, `katılmak`, `derse gir`, `derse gire`, `derse bağlan`, `join`, `derse katıl`, `zoom gir`, `linke gir`, `linke tıkla`, `önce gir`, `ders gir`]],
    ['ertele', [`ertele`, `erteleme`, `ertelemek`, `ötele`, `kaydır`, `hafta ileri`, `hafta sonraya`, `sonraya al`, `başka hafta`, `diğer hafta`, `öbür hafta`, `haftaya al`, `haftaya at`, `haftaya kaydır`, `haftaya ertele`, `postpone`, `reschedule`, `push back`]],
    ['degis', [`çek`, `çekmek`, `öne al`, `değiştir`, `değiştirmek`, `değişiklik`, `taşı`, `taşımak`, `başka saate`, `başka güne`, `saatini değiştir`, `saat değiştir`, `saat ileri`, `saat geri`, `saat öne`, `oynat`,
      `pazartesiye al`, `salıya al`, `çarşambaya al`, `perşembeye al`, `cumaya al`, `cumartesiye al`, `pazara al`, `akşama al`, `sabaha al`, `öğlene al`, `güne al`, `saate al`, `change`, `move`, `switch`]],
    ['hak', [`hak`, `hakkı`, `hakkım`, `haklarım`, `kredi`, `credit`, `credits`, `erteleme hakkı`]],
    ['odeme', [`ödeme`, `öde`, `ödemek`, `ödedim`, `ödeyeceğim`, `pay`, `payment`, `paid`, `ödemeyi yaptım`, `para gönder`, `parayı gönder`, `para at`, `parayı at`, `para yatır`, `parayı yatır`, `parayı yolla`, `=yatır`, `havale yap`, `havale at`, `havaleyi yap`, `eft yap`, `eft at`]],
    ['iban', [`iban`, `havale`, `eft`, `hesap numarası`, `banka`, `hesap bilgisi`, `bank`, `transfer`]],
    ['fiyat', [`fiyat`, `ücret`, `ücreti`, `kaç para`, `kaç tl`, `kaç lira`, `ne kadar tutar`, `tl`, `lira`, `price`, `cost`, `fee`, `tutar`, `pahalı`, `=ücretli`, `=paralı`]],
    ['satinal', [`satın al`, `satın alma`, `para ver`, `para öde`, `parasını öde`, `ücretini öde`, `=parayla`, `=parası`, `=ücretli`, `buy`, `purchase`]],
    ['indirim', [`indirim`, `indirimli`, `kampanya`, `kampanyalı`, `discount`, `ucuz`, `avantajlı`, `uygun fiyat`, `en uygun`]],
    ['paket', [`paket`, `kampanya`, `package`, `bundle`, `aylık plan`, `plan`, `=aylık`]],
    ['deneme', [`deneme`, `deneme dersi`, `trial`, `ücretsiz ders`, `bedava ders`, `tanışma`]],
    ['seviye', [`seviye`, `seviye belirleme`, `sınav`, `test`, `quiz`, `level`, `placement`]],
    ['iptal', [`iptal`, `cancel`, `iade`, `refund`, `geri ödeme`, `paramı geri`, `vazgeç`, `bırakmak istiyorum`, `dersleri bırak`, `paketi bırak`]],
    ['dondur', [`dondur`, `dondurmak`, `ara ver`, `ara vermek`, `freeze`, `pause`, `tatil`, `tatile`, `askıya al`]],
    ['kural', [`kural`, `kurallar`, `rules`, `=şartlar`, `koşul`, `politika`, `policy`]],
    ['gerekli', [`=gerekli`, `=gerekiyor`, `=gerekir`, `=lazım`, `şart mı`, `=zorunlu`, `=zorunda`, `=mecbur`, `need`, `required`, `must`]],
    ['sample', [`sample`, `sampler`, `preset`, `serum`, `drive`, `ses paketi`, `pack`, `samples`, `presets`]],
    ['plugin', [`plugin`, `plug-in`, `vst`, `eklenti`, `plugins`, `au`]],
    ['kurulum', [`kur`, `kurmak`, `kurulum`, `install`, `yükle`, `yüklemek`, `setup`, `nasıl kurulur`]],
    ['whatsapp', [`whatsapp`, `whatsap`, `vatsap`, `wp`, `wa`, `watsap`]],
    ['iletisim', [`iletişim`, `iletişime geç`, `ulaş`, `ulaşmak`, `contact`, `reach`, `berkay yaz`, `berkaya yaz`, `hocaya yaz`, `size yaz`, `mesaj yaz`, `konuşmak`, `mesaj atmak`]],
    ['onay', [`onay`, `onayla`, `onaylandı`, `onaylanır`, `confirm`, `approve`, `approved`, `kabul`]],
    ['itiraz', [`itiraz`, `sorun bildir`, `şikayet`, `dispute`, `complain`, `=yapılmadı`, `=yapılmamış`, `ders olmadı`, `hoca gelmedi`, `berkay gelmedi`, `=gelmedi$`, `=girmedi$`, `=katılmadı$`, `yarım kaldı`, `didn't happen`]],
    ['gec', [`geç kal`, `geç kalırsam`, `geç girersem`, `gecikme`, `gecikeceğim`, `late`, `rötar`]],
    ['hasta', [`grip`, `ateş`, `ateşim`, `covid`, `korona`, `hastalandım`, `hastane`, `doktor`, `hasta`, `hastayım`, `mazeret`, `rahatsız`, `acil durum`, `acil bir`, `acil iş`, `=acilen`, `işim çıktı`, `sick`, `ill`, `emergency`, `cenaze`, `ameliyat`]],
    ['sonraki', [`önümüzdeki`, `bir dahaki`, `=sonraki`, `sıradaki`, `bir sonraki`, `yaklaşan`, `gelecek ders`, `next`, `upcoming`, `ilk dersim`]],
    ['sifre', [`şifre`, `parola`, `password`, `giriş yap`, `giriş yapamıyorum`, `=giriş`, `login`, `oturum`, `sign in`, `log in`, `google ile`, `gmail ile`, `apple ile`, `instagram gir`, `instagram aç`, `instagram içinden`, `tiktok gir`, `tiktok aç`, `uygulama içi`, `hesaba gir`, `hesabıma gir`, `siteye gir`, `panele gir`, `e-posta ile gir`, `mail ile gir`]],
    ['dil', [`dil`, `ingilizce`, `english`, `türkçe`, `language`, `turkish`]],
    ['ses', [`duy`, `duymuyor`, `işitmiyor`, `hear`, `ses`, `mikrofon`, `hoparlör`, `kulaklık`, `audio`, `sound`, `mic`, `duyamıyor`, `duyamıyorum`]],
    ['kamera', [`kamera`, `=görüntü`, `camera`, `webcam`, `ekran paylaş`, `screen share`]],
    ['ableton', [`ableton`, `live`, `daw`, `sürüm`, `versiyon`, `version`, `suite`, `standard`, `intro`, `lisans`]],
    ['daw', [`daw`, `fl studio`, `=fl`, `logic`, `logic pro`, `cubase`, `reaper`, `bitwig`, `pro tools`, `garageband`, `studio one`, `başka program`, `başka daw`]],
    ['donanim', [`push`, `controller`, `kontrolcü`, `launchpad`, `midi klavye`, `midi controller`, `ses kartı`, `monitör`, `ekipman`, `donanım`, `hardware`, `equipment`]],
    ['lab', [`lab`, `laboratuvar`, `ableton lab`, `laboratory`]],
    ['odev', [`ödev`, `homework`, `pratik`, `alıştırma`, `assignment`, `hazırlık`]],
    ['ekders', [`ek ders`, `ekstra ders`, `fazladan ders`, `extra lesson`, `bir ders daha`, `ilave ders`, `fazladan bir ders`]],
    ['ek', [`=ek`, `ekstra`, `fazladan`, `ilave`, `bir tane daha`, `bir adet daha`, `one more`, `extra`, `additional`]],
    ['bitis', [`bitiyor`, `biter`, `bitecek`, `bitti`, `son ders`, `sona eriyor`, `bitiş`, `end`, `ends`, `expire`]],
    ['bekle', [`bekliyor`, `bekleme`, `beklemede`, `=bekleniyor`, `ne zaman onaylanır`, `pending`, `waiting`]],
    ['talep', [`talep`, `başvuru`, `istek`, `request`, `form`]],
    ['red', [`=red`, `=reddedil`, `=reddet`, `kabul edilmedi`, `rejected`, `declined`]],
    ['aynihafta', [`aynı hafta`, `aynı haftada`, `aynı hafta içinde`, `same week`, `başka güne`, `başka bir güne`]],
    ['alan', [`=kısım`, `=kısmı`, `=kısmına`, `=bölüm`, `=bölümü`, `=alan`, `=alanı`, `=alanına`, `=kutu`, `=kutusu`, `field`, `section`]],
    ['yakin', [`saat kaldı`, `saat var`, `saat kala`, `son dakika`, `az kaldı`, `birkaç saat`, `hours left`, `last minute`, `bugünkü ders`, `bu akşamki`, `bu akşam ders`, `bugün akşam`]],
    ['hatirlat', [`hatırlat`, `hatırlatma`, `hatırlatıcı`, `bildirim`, `reminder`, `notification`, `uyarı mesajı`]],
    ['saatdilimi', [`istanbul saati`, `saat dilimi`, `türkiye saati`, `timezone`, `time zone`, `yurt dışı`, `yurtdışı`, `utc`]],
    ['kapali', [`kırmızı`, `kapalı`, `=dolu`, `seçilemiyor`, `seçemiyorum`, `seçilmiyor`, `seçemedim`, `müsait değil`, `boş saat yok`]],
    ['site', [`sayfa`, `site`, `web sitesi`, `tarayıcı`, `browser`, `safari`, `chrome`, `mobil`, `=telefondan`, `=telefonda`, `page`, `website`]],
    ['bozuk', [`bozuk`, `=bozul`, `hata`, `error`, `=çöktü`, `=donuyor`, `=dondu`, `=donmuş`, `yuklen`, `açılmıyor`, `=açılmadı`, `=kayıyor`, `beyaz ekran`, `bembeyaz`, `=takılıyor`, `=takıldı`, `yavaş`, `düzgün görünmüyor`, `düzgün gözükmüyor`, `crash`, `broken`, `loading`]],
    ['yaziyor', [`=yazıyor`, `=diyor`, `=gözüküyor`, `=görünüyor`, `=gösteriyor`, `=çıkıyor`, `says`, `shows`]],
    ['yanlislik', [`yanlışlıkla`, `kazara`, `sehven`, `by mistake`, `accidentally`]],
    ['kilit', [`kilitli`, `kilit`, `pasif`, `basamıyorum`, `tıklanmıyor`, `açılmadı`, `locked`, `disabled`]],
    ['kacir', [`kaçır`, `kaçırdım`, `=gelmezsem`, `=katılmazsam`, `=girmezsem`, `=gelemedim`, `=giremedim`, `=katılamadım`, `=unuttum`, `=unutmuşum`, `no show`, `missed`, `miss`]],
    ['gun', [`pazartesi`, `salı`, `çarşamba`, `perşembe`, `cuma`, `cumartesi`, `pazar`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`]],
    ['gecmis', [`geçmiş`, `=geçen`, `önceki`, `=eski`, `biten`, `bitmiş`, `past`, `previous`]],
    ['gunvakti', [`sabah`, `öğlen`, `öğleden sonra`, `akşam`, `gece`, `morning`, `evening`, `night`]],
    ['oneri', [`en iyi`, `en iyisi`, `tavsiye`, `öneri`, `önerir misin`, `önerirsin`, `hangi marka`, `marka`, `model öner`, `recommend`, `best`], 'flag'],
    ['korsan', [`crack`, `=crackli`, `=cracked`, `korsan`, `warez`, `keygen`, `torrent`, `kırık program`, `=kırık`, `bedava indir`, `ücretsiz indir`, `full indir`]],
    ['produksiyon', [`kick`, `bass`, `snare`, `hihat`, `hi hat`, `sidechain`, `kompresör`, `compressor`, `eq`, `ekolayzır`, `equalizer`, `limiter`, `reverb`, `delay efekti`, `mix`, `mixing`, `miks`, `master`, `mastering`,
      `supersaw`, `wavetable`, `sound design`, `ses tasarımı`, `melodi`, `akor`, `groove`, `drop`, `arpej`, `otomasyon`, `automation`, `vokal`, `vocal`, `distortion`, `saturation`, `lfo`, `filtre`, `=parçamı`, `=parçam`, `=projemi`, `=projem`, `=şarkımı`]],
  ];

  var A = function (tr, en, cond) { var o = { tr: tr, en: en }; if (cond) o.if = cond; return o; };
  var L = function (tr, en) { return { tr: tr, en: en }; };
  var ACT = {
    week: { do: 'scroll', target: '#derslerim', label: L(`Bu haftaki derslerim`, `This week's lessons`), if: 'dash' },
    list: { do: 'scroll', target: '#lessonList', label: L(`Tüm derslerimi göster`, `Show all my lessons`), if: 'dash' },
    selfchange: { do: 'selfchange', label: L(`Saat seçiciyi aç`, `Open the time picker`), if: 'anyChange' },
    resch: { do: 'resched', label: L(`Ertele penceresini aç`, `Open reschedule`), if: 'canResch' },
    credits: { do: 'scroll', target: '#creditBadge', open: true, label: L(`Erteleme hakkı kutusu`, `Reschedule credits box`), if: 'dash !st_trial' },
    extraCredit: { do: 'extraCredit', label: L(`Ek hak al (500 TL)`, `Buy an extra credit (500 TL)`), if: 'dash !st_trial' },
    extraLesson: { do: 'extraLesson', label: L(`Ek ders talep et`, `Request an extra lesson`), if: 'dash !st_trial !frozen' },
    zoom: { do: 'scroll', target: '#zoomJoinBox', label: L(`Derse Katıl alanı`, `Join area`), if: 'dash' },
    pay: { do: 'scroll', target: '#payTodo', label: L(`Ödeme kartını göster`, `Show the payment card`), if: 'st_unpaid' },
    copyIban: { do: 'copyIban', label: L(`IBAN'ı kopyala`, `Copy IBAN`) },
    rules: { do: 'rules', label: L(`Ders kurallarını aç`, `Open lesson rules`) },
    wa: { do: 'wa', label: L(`WhatsApp'tan yaz`, `Message on WhatsApp`) },
    qa: { do: 'qa', label: L(`Soru Sor kartı`, `Ask a question card`), if: 'signedIn' },
    placement: { do: 'placement', label: L(`Sınavı aç`, `Open the test`), if: 'ptMissing' },
    ptCard: { do: 'scroll', target: '.bk-pt-slot:not(:empty)', label: L(`Sınav kartını göster`, `Show the test card`), if: 'signedIn' },
    samples: { do: 'scroll', target: '#bkSide .bk-res--link', open: true, label: L(`Sample & preset kartı`, `Samples & presets card`), if: 'signedIn' },
    plugins: { do: 'scroll', target: '#bkSide .bk-res--link + .bk-res--link', open: true, label: L(`Plugin listesi kartı`, `Plugin list card`), if: 'signedIn' },
    note: { do: 'scroll', target: '#studentNoteSection', open: true, label: L(`Notum kartı`, `My note card`), if: 'dash' },
    lab: { do: 'url', href: '/ableton-lab', label: L(`Ableton Lab'a git`, `Go to Ableton Lab`) },
    signin: { do: 'signin', label: L(`Giriş yap`, `Sign in`), if: 'signedOut' },
    trial: { do: 'trial', label: L(`Deneme dersi formunu aç`, `Open the trial form`), if: 'st_new' },
    pkgs: { do: 'packages', label: L(`Paketleri gör`, `See packages`), if: 'signedIn !dash !st_pending' },
    pending: { do: 'scroll', target: '#pendingStatusBox', label: L(`Talep durumumu göster`, `Show my request status`), if: 'st_pending' },
    phone: { do: 'scroll', target: '#studentPhonePrompt', label: L(`Numara alanı`, `Phone field`), if: 'needPhone' },
    langEn: { do: 'lang', to: 'en', label: L(`English`, `English`), if: '!isEn' },
    langTr: { do: 'lang', to: 'tr', label: L(`Türkçe`, `Türkçe`), if: 'isEn' },
    tour: { do: 'tour', label: L(`Panel turunu başlat`, `Start the panel tour`), if: 'hasTour' },
    forward: { do: 'forward', label: L(`Berkay'a ilet`, `Forward to Berkay`), if: 'signedIn' },
  };

  var I = [];
  function add(o) { I.push(o); }

  // ───────────────────────── Dersler / takvim ─────────────────────────
  add({ id: 'next_lesson', states: ['active', 'unpaid', 'trial'], topic: ['@sonraki', 'ders'], follow: ['self_change', 'join_zoom'], avoid: ['@ertele', '@degis', '@hasta'],
    ex: { tr: [`dersim kaçta hangi günde`, `dersim hangi gün ve saatte`, `Sıradaki dersim ne zaman?`, `bir sonraki ders ne zaman`, `ilk dersim ne zaman başlıyor`, `yaklaşan dersim hangi gün`, `dersim ne zaman`, `bir sonraki dersim saat kaçta`, `gelecek ders hangi gün`, `en yakın dersim ne zaman`, `next dersim`, `dersim kaçta`, `ders saatim neydi`],
      en: [`When is my next lesson?`, `what time is my upcoming lesson`, `next class date`, `when is my class`] },
    a: [
      A(`Sıradaki dersin **{next}** (İstanbul saati) — **{next_in}** sonra.\n\nDersten {join_min} dakika önce ders kartında yeşil **Derse Katıl** düğmesi açılır.`,
        `Your next lesson is **{next}** (Istanbul time) — in **{next_in}**.\n\nThe green **Join** button appears on the lesson card {join_min} minutes before.`, 'hasNext'),
      A(`Şu an planlanmış yaklaşan bir dersin görünmüyor. Ders talebin onaylanınca derslerin bu panelde listelenir.`,
        `I can't see an upcoming lesson right now. Once your request is approved your lessons are listed in this panel.`, 'signedIn'),
      A(`Derslerini görmek için giriş yapman gerekiyor.`, `Please sign in to see your lessons.`),
    ],
    actions: [ACT.week, ACT.signin] });

  add({ id: 'today_lesson', states: ['active', 'unpaid', 'trial'], topic: ['bugun', 'ders'], follow: ['next_lesson', 'join_zoom'], avoid: ['@ertele', '@degis', '@hasta'],
    ex: { tr: [`Bugün dersim var mı?`, `bugün ders var mı`, `bu akşam dersim var mı`, `bugünkü ders saat kaçta`, `bugün kaçta dersim var`, `bugün derse girecek miyim`, `bugün ders yapacak mıyız`, `today ders var mı`],
      en: [`Do I have a lesson today?`, `is there class today`, `today's lesson time`] },
    a: [
      A(`Evet, bugün dersin var: **{next}** — **{next_in}** sonra.`, `Yes, you have a lesson today: **{next}** — in **{next_in}**.`, 'nextToday'),
      A(`Bugün dersin yok. Sıradaki dersin **{next}**.`, `No lesson today. Your next lesson is **{next}**.`, 'hasNext'),
      A(`Bugün için planlanmış dersin görünmüyor.`, `I don't see a lesson planned for today.`),
    ],
    actions: [ACT.week] });

  add({ id: 'week_lessons', states: ['active', 'unpaid', 'trial'], topic: ['hafta', 'ders'], avoid: ['@ertele', '@degis', '@hasta', '@paket'],
    ex: { tr: [`Bu haftaki derslerim neler?`, `bu hafta kaç dersim var`, `bu hafta hangi günler dersim var`, `haftalık ders programım`, `bu haftanın dersleri`, `derslerim bu hafta`, `hafta içi derslerim`, `bu hafta ders var mı`],
      en: [`What are my lessons this week?`, `how many lessons this week`, `this week's schedule`] },
    a: [
      A(`Bu haftaki derslerin:\n{week_list}\n\nSaatlerini sayfanın en üstündeki **Derslerim · Bu hafta** bloğundan değiştirebilirsin.`,
        `Your lessons this week:\n{week_list}\n\nYou can change their times in the **My lessons · This week** block at the top.`, 'weekAny'),
      A(`Bu hafta planlanmış dersin yok.{next_line}`, `You have no lessons planned this week.{next_line}`, 'dash'),
      A(`Derslerin talebin onaylanınca burada görünür.`, `Your lessons show up here once your request is approved.`),
    ],
    actions: [ACT.week] });

  add({ id: 'all_lessons', states: ['active', 'unpaid'], topic: ['ders', 'takvim'], avoid: ['@ertele', '@degis'],
    ex: { tr: [`Tüm derslerimi nerede görürüm?`, `ders takvimim nerede`, `bütün derslerimin listesi`, `geçmiş derslerim nerede`, `ders programımı görmek istiyorum`, `hangi günler dersim var`, `takvimimi göster`, `derslerimin hepsi`, `ders günlerim neler`, `geçmiş dersler nerede görünüyor`, `eski derslerimi görmek`],
      en: [`Where can I see all my lessons?`, `show my lesson calendar`, `past lessons list`] },
    a: [
      A(`Tüm derslerin panelde **Tüm derslerim** listesinde: önce yaklaşanlar, altında **Son derslerin** (son 14 gün) ve daha eskiler kapalı **Geçmiş Dersler** bölümünde.\n\nPlanın: {plan}.`,
        `All your lessons are in the **All my lessons** list: upcoming first, then **Recent lessons** (last 14 days) and older ones in the collapsed **Past lessons** section.\n\nYour plan: {plan}.`, 'dash'),
      A(`Derslerin talebin onaylanınca bu panelde listelenir.`, `Your lessons are listed in this panel once your request is approved.`),
    ],
    actions: [ACT.list] });

  add({ id: 'lesson_count', states: ['active', 'unpaid'], topic: ['ders', 'kac'], avoid: ['@fiyat', '@indirim'],
    ex: { tr: [`Kaç dersim kaldı?`, `kaç ders yaptım`, `kalan ders sayım`, `tamamlanan ders sayısı`, `toplam kaç dersim var`, `kaç dersim bitti`, `bu ay kaç ders yaptım`, `paketimde kaç ders kaldı`, `ders sayım`],
      en: [`How many lessons do I have left?`, `how many lessons have I completed`, `lesson count`] },
    a: [
      A(`Planında toplam **{total_count}** ders var: **{done_count}** tamamlandı, **{left_count}** yaklaşan ders kaldı. Son dersin: **{end}**.`,
        `Your plan has **{total_count}** lessons in total: **{done_count}** completed, **{left_count}** upcoming. Your last lesson: **{end}**.`, 'dash'),
      A(`Ders sayıların talebin onaylanınca burada görünür.`, `Your lesson counts appear here once your request is approved.`),
    ],
    actions: [ACT.list] });

  add({ id: 'package_end', states: ['active', 'unpaid'], topic: ['@paket', '@bitis'], follow: ['renew'],
    ex: { tr: [`Paketim ne zaman bitiyor?`, `son dersim ne zaman`, `paketin bitiş tarihi`, `dersler ne zaman bitecek`, `paketim bitti mi`, `planım ne zamana kadar`, `paket süresi ne zaman doluyor`, `en son ders hangi tarihte`, `derslerim bitti görünüyor ama bir dersim vardı`],
      en: [`When does my package end?`, `when is my last lesson`, `package end date`] },
    a: [
      A(`Paketinin son dersi **{end}**. Şu an **{left_count}** yaklaşan dersin var.\n\nPaket bitince bu panel seni yeni talep ekranına alır; oradan devam paketi seçebilirsin. Eksik görünen bir dersin varsa WhatsApp'tan Berkay Er'e yaz.`,
        `Your package's last lesson is **{end}**. You have **{left_count}** upcoming lessons.\n\nWhen it ends, this panel takes you to the request screen where you can pick a new package. If a lesson seems to be missing, message Berkay Er on WhatsApp.`, 'dash !st_trial'),
      A(`Paketin bitmiş görünüyor. Bu ekrandan yeni bir paket ya da tek ders talebi oluşturabilirsin. Kalmış bir dersin olduğunu düşünüyorsan WhatsApp'tan Berkay Er'e yaz.`,
        `Your package seems to have ended. You can send a new package or single-lesson request from this screen. If you think a lesson is left, message Berkay Er on WhatsApp.`, 'st_ended'),
      A(`Paketin onaylanınca son ders tarihin burada görünür.`, `Your last lesson date shows here once your package is approved.`),
    ],
    actions: [ACT.list] });

  add({ id: 'lesson_length', pub: true, topic: ['ders', 'sure'], avoid: ['@katil', '@zoom', '@odeme', '@onay', '@bekle'],
    ex: { tr: [`Ders kaç dakika?`, `bir ders ne kadar sürüyor`, `ders süresi ne kadar`, `dersler kaç saat`, `bir ders kaç dk`, `ders 1 saat mi`, `ders uzunluğu`, `dersler 45 dakika mı`],
      en: [`How long is a lesson?`, `lesson duration`, `how many minutes per lesson`] },
    a: [A(`Her ders **{lesson_min} dakika**, Zoom üzerinden birebir ve online.`, `Each lesson is **{lesson_min} minutes**, one-to-one and online via Zoom.`)] });

  add({ id: 'timezone', pub: true, topic: ['@saatdilimi', 'saat'],
    ex: { tr: [`Saatler hangi saate göre?`, `ders saatleri İstanbul saati mi`, `yurt dışındayım saatler nasıl`, `saat dilimi ne`, `Türkiye saati mi`, `farklı ülkedeyim ders saati`, `saat farkı var mı`, `utc kaç`],
      en: [`What time zone are the lesson times in?`, `I live abroad, which timezone`, `is it Istanbul time`] },
    a: [
      A(`Paneldeki tüm saatler **İstanbul saatidir (UTC+3)**. Cihazının saat dilimi farklı görünüyor; dersin senin saatinle kaçta olduğunu buna göre hesapla.`,
        `All times in the panel are **Istanbul time (UTC+3)**. Your device seems to be in a different time zone, so convert lesson times accordingly.`, 'tzDiff'),
      A(`Paneldeki tüm saatler **İstanbul saatidir (UTC+3)**. Yurt dışındaysan ders saatini kendi saatine çevirerek düşün.`,
        `All times in the panel are **Istanbul time (UTC+3)**. If you're abroad, convert lesson times to your local time.`),
    ] });

  add({ id: 'lesson_days', pub: true, topic: ['gun', 'saat'], avoid: ['@ertele', '@degis', '@paket'], need: ['@gun', '@kapali', 'saat', 'gun', 'hafta', 'aksam', 'sabah', 'gece', 'musait', 'takvim'],
    kw: [`cumartesi`, `pazar`, `pazartesi`, `salı`, `çarşamba`, `perşembe`, `cuma`, `hafta sonu`], ex: { tr: [`cumartesi ders var mı`, `hafta sonları ders veriyor musunuz`, `Hangi günler ders veriliyor?`, `hafta sonu ders var mı`, `ders saatleri ne`, `hangi saatlerde ders alabilirim`, `pazar günü ders olur mu`, `gece ders olur mu`, `müsait saatler neler`, `akşam ders var mı`, `sabah ders olur mu`, `bazı saatler neden kırmızı`, `kapalı saatler ne demek`, `takvimde dolu saatleri seçemiyorum`, `neden bazı günler seçilmiyor`],
      en: [`Which days do you teach?`, `are there weekend lessons`, `available hours`] },
    a: [
      A(`Ders günleri: **{open_days}**. Boş saatleri talep formundaki gün-saat tablosunda canlı görürsün; dolu ya da kapalı saatler seçilemez. Saatler İstanbul saatidir.`,
        `Lesson days: **{open_days}**. Free hours are shown live in the day/time grid of the request form; taken or closed hours can't be picked. Times are Istanbul time.`, 'openDays'),
      A(`Uygun gün ve saatler Berkay Er'in müsaitliğine göre değişir; talep formundaki gün-saat tablosunda boş saatleri canlı görürsün. Saatler İstanbul saatidir.`,
        `Available days and hours depend on Berkay Er's availability; the request form's grid shows free hours live. Times are Istanbul time.`),
    ],
    actions: [ACT.pkgs] });

  // ───────────────────────── Saat değiştirme ─────────────────────────
  add({ id: 'self_change', states: ['active', 'trial'], topic: ['@degis', 'saat'], follow: ['self_change_until', 'change_vs_resched'],
    ex: { tr: [`salı dersini perşembeye alabilir miyim`, `aynı hafta içinde başka güne almak`, `Ders saatimi değiştirebilir miyim?`, `dersin saatini nasıl değiştiririm`, `dersimi başka saate alabilir miyim`, `saat değiştirmek istiyorum`, `dersimi aynı hafta başka güne taşıyabilir miyim`, `derse başka saatte girmek istiyorum`, `saati kaydırmak istiyorum`, `dersin saatini öne alabilir miyim`, `bu haftaki dersin saatini değiştir`, `saat değişikliği nasıl yapılır`, `dersi akşama çekebilir miyim`, `dersi sabaha almak istiyorum`, `cumartesi dersimi pazara alabilir miyim`, `dersin saatini 2 saat ileri almak`, `saat 19'daki dersi 21'e çekmek`, `saati kendim değiştirebiliyor muyum`, `saati değiştir butonu nerede`],
      en: [`Can I change my lesson time?`, `how do I move my lesson to another time`, `change the hour of my class`] },
    a: [
      A(`Evet. Sıradaki dersini (**{next}**) kendin, onaysız ve ücretsiz taşıyabilirsin — seçim **{change_until}**'e kadar açık ({change_left}).\n\nKurallar:\n- Dersine {self_h} saatten fazla olmalı; yeni saat de en az {self_h} saat sonra olmalı\n- Yalnız aynı hafta içinde (Pzt–Paz)\n- Her ders için bir kez\n- Erteleme hakkı düşmez`,
        `Yes. You can move your next lesson (**{next}**) yourself — no approval, free — until **{change_until}** ({change_left} left).\n\nRules:\n- More than {self_h} hours before the lesson, and the new time at least {self_h} hours away\n- Within the same week only (Mon–Sun)\n- Once per lesson\n- No reschedule credit used`, 'canChange'),
      A(`Sıradaki dersin (**{next}**) bir kez taşındı; aynı ders ikinci kez taşınamaz. Ama **{change_any}** dersini bu hafta içinde kendin taşıyabilirsin — **Saat seçiciyi aç**'a bas.`,
        `Your next lesson (**{next}**) was already moved once and can't be moved again. But you can still move your **{change_any}** lesson yourself this week — tap **Open the time picker**.`, 'changeMoved anyChange'),
      A(`Sıradaki dersine ({next}) {self_h} saatten az kaldığı için o dersin saati artık değiştirilemez. Ama **{change_any}** dersini bu hafta içinde kendin taşıyabilirsin — **Saat seçiciyi aç**'a bas.`,
        `Your next lesson ({next}) is less than {self_h} hours away, so its time can't be changed any more. But you can still move your **{change_any}** lesson yourself this week — tap **Open the time picker**.`, 'changeLocked anyChange'),
      A(`Sıradaki dersin için bekleyen bir erteleme talebin var; talep yanıtlanana kadar o dersin saati değiştirilemez. Ama **{change_any}** dersini bu hafta içinde kendin taşıyabilirsin — **Saat seçiciyi aç**'a bas.`,
        `You have a pending reschedule request for your next lesson, so its time can't be changed until that's answered. But you can still move your **{change_any}** lesson yourself this week — tap **Open the time picker**.`, 'reschPendingNext anyChange'),
      A(`Sıradaki dersin (**{next}**) bir kez taşındı; aynı ders ikinci kez taşınamaz. Başka haftaya almak istersen **Ertele**'yi kullanabilirsin (hak kullanır).`,
        `Your next lesson (**{next}**) was already moved once; a lesson can only be moved once. To push it to another week use **Reschedule** (uses a credit).`, 'changeMoved'),
      A(`Sıradaki dersine ({next}) {self_h} saatten az kaldığı için saat değişikliği kapandı. Bir sonraki derslerin için yine açılır.`,
        `Your next lesson ({next}) is less than {self_h} hours away, so time changes are closed for it. It reopens for your later lessons.`, 'changeLocked'),
      A(`Sıradaki dersin için bekleyen bir erteleme talebin var; talep yanıtlanana kadar o dersin saati değiştirilemez.`,
        `You have a pending reschedule request for your next lesson; its time can't be changed until that's answered.`, 'reschPendingNext'),
      A(`Saat değiştirme ödemen onaylanınca açılır. Kural: dersine {self_h} saatten fazla varsa aynı hafta içinde başka bir saate kendin, ücretsiz taşıyabilirsin (her ders için bir kez).`,
        `Changing times unlocks once your payment is confirmed. Rule: if your lesson is more than {self_h} hours away you can move it yourself within the same week, free (once per lesson).`, 'st_unpaid'),
      A(`Kural: dersine {self_h} saatten fazla varsa aynı hafta içinde (Pzt–Paz) başka bir saate kendin taşıyabilirsin; onay gerekmez, erteleme hakkı düşmez, her ders için bir kez. Bunu ders kartındaki **Saati değiştir** düğmesinden yaparsın.`,
        `Rule: if your lesson is more than {self_h} hours away you can move it yourself within the same week (Mon–Sun); no approval, no credit used, once per lesson. Use **Change time** on the lesson card.`),
    ],
    actions: [ACT.selfchange, ACT.week] });

  add({ id: 'self_change_until', states: ['active', 'trial'], topic: ['@degis', 'saat', 'kadar'],
    ex: { tr: [`Saat değişikliği ne zamana kadar açık?`, `en son ne zaman saat değiştirebilirim`, `saat değiştirmek için son saat`, `kaç saat öncesine kadar değiştirebilirim`, `değişiklik süresi ne kadar kaldı`, `saati değiştirmek için geç mi kaldım`, `derse 3 saat kala değiştirebilir miyim`, `saat değiştirme kapanıyor mu`, `dersime birkaç saat var saatini değiştirebilir miyim`],
      en: [`Until when can I change the time?`, `how many hours before can I change my lesson`, `is it too late to change the time`] },
    a: [
      A(`Sıradaki dersin (**{next}**) için seçim **{change_until}**'e kadar açık — **{change_left}** kaldı. Ders saatinden {self_h} saat önce kapanır.`,
        `For your next lesson (**{next}**) changes are open until **{change_until}** — **{change_left}** left. It closes {self_h} hours before the lesson.`, 'canChange'),
      A(`Sıradaki dersin (**{next}**) için saat değişikliği kapandı (derse {self_h} saatten az kaldı). **{change_any}** dersin için seçim hâlâ açık.`, `Time changes are closed for your next lesson (**{next}**) — it's less than {self_h} hours away. Your **{change_any}** lesson can still be moved.`, 'changeLocked anyChange'),
      A(`Sıradaki dersin (**{next}**) için saat değişikliği kapandı (derse {self_h} saatten az kaldı).`, `Time changes are closed for your next lesson (**{next}**) — it's less than {self_h} hours away.`, 'changeLocked'),
      A(`Saat değişikliği her ders için dersten **{self_h} saat önce** kapanır; yeni saat de en az {self_h} saat sonra olmalı.`,
        `Time changes close **{self_h} hours before** each lesson; the new time must also be at least {self_h} hours away.`),
    ],
    actions: [ACT.selfchange, ACT.week] });

  add({ id: 'self_change_once', topic: ['@degis', 'bir kez'],
    kw: [`yanlış`, `iki kez`, `tekrar`], ex: { tr: [`yanlış saate aldım`, `Aynı dersi iki kez taşıyabilir miyim?`, `saatini değiştirdiğim dersi tekrar değiştirebilir miyim`, `bir kez taşındı ne demek`, `ikinci kez saat değiştirmek`, `taşıdığım dersi geri alabilir miyim`, `saat değiştirme hakkım kaç`, `kaç kere saat değiştirebilirim`, `yanlış saate taşıdım düzeltebilir miyim`],
      en: [`Can I move the same lesson twice?`, `I moved it to the wrong time`, `how many times can I change the time`] },
    a: [A(`Her ders **bir kez** taşınabilir; taşınan derste **Bir kez taşındı** yazar ve tekrar değiştirilemez. Saat değiştirmenin sayı sınırı yok — her ders için ayrı bir kez hakkın var.\n\nYanlış saate taşıdıysan Berkay Er'e yaz; o düzeltebilir.`,
      `Each lesson can be moved **once**; a moved lesson shows **Moved once** and can't be changed again. There's no overall limit — every lesson gets its own one change.\n\nIf you moved it to the wrong time, message Berkay Er; he can fix it.`)],
    actions: [ACT.wa] });

  add({ id: 'change_vs_resched', pub: true, topic: ['@degis', '@ertele'],
    ex: { tr: [`Saat değiştirmek ile ertelemek arasındaki fark ne?`, `ertele mi saati değiştir mi`, `hangisi hak kullanır`, `saat değiştirme hak düşer mi`, `ertelemek ücretli mi`, `saat değiştirince erteleme hakkım gider mi`, `ertele ile saati değiştir farkı`, `başka haftaya mı almalıyım aynı haftada mı`, `saat değişikliği ücretli mi`, `başka haftaya taşıyabilir miyim`],
      en: [`What's the difference between changing the time and rescheduling?`, `does changing the time use a credit`] },
    a: [A(`İki ayrı şey:\n- **Saati değiştir**: aynı hafta içinde başka saate, kendin ve anında; derse {self_h} saatten fazla olmalı, her ders için bir kez, **hak düşmez**.\n- **Ertele**: dersi **1 hafta ileri** alır; en az {resch_h} saat önce talep edilir, Berkay Er onaylayınca **1 erteleme hakkı** düşer.`,
      `Two different things:\n- **Change time**: another hour in the same week, by yourself and instantly; more than {self_h} hours before, once per lesson, **no credit used**.\n- **Reschedule**: moves the lesson **one week later**; request at least {resch_h} hours ahead, and **1 credit** is used once Berkay Er approves.`)],
    actions: [ACT.selfchange, ACT.resch] });

  // ───────────────────────── Erteleme ─────────────────────────
  add({ id: 'reschedule_how', states: ['active'], topic: ['@ertele'], follow: ['credits_left', 'resched_24h'], need: ['@ertele'], avoid: ['@yakin'],
    ex: { tr: [`Dersimi nasıl ertelerim?`, `dersi ertelemek istiyorum`, `dersimi gelecek haftaya alabilir miyim`, `ertele butonu nerede`, `dersi bir hafta ileri almak`, `erteleme nasıl yapılıyor`, `dersimi kaydırmak istiyorum`, `bu dersi erteleyebilir miyim`, `dersi sonraya almak istiyorum`, `ertelemek için ne yapmalıyım`],
      en: [`How do I reschedule my lesson?`, `postpone my class to next week`, `where is the reschedule button`] },
    a: [
      A(`Ders satırındaki **Ertele** düğmesine bas: ders **1 hafta ileri** alınır ve talep Berkay Er'e gider; onaylayınca **1 hak** düşer. En az {resch_h} saat önce yapılmalı.\n\nŞu an **{credits_avail}** kullanılabilir hakkın var. Sıradaki dersin (**{next}**) için erteleme **{resch_until}**'e kadar açık.`,
        `Press **Reschedule** on the lesson row: the lesson moves **one week later** and the request goes to Berkay Er; **1 credit** is used once he approves. It must be at least {resch_h} hours ahead.\n\nYou have **{credits_avail}** usable credits. For your next lesson (**{next}**) rescheduling is open until **{resch_until}**.`, 'canResch'),
      A(`Erteleme ödemen onaylanınca açılır. Kural: ders satırındaki **Ertele** dersi 1 hafta ileri alır, en az {resch_h} saat önce talep edilir; Berkay Er onaylayınca 1 hak düşer.`,
        `Rescheduling unlocks once your payment is confirmed. Rule: **Reschedule** on a lesson row moves it one week later, requested at least {resch_h} hours ahead; 1 credit is used when Berkay Er approves.`, 'st_unpaid'),
      A(`Deneme dersinde erteleme hakkı yok. Saatini aynı hafta içinde ({self_h} saatten fazla varsa) **Saati değiştir** ile taşıyabilirsin; olmuyorsa WhatsApp'tan Berkay Er'e yaz.`,
        `Trial lessons have no reschedule credits. You can still move it within the same week with **Change time** (if it's more than {self_h} hours away); otherwise message Berkay Er on WhatsApp.`, 'st_trial'),
      A(`Erteleme hakkın kalmadı (ya da bekleyen talepte). Aynı hafta içinde saati yine ücretsiz değiştirebilirsin ya da **ek hak** alabilirsin ({extra_price}).`,
        `You have no usable credits left (or they're in a pending request). You can still change the time within the same week for free, or buy an **extra credit** ({extra_price}).`, 'dash !creditsAvail'),
      A(`Sıradaki dersine {resch_h} saatten az kaldığı için o ders ertelenemez. Acil durumda WhatsApp'tan Berkay Er'e yaz.`,
        `Your next lesson is less than {resch_h} hours away, so it can't be rescheduled. In an emergency, message Berkay Er on WhatsApp.`, 'reschTooSoon'),
      A(`Ders satırındaki **Ertele** düğmesi dersi **1 hafta ileri** alır. En az {resch_h} saat önce talep edilir; Berkay Er onaylayınca **1 erteleme hakkı** düşer. Paketin kaç aylıksa o kadar hakkın olur.`,
        `**Reschedule** on a lesson row moves it **one week later**. Request it at least {resch_h} hours ahead; **1 credit** is used once Berkay Er approves. You get one credit per package month.`),
    ],
    actions: [ACT.resch, ACT.list, ACT.extraCredit] });

  add({ id: 'credits_left', states: ['active', 'unpaid'], topic: ['@hak', '@ertele'], follow: ['credits_rule', 'extra_credit'], need: ['@hak', '@ertele'], avoid: ['@satinal', '@fiyat', '@ek'],
    ex: { tr: [`Kaç erteleme hakkım kaldı?`, `erteleme hakkım var mı`, `kaç hakkım var`, `kalan hak sayım`, `hakkım bitti mi`, `erteleme kredim kaç`, `kaç kere erteleyebilirim`, `kalan erteleme sayısı`, `hak durumum ne`, `kaç tane erteleme hakkım var`],
      en: [`How many reschedule credits do I have left?`, `do I have any credits`, `remaining credits`] },
    a: [
      A(`**{credits}** erteleme hakkın var ama hepsi bekleyen erteleme talebinde; Berkay Er yanıtlayınca yeniden kullanılabilir olur (onaylarsa 1 hak düşer). Paketin {pkg_months} aylık → paket hakkı {pkg_months}.`,
        `You have **{credits}** credit(s), all tied up in a pending reschedule request; they become usable again once Berkay Er answers (1 is used if he approves). Your package is {pkg_months} month(s) → {pkg_months} credit(s).`, 'creditsInPending !creditsAvail'),
      A(`**{credits}** erteleme hakkın var; bunların **{credits_pending}** tanesi bekleyen talepte, yani şu an **{credits_avail}** tanesini kullanabilirsin. Paketin {pkg_months} aylık → paket hakkı {pkg_months}.`,
        `You have **{credits}** credits; **{credits_pending}** of them are in a pending request, so **{credits_avail}** are usable now. Your package is {pkg_months} month(s) → {pkg_months} credit(s).`, 'creditsInPending'),
      A(`**{credits}** erteleme hakkın kaldı. Paketin {pkg_months} aylık → paket hakkı {pkg_months} (N aylık paket = N hak; ay ay yenilenmez). Hakları paket süresince istediğin derste kullanabilirsin.`,
        `You have **{credits}** reschedule credit(s) left. Your package is {pkg_months} month(s) → {pkg_months} credit(s) (N-month package = N credits; they don't renew monthly). Use them on any lesson during the package.`, 'hasCredits'),
      A(`Erteleme hakkın kalmadı. Aynı hafta içinde saati yine ücretsiz değiştirebilirsin; ya da tanesi {extra_price} olan **ek hak** alabilirsin.`,
        `You have no reschedule credits left. You can still change the time within the same week for free, or buy an **extra credit** for {extra_price} each.`, 'dash !st_trial'),
      A(`Deneme dersinde erteleme hakkı yok.`, `Trial lessons have no reschedule credits.`, 'st_trial'),
      A(`Erteleme hakkı paket bazlıdır: N aylık paket = N hak. Paketin onaylanınca hak sayın burada görünür.`,
        `Credits are per package: an N-month package = N credits. Your count shows here once your package is approved.`),
    ],
    actions: [ACT.credits, ACT.extraCredit] });

  add({ id: 'credits_rule', pub: true, topic: ['@hak', '@paket'], follow: ['credits_left'], need: ['@hak', '@ertele'], avoid: ['@satinal', '@ek', '@fiyat', '@indirim'],
    ex: { tr: [`Erteleme hakkı nasıl hesaplanıyor?`, `paketimde kaç erteleme hakkı var`, `1 aylık pakette kaç hak var`, `3 aylık paket kaç hak verir`, `hak her ay yenileniyor mu`, `erteleme hakkı neye göre`, `haklar ay ay mı`, `ayda kaç erteleme hakkı`],
      en: [`How are reschedule credits calculated?`, `how many credits does a 3-month package give`] },
    a: [A(`Erteleme hakkı **paket bazlı bir havuzdur**: paketin kaç aylıksa o kadar hakkın olur (1 ay = 1 hak, 3 ay = 3 hak). Haklar ay ay yenilenmez; paket süresince istediğin derste kullanırsın. Berkay Er erteleme talebini onaylayınca 1 hak düşer.`,
      `Reschedule credits are a **per-package pool**: one credit per package month (1 month = 1, 3 months = 3). They don't renew monthly; use them on any lesson during the package. 1 credit is used when Berkay Er approves a request.`)],
    actions: [ACT.credits] });

  add({ id: 'credits_expire', pub: true, topic: ['@hak', '@bitis'], need: ['@hak', '@ertele'],
    ex: { tr: [`Kullanmadığım haklar ne olur?`, `erteleme hakları devreder mi`, `haklarım yanar mı`, `hakkı sonraki pakete aktarabilir miyim`, `paket bitince haklar gider mi`, `kullanılmayan erteleme hakkı`, `haklar birikir mi`, `hak sonraki aya geçer mi`],
      en: [`What happens to unused credits?`, `do credits carry over`] },
    a: [A(`Kullanılmayan erteleme hakları **paket bitince sona erer**; sonraki pakete aktarılmaz.`, `Unused credits **expire when the package ends**; they don't carry over to the next package.`)],
    actions: [ACT.rules] });

  add({ id: 'resched_24h', pub: true, topic: ['@ertele', '24 saat'], need: ['@ertele', '@yakin'],
    ex: { tr: [`ertele butonu basılmıyor`, `ertele düğmesi neden çalışmıyor`, `Derse 24 saatten az kaldı erteleyebilir miyim?`, `son dakika erteleme olur mu`, `yarınki dersi erteleyebilir miyim`, `ertele butonu pasif neden`, `ertelemek için kaç saat önce haber vermeliyim`, `derse birkaç saat kaldı ertelemek istiyorum`, `ertele gri görünüyor`, `24 saat kuralı ne`, `bugünkü dersimi erteleyebilir miyim`, `bu akşamki dersi ertelemek istiyorum`, `dersime birkaç saat var ertelenir mi`],
      en: [`Can I reschedule with less than 24 hours left?`, `why is the reschedule button disabled`, `24 hour rule`] },
    a: [
      A(`Erteleme en az **{resch_h} saat önce** talep edilir. Sıradaki dersine ({next}) {resch_h} saatten az kaldığı için o ders ertelenemez. Aynı hafta içinde saat değiştirme de dersten {self_h} saat önce kapanır.\n\nAcil bir durum varsa WhatsApp'tan Berkay Er'e yaz.`,
        `Rescheduling must be requested at least **{resch_h} hours ahead**. Your next lesson ({next}) is less than {resch_h} hours away, so it can't be rescheduled. Same-week time changes close {self_h} hours before.\n\nIf it's an emergency, message Berkay Er on WhatsApp.`, 'reschTooSoon'),
      A(`Erteleme en az **{resch_h} saat önce** talep edilir. Düğme pasifse nedeni yanında yazar: derse {resch_h} saatten az kalmış olabilir, hakkın bitmiş ya da bekleyen talepte olabilir, ya da ödeme henüz onaylanmamıştır.`,
        `Rescheduling must be requested at least **{resch_h} hours ahead**. If the button is disabled the reason is shown next to it: fewer than {resch_h} hours left, no credits (or one is pending), or payment not confirmed yet.`),
    ],
    actions: [ACT.wa, ACT.list] });

  add({ id: 'resched_status', states: ['active'], topic: ['@ertele', '@onay'], need: ['@ertele'],
    ex: { tr: [`Erteleme talebim onaylandı mı?`, `erteleme onayı bekliyor ne demek`, `ertelediğim ders ne zaman onaylanır`, `erteleme talebimin durumu`, `erteleme isteğim gitti mi`, `erteleme talebi ne kadar sürede onaylanır`, `ertelemeyi geri alabilir miyim`, `erteleme talebini iptal etmek istiyorum`],
      en: [`Was my reschedule request approved?`, `reschedule pending status`] },
    a: [
      A(`Bekleyen **{credits_pending}** erteleme talebin var; Berkay Er onaylayınca takvimin güncellenir, 1 hak düşer ve sana WhatsApp'tan bildirim gelir. O dersin satırında **Erteleme onayı bekliyor** yazar. Talebi geri almak istersen WhatsApp'tan yaz.`,
        `You have **{credits_pending}** pending reschedule request(s); once Berkay Er approves, your calendar updates, 1 credit is used and you get a WhatsApp notice. The lesson row shows **Reschedule pending**. To withdraw it, message him on WhatsApp.`, 'creditsInPending'),
      A(`Şu an bekleyen bir erteleme talebin görünmüyor. Onaylanan erteleme takviminde **Ertelendi** olarak görünür.`,
        `I don't see a pending reschedule request. An approved one shows as **Rescheduled** in your calendar.`, 'dash'),
      A(`Erteleme talepleri Berkay Er'in onayına gider; onaylanınca takvimin güncellenir ve WhatsApp'tan bildirim gelir.`,
        `Reschedule requests go to Berkay Er; once approved your calendar updates and you get a WhatsApp notice.`),
    ],
    actions: [ACT.list, ACT.wa] });

  add({ id: 'extra_credit', pub: true, topic: ['@hak', 'ek', '@fiyat'], need: ['@hak', '@ek', '@satinal', '@fiyat'], avoid: ['@ekders'],
    ex: { tr: [`Ek erteleme hakkı nasıl alırım?`, `ekstra hak almak istiyorum`, `hak satın almak`, `ek hak kaç para`, `erteleme hakkı satın al`, `hakkım bitti yeni hak alabilir miyim`, `fazladan erteleme hakkı`, `ek hak al`, `erteleme hakkı kaç TL`, `bir erteleme hakkının ücreti ne`, `hak satın alınabiliyor mu`, `parasını ödeyip erteleme yapabilir miyim`, `ücretli erteleme var mı`, `bir tane daha hak almak`, `hakkım kalmadıysa satın alarak erteleyebilir miyim`],
      en: [`How do I buy an extra reschedule credit?`, `extra credit price`] },
    a: [A(`Her ek erteleme hakkı **{extra_price}**. Erteleme Hakkı kutusundaki **+ Ek Hak Al**'a bas, adet seç, IBAN'a havale et ve **Ödedim — WhatsApp ile bildir** de; Berkay Er hakkı hesabına tanımlar.`,
      `Each extra credit is **{extra_price}**. Press **+ Buy extra credit** in the Reschedule credits box, pick a quantity, transfer to the IBAN and tap **Paid — notify on WhatsApp**; Berkay Er adds it to your account.`)],
    actions: [ACT.extraCredit, ACT.credits] });

  add({ id: 'extra_lesson', states: ['active'], topic: ['@ekders'], need: ['@ekders', '@ek'], avoid: ['@hak'],
    ex: { tr: [`Ek ders almak istiyorum`, `ekstra ders nasıl alırım`, `bu hafta bir ders daha alabilir miyim`, `fazladan ders talep etmek`, `ek ders kaç para`, `pakete ek ders eklemek`, `ilave ders almak istiyorum`, `ek ders satın al`, `paketin dışında bir ders daha`, `ek ders butonu pasif neden`],
      en: [`I want an extra lesson`, `how do I book an additional lesson`] },
    a: [
      A(`Panelde **Ek Ders Satın Al**'a bas: takvimden gün ve saat seçip talep gönderirsin, Berkay Er onaylar. Ek ders paketine dahil değildir; **{price}** toplam ücretine eklenir. Seçilen saat en az {resch_h} saat sonra olmalı; dolu ya da {resch_h} saatten yakın saatler seçilemez. Düğme yalnız plan dondurulmuşken kapalıdır.`,
        `Press **Buy an extra lesson** in the panel: pick a day and time and send the request; Berkay Er approves it. It's not part of your package; **{price}** is added to your total. The slot must be at least {resch_h} hours away; taken slots or ones closer than {resch_h} hours can't be picked. The button is only disabled while your plan is frozen.`, 'dash !st_trial !frozen'),
      A(`Planın dondurulmuşken ek ders talep edilemez. Berkay Er'e WhatsApp'tan yazabilirsin.`, `You can't request an extra lesson while your plan is frozen. You can message Berkay Er on WhatsApp.`, 'frozen'),
      A(`Ek ders, aktif paketi olan öğrencilerin panelinde **Ek Ders Satın Al** düğmesiyle talep edilir (ders başı {price}).`,
        `Extra lessons are requested with **Buy an extra lesson** in an active student's panel ({price} per lesson).`),
    ],
    actions: [ACT.extraLesson] });

  // ───────────────────────── Derse katılma / Zoom ─────────────────────────
  add({ id: 'join_zoom', pub: true, states: ['active', 'trial', 'unpaid'], topic: ['@zoom', '@katil'], follow: ['zoom_no_button'],
    ex: { tr: [`derse nasıl girerim`, `Derse nasıl katılırım?`, `zoom linki nerede`, `derse nereden gireceğim`, `zoom bağlantısı`, `derse katıl butonu`, `ders linkini bulamıyorum`, `zoom'a nasıl girerim`, `toplantı linki ne`, `derse girmek için ne yapmalıyım`, `ders linki gelecek mi`, `derse kaç dakika önce girebilirim`, `katıl butonu ne zaman açılıyor`, `zoom'u indirmem gerekiyor mu`],
      en: [`How do I join the lesson?`, `where is the zoom link`, `join button`] },
    a: [
      A(`Dersin şu an açık: ders kartındaki yeşil **Derse Katıl** düğmesi Zoom'u açar. İyi dersler!`, `Your lesson is open now: the green **Join** button on the lesson card opens Zoom. Enjoy!`, 'joinOpen paidOrTrial'),
      A(`Her dersten **{join_min} dakika önce** ders kartında yeşil **Derse Katıl** düğmesi açılır; Zoom'u açar, ayrı link beklemene gerek yok. Sıradaki dersin **{next}** ({next_in} sonra).`,
        `**{join_min} minutes before** each lesson a green **Join** button appears on the lesson card; it opens Zoom. Your next lesson is **{next}**.`, 'hasNext paidOrTrial'),
      A(`Derse katılmak için önce ödemenin onaylanması gerekiyor. Onaylanınca her dersten {join_min} dakika önce ders kartında **Derse Katıl** düğmesi açılır.`,
        `Your payment must be confirmed before you can join. After that, a **Join** button appears on the lesson card {join_min} minutes before each lesson.`, 'st_unpaid'),
      A(`Dersler Zoom üzerinden yapılır. Her dersten **{join_min} dakika önce** ders panelindeki ders kartında yeşil **Derse Katıl** düğmesi açılır; Zoom'u açar. Ayrı link beklemene gerek yok.`,
        `Lessons are on Zoom. **{join_min} minutes before** each lesson a green **Join** button appears on the lesson card in the panel; it opens Zoom. No separate link needed.`),
    ],
    actions: [ACT.zoom, ACT.week] });

  add({ id: 'zoom_no_button', states: ['active', 'trial'], topic: ['@zoom', '@katil', 'yok'],
    kw: [`buton`, `düğme`, `görünmüyor`, `çıkmıyor`], ex: { tr: [`katıl butonu çalışmıyor`, `Derse katıl butonu çıkmıyor`, `zoom butonu görünmüyor`, `derse giremiyorum link yok`, `katıl düğmesi pasif`, `zoom bağlantısı bekleniyor yazıyor`, `butona basınca zoom açılmıyor`, `derse katıl çalışmıyor`, `ders başladı ama giremiyorum`, `ders saati geldi katıl butonu yok`],
      en: [`The join button doesn't appear`, `zoom link not working`, `can't join the lesson`] },
    a: [
      A(`Düğme dersten **{join_min} dakika önce** açılır; sıradaki dersin **{next}** ({next_in} sonra). Sayfa uzun süre açık kaldıysa yenile.\n\nDüğmede **Zoom bağlantısı bekleniyor** yazıyorsa ya da Zoom açılmıyorsa hemen WhatsApp'tan Berkay Er'e yaz.`,
        `The button opens **{join_min} minutes before** the lesson; your next lesson is **{next}** (in {next_in}). If the page has been open a long time, refresh it.\n\nIf it says **Waiting for the Zoom link** or Zoom won't open, message Berkay Er on WhatsApp right away.`, 'hasNext paidOrTrial'),
      A(`Derse katılmak için ödeme onayı gerekiyor; onaylanınca düğme dersten {join_min} dakika önce açılır.`, `Joining requires payment confirmation; after that the button opens {join_min} minutes before the lesson.`, 'st_unpaid'),
      A(`**Derse Katıl** düğmesi dersten {join_min} dakika önce açılır. Görünmüyorsa sayfayı yenile; düğmede **Zoom bağlantısı bekleniyor** yazıyorsa ya da Zoom açılmıyorsa WhatsApp'tan Berkay Er'e yaz.`,
        `The **Join** button opens {join_min} minutes before the lesson. If you don't see it, refresh; if it says **Waiting for the Zoom link** or Zoom won't open, message Berkay Er on WhatsApp.`),
    ],
    actions: [ACT.zoom, ACT.wa] });

  add({ id: 'late', pub: true, topic: ['@gec'],
    ex: { tr: [`Derse geç kalırsam ne olur?`, `10 dakika geç kalacağım`, `derse geç girersem ders iptal mi`, `geç kalma kuralı`, `biraz gecikeceğim`, `derse 15 dakika geç kalsam`, `trafikteyim geç kalacağım`, `geç kalırsam ders uzar mı`],
      en: [`What if I'm late to the lesson?`, `I'll be 10 minutes late`] },
    a: [A(`Kural: derse **{late_min} dakika içinde** girilmezse ders yapılmış sayılır. Geç kalınan süre için dersin uzatılması kurallarda yok; geç kalacaksan hemen WhatsApp'tan Berkay Er'e haber ver.`,
      `Rule: if you don't join within **{late_min} minutes**, the lesson counts as done. The rules don't extend a lesson for late arrival; if you'll be late, let Berkay Er know on WhatsApp right away.`)],
    actions: [ACT.wa, ACT.rules] });

  add({ id: 'missed', pub: true, topic: ['katil', 'kacir'], avoid: ['@sifre', '@produksiyon', '@site', '@odeme'], need: ['@olumsuz', '@kacir'],
    kw: [`kaçırdım`, `giremedim`, `katılamadım`], ex: { tr: [`derse giremedim`, `dün dersi kaçırdım`, `Derse katılamadım ne olacak?`, `dersi kaçırdım`, `derse giremedim unuttum`, `derse gelmezsem ne olur`, `dersi unuttum telafi var mı`, `katılmadığım ders yanar mı`, `haber vermeden katılmasam`, `dersi kaçırırsam telafi edilir mi`],
      en: [`I missed my lesson`, `what if I don't show up`] },
    a: [A(`Kural: haber vermeden derse katılmazsan ders **yapılmış sayılır ve yeniden planlanmaz**. Önceden biliyorsan en az {resch_h} saat önce **Ertele**'yi kullan ya da aynı hafta içinde saati değiştir.\n\nBir sorun olduysa WhatsApp'tan Berkay Er'e yaz.`,
      `Rule: if you miss a lesson without notice it **counts as done and isn't rebooked**. If you know in advance, use **Reschedule** at least {resch_h} hours ahead or change the time within the same week.\n\nIf something went wrong, message Berkay Er on WhatsApp.`)],
    actions: [ACT.wa, ACT.rules] });

  add({ id: 'sick', pub: true, topic: ['@hasta'],
    ex: { tr: [`Hastayım derse giremeyeceğim`, `mazeretim var ne yapmalıyım`, `acil bir durum çıktı`, `rahatsızım dersi yapamayacağım`, `ailevi bir sorun var derse katılamam`, `sınavım var derse gelemem`, `ameliyat oldum`, `işten çıkamıyorum derse yetişemem`, `bu hafta derse gelemeyeceğim`, `işim çıktı derse katılamayacağım`],
      en: [`I'm sick and can't attend`, `I have an emergency`, `I'm sick today`, `I am ill and can't come`] },
    a: [
      A(`Geçmiş olsun! Seçeneklerin:\n- Dersine {self_h} saatten fazla varsa aynı hafta içinde **saatini değiştir** (ücretsiz)\n- {resch_h} saatten fazla varsa **Ertele** (1 hafta ileri, 1 hak)\n- Daha az kaldıysa ya da hakkın yoksa hemen WhatsApp'tan Berkay Er'e yaz\n\nSıradaki dersin: **{next}**.`,
        `Get well soon! Your options:\n- More than {self_h} hours before: **change the time** within the same week (free)\n- More than {resch_h} hours before: **Reschedule** (one week later, 1 credit)\n- Less time left or no credits: message Berkay Er on WhatsApp right away\n\nYour next lesson: **{next}**.`, 'hasNext'),
      A(`Geçmiş olsun! Dersine {self_h} saatten fazla varsa aynı hafta içinde saatini ücretsiz değiştirebilirsin; {resch_h} saatten fazla varsa **Ertele** kullanabilirsin. Daha az kaldıysa hemen WhatsApp'tan Berkay Er'e yaz — haber vermeden katılmamak dersi yapılmış saydırır.`,
        `Get well soon! More than {self_h} hours before you can change the time within the same week for free; more than {resch_h} hours before you can **Reschedule**. If less time is left, message Berkay Er on WhatsApp right away — missing without notice counts the lesson as done.`),
    ],
    actions: [ACT.selfchange, ACT.resch, ACT.wa] });

  // ───────────────────────── Onay / itiraz ─────────────────────────
  add({ id: 'lesson_confirm', states: ['active', 'trial'], topic: ['@onay', 'ders yapildi'], follow: ['dispute'],
    ex: { tr: [`Dersin tamamlandı onayı ne?`, `evet ders yapıldı butonu ne işe yarıyor`, `dersi onaylamam gerekiyor mu`, `ders bitince ne yapmalıyım`, `ders onayı nedir`, `onay bekleniyor yazıyor`, `dersi onaylamazsam ne olur`, `otomatik onay nedir`, `yapıldı yazıyor ne demek`, `ders bitince çıkan kutu ne`],
      en: [`What is the lesson confirmation?`, `do I have to confirm the lesson`, `awaiting confirmation`] },
    a: [
      A(`Biten her dersin kartında **Dersin tamamlandı** kutusu çıkar: **Evet, ders yapıldı** ile onaylarsın ya da **Sorun bildir** ile itiraz edersin. Ders bitiminden sonra **{cfm_h} saat** içinde itiraz edilmeyen ders kendiliğinden yapılmış sayılır.\n\nŞu an onayını bekleyen dersin var.`,
        `After each lesson its card shows a **Lesson finished** box: confirm with **Yes, it happened** or object with **Report a problem**. Lessons not disputed within **{cfm_h} hours** of ending count as done automatically.\n\nYou have a lesson waiting for your confirmation now.`, 'cfmOpen'),
      A(`Biten her dersin kartında **Dersin tamamlandı** kutusu çıkar: **Evet, ders yapıldı** ile onaylarsın ya da **Sorun bildir** ile itiraz edersin. Ders bitiminden sonra **{cfm_h} saat** içinde itiraz edilmeyen ders yapılmış sayılır. Zoom katılım kaydın (giriş/çıkış) ders kanıtı olarak saklanır.`,
        `After each lesson its card shows a **Lesson finished** box: confirm with **Yes, it happened** or object with **Report a problem**. Lessons not disputed within **{cfm_h} hours** count as done. Your Zoom attendance (join/leave times) is kept as proof.`),
    ],
    actions: [ACT.week, ACT.list] });

  add({ id: 'dispute', pub: true, topic: ['@itiraz'],
    ex: { tr: [`Ders yapılmadı itiraz etmek istiyorum`, `sorun bildir nasıl yapılır`, `ders olmadı ama yapıldı görünüyor`, `itiraz süresi ne kadar`, `derse hoca gelmedi`, `bağlantım koptu ders yarım kaldı`, `itiraz ettim ne olacak`, `dersim yapılmadı sayılsın`, `ders olmadı ama panelde yapıldı yazıyor`, `yapılmayan ders yapıldı görünüyor`, `ders hiç başlamadı`],
      en: [`I want to dispute a lesson`, `the lesson didn't happen`] },
    a: [A(`Biten dersin kartındaki **Sorun bildir** ile itiraz edebilirsin — ders bitiminden sonra **{cfm_h} saat** içinde. Nedenini yazarsın; Berkay Er Zoom katılım kaydına bakıp karar verir ve sonuç dersin satırında görünür. {cfm_h} saat geçtiyse WhatsApp'tan yaz.`,
      `Use **Report a problem** on the finished lesson's card — within **{cfm_h} hours** of the end. Write the reason; Berkay Er checks the Zoom attendance record and decides, and the result shows on the lesson row. If {cfm_h} hours have passed, message him on WhatsApp.`)],
    actions: [ACT.list, ACT.wa] });

  // ───────────────────────── Ödeme ─────────────────────────
  add({ id: 'payment_how', states: ['unpaid'], topic: ['@odeme', '@iban'], follow: ['iban', 'payment_wait'],
    ex: { tr: [`Nasıl ödeme yaparım?`, `ödemeyi nereye yapacağım`, `ödeme adımları neler`, `parayı nasıl göndereceğim`, `ödeme nasıl yapılıyor`, `ödemeyi yaptım ne yapmalıyım`, `ödemeyi yaptım butonu`, `havale yaptım ama butona basmadım`, `havale yaptım bildirmem lazım mı`, `ödeme yöntemi ne`],
      en: [`How do I pay?`, `payment steps`, `I paid, what now`] },
    a: [
      A(`Ödeme bildirimin alındı — Berkay Er havaleyi kontrol edip onaylayacak (genelde 24 saat içinde). Onaylanınca derse katılma, saat değiştirme ve erteleme açılır.`,
        `Your payment notice was received — Berkay Er will check the transfer and confirm (usually within 24 hours). Then joining, changing times and rescheduling unlock.`, 'payPending'),
      A(`Panelin en üstündeki **Yapman gereken** kartında 3 adım var:\n- **{total}** tutarını IBAN'a havale/EFT et (açıklamaya **hiçbir şey yazma**)\n- **Ödemeyi yaptım** düğmesine bas — bildirim Berkay Er'e gider\n- Berkay Er onaylayınca derse katılma, saat değiştirme ve erteleme açılır\n\nIBAN: **{iban}** · {bank} · {iban_name}`,
        `The **To do** card at the top of the panel has 3 steps:\n- Transfer **{total}** to the IBAN (leave the description **empty**)\n- Press **I've paid** — Berkay Er gets notified\n- Once he confirms, joining, changing times and rescheduling unlock\n\nIBAN: **{iban}** · {bank} · {iban_name}`, 'st_unpaid'),
      A(`Ödemen onaylanmış görünüyor, yapman gereken bir şey yok.`, `Your payment is already confirmed; nothing to do.`, 'paid'),
      A(`Ödeme havale/EFT ile yapılır. Talebin onaylanınca IBAN ve tutar bu panelde görünür; havaleyi yapıp **Ödemeyi yaptım** dersin, Berkay Er onaylar.`,
        `Payment is by bank transfer. Once your request is approved, the IBAN and amount appear in this panel; transfer, press **I've paid**, and Berkay Er confirms.`),
    ],
    actions: [ACT.pay, ACT.copyIban] });

  add({ id: 'iban', states: ['unpaid'], topic: ['@iban'], avoid: ['@kilit', '@bekle', '@onay'],
    ex: { tr: [`parayı hangi hesaba atacağım`, `hangi hesaba göndereceğim`, `IBAN nedir?`, `iban numarası ne`, `hesap bilgileri neler`, `hangi bankaya göndereceğim`, `alıcı adı ne`, `havale bilgileri`, `banka hesabı`, `eft bilgisi`, `iban'ı kopyala`],
      en: [`What's the IBAN?`, `bank account details`, `who is the recipient`] },
    a: [
      A(`Banka: **{bank}**\nAlıcı: **{iban_name}**\nIBAN: **{iban}**\n\nAçıklama kısmına **hiçbir şey yazma**. Tutarın: **{total}**.`,
        `Bank: **{bank}**\nRecipient: **{iban_name}**\nIBAN: **{iban}**\n\nLeave the description **empty**. Your amount: **{total}**.`, 'st_unpaid'),
      A(`Banka: **{bank}**\nAlıcı: **{iban_name}**\nIBAN: **{iban}**\n\nAçıklama kısmına **hiçbir şey yazma**.`, `Bank: **{bank}**\nRecipient: **{iban_name}**\nIBAN: **{iban}**\n\nLeave the description **empty**.`, 'signedIn'),
      A(`Ödeme bilgileri giriş yapan öğrencinin panelinde görünür.`, `Payment details are shown in a signed-in student's panel.`),
    ],
    actions: [ACT.copyIban, ACT.pay] });

  add({ id: 'payment_desc', topic: ['@iban', 'aciklama'],
    ex: { tr: [`Havale açıklamasına ne yazayım?`, `açıklama kısmına adımı yazayım mı`, `ödeme açıklaması`, `dekont açıklaması ne olmalı`, `açıklamaya ders yazayım mı`, `havalede açıklama boş mu kalsın`, `açıklama yazmazsam olur mu`, `havale yaparken açıklama alanı`],
      en: [`What should I write in the transfer description?`, `payment reference`] },
    a: [A(`Açıklama kısmına **hiçbir şey yazma** — boş bırak. Havaleden sonra paneldeki **Ödemeyi yaptım** düğmesine basman yeterli.`, `Leave the description **empty** — write nothing. After the transfer just press **I've paid** in the panel.`)],
    actions: [ACT.pay] });

  add({ id: 'payment_wait', states: ['unpaid'], topic: ['@odeme', '@onay', '@bekle'], follow: ['payment_how'],
    ex: { tr: [`Ödemem ne zaman onaylanır?`, `ödeme onayı ne kadar sürer`, `ödeme yaptım hala onaylanmadı`, `ödemem görüldü mü`, `ödeme bildirimim gitti mi`, `ödemeyi yaptım ama dersler açılmadı`, `ödeme onaylandı mı`, `ödeme onayı bekliyor`, `panelde hala ödeme bekleniyor yazıyor`, `parayı gönderdim hala onay yok`, `havaleyi yaptım ne zaman onaylanır`, `ödeme onayı kaç gün sürer`, `ödeme yaptım ama dersler hâlâ kilitli`],
      en: [`When will my payment be confirmed?`, `I paid but it's not confirmed yet`] },
    a: [
      A(`Ödeme bildirimin alındı. Berkay Er havaleyi kontrol edip onaylar — genelde **24 saat içinde**. Onaylanınca bu kart kaybolur; derse katılma, saat değiştirme ve erteleme açılır. Uzarsa WhatsApp'tan yaz.`,
        `Your payment notice was received. Berkay Er checks and confirms the transfer — usually **within 24 hours**. Then the card disappears and joining, changing times and rescheduling unlock. If it takes longer, message him on WhatsApp.`, 'payPending'),
      A(`Henüz **Ödemeyi yaptım** demedin. Havaleyi yaptıysan paneldeki o düğmeye bas; bildirim Berkay Er'e gider ve genelde 24 saat içinde onaylanır.`,
        `You haven't pressed **I've paid** yet. If you've transferred, press it in the panel; Berkay Er gets notified and usually confirms within 24 hours.`, 'st_unpaid'),
      A(`Ödemen onaylanmış.`, `Your payment is confirmed.`, 'paid'),
      A(`Ödeme bildirimi Berkay Er'e gider; havaleyi kontrol edip genelde 24 saat içinde onaylar.`, `The payment notice goes to Berkay Er; he usually confirms within 24 hours.`),
    ],
    actions: [ACT.pay, ACT.wa] });

  add({ id: 'payment_amount', states: ['unpaid', 'active'], topic: ['@odeme', '@fiyat', 'toplam'], need: ['toplam', 'borc', 'tutar', 'miktar', 'odenecek', '@fiyat', 'kadar'],
    ex: { tr: [`ne kadar ödeme yapmam lazım`, `ne kadar ödemeliyim`, `ödemem gereken tutar ne kadar`, `Ne kadar ödeyeceğim?`, `toplam ücretim ne kadar`, `borcum ne kadar`, `ödeyeceğim tutar`, `paketimin fiyatı ne kadar`, `toplam kaç tl`, `ne kadar para göndermeliyim`, `ödenecek miktar`],
      en: [`How much do I have to pay?`, `my total price`] },
    a: [
      A(`Toplam ücretin **{total}** ({plan}).`, `Your total is **{total}** ({plan}).`, 'dash !st_trial'),
      A(`Deneme dersi ücretsiz.`, `The trial lesson is free.`, 'st_trial'),
      A(`Tutar seçtiğin pakete göre talep formundaki fiyat özetinde görünür; onaydan sonra panelde ödeme kartında yazar.`, `The amount shows in the request form's price summary for the package you pick, and on the payment card after approval.`),
    ],
    actions: [ACT.pay] });

  add({ id: 'payment_card', pub: true, topic: ['@odeme', 'kart', 'taksit'],
    ex: { tr: [`Kredi kartıyla ödeyebilir miyim?`, `taksit var mı`, `kartla ödeme yapılır mı`, `taksitli ödeme`, `papara ile ödeyebilir miyim`, `nakit ödeme olur mu`, `yurt dışından nasıl öderim`, `paypal var mı`],
      en: [`Can I pay by credit card?`, `installments`, `paypal`] },
    a: [A(`Panel ödemeyi **havale/EFT** ile alıyor; kart, taksit ya da başka yöntemlerle ilgili bilgi panelde yok. Bunun için WhatsApp'tan Berkay Er'e sor.`,
      `The panel takes payment by **bank transfer**; it has no info on cards, installments or other methods. Ask Berkay Er on WhatsApp.`)],
    actions: [ACT.wa] });

  add({ id: 'unpaid_locked', states: ['unpaid'], topic: ['pasif', '@odeme'],
    ex: { tr: [`Neden saat değiştiremiyorum?`, `butonlar neden pasif`, `ertele gri neden`, `derse katıl kapalı neden`, `hiçbir şeye basamıyorum`, `saati değiştir çalışmıyor`, `neden kilitli`, `düğmeler çalışmıyor`],
      en: [`Why can't I change the time?`, `why are the buttons disabled`] },
    a: [
      A(`Ödemen henüz onaylanmadığı için derse katılma, saat değiştirme ve erteleme kapalı. Havaleyi yapıp **Ödemeyi yaptım** dersin; Berkay Er onaylayınca hepsi açılır.`,
        `Your payment isn't confirmed yet, so joining, changing times and rescheduling are locked. Transfer and press **I've paid**; once Berkay Er confirms, they all unlock.`, 'st_unpaid'),
      A(`Düğme pasifse nedeni yanında yazar. Sık nedenler: derse {self_h} saatten az kaldı (saat değiştirme), {resch_h} saatten az kaldı ya da hakkın yok (erteleme), ders bir kez taşındı, ya da bekleyen bir erteleme talebi var.`,
        `If a button is disabled the reason is shown next to it. Common ones: less than {self_h} hours left (time change), less than {resch_h} hours or no credits (reschedule), already moved once, or a pending reschedule request.`),
    ],
    actions: [ACT.pay] });

  // ───────────────────────── Fiyat / paket ─────────────────────────
  add({ id: 'prices', pub: true, topic: ['@fiyat', '@paket'], follow: ['package_choose', 'single_vs_package'],
    ex: { tr: [`paketler neler`, `Ders fiyatları ne kadar?`, `ücretler nedir`, `paketler ve fiyatlar`, `bir ders kaç para`, `aylık ücret ne kadar`, `ders ücreti`, `kampanyalar neler`, `fiyat listesi`, `ne kadar tutuyor`, `paket fiyatları`, `3 aylık paket ne kadar`, `aylık paket kaç para`, `indirim var mı`, `uzun pakette indirim oluyor mu`, `öğrenci indirimi var mı`, `haftada iki ders olursa fiyat ne`],
      en: [`How much are the lessons?`, `prices and packages`, `what does a lesson cost`] },
    a: [
      A(`Paketlerde ders saati liste fiyatı **{price}**, tek ders **{price_single}**. Kampanyalı paketler:\n{packages}\n\nDeneme dersi ücretsiz.`,
        `The list price is **{price}** per lesson hour in packages; a single lesson is **{price_single}**. Packages:\n{packages}\n\nThe trial lesson is free.`, 'packages'),
      A(`Paketlerde ders saati liste fiyatı **{price}**, tek ders **{price_single}**; uzun ve yoğun paketlerde indirim var. Deneme dersi ücretsiz.`,
        `The list price is **{price}** per lesson hour in packages; a single lesson is **{price_single}**; longer and more intensive packages are discounted. The trial lesson is free.`),
    ],
    actions: [ACT.pkgs] });

  add({ id: 'package_choose', pub: true, topic: ['@paket', 'hangi'], follow: ['prices'], need: ['@paket', '@fiyat', '@indirim', 'ders'],
    ex: { tr: [`paketleri karşılaştır`, `hangi paketi almalıyım`, `Hangi paketi seçmeliyim?`, `paketler arasındaki fark ne`, `en avantajlı paket hangisi`, `en ucuz paket`, `haftada iki ders mi bir ders mi`, `yeni başlayan için hangi paket`, `profesyonel paket nedir`, `paket önerin`, `en iyi paket`, `ayda kaç ders oluyor`, `pakette ayda kaç ders var`, `haftada kaç ders yapılıyor`, `paketlerde kaç ders var`],
      en: [`Which package should I choose?`, `what's the best value package`] },
    a: [
      A(`Paketler süre ve haftalık ders saatine göre değişir (haftada 1 ders = ayda 4 ders); uzadıkça indirim artar:\n{packages}\n\nDers başı en avantajlısı **{cheapest}**. Emin değilsen 1 aylık paketle başlayıp devam edebilir ya da deneme dersinde Berkay Er'e sorabilirsin.`,
        `Packages differ by length and weekly hours (1 lesson a week = 4 a month); discounts grow with length:\n{packages}\n\nBest value per lesson: **{cheapest}**. If unsure, start with 1 month and continue, or ask Berkay Er in the trial lesson.`, 'packages'),
      A(`Paketler süre (1–3 ay) ve haftalık ders saatine (1–2) göre değişir; uzun ve yoğun paketlerde indirim artar. Emin değilsen deneme dersinde Berkay Er'e sorabilirsin.`,
        `Packages differ by length (1–3 months) and weekly hours (1–2); longer and more intensive ones get bigger discounts. If unsure, ask Berkay Er in the trial lesson.`),
    ],
    actions: [ACT.pkgs, ACT.trial] });

  add({ id: 'single_vs_package', pub: true, topic: ['tek', '@paket'],
    ex: { tr: [`Tek ders mi paket mi almalıyım?`, `tek ders alabilir miyim`, `sadece bir ders almak istiyorum`, `tek ders kaç para`, `paket almadan ders olur mu`, `tek seferlik ders`, `tek ders ile paket farkı`, `deneme gibi tek ders`],
      en: [`Single lesson or package?`, `can I book just one lesson`] },
    a: [A(`Tek ders **{price_single}**; paketlerde ders saati **{price}** ve indirimli. Ayrıca paket alan öğrencilerin ders saatleri çakışmada **önceliklidir**. Talep formunda **Tek ders** seçeneği var.`,
      `A single lesson is **{price_single}**; in packages a lesson hour is **{price}** and discounted. Package students also get **priority** when times clash. The request form has a **Single lesson** option.`)],
    actions: [ACT.pkgs] });

  add({ id: 'renew', states: ['ended', 'active'], topic: ['@paket', 'yenile'], follow: ['prices'],
    ex: { tr: [`Paketimi nasıl yenilerim?`, `devam etmek istiyorum yeni paket`, `paketim bitti ne yapmalıyım`, `yeni paket almak istiyorum`, `paketi uzatmak`, `bir ay daha devam etmek istiyorum`, `paket yenileme`, `derslere devam`, `paket bitince yeniden talep mi oluşturacağım`, `devam etmek için tekrar talep göndermem gerekiyor mu`, `aynı gün ve saatlerle devam etmek`, `paket otomatik yenileniyor mu`, `paketim bitti görünüyor ama dersim kalmıştı`],
      en: [`How do I renew my package?`, `I want to continue with a new package`] },
    a: [
      A(`Paketin bitti; bu ekrandaki formdan yeni paketini ve haftalık gün-saatlerini seçip talep gönder (aynı gün-saatleri yeniden seçebilirsin). Berkay Er onaylayınca takvimine işlenir. Bitmemiş bir dersin olduğunu düşünüyorsan WhatsApp'tan yaz.`,
        `Your package has ended; pick a new package and weekly times in the form on this screen and send the request (you can pick the same times again). Once Berkay Er approves, it's added to your calendar. If you think a lesson is missing, message him on WhatsApp.`, 'st_ended'),
      A(`Paketler kendiliğinden yenilenmez. Paketin bitince panel seni yeni talep ekranına alır; oradan devam paketini ve gün-saatlerini (istersen aynılarını) seçip yeni talep gönderirsin. Son dersin: **{end}**. Erken yenilemek istersen WhatsApp'tan Berkay Er'e yaz.`,
        `Packages don't renew automatically. When yours ends the panel moves you to the request screen to pick the next package and times (the same ones if you like) and send a new request. Your last lesson: **{end}**. To renew early, message Berkay Er on WhatsApp.`, 'dash'),
      A(`Yeni paket için talep formundan paketini ve gün-saatlerini seçip talep gönder; Berkay Er onaylar.`, `For a new package, pick it and your times in the request form and send it; Berkay Er approves.`),
    ],
    actions: [ACT.pkgs, ACT.wa] });

  add({ id: 'cancel_refund', pub: true, topic: ['@iptal'], avoid: ['@talep'],
    ex: { tr: [`Paketimi iptal edebilir miyim?`, `para iadesi var mı`, `dersleri iptal etmek istiyorum`, `vazgeçtim paranı geri alabilir miyim`, `iade alabilir miyim`, `planı iptal et`, `ders iptali`, `iptal politikası nedir`, `paketten vazgeçmek`, `paketi iptal etsem param geri gelir mi`],
      en: [`Can I cancel my package?`, `refund policy`] },
    a: [A(`Kural: alınan dersler **iptal edilemez** ve başka birine devredilemez. Belirli bir dersi kaçıracaksan **Ertele** ya da aynı hafta içinde **saati değiştir** kullanabilirsin. Özel bir durum varsa WhatsApp'tan Berkay Er'e yaz.`,
      `Rule: purchased lessons **can't be cancelled** or transferred to someone else. If you'll miss a particular lesson, use **Reschedule** or **change the time** within the same week. For special cases message Berkay Er on WhatsApp.`)],
    actions: [ACT.rules, ACT.wa] });

  add({ id: 'transfer', pub: true, topic: ['devret'],
    ex: { tr: [`Dersimi arkadaşıma devredebilir miyim?`, `paketimi başkasına verebilir miyim`, `başka biri benim yerime derse girebilir mi`, `dersleri kardeşim kullansa`, `devir yapılır mı`, `paketi başkasına aktarmak`, `arkadaşım benim dersime girsin`, `ders devri`],
      en: [`Can I transfer my lessons to a friend?`] },
    a: [A(`Hayır — kurallara göre alınan dersler başka bir kişiye **devredilemez**.`, `No — under the rules, lessons **can't be transferred** to another person.`)],
    actions: [ACT.rules] });

  add({ id: 'freeze', pub: true, topic: ['@dondur'], avoid: ['@site', '@bozuk'],
    ex: { tr: [`Derslerime ara verebilir miyim?`, `paketimi dondurabilir miyim`, `tatile gidiyorum dersler ne olacak`, `bir süre ders alamayacağım`, `dondurma var mı`, `iki hafta ara vermek istiyorum`, `plan donduruldu ne demek`, `askerlik nedeniyle ara`],
      en: [`Can I pause my lessons?`, `freeze my package`] },
    a: [
      A(`Planın şu an **dondurulmuş**; bu sürede ek ders talep edilemez. Ayrıntı ve yeni tarihler için Berkay Er'e WhatsApp'tan yaz.`,
        `Your plan is currently **frozen**; extra lessons can't be requested meanwhile. Message Berkay Er on WhatsApp for details and new dates.`, 'frozen'),
      A(`Panelde öğrencinin kendisinin dondurabileceği bir düğme yok; dondurma Berkay Er'in kararıyla yapılır. Tek tek dersler için **Ertele** (hak kullanır) ya da aynı hafta içinde **saati değiştir** kullanabilirsin. Uzun ara için WhatsApp'tan yaz.`,
        `There's no self-service freeze in the panel; Berkay Er decides on freezing. For single lessons use **Reschedule** (uses a credit) or **change the time** within the same week. For a longer break, message him on WhatsApp.`),
    ],
    actions: [ACT.wa] });

  // ───────────────────────── Deneme dersi ─────────────────────────
  add({ id: 'trial_what', pub: true, topic: ['@deneme'], follow: ['trial_book', 'trial_after'],
    ex: { tr: [`ücretsiz ders ne demek`, `ücretsiz ders nedir`, `Deneme dersi nedir?`, `deneme dersi ücretsiz mi`, `bedava ders var mı`, `deneme dersinde ne yapılıyor`, `ilk ders ücretli mi`, `tanışma dersi`, `deneme dersi kaç dakika`, `deneme dersi ne işe yarar`],
      en: [`What is the trial lesson?`, `is the trial free`] },
    a: [A(`Deneme dersi **ücretsiz** ve {lesson_min} dakika, Zoom üzerinden. Seviyeni, hedeflerini ve hangi türde üretim yapmak istediğini konuşursunuz; hiçbir yükümlülük yok. Kişi başı **bir kez** alınabilir.`,
      `The trial lesson is **free** and {lesson_min} minutes on Zoom. You talk about your level, goals and the styles you want to produce; no obligation. It can be taken **once** per person.`)],
    actions: [ACT.trial, ACT.signin] });

  add({ id: 'trial_book', pub: true, states: ['new'], topic: ['@deneme', 'al'],
    ex: { tr: [`Deneme dersi nasıl alırım?`, `deneme dersi almak istiyorum`, `ücretsiz derse nasıl kayıt olurum`, `deneme dersi için tarih seçmek`, `deneme dersi rezervasyonu`, `deneme dersi istiyorum`, `deneme dersine başvurmak`, `deneme için gün saat seçimi`],
      en: [`How do I book a trial lesson?`, `I want a free trial`] },
    a: [
      A(`Bu ekranda **Deneme Dersi** kartına bas: tarih (en erken {trial_days} gün sonrası) ve boş bir saat seç, WhatsApp numaranı yaz, **Deneme Dersi İste**'ye bas. Berkay Er onaylayınca derse başlarsın.`,
        `On this screen tap the **Trial lesson** card: pick a date (at least {trial_days} days ahead) and a free time, enter your WhatsApp number and press **Request trial**. Once Berkay Er approves, you're set.`, 'st_new'),
      A(`Önce giriş yap; sonra Ders Paneli'nde **Deneme Dersi**'ni seçip tarih (en erken {trial_days} gün sonrası) ve saat belirle. Kişi başı bir kez alınabilir.`,
        `Sign in first, then in the Lesson panel choose **Trial lesson** and pick a date (at least {trial_days} days ahead) and time. It's once per person.`, 'signedOut'),
      A(`Deneme dersi seçim ekranından alınır (tarih en erken {trial_days} gün sonrası). Deneme dersi kişi başı **bir kez** alınabilir.`,
        `Trial lessons are booked from the choice screen (date at least {trial_days} days ahead). It's **once** per person.`),
    ],
    actions: [ACT.trial, ACT.signin] });

  add({ id: 'trial_when', states: ['trial'], topic: ['@deneme', 'ne zaman'],
    ex: { tr: [`Deneme dersim ne zaman?`, `deneme dersim saat kaçta`, `deneme dersi hangi gün`, `deneme dersim onaylandı mı`, `deneme dersimin tarihi`, `ücretsiz dersim ne zaman`, `deneme dersine ne kadar kaldı`, `deneme dersi bugün mü`],
      en: [`When is my trial lesson?`, `trial lesson time`] },
    a: [
      A(`Deneme dersin **{trial}** (İstanbul saati), **{next_in}** sonra. Dersten {join_min} dakika önce ders kartında **Derse Katıl** düğmesi açılır.`,
        `Your trial lesson is **{trial}** (Istanbul time), in **{next_in}**. The **Join** button appears on the lesson card {join_min} minutes before.`, 'st_trial'),
      A(`Deneme talebin Berkay Er'in onayında: **{pend_when}**. Onaylanınca bu sayfa kendiliğinden güncellenir.`,
        `Your trial request is awaiting Berkay Er's approval: **{pend_when}**. This page updates by itself once approved.`, 'pendTrial'),
      A(`Şu an planlanmış bir deneme dersin görünmüyor.`, `I don't see a planned trial lesson right now.`),
    ],
    actions: [ACT.week, ACT.pending] });

  add({ id: 'trial_after', pub: true, topic: ['@deneme', 'sonra'],
    ex: { tr: [`Deneme dersinden sonra ne olacak?`, `deneme bitti şimdi ne yapmalıyım`, `deneme dersinden sonra paket nasıl alırım`, `deneme sonrası süreç`, `denemeden sonra devam etmek istiyorum`, `deneme dersi bitti`, `denemeden sonra fiyat teklifi`, `deneme sonrası kayıt`],
      en: [`What happens after the trial lesson?`, `trial is done, what now`] },
    a: [A(`Deneme dersinden sonra bu panelden **kampanyalı paket** ya da **tek ders** talebi oluşturursun: paketini ve haftalık gün-saatlerini seçersin, Berkay Er onaylar, ardından ödeme bilgileri panelde görünür.`,
      `After the trial you send a **package** or **single lesson** request from this panel: pick your package and weekly times, Berkay Er approves, then payment details appear in the panel.`)],
    actions: [ACT.pkgs] });

  add({ id: 'trial_again', pub: true, topic: ['@deneme', 'tekrar'],
    ex: { tr: [`İkinci kez deneme dersi alabilir miyim?`, `tekrar deneme dersi`, `deneme dersi daha önce alınmış diyor`, `başka hesapla deneme dersi`, `deneme dersini tekrar almak`, `bir deneme daha`, `deneme hakkım bitti mi`, `deneme dersi kaç kere alınır`],
      en: [`Can I take another trial lesson?`, `trial already used`] },
    a: [A(`Deneme dersi kişi başı **yalnızca bir kez** alınabilir (e-posta, telefon ve bağlantı ayrı ayrı kontrol edilir). Devam etmek için paket ya da tek ders seçebilirsin.`,
      `The trial is **once per person** (email, phone and connection are each checked). To continue, pick a package or a single lesson.`)],
    actions: [ACT.pkgs, ACT.wa] });

  // ───────────────────────── Talep süreci ─────────────────────────
  add({ id: 'request_status', states: ['pending'], topic: ['@talep', '@bekle'], follow: ['request_edit'], avoid: ['@odeme', '@iban', '@ertele'],
    ex: { tr: [`Talebim ne zaman onaylanır?`, `talebim beklemede ne kadar sürer`, `başvurum onaylandı mı`, `talep durumum ne`, `ne zaman cevap gelecek`, `talebimi gördü mü`, `onay ne kadar sürüyor`, `hala beklemede`, `talebim neden onaylanmadı`, `talebime ne zaman dönüş yapılır`, `başvuruma cevap gelmedi`],
      en: [`When will my request be approved?`, `request still pending`] },
    a: [
      A(`Talebin Berkay Er'in onayında ({pend_type}). Onaylanınca bu sayfa **kendiliğinden güncellenir** ve WhatsApp'tan bildirim gelir. WhatsApp politikası gereği sana yazılabilmesi için önce senin kısa bir mesaj atman gerekiyor — ekrandaki **WhatsApp ile mesaj at** düğmesini kullan.`,
        `Your request is awaiting Berkay Er's approval ({pend_type}). When approved this page **updates by itself** and you get a WhatsApp notice. Due to WhatsApp policy you need to send a short message first — use the **Message on WhatsApp** button on screen.`, 'st_pending'),
      A(`Talebin reddedilmiş görünüyor. Nedeni ekranda yazıyor; yeni bir talep oluşturabilirsin.`, `Your request appears to be rejected. The reason is on screen; you can create a new request.`, 'st_rejected'),
      A(`Ders talebin onaylanmış; paketin aktif ve derslerin panelde. Bekleyen **{credits_pending}** erteleme talebin var — Berkay Er yanıtlayınca takvimin güncellenir ve WhatsApp'tan bildirim gelir.`,
        `Your lesson request is approved; your package is active and your lessons are in the panel. You have **{credits_pending}** pending reschedule request(s) — your calendar updates and you get a WhatsApp notice once Berkay Er answers.`, 'dash creditsInPending'),
      A(`Ders talebin onaylanmış; paketin aktif ve derslerin panelde. Bekleyen bir erteleme talebin görünmüyor. Ek ders talebi gönderdiysen Berkay Er onaylayınca takvimine eklenir.`,
        `Your lesson request is approved; your package is active and your lessons are in the panel. I don't see a pending reschedule request. If you sent an extra-lesson request, it's added to your calendar once Berkay Er approves.`, 'dash'),
      A(`Talepler Berkay Er'in onayına gider; onaylanınca panel kendiliğinden güncellenir.`, `Requests go to Berkay Er for approval; the panel updates by itself once approved.`),
    ],
    actions: [ACT.pending, ACT.wa] });

  add({ id: 'request_edit', states: ['pending'], topic: ['@talep', '@degis'],
    ex: { tr: [`Talebimi değiştirebilir miyim?`, `yanlış saat seçtim talebi düzeltmek`, `talebi geri çekmek istiyorum`, `talebimi iptal etmek`, `başka paket seçmek istiyorum talep gönderdim`, `talebi silmek`, `gönderdiğim talebi düzenlemek`, `talebimde hata var`],
      en: [`Can I edit my request?`, `withdraw my request`] },
    a: [
      A(`Talebin onaylanıp paketin başladığı için artık geri çekilemez; kurallara göre alınan dersler iptal edilemez. (Bekleyen bir talep **Talebi geri çek** ile silinebilir.) Tek tek dersler için **Ertele** ya da aynı hafta içinde **saati değiştir** kullanabilirsin; özel durum için WhatsApp'tan Berkay Er'e yaz.`,
        `Your request is approved and the package has started, so it can't be withdrawn now; under the rules purchased lessons can't be cancelled. (A pending request can be deleted with **Withdraw request**.) For single lessons use **Reschedule** or **change the time** within the same week; for special cases message Berkay Er on WhatsApp.`, 'dash'),
      A(`Bekleyen talep düzenlenemez ama **Talebi geri çek** ile silebilirsin; sonra hemen yeni bir talep oluşturursun. Düğme talep ekranının altında.`,
        `A pending request can't be edited, but you can delete it with **Withdraw request** and immediately create a new one. The button is at the bottom of the request screen.`),
    ],
    actions: [ACT.pending] });

  add({ id: 'request_rejected', states: ['rejected'], topic: ['@talep', '@red'], need: ['@red'],
    ex: { tr: [`Talebim reddedildi ne yapmalıyım?`, `neden reddedildi`, `talep reddedildi yazıyor`, `başvurum kabul edilmedi`, `red sebebi ne`, `yeniden talep göndermek`, `reddedilen talep`, `tekrar başvurabilir miyim`],
      en: [`My request was rejected`, `why was it rejected`] },
    a: [A(`Red nedeni talep ekranında yazar (Berkay Er'in notu). **Yeni Talep Oluştur** ile farklı gün-saat ya da paketle tekrar gönderebilirsin; soruların için WhatsApp'tan yaz.`,
      `The rejection reason is shown on the request screen (Berkay Er's note). Use **New request** to try other times or a different package; for questions message him on WhatsApp.`)],
    actions: [ACT.wa] });

  add({ id: 'how_request', pub: true, states: ['new', 'request'], topic: ['@talep', '@paket'],
    ex: { tr: [`Ders talebi nasıl oluştururum?`, `paket nasıl alınır`, `derslere nasıl kayıt olurum`, `gün ve saat nasıl seçilir`, `talep formu nasıl doldurulur`, `haftalık saat seçimi`, `kayıt olmak istiyorum`, `nasıl başlarım`, `derse başlamak istiyorum`],
      en: [`How do I request lessons?`, `how do I sign up for lessons`, `how to pick days and times`] },
    a: [
      A(`Talep formunda:\n- Bir **kampanyalı paket** (ya da **Tek ders**) seç\n- Gün-saat tablosundan paketin haftalık ders sayısı kadar saat seç (saatler İstanbul saati)\n- İstersen başlangıç tarihi seç (boşsa en yakın uygun hafta)\n- WhatsApp numaranı yaz ve gönder\n\nBerkay Er onaylayınca IBAN ve tutar panelde görünür.`,
        `In the request form:\n- Pick a **package** (or **Single lesson**)\n- Select as many weekly hours as the package has in the day/time grid (Istanbul time)\n- Optionally pick a start date (empty = nearest available week)\n- Enter your WhatsApp number and send\n\nOnce Berkay Er approves, the IBAN and amount appear in the panel.`, 'signedIn'),
      A(`Önce giriş yap. Sonra Ders Paneli'nde paketini ve haftalık gün-saatlerini seçip talep gönderirsin; Berkay Er onaylar. İstersen önce ücretsiz deneme dersi alabilirsin.`,
        `Sign in first. Then in the Lesson panel pick your package and weekly times and send the request; Berkay Er approves. You can take a free trial first.`),
    ],
    actions: [ACT.pkgs, ACT.signin] });

  add({ id: 'wait_whatsapp', states: ['pending'], topic: ['@whatsapp', 'mesaj'],
    ex: { tr: [`Neden WhatsApp'tan mesaj atmam gerekiyor?`, `whatsapp mesajı zorunlu mu`, `önce benim mi yazmam lazım`, `whatsapp iletişimini başlatmak`, `bana neden whatsapp'tan dönülmüyor`, `whatsapp'tan mesaj gelmedi`, `whatsapp bildirimi`],
      en: [`Why do I need to message on WhatsApp first?`, `I don't get WhatsApp messages`] },
    a: [A(`WhatsApp politikası gereği sana mesaj gönderilebilmesi için **önce senin kısa bir mesaj atman** gerekiyor; yoksa bildirimler ve hatırlatmalar ulaşmaz. Ekrandaki **WhatsApp ile mesaj at** düğmesi mesajı hazır açar, sadece **Gönder**'e bas.`,
      `Due to WhatsApp policy, **you need to send a short message first** so notices and reminders can reach you. The **Message on WhatsApp** button opens a ready message — just press **Send**.`)],
    actions: [ACT.pending, ACT.wa] });

  add({ id: 'reminders', pub: true, topic: ['hatirlat', '@whatsapp'],
    ex: { tr: [`Ders hatırlatması gelecek mi?`, `dersten önce bildirim geliyor mu`, `hatırlatma mesajı ne zaman gelir`, `whatsapp hatırlatma`, `e-posta hatırlatması`, `dersi unutmamak için bildirim`, `hatırlatma gelmiyor`, `bir saat önce mesaj geliyor mu`],
      en: [`Will I get lesson reminders?`, `reminder messages`] },
    a: [
      A(`Evet: dersten **24 saat önce** WhatsApp + e-posta, **1 saat önce** WhatsApp hatırlatması gelir. WhatsApp için numaranın kayıtlı olması gerekiyor — panelde numaranı eklemeni isteyen kutu var.`,
        `Yes: **24 hours before** via WhatsApp + email and **1 hour before** via WhatsApp. WhatsApp needs your number on file — the panel shows a box asking you to add it.`, 'needPhone'),
      A(`Evet: dersten **24 saat önce** WhatsApp + e-posta, **1 saat önce** WhatsApp hatırlatması gelir. WhatsApp mesajları gelmiyorsa bir kez sen yazmalısın (WhatsApp kuralı) ya da numaranı kontrol ettirmek için Berkay Er'e yaz.`,
        `Yes: **24 hours before** via WhatsApp + email and **1 hour before** via WhatsApp. If WhatsApp messages don't arrive, you need to message once first (WhatsApp rule) or ask Berkay Er to check your number.`),
    ],
    actions: [ACT.phone, ACT.wa] });

  add({ id: 'phone', topic: ['telefon', 'numara'], avoid: ['@site', '@bozuk', '@oneri'],
    kw: [`numara`, `numaram`], ex: { tr: [`whatsapp numaram yanlış yazılmış`, `numaramı değiştirmek istiyorum`, `numaram yanlış kayıtlı`, `Telefon numaramı nasıl değiştiririm?`, `numaramı yanlış yazdım`, `whatsapp numaramı güncellemek`, `numara eklemek`, `telefon numarası nereye yazılır`, `yeni numaram var`, `yurt dışı numara olur mu`, `numaramı kaydetmek`],
      en: [`How do I change my phone number?`, `update my WhatsApp number`] },
    a: [
      A(`Panelde **WhatsApp numaran** kutusu var; numaranı oraya yazıp **Kaydet**'e bas, sonra WhatsApp'tan bir kez mesaj at.`, `There's a **WhatsApp number** box in the panel; enter it, press **Save**, then send one WhatsApp message.`, 'needPhone'),
      A(`Numaran kayıtlı. Değiştirmek için panelde düğme yok; yeni numaranı WhatsApp'tan Berkay Er'e yaz. Yurt dışı numarayı **+** ve ülke koduyla yazabilirsin.`,
        `Your number is on file. There's no button to change it; send your new number to Berkay Er on WhatsApp. International numbers go with **+** and the country code.`),
    ],
    actions: [ACT.phone, ACT.wa] });

  // ───────────────────────── Seviye sınavı ─────────────────────────
  add({ id: 'placement', pub: true, topic: ['@seviye'], follow: ['placement_result'],
    ex: { tr: [`Seviye belirleme sınavı nedir?`, `sınav zorunlu mu`, `seviye sınavı kaç soru`, `sınavı nereden çözerim`, `seviye testi`, `sınava başla`, `sınav ne kadar sürüyor`, `seviye belirleme neden gerekli`, `sınavı daha sonra çözebilir miyim`, `sınava girmeli miyim`, `hiç bilgim yok sınavı çözeyim mi`, `sınavı çözmeden derse başlayabilir miyim`, `sınav ingilizce var mı`],
      en: [`What is the placement test?`, `is the level test mandatory`] },
    a: [
      A(`Seviye belirleme sınavı dersin sana göre kurgulanması için: **{pt_n} soru, yaklaşık 8 dakika**. Ödemesi onaylı aktif öğrenci dışında herkese zorunlu; hiç bilgin olmasa da çöz — bilmediğin soruyu boş geçmen sorun değil. Henüz çözmedin — kart panelde duruyor; istersen şimdi açabilirsin. Sayfa dili **EN** ise sorular İngilizce gelir.`,
        `The placement test tailors the lessons to you: **{pt_n} questions, about 8 minutes**. It's required for everyone except active, paid students; take it even as a complete beginner. You haven't taken it yet — the card is in the panel; open it now if you like. With the page set to **EN** the questions are in English.`, 'ptMissing'),
      A(`Seviye belirleme sınavını çözmüşsün: seviyen **{level}**{score_txt}. Sınav ({pt_n} soru, yaklaşık 8 dakika) ödemesi onaylı aktif öğrenci dışında herkese zorunlu; bilgin az olsa da çöz — dersler sonuca göre kurgulanır. Sayfa dili **EN** ise sorular İngilizce gelir.`,
        `You've taken the placement test: your level is **{level}**{score_txt}. The test ({pt_n} questions, about 8 minutes) is required for everyone except active, paid students; take it even as a beginner — lessons are planned from the result. With the page set to **EN** the questions are in English.`, 'ptDone'),
      A(`Seviye belirleme sınavı dersin sana göre kurgulanması için kısa bir test (yaklaşık 8 dakika). Giriş yapınca panelde kartı görünür.`,
        `The placement test is a short test (about 8 minutes) to tailor the lessons to you. Its card appears in the panel after you sign in.`),
    ],
    actions: [ACT.placement, ACT.ptCard] });

  add({ id: 'placement_result', topic: ['@seviye', 'sonuc'],
    kw: [`puan`, `sonuç`, `kaç aldım`], ex: { tr: [`sınav puanım ne`, `Seviyem ne?`, `sınav sonucum ne`, `kaç puan aldım`, `seviye sonucumu görmek`, `sınavdan ne çıktı`, `seviyemi öğrenmek istiyorum`, `hangi seviyedeyim`, `test sonucu`],
      en: [`What's my level?`, `my test result`] },
    a: [
      A(`Seviyen **{level}**{score_txt}. Berkay Er dersleri buna göre planlar.`, `Your level is **{level}**{score_txt}. Berkay Er plans the lessons accordingly.`, 'ptDone'),
      A(`Henüz seviye belirleme sınavını çözmedin. {pt_n} soru, yaklaşık 8 dakika.`, `You haven't taken the placement test yet. {pt_n} questions, about 8 minutes.`, 'ptMissing'),
      A(`Sınav sonucun giriş yaptığında panelde görünür.`, `Your result shows in the panel when you're signed in.`),
    ],
    actions: [ACT.placement, ACT.ptCard] });

  add({ id: 'placement_retake', topic: ['@seviye', 'tekrar'],
    kw: [`yeniden`, `tekrar`, `sıfırla`, `baştan`], ex: { tr: [`sınavı yeniden yapmak`, `Sınavı tekrar çözebilir miyim?`, `seviye sınavını yeniden yapmak`, `sınavı yanlış çözdüm`, `testi baştan almak`, `sınavı sıfırlamak`, `sınavda hata yaptım`, `ikinci kez sınav`, `sonucu değiştirmek`],
      en: [`Can I retake the placement test?`] },
    a: [A(`Sınav bir kez çözülür; tekrar çözebilmen için Berkay Er'in sonucunu sıfırlaması gerekiyor. İstersen WhatsApp'tan yaz ya da asistan üzerinden ona ilet.`,
      `The test can be taken once; to retake it Berkay Er needs to reset your result. Message him on WhatsApp or forward it through the assistant.`)],
    actions: [ACT.wa, ACT.forward] });

  // ───────────────────────── Kurallar ─────────────────────────
  add({ id: 'rules', pub: true, topic: ['@kural'],
    ex: { tr: [`Ders kuralları neler?`, `kurallar nerede`, `kuralları görmek istiyorum`, `ders politikası`, `şartlar neler`, `kuralları oku`, `hangi kurallar var`, `ders kuralları özet`],
      en: [`What are the lesson rules?`, `show the rules`] },
    a: [A(`Özetle:\n- **Saat değiştirme**: {self_h} saatten fazla varsa aynı hafta içinde, ders başına bir kez, ücretsiz\n- **Erteleme**: N aylık paket = N hak, en az {resch_h} saat önce, ders 1 hafta ileri; ek hak {extra_price}\n- Kullanılmayan haklar paket bitince sona erer\n- **{late_min} dakika** içinde girilmeyen ders yapılmış sayılır\n- Haber vermeden katılmamak: ders yapılmış sayılır\n- Dersler iptal edilemez, devredilemez\n- Ders içerikleri Berkay Er'e aittir, paylaşılamaz\n- {cfm_h} saat içinde itiraz edilmeyen ders yapılmış sayılır`,
      `In short:\n- **Change time**: more than {self_h} hours before, same week, once per lesson, free\n- **Reschedule**: N-month package = N credits, at least {resch_h} hours ahead, moves one week; extra credit {extra_price}\n- Unused credits expire when the package ends\n- Not joining within **{late_min} minutes** counts as done\n- No-show without notice counts as done\n- Lessons can't be cancelled or transferred\n- Lesson content belongs to Berkay Er and can't be shared\n- Lessons not disputed within {cfm_h} hours count as done`)],
    actions: [ACT.rules] });

  add({ id: 'rules_accept', topic: ['@kural', '@onay'],
    ex: { tr: [`Kuralları kabul et penceresi neden çıkıyor?`, `kuralları onaylamam gerekiyor mu`, `okudum onaylıyorum kutuları`, `kural onayı`, `her kurala tek tek onay`, `kurallar güncellendi diyor`, `onay penceresi kapanmıyor`, `kuralları kabul etmeden devam edebilir miyim`],
      en: [`Why do I have to accept the rules?`, `rules acceptance window`] },
    a: [A(`Ders kuralları ilk paket onayında bir kez kabul edilir; her kuralın yanında ayrı **Okudum, onaylıyorum** kutusu var (kayıt için). Kurallar güncellenince yeni maddeyi bir kez daha onaylaman istenir. Hepsini işaretleyip onaylayınca pencere kapanır.`,
      `The rules are accepted once after your first package approval; each rule has its own **I've read and accept** box (for the record). When rules change you're asked to accept the new item once. Tick them all and confirm to close it.`)],
    actions: [ACT.rules] });

  add({ id: 'copyright', pub: true, topic: ['telif', 'paylas'],
    ex: { tr: [`Derste yapılan parçayı paylaşabilir miyim?`, `ders içeriklerini paylaşmak`, `telif hakkı kuralı`, `derste yaptığımız projeyi yayınlayabilir miyim`, `ders videosunu paylaşabilir miyim`, `berkay'ın parçasını kullanmak`, `ders dosyalarını arkadaşıma atmak`, `içerikleri dağıtmak`],
      en: [`Can I share the track made in the lesson?`, `copyright rule`] },
    a: [A(`Kural: Berkay Er'in derste paylaştığı ve yaptığı parçalar/içerikler **kendisine aittir**; hiçbir şekilde paylaşılamaz veya dağıtılamaz. Kendi ürettiğin müzik için emin olmadığın bir durum varsa Berkay Er'e sor.`,
      `Rule: tracks and content Berkay Er shares or makes in lessons **belong to him**; they can't be shared or distributed. If you're unsure about your own music, ask Berkay Er.`)],
    actions: [ACT.rules] });

  // ───────────────────────── Kaynaklar ─────────────────────────
  add({ id: 'samples', pub: true, topic: ['@sample'], follow: ['preset_install'], avoid: ['@produksiyon'],
    ex: { tr: [`Sample ve presetler nerede?`, `serum presetleri nereden indiririm`, `drive linki`, `sample paketleri`, `derste kullanılan sesler`, `preset klasörü`, `drive'ı aç`, `500 gb sample`],
      en: [`Where are the samples and presets?`, `serum presets download`] },
    a: [
      A(`Panelin yan sütunundaki **Sample & Serum Presetleri** kartında Drive klasörü var: derslerde kullanılan sample paketleri ve Serum presetleri, Mac için VST dosyaları. **Derse başlamadan önce kur.**`,
        `The **Samples & Serum presets** card in the side column links to the Drive folder: sample packs and Serum presets used in lessons, plus VST files for Mac. **Install them before your first lesson.**`, 'signedIn'),
      A(`Sample ve preset klasörü (Drive) giriş yapan öğrencinin Ders Paneli'nde, yan sütunda.`, `The samples & presets folder (Drive) is in the side column of a signed-in student's Lesson panel.`),
    ],
    actions: [ACT.samples, ACT.signin] });

  add({ id: 'plugins', pub: true, topic: ['@plugin'], avoid: ['@produksiyon'],
    ex: { tr: [`Hangi pluginler gerekli?`, `plugin listesi nerede`, `hangi vst'leri kurmalıyım`, `derslerde kullanılan eklentiler`, `serum gerekli mi`, `plugin listesini gör`, `ücretli plugin lazım mı`, `hangi efektler kullanılıyor`],
      en: [`Which plugins do I need?`, `plugin list`] },
    a: [
      A(`Yan sütundaki **Plugin Listesi** kartı derslerde kullanılan tüm VST plugin'lerin listesini açar; neye ihtiyacın olduğunu oradan görüp kurulumu planlayabilirsin.`,
        `The **Plugin list** card in the side column opens the list of all VST plugins used in lessons; check what you need and plan the install.`, 'signedIn'),
      A(`Plugin listesi giriş yapan öğrencinin Ders Paneli'nde, yan sütunda.`, `The plugin list is in the side column of a signed-in student's Lesson panel.`),
    ],
    actions: [ACT.plugins, ACT.signin] });

  add({ id: 'preset_install', pub: true, topic: ['@kurulum', '@sample'], avoid: ['@produksiyon'],
    ex: { tr: [`Serum preset nasıl kurulur?`, `sample'ları Ableton'a nasıl eklerim`, `presetleri nereye atmalıyım`, `vst nasıl yüklenir`, `plugin kurulumu nasıl yapılır`, `serum presetleri görünmüyor`, `Ableton'da sample klasörü eklemek`, `pluginler ableton'da çıkmıyor`, `kurulumda sorun var`],
      en: [`How do I install Serum presets?`, `add samples to Ableton`, `plugin not showing in Ableton`] },
    a: [A(`Genel adımlar:\n- **Sample'lar**: klasörü bilgisayarına indir; Ableton tarayıcısında **Places → Add Folder** ile ekle\n- **Serum presetleri**: Serum'un preset klasörüne kopyala (Serum menüsünden **Show Serum Presets Folder** ile bulunur), sonra Serum'da tarayıcıyı yenile\n- **VST/AU**: kurduktan sonra Ableton **Settings → Plug-Ins**'te VST/AU'yu aç ve **Rescan** yap\n\nOlmazsa ekran görüntüsüyle WhatsApp'tan Berkay Er'e yaz.`,
      `General steps:\n- **Samples**: download the folder; in Ableton's browser use **Places → Add Folder**\n- **Serum presets**: copy them into Serum's preset folder (Serum menu → **Show Serum Presets Folder**), then refresh Serum's browser\n- **VST/AU**: after installing, enable VST/AU in Ableton **Settings → Plug-Ins** and press **Rescan**\n\nIf it still fails, send Berkay Er a screenshot on WhatsApp.`)],
    actions: [ACT.samples, ACT.wa] });

  add({ id: 'ableton_version', pub: true, topic: ['@ableton', 'surum'], avoid: ['@korsan'],
    ex: { tr: [`Hangi Ableton sürümü lazım?`, `Ableton Live 12 mi 11 mi`, `Ableton suite gerekli mi`, `Ableton'ın deneme sürümü olur mu`, `hangi versiyonu kurmalıyım`, `ableton intro yeterli mi`, `ableton almam gerekiyor mu`, `ableton lisansı`, `FL Studio biliyorum Ableton'a geçmem gerekir mi`, `logic kullanıyorum ableton şart mı`, `başka bir DAW ile ders olur mu`, `ableton 11 ile derse girebilir miyim`, `hangi programı kullanıyoruz`, `derslerde hangi program kullanılıyor`, `hangi DAW`, `hangi DAW kullanılıyor`, `hangi yazılımla çalışıyoruz`],
      en: [`Which Ableton version do I need?`, `is the Ableton trial enough`, `which DAW do we use`, `which software do we use`] },
    a: [A(`Eğitim **Ableton Live 12** üzerine kurulu ve dersler Ableton'la yapılır. Başlamak için **en az Intro sürümü** yüklü bir bilgisayar yeterli — **deneme sürümü de olur**. FL Studio, Logic gibi başka bir DAW biliyorsan avantajdır; derslerde Ableton'a geçersin. Hangi sürümün hedeflerine yeteceğini deneme dersinde ya da WhatsApp'tan Berkay Er'e sor.`,
      `The course is built on **Ableton Live 12** and lessons use Ableton. To start, a computer with **at least the Intro edition** is enough — **the trial version works too**. Knowing another DAW like FL Studio or Logic helps; you'll switch to Ableton in the lessons. Ask Berkay Er in the trial lesson or on WhatsApp which edition suits your goals.`)],
    actions: [ACT.wa] });

  add({ id: 'computer', pub: true, topic: ['bilgisayar', '@donanim'], avoid: ['@oneri'],
    kw: [`macbook`, `laptop`, `pc`, `bilgisayar`, `ram`, `işlemci`, `windows`, `mac`, `yeterli`], ex: { tr: [`laptopum yeterli mi`, `Hangi bilgisayar lazım?`, `mac mi windows mu`, `ekipman gerekli mi`, `midi klavye lazım mı`, `ses kartı gerekli mi`, `derse ne hazırlamalıyım`, `kulaklık lazım mı`, `laptop yeter mi`, `push almam gerekiyor mu`, `kontrolcü şart mı`, `bilgisayarım eski olur mu`],
      en: [`What computer do I need?`, `mac or windows`, `do I need equipment`] },
    a: [
      A(`Marka/model önerisi vermiyorum — ekipman seçimi hedefine ve bütçene bağlı; deneme dersinde Berkay Er kişiye özel öneri yapar, istersen WhatsApp'tan da sorabilirsin. Genel ihtiyaç: Ableton Live (en az Intro) yüklü bir bilgisayar; **MIDI klavye zorunlu değil**, kulaklık ya da monitör hoparlör faydalı.`,
        `I don't recommend brands or models — gear depends on your goals and budget; Berkay Er gives personal advice in the trial lesson, or ask him on WhatsApp. The basics: a computer with Ableton Live (Intro or above); **a MIDI keyboard isn't required**, headphones or monitors help.`, 'qOneri'),
      A(`Başlamak için Ableton Live (en az Intro) yüklü bir bilgisayar (Mac ya da Windows) yeterli; dersler Zoom'da ekran paylaşımıyla yapıldığı için iyi bir internet bağlantısı da gerekir. **MIDI klavye zorunlu değil**; kulaklık ya da monitör hoparlör faydalı. Push, ses kartı gibi ekipmanlar ve marka/model önerisi için deneme dersinde kişiye özel öneri yapılır — Berkay Er'e sor.`,
      `To start, a computer (Mac or Windows) with Ableton Live (Intro or above) is enough; lessons run on Zoom with screen sharing, so a good internet connection matters too. **A MIDI keyboard isn't required**; headphones or monitors help. For gear like Push or an audio interface, and brand/model advice, you get a personal recommendation in the trial lesson — ask Berkay Er.`),
    ],
    actions: [ACT.wa] });

  add({ id: 'ableton_lab', pub: true, topic: ['@lab'], avoid: ['@produksiyon'],
    ex: { tr: [`Ableton Lab nedir?`, `lab nerede`, `laboratuvar ne işe yarıyor`, `ableton lab'a nasıl girerim`, `lab'da ne var`, `synth modülü`, `lab ücretli mi`, `interaktif araçlar`],
      en: [`What is Ableton Lab?`, `where is the lab`] },
    a: [A(`**Ableton Lab** sitedeki interaktif çalışma alanı: synth, mixing, mastering, aranjman gibi modüllerle tarayıcıda deneyerek öğrenirsin. Menüden **Lab**'a girebilirsin.`,
      `**Ableton Lab** is the site's interactive workspace: modules like synth, mixing, mastering and arrangement you can try right in the browser. Open **Lab** from the menu.`)],
    actions: [ACT.lab] });

  add({ id: 'homework', pub: true, topic: ['@odev'],
    kw: [`hazırlan`, `hazırlık`, `ödev`], ex: { tr: [`derse nasıl hazırlanayım`, `Ödev var mı?`, `derse hazırlıklı gelmem için ne yapmalıyım`, `dersler arasında ne çalışmalıyım`, `pratik önerisi`, `ödevimi nereye göndereceğim`, `ilk derse hazırlık`, `derste ne yapacağız`, `haftalık çalışma`],
      en: [`Is there homework?`, `how should I prepare for the lesson`] },
    a: [A(`Ödev ve ders içeriği Berkay Er'in sana göre planladığı programa bağlı; panelde ödev bölümü yok. İlk dersten önce **sample/presetleri ve plugin'leri kur**, seviye sınavını çöz; sorularını **Soru Sor** kartından ya da WhatsApp'tan iletebilirsin.`,
      `Homework and lesson content depend on the plan Berkay Er makes for you; the panel has no homework section. Before your first lesson **install the samples/presets and plugins** and take the placement test; send questions via the **Ask a question** card or WhatsApp.`)],
    actions: [ACT.samples, ACT.qa] });

  add({ id: 'recordings', pub: true, topic: ['kayit', 'video'],
    kw: [`kayıt`, `kaydedil`, `video`, `record`], ex: { tr: [`ders videosu var mı`, `geçmiş derslerin videoları`, `derslerimiz kayda alınıyor mu`, `kayıt alıyor musunuz derste`, `Derslerin kaydı var mı?`, `dersi kaydedebilir miyim`, `ders videosu paylaşılıyor mu`, `geçen dersin kaydı`, `ders notları nerede`, `ders kaydını izlemek`, `zoom kaydı alınıyor mu`, `ders sonrası özet`],
      en: [`Are lessons recorded?`, `can I get the lesson recording`] },
    a: [A(`Panelde ders kaydı ya da video bölümü yok; Zoom'da yalnız katılım kaydı (giriş/çıkış saatleri) ders kanıtı olarak saklanır. Ders notu ya da kayıt isteğin varsa Berkay Er'e sor.`,
      `The panel has no recordings or video section; only Zoom attendance (join/leave times) is kept as lesson proof. If you'd like notes or a recording, ask Berkay Er.`)],
    actions: [ACT.qa, ACT.wa] });

  // ───────────────────────── Hesap / site ─────────────────────────
  add({ id: 'login', pub: true, topic: ['@sifre'],
    ex: { tr: [`Giriş yapamıyorum`, `şifremi unuttum`, `nasıl giriş yaparım`, `hesaba giremiyorum`, `şifre sıfırlama`, `google ile giriş`, `kayıt olmak istiyorum hesap aç`, `instagram'dan açınca giriş olmuyor`, `e-posta ile giriş`, `google ile giriş yapamıyorum`, `hesabıma giremiyorum`, `siteye giremiyorum`],
      en: [`I can't sign in`, `forgot my password`, `how do I log in`] },
    a: [
      A(`Sağ üstteki giriş düğmesine bas: **Google** ile ya da **e-posta/şifre** ile giriş yapabilir, yeni hesap açabilir ya da **şifreni sıfırlayabilirsin** (sıfırlama bağlantısı e-postana gelir). Instagram/TikTok içinden açtıysan Google girişi çalışmayabilir; sayfayı tarayıcıda aç ya da e-posta ile gir.`,
        `Tap the sign-in button at the top: sign in with **Google** or **email/password**, create an account, or **reset your password** (a link is emailed to you). If you opened the site inside Instagram/TikTok, Google sign-in may fail; open it in your browser or use email.`, 'signedOut'),
      A(`Şu an bu cihazda giriş yapmışsın. Başka bir cihazda ya da tarayıcıda giremiyorsan:\n- Instagram/TikTok içinden açtıysan Google girişi çalışmaz; sayfayı Safari/Chrome'da aç ya da **e-posta** ile gir\n- Şifreni unuttuysan giriş penceresindeki **Şifremi unuttum** sıfırlama bağlantısı gönderir\n- Google ile kayıt olduysan aynı Google hesabını seç`,
        `You're signed in on this device. If you can't sign in elsewhere:\n- Inside Instagram/TikTok, Google sign-in fails; open the page in Safari/Chrome or use **email**\n- Forgot your password? **Forgot password** in the sign-in window sends a reset link\n- If you registered with Google, pick the same Google account`),
    ],
    actions: [ACT.signin] });

  add({ id: 'account', topic: ['hesap', 'e-posta'],
    ex: { tr: [`E-posta adresimi değiştirmek istiyorum`, `hesabımı silmek istiyorum`, `adımı değiştirmek`, `profil bilgilerim`, `hesabımı kapat`, `kullanıcı adımı değiştirmek`, `profil fotoğrafı`, `hesap ayarları`],
      en: [`Change my email`, `delete my account`] },
    a: [A(`Ad ve fotoğrafını **Profil** sayfasından düzenleyebilirsin. E-posta değişikliği ya da hesap silme için panelde düğme yok; Berkay Er'e yaz.`,
      `You can edit your name and photo on the **Profile** page. There's no button for changing your email or deleting the account; message Berkay Er.`)],
    actions: [{ do: 'url', href: '/profile', label: L(`Profilime git`, `Go to my profile`), if: 'signedIn' }, ACT.wa] });

  add({ id: 'language', pub: true, topic: ['@dil'],
    ex: { tr: [`Dili İngilizce yapabilir miyim?`, `ingilizce sayfa`, `dili değiştirmek`, `türkçe yap`, `language english`, `site ingilizce var mı`, `dil seçeneği`, `en tr değiştir`],
      en: [`Change language to English`, `switch to Turkish`, `is there an English version`] },
    a: [A(`Sayfanın üstündeki **TR | EN** anahtarıyla dili değiştirebilirsin; asistan da aynı dilde cevap verir. Derslerin hangi dilde yapılacağını Berkay Er'e sorabilirsin.`, `Use the **TR | EN** switch at the top to change the language; the assistant answers in that language too. Ask Berkay Er about the language of the lessons themselves.`)],
    actions: [ACT.langEn, ACT.langTr] });

  add({ id: 'contact', pub: true, topic: ['@iletisim', '@whatsapp'],
    ex: { tr: [`Berkay'a nasıl ulaşırım?`, `iletişim numarası`, `whatsapp numarası ne`, `hocaya mesaj atmak istiyorum`, `destek almak istiyorum`, `berkay er ile konuşmak`, `yardım lazım`, `canlı destek`, `gerçek biriyle konuşmak istiyorum`],
      en: [`How do I contact Berkay?`, `whatsapp number`, `talk to a human`] },
    a: [A(`En hızlısı **WhatsApp**: {wa_display} (sağ alttaki WhatsApp düğmesi). Panelle ilgili yazılı sorular için **Soru Sor** kartını da kullanabilirsin; Berkay Er yanıtlar.`,
      `Fastest is **WhatsApp**: {wa_display} (the WhatsApp button at the bottom right). For written questions about the panel you can also use the **Ask a question** card; Berkay Er replies.`)],
    actions: [ACT.wa, ACT.qa] });

  add({ id: 'ask_question', topic: ['soru', 'cevap'],
    ex: { tr: [`Soru Sor kartı ne işe yarıyor?`, `berkay'a yazılı soru sormak`, `sorumu nereye yazayım`, `sorduğum soru yanıtlandı mı`, `soru cevap bölümü`, `soruma cevap gelmedi`, `prodüksiyon sorusu sormak`, `teknik soru sormak istiyorum`,
      `kick nasıl yapılır`, `mix nasıl yapılır`, `sidechain nasıl yapılır`, `bass sesi nasıl kalın olur`, `reverb ayarı nasıl olmalı`, `parçamı dinleyip yorum yapar mısın`, `derste anlatılan konuyu unuttum tekrar sorabilir miyim`, `melodi nasıl yazılır`, `soru sor kartına yazdım cevap yok`],
      en: [`Where can I ask Berkay a question?`, `Q&A card`, `how do I make a kick`, `how do I mix my track`] },
    a: [
      A(`Prodüksiyon/müzik sorularını (mix, ses tasarımı, aranjman…) ben cevaplamıyorum — ben panel asistanıyım. Bu soruyu yan sütundaki **Soru Sor** kartına yaz; doğrudan Berkay Er'e gider ve cevabı aynı kartta görürsün. Derste de sorabilirsin.`,
        `I don't answer production/music questions (mixing, sound design, arrangement…) — I'm the panel assistant. Write it in the **Ask a question** card in the side column; it goes straight to Berkay Er and his answer appears in the same card. You can also ask in the lesson.`, 'qProd'),
      A(`Yan sütundaki **Soru Sor** kartına yazdığın sorular doğrudan Berkay Er'e gider; cevabı aynı kartta görürsün. Prodüksiyon ve teknik müzik soruları (mix, ses tasarımı…) için de orayı kullan — onları ben cevaplamıyorum.`,
        `Questions you write in the **Ask a question** card in the side column go straight to Berkay Er; his answer appears in the same card. Use it for production questions too (mixing, sound design…) — I don't answer those myself.`),
    ],
    actions: [ACT.qa] });

  add({ id: 'note', states: ['active', 'unpaid'], topic: ['notum'],
    kw: [`notum`], ex: { tr: [`Notum kartı ne işe yarar?`, `notum bölümüne ne yazmalıyım`, `tercihlerimi nereye yazayım`, `berkay'a not bırakmak`, `not kaydetmek`, `dersle ilgili isteğimi bırakmak`, `notumu kaydettim görünüyor mu`, `notumu kim görüyor`],
      en: [`What is the My note card for?`, `leave a note for Berkay`] },
    a: [A(`**Notum** kartına tercihlerini ve isteklerini yazıp **Kaydet**'e basarsın; Berkay Er öğrenci listesinde görür. Hızlı cevap gereken sorular için WhatsApp ya da **Soru Sor** daha uygun.`,
      `Write your preferences and wishes in **My note** and press **Save**; Berkay Er sees it in his student list. For questions needing a quick answer, WhatsApp or **Ask a question** is better.`)],
    actions: [ACT.note] });

  add({ id: 'tech_audio', pub: true, topic: ['@ses'], avoid: ['@oneri'],
    ex: { tr: [`Zoom'da ses gelmiyor`, `sesimi duymuyor`, `Ableton'ın sesini paylaşamıyorum`, `mikrofonum çalışmıyor`, `ses kesik geliyor`, `bilgisayar sesi zoom'a gitmiyor`, `ses yankı yapıyor`, `kulaklıktan ses gelmiyor`],
      en: [`No sound in Zoom`, `can't share Ableton audio`, `my mic doesn't work`] },
    a: [A(`Hızlı kontrol:\n- Zoom'da **Ses → Hoparlör/Mikrofon** doğru cihazı seçili mi? **Test** et\n- Ableton sesini paylaşmak için ekran paylaşırken **Share sound / Bilgisayar sesini paylaş** kutusunu işaretle\n- Ableton'ın ses çıkışı (Settings → Audio) kulaklığına ayarlı mı?\n- Yankı varsa kulaklık kullan\n\nÇözülmezse derste Berkay Er'e söyle ya da WhatsApp'tan yaz.`,
      `Quick checks:\n- In Zoom **Audio → Speaker/Microphone**, is the right device selected? **Test** it\n- To share Ableton's sound, tick **Share sound** when sharing your screen\n- Is Ableton's audio output (Settings → Audio) set to your headphones?\n- Use headphones if there's echo\n\nIf it persists, tell Berkay Er in the lesson or on WhatsApp.`)],
    actions: [ACT.wa] });

  add({ id: 'tech_video', pub: true, topic: ['@kamera'], avoid: ['@site'],
    ex: { tr: [`Kameram açılmıyor`, `ekran paylaşamıyorum`, `zoom ekran paylaşımı izni`, `görüntü donuyor`, `internetim yavaş ders kesiliyor`, `zoom açılmıyor`, `mac ekran kaydı izni`, `bağlantım kopuyor`],
      en: [`My camera doesn't work`, `can't share my screen`, `zoom keeps freezing`] },
    a: [A(`Hızlı kontrol:\n- Mac'te **Sistem Ayarları → Gizlilik ve Güvenlik → Ekran Kaydı / Kamera / Mikrofon**'da Zoom'a izin ver, Zoom'u yeniden başlat\n- Başka bir uygulama kamerayı kullanıyorsa kapat\n- Görüntü donuyorsa videoyu kapatıp yalnız ekran paylaş, mümkünse kablolu internet kullan\n\nBağlantı koptuysa aynı **Derse Katıl** düğmesiyle tekrar gir; sorun sürerse WhatsApp'tan yaz.`,
      `Quick checks:\n- On Mac, allow Zoom in **System Settings → Privacy & Security → Screen Recording / Camera / Microphone**, then restart Zoom\n- Close other apps using the camera\n- If video freezes, turn off camera and only share the screen; use wired internet if you can\n\nIf you drop out, rejoin with the same **Join** button; if it persists, message on WhatsApp.`)],
    actions: [ACT.zoom, ACT.wa] });

  // ───────────────────────── Eğitim / genel ─────────────────────────
  add({ id: 'how_lessons', pub: true, topic: ['ders', 'nasil'], avoid: ['@itiraz', '@produksiyon', '@olumsuz', '@kamera'],
    ex: { tr: [`Dersler nasıl yapılıyor?`, `dersler online mı`, `yüz yüze ders var mı`, `ders formatı nasıl`, `birebir mi grup mu`, `derslerde ne öğreniyoruz`, `ekran paylaşımı ile mi`, `dersler canlı mı`],
      en: [`How are the lessons held?`, `are lessons online`, `one-to-one or group`] },
    a: [A(`Bu paneldeki Ableton prodüksiyon dersleri **Zoom üzerinden, birebir ve online**. Ekran paylaşımıyla kendi Ableton projen ya da sıfırdan yaptığınız bir parça üzerinde çalışırsınız; anlık geri bildirim alırsın. Her ders {lesson_min} dakika. (Yüz yüze olan DJ eğitimi Kuşadası stüdyosunda; ayrıntısı **Eğitim** sayfasında.)`,
      `The Ableton production lessons in this panel are **one-to-one and online via Zoom**. With screen sharing you work on your own Ableton project or a track built from scratch, with instant feedback. Each lesson is {lesson_min} minutes. (Face-to-face DJ training is at the Kuşadası studio; see the **Training** page.)`)],
    actions: [ACT.trial] });

  add({ id: 'genres', pub: true, topic: ['tur', 'muzik'],
    ex: { tr: [`Hangi müzik türlerini öğretiyorsunuz?`, `techno öğretiyor musun`, `hangi tarzlarda ders`, `house dersi var mı`, `melodic techno`, `minimal öğrenmek istiyorum`, `hip hop beat yapımı öğretiyor musunuz`, `tür seçebilir miyim`],
      en: [`Which genres do you teach?`, `do you teach techno`] },
    a: [A(`Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass ve Indie Dance ağırlıklı; çok türlü bir yaklaşımla, odaklanmak istediğin tarza göre program şekillenir. Listede olmayan bir tür için Berkay Er'e sor.`,
      `Mainly Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass and Indie Dance; the program is shaped around the style you want. For other genres, ask Berkay Er.`)],
    actions: [ACT.wa] });

  add({ id: 'beginner', pub: true, topic: ['baslang', 'sifirdan'], avoid: ['@seviye'],
    ex: { tr: [`Hiç bilmiyorum başlayabilir miyim?`, `sıfırdan başlamak istiyorum`, `deneyimim yok ders alabilir miyim`, `yeni başlayanlar için uygun mu`, `hiç müzik bilgim yok`, `nota bilmem gerekiyor mu`, `başka DAW kullanıyorum geçebilir miyim`, `acemiyim`],
      en: [`I'm a complete beginner, can I start?`, `no experience`] },
    a: [A(`Evet. Sıfırdan başlayanlar için temel seviyeden başlayan kişisel bir program kurulur; tek gereksinim öğrenme isteği ve Ableton Live'a erişim (deneme sürümü de olur). Başka bir DAW biliyorsan fark yaratmaz.`,
      `Yes. Beginners get a personal program starting from the basics; all you need is motivation and access to Ableton Live (the trial works). Knowing another DAW doesn't matter.`)],
    actions: [ACT.trial] });

  add({ id: 'how_long_learn', pub: true, topic: ['ne kadar', 'ogren'], avoid: ['@produksiyon'],
    ex: { tr: [`Prodüksiyon öğrenmek ne kadar sürer?`, `kaç ayda parça yapabilirim`, `ne kadar sürede öğrenirim`, `kaç ders almam gerekir`, `öğrenme süresi`, `kendi parçamı ne zaman yaparım`, `kaç ay ders almalıyım`, `hızlı öğrenebilir miyim`],
      en: [`How long does it take to learn production?`] },
    a: [A(`Seviyene ve haftalık pratiğine göre değişir; sıfırdan başlayan bir öğrenci genelde **3–6 ay** içinde kendi parçalarını üretebilir hale gelir. Düzenli pratik bu süreyi belirgin biçimde kısaltır.`,
      `It depends on your level and weekly practice; a complete beginner usually produces their own tracks within **3–6 months**. Regular practice shortens that a lot.`)] });

  add({ id: 'certificate', pub: true, topic: ['sertifika'],
    ex: { tr: [`Sertifika veriyor musunuz?`, `eğitim sonunda belge var mı`, `diploma alabilir miyim`, `sertifika programı`, `kurs bitirme belgesi`, `resmi belge`, `katılım belgesi`, `sertifikalı mı`],
      en: [`Do you give a certificate?`] },
    a: [A(`Şu an resmi bir sertifika programı yok. Eğitim sonunda kendi parçalarını, mix'ini ve prodüksiyon anlayışını gösteren bir portfolyon olur.`,
      `There's no official certificate program right now. By the end you'll have a portfolio of your own tracks, mixes and production skills.`)] });

  add({ id: 'community', pub: true, topic: ['forum', 'uye'],
    ex: { tr: [`Forum nedir?`, `diğer öğrencilerle nasıl konuşurum`, `topluluk var mı`, `üyeler sayfası`, `beat paylaşmak`, `forumda soru sormak`, `diğer öğrencileri görmek`, `collab isteği`],
      en: [`Is there a community?`, `forum`] },
    a: [A(`Evet: sitede **Forum**, **Üyeler** dizini, profil sayfaları ve mesajlaşma var; diğer öğrencilerle konuşup collab isteği gönderebilirsin.`,
      `Yes: the site has a **Forum**, a **Members** directory, profiles and messaging; you can chat with other students and send collab requests.`)],
    actions: [{ do: 'url', href: '/forum', label: L(`Foruma git`, `Go to the forum`) }] });

  add({ id: 'tour', topic: ['tur', 'panel'],
    ex: { tr: [`Paneli nasıl kullanırım?`, `bana paneli tanıt`, `panel turu`, `burada ne var`, `bu sayfada neler yapabilirim`, `panel rehberi`, `nereden başlayayım`, `paneli gezdir`],
      en: [`How do I use this panel?`, `give me a tour`] },
    a: [
      A(`Panelde neler var:\n- **Derslerim · Bu hafta**: dersler, sayaç, **Saati değiştir**, **Derse Katıl**\n- **Tüm derslerim**: liste, **Ertele**, ders onayı\n- Ödeme / **Erteleme Hakkı** / **Ek Ders** kutuları\n- Yan sütun: Notum, sample & presetler, plugin listesi, **Soru Sor**, ders kuralları`,
        `What's in the panel:\n- **My lessons · This week**: lessons, countdown, **Change time**, **Join**\n- **All my lessons**: list, **Reschedule**, lesson confirmation\n- Payment / **Reschedule credits** / **Extra lesson** boxes\n- Side column: My note, samples & presets, plugin list, **Ask a question**, lesson rules`, 'dash'),
      A(`Bu sayfa Ders Paneli: deneme dersi ya da paket talebi gönderirsin; onaylanınca derslerin, ödeme ve erteleme kutuların burada görünür. Bana panelle ilgili her şeyi sorabilirsin.`,
        `This is the Lesson panel: send a trial or package request; once approved your lessons, payment and credit boxes appear here. Ask me anything about the panel.`),
    ],
    actions: [ACT.tour, ACT.week] });

  add({ id: 'site_problem', pub: true, topic: ['@site', '@bozuk'],
    ex: { tr: [`Sayfa açılmıyor`, `site sürekli yükleniyor`, `panel donuyor`, `sayfa hata veriyor`, `beyaz ekranda kaldı`, `telefonda sayfa düzgün görünmüyor`, `mobilde sayfa bozuk`, `hata kodu çıktı`, `site çok yavaş`, `butona basınca hata çıkıyor`, `sayfa kayıyor`, `tarayıcıda açılmıyor`, `panel açılmıyor`, `panel yüklenmiyor bembeyaz`],
      en: [`The page won't load`, `the site shows an error`, `the page looks broken on my phone`] },
    a: [A(`Önce şunları dene:\n- Sayfayı yenile (bilgisayarda **Ctrl/Cmd + Shift + R**, telefonda aşağı çekip yenile)\n- Instagram/TikTok gibi bir uygulamanın içinden açtıysan sayfayı **Safari ya da Chrome**'da aç\n- Tarayıcını güncelle; olmazsa gizli pencerede ya da başka bir tarayıcıda dene\n- İnternet bağlantını kontrol et\n\nDüzelmezse hatanın **ekran görüntüsünü** (varsa hata kodunu) WhatsApp'tan Berkay Er'e gönder.`,
      `Try these first:\n- Reload the page (**Ctrl/Cmd + Shift + R** on a computer, pull down to refresh on a phone)\n- If you opened it inside an app like Instagram/TikTok, open it in **Safari or Chrome**\n- Update your browser; otherwise try a private window or another browser\n- Check your internet connection\n\nIf it persists, send a **screenshot** of the error (with the code, if any) to Berkay Er on WhatsApp.`)],
    actions: [ACT.wa] });

  add({ id: 'payment_mistake', topic: ['@odeme', '@yanlislik'],
    need: ['@yanlislik', '@olumsuz', 'geri'],
    ex: { tr: [`Ödemeyi yaptım düğmesine yanlışlıkla bastım`, `ödemeden ödedim dedim`, `yanlışlıkla ödeme bildirimi gönderdim`, `ödemeyi yaptım'ı geri almak istiyorum`, `henüz ödemedim ama butona bastım`, `ödeme bildirimini iptal etmek`, `kazara ödedim butonuna bastım`],
      en: [`I pressed I've paid by mistake`, `I haven't paid yet but pressed the button`] },
    a: [A(`Sorun değil — panelde bunu geri alan bir düğme yok ama Berkay Er havaleyi **görmeden onaylamaz**. WhatsApp'tan "yanlışlıkla bastım" diye yaz; bildirimi geri çevirir. Havaleyi yaptığında **Ödemeyi yaptım**'a yeniden basarsın.`,
      `No problem — there's no undo button, but Berkay Er **won't confirm without seeing the transfer**. Message him on WhatsApp that it was a mistake; he'll clear the notice. Press **I've paid** again once you've actually transferred.`)],
    actions: [ACT.wa, ACT.pay] });

  add({ id: 'piracy', pub: true, topic: ['@korsan'], need: ['@korsan'], strong: ['@korsan'],
    label: L(`Korsan/crack program kullanabilir miyim?`, `Can I use cracked software?`),
    ex: { tr: [`crack ableton nereden indirilir`, `ableton crack linki`, `korsan program kullanabilir miyim`, `serum crack var mı`, `plugin crackli olur mu`, `kırık ableton`, `torrent ile indirsem olur mu`, `keygen`],
      en: [`ableton crack`, `cracked plugins`] },
    a: [A(`Crack / korsan yazılım konusunda yardımcı olamam. Ableton Live'ın **ücretsiz deneme sürümü** derslere başlamak için yeterli; plugin'lerin çoğunun da deneme ya da uygun lisans seçenekleri var. Lisans konusunda Berkay Er'e danışabilirsin.`,
      `I can't help with cracked / pirated software. Ableton Live's **free trial** is enough to start the lessons, and most plugins have trials or affordable licences. You can ask Berkay Er about licensing.`)],
    actions: [ACT.wa] });

  // ───────────────────────── Sohbet ─────────────────────────
  add({ id: 'greeting', pub: true, topic: [],
    ex: { tr: [`merhaba`, `selam`, `iyi günler`, `günaydın`, `iyi akşamlar`, `merhabalar`, `slm`, `selamlar nasılsın`],
      en: [`hello`, `hi there`, `good morning`] },
    a: [A(`Merhaba{name_comma}! Ders panelinle ilgili ne sormak istersin? Ders saati, erteleme, ödeme, Zoom, kurallar…`, `Hi{name_comma}! What would you like to know about your lesson panel? Times, rescheduling, payment, Zoom, rules…`)] });

  add({ id: 'thanks', pub: true, topic: [],
    ex: { tr: [`teşekkürler`, `teşekkür ederim`, `sağ ol`, `çok sağ ol`, `eyvallah`, `tşk`, `süpersin`, `harika teşekkürler`, `anladım teşekkürler`],
      en: [`thanks`, `thank you`, `great, thanks`] },
    a: [A(`Rica ederim! Başka bir sorun olursa buradayım.`, `You're welcome! I'm here if anything else comes up.`)] });

  add({ id: 'who', pub: true, topic: [],
    ex: { tr: [`gerçek biri misin`, `sen kimsin`, `yapay zeka mısın`, `chatgpt misin`, `bot musun`, `gerçek kişi misin`, `bu asistan nasıl çalışıyor`, `sorularımı kim görüyor`, `yazdıklarımı kim okuyor`],
      en: [`who are you`, `are you an AI`, `is this a bot`] },
    a: [A(`Ben Ders Paneli'nin site içi asistanıyım — dış bir yapay zekâ değil; panelin kurallarından ve senin ders bilgilerinden cevap veririm. Yazdıkların bir yere gönderilmez; yalnız **Berkay'a ilet** dersen soru ona gider.`,
      `I'm the Lesson panel's built-in assistant — not an external AI; I answer from the panel's rules and your lesson data. What you type isn't sent anywhere; only if you press **Forward to Berkay** does the question go to him.`)] });

  root.beAssistantKB = { version: 1, facts: FACTS, synonyms: SYN, intents: I };
})(typeof window !== 'undefined' ? window : globalThis);
