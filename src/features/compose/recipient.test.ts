import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mailHtml } from './recipient';

describe('the email body for the mail sheet', () => {
  it('keeps the lines and shows < > & as written', () => {
    assert.equal(mailHtml('Dear Sara,\n\nPrice < 5 & more > 2\r\nAhmed'), '<div dir="auto">Dear Sara,<br><br>Price &lt; 5 &amp; more &gt; 2<br>Ahmed</div>');
  });
});
