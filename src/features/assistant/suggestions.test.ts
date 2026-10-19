/**
 * Which chips the Assistant offers, and in what order. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { added } from '@/content/additions';
import { chipsFor, rankChips, MAX_CHIPS, type Chip } from './suggestions';

const COPY = added('en').chips;
const EMPTY = { late: 0, waiting: 0, openTasks: 0, hasOneThing: false, people: 0 };
const keys = (chips: readonly Chip[]) => chips.map((c) => c.key);

describe('what is worth suggesting', () => {
  it('offers nothing that would answer "nobody"', () => {
    const chips = chipsFor(COPY, EMPTY);
    assert.ok(!keys(chips).includes('late'), 'nothing is late');
    assert.ok(!keys(chips).includes('waiting'), 'nobody is waiting');
    assert.ok(!keys(chips).includes('next'), 'there is nothing next');
  });

  it('still offers the two that work on an empty app', () => {
    assert.deepEqual(keys(chipsFor(COPY, EMPTY)), ['scan', 'contact']);
  });

  it('puts what is late first', () => {
    const chips = chipsFor(COPY, { ...EMPTY, late: 2, waiting: 1, openTasks: 5, hasOneThing: true });
    assert.equal(keys(chips)[0], 'late');
    assert.equal(keys(chips)[1], 'waiting');
  });

  it('carries the sentence as well as the label, and they differ', () => {
    const waiting = chipsFor(COPY, { ...EMPTY, waiting: 1 })[0];
    assert.equal(waiting?.label, 'No reply yet');
    assert.equal(waiting?.say, 'Who am I waiting on?');
  });

  it('is short enough to read on a phone', () => {
    for (const lang of ['en', 'ar'] as const) {
      for (const chip of chipsFor(added(lang).chips, { late: 1, waiting: 1, openTasks: 1, hasOneThing: true, people: 3 })) {
        assert.ok(chip.label.length <= 18, `${lang}: "${chip.label}" is ${chip.label.length} characters`);
      }
    }
  });
});

describe('learning which ones get used', () => {
  const all = () => chipsFor(COPY, { late: 1, waiting: 1, openTasks: 3, hasOneThing: true, people: 4 });

  it('leaves the data order alone until something is tapped', () => {
    assert.deepEqual(keys(rankChips(all(), {})), keys(all()).slice(0, MAX_CHIPS));
  });

  it('brings forward the one tapped most', () => {
    assert.equal(keys(rankChips(all(), { scan: 3 }))[0], 'scan');
  });

  it('breaks a tie by how urgent the data says it is, not at random', () => {
    const ranked = keys(rankChips(all(), { scan: 2, contact: 2 }));
    assert.deepEqual(ranked.slice(0, 2), ['scan', 'contact'], 'the list order decides between equals');
  });

  it('never grows the row past what fits', () => {
    assert.ok(rankChips(all(), {}).length <= MAX_CHIPS);
  });

  it('ignores a count for a chip that is not being shown', () => {
    const chips = chipsFor(COPY, EMPTY);
    assert.deepEqual(keys(rankChips(chips, { late: 99 })), ['scan', 'contact']);
  });
});
