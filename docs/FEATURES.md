# Feature Catalogue

Every feature in Portl, grouped by role, with the exact hackathon requirement it satisfies and the API procedure(s) behind it. **All required features are implemented**; bonus features are marked 🎁.

---

## 👑 Society Admin

| Feature | Requirement | Key API |
|---|---|---|
| Dashboard with live metrics (residents, guards on duty, visitors today, open complaints) | Society admin dashboard | `admin.metrics`, `duty.guards` |
| **Gate Log** — full visitor entry/exit history with in/out times & status | Visitor entry/exit history | `visitors.history` |
| Manage **towers** (add/edit/remove) | Manage towers | `towers.*` |
| Manage **flats** (add/edit/remove, occupancy) | Manage flats | `flats.*` |
| Manage **residents** — invite (QR/code), reassign flat, activate/deactivate, delete | Manage residents | `admin.inviteResident`, `admin.reassignResidentFlat`, `admin.deactivateUser`, `admin.activateUser`, `admin.deleteUser` |
| Manage **guards** — invite, activate/deactivate | Manage residents/staff | `admin.inviteGuard`, `admin.deactivateUser` |
| Manage **amenities** (create/update/remove, open hours, capacity) | Manage amenities | `amenities.create/update/remove` |
| Post & manage **notices** (targeted scope) | Manage notices | `notices.create/update/delete` |
| Create & manage **polls** (single/multi, close) | Manage polls | `polls.create/close/delete` |
| Manage **complaints** — view, filter, set status, comment | Manage complaints | `complaints.list/update/setStatus/addComment` |
| Manage **staff & service providers** (verified flag) | Manage staff/service providers | `staffDirectory.create/update/remove` |
| Issue **dues** to one flat or **all residents** | (Maintenance dues) | `dues.create` (`applyToAll`) |
| **Approve / reject** resident payment submissions, view proof screenshot 🎁 | (Dues) | `dues.approvePayment`, `dues.rejectPayment`, `dues.proof` |
| Set society **UPI collection ID** 🎁 | (Dues) | `dues.setPaymentSettings` |
| Booking oversight per amenity | Manage amenities | `amenityBookings.listForAdmin` |
| Receive **emergency alerts** (full-screen popup) 🎁 | (Notifications) | `alerts.raise` → push |
| Chat with residents/guards 🎁 | — | `chat.*` |

---

## 🏠 Resident

| Feature | Requirement | Key API |
|---|---|---|
| **Approve / reject** visitor requests from the app | Visitor approval & rejection | `visitors.decide` |
| Receive **visitor requests** (push + in-app) | Resident notifications | `visitors.listPendingForResident` + push |
| **Pre-approve** guests / deliveries / cabs / services — QR pass + 6-digit code | Guest pre-approval, delivery approvals | `visitors.preApprove` |
| **Keep-at-gate** parcels released via OTP 🎁 | Delivery approvals | `visitors.preApprove` (`keepAtGate`), `visitors.collectPackage` |
| Cancel a pre-approval | Guest pre-approval | `visitors.cancelPreApproval` |
| View my **visitor history** | View visitor history | `visitors.mine`, `visitors.history` |
| View **notices**, react & comment | View society notices | `notices.listForResident/react/addComment` |
| Vote in **polls** (single & multi) | Participate in polls | `polls.listForResident`, `polls.vote` |
| Raise **helpdesk complaints** & track status, comment | Raise complaints, track status | `complaints.create/mine/addComment` |
| **Book amenities** (slots, booking pass, cancel, history) | Book amenities | `amenityBookings.availableSlots/create/cancel/myBookings` |
| **Pay maintenance dues** via UPI + upload screenshot proof 🎁 | (Maintenance payments) | `dues.mine`, `dues.collectionUpi`, `dues.submitUpiPayment` |
| **Community feed** — post, comment, like 🎁 | — | `posts.*` |
| **Emergency panic alert** 🎁 | — | `alerts.raise`, `alerts.myHistory` |
| **My Vehicles** — add/remove owned vehicles (type + number) 🎁 | — | `vehicles.mine/create/delete` |
| Chat with admin/guards; staff directory 🎁 | — | `chat.*`, `staffDirectory.listForResident` |
| See guards currently on duty | — | `duty.guards` |

---

## 🛡️ Security Guard

| Feature | Requirement | Key API |
|---|---|---|
| **Register** a walk-in visitor | Register visitors | `visitors.create` |
| **Search residents** (by name/flat) | Search residents | `residents.search` |
| **Raise approval requests** to residents | Raise approval requests | `visitors.create` → push |
| **Verify** approvals — gate-code entry & QR pass lookup | Verify approvals | `visitors.lookupByPassCode`, `visitors.searchPreApproved` |
| **Mark entry** / **mark exit** | Mark visitor entry/exit | `visitors.markEntry`, `visitors.markExit` |
| Release **keep-at-gate** parcels via resident OTP 🎁 | — | `visitors.collectPackage` |
| **Gate log / visitor history** (today's entries & exits) | View visitor history | `visitors.history` |
| Resident **directory** | Search residents | `residents.directory` |
| **On/off duty** status (visible to admin & residents) 🎁 | — | `duty.setStatus`, `duty.myStatus` |
| File a **report to admin** 🎁 | — | `alerts.guardReport` |

---

## 🔐 Cross-cutting

| Feature | Requirement |
|---|---|
| Secure auth — bcrypt + JWT access/refresh | Secure authentication |
| Server-enforced role-based access (`FORBIDDEN`/`UNAUTHORIZED`) | Role-based access |
| Society-scoped multi-tenancy | (implied) |
| Real Expo **push notifications** | Push notifications (recommended) |
| Public **admin/society registration** 🎁 | — |
| **In-app account deletion** (all roles) 🎁 | — |
| Loading / empty / error states, toasts, haptics | Mobile experience |
| Remote-config backend URL (change host without a new APK) 🎁 | — |

Legend: 🎁 = goes beyond the stated requirements.
