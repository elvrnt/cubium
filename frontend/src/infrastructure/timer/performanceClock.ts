import type { TimerClock } from '../../domain/timer';

export const performanceClock: TimerClock = {
  now: () => performance.now(),
};
