/**
 * Opens a picked file as contacts, whatever it is: CSV, Excel (.xlsx), a PDF
 * of a sheet, or vCard. The file's contents are passed as functions so a phone, a browser
 * and a test can each supply them their own way.
 */
import { flagDuplicates, readTable, readVcf, type Candidate } from './columns';
import { parseCsv } from './csv';
import { parsePdfTable } from './pdf';
import { parseVcf } from './vcf';
import { parseXlsx } from './xlsx';
import type { Contact } from '@/lib/model-types';

export type PickedFile = {
  name: string;
  mime?: string | null;
  text: () => Promise<string>;
  bytes: () => Promise<Uint8Array>;
};

export type ReadResult = { candidates: Candidate[] } | { error: 'oldExcel' | 'unknown' | 'empty' | 'locked' };

export async function candidatesFromFile(file: PickedFile, existing: readonly Contact[], region?: string): Promise<ReadResult> {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const mime = (file.mime ?? '').toLowerCase();

  let candidates: Candidate[];
  if (ext === 'xls' || mime === 'application/vnd.ms-excel') return { error: 'oldExcel' };
  if (ext === 'xlsx' || mime.includes('spreadsheetml')) {
    candidates = readTable(parseXlsx(await file.bytes()), region).candidates;
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
  if (candidates.length === 0) return { error: 'empty' };
  return { candidates: flagDuplicates(candidates, existing) };
}
