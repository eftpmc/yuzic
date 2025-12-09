import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SongData} from "@/types";

type AudioQuality = 'low' | 'medium' | 'high' | 'original';

type SettingsContextType = {
    themeColor: string;
    setThemeColor: (color: string) => void;
    promptHistory: { prompt: string; queue: SongData[] }[];
    addPromptToHistory: (entry: { prompt: string; queue: SongData[] }) => void;
    weighting: { global: number; user: number; favorite: number };
    setWeighting: (val: { global: number; user: number; favorite: number }) => void;
    audioQuality: AudioQuality;
    setAudioQuality: (quality: AudioQuality) => void;
    gridColumns: number;
    setGridColumns: (val: number) => void;
    lidarrEnabled: boolean;
    setLidarrEnabled: (val: boolean) => void;
    openaiEnabled: boolean;
    setOpenaiEnabled: (val: boolean) => void;
    openaiApiKey: string;
    setOpenaiApiKey: (val: string) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const THEME_COLOR_KEY = '@theme_color';
const PROMPT_HISTORY_KEY = '@prompt_history';
const WEIGHTING_KEY = '@ai_weighting';
const AUDIO_QUALITY_KEY = '@audio_quality'
const GRID_COLUMNS_KEY = '@grid_columns';
const LIDARR_ENABLED_KEY = '@lidarr_enabled';
const OPENAI_ENABLED_KEY = '@openai_enabled';
const OPENAI_API_KEY = '@openai_api_key';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [themeColor, setThemeColorState] = useState('#ff7f7f');
    const [promptHistory, setPromptHistory] = useState<{ prompt: string; queue: SongData[] }[]>([]);
    const [weighting, setWeightingState] = useState({ global: 1, user: 2, favorite: 1 });
    const [audioQuality, setAudioQualityState] = useState<AudioQuality>('medium');
    const [gridColumns, setGridColumnsState] = useState(3);
    const [lidarrEnabled, setLidarrEnabledState] = useState(true);
    const [openaiEnabled, setOpenaiEnabledState] = useState(false);
    const [openaiApiKey, setOpenaiApiKeyState] = useState('');

    useEffect(() => {
        const loadThemeColor = async () => {
            try {
                const storedColor = await AsyncStorage.getItem(THEME_COLOR_KEY);
                if (storedColor) {
                    setThemeColorState(storedColor);
                }
            } catch (error) {
                console.error('Failed to load theme color:', error);
            }
        };
        const loadPromptHistory = async () => {
            try {
                const stored = await AsyncStorage.getItem(PROMPT_HISTORY_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) setPromptHistory(parsed);
                }
            } catch (error) {
                console.error('Failed to load prompt history:', error);
            }
        };
        const loadWeighting = async () => {
            try {
                const stored = await AsyncStorage.getItem(WEIGHTING_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setWeightingState({
                        global: parsed.global ?? 1,
                        user: parsed.user ?? 2,
                        favorite: parsed.favorite ?? 1,
                    });
                }
            } catch (error) {
                console.error('Failed to load weighting:', error);
            }
        };
        const loadAudioQuality = async () => {
            try {
                const storedQuality = await AsyncStorage.getItem(AUDIO_QUALITY_KEY);
                if (storedQuality) {
                    setAudioQualityState(storedQuality);
                }
            } catch (error) {
                console.error('Failed to load theme color:', error);
            }
        };
        const loadGridColumns = async () => {
            try {
                const stored = await AsyncStorage.getItem(GRID_COLUMNS_KEY);
                if (stored) setGridColumnsState(parseInt(stored));
            } catch (err) {
                console.error('Failed to load grid column count:', err);
            }
        };
        const loadLidarrEnabled = async () => {
            try {
                const stored = await AsyncStorage.getItem(LIDARR_ENABLED_KEY);
                if (stored !== null) setLidarrEnabledState(stored === 'true');
            } catch (error) {
                console.error('Failed to load Lidarr enabled state:', error);
            }
        };
        const loadOpenAI = async () => {
            try {
                const enabled = await AsyncStorage.getItem(OPENAI_ENABLED_KEY);
                if (enabled !== null) setOpenaiEnabledState(enabled === 'true');

                const key = await AsyncStorage.getItem(OPENAI_API_KEY);
                if (key) setOpenaiApiKeyState(key);
            } catch (error) {
                console.error('Failed to load OpenAI settings:', error);
            }
        };

        loadThemeColor();
        loadPromptHistory();
        loadWeighting();
        loadAudioQuality();
        loadGridColumns();
        loadLidarrEnabled();
        loadOpenAI();
    }, []);

    const setThemeColor = async (color: string) => {
        try {
            await AsyncStorage.setItem(THEME_COLOR_KEY, color);
            setThemeColorState(color);
        } catch (error) {
            console.error('Failed to save theme color:', error);
        }
    };

    const setAudioQuality = async (quality: AudioQuality) => {
        try {
            await AsyncStorage.setItem(AUDIO_QUALITY_KEY, quality);
            setAudioQualityState(quality);
        } catch (error) {
            console.error('Failed to save audio quality:', error);
        }
    };

    const addPromptToHistory = async (entry: { prompt: string; queue: SongData[] }) => {
        const updated = [
            entry,
            ...promptHistory.filter(p => p.prompt !== entry.prompt)
        ].slice(0, 10);

        setPromptHistory(updated);

        try {
            await AsyncStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Failed to save prompt history:', error);
        }
    };

    const setWeighting = async (val: { global: number; user: number; favorite: number; }) => {
        setWeightingState(val);
        try {
            await AsyncStorage.setItem(WEIGHTING_KEY, JSON.stringify(val));
        } catch (error) {
            console.error('Failed to save weighting:', error);
        }
    };

    const setGridColumns = async (val: number) => {
        try {
            await AsyncStorage.setItem(GRID_COLUMNS_KEY, val.toString());
            setGridColumnsState(val);
        } catch (err) {
            console.error('Failed to save grid column count:', err);
        }
    };
    
    const setLidarrEnabled = async (val: boolean) => {
        try {
            await AsyncStorage.setItem(LIDARR_ENABLED_KEY, val.toString());
            setLidarrEnabledState(val);
        } catch (error) {
            console.error('Failed to save Lidarr enabled state:', error);
        }
    };

    const setOpenaiEnabled = async (val: boolean) => {
        try {
            await AsyncStorage.setItem(OPENAI_ENABLED_KEY, val.toString());
            setOpenaiEnabledState(val);
        } catch (error) {
            console.error('Failed to save OpenAI enabled state:', error);
        }
    };

    const setOpenaiApiKey = async (key: string) => {
        try {
            await AsyncStorage.setItem(OPENAI_API_KEY, key);
            setOpenaiApiKeyState(key);
        } catch (error) {
            console.error('Failed to save OpenAI API key:', error);
        }
    };

    return (
        <SettingsContext.Provider value={{ themeColor,
            setThemeColor,
            promptHistory,
            addPromptToHistory,
            weighting,
            setWeighting,
            audioQuality,
            setAudioQuality,
            gridColumns,
            setGridColumns,
            lidarrEnabled,
            setLidarrEnabled,
            openaiEnabled,
            setOpenaiEnabled,
            openaiApiKey,
            setOpenaiApiKey
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};