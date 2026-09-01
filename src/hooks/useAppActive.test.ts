import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAppActive } from './useAppActive';

type Listener = (state: string) => void;

describe('useAppActive', () => {
  let listeners: Listener[] = [];
  let remove: jest.Mock;

  beforeEach(() => {
    listeners = [];
    remove = jest.fn();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(((_event: string, listener: Listener) => {
        listeners.push(listener);
        return { remove } as any;
      }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function emit(state: string) {
    listeners.forEach((listener) => listener(state));
  }

  it('starts active when the app is already foregrounded', async () => {
    (AppState as any).currentState = 'active';

    const { result } = await renderHook(() => useAppActive());

    expect(result.current).toBe(true);
  });

  it('starts inactive when the app is backgrounded', async () => {
    (AppState as any).currentState = 'background';

    const { result } = await renderHook(() => useAppActive());

    expect(result.current).toBe(false);
  });

  it('goes false on background and true again on foreground', async () => {
    (AppState as any).currentState = 'active';
    const { result } = await renderHook(() => useAppActive());

    await act(async () => emit('background'));
    expect(result.current).toBe(false);

    await act(async () => emit('active'));
    expect(result.current).toBe(true);
  });

  it('treats inactive (iOS app switcher) as not active', async () => {
    (AppState as any).currentState = 'active';
    const { result } = await renderHook(() => useAppActive());

    await act(async () => emit('inactive'));

    expect(result.current).toBe(false);
  });

  it('unsubscribes on unmount', async () => {
    (AppState as any).currentState = 'active';
    const { unmount } = await renderHook(() => useAppActive());

    await unmount();

    expect(remove).toHaveBeenCalled();
  });
});
