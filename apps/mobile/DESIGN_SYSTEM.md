Portl mobile app — canonical design reference

Source: Stitch export at `C:\Users\LENOVO\Downloads\stitch_portl_friendly_resident_console\stitch_portl_friendly_resident_console`
(37 screens, each with `screen.png` + `code.html`, plus `friendly_community_console/DESIGN.md` — the full token spec).

**Superseded design system:** this replaces the original Linear-inspired dark-mode system (git history has the old version) as of 2026-07-16, per an explicit user decision to fully switch visual direction for hackathon UI impact. Two screens (`admin_notifications`, resident `services`/`social` hubs) don't exist in the Stitch export and are built by hand, following the closest matching pattern from a sibling screen that does exist (`management_hub` for the hub screens; `notifications_inbox`/`guard_notifications` for admin's).

**Rule going forward: before marking any screen done, open the matching `screen.png` in the Stitch export and eyeball the built screen against it — colors, spacing, component patterns should match. Update the map's row to ✅ when a screen is retrofitted/built to match.**

## Style summary

"Friendly Community Console" — warm, high-energy, approachable. Light mode only. A spacious off-white canvas lets a saturated violet accent and warm secondary colors carry personality. Big, soft rounded corners everywhere (20px cards, pill-shaped buttons/badges). Depth comes from soft ambient shadows tinted with a touch of the primary violet, not flat/hairline-border minimalism. The emotional goal: this should feel like a consumer app people enjoy opening, not enterprise software.

## Design tokens

### Colors

| Token | Hex | Use |
|---|---|---|
| `background` | `#FDF8FF` (off-white, warm violet-tinted) | App background |
| `surface` (card) | `#FFFFFF` | Cards, pure white to pop against the off-white background |
| `surface-container` | `#F1ECF8` | Secondary/recessed surfaces |
| `surface-container-high` | `#ECE6F2` | Elevated chips/icon containers |
| `on-surface` | `#1C1A23` | Primary text |
| `on-surface-variant` | `#48454` | Secondary text |
| `outline` | `#797585` | Borders needing more contrast |
| `outline-variant` | `#CAC4D6` | Default input/divider borders |
| `primary` | `#6244CD` | THE accent — links, active states |
| `primary-container` | `#7B5FE8` | Primary buttons, headers, high-priority actions, gradients |
| `inverse-primary` | `#CBBEFF` | Light violet, gradient partner |
| `secondary` (Warm Amber) | `#FFB347` | "Services"/utility features — service-type badges, delivery icons |
| `tertiary` | `#885100` | Reserved, rarely used |
| `status-green` | `#27C96D` | Approved / checked-in / resolved / paid |
| `status-amber` | `#FEB246` / secondary-container | Pending / waiting |
| `status-red` | `#FF5F5F` (friendly) / `#BA1A1A` (error) | Rejected / alerts — softened, not alarming |

### Typography

| Token | Family | Size/Weight | Use |
|---|---|---|---|
| `headline-xl` | Be Vietnam Pro | 40px / 800 | Rare, hero moments only |
| `headline-lg` | Be Vietnam Pro | 32px / 700 (28px mobile) | Page titles |
| `headline-md` | Be Vietnam Pro | 24px / 700 | Section titles, card titles |
| `body-lg` | Nunito Sans | 18px / 400 | Emphasis body text |
| `body-md` | Nunito Sans | 16px / 400 | Primary body text |
| `label-md` | Nunito Sans | 14px / 700 | Buttons, emphasized labels |
| `label-sm` | Nunito Sans | 12px / 600 | Meta text, badges |

Headings are bold and confident — tight letter-spacing for a "chunky" modern feel. Body text uses Nunito Sans's rounded terminals for warmth + legibility.

### Radius

| Token | Value | Use |
|---|---|---|
| `sm` | 4px | Rare, small elements |
| `DEFAULT` | 8px | — |
| `md` | 12px | Inputs |
| `lg` | 16px | — |
| `xl` | 24px (cards use ~20px in practice) | Cards, major containers |
| `full` | 9999px | Buttons, status pills, avatars, FAB |

Buttons and status pills are fully pill-shaped. Cards use a large, soft 20px radius — never sharp corners.

### Spacing

`base` = 8px, `xs` = 4px, `sm` = 12px, `md` = 20px (primary rhythmic driver, matches the card radius), `lg` = 32px, `xl` = 48px, `gutter`/`margin-mobile` = 20px.

### Elevation

Ambient shadows tinted with a small percentage of the primary violet, not neutral gray — cards get a soft, wide-spread low-elevation shadow (12px blur, ~4% opacity); the FAB and modals get a more pronounced, primary-tinted high-elevation shadow. Depth layering: background → card surface → elevated FAB/modal.

## Component patterns

