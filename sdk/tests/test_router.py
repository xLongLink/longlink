import pytest
from fastapi import APIRouter
from pathlib import Path
from longlink import LongLink
from fastapi.testclient import TestClient

pytestmark = pytest.mark.usefixtures("solution_source")


def test_solution_router_preserves_explicit_api_prefix() -> None:
    """Expose Solution routes under their explicit API prefix."""

    # Arrange
    router = APIRouter(prefix="/api")

    @router.get("/sample")
    async def sample_get_endpoint() -> dict[str, str]:
        """Return a sample payload."""

        return {"message": "ok"}

    app = LongLink()
    app.include_router(router)

    client = TestClient(app)

    # Act
    response = client.get("/api/sample")
    root_response = client.get("/sample", headers={"accept": "application/json"})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}
    assert root_response.status_code == 404


def test_solution_route_overrides_frontend_fallback() -> None:
    """Serve a Solution route before the frontend fallback."""

    # Arrange
    solution_router = APIRouter()

    @solution_router.get("/settings")
    async def settings_get_endpoint() -> dict[str, str]:
        """Return Solution-owned settings."""

        return {"source": "solution"}

    app = LongLink()
    app.include_router(solution_router)
    client = TestClient(app)

    # Act
    response = client.get("/settings", headers={"accept": "text/html"})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"source": "solution"}
    assert "application/json" in response.headers["content-type"]


def test_solution_add_api_route_rejects_view_endpoint_overlap(solution_source: Path) -> None:
    """Reject a direct Solution route that would overlap a registered View endpoint."""

    # Arrange
    (solution_source / "views" / "dashboard.xml").write_text("<longlink>Dashboard</longlink>", encoding="utf-8")
    app = LongLink()
    original_routes = app.router.routes.copy()

    async def solution_dashboard() -> dict[str, str]:
        """Return the Solution dashboard resource."""

        return {"source": "solution"}

    # Act and assert
    with pytest.raises(ValueError, match="View endpoint.*overlaps a Solution route"):
        app.add_api_route("/views/dashboard", solution_dashboard, methods=["GET"])

    assert app.router.routes == original_routes
