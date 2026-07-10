import { CoverSource } from "@/types";

/**
 * Jellyfin and Emby speak the same MediaBrowser-derived API and differ only
 * in a handful of details (this is Jellyfin's Emby fork lineage showing).
 * `MediaBrowserBrand` captures those differences so the rest of the adapter
 * code can be shared between the two backends.
 */
export interface MediaBrowserBrand {
  kind: "jellyfin" | "emby";
  label: "Jellyfin" | "Emby";
  /** Query-param name used to pass the access token on stream URLs. */
  streamTokenParam: "X-Emby-Token" | "api_key";
  /** Emby's /System/Ping returns a non-JSON body; Jellyfin's is JSON. */
  pingAsText: boolean;
}

export const JELLYFIN_BRAND: MediaBrowserBrand = {
  kind: "jellyfin",
  label: "Jellyfin",
  streamTokenParam: "X-Emby-Token",
  pingAsText: false,
};

export const EMBY_BRAND: MediaBrowserBrand = {
  kind: "emby",
  label: "Emby",
  streamTokenParam: "api_key",
  pingAsText: true,
};

/** Cover addressed by item ID alone — safe for both brands. */
export function buildCover(
  brand: MediaBrowserBrand,
  itemId: string | undefined
): CoverSource {
  if (!itemId) return { kind: "none" };
  return brand.kind === "jellyfin"
    ? { kind: "jellyfin", itemId }
    : { kind: "emby", itemId };
}

/**
 * Some Emby list endpoints only resolve a cover when an explicit image tag
 * is present in the response (otherwise the image endpoint 404s); Jellyfin
 * doesn't need the tag, so it falls back to itemId-only.
 */
export function buildCoverWithTag(
  brand: MediaBrowserBrand,
  itemId: string | undefined,
  tag: string | undefined
): CoverSource {
  if (brand.kind === "jellyfin") return buildCover(brand, itemId);
  return itemId && tag ? { kind: "emby", itemId, tag } : { kind: "none" };
}

/**
 * Song covers: Jellyfin resolves art via the song's own item ID; Emby needs
 * the parent album's ID + image tag instead.
 */
export function buildSongCover(
  brand: MediaBrowserBrand,
  songId: string | undefined,
  albumId: string | undefined,
  albumTag: string | undefined
): CoverSource {
  if (brand.kind === "jellyfin") return buildCover(brand, songId);
  return albumId && albumTag ? { kind: "emby", itemId: albumId, tag: albumTag } : { kind: "none" };
}
