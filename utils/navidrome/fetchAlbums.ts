import { buildCoverArtUrl, buildStreamUrl } from '@/utils/urlBuilders';
import { AlbumData, ArtistData } from '@/types';

const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

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

            // Artist fetch
            const artistResponse = await fetch(
                `${serverUrl}/rest/getArtist.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
                    password
                )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&id=${album.artistId}`
            );
            const artistData = await artistResponse.json();
            const artist = artistData['subsonic-response']?.artist;

            const artistDetails: ArtistData = artist
                ? {
                    id: artist.id,
                    name: artist.name,
                    cover: artist.coverArt
                        ? buildCoverArtUrl(artist.coverArt, serverUrl, username, password)
                        : '',
                }
                : { id: '', name: 'Unknown Artist', cover: '' };

            // Songs fetch
            const songsResponse = await fetch(
                `${serverUrl}/rest/getAlbum.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
                    password
                )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&id=${album.id}`
            );
            const songsData = await songsResponse.json();
            const songList = songsData['subsonic-response']?.album?.song || [];

            // Optional MusicBrainz/Last.fm metadata
            const albumInfoResponse = await fetch(
                `${serverUrl}/rest/getAlbumInfo.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
                    password
                )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&id=${album.id}`
            );
            const albumInfoData = await albumInfoResponse.json();
            const albumInfo = albumInfoData['subsonic-response']?.albumInfo || {};

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