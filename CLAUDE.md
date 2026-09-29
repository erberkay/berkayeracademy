# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deploy

After any HTML/CSS/JS change, deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

For Cloud Functions changes:
```bash
firebase deploy --only functions
```

For Firestore rules changes:
```bash
firebase deploy --only firestore:rules
```

`git push` only updates GitHub — Firebase Hosting is a separate deploy step. The `releaseLimit: 5` cap in `firebase.json` means very old hosting releases get auto-pruned.

## Cloud Functions Development

```bash
cd functions
npm run lint          # ESLint (runs automatically on deploy)
npm run serve         # Local emulator
npm run logs          # Tail live function logs
```

Functions are Node 24, firebase-functions v2, deployed to `europe-west1`. All callable functions must be invoked from the browser with the region specified:
```js
firebase.app().functions('europe-west1').httpsCallable('functionName')
```

Sensitive credentials are stored in `functions/.env.ableton-tutorial` (gitignored). Access via `process.env.*` — do **not** use Firebase Secret Manager (had newline corruption issues with `echo` piping; if you must use it, pipe with `printf '%s'`).

Env vars in use: `GMAIL_PASS`, `Z_ACCOUNT_ID` / `Z_CLIENT_ID` / `Z_CLIENT_SECRET` (Zoom OAuth), `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WA_FROM`, `WA_ADMIN_NUMBER`.

### Function inventory (`functions/index.js`)

**Scheduled (cron, Europe/Istanbul):**
- `paymentReminder` — daily 06:00, emails students with unpaid lessons
- `lessonReminder24h` — daily 06:00, WhatsApp + email 24h ahead
- `lessonReminder1h` — hourly at :00, WhatsApp 1h ahead
- `lessonEndFollowUp` — hourly at :05, WhatsApp follow-up after the lesson that just ended (uses `TEMPLATES.lesson_completed` if its HX SID is filled in `whatsapp.js`; until then falls back to freeform, which only delivers inside the 24h conversation window)

**Triggered (Firestore docs):**
- `notifyAdminOnNewRequest` — new `lesson_requests/*`
- `notifyStudentOnRequestStatus` — `lesson_requests/*` status change

**Callable (`onCall`):**
- `sendPaymentRemindersManual`, `sendCustomEmail`, `sendWelcomeEmail`, `sendPromoEmailAll`, `sendPromoEmailSingle` — email blasts (admin)
- `createZoomMeeting` — admin only, writes `settings/global.zoom_link`
- `sendWhatsAppMessage`, `sendWhatsAppAdmin` — WhatsApp send (template or freeform)
- `markWhatsAppConvoRead` — clears unread count on admin panel
- `studentSelfReschedule` — öğrencinin ders saatini onaysız değiştirmesi (kurallar aşağıda "Reservation update rules"); Admin SDK ile transaction içinde yazar, sonra admine WhatsApp + e-posta atar

**HTTP:**
- `twilioWhatsAppWebhook` — Twilio inbound webhook (URL set in Twilio console). Signature validation logs mismatches but does not reject (Cloud Functions v2 URL reconstruction can mismatch).

## Twilio WhatsApp Integration

Number: **+1 405 851 4568** (Twilio-as-ISV registered sender).

Helper: `functions/whatsapp.js` exports `sendWhatsApp`, `sendWhatsAppTemplate`, `toWaNumber`, `TEMPLATES`. Phone normalization assumes Turkish numbers (`+90`); `toWaNumber` rejects anything not matching `90XXXXXXXXXX`.

Content template SIDs (Meta-approved) live in `TEMPLATES`:
- `lesson_reminder_24h`, `lesson_reminder_1h`, `payment_reminder`, `request_status`

Free-form messages only work inside Twilio's 24h conversation window. Outside that window, you must use a `ContentSid` template.

Conversations are persisted to Firestore at `whatsapp_conversations/{phone}` with `messages/` subcollection. The admin chat panel is embedded inside `booking.html`.

## Architecture

**No build step.** All pages are static HTML files served directly by Firebase Hosting. Firebase compat SDK v10.12.2 is loaded via CDN `<script>` tags inside each HTML file.

**Clean URLs:** `firebase.json` has `cleanUrls: true`. Each page has a redirect script in `<head>` to canonicalize `.html` → clean URL. All internal `href` and `location.href` use clean URLs (no `.html`).

**Admin check:** Admin is identified by email `berkayer032@gmail.com`. Client-side pages compare `user.email === ADMIN_EMAIL`. Firestore rules use `request.auth.token.email == "berkayer032@gmail.com"` (server-side JWT, not bypassable).

## Shared assets

Design source of truth: **`docs/tasarim/TASARIM.md`** (Claude Design canvas → tokens, colour/type/radius scales, animations, components and their class names, the shell and the page-agent rules; not published — `**/*.md` is ignored by hosting). The site is **dark-only** — the light theme and the theme switch are gone (`localStorage['site-theme']` is ignored; `html.theme-light` has no CSS).

