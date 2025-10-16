import { GenreMaps } from '@/types';

export const fetchJellyfinGenreMaps = async (
  serverUrl: string,
  token: string,
  existingGenreMaps: GenreMaps,
  newGenres: string[]
): Promise<GenreMaps> => {
  const songGenresMap = { ...existingGenreMaps.songGenresMap };
  const albumGenresMap = { ...existingGenreMaps.albumGenresMap };
  const albumKeyGenresMap = { ...existingGenreMaps.albumKeyGenresMap };

  if (newGenres.length === 0) {
    console.log('[JellyfinGenreService] No new genres to fetch.');
    return { songGenresMap, albumGenresMap, albumKeyGenresMap };
  }

  for (const genre of newGenres) {
    const res = await fetch(`${serverUrl}/Items?IncludeItemTypes=Audio&Genres=${encodeURIComponent(genre)}`, {
      headers: { 'X-Emby-Token': token },
    });
    const data = await res.json();

    const songs = data.Items || [];
    songs.forEach((song: any) => {
      const albumId = song.AlbumId;
      const albumKey = `${(song.Album || '').toLowerCase()}|${(song.AlbumArtist || '').toLowerCase()}`;

      if (albumId) {
        if (!albumGenresMap[albumId]) albumGenresMap[albumId] = [];
        if (!albumGenresMap[albumId].includes(genre)) albumGenresMap[albumId].push(genre);
      } else if (albumKey) {
        if (!albumKeyGenresMap[albumKey]) albumKeyGenresMap[albumKey] = [];
        if (!albumKeyGenresMap[albumKey].includes(genre)) albumKeyGenresMap[albumKey].push(genre);
      }

      if (song.Id) {
        if (!songGenresMap[song.Id]) songGenresMap[song.Id] = [];
        if (!songGenresMap[song.Id].includes(genre)) songGenresMap[song.Id].push(genre);
      }
    });
  }

  return { songGenresMap, albumGenresMap, albumKeyGenresMap };
};