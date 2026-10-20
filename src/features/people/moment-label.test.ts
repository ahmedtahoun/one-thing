import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isMomentLabel } from './moment-label';

describe('labels that only said when', () => {
  it('are passed over in both languages', () => {
    for (const l of ['Just now', 'Added today', 'الحين', 'انضاف اليوم']) assert.equal(isMomentLabel(l), true, l);
  });
  it('keeps the ones that say what happened', () => {
    for (const l of ['Emailed · Sunday', 'Price quote', '', undefined]) assert.equal(isMomentLabel(l), false, String(l));
  });
});
