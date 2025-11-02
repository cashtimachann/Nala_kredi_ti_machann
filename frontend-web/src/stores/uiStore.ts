import { create } from 'zustand';

interface UIState {
  globalLoading: boolean;
  setGlobalLoading: (value: boolean) => void;
  // Utility to wrap a promise and toggle loading automatically
  withGlobalLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

export const useUIStore = create<UIState>((set, get) => ({
  globalLoading: false,
  setGlobalLoading: (value: boolean) => set({ globalLoading: value }),
  withGlobalLoading: async <T,>(fn: () => Promise<T>) => {
    const { setGlobalLoading } = get();
    setGlobalLoading(true);
    try {
      return await fn();
    } finally {
      setGlobalLoading(false);
    }
  },
}));
