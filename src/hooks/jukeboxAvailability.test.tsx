import { renderHook, waitFor } from '@testing-library/react-native';

const mockApi: { jukebox?: { status: jest.Mock } } = {};

jest.mock('@/api', () => ({ useApi: () => mockApi }));

import { useJukeboxAvailability } from './useJukeboxAvailability';

/**
 * Subsonic's jukebox is granted per user: every Navidrome has the endpoint,
 * and it answers error 50 to a user without the role. Offering the row on
 * adapter presence alone would give most users one that errors when tapped.
 */
describe('jukebox availability', () => {
  beforeEach(() => { delete mockApi.jukebox; });

  it('is unavailable on a server whose adapter has no jukebox at all', async () => {
    const { result } = await renderHook(() => useJukeboxAvailability(true));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('is available when the server answers a status probe', async () => {
    mockApi.jukebox = { status: jest.fn(async () => ({ currentIndex: 0, playing: false, gain: 1, positionSeconds: 0 })) };
    const { result } = await renderHook(() => useJukeboxAvailability(true));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is unavailable when the user lacks the role — a refusal is a no, not an error', async () => {
    mockApi.jukebox = { status: jest.fn(async () => { throw new Error('Jukebox disabled'); }) };
    const { result } = await renderHook(() => useJukeboxAvailability(true));
    await waitFor(() => expect(result.current).toBe(false));
    expect(mockApi.jukebox.status).toHaveBeenCalled();
  });

  it('does not probe until something needs the answer', async () => {
    mockApi.jukebox = { status: jest.fn(async () => ({ currentIndex: 0, playing: false, gain: 1, positionSeconds: 0 })) };
    const { result } = await renderHook(() => useJukeboxAvailability(false));
    await waitFor(() => expect(result.current).toBe(false));
    expect(mockApi.jukebox.status).not.toHaveBeenCalled();
  });
});
