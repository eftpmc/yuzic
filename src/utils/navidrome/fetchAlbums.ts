import { buildCoverArtUrl, buildStreamUrl } from '@/utils/urlBuilders';
import { AlbumData, ArtistData } from '@/types';

import { getArtist } from '@/api/navidrome/getArtist';
import { getAlbum } from '@/api/navidrome/getAlbum';
import { getAlbumInfo } from '@/api/navidrome/getAlbumInfo';

export const fetchAlbums = async (
    serverUrl: string,
    username: string,
    password: string,
    albumsToFetch: any[]
): Promise<AlbumData[]> => {
    const newAlbums = albumsToFetch;

    if (newAlbums.length === 0) {
        console.log('[AlbumService] No new albums to fetch.');
        return [];
    }

    console.log(`[AlbumService] Fetching ${newAlbums.length} new albums.`);

    const albumDetails = await Promise.all(
        newAlbums.map(async (album: any) => {
            const albumCoverUrl = buildCoverArtUrl(album.coverArt, serverUrl, username, password);

            const artist = await getArtist(serverUrl, username, password, album.artistId);
            const albumData = await getAlbum(serverUrl, username, password, album.id);
            const albumInfo = await getAlbumInfo(serverUrl, username, password, album.id);

            const songList = albumData?.song || [];

            const artistDetails: ArtistData = artist
                ? {
                      id: artist.id,
                      name: artist.name,
                      cover: artist.coverArt
                          ? buildCoverArtUrl(artist.coverArt, serverUrl, username, password)
                          : '',
                  }
                : { id: '', name: 'Unknown Artist', cover: '' };

            return {
                id: album.id,
                cover: albumCoverUrl,
                title: album.title,
                subtext: songList.length > 1 ? `Album • ${album.artist}` : `Single • ${album.artist}`,
                artist: artistDetails,
                musicBrainzId: albumInfo.musicBrainzId || null,
                lastFmUrl: albumInfo.lastFmUrl || null,
                genres: [],
                songs: songList.map((song: any) => ({
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    cover: albumCoverUrl,
                    duration: song.duration,
                    streamUrl: buildStreamUrl(song.id, serverUrl, username, password),
                    genres: [],
                    albumId: song.albumId,
                    globalPlayCount: 0,
                })),
            };
        })
    );

    return albumDetails;
};