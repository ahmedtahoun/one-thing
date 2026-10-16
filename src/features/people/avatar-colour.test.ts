import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyTheme } from '@/design/theme';

import { avatarColour } from './avatar-colour';

describe('avatarColour', () => {
  it('gives the same person the same colour every time, whatever the case or spacing', () => {
    assert.deepEqual(avatarColour('Sara Khan'), avatarColour('  sara khan '));
  });
  it('spreads different people across the palette', () => {
    const names = ['Sara', 'Omar', 'Layla', 'Faisal', 'Noura', 'Khalid', 'Huda', 'Yusuf', 'Mona', 'Ali'];
    assert.ok(new Set(names.map((n) => avatarColour(n).bg)).size >= 4);
  });
  it('keeps each person on the same hue in dark, with a light letter on a deep tint', () => {
    const light = avatarColour('Sara Khan');
    applyTheme('dark');
    const dark = avatarColour('Sara Khan');
    applyTheme('light');
    assert.notDeepEqual(dark, light);
    const brightness = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    assert.ok(brightness(dark.bg) < 250 && brightness(dark.fg) > 400);
  });
  it('copes with Arabic and empty names', () => {
    assert.ok(avatarColour('سارة').bg);
    assert.ok(avatarColour('').bg);
  });
});
