# Product

## Register

product

## Platform

android

## Users

Three distinct roles share one app, each in a task-focused, often time-pressured context. Residents manage their daily interactions with the community: approving visitors, pre-approving expected guests, raising helpdesk tickets, booking amenities, paying dues, and following notices and polls. Security Guards work the gate during a shift, registering visitors, verifying approvals, and marking entry/exit — frequently mid-conversation with someone waiting in front of them. Society Admins run the day-to-day operations of the community from their phone: residents, staff, notices, finances, and oversight across the other two roles' activity.

## Product Purpose

Portl replaces the informal, error-prone way apartment communities currently run — gate phone calls, WhatsApp groups, paper registers, manual approvals — with one mobile app. Success looks like a delivery or guest getting in without a missed call or a long wait, an admin running the society from their phone instead of a filing cabinet, and every one of these interactions leaving a record.

## Positioning

The conversation that used to happen at the society gate now happens inside the app.

## Brand Personality

**Revised 2026-07-16** (superseding the prior "calm, efficient, dependable" direction — an explicit, informed decision to switch the app's visual identity entirely for hackathon UI impact, not a drift). Warm, high-energy, approachable. This should feel like a consumer app people enjoy opening — a friendly neighborhood tool, not enterprise security software — even though the moment it's often supporting (a visitor waiting at the gate) is time-pressured. The emotional goal is safety, belonging, and neighborly warmth, not clinical efficiency.

## Anti-references

The prior direction (dark-mode-only, monochrome, hairline borders, small status dots) is now itself the anti-reference — don't drift back to it. Otherwise nothing named explicitly; the new "Friendly Community Console" token system (see `DESIGN_SYSTEM.md`) is the hard constraint to work within.

## Design Principles

Warmth over restraint: a saturated violet accent used generously (not sparingly), soft ambient shadows instead of flat hairline borders, big friendly rounded corners (20px cards, pill-shaped buttons/badges) instead of small consistent radii. Status communicated with bold, fully-saturated colored pills, not a small dot — visible and confident, not subtle. Consistency across all three roles' screens still matters more than per-screen novelty; the identity changed, that principle didn't.

## Accessibility & Inclusion

No formal WCAG target set yet. A UX polish pass added screen-reader labels on icon-only buttons and reviewed tap target sizing app-wide. Contrast needs re-verification against the new light palette (previous verification was against the dark palette, now retired) — the off-white background and white cards especially need checking against `on-surface-variant` gray text.
