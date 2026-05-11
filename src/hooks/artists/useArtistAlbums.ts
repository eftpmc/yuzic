import { useSelector } from 'react-redux'
import { selectLibraryAlbums } from '@/utils/redux/selectors/librarySelectors'
import type { Album } from '@/types'

export function useArtistAlbums(artistId: string): Album[] {
  const albums = useSelector(selectLibraryAlbums)
  return albums.filter(a => a.artist.id === artistId)
}
