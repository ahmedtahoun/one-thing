/**
 * Turning rows of a spreadsheet into contacts.
 *
 * Nobody's file has the columns the app wants, named the way it wants them:
 * "Mobile", "Phone 1 - Value", "الجوال", "Full Name", or no header row at
 * all. So columns are matched by what their header says — in English or
 * Arabic — and, with no header, by what the cells look like. Nothing is saved
 * here; the Import screen shows the result for the person to tick.
 */
import { findDuplicate } from '@/features/contact/form-rules';
import type { Contact } from '@/lib/model-types';
import { splitDialled } from '@/lib/parse/contact';
import { normalizeArabic } from '@/lib/parse/names';
import { westernDigits } from '@/lib/parse/spoken';
import type { VcfRow } from './vcf';

type Role = 'name' | 'first' | 'last' | 'phone' | 'email' | 'company' | 'title';

/** What can be wrong with a row. `no-name` stops it being imported; the others only drop that one detail. */
export type Issue = 'no-name' | 'bad-email' | 'bad-phone';

export type Candidate = {
  /** Its row in the file, for a stable list key. */
  key: string;
  name: string;
  /** "Title · Company", as the contact form shows it. */
  role?: string;
  dial?: string;
  phone?: string;
  email?: string;
  issues: Issue[];
  /** The contact already in People (or earlier in the file) this one matches. */
  duplicateOf?: string;
};

