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
- [x] Resident/flat search: `residents.search` (guard-only, `packages/services/resident`) matches by flat number OR resident name within the guard's society, joined flats↔towers↔users, grouped by flat — `FlatSearchField` gives search-as-you-type with a 300ms debounce and a select-to-fill UX (`app/(guard)/visitors.tsx`), replacing 4A's blind flat-number text entry
  > Deviation: `visitors.create` input changed from `flatNumber` (string, resolved server-side) to `flatId` (uuid, selected from search results) — cleaner and avoids re-resolving a string the guard already picked from a validated list.
- [x] Visitor type selection: icon chips (Delivery/Guest/Cab/Service/Other) + delivery quick-fill brand chips (Amazon/Zomato/Swiggy/Flipkart) — carried over from 4A, already matched this spec
- [x] Optional photo capture: `expo-image-picker` (camera) + `expo-image-manipulator` (resize to 400px wide, JPEG quality 0.5) → base64 data URL sent directly in `visitors.create`'s `photoBase64` field, stored as-is in `visitors.photo_url` (`text` column, no size limit) — no file storage infra needed for hackathon scope
- [x] `visitors.markEntry` / `visitors.markExit` (guard-only): validate the current status first (`approved`→`checked_in`, `checked_in`→`checked_out`), write a `visitor_logs` row, update the visitor's status — wrong-transition attempts fail `CONFLICT` with a message naming the required status
  > Deviation: `listForGuard` broadened from "this guard's own requests" to "all requests in the guard's society" — a real gate has multiple guards sharing one queue across shifts; scoping to `requestedByGuardId` would hide a visitor from the guard who didn't personally register it.
- [x] Guard "Gate" home screen: live queue grouped into Pending / Approved — awaiting entry / Checked in via `GroupLabel` sections, each row showing a `Mark Entry`/`Mark Exit` button contextual to its group, still polling every 4s

**Backend verification (curl, fresh instance + reseed):** `residents.search` matches both by flat number ("A-1" → A-101, A-102) and resident name ("Priya" → A-101 only). Full lifecycle on a new visitor: `markEntry` before approval correctly fails `CONFLICT` ("must be approved"); resident approves; `markEntry` succeeds → `checked_in`; `markEntry` again correctly fails `CONFLICT` ("must be approved, currently checked_in"); `markExit` succeeds → `checked_out`; `markExit` again correctly fails `CONFLICT`. Every valid transition succeeded and every invalid one was blocked with a message naming the required state — the state machine has no gaps.

### 4C. Resident-initiated pre-approval
- [x] `visitors.preApprove` (resident-only): name, phone, type, `validFrom`/`validUntil` → creates a visitor row with `source: resident_preapproved`, auto-`approved` (no gate decision needed), rejects `validUntil <= validFrom` with `BAD_REQUEST`
- [x] Guard-side: `visitors.searchPreApproved` (guard-only) matches by name or phone within the guard's society, scoped to `approved` + non-expired (`validUntil IS NULL OR validUntil > now`) — guard taps a result and calls the existing `markEntry`, no resident call needed. Expired pre-approvals are both hidden from search *and* rejected by `markEntry` with a clear "This pre-approval has expired" message if somehow reached directly — two independent layers, not just a UI filter
- [x] Resident screen: "My Pre-Approvals" (`app/(resident)/pre-approvals.tsx`) grouped Upcoming (green) / Used (neutral, checked-in or checked-out) / Expired (amber), reached from a link on the Pre-approve screen; the Pre-approve form itself (`app/(resident)/pre-approve.tsx`) uses `@react-native-community/datetimepicker` time pickers for the valid window, defaulting to now → now+2h
  > Both new resident screens are registered in `app/(resident)/_layout.tsx` with `options={{ href: null }}` — navigable via `router.push` but hidden from the tab bar, since they're reached from the Home quick-action tile, not their own tab. Guard's new `check-preapproved.tsx` screen follows the same pattern, replacing the previously-disabled "Scan Pass" placeholder button on the Gate screen.

**Backend verification (curl, fresh instance + reseed):** pre-approve "Rohan Guest" for a 2-hour window → auto-`approved` immediately; a reversed window (`validUntil` before `validFrom`) correctly fails `BAD_REQUEST`; resident's own list shows it; guard searches "Rohan" and finds it; guard calls `markEntry` directly with zero resident interaction → `checked_in`. Separately, pre-approved someone with a `validUntil` already in the past: guard search for their name returns an empty array (filtered out), and calling `markEntry` with the visitor's ID directly still correctly fails `CONFLICT` ("This pre-approval has expired") — confirming the expiry check isn't just cosmetic filtering, it's enforced at the mutation layer too.

### 4D. History & polish
- [x] `visitors.history`: **one** `protectedProcedure` (not three role-specific endpoints) — branches on `ctx.user.role` inside the resolver: resident → scoped to their `flatId`, guard/admin → scoped to their `societyId`. Filters: `type`, `status`, `fromDate`, `toDate`. Enriched with `entryAt`/`exitAt` pulled from `visitor_logs` (batched `inArray` lookup, not N+1) — `markEntry`/`markExit` now also return the exact log timestamp inline instead of a DB round-trip
- [x] Resident "Visitor History" screen (`app/(resident)/visitor-history.tsx`) — status filter chips, reached via a "View All" link next to Home's "Pending Approvals" header (matching the mockup's link pattern), `href: null` in the tab layout
- [x] Guard "Entry/Exit History" screen — replaced the `history.tsx` tab placeholder directly (it was already a visible tab) with a real search box (client-side name/flat filter — `history`'s filters don't include free-text search) + the same status filter chips, `showFlat` on each row since guard sees the whole society
- [x] Empty states, and pull-to-refresh were already present everywhere from Phases 4A–4C; this phase's polish gap was **premature empty-state flashes** — every list screen showed "No X yet" for a frame before its first fetch resolved (`data ?? []` is `[]` during `isLoading`). Added an explicit `query.isLoading` guard (spinner instead of the list/empty-state) to all 5 screens driven by `useQuery`: Home, Gate, both History screens, My Pre-Approvals. (`check-preapproved.tsx` was already correct — its empty state is gated behind `debounced.length > 0`, so it never flashes.)
- [x] Edge cases — all three re-verified fresh via curl with real scenarios, not just reasoned about:
  - Pre-approval expiry: already covered in 4C (two independent layers — hidden from search, rejected by `markEntry`)
  - Rejected visitor still shows up to the guard with a clear "Rejected" status dot, and `markEntry` correctly refuses to override it (`CONFLICT`, "must be approved")
  - Multi-resident-per-flat: used `admin.inviteResident` to add a second real account to flat A-101, confirmed both residents see a new request as pending, the first to decide wins, the second's `decide` call correctly fails `CONFLICT` ("already been decided"), and the second's pending list correctly no longer shows it
