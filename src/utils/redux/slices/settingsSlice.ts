import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '@/types';

export type LibrarySortOrder = 'title' | 'recent' | 'userplays';
export type AudioQuality = 'low' | 'medium' | 'high' | 'original';

export interface PromptHistoryEntry {
  prompt: string;
  queue: Song[];
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface SettingsState {
  /* UI */
  themeMode: ThemeMode;
  themeColor: string;
  gridColumns: number;
  isGridView: boolean;
  aiButtonEnabled: boolean;


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
  promptHistory: PromptHistoryEntry[];

  /* Analytics */
  analyticsEnabled: boolean;
}

const initialState: SettingsState = {
  themeMode: 'system',
  themeColor: '#ff7f7f',
  gridColumns: 3,
  isGridView: true,
  aiButtonEnabled: true,

  librarySortOrder: 'title',
  hasSeenGetStarted: false,

  audioQuality: 'medium',

  aiProvider: 'openai',
  aiApiKeys: {
    openai: '',
    anthropic: '',
    gemini: '',
  },
  promptHistory: [],

  analyticsEnabled: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /* UI */
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    setThemeColor(state, action: PayloadAction<string>) {
      state.themeColor = action.payload;
    },
    setGridColumns(state, action: PayloadAction<number>) {
      state.gridColumns = action.payload;
    },
    setIsGridView(state, action: PayloadAction<boolean>) {
      state.isGridView = action.payload;
    },
    setAiButtonEnabled(state, action: PayloadAction<boolean>) {
      state.aiButtonEnabled = action.payload;
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
  setThemeMode,
  setThemeColor,
  setGridColumns,
  setIsGridView,
  setAiButtonEnabled,
  setLibrarySortOrder,
  setHasSeenGetStarted,
  setAudioQuality,
  setAiProvider,
  setAiApiKey,
  addPromptToHistory,
  setAnalyticsEnabled,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;