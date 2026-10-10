# Screens — The One Thing app

Every screen below has a matching PNG in `screenshots/app/`. Exact copy (EN + AR) lives in `source/app-content.js`; quoted strings here are the EN versions. Behaviour reference: `source/app-logic.js` (`renderVals()` handlers named in **bold mono** below).

Frame: 402 × 874 pt. Status bar spacer 54. Screen bg `#FFFFFF` unless noted.

---

## First-run flow (3 screens → Today)
`Sign in` → `Account setup` → `Today (first-run card)`.
Returning users on a new day: `Today` (morning) or `Morning priority` if no One Thing set.

### 01 · Sign in — `01-sign-in.png`, AR `30-ar-sign-in.png`
- **Purpose:** authenticate + record consent.
- **Layout:** column, padding 16/24/40. Top: logo mark (64 circle, 1.5 ink border, 36 inner ring, 11 dot). Hero title "Your day, under control." 32/600. Subtitle 16/400 `#55554F`.
- **Consent (above buttons):**
  - Checkbox 22×22 radius 7. Off: border `#C9C9C5`, white. On: ink fill + white check.
  - **Required:** "I agree to the **Terms of Service** and **Privacy Policy**." Links open the Legal screen (do not toggle the box).
  - **Optional (unchecked by default):** "Send me tips, product news and offers. (optional)".
  - Error (if a sign-in button is tapped without Terms): "Please accept the Terms and Privacy Policy to continue." 13px danger-fg.
- **Buttons** (56 h, radius 28): "Continue with Apple" (ink bg, white Apple mark) then "Continue with Google" (white, 1.5 `#E4E4E0` border, colour G). Both at 45 % opacity until Terms are ticked.
- **Data note** 12px `#8A8A86` centred: "We collect your name, phone, job title and how you use the app to run it and improve it. Marketing only if you opt in — change anytime in Settings."
- **Store consent record:** timestamp + policy version for Terms, and separately for marketing.

### 02 · Account setup — `02-account-setup.png`
- **One screen only.** Back chevron (returns to Sign in). No step dots.
- Eyebrow "Welcome 👋" 14 `#6B6B68`; Q "What should we call you?" 30/600; helper 15.
- Name input: 58 h, 1.5 ink border, radius 16, 18px. **Required** (CTA disabled `#B5B5B0` until ≥1 char).
- "What do you do? (optional)" 14/500 → input (same style) + chips: Founder · Freelancer · Sales · Manager · Consultant · Student (pill, 1.5 border; selected `#F3F2EE` + ink border).
- CTA: "Continue" → once a name is typed becomes **"Let's go, {first name}"**. Goes straight to **Today** with `firstRun = true`.
- Defaults applied silently: reminder style **Gentle**, channels **all on**, focus **45 min**.
- Phone number is **not** asked here (collected later in Settings / first WhatsApp).
- The first name is used everywhere: greeting, assistant, paywall title, avatar initial.

### 03 · Legal (Terms / Privacy) — `03-legal-terms-privacy.png`
- Back + title (Terms of Service | Privacy Policy). "Last updated 9 October 2026". Sections of `h 15/600` + body `14/1.6`. Text in `ACC.en.terms` / `ACC.en.priv`.
- Privacy must include: what we collect, why, sharing, **who at our company can see it (support/troubleshooting, logged)**, people you add, your choices + web deletion link, children (<13), not a medical device, contact.
- **Must also be published at public URLs** for the store listings.

### 04 · Onboarding (2 steps) — `04-onboarding.png`
Prototype keeps it reachable but **first-run skips it** (defaults applied). Keep for "Revisit setup" in a future version. Step 1: intro. Step 2: nudge style (3 compact radio cards) + channel tiles (3-col grid, check badge).

