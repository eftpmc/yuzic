import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserStatsState {
    userPlayCounts: Record<string, number>;
}

const initialState: UserStatsState = {
    userPlayCounts: {},
};

const userStatsSlice = createSlice({
    name: 'userStats',
    initialState,
    reducers: {
        incrementUserPlayCount: (state, action: PayloadAction<string>) => {
            const songId = action.payload;
            state.userPlayCounts[songId] = (state.userPlayCounts[songId] || 0) + 1;
        },
        resetUserPlayCounts: () => initialState,
    },
});

export const { incrementUserPlayCount, resetUserPlayCounts } = userStatsSlice.actions;
export default userStatsSlice.reducer;