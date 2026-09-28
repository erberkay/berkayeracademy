# Berkay Er Academy — Yeni Tasarım Sistemi (TASARIM.md)

Kaynak: Claude Design tuvali (`artifact-files/541ee88d…/project/*.dc.html`, masaüstü 1440 + mobil 390×844 `M_*`).
Uygulama: `assets/css/ui.css` (token + bileşen), `assets/css/themes.css` (kabuk: başlık, çekmece, sekme çubuğu, footer, auth bar, bildirim), `assets/js/theme-init.js` (kabuğu üretir), `assets/css/style.css` (vitrin bileşenleri).
Bu belge eski CLAUDE.md görsel kurallarını (radius 0, degrade/backdrop-filter yasağı, açık tema) **geçersiz** kılar.

---

## 0. Temel kurallar

1. **Yalnız koyu tema.** Açık tema ve tema düğmesi yok. `localStorage['site-theme']` yok sayılır. `html.theme-light` sınıfının hiçbir CSS karşılığı kalmadı.
2. **Token dışı değer yazma.** Renk, radius, gölge, font, animasyon süresi `ui.css`'teki değişkenlerden gelir. Tasarımda geçen ama token'ı olmayan tek seferlik bir değer gerekiyorsa (ör. bir çizelge çubuğunun rengi) sayfa `<style>`'ında yorumla birlikte yazılabilir.
3. **Inline `style=""` yok** — yalnız çalışma anı durumu (`display:none`, veriden hesaplanan genişlik/yükseklik, `--x` değişkeni) için.
4. **`!important` yalnız `prefers-reduced-motion` için.** (İstisna: `themes.css` sonundaki "GEÇİCİ Lab iç yamaları" bloğu — Lab ajanı taşıyıp silecek.)
5. **Degrade ve `backdrop-filter` serbest** (ember şeridi, radial ışık, cam başlık/sekme çubuğu). Radius serbest ama ölçekten.
6. **Kontrast ≥ 4.5:1.** Küçük metinde (< 18px) `#6f6a62` KULLANMA → `--fg-faint` (#817b72). `#6f6a62` (`--fg-deco`) yalnız dekoratif öğe, ayırıcı `·` veya ≥ 18px metin için.
7. **Dokunma hedefi ≥ 44px.** 40px'lik küçük kontroller mobilde `::after` ile genişletilir (`.btn`, `.be-switch`, `.be-step-btn` bunu kendiliğinden yapar).
8. **Emoji yok** (kabuk ve kontrol ikonlarında). İkon: `/assets/img/icons.svg#i-*` sprite'ı ya da inline çizgi SVG (stroke 1.6–1.8, `currentColor`).
9. **Türkçe metin JS'de template literal içinde.** Görünür yeni metin `data-i18n` anahtarıyla; anahtarlar `tasarim/i18n/<sayfa>.json`'a.
10. **Animasyon yalnız `transform`/`opacity`/`background-position`**; `will-change` yazma. `prefers-reduced-motion: reduce` → tüm animasyon ve geçişler kapanır (ui.css sonunda tek kural).

---

## 1. Renk token'ları (`html:root`)

### Zemin ve yüzeyler
| Token | Değer | Kullanım |
|---|---|---|
| `--bg` | `#0b0b0e` | sayfa zemini; input zemini; tablo/ızgara kabı zemini |
| `--bg-sunk` | `#08080a` | footer zemini |
| `--bg-ink` | `#060609` | logo işareti kutusu, en koyu kuyu (osiloskop vb.) |
| `--bg-side` | `#09090b` | admin yan paneli |
| `--surface-0` | `#0f0f12` | büyük panel / kap (`.be-panel`), SSS kapalı öğe, ızgara başlık satırı |
| `--surface-block` | `#101013` | ana sayfa bant kutuları (eğitim bandı, forum bandı) |
| `--surface` | `#111114` | kart (`.card`) |
| `--surface-1` | `#121216` | açık durumdaki gün satırı vb. |
| `--surface-hi` | `#131317` | satır hover, bilgi kutusu, SSS açık öğe |
| `--surface-hi-2` | `#141418` | yan menü hover |
| `--surface-hover` | `#15151a` | kart hover zemini |
| `--surface-2` | `#17171c` | kontrol dolgusu (stepper düğmesi), skeleton tabanı |
| `--surface-3` | `#1a1a1f` | dolu çip zemini |
| `--surface-4` | `#1c1c22` | avatar zemini, seçili sekme (profil) |
| `--glass-header` | `rgba(11,11,14,.85)` | mobil başlık (+ `blur(14px)`) |
| `--glass-bar` | `rgba(20,20,24,.92)` | alt sekme çubuğu (+ `blur(16px)`) |
| `--glass-card` | `rgba(21,21,26,.85)` | yüzen rozet kartları (+ `blur(10px)`) |
| `--glass-strip` | `rgba(16,16,19,.9)` | ana sayfa bilgi şeridi (+ `blur(12px)`) |
| `--scrim` | `rgba(11,11,14,.97)` | mobil çekmece zemini |
| `--overlay` | `rgba(6,6,9,.78)` | modal arka planı |

### Çizgiler (hepsi beyaz alfa)
| Token | Değer | Kullanım |
|---|---|---|
| `--line-faint` | `rgba(255,255,255,.05)` | tablo satır arası |
| `--line-2` | `rgba(255,255,255,.06)` | iç ayırıcı (liste satırı) |
| `--line-div` | `rgba(255,255,255,.07)` | bölüm/başlık/footer ayırıcıları |
| `--line` | `rgba(255,255,255,.08)` | kart/panel kenarı (varsayılan) |
| `--line-3` | `rgba(255,255,255,.1)` | sekme çubuğu, cam kart |
| `--line-ctl` | `rgba(255,255,255,.12)` | input, dil anahtarı, ikon düğmesi, logo işareti |
| `--line-strong` | `rgba(255,255,255,.14)` | çip/sekme kenarı, menü düğmesi, dashed boş durum |
| `--line-hi` | `rgba(255,255,255,.25)` | radyo halkası |
| `--line-fg` | `rgba(243,239,230,.25)` | ghost düğme kenarı |
| `--grid-line` | `rgba(255,255,255,.035)` | `.be-grid-bg` 80px ızgara |

### Metin
| Token | Değer | Kontrast (#0b0b0e) | Kullanım |
|---|---|---|---|
| `--fg` | `#f3efe6` | 17.6 | başlık, birincil metin |
| `--fg-soft` | `#d7d1c6` | 13.3 | footer bağlantıları, italik alıntı, çip metni |
| `--fg-2` | `#b9b3a8` | 9.6 | gezinme bağlantıları, ikincil UI metni |
| `--fg-muted` | `#a8a29a` | 7.9 | paragraf / açıklama |
| `--fg-3` | `#8f897f` | 5.7 | etiket, meta, mono küçük başlık |
| `--fg-faint` | `#817b72` | 4.7 | en soluk küçük metin (tablo başlığı, ©, placeholder) |
| `--fg-deco` | `#6f6a62` | 3.7 | YALNIZ dekor / ≥18px |
| `--fg-off` | `#4a463f` | — | devre dışı hücre |

### Vurgu, ember, durum
| Token | Değer | Not |
|---|---|---|
| `--accent` | `#e8b84b` | altın; birincil düğme, aktif gezinme, etiket |
| `--accent-hover` | `#f6cf72` | bağlantı hover |
| `--accent-ink` | `#17120a` | altın zemin üstü yazı |
| `--accent-soft` | `rgba(232,184,75,.12)` | altın rozet zemini |
| `--accent-wash` | `rgba(232,184,75,.07)` | fiyat özeti / seçili satır zemini |
| `--accent-line` | `rgba(232,184,75,.35)` | altın kenar |
| `--accent-line-2` | `rgba(232,184,75,.5)` | güçlü altın kenar, dashed ekle düğmesi |
| `--accent-glow` | `rgba(232,184,75,.45)` | düğme hover gölgesi |
| `--ember-1/2/3` | `#b82d45` / `#d4722a` / `#e8b84b` | ember paleti |
| `--ember-rose` | `#c9485c` | eq çubuğu |
| `--ember-grad` | `linear-gradient(90deg,#b82d45,#d4722a,#e8b84b,#d4722a,#b82d45)` | `.be-ember` (200% genişlik, akar) |
| `--ember-text-grad` | `linear-gradient(90deg,#e0566b,#e8894a,#e8b84b,#e8894a,#e0566b)` | `.be-ember-text` |
| `--ember-steps` | `#b82d45 #c24a3a #d4722a #de9036 #e8a940 #e8b84b` | müfredat çubukları (`--step-1..6`) |
| `--ok` / `--ok-strong` | `#7fd99c` / `#5fc882` | başarı metni / nokta |
| `--ok-soft` / `--ok-line` | `rgba(95,200,130,.14)` / `rgba(95,200,130,.35)` | |
| `--err` / `--err-strong` | `#f08a9a` / `#e0566b` | hata metni / "* zorunlu", rozet dolgusu |
| `--err-soft` / `--err-line` | `rgba(224,86,107,.14)` / `rgba(224,86,107,.4)` | |
| `--err-wash` | `rgba(201,72,92,.08)` (kenar `rgba(201,72,92,.35)`) | uyarı kutusu (tek ders önceliği) |
| `--warn` / `--warn-soft` / `--warn-line` | `#e8894a` / `rgba(212,114,42,.16)` / `rgba(212,114,42,.5)` | tek ders, bekleyen, "Usta" |
| `--info` / `--info-soft` / `--info-line` | `#9fc6f0` / `rgba(90,170,255,.12)` / `rgba(90,170,255,.35)` | bilgi |
| `--violet` / `--violet-soft` | `#c9b8ee` / `rgba(185,167,224,.08)` | öğrenci notu |
| `--busy-bg` / `--busy-fg` | `#2a1a1d` / `#8a5a62` | dolu slot |
| `--closed-bg` | `repeating-linear-gradient(45deg,#1c1c21 0 4px,#111114 4px 8px)` | kapalı slot / gün |
| `--track` / `--track-2` / `--bar-muted` | `#2a2a31` / `#1f1f25` / `#3a3a42` | switch kapalı, ince ilerleme, pasif çubuk |

Eski adlar korunur ve yeni paletle eşlenir (sayfalar kırılmasın): `--black=--bg`, `--deep=--surface`, `--card=--surface`, `--panel=--surface-2`, `--white=--fg`, `--dim=--fg-muted`, `--faint=--fg-faint`, `--gold=--accent`, `--gold-ink=--accent-ink`, `--amber=--warn`, `--crimson=--err-strong`, `--ice=--info`, `--green=--ok`, `--purple=--violet`, `--mid=#2a2a31` (katı; Lab izleri), `--mid2=#1f1f25`. Yeni CSS eski adları KULLANMAZ.

---

## 2. Tipografi

Google Fonts linki (her sayfada aynı): `Instrument+Serif:ital@0;1` + `Instrument+Sans:wght@400;500;600;700` + `Space+Mono:wght@400;700`, `display=swap`.

| Token | Değer |
|---|---|
| `--ff` | 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif — gövde, UI |
| `--ff-disp` | 'Instrument Serif', Georgia, serif — başlıklar (400, `em` = italik + çoğu zaman altın) |
| `--ff-mono` | 'Space Mono', ui-monospace, Menlo, monospace — etiketler, sayılar, marka yazısı |

### Display ölçeği (serif, 400)
| Token | Masaüstü | Mobil (≤600) | satır / harf | Örnek |
|---|---|---|---|---|
| `--fs-hero` | 128px | 64px | .92 / -.02em | ana sayfa hero |
| `--fs-mega` | 112px | 72px | .9 / -.02em | "Berkay Er" |
| `--fs-cta` | 104px | 52px | .95 / -.02em | son çağrı |
| `--fs-display` (h1) | 88px | 52px | .92 / -.02em | sayfa başlığı (Ders rezervasyonu, Forum) |
| `--fs-section` | 76px | 44px | 1 / -.015em | bölüm başlığı ("Neden…") |
| `--fs-title` | 56px | 40px | 1.02 / -.01em | blok başlığı |
| `--fs-h2` (h2) | 40px | 32px | 1 / -.01em | panel başlığı ("Ders talebi oluştur") |
| `--fs-panel` | 32px | 28px | 1.05 | admin panel başlığı ("Gelen talepler") |
| `--fs-card` | 36px | 28px | 1.05 | kart serif başlığı |
| `--fs-quote` | 25px | 21px | 1.35 | yorum alıntısı |
| `--fs-stat` | 44px | 36px | 1 | istatistik rakamı (altın) |
Hepsi `clamp()` ile akışkan; mobil değere 600px'te, masaüstü değere 1440px'te ulaşır.

### Gövde / UI
| Token | Değer | Kullanım |
|---|---|---|
| `--fs-lead` | 20px (mobil 16) | h1 altı açıklama (500) |
| `--fs-body-lg` | 17px (mobil 15) | vitrin paragrafı, satır 1.65 |
| `--fs-body` | 15px | varsayılan gövde, satır 1.6 |
| `--fs-ui` | 14px | düğme, gezinme, form |
| `--fs-small` | 13px | açıklama, çip |
| `--fs-label` | 11px (mobil 10) | mono etiket, .14em, BÜYÜK HARF |
| `--fs-micro` | 10px (mobil 9) | mono mikro etiket |
| `--fs-input` | 15px (≤1024: 16px, iOS zoom koruması) | |
| h3 (sans) | 16px / 600 | kart başlığı ("Zoom linki") |

Harf aralığı: `--tr-display -.02em`, `--tr-label .14em`, `--tr-label-wide .16em`, `--tr-eyebrow .18em`, `--tr-brand .22em`, `--tr-mono .1em`.
Yardımcılar: `.be-serif`, `.be-mono`, `.be-italic` (serif italik), `.be-accent` (altın metin), `.be-outline-text` (içi boş serif, `-webkit-text-stroke:1px rgba(243,239,230,.35)`; `.be-outline-text--gold` 1.5px altın).

---

## 3. Radius, boşluk, gölge, katman

**Radius:** `--r-2 2px` (eq çubuğu) · `--r-6 6px` (skeleton, küçük rozet) · `--r-8 8px` (stepper iç düğme, takvim hücresi) · `--r-9 9px` (mobil logo) · `--r-10 10px` (logo, slot, ay oku, yan menü öğesi) · `--r-12 12px` (input) · `--r-14 14px` (bilgi kutusu, fiyat özeti) · `--r-16 16px` (ızgara kabı, iç kutu, boş durum) · `--r-18 18px` (SSS öğesi, mobil kart) · `--r-20 20px` (kart) · `--r-22 22px` (admin panel, sekme çubuğu) · `--r-24 24px` (büyük görsel, forum listesi, modal) · `--r-28 28px` (ana panel) · `--r-pill 999px` (tüm düğmeler, çip, sekme, dil anahtarı). Eski `--radius` = 12px.

**Boşluk:** `--s1 4` · `--s2 8` · `--s3 12` · `--s4 16` · `--s5 24` · `--s6 32` · `--s7 48` · `--s8 64` · `--s9 96`; ek: `--s-6px 6`, `--s-10 10`, `--s-14 14`, `--s-20 20`, `--s-28 28`, `--s-40 40`, `--s-56 56`, `--s-80 80`, `--s-120 120`.
Bölüm ritmi: masaüstü bölüm arası 120–140px (`--sec-gap`), mobil 48–56px. Kart iç boşluğu 28–40px (mobil 20–24). Izgara aralığı 12/16/20/24.

**Sayfa ızgarası:** tasarım 1440 genişlik, kenar `--page-x`: >1279px **64px**, 1025–1279 **40px**, 601–1024 **24px**, ≤600 **16px**. İçerik kabı `.be-wrap` (max-width `--page-max: 1440px`, ortalı, yan dolgu `--page-x`). Dar metin kabı `.be-wrap--narrow` (max 960px + dolgu).

**Kırılma noktaları:** `≤1024px` mobil kabuk (üst çubuk + çekmece + alt sekme çubuğu), `≤600px` telefon (tek sütun, mobil tipografi). 1025–1279 dar masaüstü (marka yazısı gizli, gezinme aralığı 20px). Başka kırılma noktası kullanma.

**Gölge:** `--shadow-card 0 30px 80px rgba(0,0,0,.6)` (plak) · `--shadow-lift 0 40px 100px -20px rgba(0,0,0,.8)` (görsel, modal) · `--shadow-glow 0 12px 32px -8px var(--accent-glow)` (birincil düğme hover) · `--shadow-pop 0 20px 60px -12px rgba(0,0,0,.7)` (açılır panel, toast).

**Katman:** `--z-tabbar 500` · `--z-fab 600` · `--z-drawer 650` · `--z-header 700` · `--z-pop 800` · `--z-modal 1000` · `--z-toast 1100` · `--z-progress 1200`. (Eski `--z-nav 500` korunur.)

**Hareket:** `--ease-out cubic-bezier(.2,.7,.2,1)` · `--dur-fast .2s` · `--dur .25s` · `--dur-slow .35s`. Hover: düğme `translateY(-2px)` + glow; kart `translateY(-6px)`, kenar `rgba(232,184,75,.45)`, zemin `--surface-hover`; bağlantı rengi `.2s`.

---

## 4. Animasyonlar (sınıf → keyframes)
| Sınıf | Etki | Süre |
|---|---|---|
| `.be-rv` (+ `.be-d1`…`.be-d6`) | aşağıdan giriş: opacity 0→1, translateY(28px→0; mobil 20px) | 1s `--ease-out` both; gecikme .08/.18/.3/.44/.6/.78s |
| `.be-ember` | ember degradesi akar (background-position) | 6s linear ∞ |
| `.be-ember-text` | degrade yazı akar | 8s linear ∞ |
| `.be-live` | 8px altın nokta + halka nabzı (`box-shadow`) | 1.8s ∞ (`.be-live--ok` yeşil, `--err` pembe) |
| `.be-drift` | radial ışık süzülür (translate+scale) | 14s ease-in-out ∞ (mobil 20px genlik) |
| `.be-bob` | yüzen kart salınır ±10px | 5s ∞ |
| `.be-spin` | plak döner | 14s linear ∞ (`--spin-dur` ile değişir) |
| `.be-marq` | yatay kayan şerit (içerik 2 kez yazılır) | 40s linear ∞ (mobil 26s) |
| `.be-eq` (`<i>` çocuklar) | ekolayzer çubukları scaleY | 1.2s / .9s / 1.5s / .7s karışık |
| `.be-grow` / `.be-grow-y` | scaleX / scaleY ile büyür | 1.4s both |
| `.be-playhead` | sol→sağ kayan çizgi (translateX; kap `--ph-w` genişliği) | 6s linear ∞ |
| `.be-pop-in` | seçimde küçük sıçrama | .35s |
| `.be-slide` | çekmece girişi translateY(-12px)+fade | .35s |
| `.be-sk` | skeleton parıltısı | 1.6s linear ∞ |
| `.be-bell-ring` | zil sallanması | .55s ×3 |
Hepsi `prefers-reduced-motion: reduce`'da kapalı. Ekran dışındaki `.be-marq/.be-spin/.be-drift/.be-eq` animasyonları kabuk tarafından duraklatılır (`.be-paused`).

---

## 5. Bileşenler ve sınıf adları

Önek: yeni bileşenler **`.be-*`**. Eski ortak sınıflar (`.btn`, `.input`, `.seg`, `.card`, `.badge`, `.modal`, `.toast`, `.ava`, `.table`…) yeni görünüme uyarlandı; aynı sınıfı kullanmaya devam et.

### 5.1 Düğmeler (hep pill)
| Sınıf | Görünüm |
|---|---|
| `.btn` | 44px, 0 20px, 14px/600, radius 999, gap 10, hover yukarı kalkar |
| `.btn-primary` | altın zemin `--accent`, yazı `--accent-ink`; hover glow |
| `.btn-light` | krem zemin `--fg`, yazı `--bg` ("Eğitim sayfasına git →", "Paketleri gör") |
| `.btn-ghost` | şeffaf, kenar `--line-fg`, yazı `--fg` ("Eğitmeni tanı") |
| `.btn-subtle` | şeffaf, kenar `--line-strong` (admin "Kaydet") |
| `.btn-danger` | kenar `--err-line`, yazı `--err`; hover `--err-soft` |
| `.btn-ok` | kenar `--ok-line`, yazı `--ok` |
| `.btn-dashed` | dashed `--accent-line-2`, yazı altın ("+ Yeni kampanya") |
| boy | `.btn-sm` 40px/13px · (varsayılan 44) · `.btn-lg` 52px/15px · `.btn-xl` 56px/16px · `.btn-2xl` 60px/17px |
| diğer | `.btn-icon` (kare=daire), `.btn-block`, `.btn-wrap` (çok satır), `.btn-link` (altın 600 metin "Lab'a git →") |
Ok işareti: `<span aria-hidden="true">→</span>`. Birincil + ghost ikilisi hero'da 56px, blok CTA'larda 52px, başlıkta 44px, mobil tam genişlik 54px (`.btn-lg` mobilde 54px'e çıkar).

### 5.2 Form
- `.input`, `.select`, `.textarea` — 48px, radius 12, zemin `--bg`, kenar `--line-ctl`, dolgu 0 16px, 15px; odak kenar `--accent` + halka `0 0 0 3px var(--accent-soft)`. Boylar: `.input-sm` 44px (admin), `.input-lg` 52px (talep formu). Mono değer: `.input-mono`.
- `.be-search` (label kabı) + içindeki `input` — pill 52px, sol 46px ikon boşluğu, zemin `--surface`; ikon `.be-search-icon`.
- `.field` (alan kabı, alt boşluk 16) · `.field-label` (altında 10px) (mono 11px .14em BÜYÜK, `--fg-muted`) · içinde `.req` ("* ZORUNLU", `--err-strong`) ve `.opt` ("(İSTEĞE BAĞLI)", `--fg-faint`) · `.field-help` (12px `--fg-3`) · `.field-error` (13px `--err`).
- Radyo satırı işareti `.be-radio` (20px halka, seçili 10px altın nokta; `[aria-checked=true]`/`:checked`).
- Onay kutusu: yerel `accent-color:var(--accent)`.
- Range: `accent-color:var(--accent)`.

### 5.3 Seçim grupları
- `.seg` + `.seg-btn` — radiogroup kapsül: kap 4px dolgu, zemin `--bg`, kenar `--line-3`; düğme 44px pill 14px/600; seçili (`.active`, `[aria-checked=true]`, `[aria-pressed=true]`) **krem** (`--fg` zemin, `--bg` yazı). `.seg--accent` → seçili **altın**. `.seg--sm` 34px (mobil başlık görünüm seçici).
- `.be-tabs` (role=tablist) + `.be-tab` (role=tab) — ayrık pill'ler 44px, kenar `--line-strong`, yazı `--fg-soft`; seçili (`[aria-selected=true]`/`.active`) krem dolgu; hover kenar `--accent-line-2`. Mobilde yatay kayar (`.be-tabs--scroll`).
- `.be-chip` — statik etiket pill (8px 14px, 13px, kenar `--line-strong`, yazı `--fg-soft`); `.be-chip--accent` (altın kenar+yazı), `.be-chip--fill` (zemin `--surface-3`, kenarsız), `.be-chip--link` (mono 11px 34px bağlantı). Hover dolan çip: `.be-chip--hover` (altın dolgu).
- `.lang-btn[data-lang]` — TR/EN (i18n.js `lang-active` verir).

### 5.4 Rozet / durum
`.badge` — mono 10px .1em BÜYÜK, 4px 8px, radius 999, zemin `--surface-3`, yazı `--fg-2`. Renk: `.ok`, `.err`, `.warn`, `.info`, `.accent`, `.violet` (yumuşak zemin + renkli yazı). `.badge-solid` altın dolu ("EN AVANTAJLI", radius 5). `.be-dot` 8px durum noktası (`--ok/--err/--accent`).

### 5.5 Kart ve paneller
| Sınıf | Görünüm |
|---|---|
| `.card` | `--surface`, kenar `--line`, radius 20, dolgu 28 (mobil 20) |
| `.card-hover` / `.be-card-link` | hover kalkma -6px + altın kenar + `--surface-hover` |
| `.be-panel` | `--surface-0`, kenar `--line`, radius 28, dolgu 40 (mobil 20/radius 20) — ana form kabı |
| `.be-panel--md` | radius 22, dolgu 24 (admin kutuları) |
| `.be-box` | `--bg` zeminli iç kutu, kenar `--line`, radius 16 (tablo/ızgara kabı) |
| `.be-callout` | `--surface-hi`, radius 16, dolgu 20 22, solda 36px ikon dairesi (`.be-callout-icon`) |
| `.be-callout--accent/--err/--ok/--info` | renkli wash zemin + kenar |
| `.be-ember-top` | kartın üstüne 3px ember şeridi (`::before`), `.be-ember-top--grow` büyüyerek gelir |
| `.be-stat` + `.be-stat-val` + `.be-stat-lbl` | serif altın rakam + mono etiket |
| `.card-title` | 16px/600 sans · `.be-panel-title` serif 32px · `.be-card-title` serif 36px |
| `.be-list-row` | satır: 44px avatar + içerik + eylem, dolgu 16, radius 16, zemin `--bg`, hover `--surface-hi` |

### 5.6 Etiketler / bölüm başlıkları
- `.be-label` — mono 12px .14em BÜYÜK altın. `.be-label--slash` başına `// ` ekler. `.be-label--muted` (`--fg-muted`), `.be-label--sm` (11px), `.be-label--xs` (10px, `--fg-3`).
- `.be-eyebrow` — mono 12px .18em `--fg-2`, soldaki `.be-live` noktasıyla ("ONLINE · BİREBİR · ABLETON LIVE 12").
- `.eyebrow` (eski) — aynı mono etiket + 24px altın çizgi.
- `.be-section-head` — başlık solda, açıklama sağda (flex, alta hizalı; mobilde alt alta).
- `.be-li` — altın 6px noktalı madde satırı.

### 5.7 Akordeon
`details.be-acc` > `summary.be-acc-sum` + `.be-acc-body`, ya da `div.be-acc` > `button.be-acc-btn[aria-expanded]` + `.be-acc-body[hidden]`. Öğe radius 18, zemin `--surface-0` (açık `--surface-hi`), kenar `--line`; başlık min 72px, 19px/500 (mobil 16px, min 60); sağda 36px daire artı ikonu `.be-acc-icon` açıkken 45° döner.

### 5.8 Toggle, stepper
- `.be-switch` (button role=switch aria-checked, ya da `input[type=checkbox].be-switch`) — 42×24, iz `--track` → açık `--accent`; topuz 18px `--fg-deco` → açık `--accent-ink`.
- `.be-stepper` > `.be-step-btn` (32×32 radius 8 `--surface-2`) + `.be-step-val` (mono 14px, min 76px). `.be-stepper--sm` 26/30px.

### 5.9 Tablo, ızgara
`.table-wrap` (radius 16, kenar `--line-div`, zemin `--bg`, yatay kayar) + `.table` (th mono 10px .12em `--fg-faint` 12px 16px; td 14px 12px 16px, üst çizgi `--line-faint`; satır hover `--surface-hi`). Grid tabanlı tablolar için `.be-grid-head` (aynı başlık tipi) ve `.be-grid-row`.

### 5.10 Modal, toast, açılır panel
- `.modal-overlay` (`--overlay` + blur 6px, z 1000) > `.modal` (radius 24, `--surface`, kenar `--line`, dolgu 32 (mobil 24), `--shadow-lift`, üstte 3px ember şeridi, giriş animasyonu). `.modal-sm` 400 · varsayılan 520 · `.modal-lg` 720. `.modal-title` serif 36px (mobil 30) · `.modal-eyebrow` mono altın etiket · `.modal-body` 14px `--fg-muted` · `.modal-actions` sağa yaslı pill'ler (≤600 dikey, birincil üstte) · `.modal-close` 40px daire (sağ üst).
- `.toast-wrap` altta ortalı (mobil sekme çubuğunun üstünde) > `.toast` (radius 14, `--glass-bar` + blur, kenar `--line-3`, 14px, `--shadow-pop`); `.toast.ok/.err/.info` sol 3px renkli şerit + renkli kenar; `.err` yazı `--err`.
- Açılır panel `.be-pop` (radius 18, `--surface`, kenar `--line`, `--shadow-pop`) — bildirim paneli bunu kullanır.

### 5.11 Boş durum, skeleton, avatar
- `.be-empty` — dashed `--line-strong` radius 16, ortalı, dolgu 28 20; `.be-empty-icon` (32px `--fg-3`), metin 14px `--fg-muted`.
- `.be-sk` — skeleton parıltısı (radius 6); `.be-sk--circle`, `.be-sk--pill`.
- `.ava` 36 · `.ava-sm` 28 · `.ava-md` 44 · `.ava-lg` 64 · `.ava-xl` 96 — daire, `--surface-4` zemin; `.ava-initial` altın dolgu + `--accent-ink` 700 baş harf; `.ava-ring` altın 1px halka.

### 5.12 Dekor
`.be-grid-bg` (80px ızgara) · `.be-glow` (radial ışık kabı: `--glow` rengiyle; `.be-glow--ember` turuncu→kırmızı, `.be-glow--rose`) · `.be-vinyl` (dönen plak; ortası `.be-vinyl-label` ember) · `.be-float` (cam yüzen kart) · `.be-marquee` (kayan tür şeridi kabı: üst/alt çizgi, serif 64px / mobil 34px; ayırıcı `.be-marq-star` altın ✦) · `.be-photo` (radius 24, kenar `--line-3`, alt degrade örtü `.be-photo-shade`).

---

## 6. Kabuk (tüm sayfalar)

### Masaüstü başlık (>1024px) — `.be-header`
88px, dolgu `0 var(--page-x)`, alt çizgi `--line-div`, akışta (yapışkan değil). Sol: `.be-brand` = `.be-mark` (40px kutu, radius 10, `--bg-ink`, kenar `--line-ctl`, üstte 4px ember şeridi, "BE" 15px/700 altın, -.5px) + `.be-brand-text` (mono 12px .22em "BERKAY ER ACADEMY"). Orta: `.be-nav` — Ana Sayfa · Eğitim · Eğitmen · Forum · Üyeler · Lab · SSS · Ders Paneli (14px/500, `--fg-2`, gap 28 — 1025–1279'da 14→20px akışkan; hover `--fg`; aktif altın: bu sayfa `aria-current="page"`, alt sayfada üst bölüm `aria-current="true"` — post/new-post → Forum, ders-ableton/ders-push3 → Eğitim, site_1 → Lab; çekmece ve sekme çubuğu da aynı). Sağ `.be-actions`: `.be-lang` (TR|EN mono kapsül; aktif krem) · `#authBar` (bildirim zili + profil) · `.be-cta` "Ücretsiz deneme" (44px altın pill → /booking; yalnız girişsiz ya da deneme adayında). Kişiye bağlı durumlar (`be-trial`, `be-love`) `love-nav.js`'ten gelir; kabuklu **tüm** sayfalar onu yükler (Firestore SDK'sı olmayan ders-ableton/ders-push3 son bilinen deneme durumunu `sessionStorage['be-trial:<uid>']`'den okur).
Auth bar görünümü: girişsiz = 44px halka içinde kişi ikonu (`.auth-sign-btn`, metni ekran okuyucuda kalır); girişli = `.notif-bell` 44px halka + `.auth-user-wrap` kapsül (36px avatar, fotoğraf yoksa altın baş harf, ad, çıkış ✕).

### Mobil (≤1024px)
- **Üst çubuk:** 64px, `position:sticky; top:0`, `--glass-header` + blur 14px, alt çizgi. Sol: 34px işaret (radius 9, 3px şerit) + mono 10px .2em sayfa etiketi ("EĞİTİM", "FORUM"; ana sayfada "BERKAY ER ACADEMY"). Geri varyantı: mono 11px "← FORUM". Sağ: `#authBar` (40px zil + avatar/giriş halkası) + 44px daire menü düğmesi (≡ ↔ ✕).
- **Çekmece** `#beDrawer.be-drawer`: üst çubuğun altından tam ekran (`--scrim`), dolgu 24 16; serif 38px bağlantılar (aktif altın), [Sevgim — özel hesaplar], altta TR/EN (40px pill) + "Profil" bağlantısı. Açılış `.be-slide`. Esc / bağlantı / menü düğmesi kapatır; odak içeride döner; kapanınca odak menü düğmesine döner; gövde kaydırması kilitli.
- **Alt sekme çubuğu** `.be-tabbar`: sol/sağ/alt 12px (+ güvenli alan), 68px, radius 22, `--glass-bar` + blur 16px, kenar `--line-3`; 5 sütun: Eğitim · Forum · Lab · Dersler (/booking; deneme adayında "Deneme") · Profil (girişliyse fotoğraf). İkon 20px + 10px etiket; aktif altın + `aria-current`. Gövdeye `padding-bottom` eklenir.
- **Footer** mobilde de görünür (tek sütun), sekme çubuğunun üstünde biter.

### Footer — `.be-footer`
- `data-be-footer="full"` (ana sayfa): `--bg-sunk`, üst çizgi, dolgu 56 64 40; sol marka + açıklama (14px `--fg-3`), sağ 3 sütun (AKADEMİ / TOPLULUK / TAKİP ET başlıkları mono 11px `--fg-faint`; bağlantılar 14px `--fg-soft`), alt satır mono 11px `--fg-faint` "© BERKAY ER ACADEMY · BERKAYERACADEMY.COM" + küçük `.be-eq`.
- `data-be-footer="compact"` (varsayılan): tek satır, dolgu 32 64, mono 11px: "© BERKAY ER ACADEMY" + sağda @ERBERKAY · @BERKAEL.OFC · SPOTIFY. `data-be-note="i18n_anahtarı"` sağ tarafı o metinle değiştirir (Lab: marka notu).

### WhatsApp FAB — `.wa-fab`
52px daire, `--surface`, kenar `--line-ctl`, `--shadow-pop`; hover kenar `--ok-line` + yeşil ikon. Masaüstü sağ/alt 24px; mobil sekme çubuğunun üstünde (alt `calc(92px + güvenli alan)`), sağ 16px. z `--z-fab` (çekmecenin altında).

---

## 7. Sayfa ajanları için

### 7.1 Kabuk nasıl çalışıyor
Her sayfada (love, app-bridge, migration hariç) yalnız iki yer tutucu var — kabuk ajanı koydu; **silme / yerini değiştirme**, yalnız öznitelik ayarlayabilirsin:
```html
<body>
<header class="be-header" id="beHeader" data-be-page="forum"><div id="authBar"></div></header>
… sayfa içeriği (tercihen <main id="…"> ile) …
<footer class="be-footer" id="beFooter" data-be-footer="compact"></footer>   <!-- eski .bottom-nav'ın yerinde; sayfa betiklerinden önce/sonra olabilir -->
```
`theme-init.js` (head'de) başlık ayrıştırılır ayrıştırılmaz masaüstü başlığını + mobil üst çubuğu kurar; DOM hazır olunca çekmeceyi (`#beDrawer`, başlığın hemen ardında), alt sekme çubuğunu (`.be-tabbar`, body sonunda), footer'ı ve "İçeriğe geç" bağlantısını (hedef: ilk `<main>`, yoksa başlıktan sonraki ilk öğe; id yoksa `beMain` verilir) üretir. Menü tanımı tek yerde (`NAV`/`TABS` dizileri).

`#authBar`'ı sayfanın kendi `updateAuthBar(user)`'ı eskisi gibi doldurur (`.auth-sign-btn` / `.notif-bell-wrap` + `.auth-user-wrap` > `img.auth-avatar` + `.auth-name` + `.auth-out-btn`). Kabuk: onu başlığın eylem alanına taşır; fotoğrafsız kullanıcıya altın baş harf avatarı ekler; zil glifini çizgi ikona, çıkış metnini ✕ ikonuna çevirir (metin `aria-label`'a gider); `aria-expanded`'ı paneli izleyerek günceller; girişli/çıkışlı durumu `html.be-authed` ile yansıtır; alt sekmedeki Profil ikonuna fotoğrafı koyar. Mobilde başlıkta yalnız zil + avatar görünür, **çıkış çekmecenin altındaki "Çıkış Yap" düğmesindedir** (sayfanın gizli çıkış düğmesini tıklar). Başlıktaki giriş düğmesi kişi ikonlu halka; sayfa içindeki `.auth-sign-btn`'ler (ör. yorum formu) metinli pill kalır.

**Başlık öznitelikleri (`#beHeader`) — şu an sayfalardaki değerler:**
| Sayfa | Öznitelikler | Footer |
|---|---|---|
| index | `data-be-page="index"` | `full` |
| egitim, egitmen, sss, forum, booking | `data-be-page="<ad>"` | `compact` |
| members | `data-be-page="members" data-be-back="/forum" data-be-back-label="nav_forum"` | `compact` |
| post, new-post | `data-be-page="post|new-post" data-be-back="/forum" data-be-back-label="nav_forum" data-be-tabs="off"` | yok |
| profile | `data-be-page="profile"` | yok |
| ableton-lab | `data-be-page="ableton-lab"` | `compact` + `data-be-note="be_ft_trademark"` |
| ders-ableton | `data-be-page="ders-ableton" data-be-back="/egitim" data-be-back-label="nav_egitim" data-be-tabs="off"` | `compact` |
| ders-push3 | aynı (ders-push3) | yok (sayfanın kendi alt bilgisi var) |
| site_1 (yetim) | `data-be-page="site_1"` | `compact` |
Diğer öznitelikler: `data-be-label="i18n_anahtarı"` (mobil etiketi değiştir), `data-be-cta="off"` (başlıkta "Ücretsiz deneme" olmasın). Footer istemeyen sayfa `#beFooter`'ı kaldırır; isteyen ekler.

**Başlığa sayfa eylemi** (Push3 görünüm seçici, YeniKonu "Yayınla", KonuDetay "Paylaş", Admin "ADMİN" rozeti…): `#beHeader` içine `<div data-be-slot class="be-slot--mobile">…</div>` (yalnız mobil) / `be-slot--desktop` / sınıfsız (ikisi) koy → kabuk `#authBar`'ın soluna taşır.

**JS API `window.beShell`:** `hide('header'|'tabs'|'footer')` / `show(...)` (ör. AdminPaneli tasarımı kendi yan paneliyle başlıksız: `beShell.hide('header')`), `setLabel(metin)` (mobil etiket), `refresh()`, `closeDrawer()`, `t(anahtar)`, `observeAnim(kök)` (sonradan eklenen `.be-marq/.be-spin/.be-drift/.be-eq/.be-playhead/.be-bob` ekran dışında duraklasın).
**`<html>` durum sınıfları:** `be-js`, `be-authed`, `be-trial` (deneme adayı — love-nav; "Ders Paneli"→"Deneme Dersi", sekme "Dersler"→"Deneme", CTA görünür), `be-love` (özel hesap — Sevgim bağlantıları), `be-has-tabs`, `be-drawer-open`, `be-hide-*`, `font-clear`.

### 7.2 Yerleşim kuralları
- Başlık akışta (masaüstü statik 88px, mobil `sticky` 64px). İçeriği **ofsetleme**: `--topbar-h:0`, `--nav-w:0` (eski `calc(var(--topbar-h) + X)` kalıpları X'e indi — kendi sayfanda temizle). Yapışkan öğe: `top:var(--be-sticky-top)` (mobil 64, masaüstü 0) + `z-index` < `--z-header`. Tam ekran kutu: `height:calc(100dvh - var(--be-header-h))`.
- Kenar: `.be-wrap` ya da `padding-inline:var(--page-x)` (64/40/24/16). Bölüm arası `var(--sec-gap)`.
- Mobil sekme çubuğu için gövde alt dolgusu kabuktan (`html.be-has-tabs body`); sabit öğeleri mobilde `bottom:max(16px, var(--be-tabbar-space))` ile yerleştir (`.wa-fab`, `.chat-mobile-btn` öyle; `.toast-wrap` `calc(24px + …)`). Sekmesiz sayfada (`data-be-tabs="off"`, `beShell.hide('tabs')`) `--be-tabbar-space` 0'dır.
- `body`'ye yan dolgu VERME (başlık/footer tam genişlik kalmalı); yan boşluk içerik kabında (`.be-wrap` / `padding-inline:var(--page-x)`).
- Global: `:where(a)` varsayılan altın (özgüllük 0 — kendi sınıfın ezer); `style.css` yükleyen vitrin sayfalarında `a { color:inherit }`. `html [hidden] { display:none }` (0,1,1).
- Eski alias sınıfları (`.btn-gold`, `.cat-chip`, `.req-approve`…) pill ölçeğine bağlı; yeni markup'ta doğrudan `.btn …` ve `.be-*` kullan.

### 7.3 Kabuk ajanının sayfalarda yaptığı (içerik dışı) değişiklikler
- Kaldırılan: `.left-nav`, `.bottom-nav`, `.topnav`, `#homeLogo`, `.mobile-lang-toggle`, içerik içi eski `.footer` ("Berkay Er · Producer / Aktif Karakter"), bottom-nav/left-nav senkron betikleri, egitim/booking'deki sayfa içi `.wa-fab` `<style>`'ı (stil `ui.css`'te; `data-be-aria="be_wa_fab"` eklendi). Sayfa JS'indeki `bnavAdminItem/bnavProfileAv` referansları null-güvenli olduğundan olduğu gibi duruyor (artık no-op) — temizleyebilirsin.
- Sayfa CSS'inde ölü kalanlar (temizle): `.topnav*`, `html.theme-light …` (egitim), push3'ün `#authBar` yorumları.
- `love-nav.js` artık egitim, egitmen, sss, ableton-lab, ders-ableton, ders-push3, site_1'de de yüklü (Firebase SDK etiketlerinin hemen ardında).
- `ders-ableton.html`: `body`'deki yan dolgu `.lesson-wrap`'e taşındı (`width:calc(100% - 2*var(--page-x))`, alt boşluk `--s8`) — başlık artık tam genişlik.
- "İçeriğe geç" hedefi: ilk `<main>`; yoksa başlıktan sonraki ilk akış içi, görünür öğe (sabit `#scrollProgress` gibi öğeler atlanır). Sayfana `<main>` koyarsan hedef o olur.
- Geçici uyum yamaları: `ableton-lab.html` `#moduleNav` fixed → `sticky; top:var(--be-sticky-top)` + `.container` üst dolgusu; `ders-push3.html` `--p3-shell-bottom: var(--be-header-h)` (menü/oyun kutuları başlık kadar kısalır), taskbar'daki 200px authBar boşluğu kaldırıldı.
- `app-bridge.html`, `migration.html`: yalnız font + `ui.css` + token'lı küçük stil (kabuk yok). `love.html`: dokunulmadı (Sevgim tasarımında ortak kabuk yok; sayfa ajanı `ui.css` + tasarımdaki "← GERİ" başlığını kendisi kurar).
- Ortak damga `?v=202609261900` (Temel); Metin birleştirmede tüm sayfalarda `?v=202609271200`'e çekildi. Instrument Sans linkine 700 eklendi.

### 7.4 Dokunma
- `theme-init.js`, `themes.css`, `love-nav.js`, `auth-ui.js`, `ui.css`'e sayfa kuralı ekleme; eksik kabuk davranışı/bileşeni görürsen raporla. Sayfa CSS'i sayfanın `<style>`'ında.
- `#authBar` içeriğinin sınıf adlarını (`auth-*`, `notif-*`) değiştirme; kabuk CSS'i ve geliştirici betiği bunlara bağlı.
- Profil sayfasındaki tema (Koyu/Açık) kontrolünü kaldır (tema yok); "Font Netleştir" (`site-font-clear` → `html.font-clear`) kalır.
- `assets/js/push3/*` ve push3 `?v=` damgaları (P3.K.V) değişmez.
- Yeni metin anahtarlarını `tasarim/i18n/<sayfa>.json`'a yaz; kabuk anahtarları `tasarim/i18n/kabuk.json`'da (theme-init'te TR/EN yedeği var).
- Metin birleştirme yapıldı (2026-09-28): tüm `tasarim/i18n/*.json` anahtarları `assets/js/i18n.js`'te, sayfa başına bir bölüm halinde. Bundan sonra değişen/yeni metin i18n.js'in ilgili bölümüne (TR + EN) ve sayfanın yerel yedek tablosuna (varsa) birlikte yazılır.
- Doğrulama: `tasarim/harness` (`node shot.mjs --path /forum --state student --w 390 --h 844 --mobile --out …`). Kabuk ekran görüntüleri: `tasarim/shots/kabuk/`.
