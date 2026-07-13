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
- **Design system check, every phase:** `apps/mobile/DESIGN_SYSTEM.md` is the canonical visual reference (tokens + a screen → Stitch-mockup map). Before checking off any phase that builds a new screen, open the matching `screen.png` in the Stitch export and eyeball the built screen against it — colors, spacing, component patterns (status dots not filled pills, hairline borders not shadows, etc.) should match. Update the map's row to ✅ when a screen is retrofitted/built to match.

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

**Post-commit verification pass caught a real gap:** `packages/database` had no `check-types` script, so `pnpm check-types` at the root was silently skipping it — meaning `seed.ts` had never actually been typechecked. Running `tsc --noEmit` directly inside `packages/database` surfaced ~60 errors: this repo's shared `tsconfig` sets `noUncheckedIndexedAccess: true`, so every Drizzle `.returning()` array-destructure and every computed array index (`flats[i]`, `residents[i]`) is `T | undefined`, not `T`. Fixed by adding a `one()` helper for single-row `.returning()` results, a `resident(i)` accessor with an explicit bounds check, explicit `SelectFlat[]`/`SelectUser[]` annotations, and switching the resident-seeding loop to `residentDefs.entries()` instead of index access. Re-verified: `tsc --noEmit` clean, and the seed script re-runs with identical output/row counts.

Also added `check-types` scripts to `apps/api`, `packages/services`, `packages/trpc`, and `packages/logger` — none of them had one, so the root `pnpm check-types` pipeline was only ever checking `mobile` and `web`. All four now typecheck clean. `apps/web` still fails on the pre-existing `react-resizable-panels` scaffold issue (out of scope, untouched).

**Also fixed while here:** `apps/mobile/tsconfig.json` had two latent TS errors unrelated to the schema work — `baseUrl` is deprecated under the TS 6 canary that ships with Expo SDK 57 (removed it, `paths` alone works fine with `moduleResolution: "bundler"`), and `global.css`'s side-effect import had no type declaration (added `css.d.ts` with `declare module "*.css"`). Confirmed via `pnpm check-types` at the root — `mobile` and `database` are clean. `apps/web` still fails typecheck on a pre-existing `react-resizable-panels` version mismatch from the original scaffold; left untouched since `apps/web` is explicitly out of scope for this build.

---

## Phase 2 — Backend Core: Auth, RBAC, Router Skeleton
**Day 2 (afternoon) – Day 3. Goal: any client can log in, get a role-scoped JWT, and call at least one protected endpoint per role.**

- [x] Add `bcrypt` (or `argon2`) + `jsonwebtoken` to `packages/services` or a new `packages/auth` package — added `bcryptjs` + `jsonwebtoken` + `@trpc/server` to `packages/services`
- [x] Implement `AuthService` (`packages/services/auth`): `login`, `refresh`, `logout`, `setPassword`, `signAccessToken`/`verifyAccessToken`, `getById`
  > Deviation: no `signRefreshToken`/`rotateRefreshToken` as JWTs — refresh tokens are opaque `crypto.randomBytes(32)` strings, SHA-256-hashed for DB lookup (deterministic hash, unlike bcrypt, so a direct `WHERE tokenHash = ?` lookup works). This is the standard pattern for high-entropy session tokens; bcrypt is for low-entropy passwords. Dropped the planned `REFRESH_TOKEN_SECRET` env var since it's unused under this design.
- [x] Update `packages/trpc/server/context.ts`: reads `Authorization: Bearer <token>`, verifies JWT via `authService`, soft-fails to `null` user on missing/invalid token
- [x] Update `packages/trpc/server/trpc.ts`: `protectedProcedure` (`UNAUTHORIZED` if no ctx user) + `residentProcedure`/`guardProcedure`/`adminProcedure` (`FORBIDDEN` on role mismatch), built via a shared `requireRole()` middleware factory
- [x] `packages/trpc/server/routes/auth/route.ts` additions: `login`, `refresh`, `logout`, `me`, `setPassword` — all with full OpenAPI meta, matching the existing convention
- [x] New router `packages/trpc/server/routes/admin/route.ts`: `adminProcedure` mutations `inviteResident`, `inviteGuard` (both return a random temp password + `mustResetPassword: true`), `deactivateUser` — logic lives in `UserService` (`packages/services/user`)
- [x] Stub out remaining routers: `towers`, `flats`, `residents`, `visitors`, `notices`, `polls`, `complaints`, `amenities`, `dues`, `staff-directory`, `notifications` — each an empty `router({})` with a comment pointing at the phase that fills it in
- [x] Register all new routers in `packages/trpc/server/index.ts`
- [x] Manually verify via `/docs` (Scalar UI) — confirmed `openapi.json` lists all 9 new auth/admin paths and `/docs` returns 200
- [x] `curl` smoke test covering: login as admin/guard/resident, wrong password (401), `/me` with no token (401), `/me` with valid token, guard/resident hitting `admin.inviteGuard` (403 each), admin hitting it (success), duplicate invite (409 CONFLICT), refresh token rotation + reuse-after-rotation (401), logout + reuse-after-logout (401) — every case behaved exactly as designed
- [x] Commit: `feat(auth): JWT auth, RBAC procedures, router skeleton`

