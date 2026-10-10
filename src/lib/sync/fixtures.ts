/**
 * Objects shaped like the ones the screens make, for the sync tests: one of
 * each kind with every field set, and one with as few as the type allows.
 */
import { newId } from '../ids';
import type { Contact, FollowUp, HistoryEntry, Task } from '../model-types';
import type { LocalState } from './engine';

export function fullTask(over: Partial<Task> = {}): Task {
  return {
    id: newId(),
    type: 'meeting',
    title: 'Quarterly review',
    who: 'Faisal · Lawyer',
    contactIds: [],
    dueAt: '2026-10-11T09:30:00.000Z',
    remind: 'min_30',
    remindAt: '2026-10-11T09:00:00.000Z',
    status: 'open',
    notes: 'Bring the contract',
    goal: 'Agree the terms',
    points: ['Scope', 'Price'],
    draft: { subject: 'Tomorrow', body: 'See you at 9:30' },
    link: 'https://meet.example.com/abc',
    location: 'Office',
    platform: 'Zoom',
    durationMin: 45,
    host: 'Noura',
    lesson: 'Week 3',
    studyDays: [0, 2, 4],
    progress: { done: 3, total: 10 },
    createdVia: 'event_form',
    createdAt: '2026-10-10T08:00:00.000Z',
    sentConfirmedAt: '2026-10-10T08:05:00.000Z',
    ...over,
  };
}

export function bareTask(over: Partial<Task> = {}): Task {
  return {
    id: newId(),
    type: 'call',
    title: 'Call the bank',
    contactIds: [],
    dueAt: null,
    remind: null,
    status: 'open',
    points: [],
    createdVia: 'quick',
    createdAt: '2026-10-10T07:00:00.000Z',
    ...over,
  };
}

export function contact(over: Partial<Contact> = {}): Contact {
  return {
    id: newId(),
    name: 'Noura Al Saud',
    role: 'Designer',
    dial: '+966',
    phone: '501234567',
    email: 'noura@example.com',
    preferredChannel: 'whatsapp',
    rememberNote: 'Prefers mornings',
    lastLabel: 'Emailed · Sunday',
    touchedAt: '2026-10-09T10:00:00.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
    ...over,
  };
}

export function historyFor(contactId: string, over: Partial<HistoryEntry> = {}): HistoryEntry {
  return { id: newId(), contactId, kind: 'call', text: 'Talked about the launch', at: '2026-10-09T11:00:00.000Z', ...over };
}

export function followUp(over: Partial<FollowUp> = {}): FollowUp {
  return {
    id: newId(),
    contactId: null,
    taskId: null,
    channel: 'email',
    who: 'Noura · Designer',
    what: 'The proposal',
    status: 'waiting',
    since: 'Sent Sunday · follow up Tue',
    nextAt: '2026-10-13T09:00:00.000Z',
    lastAction: null,
    createdAt: '2026-10-11T09:00:00.000Z',
    ...over,
  };
}

export function emptyLocal(over: Partial<LocalState> = {}): LocalState {
  return {
    tasks: [],
    contacts: [],
    history: [],
    followUps: [],
    oneThing: null,
    prefs: {
      nudgeStyle: 'gentle',
      focusMinutes: 45,
      quietHours: { start: '22:00', end: '08:00' },
      channels: { whatsapp: true, email: true, call: true },
      sound: true,
      vibration: true,
    },
    profile: { name: 'Reem Ahmed', firstName: 'Reem', language: 'en', platform: 'ios' },
    authProvider: 'apple',
    ...over,
  };
}
