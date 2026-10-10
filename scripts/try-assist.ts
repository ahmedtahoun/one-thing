/**
 * Runs the `assist` edge function's real code — the prompt, the schema,
 * the Claude call, the contract — on the handoff's own sample sentences,
 * in both languages, and prints what each screen would be offered. Nothing
 * is mocked but the database.
 *
 * Every run calls Claude and costs money, which is why it is not in CI.
 *
 *   ANTHROPIC_API_KEY=… npx tsx scripts/try-assist.ts
 */
import { C } from '../src/content/strings';
import { claudeAsk } from '../supabase/functions/assist/claude';
import { handle } from '../supabase/functions/assist/handler';

const PEOPLE = {
  en: [
    { id: 'c1', name: 'Mohammed Al-Saadi', role: 'Client · Al-Saadi Trading' },
    { id: 'c2', name: 'Sara Haddad', role: 'Investor · Northwind VC' },
    { id: 'c4', name: 'Noura Al-Harbi', role: 'Designer · Studio Noura' },
  ],
  ar: [
    { id: 'c1', name: 'محمد السعدي', role: null },
    { id: 'c2', name: 'سارة حداد', role: null },
    { id: 'c4', name: 'نورة الحربي', role: null },
  ],
};

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Set ANTHROPIC_API_KEY.');
  const ask = claudeAsk(key);
  const now = '2026-10-10T06:20:00.000Z'; // 09:20 in Riyadh, as the tests' day

  for (const lang of ['en', 'ar'] as const) {
    const cases: [string, string][] = [
      ['parse', C[lang].cap_sample],
      ['split', C[lang].d_sample],
      ...C[lang].chips.map((chip): [string, string] => ['interpret', chip]),
      ['interpret', lang === 'en' ? 'What is the capital of France?' : 'ما هي عاصمة فرنسا؟'],
    ];
    for (const [op, text] of cases) {
      const result = await handle(
        { op, text, lang, now, timeZone: 'Asia/Riyadh' },
        { spend: async () => true, refund: async () => {}, people: async () => PEOPLE[lang], ask }
      );
      console.log(`\n[${lang} · ${op}] ${text}\n→ ${result.status} ${JSON.stringify(result.body, null, 2)}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
