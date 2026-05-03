import { DETAIL_STALE_MS, shouldRunDetailEnrichment } from './syncPolicy'

describe('shouldRunDetailEnrichment', () => {
  it('runs for a first sync', () => {
    expect(shouldRunDetailEnrichment({
      force: false,
      previousSyncAt: null,
      now: 1000,
    })).toBe(true)
  })

  it('runs for forced sync even when previous details are fresh', () => {
    expect(shouldRunDetailEnrichment({
      force: true,
      previousSyncAt: 1000,
      now: 1000 + 10,
    })).toBe(true)
  })

  it('uses the previous sync timestamp, not the just-written current timestamp', () => {
    expect(shouldRunDetailEnrichment({
      force: false,
      previousSyncAt: 1000,
      now: 1000 + DETAIL_STALE_MS,
    })).toBe(true)
  })

  it('skips when previous details are still fresh', () => {
    expect(shouldRunDetailEnrichment({
      force: false,
      previousSyncAt: 1000,
      now: 1000 + DETAIL_STALE_MS - 1,
    })).toBe(false)
  })
})
