/**
 * Identifiers for everything the app creates.
 *
 * UUIDs, because the rows sync to Postgres, whose keys are uuid columns, and
 * because two devices creating rows offline must never pick the same key.
 * `crypto.randomUUID` where the runtime has it (browsers, Node); Hermes does
 * not, so the fallback builds a version-4 UUID by hand. Math.random is not a
 * secure source, but nothing here is a secret — the bits only have to avoid
 * colliding, and 122 of them do.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function newId(): string {
  const native = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  if (native) return native.call((globalThis as { crypto?: unknown }).crypto);
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const variant = ((Math.floor(Math.random() * 4) + 8) as number).toString(16);
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

/** True for a key the backend can store. Older builds made `t_…`/`c_…` ids. */
export function isUuid(id: string): boolean {
  return UUID.test(id);
}
