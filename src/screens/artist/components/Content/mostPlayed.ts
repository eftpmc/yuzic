export type PlayCountTrack = { id: string; artistId: string };

// Personal listening history is a different claim than chart popularity —
// this ranks by the current user's own play counts, not global popularity,
// so it stays separate from (and isn't merged with) Popular on Deezer.
export function rankMostPlayedTracks(
  tracks: PlayCountTrack[],
  playCounts: Record<string, number>,
  artistId: string,
  limit = 10
): { id: string; playCount: number }[] {
  return tracks
    .filter(t => t.artistId === artistId)
    .map(t => ({ id: t.id, playCount: playCounts[t.id] ?? 0 }))
    .filter(t => t.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
}
