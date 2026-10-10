import { useCallback } from 'react';
import { router } from 'expo-router';

import { useLanguage } from '@/i18n/LanguageProvider';
import type { Channel, Contact } from '@/lib/model-types';
import { useTasks } from '@/lib/tasks';

/**
 * Starts a message or call with someone and opens Compose on it — People's
 * round buttons and the contact profile's action tiles. Nothing is sent.
 *
 * The prototype stamps these 09:30, ten minutes after its frozen 09:20
 * clock, so here they are due now.
 */
export function useStartTask() {
  const { t } = useLanguage();
  const { addTask } = useTasks();

  return useCallback(
    (contact: Contact, type: Channel) => {
      const first = contact.name.split(' ')[0] ?? contact.name;
      const task = addTask({
        type,
        title: t.newMsg[type].replace('{n}', first),
        who: contact.role ? `${contact.name} · ${contact.role}` : contact.name,
        contactIds: [contact.id],
        dueAt: new Date().toISOString(),
        createdVia: 'quick',
      });
      router.push(`/compose?id=${task.id}`);
    },
    [addTask, t.newMsg]
  );
}
