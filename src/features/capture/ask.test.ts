/**
 * The question and the choices under it, in both languages. Run with
 * `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { optionsFor, questionFor } from './ask';
import { added } from '@/content/additions';
import { C } from '@/content/strings';
import type { Contact } from '@/lib/model-types';
import type { Gap, QuickWhen } from '@/lib/parse/clarify';
import type { ParsedTask } from '@/lib/parse/types';

const NOW = new Date('2026-10-10T11:00:00');
const person = (id: string, name: string, role?: string): Contact => ({ id, name, role, createdAt: NOW.toISOString() });
const draft = (over: Partial<ParsedTask> = {}): ParsedTask => ({
  type: 'call',
  title: 'Call',
  who: null,
  contactId: null,
  when: new Date('2026-10-10T17:00:00').toISOString(),
  ...over,
});
const QUICK = C.en.rQuick as unknown as readonly QuickWhen[];

describe('questions', () => {
  it('names the person in the ambiguous and unknown questions', () => {
    const copy = added('en');
    assert.equal(questionFor({ kind: 'who-ambiguous', name: 'Daina', options: [] }, draft(), copy), 'Which Daina do you mean?');
    assert.equal(questionFor({ kind: 'who-unknown', name: 'Sara' }, draft(), copy), 'I don’t have Sara in People yet.');
  });

  it('asks who in the verb of the task', () => {
    const copy = added('en');
    const gap: Gap = { kind: 'who-missing', suggestions: [] };
    assert.equal(questionFor(gap, draft({ type: 'email' }), copy), copy.pickWho.email);
    assert.equal(questionFor(gap, draft({ type: 'whatsapp' }), copy), copy.pickWho.whatsapp);
  });

  it('says which time has gone', () => {
    const q = questionFor({ kind: 'when', why: 'past' }, draft({ when: new Date('2026-10-10T09:00:00').toISOString() }), added('en'));
    assert.ok(q.startsWith('9:00 AM has already passed'), q);
  });

  it('has no unfilled placeholders in either language', () => {
    for (const lang of ['en', 'ar'] as const) {
      const copy = added(lang);
      for (const gap of [
        { kind: 'who-ambiguous', name: 'X', options: [] },
        { kind: 'who-unknown', name: 'X' },
        { kind: 'who-missing', suggestions: [] },
        { kind: 'when', why: 'missing' },
        { kind: 'when', why: 'past' },
      ] as Gap[]) {
        assert.ok(!/[{}]/.test(questionFor(gap, draft(), copy)), `${lang} ${gap.kind}`);
      }
    }
  });
});

describe('options', () => {
  it('shows the role to tell two people with one name apart, and always offers "No one"', () => {
    const gap: Gap = { kind: 'who-ambiguous', name: 'Daina', options: [person('a', 'Daina Partner', 'Partner'), person('b', 'Daina Khoury', 'Dentist')] };
    const options = optionsFor(gap, draft(), added('en'), QUICK, NOW);
    assert.deepEqual(options.map((o) => o.label), ['Daina Partner · Partner', 'Daina Khoury · Dentist', 'No one']);
  });

  it('offers to add a stranger, pick someone else, or skip', () => {
    const options = optionsFor({ kind: 'who-unknown', name: 'Layla' }, draft(), added('en'), QUICK, NOW);
    assert.deepEqual(options.map((o) => o.action.kind), ['add', 'elsewhere', 'who']);
    assert.equal(options[0]?.label, 'Add Layla');
  });

  it('lists the suggestions by name, then "No one"', () => {
    const options = optionsFor({ kind: 'who-missing', suggestions: [person('a', 'Noura'), person('b', 'Sara')] }, draft(), added('en'), QUICK, NOW);
    assert.deepEqual(options.map((o) => o.label), ['Noura', 'Sara', 'No one']);
  });

  it('offers only times still ahead, and never a dead end', () => {
    const options = optionsFor({ kind: 'when', why: 'missing' }, draft(), added('en'), QUICK, NOW);
    assert.ok(options.length > 0);
    for (const o of options) {
      assert.equal(o.action.kind, 'when');
      if (o.action.kind === 'when') assert.ok(new Date(o.action.iso).getTime() > NOW.getTime(), o.label);
    }
    assert.ok(options.some((o) => o.key === 'keep'), 'keeps the parser’s own 17:00');
  });

  it('puts "tomorrow at the same time" first when the time has gone', () => {
    const gone = draft({ when: new Date('2026-10-10T09:00:00').toISOString() });
    const [first, , ...rest] = optionsFor({ kind: 'when', why: 'past' }, gone, added('en'), QUICK, NOW);
    assert.equal(first?.label, 'Tomorrow 9:00 AM');
    assert.ok(!rest.some((o) => o.key === 'keep'));
    if (first?.action.kind === 'when') assert.equal(new Date(first.action.iso).getDate(), 11);
  });
});
