import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlbumData, PlaylistData, SongData, ArtistData } from "@/types";

interface StarredData {
    albums: AlbumData[];
    artists: ArtistData[];
    songs: SongData[];
}

interface LibraryState {
    albums: AlbumData[];
    artists: ArtistData[];
    playlists: PlaylistData[];
    starred: StarredData;
}

const initialState: LibraryState = {
    albums: [],
    artists: [],
    playlists: [],
    starred: { albums: [], artists: [], songs: [] },
};

const librarySlice = createSlice({
    name: 'library',
    initialState,
    reducers: {
        setAlbums(state, action: PayloadAction<AlbumData[]>) {
            state.albums = action.payload;
        },
        setArtists(state, action: PayloadAction<ArtistData[]>) {
            state.artists = action.payload;
        },
        setPlaylists(state, action: PayloadAction<PlaylistData[]>) {
            state.playlists = action.payload;
        },
        setStarred(state, action: PayloadAction<StarredData>) {
            state.starred = action.payload;
        },
        resetLibraryState(state) {
            state.albums = [];
            state.artists = [];
            state.playlists = [];
            state.starred = { albums: [], artists: [], songs: [] };
        },
    },
});

export const {
    setAlbums,
    setArtists,
    setPlaylists,
    setStarred,
    resetLibraryState,
} = librarySlice.actions;

export default librarySlice.reducer;
