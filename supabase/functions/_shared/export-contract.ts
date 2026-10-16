/**
 * What "Download my data" has to contain, and what it deliberately does not.
 *
 * The app promises it in both languages — "Download or delete your data and
 * account from Settings" — and `privacy_request` has carried a 30-day
 * deadline for it since 0001. `src/lib/privacy-request.ts` queues the ask;
 * this is the answer.
 *
 * The property that matters is **completeness**, and it is the one most
 * likely to rot: a migration adds a table, and nobody remembers the export.
 * So the list below is checked against the database itself — every table with
 * a `user_id` is either exported or named here as excluded, with a reason, or
 * `scripts/test-export-db.ts` fails. Nothing new can be added quietly.
 *
 * JSON rather than a PDF: portability means machine-readable (GDPR Art. 20,
 * and PDPL's equivalent), and a person who wants to read it can.
 */

/**
 * A table the export carries, and what it is called in the document.
 *
 * `hide` drops columns from the rows before they are written. It exists for
 * one narrow case: a column that names a member of staff. Everything about
 * the person goes in; who on the team touched it is theirs, not the
 * reader's, and `admin_member` is excluded for the same reason.
 */
export type Exported = { table: string; as: string; by: 'user_id' | 'id'; hide?: readonly string[] };

/**
 * Every table holding the person's own rows. `app_user` is keyed by `id`;
 * the rest by `user_id`. Children reached only through a parent
 * (`task_contact`, `support_message`) travel with it.
 */
export const EXPORTED: readonly Exported[] = [
  { table: 'app_user', as: 'account', by: 'id' },
  { table: 'settings', as: 'settings', by: 'user_id' },
  { table: 'consent', as: 'consent', by: 'user_id' },
  { table: 'one_thing', as: 'oneThing', by: 'user_id' },
  { table: 'task', as: 'tasks', by: 'user_id' },
  { table: 'contact', as: 'people', by: 'user_id' },
  { table: 'history', as: 'history', by: 'user_id' },
  { table: 'follow_up', as: 'followUps', by: 'user_id' },
  { table: 'focus_session', as: 'focusSessions', by: 'user_id' },
  { table: 'review', as: 'reviews', by: 'user_id' },
  { table: 'review_item', as: 'reviewItems', by: 'user_id' },
  { table: 'subscription', as: 'subscription', by: 'user_id' },
  { table: 'tip', as: 'tips', by: 'user_id' },
  { table: 'support_ticket', as: 'supportTickets', by: 'user_id' },
  { table: 'privacy_request', as: 'privacyRequests', by: 'user_id' },
  { table: 'analytics_event', as: 'analyticsEvents', by: 'user_id' },
  { table: 'active_day', as: 'activeDays', by: 'user_id' },
  { table: 'assist_usage', as: 'assistantUsage', by: 'user_id' },
  // Pro given rather than bought (0012). It belongs here for the same
  // reason `subscription` does: it is why their plan was what it was. The
  // admin who gave it does not — see `hide`.
  { table: 'comp_grant', as: 'compedPro', by: 'user_id', hide: ['granted_by'] },
];

/** Children that travel with their parent rather than being queried alone. */
export const THROUGH_PARENT: Readonly<Record<string, { parent: string; key: string; as: string }>> = {
  task_contact: { parent: 'task', key: 'task_id', as: 'taskPeople' },
  support_message: { parent: 'support_ticket', key: 'ticket_id', as: 'supportMessages' },
};

/**
 * Tables with a `user_id` that the export leaves out, and why. Each one is a
 * decision, not an oversight, and the database test will not let a new table
 * join this list without a reason being written here.
 */
export const EXCLUDED: Readonly<Record<string, string>> = {
  // Staff, not users. An admin asking for their own data is an employment
  // question, not this one, and these rows say nothing about their use of the
  // app.
  admin_member: 'a team membership, not personal use of the app',
  // The store's traffic about a purchase, not data about the person: what
  // they bought is already in `subscription` and `tips`.
  store_notification: 'store delivery records; the purchase itself is exported',
};

/** The document a request produces. */
export type ExportDocument = {
  /** So the file can be read without guessing what it is. */
  about: {
    app: string;
    user: string;
    requestedAt: string;
    producedAt: string;
    /** Which tables this covers, so a reader can see nothing is hidden. */
    contains: string[];
    /** And what it does not, with the reason. */
    omits: Record<string, string>;
  };
  data: Record<string, unknown[]>;
};

export const APP_NAME = 'The One Thing';

/** Builds the document from what the reader found. Pure. */
export function exportDocument(options: {
  userId: string;
  requestedAt: string;
  producedAt: string;
  rows: Record<string, unknown[]>;
}): ExportDocument {
  const { userId, requestedAt, producedAt, rows } = options;
  const names = [...EXPORTED.map((e) => e.as), ...Object.values(THROUGH_PARENT).map((c) => c.as)];
  const hidden = new Map(EXPORTED.filter((e) => e.hide?.length).map((e) => [e.as, e.hide as readonly string[]]));
  const data: Record<string, unknown[]> = {};
  // Every section appears, empty or not: "we hold nothing here" is an answer,
  // and a missing key reads like something withheld.
  for (const name of names) {
    const found = rows[name] ?? [];
    const drop = hidden.get(name);
    data[name] = drop
      ? found.map((row) => Object.fromEntries(Object.entries(row as Record<string, unknown>).filter(([key]) => !drop.includes(key))))
      : found;
  }
  return {
    about: { app: APP_NAME, user: userId, requestedAt, producedAt, contains: names, omits: { ...EXCLUDED } },
    data,
  };
}

/** The file's name inside the bucket. One folder per person. */
export function exportPath(userId: string, requestId: string): string {
  return `${userId}/${requestId}.json`;
}
