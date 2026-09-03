import { controlSize, hitSlopFor } from './design'

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
