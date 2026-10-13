/**
 * Which recogniser locale to ask for. Arabic is the one that matters: iOS
 * knows ar-SA (and a few more), Android knows ar-EG as well, and the
 * recogniser for the wrong dialect mishears far more than the right one. So
 * the choice is made from what the device says it supports, preferring the
 * person's own region (an Egyptian phone gets ar-EG where it exists), and
 * never from a list the device does not have.
 */
const ARABIC_ORDER = ['EG', 'SA', 'AE', 'KW', 'QA', 'JO', 'LB', 'MA'];
const ENGLISH_REGIONS = ['GB', 'AU', 'IN', 'IE', 'CA', 'NZ', 'ZA', 'SG'];

const clean = (locale: string): string => locale.replace('_', '-');

export function pickLocale(lang: 'en' | 'ar', supported: readonly string[], region?: string): string {
  const available = supported.map(clean);
  const find = (wanted: string) => available.find((l) => l.toLowerCase() === wanted.toLowerCase());
  const mine = region?.toUpperCase();

  if (lang === 'ar') {
    const order = [...(mine ? [mine] : []), ...ARABIC_ORDER];
    for (const r of order) {
      const hit = find(`ar-${r}`);
      if (hit) return hit;
    }
    const any = available.find((l) => l.toLowerCase().startsWith('ar'));
    if (any) return any;
    // Nothing listed (older Android): the person's own region if it is an Arabic one.
    return mine && ARABIC_ORDER.includes(mine) ? `ar-${mine}` : 'ar-SA';
  }

  const order = [...(mine && ENGLISH_REGIONS.includes(mine) ? [`en-${mine}`] : []), 'en-US', 'en-GB'];
  for (const wanted of order) {
    const hit = find(wanted);
    if (hit) return hit;
  }
  return available.find((l) => l.toLowerCase().startsWith('en')) ?? order[0] ?? 'en-US';
}
