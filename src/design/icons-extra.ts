/**
 * Icons added after the handoff, in the same 24-unit line style. The handoff's
 * own set (icon-paths.ts) is generated and is not edited by hand, so anything
 * the product needed beyond it lives here and `Icon` looks in both.
 */
import type { IconPart } from './icon-paths';

export const EXTRA_ICONS: Record<string, IconPart[]> = {
  // Three dots in a row: "more".
  menu: [
    ['circle', { cx: 5.5, cy: 12, r: 1.1 }],
    ['circle', { cx: 12, cy: 12, r: 1.1 }],
    ['circle', { cx: 18.5, cy: 12, r: 1.1 }],
  ],
  // A sun: the dark-mode switch shows it while dark, to go back to light.
  sun: [
    ['circle', { cx: 12, cy: 12, r: 4 }],
    ['path', 'M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6'],
  ],
  // A camera: scan a card.
  camera: [
    ['path', 'M4 8h3l1.6-2.2h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'],
    ['circle', { cx: 12, cy: 13.2, r: 3.4 }],
  ],
  // A paperclip: attach a card or a file.
  clip: [
    ['path', 'M20.4 11.6 12 20a5.2 5.2 0 0 1-7.4-7.4l8.1-8.1a3.5 3.5 0 0 1 4.9 4.9l-8.1 8.1a1.7 1.7 0 0 1-2.5-2.5l7.5-7.4'],
  ],
  // A stack of cards: scan many. One card with its lines, and one behind it.
  cards: [
    ['path', 'M7 6.5h12.2a1.3 1.3 0 0 1 1.3 1.3v9.4'],
    ['rect', { x: 3, y: 9, width: 14.5, height: 10.5, rx: 1.6 }],
    ['path', 'M6.4 13h7.7M6.4 16h4.6'],
  ],
};
