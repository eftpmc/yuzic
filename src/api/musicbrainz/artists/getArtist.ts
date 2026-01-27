import { ExternalArtistBase } from '@/types'
import { createMusicBrainzClient } from '../client'

async function resolveArtistImageFromWikidata(
  artistMbid: string
): Promise<string | null> {
  try {
    const mbRes = await fetch(
      `https://musicbrainz.org/ws/2/artist/${artistMbid}?inc=url-rels&fmt=json`
    )
    if (!mbRes.ok) return null

    const mbData = await mbRes.json()

    const wikidataRel = mbData.relations?.find(
      (r: any) =>
        r.type === 'wikidata' &&
        r.url?.resource?.includes('wikidata.org')
    )

    if (!wikidataRel) return null

    const wikidataId =
      wikidataRel.url.resource.split('/').pop()

    if (!wikidataId) return null

    const wdRes = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
    )
    if (!wdRes.ok) return null

    const wdData = await wdRes.json()
    const entity = wdData.entities?.[wikidataId]

    const imageName =
      entity?.claims?.P18?.[0]?.mainsnak?.datavalue
        ?.value

    if (!imageName) return null

    const commonsName = encodeURIComponent(
      imageName.replace(/ /g, '_')
    )

    const width = 512

    return `https://commons.wikimedia.org/w/thumb.php?f=${commonsName}&w=${width}`
  } catch {
    return null
  }
}

export async function getArtist(
  artistMbid: string
): Promise<ExternalArtistBase | null> {
  try {
    const { request } = createMusicBrainzClient()

    const artist = await request<any>(`artist/${artistMbid}`)

    let cover: ExternalArtistBase['cover'] = {
      kind: 'none',
    }

    const imageUrl =
      await resolveArtistImageFromWikidata(artist.id)

    if (imageUrl) {
      cover = {
        kind: 'lastfm',
        url: imageUrl,
      }
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