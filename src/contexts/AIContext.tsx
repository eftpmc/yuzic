import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Song } from '@/types';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectAiProvider,
    selectActiveAiApiKey,
} from '@/utils/redux/selectors/settingsSelectors';
import { addPromptToHistory } from '@/utils/redux/slices/settingsSlice';

interface AIContextType {
    input: string;
    setInput: (val: string) => void;
    generateQueue: (input: string) => Promise<Song[]>;
    generatedQueue: Song[];
    setGeneratedQueue: (queue: Song[]) => void;
    isLoading: boolean;
}

type AIMessage = {
    role: 'system' | 'user';
    content: string;
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
    const ctx = useContext(AIContext);
    if (!ctx) {
        throw new Error('useAI must be used within AIProvider');
    }
    return ctx;
};

export const AIProvider = ({ children }: { children: ReactNode }) => {
    const dispatch = useDispatch();

    const { albums, genres, fetchGenres, starred } = useLibrary();
    const { playSongInCollection } = usePlaying();

    const provider = useSelector(selectAiProvider);
    const apiKey = useSelector(selectActiveAiApiKey);

    const [input, setInput] = useState('');
    const [generatedQueue, setGeneratedQueue] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const runText = async (
        messages: AIMessage[],
        temperature = 0.3
    ): Promise<string> => {
        if (!apiKey) {
            toast.error('AI API key not set.');
            throw new Error('Missing API key');
        }

        switch (provider) {
            case 'openai': {
                const res = await fetch(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages,
                            temperature,
                        }),
                    }
                );

                if (!res.ok) {
                    const err = await res.text();
                    throw new Error(`OpenAI error: ${err}`);
                }

                const json = await res.json();
                return json.choices?.[0]?.message?.content?.trim() ?? '';
            }

            case 'anthropic': {
                const res = await fetch(
                    'https://api.anthropic.com/v1/messages',
                    {
                        method: 'POST',
                        headers: {
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'claude-3-haiku-20240307',
                            temperature,
                            max_tokens: 1024,
                            messages: messages.map(m => ({
                                role: m.role === 'system' ? 'assistant' : 'user',
                                content: m.content,
                            })),
                        }),
                    }
                );

                if (!res.ok) {
                    const err = await res.text();
                    throw new Error(`Anthropic error: ${err}`);
                }

                const json = await res.json();

                return (
                    json.content
                        ?.map((c: any) => c.text)
                        .join('')
                        .trim() ?? ''
                );
            }

            case 'gemini': {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            generationConfig: {
                                temperature,
                            },
                            contents: [
                                {
                                    role: 'user',
                                    parts: [
                                        {
                                            text: messages
                                                .map(m => `${m.role.toUpperCase()}: ${m.content}`)
                                                .join('\n\n'),
                                        },
                                    ],
                                },
                            ],
                        }),
                    }
                );

                if (!res.ok) {
                    const err = await res.text();
                    throw new Error(`Gemini error: ${err}`);
                }

                const json = await res.json();

                return (
                    json.candidates?.[0]?.content?.parts
                        ?.map((p: any) => p.text)
                        .join('')
                        .trim() ?? ''
                );
            }

            default:
                throw new Error(`${provider} not supported`);
        }
    };

    const runJson = async (
        messages: AIMessage[],
        temperature = 0.3
    ): Promise<any> => {
        const text = await runText(messages, temperature);
        const cleaned = text.replace(/```json|```/g, '').trim();
        return tryParseJson(cleaned);
    };

    const classifyPrompt = async (
        prompt: string
    ): Promise<'genre' | 'artist'> => {
        try {
            const result = await runText([
                {
                    role: 'system',
                    content:
                        "Classify the user's prompt as either 'genre' or 'artist'. " +
                        "Return only the word.",
                },
                { role: 'user', content: prompt },
            ]);

            return result.toLowerCase() === 'artist' ? 'artist' : 'genre';
        } catch {
            return 'genre';
        }
    };

    const matchGenres = async (
        prompt: string,
        genreNames: string[]
    ): Promise<string[]> => {
        const result = await runJson([
            {
                role: 'system',
                content:
                    'Return a JSON array of genres from the list that best match the prompt.',
            },
            {
                role: 'user',
                content: `Prompt: "${prompt}"\nGenres:\n${genreNames.join(', ')}`,
            },
        ]);

        return Array.isArray(result) ? result : [];
    };

    const getSongWeight = (song: Song): number => {
        const isFavorite = starred.songs.some(s => s.id === song.id);
        return isFavorite ? 2 : 1;
    };

    const weightedShuffle = (songs: Song[], count = 100): Song[] => {
        const pool = [...songs];
        const result: Song[] = [];

        while (pool.length && result.length < count) {
            const total = pool.reduce(
                (sum, s) => sum + getSongWeight(s),
                0
            );
            let r = Math.random() * total;

            for (let i = 0; i < pool.length; i++) {
                r -= getSongWeight(pool[i]);
                if (r <= 0) {
                    result.push(pool.splice(i, 1)[0]);
                    break;
                }
            }
        }

        return result;
    };

    const generateQueue = async (userPrompt: string): Promise<Song[]> => {
        setIsLoading(true);
        setInput(userPrompt);

        try {
            const type = await classifyPrompt(userPrompt);

            if (type === 'genre') {
                if (!genres.length) await fetchGenres();

                const genreNames = genres.map(g => g.name);
                const selected = await matchGenres(userPrompt, genreNames);

                const songs = genres
                    .filter(g => selected.includes(g.name))
                    .flatMap(g => g.songs);

                const queue = weightedShuffle(songs, 100);
                setGeneratedQueue(queue);

                if (queue.length) {
                    await playSongInCollection(queue[0], {
                        id: 'ai-generated',
                        title: `AI Queue • ${userPrompt}`,
                        cover: { kind: "none" },
                        subtext: 'Playlist',
                        songs: queue,
                        changed: new Date(2000),
                        created: new Date(2000)
                    });
                }

                dispatch(addPromptToHistory({ prompt: userPrompt, queue }));
                return queue;
            }

            toast.error('Artist mode not reimplemented yet.');
            return [];
        } catch (err) {
            console.error(err);
            toast.error('AI failed to generate a playlist.');
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AIContext.Provider
            value={{
                input,
                setInput,
                generateQueue,
                generatedQueue,
                setGeneratedQueue,
                isLoading,
            }}
        >
            {children}
        </AIContext.Provider>
    );
};

function tryParseJson(text: string) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}