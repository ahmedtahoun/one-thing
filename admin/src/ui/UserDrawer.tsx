'use client';
/**
 * 05–07 · The user drawer (ADMIN.md § 04–07): who they are, their
 * subscription, usage and consent, and the five tabs — Troubleshoot first.
 *
 * The record arrives only through `openUser`, which writes the audit line
 * before it returns anything; each tab switch writes another.
 *
 * Left out: the prototype's "Why do you need to see this user's content?"
 * panel. Its state is wired, but nothing in the final design opens it —
 * contact data is shown in full ("revealed" is always true) — so it is not
 * reachable there either. BUILD-REVIEW.md §2.37.
 *
 * The Contacts tab holds more than it shows: a row opens underneath itself
 * for the second number, the second email and the channel the user prefers,
 * and the Owner or Support can download the list as a CSV. Both stop where
 * the Privacy Policy's "Who at our company can see it" stops — no address,
 * no labels, no notes — and the download is logged as a copy taken rather
 * than a page read. BUILD-REVIEW.md §2.73, which also says why the download
 * sits above the table and not below it.
 */
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useState, type CSSProperties } from 'react';

import * as act from '@/actions';
import { day, clock, initials, rel } from '@/data/format';
import { COMP_MONTHS, paying, planLabel, type UserDetail } from '@/data/types';
import { download, mono, Pill, tabular } from '@/ui/bits';
import { CHECK, GREEN, PLAN, RED, SUB, TT } from '@/ui/palette';
import { useToast } from '@/ui/Toast';

export type DrawerPermissions = { trial: boolean; grant: boolean; exportUser: boolean; fix: boolean; suspend: boolean; delete: boolean };

type Tab = 'trouble' | 'activity' | 'tasks' | 'contacts' | 'messages';

const outlined: CSSProperties = { height: 36, padding: '0 14px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#0b0b0b' };
const rowLine: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f3f2ee', fontSize: 13 };
const label: CSSProperties = { fontSize: 12, color: '#6b6b68', padding: '0 4px' };

const FIX_LABEL = { howto: 'Send how-to', receipt: 'Re-check receipt', resync: 'Force re-sync' } as const;
const MESSAGE_STATUS = { sent: 'Sent (confirmed by user)', draft: 'Draft', done: 'Call done', 'not sent': 'Not sent' } as const;
const TASK_STATUS_COLOUR = { Overdue: RED, Done: GREEN, Snoozed: 'oklch(0.48 0.14 300)', Open: '#0b0b0b' } as const;

