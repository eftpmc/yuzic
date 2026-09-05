import {
  ACCENT_WASH_LOCATIONS,
  accentWashColors,
  createAccentCache,
  darken,
  pickAccent,
  toWashAccent,
  vividness,
  withAlpha,
} from './coverAccent'

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

describe('withAlpha', () => {
  it('keeps the hue and moves only the opacity', () => {
    expect(withAlpha('#3366ff', 0.5)).toBe('rgba(51, 102, 255, 0.5)')
  })

  it('fades to the colour itself rather than to transparent black', () => {
    expect(withAlpha('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)')
  })

  it('expands shorthand hex and clamps out-of-range alpha', () => {
    expect(withAlpha('#fff', 2)).toBe('rgba(255, 255, 255, 1)')
    expect(withAlpha('#fff', -1)).toBe('rgba(255, 255, 255, 0)')
  })

  it('leaves a value it cannot parse alone', () => {
    expect(withAlpha('rebeccapurple', 0.5)).toBe('rebeccapurple')
  })
})

describe('accentWashColors', () => {
  it('gives every stop a location', () => {
    expect(accentWashColors('#3366ff')).toHaveLength(ACCENT_WASH_LOCATIONS.length)
  })

  it('ends fully transparent so the wash has somewhere to stop', () => {
    const stops = accentWashColors('#3366ff')
    expect(stops[0]).toBe('rgba(51, 102, 255, 1)')
    expect(stops[stops.length - 1]).toBe('rgba(51, 102, 255, 0)')
  })
})

describe('vividness', () => {
  it('scores a saturated mid-tone above a muted one', () => {
    expect(vividness('#e0245e')).toBeGreaterThan(vividness('#8a7f72'))
  })

  it('scores grey at zero however light it is', () => {
    expect(vividness('#808080')).toBe(0)
    expect(vividness('#000000')).toBe(0)
    expect(vividness('#ffffff')).toBe(0)
  })

  it('discounts a hue that is nearly black or nearly white', () => {
    // Both are technically fully saturated red; only one of them looks red.
    expect(vividness('#ff0000')).toBeGreaterThan(vividness('#0a0000'))
    expect(vividness('#ff0000')).toBeGreaterThan(vividness('#fff5f5'))
  })

  it('scores anything it cannot parse at zero', () => {
    expect(vividness('rebeccapurple')).toBe(0)
  })
})

describe('pickAccent, choosing by colour rather than by rank', () => {
  it('passes over a muddy iOS primary for a swatch with real colour in it', () => {
    // The exact case the covers kept landing on: the commonest colour in the
    // image is a brown, and the record's actual colour is somewhere else.
    expect(pickAccent(
      { platform: 'ios', primary: '#6b5a45', secondary: '#1e88e5', background: '#2b2b2b' } as any,
      FALLBACK
    )).toBe('#1e88e5')
  })

  it('prefers a vibrant swatch over the dominant one on Android', () => {
    expect(pickAccent(
      { platform: 'android', dominant: '#6b5a45', vibrant: '#d81b60' } as any,
      FALLBACK
    )).toBe('#d81b60')
  })

  it('keeps a genuinely monochrome cover monochrome', () => {
    expect(pickAccent(
      { platform: 'ios', primary: '#3a3a3a', secondary: '#5c5c5c', background: '#111111' } as any,
      FALLBACK
    )).toBe('#3a3a3a')
  })
})

describe('toWashAccent', () => {
  it('keeps the hue it was given', () => {
    // A blue swatch stays blue: blue is the channel that stays largest.
    const washed = toWashAccent('#4a6fa5')
    const [r, g, b] = [1, 3, 5].map(i => parseInt(washed.slice(i, i + 2), 16))
    expect(b).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(r)
  })

  it('lands in the band that stays readable under white text', () => {
    for (const hex of ['#ff2d55', '#0a1f0a', '#f5c542', '#4a6fa5']) {
      const washed = toWashAccent(hex)
      const [r, g, b] = [1, 3, 5].map(i => parseInt(washed.slice(i, i + 2), 16))
      const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255
      expect(lightness).toBeGreaterThanOrEqual(0.15)
      expect(lightness).toBeLessThanOrEqual(0.33)
    }
  })

  it('lifts a washed-out swatch instead of dimming it further', () => {
    // The old behaviour darkened everything, taking the little colour a muted
    // swatch had with it.
    expect(vividness(toWashAccent('#8a7f72'))).toBeGreaterThan(vividness(darken('#8a7f72')))
  })

  it('leaves a grey cover grey rather than inventing a hue for it', () => {
    expect(toWashAccent('#808080')).toBe(darken('#808080'))
  })

  it('returns anything it cannot parse untouched', () => {
    expect(toWashAccent('rebeccapurple')).toBe('rebeccapurple')
  })
})
