import { configureStore, combineReducers } from '@reduxjs/toolkit'
import settingsReducer, { setScrobbleRoute } from '@/utils/redux/slices/settingsSlice'
import serversReducer, { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice'
import listenbrainzReducer, { setScrobbleEnabled } from '@/utils/redux/slices/listenbrainzSlice'
import {
  deriveScrobbleRoute,
  selectLastfmScrobbleRoute,
  selectListenBrainzScrobbleRoute,
} from './scrobbleRoutingSelectors'
import type { Server } from '@/types'

function makeStore() {
  return configureStore({
    reducer: combineReducers({
      settings: settingsReducer,
      servers: serversReducer,
      listenbrainz: listenbrainzReducer,
    }),
  })
}

const server: Server = {
  id: 'srv-1',
  type: 'navidrome',
  serverUrl: 'https://media.example',
  username: 'ari',
  auth: { password: 'pw' },
  isAuthenticated: true,
}

describe('deriveScrobbleRoute — no-migration default from today\'s booleans', () => {
  it('lastfm: server scrobble on maps to through-server', () => {
    expect(deriveScrobbleRoute('lastfm', true, false)).toBe('through-server')
  })
  it('lastfm: server scrobble off maps to disabled, never direct', () => {
    expect(deriveScrobbleRoute('lastfm', false, true)).toBe('disabled')
    expect(deriveScrobbleRoute('lastfm', false, false)).toBe('disabled')
  })
  it('listenbrainz: its own scrobble toggle on wins as direct', () => {
    expect(deriveScrobbleRoute('listenbrainz', true, true)).toBe('direct')
    expect(deriveScrobbleRoute('listenbrainz', false, true)).toBe('direct')
  })
  it('listenbrainz: server scrobble on, LB own toggle off maps to through-server', () => {
    expect(deriveScrobbleRoute('listenbrainz', true, false)).toBe('through-server')
  })
  it('listenbrainz: both off maps to disabled', () => {
    expect(deriveScrobbleRoute('listenbrainz', false, false)).toBe('disabled')
  })
})

function stateOf(store: ReturnType<typeof makeStore>) {
  return store.getState() as unknown as import('@/utils/redux/store').RootState
}

describe('scrobble route selectors — persistence and defaults, per server/destination', () => {
  it('derives lastfm route from serverScrobbleEnabled default when nothing stored', () => {
    const store = makeStore()
    store.dispatch(addServer(server))
    store.dispatch(setActiveServer(server.id))
    // Default serverScrobbleEnabled is true.
    expect(selectLastfmScrobbleRoute(stateOf(store))).toBe('through-server')
  })

  it('derives listenbrainz route from its own per-server boolean default (off) as through-server', () => {
    const store = makeStore()
    store.dispatch(addServer(server))
    store.dispatch(setActiveServer(server.id))
    expect(selectListenBrainzScrobbleRoute(stateOf(store))).toBe('through-server')
  })

  it('an explicit stored route always wins over the derived default', () => {
    const store = makeStore()
    store.dispatch(addServer(server))
    store.dispatch(setActiveServer(server.id))
    store.dispatch(setScrobbleRoute({ serverId: server.id, destination: 'listenbrainz', route: 'direct' }))
    expect(selectListenBrainzScrobbleRoute(stateOf(store))).toBe('direct')

    store.dispatch(setScrobbleRoute({ serverId: server.id, destination: 'lastfm', route: 'disabled' }))
    expect(selectLastfmScrobbleRoute(stateOf(store))).toBe('disabled')
  })

  it('a route is scoped per server — a route set for one server does not leak to another', () => {
    const store = makeStore()
    const server2: Server = { ...server, id: 'srv-2' }
    store.dispatch(addServer(server))
    store.dispatch(addServer(server2))
    store.dispatch(setActiveServer(server.id))
    store.dispatch(setScrobbleRoute({ serverId: server.id, destination: 'listenbrainz', route: 'direct' }))

    expect(selectListenBrainzScrobbleRoute(stateOf(store))).toBe('direct')

    store.dispatch(setActiveServer(server2.id))
    // server2 has no stored route and no legacy LB boolean set — derives to
    // through-server via the still-true serverScrobbleEnabled default.
    expect(selectListenBrainzScrobbleRoute(stateOf(store))).toBe('through-server')
  })

  it('setting one destination does not affect the other for the same server', () => {
    const store = makeStore()
    store.dispatch(addServer(server))
    store.dispatch(setActiveServer(server.id))
    store.dispatch(setScrobbleRoute({ serverId: server.id, destination: 'listenbrainz', route: 'direct' }))

    // lastfm still derives from the untouched serverScrobbleEnabled default.
    expect(selectLastfmScrobbleRoute(stateOf(store))).toBe('through-server')
  })

  it('legacy per-server ListenBrainz scrobbleEnabled=true still derives to direct with no stored route', () => {
    const store = makeStore()
    store.dispatch(addServer(server))
    store.dispatch(setActiveServer(server.id))
    store.dispatch(setScrobbleEnabled({ serverId: server.id, value: true }))
    expect(selectListenBrainzScrobbleRoute(stateOf(store))).toBe('direct')
  })
})
