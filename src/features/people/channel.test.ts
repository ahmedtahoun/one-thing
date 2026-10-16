import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canReach, lastChannelFor, primaryChannel } from './channel';
import type { Contact, FollowUp, HistoryEntry } from '@/lib/model-types';

const person = (over: Partial<Contact> = {}): Contact => ({ id: 'a', name: 'A', createdAt: '2026-10-10T09:00:00.000Z', ...over });

describe('canReach', () => {
  it('needs a number for WhatsApp and calls, and an address for email', () => {
    const p = person({ phone: '501234567' });
    assert.equal(canReach(p, 'whatsapp'), true);
    assert.equal(canReach(p, 'call'), true);
    assert.equal(canReach(p, 'email'), false);
    assert.equal(canReach(person({ email: ' ' }), 'email'), false);
  });
});

describe('primaryChannel', () => {
  it('uses their chosen channel when it can work', () => {
    assert.equal(primaryChannel(person({ phone: '5', email: 'a@b.co', preferredChannel: 'email' })), 'email');
  });
  it('falls back when the chosen one has nothing to go on', () => {
    assert.equal(primaryChannel(person({ phone: '501234567', preferredChannel: 'email' })), 'whatsapp');
    assert.equal(primaryChannel(person({ email: 'a@b.co', preferredChannel: 'call' })), 'email');
  });
  it('picks WhatsApp first, then email', () => {
    assert.equal(primaryChannel(person({ phone: '501234567', email: 'a@b.co' })), 'whatsapp');
  });
  it('is null for someone with no way to reach them yet', () => {
    assert.equal(primaryChannel(person()), null);
  });
});

describe('lastChannelFor', () => {
  const h = (contactId: string, kind: HistoryEntry['kind'], at: string): HistoryEntry => ({ id: kind + at, contactId, kind, text: '', at });
  const f = (contactId: string, channel: FollowUp['channel'], createdAt: string): FollowUp => ({
    id: channel + createdAt,
    contactId,
    channel,
    who: 'A',
    what: 'x',
    status: 'waiting',
    since: '',
    createdAt,
  });

  it('takes the latest call, email or WhatsApp in the history', () => {
    const history = [h('a', 'call', '2026-10-01T10:00:00Z'), h('a', 'email', '2026-10-05T10:00:00Z'), h('b', 'whatsapp', '2026-10-09T10:00:00Z')];
    assert.equal(lastChannelFor('a', history, []), 'email');
    assert.equal(lastChannelFor('b', history, []), 'whatsapp');
  });
  it('ignores moments that are not a way of reaching them', () => {
    assert.equal(lastChannelFor('a', [h('a', 'note', '2026-10-05T10:00:00Z'), h('a', 'meeting', '2026-10-06T10:00:00Z')], []), null);
  });
  it('falls back on the follow-ups, and a newer one beats an older history entry', () => {
    assert.equal(lastChannelFor('a', [], [f('a', 'whatsapp', '2026-10-05T10:00:00Z')]), 'whatsapp');
    assert.equal(lastChannelFor('a', [h('a', 'call', '2026-10-01T10:00:00Z')], [f('a', 'email', '2026-10-05T10:00:00Z')]), 'email');
  });
  it('is null for someone never reached', () => {
    assert.equal(lastChannelFor('z', [], []), null);
  });
});
