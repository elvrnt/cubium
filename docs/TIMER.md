# Timer engine and application coordinator

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
`START_KEY_DOWN`, `HOLD_THRESHOLD_REACHED`, `START_KEY_UP`, `STOP_KEY_DOWN`,
`STOP_KEY_UP`, and `CANCEL_HOLD`. The threshold event also carries the captured `holdStartedAt`
so a callback from a previous hold cannot arm a different hold.

| Current state | Event and condition                                        | Next state                                       |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| idle          | START_KEY_DOWN                                             | holding, timestamp captured                      |
| holding       | HOLD_THRESHOLD_REACHED for this hold, elapsed >= threshold | ready                                            |
| holding       | START_KEY_UP                                               | idle                                             |
| ready         | START_KEY_UP                                               | running, release timestamp captured              |
| running       | STOP_KEY_DOWN                                              | stopped, duration and completion effect returned |
| stopped       | STOP_KEY_UP                                                | idle                                             |
| holding/ready | CANCEL_HOLD with a valid timestamp                         | idle, no solve starts                            |

All other events return the existing state and no effect. Duplicate keydowns,
stops, releases, and stale callbacks therefore cannot reset the origin or emit
completion twice when events are reduced against the latest state. States and
events are never mutated.

## Scheduling and boundary behavior

The default threshold is the named constant `DEFAULT_HOLD_THRESHOLD_MS = 300`.
The pure machine owns no timeout or interval. The browser adapter schedules a
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

The keyboard adapter maps the physical key to start/stop events based on
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
penalty, or repository. The application coordinator below constructs `Solve` and
rounds the duration to integer milliseconds there, once, before local persistence.

## Application coordinator

`frontend/src/application/timer` exports the plain TypeScript `TimerApplication`,
its state and dependency contracts. It imports domain functions and the existing
repository interface/error module, never concrete Dexie, cubing, React, or Zustand.
The caller injects `solveRepository`, `scrambleGenerator`, `timerClock`,
`idGenerator.generate()` and `dateProvider.nowIso()`. The tiny production adapters
in `infrastructure/platform` use `crypto.randomUUID()` and UTC
`new Date().toISOString()`; duration readings use the separate performance clock.
Providers must return unique IDs and valid UTC timestamps synchronously. Repository
and scramble inputs follow the existing domain contracts. The caller owns repository
connection lifetime; the coordinator does not close shared adapters.

### State and observation

`getState()` returns a stable immutable snapshot until the next change. It contains:

- `timer`: the existing timer union;
- `history`: uninitialized/loading/ready/error, with the original error on failure;
- `solves`: current-session immutable records ordered by instant then ID, oldest first;
- `sessions`, `activeSessionId`, derived `sessionSolveCounts` and `editing`:
  the local session contract in [SESSIONS.md](SESSIONS.md);
- `statistics`: best, mean, ao5, ao12, ao50, ao100 composed from existing domain functions;
- `displayedSolveId`: independent central-result identity, or null for zero;
- `currentScramble`: immutable application scramble or null;
- `scramble`: uninitialized/loading/ready/error;
- `persistence`: idle, saving with a pending mutation, or error with that mutation
  and the original error;
- `canArm`: idle timer, loaded history, ready non-null scramble, and idle persistence.

`subscribe(listener)` notifies synchronously on changes and returns an unsubscribe
function. The listener reads `getState()`; subscription itself does not notify.
Snapshots and nested data are frozen (error payloads remain opaque). Listener
exceptions are logged and isolated so they cannot interrupt persistence. Stable
`getState` and `subscribe` functions support the React `useSyncExternalStore` bridge.

### Public operations

