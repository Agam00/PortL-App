# Deploying the Portl backend to Google Cloud

Target: **Cloud Run** (runs the container) + **Cloud SQL for PostgreSQL** (managed DB).
Cost on your $300 credits: Cloud Run is ~free when idle; Cloud SQL `db-f1-micro` is ~$8/mo → credits last years.

Everything below is copy-paste. Replace the `ALL_CAPS` placeholders. The example region is `asia-south1` (Mumbai) — change if you prefer.

> Prefer less networking? See **Appendix B** to use free **Neon** Postgres instead of Cloud SQL. The container and all other steps are identical.

---

## What's already in the repo (done for you)
- `apps/api/tsup.config.ts` — bundles the whole app into one self-contained `dist/index.js` (verified it boots standalone).
- `Dockerfile` + `.dockerignore` at the repo root — builds and runs that bundle on Node 20.
- The mobile app already reads the backend URL from `EXPO_PUBLIC_API_URL` (`apps/mobile/lib/env.ts`), so pointing it at the cloud is just an env change.

---

## Step 0 — Install the tools (one time)

1. **Google Cloud CLI** — install from https://cloud.google.com/sdk/docs/install, then:
   ```bash
   gcloud auth login
   ```
2. **Cloud SQL Auth Proxy** (only needed to run migrations from your laptop) — download from
   https://cloud.google.com/sql/docs/postgres/sql-proxy#install and put `cloud-sql-proxy` on your PATH.

You do **not** need Docker locally — Cloud Build builds the image in the cloud.

---

## Step 1 — Create / select a project and enable APIs

```bash
# create a new project (or reuse one) — the ID must be globally unique
gcloud projects create portl-prod-123 --name="Portl"
gcloud config set project portl-prod-123

# link your billing account (the one holding the $300 credits)
gcloud billing accounts list
gcloud billing projects link portl-prod-123 --billing-account=BILLING_ACCOUNT_ID

# enable the services we use
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com
```

---

## Step 2 — Create the PostgreSQL database (Cloud SQL)

```bash
# 1. the instance (this takes a few minutes)
gcloud sql instances create portl-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --root-password=STRONG_ROOT_PW

# 2. the database
gcloud sql databases create portl --instance=portl-db

# 3. an app user
gcloud sql users create portl \
  --instance=portl-db \
  --password=APP_USER_PW

# 4. note the connection name — you'll need it below (format: PROJECT:REGION:portl-db)
gcloud sql instances describe portl-db --format='value(connectionName)'
```
Call the value from step 4 `CONNECTION_NAME` (e.g. `portl-prod-123:asia-south1:portl-db`).

---

## Step 3 — Generate the auth secret

The API needs `ACCESS_TOKEN_SECRET` (min 10 chars). Generate a strong one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Save the output as `ACCESS_TOKEN_SECRET`.

---

## Step 4 — Run migrations + seed against Cloud SQL

Open **terminal A** and start the proxy (keep it running):
```bash
cloud-sql-proxy CONNECTION_NAME          # exposes 127.0.0.1:5432
```

In **terminal B**, from the repo root, point the DB tools at the proxy and run them:
```bash
export DATABASE_URL="postgresql://portl:APP_USER_PW@127.0.0.1:5432/portl"

pnpm --filter @repo/database db:migrate   # create the schema
pnpm --filter @repo/database db:seed      # load demo society + login accounts
```
> `db:seed` prints the demo logins (all password `Portl@123`). Seeding is optional but recommended so the demo has data. You can stop the proxy afterwards.
> If a password contains special characters (`@ : / ?`), URL-encode them in the string.

---

## Step 5 — Deploy to Cloud Run

From the repo root (the folder with the `Dockerfile`):
```bash
gcloud run deploy portl-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --add-cloudsql-instances CONNECTION_NAME \
  --set-env-vars "NODE_ENV=prod" \
  --set-env-vars "ACCESS_TOKEN_SECRET=YOUR_GENERATED_SECRET" \
  --set-env-vars "^@@^DATABASE_URL=postgresql://portl:APP_USER_PW@/portl?host=/cloudsql/CONNECTION_NAME"
```
Notes:
- `--source .` makes Cloud Build build the `Dockerfile` for you and push the image (first run auto-creates an Artifact Registry repo — say yes if prompted).
- The `^@@^` prefix changes the delimiter to `@@` so the `/` and `?` inside `DATABASE_URL` aren't split. (When connecting to Cloud SQL from Cloud Run, `pg` uses the unix socket `/cloudsql/CONNECTION_NAME`; the host before `/portl` is intentionally empty.)
- Cloud Run injects `PORT` automatically — the server already reads it.

