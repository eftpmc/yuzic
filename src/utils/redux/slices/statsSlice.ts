// utils/redux/slices/statsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LastFmStats } from '@/utils/lastfm/lastFmService';

interface StatsState {
    statsMap: Record<string, LastFmStats>;
}

const initialState: StatsState = {
    statsMap: {},
};

const statsSlice = createSlice({
    name: 'stats',
    initialState,
    reducers: {
        setStatsMap: (state, action: PayloadAction<Record<string, LastFmStats>>) => {
            state.statsMap = {
                ...state.statsMap,
                ...action.payload,
            };
        },
        resetStatsMap: (state) => {
            state.statsMap = {};
        },
    },
});

export const { setStatsMap, resetStatsMap } = statsSlice.actions;
export default statsSlice.reducer;