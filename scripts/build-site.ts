/**
 * Writes the public website — Privacy, Terms, Support, Delete — into
 * `website/`, as plain HTML a static host can serve with no build step.
 *
 * The Privacy and Terms text is the app's own (src/content/strings.ts, `ACC`),
 * read here so the site and the in-app copy cannot drift. Everything else on
 * the pages is written below.
 *
 *   npx tsx scripts/build-site.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { ACC } from '../src/content/strings';

const OUT = join(__dirname, '..', 'website');
const EMAIL = 'privacy@onlyonething.app';
const DOMAIN = 'https://onlyonething.app';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
type Section = readonly [string, string];

const CSS = `
:root{--bg:#fff;--ink:#111;--soft:#555;--line:#e6e6e1;--card:#f6f6f3;--accent:#111}
@media(prefers-color-scheme:dark){:root{--bg:#121212;--ink:#f2f2ee;--soft:#a8a8a2;--line:#2b2b28;--card:#1b1b19;--accent:#f2f2ee}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Arabic",Helvetica,Arial,sans-serif}
a{color:inherit}header,main,footer{max-width:720px;margin:0 auto;padding:0 20px}
header{display:flex;justify-content:space-between;align-items:center;padding-top:22px;padding-bottom:14px;border-bottom:1px solid var(--line)}
header a.brand{font-weight:700;text-decoration:none}nav{display:flex;gap:16px;font-size:15px}nav a{color:var(--soft);text-decoration:none}nav a:hover{color:var(--ink)}
h1{font-size:30px;line-height:1.2;margin:36px 0 6px}h2{font-size:19px;margin:28px 0 4px}p{margin:6px 0}
.meta{color:var(--soft);font-size:14px}.lang{margin:28px 0 0;padding-top:8px;border-top:1px solid var(--line)}
.card{background:var(--card);border-radius:16px;padding:18px 20px;margin:20px 0}
ol,ul{padding-inline-start:22px}li{margin:6px 0}
.btn{display:inline-block;background:var(--accent);color:var(--bg);padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:600;margin-top:8px}
footer{padding-top:40px;padding-bottom:48px;color:var(--soft);font-size:14px}
[dir=rtl]{text-align:right}
`;

function page(path: string, title: string, description: string, body: string): void {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · The One Thing</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${DOMAIN}/${path}">
<style>${CSS}</style>
</head>
<body>
<header><a class="brand" href="/">The One Thing</a>
<nav><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/support/">Support</a><a href="/delete/">Delete account</a></nav></header>
<main>
${body}
</main>
<footer>© The One Thing · <a href="mailto:${EMAIL}">${EMAIL}</a></footer>
</body>
</html>
`;
  const file = join(OUT, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const sections = (list: readonly Section[]) => list.map(([h, b]) => `<h2>${esc(h)}</h2>\n<p>${esc(b)}</p>`).join('\n');

/** An English block followed by an Arabic one, so a single URL serves both. */
const bilingual = (en: string, ar: string) =>
  `<section id="en" lang="en" dir="ltr">\n${en}\n</section>\n<section id="ar" class="lang" lang="ar" dir="rtl">\n${ar}\n</section>`;