### 05 · Morning priority — `05-morning-priority.png`
- Shown on a **new day** when no One Thing is set (not on first run).
- Eyebrow "GOOD MORNING, {NAME}" 12/.14em; Q 27/600 "If you finish one thing today, which one makes it a good day?".
- Input 54 h (1.5 ink). "From your week" + 3 suggestion rows (selected: `#F4F4F1` bg, ink border, check).
- CTA "Make it my One Thing" + note "Everything else is safe. I'll remind you when it's time." 
- Focus length is **not** on this screen (Settings).

---

## Main tabs (glass tab bar: Today · Tasks · [mic] · Follow-ups · People)
- Active tab: white frosted pill (`rgba(255,255,255,.85)`, inner top highlight), icon stroke 2, label 600 ink. Inactive: `#9A9A96`, stroke 1.7.
- **Mic orb:** tap → Quick capture. **Press-and-hold 450 ms** → Brain dump.

### 06 · Today — `06-today.png`, AR `25-ar-today.png`
- Padding 8/20/150, gap 24.
- **Header:** date 13 `#6B6B68` + "Good morning, {name}" 21/600 (evening → "Good evening"). Right: 44 circles — assistant (spark), evening review (moon), avatar (ink, initial) → Settings.
- **First-run card** (only when `firstRun`): ink bg, radius 26, padding 24/22/22. Eyebrow "FIRST THING" `#A8A8A3`. Q 26/600 white. Input row on `#1F1F1E` radius 16 with "Set" button (white when text, `#6B6B68` when empty; Enter submits). "Or pick one" + suggestion chips (outlined `#3A3A38`). "Later — just show me my day" link. On set → toast "Set. Gentle reminders are on — change it anytime in Settings." and card becomes the normal One Thing card.
- **One Thing card** (normal): `#F3F2EE`, radius 26. Eyebrow "YOUR ONE THING TODAY" + "Edit" (→ Morning priority). Title 28/600. "Focus session · 45 min" with clock. **Lock In** button (ink, 54 h) → Focus. "Feeling stuck? Shrink it" → Overwhelm mode. When done: white pill "✓ Done today".
- **Evening variant** (after 18:00): ink card "Close the day" with One Thing status + kept count → Daily review.
- **Quick actions:** eyebrow + 4×2 grid, tiles 76 h radius 18 bg = type tile colour, icon 22 + label 12/600 in type fg: Call · Email · WhatsApp · Remind · Visit · Meeting · Webinar · Course.
  - Call/Email/WhatsApp → "who?" contact picker sheet → creates task → Compose.
  - Remind → Quick capture. Visit/Meeting/Webinar/Course → Event form.
- **Small promises:** title 17/600 + "See all" (→ Tasks). Red "Now · HH:MM" divider before the next upcoming item. **2 rows max**, then "See all {n}". Rows: swipe right = Done (WhatsApp green bg), swipe left = Reschedule (purple bg); check circle 26; type tile 36; title 15/500; "{Type} · {who}" 12; time + "in 40 min".
- **Empty state:** dashed card "Nothing on your plate" + "Brain dump" button.

### 07 · Tasks — `07-tasks.png`, AR `26-ar-tasks.png`; add sheet `08-tasks-add-sheet.png`
- Header: "Tasks" 28/600 + "{a} of {b} done today" + **"+ Add"** pill (ink, 44 h). Progress bar 4 h.
- Reminder hint: "🔔 9 without a reminder · **Add reminders to these**" → adds a reminder **only to tasks with none**, toast "Added reminders to 9 tasks · your existing ones weren't touched" with **Undo**.
- **Up next** dark card (title, who, "in 40 min", primary action e.g. "Open WhatsApp draft", reschedule + done circles).
- **Filter chips:** horizontal scroll, no scrollbar: All · Calls · Emails · WhatsApp · Reminders · Done (dot in type colour).
- Groups: This morning / This afternoon / This evening / Later (collapsible, count). Row: left 64 time column (time + reminder mini "−10m" in purple, tap = reminder sheet) · middle title + [status pill] + type icon + who · right check.
- **Status pills:** **Overdue** (danger-bg/fg) when time < now and not done · **Snoozed** (purple) · Done = strikethrough grey.
- **Add sheet:** scrim, sheet radius 28 top, handle, "Add a task" + ✕, 4×2 action grid (58 tiles radius 18), "Or just say it" outline button (mic) → Quick capture.
- **Reminder sheet** (tap time column): At time · 10 min before · 1 hr before · custom date/time (calendar) · None.

