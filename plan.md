# Portl — Hackathon Build Plan

**Goal:** A production-feeling, mobile-first society management app (Expo + React Native) covering Resident, Security Guard, and Society Admin roles, backed by the existing tRPC monorepo (`apps/api` + `packages/database` + `packages/trpc`).

**Decisions locked in (from kickoff Q&A):**
- **Auth:** Email/Phone + Password, JWT access token + rotating refresh token, stored via `expo-secure-store`. No 3rd-party SMS/email vendor dependency — admin-driven onboarding (admin creates resident/guard accounts; no public self-signup), which also matches how real gated communities work.
- **Scope:** 100% Expo/React Native. `apps/web` (Next.js/shadcn) is left untouched and **not** part of this build — do not spend time on it.
- **Styling:** NativeWind (Tailwind for RN), mirroring the Tailwind conventions already used elsewhere in the repo.
- **Timeline:** 1–2 weeks. Phases below assume ~12 working days with 2 buffer days. If you're running shorter, see **Cut List** at the bottom — cut top-down, never partial-cut a phase.

**Core strategic call:** Visitor & gate approval is the headline feature ("the conversation that used to happen at the gate now happens in the app"). Phase 4 builds a thin, ugly, fully-working end-to-end vertical slice of that loop *before* any other feature gets polish. Everything else is built around a solid, working core.

---

## How to use this file
- Work top to bottom. Don't start a phase's polish steps until its "walking skeleton" step is checked off.
- Check items off as you go (`- [x]`). If you skip something intentionally, leave it unchecked and add a `> Skipped: reason` note rather than deleting it — useful for the README's "what we didn't get to" section.
- File paths referenced below are relative to the repo root `D:\Portl`.

---

## Phase 0 — Environment & Repo Foundations
**Day 1 (morning). Goal: everyone can run the whole stack locally in one command.**

