import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strToU8, zlibSync } from 'fflate';

import { readTable } from './columns';
import { parsePdfTable } from './pdf';

/** A small PDF: one page, a Type0 font whose codes are mapped to letters by a ToUnicode table, text placed in a grid. */
function samplePdf(rows: string[][], compress: boolean): Uint8Array {
  const alphabet = [...new Set(rows.flat().join('').split(''))];
  const code = (ch: string) => alphabet.indexOf(ch) + 1;
  const hex = (text: string) => '<' + [...text].map((ch) => code(ch).toString(16).padStart(4, '0')).join('') + '>';
  const xs = [40, 200, 330];
  let content = '1 0 0 -1 0 792 cm\nBT\n/F1 9 Tf\n';
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) content += `1 0 0 -1 ${xs[c]} ${60 + r * 14} Tm\n${hex(cell)} Tj\n`;
    });
  });
  content += 'ET\n';
  const cmap = `/CIDInit /ProcSet findresource begin\nbegincmap\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${alphabet.length} beginbfchar\n${alphabet
    .map((ch, i) => `<${(i + 1).toString(16).padStart(4, '0')}> <${ch.charCodeAt(0).toString(16).padStart(4, '0')}>`)
    .join('\n')}\nendbfchar\nendcmap\n`;
  const stream = (body: string, extra = '') => {
    const raw = strToU8(body);
    const data = compress ? zlibSync(raw) : raw;
    return { head: `<< ${compress ? '/Filter /FlateDecode ' : ''}${extra}/Length ${data.length} >>`, data };
  };
  const parts: (string | Uint8Array)[] = ['%PDF-1.4\n'];
  const add = (id: number, dict: string, data?: Uint8Array) => {
    parts.push(`${id} 0 obj\n${dict}\n`);
    if (data) parts.push('stream\n', data, '\nendstream\n');
    parts.push('endobj\n');
  };
  const page = stream(content);
  const map = stream(cmap);
  add(1, '<< /Type /Catalog /Pages 2 0 R >>');
  add(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  add(4, page.head, page.data);
  add(5, '<< /Type /Font /Subtype /Type0 /BaseFont /Sample /Encoding /Identity-H /ToUnicode 6 0 R >>');
  add(6, map.head, map.data);
  const total = parts.reduce<number>((n, p) => n + (typeof p === 'string' ? p.length : p.length), 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    const bytes = typeof p === 'string' ? Uint8Array.from(p, (ch) => ch.charCodeAt(0)) : p;
    out.set(bytes, at);
    at += bytes.length;
  }
  return out;
}

const SHEET = [
  ['Company', 'Contact Person', 'Phone'],
  ['Northwind Trading', 'Sara Haddad', '+971 50 123 4567'],
  ['Qahwa House', 'Omar Khalid', ''],
  ['Al Noor', 'Reem Al-Qahtani', '+966 54 880 1123'],
];

describe('parsePdfTable', () => {
  for (const compress of [false, true]) {
    it(`rebuilds the rows and columns of a sheet (${compress ? 'compressed' : 'plain'})`, () => {
      const result = parsePdfTable(samplePdf(SHEET, compress));
      assert.ok('rows' in result);
      assert.deepEqual(result.rows, SHEET);
    });
  }
  it('feeds the same importer as a spreadsheet', () => {
    const result = parsePdfTable(samplePdf(SHEET, true));
    assert.ok('rows' in result);
    const { candidates } = readTable(result.rows, 'AE');
    assert.equal(candidates.length, 3);
    assert.equal(candidates[0]?.name, 'Sara Haddad');
    assert.equal(candidates[0]?.role, 'Northwind Trading');
    assert.equal(candidates[0]?.dial, '+971');
  });
  it('gives back nothing for a file that is not a PDF with text', () => {
    const result = parsePdfTable(new Uint8Array([1, 2, 3]));
    assert.ok('rows' in result);
    assert.deepEqual(result.rows, []);
  });
});
