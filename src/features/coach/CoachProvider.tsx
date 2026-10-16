/**
 * Where the coach marks' targets are on screen.
 *
 * A screen marks a control with `useCoachAnchor('oneThing')` and carries on
 * knowing nothing else about the tour: no state, no conditional rendering,
 * no import of the overlay. That matters because the tour is a thing that
 * happens *once*, and a screen that has to think about it every render
 * would be paying for it forever.
 *
 * Positions are measured with `measureInWindow`, so they are absolute
 * window coordinates and need no correction for the writing direction or
 * for how far the page has scrolled. They are re-measured on every layout,
 * which is what keeps a mark aimed at the right place after the keyboard
 * opens or the list grows.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { View } from 'react-native';

import type { Rect } from './geometry';

type Anchors = Record<string, Rect>;

type CoachValue = {
  anchors: Anchors;
  measure: (name: string, view: View | null) => void;
};

const CoachContext = createContext<CoachValue | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const [anchors, setAnchors] = useState<Anchors>({});
  const views = useRef<Record<string, View | null>>({});

  const measure = useCallback((name: string, view: View | null) => {
    views.current[name] = view;
    if (!view) return;
    // measureInWindow is asynchronous and fires after layout; a view that
    // is not on screen yet reports zeroes, which are ignored rather than
    // stored, so a stale real position beats a fresh meaningless one.
    view.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      setAnchors((current) => {
        const was = current[name];
        if (was && was.x === x && was.y === y && was.width === width && was.height === height) return current;
        return { ...current, [name]: { x, y, width, height } };
      });
    });
  }, []);

  const value = useMemo(() => ({ anchors, measure }), [anchors, measure]);
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

/**
 * Marks a control as a coach-mark target. Spread the result onto a `View`:
 * it supplies both the ref and an `onLayout` that re-measures.
 *
 * Outside a `CoachProvider` it returns empty props, so a screen can be
 * rendered in a test or a harness without one.
 */
export function useCoachAnchor(name: string): { ref?: (view: View | null) => void; onLayout?: () => void } {
  const context = useContext(CoachContext);
  const held = useRef<View | null>(null);

  const ref = useCallback(
    (view: View | null) => {
      held.current = view;
      context?.measure(name, view);
    },
    [context, name]
  );

  const onLayout = useCallback(() => context?.measure(name, held.current), [context, name]);

  if (!context) return {};
  return { ref, onLayout };
}

export function useCoachAnchors(): Anchors {
  return useContext(CoachContext)?.anchors ?? {};
}
