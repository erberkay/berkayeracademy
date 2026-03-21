(function () {
  var T = {
    // ── Navigation ──
    nav_home:       { tr: 'Ana Sayfa',   en: 'Home' },
    nav_egitim:     { tr: 'Eğitim',      en: 'Education' },
    nav_forum:      { tr: 'Forum',       en: 'Forum' },
    nav_members:    { tr: 'Üyeler',      en: 'Members' },
    nav_lab:        { tr: 'Lab',         en: 'Lab' },
    nav_sss:        { tr: 'SSS',         en: 'FAQ' },
    nav_lessons:    { tr: 'Ders Paneli', en: 'Lessons' },
    nav_profile:    { tr: 'Profil',      en: 'Profile' },

    // ── Auth ──
    auth_signin:  { tr: '⬡ Google ile Giriş Yap', en: '⬡ Sign in with Google' },
    auth_signout: { tr: 'Çıkış',                  en: 'Sign Out' },

    // ── Index ──
    idx_role:             { tr: '// Producer · Mix Mastering  &  Eğitmen', en: '// Producer · Mix Mastering  &  Educator' },
    idx_ig_content:       { tr: 'içerik hesabı',   en: 'content account' },
    idx_ig_producer:      { tr: 'producer hesabı', en: 'producer account' },
    idx_platform_label:   { tr: 'Platform',        en: 'Platform' },
    idx_perform_tag:      { tr: '⚡ Live Set Hyprid - DJ', en: '⚡ Live Set Hybrid - DJ' },
    idx_journey_title:    { tr: '// Yolculuk',     en: '// Journey' },
    idx_spark_title:      { tr: 'İlk Kıvılcım',   en: 'First Spark' },
    idx_spark_desc:       { tr: 'Elektronik müziğin derin ve karanlık dünyasıyla tanışan Berkay Er, kendi özgün sesini bulma yolculuğuna çıktı. Frekanslar onu çekti; ve o da onlara kapıyı açtı.', en: 'Discovering the deep and dark world of electronic music, Berkay Er set out on a journey to find his own unique sound. The frequencies drew him in — and he opened the door to them.' },
    idx_industry_title:   { tr: 'Endüstriye Giriş', en: 'Industry Entry' },
    idx_industry_desc:    { tr: "Loop'lar ve sample'lar üzerine yoğun çalışmalar yaptı. Peaktime, Melodic Techno ve Indie tarzlarını harmanlayarak benzersiz bir müzikal kimlik inşa etti.", en: 'Intensive work on loops and samples. By blending Peaktime, Melodic Techno and Indie styles, he built a unique musical identity.' },
    idx_storyteller_title:{ tr: 'Hikaye Anlatıcısı', en: 'Storyteller' },
    idx_storyteller_desc: { tr: "Ableton ile kurgulanan Live Set'leriyle sahnede kendi notalarını icra ediyor; dinleyicisini farklı dünyalara taşıyan derin bir müzik deneyimi sunuyor.", en: "Performing his own compositions live with Ableton-crafted Live Sets, delivering a deep musical experience that transports audiences to different worlds." },
    idx_about_title:      { tr: '// Hakkında',      en: '// About' },
    idx_about_bio:        { tr: 'Berkay Er, Ableton Live uzmanı, Peaktime Techno ve Melodic Techno odaklı Türk elektronik müzik prodüktörü ve eğitmenidir. Ses tasarımı, mix & mastering ve ghost production alanlarında profesyonel üretim yapan Berkay Er; Minimal Tech, Minimal Bass ve Indie Dance türlerinde de aktif olarak prodüksiyon üretmektedir. Kurguladığı Live Set performanslarıyla sahnede dinleyicisiyle buluşmakta, aynı zamanda 100\'den fazla öğrenciye elektronik müzik prodüksiyonu eğitimi vermektedir.', en: 'Berkay Er is an Ableton Live expert, Turkish electronic music producer and educator focused on Peaktime Techno and Melodic Techno. He professionally produces in the fields of sound design, mix & mastering and ghost production; and actively produces in Minimal Tech, Minimal Bass and Indie Dance genres. He meets audiences on stage with his crafted Live Set performances, and has also given one-on-one electronic music production training to over 100 students.' },
    idx_releases_label:   { tr: 'YAYINLAR', en: 'RELEASES' },
    idx_releases_desc:    { tr: "Beatport, SoundCloud ve Spotify'da yayınlanan orijinal Techno & Melodic parçalar — dinleyiciye ulaşan gerçek stüdyo deneyimi.", en: "Original Techno & Melodic tracks released on Beatport, SoundCloud and Spotify — real studio experience that reaches listeners." },
    idx_studio_label:     { tr: 'STÜDYO', en: 'STUDIO' },
    idx_studio_desc:      { tr: "Ableton Push 2 & Live 12 donanım entegrasyonu ile profesyonel üretim ortamı — controller workflow'undan yazılım derinliklerine kadar.", en: "Professional production environment with Ableton Push 2 & Live 12 hardware integration — from controller workflow to software depths." },
    idx_results_label:    { tr: 'SONUÇLAR', en: 'RESULTS' },
    idx_results_desc:     { tr: 'Sıfırdan parça yayınlayana kadar kişiye özel ilerleme takibi — her öğrencinin kendi müzik vizyonuna uyarlanmış öğrenme yol haritası.', en: 'Personalized progress tracking from zero to releasing tracks — a learning roadmap adapted to each student\'s own musical vision.' },
    idx_community_label:  { tr: 'TOPLULUK', en: 'COMMUNITY' },
    idx_community_desc:   { tr: 'Underground Techno sahnesiyle aktif bağlantı — endüstri bilgisi, release stratejileri ve sahne deneyimi aktarımı.', en: 'Active connection with the Underground Techno scene — industry knowledge, release strategies and live experience transfer.' },
    idx_styles_title:     { tr: '// Müzik Tarzları', en: '// Music Styles' },
    idx_style_atm:        { tr: 'Atmosferik Live Set', en: 'Atmospheric Live Set' },
    idx_stat_journey:     { tr: '⚡ Yolculuk',         en: '⚡ Journey' },
    idx_stat_journey_sub: { tr: 'Yıllık müzikal evrim', en: 'Years of musical evolution' },
    idx_stat_industry:    { tr: '🎯 Endüstri',         en: '🎯 Industry' },
    idx_stat_industry_sub:{ tr: 'Profesyonel giriş yılı', en: 'Professional entry year' },
    idx_stat_blend:       { tr: '🔥 Harman',           en: '🔥 Blend' },
    idx_stat_blend_sub:   { tr: 'Farklı tarz bir arada', en: 'Different styles combined' },
    idx_h1_line1:         { tr: 'Sıfırdan İleri Seviyeye', en: 'From Zero to Advanced' },
    idx_h1_line3:         { tr: '& Müzik Prodüksiyonu Eğitimi', en: '& Music Production Education' },
    idx_hook:             { tr: "Kafanda dönen ritimler var, kulaklarında bir sound var ama ekrana bakınca nereye basacağını bilmiyorsun. Ya da yıllardır üretiyorsun, ancak sesler hâlâ istediğin yere gelemiyor. Bu ikisi de aynı kapıya çıkıyor: doğru rehberlik eksikliği. Berkay Er Academy'de öğrendiğin şey sadece bir yazılım değil; kafandaki müziği sahneye taşıyan bir dil. Peaktime Techno'nun ham enerjisinden Melodic Techno'nun duygusal katmanlarına, Afro House'un ritim zenginliğinden Dark Electronic'in karanlık dokusuna kadar — bu eğitim senin sesin için tasarlandı.", en: "You have rhythms spinning in your head, a sound in your ears, but you don't know where to click when you look at the screen. Or you've been producing for years, but the sounds still can't reach where you want them to. Both lead to the same door: the lack of proper guidance. What you learn at Berkay Er Academy isn't just software; it's a language that takes the music in your head to the stage. From the raw energy of Peaktime Techno to the emotional layers of Melodic Techno, from Afro House's rhythmic richness to Dark Electronic's dark texture — this education was designed for your sound." },
    idx_why_title:        { tr: "Neden Berkay Er Academy'yi Seçmelisin?", en: 'Why Choose Berkay Er Academy?' },
    idx_card1_title:      { tr: '1 Saat Ücretsiz Deneme Dersi', en: '1 Hour Free Trial Lesson' },
    idx_card1_desc:       { tr: 'Kayıt olmadan önce eğitim tarzını, iletişimi ve içeriği bizzat test et. Hiçbir ödeme gerektirmez.', en: 'Test the teaching style, communication and content before enrolling. No payment required.' },
    idx_card2_title:      { tr: '500 GB Preset Paketi Hediye', en: '500 GB Preset Pack Gift' },
    idx_card2_desc:       { tr: "Kayıt olan her öğrenciye, türe özel kurlanmış 500 GB'lık devasa preset, sample ve ses paketi ücretsiz teslim edilir.", en: "Every enrolled student receives a massive genre-tailored 500 GB preset, sample and sound pack — completely free." },
    idx_card3_title:      { tr: '100+ Öğrenci Deneyimi', en: '100+ Student Experience' },
    idx_card3_desc:       { tr: "2019'dan bu yana 100'den fazla öğrenciye bire bir eğitim verildi. Her öğrencinin farklı olduğu kabul edilerek ilerlendi.", en: "One-on-one training for over 100 students since 2019. Progress was made by acknowledging that each student is different." },
    idx_card4_title:      { tr: 'Tamamen Kişiye Özel Müfredat', en: 'Fully Personalized Curriculum' },
    idx_card4_desc:       { tr: 'Hazır bir ders planı yok. Seviyene, hedefine ve müzik tarzına göre şekillenen, 8 modüllük dinamik bir eğitim yolu.', en: 'No fixed lesson plan. A dynamic 8-module education path shaped by your level, goals and music style.' },
    idx_cta_line1:        { tr: 'Kafandaki Müziği Artık',      en: 'The Music In Your Head —' },
    idx_cta_line2:        { tr: 'Sahneye Taşımanın Zamanı',    en: "It's Time to Take It to the Stage" },
    idx_cta_desc:         { tr: '1 saatlik ücretsiz deneme dersini ayırt, eğitim tarzını yerinde gör. Ödeme yok, bağlayıcılık yok — sadece seninle sesin arasındaki mesafeyi ölçelim.', en: 'Book your 1-hour free trial lesson and see the teaching style firsthand. No payment, no commitment — let\'s just measure the distance between you and your sound.' },
    idx_cta_btn:          { tr: '🎁 ÜCRETSİZ DENEME DERSİNİ AYIRT →', en: '🎁 BOOK YOUR FREE TRIAL LESSON →' },
    idx_cta_sub:          { tr: '500 GB preset paketi · Kişiye özel müfredat · Sıfırdan ileri seviye', en: '500 GB preset pack · Custom curriculum · Zero to advanced' },
    idx_edu_title:        { tr: '// Prodüksiyon Eğitimi',      en: '// Production Education' },
    idx_edu_box_title:    { tr: '🎓 Ableton Live ile Elektronik Müzik Prodüksiyonu', en: '🎓 Electronic Music Production with Ableton Live' },
    idx_edu_box_desc:     { tr: "8 modüllük kişiye özel müfredat. Synthesizer'dan Live Set'e kadar her şey — Berkay Er'in 2019'dan beri birikimi ile. 1 saat ücretsiz deneme & 500 GB preset paketi dahil.", en: "8-module personalized curriculum. Everything from Synthesizer to Live Set — with Berkay Er's experience since 2019. Includes 1 hour free trial & 500 GB preset pack." },
    idx_edu_tag1:         { tr: '🎁 1 Saat Ücretsiz Deneme', en: '🎁 1 Hour Free Trial' },
    idx_edu_tag2:         { tr: '500 GB Preset Paketi',       en: '500 GB Preset Pack' },
    idx_edu_tag3:         { tr: '8 Modül · Tüm Seviyeler',   en: '8 Modules · All Levels' },
    idx_edu_btn:          { tr: 'Eğitim Sayfasına Git →',    en: 'Go to Education Page →' },
    idx_students_label:   { tr: 'Öğrenci',                   en: 'Students' },
    idx_reviews_title:    { tr: '// Öğrenci Yorumları',      en: '// Student Reviews' },
    idx_comment_login:    { tr: 'Yorum bırakmak için giriş yap', en: 'Sign in to leave a comment' },
    idx_comment_form_title:{ tr: 'Yorum Bırak', en: 'Leave a Comment' },
    idx_comment_name_ph:  { tr: 'İsmin (örn. Ahmet K.)', en: 'Your name (e.g. John K.)' },
    idx_comment_text_ph:  { tr: 'Deneyimini paylaş...', en: 'Share your experience...' },
    idx_comment_send:     { tr: 'Gönder', en: 'Send' },
    idx_forum_title:      { tr: '// Topluluk Forumu', en: '// Community Forum' },
    idx_forum_btn:        { tr: 'Foruma Git →', en: 'Go to Forum →' },
    idx_forum_login:      { tr: 'Soruları görmek için sağ üstten giriş yap →', en: 'Sign in to see questions →' },
    idx_footer_role:      { tr: 'Aktif Karakter', en: 'Active Character' },

    // ── Egitim ──
    eg_banner_title:   { tr: '📅 Ders Rezervasyonu', en: '📅 Book a Lesson' },
    eg_banner_desc:    { tr: 'Tercih ettiğin gün ve saati seç, talep gönder — onaylanınca takvimine işlenir.', en: 'Choose your preferred day and time, send a request — it gets added to your calendar once confirmed.' },
    eg_bio:            { tr: 'Berkay Er, yıllarca biriktirdiği müzikal deneyimi ve teknik birikimi yeni nesil üreticilerle paylaşıyor. Ableton Live üzerinde elektronik müzik prodüksiyonunun inceliklerini — Melodic Techno\'dan Techno\'ya, ses tasarımından mixing\'e — kendi özgün bakış açısıyla aktarıyor. Her ders tamamen kişiye özel planlanır; seviyene, hedeflerine ve tarzına göre şekillenir.', en: "Berkay Er shares years of accumulated musical experience and technical knowledge with the next generation of producers. He conveys the nuances of electronic music production on Ableton Live — from Melodic Techno to Techno, from sound design to mixing — through his own unique perspective. Every lesson is planned entirely personally; it takes shape according to your level, goals and style." },
    eg_bundle_desc:    { tr: 'Eğitime özel 500 GB Preset Paketi ve özenle seçilmiş Serum Preset\'leri her öğrenciye ücretsiz olarak veriliyor.', en: 'An exclusive 500 GB Preset Pack and hand-picked Serum Presets are given free to every student.' },
    eg_curriculum:     { tr: 'Müfredat', en: 'Curriculum' },
    eg_m1_title:       { tr: '01 · Ableton Temelleri', en: '01 · Ableton Basics' },
    eg_m2_title:       { tr: '02 · Ritim & Davul Programlama', en: '02 · Rhythm & Drum Programming' },
    eg_m3_title:       { tr: '03 · Melodi & Armoni', en: '03 · Melody & Harmony' },
    eg_m4_title:       { tr: '04 · Sampling & Resampling', en: '04 · Sampling & Resampling' },
    eg_m5_title:       { tr: '05 · Synthesizer & Ses Tasarımı', en: '05 · Synthesizer & Sound Design' },
    eg_m6_title:       { tr: '06 · Mix & Mastering', en: '06 · Mix & Mastering' },
    eg_m7_title:       { tr: '07 · Prodüksiyon Kimliği', en: '07 · Production Identity' },
    eg_m8_title:       { tr: '08 · Live Performance', en: '08 · Live Performance' },
    eg_free_lesson:    { tr: '🎁 Ücretsiz Deneme Dersi', en: '🎁 Free Trial Lesson' },
    eg_book_btn:       { tr: '📅 Ders Rezervasyonu', en: '📅 Book a Lesson' },
    eg_price_note:     { tr: 'Fiyat bilgisi için ders talebinde bulun', en: 'Request a lesson for pricing info' },

    // ── SSS ──
    sss_help_label:    { tr: '// Yardım Merkezi', en: '// Help Center' },
    sss_title:         { tr: 'SIKÇA SORULAN SORULAR', en: 'FREQUENTLY ASKED QUESTIONS' },
    sss_subtitle:      { tr: 'Eğitim programı, dersler ve topluluk hakkında merak ettiğin her şey burada. Cevabını bulamazsan doğrudan ulaşabilirsin.', en: 'Everything you want to know about the education program, lessons and community is here. If you can\'t find your answer, you can reach out directly.' },
    sss_cat1:          { tr: 'Eğitim Hakkında', en: 'About Education' },
    sss_cat2:          { tr: 'Platform Hakkında', en: 'About the Platform' },
    sss_cta_q:         { tr: 'Soruların cevaplanmadı mı?', en: "Didn't find your answer?" },
    sss_cta_desc:      { tr: 'Ücretsiz deneme dersi ayarla — her şeyi detaylıca konuşuruz.', en: "Book a free trial lesson — we'll talk everything through in detail." },
    sss_cta_btn:       { tr: '🎯 Ücretsiz Deneme Dersi', en: '🎯 Free Trial Lesson' },

    // ── Forum ──
    forum_title:       { tr: 'Elektronik Müzik Topluluğu', en: 'Electronic Music Community' },
    forum_sub:         { tr: 'Ableton · Ses Tasarımı · Mix · Prodüksiyon', en: 'Ableton · Sound Design · Mix · Production' },
    forum_signin_msg:  { tr: 'Topluluğa katılmak için giriş yap.', en: 'Sign in to join the community.' },
    forum_desc:        { tr: 'Elektronik müzik üretimi, Ableton ve prodüksiyon hakkında sor, yanıtla, paylaş.', en: 'Ask, answer and share about electronic music production, Ableton and production.' },
    forum_rule1:       { tr: 'Ableton ve prodüksiyon odaklı konular aç', en: 'Create Ableton and production-focused topics' },
    forum_rule2:       { tr: 'Saygılı ol, yapıcı konuş', en: 'Be respectful, speak constructively' },
    forum_rule3:       { tr: 'Tekrar eden soruları aramayı dene', en: 'Try searching for repeated questions' },
    forum_rule4:       { tr: 'Uygunsuz içerik admin tarafından silinebilir', en: 'Inappropriate content may be deleted by admin' },
    forum_rule5:       { tr: 'Ekran görüntüsü veya hata mesajı paylaşmak yardımcı olur', en: 'Sharing a screenshot or error message is helpful' },

    // ── Members ──
    members_title:     { tr: 'Topluluk Üyeleri',          en: 'Community Members' },
    members_sub:       { tr: 'Elektronik Müzik Topluluğu', en: 'Electronic Music Community' },
    members_count:     { tr: 'Üye',                        en: 'Members' },
    members_sort_az:   { tr: 'İsim A-Z',                   en: 'Name A-Z' },

    // ── New Post ──
    np_signin_title:   { tr: 'Giriş Gerekli',              en: 'Sign In Required' },
    np_signin_desc:    { tr: 'Konu açmak için önce giriş yapman gerekiyor.', en: 'You need to sign in first to create a topic.' },
    np_title:          { tr: 'Yeni Konu',                  en: 'New Topic' },
    np_sub:            { tr: 'Topluluğa sorunuzu veya paylaşımınızı yazın', en: 'Write your question or post for the community' },

    // ── Ders Ableton ──
    da_curriculum:     { tr: 'Bu Derste Neler Öğreneceksin', en: 'What You\'ll Learn in This Lesson' },
    da_req:            { tr: 'Ön Koşullar', en: 'Prerequisites' },
    da_req1:           { tr: 'Ableton Live kurulu olması (Trial versiyonu yeterli)', en: 'Ableton Live installed (Trial version is sufficient)' },
    da_req2:           { tr: 'Müzik teorisi bilgisi gerekmez', en: 'No music theory knowledge required' },
    da_req3:           { tr: 'Kulaklık veya monitör hoparlör önerilir', en: 'Headphones or monitor speakers recommended' },
    da_req4:           { tr: 'Not almak için defter/uygulama hazırla', en: 'Prepare a notebook/app for taking notes' },

    // ── Common UI ──
    ui_send:       { tr: 'Gönder',  en: 'Send' },
    ui_cancel:     { tr: 'İptal',   en: 'Cancel' },
    ui_save:       { tr: 'Kaydet',  en: 'Save' },
    ui_back:       { tr: '← Geri', en: '← Back' },
    ui_loading:    { tr: 'Yükleniyor...', en: 'Loading...' },
    ui_error:      { tr: 'Hata',    en: 'Error' },
    ui_success:    { tr: 'Başarılı', en: 'Success' },
    ui_signin:     { tr: '⬡ Google ile Giriş Yap', en: '⬡ Sign in with Google' },
    ui_signout:    { tr: 'Çıkış Yap', en: 'Sign Out' },
    ui_notifications: { tr: 'Bildirimler', en: 'Notifications' },
    ui_read_all:   { tr: 'Tümünü Oku', en: 'Mark all read' },
    ui_booking:    { tr: '📅 Ders Paneli', en: '📅 Lesson Panel' },
  };

  var lang = localStorage.getItem('_lang') || 'tr';

  function t(key) {
    var entry = T[key];
    if (!entry) return key;
    return entry[lang] || entry['tr'] || key;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = T[key];
      if (val) el.textContent = val[lang] || val['tr'];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph');
      var val = T[key];
      if (val) el.placeholder = val[lang] || val['tr'];
    });
    // Toggle button state
    document.querySelectorAll('.lang-btn[data-lang]').forEach(function (btn) {
      btn.classList.toggle('lang-active', btn.getAttribute('data-lang') === lang);
    });
    document.documentElement.lang = lang === 'en' ? 'en' : 'tr';
  }

  function setLang(l) {
    lang = l;
    localStorage.setItem('_lang', l);
    apply();
  }

  window._i18n = { t: t, setLang: setLang, getLang: function () { return lang; }, apply: apply };

  // Apply after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
