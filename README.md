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
| `migration.html` | `/migration` | Tek seferlik admin aracı (eski mesajları düzeltme) |

Eski Lab adresleri `/site_1` ve `/site_1.html`, `firebase.json`'daki yönlendirmeyle `/ableton-lab`'a gider. `4d48d66dcfc588cf4da6147a4780d0e8.html` Twilio alan adı doğrulama dosyasıdır; silinmemeli.

## Öne çıkanlar

### Ders Paneli (`booking.html`)

- **Talepler ve deneme dersi:** deneme dersi, aylık plan ya da tek ders talebi. Tek ders seçilince aylık plana geçiş önerisi çıkar.
- **Tanıtım videoları** (`assets/js/trial-intro.js`): deneme dersi düğmelerinde deneme animasyonu (10 sn) ve sistem tanıtımı (60 sn), paket düğmelerinde sistem tanıtımı, panele ilk girişte ikisi; panelde "Tanıtım videosu" ile yeniden izlenir.
- **Seviye belirleme sınavı:** 20 soru, zorunlu.
- **Ödeme ve kurallar:** ödeme bildirimi, akademi kuralları onayı (kural başına ayrı onay kaydı).
- **Derslerim · Bu hafta:** canlı geri sayımlı ders kartları. Öğrenci aynı hafta içinde yeni bir saat için **saat değişikliği talebi** gönderir (dersten en az 5 saat önce, ders başına bir kez); admin onaylayınca ders taşınır, erteleme hakkı düşmez. Kurallar sunucuda (`studentSelfReschedule`) denetlenir.
- **Erteleme:** dersi 1 hafta ileri alır; talep edilir, admin onaylar. Erteleme hakları paket bazında tutulur (N aylık paket = N hak, ek hak 500 TL).
- **Ders kanıtı:** her dersten sonra öğrenci 48 saat içinde onaylar ya da itiraz eder; Zoom katılım kaydı saklanır. Biten dersler "Son derslerin" bölümünde durumuyla görünür.
- **Zoom:** ders saatinden 15 dakika önce "Derse Katıl" düğmesi açılır.
- **Asistan** (`assets/js/be-assistant*.js`): harici yapay zekâ kullanmayan, site içinde çalışan soru-cevap asistanı; öğrencinin kendi derslerine, haklarına ve ödemesine göre cevap verir. Bilmediği soruyu Berkay Er'e iletir; admin cevabı "Asistan soruları" kartından yazınca asistan onu öğrenir.
- **Panel turu** (`assets/js/be-tour.js`): öğrencinin durumuna ve ekranına (masaüstü / mobil) göre adım adım rehber.
- **Admin:** öğrenci ve ders yönetimi, gelen talepler (ders, deneme, erteleme, saat değişikliği, ödeme), erteleme hakları, ödeme onayı, e-posta ve WhatsApp gönderimi, Zoom toplantısı oluşturma.
- **Admin önizlemesi (demo):** "Öğrenci görünümü" yeni öğrencinin ekranlarını gösterir. Hiçbir şey kaydedilmez; gönderilen talep bekleme ekranı, onaylı panel ve ödemesi onaylı hâliyle demo olarak ilerler.

### Ableton Lab (`ableton-lab.html`)

Her modül profesyonel bir eklenti penceresi olarak çalışır. Altında akış diyagramı ve parametre tablosuyla bir **"Çalışma mantığı"** bölümü bulunur.

| Modül | Adres | Eklenti | İçerik |
|---|---|---|---|
| 01 Synthesizer | `#synth` | BE·SYNTH 01 | 2 OSC + sub + noise, her notada ayrı filtre ve zarf (16 ses), MOD ENV, LFO, FX rafı, preset tarayıcı, A/B, geri al |
| 02 Beat Maker | `#beat` | BE·RHYTHM 02 | Lookahead zamanlayıcı, 4 pattern slotu, 16/32 adım, sentezlenmiş veya sample davul, ses editörü, choke, tap tempo |
| 03 Mixing | `#mixing` | BE·CONSOLE 03 | 6 kanal (EQ, kompresör, pan, send), reverb/delay return'leri, sidechain, master limiter |
| 04 Arrangement | `#arrangement` | BE·ARRANGER 04 | 8 bölümlük şarkı yapısı, MIDI kanalları ve piano roll (gam seçimi), klip kopyalama / uzatma, bölüm otomasyonu, loop, tür şablonları |
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
│   ├── js/                   # theme-init · i18n · auth-ui · trial-nav · trial-intro · be-tour · be-assistant* · placement-quiz · push3/
│   ├── img/                  # icons.svg sprite, favicon, fotoğraflar, push3-device.svg
│   ├── audio/                # Lab sample'ları ve loop'ları
│   ├── video/                # live.mp4 (döngü videosu)
│   ├── media/deneme-dersi/   # Tanıtım videoları (web / mobil, webm + mp4)
│   └── pdf/                  # Prodüksiyon dergisi
├── functions/                # Cloud Functions (index.js, whatsapp.js)
├── docs/                     # Tasarım ve Push 3 dokümanları (yayınlanmaz)
├── tools/                    # Yardımcı betikler (yayınlanmaz): demo-uyeler.cjs
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
| Zamanlanmış (İstanbul saati) | `paymentReminder`, `lessonReminder24h`, `lessonReminder1h`, `lessonEndFollowUp`, `lessonAttendanceSync`, `lessonAutoConfirm` |
| Firestore tetikleyici | `notifyAdminOnNewRequest`, `notifyStudentOnRequestStatus`, `notifyAdminOnAssistantQuestion` |
| Çağrılabilir (`onCall`) | `studentSelfReschedule` (saat değişikliği talebi), `confirmLesson`, `checkTrialEligibility`, `createZoomMeeting`, `sendWhatsAppMessage`, `sendWhatsAppAdmin`, `markWhatsAppConvoRead`, `sendPaymentRemindersManual`, `sendCustomEmail`, `sendWelcomeEmail`, `sendPromoEmailAll`, `sendPromoEmailSingle` |
| HTTP | `twilioWhatsAppWebhook` |

## Güvenlik

- **Firebase web API anahtarı** (`AIza…`) sayfalarda bilerek açıktır. Tarayıcının Firebase'e bağlanması için gereklidir ve gizli bilgi sayılmaz. Anahtar iki yönden kısıtlıdır:
  - **Alan adı:** yalnızca izin verilen alan adlarından gelen istekleri kabul eder.
  - **API:** yalnızca izin verilen API'leri çağırabilir. Örneğin Gemini ve YouTube engelli, Maps ve Translate projede kapalı.
  - GitHub'ın "secret scanning" uyarısı bu anahtar içindir. Uyarı "Won't fix" olarak kapatılabilir.
- **Veri erişimi** `firestore.rules` ile korunur. Admin yetkisi sunucu tarafında, oturum tokenındaki e-postayla kontrol edilir.
- **Gerçek gizli bilgiler** (Twilio, Zoom, Gmail) yalnızca `functions/.env.ableton-tutorial` dosyasındadır. Bu dosya `.gitignore`'da olduğu için repoya girmez.
