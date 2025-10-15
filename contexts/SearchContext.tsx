import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { AlbumData, ArtistData, PlaylistData, SongData } from '@/types';

interface SearchContextType {
    searchResults: SearchResult[];
    searchLibrary: (query: string) => Promise<SearchResult[]>;
    searchExternal: (query: string) => Promise<SearchResult[]>;
    clearSearch: () => void;
    isLoading: boolean;
    handleSearch: (query: string) => Promise<void>;
}

interface SearchProviderProps {
    children: ReactNode;
}

interface SearchResult {
    id: string;
    title: string;
    subtext: string;
    cover: string;
    type: 'album' | 'artist' | 'playlist' | 'song';
    isDownloaded?: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
};

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
    const { albums, artists, songs } = useLibrary();
    const { playlists } = usePlaylists();
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const searchLibrary = async (query: string): Promise<SearchResult[]> => {
        const lowerQuery = query.toLowerCase();

        const albumResults: SearchResult[] = albums.map((album: AlbumData) => ({
            id: album.id,
            title: album.title,
            subtext: album.artist.name,
            cover: album.cover,
            type: 'album',
            isDownloaded: true,
        }));

        const artistResults: SearchResult[] = artists.map((artist: ArtistData) => ({
            id: artist.id,
            title: artist.name,
            subtext: artist.subtext || '',
            cover: artist.cover,
            type: 'artist',
            isDownloaded: true,
        }));

        const playlistResults: SearchResult[] = playlists.map((playlist: PlaylistData) => ({
            id: playlist.id,
            title: playlist.title,
            subtext: playlist.subtext,
            cover: playlist.cover,
            type: 'playlist',
            isDownloaded: true,
        }));

        const songResults: SearchResult[] = songs.map((song: SongData) => ({
            id: song.id,
            title: song.title,
            subtext: song.artist,
            cover: song.cover,
            type: 'song',
            isDownloaded: true,
        }));

        const results = [
            ...albumResults,
            ...artistResults,
            ...playlistResults,
            ...songResults,
        ].filter((item) => item.title.toLowerCase().includes(lowerQuery));

        return results;
    };

    const searchExternal = async (query: string): Promise<SearchResult[]> => {
        try {
            const res = await fetch(`https://rawarr-server-af0092d911f6.herokuapp.com/api/lastfm/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();

            const albumResults: SearchResult[] = data.albums.map((item: any) => ({
                id: item.id,
                title: item.title,
                subtext: item.subtext,
                cover: item.cover,
                type: 'album',
                isDownloaded: false,
            }));

            return albumResults;
        } catch (error) {
            console.error('External search failed:', error);
            return [];
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            clearSearch();
            return;
        }

        setIsLoading(true);
        try {
            const lowerQuery = query.toLowerCase();

            const [localResults, externalResults] = await Promise.all([
                searchLibrary(query),
                searchExternal(query),
            ]);

            const combined = [...localResults, ...externalResults];

            // ✅ Deduplicate by "title + subtext"
            const uniqueMap = new Map<string, SearchResult>();

            for (const result of combined) {
                const key = (result.title + result.subtext).toLowerCase();
                const existing = uniqueMap.get(key);

                if (!existing) {
                    uniqueMap.set(key, result);
                } else if (!existing.isDownloaded && result.isDownloaded) {
                    // Prefer downloaded version if available
                    uniqueMap.set(key, result);
                }
            }

            const uniqueResults = Array.from(uniqueMap.values());

            uniqueResults.sort((a, b) => {
                // 1. Downloaded first
                if (a.isDownloaded && !b.isDownloaded) return -1;
                if (b.isDownloaded && !a.isDownloaded) return 1;

                const aTitle = a.title.toLowerCase();
                const bTitle = b.title.toLowerCase();

                const aExact = aTitle === lowerQuery;
                const bExact = bTitle === lowerQuery;
                if (aExact && !bExact) return -1;
                if (bExact && !aExact) return 1;

                const aIncludes = aTitle.includes(lowerQuery);
                const bIncludes = bTitle.includes(lowerQuery);
                if (aIncludes && !bIncludes) return -1;
                if (bIncludes && !aIncludes) return 1;

                // 2. Prefer albums/artists/playlists over songs
                const typePriority = (type: string) => {
                    switch (type) {
                        case 'album': return 1;
                        case 'artist': return 2;
                        case 'playlist': return 3;
                        case 'song': return 4;
                        default: return 5;
                    }
                };

                const aPriority = typePriority(a.type);
                const bPriority = typePriority(b.type);

                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }

                // 3. If all else equal, sort alphabetically
                return aTitle.localeCompare(bTitle);
            });

            const LIMITED_RESULTS = 25;
            setSearchResults(uniqueResults.slice(0, LIMITED_RESULTS));
        } finally {
            setIsLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchResults([]);
    };

    return (
        <SearchContext.Provider
            value={{
                searchResults,
                searchLibrary,
                searchExternal,
                clearSearch,
                isLoading,
                handleSearch,
            }}
        >
            {children}
        </SearchContext.Provider>
    );
};