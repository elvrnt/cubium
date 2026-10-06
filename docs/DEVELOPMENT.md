# Development and verification

## Current scope

The main page remains a React placeholder alongside FastAPI liveness routes.
Pure solve/statistics/timer modules, IndexedDB persistence, scramble generation,
and a reusable 2D cube visualization are implemented. A plain TypeScript timer
application coordinator connects timer results, scramble ownership, Solve
creation, persistence, editing and derived statistics. Its deterministic tests
inject fake repositories, generators and clocks; they do not retest Dexie/cubing.
The existing dev preview remains dedicated to scramble visualization. The final
timer page, authentication, and synchronization remain future work.
Frontend and backend can be run and tested independently.

## Frontend

Use Node.js 22.12+ and npm. CI uses Node.js 24.

```bash
cd frontend
npm ci
npm run dev
```

Verification:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest and React Testing Library run component/unit tests in jsdom. Test files
are colocated as `src/**/*.test.ts` or `src/**/*.test.tsx`.
Playwright tests live in `e2e/`. The browser smoke test serves the production
build with Vite preview on port 4173, so build before running it. No backend
is started for this test. On Linux CI, install Chromium with
`npx playwright install --with-deps chromium`.

Use `npm run test:watch` during development and `npm run format` to format files.
The committed npm lockfile supports reproducible frontend installs.

### Scramble development preview

Open `/cube-preview.html` on the Vite dev server, or run `npm run build` and
`npm run preview` to inspect the production bundle. This separate small entry
shows loading/ready/error states, scramble text, a static 2D cube, and an explicit
generate/retry button. It has no timer or persistence integration. Both entries
are included in the production build so cubing worker packaging is exercised.

Generation and visualization unit tests mock the cubing boundary, without random
expectations or real workers. A Chromium smoke test checks real production-worker
generation, matching text/visualization input, and browser errors without assuming
any particular random scramble. Manually check that generation updates both text
and cube, the cube is scrambled, no player controls appear, and the console is
free of errors. The library includes large optional lazy chunks; Vite may report
its default chunk-size warning even though the build succeeds.

## Backend

Use Python 3.12+ and a project-local virtual environment:

```bash
cd backend
python -m venv .venv
```

Activate `.venv` with `.venv\Scripts\Activate.ps1` in PowerShell or
`source .venv/bin/activate` on macOS/Linux, then run:

```bash
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload
```

Verification:

```bash
python -m pytest
python -m ruff check .
python -m ruff format --check .
python -m mypy
python -m build
```

Pytest exercises both health routes and the OpenAPI schema through FastAPI's
HTTP TestClient. Tests are in `backend/tests/`. Health is process liveness,
independent of a database. `python -m build` produces a wheel and source
distribution in `backend/dist/`. Use `python -m ruff format .` to format Python.

## CI

`.github/workflows/ci.yml` runs frontend lint, formatting, unit tests, type
checking/build, and Chromium smoke tests, plus backend lint, formatting, strict
type checking, API tests, and packaging. No database or external service is needed.
