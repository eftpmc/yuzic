import { isPresentableGenre, presentableGenres } from './genres'

describe('isPresentableGenre', () => {
  it('accepts a genre that names music', () => {
    expect(isPresentableGenre('Post-punk')).toBe(true)
  })

  it('rejects the untagged bucket, whatever case it arrives in', () => {
    // This is the one that shipped: a Navidrome scan calls untagged tracks
    // "Unknown", the shuffle picked it, and Home read "Today's Unknown".
    expect(isPresentableGenre('Unknown')).toBe(false)
    expect(isPresentableGenre('unknown')).toBe(false)
    expect(isPresentableGenre('UNKNOWN GENRE')).toBe(false)
  })

  it('rejects catch-alls that say nothing about the music', () => {
    expect(isPresentableGenre('Other')).toBe(false)
    expect(isPresentableGenre('Misc')).toBe(false)
    expect(isPresentableGenre('Various')).toBe(false)
  })

  it('rejects whitespace and empties rather than heading a shelf with nothing', () => {
    expect(isPresentableGenre('')).toBe(false)
    expect(isPresentableGenre('   ')).toBe(false)
  })
})

describe('presentableGenres', () => {
  it('keeps real genres in the order given', () => {
    expect(presentableGenres(['Jazz', 'Ambient', 'Dub'])).toEqual(['Jazz', 'Ambient', 'Dub'])
  })

  it('drops placeholders from the pool the daily shuffle draws from', () => {
    expect(presentableGenres(['Unknown', 'Jazz', 'Other'])).toEqual(['Jazz'])
  })

  it('trims, so a padded tag is not mistaken for a different genre', () => {
    expect(presentableGenres(['  Jazz  '])).toEqual(['Jazz'])
  })

  it('folds case-variant duplicates, so one genre gets one day not three', () => {
    expect(presentableGenres(['Hip-Hop', 'hip-hop', 'HIP-HOP'])).toEqual(['Hip-Hop'])
  })

  it('is empty when a library has nothing but placeholders', () => {
    // The caller reads this as "no theme today" and draws untinted, rather
    // than heading the shelf with a bucket name.
    expect(presentableGenres(['Unknown', '', 'N/A'])).toEqual([])
  })
})
