import type { RootState } from '@/utils/redux/store'
import {
  selectEnabledSearchSourceIds,
  selectSearchSourceEnabled,
} from './settingsSelectors'

function stateWith(settings: Record<string, unknown>): RootState {
  return { settings } as unknown as RootState
}

describe('selectSearchSourceEnabled', () => {
  it('is off by default for every source — enabling nothing without being asked', () => {
    const empty = stateWith({})
    expect(selectSearchSourceEnabled('deezer')(empty)).toBe(false)
    expect(selectSearchSourceEnabled('musicbrainz')(empty)).toBe(false)
  })

  it('reads the unified map once a source has an explicit entry', () => {
    const state = stateWith({ searchSourcesEnabled: { deezer: true, musicbrainz: false } })
    expect(selectSearchSourceEnabled('deezer')(state)).toBe(true)
    expect(selectSearchSourceEnabled('musicbrainz')(state)).toBe(false)
  })

  it('reconciles Deezer with the older deezerSearchEnabled flag when the map has no entry — no migration needed', () => {
    const legacy = stateWith({ deezerSearchEnabled: true })
    expect(selectSearchSourceEnabled('deezer')(legacy)).toBe(true)
  })

  it('an explicit map entry overrides the legacy flag once the user has touched the new setting', () => {
    const state = stateWith({ deezerSearchEnabled: true, searchSourcesEnabled: { deezer: false } })
    expect(selectSearchSourceEnabled('deezer')(state)).toBe(false)
  })

  it('musicbrainz has no legacy flag to fall back to — just off until asked for', () => {
    expect(selectSearchSourceEnabled('musicbrainz')(stateWith({}))).toBe(false)
  })
})

describe('selectEnabledSearchSourceIds', () => {
  it('is empty by default — search enablement is independent of Home and starts off', () => {
    expect(selectEnabledSearchSourceIds(stateWith({}))).toEqual([])
  })

  it('is independent of Home/discovery enablement', () => {
    // Every Home/discovery flag turned on, nothing in the search map.
    const state = stateWith({
      deezerDiscoveryEnabled: true,
      deezerExternalEnabled: true,
      musicbrainzExternalEnabled: true,
    })
    expect(selectEnabledSearchSourceIds(state)).toEqual([])
  })

  it('includes exactly the sources explicitly enabled for search', () => {
    const state = stateWith({ searchSourcesEnabled: { deezer: true, musicbrainz: true } })
    expect(selectEnabledSearchSourceIds(state).sort()).toEqual(['deezer', 'musicbrainz'])
  })

  it('honors the legacy deezerSearchEnabled flag with no explicit map entry', () => {
    const state = stateWith({ deezerSearchEnabled: true })
    expect(selectEnabledSearchSourceIds(state)).toEqual(['deezer'])
  })
})
