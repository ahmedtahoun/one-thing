# Data model, integrations & state

## Entities
```
User        id, created_at, auth_provider(apple|google), apple_sub|google_sub, email, name, first_name,
            job_title?, phone?{dial,number}, country, language(en|ar), platform(ios|android), app_version,
            plan(free|trial|pro|lapsed), suspended:boolean, deleted_at?
Settings    user_id, nudge_style(gentle|firm|quiet)=gentle, focus_minutes(25|45|90)=45,
            quiet_hours{start:"22:00",end:"08:00"}, channels{whatsapp,email,call}=all true,
            notif_sound=true, notif_vibration=true
Consent     user_id, kind(terms_privacy|marketing), version, granted:boolean, at, source(signin|settings)
OneThing    user_id, date(YYYY-MM-DD), title, done:boolean, focus_minutes
Task        id, user_id, type(call|email|whatsapp|reminder|visit|meeting|webinar|course),
            title, contact_ids[], due_at(datetime), remind(at|10|60|custom|null), remind_at?,
            status(open|done|snoozed|cancelled), snoozed_until?, notes?, goal?, points[], draft?{subject?,body},
            link?, location?, platform?, duration_min?, host?, lesson?, study_days[0-6]?, progress?{done,total},
            created_via(quick|capture|dump|assistant|event_form|followup), sent_confirmed_at?
Contact     id, user_id, name, role_company?, dial?, phone?, email?, preferred_channel, remember_note?, created_at
History     id, user_id, contact_id, kind(note|call|meeting|visit|email|whatsapp|followup_closed), text, at
FollowUp    id, user_id, contact_id, task_id?, channel, what, status(due|waiting|done), next_at, last_action, last_action_at
FocusSession user_id, started_at, planned_min, ended_at, completed:boolean
Review      user_id, date, one_thing_done, items[{task_id, decision(kept|tomorrow|drop)}], closed_at
Subscription user_id, store(app_store|play), product_id, period(monthly|yearly), status(trial|active|grace|cancelled|refunded|expired),
            started_at, renews_at|ends_at, original_transaction_id
Tip         user_id, store, product_id(tip_small|tip_regular|tip_large), at
SupportTicket id, user_id?, source(app|app_store|play), rating?, thread[{from,text,at}], status(open|done)
PrivacyRequest id, user_id, type(delete|export), source(app|web), requested_at, completed_at?
AdminAuditLog id, admin_id, action, target_user_id?, reason, at        (append-only)
```

## Key rules
- **Task status:** `open → done` (check / swipe / compose confirm) · `open → snoozed` (notification snooze; returns to open at `snoozed_until`) · `open → cancelled` (review "Not needed"). Derived **Overdue** = open && due_at < now.
- **Compose confirm:** messaging tasks become `done` only after "Did you send it?" → yes. "Not sent yet" leaves `open`.
- **Follow-up:** created when the user picks Tomorrow / In 2 days / Next week after sending. `waiting` until `next_at`, then `due`. Nudge creates a new messaging Task with a draft; never auto-sends.
- **Review:** decisions apply only on user tap; "tomorrow" moves `due_at` to next day same time.
- **Remind all:** only sets `remind='at'` where `remind` is null; undoable.
- **Duplicate contact:** same normalised name, or same phone digits (≥7), or same lowercase email.
- **Delete account:** hard delete all user rows within 30 days; keep only AdminAuditLog with user id; cancel nothing in stores (inform user).

## Integrations
| Need | iOS | Android |
|---|---|---|
| Sign in | Sign in with Apple (required, shown first) | Google Identity / Credential Manager |
| Also offer | Google Sign-In | Sign in with Apple (optional) |
| Subscriptions | StoreKit 2: `pro_monthly` $4.99, `pro_yearly` $35.88 with 7-day intro trial | Play Billing: base plans monthly/yearly + 7-day free trial offer |
| Tips | Consumables `tip_small` 0.99, `tip_regular` 2.99, `tip_large` 4.99 | Same as one-time products |
| Restore | `AppStore.sync()` | `queryPurchasesAsync` |
| Manage subscription | `showManageSubscriptions` | Play subscriptions deep link |
| Server truth | App Store Server Notifications v2 | Real-time developer notifications |
| Notifications | UNUserNotificationCenter (local scheduling + actions) | POST_NOTIFICATIONS (13+), exact alarms for on-time reminders |
| Mic / speech | NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription | RECORD_AUDIO |
| WhatsApp | `https://wa.me/<digits>?text=` | same |
| Mail / Phone | `mailto:` / `tel:` | same |
| Maps | `maps://?q=` / Google Maps URL | geo: / Google Maps URL |

**Permission prompts:** ask for notifications after the user sets their first One Thing (not on launch); mic on first capture. Show a one-line pre-prompt explaining why.

## AI / parsing
Capture, Brain dump and Assistant parse free text into `{type, what, who, when}`. Always show the parsed result for confirmation before saving. Free plan: 10 assistant requests/day; Pro: unlimited.

## Analytics events (pseudonymised)
`signin, setup_done, one_thing_set, task_created{type,via}, task_done, compose_opened{channel}, send_confirmed, followup_created, nudge_opened, focus_started{min}, focus_completed, review_closed, paywall_viewed, trial_started{period}, purchase{product}, tip{product}, account_deleted`. Phone/email SHA-256 hashed; never send message text.
