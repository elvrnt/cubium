import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.parametrize("path", ["/health", "/api/v1/health"])
def test_health(path: str) -> None:
    with TestClient(app) as client:
        response = client.get(path)

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["content-type"] == "application/json"


def test_health_routes_are_documented() -> None:
    with TestClient(app) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert response.json()["info"]["title"] == "Cubium API"
    for path in ("/health", "/api/v1/health"):
        assert "200" in paths[path]["get"]["responses"]
