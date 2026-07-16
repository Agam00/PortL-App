---
target: whole app, cross-role (resident/guard/admin representative screens)
total_score: 23
p0_count: 1
p1_count: 3
timestamp: 2026-07-15T19-05-30Z
slug: apps-mobile-app-whole-app-cross-role
---
# Portl Mobile — UX/Design Critique

**Method:** dual-agent (A: independent design review · B: independent code-level structural scan)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Solid feedback loop everywhere (RefreshControl, polling, haptics+toast+invalidate), but no "last updated" cue and silent poll-driven reordering |
| 2 | Match Between System & Real World | 3 | Domain vocabulary accurate and consistent (Flat, Tower, Dues, Checked In) |
| 3 | User Control and Freedom | 2 | No undo anywhere; forms wipe silently on cancel with no confirm |
| 4 | Consistency and Standards | 1 | Two undocumented off-spec colors used 8x (#e5484d, #3dd68c), a second unnamed radius token used 21x, status labels for the same state drift ("Waiting" vs "Pending") across 4 files |
| 5 | Error Prevention | 2 | Validation fires on submit only; email/phone fields check non-empty, not format |
| 6 | Recognition Rather Than Recall | 3 | Visible chip-pickers, not typed fields, throughout |
| 7 | Flexibility and Efficiency | 2 | No bulk actions, 


**[P1] Identical visitor status renders under two different labels depending on screen.**
pending reads as "Waiting" in VisitorRequestCard/GuardQueueRow but "Pending" in HistoryRow and History filter chips — four independent hardcoded copies.
Suggested command: $impeccable clarify

**[P2] The 9 admin CRUD screens are 9 separate hand-written implementations of the same scaffold.**
Exact list-row className string in all 9 admin screens; loading ActivityIndicator line verbatim in 23 files app-wide. Edit/Delete icon-button pairs hand-rolled independently in 5 of 9 files.
Suggested command: $impeccable distill

## Persona Red Flags

**Jordan (first-timer):** "raise a ticket" is icon-only on Helpdesk, but the identical job ("+ Invite Resident") is a full labeled button on Admin Residents.

**Sam (screen-reader):** StatusDot renders dot and label as two ungrouped nodes. Helpdesk ticket row nests an expand/collapse Pressable around an inner Send Pressable and live Input — a known RN touch-responder trap.

**Riley (stress tester):** admin "assign flat" picker renders one chip per flat in the entire society with no cap or search.

**Casey (thumb-only, interrupted):** directly hit by the P0 keyboard bug — typing near the bottom of a form gets no compensating scroll on Android.

## Minor Observations

- font-bold used once where every other headline uses font-semibold.
- text-[10px] on the notification-count badge, below the smallest documented type token.
- Call button and "send comment" button each hand-duplicated verbatim in two separate files.
- Email/phone fields validate presence only, not format.
