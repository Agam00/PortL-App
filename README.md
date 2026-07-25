<div align="center">

# 🏙️ Portl — Society Management App

**The conversations that used to happen at the society gate now happen inside one community app.**

A production-ready, mobile-first society management platform for modern apartment communities — built with **Expo + React Native**, backed by a **tRPC + Express + PostgreSQL** API. Three fully separated roles (Resident · Security Guard · Society Admin), each with their own dashboard, permissions and workflows.

</div>

---

## 🔗 Quick Links (everything you need to evaluate)

| What | Link |
|---|---|
| 📱 **Install the APK** (Android) | [Latest build → Install](https://expo.dev/accounts/agam142/projects/portl/builds) *(open the newest build, scan the QR or download the `.apk`)* |
| 🌐 **Live Backend API** | **https://portl-app.onrender.com** |
| ❤️ Backend health check | https://portl-app.onrender.com/health |
| 📖 Interactive API docs (OpenAPI/Scalar) | https://portl-app.onrender.com/docs |
| 📦 GitHub repository | https://github.com/Agam00/PortL-App |

> The APK is a standalone build that talks to the **live cloud backend** (Render) and a **live Postgres database** (Neon), pre-loaded with realistic demo data. Just install and log in — no local setup required.

---

## 🔑 Demo Credentials

All accounts share the password: **`Portl@123`**

| Role | Login (email) | Who |
|---|---|---|
| 👑 **Society Admin** | `admin@portl.dev` | Asha Nair |
| 🛡️ **Security Guard** | `guard1@portl.dev` (also `guard2@`, `guard3@`) | Ramesh Kumar |
| 🏠 **Resident** | `resident1@portl.dev` … `resident18@portl.dev` | e.g. resident1 = Priya Sharma, Flat A‑101 |

> You can log in with **email or phone**. Residents 1–18 map to real names across 3 towers (Maple / Orchid / Cedar) and 24 flats in the demo society **“Palm Meadows Residency, Bengaluru.”**

**Pre-staged demo scenarios** (so every screen has real data):
- A **maintenance payment awaiting admin approval** (Admin → Dues → Approve it live).
- A **due already paid with a real UPI screenshot** as proof.
- **Pending visitor requests** to approve/reject, a **package held at the gate** (collection OTP), and **checked-in / checked-out** visitors with full gate logs.
- Notices with reactions, two live polls, six complaints in various states, amenity bookings, a community feed, guards on duty, and an emergency alert in history.

---

## 🎯 The Problem

Apartment communities still run on **gate calls, WhatsApp groups, paper registers and manual approvals**. A delivery partner reaches the gate → the guard calls the flat → the resident misses the call → the visitor waits. The same friction repeats across guest entry, complaints, notices, polls, amenity booking, dues and gate logs.

**Portl** brings the society gate, resident communication and community operations into one seamless mobile experience.

---

## ✅ Requirement Compliance Matrix

Every hackathon requirement, mapped to where it’s implemented. **All functional & technical requirements are met.**

### Tech
| Requirement | Status | Implementation |
|---|---|---|
| Built with Expo & React Native | ✅ | `apps/mobile` — Expo Router, RN, NativeWind |
| Mobile-first | ✅ | Native mobile app, dark themed, responsive |
| Free choice of backend & database | ✅ | Express + tRPC API, **PostgreSQL** via Drizzle ORM |
| Proper state management | ✅ | **Zustand** (auth/UI stores) + **TanStack React Query** (server state via tRPC) |
| Push notifications (recommended) | ✅ | **Real Expo push** via `expo-server-sdk` (approvals, alerts, messages) |

### Roles & Authentication
| Requirement | Status | Implementation |
|---|---|---|
| Resident / Security Guard / Society Admin roles | ✅ | Three separate route groups + dashboards |
| Each role has its own permissions & workflows | ✅ | Role-scoped navigation + server-enforced access |
| Secure authentication | ✅ | **bcrypt** password hashing + **JWT** access/refresh tokens (rotating) |
| Role-based access control | ✅ | Server-side `requireRole` → returns **FORBIDDEN**; not just hidden in the UI |

### Visitor Management
| Requirement | Status |
|---|---|
| Visitor entry requests | ✅ |
| Visitor approval & rejection (by resident, from the app) | ✅ |
| Guest pre-approval (with QR + 6-digit gate code) | ✅ |
| Delivery / cab / service-staff approvals | ✅ |
| Entry & exit logs | ✅ |
| Visitor history | ✅ |
| **Bonus:** keep-at-gate parcels with OTP collection | ✅ |

### Community Management (Residents)
| Requirement | Status |
|---|---|
| View society notices (react + comment) | ✅ |
| Participate in polls (single & multi-select) | ✅ |
| Raise helpdesk complaints & track status | ✅ |
| Book amenities (with booking pass + history) | ✅ |
| View visitor history | ✅ |
| Pay maintenance dues | ✅ (UPI + screenshot proof, admin-approved) |

### Society Administration (Admin manages)
| Towers | Flats | Residents | Amenities | Notices | Polls | Complaints | Staff / Service Providers |
|---|---|---|---|---|---|---|---|
| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Guard Operations
| Register visitors | Search residents | Raise approval requests | Verify approvals | Mark entry | Mark exit | Visitor history |
|---|---|---|---|---|---|---|
| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Mobile Experience
Clean navigation ✅ · Fast approval flows ✅ · Responsive layouts ✅ · Loading & empty states ✅ · Error handling (toasts) ✅ · Polished dark UI ✅

---

## ✨ Feature Highlights

- **Visitor lifecycle** — walk-in registration, resident approve/reject, guest/delivery/cab/service pre-approvals with **QR gate passes** + 6-digit codes, entry/exit logging, and full history.
- **Keep-at-gate parcels** — resident can have a delivery held at the gate; the guard releases it only after entering the resident’s **collection OTP**.
- **Maintenance dues** — admin issues a charge to **one flat or all residents**; the resident pays externally and uploads a **payment screenshot**; the payment sits **“Under review”** until the **admin approves** it → then it shows **Paid** with the proof viewable.
- **Community** — notice board (with reactions/comments), single & multi-select polls, helpdesk complaints with status tracking, and a **social feed** (posts, comments, likes, admin pin/delete).
- **Amenities** — browse, book time slots, cancel, and get a booking pass; past bookings roll into a read-only history.
- **Emergency alerts** — residents can raise a **panic alert** that pops up full-screen for guards and admins.
- **Guard duty status** — guards toggle on/off duty; visible to admins and residents.
- **Self-service onboarding** — public **“Create admin account”** (society signup) and **in-app account deletion** for every role.
- **Real push notifications** for approval requests, alerts and messages.

---

## 🏗️ Architecture

```mermaid
flowchart TD
  subgraph Mobile["Expo / React Native app — apps/mobile"]
    UI["Resident / Guard / Admin dashboards"]
    ZS["Zustand — auth & UI state"]
    RQ["React Query + tRPC client"]
  end

  subgraph Server["Backend on Render — apps/api"]
    EX["Express host"]
    TRPC["tRPC router + REST via trpc-to-openapi"]
    SVC["Domain services — packages/services"]
    PUSH["Expo Push — expo-server-sdk"]
  end

  DB[("PostgreSQL on Neon<br/>Drizzle ORM")]

  UI --> ZS
  UI --> RQ
  RQ -->|"HTTPS /trpc"| EX
  EX --> TRPC
  TRPC --> SVC
  SVC --> DB
  SVC --> PUSH
  PUSH -.->|"device notifications"| Mobile
```

> **Request lifecycle:** the app calls a tRPC procedure → Express + `trpc-to-openapi` route it → the procedure runs `requireRole` (RBAC) → a domain **service** executes the business logic via **Drizzle** against **Postgres** → side effects (e.g. push notifications) fire → a fully typed response returns to React Query. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for sequence diagrams.

**Type-safe, end-to-end monorepo (pnpm workspaces):**

| Package | Responsibility |
|---|---|
| `apps/mobile` | Expo / React Native app (expo-router, NativeWind) |
| `apps/api` | Thin Express server that hosts the tRPC router + auto-generated REST/OpenAPI |
| `packages/trpc` | tRPC routers, context, procedures (`publicProcedure`, `residentProcedure`, `guardProcedure`, `adminProcedure`) |
| `packages/services` | Domain logic (auth, visitors, dues, complaints, polls, notices, amenities, chat, alerts, duty…) |
| `packages/database` | Drizzle schema, migrations & seed |

### Tech Stack
| Layer | Technology |
|---|---|
| Mobile | Expo, React Native, expo-router, NativeWind (Tailwind), expo-camera, expo-image-picker, react-native-qrcode-svg |
| State | Zustand + TanStack React Query |
| API | Node.js, Express, **tRPC v11**, `trpc-to-openapi` (REST + Swagger/Scalar docs) |
| Auth | bcrypt, JWT (access + rotating refresh tokens) |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Push | `expo-server-sdk` (Expo Push) |
| Hosting | **Backend:** Render (Docker) · **DB:** Neon · **Builds:** EAS |

---

## 🔐 Security & Access Control

- Passwords are **bcrypt-hashed**; auth uses short-lived **JWT access tokens** + **rotating refresh tokens** (stored server-side, revocable).
- **Role-based access is enforced on the server**, not just hidden in the UI: `requireRole('admin' | 'guard' | 'resident')` rejects mismatched roles with `FORBIDDEN`, and unauthenticated calls with `UNAUTHORIZED`.
- All society data is **scoped to the caller’s society**, so tenants can’t see each other’s data.
- **In-app account deletion** (wipes credentials, releases email/phone, revokes all sessions) and public admin/society signup are supported.

---

## 🚀 Run It Locally

### Prerequisites
- **Node.js ≥ 18**, **pnpm 9**, **Docker** (for local Postgres) or any Postgres instance.

### 1. Install
```bash
git clone https://github.com/Agam00/PortL-App.git
cd PortL-App
pnpm install
```

### 2. Environment
Create a root `.env` (used by the API + database packages):
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/dev
ACCESS_TOKEN_SECRET=change-me-to-a-long-random-string
NODE_ENV=development
BASE_URL=http://localhost:8000
```
Then sync it to the workspaces:
```bash
pnpm env:sync
```

### 3. Database (Postgres + schema + demo data)
```bash
docker compose up -d            # starts local Postgres
pnpm --filter @repo/database db:migrate   # create tables
pnpm --filter @repo/database db:seed      # load the rich demo dataset
```

### 4. Run the backend
```bash
pnpm --filter @repo/api dev     # http://localhost:8000  (health: /health, docs: /docs)
```

### 5. Run the mobile app
Point the app at your API in `apps/mobile/.env`:
```env
# Android emulator → 10.0.2.2 · iOS simulator → localhost · physical device → your LAN IP
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```
```bash
pnpm --filter mobile dev -- --clear
```
Open it in Expo Go / a dev build, and log in with the demo credentials above.

> **Note:** the API is a pnpm monorepo — after editing anything in `packages/*`, restart the API server (`tsx watch` only watches `apps/api/src`).

---

## 🧪 Testing

The backend contract is covered by automated end-to-end suites that run against the live tRPC API:

```bash
apps/api/node_modules/.bin/tsx apps/api/_qa.ts      # auth, RBAC, visitors, keep-at-gate OTP, admin CRUD, community, amenities, dues, chat, alerts, duty
apps/api/node_modules/.bin/tsx apps/api/_qa2.ts     # guard invite, polls, staff CRUD, cancel pre-approval, posts, chat threads, RBAC negatives
```
These exercise every role, the full visitor + payment-approval flows, and negative access-control cases (FORBIDDEN / UNAUTHORIZED) — **all passing**.

---

## ☁️ Deployment

- **Backend** → Render (Docker; `Dockerfile` at repo root bundles the API into a standalone Node image).
- **Database** → Neon (managed Postgres); `DATABASE_URL` points the API at it.
- **Mobile builds** → EAS (`eas build -p android --profile preview` produces the APK).

### Change the backend without rebuilding the app
The app reads its backend URL at launch from a small remote config file — `mobile-config.json` in this repo — so you can **move the backend (e.g., to another host) by editing one line and pushing**, with **no new APK required**. Resolution order: remote config → last cached value → the URL baked in at build time.

---

## 📚 Documentation

Deep-dive docs for reviewers (and AI evaluation):

| Doc | What's inside |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System design, request lifecycle, sequence diagrams (visitor approval & dues approval), monorepo & type-safety story, key design decisions |
| [`docs/FEATURES.md`](./docs/FEATURES.md) | Full feature catalogue per role, each mapped to the exact requirement it satisfies |
| [`docs/API.md`](./docs/API.md) | The 120-endpoint API reference grouped by domain, auth model, RBAC, and example requests |
| [`docs/DATA-MODEL.md`](./docs/DATA-MODEL.md) | Database schema, all tables & relationships, entity-relationship diagram |
| [`docs/QA-PLAN.md`](./docs/QA-PLAN.md) | End-to-end manual + automated QA plan |
| [`docs/DEPLOY-GCP.md`](./docs/DEPLOY-GCP.md) | Alternative cloud deployment guide |

---

## 📁 Repository Structure

```
PortL-App/
├─ apps/
│  ├─ mobile/            # Expo / React Native app (Resident · Guard · Admin)
│  └─ api/               # Express host for the tRPC router + OpenAPI
├─ packages/
│  ├─ trpc/              # tRPC routers, context, role procedures
│  ├─ services/          # Domain logic (auth, visitors, dues, community…)
│  └─ database/          # Drizzle schema, migrations, seed
├─ Dockerfile            # builds the backend for Render
├─ render.yaml           # Render blueprint
├─ mobile-config.json    # runtime backend URL (change host without a new APK)
└─ docs/                 # QA plan, deploy guide
```

---

## 📋 Submission Checklist

- [x] Public GitHub repository — https://github.com/Agam00/PortL-App
- [x] Installable **APK** — see Quick Links
- [x] **Live backend + database** (bonus) — https://portl-app.onrender.com
- [x] README with setup instructions (this file)
- [x] Demo credentials (above)
- [x] Comprehensive documentation ([`docs/`](./docs))
- [ ] Demo video *(recorded separately and added to the submission)*
- [ ] Screenshots *(added to the submission folder)*

---

<div align="center">

**Portl — making truly modern apartment communities.**

Built with Expo · React Native · tRPC · PostgreSQL

</div>
