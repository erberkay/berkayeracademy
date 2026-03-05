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
| `members.html` | Üyeler sayfası — skeleton loader, sort, collab filtresi, sosyal linkler |
| `profile.html` | Kullanıcı profili — hakkında, genreler, collab durumu, konu geçmişi |
| `site_1.html` | Ableton Lab — 4 modüllü interaktif prodüksiyon araçları (Web Audio API) |
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
- Collab durumu: Projeye Açık / Meşgul / Belirtilmemiş
- Instagram + Spotify linkleri
- Açılan konu geçmişi

### Üyeler Sayfası
- Skeleton loader (yükleme sırasında shimmer kartlar)
- Üye sayısı fade-in animasyonu
- Sıralama: En Yeni / En Eski / A-Z
- Collab filtresi: "Projeye Açık" üyeleri filtrele
- Arama: isim + genre eşleşmesi
- Kart üzerinde collab durumu göstergesi (yeşil/kırmızı nokta)
- Instagram ve Spotify linkleri kartlarda

### Ableton Lab (`site_1.html`) — 4 Modül
Tüm araçlar Web Audio API tabanlı, framework yok.

#### Modül 1 — Synthesizer
- Waveform seçici: sine / square / sawtooth / triangle
- ADSR zarfı (Attack, Decay, Sustain, Release)
- Low-pass filtre: cutoff + resonance
- Oktav kaydırma, klavye (A–K tuşları)
- Preset kaydet/yükle (Firebase Firestore)

#### Modül 2 — Beat Maker
- 16 adımlı step sequencer: Kick, Snare, Open Hat, Close Hat, Bass, Lead
- Velocity sürükleme (adımı yukarı sürükle)
- BPM kontrolü, swing ayarı
- Beat Burst modu (anlık ritim patlaması)
- Beat kaydet/yükle (Firebase Firestore)
- Trap / House / Minimal hazır şablonlar

#### Modül 3 — Mixing
- **İnteraktif 3-Band EQ**: Noktaları sürükle → frekans (X) + gain (Y) değişir
  - LOW: 20–500Hz, MID: 200–8000Hz, HIGH: 2000–20000Hz
  - Gain: ±18dB, gerçek Web Audio BiquadFilter
- **İnteraktif Mixer — 4 Kanal**:
  - KICK, SNARE, BASS, LEAD LOOP kanalları
  - VOL slider (ses seviyesi), PAN slider (stereo konum), MUTE butonu
  - VU meter animasyonu
  - "MIX ÇAL" → Beat Maker pattern'ini + Lead Loop'u gerçek seslerle çalar
  - Slider/Mute değişiklikleri çalarken anında etkili

#### Modül 4 — Arrangement Builder
- Çok parçalı arrangement grid (Intro, Verse, Pre-Chorus, Chorus, Bridge, Drop, Outro)
- Trackler: KICK (1/4), HI-HAT (1/16), BASS (E1→A1 pattern), LEAD (loop), PAD (loop)
- BPM-senkronize 4 bar döngüsü (Web Audio API precise timing)
- Hücreye tıkla = track'i o bölüme ekle/çıkar
- Playhead animasyonu, şablon yükle, sıfırla

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
├── members.html
├── profile.html
├── site_1.html
├── ders-ableton.html
├── assets/
│   ├── css/
│   │   └── style.css              # Global stiller (index, forum, profil sayfaları)
│   ├── img/
│   │   ├── DSC00141.jpg           # Profil fotoğrafı
│   │   ├── og-logo.png            # OG paylaşım görseli
│   │   └── favicon.svg            # SVG favicon
│   ├── audio/
│   │   ├── Kick.wav
│   │   ├── Snare.wav
│   │   ├── Close Hat.wav
│   │   ├── Open Hat (1).wav
│   │   ├── bass.wav
│   │   ├── Lead.wav
│   │   ├── Lead Loop.wav          # Mixer + Arrangement için 125 BPM loop
│   │   └── Pad Loop.wav           # Arrangement PAD track için 125 BPM loop (Gm)
│   ├── video/
│   │   └── live.mov               # Live set videosu
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
| `users` | displayName, photoURL, email, about, genres, joinedAt, replyCount, instagramUrl, spotifyUrl, collabStatus |
| `testimonials` | name, text, createdAt |

---

## Geliştirme Notları

- Tüm sayfalar statik HTML — build adımı yok
- Firebase `signInWithRedirect` yerine `signInWithPopup` kullanılır (cross-origin cookie sorunu nedeniyle)
- Post cache (`_allPosts`) sayesinde forum'da filtre/arama değişince Firestore'a tekrar istek atılmaz
- Admin kontrolü e-posta karşılaştırmasıyla yapılır (`ADMIN_EMAIL` sabiti)
- `site_1.html` içindeki tüm browser `alert()` çağrıları in-page modal (`showModal`) ile değiştirildi
- Pad Loop.wav ve Lead Loop.wav 125 BPM Gm — arrangement ve mixer BPM sabiti 125
