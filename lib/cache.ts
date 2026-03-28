import { create } from 'zustand';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheStore {
  entries: Record<string, CacheEntry<unknown>>;
  get: <T>(key: string, maxAge?: number) => T | null;
  set: <T>(key: string, data: T) => void;
  invalidate: (key: string) => void;
  invalidateAll: () => void;
}

export const useCacheStore = create<CacheStore>((set, get) => ({
  entries: {},

  get: <T>(key: string, maxAge = 30000): T | null => {
    const entry = get().entries[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAge) return null;
    return entry.data as T;
  },

  set: <T>(key: string, data: T) => {
    set((state) => ({
      entries: {
        ...state.entries,
        [key]: { data, timestamp: Date.now() },
      },
    }));
  },

  invalidate: (key: string) => {
    set((state) => {
      const { [key]: _, ...rest } = state.entries;
      return { entries: rest };
    });
  },

  invalidateAll: () => {
    set({ entries: {} });
  },
}));
