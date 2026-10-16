/**
 * Reading the sheets of an Excel (.xlsx) file.
 *
 * An .xlsx is a zip of XML. Only what a contact list needs is read: the
 * shared-strings table and each worksheet's cells, as text. No formulas,
 * no styles — and no library bigger than the unzipper.
 */
import { strFromU8, unzipSync } from 'fflate';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? '';
  });

/** The text inside every <t>…</t> of a fragment: a plain string or a rich-text one in pieces. */
function textOf(xml: string): string {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += decode(m[1] ?? '');
  return out;
}

/** "B3" → column 1 (zero-based). */
function columnOf(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[^A-Za-z]/g, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export type Sheet = { name: string; rows: string[][] };

/** Rows of one worksheet, read in one pass: a sheet can declare a million empty rows, and none of them should cost anything. */
function rowsOf(sheet: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  let at = Math.max(0, sheet.indexOf('<sheetData'));
  let emptyRun = 0;
  for (;;) {
    const open = sheet.indexOf('<row', at);
    if (open < 0) break;
    const tagEnd = sheet.indexOf('>', open);
    if (tagEnd < 0) break;
    const tag = sheet.slice(open, tagEnd + 1);
    if (tag.endsWith('/>')) {
      at = tagEnd + 1;
      // Long runs of formatted-but-empty rows below the data: nothing more to find.
      if (++emptyRun > 20000) break;
      continue;
    }
    const close = sheet.indexOf('</row>', tagEnd);
    if (close < 0) break;
    const inner = sheet.slice(tagEnd + 1, close);
    at = close + 6;
    // A row the person filtered out is one they did not want.
    if (/\bhidden="1"/.test(tag)) continue;

    const cells: string[] = [];
    for (const c of inner.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1] ?? '';
      const body = c[2] ?? '';
      const ref = /\br="([A-Za-z]+\d+)"/.exec(attrs)?.[1];
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      let value = '';
      if (type === 's') value = shared[Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1])] ?? '';
      else if (type === 'inlineStr') value = textOf(body);
      else value = decode(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '');
      const col = ref ? columnOf(ref) : cells.length;
      while (cells.length < col) cells.push('');
      cells[col] = value.trim();
    }
    if (cells.some((v) => v.length > 0)) {
      rows.push(cells);
      emptyRun = 0;
    } else emptyRun++;
  }
  return rows;
}

/** Every worksheet of a workbook, in the order the workbook lists them, each with its name. */
export function parseXlsxSheets(bytes: Uint8Array): Sheet[] {
  // Only what is needed is unzipped; a sheet's own XML can be tens of megabytes.
  const files = unzipSync(bytes, { filter: (f) => /^xl\/(worksheets\/sheet\d+\.xml|sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels)$/.test(f.name) });
  const read = (name: string): string | null => {
    const file = files[name];
    return file ? strFromU8(file) : null;
  };

  const shared: string[] = [];
  const sharedXml = read('xl/sharedStrings.xml');
  if (sharedXml) for (const m of sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1] ?? ''));

  // The workbook says which file is which sheet, and in what order.
  const targets = new Map<string, string>();
  for (const m of (read('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) targets.set(id, `xl/${target.replace(/^\/?(xl\/)?/, '')}`);
  }
  const listed: { name: string; file: string }[] = [];
  for (const m of (read('xl/workbook.xml') ?? '').matchAll(/<sheet\b[^>]*>/g)) {
    const name = decode(/\bname="([^"]*)"/.exec(m[0])?.[1] ?? '');
    const id = /\br:id="([^"]+)"/.exec(m[0])?.[1];
    const file = id ? targets.get(id) : undefined;
    if (file && files[file]) listed.push({ name, file });
  }
  if (listed.length === 0) {
    Object.keys(files)
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
      .forEach((file, i) => listed.push({ name: `Sheet${i + 1}`, file }));
  }
  return listed.map(({ name, file }) => ({ name, rows: rowsOf(read(file) ?? '', shared) }));
}

/** The first worksheet's rows. */
export function parseXlsx(bytes: Uint8Array): string[][] {
  return parseXlsxSheets(bytes)[0]?.rows ?? [];
}
