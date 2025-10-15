import { fetchArtists } from '@/utils/navidrome/fetchArtists';
import { RootState } from '@/utils/redux/store';
import { ArtistData } from '@/types';
import { setArtists } from "@/utils/redux/slices/librarySlice";

export const fetchArtistsService = async ({
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
    key: 'artists';
    status: 'success' | 'error';
    data?: ArtistData[];
    meta?: { fetched: number; total: number };
    error?: string;
}> => {
    try {
        const state = getState();
        const existingArtists = state.library.artists ?? [];
        const existingAlbums = (state.library.albums ?? []).map((album) => ({
            id: album.id,
            cover: album.cover,
            title: album.title,
            subtext: album.subtext,
            artist: album.artist.name,
        }));
        const newArtists = await fetchArtists(serverUrl, username, password, existingAlbums, existingArtists); // ✅ pass albums!

        const existingIds = new Set(existingArtists.map((a) => a.id));
        const newIds = new Set(newArtists.map((a) => a.id));

        const fetched = newArtists.filter((a) => !existingIds.has(a.id)).length;
        const total = newIds.size;

        dispatch(setArtists(newArtists));

        return {
            key: 'artists',
            status: 'success',
            data: newArtists,
            meta: {
                fetched,
                total,
            },
        };
    } catch (err: any) {
        return {
            key: 'artists',
            status: 'error',
            error: err?.message || 'Failed to fetch artists',
        };
    }
};