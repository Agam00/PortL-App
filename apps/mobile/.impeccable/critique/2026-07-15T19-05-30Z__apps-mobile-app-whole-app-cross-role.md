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
| 7 | Flexibility and Efficiency | 2 | No bulk actions, no shortcuts for repetitive guard queue actions |
| 8 | Aesthetic and Minimalist Design | 3 | Generally tight; a few screens overload one scroll view (form + list + detail + composer at once) |
| 9 | Error Recovery | 3 | Consistent getErrorMessage + toast + inline field errors pattern |
| 10 | Help and Documentation | 1 | No first-run hints, no tooltips |
| **Total** | | **23/40** | **Acceptable band** |

## Anti-Patterns Verdict

Not AI slop. Component vocabulary genuinely reused with matching prop shapes across every screen checked.

Deterministic scan:
- Hardcoded hex not matching any documented token: 8 (#e5484d x7, #3dd68c x1) — real violation
- Shadow/elevation usage: 0 — clean
- Missing accessibilityLabel on icon-only Pressable: 0 of 45 checked — clean
- Non-token radius (rounded-xl, 12px): 21 occurrences — systemic, undocumented
- Duplicated list-row card wrapper: 9 of 9 admin CRUD screens — real maintainability risk
- Duplicated inline loading indicator: 23 files app-wide — real maintainability risk
- Off-token text sizing: 2 — minor

## Overall Impression

A real, disciplined design system that's drifted at the edges from its own written spec. Core interaction loop is well-built and consistent. Biggest opportunity: a functional keyboard bug on Android, an undocumented color/radius system used pervasively but never written down, and safety nets applied inconsistently rather than by actual risk.

## What's Working

1. Component discipline is real, not aspirational — every loading state is the identical ActivityIndicator, every empty/error state routes through the same EmptyState.
2. Every mutation gets the same three-part feedback loop: haptic + toast + cache invalidation, applied identically across all three roles.
3. Guard gate's stat strip is a well-judged density choice — the amber "Expiring Soon" dot appears only when something is actually expiring.

## Priority Issues

**[P0] KeyboardAvoidingView is disabled on Android — the app's only shipping platform.**
app/(resident)/helpdesk.tsx:116 sets behavior={Platform.OS === "ios" ? "padding" : undefined}. PRODUCT.md states the platform is android. This resolves to undefined on every device the app ships to. Fix: use behavior="height" on Android, or configure android:windowSoftInputMode="adjustResize". Check other screens for the same pattern.
Suggested command: $impeccable harden

**[P1] Two undocumented colors bypass the design system's own token table, used 8 times.**
#e5484d (distinct from documented status-red #F87171) on every destructive/delete icon across 7 admin screens. #3dd68c (distinct from documented status-green #4ADE80) once. Plus 21 uses of rounded-xl (12px), never named in the design system alongside md/lg.
Suggested command: $impeccable extract, then $impeccable polish

**[P1] Confirmation and undo are applied inconsistently, not by actual risk.**
Reject on a live visitor and Mark Entry/Exit fire on a single tap with zero confirmation, while admin Deactivate gets a blocking Alert.alert but Activate and Confirm Move get neither.
Suggested command: $impeccable harden

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
