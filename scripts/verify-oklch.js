// Ground-truth check: our oklch -> hex conversion must match what Chromium
// paints for the same oklch() string, because that is what the design
// prototype was reviewed in. Usage: node scripts/verify-oklch.js <list.txt>
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const { oklchStringToHex } = require('./oklch.js');

(async () => {
  const colours = fs.readFileSync(process.argv[2], 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  await page.setContent('<div id="probe"></div>');

  const mismatches = [];
  const table = {};
  for (const c of colours) {
    const chromeHex = await page.evaluate((col) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = col;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    }, c);
    const ours = oklchStringToHex(c);
    // Chromium is the authority: the design was reviewed in it. Ours is the
    // cross-check, and a 1/255 rounding difference per channel is acceptable.
    table[c] = chromeHex;
    const off = [1, 3, 5].map((i) => Math.abs(parseInt(ours.slice(i, i + 2), 16) - parseInt(chromeHex.slice(i, i + 2), 16)));
    if (Math.max(...off) > 1) mismatches.push({ colour: c, ours, chromium: chromeHex, off });
  }
  await browser.close();

  console.log(JSON.stringify({ checked: colours.length, mismatches }, null, 2));
  if (!mismatches.length) console.log('All ' + colours.length + ' oklch colours match Chromium within 1/255 per channel.');
  fs.writeFileSync(process.argv[3] || '/dev/null', JSON.stringify(table, null, 2));
  process.exit(mismatches.length ? 1 : 0);
})();
