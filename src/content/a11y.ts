/**
 * Accessibility labels.
 *
 * Authored here rather than ported: the handoff has no accessibility strings,
 * and screen readers still need names for the icon-only controls (back
 * chevrons, header circles, the mic orb). Keep these in step with the visible
 * copy they sit beside.
 */
const A11Y_en = {
  back: 'Back',
  close: 'Close',
  assistant: 'Assistant',
  dailyReview: 'Daily review',
  settings: 'Settings',
  capture: 'Quick capture',
  brainDump: 'Brain dump',
  clearSearch: 'Clear search',
  send: 'Send',
  speak: 'Speak',
};

const A11Y_ar: typeof A11Y_en = {
  back: 'رجوع',
  close: 'إغلاق',
  assistant: 'المساعد',
  dailyReview: 'مراجعة اليوم',
  settings: 'الإعدادات',
  capture: 'التقاط سريع',
  brainDump: 'تفريغ الأفكار',
  clearSearch: 'مسح البحث',
  send: 'إرسال',
  speak: 'تكلّم',
};

export const A11Y = { en: A11Y_en, ar: A11Y_ar };
