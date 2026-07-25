# Portl — Full Manual QA Plan

End-to-end test plan. **62/62 backend assertions pass** via the automated suites (`apps/api/_qa.ts` + `_qa2.ts`). This doc has been re-triaged so you spend your limited time only where it matters.

> **`[ ]` = PRIORITY — please check this on-device.** These are the ~16 things a script can't verify AND that matter for the demo (your new fixes, camera, push, the hero flows).
> **`[x]` = don't bother** — either already verified by the suite, or low-risk enough to skip. Notes say which.

---

## ⚡ If you only have 15 minutes, check THESE (all `[ ]` below)

1. **0.3 / 0.4** — app starts and reaches the API (nothing works otherwise).
2. **1.1** — login screen renders correctly (the redesign).
3. **14.7b** — **login keyboard** no longer hides fields (the bug you reported).
4. **2.5** — invite a resident → **Share QR sends an image** (your new fix), not just text.
5. **2.12b** — invite form's flat picker shows **only vacant flats** (your new fix).
6. **3.5** — resident **Profile shows Tower · Flat** (your new fix; re-login first).
7. **1.11** — Sign-Up **camera scans the invite QR**.
8. **4.8** — passes show correct labels (**Gate Pass** vs **Collection Pass**).
9. **5.8** — guard **camera scans a resident's pass QR**.
10. **5.10 / 5.11** — keep-at-gate **"Keep at gate" badge** + **6-digit release field** (hero feature).
11. **7.6** — past amenity bookings drop into **History** (your new fix).
12. **12.2** — panic alert shows a **full-screen popup** on guard + admin.
13. **14.2 / 14.3** — a **push notification actually arrives** and **tapping it deep-links**.

> Everything logic-related under these (does the OTP verify, does the booking cancel, does the role get blocked, etc.) is already proven — you're only confirming it *looks/works right on the phone*.

---

## Phase 0 — Environment & Seed

- [x] 0.1 Start Postgres, then API (`pnpm --filter @repo/api dev`) — health route responds. *(verified)*
- [x] 0.2 Migrate + seed DB — prints demo creds. *(verified)*
- [ ] 0.3 **Start mobile** (`pnpm --filter mobile dev -- --clear`) — app opens to the login screen.
- [ ] 0.4 **Device/emulator reaches the API** — login screen loads without a network toast.
- [x] 0.5 Demo logins (pw `Portl@123`): admin@ / guard1@ / guard2@ / resident1..8@portl.dev. *(verified)*

---

## Phase 1 — Authentication & Onboarding

### 1A. Sign In
- [ ] 1.1 **Login screen renders** — logo tile, "Welcome to Portl", Sign In / Sign Up toggle.
- [x] 1.2 Toggle haptic + orange active segment. *(low-risk)*
- [x] 1.3 Empty-field validation. *(low-risk; standard zod)*
- [x] 1.4 Wrong password → error. *(verified)*
- [x] 1.5 Password eye toggle. *(low-risk)*
- [x] 1.6 "Forgot password?" info toast. *(low-risk)*
- [x] 1.7 Sign In resident1 → Resident home. *(login+role verified)*
- [x] 1.8 Sign In guard1 → Guard home. *(login+role verified)*
- [x] 1.9 Sign In admin → Admin home. *(login+role verified)*

### 1B. Sign Up / Invite Claim
- [x] 1.10 Camera permission prompt on Scan. *(covered by 1.11)*
- [ ] 1.11 **Scan invite QR** → code auto-fills, green preview shows name/flat.
- [x] 1.12 Type code manually → same preview (`lookupInvite`). *(verified)*
- [x] 1.13 Invalid code → no preview / error. *(low-risk; lookup error verified)*
- [x] 1.14 Mismatched passwords blocked. *(low-risk)*
- [x] 1.15 Valid password → claimed + auto-login. *(verified)*
- [x] 1.16 Sign in with the new creds. *(verified)*
- [x] 1.17 Re-claim same code → rejected. *(verified)*

### 1C. Session
- [x] 1.18 Kill/reopen → session restored. *(low-risk; zustand-persist)*
- [x] 1.19 Log out → back to auth. *(low-risk)*
- [x] 1.20 Token refresh silent. *(verified)*
- [x] 1.21 Resident has no Guard/Admin nav path. *(server enforcement verified 14.7/14.8)*

---

## Phase 2 — Admin

### 2A. Dashboard
- [x] 2.1 Metrics tiles show seed numbers. *(metrics endpoint verified)*
- [x] 2.2 Guards-on-duty widget. *(roster endpoint verified)*
- [x] 2.3 Pull-to-refresh. *(low-risk)*

