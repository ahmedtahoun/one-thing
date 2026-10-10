# The One Thing — pre-build review of `design_handoff_the_one_thing`

Date: 10 Oct 2026. Reviewed: README, SCREENS, ADMIN, DATA_MODEL, ACCEPTANCE,
`source/*.js`, both HTML prototypes, all 43 screenshots.

## 1. Verification I ran (not just read)

I served `design/` locally and booted both prototypes in headless Chromium
(React/Babel served from a local npm copy, since `unpkg.com` is blocked in this
environment), then clicked every nav entry and scraped each rendered frame.

| Check | Result |
|---|---|
| App prototype, English — all 21 screens | render, **0** console/page errors |
| App prototype, Arabic (RTL) — all 21 screens | render, **0** errors |
| Frame size on every screen, both languages | exactly **402 × 874** |
| Broken-text scan (`undefined`, `NaN`, `[object Object]`, unresolved `{{ }}`) | **0 hits** across all 42 renders |
| Admin prototype: sign-in → TOTP → 8 sections | all render, **0** errors |

(The one 404 logged per page is a missing favicon — harmless.)

**Conclusion: the design reference is sound and complete enough to build from.**
Copy is genuinely complete in both languages (`C`, `ACC`, `SETX`, `EVX`, `FUX`,
`PFX`), icon paths are exact, the 8 type colours and all neutrals are tokenised,
and the store-compliance audit has already removed the one real rejection risk
(external PayPal tips → consumable IAP).

## 2. Gaps that block a faithful build

These are things the handoff does not answer. None are design errors — they're
decisions nobody has made yet.

### 2.1 Pro gating is undefined — biggest gap
The paywall sells six features. Exactly one limit exists anywhere in the docs
("Free plan: 10 assistant requests a day"). Nothing states what Free loses for
*Client history*, *Auto follow-ups*, *Unlimited brain dumps*, *Meetings,
webinars & courses*, or *Weekly recap* — and **no screen has a locked or
upsell state designed**. Without a gating matrix, Free and Pro are the same app
plus an assistant counter.

### 2.2 "Weekly recap" is sold but does not exist
It is a paid feature on the paywall (`app-content.js` → `feats[5]`) with no
screen in SCREENS.md, no entry point in the 21 screens, no copy, and no data
shape. Either design it or drop it from the paywall before submission —
advertising an absent feature is also a store-review risk.

### 2.3 No in-app Help / "Contact us"
ADMIN.md's Support inbox merges **"in-app Contact us"** tickets, and
`SupportTicket.source` includes `app`. But Settings has no support row, and no
such screen or copy exists. The admin Support section cannot receive anything
from the app as specified.

### 2.4 No API contract, no offline story
DATA_MODEL gives entities, a state machine and store integrations — but no
endpoints, no sync/conflict model, and no offline behaviour. README only says
"all user data syncs to the backend". A reminders app has to work with no
signal; that needs deciding before the data layer is written, not after.

### 2.5 Reminder enum mismatch
`Task.remind` is `(at|10|60|custom|null)`. Three more values are in use:
`30` and `morning` appear in the seed tasks, and the event form offers **Day
before** (`EVX.rems`). So the documented enum is missing three of its five
real values.

Two follow-ons, found while building the reminder sheet:

- **"Day before" is not stored as itself.** The prototype's event form saves it
  as `remind: 'custom'` (`['10','60','custom',null][e.rem]`), so the offset is
  lost the moment it is chosen and there is no short label for it anywhere.
  The build keeps `day_before` as its own value — a notification scheduler
  needs the offset, not a note that something was customised — and falls back
  to the prototype's "custom" wording in the row's tiny label, since that is
  the only label the handoff has for it.
- **"Morning of" has no stated time.** The labels read "Morning of · 08:00" and
  "8:00", and Settings puts quiet hours at 22:00–08:00, so it is read as
  quiet-hours-end, 08:00 on the day. `day_before` takes the same 08:00 the day
  before. Confirm, or give me the intended times.

