# Portl — Server Runbook

Operating notes for the **live backend on Vultr**. This is the server the App Store build talks to.

For the (unused) Google Cloud path see `DEPLOY-GCP.md`; for the app itself see `ARCHITECTURE.md`.

---

## The stack

| Piece | Value |
| --- | --- |
| Host | Vultr VPS · Ubuntu 24.04 · `139.84.177.188` |
| Public URL | `https://139.84.177.188.sslip.io` (sslip.io resolves the IP to a hostname so TLS works without buying a domain) |
| Repo on server | `/root/PortL-App` |
| API process | PM2, app name `portl-api` (fork mode, cwd `/root/PortL-App/apps/api`) |
| Database | PostgreSQL 15 in Docker — container `postgresdb`, database `dev`, user `postgres` |
| DB storage | Docker volume `pg_data` (survives container recreation) |
| Mobile → backend | The app reads `apiUrl` from `mobile-config.json` on GitHub `main` at runtime — change the backend URL there, no rebuild needed |

```
Expo app ──HTTPS──▶ 139.84.177.188.sslip.io ──▶ PM2 (portl-api, Express+tRPC) ──▶ 127.0.0.1:5432 ──▶ Docker postgresdb
```

---

## Everyday commands

```bash
ssh root@139.84.177.188

pm2 list                      # is the API up? (↺ column = restart count)
pm2 logs portl-api            # live logs
docker ps                     # is Postgres up?
docker exec postgresdb pg_isready -U postgres
```

### Deploy a new version

```bash
cd /root/PortL-App
git fetch origin && git reset --hard origin/main
pnpm install
pnpm build
pm2 restart portl-api --update-env
```

> `--update-env` matters. Without it PM2 reuses the environment captured when the process
> **first** started, so edits to `.env` silently do nothing.

> `git reset --hard` discards local edits to tracked files. If you hand-edited something on
> the server (e.g. `docker-compose.yml`), commit it to the repo or it will be wiped — see
> **Gotcha 3**.

### Run migrations

```bash
cd /root/PortL-App && pnpm db:migrate
```

---

## 🔥 Outage: every request returns 500 "Failed query"

The symptom looks like this in the app — a red banner containing raw SQL:

```
Failed query: select "id", "full_name", … from "users" where …
params: admin@portl.dev,admin@portl.dev,1
```

**This almost always means the API cannot connect to Postgres.** It is *not* a broken query.

### Why the server still looks healthy

Two traps make this outage hide in plain sight:

1. **`/health` does not touch the database.** `apps/api/src/server.ts` returns a static JSON
   object. It stays green while every real request fails.
2. **The DB pool connects lazily.** `packages/database/index.ts` calls `drizzle(env.DATABASE_URL)`,
   which does not dial Postgres at boot. A completely wrong `DATABASE_URL` still lets the process
   start, go `online` in PM2, and pass health checks.

So "PM2 says online" and "health check is 200" prove nothing here. Ignore both.

### Diagnose in one command

tRPC has no error logging, so **`pm2 logs` will be empty** — the real Postgres error only exists
in the HTTP response. Get it directly:

```bash
cd /root/PortL-App/packages/database && node -e "require('dotenv').config({path:'/root/PortL-App/.env'});const{Client}=require('pg');const u=process.env.DATABASE_URL;console.log('URL:',u?u.replace(/:[^:@]*@/,':****@'):'MISSING');const c=new Client({connectionString:u,connectionTimeoutMillis:8000});c.connect().then(()=>c.query('select current_database(),current_user')).then(r=>console.log('OK',r.rows[0])).catch(e=>console.log('ERR',e.code,e.message)).finally(()=>process.exit(0))"
```

It prints the URL with the password masked (safe to paste into chat) and the raw error code.

### Read the error code

| Code / message | Meaning | Fix |
| --- | --- | --- |
| `28P01 password authentication failed` | `.env` password ≠ database password | See **Password mismatch** below |
| `ECONNREFUSED` | Postgres container is down | `cd /root/PortL-App && docker compose up -d` |
| `3D000 database "dev" does not exist` | Volume was wiped | `pnpm db:migrate`, then `pnpm db:seed` |
| `53300 too many clients already` | Connection leak / `max_connections` | `docker restart postgresdb && pm2 restart portl-api` |
| `42703 column … does not exist` | Schema drift — migrations behind the code | `pnpm db:migrate` |
| `URL: MISSING` | dotenv found no `.env` | Check PM2's cwd: `pm2 describe portl-api \| grep "exec cwd"` |

