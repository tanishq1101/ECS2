/**
 * Loads data from an API function and exposes the four states every page in
 * this app is expected to handle: loading, error, empty and success.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const result = await loader();
        if (mounted.current) setData(result);
        return result;
      } catch (err) {
        if (mounted.current) setError(err);
        return null;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