**Bugs found and fixed during verification (not just typos — genuine behavioral bugs):**
- Boolean columns with a `.default()` but no `.notNull()` (`users.emailVerified/mustResetPassword/isActive`, `polls.multiSelect`, `amenities.isActive`, `staff_directory.isVerifiedByAdmin`) typed as `boolean | null` in Drizzle even though they're always populated — tightened all to `.notNull()` (new migration, reseeded) so the auth output schemas can be honestly non-nullable.
- `isUniqueConstraintError()` in `UserService` initially checked `err.code === "23505"` on the top-level thrown error — but drizzle-orm wraps the real `pg` `DatabaseError` as `err.cause`, so duplicate-invite errors were surfacing as raw 500s instead of a clean 409 `CONFLICT`. Confirmed the real shape with a throwaway probe script, fixed by checking `err.cause` recursively.
- **Process gotcha, not a code bug:** `apps/api`'s `tsx watch ./src/index.ts` only watches `apps/api/src/**` — edits to `packages/services`/`packages/trpc`/`packages/database` (consumed through a pnpm-symlinked `node_modules`) are silently ignored until the dev server is restarted. Cost real debugging time (a fix appeared not to work because the server was still running old code) — documented in the README so it doesn't recur in later phases.
- Also found and killed a stray `apps/api` process from the Phase 0 verification pass that had been squatting on port 8000 since Phase 0, silently serving stale (pre-auth) code the whole time — every later `pnpm dev` in this session had been silently failing with `EADDRINUSE` in the background.

---

## Phase 3 — Expo App Foundation
**Day 3 (afternoon) – Day 4. Goal: navigation shell, design system, and API/state plumbing exist before any real screen is built.**

