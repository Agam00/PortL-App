<div align="center">

# **Security**

*How Portl handles identity, sessions, authorization and tenancy — and what it does not yet do.*

**[← Back to README](README.md)** · **[Architecture](docs/ARCHITECTURE.md)** · **[Runbook](docs/RUNBOOK.md)**

</div>

---

## Threat model in one line

Portl's users all live in the same building. The realistic adversary is **not** an
anonymous attacker on the internet — it is a **legitimate member of the society
reaching for data that belongs to another member**, and a **former resident whose
access should have ended**. Almost every control below exists for one of those two.

---

## Identity

### Password storage
Passwords are hashed with **bcrypt at cost factor 10** (`packages/services/auth/index.ts`).
The plaintext is never stored, never logged and never returned by any procedure — the
`password_hash` column is only ever read for comparison.

> **Purpose.** A society database contains home addresses next to names. Password reuse
> means a leaked hash is a threat to accounts far beyond this app, so the hash has to
> stand on its own.

### Two identifiers, one account
Login accepts an **email address or a phone number** in a single field, resolved
server-side against both columns. Both are `UNIQUE`.

> **Purpose.** Phone is the reliable identifier for this user base. Uniqueness on both
> stops two residents claiming the same contact point.

### Invite codes, not open signup
Residents and guards do not self-register. An admin creates the account with a
**12-character invite code**, which the user redeems — typed or scanned from a QR — to
set their own password. The code is `UNIQUE`, and is **cleared once claimed**, so it
cannot be replayed.

> **Purpose.** Membership of a society is decided by the society, not by whoever finds
> the signup screen. Clearing the code on claim makes it single-use by construction
> rather than by a flag someone might forget to check.

---

## Sessions

| Property | Value |
| --- | --- |
| Access token | **JWT**, signed with `ACCESS_TOKEN_SECRET`, **15-minute** TTL |
| Refresh token | 32 random bytes from `node:crypto`, **30-day** TTL |
| Refresh storage | **SHA-256 hashed** in `refresh_tokens` — the raw token is never persisted |
| Rotation | Every refresh **revokes the old token** (`revokedAt`) and issues a new one |
| Logout | Revokes that device's refresh token server-side |
| Client storage | Access token in memory / Zustand, persisted to **SecureStore** |

The access token carries `sub`, `role`, `societyId` and `flatId`. `createContext`
(`packages/trpc/server/context.ts`) verifies the `Bearer` header on every request and
puts the decoded payload on `ctx.user`; a bad or expired token yields `ctx.user = null`
rather than an error, so public procedures still work.

> **Purpose.** Storing refresh tokens hashed means a database read — the most likely
> compromise, given how much else lives in that database — does not hand over live
> sessions. Rotation on every use makes a stolen refresh token detectable: the moment
> the real device refreshes, the thief's copy is already revoked.

> **Purpose of the 15-minute access token.** A role change or a deactivation cannot be
> pushed into an already-issued JWT. A short TTL bounds how long a revoked user keeps
> working to a quarter of an hour.

---

## Authorization

Roles are `resident`, `guard`, `admin`. `packages/trpc/server/trpc.ts` builds four
procedure types on top of the base one:

```ts
publicProcedure      // no auth
protectedProcedure   // requires ctx.user, else UNAUTHORIZED
residentProcedure    // protected + role === "resident", else FORBIDDEN
guardProcedure       // protected + role === "guard"
adminProcedure       // protected + role === "admin"
```

Every one of the **126 operations** is declared with one of these. Authorization is a
property of the procedure definition, not something each handler remembers to check.

> **Purpose.** Hiding a button in the UI is a usability decision. The server returning
> `FORBIDDEN` is the actual control — and making it part of the procedure type means a
> new route cannot accidentally ship unguarded, because it has to pick a procedure to
> exist at all.

### Deactivation is distinguishable from bad credentials
A deactivated user is told *"Access revoked — your account has been deactivated by your
society admin"*, not *"Invalid credentials"*.

