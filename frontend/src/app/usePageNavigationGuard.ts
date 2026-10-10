import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/** A running solve or protected editor stays on its current page. */
export function usePageNavigationGuard(
  protectedTask: boolean,
  allowSearchChange = false,
) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      protectedTask &&
      (!allowSearchChange ||
        currentLocation.pathname !== nextLocation.pathname),
  );
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);
}
