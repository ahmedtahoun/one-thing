/**
 * Refuses to test a web bundle older than the code.
 *
 * The browser suites read `dist/`, which `expo export --platform web` writes.
 * Nothing rebuilds it for them: `npm run smoke` runs the scripts directly, so
 * on a developer's machine it happily tests a bundle from before the last
 * change. That is worse than a failing test, because it fails in both
 * directions — it reported two of developer 2's passing features as broken
 * (BUILD-REVIEW § 2.52), and it would just as readily report green on code
 * that is broken.
 *
 * CI never hits this: the fidelity job runs `capture:app`, which exports
 * first, and a fresh runner has no `dist/` at all. So the fix belongs here
 * rather than in the npm script — rebuilding on every smoke run would cost
 * minutes locally and export twice in CI, to prevent something CI cannot do.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** What `expo export` actually reads. Not scripts/, supabase/ or admin/. */
const SOURCES = ['app', 'src', 'assets', 'app.json', 'app.config.js', 'package.json'];
const SKIP = new Set(['node_modules', 'dist', '.git', '.expo']);

/** The newest mtime under a path, in ms. Missing paths count as 0. */
function newest(target) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    return 0;
  }
  if (!stat.isDirectory()) return stat.mtimeMs;
  let max = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const at = newest(path.join(target, entry.name));
    if (at > max) max = at;
  }
  return max;
}

/**
 * Throws unless `dist/` is at least as new as every source it is built from.
 * Call it before a suite reads the bundle.
 */
function requireFreshDist() {
  const bundle = newest(path.join(ROOT, 'dist'));
  if (bundle === 0) {
    throw new Error('No dist/ to test. Run `npm run export:web` first.');
  }
  const source = Math.max(...SOURCES.map((s) => newest(path.join(ROOT, s))));
  if (source > bundle) {
    const behind = Math.round((source - bundle) / 60000);
    throw new Error(
      `dist/ is ${behind} minute(s) older than the code, so this suite would test the previous build.\n` +
        'Run `npm run export:web` and try again.'
    );
  }
}

module.exports = { requireFreshDist };
