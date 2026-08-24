import pytest
from httpx2 import ASGITransport, AsyncClient
from contextlib import asynccontextmanager
from main import app
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
    class Session:
        """Accept readiness queries without opening a database connection."""

        async def execute(self, _statement: object) -> None:
            """Accept the readiness statement."""

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


@pytest.mark.no_db
async def test_readyz_returns_internal_error_when_database_query_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep replicas unready when the Platform database cannot be queried."""

    # Arrange
    class Session:
        """Fail the readiness query without opening a database connection."""

        async def execute(self, _statement: object) -> None:
            """Simulate an unavailable Platform database."""

            raise RuntimeError("database unavailable")

    @asynccontextmanager
    async def failing_session_scope():
        """Yield one session that cannot execute readiness queries."""

        yield Session()

    monkeypatch.setattr(health, "session_scope", failing_session_scope)

    # Act
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/readyz")

    # Assert
    assert response.status_code == 500
