import {
  controlSize,
  hitSlopFor,
  listDensity,
  radius,
  scaleRadius,
  type ListDensity,
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

  it('keeps pill radii pill under every preset', () => {
    // A circular play button turning into a square is a bug, not a preset.
    expect(scaleRadius(radius.pill, 'sharp')).toBe(radius.pill)
    expect(scaleRadius(radius.pill, 'default')).toBe(radius.pill)
    expect(scaleRadius(radius.pill, 'rounded')).toBe(radius.pill)
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
  const roles = ['rowGap', 'rowPadding', 'trackRowPadding'] as const

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
