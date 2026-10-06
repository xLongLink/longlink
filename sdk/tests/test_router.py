import pytest
from fastapi import APIRouter
from pathlib import Path
from longlink import LongLink
from fastapi.testclient import TestClient

pytestmark = pytest.mark.usefixtures("solution_source")


def test_solution_router_serves_prefixed_route_before_frontend_fallback() -> None:
    """Serve an included Solution route at its explicit prefix before frontend fallback."""

    # Arrange
    solution_router = APIRouter(prefix="/api")

    @solution_router.get("/settings")
    async def settings_get_endpoint() -> dict[str, str]:
        """Return Solution-owned settings."""

        return {"source": "solution"}

    app = LongLink()
    app.include_router(solution_router)
    client = TestClient(app)

    # Act
    with client:
        response = client.get("/api/settings", headers={"accept": "text/html"})
        root_response = client.get("/settings", headers={"accept": "application/json"})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"source": "solution"}
    assert "application/json" in response.headers["content-type"]
    assert root_response.status_code == 404


def test_solution_add_api_route_rejects_view_endpoint_overlap(solution_source: Path) -> None:
    """Reject a direct Solution route that would overlap a registered View endpoint."""

    # Arrange
    (solution_source / "views" / "dashboard.jsx").write_text(
        "export default function Dashboard() { return <Text>Dashboard</Text>; }", encoding="utf-8"
    )
    app = LongLink()
    original_routes = app.router.routes.copy()

    async def solution_dashboard() -> dict[str, str]:
        """Return the Solution dashboard resource."""

        return {"source": "solution"}

    # Act and assert
    with pytest.raises(ValueError, match="View endpoint.*overlaps a Solution route"):
        app.add_api_route("/views/dashboard", solution_dashboard, methods=["GET"])

    assert app.router.routes == original_routes


@pytest.mark.parametrize("route", [pytest.param("/views/dashboard", id="static-route"), pytest.param("/views/{view}", id="dynamic-route")])
def test_solution_router_include_rolls_back_routes_before_a_view_collision(solution_source: Path, route: str) -> None:
    """Leave no routes registered when a later included route overlaps a View."""

    # Arrange
    (solution_source / "views" / "dashboard.jsx").write_text(
        "export default function Dashboard() { return <Text>Dashboard</Text>; }", encoding="utf-8"
    )
    router = APIRouter()

    @router.get("/safe")
    async def safe_endpoint() -> dict[str, str]:
        """Return a route that must be rolled back with the colliding route."""

        return {"source": "solution"}

    router.add_api_route(route, safe_endpoint, methods=["GET"])

    app = LongLink()
    original_routes = app.router.routes.copy()

    # Act and assert
    with pytest.raises(ValueError, match="View endpoint.*overlaps a Solution route"):
        app.include_router(router)

    # Assert
    assert app.router.routes == original_routes
