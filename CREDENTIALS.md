<div align="center">

# **Demo logins**

*Every seeded account, and the walkthroughs worth trying.*

**[← Back to README](README.md)** · **[Features](docs/FEATURES.md)** · **[Architecture](docs/ARCHITECTURE.md)**

</div>

---

## The password

Every demo account shares one password:

```
Portl@123
```

You can sign in with **either the email address or the phone number** — both resolve to
the same account.

---

## The society

**Palm Meadows Residency, Bengaluru** — 3 towers, 24 flats, 18 residents, 3 guards,
1 admin.

| Tower | Code | Flats |
|---|:--:|---|
| Maple | `A` | A-101 … A-401 |
| Orchid | `B` | B-101 … B-302 |
| Cedar | `C` | C-101 … C-301 |

---

## ⚙️ Admin

| Login | Phone | Name |
|---|---|---|
| `admin@portl.dev` | `+919845000100` | Asha Nair |

---

## 🛡️ Guards

| Login | Phone | Name |
|---|---|---|
| `guard1@portl.dev` | `+919845000201` | Ramesh Kumar |
| `guard2@portl.dev` | `+919845000202` | Suresh Yadav |
| `guard3@portl.dev` | `+919845000203` | Imran Shaikh |

---

## 🏠 Residents

`resident1@portl.dev` through `resident18@portl.dev`, in flat order.

| # | Login | Name | Flat | Phone |
|:--:|---|---|:--:|---|
| 1 | `resident1@portl.dev` | Priya Sharma | A-101 | `+919845012001` |
| 2 | `resident2@portl.dev` | Rahul Verma | A-102 | `+919972043118` |
| 3 | `resident3@portl.dev` | Ananya Iyer | A-201 | `+918050119274` |
| 4 | `resident4@portl.dev` | Vikram Singh | A-202 | `+919886530147` |
| 5 | `resident5@portl.dev` | Neha Gupta | A-301 | `+917676204893` |
| 6 | `resident6@portl.dev` | Arjun Nair | A-302 | `+919900117845` |
| 7 | `resident7@portl.dev` | Kavita Rao | A-401 | `+919480276310` |
| 8 | `resident8@portl.dev` | Sanjay Mehta | B-101 | `+919148850392` |
| 9 | `resident9@portl.dev` | Meera Krishnan | B-102 | `+917022619074` |
| 10 | `resident10@portl.dev` | Aditya Kulkarni | B-201 | `+919632508817` |
| 11 | `resident11@portl.dev` | Divya Menon | B-202 | `+918762340951` |
| 12 | `resident12@portl.dev` | Rohan Kapoor | B-301 | `+919845771260` |
| 13 | `resident13@portl.dev` | Sneha Reddy | B-302 | `+917338890124` |
| 14 | `resident14@portl.dev` | Karan Malhotra | C-101 | `+919611452038` |
| 15 | `resident15@portl.dev` | Pooja Bhat | C-102 | `+918884019657` |
| 16 | `resident16@portl.dev` | Farhan Ali | C-201 | `+919035678420` |
| 17 | `resident17@portl.dev` | Ishaan Joshi | C-202 | `+917829140563` |
| 18 | `resident18@portl.dev` | Lakshmi Pillai | C-301 | `+919449803271` |

---

# Walkthroughs worth trying

The seed stages real data on purpose, so no screen is empty and every flow can be
finished — not just started.

## 1. The visitor loop, from both sides

The flow the whole app is built around. Use two devices, or log out and back in.

1. Sign in as **`guard1@portl.dev`** → register a walk-in visitor against **A-101**.
2. Sign in as **`resident1@portl.dev`** (Priya Sharma, A-101) → the request is waiting;
   approve it.
3. Back as the guard → the in-out board moves the visitor to **Approved**; mark entry,
   then mark exit.
4. As either → the gate log now shows the full visit with both timings.

> Pending requests are already seeded, so you can see the resident side immediately
> without staging a visitor first.

## 2. A QR gate pass

1. As **`resident1@portl.dev`** → pre-approve a guest. You get a **QR pass and a
   6-digit code**.
2. As **`guard1@portl.dev`** → open the scanner and scan it, *or* type the 6-digit code.
   Both paths redeem the same pass.

## 3. A parcel held at the gate

One is already waiting.

1. As **`guard1@portl.dev`** → find the keep-at-gate parcel.
2. Release it against the **collection OTP** the resident holds.

## 4. Approving a maintenance payment

A payment is seeded **awaiting approval**, with a real UPI screenshot attached.

1. As **`admin@portl.dev`** → **Dues** → open the pending submission.
2. View the proof screenshot, then approve or reject it.
3. As the paying resident → the due's status has changed.

A second due is seeded **already paid and approved**, so both states are visible.

## 5. Issue a due to everyone

As **`admin@portl.dev`** → **Dues** → create a due with **apply to all**. Every
resident sees it on their next refresh.

## 6. Notices, polls and complaints

- **Notices** — seeded with reactions and comments, including *"Lift servicing in
  Orchid on Wednesday."* React and comment as a resident.
- **Polls** — two are live. Vote as a resident; close one as the admin.
- **Complaints** — six are seeded across `open`, `in_progress` and resolved, e.g.
  *"Garbage not collected on 1st floor, Orchid"* (Kavita Rao) and *"Lift making noise
  in Orchid"* (Sanjay Mehta, assigned to the admin). Move one through its statuses and
  comment on the thread.

## 7. Emergency alert

As any resident → raise the **panic alert**. As **`guard1@portl.dev`** on the gate
dashboard → it arrives as a **full-screen popup** with one-tap acknowledge. One alert
already sits in history.

## 8. Guard duty status

As **`guard1@portl.dev`** → go on duty from Settings. As a resident or the admin →
the guard now shows as on duty, with contact and chat available.

## 9. Chat across all three roles

Message guard ↔ resident ↔ admin. Every author carries a **role tag**, and the
residents/society tabs split the list.

## 10. Invite a new resident

As **`admin@portl.dev`** → invite a resident to a free flat. You get a **12-character
invite code and a QR**. Sign out, choose *activate a new account*, and redeem it to set
a password — the code is cleared once claimed and cannot be reused.

## 11. Moderation

As any resident → **report** a post or comment on the community feed, and **block**
another user. As **`admin@portl.dev`** → act on the report.

## 12. Community feed

Seeded with posts, comments and likes — including *"Lost a set of keys near the Maple
lobby"* from Priya Sharma. Post, comment and like as any resident.

---

# Resetting the demo data

```bash
pnpm db:seed
```

Re-running the seed rebuilds the society, accounts and all staged scenarios.

> [!WARNING]
> These are **demo credentials for a demo society**. `Portl@123` is published in this
> file and in the App Store review notes — never use it, or these accounts, on a
> deployment holding real residents' data.
