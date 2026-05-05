import { ExternalAlbumBase } from '@/types'
import { createMusicBrainzClient } from '../client'

const EXCLUDE_SECONDARY = new Set([
  'Compilation',
  'Remix',
  'Live',
  'Soundtrack',
  'DJ-mix',
  'Mixtape/Street',
  'Demo',
  'Interview',
  'Audiobook',
  'Spokenword',
])

const EXCLUDE_TITLE_HINTS = [
  'deluxe',
  'anniversary',
  'remaster',
  'remastered',
  'expanded',
  'special edition',
  'bonus',
  'edition',
]

type ReleaseGroupPrimaryType = 'album' | 'single' | 'ep'

export type ArtistDiscography = {
  albums: ExternalAlbumBase[]
  singles: ExternalAlbumBase[]
}

function parseYear(date?: string | null): number | null {
  if (!date) return null
  const m = /^(\d{4})/.exec(date)
  return m ? Number(m[1]) : null
}

function hasExcludedTitle(title: string) {
  const t = title.toLowerCase()
  return EXCLUDE_TITLE_HINTS.some(h => t.includes(h))
}

function isExcludedSecondary(rg: any): boolean {
  const sec: string[] = Array.isArray(rg['secondary-types'])
    ? rg['secondary-types']
    : []
  return sec.some(s => EXCLUDE_SECONDARY.has(s))
}

function scoreReleaseGroup(rg: any): number {
  const title = String(rg.title ?? '')
  const year = parseYear(rg['first-release-date'])
  const hasDate = !!rg['first-release-date']
  const primary = rg['primary-type'] ?? null

  let score = 0

  if (primary === 'Album') score += 5
  if (hasDate) score += 2

  if (year != null) {
    if (year >= 1990 && year <= 2018) score += 3
    else if (year >= 1970 && year <= 1989) score += 2
    else if (year >= 1950 && year <= 1969) score += 1
    else if (year >= 2019) score -= 1
  }

  if (hasExcludedTitle(title)) score -= 3

  return score
}

function compareByReleaseDateDesc(a: any, b: any): number {
  const ad = a['first-release-date'] ?? ''
  const bd = b['first-release-date'] ?? ''
  if (bd !== ad) return bd.localeCompare(ad)
  return String(a.title ?? '').localeCompare(String(b.title ?? ''))
}

const normalizeReleaseGroup = (
  rg: any,
  artistName: string,
  artistMbid: string,
  releaseType: ExternalAlbumBase['releaseType']
): ExternalAlbumBase => {
  const releaseDate = rg['first-release-date']

  return {
    id: rg.id,
    title: rg.title,
    artist: artistName,
    artistMbid,
    subtext: parseYear(releaseDate)?.toString() ?? artistName,
    cover: {
      kind: 'musicbrainz',
      releaseGroupId: rg.id,
    },
    releaseDate,
    releaseType,
  }
}

async function getReleaseGroupsByType(
  artistMbid: string,
  artistName: string,
  primaryType: ReleaseGroupPrimaryType,
  limit: number
): Promise<ExternalAlbumBase[]> {
  const { request } = createMusicBrainzClient()

  const res = await request<{
    'release-groups'?: any[]
  }>('release-group', {
    artist: artistMbid,
    type: primaryType,
    limit: String(Math.max(limit * 2, 50)),
  })

  const groups = Array.isArray(res['release-groups'])
    ? res['release-groups']
    : []

  const expectedPrimaryType =
    primaryType === 'ep' ? 'EP' : primaryType === 'album' ? 'Album' : 'Single'

  const filtered = groups
    .filter(rg => (rg['primary-type'] ?? null) === expectedPrimaryType)
    .filter(rg => !isExcludedSecondary(rg))

  filtered.sort(compareByReleaseDateDesc)

  return filtered
    .slice(0, limit)
    .map(rg => normalizeReleaseGroup(
      rg,
      artistName,
      artistMbid,
      primaryType === 'album' ? 'album' : 'single'
    ))
}

export async function getArtistDiscography(
  artistMbid: string,
  artistName: string,
  options: { albumLimit?: number; singleLimit?: number } = {}
): Promise<ArtistDiscography> {
  const { albumLimit = 80, singleLimit = 80 } = options

  try {
    const albums = await getReleaseGroupsByType(artistMbid, artistName, 'album', albumLimit)
    const singles = singleLimit > 0
      ? await getReleaseGroupsByType(artistMbid, artistName, 'single', singleLimit)
      : []
    const eps = singleLimit > 0
      ? await getReleaseGroupsByType(artistMbid, artistName, 'ep', Math.ceil(singleLimit / 2))
      : []

    const seenSingles = new Set<string>()
    const singlesAndEps = [...singles, ...eps]
      .filter(release => {
        if (seenSingles.has(release.id)) return false
        seenSingles.add(release.id)
        return true
      })
      .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
      .slice(0, singleLimit)

    return { albums, singles: singlesAndEps }
  } catch (err) {
    console.warn(
      `MusicBrainz getArtistDiscography failed for ${artistMbid}`,
      err
    )
    return { albums: [], singles: [] }
  }
}

export async function getArtistAlbums(
  artistMbid: string,
  artistName: string,
  limit = 25
): Promise<ExternalAlbumBase[]> {
  try {
    const { albums } = await getArtistDiscography(artistMbid, artistName, {
      albumLimit: Math.max(limit, 25),
      singleLimit: 0,
    })

    return albums
      .filter(album => !hasExcludedTitle(album.title))
      .sort((a, b) => {
        const sa = scoreReleaseGroup({
          title: a.title,
          'first-release-date': a.releaseDate,
          'primary-type': 'Album',
        })
        const sb = scoreReleaseGroup({
          title: b.title,
          'first-release-date': b.releaseDate,
          'primary-type': 'Album',
        })
        if (sb !== sa) return sb - sa
        return (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '')
      })
      .slice(0, limit)
  } catch (err) {
    console.warn(
      `MusicBrainz getArtistAlbums failed for ${artistMbid}`,
      err
    )
    return []
  }
}
