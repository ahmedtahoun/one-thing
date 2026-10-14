/**
 * A contact keeps one line under their name, "Position · Company". The form
 * shows it as two fields; this is the way between them.
 */
import { TITLE } from '@/features/card/parse';

export function splitRole(role: string | undefined): { position: string; company: string } {
  const text = (role ?? '').trim();
  if (!text) return { position: '', company: '' };
  const at = text.indexOf(' · ');
  if (at >= 0) return { position: text.slice(0, at).trim(), company: text.slice(at + 3).trim() };
  // One word or phrase: a title ("Buyer", "Sales Manager") or a company ("Northwind"), by what it looks like.
  const isPosition = TITLE.test(text) || /^(client|buyer|supplier|customer|lead|friend|partner|investor|vendor)$/i.test(text);
  return isPosition ? { position: text, company: '' } : { position: '', company: text };
}

export function joinRole(position: string, company: string): string | undefined {
  const line = [position.trim(), company.trim()].filter(Boolean).join(' · ');
  return line || undefined;
}
