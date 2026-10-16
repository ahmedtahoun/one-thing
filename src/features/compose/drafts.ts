/**
 * Ready-made first drafts, so a message is one tap from written: a chase, a
 * check-in, a thank-you, a new time, and the delivery of something promised.
 *
 * A chat message is short and warm ("Hi Omar, …"). An email is written the way
 * a careful business writer would: a proper greeting ("Dear Omar,"), a polite
 * opening, short paragraphs, one clear ask, a closing line and a sign-off with
 * the sender's name, under a subject that says what it is about. Arabic emails
 * stay gender-neutral, since a name does not say whether to write الأخ or
 * الأخت. They are a starting point the person edits before sending, never
 * sent for them.
 *
 * Pure: the screens decide when to offer one.
 */
import type { Lang } from '@/content/strings';
import type { ParsedTask } from '@/lib/parse/types';

export type DraftKind = 'chase' | 'checkin' | 'thanks' | 'reschedule' | 'promise';

/** The four the person can pick; `promise` is only ever written for them. */
export const DRAFT_KINDS = ['chase', 'checkin', 'thanks', 'reschedule'] as const;

export type DraftInput = {
  /** First name, as it is greeted. */
  name: string;
  /** What it is about, when there is something specific ("the quote"). */
  what?: string;
  lang: Lang;
};

const lower = (s: string): string => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** "Send the contract" → "the contract"; null when the task is not a sending. */
function sentThing(title: string): string | null {
  const english = /^\s*send(?:ing)?\s+(?:over\s+)?(.+)$/i.exec(title);
  if (english?.[1]) return english[1].trim();
  const arabic = /^\s*(?:ا|ه|أ)?(?:ارسل|ابعت|بعت|ابعث)\S*\s+(.+)$/.exec(title);
  return arabic?.[1]?.trim() ?? null;
}

const EN: Record<Exclude<DraftKind, 'promise'>, (n: string, what?: string) => string> = {
  chase: (n, what) =>
    what ? `Hi ${n}, just following up on ${lower(what)}. Any update?` : `Hi ${n}, just following up. Any update on your side?`,
  checkin: (n) => `Hi ${n}, it has been a while. How are things? Free for a quick catch-up soon?`,
  thanks: (n) => `Hi ${n}, thank you for your time. I appreciate it, and I will follow up on what we discussed.`,
  reschedule: (n, what) =>
    what
      ? `Hi ${n}, something came up on my side. Could we move ${lower(what)} to another time that suits you?`
      : `Hi ${n}, something came up on my side. Could we find another time that suits you?`,
};

const AR: Record<Exclude<DraftKind, 'promise'>, (n: string, what?: string) => string> = {
  chase: (n, what) => (what ? `هلا ${n}، حبيت أتابع معك بخصوص ${what}. فيه جديد؟` : `هلا ${n}، حبيت أتابع معك. فيه جديد من عندك؟`),
  checkin: (n) => `هلا ${n}، من فترة ما تكلمنا. كيف الأحوال؟ نتكلم أو نتقابل قريب؟`,
  thanks: (n) => `هلا ${n}، شكرًا على وقتك، أقدّر لك. وبتابع معك على اللي اتفقنا عليه.`,
  reschedule: (n, what) =>
    what ? `هلا ${n}، صار عندي ظرف. ممكن نأجّل ${what} لوقت ثاني يناسبك؟` : `هلا ${n}، صار عندي ظرف. ممكن نحدد وقت ثاني يناسبك؟`,
};

export function draftFor(kind: DraftKind, { name, what, lang }: DraftInput): string {
  const n = name.trim() || (lang === 'ar' ? '' : 'there');
  if (kind === 'promise') {
    const thing = what ? sentThing(what) : null;
    if (lang === 'ar') {
      return thing ? `هلا ${n}، هذا ${thing} زي ما وعدتك.` : `هلا ${n}، أتابع معك زي ما وعدتك${what ? `: ${what}` : ''}.`;
    }
    return thing ? `Hi ${n}, here is ${thing}, as promised.` : `Hi ${n}, following up as promised${what ? `: ${lower(what)}` : ''}.`;
  }
  return (lang === 'ar' ? AR : EN)[kind](n, what?.trim() || undefined).replace(/\s+،/g, '،').replace(/\s{2,}/g, ' ');
}

// --- email -----------------------------------------------------------------