### 09 · Event form (Visit / Meeting / Webinar / Course) — `09-new-event-meeting.png`
- Header: Cancel · [type tile 28] "New meeting" · Save (disabled grey until title).
- Fields by type (labels 12 `#6B6B68`, inputs 52 h radius 14 1.5 `#E4E4E0`, focus ink):

| Field | Visit | Meeting | Webinar | Course |
|---|---|---|---|---|
| Title (56 h, 1.5 ink, 18/500) | "What's the visit for?" | "Meeting about" | "Webinar name" | "Course name" |
| Where (chips) | — | Zoom · Google Meet · Teams · In person | — | Udemy · Coursera · YouTube · Other |
| Link (LTR, url keyboard) | — | ✓ (hidden if In person) | ✓ | ✓ |
| Host / organiser | — | — | ✓ | — |
| Location + "Maps" button | ✓ | ✓ if In person | — | — |
| Who (horizontal person chips with avatar) | single: "Contact person" | multi: "Tap to add attendees" | — | — |
| Next lesson | — | — | — | ✓ |
| Study days (7-col S M T W T F S toggles) | — | — | — | ✓ |
| Day chips | Today · Tomorrow · This week | ✓ | ✓ | — |
| Time (horizontal 08:00–21:00 chips, selected ink) | ✓ | ✓ | ✓ | ✓ |
| Length | — | 15 · 30 · 45 min · 1 hr | — | — |
| Progress (− bar +, "{a} of {b} lessons") | — | — | — | ✓ |
| Remind me | 10 min before · 1 hr before · Day before · None | ✓ | ✓ | ✓ |
| Notes (textarea 3 rows) | ✓ | ✓ | ✓ | ✓ |

- CTA "Save meeting" etc. Saves as a task of that type; toast "Meeting saved · I'll remind you 1 hr before". Returns to the screen it came from.

### 10 · People — `10-people.png`
- Title "People" + "Everyone you've emailed, called or messaged." + "New" button. Search (48 h `#F3F2EE`). Section label "RECENT". Row: avatar 42 · name 15/600 · role + last interaction 12 · 3 round 36 quick buttons (WhatsApp / Email / Call; 40 % opacity if no number/email). **Tap row → Contact profile.**

### 11 · Contact profile — `11-contact-profile.png`, AR `27-ar-contact-profile.png`
- Bg `#F6F6F3`. Back + "Edit" pill.
- Centre: avatar 76 ink, name 22/600, role 14, tags (phone, email) white pills.
- 4 action tiles (WhatsApp · Email · Call · Meeting) — disabled 40 % if missing data. Meeting pre-fills attendee.
- **"Remember for next time"** note card (note-bg, bulb icon, editable textarea, autosaves).
- **Coming up:** open tasks with this person (type tile, title, type, time).
- **History:** "{n} moments". Quick log: kind chips (Note · Call · Meeting · Visit) + input + "Log". Timeline grouped by date (Today / Yesterday / "Thu, 2 Oct"): 32 circle icon in type colour, vertical connector, text 14/500, meta "Type · HH:MM". Closed follow-ups appear automatically.

