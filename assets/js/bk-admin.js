// Berkay Er Academy — ders paneli yönetim bölümü (markup + kod + metinler).
// booking.html bunu yalnız yönetici oturumunda yükler (bkLoadAdmin); ortak yardımcılar ve öğrenci kodu orada kalır.
'use strict';
(function () {
  var T = {
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
    adm_prev_text:             { tr: `Öğrenci görünümü · önizleme — hiçbir şey kaydedilmez; gönderdiğin talep öğrencinin göreceği ekranlarla demo olarak ilerler.`, en: "Student view · preview — nothing is saved; a request you send continues as a demo of the student's screens." },
    adm_prev_blocked:          { tr: `Önizleme: bu işlem kaydedilmedi.`, en: 'Preview: this action was not saved.' },
    adm_prev_sent:             { tr: `Önizleme: talep kaydedilmedi — öğrencinin göreceği bekleme ekranı açıldı.`, en: 'Preview: request not saved — showing the waiting screen the student sees.' },
    adm_prev_approve:          { tr: `Onaylanınca: paneli göster`, en: 'Once approved: show the panel' },
    adm_prev_paid:             { tr: `Ödeme onaylanınca`, en: 'Once payment is confirmed' },
    adm_prev_unpaid:           { tr: `Ödeme bekliyor hâli`, en: 'Awaiting payment' },
    adm_prev_restart:          { tr: `Baştan başla`, en: 'Start over' },
    adm_price_monthly:         { tr: 'Aylık · saat başı', en: 'Monthly · per hour' },
    adm_price_note:            { tr: 'Kampanya indirimleri saat başı ücretten hesaplanır. Yeni fiyat bekleyen ve yeni taleplere uygulanır; mevcut öğrencilerin fiyatı değişmez.', en: 'Campaign discounts are calculated from the hourly rate. A new price applies to pending and new requests; current students keep their price.' },
    adm_price_save:            { tr: 'Fiyatları kaydet', en: 'Save prices' },
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
    adm_pt_pending: { tr: 'Sınav bekleniyor', en: 'Test pending' },   // booking-admin.json
    adm_pt_pending_title: { tr: 'Seviye belirleme sınavı henüz çözülmedi', en: 'The placement test has not been taken yet' },   // booking-admin.json
    adm_pt_detail_title: { tr: 'Detay için tıkla', en: 'Click for details' },   // booking-admin.json
    adm_pt_detail_aria: { tr: 'seviye sınavı detayı', en: 'placement test details' },   // booking-admin.json
    adm_pay_nores: { tr: 'Rezervasyon yok', en: 'No reservation' },   // booking-admin.json
    adm_pay_match: { tr: 'rezervasyonla aynı', en: 'matches the reservation' },   // booking-admin.json
    adm_pay_mismatch: { tr: 'Rezervasyon: {price} — tutar uyuşmuyor', en: 'Reservation: {price} — amount does not match' },   // booking-admin.json
    adm_rev_paid_one: { tr: 'öğrenci · ödeme onaylı', en: 'student · payment confirmed' },   // booking-admin.json
    adm_lesson_lc_one: { tr: 'ders', en: 'lesson' },   // booking-admin.json
    adm_pt_reset_b: { tr: `Bu öğrencinin sınav sonucu silinecek; öğrenci sınavı yeniden çözebilir.`, en: `This student's test result will be deleted; they can take the test again.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pt_reset_t: { tr: `Sınavı sıfırla`, en: `Reset test` },   // booking-admin (erteleme hakları + admin onayları)
    adm_pt_reset_ok: { tr: `Sınavı sıfırla`, en: `Reset test` },   // booking-admin (erteleme hakları + admin onayları)
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
    adm_ev_title: { tr: `Etkinlik duyurusu`, en: `Event announcement` },
    adm_ev_desc: { tr: `Etkinlik duyurusunu siteye kayıtlı herkese (öğrenciler dahil) gönderir. Önce kendine test gönder.`, en: `Sends the event announcement to everyone registered on the site (students included). Send yourself a test first.` },
    adm_ev_test: { tr: `Kendime test gönder`, en: `Send me a test` },
    adm_ev_send: { tr: `Herkese gönder`, en: `Send to everyone` },
    adm_ev_test_ok: { tr: `✓ Test e-postası gönderildi: {to}`, en: `✓ Test email sent: {to}` },
    adm_ev_none: { tr: `Gönderilecek yeni alıcı yok — herkes duyuruyu zaten almış.`, en: `No new recipients — everyone already received the announcement.` },
    adm_ev_ct: { tr: `Etkinlik duyurusunu herkese gönder`, en: `Send the event announcement to everyone` },
    adm_ev_cb: { tr: `Siteye kayıtlı {n} kişiye (öğrenciler dahil) e-posta gidecek.`, en: `An email will go to {n} registered people (students included).` },
    adm_ev_cb2: { tr: `{k} kişi duyuruyu daha önce almış, atlanacak.`, en: `{k} already received it and will be skipped.` },
    adm_ev_cn: { tr: `Gönderim geri alınamaz. Önce "Kendime test gönder" ile kontrol ettiğinden emin ol. Gönderim sırasında sayfayı kapatma.`, en: `Sending cannot be undone. Make sure you checked it with "Send me a test" first. Don't close the page while sending.` },
    adm_ev_ok: { tr: `{n} kişiye gönder`, en: `Send to {n} people` },
    adm_ev_wait: { tr: `Gönderiliyor — birkaç dakika sürebilir, sayfayı kapatma…`, en: `Sending — this can take a few minutes, don't close the page…` },
    adm_ev_done: { tr: `✓ {n} kişiye gönderildi.`, en: `✓ Sent to {n} people.` },
    adm_ev_failed: { tr: `{n} gönderim başarısız.`, en: `{n} failed.` },
    adm_ev_remaining: { tr: `{n} kişi kaldı — düğmeye tekrar bas (günlük e-posta sınırı için ertesi gün).`, en: `{n} left — press the button again (next day because of the daily email limit).` },
    adm_rq_cr: { tr: `Erteleme hakkı: {a} → {b} olacak`, en: `Reschedule credits: {a} → {b}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_cr_none: { tr: `Hak yok — onaylarsan hak düşmez`, en: `No credits — approving will not deduct one` },   // booking-admin (erteleme hakları + admin onayları)
    adm_rq_cascade: { tr: `+{n} ders de 1 hafta kayar`, en: `+{n} more lessons shift 1 week` },
    adm_rq_cascade_one: { tr: `+{n} ders de 1 hafta kayar`, en: `+{n} more lesson shifts 1 week` },   // booking-admin (erteleme hakları + admin onayları)
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
    adm_l_pend_tc: { tr: `Saat değişikliği talebi bekliyor → Talepler`, en: `Time change request waiting → Requests` },
    adm_rq_tc:     { tr: `Saat değişikliği talebi`, en: `Time change request` },
    adm_rq_tc_ok:  { tr: `Onayla & taşı`, en: `Approve & move` },
    adm_rq_tc_nocredit: { tr: `Erteleme hakkı düşmez`, en: `No reschedule credit used` },
    adm_rq_tc_done: { tr: `Ders yeni saate taşındı — öğrenciye WhatsApp ile bildirildi.`, en: `Lesson moved to the new time — the student was notified on WhatsApp.` },
    adm_rq_tc_rejected: { tr: `Saat değişikliği talebi reddedildi — ders eski saatinde kaldı, öğrenciye bildirildi.`, en: `Time change request rejected — the lesson stays at its old time; the student was notified.` },
    adm_rq_tc_clash: { tr: `Yeni saat artık dolu ya da başka bir dersle çakışıyor. Yine de taşınsın mı?`, en: `The new time is now taken or clashes with another lesson. Move it anyway?` },
    adm_rq_nores:  { tr: `Rezervasyon bulunamadı.`, en: `Reservation not found.` },
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
    adm_cr_h_undo: { tr: `Geri alındı`, en: `Undone` },
    adm_cr_h_undo_added: { tr: `Geri alındı — verilen hak iptal`, en: `Undone — given credit taken back` },
    adm_cr_h_undo_used: { tr: `Geri alındı — düşülen hak iade`, en: `Undone — deducted credit returned` },
    adm_cr_h_undo_revoked: { tr: `Geri alındı — sonlandırılan haklar iade`, en: `Undone — ended credits returned` },
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
    adm_cr_end_ok: { tr: `{n} hakkı sıfırla`, en: `Reset {n} credits` },
    adm_cr_end_ok_one: { tr: `{n} hakkı sıfırla`, en: `Reset {n} credit` },
    adm_cr_end_b_one: { tr: `{who} {n} erteleme hakkı sıfırlanacak.`, en: `{who} {n} reschedule credit will be set to zero.` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_ended_toast: { tr: `✓ {n} hak sıfırlandı — kalan 0`, en: `✓ {n} credits reset — 0 left` },
    adm_cr_ended_toast_one: { tr: `✓ {n} hak sıfırlandı — kalan 0`, en: `✓ {n} credit reset — 0 left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_used_l: { tr: `Kullanıldı — {date} dersi ertelendi`, en: `Used — {date} lesson postponed` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_used: { tr: `Kullanıldı (elle düşüldü)`, en: `Used (deducted by hand)` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_added: { tr: `Hak verildi`, en: `Credit given` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_h_revoked: { tr: `Haklar sonlandırıldı`, en: `Credits ended` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_pkg: { tr: `Paket: {m} aylık → {m} hak`, en: `Package: {m}-month → {m} credits` },
    adm_cr_f_pkg_one: { tr: `Paket: {m} aylık → {m} hak`, en: `Package: {m}-month → {m} credit` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_used: { tr: `Kullanılan: {n}`, en: `Used: {n}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_added: { tr: `Verilen: +{n}`, en: `Given: +{n}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_f_revoked: { tr: `Sonlandırılan: −{n}`, en: `Ended: −{n}` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_unit: { tr: `hak`, en: `credits` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_use_short: { tr: `−1 kullandır`, en: `−1 use` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_left_one: { tr: `erteleme hakkı kaldı`, en: `reschedule credit left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_left_many: { tr: `erteleme hakkı kaldı`, en: `reschedule credits left` },   // booking-admin (erteleme hakları + admin onayları)
    adm_cr_pend: { tr: `{n} talep onay bekliyor`, en: `{n} requests waiting` },
    adm_cr_pend_one: { tr: `{n} talep onay bekliyor`, en: `{n} request waiting` },
    adm_ps_sr_paid: { tr: `ödendi`, en: `paid` },
    adm_ps_sr_unpaid: { tr: `ödenmedi`, en: `unpaid` },   // booking-admin (erteleme hakları + admin onayları)
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
  if (window._i18n && window._i18n.add) window._i18n.add(T);
  var mount = document.getElementById('admMount');
  if (mount) mount.outerHTML = "<div class=\"bk-admin-page adm\" id=\"admRoot\" data-tab=\"talepler\">\n  <div class=\"view\" id=\"view-admin\">\n    <div class=\"adm-layout\">\n      <aside class=\"adm-side\" aria-label=\"Yönetim menüsü\" data-bk-aria=\"adm_side_aria\">\n        <a class=\"adm-brand\" href=\"/\" aria-label=\"Berkay Er Academy — ana sayfa\" data-bk-aria=\"adm_home_aria\">\n          <span class=\"adm-mark\" aria-hidden=\"true\"><span class=\"adm-mark-strip be-ember\"></span>BE</span>\n          <span class=\"adm-brand-text\" aria-hidden=\"true\">BERKAY ER ACADEMY</span>\n        </a>\n        <nav class=\"adm-nav\" aria-labelledby=\"admNavManage\">\n          <span class=\"adm-nav-lbl\" id=\"admNavManage\" data-i18n=\"adm_nav_manage\">Yönetim</span>\n          <a class=\"adm-nav-a\" href=\"#adm-ozet\" data-adm-go=\"ozet\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/></svg><span data-i18n=\"adm_nav_summary\">Özet</span></a>\n          <a class=\"adm-nav-a\" href=\"#adm-talepler\" data-adm-go=\"talepler\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 4h16v12H8l-4 4z\"/></svg><span data-i18n=\"adm_nav_requests\">Gelen talepler</span><span class=\"adm-nav-count\" id=\"admNavReqCount\" hidden></span></a>\n          <a class=\"adm-nav-a\" href=\"#adm-kampanyalar\" data-adm-go=\"kampanyalar\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M20 12l-8 8-9-9V3h8z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.5\"/></svg><span data-i18n=\"adm_nav_campaigns\">Kampanyalar</span><span class=\"adm-nav-dot\" id=\"admNavCampDirty\" hidden></span></a>\n          <a class=\"adm-nav-a\" href=\"#adm-takvim\" data-adm-go=\"takvim\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"3\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/></svg><span data-i18n=\"adm_nav_calendar\">Haftalık takvim</span></a>\n          <a class=\"adm-nav-a\" href=\"#adm-musaitlik\" data-adm-go=\"musaitlik\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></svg><span data-i18n=\"adm_nav_avail\">Müsaitlik</span><span class=\"adm-nav-dot\" id=\"admNavAvailDirty\" hidden></span></a>\n          <a class=\"adm-nav-a\" href=\"#adm-ogrenciler\" data-adm-go=\"ogrenciler\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2 20c1-3.5 3.8-5 7-5s6 1.5 7 5M16 4a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.4 2.2 4 5\"/></svg><span data-i18n=\"adm_nav_students\">Aktif öğrenciler</span></a>\n          <a class=\"adm-nav-a\" href=\"#adm-mesajlar\" data-adm-go=\"mesajlar\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 20l1.4-4A8 8 0 1 1 8 19z\"/></svg><span data-i18n=\"adm_nav_messages\">WhatsApp &amp; sorular</span><span class=\"adm-nav-count adm-nav-count--ok\" id=\"admNavWaCount\" hidden></span></a>\n          <a class=\"adm-nav-a\" href=\"#adm-iletisim\" data-adm-go=\"iletisim\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 7l9 6 9-6\"/></svg><span data-i18n=\"adm_nav_contact\">E-posta &amp; duyurular</span></a>\n        </nav>\n        <nav class=\"adm-nav\" aria-labelledby=\"admNavSite\">\n          <span class=\"adm-nav-lbl\" id=\"admNavSite\" data-i18n=\"adm_nav_site\">Site</span>\n          <button type=\"button\" class=\"adm-nav-a\" data-adm-preview><span data-i18n=\"adm_nav_student_view\">Öğrenci görünümü</span> <span aria-hidden=\"true\">→</span></button>\n          <a class=\"adm-nav-a\" href=\"/ableton-lab\">Ableton Lab</a>\n          <a class=\"adm-nav-a\" href=\"/forum\" data-i18n=\"nav_forum\">Forum</a>\n        </nav>\n        <div class=\"adm-user\">\n          <a class=\"adm-user-link\" href=\"/profile\">\n            <span class=\"adm-user-ava\" id=\"admUserAva\" aria-hidden=\"true\"></span>\n            <span class=\"adm-user-txt\"><span class=\"adm-user-name\" id=\"admUserName\"></span><span class=\"adm-user-role\" data-i18n=\"adm_role\">Admin</span></span>\n            <span class=\"sr-only\">— <span data-i18n=\"nav_profile\">Profil</span></span>\n          </a>\n          <div class=\"adm-user-tools\">\n            <div class=\"be-lang adm-lang\" role=\"group\" aria-label=\"Dil\" data-bk-aria=\"be_lang\"><button type=\"button\" class=\"lang-btn\" data-lang=\"tr\">TR</button><button type=\"button\" class=\"lang-btn\" data-lang=\"en\">EN</button></div>\n            <button type=\"button\" class=\"adm-iconbtn\" id=\"admSignOut\" aria-label=\"Çıkış yap\" data-bk-aria=\"ui_signout\" title=\"Çıkış yap\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10\"/></svg></button>\n          </div>\n        </div>\n      </aside>\n\n      <div class=\"adm-main\">\n        <div class=\"adm-mtop\">\n          <button type=\"button\" class=\"adm-back\" data-adm-preview><span aria-hidden=\"true\">←</span> <span data-i18n=\"adm_nav_student_view\">Öğrenci görünümü</span></button>\n        </div>\n\n        <header class=\"adm-head be-rv\" id=\"adm-ozet\">\n          <div class=\"adm-head-text\">\n            <span class=\"adm-eyebrow\"><span class=\"be-live\" aria-hidden=\"true\"></span><span data-i18n=\"adm_eyebrow\">Ders paneli · Yönetici</span></span>\n            <h1 class=\"adm-h1\"><span data-i18n=\"adm_h1_a\">Admin</span> <em data-i18n=\"adm_h1_b\">paneli</em></h1>\n          </div>\n          <div class=\"adm-month\" role=\"group\" aria-label=\"İstatistik ayı\" data-bk-aria=\"adm_month_aria\">\n            <button type=\"button\" class=\"adm-iconbtn\" id=\"admMonthPrev\" aria-label=\"Önceki ay\" data-bk-aria=\"adm_month_prev\">‹</button>\n            <span class=\"adm-month-lbl\" id=\"admMonthLabel\" aria-live=\"polite\"></span>\n            <button type=\"button\" class=\"adm-iconbtn\" id=\"admMonthNext\" aria-label=\"Sonraki ay\" data-bk-aria=\"adm_month_next\">›</button>\n          </div>\n        </header>\n\n        <section class=\"adm-stats be-rv be-d1\" id=\"adminStatsCard\" aria-label=\"Aylık istatistikler\" data-bk-aria=\"adm_stats_aria\">\n          <div class=\"adm-stats-tiles\">\n            <div class=\"adm-rev be-ember-top\">\n              <div class=\"adm-rev-main\">\n                <span class=\"adm-k adm-k--gold\" id=\"admRevLabel\"></span>\n                <span class=\"adm-rev-val\"><span id=\"admRevVal\">0</span> ₺</span>\n                <span class=\"adm-k\" id=\"admRevSub\"></span>\n                <span class=\"adm-rev-note\" data-i18n=\"adm_rev_note\">Ödemesi bu ay onaylanan paketlerin toplamı (ders ayına göre değil)</span>\n              </div>\n              <span class=\"adm-rev-bars\" aria-hidden=\"true\"><i class=\"be-grow-y\"></i><i class=\"be-grow-y be-d1\"></i><i class=\"be-grow-y be-d2\"></i><i class=\"be-grow-y be-d3\"></i><i class=\"be-grow-y be-d4\"></i></span>\n            </div>\n            <div class=\"adm-tile adm-tile--lessons\">\n              <span class=\"adm-k\" data-i18n=\"adm_stat_lessons\">Bu ay ders</span>\n              <span class=\"adm-tile-row\"><span class=\"adm-tile-val\" id=\"admStatLessons\">0</span><span class=\"adm-k\" id=\"admStatActive\"></span></span>\n            </div>\n            <div class=\"adm-tile adm-tile--pend\">\n              <span class=\"adm-k\" data-i18n=\"adm_stat_pending_pay\">Bekleyen talep · ödeme</span>\n              <span class=\"adm-tile-row\"><span class=\"adm-tile-val adm-gold\" id=\"admStatPending\">0</span><span class=\"adm-tile-sep\" aria-hidden=\"true\">/</span><span class=\"adm-tile-val adm-err\" id=\"admStatUnpaid\">0</span></span>\n            </div>\n            <div class=\"adm-tile adm-tile--m\"><span class=\"adm-tile-val\" id=\"admMStudents\">0</span><span class=\"adm-k\" data-i18n=\"adm_stat_active_students\">Aktif öğrenci</span></div>\n            <div class=\"adm-tile adm-tile--m\"><span class=\"adm-tile-val adm-gold\" id=\"admMPending\">0</span><span class=\"adm-k\" data-i18n=\"adm_stat_pending_req\">Bekleyen talep</span></div>\n            <div class=\"adm-tile adm-tile--m\"><span class=\"adm-tile-val adm-err\" id=\"admMUnpaid\">0</span><span class=\"adm-k\" data-i18n=\"adm_stat_unpaid\">Ödeme bekliyor</span></div>\n          </div>\n          <details class=\"adm-perstu\" id=\"admPerStu\" open>\n            <summary class=\"adm-perstu-sum\"><span class=\"adm-k\" data-i18n=\"adm_stat_per_student\">Öğrenci bazında</span><span class=\"adm-k\" id=\"admPerStuCount\"></span><svg class=\"adm-chev\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\"/></svg></summary>\n            <div id=\"adminStatsContent\" class=\"adm-perstu-list\"></div>\n          </details>\n        </section>\n\n        <nav class=\"adm-tabs\" aria-label=\"Bölümler\" data-bk-aria=\"adm_tabs_aria\">\n          <button type=\"button\" class=\"adm-tab\" data-adm-tab-btn=\"talepler\" aria-pressed=\"true\"><span data-i18n=\"adm_tab_requests\">Talepler</span><span class=\"adm-tab-badge\" id=\"admTabReqCount\" hidden></span></button>\n          <button type=\"button\" class=\"adm-tab\" data-adm-tab-btn=\"takvim\" aria-pressed=\"false\"><span data-i18n=\"adm_tab_calendar\">Takvim</span></button>\n          <button type=\"button\" class=\"adm-tab\" data-adm-tab-btn=\"musaitlik\" aria-pressed=\"false\"><span data-i18n=\"adm_nav_avail\">Müsaitlik</span></button>\n          <button type=\"button\" class=\"adm-tab\" data-adm-tab-btn=\"ogrenciler\" aria-pressed=\"false\"><span data-i18n=\"adm_tab_students\">Öğrenciler</span></button>\n          <button type=\"button\" class=\"adm-tab\" data-adm-tab-btn=\"kampanyalar\" aria-pressed=\"false\"><span data-i18n=\"adm_nav_campaigns\">Kampanyalar</span></button>\n          <button type=\"button\" class=\"adm-tab\" data-adm-tab-btn=\"mesajlar\" aria-pressed=\"false\"><span data-i18n=\"adm_tab_messages\">Mesajlar</span><span class=\"adm-tab-badge adm-tab-badge--ok\" id=\"admTabWaCount\" hidden></span></button>\n        </nav>\n\n        <div class=\"adm-grid-req be-rv be-d2\" data-adm-tab=\"talepler\">\n          <section class=\"adm-panel\" id=\"adm-talepler\" aria-labelledby=\"admReqTitle\">\n            <div class=\"adm-panel-head\">\n              <h2 class=\"adm-h2\" id=\"admReqTitle\" data-i18n=\"adm_req_title\">Gelen talepler</h2>\n              <span class=\"adm-k\" data-i18n=\"adm_req_hint\">Onay → takvime işlenir + WhatsApp</span>\n            </div>\n            <div id=\"admToday\" class=\"adm-today\" role=\"region\" aria-label=\"Bugünkü dersler\" data-bk-aria=\"adm_today_aria\" hidden></div>\n            <div id=\"adminDisputesList\" class=\"adm-reqs adm-disputes\" aria-label=\"Ders itirazları\" data-bk-aria=\"adm_cfm_disputes_aria\" hidden></div>\n            <div id=\"adminRequestsCard\"><div id=\"adminRequestsList\" class=\"adm-reqs\"></div></div>\n          </section>\n          <div class=\"adm-req-side\">\n            <section class=\"adm-panel adm-panel--sm\" id=\"adminZoomCard\" aria-labelledby=\"admZoomTitle\">\n              <div class=\"adm-panel-head\">\n                <h3 class=\"adm-h3\" id=\"admZoomTitle\" data-i18n=\"adm_zoom_title\">Zoom linki</h3>\n                <span class=\"adm-chip adm-chip--ok\" id=\"admZoomChip\" hidden data-i18n=\"adm_zoom_active\">Aktif</span>\n              </div>\n              <label class=\"sr-only\" for=\"adminZoomInput\" data-i18n=\"adm_zoom_title\">Zoom linki</label>\n              <input id=\"adminZoomInput\" class=\"input input-sm input-mono\" type=\"url\" inputmode=\"url\" autocomplete=\"off\" placeholder=\"https://zoom.us/j/…\">\n              <div class=\"adm-btn2\">\n                <button type=\"button\" id=\"adminZoomSave\" class=\"btn btn-sm btn-primary\" data-i18n=\"adm_zoom_save\">Linki kaydet</button>\n                <button type=\"button\" id=\"adminZoomCreate\" class=\"btn btn-sm btn-subtle\" data-i18n=\"adm_zoom_create2\">Yeni toplantı oluştur</button>\n              </div>\n              <p class=\"adm-note\" data-i18n=\"adm_zoom_help\">Linki kaydet: elindeki Zoom linkini yapıştır. Yeni toplantı oluştur: Zoom'da yeni toplantı açar ve öğrencilerin gördüğü linki değiştirir.</p>\n              <div id=\"adminZoomStatus\" class=\"form-status\" role=\"status\"></div>\n              <div id=\"adminZoomJoinLink\"></div>\n            </section>\n            <section class=\"adm-panel adm-panel--sm\" aria-labelledby=\"admPriceTitle\">\n              <h3 class=\"adm-h3\" id=\"admPriceTitle\" data-i18n=\"adm_price_title\">Ders başı ücret (TL)</h3>\n              <div class=\"adm-prices\">\n                <div class=\"adm-price\"><span class=\"adm-k\" data-i18n=\"adm_price_monthly\">Aylık · saat başı</span><span class=\"adm-price-val\" id=\"admPriceMonthly\"></span></div>\n                <div class=\"adm-price\"><span class=\"adm-k\" data-i18n=\"adm_price_single\">Tek ders</span><span class=\"adm-price-val\" id=\"admPriceSingle\"></span></div>\n              </div>\n              <p class=\"adm-note\" data-i18n=\"adm_price_note\">Liste fiyatları sabittir; kampanya indirimleri bu saat ücretinden hesaplanır.</p>\n            </section>\n          </div>\n        </div>\n\n        <section class=\"adm-panel adm-panel--accent adm-camp be-rv be-d3\" id=\"adm-kampanyalar\" data-adm-tab=\"kampanyalar\" aria-labelledby=\"admCampTitle\">\n          <div class=\"adm-panel-head adm-panel-head--end\">\n            <div class=\"adm-titles\">\n              <h2 class=\"adm-h2\" id=\"admCampTitle\" data-i18n=\"adm_nav_campaigns\">Kampanyalar</h2>\n              <p class=\"adm-desc\" data-i18n=\"adm_camp_desc\">Öğrencinin ders panelinde görünen paketler. İndirim, saat ve durum değişiklikleri aşağıdaki önizlemeye anında yansır; öğrenciler \"Kampanyaları yayınla\" ile görür.</p>\n            </div>\n            <div class=\"adm-camp-base\">\n              <span class=\"adm-cb\"><span class=\"adm-k\" data-i18n=\"adm_camp_base\">Saat başı liste</span><span class=\"adm-camp-baseval adm-gold\" id=\"admCampBase\"></span></span>\n              <span class=\"adm-cb\"><span class=\"adm-k\" data-i18n=\"adm_price_single\">Tek ders</span><span class=\"adm-camp-baseval\" id=\"admCampSingle\"></span></span>\n            </div>\n          </div>\n          <div class=\"adm-camp-status\" id=\"admCampStatus\" role=\"status\"></div>\n          <div class=\"adm-ctable\">\n            <div class=\"adm-crow adm-chead\" aria-hidden=\"true\">\n              <span data-i18n=\"adm_camp_col_pkg\">Paket · süre</span><span data-i18n=\"adm_camp_col_hours\">Toplam saat</span><span data-i18n=\"adm_camp_col_disc\">İndirim</span><span data-i18n=\"adm_camp_col_list\">Liste</span><span data-i18n=\"adm_camp_col_save\">Kazanç</span><span data-i18n=\"adm_camp_col_pay\">Ödenecek</span><span class=\"adm-c-r\" data-i18n=\"adm_camp_col_status\">Durum</span>\n            </div>\n            <div id=\"admCampRows\" class=\"adm-crows\"></div>\n            <div class=\"adm-cfoot\">\n              <button type=\"button\" class=\"btn btn-sm btn-dashed\" id=\"admCampAdd\" data-i18n=\"adm_camp_add\">+ Yeni kampanya</button>\n              <div class=\"adm-cstats\" id=\"admCampStats\"></div>\n            </div>\n          </div>\n          <div class=\"adm-cbottom\">\n            <div class=\"adm-cprev\"><span class=\"adm-k\" data-i18n=\"adm_camp_preview\">Öğrenci önizlemesi</span><span class=\"adm-cprev-chips\" id=\"admCampPreview\"></span></div>\n            <div class=\"adm-cbtns\">\n              <button type=\"button\" class=\"btn btn-sm btn-subtle\" id=\"admCampRevert\" hidden data-i18n=\"adm_camp_revert\">Değişiklikleri geri al</button>\n              <button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"admCampPublish\" data-i18n=\"adm_camp_publish\">Kampanyaları yayınla</button>\n            </div>\n          </div>\n        </section>\n\n        <section class=\"adm-panel adm-cal be-rv be-d3\" id=\"adm-takvim\" data-adm-tab=\"takvim\" aria-labelledby=\"admCalTitle\">\n          <div class=\"adm-panel-head\">\n            <h2 class=\"adm-h2\" id=\"admCalTitle\" data-i18n=\"adm_nav_calendar\">Haftalık takvim</h2>\n            <div class=\"adm-cal-tools\">\n              <div class=\"adm-legend\" aria-hidden=\"true\">\n                <span><i class=\"adm-lg adm-lg--m\"></i><span data-i18n=\"adm_cal_monthly\">Aylık</span></span>\n                <span><i class=\"adm-lg adm-lg--s\"></i><span data-i18n=\"adm_price_single\">Tek ders</span></span>\n                <span><i class=\"adm-lg adm-lg--t\"></i><span data-i18n=\"adm_cal_trial\">Deneme</span></span>\n                <span><i class=\"adm-lg adm-lg--off\"></i><span data-i18n=\"adm_cal_closed\">Kapalı</span></span>\n              </div>\n              <div class=\"adm-weeknav\">\n                <button type=\"button\" class=\"adm-iconbtn\" id=\"calPrev\" aria-label=\"Önceki hafta\" data-bk-aria=\"adm_week_prev\">‹</button>\n                <span id=\"calWeekLabel\" class=\"adm-week-lbl\" aria-live=\"polite\"></span>\n                <button type=\"button\" class=\"adm-iconbtn\" id=\"calNext\" aria-label=\"Sonraki hafta\" data-bk-aria=\"adm_week_next\">›</button>\n              </div>\n            </div>\n          </div>\n          <div id=\"adminCalendar\"></div>\n        </section>\n\n        <section class=\"adm-panel adm-avail be-rv be-d4\" id=\"adm-musaitlik\" data-adm-tab=\"musaitlik\" aria-labelledby=\"admAvailTitle\">\n          <div class=\"adm-panel-head adm-panel-head--end\">\n            <div class=\"adm-titles\">\n              <h2 class=\"adm-h2\" id=\"admAvailTitle\" data-i18n=\"adm_nav_avail\">Müsaitlik</h2>\n              <p class=\"adm-desc\" data-i18n=\"adm_avail_desc\">Günleri aç/kapat, saat hücrelerine dokunarak kapat. Kapalı saatler öğrencinin saat tablosunda \"Dolu\" görünür ve seçilemez; \"Kaydet\" ile yayına girer ve takvime yansır.</p>\n            </div>\n            <div class=\"adm-avail-act\">\n              <span class=\"adm-k adm-k--gold\" id=\"admAvailCount\" aria-live=\"polite\"></span>\n              <button type=\"button\" class=\"btn btn-sm btn-subtle adm-mob-only\" id=\"admAvailNights\" data-i18n=\"adm_avail_nights_all\">Tüm geceleri kapat</button>\n              <button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"admAvailSave\" data-i18n=\"adm_save\">Kaydet</button>\n            </div>\n          </div>\n          <div id=\"adminAvailDaysCard\" class=\"adm-avail-box\">\n            <div id=\"adminAvailDaysList\"></div>\n            <div class=\"adm-legend adm-legend--avail\" aria-hidden=\"true\">\n              <span><i class=\"adm-lg adm-lg--open\"></i><span data-i18n=\"adm_avail_open\">Açık</span></span>\n              <span><i class=\"adm-lg adm-lg--blocked\"></i><span data-i18n=\"adm_avail_blocked\">Kapalı saat</span></span>\n              <span><i class=\"adm-lg adm-lg--m\"></i><span data-i18n=\"adm_avail_lesson\">Ders var</span></span>\n              <span><i class=\"adm-lg adm-lg--off\"></i><span data-i18n=\"adm_avail_dayoff\">Gün kapalı</span></span>\n            </div>\n          </div>\n          <div id=\"adminAvailStatus\" class=\"form-status\" role=\"status\"></div>\n        </section>\n\n        <section class=\"adm-panel adm-stu-sec be-rv be-d5\" id=\"adm-ogrenciler\" data-adm-tab=\"ogrenciler\" aria-labelledby=\"admStuTitle\">\n          <div class=\"adm-panel-head\">\n            <h2 class=\"adm-h2\" id=\"admStuTitle\" data-i18n=\"adm_nav_students\">Aktif öğrenciler</h2>\n            <span class=\"adm-k\" data-i18n=\"adm_stu_hint\">Satıra tıkla → detay</span>\n          </div>\n          <div id=\"adminStudentsList\" class=\"adm-stus\"></div>\n        </section>\n\n        <section class=\"adm-msgs\" id=\"adm-mesajlar\" data-adm-tab=\"mesajlar\" aria-label=\"WhatsApp ve öğrenci soruları\" data-bk-aria=\"adm_nav_messages\">\n          <div class=\"adm-panel adm-wa\" id=\"adminWhatsAppCard\">\n            <div class=\"adm-wa-col\">\n              <div class=\"adm-wa-colhead\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 20l1.4-4A8 8 0 1 1 8 19z\"/></svg>\n                <h3 class=\"adm-h3\">WhatsApp</h3>\n                <span id=\"waUnreadTotal\" class=\"adm-k adm-wa-unread\"></span>\n              </div>\n              <div id=\"waChatList\" class=\"adm-wa-list\">\n                <div id=\"waChatListEmpty\" class=\"adm-empty\" data-i18n=\"adm_wa_empty\">Henüz mesaj yok.</div>\n              </div>\n            </div>\n            <div class=\"adm-wa-main\">\n              <div class=\"adm-wa-head\">\n                <button type=\"button\" class=\"adm-iconbtn adm-wa-back\" id=\"admWaBack\" aria-label=\"Sohbet listesine dön\" data-bk-aria=\"adm_wa_back\">‹</button>\n                <span id=\"waChatHeader\" data-i18n=\"adm_wa_pick\">Sohbet seçin</span>\n              </div>\n              <div id=\"waChatMessages\" class=\"adm-wa-msgs\" aria-live=\"polite\"></div>\n              <div id=\"waChatInputRow\" class=\"adm-wa-input\" hidden>\n                <label class=\"sr-only\" for=\"waChatInput\" data-i18n=\"adm_wa_msg_label\">Mesaj</label>\n                <textarea id=\"waChatInput\" class=\"textarea adm-wa-ta\" rows=\"1\" placeholder=\"Mesaj yaz…\" data-i18n-ph=\"adm_wa_placeholder\" aria-describedby=\"admWaHint\"></textarea>\n                <button type=\"button\" id=\"waChatSend\" class=\"adm-wa-send\" data-i18n=\"adm_send\">Gönder</button>\n              </div>\n              <p class=\"adm-wa-hint\" id=\"admWaHint\"><span data-i18n=\"adm_wa_hint_rule\">24 saat kuralı: öğrenci son 24 saatte yazmadıysa serbest metin reddedilir.</span> <span class=\"adm-wa-keys\" data-i18n=\"adm_wa_hint_keys\">Enter gönderir, Shift+Enter yeni satır.</span></p>\n              <div id=\"waChatStatus\" class=\"form-status adm-wa-status\" role=\"status\"></div>\n            </div>\n          </div>\n          <div class=\"adm-panel adm-qa\" aria-labelledby=\"admQaTitle\">\n            <div class=\"adm-panel-head\">\n              <h2 class=\"adm-h2 adm-h2--sm\" id=\"admQaTitle\" data-i18n=\"adm_qa_title\">Öğrenci soruları</h2>\n              <span class=\"adm-k adm-k--gold\" id=\"admQaOpen\"></span>\n            </div>\n            <p class=\"adm-desc\" data-i18n=\"adm_qa_desc\">Öğrencilerin sorduğu sorular. Yanıtla ya da \"Çözüldü\" olarak işaretle.</p>\n            <div id=\"adminQAList\" class=\"adm-qa-list\"></div>\n          </div>\n          <div class=\"adm-panel be-asst-adm\" id=\"beAsstAdmin\" aria-labelledby=\"beAsstAdmT\" hidden></div>\n        </section>\n\n        <section class=\"adm-contact\" id=\"adm-iletisim\" data-adm-tab=\"mesajlar\" aria-label=\"E-posta ve duyurular\" data-bk-aria=\"adm_nav_contact\">\n          <div class=\"adm-panel adm-panel--sm\">\n            <h3 class=\"adm-h3s\" data-i18n=\"adm_rem_title\">E-posta hatırlatmaları</h3>\n            <p class=\"adm-desc\" data-i18n=\"adm_rem_desc\">Ödeme yapmamış, yaklaşan dersi olan öğrenciler. Her gün 06:00'da otomatik gönderilir; buradan hemen de gönderebilirsin.</p>\n            <button type=\"button\" class=\"adm-rem-sum\" id=\"admRemToggle\" aria-expanded=\"false\" aria-controls=\"adminRemindersList\">\n              <span id=\"admRemCount\"></span>\n              <span class=\"adm-k\"><span data-i18n=\"adm_rem_next\">Sonraki</span>: 06:00</span>\n              <svg class=\"adm-chev\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\"/></svg>\n            </button>\n            <div id=\"adminRemindersList\" class=\"adm-rem-list\" hidden></div>\n            <button type=\"button\" class=\"btn btn-subtle adm-push\" id=\"admRemindAll\" data-i18n=\"adm_rem_send_now\">Şimdi manuel gönder</button>\n            <div id=\"admRemindStatus\" class=\"form-status\" role=\"status\"></div>\n          </div>\n          <div class=\"adm-panel adm-panel--sm\">\n            <h3 class=\"adm-h3s\" data-i18n=\"adm_ann_title\">Ders paneli duyuruları</h3>\n            <p class=\"adm-desc\" data-i18n=\"adm_ann_desc\">Yalnızca ders alan öğrencilerin panelinde görünür.</p>\n            <label class=\"sr-only\" for=\"lessonAnnTa\" data-i18n=\"adm_ann_label\">Duyuru</label>\n            <textarea id=\"lessonAnnTa\" class=\"textarea\" rows=\"3\" placeholder=\"Öğrencilere özel duyuru, hatırlatma veya güncelleme…\" data-i18n-ph=\"adm_ann_placeholder\"></textarea>\n            <div class=\"adm-btn2 adm-btn2--wide\">\n              <button type=\"button\" id=\"lessonAnnDelAll\" class=\"btn btn-sm btn-danger\" data-i18n=\"adm_ann_delall\">Tümünü sil</button>\n              <button type=\"button\" id=\"lessonAnnSend\" class=\"btn btn-sm btn-primary\" data-i18n=\"adm_send\">Gönder</button>\n            </div>\n            <span id=\"lessonAnnStatus\" class=\"form-status\" role=\"status\"></span>\n            <div id=\"lessonAnnList\" class=\"adm-ann-list\"></div>\n          </div>\n          <div class=\"adm-panel adm-panel--sm adm-promo be-ember-top\">\n            <h3 class=\"adm-h3s\" data-i18n=\"adm_promo_title\">Tanıtım maili</h3>\n            <p class=\"adm-desc adm-desc--soft\" data-i18n=\"adm_promo_desc\">Siteye kayıtlı, henüz ders almayan tüm üyelere ders tanıtım maili gönder.</p>\n            <button type=\"button\" id=\"promoEmailBtn\" class=\"btn btn-light adm-push\" data-i18n=\"adm_promo_send\">Tüm üyelere gönder</button>\n            <div id=\"promoEmailStatus\" class=\"form-status\" role=\"status\"></div>\n          </div>\n          <div class=\"adm-panel adm-panel--sm adm-promo be-ember-top adm-ev\">\n            <h3 class=\"adm-h3s\" data-i18n=\"adm_ev_title\">Etkinlik duyurusu</h3>\n            <p class=\"adm-desc adm-desc--soft\" data-i18n=\"adm_ev_desc\">Etkinlik duyurusunu siteye kayıtlı herkese (öğrenciler dahil) gönderir. Önce kendine test gönder.</p>\n            <div class=\"adm-btn1\">\n              <button type=\"button\" id=\"eventMailTest\" class=\"btn btn-ghost\" data-i18n=\"adm_ev_test\">Kendime test gönder</button>\n              <button type=\"button\" id=\"eventMailSend\" class=\"btn btn-light\" data-i18n=\"adm_ev_send\">Herkese gönder</button>\n            </div>\n            <div id=\"eventMailStatus\" class=\"form-status\" role=\"status\"></div>\n          </div>\n        </section>\n      </div><!-- .adm-main -->\n    </div><!-- .adm-layout -->\n  </div><!-- #view-admin -->\n</div><!-- #admRoot -->";
})();

// ─── Seviye belirleme sınavı (admin görünümü) ─────────────
// Sonuçlar canlı dinlenir; satırlardaki rozetler yerinde güncellenir.
var _ptMap = {};              // uid -> sonuç
var _ptAdminUnsub = null;

function ptWatchAll() {
  if (_ptAdminUnsub) { _ptAdminUnsub(); _ptAdminUnsub = null; }
  return new Promise(resolve => {
    let first = true;
    _ptAdminUnsub = db.collection('placement_tests').onSnapshot(snap => {
      _ptMap = {};
      snap.forEach(d => { _ptMap[d.id] = d.data(); });
      ptRefreshBadges();
      if (first) { first = false; resolve(); }
    }, e => { console.warn('[placement admin]', e); if (first) { first = false; resolve(); } });
  });
}

// Satırlara gömülen rozet: <span class="badge ..." data-pt-uid="UID">
// asButton: satırın kendisi düğme değilse (talep satırı, öğrenci detayı) klavyeyle ulaşılan
// <button> — detay + "Sınavı Sıfırla" başka yoldan açılmıyor. Öğrenci satırı zaten <button>: span kalır.
function ptBadgeHtml(uid, asButton) {
  const d = _ptMap[uid];
  const tag = asButton ? 'button' : 'span';
  // Eski / eksik belgede level_tr olmayabilir: level → puandan hesap → boş ("undefined" yazılmaz)
  let lvl = '';
  if (d) {
    const en = window._i18n?.getLang() === 'en';
    lvl = (en ? (d.level_en || d.level_tr) : d.level_tr) || '';
    if (!lvl && window.bkQuiz && typeof bkQuiz.levelFor === 'function' && typeof d.score === 'number') {
      try { const lf = bkQuiz.levelFor(d.score); lvl = (lf && (en ? (lf.en || lf.tr) : lf.tr)) || ''; } catch (e) { lvl = ''; }
    }
    if (!lvl && typeof d.level === 'string') lvl = d.level;
  }
  const text = d ? `${lvl ? lvl + ' · ' : ''}${typeof d.score === 'number' ? d.score : '?'}/100` : bkT('adm_pt_pending', 'Sınav bekleniyor');
  const title = d ? bkT('adm_pt_detail_title', 'Detay için tıkla') : bkT('adm_pt_pending_title', 'Seviye belirleme sınavı henüz çözülmedi');
  const tone = !d ? 'warn' : d.score >= 76 ? 'accent' : d.score >= 51 ? 'info' : d.score >= 26 ? 'ok' : '';
  const btnAttrs = asButton ? ` type="button" aria-label="${escHtml(text + ' — ' + bkT('adm_pt_detail_aria', 'seviye sınavı detayı'))}"` : '';
  return `<${tag} class="badge ${tone} name-badge${asButton ? ' adm-ptbtn' : ''}" data-pt-uid="${escHtml(uid)}" title="${escHtml(title)}"${btnAttrs}>${escHtml(text)}</${tag}>`;
}

function ptRefreshBadges() {
  document.querySelectorAll('[data-pt-uid]').forEach(el => {
    const uid = el.getAttribute('data-pt-uid');
    const tmp = document.createElement('div');
    tmp.innerHTML = ptBadgeHtml(uid, el.tagName === 'BUTTON');
    const fresh = tmp.firstElementChild;
    el.className = fresh.className;
    el.textContent = fresh.textContent;
    el.title = fresh.title;
    if (fresh.hasAttribute('aria-label')) el.setAttribute('aria-label', fresh.getAttribute('aria-label'));
  });
}

function ptOpenAdminDetail(uid) {
  const d = _ptMap[uid];
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  const modal = document.createElement('div'); modal.className = 'modal modal-lg';
  overlay.append(modal);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  if (!d) {
    modal.innerHTML = `<button class="modal-close" aria-label="Kapat">✕</button>
      <div class="modal-title">Seviye Belirleme</div>
      <div class="modal-body">Bu öğrenci sınavı henüz çözmedi.</div>`;
    modal.querySelector('.modal-close').onclick = () => overlay.remove();
    document.body.append(overlay);
    return;
  }

  const when = d.completed_at?.toDate ? d.completed_at.toDate().toLocaleString('tr-TR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
  // Sınav büyüyebilir: eski sonuçlarda sadece o gün sorulan sorular listelenir,
  // sonradan eklenen sorular "bilmiyorum" gibi görünmesin.
  const askedQs = (window.bkQuiz?.questions || []).filter(q => d.answers && Object.prototype.hasOwnProperty.call(d.answers, q.id));
  // Belgedeki sayılar öğrencinin yazdığı veridir — HTML'e yalnız sayı olarak girer
  const ptNum = v => (typeof v === 'number' && isFinite(v)) ? String(v) : '?';
  const verNote = (d.quiz_version && window.bkQuiz && d.quiz_version !== window.bkQuiz.VERSION)
    ? `<div>Bu sonuç sınavın ${escHtml(ptNum(d.quiz_version))}. sürümüyle alındı (${escHtml(ptNum(d.total))} soru).</div>`
    : '';
  const rows = (askedQs.length ? askedQs : (window.bkQuiz?.questions || [])).map((q, i) => {
    const given = d.answers ? d.answers[q.id] : undefined;
    const isUnknown = given === (window.bkQuiz?.UNKNOWN ?? -1) || given == null;
    const isRight = !isUnknown && given === q.answer;
    const givenText = isUnknown ? 'Bilmiyorum' : (Number.isInteger(given) && Object.prototype.hasOwnProperty.call(q.tr.options, given) ? q.tr.options[given] : '—');
    const mark = isRight ? '<span class="text-ok">doğru</span>' : (isUnknown ? '<span class="text-info">bilmiyorum</span>' : '<span class="text-err">yanlış</span>');
    return `<div class="pt-review-row">
        <div><strong>${i+1}.</strong> ${q.tr.q} — ${mark}</div>
        <div class="pt-review-a">Cevabı: ${givenText}${isRight ? '' : ` &nbsp;·&nbsp; Doğrusu: ${q.tr.options[q.answer]}`}</div>
      </div>`;
  }).join('');

  modal.innerHTML = `<button class="modal-close" aria-label="Kapat">✕</button>
    <div class="modal-title">Seviye Belirleme — ${escHtml(d.student_name || d.student_email || uid)}</div>
    <div class="modal-body">
      <div class="be-callout be-callout--accent pt-sum"><div>
        <span class="pt-sum-title">${escHtml(d.level_tr)} · ${escHtml(ptNum(d.score))}/100</span>
        <div>${escHtml(ptNum(d.correct))}/${escHtml(ptNum(d.total))} doğru · ${escHtml(ptNum(d.unknown || 0))} "bilmiyorum" · ${escHtml(when)}</div>
        ${verNote}
      </div></div>
      ${rows}
      <div class="pt-foot">
        <button class="btn btn-danger btn-sm" id="ptResetBtn">Sınavı Sıfırla</button>
        <button class="btn btn-ghost" id="ptDetailClose">Kapat</button>
      </div>
    </div>`;
  modal.querySelector('.modal-close').onclick = () => overlay.remove();
  modal.querySelector('#ptDetailClose').onclick = () => overlay.remove();
  modal.querySelector('#ptResetBtn').onclick = async () => {
    if (!await admConfirm(bkT('adm_pt_reset_b', 'Bu öğrencinin sınav sonucu silinecek; öğrenci sınavı yeniden çözebilir.'), { title: bkT('adm_pt_reset_t', 'Sınavı sıfırla'), ok: bkT('adm_pt_reset_ok', 'Sınavı sıfırla'), danger: true })) return;
    try {
      await db.collection('placement_tests').doc(uid).delete();
      toast('✓ Sınav sıfırlandı, öğrenci yeniden çözebilir.');
      overlay.remove();
    } catch(e) { const c = errId(); toast(`Hata (${c}): ` + (e.message || e.code), true); }
  };
  document.body.append(overlay);
}

// Rozet tıklaması — satırlar innerHTML ile kurulduğu için delege ediyoruz
document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-pt-uid]');
  if (!el) return;
  e.stopPropagation();
  ptOpenAdminDetail(el.getAttribute('data-pt-uid'));
});

// ─── Admin Panel (AdminPaneli / M_AdminPaneli) ───────────
// Yerleşim markup'ta (#admRoot, .adm-*); burada veri + eylemler. Admin metinleri
// Türkçe yedekli bkT('adm_*') anahtarları (i18n/booking-admin.json). Öğrencinin yazdığı
// her metin (ad, not, soru, WhatsApp) escHtml ya da textContent ile basılır.
var _admBooted = false;          // ilk girişte kampanyalar tazeden okunur
var _admLastReqSnap = null;      // son lesson_requests (pending) anlık görüntüsü
var _admStudDocs = [];           // [{ id, d }] son reservations görüntüsü (tekilleştirilmiş)
var _admStudLoaded = false;
var _admOpenStu = new Set();     // açık öğrenci satırları (yeniden çizimde korunur)
var _admPastOpen = new Set();    // geçmiş dersleri açık öğrenciler
var _admPastArch = new Set();    // gizlenen (archived) geçmiş dersleri de gösterilen öğrenciler
var _admNoteDrafts = {};         // kaydedilmemiş özel not taslakları (uid → metin)
var _admShowFinished = false;    // paketi biten öğrenciler de listelensin mi
var _admMonthOffset = 0;         // istatistik ayı (0 = bu ay)
var _admReqCount = 0, _admUnpaidCount = 0, _admWaUnread = 0, _admActiveStuCount = 0;
var _admAsstOpen = 0;   // yanıt bekleyen asistan soruları (be-assistant-ui.js admin kartı yazar)
var _admStatsDrawn = false;
var _admCalLessons = [];
var _admLessonSlots = new Set(); // 'dow_HH:MM' — önümüzdeki 90 günde dersi olan saatler
var _admTab = 'talepler';        // ≤1024 bölüm sekmesi
var _admChromeBound = false;
const _admDesktopMq = window.matchMedia('(min-width:1025px)');
const _admNarrowMq = window.matchMedia('(max-width:1279px)');

// "1 lesson" / "3 lessons" (TR'de ikisi de "ders")
function admLessonsLc(n) { return n === 1 ? bkT('adm_lesson_lc_one', 'ders') : bkT('adm_lessons_lc', 'ders'); }
function admSet(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function admStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('is-ok', kind === 'ok');
  el.classList.toggle('is-err', kind === 'err');
  el.style.color = '';
}
function admLoadingHtml() { return `<div class="adm-empty">${escHtml(bkT('bk_loading', 'Yükleniyor…'))}</div>`; }
function admInitial(name) { return (String(name || '?').trim().charAt(0) || '?').toLocaleUpperCase('tr-TR'); }
function admAvaHtml(photo, name, cls) {
  return `<span class="${cls || 'adm-ava'}" aria-hidden="true">${photo ? `<img src="${escHtml(photo)}" alt="" loading="lazy">` : escHtml(admInitial(name))}</span>`;
}
function admBtn(label, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = cls; b.textContent = label;
  if (onClick) b.onclick = onClick;
  return b;
}
function admLocale() { return window._i18n?.getLang() === 'en' ? 'en-US' : 'tr-TR'; }
function admReduced() { return bkPrefersReducedMotion(); }
// Türkçe iyelik: "Aktif Öğrenci" → "Aktif Öğrenci'nin", "Berkay" → "Berkay'ın"; EN → "Name's"
function admPoss(name) {
  const n = String(name || '').trim() || bkT('adm_student', 'Öğrenci');
  if (window._i18n?.getLang() === 'en') return `${n}'s`;
  const low = n.toLocaleLowerCase('tr-TR');
  const vowels = 'aeıioöuü';
  let last = '';
  for (let i = low.length - 1; i >= 0; i--) { if (vowels.includes(low[i])) { last = low[i]; break; } }
  const suf = ('ei'.includes(last) ? 'in' : 'aı'.includes(last) ? 'ın' : 'ou'.includes(last) ? 'un' : 'ün');
  return `${n}'${vowels.includes(low[low.length - 1]) ? 'n' : ''}${suf}`;
}
// Admin onay / soru penceresi (native confirm()/prompt() yerine; bkDialog: odak tuzağı, Esc).
// o: { eyebrow, title, body (HTML — çağıran escHtml'ler), ok, cancel, danger,
//      input: { label, placeholder, value, multiline, required }, check: { label (HTML), checked },
//      choices: [{ label, value, cls }] (Tamam yerine alt alta seçenekler) }
// → Vazgeç / Esc / dışarı: null · aksi: { value (seçenek ya da true), text, checked }
function admAsk(o) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal modal-sm adm-ask';
    const inId = 'admAskIn' + Math.random().toString(36).slice(2, 7);
    const inp = o.input;
    box.innerHTML = `${o.eyebrow ? `<div class="field-label ${o.danger ? 'text-err' : 'text-accent'}">${escHtml(o.eyebrow)}</div>` : ''}
      <div class="modal-title">${escHtml(o.title)}</div>
      ${o.body ? `<div class="modal-body adm-ask-body">${o.body}</div>` : ''}
      ${inp ? `<label class="field-label adm-ask-lbl" for="${inId}">${escHtml(inp.label || '')}</label>
        ${inp.multiline ? `<textarea id="${inId}" class="textarea" rows="3"></textarea>` : `<input id="${inId}" type="text" class="input" autocomplete="off">`}` : ''}
      ${o.check ? `<label class="check-row adm-ask-check"><input type="checkbox" class="adm-ask-cb"${o.check.checked ? ' checked' : ''}><span>${o.check.label}</span></label>` : ''}
      <div class="modal-actions ${o.choices ? 'modal-actions-stack' : 'modal-actions-fill'}"></div>`;
    overlay.append(box);
    document.body.append(overlay);
    const field = inp ? box.querySelector('#' + inId) : null;
    if (field) { field.placeholder = inp.placeholder || ''; field.value = inp.value || ''; }
    const cb = box.querySelector('.adm-ask-cb');
    let done = false;
    const finish = v => {
      if (done) return;
      if (v !== null && inp && inp.required && !field.value.trim()) { field.classList.add('is-invalid'); field.focus(); return; }
      done = true; close();
      resolve(v === null ? null : { value: v, text: field ? field.value.trim() : '', checked: cb ? cb.checked : false });
    };
    const close = bkDialog(overlay, box, { title: '.modal-title', focus: inp ? '#' + inId : '.adm-ask-ok', escape: () => finish(null) });
    const row = box.querySelector('.modal-actions');
    const mk = (label, cls, v, extra) => { const b = admBtn(label, `btn ${cls}${extra ? ' ' + extra : ''}`, () => finish(v)); row.append(b); return b; };
    if (o.choices) {
      o.choices.forEach((c, i) => mk(c.label, c.cls || 'btn-ghost', c.value, i === 0 ? 'adm-ask-ok' : ''));
      mk(o.cancel || bkT('bk_sc_cancel', 'Vazgeç'), 'btn-ghost', null);
    } else {
      mk(o.cancel || bkT('bk_sc_cancel', 'Vazgeç'), 'btn-ghost', null);
      mk(o.ok || bkT('bk_ok', 'Tamam'), o.danger ? 'btn-danger' : 'btn-primary', true, 'adm-ask-ok');
    }
    if (field && !inp.multiline) field.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(o.choices ? o.choices[0].value : true); } });
    overlay.onclick = e => { if (e.target === overlay) finish(null); };
  });
}
// Bilgi toast'ı + "Geri al" düğmesi (8 sn)
// Kısa onay (düz metin gövde): admConfirm(metin, { title, ok, danger }) → true/false
function admConfirm(text, o = {}) {
  return bkConfirm({ title: o.title || bkT('adm_confirm_t', 'Emin misin?'), body: text ? `<p>${escHtml(text)}</p>` : '', ok: o.ok, danger: !!o.danger });
}
function admToastUndo(msg, undo) {
  const w = document.getElementById('toastWrap');
  if (!w) return;
  const t = document.createElement('div');
  t.className = 'toast ok adm-toast-undo';
  t.setAttribute('role', 'status');
  const s = document.createElement('span'); s.textContent = msg; t.append(s);
  if (undo) t.append(admBtn(bkT('adm_undo', 'Geri al'), 'adm-toast-btn', () => { t.remove(); undo(); }));
  w.append(t);
  setTimeout(() => t.remove(), 8000);
}
// Bir dersin admin listesindeki satırını açar, ona kaydırır ve ··· menüsünü açar (takvim, "Bugün")
function admOpenLesson(uid, date, time) {
  _admOpenStu.add(uid);
  admRenderStudents();
  if (!document.getElementById('admStuDet-' + uid)) { _admShowFinished = true; admRenderStudents(); }
  admGoto('ogrenciler');
  setTimeout(() => {
    const row = document.querySelector(`#admStuDet-${CSS.escape(uid)} [data-lkey="${CSS.escape(date + '_' + time)}"]`);
    const target = row || document.getElementById('admStuDet-' + uid)?.closest('.adm-stu');
    if (!target) return;
    target.scrollIntoView({ behavior: 'auto', block: 'center' });
    if (!row) return;
    row.classList.add('is-flash');
    setTimeout(() => row.classList.remove('is-flash'), 1600);
    const dots = row.querySelector('.adm-dots');
    if (dots) requestAnimationFrame(() => dots.click());
  }, 60);
}
// Yeni / değişen saat seçicisi: o günün dolu (başka öğrenci) ve kapalı saatlerini işaretler.
// İlk seçenek "Saat seç" (boş) — Kaydet bir saat seçilene kadar pasif.
async function admTimeOptionsHtml(date, uid, currentTime) {
  const taken = {};
  try {
    const snap = await db.collection('booked_slots').where('date', '==', date).get();
    snap.forEach(d => { const x = d.data(); if (x.time) taken[x.time] = x.student_uid || ''; });
  } catch (e) { /* okunamazsa işaretsiz liste */ }
  const nameOf = id => { const s = _admStudDocs.find(x => x.id === id); return s ? (s.d.student_name || s.d.student_email || '').split(' ')[0] : ''; };
  const av = (_admAvail && _admAvail.saved) || null;
  const dow = date ? dateStrToObj(date).getDay() : -1;
  const dayOff = !!(av && Array.isArray(av.days) && dow >= 0 && !av.days.includes(dow));
  const blocked = (av && av.blocked && Array.isArray(av.blocked[dow])) ? av.blocked[dow] : [];
  const opts = AVAILABLE_TIMES.map(t => {
    if (t === currentTime) return `<option value="" disabled>${t} — ${escHtml(bkT('adm_tp_current', 'şu anki saat'))}</option>`;
    const who = taken[t];
    if (who !== undefined && who !== uid) return `<option value="${t}" disabled>${t} — ${escHtml(bkT('adm_tp_taken', 'dolu'))}${nameOf(who) ? ` (${escHtml(nameOf(who))})` : ''}</option>`;
    if (who === uid) return `<option value="${t}" disabled>${t} — ${escHtml(bkT('adm_tp_own', 'bu öğrencinin dersi'))}</option>`;
    if (dayOff || blocked.includes(t)) return `<option value="${t}">${t} — ${escHtml(bkT('adm_tp_closed', 'kapalı saat'))}</option>`;
    return `<option value="${t}">${t}</option>`;
  }).join('');
  return `<option value="" selected>${escHtml(bkT('adm_tp_pick', 'Saat seç'))}</option>${opts}`;
}

// ── Kabuk: masaüstünde admin kendi yan paneliyle başlıksız ve footer'sız (TASARIM §7.1
// beShell.hide); ≤1024'te kabuğun mobil üst çubuğu + sekme çubuğu kalır.
var _admShellOn = false;
function admShell(on) {
  _admShellOn = !!on;
  document.documentElement.classList.toggle('bk-admin', _admShellOn);
  admSyncShell();
}
function admSyncShell() {
  const sh = window.beShell;
  if (!sh) return;
  if (_admShellOn && _admDesktopMq.matches) sh.hide(['header', 'footer']);
  else sh.show(['header', 'footer']);
}
function admOnLayoutChange() {
  admSyncShell();
  const ps = document.getElementById('admPerStu');
  if (ps) ps.open = _admDesktopMq.matches || ps.open;
  if (_admShellOn) { admRenderAvail(); }
}
if (_admDesktopMq.addEventListener) _admDesktopMq.addEventListener('change', admOnLayoutChange);
if (_admNarrowMq.addEventListener) _admNarrowMq.addEventListener('change', () => { if (_admShellOn) admRenderAvail(); });

// Çıkışta admin dinleyicileri kapanır ve yerel durum sıfırlanır
function admStopListeners() {
  [_adminReqUnsub, _adminStudUnsub, _adminAccessUnsub, _adminQAUnsub, _waListUnsub, _waMsgUnsub, _ptAdminUnsub].forEach(u => { if (typeof u === 'function') { try { u(); } catch (e) {} } });
  _adminReqUnsub = _adminStudUnsub = _adminAccessUnsub = _adminQAUnsub = null;
  _waListUnsub = _waMsgUnsub = _ptAdminUnsub = null;
  _adminQAAnswerUnsubs.forEach(u => u()); _adminQAAnswerUnsubs = [];
  _admBooted = false; _admLastReqSnap = null; _admStudDocs = []; _admStudLoaded = false;
  _admOpenStu.clear(); _admPastOpen.clear(); _admPastArch.clear(); _admNoteDrafts = {}; _admSpyLock = null;
  _admCamp = { list: [], dirty: false };
  _admAvail = { days: null, blocked: {}, saved: null, dirty: false, loaded: false };
  _bkAdminPreview = false;
  _bkDemoReq = _bkDemoRes = null;
  bkPreviewGuard(false);
  document.documentElement.classList.remove('bk-admin-preview');
}

async function renderAdminPanel() {
  if (!_user || _user.email !== ADMIN_EMAIL) return;
  // Preserve scroll position across re-renders so admin actions
  // (cancel/delete/etc.) don't yank the viewport back to the top.
  const _scrollSnap = window.scrollY;
  const _restoreScroll = () => window.scrollTo({ top: _scrollSnap, behavior: 'instant' });
  requestAnimationFrame(_restoreScroll);
  setTimeout(_restoreScroll, 200);
  setTimeout(_restoreScroll, 600);
  setTimeout(_restoreScroll, 1200);
  if (_dashResUnsub) { _dashResUnsub(); _dashResUnsub = null; }
  if (_qaUnsub) { _qaUnsub(); _qaUnsub = null; }
  _qaAnswerUnsubs.forEach(u => u()); _qaAnswerUnsubs = [];
  if (_accessListenUnsub) { _accessListenUnsub(); _accessListenUnsub = null; }
  if (_pendingListenUnsub) { _pendingListenUnsub(); _pendingListenUnsub = null; }
  if (_adminAccessUnsub) { _adminAccessUnsub(); _adminAccessUnsub = null; }
  if (_adminReqUnsub) { _adminReqUnsub(); _adminReqUnsub = null; }
  if (_adminStudUnsub) { _adminStudUnsub(); _adminStudUnsub = null; }
  _bkAdminPreview = false;
  _bkDemoReq = _bkDemoRes = null;
  bkPreviewGuard(false);
  bkPrevDemoBar();
  document.documentElement.classList.remove('bk-admin-preview');
  showView('view-admin');
  admInitChrome();
  initAdminAvailDays();
  initAdminWhatsAppTest();
  initAdminZoomLink();
  initLessonAnnouncements(true);
  initAdminQA();

  // İlk açılışta "Yükleniyor"; sonraki yeniden çizimlerde eski içerik yerinde kalır (titreme yok)
  const reqList = document.getElementById('adminRequestsList');
  if (!_admLastReqSnap) reqList.innerHTML = admLoadingHtml();
  const studList = document.getElementById('adminStudentsList');
  if (!_admStudLoaded) studList.innerHTML = admLoadingHtml();
  // Seviye sonuçları (rozetler) ve kampanyalar (talep fiyatı) talep listesinden önce hazır olsun
  await Promise.all([ptWatchAll(), loadCampaigns(!_admBooted)]);
  _admBooted = true;
  admCampInit();

  // Auto-migrate: set hasLessonRequest:true for existing requesters (runs once per session)
  if (!window._migrationDone) {
    window._migrationDone = true;
    db.collection('lesson_requests').limit(500).get().then(allReqs => {
      const uids = [...new Set(allReqs.docs.map(d => d.data().from_uid).filter(Boolean))];
      if (!uids.length) return;
      const b = db.batch();
      uids.forEach(uid => b.set(db.collection('users').doc(uid), { hasLessonRequest: true }, { merge: true }));
      b.commit().catch(() => {});
    }).catch(() => {});
  }

  let _reqInitialLoad = true;
  _adminReqUnsub = db.collection('lesson_requests')
    .where('status','==','pending')
    .onSnapshot(reqSnap => {
      // Play sound on new requests after initial load
      if (!_reqInitialLoad) {
        const hasNew = reqSnap.docChanges().some(c => c.type === 'added');
        if (hasNew) {
          try {
            const a = new Audio('assets/audio/bildirim sesi.wav');
            a.play().catch(() => {});
          } catch(e) {}
        }
      }
      _reqInitialLoad = false;
      _admLastReqSnap = reqSnap;
      renderAdminRequests(reqSnap);
      // ders satırlarındaki "erteleme/iptal talebi bekliyor" işaretleri
      if (_admStudLoaded) admRenderStudents();
    }, e => { const c=errId(); reqList.innerHTML = `<div class="adm-empty is-err">Hata (${c}): ${escHtml(e.message)}</div>`; });

  // Load active students (real-time)
  _adminStudUnsub = db.collection('reservations').orderBy('created_at','desc').limit(200)
    .onSnapshot(studSnap => renderAdminStudents(studSnap),
      e => { const c=errId(); studList.innerHTML = `<div class="adm-empty is-err">${escHtml(bkT('adm_stu_err', 'Öğrenciler yüklenemedi'))} (${c}): ${escHtml(e.message||e.code)}</div>`; });
}

// ── Liste fiyatları: "Ders başı ücret" kartında düzenlenir, settings/campaigns'e yazılır ──
// Kayıtta birim fiyatı rezervasyonunda olmayan öğrencilerin fiyatı eski liste fiyatında sabitlenir
// (price_source 'list'); yeni onaylar o günkü fiyatı zaten yazar (reservationPriceFields).
function admPriceSync() {
  const m = document.getElementById('admPriceInM'), s = document.getElementById('admPriceInS');
  if (m && document.activeElement !== m) m.value = LESSON_PRICE;
  if (s && document.activeElement !== s) s.value = LESSON_PRICE_SINGLE;
  admSet('admCampBase', tlFmt(LESSON_PRICE));
  admSet('admCampSingle', tlFmt(LESSON_PRICE_SINGLE));
}
function admPriceEditor() {
  const cell = document.getElementById('admPriceMonthly');
  const card = cell && cell.closest('.adm-panel');
  if (!card) return;
  if (!card.dataset.edit) {
    card.dataset.edit = '1';
    [['admPriceMonthly', 'admPriceInM'], ['admPriceSingle', 'admPriceInS']].forEach(([spanId, inId]) => {
      const span = document.getElementById(spanId);
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = '100'; inp.max = '100000'; inp.step = '50'; inp.inputMode = 'numeric';
      inp.className = 'input input-sm input-mono'; inp.id = inId;
      inp.setAttribute('aria-label', span.previousElementSibling ? span.previousElementSibling.textContent : '');
      span.textContent = ''; span.append(inp);
    });
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn btn-sm btn-primary'; btn.id = 'admPriceSave';
    btn.setAttribute('data-i18n', 'adm_price_save'); btn.textContent = bkT('adm_price_save', 'Fiyatları kaydet');
    btn.onclick = admPriceSave;
    const st = document.createElement('div'); st.className = 'form-status'; st.id = 'admPriceStatus'; st.setAttribute('role', 'status');
    card.querySelector('.adm-prices').after(btn, st);
  }
  admPriceSync();
  // kampanya belgesi okununca güncel fiyatlar alanlara yansır
  loadCampaigns().then(admPriceSync);
}
async function admPriceSave() {
  const btn = document.getElementById('admPriceSave'), status = document.getElementById('admPriceStatus');
  const m = Math.round(Number(document.getElementById('admPriceInM').value));
  const sg = Math.round(Number(document.getElementById('admPriceInS').value));
  const ok = v => isFinite(v) && v >= 100 && v <= 100000;
  if (!ok(m) || !ok(sg)) { admStatus(status, 'Fiyat 100 ile 100.000 TL arasında olmalı.', 'err'); return; }
  if (m === LESSON_PRICE && sg === LESSON_PRICE_SINGLE) { admStatus(status, 'Değişiklik yok.', ''); return; }
  const oldM = LESSON_PRICE, oldS = LESSON_PRICE_SINGLE;
  // tüm rezervasyonlar (panel listesi created_at'siz eski kayıtları göstermez)
  let all;
  try { all = (await db.collection('reservations').get()).docs.map(doc => ({ id: doc.id, d: doc.data() })); }
  catch (e) { const c = errId(); admStatus(status, `Hata (${c}): ` + (e.message || e.code), 'err'); return; }
  const freeze = all.filter(({ d }) => d && d.lesson_type !== 'trial' && d.price_source !== 'package'
    && !(d.custom_lesson_price > 0) && typeof d.custom_total_price !== 'number');
  const msg = `Saat başı ${tlFmt(oldM)} → ${tlFmt(m)}, tek ders ${tlFmt(oldS)} → ${tlFmt(sg)}. `
    + 'Kampanya paketleri ile bekleyen ve yeni talepler yeni fiyattan hesaplanır. '
    + (freeze.length ? `Mevcut ${freeze.length} öğrencinin fiyatı eski fiyatta sabitlenir.` : 'Mevcut öğrencilerin fiyatı değişmez.');
  if (!await admConfirm(msg, { title: bkT('adm_price_save', 'Fiyatları kaydet'), ok: bkT('adm_price_save', 'Fiyatları kaydet') })) return;
  btn.disabled = true;
  try {
    const batch = db.batch();
    batch.set(db.collection('settings').doc('campaigns'), { list_price: m, single_price: sg, prices_updated_at: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    freeze.forEach(({ id, d }) => batch.update(db.collection('reservations').doc(id), { custom_lesson_price: d.lesson_type === 'single' ? oldS : oldM, price_source: 'list' }));
    await batch.commit();
    LESSON_PRICE = m; LESSON_PRICE_SINGLE = sg;
    admPriceSync();
    if (typeof admCampRender === 'function') admCampRender();
    if (_admLastReqSnap) renderAdminRequests(_admLastReqSnap);
    admStatus(status, '✓ Fiyatlar kaydedildi.', 'ok');
  } catch (e) { const c = errId(); admStatus(status, `Hata (${c}): ` + (e.message || e.code), 'err'); }
  btn.disabled = false;
}

// ── Yan panel, sekmeler, ay seçici, kullanıcı kartı (bağlama bir kez) ──
function admInitChrome() {
  const name = _user.displayName?.trim() || _user.email?.split('@')[0] || '';
  admSet('admUserName', name);
  const ava = document.getElementById('admUserAva');
  if (ava) {
    ava.textContent = '';
    if (_user.photoURL) { const i = document.createElement('img'); i.src = _user.photoURL; i.alt = ''; ava.append(i); }
    else ava.textContent = admInitial(name);
  }
  admPriceEditor();
  admSyncLang();
  admSetMonthLabel();
  admSetTab(_admTab, false);
  const ps = document.getElementById('admPerStu');
  if (ps && !_admChromeBound) ps.open = _admDesktopMq.matches;
  if (_admChromeBound) return;
  _admChromeBound = true;
  // masaüstünde "Öğrenci bazında" hep açık (akordeon yalnız ≤1024)
  ps?.querySelector('summary')?.addEventListener('click', e => { if (_admDesktopMq.matches) e.preventDefault(); });

  document.querySelectorAll('[data-adm-go]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); admGoto(a.dataset.admGo); }));
  document.querySelectorAll('[data-adm-tab-btn]').forEach(b => b.addEventListener('click', () => admSetTab(b.dataset.admTabBtn, true)));
  document.querySelectorAll('[data-adm-preview]').forEach(b => b.addEventListener('click', admStudentPreview));
  document.getElementById('admExitPreview')?.addEventListener('click', admExitPreview);
  document.querySelectorAll('.adm-lang .lang-btn').forEach(b => b.addEventListener('click', () => {
    if (window._i18n?.setLang) window._i18n.setLang(b.dataset.lang);
  }));
  document.getElementById('admSignOut').onclick = () => auth.signOut();
  document.getElementById('admMonthPrev').onclick = () => { _admMonthOffset--; admSetMonthLabel(); admRenderStats(); };
  document.getElementById('admMonthNext').onclick = () => { _admMonthOffset++; admSetMonthLabel(); admRenderStats(); };
  // Kampanyalar
  document.getElementById('admCampAdd').onclick = admCampAdd;
  document.getElementById('admCampPublish').onclick = admCampPublish;
  document.getElementById('admCampRevert').onclick = admCampRevert;
  const rows = document.getElementById('admCampRows');
  rows.addEventListener('click', admCampOnClick);
  rows.addEventListener('input', admCampOnInput);
  // Müsaitlik
  const mx = document.getElementById('adminAvailDaysList');
  mx.addEventListener('click', admAvailOnClick);
  mx.addEventListener('keydown', admAvailOnKey);
  document.getElementById('admAvailSave').onclick = admAvailSave;
  document.getElementById('admAvailNights').onclick = () => admAvailNights(null);
  // E-posta hatırlatmaları
  const remT = document.getElementById('admRemToggle');
  remT.onclick = () => {
    const list = document.getElementById('adminRemindersList');
    const open = remT.getAttribute('aria-expanded') !== 'true';
    remT.setAttribute('aria-expanded', open ? 'true' : 'false');
    list.hidden = !open;
  };
  document.getElementById('admRemindAll').onclick = admRemindAll;
  // Tanıtım maili
  const promoBtn = document.getElementById('promoEmailBtn');
  const promoStatus = document.getElementById('promoEmailStatus');
  promoBtn.onclick = async () => {
    // Alıcı sayısı: kayıtlı üye sayısından, ders kaydı olanlar (reservations) düşülerek tahmin edilir;
    // asıl liste sunucuda (sendPromoEmailAll) belirlenir.
    let members = null;
    try {
      const q = db.collection('users');
      members = typeof q.count === 'function' ? (await q.count().get()).data().count : (await q.get()).size;
    } catch (e) { /* sayılamazsa sayısız sorulur */ }
    const est = members !== null ? Math.max(0, members - _admStudDocs.length) : null;
    const okP = await bkConfirm({
      title: bkT('adm_promo_t', 'Tanıtım maili gönder'),
      body: `<p>${escHtml(est !== null
        ? bkT('adm_promo_b', 'Siteye kayıtlı {m} üyeden, henüz ders almayan yaklaşık {n} kişiye ders tanıtım e-postası gidecek.').replace('{m}', members).replace('{n}', est)
        : bkT('adm_promo_b2', 'Siteye kayıtlı, henüz ders almayan tüm üyelere ders tanıtım e-postası gidecek.'))}</p>
        <p class="adm-ask-note">${escHtml(bkT('adm_promo_n', 'Gönderim geri alınamaz.'))}</p>`,
      ok: est !== null ? bkT('adm_promo_ok', '~{n} kişiye gönder').replace('{n}', est) : bkT('adm_promo_send', 'Tüm üyelere gönder'),
    });
    if (!okP) return;
    const orig = promoBtn.textContent;
    promoBtn.disabled = true; promoBtn.textContent = bkT('adm_sending', 'Gönderiliyor…');
    admStatus(promoStatus, bkT('adm_wait', 'Lütfen bekleyin…'));
    try {
      const res = await firebase.app().functions('europe-west1').httpsCallable('sendPromoEmailAll')();
      admStatus(promoStatus, `✓ ${res.data.sent} kişiye gönderildi.`, 'ok');
    } catch(e) { const c=errId(); admStatus(promoStatus, `Hata (${c}): `+(e.message||e.code), 'err'); }
    promoBtn.disabled = false; promoBtn.textContent = orig;
  };
  // Etkinlik duyurusu (herkese): önce test, sonra gönderim. Sayılar ve çift gönderim koruması sunucuda
  // (sendAnnouncementEmail → count/test/send); aynı duyuru iki kez gitmez, yalnız henüz almayanlara gider.
  const evTest = document.getElementById('eventMailTest');
  const evSend = document.getElementById('eventMailSend');
  const evStatus = document.getElementById('eventMailStatus');
  // Gönderim yüzlerce e-postada dakikalar sürebilir: istemci zaman aşımı sunucununkine (540 sn) eşit
  // (varsayılan 70 sn olsaydı sunucu sürerken panel yanlış "zaman aşımı" gösterirdi)
  const evCall = (data) => firebase.app().functions('europe-west1')
    .httpsCallable('sendAnnouncementEmail', { timeout: data.mode === 'send' ? 540000 : 60000 })(data);
  evTest.onclick = async () => {
    const orig = evTest.textContent;
    evTest.disabled = true; evTest.textContent = bkT('adm_sending', 'Gönderiliyor…');
    admStatus(evStatus, bkT('adm_wait', 'Lütfen bekleyin…'));
    try {
      const r = await evCall({ mode: 'test' });
      admStatus(evStatus, bkT('adm_ev_test_ok', '✓ Test e-postası gönderildi: {to}').replace('{to}', r.data.to), 'ok');
    } catch (e) { const c = errId(); admStatus(evStatus, `Hata (${c}): ` + (e.message || e.code), 'err'); }
    evTest.disabled = false; evTest.textContent = orig;
  };
  evSend.onclick = async () => {
    admStatus(evStatus, bkT('adm_wait', 'Lütfen bekleyin…'));
    let st;
    try { st = (await evCall({ mode: 'count' })).data; }
    catch (e) { const c = errId(); admStatus(evStatus, `Hata (${c}): ` + (e.message || e.code), 'err'); return; }
    admStatus(evStatus, '');
    if (!st.pending) { admStatus(evStatus, bkT('adm_ev_none', 'Gönderilecek yeni alıcı yok — herkes duyuruyu zaten almış.'), 'ok'); return; }
    const okE = await bkConfirm({
      title: bkT('adm_ev_ct', 'Etkinlik duyurusunu herkese gönder'),
      body: `<p>${escHtml(bkT('adm_ev_cb', 'Siteye kayıtlı {n} kişiye (öğrenciler dahil) e-posta gidecek.').replace('{n}', st.pending))}${st.alreadySent ? ' ' + escHtml(bkT('adm_ev_cb2', '{k} kişi duyuruyu daha önce almış, atlanacak.').replace('{k}', st.alreadySent)) : ''}</p>
        <p class="adm-ask-note">${escHtml(bkT('adm_ev_cn', 'Gönderim geri alınamaz. Önce "Kendime test gönder" ile kontrol ettiğinden emin ol. Gönderim sırasında sayfayı kapatma.'))}</p>`,
      ok: bkT('adm_ev_ok', '{n} kişiye gönder').replace('{n}', st.pending),
    });
    if (!okE) return;
    const orig = evSend.textContent;
    evSend.disabled = evTest.disabled = true; evSend.textContent = bkT('adm_sending', 'Gönderiliyor…');
    admStatus(evStatus, bkT('adm_ev_wait', 'Gönderiliyor — birkaç dakika sürebilir, sayfayı kapatma…'));
    try {
      const r = (await evCall({ mode: 'send', confirm: true })).data;
      let msg = bkT('adm_ev_done', '✓ {n} kişiye gönderildi.').replace('{n}', r.sent);
      if (r.failed) msg += ' ' + bkT('adm_ev_failed', '{n} gönderim başarısız.').replace('{n}', r.failed);
      if (r.remaining) msg += ' ' + bkT('adm_ev_remaining', '{n} kişi kaldı — düğmeye tekrar bas (günlük e-posta sınırı için ertesi gün).').replace('{n}', r.remaining);
      admStatus(evStatus, msg, r.failed || r.remaining ? 'err' : 'ok');
    } catch (e) { const c = errId(); admStatus(evStatus, `Hata (${c}): ` + (e.message || e.code), 'err'); }
    evSend.disabled = evTest.disabled = false; evSend.textContent = orig;
  };
  // WhatsApp (≤1024: liste ↔ sohbet)
  document.getElementById('admWaBack').onclick = () => {
    document.getElementById('adminWhatsAppCard').classList.remove('is-thread');
    document.querySelector(`#waChatList .wa-thread.is-active`)?.focus();
  };
  // Sayfadan ayrılırken yayınlanmamış değişiklik uyarısı
  window.addEventListener('beforeunload', e => {
    if (!_admShellOn) return;
    if ((_admCamp && _admCamp.dirty) || (_admAvail && _admAvail.dirty)) { e.preventDefault(); e.returnValue = ''; }
  });
  admInitScrollSpy();
}

function admSyncLang() {
  const l = window._i18n?.getLang() || 'tr';
  document.querySelectorAll('.adm-lang .lang-btn').forEach(b => {
    const on = b.dataset.lang === l;
    b.classList.toggle('lang-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function admMonthKey(off) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + (off || 0)); return toDateStr(d).slice(0, 7); }
function admMonthName(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(admLocale(), { month: 'long', year: 'numeric' });
}
function admSetMonthLabel() { admSet('admMonthLabel', admMonthName(admMonthKey(_admMonthOffset))); }

const ADM_TAB_OF = { ozet: 'talepler', talepler: 'talepler', kampanyalar: 'kampanyalar', takvim: 'takvim', musaitlik: 'musaitlik', ogrenciler: 'ogrenciler', mesajlar: 'mesajlar', iletisim: 'mesajlar' };
function admSetTab(tab, userAction) {
  _admTab = ADM_TAB_OF[tab] || 'talepler';
  const root = document.getElementById('admRoot');
  if (root) root.dataset.tab = _admTab;
  document.querySelectorAll('[data-adm-tab-btn]').forEach(b => b.setAttribute('aria-pressed', b.dataset.admTabBtn === _admTab ? 'true' : 'false'));
  // Yatay kayan sekme şeridinde (601–1024) seçili sekme görünür alana gelsin
  const _pt = document.querySelector(`[data-adm-tab-btn="${_admTab}"]`), _strip = _pt && _pt.parentElement;
  if (_strip && _strip.scrollWidth > _strip.clientWidth + 1) {
    if (_pt.offsetLeft < _strip.scrollLeft) _strip.scrollLeft = Math.max(0, _pt.offsetLeft - 16);
    else if (_pt.offsetLeft + _pt.offsetWidth > _strip.scrollLeft + _strip.clientWidth) _strip.scrollLeft = _pt.offsetLeft + _pt.offsetWidth - _strip.clientWidth + 16;
  }
  if (userAction && !_admDesktopMq.matches) {
    // sekme çubuğu yapışkan: içerik başı sekmelerin hemen altına gelsin
    const tabs = document.querySelector('.adm-tabs');
    if (tabs) {
      const top = tabs.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--be-sticky-top')) || 0);
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
    }
    // gizliyken çizilen kaydırılabilir kaplar görünür olunca başlangıç saatine konumlansın
    if (_admTab === 'musaitlik') admRenderAvail();
    if (_admTab === 'takvim') renderAdminCalendar(_admCalLessons, _calWeekOffset);
  }
}
function admGoto(sec) {
  if (!_admDesktopMq.matches) { admSetTab(sec, true); return; }
  const el = document.getElementById('adm-' + sec);
  if (!el) return;
  el.scrollIntoView({ behavior: admReduced() ? 'auto' : 'smooth', block: 'start' });
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  try { el.focus({ preventScroll: true }); } catch (e) {}
  // Tıklanan bölüm, kullanıcı kendisi kaydırana kadar etkin kalır (son bölümler sayfa sonunda
  // tepeye çıkamadığı için kaydırma izleyicisi yanlış öğeyi seçiyordu)
  _admSpyLock = sec;
  admSetCurrent(sec);
}
var _admSpyLock = null;
function admSetCurrent(sec) {
  document.querySelectorAll('[data-adm-go]').forEach(a => {
    if (a.dataset.admGo === sec) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
}
function admInitScrollSpy() {
  // Masaüstü: görünümün üst %30'unu geçmiş son bölüm etkin; en üstte "Özet"
  const ids = ['ozet', 'talepler', 'kampanyalar', 'takvim', 'musaitlik', 'ogrenciler', 'mesajlar', 'iletisim'];
  let pend = false;
  const update = () => {
    pend = false;
    if (!_admShellOn || !_admDesktopMq.matches) return;
    if (_admSpyLock) { admSetCurrent(_admSpyLock); return; }
    const line = window.innerHeight * 0.3;
    let cur = 'ozet';
    ids.forEach(id => { const el = document.getElementById('adm-' + id); if (el && el.getBoundingClientRect().top <= line) cur = id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = ids[ids.length - 1];
    admSetCurrent(cur);
  };
  window.addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(update); } }, { passive: true });
  // Elle kaydırma (tekerlek, dokunma, klavye) kilidi kaldırır
  const unlock = () => { if (_admSpyLock) { _admSpyLock = null; update(); } };
  window.addEventListener('wheel', unlock, { passive: true });
  window.addEventListener('touchmove', unlock, { passive: true });
  window.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key) && !e.target.closest('input, textarea, select')) unlock(); });
  update();
}

// Kenar çubuğu / sekme / özet sayaçları
function admUpdateCounts() {
  const setBadge = (id, n) => { const el = document.getElementById(id); if (!el) return; el.textContent = n > 0 ? String(n) : ''; el.hidden = !(n > 0); };
  setBadge('admNavReqCount', _admReqCount + _admDisputeCount); setBadge('admTabReqCount', _admReqCount + _admDisputeCount);
  // "WhatsApp & sorular": okunmamış WhatsApp + yanıt bekleyen asistan soruları
  setBadge('admNavWaCount', _admWaUnread + _admAsstOpen); setBadge('admTabWaCount', _admWaUnread + _admAsstOpen);
  admSet('admStatPending', _admReqCount); admSet('admMPending', _admReqCount);
  admSet('admStatUnpaid', _admUnpaidCount); admSet('admMUnpaid', _admUnpaidCount);
  admSet('admMStudents', _admActiveStuCount);
}

// ── Öğrenci görünümü önizlemesi (demo) ──
// Yeni öğrencinin ilk ekranından (deneme dersi / kampanyalı paket) başlar, yayındaki kampanyalarla.
// Önizleme boyunca hiçbir şey kaydedilmez (bkPreviewGuard). Gönderilen talep öğrencinin göreceği
// ekranlarla demo olarak ilerler: bekleme ekranı → (Onaylanınca) panel → ödeme onaylı/bekliyor.
// Çıkınca demo silinir; bir sonraki önizleme yine seçim ekranından başlar.
function admStudentPreview() {
  if (!_user || _user.email !== ADMIN_EMAIL) return;
  if (_admCamp.dirty) toast(bkT('adm_prev_dirty', 'Önizleme yayındaki kampanyaları gösterir — değişikliklerin henüz yayınlanmadı.'));
  _bkAdminPreview = true;
  bkPreviewGuard(true);
  bkDemoReset();
  document.documentElement.classList.add('bk-admin-preview');
  renderAccessView(_user, 'none');
  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(() => document.getElementById('admExitPreview')?.focus({ preventScroll: true }), 60);
}
function admExitPreview() {
  bkStopStudentListeners();
  bkDemoReset();
  bkPreviewGuard(false);
  _bkAdminPreview = false;
  document.documentElement.classList.remove('bk-admin-preview');
  renderAdminPanel();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Önizleme boyunca Firestore yazmaları ve Cloud Functions çağrıları sunucuya gitmez: öğrenci
// ekranındaki her eylem (kural onayı, not, saat değiştirme, erteleme, ödeme bildirimi, soru,
// sınav…) demo olarak kalır. Çıkışta (admExitPreview / renderAdminPanel / oturum kapanışı) geri alınır.
function bkPreviewGuard(on) {
  if (!on === !_bkWriteGuard) return;
  if (!on) { const undo = _bkWriteGuard; _bkWriteGuard = null; undo(); return; }
  const F = firebase.firestore, saved = [];
  let lastToast = 0;
  const blocked = function () {
    const msg = bkT('adm_prev_blocked', 'Önizleme: bu işlem kaydedilmedi.');
    if (Date.now() - lastToast > 2500) { lastToast = Date.now(); toast(msg); }
    const e = new Error(msg); e.code = 'preview';
    return Promise.reject(e);
  };
  const patch = (o, name, fn) => {
    if (!o || typeof o[name] !== 'function') return;
    const own = Object.prototype.hasOwnProperty.call(o, name);
    saved.push([o, name, own ? o[name] : null, own]);
    o[name] = fn;
  };
  const proto = c => c && c.prototype;
  patch(proto(F.DocumentReference), 'set', blocked);
  patch(proto(F.DocumentReference), 'update', blocked);
  patch(proto(F.DocumentReference), 'delete', blocked);
  patch(proto(F.CollectionReference), 'add', blocked);
  patch(proto(F.WriteBatch), 'commit', blocked);
  patch(proto(F.Firestore), 'runTransaction', blocked);
  try { patch(firebase.app().functions('europe-west1'), 'httpsCallable', () => blocked); } catch (_) {}
  _bkWriteGuard = () => saved.reverse().forEach(([o, name, v, own]) => { if (own) o[name] = v; else delete o[name]; });
}

function bkDemoReset() {
  _bkDemoReq = _bkDemoRes = null;
  bkWkStop();
  bkPrevDemoBar();
}

// Demo talebi "gönderildi": öğrencinin göreceği bekleme ekranı (id '_' → dinleyici kurulmaz)
async function bkDemoPending(req) {
  if (!_bkAdminPreview) return;
  _bkDemoRes = null;
  _bkDemoReq = Object.assign({ from_uid: _user.uid, from_name: _user.displayName || '', from_email: _user.email || '',
    from_photo: _user.photoURL || '', status: 'pending', id: '_' }, req);
  toast(bkT('adm_prev_sent', 'Önizleme: talep kaydedilmedi — öğrencinin göreceği bekleme ekranı açıldı.'));
  await renderPendingView(_bkDemoReq);
  bkPrevDemoBar();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Admin onaylasaydı oluşacak rezervasyon (acceptRequest / acceptTrialRequest ile aynı alanlar), yalnız bellekte
function bkDemoApprove() {
  const r = _bkDemoReq;
  if (!_bkAdminPreview || !r) return;
  const now = firebase.firestore.Timestamp.now();
  const who = { student_uid: r.from_uid, student_name: r.from_name, student_email: r.from_email,
    student_phone: r.from_phone || '', student_photo: r.from_photo || '', note: r.note || '', created_at: now };
  let res;
  if (r.lesson_type === 'trial') {
    res = Object.assign(who, { duration_months: 0, schedule: [], start_date: r.trial_date, end_date: r.trial_date,
      lessons: [{ date: r.trial_date, time: r.trial_time, status: 'scheduled' }], reschedule_credits: {},
      lesson_type: 'trial', payment_confirmed: true });
  } else {
    const isSingle = r.lesson_type === 'single';
    const lessons = calculateLessonDates(r.schedule, isSingle ? 1 : r.duration_months, isSingle ? 1 : (r.lessons_per_month || 4),
      isSingle ? toDateStr(new Date()) : r.preferred_start_date);
    const credits = {}, t = new Date();
    for (let i = 0; i < r.duration_months; i++) {
      const d = new Date(t.getFullYear(), t.getMonth() + i, 1);
      credits[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 1;
    }
    const price = reservationPriceFields(r, lessons.length, null, () => undefined, { keepAdminPrice: true });
    Object.keys(price).forEach(k => { if (price[k] === undefined) delete price[k]; });
    res = Object.assign(who, { lesson_type: r.lesson_type || 'monthly', duration_months: r.duration_months,
      lessons_per_month: r.lessons_per_month || 4, preferred_start_date: r.preferred_start_date || '', schedule: r.schedule,
      start_date: r.preferred_start_date || toDateStr(new Date()), end_date: lessons.length ? lessons[lessons.length - 1].date : '',
      lessons, reschedule_credits: credits, payment_confirmed: false, payment_pending: false,
      rules_accepted_at: now, rules_accepted_detail: r.rules_accepted_detail || null, rules_version: r.rules_version || RULES_CONSENT_VERSION }, price);
  }
  _bkDemoRes = res;
  renderDashboard();
  bkPrevDemoBar();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function bkDemoPaid(on) {
  if (!_bkAdminPreview || !_bkDemoRes) return;
  _bkDemoRes = Object.assign({}, _bkDemoRes, { payment_confirmed: on, payment_pending: false });
  renderDashboard();
  bkPrevDemoBar();
}

// Önizleme çubuğundaki demo adımları
function bkPrevDemoBar() {
  const bar = document.getElementById('bkPrevDemo');
  if (!bar) return;
  bar.innerHTML = '';
  if (!_bkAdminPreview || !_bkDemoReq) { bar.hidden = true; return; }
  const add = (key, fb, fn, primary) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn btn-sm ' + (primary ? 'btn-primary' : 'btn-ghost');
    x.textContent = bkT(key, fb);
    x.onclick = fn;
    bar.append(x);
  };
  if (!_bkDemoRes) add('adm_prev_approve', 'Onaylanınca: paneli göster', bkDemoApprove, true);
  else if (_bkDemoRes.lesson_type !== 'trial') {
    if (_bkDemoRes.payment_confirmed) add('adm_prev_unpaid', 'Ödeme bekliyor hâli', () => bkDemoPaid(false));
    else add('adm_prev_paid', 'Ödeme onaylanınca', () => bkDemoPaid(true), true);
  }
  add('adm_prev_restart', 'Baştan başla', () => {
    bkStopStudentListeners();
    bkDemoReset();
    renderAccessView(_user, 'none');
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  bar.hidden = false;
}

// ── Gelen talepler ──
function admReqRow(o) {
  const row = document.createElement('article');
  row.className = 'adm-rq';
  row.innerHTML = `${admAvaHtml(o.photo, o.name)}
    <div class="adm-rq-main">
      <div class="adm-rq-top"><span class="adm-rq-name">${escHtml(o.name)}</span>${o.chip ? `<span class="adm-chip adm-chip--${o.tone}">${escHtml(o.chip)}</span>` : ''}${o.extra || ''}</div>
      ${(o.lines || []).map(l => `<div class="adm-rq-line">${l}</div>`).join('')}
      ${o.phone ? `<div class="adm-rq-phone">${escHtml(o.phone)}</div>` : ''}
      <div class="adm-rq-meta">${o.meta || ''}</div>
      ${o.note ? `<div class="adm-rq-note">${escHtml(bkT('adm_note', 'Not'))}: “${escHtml(o.note)}”</div>` : ''}
    </div>
    <div class="adm-rq-acts"></div>`;
  const meta = row.querySelector('.adm-rq-meta');
  if (!o.meta) meta.hidden = true;
  row.querySelector('.adm-rq-acts').append(...o.actions);
  return row;
}
function admPkgReasonLabel(reason) {
  return reason === 'inactive' ? bkT('adm_pkg_inactive', 'Kampanya pasif — liste fiyatı')
    : reason === 'removed' ? bkT('adm_pkg_removed', 'Kampanya kaldırılmış — liste fiyatı')
    : reason === 'unknown' ? bkT('adm_pkg_unknown', 'Kampanya bulunamadı — liste fiyatı')
    : bkT('adm_pkg_mismatch', 'Paket uyuşmuyor — liste fiyatı');
}
// Bekleyen yeni talepleri kampanya kimliğine göre sayar (kampanya editöründe "N TALEP")
function admPendingPkgRequests() {
  if (!_admLastReqSnap) return [];
  return _admLastReqSnap.docs.map(d => d.data()).filter(r => r.package_id && !r.type && (r.lesson_type || 'monthly') === 'monthly');
}

function renderAdminRequests(reqSnap) {
  const reqList = document.getElementById('adminRequestsList');
  if (!reqList) return;
  _admReqCount = reqSnap.size;
  admUpdateCounts();
  admCampRender();
  reqList.innerHTML = '';
  if (reqSnap.empty) {
    reqList.innerHTML = `<div class="adm-empty">${escHtml(window._i18n?.t('bk_no_requests') || 'Bekleyen talep yok.')}</div>`;
    return;
  }
  const sortedDocs = reqSnap.docs.slice().sort((a,b) => (b.data().created_at?.seconds||0) - (a.data().created_at?.seconds||0));
  sortedDocs.forEach(doc => {
    const r = doc.data();
    const who = r.from_name || r.from_email || '—';
    const isCancelReq = r.type === 'cancel_request';
    const isPaymentReq = r.type === 'payment_request';
    const isExtraReq = r.type === 'extra_lesson';
    const isReschedReq = r.type === 'reschedule_request';
    const isTimeChgReq = r.type === 'time_change_request';
    const lblReject = bkT('adm_reject', 'Reddet');

    if (isTimeChgReq) {
      // Öğrencinin aynı hafta içindeki saat değişikliği talebi: onayda ders taşınır, erteleme hakkı düşmez
      const approveBtn = admBtn(bkT('adm_rq_tc_ok', 'Onayla & taşı'), 'btn btn-sm btn-primary');
      const rejectBtn = admBtn(lblReject, 'btn btn-sm btn-danger');
      const stu = _admStudDocs.find(x => x.id === r.from_uid);
      const sL = stu ? stu.d.lessons || [] : [];
      const found = sL.some(l => l.date === r.lesson_date && l.time === r.lesson_time && (l.status === 'scheduled' || l.status === 'rescheduled'));
      const tags = [`<span class="adm-tag adm-tag--gold">${escHtml(bkT('adm_rq_tc_nocredit', 'Erteleme hakkı düşmez'))}</span>`];
      if (stu && !found) tags.push(`<span class="adm-tag adm-tag--err">${escHtml(bkT('adm_rq_nolesson', 'Ders bulunamadı (taşınmış ya da iptal)'))}</span>`);
      const row = admReqRow({ name: who, photo: r.from_photo, chip: bkT('adm_rq_tc', 'Saat değişikliği talebi'), tone: 'info',
        lines: [`${escHtml(bkSlotLabel(r.lesson_date, r.lesson_time))} <span class="adm-arrow" aria-hidden="true">→</span><span class="sr-only">→</span> <strong>${escHtml(bkSlotLabel(r.new_date, r.new_time))}</strong>`],
        meta: tags.join(''), actions: [rejectBtn, approveBtn] });
      approveBtn.onclick = async () => {
        approveBtn.disabled = true;
        try {
          const ok = await admApplyTimeChange(doc.ref, r);
          if (!ok) { approveBtn.disabled = false; return; }
          toast(bkT('adm_rq_tc_done', 'Ders yeni saate taşındı — öğrenciye WhatsApp ile bildirildi.'));
          row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); approveBtn.disabled = false; }
      };
      rejectBtn.onclick = async () => {
        const reason = await showInputModal({ title: bkT('adm_reject_reason', 'Reddetme sebebi'), placeholder: bkT('adm_optional', 'İsteğe bağlı…'), multiline: true });
        if (reason === null) return;
        rejectBtn.disabled = true;
        try {
          await doc.ref.update({ status: 'rejected', reject_reason: reason.trim(), updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          toast(bkT('adm_rq_tc_rejected', 'Saat değişikliği talebi reddedildi — ders eski saatinde kaldı, öğrenciye bildirildi.')); row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); rejectBtn.disabled = false; }
      };
      reqList.append(row);
      return;
    }

    if (isReschedReq) {
      const approveBtn = admBtn(bkT('adm_rq_resched_ok', 'Onayla & ertele'), 'btn btn-sm btn-primary');
      const rejectBtn = admBtn(lblReject, 'btn btn-sm btn-danger');
      // Önizleme onayla aynı hesaptan (admPlanReschedule): gerçek yeni tarih, zincir, hak etkisi
      const stu = _admStudDocs.find(x => x.id === r.from_uid);
      const sL = stu ? stu.d.lessons || [] : [];
      const sIdx = sL.findIndex(l => l.date === r.lesson_date && l.time === r.lesson_time && (l.status === 'scheduled' || l.status === 'rescheduled'));
      const plan = sIdx >= 0 ? admPlanReschedule(sL, sIdx) : null;
      const newDate = plan ? plan.moves[0].newDate : r.new_date;
      const cr = stu ? totalRescheduleCredits(stu.d) : null;
      const tags = [];
      if (cr !== null) tags.push(cr > 0
        ? `<span class="adm-tag adm-tag--gold">${escHtml(bkT('adm_rq_cr', 'Erteleme hakkı: {a} → {b} olacak').replace('{a}', cr).replace('{b}', cr - 1))}</span>`
        : `<span class="adm-tag adm-tag--err">${escHtml(bkT('adm_rq_cr_none', 'Hak yok — onaylarsan hak düşmez'))}</span>`);
      if (plan && plan.moves.length > 1) tags.push(`<span class="adm-tag">${escHtml((plan.moves.length === 2 ? bkT('adm_rq_cascade_one', '+{n} ders de 1 hafta kayar') : bkT('adm_rq_cascade', '+{n} ders de 1 hafta kayar')).replace('{n}', plan.moves.length - 1))}</span>`);
      if (stu && sIdx < 0) tags.push(`<span class="adm-tag adm-tag--err">${escHtml(bkT('adm_rq_nolesson', 'Ders bulunamadı (taşınmış ya da iptal)'))}</span>`);
      if (plan && r.new_date && r.new_date !== newDate) tags.push(`<span class="adm-tag">${escHtml(bkT('adm_rq_asked', 'Talep edilen: {date}').replace('{date}', formatDateStr(r.new_date)))}</span>`);
      const row = admReqRow({ name: who, photo: r.from_photo, chip: bkT('adm_rq_resched', 'Erteleme talebi'), tone: 'accent',
        lines: [`${escHtml(formatDateStr(r.lesson_date))} ${escHtml(r.lesson_time)} <span class="adm-arrow" aria-hidden="true">→</span><span class="sr-only">→</span> <strong>${escHtml(formatDateStr(newDate))} ${escHtml(r.lesson_time)}</strong>`],
        meta: tags.join(''), actions: [rejectBtn, approveBtn] });
      approveBtn.onclick = async () => {
        approveBtn.disabled = true;
        try {
          const resSnap = await db.collection('reservations').doc(r.from_uid).get();
          if (!resSnap.exists) { toast('Rezervasyon bulunamadı.', true); approveBtn.disabled = false; return; }
          const resLessons = resSnap.data().lessons || [];
          const li = resLessons.findIndex(l => l.date === r.lesson_date && l.time === r.lesson_time &&
            (l.status === 'scheduled' || l.status === 'rescheduled'));
          if (li < 0) {
            toast('Ders bulunamadı (taşınmış veya iptal edilmiş olabilir).', true);
            approveBtn.disabled = false; return;
          }
          // Admin erteleme akışı: +7 gün, çakışma zinciri, hak seçimi; talep aynı batch'te 'accepted'.
          const ok = await adminRescheduleLesson(r.from_uid, li, resLessons, resLessons[li], { request: true, requestRef: doc.ref });
          if (!ok) { approveBtn.disabled = false; return; }
          row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); approveBtn.disabled = false; }
      };
      rejectBtn.onclick = async () => {
        const reason = await showInputModal({ title: bkT('adm_reject_reason', 'Reddetme sebebi'), placeholder: bkT('adm_optional', 'İsteğe bağlı…'), multiline: true });
        if (reason === null) return;
        rejectBtn.disabled = true;
        try {
          await doc.ref.update({ status: 'rejected', reject_reason: reason.trim(), updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          toast(bkT('adm_rq_resched_rejected', 'Erteleme talebi reddedildi — öğrenciye WhatsApp ile bildirildi, hak düşmedi.')); row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); rejectBtn.disabled = false; }
      };
      reqList.append(row);
      return;
    }

    if (isExtraReq) {
      const approveBtn = admBtn(bkT('adm_approve', 'Onayla'), 'btn btn-sm btn-primary');
      const rejectBtn = admBtn(lblReject, 'btn btn-sm btn-danger');
      const row = admReqRow({ name: who, photo: r.from_photo, chip: bkT('adm_rq_extra', 'Ek ders talebi'), tone: 'info',
        lines: [`${escHtml(formatDateStr(r.lesson_date))} · ${escHtml(r.lesson_time)}–${escHtml(getEndTime(r.lesson_time))}`],
        actions: [rejectBtn, approveBtn] });
      approveBtn.onclick = async () => {
        approveBtn.disabled = true;
        try {
          const conflict = await db.collection('booked_slots').doc(r.lesson_date + '_' + r.lesson_time).get();
          if (conflict.exists && conflict.data().student_uid !== r.from_uid) {
            toast(`${formatDateStr(r.lesson_date)} ${r.lesson_time} başka bir öğrenciye ait.`, true);
            approveBtn.disabled = false; return;
          }
          const resSnap = await db.collection('reservations').doc(r.from_uid).get();
          if (!resSnap.exists) { toast('Rezervasyon bulunamadı.', true); approveBtn.disabled = false; return; }
          const existingLessons = resSnap.data().lessons || [];
          const newLesson = { date: r.lesson_date, time: r.lesson_time, status: 'scheduled' };
          // Paketli rezervasyon: ek ders paket dışıdır → toplam LESSON_PRICE artar (aynı batch)
          const extraPrice = extraLessonPriceFields(resSnap.data(), n => firebase.firestore.FieldValue.increment(n));
          const batch = db.batch();
          batch.set(db.collection('reservations').doc(r.from_uid), { lessons: [...existingLessons, newLesson], ...extraPrice }, {merge:true});
          batch.set(db.collection('booked_slots').doc(r.lesson_date + '_' + r.lesson_time), { date: r.lesson_date, time: r.lesson_time, student_uid: r.from_uid });
          batch.update(doc.ref, { status: 'accepted', updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          await batch.commit();
          toast(extraPrice.custom_total_price ? `✓ Ek ders eklendi — paket dışı, toplama +${tlFmt(LESSON_PRICE)}.` : '✓ Ek ders eklendi.'); row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); approveBtn.disabled = false; }
      };
      rejectBtn.onclick = async () => {
        rejectBtn.disabled = true;
        try {
          await doc.ref.update({ status: 'rejected', updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          toast('Talep reddedildi.'); row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); rejectBtn.disabled = false; }
      };
      reqList.append(row);
      return;
    }

    if (isPaymentReq) {
      const approveBtn = admBtn(bkT('adm_rq_paid_ok', 'Ödendi onayla'), 'btn btn-sm btn-primary');
      const rejectBtn = admBtn(lblReject, 'btn btn-sm btn-danger');
      const row = admReqRow({ name: who, photo: r.from_photo, chip: bkT('adm_rq_payment', 'Ödeme talebi'), tone: 'ok',
        lines: [`<strong>${escHtml(Number(r.total_price || 0).toLocaleString('tr-TR'))} TL</strong>`],
        meta: ' ', actions: [rejectBtn, approveBtn] });
      // total_price öğrencinin tarayıcısında yazılır — rezervasyondaki gerçek tutarla
      // karşılaştır (öğrenci paneliyle aynı formül: reservationTotalPrice).
      db.collection('reservations').doc(r.from_uid).get().then(rs => {
        const pills = row.querySelector('.adm-rq-meta');
        if (!pills) return;
        pills.hidden = false; pills.textContent = '';
        if (!rs.exists) { pills.insertAdjacentHTML('beforeend', `<span class="adm-tag adm-tag--err">${escHtml(bkT('adm_pay_nores', 'Rezervasyon yok'))}</span>`); return; }
        const rd = rs.data();
        const expected = reservationTotalPrice(rd);
        const pk = reservationPackageInfo(rd);
        if (pk) pills.insertAdjacentHTML('beforeend', `<span class="adm-tag">${escHtml(pkgName(pk))}${pk.pct ? ` · ${pkgPct(pk.pct)}` : ''}</span>`);
        pills.insertAdjacentHTML('beforeend', expected === (r.total_price || 0)
          ? `<span class="adm-tag">${escHtml(bkT('adm_pay_match', 'rezervasyonla aynı'))}</span>`
          : `<span class="adm-tag adm-tag--err">${escHtml(bkT('adm_pay_mismatch', 'Rezervasyon: {price} — tutar uyuşmuyor').replace('{price}', tlFmt(expected)))}</span>`);
      }).catch(() => {});
      approveBtn.onclick = async () => {
        approveBtn.disabled = true;
        try {
          const batch = db.batch();
          batch.set(db.collection('reservations').doc(r.from_uid), { payment_confirmed: true, payment_pending: false, payment_confirmed_at: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
          batch.update(doc.ref, { status: 'accepted', updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          await batch.commit();
          toast('✓ Ödeme onaylandı.'); row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); approveBtn.disabled = false; }
      };
      rejectBtn.onclick = async () => {
        rejectBtn.disabled = true;
        try {
          const batch = db.batch();
          batch.set(db.collection('reservations').doc(r.from_uid), { payment_pending: false }, {merge:true});
          batch.update(doc.ref, { status: 'rejected', updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          await batch.commit();
          toast('Ödeme talebi reddedildi.'); row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); rejectBtn.disabled = false; }
      };
      reqList.append(row);
      return;
    }

    if (isCancelReq) {
      const approveBtn = admBtn(bkT('adm_rq_cancel_ok', 'İptali onayla'), 'btn btn-sm btn-danger');
      const rejectBtn = admBtn(lblReject, 'btn btn-sm btn-subtle');
      const row = admReqRow({ name: who, photo: r.from_photo, chip: bkT('adm_rq_cancel', 'İptal talebi'), tone: 'err',
        lines: [`${escHtml(formatDateStr(r.lesson_date))} · ${escHtml(r.lesson_time)}–${escHtml(getEndTime(r.lesson_time))}`],
        note: r.note, actions: [rejectBtn, approveBtn] });
      approveBtn.onclick = async () => {
        approveBtn.disabled = true;
        try {
          await adminCancelLesson(r.from_uid, r.lesson_idx, r.all_lessons, { date: r.lesson_date, time: r.lesson_time });
          await doc.ref.update({ status: 'accepted', updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          toast('Ders iptal edildi.');
          row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); approveBtn.disabled = false; }
      };
      rejectBtn.onclick = async () => {
        rejectBtn.disabled = true;
        try {
          await doc.ref.update({ status: 'rejected', updated_at: firebase.firestore.FieldValue.serverTimestamp() });
          // Revert lesson status back to scheduled
          const resSnap = await db.collection('reservations').doc(r.from_uid).get().catch(()=>null);
          if (resSnap && resSnap.exists) {
            const lessArr = resSnap.data().lessons || [];
            const li = lessArr.findIndex(l => l.date === r.lesson_date && l.time === r.lesson_time && l.status === 'cancel_requested');
            if (li >= 0) {
              lessArr[li] = { ...lessArr[li], status: 'scheduled' };
              await db.collection('reservations').doc(r.from_uid).set({ lessons: lessArr }, {merge:true});
            }
          }
          toast('İptal talebi reddedildi.');
          row.remove();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); rejectBtn.disabled = false; }
      };
      reqList.append(row);
      return;
    }

    // Yeni ders talebi: deneme / tek ders / aylık (kampanyalı) plan
    const isTrialReq = r.lesson_type === 'trial';
    const daysText = (r.schedule||[]).map(s => getDays()[s.dayIndex] + ' ' + s.time).join(', ');
    const isSingleReq = r.lesson_type === 'single';
    let reqLessonCount = 1;
    if (!isSingleReq && !isTrialReq) {
      try { reqLessonCount = calculateLessonDates(r.schedule, r.duration_months, r.lessons_per_month, r.preferred_start_date).length; }
      catch (e) { reqLessonCount = 0; }
    }
    // Paket: talepteki fiyat alanlarına güvenilmez — package_id settings/campaigns'teki
    // kanonik tanımla (yoksa PACKAGES) yeniden hesaplanır; kampanya pasif/kaldırılmışsa ya da
    // süre / haftalık saat / ders-ay tutmazsa liste fiyatı geçerli olur ve onayda paket
    // uygulanmaz (acceptRequest aynı kontrolü tekrar yapar).
    const reqPkg = (isTrialReq || isSingleReq) ? { pkg: null, valid: false, reason: 'none' } : requestPackageCheck(r);
    const reqPkgBad = !!r.package_id && !reqPkg.valid && !isTrialReq;
    const reqTotalPrice = isTrialReq ? 0 : reqPkg.valid ? packagePrice(reqPkg.pkg).total : reqLessonCount * (isSingleReq ? LESSON_PRICE_SINGLE : LESSON_PRICE);
    const chip = isTrialReq ? [bkT('adm_rq_trial', 'Deneme dersi'), 'ok']
      : isSingleReq ? [bkT('adm_price_single', 'Tek ders'), 'warn']
      : [`${bkT('adm_cal_monthly', 'Aylık')} · ${Number(r.duration_months) || 0} ${bkT('adm_month_short', 'ay')} · ${r.lessons_per_month || 4}/${bkT('adm_month_short', 'ay')}`, 'accent'];
    const lines = [];
    if (isTrialReq) lines.push(`${escHtml(formatDateStr(r.trial_date))} ${escHtml(r.trial_time)}`);
    else if (reqPkg.valid) { lines.push(`<strong>${escHtml(pkgAdminLine(reqPkg.pkg))}</strong>`); lines.push(escHtml(daysText)); }
    else lines.push(escHtml(daysText) || '—');
    const badTitle = `Talep: ${r.package_name || (reqPkg.pkg ? reqPkg.pkg.name : 'tanınmayan paket')} · ${Number(r.duration_months) || 0} ay · haftada ${(r.schedule||[]).length} saat`;
    const meta = isTrialReq ? '' : `<span class="adm-tag adm-tag--gold">${escHtml(reqTotalPrice.toLocaleString('tr-TR'))} TL</span>
      <span class="adm-tag">${reqLessonCount} ${escHtml(admLessonsLc(reqLessonCount))}</span>
      ${reqPkgBad ? `<span class="adm-tag adm-tag--err" title="${escHtml(badTitle)}">${escHtml(admPkgReasonLabel(reqPkg.reason))}</span>` : ''}`;

    const lblAccept = bkT('adm_accept', 'Kabul et');
    const approveBtn = admBtn(lblAccept, 'btn btn-sm btn-primary');
    const rejectBtn = admBtn(lblReject, 'btn btn-sm btn-danger');
    const row = admReqRow({ name: who, photo: r.from_photo, chip: chip[0], tone: chip[1],
      extra: r.from_uid ? ptBadgeHtml(r.from_uid, true) : '', lines, phone: r.from_phone, meta, note: r.note,
      actions: [rejectBtn, approveBtn] });

    // Accept button
    approveBtn.onclick = async () => {
      approveBtn.disabled = true; approveBtn.textContent = bkT('adm_checking', 'Kontrol ediliyor…');
      try {
        if (isTrialReq) {
          const okT = await admAsk({
            eyebrow: bkT('adm_rq_trial', 'Deneme dersi'),
            title: bkT('adm_acc_t', 'Talebi onayla'),
            body: `<p>${escHtml(bkT('adm_acc_trial_b', '{who} deneme dersi takvime işlenecek:').replace('{who}', admPoss(who)))}</p>
              <p class="adm-ask-big"><strong>${escHtml(formatDateStr(r.trial_date))} ${escHtml(r.trial_time)}–${escHtml(getEndTime(r.trial_time))}</strong></p>
              <p class="adm-ask-note">${escHtml(bkT('adm_acc_notify', 'Öğrenciye WhatsApp ile "onaylandı" bildirimi gider.'))}</p>`,
            ok: bkT('adm_acc_ok', 'Onayla ve öğrenciye bildir'),
          });
          if (!okT) { approveBtn.disabled = false; approveBtn.textContent = lblAccept; return; }
          await acceptTrialRequest(doc.id, r);
          toast('✓ Deneme dersi kabul edildi.');
          row.remove(); return;
        }
        // Kampanyalar onay anında tazelenir (başka sekmede yayınlanmış olabilir); fiyat notu
        // ve özel fiyat sorusu bu güncel kontrole göre (acceptRequest de aynı listeyi kullanır).
        await loadCampaigns();
        const pkgNow = isSingleReq ? { pkg: null, valid: false, reason: 'none' } : requestPackageCheck(r);
        // Normalize params for single lessons (duration_months=0 would generate no dates)
        const _effDur   = isSingleReq ? 1 : r.duration_months;
        const _effLpm   = isSingleReq ? 1 : (r.lessons_per_month || 4);
        const _effStart = isSingleReq ? toDateStr(new Date()) : r.preferred_start_date;
        // Check conflicts before accepting
        const allLessons = calculateLessonDates(r.schedule, _effDur, _effLpm, _effStart);
        const conflicts = await checkConflicts(allLessons, r.from_uid);
        // Onay penceresi: oluşacak tarihler, tutar, paket; çakışan tarihler ayrıca listelenir.
        // Paketli talepte öğrenci yalnız yapılacak ders kadar öder ama paketin indirim
        // oranı korunur (karar 8) — admin bunu ve liste karşılığını açıkça görür.
        {
          const okL = allLessons.filter(l => !conflicts.has(l.date + '_' + l.time));
          const badL = allLessons.filter(l => conflicts.has(l.date + '_' + l.time));
          const _pkPP = pkgNow.valid ? packagePrice(pkgNow.pkg) : null;
          const unit = isSingleReq ? LESSON_PRICE_SINGLE : LESSON_PRICE;
          const priceTxt = _pkPP
            ? (badL.length ? `${okL.length} × ${tlFmt(_pkPP.perHour)} = ${tlFmt(okL.length * _pkPP.perHour)}` : tlFmt(_pkPP.total))
            : `${okL.length} × ${tlFmt(unit)} = ${tlFmt(okL.length * unit)}`;
          const _pkNote = _pkPP && badL.length
            ? bkT('adm_acc_pk_note', '{pkg} paketi ({h} saat) yerine {n} ders planlanacak. Paketin %{d} indirimi korunur (liste: {list}). Bu indirimi vermek istemiyorsan vazgeç ya da onaydan sonra fiyatı düzenle.')
              .replace('{pkg}', pkgNow.pkg.name).replace('{h}', _pkPP.hours).replace('{n}', okL.length).replace('{d}', pkgNow.pkg.discount).replace('{list}', tlFmt(okL.length * LESSON_PRICE))
            : '';
          const okA = await admAsk({
            eyebrow: chip[0],
            title: bkT('adm_acc_t', 'Talebi onayla'),
            body: `<p>${escHtml(bkT('adm_acc_b', '{who} için {n} ders takvime işlenecek:').replace('{who}', who).replace('{n}', okL.length))}</p>
              <ul class="adm-ask-list adm-ask-dates">${okL.map(l => `<li>${escHtml(formatDateStr(l.date))} · ${escHtml(l.time)}</li>`).join('')}</ul>
              ${badL.length ? `<p class="adm-ask-warn">${escHtml(bkT('adm_acc_conf', '{n} tarih dolu (başka öğrenci) — eklenmeyecek:').replace('{n}', badL.length))}</p>
                <ul class="adm-ask-list">${badL.map(l => `<li>${escHtml(formatDateStr(l.date))} · ${escHtml(l.time)}</li>`).join('')}</ul>` : ''}
              <p class="adm-ask-big">${escHtml(bkT('adm_acc_price', 'Tutar'))}: <strong>${escHtml(priceTxt)}</strong>${pkgNow.valid ? ` · ${escHtml(pkgName(pkgNow.pkg))}` : ''}</p>
              ${_pkNote ? `<p class="adm-ask-note">${escHtml(_pkNote)}</p>` : ''}
              <p class="adm-ask-note">${escHtml(bkT('adm_acc_notify2', 'Öğrenciye WhatsApp ile "onaylandı" bildirimi gider; ödeme bilgisi panelinde görünür.'))}</p>`,
            ok: bkT('adm_acc_ok', 'Onayla ve öğrenciye bildir'),
          });
          if (!okA) {
            approveBtn.disabled = false; approveBtn.textContent = lblAccept;
            return;
          }
        }
        // Final conflict re-check right before committing (closes race window)
        const freshConflicts = await checkConflicts(
          calculateLessonDates(r.schedule, _effDur, _effLpm, _effStart)
            .filter(l => !conflicts.has(l.date + '_' + l.time)),
          r.from_uid
        );
        freshConflicts.forEach(k => conflicts.add(k));
        // Paketsiz / uyuşmayan talep + önceki rezervasyonda elle girilmiş özel fiyat:
        // varsayılan korunur (price_source 'admin'), ama yeni talep farklı olabileceği
        // için admin'e yazılacak tutar gösterilip sorulur.
        let keepAdminPrice = true;
        if (!pkgNow.valid) {
          const prevSnap = await db.collection('reservations').doc(r.from_uid).get();
          const kept = keptCustomPrice(prevSnap.exists ? prevSnap.data() : null);
          if (kept) {
            const newCount = allLessons.length - conflicts.size;
            const unit = isSingleReq ? LESSON_PRICE_SINGLE : LESSON_PRICE;
            const keptTxt = kept.total !== null ? tlFmt(kept.total) : `${newCount} ders × ${tlFmt(kept.per)} = ${tlFmt(newCount * kept.per)}`;
            const choice = await showChoiceModal({
              title: 'Önceki özel fiyat',
              body: `Bu öğrencinin önceki rezervasyonunda elle girilmiş özel fiyat var: <strong>${keptTxt}</strong>${kept.per ? ` (${tlFmt(kept.per)}/ders)` : ''}.<br>Yeni talep: ${newCount} ders · liste fiyatı <strong>${tlFmt(newCount * unit)}</strong> (${newCount} × ${tlFmt(unit)}).`,
              choices: [
                { label: `Özel fiyatı koru (${keptTxt})`, value: 'keep', cls: 'btn-primary' },
                { label: `Liste fiyatına dön (${tlFmt(newCount * unit)})`, value: 'list', cls: 'btn-ghost' },
              ],
            });
            if (!choice) { approveBtn.disabled = false; approveBtn.textContent = lblAccept; return; }
            keepAdminPrice = choice === 'keep';
          }
        }
        await acceptRequest(doc.id, r, conflicts, { keepAdminPrice });
        toast('✓ Talep kabul edildi, dersler oluşturuldu.');
        row.remove();
      } catch(e) {
        const c = errId(); toast(`Hata (${c}): ` + (e.message||e.code||'Bilinmeyen hata'), true);
        approveBtn.disabled = false; approveBtn.textContent = lblAccept;
      }
    };

    // Reject button
    rejectBtn.onclick = async () => {
      const reason = await showInputModal({ title: bkT('adm_reject_reason', 'Reddetme sebebi'), placeholder: bkT('adm_optional', 'İsteğe bağlı…'), multiline: true });
      if (reason === null) return;
      rejectBtn.disabled = true;
      try {
        await doc.ref.update({ status:'rejected', reject_reason: reason, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
        toast('Talep reddedildi.');
        row.remove();
      } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); rejectBtn.disabled = false; }
    };
    reqList.append(row);
  });
}

// ── Öğrenciler anlık görüntüsü: istatistik, takvim, müsaitlik işaretleri, hatırlatmalar, liste ──
function renderAdminStudents(studSnap) {
  _admStudLoaded = true;
  _admStudDocs = [];
  if (studSnap && !studSnap.empty) {
    studSnap.docs.forEach(doc => {
      const d = doc.data();
      // Dedup and lazily heal stored duplicates
      const rawLessons = d.lessons || [];
      const cleanLessons = dedupLessons(rawLessons);
      if (cleanLessons.length !== rawLessons.length) {
        db.collection('reservations').doc(doc.id).set({ lessons: cleanLessons }, { merge: true }).catch(()=>{});
      }
      d.lessons = cleanLessons;
      _admStudDocs.push({ id: doc.id, d });
    });
  }
  // Takvim dersleri (scheduled/rescheduled) + müsaitlik matrisinde "ders var" saatleri (90 gün)
  const calAll = [];
  const slots = new Set();
  const today = toDateStr(new Date());
  const end90 = new Date(); end90.setDate(end90.getDate() + 90);
  const endStr = toDateStr(end90);
  _admStudDocs.forEach(({ id: sid, d }) => {
    d.lessons.forEach(l => {
      if (l.status === 'scheduled' || l.status === 'rescheduled')
        calAll.push({ uid: sid, date: l.date, time: l.time, name: (d.student_name||d.student_email||'').split(' ')[0], full: d.student_name || d.student_email || '', photo: d.student_photo||'', type: d.lesson_type || 'monthly' });
      if (['scheduled','rescheduled','frozen','cancel_requested'].includes(l.status) && l.date >= today && l.date <= endStr)
        slots.add(dateStrToObj(l.date).getDay() + '_' + l.time);
    });
  });
  _admLessonSlots = slots;
  admRenderStats();
  renderAdminCalendar(calAll, _calWeekOffset);
  admRenderAvail();

  // Sync booked_slots: backfill missing + purge stale (runs once per session)
  if (!window._slotsSynced && studSnap) {
    window._slotsSynced = true;
    // Build map of valid slot IDs → student_uid from active lessons
    const validSlotMap = new Map(); // id → student_uid
    studSnap.forEach(doc => {
      (doc.data().lessons || []).forEach(l => {
        if ((l.status === 'scheduled' || l.status === 'rescheduled' || l.status === 'frozen') && l.date) {
          validSlotMap.set(l.date + '_' + l.time, doc.id);
        }
      });
    });
    // Fetch all current booked_slots and delete orphans, add missing
    db.collection('booked_slots').get().then(async slotSnap => {
      const batch = db.batch();
      let changed = 0;
      slotSnap.forEach(d => {
        if (!validSlotMap.has(d.id)) { batch.delete(d.ref); changed++; }
      });
      validSlotMap.forEach((studentUid, id) => {
        const [date, time] = [id.slice(0, 10), id.slice(11)];
        if (!slotSnap.docs.find(d => d.id === id)) {
          batch.set(db.collection('booked_slots').doc(id), { date, time, student_uid: studentUid }, { merge: true });
          changed++;
        }
      });
      if (changed > 0) await batch.commit().catch(() => {});
    }).catch(() => {});
  }

  admRenderReminders();
  admRenderStudents();
  admRenderDisputes();
  admRenderToday();
  // erteleme talebi satırları öğrencinin güncel hakkını / kayan derslerini gösterir
  if (_admLastReqSnap) renderAdminRequests(_admLastReqSnap);
  admUpdateCounts();
}

// ── Aylık istatistikler (nakit esaslı; seçili ay) ──
function admComputeStats(mk) {
  let revenue = 0, lessons = 0, paid = 0, pending = 0;
  const per = [];
  _admStudDocs.forEach(({ d }) => {
    const L = d.lessons || [];
    const totalLessonsCount = L.length; // includes cancelled — package was paid for all
    const totalNonCancelled = L.filter(l => l.status !== 'cancelled').length;
    const perLessonPrice = d.custom_total_price
      ? Math.round(d.custom_total_price / Math.max(totalLessonsCount, 1))
      : (d.custom_lesson_price || (d.lesson_type === 'single' ? LESSON_PRICE_SINGLE : LESSON_PRICE));
    let monthL = 0;
    L.forEach(l => { if (l.date && l.date.startsWith(mk) && l.status !== 'cancelled') { lessons++; monthL++; } });
    // Cash basis: the whole package counts as income in the month payment was confirmed.
    // payment_confirmed_at is preferred; fall back to start_date so legacy paid students still show somewhere.
    if (d.lesson_type !== 'trial') {
      const pkgTotal = d.custom_total_price ?? (totalLessonsCount * perLessonPrice);
      let paidKey = null;
      if (d.payment_confirmed_at?.toDate) paidKey = toDateStr(d.payment_confirmed_at.toDate()).slice(0,7);
      else if (d.payment_confirmed) paidKey = (d.start_date || '').slice(0,7) || null;
      if (d.payment_confirmed && paidKey === mk) { revenue += pkgTotal; paid++; }
      else if (d.payment_pending) pending++;
      if (monthL > 0 || (d.payment_confirmed && paidKey === mk)) {
        const pk = reservationPackageInfo(d);
        // counted: tutar bu ayın gelirine sayıldı mı (ödeme bu ay onaylandı) — değilse gri + hangi ay ödendiği
        per.push({ name: d.student_name || d.student_email || '—', lessons: monthL, totalLessons: totalNonCancelled,
          total: pkgTotal, paid: !!d.payment_confirmed, counted: !!d.payment_confirmed && paidKey === mk, paidKey,
          pkg: pk ? `${pk.name ? pkgName(pk) : `${pk.months} ${bkT('adm_month_pkg', 'aylık paket')}`}${pk.pct ? ` ${pkgPct(pk.pct)}` : ''}` : '' });
      }
    }
  });
  return { revenue, lessons, paid, pending, per };
}
function admRenderStats() {
  const mk = admMonthKey(_admMonthOffset);
  const st = admComputeStats(mk);
  const mName = admMonthName(mk);
  admSet('admRevLabel', `${bkT('adm_rev_label', 'Aylık gelir')} · ${mName}`);
  admSet('admRevVal', tlNum(st.revenue));
  admSet('admRevSub', `${st.paid} ${st.paid === 1 ? bkT('adm_rev_paid_one', 'öğrenci · ödeme onaylı') : bkT('adm_rev_paid', 'öğrenci · ödeme onaylı')}${st.pending > 0 ? ` · ${st.pending} ${bkT('adm_rev_pending', 'beklemede')}` : ''}`);
  admSet('admStatLessons', st.lessons);
  admSet('admStatActive', `${st.per.length} ${bkT('adm_stat_active_lc', 'aktif öğrenci')}`);
  admSet('admPerStuCount', st.per.length ? `(${st.per.length})` : '');
  const box = document.getElementById('adminStatsContent');
  if (!box) return;
  if (!st.per.length) { box.innerHTML = `<p class="adm-note">${escHtml(bkT('adm_ps_empty', 'Bu ay ders ya da onaylı ödeme yok.'))}</p>`; return; }
  const max = Math.max(...st.per.map(p => p.total), 1);
  const grow = _admStatsDrawn ? '' : ' class="be-grow"';
  _admStatsDrawn = true;
  box.innerHTML = st.per.slice().sort((a, b) => b.total - a.total).map(p => `
    <div class="adm-ps${p.paid ? '' : ' is-unpaid'}">
      <span class="adm-ps-name">${escHtml(p.name)} <b class="${p.paid ? 'adm-ok' : 'adm-err'}" aria-hidden="true">${p.paid ? '✓' : '•'}</b><span class="sr-only">${escHtml(p.paid ? bkT('adm_ps_sr_paid', 'ödendi') : bkT('adm_ps_sr_unpaid', 'ödenmedi'))}</span></span>
      <span class="adm-ps-bar" aria-hidden="true"><span${grow} style="--w:${Math.round(p.total / max * 100)}%"></span></span>
      <span class="adm-ps-amt${p.counted ? '' : ' is-muted'}">${tlNum(p.total)} ₺</span>
      <span class="adm-ps-meta">${escHtml(bkT('adm_ps_month', 'Bu ay'))}: ${p.lessons} ${escHtml(admLessonsLc(p.lessons))} · ${escHtml(bkT('adm_ps_total', 'Toplam'))}: ${p.totalLessons} ${escHtml(admLessonsLc(p.totalLessons))}${p.pkg ? `<span class="adm-chip adm-chip--accent">${escHtml(p.pkg)}</span>` : ''}
        <span class="adm-ps-paid">${escHtml(p.counted ? bkT('adm_ps_counted', 'bu ayın gelirinde')
          : p.paid ? bkT('adm_ps_paid_in', '{m} ödendi — bu aya sayılmaz').replace('{m}', p.paidKey ? admMonthName(p.paidKey) : '—')
          : bkT('adm_ps_unpaid', 'henüz ödenmedi'))}</span></span>
    </div>`).join('');
}

// ── E-posta hatırlatmaları (ödemesi onaysız, yaklaşan dersi olan öğrenciler) ──
function admRenderReminders() {
  const list = document.getElementById('adminRemindersList');
  if (!list) return;
  const todayStr = toDateStr(new Date());
  const unpaid = _admStudDocs.filter(({ d: sd }) => {
    if (sd.lesson_type === 'trial') return false;
    if (sd.payment_confirmed) return false;
    return (sd.lessons || []).some(l => l.date >= todayStr && (l.status === 'scheduled' || l.status === 'rescheduled'));
  });
  _admUnpaidCount = unpaid.length;
  const tg = document.getElementById('admRemToggle');
  admSet('admRemCount', unpaid.length ? `${unpaid.length} ${bkT('adm_rem_students', 'öğrenci')}` : bkT('adm_rem_none', 'Ödeme bekleyen öğrenci yok.'));
  if (tg) tg.disabled = !unpaid.length;
  const allBtn = document.getElementById('admRemindAll');
  if (allBtn) allBtn.disabled = !unpaid.length;
  if (!unpaid.length) { list.hidden = true; if (tg) tg.setAttribute('aria-expanded', 'false'); }
  list.innerHTML = '';
  unpaid.forEach(({ id: uid, d: sd }) => {
    const email = sd.student_email || sd.from_email || '';
    const name = sd.student_name || sd.from_name || '—';
    const lastSent = sd.last_reminder_sent
      ? new Date(sd.last_reminder_sent.toDate ? sd.last_reminder_sent.toDate() : sd.last_reminder_sent)
          .toLocaleDateString('tr-TR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})
      : null;
    const nextLesson = (sd.lessons || []).filter(l => l.date >= todayStr && (l.status==='scheduled'||l.status==='rescheduled')).sort((a,b)=>a.date.localeCompare(b.date))[0];
    const row = document.createElement('div');
    row.className = 'adm-rem';
    row.innerHTML = `<div><div class="adm-rem-name">${escHtml(name)}</div><div class="adm-rem-mail">${escHtml(email)}</div></div>
      ${nextLesson ? `<div class="adm-rem-l adm-gold">${escHtml(formatDateStr(nextLesson.date))} ${escHtml(nextLesson.time)}</div>` : ''}
      ${lastSent ? `<div class="adm-rem-l adm-k">Son: ${escHtml(lastSent)}</div>` : ''}
      <div class="adm-rem-acts"></div>`;
    const acts = row.querySelector('.adm-rem-acts');
    acts.append(
      admBtn(bkT('adm_rem_custom', 'Kişiye özel'), 'adm-mini', () => adminComposeEmail(uid, email, name, false)),
      admBtn(bkT('adm_rem_welcome', 'Hoşgeldin'), 'adm-mini adm-mini--ok', e => adminSendWelcomeEmail(email, name, e.currentTarget))
    );
    list.append(row);
  });
}
// "Şimdi manuel gönder": sendPaymentRemindersManual sunucuda uygun TÜM öğrencilere gönderir
// ve her birine last_reminder_sent yazar (eski satır düğmesi de aslında hepsine gönderiyordu).
async function admRemindAll() {
  const btn = document.getElementById('admRemindAll');
  const st = document.getElementById('admRemindStatus');
  const unpaidNames = _admStudDocs.filter(({ d: sd }) => sd.lesson_type !== 'trial' && !sd.payment_confirmed
    && (sd.lessons || []).some(l => l.date >= toDateStr(new Date()) && (l.status === 'scheduled' || l.status === 'rescheduled')))
    .map(({ d: sd }) => sd.student_name || sd.student_email || '—');
  const okR = await bkConfirm({
    title: bkT('adm_rem_send_now', 'Şimdi manuel gönder'),
    body: `<p>${escHtml(bkT('adm_rem_conf_b', '{n} öğrenciye ödeme hatırlatma e-postası gidecek:').replace('{n}', _admUnpaidCount))}</p>
      <ul class="adm-ask-list">${unpaidNames.map(n => `<li>${escHtml(n)}</li>`).join('')}</ul>`,
    ok: bkT('adm_rem_conf_ok', '{n} kişiye gönder').replace('{n}', _admUnpaidCount),
  });
  if (!okR) return;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = bkT('adm_sending', 'Gönderiliyor…');
  try {
    const res = await firebase.app().functions('europe-west1').httpsCallable('sendPaymentRemindersManual')();
    const n = res && res.data && typeof res.data.sent === 'number' ? res.data.sent : _admUnpaidCount;
    admStatus(st, `✓ ${n} öğrenciye hatırlatma gönderildi.`, 'ok');
    toast(`✓ Ödeme hatırlatması gönderildi (${n}).`);
  } catch(e) { const c=errId(); admStatus(st, `Hata (${c}): `+(e.message||e.code), 'err'); }
  btn.disabled = false; btn.textContent = orig;
}

// ── Aktif öğrenciler: satır (özet) + açılır detay. Her yazım reservations dinleyicisini
// tetikler ve liste yeniden çizilir; açık satırlar, geçmiş ders açıklığı, not taslakları ve
// odak (data-adm-focus) korunur.
const ADM_TINTS = ['var(--ok)', 'var(--accent)', 'var(--warn)', 'var(--violet)', 'var(--err)'];
// ── Ders kanıtı (admin): Zoom katılım çipi, onay rozeti, itirazlar, kanıt penceresi ──
// Veriler lessonAttendanceSync / confirmLesson / lessonAutoConfirm'den gelir. Admin yalnız
// itirazı "çözüldü" yapar (confirmation.status='resolved'); öğrencinin yazdığı her metin escHtml'li.
var _admDisputeCount = 0;
var ADM_ATT_REASON = {
  missing_scope:      ['adm_att_r_scope', `Zoom uygulamasında rapor izni (scope) yok`],
  plan_or_permission: ['adm_att_r_plan', `Zoom raporları ücretli plan ister ya da izin yok`],
  no_credentials:     ['adm_att_r_cred', `Zoom bilgileri tanımlı değil`],
  token_failed:       ['adm_att_r_token', `Zoom erişim anahtarı alınamadı`],
  token_network:      ['adm_att_r_token', `Zoom erişim anahtarı alınamadı`],
  auth_failed:        ['adm_att_r_auth', `Zoom yetkilendirme hatası`],
  rate_limited:       ['adm_att_r_rate', `Zoom istek sınırı aşıldı`],
  host_not_found:     ['adm_att_r_host', `Zoom kullanıcısı bulunamadı`],
  no_meeting:         ['adm_att_r_nomeet', `Bu saatte Zoom toplantısı yok`],
  student_not_found:  ['adm_att_r_nostu', `Öğrenci toplantıda görünmüyor`],
};
var ADM_MATCH_LBL = {
  email:            ['adm_att_m_email', `e-posta`],
  name_exact:       ['adm_att_m_exact', `isim (tam)`],
  name_partial:     ['adm_att_m_partial', `isim (kısmi)`],
  name_fuzzy:       ['adm_att_m_fuzzy', `isim (benzer)`],
  sole_participant: ['adm_att_m_sole', `tek katılımcı`],
};
var ADM_CFM_CHIP = {
  open:      ['adm-chip--warn', 'adm_cfm_open', `Onay bekliyor`],
  confirmed: ['adm-chip--ok', 'adm_cfm_confirmed', `Onaylandı ✓`],
  disputed:  ['adm-chip--err', 'adm_cfm_disputed', `İtiraz`],
  auto:      ['', 'adm_cfm_auto', `Otomatik onay`],
  resolved:  ['adm-chip--info', 'adm_cfm_resolved', `İtiraz çözüldü`],
};
function admAttReason(r) { const x = ADM_ATT_REASON[r]; return x ? bkT(x[0], x[1]) : String(r || ''); }
function admMatchLbl(m) { const x = ADM_MATCH_LBL[m]; return x ? bkT(x[0], x[1]) : String(m || '—'); }
function admWhen(iso) {
  const t = new Date(iso || 0);
  return Number.isFinite(t.getTime()) && t.getTime() > 0 ? t.toLocaleString(admLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }) : '';
}
// Tek satırlık özet (itiraz kartı, kanıt penceresi)
function admAttSummary(l) {
  const a = l.attendance;
  if (!a) return bkT('adm_att_none', `Zoom: kayıt yok`);
  if (a.status === 'ok') return `Zoom ${a.student_minutes || 0} dk · ${bkTrHm(a.student_join)}–${a.student_leave ? bkTrHm(a.student_leave) : '?'} · ${admMatchLbl(a.matched_by)}`;
  if (a.status === 'absent') return `${bkT('adm_att_absent', `Zoom: yok`)} — ${admAttReason(a.reason)}`;
  return `${bkT('adm_att_unavail', `Zoom kaydı alınamadı`)} — ${admAttReason(a.reason)}`;
}
function admAttChipHtml(l, now) {
  if (!BK_CFM_STATUSES.includes(l.status)) return '';
  const end = bkLessonEndMs(l);
  if (now < end) return '';
  const a = l.attendance;
  if (!a) return now - end < 6 * 3600e3 ? `<span class="adm-chip">${escHtml(bkT('adm_att_wait', `Zoom: bekliyor`))}</span>` : '';
  const tip = escHtml(admAttSummary(l));
  if (a.status === 'ok') return `<button type="button" class="adm-chip adm-chip--ok" data-att title="${tip}">${escHtml(bkT('adm_att_ok', `Zoom {n} dk ✓`).replace('{n}', a.student_minutes || 0))}</button>`;
  if (a.status === 'absent') return `<button type="button" class="adm-chip adm-chip--err" data-att title="${tip}">${escHtml(bkT('adm_att_absent', `Zoom: yok`))}</button>`;
  return `<button type="button" class="adm-chip" data-att title="${tip}">${escHtml(bkT('adm_att_unavail', `Zoom kaydı alınamadı`))}</button>`;
}
function admCfmChipHtml(l, now) {
  const st = bkCfmState(l, now);
  const m = st && ADM_CFM_CHIP[st];
  if (!m) return '';
  const c = l.confirmation || {};
  const when = admWhen(c.at || c.opened_at);
  return `<span class="adm-chip ${m[0]}"${when ? ` title="${escHtml(when)}"` : ''}>${escHtml(bkT(m[1], m[2]))}</span>`;
}
// Ders satırının altındaki kanıt şeridi; itirazlı derste sebep + "Çözüldü"
function admProofEl(uid, s, l, row) {
  const now = Date.now();
  const html = admAttChipHtml(l, now) + admCfmChipHtml(l, now);
  if (!html) return null;
  const wrap = document.createElement('div');
  wrap.className = 'adm-lproof';
  wrap.innerHTML = html;
  const c = l.confirmation || {};
  if (c.status === 'disputed' || c.status === 'resolved') {
    wrap.insertAdjacentHTML('beforeend', `<p class="adm-ldispute">${escHtml(bkT('adm_cfm_reason', `İtiraz`))}: “${escHtml(c.reason || '—')}”</p>`);
    if (c.status === 'resolved' && c.resolved_note) wrap.insertAdjacentHTML('beforeend', `<p class="adm-ldispute-note">${escHtml(bkT('adm_cfm_note', `Çözüm notu`))}: ${escHtml(c.resolved_note)}</p>`);
  }
  if (c.status === 'disputed') {
    if (row) row.classList.add('is-disputed');
    wrap.append(admBtn(bkT('adm_cfm_resolve', `Çözüldü olarak işaretle`), 'adm-mini adm-mini--ok', () => admResolveDispute(uid, l)));
  }
  const ab = wrap.querySelector('[data-att]');
  if (ab) {
    ab.setAttribute('aria-haspopup', 'dialog');
    ab.onclick = e => { e.stopPropagation(); admShowEvidence(uid, s, l); };
  }
  if (row) row.classList.add('has-proof');
  return wrap;
}
async function admResolveDispute(uid, l) {
  const note = await showInputModal({ title: bkT('adm_cfm_resolve_q', `İtiraz çözüldü — not (isteğe bağlı)`), placeholder: bkT('adm_cfm_resolve_ph', `Ör. Zoom kaydı paylaşıldı, ders yapılmış.`), multiline: true });
  if (note === null) return;
  const ref = db.collection('reservations').doc(uid);
  try {
    // Yalnız o dersin confirmation alanı değişir; eşzamanlı fonksiyon yazımı ezilmesin diye transaction
    const done = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(bkT('adm_cfm_nores', `Rezervasyon bulunamadı.`));
      const lessons = (snap.data().lessons || []).slice();
      const i = bkFindLessonIdx(lessons, l.date, l.time);
      const c = i >= 0 ? (lessons[i].confirmation || {}) : {};
      if (c.status !== 'disputed') return false;
      lessons[i] = { ...lessons[i], confirmation: { ...c, status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: 'admin', resolved_note: String(note).trim().slice(0, 500) } };
      tx.update(ref, { lessons });
      return true;
    });
    toast(done ? `✓ ${bkT('adm_cfm_resolved_toast', `İtiraz çözüldü olarak işaretlendi.`)}` : bkT('adm_cfm_already', `Bu itiraz zaten kapatılmış.`));
  } catch (e) { const c = errId(); toast(`Hata (${c}): ` + (e.message || e.code), true); }
}
// dedupLessons ile aynı seçim (sunucudaki findLessonIdx): aynı tarih+saatte en yüksek öncelikli ilk satır
function bkFindLessonIdx(lessons, date, time) {
  const pr = { scheduled:4, rescheduled:4, frozen:3, cancel_requested:3, completed:2, cancelled:1 };
  let best = -1, bp = -1;
  lessons.forEach((l, i) => { if (l && l.date === date && l.time === time && (pr[l.status] || 0) > bp) { best = i; bp = pr[l.status] || 0; } });
  return best;
}
// Kanıt penceresi: özet + lesson_attendance belgesindeki tam katılımcı listesi
async function admShowEvidence(uid, s, l) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal modal-lg';
  box.innerHTML = `
    <div class="modal-title">${escHtml(bkT('adm_ev_title', `Zoom katılım kaydı`))}</div>
    <button type="button" class="modal-close" aria-label="${escHtml(bkT('bk_pt_close', 'Kapat'))}">✕</button>
    <div class="modal-body">${escHtml(`${s.student_name || s.student_email || '—'} · ${bkSlotLabel(l.date, l.time)}–${getEndTime(l.time)}`)}</div>
    <div class="adm-ev-body">${admLoadingHtml()}</div>`;
  overlay.append(box);
  document.body.append(overlay);
  const close = bkDialog(overlay, box, { title: '.modal-title', focus: '.modal-close' });
  box.querySelector('.modal-close').onclick = close;
  overlay.onclick = e => { if (e.target === overlay) close(); };
  let ev = null;
  try {
    const snap = await db.collection('lesson_attendance').doc(`${uid}_${l.date}_${l.time}`).get();
    if (snap.exists) ev = snap.data();
  } catch (e) { /* belge yoksa / okunamazsa özet yeter */ }
  const a = l.attendance || {};
  const m = ev && ev.meeting;
  const row = (k, v) => v ? `<dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd>` : '';
  const meta = `<dl class="adm-ev-meta">
      ${row(bkT('adm_ev_status', `Durum`), admAttSummary(l))}
      ${row(bkT('adm_ev_minutes', `Süre`), a.status === 'ok' ? `${bkT('adm_ev_student', `Öğrenci`)} ${a.student_minutes || 0} dk · ${bkT('adm_ev_host', `Eğitmen`)} ${a.host_minutes || 0} dk` : '')}
      ${row(bkT('adm_ev_meeting', `Toplantı`), m ? `${m.topic || ''} · ${bkTrHm(m.start_time)}–${m.end_time ? bkTrHm(m.end_time) : '?'} · ID ${m.id || '—'}` : '')}
      ${row(bkT('adm_ev_cfm', `Öğrenci kararı`), (() => { const c = l.confirmation || {}; const st = ADM_CFM_CHIP[bkCfmState(l, Date.now())]; return st ? `${bkT(st[1], st[2])}${c.at ? ' · ' + admWhen(c.at) : ''}` : ''; })())}
      ${row(bkT('adm_ev_fetched', `Son kontrol`), admWhen(a.fetched_at))}
    </dl>`;
  const parts = (ev && Array.isArray(ev.participants)) ? ev.participants : [];
  const table = parts.length ? `<div class="adm-ev-wrap"><table class="adm-ev-table">
      <thead><tr><th scope="col">${escHtml(bkT('adm_ev_name', `Ad`))}</th><th scope="col">${escHtml(bkT('adm_ev_email', `E-posta`))}</th><th scope="col">${escHtml(bkT('adm_ev_join', `Giriş`))}</th><th scope="col">${escHtml(bkT('adm_ev_leave', `Çıkış`))}</th><th scope="col">${escHtml(bkT('adm_ev_dur', `Dk`))}</th></tr></thead>
      <tbody>${parts.map(p => `<tr><td>${escHtml(p.name || '—')}${p.is_host ? ` <span class="adm-chip">${escHtml(bkT('adm_ev_host', `Eğitmen`))}</span>` : ''}</td><td>${escHtml(p.user_email || '—')}</td><td class="is-num">${escHtml(p.join_time ? bkTrHm(p.join_time) : '—')}</td><td class="is-num">${escHtml(p.leave_time ? bkTrHm(p.leave_time) : '—')}</td><td class="is-num">${typeof p.duration === 'number' ? Math.round(p.duration / 60) : '—'}</td></tr>`).join('')}</tbody>
    </table></div>` : `<p class="adm-k">${escHtml(bkT('adm_ev_noparts', `Katılımcı listesi yok.`))}</p>`;
  const body = box.querySelector('.adm-ev-body');
  if (body) body.innerHTML = meta + table;
}
// Gelen talepler üstünde: açık itirazlar (en eski önce)
function admRenderDisputes() {
  const box = document.getElementById('adminDisputesList');
  if (!box) return;
  const rows = [];
  _admStudDocs.forEach(({ id, d }) => (d.lessons || []).forEach(l => {
    if (l && l.confirmation && l.confirmation.status === 'disputed') rows.push({ uid: id, s: d, l });
  }));
  rows.sort((x, y) => String(x.l.confirmation.at || '').localeCompare(String(y.l.confirmation.at || '')));
  _admDisputeCount = rows.length;
  box.innerHTML = '';
  box.hidden = !rows.length;
  rows.forEach(({ uid, s, l }) => {
    const name = s.student_name || s.student_email || '—';
    box.append(admReqRow({
      photo: s.student_photo, name, chip: bkT('adm_cfm_disputed', `İtiraz`), tone: 'err',
      lines: [
        `<strong>${escHtml(formatDateStr(l.date))}</strong> ${escHtml(l.time)}–${escHtml(getEndTime(l.time))}`,
        `${escHtml(bkT('adm_cfm_reason', `İtiraz`))}: “${escHtml(l.confirmation.reason || '—')}”`,
        escHtml(admAttSummary(l)),
      ],
      meta: escHtml(admWhen(l.confirmation.at)),
      actions: [
        admBtn(bkT('adm_ev_btn', `Zoom kaydı`), 'btn btn-sm btn-subtle', () => admShowEvidence(uid, s, l)),
        admBtn(bkT('adm_cfm_open_stu', `Öğrenciyi aç`), 'btn btn-sm btn-subtle', () => {
          _admOpenStu.add(uid);
          admRenderStudents();
          if (!document.getElementById('admStuDet-' + uid)) { _admShowFinished = true; admRenderStudents(); } // paketi bitmiş öğrenci
          admGoto('ogrenciler');
          document.getElementById('admStuDet-' + uid)?.closest('.adm-stu')?.scrollIntoView({ behavior: admReduced() ? 'auto' : 'smooth', block: 'start' });
        }),
        admBtn(bkT('adm_cfm_resolve_short', `Çözüldü`), 'btn btn-sm btn-ok', () => admResolveDispute(uid, l)),
      ],
    }));
  });
  admUpdateCounts();
}

// Gelen talepler üstünde: bugünkü dersler — tek dokunuşla "Tamamlandı" ya da derse git
function admRenderToday() {
  const box = document.getElementById('admToday');
  if (!box) return;
  const today = toDateStr(new Date());
  const rows = [];
  _admStudDocs.forEach(({ id, d }) => (d.lessons || []).forEach(l => {
    if (l && l.date === today && (l.status === 'scheduled' || l.status === 'rescheduled')) rows.push({ uid: id, d, l });
  }));
  rows.sort((a, b) => String(a.l.time).localeCompare(String(b.l.time)));
  box.hidden = !rows.length;
  box.innerHTML = '';
  if (!rows.length) return;
  const now = Date.now();
  box.insertAdjacentHTML('beforeend', `<div class="adm-today-head"><span class="adm-k adm-k--gold">${escHtml(bkT('adm_today', 'Bugün'))} · ${rows.length} ${escHtml(admLessonsLc(rows.length))}</span></div>`);
  rows.forEach(({ uid, d, l }) => {
    const name = d.student_name || d.student_email || '—';
    const start = bkTrStart(l.date, l.time).getTime();
    const st = now >= start + BK_LESSON_MS ? bkT('adm_today_ended', 'bitti') : now >= start ? bkT('adm_today_now', 'şimdi') : '';
    const r = document.createElement('div');
    r.className = 'adm-today-row';
    r.innerHTML = `<span class="adm-today-t">${escHtml(l.time)}–${escHtml(getEndTime(l.time))}</span>
      <span class="adm-today-n">${escHtml(name)}${st ? ` <span class="adm-chip ${st === bkT('adm_today_now', 'şimdi') ? 'adm-chip--ok' : ''}">${escHtml(st)}</span>` : ''}</span>
      <span class="adm-today-a"></span>`;
    const idx = d.lessons.findIndex(x => x.date === l.date && x.time === l.time && x.status === l.status);
    r.querySelector('.adm-today-a').append(
      admBtn(bkT('adm_open', 'Aç'), 'btn btn-sm btn-subtle', () => admOpenLesson(uid, l.date, l.time)),
      admBtn('✓ ' + bkT('adm_done_btn', 'Tamamlandı'), 'btn btn-sm btn-ok', () => adminCompleteLesson(uid, idx, d.lessons, l))
    );
    box.append(r);
  });
}

function admRenderStudents() {
  const studList = document.getElementById('adminStudentsList');
  if (!studList) return;
  const ae = document.activeElement;
  const focusKey = ae && studList.contains(ae) ? ae.getAttribute('data-adm-focus') : null;
  document.querySelectorAll('body > .lesson-options-menu').forEach(m => m.remove()); // eski satırların açılır menüleri
  studList.innerHTML = '';
  if (!_admStudDocs.length) {
    _admActiveStuCount = 0;
    studList.innerHTML = `<div class="adm-empty">${escHtml(window._i18n?.t('bk_no_students') || 'Henüz öğrenci yok.')}</div>`;
    return;
  }
  let _hiddenFinished = 0, shown = 0;
  // Bekleyen erteleme / iptal talepleri: uid → { 'tarih_saat': tür } (ders satırında uyarı çipi)
  const pendMap = {};
  if (_admLastReqSnap) _admLastReqSnap.docs.forEach(dc => {
    const r = dc.data();
    if ((r.type === 'reschedule_request' || r.type === 'cancel_request' || r.type === 'time_change_request') && r.from_uid && r.lesson_date)
      (pendMap[r.from_uid] = pendMap[r.from_uid] || {})[r.lesson_date + '_' + r.lesson_time] = r.type;
  });
  const nowMs = Date.now();
  _admStudDocs.forEach(({ id: studentUid, d: s }, idx) => {
    const today = toDateStr(new Date());
    const allLessonsArr = s.lessons;
    const upcomingLessons = allLessonsArr.filter(l => l.status === 'scheduled' || l.status === 'rescheduled' || l.status === 'frozen' || l.status === 'cancel_requested').sort((a,b) => a.date.localeCompare(b.date));
    // Paket biten öğrenciyi listeden gizle: hiçbir upcoming ders kalmadı
    // ve tüm dersler tamamlandı/iptal edildi. Firestore'daki kayıt
    // korunur (raporlama için), sadece bu aktif listede gizlenir ("Göster" ile açılır).
    const hasAnyLiveLesson = upcomingLessons.length > 0;
    const finished = !hasAnyLiveLesson && allLessonsArr.length > 0;
    if (finished) { _hiddenFinished++; if (!_admShowFinished) return; }
    else shown++;
    const totalLessons = allLessonsArr.filter(l => l.status !== 'cancelled').length;
    const doneLessons = allLessonsArr.filter(l => l.status === 'completed').length;
    const curMonthAdmin = today.slice(0, 7);
    const thisMonthCount = allLessonsArr.filter(l => l.date.startsWith(curMonthAdmin) && (l.status === 'scheduled' || l.status === 'rescheduled' || l.status === 'frozen' || l.status === 'completed')).length;
    const activeLessons = allLessonsArr.filter(l => l.status !== 'cancelled').sort((a,b)=>a.date.localeCompare(b.date));
    const startDateStr = activeLessons.length ? formatDateStr(activeLessons[0].date) : '—';
    const endDateStr   = activeLessons.length ? formatDateStr(activeLessons[activeLessons.length-1].date) : '—';
    const isTrial = s.lesson_type === 'trial';
    const lessonPrice = s.custom_lesson_price || (s.lesson_type === 'single' ? LESSON_PRICE_SINGLE : LESSON_PRICE);
    const totalPrice = isTrial ? 0 : (s.custom_total_price ?? (totalLessons * lessonPrice));
    const isResPaid = !!s.payment_confirmed;
    const isPending = !isResPaid && !!s.payment_pending;
    const name = s.student_name || s.student_email || '—';
    // Paket etiketi "Profesyonel (%20)"; fiyat custom_total_price'tan gelir. Paket
    // fiyatı "özel fiyat" sayılmaz — o işaret yalnız admin elle fiyat girdiyse çıkar.
    const _resPk = isTrial ? null : reservationPackageInfo(s);
    const schedText = (() => {
      if (s.schedule && s.schedule.length) return s.schedule.map(x => getDays()[x.dayIndex] + ' ' + x.time + '–' + getEndTime(x.time)).join(' · ');
      const uniq = {};
      allLessonsArr.forEach(l => { if (l.status === 'cancelled') return; const d = dateStrToObj(l.date); const k = d.getDay()+'_'+l.time; if (!uniq[k]) uniq[k] = getDays()[d.getDay()]+' '+l.time+'–'+getEndTime(l.time); });
      return Object.values(uniq).join(' · ') || '—';
    })();
    const credits = totalRescheduleCredits(s);
    const open = _admOpenStu.has(studentUid);
    const detId = 'admStuDet-' + studentUid;

    const art = document.createElement('article');
    art.className = 'adm-stu' + (open ? ' is-open' : '');
    // Paket adı (silinmiş kampanyada ham kimlik yerine "N aylık paket"); deneme etiketi yalnız plan sütununda
    const _pkLbl = _resPk ? (_resPk.name ? pkgName(_resPk) : `${_resPk.months || s.duration_months || 0} ${bkT('adm_month_pkg', 'aylık paket')}`) : '';
    const badges = [
      _resPk ? `<span class="badge accent">${escHtml(_pkLbl)}${_resPk.pct ? ` · ${pkgPct(_resPk.pct)}` : ''}</span>` : '',
      !isTrial ? `<span class="badge ${credits > 0 ? 'info' : 'err'}">${escHtml(bkT('adm_cr_chip', 'Erteleme: {n}').replace('{n}', credits))}</span>` : '',
      !isTrial && s.price_source === 'admin' ? `<span class="badge warn">${escHtml(bkT('adm_custom_price', 'Özel fiyat'))}</span>` : '',
      finished ? `<span class="badge">${escHtml(bkT('adm_finished', 'Paket bitti'))}</span>` : '',
      (() => { const n = allLessonsArr.filter(l => l.confirmation && l.confirmation.status === 'disputed').length; return n ? `<span class="badge err">${escHtml(bkT('adm_cfm_disputed', 'İtiraz'))}${n > 1 ? ' · ' + n : ''}</span>` : ''; })(),
      ptBadgeHtml(studentUid),
    ].join('');
    const payChip = isTrial ? ['is-ok', bkT('adm_free', 'Ücretsiz')]
      : isResPaid ? ['is-ok', '✓ ' + bkT('adm_paid', 'Ödendi')]
      : isPending ? ['is-wait', window._i18n?.t('bk_pending_approval') || 'Onay Bekliyor']
      : ['', bkT('adm_unpaid', 'Ödenmedi')];
    const pct = totalLessons ? Math.round(doneLessons / totalLessons * 100) : 0;
    art.innerHTML = `
      <button type="button" class="adm-stu-row" aria-expanded="${open}" aria-controls="${detId}" data-adm-focus="${studentUid}:row">
        <span class="adm-stu-ava" style="--tint:${ADM_TINTS[idx % ADM_TINTS.length]}" aria-hidden="true">${s.student_photo ? `<img src="${escHtml(s.student_photo)}" alt="" loading="lazy">` : escHtml(admInitial(name))}</span>
        <span class="adm-stu-id">
          <span class="adm-stu-name">${escHtml(name)}</span>
          <span class="adm-stu-badges">${badges}</span>
          <span class="adm-stu-slot">${escHtml(schedText)}</span>
        </span>
        <span class="adm-stu-plan">
          <span>${isTrial
            ? `${escHtml(bkT('adm_rq_trial', 'Deneme dersi'))} · <strong>${escHtml(bkT('adm_free', 'Ücretsiz'))}</strong>`
            : `${s.duration_months || 0} ${escHtml(bkT('adm_month_cap', 'Ay'))} · ${totalLessons} ${escHtml(admLessonsLc(totalLessons))} · <strong>${tlNum(totalPrice)} TL</strong>`}</span>
          ${isTrial ? '' : `<span class="adm-stu-per">${tlNum(lessonPrice)} TL/${escHtml(bkT('adm_per_lesson', 'ders'))}${_resPk && _resPk.discounted && _resPk.extraCount > 0 ? ` · ${escHtml(bkT('adm_pkg_extra', 'paket {p} + {n} ek ders {x}').replace('{p}', tlFmt(_resPk.total)).replace('{n}', _resPk.extraCount).replace('{x}', tlFmt(_resPk.extraPrice)))}` : ''}</span>`}
        </span>
        <span class="adm-stu-prog"><span>${doneLessons} / ${totalLessons} ${escHtml(bkT('adm_done_lessons', 'ders tamam'))}</span><span class="adm-bar" aria-hidden="true"><span style="--w:${pct}%"></span></span></span>
        <span class="adm-paychip ${payChip[0]}">${escHtml(payChip[1])}</span>
        <svg class="adm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </button>`;
    const rowBtn = art.querySelector('.adm-stu-row');
    rowBtn.addEventListener('click', e => {
      if (e.target.closest('[data-pt-uid]')) return; // sınav rozeti kendi detayını açar
      if (_admOpenStu.has(studentUid)) _admOpenStu.delete(studentUid); else _admOpenStu.add(studentUid);
      const nowOpen = _admOpenStu.has(studentUid);
      art.classList.toggle('is-open', nowOpen);
      rowBtn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      const det = art.querySelector('.adm-stu-det');
      if (det) det.hidden = !nowOpen;
    });

    // ── Detay ──
    const det = document.createElement('div');
    det.className = 'adm-stu-det';
    det.id = detId;
    det.hidden = !open;
    const left = document.createElement('div');
    left.className = 'adm-stu-left';
    const lastRem = s.last_reminder_sent ? new Date(s.last_reminder_sent.toDate ? s.last_reminder_sent.toDate() : s.last_reminder_sent).toLocaleDateString('tr-TR', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    const ptBtn = ptBadgeHtml(studentUid, true);
    left.innerHTML = `
      <div class="adm-info3">
        <div class="adm-info"><span>${escHtml(bkT('adm_range', 'Tarih aralığı'))}</span><span>${escHtml(startDateStr)} → ${escHtml(endDateStr)}</span></div>
        <div class="adm-info"><span>${escHtml(bkT('adm_upcoming_month', 'Yaklaşan · bu ay'))}</span><span>${upcomingLessons.length} · ${thisMonthCount} ${escHtml(admLessonsLc(thisMonthCount))}</span></div>
        ${isTrial ? `<div class="adm-info"><span>${escHtml(bkT('adm_credits', 'Erteleme hakkı'))}</span><span>—</span></div>`
          : `<button type="button" class="adm-info adm-info--btn" data-act="credits" data-adm-focus="${studentUid}:cr" aria-haspopup="dialog"><span>${escHtml(bkT('adm_credits', 'Erteleme hakkı'))}</span><span class="${credits > 0 ? 'is-info' : 'is-err'}">${credits} ${escHtml(bkT('adm_left', 'kalan'))} (${s.duration_months || 1} ${escHtml(bkT('adm_month_pkg', 'aylık paket'))})</span><span class="adm-info-go">${escHtml(bkT('adm_cr_manage_short', 'Yönet / bitir'))} <span aria-hidden="true">→</span></span></button>`}
      </div>
      <div class="adm-stu-contact">
        <span>WhatsApp <span class="${s.student_phone ? 'adm-ok' : 'adm-k'}">${escHtml(s.student_phone || bkT('adm_no_phone', 'Numara yok'))}</span>
          <button type="button" class="adm-linkbtn" data-act="phone" data-adm-focus="${studentUid}:phone">${escHtml(bkT('adm_edit', 'düzenle'))}</button></span>
        <span>${escHtml(bkT('adm_last_reminder', 'Son hatırlatma'))} <span class="adm-warn">${escHtml(lastRem)}</span></span>
        <span>${escHtml(bkT('adm_level', 'Seviye'))} ${ptBtn}</span>
      </div>
      ${s.note ? `<p class="adm-snote">${escHtml(bkT('adm_student_note', 'Öğrenci notu'))}: “${escHtml(s.note)}”</p>` : ''}`;
    left.querySelector('[data-act="phone"]').onclick = () => window.adminEditStudentPhone(studentUid, s.student_phone || '', s.student_name || s.student_email || '');
    const crTile = left.querySelector('[data-act="credits"]');
    if (crTile) crTile.onclick = () => adminGrantRescheduleCredit(studentUid, s);

    // Dersler kutusu: seçim + toplu işlemler + ⋯ menüsü + geçmiş
    const allLessons = s.lessons || [];
    const selectedIdxs = new Set(); // indices into allLessons for bulk selection
    const lbox = document.createElement('div');
    lbox.className = 'adm-lbox';
    const lhead = document.createElement('div');
    lhead.className = 'adm-lbox-head';
    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'adm-selall';
    selectAllBtn.setAttribute('aria-pressed', 'false');
    selectAllBtn.innerHTML = `<span class="adm-box" aria-hidden="true"></span><span>${escHtml(bkT('adm_select_all', 'Tümünü seç'))}</span>`;
    const selInfo = document.createElement('span');
    selInfo.className = 'adm-k';
    selInfo.setAttribute('aria-live', 'polite');
    lhead.append(selectAllBtn, selInfo);
    const bulkBar = document.createElement('div');
    bulkBar.className = 'adm-bulk';
    bulkBar.hidden = true;
    const bulkLabel = document.createElement('span');
    bulkLabel.className = 'adm-bulk-lbl';
    lbox.append(lhead, bulkBar);
    if (!upcomingLessons.length) { selectAllBtn.disabled = true; }

    const setRowSel = (lRow, on) => {
      lRow.classList.toggle('is-sel', on);
      const b = lRow.querySelector('.adm-lsel');
      if (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('.adm-box').textContent = on ? '✓' : ''; }
    };
    const updateBulkBar = () => {
      const n = selectedIdxs.size;
      const all = n > 0 && n === upcomingLessons.length;
      selectAllBtn.classList.toggle('is-sel', all);
      selectAllBtn.setAttribute('aria-pressed', all ? 'true' : 'false');
      selectAllBtn.querySelector('.adm-box').textContent = all ? '✓' : '';
      selectAllBtn.querySelector('span:last-child').textContent = all ? bkT('adm_select_none', 'Seçimi kaldır') : bkT('adm_select_all', 'Tümünü seç');
      selInfo.textContent = n ? `${n} ${bkT('adm_selected', 'seçili')}` : '';
      bulkBar.hidden = n === 0;
      bulkLabel.textContent = `${bkT('adm_selected_cap', 'Seçili')}: ${n} ${admLessonsLc(n)}`;
    };
    selectAllBtn.onclick = () => {
      const allSelected = selectedIdxs.size === upcomingLessons.length;
      selectedIdxs.clear();
      if (!allSelected) upcomingLessons.forEach(lesson => { const i = allLessons.findIndex(l => l.date===lesson.date&&l.time===lesson.time&&l.status===lesson.status); if (i>=0) selectedIdxs.add(i); });
      lbox.querySelectorAll('.adm-lrow').forEach(r => setRowSel(r, !allSelected));
      updateBulkBar();
    };
    const mkBulkBtn = (label, fn, variant) => admBtn(label, 'btn btn-sm ' + (variant || 'btn-subtle'), fn);
    const bulkRescheduleBtn = mkBulkBtn(bkT('adm_bulk_resched', 'Ertele'), async () => {
      await adminBulkReschedule(studentUid, [...selectedIdxs], allLessons);
    });
    const selListHtml = idxArr => `<ul class="adm-ask-list">${idxArr.map(i => allLessons[i]).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))
      .map(l => `<li>${escHtml(formatDateStr(l.date))} · ${escHtml(l.time)}</li>`).join('')}</ul>`;
    const bulkCompleteBtn = mkBulkBtn(bkT('adm_bulk_complete', 'Tamamla'), async () => {
      const idxArr = [...selectedIdxs];
      const future = idxArr.filter(i => allLessons[i] && bkTrStart(allLessons[i].date, allLessons[i].time).getTime() > Date.now()).length;
      const a = await admAsk({
        title: bkT('adm_bulk_complete_t', '{n} dersi tamamlandı say').replace('{n}', idxArr.length),
        body: `${selListHtml(idxArr)}${future ? `<p class="adm-ask-warn">${escHtml(bkT('adm_future_warn_n', '{n} ders henüz yapılmadı (tarihi gelecekte).').replace('{n}', future))}</p>` : ''}
          <p class="adm-ask-note">${escHtml(bkT('adm_complete_n', 'Dersler "Geçmiş dersler"e taşınır ve takvimdeki saatleri boşalır.'))}</p>`,
        ok: bkT('adm_bulk_complete_ok', 'Tamamlandı olarak işaretle'),
      });
      if (!a) return;
      await adminBulkComplete(studentUid, idxArr, allLessons);
    }, 'btn-ok');
    const bulkCancelBtn = mkBulkBtn(bkT('adm_bulk_cancel', 'İptal et'), async () => {
      const idxArr = [...selectedIdxs];
      const a = await admAsk({
        title: bkT('adm_bulk_cancel_t', '{n} dersi iptal et').replace('{n}', idxArr.length), danger: true,
        body: `${selListHtml(idxArr)}<p class="adm-ask-note">${escHtml(bkT('adm_cancel_n', 'Ders "İptal" olarak geçmişe düşer, saat boşalır; ücret ve erteleme hakkı değişmez. Öğrenciye otomatik mesaj gitmez.'))}</p>`,
        ok: bkT('adm_bulk_cancel_ok', 'Dersleri iptal et'),
      });
      if (!a) return;
      await adminBulkCancel(studentUid, idxArr, allLessons);
    }, 'btn-danger');
    const cancelSelBtn = admBtn(bkT('adm_bulk_clear', 'Vazgeç'), 'adm-mini', () => {
      selectedIdxs.clear();
      lbox.querySelectorAll('.adm-lrow').forEach(r => setRowSel(r, false));
      updateBulkBar();
    });
    bulkBar.append(bulkLabel, bulkRescheduleBtn, bulkCompleteBtn, bulkCancelBtn, cancelSelBtn);

    upcomingLessons.forEach((lesson, ui) => {
      const lessonIdx = allLessons.findIndex(l => l.date === lesson.date && l.time === lesson.time && l.status === lesson.status);
      const lRow = document.createElement('div');
      lRow.className = 'adm-lrow';
      lRow.dataset.lkey = lesson.date + '_' + lesson.time;
      const dateTxt = `${formatDateStr(lesson.date)} ${lesson.time}–${getEndTime(lesson.time)}`;
      // Durum işaretleri: bugün / geçti (onay penceresi dışında) / ertelendi (eski tarih) / dondu / iptal istendi
      const _live = lesson.status === 'scheduled' || lesson.status === 'rescheduled';
      const lBadges = [
        lesson.date === today ? `<span class="badge accent">${escHtml(bkT('adm_l_today', 'Bugün'))}</span>` : '',
        _live && lesson.date < today && !bkCfmState(lesson, nowMs) ? `<span class="badge warn">${escHtml(bkT('adm_l_past', 'Geçti · işaretlenmedi'))}</span>` : '',
        lesson.status === 'rescheduled' ? `<span class="badge info">${escHtml(bkT('adm_l_moved', 'Ertelendi'))}${lesson.from_date ? ` · ${escHtml(bkT('adm_l_was', 'eski: {d}').replace('{d}', formatDateStr(lesson.from_date)))}` : ''}</span>` : '',
        lesson.status === 'frozen' ? `<span class="badge info">${escHtml(bkT('adm_frozen', 'Donduruldu'))}</span>` : '',
        lesson.status === 'cancel_requested' ? `<span class="badge err">${escHtml(bkT('adm_cancel_req', 'İptal istendi'))}</span>` : '',
      ].join('');
      lRow.innerHTML = `
        <button type="button" class="adm-lsel" aria-pressed="false" data-adm-focus="${studentUid}:l${ui}">
          <span class="adm-box" aria-hidden="true"></span>
          <span class="adm-ltxt"><span><strong>${escHtml(formatDateStr(lesson.date))}</strong> <span class="adm-lt">${escHtml(lesson.time)}–${escHtml(getEndTime(lesson.time))}</span>
            ${lBadges}</span>
            ${lesson.note ? `<span class="adm-lnote">${escHtml(lesson.note)}</span>` : ''}</span>
        </button>`;
      const selBtn = lRow.querySelector('.adm-lsel');
      selBtn.setAttribute('aria-label', `${dateTxt} — ${bkT('adm_select', 'seç')}`);
      selBtn.onclick = () => {
        if (selectedIdxs.has(lessonIdx)) selectedIdxs.delete(lessonIdx); else selectedIdxs.add(lessonIdx);
        setRowSel(lRow, selectedIdxs.has(lessonIdx));
        updateBulkBar();
      };
      // Options button + dropdown
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.className = 'adm-dots';
      optBtn.textContent = '···';
      optBtn.setAttribute('aria-haspopup', 'menu');
      optBtn.setAttribute('aria-expanded', 'false');
      optBtn.setAttribute('aria-label', `${dateTxt} — ${bkT('adm_lesson_opts', 'ders seçenekleri')}`);
      optBtn.setAttribute('data-adm-focus', `${studentUid}:o${ui}`);
      const menu = document.createElement('div');
      menu.className = 'lesson-options-menu';
      menu.setAttribute('role', 'menu');
      menu.style.display = 'none';
      const closeMenu = (refocus) => { menu.style.display = 'none'; optBtn.setAttribute('aria-expanded', 'false'); if (refocus) optBtn.focus(); };
      const mkItem = (label, cls, fn) => {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'menuitem');
        b.className = 'lesson-options-item' + (cls ? ' ' + cls : '');
        b.textContent = label; b.onclick = () => { closeMenu(false); fn(); }; return b;
      };
      const sep = () => Object.assign(document.createElement('div'), { className: 'lesson-options-separator', role: 'separator' });
      // Başlık: hangi ders + öğrencinin kalan erteleme hakkı (Ertele'nin hak etkisi baştan görünür).
      // Öğrenci düzeyindeki eylemler (fiyat, ders ekle, e-posta) sağ sütunda — burada yalnız bu ders.
      const mHead = document.createElement('div');
      mHead.className = 'lesson-options-head';
      mHead.innerHTML = `<strong>${escHtml(dateTxt)}</strong>${isTrial ? '' : `<span class="${credits > 0 ? 'text-info' : 'text-err'}">${escHtml(bkT('adm_menu_cr', 'Erteleme hakkı: {n} kalan').replace('{n}', credits))}</span>`}`;
      menu.append(
        mHead,
        mkItem('✓ ' + bkT('adm_m_done', 'Tamamlandı'), '', () => adminCompleteLesson(studentUid, lessonIdx, allLessons, lesson)),
        mkItem(bkT('adm_m_note', 'Not ekle'), '', () => adminAddLessonNote(studentUid, lessonIdx, allLessons, lesson)),
        sep(),
        mkItem('↺ ' + bkT('adm_m_resched', '1 hafta ertele…'), '', () => adminRescheduleLesson(studentUid, lessonIdx, allLessons, lesson)),
        mkItem(bkT('adm_m_time', 'Saati değiştir (hak düşmez)'), '', () => adminChangeLessonTime(studentUid, lessonIdx, allLessons, lesson)),
        mkItem(bkT('adm_m_date', 'Günü değiştir (hak düşmez)'), '', () => adminChangeLessonDate(studentUid, lessonIdx, allLessons, lesson)),
        sep(),
        mkItem('✕ ' + bkT('adm_m_cancel', 'Dersi iptal et'), 'danger', () => adminCancelSingleLesson(studentUid, lessonIdx, allLessons, lesson))
      );
      const kind = pendMap[studentUid] && pendMap[studentUid][lesson.date + '_' + lesson.time];
      if (kind) {
        const pw = document.createElement('div');
        pw.className = 'adm-lproof adm-lpend';
        pw.append(admBtn(kind === 'reschedule_request' ? bkT('adm_l_pend_rs', 'Erteleme talebi bekliyor → Talepler') : kind === 'time_change_request' ? bkT('adm_l_pend_tc', 'Saat değişikliği talebi bekliyor → Talepler') : bkT('adm_l_pend_cx', 'İptal talebi bekliyor → Talepler'), 'adm-chip adm-chip--warn', () => admGoto('talepler')));
        lRow.classList.add('has-proof');
        lRow._pend = pw;
      }
      optBtn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.lesson-options-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
        document.querySelectorAll('.adm-dots[aria-expanded="true"]').forEach(b => { if (b !== optBtn) b.setAttribute('aria-expanded', 'false'); });
        if (menu.style.display === 'none') {
          // gövdeye taşınır: animasyonlu bölümlerin katman bağlamından ve alt sekme çubuğunun altından çıkar
          if (menu.parentNode !== document.body) document.body.append(menu);
          menu.style.maxHeight = '';
          menu.style.display = 'block';
          optBtn.setAttribute('aria-expanded', 'true');
          // ≤600: alttan açılan sayfa (tam genişlik, sekme çubuğunun üstünde) — CSS konumlar
          if (window.matchMedia('(max-width:600px)').matches) {
            menu.classList.add('is-sheet');
            menu.style.top = ''; menu.style.left = '';
            const tb = document.querySelector('.be-tabbar');
            const tbH = tb && tb.getClientRects().length ? Math.max(0, window.innerHeight - tb.getBoundingClientRect().top) : 0;
            menu.style.bottom = tbH + 'px';
            menu.style.maxHeight = Math.max(200, window.innerHeight - tbH - 72) + 'px';
            menu.querySelector('.lesson-options-item')?.focus({ preventScroll: true });
            return;
          }
          menu.classList.remove('is-sheet'); menu.style.bottom = '';
          const r = optBtn.getBoundingClientRect();
          const cs = getComputedStyle(document.documentElement);
          const topSafe = 12 + (parseFloat(cs.getPropertyValue('--be-sticky-top')) || 0);
          // Alt sekme çubuğu gerçekten ölçülür (--be-tabbar-space bir calc() dizesi; parseFloat NaN verirdi)
          const _tb = document.querySelector('.be-tabbar');
          const botSafe = 12 + (_tb && _tb.getClientRects().length ? Math.max(0, window.innerHeight - _tb.getBoundingClientRect().top) : 0);
          const below = window.innerHeight - botSafe - r.bottom - 4, above = r.top - 4 - topSafe;
          const h = menu.offsetHeight;
          let left = r.right - menu.offsetWidth;
          if (left < 12) left = 12;
          if (left + menu.offsetWidth > window.innerWidth - 12) left = window.innerWidth - menu.offsetWidth - 12;
          let top;
          if (h <= below || below >= above) { top = r.bottom + 4; if (h > below) menu.style.maxHeight = Math.max(160, below) + 'px'; }
          else { if (h > above) menu.style.maxHeight = above + 'px'; top = r.top - 4 - Math.min(h, above); }
          menu.style.top = top + 'px';
          menu.style.left = left + 'px';
          menu.querySelector('.lesson-options-item')?.focus({ preventScroll: true });
        } else { closeMenu(false); }
      };
      menu.onclick = (e) => e.stopPropagation();
      menu.onkeydown = (e) => {
        const items = [...menu.querySelectorAll('.lesson-options-item')];
        const i = items.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        else if (e.key === 'Tab') { e.preventDefault(); closeMenu(true); } // menü gövdede: odak düğmeye döner
      };
      lRow.append(optBtn, menu);
      if (lRow._pend) lRow.append(lRow._pend);
      const proof = admProofEl(studentUid, s, lesson, lRow);
      if (proof) lRow.append(proof);
      lbox.append(lRow);
    });
    if (!upcomingLessons.length) {
      const em = document.createElement('div');
      em.className = 'adm-lempty';
      em.textContent = bkT('adm_no_upcoming', 'Yaklaşan ders yok.');
      lbox.append(em);
    }

    // Geçmiş (tamamlanan / iptal) dersler — açılır. "Geçmişi gizle" kaydı SİLMEZ: derse
    // archived:true yazılır; ders sayısı, ilerleme (2/8) ve gelir (admComputeStats) aynı kalır.
    const pastAll = allLessonsArr.filter(l => l.status === 'completed' || l.status === 'cancelled');
    const showArch = _admPastArch.has(studentUid);
    const pastLessons = pastAll.filter(l => !l.archived || showArch);
    const pastVisible = pastAll.filter(l => !l.archived);
    const archivedCount = pastAll.length - pastVisible.length;
    if (pastAll.length > 0) {
      const pastOpen = _admPastOpen.has(studentUid) || (showArch && archivedCount > 0);
      const foot = document.createElement('div');
      foot.className = 'adm-lfoot';
      const pastToggle = document.createElement('button');
      pastToggle.type = 'button';
      pastToggle.className = 'adm-past-tg';
      pastToggle.setAttribute('aria-expanded', pastOpen ? 'true' : 'false');
      pastToggle.setAttribute('data-adm-focus', `${studentUid}:past`);
      pastToggle.innerHTML = `<svg class="adm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg><span>${escHtml(bkT('bk_past_lessons', 'Geçmiş Dersler'))} (${pastVisible.length})</span>`;
      const pacts = document.createElement('div');
      pacts.className = 'adm-past-acts';
      const cancelledCount = pastVisible.filter(l => l.status === 'cancelled').length;
      if (cancelledCount > 0) {
        const bulkLbl = `${bkT('adm_complete_all', 'Hepsini tamamla')} (${cancelledCount})`;
        const bulkBtn = admBtn(bulkLbl, 'adm-mini adm-mini--ok');
        bulkBtn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await bkConfirm({
            title: bkT('adm_complete_all_t', 'İptal edilenleri tamamlandı say'),
            body: `<p>${escHtml(bkT('adm_complete_all_b', '{n} iptal edilmiş ders "Tamamlandı" olarak işaretlenecek; öğrencinin ilerlemesi buna göre artar.').replace('{n}', cancelledCount))}</p>`,
            ok: bkT('adm_complete_all_ok', 'Tamamlandı olarak işaretle'),
          });
          if (!ok) return;
          bulkBtn.disabled = true; bulkBtn.textContent = bkT('adm_working', 'İşleniyor…');
          try {
            const updated = allLessonsArr.map(l => l.status === 'cancelled' && !l.archived ? { ...l, status: 'completed' } : l);
            await db.collection('reservations').doc(studentUid).set({ lessons: updated }, {merge:true});
            toast(`✓ ${bkT('adm_complete_all_done', '{n} ders tamamlandı olarak işaretlendi.').replace('{n}', cancelledCount)}`);
          } catch(err) { const c=errId(); toast(`Hata (${c}): ` + (err.message||err.code), true); bulkBtn.disabled = false; bulkBtn.textContent = bulkLbl; }
        };
        pacts.append(bulkBtn);
      }
      if (pastVisible.length) {
        const hideLbl = `${bkT('adm_past_hide_all', 'Geçmişi gizle')} (${pastVisible.length})`;
        const hideBtn = admBtn(hideLbl, 'adm-mini');
        hideBtn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await bkConfirm({
            title: bkT('adm_past_hide_t', 'Geçmiş dersleri gizle'),
            body: `<p>${escHtml(bkT('adm_past_hide_b', '{n} geçmiş ders kaydı bu listeden gizlenecek.').replace('{n}', pastVisible.length))}</p>
              <ul class="adm-ask-list"><li>${escHtml(bkT('adm_past_hide_1', 'Kayıtlar silinmez: ilerleme ({d} / {t} ders), paket fiyatı ve aylık gelir aynı kalır.').replace('{d}', doneLessons).replace('{t}', totalLessons))}</li>
              <li>${escHtml(bkT('adm_past_hide_2', 'Öğrencinin panelindeki geçmiş değişmez.'))}</li>
              <li>${escHtml(bkT('adm_past_hide_3', '"Gizlenenleri göster" ile tekrar açabilirsin.'))}</li></ul>`,
            ok: bkT('adm_past_hide_ok', 'Gizle'),
          });
          if (!ok) return;
          hideBtn.disabled = true;
          try {
            const updated = allLessonsArr.map(l => (l.status === 'completed' || l.status === 'cancelled') && !l.archived ? { ...l, archived: true } : l);
            await db.collection('reservations').doc(studentUid).set({ lessons: updated }, {merge:true});
            toast(`✓ ${bkT('adm_past_hidden', '{n} geçmiş ders gizlendi — ilerleme ve gelir değişmedi.').replace('{n}', pastVisible.length)}`);
          } catch(err) { const c=errId(); toast(`Hata (${c}): ` + (err.message||err.code), true); hideBtn.disabled = false; hideBtn.textContent = hideLbl; }
        };
        pacts.append(hideBtn);
      }
      if (archivedCount) {
        const archBtn = admBtn(showArch ? bkT('adm_past_arch_hide', 'Gizlenenleri sakla') : `${bkT('adm_past_arch_show', 'Gizlenenleri göster')} (${archivedCount})`, 'adm-mini');
        archBtn.setAttribute('data-adm-focus', `${studentUid}:arch`);
        archBtn.onclick = (e) => { e.stopPropagation(); if (showArch) _admPastArch.delete(studentUid); else _admPastArch.add(studentUid); admRenderStudents(); };
        pacts.append(archBtn);
      }
      foot.append(pastToggle, pacts);
      const pastDiv = document.createElement('div');
      pastDiv.className = 'adm-past';
      pastDiv.hidden = !pastOpen;
      if (!pastLessons.length) pastDiv.innerHTML = `<div class="adm-lempty">${escHtml(bkT('adm_past_none', 'Görünen geçmiş ders yok.'))}</div>`;
      pastLessons.slice().sort((a,b) => b.date.localeCompare(a.date)).forEach(lesson => {
        const lessonIdx = allLessons.findIndex(l => l.date === lesson.date && l.time === lesson.time && l.status === lesson.status);
        const lRow = document.createElement('div');
        lRow.className = 'adm-prow' + (lesson.archived ? ' is-arch' : '');
        const statusCls = lesson.status === 'completed' ? 'adm-ok' : 'adm-err';
        const statusLabel = lesson.status === 'completed' ? '✓ ' + bkT('adm_m_done', 'Tamamlandı') : '✕ ' + bkT('adm_l_cancelled', 'İptal');
        lRow.innerHTML = `<span class="adm-prow-d">${escHtml(formatDateStr(lesson.date))} ${escHtml(lesson.time)}${lesson.archived ? ` <span class="adm-chip">${escHtml(bkT('adm_l_archived', 'gizli'))}</span>` : ''}</span><span class="adm-prow-s ${statusCls}">${escHtml(statusLabel)}</span>`;
        if (lesson.status === 'cancelled') {
          const doneBtn = admBtn('✓', 'adm-mini adm-mini--ok', () => adminCompleteLesson(studentUid, lessonIdx, allLessons, lesson));
          doneBtn.title = bkT('adm_mark_done_t', 'Tamamlandı olarak işaretle');
          doneBtn.setAttribute('aria-label', `${formatDateStr(lesson.date)} ${lesson.time} — ${bkT('adm_mark_done_t', 'Tamamlandı olarak işaretle')}`);
          lRow.append(doneBtn);
        }
        // Tek kayıt: gizle / geri getir (silmez — sayılar ve gelir değişmez)
        const arch = !!lesson.archived;
        const hBtn = admBtn(arch ? bkT('adm_past_restore', 'Geri getir') : bkT('adm_past_hide', 'Gizle'), 'adm-mini');
        hBtn.setAttribute('aria-label', `${formatDateStr(lesson.date)} ${lesson.time} — ${arch ? bkT('adm_past_restore', 'Geri getir') : bkT('adm_past_hide', 'Gizle')}`);
        hBtn.onclick = async () => {
          const updated = allLessons.map((l, i) => i === lessonIdx ? (arch ? (({ archived, ...rest }) => rest)(l) : { ...l, archived: true }) : l);
          try {
            await db.collection('reservations').doc(studentUid).set({ lessons: updated }, {merge:true});
            toast(arch ? bkT('adm_past_restored', '✓ Kayıt geri getirildi.') : bkT('adm_past_hid1', '✓ Kayıt gizlendi — ilerleme ve gelir değişmedi.'));
          } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
        };
        lRow.append(hBtn);
        const proof = admProofEl(studentUid, s, lesson, lRow);
        if (proof) lRow.append(proof);
        pastDiv.append(lRow);
      });
      pastToggle.onclick = () => {
        const nowOpen = pastDiv.hidden;
        pastDiv.hidden = !nowOpen;
        pastToggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
        if (nowOpen) _admPastOpen.add(studentUid); else _admPastOpen.delete(studentUid);
      };
      lbox.append(foot, pastDiv);
    }
    left.append(lbox);

    // Sağ sütun: ödeme, e-posta, ders/erteleme/fiyat, özel not, plan iptali
    const acts = document.createElement('div');
    acts.className = 'adm-stu-acts';
    if (isTrial) {
      const b = admBtn(bkT('adm_trial_free', 'Deneme · ücretsiz'), 'adm-act adm-act--paid adm-act--full');
      b.disabled = true;
      acts.append(b);
    } else if (isResPaid) {
      // Durum satırı (düğme değil) + küçük "Ödemeyi geri al" — yeşil dolu düğme durum rozeti sanılıyordu
      const paidAt = s.payment_confirmed_at && s.payment_confirmed_at.toDate ? s.payment_confirmed_at.toDate().toLocaleDateString(admLocale(), { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' }) : '';
      const stat = document.createElement('div');
      stat.className = 'adm-paystat adm-act--full';
      stat.innerHTML = `<span class="adm-paystat-t"><span aria-hidden="true">✓</span> ${escHtml(bkT('adm_pay_ok_line', 'Ödeme onaylandı'))}${paidAt ? ` · ${escHtml(paidAt)}` : ''}</span>`;
      const undoBtn = admBtn(bkT('adm_pay_undo', 'Ödemeyi geri al'), 'adm-mini adm-mini--err');
      undoBtn.setAttribute('data-adm-focus', `${studentUid}:pay`);
      undoBtn.onclick = async () => {
        const ok = await bkConfirm({
          title: bkT('adm_pay_undo_t', 'Ödemeyi geri al'), danger: true,
          body: `<p>${escHtml(bkT('adm_pay_undo_b', '{who} ödemesi "onaylanmadı" durumuna döner.').replace('{who}', admPoss(name)))}</p>
            <ul class="adm-ask-list"><li>${escHtml(bkT('adm_pay_undo_1', 'Öğrencinin panelinde ödeme adımları yeniden görünür.'))}</li>
            <li>${escHtml(bkT('adm_pay_undo_2', 'Günlük ödeme hatırlatma e-postaları yeniden başlar.'))}</li>
            <li>${escHtml(bkT('adm_pay_undo_3', 'Dersler, erteleme hakları ve fiyat değişmez; bu ayın gelirinden düşer.'))}</li></ul>`,
          ok: bkT('adm_pay_undo_ok', 'Ödemeyi geri al'),
        });
        if (!ok) return;
        try {
          await db.collection('reservations').doc(studentUid).set({ payment_confirmed: false }, {merge:true});
          toast(bkT('adm_pay_undone', 'Ödeme geri alındı.'));
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
      };
      stat.append(undoBtn);
      acts.append(stat);
    } else if (isPending) {
      const note = document.createElement('p');
      note.className = 'adm-act-note';
      note.textContent = bkT('adm_pay_pending_note', 'Öğrenci ödediğini bildirdi — onay bekliyor.');
      const row2 = document.createElement('div');
      row2.className = 'adm-act-row';
      const okBtn = admBtn('✓ ' + bkT('adm_approve', 'Onayla'), 'adm-act adm-act--pay');
      okBtn.setAttribute('data-adm-focus', `${studentUid}:pay`);
      okBtn.onclick = async () => {
        okBtn.disabled = true;
        try {
          await db.collection('reservations').doc(studentUid).set({ payment_confirmed: true, payment_pending: false, payment_confirmed_at: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
          toast('✓ Ödeme onaylandı.'); renderAdminPanel();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); okBtn.disabled = false; }
      };
      const noBtn = admBtn('✕ ' + bkT('adm_reject', 'Reddet'), 'adm-act adm-act--err');
      noBtn.onclick = async () => {
        noBtn.disabled = true;
        try {
          await db.collection('reservations').doc(studentUid).set({ payment_pending: false }, {merge:true});
          toast('Talep reddedildi.'); renderAdminPanel();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); noBtn.disabled = false; }
      };
      row2.append(okBtn, noBtn);
      acts.append(note, row2);
    } else {
      const btn = admBtn(bkT('adm_mark_paid', 'Ödeme alındı olarak işaretle'), 'adm-act adm-act--pay adm-act--full');
      btn.setAttribute('data-adm-focus', `${studentUid}:pay`);
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          await db.collection('reservations').doc(studentUid).set({ payment_confirmed: true, payment_confirmed_at: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
          toast('✓ Ödeme işaretlendi.'); renderAdminPanel();
        } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); btn.disabled = false; }
      };
      acts.append(btn);
    }
    // Mail button — always visible in student row
    acts.append(admBtn(bkT('adm_mail', 'Mail at'), 'adm-act', () => adminComposeEmail(studentUid, s.student_email||s.from_email||'', s.student_name||s.from_name||'Öğrenci', isTrial)));
    acts.append(admBtn(bkT('adm_rem_welcome_mail', 'Hoşgeldin maili'), 'adm-act', e => adminSendWelcomeEmail(s.student_email||s.from_email||'', s.student_name||s.from_name||'Öğrenci', e.currentTarget)));
    if (!isTrial) {
      acts.append(admBtn('+ ' + bkT('adm_add_lesson', 'Ders ekle'), 'adm-act adm-act--ok', () => adminAddLesson(studentUid, s.price_source === 'package')));
      // Erteleme hakları: kullandır / ver / bitir (pencere havuz toplamını büyük gösterir)
      const crBtn = admBtn(bkT('adm_manage_credits2', 'Erteleme hakları ({n})').replace('{n}', credits), 'adm-act adm-act--gold', () => adminGrantRescheduleCredit(studentUid, s));
      crBtn.setAttribute('aria-haspopup', 'dialog');
      acts.append(crBtn);
      acts.append(admBtn('₺ ' + bkT('adm_edit_price', 'Fiyat düzenle'), 'adm-act adm-act--gold', () => adminEditStudentPrice(studentUid, lessonPrice, totalLessons, s.custom_total_price ?? null)));
      // Dondur: seçimden bağımsız — bugünden itibaren iptal/dondurulmuş olmayan tüm dersler
      const _todayF = toDateStr(new Date());
      const freezeIdxs = allLessons.map((l, i) => ({ l, i })).filter(({ l }) => l.status !== 'cancelled' && l.status !== 'frozen' && l.status !== 'completed' && l.date >= _todayF).map(({ i }) => i);
      if (freezeIdxs.length) acts.append(admBtn(bkT('adm_freeze_pkg', 'Paketi dondur ({n} ders)').replace('{n}', freezeIdxs.length), 'adm-act', () => adminBulkFreezeModal(studentUid, freezeIdxs, allLessons)));
    }
    // Admin private note
    const noteWrap = document.createElement('div');
    noteWrap.className = 'adm-stu-note';
    const noteId = 'admNote-' + studentUid;
    noteWrap.innerHTML = `<label class="adm-k" for="${noteId}">${escHtml(bkT('adm_private_note', 'Özel not · sadece sen görürsün'))}</label>`;
    const noteArea = document.createElement('textarea');
    noteArea.id = noteId;
    noteArea.className = 'textarea';
    noteArea.rows = 3;
    noteArea.placeholder = bkT('adm_private_note_ph', 'Bu öğrenci için not ekle…');
    noteArea.value = Object.prototype.hasOwnProperty.call(_admNoteDrafts, studentUid) ? _admNoteDrafts[studentUid] : (s.admin_note || '');
    noteArea.setAttribute('data-adm-focus', `${studentUid}:note`);
    noteArea.oninput = () => { _admNoteDrafts[studentUid] = noteArea.value; };
    const noteSaveBtn = admBtn(bkT('adm_note_save', 'Notu kaydet'), 'adm-act adm-act--quiet');
    noteSaveBtn.onclick = async () => {
      const orig = bkT('adm_note_save', 'Notu kaydet');
      noteSaveBtn.disabled = true; noteSaveBtn.textContent = '…';
      try {
        await db.collection('reservations').doc(studentUid).set({ admin_note: noteArea.value.trim() }, {merge:true});
        delete _admNoteDrafts[studentUid];
        noteSaveBtn.textContent = '✓ ' + bkT('adm_saved', 'Kaydedildi');
        setTimeout(() => { noteSaveBtn.textContent = orig; noteSaveBtn.disabled = false; }, 1500);
      } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); noteSaveBtn.textContent = orig; noteSaveBtn.disabled = false; }
    };
    noteWrap.append(noteArea, noteSaveBtn);
    acts.append(noteWrap);
    const cancelPlanBtn = admBtn('✕ ' + bkT('adm_delete_plan', 'Planı iptal et'), 'adm-act adm-act--err adm-act--full');
    cancelPlanBtn.onclick = async () => {
      const ok = await bkConfirm({
        title: bkT('adm_plan_del_t', 'Planı iptal et'), danger: true,
        body: `<p><strong>${escHtml(bkT('adm_plan_del_b', '{who} rezervasyonu tamamen silinecek.').replace('{who}', admPoss(name)))}</strong></p>
          <ul class="adm-ask-list">
            <li>${escHtml(bkT('adm_plan_del_1', '{u} yaklaşan ve {p} geçmiş ders kaydı silinir; takvimdeki saatleri boşalır.').replace('{u}', upcomingLessons.length).replace('{p}', allLessonsArr.length - upcomingLessons.length))}</li>
            <li>${escHtml(bkT('adm_plan_del_2', 'Ödeme kaydı ({pay}) ve {c} erteleme hakkı da silinir; bu öğrenciden gelen gelir istatistikten düşer.').replace('{pay}', isTrial ? bkT('adm_free', 'Ücretsiz') : isResPaid ? bkT('adm_paid', 'Ödendi') : bkT('adm_unpaid', 'Ödenmedi')).replace('{c}', credits))}</li>
            <li>${escHtml(bkT('adm_plan_del_3', 'Öğrenci panelde yeniden talep formunu görür. Öğrenciye otomatik mesaj gitmez.'))}</li>
            <li>${escHtml(bkT('adm_plan_del_4', 'Geri alınamaz.'))}</li>
          </ul>`,
        ok: bkT('adm_plan_del_ok', '{who} planını sil').replace('{who}', admPoss(name)),
      });
      if (!ok) return;
      cancelPlanBtn.disabled = true;
      await adminDeletePlan(studentUid, allLessonsArr);
      _admOpenStu.delete(studentUid);
    };
    acts.append(cancelPlanBtn);

    det.append(left, acts);
    art.append(det);
    studList.append(art);
  });
  _admActiveStuCount = shown;
  // Paketi biten öğrenci sayısı bilgisi (gizli ama sayılan kayıtlar)
  if (_hiddenFinished > 0) {
    const info = document.createElement('p');
    info.className = 'adm-hidden-info';
    info.innerHTML = `<span>${_hiddenFinished} ${escHtml(bkT('adm_finished_info', 'öğrencinin paketi tamamlandı'))}${_admShowFinished ? '' : ` — ${escHtml(bkT('adm_finished_hidden', 'listeden gizlendi'))}`}</span> · `;
    const tg = admBtn(_admShowFinished ? bkT('adm_hide', 'Gizle') : bkT('adm_show', 'Göster'), 'adm-linkbtn', () => { _admShowFinished = !_admShowFinished; admRenderStudents(); admUpdateCounts(); });
    tg.setAttribute('data-adm-focus', 'finished');
    info.append(tg);
    studList.append(info);
  } else if (!shown) {
    studList.innerHTML = `<div class="adm-empty">${escHtml(window._i18n?.t('bk_no_students') || 'Henüz öğrenci yok.')}</div>`;
  }
  if (focusKey) {
    const f = studList.querySelector(`[data-adm-focus="${CSS.escape(focusKey)}"]`);
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
}

// ─── Admin Calendar (Haftalık takvim) ─────────────────────
// Masaüstü: 24 saat × 7 gün ızgarası (kaydırılabilir; ilk açılışta 10:00); ≤600: gün kartları.
// Kapalı hücreler kayıtlı müsaitlikten (settings/global). Salt görüntü.
let _calWeekOffset = 0;
var _admCalScrollTop = null;
var _admCalWeekShown = null;   // son çizilen haftanın pazartesisi (hafta değişince ilk derse kaydırılır)
const DAY_NAMES_TR = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const DAY_NAMES_EN = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function getDayNames() { return window._i18n?.getLang()==='en' ? DAY_NAMES_EN : DAY_NAMES_TR; }

function renderAdminCalendar(lessons, weekOffset) {
  _calWeekOffset = weekOffset || 0;
  _admCalLessons = lessons || [];
  const calEl = document.getElementById('adminCalendar');
  if (!calEl) return;


  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dow + _calWeekOffset * 7);
  weekStart.setHours(0,0,0,0);
  const days = Array.from({length:7}, (_,i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
  const todayStr = toDateStr(new Date());
  document.getElementById('calWeekLabel').textContent =
    `${days[0].getDate()} ${getMonths()[days[0].getMonth()]} – ${days[6].getDate()} ${getMonths()[days[6].getMonth()]}`;

  const byKey = {};
  const byDate = {};
  _admCalLessons.forEach(l => {
    (byKey[l.date + '_' + String(l.time).slice(0, 2)] = byKey[l.date + '_' + String(l.time).slice(0, 2)] || []).push(l);
    (byDate[l.date] = byDate[l.date] || []).push(l);
  });
  const av = (_admAvail && _admAvail.saved) || null;
  const dayOff = d => !!(av && Array.isArray(av.days) && !av.days.includes(d.getDay()));
  const hourOff = (d, hh) => !!(av && av.blocked && Array.isArray(av.blocked[d.getDay()]) && av.blocked[d.getDay()].includes(hh));
  const typeCls = t => t === 'trial' ? 'is-t' : t === 'single' ? 'is-s' : 'is-m';
  const short = getDaysShort();

  let head = '<span></span>';
  days.forEach(d => {
    const ds = toDateStr(d);
    head += `<span class="${ds === todayStr ? 'is-today' : ''}${dayOff(d) ? ' is-off' : ''}">${escHtml(short[d.getDay()])}<small>${d.getDate()} ${escHtml(getMonths()[d.getMonth()])}</small></span>`;
  });
  let grid = '';
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0') + ':00';
    grid += `<span class="adm-cal-h">${hh}</span>`;
    days.forEach(d => {
      const ds = toDateStr(d);
      const L = (byKey[ds + '_' + String(h).padStart(2, '0')] || []).sort((a, b) => String(a.time).localeCompare(String(b.time)));
      const today = ds === todayStr ? ' is-today' : '';
      if (L.length) {
        const txt = L[0].name + (L.length > 1 ? ` +${L.length - 1}` : '');
        const title = L.map(x => `${x.time}–${getEndTime(x.time)} ${x.full || x.name}`).join(', ');
        // Ders bloğu düğme: öğrencinin detayını o derse kaydırıp ders menüsünü açar
        grid += `<button type="button" class="adm-cal-c ${typeCls(L[0].type)}${today}" data-cal-uid="${escHtml(L[0].uid || '')}" data-cal-date="${escHtml(L[0].date)}" data-cal-time="${escHtml(L[0].time)}" data-h="${h}" title="${escHtml(title)}" aria-label="${escHtml(`${getDayNames()[(d.getDay() + 6) % 7]} ${formatDateStr(ds)} · ${title} — ${bkT('adm_cal_open', 'dersi aç')}`)}">${escHtml(txt)}</button>`;
      } else if (dayOff(d) || hourOff(d, hh)) {
        grid += `<span class="adm-cal-c is-off${today}"></span>`;
      } else {
        grid += `<span class="adm-cal-c${today}"></span>`;
      }
    });
  }
  let list = '';
  days.forEach((d, i) => {
    const ds = toDateStr(d);
    const slots = (byDate[ds] || []).sort((a,b) => a.time.localeCompare(b.time));
    list += `<div class="adm-cday${slots.length ? ' has-l' : ''}${ds === todayStr ? ' is-today' : ''}${dayOff(d) ? ' is-off' : ''}">
      <span class="adm-cday-name">${escHtml(getDayNames()[i])}<small>${d.getDate()} ${escHtml(getMonths()[d.getMonth()])}</small></span>
      <span class="adm-cday-ls">${slots.length ? slots.map(s => `<button type="button" class="adm-cday-l" data-cal-uid="${escHtml(s.uid || '')}" data-cal-date="${escHtml(s.date)}" data-cal-time="${escHtml(s.time)}"><span class="adm-t">${escHtml(s.time)}–${escHtml(getEndTime(s.time))}</span>${admAvaHtml(s.photo, s.name, 'adm-mini-ava')}<span>${escHtml(s.full || s.name)}</span><span class="adm-cday-go" aria-hidden="true">›</span></button>`).join('')
        : `<span class="adm-cday-empty">${escHtml(dayOff(d) ? bkT('adm_day_closed', 'Kapalı gün') : bkT('adm_no_lesson', 'Ders yok'))}</span>`}</span>
    </div>`;
  });
  calEl.innerHTML = `<div class="adm-calbox"><div class="adm-cal-head" aria-hidden="true">${head}</div>
      <button type="button" class="adm-cal-more is-up" hidden></button>
      <div class="adm-cal-scroll"><div class="adm-cal-grid">${grid}</div></div>
      <button type="button" class="adm-cal-more is-down" hidden></button></div>
    <div class="adm-cal-list">${list}</div>`;
  calEl.querySelectorAll('[data-cal-uid]').forEach(b => {
    b.onclick = () => { if (b.dataset.calUid) admOpenLesson(b.dataset.calUid, b.dataset.calDate, b.dataset.calTime); };
  });
  const sc = calEl.querySelector('.adm-cal-scroll');
  if (sc) {
    // Hafta değişince (ya da ilk çizimde) haftanın en erken dersinin 1 saat öncesine kaydır;
    // aynı haftanın yeniden çiziminde admin'in kaydırdığı yer korunur.
    const ROW = 40;
    const weekKey = toDateStr(days[0]);
    const hrs = [...calEl.querySelectorAll('.adm-cal-grid [data-h]')].map(b => +b.dataset.h);
    // (dersler henüz yüklenmeden yapılan boş çizim haftayı "konumlandı" saymaz)
    if (_admCalWeekShown !== weekKey || _admCalScrollTop == null) {
      _admCalWeekShown = hrs.length ? weekKey : null;
      _admCalScrollTop = hrs.length ? Math.max(0, (Math.min(...hrs) - 1) * ROW) : 8 * ROW;
    }
    sc.scrollTop = _admCalScrollTop;
    // Görünür alanın dışında kalan dersler için "↑ / ↓ N ders" ipucu (tıklayınca oraya kayar)
    const up = calEl.querySelector('.adm-cal-more.is-up'), down = calEl.querySelector('.adm-cal-more.is-down');
    const hint = () => {
      if (!sc.clientHeight) return;
      const top = sc.scrollTop, bot = top + sc.clientHeight;
      const above = hrs.filter(h => (h + 1) * ROW <= top + 8), below = hrs.filter(h => h * ROW >= bot - 8);
      up.hidden = !above.length; down.hidden = !below.length;
      up.textContent = `↑ ${bkT('adm_cal_above', '{n} ders yukarıda').replace('{n}', above.length)}`;
      down.textContent = `↓ ${bkT('adm_cal_below', '{n} ders aşağıda').replace('{n}', below.length)}`;
      up.onclick = () => { sc.scrollTop = Math.max(0, (Math.max(...above) - 1) * ROW); };
      down.onclick = () => { sc.scrollTop = Math.max(0, Math.min(...below) * ROW - sc.clientHeight + 2 * ROW); };
    };
    sc.addEventListener('scroll', () => { if (sc.clientHeight > 0) _admCalScrollTop = sc.scrollTop; hint(); }, { passive: true });
    hint();
  }
  document.getElementById('calPrev').onclick = () => renderAdminCalendar(_admCalLessons, _calWeekOffset - 1);
  document.getElementById('calNext').onclick = () => renderAdminCalendar(_admCalLessons, _calWeekOffset + 1);
}

// ─── Admin: Delete Entire Plan ────────────────────────────
async function adminDeletePlan(studentUid, allLessons) {
  try {
    const batch = db.batch();
    batch.delete(db.collection('reservations').doc(studentUid));
    (allLessons || []).forEach(l => {
      if (['scheduled','rescheduled','frozen','cancel_requested'].includes(l.status)) {
        batch.delete(db.collection('booked_slots').doc(l.date + '_' + l.time));
      }
    });
    await batch.commit();
    // Reset access request separately (may silently fail if rules not yet deployed)
    db.collection('booking_access_requests').doc(studentUid).delete().catch(() => {});
    toast('Plan tamamen silindi.');
    window._slotsSynced = false;
  } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
}

// ─── Admin: Edit Student Price ────────────────────────────
async function adminEditStudentPrice(studentUid, currentLessonPrice, totalLessons, currentTotalPrice) {
  const initTotal = currentTotalPrice ?? (currentLessonPrice * totalLessons);
  const initPer   = currentLessonPrice;

  const modal = Object.assign(document.createElement('div'), { innerHTML: `
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-title">Fiyat düzenle</div>
        <label class="field-label" for="adminPerInput">Ders başı (TL)</label>
        <input id="adminPerInput" type="number" min="0" value="${initPer}" class="input dlg-field">
        <label class="field-label" for="adminTotalInput">Toplam (TL) — ${totalLessons} ders</label>
        <input id="adminTotalInput" type="number" min="0" value="${initTotal}" class="input dlg-field text-accent">
        <div class="modal-actions modal-actions-fill">
          <button id="adminPriceCancel" class="btn btn-ghost">İptal</button>
          <button id="adminPriceSave" class="btn btn-primary">Kaydet</button>
        </div>
      </div>
    </div>` });
  document.body.append(modal);

  const perInput   = modal.querySelector('#adminPerInput');
  const totalInput = modal.querySelector('#adminTotalInput');

  // Sync: changing per-lesson → update total
  perInput.oninput = () => {
    const p = parseFloat(perInput.value) || 0;
    totalInput.value = Math.round(p * totalLessons);
  };
  // Sync: changing total → update per-lesson
  totalInput.oninput = () => {
    const t = parseFloat(totalInput.value) || 0;
    perInput.value = totalLessons > 0 ? Math.round(t / totalLessons) : 0;
  };

  modal.querySelector('#adminPriceCancel').onclick = () => modal.remove();
  modal.querySelector('#adminPriceSave').onclick = async () => {
    const perVal   = parseInt(perInput.value, 10);
    const totalVal = parseInt(totalInput.value, 10);
    if (isNaN(perVal) || perVal < 0 || isNaN(totalVal) || totalVal < 0) return;
    modal.remove();
    // Değişiklik yoksa yazma: aksi halde paket fiyatı tek tıkla kalıcı "admin fiyatı"na
    // dönüşür (price_source 'admin' sonraki paketsiz onaylarda korunur).
    if (perVal === Number(initPer) && totalVal === Number(initTotal)) { toast('Fiyat değişmedi.'); return; }
    try {
      await db.collection('reservations').doc(studentUid).set({
        custom_lesson_price: perVal,
        custom_total_price:  totalVal,
        price_source:        'admin', // elle fiyat: yeni paketsiz onayda korunur, panelde indirim satırı gizlenir
      }, {merge:true});
      toast(`✓ Fiyat güncellendi — ${totalVal.toLocaleString('tr-TR')} TL toplam`);
      renderAdminPanel();
    } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
  };
}

// ─── Admin: Cancel Lesson ─────────────────────────────────
// ─── Admin: Bulk Operations ────────────────────────────────────────────────
async function adminBulkReschedule(studentUid, idxArr, allLessons) {
  // Cascade'li, date+time bilinçli toplu erteleme. İttiğimiz ders gelecek bir
  // dersle çakışırsa o ders de +7 itilir. Sonra booked_slots batch'i set/delete
  // çakışmasına düşmeyecek şekilde uygulanır (aynı key hem silinip hem
  // yeniden set edilince final delete kazanırdı; kalan referans yok).
  // Pencere: kayan dersler + "Erteleme hakkından düş" kutusu (her seçili ders 1 hak; hak yetmezse
  // kalan kadar). Kutu kapalıysa hak düşmez (ör. eğitmenden kaynaklı erteleme).
  const resSnap = await db.collection('reservations').doc(studentUid).get().catch(() => null);
  const resData = resSnap?.data() || {};
  const credit = totalRescheduleCredits(resData);
  const updated = allLessons.map(l => ({...l}));
  const moves = []; // {idx, oldDate, newDate, time}
  idxArr.forEach(idx => {
    const l = updated[idx];
    if (!l || l.status === 'cancelled') return;
    const oldD = l.date;
    const newD = addWeekStr(oldD);
    updated[idx] = {...l, date: newD, status: 'rescheduled', from_date: l.from_date || oldD};
    moves.push({ idx, oldDate: oldD, newDate: newD, time: l.time });
  });
  if (!moves.length) return;
  const selN = moves.length;
  cascadeRescheduleConflicts(updated, moves);
  updated.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const useN = Math.min(selN, credit);
  const a = await admAsk({
    eyebrow: bkT('adm_rs_eyebrow', 'Dersi ertele'),
    title: bkT('adm_rs_bulk_t', '{n} dersi 1 hafta ertele').replace('{n}', selN),
    body: `${admMovesHtml(moves)}
      ${moves.length > selN ? `<p class="adm-ask-note">${escHtml(bkT('adm_rs_cascade', 'Yeni tarih başka bir dersine denk geldiği için {n} ders de 1 hafta kayar; paketin bitişi uzar.').replace('{n}', moves.length - selN))}</p>` : ''}
      <p class="adm-ask-big">${escHtml(bkT('adm_rs_credit', 'Erteleme hakkı'))}: <strong>${credit}</strong> ${escHtml(bkT('adm_rs_left', 'kalan'))}</p>`,
    check: credit > 0 ? {
      label: escHtml(bkT('adm_rs_bulk_cb', 'Erteleme hakkından düş: {k} hak ({a} → {b})').replace('{k}', useN).replace('{a}', credit).replace('{b}', credit - useN))
        + (useN < selN ? `<br><span class="adm-ask-note">${escHtml(bkT('adm_rs_bulk_short', '{n} ders seçildi ama {k} hak var — kalanlar hak düşmeden ertelenir.').replace('{n}', selN).replace('{k}', credit))}</span>` : '')
        + `<br><span class="adm-ask-note">${escHtml(bkT('adm_rs_bulk_off', 'Kendi iptalinse (hastalık, tatil) işareti kaldır.'))}</span>`,
      checked: true,
    } : null,
    ok: bkT('adm_rs_bulk_ok', '{n} dersi ertele').replace('{n}', selN),
  });
  if (!a) return;
  try {
    const upd = { lessons: updated };
    if (credit > 0 && a.checked) {
      let res = resData;
      const logs = [];
      moves.slice(0, useN).forEach((m, i) => {
        res = { reschedule_credits: consumeRescheduleCredit(res, m.oldDate) };
        logs.push({ at: new Date(Date.now() + i).toISOString(), kind: 'used', lesson_date: m.oldDate, n: 1, by: 'admin' });
      });
      upd.reschedule_credits = res.reschedule_credits;
      upd.reschedule_log = firebase.firestore.FieldValue.arrayUnion(...logs);
    }
    const batch = db.batch();
    applySlotMovesToBatch(batch, moves, studentUid);
    batch.set(db.collection('reservations').doc(studentUid), upd, {merge:true});
    await batch.commit();
    toast(`✓ ${bkT('adm_rs_bulk_done', '{n} ders 1 hafta ertelendi').replace('{n}', moves.length)} · ${credit > 0 && a.checked
      ? bkT('adm_rs_done_use', 'kalan hak {n}').replace('{n}', credit - useN) : bkT('adm_rs_done_free', 'hak düşülmedi')}`);
    window._slotsSynced = false;
  } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
}

async function adminBulkComplete(studentUid, idxArr, allLessons) {
  try {
    const batch = db.batch();
    const updated = allLessons.map((l, i) => {
      if (!idxArr.includes(i)) return l;
      batch.delete(db.collection('booked_slots').doc(l.date + '_' + l.time));
      return { ...l, status: 'completed' };
    });
    batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
    await batch.commit();
    toast(`✓ ${idxArr.length} ders tamamlandı olarak işaretlendi.`); renderAdminPanel();
  } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
}

async function adminBulkCancel(studentUid, idxArr, allLessons) {
  try {
    const batch = db.batch();
    const updated = allLessons.map((l, i) => {
      if (!idxArr.includes(i)) return l;
      batch.delete(db.collection('booked_slots').doc(l.date + '_' + l.time));
      return { ...l, status: 'cancelled' };
    });
    batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
    await batch.commit();
    toast(`✓ ${idxArr.length} ders iptal edildi.`); renderAdminPanel();
  } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
}

function adminBulkFreezeModal(studentUid, idxArr, allLessons) {
  const selectedLessons = idxArr.map(i => allLessons[i]).filter(l => l && l.status !== 'cancelled' && l.status !== 'frozen');
  if (!selectedLessons.length) { toast('Geçerli ders seçilmedi.', true); return; }
  const earliest = selectedLessons.reduce((a, b) => a.date <= b.date ? a : b);
  const modal = Object.assign(document.createElement('div'), { innerHTML: `
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-title">Dersleri dondur</div>
        <div class="modal-body dlg-field">Tüm ${selectedLessons.length} yaklaşan ders dondurulacak. Yeni başlangıç tarihini seç — dersler oradan itibaren aynı aralıkla devam eder.</div>
        <label class="field-label" for="freezeResumeDate">Yeniden başlama tarihi</label>
        <input type="date" id="freezeResumeDate" min="${toDateStr(new Date())}" value="${earliest.date}" class="input dlg-field">
        <div class="modal-actions modal-actions-fill">
          <button id="freezeCancel" class="btn btn-ghost">Vazgeç</button>
          <button id="freezeConfirm" class="btn btn-primary">Dondur</button>
        </div>
      </div>
    </div>` });
  document.body.append(modal);
  modal.querySelector('#freezeCancel').onclick = () => modal.remove();
  modal.querySelector('#freezeConfirm').onclick = async () => {
    const resumeDate = modal.querySelector('#freezeResumeDate').value;
    if (!resumeDate) { toast('Tarih seç.', true); return; }
    const confirmBtn = modal.querySelector('#freezeConfirm');
    confirmBtn.disabled = true; confirmBtn.textContent = '…';
    try {
      // Shift = resumeDate - earliest lesson date (in ms)
      const shiftMs = dateStrToObj(resumeDate) - dateStrToObj(earliest.date);
      const shiftDays = Math.round(shiftMs / (1000 * 60 * 60 * 24));
      const batch = db.batch();
      const updated = allLessons.map((l, i) => {
        if (!idxArr.includes(i) || l.status === 'cancelled' || l.status === 'frozen') return l;
        const d = dateStrToObj(l.date); d.setDate(d.getDate() + shiftDays); const shifted = toDateStr(d);
        batch.delete(db.collection('booked_slots').doc(l.date + '_' + l.time));
        batch.set(db.collection('booked_slots').doc(shifted + '_' + l.time), { date: shifted, time: l.time, student_uid: studentUid });
        return { ...l, date: shifted, status: 'frozen' };
      });
      batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
      await batch.commit();
      modal.remove();
      toast(`✓ ${selectedLessons.length} ders ${resumeDate} tarihinden itibaren planlandı.`); renderAdminPanel();
    } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); confirmBtn.disabled=false; confirmBtn.textContent='Dondur'; }
  };
}

async function adminCancelLesson(studentUid, lessonIdx, allLessons, lesson) {
  try {
    const updatedLessons = allLessons.map((l, i) =>
      i === lessonIdx ? { ...l, status: 'cancelled' } : l
    );
    const batch = db.batch();
    batch.set(db.collection('reservations').doc(studentUid), { lessons: updatedLessons }, {merge:true});
    batch.delete(db.collection('booked_slots').doc(lesson.date + '_' + lesson.time));
    await batch.commit();
    toast(`✓ Ders iptal edildi — ${formatDateStr(lesson.date)} ${lesson.time}`);
    window._slotsSynced = false;
    renderAdminPanel();
  } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
}

// ─── Admin: Reschedule Lesson ─────────────────────────────
async function adminChangeLessonTime(studentUid, lessonIdx, allLessons, lesson) {
  const optsHtml = await admTimeOptionsHtml(lesson.date, studentUid, lesson.time);
  const liveN = allLessons.filter(l=>l.status==='scheduled'||l.status==='rescheduled').length;
  const modal = Object.assign(document.createElement('div'), { innerHTML: `
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-title">${escHtml(bkT('adm_tp_title', 'Yeni saat seç'))}</div>
        <div class="dlg-sub">${escHtml(formatDateStr(lesson.date))} — ${escHtml(bkT('adm_tp_now', 'şu an'))}: ${escHtml(lesson.time)}</div>
        <label class="field-label" for="adminTimeSelect">${escHtml(bkT('adm_tp_label', 'Yeni saat'))}</label>
        <select id="adminTimeSelect" class="select dlg-field">${optsHtml}</select>
        <p class="adm-ask-note">${escHtml(bkT('adm_tp_note', '"dolu" saatler başka öğrencinin; "kapalı saat" müsaitlikte kapattığın saattir (seçebilirsin). Erteleme hakkı düşmez.'))}</p>
        <label class="check-row">
          <input type="checkbox" id="applyAllTimes">
          <span>${escHtml(bkT('adm_tp_all', 'Tüm yaklaşan derslere uygula ({n} ders)').replace('{n}', liveN))}</span>
        </label>
        <div class="modal-actions modal-actions-fill">
          <button id="adminTimeCancel" class="btn btn-ghost">${escHtml(bkT('bk_sc_cancel', 'Vazgeç'))}</button>
          <button id="adminTimeSave" class="btn btn-primary" disabled>${escHtml(bkT('adm_save', 'Kaydet'))}</button>
        </div>
      </div>
    </div>` });
  document.body.append(modal);
  const _ov = modal.querySelector('.modal-overlay'), _bx = modal.querySelector('.modal');
  const closeDlg = bkDialog(_ov, _bx, { title: '.modal-title', focus: '#adminTimeSelect', escape: () => { closeDlg(); modal.remove(); } });
  const selEl = modal.querySelector('#adminTimeSelect');
  selEl.onchange = () => { modal.querySelector('#adminTimeSave').disabled = !selEl.value; };
  modal.querySelector('#adminTimeCancel').onclick = () => { closeDlg(); modal.remove(); };
  modal.querySelector('#adminTimeSave').onclick = async () => {
    const newTime = selEl.value;
    if (!newTime) return;
    const applyAll = modal.querySelector('#applyAllTimes').checked;
    closeDlg(); modal.remove();
    try {
      const batch = db.batch();
      if (applyAll) {
        const targets = allLessons.filter(l => l.status === 'scheduled' || l.status === 'rescheduled');
        // Check if any of the new slots conflict with OTHER students
        const conflictChecks = await Promise.all(
          targets.map(l => db.collection('booked_slots').doc(l.date + '_' + newTime).get())
        );
        const conflicts = conflictChecks.filter(s => s.exists && s.data().student_uid !== studentUid);
        if (conflicts.length > 0) {
          const ok = await bkConfirm({ title: bkT('adm_tp_conf_t', 'Çakışma var'), danger: true,
            body: `<p>${escHtml(bkT('adm_tp_conf_all', '{n} tarihte {t} başka bir öğrenciye ait. Yine de tüm derslere uygulansın mı?').replace('{n}', conflicts.length).replace('{t}', newTime))}</p>`,
            ok: bkT('adm_tp_conf_ok', 'Yine de uygula') });
          if (!ok) return;
        }
        const updated = allLessons.map(l =>
          (l.status === 'scheduled' || l.status === 'rescheduled') ? { ...l, time: newTime } : l
        );
        batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
        targets.forEach(l => {
          batch.delete(db.collection('booked_slots').doc(l.date + '_' + l.time));
          batch.set(db.collection('booked_slots').doc(l.date + '_' + newTime), { date: l.date, time: newTime, student_uid: studentUid });
        });
        await batch.commit();
        toast(`✓ ${targets.length} dersin saati → ${newTime} olarak güncellendi.`);
      } else {
        const conflict = await db.collection('booked_slots').doc(lesson.date + '_' + newTime).get();
        if (conflict.exists && conflict.data().student_uid !== studentUid) {
          const ok = await bkConfirm({ title: bkT('adm_tp_conf_t', 'Çakışma var'), danger: true,
            body: `<p>${escHtml(bkT('adm_tp_conf_one', '{d} {t} dolu. Yine de değiştirilsin mi?').replace('{d}', formatDateStr(lesson.date)).replace('{t}', newTime))}</p>`,
            ok: bkT('adm_tp_conf_ok', 'Yine de uygula') });
          if (!ok) return;
        }
        const updated = allLessons.map((l, i) => i === lessonIdx ? { ...l, time: newTime } : l);
        batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
        batch.delete(db.collection('booked_slots').doc(lesson.date + '_' + lesson.time));
        batch.set(db.collection('booked_slots').doc(lesson.date + '_' + newTime), { date: lesson.date, time: newTime, student_uid: studentUid });
        await batch.commit();
        toast(`✓ Saat değiştirildi → ${newTime}`);
      }
      renderAdminPanel();
    } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
  };
}

async function adminChangeLessonDate(studentUid, lessonIdx, allLessons, lesson) {
  const modal = Object.assign(document.createElement('div'), { innerHTML: `
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-title">Yeni gün seç</div>
        <div class="dlg-sub">Mevcut: ${formatDateStr(lesson.date)} ${lesson.time}</div>
        <input type="date" id="adminDateInput" value="${lesson.date}" min="${toDateStr(new Date())}" class="input dlg-field">
        <div class="modal-actions modal-actions-fill">
          <button id="adminDateCancel" class="btn btn-ghost">İptal</button>
          <button id="adminDateSave" class="btn btn-primary">Kaydet</button>
        </div>
      </div>
    </div>` });
  document.body.append(modal);
  modal.querySelector('#adminDateCancel').onclick = () => modal.remove();
  modal.querySelector('#adminDateSave').onclick = async () => {
    const newDate = modal.querySelector('#adminDateInput').value;
    if (!newDate || newDate === lesson.date) { modal.remove(); return; }
    modal.remove();

    const today = toDateStr(new Date());
    const oldWd = dateStrToObj(lesson.date).getDay();

    const sameWdLessons = allLessons
      .map((l,i) => ({...l, idx:i}))
      .filter(l => l.idx !== lessonIdx
        && ['scheduled','rescheduled'].includes(l.status)
        && l.date >= today
        && dateStrToObj(l.date).getDay() === oldWd);

    let mode = 'single';
    if (sameWdLessons.length > 0) {
      const wd = getDays()[oldWd];
      const ans = await showChoiceModal({
        title: bkT('adm_dc_t', 'Hangi dersler taşınsın?'),
        body: escHtml(bkT('adm_dc_b', 'Öğrencinin {n} gelecek {wd} dersi daha var. Erteleme hakkı düşmez.').replace('{n}', sameWdLessons.length).replace('{wd}', wd)),
        choices: [
          { label: bkT('adm_dc_one', 'Yalnız bu dersi taşı'), value: 'single', cls: 'btn-primary' },
          { label: bkT('adm_dc_all', 'Tüm {wd} derslerini aynı gün kadar kaydır ({n} ders)').replace('{wd}', wd).replace('{n}', sameWdLessons.length + 1), value: 'all', cls: 'btn-ghost' },
        ],
      });
      if (!ans) return;
      mode = ans;
    }


    try {
      if (mode === 'single') {
        const conflict = await db.collection('booked_slots').doc(newDate + '_' + lesson.time).get();
        if (conflict.exists && conflict.data().student_uid !== studentUid) {
          const ok = await bkConfirm({ title: bkT('adm_tp_conf_t', 'Çakışma var'), danger: true,
            body: `<p>${escHtml(bkT('adm_tp_conf_one', '{d} {t} dolu. Yine de değiştirilsin mi?').replace('{d}', formatDateStr(newDate)).replace('{t}', lesson.time))}</p>`,
            ok: bkT('adm_tp_conf_ok', 'Yine de uygula') });
          if (!ok) return;
        }
        const updated = allLessons.map((l, i) => i === lessonIdx ? { ...l, date: newDate } : l)
          .sort((a,b) => a.date.localeCompare(b.date));
        const batch = db.batch();
        batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
        batch.delete(db.collection('booked_slots').doc(lesson.date + '_' + lesson.time));
        batch.set(db.collection('booked_slots').doc(newDate + '_' + lesson.time), { date: newDate, time: lesson.time, student_uid: studentUid });
        await batch.commit();
        toast(`✓ Gün değiştirildi → ${formatDateStr(newDate)}`);
        renderAdminPanel();
      } else {
        const shiftDays = Math.round((dateStrToObj(newDate) - dateStrToObj(lesson.date)) / 86400000);
        const toMove = [{...lesson, idx: lessonIdx}, ...sameWdLessons];
        const moves = toMove.map(l => {
          const d = dateStrToObj(l.date);
          d.setDate(d.getDate() + shiftDays);
          return { idx: l.idx, oldDate: l.date, newDate: toDateStr(d), time: l.time };
        });

        const conflicts = [];
        for (const m of moves) {
          const snap = await db.collection('booked_slots').doc(m.newDate + '_' + m.time).get();
          if (snap.exists && snap.data().student_uid !== studentUid) conflicts.push(m);
        }
        if (conflicts.length > 0) {
          await bkConfirm({ title: bkT('adm_tp_conf_t', 'Çakışma var'),
            body: `<p>${escHtml(bkT('adm_dc_conf', 'Başka öğrencinin dersleriyle çakışıyor — değişiklik yapılmadı:'))}</p><ul class="adm-ask-list">${conflicts.map(c => `<li>${escHtml(formatDateStr(c.newDate))} ${escHtml(c.time)}</li>`).join('')}</ul>`,
            ok: bkT('bk_ok', 'Tamam') });
          return;
        }

        const okMove = await bkConfirm({ title: bkT('adm_dc_move_t', '{n} ders taşınacak').replace('{n}', moves.length),
          body: admMovesHtml(moves) + `<p class="adm-ask-note">${escHtml(bkT('adm_dc_free', 'Erteleme hakkı düşmez.'))}</p>`,
          ok: bkT('adm_dc_move_ok', 'Taşı') });
        if (!okMove) return;

        const updated = allLessons.map(l => ({...l}));
        moves.forEach(m => { updated[m.idx] = { ...updated[m.idx], date: m.newDate }; });
        updated.sort((a,b) => a.date.localeCompare(b.date));

        const batch = db.batch();
        batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
        moves.forEach(m => {
          batch.delete(db.collection('booked_slots').doc(m.oldDate + '_' + m.time));
          batch.set(db.collection('booked_slots').doc(m.newDate + '_' + m.time), { date: m.newDate, time: m.time, student_uid: studentUid });
        });
        await batch.commit();
        toast(`✓ ${moves.length} ders taşındı`);
        renderAdminPanel();
      }
    } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
  };
}

// isPackage: rezervasyon fiyatı paketten geliyor (price_source 'package'). O zaman eklenen
// ders varsayılan olarak paket dışı ek ders sayılır ve toplamı LESSON_PRICE artırır;
// telafi dersi gibi ücretsiz eklemek için kutu kaldırılabilir.
async function adminAddLesson(studentUid, isPackage = false) {
  const today = toDateStr(new Date());
  const timeOpts = await admTimeOptionsHtml(today, studentUid, null);
  const modal = Object.assign(document.createElement('div'), { innerHTML: `
    <div class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-title">${escHtml(bkT('adm_add_t', 'Ders ekle'))}</div>
        <label class="field-label" for="addLessonDate">${escHtml(bkT('adm_add_date', 'Tarih'))}</label>
        <input type="date" id="addLessonDate" value="${today}" min="${today}" class="input dlg-field">
        <label class="field-label" for="addLessonTime">${escHtml(bkT('adm_tp_label', 'Saat'))}</label>
        <select id="addLessonTime" class="select dlg-field">${timeOpts}</select>
        ${isPackage ? `<label class="check-row">
          <input type="checkbox" id="addLessonCharge" checked>
          <span>Paket dışı ek ders olarak ücretlendir (+${tlFmt(LESSON_PRICE)}). Telafi dersi ise kaldır.</span>
        </label>` : ''}
        <div class="modal-actions modal-actions-fill">
          <button id="addLessonCancel" class="btn btn-ghost">${escHtml(bkT('bk_sc_cancel', 'Vazgeç'))}</button>
          <button id="addLessonSave" class="btn btn-primary" disabled>${escHtml(bkT('adm_add_ok', 'Ekle'))}</button>
        </div>
      </div>
    </div>` });
  document.body.append(modal);
  const _ov = modal.querySelector('.modal-overlay'), _bx = modal.querySelector('.modal');
  const closeDlg = bkDialog(_ov, _bx, { title: '.modal-title', focus: '#addLessonDate', escape: () => { closeDlg(); modal.remove(); } });
  const _tSel = modal.querySelector('#addLessonTime'), _dIn = modal.querySelector('#addLessonDate'), _sv = modal.querySelector('#addLessonSave');
  _tSel.onchange = () => { _sv.disabled = !_tSel.value; };
  // Tarih değişince o günün dolu / kapalı saatleri yeniden işaretlenir
  _dIn.onchange = async () => { if (!_dIn.value) return; _tSel.innerHTML = await admTimeOptionsHtml(_dIn.value, studentUid, null); _sv.disabled = true; };
  modal.querySelector('#addLessonCancel').onclick = () => { closeDlg(); modal.remove(); };
  modal.querySelector('#addLessonSave').onclick = async () => {
    const date = modal.querySelector('#addLessonDate').value;
    const time = modal.querySelector('#addLessonTime').value;
    if (!date || !time) return;
    const saveBtn = modal.querySelector('#addLessonSave');
    saveBtn.disabled = true; saveBtn.textContent = '…';
    try {
      const conflict = await db.collection('booked_slots').doc(date + '_' + time).get();
      if (conflict.exists) {
        saveBtn.disabled = false; saveBtn.textContent = 'Ekle';
        toast(`${formatDateStr(date)} ${time} başka bir öğrenciye ait.`, true); return;
      }
      const snap = await db.collection('reservations').doc(studentUid).get();
      if (!snap.exists) { toast('Rezervasyon bulunamadı.', true); modal.remove(); return; }
      const lessons = snap.data().lessons || [];
      const newLesson = { date, time, status: 'scheduled' };
      // Paketli rezervasyon + "ücretlendir" işaretli: ek ders paket dışı, toplam +LESSON_PRICE
      const chargeEl = modal.querySelector('#addLessonCharge');
      const extraPrice = (!chargeEl || chargeEl.checked)
        ? extraLessonPriceFields(snap.data(), n => firebase.firestore.FieldValue.increment(n)) : {};
      const batch = db.batch();
      batch.set(db.collection('reservations').doc(studentUid), { lessons: [...lessons, newLesson], ...extraPrice }, {merge:true});
      batch.set(db.collection('booked_slots').doc(date + '_' + time), { date, time, student_uid: studentUid });
      await batch.commit();
      modal.remove();
      toast(`✓ Ders eklendi: ${formatDateStr(date)} ${time}${extraPrice.custom_total_price ? ` — paket dışı, toplama +${tlFmt(LESSON_PRICE)}` : ''}`);
      renderAdminPanel();
    } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); saveBtn.disabled = false; saveBtn.textContent = 'Ekle'; }
  };
}

async function adminSendWelcomeEmail(toEmail, toName, btn) {
  if (!toEmail) { toast('Email adresi bulunamadı.', true); return; }
  // btn yoksa (⋯ menüsünden çağrı) yalnız toast'la bildirilir
  const orig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    await firebase.app().functions('europe-west1').httpsCallable('sendWelcomeEmail')({ toEmail, toName });
    toast(`✓ Hoşgeldin maili gönderildi → ${toName}`);
  } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
  if (btn) { btn.disabled = false; btn.textContent = orig; }
}

function adminComposeEmail(studentUid, toEmail, toName, isTrial) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.className = 'modal';
  const defaultSubject = '';
  box.innerHTML = `
    <div class="modal-title">E-posta yaz</div>
    <button id="cmClose" class="modal-close" aria-label="Kapat">✕</button>
    <div class="field-label">Alıcı</div>
    <div class="dlg-sub text-accent">${escHtml(toName)} &lt;${escHtml(toEmail)}&gt;</div>
    <label class="field-label" for="cmSubject">Konu</label>
    <input id="cmSubject" value="${defaultSubject}" class="input dlg-field">
    <label class="field-label" for="cmMessage">Mesaj</label>
    <textarea id="cmMessage" rows="7" placeholder="Mesajınızı buraya yazın…" class="textarea dlg-field"></textarea>
    <div class="modal-actions modal-actions-fill">
      <button id="cmCancel" class="btn btn-ghost">İptal</button>
      <button id="cmSend" class="btn btn-primary">Gönder</button>
    </div>
    <div id="cmStatus" class="dlg-status"></div>`;
  overlay.append(box);
  document.body.append(overlay);
  box.querySelector('#cmClose').onclick = () => overlay.remove();
  box.querySelector('#cmCancel').onclick = () => overlay.remove();
  box.querySelector('#cmSend').onclick = async () => {
    const subject = box.querySelector('#cmSubject').value.trim();
    const message = box.querySelector('#cmMessage').value.trim();
    const sendBtn = box.querySelector('#cmSend');
    const statusEl = box.querySelector('#cmStatus');
    if (!message) { admStatus(statusEl, 'Mesaj boş olamaz.', 'err'); return; }
    sendBtn.disabled = true; sendBtn.textContent = 'Gönderiliyor…';
    try {
      const fn = firebase.app().functions('europe-west1');
      const sendEmail = fn.httpsCallable('sendCustomEmail');
      await sendEmail({ toEmail, toName, subject, message });
      admStatus(statusEl, '✓ Email gönderildi.', 'ok');
      setTimeout(() => overlay.remove(), 1800);
    } catch(e) { const c=errId(); admStatus(statusEl, `Hata (${c}): `+(e.message||e.code), 'err'); sendBtn.disabled=false; sendBtn.textContent='Gönder'; }
  };
}

async function adminAddLessonNote(studentUid, lessonIdx, allLessons, lesson) {
  const existing = lesson.note || '';
  const note = await showInputModal({ title: `${formatDateStr(lesson.date)} ${lesson.time} — Not`, placeholder: 'Ders notu…', defaultVal: existing, multiline: true });
  if (note === null) return;
  try {
    const updated = allLessons.map((l, i) => i === lessonIdx ? { ...l, note: note.trim() || null } : l);
    await db.collection('reservations').doc(studentUid).set({ lessons: updated }, {merge:true});
    toast('✓ Not kaydedildi.');
    renderAdminPanel();
  } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
}

// ─── Erteleme hakları (admin) ─────────────────────────────
// Hak PAKET havuzudur (totalRescheduleCredits): N aylık paket = N hak; öğrencinin erteleme talebi
// onaylanınca 1 hak düşer. reschedule_credits {'YYYY-MM': n} ay anahtarları korunur (havuzun
// iç kaydı) ama öğretmene yalnız "Ay bazında ayrıntı"da insan diliyle gösterilir. Toplamı değiştiren
// her yazım reservations.reschedule_log'a { at, kind: 'used'|'added'|'revoked'|'undo', n, by: 'admin',
// reason?, of?, up? } ekler (undo: of = geri alınan kayıt türü, up = toplam arttı mı); öğrenci paneli (onSnapshot) yeni sayıyı ve "Geçmiş" satırını anında gösterir.
function admCreditLog(res) { return Array.isArray(res && res.reschedule_log) ? res.reschedule_log.filter(x => x && x.kind) : []; }
// Havuza 1 hak ekler: en son ay anahtarına (yoksa bu aya) — toplam aynı mantıkla artar
function admCreditAdd(credits) {
  const keys = Object.keys(credits).sort();
  const k = keys.length ? keys[keys.length - 1] : toDateStr(new Date()).slice(0, 7);
  credits[k] = Math.max(0, credits[k] || 0) + 1;
  return credits;
}
// Transaction: güncel belge okunur, mutate(credits, res) yeni haritayı döndürür; toplam değiştiyse log yazılır.
async function admCreditApply(uid, mutate, entry) {
  const ref = db.collection('reservations').doc(uid);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(bkT('adm_cr_nores', 'Rezervasyon bulunamadı.'));
    const res = snap.data();
    const prev = { ...(res.reschedule_credits || {}) };
    const before = totalRescheduleCredits(res);
    const credits = mutate({ ...prev }, res);
    const after = totalRescheduleCredits({ reschedule_credits: credits });
    const upd = { reschedule_credits: credits };
    const delta = after - before;
    if (delta) {
      const e = { at: new Date().toISOString(), by: 'admin', n: Math.abs(delta), kind: (entry && entry.kind) || (delta > 0 ? 'added' : 'revoked') };
      if (entry && entry.reason) e.reason = String(entry.reason).slice(0, 200);
      if (e.kind === 'undo') { e.up = delta > 0; if (entry.of) e.of = entry.of; }
      upd.reschedule_log = admCreditLog(res).concat([e]).slice(-50);
    }
    tx.update(ref, upd);
    // diff: bu yazımın ay anahtarı başına değişimi — "Geri al" yalnız bunu tersine çevirir
    const diff = {};
    new Set(Object.keys(prev).concat(Object.keys(credits))).forEach(k => {
      const d = Math.max(0, credits[k] || 0) - Math.max(0, prev[k] || 0);
      if (d) diff[k] = d;
    });
    return { before, after, prev, diff };
  });
}
// Toast + "Geri al": YALNIZ bu değişikliği tersine çevirir (delta), arada yapılan diğer değişikliklere
// dokunmaz — iki "+1"den ilkini geri almak toplamı 1 düşürür. Geçmişe kind:'undo' (çevrilir) yazılır.
function admCreditToast(uid, r, msg, of) {
  if (!r || !Object.keys(r.diff || {}).length) { toast(msg); return; }
  admToastUndo(msg, async () => {
    try {
      const u = await admCreditApply(uid, credits => {
        Object.keys(r.diff).forEach(k => { credits[k] = Math.max(0, (credits[k] || 0) - r.diff[k]); });
        return credits;
      }, { kind: 'undo', of });
      toast(bkT('adm_cr_undone', '↺ Geri alındı — kalan {n}').replace('{n}', u.after));
    } catch (e) { const c = errId(); toast(`Hata (${c}): ` + (e.message || e.code), true); }
  });
}
// Satır / pencere dışından da çağrılır: '−1 hakkı kullandır' (key verilirse yalnız o aydan)
async function admCreditUse(uid, res, key) {
  const name = res.student_name || res.student_email || bkT('adm_student', 'Öğrenci');
  const total = totalRescheduleCredits(res);
  if (total <= 0) { toast(bkT('adm_cr_none_left', 'Bu öğrencinin düşülecek hakkı yok.'), 'warn'); return; }
  const a = await admAsk({
    eyebrow: bkT('adm_cr_eyebrow', 'Erteleme hakkı'),
    title: bkT('adm_cr_use_t', '1 hakkı kullandır'),
    body: `<p>${escHtml(bkT('adm_cr_use_b', '{who} 1 erteleme hakkı düşülecek.').replace('{who}', admPoss(name)))}</p>
      <p class="adm-ask-big">${escHtml(bkT('adm_cr_left', 'Kalan'))}: <strong>${total}</strong> → <strong class="${total - 1 > 0 ? 'text-accent' : 'text-err'}">${total - 1}</strong></p>
      <p class="adm-ask-note">${escHtml(bkT('adm_cr_use_n', 'Ders tarihine dokunulmaz — yalnız hak sayısı azalır. Bir dersi gerçekten ertelemek için dersin ··· menüsündeki "1 hafta ertele"yi kullan; o, hakkı kendisi düşer.'))}</p>`,
    input: { label: bkT('adm_cr_reason_l', 'Not (isteğe bağlı · öğrenci de görür)'), placeholder: bkT('adm_cr_use_ph', 'Ör. 12 Eki dersi WhatsApp üzerinden ertelendi') },
    ok: bkT('adm_cr_use_ok', '1 hakkı düş'),
  });
  if (!a) return;
  try {
    const r = await admCreditApply(uid, credits => {
      if (key) { credits[key] = Math.max(0, (credits[key] || 0) - 1); return credits; }
      return consumeRescheduleCredit({ reschedule_credits: credits }, toDateStr(new Date()));
    }, { kind: 'used', reason: a.text });
    admCreditToast(uid, r, bkT('adm_cr_used_toast', '✓ 1 hak düşüldü — kalan {n}').replace('{n}', r.after), 'used');
  } catch (e) { const c = errId(); toast(`Hata (${c}): ` + (e.message || e.code), true); }
}
async function admCreditGive(uid, res) {
  const total = totalRescheduleCredits(res);
  const a = await admAsk({
    eyebrow: bkT('adm_cr_eyebrow', 'Erteleme hakkı'),
    title: bkT('adm_cr_add_t', '+1 erteleme hakkı ver'),
    body: `<p class="adm-ask-big">${escHtml(bkT('adm_cr_left', 'Kalan'))}: <strong>${total}</strong> → <strong class="text-accent">${total + 1}</strong></p>
      <p class="adm-ask-note">${escHtml(bkT('adm_cr_add_n', 'Ek hak ücreti 500 TL. Öğrenci yeni hakkı hemen panelinde görür ve erteleme talebi gönderebilir.'))}</p>`,
    input: { label: bkT('adm_cr_reason_l', 'Not (isteğe bağlı · öğrenci de görür)'), placeholder: bkT('adm_cr_add_ph', 'Ör. Ek hak satın aldı (500 TL)') },
    ok: bkT('adm_cr_add_ok', '+1 hak ver'),
  });
  if (!a) return;
  try {
    const r = await admCreditApply(uid, credits => admCreditAdd(credits), { kind: 'added', reason: a.text });
    admCreditToast(uid, r, bkT('adm_cr_added_toast', '✓ 1 hak eklendi — kalan {n}').replace('{n}', r.after), 'added');
  } catch (e) { const c = errId(); toast(`Hata (${c}): ` + (e.message || e.code), true); }
}
async function admCreditEnd(uid, res) {
  const name = res.student_name || res.student_email || bkT('adm_student', 'Öğrenci');
  const total = totalRescheduleCredits(res);
  if (total <= 0) { toast(bkT('adm_cr_none_left', 'Bu öğrencinin düşülecek hakkı yok.'), 'warn'); return; }
  const a = await admAsk({
    eyebrow: bkT('adm_cr_eyebrow', 'Erteleme hakkı'),
    title: bkT('adm_cr_end_t', 'Tüm hakları bitir'),
    danger: true,
    body: `<p><strong>${escHtml((total === 1 ? bkT('adm_cr_end_b_one', '{who} {n} erteleme hakkı sıfırlanacak.') : bkT('adm_cr_end_b', '{who} {n} erteleme hakkı sıfırlanacak.')).replace('{who}', admPoss(name)).replace('{n}', total))}</strong></p>
      <p class="adm-ask-big">${escHtml(bkT('adm_cr_left', 'Kalan'))}: <strong>${total}</strong> → <strong class="text-err">0</strong></p>
      <ul class="adm-ask-list">
        <li>${escHtml(bkT('adm_cr_end_1', 'Öğrenci artık erteleme talebi gönderemez (panelinde "hak kalmadı" görünür).'))}</li>
        <li>${escHtml(bkT('adm_cr_end_2', 'Dersler, ödeme ve plan değişmez.'))}</li>
        <li>${escHtml(bkT('adm_cr_end_3', 'Gerekirse "+1 hak ver" ile yeniden hak verebilirsin.'))}</li>
      </ul>`,
    input: { label: bkT('adm_cr_reason_l', 'Not (isteğe bağlı · öğrenci de görür)'), placeholder: bkT('adm_cr_end_ph', 'Ör. Paket süresi doldu') },
    ok: (total === 1 ? bkT('adm_cr_end_ok_one', '{n} hakkı sıfırla') : bkT('adm_cr_end_ok', '{n} hakkı sıfırla')).replace('{n}', total),
  });
  if (!a) return;
  try {
    const r = await admCreditApply(uid, credits => { Object.keys(credits).forEach(k => { credits[k] = 0; }); return credits; }, { kind: 'revoked', reason: a.text });
    admCreditToast(uid, r, (r.before === 1 ? bkT('adm_cr_ended_toast_one', '✓ {n} hak sıfırlandı — kalan 0') : bkT('adm_cr_ended_toast', '✓ {n} hak sıfırlandı — kalan 0')).replace('{n}', r.before), 'revoked');
  } catch (e) { const c = errId(); toast(`Hata (${c}): ` + (e.message || e.code), true); }
}
// Geçmiş satırı (admin): "−1 · Kullanıldı — 06 Eki dersi ertelendi"
function admCreditLogLine(x) {
  const n = Math.max(1, x.n || 1);
  const when = admWhen(x.at);
  const plus = x.kind === 'added' || (x.kind === 'undo' && x.up);
  const sign = plus ? `+${n}` : `−${n}`;
  const txt = x.kind === 'used'
    ? (x.lesson_date ? bkT('adm_cr_h_used_l', 'Kullanıldı — {date} dersi ertelendi').replace('{date}', formatDateStr(x.lesson_date)) : bkT('adm_cr_h_used', 'Kullanıldı (elle düşüldü)'))
    : x.kind === 'added' ? bkT('adm_cr_h_added', 'Hak verildi')
    : x.kind === 'undo' ? (x.of === 'added' ? bkT('adm_cr_h_undo_added', 'Geri alındı — verilen hak iptal')
      : x.of === 'used' ? bkT('adm_cr_h_undo_used', 'Geri alındı — düşülen hak iade')
      : x.of === 'revoked' ? bkT('adm_cr_h_undo_revoked', 'Geri alındı — sonlandırılan haklar iade')
      : bkT('adm_cr_h_undo', 'Geri alındı'))
    : bkT('adm_cr_h_revoked', 'Haklar sonlandırıldı');
  return `<li class="adm-cr-li"><span class="adm-cr-sign ${plus ? 'is-plus' : 'is-minus'}">${sign}</span>
    <span class="adm-cr-lt">${escHtml(txt)}${x.reason ? ` <span class="adm-cr-why">“${escHtml(x.reason)}”</span>` : ''}</span>
    <span class="adm-cr-when">${escHtml(when)}</span></li>`;
}

// Pencere: büyük "kalan" sayısı + ne olduğu + üç eylem + geçmiş + (kapalı) ay bazında ayrıntı.
// Canlı (onSnapshot): onay / öğrenci tarafı değişiklikleri de anında yansır.
async function adminGrantRescheduleCredit(studentUid, resDataInit) {
  let resData = resDataInit || {};
  document.getElementById('adminCreditMgr')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'adminCreditMgr';
  overlay.className = 'modal-overlay';
  const card = document.createElement('div');
  card.className = 'modal adm-cr';
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  let unsub = null;
  const done = () => { if (unsub) { unsub(); unsub = null; } close(); };
  overlay.onclick = e => { if (e.target === overlay) done(); };

  function render() {
    const keep = document.activeElement && card.contains(document.activeElement) ? document.activeElement.getAttribute('data-cr') : null;
    const name = resData.student_name || resData.student_email || bkT('adm_student', 'Öğrenci');
    const credits = resData.reschedule_credits || {};
    const total = totalRescheduleCredits(resData);
    const pkgM = resData.duration_months || 0;
    const log = admCreditLog(resData);
    // Geri alınan kayıtlar kendi türünün toplamından düşer ("+1, +1, ilkini geri al" → Verilen: +1)
    const sum = k => Math.max(0, log.filter(x => x.kind === k).reduce((a, x) => a + Math.max(1, x.n || 1), 0)
      - log.filter(x => x.kind === 'undo' && x.of === k).reduce((a, x) => a + Math.max(1, x.n || 1), 0));
    const used = log.length ? sum('used') : dedupLessons(resData.lessons || []).filter(l => l.status === 'rescheduled').length;
    const added = sum('added'), revoked = sum('revoked');
    const pendCount = (_admLastReqSnap ? _admLastReqSnap.docs.map(d => d.data()) : []).filter(r => r.type === 'reschedule_request' && r.from_uid === studentUid).length;
    const facts = [
      pkgM ? (pkgM === 1 ? bkT('adm_cr_f_pkg_one', 'Paket: {m} aylık → {m} hak') : bkT('adm_cr_f_pkg', 'Paket: {m} aylık → {m} hak')).replace(/\{m\}/g, pkgM) : '',
      bkT('adm_cr_f_used', 'Kullanılan: {n}').replace('{n}', used),
      added ? bkT('adm_cr_f_added', 'Verilen: +{n}').replace('{n}', added) : '',
      revoked ? bkT('adm_cr_f_revoked', 'Sonlandırılan: −{n}').replace('{n}', revoked) : '',
    ].filter(Boolean);
    const months = Object.keys(credits).sort();
    const monthRows = months.map(k => {
      const v = Math.max(0, credits[k] || 0);
      return `<div class="adm-cr-mrow"><span>${escHtml(admMonthName(k))}</span><span class="adm-cr-mv">${v} ${escHtml(bkT('adm_cr_unit', 'hak'))}</span>
        <button type="button" class="btn btn-sm btn-subtle" data-cr="usekey" data-key="${escHtml(k)}"${v > 0 ? '' : ' disabled'}>${escHtml(bkT('adm_cr_use_short', '−1 kullandır'))}</button></div>`;
    }).join('');
    card.innerHTML = `
      <div class="field-label text-accent">${escHtml(bkT('adm_cr_eyebrow', 'Erteleme hakkı'))}</div>
      <div class="modal-title">${escHtml(name)}</div>
      <button type="button" class="modal-close" data-cr="close" aria-label="${escHtml(bkT('bk_pt_close', 'Kapat'))}">✕</button>
      <div class="adm-cr-hero">
        <span class="adm-cr-num ${total > 0 ? 'is-on' : 'is-zero'}">${total}</span>
        <span class="adm-cr-lbl">${escHtml(total === 1 ? bkT('adm_cr_left_one', 'erteleme hakkı kaldı') : bkT('adm_cr_left_many', 'erteleme hakkı kaldı'))}${pendCount ? `<span class="adm-chip adm-chip--warn">${escHtml((pendCount === 1 ? bkT('adm_cr_pend_one', '{n} talep onay bekliyor') : bkT('adm_cr_pend', '{n} talep onay bekliyor')).replace('{n}', pendCount))}</span>` : ''}</span>
      </div>
      <p class="adm-cr-facts">${facts.map(escHtml).join(' · ')}</p>
      <p class="adm-cr-what">${escHtml(bkT('adm_cr_what', 'Erteleme hakkı, öğrencinin bir dersini 1 hafta ileri aldırabilmesidir. Paket kaç aylıksa o kadar hak verir (1 ay = 1 hak); hangi derste kullanıldığı önemli değildir. Erteleme talebini onaylayınca 1 hak kendiliğinden düşer. Hak 0 olunca öğrenci erteleme talebi gönderemez.'))}</p>
      <div class="adm-cr-acts">
        <button type="button" class="btn btn-subtle" data-cr="use"${total > 0 ? '' : ' disabled'}>${escHtml(bkT('adm_cr_use_btn', '−1 hakkı kullandır'))}</button>
        <button type="button" class="btn btn-ok" data-cr="add">${escHtml(bkT('adm_cr_add_btn', '+1 hak ver'))}</button>
        <button type="button" class="btn btn-danger adm-cr-end" data-cr="end"${total > 0 ? '' : ' disabled'}>${escHtml(bkT('adm_cr_end_btn', 'Tüm hakları bitir'))}</button>
      </div>
      <div class="adm-cr-hist">
        <div class="field-label">${escHtml(bkT('adm_cr_hist', 'Geçmiş'))}</div>
        ${log.length ? `<ul class="adm-cr-ul">${log.slice(-8).reverse().map(admCreditLogLine).join('')}</ul>` : `<p class="adm-cr-empty">${escHtml(bkT('adm_cr_hist_none', 'Henüz kayıt yok. Bundan sonraki her değişiklik burada tarihiyle görünür.'))}</p>`}
      </div>
      ${months.length ? `<details class="adm-cr-det"><summary>${escHtml(bkT('adm_cr_months', 'Ay bazında ayrıntı'))}</summary>
        <p class="adm-cr-empty">${escHtml(bkT('adm_cr_months_n', 'Haklar tek havuzdur; ay yalnız kaydın tutulduğu yerdir. Normalde bu bölüme gerek yoktur.'))}</p>${monthRows}</details>` : ''}
      <p class="dlg-note">${escHtml(bkT('adm_cr_saved_n', 'Değişiklikler hemen kaydedilir ve öğrencinin panelinde anında görünür.'))}</p>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-cr="done">${escHtml(bkT('bk_pt_close', 'Kapat'))}</button></div>`;
    card.querySelectorAll('[data-cr]').forEach(b => {
      b.onclick = () => {
        const act = b.dataset.cr;
        if (act === 'close' || act === 'done') done();
        else if (act === 'use') admCreditUse(studentUid, resData);
        else if (act === 'usekey') admCreditUse(studentUid, resData, b.dataset.key);
        else if (act === 'add') admCreditGive(studentUid, resData);
        else if (act === 'end') admCreditEnd(studentUid, resData);
      };
    });
    const f = keep && card.querySelector(`[data-cr="${keep}"]:not(:disabled)`);
    if (f) f.focus({ preventScroll: true });
  }
  render();
  const close = bkDialog(overlay, card, { title: '.modal-title', focus: '[data-cr="use"]:not(:disabled), [data-cr="add"]', escape: () => done() });
  unsub = db.collection('reservations').doc(studentUid).onSnapshot(s => {
    if (!overlay.isConnected) { if (unsub) { unsub(); unsub = null; } return; }
    if (s.exists) { const det = card.querySelector('.adm-cr-det'); const wasOpen = det && det.open; resData = s.data(); render(); if (wasOpen) card.querySelector('.adm-cr-det').open = true; }
  }, () => {});
}

// ─── Kampanyalar editörü (settings/campaigns) ─────────────
// Editör yayındaki listeyi (pasifler dahil; belge yoksa PACKAGES) yerel bir taslağa kopyalar;
// "Kampanyaları yayınla" taslağı campaignItemsForSave ile normalize edip belgeye yazar.
// Toplam saat = ay × 4 × haftalık ders saati (editörde haftalık 1–2).
var _admCamp = { list: [], dirty: false };
function admCampSource() {
  return (_campaigns || PACKAGES).map(c => ({ id: c.id, name: c.name, months: c.months, weekly: c.weekly,
    discount: c.discount, active: c.active !== false, best: c.best === true }));
}
function admCampInit() {
  if (!_admCamp.dirty) _admCamp.list = admCampSource();
  admCampRender();
}
function admCampSetDirty(v) {
  _admCamp.dirty = !!v;
  const dot = document.getElementById('admNavCampDirty'); if (dot) dot.hidden = !_admCamp.dirty;
  const rv = document.getElementById('admCampRevert'); if (rv) rv.hidden = !_admCamp.dirty;
  admCampRenderStatus();
}
function admCampRenderStatus() {
  const el = document.getElementById('admCampStatus');
  if (!el) return;
  const m = _campaignsMeta || {};
  let cls = '', txt = '';
  if (m.error) { cls = 'is-err'; txt = bkT('adm_camp_read_err', 'Kampanyalar okunamadı — yayınlama kapalı. Sayfayı yenile.'); }
  else if (_admCamp.dirty) { cls = 'is-dirty'; txt = bkT('adm_camp_dirty', 'Yayınlanmamış değişiklik var — öğrenciler hâlâ yayındaki listeyi görüyor.'); }
  else if (m.exists && m.valid) {
    cls = 'is-ok';
    const when = m.updatedAt ? m.updatedAt.toLocaleString(admLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    txt = bkT('adm_camp_live', 'Yayında') + (when ? ` · ${bkT('adm_camp_updated', 'son güncelleme')} ${when}` : '');
  } else if (m.exists) { cls = 'is-warn'; txt = bkT('adm_camp_invalid', 'Kayıtlı belge geçersiz — öğrenciler varsayılan paketleri görüyor.'); }
  else { cls = 'is-warn'; txt = bkT('adm_camp_default', 'Henüz yayınlanmadı — öğrenciler varsayılan paketleri görüyor.'); }
  el.className = 'adm-camp-status ' + cls;
  el.innerHTML = `<span class="be-dot" aria-hidden="true"></span><span>${escHtml(txt)}</span>`;
  const pub = document.getElementById('admCampPublish');
  if (pub) pub.disabled = !!m.error;
}
function admCampUsage() {
  const use = {};
  admPendingPkgRequests().forEach(r => { use[r.package_id] = (use[r.package_id] || 0) + 1; });
  return use;
}
function admCampRender() {
  const rowsEl = document.getElementById('admCampRows');
  if (!rowsEl) return;
  const ae = document.activeElement;
  const focus = ae && rowsEl.contains(ae) ? { id: ae.closest('[data-id]')?.dataset.id, act: ae.dataset.act } : null;
  const use = admCampUsage();
  const list = _admCamp.list;
  rowsEl.innerHTML = list.map(c => {
    const pp = packagePrice(c);
    const lim = campaignStepLimits(c);
    const nm = escHtml(c.name || '');
    const lblName = escHtml(c.name || c.id);
    const btn = (act, dis, sign, label) => `<button type="button" class="be-step-btn" data-act="${act}" aria-label="${lblName} — ${escHtml(label)}"${dis ? ' disabled' : ''}>${sign}</button>`;
    return `<div class="adm-crow${c.best ? ' is-best' : ''}${c.active ? '' : ' is-off'}" data-id="${escHtml(c.id)}" role="group" aria-label="${lblName}">
      <div class="adm-c-name adm-c-dim">
        <label class="sr-only" for="admCn-${escHtml(c.id)}">${escHtml(bkT('adm_camp_name', 'Kampanya adı'))}</label>
        <input id="admCn-${escHtml(c.id)}" class="adm-cname-in" value="${nm}" maxlength="40" autocomplete="off" spellcheck="false" data-act="name">
        <div class="adm-c-months">
          <span class="adm-k">${escHtml(bkT('adm_month_cap', 'Ay'))}</span>
          <span class="be-stepper be-stepper--sm be-stepper--xs">${btn('mon-', lim.monMin, '−', bkT('adm_camp_mon_dec', 'ayı azalt'))}<span class="be-step-val">${c.months}</span>${btn('mon+', lim.monMax, '+', bkT('adm_camp_mon_inc', 'ayı arttır'))}</span>
          <span class="adm-c-desc">${escHtml(pkgPlanText(c))}</span>
        </div>
        ${use[c.id] ? `<span class="adm-cuse" title="${escHtml(bkT('adm_camp_use_title', 'Bu kampanyayla gelen bekleyen talep'))}">${use[c.id]} ${escHtml(bkT('adm_camp_use', 'bekleyen talep'))}</span>` : ''}
      </div>
      <div class="adm-c-hours adm-c-dim"><span class="adm-c-lbl">${escHtml(bkT('adm_camp_col_hours', 'Toplam saat'))}</span>
        <span class="be-stepper be-stepper--sm">${btn('wk-', lim.wkMin, '−', bkT('adm_camp_hours_dec', 'saati azalt'))}<span class="be-step-val">${pp.hours} ${escHtml(bkT('adm_hours_lc', 'saat'))}</span>${btn('wk+', lim.wkMax, '+', bkT('adm_camp_hours_inc', 'saati arttır'))}</span>
        <span class="adm-c-sub">${escHtml(bkT('adm_camp_weekly', 'Haftada {n} ders saati').replace('{n}', c.weekly))}</span></div>
      <div class="adm-c-disc adm-c-dim"><span class="adm-c-lbl">${escHtml(bkT('adm_camp_col_disc', 'İndirim'))}</span>
        <span class="be-stepper be-stepper--sm">${btn('dc-', lim.dcMin, '−', bkT('adm_camp_disc_dec', 'indirimi azalt'))}<span class="be-step-val">%${c.discount}</span>${btn('dc+', lim.dcMax, '+', bkT('adm_camp_disc_inc', 'indirimi arttır'))}</span></div>
      <div class="adm-c-list adm-c-dim${c.discount ? ' is-strike' : ''}"><span class="adm-c-lbl">${escHtml(bkT('adm_camp_col_list', 'Liste'))}</span><span class="adm-c-v">${tlFmt(pp.list)}</span></div>
      <div class="adm-c-save adm-c-dim"><span class="adm-c-lbl">${escHtml(bkT('adm_camp_col_save', 'Kazanç'))}</span><span class="adm-c-v">${c.discount ? tlFmt(pp.save) : '—'}</span></div>
      <div class="adm-c-pay adm-c-dim"><span class="adm-c-lbl">${escHtml(bkT('adm_camp_col_pay', 'Ödenecek'))}</span><span class="adm-c-payv">${tlFmt(pp.total)}</span><span class="adm-c-per">${tlNum(pp.perHour)} TL/${escHtml(bkT('adm_hour_cap', 'saat'))}</span></div>
      <div class="adm-c-status">
        <button type="button" class="adm-star" data-act="best" aria-pressed="${c.best}" aria-label="${lblName} — ${escHtml(bkT('adm_camp_best', 'en avantajlı'))}" title="${escHtml(bkT('adm_camp_best_title', 'En avantajlı olarak işaretle'))}">★</button>
        <button type="button" class="be-switch" role="switch" data-act="active" aria-checked="${c.active}" aria-label="${lblName} — ${escHtml(bkT('adm_camp_active', 'aktif'))}"></button>
        <button type="button" class="adm-cdel" data-act="del" aria-label="${lblName} — ${escHtml(bkT('adm_camp_del', 'kampanyayı sil'))}">✕</button>
      </div>
      <button type="button" class="adm-cdel-txt" data-act="del" aria-label="${lblName} — ${escHtml(bkT('adm_camp_del', 'kampanyayı sil'))}">${escHtml(bkT('adm_delete', 'Sil'))}</button>
    </div>`;
  }).join('') || `<div class="adm-lempty">${escHtml(bkT('adm_camp_empty', 'Kampanya yok — "+ Yeni kampanya" ile ekle.'))}</div>`;
  admCampRenderSummary();
  admCampRenderStatus();
  const add = document.getElementById('admCampAdd'); if (add) add.disabled = list.length >= CAMP_MAX_ITEMS;
  if (focus && focus.id) {
    const row = rowsEl.querySelector(`[data-id="${CSS.escape(focus.id)}"]`);
    const el = row && (row.querySelector(`[data-act="${focus.act}"]:not(:disabled)`) || row.querySelector('[data-act="name"]'));
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) {} }
  }
}
function admCampRenderSummary() {
  const list = _admCamp.list;
  const sm = campaignSummary(list);
  const st = document.getElementById('admCampStats');
  if (st) st.innerHTML = `<span>${escHtml(bkT('adm_camp_active_n', 'Aktif'))} <b>${sm.active}</b></span><span>${escHtml(bkT('adm_camp_max', 'Maks. avantaj'))} <b class="adm-gold">%${sm.maxDiscount}</b></span><span>${escHtml(bkT('adm_camp_min_hour', 'En ucuz saat'))} <b class="adm-gold">${sm.minPerHour != null ? tlFmt(sm.minPerHour) : '—'}</b></span>`;
  const pv = document.getElementById('admCampPreview');
  if (pv) {
    const act = list.filter(c => c.active);
    pv.innerHTML = act.length ? act.map(c => `<span class="adm-pv${c.best ? ' is-best' : ''}">${escHtml(c.name || c.id)}${c.discount ? ` · %${c.discount}` : ''}</span>`).join('')
      : `<span class="adm-note">${escHtml(bkT('adm_camp_none_active', 'Aktif kampanya yok — öğrenci yalnız tek ders seçebilir.'))}</span>`;
  }
}
async function admCampOnClick(e) {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const row = b.closest('[data-id]');
  const c = row && _admCamp.list.find(x => x.id === row.dataset.id);
  if (!c) return;
  const act = b.dataset.act;
  if (act === 'mon-') c.months = Math.max(1, c.months - 1);
  else if (act === 'mon+') c.months = Math.min(12, c.months + 1);
  else if (act === 'wk-') c.weekly = Math.max(1, c.weekly - 1);
  else if (act === 'wk+') c.weekly = Math.min(CAMP_EDIT_WEEKLY_MAX, c.weekly + 1);
  else if (act === 'dc-') c.discount = Math.max(0, c.discount - 1);
  else if (act === 'dc+') c.discount = Math.min(CAMP_EDIT_DISCOUNT_MAX, c.discount + 1);
  else if (act === 'best') { const on = !c.best; _admCamp.list.forEach(x => { x.best = false; }); c.best = on; }
  else if (act === 'active') {
    const use = admCampUsage()[c.id];
    if (c.active && use && !await admConfirm(bkT('adm_camp_off_b', '{n} bekleyen talep "{c}" kampanyasıyla geldi. Pasif kampanyalı talepler onaylanırsa liste fiyatı uygulanır.').replace('{n}', use).replace('{c}', c.name), { title: bkT('adm_camp_off_t', 'Kampanyayı pasifleştir'), ok: bkT('adm_camp_off_ok', 'Pasifleştir') })) return;
    c.active = !c.active;
  } else if (act === 'del') {
    const use = admCampUsage()[c.id];
    if (use && !await admConfirm(bkT('adm_camp_del_b', '{n} bekleyen talep "{c}" kampanyasıyla geldi. Silinirse bu talepler onaylanınca liste fiyatı uygulanır.').replace('{n}', use).replace('{c}', c.name), { title: bkT('adm_camp_del_t', 'Kampanyayı sil'), ok: bkT('adm_delete', 'Sil'), danger: true })) return;
    const i = _admCamp.list.indexOf(c);
    _admCamp.list.splice(i, 1);
    admCampSetDirty(true);
    admCampRender();
    const next = document.querySelectorAll('#admCampRows .adm-crow')[Math.min(i, _admCamp.list.length - 1)];
    (next ? next.querySelector('.adm-cname-in') : document.getElementById('admCampAdd'))?.focus({ preventScroll: true });
    return;
  }
  admCampSetDirty(true);
  admCampRender();
}
function admCampOnInput(e) {
  const inp = e.target.closest('[data-act="name"]');
  if (!inp) return;
  const row = inp.closest('[data-id]');
  const c = row && _admCamp.list.find(x => x.id === row.dataset.id);
  if (!c) return;
  c.name = inp.value;
  inp.classList.toggle('is-invalid', !inp.value.trim());
  if (!_admCamp.dirty) admCampSetDirty(true);
  admCampRenderSummary();
}
function admCampAdd() {
  if (_admCamp.list.length >= CAMP_MAX_ITEMS) return;
  const id = newCampaignId(_admCamp.list, Date.now());
  _admCamp.list.push({ id, name: bkT('adm_camp_new', 'Yeni kampanya'), months: 1, weekly: 1, discount: 5, active: false, best: false });
  admCampSetDirty(true);
  admCampRender();
  const inp = document.getElementById('admCn-' + id);
  if (inp) { inp.focus(); inp.select(); }
}
async function admCampRevert() {
  if (!await admConfirm(bkT('adm_camp_revert_b', 'Yayınlanmamış kampanya değişiklikleri silinir; yayındaki liste geri gelir.'), { title: bkT('adm_camp_revert', 'Değişiklikleri geri al'), ok: bkT('adm_camp_revert', 'Değişiklikleri geri al'), danger: true })) return;
  _admCamp.list = admCampSource();
  admCampSetDirty(false);
  admCampRender();
}
async function admCampPublish() {
  const btn = document.getElementById('admCampPublish');
  if ((_campaignsMeta || {}).error) return;
  const empty = _admCamp.list.find(c => !String(c.name || '').trim());
  if (empty) {
    toast('Kampanya adı boş olamaz.', true);
    document.getElementById('admCn-' + empty.id)?.focus();
    return;
  }
  const items = campaignItemsForSave(_admCamp.list);
  if (!items.length) { toast('En az bir kampanya olmalı (hepsini gizlemek için pasifleştir).', true); return; }
  if (!items.some(c => c.active) && !await admConfirm(bkT('adm_camp_noact_b', 'Hiç aktif kampanya yok — öğrenciler kampanyalı paket seçemez, yalnız tek ders talep edebilir.'), { title: bkT('adm_camp_publish', 'Kampanyaları yayınla'), ok: bkT('adm_camp_pub_anyway', 'Yine de yayınla') })) return;
  const affected = admPendingPkgRequests().filter(r => { const c = items.find(x => x.id === r.package_id); return !c || !c.active; });
  if (affected.length) {
    const names = [...new Set(affected.map(r => r.package_name || r.package_id))].join(', ');
    if (!await admConfirm(bkT('adm_camp_aff_b', '{n} bekleyen talep kaldırılan ya da pasif bir kampanyayı kullanıyor ({names}). Bu talepler onaylanırsa liste fiyatı uygulanır.').replace('{n}', affected.length).replace('{names}', names), { title: bkT('adm_camp_publish', 'Kampanyaları yayınla'), ok: bkT('adm_camp_pub_anyway', 'Yine de yayınla') })) return;
  }
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = bkT('adm_publishing', 'Yayınlanıyor…');
  try {
    await db.collection('settings').doc('campaigns').set({ items, list_price: LESSON_PRICE, single_price: LESSON_PRICE_SINGLE, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    setCampaigns(campaignsFromDoc({ items }));
    _campaignsReq = Promise.resolve();
    _campaignsMeta = { exists: true, valid: true, updatedAt: new Date(), loaded: true };
    _admCamp.list = admCampSource();
    admCampSetDirty(false);
    admCampRender();
    if (_admLastReqSnap) renderAdminRequests(_admLastReqSnap);
    toast('✓ Kampanyalar yayınlandı.');
  } catch(e) { const c = errId(); toast(`Hata (${c}): ` + (e.message || e.code), true); }
  btn.disabled = false; btn.textContent = orig;
}

// ─── Müsaitlik (settings/global: available_days + blocked_hours) ──
// Tek matris: gün anahtarı + 24 saat hücresi. Değişiklikler yerel taslakta tutulur, "Kaydet"
// ikisini birlikte yazar (update: iç içe haritadan silinen gün de kalıcı olarak silinir).
// "Ders var" = önümüzdeki 90 günde o gün+saatte ders (öğrenci ızgarasındaki "Dolu" ile aynı pencere).
var _admAvail = { days: null, blocked: {}, saved: null, dirty: false, loaded: false };
function admCloneBlocked(b) { const o = {}; Object.keys(b || {}).forEach(k => { if (Array.isArray(b[k])) o[k] = b[k].slice(); }); return o; }
function admCleanBlocked(b) {
  const o = {};
  Object.keys(b || {}).forEach(k => {
    if (!Array.isArray(b[k])) return;
    const v = [...new Set(b[k].filter(t => AVAILABLE_TIMES.includes(t)))].sort();
    if (v.length) o[k] = v;
  });
  return o;
}
async function initAdminAvailDays() {
  const container = document.getElementById('adminAvailDaysList');
  if (!container) return;
  if (!_admAvail.dirty) {
    let days = [1,2,3,4,5,6,0]; // default: all days
    let blocked = {};
    try {
      const snap = await db.collection('settings').doc('global').get();
      if (snap.exists) {
        const d = snap.data();
        if (Array.isArray(d.available_days)) days = d.available_days.slice();
        if (d.blocked_hours && typeof d.blocked_hours === 'object') blocked = admCleanBlocked(d.blocked_hours);
      }
    } catch(e) {}
    if (_admAvail.dirty) return; // yükleme sürerken düzenlendi
    _admAvail = { days, blocked, saved: { days: days.slice(), blocked: admCloneBlocked(blocked) }, dirty: false, loaded: true };
  }
  admRenderAvail();
  renderAdminCalendar(_admCalLessons, _calWeekOffset);

  // Purge stale slots button (arayüzde düğme yok; oturum başı otomatik senkron aynı işi yapar)
  const purgeBtn = document.getElementById('adminPurgeSlotsBtn');
  const purgeStatus = document.getElementById('adminPurgeSlotsStatus');
  if (purgeBtn) purgeBtn.onclick = async () => {
    purgeBtn.disabled = true; purgeBtn.textContent = 'Temizleniyor…'; purgeStatus.textContent = '';
    try {
      // Build valid slot IDs from all active reservations
      const [studSnap2, slotSnap2] = await Promise.all([
        db.collection('reservations').get(),
        db.collection('booked_slots').get()
      ]);
      const validIds = new Set();
      studSnap2.forEach(doc => {
        (doc.data().lessons || []).forEach(l => {
          if (['scheduled','rescheduled','frozen'].includes(l.status) && l.date)
            validIds.add(l.date + '_' + l.time);
        });
      });
      const batch = db.batch();
      let deleted = 0;
      slotSnap2.forEach(d => { if (!validIds.has(d.id)) { batch.delete(d.ref); deleted++; } });
      if (deleted > 0) await batch.commit();
      admStatus(purgeStatus, `✓ ${deleted} stale slot silindi.`, 'ok');
      window._slotsSynced = false;
    } catch(e) { admStatus(purgeStatus, 'Hata: ' + (e.message||e.code), 'err'); }
    purgeBtn.disabled = false; purgeBtn.textContent = 'Hatalı Slotları Temizle';
    setTimeout(() => purgeStatus.textContent = '', 4000);
  };
}
// Eski ad (Kapalı Saatler kartı) — matris artık tek bölümde
function initAdminBlockedHours() { admRenderAvail(); }

var _admMxFocus = null; // { r, c } — matriste son odaklanan hücre (roving tabindex)
var _admMxvTop = null;           // dikey müsaitlik matrisinin son görünür kaydırma konumu (null → 08:00)
function admRenderAvail() {
  const container = document.getElementById('adminAvailDaysList');
  if (!container || !_admAvail.loaded) return;
  const A = _admAvail;
  const hadFocus = container.contains(document.activeElement);
  const dn = getDays(), ds = getDaysShort();
  const isOpen = dow => A.days.includes(dow);
  const isBlocked = (dow, t) => Array.isArray(A.blocked[dow]) && A.blocked[dow].includes(t);
  const cell = (dow, t, r, c, withText) => {
    const open = isOpen(dow), bl = isBlocked(dow, t), les = _admLessonSlots.has(dow + '_' + t);
    const state = !open ? bkT('adm_avail_dayoff_lc', 'gün kapalı') : bl ? bkT('adm_avail_blocked_lc', 'kapalı') : bkT('adm_avail_open_lc', 'açık');
    const label = `${dn[dow]} ${t} · ${state}${les ? ' · ' + bkT('adm_avail_lesson_lc', 'ders var') : ''}`;
    const txt = withText ? (les ? (bl && open ? '×' : '•') : (bl && open ? '×' : '')) : (les && bl && open ? '×' : '');
    return `<button type="button" class="adm-cell${les ? ' has-l' : ''}" data-act="cell" data-dow="${dow}" data-t="${t}" data-r="${r}" data-c="${c}" aria-pressed="${open && bl}" aria-label="${escHtml(label)}" title="${escHtml(label)}" tabindex="-1"${open ? '' : ' disabled'}>${txt}</button>`;
  };
  let html = '';
  if (!_admNarrowMq.matches) {
    // yatay: gün satırı × 24 saat
    html = `<div class="adm-mx" role="group" aria-label="${escHtml(bkT('adm_avail_matrix', 'Haftalık müsaitlik'))}">
      <div class="adm-mx-row adm-mx-head" aria-hidden="true"><span>${escHtml(bkT('adm_avail_day', 'Gün'))}</span>${AVAILABLE_TIMES.map((t, h) => `<span class="${h % 6 === 0 ? 'is-6' : ''}">${t.slice(0, 2)}</span>`).join('')}<span></span></div>
      ${GRID_DAYS.map((dow, r) => `<div class="adm-mx-row">
        <button type="button" class="adm-mx-day" role="switch" aria-checked="${isOpen(dow)}" data-act="day" data-dow="${dow}"><span class="adm-mx-dn">${escHtml(dn[dow])}</span><span class="adm-msw" aria-hidden="true"></span></button>
        ${AVAILABLE_TIMES.map((t, c) => cell(dow, t, r, c, false)).join('')}
        <div class="adm-mx-tools">
          <button type="button" class="adm-mx-tool" data-act="night" data-dow="${dow}" title="${escHtml(bkT('adm_avail_night_title', '00–07 arasını kapat'))}" aria-label="${escHtml(dn[dow])} — ${escHtml(bkT('adm_avail_night_title', '00–07 arasını kapat'))}"${isOpen(dow) ? '' : ' disabled'}>${escHtml(bkT('adm_avail_night', 'Gece'))}</button>
          <button type="button" class="adm-mx-tool" data-act="clear" data-dow="${dow}" title="${escHtml(bkT('adm_avail_clear_title', 'Günün tüm saatlerini aç'))}" aria-label="${escHtml(dn[dow])} — ${escHtml(bkT('adm_avail_clear_title', 'Günün tüm saatlerini aç'))}"${isOpen(dow) ? '' : ' disabled'}>${escHtml(bkT('adm_avail_clear', 'Aç'))}</button>
        </div>
      </div>`).join('')}
    </div>`;
  } else {
    // dikey: saat satırı × gün sütunu (dar ekran)
    html = `<div class="adm-mxv">
      <div class="adm-mxv-head"><span></span>${GRID_DAYS.map(dow => `<button type="button" class="adm-mxv-day" role="switch" aria-checked="${isOpen(dow)}" data-act="day" data-dow="${dow}" aria-label="${escHtml(dn[dow])}">${escHtml(ds[dow])}</button>`).join('')}</div>
      <div class="adm-mxv-scroll" id="admMxvScroll"><div class="adm-mxv-grid" role="group" aria-label="${escHtml(bkT('adm_avail_matrix', 'Haftalık müsaitlik'))}">
        ${AVAILABLE_TIMES.map((t, r) => `<span class="adm-mxv-h${r % 6 === 0 ? ' is-6' : ''}" aria-hidden="true">${t.slice(0, 2)}</span>${GRID_DAYS.map((dow, c) => cell(dow, t, r, c, true)).join('')}`).join('')}
      </div></div>
    </div>`;
  }
  container.innerHTML = html;
  const sc = container.querySelector('#admMxvScroll');
  if (sc) {
    // Son görünür kaydırma konumu korunur; hiç görünmediyse 08:00. Sekme gizliyken
    // yapılan atama yok sayılır — admSetTab görünür olunca yeniden çizer ve burası uygular.
    sc.scrollTop = _admMxvTop != null ? _admMxvTop : 8 * 39;
    sc.addEventListener('scroll', () => { if (sc.clientHeight > 0) _admMxvTop = sc.scrollTop; }, { passive: true });
  }
  // roving tabindex: tek sekme durağı
  const cells = [...container.querySelectorAll('.adm-cell:not(:disabled)')];
  let target = _admMxFocus ? container.querySelector(`.adm-cell[data-r="${_admMxFocus.r}"][data-c="${_admMxFocus.c}"]:not(:disabled)`) : null;
  if (!target) target = cells[0];
  if (target) target.tabIndex = 0;
  if (hadFocus && _admMxFocus) {
    const f = _admMxFocus.act ? container.querySelector(`[data-act="${_admMxFocus.act}"][data-dow="${_admMxFocus.dow}"]`) : target;
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
  // sayaç + durum
  const cnt = GRID_DAYS.reduce((a, dow) => a + (isOpen(dow) ? (A.blocked[dow] || []).length : 24), 0);
  // "Kapalı saat: 24 (kapalı gün: Pazar)" — eski "24 saat kapalı" her şey kapalı gibi okunuyordu
  const offDays = GRID_DAYS.filter(dow => !isOpen(dow)).map(dow => getDays()[dow]);
  admSet('admAvailCount', `${bkT('adm_avail_count2', 'Kapalı saat')}: ${cnt}${offDays.length ? ` (${bkT('adm_avail_offdays', 'kapalı gün')}: ${offDays.join(', ')})` : ''}`);
  const save = document.getElementById('admAvailSave');
  if (save) save.disabled = !A.dirty;
  const dot = document.getElementById('admNavAvailDirty'); if (dot) dot.hidden = !A.dirty;
  const st = document.getElementById('adminAvailStatus');
  if (st && A.dirty) admStatus(st, bkT('adm_avail_dirty', 'Kaydedilmemiş değişiklik var.'));
}
function admAvailMark() {
  _admAvail.dirty = true;
  admRenderAvail();
}
function admAvailOnClick(e) {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const A = _admAvail;
  const dow = Number(b.dataset.dow);
  const act = b.dataset.act;
  if (act === 'cell') {
    _admMxFocus = { r: b.dataset.r, c: b.dataset.c };
    if (!A.days.includes(dow)) return;
    const t = b.dataset.t;
    const cur = new Set(A.blocked[dow] || []);
    if (cur.has(t)) cur.delete(t); else cur.add(t);
    if (cur.size) A.blocked[dow] = [...cur].sort(); else delete A.blocked[dow];
  } else if (act === 'day') {
    _admMxFocus = { act: 'day', dow };
    A.days = A.days.includes(dow) ? A.days.filter(d => d !== dow) : [...A.days, dow];
  } else if (act === 'night') {
    _admMxFocus = { act: 'night', dow };
    admAvailNights(dow); return;
  } else if (act === 'clear') {
    _admMxFocus = { act: 'clear', dow };
    delete A.blocked[dow];
  }
  admAvailMark();
}
// 00:00–07:00 kapat: tek gün (dow) ya da tüm açık günler (null)
function admAvailNights(dow) {
  const A = _admAvail;
  if (!A.loaded) return;
  const night = AVAILABLE_TIMES.slice(0, 8);
  (dow == null ? GRID_DAYS.filter(d => A.days.includes(d)) : [dow]).forEach(d => {
    A.blocked[d] = [...new Set([...(A.blocked[d] || []), ...night])].sort();
  });
  admAvailMark();
}
function admAvailOnKey(e) {
  const b = e.target.closest('.adm-cell');
  if (!b) return;
  const map = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
  const container = document.getElementById('adminAvailDaysList');
  let r = Number(b.dataset.r), c = Number(b.dataset.c);
  const maxR = _admNarrowMq.matches ? 23 : 6, maxC = _admNarrowMq.matches ? 6 : 23;
  if (map[e.key]) { r += map[e.key][0]; c += map[e.key][1]; }
  else if (e.key === 'Home') c = 0;
  else if (e.key === 'End') c = maxC;
  else return;
  e.preventDefault();
  r = Math.max(0, Math.min(maxR, r)); c = Math.max(0, Math.min(maxC, c));
  const next = container.querySelector(`.adm-cell[data-r="${r}"][data-c="${c}"]`);
  if (!next || next.disabled) return;
  container.querySelectorAll('.adm-cell[tabindex="0"]').forEach(x => { x.tabIndex = -1; });
  next.tabIndex = 0;
  _admMxFocus = { r, c };
  next.focus();
}
async function admAvailSave() {
  const A = _admAvail;
  const btn = document.getElementById('admAvailSave');
  const st = document.getElementById('adminAvailStatus');
  if (!A.loaded || !A.dirty) return;
  const days = GRID_DAYS.filter(d => A.days.includes(d));
  const blocked = admCleanBlocked(A.blocked);
  btn.disabled = true;
  admStatus(st, bkT('adm_saving', 'Kaydediliyor…'));
  try {
    // update() alanları bütünüyle değiştirir (set merge iç içe haritada silinen günü bırakırdı);
    // belge hiç yoksa (ilk kurulum) set(merge) ile oluşturulur.
    const ref = db.collection('settings').doc('global');
    try { await ref.update({ available_days: days, blocked_hours: blocked }); }
    catch (e) {
      if (e && e.code === 'not-found') await ref.set({ available_days: days, blocked_hours: blocked }, { merge: true });
      else throw e;
    }
    _admAvail = { days: days.slice(), blocked: admCloneBlocked(blocked), saved: { days: days.slice(), blocked: admCloneBlocked(blocked) }, dirty: false, loaded: true };
    admRenderAvail();
    renderAdminCalendar(_admCalLessons, _calWeekOffset);
    admStatus(st, '✓ ' + bkT('adm_saved', 'Kaydedildi'), 'ok');
    setTimeout(() => { if (!_admAvail.dirty) admStatus(st, ''); }, 2500);
  } catch(e) { btn.disabled = false; admStatus(st, 'Kayıt hatası: ' + (e.message||e.code), 'err'); }
}

// ─── WhatsApp Chat (admin inbox) ──────────────────────────
var _waListUnsub = null;
var _waMsgUnsub = null;
var _waActivePhone = null;

function initAdminWhatsAppTest() {
  if (!document.getElementById('waChatList')) return;
  if (_waListUnsub) { _waListUnsub(); _waListUnsub = null; }

  const listEl = document.getElementById('waChatList');
  const emptyEl = document.getElementById('waChatListEmpty');
  const unreadTotalEl = document.getElementById('waUnreadTotal');

  _waListUnsub = db.collection('whatsapp_conversations')
    .orderBy('last_message_at', 'desc').limit(100)
    .onSnapshot(snap => {
      const hadFocus = listEl.contains(document.activeElement) ? document.activeElement.dataset.phone : null;
      listEl.innerHTML = '';
      let totalUnread = 0;
      if (!snap || snap.empty) {
        listEl.appendChild(emptyEl);
        unreadTotalEl.textContent = '';
        _admWaUnread = 0; admUpdateCounts();
        return;
      }
      snap.docs.forEach(doc => {
        const c = doc.data();
        totalUnread += (c.unread_count || 0);
        const row = document.createElement('button');
        row.type = 'button';
        row.dataset.phone = doc.id;
        const isActive = doc.id === _waActivePhone;
        row.className = 'wa-thread' + (isActive ? ' is-active' : '');
        if (isActive) row.setAttribute('aria-current', 'true');
        const nameLine = document.createElement('div');
        nameLine.className = 'wa-thread-head';
        const name = document.createElement('span');
        name.className = 'wa-thread-name' + (c.unread_count > 0 ? ' is-unread' : '');
        name.textContent = c.student_name || c.phone || doc.id;
        nameLine.appendChild(name);
        if (c.unread_count > 0) {
          const badge = document.createElement('span');
          badge.className = 'wa-count';
          badge.textContent = c.unread_count;
          nameLine.appendChild(badge);
        }
        const preview = document.createElement('div');
        preview.className = 'wa-thread-preview';
        const dir = document.createElement('span');
        dir.className = c.last_direction === 'out' ? 'is-out' : 'is-in';
        dir.textContent = c.last_direction === 'out' ? '↗ ' : '↘ ';
        dir.setAttribute('aria-label', c.last_direction === 'out' ? 'giden: ' : 'gelen: ');
        preview.append(dir, document.createTextNode(c.last_message || ''));
        row.appendChild(nameLine);
        row.appendChild(preview);
        row.onclick = () => openWhatsAppConvo(doc.id, c.student_name || c.phone);
        listEl.appendChild(row);
      });
      unreadTotalEl.textContent = totalUnread > 0 ? `${totalUnread} okunmamış` : '';
      _admWaUnread = totalUnread; admUpdateCounts();
      if (hadFocus) listEl.querySelector(`[data-phone="${CSS.escape(hadFocus)}"]`)?.focus({ preventScroll: true });
    }, e => {
      const c = errId();
      listEl.innerHTML = `<div class="adm-empty is-err">Hata (${c}): ${escHtml(e.message||e.code)}</div>`;
    });
}

// Admin: edit a student's WhatsApp number. After save, an inline modal
// pops up with a pre-filled welcome message and a Send button. Send →
// modal closes automatically.
window.adminEditStudentPhone = async function(studentUid, currentPhone, studentName) {
  if (!studentUid) return;
  const _ans = await admAsk({
    eyebrow: 'WhatsApp',
    title: studentName || bkT('adm_student', 'Öğrenci'),
    body: `<p class="adm-ask-note">${escHtml(bkT('adm_phone_help', 'Kabul edilen: 5XX XXX XX XX · 05XX XXX XX XX · +90 5XX XXX XX XX · yurt dışı +1 617 388 4403 gibi. Boş bırakırsan numara silinir.'))}</p>`,
    input: { label: bkT('adm_phone_label', 'WhatsApp numarası'), placeholder: '5XX XXX XX XX', value: currentPhone || '' },
    ok: bkT('adm_save', 'Kaydet'),
  });
  if (!_ans) return; // cancelled
  const fresh = _ans.text;
  let cleaned = '';
  if ((fresh || '').trim()) {
    const _parsed = parsePhoneInput(fresh);
    if (!_parsed.ok) {
      if (typeof toast === 'function') toast(bkT('bks_phone_invalid', 'Geçersiz numara.') + ' ' + phoneHelpText(), true);
      else alert(bkT('bks_phone_invalid', 'Geçersiz numara.') + ' ' + phoneHelpText());
      return;
    }
    cleaned = _parsed.bare;
  }
  try {
    const update = cleaned
      ? { student_phone: cleaned }
      : { student_phone: firebase.firestore.FieldValue.delete() };
    await db.collection('reservations').doc(studentUid).set(update, { merge: true });
    if (typeof toast === 'function') {
      toast(cleaned ? `Numara güncellendi: ${cleaned}` : 'Numara silindi.');
    }
    if (typeof renderAdminPanel === 'function') renderAdminPanel();
    // After save: open inline WhatsApp send modal for the new number.
    if (cleaned) {
      window.openAdminWaSendModal(cleaned, studentName || '');
    }
  } catch (e) {
    const c = typeof errId === 'function' ? errId() : '';
    const msg = e.message || e.code || 'kaydedilemedi';
    if (typeof toast === 'function') toast(`Hata (${c}): ${msg}`, true);
    else alert(`Hata (${c}): ${msg}`);
  }
};

// Inline modal: lets admin send a one-off WhatsApp message to a freshly
// edited phone. Closes itself on successful send. Uses the existing
// sendWhatsAppAdmin callable, which means the same 24h freeform window
// rule applies — outside the window Twilio rejects and the error shows
// inline.
window.openAdminWaSendModal = function(phone, displayName) {
  // Tear down any previous instance.
  const prev = document.getElementById('adminWaSendModal');
  if (prev) prev.remove();

  const overlay = document.createElement('div');
  overlay.id = 'adminWaSendModal';
  overlay.className = 'modal-overlay';

  const card = document.createElement('div');
  card.className = 'modal';

  const safeName = (displayName || 'arkadaş').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  // `phone` may be a bare TR digit string (no +, e.g. "905551234567") or an international
  // number that already carries a "+" (e.g. "+16173884403") — normalize to exactly one "+".
  const safePhone = '+' + phone.replace(/[<>&"]/g, '').replace(/^\+/, '');
  const defaultBody = `Selam ${displayName || ''}! 👋\n\nBerkay Er Academy iletişim hattı bu numaraya bağlandı. Buradan ders hatırlatmaları ve hocadan mesajlar gelecek.\n\nSorun olursa direkt buraya yazabilirsin. 🎵`;

  card.innerHTML = `
    <div class="field-label text-ok">WhatsApp mesajı gönder</div>
    <div class="modal-title">${safeName}</div>
    <button id="adminWaSendClose" class="modal-close" aria-label="Kapat">✕</button>
    <div class="dlg-sub mono-sm">${safePhone}</div>
    <textarea id="adminWaSendBody" rows="6" class="textarea"></textarea>
    <div id="adminWaSendStatus" class="dlg-status dlg-status-left"></div>
    <div class="modal-actions">
      <button id="adminWaSendCancel" class="btn btn-ghost">İptal</button>
      <button id="adminWaSendGo" class="btn btn-primary">Gönder</button>
    </div>
    <div class="dlg-note">Twilio 24 saat kuralı: öğrenci son 24 saatte sana yazmadıysa serbest metin reddedilir — onaylı bir template SID'i gerek. Reddedilirse yukarıdaki durum satırında görürsün.</div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const bodyEl   = card.querySelector('#adminWaSendBody');
  const statusEl = card.querySelector('#adminWaSendStatus');
  const sendBtn  = card.querySelector('#adminWaSendGo');
  const cancel   = card.querySelector('#adminWaSendCancel');
  const closeBtn = card.querySelector('#adminWaSendClose');

  bodyEl.value = defaultBody;
  setTimeout(() => { bodyEl.focus(); bodyEl.setSelectionRange(bodyEl.value.length, bodyEl.value.length); }, 30);

  const close = () => overlay.remove();
  cancel.onclick = close;
  closeBtn.onclick = close;
  overlay.onclick = e => { if (e.target === overlay) close(); };

  sendBtn.onclick = async () => {
    const body = (bodyEl.value || '').trim();
    if (!body) { admStatus(statusEl, 'Mesaj boş olamaz.', 'err'); return; }
    sendBtn.disabled = true;
    cancel.disabled = true;
    admStatus(statusEl, 'Gönderiliyor…');
    try {
      const fn = firebase.app().functions('europe-west1').httpsCallable('sendWhatsAppAdmin');
      await fn({ toPhone: phone, body });
      admStatus(statusEl, '✓ Gönderildi. Pencere kapanıyor…', 'ok');
      if (typeof toast === 'function') toast('✓ WhatsApp mesajı gönderildi.');
      setTimeout(close, 900);
    } catch (e) {
      const c = typeof errId === 'function' ? errId() : '';
      admStatus(statusEl, `Hata (${c}): ${e.message || e.code || 'gönderilemedi'} — 24h kuralı: öğrenci son 24 saatte sana yazmış olması gerek.`, 'err');
      sendBtn.disabled = false;
      cancel.disabled = false;
    }
  };
};

function openWhatsAppConvo(phone, displayName) {
  _waActivePhone = phone;
  const _dn = String(displayName || '').replace(/^\+/, '');
  document.getElementById('waChatHeader').textContent = (_dn && _dn !== String(phone).replace(/^\+/, '')) ? displayName + ' · ' + phone : '+' + String(phone).replace(/^\+/, '');
  document.getElementById('waChatInputRow').hidden = false;
  document.getElementById('waChatStatus').textContent = '';
  const _waCard = document.getElementById('adminWhatsAppCard');
  if (_waCard) {
    _waCard.classList.add('is-thread');
    // ≤1024: liste yerine sohbet açılır; kart yapışkan sekmelerin altına hizalanır
    if (!_admDesktopMq.matches) {
      const tabs = document.querySelector('.adm-tabs');
      const off = (tabs ? tabs.offsetHeight : 0) + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--be-sticky-top')) || 0);
      window.scrollTo({ top: Math.max(0, _waCard.getBoundingClientRect().top + window.scrollY - off), behavior: 'instant' });
      document.getElementById('admWaBack')?.focus({ preventScroll: true });
    }
  }
  // Mark as read
  firebase.app().functions('europe-west1').httpsCallable('markWhatsAppConvoRead')({ phone }).catch(() => {});
  // Re-trigger list render so highlight updates
  initAdminWhatsAppTest();

  const msgEl = document.getElementById('waChatMessages');
  msgEl.innerHTML = admLoadingHtml();
  if (_waMsgUnsub) { _waMsgUnsub(); _waMsgUnsub = null; }
  _waMsgUnsub = db.collection('whatsapp_conversations').doc(phone)
    .collection('messages').orderBy('created_at', 'asc').limit(200)
    .onSnapshot(snap => {
      msgEl.innerHTML = '';
      if (!snap || snap.empty) {
        msgEl.innerHTML = `<div class="adm-empty">${escHtml(bkT('adm_wa_no_msg', 'Mesaj yok.'))}</div>`;
        return;
      }
      snap.docs.forEach(d => {
        const m = d.data();
        const isOut = m.direction === 'out';
        const wrap = document.createElement('div');
        wrap.className = 'wa-msg ' + (isOut ? 'out' : 'in');
        // http(s) bağlantıları tıklanabilir; metin her zaman textContent ile (HTML yorumlanmaz)
        String(m.body || '').split(/(https?:\/\/[^\s<>"']+)/g).forEach((part, pi) => {
          if (pi % 2 === 1) {
            const a = document.createElement('a');
            a.href = part; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'wa-link';
            a.textContent = part;
            wrap.append(a);
          } else if (part) wrap.append(document.createTextNode(part));
        });
        const meta = document.createElement('div');
        meta.className = 'wa-msg-meta';
        const ts = m.created_at && m.created_at.toDate ? m.created_at.toDate() : null;
        meta.textContent = ts ? ts.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : '';
        wrap.appendChild(meta);
        msgEl.appendChild(wrap);
      });
      msgEl.scrollTop = msgEl.scrollHeight;
    }, e => {
      const c = errId();
      msgEl.innerHTML = `<div class="adm-empty is-err">Hata (${c}): ${escHtml(e.message||e.code)}</div>`;
    });

  const input = document.getElementById('waChatInput');
  const sendBtn = document.getElementById('waChatSend');
  const statusEl = document.getElementById('waChatStatus');
  sendBtn.onclick = async () => {
    const body = (input.value || '').trim();
    if (!body) return;
    sendBtn.disabled = true;
    admStatus(statusEl, 'Gönderiliyor…');
    try {
      const fn = firebase.app().functions('europe-west1').httpsCallable('sendWhatsAppAdmin');
      await fn({ toPhone: phone, body });
      input.value = '';
      admStatus(statusEl, '✓ Gönderildi', 'ok');
      setTimeout(() => { statusEl.textContent = ''; }, 1500);
    } catch(e) {
      const c = errId();
      admStatus(statusEl, `Hata (${c}): ${e.message || e.code || 'gönderilemedi'} — 24h kuralı: öğrencinin son 24 saatte sana yazmış olması gerek.`, 'err');
    }
    sendBtn.disabled = false;
  };
  // Enter ile gönderme yalnız fare/klavyeli cihazda; telefonda Enter yeni satır, gönderim düğmeyle
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(pointer:fine)').matches) { e.preventDefault(); sendBtn.click(); }
  };
}

// ─── Zoom Link ────────────────────────────────────────────
async function initAdminZoomLink() {
  const input = document.getElementById('adminZoomInput');
  const saveBtn = document.getElementById('adminZoomSave');
  const status = document.getElementById('adminZoomStatus');
  if (!input) return;
  // Load existing
  const joinDiv = document.getElementById('adminZoomJoinLink');
  function renderAdminZoomJoin(link) {
    const chip = document.getElementById('admZoomChip');
    if (chip) chip.hidden = !link;
    if (!joinDiv) return;
    joinDiv.innerHTML = '';
    if (link) {
      const a = document.createElement('a');
      a.href = link; a.target = '_blank'; a.rel = 'noopener';
      a.className = 'btn btn-link adm-zoom-join';
      a.innerHTML = `${escHtml(bkT('adm_zoom_join', 'Toplantıya katıl'))} <span aria-hidden="true">→</span>`;
      joinDiv.append(a);
    }
  }
  // Zoom linki settings/zoom'da (yalnız admin + ödemesi onaylı / deneme öğrencisi okur).
  // Geçiş: eski konum settings/global.zoom_link (giriş yapan herkes okuyabiliyordu) varsa
  // settings/zoom'a taşınır ve global'den silinir.
  try {
    const zoomRef = db.collection('settings').doc('zoom');
    const globalRef = db.collection('settings').doc('global');
    const [zs, gs] = await Promise.all([zoomRef.get(), globalRef.get()]);
    let link = zs.exists ? (zs.data().zoom_link || null) : null;
    const legacy = gs.exists ? (gs.data().zoom_link || null) : null;
    if (legacy) {
      const b = db.batch();
      if (!link) { link = legacy; b.set(zoomRef, { zoom_link: legacy, updated_at: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); }
      b.set(globalRef, { zoom_link: firebase.firestore.FieldValue.delete() }, { merge: true });
      await b.commit().catch(e => console.warn('[zoom] taşıma', e && e.code));
    }
    if (link) {
      input.value = link;
      renderAdminZoomJoin(link);
    }
  } catch(e) {}
  saveBtn.onclick = async () => {
    const link = input.value.trim();
    const _saveLbl = saveBtn.textContent;
    if (!link) { admStatus(status, 'Link boş olamaz.', 'err'); input.classList.add('is-invalid'); input.focus(); return; }
    if (!link.match(/^https:\/\/([\w-]+\.)?zoom\.us\//)) { admStatus(status, 'Geçersiz link. https://zoom.us/... ile başlamalı.', 'err'); input.classList.add('is-invalid'); input.focus(); return; }
    input.classList.remove('is-invalid');
    saveBtn.disabled = true; saveBtn.textContent = '…';
    try {
      const b = db.batch();
      b.set(db.collection('settings').doc('zoom'), { zoom_link: link, updated_at: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      b.set(db.collection('settings').doc('global'), { zoom_link: firebase.firestore.FieldValue.delete() }, { merge: true });
      await b.commit();
      admStatus(status, '✓ Kaydedildi', 'ok');
      renderAdminZoomJoin(link);
      setTimeout(() => status.textContent = '', 2500);
    } catch(e) { const c=errId(); admStatus(status, `Hata (${c})`, 'err'); }
    saveBtn.disabled = false; saveBtn.textContent = _saveLbl;
  };

  const createBtn = document.getElementById('adminZoomCreate');
  if (createBtn) {
    createBtn.onclick = async () => {
      // Mevcut link tüm öğrencilerin "Derse Katıl" bağlantısıdır — değiştirmeden önce sor
      const cur = input.value.trim() || (document.getElementById('admZoomChip') && !document.getElementById('admZoomChip').hidden ? '1' : '');
      if (cur && !await admConfirm(bkT('adm_zoom_new_b', 'Yeni toplantı oluşturulursa öğrencilerin gördüğü "Derse Katıl" linki değişir; eski link artık panelde görünmez.'), { title: bkT('adm_zoom_new_t', 'Yeni Zoom toplantısı oluşturulsun mu?'), ok: bkT('adm_zoom_new_ok', 'Oluştur ve linki değiştir') })) return;
      const _createLbl = createBtn.textContent;
      createBtn.disabled = true; createBtn.textContent = bkT('adm_zoom_creating', 'Oluşturuluyor…');
      admStatus(status, '');
      try {
        const createZoomMeeting = firebase.app().functions('europe-west1').httpsCallable('createZoomMeeting');
        const result = await createZoomMeeting({ topic: 'Ableton Özel Ders', duration: 60 });
        const link = result.data.join_url;
        input.value = link;
        renderAdminZoomJoin(link);
        admStatus(status, '✓ Toplantı oluşturuldu', 'ok');
        setTimeout(() => status.textContent = '', 3000);
      } catch(e) {
        // Callable hataları (internal / unavailable / permission) teknik kod yerine düz Türkçe
        const c = errId();
        const code = String(e.code || '').replace('functions/', '');
        const msg = code === 'permission-denied' || code === 'unauthenticated'
          ? bkT('adm_zoom_err_auth', 'Bu işlem için yetkin yok — çıkış yapıp yeniden gir.')
          : bkT('adm_zoom_err', 'Zoom\'a bağlanılamadı — birazdan tekrar dene. Olmazsa linki Zoom\'dan kopyalayıp "Linki kaydet" ile ekle.');
        admStatus(status, `${msg} (${c})`, 'err');
        console.warn('[zoom]', c, e.code, e.message);
      }
      createBtn.disabled = false; createBtn.textContent = _createLbl;
    };
  }
}

async function adminCompleteLesson(studentUid, lessonIdx, allLessons, lesson) {
  // Henüz bitmemiş ders için açık uyarı (yanlışlıkla gelecek dersi kapatmasın)
  const notYet = bkTrStart(lesson.date, lesson.time).getTime() + BK_LESSON_MS > bkNow();
  const ok = await bkConfirm({
    title: bkT('adm_done_t', 'Tamamlandı olarak işaretle'),
    body: `<p class="adm-ask-big"><strong>${escHtml(formatDateStr(lesson.date))} ${escHtml(lesson.time)}–${escHtml(getEndTime(lesson.time))}</strong></p>
      ${notYet ? `<p class="adm-ask-warn">${escHtml(bkT('adm_future_warn', 'Bu ders henüz yapılmadı (bitiş saati gelmedi).'))}</p>` : ''}
      <p class="adm-ask-note">${escHtml(bkT('adm_complete_n', 'Dersler "Geçmiş dersler"e taşınır ve takvimdeki saatleri boşalır.'))}</p>`,
    ok: notYet ? bkT('adm_done_ok_future', 'Yine de tamamlandı say') : bkT('adm_done_ok', 'Tamamlandı'),
    danger: notYet,
  });
  if (!ok) return;
  try {
    const updated = allLessons.map((l, i) => i === lessonIdx ? { ...l, status: 'completed' } : l);
    const batch = db.batch();
    batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
    batch.delete(db.collection('booked_slots').doc(lesson.date + '_' + lesson.time));
    await batch.commit();
    toast('✓ Ders tamamlandı olarak işaretlendi.');
    renderAdminPanel();
  } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
}

async function adminCancelSingleLesson(studentUid, lessonIdx, allLessons, lesson) {
  const ok = await bkConfirm({
    title: bkT('adm_cx_t', 'Dersi iptal et'), danger: true,
    body: `<p class="adm-ask-big"><strong>${escHtml(formatDateStr(lesson.date))} ${escHtml(lesson.time)}–${escHtml(getEndTime(lesson.time))}</strong></p>
      <p class="adm-ask-note">${escHtml(bkT('adm_cancel_n', 'Ders "İptal" olarak geçmişe düşer, saat boşalır; ücret ve erteleme hakkı değişmez. Öğrenciye otomatik mesaj gitmez.'))}</p>`,
    ok: bkT('adm_cx_ok', 'Dersi iptal et'),
  });
  if (!ok) return;
  const updated = allLessons.map((l, i) => i === lessonIdx ? { ...l, status: 'cancelled' } : l);
  try {
    const batch = db.batch();
    batch.set(db.collection('reservations').doc(studentUid), { lessons: updated }, {merge:true});
    batch.delete(db.collection('booked_slots').doc(lesson.date + '_' + lesson.time));
    await batch.commit();
    toast(`✓ Ders iptal edildi.`);
    window._slotsSynced = false;
    renderAdminPanel();
  } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); }
}

// Tek dersin +7 gün planı (onay penceresi, talep satırı önizlemesi ve yazım aynı hesabı kullanır):
// hedef ders 'rescheduled' olur, yeni yerine denk gelen dersler de zincirleme 1 hafta kayar.
function admPlanReschedule(lessons, idx) {
  const updated = lessons.map(l => ({ ...l }));
  const moves = [];
  const l0 = updated[idx];
  const newD = addWeekStr(l0.date);
  updated[idx] = { ...l0, date: newD, status: 'rescheduled', from_date: l0.from_date || l0.date };
  moves.push({ idx, oldDate: l0.date, newDate: newD, time: l0.time });
  cascadeRescheduleConflicts(updated, moves);
  updated.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return { updated, moves };
}
function admMovesHtml(moves) {
  return `<ul class="adm-ask-list adm-ask-moves">${moves.map((m, i) => `<li>${escHtml(formatDateStr(m.oldDate))} ${escHtml(m.time)} <span aria-hidden="true">→</span><span class="sr-only">→</span> <strong>${escHtml(formatDateStr(m.newDate))}</strong>${i > 0 ? ` <span class="adm-chip">${escHtml(bkT('adm_rs_cascade_chip', 'zincir'))}</span>` : ''}</li>`).join('')}</ul>`;
}

// Tek ders "1 Hafta Ertele" ve erteleme talebi onayı. Pencere kayan dersleri ve hak etkisini
// gösterir; admin "hakkından düş" ya da "hak düşmeden (benden kaynaklı)" seçer.
// opts.request: talep onayı (başlık/düğme metni değişir). Dönüş: yazıldıysa true.
async function adminRescheduleLesson(studentUid, lessonIdx, allLessons, lesson, opts = {}) {
  const resSnap = await db.collection('reservations').doc(studentUid).get().catch(() => null);
  const resData = resSnap?.data() || {};
  const credit = totalRescheduleCredits(resData);
  const name = resData.student_name || resData.student_email || bkT('adm_student', 'Öğrenci');
  const { updated: updatedLessons, moves } = admPlanReschedule(allLessons, lessonIdx);
  const cascadeN = moves.length - 1;
  const body = `<p>${escHtml(bkT('adm_rs_lead', '{who} dersi 1 hafta ileri alınacak:').replace('{who}', admPoss(name)))}</p>
    ${admMovesHtml(moves)}
    ${cascadeN ? `<p class="adm-ask-note">${escHtml(bkT('adm_rs_cascade', 'Yeni tarih başka bir dersine denk geldiği için {n} ders de 1 hafta kayar; paketin bitişi uzar.').replace('{n}', cascadeN))}</p>` : ''}
    <p class="adm-ask-big">${escHtml(bkT('adm_rs_credit', 'Erteleme hakkı'))}: ${credit > 0
      ? `<strong>${credit}</strong> ${escHtml(bkT('adm_rs_left', 'kalan'))}`
      : `<strong class="text-err">${escHtml(bkT('adm_rs_none', 'hak yok'))}</strong>`}</p>
    ${credit > 0 ? '' : `<p class="adm-ask-note">${escHtml(bkT('adm_rs_none_n', 'Öğrencinin hakkı kalmadı; yine de erteleyebilirsin (hak düşmez). Ek hak satıldıysa önce "+1 hak ver".'))}</p>`}`;
  const choices = credit > 0
    ? [{ label: bkT('adm_rs_use', 'Öğrencinin hakkından düş ({a} → {b})').replace('{a}', credit).replace('{b}', credit - 1), value: 'use', cls: 'btn-primary' },
       { label: bkT('adm_rs_free', 'Hak düşmeden ertele (benden kaynaklı)'), value: 'free', cls: 'btn-ghost' }]
    : [{ label: bkT('adm_rs_free_only', 'Hak düşmeden ertele'), value: 'free', cls: 'btn-primary' }];
  const a = await admAsk({
    eyebrow: opts.request ? bkT('adm_rq_resched', 'Erteleme talebi') : bkT('adm_rs_eyebrow', 'Dersi ertele'),
    title: opts.request ? bkT('adm_rs_t_req', 'Talebi onayla') : bkT('adm_rs_t', '1 hafta ertele'),
    body, choices,
  });
  if (!a) return false;
  const consume = a.value === 'use' && credit > 0;
  try {
    const batch = db.batch();
    const upd = { lessons: updatedLessons };
    if (consume) {
      upd.reschedule_credits = consumeRescheduleCredit(resData, lesson.date);
      // reschedule_log: öğrenci panelindeki "Erteleme Hakkı → Geçmiş" satırı (hak gerçekten düştüyse)
      upd.reschedule_log = firebase.firestore.FieldValue.arrayUnion({ at: new Date().toISOString(), kind: 'used', lesson_date: lesson.date, n: 1, by: 'admin' });
    }
    batch.set(db.collection('reservations').doc(studentUid), upd, {merge:true});
    applySlotMovesToBatch(batch, moves, studentUid);
    if (opts.requestRef) batch.update(opts.requestRef, { status: 'accepted', credit_used: consume, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    await batch.commit();
    toast(`✓ ${bkT('adm_rs_done', '{n} ders ertelendi → {date}').replace('{n}', moves.length).replace('{date}', formatDateStr(moves[0].newDate))}${consume
      ? ' · ' + bkT('adm_rs_done_use', 'kalan hak {n}').replace('{n}', credit - 1)
      : ' · ' + bkT('adm_rs_done_free', 'hak düşülmedi')}`);
    window._slotsSynced = false;
    return true;
  } catch(e) { const c=errId(); toast(`Hata (${c}): ` + (e.message||e.code), true); return false; }
}

// ─── Conflict Check ───────────────────────────────────────
async function checkConflicts(lessons, skipUid = null) {
  const conflicts = new Set();
  const batchSize = 10;
  for (let i = 0; i < lessons.length; i += batchSize) {
    const batch = lessons.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(l => db.collection('booked_slots').doc(l.date + '_' + l.time).get().catch(() => null))
    );
    results.forEach((snap, idx) => {
      if (snap && snap.exists) {
        // Don't count as conflict if it belongs to the same student being scheduled
        if (skipUid && snap.data().student_uid === skipUid) return;
        conflicts.add(batch[idx].date + '_' + batch[idx].time);
      }
    });
  }
  return conflicts;
}

// ─── Saat değişikliği talebini onayla ─────────────────────
// Ders yeni saate taşınır (self_changed: her ders bir kez), eski yer bırakılır, yeni yer tutulur,
// talep 'accepted' olur — tek batch. Erteleme hakkı düşmez. Saat bu arada dolduysa admin uyarılır.
async function admApplyTimeChange(reqRef, r) {
  const resRef = db.collection('reservations').doc(r.from_uid);
  const resSnap = await resRef.get();
  if (!resSnap.exists) { toast(bkT('adm_rq_nores', 'Rezervasyon bulunamadı.'), true); return false; }
  const lessons = (resSnap.data().lessons || []).slice();
  const idx = lessons.findIndex(l => l && l.date === r.lesson_date && l.time === r.lesson_time && (l.status === 'scheduled' || l.status === 'rescheduled'));
  if (idx < 0) { toast(bkT('adm_rq_nolesson', 'Ders bulunamadı (taşınmış ya da iptal)'), true); return false; }
  const oldId = `${r.lesson_date}_${r.lesson_time}`, newId = `${r.new_date}_${r.new_time}`;
  const t = bkMinutes(r.new_time);
  const day = await db.collection('booked_slots').where('date', '==', r.new_date).get();
  const clash = day.docs.some(d => d.id !== oldId && bkSlotsClash(t, bkMinutes(d.data().time))) ||
    lessons.some((l, i) => i !== idx && l && l.date === r.new_date && SELF_RESCHED_OCCUPYING.includes(l.status) && bkSlotsClash(t, bkMinutes(l.time)));
  if (clash && !confirm(bkT('adm_rq_tc_clash', 'Yeni saat artık dolu ya da başka bir dersle çakışıyor. Yine de taşınsın mı?'))) return false;
  lessons[idx] = Object.assign({}, lessons[idx], {
    date: r.new_date, time: r.new_time, self_changed: true,
    self_changed_at: new Date().toISOString(), self_changed_from: { date: r.lesson_date, time: r.lesson_time },
  });
  const batch = db.batch();
  batch.update(resRef, { lessons, last_self_change_at: firebase.firestore.FieldValue.serverTimestamp() });
  const oldSlot = await db.collection('booked_slots').doc(oldId).get();
  if (oldSlot && oldSlot.exists && oldSlot.data().student_uid === r.from_uid) batch.delete(db.collection('booked_slots').doc(oldId));
  batch.set(db.collection('booked_slots').doc(newId), { date: r.new_date, time: r.new_time, student_uid: r.from_uid });
  batch.update(reqRef, { status: 'accepted', updated_at: firebase.firestore.FieldValue.serverTimestamp() });
  await batch.commit();
  return true;
}

// ─── Accept Trial Request ─────────────────────────────────
async function acceptTrialRequest(reqId, r) {
  const lesson = { date: r.trial_date, time: r.trial_time, status: 'scheduled' };
  const batch = db.batch();
  batch.set(db.collection('reservations').doc(r.from_uid), {
    student_uid:   r.from_uid,
    student_name:  r.from_name,
    student_email: r.from_email,
    student_phone: r.from_phone || '',
    student_photo: r.from_photo || '',
    duration_months: 0,
    schedule: [],
    note: r.note || '',
    start_date: r.trial_date,
    end_date:   r.trial_date,
    lessons: [lesson],
    reschedule_credits: {},
    lesson_type: 'trial',
    payment_confirmed: true, // no payment for trial
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
  }, {merge:true});
  batch.set(db.collection('booked_slots').doc(r.trial_date + '_' + r.trial_time), {
    date: r.trial_date, time: r.trial_time, student_uid: r.from_uid,
  });
  batch.update(db.collection('lesson_requests').doc(reqId), {
    status: 'accepted', updated_at: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

// ─── Accept Request → Create Reservation ─────────────────
async function acceptRequest(reqId, r, conflicts = new Set(), opts = {}) {
  const isSingle = r.lesson_type === 'single';
  const effDur   = isSingle ? 1 : r.duration_months;
  const effLpm   = isSingle ? 1 : (r.lessons_per_month || 4);
  const effStart = isSingle ? toDateStr(new Date()) : r.preferred_start_date;
  const allLessons = calculateLessonDates(r.schedule, effDur, effLpm, effStart);
  // Skip conflicting slots
  const lessons = allLessons.filter(l => !conflicts.has(l.date + '_' + l.time));
  if (lessons.length === 0) { toast('Tüm ders saatleri çakışıyor — talep kabul edilemez.', true); return; }

  // Build reschedule credits (1 per month)
  const reschedule_credits = {};
  const today = new Date();
  for (let i = 0; i < r.duration_months; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    reschedule_credits[key] = 1;
  }

  const endDate = lessons.length ? lessons[lessons.length-1].date : '';

  // Paket fiyatı: talepteki package_* alanlarına güvenilmez, package_id kanonik
  // PACKAGES'la doğrulanıp yeniden hesaplanır (reservationPriceFields). Önceki
  // rezervasyonun paket fiyatı yeni talebe sızmasın diye mevcut kayıt okunur;
  // okunamazsa onay durur (hata toast'ı, buton yeniden açılır).
  const prevSnap = await db.collection('reservations').doc(r.from_uid).get();
  const priceFields = reservationPriceFields(r, lessons.length, prevSnap.exists ? prevSnap.data() : null,
    () => firebase.firestore.FieldValue.delete(), { keepAdminPrice: opts.keepAdminPrice !== false });

  const batch = db.batch();

  // Create reservation
  batch.set(db.collection('reservations').doc(r.from_uid), {
    student_uid:   r.from_uid,
    student_name:  r.from_name,
    student_email: r.from_email,
    student_phone: r.from_phone || '',
    student_photo: r.from_photo || '',
    lesson_type:   r.lesson_type || 'monthly',
    duration_months: r.duration_months,
    lessons_per_month: r.lessons_per_month || 4,
    preferred_start_date: r.preferred_start_date || '',
    schedule:      r.schedule,
    note:          r.note || '',
    start_date:    r.preferred_start_date || toDateStr(new Date()),
    end_date:      endDate,
    lessons,
    reschedule_credits,
    payment_confirmed: false,
    payment_pending:   false,
    rules_accepted_at: r.rules_accepted_at || firebase.firestore.FieldValue.serverTimestamp(),
    rules_accepted_detail: r.rules_accepted_detail || null,
    rules_version: r.rules_version || null,
    ...priceFields,
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
  }, {merge:true});

  // Book slots
  lessons.forEach(l => {
    batch.set(db.collection('booked_slots').doc(l.date + '_' + l.time), {
      date: l.date, time: l.time, student_uid: r.from_uid,
    });
  });

  // Mark request as accepted
  batch.update(db.collection('lesson_requests').doc(reqId), {
    status: 'accepted',
    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}


// ─── Admin dinleyicileri ──────────────────────────────────
let _adminAccessUnsub = null;   // eski erişim talebi dinleyicisi (kaldırıldı; temizlik kodu null görür)
let _adminReqUnsub = null;
let _adminStudUnsub = null;


// ─── Admin Q&A ────────────────────────────────────────────

function initAdminQA() {
  if (_adminQAUnsub) { _adminQAUnsub(); _adminQAUnsub = null; }
  _adminQAAnswerUnsubs.forEach(u => u()); _adminQAAnswerUnsubs = [];

  const list = document.getElementById('adminQAList');
  if (!list) return;
  if (!list.children.length) list.innerHTML = admLoadingHtml();

  _adminQAUnsub = db.collection('lesson_questions')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .onSnapshot(snap => {
      _adminQAAnswerUnsubs.forEach(u => u()); _adminQAAnswerUnsubs = [];
      // açık yanıt kutuları ve taslaklar yeniden çizimde korunur
      const drafts = {};
      list.querySelectorAll('.qa-question').forEach(q => {
        const ta = q.querySelector('.qa-reply-input');
        if (ta && (!q.querySelector('.qa-reply-row').hidden || ta.value)) drafts[q.dataset.qid] = ta.value;
      });
      const solvedWasOpen = !!list.querySelector('.adm-qa-more[aria-expanded="true"]');
      list.innerHTML = '';
      const openDocs   = snap.docs.filter(d => d.data().status !== 'solved');
      const solvedDocs = snap.docs.filter(d => d.data().status === 'solved');
      admSet('admQaOpen', openDocs.length ? `${openDocs.length} ${bkT('adm_qa_open', 'açık')}` : '');
      if (snap.empty) { list.innerHTML = `<div class="adm-empty">${escHtml(bkT('adm_qa_empty', 'Henüz soru yok.'))}</div>`; return; }

      // Group open by student, then solved
      const openByStudent = {};
      openDocs.forEach(doc => {
        const name = doc.data().student_name || '—';
        if (!openByStudent[name]) openByStudent[name] = [];
        openByStudent[name].push(doc);
      });

      const renderDoc = (doc, target) => {
        const container = target || list;
        const q = doc.data();
        const isSolved = q.status === 'solved';
        const timeStr = q.createdAt ? q.createdAt.toDate().toLocaleDateString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';

        const el = document.createElement('div');
        el.className = 'qa-question' + (isSolved ? ' solved' : '');
        el.dataset.qid = doc.id;

        const header = document.createElement('div');
        header.className = 'qa-q-header';
        header.innerHTML = `
          <span class="qa-q-avatar" aria-hidden="true">${q.student_photo ? `<img src="${escHtml(q.student_photo)}" alt="" loading="lazy">` : escHtml(admInitial(q.student_name))}</span>
          <span class="qa-q-name">${escHtml(q.student_name || '—')}</span>
          ${isSolved
            ? `<span class="qa-solved-badge">✓ ${escHtml(bkT('adm_qa_solved', 'Çözüldü'))}</span>`
            : `<span class="badge info">${escHtml(bkT('adm_qa_open_cap', 'Açık'))}</span>`}
          <span class="qa-q-time">${escHtml(timeStr)}</span>`;

        const body = document.createElement('div');
        body.className = 'qa-q-text';
        body.textContent = q.question;

        const answersEl = document.createElement('div');
        answersEl.className = 'qa-answers';

        // Yanıt satırı (çözülmüş sorularda da) — "Yanıtla" ile açılır
        const replyRow = document.createElement('div');
        replyRow.className = 'qa-reply-row';
        const replyId = 'qaReply-' + doc.id;
        const replyLbl = document.createElement('label');
        replyLbl.className = 'sr-only'; replyLbl.htmlFor = replyId; replyLbl.textContent = bkT('adm_qa_reply_label', 'Cevap');
        const replyInput = document.createElement('textarea');
        replyInput.className = 'textarea qa-reply-input';
        replyInput.id = replyId;
        replyInput.rows = 2;
        replyInput.placeholder = bkT('adm_qa_reply_ph', 'Cevap yaz…');
        const replyBtn = admBtn(bkT('adm_qa_send', 'Yanıtla'), 'btn btn-sm btn-primary', () => adminAnswerQuestion(doc.id, replyInput));
        replyRow.append(replyLbl, replyInput, replyBtn);
        const hasDraft = Object.prototype.hasOwnProperty.call(drafts, doc.id);
        replyRow.hidden = !hasDraft;
        if (hasDraft) replyInput.value = drafts[doc.id];

        const actionsRow = document.createElement('div');
        actionsRow.className = 'qa-actions';
        const toggleReply = admBtn(bkT('adm_qa_reply', 'Yanıtla'), 'btn btn-sm btn-subtle', () => {
          replyRow.hidden = !replyRow.hidden;
          toggleReply.setAttribute('aria-expanded', replyRow.hidden ? 'false' : 'true');
          if (!replyRow.hidden) replyInput.focus();
        });
        toggleReply.setAttribute('aria-expanded', replyRow.hidden ? 'false' : 'true');
        toggleReply.setAttribute('aria-controls', replyId);
        actionsRow.append(toggleReply);
        if (!isSolved) {
          actionsRow.append(admBtn('✓ ' + bkT('adm_qa_mark_solved', 'Çözüldü'), 'btn btn-sm btn-ok', () => adminMarkSolved(doc.id)));
        } else {
          actionsRow.append(admBtn(bkT('adm_qa_reopen', 'Yeniden aç'), 'btn btn-sm btn-ok', () => adminReopenQuestion(doc.id)));
        }
        const deleteQBtn = admBtn(bkT('adm_delete', 'Sil'), 'btn btn-sm btn-danger');
        deleteQBtn.onclick = async () => {
          const confirmed = await showInputModal({ title: 'Bu soruyu silmek istediğine emin misin?', placeholder: 'Onaylamak için "evet" yaz', defaultVal: '' });
          if (!confirmed || confirmed.trim().toLocaleLowerCase('tr-TR') !== 'evet') return;
          try {
            await db.collection('lesson_questions').doc(doc.id).delete();
            toast('Soru silindi.');
          } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
        };
        actionsRow.append(deleteQBtn);

        el.append(header, body, answersEl, actionsRow, replyRow);
        container.append(el);

        const unsub = db.collection('lesson_questions').doc(doc.id).collection('answers')
          .orderBy('createdAt','asc').limit(50)
          .onSnapshot(aSnap => {
            answersEl.innerHTML = '';
            if (aSnap.empty) { answersEl.innerHTML = `<div class="qa-empty">${escHtml(bkT('adm_qa_no_answer', 'Henüz yanıt yok.'))}</div>`; return; }
            aSnap.docs.forEach(ad => {
              const a = ad.data();
              const aTime = a.createdAt ? a.createdAt.toDate().toLocaleDateString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
              const div = document.createElement('div');
              div.className = 'qa-answer' + (a.fromAdmin ? ' from-admin' : '');
              div.innerHTML = `<div class="qa-ans-bubble">
                <div class="qa-ans-who">${escHtml(a.fromAdmin ? 'Berkay Er' : (a.authorName || 'Öğrenci'))}</div>
                <div class="qa-ans-text"></div>
                <div class="qa-ans-time">${escHtml(aTime)}</div>
              </div>`;
              div.querySelector('.qa-ans-text').textContent = a.text || '';
              answersEl.append(div);
            });
          }, e => { const c=errId(); answersEl.innerHTML=`<div class="qa-empty adm-err">Yanıtlar yüklenemedi (${c}): ${escHtml(e.code||e.message)}</div>`; });
        _adminQAAnswerUnsubs.push(unsub);
      };

      // Render open questions grouped by student
      Object.entries(openByStudent).forEach(([studentName, docs]) => {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'qa-group-head';
        groupHeader.textContent = `${studentName} — ${docs.length} ${bkT('adm_qa_open_q', 'açık soru')}`;
        list.append(groupHeader);
        docs.forEach(d => renderDoc(d));
      });
      if (!openDocs.length) list.insertAdjacentHTML('beforeend', `<p class="adm-note">${escHtml(bkT('adm_qa_none_open', 'Açık soru yok.'))}</p>`);

      // Render solved questions collapsible
      if (solvedDocs.length > 0) {
        const solvedSection = document.createElement('div');
        solvedSection.className = 'adm-qa-solved';
        solvedSection.id = 'admQaSolved';
        solvedSection.hidden = !solvedWasOpen;
        const solvedToggle = admBtn('', 'adm-past-tg adm-qa-more');
        solvedToggle.setAttribute('aria-controls', 'admQaSolved');
        const paint = () => {
          solvedToggle.setAttribute('aria-expanded', solvedSection.hidden ? 'false' : 'true');
          solvedToggle.innerHTML = `<svg class="adm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg><span>${escHtml(bkT('adm_qa_solved_list', 'Çözülmüş sorular'))} (${solvedDocs.length})</span>`;
        };
        paint();
        solvedDocs.forEach(doc => renderDoc(doc, solvedSection));
        solvedToggle.onclick = () => {
          solvedSection.hidden = !solvedSection.hidden; paint();
          if (!solvedSection.hidden && list.scrollHeight > list.clientHeight) list.scrollTop = solvedToggle.offsetTop - list.offsetTop;
        };
        list.append(solvedToggle, solvedSection);
      }
    }, () => { list.innerHTML = `<div class="adm-empty is-err">${escHtml(bkT('adm_qa_err', 'Sorular yüklenemedi.'))}</div>`; });
}

async function adminAnswerQuestion(qId, inputEl) {
  const text = inputEl.value.trim();
  if (!text) { inputEl.focus(); return; }
  inputEl.disabled = true;
  try {
    await db.collection('lesson_questions').doc(qId).collection('answers').add({
      text,
      fromAdmin: true,
      authorName: 'Berkay Er',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    inputEl.value = '';
    toast('✓ Cevap gönderildi.');
  } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
  inputEl.disabled = false;
}

// Çözülmüş soruyu yeniden açar (öğrenci yeniden yazabilir). Kural: admin lesson_questions günceller.
async function adminReopenQuestion(qId) {
  if (!await admConfirm(bkT('adm_qa_reopen_b', 'Öğrenci bu soruya yeniden mesaj ekleyebilecek.'), { title: bkT('adm_qa_reopen_t', 'Soru yeniden açılsın mı?'), ok: bkT('adm_qa_reopen_ok', 'Yeniden aç') })) return;
  try {
    await db.collection('lesson_questions').doc(qId).update({ status: 'open' });
    toast('✓ Soru yeniden açıldı.');
  } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
}

async function adminMarkSolved(qId) {
  if (!await admConfirm(bkT('adm_qa_solve_b', 'Öğrenci bu soruya artık yeni mesaj ekleyemeyecek.'), { title: bkT('adm_qa_solve_t', 'Çözüldü olarak işaretle'), ok: bkT('adm_qa_solve_ok', 'Çözüldü') })) return;
  try {
    await db.collection('lesson_questions').doc(qId).update({ status: 'solved' });
    toast('✓ Soru çözüldü olarak işaretlendi.');
  } catch(e) { const c=errId(); toast(`Hata (${c}): `+(e.message||e.code), true); }
}


// metinler ve aria etiketleri yeni markup'a uygulanır
if (window._i18n) window._i18n.apply();
bkApplyAria();
