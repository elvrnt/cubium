# CubeTrainer

CubeTrainer is a client-server web application for Rubik's Cube speedsolving, training, statistics, algorithms, and blindfolded solving practice.

The main goal of the project is to provide a fast, keyboard-first Rubik's Cube timer and later extend it with BLD training, letter schemes, memo generation, Old Pochmann tools, and CFOP algorithms.

## Current project status

The project is currently focused on the MVP.

The MVP consists primarily of a high-quality 3x3 timer.

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

### Frontend

- React
- TypeScript
- Vite
- React Router
- Zustand
- TanStack Query
- IndexedDB
- Dexie
- cubing.js
- Vitest
- React Testing Library
- Playwright

### Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic
- Pytest

### Infrastructure

- Docker
- Docker Compose
- GitHub Actions

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

CubeTrainer uses a local-first architecture.

The browser is responsible for:

- measuring solve time;
- generating scrambles;
- displaying the scrambled cube;
- calculating statistics;
- storing solves locally;
- managing timer interaction;
- future BLD calculations.

The backend is responsible for:

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
- calculate ao100;
- persist data in IndexedDB.

See `docs/MVP.md`.

## Scrambles

Use `cubing.js`.

For 3x3 scramble generation use the official library API based on:

```ts
randomScrambleForEvent("333")
```

Do not implement scramble generation manually unless there is a strong technical reason.

## Timer accuracy

Do not measure elapsed time by incrementing a counter with `setInterval`.

The authoritative time source must use:

```ts
performance.now()
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

Expected commands should eventually include:

```bash
cd frontend
npm install
npm run dev
```

and:

```bash
cd backend
python -m venv .venv
pip install -e .
uvicorn app.main:app --reload
```

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

The MVP should also have at least one Playwright end-to-end flow covering a complete solve.

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
