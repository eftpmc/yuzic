import { createAccentCache, darken, pickAccent } from './coverAccent'

const FALLBACK = '#121212'

describe('pickAccent', () => {
  it('prefers a dark vibrant swatch on Android', () => {
    expect(pickAccent(
      { platform: 'android', dominant: '#111111', darkVibrant: '#223344' } as any,
      FALLBACK
    )).toBe('#223344')
  })

  it('falls back through the Android palette rather than to the default', () => {
    expect(pickAccent(
      { platform: 'android', dominant: '#111111', darkVibrant: undefined } as any,
      FALLBACK
    )).toBe('#111111')
  })

  it('uses the primary colour on iOS', () => {
    expect(pickAccent(
      { platform: 'ios', primary: '#445566', background: '#778899' } as any,
      FALLBACK
    )).toBe('#445566')
  })

  it('returns the fallback when a platform gives nothing usable', () => {
    expect(pickAccent({ platform: 'ios' } as any, FALLBACK)).toBe(FALLBACK)
    expect(pickAccent({ platform: 'web' } as any, FALLBACK)).toBe(FALLBACK)
  })
})

describe('darken', () => {
  it('moves a colour towards black', () => {
    expect(darken('#ffffff', 0.5)).toBe('#7f7f7f')
  })

  it('expands shorthand hex', () => {
    expect(darken('#fff', 0.5)).toBe('#7f7f7f')
  })

  it('leaves black alone', () => {
    expect(darken('#000000', 0.5)).toBe('#000000')
  })

  it('keeps every channel in range', () => {
    expect(darken('#ffffff', 2)).toBe('#000000')
    expect(darken('#ffffff', 0)).toBe('#ffffff')
  })

  it('returns anything it cannot parse untouched', () => {
    // Extraction can hand back rgba() or a named colour on some platforms.
    expect(darken('rgba(1,2,3,0.5)')).toBe('rgba(1,2,3,0.5)')
  })
})

describe('createAccentCache', () => {
  it('returns what it was given', () => {
    const cache = createAccentCache<string>(4)
    cache.set('a', 'red')
    expect(cache.get('a')).toBe('red')
  })

  it('misses on a key it never saw', () => {
    expect(createAccentCache<string>(4).get('nope')).toBeUndefined()
  })

  it('evicts the oldest rather than growing without bound', () => {
    const cache = createAccentCache<string>(2)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    expect(cache.size).toBe(2)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('c')).toBe('3')
  })
})
