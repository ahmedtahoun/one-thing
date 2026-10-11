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
| Admin panel | Next.js 16, separate (`admin/`) |

## Layout

```
app/                    expo-router routes, one file per screen
src/
  content/              copy, countries, seed data — all generated, never hand-edited
  design/               tokens, icon path data, brand marks
  ui/                   primitives: Text, Button, Field, Chip, Checkbox, Toggle, Screen, Sheet, Toast
  features/<screen>/    components belonging to one screen
  i18n/                 language + writing direction
  lib/                  stores (session, tasks, people, prefs), notifications, Supabase client
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
npm test                   # the rules that do not need a device
npm run test:db            # sync against a throwaway Postgres, with row-level security
npm run verify:colours     # OKLCH -> sRGB, against Chromium
npm run schema:check       # applies migrations to a scratch Postgres
npm run capture:prototype  # screenshots the handoff's prototype at 402 x 874
npm run capture:app        # exports web, screenshots each route
npm run compare            # pixel diff, writes .screens/diff/
npm run drift              # per-element ±2 pt check; `-- tasks` for one screen
npm run smoke              # drives every built screen with behaviour, in a browser
```

Each reads `design-handoff/`. To point at a different copy, set `HANDOFF=`.
They render in Chromium — `npx playwright install chromium` once, or set
`CHROMIUM_PATH` to a binary you already have.

All of this runs on every push; see `.github/workflows/checks.yml`. The drift
check gates, the pixel diff is reported but only fails when a screen listed in
`screen-pairs.json` was never captured.

`npm run drift` is the one that answers ACCEPTANCE.md. It renders the app and
the prototype side by side, finds the same labelled elements in both, and
reports how far apart they sit — so a failure names the element and the number
of points, which is what you fix. A pixel diff only tells you how much of a
screen differs, and that number is dominated by glyph edges. Drifts that are
deliberate live in `KNOWN_DEVIATIONS` in the script, each with its reason;
everything else has to stay inside 2 pt. Add probes to `PROBES` as screens are
built. Read the note above `TOPS` before changing how it measures — the
prototype's inline spans look like noise and are not (BUILD-REVIEW.md §2.33).

`npm run compare` reports the share of differing pixels per screen, ignoring
the status bar and home indicator (drawn by the device frame in the prototype
and by the OS in the app). Anti-aliasing is not counted. Add a screen to
`scripts/screen-pairs.json` as you build it.

Neither check sees a horizontal flip — one measures vertical position, the
other is dominated by glyph edges. The Arabic layout was mirrored twice for a
while and both checks stayed green. **Look at the Arabic screenshots next to
the prototype's**; nothing automated will do it for you.

