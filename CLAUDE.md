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

`git push` only updates GitHub — Firebase Hosting is a separate deploy step.

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

Sensitive credentials (Zoom OAuth, Gmail SMTP password) are stored in `functions/.env.ableton-tutorial` (gitignored). Access via `process.env.*` — do **not** use Firebase Secret Manager (had newline corruption issues with `echo` piping).

## Architecture

**No build step.** All pages are static HTML files served directly by Firebase Hosting. Firebase compat SDK v10.12.2 is loaded via CDN `<script>` tags inside each HTML file.

**Clean URLs:** `firebase.json` has `cleanUrls: true`. Each page has a redirect script in `<head>` to canonicalize `.html` → clean URL. All internal `href` and `location.href` use clean URLs (no `.html`).

**Admin check:** Admin is identified by email `berkayer032@gmail.com`. Client-side pages compare `user.email === ADMIN_EMAIL`. Firestore rules use `request.auth.token.email == "berkayer032@gmail.com"` (server-side JWT, not bypassable).

## Critical: Cross-Script Variable Sharing

`<script type="module">` isolates all declarations from other `<script>` blocks. When variables or functions must be shared across multiple script blocks on the same page, **do not use `type="module"`** — use plain `<script>` and `var` (not `let`/`const`).

Many pages still have `type="module"` on some script blocks. Before adding shared state, verify the target script block is a plain `<script>`.

## Firestore Collections

| Collection | Notes |
|---|---|
| `forum` | Posts; subcollection `replies` |
| `users` | Profiles; subcollections `beats`, `presets`, `userReplies` |
| `reservations/{uid}` | Per-student lesson schedule (admin-managed) |
| `booked_slots` | Student-booked lesson slots |
| `lesson_requests` | Lesson request submissions |
| `settings/global` | Site-wide settings (e.g. `zoom_link`) |
| `notifications/{uid}/items` | Per-user notifications |
| `chats/{chatId}/messages` | DM threads (chatId = sorted uid pair) |
| `access_codes` | Booking panel access codes |
| `app_bridge` | UUID-keyed cross-app data bridge (publicly readable) |

## Auth Patterns

- Google Sign-In via `signInWithPopup` (redirect not used — cross-origin cookie issue).
- `displayName` may be empty for email/password users — always fall back:
  ```js
  user.displayName?.trim() || user.email?.split('@')[0] || ''
  ```

## Page → Route Map

| File | Route |
|---|---|
| index.html | / |
| egitim.html | /egitim |
| booking.html | /booking |
| forum.html | /forum |
| post.html | /post?id= |
| new-post.html | /new-post |
| members.html | /members |
| profile.html | /profile?uid= |
| ableton-lab.html | /ableton-lab |
| ders-ableton.html | /ders-ableton |
| sss.html | /sss |

`/site_1` redirects to `/ableton-lab` (see `firebase.json`).
