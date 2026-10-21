/**
 * What people typed to Sanad, in their own words — from the accounts that
 * turned on "Help improve Sanad" and no others.
 *
 * This is the sibling of /phrasings and the opposite of it. There the names
 * are gone before the sentence leaves the phone, and the screen needs only
 * `dataset`. Here the sentence is as written, which means it can hold a name,
 * a number or a price, so it needs a permission only the Owner
 * holds, it is audit-logged like every other view of somebody's data, and it empties the moment they change their
 * mind. BUILD-REVIEW §2.115.
 */
import Link from 'next/link';

import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { stamp } from '@/data/format';
import { Heading, mono } from '@/ui/bits';

const COLUMNS = 'minmax(0,1fr) 150px 90px 150px';

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

export default async function TranscriptsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  // Its own permission, held by the Owner alone: personal data keeps the
  // Analyst out, and reading everyone's sentences is not support work.
  const admin = await requireAdmin('transcripts');
  const show = (await searchParams).show === 'unanswered' ? 'unanswered' : 'all';
  const data = await source();
  const { rows, people, total } = await data.transcripts(show);
  // Every view of personal data is written down, the same as opening a user
  // record. No user is named here, so neither is one in the entry.
  await data.log(admin.id, 'Viewed Sanad transcripts', 'Improving the assistant');

  return (
    <>
      <Heading
        title="What people told Sanad"
        sub="In their own words, from the accounts that turned on “Help improve Sanad”. Personal data: this view is in the audit log, and a person turning the setting off deletes their lines."
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat label="Lines" value={total.toLocaleString('en-GB')} />
        <Stat label="People offering" value={people.toLocaleString('en-GB')} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Tab href="/transcripts" label="Everything" on={show === 'all'} />
        <Tab href="/transcripts?show=unanswered" label="Not understood" on={show === 'unanswered'} />
        <Tab href="/phrasings" label="The redacted list →" on={false} />
      </div>

      <div style={{ background: '#fff', borderRadius: 18, overflow: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', fontSize: 12, color: '#6b6b68', borderBottom: '1px solid #efefec' }}>
            <span>What they wrote</span>
            <span>Sanad made it</span>
            <span>Language</span>
            <span>When</span>
          </div>
          {rows.length === 0 ? (
            <p style={{ padding: '22px 18px', fontSize: 13, color: '#55554f', margin: 0 }}>
              {show === 'unanswered'
                ? 'Nothing Sanad could not answer.'
                : 'Nobody is offering their words yet. The setting is off until somebody turns it on, in Settings → Privacy.'}
            </p>
          ) : (
            rows.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', borderBottom: '1px solid #f3f2ee', fontSize: 13, alignItems: 'baseline' }}>
                {/* Mixed Arabic and Latin in one line, so each gets its own direction. */}
                <span dir="auto" style={{ fontFamily: mono, fontSize: 12.5, color: '#0b0b0b', wordBreak: 'break-word' }}>
                  {r.text}
                </span>
                <span style={{ color: r.verdict === 'unknown' ? '#B3261E' : '#55554f', fontWeight: r.verdict === 'unknown' ? 500 : 400 }}>
                  {SAID[r.verdict] ?? r.verdict}
                  {r.source === 'spoken' ? <span style={{ color: '#6b6b68' }}> · spoken</span> : null}
                </span>
                <span style={{ color: '#55554f' }}>{r.lang}</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: '#6b6b68' }}>{stamp(r.at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', minWidth: 130 }}>
      <div style={{ fontSize: 12, color: '#6b6b68' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Tab({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link
      href={href}
      style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, textDecoration: 'none', background: on ? '#0b0b0b' : '#fff', color: on ? '#fff' : '#55554f' }}
    >
      {label}
    </Link>
  );
}
