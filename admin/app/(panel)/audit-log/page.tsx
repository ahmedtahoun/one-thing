/** 12 · Audit log (ADMIN.md § 12). Append-only; nothing here can change it. */
import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { stamp } from '@/data/format';
import { Heading, mono } from '@/ui/bits';

const COLUMNS = '150px 140px minmax(0,1fr) minmax(0,1fr)';

export default async function AuditPage() {
  await requireAdmin('audit');
  const entries = await (await source()).audit();
  return (
    <>
      <Heading title="Audit log" sub="Every admin action and every view of a user’s personal data. Entries can’t be edited or deleted." />
      <div style={{ background: '#fff', borderRadius: 18, overflow: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', fontSize: 12, color: '#6b6b68', borderBottom: '1px solid #efefec' }}>
            <span>When</span>
            <span>Admin</span>
            <span>Action</span>
            <span>Reason</span>
          </div>
          {entries.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '12px 18px', borderBottom: '1px solid #f3f2ee', fontSize: 13, alignItems: 'baseline' }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: '#55554f' }}>{stamp(l.at)}</span>
              <span>{l.who}</span>
              <span style={{ fontWeight: 500 }}>{l.what}</span>
              <span style={{ color: '#55554f' }}>{l.why}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
