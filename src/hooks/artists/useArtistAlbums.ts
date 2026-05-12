import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectLibraryAlbums } from '@/utils/redux/selectors/librarySelectors'
import type { AlbumBase } from '@/types'

export function useArtistAlbums(artistId: string): AlbumBase[] {
  const albums = useSelector(selectLibraryAlbums)
  return useMemo(
    () => albums.filter(a => a.artist.id === artistId),
    [albums, artistId]
  )
}
