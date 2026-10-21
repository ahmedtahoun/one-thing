# App Privacy and Data safety — the answers, and the evidence for each

The two forms Apple and Google make you fill in before review. They ask the
same questions in different words, and both are declarations you are held to:
an answer that does not match what the app does is worse than a late
submission, because it is the kind of thing that gets found afterwards.

Every row here is traced to code rather than to memory. Where a question is a
judgement call rather than a fact, it says so and does not pretend otherwise —
those are the ones worth a second opinion before you submit.

Read alongside `src/content/strings.ts` (`ACC.priv`, the Privacy Policy
itself) and `RELEASE.md` § 7. **If any of this stops being true, the policy is
wrong too** — they describe the same app.

---

## The short version

- **Nothing is used for tracking.** No advertising SDK, no cross-app
  identifiers, no data broker. Apple's "Used for Tracking" is **No** on every
  row, so the app needs no App Tracking Transparency prompt.
- **Photos, card images, audio and imported files never leave the device.**
  The app asks for camera, photo-library, microphone and file permissions and
  uploads none of what they produce. Declaring them as collected would be
  wrong in the direction that costs you a feature.
- **Three parties receive data:** Supabase (hosting), Anthropic (the
  assistant), Sentry (crashes). Apple and Google handle sign-in and payment
  under their own terms.

---

## Apple — App Privacy

For each type: *Collected · Linked to the user · Used for tracking · Purposes*.
Tracking is **No** throughout.

| Data type | Collected | Linked | Purpose | Why — the evidence |
| --- | --- | --- | --- | --- |
| **Contact Info → Name** | Yes | Yes | App Functionality | `app_user.name`, `first_name`, from the sign-in provider and the setup screen. |
| **Contact Info → Email Address** | Yes | Yes | App Functionality | `app_user.email`, from Apple or Google sign-in. |
| **Contact Info → Phone Number** | Yes | Yes | App Functionality | `app_user.phone_dial`, `phone_number`, typed during setup. |
| **Contact Info → Physical Address** | Yes | Yes | App Functionality | `contact.address` — the address of a person the user saves, from a scanned card or the form. Not the user's own. |
| **Contacts** | Yes | Yes | App Functionality | The `contact` table: name, company, two phones, two emails, address, labels, and the user's note about them. Added by hand, from the phone's contacts, from a file, or from a card. |
| **User Content → Other User Content** | Yes | Yes | App Functionality | `task.title`, `notes`, `goal`, `points`, and the message drafts `draft_subject` / `draft_body`. This is the substance of the app. **Not** what somebody typed into the assistant: that goes to Anthropic to be read and comes back, and the only thing kept is the markered-up shape of it — see "Usage Data → Other Usage Data". |
| **User Content → Customer Support** | Yes | Yes | App Functionality | `support_ticket`, `support_message`. |
| **Identifiers → User ID** | Yes | Yes | App Functionality | `app_user.id`, plus `apple_sub` / `google_sub`. |
| **Purchases → Purchase History** | Yes | Yes | App Functionality | `subscription` and `tip`, written from the store webhooks. |
| **Usage Data → Product Interaction** | Yes | Yes | Analytics | `analytics_event`. See the note below — "Linked" is the honest answer. |
| **Usage Data → Other Usage Data** | Yes | **No** | Product Personalization | `assistant_phrasing` — the *shape* of a question put to the assistant, and whether it was understood. The device replaces every name, number, address and link with a marker before it is queued (`src/lib/parse/redact.ts`), drops a sentence it is not sure it cleaned, and the table refuses a row still holding an address or a long run of digits. The row carries a `user_id` so the person's own export and deletion can find it, and nothing in the screen that is read shows it; Apple's "Linked" asks whether the data is *used* in a way tied to identity, and it is not. |
| **Diagnostics → Crash Data** | Yes | **No** | App Functionality | Sentry, and only when `EXPO_PUBLIC_SENTRY_DSN` is set. `src/lib/crash.ts` sets `sendDefaultPii: false` and deletes `event.user`, so there is nothing to link it by. |