Loaded by most pages via `<script src="/assets/js/X.js">` and `<link href="/assets/css/X.css">`. Order in every `<head>`: Google Fonts (Instrument Serif ital 0/1 · Instrument Sans 400–700 · Space Mono 400/700) → `ui.css` → [`style.css`] → `theme-init.js` → `themes.css` → [`auth-ui.js`] → page `<style>`. Shared stamp `?v=202609271200` (on every `assets/css|js` tag except `push3/*`, incl. `placement-quiz.js`) — bump it on **all** pages in the same commit when a shared asset changes (push3 script stamps are separate, see Push 3 Lab).

- `assets/css/ui.css` — **design system** (every page). Tokens on `html:root`: surfaces `--bg #0b0b0e / --surface-0 / --surface / --surface-hi / --surface-2…4 / --bg-sunk`, lines `--line-2 / --line-div / --line / --line-ctl / --line-strong` (white alpha), text `--fg #f3efe6 / --fg-soft / --fg-2 / --fg-muted / --fg-3 / --fg-faint` (`--fg-deco #6f6a62` is decorative only — below 4.5:1), accent `--accent #e8b84b` (+`-hover/-ink/-soft/-wash/-line`), ember `--ember-grad`, status `--ok/--err/--warn/--info/--violet` (+`-soft/-line`), type (`--ff/--ff-disp/--ff-mono`, fluid display scale `--fs-hero…--fs-card`, `--fs-body/ui/small/label/micro`), controls `--ctl-sm/md/lg/xl` = 40/44/52/56px, radius `--r-6…--r-28 / --r-pill`, spacing `--s1..--s9` + extras, page grid `--page-x` (64 / 40 / 24 / 16px) and `--page-max 1440px`, shell geometry `--be-header-h / --be-sticky-top / --be-tabbar-space`, shadows, easing, z-index. Legacy names (`--black --deep --gold --dim --faint --mid…`) are mapped onto the new palette for old page CSS; new CSS never uses them. `--topbar-h` and `--nav-w` are **0** (the header is in the flow). Components: pill `.btn` (+`-primary/-light/-ghost/-subtle/-danger/-ok/-dashed`, `-sm/-lg/-xl/-2xl/-icon/-block/-link`), `.input/.select/.textarea` (+`-sm/-lg/-mono`), `.field/.field-label/.field-help`, `.be-search`, `.seg/.seg-btn`, `.be-tabs/.be-tab`, `.be-chip`, `.badge`, `.card`, `.be-panel`, `.be-callout`, `.be-acc` (accordion), `.be-switch`, `.be-stepper`, `.table-wrap/.table`, `.modal*`, `.toast`, `.be-empty`, `.be-sk`, `.ava*`, `.icon`, labels `.be-label/.be-eyebrow`, motion utilities `.be-rv .be-d1-6 .be-ember .be-ember-text .be-live .be-drift .be-spin .be-marq .be-eq .be-grow…`. Alias groups map legacy per-page button/input classes onto the pill scale — a page must not redeclare geometry for an aliased class. Selectors that must beat page CSS are `html`-prefixed (0,1,1). Breakpoints: **≤1024** (mobile shell) and **≤600** (phone); 1025–1279 is the narrow desktop.
- `assets/css/style.css` — landing-page components (index, egitim, egitmen, sss) in the new look. App pages do **not** load it.
- `assets/css/themes.css` — the shell: desktop header (`.be-header`, `.be-brand/.be-mark`, `.be-nav`, `.be-actions`, `.be-lang`, `.be-cta`), mobile top bar + full-screen drawer (`.be-drawer`) + floating tab bar (`.be-tabbar`), footer (`.be-footer`, full/compact), the auth bar + notification panel look, the sign-in modal (`.be-auth`), "Font Netleştir" (`html.font-clear`). No `!important` (the old temporary Lab block is gone; `site_1.html` carries its own module CSS). Header fitting at ≥1280: `.be-header.be-fit-1` hides the brand text, `.be-fit-2` also hides the user's name and tightens the gaps (classes set by `theme-init.js`; 1025–1279 is handled by the narrow-desktop media block). On pages with the WhatsApp FAB (`body > .wa-fab`) the footer keeps its right side clear of it.
- `assets/js/theme-init.js` — builds the whole shell from two placeholders every page carries: `<header class="be-header" id="beHeader" data-be-page="…"><div id="authBar"></div></header>` (first thing in `<body>`) and `<footer class="be-footer" id="beFooter" data-be-footer="full|compact">`. Header attributes: `data-be-page` (active nav/tab), `data-be-label`, `data-be-back` + `data-be-back-label` (mobile "← X"), `data-be-tabs="off"`, `data-be-cta="off"`; footer `data-be-note`. `[data-be-slot]` children of the header move into its action area. Each page still fills `#authBar` itself (`updateAuthBar`); the shell only places and completes it (initial avatar, bell icon, aria). API `window.beShell` (`hide/show('header'|'tabs'|'footer')`, `setLabel`, `refresh`, `closeDrawer`, `t`, `observeAnim`). State classes on `<html>`: `be-js be-authed be-trial be-drawer-open be-has-tabs` (+ `be-auth-guess` while auth is unresolved). The header is hidden until built only when JS runs (`html.be-js`); static fallback links placed inside `#beHeader` / `#beFooter` (e.g. `<nav class="be-nav">…</nav>` for JS-less visitors and crawlers) are shown without JS and replaced when the shell builds. Header fit: `fitHeader()` runs on resize, font load, auth/lang/trial change and adds `be-fit-1/2` when the actions would cross the right padding. Auth bar: the visible avatar (photo or initial) is the keyboard profile link (`role=link`, `be_open_profile`; page `onclick` → else `/profile`), the name is mouse-only; nameless `.notif-del-btn` get `prof_notif_del`. Load-time hints in `localStorage` (no personal data): `be-auth` ('1'/'0', last auth state → CTA hidden while a returning signed-in user resolves), `be-auth-w:<page>` (last `#authBar` width on that page, reserved while pending so the nav does not shift), `be-trial-last` (written by `trial-nav.js`). Shell strings are the `be_*` keys (+ `nav_*`, `ui_signout`, `ui_notifications`) in `i18n.js`; `theme-init.js` keeps the same TR/EN pairs in its own fallback table `T` — change both together.
- `assets/js/i18n.js` — the single string table `T` (`key: { tr, en }`) + attribute swapping: `data-i18n` (textContent), `data-i18n-html` (innerHTML — only for keys whose value carries markup), `data-i18n-ph` (placeholder). `window._i18n` = `{ t, setLang, getLang, apply }`; `t(key)` returns the **key itself** when it is missing, so `_i18n.t('x') || 'fallback'` never falls back — add the key. Language in `localStorage['_lang']` (`tr` | `en`). `T` is grouped by page: the older sections at the top, then one section per redesigned page (`be_*` shell, `idx2_*` index, `egt_*` egitim (unchanged texts keep their old `eg_*` keys), `eg_*` egitmen, `sss_*`, `forum_*`, `post_*`, `np_*` new-post, `mem_*` members, `prof_*` profile, `lab_*` Ableton Lab + site_1, `da_*` ders-ableton, `p3_mode_*`/`p3_*` ders-push3, `bks_*`/`bk_*` booking student side, `adm_*` booking admin). Several pages keep a local TR/EN fallback for their own keys (theme-init `T`, forum `FB`/`L()`, post `L(key, tr, en)`, new-post `NP_T`, members `L`/`tt()`, sss `FB`, ders-ableton `FB`, ableton-lab `LAB_TXT`/`L()` — which also handles `data-i18n-aria` —, site_1 `tt()`, booking `bkT/ptT/pkgT(key, trFallback)`); i18n.js wins whenever it has the key, so a new/changed string goes into i18n.js (TR + EN) and into that fallback. Keys built at runtime — `prof_title_<ünvan>`, `mem_<ünvan>`, `bk_pkg_name_<paket id>`, `lab_mod_<n>`/`lab_cat_<n>` — look unused to grep; don't delete them.
- `assets/js/trial-nav.js` — sets `html.be-trial` (no non-cancelled lesson yet → "Deneme Dersi"/"Deneme" labels + trial CTA); it never renders the nav. Every page with the shell loads it right after the Firebase SDK tags; pages without the Firestore SDK (ders-ableton, ders-push3) reuse the last known trial state from `sessionStorage['be-trial:<uid>']`.
- `assets/js/placement-quiz.js` — seviye belirleme sınavının soru bankası + puanlama (`window.bkQuiz`). Sadece `booking.html` yükler. Soruları/eşikleri değiştirmek için tek düzenlenecek yer burası; soru seti değişirse dosyadaki `VERSION` artırılır.
- `assets/js/auth-ui.js` — shared sign-in modal (Google + e-posta/şifre: giriş, kayıt, şifre sıfırlama), exposed as `window.bkAuth` (`openLogin`, `signInGoogle`, `handleRedirectResult`, `isEmbeddedBrowser`, `errorMessage`). Plain `<script>` in `<head>` before the Firebase SDK — it only calls `firebase.auth()` lazily. Every page with a sign-in button loads it (not `app-bridge.html`).
- `assets/img/icons.svg` — icon sprite: `<svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#i-NAME"/></svg>`. UI chrome uses these (or inline line SVGs), never emoji.

