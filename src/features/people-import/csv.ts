/**
 * Reading a spreadsheet saved as CSV: what Excel, Google Sheets and Numbers
 * all produce. Handles quoted cells (with commas, quotes and line breaks in
 * them), a byte-order mark, and the semicolons that Excel uses where a
 * language writes decimals with a comma — which includes most Arabic installs.
 */

const DELIMITERS = [',', ';', '\t', '|'] as const;

/** The delimiter used most on the first line that has any, counted outside quotes. */
function delimiterOf(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const counts = new Map<string, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && counts.has(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let best = ',';
  let most = 0;
  for (const [d, n] of counts) {
    if (n > most) {
      best = d;
      most = n;
    }
  }
  return best;
}

/** Rows of cells, trimmed, with blank rows dropped. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const delimiter = delimiterOf(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const endCell = () => {
    row.push(cell.trim());
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.length > 0)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell.length === 0) quoted = true;
    else if (ch === delimiter) endCell();
    else if (ch === '\n') endRow();
    else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else cell += ch;
  }
  if (cell.length > 0 || row.length > 0) endRow();
  return rows;
}