// --- Privacy ------------------------------------------------------------------
const privacyExtraEn: Section[] = [
  ['Voice notes', 'When you tap the microphone, your phone’s own speech recogniser (Apple’s or Google’s, under their privacy terms) turns what you say into text. The One Thing uses that text and does not keep the audio.'],
  ['Reminders', 'Reminders and nudges are scheduled on your phone. You can turn them off in your phone’s settings at any time.'],
  ['Where it is kept', 'Data you sync is stored with our hosting provider on servers in the European Union (Ireland).'],
];
const privacyExtraAr: Section[] = [
  ['الملاحظات الصوتية', 'لما تضغط على الميكروفون، يحوّل مُتعرّف الكلام في جوالك (من آبل أو قوقل، وفق شروط خصوصيتهم) كلامك إلى نص. «الشيء الواحد» يستخدم هذا النص ولا يحتفظ بالتسجيل الصوتي.'],
  ['التذكيرات', 'التذكيرات والتنبيهات تُجدول على جوالك. تقدر توقفها من إعدادات جوالك في أي وقت.'],
  ['وين تنحفظ البيانات', 'البيانات اللي تزامنها تُخزَّن عند مزوّد الاستضافة على خوادم في الاتحاد الأوروبي (أيرلندا).'],
];
const priv = (lang: 'en' | 'ar', extra: Section[]) => {
  const list = ACC[lang].priv as unknown as Section[];
  // Extras go before "Contact", which is last.
  return sections([...list.slice(0, -1), ...extra, ...list.slice(-1)]);
};
page(
  'privacy',
  'Privacy Policy',
  'What The One Thing collects, why, and the choices you have.',
  `<h1>Privacy Policy</h1><p class="meta">${esc(ACC.en.si.updated)} · <a href="#ar">العربية</a></p>\n` +
    bilingual(priv('en', privacyExtraEn), `<h1>سياسة الخصوصية</h1><p class="meta">${esc(ACC.ar.si.updated)}</p>\n${priv('ar', privacyExtraAr)}`)
);

// --- Terms --------------------------------------------------------------------
page(
  'terms',
  'Terms of Service',
  'The terms for using The One Thing.',
  `<h1>Terms of Service</h1><p class="meta">${esc(ACC.en.si.updated)} · <a href="#ar">العربية</a></p>\n` +
    bilingual(
      sections(ACC.en.terms as unknown as Section[]),
      `<h1>شروط الخدمة</h1><p class="meta">${esc(ACC.ar.si.updated)}</p>\n${sections(ACC.ar.terms as unknown as Section[])}`
    )
);

// --- Support ------------------------------------------------------------------
page(
  'support',
  'Support',
  'Help with The One Thing: reminders, your data and your account.',
  `<h1>Support</h1><p class="meta"><a href="#ar">العربية</a></p>
` +
    bilingual(
      `<p>Write to <a href="mailto:${EMAIL}">${EMAIL}</a> and tell us what happened. A screenshot helps. In the app: <strong>Settings → Help &amp; feedback</strong>.</p>
<h2>Reminders don’t arrive</h2>
<ol><li>On your iPhone: Settings → The One Thing → Notifications → Allow Notifications. On Android: Settings → Apps → The One Thing → Notifications.</li>
<li>Check Focus / Do Not Disturb isn’t silencing them, and that the task has a time.</li>
<li>In the app, <strong>Settings → Reminders</strong> sets your style and quiet hours (22:00–08:00 by default, when reminders arrive silently).</li></ol>
<h2>Your data</h2>
<p>Download or delete your data from <strong>Settings → Privacy &amp; data</strong>. See also <a href="/delete/">how to delete your account</a> and the <a href="/privacy/">Privacy Policy</a>.</p>
<h2>Subscriptions</h2>
<p>Pro is billed by the App Store or Google Play. Manage or cancel it in your store’s subscription settings, or from <strong>Settings → Manage subscription</strong>.</p>`,
      `<p>راسلنا على <a href="mailto:${EMAIL}">${EMAIL}</a> وقل لنا وش صار. لقطة الشاشة تساعد. من التطبيق: <strong>الإعدادات ← المساعدة والملاحظات</strong>.</p>
<h2>التذكيرات ما توصل</h2>
<ol><li>على الآيفون: الإعدادات ← The One Thing ← الإشعارات ← السماح بالإشعارات. على أندرويد: الإعدادات ← التطبيقات ← The One Thing ← الإشعارات.</li>
<li>تأكد إن وضع التركيز أو عدم الإزعاج ما يكتمها، وإن للمهمة وقت.</li>
<li>من التطبيق، <strong>الإعدادات ← التذكيرات</strong> تحدد أسلوبك وساعات الهدوء (من ٢٢:٠٠ إلى ٠٨:٠٠ افتراضيًا، وفيها تصل التذكيرات بدون صوت).</li></ol>
<h2>بياناتك</h2>
<p>حمّل أو احذف بياناتك من <strong>الإعدادات ← الخصوصية والبيانات</strong>. شوف أيضًا <a href="/delete/">طريقة حذف حسابك</a> و<a href="/privacy/">سياسة الخصوصية</a>.</p>
<h2>الاشتراكات</h2>
<p>اشتراك Pro يُحاسَب عبر App Store أو Google Play. أدره أو ألغِه من إعدادات الاشتراكات في المتجر، أو من <strong>الإعدادات ← إدارة الاشتراك</strong>.</p>`
    )
);

