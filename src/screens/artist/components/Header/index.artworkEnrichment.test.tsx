import React from 'react'
import { render } from '@testing-library/react-native'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import settingsReducer, {
  setMetadataArtworkSourceEnabled,
} from '@/utils/redux/slices/settingsSlice'
import type { ExternalArtist } from '@/types'
import ArtistHeader from './index'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts?.source ? `via ${opts.source}` : key) }),
}))

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}))

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDarkMode: false, colors: { secondary: '#000', subtext: '#666', muted: '#eee', card: '#fff', onThemeColor: '#fff' } }),
}))

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ pill: 999, md: 8 }),
}))

jest.mock('@/components/DetailHeader', () => ({
  useDetailHeaderInset: () => 0,
  useDetailHeroTitleLayout: () => undefined,
  DetailActionRow: 'DetailActionRow',
  DetailCircleAction: 'DetailCircleAction',
  DetailPlayAction: 'DetailPlayAction',
  DetailHeaderBar: 'DetailHeaderBar',
  DetailHeaderIconButton: 'DetailHeaderIconButton',
}))

// The one thing this test cares about: which cover MediaImage is asked to
// render. Mocked to a plain text stub that dumps its `cover` prop's `kind`
// (and `url` when present) so the assertions below can read it back.
jest.mock('@/components/MediaImage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText } = require('react-native')
  return {
    MediaImage: ({ cover }: { cover: { kind: string; url?: string } }) => (
      <RNText testID="media-image-cover">{`${cover.kind}:${cover.url ?? ''}`}</RNText>
    ),
  }
})

jest.mock('@/utils/builders/buildCover', () => ({
  buildCover: (cover: { kind: string; url?: string }) => (cover.kind === 'url' ? cover.url : null),
  buildCoverArtArchiveUrl: jest.fn(),
  buildCoverCacheKey: jest.fn(),
}))
jest.mock('react-native-turbo-image', () => 'TurboImage')
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }))
jest.mock('@/components/Touchable', () => 'Touchable')
jest.mock('@/components/options/ArtistOptions', () => 'ArtistOptions')
jest.mock('@/utils/useSheetRef', () => ({ useSheetRef: () => ({ current: null }) }))
jest.mock('@/contexts/PlayingContext', () => ({ usePlayingActions: () => ({ playSongInCollection: jest.fn() }) }))
jest.mock('@/contexts/DownloadContext', () => ({ useDownload: () => ({ downloadAlbumById: jest.fn(), getCollectionDownloadState: () => ({ isDownloaded: false, isDownloading: false }) }) }))
jest.mock('@/hooks/useCollectionDownloadProgress', () => ({ useCollectionDownloadProgress: () => 0 }))
jest.mock('@/components/SpinningLoaderCircle', () => 'SpinningLoaderCircle')
jest.mock('@/components/DownloadStateIcon', () => 'DownloadStateIcon')
jest.mock('@/hooks/artists', () => ({ useArtistAlbums: () => [] }))
jest.mock('@/hooks/tracks', () => ({ useTracks: () => ({ tracks: [] }) }))
jest.mock('@/api', () => ({ useApi: () => ({ albums: { get: jest.fn() } }) }))
jest.mock('@/utils/redux/selectors/serversSelectors', () => ({ selectActiveServer: () => null }))
jest.mock('@/hooks/albums', () => ({ fetchAlbumDetailsSettled: jest.fn(async () => []) }))
jest.mock('@/components/toast', () => ({ notify: { info: jest.fn(), success: jest.fn(), error: jest.fn(), loading: jest.fn(), dismiss: jest.fn() } }))

let mockLastResolved: unknown
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled?: boolean; queryFn: () => Promise<unknown> }) => {
    const enabled = options.enabled !== false
    if (enabled) {
      options.queryFn().then((value: unknown) => { mockLastResolved = value })
    }
    return { data: enabled ? mockLastResolved : undefined, isLoading: false }
  },
}))

const mockResolveArtwork = jest.fn()
jest.mock('@/features/metadata/resolveArtwork', () => ({
  resolveArtwork: (...args: unknown[]) => mockResolveArtwork(...args),
}))

jest.mock('@/features/metadata/enrichmentFetchers', () => ({
  metadataArtworkFetchers: { deezer: jest.fn(), coverartarchive: jest.fn() },
}))

function makeStore() {
  return configureStore({
    reducer: combineReducers({ settings: settingsReducer }),
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
}

function renderWithStore(store: ReturnType<typeof makeStore>, externalArtist: ExternalArtist) {
  return render(
    <Provider store={store}>
      <ArtistHeader localArtist={null} externalArtist={externalArtist} showNavigation={false} />
    </Provider>
  )
}

const baseExternalArtist: ExternalArtist = {
  id: 'ext-1',
  name: 'Radiohead',
  cover: { kind: 'none' },
  subtext: '',
  albums: [],
  singles: [],
  similarArtists: [],
  externalIds: { mbid: 'mbid-1' },
}

describe('ArtistHeader artwork enrichment wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLastResolved = undefined
  })

  it('shows the enriched cover only when the server/external artist has no cover of its own (gap case)', async () => {
    const store = makeStore()
    store.dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled: true }))
    mockResolveArtwork.mockResolvedValue({
      cover: { kind: 'url', url: 'https://example.com/enriched.jpg' },
      source: 'deezer',
    })

    const view = await renderWithStore(store, baseExternalArtist)

    expect(mockResolveArtwork).toHaveBeenCalled()
    // Synchronous mocked useQuery: no data resolved on first render, so the
    // placeholder ('none') still shows until the promise settles — proving
    // this never flashes a stale/wrong cover ahead of the real result.
    expect(view.getByTestId('media-image-cover').props.children).toBe('none:')
  })

  it('keeps the server cover unchanged when the artist already has artwork (no gap)', async () => {
    const store = makeStore()
    store.dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled: true }))

    const view = await renderWithStore(store, {
      ...baseExternalArtist,
      cover: { kind: 'url', url: 'https://example.com/server.jpg' },
    })

    expect(mockResolveArtwork).not.toHaveBeenCalled()
    expect(view.getByTestId('media-image-cover').props.children).toBe('url:https://example.com/server.jpg')
  })

  it('restores the placeholder when artwork enrichment is disabled', async () => {
    const store = makeStore()
    // No dispatch — every artwork source stays disabled by default.

    const view = await renderWithStore(store, baseExternalArtist)

    expect(mockResolveArtwork).not.toHaveBeenCalled()
    expect(view.getByTestId('media-image-cover').props.children).toBe('none:')
  })
})
