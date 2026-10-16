/**
 * The one-time password an admin is handed. Run with `npm test` in `admin/`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { newPassword } from './password';

describe('a one-time admin password', () => {
  it('is long enough to be worth generating', () => {
    // 16 bytes in base64url: 22 characters, ~128 bits. The setup page's own
    // floor for a typed password is 10 characters; this clears it easily.
    const p = newPassword();
    assert.equal(p.length, 22);
    assert.ok(p.length >= 10);
  });

  it('uses only characters that survive being read aloud or pasted', () => {
    for (let i = 0; i < 200; i++) assert.match(newPassword(), /^[A-Za-z0-9_-]+$/);
  });

  it('is different every time', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(newPassword());
    assert.equal(seen.size, 1000, 'a password repeated');
  });
});
