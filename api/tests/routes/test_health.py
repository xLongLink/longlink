import pytest
from httpx2 import AsyncClient
from contextlib import asynccontextmanager
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


@pytest.mark.no_db
async def test_readyz_returns_readiness_after_database_query(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Report readiness when the Platform database is available."""

    # Arrange
    queries: list[str] = []

    class Session:
        """Record readiness queries without opening a database connection."""

        async def execute(self, statement: object) -> None:
            """Capture the readiness statement."""

            queries.append(str(statement))

    @asynccontextmanager
    async def fake_session_scope():
        """Yield a disposable readiness session."""

        yield Session()

    monkeypatch.setattr(health, "session_scope", fake_session_scope)

    # Act
    response = await client.get("/api/v1/readyz")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ready": True}
    assert queries == ["SELECT 1"]
