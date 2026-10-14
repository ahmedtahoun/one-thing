import type { Added } from '@/content/additions';
import { clockFromHHMM } from '@/lib/clock-format';

import type { Reason } from './build';

/** The one line under a card that says why it is there. */
export function reasonText(reason: Reason, copy: Added['next']): string {
  switch (reason.kind) {
    case 'late': {
      if (reason.minutes < 60) return copy.lateMin.replace('{n}', String(Math.max(1, reason.minutes)));
      if (reason.minutes < 1440) return copy.lateHour.replace('{n}', String(Math.round(reason.minutes / 60)));
      const days = Math.floor(reason.minutes / 1440);
      return days === 1 ? copy.lateDay : copy.lateDays.replace('{n}', String(days));
    }
    case 'today':
      return copy.today.replace('{t}', clockFromHHMM(reason.at));
    case 'reply':
      if (reason.days <= 0) return copy.reply0;
      return reason.days === 1 ? copy.reply1 : copy.reply.replace('{n}', String(reason.days));
    case 'quiet':
      return copy.quiet.replace('{n}', String(reason.days));
  }
}

/** Late work and unanswered messages are the red ones. */
export const isUrgent = (reason: Reason): boolean => reason.kind === 'late' || reason.kind === 'reply';
