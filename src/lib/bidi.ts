/**
 * Keeps a number or an address in its own left-to-right order inside a line of
 * Arabic. A nested <Text> with `writingDirection: 'ltr'` does not isolate it
 * on the web, so the line is marked with Unicode's isolate characters instead,
 * which every platform honours.
 */
export const ltr = (text: string): string => `⁦${text}⁩`;