- [x] Install `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query` in `apps/mobile`; create `apps/mobile/lib/trpc.ts` exposing a typed client using `RouterOutputs`/`RouterInputs`/`ServerRouter` from `@repo/trpc`
- [x] Build an `authLink`/custom `fetch` (`lib/trpc-client.ts`) that attaches the access token to every request, and on `401` tries one silent refresh (with in-flight de-duplication so concurrent 401s don't each trigger their own refresh) then retries once, else force-logout
- [x] Install `expo-secure-store`; auth tokens + user profile persist via a zustand `persist` middleware backed by a `secureStorage` adapter (`lib/secure-storage.ts`) rather than a separate hand-rolled storage module — one source of truth instead of two
- [x] Install `zustand`; `stores/auth-store.ts` (tokens, user, `hasHydrated`) and `stores/ui-store.ts` (toast state) — Zustand for client state, react-query (via tRPC) for all server state
- [x] Expo Router route groups: `app/(auth)/login.tsx`, `app/(auth)/set-password.tsx`, `app/(resident)/...`, `app/(guard)/...`, `app/(admin)/...`, root `app/index.tsx` redirect gate based on hydrated auth state + role
- [x] Design system primitives under `components/ui/`: `Button`, `Card`, `Input`, `StatusPill`, `EmptyState`, `LoadingScreen`, `Avatar`, `SectionHeader`
  > Deviation: skipped `Sheet`/`BottomModal` — nothing in Phase 3 needs it; will add in whichever later phase first needs a bottom sheet, per "don't build for hypothetical requirements."
- [x] `react-hook-form` + `zod` convention — login/set-password forms use `zodResolver` with `loginInputSchema`/`setPasswordInputSchema` imported directly from `@repo/services/auth/model` (added `@repo/services` as a mobile dependency), so client-side validation is provably identical to what the server enforces
- [x] Global `ErrorBoundary` (class component) + `components/toast.tsx` driven by `ui-store`, plus `lib/error-message.ts` to turn a `TRPCClientError` into a readable string
- [x] Bottom-tab navigators per role, each gated by `hooks/use-role-guard.ts` (redirects away if the hydrated user's role doesn't match the group): Resident (Home/Notices/Helpdesk/Amenities/Profile), Guard (Gate/Visitors/History/Profile), Admin (Dashboard/Society/Requests/More) — role-tinted accents from Phase 0's tailwind config
- [x] Login screen wired end-to-end to `auth.login`, storing the session and redirecting by role
- [x] Forced "set new password" screen for `mustResetPassword` users
- [x] **Smoke test on a real physical device** (not just emulator/web export) — logged in as admin/guard/resident with the seeded demo credentials, confirmed correct tab shell per role
- [x] Commit: `feat(mobile): app shell, navigation, design system, auth wiring`

**Unplanned but necessary: downgraded Expo SDK 57 → 54.** The user's installed Expo Go only supports the SDK version Expo Go itself ships with (SDK 54 at time of testing) — SDK 57 (what `create-expo-app@latest` scaffolded in Phase 0) is rejected outright with "Project is incompatible with this version of Expo Go." Fixed via `expo install expo@54` + `expo install --fix` (realigns every `expo-*`/`react-native`/`react` package to SDK-54-compatible versions) + a manual fix for `@expo/metro-runtime` (still pinned to the old version after `--fix`). Verified with a clean `tsc --noEmit` and `expo export --platform web` after the downgrade — both clean.

**Bug found during device testing (not just an SDK mismatch):** after the downgrade, the physical device got a 404 `UnableToResolveError` for `expo-router/entry` even though the exact same module resolved fine in `expo export`. Root cause: stale Metro bundler cache left over from repeatedly starting/stopping the dev server across the SDK 57→54 transition — `expo start --clear` (cache wipe) plus killing every stray process still bound to ports 8081/8082/8000 fixed it. Confirmed by curling the exact bundle URL the device requests before asking for a re-test, rather than guessing.

**Post-Phase-3 addendum: full visual design system retrofit.** After Phase 3 shipped with an ad-hoc light blue/amber/slate palette, the user generated a complete UI design system in Google Stitch (32 screens + a token spec) and asked for the app to match it exactly going forward. Retrofitted everything built so far to the new system:
- Added `apps/mobile/DESIGN_SYSTEM.md` — the canonical reference (colors, typography, radius, spacing, component patterns, and a screen→Stitch-mockup map covering all 32 generated screens, most still "pending" for later phases).
- Visual direction changed completely: dark-mode-only (no light theme), monochrome-plus-one-violet-accent (`#5e6ad2`), hairline borders instead of shadows, small consistent radius (6px buttons/inputs, 8px cards — Tailwind's default `rounded-md`/`rounded-lg` already match, no config override needed), status shown as a 6px dot + plain text instead of a filled colored pill.
- `tailwind.config.js`: replaced the old `resident`/`guard`/`admin` color trio with the exact Stitch token set, plus custom `fontSize` tokens (`headline-lg/md`, `body-md/sm`, `label-caps`, `meta-text`) matching the spec's type scale.
- Rebuilt every Phase 3 primitive (`Button`, `Card`, `Input`, `Avatar`, `EmptyState`, `LoadingScreen`, `SectionHeader`) plus two new ones the reference calls for: `StatusDot` (replaced the old filled `StatusPill`) and `RoleBadge` (the bordered uppercase RESIDENT/GUARD/ADMIN tag) and `ScreenHeader` (page title + role badge row, matching the mockups' per-screen header pattern rather than a single app-wide header).
- Rebuilt login, set-password, all three tab bars (dark, hairline top border, violet active icon, switched `Ionicons`→`MaterialIcons` to match the reference's Material Symbols look), the three landing screens (resident home, guard gate, admin dashboard) against their exact mockups, and the shared profile screen against `profile/code.html`.
- Verified with `tsc --noEmit` (clean) and `expo export --platform web` (clean) after the full retrofit, then restarted both dev servers with a cleared Metro cache for a device re-test.

---

## Phase 4 — Visitor & Gate Management (the headline feature)
**Day 4 (afternoon) – Day 6. Goal: the actual "gate conversation moves into the app" loop works end-to-end, then gets polished.**

### 4A. Walking skeleton (build this first, ugly is fine)
- [x] `visitors.create` (guard-only): takes a `flatNumber` (resolved server-side to a flat within the guard's society — no separate flat-search endpoint needed for the skeleton), visitor name/phone/type → creates a `pending` visitor row (`packages/services/visitor` + `routes/visitors/route.ts`)
- [x] `visitors.listPendingForResident` (resident-only): pending visitors for the caller's `flatId`
- [x] `visitors.decide` (resident-only): approve/reject → updates status/`decidedByUserId`/`decidedAt`; rejects with `FORBIDDEN` if the visitor isn't for the caller's flat, `CONFLICT` if already decided
- [x] `visitors.listForGuard` (guard-only): the calling guard's own requests (joined with `flats` for `flatNumber`), newest first, capped at 50
- [x] Guard screen (`app/(guard)/visitors.tsx`): type chips, delivery quick-fill brand chips, name/phone/flat-number fields → `visitors.create`
- [x] Resident screen (`app/(resident)/home.tsx`): real `listPendingForResident` query (5s poll) rendering `VisitorRequestCard`s with Approve/Reject → `visitors.decide`
- [x] Guard screen (`app/(guard)/gate.tsx`) reflects the decision via `listForGuard` polled every 4s — real push comes in Phase 10
- [x] **Milestone check — done live on the physical device + curl simulating the other side:** guard registered "Amazon Delivery" for flat A-101 on-device, request appeared in the Gate queue with an amber "Waiting" dot; approved via a curl call to `visitors.decide` as `resident1`; the Gate screen flipped to a green "Approved" dot within the 4s poll window with zero manual refresh — confirmed by the user watching it happen

**Backend verification (curl, before touching the UI):** guard creates a visitor for flat A-101 → resident1 (A-101) sees it in `listPendingForResident` → approves → guard's `listForGuard` reflects `approved` immediately → re-deciding the same visitor correctly fails `CONFLICT` (409) → a different resident (A-102) trying to decide on A-101's visitor correctly fails `FORBIDDEN` (403). All five checks passed before any screen was built, so the UI work was just wiring against an already-correct API.

---

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
