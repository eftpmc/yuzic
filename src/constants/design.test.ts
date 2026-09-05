import {
  controlSize,
  hitSlopFor,
  listDensity,
  radius,
  scaleRadius,
  withScaledLeading,
  type ListDensity,
  type RadiusPreset,
} from './design'

describe('hitSlopFor', () => {
  it('makes up the difference on a control drawn below the minimum', () => {
    const slop = hitSlopFor(32)
    expect(slop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 })
    // 32 + 6 + 6 clears 44 with a point to spare.
    expect(32 + slop!.top + slop!.bottom).toBeGreaterThanOrEqual(controlSize.minimumTarget)
  })

  it('rounds up rather than landing a point short', () => {
    // An odd shortfall halves to a fraction; floor would leave the target small.
    const slop = hitSlopFor(35)
    expect(35 + slop!.top + slop!.bottom).toBeGreaterThanOrEqual(controlSize.minimumTarget)
  })

  it('clears the minimum for every size below it', () => {
    for (let size = 1; size < controlSize.minimumTarget; size++) {
      const slop = hitSlopFor(size)!
      expect(size + slop.top + slop.bottom).toBeGreaterThanOrEqual(controlSize.minimumTarget)
    }
  })

  it('adds nothing to a control that is already big enough', () => {
    expect(hitSlopFor(controlSize.minimumTarget)).toBeUndefined()
    expect(hitSlopFor(64)).toBeUndefined()
  })
})

describe('scaleRadius', () => {
  it('softens rather than flattens under the sharp preset', () => {
    // The point of "sharp" is a near-square with a gentle round, not a razor
    // corner — a bare 0 made cards look broken.
    expect(scaleRadius(radius.card, 'sharp')).toBeGreaterThan(0)
    expect(scaleRadius(radius.card, 'sharp')).toBeLessThan(radius.card)
    // Even the smallest step keeps a point of curve, so a corner is never
    // exactly square when the preset asked for "soft square".
    expect(scaleRadius(radius.xs, 'sharp')).toBeGreaterThanOrEqual(1)
  })

  it('keeps the pill token pill under every preset', () => {
    // `radius.pill` is now only for the things whose roundness is what they
    // *are* — an avatar, a status dot, a progress track. A squared status dot
    // is a different component, not a sharper one. Controls that merely happen
    // to be drawn round scale through `pillFor` instead.
    expect(scaleRadius(radius.pill, 'sharp')).toBe(radius.pill)
    expect(scaleRadius(radius.pill, 'default')).toBe(radius.pill)
    expect(scaleRadius(radius.pill, 'rounded')).toBe(radius.pill)
  })

  describe('a control drawn as a pill, scaled by half its height', () => {
    // What `pillFor(size)` computes. The detail screens' play pill is 48 tall
    // and the circles beside it are 40.
    const pillFor = (size: number, preset: RadiusPreset) => scaleRadius(size / 2, preset)

    it.each([controlSize.detailPrimaryHeight, controlSize.detailSecondary, controlSize.playerPrimary])(
      'stays exactly round at the default preset: %ipt',
      size => {
        expect(pillFor(size, 'default')).toBe(size / 2)
      },
    )

    it('stays round under rounded, where React Native clamps at half', () => {
      // Overshooting half is not a bug — RN clamps borderRadius to half the
      // shorter side, so the button is still a pill rather than a broken one.
      const size = controlSize.detailPrimaryHeight
      expect(pillFor(size, 'rounded')).toBeGreaterThanOrEqual(size / 2)
    })

    it('squares off under sharp, along with the cards around it', () => {
      // The whole point: a play button that stayed a perfect circle while every
      // surface behind it went near-square read as the preset half-applying.
      const size = controlSize.detailPrimaryHeight
      expect(pillFor(size, 'sharp')).toBeLessThan(size / 2)
      expect(pillFor(size, 'sharp')).toBeGreaterThan(0)
    })
  })

  it('leaves the default preset at the base value', () => {
    expect(scaleRadius(radius.card, 'default')).toBe(radius.card)
  })

  it('moves row artwork with the preset', () => {
    // `thumb` is the cover beside a track, a playlist, a search result — the
    // most repeated shape in the app. It held still while the cards around it
    // moved, which read as the preset half-applying.
    expect(scaleRadius(radius.thumb, 'sharp')).toBeLessThan(radius.thumb)
    expect(scaleRadius(radius.thumb, 'rounded')).toBeGreaterThan(radius.thumb)
    expect(scaleRadius(radius.thumb, 'default')).toBe(radius.thumb)
  })

  it('rounds the rounded preset larger than the default', () => {
    expect(scaleRadius(radius.card, 'rounded')).toBeGreaterThan(radius.card)
  })
})

