import {buildCoverArtUrl} from '@/utils/urlBuilders';
import {AlbumSummary, ArtistData} from '@/types';

const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const fetchArtists = async (
    serverUrl: string,
    username: string,
    password: string,
    downloadedAlbums: AlbumSummary[] = [],
    existingArtists: ArtistData[] = []
): Promise<ArtistData[]> => {
    const response = await fetch(
        `${serverUrl}/rest/getArtists.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
            password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`
    );

    const data = await response.json();
    const artistIndexes = data['subsonic-response']?.artists?.index || [];

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
        artists.map(async (artist: { id: string; name: string; }) => {
            const cached = existingArtists.find((a) => a.id === artist.id);

            if (cached && cached.albums && cached.albums.length > 0 && cached.bio) {
                return {...artist, albums: cached.albums, bio: cached.bio};
            }

            // Otherwise fetch from Last.fm
            const {albums, bio} = await fetchLastFmData(artist.name, downloadedAlbums);
            return {...artist, albums, bio};
        })
    );
};

const fetchLastFmData = async (
    artistName: string,
    downloadedAlbums: AlbumSummary[] = []
): Promise<{ albums: AlbumSummary[], bio: string | null }> => {
    try {
        const res = await fetch(`https://rawarr-server-af0092d911f6.herokuapp.com/api/lastfm/artist?name=${encodeURIComponent(artistName)}`);
        const { albums: albumsRaw, bio } = await res.json();

        const albums: AlbumSummary[] = albumsRaw
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
            const artist = album.artist?.name || artistName;
            const playcount = album.playcount ? parseInt(album.playcount) : undefined;

            let subtext = 'Album';
            const lower = title.toLowerCase();
            if (lower.includes('ep')) subtext = 'EP';
            else if (lower.includes('single')) subtext = 'Single';

            const matchedDownload = downloadedAlbums.find((downloaded) =>
                downloaded.title.toLowerCase() === title.toLowerCase() &&
                downloaded.artist.toLowerCase() === artist.toLowerCase()
            );

            const isDownloaded = !!matchedDownload;
            const navidromeId = matchedDownload?.id ?? id;

            return {
                id: navidromeId,
                cover,
                title,
                subtext,
                artist,
                playcount,
                isDownloaded,
            };
        });

        return { albums, bio };
    } catch (err) {
        console.warn(`❌ Failed to fetch Last.fm data for "${artistName}":`, err);
        return { albums: [], bio: null };
    }
};