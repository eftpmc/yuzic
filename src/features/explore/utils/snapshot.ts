import { ExternalAlbumBase } from '@/types'

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function buildAlbumSnapshot(
  entries: { albums: ExternalAlbumBase[] }[],
  target: number
): ExternalAlbumBase[] {
  const result: ExternalAlbumBase[] = []
  const shuffled = shuffle(entries)
  let index = 0

  while (result.length < target) {
    let added = false
    for (const entry of shuffled) {
      if (entry.albums[index]) {
        result.push(entry.albums[index])
        added = true
        if (result.length >= target) return result
      }
    }
    if (!added) break
    index++
  }

  return result
}

export function buildNewAlbumSnapshot(
  entries: { albums: ExternalAlbumBase[] }[],
  target: number
): ExternalAlbumBase[] {
  const seen = new Set<string>()
  const all: ExternalAlbumBase[] = []

  for (const entry of entries) {
    for (const album of entry.albums) {
      if (!album.releaseDate) continue
      if (seen.has(album.id)) continue
      seen.add(album.id)
      all.push(album)
    }
  }

  all.sort((a, b) =>
    (b.releaseDate ?? '').localeCompare(
      a.releaseDate ?? ''
    )
  )

  return all.slice(0, target)
}