import { AlbumSummary, ArtistData } from '@/types';

/**
 * Enrich artists with Last.fm data for consistent album listings & bios.
 * Reuses Navidrome’s Last.fm proxy for cross-server consistency.
 */
const fetchLastFmData = async (
    artistName: string,
    downloadedAlbums: AlbumSummary[] = []
): Promise<{ albums: AlbumSummary[]; bio: string | null }> => {
    try {
        const res = await fetch(
            `https://rawarr-server-af0092d911f6.herokuapp.com/api/lastfm/artist?name=${encodeURIComponent(
                artistName
            )}`
        );
        const { albums: albumsRaw, bio } = await res.json();

        const albums: AlbumSummary[] = albumsRaw
            .filter(
                (album: any) =>
                    album.name &&
                    typeof album.name === 'string' &&
                    album.name.trim().toLowerCase() !== '' &&
                    album.name.trim().toLowerCase() !== '(null)' &&
                    album.name.trim().toLowerCase() !== 'undefined'
            )
            .map((album: any) => {
                const title = album.name || '';
                const id = album.mbid || title;
                const cover =
                    album.image?.find((img: any) => img.size === 'extralarge')?.['#text'] || '';
                const artist = album.artist?.name || artistName;
                const playcount = album.playcount ? parseInt(album.playcount) : undefined;

                let subtext = 'Album';
                const lower = title.toLowerCase();
                if (lower.includes('ep')) subtext = 'EP';
                else if (lower.includes('single')) subtext = 'Single';

                const matchedDownload = downloadedAlbums.find(
                    (d) =>
                        d.title.toLowerCase() === title.toLowerCase() &&
                        d.artist.toLowerCase() === artist.toLowerCase()
                );

                return {
                    id: matchedDownload?.id ?? id,
                    cover,
                    title,
                    subtext,
                    artist,
                    playcount,
                    isDownloaded: !!matchedDownload,
                };
            });

        return { albums, bio };
    } catch (err) {
        console.warn(`❌ [Last.fm] Failed for "${artistName}":`, err);
        return { albums: [], bio: null };
    }
};

/**
 * Fetch full artist data from Jellyfin, merging Jellyfin metadata
 * with Last.fm enrichment for consistent album lists and bio fallback.
 */
export const fetchArtistsFromJellyfin = async (
    serverUrl: string,
    token: string,
    downloadedAlbums: AlbumSummary[] = [],
    existingArtists: ArtistData[] = []
): Promise<ArtistData[]> => {
    try {
        console.log('[Jellyfin] Fetching all music artists...');

        const response = await fetch(
            `${serverUrl}/Items?IncludeItemTypes=MusicArtist&Recursive=true&SortBy=SortName&Fields=PrimaryImageAspectRatio,Overview,Genres,Path,DateCreated`,
            { headers: { 'X-Emby-Token': token } }
        );

        if (!response.ok) {
            console.error('[Jellyfin] Failed to fetch artists:', response.status);
            return [];
        }

        const data = await response.json();
        const artistItems = data?.Items || [];
        console.log(`[Jellyfin] Found ${artistItems.length} artists.`);

        const artists: ArtistData[] = await Promise.all(
            artistItems.map(async (artist: any) => {
                const artistId = artist.Id;
                const artistName = artist.Name;
                const cover =
                    `${serverUrl}/Items/${artistId}/Images/Primary?quality=90&X-Emby-Token=${token}` +
                    (artist.ImageTags?.Primary ? `&tag=${artist.ImageTags.Primary}` : '');

                // 🧠 Reuse cached data if available
                const cached = existingArtists.find((a) => a.id === artistId);
                if (cached && cached.albums && cached.albums.length > 0 && cached.bio)
                    return cached;

                // Step 1: Fetch artist’s albums directly from Jellyfin
                const albumRes = await fetch(
                    `${serverUrl}/Items?ArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=ProductionYear,SortName&Fields=PrimaryImageAspectRatio,Genres,Path,DateCreated,UserData`,
                    { headers: { 'X-Emby-Token': token } }
                );

                let jellyfinAlbums: AlbumSummary[] = [];
                if (albumRes.ok) {
                    const albumData = await albumRes.json();
                    const albumItems = albumData?.Items || [];

                    jellyfinAlbums = albumItems.map((album: any) => {
                        const id = album.Id;
                        const title = album.Name;
                        const coverUrl =
                            `${serverUrl}/Items/${id}/Images/Primary?quality=90&X-Emby-Token=${token}` +
                            (album.ImageTags?.Primary ? `&tag=${album.ImageTags.Primary}` : '');

                        const isDownloaded = downloadedAlbums.some(
                            (d) =>
                                d.title.toLowerCase() === title.toLowerCase()
                        );

                        return {
                            id,
                            cover: coverUrl,
                            title,
                            subtext: 'Album',
                            artist: artistName,
                            playcount: album.UserData?.PlayCount ?? 0,
                            isDownloaded,
                        };
                    });
                }

                // Step 2: Enrich with Last.fm (for missing albums or better bio)
                const { albums: lastFmAlbums, bio: lastFmBio } = await fetchLastFmData(
                    artistName,
                    downloadedAlbums
                );

                // Merge albums (prefer Jellyfin data, then Last.fm extras)
                const mergedAlbumsMap: Record<string, AlbumSummary> = {};
                [...jellyfinAlbums, ...lastFmAlbums].forEach((album) => {
                    mergedAlbumsMap[album.title.toLowerCase()] = album;
                });

                const mergedAlbums = Object.values(mergedAlbumsMap);

                return {
                    id: artistId,
                    name: artistName,
                    cover,
                    subtext: 'Artist',
                    bio: artist.Overview || lastFmBio || null,
                    albums: mergedAlbums,
                };
            })
        );

        return artists.filter(Boolean);
    } catch (err) {
        console.error('[Jellyfin] Failed to fetch artists:', err);
        return [];
    }
};