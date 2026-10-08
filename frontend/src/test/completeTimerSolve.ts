import type { TimerApplication } from '../application/timer';

export async function completeTimerSolve(
  application: TimerApplication,
  duration = 10000,
) {
  await application.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 });
  await application.dispatchTimerEvent({
    type: 'HOLD_THRESHOLD_REACHED',
    now: 300,
    holdStartedAt: 0,
  });
  await application.dispatchTimerEvent({ type: 'START_KEY_UP', now: 400 });
  await application.dispatchTimerEvent({
    type: 'STOP_KEY_DOWN',
    now: 400 + duration,
  });
  await application.dispatchTimerEvent({
    type: 'STOP_KEY_UP',
    now: 401 + duration,
  });
}
