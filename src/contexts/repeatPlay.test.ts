import { isRepeatLoop } from './repeatPlay'

const probe = (overrides: Partial<Parameters<typeof isRepeatLoop>[0]> = {}) => ({
  isLooping: true,
  previousPosition: 175,
  currentPosition: 1,
  duration: 180,
  ...overrides,
})

describe('isRepeatLoop', () => {
  it('sees a track that reached the end and started over', () => {
    // The case that shipped broken: a track left on repeat recorded one play
    // however many times it went round.
    expect(isRepeatLoop(probe())).toBe(true)
  })

  it('ignores ordinary forward playback', () => {
    expect(isRepeatLoop(probe({ previousPosition: 40, currentPosition: 50 }))).toBe(false)
  })

  it('ignores everything when the queue is not looping one item', () => {
    // A multi-track queue advances by changing media item, which is already
    // where its listens are recorded — counting here too would double them.
    expect(isRepeatLoop(probe({ isLooping: false }))).toBe(false)
  })

  it('ignores a jump back that does not reach the start', () => {
    // Skipping back to re-hear a chorus is not the track starting over.
    expect(isRepeatLoop(probe({ previousPosition: 170, currentPosition: 90 }))).toBe(false)
  })

  it('ignores a restart from a pass too short to be a listen', () => {
    // Scrubbing around the first minute of a track and landing back at zero.
    expect(isRepeatLoop(probe({ previousPosition: 30, currentPosition: 0 }))).toBe(false)
  })

  it('counts a pass that got exactly halfway', () => {
    expect(isRepeatLoop(probe({ previousPosition: 90, currentPosition: 0 }))).toBe(true)
  })

  it('gives up when the duration is unknown, rather than guessing', () => {
    // Live streams and unparsed durations report 0; there is no "near the end"
    // without a length to be near the end of.
    expect(isRepeatLoop(probe({ duration: 0 }))).toBe(false)
  })

  it('does not fire on the first tick, when there is no previous position', () => {
    expect(isRepeatLoop(probe({ previousPosition: 0, currentPosition: 0 }))).toBe(false)
  })
})
