import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { eveningWords } from './evening';

const COPY = {
  ready: 'Ready to wrap up?',
  allDone: 'All done today.',
  sum: '{a} to do · {b} done',
  sumAll: '{a} of {b} done today',
};

test('an ordinary evening asks the ordinary question', () => {
  const { title, meta } = eveningWords({ open: 3, done: 0 }, COPY);
  assert.equal(title, COPY.ready);
  assert.equal(meta, '3 to do · 0 done');
});

test('a day with nothing left is worth marking, and does not print "0 to do"', () => {
  const { title, meta } = eveningWords({ open: 0, done: 5 }, COPY);
  assert.equal(title, COPY.allDone);
  assert.equal(meta, '5 of 5 done today');
});

test('an empty day is not a clean sweep — there was nothing to sweep', () => {
  assert.equal(eveningWords({ open: 0, done: 0 }, COPY).title, COPY.ready);
});

test('one left is still one left', () => {
  assert.equal(eveningWords({ open: 1, done: 9 }, COPY).title, COPY.ready);
});

test('both numbers are filled, and nothing is left as a placeholder', () => {
  const { meta } = eveningWords({ open: 12, done: 4 }, COPY);
  assert.equal(meta, '12 to do · 4 done');
  assert.ok(!meta.includes('{'), meta);
});
