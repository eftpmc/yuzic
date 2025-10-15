import { fetchGenreMaps } from '@/utils/navidrome/fetchGenres';
import { RootState } from '@/utils/redux/store';
import { GenreMaps } from '@/types';
import { setGenreMaps } from '@/utils/redux/slices/genreSlice';
import { setServiceStatus } from '@/utils/redux/slices/libraryStatusSlice';
import { updateAlbumsWithGenres } from '@/utils/library/updateAlbumsWithGenres';
import { setAlbums } from '@/utils/redux/slices/librarySlice';

const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const fetchGenresService = async ({
                                             serverUrl,
                                             username,
                                             password,
                                             getState,
                                             dispatch,
                                         }: {
    serverUrl: string;
    username: string;
    password: string;
    getState: () => RootState;
    dispatch: any;
}): Promise<{
    key: 'genres';
    status: 'success' | 'error';
    data?: GenreMaps;
    meta?: { fetched: number; total: number };
    error?: string;
}> => {
    try {
        const state = getState();
        const existingGenreMaps = state.genre;
        const fetchedGenreNames = new Set(existingGenreMaps.fetchedGenres.map(g => g.toLowerCase()));

        const genreResponse = await fetch(
            `${serverUrl}/rest/getGenres.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
                password
            )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`
        );
        const genreData = await genreResponse.json();
        const allGenres: string[] =
            genreData['subsonic-response']?.genres?.genre?.map((g: { value: string }) => g.value) || [];

        const newGenres = allGenres.filter(g => !fetchedGenreNames.has(g.toLowerCase()));

        let fullGenreMaps: GenreMaps;

        if (newGenres.length === 0) {
            fullGenreMaps = existingGenreMaps;
        } else {
            const updatedGenreMaps = await fetchGenreMaps(
                serverUrl,
                username,
                password,
                existingGenreMaps,
                newGenres
            );

            fullGenreMaps = {
                ...updatedGenreMaps,
                fetchedGenres: Array.from(new Set([
                    ...existingGenreMaps.fetchedGenres.map(g => g.toLowerCase()),
                    ...newGenres.map(g => g.toLowerCase()),
                ])),
            };

            dispatch(setGenreMaps(fullGenreMaps));
        }

        const existingAlbums = getState().library.albums;
        const enrichedAlbums = updateAlbumsWithGenres(existingAlbums, fullGenreMaps);
        dispatch(setAlbums(enrichedAlbums));

        dispatch(setServiceStatus({
            key: 'genres',
            status: 'success',
            meta: { fetched: newGenres.length, total: allGenres.length },
        }));

        return {
            key: 'genres',
            status: 'success',
            data: fullGenreMaps,
            meta: { fetched: newGenres.length, total: allGenres.length },
        };
    } catch (err: any) {
        return {
            key: 'genres',
            status: 'error',
            error: err?.message || 'Failed to fetch genres',
        };
    }
};