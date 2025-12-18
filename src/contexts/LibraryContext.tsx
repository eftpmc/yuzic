import React, {
    createContext,
    useContext,
    ReactNode,
    useRef,
    useState,
} from "react";
import { useDispatch } from "react-redux";
import { useApi } from "@/api";
import {
    setAlbumList,
    setArtistList,
    setPlaylistList,
    upsertAlbum,
    upsertArtist,
    upsertPlaylist,
    setStarred,
    resetLibraryState,
} from "@/utils/redux/slices/librarySlice";

interface LibraryContextType {
    fetchLibrary: (force?: boolean) => Promise<void>;

    getAlbum: (id: string) => Promise<void>;
    getArtist: (id: string) => Promise<void>;
    getPlaylist: (id: string) => Promise<void>;

    refreshLibrary: () => Promise<void>;
    clearLibrary: () => void;

    starItem: (id: string) => Promise<void>;
    unstarItem: (id: string) => Promise<void>;

    addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
    createPlaylist: (name: string) => Promise<void>;

    isLoading: boolean;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const useLibrary = () => {
    const ctx = useContext(LibraryContext);
    if (!ctx) {
        throw new Error("useLibrary must be used within LibraryProvider");
    }
    return ctx;
};

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
    const dispatch = useDispatch();
    const api = useApi();

    const isLibraryFetchedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchLibrary = async (force = false) => {
        if (isLibraryFetchedRef.current && !force) return;

        setIsLoading(true);

        try {
            const [albums, artists, playlists, starred] = await Promise.all([
                api.albums.list(),
                api.artists.list(),
                api.playlists.list(),
                api.starred.list(),
            ]);

            dispatch(setAlbumList(albums));
            dispatch(setArtistList(artists));
            dispatch(setPlaylistList(playlists));
            dispatch(setStarred(starred));

            isLibraryFetchedRef.current = true;
        } finally {
            setIsLoading(false);
        }
    };

    const getAlbum = async (id: string) => {
        const album = await api.albums.get(id);
        dispatch(upsertAlbum(album));
    };

    const getArtist = async (id: string) => {
        const artist = await api.artists.get(id);
        dispatch(upsertArtist(artist));
    };

    const getPlaylist = async (id: string) => {
        const playlist = await api.playlists.get(id);
        dispatch(upsertPlaylist(playlist));
    };

    const refreshLibrary = async () => {
        dispatch(resetLibraryState());
        isLibraryFetchedRef.current = false;
        await fetchLibrary(true);
    };

    const clearLibrary = () => {
        dispatch(resetLibraryState());
        isLibraryFetchedRef.current = false;
    };

    const starItem = async (id: string) => {
        await api.starred.add(id);
        dispatch(setStarred(await api.starred.list()));
    };

    const unstarItem = async (id: string) => {
        await api.starred.remove(id);
        dispatch(setStarred(await api.starred.list()));
    };

    const addSongToPlaylist = async (playlistId: string, songId: string) => {
        await api.playlists.addSong(playlistId, songId);
        await getPlaylist(playlistId);
    };

    const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
        await api.playlists.removeSong(playlistId, songId);
        await getPlaylist(playlistId);
    };

    const createPlaylist = async (name: string) => {
        const id = await api.playlists.create(name);
        await fetchLibrary(true);
        await getPlaylist(id);
    };

    return (
        <LibraryContext.Provider
            value={{
                fetchLibrary,

                getAlbum,
                getArtist,
                getPlaylist,

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