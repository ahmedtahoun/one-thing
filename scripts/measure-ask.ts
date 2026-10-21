/**
 * What a question costs the phone, and what makes it cost more.
 *
 * The owner asked whether adding scenarios to the Assistant would slow the
 * app down. The answer is not one number, because two different things grow:
 *
 *   A pattern is free.    Every rule in `ask-data.ts` is a RegExp built once
 *                         when the module loads, tested against a sentence
 *                         somebody just typed. Thirty more of them is thirty
 *                         more tests on thirty characters.
 *   A scan is not.        An answer that walks the account — the tasks, the
 *                         contacts, the follow-ups — is paid for by whoever
 *                         has the most of them, on every question.
 *
 * So this measures both, against account sizes from the demo day up to a
 * size no real account is near, and prints the breakdown rather than a
 * single figure. Run it before and after adding an answer that reads data:
 *
 *   npm run measure:ask
 *
 * It is a measurement, not a gate: machines differ and nothing here fails a
 * build. What matters is the shape — flat against data, or rising with it.
 */
import { askData, findTasks, openWith, quietIn } from '../src/lib/parse/ask-data';
import { readWho } from '../src/lib/parse/clarify';
import type { Contact, FollowUp, Task } from '../src/lib/model-types';
import type { DataWorld } from '../src/lib/parse/ask-data';

const person = (i: number): Contact => ({
  id: `c${i}`,
  name: `Person ${i} Family${i}`,
  dial: '+20',
  phone: `10012${i}`,
  email: `p${i}@example.com`,
  createdAt: '2026-09-01T09:00:00.000Z',
});

const task = (i: number): Task => ({
  id: `t${i}`,
  type: 'call',
  title: `Task number ${i} about the thing`,
  who: `Person ${i % 50} Family${i % 50}`,
  contactIds: [],
  dueAt: new Date(Date.UTC(2026, 9, 15 + (i % 20), 9)).toISOString(),
  remind: null,
  status: 'open',
  points: [],
  createdVia: 'quick',
  createdAt: '2026-10-01T09:00:00.000Z',
  notes: `Some notes for task ${i}`,
});

const followUp = (i: number): FollowUp => ({
  id: `f${i}`,
  channel: 'whatsapp',
  who: `Person ${i} Family${i}`,
  what: 'The quote',
  status: 'waiting',
  since: '',
  contactId: `c${i}`,
  createdAt: '2026-10-10T09:00:00.000Z',
});

const build = (people: number, tasks: number): DataWorld => ({
  contacts: Array.from({ length: people }, (_, i) => person(i)),
  tasks: Array.from({ length: tasks }, (_, i) => task(i)),
  followUps: Array.from({ length: Math.min(people, 60) }, (_, i) => followUp(i)),
  history: [],
  favorites: new Set(),
  cadence: new Map(),
  oneThing: { date: '2026-10-15', title: 'Finish the proposal', done: false, focusMinutes: 45 },
  now: new Date('2026-10-15T10:00:00.000Z'),
});

/** One of each shape, in both languages, including one it cannot answer. */
const QUESTIONS = [
  "what's late?",
  'what do I have today?',
  "who's waiting for my reply?",
  'anything pending with Person 3?',
  'when is the thing about task number 77',
  'عندي ايه النهارده؟',
  'مين مردش؟',
  'how are you today my friend',
];

const micros = (rounds: number, fn: () => unknown): number => {
  for (let i = 0; i < 20; i++) fn();
  const started = process.hrtime.bigint();
  for (let i = 0; i < rounds; i++) fn();
  return Number(process.hrtime.bigint() - started) / rounds / 1000;
};

const SIZES: readonly (readonly [string, number, number])[] = [
  ['the demo day', 8, 18],
  ['a working account', 200, 200],
  ['far past any real one', 2000, 2000],
];

console.log('One question, start to finish — µs per question, averaged over the set\n');
for (const [label, people, tasks] of SIZES) {
  const world = build(people, tasks);
  const each = micros(500, () => {
    for (const q of QUESTIONS) askData(q, world);
  }) / QUESTIONS.length;
  console.log(`  ${label.padEnd(24)} ${String(people).padStart(4)} people, ${String(tasks).padStart(4)} tasks   ${each.toFixed(1)} µs`);
}

console.log('\nWhere it goes, at the largest size — the parts that read the account\n');
const big = build(2000, 2000);
const parts: readonly (readonly [string, () => unknown])[] = [
  ['readWho (every question)', () => readWho('anything pending with Person 3?', big.contacts as Contact[])],
  ['findTasks (a task by its words)', () => findTasks('when is the thing about task number 77', big)],
  ['openWith (one person’s open items)', () => openWith(big.contacts[0]!, big)],
  ['quietIn (who has gone quiet)', () => quietIn(big)],
];
for (const [label, fn] of parts) console.log(`  ${label.padEnd(36)} ${micros(200, fn).toFixed(1)} µs`);

console.log('\nA question answered without reading the account at all\n');
console.log(`  "hello there friend" (no lookup)     ${micros(2000, () => askData('hello there friend', big)).toFixed(1)} µs`);
