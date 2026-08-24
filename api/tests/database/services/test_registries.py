import pytest
from uuid import UUID, uuid4
from factories import queue_operation, create_organization, create_ready_infrastructure
from src.errors import ConflictError
from collections.abc import Callable, Awaitable, Sequence
from src.database.session import session_scope
from src.database.services import compute, storage, database
from src.models.operations import OperationKind
from src.models.types import DatabaseSSLMode
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry

DeleteRegistry = Callable[[AsyncSession, UUID], Awaitable[bool]]
Registry = ComputeRegistry | DatabaseRegistry | StorageRegistry
FetchRegistry = Callable[[AsyncSession, Pagination], Awaitable[tuple[Sequence[Registry], int]]]


@pytest.mark.parametrize(
    ("delete",),
    [
        pytest.param(compute.delete, id="compute"),
        pytest.param(database.delete, id="database"),
        pytest.param(storage.delete, id="storage"),
    ],
)
async def test_delete_returns_false_for_missing_registry(delete: DeleteRegistry) -> None:
    """Return false when the requested registry does not exist."""

    # Act
    async with session_scope() as session:
        deleted = await delete(session, uuid4())

    # Assert
    assert deleted is False


@pytest.mark.parametrize(
    ("delete", "registry", "model", "error"),
    [
        pytest.param(
            compute.delete,
            "compute",
            ComputeRegistry,
            "Compute registry is used by organizations",
            id="compute",
        ),
        pytest.param(
            database.delete,
            "database",
            DatabaseRegistry,
            "Database registry is used by organizations",
            id="database",
        ),
        pytest.param(
            storage.delete,
            "storage",
            StorageRegistry,
            "Storage registry is used by organizations",
            id="storage",
        ),
    ],
)
async def test_delete_rejects_assigned_registry(
    users: tuple[User, User, User],
    delete: DeleteRegistry,
    registry: str,
    model: type[ComputeRegistry] | type[DatabaseRegistry] | type[StorageRegistry],
    error: str,
) -> None:
    """Reject deletion while an organization references the registry."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[0], infrastructure=infrastructure)
    registry_id = getattr(infrastructure, registry).id

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match=f"^{error}$"):
            await delete(session, registry_id)

    # Assert
    async with session_scope() as session:
        persisted = await session.get(model, registry_id)
    assert persisted is not None


@pytest.mark.parametrize(
    ("delete", "registry", "model"),
    [
        pytest.param(compute.delete, "compute", ComputeRegistry, id="compute"),
        pytest.param(database.delete, "database", DatabaseRegistry, id="database"),
        pytest.param(storage.delete, "storage", StorageRegistry, id="storage"),
    ],
)
async def test_delete_removes_unused_registry(
    delete: DeleteRegistry,
    registry: str,
    model: type[ComputeRegistry] | type[DatabaseRegistry] | type[StorageRegistry],
) -> None:
    """Delete a registry that has no organization assignment."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry_id = getattr(infrastructure, registry).id

    # Act
    async with session_scope() as session:
        deleted = await delete(session, registry_id)
        await session.commit()

    # Assert
    assert deleted is True
    async with session_scope() as session:
        persisted = await session.get(model, registry_id)
    assert persisted is None


async def test_delete_rejects_compute_with_unfinished_lifecycle_operation() -> None:
    """Retain a compute registry while its creation operation is unfinished."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    compute_id = infrastructure.compute.id
    await queue_operation(kind=OperationKind.compute_create, target_id=compute_id)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="^Compute registry has unfinished lifecycle operation$"):
            await compute.delete(session, compute_id)

    # Assert
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, compute_id)
    assert persisted is not None


async def test_create_rejects_duplicate_compute_names() -> None:
    """Translate duplicate Compute names into the stable domain conflict."""

    # Arrange
    async with session_scope() as session:
        await compute.create(session, "Duplicate Compute", {"apiVersion": "v1"})
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="^Compute registry already exists$"):
            await compute.create(session, "Duplicate Compute", {"apiVersion": "v1"})


async def test_create_rejects_duplicate_database_names() -> None:
    """Translate duplicate Database names into the stable domain conflict."""

    # Arrange
    async with session_scope() as session:
        await database.create(
            session,
            "Duplicate Database",
            "database.example",
            5432,
            "admin",
            "database-secret",
            DatabaseSSLMode.disable,
        )
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="^Database registry already exists$"):
            await database.create(
                session,
                "Duplicate Database",
                "database.example",
                5432,
                "admin",
                "database-secret",
                DatabaseSSLMode.disable,
            )


async def test_create_rejects_duplicate_storage_names() -> None:
    """Translate duplicate Storage names into the stable domain conflict."""

    # Arrange
    async with session_scope() as session:
        await storage.create(
            session,
            "Duplicate Storage",
            "https://sos-ch-gva-2.exo.io",
            "storage-access-key",
            "storage-secret-key",
        )
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="^Storage registry already exists$"):
            await storage.create(
                session,
                "Duplicate Storage",
                "https://sos-ch-gva-2.exo.io",
                "storage-access-key",
                "storage-secret-key",
            )


@pytest.mark.parametrize(
    ("fetch", "registry"),
    [
        pytest.param(compute.fetch_page, "compute", id="compute"),
        pytest.param(database.fetch_page, "database", id="database"),
        pytest.param(storage.fetch_page, "storage", id="storage"),
    ],
)
async def test_fetch_page_returns_persisted_registry_and_total(fetch: FetchRegistry, registry: str) -> None:
    """Return each persisted registry type and its collection total."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    expected = getattr(infrastructure, registry)

    # Act
    async with session_scope() as session:
        registries, total = await fetch(session, Pagination())

    # Assert
    assert [item.id for item in registries] == [expected.id]
    assert total == 1