- [x] Commit: `feat(visitors): full gate approval, pre-approval, entry/exit, history`

**Phase 4 complete.** The headline feature — "the conversation that used to happen at the gate now happens in the app" — is fully built and verified: guard-initiated requests with live cross-device approval (4A), full search/photo/entry-exit lifecycle (4B), resident-initiated pre-approval with zero-call gate check-in (4C), and history/polish/edge-case hardening (4D). Every endpoint has been curl-verified fresh at least once after the mobile build, and the core loop (4A) and full guard flow + pre-approval (4B/4C) were also confirmed live on the user's physical device.

---

## Phase 5 — Guard Dashboard & Operations
**Day 6 (afternoon). Goal: guard's non-visitor daily tools.**

- [x] Guard home dashboard stats: the Gate screen's stat row grew from 2 tiles to 3 — Pending / Checked In / **Expiring Soon** (pre-approvals with `validUntil` inside the next 2 hours), computed client-side from the same `listForGuard` data already being polled — no new endpoint needed, since society-wide `listForGuard` already includes `resident_preapproved` rows with their `validUntil`
- [x] Resident directory search (`app/(guard)/resident-directory.tsx`, `href: null`, reached via a new button on Gate): reuses `residents.search` from Phase 4B as-is on the backend. Phone numbers are masked by default (`+91••••••0010`) with tap-to-reveal, and a Call button (`Linking.openURL('tel:...')`) works against the real number regardless of the masked display state
  > Bug found and fixed during verification: `residents.search` only matched flat number or resident name — searching by phone (explicitly promised by the mockup: "Search by Flat Number, Name, or Phone") returned nothing. Added `ilike(usersTable.phone, like)` to the `or(...)` clause. Re-verified all four paths fresh (phone digits, flat number, resident name, vacant flat) — no regression on the three that already worked, phone now works too.
- [x] Shift-friendly UX: audited existing components rather than rebuilding — `Button` (`py-2.5`, ~40px tall) and the directory's Call button (explicit `44x44` + `hitSlop`) already meet reasonable tap-target sizing; "minimal typing" was already satisfied by Phase 4B's search-and-select flat picker and quick-fill delivery-brand chips, which this phase's directory search follows the same pattern for
- [x] Commit: `feat(guard): dashboard + resident lookup`

