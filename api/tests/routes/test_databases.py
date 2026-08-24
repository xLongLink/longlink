import pytest
from uuid import uuid4
from types import SimpleNamespace
from httpx2 import AsyncClient
from fastapi import HTTPException
from factories import create_organization, create_ready_infrastructure
from src.routes.v1 import databases
from unittest.mock import AsyncMock
from sqlalchemy.exc import OperationalError
from src.models.databases import DatabaseRegistryCreate
from src.models.pagination import Pagination


async def test_database_handlers_delegate_creation_and_listing() -> None:
    """Create and list database registries through their persistence service."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry = SimpleNamespace(id=uuid4())
    payload = DatabaseRegistryCreate(
        name="Database",
        host="database.example",
        port=5432,
        username="admin",
        password="secret",
        sslmode="require",
    )
    pagination = Pagination()
    original_create = databases.database.create
    original_fetch_page = databases.database.fetch_page
    create = AsyncMock(return_value=registry)
    fetch_page = AsyncMock(return_value=([registry], 1))
    databases.database.create = create
    databases.database.fetch_page = fetch_page

    try:
        # Act
        created = await databases.create_database_registry(payload, session)
        page = await databases.list_database_registries(pagination, session)
    finally:
        databases.database.create = original_create
        databases.database.fetch_page = original_fetch_page

    # Assert
    assert created is registry
    assert page == {"items": [registry], "total": 1}
    create.assert_awaited_once_with(
        session, payload.name, payload.host, payload.port, payload.username, payload.password, payload.sslmode
    )
    fetch_page.assert_awaited_once_with(session, pagination)
    session.commit.assert_awaited_once()


async def test_database_handlers_return_registry_or_not_found_errors() -> None:
    """Return a database registry and exact errors for missing lookups and deletions."""

    # Arrange
    registry_id = uuid4()
    registry = SimpleNamespace(id=registry_id)
    found_session = SimpleNamespace(get=AsyncMock(return_value=registry))
    missing_session = SimpleNamespace(get=AsyncMock(return_value=None))
    delete_session = SimpleNamespace(commit=AsyncMock())
    original_delete = databases.database.delete
    databases.database.delete = AsyncMock(return_value=False)

    try:
        # Act
        result = await databases.get_database_registry(registry_id, found_session)
        with pytest.raises(HTTPException) as get_exc:
            await databases.get_database_registry(registry_id, missing_session)
        with pytest.raises(HTTPException) as delete_exc:
            await databases.delete_database_registry(registry_id, delete_session)
    finally:
        databases.database.delete = original_delete

    # Assert
    assert result is registry
    assert get_exc.value.status_code == 404
    assert get_exc.value.detail == "Database registry not found"
    assert delete_exc.value.status_code == 404
    assert delete_exc.value.detail == "Database registry not found"
    delete_session.commit.assert_not_awaited()


@pytest.mark.parametrize(
    ("registry", "usage", "expected_status", "expected_detail"),
    [
        pytest.param(None, None, 404, "Database registry not found", id="missing-registry"),
        pytest.param(
            SimpleNamespace(host="database.example", port=5432, username="admin", password="secret", sslmode="require"),
            OperationalError("SELECT", {}, RuntimeError("database offline")),
            503,
            "Database usage unavailable",
            id="backend-unavailable",
        ),
    ],
)
async def test_get_database_usage_returns_exact_errors(
    monkeypatch: pytest.MonkeyPatch,
    registry: object | None,
    usage: OperationalError | None,
    expected_status: int,
    expected_detail: str,
) -> None:
    """Return exact errors for missing registries and unavailable database backends."""

    # Arrange
    registry_id = uuid4()
    session = SimpleNamespace(get=AsyncMock(return_value=registry))

    class FakePostgres:
        """Raise the configured backend failure when usage is requested."""

        def __init__(self, *_args: object) -> None:
            """Accept database connection details."""

        async def usage(self) -> int:
            """Raise the configured adapter error."""

            assert usage is not None
            raise usage

    monkeypatch.setattr(databases, "Postgres", FakePostgres)

    # Act
    with pytest.raises(HTTPException) as exc:
        await databases.get_database_usage(registry_id, session)

    # Assert
    assert exc.value.status_code == expected_status
    assert exc.value.detail == expected_detail


async def test_get_database_usage_returns_adapter_usage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return the live usage reported by the configured database adapter."""

    # Arrange
    registry_id = uuid4()
    registry = SimpleNamespace(
        host="database.example", port=5432, username="admin", password="secret", sslmode="require"
    )
    session = SimpleNamespace(get=AsyncMock(return_value=registry))

    class FakePostgres:
        """Return a fixed usage value from the external database boundary."""

        def __init__(self, *_args: object) -> None:
            """Accept database connection details."""

        async def usage(self) -> int:
            """Return the configured live usage."""

            return 42

    monkeypatch.setattr(databases, "Postgres", FakePostgres)

    # Act
    usage = await databases.get_database_usage(registry_id, session)

    # Assert
    assert usage == 42