/** Titles that stay on a name in a greeting: "Dear Dr. Khan", not "Dear Khalid". */
const TITLE = /^(?:dr|prof|eng|mr|mrs|ms|miss|sheikh|sir|madam)\.?$|^(?:الدكتور|الدكتورة|د\.|م\.|المهندس|المهندسة|الشيخ|الأستاذ|الاستاذ|الأستاذة|الاستاذة|السيد|السيدة)$/i;
/** Family-name particles: "Khalid Al Mansoori" is "Mr Al Mansoori", not "Mr Mansoori". */
const PARTICLE = /^(?:al|el|bin|ibn|abu|abd|abdel|abdul|bint|ben)(?:-|$)/i;

/**
 * Who a greeting names. Mostly the first name — "Dear Omar," — but a name
 * saved with a title keeps it: "Dr. Khalid Al Mansoori" is "Dr. Al Mansoori".
 * Empty when there is no name to use.
 */
export function greetingName(fullName: string, lang: Lang): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const [first = '', ...rest] = words;
  if (!TITLE.test(first) || rest.length === 0) return first;
  if (lang === 'ar') return words.slice(0, 2).join(' ');
  if (rest.length === 1) return `${first} ${rest[0]}`;
  const at = rest.findIndex((w, i) => i > 0 && PARTICLE.test(w));
  return `${first} ${(at > 0 ? rest.slice(at) : rest.slice(-1)).join(' ')}`;
}

export type EmailInput = {
  /** The person's name as it is saved, which may carry a title. */
  name: string;
  /** What it is about, when there is something specific. */
  what?: string;
  /** The sender, for the sign-off. */
  sender?: string;
  lang: Lang;
};

export type EmailDraft = { subject?: string; body: string };

const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

type Parts = { subject?: string; paragraphs: string[] };

function partsEn(kind: DraftKind | 'blank', what: string | undefined, title: string | undefined): Parts {
  const thing = what ? lower(what) : undefined;
  switch (kind) {
    case 'chase':
      return thing
        ? {
            subject: `Following up: ${thing}`,
            paragraphs: [
              'I hope you are well.',
              `I am following up on ${thing} and wanted to check whether you have had a chance to look at it. Please let me know if there is anything you need from my side.`,
              'I look forward to hearing from you.',
            ],
          }
        : {
            subject: 'Following up',
            paragraphs: [
              'I hope you are well.',
              'I am writing to follow up on my previous message. Could you please let me know where things stand?',
              'I look forward to hearing from you.',
            ],
          };
    case 'checkin':
      return {
        subject: 'Catching up',
        paragraphs: [
          'I hope you are doing well.',
          'It has been a while since we last spoke, and I wanted to reconnect and hear how things are going on your side. If you have time in the coming days, I would be glad to arrange a short call.',
          'Looking forward to catching up.',
        ],
      };
    case 'thanks':
      return {
        subject: 'Thank you',
        paragraphs: [
          'Thank you for taking the time to speak with me. I appreciated the conversation and the chance to learn more.',
          'As discussed, I will follow up on the next steps shortly. Please do not hesitate to reach out in the meantime.',
        ],
      };
    case 'reschedule':
      return {
        subject: thing ? `Rescheduling ${thing}` : 'Finding a new time',
        paragraphs: [
          'I hope you are well.',
          `Unfortunately something has come up, and I need to reschedule ${thing ?? 'our meeting'}. Would another time this week suit you? I am happy to work around your schedule.`,
          'I apologise for any inconvenience.',
        ],
      };
    case 'promise': {
      const sent = title ? sentThing(title) : null;
      return sent
        ? {
            subject: sentence(sent),
            paragraphs: [
              'I hope you are well.',
              `As promised, I am sending you ${sent}. Please let me know if you have any questions or would like to go through it together.`,
            ],
          }
        : {
            subject: title ? sentence(title) : undefined,
            paragraphs: [
              'I hope you are well.',
              `I am following up as promised${title ? ` regarding ${lower(title)}` : ''}. Please let me know if there is anything else you need from me.`,
            ],
          };
    }
    default:
      return { subject: '', paragraphs: ['I hope you are well.', ''] };
  }
}

