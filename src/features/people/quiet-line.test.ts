/**
 * The guard on the quiet line is an estimate of how wide text will be drawn,
 * so the test that matters is not "does the estimate round nicely" but "does
 * it reach the same verdict as the real thing".
 *
 * `font-widths.json` is the app's own font measured in a browser by
 * scripts/measure-line.js: the width, in ems, of every role-and-reach pair a
 * real address book makes, in both languages, and the column each reference
 * frame gives the line. Every pair is put to `identityLine` at both columns
 * and the verdict compared to the measurement.
 *
 * The one asymmetry the suite insists on: the estimate may call a fit an
 * overflow — the row loses the reach and nothing is cut — but never the
 * reverse, which is a phone number cut to a stub, the fault this was written
 * to end. BUILD-REVIEW §2.111.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { emWidth, identityLine, lineWidth } from './quiet-line';

const MEASURED = JSON.parse(readFileSync(new URL('./font-widths.json', import.meta.url), 'utf8')) as {
  font: string;
  size: number;
  columns: Record<string, number>;
  chars: Record<string, number>;
  pairs: Record<string, number>;
};

const COLUMNS = Object.entries(MEASURED.columns).map(([frame, column]) => [Number(frame), column] as const);
const SEPARATOR = ' · ';

/** The pairs only: a role and a reach, which is the choice the line has to make. */
const BOTH = Object.entries(MEASURED.pairs).filter(([text]) => text.includes(SEPARATOR));

const split = (text: string) => {
  const at = text.indexOf(SEPARATOR);
  return { role: text.slice(0, at), reach: text.slice(at + SEPARATOR.length) };
};

test('the measurements cover both reference frames and real text', () => {
  assert.equal(MEASURED.size, 14, 'the line is drawn at bodyS');
  assert.deepEqual(COLUMNS.map(([frame]) => frame).sort((a, b) => b - a), [402, 360]);
  assert.ok(BOTH.length > 100, `${BOTH.length} role-and-reach pairs`);
  assert.ok(BOTH.some(([text]) => /[؀-ۿ]/.test(text)), 'some of them Arabic');
});

test('the column is the screen less the picture, the gaps and the date', () => {
  for (const [frame, column] of COLUMNS) assert.equal(lineWidth(frame), column);
  assert.equal(lineWidth(0), 0);
});

test('the estimate is within a tenth of the measurement on Latin text', () => {
  for (const [text, real] of Object.entries(MEASURED.pairs)) {
    if (/[؀-ۿ]/.test(text)) continue;
    const off = Math.abs(emWidth(text) - real) / real;
    assert.ok(off < 0.1, `${text}: estimated ${emWidth(text).toFixed(2)}em against ${real}em`);
  }
});

// If the font changes, scripts/measure-line.js rewrites font-widths.json and
// prints the tables to paste into quiet-line.ts. This is what notices when the
// first of those happened and the second did not.
test('the tables in quiet-line.ts are the ones that were measured', () => {
  const stale: string[] = [];
  for (const [char, real] of Object.entries(MEASURED.chars)) {
    const arabic = /[\u0600-\u06FF]/.test(char);
    const want = (Math.round(real * 20) / 20) * (arabic ? 0.8 : 1);
    if (Math.abs(emWidth(char) - want) > 1e-9) {
      stale.push(`${JSON.stringify(char)}: table says ${emWidth(char)}em, measured ${want}em`);
    }
  }
  assert.deepEqual(stale, [], `quiet-line.ts is out of date with font-widths.json:\n${stale.join('\n')}`);
});

test('a bidi isolate is counted at nothing, being drawn as nothing', () => {
  assert.equal(emWidth('⁦abc⁩'), emWidth('abc'));
});

test('an unknown character is counted wide, never at nothing', () => {
  assert.ok(emWidth('★') >= 0.6);
});

// The whole point. Both when they fit, the role alone when they do not, and
// never a reach cut to a stub.
for (const [frame, column] of COLUMNS) {
  test(`at ${frame}pt no pair is kept that the browser could not fit`, () => {
    const kept: string[] = [];
    for (const [text, real] of BOTH) {
      const { role, reach } = split(text);
      if (identityLine(role, reach, column) === role) continue;
      if (real * MEASURED.size > column) kept.push(`${text}: needs ${(real * MEASURED.size).toFixed(0)}pt of ${column}`);
    }
    assert.deepEqual(kept, [], `kept a pair that overflows:\n${kept.join('\n')}`);
  });

  test(`at ${frame}pt a dropped pair was at least close to overflowing`, () => {
    const loose: string[] = [];
    for (const [text, real] of BOTH) {
      const { role, reach } = split(text);
      if (identityLine(role, reach, column) !== role) continue;
      // Dropping the reach is allowed where the pair was near the limit; with
      // room to spare it means the estimate is badly out, not merely cautious.
      if (real * MEASURED.size <= column * 0.9) loose.push(`${text}: ${(real * MEASURED.size).toFixed(0)}pt of ${column}`);
    }
    assert.deepEqual(loose, [], `dropped the reach with room to spare:\n${loose.join('\n')}`);
  });

  test(`at ${frame}pt the pairs that plainly fit are all kept`, () => {
    const fits = BOTH.filter(([, real]) => real * MEASURED.size <= column * 0.9);
    assert.ok(fits.length > 10, `${fits.length} pairs plainly fit at ${frame}pt`);
    for (const [text] of fits) {
      const { role, reach } = split(text);
      assert.notEqual(identityLine(role, reach, column), role, `${text} fits with room and was dropped`);
    }
  });
}

test('a long role keeps the reach off the row, and the role whole', () => {
  assert.equal(identityLine('General Manager · @speranza', '+20 100 123 4567', 228), 'General Manager · @speranza');
});

test('a short role keeps both, the reach isolated', () => {
  assert.equal(identityLine('Travel', 'info@test.com', 228), 'Travel · ⁦info@test.com⁩');
});

test('no role at all falls back to the reach, isolated', () => {
  assert.equal(identityLine(undefined, '+20 100 123 4567', 228), '⁦+20 100 123 4567⁩');
  assert.equal(identityLine('   ', '+20 100 123 4567', 228), '⁦+20 100 123 4567⁩');
});

test('neither one leaves the line empty rather than a stray separator', () => {
  assert.equal(identityLine(undefined, '', 228), '');
  assert.equal(identityLine('', '  ', 228), '');
});

test('a role with no reach stands alone, however long', () => {
  assert.equal(identityLine('Head of Partnerships and Alliances', '', 228), 'Head of Partnerships and Alliances');
});

test('an Arabic role keeps a Latin email when it fits', () => {
  const line = identityLine('مدير عام', 'info@test.com', 228);
  assert.ok(line.startsWith('مدير عام · '), line);
  assert.ok(line.includes('info@test.com'), line);
});

test('a narrow screen drops what a wide one keeps', () => {
  assert.ok(identityLine('Operations Lead', 'ops@acme.co', 228).includes('ops@acme.co'));
  assert.equal(identityLine('Operations Lead', 'ops@acme.co', 186), 'Operations Lead');
});
