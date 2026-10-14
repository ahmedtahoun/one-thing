/**
 * Saved messages: the person's own wording, kept to use again. Like a saved
 * reply on Instagram, but never sent for them — it fills the draft, and the
 * person still reads it and presses send. {name} (or {الاسم}) is where the
 * person's name goes, written the way a letter would greet them.
 */
import { greetingName } from '@/features/compose/drafts';
import type { Lang } from '@/content/strings';

export type Saved = {
  id: string;
  title: string;
  body: string;
  /** For an email; a chat message has none. */
  subject?: string;
  /** Used as the message when a follow-up comes due. At most one is. */
  chase?: boolean;
};

const NAME_TOKEN = /\{(?:name|الاسم)\}/gi;

/** The message for one person: their name where {name} is, and no stray space before punctuation. */
export function fillSaved(saved: Saved, fullName: string, lang: Lang): { body: string; subject?: string } {
  const first = greetingName(fullName, lang);
  const fill = (text: string) =>
    text
      .replace(NAME_TOKEN, first)
      .replace(/[ \t]+([,.!؟?،:])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ');
  return { body: fill(saved.body), ...(saved.subject ? { subject: fill(saved.subject) } : {}) };
}

/** A draft written for one person, turned back into something reusable: their name becomes {name}. */
export function toSaved(body: string, fullName: string, lang: Lang): string {
  const first = greetingName(fullName, lang);
  if (!first) return body;
  const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return body.replace(new RegExp(escaped, 'g'), lang === 'ar' ? '{الاسم}' : '{name}');
}
