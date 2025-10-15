import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GenreMaps {
    songGenresMap: Record<string, string[]>;
    albumGenresMap: Record<string, string[]>;
    albumKeyGenresMap: Record<string, string[]>;
    fetchedGenres: string[];
}

const initialState: GenreMaps = {
    songGenresMap: {},
    albumGenresMap: {},
    albumKeyGenresMap: {},
    fetchedGenres: [],
};

const genreSlice = createSlice({
    name: 'genre',
    initialState,
    reducers: {
        setGenreMaps: (state, action: PayloadAction<GenreMaps>) => {
            return action.payload;
        },
        setFetchedGenres: (state, action: PayloadAction<string[]>) => {
            const lowercased = action.payload.map((g) => g.toLowerCase());
            state.fetchedGenres = Array.from(new Set([...state.fetchedGenres.map(g => g.toLowerCase()), ...lowercased]));
        },
        resetGenreMaps: (state) => {
            state.songGenresMap = {};
            state.albumGenresMap = {};
            state.albumKeyGenresMap = {};
            state.fetchedGenres = [];
        },
    },
});

export const { setGenreMaps, resetGenreMaps, setFetchedGenres } = genreSlice.actions;

export default genreSlice.reducer;