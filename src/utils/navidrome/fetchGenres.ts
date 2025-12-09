import { getSongsByGenre } from '@/api/navidrome/getSongsByGenre';
import { GenreMaps } from '@/types';

const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const fetchGenreMaps = async (
    serverUrl: string,
    username: string,
    password: string,
    existingGenreMaps: GenreMaps,
    newGenres: string[]
): Promise<GenreMaps> => {
    const deepClone = (map: Record<string, string[]>): Record<string, string[]> =>
        Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));

    const songGenresMap = deepClone(existingGenreMaps.songGenresMap);
    const albumGenresMap = deepClone(existingGenreMaps.albumGenresMap);
    const albumKeyGenresMap = deepClone(existingGenreMaps.albumKeyGenresMap);

    if (newGenres.length === 0) {
        console.log('[GenreService] No new genres to fetch.');
        return { songGenresMap, albumGenresMap, albumKeyGenresMap };
    }

    await Promise.all(
    newGenres.map(async (genre) => {
        const songs = await getSongsByGenre(serverUrl, username, password, genre);

        songs.forEach((song: any) => {
            const albumId = song.albumId;
            const albumKey = `${song.album?.toLowerCase()}|${song.artist?.toLowerCase()}`;

            if (albumId) {
                if (!albumGenresMap[albumId]) albumGenresMap[albumId] = [];
                if (!albumGenresMap[albumId].includes(genre)) {
                    albumGenresMap[albumId].push(genre);
                }
            } else if (song.album && song.artist) {
                if (!albumKeyGenresMap[albumKey]) albumKeyGenresMap[albumKey] = [];
                if (!albumKeyGenresMap[albumKey].includes(genre)) {
                    albumKeyGenresMap[albumKey].push(genre);
                }
            }

            if (song.id) {
                if (!songGenresMap[song.id]) songGenresMap[song.id] = [];
                if (!songGenresMap[song.id].includes(genre)) {
                    songGenresMap[song.id].push(genre);
                }
            }
        });
    })
);

    return { songGenresMap, albumGenresMap, albumKeyGenresMap };
};
