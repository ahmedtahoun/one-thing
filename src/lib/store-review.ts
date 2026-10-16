/**
 * "Rate The One Thing": the system's own review prompt, through
 * `expo-store-review`. iOS decides whether to show it (it limits how often,
 * and never shows it in TestFlight builds), so asking is all the app can do.
 *
 * The native module is required lazily: a build made before the package was
 * added, and the web bundle, have none, and `requestAppReview` then reports
 * 'unavailable' instead of crashing the screen that calls it.
 */
import { Platform } from 'react-native';

export type ReviewResult = 'asked' | 'unavailable';

export async function requestAppReview(): Promise<ReviewResult> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const StoreReview = require('expo-store-review') as typeof import('expo-store-review');
    if (!(await StoreReview.isAvailableAsync())) return 'unavailable';
    await StoreReview.requestReview();
    return 'asked';
  } catch {
    return 'unavailable';
  }
}
