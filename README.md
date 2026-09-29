# Berkay Er Academy

Berkay Er'in birebir Ableton Live / müzik prodüksiyonu eğitim sitesi: tanıtım sayfaları, öğrenci ders paneli, topluluk forumu, tarayıcıda çalışan Ableton Lab ve Push 3 Laboratuvarı.

**Canlı site:** [berkayeracademy.com](https://berkayeracademy.com)

Geliştirme kuralları ve mimari ayrıntıları için **[`CLAUDE.md`](CLAUDE.md)**, tasarım sistemi için **[`docs/tasarim/TASARIM.md`](docs/tasarim/TASARIM.md)**. Arayüzün kaynağı Claude Design'daki "Berkay Er Academy — Yeni Tasarım" tuvalidir.

---

## Teknoloji

- **Ön yüz:** düz HTML / CSS / JavaScript. Framework ve build adımı yok; her sayfa doğrudan yayınlanır.
- **Firebase** (`ableton-tutorial` projesi, `europe-west1`):
  - **Hosting:** `cleanUrls` açık (`/booking`, `.html` yok), özel alan adı `berkayeracademy.com`
  - **Auth:** Google ve e-posta/şifre; ortak giriş penceresi `assets/js/auth-ui.js`
  - **Firestore:** veri ve güvenlik kuralları `firestore.rules`
  - **Cloud Functions v2:** Node 24, `functions/`
  - İstemci SDK'sı: compat v10.12.2, CDN'den
- **Entegrasyonlar:** Twilio WhatsApp (hatırlatmalar, admin sohbeti), Zoom (ders bağlantısı), Gmail/Nodemailer (e-postalar).
- **Ses:** Web Audio API (Ableton Lab, Push 3 emülatörü; AudioWorklet + Web Worker).
- **Dil:** Türkçe / İngilizce (`assets/js/i18n.js`, `data-i18n`).

## Sayfalar

| Dosya | Adres | İçerik |
|---|---|---|
| `index.html` | `/` | Ana sayfa: hero döngü videosu, eğitim tanıtımı, öğrenci yorumları |
| `egitim.html` | `/egitim` | Eğitim programı, müfredat, üye içerikleri |
| `egitmen.html` | `/egitmen` | Eğitmen: biyografi, yolculuk, canlı set videosu |
| `sss.html` | `/sss` | Sık sorulan sorular |
| `booking.html` | `/booking` | **Ders Paneli** (öğrenci) + **Admin Paneli** + WhatsApp sohbeti |
| `forum.html` · `post.html` · `new-post.html` | `/forum` · `/post?id=` · `/new-post` | Topluluk forumu |
| `members.html` · `profile.html` | `/members` · `/profile?uid=` | Üyeler, profil, mesajlaşma, collab istekleri |
| `ableton-lab.html` | `/ableton-lab` | **Ableton Lab:** 5 interaktif modül |
| `ders-ableton.html` | `/ders-ableton` | Ücretsiz Ableton Live dersi |
| `ders-push3.html` | `/ders-push3` | **Push 3 Laboratuvarı:** öğretici, seviyeler, emülatör |
| `app-bridge.html` | `/app-bridge` | Uygulamalar arası veri köprüsü |

`site_1.html` eski Lab sayfasıdır; `/site_1` adresi `/ableton-lab`'a yönlenir.

## Öne çıkanlar

### Ders Paneli (`booking.html`)

- **Talepler ve deneme dersi:** deneme dersi, aylık plan ya da tek ders talebi. Tek ders seçilince aylık plana geçiş önerisi çıkar.
- **Seviye belirleme sınavı:** 20 soru, zorunlu.
- **Ödeme ve kurallar:** ödeme bildirimi, akademi kuralları onayı.
- **Derslerim · Bu hafta:** öğrenci dersinin saatini kendisi değiştirebilir. Aynı hafta içinde, ders başına bir kez, dersten en az 5 saat önce. Kurallar sunucuda (`studentSelfReschedule`) uygulanır.
- **Erteleme:** erteleme talebi gönderilir, admin onaylar. Erteleme hakları paket bazında tutulur.
- **Zoom:** ders saati yaklaşınca katılma düğmesi açılır.
- **Admin:** öğrenci ve ders yönetimi, gelen talepler, ödeme onayı, e-posta ve WhatsApp gönderimi, Zoom toplantısı oluşturma.

### Ableton Lab (`ableton-lab.html`)

Her modül profesyonel bir eklenti penceresi olarak çalışır. Altında akış diyagramı ve parametre tablosuyla bir **"Çalışma mantığı"** bölümü bulunur.

| Modül | Adres | Eklenti | İçerik |
|---|---|---|---|
| 01 Synthesizer | `#synth` | BE·SYNTH 01 | 2 OSC + sub + noise, her notada ayrı filtre ve zarf (16 ses), MOD ENV, LFO, FX rafı, preset tarayıcı, A/B, geri al |
| 02 Beat Maker | `#beat` | BE·RHYTHM 02 | Lookahead zamanlayıcı, 4 pattern slotu, 16/32 adım, sentezlenmiş veya sample davul, ses editörü, choke, tap tempo |
| 03 Mixing | `#mixing` | BE·CONSOLE 03 | 6 kanal (EQ, kompresör, pan, send), reverb/delay return'leri, sidechain, master limiter |
| 04 Arrangement | `#arrangement` | BE·ARRANGER 04 | 8 bölümlük şarkı yapısı, bölüm otomasyonu, loop, tür şablonları |
| 05 Mastering | `#mastering` | BE·MASTER 05 | EQ, glue, multiband, stereo ve limiter zinciri; K-weighting LUFS ve true peak ölçümü, seviye eşli REF |

- **Görevler:** her modülde görev listesi var. İlerleme `localStorage`'da ve Firestore'da saklanır.
- **Presetler:** Synth, Beat, Mix ve Master presetleri kullanıcı hesabına kaydedilir.

### Push 3 Laboratuvarı (`ders-push3.html`)

Tarayıcıda çalan bir Push 3 emülatörü (Wavetable synth, drum rack, sequencer), öğretici ve iki seviyeden oluşur. Kod `assets/js/push3/` altında, sözleşme `docs/push3/README.md`'de.

## Klasör yapısı

```
├── *.html                    # Sayfalar (build yok)
├── assets/
│   ├── css/                  # ui.css (tasarım sistemi) · style.css (tanıtım sayfaları) · themes.css (menü kabuğu)
│   ├── js/                   # theme-init · i18n · auth-ui · trial-nav · placement-quiz · push3/
│   ├── img/                  # icons.svg sprite, favicon, fotoğraflar, push3-device.svg
│   ├── audio/                # Lab sample'ları ve loop'ları
│   ├── video/                # live.mp4 (döngü videoları)
│   └── pdf/                  # Prodüksiyon dergisi
├── functions/                # Cloud Functions (index.js, whatsapp.js)
├── docs/                     # Tasarım ve Push 3 dokümanları (yayınlanmaz)
├── firebase.json             # Hosting ayarları (cleanUrls, ignore, başlıklar)
├── firestore.rules           # Güvenlik kuralları
└── CLAUDE.md                 # Geliştirici rehberi
```

## Geliştirme

```bash
# Yerel önizleme
firebase serve --only hosting --port 8123

# Cloud Functions
cd functions
npm ci
npm run lint
npm run serve   # emülatör
```

Firebase web API anahtarı yalnızca izin verilen alan adlarından gelen isteklere yanıt verir. Bu yüzden `localhost`'ta giriş ve Firestore çalışmaz (403). Bu akışlar Firebase emülatörüyle ya da canlı sitede test edilir.

## Yayına alma

```bash
firebase deploy --only hosting            # HTML / CSS / JS değişiklikleri
firebase deploy --only functions          # Cloud Functions
firebase deploy --only firestore:rules    # Güvenlik kuralları
```

`git push` yalnızca GitHub'ı günceller; site ayrıca deploy edilir. Ortak bir CSS/JS dosyası değiştiğinde tüm sayfalardaki `?v=` damgası birlikte artırılır.

## Cloud Functions

| Tür | Fonksiyonlar |
|---|---|
| Zamanlanmış (İstanbul saati) | `paymentReminder`, `lessonReminder24h`, `lessonReminder1h`, `lessonEndFollowUp` |
| Firestore tetikleyici | `notifyAdminOnNewRequest`, `notifyStudentOnRequestStatus` |
| Çağrılabilir (`onCall`) | `studentSelfReschedule`, `checkTrialEligibility`, `createZoomMeeting`, `sendWhatsAppMessage`, `sendWhatsAppAdmin`, `markWhatsAppConvoRead`, `sendPaymentRemindersManual`, `sendCustomEmail`, `sendWelcomeEmail`, `sendPromoEmailAll`, `sendPromoEmailSingle` |
| HTTP | `twilioWhatsAppWebhook` |

## Güvenlik

- **Firebase web API anahtarı** (`AIza…`) sayfalarda bilerek açıktır. Tarayıcının Firebase'e bağlanması için gereklidir ve gizli bilgi sayılmaz. Anahtar iki yönden kısıtlıdır:
  - **Alan adı:** yalnızca izin verilen alan adlarından gelen istekleri kabul eder.
  - **API:** yalnızca izin verilen API'leri çağırabilir. Örneğin Gemini ve YouTube engelli, Maps ve Translate projede kapalı.
  - GitHub'ın "secret scanning" uyarısı bu anahtar içindir. Uyarı "Won't fix" olarak kapatılabilir.
- **Veri erişimi** `firestore.rules` ile korunur. Admin yetkisi sunucu tarafında, oturum tokenındaki e-postayla kontrol edilir.
- **Gerçek gizli bilgiler** (Twilio, Zoom, Gmail) yalnızca `functions/.env.ableton-tutorial` dosyasındadır. Bu dosya `.gitignore`'da olduğu için repoya girmez.
