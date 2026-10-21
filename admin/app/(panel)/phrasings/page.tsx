/**
 * How people ask Sanad — the list the Assistant is improved from.
 *
 * Every row arrived redacted from somebody's own phone: names, numbers and
 * addresses were replaced with {name}, {phone} and {email} before the
 * sentence was queued (src/lib/parse/redact.ts), a sentence the device was
 * not sure it had cleaned was dropped rather than sent, and the table itself
 * refuses a row that still holds an address or a long run of digits. Nothing
 * here says who asked, which is why it needs `dataset` rather than
 * `personal`. BUILD-REVIEW §2.114.
 *
 * The filter that matters is **Not understood**: each of those is a sentence
 * Sanad reached the end of its rules on, and each is a line waiting to be
 * written into src/lib/parse/phrasings.test.ts.
 */
import Link from 'next/link';

import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { rel } from '@/data/format';
import { Heading, mono } from '@/ui/bits';

const COLUMNS = 'minmax(0,1fr) 120px 80px 90px 110px';

/** The verdicts, in words a reader does not have to know the codebase for. */
const SAID: Record<string, string> = {
  person: 'Someone’s details',
  tasks: 'The day’s list',
  next: 'What’s next',
  waiting: 'Who’s waiting',
  quiet: 'Who’s gone quiet',
  oneThing: 'Their One Thing',
  history: 'What was said',
  withPerson: 'Open with one person',
  findTask: 'Found a task',
  people: 'A count of people',
  log: 'The day’s log',
  who: 'Asked which person',
  nobody: 'Nobody by that name',
  task: 'Saved as a task',
  dump: 'Split into errands',
  contact: 'Saved a person',
  attach: 'Card or file',
  smalltalk: 'Small talk',
  unknown: 'Not understood',
};

export default async function PhrasingsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin('dataset');
  const show = (await searchParams).show === 'unanswered' ? 'unanswered' : 'all';
  const data = await source();
  const now = data.now();
  const { rows, distinct, total, unanswered } = await data.phrasings(show);

  return (
    <>
      <Heading
        title="How people ask Sanad"
        sub="Redacted on the phone before it was sent — names, numbers and addresses are replaced, and nothing here says who asked. Last 90 days."
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat label="Asked" value={total.toLocaleString('en-GB')} />
        <Stat label="Different phrasings" value={distinct.toLocaleString('en-GB')} />
        <Stat label="Not understood" value={unanswered.toLocaleString('en-GB')} tone={unanswered > 0 ? '#B3261E' : undefined} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Tab href="/phrasings" label="Everything" on={show === 'all'} />
        <Tab href="/phrasings?show=unanswered" label="Not understood" on={show === 'unanswered'} />
      </div>

      <div style={{ background: '#fff', borderRadius: 18, overflow: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', fontSize: 12, color: '#6b6b68', borderBottom: '1px solid #efefec' }}>
            <span>What they said</span>
            <span>Sanad made it</span>
            <span>Asked</span>
            <span>Language</span>
            <span>Last</span>
          </div>
          {rows.length === 0 ? (
            <p style={{ padding: '22px 18px', fontSize: 13, color: '#55554f', margin: 0 }}>
              {show === 'unanswered' ? 'Nothing Sanad could not answer. ' : 'Nothing yet. '}
              Phrasings arrive with the next sync from each device.
            </p>
          ) : (
            rows.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', borderBottom: '1px solid #f3f2ee', fontSize: 13, alignItems: 'baseline' }}>
                {/* Arabic reads right to left, and an Arabic sentence with a
                    {name} in it is mixed, so each line is given its own
                    direction rather than the page's. */}
                <span dir="auto" style={{ fontFamily: mono, fontSize: 12.5, color: '#0b0b0b', wordBreak: 'break-word' }}>
                  {r.text}
                </span>
                <span style={{ color: r.verdict === 'unknown' ? '#B3261E' : '#55554f', fontWeight: r.verdict === 'unknown' ? 500 : 400 }}>
                  {SAID[r.verdict] ?? r.verdict}
                </span>
                <span style={{ fontFamily: mono, fontSize: 12 }}>
                  {r.count}
                  {r.spoken > 0 ? <span style={{ color: '#6b6b68' }}> · {r.spoken} spoken</span> : null}
                </span>
                <span style={{ color: '#55554f' }}>{r.langs.join(', ')}</span>
                <span style={{ color: '#6b6b68', fontSize: 12 }}>{rel(r.lastAt, now)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', minWidth: 130 }}>
      <div style={{ fontSize: 12, color: '#6b6b68' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: tone ?? '#0b0b0b' }}>{value}</div>
    </div>
  );
}

function Tab({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: '7px 14px',
        borderRadius: 999,
        fontSize: 13,
        textDecoration: 'none',
        background: on ? '#0b0b0b' : '#fff',
        color: on ? '#fff' : '#55554f',
      }}
    >
      {label}
    </Link>
  );
}
