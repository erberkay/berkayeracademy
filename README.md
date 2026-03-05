# Berkay Er — Producer.School

Kişisel portfolyo ve öğrenci topluluğu sitesi. GitHub Pages üzerinde barındırılır, backend olarak Firebase (Auth + Firestore) kullanır.

🌐 **Canlı site:** [erberkay.github.io/Producer.School](https://erberkay.github.io/Producer.School/)

---

## Sayfalar

| Sayfa | Açıklama |
|---|---|
| `index.html` | Ana sayfa — biyografi, eğitim müfredatı, öğrenci yorumları, prodüksiyon dergisi, forum önizlemesi |
| `forum.html` | Topluluk forumu — konu listesi, arama, kategori filtresi |
| `post.html` | Konu detay sayfası — yanıtlar, markdown destek |
| `new-post.html` | Yeni konu oluşturma — başlık, içerik editörü, kategori seçici |
| `profile.html` | Kullanıcı profili — hakkında, genreler, konu geçmişi |
| `site_1.html` | Ableton Lab — interaktif beat builder (Web Audio API) |
| `ders-ableton.html` | Ücretsiz Ableton Live dersi sayfası |

---

## Özellikler

### Kimlik Doğrulama
- Google OAuth (`signInWithPopup`) — Firebase Auth
- Tüm sayfalarda tutarlı auth bar (avatar, isim, çıkış)
- Popup çakışmasını önleyen `_signingIn` guard

### Topluluk Forumu
- Gerçek zamanlı Firestore veritabanı
- Konu arama (başlık, içerik, yazar)
- Kategori filtreleri: Genel · Ableton · Ses Tasarımı · Mixing · Live Set · Diğer
- Çözüldü / Açık filtresi
- Yanıtlar + yanıt sayacı
- **Ctrl+Enter** ile hızlı yanıt gönderimi
- Admin özellikleri: çözüldü işaretleme, konu/yanıt silme
- Çözülmüş konularda yanıt formu kapalı

### Admin Paneli
- Admin e-postası: `berkayer032@gmail.com`
- ⚡ rozeti ile ayırt edilir
- Konuları çözüldü olarak işaretleyebilir, silebilir, yanıtları silebilir

### Kullanıcı Profilleri
- Profil fotoğrafı, isim, katılım tarihi
- Hakkında metni (maks. 300 karakter)
- Tür/genre etiketleri (maks. 8)
- Açılan konu geçmişi

### Ableton Lab (`site_1.html`)
- Web Audio API tabanlı beat sequencer
- 16 adımlı step sequencer (Kick, Snare, Hi-Hat, Lead)
- BPM kontrolü, pattern kaydetme/yükleme
- Beat Burst modu

### İçerik
- Prodüksiyon Dergisi PDF (35 sayfa) — okuma ve indirme
- Ücretsiz Ableton Live video dersi (Google Drive embed)
- Live set video

---

## Klasör Yapısı

```
Producer.School/
├── index.html
├── forum.html
├── post.html
├── new-post.html
├── profile.html
├── site_1.html
├── ders-ableton.html
├── assets/
│   ├── css/
│   │   └── style.css          # Ana sayfa stilleri
│   ├── img/
│   │   ├── DSC00141.jpg       # Profil fotoğrafı
│   │   └── favicon.svg        # SVG favicon
│   ├── audio/
│   │   └── *.wav              # Beat sequencer ses dosyaları
│   ├── video/
│   │   └── live.mov           # Live set videosu
│   └── pdf/
│       └── produksiyon-dergisi.pdf
└── README.md
```

---

## Teknoloji

- **Frontend:** Vanilla HTML/CSS/JS — framework yok
- **Font:** Bebas Neue + Space Mono (Google Fonts)
- **Backend:** Firebase (Firestore + Auth) — compat SDK v10.12.2
- **Hosting:** GitHub Pages
- **Tasarım:** Koyu tema, grain noise doku, altın/kırmızı/amber renk paleti

---

## Firebase Firestore Koleksiyonları

| Koleksiyon | Alanlar |
|---|---|
| `forum` | title, text, category, authorName, authorEmail, authorId, authorPhotoURL, createdAt, replyCount, solved |
| `forum/{id}/replies` | text, authorName, authorEmail, authorId, isAdmin, createdAt |
| `users` | displayName, photoURL, email, about, genres, joinedAt, replyCount |
| `testimonials` | name, text, createdAt |

---

## Geliştirme Notları

- Tüm sayfalar statik HTML — build adımı yok
- Firebase `signInWithRedirect` yerine `signInWithPopup` kullanılır (cross-origin cookie sorunu nedeniyle)
- Post cache (`_allPosts`) sayesinde forum'da filtre/arama değişince Firestore'a tekrar istek atılmaz
- Admin kontrolü e-posta karşılaştırmasıyla yapılır (`ADMIN_EMAIL` sabiti)