`npm run smoke` is the behavioural one: it drives the screens in a real
browser and asserts what each action does to what is stored. On Tasks: the
filters, the bulk reminder and its Undo, the reminder sheet, the pause before a
ticked task moves group, "Move to tomorrow", and the empty state. On People,
the contact profile, Follow-ups and Settings (`scripts/smoke-people.js`):
search, starting a task from a contact, the profile's note and quick log,
the contact form's checks, duplicate banner and delete with Undo, Got a reply with its Undo, Reopen, Nudge writing a draft
without sending it, one accordion panel at a time, the stored preferences, the
language switch, and what Delete account erases. On Compose
(`scripts/smoke-compose.js`): what is opened (wa.me, `mailto:`, `tel:`) and
with what, that a number given once is remembered, and that nothing is marked
done until "Did you send it?" is answered. On the day's own screens
(`scripts/smoke-day.js`): what Morning priority saves, the event form's
field table and what a saved event becomes, Overwhelm's one-step-at-a-time,
the focus timer, that the evening review changes nothing until "Close the
day", and that Reschedule in remind mode moves the reminder and not the task.
On Quick capture, Brain dump, the Assistant and the Paywall
(`scripts/smoke-capture.js`): that nothing is saved until it is confirmed, the
Assistant's daily limit and the paywall it opens, and that starting the trial
makes nobody Pro. A screenshot says a screen looks right; this says it behaves
right.

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
npm run typecheck && npm test && npm run smoke
npm run capture:app && npm run compare && npm run drift
```

CI runs the same set, so a push tells you anyway — but a round trip through
Actions is slower than running it here.

## Notifications

`src/lib/notifications/` implements SCREENS.md § Notifications. It is local,
not pushed: every trigger is something the device already knows, so none of it
waits on a server.

- `plan.ts` decides **what fires and when** — the per-offset reminder, the
  Firm style's three repeats, a follow-up coming due, the 18:30 evening
  nudge, and whether each may make a sound. Pure, so it is the part that can
  be tested: `npm test`.
- `scheduler.ts` hands that plan to the OS and nothing more. It syncs only the
  difference, so editing one task does not re-schedule the other sixty.
- `copy.ts` is what each notification says. Three of the five rows have no
  Arabic in the handoff and carry stand-ins — BUILD-REVIEW.md §2.25.
- `NotificationsProvider.tsx` re-syncs whenever tasks, follow-ups or settings
  change, and acts on Done / Snooze / Open.

**Delivery is unproven.** The rules are tested; the permission prompt, the
action buttons and the lock-screen snooze need a device and an Apple Developer
account — BUILD-REVIEW.md §2.26.

## Colour

The design defines its type and status colours in OKLCH, which React Native
cannot parse, so they are baked to sRGB in `src/design/tokens.ts`.
`npm run verify:colours` checks all 67 of them against Chromium's own
rendering of the same `oklch()` string — Chromium being the authority, since
that is what the design was reviewed in. Re-run it before changing a colour.

## Status

Built: design tokens, the generated content layer (copy, 33 icons, 198
countries), the schema with row-level security on every table, the entitlements
policy, the UI primitives, the task, people and preference stores, the glass
tab bar, the notification layer, the free-text parser and the assistant meter,
and screens 01–03 and 05–24 — Sign in, Account setup,
Legal, Today in full (header,
first-run card, One Thing card, evening card, quick actions, Small promises
with swipe-to-done and swipe-to-reschedule, and the empty state) and Tasks in
full (progress header, the bulk reminder hint, filter chips, the Up next card,
all seven groups with their collapse and bulk actions, status pills, the add
sheet and the reminder sheet), People (search, quick WhatsApp / email / call
buttons, and Import from the phone's contacts — §2.39), Follow-ups (the three segments, Got a reply with Undo, Reopen,
Nudge), Settings (the accordion, language switch, privacy toggles, the tip
sheet and the delete-account sheet) and Compose (the WhatsApp number with its
country picker, email To and Subject, suggestions from People, the brief with
"Last time", the editable draft, handing off to WhatsApp, Mail or the phone,
and "Did you send it?" with the follow-up it sets) and the contact profile
(action tiles, the note that saves as it is typed, Coming up, and the dated
history with its quick log) and the contact form (new and edit, the
searchable country picker, the duplicate banner, "Save & message", and delete
with Undo), Morning priority, the event form in all four shapes (Visit,
Meeting, Webinar, Course), Focus with its ring and its end-of-session
notification, Overwhelm mode, the evening review, Reschedule, Quick capture
(typed or spoken, with the parsed card), Brain dump (sorted into separate
things, each kept or dropped), the Assistant (task cards, the day's plan, the
follow-up count, and the Free plan's 10 requests a day), and the Paywall.
Sync with the server is built and tested against Postgres, but it stays off
until real sign-in exists (see Sync below). The admin panel's 13 screens are
built too (see Admin panel below).

Across 202 probes on those screens, in both languages, the worst element sits
within 2 pt of the prototype — ACCEPTANCE.md's bar — with two documented
exceptions (`KNOWN_DEVIATIONS`). Pixel difference is 0.0–1.1 % on Today,
Tasks, Follow-ups, Settings, the contact profile and form, Focus, Overwhelm,
the evening review, Quick capture, Brain dump, the Assistant and the Paywall; 2–3 % on Morning priority, the event form and
Compose, whose Send button is drawn at 56 pt where the prototype squeezes it
to 26 (BUILD-REVIEW.md §2.21); 1.0–2.6 % on Sign in and Account setup, where
the prototype's missing `box-sizing` makes every bordered box 2–3 pt taller
than its stated height (§2.11); and 3–4 % on
People, whose search field is the 48 pt SCREENS.md gives where the prototype
squeezes it to 24 (§2.19).

Not built: screen 04, onboarding, which is dead in v1 (BUILD-REVIEW.md §2.9).
Screen 08 is the Tasks add sheet, which is built; SCREENS.md files it under
§ 07. Every route the built screens lead to now exists.

What waits on things outside the code. Purchases need the store accounts:
starting the trial changes nothing and makes nobody Pro, Restore truthfully
finds nothing, and the tip jar still says thank you for a purchase that did
not happen (§2.34). Quick capture, Brain dump and the Assistant read notes
with Claude through the `assist` edge function once there is a Supabase
project and a signed-in session, and with on-device rules until then
(§2.38). Speech uses a browser's own recogniser where
there is one and typing everywhere else (§2.35). Sync and Delete account's
server half need a Supabase project and real sign-in (§2.36). Notifications are written
and their rules tested, but never delivered on a real device. Real Apple and Google sign-in are stubbed pending
developer accounts; `src/lib/session.tsx` holds the session on the device until
then.

See `BUILD-REVIEW.md` for what the handoff leaves open and what has to come
from the product owner before a store build is possible.

## Free text and the paywall

Screens 17–19 and 24 are built: Quick capture, Brain dump, the Assistant and
the Paywall. All four sit within 0 pt of the prototype on every probe, and
differ by 0.03–0.78 % of pixels. `scripts/smoke-capture.js` (part of
`npm run smoke`) drives them; BUILD-REVIEW.md §2.34–2.35 has what was decided.

- **One seam for free text.** `src/lib/parse/` is the contract the three
  screens use — text in, `{type, title, who, contactId, when}` out.
  - With a backend, it calls the `assist` edge function, where Claude reads
    the note (see Assistant backend below).
  - Without one, or when it cannot answer, the on-device rules answer instead
    (`local.ts`, tested against the handoff's sample sentences).

  Nothing is saved on parsing: a proposal waits for "Save & back to focus",
  "Save {n}" or "Looks right".
- **The Free plan's 10 Assistant requests a day** are counted on the device
  (`src/lib/assistant-meter.ts`); whether one more is allowed is
  `canUseAssistant()` in `src/policy/entitlements.ts`. The eleventh opens the
  paywall.
- **Speech** goes through `src/lib/speech.ts`: the platform's recogniser where
  there is one, typing where there is not (§2.35).
- **Purchases** go through `src/features/paywall/purchases.ts`, which answers
  "unavailable" until the store accounts exist. Starting the trial makes
  nobody Pro.

## Sync

`src/lib/sync/` keeps the device's stores in step with Supabase. The stores
remain what every screen reads and writes, so nothing waits on the network;
the sync runs underneath them. BUILD-REVIEW.md §2.36 has the reasoning and
what is still open.

- `reconcile.ts` is the merge. Each list is compared three ways: the device,
  the server, and what the server held after this device's last sync. Changes
  and deletions go both ways, and an edit beats a deletion.
- `engine.ts` runs one sync against any `Remote`; `rows.ts` maps the app's
  objects to rows and back.
- `remote.ts` is the Supabase `Remote`. `SyncProvider.tsx` decides when to
  sync, and handles signing out and deleting the account.
- `npm test` runs the engine with two devices against an in-memory server.
  `npm run test:db` runs it against a real Postgres with both migrations
  and row-level security. It checks that every row fits the schema, that
  users cannot see or write each other's rows, that nobody can make
  themselves Pro, and that deleting the account removes every row.

**Dormant until real sign-in exists.** A sync needs a Supabase session, and
sign-in is still the local stub, so today the app runs on the device alone,
as before.

## Admin panel

`admin/` is the team's panel: ADMIN.md's 13 screens, as a separate Next.js
app. It is never part of the mobile app, and its pages load nothing from
third parties. BUILD-REVIEW.md §2.37 has the reasoning and what is still
open.

```sh
cd admin
npm install
cp .env.example .env.local   # live: DATABASE_URL, Supabase URL and anon key, DATASET_KEY
npm run dev                  # http://localhost:3100

