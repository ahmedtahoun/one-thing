import { useCallback } from 'react';
import { router } from 'expo-router';

import { greetingName, writeDraft, type DraftKind } from '@/features/compose/drafts';
import { useLanguage } from '@/i18n/LanguageProvider';
import type { Channel, Contact } from '@/lib/model-types';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

/**
 * Starts a message or call with someone and opens Compose on it — People's
 * round buttons and the contact profile's action tiles. Nothing is sent.
 *
 * The prototype stamps these 09:30, ten minutes after its frozen 09:20
 * clock, so here they are due now.
 */
export function useStartTask() {
  const { t, lang } = useLanguage();
  const { addTask } = useTasks();
  const { session } = useSession();

  return useCallback(
    (contact: Contact, type: Channel, draftKind?: DraftKind, from?: 'contact') => {
      // "Email Omar", and "Email Dr. Hassan" for a titled name, never "Email Dr.".
      const first = greetingName(contact.name, lang) || contact.name;
      const task = addTask({
        type,
        title: t.newMsg[type].replace('{n}', first),
        who: contact.role ? `${contact.name} · ${contact.role}` : contact.name,
        contactIds: [contact.id],
        dueAt: new Date().toISOString(),
        // A message that starts from a reason (it has been a while) arrives with its first line written.
        draft: type === 'call' || (!draftKind && type !== 'email') ? undefined : writeDraft(type, draftKind ?? 'blank', { name: contact.name, sender: session?.name, lang }),
        createdVia: 'quick',
      });
      router.push(`/compose?id=${task.id}${from ? `&from=${from}` : ''}`);
    },
    [addTask, t.newMsg, lang, session?.name]
  );
}
