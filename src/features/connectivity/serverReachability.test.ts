import {
  getServerUnreachable,
  isLikelyNetworkError,
  setServerUnreachable,
} from './serverReachability'

afterEach(() => {
  setServerUnreachable(false)
})

describe('server reachability store', () => {
  it('starts reachable and toggles', () => {
    expect(getServerUnreachable()).toBe(false)
    setServerUnreachable(true)
    expect(getServerUnreachable()).toBe(true)
    setServerUnreachable(false)
    expect(getServerUnreachable()).toBe(false)
  })
})

describe('isLikelyNetworkError', () => {
  it('matches fetch-level failures', () => {
    expect(isLikelyNetworkError(new TypeError('Network request failed'))).toBe(true)
    expect(isLikelyNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    const abort = new Error('Aborted')
    abort.name = 'AbortError'
    expect(isLikelyNetworkError(abort)).toBe(true)
  })

  it('does not match HTTP errors — the server responded, it is reachable', () => {
    expect(isLikelyNetworkError(new Error('Navidrome API error (500): boom'))).toBe(false)
    expect(isLikelyNetworkError(new Error('Navidrome API error (401): unauthorized'))).toBe(false)
  })

  it('ignores non-error values', () => {
    expect(isLikelyNetworkError('Network request failed')).toBe(false)
    expect(isLikelyNetworkError(undefined)).toBe(false)
  })
})
