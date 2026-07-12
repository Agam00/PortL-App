Portl mobile app — canonical design reference

Source: Stitch export at `C:\Users\LENOVO\Downloads\stitch_portl_ui_design_system (1)\stitch_portl_ui_design_system`
(32 screens, each with `screen.png` + `code.html`, plus `portl_interface/DESIGN.md` — the full token spec).

**Rule going forward: before marking any phase done, open the relevant screen(s) below and eyeball the
built app against `screen.png`. If a screen isn't in this table yet (a later phase), generate it in the
same Stitch project first, then add a row here.**

## Style summary

Cold, precise, monochrome-plus-one-accent B2B tool aesthetic (Linear-inspired). Dark mode only — there is
no light theme. Depth comes from tonal layering + 1px hairline borders, never shadows or glows. Status is
communicated with small 6px dots, not big colored badges. Radius is small and consistent (never bubbly).

## Design tokens

### Colors

| Token | Hex / value | Use |
|---|---|---|
| `background` / `surface` | `#131314` | App background, default surface |
| `surface-elevated` | `#1F2023` | Cards, list rows, inputs — the primary "raised" surface |
| `surface-container-lowest` | `#0e0e0f` | Rare recessed background |
| `surface-container-high` | `#2a2a2b` | Avatar placeholder background, icon chip background |
| `on-surface` | `#e5e2e3` | Primary text (near-white, never pure white) |
| `on-surface-variant` | `#c6c5d5` | Secondary icons/text on dark surfaces |
| `text-muted` | `#8A8F98` | Meta text, placeholders, secondary labels |
| `border-subtle` | `rgba(255,255,255,0.08)` | The ONE border color used everywhere for separation |
| `outline-variant` | `#454652` | Header/nav border (slightly stronger than border-subtle) |
| `primary` | `#bdc2ff` | Link text, active tab label tint |
| `primary-container` | `#5e6ad2` | THE accent — primary buttons, active tab icon, focus rings |
| `inverse-primary` | `#4854bb` | Primary button pressed/hover state |
| `status-green` | `#4ADE80` | Approved / checked-in / resolved / paid |
| `status-amber` | `#FACC15` | Pending / waiting / in-progress |
| `status-red` | `#F87171` | Rejected / overdue / alert |

### Typography (Inter)

| Token | Size/line-height | Weight | Letter-spacing | Use |
|---|---|---|---|---|
| `headline-lg` | 22/28 | 600 | -0.02em | Page titles ("Home", "Dashboard Overview") |
| `headline-md` | 20/24 | 600 | -0.01em | Section titles, card titles |
| `body-md` | 14/20 | 400 | — | Primary body text |
| `body-sm` | 13/18 | 400 | — | Secondary body text, button labels |
| `label-caps` | 12/16 | 500 | 0.05em, uppercase | Section headers ("PENDING", "ACCOUNT DETAILS"), role badge |
| `meta-text` | 12/16 | 400 | — | Timestamps, muted inline meta |

Never exceed 22px for a heading — density over size is the whole point.

### Radius

| Token | Value | Use |
|---|---|---|
| `md` | 6px | Buttons, inputs, small pills |
| `lg` | 8px | Cards, list rows, modals |
| `full` | 9999px | Avatars, status dots |

### Spacing

`gutter`/`margin-mobile` = 16px, `stack-sm` = 4px, `stack-md` = 8px, `stack-lg` = 16px. Tight, consistent
4/8/16 rhythm — no oversized gaps.

## Component patterns

