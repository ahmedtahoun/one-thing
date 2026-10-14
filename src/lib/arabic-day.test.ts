import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { C } from '@/content/strings';

import { onDay, toDay } from './arabic-day';

const wk = C.ar.wk;

describe('toDay', () => {
  it('drops the alif of ال after ل', () => {
    assert.equal(toDay('اليوم', wk), 'لليوم');
  });
  it('gives a weekday its article, then joins ل to it', () => {
    assert.equal(toDay('أربعاء 21', wk), 'للأربعاء 21');
    assert.equal(toDay('جمعة 23', wk), 'للجمعة 23');
    assert.equal(toDay('إثنين 5', wk), 'للإثنين 5');
    assert.equal(toDay('أحد 11', wk), 'للأحد 11');
  });
  it('simply prefixes a word that has no article', () => {
    assert.equal(toDay('بكرة', wk), 'لبكرة');
  });
});

describe('onDay', () => {
  it('adds the article to a weekday and leaves the rest', () => {
    assert.equal(onDay('خميس 15', wk), 'الخميس 15');
    assert.equal(onDay('اليوم', wk), 'اليوم');
    assert.equal(onDay('بكرة', wk), 'بكرة');
  });
});

describe('every Arabic weekday', () => {
  it('reads right after ل and with the article', () => {
    for (const day of wk) {
      assert.ok(toDay(`${day} 7`, wk).startsWith('للا') === false, day);
      assert.ok(toDay(`${day} 7`, wk).startsWith('لل'), day);
      assert.ok(onDay(`${day} 7`, wk).startsWith('ال'), day);
    }
  });
});
