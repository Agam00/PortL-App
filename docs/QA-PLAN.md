# Portl — Full Manual QA Plan

End-to-end, corner-by-corner test plan. Follow phases **in order** — later phases reuse data created in earlier ones. Check each box as you go. When something fails, note it in the **Bug Log** at the bottom.

> Legend: **R** = Resident app, **G** = Guard app, **A** = Admin app. "Expect" is the pass criterion.

---

## Phase 0 — Environment & Seed

- [ ] 0.1 Start Postgres, then API: `pnpm --filter @repo/api dev`. Expect: server boots, no red errors, health route responds.
- [ ] 0.2 Reset + seed DB: `pnpm --filter @repo/database db:migrate` then `pnpm --filter @repo/database db:seed`. Expect: seed prints demo credentials.
- [ ] 0.3 Start mobile: `pnpm --filter mobile dev -- --clear`. Expect: Metro builds, app opens to the login screen.
- [ ] 0.4 Confirm device/emulator can reach the API (check API base URL / IP). Expect: login screen loads without a network toast.
- [ ] 0.5 Note demo logins (all password `Portl@123`): `admin@portl.dev`, `guard1@portl.dev`, `guard2@portl.dev`, `resident1@portl.dev` … `resident8@portl.dev`.

---

## Phase 1 — Authentication & Onboarding

### 1A. Sign In (login.tsx)
- [ ] 1.1 App opens on the redesigned auth screen: logo tile, "Welcome to Portl", "Get started", **Sign In / Sign Up** segmented toggle.
- [ ] 1.2 Toggle switches tabs with a haptic tap; active segment turns orange, inactive is grey.
- [ ] 1.3 Sign In with empty fields → inline validation errors, no request sent.
- [ ] 1.4 Sign In with wrong password → error toast ("invalid credentials"), stays on screen.
- [ ] 1.5 Password eye toggle shows/hides characters.
- [ ] 1.6 "Forgot password?" → info toast (no crash).
- [ ] 1.7 Sign In as `resident1@portl.dev` → lands on Resident home.
- [ ] 1.8 Log out, Sign In as `guard1@portl.dev` → lands on Guard home.
- [ ] 1.9 Log out, Sign In as `admin@portl.dev` → lands on Admin home.

### 1B. Sign Up / Invite Claim (from admin-issued invite)
> Needs an invite code — generate one in Phase 2, then return here.
- [ ] 1.10 Sign Up tab → **Scan Invite QR**: camera permission prompt appears; grant it.
- [ ] 1.11 Scan the invite QR from Admin → invite code auto-fills, green invite preview shows the correct name/flat.
- [ ] 1.12 Alternatively type the 8-char code manually → same green preview loads (`lookupInvite`).
- [ ] 1.13 Type an invalid/expired code → no preview / error, cannot proceed.
- [ ] 1.14 Enter mismatched Create/Confirm password → mismatch error, submit blocked.
- [ ] 1.15 Enter matching valid password → account claimed, auto-logged-in, lands on the correct role home.
- [ ] 1.16 Log out, Sign In with the newly created email + password → succeeds.
- [ ] 1.17 Try to claim the **same** invite code again → rejected (already claimed).

### 1C. Session / Guards
- [ ] 1.18 Kill and reopen the app while logged in → session restored (no re-login), lands on correct home.
- [ ] 1.19 Log out → returns to auth screen; reopening app stays on auth screen.
- [ ] 1.20 (Token refresh) Leave app idle past access-token expiry, then act → silently refreshes, no forced logout.
- [ ] 1.21 (Role guard, negative) While logged in as Resident, there is no navigation path into Guard/Admin tabs.

---

## Phase 2 — Admin

### 2A. Dashboard & Metrics
- [ ] 2.1 Admin home shows metrics/glance tiles with real seed numbers (residents, guards, visitors today, etc.).
- [ ] 2.2 Guards-on-duty widget reflects duty status (cross-check after Phase 13).
- [ ] 2.3 Pull-to-refresh updates metrics.

