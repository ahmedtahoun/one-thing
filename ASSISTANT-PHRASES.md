# What the Assistant understands without asking a server

Every phrase below is answered **on the phone**, from data the app already
holds. None of them spends one of the Free plan's 10 daily Assistant
requests, none of them sends your words anywhere, and all of them work with
no signal.

Written for the store listing and the in-app help text. Each line is covered
by a test in `src/lib/parse/ask-data.test.ts`, `clarify.test.ts`,
`attach.test.ts` or `scripts/smoke-capture.js`, so this list cannot quietly
stop being true.

Last read against the parser on 20 October 2026.

The tables below are the phrases worth showing somebody. The **complete** list
is `src/lib/parse/phrasings.test.ts`: 145 ways of asking across the three
languages, each asserted against the answer it should get, beside 22 ordinary
errands asserted to stay errands. Both halves pass together, because a
question gained at the price of an errand is not a gain.

## Questions about a person

| English | Arabic |
| --- | --- |
| What's Sara's number? | رقم سارة؟ |
| What is Omar's email? | ايميل عمر؟ |
| Where does Omar work? | وين يشتغل عمر؟ |
| Who is Omar? | مين عمر؟ |
| Sara? | سارة؟ |

Answers with the detail, then buttons to call, WhatsApp, email or open their
profile.

**If the name fits more than one person it asks which**, and choosing one
answers *the question that was asked* — pick a Sara after "what's Sara's
number?" and you get the number, not her profile with the question lost
(§2.93). **If the name is not in People** it says so rather than guessing,
and offers **Search People**.

A question that names somebody is always about them, even mid-thread: with
Sara remembered from the question before, "what's Jane's number?" is about
Jane. The thread's memory fills a gap only when the question names nobody
at all.

## What was said to someone

| English | Arabic |
| --- | --- |
| When did I last talk to Layla? | امتى اخر مرة كلمت ليلى؟ |
| What did I send Omar? | ايش ارسلت لعمر؟ |

## What is still open with one person

| English | Arabic |
| --- | --- |
| Anything pending with Sara? | ايش باقي مع سارة؟ |
| What do I have with Omar? | وش عندي مع عمر؟ |
| Do I owe Layla anything? | لسه عليّ حاجة لليلى؟ |
| Did Sara reply? | ردت سارة؟ |
| Has Omar got back to me? | جاوب عمر؟ |
| Is Sara waiting on me? | سارة مستنية ردي؟ |

One card with both halves of what is outstanding with that person: their
open tasks, soonest first, and every reply they still owe — with **Replied**
on each, so a follow-up closes from the chat.

**An undated task is kept here**, unlike a question about a day. "Send Sara
the contract, no date yet" is precisely what is being asked after; a day can
only hold things with a day on them, but a person holds everything.

**A name makes it about them; "who" makes it the list.** "Is Sara waiting on
me?" is Sara. "Who's waiting?" is everybody. Both are asked with the word
*waiting*, and that is the only thing telling them apart.

The thread remembers the person, so **"did he reply?"** straight after is
still about them.

## A task by its own name

| English | Arabic |
| --- | --- |
| When is the dentist? | امتى الدكتور؟ |
| What time is the bank meeting? | الاجتماع مع البنك امتى؟ |
| When is the VAT filing? | امتى اقرار الضريبة؟ |

People remember the thing, not the date, and the date is what the app is
holding. This is tried **last of all** — only where the answer would
otherwise be *"I'm best with your people and your follow-ups"* — so it can
turn a refusal into an answer but can never take a question away from one of
the answers above.

The match is on the question's own words, with everything that merely opens a
question thrown away first. So "what is that about then?" finds nothing and
says so, rather than matching every task with *is* in it: a search that
always succeeds answers nothing.

## The day and the list

