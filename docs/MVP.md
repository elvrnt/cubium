# MVP specification

## Goal

Deliver a fast and reliable desktop-first 3x3 Rubik's Cube timer.

The MVP must be useful even with no backend connection.

## Scope

### Included

- 3x3 scramble generation;
- scramble display;
- 2D cube visualization;
- keyboard timer;
- local solve history;
- IndexedDB persistence;
- note;
- +2;
- DNF;
- delete;
- best;
- mean;
- ao5;
- ao12;
- ao100;
- responsive layout;
- basic automated tests.

### Excluded

- authentication;
- cloud synchronization;
- BLD;
- CFOP algorithms;
- user profile;
- multiple puzzles;
- inspection timer;
- smart cube integration;
- social functionality.

A minimal backend skeleton with `/api/v1/health` is allowed, but backend availability must not affect the timer.

## Timer workflow

### Initial screen

On application load:

1. generate or restore a current 3x3 scramble;
2. display scramble;
3. display scrambled cube visualization;
4. timer displays:

```text
0.000
```

5. load solve history from IndexedDB;
6. calculate statistics.

### Starting a solve

User presses and holds Space.

State:

```text
idle -> holding
```

After 300 ms:

```text
holding -> ready
```

The visual state must clearly indicate that the timer is ready.

When Space is released:

```text
ready -> running
```

Record:

```ts
performance.now()
```

as the start timestamp.

### Cancelling an early hold

If the user releases Space before the ready threshold:

```text
holding -> idle
```

No solve starts.

### Running

During the solve:

- display elapsed time;
- use `requestAnimationFrame` for rendering;
- use `performance.now()` as the authoritative time source.

### Stopping

When the timer is running, pressing Space stops it.

Ignore auto-repeat keyboard events.

Calculate elapsed time.

Create a solve.

Persist it immediately to IndexedDB.

Display result actions.

Generate the next scramble.

### Result actions

For the last solve show:

```text
Note
+2
DNF
Delete
```

### +2

Applying +2 does not mutate `rawTimeMs`.

Example:

```text
rawTimeMs = 10521
penalty = PLUS_TWO
```

Effective displayed result:

```text
12.521+
```

If clicked again, implementation may toggle the penalty off.

A solve cannot simultaneously have `PLUS_TWO` and `DNF`.

### DNF

Set:

```text
penalty = DNF
```

The solve remains stored.

DNF must participate correctly in average calculations.

### Delete

Require a lightweight confirmation mechanism if accidental deletion is likely.

Deleting a solve recalculates statistics immediately.

### Note

Allow a short free-text note for a solve.

The timer must not react to Space while the note field is active.

## Solve model

Minimum local model:

```ts
type SolvePenalty = "NONE" | "PLUS_TWO" | "DNF";

interface Solve {
  id: string;
  event: "333";
  scramble: string;
  rawTimeMs: number;
  penalty: SolvePenalty;
  note: string | null;
  createdAt: string;
}
```

UUID should be generated client-side.

## Effective time

Conceptually:

```ts
function getEffectiveTimeMs(solve: Solve): number | null {
  if (solve.penalty === "DNF") {
    return null;
  }

  return solve.rawTimeMs +
    (solve.penalty === "PLUS_TWO" ? 2000 : 0);
}
```

Do not duplicate this logic throughout the application.

## Time display

Standard display:

```text
12.483
```

For one minute or more:

```text
1:03.582
```

+2 example:

```text
14.483+
```

DNF:

```text
DNF
```

Optionally show original time in detailed solve information:

```text
DNF (12.483)
```

## Statistics

### Best

Lowest non-DNF effective solve time.

### Mean

Arithmetic mean of all non-DNF solves in the current session.

DNF solves are excluded from simple mean for the initial MVP unless a different metric is explicitly implemented and documented.

### Average of N

For:

```text
ao5
ao12
ao100
```

follow standard speedcubing/WCA-style average logic:

1. take the most recent N results;
2. rank results by effective result;
3. remove best and worst according to the appropriate trim count;
4. average the remaining values.

For WCA-style trimming:

```text
5% rounded up
```

from each side.

Therefore:

```text
ao5   -> remove 1 best and 1 worst
ao12  -> remove 1 best and 1 worst
ao100 -> remove 5 best and 5 worst
```

DNF is worse than every numeric result.

If the number of DNFs remaining after trimming makes the average invalid, return DNF.

Statistics logic must be isolated and unit tested with edge cases.

If fewer than N solves exist:

```text
—
```

## IndexedDB

Use Dexie as a lightweight IndexedDB abstraction.

Suggested database:

```text
CubeTrainerDB
```

Minimum table:

```text
solves
```

Suggested index fields:

```text
id
createdAt
event
```

The UI must load existing solves after refresh.

## Offline behavior

The following must work completely offline after the app has loaded:

- timer;
- solve creation;
- solve editing;
- deletion;
- statistics;
- history.

## Accessibility

Important interactive controls must:

- be keyboard accessible;
- use buttons rather than clickable divs;
- have meaningful labels;
- maintain visible focus states.

## Responsive behavior

Primary design target:

```text
desktop >= 1280 px
```

The page should remain usable on laptop widths.

Mobile optimization is not part of the first MVP but layout must not catastrophically break.

## Tests

Minimum statistics test cases:

- normal ao5;
- +2 inside ao5;
- one DNF as removable worst;
- multiple DNFs causing DNF average;
- ao12;
- ao100 trimming;
- fewer than N solves;
- best calculation.

Minimum timer tests:

- idle -> holding;
- holding -> idle on early release;
- holding -> ready;
- ready -> running;
- running -> stopped;
- repeated keydown ignored;
- keyboard ignored when editing note.

Minimum persistence tests:

- save solve;
- update penalty;
- update note;
- delete solve;
- reload solves.

Minimum E2E flow:

1. open timer;
2. verify scramble exists;
3. start timer;
4. stop timer;
5. verify solve appears;
6. apply +2;
7. refresh page;
8. verify solve persists.