describe('listDensity', () => {
  const order: ListDensity[] = ['compact', 'default', 'spacious']
  const roles = ['rowGap', 'rowPadding', 'trackRowPadding', 'libraryRowPadding'] as const

  it.each(roles)('gets roomier in the direction the labels promise: %s', role => {
    const steps = order.map(density => listDensity[density][role])
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    // Not merely non-decreasing: three names that render the same list twice
    // would be three answers to a question the user thinks they answered.
    expect(new Set(steps).size).toBe(order.length)
  })

  it('leaves a row its air even at the tightest setting', () => {
    // Zero would run one row's artwork into the next, which reads as a
    // rendering bug rather than as a dense list.
    roles.forEach(role => {
      expect(listDensity.compact[role]).toBeGreaterThan(0)
    })
  })

  it('keeps the library tighter than the rest of the app at every density', () => {
    // The library draws 52pt artwork where a media row draws 64, so its rows
    // are meant to sit closer. Folding it onto `rowPadding` would have
    // loosened every collection list the moment the setting shipped.
    order.forEach(density => {
      expect(listDensity[density].libraryRowPadding).toBeLessThanOrEqual(
        listDensity[density].trackRowPadding
      )
    })
  })

  it('gives a track row the extra step a whole record needs', () => {
    // A list of nineteen tracks wants more air per row than a sheet with three
    // options in it, at every density rather than only at the default.
    order.forEach(density => {
      expect(listDensity[density].trackRowPadding).toBeGreaterThan(
        listDensity[density].rowPadding
      )
    })
  })
})

describe('withScaledLeading', () => {
  // A role of each shape: one with a weight to carry through, one without.
  const scale = {
    title: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
    body: { fontSize: 16, lineHeight: 21 },
  }

  it('leaves the scale exactly alone at the default text size', () => {
    expect(withScaledLeading(scale, 1)).toEqual(scale)
  })

  it('grows the leading by the factor the platform grows the size by', () => {
    // The bug this exists for: at 3x a 20/25 role renders at 60pt inside a
    // 25pt line and is sliced off top and bottom. It needs a 75pt line.
    expect(withScaledLeading(scale, 3).title.lineHeight).toBe(75)
    expect(withScaledLeading(scale, 3).body.lineHeight).toBe(63)
  })

  it('never touches fontSize — React Native applies the scale to that itself', () => {
    // Pre-scaling the size here as well would double it.
    const scaled = withScaledLeading(scale, 2)
    expect(scaled.title.fontSize).toBe(20)
    expect(scaled.body.fontSize).toBe(16)
  })

  it('carries the rest of a role through untouched', () => {
    expect(withScaledLeading(scale, 2).title.fontWeight).toBe('600')
  })

  it('rounds to whole points, since a fractional line is a blurry one', () => {
    expect(withScaledLeading(scale, 1.15).title.lineHeight).toBe(29)
  })

  it('follows the smaller text sizes down too', () => {
    expect(withScaledLeading(scale, 0.8).title.lineHeight).toBe(20)
  })

  it('keeps every role in the scale', () => {
    expect(Object.keys(withScaledLeading(scale, 2))).toEqual(Object.keys(scale))
  })
})
