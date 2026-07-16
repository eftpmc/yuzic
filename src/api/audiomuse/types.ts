export interface AudiomuseTrackRef {
  itemId: string;
  title?: string;
  artist?: string;
}

// AudioMuse returns a JSON array with snake_case item_id fields.
export type AudiomuseSimilarityResult = {
  item_id: string;
  title?: string;
  author?: string;
  album?: string;
  distance?: number;
}[];

export function normalizeAudiomuseSimilarityResult(
  raw: AudiomuseSimilarityResult
): AudiomuseTrackRef[] {
  return raw.map(track => ({
    itemId: track.item_id,
    title: track.title,
    artist: track.author,
  }));
}