// Headers, folded: lower case, Arabic spellings merged, punctuation as spaces.
const fold = (s: string): string =>
  normalizeArabic(s.toLowerCase())
    .replace(/[_\-./:()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Checked in this order, so "Organization Title" is a title and "Company Name" a company, not a name. */
const HEADER_RULES: [Role, RegExp][] = [
  ['email', /\b(e ?mail|mail)\b|البريد|ايميل/],
  ['phone', /\b(phone|mobile|cell|cellphone|tel|telephone|whatsapp|number|gsm)\b|جوال|موبايل|هاتف|تليفون|واتس|رقم/],
  ['first', /\b(first|given|forename)\b|الاول/],
  ['last', /\b(last|surname|family)\b|العايل|العائل|الكني|اللقب/],
  ['title', /\b(title|position|role|job|designation)\b|الوظيف|المسمي|المنصب/],
  ['company', /\b(company|organi[sz]ation|org|business|employer)\b|الشرك|المؤسس|جهه العمل/],
  ['name', /\b(name|contact)\b|الاسم|اسم/],
];
/** "Phone 1 - Type" holds "Mobile", not a number. */
const NOT_A_VALUE = /\b(type|label)\b|نوع/;

function roleOfHeader(header: string): Role | null {
  const h = fold(header);
  if (!h || NOT_A_VALUE.test(h)) return null;
  for (const [role, rule] of HEADER_RULES) if (rule.test(h)) return role;
  return null;
}

const EMAIL = /[^\s@<>,;"']+@[^\s@<>,;"']+\.[^\s@<>,;"']+/;
const looksLikeEmail = (v: string): boolean => EMAIL.test(v);
const looksLikePhone = (raw: string): boolean => {
  const v = westernDigits(raw);
  return /^[+()\d\s.-]{7,22}$/.test(v) && v.replace(/\D/g, '').length >= 7;
};

/** A phone cell as digits. Excel turns long numbers into "9.66501E+11" or "501234567.0". */
function phoneText(value: string): string {
  const v = westernDigits(value).trim().replace(/^p:/i, '');
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(v)) return Number(v).toFixed(0);
  return v.replace(/\.0+$/, '').replace(/\s*(x|ext\.?|#)\s*\d+$/i, '');
}

type Layout = { roles: (Role | null)[]; header: boolean };

/** Roles by header when the first row is one, else by looking at what the columns hold. */
function layoutOf(rows: string[][]): Layout {
  const first = rows[0] ?? [];
  const byHeader = first.map(roleOfHeader);
  const dataLike = first.some((c) => looksLikeEmail(c) || looksLikePhone(c));
  if (byHeader.some(Boolean) && !dataLike) return { roles: byHeader, header: true };

  const width = Math.max(0, ...rows.map((r) => r.length));
  const sample = rows.slice(0, 25);
  const share = (col: number, test: (v: string) => boolean) => {
    const cells = sample.map((r) => r[col] ?? '').filter(Boolean);
    return cells.length === 0 ? 0 : cells.filter(test).length / cells.length;
  };
  const roles: (Role | null)[] = Array.from({ length: width }, () => null);
  const take = (role: Role, score: (col: number) => number, min: number) => {
    let best = -1;
    let bestScore = 0;
    for (let col = 0; col < width; col++) {
      if (roles[col]) continue;
      const s = score(col);
      if (s > bestScore) {
        best = col;
        bestScore = s;
      }
    }
    if (best >= 0 && bestScore >= min) roles[best] = role;
  };
  take('email', (c) => share(c, looksLikeEmail), 0.5);
  take('phone', (c) => share(c, looksLikePhone), 0.5);
  const texty = (c: number) => share(c, (v) => /[\p{L}]/u.test(v) && !v.includes('@') && v.length < 45);
  take('name', texty, 0.5);
  take('company', texty, 0.5);
  take('title', texty, 0.5);
  return { roles, header: false };
}

const cellOf = (row: string[], roles: (Role | null)[], role: Role): string[] =>
  roles.flatMap((r, col) => (r === role && (row[col] ?? '').trim() ? [(row[col] as string).trim()] : []));

function build(
  key: string,
  parts: { name?: string; first?: string; last?: string; phones: string[]; emails: string[]; company?: string; title?: string },
  region?: string
): Candidate | null {
  const issues: Issue[] = [];
  let name = (parts.name ?? '').trim() || [parts.first, parts.last].filter(Boolean).join(' ').trim();
  const company = (parts.company ?? '').trim();
  const title = (parts.title ?? '').trim();
  if (!name && company) name = company;

  let dial: string | undefined;
  let phone: string | undefined;
  for (const raw of parts.phones) {
    const text = phoneText(raw);
    if (text.replace(/\D/g, '').length < 7) continue;
    const split = splitDialled(text, region);
    if (split.phone.length >= 5) {
      dial = split.dial;
      phone = split.phone;
      break;
    }
  }
  if (parts.phones.some((p) => p.trim()) && !phone) issues.push('bad-phone');

  let email: string | undefined;
  for (const raw of parts.emails) {
    const found = EMAIL.exec(raw)?.[0];
    if (found) {
      email = found.toLowerCase();
      break;
    }
  }
  if (parts.emails.some((e) => e.trim()) && !email) issues.push('bad-email');

  if (!name) {
    // A row with nothing but a blank name and nothing to reach is not a contact.
    if (!phone && !email) return null;
    issues.push('no-name');
  }
  const role = title && company && company !== name ? `${title} · ${company}` : title || (company !== name ? company : '') || undefined;
  return { key, name, role: role || undefined, dial, phone, email, issues };
}

/** Candidates from a table of cells, with or without a header row. */
export function readTable(rows: string[][], region?: string): { candidates: Candidate[]; header: boolean } {
  if (rows.length === 0) return { candidates: [], header: false };
  const { roles, header } = layoutOf(rows);
  const candidates: Candidate[] = [];
  rows.slice(header ? 1 : 0).forEach((row, i) => {
    const candidate = build(
      `r${i}`,
      {
        name: cellOf(row, roles, 'name')[0],
        first: cellOf(row, roles, 'first')[0],
        last: cellOf(row, roles, 'last')[0],
        phones: cellOf(row, roles, 'phone'),
        emails: cellOf(row, roles, 'email'),
        company: cellOf(row, roles, 'company')[0],
        title: cellOf(row, roles, 'title')[0],
      },
      region
    );
    if (candidate) candidates.push(candidate);
  });
  return { candidates, header };
}

/** Candidates from a vCard file's people. */
export function readVcf(people: VcfRow[], region?: string): Candidate[] {
  return people.flatMap((p, i) => {
    const candidate = build(`v${i}`, { name: p.name, phones: p.phone ? [p.phone] : [], emails: p.email ? [p.email] : [], company: p.company, title: p.title }, region);
    return candidate ? [candidate] : [];
  });
}

/** Marks the ones already in People, or repeated earlier in the same file. */
export function flagDuplicates(candidates: Candidate[], existing: readonly Contact[]): Candidate[] {
  const seen: Contact[] = [...existing];
  return candidates.map((c) => {
    const found = findDuplicate({ name: c.name, phone: c.phone ?? '', email: c.email ?? '' }, seen);
    seen.push({ id: c.key, name: c.name, phone: c.phone, email: c.email, createdAt: '' });
    return found ? { ...c, duplicateOf: found.name } : c;
  });
}

/** What is ticked to begin with: everything that can be imported and is not already there. */
export function defaultSelection(candidates: readonly Candidate[]): Set<string> {
  return new Set(candidates.filter((c) => !c.issues.includes('no-name') && !c.duplicateOf).map((c) => c.key));
}
