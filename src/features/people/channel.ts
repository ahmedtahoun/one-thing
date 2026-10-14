/**
 * Which way to reach someone by default, and whether a way has what it needs.
 * People's row keeps one solid button for it, and the contact menu marks it
 * "Usual".
 */
import type { Channel, Contact, FollowUp, HistoryEntry } from '@/lib/model-types';

/** Whether this person has what the channel needs: a number for WhatsApp and calls, an address for email. */
export function canReach(contact: Contact, channel: Channel): boolean {
  return channel === 'email' ? Boolean(contact.email?.trim()) : Boolean(contact.phone?.trim());
}

/**
 * Their chosen channel when it works, else the first that does — WhatsApp,
 * then email, then a call — or null when there is no number or address at all.
 */
export function primaryChannel(contact: Contact): Channel | null {
  const preferred = contact.preferredChannel;
  if (preferred && canReach(contact, preferred)) return preferred;
  return (['whatsapp', 'email', 'call'] as const).find((channel) => canReach(contact, channel)) ?? null;
}

const CHANNELS: readonly string[] = ['whatsapp', 'email', 'call'];

/**
 * How you last got in touch with someone, for the small icon on their row:
 * the latest logged call, email or WhatsApp, else the channel of the latest
 * follow-up set after a message. Null when nothing is known yet.
 */
export function lastChannelFor(
  contactId: string,
  history: readonly HistoryEntry[],
  followUps: readonly FollowUp[]
): Channel | null {
  let best: { channel: Channel; at: number } | null = null;
  const consider = (channel: string, iso: string | undefined) => {
    const at = Date.parse(iso ?? '');
    if (!CHANNELS.includes(channel) || !Number.isFinite(at)) return;
    if (!best || at > best.at) best = { channel: channel as Channel, at };
  };
  for (const h of history) if (h.contactId === contactId) consider(h.kind, h.at);
  for (const f of followUps) if (f.contactId === contactId) consider(f.channel, f.createdAt);
  return (best as { channel: Channel } | null)?.channel ?? null;
}
