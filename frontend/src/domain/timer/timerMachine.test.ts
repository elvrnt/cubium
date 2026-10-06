// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  createInitialTimerState,
  DEFAULT_HOLD_THRESHOLD_MS,
  getElapsedTimeMs,
  transitionTimer,
} from './index';
import type { TimerClock, TimerEffect, TimerEvent, TimerState } from './index';

const idle: TimerState = { status: 'idle' };
const holding: TimerState = { status: 'holding', holdStartedAt: 1000 };
const ready: TimerState = { status: 'ready', holdStartedAt: 1000 };
const running: TimerState = { status: 'running', startedAt: 1480.25 };
const stopped: TimerState = {
  status: 'stopped',
  startedAt: 1480.25,
  stoppedAt: 13963.8,
  elapsedMs: 13963.8 - 1480.25,
};

describe('timer transitions', () => {
  it.each([holding, ready])(
    'cancels $status without starting or emitting completion',
    (state) => {
      expect(
        transitionTimer(state, { type: 'CANCEL_HOLD', now: 1400 }),
      ).toEqual({ state: idle });
      expect(transitionTimer(state, { type: 'CANCEL_HOLD', now: 999 })).toEqual(
        { state },
      );
    },
  );

  it.each([idle, running, stopped])(
    'ignores cancellation in $status',
    (state) => {
      expect(
        transitionTimer(state, { type: 'CANCEL_HOLD', now: 15000 }),
      ).toEqual({ state });
    },
  );
  it('starts idle with a named 300ms threshold', () => {
    expect(createInitialTimerState()).toEqual(idle);
    expect(DEFAULT_HOLD_THRESHOLD_MS).toBe(300);
  });

  it('records the start of a hold', () => {
    expect(
      transitionTimer(idle, { type: 'START_KEY_DOWN', now: 1000 }),
    ).toEqual({ state: holding });
  });

  it.each([1000, 1299.999, 1300, 1500])(
    'cancels on release at %s until ready has been delivered',
    (now) => {
      expect(transitionTimer(holding, { type: 'START_KEY_UP', now })).toEqual({
        state: idle,
      });
    },
  );

  it.each([
    [1299.999, 'holding'],
    [1300, 'ready'],
    [1300.001, 'ready'],
    [1500, 'ready'],
  ] as const)('validates the threshold at %s', (now, status) => {
    expect(
      transitionTimer(holding, {
        type: 'HOLD_THRESHOLD_REACHED',
        now,
        holdStartedAt: 1000,
      }),
    ).toEqual({ state: { status, holdStartedAt: 1000 } });
  });

  it('starts at key release, not at readiness', () => {
    expect(
      transitionTimer(ready, { type: 'START_KEY_UP', now: 1480.25 }),
    ).toEqual({ state: running });
  });

  it('can start on the exact threshold after the ready event', () => {
    const result = transitionTimer(holding, {
      type: 'HOLD_THRESHOLD_REACHED',
      now: 1300,
      holdStartedAt: 1000,
    });
    expect(
      transitionTimer(result.state, { type: 'START_KEY_UP', now: 1300 }),
    ).toEqual({ state: { status: 'running', startedAt: 1300 } });
  });

  it('stops using subtraction and emits the unrounded duration', () => {
    const result = transitionTimer(running, {
      type: 'STOP_KEY_DOWN',
      now: 13963.8,
    });
    expect(result).toEqual({
      state: stopped,
      effect: { type: 'SOLVE_COMPLETED', elapsedMs: 13963.8 - 1480.25 },
    });
    expect(result.effect?.elapsedMs).toBeCloseTo(12483.55, 9);
  });

  it('preserves an exactly representable sub-millisecond duration', () => {
    expect(
      transitionTimer(running, { type: 'STOP_KEY_DOWN', now: 1480.375 }).effect,
    ).toEqual({ type: 'SOLVE_COMPLETED', elapsedMs: 0.125 });
  });

  it('allows zero duration from equal monotonic samples', () => {
    expect(
      transitionTimer(running, { type: 'STOP_KEY_DOWN', now: 1480.25 }).effect,
    ).toEqual({ type: 'SOLVE_COMPLETED', elapsedMs: 0 });
  });

  it('releases a stopped timer without emitting another completion', () => {
    expect(
      transitionTimer(stopped, { type: 'STOP_KEY_UP', now: 14000 }),
    ).toEqual({ state: idle });
  });

  it('rejects an old threshold callback during a new hold even after its threshold', () => {
    const cancelled = transitionTimer(holding, {
      type: 'START_KEY_UP',
      now: 1100,
    });
    const nextHold = transitionTimer(cancelled.state, {
      type: 'START_KEY_DOWN',
      now: 1200,
    });
    const stale = transitionTimer(nextHold.state, {
      type: 'HOLD_THRESHOLD_REACHED',
      now: 1600,
      holdStartedAt: 1000,
    });
    expect(stale.state).toBe(nextHold.state);
    expect(stale.effect).toBeUndefined();
    expect(
      transitionTimer(stale.state, {
        type: 'HOLD_THRESHOLD_REACHED',
        now: 1600,
        holdStartedAt: 1200,
      }).state.status,
    ).toBe('ready');
  });

  it('runs two independent cycles with one effect per stop using a fake clock', () => {
    let now = 0;
    const clock: TimerClock = { now: () => now };
    let state = createInitialTimerState();
    const effects: TimerEffect[] = [];
    const dispatch = (event: TimerEvent) => {
      const result = transitionTimer(state, event);
      state = result.state;
      if (result.effect) effects.push(result.effect);
    };
    for (const [origin, duration] of [
      [1000, 12483.5],
      [20_000, 0.25],
    ] as const) {
      now = origin;
      const holdStartedAt = clock.now();
      dispatch({ type: 'START_KEY_DOWN', now: clock.now() });
      now += DEFAULT_HOLD_THRESHOLD_MS;
      dispatch({
        type: 'HOLD_THRESHOLD_REACHED',
        now: clock.now(),
        holdStartedAt,
      });
      now += 100;
      dispatch({ type: 'START_KEY_UP', now: clock.now() });
      now += duration;
      dispatch({ type: 'STOP_KEY_DOWN', now: clock.now() });
      dispatch({ type: 'STOP_KEY_DOWN', now: clock.now() + 1 });
      dispatch({ type: 'STOP_KEY_UP', now: clock.now() + 2 });
      dispatch({ type: 'STOP_KEY_UP', now: clock.now() + 3 });
      expect(state).toEqual(idle);
    }
    expect(effects).toEqual([
      { type: 'SOLVE_COMPLETED', elapsedMs: 12483.5 },
      { type: 'SOLVE_COMPLETED', elapsedMs: 0.25 },
    ]);
  });
});

