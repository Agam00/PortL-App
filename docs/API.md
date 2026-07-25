# API Reference

- **Base URL (live):** `https://portl-app.onrender.com`
- **Two surfaces, one router:** the app uses **tRPC** at `/trpc`; the same procedures are exposed as **REST** at `/api/*` via `trpc-to-openapi`.
- **Interactive docs:** `https://portl-app.onrender.com/docs` · **OpenAPI JSON:** `/openapi.json`
- **120 endpoints** across 23 domains.

## Authentication
Send the JWT access token as a header:
```
Authorization: Bearer <accessToken>
```
Obtain it from `POST /api/authentication/login`. On `401`, call `POST /api/authentication/refresh` with your refresh token (rotates both tokens).

## Access levels (server-enforced)
| Level | Rule |
|---|---|
| **public** | no auth |
| **protected** | any logged-in user, else `UNAUTHORIZED` (401) |
| **resident / guard / admin** | must match role, else `FORBIDDEN` (403) |

## Error shape
```json
{ "message": "Requires admin role", "code": "FORBIDDEN",
  "data": { "code": "FORBIDDEN", "httpStatus": 403 } }
```
Common codes: `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `BAD_REQUEST` 400 · `NOT_FOUND` 404 · `CONFLICT` 409.

---

## Example requests

**Login**
```bash
curl -X POST https://portl-app.onrender.com/api/authentication/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@portl.dev","password":"Portl@123"}'
```

**Authorized call**
```bash
curl https://portl-app.onrender.com/api/admin/metrics \
  -H "Authorization: Bearer <accessToken>"
```

**Create a due for all residents (admin)**
```bash
curl -X POST https://portl-app.onrender.com/api/dues \
  -H "Authorization: Bearer <adminToken>" -H "Content-Type: application/json" \
  -d '{"title":"Maintenance – July","amount":2500,"dueDate":"2026-08-05","applyToAll":true}'
```

---

## Endpoints by domain
`GET` = query · `POST` = mutation. Paths shown for the REST surface (prefix with `/api`).

### Authentication  `public` unless noted
| Method | Path | Access |
|---|---|---|
| POST | `/authentication/login` | public |
| POST | `/authentication/register` | public (creates society + admin) |
| POST | `/authentication/refresh` | public |
| POST | `/authentication/logout` | public |
| GET  | `/authentication/invite` | public (look up an invite) |
| POST | `/authentication/claim` | public (redeem invite) |
| GET  | `/authentication/me` | protected |
| POST | `/authentication/set-password` | protected |
| POST | `/authentication/delete-account` | protected |
| GET  | `/authentication/supported-providers` | public |

### Admin  `admin`
`GET /admin/metrics` · `GET /admin/residents` · `GET /admin/guards` · `POST /admin/residents/invite` · `POST /admin/guards/invite` · `POST /admin/residents/reassign-flat` · `POST /admin/users/activate` · `POST /admin/users/deactivate` · `POST /admin/users/delete`

### Towers / Flats  `admin` (read shared)
`GET|POST /towers` · `POST /towers/update` · `POST /towers/delete` · `GET|POST /flats` · `POST /flats/update` · `POST /flats/delete`

### Residents
`GET /residents/search` (guard) · `GET /residents/directory` (protected)

### Visitors
| Method | Path | Access |
|---|---|---|
| POST | `/visitors` | guard (register) |
| POST | `/visitors/decide` | resident (approve/reject) |
| POST | `/visitors/pre-approve` | resident |
| POST | `/visitors/pre-approved/cancel` | resident |
| GET  | `/visitors/pre-approved` / `/visitors/mine` | resident |
| GET  | `/visitors/pending` | resident |
| GET  | `/visitors/pre-approved/search` | guard |
| GET  | `/visitors/pass-lookup` | guard |
| POST | `/visitors/mark-entry` / `/visitors/mark-exit` | guard |
| POST | `/visitors/collect-package` | guard (keep-at-gate OTP) |
| GET  | `/visitors/history` | guard/admin |

### Dues
| Method | Path | Access |
|---|---|---|
| GET|POST | `/dues` | admin (list / create) |
| GET  | `/dues/mine` | resident |
| GET|POST | `/dues/settings` | admin (UPI collection) |
| GET  | `/dues/collection-upi` | resident |
| POST | `/dues/submit-upi` | resident (upload proof) |
| POST | `/dues/approve` / `/dues/reject` | admin |
| GET  | `/dues/proof` | admin |
| POST | `/dues/pay-mock` | resident |

### Community
- **Notices:** `GET|POST /notices` · `/notices/update` · `/notices/delete` · `/notices/mine` · `/notices/react` · `/notices/mark-read` · `GET /notices/comments` · `POST /notices/comments/add`
- **Polls:** `GET|POST /polls` · `/polls/mine` · `/polls/vote` · `/polls/close` · `/polls/delete`
- **Complaints:** `GET|POST /complaints` · `/complaints/mine` · `/complaints/community` · `/complaints/update` · `/complaints/set-status` · `GET /complaints/comments` · `POST /complaints/comments/add`
- **Posts (feed):** `GET|POST /posts` · `/posts/like` · `/posts/pin` · `/posts/delete` · `GET /posts/comments` · `POST /posts/comments/add` · `/posts/comments/delete`

### Amenities & Bookings
`GET|POST /amenities` · `/amenities/update` · `/amenities/delete` · `/amenities/mine` · `GET /amenity-bookings/slots` · `POST|GET /amenity-bookings` · `/amenity-bookings/mine` · `/amenity-bookings/cancel`

### Staff directory
`GET|POST /staff-directory` · `/staff-directory/update` · `/staff-directory/delete` · `/staff-directory/mine`

### Vehicles  `resident`
`GET /vehicles/mine` · `POST /vehicles` · `POST /vehicles/delete`

### Chat  `protected`
`GET /chat/conversations` · `GET /chat/thread` · `GET /chat/staff-contacts` · `POST /chat/send`

### Alerts
`POST /alerts/raise` (resident) · `GET /alerts/history` (resident) · `POST /alerts/guard-report` (guard)

### Duty
`GET /duty/me` (guard) · `POST /duty` (guard) · `GET /duty/guards` (protected)

### Notifications & Push
`GET /notifications` · `POST /notifications/mark-read` · `POST /notifications/mark-all-read` · `POST /push-tokens/register`

### Service requests  `resident`
`POST /service-requests` · `GET /service-requests/mine` · `POST /service-requests/cancel`

### Health
`GET /health` — `{ "healthy": true }`
