/**
 * A contact's History: every dated moment with one person, grouped by day.
 * Run with `npm test`.
 *
 * The second of the two pure modules an audit found with nothing importing
 * them from a test (BUILD-REVIEW §2.99). What is worth holding down is the
 * joining: a closed follow-up with no `contactId` is matched to a person by
 * the first word of its `who`, which is a guess that can go wrong in both
 * directions.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTimeline, dayHeading } from './timeline';
import type { Contact, FollowUp, HistoryEntry } from '@/lib/model-types';

const NOW = new Date(2026, 9, 13, 15, 0, 0);
const WORDS = { today: 'Today', yest: 'Yesterday' };

/** A local instant, so the day boundaries are the ones the screen sees. */
const at = (dayOffset: number, hour = 10, minute = 0): string =>
  new Date(2026, 9, 13 + dayOffset, hour, minute, 0).toISOString();

const SARA: Contact = { id: 'c1', name: 'Sara Haddad', createdAt: '2026-09-01T09:00:00.000Z' };

const entry = (id: string, when: string, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id,
  contactId: 'c1',
  kind: 'call',
  text: id,
  at: when,
  ...over,
});

const followUp = (id: string, over: Partial<FollowUp> = {}): FollowUp => ({
  id,
  channel: 'whatsapp',
  who: 'Sara Haddad',
  what: 'The quote',
  status: 'done',
  since: '',
  ...over,
});

const build = (history: HistoryEntry[], followUps: FollowUp[] = [], contact = SARA) =>
  buildTimeline({ contact, history, followUps, now: NOW, lang: 'en', words: WORDS });

describe('the day a moment is filed under', () => {
  it('names today and yesterday rather than dating them', () => {
    assert.equal(dayHeading(new Date(at(0)), NOW, 'en', WORDS), 'Today');
    assert.equal(dayHeading(new Date(at(-1)), NOW, 'en', WORDS), 'Yesterday');
  });

  it('dates anything older', () => {
    const label = dayHeading(new Date(at(-5)), NOW, 'en', WORDS);
    assert.notEqual(label, 'Today');
    assert.notEqual(label, 'Yesterday');
    assert.match(label, /Oct/);
  });

  it('reads a day by the clock on the wall, not by the hour', () => {
    // One minute past midnight is still today; one minute before is not.
    assert.equal(dayHeading(new Date(2026, 9, 13, 0, 1), NOW, 'en', WORDS), 'Today');
    assert.equal(dayHeading(new Date(2026, 9, 12, 23, 59), NOW, 'en', WORDS), 'Yesterday');
  });
});

describe('what the History holds', () => {
  it('shows only this person’s moments', () => {
    const history = [entry('hers', at(0)), entry('his', at(0), { contactId: 'c2' })];
    const { groups, count } = build(history);
    assert.equal(count, 1);
    assert.deepEqual(groups[0]?.items.map((i) => i.key), ['hers']);
  });

  it('puts the newest first, within a day and across days', () => {
    const history = [entry('old', at(-2)), entry('earlyToday', at(0, 9)), entry('lateToday', at(0, 14))];
    const { groups } = build(history);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.label, 'Today');
    assert.match(groups[1]?.label ?? '', /^Sun 11 Oct$/);
    assert.deepEqual(groups[0]?.items.map((i) => i.key), ['lateToday', 'earlyToday']);
    assert.deepEqual(groups[1]?.items.map((i) => i.key), ['old']);
  });

  it('gathers one day under one heading', () => {
    const { groups } = build([entry('a', at(-1, 9)), entry('b', at(-1, 16))]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.label, 'Yesterday');
    assert.equal(groups[0]?.items.length, 2);
  });

  it('is empty, not broken, when nothing has happened', () => {
    assert.deepEqual(build([]), { groups: [], count: 0 });
  });
});

describe('closed follow-ups appear by themselves', () => {
  it('brings in a closed one, ticked and without a time', () => {
    const { groups, count } = build([], [followUp('f1', { contactId: 'c1', lastActionAt: at(0, 11) })]);
    assert.equal(count, 1);
    assert.equal(groups[0]?.items[0]?.text, 'The quote ✓');
    assert.equal(groups[0]?.items[0]?.time, '');
  });

  it('leaves an open one out', () => {
    const open = followUp('f1', { contactId: 'c1', status: 'waiting', lastActionAt: at(0) });
    assert.equal(build([], [open]).count, 0);
  });

  it('matches an older one by the first name in its who', () => {
    const { count } = build([], [followUp('f1', { who: 'Sara · Buyer', lastActionAt: at(0) })]);
    assert.equal(count, 1);
  });

  it('does not take somebody else’s', () => {
    const { count } = build([], [followUp('f1', { who: 'Omar Khalid', lastActionAt: at(0) })]);
    assert.equal(count, 0);
  });

  it('trusts the link over the name when it has one', () => {
    // Linked to c2, though the name would otherwise match Sara.
    const { count } = build([], [followUp('f1', { contactId: 'c2', who: 'Sara Haddad', lastActionAt: at(0) })]);
    assert.equal(count, 0);
  });

  it('files one with no recorded action under today rather than dropping it', () => {
    const { groups, count } = build([], [followUp('f1', { contactId: 'c1' })]);
    assert.equal(count, 1);
    assert.equal(groups[0]?.label, 'Today');
  });

  it('mixes the two sources into one day, newest first', () => {
    const history = [entry('logged', at(-1, 9))];
    const follow = [followUp('f1', { contactId: 'c1', lastActionAt: at(-1, 17) })];
    const { groups } = build(history, follow);
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0]?.items.map((i) => i.key), ['f1', 'logged']);
  });
});
