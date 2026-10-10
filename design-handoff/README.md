# Handoff: The One Thing — mobile app + admin panel (v1.0)

> **Rule for this build: recreate exactly. Do not change layout, colours, copy, flows or behaviour.** If something is unclear or impossible on a platform, raise it — don't redesign it.

## Overview
**The One Thing** is a bilingual (English / Arabic, RTL) productivity app for busy, easily-overloaded founders and professionals. Each day the user picks **one priority**, then the app keeps every small promise (calls, emails, WhatsApps, meetings, follow-ups) visible, drafted and reminded — without competing with that priority. It includes a light CRM (contact profile with dated history), a focus timer, voice capture, follow-up tracking, a Pro subscription, and an internal **Admin Panel** for support, subscriptions and privacy requests.

## About the design files
Everything in `design/` is a **design reference built in HTML** — a working prototype that shows the intended look and behaviour. It is **not production code to ship**. Recreate it in the target stack:

- **Mobile app:** recommended **React Native (Expo)** or **Flutter** — one codebase for iOS + Android, good RTL support. Native SwiftUI/Kotlin is fine too.
- **Admin panel:** recommended **Next.js (React) + your backend**, internal-only, behind SSO + 2FA.
- **Backend:** any (Supabase / Firebase / Node + Postgres). See `DATA_MODEL.md`.

Open `design/The One Thing v5.dc.html` and `design/Admin Panel.dc.html` in Chrome to click through. The left sidebar of the app prototype is a **prototype-only** screen jumper — do not build it.

## Fidelity
**High-fidelity.** Final colours, type, spacing, copy (EN + AR) and interactions. Match pixel-for-pixel at **402 × 874 pt** (iPhone 16 Pro logical size); scale the same layout to other phones (fluid width, fixed paddings).

## What's in this folder
| Path | What it is |
|---|---|
| `README.md` | This file — overview, tokens, global rules |
| `SCREENS.md` | Every app screen: purpose, layout, components, copy, states, interactions |
| `ADMIN.md` | Every admin-panel screen + permissions |
| `DATA_MODEL.md` | Entities, fields, state machine, API needs, store/billing, notifications |
| `ACCEPTANCE.md` | QA checklist — the build is "done" when every line passes |
| `screenshots/app/` | 30 PNGs — every screen (EN) + 6 Arabic/RTL screens |
| `screenshots/admin/` | 13 PNGs — every admin screen |
| `source/app-content.js` | **All copy (EN+AR), icon paths, type colours, country list, seed data** — extracted verbatim. Use as the string/icon source of truth. |
| `source/app-logic.js` | Prototype state + handlers — the exact behaviour reference |
| `source/admin-logic.js` | Admin behaviour + seed data reference |
| `design/` | The runnable HTML prototypes |

---

## Design tokens

### Typography
- **Font:** `IBM Plex Sans Arabic` (Google Fonts, weights 400/500/600/700) for **both** English and Arabic. Admin also uses `IBM Plex Mono` 400/500 for IDs/timestamps.
- Weights used: **600** (titles, labels, buttons-strong), **500** (buttons, list titles), **400** (body).
- Scale (px = pt):

| Token | Size | Weight | Line-height | Use |
|---|---|---|---|---|
| display | 32–34 | 600 | 1.15 | Sign-in / onboarding hero |
| h1 | 28 | 600 | 1.2 | Screen titles (Tasks, People, Follow-ups), One Thing title |
| h2 | 26 | 600 | 1.2 | Compose title, first-run card question |
| h3 | 22 | 600 | 1.25 | Sheet titles (Delete, Coffee) |
| title | 17–20 | 600 | 1.3 | Section titles, nav header |
| body-l | 16 | 400/500 | 1.5 | Inputs, primary buttons |
| body | 15 | 400/500 | 1.45 | List titles, settings rows |
| body-s | 14 | 400 | 1.5 | Secondary copy |
| caption | 13 | 400/500 | 1.45 | Meta, chips |
| micro | 12 | 400/500 | 1.4 | Labels, timestamps |
| eyebrow | 11 | 600 | 1 | UPPERCASE, `letter-spacing: .14em` (e.g. "YOUR ONE THING TODAY", "QUICK ACTIONS") |
| tab | 10.5 | 500/600 | 1 | Tab bar labels |

