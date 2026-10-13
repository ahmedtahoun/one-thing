/**
 * First-launch suggestions that fit the person. The setup screen asks for a
 * job title; a founder's first One Thing is rarely "tidy the desk" — it is
 * the investor reply, the weekly update, the numbers. Anyone else gets the
 * stock examples, as before.
 */
import type { Lang } from '@/content/strings';

const FOUNDER = /\b(?:founder|co-?founder|ceo|owner|entrepreneur|startup|start-up|managing director|principal)\b|مؤسس|صاحب (?:شركه|شركة|مشروع|عمل)|رائد اعمال|رائد أعمال|ريادي|مدير عام|المدير التنفيذي/i;

const FOUNDER_IDEAS: Record<Lang, string[]> = {
  en: [
    'Reply to the investor',
    'Follow up with a hot lead',
    'Send the weekly update to the team',
    'Review this week’s numbers',
    'Make the one decision I keep putting off',
  ],
  ar: [
    'أرد على المستثمر',
    'أتابع مع عميل مهتم',
    'أرسل تحديث الأسبوع للفريق',
    'أراجع أرقام هذا الأسبوع',
    'آخذ القرار اللي أأجّله',
  ],
};

/** Ideas for this job, or null when the stock examples should be used. */
export function starterIdeas(job: string | undefined, lang: Lang): string[] | null {
  return job && FOUNDER.test(job) ? FOUNDER_IDEAS[lang] : null;
}
