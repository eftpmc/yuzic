import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '@/types';

export type LibrarySortOrder = 'title' | 'recent' | 'userplays';
export type AudioQuality = 'low' | 'medium' | 'high' | 'original';

export interface PromptHistoryEntry {
  prompt: string;
  queue: Song[];
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface SettingsState {
  /* UI */
  themeColor: string;
  gridColumns: number;
  isGridView: boolean;

  /* Library */
  librarySortOrder: LibrarySortOrder;

  /* Onboarding */
  hasSeenGetStarted: boolean;

  /* Audio */
  audioQuality: AudioQuality;

  /* AI */
  aiProvider: AIProvider;
  aiApiKeys: {
    openai: string;
    anthropic: string;
    gemini: string;
  };
  aiButtonEnabled: boolean;
  promptHistory: PromptHistoryEntry[];

  /* Analytics */
  analyticsEnabled: boolean;
}

const initialState: SettingsState = {
  themeColor: '#ff7f7f',
  gridColumns: 3,
  isGridView: true,

  librarySortOrder: 'title',
  hasSeenGetStarted: false,

  audioQuality: 'medium',

  aiProvider: 'openai',
  aiApiKeys: {
    openai: '',
    anthropic: '',
    gemini: '',
  },
  aiButtonEnabled: true,
  promptHistory: [],

  analyticsEnabled: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /* UI */
    setThemeColor(state, action: PayloadAction<string>) {
      state.themeColor = action.payload;
    },
    setGridColumns(state, action: PayloadAction<number>) {
      state.gridColumns = action.payload;
    },
    setIsGridView(state, action: PayloadAction<boolean>) {
      state.isGridView = action.payload;
    },

    /* Library */
    setLibrarySortOrder(state, action: PayloadAction<LibrarySortOrder>) {
      state.librarySortOrder = action.payload;
    },

    /* Onboarding */
    setHasSeenGetStarted(state, action: PayloadAction<boolean>) {
      state.hasSeenGetStarted = action.payload;
    },

    /* Audio */
    setAudioQuality(state, action: PayloadAction<AudioQuality>) {
      state.audioQuality = action.payload;
    },

    /* AI */
    setAiProvider(state, action: PayloadAction<AIProvider>) {
      state.aiProvider = action.payload;
    },

    setAiApiKey(
      state,
      action: PayloadAction<{ provider: AIProvider; key: string }>
    ) {
      state.aiApiKeys[action.payload.provider] = action.payload.key;
    },
    setAiButtonEnabled(state, action: PayloadAction<boolean>) {
      state.aiButtonEnabled = action.payload;
    },
    addPromptToHistory(state, action: PayloadAction<PromptHistoryEntry>) {
      const filtered = state.promptHistory.filter(
        p => p.prompt !== action.payload.prompt
      );
      state.promptHistory = [
        action.payload,
        ...filtered,
      ].slice(0, 10);
    },

    /* Analytics */
    setAnalyticsEnabled(state, action: PayloadAction<boolean>) {
      state.analyticsEnabled = action.payload;
    },

    resetSettings: () => initialState,
  },
});

export const {
  setThemeColor,
  setGridColumns,
  setIsGridView,
  setLibrarySortOrder,
  setHasSeenGetStarted,
  setAudioQuality,
  setAiProvider,
  setAiApiKey,
  setAiButtonEnabled,
  addPromptToHistory,
  setAnalyticsEnabled,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;