# Or with the handoff's seed data and no database:
ADMIN_DEMO=1 npm run dev
```

- **Live mode** reads the app's tables over a Postgres connection only the
  panel's server holds. The team signs in through Supabase Auth with a
  password and a TOTP code. `scripts/add-admin.ts` adds someone to the
  team, since the design has no screen for it.
- **Demo mode** (`ADMIN_DEMO=1`) uses the prototype's own data and sign-in
  rules. It is how the panel is measured against the prototype. The panel
  refuses to start with neither mode, or with both.
- **Roles** (Owner, Support, Analyst) are checked on the server for every
  page and action (`src/auth/permissions.ts`).
- **Every view of a user's record is logged**, and the audit log cannot be
  edited, even from the database.

Checks, all run in CI:

```sh
npm run typecheck
npm test            # roles
npm run test:db     # the live data source against Postgres with every migration
npm run build:demo
npm run smoke       # sign-in rules, roles, logging, actions, in a browser
npm run fidelity    # every probe within 2 px of the prototype; pixels reported
```

**Several actions wait on outside services.** They need an email provider,
the stores' APIs, or push notifications. Live, those buttons say
"Not connected yet" and change nothing. Figures with no source, such as
downloads, crashes and store reviews, are left out rather than invented.

## Assistant backend

`supabase/functions/assist/` is the edge function behind Quick capture,
Brain dump and the Assistant: `POST /functions/v1/assist`. BUILD-REVIEW.md
§2.38 has the reasoning.

- **Claude does the reading.** It turns a note into a task, splits a brain
  dump into several, or reads what an Assistant message is asking for. It
  answers in a fixed JSON shape (`prompt.ts`), and gets the person's People
  so names link to contacts.
- **The API key stays on the server.** It is held in the function's
  environment and never reaches the app.
- **Answers are checked twice.** One contract
  (`supabase/functions/_shared/assist-contract.ts`) is read on the server
  and again in the app, so nothing outside the app's types reaches a screen.
- **The meter decides on the server.** The Free plan's 10 Assistant
  requests a day are counted in the database (`0005_assist.sql`). The count
  can be changed only by the function, acting for the user it has verified;
  a request that produces no answer is given back.
- **The app falls back.** When there is no project, nobody is signed in, the
  device is offline, or Claude cannot answer, `src/lib/parse/remote.ts`
  steps aside and the on-device rules answer.

```sh
supabase secrets set ANTHROPIC_API_KEY=…
supabase db push                      # 0005_assist.sql
supabase functions deploy assist

npm run typecheck:functions
npm test                              # the contract, the handler, the client
npm run test:db                       # the meter in Postgres
ANTHROPIC_API_KEY=… npx tsx scripts/try-assist.ts   # the real prompt on the handoff's samples; costs money
```