- [x] Confirm Node ≥18, pnpm 9, and Expo CLI/EAS CLI installed (`pnpm dlx expo --version`, `pnpm dlx eas-cli --version`)
- [x] `docker-compose up -d` and confirm Postgres is reachable on `5432` (container `postgresdb` up, verified with `psql -c "select 1;"`)
- [x] Copy `.env` templates for `apps/api`, `packages/database`, `packages/services` — fill `DATABASE_URL`, `BASE_URL`, `PORT` (root `.env.example`/`.env` created, `pnpm env:sync` script added to copy into each package)
- [x] Run `pnpm install` at root, confirm `pnpm dev` boots `apps/api` cleanly and `/health` returns 200 (verified via `apps/api` dev server + `curl /health`)
- [x] Confirm `pnpm db:generate` / `pnpm db:migrate` work against the local Postgres (drizzle-kit) — ran both, verified the `users` table actually exists in Postgres via `psql \dt`
- [x] Create `apps/mobile` Expo app: `pnpm dlx create-expo-app@latest apps/mobile --template blank-typescript`
- [x] Wire `apps/mobile` into the pnpm workspace (already covered by `apps/*` glob in `pnpm-workspace.yaml` — confirmed `pnpm install` picks it up)
- [x] Install & configure **Expo Router** (file-based routing) in `apps/mobile`
- [x] Install **NativeWind** + Tailwind config in `apps/mobile` — verified via a clean `expo export --platform web` (Metro/Babel/NativeWind/Router all compile together); still do a real device/emulator visual check once Phase 3 screens exist
- [x] Add `apps/mobile` to root `turbo.json` pipeline (`dev`, `lint`, `check-types` tasks) and its own `package.json` scripts — turbo's task pipelines are already generic across packages by script name, so `mobile`'s new `dev`/`lint`/`check-types` scripts are picked up automatically
- [x] Add `EXPO_PUBLIC_API_URL` env convention for `apps/mobile` (`.env` + `.env.example`), pointing at local API (defaulted to this machine's LAN IP so physical devices can reach it)
- [x] Decide + document the "3 terminals" local dev flow in `README.md` skeleton: `docker-compose up`, `pnpm --filter @repo/api dev`, `pnpm --filter mobile dev`
- [x] Commit: `chore: bootstrap Expo app in monorepo`

**Also fixed while here:** `packages/services/env.ts` required `GOOGLE_OAUTH_*` vars even though we're not using Google OAuth (Phase 2 decision: email/phone + password only) — made them `.optional()` so the API doesn't crash on boot without them.

---

## Phase 1 — Domain Modeling & Database Schema
**Day 1 (afternoon) – Day 2. Goal: every entity in the spec exists as a Drizzle table with relations wired up.**

Add new files under `packages/database/models/`, export each from `packages/database/schema.ts` (currently only re-exports `user`).

- [x] `society.ts` — `societies` (id, name, address, city, createdAt) — supports multi-society even though we seed one
- [x] `tower.ts` — `towers` (id, societyId FK, name/code)
- [x] `flat.ts` — `flats` (id, towerId FK, flatNumber, floor, type)
  > Deviation: dropped `ownerUserId` from `flats` (the plan's original idea). `flats` → `users` would have created a circular import/FK with `users` → `flats` for no functional gain — the resident↔flat link is fully covered by `users.flatId` (many residents/family members can point at one flat), which is all Phase 4's "family members share a flat" flow needs.
- [x] Extend `user.ts`: add `role` enum (`resident | guard | admin`), `phone` (unique), `passwordHash`, `flatId` FK nullable (residents), `societyId` FK, `isActive`, `mustResetPassword` boolean (for first-login-after-invite flow)
- [x] `refresh-token.ts` — `refresh_tokens` (id, userId FK, tokenHash, expiresAt, revokedAt, deviceInfo) — supports rotation + logout-all-devices
- [x] `visitor.ts` — `visitors` (id, societyId FK, flatId FK, name, phone, photoUrl, type enum `guest|delivery|cab|service|other`, source enum `guard_initiated|resident_preapproved`, status enum `pending|approved|rejected|expired|checked_in|checked_out`, requestedByGuardId FK nullable, decidedByUserId FK nullable, validFrom/validUntil (for pre-approvals), createdAt, decidedAt)
- [x] `visitor-log.ts` — `visitor_logs` (id, visitorId FK, action enum `entry|exit`, guardId FK, occurredAt) — append-only movement ledger, separate from the visitor's current status for a clean history/audit trail
- [x] `notice.ts` — `notices` (id, societyId FK, authorId FK, title, body, targetScope enum `all|tower|flat`, targetTowerId nullable, targetFlatId nullable, publishedAt, expiresAt nullable)
- [x] `poll.ts` + `poll-option.ts` + `poll-vote.ts` — poll (question, description, multiSelect bool, closesAt), options (label), votes (pollId, optionId, userId, unique(pollId,optionId,userId) — exact-duplicate-row guard; single-vs-multi-select semantics enforced in the tRPC procedure in Phase 7, not the DB constraint)
- [x] `complaint.ts` — `complaints` (id, societyId FK, raisedByUserId FK, category, title, description, photoUrl, status enum `open|in_progress|resolved|closed`, priority enum `low|medium|high`, assignedToUserId FK nullable, createdAt, resolvedAt)
- [x] `complaint-comment.ts` — `complaint_comments` (id, complaintId FK, authorId FK, body, createdAt) — timeline/status thread
- [x] `amenity.ts` — `amenities` (id, societyId FK, name, description, imageUrl, capacity, openTime, closeTime, slotMinutes, isActive)
- [x] `amenity-booking.ts` — `amenity_bookings` (id, amenityId FK, flatId FK, bookedByUserId FK, date, slotStart, slotEnd, status enum `confirmed|cancelled`)
- [x] `due.ts` — `dues` (id, flatId FK, period e.g. "2026-07", amount, status enum `pending|paid|overdue`, dueDate)
- [x] `payment.ts` — `payments` (id, dueId FK, amount, provider, providerRefId, status enum `created|success|failed`, paidAt)
- [x] `staff-directory.ts` — `staff_directory` (id, societyId FK, name, category e.g. `plumber|electrician|maid|cook|other`, phone, photoUrl, isVerifiedByAdmin, addedByUserId FK)
- [x] `push-token.ts` — `push_tokens` (id, userId FK, expoPushToken, deviceInfo, createdAt) — unique(userId, expoPushToken)
- [x] `notification.ts` — `notifications` (id, userId FK, type, title, body, data jsonb, readAt nullable, createdAt) — in-app notification feed, independent of push delivery
- [x] Update `packages/database/schema.ts` to `export * from` every new model
- [x] Run `pnpm db:generate` (drizzle-kit generate) and review the generated SQL migration for sanity — 20 tables, 11 enum types, all FKs correct on first pass
- [x] Run `pnpm db:migrate` against local Postgres, confirm all tables exist (`psql \dt` or a GUI client) — verified all 20 tables live
- [x] Write `packages/database/seed.ts`: creates 1 society, 2 towers, 10 flats (2 left vacant), 1 admin, 2 guards, 8 residents (shared demo password), 1 pending + 1 checked-in + 1 pre-approved visitor (+ 1 visitor log entry), 2 notices, 1 open poll with 3 votes, 2 complaints (open w/ comment + resolved), 2 amenities with 1 booking, 1 pending due, 3 staff directory entries — full-reset-then-insert, so it's safely re-runnable
- [x] Add `db:seed` script to root `package.json` / `turbo.json`
- [x] Commit: `feat(db): full domain schema + seed script`

**Also fixed while here:** `apps/mobile/tsconfig.json` had two latent TS errors unrelated to the schema work — `baseUrl` is deprecated under the TS 6 canary that ships with Expo SDK 57 (removed it, `paths` alone works fine with `moduleResolution: "bundler"`), and `global.css`'s side-effect import had no type declaration (added `css.d.ts` with `declare module "*.css"`). Confirmed via `pnpm check-types` at the root — `mobile` and `database` are clean. `apps/web` still fails typecheck on a pre-existing `react-resizable-panels` version mismatch from the original scaffold; left untouched since `apps/web` is explicitly out of scope for this build.

---

## Phase 2 — Backend Core: Auth, RBAC, Router Skeleton
**Day 2 (afternoon) – Day 3. Goal: any client can log in, get a role-scoped JWT, and call at least one protected endpoint per role.**

- [ ] Add `bcrypt` (or `argon2`) + `jsonwebtoken` to `packages/services` or a new `packages/auth` package
- [ ] Implement `AuthService`: `hashPassword`, `verifyPassword`, `signAccessToken` (short-lived, ~15 min, claims: `sub`, `role`, `societyId`, `flatId`), `signRefreshToken` (long-lived, opaque + hashed in DB per `refreshToken.ts`), `rotateRefreshToken`, `revokeAllForUser`
- [ ] Update `packages/trpc/server/context.ts`: `createContext` now receives the Express req, reads `Authorization: Bearer <token>`, verifies JWT, loads `{ userId, role, societyId, flatId }` into context (soft-fail to `null` user, not a throw — let procedures decide)
- [ ] Update `packages/trpc/server/trpc.ts`: add `protectedProcedure` (throws `UNAUTHORIZED` if no ctx user), and role-scoped wrappers `residentProcedure`, `guardProcedure`, `adminProcedure` (throw `FORBIDDEN` on role mismatch)
- [ ] New router `packages/trpc/server/routes/auth/route.ts` additions: `login` (phone/email + password → access+refresh token pair), `refresh` (rotate), `logout` (revoke refresh token), `me` (returns current user profile), `setPassword` (first-login forced reset when `mustResetPassword`)
- [ ] New router `routes/admin/onboarding/route.ts`: `adminProcedure` mutations `inviteResident` (creates user + flat link + temp password, returns it for admin to relay), `inviteGuard`, `deactivateUser`
- [ ] Stub out remaining routers (empty routers wired into `serverRouter` so the shape exists early): `towers`, `flats`, `residents`, `visitors`, `notices`, `polls`, `complaints`, `amenities`, `dues`, `staffDirectory`, `notifications`
- [ ] Register all new routers in `packages/trpc/server/index.ts`
- [ ] Manually verify via `/docs` (Scalar UI, already wired) that login → protected endpoint works with a bearer token
- [ ] Write a short Postman/Thunder-client or `curl` smoke script covering login-as-admin, login-as-guard, login-as-resident, and one 403 case (resident hitting an admin-only route)
- [ ] Commit: `feat(auth): JWT auth, RBAC procedures, router skeleton`

---

## Phase 3 — Expo App Foundation
**Day 3 (afternoon) – Day 4. Goal: navigation shell, design system, and API/state plumbing exist before any real screen is built.**

- [ ] Install `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query` in `apps/mobile`; create `apps/mobile/lib/trpc.ts` exposing a typed client using `RouterOutputs`/`RouterInputs`/`ServerRouter` from `@repo/trpc`
- [ ] Build an `authLink`/custom `fetch` that attaches the access token from secure storage to every request, and a response interceptor that on `401` tries one silent `refresh` then retries once, else force-logout
- [ ] Install `expo-secure-store`; create `lib/auth-storage.ts` (get/set/clear access+refresh tokens)
- [ ] Install `zustand`; create `stores/auth-store.ts` (current user, role, hydration state) and `stores/ui-store.ts` (misc UI flags) — Zustand for client state, react-query (via tRPC) for all server state
- [ ] Set up Expo Router route groups: `app/(auth)/login.tsx`, `app/(auth)/set-password.tsx`, `app/(resident)/...`, `app/(guard)/...`, `app/(admin)/...`, root `app/_layout.tsx` that hydrates auth state and redirects to the correct group based on role
- [ ] Build the design system primitives under `components/ui/` (NativeWind-styled): `Button`, `Card`, `Input`, `Badge`/`StatusPill`, `EmptyState`, `Spinner/LoadingScreen`, `Avatar`, `Sheet/BottomModal`, `SectionHeader`
- [ ] Set up `react-hook-form` + `zod` resolver convention for all forms (reuse zod input schemas exported from `@repo/trpc` routers where possible so client validation == server validation)
- [ ] Build global `ErrorBoundary` + a tRPC error-to-toast helper (use `sonner`-equivalent for RN, e.g. a simple toast lib) so every mutation failure surfaces a readable message instead of a silent failure
- [ ] Build bottom-tab navigators per role (e.g. Resident: Home / Notices / Helpdesk / Amenities / Profile; Guard: Gate / Visitors / History / Profile; Admin: Dashboard / Society / Requests / More)
- [ ] Implement Login screen end-to-end against Phase 2's `auth.login`, storing tokens, redirecting by role
- [ ] Implement forced "set new password" screen for first login
- [ ] Smoke test: log in as seeded admin, guard, and resident on a device/emulator and confirm each lands on their own tab shell
- [ ] Commit: `feat(mobile): app shell, navigation, design system, auth wiring`

---

## Phase 4 — Visitor & Gate Management (the headline feature)
**Day 4 (afternoon) – Day 6. Goal: the actual "gate conversation moves into the app" loop works end-to-end, then gets polished.**

### 4A. Walking skeleton (build this first, ugly is fine)
- [ ] `visitors.create` (guard-only): guard searches/selects a flat, enters visitor name/phone/type → creates `visitor` row `status=pending`
- [ ] `visitors.listPendingForResident` (resident-only): returns pending visitor requests for the caller's flat
- [ ] `visitors.decide` (resident-only): approve/reject a pending visitor → updates status, `decidedByUserId`, `decidedAt`
- [ ] `visitors.listForGuard` (guard-only): live queue of requests raised by this guard with current status
- [ ] Guard screen: minimal form → submit → see request appear with status "Pending"
- [ ] Resident screen: minimal list of pending requests → Approve/Reject buttons
- [ ] Guard screen reflects the decision (poll with `refetchInterval` for now — real push comes in Phase 10)
- [ ] **Milestone check:** guard raises a request on one device, resident approves on another, guard sees "Approved" within a few seconds — confirm this before moving on

### 4B. Full guard-initiated flow
- [ ] Resident search: guard can search residents/flats by tower + flat number + resident name
- [ ] Visitor type selection with distinct UX per type: Guest / Delivery Partner / Cab / Service Staff / Other (icons, quick-fill common delivery brands as chips)
- [ ] Optional photo capture at the gate (`expo-camera` or `expo-image-picker`) uploaded and attached to the visitor record
- [ ] `visitors.markEntry` / `visitors.markExit` (guard-only) — writes to `visitor_logs`, updates visitor status to `checked_in` / `checked_out`
- [ ] Guard "Gate" home screen: live queue grouped by Pending / Approved-awaiting-entry / Checked-in

### 4C. Resident-initiated pre-approval
- [ ] `visitors.preApprove` (resident-only): resident pre-approves an expected guest/cab with name, phone, type, valid window (e.g. today 5–7pm) *before* they arrive
- [ ] Guard-side: when a visitor arrives claiming to be pre-approved, guard searches by name/phone and sees the pre-approval instantly (status auto-`approved`, just needs entry marked) — no need to call the resident
- [ ] Resident screen: "My Pre-Approvals" list (upcoming / expired / used)

### 4D. History & polish
- [ ] `visitors.history` (resident + guard + admin, scoped appropriately) with filters (date range, type, status)
- [ ] Resident "Visitor History" screen — past visitors to their flat
- [ ] Guard "Entry/Exit History" screen — full movement ledger for the day/date range, searchable
- [ ] Empty states ("No pending requests — you're all caught up"), loading skeletons, and pull-to-refresh on all visitor lists
- [ ] Handle edge cases: pre-approval expiry, resident rejects then visitor still shows up (guard sees "Rejected" clearly, cannot override), multiple family members in a flat all get the approval prompt (first responder wins, others see it resolved)
- [ ] Commit: `feat(visitors): full gate approval, pre-approval, entry/exit, history`

---

## Phase 5 — Guard Dashboard & Operations
**Day 6 (afternoon). Goal: guard's non-visitor daily tools.**

- [ ] Guard home dashboard: today's stats (visitors in, pending approvals, active pre-approvals expiring soon)
- [ ] Resident directory search (read-only, phone-masked unless needed) for guard to quickly find/verify a flat
- [ ] Shift-friendly UX: large tap targets, minimal typing, works one-handed (guard is standing at a gate, often with a visitor waiting)
- [ ] Commit: `feat(guard): dashboard + resident lookup`

---

## Phase 6 — Society Admin Dashboard
**Day 7 – Day 8. Goal: admin can fully operate the society from the phone.**

- [ ] Admin home: key metrics (total flats occupied, open complaints, pending dues, today's visitor count, upcoming amenity bookings)
- [ ] Towers CRUD (`towers.create/update/list/delete`)
- [ ] Flats CRUD, linked to towers (`flats.create/update/list/delete`)
- [ ] Residents management: list/search residents, invite new resident (ties into Phase 2 `inviteResident`), assign/reassign flat, deactivate resident
- [ ] Guards & staff-account management: invite guard, deactivate guard
- [ ] Amenities CRUD (name, schedule, capacity) — feeds Phase 8
- [ ] Notices CRUD — feeds Phase 7
- [ ] Polls CRUD — feeds Phase 7
- [ ] Complaints oversight: view all complaints, assign to staff, change status — feeds Phase 7
- [ ] Staff/service provider directory CRUD — feeds Phase 9
- [ ] Admin-side visitor oversight: read-only live feed of all gate activity across the society (great "wow" screen for judges — a real-time-feeling operations view)
- [ ] Commit: `feat(admin): society, people, and operations management`

---

## Phase 7 — Community: Notices, Polls, Helpdesk
**Day 8 (afternoon) – Day 9. Goal: the "WhatsApp group replacement" features.**

- [ ] Resident Notice Board: paginated feed, unread indicator, filter by "for my tower/flat" vs "society-wide"
- [ ] Resident Polls: active polls list, vote UI (single/multi-select), live results bar chart after voting, "closes in Xh" countdown
- [ ] Resident Helpdesk: raise complaint (category, description, optional photo), track status timeline, comment thread with admin/staff replies
- [ ] Push/in-app notification on: new notice published, new poll opened, complaint status change, complaint comment added (in-app `notifications` table now, real push in Phase 10)
- [ ] Commit: `feat(community): notices, polls, helpdesk`

---

## Phase 8 — Amenities Booking & Maintenance Dues
**Day 9 (afternoon) – Day 10. Goal: the two "money/scheduling" features that read as production-grade.**

- [ ] Amenities list (clubhouse, gym, pool, etc.) with schedule/capacity shown
- [ ] Slot picker UI (date + time slot) respecting `openTime/closeTime/slotMinutes` and existing bookings (prevent double-booking capacity overflow)
- [ ] `amenityBookings.create/cancel/myBookings` + admin view of all bookings per amenity/date
- [ ] Maintenance Dues: resident sees current + past dues per flat, status badges
- [ ] Payment flow: integrate Razorpay **test mode** checkout for a due → on webhook/callback mark `payments` row + `dues.status = paid`
  - [ ] **Fallback if time-constrained:** "Mark as Paid (Demo)" mock flow that still writes a real `payments` row — keep the schema/API real even if the gateway UI is mocked; note this clearly in the README
- [ ] Admin dues management: generate a due for a flat/period, view payment status across the society
- [ ] Commit: `feat(amenities,dues): booking flow + maintenance payments`

---

## Phase 9 — Staff & Service Provider Directory
**Day 10 (morning). Goal: resident-facing read view of admin-managed directory.**

- [ ] Resident "Society Directory" screen: browse staff/service providers by category, tap-to-call
- [ ] "Verified by society" badge for admin-vetted entries
- [ ] Commit: `feat(directory): resident-facing staff/service provider view`

---

## Phase 10 — Push Notifications & Real-Time Polish
**Day 10 (afternoon) – Day 11. Goal: the app feels alive without needing WebSockets.**

- [ ] Set up an EAS project (`eas init`) — **required** because Expo Go on Android no longer supports remote push notifications; you need a development build (`expo-dev-client`) or a real EAS build to test this phase
- [ ] `expo-notifications`: request permission, obtain Expo push token, register via `pushTokens.register` on login/app-foreground
- [ ] Add `expo-server-sdk` to `apps/api`; build a `NotificationService.sendPush(userId, {title, body, data})` that fans out to all of a user's registered tokens
- [ ] Wire push sends into: new visitor request → resident's flat occupants; visitor decision → requesting guard; new notice/poll → all residents (or scoped); complaint status change → complaint owner; amenity booking confirmation
- [ ] Tapping a push notification deep-links into the relevant screen (visitor request → approvals screen, complaint update → that complaint's thread)
- [ ] Keep the react-query `refetchInterval` fallback on the guard queue and resident approvals list — belt-and-suspenders so a missed/delayed push never breaks the demo
- [ ] In-app notification bell/inbox screen backed by the `notifications` table (mark read, list)
- [ ] Commit: `feat(notifications): push delivery + in-app inbox + deep links`

---

## Phase 11 — Mobile UX Polish
**Day 11 (afternoon) – Day 12. Goal: this stops looking like a hackathon project.**

- [ ] Pass over every screen for: loading state, empty state, error state (not just happy path) — use the `EmptyState`/`Spinner` primitives from Phase 3 everywhere
- [ ] Consistent haptics on key actions (approve visitor, submit form) via `expo-haptics`
- [ ] Pull-to-refresh on every list screen
- [ ] Form validation error messages are specific and inline, not generic alerts
- [ ] Offline/network-error handling: distinguish "no internet" from "server error" from "unauthorized"
- [ ] App icon, splash screen, and consistent color/typography scale across all 3 roles (same design system, role-tinted accent color is a nice touch: e.g. resident=blue, guard=amber, admin=slate)
- [ ] Basic accessibility pass: tap target sizes, contrast, screen-reader labels on icon-only buttons
- [ ] Performance pass: verify list screens (visitor history, notices) use `FlashList`/`FlatList` properly (no unbounded re-renders), images are reasonably sized
- [ ] Commit: `polish: loading/empty/error states, a11y, perf`

---

## Phase 12 — QA, Seed Data & Demo Rehearsal
**Day 12 (afternoon) – Day 13 (morning). Goal: nothing embarrassing happens during the live/recorded demo.**

- [ ] Re-run `db:seed` against a clean database; confirm demo credentials for all 3 roles work
- [ ] Write and execute a manual test script covering every "must support" bullet in the original brief — check each one off explicitly:
  - [ ] Visitor entry requests
  - [ ] Visitor approval and rejection
  - [ ] Guest pre-approval
  - [ ] Delivery partner approvals
  - [ ] Entry and exit logs
  - [ ] Visitor history
  - [ ] Society notices
  - [ ] Polls
  - [ ] Helpdesk complaints + status tracking
  - [ ] Amenity booking
  - [ ] Admin management of towers/flats/residents/amenities/notices/polls/complaints/staff
  - [ ] Guard: register visitor, search residents, raise approval, verify approval, mark entry, mark exit, view history
  - [ ] Role-based access (resident cannot reach admin/guard screens and vice versa — test by trying, not just by UI hiding tabs)
- [ ] Test on both a physical Android device and iOS (simulator is fine if no iPhone) — Expo's cross-platform promise needs to actually hold up
- [ ] Fix P0/P1 bugs found; log anything P2/cosmetic to a "known issues" list for the README instead of chasing it under time pressure
- [ ] Draft the demo script/storyboard: which 3–4 flows to show, in what order, on which role, to tell the "gate conversation moves into the app" story in under 3 minutes
- [ ] Commit: `test: manual QA pass, bug fixes`

---

## Phase 13 — Deployment & Submission Package
**Day 13 (afternoon) – Day 14. Goal: everything the rubric explicitly asks for exists and is easy to find.**

- [ ] Deploy `apps/api` + Postgres somewhere reachable (Railway/Render/Fly.io — pick whichever is fastest to stand up) so the APK/demo doesn't depend on your laptop being on
- [ ] Point `apps/mobile`'s production env at the deployed API URL
- [ ] Build with EAS: `eas build --platform android --profile preview` → produce an installable APK
- [ ] (If time allows) `eas build --platform ios` and/or publish an Expo Go-loadable dev build link as a fallback
- [ ] Write the final `README.md` (root or `apps/mobile/README.md`, whichever the judges will find first) covering:
  - [ ] Project overview + problem statement (borrow from the brief, in your own words)
  - [ ] Architecture diagram/summary (Expo app ↔ tRPC/Express API ↔ Postgres/Drizzle)
  - [ ] Setup instructions (clone, `pnpm install`, `docker-compose up`, migrate, seed, run)
  - [ ] Demo credentials for Resident / Guard / Admin
  - [ ] Feature checklist mapped to the brief (reuse Phase 12's checklist)
  - [ ] Known issues / what's intentionally out of scope
- [ ] Take screenshots: at least one per role's home screen, the visitor approval flow (both sides), admin dashboard, notices, polls, helpdesk, amenities booking — organize under `docs/screenshots/`
- [ ] Record the demo video: script from Phase 12, screen-record on device (or emulator), keep it tight, narrate the "gate conversation → app" story explicitly since that's the judged narrative hook
- [ ] Push everything to a **public** GitHub repo, confirm a fresh clone + the README's setup steps actually works (get someone else to try it if possible)
- [ ] Final submission checklist:
  - [ ] Public GitHub repo ✅
  - [ ] Expo project buildable + APK attached ✅
  - [ ] Demo video ✅
  - [ ] README with setup instructions ✅
  - [ ] Screenshots ✅
  - [ ] Demo credentials ✅

---

## Stretch Goals (only if Phases 0–13 are done early)
- [ ] Real-time gate feed via WebSocket/tRPC subscriptions instead of polling
- [ ] Family/multi-resident-per-flat approval routing (notify all, first response wins — already noted as edge case in 4D, could get richer UX)
- [ ] Visitor face-photo shown to resident in the push notification itself (rich push)
- [ ] Society-wide announcements via SMS/WhatsApp fallback for residents without the app (would need a vendor — flagged during kickoff as explicitly avoided for the demo-critical path, but fine as a "vision" slide)
- [ ] Admin analytics: visitor traffic charts, complaint resolution time, dues collection %
- [ ] Dark mode
- [ ] Bonus: revisit `apps/web` as a companion admin web dashboard reusing the same tRPC API (explicitly deferred per kickoff decision — only touch this after everything above is solid)

## Cut List (if running out of time, cut from the top down)
1. Razorpay real integration → mock "Mark as Paid" (keep schema/API real)
2. Amenities booking capacity/slot conflict logic → simplify to "one booking per flat per day"
3. Push notifications → rely on polling fallback only, be upfront about it in the README
4. Polls → cut multi-select, ship single-choice only
5. Staff directory verification badge / admin CRUD polish → ship as read-only seeded data
6. iOS build → ship Android APK only, note iOS as "buildable via Expo, not packaged for this submission"

Never cut: visitor approval flow (4A/4B), auth/RBAC, admin CRUD for towers/flats/residents, README + demo video + screenshots + credentials.
