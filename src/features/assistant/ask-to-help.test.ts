import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { countsTowardsAsking, ENOUGH, shouldAskToHelp, type HelpState } from './ask-to-help';

const state = (over: Partial<HelpState> = {}): HelpState => ({ sent: ENOUGH, decided: false, met: true, on: false, ...over });

test('asks once somebody has used Sanad enough to know what they are agreeing to', () => {
  assert.equal(shouldAskToHelp(state()), true);
});

test('does not ask somebody who has only just arrived', () => {
  assert.equal(shouldAskToHelp(state({ sent: 1 })), false);
  assert.equal(shouldAskToHelp(state({ sent: ENOUGH - 1 })), false);
});

test('does not ask before Sanad has introduced itself', () => {
  assert.equal(shouldAskToHelp(state({ met: false })), false);
});

test('never asks twice — a no is kept as firmly as a yes', () => {
  assert.equal(shouldAskToHelp(state({ decided: true })), false);
  assert.equal(shouldAskToHelp(state({ decided: true, sent: 500 })), false);
});

test('does not ask for something already given', () => {
  assert.equal(shouldAskToHelp(state({ on: true })), false);
});

test('tapping a card is not choosing a sentence, so it does not count', () => {
  assert.equal(countsTowardsAsking('chip'), false);
  assert.equal(countsTowardsAsking('intro'), false);
  assert.equal(countsTowardsAsking('typed'), true);
  assert.equal(countsTowardsAsking('spoken'), true);
});

test('five, so the question is about something they have actually done', () => {
  assert.ok(ENOUGH >= 3, 'fewer would be asking a stranger');
  assert.ok(ENOUGH <= 10, 'more and nobody is ever asked');
});
