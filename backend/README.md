# CubeTrainer backend

Minimal FastAPI application with `GET /health` and `GET /api/v1/health`.
Both return `{"status":"ok"}` without authentication or a database connection.

Install with `python -m pip install -e ".[dev]"` in a Python 3.12+ virtual
environment, then run `python -m uvicorn app.main:app --reload`.

See [development documentation](../docs/DEVELOPMENT.md) for testing, linting,
type checking, and packaging commands.
