/**
 * A horizontal row of chips that runs to the screen's edges: the scroll view
 * is pulled out by the screen's side padding and its content pushed back in,
 * so chips scroll off the edge instead of stopping short of it.
 *
 * Only left to right. In Arabic, on an iPhone, the same pull-and-push left
 * the row's first chip cut off at the right edge (Home's filters, found on a
 * phone), while People's row, which never bled, started where it should. So
 * a right-to-left row stays inside the padding, as People's does.
 */
import type { ViewStyle } from 'react-native';

export function bleed(isRTL: boolean, inset: number): { style: ViewStyle; content: ViewStyle } {
  return isRTL ? { style: {}, content: {} } : { style: { marginHorizontal: -inset }, content: { paddingHorizontal: inset } };
}
