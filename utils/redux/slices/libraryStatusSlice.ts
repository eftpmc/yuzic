// utils/redux/slices/libraryStatusSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ServiceMeta {
    total?: number;
    fetched?: number;
    [key: string]: any;
}

interface ServiceStatus {
    key: string;
    status: 'pending' | 'success' | 'error';
    meta?: ServiceMeta;
    error?: string | null;
}

interface LibraryStatusState {
    services: Record<string, ServiceStatus>;
}

const initialState: LibraryStatusState = {
    services: {},
};

const libraryStatusSlice = createSlice({
    name: 'libraryStatus',
    initialState,
    reducers: {
        setServiceStatus: (state, action: PayloadAction<ServiceStatus>) => {
            const { key, ...rest } = action.payload;
            state.services[key] = { key, ...rest };
        },
        resetServiceStatuses: (state) => {
            state.services = {};
        },
    },
});

export const { setServiceStatus, resetServiceStatuses } = libraryStatusSlice.actions;
export default libraryStatusSlice.reducer;