### Declared as NOT collected, deliberately

| Data type | Why not |
| --- | --- |
| **User Content → Photos or Videos** | A picture chosen for a person or for yourself is copied into the app's own folder with only the filename stored, outside sync (`src/lib/photos.ts`). A photographed business card is held in component state for the preview and never saved (`app/scan-card.tsx`). Nothing is uploaded. |
| **User Content → Audio Data** | Speech is turned into text by the phone's own recogniser. The app receives text and never the recording. |
| **User Content → Other (files)** | A spreadsheet, PDF or contacts file is parsed on the device; the text the user confirms becomes contacts, and the file itself is not uploaded. |
| **Location** | Never requested. `task.location` is a line of text someone typed, not a coordinate. |
| **Identifiers → Device ID** | Not collected. |
| **Diagnostics → Performance Data** | `tracesSampleRate: 0`. Tracing is off, so none is produced. |

### Two rows worth getting right

**Usage Data is Linked, not Unlinked.** `analytics_event` carries a
`user_id`, so although no event contains a name, a phone, an email or any free
text — the union in `src/lib/analytics/events.ts` is the entire surface, and
`events.test.ts` holds it there — it is still attached to an account. Apple's
question is whether it is *linked*, not whether it is *identifying*. Answer
Linked. The one exception is `account_deleted`, which the server writes with
no `user_id` precisely so deletions can be counted without keeping who asked.

**Crash Data is the only Not Linked row**, and only because of how it is
configured rather than by nature. If anyone ever sets `sendDefaultPii: true`
or calls `Sentry.setUser`, this answer becomes wrong and the form has to
change with it.

---

## Google Play — Data safety

Play asks, per type: *Collected · Shared · Required or optional · Purpose*.
Plus three questions about the whole app, answered at the end.

| Play data type | Collected | Shared | Required? | Purpose |
| --- | --- | --- | --- | --- |
| Personal info → Name | Yes | See **Sharing** | Required | App functionality |
| Personal info → Email address | Yes | See **Sharing** | Required | App functionality |
| Personal info → Phone number | Yes | See **Sharing** | Optional | App functionality |
| Personal info → Address | Yes | See **Sharing** | Optional | App functionality |
| Personal info → User IDs | Yes | See **Sharing** | Required | App functionality |
| Contacts → Contacts | Yes | See **Sharing** | Optional | App functionality |
| Messages → Other in-app messages | Yes | See **Sharing** | Optional | App functionality |
| App activity → Other actions | Yes | No | Optional | Analytics, App functionality |
| App info and performance → Crash logs | Yes | Yes (Sentry) | Optional | App functionality |
| Financial info → Purchase history | Yes | No | Optional | App functionality |

Declared **not collected**: Photos and videos, Audio, Files and docs,
Location, Health, Calendar, Web browsing — for the same reasons as the Apple
table above.

**"App activity → Other actions" now covers two things.** The seventeen
analytics events, and `assistant_phrasing` — the shape of a question put to
the assistant with every name, number, address and link replaced by a marker
on the device before it is sent, kept so the assistant can be taught the
phrasings it misses. Play has no closer category: it is not a message (there
is no message left in it), and Play's "Other actions" is where product
telemetry that is neither a crash nor a purchase belongs. The second purpose
is App functionality, because what it buys is an assistant that understands
more of what is said to it.

**"Messages → Other in-app messages" is a judgement call.** The app stores
`draft_subject` and `draft_body` — messages the user wrote but has not sent,
because the app never sends on their behalf. They are not messages exchanged
inside the app, which is what the category is usually for, but they are
message content sitting on our server, and declaring it costs nothing while
omitting it could look like concealment. Declared.

### The whole-app questions

- **Is data encrypted in transit?** Yes. Every call is HTTPS to Supabase.
- **Can users request deletion?** Yes. In the app under Settings → Privacy &
  data, and on the web at the deletion page — Play requires the web route for
  people who already removed the app. Everything goes within 30 days,
  backups included.
