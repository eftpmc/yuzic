import { AlbumBase, Artist, ArtistBase, CoverSource } from "@/types";
import type { NavidromeClient } from "../client";
import { getAlbumInfo } from "../albums/getAlbumInfo";

export type GetArtistResult = Artist | null;

export async function getArtist(
  client: NavidromeClient,
  artistId: string
): Promise<GetArtistResult> {
  const raw = await client.request<any>("getArtist.view", { id: artistId });
  const artist = raw?.["subsonic-response"]?.artist;
  if (!artist) return null;

  const artistCover: CoverSource = artist.coverArt
    ? { kind: "navidrome", coverArtId: artist.coverArt }
    : { kind: "none" };

  const artistBase: ArtistBase = {
    id: artist.id,
    cover: artistCover,
    name: artist.name,
    subtext: "Artist",
  };

  const albumInfos = await Promise.all(
    artist.album.map((a: { id: string }) => getAlbumInfo(client, a.id))
  );

  const albums: AlbumBase[] = artist.album.map((album: any, i: number) => {
    const cover: CoverSource = album.coverArt
      ? { kind: "navidrome", coverArtId: album.coverArt }
      : { kind: "none" };

    return {
      id: album.id,
      title: album.name,
      cover,
      subtext: `Album • ${artist.name}`,
      year: album.year,
      artist: artistBase,
      genres: album.genre ? [album.genre] : [],
      created: album.created ? new Date(album.created) : new Date(0),
      mbid: albumInfos[i]?.musicBrainzId ?? null,
    };
  });

  return {
    id: artist.id,
    name: artist.name,
    cover: artistCover,
    subtext: "Artist",
    ownedAlbums: albums
  };
}