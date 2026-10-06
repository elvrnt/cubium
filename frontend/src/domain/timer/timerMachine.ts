import type { TimerEffect, TimerEvent } from './timerEvents';
import { createInitialTimerState } from './timerState';
import type { TimerState } from './timerState';
import { DEFAULT_HOLD_THRESHOLD_MS } from './timing';

export interface TimerTransitionResult {
  readonly state: TimerState;
  readonly effect?: TimerEffect;
}

/** Pure reducer: callers retain the returned state and consume each effect once. */
export function transitionTimer(
  state: TimerState,
  event: TimerEvent,
): TimerTransitionResult {
  if (!Number.isFinite(event.now) || event.now < 0) return { state };

  switch (state.status) {
    case 'idle':
      if (event.type === 'START_KEY_DOWN') {
        return { state: { status: 'holding', holdStartedAt: event.now } };
      }
      break;
    case 'holding':
      if (event.now < state.holdStartedAt) break;
      if (event.type === 'CANCEL_HOLD')
        return { state: createInitialTimerState() };
      if (event.type === 'START_KEY_UP') {
        // Readiness is event-driven: release before a delivered threshold
        // cancels even if the callback was delayed beyond the threshold.
        return { state: createInitialTimerState() };
      }
      if (
        event.type === 'HOLD_THRESHOLD_REACHED' &&
        event.holdStartedAt === state.holdStartedAt &&
        event.now - state.holdStartedAt >= DEFAULT_HOLD_THRESHOLD_MS
      ) {
        return {
          state: { status: 'ready', holdStartedAt: state.holdStartedAt },
        };
      }
      break;
    case 'ready':
      if (event.type === 'CANCEL_HOLD' && event.now >= state.holdStartedAt) {
        return { state: createInitialTimerState() };
      }
      if (
        event.type === 'START_KEY_UP' &&
        event.now - state.holdStartedAt >= DEFAULT_HOLD_THRESHOLD_MS
      ) {
        return { state: { status: 'running', startedAt: event.now } };
      }
      break;
    case 'running':
      if (event.type === 'STOP_KEY_DOWN' && event.now >= state.startedAt) {
        const elapsedMs = event.now - state.startedAt;
        return {
          state: {
            status: 'stopped',
            startedAt: state.startedAt,
            stoppedAt: event.now,
            elapsedMs,
          },
          effect: { type: 'SOLVE_COMPLETED', elapsedMs },
        };
      }
      break;
    case 'stopped':
      if (event.type === 'STOP_KEY_UP' && event.now >= state.stoppedAt) {
        return { state: createInitialTimerState() };
      }
      break;
  }
  return { state };
}
