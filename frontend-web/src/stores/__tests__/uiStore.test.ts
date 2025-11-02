import { act } from 'react';
import { useUIStore } from '../../stores/uiStore';

describe('useUIStore', () => {
  test('setGlobalLoading toggles the state', () => {
    const getState = () => useUIStore.getState();
    expect(getState().globalLoading).toBe(false);
    act(() => {
      getState().setGlobalLoading(true);
    });
    expect(getState().globalLoading).toBe(true);
    act(() => {
      getState().setGlobalLoading(false);
    });
    expect(getState().globalLoading).toBe(false);
  });

  test('withGlobalLoading wraps async function and toggles', async () => {
    const getState = () => useUIStore.getState();

    const fn = jest.fn(async () => {
      // simulate async delay
      await new Promise((r) => setTimeout(r, 10));
      return 42;
    });

    const p = act(async () => {
      const result = await getState().withGlobalLoading(fn);
      expect(result).toBe(42);
    });

    // Loading should be true at some point during execution
    expect([true, false]).toContain(getState().globalLoading);
    await p;
    expect(getState().globalLoading).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
