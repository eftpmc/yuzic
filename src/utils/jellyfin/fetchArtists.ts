import { AlbumSummary, ArtistData } from '@/types';
import { getArtistInfo } from '@/api/lastfm/getArtistInfo';
import { getArtists } from '@/api/jellyfin/getArtists';
import { getArtistAlbums } from '@/api/jellyfin/getArtistAlbums';

const fetchLastFmData = async (
    artistName: string,
    downloadedAlbums: AlbumSummary[] = []
): Promise<{ albums: AlbumSummary[]; bio: string | null }> => {
    const { albums: albumsRaw, bio } = await getArtistInfo(artistName);

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
};

export const fetchArtistsFromJellyfin = async (
    serverUrl: string,
    token: string,
    downloadedAlbums: AlbumSummary[] = [],
    existingArtists: ArtistData[] = []
): Promise<ArtistData[]> => {
    try {
        const artistItems = await getArtists(serverUrl, token);
        if (!artistItems) return [];

        const artists: ArtistData[] = await Promise.all(
            artistItems.map(async (artist: any) => {
                const artistId = artist.Id;
                const artistName = artist.Name;
                const cover =
                    `${serverUrl}/Items/${artistId}/Images/Primary?quality=90&X-Emby-Token=${token}` +
                    (artist.ImageTags?.Primary ? `&tag=${artist.ImageTags.Primary}` : '');

                const cached = existingArtists.find((a) => a.id === artistId);
                if (cached && cached.albums && cached.albums.length > 0 && cached.bio) {
                    return cached;
                }

                let jellyfinAlbums: AlbumSummary[] = [];
                const albumItems = await getArtistAlbums(serverUrl, token, artistId);
                if (albumItems) {
                    jellyfinAlbums = albumItems.map((album: any) => {
                        const id = album.Id;
                        const title = album.Name;
                        const coverUrl =
                            `${serverUrl}/Items/${id}/Images/Primary?quality=90&X-Emby-Token=${token}` +
                            (album.ImageTags?.Primary ? `&tag=${album.ImageTags.Primary}` : '');

                        const isDownloaded = downloadedAlbums.some(
                            (d) => d.title.toLowerCase() === title.toLowerCase()
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

                const { albums: lastFmAlbums, bio: lastFmBio } = await fetchLastFmData(
                    artistName,
                    downloadedAlbums
                );

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
    } catch {
        return [];
    }
};