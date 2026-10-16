/**
 * Reading a table out of a PDF — the sheet someone printed to PDF instead of
 * exporting.
 *
 * A PDF has no rows or columns; it has pieces of text at positions. So this
 * reads the text pieces with where each sits on the page, groups them into
 * lines by height, and into columns by where cells start. It handles what
 * Google Sheets, Excel and Numbers write: Flate-compressed streams, fonts
 * whose codes map to letters through a ToUnicode table, and object streams.
 * A scanned PDF (a picture of a page) has no text to read, and comes back
 * empty. Encrypted ones are refused.
 */
import { unzlibSync } from 'fflate';

export type PdfResult = { rows: string[][] } | { error: 'locked' };

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
/** `a` applied first, then `b`. */
const times = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
];

// --- objects ---------------------------------------------------------------------

type PdfObject = { dict: string; stream?: Uint8Array };

const latin1 = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
};

function inflate(raw: Uint8Array, dict: string): Uint8Array | null {
  if (!/\/Filter\s*(?:\[\s*)?\/FlateDecode/.test(dict)) return /\/Filter/.test(dict) ? null : raw;
  try {
    return unzlibSync(raw);
  } catch {
    return null;
  }
}

/** The text of one `<< … >>` starting at `from`, nested dictionaries included. */
function balanced(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length - 1; i++) {
    if (text[i] === '<' && text[i + 1] === '<') {
      depth++;
      i++;
    } else if (text[i] === '>' && text[i + 1] === '>') {
      depth--;
      i++;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return text.slice(from);
}

function readObjects(bytes: Uint8Array): Map<number, PdfObject> {
  const text = latin1(bytes);
  const objects = new Map<number, PdfObject>();
  const starts = [...text.matchAll(/(?:^|[\r\n\s])(\d+)\s+\d+\s+obj\b/g)];
  for (let i = 0; i < starts.length; i++) {
    const m = starts[i] as RegExpMatchArray;
    const bodyStart = (m.index ?? 0) + m[0].length;
    const end = text.indexOf('endobj', bodyStart);
    const body = text.slice(bodyStart, end < 0 ? undefined : end);
    const at = body.indexOf('stream');
    const id = Number(m[1]);
    if (at < 0 || !/^\s*<</.test(body.slice(0, at + 1))) {
      objects.set(id, { dict: body.trim() });
      continue;
    }
    const dict = body.slice(0, at).trim();
    let from = bodyStart + at + 'stream'.length;
    if (text[from] === '\r') from++;
    if (text[from] === '\n') from++;
    const to = text.indexOf('endstream', from);
    const decoded = inflate(bytes.subarray(from, to < 0 ? undefined : to), dict);
    objects.set(id, decoded ? { dict, stream: decoded } : { dict });
  }
  // Objects packed inside object streams (PDF 1.5 and later).
  for (const obj of [...objects.values()]) {
    if (!obj.stream || !/\/Type\s*\/ObjStm/.test(obj.dict)) continue;
    const n = Number(/\/N\s+(\d+)/.exec(obj.dict)?.[1]);
    const first = Number(/\/First\s+(\d+)/.exec(obj.dict)?.[1]);
    const inner = latin1(obj.stream);
    const header = inner.slice(0, first).trim().split(/\s+/).map(Number);
    for (let k = 0; k < n; k++) {
      const id = header[k * 2];
      const offset = header[k * 2 + 1];
      const next = header[k * 2 + 3];
      if (id === undefined || offset === undefined) continue;
      objects.set(id, { dict: inner.slice(first + offset, next === undefined ? undefined : first + next).trim() });
    }
  }
  return objects;
}

/** The value of `/Key` in a dictionary: a nested dictionary, the object a reference points to, or the raw token. */
function valueOf(dict: string, key: string, objects: Map<number, PdfObject>): string | null {
  const m = new RegExp(`/${key}(?![A-Za-z0-9])\\s*`).exec(dict);
  if (!m) return null;
  const at = m.index + m[0].length;
  if (dict.startsWith('<<', at)) return balanced(dict, at);
  const ref = /^(\d+)\s+\d+\s+R\b/.exec(dict.slice(at));
  if (ref) return objects.get(Number(ref[1]))?.dict ?? null;
  if (dict[at] === '[') return dict.slice(at, dict.indexOf(']', at) + 1);
  return /^[^\s/<>[\]]+/.exec(dict.slice(at))?.[0] ?? null;
}

const refsIn = (text: string): number[] => [...text.matchAll(/(\d+)\s+\d+\s+R\b/g)].map((m) => Number(m[1]));

// --- fonts -----------------------------------------------------------------------

type Font = { width: 1 | 2; map: Map<number, string> | null };

const hexUnits = (hex: string): number[] => (hex.replace(/\s+/g, '').match(/.{1,4}/g) ?? []).map((h) => parseInt(h.padEnd(4, '0'), 16));
const utf16 = (hex: string): string => String.fromCharCode(...hexUnits(hex));

/** A ToUnicode table: which character each font code is. */
function parseCMap(text: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of (block[1] ?? '').matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(parseInt(m[1] as string, 16), utf16(m[2] as string));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of (block[1] ?? '').matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[^\]]*\])/g)) {
      const lo = parseInt(m[1] as string, 16);
      const hi = parseInt(m[2] as string, 16);
      const target = m[3] as string;
      if (target.startsWith('[')) {
        [...target.matchAll(/<([0-9a-fA-F]+)>/g)].forEach((t, k) => map.set(lo + k, utf16(t[1] as string)));
      } else {
        const base = parseInt(target.slice(1, -1), 16);
        const width = target.length - 2;
        for (let code = lo; code <= hi && code - lo < 65536; code++) map.set(code, String.fromCharCode(...hexUnits((base + code - lo).toString(16).padStart(width, '0'))));
      }
    }
  }
  return map;
}

