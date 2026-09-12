import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import GetReviewSheet from './GetReviewSheet';
import type { ExternalAlbumBase } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS-only test mock, no typed ESM export
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colors: { secondary: '#000', subtext: '#666', border: '#ccc', background: '#fff', placeholder: '#999' },
    isDarkMode: false,
  }),
}));

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ lg: 16, card: 8, pill: 999, pillFor: (n: number) => n / 2 }),
}));

jest.mock('@/components/BottomSheetBackdrop', () => ({
  renderBackdrop: () => null,
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

jest.mock('@/components/SpinningLoaderCircle', () => 'SpinningLoaderCircle');

jest.mock('@/components/options/OptionSheetPrimitives', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText, View: RNView } = require('react-native');
  return {
    OptionSheetHeader: ({ title, subtitle }: any) => (
      <RNView>
        <RNText>{title}</RNText>
        {subtitle !== undefined && <RNText>{subtitle}</RNText>}
      </RNView>
    ),
    // Row is keyed by testID so a provider row can be pressed unambiguously —
    // the visible label text is asserted separately.
    OptionSheetRow: ({ label, description, onPress, disabled, trailing }: any) => (
      <RNView>
        <RNText testID={`row-${label}`} onPress={onPress} disabled={disabled}>{label}</RNText>
        {description !== undefined && <RNText>{description}</RNText>}
        {trailing}
      </RNView>
    ),
    OptionSheetInfoRow: ({ label, value }: any) => <RNText>{label}: {value}</RNText>,
    OptionSheetSectionLabel: ({ label }: any) => <RNText>{label}</RNText>,
    OptionSheetDivider: () => <RNView />,
    optionSheetStyles: { sheetBackground: {}, sheetContent: {}, loading: {} },
    useOptionSheetBackground: () => ({}),
  };
});

const mockDispatch = jest.fn();
let mockState: any = {};

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(mockState),
  useDispatch: () => mockDispatch,
}));

jest.mock('@/utils/redux/selectors/serversSelectors', () => ({
  selectActiveServer: (state: any) => state.servers?.activeServer ?? null,
  selectActiveServerId: (state: any) => state.servers?.activeServerId ?? null,
}));

const mockIsWanted = jest.fn(() => false);
jest.mock('@/utils/redux/selectors/wantsSelectors', () => ({
  selectIsWanted: (_localId: string) => () => mockIsWanted(),
}));

jest.mock('@/utils/redux/slices/wantsSlice', () => ({
  setWantJobRef: (payload: any) => ({ type: 'wants/setWantJobRef', payload }),
}));

jest.mock('@/utils/redux/selectors/downloadersSelectors', () => ({
  selectDefaultProviderForActiveServer: (state: any) => state.downloaders?.defaultsByServer?.['server-1'] ?? {},
}));

jest.mock('@/utils/redux/slices/downloadersSlice', () => ({
  setDefaultProvider: (payload: any) => ({ type: 'downloaders/setDefaultProvider', payload }),
}));

const mockDownloaderStates = jest.fn();
jest.mock('@/features/downloaders/registry', () => ({
  downloadErrorKey: (id: string, code?: string) => `externalAlbum.download.errors.${id}.${code}`,
  useDownloaderStates: () => mockDownloaderStates(),
}));

const externalAlbum: ExternalAlbumBase = {
  id: 'ext1',
  title: 'External Album',
  cover: { kind: 'none' },
  artist: 'External Artist',
  subtext: 'External Artist',
  localId: 'local:album:ext:deezer:ext1' as ExternalAlbumBase['localId'],
};

const lidarrDownloadAlbum = jest.fn(async () => ({ success: true as const }));
const slskdDownloadAlbum = jest.fn(async () => ({ success: true as const }));

function makeDownloaderStates() {
  return [
    {
      def: {
        id: 'lidarr',
        label: 'Lidarr',
        descriptionKey: 'externalAlbum.download.lidarrDesc',
        albumAddedKey: 'externalAlbum.download.addedToLidarr',
        downloadAlbum: lidarrDownloadAlbum,
      },
      config: { serverUrl: 'http://lidarr', apiKey: 'k1' },
      isConnected: true,
    },
    {
      def: {
        id: 'slskd',
        label: 'Soulseek',
        descriptionKey: 'externalAlbum.download.slskdDesc',
        albumAddedKey: 'externalAlbum.download.addedToSlskd',
        trackAddedKey: 'externalAlbum.download.addedTrackToSlskd',
        downloadAlbum: slskdDownloadAlbum,
      },
      config: { serverUrl: 'http://slskd', apiKey: 'k2' },
      isConnected: true,
    },
  ];
}