### 2B. Residents management
- [ ] 2.4 Open Residents list → shows all seeded residents with flat/tower.
- [ ] 2.5 **Invite Resident**: fill name/email/phone, pick a flat → success, invite code/QR shown. **(Use this code for Phase 1B.)**
- [ ] 2.6 Invite with a duplicate email → rejected with a clear error.
- [ ] 2.7 Invite with invalid email / short phone → validation blocks submit.
- [ ] 2.8 New invited resident appears in the list as **unclaimed** (invite code visible, mustResetPassword true).
- [ ] 2.9 **Reassign flat**: move a resident to a vacant flat (B-202 or B-301) → reflected in list.
- [ ] 2.10 **Deactivate** a resident → marked inactive; that resident can no longer sign in.
- [ ] 2.11 **Activate** the same resident → can sign in again.
- [ ] 2.12 **Delete** a test resident → removed from list; cannot sign in.

### 2C. Guards management
- [ ] 2.13 Open Guards list → shows guard1, guard2.
- [ ] 2.14 **Invite Guard** → success + invite code. (Optionally claim it via Phase 1B.)
- [ ] 2.15 Deactivate/activate a guard → sign-in blocked/allowed accordingly.

### 2D. Society structure & content
- [ ] 2.16 Towers/flats visible and correct (Tower A/B, A-101…A-301, B-101…B-301).
- [ ] 2.17 Create a **Notice** as admin → appears on residents' notice board (verify in Phase 6).
- [ ] 2.18 Create a **Poll** (single & multi choice) → appears for residents (verify in Phase 6).
- [ ] 2.19 View **Complaints** as admin → sees residents' tickets incl. the seeded "Gate camera light flickering".
- [ ] 2.20 Update a complaint status → resident sees the new status.
- [ ] 2.21 Amenities visible/manageable (Clubhouse, Swimming Pool).
- [ ] 2.22 Staff directory manageable (3 seeded staff).

### 2E. Admin access control (negative)
- [ ] 2.23 (If testable via API) A resident/guard token calling an admin route → **FORBIDDEN**, not just hidden in UI.

---

## Phase 3 — Resident Home & Notifications

- [ ] 3.1 Resident1 (Priya, A-101) home shows the seeded glance: pending Swiggy delivery, dues ₹3200, upcoming Clubhouse booking, in-progress complaint.
- [ ] 3.2 Notification bell shows unread count; opening the list marks them read / clears the badge.
- [ ] 3.3 Empty states render correctly for a fresh resident (e.g. resident with no activity).
- [ ] 3.4 Pull-to-refresh works on home.

---

## Phase 4 — Visitor Management (Resident side)

### 4A. Incoming approval (guard-initiated)
> Coordinate with Phase 5.5 (guard raises a request).
- [ ] 4.1 Guard raises an approval for Priya → Priya gets a **push notification** + in-app request.
- [ ] 4.2 Approve → status updates on both sides; guard sees "approved".
- [ ] 4.3 Reject a second request → guard sees "rejected"; visitor not allowed.

### 4B. Pre-approvals
- [ ] 4.4 Create a **guest** pre-approval (name + time) → pass generated with QR + 6-digit gate code.
- [ ] 4.5 Create a **delivery** pre-approval, **keep-at-gate OFF** → info note says "sent up with a normal gate pass"; pass = normal Gate Pass.
- [ ] 4.6 Create a **delivery** pre-approval, **keep-at-gate ON** → info note mentions 6-digit code + "held at the gate"; pass = **Collection Pass** with **Collection Code**.
- [ ] 4.7 Create a **cab** and a **service** pre-approval → each generates a valid pass.
- [ ] 4.8 Open a pass → correct header/labels per type (Gate Pass vs Collection Pass; "Visiting" vs "Package for"; footer text differs).
- [ ] 4.9 **Cancel** the seeded cancelable Amazon delivery pre-approval → disappears / marked cancelled; its pass no longer valid at the gate.
- [ ] 4.10 My Pre-approvals list shows all active passes; the collection code is readable there.
- [ ] 4.11 Visitor **history** shows past/expired entries with timestamps.

