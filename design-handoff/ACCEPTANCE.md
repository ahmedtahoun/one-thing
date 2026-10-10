# Acceptance checklist — v1.0

Compare each screen side-by-side with its PNG in `screenshots/`. Ship when every box is ticked.

## Visual
- [ ] Font is IBM Plex Sans Arabic everywhere (EN + AR); sizes/weights match README scale
- [ ] Colours match tokens exactly (neutrals + 8 type colours)
- [ ] Glass tab bar: blur, gradient, inner highlights, active frosted pill, raised mic orb
- [ ] Every screen matches its screenshot at 402 × 874 within ±2 pt
- [ ] Arabic screens are mirrored RTL; numbers, times, prices, links stay LTR
- [ ] Dynamic Type XL doesn't clip; tap targets ≥44

## First run
- [ ] Sign-in buttons disabled-looking until Terms ticked; error shows if tapped
- [ ] Marketing checkbox unticked by default, stored separately with timestamp
- [ ] Setup is one screen; name required; job optional; CTA "Let's go, {name}"
- [ ] Lands on Today with the dark first-run card; setting it shows the toast; "Later" skips
- [ ] Name appears in greeting, assistant first message, paywall title, avatar

## Core
- [ ] Quick actions route correctly (Call/Email/WhatsApp → picker → Compose; Remind → Capture; others → Event form)
- [ ] Event form shows the right fields per type; Save disabled until title
- [ ] Tasks: filters scroll; Overdue/Snoozed pills; "Add reminders to these" only fills empty ones + Undo
- [ ] Swipe right = done, left = reschedule
- [ ] Compose opens WhatsApp/Mail/Phone with the draft; marks done **only** after "Did you send it?"
- [ ] "No, I didn't send it yet" keeps the task open
- [ ] Follow-up Nudge opens Compose with a draft — no automatic send
- [ ] Contact profile: actions, remember note autosave, coming up, dated history, quick log
- [ ] Contact form: phone/email optional, duplicate banner, delete with confirm, country picker search
- [ ] Focus: Resume shows time left; early finish asks to confirm; end notification fires
- [ ] Review: nothing moves unless tapped; Not needed cancels; bulk "Rest → tomorrow"
- [ ] Capture/Brain dump/Assistant always show parsed result before saving

## Settings & store compliance
- [ ] Accordion: one open at a time; no clipping when open; values shown on collapsed rows
- [ ] Reminder style description changes per style; behaviours match the definitions
- [ ] Notifications row opens OS settings; Sound/Vibration toggles work
- [ ] Delete account in-app, confirm sheet, data erased ≤30 days, web link works
- [ ] Restore purchases (Free) / Manage subscription (Pro)
- [ ] Paywall shows price, period, trial, auto-renew wording, Terms + Privacy links
- [ ] Coffee tips are **in-app purchases** (no external payment links)
- [ ] Privacy Policy + Terms reachable in app **and** at public URLs
- [ ] Permission purpose strings present (notifications, microphone, speech)

## Admin
- [ ] 2FA required; non-company emails rejected
- [ ] Every user-record open / tab / export / action writes an audit-log row
- [ ] Analyst role cannot see personal data
- [ ] Privacy requests show deadline; delete/export complete end-to-end
- [ ] Subscriptions reflect store webhooks within 1 min