### 12 · Contact edit / new — `12-contact-edit.png`
- Header: Cancel · "Edit contact"/"New contact" · Save (ink when name ≥2 chars).
- Avatar initials 76. Card 1: Name / Company or role (54 h rows, divided). Card 2 "Contact details (optional)": phone with **country picker** (flag + dial, searchable list of all countries) / email. "Usually reach them by" 3 tiles. "Notes for next time" note-coloured textarea.
- **Duplicate warning** (warn banner) if name, phone or email matches another contact → "Open".
- Buttons: **Save contact** (primary) · "Save & message on WhatsApp" (outline, sub-label "Opens WhatsApp with a draft — you hit send") · **Delete contact** (danger text, confirm, edit only).
- Validation: name required; email format; phone ≥7 digits if entered.

### 13 · Compose & send — `13-compose.png`
- Back · "{Type} · {time}" · Reschedule pill. Title 26/600 + who.
- Recipient: WhatsApp number (country picker) or Email To + Subject. Suggestions list appears **only while typing**.
- **Brief card** (`#F4F4F1` radius 18): Goal 15/500 + point chips + **"Last time"** row (latest history entry → opens profile).
- Draft textarea (7 rows, editable).
- Primary: "Open in WhatsApp" / "Send email" (+ "Open Mail app") / "Call now".
- **After returning:** card "Did you send it? If yes, when should I follow up?" → Tomorrow · In 2 days · Next week · No need (marks done; first three create a follow-up) · **"No, I didn't send it yet"** (keeps task open, toast "Okay — the draft is saved. Still on your list.").

### 14 · Follow-ups — `14-followups.png`
- Title + summary "{a} need a nudge · {b} waiting on a reply".
- Segmented (3): **Nudge** (red count badge) · Waiting · Closed.
- Card (white, radius 20): avatar initials 44 + channel badge 20 · who 15/600 · what 14 · status pill (Overdue / Waiting / Closed). Footer: since-text 12 (e.g. "Sent Sunday · follow up Tue", "Draft ready · not sent yet") · ✓ round button (= "Got a reply" → Closed, Undo) · main button:
  - Overdue → **Nudge** (ink, send icon): creates a follow-up task with a ready draft and opens **Compose**. Never sends automatically.
  - Waiting → **Remind me** (grey, bell).
- Closed: "Reopen" link. Empty states per tab with green check circle.

### 15 · Focus (Lock In) — `15-focus-lock-in.png`
- Full-bleed ink (status bar dark). Top: back + "LOCKED IN". Ring timer 260 (progress ring, breathing glow while running), mm:ss 56.
- Buttons: Pause / **"Resume · 23:10 left"** (continues remaining time) · **I'm done** (if time remains → confirm "End the session early? 23:10 still left.").
- "Remembered something? Park it." → Quick capture (returns to Focus). "{n} promises are safe until later".
- Screen dims UI after 4 s idle; tap to wake.
- Completion → local notification at end time (schedule on start).

### 16 · Overwhelm mode — `16-overwhelm-mode.png`
- `#F6F6F3`. Shows **one small step** at a time from the One Thing breakdown: "Step 2 of 5", step text, "Make it tinier" toggle, "Done — next step", "5-minute sprint" (→ Focus 5 min). List of steps with done/current dots. Kept intentionally simple (no editing).

### 17 · Quick capture — `17-quick-capture.png`
- "Say it. Forget it." Big mic (tap to record, listening bars) **or type** (text field + send).
- Result card shows parsed **What · Who · When · Via** for review → "Looks right" (saves, toast "Saved. Back to your One Thing.") or "Edit".

### 18 · Brain dump — `18-brain-dump.png`
- Long text/voice area → "Sort it" → list of extracted items, each with keep toggle, type, time; "Save {n}". Nothing saved until confirmed.

### 19 · Assistant chat — `19-assistant-chat.png`
- Header: back, spark avatar, "Assistant" + One Thing. Bot greets by name. Suggestion chips. Replies: task card (What/Who/When/Via + "Looks right"/"Edit"), day plan list, follow-ups button. Scope: tasks, contacts, reminders, follow-ups only.

