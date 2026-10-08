import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/** A running solve or protected editor stays on its current page. */
export function usePageNavigationGuard(protectedTask: boolean) {
  const blocker = useBlocker(protectedTask);
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);
}
