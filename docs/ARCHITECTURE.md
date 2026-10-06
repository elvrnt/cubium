# Architecture

## Architectural style

CubeTrainer uses a client-server architecture with a local-first frontend.

The frontend is not a thin client.

Most interactive cube-related functionality executes in the browser.

## High-level architecture

```text
┌───────────────────────────────────────┐
│ Browser                              │
│                                       │
│ React UI                              │
│    │                                  │
│    ├── Timer                          │
│    ├── Statistics                     │
│    ├── Scramble                       │
│    └── Future BLD                     │
│                                       │
│ Domain modules                        │
│    │                                  │
│    ├── timer                           │
│    ├── statistics                      │
│    ├── cube                            │
│    └── future bld                      │
│                                       │
│ IndexedDB                              │
└──────────────────┬────────────────────┘
                   │
                 HTTPS
                   │
                   ▼
┌───────────────────────────────────────┐
│ FastAPI                               │
│                                       │
│ Auth                                  │
│ Synchronization                       │
│ User settings                         │
│ Solve persistence                     │
└──────────────────┬────────────────────┘
                   │
                   ▼
              PostgreSQL
```

## Local-first requirement

Completing a solve follows this path:

```text
timer stops
    ↓
create Solve object
    ↓
save to IndexedDB
    ↓
update UI/statistics
    ↓
optional background synchronization
```

It must NOT follow:

```text
timer stops
    ↓
POST /api/solves
    ↓
wait for backend
    ↓
show result
```

The user experience must remain functional while offline.

## Frontend layers

Recommended conceptual separation:

```text
app
features
application
domain
infrastructure
shared
```

Possible structure:

```text
frontend/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers/
│
├── features/
│   └── timer/
│       ├── components/
│       ├── hooks/
│       ├── store/
│       └── pages/
│
├── domain/
│   ├── timer/
│   ├── statistics/
│   ├── solves/
│   └── cube/
│
├── infrastructure/
│   ├── db/
│   └── api/
│
└── shared/
    ├── components/
    ├── hooks/
    ├── utils/
    └── types/
```

Do not create empty folders merely to match this diagram. Add them when needed.

## Domain isolation

Functions such as:

```text
calculateAo5
calculateAo12
calculateAo100
applyPenalty
formatSolveTime
```

should not depend on React.

Future functions such as:

```text
traceEdges
traceCorners
generateMemo
```

should also remain independent from the UI.

## State categories

### Ephemeral UI state

Examples:

- timer mode;
- timer currently armed;
- displayed elapsed time;
- modal state.

Zustand may manage this where useful.

### Local persistent state

Examples:

- solves;
- sessions;
- user preferences.

Use IndexedDB through Dexie.

### Server state

Examples:

- authenticated user;
- cloud synchronization state;
- remote account settings.

Use TanStack Query when backend functionality is implemented.

## Timer state machine

The framework-independent `application/timer/TimerApplication` coordinates the
domain timer, scramble ownership, Solve creation, local repository writes, editing,
and derived statistics. Its injected dependencies and observable state/recovery
contract are documented in [TIMER.md](TIMER.md#application-coordinator). The
`app/createTimerApplication` composition builds the production dependencies once
in the browser entry, outside React Strict Mode. `features/timer` binds snapshots
with `useSyncExternalStore`, translates keyboard input and schedules readiness,
and renders the default Timer page. Visual components never call infrastructure.

The implemented pure timer engine, discriminated state union, event scheduling,
and completion contract are specified in [TIMER.md](TIMER.md).

The timer must use explicit states rather than a large collection of overlapping booleans.

Minimum state model:

```ts
type TimerStatus =
  | "idle"
  | "holding"
  | "ready"
  | "running"
  | "stopped";
```

Possible future state:

```text
inspection
```

Transitions:

```text
idle
 │
 │ Space down
 ▼
holding
 │
 │ hold threshold reached
 ▼
ready
 │
 │ Space up
 ▼
running
 │
 │ Space down
 ▼
stopped
 │
 │ Space up / result finalized
 ▼
idle
```

Holding threshold should initially be:

```text
300 ms
```

and should be declared as a configuration constant rather than scattered through components.

Ignore keyboard auto-repeat events.

Timer keyboard shortcuts must be disabled when the user is typing in:

- input;
- textarea;
- editable controls;
- note editor.

## Time measurement

At start:

```ts
startedAt = performance.now();
```

At stop:

```ts
elapsedMs = performance.now() - startedAt;
```

Persist:

```ts
Math.round(elapsedMs)
```

Rendering may use:

```ts
requestAnimationFrame()
```

while running.

Rendering frequency must not affect the measured result.

## Scramble generation

`infrastructure/cubing/cubingScrambleGenerator.ts` implements the application-owned
[scramble contract](DOMAIN.md#scramble-contract) using npm `cubing` 0.63.8.
It awaits the public `randomScrambleForEvent('333')` from `cubing/scramble`, then
converts the returned algorithm with `toString()`. Generation is local asynchronous
worker computation; no backend, TanStack Query, custom random-move generator,
validator, retry policy, or prefetch queue is involved.

The Vite build keeps scramble dependencies in a separate chunk so the worker
does not import the React entry's DOM effects. Module preloading is disabled
because shared dynamic imports also execute inside workers, without `document`.
The production preview exercises this bundling boundary.

## Cube visualization

`features/cube/CubeVisualization` receives a notation string and wraps the public
`TwistyPlayer` from `cubing/twisty`. It never generates a scramble. Configuration
uses `puzzle: '3x3x3'`, `visualization: '2D'`, no controls/viewer link/background,
and disabled drag/move input. The host is inert and fits a responsive parent.

The whole scramble is applied as `experimentalSetupAlg`, anchored at `start`,
with an empty playback `alg`. Thus the initial static pattern is already the
state **after** the scramble, not a solved cube awaiting playback. These documented
experimental options are isolated inside this component; check them when upgrading
cubing. See the official [setup algorithm documentation](https://js.cubing.net/cubing/twisty/).
React effect cleanup removes the player on change/unmount, including StrictMode.

## Statistics

Statistics are derived data.

Do not persist:

- ao5;
- ao12;
- ao100;
- mean;
- best.

Persist solves and derive statistics from them.

## Backend architecture

Recommended structure:

```text
backend/app/
├── main.py
├── api/
├── core/
├── db/
├── models/
├── schemas/
├── services/
└── tests/
```

Keep it a modular monolith.

Do not split the backend into microservices.

## IDs

Use UUIDs for entities that may eventually synchronize between local and remote storage.

## Dates

Persist timestamps in UTC.

Exchange API dates using ISO 8601.

## API prefix

Use:

```text
/api/v1
```

for backend routes.

## Error handling

API errors should use a consistent JSON format.

Example:

```json
{
  "detail": "Solve not found"
}
```

Avoid exposing internal exception details.