describe('GetReviewSheet', () => {
  beforeEach(() => {
    mockDownloaderStates.mockReset().mockReturnValue(makeDownloaderStates());
    mockIsWanted.mockReset().mockReturnValue(false);
    mockDispatch.mockClear();
    lidarrDownloadAlbum.mockClear();
    slskdDownloadAlbum.mockClear();
    mockState = {
      servers: { activeServer: { id: 'server-1', serverUrl: 'My Server' }, activeServerId: 'server-1' },
      downloaders: { defaultsByServer: {} },
    };
  });

  it('renders the target server and every connected provider for the unit', async () => {
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);
    expect(view.getByText(/My Server/)).toBeTruthy();
    expect(view.getByText('Lidarr')).toBeTruthy();
    expect(view.getByText('Soulseek')).toBeTruthy();
  });

  it('shows a Requesting line with the title/artist being asked for', async () => {
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);
    expect(view.getByText(/External Album — External Artist/)).toBeTruthy();
  });

  it('does not preselect any provider and starts no job when there is no saved default', async () => {
    await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);
    // Nothing fires on mount — Get always needs an explicit tap on a provider
    // row first, saved default or not.
    expect(lidarrDownloadAlbum).not.toHaveBeenCalled();
    expect(slskdDownloadAlbum).not.toHaveBeenCalled();
  });

  it('preselects the saved default provider for the unit when it is still available', async () => {
    mockState.downloaders.defaultsByServer['server-1'] = { defaultAlbumProvider: 'slskd' };
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);
    // The preselected row means Get is already actionable without tapping a
    // row first — but the tap on Get is still required for the job to start.
    await fireEvent.press(view.getByText('externalAlbum.review.confirmGet'));
    await flush();
    expect(slskdDownloadAlbum).toHaveBeenCalledTimes(1);
    expect(lidarrDownloadAlbum).not.toHaveBeenCalled();
  });

  it('never starts a job before Get is tapped, even with a preselected default', async () => {
    mockState.downloaders.defaultsByServer['server-1'] = { defaultAlbumProvider: 'lidarr' };
    await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);
    expect(lidarrDownloadAlbum).not.toHaveBeenCalled();
    expect(slskdDownloadAlbum).not.toHaveBeenCalled();
  });

  it('tapping Get calls the selected provider and dismisses on success', async () => {
    // `ref={sheetRef}` on a class-component BottomSheetModal makes React
    // overwrite `sheetRef.current` with the real instance on mount, so the
    // dismiss spy has to be attached to that instance after render rather
    // than passed in pre-populated.
    const sheetRef = { current: null } as any;
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={sheetRef} />);
    const dismiss = jest.spyOn(sheetRef.current, 'dismiss');

    await fireEvent.press(view.getByTestId('row-Lidarr'));
    await fireEvent.press(view.getByText('externalAlbum.review.confirmGet'));
    await flush();

    expect(lidarrDownloadAlbum).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('does not persist a request-only provider choice unless "save as default" is toggled', async () => {
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);

    await fireEvent.press(view.getByTestId('row-Lidarr'));
    await fireEvent.press(view.getByText('externalAlbum.review.confirmGet'));
    await flush();

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'downloaders/setDefaultProvider' })
    );
  });

  it('persists the chosen provider as the unit default only when "save as default" is toggled', async () => {
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);

    await fireEvent.press(view.getByTestId('row-Lidarr'));
    await fireEvent.press(view.getByText('externalAlbum.review.saveAsDefaultAlbums'));
    await fireEvent.press(view.getByText('externalAlbum.review.confirmGet'));
    await flush();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'downloaders/setDefaultProvider',
      payload: { serverId: 'server-1', unit: 'album', provider: 'lidarr' },
    });
  });

  it('sets the wanted entity jobRef on a successful Get for a wanted item', async () => {
    mockIsWanted.mockReturnValue(true);
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);

    await fireEvent.press(view.getByTestId('row-Lidarr'));
    await fireEvent.press(view.getByText('externalAlbum.review.confirmGet'));
    await flush();

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'wants/setWantJobRef',
        payload: expect.objectContaining({ serverId: 'server-1', localId: externalAlbum.localId }),
      })
    );
  });

  it('does not touch the want when the entity is not wanted', async () => {
    mockIsWanted.mockReturnValue(false);
    const view = await render(<GetReviewSheet album={externalAlbum} sheetRef={{ current: null } as any} />);

    await fireEvent.press(view.getByTestId('row-Lidarr'));
    await fireEvent.press(view.getByText('externalAlbum.review.confirmGet'));
    await flush();

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'wants/setWantJobRef' })
    );
  });
});

/** Lets the pending `handleGet` promise chain settle before assertions run. */
async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}
