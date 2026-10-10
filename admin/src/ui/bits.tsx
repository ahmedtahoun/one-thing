/**
 * Pieces every screen repeats, as the prototype writes them.
 */
import type { CSSProperties, ReactNode } from 'react';

export const card: CSSProperties = { background: '#fff', borderRadius: 18 };
export const tabular: CSSProperties = { fontVariantNumeric: 'tabular-nums' };
export const mono = "'IBM Plex Mono',monospace";

/** The title block: an h1 and the grey line under it. */
export function Heading({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  const block = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>{title}</h1>
      {sub !== undefined ? <div style={{ fontSize: 13, color: '#6b6b68' }}>{sub}</div> : null}
    </div>
  );
  if (!children) return block;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      {block}
      {children}
    </div>
  );
}

/** A filter chip (Users' plans, Subscriptions' states, Support's views). */
export function Chip({ on, label, onClick, nowrap }: { on: boolean; label: string; onClick: () => void; nowrap?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 14px',
        borderRadius: 999,
        border: `1px solid ${on ? '#0b0b0b' : '#e4e4e0'}`,
        background: on ? '#0b0b0b' : '#fff',
        color: on ? '#fff' : '#0b0b0b',
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: nowrap ? 'nowrap' : undefined,
      }}
    >
      {label}
    </button>
  );
}

/** A coloured pill: plan, status, task kind, ticket source. */
export function Pill({ colours, children, style }: { colours: readonly [string, string, string] | [string, string]; children: ReactNode; style?: CSSProperties }) {
  const [bg, fg] = colours.length === 3 ? [colours[1], colours[2]] : colours;
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: bg, color: fg, ...style }}>{children}</span>;
}

/** Saves text as a file in the browser. */
export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