function partsAr(kind: DraftKind | 'blank', what: string | undefined, title: string | undefined): Parts {
  switch (kind) {
    case 'chase':
      return what
        ? {
            subject: `متابعة: ${what}`,
            paragraphs: [
              'أتمنى أن تكون بخير.',
              `أتواصل معك للمتابعة بخصوص ${what}، وأود معرفة إن كان لديك أي مستجدات. وإن احتجت أي شيء من طرفي فأنا حاضر.`,
              'بانتظار ردك.',
            ],
          }
        : {
            subject: 'متابعة',
            paragraphs: ['أتمنى أن تكون بخير.', 'أتواصل معك لمتابعة رسالتي السابقة. هل لديك أي مستجدات؟', 'بانتظار ردك.'],
          };
    case 'checkin':
      return {
        subject: 'للاطمئنان',
        paragraphs: [
          'أتمنى أن تكون بخير.',
          'مرّ وقت منذ آخر تواصل بيننا، وأحببت أن أطمئن عليك وأسمع أخبارك. إن تيسّر لك وقت في الأيام القادمة، يسعدني ترتيب مكالمة قصيرة.',
          'أتطلع للتواصل معك.',
        ],
      };
    case 'thanks':
      return {
        subject: 'شكرًا لك',
        paragraphs: [
          'أشكرك على وقتك، فقد سعدت بحديثنا وبفرصة التعرف أكثر.',
          'وكما اتفقنا، سأتابع معك الخطوات القادمة قريبًا. ولا تتردد بالتواصل في أي وقت.',
        ],
      };
    case 'reschedule':
      return {
        subject: what ? `تغيير موعد ${what}` : 'تحديد موعد جديد',
        paragraphs: [
          'أتمنى أن تكون بخير.',
          `لقد طرأ لدي ظرف، وأحتاج إلى تأجيل ${what ?? 'موعدنا'}. هل يناسبك وقت آخر هذا الأسبوع؟ يسعدني التنسيق بحسب جدولك.`,
          'أعتذر عن أي إزعاج.',
        ],
      };
    case 'promise': {
      const sent = title ? sentThing(title) : null;
      return sent
        ? {
            subject: sent,
            paragraphs: ['أتمنى أن تكون بخير.', `كما وعدتك، أرسل لك ${sent}. إن كان لديك أي استفسار أو رغبت بمراجعته معًا فأنا حاضر.`],
          }
        : {
            subject: title,
            paragraphs: ['أتمنى أن تكون بخير.', `أتواصل معك كما وعدتك${title ? ` بخصوص ${title}` : ''}. أخبرني إن احتجت أي شيء آخر.`],
          };
    }
    default:
      return { subject: '', paragraphs: ['أتمنى أن تكون بخير.', ''] };
  }
}

/**
 * A business email, ready to edit: greeting, short paragraphs, closing line and
 * the sender's name. With `blank`, only the greeting, an opening line and the
 * sign-off, leaving the middle for the person to write.
 */
export function emailDraft(kind: DraftKind | 'blank', { name, what, sender, lang }: EmailInput): EmailDraft {
  const to = greetingName(name, lang);
  const ar = lang === 'ar';
  // For a promise, `what` is the task's own title, from which the thing sent is read.
  const parts = (ar ? partsAr : partsEn)(kind, kind === 'promise' ? undefined : what?.trim() || undefined, kind === 'promise' ? what : undefined);
  const greeting = ar ? (to ? `السلام عليكم ${to}،` : 'السلام عليكم،') : to ? `Dear ${to},` : 'Hello,';
  const closing = ar ? 'مع خالص التحية،' : 'Kind regards,';
  const body = [greeting, ...parts.paragraphs, [closing, sender?.trim()].filter(Boolean).join('\n')].join('\n\n');
  return { subject: parts.subject, body };
}

/** What the person sees for a given channel: a short chat line, or a full email with its subject. */
export function writeDraft(channel: 'whatsapp' | 'email', kind: DraftKind | 'blank', input: EmailInput): EmailDraft {
  if (channel === 'email') return emailDraft(kind, input);
  if (kind === 'blank') return { body: '' };
  const first = greetingName(input.name, input.lang) || input.name;
  return { body: draftFor(kind, { name: first, what: input.what, lang: input.lang }) };
}

/**
 * The draft for a promise said out loud ("I told Omar I'd send the contract"),
 * written the moment it is saved so that doing it is one tap. Only for a
 * message — a call or a reminder has nothing to send.
 */
export function promiseDraft(p: ParsedTask, lang: Lang, sender?: string): EmailDraft | undefined {
  if (p.kind !== 'promise' || (p.type !== 'whatsapp' && p.type !== 'email') || !p.who?.trim()) return undefined;
  return writeDraft(p.type, 'promise', { name: p.who, what: p.title, sender, lang });
}
