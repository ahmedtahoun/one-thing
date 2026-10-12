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

export type ListenFailure = 'denied' | 'failed';

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
  rec.lang = lang === 'ar' ? 'ar-SA' : 'en-GB';
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

function startNative(
  mod: NativeModule,
  lang: 'en' | 'ar',
  onDone: (text: string) => void,
  onError?: (why: ListenFailure) => void
): (() => void) | null {
  if (!mod.isRecognitionAvailable()) return null;

  // Final segments, plus the running guess for the one still being spoken.
  const finals: string[] = [];
  let interim = '';
  let stopped = false;
  let finished = false;
  const subscriptions: { remove: () => void }[] = [];

  const finish = (why?: ListenFailure) => {
    if (finished) return;
    finished = true;
    for (const subscription of subscriptions) subscription.remove();
    if (why) onError?.(why);
    onDone(why ? '' : [...finals, interim].join(' ').trim());
  };

  subscriptions.push(
    mod.addListener('result', (event) => {
      const transcript = event.results[0]?.transcript?.trim() ?? '';
      if (event.isFinal) {
        if (transcript) finals.push(transcript);
        interim = '';
      } else {
        interim = transcript;
      }
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
    .then((permission) => {
      if (!permission.granted) return finish('denied');
      if (stopped) return finish();
      mod.start({ lang: lang === 'ar' ? 'ar-SA' : 'en-GB', interimResults: true, continuous: true });
    })
    .catch(() => finish('failed'));

  return () => {
    stopped = true;
    try {
      mod.stop();
    } catch {
      finish();
    }
  };
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
  onError?: (why: ListenFailure) => void
): (() => void) | null {
  const native = nativeModule();
  if (native) return startNative(native, lang, onDone, onError);
  return startWeb(lang, onDone);
}