Session operations and result-editor protection extend this coordinator as
documented in [SESSIONS.md](SESSIONS.md#repository-and-coordinator). The timer
domain and timing API remain independent of session membership.

| Method                      | Behavior                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loadHistory()`             | Load history and derive statistics without generating a scramble. Concurrent callers share one read; loaded history is a no-op, and read errors can be retried.                |
| `initialize()`              | Await the shared history read, then generate the initial scramble only if uninitialized. Concurrent callers await one initialization; revisiting Timer preserves its scramble. |
| `dispatchTimerEvent(event)` | Forward timestamped events to the domain synchronously. A stop's returned promise covers persistence and next generation. No external effect-handling API exists.              |
| `getElapsedTimeMs()`        | Derive elapsed time using the injected monotonic clock, without changing state.                                                                                                |
| `retryScramble()`           | Retry failed generation; otherwise no-op.                                                                                                                                      |
| `retryPersistence()`        | Retry the retained failed mutation; otherwise no-op.                                                                                                                           |
| `setPenalty(id, penalty)`   | Apply `setSolvePenalty`, persist a new snapshot, update history/statistics.                                                                                                    |
| `updateNote(id, note)`      | Validate through `setSolveNote`, then persist the exact string or null; reject more than `MAX_SOLVE_NOTE_LENGTH` before writing.                                               |
| `deleteSolve(id)`           | Persist deletion before removing the record and recalculating statistics. Unknown IDs are no-ops.                                                                              |

Missing IDs for updates reject with the existing `SolveNotFoundError`. Editing
before history loads, during holding/ready/running, or during pending/failed
persistence rejects with a busy/not-ready error. Edits are not queued. Async
adapter failures are represented in state and the operation resolves; callers
must inspect state, not interpret promise resolution as success. Duplicate
ignored timer events and in-flight retry calls do not wait for the original
write/generation. History reads and initializations instead share their pending
promise, so concurrent callers await the same startup operation.

### Solve creation, ordering, and recovery

Arming locks the current scramble through completion and saving. The coordinator
retains the new stopped timer state and marks persistence saving **before**
notifying subscribers or awaiting work. Duplicate stops, including reentrant
subscriber dispatches, cannot create a second record. Early stop release is still
forwarded, but a new arm is ignored while persistence or generation is pending.
The domain remains responsible for all timer transition rules and hold scheduling
belongs to the browser controller.

Completion constructs exactly the source fields: injected ID, event `333`, the
current scramble's notation, `Math.round(elapsedMs)` once, penalty `NONE`, note
null, and injected UTC `createdAt`. The original fractional duration stays in the
timer. The coordinator awaits repository `save`, then publishes ordered history
and recalculated statistics, clears the consumed scramble, and generates the next.
Edits likewise use repository `update`/`delete` before changing in-memory history.

On a rejected write, history/statistics remain at the last durable snapshot. The
pending immutable save/update/delete remains in state for explicit retry. A failed
new solve retains its exact ID, timestamp, rounded duration and scramble even if
the stop key has already been released. No next scramble is generated, and arming
and other writes remain blocked until retry succeeds. This assumes the local
repository's atomic write contract: a rejected write did not commit. Recovery is
in memory; reloading before a successful retry loses the pending operation. There
is no retry queue, alternate storage or cross-tab conflict resolution.

If next generation fails after a successful save, the solve and statistics stay
saved/updated. The current scramble is null and arming remains disabled until
`retryScramble()` succeeds. History-load failure never reports ready empty history.
One coordinator should own a timer/history view; external writers require future
refresh/conflict policy.

## React and browser adapters

`app/createTimerApplication.ts` constructs the coordinator, Dexie repository,
cubing generator, performance clock and ID/date adapters. `main.tsx` creates one
runtime outside React render and closes its repository after root unmount on HMR
disposal. Strict Mode effect replay never creates a second runtime. The thin
`useTimerApplication` hook subscribes with `useSyncExternalStore` and calls the
idempotent initializer on Timer mount; subscriptions are cleaned up on unmount.
Results subscribes to the same coordinator but calls only `loadHistory()`.
The application and repository survive internal route changes. See
[ARCHITECTURE.md](ARCHITECTURE.md#browser-routes-and-shared-history).

`features/timer/keyboardController.ts` owns browser listeners and hold timeouts.
Space down maps idle/canArm to START_KEY_DOWN. While running, any keyboard keydown
maps to STOP_KEY_DOWN and suppresses its default action, including when focus has
moved to a control. Only the release of that owned key maps back to
START_KEY_UP/STOP_KEY_UP. Repeats and duplicate downs are ignored. Handled keys
prevent default browser actions. Outside running, text inputs,
textarea, select, contenteditable, buttons, links and marked editor regions retain
native keyboard behavior. The entire timer shortcut adapter is suspended while
the cube, solve details, note/delete dialog or statistics help is open.

The scheduler captures holdStartedAt and uses DEFAULT_HOLD_THRESHOLD_MS; it
cancels when holding ends. Early callbacks are rescheduled only if the domain
still reports holding. Blur, hidden documents, entering an editor while holding,
and cleanup cancel holding/ready via CANCEL_HOLD, so a late release cannot start
a solve. Running time continues across blur; returning and pressing any key stops
normally. All listeners and timeouts are removed during cleanup.

`TimerDisplay` mounts its local animation-frame component only while running.
Each frame reads `application.getElapsedTimeMs()` and formats through the existing
domain formatter. It never writes frame values into the coordinator or storage.
Unmount/stop cancels the one scheduled frame. Holding/ready show zero. Idle and
stopped resolve `displayedSolveId` to its result, including penalty changes, or
show zero when it is null. A new completion selects its new ID before saving;
an unsaved result remains visible from the pending record. Successful deletion
clears that ID only when it matches the deleted solve, so the readout never falls
back to older history. Failed deletion retains it until a successful retry.
The action caption and buttons use the same displayed ID and disappear when it
is cleared; older records remain accessible through the recent-history buttons.
Editing/deleting a different historical solve leaves it unchanged. On a fresh
page load the displayed ID remains null and the central timer shows 0.000,
while durable history and derived statistics are restored normally;
the display identity and historical editor selection are not persisted. Timer
domain states, precise timestamps and transition semantics remain unchanged.

React owns only editor drafts, confirmation visibility and rendering state.
Business state, rounding, penalty semantics, persistence and statistics remain
in the application/domain layers. See [UI.md](UI.md#implemented-timer-mvp) for
page structure and recovery controls.

## Verification

Deterministic tests cover the full cycle, early release, threshold boundaries and
delays, stale callbacks, start/stop precision, stable stopped results, exactly one
effect per cycle, irrelevant and invalid events, multiple cycles, immutability,
and delegation to the performance clock. Run the standard frontend test,
typecheck, lint, format check, and build commands from `DEVELOPMENT.md`.
