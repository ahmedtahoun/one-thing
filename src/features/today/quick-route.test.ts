/**
 * Every quick-action tile goes somewhere that matches its label. Run with
 * `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { quickActionRoute } from './quick-route';
import { isEventType } from '@/features/event/model';

describe('quick-action routes', () => {
  it('sends the three channels to People to pick someone', () => {
    assert.equal(quickActionRoute('call'), '/people?pick=call');
    assert.equal(quickActionRoute('email'), '/people?pick=email');
    assert.equal(quickActionRoute('whatsapp'), '/people?pick=whatsapp');
  });

  it('sends Remind to Quick capture', () => {
    assert.equal(quickActionRoute('reminder'), '/capture');
  });

  it('sends the four events to the event form, each as itself', () => {
    for (const type of ['visit', 'meeting', 'webinar', 'course'] as const) {
      assert.equal(quickActionRoute(type), `/new?type=${type}`);
    }
  });

  it('never sends a non-event type to the event form, which would open a Meeting', () => {
    for (const type of ['call', 'email', 'whatsapp', 'reminder'] as const) {
      assert.equal(isEventType(type), false);
      assert.ok(!quickActionRoute(type).startsWith('/new'));
    }
  });
});