- **Card / list row**: `bg-surface-elevated`, `border border-border-subtle`, `rounded-lg`, `p-3` or `p-4`, no shadow.
- **Primary button**: `bg-primary-container`, white text, `rounded-md`, `py-2 px-3`, `body-md` weight medium. Pressed → `inverse-primary`.
- **Ghost/secondary button**: transparent bg, `border border-border-subtle`, `on-surface` text, same radius/padding. Pressed → subtle white-8% fill.
- **Status indicator**: a 6px filled circle (`w-1.5 h-1.5 rounded-full`) in the status color, next to plain gray/white text — never a filled colored pill.
- **Role badge**: small bordered pill, `label-caps` uppercase text, `border-border-subtle`, sits next to the logo in the header — "RESIDENT" / "GUARD" / "ADMIN".
- **Section label**: `label-caps`, uppercase, `text-muted`, wide letter-spacing, used above grouped list sections ("PENDING", "CHECKED IN") or with a `border-b border-border-subtle` divider for settings-style sections ("ACCOUNT DETAILS").
- **Input**: `bg-surface-elevated`, `border border-border-subtle`, `rounded-lg` (8px, slightly larger than buttons), `on-surface` text, `text-muted` placeholder, border → `primary-container` on focus.
- **Tab bar**: `bg-surface`, `border-t border-outline-variant`, icons ~24px, inactive = `text-muted`, active = `primary-container` (and filled icon variant where available).
- **Avatar**: circular, `surface-container-high` background with initials, or a photo.
- **Icons**: Material Symbols Outlined in the reference (weight ~300, FILL 0, FILL 1 for active state). In the RN app, use `@expo/vector-icons`' `MaterialIcons`/`MaterialCommunityIcons` as the closest equivalent — outline by default, and switch to the "filled" variant of the same icon for active/selected states.

## Screen → mockup map

All paths below are relative to the Stitch export root:
`C:\Users\LENOVO\Downloads\stitch_portl_ui_design_system (1)\stitch_portl_ui_design_system\`

| Screen | Mockup folder | App route (once built) | Status |
|---|---|---|---|
| Login | `login/` | `app/(auth)/login.tsx` | ✅ retrofitted |
| Set new password | `set_new_password/` | `app/(auth)/set-password.tsx` | ✅ retrofitted |
| Resident home | `resident_home/` | `app/(resident)/home.tsx` | ✅ retrofitted |
| Visitor detail (resident) | `visitor_detail/` | Phase 4 | pending |
| Pre-approve guest | `pre_approve_guest/` | Phase 4 | pending |
| My pre-approvals | `my_pre_approvals/` | Phase 4 | pending |
| Visitor history | `visitor_history/` | Phase 4 | pending |
| Notices (resident) | `notices/` | Phase 7 | pending |
| Polls | `polls/` | Phase 7 | pending |
| Helpdesk | `helpdesk/` | Phase 7 | pending |
| Amenities (resident) | `amenities/` | Phase 8 | pending |
| Maintenance dues | `maintenance_dues/` | Phase 8 | pending |
| Society directory | `society_directory/` | Phase 9 | pending |
| Notifications | `notifications/` | Phase 10 | pending |
| Profile (resident) | `profile/` | `app/(resident)/profile.tsx` | ✅ retrofitted |
| Gate home | `gate_home/` | `app/(guard)/gate.tsx` | ✅ retrofitted |
| Register visitor | `register_visitor/` | Phase 4 | pending |
| Visitor detail (guard) | `visitor_detail_guard/` | Phase 4 | pending |
| Entry/exit history | `entry_exit_history/` | Phase 4 | pending |
| Resident/flat search | `resident_search/` | Phase 5 | pending |
| Profile (guard) | `profile_guard/` | `app/(guard)/profile.tsx` | ✅ retrofitted |
| Dashboard | `dashboard/` | `app/(admin)/dashboard.tsx` | ✅ retrofitted |
| Manage society hub | `manage_society/` | Phase 6 | pending |
| Towers management | `towers_management/` | Phase 6 | pending |
| Flats management | `flats_management/` | Phase 6 | pending |
| Residents management | `residents_management/` | Phase 6 | pending |
| Guards management | `guards_management/` | Phase 6 | pending |
| Amenities management | `amenities_management/` | Phase 6 | pending |
| Notices management | `notices_management/` | Phase 6 | pending |
| Polls management | `polls_management/` | Phase 6 | pending |
| Complaints oversight | `complaints_oversight/` | Phase 6 | pending |
| Staff management | `staff_management/` | Phase 9 | pending |
| Profile (admin) | `profile_admin/` | `app/(admin)/more.tsx` | ✅ retrofitted |

Screens not yet built (Notices/Helpdesk/Amenities tabs, etc.) currently render a plain "Coming soon"
placeholder (`components/coming-soon-screen.tsx`) — that placeholder itself should also follow this
design system (dark bg, muted icon, `label-caps` phase note), even before the real screen is built.
