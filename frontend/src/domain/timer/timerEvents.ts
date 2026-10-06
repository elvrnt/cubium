export type TimerEvent =
  | { readonly type: 'CANCEL_HOLD'; readonly now: number }
  | { readonly type: 'START_KEY_DOWN'; readonly now: number }
  | {
      readonly type: 'HOLD_THRESHOLD_REACHED';
      readonly now: number;
      /** Captured when scheduling, so old callbacks cannot arm a later hold. */
      readonly holdStartedAt: number;
    }
  | { readonly type: 'START_KEY_UP'; readonly now: number }
  | { readonly type: 'STOP_KEY_DOWN'; readonly now: number }
  | { readonly type: 'STOP_KEY_UP'; readonly now: number };

export type TimerEffect = {
  readonly type: 'SOLVE_COMPLETED';
  readonly elapsedMs: number;
};
