import { LastfmConfig, ExternalAlbum, ExternalSong, CoverSource } from '@/types';
import { createLastfmClient } from '../client';
import { nanoid } from 'nanoid/non-secure';

type RawLastfmAlbumResponse = {
  album: {
    name: string;
    artist: string;
    mbid?: string;
    image?: { size: string; '#text': string }[];
    tracks?: {
      track: {
        name: string;
        duration?: string | number;
        '@attr'?: { rank?: string | number };
      }[];
    };
  };
};

export async function getAlbumInfo(
  config: LastfmConfig,
  params: { album: string; artist: string }
): Promise<ExternalAlbum> {
  const { request } = createLastfmClient(config);

  const res = await request<RawLastfmAlbumResponse>({
    method: 'album.getinfo',
    album: params.album,
    artist: params.artist,
    autocorrect: '1',
  });

  const album = res.album;

  const imageMap = (album.image ?? []).reduce<Record<string, string>>(
    (acc, img) => {
      if (img['#text']) acc[img.size] = img['#text'];
      return acc;
    },
    {}
  );

  const cover: CoverSource =
    imageMap.extralarge || imageMap.mega
      ? { kind: 'lastfm', url: imageMap.extralarge ?? imageMap.medium }
      : imageMap.large
        ? { kind: 'lastfm', url: imageMap.large }
        : { kind: 'none' };

  const albumId = album.mbid || `lastfm:${nanoid()}`;

  const rawTracks = album.tracks?.track;

  const trackArray =
    Array.isArray(rawTracks)
      ? rawTracks
      : rawTracks
        ? [rawTracks]
        : [];

  const songs: ExternalSong[] = trackArray.map(track => ({
    id: `lastfm:track:${nanoid()}`,
    title: track.name,
    artist: album.artist,
    cover,
    duration: String(track.duration ?? 0),
    albumId,
  }));

  return {
    id: albumId,
    title: album.name,
    artist: album.artist,
    subtext: album.artist,
    cover,
    songs,
  };
}