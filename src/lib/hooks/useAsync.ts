'use client';

import { useEffect, useState } from 'react';

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Re-runs the loader. */
  reload: () => void;
};

/**
 * Loads data from an async source, with loading and error states.
 *
 * `loading` is part of the initial state rather than being set from inside an
 * effect, so nothing here cascades a render.
 *
 * `load` must be a stable reference — wrap it in `useCallback` at the call site
 * with a real dependency array. This is the same contract as any other effect,
 * and it is what lets this hook read `load` inside the effect without keeping
 * it in a ref.
 */
export const useAsync = <T,>(load: () => Promise<T>): AsyncState<T> => {
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });
  const [token, setToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await load();
        if (cancelled) return;
        setState({ data: result, error: null, loading: false });
      } catch (error) {
        if (cancelled) return;
        setState({
          data: null,
          error: error instanceof Error ? error.message : String(error),
          loading: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, token]);

  const reload = () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setToken((n) => n + 1);
  };

  return { ...state, reload };
};
