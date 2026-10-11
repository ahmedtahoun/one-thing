/**
 * Drives the panel in a browser and checks what each action does: the
 * sign-in rules, what each role can reach, that opening a record and each
 * tab writes the audit log, and the actions on users, tickets and privacy
 * requests. Demo mode, so it needs no database.
 *
 *   npm run build:demo && node scripts/smoke.js
 */
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ADMIN = path.join(__dirname, '..');
const { launch } = require(path.join(ADMIN, '..', 'scripts/browser.js'));
const PORT = 3198;
const BASE = `http://127.0.0.1:${PORT}`;

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), ...(ok ? {} : { detail }) });

async function serve() {
  const child = spawn(process.execPath, [path.join(ADMIN, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT)], {
    cwd: ADMIN,
    env: { ...process.env, ADMIN_DEMO: '1', NEXT_PUBLIC_ADMIN_TIME_ZONE: 'UTC', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  for (let i = 0; i < 100; i++) {
    const up = await new Promise((r) => http.get(`${BASE}/sign-in`, (res) => r(res.statusCode === 200)).on('error', () => r(false)));
    if (up) return child;
    await new Promise((r) => setTimeout(r, 300));
  }
  child.kill();
  throw new Error('The admin server did not start. Run `npm run build:demo` first.');
}

const text = (page) => page.evaluate(() => document.body.innerText);
const click = async (page, label) => {
  await page.getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(400);
};

async function signIn(page, email) {
  await page.goto(`${BASE}/sign-in`);
  await page.getByPlaceholder('you@onlyonething.app').fill(email);
  await page.getByPlaceholder('Password').fill('secret1');
  await click(page, 'Continue');
  await page.getByPlaceholder('6-digit code').fill('123456');
  await click(page, 'Verify');
  await page.waitForURL(/\/overview$/);
}

async function signOut(page) {
  await click(page, 'Sign out');
  await page.waitForURL(/\/sign-in$/);
}

(async () => {
  const server = await serve();
  const browser = await launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    page.on('dialog', (d) => d.accept());

    // ---------------------------------------------------------- sign in ----
    await page.goto(`${BASE}/users`);
    check('signed out, a panel page goes to sign in', page.url().endsWith('/sign-in'), page.url());

    await page.getByPlaceholder('you@onlyonething.app').fill('khalid@gmail.com');
    await page.getByPlaceholder('Password').fill('secret1');
    await click(page, 'Continue');
    check('an outside email is refused', (await text(page)).includes('Use your @onlyonething.app email.'));

    await page.getByPlaceholder('you@onlyonething.app').fill('khalid@onlyonething.app');
    await page.getByPlaceholder('Password').fill('123');
    await click(page, 'Continue');
    check('a short password is refused', (await text(page)).includes('Enter your password.'));
    check('typing clears the error', await (async () => {
      await page.getByPlaceholder('Password').fill('secret1');
      return !(await text(page)).includes('Enter your password.');
    })());

    await click(page, 'Continue');
    await page.getByPlaceholder('6-digit code').fill('12a');
    check('the code keeps digits only', (await page.getByPlaceholder('6-digit code').inputValue()) === '12');
    await click(page, 'Verify');
    check('a short code is refused', (await text(page)).includes('The code is 6 digits.'));
    await page.getByPlaceholder('6-digit code').fill('123456');
    await click(page, 'Verify');
    await page.waitForURL(/\/overview$/);
    check('the Owner lands on Overview', (await text(page)).includes('Khalid · Owner'));

    // ------------------------------------------------------------ users ----
    await click(page, 'Users');
    await page.getByPlaceholder('Search name, email, phone or user ID').fill('sara');
    await page.waitForTimeout(600);
    let body = await text(page);
    check('search narrows the list', body.includes('Sara Haddad') && !body.includes('Khalid Al-Mansouri') && body.includes('1 of 2,418 shown'));
    await page.getByPlaceholder('Search name, email, phone or user ID').fill('');
    await click(page, 'Trial');
    await page.waitForTimeout(600);
    body = await text(page);
    check('the Trial chip shows trial users only', body.includes('Faisal Al-Otaibi') && !body.includes('Sara Haddad'));
    await click(page, 'All');
    await page.waitForTimeout(600);

    await click(page, 'Khalid Al-Mansouri');
    await page.waitForSelector('[data-probe="drawer"] >> text=Consent record');
    check('the drawer opens on Troubleshoot', (await text(page)).includes('Support tickets from this user'));
    await page.locator('button').filter({ hasText: /^Tasks/ }).last().click();
    await page.waitForTimeout(400);
    check('the Tasks tab lists tasks', (await text(page)).includes('Confirm Friday catering order') || (await text(page)).includes('Overdue'));
    await click(page, '✕');

    await page.getByText('Sara Haddad', { exact: true }).first().click();
    await page.waitForSelector('text=Account actions');
    await click(page, 'Suspend');
    await page.waitForTimeout(500);
    body = await text(page);
    check('Suspend shows the banner and offers Restore', body.includes('Account suspended — the user can’t sign in.') && body.includes('Restore access'));
    await click(page, 'Restore access');
    await page.waitForTimeout(500);
    check('Restore lifts it', !(await text(page)).includes('Account suspended'));
    await click(page, '✕');

    // ------------------------------------------------------- audit log ----
    await click(page, 'Audit log');
    body = await text(page);
    check('signing in is logged', body.includes('Signed in to admin'));
    check('opening a record is logged', body.includes('Opened user record · Khalid Al-Mansouri'));
    check('a tab view is logged', body.includes('Viewed tasks · Khalid Al-Mansouri'));
    check('suspending and restoring are logged', body.includes('Suspended · Sara Haddad') && body.includes('Restored · Sara Haddad'));

    // ---------------------------------------------------------- support ----
    await click(page, 'Support');
    const badgeBefore = await page.locator('[data-probe="nav-support"] span').nth(1).innerText();
    await click(page, 'Thanks!');
    check('a macro fills the reply', (await page.locator('textarea').inputValue()).startsWith('Thank you so much'));
    await click(page, 'Send reply');
    await page.waitForTimeout(600);
    check('the reply joins the thread', (await text(page)).includes('You · support'));
    const badgeAfter = await page.locator('[data-probe="nav-support"] span').nth(1).innerText().catch(() => '0');
    check('the unanswered count drops', Number(badgeAfter) === Number(badgeBefore) - 1, `${badgeBefore} → ${badgeAfter}`);

    // ------------------------------------------------- privacy requests ----
    await click(page, 'Privacy requests');
    const completedBefore = (await text(page)).split('Completed').length;
    await click(page, 'Send export');
    await page.waitForTimeout(600);
    check('Send export completes the request', (await text(page)).split('Completed').length === completedBefore + 1);

    // ----------------------------------------------------------- roles ----
    await signOut(page);
    await signIn(page, 'dana@onlyonething.app');
    body = await text(page);
    check('Support is signed in as Support', body.includes('Dana · Support'));
    check('Support has no Audit log or Team', !body.includes('Audit log') && !body.includes('Team & roles'));
    await page.goto(`${BASE}/team`);
    check('Support is turned away from Team', page.url().endsWith('/overview'), page.url());
    await click(page, 'Users');
    await click(page, 'Khalid Al-Mansouri');
    await page.waitForSelector('text=Account actions');
    body = await text(page);
    check('Support can export but not suspend or delete', body.includes('Export their data') && !body.includes('Suspend') && !body.includes('Delete account'));
    check('Support cannot grant Pro', !body.includes('Grant Pro (comp)'));
    await click(page, '✕');

    await signOut(page);
    await signIn(page, 'turki@onlyonething.app');
    body = await text(page);
    check('the Analyst sees Overview and Growth only', body.includes('Overview') && body.includes('Growth') && !body.includes('Users') && !body.includes('Subscriptions'));
    check('the Analyst can export the pseudonymised dataset', body.includes('Export dataset (pseudonymised)'));
    await page.goto(`${BASE}/users`);
    check('the Analyst is turned away from Users', page.url().endsWith('/overview'), page.url());
    await page.goto(`${BASE}/growth`);
    check('the Analyst cannot change offer codes', !(await text(page)).includes('New code') && !(await text(page)).includes('Pause'));
  } finally {
    await browser.close();
    server.kill();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
})();
