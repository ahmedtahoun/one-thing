/**
 * Speech to text for Quick capture and Brain dump.
 *
 * The prototype only pretends: tap the mic and, 2.6 s later, it "hears" its
 * own sample sentence. There is no recogniser in this build yet — that is a
 * decision still to make (on-device recognition, or the audio sent to the
 * backend with the text request) and it needs the microphone and speech
 * permission strings (DATA_MODEL § Integrations). BUILD-REVIEW.md §2.28.
 *
 * Until then: where the platform has one built in — a browser with the Web
 * Speech API — it is used; everywhere else `startListening` returns null and
 * the screens fall back to typing, which both already offer.
 */

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
  return recognitionClass() !== null;
}

/**
 * Starts listening. `onDone` gets everything heard, or '' if nothing was.
 * Returns a function that stops listening, or null when there is no
 * recogniser to start.
 */
export function startListening(lang: 'en' | 'ar', onDone: (text: string) => void): (() => void) | null {
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
