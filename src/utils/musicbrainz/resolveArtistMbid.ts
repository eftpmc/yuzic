import * as musicbrainz from '@/api/musicbrainz';

const MBID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveArtistMbid(
  id: string | undefined,
  name: string
): Promise<string | null> {
  if (id && MBID_REGEX.test(id)) {
    return id;
  }

  if (!name.trim()) {
    return null;
  }

  try {
    const results = await musicbrainz.searchArtists(name);

    return results[0]?.id ?? null;
  } catch (err) {
    console.warn(
      `Failed to resolve artist MBID for "${name}"`,
      err
    );
    return null;
  }
}