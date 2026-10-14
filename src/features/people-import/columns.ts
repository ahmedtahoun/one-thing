/**
 * Turning rows of a spreadsheet into contacts.
 *
 * Nobody's file has the columns the app wants, named the way it wants them:
 * "Mobile", "Phone 1 - Value", "الجوال", "Full Name", or no header row at
 * all. So columns are matched by what their header says — in English or
 * Arabic — and, with no header, by what the cells look like. Nothing is saved
 * here; the Import screen shows the result for the person to tick.
 */
import { sameContact } from '@/features/contact/form-rules';
import type { Contact } from '@/lib/model-types';
import { splitDialled } from '@/lib/parse/contact';
import { normalizeArabic } from '@/lib/parse/names';
import { westernDigits } from '@/lib/parse/spoken';
import type { VcfRow } from './vcf';

type Role = 'demo' | 'name' | 'first' | 'last' | 'phone' | 'email' | 'company' | 'title' | 'note' | 'address';

/** What can be wrong with a row. `no-name` stops it being imported; the others only drop that one detail. */
export type Issue = 'no-name' | 'bad-email' | 'bad-phone' | 'test';

export type Candidate = {
  /** Its row in the file, for a stable list key. */
  key: string;
  name: string;
  /** "Title · Company", as the contact form shows it. */
  role?: string;
  dial?: string;
  phone?: string;
  email?: string;
  /** A status or notes column, kept on the contact as "Remember for next time". */
  note?: string;
  address?: string;
  /** The sheet of a workbook it came from. */
  sheet?: string;
  issues: Issue[];
  /** The contact already in People (or earlier in the file) this one matches. */
  duplicateOf?: string;
  /** Whether that match is someone already in People or an earlier row of this file, and what matched. */
  duplicateIn?: 'people' | 'file';
  duplicateBy?: 'phone' | 'email' | 'name';
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
  ['demo', /\b(demo|test)( account)?\b|تجريبي/],
  ['note', /\b(status|notes?|comments?|remarks?)\b|ملاحظ|حاله|الحاله/],
  ['address', /\b(address|address ?\d|location|city|street)\b|عنوان|موقع|مدين/],
  ['name', /\b(name|contact)\b|الاسم|اسم/],
];
/** "Phone 1 - Type" holds "Mobile", not a number. */
const NOT_A_VALUE = /\b(type|label|accepts|subscribed|opt)\b|نوع/;
/** Parts of an address column that are not the street: "Province Code", "Zip", "Country". */
const NOT_STREET = /\b(code|zip|postal|postcode|province|state|country|company|phone|email)\b/;
/** A column that numbers the entries, filled only on the first row of each company. */
const INDEX_HEADER = /^(#|no|s no|sno|sr|sr no|serial|index|id)$/;

function roleOfHeader(header: string): Role | null {
  const h = fold(header);
  if (!h || NOT_A_VALUE.test(h)) return null;
  for (const [role, rule] of HEADER_RULES) {
    if (!rule.test(h)) continue;
    if (role === 'address' && NOT_STREET.test(h)) return null;
    return role;
  }
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

/** A dash, "N/A" or a blank where a cell has nothing. */
const EMPTY = /^[\s\-–—−_.?*]+$|^(?:n\/?a|none|null|nil|tbd|yes|no|true|false)$|^(?:contact (?:via|through|by)\b.*|key contact|unknown|general|website|email not found)$/i;
/** A number with its digits masked ("+971 50 XXX XXXX") is not a number. */
const MASKED = /x{2,}/i;
const clean = (v: string): string => (EMPTY.test(v.trim()) || MASKED.test(v) ? '' : v.trim().replace(/^'+/, ''));

const cellOf = (row: string[], roles: (Role | null)[], role: Role): string[] =>
  roles.flatMap((r, col) => {
    const v = clean(row[col] ?? '');
    return r === role && v ? [v] : [];
  });

/**
 * The numbers in one phone cell. Sheets keep several in one ("+971 55 123 4567, +971 4 320 0101"),
 * sometimes behind a stray "=" from the export; a short tail like "741223" is an extension, not a number.
 */
function numbersIn(cell: string): string[] {
  const text = westernDigits(cell).replace(/^[=\s]+/, '');
  return text
    .split(/\s*(?:[,;\n]|\s\/\s|\s&\s)\s*/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\D/g, '').length >= 7);
}

/** Whether a number is a mobile, which is the one a message or WhatsApp reaches. */
function isMobile(raw: string, region?: string): boolean {
  const { dial, phone } = splitDialled(phoneText(raw), region);
  if (dial === '+971' || dial === '+966') return /^5/.test(phone);
  if (dial === '+20') return /^1[0125]/.test(phone);
  if (dial === '+91') return /^[6-9]/.test(phone);
  return /^[5-9]/.test(phone);
}

/** "A / B" or "A; B" as separate people. */
const PEOPLE_SPLIT = /\s*(?:\/|;|\n)\s*/;

type RowParts = { name?: string; first?: string; last?: string; phones: string[]; emails: string[]; company?: string; title?: string; note?: string; address?: string; demo?: boolean };

function build(key: string, parts: RowParts, region?: string, person?: { index: number; of: number; names: string[] }): Candidate | null {
  const issues: Issue[] = [];
  let name = (person ? person.names[person.index] : parts.name ?? '')?.trim() || [parts.first, parts.last].filter(Boolean).join(' ').trim();
  const company = (parts.company ?? '').trim();
  let title = (parts.title ?? '').trim();
  if (person && person.of > 1) {
    const titles = title.split(PEOPLE_SPLIT).filter(Boolean);
    if (titles.length === person.of) title = titles[person.index] ?? title;
  }
  if (!name && company) name = company;

  // Mobiles first, then the rest; each person in the row takes the next one.
  const numbers = parts.phones.flatMap(numbersIn);
  const ordered = [...numbers.filter((n) => isMobile(n, region)), ...numbers.filter((n) => !isMobile(n, region))];
  let dial: string | undefined;
  let phone: string | undefined;
  const mine = person && person.of > 1 ? (ordered[person.index] ? [ordered[person.index] as string] : []) : ordered;
  for (const raw of mine) {
    const text = phoneText(raw);
    if (text.replace(/\D/g, '').length < 7) continue;
    const split = splitDialled(text, region);
    if (split.phone.length >= 5) {
      dial = split.dial;
      phone = split.phone;
      break;
    }
  }
  if (!person && parts.phones.some((p) => p.trim()) && !phone) issues.push('bad-phone');
  if (parts.demo) issues.push('test');

  // Addresses may be several in a cell; with several people, the one that carries their name.
  const addresses = parts.emails.flatMap((cell) => cell.split(/[\s,;]+/).filter((e) => EMAIL.test(e)));
  let email: string | undefined;
  if (person && person.of > 1) {
    const tokens = (name || '').toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    email = (addresses.find((e) => tokens.some((t) => e.toLowerCase().split('@')[0]?.includes(t))) ?? addresses[person.index])?.toLowerCase();
  } else {
    email = addresses[0]?.toLowerCase();
  }
  if (!person && parts.emails.some((e) => e.trim()) && !email) issues.push('bad-email');

  if (!name) {
    // A row with nothing but a blank name and nothing to reach is not a contact.
    if (!phone && !email) return null;
    issues.push('no-name');
  }
  const role = title && company && company !== name ? `${title} · ${company}` : title || (company !== name ? company : '') || undefined;
  return {
    key,
    name,
    role: role || undefined,
    dial,
    phone,
    email,
    ...(parts.note ? { note: parts.note } : {}),
    ...(parts.address ? { address: parts.address } : {}),
    issues,
  };
}

/** Candidates from a table of cells, with or without a header row. */
export function readTable(rows: string[][], region?: string): { candidates: Candidate[]; header: boolean } {
  if (rows.length === 0) return { candidates: [], header: false };
  const { roles, header } = layoutOf(rows);
  const candidates: Candidate[] = [];
  // A sheet grouped by company numbers each company once; the rows beneath it (more people, more numbers) are its own.
  const indexCol = header ? (rows[0] ?? []).findIndex((h) => INDEX_HEADER.test(fold(h))) : -1;
  let groupCompany: string | undefined;
  rows.slice(header ? 1 : 0).forEach((row, i) => {
    const parts: RowParts = {
      name: cellOf(row, roles, 'name')[0],
      first: cellOf(row, roles, 'first')[0],
      last: cellOf(row, roles, 'last')[0],
      phones: cellOf(row, roles, 'phone'),
      emails: cellOf(row, roles, 'email'),
      company: cellOf(row, roles, 'company')[0],
      title: cellOf(row, roles, 'title')[0],
      note: cellOf(row, roles, 'note').join(' · ') || undefined,
      address: [...new Set(cellOf(row, roles, 'address'))].join(', ') || undefined,
      // Read raw: "Yes" is exactly what the cleaner treats as an empty cell.
      demo: roles.some((r, col) => r === 'demo' && /^(yes|true|y|1|نعم)$/i.test((row[col] ?? '').trim())),
    };
    if (indexCol >= 0) {
      if ((row[indexCol] ?? '').trim() && parts.company) groupCompany = parts.company;
      else if (!parts.company) parts.company = groupCompany;
    }
    // "Lisa Blake / Jayadeep Paliath" in one cell is two people, not one long name.
    const names = (parts.name ?? '').split(PEOPLE_SPLIT).map((n) => n.trim()).filter(Boolean);
    if (names.length > 1) {
      names.forEach((_, j) => {
        const one = build(`r${i}-${j}`, parts, region, { index: j, of: names.length, names });
        if (one) candidates.push(one);
      });
      return;
    }
    const candidate = build(`r${i}`, parts, region);
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

/** Marks the ones already in People, or repeated earlier in the same file, and says what matched. */
export function flagDuplicates(candidates: Candidate[], existing: readonly Contact[]): Candidate[] {
  const seen: { name: string; phone?: string; email?: string; from: 'people' | 'file' }[] = existing.map((c) => ({ name: c.name, phone: c.phone, email: c.email, from: 'people' }));
  return candidates.map((c) => {
    let hit: { name: string; from: 'people' | 'file'; by: 'phone' | 'email' | 'name' } | undefined;
    for (const other of seen) {
      const by = sameContact(c, other);
      if (by) {
        hit = { name: other.name, from: other.from, by };
        break;
      }
    }
    seen.push({ name: c.name, phone: c.phone, email: c.email, from: 'file' });
    return hit ? { ...c, duplicateOf: hit.name, duplicateIn: hit.from, duplicateBy: hit.by } : c;
  });
}

/** What is ticked to begin with: everything that can be imported and is not already there. */
export function defaultSelection(candidates: readonly Candidate[]): Set<string> {
  return new Set(
    candidates.filter((c) => !c.issues.includes('no-name') && !c.issues.includes('test') && !c.duplicateOf && (c.phone || c.email)).map((c) => c.key)
  );
}