- **Has this app been independently validated against a security standard?**
  No.

---

## Sharing — the question both forms ask worst

"Shared" means transferred to another company, and the line between a
*processor acting for you* and a *third party receiving data* is the part
neither form explains well. What actually happens:

| Who | What they get | Why |
| --- | --- | --- |
| **Supabase** | Everything stored: the account, tasks, contacts, drafts, analytics. | They host the database and servers. A pure processor — they act only on our instructions. |
| **Anthropic** | Only what the user typed into the assistant, plus their language and time zone. Not the contact list — though a name typed into a note travels with the text. `AssistRequest` in `supabase/functions/_shared/assist-contract.ts` is the whole payload, and it is four fields. | It reads the note and proposes a task. |
| **Sentry** | Crash diagnostics: what failed and where in the code. No PII, no console or http breadcrumbs, so a task title cannot ride along. | So a crash is visible without waiting for a review to mention it. |
| **Apple / Google** | Sign-in and payment, under their own terms. | Not a transfer you declare — the user is dealing with them directly. |

Conservative answer, and the one taken above: **declare the Supabase-held
types as shared on Play**, and declare Anthropic and Sentry too. Play's
guidance excludes some service-provider transfers, but the exclusion is
narrower than people assume and the cost of over-declaring is a slightly
busier label, while the cost of under-declaring is an enforcement action.

**Worth a second opinion before you submit.** This is the one section where a
defensible reading could go the other way, and it is cheap to ask now.

---

## Apple's purpose strings, and keeping them true

Apple rejects purpose strings that do not describe real use, so these are
written to match the code and must be re-read whenever the code changes.

| Permission | What the app actually does with it |
| --- | --- |
| Contacts | **Changed 17 October.** Reads the address book to show it inside the app, so the user can search it and pick who to add (`app/phone-book.tsx`, BUILD-REVIEW §2.94). Only the people they tap are saved, nothing is uploaded, and the list is held for as long as that one screen is open. The purpose string in `app.json` says exactly this; the old one — "only when you tap Import to pick one person" — no longer describes the code, which is the kind of mismatch Apple rejects under 5.1.1. |
| Camera | Photographs a business card (read on the device; only the confirmed text is kept) **or** takes a picture for a person or the user. Both screens call `launchCameraAsync`. |
| Photo library | Chooses a card image **or** a picture for a person or the user. Both screens call `launchImageLibraryAsync`. |
| Microphone / Speech | Turns a spoken note into text. No recording is kept. The app also explains this in a sheet of its own before the first recording — Play requires it and Apple does not (BUILD-REVIEW §2.87). |
| Notifications | Reminders the user set. |

---

## Play's prominent disclosure, and where it is

Play asks for more than the Data safety entry for the microphone: an
in-app disclosure, before the permission request, saying what is collected
and what happens to it, in wording that agrees with the policy. It is
`src/features/mic/MicNotice.tsx`, shown once per device on each of the
three screens with a mic, and its text **is** the policy's Voice notes
paragraph — `mic-notice.test.ts` fails the build if the two ever differ.
If a reviewer asks where the disclosure is, that is the answer; it is also
why the policy paragraph must not be edited in isolation.

---

## Before you submit, check these are still true

The forms go stale silently. Each of these would change an answer above:

- A new table holding something the tables listed here do not.
- A new third party — another API, another SDK, an email provider for the
  data export (`RELEASE.md` § 9.9 lists that one as still open).
- Anything uploading a photo, a card image, audio or an imported file.
- **The address book being stored rather than browsed.** Today it is read
  into one screen's memory and only the people picked are saved. Keeping
  the whole book — to match numbers, to show "who else is on The One
  Thing", anything — would make Contacts *collected* on both forms, and
  would need the policy to say so.
- Any analytics event carrying free text. `src/lib/analytics/events.ts` is a
  closed union and `events.test.ts` enforces it, so this one cannot happen
  quietly — but widening the union would do it.
- `sendDefaultPii` or `Sentry.setUser` appearing in `src/lib/crash.ts`.
