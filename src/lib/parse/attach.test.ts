import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attachCommand } from './attach';

describe('attachCommand', () => {
  it('opens the camera for a card', () => {
    assert.equal(attachCommand('scan a card'), 'scan');
    assert.equal(attachCommand('Scan a business card'), 'scan');
    assert.equal(attachCommand('take a photo of this card'), 'scan');
    assert.equal(attachCommand('صور كرت'), 'scan');
    assert.equal(attachCommand('امسح بطاقة عمل'), 'scan');
  });

  it('opens the photo library when the card is already taken', () => {
    assert.equal(attachCommand('card from photos'), 'photo');
    assert.equal(attachCommand('add a business card from my gallery'), 'photo');
    assert.equal(attachCommand('كرت من الصور'), 'photo');
  });

  it('opens a file of contacts', () => {
    assert.equal(attachCommand('import my excel'), 'file');
    assert.equal(attachCommand('add contacts from a file'), 'file');
    assert.equal(attachCommand('read this csv'), 'file');
    assert.equal(attachCommand('import a pdf of contacts'), 'file');
    assert.equal(attachCommand('استورد ملف'), 'file');
    assert.equal(attachCommand('ضيف الناس من اكسل'), 'file');
  });

  it('needs a word for what is being opened, so a task is still a task', () => {
    assert.equal(attachCommand('Scan the contract tomorrow'), null);
    assert.equal(attachCommand('Send Omar the spreadsheet'), null);
    assert.equal(attachCommand('Call Sara about the file'), null);
    assert.equal(attachCommand('ابعت لعمر الملف'), null);
  });

  it('is null for anything that asks for nothing to be opened', () => {
    assert.equal(attachCommand(''), null);
    assert.equal(attachCommand('hello'), null);
    assert.equal(attachCommand("what's late?"), null);
    assert.equal(attachCommand('my excel'), null);
  });
});
