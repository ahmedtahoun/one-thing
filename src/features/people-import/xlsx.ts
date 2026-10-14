/**
 * Reading the first sheet of an Excel (.xlsx) file.
 *
 * An .xlsx is a zip of XML. Only what a contact list needs is read: the
 * shared-strings table and the first worksheet's cells, as text. No formulas,
 * no styles, no other sheets — and no library bigger than the unzipper.
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

export function parseXlsx(bytes: Uint8Array): string[][] {
  const files = unzipSync(bytes);
  const read = (name: string): string | null => {
    const file = files[name];
    return file ? strFromU8(file) : null;
  };

  const shared: string[] = [];
  const sharedXml = read('xl/sharedStrings.xml');
  if (sharedXml) for (const m of sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1] ?? ''));

  const sheetName =
    Object.keys(files)
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))[0] ?? null;
  const sheet = sheetName ? read(sheetName) : null;
  if (!sheet) return [];

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const c of (rowMatch[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1] ?? '';
      const inner = c[2] ?? '';
      const ref = /\br="([A-Za-z]+\d+)"/.exec(attrs)?.[1];
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      let value = '';
      if (type === 's') value = shared[Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1])] ?? '';
      else if (type === 'inlineStr') value = textOf(inner);
      else value = decode(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
      const col = ref ? columnOf(ref) : cells.length;
      while (cells.length < col) cells.push('');
      cells[col] = value.trim();
    }
    if (cells.some((v) => v.length > 0)) rows.push(cells);
  }
  return rows;
}
