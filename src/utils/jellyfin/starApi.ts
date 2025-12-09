import AsyncStorage from '@react-native-async-storage/async-storage';

const API_HEADERS = (token: string) => ({
  'Authorization': `MediaBrowser Token=${token}`,
  'Content-Type': 'application/json',
});

/**
 * Get all favorite items for the current Jellyfin user.
 */
export const getStarredItemIdsJellyfin = async (
  serverUrl: string,
  userId: string,
  token: string
): Promise<{ albumIds: string[]; artistIds: string[]; songIds: string[] }> => {
  const url = `${serverUrl}/Users/${userId}/Items?Recursive=true&Filters=IsFavorite&IncludeItemTypes=Audio,MusicAlbum,MusicArtist&Fields=Path`;
  console.log('[Jellyfin] Fetching favorites:', url);

  const res = await fetch(url, {
    headers: { 'X-Emby-Token': token },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch favorites: ${res.status} ${res.statusText || body}`);
  }

  const data = await res.json();
  const items = data.Items || [];

  const albumIds: string[] = [];
  const artistIds: string[] = [];
  const songIds: string[] = [];

  for (const item of items) {
    switch (item.Type) {
      case 'MusicAlbum':
        albumIds.push(item.Id);
        break;
      case 'MusicArtist':
        artistIds.push(item.Id);
        break;
      case 'Audio':
        songIds.push(item.Id);
        break;
      default:
        break;
    }
  }

  console.log(
    `[Jellyfin] Fetched favorites — Albums: ${albumIds.length}, Artists: ${artistIds.length}, Songs: ${songIds.length}`
  );

  return { albumIds, artistIds, songIds };
};

/**
 * Add a favorite.
 */
export const favoriteItemJellyfin = async (
  serverUrl: string,
  userId: string,
  token: string,
  itemId: string
) => {
  const res = await fetch(`${serverUrl}/Users/${userId}/FavoriteItems/${itemId}`, {
    method: 'POST',
    headers: API_HEADERS(token),
  });
  if (!res.ok) throw new Error(`Failed to favorite item: ${res.statusText}`);
};

/**
 * Remove a favorite.
 */
export const unfavoriteItemJellyfin = async (
  serverUrl: string,
  userId: string,
  token: string,
  itemId: string
) => {
  const res = await fetch(`${serverUrl}/Users/${userId}/FavoriteItems/${itemId}`, {
    method: 'DELETE',
    headers: API_HEADERS(token),
  });
  if (!res.ok) throw new Error(`Failed to unfavorite item: ${res.statusText}`);
};