/**
 * Where the design handoff lives.
 *
 * `design-handoff/` is a verbatim copy of `design_handoff_the_one_thing`,
 * committed so that a fresh clone can run the content porting and the
 * comparison harness without anyone having to find the original zip. Treat it
 * as read-only: it is the source of truth these scripts read, never a file to
 * edit. If the designer revises it, replace the folder wholesale and re-run
 * `npm run content:port` and `npm run content:inline`.
 *
 * A different copy can be pointed at with an argument, or with HANDOFF= in
 * the environment.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT = path.join(__dirname, '..', 'design-handoff');

/** Resolves the handoff directory, checking it actually is one. */
function handoffDir(explicit) {
  const dir = explicit || process.env.HANDOFF || DEFAULT;
  if (!fs.existsSync(path.join(dir, 'SCREENS.md'))) {
    throw new Error(
      `No design handoff at ${dir} — expected it to contain SCREENS.md, design/ and source/.\n` +
        'Pass a path as the first argument, or set HANDOFF=<path>.'
    );
  }
  return dir;
}

module.exports = { handoffDir, DEFAULT };
