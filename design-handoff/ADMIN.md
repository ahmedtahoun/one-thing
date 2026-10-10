# Admin Panel — internal only

Never shipped inside the mobile app. Web app at e.g. `admin.theonething.app`, behind company SSO/email + **mandatory TOTP 2FA**. Screenshots in `screenshots/admin/`. Behaviour reference: `source/admin-logic.js`.

Layout: fixed left sidebar 232 px (ink `#0B0B0B`, white text, active item white bg/ink text) + main area (bg `#F6F6F3`, padding 28/32). Cards white radius 18. Font IBM Plex Sans Arabic; IDs/timestamps IBM Plex Mono 11–12.

## 01–02 · Sign in + 2-step — `01-sign-in.png`, `02-two-step.png`
- Email must end `@theonething.app`; password; then 6-digit TOTP (mono 24, letter-spacing .3em). Lockout 15 min after repeated failures. Log "Signed in to admin".

## 03 · Overview — `03-overview.png`
- Range: Today / 7 days / 30 days. KPI cards: Total users · Active users · Pro subscribers · On trial (+ conversion) · Monthly revenue (after store fees) · Cancelled 30 days.
- 14-day sign-ups bar chart (last 7 ink, previous 7 grey). Sources (Apple/Google/platform, Arabic UI share).
- **Analytics dataset** banner: "Export dataset (pseudonymised)" → users/tasks/contacts/messages/events CSVs with stable user IDs and **hashed phone/email**. "Schema" button.
- Needs attention list · Feature usage bars (7 days).

## 04–07 · Users + user drawer — `04-users.png`, `05-user-troubleshoot.png`, `06-user-contacts.png`, `07-user-messages.png`
- Table (min 900 wide, horizontal scroll): User (avatar, name, email) · Platform · Plan pill · Signed up · Last active · Contacts · Tasks · Marketing. Search by name/email/phone/ID. Plan filter chips. Export CSV (logged).
- **Drawer** (right, 560, scroll, `grid-auto-rows:max-content`):
  - Header: user ID (mono), avatar, name, job · country, plan pill, suspended banner.
  - Info card: Email · Phone · Signed in with · Joined · Last active · App version (**shown in full**).
  - Subscription card + actions: Extend trial 7 days · Grant Pro (comp, confirm) · Open in App Store Connect / Play Console (refunds happen there).
  - Usage tiles · Consent record (Terms version + date, Marketing opt-in date, Notifications).
  - **Tabs:** **Troubleshoot** (default) · Activity · Tasks · Contacts · Messages. "This view is logged."
    - Troubleshoot: checks (Notifications, Sync, App version, Crashes, Billing, Account) with ✓/!/✕ and fix buttons (Send how-to, Re-check receipt, Force re-sync) · Contact data issues (No phone, No email, Duplicate) · this user's support tickets.
    - Activity: dated event timeline. Tasks: type pill, title, who, date/time, status. Contacts: name · position & company · phone / email · history count. Messages: channel, recipient, subject, full draft text, status (Sent confirmed / Draft / Not sent).
  - Account actions: Export their data (emails the user) · Suspend / Restore (confirm) · Delete account (confirm).
- Footer note: "Shown for troubleshooting and support, as described in the Privacy Policy. Every view is recorded in the audit log."

## 08 · Subscriptions — `08-subscriptions.png`
KPIs (Active, Trial, Billing issue, Cancelling, Yearly share). Filter: All / Active / Trial / Billing issue / Cancelling / Refunded. Rows → open user drawer. Source of truth = App Store Server Notifications v2 + Google RTDN webhooks.

## 09 · Support — `09-support.png`
Inbox merging **in-app "Contact us"** + **App Store & Google Play reviews**. Filters Open / Store reviews / Resolved / All. Sidebar badge = unanswered count. Thread view; macros (Notifications fix, Refund how-to, Thanks!, New phone). Reply: private (in-app + email) vs **public** for store reviews (warning text). "Open user" jumps to drawer. Mark resolved.

## 10 · Growth — `10-growth.png`
Funnel (Downloaded → Signed in → Finished setup → Set first One Thing → Added 3+ tasks → Started trial → Became Pro) with step drop % (red if >40 %) + insight. Weekly retention cohort heat-map. **Offer codes** (create/pause/activate) → created as App Store offer codes / Play promo codes.

## 11 · Privacy requests — `11-privacy-requests.png`
Delete / Export requests from app or web (`theonething.app/delete`), countdown to 30-day deadline (red ≤7 days), "Delete now" (confirm) / "Send export". Completed state.

## 12 · Audit log — `12-audit-log.png`
Append-only: When (mono) · Admin · Action · Reason. Every user-record open, tab view, export, grant, suspend, delete, reply, sign-in. Not editable or deletable.

## 13 · Team & roles — `13-team-roles.png`
| Role | Can |
|---|---|
| Owner | Everything, manage team, delete accounts |
| Support | View users, subscriptions, content for troubleshooting; extend trials; reply to support |
| Analyst | Overview & usage; export **pseudonymised** dataset only; no personal data; no actions |
2FA required for all.