> **Purpose.** Deliberate divergence from the usual advice. These accounts are created
> by an admin who knows exactly who holds them, so there is no username-enumeration
> value to protect — while a resident whose login silently stops working will call the
> guard, not the admin, and waste everyone's evening.

### Multi-tenancy
Users, flats, towers, notices, dues, complaints and visitors are scoped by `societyId`,
carried in the access token and applied in the service layer.

> **Purpose.** One deployment serves many societies. Tenancy that depends on a client-
> supplied society ID would be no tenancy at all, so it comes from the signed token.

---

## Input validation

Every procedure boundary validates with **Zod 4** — the same schema produces the
TypeScript type, so the validated shape and the compile-time type cannot drift apart.

> **Purpose.** Types vanish at runtime. Zod is what actually stands between a request
> body and the database.

---

## Data handling

### Soft deletion preserves the gate log
Deleting a user sets `deletedAt`, wipes credentials and releases the email and phone
for reuse — but keeps the row, so authored posts, complaints and gate entries retain
their attribution. Every login query filters on `isNull(deletedAt)`.

> **Purpose.** A society may need last quarter's gate log after a resident has left.
> Hard deletion would either destroy that record or leave it pointing at nothing.

### Moderation
Users can report posts and comments and block other users (`content_reports`,
`user_blocks`); admins remove content or eject users.

> **Purpose.** Required by **App Store Guideline 1.2** for user-generated content, and
> independently necessary in a feed where every participant knows where the others live.

### Push tokens
Expo push tokens are stored per device and **unregistered on logout**.

> **Purpose.** A phone that has been sold, lost or handed on must stop receiving a
> society's visitor and emergency notifications.

---

## Infrastructure

- **PostgreSQL is not internet-facing.** `docker-compose.yml` publishes it as
  `127.0.0.1:5432:5432`; only the API on the same host can reach it.
- **TLS everywhere** — the app talks to `https://139.84.177.188.sslip.io`.
- **Secrets live in `.env`**, which is git-ignored. `.env.example` is tracked and must
  never contain a real value.
- **API docs are gated in production** — `/openapi.json` and `/docs` are served only
  when `NODE_ENV !== "prod"`, so the full API surface is not published.

> [!WARNING]
> Publishing Postgres as `"5432:5432"` exposes it to the entire internet, where scanners
> find default credentials within hours. This has happened to this project once — see
> [docs/RUNBOOK.md](docs/RUNBOOK.md) for the incident and the check that catches it.

---

## Known gaps

Stated plainly. None of these are secretly handled elsewhere.

| Gap | Impact | Notes |
| --- | --- | --- |
| **Production leaks SQL and stack traces to clients** | Medium | There is no `errorFormatter` in `packages/trpc/server/trpc.ts`, so a failed query returns the full statement and parameters to the app. Fix: format errors and log the cause server-side instead. |
| **No server-side error logging** | Medium | The same missing `errorFormatter` means errors reach the client but never `pm2 logs` — an outage leaves no trace on the server. |
| **No rate limiting** | Medium | Login and OTP-style endpoints accept unlimited attempts. bcrypt's cost is the only brake on password guessing. |
| **No automated tests** | Medium | Including none for the authorization rules — the controls above are verified by reading and by manual QA. |
| **No audit log** | Low–Medium | Admin actions (deactivating a user, deleting an account, approving a payment) are not recorded separately from their effect. |
| **No 2FA** | Low | Single-factor password login for all roles, including admin. |
| **No automated backups** | Medium | One VPS, one Postgres volume, no replica and no scheduled dump. |
| **Secrets are not rotated** | Low | `ACCESS_TOKEN_SECRET` rotation would invalidate all live sessions; there is no staged rotation path. |

---

## Reporting a vulnerability

Email **agamxpro69@gmail.com**. Please do not open a public issue for a security report.
