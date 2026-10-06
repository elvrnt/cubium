# Solve, statistics, timer, and scramble domain

The framework-independent TypeScript modules in `frontend/src/domain/` are pure
functions. They have no UI, state-store, database, network, or clock dependencies.
All operations preserve input arrays and solve objects. Statistics are derived
values and must not be persisted.

## Solve API

Import from `frontend/src/domain/solves/index.ts`:

- `Solve` and `SolvePenalty`: the MVP model from `MVP.md`, with camelCase fields.
- `getEffectiveTimeMs(solve): number | null`: raw milliseconds, raw + 2000 for
  `PLUS_TWO`, or `null` for `DNF`. This is the authoritative penalty calculation.
- `setSolvePenalty(solve, penalty): Solve`: returns a new object with the chosen
  penalty. `NONE` removes it; applying the same penalty again does not accumulate
  it. Switching between +2 and DNF replaces the previous penalty.
- `compareSolves(left, right): number`: ascending effective result, with DNF
  after every numeric result. Equal numeric results and pairs of DNFs compare
  equal, regardless of raw duration or timestamp.
- `compareSolvesChronologically(left, right): number`: oldest instant first,
  then id in ascending code-unit order. Used by both statistics and persistence.
- `formatTimeMs(timeMs): string`: `s.mmm` below one minute, otherwise `m:ss.mmm`.
  Minutes continue past 59. Negative or non-finite inputs throw `RangeError`.
- `formatSolveTime(solve): string`: effective duration with a trailing `+` for
  `PLUS_TWO`, or `DNF`.
- `MAX_SOLVE_NOTE_LENGTH = 300` and `setSolveNote(solve, note)`: copy with the
  exact string or null, rejecting oversized strings with `RangeError`. Length is
  measured in UTF-16 code units, matching JavaScript `string.length` and HTML
  `maxLength` (some emoji use multiple units). No truncation or normalization.

## Statistics API

Import from `frontend/src/domain/statistics/index.ts`:

- `calculateBest(solves): number | null`: lowest non-DNF effective time.
- `calculateMean(solves): number | null`: arithmetic mean of all non-DNF effective
  times. DNFs are excluded from both the sum and the divisor.
- `calculateAverageOf(solves, count): AverageResult`: the latest N solves, ranked
  by effective result, with `ceil(N * 0.05)` removed from each end. A retained
  DNF makes the average DNF. `count` must be a safe integer of at least 3;
  invalid counts throw `RangeError`, including for empty input.
- `calculateAo5`, `calculateAo12`, `calculateAo50`, `calculateAo100`: thin wrappers
  over the generic average, trimming 1, 1, 3, and 5 results respectively from each
  end. ao50 selects the latest 50 and averages the remaining 44; up to three DNFs
  can be discarded as the worst results, but any retained DNF makes it DNF.

`best` and `mean` return `null` when there are no valid numeric results.
The `AverageResult` discriminated union distinguishes all three average states:

```ts
type AverageResult =
  | { status: 'OK'; timeMs: number }
  | { status: 'DNF' }
  | { status: 'INSUFFICIENT_DATA' };
```

Not enough solves always yields `INSUFFICIENT_DATA`, even if all available solves
are DNF. A sufficient window containing only DNFs yields `DNF`.

## Chronology, precision, and input contract

The latest N are selected by the instant represented by `createdAt`, before
ranking results. Equivalent ISO timestamps with different offsets represent the
same instant. Ties are resolved by ascending `id` using JavaScript string
code-unit order, independently of locale and input order. Higher ids are treated
as later when timestamps tie. Storage should use UTC ISO timestamps.

Domain callers provide valid solves: unique ids, non-negative integer
`rawTimeMs`, supported penalties, and valid ISO timestamps with a timezone.
This layer does not parse or validate untrusted solve records; validation belongs
at a future data-entry/import/storage boundary. Inputs need not be sorted.

Statistics retain fractional milliseconds; there is no intermediate or final
rounding in numeric calculations. Formatting applies `Math.round` once to the
whole duration (nearest millisecond, half up) before splitting minutes, seconds,
and milliseconds. This handles carry into a new second or minute. Formatting
never changes source data. Standard JavaScript number precision applies.

## Scramble contract

`domain/scramble` exports `Scramble` (readonly `event: '333'` and
`notation: string`) and `ScrambleGenerator.generate333(): Promise<Scramble>`.
The contract contains no cubing.js types. Each generation returns a new object;
the adapter preserves the notation string and rejects empty/whitespace-only
output. Other generation errors propagate unchanged, without retries or fallback
scrambles. cubing.js is the authority for generated notation validity.

The caller owns the current scramble. The [timer application coordinator](TIMER.md#application-coordinator)
retains the same scramble through start, completion, and persistence before
replacing it. The domain primitives themselves have no lifecycle or persistence
dependencies.
See [ARCHITECTURE.md](ARCHITECTURE.md#scramble-generation) for the library boundary.

## Tests

The timer API and scheduling contract are documented in [TIMER.md](TIMER.md).

Colocated Vitest tests cover effective results, all penalty transitions,
formatting boundaries, comparison, best, mean, ao5/12/50/100, DNF trimming,
insufficient data, generic window sizes, chronology, timestamp ties, precision,
and immutability. Domain test files select the Node environment.

From `frontend`, run `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check`, and `npm run build`.
