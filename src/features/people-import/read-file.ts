/**
 * Opens a picked file as contacts, whatever it is: CSV, Excel (.xlsx), a PDF
 * of a sheet, or vCard. The file's contents are passed as functions so a phone, a browser
 * and a test can each supply them their own way.
 */
import { flagDuplicates, readTable, readVcf, type Candidate } from './columns';
import { parseCsv } from './csv';
import { parsePdfTable } from './pdf';
import { parseVcf } from './vcf';
import { parseXlsxSheets } from './xlsx';
import type { Contact } from '@/lib/model-types';

export type PickedFile = {
  name: string;
  mime?: string | null;
  text: () => Promise<string>;
  bytes: () => Promise<Uint8Array>;
};

export type ReadResult = { candidates: Candidate[]; skipped: number } | { error: 'oldExcel' | 'unknown' | 'empty' | 'locked' };

export async function candidatesFromFile(file: PickedFile, existing: readonly Contact[], region?: string): Promise<ReadResult> {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const mime = (file.mime ?? '').toLowerCase();

  let candidates: Candidate[];
  if (ext === 'xls' || mime === 'application/vnd.ms-excel') return { error: 'oldExcel' };
  if (ext === 'xlsx' || mime.includes('spreadsheetml')) {
    // Every sheet is read as its own table (each has its own header), then the lists are one:
    // a person who is on two sheets is flagged as a repeat below, not imported twice.
    candidates = parseXlsxSheets(await file.bytes()).flatMap((sheet, i) =>
      readTable(sheet.rows, region).candidates.map((c) => ({ ...c, key: `s${i}-${c.key}`, sheet: sheet.name }))
    );
  } else if (ext === 'pdf' || mime === 'application/pdf') {
    const pdf = parsePdfTable(await file.bytes());
    if ('error' in pdf) return { error: pdf.error };
    candidates = readTable(pdf.rows, region).candidates;
  } else if (ext === 'vcf' || ext === 'vcard' || mime.includes('vcard')) {
    candidates = readVcf(parseVcf(await file.text()), region);
  } else if (['csv', 'tsv', 'txt'].includes(ext) || mime.includes('csv') || mime === 'text/plain') {
    candidates = readTable(parseCsv(await file.text()), region).candidates;
  } else {
    return { error: 'unknown' };
  }
  // Someone with no number and no email cannot be messaged, called or emailed: left out, and counted.
  const reachable = candidates.filter((c) => c.phone || c.email);
  const skipped = candidates.length - reachable.length;
  if (reachable.length === 0) return { error: 'empty' };
  return { candidates: flagDuplicates(reachable, existing), skipped };
}
