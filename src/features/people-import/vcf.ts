/**
 * Reading a vCard (.vcf) — what a phone's "share contacts" and Google
 * Contacts' export produce. One file can hold any number of people.
 */

export type VcfRow = { name: string; phone: string; email: string; company: string; title: string };

/** A line folded onto the next ("\n " or "\n\t") is one line. */
const unfold = (text: string): string[] => text.replace(/\r\n|\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');

const unescape = (s: string): string => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

export function parseVcf(text: string): VcfRow[] {
  const people: VcfRow[] = [];
  let current: (VcfRow & { cell: string; family: string; given: string }) | null = null;

  for (const raw of unfold(text.replace(/^﻿/, ''))) {
    const line = raw.trim();
    if (/^BEGIN:VCARD/i.test(line)) {
      current = { name: '', phone: '', email: '', company: '', title: '', cell: '', family: '', given: '' };
      continue;
    }
    if (/^END:VCARD/i.test(line)) {
      if (current) {
        const name = current.name || [current.given, current.family].filter(Boolean).join(' ') || current.company;
        people.push({ name, phone: current.cell || current.phone, email: current.email, company: current.company, title: current.title });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    // "item1.TEL;TYPE=CELL" → property TEL, parameters TYPE=CELL.
    const [head = '', ...params] = (line.slice(0, colon).split(';') as string[]);
    const property = (head.split('.').pop() ?? '').toUpperCase();
    const value = line.slice(colon + 1);
    const cell = params.some((p) => /CELL|MOBILE|IPHONE/i.test(p));

    if (property === 'FN') current.name = unescape(value);
    else if (property === 'N') {
      const [family = '', given = ''] = value.split(';');
      current.family = unescape(family);
      current.given = unescape(given);
    } else if (property === 'TEL') {
      const number = unescape(value).replace(/^tel:/i, '');
      if (cell && !current.cell) current.cell = number;
      else if (!current.phone) current.phone = number;
    } else if (property === 'EMAIL') {
      if (!current.email) current.email = unescape(value);
    } else if (property === 'ORG') current.company = unescape(value.split(';')[0] ?? '');
    else if (property === 'TITLE') current.title = unescape(value);
  }
  return people;
}