### 2.6 The screenshots can't be used for pixel QA
They are 924×540 device-frame captures; the phone content inside sits at roughly
0.57× scale. ACCEPTANCE asks for "±2 pt at 402 × 874" — that can only be
measured against the HTML prototype. I already have a clean set of true
402×874 @2x captures from my verification run and can commit them as the QA
reference.

### 2.7 Contradiction between two docs
The Store Readiness Audit describes setup as "name → phone (all countries) → job
title". SCREENS.md §02 says phone is **not** asked at setup (collected later in
Settings / first WhatsApp). SCREENS.md is the screen spec, so I'll follow it —
flagging so it's a decision, not a silent pick.

### 2.8 `$35.88` yearly price
The fine print hard-codes "$35.88/year" in EN and AR. Google Play accepts
arbitrary prices; Apple's price points may not offer exactly $35.88. Worth
confirming in App Store Connect before the copy ships, since changing it means
changing both translations.

### 2.9 Onboarding (screen 04) is dead in v1
"Reachable but first-run skips it… keep for Revisit setup in a future version."
Build it unused, or leave it out?

### 2.10 `app-content.js` is not the complete copy source
README.md calls it "**All copy (EN+AR)** … extracted verbatim. Use as the
string/icon source of truth." It is not: 51 English/Arabic pairs exist only
inline in `source/app-logic.js` — the whole first-run card ("FIRST THING", its
question, placeholder, Set, "Or pick one", "Later — just show me my day", its
toast), both greetings, the notification rows and the country-picker strings.
Anyone building from `app-content.js` alone would silently ship those in one
language. `scripts/extract-inline-copy.js` pulls them out mechanically and
fails loudly if the handoff is ever revised. I first found 22 of them; §2.16 is
how the other 29 came to light.

### 2.11 Every bordered box in the prototype is bigger than its stated size
SCREENS.md § 01 says "Checkbox 22 × 22 radius 7". The prototype draws it as a
22 px box *plus* two 1.5 px borders — 25 px — because the page has no
`box-sizing: border-box`. React Native always measures borders inside the box,
so it gives the spec's 22. The 3 px matters: it is exactly what makes the
prototype wrap "…and Privacy / Policy." onto a second line where the build
keeps it on one. **Following the written spec (22), not the prototype.** Say
if you want the prototype's 25 instead and the wrap back.

This is not one element. The page has no `box-sizing: border-box` anywhere, so
**every** box whose height is stated alongside a border renders that much
taller: the Morning priority input is 54 in SCREENS.md § 05 and 56 in the
prototype, and the same goes for the 52 pt form fields and the 56 pt title
field on the event form. React Native always measures borders inside the box,
so it gives the written number.

The gap is 2–3 pt per element and it is why a few probes sit at the tolerance
line rather than at zero. The written sizes are being followed throughout. If
you would rather match the prototype exactly, it is one change — add the
border to each stated height — but then the spec's numbers stop describing
the build, so it needs to be your call.

### 2.12 README's line-height column describes the intent, not the artefact
README § Typography gives a line height for every token — 1.45 for body, 1.4
for micro, 1 for eyebrow and tab, 1.2 for h1. The prototype sets almost none
of them: of roughly 300 sized elements in it, fewer than 30 declare a
`line-height` at all. Everything else takes the font's own metrics.

So the real rule is the font, and it is not a flat 1.5 either. IBM Plex Sans
Arabic's typo metrics are ascender 1085 and descender −415 per 1000 em with no
line gap; a browser rounds each to whole pixels and adds them:

| Size | README | Font's own |
|---|---|---|
| 10.5 (tab) | 10.5 | **15** |
| 11 (eyebrow) | 11 | **17** |
| 13 (caption) | 18.85 | **19** |
| 15 (body) | 21.75 | **22** |
| 17 (title) | 22.1 | **25** |
| 28 (h1) | 33.6 | **42** |

