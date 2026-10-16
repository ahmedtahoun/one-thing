/**
 * Where a coach mark's bubble sits, and which way its arrow points.
 *
 * A coach mark is a dimmed screen with one control left bright, a box of
 * text near it and an arrow joining the two. The hard part is not the
 * drawing — it is that the control can be anywhere, including hard against
 * an edge, and the bubble must still end up on screen, not cover the thing
 * it is pointing at, and keep its arrow aimed at the control rather than at
 * where the bubble happened to land.
 *
 * All of that is arithmetic, so it lives here and is tested, rather than
 * being discovered on a phone. `CoachMarks.tsx` does the drawing.
 *
 * Coordinates are absolute, from `measureInWindow`, so **nothing here
 * depends on the writing direction**: a control in the top-left is in the
 * top-left in Arabic too. Only the words inside the bubble flip, which is
 * the component's business.
 */
export type Rect = { x: number; y: number; width: number; height: number };

export type Placement = {
  /**
   * Which window edge `offset` is measured from.
   *
   * Below a control the bubble hangs from its top, and growing taller is
   * harmless. Above one it is pinned by its *bottom*, so that however tall
   * the text makes it, its lower edge stays `gap` above the control. Pinning
   * the top there instead needs the height in advance, and being wrong by a
   * line puts the bubble over the very thing it is pointing at — which is
   * what the mic's mark did until a screenshot showed it.
   */
  from: 'top' | 'bottom';
  offset: number;
  left: number;
  width: number;
  /** `down` means the arrow is under the bubble, pointing at a control below. */
  arrow: 'up' | 'down';
  /** The arrow's centre, measured from the bubble's left edge. */
  arrowOffset: number;
};

export type PlaceOptions = {
  bubbleWidth: number;
  bubbleHeight: number;
  /** Space between the control and the bubble. */
  gap: number;
  /** Closest the bubble may come to a screen edge. */
  margin: number;
  /** Half the arrow's width: it may not sit nearer a corner than this plus the margin. */
  arrowHalf: number;
};

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), Math.max(low, high));

/**
 * Below the control by preference, above it when there is no room below.
 * "Room" counts the gap and the margin, so a bubble never sits flush
 * against the bottom of the screen just because it technically fitted.
 */
export function place(anchor: Rect, screen: { width: number; height: number }, options: PlaceOptions): Placement {
  const { bubbleWidth, bubbleHeight, gap, margin, arrowHalf } = options;

  // `bubbleHeight` decides which side only. Once the side is chosen the
  // bubble is pinned to the edge it grows away from, so the estimate being
  // a line out cannot push it over the control.
  const below = anchor.y + anchor.height + gap;
  const fitsBelow = below + bubbleHeight + margin <= screen.height;
  const arrow: 'up' | 'down' = fitsBelow ? 'up' : 'down';
  const from: 'top' | 'bottom' = fitsBelow ? 'top' : 'bottom';
  const offset = fitsBelow ? below : Math.max(margin, screen.height - (anchor.y - gap));

  const width = Math.min(bubbleWidth, screen.width - margin * 2);
  const centred = anchor.x + anchor.width / 2 - width / 2;
  const left = clamp(centred, margin, screen.width - margin - width);

  // The arrow follows the control, not the bubble, so it still points at the
  // right thing once the bubble has been pushed away from an edge. It stops
  // short of the corners, where an arrow would collide with the radius.
  const target = anchor.x + anchor.width / 2 - left;
  const arrowOffset = clamp(target, arrowHalf + margin, width - arrowHalf - margin);

  return { from, offset, left, width, arrow, arrowOffset };
}

/**
 * The bright hole over the control, grown by `pad` and kept inside the
 * screen. Separate from `place` because a step may highlight nothing at all
 * (a welcome line with no target), in which case there is no hole to cut.
 */
export function highlight(anchor: Rect, screen: { width: number; height: number }, pad: number): Rect {
  const x = Math.max(0, anchor.x - pad);
  const y = Math.max(0, anchor.y - pad);
  return {
    x,
    y,
    width: Math.min(anchor.width + pad * 2, screen.width - x),
    height: Math.min(anchor.height + pad * 2, screen.height - y),
  };
}
