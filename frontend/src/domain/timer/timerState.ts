export type TimerState =
  | { readonly status: 'idle' }
  | { readonly status: 'holding'; readonly holdStartedAt: number }
  | { readonly status: 'ready'; readonly holdStartedAt: number }
  | { readonly status: 'running'; readonly startedAt: number }
  | {
      readonly status: 'stopped';
      readonly startedAt: number;
      readonly stoppedAt: number;
      readonly elapsedMs: number;
    };

export function createInitialTimerState(): TimerState {
  return { status: 'idle' };
}
