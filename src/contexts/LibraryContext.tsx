import React, {
    createContext,
    useContext,
    ReactNode,
    useRef,
    useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useApi } from "@/api";
import {
    setAlbumList,
    setArtistList,
    setPlaylistList,
    setStarred,
    resetLibraryState,
    setGenres,
} from "@/utils/redux/slices/librarySlice";
import { AlbumBase, ArtistBase, GenreListing, PlaylistBase, Song } from "@/types";
import { selectFavoritesPlaylist } from "@/utils/redux/selectors/selectFavoritesPlaylist";
import { selectAlbumList, selectArtistList, selectGenres, selectPlaylistList, selectStarred } from "@/utils/redux/selectors/librarySelectors";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/enums/queryKeys";
import { FAVORITES_ID } from "@/constants/favorites";

interface LibraryContextType {
    fetchLibrary: (force?: boolean) => Promise<void>;

    albums: AlbumBase[];
    artists: ArtistBase[];
    playlists: PlaylistBase[];

    refreshLibrary: () => Promise<void>;
    clearLibrary: () => void;

    fetchGenres: () => Promise<void>;
    genres: GenreListing[];
    getGenre: (name: string) => GenreListing | null;

    starred: {
        songs: Song[]
    };
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
    const queryClient = useQueryClient();
    const api = useApi();

    const isLibraryFetchedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);

    const albums = useSelector(selectAlbumList);
    const artists = useSelector(selectArtistList);
    const playlists = useSelector(selectPlaylistList);
    const genres = useSelector(selectGenres);
    const starred = useSelector(selectStarred);

    const fetchLibrary = async (force = false) => {
        if (isLibraryFetchedRef.current && !force) return;

        isLibraryFetchedRef.current = true;
        setIsLoading(true);

        try {
            const [albums, artists, playlists, starred] = await Promise.all([
                api.albums.list(),
                api.artists.list(),
                api.playlists.list(),
                api.starred.list()
            ]);

            dispatch(setAlbumList(albums));
            dispatch(setArtistList(artists));
            dispatch(setPlaylistList(playlists));
            dispatch(setStarred(starred));
        } catch (e) {

            console.warn('fetchLibrary failed, using cached redux data');
            isLibraryFetchedRef.current = false;
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGenres = async () => {
        if (genres.length > 0) return;
        const result = await api.genres.list();
        dispatch(setGenres(result));
    };

    const getGenre = (name: string) => {
        return genres.find(g => g.name === name) ?? null;
    };

    const refreshLibrary = async () => {
        queryClient.clear();
        dispatch(resetLibraryState());
        isLibraryFetchedRef.current = false;
        await fetchLibrary(true);
    };

    const clearLibrary = () => {
        queryClient.clear();
        dispatch(resetLibraryState());
        isLibraryFetchedRef.current = false;
    };

    const starItem = async (id: string) => {
        await api.starred.add(id);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, FAVORITES_ID] });
    };

    const unstarItem = async (id: string) => {
        await api.starred.remove(id);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, FAVORITES_ID] });
    };

    const addSongToPlaylist = async (playlistId: string, songId: string) => {
        await api.playlists.addSong(playlistId, songId);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, playlistId] });

    };

    const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
        await api.playlists.removeSong(playlistId, songId);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, playlistId] });

    };

    const createPlaylist = async (name: string) => {
        const playlistId = await api.playlists.create(name);
        await fetchLibrary(true);
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, playlistId] });
    };

    return (
        <LibraryContext.Provider
            value={{
                fetchLibrary,

                albums,
                artists,
                playlists,

                refreshLibrary,
                clearLibrary,

                fetchGenres,
                genres,
                getGenre,

                starred,
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