function fontOf(dict: string, objects: Map<number, PdfObject>): Font {
  const type0 = /\/Subtype\s*\/Type0/.test(dict);
  const toUnicode = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(dict)?.[1];
  const stream = toUnicode ? objects.get(Number(toUnicode))?.stream : undefined;
  return { width: type0 ? 2 : 1, map: stream ? parseCMap(latin1(stream)) : null };
}

// --- content streams -------------------------------------------------------------

type Tok = number | { name: string } | { bytes: string } | Tok[] | { op: string };

const WHITESPACE = /[\s\0]/;
const DELIMITER = /[()<>[\]{}/%]/;

function tokenise(s: string): Tok[] {
  const out: Tok[] = [];
  const stack: Tok[][] = [];
  let i = 0;
  const push = (t: Tok) => (stack.length > 0 ? (stack[stack.length - 1] as Tok[]).push(t) : out.push(t));
  while (i < s.length) {
    const c = s[i] as string;
    if (WHITESPACE.test(c)) i++;
    else if (c === '%') while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i++;
    else if (c === '[') {
      stack.push([]);
      i++;
    } else if (c === ']') {
      const done = stack.pop();
      if (done) push(done);
      i++;
    } else if (c === '(') {
      let depth = 1;
      let str = '';
      i++;
      while (i < s.length && depth > 0) {
        const d = s[i] as string;
        if (d === '\\') {
          const e = s[i + 1] as string;
          if (/[0-7]/.test(e)) {
            const oct = /^[0-7]{1,3}/.exec(s.slice(i + 1))?.[0] ?? '0';
            str += String.fromCharCode(parseInt(oct, 8) & 255);
            i += 1 + oct.length;
          } else {
            str += e === 'n' ? '\n' : e === 'r' ? '\r' : e === 't' ? '\t' : e === 'b' ? '\b' : e === 'f' ? '\f' : e === '\n' || e === '\r' ? '' : e;
            i += 2;
          }
          continue;
        }
        if (d === '(') depth++;
        else if (d === ')') depth--;
        if (depth > 0) str += d;
        i++;
      }
      push({ bytes: str });
    } else if (c === '<' && s[i + 1] === '<') {
      let depth = 1;
      i += 2;
      while (i < s.length && depth > 0) {
        if (s[i] === '<' && s[i + 1] === '<') (depth++, (i += 2));
        else if (s[i] === '>' && s[i + 1] === '>') (depth--, (i += 2));
        else i++;
      }
      push({ op: '<<>>' });
    } else if (c === '<') {
      const end = s.indexOf('>', i);
      const hex = s.slice(i + 1, end < 0 ? undefined : end).replace(/\s+/g, '');
      let str = '';
      for (let k = 0; k < hex.length; k += 2) str += String.fromCharCode(parseInt(hex.slice(k, k + 2).padEnd(2, '0'), 16));
      push({ bytes: str });
      i = end < 0 ? s.length : end + 1;
    } else if (c === '/') {
      let j = i + 1;
      while (j < s.length && !WHITESPACE.test(s[j] as string) && !DELIMITER.test(s[j] as string)) j++;
      push({ name: s.slice(i + 1, j) });
      i = j;
    } else {
      let j = i;
      while (j < s.length && !WHITESPACE.test(s[j] as string) && !DELIMITER.test(s[j] as string)) j++;
      if (j === i) {
        i++;
        continue;
      }
      const word = s.slice(i, j);
      push(/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word) ? Number(word) : { op: word });
      i = j;
    }
  }
  return out;
}

