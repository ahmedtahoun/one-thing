/**
 * SCREENS.md § 24 calls the paywall's fine print "required wording" — both
 * stores check it. The copy is generated from app-content.js; this holds it to
 * the spec's own sentence, so neither can drift without a failing test.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';

import { SETX } from '@/content/strings';

const screens = readFileSync(join(__dirname, '../../../design-handoff/SCREENS.md'), 'utf8');
const required = /Fine print \(required wording\): "([^"]+)"/.exec(screens)?.[1];

it('finds the required wording in SCREENS.md', () => assert.ok(required));

it('shows the yearly fine print word for word', () => {
  assert.equal(SETX.en.pw.fineY, required);
});

it('words the monthly plan the same, at its own price', () => {
  assert.equal(SETX.en.pw.fineM, required?.replace('$35.88/year', '$4.99/month'));
});