When it finishes it prints a **Service URL** like `https://portl-api-xxxxxx-el.a.run.app`.

---

## Step 6 — Set BASE_URL and verify

```bash
gcloud run services update portl-api --region asia-south1 \
  --set-env-vars "BASE_URL=https://portl-api-xxxxxx-el.a.run.app"

# health check
curl https://portl-api-xxxxxx-el.a.run.app/health
# → {"message":"Streamyst server is healthy","healthy":true}
```
Try a real call (should return demo data if you seeded):
```bash
curl -X POST https://portl-api-xxxxxx-el.a.run.app/api/authentication/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@portl.dev","password":"Portl@123"}'
```

---

## Step 7 — Point the mobile app at the cloud

Edit `apps/mobile/.env` (copy from `.env.example` if needed):
```
EXPO_PUBLIC_API_URL=https://portl-api-xxxxxx-el.a.run.app
```
Then rebuild the app / APK:
```bash
pnpm --filter mobile dev -- --clear        # for local testing against the cloud
# or a shareable build:
cd apps/mobile && eas build -p android --profile preview
```
The app talks to `${EXPO_PUBLIC_API_URL}/trpc`, which your deployed server serves.

---

## Redeploying after code changes
```bash
# rebuild the standalone bundle locally to sanity-check (optional)
pnpm --filter @repo/api build

# ship it
gcloud run deploy portl-api --source . --region asia-south1
```
Env vars persist across deploys — you only set them again when they change.

---

## Cost control & teardown
- Cloud Run scales to **zero** when idle — you pay per request.
- Keep Cloud SQL on `db-f1-micro`. To stop paying while not demoing: `gcloud sql instances patch portl-db --activation-policy=NEVER` (stops it) / `--activation-policy=ALWAYS` (starts it).
- Full teardown: `gcloud run services delete portl-api` and `gcloud sql instances delete portl-db`.

---

## Troubleshooting
- **Build fails on `pnpm install --frozen-lockfile --filter`** → change that line in the `Dockerfile` to `RUN pnpm install --frozen-lockfile` (installs the full workspace; slower but bulletproof).
- **`ECONNREFUSED` / DB errors at runtime** → the `DATABASE_URL` socket host or `--add-cloudsql-instances CONNECTION_NAME` is wrong; both must reference the same `CONNECTION_NAME`.
- **`ACCESS_TOKEN_SECRET` error on boot** → it must be set and ≥10 chars.
- **Migrations "can't connect"** → the Cloud SQL Auth Proxy (terminal A) isn't running, or `sqladmin.googleapis.com` isn't enabled.
- **CORS from a browser/Scalar docs** → in `prod` the permissive CORS is off (fine for the native app). To open it, deploy with `NODE_ENV=development`.

---

## Appendix A — env vars reference
| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string (Cloud SQL socket or Neon URL) |
| `ACCESS_TOKEN_SECRET` | ✅ | JWT signing secret, ≥10 chars |
| `NODE_ENV` | – | `prod` recommended; `development` keeps CORS open |
| `BASE_URL` | – | public URL, used for the OpenAPI/docs base |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI` | – | only if you enable Google OAuth |
| `PORT` | – | set automatically by Cloud Run |

## Appendix B — use Neon (free) instead of Cloud SQL
1. Create a project at https://neon.tech and copy its connection string (`postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`).
2. Migrate/seed directly (no proxy needed):
   ```bash
   export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
   pnpm --filter @repo/database db:migrate && pnpm --filter @repo/database db:seed
   ```
3. Deploy exactly as Step 5 **but drop** `--add-cloudsql-instances` and pass the Neon URL:
   ```bash
   gcloud run deploy portl-api --source . --region asia-south1 --allow-unauthenticated \
     --set-env-vars "NODE_ENV=prod,ACCESS_TOKEN_SECRET=YOUR_SECRET" \
     --set-env-vars "^@@^DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
   ```