`naturalLineHeight()` in `src/design/tokens.ts` is that formula, checked
against Chromium at all seventeen sizes in the scale. Every token but
`display` now takes it, and the handful of elements that do set a line height
pass `lh` to `<Text>` and name what they are matching.

This was worth chasing: treating an eyebrow as 1.0 left it 6 pt short, and the
error compounds. Before the fix the Tasks screen differed from the prototype
by 12.5 % of its pixels and up to 21 pt of drift; after it, 0.47 % and 1 pt.
**Following the prototype**, since the screenshots show the prototype and
ACCEPTANCE.md's ±2 pt is written against them.

### 2.13 `text-wrap: balance` has no React Native equivalent
README § Typography asks for balanced wrapping on big titles. CSS does it for
free; React Native has nothing. `src/ui/BalancedText.tsx` emulates it by
measuring and narrowing to the point just before a line is added. Raising it
rather than quietly dropping it, as the handoff asks.

## 3. Things that must come from you (not buildable)

- Apple Developer / App Store Connect and Google Play Console accounts; bundle
  IDs; the IAP products (`pro_monthly`, `pro_yearly` + 7-day trial, 3 tips).
- `theonething.app` domain + DNS. Three public pages are **required** by both
  stores: Privacy, Terms, and `/delete`. That small marketing/legal site is in
  nobody's scope yet.
- Legal review of the Terms/Privacy text. What's in `ACC` is short, plain-English
  summary copy — good UX text, not a policy that satisfies Saudi PDPL or GDPR.
- Brand assets: app icon, splash, store screenshots. The logo today is a CSS
  circle/ring/dot; there are no asset files in the handoff.
- Admin identity provider for "company SSO + mandatory TOTP".
- An AI provider key — the prototype's `parse()` is a regex stub. Capture, Brain
  dump and Assistant all need a real model, a prompt contract, and the 10/day
  meter on Free.
- Backend hosting + **data region** (PDPL matters here; most users in the seed
  data are Saudi/Gulf).
- Analytics vendor for the pseudonymised event list in DATA_MODEL.

## 4. Notes on scope

The handoff is three products, not one: the bilingual mobile app (21 screens),
the admin panel (13 screens, incl. store-webhook ingestion so subscriptions
reflect within 1 min), and the public legal/marketing site. The app alone is the
large majority of the work.

The "nothing is ever sent automatically" rule is the spine of this product and
touches Compose, Follow-ups, the Assistant and notifications. It is also what
keeps the app out of messaging-automation territory for review. I'll treat it as
non-negotiable.

### 2.14 Arabic must be mirrored exactly once
This started as a note about the tab bar and turned out to be the whole app's
problem, so it is worth stating as a rule.

Set the writing direction once, on each root a screen owns, and lay everything
inside out with a plain `row`. Yoga and CSS both run a `row` from the writing
direction's start edge, and both resolve `paddingStart` / `paddingEnd` and a
column's `flex-start` / `flex-end` the same way. Adding `row-reverse` on top of
that mirrors a second time and puts the row back where it started.

The first version did exactly that: `Screen` set `direction: 'rtl'` *and* every
row asked for `row-reverse`. The Arabic screens came out mirrored — the Today
greeting on the left with its buttons on the right, the check circle on the
wrong side of every task row — while the quick-action grid, which used a plain
`row`, was right. A pixel diff did not shout about it (2.9 % on Today, mostly
white space), and the drift check could not see it at all, because that
measures vertical position. **It took putting the Arabic screenshots side by
side.** Worth remembering: neither automated check catches a horizontal flip.

Fixing it took Arabic Today from 2.87 % of pixels differing to 0.57 %.

`useDirection().row` is now always `'row'`, kept as a helper so a row that
should follow the writing direction still says so, with the rule written at its
definition. Mirroring a *glyph* is separate and still explicit (`scaleX` on the
back chevron); gestures convert the other way, physical to logical.

### 2.15 The reminder sheet draws a hairline inside its bottom corner
Every option row in the prototype's reminder sheet carries a bottom border,
including the last one, inside a container with `border-radius: 16px` and
`overflow: hidden`. The last border therefore shows as a hairline just above
the rounded edge. Recreated as-is rather than tidied — say if you want it
dropped.

