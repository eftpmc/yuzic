import { buildDownloadRows } from './buildRows';
import type { AlbumBase } from '@/types/Album';
import type { Song, SongBase } from '@/types/Song';
import type { PlaylistBase } from '@/types/Playlist';
import type { DownloadedTrack } from '@/contexts/DownloadContext';

const t = ((key: string) => {
  const labels: Record<string, string> = {
    'settings.library.downloads.type.album': 'Album',
    'settings.library.downloads.type.playlist': 'Playlist',
  };
  return labels[key] ?? key;
}) as any;

const cover = { kind: 'none' as const };

describe('buildDownloadRows', () => {
  it('builds album and playlist rows from downloaded collections', () => {
    const rows = buildDownloadRows({
      albums: [{ id: 'album-1', title: 'Album One', cover }] as AlbumBase[],
      playlists: [{ id: 'playlist-1', title: 'Playlist One', cover }] as PlaylistBase[],
      fullPlaylists: [{ id: 'playlist-1', songs: [{ id: 'p1' }, { id: 'p2' }] }] as (PlaylistBase & { songs?: Song[] })[],
      tracks: [
        { id: 'a1', albumId: 'album-1' },
        { id: 'a2', albumId: 'album-1' },
      ] as SongBase[],
      downloadedTracks: [
        {
          trackId: 'a1',
          fileSize: 1024,
          albumId: 'album-1',
          serverId: 'server-1',
          serverType: 'navidrome',
          coverKind: 'navidrome',
        },
        {
          trackId: 'a2',
          fileSize: 2048,
          albumId: 'album-1',
          serverId: 'server-1',
          serverType: 'navidrome',
          coverKind: 'navidrome',
        },
        {
          trackId: 'p1',
          fileSize: 4096,
          serverId: 'server-1',
          serverType: 'navidrome',
          coverKind: 'navidrome',
        },
      ] as DownloadedTrack[],
      downloadedCollections: [
        { id: 'album-1', type: 'album', trackIds: ['a1', 'a2'], downloadedAt: 1700000000000 },
        { id: 'playlist-1', type: 'playlist', trackIds: ['p1'], downloadedAt: 1700000001000 },
      ],
      t,
    });

    expect(rows.map(row => ({
      collectionId: row.collectionId,
      type: row.type,
      provider: row.provider,
      trackIds: row.trackIds,
      size: row.size,
      trackCount: row.trackCount,
    }))).toEqual([
      {
        collectionId: 'playlist-1',
        type: 'playlist',
        provider: 'navidrome',
        trackIds: ['p1'],
        size: '4.00 KB',
        trackCount: 1,
      },
      {
        collectionId: 'album-1',
        type: 'album',
        provider: 'navidrome',
        trackIds: ['a1', 'a2'],
        size: '3.00 KB',
        trackCount: 2,
      },
    ]);
  });

  it('falls back to persisted playlist track ids when playlist songs are not loaded', () => {
    const rows = buildDownloadRows({
      albums: [],
      playlists: [{ id: 'playlist-1', title: 'Playlist One', cover }] as PlaylistBase[],
      fullPlaylists: [{ id: 'playlist-1' }] as (PlaylistBase & { songs?: Song[] })[],
      tracks: [],
      downloadedTracks: [
        {
          trackId: 'p1',
          fileSize: 1024,
          serverId: 'server-1',
          serverType: 'jellyfin',
          coverKind: 'jellyfin',
        },
      ] as DownloadedTrack[],
      downloadedCollections: [
        { id: 'playlist-1', type: 'playlist', trackIds: ['p1', 'missing'], downloadedAt: 1700000000000 },
      ],
      t,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      collectionId: 'playlist-1',
      provider: 'jellyfin',
      trackIds: ['p1'],
      trackCount: 1,
    });
  });

  it('ignores library items that do not have a downloaded collection entry', () => {
    const rows = buildDownloadRows({
      albums: [{ id: 'album-1', title: 'Album One', cover }] as AlbumBase[],
      playlists: [{ id: 'playlist-1', title: 'Playlist One', cover }] as PlaylistBase[],
      fullPlaylists: [],
      tracks: [],
      downloadedTracks: [],
      downloadedCollections: [],
      t,
    });

    expect(rows).toEqual([]);
  });
});