type Item = { x: number; y: number; size: number; text: string };

function decodeWith(font: Font | undefined, bytes: string): string {
  const width = font?.width ?? 1;
  let out = '';
  for (let i = 0; i < bytes.length; i += width) {
    const code = width === 2 ? (bytes.charCodeAt(i) << 8) | (bytes.charCodeAt(i + 1) || 0) : bytes.charCodeAt(i);
    out += font?.map?.get(code) ?? (width === 1 ? String.fromCharCode(code) : '');
  }
  return out;
}

function itemsOf(stream: string, fonts: Map<string, Font>): Item[] {
  const items: Item[] = [];
  const toks = tokenise(stream);
  const operands: Tok[] = [];
  const saved: Matrix[] = [];
  let ctm = IDENTITY;
  let tm = IDENTITY;
  let tlm = IDENTITY;
  let font: Font | undefined;
  let size = 0;
  let leading = 0;
  const nums = (): number[] => operands.filter((t): t is number => typeof t === 'number');

  const show = (text: string) => {
    if (!text.trim()) return;
    const m = times(tm, ctm);
    items.push({ x: m[4], y: m[5], size: Math.abs(size * Math.hypot(m[2], m[3])) || Math.abs(size) || 8, text });
    // Move on by a rough width so a second show on the same line lands after this one.
    tm = times([1, 0, 0, 1, text.length * size * 0.5, 0], tm);
  };
  const move = (tx: number, ty: number) => {
    tlm = times([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };

  for (const tok of toks) {
    if (typeof tok === 'object' && !Array.isArray(tok) && 'op' in tok) {
      const n = nums();
      switch (tok.op) {
        case 'q':
          saved.push(ctm);
          break;
        case 'Q':
          ctm = saved.pop() ?? ctm;
          break;
        case 'cm':
          if (n.length >= 6) ctm = times(n.slice(-6) as Matrix, ctm);
          break;
        case 'BT':
          tm = tlm = IDENTITY;
          break;
        case 'Tf': {
          const name = operands.find((t): t is { name: string } => typeof t === 'object' && !Array.isArray(t) && 'name' in t)?.name;
          font = name ? fonts.get(name) : undefined;
          size = n[n.length - 1] ?? size;
          break;
        }
        case 'TL':
          leading = n[0] ?? leading;
          break;
        case 'Td':
          move(n[0] ?? 0, n[1] ?? 0);
          break;
        case 'TD':
          leading = -(n[1] ?? 0);
          move(n[0] ?? 0, n[1] ?? 0);
          break;
        case 'Tm':
          if (n.length >= 6) tm = tlm = n.slice(-6) as Matrix;
          break;
        case 'T*':
          move(0, -leading);
          break;
        case 'Tj':
        case "'":
        case '"': {
          if (tok.op !== 'Tj') move(0, -leading);
          const str = [...operands].reverse().find((t): t is { bytes: string } => typeof t === 'object' && !Array.isArray(t) && 'bytes' in t);
          if (str) show(decodeWith(font, str.bytes));
          break;
        }
        case 'TJ': {
          const parts = operands.find((t): t is Tok[] => Array.isArray(t)) ?? [];
          let text = '';
          for (const p of parts) {
            if (typeof p === 'number') {
              // A large negative kern is a space between words.
              if (p < -200) text += ' ';
            } else if (!Array.isArray(p) && 'bytes' in p) text += decodeWith(font, p.bytes);
          }
          show(text);
          break;
        }
        default:
          break;
      }
      operands.length = 0;
    } else {
      operands.push(tok);
    }
  }
  return items;
}

// --- pages -----------------------------------------------------------------------

function pageItems(objects: Map<number, PdfObject>): Item[][] {
  const root = [...objects.values()].find((o) => /\/Type\s*\/Catalog/.test(o.dict));
  const pagesRef = root ? /\/Pages\s+(\d+)\s+\d+\s+R/.exec(root.dict)?.[1] : undefined;
  const pages: { dict: string; resources: string }[] = [];

  const walk = (id: number, inherited: string, seen: Set<number>) => {
    const obj = objects.get(id);
    if (!obj || seen.has(id)) return;
    seen.add(id);
    const resources = valueOf(obj.dict, 'Resources', objects) ?? inherited;
    if (/\/Type\s*\/Pages/.test(obj.dict)) {
      const kids = valueOf(obj.dict, 'Kids', objects) ?? '';
      for (const kid of refsIn(kids)) walk(kid, resources, seen);
    } else if (/\/Type\s*\/Page\b/.test(obj.dict)) pages.push({ dict: obj.dict, resources });
  };
  if (pagesRef) walk(Number(pagesRef), '', new Set());
  if (pages.length === 0) {
    for (const o of objects.values()) if (/\/Type\s*\/Page\b/.test(o.dict)) pages.push({ dict: o.dict, resources: valueOf(o.dict, 'Resources', objects) ?? '' });
  }

  return pages.map(({ dict, resources }) => {
    const fonts = new Map<string, Font>();
    const fontDict = valueOf(resources, 'Font', objects) ?? '';
    for (const m of fontDict.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
      const font = objects.get(Number(m[2]));
      if (font) fonts.set(m[1] as string, fontOf(font.dict, objects));
    }
    const contents = valueOf(dict, 'Contents', objects);
    const direct = /\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/.exec(dict)?.[1] ?? contents ?? '';
    const stream = refsIn(direct)
      .map((id) => {
        const s = objects.get(id)?.stream;
        return s ? latin1(s) : '';
      })
      .join('\n');
    return itemsOf(stream, fonts);
  });
}

// --- from text to a table --------------------------------------------------------

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 8;
}

/** Lines by height, columns by where cells start. */
export function tableFrom(pages: Item[][]): string[][] {
  const all = pages.flat();
  if (all.length === 0) return [];
  const tolerance = Math.max(1.5, median(all.map((i) => i.size)) * 0.45);

  const lines: Item[][] = [];
  for (const page of pages) {
    const sorted = [...page].sort((a, b) => b.y - a.y || a.x - b.x);
    let current: Item[] = [];
    let at = Number.NaN;
    for (const item of sorted) {
      if (current.length > 0 && Math.abs(item.y - at) > tolerance) {
        lines.push(current);
        current = [];
      }
      if (current.length === 0) at = item.y;
      current.push(item);
    }
    if (current.length > 0) lines.push(current);
  }

  // Columns: the places many lines start a cell. Neighbouring starts a few points apart are one column.
  const starts = lines.flatMap((line) => line.map((i) => i.x)).sort((a, b) => a - b);
  const clusters: { min: number; count: number; last: number }[] = [];
  for (const x of starts) {
    const c = clusters[clusters.length - 1];
    if (c && x - c.last <= 3) {
      c.count++;
      c.last = x;
    } else clusters.push({ min: x, count: 1, last: x });
  }
  const need = Math.max(2, Math.round(lines.length * 0.08));
  // The header line names every column, even one that is empty on most rows (a status), so its starts count too.
  const header = (lines[0] ?? []).map((i) => i.x);
  const columns: number[] = [];
  for (const x of [...clusters.filter((c) => c.count >= need).map((c) => c.min), ...header].sort((p, q) => p - q)) {
    const last = columns[columns.length - 1];
    if (last === undefined || x - last > 3) columns.push(x);
  }
  if (columns.length === 0) columns.push(starts[0] ?? 0);

  const colOf = (x: number): number => {
    let at = 0;
    columns.forEach((start, k) => {
      if (start <= x + 3) at = k;
    });
    return at;
  };

  const rows = lines.map((line) => {
    const cells: string[] = columns.map(() => '');
    for (const item of [...line].sort((a, b) => a.x - b.x)) {
      const k = colOf(item.x);
      cells[k] = cells[k] ? `${cells[k]} ${item.text.trim()}` : item.text.trim();
    }
    return cells;
  });

  // A header repeated on every page is one header.
  const first = (rows[0] ?? []).join('\u0001');
  return rows.filter((row, i) => i === 0 || row.join('\u0001') !== first);
}

export function parsePdfTable(bytes: Uint8Array): PdfResult {
  const objects = readObjects(bytes);
  if ([...objects.values()].some((o) => /\/Encrypt\b/.test(o.dict) && /\/Filter\s*\/Standard/.test(o.dict))) return { error: 'locked' };
  if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(latin1(bytes.subarray(Math.max(0, bytes.length - 2048))))) return { error: 'locked' };
  return { rows: tableFrom(pageItems(objects)) };
}
