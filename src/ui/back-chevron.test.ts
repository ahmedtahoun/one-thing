/**
 * Every icon that points somewhere must mirror in Arabic. `npm test`.
 *
 * A chevron is a glyph, not layout: the writing direction on the root flips
 * where the button *sits*, and nothing flips which way the arrow *points*.
 * `BackButton` handles its own, but most screens draw the icon directly and
 * each wraps it in its own `scaleX` — so the mistake is leaving the wrapper
 * off, and it is invisible until somebody reads Arabic.
 *
 * Two had: `app/setup.tsx` (a back arrow pointing forwards) and
 * `SendRow.tsx` (a paper plane flying backwards, while the identical
 * control on a contact's page flew the right way). Nothing caught either.
 * No unit test reads a transform, no drift probe measures one, and `compare`
 * is pixels — a 22px glyph is 0.03% of a screen, well under the noise from
 * any honest layout difference.
 *
 * So the check is on the source, where the mistake is made. It is crude on
 * purpose: a real parse would be a dependency and a maintenance job, and
 * what is worth preventing is the next unwrapped arrow.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = join(import.meta.dirname, '..', '..');

/** Every .ts/.tsx under `app/` and `src/`, skipping tests. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) sources(rel, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) out.push(rel);
  }
  return out;
}

const FILES = [...sources('app'), ...sources('src')];

/**
 * Icons that point along the line of writing, read off their own path data
 * in `src/design/icon-paths.ts`:
 *
 *   back   m15 18-6-6 6-6   ←      send   m22 2-7 20-4-9-9-4z   ↗
 *   chevR  m9 6 6 6-6 6     →      arrow  M5 12h14 · m12 5 7 7-7 7   →
 *
 * `chev` ("m6 9 6 6 6-6") points *down* and is left out: mirroring a
 * vertical glyph does nothing, and `CountryPicker` relies on that
 * (BUILD-REVIEW §2.21). So are `loop` and `search` — neither iOS nor
 * Android mirrors a refresh circle or a magnifier, and flipping them would
 * be the bug.
 */
const DIRECTIONAL = ['back', 'send', 'chevR', 'arrow'];
const POINTS_SOMEWHERE = new RegExp(`<Icon\\s+name="(${DIRECTIONAL.join('|')})"`);

describe('an icon that points somewhere', () => {
  it('is mirrored everywhere it is drawn by hand', () => {
    const unmirrored: string[] = [];

    for (const file of FILES) {
      if (file.endsWith('back-chevron.test.ts')) continue;
      const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!POINTS_SOMEWHERE.test(line)) return;
        // The wrapper sits immediately around it. Six lines of slack covers
        // every shape in the app without reaching the next element.
        // `rotate` counts as handled: a chevron turned 90° is vertical, and
        // a vertical glyph has no side to swap (app/new.tsx does this).
        const near = lines.slice(Math.max(0, i - 6), i + 3).join('\n');
        if (!/scaleX|rotate/.test(near)) unmirrored.push(`${file}:${i + 1}`);
      });
    }

    assert.deepEqual(
      unmirrored,
      [],
      `An icon with no scaleX points the wrong way in Arabic. Wrap it in\n` +
        `<View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>, or use\n` +
        `<BackButton />, which does it for you:\n  ${unmirrored.join('\n  ')}`
    );
  });

  it('is actually drawn by hand in many places, or this test guards nothing', () => {
    const drawn = FILES.filter((f) => !f.endsWith('back-chevron.test.ts') && POINTS_SOMEWHERE.test(readFileSync(join(ROOT, f), 'utf8')));
    assert.ok(drawn.length >= 12, `expected directional icons across the app, found ${drawn.length}`);
  });

  it('has a component that mirrors, for anybody who would rather not', () => {
    const source = readFileSync(join(ROOT, 'src/ui/BackButton.tsx'), 'utf8');
    assert.match(source, /scaleX:\s*dir\.isRTL\s*\?\s*-1\s*:\s*1/);
  });
});
