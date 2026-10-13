# Store listing — copy to paste into App Store Connect and Play Console

Version 1.0.0 · iOS build 5 · Android versionCode 5 · Bundle / package `app.onlyonething`.
Text only; the screenshots are in `store-assets/` (see "Screenshots" at the end).

## Names and one-liners

| | English | Arabic |
| --- | --- | --- |
| App name (≤30) | The One Thing | الشيء الواحد |
| Apple subtitle (≤30) | One task. Done today. | مهمة واحدة. تنجزها اليوم. |
| Play short description (≤80) | Name your one thing each day. Talk to add tasks, in English or Arabic. | حدّد شيئك الواحد كل يوم. تكلّم لتضيف مهامك بالعربي أو الإنجليزي. |
| Category | Productivity | الإنتاجية |
| Keywords (Apple, ≤100) | to-do,tasks,reminders,focus,founder,adhd,voice,arabic,habit,planner | مهام,تذكير,تركيز,عربي,صوت,عادات |

## Long description — English

Most to-do apps ask you to manage a list. The One Thing asks one question each
morning: what is the one thing that would make today a good day?

• Name your One Thing and lock in for a focused session. Too big? Shrink it into a first small step.
• Add tasks by talking. Say "Call Sara tomorrow at 10" or "Save a contact, name is Omar, phone…" and it understands English, Gulf and Egyptian Arabic. It asks only what it needs, like which Sara you mean.
• Reminders that actually arrive: on time, a morning nudge for your one thing, and a gentle call back if you have been away.
• A streak that encourages instead of shaming. One finished task keeps it alive.
• Call, WhatsApp and email people in two taps. Nothing is ever sent for you; you press send.
• Follow-ups remind you who still owes you a reply.
• Built for founders and busy people who start strong and lose the thread.

Works in English and Arabic, right to left. Your tasks stay on your phone unless you sign in to sync.

## Long description — Arabic

أغلب تطبيقات المهام تطلب منك إدارة قائمة. «الشيء الواحد» يسأل سؤالًا واحدًا كل صباح: وش الشيء الواحد اللي لو خلّصته اليوم، يومك ناجح؟

• سمِّ شيئك الواحد وابدأ جلسة تركيز. إذا كان كبير، صغّره لخطوة أولى بسيطة.
• أضف مهامك بصوتك. قل «كلم سارة بكرة الساعة عشرة» أو «احفظ جهة اتصال، اسمه عمر، رقمه…» ويفهم العربي (الخليجي والمصري) والإنجليزي، ويسألك فقط عن الناقص، مثل أي سارة تقصد.
• تذكيرات توصل فعلًا: في وقتها، وتنبيه صباحي لشيئك الواحد، وتنبيه لطيف إذا غبت.
• سلسلة أيام تشجّعك ولا تحاسبك. مهمة واحدة تكفي.
• اتصل أو راسل واتساب أو إيميل بضغطتين. ما يُرسل شيء عنك؛ أنت اللي تضغط إرسال.
• المتابعات تذكّرك مين ينتظر ردك.
• مصمّم لرواد الأعمال والمشغولين اللي يبدأون بقوة ويضيع منهم الخيط.

بالعربي والإنجليزي، ومن اليمين لليسار. مهامك تبقى على جوالك إلا إذا سجّلت دخولك للمزامنة.

## What's new (1.0.0)

First release.

## Age rating

No violence, no mature content, no gambling, no user-generated content shared
between users, no web browsing. Expected: Apple 4+, Play "Everyone".

## Privacy answers (Apple "App Privacy" and Play "Data safety")

Collected, linked to the account, not used for tracking:
- Contact info: name, email (account); phone number and email of contacts the person chooses to save.
- User content: tasks, reminders and notes the person writes.
- Identifiers: account ID.
- Usage data: product-analytics events listed in `DATA_MODEL.md`; no advertising SDKs.
- Purchases: subscription status.

Not collected: location, photos, health, browsing history, financial info, advertising ID.
Microphone and speech recognition: used on the device's own recogniser only while recording a note; audio is not stored by the app.
Contacts: only a contact the person picks is read; the address book is never read on its own.
Deletion: in Settings, and at `onlyonething.app/delete`.
The app does not use Photos. `NSPhotoLibraryUsageDescription` exists only because a linked framework references it.

## Review notes (Apple "App Review Information" / Play "App access")

The app opens to a sign-in screen (Sign in with Apple, Google). Demo account:
**<fill in: email + password of a seeded reviewer account>**.
Nothing is sent automatically: Compose hands a draft to WhatsApp, Mail or the
dialler and the user presses send. The microphone is used only when the person
taps the mic to dictate a task or contact. Notifications are local reminders.

## URLs both stores require

- Privacy policy: `https://onlyonething.app/privacy` (**must resolve before submitting**)
- Terms: `https://onlyonething.app/terms`
- Support URL: `https://onlyonething.app/support`, contact `privacy@onlyonething.app` (**mailbox must exist**)
- Account deletion page (Play requires a web path): `https://onlyonething.app/delete`

## Screenshots

`store-assets/` has six per language for Apple (1320×2868) and Play (1080×2160),
plus Play's 1024×500 feature graphic and 512×512 icon. They were captured before
build 4–5: Today and the chat have since changed (compact Today, quick actions on
top, contact card). Re-capture before submitting if the store should show them.
