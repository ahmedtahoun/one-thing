/**
 * Builds the localStorage blobs the capture script seeds, so Today renders
 * with a real day's worth of tasks instead of an empty list.
 *
 * Mirrors src/content/demo.ts, but runs in Node against the generated seed, so
 * the capture does not need a bundler.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '..', 'src', 'content', 'seed.ts');
const source = fs.readFileSync(SEED_FILE, 'utf8');
const seedArray = (name) => JSON.parse(source.match(new RegExp(`export const ${name} = ([\\s\\S]*?);\\nexport`))[1]);
const SEED_TASKS = seedArray('SEED_TASKS');
const SEED_CONTACTS = seedArray('SEED_CONTACTS');
const SEED_FOLLOWUPS = seedArray('SEED_FOLLOWUPS');

const REMIND = { at: 'at', 10: 'min_10', 30: 'min_30', 60: 'hour_1', morning: 'morning' };

/** The day the prototype's demo data is written against. See src/content/demo.ts. */
const PROTOTYPE_BASE = Date.UTC(2026, 9, 9);

function dueAtFor(time, base) {
  const later = time.startsWith('z');
  const raw = later ? time.slice(1) : time;
  const m = later ? /^(\d{4}-\d{2}-\d{2})(\d{2}):(\d{2})$/.exec(raw) : /^(\d{2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const d = new Date(base);
  if (later) {
    const [y, mo, day] = m[1].split('-').map(Number);
    d.setDate(d.getDate() + (Date.UTC(y, mo - 1, day) - PROTOTYPE_BASE) / 86400000);
    d.setHours(+m[2], +m[3], 0, 0);
  } else {
    d.setHours(+m[1], +m[2], 0, 0);
  }
  return d.toISOString();
}

function demoTasks(lang, base) {
  return SEED_TASKS.map((seed) => {
    const dueAt = dueAtFor(seed.time, base);
    if (dueAt === null) return null;
    const copy = seed[lang];
    const draft = seed.draft?.[lang] ?? '';
    const subject = seed.subject?.[lang];
    return {
      id: seed.id,
      type: seed.type,
      title: copy.title,
      who: copy.who,
      contactIds: [],
      dueAt,
      remind: seed.remind ? REMIND[seed.remind] ?? null : null,
      status: seed.done ? 'done' : 'open',
      goal: seed.goal?.[lang],
      points: seed.points?.[lang] ?? [],
      draft: draft || subject ? { body: draft, ...(subject ? { subject } : null) } : undefined,
      createdVia: 'quick',
      createdAt: base.toISOString(),
    };
  }).filter(Boolean);
}

/** Local YYYY-MM-DD, matching dateKey() in src/lib/model-types.ts. */
function dateKey(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Mirrors demoContacts() in src/content/demo.ts. */
function demoContacts(lang, base = new Date()) {
  return SEED_CONTACTS.map((seed, i) => ({
    id: `c${i + 1}`,
    name: seed[lang],
    role: seed.role[lang] || undefined,
    dial: seed.dial || undefined,
    phone: seed.phone || undefined,
    email: seed.email || undefined,
    lastLabel: seed.last[lang],
    createdAt: base.toISOString(),
  }));
}

/** Mirrors demoFollowUps() in src/content/demo.ts. */
function demoFollowUps(lang) {
  const contacts = demoContacts(lang);
  return SEED_FOLLOWUPS.map((seed) => {
    const copy = seed[lang];
    const first = copy.who.split(' ·')[0].split(' ')[0];
    const contact = contacts.find((c) => c.name.startsWith(first));
    return {
      id: seed.id,
      contactId: contact ? contact.id : null,
      channel: seed.ch,
      who: copy.who,
      what: copy.what,
      status: seed.status,
      since: copy.since,
      nextAt: null,
    };
  });
}

module.exports = { demoTasks, demoContacts, demoFollowUps, dateKey };
