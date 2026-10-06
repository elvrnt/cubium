# Data model

## Principle

Persist source data, not derived statistics.

Do not store:

- best;
- mean;
- ao5;
- ao12;
- ao50;
- ao100.

Calculate them from solves.

The implemented TypeScript solve model, pure operations, statistics result
types, chronology, and rounding contracts are described in [DOMAIN.md](DOMAIN.md).
The [timer application coordinator](TIMER.md#application-coordinator) creates
these source records from completed timer results, rounding once before saving,
and retains failed mutations in memory for explicit retry.

## MVP local entities

### Solve

```text
Solve

id              UUID
event           string
scramble        string
raw_time_ms     integer
penalty         enum
note            nullable string
created_at      timestamp
```

Penalty:

```text
NONE
PLUS_TWO
DNF
```

### IndexedDB persistence

The database is named `CubeTrainerDB`. Its initial Dexie version is **1**, with
one store and the schema declaration:

```ts
database.version(1).stores({ solves: 'id, createdAt, event' });
```

Cubium deliberately keeps `CubeTrainerDB` as an internal compatibility identifier.
The product rename leaves the database, version and records unchanged; no migration
or deletion is performed. Language preferences use localStorage; selected history
and displayed-result identity are transient and do not add persistent fields.
New note edits are validated in the application/domain contract against
`MAX_SOLVE_NOTE_LENGTH` (300 UTF-16 code units; see [DOMAIN.md](DOMAIN.md)). Existing
records are not rewritten or truncated when loaded.

`id` is the unique, non-auto-incrementing primary key supplied by the caller.
`createdAt` and `event` are non-unique secondary indexes for chronological and
event-based queries. No compound or speculative indexes are defined. The store
contains the existing domain `Solve` with camelCase field names, including
`rawTimeMs` and `createdAt`. Only its seven source fields are written; additional
properties such as effective times or statistics are excluded.

The public API is exported from `frontend/src/infrastructure/persistence/index.ts`:

```ts
const repository = createSolveRepository(); // CubeTrainerDB by default
```

The factory accepts an optional database name for isolated tests. It opens the
browser's real IndexedDB lazily on the first operation; importing the module has
no database side effects. Consumers use `SolveRepository`, which exposes no
Dexie types or tables. The internal schema definition is in `database.ts`, where
future Dexie versions can be added when required.

| Method | Contract |
| --- | --- |
| `getAll()` | Returns `Promise<Solve[]>`, oldest to newest. |
| `getById(id)` | Returns `Promise<Solve \| undefined>`. |
| `save(solve)` | Inserts the complete source record; duplicate IDs reject and do not overwrite. |
| `update(solve)` | Writes all supplied source fields to an existing record atomically. Unknown IDs reject with `SolveNotFoundError`, never insert. |
| `delete(id)` | Deletes by ID; unknown IDs are a successful no-op. |
| `clear()` | Removes all solves, keeping the store and connection usable. No UI action is provided. |
| `close()` | Releases the connection without deleting data. Later operations on this instance reject; create another repository to reopen. |

All methods except `close()` are asynchronous; write methods resolve with `void`.
IndexedDB/Dexie failures propagate as rejected promises without retries or
fallback storage. No backend connection is involved.

`update(solve)` accepts a complete immutable domain snapshot, so callers can pass
the result of `setSolvePenalty(solve, penalty)` or `{ ...solve, note }`. Values
unchanged in the snapshot are preserved. The repository does not interpret
penalties or recompute times. This is a full-snapshot update, not a patch or
merge: callers should update from their latest record; stale snapshots may
overwrite other changes. There is no concurrency/conflict-resolution layer.

`getAll()` uses the shared domain `compareSolvesChronologically`: actual timestamp
instants ascending, then IDs ascending in code-unit order. It sorts retrieved
records in memory because an IndexedDB string index sorts ISO text, which would
not match instant ordering for differing timezone offsets. Timestamp strings are
preserved exactly. The [domain input contract](DOMAIN.md) applies: callers supply
valid solves with unique IDs, non-negative integer durations, and valid ISO
timestamps with a timezone. This repository is not an untrusted-data importer.

Inputs are copied to source-field snapshots before asynchronous writes; results
are detached IndexedDB records. Editing a returned object does not persist it
until `update` is called. Closing and reopening the same database preserves data.

Integration tests use `fake-indexeddb` only in the test module, a unique database
name per test, and deletion during cleanup. They cover schema, CRUD, penalty and
note updates, ordering, duplicate/missing IDs, error propagation, immutability,
exclusion of derived fields, and reopening the database.

## Future backend entities

### User

```text
id
email
password_hash
created_at
updated_at
```

Never store plaintext passwords.

### Session

```text
id
user_id
name
event
created_at
updated_at
```

Examples:

```text
3x3 Main
OH Practice
BLD
Morning Practice
```

### Solve

Future server-side version:

```text
id
user_id
session_id
event
scramble
raw_time_ms
penalty
note
created_at
updated_at
```

Client-generated UUID should be accepted so offline-created solves can synchronize without replacing their identity.

### UserSettings

Possible future fields:

```text
id
user_id
theme
timer_hold_ms
inspection_enabled
created_at
updated_at
```

### LetterScheme

Future BLD entity.

```text
id
user_id
name
is_default
created_at
updated_at
```

### LetterAssignment

Future BLD entity.

Represents a letter assigned to a specific sticker/target.

Do not design the exact cube sticker identifier format until BLD domain modeling begins.

## Synchronization

Future synchronization should be designed around stable UUIDs and update timestamps.

Do not implement a complicated distributed conflict resolution system during MVP.

A simple last-write/update strategy may be evaluated when synchronization is implemented.
