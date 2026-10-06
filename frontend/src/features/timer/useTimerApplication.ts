import { useEffect, useSyncExternalStore } from 'react';
import type { TimerApplication } from '../../application/timer';

export function useTimerApplication(application: TimerApplication) {
  const state = useSyncExternalStore(
    application.subscribe,
    application.getState,
  );
  useEffect(() => {
    if (application.getState().history.status === 'uninitialized') {
      void application.initialize();
    }
  }, [application]);
  return state;
}
