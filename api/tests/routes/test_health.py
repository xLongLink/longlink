import pytest
from httpx2 import AsyncClient
from src.routes.v1 import health


async def test_healthz_returns_liveness_without_database_access(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Report liveness without requiring a database connection."""

    # Arrange
    def unexpected_session_scope() -> object:
        """Fail if liveness opens a database session."""

        raise AssertionError("liveness accessed the database")

    monkeypatch.setattr(health, "session_scope", unexpected_session_scope)

    # Act
    response = await client.get("/api/v1/healthz")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"alive": True}


async def test_readyz_returns_readiness_after_database_query(client: AsyncClient) -> None:
    """Report readiness when the Platform database is available."""

    # Act
    response = await client.get("/api/v1/readyz")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ready": True}
