import pytest
from uuid import UUID, uuid4
from factories import create_compute, queue_operation, create_ready_infrastructure
from src.errors import ConflictError, NotFoundError
from collections.abc import Callable, Awaitable
from src.database.session import session_scope
from src.database.services import compute
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry

DeleteRegistry = Callable[[AsyncSession, UUID], Awaitable[None]]


@pytest.mark.parametrize(
    "delete",
    [
        pytest.param(compute.delete, id="compute"),
    ],
)
async def test_delete_rejects_missing_registry(delete: DeleteRegistry) -> None:
    """Reject deletion when the requested registry does not exist."""

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(NotFoundError, match="registry not found"):
            await delete(session, uuid4())


@pytest.mark.parametrize(
    ("delete", "registry", "model"),
    [
        pytest.param(compute.delete, "compute", ComputeRegistry, id="compute"),
    ],
)
async def test_delete_removes_unused_registry(
    delete: DeleteRegistry,
    registry: str,
    model: type[ComputeRegistry],
) -> None:
    """Delete a registry that has no organization assignment."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry_id = getattr(infrastructure, registry).id

    # Act
    async with session_scope() as session:
        await delete(session, registry_id)
        await session.commit()

    # Assert
    async with session_scope() as session:
        persisted = await session.get(model, registry_id)
    assert persisted is None


async def test_delete_rejects_compute_with_unfinished_lifecycle_operation() -> None:
    """Retain a compute registry while its creation operation is unfinished."""

    # Arrange
    compute_registry = await create_compute()
    compute_id = compute_registry.id
    await queue_operation(kind=OperationKind.compute_create, target_id=compute_id)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match=r"^Compute registry has unfinished lifecycle operation$"):
            await compute.delete(session, compute_id)

    # Assert
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, compute_id)
    assert persisted is not None


async def test_create_rejects_duplicate_compute_names() -> None:
    """Translate duplicate Compute names into the stable domain conflict."""

    # Arrange
    async with session_scope() as session:
        await compute.create(
            session,
            "Duplicate Compute",
            {"apiVersion": "v1"},
            gateway_url="https://gateway.example",
            database_storage_class="local-path",
            storage_class="block-storage",
            storage_endpoint="https://storage.example",
        )
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match=r"^Compute registry already exists$"):
            await compute.create(
                session,
                "Duplicate Compute",
                {"apiVersion": "v1"},
                gateway_url="https://gateway.example",
                database_storage_class="local-path",
                storage_class="block-storage",
                storage_endpoint="https://storage.example",
            )
