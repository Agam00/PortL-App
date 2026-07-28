# Portl — Deployment & App Store Notes

Working notes for the App Store submission. Not committed by default — internal checklist.

---

## 🔴 Pending before submitting for review

### 1. User-Generated Content moderation (Guideline 1.2) — highest rejection risk
Age-rating questionnaire declares **UGC = Yes** (community feed posts, comments, chat, visitor photos). Apple requires UGC apps to have:
- [ ] **Report** objectionable content (on posts + comments)
- [ ] **Block** a user
- [ ] **EULA / terms** with zero-tolerance line for objectionable content
- [ ] Ability to act on reports (remove content / eject user)
- **Status:** NOT built yet. Decided to add Report + Block before submitting. **← build this**

### 2. Privacy Policy + Terms — required
- Pages drafted: `docs/privacy.html`, `docs/terms.html` (contact email = agamxpro69@gmail.com).
- [ ] Enable **GitHub Pages** (Settings → Pages → branch `main`, folder `/docs`).
- [ ] Verify URLs open: `https://agam00.github.io/PortL-App/privacy.html` + `/terms.html` (confirm exact username case on the Pages screen).
- [ ] Paste Privacy Policy URL into App Store Connect.

### 3. Support page
- Content written (Google Sites). Uses agamxpro69@gmail.com.
- [ ] Publish on Google Sites → paste URL into **Support URL** field.

### 4. App Store Connect listing
- [ ] Screenshots — 6.7" iPhone, min 3 (capture from the app).
- [ ] App Privacy questionnaire (see values below).
- [ ] Demo login in Review Notes (see below).

### 5. Build & submit (run from `D:\Portl\apps\mobile`, NOT repo root)
- [ ] `npx eas-cli build --profile production --platform ios` — **accept the APNs / Push Notifications prompt** (iOS notification setup).
- [ ] `npx eas-cli submit --profile production --platform ios`.

---

## 🟠 Known tech debt / should-fix (not hard blockers)
- **Migration/schema drift:** live DB needed `drizzle-kit push` because committed migrations didn't fully match the schema (missing columns like `on_duty`, `deleted_at`). A *fresh* deploy from migrations could break. **Regenerate migrations** so `db:migrate` alone reproduces the schema.
- **Server after git history rewrite:** we force-pushed (removed Claude co-author trailers). On next deploy the Vultr server needs:
  `cd /root/PortL-App && git fetch origin && git reset --hard origin/main && pm2 restart portl-api`
- Hardcoded admin/secretary phone numbers in guard profile (cosmetic; reviewer won't dial).
- Dues "Demo payment — no real charge" label → reviewed: **fine** (real-world proof-of-payment, honest — no change needed).

---

## ✅ Done this session
- 6-digit gate pass + **QR** visitor pass; guard **QR scanner** + keypad OTP entry.
- Guard **In-Out** board (Waiting / Approved / Inside / Out) with timings; walk-in → resident approval loop.
- Guard **Settings/profile** screen, notification **bell** + unread badge.
- **Messaging** guard ↔ resident ↔ admin (chat routes opened to all roles); Messages screen with Residents/Society tabs.
- **Role tags** (Resident/Guard/Admin) on posts, comments, chat; **role filters** in resident chat + residents.
- Residents can **call/chat guards + admin** (new `residents.societyContacts`; chat `peerRole`).
- **Emergency alert popup** on gate dashboard with one-tap acknowledge + auto-reply.
- Push: **unregister on logout** (signed-out device stops receiving pushes).
- Fixes: chat keyboard (input above keyboard), pull-to-refresh flicker removed, filter chips single-line, admin nav safe-area padding, RoleTag no default-to-resident.
- Prod hardening: `/docs` gated in prod, "Streamyst" → "Portl" branding, removed committed QA script, dropped deprecated notification field.
- **Account deletion** in-app (Profile → Delete Account) — already wired.
- Backend live on Vultr: `https://139.84.177.188.sslip.io` (HTTPS, PM2, Postgres in Docker). App reads backend URL at runtime from `mobile-config.json` on GitHub main.

---

## 📋 App Store Connect field values (reference)

- **App Name:** `Portl – Society & Gate` (plain "Portl" was taken)
- **Subtitle:** `Society & visitor management`
- **Promotional Text:** `Your society, simplified — approve visitors with a QR gate pass, chat with the gate, book amenities, pay dues, and never miss a community notice.`
- **Keywords:** `society,gate,visitor,apartment,community,security,guard,intercom,amenity,maintenance,housing,rwa`
- **Copyright:** `2026 Agam Arora`
- **Primary category:** Lifestyle · **Secondary:** Utilities
- **Content rights:** Yes — contains third-party content (Material Icons Apache-2.0, Fluent UI Emoji MIT) and has the rights.
- **Age ratings toggles:** Parental Controls = No · Age Assurance = No · Unrestricted Web Access = No · **User-Generated Content = Yes** · Social Media = No
- **Support email:** agamxpro69@gmail.com

### App Privacy (data collected, linked to user, NOT used for tracking)
Name, Email, Phone, Photos (visitor), Messages/User Content, User ID, Device ID (push token). Not sold, no third-party ads.

### Review Notes / Demo login (Sign-in required = Yes)
Username `resident1@portl.dev`, Password `Portl@123`. Also guard `guard1@portl.dev`, admin `admin@portl.dev` (same password). Full flow steps + camera/notifications/payment explanations already drafted.

### Full description
See the App Store description drafted in chat (Residents / Guards / Admins sections).
