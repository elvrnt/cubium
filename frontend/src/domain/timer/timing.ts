import type { TimerState } from './timerState';

export const DEFAULT_HOLD_THRESHOLD_MS = 300;

/** All readings in a cycle must come from the same monotonic clock origin. */
export interface TimerClock {
  now(): number;
}

/** No accumulation or rounding. Invalid running samples display zero. */
export function getElapsedTimeMs(state: TimerState, now: number): number {
  switch (state.status) {
    case 'running':
      return Number.isFinite(now) ? Math.max(0, now - state.startedAt) : 0;
    case 'stopped':
      return state.elapsedMs;
    default:
      return 0;
  }
}
