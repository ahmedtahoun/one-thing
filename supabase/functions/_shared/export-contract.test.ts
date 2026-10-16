/**
 * What "Download my data" puts in the document. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EXPORTED, exportDocument } from './export-contract';

const built = (rows: Record<string, unknown[]>) =>
  exportDocument({ userId: 'u-1', requestedAt: '2026-10-16T09:00:00.000Z', producedAt: '2026-10-16T09:01:00.000Z', rows });

describe('the export document', () => {
  it('carries a section for every table, empty or not', () => {
    const doc = built({});
    for (const { as } of EXPORTED) assert.ok(as in doc.data, as);
    assert.deepEqual(doc.data.tasks, []);
    assert.ok(doc.about.contains.includes('people'));
  });

  it('names what it leaves out, so nothing looks withheld', () => {
    assert.ok(Object.keys(built({}).about.omits).length > 0);
  });

  /**
   * A comp says why their plan was what it was, so it goes in — but
   * `granted_by` names a member of staff, and staff are not part of a
   * user's data (it is why `admin_member` is excluded entirely).
   */
  it('gives them their comped Pro without naming the admin who gave it', () => {
    const doc = built({
      compedPro: [
        { id: 'c-1', user_id: 'u-1', plan: 'pro', months: 3, reason: 'Ticket #1182', granted_by: 'admin-9', ends_at: '2027-01-16T00:00:00.000Z' },
      ],
    });
    const [row] = doc.data.compedPro as Record<string, unknown>[];
    assert.equal(row?.months, 3);
    assert.equal(row?.reason, 'Ticket #1182', 'they are told why');
    assert.equal('granted_by' in (row ?? {}), false, 'the admin’s id went out with the export');
  });

  it('leaves rows alone where nothing is hidden', () => {
    const task = { id: 't-1', user_id: 'u-1', title: 'Call the bank' };
    assert.deepEqual((built({ tasks: [task] }).data.tasks as unknown[])[0], task);
  });
});
