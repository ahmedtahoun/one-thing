/**
 * The microphone notice says what the policy says. Run with `npm test`.
 *
 * Google's prominent-disclosure requirement is not only that an app explain
 * the microphone before asking for it: the explanation has to agree with
 * the privacy policy. Two copies of a sentence in a repository drift, and
 * the drift here is a policy breach rather than a typo — so the one in the
 * sheet is asserted, in both languages, to be the Voice notes paragraph of
 * the published policy character for character.
 *
 * If this fails after a policy edit, the fix is to copy the new paragraph
 * into `added().micNotice.body`, not to loosen the test.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { added } from '@/content/additions';
import { ACC, type Lang } from '@/content/strings';

/** The policy is a list of [heading, body]; the microphone is its own section. */
const voiceNotes = (lang: Lang): string => {
  const section = ACC[lang].priv.find(([, body]) => /microphone|الميكروفون/.test(body ?? ''));
  const paragraph = section?.[1];
  assert.ok(paragraph, `no Voice notes paragraph in the ${lang} policy`);
  return paragraph;
};

describe('the notice and the policy', () => {
  for (const lang of ['en', 'ar'] as Lang[]) {
    it(`says what the ${lang} policy says, word for word`, () => {
      assert.equal(added(lang).micNotice.body, voiceNotes(lang));
    });

    it(`tells the ${lang} reader the mic is not on in the background`, () => {
      const copy = added(lang).micNotice;
      assert.match(copy.background, lang === 'en' ? /background/i : /الخلفية/);
      // A disclosure with no way to decline is not a choice.
      assert.ok(copy.allow.trim().length > 0 && copy.deny.trim().length > 0);
      assert.notEqual(copy.allow, copy.deny);
    });
  }
});