### 2.16 The handoff's own inline copy was only half readable
§2.10 recorded that `app-content.js` is not the complete copy source and that
22 EN/AR pairs live in `app-logic.js`. There are more than that: the extractor
only matched one of the two shapes the file uses (`ar ? '…' : '…'`), and missed
every `lang === 'ar' ? '…' : '…'` — another 29 pairs, including "Overdue",
"Snoozed", "See all", "Tmw " and the " min" / "h " / "m" suffixes on every
relative time.

I had typed several of those by hand, which is the thing mechanical
transcription exists to prevent. `scripts/extract-inline-copy.js` now reads
both shapes, and every pair must be named — as copy, or in an explicit
not-copy list with a reason (locale ids, icon names, demo names, a layout
offset). A new one upstream fails the script rather than being dropped.

51 pairs now come out, against 22 before.

### 2.17 One status colour in the tokens came from the admin panel
`#6C44A4` was in the token file as the Snoozed pill. It is `oklch(0.48 0.15
300)`, which appears only in `source/admin-logic.js` — it is the admin panel's
reminder colour. The app's Snoozed pill is `oklch(0.5 0.14 300)` = `#714CA6`.
Corrected. Flagging it because the two source files use the same palette with
different values, and the app is what we are building.

Also added: `#B02A2D` for the Overdue pill. README gives danger-fg as a range,
`oklch(0.5–0.55 0.17 25)`, and the prototype spends the darker end on that pill
and the lighter one on the Now line — so both ends are tokens now.

### 2.18 The demo day is pinned to October 2026
The prototype's seed data is written against `BASE = new Date(2026, 9, 9)` and
its later tasks carry absolute dates — `z2026-10-10` for tomorrow, `z2026-10-13`
for the following Monday. Run it on any other day and its "Tomorrow" group is
wrong.

`src/content/demo.ts` reads those as offsets from that base and re-applies them
to whatever today is, so the demo keeps its shape — twelve today, three
tomorrow, three later — on any date. It matters beyond tidiness: the comparison
harness seeds this data, and on 10 October 2026 the untranslated seed would put
the prototype's "tomorrow" tasks into today's groups and make the two screens
disagree for a reason that has nothing to do with the build.

### 2.19 Settings, People and Follow-ups: where the build departs from the prototype
All three screens sit within 1 pt of the prototype on every probe except the
first item below. These are the places the build does not copy the
prototype. Each was decided here, and each can be reversed in one place.

- **People's search field is 48 pt, not the prototype's 24.** SCREENS.md § 10
  says 48, and so does the prototype's own CSS (`height: 48px`). But the field
  sits in a scrolling flex column whose content overflows, and without
  `flex: none` it shrinks to the height of its input. The handoff's screenshot
  shows the squashed field too. Settings' cards carry `flex: none` for exactly
  this reason, so 48 is the intent, and 44 is the minimum tap target anyway.
  Everything below the field sits 24 pt lower than in the prototype, listed in
  `KNOWN_DEVIATIONS`.
- **Arabic forward chevrons point left.** The prototype picks its *back*
  icon for Arabic chevrons, then its icon helper mirrors every back icon in
  Arabic a second time, so the rendered prototype's chevrons point right. The
  handoff's own Arabic screenshot (`28-ar-settings.png`) shows them pointing
  left. This is the double mirroring of §2.14 in miniature. Following the
  screenshot.
- **The Follow-ups channel badge is 20 pt, as SCREENS.md § 14 says.** The
  prototype draws 20 plus two 2 px borders outside it (no `box-sizing`), so
  24. Same call as the checkbox in §2.11.
- **Settings shows only what the account holds.** With no job title, the
  prototype falls back to its demo user's ("Founder · Qahwa House"), and with
  no name to the initial "K". A real account without a job title shows no
  role line.