- **Card**: pure white, 20px radius, soft violet-tinted ambient shadow, no border needed (shadow carries the separation).
- **Primary button**: violet-to-light-violet gradient, fully pill-shaped, white text, high contrast.
- **Secondary/outline button**: white or transparent background, violet border/text.
- **Status pill**: bold, fully-saturated background color (amber/red/green) with white text — confident and visible, not subtle. Replaces the old system's small status dot.
- **Action tile**: 2–3 column grid card, icon in a circular colored-tint container + bold label, used for quick-actions and management hub entries.
- **FAB**: prominent circular button in primary violet, elevated significantly, centered in the bottom tab bar zone (used for the guard/resident's primary "add" action where applicable).
- **Bottom tab bar**: clean white bar, 4 destinations per role, simple line icons, active state = filled violet icon/label. A "cutout" accommodates the FAB where present.
- **Input**: soft gray border (`outline-variant`), turns violet on focus, 12px radius, icon-in-field pattern common (leading icon inside the input).
- **Avatar**: circular; use a real photo when available (guard-captured visitor photos), fall back to initials-on-tint-background when not — never assume a photo exists, since visitor photos are optional in the data model.
- **Icons**: simple line-art for functional UI (nav, settings, filters); warm, friendly (not literally 3D-rendered, adapted to a 2D icon set achievable in React Native — `@expo/vector-icons`) for anything representing a person/role/visitor-type, using the secondary/tertiary warm colors as tinted icon-container backgrounds.

## Navigation structure (changed from the old 5-tab resident IA)

- **Resident**: Home / Services / Social / Profile (4 tabs + FAB). Services groups Amenities, Dues, Helpdesk, Society Directory. Social groups Notices, Polls. Both are new hub screens (not in the Stitch export), built following `management_hub`'s pattern.
- **Guard**: Home (Gate) / History / Residents / Profile (4 tabs).
- **Admin**: Dashboard / Management / Operations / Alerts (4 tabs). "Operations" likely covers Complaints; "Alerts" is the notifications inbox (also not in the export — adapt from `notifications_inbox`/`guard_notifications`).

## Screen → mockup map

All paths below are relative to the Stitch export root:
`C:\Users\LENOVO\Downloads\stitch_portl_friendly_resident_console\stitch_portl_friendly_resident_console\`

| Screen | Mockup folder | App route | Status |
|---|---|---|---|
| Login (resident) | `login/` | `app/(auth)/login.tsx` | pending |
| Set new password | `set_new_password/` | `app/(auth)/set-password.tsx` | pending |
| Resident home | `home_dashboard/` | `app/(resident)/home.tsx` | pending |
| Services hub | *(not in export — build following `management_hub/`)* | `app/(resident)/services.tsx` (new) | pending |
| Social hub | *(not in export — build following `management_hub/`)* | `app/(resident)/social.tsx` (new) | pending |
| Visitor request detail | `visitor_request_detail/` | Phase 4 route | pending |
| Pre-approve guest | `pre_approve_guest/` | `app/(resident)/pre-approve.tsx` | pending |
| My pre-approvals | `my_pre_approvals/` | `app/(resident)/pre-approvals.tsx` | pending |
| Visitor history | `visitor_history/` | `app/(resident)/visitor-history.tsx` | pending |
| Notice board | `notice_board/` | `app/(resident)/notices.tsx` | pending |
| Community polls | `community_polls/` | `app/(resident)/polls.tsx` | pending |
| Helpdesk | `helpdesk/` | `app/(resident)/helpdesk.tsx` | pending |
| Amenities booking | `amenities_booking/` | `app/(resident)/amenities.tsx` | pending |
| Maintenance dues | `maintenance_dues/` | `app/(resident)/dues.tsx` | pending |
| Society directory | `society_directory/` | `app/(resident)/staff-directory.tsx` | pending |
| Notifications (resident) | `notifications_inbox/` | `app/(resident)/notifications.tsx` | pending |
| Profile (resident) | `profile/` | `app/(resident)/profile.tsx` | pending |
| Login (guard) | `guard_login/` | shares `app/(auth)/login.tsx` | pending |
| Gate home | `gate_home/` | `app/(guard)/gate.tsx` | pending |
| Register visitor | `register_visitor/` | `app/(guard)/visitors.tsx` | pending |
| Visitor detail (guard) | `visitor_detail/` | Phase 4 route | pending |
| Entry/exit history | `entry_exit_history/` | `app/(guard)/history.tsx` | pending |
| Resident directory | `resident_directory/` | `app/(guard)/resident-directory.tsx` | pending |
| Check pre-approved | `check_pre_approved/` | `app/(guard)/check-preapproved.tsx` | pending |
| Notifications (guard) | `guard_notifications/` | `app/(guard)/notifications.tsx` | pending |
| Profile (guard) | `guard_profile/` | `app/(guard)/profile.tsx` | pending |
| Login (admin) | `admin_login/` | shares `app/(auth)/login.tsx` | pending |
| Dashboard | `dashboard/` | `app/(admin)/dashboard.tsx` | pending |
| Management hub | `management_hub/` | `app/(admin)/society.tsx` | pending |
| Towers management | `towers_management/` | `app/(admin)/towers.tsx` | pending |
| Flats management | `flats_management/` | `app/(admin)/flats.tsx` | pending |
| Residents management | `residents_management/` | `app/(admin)/residents.tsx` | pending |
| Guards management | `guards_management/` | `app/(admin)/guards.tsx` | pending |
| Amenities management | `amenities_management/` | `app/(admin)/amenities.tsx` | pending |
| Notices management | `notices_management/` | `app/(admin)/notices.tsx` | pending |
| Polls management | `polls_management/` | `app/(admin)/polls.tsx` | pending |
| Complaints oversight | `complaints_oversight/` | `app/(admin)/requests.tsx` | pending |
| Staff management | `staff_management/` | `app/(admin)/staff.tsx` | pending |
| Notifications (admin) | *(not in export — adapt from `notifications_inbox/`)* | `app/(admin)/notifications.tsx` | pending |
| Profile (admin) | `admin_profile/` | `app/(admin)/more.tsx` | pending |
