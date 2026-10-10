/**
 * The sync engine end to end, with two devices sharing one in-memory server.
 * scripts/test-sync-db.ts runs the same story against Postgres. Run with
 * `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { QueuedEvent } from '../analytics/events';
import type { ConsentRecord } from '../consent';
import type { QueuedPrivacyRequest } from '../privacy-request';
import { isUuid } from '../ids';
import { EMPTY_BASE, ORDER, syncOnce, type Base, type LocalState, type Remote } from './engine';
import { bareTask, contact, emptyLocal, followUp, fullTask, historyFor } from './fixtures';
import { legacyIds, rewrite } from './adopt';
import { memoryRemote } from './memory-remote';

const USER = '00000000-0000-4000-8000-000000000001';
const TODAY = '2026-10-10';

/** A phone: its own stores, its own base, and the shared server. */
function device(remote: Remote, local: LocalState = emptyLocal(), userId = USER) {
  let base: Base = EMPTY_BASE;
  const d = {
    local,
    consent: [] as ConsentRecord[],
    events: [] as QueuedEvent[],
    privacyRequests: [] as QueuedPrivacyRequest[],
    plan: null as string | null,
    marketing: null as boolean | null,
    async sync() {
      const result = await syncOnce({
        remote,
        userId,
        local: d.local,
        base,
        consent: d.consent,
        events: d.events,
        privacyRequests: d.privacyRequests,
        today: TODAY,
      });
      base = result.base;
      d.consent = d.consent.slice(result.consentSent);
      d.events = d.events.slice(result.eventsSent);
      d.privacyRequests = d.privacyRequests.slice(result.privacySent);
      d.plan = result.plan;
      d.marketing = result.marketing;
      d.local = {
        ...d.local,
        tasks: ORDER.tasks(result.tasks),
        contacts: ORDER.contacts(result.contacts),
        history: ORDER.history(result.history),
        followUps: ORDER.followUps(result.followUps),
        oneThing: result.oneThing,
        prefs: result.prefs,
        profile: { ...d.local.profile, ...result.name },
      };
      return result;
    },
  };
  return d;
}

