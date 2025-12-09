import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SongData } from '@/types';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from '@backpackapp-io/react-native-toast';

interface AIContextType {
    input: string;
    setInput: (val: string) => void;
    generateQueue: (input: string) => Promise<SongData[]>;
    generatedQueue: SongData[];
    setGeneratedQueue: (queue: SongData[]) => void;
    isLoading: boolean;
    weighting: { global: number; user: number; favorite: number };
    setWeighting: (val: { global: number; user: number; favorite: number }) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
};

export const AIProvider = ({ children }: { children: ReactNode }) => {
    const { songs, albums, starred } = useLibrary();
    const { playSongInCollection } = usePlaying();
    const { addPromptToHistory, weighting, setWeighting, openaiApiKey } = useSettings();
    const [input, setInput] = useState('');
    const [generatedQueue, setGeneratedQueue] = useState<SongData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const tryParseJson = (text: string): any => {
        try {
            const trimmed = text.trim();

            if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
                const lastComma = trimmed.lastIndexOf(',');
                const maybeFixed = trimmed.substring(0, lastComma) + ']';
                return JSON.parse(maybeFixed);
            }

            return JSON.parse(trimmed);
        } catch (err) {
            console.error('JSON Parse Error:', err, '\nOriginal Text:', text);
            return null;
        }
    };

    const cleanAIText = (text: string): string => {
        return text.replace(/```json/g, '').replace(/```/g, '').trim();
    };

    type OpenAICallParams = {
        systemPrompt: string;
        userPrompt: string;
        temperature?: number;
    };

    const callOpenAIString = async ({ systemPrompt, userPrompt, temperature = 0.3 }: OpenAICallParams): Promise<string> => {
        if (!openaiApiKey) {
            toast.error("OpenAI API key not set.");
            throw new Error("Missing OpenAI API Key");
        }

        try {
            const res = await fetch(`https://rawarr-server-af0092d911f6.herokuapp.com/api/openai/string`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    systemPrompt,
                    userPrompt,
                    temperature,
                    apiKey: openaiApiKey,
                }),
            });

            const data = await res.json();
            return (data.content || '').trim();
        } catch (err) {
            console.error("OpenAI request failed:", err);
            toast.error("Failed to contact OpenAI.");
            throw err;
        }
    };

    const callOpenAIJson = async (params: OpenAICallParams): Promise<any> => {
        try {
            const text = await callOpenAIString(params);
            const cleaned = cleanAIText(text);
            return tryParseJson(cleaned);
        } catch (err) {
            return null;
        }
    };

    const classifyPromptType = async (prompt: string): Promise<'genre' | 'artist'> => {
        try {
            const result = await callOpenAIString({
                systemPrompt:
                    "Classify the user's prompt as either 'genre' or 'artist'. " +
                    "If the prompt asks for a specific artist, album, or band, return 'artist'. " +
                    "If the prompt is about a vibe, mood, genre, or activity, return 'genre'. " +
                    "Return only the word 'genre' or 'artist' — no explanation, no punctuation.",
                userPrompt: prompt,
                temperature: 0.3,
            });

            const lower = result.toLowerCase();
            if (lower === 'artist' || lower === 'genre') return lower;
            console.warn('Unknown classification result:', result);
            return 'genre';
        } catch (err) {
            toast.error("AI failed to classify prompt.");
            return 'genre';
        }
    };

    const getGenresForPrompt = async (prompt: string, genres: string[]): Promise<string[]> => {
        try {
            const result = await callOpenAIJson({
                systemPrompt:
                    "You are a music genre matching assistant. The user will give you a music prompt and a list of genres. " +
                    "Return a JSON array of the genres from the list that best match the prompt. " +
                    "Return only the JSON array. No keys, objects, or explanation.",
                userPrompt: `Prompt: "${prompt}"\n\nGenres:\n${genres.join(', ')}`,
                temperature: 0.4,
            });

            if (!Array.isArray(result)) {
                console.warn('⚠️ Invalid genre response:', result);
                return [];
            }

            return result;
        } catch (err) {
            toast.error("AI failed to match genres.");
            return [];
        }
    };

    const getSongWeight = (song: SongData): number => {
        const global = song.globalPlayCount ?? 0;
        const user = song.userPlayCount ?? 0;
        const isFavorite = starred.songs.some(s => s.id === song.id);
        const favoriteBoost = isFavorite ? weighting.favorite : 1;

        return (Math.sqrt(global + 1) * weighting.global + user * weighting.user) * favoriteBoost;
    };

    const weightedShuffle = (songs: SongData[], count = 100): SongData[] => {
        const result: SongData[] = [];
        const pool = [...songs];

        for (let i = 0; i < count && pool.length > 0; i++) {
            const totalWeight = pool.reduce((sum, song) => sum + getSongWeight(song), 0);
            const threshold = Math.random() * totalWeight;

            let cumulative = 0;
            let selectedIndex = 0;

            for (let j = 0; j < pool.length; j++) {
                cumulative += getSongWeight(pool[j]);
                if (cumulative >= threshold) {
                    selectedIndex = j;
                    break;
                }
            }

            const [chosen] = pool.splice(selectedIndex, 1);
            result.push(chosen);
        }

        return result;
    };

    const generateQueue = async (userPrompt: string): Promise<SongData[]> => {
        setIsLoading(true);
        setInput(userPrompt);

        try {
            const promptType = await classifyPromptType(userPrompt);

            if (promptType === 'genre') {
                const genreToAlbumsMap: Record<string, string[]> = {};
                const allGenresSet = new Set<string>();

                albums.forEach((album) => {
                    if (album.genres) {
                        album.genres.forEach((genre) => {
                            allGenresSet.add(genre);
                            if (!genreToAlbumsMap[genre]) genreToAlbumsMap[genre] = [];
                            genreToAlbumsMap[genre].push(album.id);
                        });
                    }
                });

                const allGenres = Array.from(allGenresSet);
                const selectedGenres = await getGenresForPrompt(userPrompt, allGenres);

                const genreMatchedSongs = songs.filter(song =>
                    song.genres?.some(genre => selectedGenres.includes(genre))
                );

                if (genreMatchedSongs.length === 0) return [];

                const shuffledQueue = weightedShuffle(genreMatchedSongs, 100);

                setGeneratedQueue(shuffledQueue);

                if (shuffledQueue.length > 0) {
                    await playSongInCollection(shuffledQueue[0], {
                        id: 'ai-generated',
                        title: `AI Queue • ${userPrompt}`,
                        type: 'playlist',
                        songs: shuffledQueue,
                    });
                }

                addPromptToHistory({ prompt: userPrompt, queue: shuffledQueue });
                return shuffledQueue;
            } else {
                const albumText = albums.map((a, i) =>
                    `${i + 1}. "${a.title}" by ${a.artist.name}${a.genres?.length ? ` — ${a.genres.join(', ')}` : ''} [${a.id}]`
                ).join('\n');

                const selectedAlbumIds: string[] = await callOpenAIJson({
                    systemPrompt: "You are a music curation assistant. Given a prompt and a list of albums from the user's library, " +
                        "select a diverse mix of albums that match the mood, genre, or activity implied by the prompt. " +
                        "Only return a JSON array of valid matching album IDs. Do not return a key or object like { \"albums\": [...] }.",
                    userPrompt: `Prompt: "${userPrompt}"\n\nAlbums:\n${albumText}`,
                });

                const relevantSongs = songs.filter(song => selectedAlbumIds?.includes(song.albumId));
                if (relevantSongs.length === 0) return [];

                const songText = relevantSongs.map((s, i) =>
                    `${i + 1}. "${s.title}" — ${s.artist}` +
                    (s.globalPlayCount !== null && s.globalPlayCount !== undefined
                        ? ` — ${s.globalPlayCount.toLocaleString()} plays`
                        : '') +
                    ` [${s.id}]`
                ).join('\n');

                const selectedSongIds: string[] = await callOpenAIJson({
                    systemPrompt: "You are a music curation assistant creating a playlist of up to 100 unique songs. " +
                        "Prioritize variety: avoid including more than 2–3 songs from the same album or artist. " +
                        "Ensure the playlist fits the mood, energy, or activity described in the prompt. Return only a JSON array of up to 100 song IDs.",
                    userPrompt: `Prompt: "${userPrompt}"\n\nSongs:\n${songText}`,
                });

                const queue = relevantSongs.filter(song => selectedSongIds?.includes(song.id));
                setGeneratedQueue(queue);

                if (queue.length > 0) {
                    await playSongInCollection(queue[0], {
                        id: 'ai-generated',
                        title: `AI Queue • ${userPrompt}`,
                        type: 'playlist',
                        songs: queue,
                    });
                }

                addPromptToHistory({ prompt: userPrompt, queue });
                return queue;
            }
        } catch (err) {
            console.error('AI error:', err);
            toast.error("AI failed to generate a playlist.");
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AIContext.Provider value={{
            input, setInput, generateQueue, generatedQueue, setGeneratedQueue, isLoading,
            weighting,
            setWeighting
        }}>
            {children}
        </AIContext.Provider>
    );
};