import { ExternalArtistBase } from '@/types'
import { createMusicBrainzClient, USER_AGENT } from '../client'

/** Uses artist.relations from a single MB artist call (inc=url-rels) so we don’t make a 2nd MB request. */
async function resolveArtistImageFromRelations(
  relations: any[] | undefined
): Promise<string | null> {
  try {
    const wikidataRel = relations?.find(
      (r: any) =>
        r.type === 'wikidata' &&
        r.url?.resource?.includes('wikidata.org')
    )
    if (!wikidataRel) return null

    const wikidataId =
      wikidataRel.url.resource.split('/').pop()
    if (!wikidataId) return null

    const wdRes = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
      { headers: { 'User-Agent': USER_AGENT } }
    )
    if (!wdRes.ok) return null

    const wdData = await wdRes.json()
    const entity = wdData.entities?.[wikidataId]
    const imageName =
      entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
    if (!imageName) return null

    const commonsName = encodeURIComponent(
      imageName.replace(/ /g, '_')
    )
    return `https://commons.wikimedia.org/w/thumb.php?f=${commonsName}&w=512`
  } catch {
    return null
  }
}

/** Single MusicBrainz call (artist + url-rels). Image comes from Wikidata only. */
export async function getArtist(
  artistMbid: string
): Promise<ExternalArtistBase | null> {
  try {
    const { request } = createMusicBrainzClient()
    const artist = await request<any>(`artist/${artistMbid}`, {
      inc: 'url-rels',
    })

    let cover: ExternalArtistBase['cover'] = { kind: 'none' }
    const imageUrl = await resolveArtistImageFromRelations(artist.relations)
    if (imageUrl) {
      cover = { kind: 'lastfm', url: imageUrl }
    }

    return {
      id: artist.id,
      name: artist.name,
      subtext: artist.area?.name ?? '',
      cover,
    }
  } catch (err) {
    console.warn(
      `MusicBrainz getArtist failed for ${artistMbid}`,
      err
    )
    return null
  }
}