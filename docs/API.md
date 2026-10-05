# API specification

## Status

Most API functionality is future scope.

The timer MVP must not depend on these endpoints.

## Base path

```text
/api/v1
```

## Health

### GET /api/v1/health

`GET /health` is also available as an unversioned liveness endpoint with the
same response. Both endpoints are implemented in the repository foundation.
They report process liveness and do not check a database or external services.

Response:

```json
{
  "status": "ok"
}
```

No authentication required.

## Future authentication API

Possible endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/me
```

Do not implement authentication during timer MVP unless explicitly requested.

## Future solve API

```text
GET    /api/v1/solves
POST   /api/v1/solves
PATCH  /api/v1/solves/{solve_id}
DELETE /api/v1/solves/{solve_id}
```

### POST /api/v1/solves

Possible request:

```json
{
  "id": "client-generated-uuid",
  "session_id": "uuid",
  "event": "333",
  "scramble": "R U2 F' ...",
  "raw_time_ms": 12483,
  "penalty": "NONE",
  "note": null,
  "created_at": "2026-10-05T15:00:00Z"
}
```

Response:

```json
{
  "id": "client-generated-uuid",
  "event": "333",
  "scramble": "R U2 F' ...",
  "raw_time_ms": 12483,
  "penalty": "NONE",
  "note": null,
  "created_at": "2026-10-05T15:00:00Z",
  "updated_at": "2026-10-05T15:00:00Z"
}
```

## Future sessions API

```text
GET    /api/v1/sessions
POST   /api/v1/sessions
PATCH  /api/v1/sessions/{session_id}
DELETE /api/v1/sessions/{session_id}
```

## Future settings API

```text
GET   /api/v1/settings
PATCH /api/v1/settings
```

## General API principles

- JSON request/response;
- ISO 8601 timestamps;
- UUID entity identifiers;
- appropriate HTTP status codes;
- validation through Pydantic;
- no internal stack traces in API responses;
- OpenAPI documentation provided by FastAPI.
