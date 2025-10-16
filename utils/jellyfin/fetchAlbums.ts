import { AlbumData, SongData, ArtistData } from '@/types';

/**
 * Fetches full album + song data from a Jellyfin server.
 * Mirrors Navidrome's fetchAlbums output structure.
 */
export const fetchAlbumsFromJellyfin = async (
    serverUrl: string,
    token: string
): Promise<AlbumData[]> => {
    const albums: AlbumData[] = [];

    try {
        console.log('[Jellyfin] Fetching all music albums...');

        // Step 1: Get all music albums
        const albumRes = await fetch(
            `${serverUrl}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=SortName&Fields=PrimaryImageAspectRatio,ProductionYear,Genres,ParentId,Path,DateCreated,MediaSources`,
            { headers: { 'X-Emby-Token': token } }
        );

        if (!albumRes.ok) {
            console.error('[Jellyfin] Failed to fetch albums:', albumRes.status);
            return [];
        }

        const albumData = await albumRes.json();
        const albumItems = albumData?.Items || [];
        console.log(`[Jellyfin] Found ${albumItems.length} albums.`);

        // Step 2: For each album, fetch its songs
        const albumDetails = await Promise.all(
            albumItems.map(async (album: any) => {
                try {
                    const albumId = album.Id;
                    const albumTitle = album.Name;
                    const artistName = album.AlbumArtist || (album.Artists?.[0] ?? 'Unknown Artist');

                    const cover =
                        `${serverUrl}/Items/${albumId}/Images/Primary?quality=90&X-Emby-Token=${token}` +
                        (album.ImageTags?.Primary ? `&tag=${album.ImageTags.Primary}` : '');

                    // Step 2a: Fetch songs for this album
                    const songsRes = await fetch(
                        `${serverUrl}/Items?ParentId=${albumId}&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&Fields=Path,MediaSources,RunTimeTicks,Genres,Album,AlbumArtist,PlayCount`,
                        { headers: { 'X-Emby-Token': token } }
                    );

                    if (!songsRes.ok) {
                        console.warn(`[Jellyfin] Failed to fetch songs for album ${albumTitle}`);
                        return null;
                    }

                    const songsData = await songsRes.json();
                    const songItems = songsData?.Items || [];

                    const songs: SongData[] = songItems.map((song: any) => ({
                        id: song.Id,
                        title: song.Name,
                        artist: song.AlbumArtist || song.Artists?.[0] || 'Unknown Artist',
                        cover,
                        duration: Math.round(parseFloat(String(song.RunTimeTicks ?? song.MediaSources?.[0]?.RunTimeTicks ?? 0)) / 10_000_000),

                        streamUrl: `${serverUrl}/Audio/${song.Id}/stream.mp3?X-Emby-Token=${token}`,
                        albumId: albumId,
                        genres: song.Genres || [],
                        globalPlayCount: song.PlayCount ?? 0,
                        userPlayCount: song.UserData?.PlayCount ?? 0,
                    }));

                    const artist: ArtistData = {
                        id: album.AlbumArtistId || album.ArtistItems?.[0]?.Id || '',
                        name: artistName,
                        cover,
                    };

                    const albumObj: AlbumData = {
                        id: albumId,
                        cover,
                        title: albumTitle,
                        subtext:
                            songItems.length > 1
                                ? `Album • ${artistName}`
                                : `Single • ${artistName}`,
                        artist,
                        songs,
                        genres: album.Genres || [],
                        musicBrainzId: null,
                        lastFmUrl: null,
                        userPlayCount: songs.reduce((sum, s) => sum + (s.userPlayCount || 0), 0),
                    };

                    return albumObj;
                } catch (err) {
                    console.error('[Jellyfin] Error processing album', album.Name, err);
                    return null;
                }
            })
        );

        // Step 3: Clean out nulls
        const validAlbums = albumDetails.filter(Boolean) as AlbumData[];
        console.log(`[Jellyfin] Processed ${validAlbums.length} albums successfully.`);

        return validAlbums;
    } catch (err) {
        console.error('[Jellyfin] Unexpected error:', err);
        return [];
    }
};

/** Convert seconds → mm:ss */
function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}