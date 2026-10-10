/**
 * The row mapping the sync compares on. An object that goes to the server
 * and comes back must make the same row, or every sync would see a change
 * that nobody made. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bareTask, contact, followUp, fullTask, historyFor } from './fixtures';
import {
  contactFromRow,
  contactToRow,
  followUpFromRow,
  followUpToRow,
  fromServer,
  historyFromRow,
  historyToRow,
  prefsFromRow,
  prefsToRow,
  taskFromRow,
  taskToRow,
  type SettingsRow,
} from './rows';

describe('rows', () => {
  it('round-trips a task with every field, and one with none of the optional ones', () => {
    for (const task of [fullTask({ contactIds: ['b', 'a'] }), bareTask()]) {
      const row = taskToRow(task);
      assert.deepEqual(taskToRow(taskFromRow(row)), row);
    }
    const back = taskFromRow(taskToRow(bareTask()));
    assert.equal('who' in back, false, 'absent stays absent, not null');
    assert.equal(back.draft, undefined);
  });

  it('keeps a draft with a subject and an empty body', () => {
    const task = fullTask({ draft: { subject: 'Hello', body: '' } });
    assert.deepEqual(taskFromRow(taskToRow(task)).draft, { subject: 'Hello', body: '' });
  });

  it('round-trips contacts, history and follow-ups', () => {
    const c = contact();
    assert.deepEqual(contactToRow(contactFromRow(contactToRow(c))), contactToRow(c));
    assert.deepEqual(contactFromRow(contactToRow(c)), c);
    const sparse = contact({ role: undefined, dial: undefined, phone: undefined, email: undefined, touchedAt: undefined });
    assert.deepEqual(contactToRow(contactFromRow(contactToRow(sparse))), contactToRow(sparse));
    const h = historyFor(c.id);
    assert.deepEqual(historyFromRow(historyToRow(h)), h);
    const f = followUp({ contactId: c.id, lastAction: 'nudged', lastActionAt: '2026-10-12T09:00:00.000Z' });
    assert.deepEqual(followUpFromRow(followUpToRow(f)), f);
  });

  it('reads what Postgres sends back as the row the app made', () => {
    const task = fullTask();
    const fromDb = {
      ...taskToRow(task),
      user_id: 'someone',
      due_at: '2026-10-11T09:30:00+00:00',
      created_at: '2026-10-10 08:00:00+00',
      remind_at: '2026-10-11T09:00:00.000000+00:00',
      sent_confirmed_at: '2026-10-10T11:05:00+03:00',
    };
    const { contact_ids: _links, ...expected } = taskToRow(task);
    assert.deepEqual(fromServer('task', fromDb), expected);
  });

  it('reads quiet hours from a time column', () => {
    const prefs = {
      nudgeStyle: 'firm' as const,
      focusMinutes: 25 as const,
      quietHours: { start: '23:30', end: '07:00' },
      channels: { whatsapp: true, email: false, call: true },
      sound: false,
      vibration: true,
    };
    const raw = { ...prefsToRow(prefs), quiet_hours_start: '23:30:00', quiet_hours_end: '07:00:00', user_id: 'x' };
    assert.deepEqual(prefsFromRow(fromServer<SettingsRow>('settings', raw)), prefs);
  });
});
