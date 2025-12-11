import React, {
    createContext,
    useContext,
    ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/utils/redux/store";
import { useApi } from "@/api";
import {
    resetLibraryState,
    setAlbums,
    setArtists,
    setStarred,
    setPlaylists,
} from "@/utils/redux/slices/librarySlice";
import { resetGenreMaps } from "@/utils/redux/slices/genreSlice";
import { resetStatsMap } from "@/utils/redux/slices/statsSlice";
import { AlbumData, ArtistData, PlaylistData, SongData } from "@/types";

interface LibraryContextType {
    albums: AlbumData[];
    artists: ArtistData[];
    playlists: PlaylistData[];
    starred: {
        albums: AlbumData[];
        artists: ArtistData[];
        songs: SongData[];
    };
    songs: SongData[];

    fetchLibrary: (force?: boolean) => Promise<void>;
    refreshLibrary: () => void;
    clearLibrary: () => void;

    starItem: (id: string) => Promise<void>;
    unstarItem: (id: string) => Promise<void>;

    addSongToPlaylist: (playlistId: string, song: SongData) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
    createPlaylist: (name: string) => Promise<void>;

    isLoading: boolean;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const useLibrary = () => {
    const ctx = useContext(LibraryContext);
    if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
    return ctx;
};

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
    const dispatch = useDispatch();

    const serverState = useSelector(
        (s: RootState) => s.server
    );

    const { albums, artists, starred, playlists } = useSelector(
        (state: RootState) => state.library
    );

    const isLibraryFetchedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);

    const api = useApi();

    const fetchLibrary = async (force = false) => {
        if (isLibraryFetchedRef.current && !force) return;

        setIsLoading(true);
        isLibraryFetchedRef.current = true;

        try {
            const [albumList, artistList, starredList, playlistList] =
                await Promise.all([
                    api.albums.list(),
                    api.artists.list(),
                    api.starred.list(),
                    api.playlists.list(),
                ]);

            dispatch(setAlbums(albumList));
            dispatch(setArtists(artistList));
            dispatch(setStarred(starredList));
            dispatch(setPlaylists(playlistList));
        } finally {
            setIsLoading(false);
        }
    };

    const refreshLibrary = () => {
        dispatch(resetLibraryState());
        dispatch(resetGenreMaps());
        dispatch(resetStatsMap());
        isLibraryFetchedRef.current = false;
        fetchLibrary();
    };

    const clearLibrary = () => {
        dispatch(resetLibraryState());
        dispatch(resetGenreMaps());
        dispatch(resetStatsMap());
        isLibraryFetchedRef.current = false;
    };

    const starItem = async (id: string) => {
        await api.starred.add(id);
        dispatch(setStarred(await api.starred.list()));
        dispatch(setPlaylists(await api.playlists.list()));
    };

    const unstarItem = async (id: string) => {
        await api.starred.remove(id);
        dispatch(setStarred(await api.starred.list()));
        dispatch(setPlaylists(await api.playlists.list()));
    };

    const addSongToPlaylist = async (playlistId: string, song: SongData) => {
        await api.playlists.addSong(playlistId, song.id);
        dispatch(setPlaylists(await api.playlists.list()));
    };

    const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
        await api.playlists.removeSong(playlistId, songId);
        dispatch(setPlaylists(await api.playlists.list()));
    };

    const createPlaylist = async (name: string) => {
        await api.playlists.create(name);
        dispatch(setPlaylists(await api.playlists.list()));
    };

    const allSongs: SongData[] = albums.flatMap((a) => a.songs || []);

    const safeStarred = {
        albumIds: starred?.albumIds ?? [],
        artistIds: starred?.artistIds ?? [],
        songIds: starred?.songIds ?? [],
    };

    const hydratedStarred = {
        albums: albums.filter((a) => safeStarred.albumIds.includes(a.id)),
        artists: artists.filter((a) => safeStarred.artistIds.includes(a.id)),
        songs: allSongs.filter((s) => safeStarred.songIds.includes(s.id)),
    };

    const favoritesPlaylist: PlaylistData = {
        id: "favorite",
        title: "Favorites",
        subtext: `Playlist • ${hydratedStarred.songs.length} songs`,
        cover: "heart-icon",
        songs: hydratedStarred.songs,
    };

    return (
        <LibraryContext.Provider
            value={{
                albums,
                artists,
                playlists: [favoritesPlaylist, ...playlists],
                starred: hydratedStarred,
                songs: allSongs,

                fetchLibrary,
                refreshLibrary,
                clearLibrary,

                starItem,
                unstarItem,
                addSongToPlaylist,
                removeSongFromPlaylist,
                createPlaylist,

                isLoading,
            }}
        >
            {children}
        </LibraryContext.Provider>
    );
};