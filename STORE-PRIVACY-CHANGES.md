# What to change in the two consoles, before the next submission

A working page for one submission, not a reference: `STORE-PRIVACY.md` is the
reference and says what every row is and why. This says only what is
**different** from what is declared now, because the app has already been
through review and most of both forms is already right.

Everything here comes from two things that landed in §2.114 and §2.115: the
redacted shapes of assistant questions, which every account sends, and the
sentences themselves, which only accounts that switched on **Help improve
Sanad** send.

---

## Apple — App Store Connect

**App Store Connect → your app → App Privacy → Edit**

### 1. Change an existing row: User Content → Other User Content

It is declared today as collected, linked, **App Functionality**. Keep all of
that and **add a second purpose**.

| Field | Leave as it is | Change to |
| --- | --- | --- |
| Collected | Yes | Yes |
| Linked to the user | Yes | Yes |
| Used for tracking | No | **No** |
| Purposes | App Functionality | App Functionality **+ Product Personalization** |

Product Personalization covers `assistant_transcript` and nothing else: the
sentences somebody typed to Sanad, kept as written, only for accounts that
turned the switch on, deleted when they turn it off, and deleted after 90
days regardless.

### 2. Add a row that is not there yet: Usage Data → Other Usage Data

| Field | Answer |
| --- | --- |
| Collected | **Yes** |
| Linked to the user | **No** |
| Used for tracking | **No** |
| Purpose | **Analytics** |

This is `assistant_phrasing`: the *shape* of a question, with every name,
number, address and link replaced on the device before it is sent.

**"Linked" is No on purpose, and it is the one answer here worth being able
to defend.** The row carries a `user_id`, so a person's own export and
deletion can find it — that is what makes the export honest. But Apple's
question is whether the data is *used* in a way tied to identity, and it is
not: the screen the team reads shows no name, no email and no account, and
there is nothing in the text to tie a line to anybody, because the device
took it out before sending. If a reviewer asks, that is the answer.

### Nothing else moves

In particular **Used for tracking stays No on every row** — there is still no
advertising SDK, no cross-app identifier and no data broker, so the app still
needs no App Tracking Transparency prompt.

---

## Google Play — Play Console

**Play Console → your app → Policy → App content → Data safety → Manage**

### 1. Change an existing row: Messages → Other in-app messages

| Field | Leave as it is | Change to |
| --- | --- | --- |
| Collected | Yes | Yes |
| Shared | per **Sharing** | unchanged |
| Required or optional | Optional | **Optional** |
| Purposes | App functionality | App functionality **+ Personalisation** |

"Optional" is true in the strongest sense Play means it: off until switched
on, switched off at any time, and switching it off deletes what was
collected.

### 2. Change an existing row: App activity → Other actions

| Field | Leave as it is | Change to |
| --- | --- | --- |
| Collected | Yes | Yes |
| Shared | No | No |
| Required or optional | Optional | Optional |
| Purposes | Analytics | Analytics **+ App functionality** |

This row now covers both the seventeen analytics events and the redacted
phrasings. Play has no closer category: there is no message left in a
phrasing to call it a message, and "Other actions" is where product telemetry
that is neither a crash nor a purchase belongs.

### Nothing else moves

The three whole-app answers are unchanged: encrypted in transit **yes**,
users can request deletion **yes**, committed to the Play Families policy
**not applicable**.

---

## Two things worth having ready

**A reviewer may ask what "Help improve Sanad" is.** It is in Settings →
Privacy, off until switched on. The privacy policy describes it in both
languages — the paragraph beginning "If you would rather we saw the real
sentence" in English, and "وإذا تبي نشوف الجملة نفسها" in Arabic. The
published pages at `onlyonething.app/privacy` carry it too.

**The policy's date moved to 21 October 2026**, and `POLICY_VERSION` moved
with it, so consent rows record which text each person agreed to. If either
console asks for a privacy-policy URL confirmation, nothing about the URL has
changed.