Rules for page CSS (replaces the old flat rules): tokens only; radius from the `--r-*` scale; gradients (`--ember-grad`, radial glows) and `backdrop-filter` are allowed; `!important` only inside `prefers-reduced-motion`; animate `transform`/`opacity` only and let `ui.css` switch everything off for reduced motion; text below 18px needs ≥4.5:1 (use `--fg-faint`, not `#6f6a62`); touch targets ≥44px; inline `style=""` only for runtime state; never pad `body` sideways (the header/footer must stay full-width — pad the content wrapper). When changing the shell, edit `theme-init.js` / `themes.css` once instead of each page.

## Critical: Cross-Script Variable Sharing

`<script type="module">` isolates all declarations from other `<script>` blocks. When variables or functions must be shared across multiple script blocks on the same page, **do not use `type="module"`** — use plain `<script>` and `var` (not `let`/`const`).

Many pages still have `type="module"` on some script blocks. Before adding shared state, verify the target script block is a plain `<script>`. Also: an unescaped apostrophe inside a single-quoted JS string (e.g. `'Wet'i'`) silently breaks the whole module. Prefer template literals for any Turkish UI strings.

## Firestore Collections

| Collection | Notes |
|---|---|
| `forum` | Posts; subcollection `replies` |
| `users` | Profiles; subcollections `beats`, `presets`, `userReplies` |
| `reservations/{uid}` | Per-student lesson schedule (admin-managed) — see "Reservation update rules" below |
| `booked_slots` | Student-booked trial-lesson slots |
| `lesson_requests` | Initial lesson request submissions |
| `lesson_questions/{qId}/answers` | Q&A threads, admin or student replies |
| `settings/global` | Site-wide settings (e.g. `zoom_link`) |
| `settings/campaigns` | Kampanyalı paketler `{items:[{id,name,months,weekly,discount,active,best}], updated_at}` (admin yazar, girişli okur). Yoksa/boşsa `PACKAGES` varsayılanı. |
| `notifications/{uid}/items` | Per-user notifications |
| `chats/{chatId}/messages` | DM threads (chatId = sorted uid pair). Collab requests use `type: 'collab_request'` with status update flow. |
| `whatsapp_conversations/{phone}/messages` | Twilio inbound + outbound persisted (admin-only read/write) |
| `access_codes` | Booking panel access codes |
| `booking_access_requests/{uid}` | Trial-lesson request queue |
| `announcements` | Site-wide announcements (admin write, auth read) |
| `testimonials` | Student testimonials (public read, auth create) |
| `app_bridge` | UUID-keyed cross-app data bridge (publicly readable) |
| `placement_tests/{uid}` | Seviye belirleme sınavı sonucu (skor, seviye, cevaplar). Öğrenci bir kez `create` eder ve sadece kendi dokümanını okur; admin hepsini okur, sıfırlamak için siler. |
| `userSettings/{uid}` | Per-user preferences |
| `follows` | Profile follow edges |

