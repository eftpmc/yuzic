import type { QueryClient } from '@tanstack/react-query'
import * as listenbrainz from '@/api/listenbrainz'
import * as musicbrainz from '@/api/musicbrainz'
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid'
import {
  getExploreArtists,
  setExploreArtists,
  getExploreMeta,
  setExploreMeta,
  type SimilarArtistEntry,
} from './exploreCache'
import {
  RequestQueue,
  sharedMusicBrainzQueue,
  LISTENBRAINZ_DELAY_MS,
} from './requestQueue'

const SIMILAR_PER_SEED = 8
const ALBUMS_PER_ARTIST = 3

type SeedArtist = { id?: string; name: string }

export class SimilarArtistsExplorer {
  private listenBrainzQueue = new RequestQueue(LISTENBRAINZ_DELAY_MS)

  async request(
    queryClient: QueryClient,
    seeds: SeedArtist[],
    targetArtistCount: number
  ): Promise<{ consumedArtistIds: string[]; hadErrors: boolean }> {
    const consumedArtistIds: string[] = []
    let hadErrors = false

    for (const seed of seeds) {
      try {
        const entries = getExploreArtists(queryClient)
        if (entries.length >= targetArtistCount) {
          return { consumedArtistIds, hadErrors }
        }

        if (seed.name.toLowerCase() === 'various artists') continue

        const meta = getExploreMeta(queryClient)
        let mbid: string | undefined =
          seed.id && seed.id.includes('-')
            ? seed.id
            : seed.id
              ? meta.serverArtistMbidMap[seed.id]
              : undefined

        if (!mbid) {
          let resolved: string | null = null
          try {
            resolved = await sharedMusicBrainzQueue.run(() =>
              resolveArtistMbid(undefined, seed.name)
            )
          } catch {
            hadErrors = true
            continue
          }
          if (!resolved) {
            hadErrors = true
            continue
          }
          mbid = resolved
          if (seed.id) {
            setExploreMeta(queryClient, (m) => ({
              ...m,
              serverArtistMbidMap: {
                ...m.serverArtistMbidMap,
                [seed.id!]: mbid!,
              },
            }))
          }
        }

        let similar: { artist_mbid: string }[] = []
        try {
          similar = await this.listenBrainzQueue.run(() =>
            listenbrainz.getSimilarArtists(mbid!, { limit: SIMILAR_PER_SEED })
          )
        } catch {
          hadErrors = true
          continue
        }
        if (seed.id) consumedArtistIds.push(seed.id)

        const byId = new Map(entries.map((e) => [e.artist.id, e]))

        for (const s of similar) {
          if (byId.has(s.artist_mbid)) continue
          const current = getExploreArtists(queryClient)
          if (current.length >= targetArtistCount) {
            return { consumedArtistIds, hadErrors }
          }

          let artist: Awaited<ReturnType<typeof musicbrainz.getArtist>> = null
          try {
            artist = await sharedMusicBrainzQueue.run(() =>
              musicbrainz.getArtist(s.artist_mbid)
            )
          } catch {
            hadErrors = true
            continue
          }
          if (!artist) {
            hadErrors = true
            continue
          }

          let albums: Awaited<ReturnType<typeof musicbrainz.getArtistAlbums>> =
            []
          try {
            albums = await sharedMusicBrainzQueue.run(() =>
              musicbrainz.getArtistAlbums(artist!.id, artist!.name)
            )
          } catch {
            hadErrors = true
          }

          const newEntry: SimilarArtistEntry = {
            artist,
            albums: albums.slice(0, ALBUMS_PER_ARTIST),
          }
          setExploreArtists(queryClient, (prev) => [...prev, newEntry])
          byId.set(artist.id, newEntry)
          setExploreMeta(queryClient, (m) => ({ ...m, hasNewData: true }))
        }
      } catch {
        hadErrors = true
      }
    }

    return { consumedArtistIds, hadErrors }
  }
}

export const similarArtistsExplorer = new SimilarArtistsExplorer()
