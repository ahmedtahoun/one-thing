/**
 * Launches the Chromium the harness renders in.
 *
 * Every script here measures against Chromium, because that is what the
 * design prototype was reviewed in. How to find it differs by machine, so it
 * is worked out once here rather than hard-coded nine times:
 *
 *   CHROMIUM_PATH=…        an explicit binary, which wins
 *   a Playwright install   the usual case — `npx playwright install chromium`
 *   PLAYWRIGHT_BROWSERS_PATH  a prepared browser directory, as this project's
 *                          cloud container has; scanned as a last resort
 *
 * Hard-coding one container's path is what made the harness unrunnable
 * anywhere else, CI included.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

/** Any chrome binary under a prepared browsers directory. */
function scan(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.startsWith('chromium')) continue;
    for (const rel of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
      const candidate = path.join(dir, entry, rel);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function executablePath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    // Playwright's own copy, when `playwright install` has been run.
    const own = chromium.executablePath();
    if (own && fs.existsSync(own)) return undefined; // let Playwright use it
  } catch {
    // No registered build; fall through to the prepared directory.
  }
  return scan(process.env.PLAYWRIGHT_BROWSERS_PATH) ?? undefined;
}

/** Same signature as chromium.launch(), with the executable already resolved. */
function launch(options = {}) {
  const resolved = executablePath();
  return chromium.launch(resolved ? { ...options, executablePath: resolved } : options);
}

module.exports = { launch, executablePath };