// --- Delete -------------------------------------------------------------------
/** The same three lines the in-app delete sheet lists. */
const deleteList = ['Your profile, name, phone and job title', 'All tasks, follow-ups and notes', 'Contacts and their history'];
page(
  'delete',
  'Delete your account',
  'How to delete your The One Thing account and data.',
  `<h1>Delete your account</h1><p class="meta"><a href="#ar">العربية</a></p>
` +
    bilingual(
      `<h2>In the app</h2>
<ol><li>Open <strong>Settings → Privacy &amp; data</strong>.</li><li>Tap <strong>Delete account</strong> and confirm.</li></ol>
<h2>Without the app</h2>
<p>Email <a href="mailto:${EMAIL}?subject=Delete%20my%20account">${EMAIL}</a> from the email address you signed in with, with the subject “Delete my account”. If you used Sign in with Apple’s private relay, tell us that address.</p>
<div class="card"><strong>What is erased</strong><ul>${deleteList.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
<p>Data is removed within 30 days. If you gave us a contact’s details, that person can also ask us to remove them at <a href="mailto:${EMAIL}">${EMAIL}</a>.</p></div>
<p><strong>A Pro subscription is not cancelled for you.</strong> Cancel it in App Store or Google Play subscription settings.</p>`,
      `<h1>احذف حسابك</h1>
<h2>من التطبيق</h2>
<ol><li>افتح <strong>الإعدادات ← الخصوصية والبيانات</strong>.</li><li>اضغط <strong>حذف الحساب</strong> وأكّد.</li></ol>
<h2>بدون التطبيق</h2>
<p>راسل <a href="mailto:${EMAIL}?subject=Delete%20my%20account">${EMAIL}</a> من الإيميل اللي سجّلت به الدخول، والعنوان «Delete my account». إذا استخدمت الإيميل المستعار من Sign in with Apple، اكتب لنا ذلك العنوان.</p>
<div class="card"><strong>وش يُحذف</strong><ul><li>ملفك الشخصي واسمك ورقمك ومسمّاك الوظيفي</li><li>كل المهام والمتابعات والملاحظات</li><li>جهات الاتصال وسجلّها</li></ul>
<p>تُحذف البيانات خلال ٣٠ يومًا. وإذا حفظت بيانات شخص عندنا، يقدر هو أيضًا يطلب حذفها على <a href="mailto:${EMAIL}">${EMAIL}</a>.</p></div>
<p><strong>اشتراك Pro ما يُلغى تلقائيًا.</strong> ألغِه من إعدادات الاشتراكات في App Store أو Google Play.</p>`
    )
);

// --- Home ---------------------------------------------------------------------
page(
  '',
  'One task. Done today.',
  'The One Thing helps you name the one task that makes today a good day, and talk to add the rest.',
  `<h1>The One Thing</h1>
<p>Name the one thing that would make today a good day. Talk to add the rest, in English or Arabic.</p>
<div class="card" dir="rtl" lang="ar"><p>حدّد الشيء الواحد اللي يخلّي يومك ناجح، وتكلّم لتضيف الباقي بالعربي أو الإنجليزي.</p></div>
<p><a class="btn" href="/support/">Support</a> <a class="btn" href="/privacy/">Privacy</a></p>`
);
console.log('website/ written');
