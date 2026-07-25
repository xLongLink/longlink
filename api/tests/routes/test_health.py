import pytest
from httpx2 import AsyncClient

pytestmark = pytest.mark.no_db


async def test_healthz_returns_ok(client: AsyncClient) -> None:
    """Expose a liveness endpoint for the API."""

    # Act
    response = await client.get("/api/healthz")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"alive": True}
