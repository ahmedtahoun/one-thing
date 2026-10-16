import { currentTheme } from '@/design/theme';

/**
 * A soft colour for each person, the same one every time, so a list of
 * initials can be told apart at a glance: Sara is always the green one.
 */
const PALETTE: readonly { bg: string; fg: string }[] = [
  { bg: '#FFE8DA', fg: '#A8480E' },
  { bg: '#DFF0FF', fg: '#1F5FA8' },
  { bg: '#DFF6E2', fg: '#17703A' },
  { bg: '#F2EAFF', fg: '#6A45A8' },
  { bg: '#F9EED1', fg: '#7A5600' },
  { bg: '#D4F6F8', fg: '#00666D' },
  { bg: '#FFE5F2', fg: '#9A2F66' },
  { bg: '#EBF2D9', fg: '#55650F' },
];

/** The same eight, darkened for the dark theme: a deep tint with a light letter. */
const DARK_PALETTE: readonly { bg: string; fg: string }[] = [
  { bg: '#3A2A1B', fg: '#F5A25D' },
  { bg: '#12303F', fg: '#53BDEB' },
  { bg: '#103629', fg: '#25D366' },
  { bg: '#2A2640', fg: '#B8A3F0' },
  { bg: '#33291A', fg: '#FFD279' },
  { bg: '#0F3A3A', fg: '#4FD1C5' },
  { bg: '#3A1F2E', fg: '#F28DB8' },
  { bg: '#2B3315', fg: '#B5CC5E' },
];

export function avatarColour(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return (currentTheme() === 'dark' ? DARK_PALETTE : PALETTE)[hash % PALETTE.length]!;
}
