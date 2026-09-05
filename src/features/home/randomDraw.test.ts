import { onePerAlbum } from './randomDraw'
import type { Song } from '@/types'

const song = (id: string, albumId: string): Song => ({
  id,
  title: `Track ${id}`,
  artist: 'Someone',
  artistId: 'artist-1',
  albumId,
  cover: { kind: 'none' },
  duration: '180',
  streamUrl: `https://example.test/${id}`,
}) as Song

describe('onePerAlbum', () => {
  it('keeps a draw that is already varied intact', () => {
    const draw = [song('1', 'a'), song('2', 'b'), song('3', 'c')]

    expect(onePerAlbum(draw).map(s => s.id)).toEqual(['1', '2', '3'])
  })

  it('thins a draw that came back as one album, which is what shipped', () => {
    // A genre-filtered random draw over a narrow pool returns that pool's
    // tracklist, so the shelf drew the same cover three times in a row.
    const draw = [song('1', 'a'), song('2', 'a'), song('3', 'a'), song('4', 'b')]

    expect(onePerAlbum(draw).map(s => s.id)).toEqual(['1', '4'])
  })

  it('keeps the first of each album, so the draw order still decides', () => {
    const draw = [song('1', 'a'), song('2', 'b'), song('3', 'a')]

    expect(onePerAlbum(draw).map(s => s.id)).toEqual(['1', '2'])
  })

  it('lets songs with no album id each stand alone', () => {
    // They cannot be grouped, and dropping them all but one would thin a
    // library of loose tracks down to nothing.
    const draw = [song('1', ''), song('2', ''), song('3', 'a')]

    expect(onePerAlbum(draw).map(s => s.id)).toEqual(['1', '2', '3'])
  })

  it('handles an empty draw', () => {
    expect(onePerAlbum([])).toEqual([])
  })
})