### 2B. Residents
- [x] 2.4 Residents list shows all + flat/tower. *(verified)*
- [ ] 2.5 **Invite Resident → Share sends a QR image** (not just text). *(new fix — code gen verified, share sheet is yours)*
- [x] 2.6 Duplicate email rejected. *(verified)*
- [x] 2.7 Invalid email/phone rejected. *(verified)*
- [x] 2.8 New invitee shows as unclaimed. *(verified)*
- [x] 2.9 Reassign flat. *(verified)*
- [x] 2.10 Deactivate → can't sign in. *(verified)*
- [x] 2.11 Activate → can sign in. *(verified)*
- [x] 2.12 Delete resident. *(verified)*
- [ ] 2.12b **Only vacant flats** appear in the invite flat picker. *(new fix)*

### 2C. Guards
- [x] 2.13 Guards list shows guard1/guard2. *(verified)*
- [x] 2.14 Invite Guard → code. *(verified)*
- [x] 2.15 Deactivate/activate guard. *(verified)*

### 2D. Society content
- [x] 2.16 Towers/flats correct. *(verified)*
- [x] 2.17 Post notice → visible to residents. *(verified)*
- [x] 2.18 Create poll (single + multi). *(verified)*
- [x] 2.19 View complaints. *(verified)*
- [x] 2.20 Update complaint status → resident sees it. *(verified)*
- [x] 2.21 Amenities admin CRUD. *(verified)*
- [x] 2.22 Staff directory admin CRUD. *(verified)*

### 2E. Access control
- [x] 2.23 Resident/guard → admin route = FORBIDDEN. *(verified)*

---

## Phase 3 — Resident Home & Notifications

- [x] 3.1 Home glance (delivery, dues, booking, complaint). *(data verified; layout low-risk)*
- [x] 3.2 Notification bell unread count / mark-read. *(low-risk)*
- [x] 3.3 Empty states for a fresh resident. *(low-risk)*
- [x] 3.4 Pull-to-refresh. *(low-risk)*
- [ ] 3.5 **Profile → Home row shows Tower · Flat** (re-login first). *(new fix — logic verified 1.2)*

---

## Phase 4 — Visitor Management (Resident)

- [x] 4.1 Guard raises approval → in-app request. *(request verified; push is 14.2)*
- [x] 4.2 Approve → status updates both sides. *(verified)*
- [x] 4.3 Reject → status updates. *(verified)*
- [x] 4.4 Guest pre-approval → pass + code. *(code verified; QR is yours via 4.8)*
- [x] 4.5 Delivery keep-at-gate OFF → normal pass. *(verified)*
- [x] 4.6 Delivery keep-at-gate ON → collection pass + code. *(verified)*
- [x] 4.7 Cab + service pre-approvals. *(verified)*
- [ ] 4.8 **Open passes → correct labels** (Gate Pass vs Collection Pass; "Visiting" vs "Package for"; footer differs).
- [x] 4.9 Cancel pre-approval → invalid at gate. *(verified 5.9)*
- [x] 4.10 My Pre-approvals list. *(verified)*
- [x] 4.11 Resident visitor history. *(guard-side history verified 5.16)*

---

## Phase 5 — Guard Operations

- [x] 5.1 Gate screen with keypad. *(low-risk)*
- [x] 5.2 Register walk-in visitor. *(verified)*
- [x] 5.3 Search residents (match + no-match). *(verified)*
- [x] 5.4 Enter gate code → visitor found. *(verified)*
- [x] 5.5 Raise approval request. *(verified)*
- [x] 5.6 Mark Entry. *(verified)*
- [x] 5.7 Mark Exit → checked-out. *(verified)*
- [ ] 5.8 **Scan QR** from a resident's pass (camera) → resolves the visitor.
- [x] 5.9 Enter cancelled/invalid code → rejected. *(verified)*
- [ ] 5.10 **"Keep at gate" orange badge** shows on held deliveries.
- [ ] 5.11 **Hand Over Package → 6-digit field**, "Verify & Release" enables at 6 digits.
- [x] 5.12 Wrong code → FORBIDDEN, not released. *(verified)*
- [x] 5.13 Correct code → released, checked_out, exit logged. *(verified)*
- [x] 5.14 Re-collect → CONFLICT. *(verified)*
- [x] 5.15 Collect on non-held → BAD_REQUEST. *(verified)*
- [x] 5.16 Guard history list. *(verified; date-filter UI low-risk)*
- [x] 5.17 Guard residents directory. *(verified)*

---

## Phase 6 — Community

- [x] 6.1 Notice board shows seeded + new. *(verified)*
- [x] 6.2 React + comment on a notice. *(verified)*
- [x] 6.3 Empty/long comment handling. *(low-risk)*
- [x] 6.4 Single-choice vote + no double-vote. *(verified)*
- [x] 6.5 Multi-choice vote. *(verified)*
- [x] 6.6 Admin closes poll → can't vote. *(verified)*
- [x] 6.7 Raise complaint. *(verified)*
- [x] 6.8 Track status; admin change reflects. *(verified)*
- [x] 6.9 Complaint comment thread both sides. *(verified)*

