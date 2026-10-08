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
- ao50;
- ao100;
- responsive layout;
- RU/EN localization with a remembered language preference;
- historical solve details with local date/time;
- the requested Results extension: full editable journal and filtered solve chart
  (see [UI.md](UI.md#results-page));
- accessible note/delete and enlarged-cube dialogs;
- concentration while running;
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

1. load solve history from IndexedDB; expose Retry on failure;
2. derive statistics from the loaded history;
3. generate the initial 3x3 scramble, then display its notation and cube;
4. the central timer displays:

```text
0.000
```

Historical results never become the central displayed result automatically.
Current scramble is generated anew on reload; it is not a persisted field.

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
performance.now();
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

Only the centered digits remain visible while Running. The surrounding interface
remains mounted but hidden and inert. Holding and Ready keep it visible. Stop
keydown restores it immediately, independently of release and saving; see [UI.md](UI.md).

### Stopping

When the timer is running, pressing any keyboard key stops it.

Ignore auto-repeat keyboard events.

Calculate elapsed time.

Create a solve.

Persist it immediately to IndexedDB.

Display result actions.

Generate the next scramble.

### Result actions

For the displayed result completed during the current page session show:

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

Clicking an already active +2 or DNF action toggles that penalty to NONE.

A solve cannot simultaneously have `PLUS_TWO` and `DNF`.

### DNF

Set:

```text
penalty = DNF
```

The solve remains stored.

DNF must participate correctly in average calculations.

### Delete

Use a compact native confirmation dialog identifying the selected solve, with
Delete/Cancel, Escape cancellation and initial focus on Cancel.

The history and statistics change after durable deletion succeeds. Deleting the
currently displayed result resets the timer to 0.000 and hides its actions;
deleting an older solve leaves the current result unchanged. A failed deletion
retains the record and exposes Retry.

### Note

Allow a free-text note of at most 300 UTF-16 code units for a solve, enforced
by the domain/application contract as well as the editor (see [DOMAIN.md](DOMAIN.md)).

The timer must not react to Space while the note field is active.

Use a compact native note dialog with initial textarea focus, current note,
Save/Cancel, Escape and a length counter. Dialog focus management follows
[UI.md](UI.md#existing-mvp-behavior); pointer task completion returns to the timer
after the outermost dialog closes, while keyboard tasks restore their opener.

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

  return solve.rawTimeMs + (solve.penalty === "PLUS_TWO" ? 2000 : 0);
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

Arithmetic mean of all stored non-DNF solves. Separate sessions are not implemented.

DNF solves are excluded from simple mean for the initial MVP unless a different metric is explicitly implemented and documented.

### Average of N

For:

```text
ao5
ao12
ao50
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
ao50  -> remove 3 best and 3 worst
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
