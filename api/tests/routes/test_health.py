import pytest
from main import app
from httpx2 import AsyncClient, ASGITransport
from pathlib import Path
from src.database import session
from src.routes.v1 import health
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


@pytest.mark.no_db
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


@pytest.mark.no_db
async def test_readyz_returns_internal_error_when_database_query_fails(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Keep replicas unready when the Platform database cannot be queried."""

    # Arrange
    database_path = tmp_path / "unavailable.db"
    database_path.mkdir()
    engine = create_async_engine(URL.create("sqlite+aiosqlite", database=str(database_path)))
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(session, "Session", session_factory)
    client = AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
    )

    try:
        # Act
        async with client:
            response = await client.get("/api/v1/readyz")

        # Assert
        assert response.status_code == 500
        assert response.json() == {"detail": "An unexpected error occurred. Please try again later."}
        assert response.headers["cache-control"] == "no-store"
    finally:
        # Release the test-owned engine even if the readiness assertions fail.
        await engine.dispose()