| English | Arabic |
| --- | --- |
| What do I have today? | ايه عندي اليوم؟ |
| What do I have tomorrow? | وش عندي بكرة؟ |
| What do I have this week? | وش عندي هذا الأسبوع؟ |
| What tasks do I have? | وش مهامي؟ |
| My tasks | مهامي |
| What's on? | وش علي؟ |
| Anything due? | قائمة مهامي |
| What's late? | ايش متأخر؟ |
| What should I have done? | وش فاتني؟ |
| Did I miss anything? | فاتني شي؟ |
| Arrange my day | رتب يومي |

Each answer is a short list of real tasks, soonest first. Tap one to open it.
Done and undated tasks are left out.

The list can be asked for **without the word "today" in it** — "my tasks",
"what's on", "anything left" — and the late list answers the reproach forms
as well as the status ones: "what should I have done", "was I supposed to",
"did I miss anything", "كان لازم". Both were added after a phone showed
"What tasks should I have done" being met with *"I'm best with your people
and your follow-ups"* — the app saying it could not read its own list
(BUILD-REVIEW §2.91).

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

## Egyptian Arabic

Egypt is a language choice in Settings (**مصري**), and the Assistant reads it
as well as speaking it. Every scenario in this document was run through the
parser in Egyptian — all of them are understood, and
`src/lib/parse/egyptian-input.test.ts` keeps it that way.

What differs is not vocabulary alone, so these are worth knowing:

| Egyptian | What it means | The Gulf form it joins |
| --- | --- | --- |
| عندي ايه النهارده؟ | What do I have today? | وش عندي اليوم؟ |
| عملت ايه النهارده؟ | What did I do today? | وش سويت اليوم؟ |
| مين كلمت امبارح؟ | Who did I talk to yesterday? | مين كلمت أمس؟ |
| بعتت ايه لعمر؟ | What did I send Omar? | ايش أرسلت لعمر؟ |
| عندي كام شخص؟ | How many contacts? | كم شخص عندي؟ |
| مين المفروض اكلمه؟ | Who should I call? | مين ما كلمته من زمان؟ |
| مين مردش؟ | Who hasn't replied? | مين ما رد؟ |
| فاضل ايه مع عمر؟ | What's left with Omar? | وش الباقي مع عمر؟ |
| ايه اللي بعده؟ | What's next? | وش التالي؟ |
| اعمل ايه دلوقتي؟ | What should I do now? | وش أسوي الحين؟ |

Four things about Egyptian broke patterns written for Gulf Arabic, and each
was a different kind of fault:

**The question word goes in the middle.** Gulf writes "بعتت لعمر"; Egypt
writes "بعتت **ايه** لعمر". The old pattern needed the verb and the ل to
touch.

**Negation wraps the verb** — م…ش. "مردش", "مكلمتوش", "مش عايز". Patterns
built around ما and مو never saw them.

**Counting uses كام, and a singular follows it.** "عندي كام شخص؟" — كم was
in the pattern, كام was not, and only the plurals were listed.

**امبارح was answered with the wrong day.** This was the one that mattered:
`مبارح` *was* in the pattern, but the "not inside a longer word" rule sees
the leading ا of امبارح, so the match failed and the question fell through to
today's log. A confident wrong answer, where every other gap here was merely
a missing one.

**The chips are read back, too.** Each chip types its own sentence into the
chat, and in Egyptian that sentence is the Egyptian copy — so the parser has
to understand the app's own words. A test asserts that for every chip, in
both dialects, because a chip that answers nothing is worse than no chip.

## Several errands in one breath

Hold the mic and say everything. A spoken run comes apart into separate
errands, each read on its own, and the chat shows them as a list to look over
before anything is saved.

> call Sara tomorrow at four about the contract **and then** send Omar the
> invoice **also** I need to book the dentist for Tuesday morning **remind me
> to** pay the packaging supplier on Thursday **and I promised** Layla I would
> send the deck by Friday

→ five rows, each with its own person and its own time. Tap any row to drop
it; one button saves what is left. **Nothing is saved until you press it** —
a dictated errand is the likeliest of all of them to have been misheard, and
five wrong tasks are worse than none.

