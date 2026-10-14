/** A link that opens an address in the phone's maps app (or the browser, where there is none). */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.replace(/\s+/g, ' ').trim())}`;
}
