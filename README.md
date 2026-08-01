<div align="center">

<img src="apps/mobile/assets/icon.png" alt="Portl logo" width="112" height="112" />

# **Portl**

### *The gate, the flat, and the committee — one app*

**A society management platform for gated communities** — one system for the guard
at the gate, the resident on their phone, and the admin running the place.

<br />

![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![tRPC](https://img.shields.io/badge/tRPC-end--to--end%20types-2596BE?style=flat-square&logo=trpc&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-PostgreSQL%2015-C5F74F?style=flat-square&logo=drizzle&logoColor=black)
![Expo Push](https://img.shields.io/badge/Expo%20Push-live-4630EB?style=flat-square)
<br />
![API](https://img.shields.io/badge/API-126%20operations%20·%2023%20routers-8250DF?style=flat-square)
![Screens](https://img.shields.io/badge/mobile-55%20screens-1F6FEB?style=flat-square)
![Data model](https://img.shields.io/badge/data%20model-30%20tables-F59E0B?style=flat-square)
![Roles](https://img.shields.io/badge/roles-resident%20·%20guard%20·%20admin-3FB950?style=flat-square)

<br />

**[🌐 Live API](https://139.84.177.188.sslip.io/health)** · **[📦 Repository](https://github.com/Agam00/PortL-App)**

**[Architecture](docs/ARCHITECTURE.md)** · **[Security](SECURITY.md)** · **[Demo logins](CREDENTIALS.md)** · **[Runbook](docs/RUNBOOK.md)**

</div>

---

## Try it in two minutes

1. Install the app (TestFlight / APK build from EAS — see [Deployment](#deployment)).
2. Open it and log in — **no setup, no local server**. It points at the live API by
   default and a full demo society is already seeded:

   ```
   admin@portl.dev   ·   Portl@123
   ```
3. Log out and back in as `guard1@portl.dev` or `resident1@portl.dev` to see the
   same society from the other two sides.

> [!NOTE]
> The app resolves its backend URL at runtime from [`mobile-config.json`](mobile-config.json)
> on `main` — the server can move without shipping a new build.

> [!TIP]
> You can sign in with **either an email address or a phone number**. Both resolve
> to the same account server-side.

---

## The problem

A gated community runs on three things that don't talk to each other: a **paper
register** at the gate, a **WhatsApp group** for notices, and an **admin chasing
maintenance dues by phone**.

A delivery partner reaches the gate. The guard calls the flat. The resident misses
the call. The visitor waits. Nobody can answer *who visited A-101 last Tuesday*. A
notice reaches whoever happens to scroll. A payment is a screenshot in someone's
gallery. A complaint is a message that scrolls away.

Portl replaces all of it with one system, seen from three sides.

| | Role | What they do |
|:--:|---|---|
| 🏠 | **Resident** | Approve visitors from their phone, pre-approve guests with a QR pass, raise complaints, book amenities, pay dues, vote in polls, trigger an emergency alert |
| 🛡️ | **Guard** | Register walk-in visitors, verify passes by QR or 6-digit code, mark entry and exit, run the in-out board, go on/off duty |
| ⚙️ | **Admin** | Run the society — towers, flats, residents, guards, staff, notices, polls, complaints, dues, payment approval, moderation |

---

## Contents

**[Features](#feature-catalogue)** · **[Tech stack](#tech-stack)** · **[Architecture](#architecture)** · **[Security](#security)** · **[Layout](#repository-layout)** · **[Quick start](#quick-start)** · **[API](#the-api)** · **[Deployment](#deployment)** · **[Demo logins](#demo-logins)** · **[Limitations](#known-limitations)**

---

# Feature catalogue

Every feature below is **implemented and deployed**. Each states what it does and
*why it exists* — the purpose is the part that matters.

## 🔐 Authentication and onboarding

### Email *or* phone + password login
A single identifier field accepting either an email address or a phone number,
resolved server-side. Passwords hashed with **bcrypt**; sessions issued as a short
**JWT access token** plus a rotating **refresh token** stored hashed in the database.

> **Purpose.** Residents in Indian societies are reached by phone far more reliably
> than by email — many have no working email at all. Making phone a first-class
> identifier rather than a profile field keeps them from being locked out.

### Invite codes with QR
An admin creates the account; the resident or guard redeems a **12-character invite
code** — typed, or scanned from a QR the admin shows them — and chooses their own
password. The code is cleared the moment the account is claimed.

> **Purpose.** A society is a closed membership. Open self-signup would let anyone
> claim a flat. The invite makes the admin the gatekeeper, while still letting the
> resident pick a password the admin never sees.

### Public society registration
A founding admin can register a brand-new society and the first admin account
together, without an existing invite.

> **Purpose.** Every closed system needs one door in, or no society could ever be
> created in the first place.

### Account deletion, in-app
Any role can delete their own account. The row is **soft-deleted** — credentials are
wiped and the email and phone are released for reuse, but the record survives so
authored posts, complaints and gate logs keep their attribution.

> **Purpose.** Hard-deleting a user would tear holes in the gate log, which is the
> one record a society may genuinely need months later. Soft deletion satisfies the
> user's right to leave without falsifying history.

---

## 🚪 Visitor and gate management

### Walk-in registration → resident approval
The guard registers a visitor against a flat; the resident gets a **push notification**
and approves or rejects from their phone. The guard's board updates live.

> **Purpose.** This is the phone call that never gets answered, turned into something
> with a record and a timestamp.

### Pre-approved guests — QR pass + 6-digit code
Residents pre-approve guests, deliveries, cabs and services ahead of time. The pass
carries both a **scannable QR** and a **6-digit code** for when the camera fails or
the guest has no smartphone.

> **Purpose.** Two redemption paths because a gate is a bad place to debug a camera.
> The code works when the QR doesn't.

### Keep-at-gate parcels with collection OTP
A resident can tell the gate to hold a delivery. The parcel is released later against
an **OTP the resident holds**.

> **Purpose.** Deliveries arrive when nobody is home. Without this the parcel either
> goes back or sits unaccounted for at the gate — the OTP makes the handover provable.

### In-out board and gate log
A live board of **Waiting / Approved / Inside / Out** with entry and exit timings, plus
full searchable history for residents and admins.

> **Purpose.** "Who is inside the society right now" is a security question a paper
> register can only answer by being read cover to cover.

---

## 🏢 Community and operations

### Notices with reactions and comments, scoped by audience
Admins post notices targeted at the whole society or a subset; residents react and
comment inline.

> **Purpose.** A notice in a WhatsApp group has no idea who read it. Reactions and
> comments turn a broadcast into something with measurable reach.

### Polls — single and multi-choice
Admins run polls; residents vote; results close on demand.

> **Purpose.** Society decisions currently happen by whoever shouts loudest in the
> group. A poll produces a countable result with one vote per resident, enforced
> server-side.

### Complaints with status tracking and threaded comments
Residents raise complaints; admins move them through statuses; both sides comment on
the thread.

> **Purpose.** A complaint in a chat scrolls away. A complaint with a status is either
> open or closed, and somebody owns it.

### Amenity booking with slots
Residents see available slots, book, receive a booking pass and can cancel; admins
oversee bookings per amenity and set open hours and capacity.

> **Purpose.** The clubhouse double-booking argument, prevented at the point of
> booking rather than settled afterwards.

### Community feed
Posts, comments and likes across the society, with role tags on every author.

> **Purpose.** The social half of the WhatsApp group, kept inside the app where it is
> attributable and moderatable.

### Chat — resident ↔ guard ↔ admin
Direct messaging across all three roles, with role tags and a residents/society split.

> **Purpose.** Reaching the gate should not require knowing someone's personal number.

---

## 💰 Dues and payments

### Dues issued per flat or to everyone
Admins raise a due against a single flat or apply it to all residents at once.

> **Purpose.** Maintenance is charged society-wide on the same cycle; issuing it one
> flat at a time is the kind of manual work that produces missed flats.

### UPI payment with screenshot proof, approved by admin
The society sets its **UPI collection ID**. Residents pay and upload a screenshot;
admins review the proof and approve or reject.

> **Purpose.** Real societies already settle dues over UPI and prove it with a
> screenshot. Portl records the flow that already exists rather than forcing a
> payment gateway onto a committee that never asked for one.

---

## 📣 Alerts and notifications

### Emergency panic alert
A resident raises an alarm; guards receive a **full-screen popup** on the gate
dashboard with one-tap acknowledge and auto-reply.

> **Purpose.** At 2am the difference between a notification and a full-screen takeover
> is whether anyone actually sees it.

### Real Expo push notifications
Visitor approvals, alerts, chat messages and notices all push. Devices **unregister on
logout**, so a signed-out phone stops receiving them.

> **Purpose.** The entire visitor flow depends on the resident being reached within
> seconds. Unregistering on logout stops a shared or resold phone leaking a society's
> notifications.

### Guard duty status
Guards flip themselves on and off duty; residents and admins see who is currently at
the gate.

> **Purpose.** Residents need to know there is somebody to call before they call.

---

## 🛠️ Moderation and safety

### Report content, block users
Any user can report a post or comment and block another user. Admins act on reports by
removing content or ejecting the user.

> **Purpose.** Required by **App Store Guideline 1.2** for any app carrying
> user-generated content — and independently the right call for a feed where everyone
> knows where everyone else lives.

---

# Tech stack

| Layer | Choice | Why this one |
|---|---|---|
| Mobile | **Expo SDK 54** · React Native 0.81 · expo-router | File-based routing across three role groups; OTA-friendly builds via EAS |
| Styling | **NativeWind** | Tailwind semantics in RN, so screens stay readable at 55 files |
| Client state | **Zustand** (persisted to SecureStore) | Auth and UI state that survives a cold start without a provider tree |
| Server state | **TanStack Query** via the tRPC client | Caching, refetch and optimistic updates come free with the typed client |
| API transport | **tRPC 11** on **Express 5** | End-to-end types with no codegen step and no schema drift between client and server |
| REST surface | **trpc-to-openapi** + Scalar | The same routers also emit an OpenAPI spec, so non-TS clients aren't locked out |
| Validation | **Zod 4** | One schema validates input and produces the TypeScript type |
| Domain logic | Framework-agnostic **service classes** | `AuthService`, `VisitorService`, `DueService` … testable without HTTP |
| ORM | **Drizzle 0.45** | SQL-shaped queries, typed rows, real migration files under version control |
| Database | **PostgreSQL 15** | 30 tables, 18 migrations |
| Push | **expo-server-sdk** | Native push without owning APNs/FCM plumbing |
| Monorepo | **pnpm workspaces** + Turborepo | Shared packages between the app and API with one install |

---

# Architecture

```
apps/mobile ──tRPC/HTTPS──▶ apps/api ──▶ packages/trpc ──▶ packages/services ──▶ packages/database ──▶ PostgreSQL
   (Expo RN)                (Express)     (routers/RBAC)     (business logic)      (Drizzle schema)
```

The layering rule: **each layer only knows the one beneath it.** Routers do
authorization and shape; services hold the domain rules and never import HTTP; the
database package owns the schema and nothing else.

- **Authorization is server-side.** `packages/trpc/server/trpc.ts` defines
  `publicProcedure`, `protectedProcedure`, and `residentProcedure` / `guardProcedure`
  / `adminProcedure`. A role check that fails returns `FORBIDDEN` — the UI hiding a
  button is a convenience, not the control.
- **Tenancy is society-scoped.** Users, flats, notices, dues and visitors all hang off
  a `societyId`, so one deployment serves many societies.
- **Soft deletes on users.** `deletedAt` keeps authorship intact while releasing the
  email and phone.

Full detail — component diagram, request lifecycle, data model — lives in
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** and **[docs/DATA-MODEL.md](docs/DATA-MODEL.md)**.

---

# Security

Summary; the full write-up is in **[SECURITY.md](SECURITY.md)**.

- **Passwords** hashed with bcrypt — never stored or logged in the clear.
- **Sessions** are a short-lived JWT access token plus a rotating refresh token,
  stored **hashed** in `refresh_tokens` and revocable per device.
- **Authorization** enforced on the server per procedure, by role.
- **Input validation** with Zod on every procedure boundary.
- **Deactivation** is distinct from bad credentials, so a revoked resident is told why.
- **The database is not internet-facing** — Postgres binds to `127.0.0.1` and is
  reached only from the API on the same host.

---

# Repository layout

```
Portl/
├── apps/
│   ├── api/                  Express server — mounts tRPC at /trpc, OpenAPI in dev
│   ├── mobile/               Expo app — 55 screens across resident/guard/admin
│   └── web/
├── packages/
│   ├── trpc/                 23 routers, context (JWT → ctx.user), role procedures
│   ├── services/             Domain logic — Auth, Visitor, Due, Notice, Chat …
│   └── database/             Drizzle schema (30 models), 18 migrations, seed
├── docs/                     Architecture · API · Data model · Features · QA · Runbook
├── docker-compose.yml        Postgres 15, bound to loopback
└── mobile-config.json        Runtime backend URL the app reads from main
```

---

# Quick start

```bash
# 1. install
pnpm install

# 2. environment — one root .env, then fan it out to the packages that need it
cp .env.example .env
pnpm env:sync

# 3. database
docker compose up -d
pnpm db:migrate
pnpm db:seed

# 4. run the API and the app together
pnpm start:all
```

> [!IMPORTANT]
> There are **four** `.env` files — the root one plus a copy in `apps/api`,
> `packages/database` and `packages/services`. Each package loads the one nearest its
> own working directory. **Always edit the root `.env` and run `pnpm env:sync`** —
> editing a copy by hand leads to the exact outage documented in
> [docs/RUNBOOK.md](docs/RUNBOOK.md).

---

# The API

**Base URL** — `https://139.84.177.188.sslip.io`

| Surface | Path | Notes |
|---|---|---|
| tRPC | `/trpc/*` | What the mobile app uses — fully typed end to end |
| REST / OpenAPI | generated from the same routers | Spec and Scalar docs served in **development only** |
| Health | `/health` | Liveness only — see the caveat below |

**126 operations across 23 routers:** `admin` · `alerts` · `amenities` ·
`amenity-bookings` · `auth` · `chat` · `complaints` · `dues` · `duty` · `flats` ·
`health` · `moderation` · `notices` · `notifications` · `polls` · `posts` ·
`push-tokens` · `residents` · `service-requests` · `staff-directory` · `towers` ·
`vehicles` · `visitors`

```bash
curl -X POST https://139.84.177.188.sslip.io/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@portl.dev","password":"Portl@123"}'
```

> [!WARNING]
> `/health` is a **liveness check only** — it returns static JSON and never touches the
> database. It stays green during a total database outage. To check the system is
> actually working, call a real endpoint like the one above.

---

# Deployment

| Piece | Target |
|---|---|
| API | **Vultr VPS** (Ubuntu 24.04) under **PM2**, process `portl-api` |
| Database | **PostgreSQL 15** in Docker on the same host, bound to `127.0.0.1` |
| TLS / hostname | `139.84.177.188.sslip.io` — sslip.io maps the IP to a hostname so HTTPS works without a purchased domain |
| Mobile | **EAS Build** → TestFlight / App Store, Android APK |
| Backend URL | Read at runtime from `mobile-config.json` on `main` — the server can move without a new build |

Operating the server — deploys, outages, error-code triage — is documented in
**[docs/RUNBOOK.md](docs/RUNBOOK.md)**.

---

# Demo logins

All demo accounts share the password **`Portl@123`**. Full list and suggested walkthroughs
in **[CREDENTIALS.md](CREDENTIALS.md)**.

| Role | Login | Who |
|---|---|---|
| ⚙️ Admin | `admin@portl.dev` | Asha Nair |
| 🛡️ Guard | `guard1@portl.dev` | Ramesh Kumar |
| 🏠 Resident | `resident1@portl.dev` | Priya Sharma, Flat A-101 |

The seeded society is **Palm Meadows Residency, Bengaluru** — 3 towers, 24 flats,
18 residents, with visitor requests pending, a parcel held at the gate, dues awaiting
approval, live polls, complaints in mixed states and a populated gate log.

---

# Known limitations

Stated plainly rather than left to be discovered.

| Gap | Detail |
|---|---|
| **No automated test suite** | There are no unit or integration tests. Verification is manual, against [docs/QA-PLAN.md](docs/QA-PLAN.md). This is the single largest piece of missing engineering work. |
| **Migrations have drifted** | `drizzle-kit push` has been run against the live database, so the committed migrations may not reproduce the schema from scratch. A fresh deploy from migrations alone is not guaranteed. |
| **No server-side error logging** | `packages/trpc/server/trpc.ts` has no `errorFormatter`, so errors are returned to the client and never written to the server log — and production currently leaks SQL and stack traces to the client. |
| **`/health` is cosmetic** | It does not check the database, so it cannot detect the most likely outage. |
| **Payments are proof-of-payment, not a gateway** | UPI plus a screenshot reviewed by an admin. Deliberate, but it means no automatic reconciliation. |
| **Single region, single host** | One VPS running both the API and the database. No replica, no failover, no automated backups yet. |
| **i18n** | English only. |

---

<div align="center">

**[Architecture](docs/ARCHITECTURE.md)** · **[Security](SECURITY.md)** · **[API](docs/API.md)** · **[Data model](docs/DATA-MODEL.md)** · **[Features](docs/FEATURES.md)** · **[QA plan](docs/QA-PLAN.md)** · **[Runbook](docs/RUNBOOK.md)** · **[Demo logins](CREDENTIALS.md)**

</div>