export function UserDrawer({
  userId,
  via,
  now: nowIso,
  can,
  onClose,
  onChanged,
}: {
  userId: string;
  /** Why it was opened, for the audit log ("Ticket #3"); the default reason otherwise. */
  via?: string;
  now: string;
  can: DrawerPermissions;
  onClose: () => void;
  /** Something in the list behind may have changed (plan, suspension, deletion). */
  onChanged: () => void;
}) {
  const router = useRouter();
  const say = useToast();
  const now = new Date(nowIso);
  const [u, setU] = useState<UserDetail | null>(null);
  const [tab, setTab] = useState<Tab>('trouble');
  /** Which contact row is open. Closed by default, so the table matches the prototype. */
  const [shown, setShown] = useState<number | null>(null);
  /** The comp picker: shut, so the Subscription card matches the prototype. */
  const [granting, setGranting] = useState(false);
  const [months, setMonths] = useState<number>(1);
  const [why, setWhy] = useState('');

  useEffect(() => {
    let live = true;
    act.openUser(userId, via).then((r) => {
      if (!live) return;
      if (r.detail) setU(r.detail);
      else if (r.error) {
        say(r.error);
        onClose();
      }
    });
    return () => {
      live = false;
    };
    // Opened once per user; the reason does not reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // An action hands back the record as it now is; there is no separate
  // reload, which would be a way to read a record without a log line.
  const run = async (go: () => Promise<act.UserOutcome>) => {
    const r = await go();
    if (r.error) return say(r.error);
    if (r.url) window.open(r.url, '_blank', 'noopener');
    if (r.toast) say(r.toast);
    if (r.detail) {
      setU(r.detail);
      onChanged();
    }
  };

  if (!u) {
    return <Overlay onClose={onClose}>{null}</Overlay>;
  }

  const plan = PLAN[u.plan];
  const info: [string, string][] = [
    ['Email', u.email || '—'],
    ['Phone', u.phone || '—'],
    ['Signed in with', u.signin + (u.platform ? ' · ' + u.platform : '')],
    ['Joined', day(u.joinedAt, now)],
    ['Last active', rel(u.lastActiveAt, now)],
    ['App version', u.appVersion ?? '—'],
  ];
  const subLine = u.sub ? `${planLabel(u.plan)} · ${u.billing} · ${SUB[u.sub][0]}` : planLabel(u.plan);
  const renews = u.subEndsAt ? 'Ends ' + day(u.subEndsAt, now) : u.subRenewsAt ? 'Renews ' + day(u.subRenewsAt, now) : '';
  const subActs = [
    ...(!paying(u.plan) && can.trial ? [{ label: 'Extend trial 7 days', go: () => run(() => act.extendTrial(u.id)) }] : []),
    // Same label and width as the prototype's: the lengths and the reason
    // open underneath, so the card keeps its shape until it is asked for.
    ...(!u.comp && !paying(u.plan) && can.grant ? [{ label: 'Grant Pro (comp)', go: () => setGranting((g) => !g) }] : []),
    ...(u.sub ? [{ label: u.platform === 'Android' ? 'Open in Play Console' : 'Open in App Store Connect', go: () => run(() => act.openStore(u.id)) }] : []),
  ];
  const stats: [string, number][] = [
    ['Contacts', u.contacts],
    ['Tasks', u.tasks],
    ['Follow-ups', u.followUps],
    ['Focus hrs', u.focusHours],
  ];
  const consent: [string, string, string][] = [
    [`Terms & Privacy v${u.termsVersion ?? '—'}`, u.termsAt ? 'Accepted ' + day(u.termsAt, now) : '—', '#0b0b0b'],
    ['Marketing', u.marketing && u.marketingAt ? 'Opted in ' + day(u.marketingAt, now) : 'Not given', u.marketing ? 'oklch(0.4 0.12 150)' : '#8a8a86'],
    ['Notifications', u.notifications === null ? '—' : u.notifications ? 'Allowed' : 'Off', '#0b0b0b'],
  ];
  const tabs: [Tab, string, string][] = [
    ['trouble', 'Troubleshoot', ''],
    ['activity', 'Activity', ''],
    ['tasks', 'Tasks', String(u.tasks)],
    ['contacts', 'Contacts', String(u.contacts)],
    ['messages', 'Messages', ''],
  ];
  const pick = (k: Tab, name: string) => {
    setTab(k);
    void act.viewTab(u.id, name);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: mono, fontSize: 12, color: '#6b6b68' }}>{u.id}</span>
        <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: '50%', border: 0, background: '#fff', cursor: 'pointer', fontSize: 16, color: '#0b0b0b' }}>
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0b0b0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600 }}>{initials(u.name)}</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{u.name}</div>
          <div style={{ fontSize: 13, color: '#6b6b68' }}>
            {u.job} · {u.country}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: plan[1], color: plan[2] }}>{plan[0]}</span>
      </div>
      {u.suspended ? (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'oklch(0.95 0.04 25)', color: 'oklch(0.45 0.16 25)', fontSize: 13, fontWeight: 500 }}>Account suspended — the user can’t sign in.</div>
      ) : null}

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
        {info.map(([k, v]) => (
          <div key={k} style={rowLine}>
            <span style={{ color: '#6b6b68' }}>{k}</span>
            <span style={{ textAlign: 'end', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={label}>Subscription</div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>{subLine}</span>
            <span style={{ color: '#6b6b68' }}>{renews}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {subActs.map((a) => (
              <button key={a.label} onClick={a.go} style={outlined}>
                {a.label}
              </button>
            ))}
            {u.comp && can.grant ? (
              <button
                data-probe="revoke-comp"
                onClick={() => {
                  if (!window.confirm(`Take ${u.first}’s comped Pro back now? They go back to their own plan.`)) return;
                  void run(() => act.revokeComp(u.id));
                }}
                style={outlined}
              >
                Take the comp back
              </button>
            ) : null}
          </div>

          {u.comp ? (
            <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>
              Comped Pro until {day(u.comp.endsAt, now)} — {u.comp.reason}. Given, not sold: it costs them nothing and is not counted as revenue.
            </div>
          ) : null}

          {granting ? (
            <div style={{ borderTop: '1px solid #f3f2ee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Give {u.first} Pro, free</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COMP_MONTHS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    style={{ height: 32, padding: '0 14px', borderRadius: 999, border: '1px solid ' + (months === m ? '#0b0b0b' : '#e4e4e0'), background: months === m ? '#0b0b0b' : '#fff', color: months === m ? '#fff' : '#0b0b0b', fontSize: 13, cursor: 'pointer' }}
                  >
                    {m === 12 ? '1 year' : `${m} month${m === 1 ? '' : 's'}`}
                  </button>
                ))}
              </div>
              <input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Why — a ticket number, a reason (required)"
                style={{ height: 40, border: '1px solid #e4e4e0', borderRadius: 10, padding: '0 12px', fontSize: 13, outline: 'none' }}
              />
              <div style={{ fontSize: 12, color: '#8a8a86', lineHeight: 1.5 }}>
                This gives Pro away and takes no payment. Charging for it outside the app would be App Store Guideline 3.1.1.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setGranting(false)} style={{ height: 36, padding: '0 14px', borderRadius: 999, border: 0, background: 'none', fontSize: 13, cursor: 'pointer', color: '#55554f' }}>
                  Cancel
                </button>
                <button
                  data-probe="give-comp"
                  onClick={() => {
                    setGranting(false);
                    setWhy('');
                    void run(() => act.grantComp(u.id, months, why));
                  }}
                  style={{ height: 36, padding: '0 16px', borderRadius: 999, border: 0, background: '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  Give Pro
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={label}>Usage</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
          {stats.map(([k, v]) => (
            <div key={k} style={{ background: '#fff', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 600, ...tabular }}>{v}</span>
              <span style={{ fontSize: 11, color: '#6b6b68' }}>{k}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={label}>Consent record</div>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
          {consent.map(([k, v, c]) => (
            <div key={k} style={rowLine}>
              <span>{k}</span>
              <span style={{ color: c, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#fff', borderRadius: 12, padding: 3, gap: 2, flexWrap: 'wrap' }}>
            {tabs.map(([k, name, n]) => (
              <button
                key={k}
                onClick={() => pick(k, name)}
                data-probe={`tab-${k}`}
                style={{ border: 0, borderRadius: 9, padding: '7px 12px', fontSize: 13, cursor: 'pointer', background: tab === k ? '#0b0b0b' : 'transparent', color: tab === k ? '#fff' : '#0b0b0b', display: 'flex', gap: 6, alignItems: 'center' }}
              >
                {name}
                <span style={{ fontSize: 11, opacity: 0.7 }}>{n}</span>
              </button>
            ))}
          </div>
          {/*
            Both sit in one wrapper so the row keeps two children and
            `space-between` goes on putting this group on the right. The
            download is 12 px text with no padding for the same reason the
            contact rows open underneath themselves: the table below must
            not move, or `npm run fidelity` is measuring a different screen
            from the prototype's.
          */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#6b6b68' }}>This view is logged</span>
            {tab === 'contacts' && can.exportUser ? (
              <button
                data-probe="contacts-csv"
                onClick={async () => {
                  const r = await act.exportUserContactsCsv(u.id);
                  if (r.error) return say(r.error);
                  if (r.csv && r.filename) download(r.filename, r.csv);
                  if (r.toast) say(r.toast);
                }}
                // The table shows the first hundred; the file holds them all.
                title={`Download all ${u.contacts} contacts as CSV`}
                style={{ font: 'inherit', fontSize: 12, lineHeight: 'normal', padding: 0, border: 0, background: 'none', color: '#0b0b0b', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Download CSV
              </button>
            ) : null}
          </div>
        </div>

        {tab === 'activity' ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '6px 16px' }}>
            {u.activity.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f2ee' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.colour, flex: 'none', marginTop: 6 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</span>
                  <span style={{ fontSize: 12, color: '#6b6b68' }}>{e.detail}</span>
                </div>
                <span style={{ fontFamily: mono, fontSize: 11, color: '#8a8a86', whiteSpace: 'nowrap' }}>
                  {day(e.at, now)} {clock(e.at)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'trouble' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
              {u.checks.map((c) => {
                const [m, bg, fg] = CHECK[c.status];
                return (
                  <div key={c.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f3f2ee' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{m}</span>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.title}</span>
                      <span style={{ fontSize: 12, color: '#6b6b68' }}>{c.detail}</span>
                    </div>
                    {c.fix && can.fix ? (
                      <button
                        onClick={() => run(() => act.fix(u.id, c.fix!))}
                        style={{ height: 30, padding: '0 12px', borderRadius: 999, border: '1px solid #e4e4e0', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#0b0b0b', flex: 'none' }}
                      >
                        {FIX_LABEL[c.fix]}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {u.issues.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={label}>Contact data issues</div>
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
                  {u.issues.map((i, n) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid #f3f2ee', fontSize: 13 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'oklch(0.95 0.05 80)', color: 'oklch(0.42 0.1 70)', flex: 'none' }}>{i.kind}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{i.text}</span>
                      <span style={{ fontFamily: mono, fontSize: 11, color: '#55554f' }}>{i.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={label}>Support tickets from this user</div>
              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
                {u.tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/support?ticket=${encodeURIComponent(t.id)}`)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', border: 0, borderBottom: '1px solid #f3f2ee', background: '#fff', cursor: 'pointer', textAlign: 'start', color: '#0b0b0b', fontSize: 13 }}
                  >
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.text}</span>
                    <span style={{ fontSize: 12, color: t.resolved ? GREEN : RED, fontWeight: 500 }}>{t.resolved ? 'Resolved' : 'Open'}</span>
                  </button>
                ))}
                {u.tickets.length === 0 ? <div style={{ padding: '14px 16px', fontSize: 13, color: '#8a8a86' }}>No tickets.</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'tasks' ? (
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            {u.taskList.map((k, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #f3f2ee' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 0', borderRadius: 999, background: TT[k.kind][1], color: TT[k.kind][2], textAlign: 'center' }}>{TT[k.kind][0]}</span>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.title}</span>
                  <span style={{ fontSize: 12, color: '#6b6b68' }}>
                    {k.who} · {k.at ? `${day(k.at, now)} · ${clock(k.at)}` : '—'}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: TASK_STATUS_COLOUR[k.status] }}>{k.status}</span>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'contacts' ? (
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'auto' }}>
            <div style={{ minWidth: 520 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1.4fr) 60px', gap: 10, padding: '10px 16px', fontSize: 11, color: '#6b6b68', borderBottom: '1px solid #efefec' }}>
                <span>Name</span>
                <span>Position · company</span>
                <span>Phone / email</span>
                <span style={{ textAlign: 'end' }}>History</span>
              </div>
              {u.contactList.map((c, i) => {
                const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
                const open = shown === i;
                const more: [string, string][] = [
                  ['Second number', c.phone2],
                  ['Second email', c.email2],
                  ['Prefers', c.channel ? TT[c.channel][0] : ''],
                ].filter(([, v]) => v) as [string, string][];
                return (
                  <Fragment key={i}>
                    {/*
                      A row keeps the prototype's grid exactly: the detail
                      opens underneath it rather than inside it, so nothing
                      moves until it is asked for (`npm run fidelity`).
                    */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => setShown(open ? null : i)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setShown(open ? null : i);
                        }
                      }}
                      style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1.4fr) 60px', gap: 10, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f2ee', fontSize: 13, cursor: 'pointer' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#efeee9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flex: 'none' }}>{initials(c.name)}</span>
                        <span style={{ fontWeight: 500, ...ellipsis }}>{c.name}</span>
                      </span>
                      <span style={{ color: '#3a3a37', ...ellipsis }}>{c.role}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', fontFamily: mono, fontSize: 11, color: '#55554f', minWidth: 0 }}>
                        <span style={ellipsis}>{c.phone || '—'}</span>
                        <span style={ellipsis}>{c.email || '—'}</span>
                      </span>
                      <span style={{ textAlign: 'end', ...tabular, color: '#55554f' }}>{c.history}</span>
                    </div>
                    {open ? (
                      <div style={{ padding: '10px 16px 12px 50px', borderBottom: '1px solid #f3f2ee', background: '#faf9f6', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {more.length ? (
                          more.map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                              <span style={{ color: '#6b6b68', width: 110, flex: 'none' }}>{label}</span>
                              <span style={{ fontFamily: label === 'Prefers' ? undefined : mono, color: '#3a3a37', minWidth: 0, wordBreak: 'break-all' }}>{value}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: 12, color: '#8a8a86' }}>Nothing else saved for {c.name.split(' ')[0]}.</div>
                        )}
                        <div style={{ fontSize: 11, color: '#8a8a86' }}>
                          Their address, this user’s labels and this user’s notes are not shown here.
                        </div>
                      </div>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ) : null}

        {tab === 'messages' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {u.messages.map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Pill colours={TT[m.kind]} style={{ fontSize: 11 }}>
                    {TT[m.kind][0]}
                  </Pill>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0 }}>{m.to}</span>
                  <span style={{ fontSize: 12, color: m.status === 'sent' || m.status === 'done' ? GREEN : '#8a8a86', fontWeight: 500 }}>{MESSAGE_STATUS[m.status]}</span>
                </div>
                {m.subject ? <div style={{ fontSize: 13, fontWeight: 600 }}>{m.subject}</div> : null}
                <div style={{ fontSize: 13, lineHeight: 1.55, color: '#3a3a37', whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>{m.body}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#8a8a86' }}>
                  {day(m.at, now)} · {clock(m.at)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ fontSize: 12, color: '#8a8a86', lineHeight: 1.5, padding: '0 4px' }}>
          Shown for troubleshooting and support, as described in the Privacy Policy (“Who at our company can see it”). Every view is recorded in the audit log.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={label}>Account actions</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {can.exportUser ? (
            <button onClick={() => run(() => act.exportUser(u.id))} style={{ ...outlined, height: 40, padding: '0 16px' }}>
              Export their data
            </button>
          ) : null}
          {can.suspend ? (
            <button
              onClick={() => {
                const v = !u.suspended;
                if (v && !window.confirm('Suspend ' + u.first + '? They won’t be able to sign in.')) return;
                void run(() => act.setSuspended(u.id, v));
              }}
              style={{ ...outlined, height: 40, padding: '0 16px' }}
            >
              {u.suspended ? 'Restore access' : 'Suspend'}
            </button>
          ) : null}
          {can.delete ? (
            <button
              onClick={async () => {
                if (!window.confirm('Delete ' + u.name + ' and all their data permanently? Store subscriptions must be cancelled separately.')) return;
                const r = await act.deleteUser(u.id);
                if (r.error) return say(r.error);
                if (r.toast) say(r.toast);
                onChanged();
                onClose();
              }}
              style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 0, background: 'oklch(0.52 0.19 25)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Delete account
            </button>
          ) : null}
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.28)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        data-probe="drawer"
        style={{ width: 'min(560px,100%)', height: '100%', background: '#f6f6f3', overflow: 'auto', display: 'grid', alignContent: 'start', gridTemplateColumns: 'minmax(0,1fr)', gridAutoRows: 'max-content', gap: 16, padding: '22px 22px 40px', boxSizing: 'border-box', boxShadow: '-20px 0 60px rgba(0,0,0,.12)' }}
      >
        {children}
      </div>
    </div>
  );
}
