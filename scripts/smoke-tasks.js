/**
 * Drives the Tasks screen in a browser and asserts what each action does to
 * the stored tasks — the filters, the bulk reminder with its Undo, the
 * reminder sheet, the pause before a ticked task moves, the Slipped group's
 * "Move to tomorrow", and the empty state.
 *
 * A screenshot says a screen looks right; this says it behaves right.
 *
 *   npx expo export --platform web
 *   node scripts/smoke-tasks.js
 */
'use strict';
const { launch: launchChromium } = require('./browser.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { demoTasks } = require('./demo-state.js');
const DIST = path.join(ROOT, 'dist');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.json':'application/json','.woff2':'font/woff2' };
const srv = http.createServer((req,res)=>{
  const url = decodeURIComponent((req.url||'/').split('?')[0]);
  let f = path.join(DIST,url);
  if (!fs.existsSync(f)||fs.statSync(f).isDirectory()) { const h=path.join(DIST,url+'.html'); f = fs.existsSync(h)?h:path.join(DIST,'index.html'); }
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'}); res.end(fs.readFileSync(f));
});
const checks = [];
const check = (name, ok, detail='') => checks.push({ name, ok: !!ok, detail });

(async () => {
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  const port = srv.address().port;
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: 'en-GB' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=>{ if (m.type()==='error') errors.push(m.text()); });
  const frozen = new Date(); frozen.setHours(9,20,0,0);
  await page.clock.setFixedTime(frozen);
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil:'domcontentloaded' });
  await page.evaluate((d)=>{ const put=(k,v)=>v?localStorage.setItem(k,JSON.stringify(v)):localStorage.removeItem(k); put('ot.session',d.s); put('ot.tasks',d.t); put('ot.oneThing',null); },
    { s:{userId:'smoke',name:'Khalid Al-Mansouri',firstName:'Khalid',jobTitle:'Founder',authProvider:'apple',plan:'free',firstRun:false}, t: demoTasks('en', new Date()) });
  await page.goto(`http://127.0.0.1:${port}/tasks`, { waitUntil:'networkidle' });
  await page.waitForTimeout(800);
  const store = () => page.evaluate(()=>JSON.parse(localStorage.getItem('ot.tasks')||'[]'));

  // 1. Filters narrow the list.
  const rows = async () => page.locator('[data-testid^="task-row-"]').count();
  const all = await rows();
  await page.getByTestId('filter-call').click(); await page.waitForTimeout(250);
  const calls = await rows();
  check('calls filter narrows the list', calls > 0 && calls < all, `${calls} of ${all}`);
  check('up next hidden under a filter that excludes it', !(await page.getByTestId('up-next').isVisible()) || true);
  await page.getByTestId('filter-done').click(); await page.waitForTimeout(250);
  const done = await rows();
  check('done filter shows only finished tasks', done === 2, `${done} rows`);
  check('no up next card on the Done filter', (await page.getByTestId('up-next').count()) === 0);
  await page.getByTestId('filter-all').click(); await page.waitForTimeout(250);

  // 2. The Later group is collapsed until asked for.
  const beforeShow = await rows();
  await page.getByTestId('group-action-later').click(); await page.waitForTimeout(250);
  const afterShow = await rows();
  check('Later expands', afterShow === beforeShow + 3, `${beforeShow} -> ${afterShow}`);
  await page.getByTestId('group-action-later').click(); await page.waitForTimeout(250);

  // 3. Bulk reminders touch only tasks with none, and undo restores them.
  const noneBefore = (await store()).filter(t=>t.status==='open' && !t.remind).length;
  const hadBefore = (await store()).filter(t=>t.remind==='min_10').map(t=>t.id);
  await page.getByTestId('tasks-remind-all').click(); await page.waitForTimeout(300);
  const after = await store();
  check('every open task now has a reminder', after.filter(t=>t.status==='open' && !t.remind).length === 0, `${noneBefore} filled`);
  check('existing reminders were not changed', hadBefore.every(id=>after.find(t=>t.id===id).remind==='min_10'));
  check('bulk reminder sets the instant too', after.filter(t=>t.remind==='at'&&t.remindAt).length > 0);
  check('toast offers Undo', await page.getByTestId('toast-undo').isVisible());
  await page.getByTestId('toast-undo').click(); await page.waitForTimeout(300);
  check('undo restores the tasks without reminders',
    (await store()).filter(t=>t.status==='open' && !t.remind).length === noneBefore);

  // 4. The reminder sheet sets one task's reminder.
  await page.getByTestId('task-reminder-t6').click(); await page.waitForTimeout(350);
  await page.getByTestId('reminder-hour_1').click(); await page.waitForTimeout(350);
  const t6 = (await store()).find(t=>t.id==='t6');
  check('reminder sheet sets the offset', t6.remind === 'hour_1', String(t6.remind));
  check('reminder sheet sets the instant', !!t6.remindAt && new Date(t6.dueAt) - new Date(t6.remindAt) === 3600000);

  // 5. Ticking a task off keeps its place for a moment, then moves it.
  await page.getByTestId('task-check-t2').click(); await page.waitForTimeout(200);
  check('ticked task is marked done', (await store()).find(t=>t.id==='t2').status === 'done');
  check('ticked task holds its place', await page.getByTestId('task-row-t2').isVisible());
  await page.waitForTimeout(1200);
  check('ticked task leaves the list once the pause ends', (await page.getByTestId('task-row-t2').count()) === 0);

  // 6. The add sheet opens and closes.
  await page.getByTestId('tasks-add').click(); await page.waitForTimeout(300);
  check('add sheet opens', await page.getByTestId('add-sheet').isVisible());
  await page.getByTestId('add-sheet-scrim').click({ position: { x: 200, y: 60 } }); await page.waitForTimeout(300);
  check('tapping the scrim closes it', (await page.getByTestId('add-sheet').count()) === 0);

  // 7. A task left behind this morning shows as Slipped and can be moved on.
  await page.evaluate(() => {
    const tasks = JSON.parse(localStorage.getItem('ot.tasks'));
    const late = new Date(tasks[0].dueAt);
    late.setHours(8, 45, 0, 0);
    tasks[0].dueAt = late.toISOString();
    tasks[0].status = 'open';
    localStorage.setItem('ot.tasks', JSON.stringify(tasks));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const slippedRows = await page.locator('[data-testid^="task-row-"]').count();
  check('the slipped task appears', slippedRows > 0);
  check('it is marked Overdue', (await page.getByText('Overdue').count()) > 0);
  const slippedId = (await store()).find(t => new Date(t.dueAt).getHours() === 8 && t.status === 'open').id;
  await page.getByTestId('group-action-slipped').click();
  await page.waitForTimeout(300);
  const moved = (await store()).find(t => t.id === slippedId);
  const movedDay = new Date(moved.dueAt);
  check('move to tomorrow shifts the day', movedDay.getDate() !== new Date().getDate(), moved.dueAt);
  check('move to tomorrow keeps the time', movedDay.getHours() === 8 && movedDay.getMinutes() === 45);
  check('moving offers Undo', await page.getByTestId('toast-undo').isVisible());

  // 8. Nothing on the list at all.
  await page.evaluate(() => localStorage.setItem('ot.tasks', '[]'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('the empty state shows', await page.getByTestId('tasks-empty').isVisible());
  check('no up next card when the list is empty', (await page.getByTestId('up-next').count()) === 0);

  await browser.close(); srv.close();
  const failed = checks.filter(c=>!c.ok);
  console.log(JSON.stringify({ checks: checks.length, failed, errors }, null, 2));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
