import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { joinRole, splitRole } from './role';

describe('position and company', () => {
  it('splits the line the app keeps', () => {
    assert.deepEqual(splitRole('Sales Manager · Northwind'), { position: 'Sales Manager', company: 'Northwind' });
  });
  it('tells a lone title from a lone company', () => {
    assert.deepEqual(splitRole('Client'), { position: 'Client', company: '' });
    assert.deepEqual(splitRole('Head of Food Service'), { position: 'Head of Food Service', company: '' });
    assert.deepEqual(splitRole('Heff'), { position: '', company: 'Heff' });
  });
  it('joins what is filled in, and nothing when empty', () => {
    assert.equal(joinRole('Buyer', 'Qahwa House'), 'Buyer · Qahwa House');
    assert.equal(joinRole('', 'Qahwa House'), 'Qahwa House');
    assert.equal(joinRole(' ', ''), undefined);
  });
});