| Joins it breaks on | |
| --- | --- |
| English | and then · and also · also · after that · plus · and finally · one more thing · remind me to · don't forget · make sure · I need to · I have to · and I promised · and I told · **and** + call/email/send/book/pay/ask/meet… |
| Arabic & Egyptian | وبعدين · بعدين · وبعد كده · بعد كده · وكمان · كمان · وأيضا · **و** + كلم/أكلم/ابعت/ارسل/احجز/ادفع/اسأل/اتبع/راجع/فكرني/لازم/محتاج · **و** + a name with a time after it |

**"and" on its own is never a join.** "Call Sara and Omar about the price" is
one errand; so is "اتصل بسارة وعمر". A splitter that divided there would turn
one errand into two wrong ones, which is worse than the fault it fixes.

**Typed text needs a full stop.** A typed comma is not a list — "Call Sara
tomorrow, the contract one" is one errand — so typing is split on a full stop,
semicolon or new line, while the mic is taken at its word. The Brain dump
screen is still the place to paste a long comma-separated list.

### What a run says once, for all of it

In one unbroken sentence — nothing typed between the errands — two things
said once are meant for the whole list:

| Said | Read as |
| --- | --- |
| بكرة اكلم محمد ٥ **و**أكلم أحمد ٧ | both tomorrow, not Ahmed today |
| أكلم محمد ٥ **و**إبراهيم ٦ **و**أحمد ٧ | three **calls**, at 5, 6 and 7 in the evening |

A bare name after **و** borrows the verb the run opened with, and a name with
a clock after it starts a new errand — but a name with **no** time never
does: "اتصل بسارة وعمر بخصوص السعر" is one errand about two people.

**A punctuated list is not a run.** Commas and full stops mean separate
items, each standing on its own, so "Call the lawyer about the contract
tomorrow at 11, email Sara the deck, pay the supplier invoice by 5" leaves
the invoice undated — tomorrow belongs to the lawyer.

### The clock, said out loud

A recogniser writes what it hears, so a dictated time arrives as words.

| Said | Read as |
| --- | --- |
| at four | 16:00 — before seven is the afternoon |
| at four thirty · at half past four | 16:30 |
| at quarter past six | 18:15 |
| at quarter to seven | 18:45 |
| at nine am | 09:00 |
| at noon · at eight in the evening | 12:00 · 20:00 |
| الساعة اربعة · الساعة تسعة الصبح | 16:00 · 09:00 (these always worked) |

A number that is not a time is left alone: "buy four boxes of cups" keeps its
four.

## Answering the Assistant when it asks

Saving a task sometimes needs one more thing — usually *when*. These are the
answers it takes beyond a plain date or time.

| English | Arabic |
| --- | --- |
| Now · right now · asap | الحين · حالًا · الآن · **دلوقتي** |
| No · not now · never mind | لا · مو الحين · ما أبغى · **مش عايز** · **مش دلوقتي** |
| Later · whenever · any time | بعدين · لاحقًا · أي وقت |

**Now** is also a chip on the question, because it is the one time nobody
can type as one; it sets a minute ahead so the card does not reopen what it
just closed. **Turning the question down is an answer**, not a failure to
read one: the app lets the task go and says what it needs instead of
replying "I couldn't read that" (§2.91).

**A question asked while a question is open gets answered.** Typing "what
tasks do I have today?" into *"When should I set this for?"* used to make
that sentence the time, because it has "today" in it, and neither question
got an answer. Now a question the app **can** answer is answered and the
open one is let go. A question it cannot answer is not worth abandoning a
half-written task for, so that still asks again.

## The chips under the chat

The chips are drawn from your own data, not from a fixed list: what's late,
who's waiting, your One Thing, what's next, your day, scan a card. Nothing
is offered that would answer "nobody", and the one you tap most comes back
first — counted on the device, with no profile and nothing sent anywhere
(§2.92). Each chip still types its full sentence into the chat, so tapping
one teaches what could have been typed.

## More ways to ask the same things

Added after writing out how people actually ask and finding seventeen
sentences the parser could not read. Each is in the corpus test.

