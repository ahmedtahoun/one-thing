/**
 * Sanad's opening line is assembled from claims about somebody's account, so
 * the test that matters is that it never makes one that is not true. The old
 * line said "Your One Thing is set" to a new account where nothing was.
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { introSteps, openingLine, type Opening } from './intro';

const COPY = {
  morning: 'Morning {name}.',
  evening: 'Evening {name}.',
  hi: 'I’m Sanad.',
  what: 'Tell me what’s on your mind.',
  oneThing: 'Your One Thing is set.',
  onToday: '{n} still on today.',
  late: '{n} late.',
  nothingYet: 'Nothing on today yet.',
  invite: 'Anything on your mind?',
};

const STEPS = {
  remind: { label: 'Set a reminder', say: 'Remind me tomorrow at 4 to call Ahmed' },
  dump: { label: 'Empty your head', say: 'Call the supplier and send Sara the invoice' },
  ask: { label: 'Ask about your day', say: 'What’s next?' },
  card: { label: 'Scan a card', say: 'Scan a card' },
};

const world = (over: Partial<Opening> = {}): Opening => ({
  firstName: 'Khalid',
  hour: 9,
  hasOneThing: false,
  openToday: 0,
  late: 0,
  waiting: 0,
  people: 0,
  met: true,
  ...over,
});

test('a first meeting introduces Sanad instead of reporting on an empty account', () => {
  const line = openingLine(world({ met: false }), COPY);
  assert.ok(line.includes('I’m Sanad.'), line);
  assert.ok(line.includes(COPY.what), line);
  assert.ok(!line.includes('One Thing'), line);
});

test('an empty account is never told its One Thing is set', () => {
  const line = openingLine(world(), COPY);
  assert.ok(!line.includes('One Thing'), line);
  assert.ok(line.includes('Nothing on today yet.'), line);
});

test('a One Thing that is set is said so', () => {
  assert.ok(openingLine(world({ hasOneThing: true }), COPY).includes('Your One Thing is set.'));
});

test('what is late leads, over what is merely set', () => {
  const line = openingLine(world({ hasOneThing: true, late: 2, openToday: 5 }), COPY);
  assert.ok(line.includes('2 late.'), line);
  assert.ok(!line.includes('One Thing'), line);
});

test('only one piece of news: a greeting is not a report', () => {
  const line = openingLine(world({ openToday: 4 }), COPY);
  assert.ok(line.includes('4 still on today.'), line);
  assert.ok(!line.includes('late'), line);
});

test('the greeting follows the clock, as Today does', () => {
  assert.ok(openingLine(world({ hour: 18 }), COPY).startsWith('Evening Khalid.'));
  assert.ok(openingLine(world({ hour: 17 }), COPY).startsWith('Morning Khalid.'));
});

test('no name leaves no gap before the full stop', () => {
  const line = openingLine(world({ firstName: '' }), COPY);
  assert.ok(line.startsWith('Morning.'), JSON.stringify(line));
});

test('nothing is left as a placeholder', () => {
  for (const over of [{}, { met: false }, { late: 1 }, { openToday: 2 }, { hasOneThing: true }]) {
    const line = openingLine(world(over), COPY);
    assert.ok(!line.includes('{'), line);
  }
});

test('an empty account is not invited to ask what is next — nothing is', () => {
  const keys = introSteps(world({ met: false }), STEPS).map((s) => s.key);
  assert.deepEqual(keys, ['remind', 'dump', 'card']);
});

test('…and is once there is something to find', () => {
  const keys = introSteps(world({ met: false, openToday: 3 }), STEPS).map((s) => s.key);
  assert.deepEqual(keys, ['remind', 'dump', 'ask', 'card']);
  assert.ok(introSteps(world({ met: false, late: 1 }), STEPS).some((s) => s.key === 'ask'));
});

test('every step carries both a label and the sentence it sends', () => {
  for (const step of introSteps(world({ met: false, openToday: 1 }), STEPS)) {
    assert.ok(step.label.length > 0, step.key);
    assert.ok(step.say.length > 0, step.key);
  }
});
