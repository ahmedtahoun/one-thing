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
import { twelveHour } from '@/content/twelve-hour';
import { A11Y } from '@/content/a11y';
import { applyTheme, type ThemeMode } from '@/design/theme';
import { setClockLang } from '@/lib/clock-format';
import { egyptian } from '@/content/egyptian';
import { choiceOf, setDialect, type Dialect, type LanguageChoice } from './dialect';

const STORAGE_KEY = 'ot.lang';
const THEME_KEY = 'ot.theme';
const DIALECT_KEY = 'ot.dialect';

type LanguageValue = {
  lang: Lang;
  /** 'rtl' when Arabic. */
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  /** Which Arabic: Gulf, or Egyptian. Only the words change; see ./dialect.ts. */
  dialect: Dialect;
  /** English, Arabic or Egyptian, as Settings offers them. */
  choice: LanguageChoice;
  setChoice: (choice: LanguageChoice) => void;
  /** Light or dark. Lives here because every screen already reads this context, so changing it redraws them all. */
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
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

/** Egyptian on a phone set to Egypt, Gulf everywhere else, until the person chooses. */
function deviceDialect(): Dialect {
  return getLocales()[0]?.regionCode === 'EG' ? 'egypt' : 'gulf';
}

/** The Arabic copy in the chosen dialect; English is untouched. */
const inDialect = <T,>(copy: T, lang: Lang, dialect: Dialect): T => (lang === 'ar' && dialect === 'egypt' ? egyptian(copy) : copy);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang);
  const [dialect, setDialectState] = useState<Dialect>(deviceDialect);
  const [theme, setThemeState] = useState<ThemeMode>('light');
  // Nothing is drawn until the saved theme is known, so a dark user never sees a light first frame.
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'en' || saved === 'ar')) setLangState(saved);
      })
      .catch(() => {
        // A failed read just means we keep the device default.
      });
    AsyncStorage.getItem(DIALECT_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'gulf' || saved === 'egypt')) setDialectState(saved);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'light' || saved === 'dark')) setThemeState(saved);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setThemeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Not fatal: the choice still applies for this session.
    });
  }, []);

  const setChoice = useCallback(
    (next: LanguageChoice) => {
      setLang(next === 'en' ? 'en' : 'ar');
      if (next === 'en') return;
      const d: Dialect = next === 'eg' ? 'egypt' : 'gulf';
      setDialectState(d);
      AsyncStorage.setItem(DIALECT_KEY, d).catch(() => {});
    },
    [setLang]
  );

  // Times are written for the active language wherever a label is built.
  setClockLang(lang);
  // And added(lang), read deep inside label builders, answers in the chosen Arabic.
  setDialect(dialect);
  // The colours every screen reads, set before any of them renders.
  applyTheme(theme);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isRTL: lang === 'ar',
      setLang,
      dialect,
      choice: choiceOf(lang, dialect),
      setChoice,
      theme,
      setTheme,
      t: twelveHour(inDialect(C[lang], lang, dialect), lang),
      acc: inDialect(ACC[lang], lang, dialect),
      setx: inDialect(SETX[lang], lang, dialect),
      evx: inDialect(EVX[lang], lang, dialect),
      fux: inDialect(FUX[lang], lang, dialect),
      pfx: inDialect(PFX[lang], lang, dialect),
      inline: inDialect(INLINE[lang], lang, dialect),
      a11y: inDialect(A11Y[lang], lang, dialect),
    }),
    [lang, setLang, dialect, setChoice, theme, setTheme]
  );

  if (!themeReady) return null;
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
 * The writing direction is set once, on each root a screen owns — `Screen`,
 * `Sheet`, `TabBar`, `Toast` — and everything inside resolves against it.
 * Yoga and CSS both lay out `flexDirection: 'row'` from the writing
 * direction's own start edge, and both resolve `paddingStart` / `paddingEnd`
 * and a column's `flex-start` / `flex-end` the same way. So inside a root
 * that sets `direction`, a row must stay `'row'`: writing `'row-reverse'` as
 * well mirrors it twice and puts it back the way it started.
 *
 * `row` is kept as a helper so a row that should follow the writing direction
 * says so, and so there is one place to explain this.
 *
 * Mirroring a *glyph* is different and still has to be asked for — a back
 * chevron is flipped with `scaleX`, see app/legal.tsx. Gestures convert the
 * other way, from a physical drag to a logical one: see TaskRow.
 */
export function useDirection() {
  const { isRTL } = useLanguage();
  return useMemo(
    () => ({
      isRTL,
      /** Always 'row'. See above — the direction on the root does the work. */
      row: 'row' as const,
      textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
      /** Degrees to rotate a right-pointing chevron so it points forward. */
      forwardChevron: isRTL ? 180 : 0,
    }),
    [isRTL]
  );
}
