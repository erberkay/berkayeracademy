(function () {
  var T = {
    // ── Navigation ──
    nav_home:       { tr: 'Ana Sayfa',   en: 'Home' },
    nav_egitim:     { tr: 'Eğitim',      en: 'Education' },
    nav_egitmen:    { tr: 'Eğitmen',     en: 'Instructor' },
    nav_egitmen_long: { tr: 'Eğitmeni tanı', en: 'Meet the instructor' },
    nav_forum:      { tr: 'Forum',       en: 'Forum' },
    nav_members:    { tr: 'Üyeler',      en: 'Members' },
    nav_lab:        { tr: 'Lab',         en: 'Lab' },
    nav_sss:        { tr: 'SSS',         en: 'FAQ' },
    nav_lessons:    { tr: 'Ders Paneli', en: 'Lessons' },
    nav_trial_lesson: { tr: 'Deneme Dersi', en: 'Trial Lesson' },
    nav_profile:    { tr: 'Profil',      en: 'Profile' },

    // ── Auth ──
    auth_signin:  { tr: 'Giriş Yap', en: 'Sign in' },
    auth_signout: { tr: 'Çıkış',                  en: 'Sign Out' },

    // ── Index ──
    idx_ig_content:       { tr: 'içerik hesabı',   en: 'content account' },
    idx_ig_producer:      { tr: 'producer hesabı', en: 'producer account' },
    idx_platform_label:   { tr: 'Platform',        en: 'Platform' },
    idx_journey_title:    { tr: 'Yolculuk',     en: 'Journey' },
    idx_spark_title:      { tr: 'İlk Kıvılcım',   en: 'First Spark' },
    idx_industry_title:   { tr: 'Endüstriye Giriş', en: 'Industry Entry' },
    idx_about_title:      { tr: 'Hakkında',      en: 'About' },
    idx_releases_label:   { tr: 'YAYINLAR', en: 'RELEASES' },
    idx_releases_desc:    { tr: "Beatport, SoundCloud ve Spotify'da yayınlanan orijinal Techno & Melodic parçalar — dinleyiciye ulaşan gerçek stüdyo deneyimi.", en: "Original Techno & Melodic tracks released on Beatport, SoundCloud and Spotify — real studio experience that reaches listeners." },
    idx_studio_label:     { tr: 'STÜDYO', en: 'STUDIO' },
    idx_results_label:    { tr: 'SONUÇLAR', en: 'RESULTS' },
    idx_community_label:  { tr: 'TOPLULUK', en: 'COMMUNITY' },
    idx_community_desc:   { tr: 'Underground Techno sahnesiyle aktif bağlantı — endüstri bilgisi, release stratejileri ve sahne deneyimi aktarımı.', en: 'Active connection with the Underground Techno scene — industry knowledge, release strategies and live experience transfer.' },
    idx_style_atm:        { tr: 'Atmosferik Live Set', en: 'Atmospheric Live Set' },
    idx_stat_industry:    { tr: 'Endüstri',         en: 'Industry' },
    idx_card1_desc:       { tr: 'Kayıt olmadan önce eğitim tarzını, iletişimi ve içeriği bizzat test et. Hiçbir ödeme gerektirmez.', en: 'Test the teaching style, communication and content before enrolling. No payment required.' },
    idx_cta_desc:         { tr: '1 saatlik ücretsiz deneme dersini ayırt, eğitim tarzını yerinde gör. Ödeme yok, bağlayıcılık yok — sadece seninle sesin arasındaki mesafeyi ölçelim.', en: 'Book your 1-hour free trial lesson and see the teaching style firsthand. No payment, no commitment — let\'s just measure the distance between you and your sound.' },
    idx_cta_sub:          { tr: '500 GB preset paketi · Kişiye özel müfredat · Sıfırdan ileri seviye', en: '500 GB preset pack · Custom curriculum · Zero to advanced' },
    idx_edu_title:        { tr: 'Prodüksiyon Eğitimi',      en: 'Production Education' },
    idx_students_label:   { tr: 'Öğrenci',                   en: 'Students' },
    idx_comment_login:    { tr: 'Yorum bırakmak için giriş yap', en: 'Sign in to leave a comment' },
    idx_comment_form_title:{ tr: 'Yorum Bırak', en: 'Leave a Comment' },
    idx_comment_name_ph:  { tr: 'İsmin (örn. Ahmet K.)', en: 'Your name (e.g. John K.)' },
    idx_comment_text_ph:  { tr: 'Deneyimini paylaş...', en: 'Share your experience...' },
    idx_comment_send:     { tr: 'Gönder', en: 'Send' },
    idx_forum_title:      { tr: 'Topluluk Forumu', en: 'Community Forum' },
    idx_forum_empty:      { tr: 'Henüz soru yok. İlk soruyu sor!',           en: 'No questions yet. Be the first to ask!' },
    idx_comment_send_err: { tr: 'Gönderilemedi',                              en: 'Failed to send' },
    ui_welcome:           { tr: 'Hoş geldin',                                 en: 'Welcome' },
    forum_solved:         { tr: '✓ Çözüldü',                                  en: '✓ Solved' },

    // ── Egitim ──
    eg_banner_desc:    { tr: 'Tercih ettiğin gün ve saati seç, talep gönder — onaylanınca takvimine işlenir.', en: 'Choose your preferred day and time, send a request — it gets added to your calendar once confirmed.' },

    // ── Forum ──
    forum_desc:        { tr: 'Elektronik müzik üretimi, Ableton ve prodüksiyon hakkında sor, yanıtla, paylaş.', en: 'Ask, answer and share about electronic music production, Ableton and production.' },
    forum_rule1:       { tr: 'Ableton ve prodüksiyon odaklı konular aç', en: 'Create Ableton and production-focused topics' },
    forum_rule2:       { tr: 'Saygılı ol, yapıcı konuş', en: 'Be respectful, speak constructively' },
    forum_rule3:       { tr: 'Tekrar eden soruları aramayı dene', en: 'Try searching for repeated questions' },
    forum_rule4:       { tr: 'Uygunsuz içerik admin tarafından silinebilir', en: 'Inappropriate content may be deleted by admin' },
    forum_rule5:       { tr: 'Ekran görüntüsü veya hata mesajı paylaşmak yardımcı olur', en: 'Sharing a screenshot or error message is helpful' },

    // ── New-post extra ──
    np_body_chars:    { tr: 'karakter',          en: 'characters' },
    np_preview:       { tr: 'Önizleme',          en: 'Preview' },
    np_submitting:    { tr: 'Gönderiliyor...',   en: 'Submitting...' },

    // ── Post page extra ──
    post_copy_link:   { tr: 'Linki Kopyala',     en: 'Copy Link' },
    post_edit:        { tr: 'Düzenle',           en: 'Edit' },
    post_save:        { tr: 'Kaydet',            en: 'Save' },
    post_cancel:      { tr: 'Vazgeç',            en: 'Cancel' },
    post_delete:      { tr: 'Sil',               en: 'Delete' },
    post_replies_loading: { tr: 'Yanıtlar yükleniyor...', en: 'Loading replies...' },
    post_reply_write: { tr: 'Yanıt Yaz',         en: 'Write a Reply' },

    // ── Common UI ──
    ui_cancel:     { tr: 'İptal',   en: 'Cancel' },
    ui_loading:    { tr: 'Yükleniyor...', en: 'Loading...' },
    ui_signin:     { tr: 'Giriş Yap', en: 'Sign in' },
    ui_signout:    { tr: 'Çıkış Yap', en: 'Sign Out' },
    ui_notifications: { tr: 'Bildirimler', en: 'Notifications' },
    ui_read_all:   { tr: 'Tümünü Oku', en: 'Mark all read' },
    ui_no_notifs:  { tr: 'Bildirim yok', en: 'No notifications' },
    ui_new_notif:  { tr: 'Yeni bildirim', en: 'New notification' },
    ui_student:    { tr: 'Öğrenci', en: 'Student' },
    ui_member:     { tr: 'Üye', en: 'Member' },

    // ── Welcome modal ──
    ps_welcome_sub:   { tr: 'Platforma üye oldun. Seni neler bekliyor?', en: "You've joined the platform. What's waiting for you?" },
    ps_edu_title:     { tr: 'Birebir Ableton Eğitimi', en: 'One-on-One Ableton Training' },
    ps_edu_desc:      { tr: 'Berkay Er ile kişiye özel prodüksiyon dersleri — 1 saat ücretsiz deneme, 500 GB preset paketi dahil. Tercih ettiğin gün ve saati seçerek ders talebini gönder.', en: 'Personalized production lessons with Berkay Er — includes 1 hour free trial and 500 GB preset pack. Select your preferred day and time to send a lesson request.' },
    ps_edu_link:      { tr: 'Eğitim sayfasına git →', en: 'Go to Education page →' },
    ps_forum_desc:    { tr: 'Sorularını sor, deneyimlerini paylaş, diğer prodüktörlerle etkileşime geç.', en: 'Ask questions, share experiences, interact with other producers.' },
    ps_lab_desc:      { tr: 'Synthesizer, Beat Maker, Mixer ve Arrangement Builder ile interaktif prodüksiyon öğren. (Ön koşul: deneme dersi al.)', en: 'Learn production interactively with Synthesizer, Beat Maker, Mixer and Arrangement Builder. (Prerequisite: take a trial lesson.)' },
    ps_booking_title: { tr: 'Ders Paneli', en: 'Lesson Panel' },
    ps_booking_desc:  { tr: 'Ders randevusu oluştur, takvimini görüntüle.', en: 'Create a lesson appointment, view your schedule.' },
    ps_reviews_title: { tr: 'Yorumlar', en: 'Reviews' },
    ps_reviews_desc:  { tr: 'Anasayfada yorum bırak, eğitim deneyimini diğer üyelerle paylaş.', en: 'Leave a review on the homepage, share your education experience with other members.' },
    ps_members_desc:  { tr: 'Projeye açık prodüktörleri keşfet, collab bul, sosyal profillere bak.', en: 'Discover producers open to projects, find collabs, browse social profiles.' },
    ps_profile_desc:  { tr: 'Genre etiketleri ekle, hakkında yaz, collab durumunu belirt.', en: 'Add genre tags, write about yourself, set your collab status.' },
    ps_message_title: { tr: 'Mesajlaşma', en: 'Messaging' },
    ps_message_desc:  { tr: 'Üyelerle birebir mesajlaş, anlık bildirim al.', en: 'Message members directly, get instant notifications.' },
    ps_collab_title:  { tr: 'Collab İsteği', en: 'Collab Request' },
    ps_collab_desc:   { tr: 'Projeye açık üyelere collab isteği gönder, kabul et ya da reddet.', en: 'Send collab requests to members open to projects, accept or reject.' },
    ps_start_btn:     { tr: 'Harika, başlayalım →', en: "Awesome, let's get started →" },

    // ── Egitim page ──
    eg_feat1:         { tr: 'Ableton Live kullanımı & workflow', en: 'Ableton Live usage & workflow' },
    eg_feat2:         { tr: 'Loop ve sample tasarımı',          en: 'Loop and sample design' },
    eg_feat3:         { tr: 'Melodic Techno yapım teknikleri',   en: 'Melodic Techno production techniques' },
    eg_feat4:         { tr: 'Ses mimarisi & atmosfer',          en: 'Sound architecture & atmosphere' },
    eg_feat5:         { tr: 'Live Set kurgulama & sahne',       en: 'Live Set creation & stage' },
    eg_feat6:         { tr: 'Özgün tarz geliştirme',           en: 'Developing a unique style' },
    eg_feat7:         { tr: 'Ayrıca 1 saat ücretsiz deneme dersi imkanı', en: 'Plus: 1 hour free trial lesson opportunity' },
    eg_mod_free:      { tr: 'ÜCRETSİZ',                        en: 'FREE' },
    eg_mod1_title:    { tr: 'Ableton Live Temelleri',           en: 'Ableton Live Basics' },
    eg_mod1_level:    { tr: 'Başlangıç',                       en: 'Beginner' },
    eg_mod1_t1:       { tr: 'Arayüz & workflow optimizasyonu', en: 'Interface & workflow optimization' },
    eg_mod1_t3:       { tr: 'Temel efektler & sinyal zinciri', en: 'Basic effects & signal chain' },
    eg_mod2_title:    { tr: 'Ritim & Beat Üretimi',            en: 'Rhythm & Beat Production' },
    eg_mod2_level:    { tr: 'Başlangıç — Orta',                en: 'Beginner — Intermediate' },
    eg_mod2_t1:       { tr: 'Drum Rack & sample layering',     en: 'Drum Rack & sample layering' },
    eg_mod2_t2:       { tr: 'Swing, groove & humanization',    en: 'Swing, groove & humanization' },
    eg_mod2_t3:       { tr: 'Velocity programlama',            en: 'Velocity programming' },
    eg_mod2_t4:       { tr: 'Peaktime & Techno ritim yapıları', en: 'Peaktime & Techno rhythm structures' },
    eg_mod3_title:    { tr: 'Parça Kurgulama ve Yapımı',       en: 'Track Arrangement & Production' },
    eg_mod3_level:    { tr: 'Orta — İleri',                    en: 'Intermediate — Advanced' },
    eg_mod3_t1:       { tr: 'Dark melodi & harmoni yapısı',    en: 'Dark melody & harmony structure' },
    eg_mod3_t3:       { tr: 'Arrangement şablonları',          en: 'Arrangement templates' },
    eg_mod4_title:    { tr: 'Loop & Sample Tasarımı',          en: 'Loop & Sample Design' },
    eg_mod4_level:    { tr: 'Orta',                            en: 'Intermediate' },
    eg_mod4_t1:       { tr: 'Sample seçimi & düzenleme',       en: 'Sample selection & editing' },
    eg_mod4_t3:       { tr: 'Chop, slice & warp',              en: 'Chop, slice & warp' },
    eg_mod4_t4:       { tr: "Loop'tan sahneye taşıma",         en: 'From loop to stage' },
    eg_mod5_title:    { tr: 'Ses Tasarımı & Synthesis',        en: 'Sound Design & Synthesis' },
    eg_mod5_level:    { tr: 'Orta',                            en: 'Intermediate' },
    eg_mod6_level:    { tr: 'Orta — İleri',                    en: 'Intermediate — Advanced' },
    eg_mod6_title:    { tr: 'Mixing & Mastering',              en: 'Mixing & Mastering' },
    eg_mod6_t1:       { tr: 'EQ, Compressor & Sidechain',      en: 'EQ, Compressor & Sidechain' },
    eg_mod6_t3:       { tr: 'Stereo genişlik & derinlik',      en: 'Stereo width & depth' },
    eg_mod7_title:    { tr: 'Özgün Tarz Geliştirme',           en: 'Developing a Unique Style' },
    eg_mod7_level:    { tr: 'Tüm seviyeler',                   en: 'All levels' },
    eg_mod7_t1:       { tr: 'Referans analizi & kulak eğitimi', en: 'Reference analysis & ear training' },
    eg_mod7_t2:       { tr: 'Müzikal kimlik & imza ses',       en: 'Musical identity & signature sound' },
    eg_mod7_t3:       { tr: 'Demo & release süreçleri',        en: 'Demo & release processes' },
    eg_mod8_title:    { tr: 'Live Set Kurgulama',              en: 'Live Set Creation' },
    eg_mod8_level:    { tr: 'İleri',                           en: 'Advanced' },
    eg_mod8_t3:       { tr: 'Canlı efekt & otomasyon',         en: 'Live effects & automation' },
    eg_mod8_t4:       { tr: 'Sahne dinamiği & crowd okuma',    en: 'Stage dynamics & crowd reading' },
    eg_modpush3_title:{ tr: 'Push 3 Laboratuvarı',           en: 'Push 3 Lab' },
    eg_faq1_q:        { tr: 'Ableton özel ders ücreti ne kadar?', en: 'How much does a private Ableton lesson cost?' },
    eg_faq2_q:        { tr: 'Online Ableton dersleri nasıl yapılıyor?', en: 'How are online Ableton lessons conducted?' },
    eg_faq3_q:        { tr: 'Prodüksiyon öğrenmek için ne kadar süre gerekiyor?', en: 'How long does it take to learn production?' },
    eg_faq4_q:        { tr: 'Hangi elektronik müzik türlerini öğretiyorsunuz?', en: 'Which electronic music genres do you teach?' },
    eg_magazine_read: { tr: 'Oku',                          en: 'Read' },

    // ── SSS page ──
    sss_hero_label:   { tr: 'Yardım Merkezi',              en: 'Help Center' },
    sss_hero_sub:     { tr: 'Eğitim programı, dersler ve topluluk hakkında merak ettiğin her şey. Cevabını bulamazsan doğrudan ulaşabilirsin.', en: "Everything you want to know about the program, the lessons and the community. If you can't find your answer, you can reach out directly." },
    sss_cat_egitim:   { tr: 'Eğitim hakkında', en: 'About the program' },
    sss_cat_ders:     { tr: 'Ders & paketler', en: 'Lessons & packages' },
    sss_cat_topluluk: { tr: 'Topluluk & bonuslar', en: 'Community & bonuses' },
    sss_q1:           { tr: 'Ücretsiz deneme dersi nedir?',   en: 'What is the free trial lesson?' },
    sss_a1:           { tr: 'İlk görüşme tamamen ücretsiz ve 1 saattir. Seviyeni, hedeflerini ve hangi türde üretim yapmak istediğini konuşuruz. Deneme sonrası sana özel bir müfredat ve fiyat teklifi sunarım. Hiçbir yükümlülük gerektirmez.', en: 'The first meeting is completely free and lasts 1 hour. We discuss your level, goals and what genre you want to produce. After the trial I offer you a personalized curriculum and price. No commitment required.' },
    sss_q2:           { tr: 'Dersler nasıl yapılıyor?',       en: 'How are lessons conducted?' },
    sss_a2:           { tr: 'Dersler Zoom üzerinden, birebir ve online yapılıyor. Ekran paylaşımı ile kendi Ableton projen ya da sıfırdan parça yaptığımız üzerinde çalışıyoruz. Anlık geri bildirim ve doğrudan düzeltmelerle öğrenme çok daha hızlı ilerliyor.', en: 'Lessons are conducted one-on-one and online via Zoom. We work on your own Ableton project or a track we build from scratch via screen sharing. Learning progresses much faster with instant feedback and direct corrections.' },
    sss_q3:           { tr: 'Hangi DAW öğretiliyor?',         en: 'Which DAW is taught?' },
    sss_a3:           { tr: "Eğitim programı Ableton Live üzerine kurulu. Ableton, elektronik müzik üretimi için en güçlü ve esnek araçlardan biri — özellikle sahne performansı ve sound design için idealdir. Diğer DAW'lara aşinalığın varsa fark yaratmaz, sıfırdan başlayabiliriz.", en: "The curriculum is built around Ableton Live. Ableton is one of the most powerful and flexible tools for electronic music production — especially ideal for live performance and sound design. If you're familiar with other DAWs it doesn't matter, we can start from scratch." },
    sss_q4:           { tr: 'Hiç deneyimim olmadan başlayabilir miyim?', en: 'Can I start with no experience at all?' },
    sss_a4:           { tr: "Evet, kesinlikle. Sıfır deneyimle başlayan öğrenciler için temel seviyeden başlayan kişisel bir müfredat oluşturuyorum. Tek gereksinim öğrenme motivasyonu ve Ableton Live'a (deneme sürümü de olur) erişim.", en: "Yes, absolutely. I create a personal curriculum starting from basic level for students who start with zero experience. The only requirement is learning motivation and access to Ableton Live (trial version is fine)." },
    sss_q5:           { tr: 'Hangi müzik türlerini öğretiyorsunuz?', en: 'Which music genres do you teach?' },
    sss_a5:           { tr: 'Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass ve Indie Dance türlerinde eğitim veriyorum. Multi-genre bir yaklaşımla, hangi tarza odaklanmak istersen müfredatı ona göre şekillendiririz.', en: 'I teach Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass and Indie Dance. With a multi-genre approach, we shape the curriculum around whatever style you want to focus on.' },
    sss_q6:           { tr: 'Prodüksiyon öğrenmek ne kadar sürer?', en: 'How long does it take to learn production?' },
    sss_a6:           { tr: 'Seviyene ve haftalık pratik süresine göre değişiyor. Sıfırdan başlayan bir öğrenci 3–6 ay içinde kendi parçalarını üretebilir hale geliyor. Düzenli pratikle bu süre belirgin biçimde kısalıyor.', en: 'It varies by level and weekly practice time. A student starting from zero can produce their own tracks within 3–6 months. With regular practice this time shortens significantly.' },
    sss_q7:           { tr: 'Dersler ne sıklıkla yapılıyor?', en: 'How often are lessons held?' },
    sss_a7:           { tr: 'Standart paket haftada 1 ders (ayda 4 ders) üzerine kurulu. İstersen ayda 2 veya 3 ders şeklinde daha esnek bir program da oluşturabiliriz. Minimum paket 3 ders.', en: 'The standard package is built on 1 lesson per week (4 lessons per month). We can also create a more flexible schedule of 2 or 3 lessons per month. Minimum package is 3 lessons.' },
    sss_q8:           { tr: 'Ders fiyatları nasıl belirleniyor?', en: 'How are lesson prices determined?' },
    sss_a8:           { tr: 'Fiyatlandırma seçtiğin ders sayısına ve programa göre değişiyor. Ücretsiz deneme dersi sonrasında ihtiyacına özel bir teklif sunuluyor.', en: 'Pricing varies based on the number of lessons and program you choose. A custom offer is presented after the free trial lesson.' },
    sss_q9:           { tr: 'Alınan dersleri iptal edebilir miyim?', en: 'Can I cancel purchased lessons?' },
    sss_a9:           { tr: 'Hayır. Alınan ders paketleri iptal edilemez ve başka bir kişiye devredilemez. Ders saatini değiştirmek için en az 24 saat öncesinden haber vermen yeterli.', en: 'No. Purchased lesson packages cannot be cancelled or transferred to another person. You just need to give at least 24 hours notice to change the lesson time.' },
    sss_q10:          { tr: 'Bonus materyaller neler?',        en: 'What are the bonus materials?' },
    sss_a10:          { tr: 'Eğitime kayıtlı öğrenciler 500+ GB preset ve sample paketine erişim sağlıyor. Bunun yanı sıra ders notları, referans parçaları ve özel hazırlanmış Ableton proje dosyaları da paylaşılıyor.', en: 'Students enrolled in the program get access to 500+ GB of presets and sample packs. Additionally, lesson notes, reference tracks and specially prepared Ableton project files are shared.' },
    sss_q11:          { tr: 'Topluluk platformu var mı?',      en: 'Is there a community platform?' },
    sss_a11:          { tr: 'Evet. Bu site — berkayeracademy.com — öğrencilerin birbirleriyle etkileşime geçebileceği bir platform. Forum, üye dizini, profil sayfaları ve öğrencilere özel araçlarla Ableton Lab aktif olarak kullanıma açık.', en: 'Yes. This site — berkayeracademy.com — is a platform where students can interact with each other. The Forum, member directory, profile pages and Ableton Lab with student-exclusive tools are all actively available.' },
    sss_q12:          { tr: 'Sertifika alabilir miyim?',       en: 'Can I get a certificate?' },
    sss_a12:          { tr: 'Resmi bir sertifika programı şu an aktif değil. Ama eğitim sonunda kendi parçalarını, mixini ve prodüksiyon anlayışını kapsayan bir portfolyo oluşturmuş olacaksın — bu, herhangi bir sertifikadan daha değerli bir kanıt.', en: "There's no official certificate program at the moment. But by the end of your training you'll have built a portfolio covering your own tracks, mixes and production understanding — this is more valuable proof than any certificate." },
    sss_cta_q:        { tr: 'Soruların cevaplanmadı mı?',     en: "Didn't find your answer?" },
    sss_cta_p:        { tr: 'Ücretsiz deneme dersi ayarla — her şeyi detaylıca konuşuruz.', en: "Book a free trial lesson — we'll talk everything through in detail." },
    sss_cta_btn:      { tr: 'Ücretsiz deneme dersi', en: 'Free trial lesson' },

    // ── Ders-ableton page ──
    da_lesson_title1: { tr: 'Ableton Live',                   en: 'Ableton Live' },
    da_meta3:         { tr: 'Sesli ders içeriği',             en: 'Audio lesson content' },
    da_learn1:        { tr: 'Ableton Live arayüzüne genel bakış', en: 'Overview of Ableton Live interface' },
    da_learn2:        { tr: 'Session View ve Arrangement View farkı', en: 'Difference between Session View and Arrangement View' },
    da_learn3:        { tr: 'MIDI & Audio routing temelleri',  en: 'MIDI & Audio routing fundamentals' },
    da_learn4:        { tr: 'Temel efektler ve sinyal zinciri', en: 'Basic effects and signal chain' },
    da_learn5:        { tr: 'Workflow optimizasyonu & kısayollar', en: 'Workflow optimization & shortcuts' },
    da_prereq_title:  { tr: 'Ön gereksinim',               en: 'Prerequisites' },
    da_prereq2:       { tr: 'Müzik teorisi bilgisi gerekmez', en: 'No music theory knowledge required' },
    da_prereq3:       { tr: 'Kulaklık veya monitör hoparlör önerilir', en: 'Headphones or monitor speakers recommended' },
    da_cta_sub:       { tr: 'Tüm modüller için birebir ders ayarla.', en: 'Book one-on-one lessons for all modules.' },

    // ── Forum page ──
    forum_stat_total: { tr: 'Toplam Yanıt',                   en: 'Total Replies' },
    forum_login_btn:  { tr: 'Giriş Yap',                      en: 'Sign in' },
    forum_loading:    { tr: 'Yükleniyor...',                  en: 'Loading...' },
    forum_no_posts:   { tr: 'Henüz konu yok.',                en: 'No topics yet.' },
    forum_replies:    { tr: 'yanıt',                          en: 'replies' },
    forum_sidebar_comm: { tr: 'Topluluk',                         en: 'Community' },
    forum_stat_total_topics: { tr: 'Toplam Konu',                 en: 'Total Topics' },
    forum_rules_title:  { tr: 'Kurallar',                         en: 'Rules' },

    // ── Members page ──
    members_sort_az:  { tr: 'İsim A-Z',                      en: 'Name A-Z' },
    members_login_msg: { tr: 'Üyeleri görmek için giriş yapman gerekiyor.', en: 'You need to sign in to see members.' },
    members_no_members: { tr: 'Üye bulunamadı.',             en: 'No members found.' },
    members_loading:  { tr: 'Üyeler yükleniyor...',          en: 'Loading members...' },

    // ── Profile page ──
    prof_joined:      { tr: 'Katılım:',                      en: 'Joined:' },
    prof_topics:      { tr: 'Konu',                          en: 'Topics' },
    prof_replies:     { tr: 'Yanıt',                         en: 'Replies' },
    prof_followers:   { tr: 'Takipçi',                       en: 'Followers' },
    prof_collab_sent: { tr: '✓ İstek Gönderildi',            en: '✓ Request Sent' },
    prof_about_ph:    { tr: 'Kendinden, müzik tarzından bahset...', en: 'Tell about yourself, your music style...' },
    prof_save:        { tr: 'Kaydet',                     en: 'Save' },
    prof_open:        { tr: 'Projeye Açık',               en: 'Open to Projects' },
    prof_busy:        { tr: 'Meşgul',                     en: 'Busy' },
    prof_loading:     { tr: 'Profil yükleniyor...',          en: 'Loading profile...' },
    prof_not_found:   { tr: 'Kullanıcı bulunamadı.',         en: 'User not found.' },
    prof_no_topics:   { tr: 'Henüz konu açılmamış.',         en: 'No topics yet.' },
    prof_no_replies:  { tr: 'Henüz yanıt verilmemiş.',       en: 'No replies yet.' },
    prof_signin_req:  { tr: 'Bu profili görmek için giriş yapman gerekiyor.', en: 'You need to sign in to view this profile.' },
    prof_about_empty: { tr: 'Kendinden bahset...',           en: 'Tell us about yourself...' },
    prof_photo_label: { tr: 'Profil Fotoğrafı',             en: 'Profile Photo' },
    prof_photo_btn:   { tr: 'Fotoğraf Seç',              en: 'Choose Photo' },
    prof_photo_hint:  { tr: 'Google fotoğrafın otomatik kullanılır. Değiştirmek için seç.', en: 'Your Google photo is used by default. Choose to replace it.' },
    prof_about_label: { tr: 'Hakkında',                     en: 'About' },
    prof_genres_label:{ tr: 'Genreler',                     en: 'Genres' },
    prof_genres_add:  { tr: '+ Ekle',                       en: '+ Add' },
    prof_collab_label:{ tr: 'İşbirliği Durumu',             en: 'Collab Status' },
    prof_collab_none: { tr: 'Belirtme',                     en: 'Not Specified' },
    prof_saved:       { tr: '✓ Kaydedildi',                 en: '✓ Saved' },
    prof_saved_toast: { tr: '✓ Profil güncellendi!',        en: '✓ Profile updated!' },
    prof_save_err:    { tr: 'Kayıt başarısız',           en: 'Save failed' },
    prof_close:       { tr: 'Kapat',                        en: 'Close' },
    prof_font_label:  { tr: 'Font Netleştir',               en: 'Sharper Font' },
    prof_font_sub:    { tr: 'Yazıları daha büyük ve okunaklı gösterir', en: 'Makes text larger and more readable' },
    prof_chat_title:  { tr: 'Mesajlar',                     en: 'Messages' },
    prof_search_ph:   { tr: 'Üye ara…',                     en: 'Search members…' },
    prof_chat_empty1: { tr: 'Bir sohbet seç',               en: 'Select a conversation' },
    prof_chat_empty2: { tr: 'veya üye ara',                 en: 'or search for a member' },
    prof_msg_ph:      { tr: 'Mesaj yaz…',                   en: 'Type a message…' },
    prof_msg_hint:    { tr: 'Mesaj gönder',              en: 'Send message' },
    prof_msg_empty:   { tr: 'Henüz mesaj yok.',             en: 'No messages yet.' },
    prof_msg_first:   { tr: 'İlk mesajı sen gönder.',       en: 'Be the first to send one.' },
    prof_msg_load:    { tr: 'Yükleniyor…',                  en: 'Loading…' },
    prof_msg_err:     { tr: 'Mesajlar yüklenemedi.',        en: 'Messages could not be loaded.' },
    prof_msg_max_err: { tr: 'Mesaj en fazla 2000 karakter.', en: 'Message cannot exceed 2000 characters.' },
    prof_msg_send_err:{ tr: 'Mesaj gönderilemedi',          en: 'Message could not be sent' },
    prof_collab_exists:{ tr: 'Zaten bekleyen bir collab isteği var.', en: 'A pending collab request already exists.' },
    prof_collab_sending:{ tr: 'Gönderiliyor…',             en: 'Sending…' },
    prof_collab_send_err:{ tr: 'Gönderilemedi',            en: 'Failed to send' },
    prof_collab_req_sent:{ tr: 'Collab isteği gönderdin', en: 'You sent a collab request' },
    prof_collab_req_recv:{ tr: 'Collab isteği aldın',   en: 'You received a collab request' },
    prof_collab_accept:{ tr: 'Kabul Et',                   en: 'Accept' },
    prof_collab_reject:{ tr: 'Reddet',                     en: 'Reject' },
    prof_collab_accepted_s:{ tr: '✓ Kabul edildi',         en: '✓ Accepted' },
    prof_collab_rejected_s:{ tr: '✕ Reddedildi',          en: '✕ Rejected' },
    prof_collab_tooltip:{ tr: 'Collab isteği gönder',      en: 'Send collab request' },
    prof_title_none:   { tr: 'Ünvan Yok',                   en: 'No Title' },
    prof_title_acemi:  { tr: 'Acemi',                        en: 'Beginner' },
    prof_title_merakli:{ tr: 'Prodüksiyon Meraklısı',        en: 'Production Enthusiast' },
    prof_title_uretici:{ tr: 'Üretici',                      en: 'Producer' },
    prof_title_veteran:{ tr: 'Veteran',                      en: 'Veteran' },
    prof_title_usta:   { tr: 'Usta',                         en: 'Master' },
    prof_title_efsane: { tr: 'Efsane',                       en: 'Legend' },

    // ── New-post page ──
    np_title_label:   { tr: 'Başlık',                        en: 'Title' },
    np_signin_h2:     { tr: 'Giriş Gerekli',                 en: 'Sign In Required' },
    np_signin_p:      { tr: 'Konu açmak için önce giriş yapman gerekiyor.', en: 'You need to sign in first to create a topic.' },

    // ── Post page ──
    post_back:        { tr: '← Forum',                       en: '← Forum' },
    post_not_found:   { tr: 'Konu bulunamadı.',              en: 'Topic not found.' },
    post_reply_ph:    { tr: 'Yanıtını yaz...',               en: 'Write your reply...' },
    post_reply_btn:   { tr: 'Yanıtla',                       en: 'Reply' },
    post_signin_reply: { tr: 'Yanıtlamak için giriş yap',   en: 'Sign in to reply' },
    post_replies_h:   { tr: 'Yanıtlar',                      en: 'Replies' },
    post_no_replies:  { tr: 'Henüz yanıt yok. İlk yanıtı sen yaz!', en: 'No replies yet. Be the first to reply!' },

    // ── Booking page (key UI strings) ──
    bk_rejected_title: { tr: 'Talep Reddedildi',            en: 'Request Rejected' },
    bk_paid:          { tr: '✓ Ödendi',                      en: '✓ Paid' },
    bk_this_month:    { tr: 'Bu ay',                         en: 'This month' },
    bk_lessons: { tr: `ders`, en: `lessons` },
    bk_cancel:        { tr: 'İptal',                         en: 'Cancel' },
    bk_reschedule:    { tr: '↺ Ertele',                      en: '↺ Reschedule' },
    bk_zoom_join:     { tr: 'Derse Katıl',                   en: 'Join Lesson' },
    bk_no_lessons:    { tr: 'Henüz ders planlanmamış.',      en: 'No lessons scheduled yet.' },
    bk_loading:       { tr: 'Yükleniyor...',                 en: 'Loading...' },
    bk_rule_reschedule: { tr: 'Erteleme Hakkı',             en: 'Reschedule Right' },
    bk_rule_notice:   { tr: 'Erteleme Bildirimi',            en: 'Reschedule Notice' },
    bk_rule_limit:    { tr: 'Erteleme Sınırı',               en: 'Reschedule Limit' },
    bk_rule_cancel:   { tr: 'İptal Politikası',              en: 'Cancellation Policy' },

    // ── Ableton Lab UI extra ──
    lab_mod_tasks:    { tr: 'Görevler',           en: 'Tasks' },
    lab_mod_complete: { tr: 'Modül Tamamlandı!',  en: 'Module Complete!' },
    lab_congrats:     { tr: 'Tebrikler!',          en: 'Congratulations!' },
    lab_badge_earned: { tr: 'Rozet Kazanıldı', en: 'Badge Earned' },
    lab_awesome:      { tr: 'Harika!',             en: 'Awesome!' },
    lab_preset_save:  { tr: 'Preset Kaydet',       en: 'Save Preset' },
    lab_beat_save:    { tr: 'Beat Kaydet',          en: 'Save Beat' },
    lab_reset:        { tr: '↺ Sıfırla',           en: '↺ Reset' },
    lab_task_word:    { tr: 'Görev',               en: 'Task' },
    lab_no_preset:    { tr: 'Kayıtlı Preset Yok',  en: 'No Saved Presets' },
    lab_no_beat:      { tr: 'Kayıtlı Beat Yok',    en: 'No Saved Beats' },

    // ── Ableton Lab page ──
    lab_status_done:  { tr: 'Tamamlandı',                    en: 'Completed' },

    // ── Forum filter & solved ──
    forum_brand:         { tr: 'Topluluk Forumu',    en: 'Community Forum' },
    forum_filter_all:    { tr: 'Tümü',              en: 'All' },
    forum_filter_open:   { tr: 'Açık',              en: 'Open' },
    forum_filter_solved: { tr: 'Çözüldü',           en: 'Solved' },
    forum_mark_solved:   { tr: 'Çözüldü işaretle', en: 'Mark as solved' },
    forum_is_solved:     { tr: '✓ Çözüldü',         en: '✓ Solved' },
    forum_pinned:        { tr: 'Sabitlendi', en: 'Pinned' },
    forum_reply_btn:     { tr: 'Yanıtla', en: 'Reply' },
    forum_reply_n:       { tr: 'Yanıt', en: 'Replies' },
    forum_like_signin:   { tr: 'Beğenmek için giriş yap', en: 'Sign in to like' },
    forum_edit_ph:       { tr: 'Konu içeriği...', en: 'Topic content...' },
    forum_post_updated:  { tr: '✓ Konu güncellendi', en: '✓ Post updated' },
    forum_pin_active:    { tr: 'Sabitti', en: 'Pinned' },
    forum_pin_btn:       { tr: 'Sabitle', en: 'Pin' },
    forum_solved_closed: { tr: '✓ Bu konu çözüldü — yanıt kapalı', en: '✓ This topic is solved — replies closed' },

    // ── Members ──
    mem_acemi:        { tr: 'Acemi',                  en: 'Beginner' },
    mem_merakli:      { tr: 'Prodüksiyon Meraklısı',  en: 'Production Enthusiast' },
    mem_uretici:      { tr: 'Üretici',                en: 'Producer' },
    mem_veteran:      { tr: 'Veteran',                en: 'Veteran' },
    mem_usta:         { tr: 'Usta',                   en: 'Master' },
    mem_efsane:       { tr: 'Efsane',                 en: 'Legend' },
    mem_collab_open:  { tr: 'Projeye Açık',           en: 'Open to Collab' },
    mem_joined_since: { tr: "'dan beri üye",           en: 'member since' },
    mem_no_results:   { tr: 'için sonuç bulunamadı.',  en: 'no results found.' },
    mem_no_filter:    { tr: 'Bu kriterlerde üye yok.', en: 'No members match this filter.' },
    mem_collab_busy:  { tr: 'Meşgul', en: 'Busy' },
    members_sort_new_old: { tr: 'Yeni → Eski', en: 'New → Old' },
    members_sort_old_new: { tr: 'Eski → Yeni', en: 'Old → New' },

    // ── Booking status labels ──
    bk_status_scheduled:   { tr: 'Planlandı',           en: 'Scheduled' },
    bk_status_completed:   { tr: 'Tamamlandı',          en: 'Completed' },
    bk_status_rescheduled: { tr: 'Ertelendi',           en: 'Rescheduled' },
    bk_status_cancelled:   { tr: 'İptal',               en: 'Cancelled' },
    bk_status_cancel_req:  { tr: 'İptal Talep Edildi',  en: 'Cancel Requested' },
    bk_status_frozen:      { tr: 'Donduruldu',       en: 'Frozen' },
    bk_past_lessons:       { tr: 'Geçmiş Dersler',      en: 'Past Lessons' },
    bk_frozen_reminder: { tr: `Yeni tarihler belirlenince bildirim alacaksın. Sorun olursa Berkay Er’e yaz.`, en: `You’ll be notified when new dates are set. Write to Berkay Er if you have questions.` },
    bk_frozen_banner: { tr: `Ders planın donduruldu.`, en: `Your lesson plan is frozen.` },
    bk_frozen_note:        { tr: 'Ders donduruldu — Yeni tarih:', en: 'Lesson frozen — New date:' },
    bk_no_upcoming:        { tr: 'Yaklaşan ders yok.',  en: 'No upcoming lessons.' },
    bk_no_requests:        { tr: 'Bekleyen talep yok.', en: 'No pending requests.' },
    bk_submit_btn:         { tr: 'Talep Gönder',        en: 'Send Request' },
    bk_request_sent:       { tr: '✓ Talep gönderildi, eğitmeniniz onaylayacak.', en: '✓ Request sent, your instructor will approve.' },
    bk_lessons_left:       { tr: 'kaldı',               en: 'remaining' },
    bk_book_signin_desc:   { tr: 'Ders talebi oluşturmak veya takvimini görmek için Google hesabınla ya da e-posta adresinle giriş yap.', en: 'Sign in with Google or your email to create a lesson request or view your schedule.' },
    bk_my_schedule:        { tr: 'Ders Takvimim',       en: 'My Lesson Schedule' },
    bk_rules_title:        { tr: 'Ders Kuralları',      en: 'Lesson Rules' },
    bk_note_hint:          { tr: 'tercih / istek bırak', en: 'leave a preference / request' },
    bk_qa_hint:            { tr: 'Berkay Er yanıtlar',  en: 'Berkay Er replies' },
    bk_rule_reschedule_desc: { tr: `Paketin kaç aylıksa o kadar erteleme hakkın olur (1 ay = 1 hak, 3 ay = 3 hak); hakları paket süresince istediğin derste kullanabilirsin. Ertele dersi 1 hafta ileri alır ve Berkay Er onaylayınca 1 hak düşer. Aynı hafta içinde saat değiştirmek (Saati değiştir) ücretsizdir, hak düşmez. Ek hak 500 TL.`, en: `You get as many reschedule credits as your package has months (1 month = 1, 3 months = 3); use them on any lesson during the package. Reschedule moves a lesson one week later and uses 1 credit once Berkay Er approves. Changing the time within the same week (Change time) is free. Extra credits cost 500 TL.` },
    bk_rule_notice_desc: { tr: `Erteleme en az 24 saat önceden talep edilir; ders 1 hafta ileri alınır.`, en: `A reschedule must be requested at least 24 hours ahead; the lesson moves one week later.` },
    bk_rule_limit_desc: { tr: `Kullanılmayan haklar paket bitince sona erer.`, en: `Unused credits expire when the package ends.` },
    bk_rule_late:          { tr: 'Derse Geç Kalma',     en: 'Late Arrival' },
    bk_rule_late_desc:     { tr: 'Derse 10 dakika içinde girilmezse ders yapılmış sayılır.', en: 'If you do not join within 10 minutes the lesson is counted as completed.' },
    bk_rule_absence:       { tr: 'Devamsızlık',         en: 'Absence' },
    bk_rule_absence_desc: { tr: `Haber vermeden derse katılmazsan ders yapılmış sayılır ve yeniden planlanmaz.`, en: `If you miss a lesson without notice, it counts as held and is not rescheduled.` },
    bk_rule_copyright:     { tr: 'Telif Hakkı',          en: 'Copyright' },
    bk_rule_copyright_desc:{ tr: "Berkay Er'in derste paylaştığı ve yaptığı parçalar/içerikler kendisine aittir. Hiçbir şekilde paylaşılamaz veya dağıtılamaz.", en: "Tracks and content created or shared by Berkay Er during lessons belong to him; they cannot be shared or distributed in any way." },
    bk_rule_cancel_desc:   { tr: 'Alınan dersler iptal edilemez ve başka bir kişiye devir edilemez.', en: 'Purchased lessons cannot be cancelled or transferred to another person.' },
    bk_rule_footer: { tr: `Bu kurallar derslerin düzenli ve etkili yapılmasına yardımcı olur. Ders gün ve saatlerini belirlemeyen öğrenci için ders yapılamaz.`, en: `These rules keep lessons regular and effective. Lessons can’t be held for students who haven’t set their lesson days and times.` },
    bk_rule_footer2: { tr: `Sorun olursa bana yazmaktan çekinme. Anlayışın ve işbirliğin için teşekkür ederim.`, en: `If you have questions, don’t hesitate to write to me. Thank you for your understanding.` },
    bk_single_note:        { tr: 'Paket alan öğrencilerin ders saati değişiklikleri ile çakıştığında <strong>paket alan öğrencilerin öncelikleri vardır</strong>. Bu nedenle seçtiğiniz saat iptal edilebilir.', en: 'When conflicting with schedule changes of package students, <strong>package students have priority</strong>. Your selected slot may be cancelled.' },
    bk_slot_single_hint:   { tr: 'Gün & Saat Seç <span class="hint-sub">(bir saat seç)</span>', en: 'Select Day & Time <span class="hint-sub">(pick one slot)</span>' },
    bk_err_no_slot:        { tr: 'En az bir ders saati seçmelisin.', en: 'You must select at least one slot.' },
    bk_err_single_slot:    { tr: 'Tek ders için yalnızca bir saat seçmelisin.', en: 'You must select only one slot for a single lesson.' },
    bk_err_min_lessons:    { tr: 'En az 3 ders seçilmelidir.', en: 'At least 3 lessons must be selected.' },
    bk_submitting:         { tr: 'Gönderiliyor…',       en: 'Submitting…' },
    bk_pending_status:     { tr: 'Talep Beklemede',      en: 'Request Pending' },
    bk_pending_desc: { tr: `Berkay Er talebini inceleyip onaylayacak.<br>Onaylanınca ders takvimin burada görünür.`, en: `Berkay Er will review and approve your request.<br>Once approved, your lesson schedule appears here.` },
    bk_rejected_desc: { tr: `Talebin şu an için uygun görülmedi.<br>Yeni bir talep oluşturabilirsin.`, en: `Your request wasn’t approved this time.<br>You can create a new request.` },
    bk_retry_btn:          { tr: '↺ Yeniden Dene',      en: '↺ Try Again' },
    bk_new_request_btn:    { tr: '+ Yeni Talep Oluştur', en: '+ Create New Request' },
    bk_lab_before:         { tr: 'Derse başlamadan önce Ableton Lab\'ı tamamla', en: 'Complete Ableton Lab before your lessons' },
    bk_reschedule_no_credit: { tr: `Erteleme hakkın kalmadı.`, en: `You have no reschedule credits left.` },
    bk_resched_req_note: { tr: `Talebin Berkay Er’e iletilir — onaylayınca takvimin güncellenir ve sana bildirim gelir.`, en: `Your request goes to Berkay Er — once approved, your schedule updates and you get notified.` },
    bk_resched_req_btn: { tr: `Erteleme talebi gönder`, en: `Send reschedule request` },
    bk_resched_req_sent: { tr: `✓ Erteleme talebin gönderildi — Berkay Er onaylayınca takvimin güncellenir.`, en: `✓ Reschedule request sent — your schedule updates once Berkay Er approves.` },
    bk_resched_pending:    { tr: 'Erteleme onayı bekliyor', en: 'Reschedule pending approval' },
    bk_reschedule_24h: { tr: `Erteleme en az 24 saat önceden talep edilmelidir.`, en: `A reschedule must be requested at least 24 hours in advance.` },
    bk_reschedule_modal_title: { tr: `Dersi ertele`, en: `Reschedule lesson` },
    bk_reschedule_current: { tr: `Mevcut`, en: `Current` },
    bk_reschedule_next_week: { tr: `Yeni tarih (1 hafta sonra)`, en: `New date (1 week later)` },
    bk_req_submitted: { tr: `✓ Talebin gönderildi!`, en: `✓ Your request has been sent!` },
    bk_refresh_status:     { tr: '↺ Durumu Yenile', en: '↺ Refresh Status' },
    bk_student_fallback:   { tr: 'Öğrenci', en: 'Student' },
    bk_trial_label:        { tr: 'Deneme Dersi', en: 'Trial Lesson' },
    bk_saved:              { tr: '✓ Kaydedildi', en: '✓ Saved' },
    bk_save:               { tr: 'Kaydet', en: 'Save' },
    bk_stat_this_month:    { tr: 'Bu Ay', en: 'This Month' },
    bk_stat_completed:     { tr: 'Tamamlanan', en: 'Completed' },
    bk_stat_total:         { tr: 'Toplam', en: 'Total' },
    bk_payment_label:      { tr: 'Toplam Ücret', en: 'Total Fee' },
    bk_pay_btn: { tr: `Ödemeyi yaptım`, en: `I’ve paid` },
    bk_pay_confirm: { tr: `Havaleyi yaptın mı?`, en: `Have you made the transfer?` },
    bk_pay_request_sent: { tr: `Ödeme bildirimin gönderildi — Berkay Er onaylayınca derslerin açılır.`, en: `Payment notice sent — your lessons open once Berkay Er confirms.` },
    bk_pending_approval: { tr: `Onay bekleniyor`, en: `Awaiting approval` },
    bk_pay_info_title:     { tr: 'Ödeme Bilgileri', en: 'Payment Info' },
    bk_pay_bank:           { tr: 'Banka', en: 'Bank' },
    bk_pay_name_label:     { tr: 'İsim', en: 'Name' },
    bk_pay_iban:           { tr: 'IBAN', en: 'IBAN' },
    bk_pay_copy:           { tr: 'Kopyala', en: 'Copy' },
    bk_pay_warn: { tr: `Açıklama kısmına <strong>hiçbir şey yazma.</strong>`, en: `Please do <strong>not write anything</strong> in the payment description.` },
    bk_frozen:             { tr: 'Plan donduruldu — ek ders talep edilemez', en: 'Plan frozen — extra lessons cannot be requested' },
    bk_extra_lesson:       { tr: 'Ek Ders Satın Al', en: 'Purchase Extra Lesson' },
    bk_extra_lesson_title: { tr: 'Ek Ders Talebi', en: 'Extra Lesson Request' },
    bk_time_label:         { tr: 'SAAT', en: 'TIME' },
    bk_slot_full_label:    { tr: '(dolu)', en: '(full)' },
    bk_slot_too_soon: { tr: '(24 saatten az)', en: '(under 24h)' },
    bk_reschedule_disabled: { tr: `Ödemen onaylanınca saat değiştirme ve erteleme açılır.`, en: `Changing and rescheduling lessons opens once your payment is confirmed.` },

    // ── Ders saatini kendin değiştir (onaysız) ──
    bk_sc_btn:             { tr: `Saati değiştir`, en: `Change time` },
    bk_sc_locked: { tr: `Saat değişikliği kapandı`, en: `Time change closed` },
    bk_sc_pay:             { tr: `Ödeme onaylanmadan ders saati değiştirilemez.`, en: `You can't change the time before payment is confirmed.` },
    bk_sc_title:           { tr: `Ders saatini değiştir`, en: `Change your lesson time` },
    bk_sc_current:         { tr: `Şu anki dersin`, en: `Your current lesson` },
    bk_sc_soon:            { tr: `5 saatten yakın`, en: `Within 5 hours` },
    bk_sc_busy:            { tr: `Dolu / kapalı`, en: `Taken / closed` },
    bk_sc_old:             { tr: `Eski`, en: `Old` },
    bk_sc_new:             { tr: `Yeni`, en: `New` },
    bk_sc_chk_lesson:      { tr: `Dersine {d} var (en az 5 saat)`, en: `{d} until your lesson (min. 5 hours)` },
    bk_sc_chk_new:         { tr: `Yeni saat {d} sonra (en az 5 saat)`, en: `New time is in {d} (min. 5 hours)` },
    bk_sc_chk_new_empty:   { tr: `Yeni saat en az 5 saat sonra olmalı`, en: `The new time must be at least 5 hours away` },
    bk_sc_chk_free:        { tr: `Seçilen saat müsait`, en: `The selected time is free` },
    bk_sc_chk_week:        { tr: `Aynı hafta içinde · bu dersin tek değişikliği`, en: `Same week · this lesson's only change` },
    bk_sc_cancel:          { tr: `Vazgeç`, en: `Cancel` },
    bk_sc_confirm:         { tr: `Değişikliği onayla — anında uygulanır`, en: `Confirm — applies instantly` },
    bk_sc_foot:            { tr: `Berkay Er'e otomatik WhatsApp + e-posta bildirimi gider; onay gerekmez. Dersine 5 saatten az kaldıysa değişiklik kilitlenir — o durumda erteleme kuralları geçerlidir.`,
                             en: `Berkay Er gets an automatic WhatsApp + email; no approval needed. Within 5 hours of the lesson the time is locked — the rescheduling rules apply then.` },
    bk_sc_saving:          { tr: `Kaydediliyor…`, en: `Saving…` },
    bk_sc_err:             { tr: `Saat değiştirilemedi`, en: `Couldn't change the time` },
    // ── Derslerim · bu hafta (DersPaneli #derslerim): kartlar, canlı sayaç, seçici, alt sayfa ──
    bk_wk_eyebrow:         { tr: `Derslerim · Bu hafta`, en: `My lessons · This week` },
    bk_wk_eyebrow_m:       { tr: `Derslerim · Saat değiştir`, en: `My lessons · Change time` },
    bk_wk_title:           { tr: `Ders saatini kendin değiştir`, en: `Change your lesson time yourself` },
    bk_wk_lead_html:       { tr: `Onay beklemeden, anında. Tek şart: dersine <strong>en az 5 saat</strong> olmalı ve yeni saat de en az 5 saat sonra olmalı.`,
                             en: `Instantly, no approval needed. The only condition: your lesson must be <strong>at least 5 hours</strong> away, and the new time must also be at least 5 hours away.` },
    bk_wk_lead_m_html:     { tr: `Onay beklemeden değiştir — dersine <strong>en az 5 saat</strong> olmalı.`, en: `Change it without approval — your lesson must be <strong>at least 5 hours</strong> away.` },
    bk_wk_now:             { tr: `Şimdi`, en: `Now` },
    bk_wk_tz:              { tr: `İstanbul saati`, en: `Istanbul time` },
    bk_wk_tz_short:        { tr: `TSİ`, en: `TRT` },
    bk_wk_tz_rule:         { tr: `Saatler İstanbul saatine göredir.`, en: `All times are Istanbul time.` },
    bk_wk_list_aria:       { tr: `Bu haftaki derslerin`, en: `Your lessons this week` },
    bk_wk_dur_online:      { tr: `60 dk · Online`, en: `60 min · Online` },
    bk_wk_left:            { tr: `{d} kaldı`, en: `{d} left` },
    bk_wk_past:            { tr: `Ders zamanı geçti`, en: `Lesson time has passed` },
    bk_wk_lock_in: { tr: `Saat değişikliği {d} daha açık`, en: `time change open for {d}` },
    bk_wk_zero:            { tr: `0 dk`, en: `0 min` },
    bk_wk_badge_ok:        { tr: `Değiştirilebilir`, en: `Changeable` },
    bk_wk_badge_soon:      { tr: `Son dakikalar`, en: `Locking soon` },
    bk_wk_badge_locked:    { tr: `Kilitli`, en: `Locked` },
    bk_wk_badge_moved:     { tr: `Taşındı`, en: `Moved` },
    bk_wk_badge_done:      { tr: `Tamamlandı`, en: `Completed` },
    bk_wk_badge_unpaid:    { tr: `Ödeme bekleniyor`, en: `Awaiting payment` },
    bk_wk_badge_resched:   { tr: `Erteleme bekliyor`, en: `Reschedule pending` },
    bk_wk_btn_open:        { tr: `Seçim açık`, en: `Picker open` },
    bk_wk_btn_moved:       { tr: `Bir kez taşındı`, en: `Already moved once` },
    bk_wk_pick_label:      { tr: `Yeni saat seç · 7 gün × 24 saat`, en: `Pick a new time · 7 days × 24 hours` },
    bk_wk_cell_now: { tr: `Mevcut`, en: `Current` },
    bk_wk_cell_soon:       { tr: `5 saatten yakın veya geçmiş`, en: `Within 5 hours or past` },
    bk_wk_sum_label:       { tr: `Değişiklik özeti`, en: `Change summary` },
    bk_wk_new_ph:          { tr: `Takvimden seç`, en: `Pick from the calendar` },
    bk_wk_new_ph_m:        { tr: `Seç`, en: `Pick` },
    bk_wk_chk_ok:          { tr: `tamam`, en: `met` },
    bk_wk_chk_no:          { tr: `eksik`, en: `not met` },
    bk_wk_chk_lesson_m:    { tr: `Dersine {d} var (min. 5 sa)`, en: `{d} until your lesson (min. 5h)` },
    bk_wk_chk_new_m:       { tr: `Yeni saat {d} sonra (min. 5 sa)`, en: `New time in {d} (min. 5h)` },
    bk_wk_chk_new_empty_m: { tr: `Yeni saat en az 5 saat sonra`, en: `New time at least 5 hours away` },
    bk_wk_chk_week_m:      { tr: `Aynı hafta · bu dersin tek değişikliği`, en: `Same week · this lesson's only change` },
    bk_wk_ready:           { tr: `Değişiklik onaylanabilir.`, en: `Ready to confirm.` },
    bk_wk_confirm_m:       { tr: `Onayla — anında uygulanır`, en: `Confirm — applies instantly` },
    bk_wk_foot_m:          { tr: `Berkay Er'e otomatik bildirim gider, onay gerekmez.`, en: `Berkay Er is notified automatically; no approval needed.` },
    bk_wk_sheet_title:     { tr: `Yeni saat seç`, en: `Pick a new time` },
    bk_wk_done:            { tr: `Dersin {from} → {to} olarak taşındı. Berkay Er'e bildirim gönderildi — onay gerekmez.`,
                             en: `Your lesson moved from {from} to {to}. Berkay Er has been notified — no approval needed.` },
    bk_wk_done_m:          { tr: `Dersin {from} → {to} taşındı. Berkay Er'e bildirim gitti — onay gerekmez.`, en: `Lesson moved {from} → {to}. Berkay Er was notified — no approval needed.` },
    bk_wk_link: { tr: `Saati değiştir`, en: `Change time` },
    bk_wk_help:            { tr: `Bu haftaki derslerin sayfanın en üstünde — saatini oradan değiştirebilirsin.`, en: `This week's lessons are at the top of the page — you can change their time there.` },
    bk_wk_empty:           { tr: `Bu hafta planlanmış dersin yok.`, en: `You have no lessons scheduled this week.` },
    bk_wk_all:             { tr: `Tüm derslerim`, en: `All my lessons` },
    // Ders onayı (48 saat itiraz penceresi) + Zoom katılım satırı — booking.html bkCfm*
    bk_cfm_title:          { tr: `Dersin tamamlandı`, en: `Your lesson is complete` },
    bk_cfm_yes:            { tr: `Evet, ders yapıldı`, en: `Yes, the lesson took place` },
    bk_cfm_no:             { tr: `Sorun bildir`, en: `Report a problem` },
    bk_cfm_policy:         { tr: `48 saat içinde itiraz edilmeyen ders yapılmış sayılır.`, en: `Lessons not disputed within 48 hours count as held.` },
    bk_cfm_left:           { tr: `İtiraz için {d} kaldı.`, en: `{d} left to dispute.` },
    bk_cfm_zoom:           { tr: `Zoom: {from}–{to} · {min} dk`, en: `Zoom: {from}–{to} · {min} min` },
    bk_cfm_b_open:         { tr: `Onayın bekleniyor`, en: `Awaiting your confirmation` },
    bk_cfm_b_confirmed:    { tr: `Onaylandı ✓`, en: `Confirmed ✓` },
    bk_cfm_b_disputed:     { tr: `İtiraz · inceleniyor`, en: `Disputed · under review` },
    bk_cfm_b_auto:         { tr: `Otomatik onay`, en: `Auto-confirmed` },
    bk_cfm_b_resolved:     { tr: `İtiraz çözüldü`, en: `Dispute resolved` },
    bk_cfm_ok_confirm:     { tr: `Teşekkürler — ders onaylandı.`, en: `Thanks — lesson confirmed.` },
    bk_cfm_ok_dispute:     { tr: `İtirazın iletildi. Berkay Er inceleyip sana dönecek.`, en: `Your report was sent. Berkay Er will review it and get back to you.` },
    bk_cfm_dlg_title:      { tr: `Sorun bildir`, en: `Report a problem` },
    bk_cfm_dlg_body:       { tr: `{slot} dersiyle ilgili sorunu kısaca yaz. Berkay Er Zoom kaydıyla birlikte inceleyip sana dönecek.`, en: `Briefly describe the problem with the {slot} lesson. Berkay Er will review it together with the Zoom record and get back to you.` },
    bk_cfm_dlg_label:      { tr: `Ne oldu? (zorunlu)`, en: `What happened? (required)` },
    bk_cfm_dlg_send:       { tr: `İtirazı gönder`, en: `Send report` },
    bk_cfm_go:             { tr: `Onayla / sorun bildir`, en: `Confirm / report a problem` },
    bk_cfm_group_h:        { tr: `Onay bekleyen dersler`, en: `Lessons awaiting confirmation` },
    bk_cfm_group_p:        { tr: `Ders yapıldıysa onayla; bir sorun olduysa 48 saat içinde bildir.`, en: `Confirm if the lesson took place; report any problem within 48 hours.` },
    bk_rules_v2_eyebrow:   { tr: `Kurallarda güncelleme`, en: `Rules update` },
    bk_rules_v2_title:     { tr: `Ders kurallarına yeni madde eklendi`, en: `A new lesson rule was added` },
    bk_rules_v2_body:      { tr: `Derslerin yapıldığını iki taraf için de netleştirmek üzere aşağıdaki kural eklendi. Devam etmek için okuyup onayla.`, en: `To make it clear for both sides that lessons took place, the rule below was added. Read and accept it to continue.` },
    bk_rule_proof:         { tr: `Ders Onayı ve Kanıt`, en: `Lesson Confirmation & Proof` },
    bk_rule_proof_desc:    { tr: `Ders bitiminden sonra 48 saat içinde itiraz edilmeyen ders yapılmış sayılır. Zoom katılım kaydı (giriş/çıkış saatleri) ders kanıtı olarak saklanır.`, en: `A lesson not disputed within 48 hours after it ends counts as held. The Zoom attendance record (join/leave times) is kept as proof of the lesson.` },
    bks_rc_proof:          { tr: `Ders bitiminden sonra 48 saat içinde itiraz edilmeyen ders yapılmış sayılır. Zoom katılım kaydı (giriş/çıkış saatleri) ders kanıtı olarak saklanır.`, en: `A lesson not disputed within 48 hours after it ends counts as held. The Zoom attendance record (join/leave times) is kept as proof of the lesson.` },
    bk_rule_selfchange:    { tr: `Saat Değişikliği`, en: `Time Change` },
    bk_rule_selfchange_desc: { tr: `dersine 5 saatten fazla varsa onaysız ve anında; yeni saat de en az 5 saat sonra olmalı. Aynı hafta içinde, her ders için bir kez; erteleme hakkı düşmez.`,
                             en: `if your lesson is more than 5 hours away, it happens instantly without approval; the new time must also be at least 5 hours away. Within the same week, once per lesson; no reschedule credit is used.` },
    bk_avail_load_err:     { tr: 'Müsaitlik yüklenemedi:', en: 'Could not load availability:' },
    bk_welcome_title: { tr: `Ders paneline hoş geldin`, en: `Welcome to your lesson panel` },
    bk_welcome_subtitle:   { tr: 'Birkaç önemli bilgi:', en: 'A few important notes:' },
    bk_welcome_zoom_title: { tr: `Derse katılma`, en: `Joining a lesson` },
    bk_welcome_zoom_desc:  { tr: 'Ödeme onaylandıktan sonra aktifleşir. Ödeme yapılmadığı sürece <strong class="text-err">Ödeme Yapılmadı</strong> olarak görünür ve derse katılamazsınız.', en: 'Activates after payment is confirmed. Until payment is made it shows as <strong class="text-err">Payment Not Made</strong> and you cannot join.' },
    bk_welcome_pay_title: { tr: `Önce ödeme`, en: `Payment first` },
    bk_welcome_pay_desc:   { tr: `Garanti Bankası IBAN'ına havale yapın, ardından paneldeki <strong class="text-accent">₺ Ödeme Yaptım</strong> butonuna basın. Admin onaylayınca ödeme durumu <strong class="text-ok">Ödendi</strong> olur.`, en: 'Transfer to the Garanti Bank IBAN, then press <strong class="text-accent">₺ I Made a Payment</strong> in your panel. Once the admin confirms, the status changes to <strong class="text-ok">Paid</strong>.' },
    bk_welcome_resch_title: { tr: `Ertele — hak kullanır`, en: `Reschedule — uses a credit` },
    bk_welcome_resch_desc: { tr: `Ertele dersi 1 hafta ileri alır. En az 24 saat önce talep edilir; Berkay Er onaylayınca <strong>1 erteleme hakkı</strong> düşer. Paketin kaç aylıksa o kadar hakkın var.`, en: `Reschedule moves a lesson one week later. Request it at least 24 hours ahead; <strong>1 credit</strong> is used once Berkay Er approves. You get one credit per package month.` },
    bk_welcome_qa_title:   { tr: 'Soru & Cevap', en: 'Q&A' },
    bk_welcome_qa_desc: { tr: `Paneldeki <strong class="text-accent">Soru Sor</strong> kartından Berkay Er’e doğrudan yazabilirsin.`, en: `Use the <strong class="text-accent">Ask a Question</strong> card to write to Berkay Er directly.` },
    bk_welcome_lab_title:  { tr: 'Ableton Lab & Forum', en: 'Ableton Lab & Forum' },
    bk_welcome_lab_desc:   { tr: `Ders dışında da öğrenmeye devam edin — <strong class="text-accent">Ableton Lab</strong>'da interaktif synthesizer, beat maker ve mixer araçları var. <strong class="text-accent">Forum</strong>'da diğer öğrencilerle fikir paylaşın.`, en: 'Keep learning outside of lessons — <strong class="text-accent">Ableton Lab</strong> has interactive synthesizer, beat maker and mixer tools. Share ideas with other students in the <strong class="text-accent">Forum</strong>.' },
    bk_welcome_ok: { tr: `Anladım`, en: `Got it` },
    bk_qa_no_questions: { tr: `Henüz soru sormadın.`, en: `You haven’t asked any questions yet.` },
    bk_qa_my_question:     { tr: 'Sorum', en: 'My Question' },
    bk_qa_solved:          { tr: '✓ Çözüldü', en: '✓ Solved' },
    bk_qa_open:            { tr: 'Açık', en: 'Open' },
    bk_qa_solved_closed:   { tr: 'Bu soru çözüldü, yeni mesaj eklenemez.', en: 'This question is solved, no new messages can be added.' },
    bk_qa_delete:          { tr: '✕ Soruyu Sil', en: '✕ Delete Question' },
    bk_qa_no_answers:      { tr: 'Henüz yanıt yok.', en: 'No answers yet.' },
    bk_qa_me:              { tr: 'Sen', en: 'You' },
    bk_qa_sent: { tr: `✓ Sorun gönderildi!`, en: `✓ Your question was sent!` },
    bk_qa_delete_confirm:  { tr: 'Bu soruyu silmek istediğine emin misin?', en: 'Are you sure you want to delete this question?' },
    bk_qa_deleted:         { tr: 'Soru silindi.', en: 'Question deleted.' },
    bk_qa_followup_ph:     { tr: 'Takip sorusu ekle…', en: 'Add a follow-up…' },
    bk_ann_label:          { tr: 'DERS PANELİ DUYURUSU', en: 'LESSON PANEL ANNOUNCEMENT' },
    bk_zoom_in_progress:   { tr: 'Ders devam ediyor', en: 'Lesson in progress' },
    bk_zoom_today_lesson:  { tr: 'Bugün Ders Var', en: 'Lesson Today' },
    bk_zoom_join_btn:      { tr: 'Derse Katıl', en: 'Join Lesson' },
    bk_zoom_join_active:   { tr: 'Derse Katıl', en: 'Join Lesson' },
    bk_zoom_no_pay:        { tr: 'Ödeme Yapılmadı', en: 'Payment Not Made' },
    bk_zoom_pay_pending: { tr: `Ödeme onayı bekleniyor`, en: `Payment approval pending` },
    bk_zoom_pay_pend_desc: { tr: 'Ödemen alındı, admin onayını bekliyor', en: 'Payment received, awaiting admin confirmation' },
    bk_zoom_no_pay_desc:   { tr: 'Derse katılmak için ödemenin onaylanması gerekli', en: 'Payment must be confirmed to join the lesson' },
    bk_zoom_awaiting: { tr: `Onay bekleniyor`, en: `Awaiting approval` },
    bk_zoom_left:          { tr: 'kaldı', en: 'remaining' },
    bk_zoom_in_progress_s: { tr: 'Ders devam ediyor', en: 'Lesson in progress' },
    bk_note_ph: { tr: `Tercihlerin, soruların ya da eklemek istediğin her şey…`, en: `Your preferences, questions or anything else…` },
    bk_req_note_ph: { tr: `Tercihlerin, soruların ya da eklemek istediğin her şey…`, en: `Your preferences, questions or anything else…` },
    bk_samples_title:      { tr: 'Sample & Serum Presetleri', en: 'Samples & Serum Presets' },
    bk_samples_desc:       { tr: 'Derslerde kullanılan tüm sample paketleri ve Serum presetleri bu klasörde bulunmaktadır. Mac kullanıcıları için VST dosyaları da hazır şekilde eklenmiştir.', en: 'All sample packages and Serum presets used in lessons are in this folder. VST files for Mac users are also included.' },
    bk_samples_warn:       { tr: 'Ders başlamadan önce sample ve presetlerin kurulumu yapılmalıdır.', en: 'Before lessons start, samples and presets must be installed.' },
    bk_samples_btn:        { tr: 'Drive\'ı Aç →', en: 'Open Drive →' },
    bk_plugins_title:      { tr: 'Plugin Listesi', en: 'Plugin List' },
    bk_plugins_desc:       { tr: 'Derslerde kullanılan tüm VST plugin\'lerin listesine aşağıdan ulaşabilirsiniz. Hangi araçların gerekli olduğunu görmek ve kurulum planlaması yapmak için listeyi inceleyin.', en: 'You can find the full list of VST plugins used in lessons below. Review it to see which tools you need and plan your installation.' },
    bk_plugins_btn:        { tr: 'Plugin Listesini Gör →', en: 'View Plugin List →' },
    bk_qa_title:           { tr: 'Soru Sor', en: 'Ask a Question' },
    bk_qa_input_ph: { tr: `Sorunu yaz…`, en: `Write your question…` },
    bk_req_sub:            { tr: 'Tercihlerini belirt, Berkay Er inceleyip onaylayacak.', en: 'Set your preferences, Berkay Er will review and approve.' },

    // ── Ders paketleri (booking.html — rakamlar PACKAGES'tan, burada yalnız metin) ──
    bk_pkg_tab:            { tr: `Paketler`, en: `Packages` },
    bk_pkg_col_pkg:        { tr: `Paket`, en: `Package` },
    bk_pkg_col_plan:       { tr: `Açılım`, en: `Breakdown` },
    bk_pkg_col_hours:      { tr: `Toplam saat`, en: `Total hours` },
    bk_pkg_col_list:       { tr: `Liste fiyatı`, en: `List price` },
    bk_pkg_col_disc:       { tr: `İndirim`, en: `Discount` },
    bk_pkg_col_save:       { tr: `Kazancın`, en: `You save` },
    bk_pkg_col_pay:        { tr: `Ödenecek`, en: `You pay` },
    bk_pkg_best:           { tr: `En avantajlı`, en: `Best value` },
    bk_pkg_name_baslangic:   { tr: `Başlangıç`, en: `Starter` },
    bk_pkg_name_devamlilik:  { tr: `Devamlılık`, en: `Steady` },
    bk_pkg_name_gelisim:     { tr: `Gelişim`, en: `Growth` },
    bk_pkg_name_yogun:       { tr: `Yoğun`, en: `Intensive` },
    bk_pkg_name_profesyonel: { tr: `Profesyonel`, en: `Professional` },
    bk_pkg_title:          { tr: `{name} Paket`, en: `{name} Package` },
    bk_pkg_mh:             { tr: `{m} Ay · {h} saat`, en: `{m} mo · {h} hrs` },
    bk_pkg_strip_per_hour: { tr: `{name} · saat başı`, en: `{name} · per hour` },
    bk_pkg_strip_max:      { tr: `Maksimum avantaj`, en: `Maximum saving` },
    bk_pkg_strip_trial:    { tr: `Deneme dersi`, en: `Trial lesson` },
    bk_pkg_slot_hint:      { tr: `(Bu paket için haftada {n} saat seç)`, en: `(pick {n} weekly time slot{s} for this package)` },
    bk_pkg_progress:       { tr: `{sel}/{need} saat seçildi`, en: `{sel}/{need} slots selected` },
    bk_pkg_progress_over:  { tr: `— fazla seçim`, en: `— too many` },
    bk_pkg_err_slots:      { tr: `{name} paketi için haftada tam {n} saat seçmelisin (şu an {sel}).`,
                             en: `The {name} package needs exactly {n} weekly slot{s} (you picked {sel}).` },
    bk_pkg_upsell_text:    { tr: `Tek ders {single}. Paketlerde saat başı ücret {start} ile başlar, {best} paketinde {bestPrice} olur — en fazla {max} indirim.`,
                             en: `A single lesson is {single}. In a package an hour starts at {start} and drops to {bestPrice} with {best} — up to {max} off.` },
    bk_pkg_discount_badge: { tr: `{pct} indirim`, en: `{pct} off` },
    bk_pkg_pay_save:       { tr: `{pct} indirim · {save} kazancın`, en: `{pct} off · you save {save}` },
    bk_pkg_pay_extra: { tr: `{pkg} paket + {n} ek ders · {price} (paket dışı)`, en: `{pkg} package + extra lessons: {n} · {price} (not in package)` },
    bk_pkg_extra_note:     { tr: `Ek ders paketine dahil değildir: {price} toplam ücretine eklenir.`, en: `Extra lessons are not part of your package: {price} is added to your total.` },
    bk_pkg_of_hours:       { tr: `({h} saatlik paket)`, en: `({h}-hour package)` },
    bk_pkg_weekly:         { tr: `Haftada {n} ders saati`, en: `{n} lesson hour{s} a week` },
    bk_pkg_need_more:      { tr: `Bu paket için {k} saat daha seç`, en: `Pick {k} more slot{s} for this package` },
    bk_pkg_need_less:      { tr: `Bu paket için {k} saati kaldır`, en: `Remove {k} slot{s} for this package` },

    // ── Seviye belirleme sınavı ──
    bk_pt_title:           { tr: `Seviye Belirleme Sınavı`, en: `Placement Test` },
    bk_pt_required:        { tr: `Zorunlu`, en: `Required` },
    bk_pt_desc:            { tr: `Dersin sana göre kurgulanması için bu kısa sınavı çözmen gerekiyor: 20 soru, yaklaşık 8 dakika.`,
                             en: `Please take this short test so your lessons can be tailored to you: 20 questions, about 8 minutes.` },
    bk_pt_intro:           { tr: `Bilmediğin soruda tahmin etme, “Bilmiyorum” seç — amaç seni doğru seviyeden başlatmak.`,
                             en: `Don't guess — pick “Not sure” when you don't know. The goal is to start you at the right level.` },
    bk_pt_start:           { tr: `Sınava Başla`, en: `Start the test` },
    bk_pt_unknown:         { tr: `Bilmiyorum`, en: `Not sure` },
    bk_pt_progress:        { tr: `Cevaplanan`, en: `Answered` },
    bk_pt_submit:          { tr: `Sınavı Bitir`, en: `Finish test` },
    bk_pt_saving:          { tr: `Kaydediliyor…`, en: `Saving…` },
    bk_pt_save_err:        { tr: `Sınav kaydedilemedi`, en: `Could not save the test` },
    bk_pt_later:           { tr: `Daha sonra`, en: `Later` },
    bk_pt_result_title:    { tr: `Sonucun`, en: `Your result` },
    bk_pt_result_prefix:   { tr: `Seviyen:`, en: `Your level:` },
    bk_pt_result_desc:     { tr: `Sonucu eğitmenin görecek, ilk dersin buna göre planlanacak.`,
                             en: `Your instructor will see this and plan your first lesson accordingly.` },
    bk_pt_done_title:      { tr: `Seviye belirleme tamamlandı`, en: `Placement test completed` },
    bk_pt_close:           { tr: `Kapat`, en: `Close` },
    bk_optional:           { tr: '(isteğe bağlı)', en: '(optional)' },
    bk_slot_label:         { tr: 'Gün & Saat Seç', en: 'Select Day & Time' },
    bk_avail_free:         { tr: 'Müsait', en: 'Available' },
    bk_avail_busy:         { tr: 'Dolu', en: 'Taken' },
    bk_avail_closed:       { tr: 'Kapalı', en: 'Closed' },
    bk_avail_sel:          { tr: 'Seçili', en: 'Selected' },
    bk_avail_loading:      { tr: 'Müsaitlik yükleniyor…', en: 'Loading availability…' },
    bk_note_label:         { tr: 'Not', en: 'Note' },
    bk_your_request: { tr: `Talebin`, en: `Your request` },
    bk_access_intro: { tr: `Ders almak için aşağıdaki seçeneklerden birini seç.`, en: `Choose one of the options below to start lessons.` },
    bk_access_trial_title: { tr: 'Deneme Dersi', en: 'Trial Lesson' },
    bk_access_trial_desc:  { tr: 'Ücretsiz deneme dersi için tarih ve saat seç. Onay sonrası derse başlarsın.', en: 'Select a date and time for a free trial lesson. You will start after approval.' },
    bk_access_date_lbl:    { tr: 'TARİH', en: 'DATE' },
    bk_access_time_lbl:    { tr: 'SAAT SEÇ', en: 'SELECT TIME' },
    bk_access_sel_time:    { tr: 'Seçilen saat:', en: 'Selected time:' },
    bk_access_msg_lbl:     { tr: 'MESAJINIZ', en: 'YOUR MESSAGE' },
    bk_access_note_ph: { tr: `Seviyen, ne öğrenmek istiyorsun…`, en: `Your level, what you want to learn…` },
    bk_access_msg_ph:      { tr: 'Kendinizden kısaca bahsedin, ne öğrenmek istiyorsunuz…', en: 'Briefly introduce yourself, what do you want to learn…' },
    bk_access_trial_btn:   { tr: 'Deneme Dersi İste →', en: 'Request Trial Lesson →' },
    bk_err_no_date: { tr: `Lütfen bir tarih seç.`, en: `Please pick a date.` },
    bk_err_no_time: { tr: `Lütfen bir saat seç.`, en: `Please pick a time.` },
    bk_access_pending_title: { tr: 'Talep İnceleniyor', en: 'Request Under Review' },
    bk_access_pending_desc: { tr: 'Erişim talebiniz alındı. Berkay Er inceledikten sonra bu sayfa otomatik olarak güncellenecek.', en: 'Your access request has been received. This page will update automatically after Berkay Er reviews it.' },
    bk_access_cancel_btn:  { tr: 'Talebi İptal Et', en: 'Cancel Request' },
    bk_access_cancel_confirm: { tr: 'Erişim talebini iptal etmek istediğine emin misin?', en: 'Are you sure you want to cancel your access request?' },
    bk_access_rejected_title: { tr: 'Talep Reddedildi', en: 'Request Rejected' },
    bk_access_rejected_default: { tr: 'Şu an için uygun görülmedi.', en: 'Not approved at this time.' },
    bk_access_retry_btn:   { tr: 'Tekrar Talep Gönder', en: 'Send Again' },

    // ── Ders-push3 page (Push 3 Laboratuvarı) ──
    p3_menu_title:      { tr: 'Push 3 Laboratuvarı', en: 'Push 3 Lab' },
    p3_menu_lead:       { tr: "Push 3'ü satın almadan, tarayıcında gerçeğine sadık bir kopyasıyla öğren ve çal. Kulaklık önerilir.", en: 'Learn and play Push 3 before you buy one, with a faithful copy that runs in your browser. Headphones recommended.' },
    p3_card_tut_first:  { tr: 'İlk kez mi? Buradan başla.', en: 'First time? Start here.' },
    p3_card_l2_desc:    { tr: 'Tempoyu dokunarak ayarla, oktav değiştir, gamı seç, swing ver, track sustur, kayda başla.', en: 'Tap in the tempo, shift octaves, pick a scale, add swing, mute a track, start recording.' },
    p3_card_free_badge: { tr: 'Emülatör',            en: 'Emulator' },
    p3_card_free_meta:  { tr: 'Tüm kontroller açık', en: 'All controls unlocked' },
    p3_back_egitim:     { tr: 'Eğitime dön',         en: 'Back to Education' },
    p3_reset:           { tr: 'İlerlemeyi sıfırla',  en: 'Reset progress' },
    p3_disclaimer:      { tr: "Ableton, Live ve Push, Ableton AG'nin ticari markalarıdır. Bu simülatör, Berkay Er Academy tarafından hazırlanmış bağımsız bir eğitim aracıdır; Ableton AG tarafından yetkilendirilmemiş, desteklenmemiş veya onaylanmamıştır.", en: 'Ableton, Live and Push are trademarks of Ableton AG. This simulator is an independent educational tool made by Berkay Er Academy; it is not authorized, endorsed or approved by Ableton AG.' },
    p3_modes:           { tr: 'Modlar',              en: 'Modes' },
    p3_seg_tut:         { tr: 'Öğretici',            en: 'Tutorial' },
    p3_seg_l1:          { tr: 'Seviye 1',            en: 'Level 1' },
    p3_seg_l2:          { tr: 'Seviye 2',            en: 'Level 2' },
    p3_seg_free:        { tr: 'Serbest',             en: 'Free' },
    p3_kb_toggle:       { tr: 'Klavyeyle çal',       en: 'Play with keyboard' },
    p3_view_full:       { tr: 'Tam',                 en: 'Full' },
    p3_view_pads:       { tr: 'Pad',                 en: 'Pads' },
    p3_view_controls:   { tr: 'Kontrol',             en: 'Controls' },
    p3_close:           { tr: 'Kapat',               en: 'Close' },
    p3_tut_prev:        { tr: 'Geri',                en: 'Back' },
    p3_tut_skip:        { tr: 'Atla',                en: 'Skip' },
    p3_tut_toc:         { tr: 'İçindekiler',         en: 'Contents' },
    p3_tut_free:        { tr: "Serbest Çal'da aç",   en: 'Open in Free Play' },
    p3_toc_title:       { tr: 'İçindekiler',         en: 'Contents' },
    p3_reset_title:     { tr: 'İlerleme sıfırlansın mı?', en: 'Reset progress?' },
    p3_reset_body:      { tr: "Öğretici ve seviyelerdeki ilerlemen ile Serbest Çal'daki kaydın bu tarayıcıdan silinir. Bu işlem geri alınamaz.", en: 'Your tutorial and level progress, and your Free Play recording, will be deleted from this browser. This cannot be undone.' },
    p3_cancel:          { tr: 'Vazgeç',              en: 'Cancel' },
    p3_reset_confirm:   { tr: 'Sıfırla',             en: 'Reset' },

    // ── Kabuk (theme-init.js: başlık, çekmece, sekme çubuğu, footer) ──
    be_brand:         { tr: 'BERKAY ER ACADEMY', en: 'BERKAY ER ACADEMY' },
    be_home_aria:     { tr: 'Berkay Er Academy — ana sayfa', en: 'Berkay Er Academy — home' },
    be_nav_main:      { tr: 'Ana menü', en: 'Main menu' },
    be_nav_tabs:      { tr: 'Alt menü', en: 'Bottom menu' },
    be_menu:          { tr: 'Menü', en: 'Menu' },
    be_menu_open:     { tr: 'Menüyü aç', en: 'Open menu' },
    be_menu_close:    { tr: 'Menüyü kapat', en: 'Close menu' },
    be_lang:          { tr: 'Dil', en: 'Language' },
    be_cta_trial:     { tr: 'Ücretsiz deneme', en: 'Free trial' },
    be_tab_lessons:   { tr: 'Dersler', en: 'Lessons' },
    be_tab_trial:     { tr: 'Deneme', en: 'Trial' },
    be_skip:          { tr: 'İçeriğe geç', en: 'Skip to content' },
    be_lab_title:     { tr: 'Ableton Lab', en: 'Ableton Lab' },
    be_open_profile:  { tr: 'Profilini aç', en: 'Open your profile' },
    be_ft_desc:       { tr: 'Ableton Live ile elektronik müzik prodüksiyonu, DJ, Hybrid ve Live Set eğitimi.', en: 'Electronic music production, DJ, Hybrid and Live Set training with Ableton Live.' },
    be_ft_academy:    { tr: 'Akademi', en: 'Academy' },
    be_ft_community:  { tr: 'Topluluk', en: 'Community' },
    be_ft_follow:     { tr: 'Takip et', en: 'Follow' },
    be_ft_copy:       { tr: '© Berkay Er Academy', en: '© Berkay Er Academy' },
    be_ft_copy_full:  { tr: '© Berkay Er Academy · berkayeracademy.com', en: '© Berkay Er Academy · berkayeracademy.com' },
    be_ft_trademark:  { tr: "ABLETON, LIVE VE PUSH, ABLETON AG'NİN TİCARİ MARKALARIDIR", en: 'ABLETON, LIVE AND PUSH ARE TRADEMARKS OF ABLETON AG' },
    be_ft_social:     { tr: 'Sosyal medya', en: 'Social media' },
    be_wa_fab:        { tr: 'WhatsApp ile iletişime geç', en: 'Contact us on WhatsApp' },

    // ── Ana sayfa (index.html) — yeni tasarım ──
    idx2_hero_eyebrow:       { tr: 'ONLINE · BİREBİR · ABLETON LIVE 12', en: 'ONLINE · ONE-ON-ONE · ABLETON LIVE 12' },
    idx2_hero_title:         { tr: 'Kafandaki <br>müziği <em class="be-ember-text">sahneye</em> <br>taşı.', en: 'Take your <br>sound to <br>the <em class="be-ember-text">stage</em>.' },
    idx2_hero_h1:            { tr: 'Sıfırdan ileri seviyeye profesyonel Ableton kursu & müzik prodüksiyonu eğitimi.', en: 'Professional Ableton course & music production training, from zero to advanced.' },
    idx2_hero_desc:          { tr: "Peaktime Techno'nun ham enerjisinden Melodic Techno'nun duygusal katmanlarına — bu eğitim senin sesin için tasarlandı. Öğrendiğin şey sadece bir yazılım değil; kafandaki müziği sahneye taşıyan bir dil.", en: "From the raw energy of Peaktime Techno to the emotional layers of Melodic Techno — this training is designed for your sound. What you learn isn't just software; it's a language that takes the music in your head to the stage." },
    idx2_hero_cta:           { tr: 'Ücretsiz deneme dersi', en: 'Free trial lesson' },
    idx2_hero_video_aria:    { tr: 'Berkay Er, Pioneer DJ ekipmanı başında canlı performans (video)', en: 'Berkay Er performing live on Pioneer DJ gear (video)' },
    idx2_video_pause:        { tr: 'Videoyu duraklat', en: 'Pause video' },
    idx2_video_play:         { tr: 'Videoyu oynat', en: 'Play video' },
    idx2_hero_tag:           { tr: 'LIVE SET · MELODIC TECHNO', en: 'LIVE SET · MELODIC TECHNO' },
    idx2_float_gb:           { tr: 'preset paketi hediye', en: 'preset pack, free' },
    idx2_float_students:     { tr: "öğrenci<br>2019'dan beri", en: 'students<br>since 2019' },
    idx2_fact_perform:       { tr: 'Performans', en: 'Performance' },
    idx2_fact_perform_val:   { tr: 'Live Set · Hybrid DJ', en: 'Live Set · Hybrid DJ' },
    idx2_fact_industry_sub:  { tr: '· profesyonel giriş', en: '· professional debut' },
    idx2_fact_industry_m:    { tr: "2019'dan beri", en: 'Since 2019' },
    idx2_fact_edu:           { tr: 'Eğitim', en: 'Training' },
    idx2_fact_edu_val:       { tr: 'Online · Birebir', en: 'Online · One-on-one' },
    idx2_genres_aria:        { tr: 'Türler', en: 'Genres' },
    idx2_why_title:          { tr: 'Neden <em>Berkay Er</em> Academy?', en: 'Why <em>Berkay Er</em> Academy?' },
    idx2_why_desc:           { tr: 'Kafanda ritimler var ama ekranda nereye basacağını bilmiyorsan — ya da yıllardır üretip sesleri istediğin yere getiremiyorsan — eksik olan doğru rehberlik.', en: "If you hear rhythms in your head but don't know where to click — or you've been producing for years and still can't get your sound where you want it — what's missing is the right guidance." },
    idx2_card1_key:          { tr: '01 · DENEME', en: '01 · TRIAL' },
    idx2_card1_title:        { tr: '1 saat ücretsiz deneme dersi', en: '1-hour free trial lesson' },
    idx2_card2_key:          { tr: '02 · KÜTÜPHANE', en: '02 · LIBRARY' },
    idx2_card2_title:        { tr: '500 GB preset paketi hediye', en: '500 GB preset pack, free' },
    idx2_card2_desc:         { tr: 'Kayıt olan her öğrenciye türe özel kurulmuş devasa preset, sample ve ses paketi ücretsiz teslim edilir.', en: 'Every enrolled student gets a huge genre-specific pack of presets, samples and sounds, free of charge.' },
    idx2_card3_key:          { tr: '03 · DENEYİM', en: '03 · EXPERIENCE' },
    idx2_card3_title:        { tr: '100+ öğrenci deneyimi', en: '100+ students taught' },
    idx2_card3_desc:         { tr: "2019'dan bu yana 100'den fazla öğrenciye birebir eğitim. Her öğrencinin farklı olduğu kabul edilerek ilerlendi.", en: 'One-on-one training for more than 100 students since 2019 — always starting from the fact that every student is different.' },
    idx2_card4_key:          { tr: '04 · MÜFREDAT', en: '04 · CURRICULUM' },
    idx2_card4_title:        { tr: 'Tamamen kişiye özel müfredat', en: 'A fully personal curriculum' },
    idx2_card4_desc:         { tr: 'Hazır ders planı yok. Seviyene, hedefine ve tarzına göre şekillenen 8 modüllük dinamik bir yol.', en: 'No ready-made lesson plan. A dynamic 8-module path shaped by your level, your goals and your style.' },
    idx2_edu_title:          { tr: 'Ableton Live ile elektronik müzik prodüksiyonu', en: 'Electronic music production with Ableton Live' },
    idx2_edu_desc:           { tr: "Synthesizer'dan Live Set'e kadar her şey — 2019'dan beri süren birikimle, 8 modüllük kişiye özel müfredat.", en: 'Everything from synthesizers to Live Sets — an 8-module personal curriculum built on experience since 2019.' },
    idx2_edu_chip1:          { tr: '1 saat ücretsiz deneme', en: '1-hour free trial' },
    idx2_edu_chip2:          { tr: '500 GB preset paketi', en: '500 GB preset pack' },
    idx2_edu_chip3:          { tr: '8 modül · tüm seviyeler', en: '8 modules · all levels' },
    idx2_edu_btn:            { tr: 'Eğitim sayfasına git', en: 'Go to the training page' },
    idx2_curr_label:         { tr: 'MODÜL', en: 'MODULE' },
    idx2_curr_aria:          { tr: '8 modüllük müfredat', en: '8-module curriculum' },
    idx2_mod1:               { tr: 'Ableton Live temelleri', en: 'Ableton Live basics' },
    idx2_mod2:               { tr: 'Ritim & beat üretimi', en: 'Rhythm & beat production' },
    idx2_mod3:               { tr: 'Parça kurgulama', en: 'Track arrangement' },
    idx2_mod4:               { tr: 'Loop & sample tasarımı', en: 'Loop & sample design' },
    idx2_mod5:               { tr: 'Ses tasarımı & synthesis', en: 'Sound design & synthesis' },
    idx2_mod6:               { tr: 'Mixing & mastering', en: 'Mixing & mastering' },
    idx2_mod7:               { tr: 'Özgün tarz geliştirme', en: 'Developing your own style' },
    idx2_mod8:               { tr: 'Live Set kurgulama', en: 'Building a Live Set' },
    idx2_inst_label:         { tr: 'EĞİTMEN · PRODUCER · MIX MASTERING', en: 'INSTRUCTOR · PRODUCER · MIX MASTERING' },
    idx2_inst_bio:           { tr: "Ableton Live uzmanı; Peaktime ve Melodic Techno prodüktörü. 2010'dan beri elektronik müzik, 2019'dan beri birebir eğitim.", en: 'Ableton Live expert; Peaktime and Melodic Techno producer. Electronic music since 2010, one-on-one teaching since 2019.' },
    idx2_inst_video_aria:    { tr: 'Berkay Er stüdyoda (video)', en: 'Berkay Er in the studio (video)' },
    idx2_reviews_title:      { tr: 'Öğrenci yorumları', en: 'Student reviews' },
    idx2_reviews_count:      { tr: '100+ ÖĞRENCİ', en: '100+ STUDENTS' },
    idx2_rev1:               { tr: 'Berkay hoca hem teknik hem de müzikal açıdan çok iyi aktarıyor. İlk dersimden sonra zaten fark yarattığını hissettim.', en: "Berkay's teaching is excellent both technically and musically. I could already feel the difference after my first lesson." },
    idx2_rev2:               { tr: "Melodic techno üzerine bu kadar derinlikli anlatan başka biri görmedim. Ableton workflow'um tamamen değişti.", en: "I've never seen anyone explain melodic techno in such depth. My Ableton workflow has completely changed." },
    idx2_rev3:               { tr: 'Ücretsiz deneme dersinden sonra zaten devam etmek istedim. Çok samimi ve yönlendirici bir eğitim.', en: 'After the free trial lesson I already wanted to continue. A very genuine and guiding education.' },
    idx2_comment_prompt:     { tr: 'Yorum bırakmak için', en: 'To leave a review,' },
    idx2_comment_signin:     { tr: 'giriş yap', en: 'sign in' },
    idx2_comment_name_lbl:   { tr: 'İsmin', en: 'Your name' },
    idx2_comment_text_lbl:   { tr: 'Yorumun', en: 'Your review' },
    idx2_comment_sending:    { tr: 'Gönderiliyor…', en: 'Sending…' },
    idx2_comment_ok:         { tr: 'Yorumun eklendi, teşekkürler.', en: 'Your review was added — thank you.' },
    idx2_forum_title:        { tr: 'Sor, yanıtla, paylaş.', en: 'Ask, answer, share.' },
    idx2_forum_cat_general:  { tr: 'Genel', en: 'General' },
    idx2_forum_cat_sound:    { tr: 'Ses Tasarımı', en: 'Sound Design' },
    idx2_forum_btn:          { tr: 'Foruma git', en: 'Go to the forum' },
    idx2_forum_error_pre:    { tr: 'Soruları görmek için', en: 'To see the questions,' },
    idx2_forum_error_link:   { tr: 'foruma git', en: 'go to the forum' },
    idx2_cta_title:          { tr: 'Kafandaki müziği artık <br><em class="be-ember-text">sahneye taşımanın</em> zamanı', en: 'Time to take the music <br>in your head <em class="be-ember-text">to the stage</em>' },
    idx2_cta_title_m:        { tr: 'Sahneye taşımanın <em class="be-ember-text">zamanı</em>', en: 'Time to take it <em class="be-ember-text">to the stage</em>' },
    idx2_cta_btn:            { tr: 'Ücretsiz deneme dersini ayırt', en: 'Book your free trial lesson' },
    idx2_back_top:           { tr: 'Yukarı çık', en: 'Back to top' },
    idx2_modal_close:        { tr: 'Kapat', en: 'Close' },

    // ── Eğitim (egitim.html) — yeni tasarım ──
    egt_hero_eyebrow:    { tr: 'EĞİTİM PROGRAMLARI', en: 'TRAINING PROGRAMS' },
    egt_hero_h1:         { tr: 'İki yol,<br class="eg-br"> tek hedef: <em class="be-ember-text">kendi sesin.</em>', en: 'Two paths,<br class="eg-br"> one goal: <em class="be-ember-text">your own sound.</em>' },
    egt_hero_lead:       { tr: 'Online birebir Ableton prodüksiyonu ya da Kuşadası stüdyosunda gerçek kulüp ekipmanıyla DJ eğitimi. İkisi de 1 saatlik ücretsiz deneme dersiyle başlar.', en: 'One-to-one online Ableton production, or DJ training on real club gear in the Kuşadası studio. Both start with a free 1-hour trial lesson.' },
    egt_path_a_kicker:   { tr: 'A · ONLINE · BİREBİR', en: 'A · ONLINE · ONE-TO-ONE' },
    egt_path_a_h:        { tr: 'Prodüksiyon eğitimi', en: 'Production training' },
    egt_path_a_p:        { tr: 'Ableton Live ile elektronik müzik üretimi. 8 modül, tüm seviyeler, kişiye özel müfredat.', en: 'Electronic music production with Ableton Live. 8 modules, all levels, a personalized curriculum.' },
    egt_path_go:         { tr: 'Programı incele', en: 'See the program' },
    egt_path_b_kicker:   { tr: 'B · YÜZ YÜZE · KUŞADASI & AYDIN', en: 'B · IN PERSON · KUŞADASI & AYDIN' },
    egt_path_b_h:        { tr: 'Profesyonel DJ eğitimi', en: 'Professional DJ training' },
    egt_path_b_p:        { tr: 'Pioneer Alpha-Theta XDJ-XZ üzerinde uygulamalı. 4 ders × 1 saat, dört paket, Hybrid ve Live Set ileri modülleri.', en: 'Hands-on with the Pioneer Alpha-Theta XDJ-XZ. 4 lessons × 1 hour, four packages, advanced Hybrid and Live Set modules.' },
    egt_tab_prod:        { tr: 'Prodüksiyon', en: 'Production' },
    egt_tab_dj:          { tr: 'DJ eğitimi', en: 'DJ training' },
    egt_prod_kicker:     { tr: 'PRODÜKSİYON EĞİTİMİ', en: 'PRODUCTION TRAINING' },
    egt_prod_h2:         { tr: 'Ableton Live <em>eğitimi</em>', en: 'Ableton Live <em>training</em>' },
    egt_prod_lead:       { tr: "Berkay Er ile Ableton özel ders al: 2019'dan beri süregelen müzikal birikim ve prodüksiyon deneyimiyle elektronik müzik üretimini sıfırdan profesyonel düzeye taşı. Her ders seviyene, hedeflerine ve tarzına göre planlanır.", en: 'Take private Ableton lessons with Berkay Er: take your electronic music production from zero to a professional level, backed by musical knowledge and production experience built since 2019. Every lesson is planned around your level, goals and style.' },
    egt_chip1:           { tr: '1 saat ücretsiz deneme', en: '1-hour free trial' },
    egt_chip2:           { tr: '500 GB preset paketi', en: '500 GB preset pack' },
    egt_chip3:           { tr: '8 modül · tüm seviyeler', en: '8 modules · all levels' },
    egt_gift_kicker:     { tr: 'EĞİTİME ÖZEL HEDİYE', en: 'STUDENT-ONLY GIFT' },
    egt_gift_p:          { tr: "Preset paketi ve özenle seçilmiş Serum preset'leri her öğrenciye ücretsiz.", en: 'A preset pack and hand-picked Serum presets, free for every student.' },
    egt_free_btn:        { tr: 'Ücretsiz derse başla', en: 'Start the free lesson' },
    egt_curr_h:          { tr: 'Ders içeriği', en: 'Curriculum' },
    egt_curr_meta:       { tr: '8 MODÜL · TÜM SEVİYELER', en: '8 MODULES · ALL LEVELS' },
    egt_mod1_title:      { tr: 'Ableton Live temelleri', en: 'Ableton Live basics' },
    egt_mod1_t2:         { tr: 'Session vs Arrangement View', en: 'Session vs Arrangement View' },
    egt_mod1_t3:         { tr: 'MIDI & Audio routing', en: 'MIDI & Audio routing' },
    egt_mod_watch:       { tr: 'Şimdi izle', en: 'Watch now' },
    egt_mod2_title:      { tr: 'Ritim & beat üretimi', en: 'Rhythm & beat production' },
    egt_mod3_title:      { tr: 'Parça kurgulama ve yapımı', en: 'Track arrangement & production' },
    egt_mod3_t2:         { tr: 'Tension, build & release', en: 'Tension, build & release' },
    egt_mod3_t4:         { tr: 'Atmosfer katmanlama', en: 'Atmosphere layering' },
    egt_mod4_title:      { tr: 'Loop & sample tasarımı', en: 'Loop & sample design' },
    egt_mod4_t2:         { tr: 'Creative resampling', en: 'Creative resampling' },
    egt_mod5_title:      { tr: 'Ses tasarımı & synthesis', en: 'Sound design & synthesis' },
    egt_mod5_t1:         { tr: 'Oscillator, ADSR, Filter', en: 'Oscillator, ADSR, Filter' },
    egt_mod5_t2:         { tr: 'Wavetable & Operator', en: 'Wavetable & Operator' },
    egt_mod5_t3:         { tr: 'Serum / VST synthesizer', en: 'Serum / VST synthesizers' },
    egt_mod5_t4:         { tr: 'Atmospheric pad & texture', en: 'Atmospheric pads & textures' },
    egt_mod6_title:      { tr: 'Mixing & mastering', en: 'Mixing & mastering' },
    egt_mod6_t2:         { tr: 'Reverb / Delay space', en: 'Reverb / Delay space' },
    egt_mod6_t4:         { tr: 'Master chain & loudness', en: 'Master chain & loudness' },
    egt_mod7_title:      { tr: 'Özgün tarz geliştirme', en: 'Developing your own style' },
    egt_mod7_t4:         { tr: 'Geri bildirim & kritik', en: 'Feedback & critique' },
    egt_mod8_title:      { tr: 'Live Set kurgulama', en: 'Building a Live Set' },
    egt_mod8_t1:         { tr: 'Clip & scene düzeni', en: 'Clip & scene layout' },
    egt_mod8_t2:         { tr: 'Controller mapping & MIDI', en: 'Controller mapping & MIDI' },
    egt_banner_title:    { tr: 'Ders rezervasyonu', en: 'Book a lesson' },
    egt_banner_btn:      { tr: 'Rezervasyon yap', en: 'Book now' },
    egt_lab_title:       { tr: 'Ableton Lab', en: 'Ableton Lab' },
    egt_lab_desc:        { tr: 'Synthesizer, Beat Maker, Mixer ve Arrangement Builder ile dersleri interaktif pekiştir.', en: 'Reinforce your lessons interactively with the Synthesizer, Beat Maker, Mixer and Arrangement Builder.' },
    egt_lab_btn:         { tr: "Lab'ı aç", en: 'Open the Lab' },
    egt_push3_desc:      { tr: 'Adım adım öğretici, tarayıcıda çalan Push 3 ve Kontrolü Bul oyunu — tamamen ücretsiz.', en: 'A step-by-step tutorial, a Push 3 that plays in your browser and the Find the Control game — completely free.' },
    egt_push3_btn:       { tr: 'Laboratuvarı aç', en: 'Open the Lab' },
    egt_mag_label:       { tr: 'PRODÜKSİYON DERGİSİ · 35 SAYFA', en: 'PRODUCTION MAGAZINE · 35 PAGES' },
    egt_mag_title:       { tr: 'Elektronik müzik prodüksiyonu: başlangıç rehberi', en: "Electronic music production: a beginner's guide" },
    egt_mag_desc:        { tr: "Temeller, Ableton workflow'u, ses tasarımı ve melodic techno teknikleri.", en: 'Fundamentals, Ableton workflow, sound design and melodic techno techniques.' },
    egt_mag_dl:          { tr: 'İndir (PDF)', en: 'Download (PDF)' },
    egt_dj_kicker:       { tr: 'PROFESYONEL DJ EĞİTİMİ · KUŞADASI & AYDIN', en: 'PROFESSIONAL DJ TRAINING · KUŞADASI & AYDIN' },
    egt_dj_h2:           { tr: "DJ'liğin temellerini <em>sıfırdan</em> öğren.", en: 'Learn DJing <em>from scratch</em>.' },
    egt_dj_lead:         { tr: "Pioneer Alpha-Theta XDJ-XZ üzerinde uygulamalı: beatmatching, harmonik mixing, hot cue / loop / FX, set kurgusu, crowd reading. Kuşadası'ndaki stüdyoda yüz yüze; Söke, Didim, Selçuk ve İzmir'den gelen öğrencilere yoğun program.", en: 'Hands-on with the Pioneer Alpha-Theta XDJ-XZ: beatmatching, harmonic mixing, hot cues / loops / FX, set building and crowd reading. In person at the Kuşadası studio, with an intensive schedule for students coming from Söke, Didim, Selçuk and İzmir.' },
    egt_dj_chip1:        { tr: '4 ders × 1 saat', en: '4 lessons × 1 hour' },
    egt_dj_chip2:        { tr: '4 paket seçeneği', en: '4 package options' },
    egt_dj_chip3:        { tr: 'Hybrid Set + Live Set (ileri)', en: 'Hybrid Set + Live Set (advanced)' },
    egt_lessons_h:       { tr: 'DJ eğitimi — 4 dersin içeriği', en: 'DJ training — what the 4 lessons cover' },
    egt_dj1_title:       { tr: 'Ekipman & temel kavramlar', en: 'Gear & core concepts' },
    egt_lvl_beg:         { tr: 'Başlangıç', en: 'Beginner' },
    egt_dj1_t1:          { tr: 'XDJ-XZ anatomi: kanal, EQ, fader, FX', en: 'XDJ-XZ anatomy: channels, EQ, faders, FX' },
    egt_dj1_t2:          { tr: 'BPM, beat, bar, phrasing', en: 'BPM, beats, bars, phrasing' },
    egt_dj1_t3:          { tr: 'Gain staging & cue routing', en: 'Gain staging & cue routing' },
    egt_dj1_t4:          { tr: 'Track import (USB / Rekordbox)', en: 'Track import (USB / Rekordbox)' },
    egt_dj2_title:       { tr: 'Beatmatching & temel geçişler', en: 'Beatmatching & basic transitions' },
    egt_lvl_beg_mid:     { tr: 'Başlangıç — Orta', en: 'Beginner — Intermediate' },
    egt_dj2_t1:          { tr: 'Manuel beatmatch (kulakla)', en: 'Manual beatmatching (by ear)' },
    egt_dj2_t2:          { tr: '8 / 16 / 32-bar phrase yapısı', en: '8 / 16 / 32-bar phrase structure' },
    egt_dj2_t3:          { tr: 'EQ swap geçişi', en: 'EQ swap transitions' },
    egt_dj2_t4:          { tr: 'Crossfader vs. line fader', en: 'Crossfader vs. line faders' },
    egt_dj3_title:       { tr: 'Harmonik mixing + hot cue / loop / FX', en: 'Harmonic mixing + hot cues / loops / FX' },
    egt_lvl_mid:         { tr: 'Orta', en: 'Intermediate' },
    egt_dj3_t1:          { tr: 'Camelot wheel ile uyumlu tonlar', en: 'Compatible keys with the Camelot wheel' },
    egt_dj3_t2:          { tr: 'Hot cue + loop in/out', en: 'Hot cues + loop in/out' },
    egt_dj3_t3:          { tr: 'FX dozajı: filter, echo, roll', en: 'Dosing FX: filter, echo, roll' },
    egt_dj3_t4:          { tr: 'Cut, double drop, mash-up', en: 'Cuts, double drops, mash-ups' },
    egt_dj4_title:       { tr: 'Set yapısı + crowd reading + kayıt', en: 'Set structure + crowd reading + recording' },
    egt_lvl_mid_adv:     { tr: 'Orta — İleri', en: 'Intermediate — Advanced' },
    egt_dj4_t1:          { tr: 'Warmup → peak → cool-down', en: 'Warm-up → peak → cool-down' },
    egt_dj4_t2:          { tr: 'Anlatı + track sıralama', en: 'Storytelling + track order' },
    egt_dj4_t3:          { tr: 'Pisti okuma — when to drop', en: 'Reading the floor — when to drop' },
    egt_dj4_t4:          { tr: 'USB kayıt + Rekordbox analiz', en: 'USB recording + Rekordbox analysis' },
    egt_packs_h:         { tr: 'Paketler', en: 'Packages' },
    egt_packs_p:         { tr: 'Her paket 4 dersin üzerine ekstra teslimler ekler. Portfolio için Stüdyo veya Premium, sahnede canlı performans için Hybrid Set.', en: 'Each package adds extra deliverables on top of the 4 lessons. Studio or Premium for your portfolio, Hybrid Set for live performance on stage.' },
    egt_packs_swipe:     { tr: 'KAYDIR →', en: 'SWIPE →' },
    egt_pack1_h:         { tr: 'Standart', en: 'Standard' },
    egt_pack1_sub:       { tr: '4 ders × 1 saat', en: '4 lessons × 1 hour' },
    egt_pack1_t1:        { tr: '4 derslik müfredat', en: '4-lesson curriculum' },
    egt_pack1_t2:        { tr: 'XDJ-XZ + monitör üzerinde uygulama', en: 'Practice on the XDJ-XZ + monitors' },
    egt_pack1_t3:        { tr: 'Son ders setinin USB kaydı sana ait', en: 'You keep the USB recording of your final set' },
    egt_pack1_t4:        { tr: 'Tüm seviyeler — sıfırdan başlanabilir', en: 'All levels — start from scratch' },
    egt_pack2_h:         { tr: 'Stüdyo', en: 'Studio' },
    egt_pack2_sub:       { tr: 'Standart + stüdyo çekim', en: 'Standard + studio shoot' },
    egt_pack2_t1:        { tr: 'Standart pakete dahil her şey', en: 'Everything in Standard' },
    egt_pack2_t2:        { tr: '1 saat profesyonel stüdyo set çekimi', en: '1-hour professional studio set shoot' },
    egt_pack2_t3:        { tr: 'Kameraya canlı DJ seti', en: 'A live DJ set on camera' },
    egt_pack2_t4:        { tr: 'Sosyal medya için MP4 + WAV', en: 'MP4 + WAV for social media' },
    egt_pack3_tag:       { tr: 'EN KAPSAMLI', en: 'MOST COMPLETE' },
    egt_pack3_h:         { tr: 'Premium', en: 'Premium' },
    egt_pack3_sub:       { tr: 'Stüdyo + drone / dış mekan', en: 'Studio + drone / outdoor' },
    egt_pack3_t1:        { tr: 'Stüdyo pakete dahil her şey', en: 'Everything in Studio' },
    egt_pack3_t2:        { tr: '1 saat drone & kamera dış mekan çekimi', en: '1-hour drone & camera outdoor shoot' },
    egt_pack3_t3:        { tr: 'Rooftop / terrace / doğa', en: 'Rooftop / terrace / nature' },
    egt_pack3_t4:        { tr: '4K multi-cam, 2-3 dk premium video', en: '4K multi-cam, a 2-3 min premium video' },
    egt_pack4_h:         { tr: 'Hybrid Set', en: 'Hybrid Set' },
    egt_pack4_sub:       { tr: 'Standart + Ableton entegrasyonu', en: 'Standard + Ableton integration' },
    egt_pack4_t1:        { tr: 'Standart pakete dahil her şey', en: 'Everything in Standard' },
    egt_pack4_t2:        { tr: 'Ableton Live + Push 2/3 entegrasyonu', en: 'Ableton Live + Push 2/3 integration' },
    egt_pack4_t3:        { tr: 'XDJ ↔ Ableton MIDI clock sync', en: 'XDJ ↔ Ableton MIDI clock sync' },
    egt_pack4_t4:        { tr: 'Sahnede DJ + canlı kontrol birlikte', en: 'DJing + live control together on stage' },
    egt_gear_kicker:     { tr: 'STÜDYO DONANIMI', en: 'STUDIO GEAR' },
    egt_gear_h:          { tr: 'İlk dersten itibaren elinde gerçek kulüp ekipmanı.', en: 'Real club gear in your hands from the very first lesson.' },
    egt_gear_l1:         { tr: 'DJ SETUP', en: 'DJ SETUP' },
    egt_gear_l2:         { tr: 'DAW CONTROLLER', en: 'DAW CONTROLLER' },
    egt_gear_l3:         { tr: 'SYNTH / DRUM', en: 'SYNTH / DRUM' },
    egt_gear_l4:         { tr: 'MONITOR & INTERFACE', en: 'MONITOR & INTERFACE' },
    egt_gear_l5:         { tr: 'MİKROFON / KULAKLIK / KAYIT', en: 'MIC / HEADPHONES / RECORDING' },
    egt_hy_kicker:       { tr: 'DJ + ABLETON BİRLİKTE', en: 'DJ + ABLETON TOGETHER' },
    egt_hy_h:            { tr: 'Hybrid Set eğitimi', en: 'Hybrid Set training' },
    egt_hy_p:            { tr: "XDJ-XZ + Ableton Live + Push birlikte: DJ akışını korurken kendi loop'larını, drum overdub'larını, sample ve FX katmanlarını sahnede ekle.", en: 'XDJ-XZ + Ableton Live + Push together: keep your DJ flow while adding your own loops, drum overdubs, samples and FX layers on stage.' },
    egt_hy1:             { tr: 'Sync & sinyal akışı', en: 'Sync & signal flow' },
    egt_lvl_setup:       { tr: 'Temel kurulum', en: 'Basic setup' },
    egt_hy1_t1:          { tr: 'XDJ-XZ → Ableton MIDI clock routing', en: 'XDJ-XZ → Ableton MIDI clock routing' },
    egt_hy1_t2:          { tr: 'AudioFuse Studio üzerinden mixer entegrasyonu', en: 'Mixer integration via AudioFuse Studio' },
    egt_hy1_t3:          { tr: 'Master tempo + Ableton Link senkronu', en: 'Master tempo + Ableton Link sync' },
    egt_hy1_t4:          { tr: 'Backup plan: standalone fallback', en: 'Backup plan: standalone fallback' },
    egt_hy2:             { tr: 'Track hazırlığı (hybrid prep)', en: 'Track preparation (hybrid prep)' },
    egt_lvl_studio:      { tr: 'Studio workflow', en: 'Studio workflow' },
    egt_hy2_t1:          { tr: "Ableton'da stem / acapella / instrumental ayrımı", en: 'Splitting stems / acapellas / instrumentals in Ableton' },
    egt_hy2_t2:          { tr: 'Beat-locked clip + warp marker disiplini', en: 'Beat-locked clips + warp marker discipline' },
    egt_hy2_t3:          { tr: "Drum overdub layer'ları (DrumBrute / Push)", en: 'Drum overdub layers (DrumBrute / Push)' },
    egt_hy2_t4:          { tr: "Vocal / FX shot'larını sample slot'a alma", en: 'Loading vocal / FX shots into sample slots' },
    egt_hy3:             { tr: 'Canlı tetikleme & FX ride', en: 'Live triggering & FX rides' },
    egt_lvl_perf:        { tr: 'Performans', en: 'Performance' },
    egt_hy3_t1:          { tr: 'Push üzerinden scene / clip launch', en: 'Scene / clip launching from Push' },
    egt_hy3_t2:          { tr: 'Macro mapping: filter, delay, reverb sweep', en: 'Macro mapping: filter, delay, reverb sweeps' },
    egt_hy3_t3:          { tr: "Drum machine ile DJ kick'ini layer'lama", en: 'Layering the DJ kick with a drum machine' },
    egt_hy3_t4:          { tr: 'Crowd anına göre canlı seçim (improvise)', en: 'Live choices based on the crowd (improvising)' },
    egt_hy4:             { tr: 'Hybrid set provası + kayıt', en: 'Hybrid set rehearsal + recording' },
    egt_lvl_final:       { tr: 'Final', en: 'Final' },
    egt_hy4_t1:          { tr: '30-45 dk hybrid set kurgu (intro → peak → outro)', en: 'Building a 30-45 min hybrid set (intro → peak → outro)' },
    egt_hy4_t2:          { tr: 'USB + Ableton senaryosu birlikte rehearsal', en: 'Rehearsing the USB + Ableton plan together' },
    egt_hy4_t3:          { tr: 'Monitor / kayıt setup, latency kontrolü', en: 'Monitor / recording setup, latency checks' },
    egt_hy4_t4:          { tr: 'Kayıt sonrası dinleme + geri bildirim', en: 'Listening back + feedback after recording' },
    egt_lv_kicker:       { tr: 'İLERİ — DJ EĞİTİMİ SONRASI', en: 'ADVANCED — AFTER DJ TRAINING' },
    egt_lv_h:            { tr: 'Live Set eğitimi', en: 'Live Set training' },
    egt_lv_p:            { tr: "Ableton Live + Push 2/3 + Maschine MK3 + DrumBrute ile gerçek bir canlı performans seti — track mixleyen DJ'den sahnede üreten performer'a.", en: 'A real live performance set with Ableton Live + Push 2/3 + Maschine MK3 + DrumBrute — from a DJ who mixes tracks to a performer who creates on stage.' },
    egt_lv1:             { tr: 'Session View performans mantığı', en: 'Session View performance logic' },
    egt_lvl_adv_start:   { tr: 'İleri başlangıç', en: 'Advanced beginner' },
    egt_lv1_t1:          { tr: 'Clip, scene, follow action', en: 'Clips, scenes, follow actions' },
    egt_lv1_t2:          { tr: 'Tempo + global launch + metronome', en: 'Tempo + global launch + metronome' },
    egt_lv1_t3:          { tr: 'Track group routing & submix', en: 'Track group routing & submixes' },
    egt_lv1_t4:          { tr: 'Backup plan: freeze + bounce-in-place', en: 'Backup plan: freeze + bounce-in-place' },
    egt_lv2:             { tr: 'Push 2 & 3 performans mapping', en: 'Push 2 & 3 performance mapping' },
    egt_lvl_adv:         { tr: 'İleri', en: 'Advanced' },
    egt_lv2_t1:          { tr: 'Drum rack tetikleme + step sequencing', en: 'Drum rack triggering + step sequencing' },
    egt_lv2_t2:          { tr: 'Macro mapping: filter, send, FX sweep', en: 'Macro mapping: filter, send, FX sweeps' },
    egt_lv2_t3:          { tr: 'Push 3 standalone vs. Live entegre mod', en: 'Push 3 standalone vs. Live-integrated mode' },
    egt_lv2_t4:          { tr: 'Scene navigation + tempo nudging', en: 'Scene navigation + tempo nudging' },
    egt_lv3:             { tr: 'Hardware entegrasyonu', en: 'Hardware integration' },
    egt_lv3_t1:          { tr: 'Maschine MK3 ↔ Ableton MIDI clock sync', en: 'Maschine MK3 ↔ Ableton MIDI clock sync' },
    egt_lv3_t2:          { tr: 'DrumBrute analog kick + Live hi-hat layering', en: 'DrumBrute analog kick + Live hi-hat layering' },
    egt_lv3_t3:          { tr: 'External instrument routing + return tracks', en: 'External instrument routing + return tracks' },
    egt_lv3_t4:          { tr: 'Latency management & monitoring', en: 'Latency management & monitoring' },
    egt_lv4:             { tr: 'Live set kurgu + sahne provası', en: 'Live set building + stage rehearsal' },
    egt_lv4_t1:          { tr: '30-45 dk set kurgu: intro / build / peak / outro', en: 'Building a 30-45 min set: intro / build / peak / outro' },
    egt_lv4_t2:          { tr: "Backup plan: USB freeze track'ler ve audio fallback", en: 'Backup plan: USB freeze tracks and audio fallback' },
    egt_lv4_t3:          { tr: 'Sahne provası — ışık, monitor, sound check', en: 'Stage rehearsal — lights, monitors, sound check' },
    egt_lv4_t4:          { tr: 'Kayıt + post-prod review & geri bildirim', en: 'Recording + post-production review & feedback' },
    egt_cta_h:           { tr: 'Paketini seç, <em class="be-ember-text">deneme dersinden</em> başla.', en: 'Pick your package, <em class="be-ember-text">start with a trial</em> lesson.' },
    egt_cta_p:           { tr: 'XDJ-XZ stüdyoda seni bekliyor. Sorular için <a href="#faqSection">SSS</a>.', en: 'The XDJ-XZ is waiting for you in the studio. Questions? See the <a href="#faqSection">FAQ</a>.' },
    egt_cta_btn:         { tr: 'Rezervasyon yap', en: 'Book now' },
    egt_faq_kicker:      { tr: 'SSS', en: 'FAQ' },
    egt_faq_h:           { tr: 'Sık sorulan sorular', en: 'Frequently asked questions' },
    egt_faq_cat1:        { tr: 'Prodüksiyon / Ableton', en: 'Production / Ableton' },
    egt_faq1_a:          { tr: 'Ders paketi ve süreye göre değişmekle birlikte, önce <strong>1 saatlik ücretsiz deneme dersi</strong> yapılır. Deneme sonrası kişiye özel fiyatlandırma sunulur. Detaylı bilgi için Instagram veya WhatsApp üzerinden mesaj atabilirsin.', en: 'It depends on the lesson package and duration, but it always starts with a <strong>free 1-hour trial lesson</strong>. After the trial you get personalized pricing. For details, send a message on Instagram or WhatsApp.' },
    egt_faq2_a:          { tr: 'Dersler Google Meet veya Zoom üzerinden yapılıyor. Ekran paylaşımı ile Ableton projen üzerinde çalışıyoruz; birebir geri bildirim ve anlık düzeltmelerle öğrenme çok daha hızlı gerçekleşiyor.', en: 'Lessons run on Google Meet or Zoom. We work on your Ableton project via screen sharing; one-to-one feedback and instant corrections make learning much faster.' },
    egt_faq3_a:          { tr: 'Seviyeye ve haftalık pratik süresine bağlı olarak değişir. Sıfırdan başlayan bir öğrenci 3-6 ay içinde kendi parçalarını üretebilir hale geliyor. Ableton özel ders ile bu süreç kendi başına öğrenmeye kıyasla çok daha kısalıyor.', en: 'It depends on your level and weekly practice time. A student starting from zero can produce their own tracks within 3-6 months. Private Ableton lessons make this much shorter than learning alone.' },
    egt_faq4_a:          { tr: '<strong>Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass ve Indie Dance</strong> dahil pek çok elektronik türde eğitim veriyorum. Multi-genre bir yaklaşımla, kişiye özel müfredatta istediğin tarza odaklanabiliriz.', en: 'I teach many electronic genres, including <strong>Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass and Indie Dance</strong>. With a multi-genre approach, your personalized curriculum can focus on the style you want.' },
    egt_faq_cat2:        { tr: 'DJ eğitimi', en: 'DJ training' },
    egt_faq5_q:          { tr: 'DJ derslerinde hangi ekipmanı kullanıyoruz?', en: 'What gear do we use in the DJ lessons?' },
    egt_faq5_a:          { tr: 'Stüdyoda <strong>Pioneer Alpha-Theta XDJ-XZ</strong> (4-kanal flagship all-in-one) üzerinde çalışıyoruz. Monitör olarak <strong>Adam Audio</strong> + <strong>KRK Rokit 8"</strong>, headphone monitoring için <strong>Sennheiser HD 25 Plus</strong> kullanıyorsun. İlk dersten itibaren gerçek kulüp ekipmanı elinde — eve özel CDJ almana gerek yok.', en: 'In the studio we work on the <strong>Pioneer Alpha-Theta XDJ-XZ</strong> (a 4-channel flagship all-in-one). You monitor on <strong>Adam Audio</strong> + <strong>KRK Rokit 8"</strong> speakers and <strong>Sennheiser HD 25 Plus</strong> headphones. Real club gear from the very first lesson — no need to buy CDJs for home.' },
    egt_faq6_q:          { tr: "DJ'liğe sıfırdan başlayabilir miyim, müzik bilgim yok?", en: 'Can I start DJing from scratch with no music knowledge?' },
    egt_faq6_a:          { tr: 'Evet. Müfredat <strong>tamamen sıfırdan</strong> başlamak için tasarlandı — BPM, beat, bar, phrase gibi temel kavramlardan başlıyoruz, sonra beatmatching → harmonik mixing → set kurguya ilerliyoruz. Müzik teorisi bilmek artı ama ön koşul değil; Camelot wheel ile tonları görsel olarak eşleştirmeyi öğreniyorsun.', en: "Yes. The curriculum is built to start <strong>completely from scratch</strong> — we begin with basics like BPM, beats, bars and phrases, then move on to beatmatching → harmonic mixing → set building. Music theory helps but isn't required; you learn to match keys visually with the Camelot wheel." },
    egt_faq7_q:          { tr: '4 ders DJ için yeterli mi?', en: 'Are 4 lessons enough for DJing?' },
    egt_faq7_a:          { tr: 'Standart paketin 4 dersi <strong>temel kurulum + kulüp-hazır seviye</strong> için tasarlandı. Beatmatch, geçişler, set kurgusu, kayıt — bunları öğrenip uygulayacak hale geliyorsun. Daha derinleşmek istersen ek dersler veya Hybrid Set / Live Set ileri modüllerine geçiş yapılabilir.', en: "The 4 lessons of the Standard package are designed for a <strong>solid setup + club-ready level</strong>. Beatmatching, transitions, set building, recording — you'll learn them and be able to apply them. To go deeper, you can add lessons or move on to the advanced Hybrid Set / Live Set modules." },
    egt_faq8_q:          { tr: 'Hybrid Set ile DJ arasında ne fark var?', en: "What's the difference between a Hybrid Set and DJing?" },
    egt_faq8_a:          { tr: "Klasik DJ track'leri mixleyip geçişler yapar. <strong>Hybrid Set</strong>'te ise DJ akışını korurken üzerine <strong>Ableton Live + Push</strong> ile kendi loop'larını, drum overdub'larını, sample ve FX katmanlarını canlı tetikliyorsun. Tale Of Us, Mind Against, Mathame gibi sanatçıların yaklaşımı. Standart DJ eğitimini bitirdikten sonra alınır.", en: "A classic DJ mixes tracks and builds transitions. In a <strong>Hybrid Set</strong> you keep the DJ flow while triggering your own loops, drum overdubs, samples and FX layers live with <strong>Ableton Live + Push</strong>. It's the approach of artists like Tale Of Us, Mind Against and Mathame. It's taken after completing the standard DJ training." },
    egt_faq9_q:          { tr: 'Stüdyo Paketi veya Premium Paket nedir, ne işe yarar?', en: 'What are the Studio and Premium packages for?' },
    egt_faq9_a:          { tr: '<strong>Stüdyo Paketi</strong>: Standart 4 dersin üzerine 1 saatlik profesyonel stüdyo set çekimi eklenir — sosyal medyada kullanılabilecek MP4 + WAV teslim. <strong>Premium Paket</strong>: Stüdyonun üzerine 1 saatlik <strong>drone + profesyonel kamera dış mekan çekimi</strong> eklenir (rooftop / terrace / doğa) — 4K multi-cam + kurgu sonrası 2-3 dakikalık premium video teslimi. Promotöre demo göndereceksen veya kişisel marka kuracaksan bu paketler portfolio için ideal.', en: "<strong>Studio Package</strong>: a 1-hour professional studio set shoot on top of the 4 standard lessons — MP4 + WAV delivered for social media. <strong>Premium Package</strong>: on top of Studio, a 1-hour <strong>drone + professional camera outdoor shoot</strong> (rooftop / terrace / nature) — 4K multi-cam and a 2-3 minute edited premium video. Ideal for your portfolio if you're sending demos to promoters or building a personal brand." },
    egt_faq10_q:         { tr: 'DJ ders ücreti ne kadar?', en: 'How much do DJ lessons cost?' },
    egt_faq10_a:         { tr: 'Tıpkı Ableton dersleri gibi, önce <strong>1 saatlik ücretsiz deneme dersi</strong> yapılır. Stüdyoyu görür, ekipmanı denersin, hocayla tanışırsın. Deneme sonrası seçtiğin pakete (Standart / Stüdyo / Premium / Hybrid Set) göre fiyatlandırma sunulur.', en: 'Just like the Ableton lessons, it starts with a <strong>free 1-hour trial lesson</strong>. You see the studio, try the gear and meet your teacher. After the trial you get pricing based on the package you choose (Standard / Studio / Premium / Hybrid Set).' },
    egt_faq11_q:         { tr: 'DJ dersleri sadece yüz yüze mi? Online da olur mu?', en: 'Are DJ lessons only in person? Can they be online?' },
    egt_faq11_a:         { tr: 'DJ eğitiminin pratik kısmı — gerçek XDJ-XZ üzerinde el alıştırması — <strong>yüz yüze stüdyoda</strong> en verimli oluyor. Teorik kısımlar (track seçimi, phrase analizi, set kurgu mantığı) online da yapılabilir. Çoğu öğrenci hibrit yapıyor: pratik dersler stüdyoda, teorik takip online.', en: 'The practical part of DJ training — hands-on practice on a real XDJ-XZ — works best <strong>in person at the studio</strong>. Theory (track selection, phrase analysis, set-building logic) can be done online. Most students go hybrid: practical lessons in the studio, theory follow-up online.' },
    egt_banner_m_title:  { tr: 'Ders paneliniz', en: 'Your lesson panel' },
    egt_banner_m_desc:   { tr: 'Ders takvimini görüntüle, erteleme ya da yeni talep gönder.', en: 'See your lesson calendar, request a postponement or send a new request.' },
    egt_banner_m_btn:    { tr: 'Panele git', en: 'Go to the panel' },
    egt_panel_cta:       { tr: 'Ders panelinize git', en: 'Go to your lesson panel' },

    // ── Eğitmen (egitmen.html) — yeni tasarım ──
    eg_role:                { tr: 'PRODUCER · MIX MASTERING & EĞİTMEN', en: 'PRODUCER · MIX MASTERING & EDUCATOR' },
    eg_spotify_note:        { tr: 'sanatçı sayfası', en: 'artist page' },
    eg_vinyl:               { tr: 'PRODUCER · MIX MASTERING · EĞİTMEN · ', en: 'PRODUCER · MIX MASTERING · EDUCATOR · ' },
    eg_fact_perform_label:  { tr: 'Performans', en: 'Performance' },
    eg_fact_industry_sub:   { tr: 'profesyonel giriş', en: 'professional debut' },
    eg_fact_edu_val:        { tr: 'Online · Birebir', en: 'Online · One-on-one' },
    eg_spark_title:         { tr: 'İlk kıvılcım', en: 'First spark' },
    eg_spark_desc:          { tr: 'Elektronik müziğin derin ve karanlık dünyasıyla tanışan Berkay Er, kendi özgün sesini bulma yolculuğuna çıktı. Frekanslar onu çekti; o da onlara kapıyı açtı.', en: 'Discovering the deep and dark world of electronic music, Berkay Er set out to find his own sound. The frequencies drew him in — and he opened the door to them.' },
    eg_industry_title:      { tr: 'Endüstriye giriş', en: 'Industry entry' },
    eg_industry_desc:       { tr: "Loop'lar ve sample'lar üzerine yoğun çalışmalar. Peaktime, Melodic Techno ve Indie tarzlarını harmanlayarak benzersiz bir müzikal kimlik.", en: 'Intensive work on loops and samples. A unique musical identity blending Peaktime, Melodic Techno and Indie.' },
    eg_story_title:         { tr: 'Hikaye anlatıcısı', en: 'Storyteller' },
    eg_story_desc:          { tr: "Ableton ile kurgulanan Live Set'leriyle sahnede kendi notalarını icra ediyor; dinleyicisini farklı dünyalara taşıyan derin bir deneyim.", en: 'Performing his own music on stage with Live Sets built in Ableton — a deep experience that carries listeners to other worlds.' },
    eg_about_lead:          { tr: 'Berkay Er, <em>Ableton Live uzmanı</em>, Peaktime Techno ve Melodic Techno odaklı Türk elektronik müzik prodüktörü ve eğitmenidir.', en: 'Berkay Er is an <em>Ableton Live expert</em> — a Turkish electronic music producer and educator focused on Peaktime Techno and Melodic Techno.' },
    eg_about_body:          { tr: "Ses tasarımı, mix & mastering ve ghost production alanlarında profesyonel üretim yapıyor; Minimal Tech, Minimal Bass ve Indie Dance türlerinde de aktif. Kurguladığı Live Set performanslarıyla sahnede dinleyicisiyle buluşurken 100'den fazla öğrenciye elektronik müzik prodüksiyonu eğitimi verdi.", en: 'He works professionally in sound design, mix & mastering and ghost production, and is also active in Minimal Tech, Minimal Bass and Indie Dance. While meeting audiences on stage with his Live Set performances, he has taught electronic music production to more than 100 students.' },
    eg_studio_desc:         { tr: "Ableton Push 2 & Live 12 donanım entegrasyonu ile profesyonel üretim ortamı — controller workflow'undan yazılım derinliklerine.", en: 'A professional production environment with Ableton Push 2 & Live 12 hardware integration — from controller workflow to the depths of the software.' },
    eg_results_desc:        { tr: 'Sıfırdan parça yayınlayana kadar kişiye özel ilerleme takibi — her öğrencinin vizyonuna uyarlanmış yol haritası.', en: "Personal progress tracking from zero to releasing tracks — a roadmap tailored to each student's vision." },
    eg_styles_title:        { tr: 'Müzik tarzları', en: 'Music styles' },
    eg_hero_video_aria:     { tr: 'Berkay Er canlı performans sırasında (video)', en: 'Berkay Er during a live performance (video)' },
    eg_video_pause:         { tr: 'Videoyu duraklat', en: 'Pause video' },
    eg_video_play:          { tr: 'Videoyu oynat', en: 'Play video' },
    eg_cta_title:           { tr: 'Birebir çalışmak <em class="be-ember-text">ister misin?</em>', en: 'Want to work <em class="be-ember-text">one-on-one?</em>' },
    eg_cta_desc:            { tr: '1 saatlik ücretsiz deneme dersinde seviyeni ve hedefini konuşur, sana özel bir müfredat çıkarırız.', en: 'In a free 1-hour trial lesson we talk about your level and goals, and build a curriculum just for you.' },
    eg_cta_btn:             { tr: 'Ücretsiz deneme dersi', en: 'Free trial lesson' },

    // ── SSS (sss.html) — yeni tasarım ──
    sss_h1a:          { tr: 'Sıkça sorulan', en: 'Frequently asked' },
    sss_h1b:          { tr: 'sorular', en: 'questions' },
    sss_catnav_aria:  { tr: 'Kategoriler', en: 'Categories' },
    sss_filter_aria:  { tr: 'Kategoriye göre süz', en: 'Filter by category' },
    sss_f_all:        { tr: 'Tümü', en: 'All' },
    sss_f_egitim:     { tr: 'Eğitim', en: 'Education' },
    sss_f_paket:      { tr: 'Ders & paketler', en: 'Lessons & packages' },
    sss_f_topluluk:   { tr: 'Topluluk', en: 'Community' },
    sss_a1_html:      { tr: 'İlk görüşme tamamen <strong>ücretsiz ve 1 saattir</strong>. Seviyeni, hedeflerini ve hangi türde üretim yapmak istediğini konuşuruz. Deneme sonrası sana özel bir müfredat ve fiyat teklifi sunarım. Hiçbir yükümlülük gerektirmez.', en: 'The first meeting is <strong>completely free and lasts 1 hour</strong>. We talk about your level, your goals and the genre you want to produce. After the trial I offer you a personal curriculum and price. No commitment required.' },
    sss_a2_html:      { tr: 'Dersler <strong>Zoom üzerinden, birebir ve online</strong> yapılıyor. Ekran paylaşımı ile kendi Ableton projen ya da sıfırdan yaptığımız parça üzerinde çalışıyoruz. Anlık geri bildirim ve doğrudan düzeltmelerle öğrenme çok daha hızlı ilerliyor.', en: 'Lessons are held <strong>one-on-one and online via Zoom</strong>. With screen sharing we work on your own Ableton project or on a track we build from scratch. Instant feedback and direct corrections make learning much faster.' },
    sss_a3_html:      { tr: 'Eğitim programı <strong>Ableton Live</strong> üzerine kurulu. Ableton, elektronik müzik üretimi için en güçlü ve esnek araçlardan biri — özellikle sahne performansı ve sound design için ideal. Diğer DAW’lara aşinalığın varsa fark yaratmaz, sıfırdan başlayabiliriz.', en: "The curriculum is built around <strong>Ableton Live</strong>. Ableton is one of the most powerful and flexible tools for electronic music production — especially ideal for live performance and sound design. If you know other DAWs it doesn't matter; we can start from scratch." },
    sss_a4_html:      { tr: 'Evet, kesinlikle. Sıfır deneyimle başlayan öğrenciler için <strong>temel seviyeden başlayan kişisel bir müfredat</strong> oluşturuyorum. Tek gereksinim öğrenme motivasyonu ve Ableton Live’a (deneme sürümü de olur) erişim.', en: 'Yes, absolutely. For students starting with zero experience I build <strong>a personal curriculum that starts from the basics</strong>. The only requirements are motivation to learn and access to Ableton Live (the trial version is fine).' },
    sss_a5_html:      { tr: '<strong>Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass ve Indie Dance</strong> türlerinde eğitim veriyorum. Multi-genre bir yaklaşımla, hangi tarza odaklanmak istersen müfredatı ona göre şekillendiririz.', en: 'I teach <strong>Melodic Techno, Techno, Dark Minimal, Minimal Tech, Minimal Bass and Indie Dance</strong>. With a multi-genre approach, we shape the curriculum around whatever style you want to focus on.' },
    sss_a6_html:      { tr: 'Seviyene ve haftalık pratik süresine göre değişiyor. Sıfırdan başlayan bir öğrenci <strong>3–6 ay içinde kendi parçalarını üretebilir</strong> hale geliyor. Düzenli pratikle bu süre belirgin biçimde kısalıyor.', en: 'It depends on your level and weekly practice time. A student starting from zero can <strong>produce their own tracks within 3–6 months</strong>. Regular practice shortens this noticeably.' },
    sss_a7_html:      { tr: 'Standart paket <strong>haftada 1 ders (ayda 4 ders)</strong> üzerine kurulu. İstersen ayda 2 veya 3 ders şeklinde daha esnek bir program da oluşturabiliriz. <strong>Minimum paket 3 ders</strong>.', en: 'The standard package is built on <strong>1 lesson per week (4 lessons per month)</strong>. If you prefer, we can set up a more flexible schedule of 2 or 3 lessons per month. <strong>The minimum package is 3 lessons</strong>.' },
    sss_a8_html:      { tr: 'Fiyatlandırma seçtiğin ders sayısına ve programa göre değişiyor. Ücretsiz deneme dersi sonrasında ihtiyacına özel bir teklif sunuluyor.', en: 'Pricing depends on the number of lessons and the program you choose. After the free trial lesson you get an offer tailored to your needs.' },
    sss_a9_html:      { tr: '<strong>Hayır.</strong> Alınan ders paketleri iptal edilemez ve başka bir kişiye devredilemez. Ders saatini değiştirmek için en az <strong>24 saat öncesinden</strong> haber vermen yeterli.', en: '<strong>No.</strong> Purchased lesson packages cannot be cancelled or transferred to another person. To change a lesson time, just let me know at least <strong>24 hours in advance</strong>.' },
    sss_a10_html:     { tr: 'Eğitime kayıtlı öğrenciler <strong>500+ GB preset ve sample paketine</strong> erişim sağlıyor. Ayrıca ders notları, referans parçaları ve özel hazırlanmış Ableton proje dosyaları paylaşılıyor.', en: 'Students enrolled in the program get access to <strong>500+ GB of presets and sample packs</strong>. Lesson notes, reference tracks and specially prepared Ableton project files are shared as well.' },
    sss_a11_html:     { tr: 'Evet. <strong>berkayeracademy.com</strong> öğrencilerin birbirleriyle etkileşime geçebileceği bir platform. <a href="/forum">Forum</a>, <a href="/members">üye dizini</a>, profil sayfaları ve öğrencilere özel <a href="/ableton-lab">Ableton Lab</a> aktif olarak kullanıma açık.', en: 'Yes. <strong>berkayeracademy.com</strong> is a platform where students can interact with each other. The <a href="/forum">forum</a>, the <a href="/members">member directory</a>, profile pages and the student-exclusive <a href="/ableton-lab">Ableton Lab</a> are all open and in active use.' },
    sss_a12_html:     { tr: 'Resmi bir sertifika programı şu an aktif değil. Ama eğitim sonunda kendi parçalarını, mix’ini ve prodüksiyon anlayışını kapsayan bir <strong>portfolyo</strong> oluşturmuş olacaksın — bu, herhangi bir sertifikadan daha değerli bir kanıt.', en: "There's no official certificate program at the moment. But by the end of your training you'll have built a <strong>portfolio</strong> of your own tracks, mixes and production skills — more valuable proof than any certificate." },

    // ── Forum (forum.html) — yeni tasarım ──
    forum_hero_title:        { tr: 'Elektronik müzik <em class="be-ember-text">topluluğu</em>', en: 'Electronic music <em class="be-ember-text">community</em>' },
    forum_hero_sub:          { tr: 'ABLETON · SES TASARIMI · MIX · PRODÜKSİYON', en: 'ABLETON · SOUND DESIGN · MIX · PRODUCTION' },
    forum_search_label:      { tr: 'Konularda ara', en: 'Search topics' },
    forum_search_clear:      { tr: 'Aramayı temizle', en: 'Clear search' },
    forum_new_topic_btn:     { tr: 'Yeni konu', en: 'New topic' },
    forum_new_topic_aria:    { tr: 'Yeni konu aç', en: 'Start a new topic' },
    forum_list_label:        { tr: 'Konular', en: 'Topics' },
    forum_cat_group:         { tr: 'Kategori', en: 'Category' },
    forum_status_group:      { tr: 'Durum', en: 'Status' },
    forum_join_title:        { tr: 'Topluluğa katıl', en: 'Join the community' },
    forum_join_desc:         { tr: 'Soruları görmek ve konu açmak için giriş yap.', en: 'Sign in to see questions and start topics.' },
    forum_join_btn:          { tr: 'Giriş yap', en: 'Sign in' },
    forum_members_title:     { tr: 'Son üyeler', en: 'Recent members' },
    forum_members_all:       { tr: 'Tümü', en: 'All' },
    forum_members_all_aria:  { tr: 'Tüm üyeleri gör', en: 'See all members' },
    forum_members_signin:    { tr: 'Üyeleri görmek için giriş yap.', en: 'Sign in to see members.' },
    forum_goto_btn:          { tr: 'Konuya git', en: 'Open topic' },
    forum_like_aria:         { tr: 'Beğen', en: 'Like' },
    forum_admin_badge:       { tr: 'Eğitmen', en: 'Instructor' },
    forum_reply_one:         { tr: 'Yanıt', en: 'Reply' },
    forum_cat_general:       { tr: 'Genel', en: 'General' },
    forum_cat_sound:         { tr: 'Ses Tasarımı', en: 'Sound Design' },
    forum_cat_other:         { tr: 'Diğer', en: 'Other' },

    // ── Konu detay (post.html) — yeni tasarım ──
    post_like:            { tr: 'Beğen', en: 'Like' },
    post_share:           { tr: 'Paylaş', en: 'Share' },
    post_link_copied:     { tr: 'Link kopyalandı', en: 'Link copied' },
    post_copy_fail:       { tr: 'Link kopyalanamadı', en: 'Could not copy the link' },
    post_mark_solved:     { tr: 'Çözüldü olarak işaretle', en: 'Mark as solved' },
    post_reopen:          { tr: 'Yeniden aç', en: 'Reopen' },
    post_reopened:        { tr: 'Konu yeniden açıldı', en: 'Topic reopened' },
    post_marked_solved:   { tr: '✓ Konu çözüldü olarak işaretlendi', en: '✓ Topic marked as solved' },
    post_delete_confirm:  { tr: 'Konuyu ve yanıtlarını sil?', en: 'Delete the topic and its replies?' },
    post_reply_updated:   { tr: '✓ Yanıt güncellendi', en: '✓ Reply updated' },
    post_load_fail:       { tr: 'Konu yüklenemedi.', en: 'Could not load the topic.' },
    post_topic:           { tr: 'Konu', en: 'Topic' },
    post_member:          { tr: 'Üye', en: 'Member' },
    post_staff:           { tr: 'EĞİTMEN', en: 'INSTRUCTOR' },
    post_staff_role:      { tr: 'Eğitmen', en: 'Instructor' },
    post_opened_by:       { tr: 'KONUYU AÇAN', en: 'STARTED BY' },
    post_opened_by_aria:  { tr: 'Konuyu açan', en: 'Started by' },
    post_view_profile:    { tr: 'Profili gör', en: 'View profile' },
    post_new_topic:       { tr: 'Yeni konu aç', en: 'Start a new topic' },
    post_reply_label:     { tr: 'YANITIN', en: 'YOUR REPLY' },
    post_reply_ph_long:   { tr: 'Yanıtını buraya yaz… (Ctrl+Enter ile gönder)', en: 'Write your reply here… (Ctrl+Enter to send)' },
    post_md_hint:         { tr: '**KALIN** · *İTALİK* · `KOD`', en: '**BOLD** · *ITALIC* · `CODE`' },
    post_send:            { tr: 'Gönder', en: 'Send' },

    // ── Yeni konu (new-post.html) — yeni tasarım ──
    np_h1_a:               { tr: 'Yeni', en: 'New' },
    np_h1_b:               { tr: 'konu', en: 'topic' },
    np_lead:               { tr: 'Topluluğa sorunu veya paylaşımını yaz.', en: 'Write your question or post for the community.' },
    np_cat_label:          { tr: 'Kategori', en: 'Category' },
    np_details_label:      { tr: 'Detaylar', en: 'Details' },
    np_title_placeholder:  { tr: 'Konunu kısaca özetle…', en: 'Summarise your topic briefly…' },
    np_body_placeholder:   { tr: 'Detayları buraya yaz…', en: 'Write the details here…' },
    np_title_required:     { tr: 'Konuya bir başlık yaz.', en: 'Give your topic a title.' },
    np_preview_empty:      { tr: 'Konunu kısaca özetle', en: 'Summarise your topic briefly' },
    np_publish:            { tr: 'Konuyu yayınla', en: 'Publish topic' },
    np_publish_short:      { tr: 'Yayınla', en: 'Publish' },
    np_cancel:             { tr: 'Vazgeç', en: 'Cancel' },
    np_posting_as:         { tr: 'Paylaşan', en: 'Posting as' },
    np_send_error:         { tr: 'Gönderilemedi', en: 'Could not publish' },
    np_tb_group:           { tr: 'Biçimlendirme', en: 'Formatting' },
    np_tb_bold:            { tr: 'Kalın (**metin**)', en: 'Bold (**text**)' },
    np_tb_italic:          { tr: 'İtalik (*metin*)', en: 'Italic (*text*)' },
    np_tb_code:            { tr: 'Kod satırı', en: 'Inline code' },
    np_tb_code_lbl:        { tr: '`kod`', en: '`code`' },
    np_tb_hr:              { tr: 'Yatay çizgi', en: 'Horizontal line' },
    np_tb_sample:          { tr: 'metin', en: 'text' },
    np_tips_label:         { tr: 'Biçimlendirme ipuçları', en: 'Formatting tips' },
    np_tip_bold:           { tr: 'kalın', en: 'bold' },
    np_tip_italic:         { tr: 'italik', en: 'italic' },
    np_tip_code:           { tr: 'kod', en: 'code' },
    np_tips_note:          { tr: 'Hata mesajını ve Live sürümünü yazmak yardımcı olur. Tekrar eden soruları forumda aramayı dene.', en: 'Including the error message and your Live version helps. Try searching the forum for similar questions first.' },

    // ── Üyeler (members.html) — yeni tasarım ──
    mem_h1_a:           { tr: 'Topluluk', en: 'Community' },
    mem_h1_b:           { tr: 'üyeleri', en: 'members' },
    mem_sub:            { tr: 'Elektronik müzik topluluğu', en: 'Electronic music community' },
    mem_count_word:     { tr: 'üye', en: 'members' },
    mem_journey:        { tr: 'Ünvan yolculuğu', en: 'Title journey' },
    mem_title_filter:   { tr: 'Ünvana göre filtrele', en: 'Filter by title' },
    mem_sort_aria:      { tr: 'Sıralama', en: 'Sort order' },
    mem_search_ph:      { tr: 'Üye ara', en: 'Search members' },
    mem_search_aria:    { tr: 'Üye ara: isim, ünvan ya da tür', en: 'Search members by name, title or genre' },
    mem_genre_lbl:      { tr: 'Tür', en: 'Genre' },
    mem_genre_filter:   { tr: 'Türe göre filtrele', en: 'Filter by genre' },
    mem_genres_more:    { tr: '+{n} tür', en: '+{n} genres' },
    mem_genres_less:    { tr: 'Daha az', en: 'Show less' },
    mem_more_genres:    { tr: 'Diğer türler', en: 'More genres' },
    mem_clear_filters:  { tr: 'Filtreleri temizle', en: 'Clear filters' },
    mem_showing:        { tr: '{n} üye gösteriliyor', en: 'Showing {n} members' },
    mem_load_error:     { tr: 'Üyeler yüklenemedi. Sayfayı yenileyip tekrar dene.', en: 'Could not load members. Refresh the page and try again.' },
    mem_admin:          { tr: 'Admin', en: 'Admin' },
    mem_social_new:     { tr: 'yeni sekmede açılır', en: 'opens in a new tab' },

    // ── Profil (profile.html) — yeni tasarım ──
    prof_about_none:         { tr: 'Henüz bilgi eklenmemiş.', en: 'Nothing added yet.' },
    prof_about_signin:       { tr: 'Profil ayrıntılarını görmek için giriş yap.', en: 'Sign in to see profile details.' },
    prof_activity:           { tr: 'Etkinlik', en: 'Activity' },
    prof_appearance:         { tr: 'Görünüm ayarları', en: 'Appearance' },
    prof_browse_topics:      { tr: 'Konulara göz at', en: 'Browse topics' },
    prof_btn_booking:        { tr: 'Ders paneli', en: 'Lesson panel' },
    prof_btn_cancel_edit:    { tr: 'Vazgeç', en: 'Cancel' },
    prof_btn_collab:         { tr: 'Collab isteği gönder', en: 'Send collab request' },
    prof_btn_collab_s:       { tr: 'Collab isteği', en: 'Collab request' },
    prof_btn_edit:           { tr: 'Profili düzenle', en: 'Edit profile' },
    prof_btn_follow:         { tr: '+ Takip et', en: '+ Follow' },
    prof_btn_following:      { tr: '✓ Takip ediliyor', en: '✓ Following' },
    prof_btn_msg:            { tr: 'Mesaj gönder', en: 'Send message' },
    prof_collab_other_busy:  { tr: '{ad} şu an meşgul; yine de istek gönderebilirsin.', en: '{ad} is busy right now; you can still send a request.' },
    prof_collab_other_none:  { tr: '{ad} işbirliği durumunu belirtmemiş.', en: '{ad} has not set a collab status.' },
    prof_collab_other_open:  { tr: '{ad} yeni projelere açık.', en: '{ad} is open to new projects.' },
    prof_collab_own_busy:    { tr: 'Şu an meşgul görünüyorsun. Gelen collab istekleri yine Mesajlar panelinde görünür.', en: 'You appear busy. Incoming collab requests still show up in Messages.' },
    prof_collab_own_none:    { tr: 'İşbirliği durumunu belirtmedin. Yukarıdaki durum düğmesinden seçebilirsin.', en: 'You have not set a collab status. Pick one with the status button above.' },
    prof_collab_own_open:    { tr: 'Projelere açık görünüyorsun. Collab istekleri Mesajlar panelinde görünür.', en: 'You appear open to projects. Collab requests show up in Messages.' },
    prof_collab_signin:      { tr: 'İşbirliği durumunu görmek ve collab isteği göndermek için giriş yap.', en: 'Sign in to see the collab status and send a collab request.' },
    prof_explore_members:    { tr: 'Üyeleri keşfet', en: 'Explore members' },
    prof_genre_remove:       { tr: 'Kaldır', en: 'Remove' },
    prof_go_forum:           { tr: 'Foruma git', en: 'Go to forum' },
    prof_n_replies:          { tr: '{n} yanıt', en: '{n} replies' },
    prof_no_replies_own:     { tr: "Henüz yorum yapılmamış. Forum'da ilk yorumunu yaptıktan sonra burada görünür.", en: 'No replies yet. Forum replies will appear here after your first post.' },
    prof_notif_del:          { tr: 'Bildirimi sil', en: 'Delete notification' },
    prof_notif_empty:        { tr: 'Bildirim yok', en: 'No notifications' },
    prof_notif_new:          { tr: 'Yeni bildirim', en: 'New notification' },
    prof_open_messages:      { tr: 'Mesajları aç', en: 'Open messages' },
    prof_preview:            { tr: 'Önizleme', en: 'Preview' },
    prof_preview_btn:        { tr: 'Buton', en: 'Button' },
    prof_preview_text:       { tr: 'Yazı önizlemesi', en: 'Text preview' },
    prof_rank_none:          { tr: 'Henüz ünvan yok. Ünvanları Berkay Er verir.', en: 'No title yet. Titles are given by Berkay Er.' },
    prof_rank_progress:      { tr: 'Ünvan ilerlemesi', en: 'Title progress' },
    prof_read_all:           { tr: 'Tümünü oku', en: 'Mark all read' },
    prof_send:               { tr: 'Gönder', en: 'Send' },
    prof_set_text:           { tr: 'Yazı', en: 'Text' },
    prof_side:               { tr: 'Profil ayrıntıları', en: 'Profile details' },
    prof_stats:              { tr: 'İstatistikler', en: 'Stats' },
    prof_status_busy:        { tr: 'Meşgul', en: 'Busy' },
    prof_status_open:        { tr: 'Projeye açık', en: 'Open to projects' },
    prof_status_set:         { tr: 'Durum belirt', en: 'Set status' },
    prof_status_toggle:      { tr: 'İşbirliği durumunu değiştir', en: 'Change collab status' },
    prof_tab_replies:        { tr: 'Son yorumlar', en: 'Recent replies' },
    prof_tab_replies_s:      { tr: 'Yorumlar', en: 'Replies' },
    prof_tab_topics:         { tr: 'Son konular', en: 'Recent topics' },
    prof_tab_topics_s:       { tr: 'Konular', en: 'Topics' },

    // ── Ableton Lab (ableton-lab.html) — yeni tasarım ──
    lab_hero_eyebrow:  { tr: 'ÜCRETSİZ İNTERAKTİF LAB', en: 'FREE INTERACTIVE LAB' },
    lab_hero_t1:       { tr: "Ableton'a", en: 'First step' },
    lab_hero_t2:       { tr: 'ilk adım.', en: 'into Ableton.' },
    lab_hero_lead:     { tr: "Synthesizer, Beat Maker, Mixer ve Arrangement Builder ile derslerde öğrendiklerini tarayıcında dene. Derse başlamadan önce Lab'ı tamamla.", en: 'Try what you learn in lessons right in your browser with the Synthesizer, Beat Maker, Mixer and Arrangement Builder. Finish the Lab before your first lesson.' },
    lab_hero_start:    { tr: 'Hemen başla', en: 'Start now' },
    lab_hero_lessons:  { tr: 'Birebir dersle ilerle', en: 'Continue with 1-on-1 lessons' },
    lab_path_aria:     { tr: 'Lab modülleri ve ilerlemen', en: 'Lab modules and your progress' },
    lab_tabs_aria:     { tr: 'Lab modülleri', en: 'Lab modules' },
    lab_tab_overview:  { tr: 'Genel bakış', en: 'Overview' },
    lab_cta_t1:        { tr: "Lab'ı bitirdin mi?", en: 'Finished the Lab?' },
    lab_cta_t2:        { tr: 'Derse geç.', en: 'Start your lessons.' },
    lab_cta_sub:       { tr: "Push 3 Laboratuvarı'nı da dene — 27 gerçek kontrol, tarayıcında.", en: 'Try the Push 3 Lab too — 27 real controls, in your browser.' },
    lab_cta_push:      { tr: 'Push 3 Lab', en: 'Push 3 Lab' },
    lab_cta_panel:     { tr: 'Ders paneli', en: 'Lesson panel' },
    lab_mod_1:         { tr: 'Synthesizer', en: 'Synthesizer' },
    lab_mod_2:         { tr: 'Beat Maker — step sequencer', en: 'Beat Maker — step sequencer' },
    lab_mod_3:         { tr: 'Mixing & efektler', en: 'Mixing & effects' },
    lab_mod_4:         { tr: 'Song arrangement', en: 'Song arrangement' },
    lab_mod_5:         { tr: 'Mastering', en: 'Mastering' },
    lab_cat_1:         { tr: 'Ses tasarımı', en: 'Sound design' },
    lab_cat_2:         { tr: 'Ritim', en: 'Rhythm' },
    lab_cat_3:         { tr: 'EQ · Mixer', en: 'EQ · Mixer' },
    lab_cat_4:         { tr: 'Şarkı yapısı', en: 'Song structure' },
    lab_cat_5:         { tr: 'Master chain', en: 'Master chain' },
    lab_tasks_word:    { tr: 'görev', en: 'tasks' },
    lab_done_word:     { tr: 'tamamlandı', en: 'complete' },
    lab_open:          { tr: 'Modülü aç', en: 'Open module' },
    lab_play:          { tr: 'Çal', en: 'Play' },
    lab_stop:          { tr: 'Durdur', en: 'Stop' },
    lab_beat_title:    { tr: 'Step sequencer', en: 'Step sequencer' },
    lab_style_tpl:     { tr: 'TARZ ŞABLONU', en: 'STYLE TEMPLATE' },
    lab_seq_hint:      { tr: '16 ADIM · YANA KAYDIR →', en: '16 STEPS · SWIPE →' },
    lab_step_word:     { tr: 'adım', en: 'step' },
    lab_synth_title:   { tr: 'Osilatör & filtre', en: 'Oscillator & filter' },
    lab_quick_preset:  { tr: 'HIZLI PRESET', en: 'QUICK PRESET' },
    lab_wave_aria:     { tr: 'Dalga biçimi', en: 'Waveform' },
    lab_mix_kicker:    { tr: 'MIXING & EFEKTLER', en: 'MIXING & EFFECTS' },
    lab_mix_title:     { tr: 'İnteraktif mixer', en: 'Interactive mixer' },
    lab_level_word:    { tr: 'seviyesi', en: 'level' },
    lab_arr_kicker:    { tr: 'SONG ARRANGEMENT', en: 'SONG ARRANGEMENT' },
    lab_arr_title:     { tr: 'Arrangement builder', en: 'Arrangement builder' },
    lab_arr_guide:     { tr: 'Şarkı yapısı rehberi', en: 'Song structure guide' },
    lab_arr_aria:      { tr: 'Arrangement önizlemesi: 8 bölüm, 5 iz', en: 'Arrangement preview: 8 sections, 5 tracks' },
    lab_mast_title:    { tr: 'Master chain', en: 'Master chain' },
    lab_mast_p:        { tr: "Sinyal sırası, loudness yönetimi ve limiter tavanı — modül 05'in özeti.", en: 'Signal order, loudness management and limiter ceiling — a summary of module 05.' },
    lab_mast_aria:     { tr: 'Master zinciri: EQ Eight, Glue Compressor, Multiband, Limiter', en: 'Master chain: EQ Eight, Glue Compressor, Multiband, Limiter' },

    // ── site_1.html (Lab eski sürüm) — yeni tasarım ──
    lab_close:        { tr: 'Kapat', en: 'Close' },
    lab_save_failed:  { tr: 'Kaydedilemedi', en: 'Could not save' },

    // ── Ders: Ableton (ders-ableton.html) — yeni tasarım ──
    da_crumb_content:  { tr: 'Ders içeriği', en: 'Lesson content' },
    da_crumb_module:   { tr: 'Modül 01', en: 'Module 01' },
    da_crumbs_aria:    { tr: 'Sayfa yolu', en: 'Breadcrumb' },
    da_hdr_count:      { tr: 'Modül 01 / 08', en: 'Module 01 / 08' },
    da_hero_tag:       { tr: 'Başlangıç · Ücretsiz', en: 'Beginner · Free' },
    da_title_em:       { tr: 'temelleri', en: 'basics' },
    da_hero_sub:       { tr: 'Elektronik müzik prodüksiyon eğitimi', en: 'Electronic music production training' },
    da_play:           { tr: 'Dersi başlat', en: 'Start the lesson' },
    da_stop:           { tr: 'Dersi kapat', en: 'Close the lesson' },
    da_min:            { tr: 'Videoyu küçült', en: 'Minimise video' },
    da_max:            { tr: 'Videoyu büyüt', en: 'Expand video' },
    da_frame:          { tr: 'Ableton Live temelleri — ders kaydı', en: 'Ableton Live basics — lesson recording' },
    da_learn_label:    { tr: 'Bu derste öğreneceklerin', en: "What you'll learn in this lesson" },
    da_learn_hint:     { tr: 'Tamamladığın konuları işaretleyebilirsin; işaretler bu tarayıcıda saklanır.', en: 'You can tick off the topics you have completed; your ticks are saved in this browser.' },
    da_done:           { tr: 'tamamlandı', en: 'completed' },
    da_pre1:           { tr: 'Ableton Live kurulu olması (trial yeterli)', en: 'Ableton Live installed (the trial is enough)' },
    da_pre4:           { tr: 'Not almak için defter / uygulama', en: 'A notebook / app for taking notes' },
    da_pack_h:         { tr: 'Ücretsiz ses paketi', en: 'Free sound pack' },
    da_pack_desc:      { tr: "Derse özel sample'lar, loop'lar ve preset'ler.", en: 'Lesson-exclusive samples, loops and presets.' },
    da_pack_dl:        { tr: 'İndir', en: 'Download' },
    da_all_modules:    { tr: 'Tüm modüller', en: 'All modules' },
    da_mod_locked:     { tr: 'Kilitli, birebir derslerde açılır', en: 'Locked, unlocked in one-to-one lessons' },
    da_cta_h1:         { tr: 'Devam etmek', en: 'Want to' },
    da_cta_h2:         { tr: 'istiyor musun?', en: 'continue?' },
    da_cta_ig:         { tr: "Instagram'dan mesaj at", en: 'Message on Instagram' },
    da_cta_book:       { tr: 'Ders ayarla', en: 'Book a lesson' },
    da_cta_book_all:   { tr: 'Tüm modüller için ders ayarla', en: 'Book lessons for all modules' },

    // ── Push 3 Laboratuvarı kabuğu (ders-push3.html) — yeni tasarım ──
    p3_menu_title_html:  { tr: 'Push 3 <em class="be-ember-text">laboratuvarı</em>', en: 'Push 3 <em class="be-ember-text">lab</em>' },
    p3_mode_tut_badge:   { tr: 'Önerilen · Öğretici', en: 'Recommended · Tutorial' },
    p3_mode_tut_title:   { tr: 'Sıfırdan adım adım', en: 'Step by step from scratch' },
    p3_mode_tut_desc:    { tr: 'Nota çalmaktan Wavetable ile ses tasarımına, davul programlamaktan kayda.', en: 'From playing notes to sound design with Wavetable, from programming drums to recording.' },
    p3_mode_l1_badge:    { tr: 'Oyun · Seviye 1', en: 'Game · Level 1' },
    p3_mode_l1_title:    { tr: 'Kontrolü bul', en: 'Find the control' },
    p3_mode_l1_desc:     { tr: 'Gerçek kontrolleri cihazın üstünde tek tek bul, her birinin ne işe yaradığını öğren.', en: 'Find the real controls on the device one by one and learn what each one does.' },
    p3_mode_l2_badge:    { tr: 'Görev · Seviye 2', en: 'Tasks · Level 2' },
    p3_mode_l2_title:    { tr: 'Görevler', en: 'Tasks' },
    p3_mode_free_title:  { tr: 'Serbest çal', en: 'Free play' },
    p3_mode_free_desc:   { tr: 'Kural yok, ipucu yok. Wavetable synth ve davul setiyle gerçek bir cihaz gibi çal. Learn düğmesi seni derslere götürür.', en: 'No rules, no hints. Play it like the real device with the Wavetable synth and a drum kit. The Learn button takes you to the lessons.' },
    p3_gesture_hint:     { tr: "Pad'e dokun · knob'ları yukarı/aşağı sürükle · touch strip'i kaydır", en: 'Tap a pad · drag knobs up/down · slide the touch strip' },
    p3_indep_tool:       { tr: 'Bağımsız eğitim aracı', en: 'Independent learning tool' },
    p3_indep_note:       { tr: 'Ableton AG ile bağlantılı değildir', en: 'Not affiliated with Ableton AG' },
    p3_credit:           { tr: 'Görsel', en: 'Image' },
    p3_audio_restart:    { tr: 'Sesi yeniden başlat', en: 'Restart sound' },
    p3_keys_btn:         { tr: 'Tuşlar', en: 'Keys' },
    p3_win_free:         { tr: 'Push 3 Laboratuvarı tamamen ücretsiz.', en: 'Push 3 Lab is completely free.' },
    p3_win_explore:      { tr: 'Akademiyi keşfet', en: 'Explore the academy' },

    // ── Ders Paneli öğrenci tarafı (booking.html) — yeni tasarım ──
    bks_eyebrow:             { tr: 'Ders paneli', en: 'Lesson panel' },
    bks_h1_a:                { tr: 'Ders', en: 'Lesson' },
    bks_h1_b:                { tr: 'rezervasyonu', en: 'booking' },
    bks_lab_go:              { tr: "Lab'a git →", en: 'Go to Lab →' },
    bks_signin_kicker:       { tr: 'Giriş gerekli', en: 'Sign-in required' },
    bks_step1:               { tr: 'Google ya da e-posta ile giriş yap.', en: 'Sign in with Google or email.' },
    bks_step2:               { tr: 'Ücretsiz deneme dersi ya da kampanyalı bir paket seç.', en: 'Pick a free trial lesson or a campaign package.' },
    bks_step3:               { tr: 'Berkay Er onaylayınca takvimin ve Zoom bağlantın burada.', en: 'Once Berkay Er approves, your schedule and Zoom link appear here.' },
    bks_access_kicker:       { tr: 'Başlangıç', en: 'Get started' },
    bks_access_title:        { tr: 'Nasıl başlamak istersin?', en: 'How would you like to start?' },
    bks_access_trial_go:     { tr: 'Tarih ve saat seç →', en: 'Pick a date and time →' },
    bks_access_pkg_desc:     { tr: 'Kampanyalı paketlerden birini seç, haftalık gün ve saatlerini belirle. Berkay Er onaylayınca takvimine işlenir.', en: 'Choose a campaign package and set your weekly days and times. Once Berkay Er approves, it goes into your schedule.' },
    bks_access_pkg_go:       { tr: 'Paketleri gör →', en: 'See packages →' },
    bks_access_pkg_btn:      { tr: 'Paket ve saat seçimine geç →', en: 'Continue to packages & times →' },
    bks_access_upto: { tr: `En fazla {pct} indirim`, en: `Save up to {pct}` },
    bks_req_title:           { tr: 'Ders talebi oluştur', en: 'Create a lesson request' },
    bks_type_aria:           { tr: 'Plan türü', en: 'Plan type' },
    bks_tab_camp:            { tr: 'Kampanyalı paket', en: 'Campaign package' },
    bks_tab_single:          { tr: 'Tek ders', en: 'Single lesson' },
    bks_camp_label:          { tr: 'Kampanyalı paketler', en: 'Campaign packages' },
    bks_camp_pick:           { tr: 'birini seç', en: 'pick one' },
    bks_camp_base:           { tr: 'Saat başı liste fiyatı {price}', en: 'List price per hour {price}' },
    bks_camp_none:           { tr: 'Şu an aktif kampanya yok. Tek ders seçebilir ya da WhatsApp üzerinden iletişime geçebilirsin.', en: 'There are no active campaigns right now. You can book a single lesson or contact us on WhatsApp.' },
    bks_col_hours_s:         { tr: 'Saat', en: 'Hours' },
    bks_col_list_s:          { tr: 'Liste', en: 'List' },
    bks_hours_unit:          { tr: 'saat', en: 'hrs' },
    bks_start: { tr: `İlk ders tarihi`, en: `First lesson date` },
    bks_see_pkgs:            { tr: 'Paketleri gör', en: 'See packages' },
    bks_jump_aria:           { tr: 'Saat aralığına git', en: 'Jump to time range' },
    bks_jump_night:          { tr: 'Gece 00–06', en: 'Night 00–06' },
    bks_jump_night_s:        { tr: 'Gece', en: 'Night' },
    bks_jump_morning:        { tr: 'Sabah 06–12', en: 'Morning 06–12' },
    bks_jump_morning_s:      { tr: 'Sabah', en: 'Morning' },
    bks_jump_noon:           { tr: 'Öğle 12–18', en: 'Afternoon 12–18' },
    bks_jump_noon_s:         { tr: 'Öğle', en: 'Afternoon' },
    bks_jump_evening:        { tr: 'Akşam 18–24', en: 'Evening 18–24' },
    bks_jump_evening_s:      { tr: 'Akşam', en: 'Evening' },
    bks_sel_count: { tr: `{n} saat seçili`, en: `Selected: {n}` },
    bks_pick_slots:          { tr: 'Gün & saat seç', en: 'Pick day & time' },
    bks_resched_title:       { tr: 'Erteleme hakkı — önemli', en: 'Reschedule right — important' },
    bks_resched_body: { tr: `Paketin kaç aylıksa o kadar <strong>erteleme hakkın</strong> olur (1 ay = 1 hak, 3 ay = 3 hak); hakları paket süresince istediğin derste kullanabilirsin. <strong>Ertele</strong> dersi 1 hafta ileri alır, en az <strong>24 saat önce</strong> talep edilir ve Berkay Er onaylayınca 1 hak düşer. Aynı hafta içinde saat değiştirmek (<strong>Saati değiştir</strong>) ücretsizdir, hak düşmez.`, en: `You get as many <strong>reschedule credits</strong> as your package has months (1 month = 1, 3 months = 3); use them on any lesson during the package. <strong>Reschedule</strong> moves a lesson one week later, must be requested at least <strong>24 hours ahead</strong>, and uses 1 credit once Berkay Er approves. Moving a lesson within the same week (<strong>Change time</strong>) is free and uses no credit.` },
    bks_resched_body2: { tr: `Ek hak istersen <strong class="text-accent">500 TL</strong> ödeme ile +1 erteleme hakkı tanımlanır.`, en: `Need more? Each extra reschedule credit costs <strong class="text-accent">500 TL</strong>.` },
    bks_wa_label:            { tr: 'WhatsApp numarası', en: 'WhatsApp number' },
    bks_required:            { tr: '* Zorunlu', en: '* Required' },
    bks_phone_help: { tr: `Ders hatırlatmaları bu numaraya WhatsApp ile gelir. Yurt dışındaysan <strong>+</strong> ve ülke koduyla yaz (örn. +1 617 388 4403).`, en: `Lesson reminders come to this number on WhatsApp. If you’re abroad, write it with <strong>+</strong> and your country code (e.g. +1 617 388 4403).` },
    bks_phone_help_wa:       { tr: 'Talebi gönderdikten sonra <strong>WhatsApp ile mesaj at</strong> butonuna basıp hazır metni göndermen gerekiyor — yoksa WhatsApp bilgilendirme botumuz sana ulaşamaz :(', en: "After sending the request, tap <strong>Message on WhatsApp</strong> and send the prepared text — otherwise our WhatsApp bot can't reach you :(" },
    bks_your_req:            { tr: 'Talebin', en: 'Your request' },
    bks_price_aria:          { tr: 'Fiyat özeti', en: 'Price summary' },
    bks_per_hour_short:      { tr: '{price}/saat', en: '{price}/hr' },
    bks_submit:              { tr: 'Talep gönder →', en: 'Send request →' },
    bks_submit_short:        { tr: 'Gönder →', en: 'Send →' },
    bks_pending_k:           { tr: 'Beklemede', en: 'Pending' },
    bks_rejected_k:          { tr: 'Reddedildi', en: 'Rejected' },
    bks_phone_missing:       { tr: 'WhatsApp numarası eksik', en: 'WhatsApp number missing' },
    bks_phone_missing_desc:  { tr: 'Numaranı ekle, sonra <strong>WhatsApp bilgilendirme botumuz</strong> sana ulaşabilsin — ders hatırlatmaları ve hocadan mesajlar buradan gelecek.', en: 'Add your number so <strong>our WhatsApp bot</strong> can reach you — lesson reminders and messages from your instructor come here.' },
    bks_side_aria:           { tr: 'Ders kaynakları', en: 'Lesson resources' },
    bks_note_title:          { tr: 'Notum', en: 'My note' },
    bks_sched_empty:         { tr: 'Talebin onaylandığında derslerin burada görünecek.', en: 'Your lessons will appear here once your request is approved.' },
    bks_setup_req:           { tr: 'Kurulum gerekli', en: 'Setup required' },
    bks_qa_label:            { tr: 'Sorun', en: 'Your question' },
    bks_send:                { tr: 'Gönder', en: 'Send' },
    bks_rules_eyebrow:       { tr: 'Son adım', en: 'Last step' },
    bks_pt_meta:             { tr: '{n} soru · yaklaşık 8 dk', en: '{n} questions · about 8 min' },
    bks_signin_title:        { tr: 'Ders paneline giriş yap', en: 'Sign in to your lesson panel' },

    // ── Admin paneli (booking.html) — yeni tasarım ──
    adm_accept:                { tr: 'Kabul et', en: 'Accept' },
    adm_add_lesson:            { tr: 'Ders ekle', en: 'Add lesson' },
    adm_ann_delall:            { tr: 'Tümünü sil', en: 'Delete all' },
    adm_ann_desc:              { tr: 'Yalnızca ders alan öğrencilerin panelinde görünür.', en: 'Only visible on the panel of students taking lessons.' },
    adm_ann_empty:             { tr: 'Henüz duyuru yok.', en: 'No announcements yet.' },
    adm_ann_label:             { tr: 'Duyuru', en: 'Announcement' },
    adm_ann_placeholder:       { tr: 'Öğrencilere özel duyuru, hatırlatma veya güncelleme…', en: 'Announcement, reminder or update for students…' },
    adm_ann_title:             { tr: 'Ders paneli duyuruları', en: 'Lesson panel announcements' },
    adm_approve:               { tr: 'Onayla', en: 'Approve' },
    adm_avail_blocked:         { tr: 'Kapalı saat', en: 'Closed hour' },
    adm_avail_blocked_lc:      { tr: 'kapalı', en: 'closed' },
    adm_avail_clear:           { tr: 'Aç', en: 'Open' },
    adm_avail_clear_title:     { tr: 'Günün tüm saatlerini aç', en: 'Open all hours of the day' },
    adm_avail_count:           { tr: 'saat kapalı', en: 'hours closed' },
    adm_avail_day:             { tr: 'Gün', en: 'Day' },
    adm_avail_dayoff:          { tr: 'Gün kapalı', en: 'Day closed' },
    adm_avail_dayoff_lc:       { tr: 'gün kapalı', en: 'day closed' },
    adm_avail_desc:            { tr: 'Günleri aç/kapat, saat hücrelerine dokunarak kapat. Kapalı saatler öğrencinin saat tablosunda "Dolu" görünür ve seçilemez; "Kaydet" ile yayına girer ve takvime yansır.', en: `Turn days on/off and tap hour cells to close them. Closed hours show as "Full" on the student's time grid and can't be picked; changes go live with "Save" and show on the calendar.` },
    adm_avail_dirty:           { tr: 'Kaydedilmemiş değişiklik var.', en: 'Unsaved changes.' },
    adm_avail_lesson:          { tr: 'Ders var', en: 'Has lesson' },
    adm_avail_lesson_lc:       { tr: 'ders var', en: 'has lesson' },
    adm_avail_matrix:          { tr: 'Haftalık müsaitlik', en: 'Weekly availability' },
    adm_avail_night:           { tr: 'Gece', en: 'Night' },
    adm_avail_night_title:     { tr: '00–07 arasını kapat', en: 'Close 00–07' },
    adm_avail_nights_all:      { tr: 'Tüm geceleri kapat', en: 'Close all nights' },
    adm_avail_open:            { tr: 'Açık', en: 'Open' },
    adm_avail_open_lc:         { tr: 'açık', en: 'open' },
    adm_bulk_cancel:           { tr: 'İptal et', en: 'Cancel' },
    adm_bulk_clear:            { tr: 'Vazgeç', en: 'Clear' },
    adm_bulk_complete:         { tr: 'Tamamla', en: 'Complete' },
    adm_bulk_freeze:           { tr: 'Dondur', en: 'Freeze' },
    adm_bulk_resched:          { tr: 'Ertele', en: 'Reschedule' },
    adm_cal_closed:            { tr: 'Kapalı', en: 'Closed' },
    adm_cal_monthly:           { tr: 'Aylık', en: 'Monthly' },
    adm_cal_trial:             { tr: 'Deneme', en: 'Trial' },
    adm_camp_active:           { tr: 'aktif', en: 'active' },
    adm_camp_active_n:         { tr: 'Aktif', en: 'Active' },
    adm_camp_add:              { tr: '+ Yeni kampanya', en: '+ New campaign' },
    adm_camp_base:             { tr: 'Saat başı liste', en: 'Hourly list price' },
    adm_camp_best:             { tr: 'en avantajlı', en: 'best value' },
    adm_camp_best_title:       { tr: 'En avantajlı olarak işaretle', en: 'Mark as best value' },
    adm_camp_col_disc:         { tr: 'İndirim', en: 'Discount' },
    adm_camp_col_hours:        { tr: 'Toplam saat', en: 'Total hours' },
    adm_camp_col_list:         { tr: 'Liste', en: 'List' },
    adm_camp_col_pay:          { tr: 'Ödenecek', en: 'To pay' },
    adm_camp_col_pkg:          { tr: 'Paket · süre', en: 'Package · duration' },
    adm_camp_col_save:         { tr: 'Kazanç', en: 'Saving' },
    adm_camp_col_status:       { tr: 'Durum', en: 'Status' },
    adm_camp_default:          { tr: 'Henüz yayınlanmadı — öğrenciler varsayılan paketleri görüyor.', en: 'Not published yet — students see the default packages.' },
    adm_camp_del:              { tr: 'kampanyayı sil', en: 'delete campaign' },
    adm_camp_desc:             { tr: 'Öğrencinin ders panelinde görünen paketler. İndirim, saat ve durum değişiklikleri aşağıdaki önizlemeye anında yansır; öğrenciler "Kampanyaları yayınla" ile görür.', en: `Packages shown on the student's lesson panel. Discount, hour and status changes show in the preview below right away; students see them after "Publish campaigns".` },
    adm_camp_dirty:            { tr: 'Yayınlanmamış değişiklik var — öğrenciler hâlâ yayındaki listeyi görüyor.', en: 'Unpublished changes — students still see the published list.' },
    adm_camp_disc_dec:         { tr: 'indirimi azalt', en: 'lower discount' },
    adm_camp_disc_inc:         { tr: 'indirimi arttır', en: 'raise discount' },
    adm_camp_empty:            { tr: 'Kampanya yok — "+ Yeni kampanya" ile ekle.', en: 'No campaigns — add one with "+ New campaign".' },
    adm_camp_hours_dec:        { tr: 'saati azalt', en: 'fewer hours' },
    adm_camp_hours_inc:        { tr: 'saati arttır', en: 'more hours' },
    adm_camp_invalid:          { tr: 'Kayıtlı belge geçersiz — öğrenciler varsayılan paketleri görüyor.', en: 'Saved document is invalid — students see the default packages.' },
    adm_camp_live:             { tr: 'Yayında', en: 'Live' },
    adm_camp_max:              { tr: 'Maks. avantaj', en: 'Max. saving' },
    adm_camp_min_hour:         { tr: 'En ucuz saat', en: 'Cheapest hour' },
    adm_camp_mon_dec:          { tr: 'ayı azalt', en: 'fewer months' },
    adm_camp_mon_inc:          { tr: 'ayı arttır', en: 'more months' },
    adm_camp_name:             { tr: 'Kampanya adı', en: 'Campaign name' },
    adm_camp_new:              { tr: 'Yeni kampanya', en: 'New campaign' },
    adm_camp_none_active:      { tr: 'Aktif kampanya yok — öğrenci yalnız tek ders seçebilir.', en: 'No active campaign — students can only pick a single lesson.' },
    adm_camp_preview:          { tr: 'Öğrenci önizlemesi', en: 'Student preview' },
    adm_camp_publish:          { tr: 'Kampanyaları yayınla', en: 'Publish campaigns' },
    adm_camp_read_err:         { tr: 'Kampanyalar okunamadı — yayınlama kapalı. Sayfayı yenile.', en: "Campaigns couldn't be loaded — publishing is off. Refresh the page." },
    adm_camp_revert:           { tr: 'Değişiklikleri geri al', en: 'Discard changes' },
    adm_camp_updated:          { tr: 'son güncelleme', en: 'last updated' },
    adm_camp_use:              { tr: 'bekleyen talep', en: 'pending requests' },
    adm_camp_use_title:        { tr: 'Bu kampanyayla gelen bekleyen talep', en: 'Pending requests made with this campaign' },
    adm_camp_weekly:           { tr: 'Haftada {n} ders saati', en: '{n} lesson hours a week' },
    adm_cancel_req:            { tr: 'İptal istendi', en: 'Cancel requested' },
    adm_checking:              { tr: 'Kontrol ediliyor…', en: 'Checking…' },
    adm_complete_all:          { tr: 'Hepsini tamamla', en: 'Complete all' },
    adm_credits:               { tr: 'Erteleme hakkı', en: 'Reschedule credits' },
    adm_custom_price:          { tr: 'Özel fiyat', en: 'Custom price' },
    adm_day_closed:            { tr: 'Kapalı gün', en: 'Closed day' },
    adm_delete:                { tr: 'Sil', en: 'Delete' },
    adm_delete_all:            { tr: 'Hepsini sil', en: 'Delete all' },
    adm_delete_plan:           { tr: 'Planı iptal et', en: 'Cancel plan' },
    adm_deleting:              { tr: 'Siliniyor…', en: 'Deleting…' },
    adm_done_lessons:          { tr: 'ders tamam', en: 'lessons done' },
    adm_edit:                  { tr: 'düzenle', en: 'edit' },
    adm_edit_price:            { tr: 'Fiyat düzenle', en: 'Edit price' },
    adm_eyebrow:               { tr: 'Ders paneli · Yönetici', en: 'Lesson panel · Admin' },
    adm_finished:              { tr: 'Paket bitti', en: 'Package done' },
    adm_finished_hidden:       { tr: 'listeden gizlendi', en: 'hidden from the list' },
    adm_finished_info:         { tr: 'öğrencinin paketi tamamlandı', en: 'students finished their package' },
    adm_free:                  { tr: 'Ücretsiz', en: 'Free' },
    adm_frozen:                { tr: 'Donduruldu', en: 'Frozen' },
    // Ders kanıtı (admin): Zoom çipi, onay rozeti, itirazlar, kanıt penceresi
    adm_cfm_disputes_aria:     { tr: `Ders itirazları`, en: `Lesson disputes` },
    adm_cfm_open:              { tr: `Onay bekliyor`, en: `Awaiting confirmation` },
    adm_cfm_confirmed:         { tr: `Onaylandı ✓`, en: `Confirmed ✓` },
    adm_cfm_disputed:          { tr: `İtiraz`, en: `Disputed` },
    adm_cfm_auto:              { tr: `Otomatik onay`, en: `Auto-confirmed` },
    adm_cfm_resolved:          { tr: `İtiraz çözüldü`, en: `Dispute resolved` },
    adm_cfm_reason:            { tr: `İtiraz`, en: `Dispute` },
    adm_cfm_note:              { tr: `Çözüm notu`, en: `Resolution note` },
    adm_cfm_resolve:           { tr: `Çözüldü olarak işaretle`, en: `Mark as resolved` },
    adm_cfm_resolve_short:     { tr: `Çözüldü`, en: `Resolved` },
    adm_cfm_resolve_q:         { tr: `İtiraz çözüldü — not (isteğe bağlı)`, en: `Dispute resolved — note (optional)` },
    adm_cfm_resolve_ph:        { tr: `Ör. Zoom kaydı paylaşıldı, ders yapılmış.`, en: `E.g. Zoom record shared, lesson took place.` },
    adm_cfm_resolved_toast:    { tr: `İtiraz çözüldü olarak işaretlendi.`, en: `Dispute marked as resolved.` },
    adm_cfm_already:           { tr: `Bu itiraz zaten kapatılmış.`, en: `This dispute is already closed.` },
    adm_cfm_nores:             { tr: `Rezervasyon bulunamadı.`, en: `Reservation not found.` },
    adm_cfm_open_stu:          { tr: `Öğrenciyi aç`, en: `Open student` },
    adm_att_ok:                { tr: `Zoom {n} dk ✓`, en: `Zoom {n} min ✓` },
    adm_att_absent:            { tr: `Zoom: yok`, en: `Zoom: absent` },
    adm_att_unavail:           { tr: `Zoom kaydı alınamadı`, en: `Zoom record unavailable` },
    adm_att_wait:              { tr: `Zoom: bekliyor`, en: `Zoom: pending` },
    adm_att_none:              { tr: `Zoom: kayıt yok`, en: `Zoom: no record` },
    adm_att_r_scope:           { tr: `Zoom uygulamasında rapor izni (scope) yok`, en: `Zoom app lacks report scopes` },
    adm_att_r_plan:            { tr: `Zoom raporları ücretli plan ister ya da izin yok`, en: `Zoom reports need a paid plan or permission` },
    adm_att_r_cred:            { tr: `Zoom bilgileri tanımlı değil`, en: `Zoom credentials not set` },
    adm_att_r_token:           { tr: `Zoom erişim anahtarı alınamadı`, en: `Could not get a Zoom access token` },
    adm_att_r_auth:            { tr: `Zoom yetkilendirme hatası`, en: `Zoom authorization error` },
    adm_att_r_rate:            { tr: `Zoom istek sınırı aşıldı`, en: `Zoom rate limit reached` },
    adm_att_r_host:            { tr: `Zoom kullanıcısı bulunamadı`, en: `Zoom user not found` },
    adm_att_r_nomeet:          { tr: `Bu saatte Zoom toplantısı yok`, en: `No Zoom meeting at this time` },
    adm_att_r_nostu:           { tr: `Öğrenci toplantıda görünmüyor`, en: `Student not found in the meeting` },
    adm_att_m_email:           { tr: `e-posta`, en: `email` },
    adm_att_m_exact:           { tr: `isim (tam)`, en: `name (exact)` },
    adm_att_m_partial:         { tr: `isim (kısmi)`, en: `name (partial)` },
    adm_att_m_fuzzy:           { tr: `isim (benzer)`, en: `name (similar)` },
    adm_att_m_sole:            { tr: `tek katılımcı`, en: `only participant` },
    adm_ev_title:              { tr: `Zoom katılım kaydı`, en: `Zoom attendance record` },
    adm_ev_btn:                { tr: `Zoom kaydı`, en: `Zoom record` },
    adm_ev_status:             { tr: `Durum`, en: `Status` },
    adm_ev_minutes:            { tr: `Süre`, en: `Duration` },
    adm_ev_student:            { tr: `Öğrenci`, en: `Student` },
    adm_ev_host:               { tr: `Eğitmen`, en: `Host` },
    adm_ev_meeting:            { tr: `Toplantı`, en: `Meeting` },
    adm_ev_cfm:                { tr: `Öğrenci kararı`, en: `Student decision` },
    adm_ev_fetched:            { tr: `Son kontrol`, en: `Last checked` },
    adm_ev_name:               { tr: `Ad`, en: `Name` },
    adm_ev_email:              { tr: `E-posta`, en: `Email` },
    adm_ev_join:               { tr: `Giriş`, en: `Join` },
    adm_ev_leave:              { tr: `Çıkış`, en: `Leave` },
    adm_ev_dur:                { tr: `Dk`, en: `Min` },
    adm_ev_noparts:            { tr: `Katılımcı listesi yok.`, en: `No participant list.` },
    adm_h1_a:                  { tr: 'Admin', en: 'Admin' },
    adm_h1_b:                  { tr: 'paneli', en: 'panel' },
    adm_hide:                  { tr: 'Gizle', en: 'Hide' },
    adm_home_aria:             { tr: 'Berkay Er Academy — ana sayfa', en: 'Berkay Er Academy — home' },
    adm_hour_cap:              { tr: 'saat', en: 'hour' },
    adm_hours_lc:              { tr: 'saat', en: 'hours' },
    adm_last_reminder:         { tr: 'Son hatırlatma', en: 'Last reminder' },
    adm_left:                  { tr: 'kalan', en: 'left' },
    adm_lesson_opts:           { tr: 'ders seçenekleri', en: 'lesson options' },
    adm_lessons_lc:            { tr: 'ders', en: 'lessons' },
    adm_level:                 { tr: 'Seviye', en: 'Level' },
    adm_mail:                  { tr: 'Mail at', en: 'Send email' },
    adm_manage_credits:        { tr: 'Erteleme haklarını yönet', en: 'Manage reschedule credits' },
    adm_mark_paid:             { tr: 'Ödeme alındı olarak işaretle', en: 'Mark payment received' },
    adm_month_aria:            { tr: 'İstatistik ayı', en: 'Statistics month' },
    adm_month_cap:             { tr: 'Ay', en: 'Mo' },
    adm_month_next:            { tr: 'Sonraki ay', en: 'Next month' },
    adm_month_pkg:             { tr: 'aylık paket', en: 'month package' },
    adm_month_prev:            { tr: 'Önceki ay', en: 'Previous month' },
    adm_month_short:           { tr: 'ay', en: 'mo' },
    adm_nav_avail:             { tr: 'Müsaitlik', en: 'Availability' },
    adm_nav_calendar:          { tr: 'Haftalık takvim', en: 'Weekly calendar' },
    adm_nav_campaigns:         { tr: 'Kampanyalar', en: 'Campaigns' },
    adm_nav_contact:           { tr: 'E-posta & duyurular', en: 'Email & announcements' },
    adm_nav_manage:            { tr: 'Yönetim', en: 'Manage' },
    adm_nav_messages:          { tr: 'WhatsApp & sorular', en: 'WhatsApp & questions' },
    adm_nav_requests:          { tr: 'Gelen talepler', en: 'Incoming requests' },
    adm_nav_site:              { tr: 'Site', en: 'Site' },
    adm_nav_student_view:      { tr: 'Öğrenci görünümü', en: 'Student view' },
    adm_nav_students:          { tr: 'Aktif öğrenciler', en: 'Active students' },
    adm_nav_summary:           { tr: 'Özet', en: 'Overview' },
    adm_no_lesson:             { tr: 'Ders yok', en: 'No lessons' },
    adm_no_phone:              { tr: 'Numara yok', en: 'No number' },
    adm_no_upcoming:           { tr: 'Yaklaşan ders yok.', en: 'No upcoming lessons.' },
    adm_note:                  { tr: 'Not', en: 'Note' },
    adm_note_save:             { tr: 'Notu kaydet', en: 'Save note' },
    adm_paid:                  { tr: 'Ödendi', en: 'Paid' },
    adm_paid_undo:             { tr: 'Ödendi · geri al', en: 'Paid · undo' },
    adm_pay_pending_note:      { tr: 'Öğrenci ödediğini bildirdi — onay bekliyor.', en: 'Student reported payment — awaiting confirmation.' },
    adm_per_lesson:            { tr: 'ders', en: 'lesson' },
    adm_pkg_inactive:          { tr: 'Kampanya pasif — liste fiyatı', en: 'Campaign inactive — list price' },
    adm_pkg_mismatch:          { tr: 'Paket uyuşmuyor — liste fiyatı', en: 'Package mismatch — list price' },
    adm_pkg_removed:           { tr: 'Kampanya kaldırılmış — liste fiyatı', en: 'Campaign removed — list price' },
    adm_pkg_unknown:           { tr: 'Kampanya bulunamadı — liste fiyatı', en: 'Campaign not found — list price' },
    adm_prev_dirty:            { tr: 'Önizleme yayındaki kampanyaları gösterir — değişikliklerin henüz yayınlanmadı.', en: "The preview shows the published campaigns — your changes aren't published yet." },
    adm_prev_exit:             { tr: 'Admin paneline dön', en: 'Back to admin panel' },
    adm_prev_nosubmit:         { tr: 'Önizleme: admin olarak talep gönderilemez.', en: "Preview: requests can't be sent as admin." },
    adm_prev_text:             { tr: 'Öğrenci görünümü · önizleme — buradan talep gönderilemez.', en: "Student view · preview — requests can't be sent from here." },
    adm_price_monthly:         { tr: 'Aylık · saat başı', en: 'Monthly · per hour' },
    adm_price_note:            { tr: 'Liste fiyatları sabittir; kampanya indirimleri bu saat ücretinden hesaplanır.', en: 'List prices are fixed; campaign discounts are calculated from this hourly rate.' },
    adm_price_single:          { tr: 'Tek ders', en: 'Single lesson' },
    adm_price_title:           { tr: 'Ders başı ücret (TL)', en: 'Price per lesson (TL)' },
    adm_private_note:          { tr: 'Özel not · sadece sen görürsün', en: 'Private note · only you see this' },
    adm_private_note_ph:       { tr: 'Bu öğrenci için not ekle…', en: 'Add a note for this student…' },
    adm_promo_desc:            { tr: 'Siteye kayıtlı, henüz ders almayan tüm üyelere ders tanıtım maili gönder.', en: "Send a lesson promo email to all registered members who aren't taking lessons yet." },
    adm_promo_send:            { tr: 'Tüm üyelere gönder', en: 'Send to all members' },
    adm_promo_title:           { tr: 'Tanıtım maili', en: 'Promo email' },
    adm_ps_empty:              { tr: 'Bu ay ders ya da onaylı ödeme yok.', en: 'No lessons or confirmed payments this month.' },
    adm_ps_month:              { tr: 'Bu ay', en: 'This month' },
    adm_ps_total:              { tr: 'Toplam', en: 'Total' },
    adm_publishing:            { tr: 'Yayınlanıyor…', en: 'Publishing…' },
    adm_qa_desc:               { tr: 'Öğrencilerin sorduğu sorular. Yanıtla ya da "Çözüldü" olarak işaretle.', en: 'Questions from students. Reply or mark them "Solved".' },
    adm_qa_empty:              { tr: 'Henüz soru yok.', en: 'No questions yet.' },
    adm_qa_err:                { tr: 'Sorular yüklenemedi.', en: "Questions couldn't be loaded." },
    adm_qa_mark_solved:        { tr: 'Çözüldü', en: 'Solved' },
    adm_qa_no_answer:          { tr: 'Henüz yanıt yok.', en: 'No replies yet.' },
    adm_qa_none_open:          { tr: 'Açık soru yok.', en: 'No open questions.' },
    adm_qa_open:               { tr: 'açık', en: 'open' },
    adm_qa_open_cap:           { tr: 'Açık', en: 'Open' },
    adm_qa_open_q:             { tr: 'açık soru', en: 'open questions' },
    adm_qa_reopen:             { tr: 'Yeniden aç', en: 'Reopen' },
    adm_qa_reply:              { tr: 'Yanıtla', en: 'Reply' },
    adm_qa_reply_label:        { tr: 'Cevap', en: 'Reply' },
    adm_qa_reply_ph:           { tr: 'Cevap yaz…', en: 'Write a reply…' },
    adm_qa_send:               { tr: 'Yanıtla', en: 'Reply' },
    adm_qa_solved:             { tr: 'Çözüldü', en: 'Solved' },
    adm_qa_solved_list:        { tr: 'Çözülmüş sorular', en: 'Solved questions' },
    adm_qa_title:              { tr: 'Öğrenci soruları', en: 'Student questions' },
    adm_range:                 { tr: 'Tarih aralığı', en: 'Date range' },
    adm_reject:                { tr: 'Reddet', en: 'Reject' },
    adm_rem_custom:            { tr: 'Kişiye özel', en: 'Custom email' },
    adm_rem_desc:              { tr: "Ödeme yapmamış, yaklaşan dersi olan öğrenciler. Her gün 06:00'da otomatik gönderilir; buradan hemen de gönderebilirsin.", en: "Students who haven't paid and have an upcoming lesson. Sent automatically every day at 06:00; you can also send now." },
    adm_rem_next:              { tr: 'Sonraki', en: 'Next' },
    adm_rem_none:              { tr: 'Ödeme bekleyen öğrenci yok.', en: 'No students awaiting payment.' },
    adm_rem_send_now:          { tr: 'Şimdi manuel gönder', en: 'Send now' },
    adm_rem_students:          { tr: 'öğrenci', en: 'students' },
    adm_rem_title:             { tr: 'E-posta hatırlatmaları', en: 'Email reminders' },
    adm_rem_welcome:           { tr: 'Hoşgeldin', en: 'Welcome' },
    adm_req_hint:              { tr: 'Onay → takvime işlenir + WhatsApp', en: 'Approve → added to calendar + WhatsApp' },
    adm_req_title:             { tr: 'Gelen talepler', en: 'Incoming requests' },
    adm_rev_label:             { tr: 'Aylık gelir', en: 'Monthly revenue' },
    adm_rev_paid:              { tr: 'öğrenci · ödeme onaylı', en: 'students · payment confirmed' },
    adm_rev_pending:           { tr: 'beklemede', en: 'pending' },
    adm_role:                  { tr: 'Admin', en: 'Admin' },
    adm_rq_cancel:             { tr: 'İptal talebi', en: 'Cancellation request' },
    adm_rq_cancel_ok:          { tr: 'İptali onayla', en: 'Confirm cancellation' },
    adm_rq_extra:              { tr: 'Ek ders talebi', en: 'Extra lesson request' },
    adm_rq_paid_ok:            { tr: 'Ödendi onayla', en: 'Confirm paid' },
    adm_rq_payment:            { tr: 'Ödeme talebi', en: 'Payment request' },
    adm_rq_resched:            { tr: 'Erteleme talebi', en: 'Reschedule request' },
    adm_rq_resched_ok:         { tr: 'Onayla & ertele', en: 'Approve & reschedule' },
    adm_rq_trial:              { tr: 'Deneme dersi', en: 'Trial lesson' },
    adm_save:                  { tr: 'Kaydet', en: 'Save' },
    adm_saved:                 { tr: 'Kaydedildi', en: 'Saved' },
    adm_saving:                { tr: 'Kaydediliyor…', en: 'Saving…' },
    adm_select:                { tr: 'seç', en: 'select' },
    adm_select_all:            { tr: 'Tümünü seç', en: 'Select all' },
    adm_select_none:           { tr: 'Seçimi kaldır', en: 'Clear selection' },
    adm_selected:              { tr: 'seçili', en: 'selected' },
    adm_selected_cap:          { tr: 'Seçili', en: 'Selected' },
    adm_send:                  { tr: 'Gönder', en: 'Send' },
    adm_sending:               { tr: 'Gönderiliyor…', en: 'Sending…' },
    adm_show:                  { tr: 'Göster', en: 'Show' },
    adm_side_aria:             { tr: 'Yönetim menüsü', en: 'Admin menu' },
    adm_stat_active_lc:        { tr: 'aktif öğrenci', en: 'active students' },
    adm_stat_active_students:  { tr: 'Aktif öğrenci', en: 'Active students' },
    adm_stat_lessons:          { tr: 'Bu ay ders', en: 'Lessons this month' },
    adm_stat_pending_pay:      { tr: 'Bekleyen talep · ödeme', en: 'Pending requests · payments' },
    adm_stat_pending_req:      { tr: 'Bekleyen talep', en: 'Pending requests' },
    adm_stat_per_student:      { tr: 'Öğrenci bazında', en: 'By student' },
    adm_stat_unpaid:           { tr: 'Ödeme bekliyor', en: 'Awaiting payment' },
    adm_stats_aria:            { tr: 'Aylık istatistikler', en: 'Monthly statistics' },
    adm_stu_err:               { tr: 'Öğrenciler yüklenemedi', en: "Students couldn't be loaded" },
    adm_stu_hint:              { tr: 'Satıra tıkla → detay', en: 'Click a row → details' },
    adm_student_note:          { tr: 'Öğrenci notu', en: 'Student note' },
    adm_tab_calendar:          { tr: 'Takvim', en: 'Calendar' },
    adm_tab_messages:          { tr: 'Mesajlar', en: 'Messages' },
    adm_tab_requests:          { tr: 'Talepler', en: 'Requests' },
    adm_tab_students:          { tr: 'Öğrenciler', en: 'Students' },
    adm_tabs_aria:             { tr: 'Bölümler', en: 'Sections' },
    adm_trial_free:            { tr: 'Deneme · ücretsiz', en: 'Trial · free' },
    adm_unpaid:                { tr: 'Ödenmedi', en: 'Unpaid' },
    adm_upcoming_month:        { tr: 'Yaklaşan · bu ay', en: 'Upcoming · this month' },
    adm_wa_back:               { tr: 'Sohbet listesine dön', en: 'Back to conversations' },
    adm_wa_empty:              { tr: 'Henüz mesaj yok.', en: 'No messages yet.' },
    adm_wa_hint:               { tr: '24 saat kuralı: öğrenci son 24 saatte yazmadıysa serbest metin reddedilir. Enter gönderir, Shift+Enter yeni satır.', en: "24-hour rule: free text is rejected if the student hasn't written in the last 24 hours. Enter sends, Shift+Enter adds a line." },
    adm_wa_msg_label:          { tr: 'Mesaj', en: 'Message' },
    adm_wa_no_msg:             { tr: 'Mesaj yok.', en: 'No messages.' },
    adm_wa_pick:               { tr: 'Sohbet seçin', en: 'Select a conversation' },
    adm_wa_placeholder:        { tr: 'Mesaj yaz…', en: 'Write a message…' },
    adm_wait:                  { tr: 'Lütfen bekleyin…', en: 'Please wait…' },
    adm_week_next:             { tr: 'Sonraki hafta', en: 'Next week' },
    adm_week_prev:             { tr: 'Önceki hafta', en: 'Previous week' },
    adm_working:               { tr: 'İşleniyor…', en: 'Working…' },
    adm_zoom_active:           { tr: 'Aktif', en: 'Active' },
    adm_zoom_create:           { tr: 'Oluştur', en: 'Create' },
    adm_zoom_join:             { tr: 'Toplantıya katıl', en: 'Join meeting' },
    adm_zoom_title:            { tr: 'Zoom linki', en: 'Zoom link' },
    bk_no_students:            { tr: 'Henüz öğrenci yok.', en: 'No students yet.' },


    // ── Yeni tasarım: sonradan eklenen anahtarlar ──
    lab_hero_lead_m: { tr: `Derslerde öğrendiklerini telefonunda dene. Derse başlamadan önce Lab'ı tamamla.`, en: 'Try what you learn in lessons on your phone. Finish the Lab before your first lesson.' },   // ableton-lab.json
    lab_cards_aria: { tr: 'Önizleme kartı seç', en: 'Choose a preview card' },   // ableton-lab.json
    lab_min: { tr: 'dk', en: 'min' },   // ableton-lab.json
    lab_desc_1: { tr: `Sıfırdan ses üret: oscillator'lar, ADSR envelope, filter, presetler.`, en: 'Generate sound from scratch: oscillators, ADSR envelope, filters, presets.' },   // ableton-lab.json
    lab_desc_2: { tr: 'Step sequencer; velocity, swing ve tür şablonları.', en: 'Step sequencer with velocity, swing, and genre templates.' },   // ableton-lab.json
    lab_desc_3: { tr: 'EQ eğrileri, mixer stripleri, pan, stereo field.', en: 'EQ curves, channel strips, panning, stereo field.' },   // ableton-lab.json
    lab_desc_4: { tr: 'Şarkı yapısı: intro, build, drop, chorus — örüntüleri seç.', en: 'Song structure: intro, build, drop, chorus — pick the patterns.' },   // ableton-lab.json
    lab_desc_5: { tr: 'Master zinciri: EQ → Glue → Multiband → Limiter. Sık hatalar.', en: 'Master chain: EQ → Glue → Multiband → Limiter. Common mistakes.' },   // ableton-lab.json
    lab_celeb_eyebrow: { tr: 'Rozet Kazanıldı', en: 'Badge earned' },   // ableton-lab.json
    lab_celeb_title: { tr: 'Modül Tamamlandı!', en: 'Module complete!' },   // ableton-lab.json
    lab_celeb_p: { tr: 'Tebrikler!', en: 'Congratulations!' },   // ableton-lab.json
    lab_celeb_ok: { tr: 'Harika!', en: 'Great!' },   // ableton-lab.json
    adm_pt_pending: { tr: 'Sınav bekleniyor', en: 'Test pending' },   // booking-admin.json
    adm_pt_pending_title: { tr: 'Seviye belirleme sınavı henüz çözülmedi', en: 'The placement test has not been taken yet' },   // booking-admin.json
    adm_pt_detail_title: { tr: 'Detay için tıkla', en: 'Click for details' },   // booking-admin.json
    adm_pt_detail_aria: { tr: 'seviye sınavı detayı', en: 'placement test details' },   // booking-admin.json
    adm_pay_nores: { tr: 'Rezervasyon yok', en: 'No reservation' },   // booking-admin.json
    adm_pay_match: { tr: 'rezervasyonla aynı', en: 'matches the reservation' },   // booking-admin.json
    adm_pay_mismatch: { tr: 'Rezervasyon: {price} — tutar uyuşmuyor', en: 'Reservation: {price} — amount does not match' },   // booking-admin.json
    adm_rev_paid_one: { tr: 'öğrenci · ödeme onaylı', en: 'student · payment confirmed' },   // booking-admin.json
    adm_lesson_lc_one: { tr: 'ders', en: 'lesson' },   // booking-admin.json
    bks_rules_ack: { tr: 'Okudum, onaylıyorum', en: 'I have read and accept' },   // booking-ogrenci.json
    bks_rules_modal_title: { tr: 'Ders Kuralları — Onay Gerekli', en: 'Lesson rules — confirmation required' },   // booking-ogrenci.json
    bks_rules_modal_body: { tr: `Talebin gönderilmeden önce her kuralı okuyup yanındaki kutuyu işaretle.`, en: `Before your request is sent, read each rule and tick the box next to it.` },   // booking-ogrenci.json
    bks_rules_progress: { tr: '{n}/{m} onaylandı', en: '{n}/{m} confirmed' },   // booking-ogrenci.json
    bks_rules_missing: { tr: 'Eksik onay: {list}', en: 'Not confirmed yet: {list}' },   // booking-ogrenci.json
    bks_rules_accept: { tr: 'Onaylıyorum ve devam et', en: 'I accept, continue' },   // booking-ogrenci.json
    bks_rc_reschedule: { tr: `Paketin kaç aylıksa o kadar erteleme hakkın olur (1 ay = 1 hak, 3 ay = 3 hak); hakları paket süresince istediğin derste kullanabilirsin. Berkay Er erteleme talebini onaylayınca 1 hak düşer. Aynı hafta içinde saat değiştirmek ücretsizdir. Ek hak <strong class="text-accent">500 TL</strong>.`, en: `You get as many reschedule credits as your package has months (1 month = 1, 3 months = 3); use them on any lesson during the package. A credit is used when Berkay Er approves a reschedule. Changing the time within the same week is free. Extra credits cost <strong class="text-accent">500 TL</strong>.` },   // booking-ogrenci.json
    bks_rc_notice: { tr: `Erteleme en az 24 saat önceden talep edilir; ders 1 hafta ileri alınır.`, en: `A reschedule must be requested at least 24 hours ahead; the lesson moves one week later.` },   // booking-ogrenci.json
    bks_rc_limit: { tr: `Kullanılmayan haklar paket bitince sona erer.`, en: `Unused credits expire when the package ends.` },   // booking-ogrenci.json
    bks_rc_late: { tr: '10 dakika içinde girilmezse ders yapılmış sayılır.', en: 'If you do not join within 10 minutes, the lesson counts as held.' },   // booking-ogrenci.json
    bks_rc_absence: { tr: `Haber vermeden katılmazsan ders yapılmış sayılır, yeniden planlanmaz.`, en: `If you miss a lesson without notice, it counts as held and is not rescheduled.` },   // booking-ogrenci.json
    bks_rc_copyright: { tr: `<strong class="text-accent">Berkay Er'in</strong> derste paylaştığı ve yaptığı parçalar/içerikler kendisine aittir; hiçbir şekilde paylaşılamaz veya dağıtılamaz.`, en: 'Tracks and content that <strong class="text-accent">Berkay Er</strong> shares and makes in lessons belong to him; they may not be shared or distributed in any way.' },   // booking-ogrenci.json
    bks_rc_cancel: { tr: 'Alınan dersler iptal edilemez, başka kişiye devredilemez.', en: 'Purchased lessons cannot be cancelled or transferred to another person.' },   // booking-ogrenci.json
    bks_ec_title: { tr: 'Ek Erteleme Hakkı Al', en: 'Buy extra reschedule credits' },   // booking-ogrenci.json
    bks_ec_body_html: { tr: `Almak istediğin hak sayısını seç. Her ek hak <strong class="text-accent">500 TL</strong>. Ödeme sonrası WhatsApp'tan bildirince hakkın hesabına tanımlanır.`, en: 'Choose how many credits you want. Each extra credit is <strong class="text-accent">500 TL</strong>. Once you pay and let us know on WhatsApp, the credit is added to your account.' },   // booking-ogrenci.json
    bks_ec_qty: { tr: 'Adet', en: 'Quantity' },   // booking-ogrenci.json
    bks_ec_total: { tr: 'Toplam Tutar', en: 'Total' },   // booking-ogrenci.json
    bks_ec_fee: { tr: 'Erteleme hakkı bedeli', en: 'Reschedule credit fee' },   // booking-ogrenci.json
    bks_ec_wa: { tr: 'Ödedim — WhatsApp ile bildir', en: 'I paid — notify on WhatsApp' },   // booking-ogrenci.json
    bks_phone_fmt: { tr: 'TR: 05XX XXX XX XX · Yurt dışı: + ile başlayan numara (örn: +1 617 388 4403)', en: 'TR: 05XX XXX XX XX · Abroad: a number starting with + (e.g. +1 617 388 4403)' },   // booking-ogrenci.json
    bks_phone_err: { tr: 'Geçerli bir cep telefonu numarası gir ({help}).', en: 'Enter a valid mobile number ({help}).' },   // booking-ogrenci.json
    bks_phone_invalid: { tr: 'Geçersiz numara.', en: 'Invalid number.' },   // booking-ogrenci.json
    bks_wa_saved_title: { tr: 'Numaran kaydedildi', en: 'Your number is saved' },   // booking-ogrenci.json
    bks_wa_saved_body_html: { tr: `Şimdi WhatsApp'tan bize bir kez mesaj at ki <strong>hatırlatma botumuz</strong> sana mesaj yollayabilsin (WhatsApp kuralı gereği).<br><br>Aşağıdaki butona bas → WhatsApp açılır → hazır metni gönder, hepsi bu.`, en: 'Now send us one WhatsApp message so <strong>our reminder bot</strong> can write to you (a WhatsApp rule).<br><br>Tap the button below → WhatsApp opens → send the prepared text, that’s it.' },   // booking-ogrenci.json
    bks_wa_saved_open: { tr: `WhatsApp'ı aç ve mesaj at`, en: 'Open WhatsApp and send' },   // booking-ogrenci.json
    bks_wa_saved_later: { tr: 'Daha sonra hatırlat', en: 'Remind me later' },   // booking-ogrenci.json
    bks_credit_title: { tr: 'Erteleme Hakkı', en: 'Reschedule credits' },   // booking-ogrenci.json
    bks_credit_left_html: { tr: '<strong class="text-ok">{n} hak</strong> kaldı', en: '<strong class="text-ok">{n} left</strong>' },   // booking-ogrenci.json
    bks_credit_none_html: { tr: '<strong class="text-err">hak kalmadı</strong>', en: '<strong class="text-err">none left</strong>' },   // booking-ogrenci.json
    bks_credit_pkg_html: { tr: `Paketin: <strong>{m} aylık</strong> → toplam <strong>{m} erteleme hakkı</strong> · Kalan: <strong class="{cls}">{n}</strong>`, en: `Your package: <strong>{m}-month</strong> → reschedule credits in total: <strong>{m}</strong> · Left: <strong class="{cls}">{n}</strong>` },   // booking-ogrenci.json
    bks_credit_note_html: { tr: 'Hak paket bazlıdır — derslerin sonraki aya sarkması hakkını değiştirmez. Toplam ders: <strong>{n}</strong>.', en: 'Credits are per package — lessons spilling into the next month do not change them. Total lessons: <strong>{n}</strong>.' },   // booking-ogrenci.json
    bks_credit_buy: { tr: '+ Ek Hak Al (500 TL)', en: '+ Buy extra credit (500 TL)' },   // booking-ogrenci.json
    bks_wa_first_title: { tr: 'Önemli — WhatsApp iletişimini sen başlatmalısın', en: 'Important — you need to start the WhatsApp chat' },   // booking-ogrenci.json
    bks_wa_first_desc_html: { tr: 'Sana <strong>WhatsApp üzerinden</strong> dönüş yapılacak. Ancak WhatsApp politikası gereği <strong class="be-accent">önce senin kısa bir mesaj atman gerekiyor</strong> — aksi halde sana cevap yazılamıyor. Aşağıdaki butona basarak hazır metni gönder, 1 saniyede halledersin.', en: 'We will get back to you <strong>on WhatsApp</strong>. But WhatsApp policy requires <strong class="be-accent">you to send a short message first</strong> — otherwise we cannot reply to you. Tap the button below to send the prepared text; it takes a second.' },   // booking-ogrenci.json
    bks_wa_first_btn: { tr: 'WhatsApp ile mesaj at', en: 'Message on WhatsApp' },   // booking-ogrenci.json
    bks_wa_first_hint: { tr: 'Buton tıklanınca WhatsApp açılır, mesaj hazır. Sadece "Gönder"e basman yeterli.', en: 'The button opens WhatsApp with the message ready. Just tap "Send".' },   // booking-ogrenci.json
    bks_trial_phone_err: { tr: 'Geçerli bir cep telefonu numarası gir (TR: 05XX XXX XX XX · Uluslararası: +ülke kodu ile başlat, örn +1 617 388 4403).', en: 'Enter a valid mobile number (TR: 05XX XXX XX XX · International: start with + and the country code, e.g. +1 617 388 4403).' },   // booking-ogrenci.json
    bks_strip_cheapest: { tr: 'En ucuz saat başı', en: 'Lowest hourly rate' },   // booking-ogrenci.json
    idx2_reviews_more: { tr: 'Tümünü gör', en: 'See all' },   // index.json
    bks_start_help: { tr: `Boş bırakırsan en yakın uygun haftadan başlar.`, en: `Leave it empty to start from the nearest available week.` },   // booking-ogrenci (başlangıç dostu)
    bks_rules_back: { tr: `Geri dön, talebimi düzenle`, en: `Go back and edit my request` },   // booking-ogrenci (başlangıç dostu)
    bk_pt_later_hint: { tr: `Tamam — sınav kartı bu sayfada duruyor, hazır olunca çöz.`, en: `OK — the test card stays on this page; take it when you’re ready.` },   // booking-ogrenci (başlangıç dostu)
    bk_pt_later_btn: { tr: `Daha sonra çözeceğim`, en: `I’ll take it later` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_lock_closed: { tr: `Saat değişikliği kapandı`, en: `Time change closed` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_badge_near: { tr: `Yaklaşıyor`, en: `Coming up` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_badge_join: { tr: `Başlıyor`, en: `Starting` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_badge_live: { tr: `Ders sürüyor`, en: `In progress` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_live: { tr: `Ders şu an sürüyor`, en: `The lesson is on now` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_join_soon: { tr: `Derse Katıl · 15 dk önce açılır`, en: `Join · opens 15 min before` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_join_unpaid: { tr: `Derse katılmak için ödeme onayı gerekli`, en: `Payment must be confirmed to join` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_join_nolink: { tr: `Zoom bağlantısı bekleniyor`, en: `Waiting for the Zoom link` },   // booking-ogrenci (başlangıç dostu)
    bk_wk_btn_resched: { tr: `Erteleme talebin bekliyor — saat değiştirilemez`, en: `Reschedule pending — time can’t be changed` },   // booking-ogrenci (başlangıç dostu)
    bk_sc_err_net: { tr: `Bağlantı sorunu — saat değiştirilemedi. Seçimin duruyor, tekrar dene.`, en: `Connection problem — the time wasn’t changed. Your pick is kept; try again.` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_why_24h: { tr: `Derse 24 saatten az kaldı`, en: `Less than 24 hours to go` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_why_pending: { tr: `Hakkın bekleyen talepte`, en: `Your credit is in a pending request` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_why_none: { tr: `Erteleme hakkın kalmadı`, en: `No reschedule credits left` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_hint_pending: { tr: `Erteleme hakkın bekleyen talepte — Berkay Er yanıtlayınca yeniden erteleyebilirsin.`, en: `Your reschedule credit is in a pending request — you can reschedule again after Berkay Er replies.` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_hint_none: { tr: `Erteleme hakkın kalmadı. Aynı hafta içinde saati yine ücretsiz değiştirebilirsin.`, en: `You have no reschedule credits left. You can still change the time within the same week for free.` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_uses: { tr: `Bu talep onaylanınca <strong>1 erteleme hakkı</strong> kullanılır (kalan: {a} → {b}).`, en: `Once approved, this uses <strong>1 reschedule credit</strong> (left: {a} → {b}).` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_cascade: { tr: `Yeni tarihte zaten bir dersin var; bu yüzden {n} dersin daha birer hafta ileri kayar.`, en: `You already have a lesson on the new date, so {n} more of your lessons move one week later too.` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_end: { tr: `Paketinin son dersi {old} yerine <strong>{new}</strong> olur.`, en: `Your package’s last lesson becomes <strong>{new}</strong> instead of {old}.` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_taken: { tr: `Bu saat takvimde dolu görünüyor; talebini yine gönderebilirsin, Berkay Er onaylarken uygun çözümü bulur.`, en: `This time looks taken; you can still send the request — Berkay Er will sort it out when approving.` },   // booking-ogrenci (başlangıç dostu)
    bk_resch_err: { tr: `Erteleme talebi gönderilemedi`, en: `Couldn’t send the reschedule request` },   // booking-ogrenci (başlangıç dostu)
    bk_pay_confirm_body: { tr: `Berkay Er’e ödeme bildirimi gider; o havaleyi kontrol edip onaylar. Henüz ödemediysen önce havaleyi yap.`, en: `Berkay Er gets a payment notice and checks the transfer. If you haven’t paid yet, make the transfer first.` },   // booking-ogrenci (başlangıç dostu)
    bk_pay_confirm_ok: { tr: `Evet, ödemeyi yaptım`, en: `Yes, I’ve paid` },   // booking-ogrenci (başlangıç dostu)
    bk_pay_copied: { tr: `Kopyalandı ✓`, en: `Copied ✓` },   // booking-ogrenci (başlangıç dostu)
    bk_zoom_chip_pending: { tr: `Derse Katıl · ödeme onayı bekleniyor`, en: `Join · payment approval pending` },   // booking-ogrenci (başlangıç dostu)
    bk_zoom_chip_unpaid: { tr: `Derse Katıl · ödeme onaylanınca açılır`, en: `Join · opens once payment is confirmed` },   // booking-ogrenci (başlangıç dostu)
    bk_zoom_opens_at: { tr: `{when} · 15 dk önce açılır`, en: `{when} · opens 15 min before` },   // booking-ogrenci (başlangıç dostu)
    bk_today: { tr: `Bugün`, en: `Today` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_kicker: { tr: `Yapman gereken`, en: `Your next step` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_title: { tr: `Ödemeni yap, derslerin açılsın`, en: `Make your payment to unlock your lessons` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_pending_title: { tr: `Ödeme bildirimin alındı`, en: `We got your payment notice` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_pending_body: { tr: `Berkay Er havaleyi kontrol edip onaylayacak (genelde 24 saat içinde). Onaylanınca bu kart kaybolur; derse katılma, saat değiştirme ve erteleme açılır.`, en: `Berkay Er will check the transfer and confirm it (usually within 24 hours). Then this card disappears and joining, changing and rescheduling lessons open up.` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_s1: { tr: `Aşağıdaki IBAN’a {total} havale et.`, en: `Transfer {total} to the IBAN below.` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_bank_again: { tr: `Ödeme bilgilerini tekrar gör`, en: `Show payment details again` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_s2: { tr: `Havaleyi yaptıktan sonra bu düğmeye bas:`, en: `After the transfer, press this button:` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_s2_done: { tr: `"Ödemeyi yaptım" dedin — bildirim Berkay Er’e gitti.`, en: `You pressed "I’ve paid" — Berkay Er has been notified.` },   // booking-ogrenci (başlangıç dostu)
    bks_todo_s3: { tr: `Berkay Er ödemeyi onaylayınca derse katılma, saat değiştirme ve erteleme açılır.`, en: `Once Berkay Er confirms the payment, joining, changing and rescheduling lessons open up.` },   // booking-ogrenci (başlangıç dostu)
    bk_lesson_one: { tr: `ders`, en: `lesson` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_pend_html: { tr: `<strong class="{cls}">{n} hak</strong> · {p} tanesi bekleyen talepte`, en: `<strong class="{cls}">{n} left</strong> · {p} in a pending request` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_pend_line: { tr: `Bekleyen erteleme talebin: {p} — Berkay Er onaylayınca haktan düşer.`, en: `Pending reschedule requests: {p} — a credit is used once Berkay Er approves.` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_howto_html: { tr: `Kullanmak için ders satırındaki <strong>Ertele</strong>’ye bas (en az 24 saat önce). Ders 1 hafta ileri alınır; Berkay Er onaylayınca 1 hak düşer. Aynı hafta içinde saat değiştirmek ücretsizdir.`, en: `To use one, press <strong>Reschedule</strong> on a lesson row (at least 24 hours ahead). The lesson moves one week later and 1 credit is used once Berkay Er approves. Changing the time within the same week is free.` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_hist: { tr: `Geçmiş`, en: `History` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_h_used: { tr: `Kullanıldı: {date} dersi ertelendi`, en: `Used: the {date} lesson was rescheduled` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_h_revoked: { tr: `Berkay Er tarafından {n} hak sonlandırıldı ({at})`, en: `Berkay Er ended {n} credit(s) ({at})` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_h_added: { tr: `Berkay Er {n} hak ekledi ({at})`, en: `Berkay Er added {n} credit(s) ({at})` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_h_moved: { tr: `Ertelenen ders → yeni tarih {date}`, en: `Rescheduled lesson → new date {date}` },   // booking-ogrenci (başlangıç dostu)
    bks_credit_h_admin: { tr: `{n} hak Berkay Er tarafından düzenlendi — sorun için WhatsApp’tan yaz.`, en: `{n} credit(s) were adjusted by Berkay Er — message on WhatsApp if something looks wrong.` },   // booking-ogrenci (başlangıç dostu)
    bk_welcome_pay_desc2: { tr: `Panelin en üstündeki <strong class="text-accent">Yapman gereken</strong> kartında IBAN ve tutar var. Havaleyi yap, <strong class="text-accent">Ödemeyi yaptım</strong> de; Berkay Er onaylayınca derslerin açılır.`, en: `The <strong class="text-accent">Your next step</strong> card at the top has the IBAN and the amount. Make the transfer, press <strong class="text-accent">I’ve paid</strong>; your lessons open once Berkay Er confirms.` },   // booking-ogrenci (başlangıç dostu)
    bk_welcome_zoom_desc2: { tr: `Her dersten <strong>15 dakika önce</strong> ders kartında yeşil <strong class="text-ok">Derse Katıl</strong> düğmesi açılır; Zoom’u açar.`, en: `<strong>15 minutes before</strong> each lesson a green <strong class="text-ok">Join</strong> button appears on the lesson card; it opens Zoom.` },   // booking-ogrenci (başlangıç dostu)
    bk_welcome_change_title: { tr: `Saati değiştir — ücretsiz`, en: `Change time — free` },   // booking-ogrenci (başlangıç dostu)
    bk_welcome_change_desc: { tr: `Dersine 5 saatten fazla varsa aynı hafta içinde başka bir saate kendin taşıyabilirsin; onay gerekmez, <strong>erteleme hakkı düşmez</strong>.`, en: `If your lesson is more than 5 hours away you can move it yourself within the same week; no approval needed and <strong>no credit is used</strong>.` },   // booking-ogrenci (başlangıç dostu)
    bk_access_sel_full: { tr: `Seçimin: {day} · {time}`, en: `Your pick: {day} · {time}` },   // booking-ogrenci (başlangıç dostu)
    bks_trial_tz: { tr: `Saatler Türkiye saatidir (UTC+3) · deneme dersi 60 dk, Zoom üzerinden.`, en: `Times are Turkey time (UTC+3) · the trial lesson is 60 min on Zoom.` },   // booking-ogrenci (başlangıç dostu)
    bk_trial_open_days: { tr: `Ders günleri: {days}`, en: `Lesson days: {days}` },   // booking-ogrenci (başlangıç dostu)
    bk_trial_day_closed: { tr: `{day} günleri ders verilmiyor — başka bir gün seç.`, en: `No lessons on {day}s — pick another day.` },   // booking-ogrenci (başlangıç dostu)
    bk_trial_day_empty: { tr: `Bu günde boş saat kalmadı — başka bir gün seç.`, en: `No free times left on this day — pick another day.` },   // booking-ogrenci (başlangıç dostu)
    bk_avail_closed_day: { tr: `Bu gün ders verilmiyor`, en: `No lessons on this day` },   // booking-ogrenci (başlangıç dostu)
    bk_ok: { tr: `Tamam`, en: `OK` },   // booking-ogrenci (başlangıç dostu)
    bks_back_choices: { tr: `Seçeneklere dön (ücretsiz deneme dersi)`, en: `Back to options (free trial lesson)` },   // booking-ogrenci (başlangıç dostu)
    bks_first_line: { tr: `İlk dersin: <strong>{first}</strong> · son ders: <strong>{last}</strong>`, en: `First lesson: <strong>{first}</strong> · last lesson: <strong>{last}</strong>` },   // booking-ogrenci (başlangıç dostu)
    bks_first_single: { tr: `Dersin: <strong>{first}</strong>`, en: `Your lesson: <strong>{first}</strong>` },   // booking-ogrenci (başlangıç dostu)
    bks_first_skipped: { tr: `24 saatten az kaldığı için bu hafta atlandı.`, en: `This week was skipped because it’s less than 24 hours away.` },   // booking-ogrenci (başlangıç dostu)
    bks_first_final: { tr: `Kesin tarihler Berkay Er onaylayınca takvimine işlenir.`, en: `Final dates go into your schedule once Berkay Er approves.` },   // booking-ogrenci (başlangıç dostu)
    bks_first_short: { tr: `İlk ders: {first}`, en: `First lesson: {first}` },   // booking-ogrenci (başlangıç dostu)
    bks_ended_title: { tr: `Paketin tamamlandı`, en: `Your package is complete` },   // booking-ogrenci (başlangıç dostu)
    bks_ended_body: { tr: `{done}/{total} ders · son ders {last}. Devam etmek için aşağıdan yeni paket seç — önceki gün ve saatlerini senin için seçtik.`, en: `{done}/{total} lessons · last lesson {last}. To continue, pick a new package below — we’ve pre-selected your previous days and times.` },   // booking-ogrenci (başlangıç dostu)
    bks_ended_cancel_title: { tr: `Planındaki dersler iptal edildi`, en: `The lessons in your plan were cancelled` },   // booking-ogrenci (başlangıç dostu)
    bks_ended_cancel_body: { tr: `Şu an planlanmış dersin yok. Yeniden başlamak için aşağıdan paket ve saat seç; bir sorun olduğunu düşünüyorsan Berkay Er’e WhatsApp’tan yaz.`, en: `You have no scheduled lessons right now. To start again, pick a package and times below; if you think something is wrong, message Berkay Er on WhatsApp.` },   // booking-ogrenci (başlangıç dostu)
    bks_ended_past: { tr: `Geçmiş derslerim ({n})`, en: `My past lessons ({n})` },   // booking-ogrenci (başlangıç dostu)
    bks_pend_start: { tr: `Başlangıç tarihi`, en: `Start date` },   // booking-ogrenci (başlangıç dostu)
    bks_pend_start_asap: { tr: `En yakın uygun hafta`, en: `Nearest available week` },   // booking-ogrenci (başlangıç dostu)
    bks_pend_first: { tr: `İlk ders`, en: `First lesson` },   // booking-ogrenci (başlangıç dostu)
    bks_pend_first_note: { tr: `tahmini — Berkay Er onaylayınca kesinleşir`, en: `estimate — final once Berkay Er approves` },   // booking-ogrenci (başlangıç dostu)
    bks_next_title: { tr: `Sırada ne var?`, en: `What happens next?` },   // booking-ogrenci (başlangıç dostu)
    bks_next_1: { tr: `Berkay Er talebini inceler ve onaylar — onaylanınca bu sayfa kendiliğinden güncellenir.`, en: `Berkay Er reviews and approves your request — this page updates by itself once approved.` },   // booking-ogrenci (başlangıç dostu)
    bks_next_2: { tr: `Onaydan sonra ödeme bilgileri (IBAN ve tutar) bu panelde görünür; havaleyi yapıp "Ödemeyi yaptım" dersin.`, en: `After approval the payment details (IBAN and amount) appear in this panel; make the transfer and press "I’ve paid".` },   // booking-ogrenci (başlangıç dostu)
    bks_next_3: { tr: `Derslerin takvimine işlenir; her dersten 15 dakika önce burada Derse Katıl (Zoom) düğmesi açılır.`, en: `Your lessons go into your schedule; 15 minutes before each lesson a Join (Zoom) button appears here.` },   // booking-ogrenci (başlangıç dostu)
    bks_next_3_trial: { tr: `Dersin takvimine işlenir; ders saatinden 15 dakika önce burada Derse Katıl (Zoom) düğmesi açılır.`, en: `Your lesson goes into your schedule; 15 minutes before it a Join (Zoom) button appears here.` },   // booking-ogrenci (başlangıç dostu)
    bks_withdraw: { tr: `Talebi geri çek`, en: `Withdraw request` },   // booking-ogrenci (başlangıç dostu)
    bks_withdraw_q: { tr: `Talebi geri çekmek istiyor musun?`, en: `Withdraw your request?` },   // booking-ogrenci (başlangıç dostu)
    bks_withdraw_body: { tr: `Talebin silinir ve Berkay Er onu artık görmez. İstersen hemen yeni bir talep oluşturabilirsin.`, en: `Your request is deleted and Berkay Er will no longer see it. You can create a new one right away.` },   // booking-ogrenci (başlangıç dostu)
    bks_withdraw_ok: { tr: `Evet, geri çek`, en: `Yes, withdraw` },   // booking-ogrenci (başlangıç dostu)
    bks_withdrawn: { tr: `Talebin geri çekildi. Yeni bir talep oluşturabilirsin.`, en: `Your request was withdrawn. You can create a new one.` },   // booking-ogrenci (başlangıç dostu)
    bks_withdraw_err: { tr: `Talep geri çekilemedi`, en: `Couldn’t withdraw the request` },   // booking-ogrenci (başlangıç dostu)
    bk_months_n: { tr: `{m} Ay`, en: `{m} mo` },   // booking-ogrenci (başlangıç dostu)
    bk_month_one: { tr: `{n} aylık`, en: `{n}-month` },   // booking-ogrenci (başlangıç dostu)
    bk_months: { tr: `{n} aylık`, en: `{n}-month` },   // booking-ogrenci (başlangıç dostu)
    bk_lpm_one: { tr: `{n} ders/ay`, en: `{n} lesson/month` },   // booking-ogrenci (başlangıç dostu)
    bk_lpm: { tr: `{n} ders/ay`, en: `{n} lessons/month` },   // booking-ogrenci (başlangıç dostu)
    idx2_reviews_less: { tr: 'Daha az göster', en: 'Show less' },   // index.json
    adm_pt_reset_b: { tr: `Bu öğrencinin sınav sonucu silinecek; öğrenci sınavı yeniden çözebilir.`, en: `This student's test result will be deleted; they can take the test again.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pt_reset_t: { tr: `Sınavı sıfırla`, en: `Reset test` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pt_reset_ok: { tr: `Sınavı sıfırla`, en: `Reset test` },   // booking-admin (erteleme hakları + admin onayları)
    bks_credit_h_used_admin: { tr: `Kullanıldı: Berkay Er 1 hak düştü ({at})`, en: `Used: Berkay Er deducted 1 credit ({at})` },   // booking-admin (erteleme hakları + admin onayları)
    adm_student: { tr: `Öğrenci`, en: `Student` },   // booking-admin (erteleme hakları + admin onayları)
    adm_confirm_t: { tr: `Emin misin?`, en: `Are you sure?` },   // booking-admin (erteleme hakları + admin onayları)
    adm_undo: { tr: `Geri al`, en: `Undo` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_current: { tr: `şu anki saat`, en: `current time` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_taken: { tr: `dolu`, en: `taken` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_own: { tr: `bu öğrencinin dersi`, en: `this student's lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_closed: { tr: `kapalı saat`, en: `closed hour` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_pick: { tr: `Saat seç`, en: `Pick a time` },   // booking-admin (erteleme hakları + admin onayları)
    adm_promo_t: { tr: `Tanıtım maili gönder`, en: `Send promo email` },   // booking-admin (erteleme hakları + admin onayları)
    adm_promo_b: { tr: `Siteye kayıtlı {m} üyeden, henüz ders almayan yaklaşık {n} kişiye ders tanıtım e-postası gidecek.`, en: `Of {m} registered members, about {n} who have not taken lessons yet will get the lesson promo email.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_promo_b2: { tr: `Siteye kayıtlı, henüz ders almayan tüm üyelere ders tanıtım e-postası gidecek.`, en: `All registered members who have not taken lessons yet will get the lesson promo email.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_promo_n: { tr: `Gönderim geri alınamaz.`, en: `Sending cannot be undone.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_promo_ok: { tr: `~{n} kişiye gönder`, en: `Send to ~{n} people` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_cr: { tr: `Erteleme hakkı: {a} → {b} olacak`, en: `Reschedule credits: {a} → {b}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_cr_none: { tr: `Hak yok — onaylarsan hak düşmez`, en: `No credits — approving will not deduct one` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_cascade: { tr: `+{n} ders da 1 hafta kayar`, en: `+{n} more lessons shift 1 week` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_nolesson: { tr: `Ders bulunamadı (taşınmış ya da iptal)`, en: `Lesson not found (moved or cancelled)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_asked: { tr: `Talep edilen: {date}`, en: `Requested: {date}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_reject_reason: { tr: `Reddetme sebebi`, en: `Reason for rejection` },   // booking-admin (erteleme hakları + admin onayları)
    adm_optional: { tr: `İsteğe bağlı…`, en: `Optional…` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_resched_rejected: { tr: `Erteleme talebi reddedildi — öğrenciye WhatsApp ile bildirildi, hak düşmedi.`, en: `Reschedule request rejected — student notified on WhatsApp, no credit used.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_t: { tr: `Talebi onayla`, en: `Approve request` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_trial_b: { tr: `{who} deneme dersi takvime işlenecek:`, en: `{who} trial lesson will be added to the calendar:` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_notify: { tr: `Öğrenciye WhatsApp ile "onaylandı" bildirimi gider.`, en: `The student gets an "approved" WhatsApp message.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_ok: { tr: `Onayla ve öğrenciye bildir`, en: `Approve and notify student` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_pk_note: { tr: `{pkg} paketi ({h} saat) yerine {n} ders planlanacak. Paketin %{d} indirimi korunur (liste: {list}). Bu indirimi vermek istemiyorsan vazgeç ya da onaydan sonra fiyatı düzenle.`, en: `Instead of the {pkg} package ({h} hours), {n} lessons will be scheduled. The {d}% package discount is kept (list: {list}). If you do not want to give this discount, cancel or edit the price after approving.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_b: { tr: `{who} için {n} ders takvime işlenecek:`, en: `{n} lessons will be added to the calendar for {who}:` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_conf: { tr: `{n} tarih dolu (başka öğrenci) — eklenmeyecek:`, en: `{n} dates are taken (another student) — they will not be added:` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_price: { tr: `Tutar`, en: `Amount` },   // booking-admin (erteleme hakları + admin onayları)
    adm_acc_notify2: { tr: `Öğrenciye WhatsApp ile "onaylandı" bildirimi gider; ödeme bilgisi panelinde görünür.`, en: `The student gets an "approved" WhatsApp message; payment details appear in their panel.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_ps_counted: { tr: `bu ayın gelirinde`, en: `in this month's income` },   // booking-admin (erteleme hakları + admin onayları)
    adm_ps_paid_in: { tr: `{m} ödendi — bu aya sayılmaz`, en: `paid in {m} — not counted this month` },   // booking-admin (erteleme hakları + admin onayları)
    adm_ps_unpaid: { tr: `henüz ödenmedi`, en: `not paid yet` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rem_conf_b: { tr: `{n} öğrenciye ödeme hatırlatma e-postası gidecek:`, en: `A payment reminder email will go to {n} students:` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rem_conf_ok: { tr: `{n} kişiye gönder`, en: `Send to {n} people` },   // booking-admin (erteleme hakları + admin onayları)
    adm_today: { tr: `Bugün`, en: `Today` },   // booking-admin (erteleme hakları + admin onayları)
    adm_today_ended: { tr: `bitti`, en: `ended` },   // booking-admin (erteleme hakları + admin onayları)
    adm_today_now: { tr: `şimdi`, en: `now` },   // booking-admin (erteleme hakları + admin onayları)
    adm_open: { tr: `Aç`, en: `Open` },   // booking-admin (erteleme hakları + admin onayları)
    adm_done_btn: { tr: `Tamamlandı`, en: `Done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_chip: { tr: `Erteleme: {n}`, en: `Reschedules: {n}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pkg_extra: { tr: `paket {p} + {n} ek ders {x}`, en: `package {p} + {n} extra lessons {x}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_manage_short: { tr: `Yönet / bitir`, en: `Manage / end` },   // booking-admin (erteleme hakları + admin onayları)
    adm_bulk_complete_t: { tr: `{n} dersi tamamlandı say`, en: `Mark {n} lessons as done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_future_warn_n: { tr: `{n} ders henüz yapılmadı (tarihi gelecekte).`, en: `{n} lessons have not happened yet (future date).` },   // booking-admin (erteleme hakları + admin onayları)
    adm_complete_n: { tr: `Dersler "Geçmiş dersler"e taşınır ve takvimdeki saatleri boşalır.`, en: `Lessons move to "Past lessons" and their calendar slots are freed.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_bulk_complete_ok: { tr: `Tamamlandı olarak işaretle`, en: `Mark as done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_bulk_cancel_t: { tr: `{n} dersi iptal et`, en: `Cancel {n} lessons` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cancel_n: { tr: `Ders "İptal" olarak geçmişe düşer, saat boşalır; ücret ve erteleme hakkı değişmez. Öğrenciye otomatik mesaj gitmez.`, en: `The lesson goes to past as "Cancelled" and its slot is freed; price and reschedule credits do not change. No automatic message is sent to the student.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_bulk_cancel_ok: { tr: `Dersleri iptal et`, en: `Cancel lessons` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_today: { tr: `Bugün`, en: `Today` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_past: { tr: `Geçti · işaretlenmedi`, en: `Past · not marked` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_moved: { tr: `Ertelendi`, en: `Rescheduled` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_was: { tr: `eski: {d}`, en: `was: {d}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_menu_cr: { tr: `Erteleme hakkı: {n} kalan`, en: `Reschedule credits: {n} left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_m_done: { tr: `Tamamlandı`, en: `Done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_m_note: { tr: `Not ekle`, en: `Add note` },   // booking-admin (erteleme hakları + admin onayları)
    adm_m_resched: { tr: `1 hafta ertele…`, en: `Postpone 1 week…` },   // booking-admin (erteleme hakları + admin onayları)
    adm_m_time: { tr: `Saati değiştir (hak düşmez)`, en: `Change time (no credit used)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_m_date: { tr: `Günü değiştir (hak düşmez)`, en: `Change day (no credit used)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_m_cancel: { tr: `Dersi iptal et`, en: `Cancel lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_pend_rs: { tr: `Erteleme talebi bekliyor → Talepler`, en: `Reschedule request waiting → Requests` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_pend_cx: { tr: `İptal talebi bekliyor → Talepler`, en: `Cancel request waiting → Requests` },   // booking-admin (erteleme hakları + admin onayları)
    adm_complete_all_t: { tr: `İptal edilenleri tamamlandı say`, en: `Mark cancelled lessons as done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_complete_all_b: { tr: `{n} iptal edilmiş ders "Tamamlandı" olarak işaretlenecek; öğrencinin ilerlemesi buna göre artar.`, en: `{n} cancelled lessons will be marked "Done"; the student's progress goes up accordingly.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_complete_all_ok: { tr: `Tamamlandı olarak işaretle`, en: `Mark as done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_complete_all_done: { tr: `{n} ders tamamlandı olarak işaretlendi.`, en: `{n} lessons marked as done.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide_all: { tr: `Geçmişi gizle`, en: `Hide past` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide_t: { tr: `Geçmiş dersleri gizle`, en: `Hide past lessons` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide_b: { tr: `{n} geçmiş ders kaydı bu listeden gizlenecek.`, en: `{n} past lesson records will be hidden from this list.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide_1: { tr: `Kayıtlar silinmez: ilerleme ({d} / {t} ders), paket fiyatı ve aylık gelir aynı kalır.`, en: `Records are not deleted: progress ({d} / {t} lessons), package price and monthly income stay the same.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide_2: { tr: `Öğrencinin panelindeki geçmiş değişmez.`, en: `The student's own history does not change.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide_3: { tr: `"Gizlenenleri göster" ile tekrar açabilirsin.`, en: `You can bring them back with "Show hidden".` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide_ok: { tr: `Gizle`, en: `Hide` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hidden: { tr: `{n} geçmiş ders gizlendi — ilerleme ve gelir değişmedi.`, en: `{n} past lessons hidden — progress and income unchanged.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_arch_hide: { tr: `Gizlenenleri sakla`, en: `Hide hidden again` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_arch_show: { tr: `Gizlenenleri göster`, en: `Show hidden` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_none: { tr: `Görünen geçmiş ders yok.`, en: `No visible past lessons.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_cancelled: { tr: `İptal`, en: `Cancelled` },   // booking-admin (erteleme hakları + admin onayları)
    adm_l_archived: { tr: `gizli`, en: `hidden` },   // booking-admin (erteleme hakları + admin onayları)
    adm_mark_done_t: { tr: `Tamamlandı olarak işaretle`, en: `Mark as done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_restore: { tr: `Geri getir`, en: `Restore` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hide: { tr: `Gizle`, en: `Hide` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_restored: { tr: `✓ Kayıt geri getirildi.`, en: `✓ Record restored.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_past_hid1: { tr: `✓ Kayıt gizlendi — ilerleme ve gelir değişmedi.`, en: `✓ Record hidden — progress and income unchanged.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_ok_line: { tr: `Ödeme onaylandı`, en: `Payment confirmed` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undo: { tr: `Ödemeyi geri al`, en: `Undo payment` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undo_t: { tr: `Ödemeyi geri al`, en: `Undo payment` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undo_b: { tr: `{who} ödemesi "onaylanmadı" durumuna döner.`, en: `{who} payment goes back to "not confirmed".` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undo_1: { tr: `Öğrencinin panelinde ödeme adımları yeniden görünür.`, en: `The payment steps show up again in the student's panel.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undo_2: { tr: `Günlük ödeme hatırlatma e-postaları yeniden başlar.`, en: `Daily payment reminder emails start again.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undo_3: { tr: `Dersler, erteleme hakları ve fiyat değişmez; bu ayın gelirinden düşer.`, en: `Lessons, reschedule credits and price do not change; it is removed from this month's income.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undo_ok: { tr: `Ödemeyi geri al`, en: `Undo payment` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pay_undone: { tr: `Ödeme geri alındı.`, en: `Payment undone.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rem_welcome_mail: { tr: `Hoşgeldin maili`, en: `Welcome email` },   // booking-admin (erteleme hakları + admin onayları)
    adm_manage_credits2: { tr: `Erteleme hakları ({n})`, en: `Reschedule credits ({n})` },   // booking-admin (erteleme hakları + admin onayları)
    adm_freeze_pkg: { tr: `Paketi dondur ({n} ders)`, en: `Freeze package ({n} lessons)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_plan_del_t: { tr: `Planı iptal et`, en: `Cancel plan` },   // booking-admin (erteleme hakları + admin onayları)
    adm_plan_del_b: { tr: `{who} rezervasyonu tamamen silinecek.`, en: `{who} reservation will be deleted completely.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_plan_del_1: { tr: `{u} yaklaşan ve {p} geçmiş ders kaydı silinir; takvimdeki saatleri boşalır.`, en: `{u} upcoming and {p} past lesson records are deleted; their calendar slots are freed.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_plan_del_2: { tr: `Ödeme kaydı ({pay}) ve {c} erteleme hakkı da silinir; bu öğrenciden gelen gelir istatistikten düşer.`, en: `The payment record ({pay}) and {c} reschedule credits are deleted too; income from this student is removed from the stats.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_plan_del_3: { tr: `Öğrenci panelde yeniden talep formunu görür. Öğrenciye otomatik mesaj gitmez.`, en: `The student sees the request form again. No automatic message is sent.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_plan_del_4: { tr: `Geri alınamaz.`, en: `This cannot be undone.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_plan_del_ok: { tr: `{who} planını sil`, en: `Delete {who} plan` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cal_open: { tr: `dersi aç`, en: `open lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cal_above: { tr: `{n} ders yukarıda`, en: `{n} lessons above` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cal_below: { tr: `{n} ders aşağıda`, en: `{n} lessons below` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_eyebrow: { tr: `Dersi ertele`, en: `Postpone lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_bulk_t: { tr: `{n} dersi 1 hafta ertele`, en: `Postpone {n} lessons by 1 week` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_cascade: { tr: `Yeni tarih başka bir dersine denk geldiği için {n} ders de 1 hafta kayar; paketin bitişi uzar.`, en: `The new date lands on another of their lessons, so {n} more lessons shift 1 week; the package ends later.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_credit: { tr: `Erteleme hakkı`, en: `Reschedule credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_left: { tr: `kalan`, en: `left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_bulk_cb: { tr: `Erteleme hakkından düş: {k} hak ({a} → {b})`, en: `Deduct from reschedule credits: {k} ({a} → {b})` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_bulk_short: { tr: `{n} ders seçildi ama {k} hak var — kalanlar hak düşmeden ertelenir.`, en: `{n} lessons selected but only {k} credits — the rest are postponed without a credit.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_bulk_off: { tr: `Kendi iptalinse (hastalık, tatil) işareti kaldır.`, en: `If it is your own cancellation (illness, holiday), untick this.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_bulk_ok: { tr: `{n} dersi ertele`, en: `Postpone {n} lessons` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_bulk_done: { tr: `{n} ders 1 hafta ertelendi`, en: `{n} lessons postponed 1 week` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_done_use: { tr: `kalan hak {n}`, en: `{n} credits left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_done_free: { tr: `hak düşülmedi`, en: `no credit used` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_title: { tr: `Yeni saat seç`, en: `Pick a new time` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_now: { tr: `şu an`, en: `now` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_label: { tr: `Yeni saat`, en: `New time` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_note: { tr: `"dolu" saatler başka öğrencinin; "kapalı saat" müsaitlikte kapattığın saattir (seçebilirsin). Erteleme hakkı düşmez.`, en: `"taken" hours belong to another student; "closed hour" is one you closed in availability (you can still pick it). No reschedule credit is used.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_all: { tr: `Tüm yaklaşan derslere uygula ({n} ders)`, en: `Apply to all upcoming lessons ({n} lessons)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_conf_t: { tr: `Çakışma var`, en: `Conflict` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_conf_all: { tr: `{n} tarihte {t} başka bir öğrenciye ait. Yine de tüm derslere uygulansın mı?`, en: `{t} belongs to another student on {n} dates. Apply to all lessons anyway?` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_conf_ok: { tr: `Yine de uygula`, en: `Apply anyway` },   // booking-admin (erteleme hakları + admin onayları)
    adm_tp_conf_one: { tr: `{d} {t} dolu. Yine de değiştirilsin mi?`, en: `{d} {t} is taken. Change anyway?` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_t: { tr: `Hangi dersler taşınsın?`, en: `Which lessons should move?` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_b: { tr: `Öğrencinin {n} gelecek {wd} dersi daha var. Erteleme hakkı düşmez.`, en: `The student has {n} more upcoming {wd} lessons. No reschedule credit is used.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_one: { tr: `Yalnız bu dersi taşı`, en: `Move only this lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_all: { tr: `Tüm {wd} derslerini aynı gün kadar kaydır ({n} ders)`, en: `Shift all {wd} lessons by the same days ({n} lessons)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_conf: { tr: `Başka öğrencinin dersleriyle çakışıyor — değişiklik yapılmadı:`, en: `Conflicts with another student's lessons — nothing was changed:` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_move_t: { tr: `{n} ders taşınacak`, en: `{n} lessons will move` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_free: { tr: `Erteleme hakkı düşmez.`, en: `No reschedule credit is used.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_dc_move_ok: { tr: `Taşı`, en: `Move` },   // booking-admin (erteleme hakları + admin onayları)
    adm_add_t: { tr: `Ders ekle`, en: `Add lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_add_date: { tr: `Tarih`, en: `Date` },   // booking-admin (erteleme hakları + admin onayları)
    adm_add_ok: { tr: `Ekle`, en: `Add` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_nores: { tr: `Rezervasyon bulunamadı.`, en: `Reservation not found.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_undo_reason: { tr: `Son değişiklik geri alındı`, en: `Last change undone` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_undone: { tr: `↺ Geri alındı — kalan {n}`, en: `↺ Undone — {n} left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_none_left: { tr: `Bu öğrencinin düşülecek hakkı yok.`, en: `This student has no credits to deduct.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_eyebrow: { tr: `Erteleme hakkı`, en: `Reschedule credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_t: { tr: `1 hakkı kullandır`, en: `Use 1 credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_b: { tr: `{who} 1 erteleme hakkı düşülecek.`, en: `{who} 1 reschedule credit will be deducted.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_left: { tr: `Kalan`, en: `Left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_n: { tr: `Ders tarihine dokunulmaz — yalnız hak sayısı azalır. Bir dersi gerçekten ertelemek için dersin ··· menüsündeki "1 hafta ertele"yi kullan; o, hakkı kendisi düşer.`, en: `Lesson dates are not touched — only the credit count goes down. To actually postpone a lesson, use "Postpone 1 week" in the lesson's ··· menu; it deducts the credit itself.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_reason_l: { tr: `Not (isteğe bağlı · öğrenci de görür)`, en: `Note (optional · the student sees it too)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_ph: { tr: `Ör. 12 Eki dersi WhatsApp üzerinden ertelendi`, en: `E.g. Oct 12 lesson moved via WhatsApp` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_ok: { tr: `1 hakkı düş`, en: `Deduct 1 credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_used_toast: { tr: `✓ 1 hak düşüldü — kalan {n}`, en: `✓ 1 credit deducted — {n} left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_add_t: { tr: `+1 erteleme hakkı ver`, en: `Give +1 reschedule credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_add_n: { tr: `Ek hak ücreti 500 TL. Öğrenci yeni hakkı hemen panelinde görür ve erteleme talebi gönderebilir.`, en: `An extra credit costs 500 TL. The student sees the new credit right away and can send a reschedule request.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_add_ph: { tr: `Ör. Ek hak satın aldı (500 TL)`, en: `E.g. Bought an extra credit (500 TL)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_add_ok: { tr: `+1 hak ver`, en: `Give +1 credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_added_toast: { tr: `✓ 1 hak eklendi — kalan {n}`, en: `✓ 1 credit added — {n} left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_t: { tr: `Tüm hakları bitir`, en: `End all credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_b: { tr: `{who} {n} erteleme hakkı sıfırlanacak.`, en: `{who} {n} reschedule credits will be set to zero.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_1: { tr: `Öğrenci artık erteleme talebi gönderemez (panelinde "hak kalmadı" görünür).`, en: `The student can no longer send reschedule requests (their panel shows "no credits left").` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_2: { tr: `Dersler, ödeme ve plan değişmez.`, en: `Lessons, payment and plan do not change.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_3: { tr: `Gerekirse "+1 hak ver" ile yeniden hak verebilirsin.`, en: `You can give credits again with "Give +1 credit" if needed.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_ph: { tr: `Ör. Paket süresi doldu`, en: `E.g. Package period ended` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_ok: { tr: `{n} hakkı sıfırla`, en: `Reset {n} credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_ended_toast: { tr: `✓ {n} hak sıfırlandı — kalan 0`, en: `✓ {n} credits reset — 0 left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_used_l: { tr: `Kullanıldı — {date} dersi ertelendi`, en: `Used — {date} lesson postponed` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_used: { tr: `Kullanıldı (elle düşüldü)`, en: `Used (deducted by hand)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_added: { tr: `Hak verildi`, en: `Credit given` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_revoked: { tr: `Haklar sonlandırıldı`, en: `Credits ended` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_pkg: { tr: `Paket: {m} aylık → {m} hak`, en: `Package: {m}-month → {m} credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_used: { tr: `Kullanılan: {n}`, en: `Used: {n}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_added: { tr: `Verilen: +{n}`, en: `Given: +{n}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_revoked: { tr: `Sonlandırılan: −{n}`, en: `Ended: −{n}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_unit: { tr: `hak`, en: `credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_short: { tr: `−1 kullandır`, en: `−1 use` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_left_one: { tr: `erteleme hakkı kaldı`, en: `reschedule credit left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_left_many: { tr: `erteleme hakkı kaldı`, en: `reschedule credits left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_pend: { tr: `{n} talep onay bekliyor`, en: `{n} requests waiting` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_what: { tr: `Erteleme hakkı, öğrencinin bir dersini 1 hafta ileri aldırabilmesidir. Paket kaç aylıksa o kadar hak verir (1 ay = 1 hak); hangi derste kullanıldığı önemli değildir. Erteleme talebini onaylayınca 1 hak kendiliğinden düşer. Hak 0 olunca öğrenci erteleme talebi gönderemez.`, en: `A reschedule credit lets the student move one lesson 1 week later. A package gives as many credits as it has months (1 month = 1 credit); it does not matter which lesson it is used on. Approving a reschedule request deducts 1 credit automatically. At 0 credits the student cannot send reschedule requests.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_btn: { tr: `−1 hakkı kullandır`, en: `−1 use a credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_add_btn: { tr: `+1 hak ver`, en: `+1 give credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_end_btn: { tr: `Tüm hakları bitir`, en: `End all credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_hist: { tr: `Geçmiş`, en: `History` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_hist_none: { tr: `Henüz kayıt yok. Bundan sonraki her değişiklik burada tarihiyle görünür.`, en: `No records yet. Every change from now on appears here with its date.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_months: { tr: `Ay bazında ayrıntı`, en: `Per-month detail` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_months_n: { tr: `Haklar tek havuzdur; ay yalnız kaydın tutulduğu yerdir. Normalde bu bölüme gerek yoktur.`, en: `Credits are one pool; the month is only where the record is kept. You normally do not need this section.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_saved_n: { tr: `Değişiklikler hemen kaydedilir ve öğrencinin panelinde anında görünür.`, en: `Changes are saved right away and show up in the student's panel instantly.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_off_b: { tr: `{n} bekleyen talep "{c}" kampanyasıyla geldi. Pasif kampanyalı talepler onaylanırsa liste fiyatı uygulanır.`, en: `{n} pending requests came with the "{c}" campaign. If requests with an inactive campaign are approved, the list price applies.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_off_t: { tr: `Kampanyayı pasifleştir`, en: `Deactivate campaign` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_off_ok: { tr: `Pasifleştir`, en: `Deactivate` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_del_b: { tr: `{n} bekleyen talep "{c}" kampanyasıyla geldi. Silinirse bu talepler onaylanınca liste fiyatı uygulanır.`, en: `{n} pending requests came with the "{c}" campaign. If it is deleted, these requests get the list price when approved.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_del_t: { tr: `Kampanyayı sil`, en: `Delete campaign` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_revert_b: { tr: `Yayınlanmamış kampanya değişiklikleri silinir; yayındaki liste geri gelir.`, en: `Unpublished campaign changes are discarded; the published list comes back.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_noact_b: { tr: `Hiç aktif kampanya yok — öğrenciler kampanyalı paket seçemez, yalnız tek ders talep edebilir.`, en: `No active campaign — students cannot pick a campaign package, only request single lessons.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_pub_anyway: { tr: `Yine de yayınla`, en: `Publish anyway` },   // booking-admin (erteleme hakları + admin onayları)
    adm_camp_aff_b: { tr: `{n} bekleyen talep kaldırılan ya da pasif bir kampanyayı kullanıyor ({names}). Bu talepler onaylanırsa liste fiyatı uygulanır.`, en: `{n} pending requests use a removed or inactive campaign ({names}). If approved, the list price applies.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_avail_count2: { tr: `Kapalı saat`, en: `Closed hours` },   // booking-admin (erteleme hakları + admin onayları)
    adm_avail_offdays: { tr: `kapalı gün`, en: `closed days` },   // booking-admin (erteleme hakları + admin onayları)
    adm_phone_help: { tr: `Kabul edilen: 5XX XXX XX XX · 05XX XXX XX XX · +90 5XX XXX XX XX · yurt dışı +1 617 388 4403 gibi. Boş bırakırsan numara silinir.`, en: `Accepted: 5XX XXX XX XX · 05XX XXX XX XX · +90 5XX XXX XX XX · abroad like +1 617 388 4403. Leave empty to delete the number.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_phone_label: { tr: `WhatsApp numarası`, en: `WhatsApp number` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_new_b: { tr: `Yeni toplantı oluşturulursa öğrencilerin gördüğü "Derse Katıl" linki değişir; eski link artık panelde görünmez.`, en: `Creating a new meeting changes the "Join lesson" link students see; the old link no longer shows in the panel.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_new_t: { tr: `Yeni Zoom toplantısı oluşturulsun mu?`, en: `Create a new Zoom meeting?` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_new_ok: { tr: `Oluştur ve linki değiştir`, en: `Create and replace link` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_creating: { tr: `Oluşturuluyor…`, en: `Creating…` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_err_auth: { tr: `Bu işlem için yetkin yok — çıkış yapıp yeniden gir.`, en: `You are not allowed to do this — sign out and back in.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_err: { tr: `Zoom'a bağlanılamadı — birazdan tekrar dene. Olmazsa linki Zoom'dan kopyalayıp "Linki kaydet" ile ekle.`, en: `Could not reach Zoom — try again shortly. If it keeps failing, copy the link from Zoom and add it with "Save link".` },   // booking-admin (erteleme hakları + admin onayları)
    adm_done_t: { tr: `Tamamlandı olarak işaretle`, en: `Mark as done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_future_warn: { tr: `Bu ders henüz yapılmadı (bitiş saati gelmedi).`, en: `This lesson has not happened yet (end time not reached).` },   // booking-admin (erteleme hakları + admin onayları)
    adm_done_ok_future: { tr: `Yine de tamamlandı say`, en: `Mark done anyway` },   // booking-admin (erteleme hakları + admin onayları)
    adm_done_ok: { tr: `Tamamlandı`, en: `Done` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cx_t: { tr: `Dersi iptal et`, en: `Cancel lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cx_ok: { tr: `Dersi iptal et`, en: `Cancel lesson` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_cascade_chip: { tr: `zincir`, en: `chain` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_lead: { tr: `{who} dersi 1 hafta ileri alınacak:`, en: `{who} lesson will move 1 week later:` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_none: { tr: `hak yok`, en: `no credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_none_n: { tr: `Öğrencinin hakkı kalmadı; yine de erteleyebilirsin (hak düşmez). Ek hak satıldıysa önce "+1 hak ver".`, en: `The student has no credits left; you can still postpone (no credit used). If they bought an extra credit, use "Give +1 credit" first.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_use: { tr: `Öğrencinin hakkından düş ({a} → {b})`, en: `Deduct from student's credits ({a} → {b})` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_free: { tr: `Hak düşmeden ertele (benden kaynaklı)`, en: `Postpone without a credit (my cancellation)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_free_only: { tr: `Hak düşmeden ertele`, en: `Postpone without a credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_t_req: { tr: `Talebi onayla`, en: `Approve request` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_t: { tr: `1 hafta ertele`, en: `Postpone 1 week` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rs_done: { tr: `{n} ders ertelendi → {date}`, en: `{n} lessons postponed → {date}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_ann_del_t: { tr: `Bu duyuru silinsin mi?`, en: `Delete this announcement?` },   // booking-admin (erteleme hakları + admin onayları)
    adm_ann_delall_b: { tr: `Öğrencilerin ders panelindeki tüm duyurular kalıcı olarak silinir.`, en: `All announcements in students' lesson panels are deleted permanently.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_qa_reopen_b: { tr: `Öğrenci bu soruya yeniden mesaj ekleyebilecek.`, en: `The student will be able to add messages to this question again.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_qa_reopen_t: { tr: `Soru yeniden açılsın mı?`, en: `Reopen this question?` },   // booking-admin (erteleme hakları + admin onayları)
    adm_qa_reopen_ok: { tr: `Yeniden aç`, en: `Reopen` },   // booking-admin (erteleme hakları + admin onayları)
    adm_qa_solve_b: { tr: `Öğrenci bu soruya artık yeni mesaj ekleyemeyecek.`, en: `The student can no longer add messages to this question.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_qa_solve_t: { tr: `Çözüldü olarak işaretle`, en: `Mark as solved` },   // booking-admin (erteleme hakları + admin onayları)
    adm_qa_solve_ok: { tr: `Çözüldü`, en: `Solved` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rev_note: { tr: `Ödemesi bu ay onaylanan paketlerin toplamı (ders ayına göre değil)`, en: `Total of packages whose payment was confirmed this month (not by lesson month)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_save: { tr: `Linki kaydet`, en: `Save link` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_create2: { tr: `Yeni toplantı oluştur`, en: `Create new meeting` },   // booking-admin (erteleme hakları + admin onayları)
    adm_zoom_help: { tr: `Linki kaydet: elindeki Zoom linkini yapıştır. Yeni toplantı oluştur: Zoom'da yeni toplantı açar ve öğrencilerin gördüğü linki değiştirir.`, en: `Save link: paste the Zoom link you have. Create new meeting: opens a new Zoom meeting and replaces the link students see.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_wa_hint_rule: { tr: `24 saat kuralı: öğrenci son 24 saatte yazmadıysa serbest metin reddedilir.`, en: `24-hour rule: if the student has not written in the last 24 hours, free text is rejected.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_wa_hint_keys: { tr: `Enter gönderir, Shift+Enter yeni satır.`, en: `Enter sends, Shift+Enter adds a new line.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_today_aria: { tr: `Bugünkü dersler`, en: `Today's lessons` },   // booking-admin (erteleme hakları + admin onayları)
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
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var val = T[key];
      if (val) el.innerHTML = val[lang] || val['tr'];
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
