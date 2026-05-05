import { ExternalArtistBase } from '@/types'
import { createMusicBrainzClient, USER_AGENT } from '../client'

export type ArtistBasicData = {
  id: string
  name: string
  area?: string
  /** Wikidata entity ID (e.g. "Q12345") if a wikidata relation exists, undefined otherwise. */
  wikidataId?: string
}

/**
 * Fetches only the MusicBrainz artist record (name, area, wikidata relation URL).
 * Does NOT fetch the Wikidata image — call fetchArtistCommonsFilename separately.
 * This is the fast path for the discovery pipeline: only the MB request goes
 * through the rate-limited queue; Wikidata runs in parallel with queue delays.
 */
export async function getArtistBasic(
  artistMbid: string
): Promise<ArtistBasicData | null> {
  try {
    const { request } = createMusicBrainzClient()
    const artist = await request<any>(`artist/${artistMbid}`, { inc: 'url-rels' })

    const wikidataRel = artist.relations?.find(
      (r: any) => r.type === 'wikidata' && r.url?.resource?.includes('wikidata.org')
    )
    const wikidataId: string | undefined = wikidataRel?.url.resource.split('/').pop()

    return {
      id: artist.id,
      name: artist.name,
      area: artist.area?.name,
      wikidataId,
    }
  } catch (err) {
    console.warn(`MusicBrainz getArtistBasic failed for ${artistMbid}`, err)
    return null
  }
}

/**
 * Fetches an artist's Commons filename from Wikidata.
 * Use with CoverSource { kind: 'commons', filename } so buildCover can size it correctly.
 * Not rate-limited — safe to run in parallel with MB queue requests.
 */
export async function fetchArtistCommonsFilename(wikidataId: string): Promise<string | null> {
  try {
    const wdRes = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
      { headers: { 'User-Agent': USER_AGENT } }
    )
    if (!wdRes.ok) return null

    const wdData = await wdRes.json()
    const entity = wdData.entities?.[wikidataId]
    const imageName = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
    if (!imageName) return null

    return imageName.replace(/ /g, '_')
  } catch {
    return null
  }
}

/**
 * Full artist fetch: MB data + Wikidata image in one call.
 * Used for the external artist view page (user-initiated, not background discovery).
 */
export async function getArtist(
  artistMbid: string
): Promise<ExternalArtistBase | null> {
  try {
    const basic = await getArtistBasic(artistMbid)
    if (!basic) return null

    let cover: ExternalArtistBase['cover'] = { kind: 'none' }
    if (basic.wikidataId) {
      const filename = await fetchArtistCommonsFilename(basic.wikidataId)
      if (filename) cover = { kind: 'commons', filename }
    }

    return {
      id: basic.id,
      name: basic.name,
      subtext: basic.area ?? '',
      cover,
    }
  } catch (err) {
    console.warn(`MusicBrainz getArtist failed for ${artistMbid}`, err)
    return null
  }
}
