# What the Assistant understands without asking a server

Every phrase below is answered **on the phone**, from data the app already
holds. None of them spends one of the Free plan's 10 daily Assistant
requests, none of them sends your words anywhere, and all of them work with
no signal.

Written for the store listing and the in-app help text. Each line is covered
by a test in `src/lib/parse/ask-data.test.ts`, `attach.test.ts` or
`scripts/smoke-capture.js`, so this list cannot quietly stop being true.

## Questions about a person

| English | Arabic |
| --- | --- |
| What's Sara's number? | رقم سارة؟ |
| What is Omar's email? | ايميل عمر؟ |
| Where does Omar work? | وين يشتغل عمر؟ |
| Who is Omar? | مين عمر؟ |
| Sara? | سارة؟ |

Answers with the detail, then buttons to call, WhatsApp, email or open their
profile. If the name fits more than one person it offers the choice; if the
name is not in People it says so instead of guessing.

## What was said to someone

| English | Arabic |
| --- | --- |
| When did I last talk to Layla? | امتى اخر مرة كلمت ليلى؟ |
| What did I send Omar? | ايش ارسلت لعمر؟ |

## The day and the list

| English | Arabic |
| --- | --- |
| What do I have today? | ايه عندي اليوم؟ |
| What do I have tomorrow? | وش عندي بكرة؟ |
| What do I have this week? | وش عندي هذا الأسبوع؟ |
| What's late? | ايش متأخر؟ |
| Arrange my day | رتب يومي |

Each answer is a short list of real tasks, soonest first. Tap one to open it.
Done and undated tasks are left out.

## Who is waiting

| English | Arabic |
| --- | --- |
| Who's waiting for my reply? | مين مستني ردي؟ |
| Who owes me a reply? | مين ما رد؟ |
| Who am I waiting on? | وش المتابعات؟ |

Each row keeps the **Replied** button, so a follow-up can be closed from the
chat.

## Who has gone quiet

| English | Arabic |
| --- | --- |
| Who haven't I talked to in a while? | مين ما كلمته من زمان؟ |
| Who's gone quiet? | مين مقطوع؟ |

Uses each person's own keep-in-touch rhythm, and two weeks for a favourite
who has none — the same rule the Next queue uses, so the two never disagree.

## Counts, labels and favourites

| English | Arabic |
| --- | --- |
| How many clients do I have? | كم عميل عندي؟ |
| Who's tagged Lead? | مين مصنّف محتمل؟ |
| How many contacts do I have? | كم شخص عندي؟ |
| Show my favourites | ورني المفضلة |

Arabic asks for the three labels the app suggests — Client, Lead, Supplier —
by their Arabic names. A label you invented is matched by its own spelling,
in whichever script you typed it.

## Cards and files

| English | Arabic |
| --- | --- |
| Scan a card | صور كرت |
| Card from photos | كرت من الصور |
| Import my excel | استورد ملف |
| Add contacts from a file | ضيف الناس من اكسل |

The same three choices as the paperclip beside the microphone. A card is read
by the phone's own text reader; a file can be Excel (every sheet), CSV, PDF
or vCard. **Nothing is uploaded** — the file is read on the phone, reported
in the chat as counts, and nothing is saved until you say so.

## Anything else

A question the app cannot answer from your data is answered as a question,
not saved as a task about the question. It says what it is good at and offers
three examples to tap.

Statements still behave exactly as before: "Call Sara tomorrow at 4" is a
task, "I told Omar I'd send the contract Thursday" is a promise, and "Waiting
for Sara to reply" is a follow-up.
