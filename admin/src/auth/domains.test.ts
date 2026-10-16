/**
 * Who the gate lets through. Run with `npm test` in `admin/`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ADMIN_EMAIL_DOMAINS, adminDomainList, isAdminEmail } from './domains';

describe('an admin’s email', () => {
  it('accepts both of the team’s domains', () => {
    assert.ok(isAdminEmail('khalid@onlyonething.app'));
    assert.ok(isAdminEmail('info@wheretospot.com'));
  });

  it('does not mind how it was typed', () => {
    assert.ok(isAdminEmail('  Info@WhereToSpot.com  '));
    assert.ok(isAdminEmail('KHALID@ONLYONETHING.APP'));
  });

  it('refuses an address on any other domain', () => {
    for (const no of ['someone@gmail.com', 'ahmed@wheretospot.net', 'test@onlyonething.com', '']) {
      assert.equal(isAdminEmail(no), false, no);
    }
  });

  /**
   * The reason the check is `@domain` and not `domain`: a lookalike must not
   * pass. Each of these ends with the letters of a real domain and is not
   * one of ours — a registered `bonlyonething.app`, or any domain whose
   * owner adds `onlyonething.app` as a subdomain or a suffix.
   */
  it('refuses a lookalike that merely ends the same way', () => {
    for (const no of [
      'someone@bonlyonething.app',
      'someone@mail.onlyonething.app',
      'someone@onlyonething.app.attacker.com',
      'someone@wheretospot.com.attacker.com',
      'someone@notwheretospot.com',
      'onlyonething.app@gmail.com',
    ]) {
      assert.equal(isAdminEmail(no), false, no);
    }
  });

  it('names every domain in the message that refuses one', () => {
    const said = adminDomainList();
    for (const domain of ADMIN_EMAIL_DOMAINS) assert.ok(said.includes(`@${domain}`), domain);
    assert.equal(said, '@onlyonething.app or @wheretospot.com');
  });

  /**
   * Passing this gate is not being an admin. It is the first of three — a
   * Supabase Auth account with a verified authenticator, and a row in
   * `admin_member`, decide the rest (`session.ts`). Worth stating, because
   * adding a domain here is otherwise easy to read as handing out access.
   */
  it('is a domain check and nothing more', () => {
    assert.ok(isAdminEmail('nobody-has-this-account@wheretospot.com'));
  });
});
