/**
 * A one-time password for an admin account: the one `scripts/add-admin.ts`
 * prints when it creates somebody, and the one the Owner hands over after a
 * reset (`actions.ts`, `resetAdminPassword`).
 *
 * 16 random bytes, base64url, so about 22 characters with no ambiguity and
 * nothing to transcribe wrongly. It is meant to go straight into a password
 * manager rather than to be remembered, and it is shown exactly once: the
 * panel never stores it, never logs it, and cannot show it again.
 */
import { randomBytes } from 'node:crypto';

export const newPassword = (): string => randomBytes(16).toString('base64url');
