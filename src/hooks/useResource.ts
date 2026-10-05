import { useCallback, useEffect, useRef, useState } from 'react';
export function useResource<T>(fetcher: (signal: AbortSignal) => Promise<T>, initial: T, interval = 0) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setRefreshing(true);
    try {
      const result = await fetcher(controller.signal);
      if (controller.signal.aborted) return;
      setData(result); setError(null); setUpdatedAt(new Date());
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load data. Please try again.');
    } finally {
      if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); active.current = null; }
    }
  }, [fetcher]);
  useEffect(() => {
    setLoading(true); setError(null); setUpdatedAt(null);
    void refresh();
    const timer = interval ? setInterval(() => { if (!document.hidden && !active.current) void refresh(); }, interval) : null;
    const visible = () => { if (!document.hidden && interval && !active.current) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active.current?.abort(); if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [refresh, interval]);
  return { data, loading, refreshing, error, updatedAt, refresh };
}
