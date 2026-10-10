# The One Thing

Bilingual (English / Arabic, RTL) productivity app. Each day you pick one
priority; the app keeps every small promise — calls, emails, WhatsApps,
meetings, follow-ups — visible, drafted and reminded, without competing with
that priority.

Built from `design_handoff_the_one_thing`, whose rule is **recreate exactly**:
no changes to layout, colours, copy, flows or behaviour. Where a platform
cannot do what the design does, it is raised rather than redesigned — see
`BUILD-REVIEW.md`.

## Stack

| Part | Choice |
|---|---|
| App | React Native via Expo (SDK 57), expo-router |
| Backend | Supabase (Postgres + auth + row-level security) |
| Assistant / text parsing | Claude API, behind the backend — never from the device |
| Admin panel | Next.js, separate, not started |

## Layout

```
app/                    expo-router routes, one file per screen
src/
  content/              copy, countries, seed data — all generated, never hand-edited
  design/               tokens, icon path data, brand marks
  ui/                   primitives: Text, Button, Field, Chip, Checkbox, Screen, Toast
  features/<screen>/    components belonging to one screen
  i18n/                 language + writing direction
  lib/                  session, consent, Supabase client
  policy/               entitlements — the single place Free vs Pro is decided
supabase/migrations/    schema
scripts/                generators and the verification harness
```

## Getting started

```sh
npm install
cp .env.example .env     # fill in once a Supabase project exists
npm start
```

The app runs without a backend: `src/lib/supabase.ts` reports
`isBackendConfigured === false` and the session lives on the device, which is
enough to click through every screen.

## Generated content — do not hand-edit

Copy is transcribed mechanically from the handoff so no string is ever retyped.

```sh
npm run content:port   -- <path to design_handoff_the_one_thing>   # strings, icons, countries, seed
npm run content:inline -- <path to design_handoff_the_one_thing>   # copy that only exists in app-logic.js
```

Both write into `src/content/`. Each language block is emitted as
`const X_ar: typeof X_en = {...}`, so a missing Arabic string is a compile
error rather than a blank label in production.

## Verification

The handoff's own `screenshots/` are 924 × 540 device-frame shots with the
phone content at roughly 0.57×, so they cannot answer ACCEPTANCE.md's "±2 pt at
402 × 874". These scripts can: they render the prototype and the app at the
same size and diff them.

```sh
npm run typecheck
npm run verify:colours                                       # OKLCH -> sRGB, against Chromium
npm run schema:check                                         # applies migrations to a scratch Postgres
npm run capture:prototype -- <path to design_handoff_the_one_thing>
npm run capture:app                                          # exports web, screenshots each route
npm run compare                                              # pixel diff, writes .screens/diff/
```

`npm run compare` reports the share of differing pixels per screen, ignoring
the status bar and home indicator (drawn by the device frame in the prototype
and by the OS in the app). Anti-aliasing is not counted. Add a screen to
`scripts/screen-pairs.json` as you build it.

Two notes on running the prototype locally: it loads React and Babel from
unpkg and its font from Google Fonts, both of which may be blocked, so
`capture-prototype.js` serves all three from `node_modules` — the font
especially, because a fallback typeface changes every line break and makes the
comparison meaningless.

## Colour

The design defines its type and status colours in OKLCH, which React Native
cannot parse, so they are baked to sRGB in `src/design/tokens.ts`.
`npm run verify:colours` checks all 67 of them against Chromium's own
rendering of the same `oklch()` string — Chromium being the authority, since
that is what the design was reviewed in. Re-run it before changing a colour.

## Status

Built: design tokens, the generated content layer (254 copy keys per language,
33 icons, 198 countries), the schema with row-level security on every table,
the entitlements policy, the UI primitives, and the first-run flow — Sign in,
Account setup, Legal, and Today's header, first-run card and quick actions.

Not built yet: the task store and the rest of Today, the tab bar, and screens
07–24. Real Apple and Google sign-in are stubbed pending developer accounts;
`src/lib/session.tsx` holds the session on the device until then.

See `BUILD-REVIEW.md` for what the handoff leaves open and what has to come
from the product owner before a store build is possible.
