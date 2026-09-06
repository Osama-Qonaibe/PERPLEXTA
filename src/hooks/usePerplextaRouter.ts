import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

export interface PerplextaNavigateOptions {
  replace?: boolean;
  state?: any;
}

export function usePerplextaRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [historyStack, setHistoryStack] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return [window.location.pathname + window.location.search];
    }
    return [];
  });

  useEffect(() => {
    const currentUrl = location.pathname + location.search;
    setHistoryStack((prev) => {
      if (prev[prev.length - 1] !== currentUrl) {
        return [...prev, currentUrl];
      }
      return prev;
    });
  }, [location]);

  const push = useCallback((to: string, options?: PerplextaNavigateOptions) => {
    navigate(to, { replace: options?.replace, state: options?.state });
  }, [navigate]);

  const replace = useCallback((to: string, options?: { state?: any }) => {
    navigate(to, { replace: true, state: options?.state });
  }, [navigate]);

  const back = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const forward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  const goTo = useCallback((delta: number) => {
    navigate(delta);
  }, [navigate]);

  return {
    navigate: push,
    push,
    replace,
    back,
    forward,
    goTo,
    location,
    searchParams,
    setSearchParams,
    currentPath: location.pathname,
    historyStack,
  };
}
