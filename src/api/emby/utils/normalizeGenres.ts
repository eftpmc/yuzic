/**
 * Emby may return genres as comma- or semicolon-separated strings.
 * Normalize to an array of individual genre strings, or undefined if empty.
 */
export function normalizeGenres(genres: string[] | undefined): string[] | undefined {
  if (!genres?.length) return undefined;
  const result = genres
    .flatMap((g) => (typeof g === "string" ? g.split(/[,;]/) : []))
    .map((s) => s.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}
