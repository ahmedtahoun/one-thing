/**
 * Speech to text for Quick capture and Brain dump.
 *
 * On a phone it is the platform's own recogniser, through
 * `expo-speech-recognition` (SFSpeechRecognizer on iOS, SpeechRecognizer on
 * Android). The first tap asks for the microphone and speech permissions; the
 * strings for both are in app.json. Where the platform has none — or the
 * device has no recogniser for the language — `startListening` returns null
 * and the screens fall back to typing, which both already offer. A browser
 * with the Web Speech API is used the same way, which keeps the web harness
 * working. BUILD-REVIEW.md §2.35.
 *
 * This needs the native module, so it works in a build made after the package
 * was added, not in an older one: there the require below fails and the
 * screens simply type.
 */
import { Platform } from 'react-native';

import { bestHeard } from './parse/spoken';
import { pickLocale } from './speech-locale';

export type ListenFailure = 'denied' | 'failed';

export type ListenOptions = {
  /** Names the person has: the recogniser favours them, and the reading that contains one wins. */
  names?: string[];
  /** Stop on its own this long after the last word, once something was said. */
  autoStopMs?: number;
  /** The running transcript while it is being said. */
  onPartial?: (text: string) => void;
};

/** The device's region ("EG"), so a number or a dialect is read the way the person's phone is set. */
export function deviceRegion(): string | undefined {
  try {
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    return getLocales()[0]?.regionCode ?? undefined;
  } catch {
    return undefined;
  }
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionClass(): (new () => Recognition) | null {
  const g = globalThis as unknown as Record<string, unknown>;
  const R = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  return typeof R === 'function' ? (R as new () => Recognition) : null;
}

export function speechAvailable(): boolean {
  return Platform.OS === 'web' ? recognitionClass() !== null : nativeModule()?.isRecognitionAvailable() === true;
}

function startWeb(lang: 'en' | 'ar', onDone: (text: string) => void): (() => void) | null {
  const R = recognitionClass();
  if (!R) return null;
  const rec = new R();
  rec.lang = pickLocale(lang, [], deviceRegion());
  rec.interimResults = false;
  rec.continuous = true;
  let heard = '';
  rec.onresult = (e) => {
    heard = Array.from(e.results)
      .map((r) => r[0]?.transcript ?? '')
      .join(' ')
      .trim();
  };
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onDone(heard);
  };
  rec.onend = finish;
  rec.onerror = finish;
  try {
    rec.start();
  } catch {
    return null;
  }
  return () => rec.stop();
}

type NativeModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

/** The native module, or null when this build does not contain it. */
function nativeModule(): NativeModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // Required lazily so a build without the module, and the web bundle, never load it.
    return (require('expo-speech-recognition') as typeof import('expo-speech-recognition')).ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

/** What the device can recognise, asked once per language. */
const localeCache = new Map<string, string>();

async function localeFor(mod: NativeModule, lang: 'en' | 'ar'): Promise<string> {
  const cached = localeCache.get(lang);
  if (cached) return cached;
  let supported: string[] = [];
  try {
    supported = (await mod.getSupportedLocales({})).locales;
  } catch {
    // Older Android lists nothing; the default for the region is used.
  }
  const locale = pickLocale(lang, supported, deviceRegion());
  localeCache.set(lang, locale);
  return locale;
}

/** The words worth giving the recogniser: the person's names, first names too. */
function hintsFrom(names: string[] = []): string[] {
  const out = new Set<string>();
  for (const name of names) {
    const full = name.trim();
    if (!full) continue;
    out.add(full);
    const first = full.split(/\s+/)[0];
    if (first) out.add(first);
  }
  return [...out].slice(0, 100);
}

function startNative(
  mod: NativeModule,
  lang: 'en' | 'ar',
  onDone: (text: string) => void,
  onError?: (why: ListenFailure) => void,
  options: ListenOptions = {}
): (() => void) | null {
  if (!mod.isRecognitionAvailable()) return null;

  // Final segments, plus the running guess for the one still being spoken.
  const finals: string[] = [];
  let interim = '';
  let stopped = false;
  let finished = false;
  let lastHeard = 0;
  let silence: ReturnType<typeof setInterval> | null = null;
  const subscriptions: { remove: () => void }[] = [];
  const names = options.names ?? [];

  const heardSoFar = () => [...finals, interim].join(' ').trim();

  const finish = (why?: ListenFailure) => {
    if (finished) return;
    finished = true;
    if (silence) clearInterval(silence);
    for (const subscription of subscriptions) subscription.remove();
    if (why) onError?.(why);
    onDone(why ? '' : heardSoFar());
  };

  const stop = () => {
    stopped = true;
    try {
      mod.stop();
    } catch {
      finish();
    }
  };

  subscriptions.push(
    mod.addListener('result', (event) => {
      lastHeard = Date.now();
      if (event.isFinal) {
        const transcript = bestHeard(event.results, names);
        if (transcript) finals.push(transcript);
        interim = '';
      } else {
        interim = event.results[0]?.transcript?.trim() ?? '';
      }
      options.onPartial?.(heardSoFar());
    }),
    mod.addListener('error', (event) => {
      // Silence and a deliberate stop are not failures: just nothing heard.
      if (event.error === 'no-speech' || event.error === 'aborted') return finish();
      finish(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'denied' : 'failed');
    }),
    mod.addListener('end', () => finish())
  );

  mod
    .requestPermissionsAsync()
    .then(async (permission) => {
      if (!permission.granted) return finish('denied');
      if (stopped) return finish();
      const locale = await localeFor(mod, lang);
      if (stopped) return finish();
      mod.start({
        lang: locale,
        interimResults: true,
        continuous: true,
        maxAlternatives: 3,
        contextualStrings: hintsFrom(names),
        addsPunctuation: false,
        iosTaskHint: 'dictation',
      });
      // A person who has finished a sentence should not have to find the stop button.
      if (options.autoStopMs) {
        silence = setInterval(() => {
          if (!stopped && lastHeard && Date.now() - lastHeard > (options.autoStopMs ?? 0)) stop();
        }, 300);
      }
    })
    .catch(() => finish('failed'));

  return stop;
}

/**
 * Starts listening. `onDone` gets everything heard, or '' if nothing was;
 * `onError` says why when it could not listen at all (permission refused, or
 * the recogniser failed), just before `onDone('')`. Returns a function that
 * stops listening, or null when there is no recogniser to start.
 */
export function startListening(
  lang: 'en' | 'ar',
  onDone: (text: string) => void,
  onError?: (why: ListenFailure) => void,
  options?: ListenOptions
): (() => void) | null {
  const native = nativeModule();
  if (native) return startNative(native, lang, onDone, onError, options);
  return startWeb(lang, onDone);
}
