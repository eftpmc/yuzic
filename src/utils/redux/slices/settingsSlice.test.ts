import reducer, {
  setCrossfadeDurationSeconds,
  setCrossfadeEnabled,
} from './settingsSlice'
import { selectCrossfadeDurationSeconds } from '../selectors/settingsSelectors'

describe('settingsSlice crossfade settings', () => {
  it('keeps crossfade disabled by default with a three second duration', () => {
    const state = reducer(undefined, { type: 'settings/init' })

    expect(state.crossfadeEnabled).toBe(false)
    expect(state.crossfadeDurationSeconds).toBe(3)
  })

  it('stores crossfade duration as an integer between one and twelve seconds', () => {
    const tooLow = reducer(undefined, setCrossfadeDurationSeconds(-4))
    expect(tooLow.crossfadeDurationSeconds).toBe(1)

    const rounded = reducer(undefined, setCrossfadeDurationSeconds(7.6))
    expect(rounded.crossfadeDurationSeconds).toBe(8)

    const tooHigh = reducer(undefined, setCrossfadeDurationSeconds(20))
    expect(tooHigh.crossfadeDurationSeconds).toBe(12)

    const invalid = reducer(undefined, setCrossfadeDurationSeconds(Number.NaN))
    expect(invalid.crossfadeDurationSeconds).toBe(3)
  })

  it('toggles crossfade independently from the selected duration', () => {
    const withDuration = reducer(undefined, setCrossfadeDurationSeconds(9))
    const enabled = reducer(withDuration, setCrossfadeEnabled(true))

    expect(enabled.crossfadeEnabled).toBe(true)
    expect(enabled.crossfadeDurationSeconds).toBe(9)
  })

  it('normalizes persisted crossfade duration values when reading settings', () => {
    expect(selectCrossfadeDurationSeconds({
      settings: { crossfadeDurationSeconds: 99 },
    } as any)).toBe(12)

    expect(selectCrossfadeDurationSeconds({
      settings: { crossfadeDurationSeconds: 0 },
    } as any)).toBe(1)
  })
})
