import { describeModule, moduleFillsSlot, IntegrationModule } from '../types'

function fixtureModule(overrides: Partial<IntegrationModule> = {}): IntegrationModule {
  return {
    id: 'slskd',
    label: 'Soulseek',
    auth: { tier: 'apiKey', configKeys: ['serverUrl', 'apiKey'] },
    slots: {
      'acquisition.track': {},
      'acquisition.album': {},
    },
    testConnection: async () => ({ ok: true }),
    ...overrides,
  }
}

describe('describeModule', () => {
  it('lists the slots a module fills and its auth tier', () => {
    const module = fixtureModule()

    expect(describeModule(module)).toEqual({
      id: 'slskd',
      label: 'Soulseek',
      slots: ['acquisition.track', 'acquisition.album'],
      authTier: 'apiKey',
    })
  })

  it('omits slots explicitly set to undefined', () => {
    const module = fixtureModule({
      slots: {
        'acquisition.track': {},
        'acquisition.album': undefined,
      },
    })

    expect(describeModule(module).slots).toEqual(['acquisition.track'])
  })

  it('reports an empty slot list and none-tier auth for a plain metadata module', () => {
    const module = fixtureModule({
      id: 'musicbrainz',
      label: 'MusicBrainz',
      auth: { tier: 'none' },
      slots: { resolution: {} },
    })

    expect(describeModule(module)).toEqual({
      id: 'musicbrainz',
      label: 'MusicBrainz',
      slots: ['resolution'],
      authTier: 'none',
    })
  })

  it('reports account tier for a module using signed sessions', () => {
    const module = fixtureModule({
      id: 'lastfm',
      label: 'Last.fm',
      auth: { tier: 'account' },
      slots: { scrobble: {}, 'similarity.artists': {} },
    })

    expect(describeModule(module).authTier).toBe('account')
    expect(describeModule(module).slots.sort()).toEqual(['scrobble', 'similarity.artists'].sort())
  })
})

describe('moduleFillsSlot', () => {
  it('is true for a slot the module declares', () => {
    const module = fixtureModule()
    expect(moduleFillsSlot(module, 'acquisition.track')).toBe(true)
  })

  it('is false for a slot the module does not declare', () => {
    const module = fixtureModule()
    expect(moduleFillsSlot(module, 'lyrics')).toBe(false)
  })

  it('is false for a slot explicitly set to undefined', () => {
    const module = fixtureModule({
      slots: { 'acquisition.track': {}, 'acquisition.album': undefined },
    })
    expect(moduleFillsSlot(module, 'acquisition.album')).toBe(false)
  })
})
