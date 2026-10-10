# The One Thing

Bilingual (English / Arabic, RTL) productivity app. Each day you pick one
priority; the app keeps every small promise — calls, emails, WhatsApps,
meetings, follow-ups — visible, drafted and reminded, without competing with
that priority.

Built from the design handoff in `design-handoff/`, whose rule is **recreate
exactly**: no changes to layout, colours, copy, flows or behaviour. Where a
platform cannot do what the design does, it is raised rather than redesigned —
see `BUILD-REVIEW.md`.

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
design-handoff/         the design handoff, verbatim — read-only
```

`design-handoff/` is the designer's package committed as-is: the spec
(`README.md`, `SCREENS.md`, `DATA_MODEL.md`, `ACCEPTANCE.md`, `ADMIN.md`), the
working prototype (`design/The One Thing v5.dc.html`), its copy and logic
(`source/`), and a screenshot of all 24 screens in both languages. The
generators and the comparison harness read it, so a fresh clone can run both
without anyone hunting for the original zip. Never edit it by hand. If the
designer revises it, replace the folder wholesale and re-run the two
`content:` commands below — a diff in `src/content/` is then the list of
strings that changed.

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
npm run content:port     # strings, icons, countries, seed data
npm run content:inline   # the copy that exists only in app-logic.js
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
npm run verify:colours     # OKLCH -> sRGB, against Chromium
npm run schema:check       # applies migrations to a scratch Postgres
npm run capture:prototype  # screenshots the handoff's prototype at 402 x 874
npm run capture:app        # exports web, screenshots each route
npm run compare            # pixel diff, writes .screens/diff/
npm run drift              # per-element ±2 pt check; `-- tasks` for one screen
npm run smoke              # drives Tasks in a browser
```

Each reads `design-handoff/`. To point at a different copy, set `HANDOFF=`.

`npm run drift` is the one that answers ACCEPTANCE.md. It renders the app and
the prototype side by side, finds the same labelled elements in both, and
reports how far apart they sit — so a failure names the element and the number
of points, which is what you fix. A pixel diff only tells you how much of a
screen differs, and that number is dominated by glyph edges. Drifts that are
deliberate live in `KNOWN_DEVIATIONS` in the script, each with its reason;
everything else has to stay inside 2 pt. Add probes to `PROBES` as screens are
built.

`npm run compare` reports the share of differing pixels per screen, ignoring
the status bar and home indicator (drawn by the device frame in the prototype
and by the OS in the app). Anti-aliasing is not counted. Add a screen to
`scripts/screen-pairs.json` as you build it.

Neither check sees a horizontal flip — one measures vertical position, the
other is dominated by glyph edges. The Arabic layout was mirrored twice for a
while and both checks stayed green. **Look at the Arabic screenshots next to
the prototype's**; nothing automated will do it for you.

`npm run smoke` is the behavioural one: it drives the Tasks screen in a real
browser and asserts what each action does to the stored tasks — the filters,
the bulk reminder and its Undo, the reminder sheet, the pause before a ticked
task moves group, "Move to tomorrow", and the empty state. A screenshot says a
screen looks right; this says it behaves right.

One trap worth knowing: the prototype almost never sets `line-height`, so
nearly all of its text takes the font's own metrics — and those are not a flat
1.5. `naturalLineHeight()` in `src/design/tokens.ts` is the real rule, checked
against Chromium at every size in the scale, and every token but `display`
already uses it. The few elements that do set a line height pass `lh` to
`<Text>`. Getting this wrong compounds down a screen instead of showing up as
one obvious gap: it was worth 21 pt and 12 % of the Tasks screen's pixels.

Two notes on running the prototype locally: it loads React and Babel from
unpkg and its font from Google Fonts, both of which may be blocked, so
`capture-prototype.js` serves all three from `node_modules` — the font
especially, because a fallback typeface changes every line break and makes the
comparison meaningless.

## Working on this with someone else

Four things are worth agreeing on before anyone touches a screen.

**The handoff decides, and where it contradicts itself the prototype's render
wins.** The written spec and the prototype disagree in a dozen places; each one
is in `BUILD-REVIEW.md` with which was followed and why. Add to that file
rather than deciding quietly — the whole point is that the product owner can
see what was chosen on their behalf.

**Never retype a string.** Every piece of copy comes out of the handoff through
`scripts/port-content.js` or `scripts/extract-inline-copy.js`. If a string you
need is missing, extend the extractor; don't type it into a component. The
generated files emit each Arabic block as `const X_ar: typeof X_en`, so a
missing translation is a compile error rather than a blank label in production.

**Finish a screen by extending the harness, not just the app.** Add its pair to
`scripts/screen-pairs.json` and its probes to `PROBES` in
`scripts/measure-drift.js`, then run the checks below. A screen with no probes
is unverified, however good it looks.

**Look at the Arabic.** Both automated checks are blind to a horizontal flip,
and the layout was mirrored twice for a while with both of them green.

Before pushing:

```sh
npm run typecheck && npm run verify:colours && npm run smoke
npm run capture:app && npm run compare && npm run drift
```

## Colour

The design defines its type and status colours in OKLCH, which React Native
cannot parse, so they are baked to sRGB in `src/design/tokens.ts`.
`npm run verify:colours` checks all 67 of them against Chromium's own
rendering of the same `oklch()` string — Chromium being the authority, since
that is what the design was reviewed in. Re-run it before changing a colour.

## Status

Built: design tokens, the generated content layer (copy, 33 icons, 198
countries), the schema with row-level security on every table, the entitlements
policy, the UI primitives, the task store, the glass tab bar, and screens
01–03, 06 and 07 — Sign in, Account setup, Legal, Today in full (header,
first-run card, One Thing card, evening card, quick actions, Small promises
with swipe-to-done and swipe-to-reschedule, and the empty state) and Tasks in
full (progress header, the bulk reminder hint, filter chips, the Up next card,
all seven groups with their collapse and bulk actions, status pills, the add
sheet and the reminder sheet).

Across 42 probes on those screens, in both languages, the worst element sits
1 pt from the prototype against ACCEPTANCE.md's 2 pt bar, with one documented
exception (`KNOWN_DEVIATIONS`). Pixel difference is 0.5–0.7 % on Today and
Tasks, and 1.0–2.6 % on Sign in and Account setup, where the consent
checkbox's box model changes a line break (BUILD-REVIEW.md §2.11).

Not built yet: screens 09–24. Real Apple and Google sign-in are stubbed pending
developer accounts; `src/lib/session.tsx` holds the session on the device until
then.

See `BUILD-REVIEW.md` for what the handoff leaves open and what has to come
from the product owner before a store build is possible.