async def test_delete_database_registry_commits_successful_deletion() -> None:
    """Commit after deleting an unused database registry."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry_id = uuid4()
    original_delete = databases.database.delete
    delete = AsyncMock(return_value=True)
    databases.database.delete = delete

    try:
        # Act
        await databases.delete_database_registry(registry_id, session)
    finally:
        databases.database.delete = original_delete

    # Assert
    delete.assert_awaited_once_with(session, registry_id)
    session.commit.assert_awaited_once()


@pytest.mark.parametrize(
    ("usage", "expected_status", "expected_payload"),
    [
        pytest.param(42, 200, 42, id="available"),
        pytest.param(
            OperationalError("SELECT", {}, RuntimeError("database offline")),
            503,
            {"detail": "Database usage unavailable"},
            id="backend-unavailable",
        ),
    ],
)
async def test_database_usage_endpoint_returns_usage_or_unavailable(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    usage: int | Exception,
    expected_status: int,
    expected_payload: int | dict[str, str],
) -> None:
    """Return backend usage or a stable error when inspection fails."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()

    class FakePostgres:
        """Provide database usage responses for the endpoint."""

        def __init__(self, *_args: object) -> None:
            """Accept database registry connection fields."""

        async def usage(self) -> int:
            """Return usage or raise the configured backend failure."""

            if isinstance(usage, Exception):
                raise usage
            return usage

    monkeypatch.setattr("src.routes.v1.databases.Postgres", FakePostgres)

    # Act
    response = await client.get(f"/api/v1/databases/{infrastructure.database.id}/usage")

    # Assert
    assert response.status_code == expected_status
    assert response.json() == expected_payload


async def test_database_usage_endpoint_rejects_missing_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject an absent database registry."""

    # Arrange
    registry_id = uuid4()

    # Act
    response = await clients[0].get(f"/api/v1/databases/{registry_id}/usage")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Database registry not found"}


async def test_database_usage_endpoint_rejects_regular_users_before_connecting(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Require administrator access before opening a database adapter."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    def unexpected_postgres(*_args: object) -> object:
        """Fail if authorization reaches the database boundary."""

        raise AssertionError("Postgres adapter was constructed")

    monkeypatch.setattr("src.routes.v1.databases.Postgres", unexpected_postgres)

    # Act
    response = await clients[1].get(f"/api/v1/databases/{infrastructure.database.id}/usage")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_database_registry_creation_uses_required_ssl_by_default(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Use the secure SSL mode when the registry payload omits it."""

    # Arrange
    payload = {
        "name": "Default TLS database",
        "host": "database.example",
        "port": 5432,
        "username": "admin",
        "password": "database-secret",
    }
    # Act
    response = await clients[0].post("/api/v1/databases", json=payload)

    # Assert
    assert response.status_code == 201
    assert response.json()["sslmode"] == "require"


async def test_database_registry_list_and_detail_omit_password(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return paginated database metadata without administrator credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    list_response = await clients[0].get("/api/v1/databases")
    detail_response = await clients[0].get(f"/api/v1/databases/{infrastructure.database.id}")

    # Assert
    expected_registry = {
        "id": str(infrastructure.database.id),
        "name": infrastructure.database.name,
        "host": "database.example",
        "port": 5432,
        "sslmode": "disable",
        "username": "admin",
    }
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected_registry], "total": 1}
    assert detail_response.status_code == 200
    assert detail_response.json() == expected_registry


async def test_database_registry_deletion_rejects_organization_assignment(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users,
) -> None:
    """Keep a database registry assigned to an Organization available."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[1], infrastructure=infrastructure)

    # Act
    response = await clients[0].delete(f"/api/v1/databases/{infrastructure.database.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Database registry is used by organizations"}