describe('sync engine', () => {
  it('puts a first device on the server and a second device in step with it', async () => {
    const server = memoryRemote();
    const noura = contact();
    const a = device(
      server,
      emptyLocal({
        tasks: [fullTask({ contactIds: [noura.id] }), bareTask()],
        contacts: [noura],
        history: [historyFor(noura.id)],
        followUps: [followUp({ contactId: noura.id })],
        oneThing: { date: TODAY, title: 'Send the proposal', done: false, focusMinutes: 45 },
      })
    );
    const first = await a.sync();
    assert.equal(first.deleted, 0);
    assert.equal(server.tables.get('app_user')?.length, 1);
    assert.equal(server.tables.get('task')?.length, 2);
    assert.equal(server.tables.get('task_contact')?.length, 1);
    assert.equal(server.tables.get('one_thing')?.length, 1);
    assert.equal(server.tables.get('settings')?.length, 1);

    // A fresh install takes the server's name and settings over its own
    // blanks and defaults.
    const b = device(server, emptyLocal({ profile: { name: '', firstName: '', language: 'ar', platform: 'android' } }));
    await b.sync();
    assert.equal(b.local.profile.firstName, 'Reem');
    assert.equal(b.local.profile.language, 'ar', 'the language stays the device’s own');
    assert.deepEqual(b.local.tasks, a.local.tasks);
    assert.deepEqual(b.local.contacts, a.local.contacts);
    assert.deepEqual(b.local.history, a.local.history);
    assert.deepEqual(b.local.followUps, a.local.followUps);
    assert.deepEqual(b.local.oneThing, a.local.oneThing);

    // And a second sync on either side has nothing to do.
    server.log.length = 0;
    const quiet = await a.sync();
    assert.equal(quiet.pushed, 0);
    assert.equal(quiet.deleted, 0);
    assert.deepEqual(server.log, []);
    assert.equal(server.tables.get('app_user')?.[0]?.language, 'ar', 'the device that changed it last');
  });

  it('carries edits and deletions from one device to the other', async () => {
    const server = memoryRemote();
    const keep = bareTask({ title: 'Keep me' });
    const drop = bareTask({ title: 'Drop me' });
    const a = device(server, emptyLocal({ tasks: [keep, drop] }));
    await a.sync();
    const b = device(server);
    await b.sync();

    // A finishes one; B deletes the other.
    a.local = { ...a.local, tasks: a.local.tasks.map((t) => (t.id === keep.id ? { ...t, status: 'done' } : t)) };
    await a.sync();
    b.local = { ...b.local, tasks: b.local.tasks.filter((t) => t.id !== drop.id) };
    await b.sync();
    await a.sync();

    for (const d of [a, b]) {
      assert.deepEqual(
        d.local.tasks.map((t) => [t.title, t.status]),
        [['Keep me', 'done']]
      );
    }
    assert.equal(server.tables.get('task')?.length, 1);
  });

  it('keeps what a device changed offline when the other changed the same task', async () => {
    const server = memoryRemote();
    const task = bareTask();
    const a = device(server, emptyLocal({ tasks: [task] }));
    await a.sync();
    const b = device(server);
    await b.sync();

    a.local = { ...a.local, tasks: [{ ...a.local.tasks[0]!, title: 'From A' }] };
    b.local = { ...b.local, tasks: [{ ...b.local.tasks[0]!, title: 'From B' }] };
    await a.sync();
    await b.sync(); // B synced last, so B's edit stands
    await a.sync();
    assert.equal(a.local.tasks[0]?.title, 'From B');
    assert.equal(b.local.tasks[0]?.title, 'From B');
  });

  it('removes history whose contact the other device deleted, and unlinks the rest', async () => {
    const server = memoryRemote();
    const noura = contact();
    const task = bareTask({ contactIds: [noura.id] });
    const fu = followUp({ contactId: noura.id, taskId: task.id });
    const a = device(server, emptyLocal({ contacts: [noura], tasks: [task], followUps: [fu] }));
    await a.sync();
    const b = device(server);
    await b.sync();

    // A deletes Noura; meanwhile B logs a call with her.
    a.local = { ...a.local, contacts: [], history: [] };
    await a.sync();
    b.local = { ...b.local, history: [historyFor(noura.id)] };
    await b.sync();
    await a.sync();

    for (const d of [a, b]) {
      assert.deepEqual(d.local.contacts, []);
      assert.deepEqual(d.local.history, [], 'history goes with its contact');
      assert.deepEqual(d.local.tasks[0]?.contactIds, []);
      assert.equal(d.local.followUps[0]?.contactId, null, 'the follow-up outlives its contact');
      assert.equal(d.local.followUps[0]?.taskId, task.id);
    }
  });

  it('sends queued consent once, and reports the latest marketing choice', async () => {
    const server = memoryRemote();
    const a = device(server);
    a.consent = [
      { kind: 'terms_privacy', granted: true, version: 'v1', at: '2026-10-10T08:00:00.000Z', source: 'signin' },
      { kind: 'marketing', granted: true, version: 'v1', at: '2026-10-10T08:00:00.000Z', source: 'signin' },
    ];
    await a.sync();
    assert.equal(a.marketing, true);
    assert.deepEqual(a.consent, []);
    a.consent = [{ kind: 'marketing', granted: false, version: 'v1', at: '2026-10-10T09:00:00.000Z', source: 'settings' }];
    await a.sync();
    await a.sync();
    assert.equal(server.tables.get('consent')?.length, 3);
    assert.equal(a.marketing, false);
  });

  it("reads the plan from the server and never writes it", async () => {
    const server = memoryRemote();
    const a = device(server);
    await a.sync();
    assert.equal(a.plan, 'free');
    // A store webhook upgrades the account.
    server.tables.set('app_user', server.tables.get('app_user')!.map((u) => ({ ...u, plan: 'pro' })));
    await a.sync();
    assert.equal(a.plan, 'pro');
    assert.equal(server.tables.get('app_user')?.[0]?.plan, 'pro');
  });

  it('takes a settings change made on the other device, and never pushes a fresh install’s defaults', async () => {
    const server = memoryRemote();
    const a = device(server);
    a.local = { ...a.local, prefs: { ...a.local.prefs, focusMinutes: 90 } };
    await a.sync();
    const b = device(server);
    await b.sync();
    assert.equal(b.local.prefs.focusMinutes, 90);
    assert.equal(server.tables.get('settings')?.[0]?.focus_minutes, 90);
    b.local = { ...b.local, prefs: { ...b.local.prefs, nudgeStyle: 'firm', quietHours: { start: '23:00', end: '07:00' } } };
    await b.sync();
    await a.sync();
    assert.equal(a.local.prefs.nudgeStyle, 'firm');
    assert.equal(a.local.prefs.quietHours.start, '23:00');
  });

  it('never deletes an earlier day’s One Thing', async () => {
    const server = memoryRemote();
    server.tables.set('one_thing', [{ user_id: USER, date: '2026-10-09', title: 'Yesterday', done: true, focus_minutes: 45 }]);
    const a = device(server, emptyLocal({ oneThing: { date: TODAY, title: 'Today', done: false, focusMinutes: 25 } }));
    await a.sync();
    assert.deepEqual(
      server.tables.get('one_thing')?.map((r) => r.date).sort(),
      ['2026-10-09', TODAY]
    );
  });
});

describe('adopting ids from before sync', () => {
  it('gives every old id a UUID and moves every reference with it', () => {
    const c = contact({ id: 'c1' });
    const t = bareTask({ id: 't_1728_abcde', contactIds: ['c1'] });
    const h = historyFor('c1', { id: 'h1_0' });
    const f = followUp({ id: 'f_1', contactId: 'c1', taskId: 't_1728_abcde' });
    const untouched = bareTask();
    const lists = { tasks: [t, untouched], contacts: [c], history: [h], followUps: [f] };
    const map = legacyIds(lists);
    assert.equal(map.size, 4);
    const tasks = lists.tasks.map((x) => rewrite.task(map, x));
    const contacts = lists.contacts.map((x) => rewrite.contact(map, x));
    const history = lists.history.map((x) => rewrite.history(map, x));
    const followUps = lists.followUps.map((x) => rewrite.followUp(map, x));
    assert.equal(tasks[1], untouched, 'a row with nothing to change is the same object');
    assert.ok([...tasks, ...contacts, ...history, ...followUps].every((x) => isUuid(x.id)));
    assert.equal(tasks[0]?.contactIds[0], contacts[0]?.id);
    assert.equal(history[0]?.contactId, contacts[0]?.id);
    assert.equal(followUps[0]?.contactId, contacts[0]?.id);
    assert.equal(followUps[0]?.taskId, tasks[0]?.id);
    assert.equal(legacyIds({ tasks, contacts, history, followUps }).size, 0);
  });
});
