/**
 * The contact profile's History: every dated moment with one person,
 * grouped by day, newest first. SCREENS.md § 11.
 *
 * Two sources, as in the prototype: the history log (seeded, and added to by
 * the quick log), and follow-ups with this person that were closed — "Closed
 * follow-ups appear automatically". Those are derived, not stored twice.
 */
import { clockOf } from '@/lib/clock-format';
import type { Lang } from '@/content/strings';
import { dateKey, displayName, type Contact, type FollowUp, type HistoryEntry, type HistoryKind } from '@/lib/model-types';

export type TimelineItem = {
  key: string;
  kind: HistoryKind | FollowUp['channel'];
  text: string;
  /** HH:MM, or '' when the moment has no time of its own. */
  time: string;
};

export type TimelineGroup = { label: string; items: TimelineItem[] };

/** "Today", "Yesterday", or the day as the prototype formats it: "Mon, 5 Oct". */
export function dayHeading(at: Date, now: Date, lang: Lang, words: { today: string; yest: string }): string {
  const day = dateKey(at);
  if (day === dateKey(now)) return words.today;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === dateKey(yesterday)) return words.yest;
  return at.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** A closed follow-up belongs to this person if it is linked, or names them. */
function isTheirs(f: FollowUp, contact: Contact): boolean {
  if (f.contactId) return f.contactId === contact.id;
  const first = displayName(f.who).split(' ')[0] ?? '';
  return first.length > 0 && contact.name.startsWith(first);
}

export function buildTimeline({
  contact,
  history,
  followUps,
  now,
  lang,
  words,
}: {
  contact: Contact;
  history: HistoryEntry[];
  followUps: FollowUp[];
  now: Date;
  lang: Lang;
  words: { today: string; yest: string };
}): { groups: TimelineGroup[]; count: number } {
  const moments = [
    ...history
      .filter((h) => h.contactId === contact.id)
      .map((h) => ({ key: h.id, kind: h.kind, text: h.text, at: h.at, time: clockOf(h.at) })),
    ...followUps
      .filter((f) => f.status === 'done' && isTheirs(f, contact))
      // The prototype shows these with a tick and no time.
      .map((f) => ({ key: f.id, kind: f.channel, text: `${f.what} ✓`, at: f.lastActionAt ?? now.toISOString(), time: '' })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const groups: TimelineGroup[] = [];
  for (const m of moments) {
    const label = dayHeading(new Date(m.at), now, lang, words);
    let group = groups.find((g) => g.label === label);
    if (!group) groups.push((group = { label, items: [] }));
    group.items.push({ key: m.key, kind: m.kind, text: m.text, time: m.time });
  }
  return { groups, count: moments.length };
}
