# Timer engine

The public pure API is in `frontend/src/domain/timer/index.ts`:
`TimerState`, `TimerEvent`, `TimerEffect`, `TimerTransitionResult`, `TimerClock`,
`createInitialTimerState`, `transitionTimer`, `getElapsedTimeMs`, and
`DEFAULT_HOLD_THRESHOLD_MS`.

## State and events

`TimerState` is a readonly discriminated union:

- `idle`: no timing fields (the initial state).
- `holding`: `holdStartedAt`.
- `ready`: `holdStartedAt`.
- `running`: `startedAt`.
- `stopped`: `startedAt`, `stoppedAt`, `elapsedMs`.

Every event contains a monotonic `now` timestamp. Event types are
`START_KEY_DOWN`, `HOLD_THRESHOLD_REACHED`, `START_KEY_UP`, `STOP_KEY_DOWN`, and
`STOP_KEY_UP`. The threshold event also carries the captured `holdStartedAt`
so a callback from a previous hold cannot arm a different hold.

| Current state | Event and condition | Next state |
| --- | --- | --- |
| idle | START_KEY_DOWN | holding, timestamp captured |
| holding | HOLD_THRESHOLD_REACHED for this hold, elapsed >= threshold | ready |
| holding | START_KEY_UP | idle |
| ready | START_KEY_UP | running, release timestamp captured |
| running | STOP_KEY_DOWN | stopped, duration and completion effect returned |
| stopped | STOP_KEY_UP | idle |

All other events return the existing state and no effect. Duplicate keydowns,
stops, releases, and stale callbacks therefore cannot reset the origin or emit
completion twice when events are reduced against the latest state. States and
events are never mutated.

## Scheduling and boundary behavior

The default threshold is the named constant `DEFAULT_HOLD_THRESHOLD_MS = 300`.
The pure machine owns no timeout or interval. A future adapter schedules a
threshold callback when entering `holding`, captures `holdStartedAt`, and samples
the clock again when delivering the callback. It should cancel the callback on
leaving `holding`; the machine also checks its captured hold and elapsed time.
An early callback leaves the state holding; the adapter must deliver another
callback at or after the threshold if necessary.

At exactly 300 ms, a matching threshold event transitions to ready. Releasing
while still holding cancels, even at or after 300 ms if the readiness callback
has not yet been delivered. Releasing after the ready event starts the timer at
the release timestamp, never at the threshold timestamp. This explicit event
ordering avoids implicit starts before the ready state has been reached.

The future keyboard adapter maps the physical key to start/stop events based on
state, ignores `KeyboardEvent.repeat`, and handles editable controls. DOM events,
keyboard listeners, scheduling, and React integration are outside this engine.

## Clock and precision

`TimerClock` exposes only `now(): number`. The production `performanceClock` in
`frontend/src/infrastructure/timer/` calls `performance.now()` on each reading.
The domain only receives timestamps; it never imports infrastructure or calls a
browser clock. All samples in a cycle must use the same monotonic clock origin,
with finite, non-negative readings delivered in chronological order. Tests use
explicit timestamps or a fake clock, with no real waiting.

The authoritative duration is `stoppedAt - startedAt`. Running elapsed time is
derived from `now - startedAt` through `getElapsedTimeMs`; rendering frequency
cannot affect the result. Idle, holding, and ready return zero; stopped always
returns its captured duration, regardless of later `now` samples. An invalid or
pre-start running sample returns zero. No accumulation or rounding is performed;
fractional milliseconds retain JavaScript number precision.

Non-finite or negative event times are ignored. Relevant events older than the
state's timing boundary are also ignored (hold origin, readiness threshold,
running origin, or stop timestamp). The reducer is not a general event-log
validator: callers must deliver ordered samples and machine-produced states.

## Completed result

Only `running -> stopped` returns
`effect: { type: 'SOLVE_COMPLETED', elapsedMs }`. The same duration is retained
in the stopped state. Application code must retain the returned state and
consume the effect before dispatching the stop release that returns to idle.
Repeated stop events against the stopped state produce no effect. As with any
pure reducer, replaying the original running state can reproduce its result;
external effect delivery/deduplication belongs to the caller.

This transient timer result is not a persisted `Solve`: it has no scramble, ID,
penalty, or repository. A future application layer will construct `Solve` and
round the duration to integer milliseconds there, once, before local persistence.

## Verification

Deterministic tests cover the full cycle, early release, threshold boundaries and
delays, stale callbacks, start/stop precision, stable stopped results, exactly one
effect per cycle, irrelevant and invalid events, multiple cycles, immutability,
and delegation to the performance clock. Run the standard frontend test,
typecheck, lint, format check, and build commands from `DEVELOPMENT.md`.
