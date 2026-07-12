# Portl

A mobile-first society management app — Resident, Security Guard, and Society Admin experiences in one Expo/React Native app, backed by a tRPC + Express + Postgres (Drizzle) API.

See [`plan.md`](./plan.md) for the full phased build plan.

## Monorepo layout

```
apps/
  api/       Express + tRPC server (OpenAPI docs auto-generated at /docs)
  mobile/    Expo Router app (Resident / Guard / Admin) — the primary deliverable
  web/       Next.js scaffold — not used in this build, ignore
packages/
  database/  Drizzle ORM schema + migrations (Postgres)
  trpc/      Shared tRPC router (client + server types)
  services/  Domain services consumed by the tRPC routers
  logger/    Shared logger
```

## Prerequisites

- Node ≥ 18, pnpm 9 (`corepack enable` or `npm i -g pnpm@9`)
- Docker Desktop (for local Postgres)
- Expo CLI (via `pnpm dlx expo`) and the **Expo Go** app on your phone, or an Android/iOS emulator

## First-time setup

```bash
pnpm install

cp .env.example .env          # fill in DATABASE_URL / secrets if you changed defaults
pnpm env:sync                 # copies root .env into apps/api, packages/database, packages/services

cp apps/mobile/.env.example apps/mobile/.env   # then set EXPO_PUBLIC_API_URL to your machine's LAN IP

docker-compose up -d          # starts Postgres on localhost:5432
pnpm db:generate               # generate SQL migrations from the Drizzle schema
pnpm db:migrate                # apply migrations
pnpm db:seed                   # wipes and reseeds a demo society, towers, flats, users, visitors, etc.
```

## Running locally (3 terminals)

```bash
# 1. Database
docker-compose up

# 2. API (tRPC + Express, http://localhost:8000, docs at /docs)
pnpm --filter @repo/api dev

# 3. Mobile app (Expo)
pnpm --filter mobile dev
```

Then scan the QR code with Expo Go, or press `a`/`i` for an Android/iOS emulator, or `w` for web.

> **Physical device testing:** `EXPO_PUBLIC_API_URL` must point at your machine's LAN IP (not `localhost`), and your phone must be on the same Wi-Fi network. Find your IP with `ipconfig` (Windows) and re-check it if you reconnect to Wi-Fi.

> **`tsx watch` gotcha:** `apps/api`'s dev server only watches `apps/api/src/**`. If you edit `packages/services`, `packages/trpc`, or `packages/database` while the API is running, those changes are **not** picked up automatically (they're consumed through a pnpm-symlinked `node_modules`, which the watcher ignores) — restart `pnpm --filter @repo/api dev` after editing anything outside `apps/api` itself.

## Demo credentials

`pnpm db:seed` wipes and reseeds one demo society ("Palm Meadows", 2 towers, 10 flats). All seeded
accounts share the same password:

| Role     | Phone           | Email               |
| -------- | --------------- | -------------------- |
| Admin    | +911000000001   | admin@portl.dev       |
| Guard    | +911000000002   | guard1@portl.dev      |
| Guard    | +911000000003   | guard2@portl.dev      |
| Resident | +911000000010   | resident1@portl.dev (flat A-101) |

Password for all of the above: **`Portl@123`**

(8 residents total are seeded — `resident1@portl.dev` through `resident8@portl.dev` — across flats A-101 through B-202; 2 flats are left intentionally vacant. See `packages/database/seed.ts` for the full data set: sample visitors, notices, a poll, complaints, amenities + a booking, a pending due, and staff directory entries.)

Login is live: `POST /trpc/auth.login` with `{ identifier, password }` (identifier = phone or email) returns a 15-minute JWT access token plus a 30-day opaque refresh token. See `packages/trpc/server/routes/auth/route.ts` for the full set of endpoints (`login`, `refresh`, `logout`, `me`, `setPassword`) and `packages/trpc/server/routes/admin/route.ts` for admin-only onboarding (`inviteResident`, `inviteGuard`, `deactivateUser`).

## Status

Actively being built for a hackathon — see [`plan.md`](./plan.md) for progress and what's intentionally out of scope.
