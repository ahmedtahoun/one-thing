/**
 * The analytics taxonomy — DATA_MODEL.md § Analytics events (pseudonymised).
 * Run with `npm test`.
 *
 * Two of these tests are guards rather than unit tests: one reads the source
 * to check every event in the taxonomy is actually emitted somewhere, and one
 * pins the whole set of property names so "never send message text" cannot be
 * broken by adding a field. Both exist because a missing or over-sharing
 * event is invisible until someone reads a dashboard months later.
 *
 * The queue itself is tested in src/lib/outbox.test.ts, where its storage can
 * be injected.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  EVENT_NAMES,
  SERVER_ONLY_EVENTS,
  queuedEvent,
  type AnalyticsEvent,
  type EventName,
} from './events';

/** One of every event the app can send, for the two guards below. */
const SAMPLES: AnalyticsEvent[] = [
  { name: 'signin' },
  { name: 'setup_done' },
  { name: 'one_thing_set' },
  { name: 'task_created', type: 'call', via: 'quick' },
  { name: 'task_done' },
  { name: 'compose_opened', channel: 'whatsapp' },
  { name: 'send_confirmed' },
  { name: 'followup_created' },
  { name: 'nudge_opened' },
  { name: 'focus_started', min: 45 },
  { name: 'focus_completed' },
  { name: 'review_closed' },
  { name: 'paywall_viewed' },
  { name: 'trial_started', period: 'year' },
  { name: 'purchase', product: 'pro_yearly' },
  { name: 'tip', product: 'tip_regular' },
];

describe('the event taxonomy', () => {
  it('covers every name DATA_MODEL lists, and nothing else', () => {
    // The literal list from DATA_MODEL.md § Analytics events, in its order.
    const spec = [
      'signin', 'setup_done', 'one_thing_set', 'task_created', 'task_done',
      'compose_opened', 'send_confirmed', 'followup_created', 'nudge_opened',
      'focus_started', 'focus_completed', 'review_closed', 'paywall_viewed',
      'trial_started', 'purchase', 'tip', 'account_deleted',
    ];
    assert.deepEqual([...EVENT_NAMES], spec);
  });

  it('has a sample for every event the app itself sends', () => {
    const client = EVENT_NAMES.filter((n) => !(SERVER_ONLY_EVENTS as readonly string[]).includes(n));
    assert.deepEqual(SAMPLES.map((e) => e.name).sort(), [...client].sort());
  });

  /**
   * "Phone/email SHA-256 hashed; never send message text." The way this build
   * keeps that promise is by having nowhere to put either. If a field is ever
   * added, this fails and whoever added it has to say so here.
   */
  it('sends no property outside the five the spec names', () => {
    const allowed = new Set(['type', 'via', 'channel', 'min', 'period', 'product']);
    for (const sample of SAMPLES) {
      for (const key of Object.keys(queuedEvent(sample).props ?? {})) {
        assert.ok(allowed.has(key), `${sample.name} carries an unexpected property: ${key}`);
      }
    }
  });

  it('splits an event into its name, time and properties', () => {
    const at = new Date('2026-10-10T08:30:00.000Z');
    assert.deepEqual(queuedEvent({ name: 'focus_started', min: 25 }, at), {
      name: 'focus_started',
      at: '2026-10-10T08:30:00.000Z',
      props: { min: 25 },
    });
    // No properties means null, not an empty object: it is a null column.
    assert.equal(queuedEvent({ name: 'task_done' }, at).props, null);
  });
});

describe('the events the code actually emits', () => {
  /** Every `track({ name: '…' })` in the app, found in the source. */
  const emitted = (): Set<string> => {
    const files = execFileSync('git', ['ls-files', 'app', 'src'], { encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'));
    const found = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/track\(\{\s*name:\s*'([a-z_]+)'/g)) found.add(m[1] as string);
    }
    return found;
  };

  it('emits every event in the taxonomy but the server-only one', () => {
    const found = emitted();
    const missing = EVENT_NAMES.filter(
      (name) => !(SERVER_ONLY_EVENTS as readonly string[]).includes(name) && !found.has(name)
    );
    assert.deepEqual(missing, [], `never emitted: ${missing.join(', ')}`);
  });

  it('leaves account_deleted to the server', () => {
    assert.equal(emitted().has('account_deleted'), false);
    // Recorded by delete_my_account(), with no user_id to attach it to.
    const sql = readFileSync('supabase/migrations/0006_events.sql', 'utf8');
    assert.match(sql, /insert into public\.analytics_event .*values \(null, 'account_deleted'\)/);
  });
});

/** Compile-time: every name in the union is in EVENT_NAMES. */
const _exhaustive: readonly EventName[] = EVENT_NAMES.filter(
  (n): n is EventName => !(SERVER_ONLY_EVENTS as readonly string[]).includes(n)
);
void _exhaustive;
