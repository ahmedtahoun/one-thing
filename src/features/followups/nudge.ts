import { useCallback } from 'react';
import { router } from 'expo-router';

import { emailDraft } from '@/features/compose/drafts';
import { useLanguage } from '@/i18n/LanguageProvider';
import { displayName, type FollowUp } from '@/lib/model-types';
import { usePeople } from '@/lib/people';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

/**
 * A follow-up task with the draft already written, then Compose. Run from
 * both buttons on a follow-up card (Nudge when overdue, Remind me while
 * waiting) and from a Next card — BUILD-REVIEW.md §2.19. It never sends.
 */
export function useNudge() {
  const { inline, lang } = useLanguage();
  const { session } = useSession();
  const { addTask } = useTasks();
  const { updateFollowUp } = usePeople();

  return useCallback(
    (f: FollowUp) => {
      const what = f.what.toLowerCase();
      const first = displayName(f.who).split(' ')[0] ?? '';
      const task = addTask({
        type: f.channel,
        title: inline.nudgeTitle.replace('{what}', f.what),
        who: f.who,
        contactIds: f.contactId ? [f.contactId] : [],
        dueAt: new Date().toISOString(),
        goal: inline.nudgeGoal.replace('{what}', what),
        points: [...inline.nudgePoints],
        // An email chaser is written as an email; a chat one stays a line.
        draft:
          f.channel === 'email'
            ? emailDraft('chase', { name: displayName(f.who), what: f.what, sender: session?.name, lang })
            : { body: inline.nudgeDraft.replace('{n}', first).replace('{what}', what) },
        createdVia: 'followup',
      });
      updateFollowUp(f.id, { taskId: task.id, lastAction: 'nudged', lastActionAt: new Date().toISOString() });
      router.push(`/compose?id=${task.id}`);
    },
    [addTask, updateFollowUp, inline, lang, session?.name]
  );
}
