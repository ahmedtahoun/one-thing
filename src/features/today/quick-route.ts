/**
 * Where each of Today's eight quick-action tiles goes — ACCEPTANCE § Core.
 *
 * Call / Email / WhatsApp pick a person first (People in its pick mode, which
 * then opens Compose); Remind opens Quick capture; the four event types open
 * the event form. Anything else must never fall into the event form, which
 * quietly treats an unknown type as a Meeting.
 */
import type { TaskType } from '@/design/tokens';

export function quickActionRoute(type: TaskType): string {
  switch (type) {
    case 'call':
    case 'email':
    case 'whatsapp':
      return `/people?pick=${type}`;
    case 'reminder':
      return '/capture';
    default:
      return `/new?type=${type}`;
  }
}
