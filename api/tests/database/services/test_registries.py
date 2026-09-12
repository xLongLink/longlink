import pytest
from uuid import uuid4
from factories import create_compute, queue_operation, create_ready_infrastructure
from src.errors import ConflictError, NotFoundError
from src.models.computes import ComputeRegistryCreate
from src.database.session import session_scope
from src.database.services import compute
from src.models.operations import OperationKind
from src.database.models.computes import ComputeRegistry


async def test_delete_rejects_missing_registry() -> None:
    """Reject deletion when the requested registry does not exist."""

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(NotFoundError, match="registry not found"):
            await compute.delete(session, uuid4())


async def test_delete_removes_unused_registry() -> None:
    """Delete a registry that has no organization assignment."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry_id = infrastructure.compute.id

    # Act
    async with session_scope() as session:
        await compute.delete(session, registry_id)
        await session.commit()

    # Assert
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, registry_id)
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
    payload = ComputeRegistryCreate(
        name="Duplicate Compute",
        kubeconfig={
            "apiVersion": "v1",
            "clusters": [{"name": "cluster", "cluster": {"server": "https://kubernetes.example"}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {"token": "secret"}}],
        },
        bucket_size_bytes=1073741824,
        bucket_max_objects=10000,
        storage_reserve_percent=30,
        storage_object_overhead_bytes=65536,
        gateway_url="https://gateway.example",
        database_storage_class="local-path",
        storage_class="block-storage",
        storage_endpoint="https://storage.example",
    )
    async with session_scope() as session:
        await compute.create(session, payload)
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match=r"^Compute registry already exists$"):
            await compute.create(session, payload)
