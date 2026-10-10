# Cubium

Cubium is a client-server web application for Rubik's Cube speedsolving, training, statistics, algorithms, and blindfolded solving practice.

The main goal of the project is to provide a fast, keyboard-first Rubik's Cube timer and later extend it with BLD training, letter schemes, memo generation, Old Pochmann tools, and CFOP algorithms.

## Current project status

The project is currently focused on the MVP.

The MVP consists primarily of a high-quality 3x3 timer.

The Timer MVP is implemented: local history and statistics, penalties, notes,
deletion, historical details, RU/EN localization, cube enlargement and the
Light Protocol interface with Sports Stopwatch typography and running concentration.
The separate `/results` page adds a full editable journal, date/count filters,
and a solve chart with optional ao5/ao12 lines. Both pages share local history.
Local sessions separate both pages' histories, statistics and charts, with
creation, rename, archive/restore and confirmed deletion (see `docs/SESSIONS.md`).
The backend currently exposes liveness endpoints only. Accounts,
synchronization and the other training tools remain future work.

Future functionality is documented in `docs/ROADMAP.md`, but must not be implemented unless explicitly requested.

## Core product principles

1. Timer functionality must work without an internet connection.
2. Timer accuracy must never depend on network latency.
3. Solve results must be saved locally immediately.
4. Server synchronization is secondary to local persistence.
5. Business/domain logic should be separated from UI components.
6. Rubik's Cube domain logic should not be tightly coupled to React.
7. The UI should be optimized primarily for desktop keyboard usage.
8. The architecture should remain extensible for future BLD features.

## Tech stack

### Current frontend

- React
- React Router (Data Mode)
- TypeScript
- Vite
- IndexedDB
- Dexie
- cubing.js
- Vitest
- React Testing Library
- Playwright

### Current backend

- Python
- FastAPI
- Pydantic
- Pytest

### Current infrastructure

- GitHub Actions

Zustand and TanStack Query are planned technologies, not installed
MVP dependencies. The current timer uses a plain TypeScript application coordinator
and React subscriptions. SQLAlchemy, Alembic, PostgreSQL and Docker support are
also planned and are not required to run the current project.

Do not introduce additional major frameworks unless there is a clear technical reason.

In particular, do not introduce:

- Next.js
- Redux
- GraphQL
- Redis
- WebSockets
- Kubernetes
- microservices

unless explicitly requested.

## Architecture

Cubium uses a local-first architecture.

The browser is responsible for:

- measuring solve time;
- generating scrambles;
- displaying the scrambled cube;
- calculating statistics;
- storing solves locally;
- managing timer interaction;
- future BLD calculations.

The future backend will be responsible for:

- authentication;
- user accounts;
- synchronization;
- persistent cross-device storage;
- user settings;
- future server-side functionality.

See:

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/MVP.md`

## MVP

The initial MVP supports only 3x3 speedsolving.

Required functionality:

- generate a valid 3x3 scramble;
- show the scramble above the timer;
- show the resulting cube state as a 2D cube visualization;
- keyboard-controlled timer;
- save solve results;
- display recent solves;
- add +2 penalty;
- mark solve as DNF;
- delete solve;
- attach a note;
- calculate best;
- calculate mean;
- calculate ao5;
- calculate ao12;
- calculate ao50;
- calculate ao100;
- persist data in IndexedDB.

See `docs/MVP.md`.

## Scrambles

Use `cubing.js`.

For 3x3 scramble generation use the official library API based on:

```ts
randomScrambleForEvent("333");
```

Do not implement scramble generation manually unless there is a strong technical reason.

## Timer accuracy

Do not measure elapsed time by incrementing a counter with `setInterval`.

The authoritative time source must use:

```ts
performance.now();
```

`requestAnimationFrame` may be used to refresh the displayed value, but it must not be the source of truth for elapsed time.

Persist solve durations as integer milliseconds.

Example:

```text
12483
```

not:

```text
"12.483"
```

Formatting belongs to the presentation layer.

## Development

Frontend and backend must be independently runnable during development.

The default page is a working 3×3 Timer MVP: hold Space for 300 ms, release to
start, and press any keyboard key to stop. While running, only the timer digits
remain visible; stop keydown immediately restores the interface. The Timer
settings gear selects running precision (0–3 decimals) and result precision
(2 or 3), remembered locally without changing saved times. Reload restores
history and statistics while the central timer starts at `0.000`.
Select any recent solve to inspect its original scramble and local creation date/time,
edit +2/DNF, add a note (up to 300 UTF-16 code units), or delete it.
Notes and deletion use compact accessible dialogs. For result dialogs, closing
the outermost pointer-opened view returns focus to the timer; keyboard tasks
restore the opener. The enlarged cube always returns focus to the timer. Deleting
the displayed result resets the readout to zero without selecting an older time.
Click the cube to enlarge it. Russian is the default language; the RU/EN selector
remembers its preference locally. Statistics include ao50 and update locally.
Solves remain in the existing `CubeTrainerDB` IndexedDB database for compatibility;
the Cubium rename does not migrate or delete existing data.
Unit/API tests, browser workflows, linting, formatting, and CI are configured.

Prerequisites: Node.js 22.12+ (Node.js 24 is used in CI), npm, and Python 3.12+.
Vite's runtime requirements are documented in the [Vite guide](https://vite.dev/guide/).

Frontend:

```bash
cd frontend
npm install
npm run dev
```

and:

```bash
cd backend
python -m venv .venv
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

On Windows, activate the virtual environment with `.venv\Scripts\Activate.ps1`;
on macOS/Linux, use `source .venv/bin/activate` before installing dependencies.

The frontend runs at `http://localhost:5173`; the backend runs at
`http://localhost:8000`. Health endpoints: `/health` and `/api/v1/health`.
Interactive API documentation is available at `http://localhost:8000/docs`.
The frontend does not make backend requests or require a backend to start.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for verification commands.

When Docker support is implemented:

```bash
docker compose up --build
```

## Testing

All domain logic must have automated tests.

Particularly important:

- timer state transitions;
- statistics calculations;
- +2 handling;
- DNF handling;
- ao5 calculation;
- ao12 calculation;
- IndexedDB repository behavior;
- timer keyboard behavior.

Playwright covers complete solves, reload, penalties, note/delete dialogs,
pointer and keyboard focus, RU/EN dates, concentration and responsive layout.
See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for checks and manual scenarios.

## Code quality

Prefer:

- small focused modules;
- pure functions for calculations;
- explicit domain types;
- feature-oriented frontend structure;
- tests near important domain logic.

Avoid:

- giant React components;
- unnecessary abstractions;
- duplicated calculation logic;
- storing derived statistics in the database;
- network requests in timer-critical code.