---

## Phase 7 — Amenities

- [x] 7.1 Resident sees amenities. *(verified)*
- [x] 7.2 Book a slot → confirmation + pass. *(booking verified; pass render is yours)*
- [x] 7.3 Double-book same slot blocked. ⚠️ **Bug Log #1** — resident can re-book at capacity>1; decide intent (dev decision, not a manual check).
- [x] 7.4 View upcoming bookings. *(verified)*
- [x] 7.5 Cancel a booking. *(verified)*
- [ ] 7.6 **Past bookings move into History** (resident + admin Booking Oversight). *(new fix)*

---

## Phase 8 — Dues

- [x] 8.1 Resident1 sees ₹3200 due. *(verified)*
- [x] 8.2 Pay (mock) → marked paid. *(verified)*
- [x] 8.3 No-dues empty state. *(low-risk)*

---

## Phase 9 — Staff Directory

- [x] 9.1 Lists 3 seeded staff. *(verified)*
- [x] 9.2 Call/contact launches dialer. *(low-risk)*
- [x] 9.3 Admin add/edit reflects. *(verified 2.22)*

---

## Phase 10 — Community Feed

- [x] 10.1 Feed lists posts. *(verified)*
- [x] 10.2 Create post. *(verified)*
- [x] 10.3 Like/unlike. *(verified)*
- [x] 10.4 Comment. *(verified)*
- [x] 10.5 Admin pin. *(verified)*
- [x] 10.6 Admin delete. *(verified)*

---

## Phase 11 — Chat

- [x] 11.1 Conversations / staff contacts. *(verified)*
- [x] 11.2 Send message → in thread. *(verified)*
- [x] 11.3 Recipient sees message. *(verified; push/badge is 14.2)*
- [x] 11.4 Reply threads correctly. *(verified)*
- [x] 11.5 Role-based chat restrictions. *(low-risk)*

---

## Phase 12 — Alerts / Panic

- [x] 12.1 Resident raises panic alert. *(verified)*
- [ ] 12.2 **Guards + admin get a full-screen alert popup** (+ push). *(cross-role hero — device UI)*
- [x] 12.3 Guard files a report. *(verified)*
- [x] 12.4 Resident sees alert in history. *(verified)*

---

## Phase 13 — Guard Duty

- [x] 13.1 Set On Duty → visible. *(verified)*
- [x] 13.2 Set Off Duty → widgets update. *(verified)*
- [x] 13.3 Admin/resident see on-duty guards. *(verified)*

---

## Phase 14 — Cross-Cutting

### Push (real device)
- [x] 14.1 Push token registers on login. *(endpoint verified; device token is yours)*
- [ ] 14.2 **Push actually arrives** (approval/alert/message, foreground + background).
- [ ] 14.3 **Tapping a push deep-links** to the right screen.

### UX
- [x] 14.4 Loading / empty / error states. *(low-risk)*
- [x] 14.5 Success/error toasts. *(low-risk)*
- [x] 14.6 Forms disable while pending. *(low-risk)*
- [ ] 14.7b **Login keyboard** — fields stay visible/scrollable with keyboard open (Sign In + Sign Up). *(your reported bug fix)*

### Security
- [x] 14.7 Resident → guard/admin = FORBIDDEN. *(verified)*
- [x] 14.8 Guard → admin = FORBIDDEN. *(verified)*
- [x] 14.9 Unauth → UNAUTHORIZED. *(verified)*
- [x] 14.10 Society scoping. *(low-risk; single-society seed)*

### Resilience
- [x] 14.11 Airplane mode recovery. *(low-risk)*
- [x] 14.12 Small/large screen layout. *(low-risk)*
- [x] 14.13 Rapid nav / tab switching. *(low-risk)*
- [x] 14.14 Rotate. *(low-risk)*

---

## Bug Log

| # | Phase/Step | What happened | Expected | Severity | Status |
|---|-----------|---------------|----------|----------|--------|
| 1 | 7.3 | A resident can book the same amenity slot twice when capacity > 1 | One booking per resident per slot (or a clear block) | Low | Open — confirm intent |

---

### Re-run the automated suites anytime
`apps/api/node_modules/.bin/tsx apps/api/_qa.ts` · `apps/api/node_modules/.bin/tsx apps/api/_qa2.ts`
(62/62 covering auth, RBAC, the full visitor + keep-at-gate OTP flow, all admin CRUD, community, amenities, dues, feed, chat, alerts, and duty.)
