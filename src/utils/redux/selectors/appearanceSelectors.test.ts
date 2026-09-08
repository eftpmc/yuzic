import type { RootState } from '@/utils/redux/store'
import {
  selectCoverAccentEnabled,
  selectListDensity,
  selectRadiusPreset,
} from './settingsSelectors'

/**
 * The appearance settings all read through a fallback rather than straight off
 * the persisted object, because a user upgrading has a settings blob written
 * before the key existed. Reading through gives them `undefined` — a list with
 * `marginBottom: undefined` and a screen with no accent — which looks like the
 * upgrade broke the app rather than like a setting they have not chosen yet.
 */
function stateWith(settings: Record<string, unknown>): RootState {
  return { settings } as unknown as RootState
}

describe('appearance selectors on a pre-upgrade settings object', () => {
  const empty = stateWith({})

  it('falls back to the shipped default for each', () => {
    expect(selectRadiusPreset(empty)).toBe('default')
    expect(selectListDensity(empty)).toBe('default')
    expect(selectCoverAccentEnabled(empty)).toBe(true)
  })

  it('returns what the user chose once they have chosen it', () => {
    const chosen = stateWith({
      radiusPreset: 'rounded',
      listDensity: 'compact',
      coverAccentEnabled: false,
    })
    expect(selectRadiusPreset(chosen)).toBe('rounded')
    expect(selectListDensity(chosen)).toBe('compact')
    expect(selectCoverAccentEnabled(chosen)).toBe(false)
  })

  it('keeps a stored `false` off rather than defaulting it back on', () => {
    // `??` and `||` differ exactly here, and the toggle that will not stay off
    // is the bug this guards.
    expect(selectCoverAccentEnabled(stateWith({ coverAccentEnabled: false }))).toBe(false)
  })
})
