import React, {
    createContext,
    useContext,
    ReactNode,
    useRef,
    useState,
    useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
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
    setGenres,
} from "@/utils/redux/slices/librarySlice";
import store from "@/utils/redux/store";
import { Album, AlbumBase, Artist, ArtistBase, GenreListing, Playlist, PlaylistBase, Song } from "@/types";
import { selectFavoritesPlaylist } from "@/utils/redux/selectFavoritesPlaylist";
import { selectAlbumList, selectArtistList, selectGenres, selectPlaylistList, selectStarred } from "@/utils/redux/librarySelectors";

interface LibraryContextType {
    fetchLibrary: (force?: boolean) => Promise<void>;

    albums: AlbumBase[];
    getAlbum: (id: string) => Promise<Album | null>;
    getAlbums: (ids: string[]) => Promise<Album[]>;

    artists: ArtistBase[];
    getArtist: (id: string) => Promise<Artist | null>;
    playlists: PlaylistBase[];
    getPlaylist: (id: string) => Promise<Playlist | null>;

    refreshLibrary: () => Promise<void>;
    clearLibrary: () => void;

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

const FAVORITES_ID = "favorites";

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

    const albums = useSelector(selectAlbumList);
    const artists = useSelector(selectArtistList);
    const playlists = useSelector(selectPlaylistList);
    const genres = useSelector(selectGenres);
    const starred = useSelector(selectStarred);
    const favorites = useSelector(selectFavoritesPlaylist);

    const fetchLibrary = async (force = false) => {
        if (isLibraryFetchedRef.current && !force) return;

        setIsLoading(true);

        try {
            const [albums, artists, playlists, starred, genres] = await Promise.all([
                api.albums.list(),
                api.artists.list(),
                api.playlists.list(),
                api.starred.list(),
                api.genres.list(),
            ]);

            dispatch(setAlbumList(albums));
            dispatch(setArtistList(artists));
            dispatch(setPlaylistList(playlists));
            dispatch(setStarred(starred));
            dispatch(setGenres(genres));

            console.log(genres);

            const favorites = selectFavoritesPlaylist(store.getState());
            if (favorites) {
                dispatch(upsertPlaylist(favorites));
            }

            isLibraryFetchedRef.current = true;
        } finally {
            setIsLoading(false);
        }
    };

    const getAlbum = async (id: string): Promise<Album | null> => {
        const existing = store.getState().library.albumsById[id];
        if (existing) {
            return existing;
        }

        const album = await api.albums.get(id);
        dispatch(upsertAlbum(album));
        return album;
    };

    const getAlbums = async (ids: string[]): Promise<Album[]> => {
        const state = store.getState().library.albumsById;

        const missing = ids.filter(id => !state[id]);

        if (missing.length) {
            const fetched = await Promise.all(
                missing.map(id => api.albums.get(id))
            );
            fetched.forEach(album => dispatch(upsertAlbum(album)));
        }

        return ids
            .map(id => store.getState().library.albumsById[id])
            .filter(Boolean);
    };

    const getArtist = async (id: string): Promise<Artist | null> => {
        const existing = store.getState().library.artistsById[id];
        if (existing) {
            return existing;
        }

        const artist = await api.artists.get(id);
        dispatch(upsertArtist(artist));
        return artist;
    };

    const getPlaylist = async (id: string): Promise<Playlist | null> => {
        if (id === FAVORITES_ID) {
            return selectFavoritesPlaylist(store.getState());
        }

        const existing = store.getState().library.playlistsById[id];
        if (existing) return existing;

        const playlist = await api.playlists.get(id);
        dispatch(upsertPlaylist(playlist));
        return playlist;
    };

    const getGenre = (name: string) => {
        return genres.find(g => g.name === name) ?? null;
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

    const playlistsWithFavorites = useMemo(() => {
        if (!favorites.songs.length) return playlists;
        return [favorites, ...playlists];
    }, [favorites, playlists]);

    return (
        <LibraryContext.Provider
            value={{
                fetchLibrary,

                albums,
                getAlbum,
                getAlbums,

                artists,
                getArtist,
                playlists: playlistsWithFavorites,
                getPlaylist,

                refreshLibrary,
                clearLibrary,

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