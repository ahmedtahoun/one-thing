/**
 * Language and writing direction.
 *
 * The design ships every screen in English and Arabic, and Settings switches
 * between them with an inline pill — so the switch has to take effect
 * immediately. React Native's own RTL (`I18nManager.forceRTL`) only applies
 * after an app restart, which would turn that pill into a "restart the app"
 * prompt. So direction is carried in context and applied per layout instead,
 * via the `useDirection` helpers below. Nothing calls `forceRTL`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { ACC, C, EVX, FUX, PFX, SETX, type Lang } from '@/content/strings';
import { INLINE } from '@/content/inline-copy';
import { A11Y } from '@/content/a11y';

const STORAGE_KEY = 'ot.lang';

type LanguageValue = {
  lang: Lang;
  /** 'rtl' when Arabic. */
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  /** Main screen copy for the active language. */
  t: (typeof C)['en'];
  acc: (typeof ACC)['en'];
  setx: (typeof SETX)['en'];
  evx: (typeof EVX)['en'];
  fux: (typeof FUX)['en'];
  pfx: (typeof PFX)['en'];
  /** Copy the handoff keeps inline in app-logic.js. */
  inline: (typeof INLINE)['en'];
  /** Screen-reader labels for icon-only controls. */
  a11y: (typeof A11Y)['en'];
};

const LanguageContext = createContext<LanguageValue | null>(null);

/** Arabic if the device's first locale is Arabic, English otherwise. */
function deviceLang(): Lang {
  return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'en' || saved === 'ar')) setLangState(saved);
      })
      .catch(() => {
        // A failed read just means we keep the device default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Not fatal: the choice still applies for this session.
    });
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isRTL: lang === 'ar',
      setLang,
      t: C[lang],
      acc: ACC[lang],
      setx: SETX[lang],
      evx: EVX[lang],
      fux: FUX[lang],
      pfx: PFX[lang],
      inline: INLINE[lang],
      a11y: A11Y[lang],
    }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

/**
 * Layout helpers for the active direction.
 *
 * `row` mirrors a horizontal stack, `start`/`end` give the leading and trailing
 * physical sides, and `flip` negates a horizontal offset. Chevrons and back
 * arrows mirror; phone numbers, times, prices and links do not — wrap those in
 * `<LTR>` instead (see src/ui/LTR.tsx).
 */
export function useDirection() {
  const { isRTL } = useLanguage();
  return useMemo(
    () => ({
      isRTL,
      row: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
      textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
      start: isRTL ? ('right' as const) : ('left' as const),
      end: isRTL ? ('left' as const) : ('right' as const),
      flip: (n: number) => (isRTL ? -n : n),
      /** Degrees to rotate a right-pointing chevron so it points forward. */
      forwardChevron: isRTL ? 180 : 0,
    }),
    [isRTL]
  );
}
