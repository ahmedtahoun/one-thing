import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { can } from './permissions';

describe('roles', () => {
  it('lets only the Owner delete, suspend, grant Pro or manage the team', () => {
    for (const p of ['delete', 'suspend', 'grant', 'team', 'audit'] as const) {
      assert.equal(can('Owner', p), true, p);
      assert.equal(can('Support', p), false, p);
      assert.equal(can('Analyst', p), false, p);
    }
  });
  it('lets Support see users and help them, and nothing destructive', () => {
    for (const p of ['personal', 'trial', 'reply', 'export-user', 'fix'] as const) assert.equal(can('Support', p), true, p);
    assert.equal(can('Support', 'dataset'), false);
  });
  it('keeps the Analyst away from personal data and every action', () => {
    assert.deepEqual(
      (['personal', 'trial', 'reply', 'export-user', 'fix', 'grant', 'suspend', 'delete', 'codes'] as const).filter((p) => can('Analyst', p)),
      []
    );
    assert.equal(can('Analyst', 'dataset'), true);
  });
});
