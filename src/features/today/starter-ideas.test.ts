import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { starterIdeas } from './starter-ideas';

describe('starterIdeas', () => {
  it('knows a founder in both languages', () => {
    for (const job of ['Founder', 'Co-founder & CEO', 'Startup owner', 'مؤسس شركة', 'صاحب مشروع', 'رائد أعمال']) {
      assert.ok(starterIdeas(job, 'en'), job);
    }
    assert.match(starterIdeas('CEO', 'en')?.[0] ?? '', /investor/i);
    assert.match(starterIdeas('مؤسس', 'ar')?.[0] ?? '', /[؀-ۿ]/);
  });
  it('leaves everyone else on the stock examples', () => {
    assert.equal(starterIdeas('Accountant', 'en'), null);
    assert.equal(starterIdeas(undefined, 'en'), null);
    assert.equal(starterIdeas('', 'ar'), null);
  });
});
