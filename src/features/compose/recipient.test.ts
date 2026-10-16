import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { emailValid, mailHtml, mailtoUrl } from './recipient';

describe('the email body for the mail sheet', () => {
  it('keeps the lines and shows < > & as written', () => {
    assert.equal(mailHtml('Dear Sara,\n\nPrice < 5 & more > 2\r\nAhmed'), '<div dir="auto">Dear Sara,<br><br>Price &lt; 5 &amp; more &gt; 2<br>Ahmed</div>');
  });
});

describe('an address cannot steer the link it goes into', () => {
  it('still accepts the addresses people really have', () => {
    for (const ok of ['omar@ledgerco.sa', 'sara_99@outlook.com', "a.b+tag@sub.example.co.uk", 'khalid@onlyonething.app']) {
      assert.ok(emailValid(ok), ok);
    }
  });

  it('refuses the mailto separators', () => {
    // "omar@x.sa?body=hello" produced
    // "mailto:omar@x.sa?body=hello?subject=…&body=…", and the mail app reads
    // the first body — so the message sent is not the one the app showed.
    // A second @ was already refused, which is the only reason the ?bcc=
    // form never worked: incidental, not a defence.
    for (const bad of ['omar@x.sa?body=hello', 'omar@x.sa&cc=y.sa', 'omar@x.sa#frag', 'omar@x.sa?bcc=z@q.sa']) {
      assert.equal(emailValid(bad), false, bad);
    }
  });

  it('builds a plain link for a plain address', () => {
    assert.equal(mailtoUrl('omar@ledgerco.sa', 'Hi', 'Body'), 'mailto:omar@ledgerco.sa?subject=Hi&body=Body');
  });
});
