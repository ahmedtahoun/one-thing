/**
 * Three ways a name used to be missed. Each case here failed before the fix,
 * and each is a sentence somebody would really write.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { candidateName, soundsAlike } from './names';

describe('a name after an ordinary word', () => {
  // The rule fires at "the" long before it reaches "to Sara". Reading only the
  // first match meant rejecting "the" and giving up on the whole sentence.
  it('is found when the rule matched something else first', () => {
    assert.equal(candidateName('Email the quote to Sara')?.word, 'Sara');
    assert.equal(candidateName('Send the invoice to Omar')?.word, 'Omar');
    assert.equal(candidateName('Send the deck to the team')?.word ?? null, null);
  });

  it('still prefers the person-verb reading', () => {
    assert.equal(candidateName('Call Sara tomorrow')?.word, 'Sara');
    assert.equal(candidateName('Email the quote')?.word ?? null, null);
  });
});

describe('علي', () => {
  // على (on) and علي (Ali) are one word once ى folds to ي, so keeping the
  // preposition in the stop list cost us one of the commonest names there is.
  it('is read as a name', () => {
    assert.equal(candidateName('كلم علي')?.word, 'علي');
    assert.equal(candidateName('اتصل بعلي بكره')?.word, 'علي');
  });

  it('does not make a preposition into a person', () => {
    assert.equal(candidateName('رن على نورة')?.word, 'نورة');
    assert.equal(candidateName('كلم سارة')?.word, 'سارة');
  });
});

describe('names that sound alike across scripts', () => {
  it('matches a name whose key is a single consonant', () => {
    assert.equal(soundsAlike('Ali', 'علي'), true);
  });

  it('keeps matching the longer names it always did', () => {
    assert.equal(soundsAlike('Sara', 'سارة'), true);
    assert.equal(soundsAlike('Omar', 'عمر'), true);
    assert.equal(soundsAlike('Mohammed', 'محمد'), true);
  });

  // The one-letter key is only allowed for short names; otherwise every
  // stranger whose consonants drop out would be introduced to every other.
  it('does not let a long name through on one letter', () => {
    assert.equal(soundsAlike('Aiueo', 'Ali'), false);
    assert.equal(soundsAlike('Sara', 'Khalid'), false);
  });
});
