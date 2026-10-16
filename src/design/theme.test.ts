import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { applyTheme, currentTheme } from './theme';
import { ink, planBadge, status, surface, typeColour } from './tokens';

afterEach(() => applyTheme('light'));

const luminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const [r = 0, g = 0, b = 0] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('the accent', () => {
  it('carries its text at readable contrast in both themes', () => {
    assert.ok(contrast(ink.solid, '#FFFFFF') >= 4.5, `light: ${contrast(ink.solid, '#FFFFFF').toFixed(2)}`);
    applyTheme('dark');
    assert.ok(contrast(ink.solid, surface.white) >= 4.5, `dark: ${contrast(ink.solid, surface.white).toFixed(2)}`);
  });
});

describe('light theme', () => {
  it('keeps text, labels and hints at readable contrast on white', () => {
    for (const [name, colour] of Object.entries({ base: ink.base, s2: ink.s2, s3: ink.s3, s4: ink.s4, s5: ink.s5 })) {
      assert.ok(contrast(colour, surface.white) >= 4.5, `ink.${name}: ${contrast(colour, surface.white).toFixed(2)}`);
    }
  });
});

describe('applyTheme', () => {
  it('starts light and goes back to exactly what it was', () => {
    const before = JSON.stringify({ ink, surface, status, typeColour });
    assert.equal(currentTheme(), 'light');
    applyTheme('dark');
    assert.equal(currentTheme(), 'dark');
    assert.notEqual(JSON.stringify({ ink, surface, status, typeColour }), before);
    applyTheme('light');
    assert.equal(JSON.stringify({ ink, surface, status, typeColour }), before);
  });

  it('turns the page dark and the text light', () => {
    applyTheme('dark');
    assert.ok(luminance(surface.white) < 0.05);
    assert.ok(luminance(ink.base) > 0.8);
  });

  it('keeps text readable on the page and on a card in dark', () => {
    applyTheme('dark');
    for (const [name, colour] of Object.entries({ base: ink.base, s2: ink.s2, s3: ink.s3, s4: ink.s4 })) {
      assert.ok(contrast(colour, surface.white) >= 4.5, `ink.${name} on the page: ${contrast(colour, surface.white).toFixed(2)}`);
      assert.ok(contrast(colour, surface.fill) >= 4.5, `ink.${name} on a chip: ${contrast(colour, surface.fill).toFixed(2)}`);
    }
    assert.ok(contrast(ink.s5, surface.white) >= 4.5, 'hints stay legible');
  });

  it('keeps a type colour readable on its own tint, and status text on the page', () => {
    applyTheme('dark');
    for (const [name, { fg, bg }] of Object.entries(typeColour)) {
      assert.ok(contrast(fg, bg) >= 4.5, `${name}: ${contrast(fg, bg).toFixed(2)}`);
    }
    for (const key of ['dangerFg', 'overdueFg', 'successFg', 'invalid'] as const) {
      assert.ok(contrast(status[key], surface.white) >= 4.5, `${key}: ${contrast(status[key], surface.white).toFixed(2)}`);
    }
  });

  it('keeps a primary button readable: dark text on the light button', () => {
    applyTheme('dark');
    assert.ok(contrast(surface.white, ink.base) >= 7);
  });
});

/**
 * The badge's gradients are the one place in the app where text sits on a
 * colour that *varies*, so the usual "foreground on background" check is not
 * enough: it has to hold at the worst stop. For a light badge that is the
 * lightest stop, for a dark one the darkest, and `pairs` names both ends so
 * neither can be quietly brightened later.
 *
 * This is not hypothetical. The first green drawn for Pro started at
 * #00A184, which carries white at 3.26:1.
 */
describe('the plan badge', () => {
  const ends = () => [
    ['pro, top', planBadge.proText, planBadge.proTop],
    ['pro, bottom', planBadge.proText, planBadge.proBottom],
    ['plus, top', planBadge.plusText, planBadge.plusTop],
    ['plus, bottom', planBadge.plusText, planBadge.plusBottom],
    ['trial', planBadge.trialText, planBadge.trialBg],
  ] as const;

  it('carries its text at both ends of every gradient, in light', () => {
    for (const [name, fg, bg] of ends()) {
      assert.ok(contrast(fg, bg) >= 4.5, `${name}: ${contrast(fg, bg).toFixed(2)}`);
    }
  });

  it('…and in dark', () => {
    applyTheme('dark');
    for (const [name, fg, bg] of ends()) {
      assert.ok(contrast(fg, bg) >= 4.5, `${name}: ${contrast(fg, bg).toFixed(2)}`);
    }
  });

  it('gives Pro and Pro+ different ink, so the tiers are told apart by more than a word', () => {
    assert.notEqual(planBadge.proTop, planBadge.plusTop);
    applyTheme('dark');
    assert.notEqual(planBadge.proTop, planBadge.plusTop);
  });
});