- **Initials come from the contact's own name.** The prototype's demo
  contacts carry an English and an Arabic name, and People takes initials from
  the English one in both languages ("MA" beside "محمد السعدي"). A real
  contact has one name, so an Arabic name gives Arabic initials: "مس" for
  محمد السعدي, and "ال" for a name that starts with the article. The
  prototype's own Follow-ups does the same. **Decide** whether Arabic names
  should take one letter, or skip "ال".
- **"Remind me" on a waiting follow-up does what Nudge does.** In the
  prototype both buttons call the same handler: write a follow-up task with
  a draft and open Compose. SCREENS.md gives "Remind me" a grey style and a
  bell but no behaviour of its own. Built as the prototype behaves. **Say if
  it should schedule a reminder instead.**
- **A task started from People or by Nudge is due now.** The prototype stamps
  09:30, ten minutes after its frozen 09:20 clock, so on a real day it would
  start out overdue.
- **The "Follow-ups" tab label wraps in the prototype**, onto "Follow- / ups",
  and does not in the app. This is the tab bar built with Today and is
  unchanged here. The drift check probes Follow-ups by its other labels,
  because a probe on "Follow-ups" lands on the tab label.

What Settings cannot do yet, and shows as a toast: Restore purchases, Manage
subscription (it also opens the store's subscriptions page on a device), the
three coffee tips (consumable in-app purchases, never a payment link) and
Download my data. Delete account erases everything on the device except the
language and returns to Sign in. DATA_MODEL.md's server-side hard delete needs
the backend, and `src/lib/account.ts` is where it goes.

### 2.20 Two more places the copy lived, and a collision
`scripts/extract-inline-copy.js` now also reads Settings' three reminder-style
descriptions and the follow-up Nudge's task: its title, goal, talking points
and draft. The task is built by concatenating copy around the follow-up's own
fields, so it comes out as templates with `{what}` and `{n}`. Each has a
pattern written for its line and fails if upstream rewrites it.

Building Settings also turned up a fault in the extractor. Three lines share
the English " min", but their Arabic differs. The collapsed Reminders row
says " د"; relative times say " دقيقة". All three were named `minSuffix`, so
whichever came last won, and Settings would have read "45 دقيقة" where the
prototype has "45 د". The Reminders row now has its own name, and a name that
comes back with different copy now fails the run.

### 2.21 Compose: where the build departs from the prototype
Every probe sits within 1.1 pt of the prototype. Pixel difference is 2–3 %,
most of it the first item below.

- **The Send button is 56 pt; the prototype renders it 26.** It is the same
  flex-shrink artefact as People's search field (§2.19). The screen's column
  overflows by a few points, and the button, with no `flex: none`, absorbs
  it. README gives primary buttons 56 h, so that is what is drawn.
- **A saved number or address is filled in.** The prototype only fills the
  recipient when the task was started from People. Otherwise it starts empty,
  even for a contact whose number it holds, and after "Saved for next time"
  it does not use the number next time either. The build fills it in from the
  task's contact: the linked one, or else the one whose name the task carries,
  matched on the first word as the prototype's "Last time" row does. That is
  what "Add their number once — I'll remember it" promises.
- **"Send email" opens the phone's own mail sheet.** In the prototype it
  only raises "Sent to {address}", which no real app can do without sending
  mail from a server. Nothing in DATA_MODEL does that, and README rules out
  sending without the user. So "Send email" opens the system mail composer,
  already filled in, over the app, and the user taps send there. "Sent to …"
  is shown only when the composer reports that it sent. "Open in Mail app
  instead" opens the Mail app through `mailto:`. Without a mail account, and
  on the web build, "Send email" falls back to that. **Say if you meant
  something else by the two buttons.**
- **"Draft copied" is true.** The toast after "Open in Mail app" says the
  draft was copied, and the prototype does not copy it; the build does. A long
  body can be cut short in a `mailto:` link.
- **The country button's chevron points down in Arabic too.** The prototype
  rotates its back chevron to point down, but in Arabic its icon helper has
  already mirrored it, so the chevron points up. This is the double mirroring
  again (§2.14, §2.19). So is "Last time"'s chevron, which follows Settings.
- **Call now dials the contact's number** when the app has one. The
  prototype shows "Calling…" and dials nothing.
- **Answering "Did you send it?" returns to Today**, as the prototype does,
  whichever screen Compose was opened from.
- **The "Last time" row reads the contact's history**, newest first, and
  falls back to their People line ("Emailed · Sunday") when there is none.
  The history store and its demo data are new here. The contact profile (11)
  will write to them.

### 2.22 Contact profile
Every probe sits at 0 pt. The pixel difference, 0.05 %, is the history's day
headings: the demo history is dated back from today, and the prototype's from
its frozen 9 October.

- **The back button here is 34 pt, not Settings' 40.** It is the same
  button, but in the prototype this one is `display: flex`, which takes the
  icon out of the line box. Matched, not tidied.
- **The action tiles are inert without a number or address.** People's round
  buttons stay tappable when dimmed and Compose then asks for the number;
  these tiles do nothing. That is how the prototype has it, and it is kept.
  **Say if the two should behave alike.**
- **Meeting goes to the event form with the attendee filled in**
  (`/new?type=meeting&contact=…`). That form (09) is not built yet.
- **Closed follow-ups are read into the history, not copied into it.** DATA_MODEL
  has a `followup_closed` history kind. The prototype derives these moments
  from the follow-ups instead, with a tick and no time, so reopening a
  follow-up takes its moment away again. Built the same way.
- **The note and the quick log are stored** on the contact and in the
  history. In the prototype they last only until the page reloads.

### 2.23 Contact form
Every probe sits at 0 pt, with 0.1 % of pixels differing. That needed the
name and role rows at 55 pt: the prototype's 54 pt inputs carry their 1 pt
rule outside the box. Where the build goes beyond the prototype, it is to
meet SCREENS.md § 12 or ACCEPTANCE.md:

- **The country list can be searched.** ACCEPTANCE asks for "country picker
  search", and SCREENS.md for "searchable list of all countries", but the
  prototype's form list has no search row. The search row is the one the
  prototype draws on its other picker (account setup), using the extracted
  "Search country or code" / "No country found" copy. It matches names in
  either language, and dial codes. Compose's picker stays as drawn, without
  one.
- **A phone number, if given, needs seven digits.** SCREENS.md says so; the
  prototype never checks it. A short number blocks Save and, once Save has
  been tried, marks the details card red, as the prototype does for a bad
  email. Neither has a message of its own in the handoff. **Say if they
  should.**
- **Delete asks first and can be undone.** Its confirm is the prototype's
  ("Delete this contact? Their history goes too."): the browser's own on the
  web, a system alert on a phone. Deleting removes the contact and their
  history, and the toast's Undo puts both back. The prototype's toast offers
  Undo too, but its snapshot holds only tasks and follow-ups, so it cannot
  restore the contact.
- **Cancel, Save and Delete all go to People**, as in the prototype, even
  when the form was opened from a profile. **Say if Cancel should go back to
  the profile instead.**
- **The notes are the contact's "Remember for next time"**: one field, the
  same one the profile edits.

### 2.24 Quiet hours: what "respect" means is not stated
SCREENS.md § Notifications ends "Respect Quiet hours and the Quiet style
(badge only)". The Quiet *style* is spelled out in § 21–23 — no sound, no
vibration, badge and list only. Quiet *hours* are not: a reminder that falls
due at 03:00 could fire silently, or be held until 08:00.

The build **fires on time, silently**, for two reasons. A held reminder would
arrive after the thing it was for, which is the one failure this app exists to
prevent; and the handoff's own "Morning of" offset already fires at 08:00,
which is exactly quiet-hours-end — so the design has a way of saying "wait
until morning" and does not use it here. Say if you want the other behaviour.

### 2.25 Three of the five notifications have no Arabic
SCREENS.md § Notifications gives the wording for each row, in English only.
Two of the five can be composed from copy that exists in both languages: the
task reminder is `{Type} · {title}` / `{who}`, and the Firm repeat is the same
again. The other three have nothing:

| Row | SCREENS.md | What is shipped instead |
|---|---|---|
| Follow-up due | "{who} hasn't replied" | "Needs a nudge" / "يحتاج متابعة" (the status the Follow-ups screen already shows for that state), with the person as the body |
| Evening | "Close the day?" | "Close the day" / "سكّر يومك" + "Takes a minute" — Today's own card, minus the question mark |
| Focus end | "Focus session done" | "Focus session · 45 min" / "جلسة تركيز · 45 دقيقة" + "Close the day" |

These are stand-ins, not translations: `src/lib/notifications/copy.ts` is the
one file to change when the real strings arrive. **Please supply all three in
both languages** — a notification is often the only part of the app someone
reads that day.

There is also no wording for notifications being **off**. The design's
Settings row shows its value as "On" and never considers the other case, so
the build shows that value until the user actually refuses, and then shows
none rather than inventing an "Off". Same for the green "On" badge inside the
section.

### 2.26 Notification delivery is unverified
The rules are tested — 20 cases in `src/lib/notifications/plan.test.ts` cover
the offsets, the Firm repeats, quiet hours wrapping midnight, the follow-up
and evening rows, and the pending cap. What cannot be tested in this
environment is delivery: the permission prompt, the Done / Snooze / Open
buttons, whether a snooze from the lock screen really moves the task, and
whether iOS's 64-notification limit behaves as assumed.

**That needs a device**, once there is an Apple Developer account to build
with. Until then, treat the notification layer as written-but-unproven, and
`npm run smoke` says nothing about it.

### 2.27 The Morning priority eyebrow has a name baked into it
`pr_k` is shipped as "GOOD MORNING, KHALID" — the demo user's name, inside the
string, in both languages. SCREENS.md § 05 writes it "GOOD MORNING, {NAME}".

It is composed from the greeting and the account instead
(`inline.goodMorning` + the first name, uppercased), which reproduces the
handoff's own string exactly for that user and works for everyone else. The
prototype does the same thing a few lines away — `'GOOD MORNING, ' +
first.toUpperCase()` — so the baked-in `pr_k` looks like a leftover.

### 2.28 Focus: two prototype slips, and one timing disagreement
- **The mic icon on "Park it" is invisible.** The prototype draws a white
  circle and puts a white icon in it (`ic.mic` is `this.ic('mic', 22,
  '#fff')`), so nothing shows. The circle's own `color` is ink, which is what
  the icon was meant to inherit, so it is drawn in ink here.
- **"{n} promises are safe until later" counts every open task**, not today's.
  Followed as-is: during a session what is on your mind is the whole list, and
  that is what the sentence answers.
- **The screen dims after 4 s in SCREENS.md § 15 and 3.5 s in the
  prototype.** Following the written 4, which is what `motion.focusIdleDim`
  already carried. Half a second, but it is the kind of thing nobody notices
  until they are asked to review it.

### 2.29 The evening review collects decisions and throws them away
SCREENS.md § 20 gives each open promise three answers — Kept · Tomorrow · ✕
Not needed — plus a "Rest → tomorrow" bulk link, and says **"Nothing moves
automatically."**

In the prototype nothing moves at all: the marks go into `s.review`, and
`closeDay` only sets `closed: true`. Press "Close the day" and every task is
exactly where it was.

Read as a prototype shortcut rather than a design. "Nothing moves
automatically" means nothing moves *without being asked*, and the marks are
the asking — so here "Close the day" applies them: Kept completes the task,
Tomorrow moves it on a day, Not needed cancels it. Nothing happens until that
button, which is the part the rule is actually about.

Also: the prototype's "{a} of {b} promises kept" counts **every** task in the
list, including the six on later days — 18 rather than today's 12. An evening
review that counts next week's tasks is reporting on the wrong day, so this
one counts today's.

### 2.30 "Plan tomorrow →" does not exist in either language
SCREENS.md § 20 ends the closed state with a "Plan tomorrow →" button. There
is no such string in the handoff, and the prototype renders `t.pr_k + ' →'`
there — the Morning priority eyebrow — which comes out as "GOOD MORNING,
KHALID →".

The button goes to Morning priority, which is plainly the intent. Its label is
the nearest copy that exists in both languages, `t.tomorrow` ("Tomorrow" /
"لبكرة") plus the arrow. **Please supply the real string**, like the three in
§2.25.

### 2.31 Reschedule has no screen number
Swipe-left on a task, the clock on Up next, and the reminder sheet's "Pick a
date & time" all open the same thing, and SCREENS.md never numbers it — § 07
mentions its calendar in passing as part of the reminder sheet. It is built as
its own route, `/reschedule`, because three screens open it and it has two
modes: `move` changes when the task is due, `remind` sets a custom reminder
and leaves the task alone. The title and the button say which.

Its quick chips come from `rQuick`, whose day offsets are relative to the
prototype's frozen 9 October — "Monday" is `+4`. They are applied relative to
today instead, so "Monday" keeps its offset but not its name. Worth a look
when the demo data is refreshed.

### 2.32 The task store dropped every write but the last
Not a handoff question — a bug in this build, found by the first behavioural
test written against the evening review, and worth recording because the shape
of it will come back.

Every mutation read `tasks` from the closure and wrote the result:
`persistTasks(tasks.map(…))`. Two calls in the same event therefore both
started from the list as it was *before* either ran, and the second overwrote
the first. So:

- **The evening review applied one mark in three.** "Close the day" ran Kept,
  then Tomorrow, then Not needed; only Not needed survived.
- **A saved event lost itself.** The event form added the task and then wrote
  its reminder instant; the second write mapped over the list without the new
  task in it, and deleted it again.

Both looked correct on screen, because the screen re-rendered from the one
write that did land.

The store now takes an updater — `persistTasks(current => …)` — so calls in
the same event compose, and `addTask` works out a reminder's instant itself
rather than leaving every caller to make a second write. `npm run smoke`
covers both paths.

The general lesson for this codebase: **anything that changes the task list
more than once in a single handler must go through one updater**, or the
earlier changes are silently lost.

### 2.33 One measurement that is not a layout error
The drift check compares the tightest box around each labelled piece of text
on both sides. The prototype's template wraps every interpolation in an inline
`<span>`, React Native renders its own box around the same text, and those two
line up — text box against text box, which is why the numbers have been
trustworthy.

The Focus title is the exception. At 22 pt on a 1.3 line-height its glyph box
is taller than the line box it sits in, so the prototype's span reports about
5 pt above where the text is actually laid out. **Both sides put the title at
exactly 126** — the layout agrees; only the measurement does not. It is in
`KNOWN_DEVIATIONS` with that reason rather than papered over.

Recorded because the obvious fix is wrong. Skipping the prototype's inline
span looks like removing noise and instead falls back to the enclosing
button, which is 15 pt taller — every button label on every screen. Tried
once: two failures became sixteen, across five screens nobody had touched.

## 5. Decisions taken

Agreed with the product owner on 10 Oct 2026: React Native (Expo) for the app,
Supabase for the backend, mobile app before admin panel and public pages, and
the Claude API behind the backend for capture, brain dump and the assistant.

Taken here, under the stated assumptions, and reversible in one file each:

- **Pro gating** is permissive except the one documented limit (10 assistant
  requests a day on Free). `src/policy/entitlements.ts` is the only place a
  gate exists — see §2.1.
- **Weekly recap** is off for everyone, so nothing routes to a screen that does
  not exist — see §2.2.
- **Account setup** is one screen with no phone field, following SCREENS.md,
  the screenshot and the prototype's own render against the audit's prose —
  see §2.7.
- **Writing direction** is carried in React context and applied per layout
  rather than through `I18nManager.forceRTL`, which only takes effect after an
  app restart. Settings switches language with an inline pill, so it has to
  apply immediately.
