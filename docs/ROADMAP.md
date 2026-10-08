# Product roadmap

This file describes direction, not current implementation requirements.

Do not implement later phases unless explicitly requested.

## Current implementation

Phase 0 and the core Phase 1 Timer MVP are implemented. The Timer also includes
historical solve details, RU/EN localization, compact note/delete dialogs,
local creation date/time and Running concentration. Current behavior is documented
in [MVP.md](MVP.md), [UI.md](UI.md) and [TIMER.md](TIMER.md).
Sessions and Phases 2 onward remain future work; items already shipped are not
requirements to reimplement.

# Phase 0 — Repository foundation

Goal:

Create the development foundation.

Deliverables:

- frontend Vite + React + TypeScript;
- backend FastAPI skeleton;
- linting;
- formatting;
- testing;
- basic CI;
- `/api/v1/health`;
- development documentation.

# Phase 1 — Timer MVP

Goal:

Deliver a fully functional offline-first 3x3 timer.

Deliverables:

- scramble generation;
- 2D cube;
- accurate keyboard timer;
- IndexedDB solve history;
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
- unit tests;
- E2E timer test.

# Phase 2 — Sessions

Goal:

Support separate solve collections.

Features:

- create session;
- rename session;
- delete/archive session;
- switch current session;
- session-specific statistics.

# Phase 3 — Accounts and synchronization

Goal:

Provide cross-device persistence.

Features:

- register;
- login;
- logout;
- PostgreSQL;
- synchronized sessions;
- synchronized solves;
- settings synchronization;
- basic offline synchronization strategy.

# Phase 4 — Timer enhancements

Possible functionality:

- WCA inspection;
- configurable hold duration;
- keyboard preferences;
- more detailed statistics;
- expanded solve analysis beyond the existing historical details dialog;
- session export/import;
- PWA support.

# Phase 5 — CFOP algorithms

Features:

- PLL;
- OLL;
- algorithm visualization;
- multiple algorithms per case;
- learning status;
- filters.

# Phase 6 — BLD letter scheme

Features:

- sticker-based letter assignment;
- predefined letter schemes;
- custom schemes;
- edge buffer selection;
- corner buffer selection.

Before implementation, create a formal cube target/sticker model.

# Phase 7 — BLD memo and analysis

Features:

- edge tracing;
- corner tracing;
- cycle breaks;
- parity detection;
- letter memo;
- configurable buffers.

All algorithms require extensive domain tests.

# Phase 8 — Old Pochmann tools

Features:

- Old Pochmann edge solution;
- Old Pochmann corner solution;
- algorithm sequences;
- visual analysis.

# Phase 9 — BLD training scrambles

Possible filters:

- parity;
- no parity;
- number of targets;
- corner conditions;
- edge conditions;
- buffer-related conditions.

Training scrambles must be clearly distinguished from official competition scrambles.

# Phase 10 — Letter pairs

Features:

- generate possible useful memo letter pairs;
- filter impossible/meaningless transitions based on the formal cube model;
- personal word/image associations;
- training mode.

Do not encode BLD validity rules based only on assumptions.
