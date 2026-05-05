import { USER_AGENT } from '../client'

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql'

/**
 * Fetches artist images from Wikidata directly by MusicBrainz ID (P434),
 * bypassing the MusicBrainz API entirely. Accepts a batch of MBIDs and
 * returns a map of mbid → Commons filename (use with CoverSource kind:'commons').
 */
export async function getArtistImagesByMbid(
  mbids: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (!mbids.length) return result

  const values = mbids.map(id => `"${id}"`).join(' ')
  const query = `
    SELECT ?mbid ?image WHERE {
      VALUES ?mbid { ${values} }
      ?artist wdt:P434 ?mbid .
      OPTIONAL { ?artist wdt:P18 ?image . }
    }
  `

  try {
    const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
    })
    if (!res.ok) return result

    const data = await res.json()
    for (const row of data.results?.bindings ?? []) {
      const mbid: string = row.mbid?.value
      const imageUri: string | undefined = row.image?.value
      if (mbid && imageUri && !result.has(mbid)) {
        const rawName = decodeURIComponent(imageUri.split('/Special:FilePath/')[1] ?? '')
        const filename = rawName.replace(/ /g, '_')
        if (filename) result.set(mbid, filename)
      }
    }
  } catch {
    // best-effort
  }

  return result
}
