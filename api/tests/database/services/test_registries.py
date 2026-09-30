import pytest
from src.errors import ConflictError
from src.models.computes import ComputeRegistryCreate
from src.database.session import session_scope
from src.database.services import compute
from src.database.models.computes import ComputeRegistry


async def test_create_rejects_duplicate_compute_clusters() -> None:
    """Translate duplicate physical clusters into the stable domain conflict."""

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
        gateway_url="https://gateway.example",
        storage_endpoint="https://storage.example",
    )
    registry = ComputeRegistry(
        **payload.model_dump(),
        database_storage_class="local-path",
        cluster_uid="cluster-uid",
        storage_access_key="controller",
        storage_secret_key="controller-secret",
    )
    async with session_scope() as session:
        await compute.create(session, registry)
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match=r"^Compute registry already exists$"):
            await compute.create(
                session,
                ComputeRegistry(
                    **payload.model_copy(update={"name": "Cluster Alias"}).model_dump(),
                    database_storage_class="local-path",
                    cluster_uid="cluster-uid",
                    storage_access_key="controller",
                    storage_secret_key="controller-secret",
                ),
            )