describe('irrelevant input', () => {
  const cases: [TimerState, TimerEvent['type'][]][] = [
    [
      idle,
      [
        'START_KEY_UP',
        'STOP_KEY_DOWN',
        'STOP_KEY_UP',
        'HOLD_THRESHOLD_REACHED',
      ],
    ],
    [holding, ['START_KEY_DOWN', 'STOP_KEY_DOWN', 'STOP_KEY_UP']],
    [
      ready,
      [
        'START_KEY_DOWN',
        'STOP_KEY_DOWN',
        'STOP_KEY_UP',
        'HOLD_THRESHOLD_REACHED',
      ],
    ],
    [
      running,
      [
        'START_KEY_DOWN',
        'START_KEY_UP',
        'STOP_KEY_UP',
        'HOLD_THRESHOLD_REACHED',
      ],
    ],
    [
      stopped,
      [
        'START_KEY_DOWN',
        'START_KEY_UP',
        'STOP_KEY_DOWN',
        'HOLD_THRESHOLD_REACHED',
      ],
    ],
  ];
  for (const [state, types] of cases) {
    it.each(types)(`ignores %s while ${state.status}`, (type) => {
      const frozen = Object.freeze({ ...state });
      const result = transitionTimer(frozen, {
        type,
        now: 20_000,
        holdStartedAt: 1000,
      });
      expect(result).toEqual({ state: frozen });
      expect(result.state).toBe(frozen);
    });
  }

  it.each([NaN, Infinity, -Infinity, -1])(
    'ignores invalid event timestamp %s in every state',
    (now) => {
      const cases: [TimerState, TimerEvent][] = [
        [idle, { type: 'START_KEY_DOWN', now }],
        [holding, { type: 'HOLD_THRESHOLD_REACHED', now, holdStartedAt: 1000 }],
        [ready, { type: 'START_KEY_UP', now }],
        [running, { type: 'STOP_KEY_DOWN', now }],
        [stopped, { type: 'STOP_KEY_UP', now }],
      ];
      for (const [state, event] of cases)
        expect(transitionTimer(state, event)).toEqual({ state });
    },
  );

  it('ignores timestamps earlier than the relevant state boundary', () => {
    const cases: [TimerState, TimerEvent][] = [
      [holding, { type: 'START_KEY_UP', now: 999 }],
      [ready, { type: 'START_KEY_UP', now: 1299 }],
      [running, { type: 'STOP_KEY_DOWN', now: 1480 }],
      [stopped, { type: 'STOP_KEY_UP', now: 13963 }],
    ];
    for (const [state, event] of cases)
      expect(transitionTimer(state, event)).toEqual({ state });
  });

  it('does not mutate states or events along a complete cycle', () => {
    let state = createInitialTimerState();
    const events: TimerEvent[] = [
      { type: 'START_KEY_DOWN', now: 1000 },
      { type: 'HOLD_THRESHOLD_REACHED', now: 1300, holdStartedAt: 1000 },
      { type: 'START_KEY_UP', now: 1480.25 },
      { type: 'STOP_KEY_DOWN', now: 13963.8 },
      { type: 'STOP_KEY_UP', now: 14000 },
    ];
    for (const event of events) {
      const before = { ...state };
      const eventBefore = { ...event };
      const result = transitionTimer(
        Object.freeze(state),
        Object.freeze(event),
      );
      expect(state).toEqual(before);
      expect(event).toEqual(eventBefore);
      state = result.state;
    }
  });
});

describe('elapsed time', () => {
  it.each([idle, holding, ready])('is zero while $status', (state) => {
    expect(getElapsedTimeMs(state, 9999)).toBe(0);
  });
  it('derives running time directly from each sample without accumulating', () => {
    expect(getElapsedTimeMs(running, 1480.375)).toBe(0.125);
    expect(getElapsedTimeMs(running, 5000)).toBe(5000 - 1480.25);
    expect(getElapsedTimeMs(running, 5000)).toBe(5000 - 1480.25);
  });
  it.each([0, 14000, 99999, NaN])(
    'keeps the stopped duration stable with now=%s',
    (now) => {
      expect(getElapsedTimeMs(stopped, now)).toBe(stopped.elapsedMs);
    },
  );
  it.each([0, NaN, Infinity, -Infinity])(
    'returns zero for an invalid running sample %s',
    (now) => {
      expect(getElapsedTimeMs(running, now)).toBe(0);
    },
  );
});
