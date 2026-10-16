/**
 * Every icon the app asks for by name exists. Run with `npm test`.
 *
 * `Icon` looks a name up in `ICONS`, then `EXTRA_ICONS`, and **returns null
 * when it finds neither** — no warning, no fallback glyph, just a hole the
 * size of the icon. That is the right behaviour at runtime and a terrible
 * one to debug: the welcome's channel tiles shipped as three empty tinted
 * squares because `whatsapp`, `email` and `call` are task *types*, whose
 * icons are `msg`, `mail` and `phone` through `TYPE_ICON`. Nothing failed.
 * A screenshot caught it.
 *
 * So the names are checked here instead. The literal ones are read out of
 * the source, which is crude on purpose — the alternative is a parser, and
 * what is worth preventing is a name that resolves to nothing.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { ICONS, TYPE_ICON } from './icon-paths';
import { EXTRA_ICONS } from './icons-extra';

const ROOT = join(import.meta.dirname, '..', '..');

const known = (name: string): boolean => name in ICONS || name in EXTRA_ICONS;

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) sources(rel, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) out.push(rel);
  }
  return out;
}

describe('icon names', () => {
  it('every name written as a literal in the app resolves to real path data', () => {
    const missing: string[] = [];
    for (const file of [...sources('app'), ...sources('src')]) {
      const text = readFileSync(join(ROOT, file), 'utf8');
      for (const m of text.matchAll(/<Icon\s+name="([^"]+)"/g)) {
        if (!known(m[1]!)) missing.push(`${file}: ${m[1]}`);
      }
    }
    assert.deepEqual(missing, [], `these draw nothing at all:\n  ${missing.join('\n  ')}`);
  });

  it('every task type maps to an icon that exists', () => {
    for (const [type, name] of Object.entries(TYPE_ICON)) {
      assert.ok(known(name), `TYPE_ICON.${type} = "${name}", which is not an icon`);
    }
  });

  /**
   * The names that caught this out. They read like icons and are not, so a
   * future `<Icon name={channel}>` should keep failing the test above
   * rather than quietly drawing a hole.
   */
  it('a channel is not an icon name, which is the trap', () => {
    for (const channel of ['whatsapp', 'email', 'call']) {
      assert.equal(known(channel), false, `"${channel}" became an icon; TYPE_ICON may now be redundant`);
    }
  });

  it('finds a decent number of names, or it is checking nothing', () => {
    let count = 0;
    for (const file of [...sources('app'), ...sources('src')]) {
      count += [...readFileSync(join(ROOT, file), 'utf8').matchAll(/<Icon\s+name="([^"]+)"/g)].length;
    }
    assert.ok(count >= 30, `expected icons all over the app, found ${count}`);
  });
});