> **Tell schema drift apart from a connection problem in one shot:** if queries against *two
> different tables* both fail, it is the connection. A missing column only breaks the one table.
> Test a second table with `curl -X POST https://139.84.177.188.sslip.io/trpc/auth.refresh -H "Content-Type: application/json" -d '{"refreshToken":"x"}'` — it hits `refresh_tokens` instead of `users`.

### Password mismatch (`28P01`)

The database password lives in two places that must agree.

```bash
# 1. see what the app expects
grep DATABASE_URL /root/PortL-App/.env

# 2. force the database to match it
docker exec postgresdb psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'THE_PASSWORD'"

# 3. sync all .env copies, then restart
cd /root/PortL-App && pnpm env:sync && pm2 restart portl-api --update-env
```

Then re-run the diagnose command — it should print `OK { current_database: 'dev', … }`.

> `POSTGRES_PASSWORD` in `docker-compose.yml` only applies when the volume is created for the
> **first time**. On an existing database it does nothing — `ALTER USER` is the only thing that
> changes the password.

---

## Gotchas that have bitten this project

### 1. There are four `.env` files, not one

```
.env                        ← the source of truth
apps/api/.env               ← copy
packages/database/.env      ← copy
packages/services/.env      ← copy
```

Each package loads the `.env` nearest its own working directory, so **editing the root `.env`
alone does not fix anything.** Never hand-edit the copies. After changing the root file:

```bash
cd /root/PortL-App && pnpm env:sync && pm2 restart portl-api --update-env
```

To find every copy and confirm they agree:

```bash
cd /root/PortL-App && grep -r "DATABASE_URL=" --include=".env*" --exclude-dir=node_modules .
```

### 2. Never bulk-edit `.env*` with a glob

`.env.example` is **tracked by git**. A `grep -rl … | xargs sed -i` over `.env*` writes the real
password into it, and the next commit publishes that secret to GitHub. If it happens:

```bash
cd /root/PortL-App && git checkout -- .env.example && git status --short
```

### 3. Postgres must stay bound to loopback

`docker-compose.yml` publishes the database as `127.0.0.1:5432:5432`. Publishing it as
`"5432:5432"` exposes it to the **entire internet**, where scanners find default credentials
within hours. Verify from a machine that is not the server:

```bash
nc -vz 139.84.177.188 5432     # must fail / time out
```

If a hand-edit made on the server is not committed to the repo, the next `git reset --hard`
reopens the port. Keep the fix in git.

### 4. `git reset --hard` after the history rewrite

The repo was force-pushed (Claude co-author trailers removed). A plain `git pull` can fail; use:

```bash
cd /root/PortL-App && git fetch origin && git reset --hard origin/main
```

---

## Verify a fix from outside the server

Always confirm from your own machine — the server's own health check will lie to you.

```bash
# 1. is the API reachable?
curl -s -o /dev/null -w "%{http_code}\n" https://139.84.177.188.sslip.io/health

# 2. does a real database-backed request work? (this is the actual test)
curl -s -X POST https://139.84.177.188.sslip.io/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@portl.dev","password":"Portl@123"}'
```

A working response starts with `{"result":{"data":{"accessToken":"eyJ…`.
A broken one starts with `{"error":{"message":"Failed query…`.

---

## Health check of last resort

```bash
docker exec postgresdb psql -U postgres -d dev -c "\dt"
```

A healthy database lists **30 tables** (`users`, `visitors`, `notices`, `complaints`, `dues`,
`amenities`, `messages`, `polls`, `vehicles`, `user_blocks`, `content_reports`, …). Unfamiliar
table names, or far fewer than 30, mean the database was tampered with or reset — check
`ARCHITECTURE.md` and `DATA-MODEL.md` for the expected set.

---

## Known weak spots

- **No server-side error logging.** `packages/trpc/server/trpc.ts` has no `errorFormatter`, so
  errors go to the client and are never written to `pm2 logs`. Adding one would surface the
  Postgres `error.cause` server-side.
- **Prod leaks SQL and stack traces to clients** — the red banner above is the full query plus
  parameters. Same fix as above.
- **`/health` is cosmetic** — it should run `select 1` so it goes red during a real outage.
- **Migration drift** — `drizzle-kit push` has been used against the live DB, so committed
  migrations may not reproduce the schema from scratch. Regenerate before any fresh deploy.