### 20 · Daily review — `20-daily-review.png`
- "How did today go?" One Thing card with Done / Not yet.
- "Promises" + kept summary. Up to 4 open items (+ "Show all"): each **Kept · Tomorrow · ✕ Not needed**. "Rest → tomorrow" bulk link. **Nothing moves automatically.**
- "Close the day" → closed state (moon, "Rest well", summary, "Plan tomorrow →").

### 21–23 · Settings — `21-settings.png`, `22-settings-reminders-open.png`, `23-settings-delete-account.png`, AR `28-ar-settings.png`
- Bg `#F6F6F3`, gap 14. Back + "Settings".
- Profile card (avatar 48, name, role, **Free/Pro** badge).
- Pro banner (Free only): ink, star tile, "Try Pro free for 7 days" → Paywall.
- **Accordion card** (one open at a time, chevron rotates). Each row: 32 tile + label + current value:
  - **Reminders** — "Gentle · 45 min": segmented style + **description of the selected style** · Default focus segmented 25/45/90 · Quiet hours 22:00–08:00.
    - Gentle: one soft notification at the time; snooze from notification.
    - Firm: on time, then every 10 min up to 3× until done/snoozed.
    - Quiet: no sound/vibration; badge + list only.
  - **Notifications** — "On": Allow notifications (opens OS settings) · Sound toggle · Vibration toggle.
  - **Channels** — "3 on": WhatsApp / Mail / Phone calls toggles (44×26 track, 20 white knob).
  - **Language** — inline EN | العربية pill switch (no accordion).
  - **Privacy & data**: Tips & offers toggle (marketing consent) · Privacy Policy › · Terms of Service › · Download my data › (toast "We'll email your data within 24 hours.").
- Card 2: **Buy us a coffee** (→ tip sheet) · **Restore purchases** (Free) / **Manage subscription** (Pro → opens store subscription page).
- Footer row: Sign out (outline) · "Version 1.0.0" · **Delete account** (danger).
- **Delete sheet:** trash tile, "Delete your account?", what's erased (3 bullets), note "Data is removed within 30 days. A Pro subscription isn't cancelled automatically — cancel it in App Store or Google Play settings. You can also request deletion at theonething.app/delete.", **Delete my account** (danger) / Keep my account. On delete → wipe local + server, return to Sign in.
- **Tip sheet:** coffee tile, "Buy us a coffee", explanation (optional, one-time, unlocks nothing), 3 tiles Small $0.99 · Regular $2.99 · Large $4.99 → **consumable in-app purchase**, note "Paid through your App Store or Google Play account." Toast "Thank you so much ☕".

### 24 · Paywall — `24-paywall.png`, AR `29-ar-paywall.png`
- ✕ close · "Restore". Badge "THE ONE THING PRO". Title "Never drop a promise again, {name}." 30/600.
- 6 features (36 tiles colour-coded): Unlimited smart assistant (Free: 10/day) · Client history · Auto follow-ups · Unlimited brain dumps · Meetings, webinars & courses · Weekly recap.
- Plans (radio cards, 2 border): **Yearly $2.99 / month — "$35.88 billed once a year" — tag "Save 40%"** (default) · Monthly $4.99 / month.
- CTA "Start 7-day free trial". Fine print (required wording): "Free for 7 days, then $35.88/year. Payment is charged to your Apple ID or Google Play account when the trial ends. Renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your store account settings." Terms · Privacy links.

---

## Notifications (local + push)
| Trigger | Title / body | Actions |
|---|---|---|
| Task time (per reminder offset) | "{Type} · {title}" / "{who}" | Done · Snooze 10 min · Open |
| Firm style | repeat every 10 min ×3 | same |
| Focus end | "Focus session done" | Open |
| Follow-up due | "{who} hasn't replied" | Nudge (opens Compose) |
| Evening (18:30) | "Close the day?" | Open review |
Respect Quiet hours and the Quiet style (badge only).
