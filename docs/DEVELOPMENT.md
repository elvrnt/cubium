# Development and verification

## Current scope

The main page is the usable React Timer MVP alongside FastAPI liveness routes.
Pure solve/statistics/timer modules, IndexedDB persistence, scramble generation,
and a reusable 2D cube visualization are implemented. A plain TypeScript timer
application coordinator connects timer results, scramble ownership, Solve
creation, persistence, editing and derived statistics. Its deterministic tests
inject fake repositories, generators and clocks; they do not retest Dexie/cubing.
The React screen binds the coordinator and provides keyboard timing, result
editing, statistics, history and error retries. It uses Light Protocol appearance,
locally bundled Sports Stopwatch fonts and concentration while Running.
Authentication and synchronization
remain future work. The separate dev preview remains dedicated to scrambles.
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
Playwright tests live in `e2e/`. The browser suite serves the production
build with Vite preview on port 4173, so build before running it. No backend
is started for these tests. Locally the suite may reuse a server already on port
4173; stop an outdated preview before testing a new build. On Linux CI, install Chromium with
`npx playwright install --with-deps chromium`.

Use `npm run test:watch` during development and `npm run format` to format files.
The committed npm lockfile supports reproducible frontend installs.

### Timer verification

Open `/` for the production Timer screen. Hold Space until Ready, release to
start, then press/release any keyboard key to stop. Recent results and statistics update after
local save. Note/+2/DNF/Delete target the result identified by the action caption;
select any recent result to edit its historical record. Reload to verify history,
penalties and notes persist while the central timer resets to 0.000 and its
actions disappear. Scramble is generated anew. Notes and deletion use compact
native dialogs; selected details show local date/time from the original `createdAt`.
Space in editors and on explicitly focused buttons keeps native behavior.
After a pointer-opened outer result dialog closes, focus returns to the neutral timer
workspace; keyboard-opened result dialogs restore their opener. The enlarged
cube always returns to the timer. Nested editors return
to details until that view closes. See [UI.md](UI.md#existing-mvp-behavior).

Component tests cover Strict Mode initialization/subscription cleanup, controller
event translation, repeats, early hold callbacks, blur cancellation, protected
editing targets, animation-frame cleanup, formatting, actions and retries, plus
reload without a displayed historical result, dialog editing and RU/EN dates.
Playwright runs the real production app with isolated browser storage: complete
solves, reload, +2, DNF, notes, deletion, repeats, no-scroll input and viewport
checks. It waits for visible Ready rather than depending on an exact sleep, and
does not assert exact real wall-clock solve durations. The long-readout regression
advances an actual solve with Playwright's fake browser clock, preserving the
production performance.now() path without real waiting. Layout screenshots are written
to ignored `test-results/` output. The standalone scramble preview smoke test is
retained. Two workers limit concurrent cubing worker startup.

Polish checks cover Cubium branding, RU default and both language switches,
preference reload, native cube dialog/Escape/focus return, historical scramble
isolation, a persisted 300-character note, penalty edits and deletion of older
versus displayed results. Unit tests cover ao50 trimming/DNFs/latest-window/+2,
note lengths 299/300/301, and validation before repository writes. jsdom component
tests stub native dialog opening; Playwright verifies real browser modal behavior,
Tab wrapping, note Save/Cancel/Escape, confirmation cancellation, history pointer
close followed immediately by Space, and keyboard opener restoration/activation.
Console/page errors are monitored in browser regressions. Test coverage is not a
claim of a complete manual run.

Manual checklist:

- Complete two solves, reload, and verify unchanged history/statistics with a
  central 0.000, no result actions and a current scramble/cube.
- Complete another solve. Open Note, verify its draft/counter and focus, insert
  spaces, then exercise Save, Cancel and Escape. Space must work for timing
  after closing the outer dialog; editing must never start the timer.
- Open Delete and exercise Cancel/Escape, then confirm deletion. Deleting
  displayed B after A leaves A in history and resets the central timer to 0.000;
  deleting A instead preserves B.
- Open an older result with the pointer, check its original scramble and date,
  close details and immediately hold Space. The result must not reopen.
- Repeat with Tab and Enter/Space. Close should restore the keyboard opener;
  Tab navigation and native button activation remain available.
- Check RU/EN creation dates in the browser's local timezone, enlarge/close the
  cube, switch language by pointer and keyboard, and inspect the console.
- Check holding/ready versus Running concentration at 1440×900, 1280×720,
  1024×768, 390×844 and 320×800, plus enlarged text. Automated zoom cases use
  equivalent CSS viewport sizes; actual browser zoom needs a separate manual check.

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