| Scenario | Also understood now |
| --- | --- |
| The day | get me…, send me…, what about…, pull up… |
| What's next | what now?, what's up next?, where do I start? · بعد كده · ابدأ بايه |
| The One Thing | my focus today?, biggest thing?, what matters most? · اهم حاجة · اهم شي |
| Who's waiting | who is pending?, still waiting on?, yet to reply? |
| Who's gone quiet | who should I reconnect with?, who needs a catch up?, cold contacts?, who's fallen off? |
| The day's log | what did I get done?, what got done? |
| What was said | have I contacted Layla? · اخر تواصل · اخر اتصال · اخر رسالة |
| What's late | اتأخر · متأخرين · فات موعده |
| With one person | where are we with Sara?, what's the status with Omar?, how are we doing with…? · ايه اخبار سارة؟ · وصلنا لفين مع سارة؟ |
| A person's details | عايز رقم سارة · محتاج ايميل عمر · هاتلي نمرة سارة |

**Three words had to be narrowed rather than added**, and the reason is worth
knowing because it is the whole difficulty of this:

**عايز، محتاج، ابغى** open a request *and* an errand. "عايز رقم سارة" is a
question; "عايز اكلم سارة بكرة" is a task. Adding them as whole words bought
two questions and cost five errands. What separates the two is whether a noun
or a verb follows, so the **nouns are named** — رقم، ايميل، موبايل، نمرة،
عنوان، العملاء، المفضلة — rather than the verbs guessed at.

**show** had the same fault in English, from long before this: "show the deck
to Omar" was read as a question. It is now **show me** / **show my**, which
both documented phrases already said.

**هات** and **find** likewise: "هات رقم سارة" is a request and "هات العقد من
عمر بكرة" is an errand; "find Sara's number" is a question and "find a new
supplier" is a task. Both now sit behind the same noun list.

## Owed a reply, counted, or asked as an obligation

A second round of the same exercise, after Sanad got a name. Each is in the
corpus test, and each sits beside an errand it must not swallow.

| Scenario | Also understood now |
| --- | --- |
| Who's waiting | who do I owe a reply?, who am I supposed to get back to?, who needs a reply? · مين لازم أرد عليه · مين المفروض أرد عليه · مين مستني رد مني |
| The day's list | how many tasks do I have?, what's expected of me?, what's required of me?, what's left? · كم مهمة عندي · كام مهمة فاضلة · المطلوب مني · قائمتي |

**The interrogative is what is matched, never the verb.** "لازم أرد على سارة
بكرة" is an errand and "مين لازم أرد عليه؟" is the waiting list, and the only
difference between them is **مين**. The same holds in English: "reply to Sara
tomorrow" is an errand, "who do I owe a reply?" is the list. Widening on
لازم or *reply* alone is the mistake §2.109 paid for with five errands, so
the patterns ask for the question word and not the verb.

**مهمة, never حاجة.** "كام مهمة عندي؟" counts tasks; "عايز أعمل كام حاجة
النهارده" is still a list of errands, for the reason in the next section.

**"What's left" only at the start of a sentence.** "Send what is left to
Omar" is an errand.

## What is not a question, though it looks like one

**كم** and **كام** before حاجة are a quantifier, not a count. "عايز أعمل كم
حاجة بكرة…" is *"I want to do a few things tomorrow"* and opens a list of
errands; it used to be read as *"how many things tomorrow?"* and answered
**مفيش حاجة بكرة** — four errands lost in one reply, with nothing said about
why. "كم عميل عندي؟" and "عندي كام شخص؟" still count.

A sentence also stops being a question once it opens with the usual
throat-clearing — **و الله · والله · طيب · يلا · خلاص · تمام · أنا** — which
is dropped rather than kept as the title. "و الله عايز أكلم محمد بكرة 5:00"
is a call to Mohammed, not a task named after the whole sentence.

## Anything else

A question the app cannot answer from your data is answered as a question,
not saved as a task about the question. It says what it is good at and offers
three examples to tap.

Statements still behave exactly as before: "Call Sara tomorrow at 4" is a
task, "I told Omar I'd send the contract Thursday" is a promise, and "Waiting
for Sara to reply" is a follow-up.