- `text-wrap: balance` on big titles, `pretty` on paragraphs (or platform equivalent).
- Numbers that change (timers, times, counts): **tabular figures**.

### Colour — neutrals
| Token | Hex | Use |
|---|---|---|
| ink | `#0B0B0B` | Primary text, primary buttons, active states, toggles on |
| ink-2 | `#3A3A37` | Strong secondary text |
| ink-3 | `#55554F` | Secondary text |
| ink-4 | `#6B6B68` | Labels, meta |
| ink-5 | `#8A8A86` | Hints, placeholders, timestamps |
| ink-6 | `#A8A8A3` | Disabled text, chevrons |
| ink-disabled-btn | `#B5B5B0` | Disabled primary button bg |
| line | `#E4E4E0` | Input / chip borders |
| line-soft | `#EFEFEC` | Row dividers |
| line-faint | `#F3F2EE` | Faint dividers / soft fill |
| fill | `#F3F2EE` | Chip fill, segmented track, icon tiles |
| fill-2 | `#F6F6F3` | Grouped-screen background (Settings, Profile), task row bg |
| track-off | `#D6D6D2` | Toggle off, inactive dots |
| white | `#FFFFFF` | Cards, screen bg |

### Colour — channel / task type (used for icon tile bg + icon/label fg)
Defined in `source/app-content.js → TYPE_COL`. OKLCH values (convert to sRGB hex for platforms without OKLCH — keep these exact):

| Type | fg | bg (tile) | Icon |
|---|---|---|---|
| call | `oklch(0.6 0.15 50)` | `oklch(0.95 0.035 50)` | phone |
| email | `oklch(0.55 0.15 255)` | `oklch(0.95 0.035 255)` | mail |
| whatsapp | `oklch(0.58 0.15 150)` | `oklch(0.95 0.035 150)` | msg (speech bubble) |
| reminder | `oklch(0.55 0.15 300)` | `oklch(0.95 0.035 300)` | bell |
| visit | `oklch(0.55 0.13 85)` | `oklch(0.95 0.04 90)` | pin |
| meeting | `oklch(0.55 0.12 200)` | `oklch(0.95 0.035 200)` | video |
| webinar | `oklch(0.55 0.15 350)` | `oklch(0.95 0.035 350)` | screen |
| course | `oklch(0.55 0.12 120)` | `oklch(0.95 0.035 120)` | book |

### Colour — status
| Token | Value | Use |
|---|---|---|
| danger | `oklch(0.52 0.19 25)` | Delete account button/text |
| danger-fg | `oklch(0.5–0.55 0.17 25)` | "Now" line, Overdue text, errors |
| danger-bg | `oklch(0.95 0.04 25)` | Overdue pill bg, delete icon tile |
| success-fg | `oklch(0.45 0.12 150)` | "On", Closed, Completed |
| success-bg | `oklch(0.94–0.95 0.04–0.05 150)` | Closed pill, empty-state circle |
| warn-bg / fg | `oklch(0.95 0.05 80)` / `oklch(0.42 0.1 70)` | Duplicate-contact banner |
| note-bg / fg | `oklch(0.97 0.03 90)` / `oklch(0.45 0.09 80)` | "Remember for next time" note |
| save-tag | `oklch(0.55 0.13 150)` | Paywall "Save 40%" tag |

### Radius
`999` pills/chips · `28` primary buttons (56 h) & bottom sheets top corners · `26` Today One Thing card · `20–22` large cards · `16–18` cards/inputs groups · `14` inputs, list rows · `12` small buttons, segmented · `9–11` icon tiles (36–44 px) · `7` checkboxes.

