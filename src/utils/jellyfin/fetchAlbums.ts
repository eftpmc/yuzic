import { AlbumData, SongData, ArtistData } from '@/types';
import { getAlbums } from '@/api/jellyfin/getAlbums';
import { getAlbumSongs } from '@/api/jellyfin/getAlbumSongs';
import { buildJellyfinStreamUrl } from '../urlBuilders';

export const fetchAlbumsFromJellyfin = async (
    serverUrl: string,
    token: string
): Promise<AlbumData[]> => {
    try {
        const albumItems = await getAlbums(serverUrl, token) || [];

        const albumDetails = await Promise.all(
            albumItems.map(async (album: any) => {
                try {
                    const albumId = album.Id;
                    const albumTitle = album.Name;
                    const artistName = album.AlbumArtist || album.Artists?.[0] || 'Unknown Artist';

                    const cover =
                        `${serverUrl}/Items/${albumId}/Images/Primary?quality=90&X-Emby-Token=${token}` +
                        (album.ImageTags?.Primary ? `&tag=${album.ImageTags.Primary}` : '');

                    const songItems = await getAlbumSongs(serverUrl, token, albumId) || [];

                    const songs: SongData[] = songItems.map((song: any) => ({
                        id: song.Id,
                        title: song.Name,
                        artist: song.AlbumArtist || song.Artists?.[0] || 'Unknown Artist',
                        cover,
                        duration: Math.round(
                            parseFloat(
                                String(
                                    song.RunTimeTicks ??
                                        song.MediaSources?.[0]?.RunTimeTicks ??
                                        0
                                )
                            ) / 10_000_000
                        ),
                        streamUrl: buildJellyfinStreamUrl(serverUrl, token, song.Id),
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
                        userPlayCount: songs.reduce(
                            (sum, s) => sum + (s.userPlayCount || 0),
                            0
                        ),
                    };

                    return albumObj;
                } catch {
                    return null;
                }
            })
        );

        return albumDetails.filter(Boolean) as AlbumData[];
    } catch {
        return [];
    }
};