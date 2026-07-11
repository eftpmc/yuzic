import { renderHook, act } from '@testing-library/react-native';
import { usePollWhile } from './usePollWhile';

describe('usePollWhile', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not tick while inactive', async () => {
    // Regression: OfflineMutationReplayer scheduled a nextRetryAt backoff but
    // nothing ever re-checked it once the deadline passed — the surrounding
    // effect only re-ran on unrelated state changes, never on time alone.
    // This proves inactive polling truly runs no timer at all.
    const { result } = await renderHook(() => usePollWhile(false, 1000));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current).toBe(0);
  });

  it('ticks on the given interval while active', async () => {
    const { result } = await renderHook(() => usePollWhile(true, 1000));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3_500);
    });

    expect(result.current).toBe(3);
  });

  it('stops ticking once deactivated', async () => {
    const { result, rerender } = await renderHook(
      ({ active }: { active: boolean }) => usePollWhile(active, 1000),
      { initialProps: { active: true } }
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current).toBe(1);

    await rerender({ active: false });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current).toBe(1);
  });
});