### Spacing
Screen side padding **20** (24 on onboarding/sign-in/paywall-style screens). Vertical gap between sections **14–24**. Card padding **14–22**. Row padding **12–15 × 16**. Grid gap **8**. Safe area: top status bar **54**; content bottom padding **120–150** under the tab bar.

### Elevation
- Card: none (flat on `#F6F6F3`), or `0 1px 0 rgba(0,0,0,.04), 0 8px 30px rgba(0,0,0,.06)`.
- Popover / dropdown: `0 12px 32px rgba(0,0,0,.10)` – `0 16px 40px rgba(0,0,0,.14)`.
- Toast: `0 8px 24px rgba(0,0,0,.2)`.
- Sheet scrim: `rgba(0,0,0,.35)`.
- **Tab bar (glass):** `background: linear-gradient(180deg, rgba(255,255,255,.62), rgba(246,246,243,.48)); backdrop-filter: blur(22px) saturate(180%); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 12px 32px rgba(20,20,18,.14), inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(0,0,0,.04)` · 64 h · radius 32 · inset 16 left/right, 24 from bottom. White fade (120 h, white .85→0) behind it.
- **Mic orb:** 60 × 60, `radial-gradient(circle at 35% 28%, #4A4A47, #141413 55%, #000)`, rings `0 0 0 5px rgba(255,255,255,.75), 0 0 0 6px rgba(0,0,0,.06)`, drop `0 12px 26px rgba(0,0,0,.30)`, raised −26 above bar.

### Icons
Line icons, 24-unit viewBox, round caps/joins, stroke 1.7–2.2 (Lucide-style). **Exact paths** are in `source/app-content.js → P`. Sizes: 22 tab, 18–22 tiles, 14–16 inline. Brand marks (Apple, Google) in `BRAND_IC` — follow Apple and Google sign-in button guidelines.

### Motion
- Screen change: fade/slide-up — opacity .4→1, translateY 10→0, **260 ms**, `cubic-bezier(.2,.8,.2,1)`.
- Check-off pop: scale .2→1.25→1, **400 ms**, `cubic-bezier(.3,1.5,.5,1)`.
- Toggles / segmented: 200 ms. Accordion chevron rotate 200 ms. Progress width 300–500 ms ease.
- Toast: translateY 12→0 + fade in. Listening bars and focus "breath" glow loops (see `@keyframes` in the prototype `<helmet>`).
- Respect **Reduce Motion**: drop translate/scale, keep fades.

### RTL / Arabic
- Every screen ships in EN and AR. In AR set layout direction **RTL**; mirror chevrons/back arrows; keep phone numbers, times, prices and links **LTR** (`dir="ltr"` islands).
- Same font for both. Copy for both is in `source/app-content.js` (`C.en` / `C.ar`, plus `ACC`, `SETX`, `EVX`, `FUX`, `PFX`).

### Accessibility
Min tap target **44 × 44**. Text contrast ≥ 4.5:1 (all neutrals above pass on white except `#A8A8A3`, which is only used for non-essential hints). Support Dynamic Type up to XL without clipping (lists wrap; titles balance).

---

## Global behaviour
- **Toasts** (bottom, pill, ink bg) confirm every action; destructive or bulk actions show **Undo** for ~4 s.
- **Nothing is ever sent automatically.** The app prepares drafts and opens WhatsApp / Mail / Phone; it only marks done after the user confirms "Did you send it?".
- **External apps:** WhatsApp `https://wa.me/<digits>?text=<encoded>`; Mail `mailto:` with subject+body; Phone `tel:`. Show the "Opens WhatsApp…" hint before leaving.
- **Persistence:** all user data syncs to the backend; the prototype uses localStorage only for demo.
- **Bottom sheets** close on scrim tap; navigation away closes all sheets.

See **SCREENS.md** next.