### Reservation update rules

`reservations/{uid}` is mostly admin-write. Students can `update` only a narrow set of fields (`firestore.rules:136-149`):
- `note` (anytime)
- `payment_pending` (set to `true` only)
- `rules_accepted_at` (write-once: must not already exist)

Lesson rows themselves are **always admin-only**. If the client tries to modify any other field, the rule will reject the write.

**Kendin değiştir (onaysız saat değişikliği):** panelin üstündeki **"Derslerim · Bu hafta"** bloğu (`section#derslerim`, DersPaneli tasarımı; `bkWkRender()` kartlar + geri sayım, `bkWkBuildPicker()` 7×24 seçici — masaüstünde satır içi, ≤1024'te alt sayfa, `bkScCellState()` hücre durumu, `bkWkOpenFor()`/`bkWkGoTo()` ana listeden açar; ana listede bu haftanın satırları "Saat değiştir ↑", sonraki haftalar "Saati değiştir" ile aynı seçiciyi açar; `/booking#derslerim` bloğa kaydırır) `studentSelfReschedule` callable'ını çağırır; kurallar sunucuda uygulanır, `bkSelfReschedControl()` ile blok aynılarını gösterir (sunucuyu değiştirirsen ikisini de güncelle): dersine en az 5 saat olmalı ve yeni saat de en az 5 saat sonra; yeni saat dersin olduğu hafta (Pzt–Paz) içinde; her ders bir kez (`lessons[i].self_changed`, eski saat `self_changed_from`); erteleme hakkı düşmez; ödemesi onaylanmamış planda kapalı (deneme dersi hariç); kapalı gün/saat ve dolu saatler seçilemez (60 dk ders + 30 dk ara, `booked_slots`). Dersin durumu `scheduled`/`rescheduled` kalır; eski `booked_slots` silinip yenisi yazılır. Bekleyen erteleme talebi olan derste kapalı. Saatler İstanbul saati (UTC+3) ile hesaplanır.

Because of this, the student "↺ Ertele" button does **not** write lessons directly — it creates a `lesson_requests` doc with `type: 'reschedule_request'` (fields: `lesson_date`, `lesson_time`, `new_date`, `from_*`). Admin approves it in "Gelen Talepler", which runs `adminRescheduleLesson` (cascade + credit consumption) and sets the request `accepted` — the existing `notifyStudentOnRequestStatus` trigger then WhatsApps the student.

## Booking domain model (high level)

- **Pricing:** list price per lesson hour **2500 TL**, single one-off **3000 TL**, trial **0 TL** (`LESSON_PRICE` / `LESSON_PRICE_SINGLE` / `LESSON_PRICE_TRIAL` in `booking.html`).
- **Campaigns:** the packages a student sees come from `settings/campaigns` (`loadCampaigns()` → `campaignsFromDoc()` → `setCampaigns()`); `PACKAGES` is the fallback when the doc is missing/empty/invalid. Only `active !== false` items are offered (`activePackages()`); `findPackage()` looks in the campaign list, then in `PACKAGES` (display of older requests/reservations). Price/validation use the same helpers below. While a campaign list exists it is canonical for pricing: `requestPackageCheck()` returns `reason:'inactive'` (campaign switched off) or `'removed'` (default package no longer listed) → the admin request row warns and `acceptRequest` writes the list price. The admin panel loads campaigns before rendering request rows and re-reads them on every accept.
- **Campaign editor (admin, "Kampanyalar"):** edits a local draft of the list (inactive ones included; `PACKAGES` when the doc is missing), then "Kampanyaları yayınla" writes `settings/campaigns` = `{items: campaignItemsForSave(draft), updated_at}` (normalized, duplicate/invalid ids dropped, max `CAMP_MAX_ITEMS`, one `best`). Total hours = months × 4 × weekly; the editor limits weekly to 1–2 (`CAMP_EDIT_WEEKLY_MAX`) and discount to 0–90. New campaigns get an id `'k' + base36(timestamp)` (`newCampaignId`) — never derived from the name, so renaming keeps pending requests attached. Publishing warns when pending requests use a campaign that is being removed/deactivated. Hourly list prices (`LESSON_PRICE`, `LESSON_PRICE_SINGLE`) are constants shown read-only in the panel.
- **Packages (discounts):** `PACKAGES` in `booking.html` is the default list — `{id, name, months, weekly, discount, best?}` for Başlangıç 1×1 %0, Devamlılık 2×1 %8, Gelişim 3×1 %10, Yoğun 2×2 %15, Profesyonel 3×2 %20. `packagePrice()` derives `hours = months×4×weekly`, `list = hours×LESSON_PRICE`, `save`, `total`, `perHour`; the package table, summary strip, price estimate and the "Tek Ders" upsell (`renderSingleUpsell()`) are all rendered from it — never type package figures into markup. The monthly tab is a package picker (`#pkgTable`, radiogroup); the student must pick exactly `weekly` time slots in the grid (`packageSlotStatus()`). These pure helpers live between the `// ─── Fiyatlar + paket indirimleri` markers (no DOM/Firestore there, so they can be tested as text).
- **Package price flow:** the request stores `package_*` fields for display only. `acceptRequest` re-validates with `requestPackageCheck()` (duration, `schedule.length === weekly`, 4 lessons/month) and writes `reservationPriceFields()`: valid package → `package_*`, `price_source:'package'`, `custom_lesson_price = perHour`, `custom_total_price = total` (or `lessons × perHour` when conflicts dropped lessons). No/invalid package → `package_*` deleted, and a previous `price_source:'package'` price is deleted too so it cannot leak into the new plan. A price the admin typed (`adminEditStudentPrice` writes `price_source:'admin'` only when the value actually changed, or legacy docs without `price_source`) is kept by default; on such an accept the admin is asked (`showChoiceModal`) whether to keep it or return to list price (`reservationPriceFields(..., {keepAdminPrice})`). `functions/index.js` `reservationPrice()` already reads `custom_total_price`, so reminders show the discounted total.
- **Extra lessons on a package:** an extra lesson (student "Ek Ders" request approved, or admin "Ders Ekle" with the charge box ticked) is outside the package — `extraLessonPriceFields()` adds `FieldValue.increment(LESSON_PRICE)` to `custom_total_price` in the same batch and counts it in `extra_lessons_count` / `extra_lessons_price` (reset on the next accept), so the panel shows "package + N extra" and the package saving line stays correct. Cancelled lessons do **not** reduce a package total (the package is sold as a whole); the admin edits the price by hand if needed. Payment box and the admin payment-request check share `reservationTotalPrice()`.
- **Reschedule credits:** package-based pool — an N-month package grants N credits total (1-month = 1 credit even if lessons spill into the next calendar month). Stored as `reservations.reschedule_credits {'YYYY-MM': n}`; available = sum of values (`totalRescheduleCredits()`), consumption via `consumeRescheduleCredit()` decrements the lesson's month key if positive, else the earliest positive key. Buying an extra credit costs **500 TL** via the in-panel modal (admin adds +1 to a month key).
- **Rules acceptance:** modal shown once after first lesson purchase; writes `rules_accepted_at` (write-once). Re-shown only if the field is missing.
- **Closed slots:** admin "Müsaitlik" matrix (7 days × 24 hours) edits `settings/global.available_days` + `blocked_hours` as a draft; "Kaydet" writes both with `update()` (so a day whose last closed hour was reopened really disappears from the map). A closed day blocks all 24 hours in the student grid; closed slots appear blocked but visible in the trial-lesson day grid. Cells with a lesson in the next 90 days are marked (still toggleable).
- **24h rule:** `calculateLessonDates()` pushes a weekday series one week forward while its first slot starts less than 24h from now (or is already past), so a request made Sunday 11:00 for Monday 10:00 begins with the other selected day. The extra-lesson picker disables such days/times via `slotStartsTooSoon()`; the same function feeds the request preview, the min-lesson check and admin `acceptRequest`.

- **Seviye belirleme sınavı:** ödemesi onaylı aktif öğrenci dışında herkese zorunlu olarak açılır — talebi bekleyenler, ödemesi onaylanmamış aktif öğrenciler, paketi bitenler ve deneme dersi isteyenler dahil. `initPlacementTest(slotId, nag, autoOpen)` dört yuvaya basar: bekleme ekranı (`#ptSlotPending`), panel (`#ptSlotDash`, sadece `payment_confirmed` değilken), talep formu (`#ptSlotRequest`) ve seçim ekranı (`#ptSlotAccess` — kart görünür ama modal kendiliğinden açılmaz, ilk kayıt akışını kesmesin diye). Modal sayfa başına bir kez kendiliğinden açılır; öğrenci erteleyebilir ama kart ve hatırlatma kalır. Admin tarafında sonuç, talep ve öğrenci satırlarındaki `[data-pt-uid]` rozetinde görünür (canlı dinlenir), rozete tıklayınca soru bazlı detay ve "Sınavı Sıfırla" açılır.

These flows live almost entirely inside `booking.html` (~8700 lines) — single source of truth for the panel UX. Admin UI (AdminPaneli design): `#admRoot` (`.adm-*`), own sidebar on desktop (shell header/footer hidden via `beShell.hide`, `html.bk-admin`), section tabs `#admRoot[data-tab]` at ≤1024; "Öğrenci görünümü" opens the request form as a read-only preview (`_bkAdminPreview`: submit and placement test disabled).

## Auth Patterns

- `authDomain` is `berkayeracademy.com` (same-origin `/__/auth/handler`; the cross-origin `firebaseapp.com` handler broke on iOS Safari / in-app browsers with "missing initial state"). The OAuth client must list `https://berkayeracademy.com/__/auth/handler` as a redirect URI.
- Sign-in buttons call `window.bkAuth.openLogin()`; never call `signInWithPopup`/`signInWithRedirect` from a page (exception: `app-bridge.html`, which needs a real Google ID token). `signInGoogle()` tries the popup first and falls back to redirect only on `auth/popup-blocked` / `auth/internal-error`, never inside an in-app browser (Instagram/Facebook/TikTok WebViews — Google rejects OAuth there, so the modal leads with e-posta).
- Pages call `window.bkAuth.handleRedirectResult()` instead of `getRedirectResult()` so redirect failures are shown to the user, not swallowed in the console.
- `displayName` may be empty for email/password users — always fall back:
  ```js
  user.displayName?.trim() || user.email?.split('@')[0] || ''
  ```

## Page → Route Map

Design column = screen in the Claude Design canvas (desktop 1440 / mobile `M_*` 390). Shell column = `#beHeader` `data-be-page` + extra attributes, and the footer variant (`—` = no `#beFooter`).

| File | Route | Design | Shell | Notes |
|---|---|---|---|---|
| index.html | / | Main / Mobil | `index` · footer full | Landing + community comments; hero + eğitmen karosu döngü videosu (`[data-idx-video]`) |
| egitim.html | /egitim | Egitim | `egitim` · compact | Course info, SEO-loaded with genre keywords; member gate (Lab + Dergi cards) |
| egitmen.html | /egitmen | Egitmen | `egitmen` · compact | Instructor bio, timeline, hero döngü videosu (`#egHeroVideo`) + live video (`#liveVideo`) |
| sss.html | /sss | SSS | `sss` · compact | FAQ accordion (`sss_qN` / `sss_aN_html`) |
| forum.html | /forum | Forum | `forum` · compact | |
| post.html | /post?id= | KonuDetay | `post`, back → /forum, no tabs · — | |
| new-post.html | /new-post | YeniKonu | `new-post`, back → /forum, no tabs · — | |
| members.html | /members | Uyeler | `members`, back → /forum · compact | |
| profile.html | /profile?uid= | Profil | `profile` · — | Profile + chat drawer (DMs, collab requests) |
| ableton-lab.html | /ableton-lab | Lab · Lab_Synth · Lab_Beat · Lab_Mixing · Lab_Arrangement · Lab_Mastering | `ableton-lab` · compact | Interactive lab — genel bakış + 5 Web Audio modülü, adresler `#synth #beat #mixing #arrangement #mastering` |
| ders-ableton.html | /ders-ableton | DersAbleton | `ders-ableton`, back → /egitim, no tabs · compact | Lesson content (Drive video facade) |
| ders-push3.html | /ders-push3 | Push3 | `ders-push3`, back → /egitim, no tabs · — | Push 3 Laboratuvarı — öğretici, Seviye 1/2 ve tarayıcıda çalan Push 3 emülatörü (Wavetable synth); kod assets/js/push3/, sözleşme docs/push3/README.md. Linked from egitim.html curriculum grid |
| booking.html | /booking | DersPaneli (student) · AdminPaneli (admin) | `booking` · compact (admin hides the shell) | Student lesson panel + admin panel + WhatsApp chat |
| app-bridge.html | /app-bridge | — | none (tokens only) | UUID-keyed cross-app data bridge UI |
| migration.html | /migration | — | none (tokens only) | Admin one-off tool (fix old messages); not linked |

**Döngü videoları (index, egitmen):** tasarımdaki fotoğraflar `assets/video/live.mp4` (poster `DSC00141.jpg`, `object-position: 50% 40%`) sessiz döngü videosu. `autoplay` özniteliği yok — oynatmayı sayfa içi denetleyici başlatır: görünürken oynar, ekran dışı / sekme gizliyken durur; `prefers-reduced-motion`, Save-Data ve 2g'de poster kalır, hiç video baytı inmez. Her videoda WCAG 2.2.2 duraklat/oynat düğmesi zorunlu (`.idx-video-toggle`, `.eg-live-toggle`). Yerelde `firebase serve` Range isteğine 206 vermez; eğitmen hero'su `#liveVideo` ile aynı dosyayı paylaştığı için localhost'ta yüklenmeyebilir — üretimde sorun yok.

Legacy: `site_1.html` (3300+ lines) is orphan content; `/site_1` and `/site_1.html` both 301-redirect to `/ableton-lab`. Do not link to it.

## Ableton Lab (`ableton-lab.html`, ~7400 lines)

Tek sayfa, ana script `type="module"` (bu sayfada sorun değil — başka blok değişken paylaşmıyor). **Sözleşme: script'teki "LAB KABUK API" yorum bloğu** — modül gövdeleri yalnız onu kullanır.

- **Adresler:** `MODULE_SLUGS`/`LAB_ROUTES` `{1:'synth',2:'beat',3:'mixing',4:'arrangement',5:'mastering'}`; genel bakış = hash yok. `navigate(mod)` `history.pushState` yapar, `popstate`/`hashchange` dinlenir; `<head>`'deki `data-lab-route` derin bağlantıda hero'nun yanıp sönmesini önler. Diğer modüle link: `labHref`/`labGo`/`labLinkTo` (`navigate` global değil).
- **Sıra:** `LAB_ORDER = [1,2,3,5,4]` — sekme ve alt ileri/geri şeridi tasarımdaki gibi Synth, Beat, Mixing, Mastering, Arrangement; künyeler MODÜL 04 = Arrangement, 05 = Mastering (numara modül kimliği, sıra değil). Genel bakış 01–05.
- **Kabuk:** `render()` sekme çubuğu (`#moduleNav.lab-modtabs`, "GÖREV x / N" sayacı), `modNav` alt şerit, `document.title`, h1 odağı ve kaydırmayı yönetir. Gövde `renderModuleN()` sadece `modLayout(N)` kökünü döndürür; kartlar `whereCard`, `savedCard` (preset/beat kayıt listesi), büyük oynat düğmesi `bigPlayBtn`/`setBigPlay`.
- **Görevler:** `TASKS[n]` + `makeTaskPanel(n, {auto, note})`. Otomatik görevler kalıcıdır (`completeTask`, geri alınmaz); anlamı değişen görev **yeni id** alır (Arrangement 6–10, Mastering 1–5). İlerleme `localStorage['berkay_tasks']` + sahibi `['berkay_tasks_owner']`; girişte bulutla birleşim (union), farklı hesabın yerel ilerlemesi alınmaz, çıkışta sıfırlanır. Giriş/dil değişimi modülü yeniden kurmaz: `labRefreshProgress()` / `labOnRefresh(el, fn)` yerinde tazeler (ses sürer).
- **Metinler:** modül metinleri `LAB_TXT` içinde (`Object.assign(LAB_TXT, {…})`, her modülün `MODULE N` başlığının altında), `L(key)` önce i18n.js'e bakar. i18n.js'te aynı anahtar varsa o kazanır.
- **Bölgeler:** her modülün JS'i `// MODULE N — …` başlığının altında, CSS'i sayfa `<style>` sonundaki `/* ═══ LAB MN · … ═══ */` bloğunda, kökü `.lab-mN` kapsamlı. Kabuk CSS'i `LAB KABUK` bloğunda. Mixing kendi neon kanal paletini `.lab-m3` içinde tanımlar; Beat sıcak paleti `:root --lab-*` token'larından.
- **Ses:** iki bağlam — Synth `synthCtx`, diğer modüller ortak `beatCtx` (`getBeatCtx()`); her modül `_mNStopAudio`'yu atar, `teardownView()` gezinmede çağırır (zamanlayıcı/rAF/düğümler dahil). `beatRestartRun()` şablon değişiminde `beatMasterGain`'i **yenisiyle değiştirir** — ona uzun ömürlü referans tutma (Mixing bus'ı bu yüzden doğrudan `destination`'a bağlı). Arrangement 125 BPM sabit, bölüm başına 2 ölçü, tek geçiş. Headless Chrome'da ses duyulmaz; düğüm grafiği `--eval` ile incelenir.

**Synth (`renderModule1`):** durum tek `state` nesnesinde (`state.osc1`, `osc2`, `sub`, `noise`, `adsr`, `filter`, `filterEnv`, `lfo`, `fx`, `activePreset`). Preset uygulamak tam render yapmaz: bölümler `m1Refresh` dizisine tazeleme kapanışı koyar, `_m1Update()` hepsini çalıştırır (scroll ve osiloskop korunur). `state.waveform`, `state.osc1.wave`'in eski takma adı; yalnız `wave` içeren eski presetler `applyPreset()` ile yüklenir.

## Push 3 Lab (`ders-push3.html`)

Tarayıcıda çalan Push 3 emülatörü + öğretici + Seviye 1 (Kontrolü Bul) / Seviye 2 (Görevler). **Single source of truth: `docs/push3/README.md`** (§H/§I, §G'yi geçersiz kılar; `dalga*-notlar.md` entegrasyon notları). `docs/**/*.md` yayınlanmaz (`firebase.json` ignore).

**Architecture** — plain IIFE scripts in `assets/js/push3/`, shared namespace `window.P3`, loaded in README §C order; no side effects on load, single entry `P3.app.boot()`:
- `p3-core` (`P3.K` sabitler, `bus`, `store` undo/redo, `save` → `localStorage['bk_push3_v1']`, `t`, `panic`) · `p3-scale` (saf gam/pad→nota) · `p3-wt-params` (Wavetable parametre/bank tanımları) · `p3-device` (SVG yükleme, kontrol registry, hit-test, `align`/`setView`) · `p3-leds` (pad/LED renkleri, `#p3Live`) · `p3-lcd` (`#p3LcdCanvas` 960×160 sayfaları) · `p3-wt-engine` (`P3.audio` + `P3.wt`: graf, worklet, tablolar) · `p3-wt-worklet` (DSP, AudioWorklet) · `p3-wt-tables.worker` (wavetable üretimi) · `p3-drums` · `p3-seq` (transport, scheduler, kayıt, clip) · `p3-modes` (buton/pad/encoder davranışı) · `p3-input` (pointer/klavye → `bus 'in'`) · `p3-levels` · `p3-tutorial` · `p3-app` (boot, router `#ogretici|#seviye-1|#seviye-2|#serbest`, gate) · `p3-selftest` (yalnız `?p3debug=1`).

**Rules**
- Injected device SVG is **never mutated** after injection — the only exception is `P3.dev.setView()` (viewBox swap). Everything dynamic (pads, LED glyph clones, light bars, touch rings) draws into the sibling `<svg id="p3Live">` layer (same viewBox, no filter, `pointer-events:none`); `filter` lives only on `.p3-device-wrap`.
- One `AudioContext` (`P3.audio.ctx`), unlocked on a user gesture via `P3.audio.unlock()` (idempotent).
- Worklet/worker load from `/assets/js/push3/<file>?v=${P3.K.V}`; if that fails (Firebase `**` rewrite can return HTML) the engine refetches the text and loads it from a Blob URL, then falls back to main-thread table generation / PeriodicWave.
- `P3.K.V` (`p3-core.js`) is the version stamp and **must equal the `?v=` on the page's `push3/*.js` script tags** — bump both together.
- Coding: README §B — no `type="module"`/`class` on the main thread, `var`/`function`, Turkish strings only in template literals, `// VARSAYIM:` for unverified behaviour, no `console.log` (`console.warn('[p3] …')`). Page chrome strings are `p3_*` keys in `i18n.js`.

**Testing** — DOM-free modules are tested in Node by loading the real files into `vm` (scale, params, engine, seq, modes); in the browser `?p3debug=1` loads `p3-selftest.js`, then `P3.test.run()` returns the result table (unit checks + OfflineAudioContext measurements, `sartname-dogrulama.md`).

**Phases** — Faz 1 = current scope (README §A + plan). Faz 2 (Session, Layout/sequencer, Repeat, Quantize, Web MIDI, öğretici bölüm 7–10) and Faz 3 (MPE, Setup, otomasyon, Firestore preset kaydı, EN öğretici) are specified in `docs/push3/sartname-kapsam.md`.
