import { buildCoverArtUrl } from '@/utils/urlBuilders';
import { AlbumSummary, ArtistData } from '@/types';

import { getArtists } from '@/api/navidrome/getArtists';
import { getArtistInfo } from '@/api/lastfm/getArtistInfo';

export const fetchArtists = async (
    serverUrl: string,
    username: string,
    password: string,
    downloadedAlbums: AlbumSummary[] = [],
    existingArtists: ArtistData[] = []
): Promise<ArtistData[]> => {
    const artistResponse = await getArtists(serverUrl, username, password);
    const artistIndexes = artistResponse?.index || [];

    const artists = artistIndexes.flatMap((index: any) =>
        index?.artist?.map((artist: any) => ({
            id: artist.id,
            name: artist.name,
            cover: artist.coverArt
                ? buildCoverArtUrl(artist.coverArt, serverUrl, username, password)
                : '',
            subtext: 'Artist',
        })) || []
    );

    return await Promise.all(
        artists.map(async (artist: { id: string; name: string }) => {
            const cached = existingArtists.find((a) => a.id === artist.id);

            if (cached && cached.albums && cached.albums.length > 0 && cached.bio) {
                return { ...artist, albums: cached.albums, bio: cached.bio };
            }

            const { albums: albumsRaw, bio } = await getArtistInfo(artist.name);

            const albums: AlbumSummary[] = (albumsRaw || [])
                .filter((album: any) =>
                    album.name &&
                    typeof album.name === 'string' &&
                    album.name.trim().toLowerCase() !== '' &&
                    album.name.trim().toLowerCase() !== '(null)' &&
                    album.name.trim().toLowerCase() !== 'undefined'
                )
                .map((album: any) => {
                    const title = album.name || '';
                    const id = album.mbid || title;
                    const cover = album.image?.find((img: any) => img.size === 'extralarge')?.['#text'] || '';
                    const artistName = album.artist?.name || artist.name;
                    const playcount = album.playcount ? parseInt(album.playcount) : undefined;

                    let subtext = 'Album';
                    const lower = title.toLowerCase();
                    if (lower.includes('ep')) subtext = 'EP';
                    else if (lower.includes('single')) subtext = 'Single';

                    const matchedDownload = downloadedAlbums.find((downloaded) =>
                        downloaded.title.toLowerCase() === title.toLowerCase() &&
                        downloaded.artist.toLowerCase() === artistName.toLowerCase()
                    );

                    const isDownloaded = !!matchedDownload;
                    const navidromeId = matchedDownload?.id ?? id;

                    return {
                        id: navidromeId,
                        cover,
                        title,
                        subtext,
                        artist: artistName,
                        playcount,
                        isDownloaded,
                    };
                });

            return { ...artist, albums, bio };
        })
    );
};