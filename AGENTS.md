# CubeTrainer repository instructions

Read `README.md` and the relevant files in `docs/` before implementing significant changes.

## General rules

- Implement only the requested scope.
- Do not implement future roadmap features unless explicitly requested.
- Prefer simple, maintainable solutions over speculative abstractions.
- Preserve the local-first architecture.
- Timer operation must never depend on the backend.
- Keep Rubik's Cube domain logic independent from React where practical.
- Keep statistics calculations as pure functions.
- Do not store derived statistics such as ao5 or ao12 as persistent database fields.
- Use TypeScript strict typing.
- Avoid `any` unless unavoidable and documented.
- Do not silently change product requirements.
- Do not add major dependencies without explaining why they are necessary.

## Before changing code

Inspect:

1. relevant existing implementation;
2. related tests;
3. applicable files in `docs/`.

For significant features, briefly state the implementation plan before editing.

## Testing

After making changes:

- run relevant unit tests;
- run type checking;
- run linting if configured;
- run relevant integration/end-to-end tests;
- fix failures caused by the change.

Do not claim that something works without running the available verification commands.

## Frontend

Primary frontend technologies:

- React
- TypeScript
- Vite
- Zustand
- TanStack Query
- Dexie / IndexedDB
- cubing.js

Do not introduce Redux or Next.js without explicit approval.

## Backend

Primary backend technologies:

- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL

Do not introduce Django, GraphQL, Redis, WebSockets, or microservices without explicit approval.

## Timer

Timer timing must use `performance.now()`.

`requestAnimationFrame()` may update the displayed timer but must not determine elapsed time.

Do not use an incrementing `setInterval()` counter as the timer source of truth.

## Scrambles

Prefer `cubing.js` for official-style 3x3 random-state scramble generation.

## Documentation

If an implementation changes an architectural decision or public API contract, update the relevant documentation in `docs/`.

Do not duplicate large specifications into this file.
