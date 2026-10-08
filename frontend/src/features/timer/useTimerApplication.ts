import { useEffect, useSyncExternalStore } from 'react';
import type { TimerApplication } from '../../application/timer';

export function useTimerApplication(application: TimerApplication) {
  const state = useSyncExternalStore(
    application.subscribe,
    application.getState,
  );
  useEffect(() => {
    void application.initialize();
  }, [application]);
  return state;
}
