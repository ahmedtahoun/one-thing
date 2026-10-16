/**
 * The support link opens a draft addressed to us, with the text intact — the
 * Arabic included. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SUPPORT_EMAIL, supportMailUrl } from './support';

describe('supportMailUrl', () => {
  it('is addressed to support and carries a subject and body', () => {
    const url = supportMailUrl('Help & feedback', 'Version 1.0.0\nios');
    assert.ok(url.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`));
    const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    assert.equal(query.get('subject'), 'Help & feedback');
    assert.equal(query.get('body'), 'Version 1.0.0\nios');
  });

  it('keeps Arabic text and symbols intact', () => {
    const url = supportMailUrl('مساعدة وملاحظات', 'وش صار؟ & ?');
    const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    assert.equal(query.get('subject'), 'مساعدة وملاحظات');
    assert.equal(query.get('body'), 'وش صار؟ & ?');
  });
});
