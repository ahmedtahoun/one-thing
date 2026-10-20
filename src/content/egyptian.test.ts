import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ACC } from './strings';
import { added } from './additions';
import { egyptian, toEgyptian } from './egyptian';
import { setDialect } from '@/i18n/dialect';

describe('Egyptian from the Gulf copy', () => {
  it('swaps the words that differ', () => {
    const cases: [string, string][] = [
      ['وش المتأخر؟', 'إيه المتأخر؟'],
      ['ما فيه شيء اليوم.', 'مفيش حاجة النهارده.'],
      ['اتصل الحين', 'اتصل دلوقتي'],
      ['تبي تحذف حسابك؟', 'عايز تحذف حسابك؟'],
      ['من جوالك', 'من موبايلك'],
      ['جرّب مرة ثانية', 'جرّب مرة تانية'],
      ['ما لقيت هذا الشخص في الأشخاص.', 'ملقتش الشخص ده في الأشخاص.'],
      ['ما راح تزاحم شغلك الأساسي.', 'مش هتزاحم شغلك الأساسي.'],
      ['ما فيه أحد هنا لين الحين', 'محدش هنا لحد دلوقتي'],
    ];
    for (const [gulf, eg] of cases) assert.equal(toEgyptian(gulf), eg, gulf);
  });

  it('does not read ما as "not" where it means "what" or "as long as"', () => {
    assert.equal(toEgyptian('أرجع لك لين تخلّصه.'), 'هفضل أفكّرك لحد ما تخلّصه.');
    assert.equal(toEgyptian('أذكّرك قبل ما أحد ينتظر كثير.'), 'أفكّرك قبل ما حد يستنى كتير.');
    assert.equal(toEgyptian('أول ما تراسل أحد ينتقل هنا.'), 'أول ما تراسل حد ينتقل هنا.');
    assert.equal(toEgyptian('تمام. ما اسمه؟'), 'تمام. اسمه إيه؟');
  });

  it('keeps حاجة feminine', () => {
    assert.equal(toEgyptian('بكرة نبدأ بشي واحد.'), 'بكرة نبدأ بحاجة واحدة.');
    assert.equal(toEgyptian('ما فيه شيء متأخر. كل شيء تمام.'), 'مفيش حاجة متأخرة. كله تمام.');
  });

  it('leaves names, numbers, placeholders and English alone', () => {
    assert.equal(toEgyptian('مهام اليوم: {n}'), 'مهام النهارده: {n}');
    assert.equal(toEgyptian('Call Sara'), 'Call Sara');
    assert.equal(toEgyptian('سارة · 10:00'), 'سارة · 10:00');
  });

  it('leaves the privacy policy and the terms exactly as approved', () => {
    const eg = egyptian(ACC.ar);
    assert.deepEqual(eg.terms, ACC.ar.terms);
    assert.deepEqual(eg.priv, ACC.ar.priv);
    assert.notEqual(eg.si, ACC.ar.si);
  });

  it('is what added("ar") gives once Egyptian is chosen, and only then', () => {
    setDialect('egypt');
    assert.equal(added('ar').qa.noneToday, 'مفيش حاجة النهارده.');
    assert.equal(added('en').qa.noneToday, 'Nothing due today.');
    setDialect('gulf');
    assert.equal(added('ar').qa.noneToday, 'ما فيه شيء اليوم.');
  });
});
