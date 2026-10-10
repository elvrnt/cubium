# Local sessions

Timer and Results share one current session. Sessions, selection and solves are
stored locally in IndexedDB; no server or cross-tab synchronization is involved.

## Model and storage

`Session` contains `id`, `name`, `event: '333'`, UTC ISO `createdAt`, and nullable
UTC ISO `archivedAt`. Names are trimmed at the edges, require 1–80 UTF-16 code
units, preserve internal spacing and may repeat. User names are not translated.
`Solve.sessionId` is mandatory. Statistics and solve counts are derived only.

`CubeTrainerDB` version 2 retains the existing solves indexes and adds `sessionId`;
it adds `sessions` (`id`, `createdAt`) and `settings` (`key`). One upgrade
transaction creates the UUID session “Основная”, assigns all v1 solves to it and
stores `activeSessionId`. Every other solve field is preserved exactly. Fresh
databases seed the same default session. An upgrade failure rolls back; a blocked
upgrade asks the user to close another Cubium tab and Retry, never erase data.

## Repository and coordinator

`TrainingRepository` extends the existing solve operations with `loadSnapshot()`
and `mutateSession(SessionMutation)`. Mutations explicitly name create, rename,
select, archive, restore or delete. One shared Dexie connection performs them in
transactions across sessions, settings and solves. Solve save/update checks the
session exists and is active; update rejects changing session membership. Inputs
are copied before asynchronous solve writes.

The application exposes `createSession(name)`, `renameSession(id, name)`,
`selectSession(id)`, `archiveSession(id)`, `restoreSession(id)` and
`deleteSession(id)`. `loadHistory()` loads a single consistent snapshot without
generating a scramble. The coordinator retains all solves internally; public
`solves` and `statistics` describe only the current session. Public snapshots
also include immutable `sessions`, `activeSessionId`, derived `sessionSolveCounts`
and `editing`. `setEditingBlocked(boolean)` protects session operations while a
result editor is mounted. Existing result edits remain available inside it.

New solves capture the current session ID. Failed writes retain their exact
pending mutation for `retryPersistence()`; changes publish only after durable
success. Selection changes clear `displayedSolveId`, release a stopped timer
through its existing transition and preserve the current scramble. Session
operations reject holding, ready, running, unresolved writes and result editors.

Creating selects the new session. Archive/delete of the current session selects
the first remaining active session in creation order, then ID order for ties.
Archiving preserves all solves; restoring preserves the current choice. The last
active session cannot be archived/deleted. Deletion removes the session and its
solves atomically, including archived sessions. Loading repairs a missing or
archived saved choice by selecting the first active session.

## Interface and navigation

Both pages show a native active-session selector and Manage sessions under the
header. The manager uses the existing native modal, with a separate archive
section and a nested destructive confirmation showing name and solve count.
Cancel receives initial focus in the deletion confirmation. Retry preserves the
name draft and never creates a second session. Native Tab/Escape behavior and
pointer/keyboard focus restoration follow the result dialogs.

Pointer selection returns focus to neutral page content. Keyboard selection
restores focus to the selector after its pending write temporarily disables it.
Management suspends timer shortcuts and route changes. Session controls hide and
become inert while running; their measured height is included in timer centering.
Responsive wrapping retains 44px controls and avoids page overflow.

The active session is a database preference, not a URL parameter. Results resets
date/count/page/series parameters on session change to last 100, no dates, ao5 on
and ao12 off. This reset may update the query while the manager stays open; route
changes remain protected. Back/Forward restores filter URLs within the current
session. Archived history becomes viewable after restoration. There is no solve
transfer, combined-session analysis, export, backend or live tab synchronization.

## Verification

Tests cover fresh/v1 databases, unchanged legacy fields, migration rollback,
blocked upgrade, transactional cascade rollback, invalid saved selection,
session isolation, last-session protection, save/session Retry, timing/editor
guards, focus, RU/EN, responsive reflow, enlarged text and large local histories.
Run frontend unit/component tests, Playwright E2E, typecheck, lint, format check
and production build.