**Phase 5 re-verified fresh (independent pass — full restart, reseed, typecheck, curl + on-device):** killed the live API process and restarted clean, reseeded the DB, ran a full `pnpm check-types` (all in-scope packages clean; `apps/web`'s pre-existing `react-resizable-panels` scaffold error is the only failure, unrelated and out of scope). Curl-verified against fresh seed data: `residents.search` matches on flat number ("A-1"), resident name ("Priya"), and phone digits ("0010") — all three return correct results. Created a brand-new pre-approval with `validUntil` 45 minutes out; it correctly appears in `visitors.mine` (guard queue) with the exact shape (`source: resident_preapproved`, `status: approved`, future `validUntil` < 2h) the Gate screen's client-side `expiringSoon` filter checks. RBAC re-confirmed: resident and admin tokens both get `403` on `residents.search` and `visitors.mine`. On-device: user confirmed the Gate screen's "Expiring Soon" tile now shows correctly after a bundle reload (initial no-show was a stale Metro bundle on-device, not a code bug), and Resident Directory search/mask/reveal/call/vacant-flat behavior all confirmed working. **Phase 5 is fully done.**

---

## Phase 6 — Society Admin Dashboard
**Day 7 – Day 8. Goal: admin can fully operate the society from the phone.**

- [x] Admin home: key metrics (total flats occupied, open complaints, pending dues, today's visitor count, upcoming amenity bookings) — new `admin.metrics` endpoint (`packages/services/admin`), wired into `dashboard.tsx`'s stat row
- [x] Towers CRUD (`towers.create/update/list/delete`) — blocks deleting a tower that still has flats (`CONFLICT`)
- [x] Flats CRUD, linked to towers (`flats.create/update/list/delete`) — blocks deleting a flat with residents still assigned; list includes live `residentCount`/`towerName`
- [x] Residents management: list/search residents, invite new resident (reuses Phase 2 `admin.inviteResident`), assign/reassign flat (new `admin.reassignResidentFlat`), deactivate resident
- [x] Guards & staff-account management: invite guard (reuses Phase 2 `admin.inviteGuard`), deactivate guard, `admin.listGuards`
- [x] Amenities CRUD (name, schedule, capacity) — feeds Phase 8
- [x] Notices CRUD — feeds Phase 7
- [x] Polls CRUD (create with options, close early, delete with cascade cleanup of votes/options) — feeds Phase 7
- [x] Complaints oversight: view all complaints (with raiser name + flat via join), assign to a guard, advance status — feeds Phase 7
- [x] Staff/service provider directory CRUD (including verified-badge toggle) — feeds Phase 9
- [x] Admin-side visitor oversight: read-only live feed of all gate activity across the society — reuses the existing `visitors.history` endpoint (already branches to `societyId` scope for non-resident roles from Phase 4D), polled every 5s on the Dashboard tab
- [x] Commit: `feat(admin): society, people, and operations management`

**New backend, one router per entity (all `adminProcedure`, scoped to the caller's `societyId`):** `packages/services/{tower,flat,amenity,notice,poll,complaint,staff-directory,admin}` + matching `packages/trpc/server/routes/{towers,flats,amenities,notices,polls,complaints,staff-directory}/route.ts`, plus `listResidents`/`listGuards`/`reassignResidentFlat`/`metrics` added to the existing `admin` router. Resident-facing read/interact endpoints for notices/polls/amenities/staff-directory are explicitly deferred to Phases 7–9 per the original plan — Phase 6 only builds the admin write-side.

**Deviations found and fixed during backend build:**
- `createNoticeInputSchema`'s `.refine()` calls crashed the API on boot — `trpc-to-openapi`'s doc generator calls `.omit()` internally, which zod v4 disallows on refined schemas. Moved the tower/flat-required-for-scope validation from the zod schema into `NoticeService.create` (throws `BAD_REQUEST` there instead) — confirmed no other service used `.refine()`.
- `drizzle-orm`'s `alias()` (needed in `ComplaintService` to join `users` twice, for raiser and assignee) isn't re-exported by the root `drizzle-orm` package — added `export { alias } from "drizzle-orm/pg-core"` to `packages/database/index.ts` rather than adding a direct `drizzle-orm` dependency to `packages/services` (keeps the existing "all drizzle access goes through `@repo/database`" convention).
- `noUncheckedIndexedAccess` caught two real bugs during typecheck: `TowerService.update/remove` and `FlatService.update/remove` destructured `const [{ count }] = await db.select(...)` directly, which is unsound since the array could theoretically be empty — switched to `const [row] = ...` with `row?.count ?? 0`.

**Backend verification (curl, fresh instance + reseed, before any mobile screen was touched):** logged in as admin and swept all 10 new/extended list endpoints (`admin/metrics`, `towers`, `flats`, `admin/residents`, `admin/guards`, `amenities`, `notices`, `polls`, `complaints`, `staff-directory`) — all return `200` against fresh seed data with correct joins (e.g. complaints show `raisedByName`/`flatNumber`/`assignedToName` resolved, not raw IDs). Mutation coverage: created a tower + flat, renamed the tower, confirmed tower-delete is blocked with a flat present (`409`) and succeeds once the flat is removed; reassigned a resident to a vacant flat; created/closed/deleted a poll; created/updated/deleted a staff entry; created/updated(deactivated)/deleted an amenity; confirmed a flat-scoped notice without `targetFlatId` correctly fails `BAD_REQUEST` before creating a valid all-scope notice and deleting it; assigned a complaint to a guard and advanced its status. RBAC re-confirmed on every new admin-only endpoint: resident and guard tokens both get `403`.

**Mobile:** built against the exact Stitch mockups (`manage_society`, `towers_management`, `flats_management`, `residents_management`, `guards_management`, `amenities_management`, `notices_management`, `polls_management`, `complaints_oversight`) — `society.tsx` is the "Management Hub" (grouped Infrastructure/People/Communications sections with live counts, linking to 8 new `href: null` detail screens: `towers.tsx`, `flats.tsx`, `residents.tsx`, `guards.tsx`, `amenities.tsx`, `notices.tsx`, `polls.tsx`, `staff.tsx`), `requests.tsx` is Complaints Oversight (search + status filter chips + expandable detail with assign/advance-status), and `dashboard.tsx`'s stat row + "Live Activity" feed are now wired to real data instead of the Phase 3 placeholder. Each management screen follows the mockup's list-plus-inline-form pattern (no separate modal) with `Alert.alert` confirmation before any delete. Verified: `pnpm check-types` at the root clean for mobile (plus every backend package), `expo export --platform web` bundles clean (1036 modules, no errors).

**Bugs found and fixed during on-device testing:**
- Dashboard's 4-tile stat grid used `flex-row flex-wrap` + `min-w-[45%] flex-1`, a pattern that misreports its own height on React Native — the "Live Activity" section rendered on top of row 2 of the stat tiles instead of below them. Fixed by rebuilding as an explicit 2×2 grid (two `flex-row` rows of exactly 2 items each, no wrap). Found and fixed the identical latent bug in the Resident Home "Quick Actions" grid (Phase 3/4), which used the same pattern and would have hit the same overlap once anything was added below it.
- Deactivating a resident/guard was a dead end — there was no way to reactivate them afterward, so "reassign flat, then deactivate option not showing" was actually "deactivate hides forever, as coded." Added `admin.activateUser` (mirrors `deactivateUser`), wired an "Activate" button into both Residents and Guards management. Verified the full deactivate → reassign → activate sequence via curl end-to-end.
- Resident reassignment was restricted to vacant flats only, which contradicts the data model (Phase 4D already supports multiple residents per flat, e.g. family members). Broadened both the "Invite Resident" and "Reassign Flat" pickers to show all flats with an occupancy count, confirmed reassigning into an already-occupied flat works.

Re-verified after fixes: `pnpm check-types` clean across services/trpc/mobile, fresh curl sweep of activate/deactivate/reassign cycle (including RBAC — resident/guard get `403` on `admin.activateUser`), `expo export --platform web` clean, and a from-scratch Metro restart (two stale competing dev-server processes were found and killed — the user's phone was connected to the stale one).

**User confirmed working on-device** (2026-07-14). Remaining polish (form/keyboard feel, exact pixel match against Stitch mockups) deferred to a later full manual workflow pass, per user's explicit call. **Phase 6 is fully done.**

---

## Phase 7 — Community: Notices, Polls, Helpdesk
**Day 8 (afternoon) – Day 9. Goal: the "WhatsApp group replacement" features.**

- [x] Resident Notice Board: paginated feed (`notices.listForResident`, `limit`/`offset`), unread indicator, filter by "for my tower/flat" vs "society-wide" (client-side, using each notice's returned `targetScope`)
- [x] Resident Polls: active polls list, vote UI (single/multi-select), live results bar chart after voting, "closes in Xh" countdown
- [x] Resident Helpdesk: raise complaint (category, description, optional photo via `capture-visitor-photo`), track status timeline, comment thread with admin/staff replies
- [x] Push/in-app notification on: new notice published, new poll opened, complaint status change, complaint comment added — new `packages/services/notification` (`NotificationService`), in-app `notifications` table populated now; the bell/inbox UI to actually browse them is explicitly Phase 10's job (per this bullet's own note), so nothing to build in the app yet beyond the read-tracking Notices already needs
- [x] Commit: `feat(community): notices, polls, helpdesk`

**Backend:** `NotificationService.notify(userIds, {...})` is the generic fan-out primitive, plus purpose-built helpers (`notifyNoticePublished`, `notifyPollOpened`, `notifyComplaintStatusChanged`, `notifyComplaintComment`) called from the relevant `trpc` route handlers right after the primary mutation succeeds — kept out of `NoticeService`/`PollService`/`ComplaintService` themselves so those stay self-contained, matching how no other service in this codebase calls another service directly. Notice read-tracking reuses the same `notifications` table (no separate `notice_reads` table): a notice is "unread" if a `type: "notice"` row exists for that user with `data.noticeId` matching and `readAt IS NULL`; `notices.markRead` flips it. New endpoints: `notices.listForResident`/`markRead`, `polls.listForResident`/`vote`, `complaints.create`/`mine`/`listComments`/`addComment`.

> Deviation: Helpdesk's "status timeline" renders from the fields the schema already has (`createdAt`, `assignedToName`, `resolvedAt`) rather than a full timestamped audit log of every status transition — adding a `complaint_status_history` table for a hackathon-scope timeline wasn't worth the extra migration/complexity. Comments are visible to the raising resident, any guard, and any admin (not restricted to the assigned guard specifically), since the schema has no per-complaint guard-assignment restriction beyond `assignedToUserId`, and over-restricting would just make the demo harder to show.

> Deviation: Polls has no dedicated resident-facing tab (the Stitch mockup's bottom nav has a generic "Services"/"Alerts" split that doesn't match this app's actual tab set from Phase 3: Home/Notices/Helpdesk/Amenities/Profile). Reachable instead via a "Community Polls" link at the top of the Notices tab (`app/(resident)/polls.tsx`, `href: null`) — keeps the existing 5-tab IA intact rather than overcrowding the tab bar or restructuring navigation this late.

**Backend verification (curl, fresh instance + reseed):** notice fan-out confirmed end-to-end — admin publishes an all-scope notice, resident's `notices.listForResident` shows it `isRead: false`, `markRead` flips it to `true`, pre-existing seeded notices (published before this notification history existed) correctly default to "read" (fail-safe, not a false "unread" badge forever). Poll voting: single-select poll correctly rejects a 2-option submission (`BAD_REQUEST`), a second vote attempt by the same resident correctly fails (`CONFLICT`), voting on a closed poll correctly fails (`CONFLICT`), and `myVote` correctly reflects both a fresh API-driven vote and a resident's pre-existing seeded vote. Helpdesk: resident raises a ticket, appears in their `mine` list; a non-raising resident correctly gets `FORBIDDEN` trying to view its comments; admin and the raiser can both comment and both see the full thread. RBAC re-confirmed: guard gets `403` on every new resident-only endpoint (`notices.listForResident`, `polls.vote`, `complaints.create`).

**Mobile:** `app/(resident)/notices.tsx` (search + unread-dot list + relative timestamps, matching the `notices` mockup), `app/(resident)/polls.tsx` (Active/Voted/Closed sections, radio vs. checkbox icons for single vs. multi-select, accent-filled result bars matching the `polls` mockup), `app/(resident)/helpdesk.tsx` (raise-ticket form with category chips + optional photo, tap-to-expand ticket detail with a simple timeline + comment thread, matching the `helpdesk` mockup's structure). Verified: `pnpm check-types` clean across services/trpc/api/mobile, `expo export --platform web` clean.

**Bug found and fixed (self-tested, not caught by curl alone):** the admin's Complaints Oversight screen (`app/(admin)/requests.tsx`, built in Phase 6 before the comment backend existed) never had any UI to view or add comments — it only showed description/assign/status. The backend (`complaints.listComments`/`addComment`) worked correctly the whole time, but nothing on the admin side called it, so a resident's comment/update was invisible to admin no matter how correct the API was. Added the same comment-thread-plus-reply-input pattern already used on the resident's Helpdesk screen. Verified by simulating the full round trip via curl end-to-end: resident raises a ticket → resident adds a comment → **admin's exact query** (`complaints.listComments`) returns it → admin replies → **resident's exact query** returns both messages. `pnpm check-types` and `expo export --platform web` both clean after the fix.

**User confirmed working on-device** (2026-07-14).

**Phase 7 re-verified fresh (independent pass — full restart, reseed, root `pnpm check-types`, curl sweep):** killed the live API, restarted clean, reseeded the DB. Root typecheck: all 6 in-scope packages clean (`apps/web`'s pre-existing `react-resizable-panels` scaffold error is the only failure, unrelated/out of scope, unchanged since Phase 1). Fresh curl sweep against reseeded data: notice fan-out + unread→read transition confirmed (`isRead: false` → `mark-read` → `isRead: true`); poll vote succeeds, a second vote by the same resident correctly fails `409`; helpdesk round trip re-confirmed end-to-end (resident comment visible to admin, admin reply visible to resident) — the exact bug reported and fixed above did not regress. RBAC re-confirmed on every resident-only Phase 7 endpoint: guard gets `403` on `notices.listForResident`, `polls.vote`, and `complaints.create`. **Phase 7 is fully done.**

---

## Phase 8 — Amenities Booking & Maintenance Dues
**Day 9 (afternoon) – Day 10. Goal: the two "money/scheduling" features that read as production-grade.**

- [x] Amenities list (clubhouse, gym, pool, etc.) with schedule/capacity shown
- [x] Slot picker UI (date + time slot) respecting `openTime/closeTime/slotMinutes` and existing bookings (prevent double-booking capacity overflow)
- [x] `amenityBookings.create/cancel/myBookings` + admin view of all bookings per amenity/date
- [x] Maintenance Dues: resident sees current + past dues per flat, status badges
- [x] Payment flow: **used the Cut List's own fallback from day one** — "Mark as Paid (Demo)" mock flow (`dues.payMock`) that still writes a real `payments` row (`provider: "mock"`, `status: "success"`, a generated `providerRefId`) and flips `dues.status` to `paid`. Given how much build surface remains (Phases 9–13) for a hackathon timeline, real Razorpay test-mode integration wasn't worth the setup/webhook-plumbing time against a cut the plan already pre-approved; the schema/API stayed fully real per the fallback's own instruction — only the checkout gateway itself is mocked.
- [x] Admin dues management: generate a due for a flat/period (`dues.create`), view payment status across the society (`dues.list`, with a Pending/Paid filter in the UI)
- [x] Commit: `feat(amenities,dues): booking flow + maintenance payments`

**Backend:** two new services — `packages/services/amenity-booking` (slot-grid computed from `openTime`/`closeTime`/`slotMinutes`, capacity-checked per exact slot before insert, not just per-day) and `packages/services/due` (dues CRUD + mock payment). `isOverdue` is a derived display flag (`status === "pending" && dueDate < now`), not a separate stored transition — avoids needing a scheduled job to flip the enum for a hackathon-scope feature. New routers: `amenityBookings` (`availableSlots`/`create`/`myBookings`/`cancel`/`listForAdmin`) and `dues` (`create`/`list`/`mine`/`payMock`); `amenities` gained a `listForResident` (residentProcedure) alongside Phase 6's admin CRUD.

**Backend verification (curl, fresh instance + reseed):** slot grid computed correctly (14 hourly slots for an 08:00–22:00/60-min facility); booking an out-of-grid time (`09:37`) correctly fails `BAD_REQUEST`; a capacity-1 facility correctly lets exactly one resident book a slot and rejects a second resident for the same slot with `CONFLICT`, and `availableSlots` immediately reflects `isAvailable: false`; cancel works once, a second cancel on the same booking correctly fails `CONFLICT`. Dues: admin generates a due for a specific flat, resident sees it `pending`, `payMock` flips it to `paid` with a real `payments` row, a second pay attempt correctly fails `CONFLICT`. RBAC re-confirmed: guard gets `403` on every new resident- and admin-only endpoint (`amenityBookings.create`, `dues.mine`, `dues.create`, `amenityBookings.listForAdmin`). Full sweep re-run clean on a from-scratch restart + reseed right before wiring the mobile screens, and again after they were built.

**Mobile:** `app/(resident)/amenities.tsx` (facility list → inline date-strip + slot-grid booking panel → collapsible "My Bookings" with cancel, matching the `amenities` mockup's inline booking-panel pattern), `app/(resident)/dues.tsx` (total-outstanding banner + per-due Pending/Overdue/Paid badges + "Pay Now" with a confirm dialog noting demo mode, matching the `maintenance_dues` mockup), `app/(admin)/dues.tsx` (new, generate-due form + status-filtered list, linked from a new "Finance" section on the Management Hub), and a "View Bookings" expandable section added to the existing admin Amenities screen (Phase 6) for the "admin view of all bookings per amenity" requirement. Home's `Help Desk`/`Dues`/`Bookings` quick actions (stubbed since Phase 4) are now all wired to real routes. Verified: `pnpm check-types` clean across services/trpc/api/mobile, `expo export --platform web` clean.

**Fix (user feedback):** the admin's "Generate Due" form required typing both `Period (YYYY-MM)` and `Due Date (YYYY-MM-DD)` by hand. Added a new `DateField` primitive (`components/ui/date-field.tsx`, same pattern as the existing `TimeField`) backed by the native `DateTimePicker` in date mode, and removed the separate Period input entirely — it's now auto-derived from the picked due date (shown as a read-only "Billing period: <Month Year>" line) so there's nothing to type except the amount.

**Self-tested (user couldn't find data to check against):** the user's test resident (`resident1`, flat A-101) genuinely had zero seeded dues — `seed.ts` only creates one due, for a different resident — so the empty state they saw was correct, not a bug. Verified the full cycle end-to-end via curl using the exact new flow: confirmed `dues.mine` empty for that resident → admin generates a due for that specific flat (date-derived period) → resident's `dues.mine` shows it `pending` → `payMock` flips it to `paid` with a real `payments` row → admin's list reflects `paid` too. Left this due in the database (did not reseed after) so the user has real data to check on their device. `pnpm check-types` and `expo export --platform web` both clean after the date-picker change.

**User confirmed working on-device** (2026-07-14), including the date-picker fix and the freshly-generated test due.

**Phase 8 re-verified fresh (independent pass — full restart, reseed, root `pnpm check-types`, curl sweep):** killed the live API, restarted clean, reseeded the DB. Root typecheck: all 6 in-scope packages clean (same pre-existing out-of-scope `apps/web` failure, unchanged). Fresh curl sweep: amenity slot grid computes correctly, booking a valid slot succeeds, an off-grid slot correctly fails `BAD_REQUEST`, cancel succeeds; admin generates a due for A-101 using the exact date-derived-period flow, resident sees it `pending`, `payMock` succeeds, a second pay attempt correctly fails `CONFLICT`. RBAC re-confirmed: guard gets `403` on every resident- and admin-only Phase 8 endpoint (`amenityBookings.create`, `dues.mine`, `dues.create`). **Phase 8 is fully done.**

---

## Phase 9 — Staff & Service Provider Directory
**Day 10 (morning). Goal: resident-facing read view of admin-managed directory.**

- [x] Resident "Society Directory" screen: browse staff/service providers by category, tap-to-call
- [x] "Verified by society" badge for admin-vetted entries
- [x] Commit: `feat(directory): resident-facing staff/service provider view`

**Backend:** one addition — `staffDirectory.listForResident`, a `protectedProcedure` (not resident-only) reusing Phase 6's `StaffDirectoryService.list`, since there's no reason to keep read-only service-provider contact info from guards/admin either. Admin-only `create`/`update`/`remove` from Phase 6 untouched.

**Mobile:** `app/(resident)/staff-directory.tsx` (`href: null`, reached via a "Society Directory" button on the resident Profile screen) — grouped by category with `GroupLabel` sections, verified badge (`MaterialIcons "verified"`) next to admin-vetted entries, tap-to-call via `Linking.openURL`, matching the guard Resident Directory screen's established pattern from Phase 5.

**Verification (curl, fresh instance):** resident sees the full seeded directory (plumber/electrician/other) with `isVerifiedByAdmin` correctly reflected; guard can also read it (by design); resident still correctly gets `403` attempting `staffDirectory.create` (admin-only, unchanged). `pnpm check-types` and `expo export --platform web` both clean.

**User confirmed working on-device** (2026-07-15).

**Phase 9 re-verified fresh (independent pass — full restart, reseed, root `pnpm check-types`, curl sweep):** killed the live API, restarted clean, reseeded the DB. Root typecheck: all 6 in-scope packages clean (same pre-existing out-of-scope `apps/web` failure, unchanged). Fresh curl sweep: resident sees the full seeded directory with `isVerifiedByAdmin` correct, guard can also read it (by design), resident still correctly `403` on `create`, and admin `create` still works (no regression from adding the resident-facing endpoint). **Phase 9 is fully done.**

---

## Phase 10 — Push Notifications & Real-Time Polish
**Day 10 (afternoon) – Day 11. Goal: the app feels alive without needing WebSockets.**

- [x] Set up an EAS project (`eas init`) — **required** because Expo Go on Android no longer supports remote push notifications; you need a development build (`expo-dev-client`) or a real EAS build to test this phase
- [x] `expo-notifications`: request permission, obtain Expo push token, register via `pushTokens.register` on login/app-foreground
- [x] Add `expo-server-sdk`; build a `NotificationService.sendPush` that fans out to all of a user's registered tokens
- [x] Wire push sends into: new visitor request → resident's flat occupants; visitor decision → requesting guard; new notice/poll → all residents (or scoped); complaint status change → complaint owner; complaint comment added; amenity booking confirmation
- [x] Tapping a push notification deep-links into the relevant screen
- [x] Keep the react-query `refetchInterval` fallback on the guard queue and resident approvals list — belt-and-suspenders so a missed/delayed push never breaks the demo (already true since Phase 4, unchanged/re-confirmed)
- [x] In-app notification bell/inbox screen backed by the `notifications` table (mark read, list)
- [x] Commit: `feat(notifications): push delivery + in-app inbox + deep links`

> Deviation: `expo-server-sdk` was added to `packages/services` rather than `apps/api` as the plan literally worded it. `apps/api` has zero business logic in this codebase (it's a thin Express+tRPC mount — `index.ts`/`server.ts`/`env.ts` only); every other service reaches its own tables directly through `@repo/database`, so `NotificationService.sendPush` (in `packages/services/notification`) follows that same established pattern instead of introducing a one-off exception.

**EAS setup:** logged in as `agam142`, ran `eas init --force` (created `@agam142/portl`, linked `projectId` into `app.json`), added `android.package: "com.agam142.portl"` (required for a build, wasn't set), installed `expo-dev-client` + `expo-notifications`, added the `expo-notifications` config plugin, wrote `eas.json` with `development`/`preview`/`production` build profiles. Kicked off `eas build --platform android --profile development` — cloud-built an internal-distribution dev-client APK (auto-generated an Android keystore since no local `keytool`).

**Backend:** new `packages/services/push-token` (register, dedup by `(userId, expoPushToken)` — the table's own unique constraint from Phase 1 backs this). `NotificationService.notify()` (from Phase 7) now does double duty — inserts the in-app row **and** fans out a real push via `expo-server-sdk`, filtering to valid Expo push tokens and chunking through `expo.sendPushNotificationsAsync`; a push-send failure is swallowed (best-effort — the in-app row is already the source of truth, so a push hiccup shouldn't surface as a mutation error to the user who triggered it). Two new event triggers wired directly into the relevant routes (`visitors.create` → `notifyVisitorRequest`, `visitors.decide` → `notifyVisitorDecision`, `amenityBookings.create` → `notifyBookingConfirmed`) alongside the four notice/poll/complaint triggers already wired in Phase 7. New routers: `pushTokens.register`, `notifications.list`/`markRead`/`markAllRead` (the `notifications` router was an empty Phase-2 stub until now).

**Mobile:** `lib/push-notifications.ts` (permission + token registration, no-ops gracefully if denied or if running somewhere without a `projectId`), `components/push-registration.tsx` (invisible, mounted once in the root `_layout.tsx` — registers the token when a user becomes available, and listens for notification taps via `addNotificationResponseReceivedListener`), `lib/notification-navigation.ts` (maps a notification's `type` + the viewer's role to a route — e.g. `complaint_comment` deep-links residents to Helpdesk but admins to Requests). `ScreenHeader` (shared across all three roles) gained a bell icon with an unread-count badge, polling every 15s, hidden while already on the inbox screen. One shared `components/notification-inbox-screen.tsx` behind three thin per-role route wrappers (`href: null`), matching the established `RoleProfileScreen`-style pattern from Phase 3.

**Backend verification (curl, fresh instance + reseed):** push token registration succeeds and is idempotent on a repeat call with the same token; guard registers a visitor → resident's inbox shows `visitor_request` with the right `visitorId` in `data`; resident approves → guard's inbox shows `visitor_decision`; booking a facility → booker's inbox shows `booking_confirmed`; `markRead`/`markAllRead` both correctly flip `readAt`; unauthenticated `pushTokens.register` correctly fails `401`. `pnpm check-types` clean across all 6 in-scope packages, `expo export --platform web` clean.

**Bug found and fixed — first build attempt failed:** the first `eas build` failed at the Gradle stage. Root cause: `react-native-reanimated@4.5.1` was silently resolved as a peer dependency of `expo-router` (present in `node_modules`, never in `package.json`), and 4.5.1 requires React Native 0.83–0.86 — this project is correctly on RN 0.81.5 for Expo SDK 54. This mismatch existed since Phase 3 (whenever `expo-router` v6 first pulled it in) but never surfaced, because every prior test used Expo Go (its own prebuilt native binary, independent of this project's package versions) or `expo export --platform web` (pure JS bundling, no native compilation) — this was the first time the project's actual native Android code was ever compiled. Fixed with `npx expo install react-native-reanimated react-native-worklets`, which pinned SDK-54-correct versions (`reanimated@~4.1.7`, `worklets@0.5.1`) as explicit direct dependencies instead of an unpinned transitive peer resolution. Re-verified `pnpm check-types` and `expo export --platform web` clean before retrying the build.

**On-device push test and inbox/bell visual pass:** done — see the on-device push verification writeup below (all 6 event types confirmed on real hardware after the Firebase/FCM credentials were wired up).

**Android push blocker found during on-device verification, then resolved:** `getExpoPushTokenAsync()` was throwing `Default FirebaseApp is not initialized` — silently, because `lib/push-notifications.ts`'s catch block swallowed the error with no logging. Fixed the swallow permanently (now `console.error`s — a genuine bug on its own, kept post-fix) to surface it, which confirmed the real cause: an Expo push token for a real (non-Expo-Go) Android build requires the app's own Firebase project (FCM credentials), which hadn't been set up.

Resolved: user created a Firebase project (`portl-f2e6f`), registered an Android app under `com.agam142.portl`, downloaded `google-services.json` (copied into `apps/mobile/`, referenced via `android.googleServicesFile` in `app.json` — committed, since it's client-side config restricted by package name/API-key scoping, not a secret) and a Firebase Admin SDK service-account key (uploaded directly to EAS credentials via `eas credentials` → Android → **Push Notifications (FCM V1)**; never placed in the repo — `apps/mobile/.gitignore` got a `*firebase-adminsdk*.json`/`*service-account*.json` safety-net pattern since the repo must be public for submission). One false start: first attempt uploaded the JSON into the **legacy** FCM slot by mistake (wrong menu item, cosmetically similar name) — corrected by deleting that entry and re-uploading into the FCM V1 slot. User then ran a fresh `eas build --platform android --profile development` themselves and installed the resulting APK.

**On-device push verification — all 6 event types confirmed live via curl-triggered real device pushes (2026-07-15):** push token registers correctly on login (confirmed in `push_tokens` table). Guard creates a visitor for A-101 → resident's phone got a real push, tapped it → deep-linked straight to Home with the pending approval visible (full loop, not just delivery). Admin publishes a notice → push received. Admin opens a poll → push received. Resident books a Clubhouse slot → booking-confirmation push received. Resident raises a complaint, admin advances its status → push received. Switched the same physical device to the guard login, resident approved a pending visitor → guard's phone got the decision push. 6/6 real OS-level pushes confirmed, plus deep-link-on-tap confirmed for the first one.

**Fresh re-verification after wiring the credentials (independent pass):** reseeded the DB (`pnpm db:seed`), root `pnpm check-types` clean across all 6 in-scope packages (same pre-existing out-of-scope `apps/web` `react-resizable-panels` failure, unchanged), `expo export --platform web` clean. Fresh curl sweep against reseeded data: login works for all 3 roles; `pushTokens.register` returns `200` and is idempotent (registering the identical token twice produces exactly one DB row, confirmed via direct query); unauthenticated `pushTokens.register` correctly fails `401`; `notifications.list` returns cleanly.

**Bug found and fixed during a final code-level re-read (not caught by curl or on-device testing — a role/route mismatch, not a crash):** `lib/notification-navigation.ts`'s `complaint_status`/`complaint_comment` case routed any non-resident straight to `/(admin)/requests`. But Phase 6 lets an admin assign a complaint to a *guard*, and `notifyComplaintComment` pushes to `assignedToUserId` — so a guard assigned a complaint who taps that push would hit a route their own `useRoleGuard("admin")` immediately bounces them out of (silently redirected back to `/`, then their gate home), discarding the deep-link with no visible error. There's no guard-facing complaint screen anywhere in the app to route to instead (confirmed via a full scan of `app/(guard)/*.tsx`), so the fix routes guards to their gate home (`/(guard)/gate`) rather than a screen that doesn't exist for them — same graceful-fallback pattern already used elsewhere in this file, not a new feature. Re-verified `tsc --noEmit` clean in `apps/mobile` after the fix.

**Phase 10 is fully done**, including Android push end-to-end, verified both on-device (6/6 real push event types + deep-link) and via a full code-level re-read of every backend trigger site and mobile route. iOS push is tracked separately as Phase 10B below (deferred, not started per user's explicit call — Android-only for now).

### Phase 10B — iOS Push & Build Setup
**Do this only after Android push (above) is fully verified on-device — don't split focus mid-setup.** User confirmed they already hold both an Apple Developer Program account and Google Play Console access, so iOS is now a planned deliverable rather than the Cut List's fallback ("ship Android only").

- [ ] Add `ios.bundleIdentifier` to `app.json` (mirrors `android.package`, not yet set)
- [ ] iOS push credentials: `eas credentials` → iOS → Push Notifications → let EAS auto-generate/manage the APNs key against the Apple Developer account
- [ ] `eas build --platform ios --profile development` → install the resulting dev-client build on a physical iPhone (the iOS Simulator can run the app but cannot receive real push — device required for push verification)
- [ ] Repeat Phase 10's full on-device push checklist on iOS: permission prompt, token registers in `push_tokens`, all 5 event types (visitor request/decision, notice/poll, complaint status/comment, booking confirmation) deliver a real notification, tapping one deep-links correctly
- [ ] Once verified, promote Phase 13's iOS build step from "if time allows" to a firm deliverable, and drop iOS off the Cut List

---

## Phase 11 — Mobile UX Polish
**Day 11 (afternoon) – Day 12. Goal: this stops looking like a hackathon project.**

- [x] Pass over every screen for: loading state, empty state, error state (not just happy path) — use the `EmptyState`/`Spinner` primitives from Phase 3 everywhere
- [x] Consistent haptics on key actions (approve visitor, submit form) via `expo-haptics`
- [x] Pull-to-refresh on every list screen
- [x] Form validation error messages are specific and inline, not generic alerts
- [x] Offline/network-error handling: distinguish "no internet" from "server error" from "unauthorized"
- [x] App icon, splash screen, and consistent color/typography scale across all 3 roles (same design system, role-tinted accent color is a nice touch: e.g. resident=blue, guard=amber, admin=slate)
- [x] Basic accessibility pass: tap target sizes, contrast, screen-reader labels on icon-only buttons
- [x] Performance pass: verify list screens (visitor history, notices) use `FlashList`/`FlatList` properly (no unbounded re-renders), images are reasonably sized
- [ ] Commit: `polish: loading/empty/error states, a11y, perf` — pending explicit go-ahead (never commit without being asked, per standing user instruction)

**Survey first, then fix:** a full read-through of every screen under `app/(resident)/`, `app/(guard)/`, `app/(admin)/` plus shared `components/` against the 8-point checklist above, before touching any code. Findings: loading-state and empty-state coverage were already solid everywhere (the Phase 4D fix held, no regressions in later phases). The real gaps were pull-to-refresh (missing on 19 of ~30 list screens — every admin CRUD screen plus several resident/guard ones), zero `expo-haptics` usage anywhere in the app, ~10 hand-rolled admin/resident forms using one generic `showToast("Fill all fields")` instead of per-field inline errors, no `isError` branch on any query (a failed fetch silently rendered as "empty" — indistinguishable from genuinely empty), missing `accessibilityLabel` on most icon-only buttons (edit/delete/call/send-comment/close icons), and three long-list screens (`visitor-history.tsx`, guard `history.tsx`, guard `resident-directory.tsx`) using `ScrollView`+`.map()` instead of a virtualized list.

**Fixed, screen by screen:**
- `lib/haptics.ts` (new) — `hapticSuccess`/`hapticError`/`hapticTap` thin wrappers around `expo-haptics` (installed fresh — wasn't a dependency before this phase). Wired into every mutation's `onSuccess`/`onError` across both roles: visitor approve/reject, guard mark entry/exit, poll vote, complaint raise/comment, amenity book/cancel, dues pay, pre-approval submit, guard visitor registration, guard pre-approved check-in, login, set-password, and all 8 admin CRUD screens (towers/flats/residents/guards/amenities/dues/notices/polls/staff).
- Pull-to-refresh added to all 19 previously-missing screens via the standard `RefreshControl` pattern already used correctly elsewhere (`refreshing={query.isRefetching}`, `onRefresh={() => query.refetch()}`); screens backed by multiple queries refetch all of them.
- An `isError` branch (reusing `EmptyState` with an `error-outline` icon and a "pull down to refresh and try again" message) added alongside the existing loading/empty branches on every list-driven screen, so a failed fetch no longer looks identical to "genuinely empty."
- Inline field-level validation replacing generic toasts on 10 forms (Helpdesk's raise-ticket form plus 9 admin CRUD screens) — each missing field now gets its own `useState<string | null>` error wired to the shared `Input` component's existing `error` prop (no changes needed to `Input` itself, it already rendered this correctly, nothing had wired it for these forms). Two genuinely cross-field checks (pre-approval's end-time-after-start-time, notices' tower/flat-picker-required) were kept as toasts since there's no single input to attach them to — matches the survey's own call that a toast is defensible there.
- `accessibilityLabel` + `accessibilityRole="button"` added to every icon-only `Pressable` found lacking one: edit/delete icons on all 8 admin CRUD screens, the notification bell in `ScreenHeader`, call buttons, the phone reveal/hide toggle, send-comment buttons, cancel-booking and poll-option-remove `X` buttons.
- Three list screens converted from `ScrollView`+`.map()` to `FlatList` for real virtualization: `app/(resident)/visitor-history.tsx`, `app/(guard)/history.tsx`, `app/(guard)/resident-directory.tsx` (the last one required flattening a nested flats→residents structure into a single row array first). `components/history-row.tsx` was restyled from a joined-list-with-dividers look to a standalone rounded card, matching every other list item's visual pattern in the app — cleaner to virtualize and more visually consistent than the one-off joined-list style it had before.
- Offline/network-error handling reviewed, not rewritten: `lib/trpc-client.ts`'s `fetchWithTimeout` already throws distinct messages for a request timeout vs. a network failure, and `lib/error-message.ts` already surfaces the server's real message (e.g. an actual 401 "Unauthorized") through `TRPCClientError`. This already satisfies the checklist item. Proactive "you're offline" detection via `@react-native-community/netinfo` was considered and explicitly skipped as unnecessary polish — nothing in the brief requires it and the existing timeout/network-error messaging already differentiates the cases that matter.
- App icon/splash: found `assets/splash-icon.png` had been sitting unused since Phase 0 — no splash screen was configured in `app.json` at all, meaning cold launches showed a bare default splash before the JS bundle loaded. Installed `expo-splash-screen`, wired the plugin (`backgroundColor: "#131314"` matching the design system, not the scaffold default), and added `SplashScreen.preventAutoHideAsync()`/`hideAsync()` tied to the auth store's `hasHydrated` flag in the root `_layout.tsx`, so the splash now stays up through the hydration gap instead of splash → blank frame → `LoadingScreen` spinner → app. Also fixed `userInterfaceStyle: "light"` → `"dark"` in `app.json` — a leftover from the original scaffold that predates the Phase 3 dark-mode-only retrofit and had gone unnoticed since it only affects OS-level chrome, not in-app UI.

**Bug found and fixed (code-level re-read, not caught by typecheck):** `apps/mobile/app/(admin)/residents.tsx` had an unused `MaterialIcons` import left over from the polish edit — harmless (no runtime effect, would only ever surface as a lint warning) but removed for cleanliness.

**A real limitation, disclosed rather than hidden:** most of this phase's screen-by-screen edits (11 admin/guard screens) were applied by a forked agent working from an explicit, fully-specified pattern (established first by hand on `towers.tsx`, then handed off verbatim) rather than edited one-by-one directly — necessary given the sheer number of near-identical screens, but flagged here since it's a departure from every prior phase's fully-manual editing. Spot-checked two of the eleven (`residents.tsx`, `polls.tsx`) in full against the pattern before trusting the rest; both matched exactly.

**Verification:** root `pnpm check-types` clean across all 6 in-scope packages (same pre-existing out-of-scope `apps/web` failure, unchanged), `expo export --platform web` clean. **On-device, by the user, across all 3 roles:** resident pull-to-refresh (Home/Amenities/Dues/Helpdesk/Polls) and empty-form inline validation confirmed working; admin form validation (empty Tower/Notice/Poll submissions correctly show inline field errors, not a popup) and admin pull-to-refresh confirmed working; guard Entry & Exit History and Resident Directory screens (the `FlatList`/card-restyle conversion) visually confirmed correct.

> Native-module caveat: `expo-haptics` and `expo-splash-screen` were added mid-phase — both have native code, so haptics and the new splash screen will **not** take effect on the currently-installed dev-client APK until a fresh `eas build`. Everything else in this phase is pure JS/UI and took effect immediately via a Metro reload. Per the user's explicit call, the native rebuild is deferred to a later Android build (e.g. bundled with final submission prep) rather than spending a build cycle on it now.

**Phase 11 is functionally complete**, pending only: (1) the commit, held back per standing instruction until explicitly requested, and (2) a future EAS rebuild to activate haptics/splash on-device.

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
- [ ] `eas build --platform ios --profile preview` → produce an installable iOS build (Apple Developer + Play Console accounts confirmed available — see Phase 10B; no longer just "if time allows")
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
6. ~~iOS build → ship Android APK only~~ — no longer a cut candidate; user holds both an Apple Developer account and Play Console access, see Phase 10B

Never cut: visitor approval flow (4A/4B), auth/RBAC, admin CRUD for towers/flats/residents, README + demo video + screenshots + credentials.