---

## Phase 5 — Guard Operations

### 5A. Gate & walk-ins
- [ ] 5.1 Guard home = gate screen with keypad + actions.
- [ ] 5.2 Register a **walk-in visitor** (new visitor, pick flat) → creates a pending request to that resident.
- [ ] 5.3 **Search residents** by name/flat → correct results; empty query and no-match both handled.
- [ ] 5.4 Enter a **gate code** on the keypad for a valid pre-approval → visitor found, details shown.
- [ ] 5.5 **Raise approval request** to a resident (feeds Phase 4A) → resident notified.

### 5B. Verify / entry / exit
- [ ] 5.6 For an approved pre-approval → **Mark Entry** → entry logged with timestamp.
- [ ] 5.7 Later → **Mark Exit** → exit logged; visitor shows checked-out.
- [ ] 5.8 **Scan QR** from a resident's pass (expo-camera) → resolves the same visitor as the code path.
- [ ] 5.9 Scan/enter a **cancelled or invalid** code → rejected with a clear message.

### 5C. Delivery keep-at-gate (OTP handover)
- [ ] 5.10 For the keep-at-gate delivery (Phase 4.6) the card shows a **"Keep at gate"** orange badge (vs plain "Package").
- [ ] 5.11 Tap **Hand Over Package** → 6-digit code field appears; "Verify & Release" disabled until 6 digits entered.
- [ ] 5.12 Enter the **wrong** code → FORBIDDEN error ("Incorrect code — ask the resident…"); package not released.
- [ ] 5.13 Enter the **correct** code (from Priya's Collection Pass) → success toast "Package released to Unit …", status → checked_out, exit logged.
- [ ] 5.14 Try to collect the same package again → rejected (already checked out / CONFLICT).
- [ ] 5.15 Try "collect-package" on a **non-keep-at-gate** delivery → BAD_REQUEST ("isn't a package held at the gate").

### 5D. Guard history & directory
- [ ] 5.16 Guard **History** tab lists today's entries/exits with correct actions & times; date filter works.
- [ ] 5.17 Guard **Residents** directory tab lists residents with flats.

---

## Phase 6 — Community (Notices, Polls, Helpdesk)

### 6A. Notices
- [ ] 6.1 Resident notice board shows both seeded notices + the one created in 2.17.
- [ ] 6.2 React to a notice / add a comment → persists and shows.
- [ ] 6.3 Empty comment blocked; long comment handled.

### 6B. Polls
- [ ] 6.4 Vote on the seeded Sat/Sun poll (single choice) → vote recorded, results update, cannot double-vote.
- [ ] 6.5 Vote on a multi-choice poll → multiple selections recorded.
- [ ] 6.6 Admin closes a poll → residents can view results but not vote.

### 6C. Helpdesk / Complaints
- [ ] 6.7 Resident raises a new complaint (title + description) → appears in their list as open.
- [ ] 6.8 Track status of the seeded in-progress complaint; admin status change (2.20) reflects here.
- [ ] 6.9 Comment thread on a complaint works both sides.

---

## Phase 7 — Amenities & Bookings

- [ ] 7.1 Resident sees amenities (Clubhouse, Swimming Pool) with details.
- [ ] 7.2 Book an available slot → confirmation + **booking pass**.
- [ ] 7.3 Attempt to double-book the same taken slot → blocked with a clear message.
- [ ] 7.4 View upcoming bookings (incl. seeded Clubhouse booking).
- [ ] 7.5 **Cancel** a booking → slot frees up, disappears from upcoming.

---

## Phase 8 — Dues / Mock Payment

- [ ] 8.1 Resident1 sees ₹3200 due.
- [ ] 8.2 **Pay (mock)** → marked paid, balance updates to 0, receipt/confirmation shown.
- [ ] 8.3 A resident with no dues sees a clean empty state.

---

## Phase 9 — Staff & Service Directory

- [ ] 9.1 Directory lists the 3 seeded staff with role/contact.
- [ ] 9.2 Call/contact action launches the dialer (or intended handler).
- [ ] 9.3 Admin add/edit reflects for residents.

---

## Phase 10 — Community Feed / Posts

- [ ] 10.1 Feed lists posts.
- [ ] 10.2 Create a post → appears at top.
- [ ] 10.3 Like/unlike toggles count.
- [ ] 10.4 Add a comment → shows under the post.
- [ ] 10.5 Admin **pin** a post → sticks to top for everyone.
- [ ] 10.6 Admin **delete** a post → removed for everyone.

---

## Phase 11 — Chat / Messaging

- [ ] 11.1 Resident opens conversations list / staff contacts.
- [ ] 11.2 Send a message to a contact (e.g. admin/guard) → delivered, appears in thread.
- [ ] 11.3 Recipient sees the message (and push/badge if applicable).
- [ ] 11.4 Reply back → threads correctly, ordering right.
- [ ] 11.5 Role-based chat restrictions behave as designed (who can message whom).

---

## Phase 12 — Alerts / Panic Emergency

- [ ] 12.1 Resident raises a **panic/emergency alert**.
- [ ] 12.2 Guards **and** admin receive a full-screen alert popup + push.
- [ ] 12.3 Guard files a report / acknowledges → recorded.
- [ ] 12.4 Resident sees their alert in **my history**.

---

## Phase 13 — Guard Duty Status

- [ ] 13.1 Guard sets status **On Duty** → visible to residents/admin.
- [ ] 13.2 Guard sets **Off Duty** → widgets (2.2) update accordingly.
- [ ] 13.3 Resident/admin can see which guards are currently on duty.

---

## Phase 14 — Cross-Cutting (do throughout + a final sweep)

### 14A. Push notifications (real Expo push)
- [ ] 14.1 On login, push token registers (`pushTokens.register`) without error.
- [ ] 14.2 Approval requests, alerts, and messages deliver as real device push notifications (foreground + background).
- [ ] 14.3 Tapping a notification deep-links to the right screen.

### 14B. UX states
- [ ] 14.4 Every list shows a **loading** state, a proper **empty** state, and recovers from **error** (kill API, retry).
- [ ] 14.5 Toasts appear for success/error consistently; no silent failures.
- [ ] 14.6 Forms disable submit while pending (no double-submit / duplicate records).

### 14C. Security / access control (negative sweep)
- [ ] 14.7 Resident token → guard/admin endpoints = **FORBIDDEN** (server-side, `requireRole`).
- [ ] 14.8 Guard token → admin endpoints = **FORBIDDEN**.
- [ ] 14.9 Unauthenticated request to a protected route = **UNAUTHORIZED**.
- [ ] 14.10 One society's data is never visible to another (society scoping) — if multi-society testable.

### 14D. Resilience / responsiveness
- [ ] 14.11 Airplane mode mid-action → graceful error, no crash; recovers on reconnect.
- [ ] 14.12 Layout holds on a small phone and a large/tablet screen; no clipped buttons.
- [ ] 14.13 Rapid back-navigation / fast tab switching doesn't crash or duplicate requests.
- [ ] 14.14 Rotate device (if supported) → no broken layout.

---

## Bug Log

| # | Phase/Step | What happened | Expected | Severity | Status |
|---|-----------|---------------|----------|----------|--------|
|   |           |               |          |          |        |

---

### Suggested run order for a demo dry-run
`0 → 1A → 2 (grab invite) → 1B → 3 → 5A → 4A/4B → 5B/5C → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 sweep`
