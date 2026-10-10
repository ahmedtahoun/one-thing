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
const SEED_TASKS = JSON.parse(source.match(/export const SEED_TASKS = ([\s\S]*?);\nexport/)[1]);

const REMIND = { at: 'at', 10: 'min_10', 30: 'min_30', 60: 'hour_1', morning: 'morning' };

function dueAtFor(time, base) {
  const later = time.startsWith('z');
  const raw = later ? time.slice(1) : time;
  const m = later ? /^(\d{4}-\d{2}-\d{2})(\d{2}):(\d{2})$/.exec(raw) : /^(\d{2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const d = new Date(base);
  if (later) {
    const [y, mo, day] = m[1].split('-').map(Number);
    d.setFullYear(y, mo - 1, day);
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

module.exports = { demoTasks, dateKey };
