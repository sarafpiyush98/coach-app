import { useEffect, useState, useCallback, useRef } from 'react';
import { useCacheStore } from './cache';

interface UseCachedFetchOptions {
  maxAge?: number;
}

interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  revalidating: boolean;
  refresh: () => void;
}

export function useCachedFetch<T>(
  url: string,
  options?: UseCachedFetchOptions
): UseCachedFetchResult<T> {
  const maxAge = options?.maxAge ?? 30000;
  const cacheGet = useCacheStore((s) => s.get);
  const cacheSet = useCacheStore((s) => s.set);

  const cached = cacheGet<T>(url, maxAge);
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [revalidating, setRevalidating] = useState(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const currentCached = useCacheStore.getState().get<T>(url, maxAge);
    if (currentCached) {
      setData(currentCached);
      setLoading(false);
      setRevalidating(true);
    }

    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      const payload = json.data ?? json;
      if (mountedRef.current) {
        setData(payload);
        setLoading(false);
        setRevalidating(false);
        cacheSet(url, payload);
      }
    } catch {
      if (mountedRef.current) {
        setLoading(false);
        setRevalidating(false);
      }
    }
  }, [url, maxAge, cacheSet]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    useCacheStore.getState().invalidate(url);
    setRevalidating(true);
    fetchData();
  }, [url, fetchData]);

  return { data, loading, revalidating, refresh };
}
