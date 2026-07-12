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
pnpm db:seed                   # seed demo society/residents/guards/admin (once Phase 1 lands)
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

## Demo credentials

_Added once the seed script (Phase 1) lands._

## Status

Actively being built for a hackathon — see [`plan.md`](./plan.md) for progress and what's intentionally out of scope.
