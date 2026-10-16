/**
 * Keeps the Lock Screen bar in step with the tasks: on every change, when
 * the app comes back to the front, and every few minutes while it is open,
 * so "Next" moves on. Renders nothing.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { added } from '@/content/additions';
import { useLanguage } from '@/i18n/LanguageProvider';
import { barSupported, syncBar, useBarOn } from '@/lib/today-bar';
import { useTasks } from '@/lib/tasks';

import { buildBar } from './build';

const REFRESH_MS = 5 * 60 * 1000;

export function TodayBarSync() {
  const { tasks, ready } = useTasks();
  const { lang } = useLanguage();
  const on = useBarOn();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!barSupported) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setTick((n) => n + 1);
    });
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!barSupported || !ready || on === null) return;
    // A short wait, so a burst of edits is one update.
    const id = setTimeout(() => {
      const state = on ? buildBar(tasks, new Date(), added(lang).bar, lang === 'ar') : null;
      void syncBar(state);
    }, 800);
    return () => clearTimeout(id);
  }, [tasks, ready, on, lang, tick]);

  return null;
}
