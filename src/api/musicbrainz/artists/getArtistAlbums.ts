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

const normalizeReleaseGroup = (
  rg: any,
  artistName: string
): ExternalAlbumBase => {
  const releaseDate = rg['first-release-date']

  return {
    id: rg.id,
    title: rg.title,
    artist: artistName,
    subtext: artistName,
    cover: {
      kind: 'musicbrainz',
      releaseGroupId: rg.id,
    },
    releaseDate,
  }
}

export async function getArtistAlbums(
  artistMbid: string,
  artistName: string,
  limit = 25
): Promise<ExternalAlbumBase[]> {
  try {
    const { request } = createMusicBrainzClient()

    const res = await request<{
      'release-groups'?: any[]
    }>('release-group', {
      artist: artistMbid,
      type: 'album',
      limit: String(Math.max(limit * 3, 50)),
    })

    const groups = Array.isArray(res['release-groups'])
      ? res['release-groups']
      : []

    const filtered = groups
      .filter(rg => (rg['primary-type'] ?? null) === 'Album')
      .filter(rg => !isExcludedSecondary(rg))
      .filter(rg => !hasExcludedTitle(String(rg.title ?? '')))

    filtered.sort((a, b) => {
      const sa = scoreReleaseGroup(a)
      const sb = scoreReleaseGroup(b)
      if (sb !== sa) return sb - sa

      const ad = a['first-release-date'] ?? ''
      const bd = b['first-release-date'] ?? ''
      return bd.localeCompare(ad)
    })

    return filtered
      .slice(0, limit)
      .map(rg => normalizeReleaseGroup(rg, artistName))
  } catch (err) {
    console.warn(
      `MusicBrainz getArtistAlbums failed for ${artistMbid}`,
      err
    )
    return []
  }
}