from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CubeTrainer API", version="0.1.0")


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/health", response_model=HealthResponse, tags=["health"])
@app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Report process liveness without requiring a database or other services."""
    return HealthResponse()
