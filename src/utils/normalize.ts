export function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}
