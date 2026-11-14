import json
import base64
import pytest
from conftest import kubernetes_client
from factories import create_organization
from src.operations import registries
from collections.abc import AsyncIterator
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.registries import RegistryConnection


async def test_registry_synchronization_updates_active_secret_and_removes_stale_credentials(
    monkeypatch: pytest.MonkeyPatch, users: tuple[User, User, User]
) -> None:
    """Publish current credentials under stable names and prune only removed connections."""

    # Arrange
    owner, _, foreign_owner = users
    organization = await create_organization(owner)
    foreign_organization = await create_organization(foreign_owner, name="foreign")
    connection = RegistryConnection(organization_id=organization.id, username="acme", credential="rotated-token")
    foreign_connection = RegistryConnection(organization_id=foreign_organization.id, username="foreign-account", credential="foreign-token")
    async with session_scope() as session:
        session.add_all([connection, foreign_connection])
        await session.commit()
    cluster = kubernetes_client()
    api = await cluster.api()
    active_name = f"registry-{connection.id}"

    # Record Secret reconciliation without connecting to a cluster.
    applied: list[dict] = []
    deleted: list[str] = []

    async def apply(secret: registries.Secret) -> None:
        """Capture the Kubernetes write without changing credential generation."""

        applied.append(secret.to_dict())

    async def listed(**kwargs: object) -> AsyncIterator[registries.Secret]:
        """Return only credentials managed by this Organization's synchronization."""

        assert kwargs["namespace"] == f"longlink-compute-{organization.id.hex}"
        assert kwargs["label_selector"] == registries.REGISTRY_LABEL
        yield registries.Secret(active_name, api=api)
        yield registries.Secret("registry-removed", api=api)

    async def delete(secret: registries.Secret) -> None:
        """Record destructive Kubernetes I/O."""

        deleted.append(secret.name)

    monkeypatch.setattr(registries, "apply", apply)
    monkeypatch.setattr(registries.Secret, "list", listed)
    monkeypatch.setattr(registries.Secret, "delete", delete)

    # Act
    await registries.synchronize(cluster, organization.id)

    # Assert
    assert len(applied) == 1
    secret = applied[0]
    assert secret["metadata"] == {
        "name": active_name,
        "namespace": f"longlink-compute-{organization.id.hex}",
        "labels": {registries.REGISTRY_LABEL: str(connection.id)},
    }
    assert secret["type"] == "kubernetes.io/dockerconfigjson"
    assert json.loads(secret["stringData"][".dockerconfigjson"]) == {
        # The applied Secret must contain the rotated pull credential.
        "auths": {"ghcr.io": {"auth": base64.b64encode(b"acme:rotated-token").decode()}}
    }

    # Stale registry Secrets are removed after current credentials are applied.
    assert deleted == ["registry-removed"]


async def test_registry_synchronization_preserves_secrets_when_publication_fails(
    monkeypatch: pytest.MonkeyPatch, users: tuple[User, User, User]
) -> None:
    """Propagate failed credential publication without pruning existing Secrets."""

    # Arrange
    organization = await create_organization(users[1])
    connection = RegistryConnection(organization_id=organization.id, username="acme", credential="rotated-token")
    async with session_scope() as session:
        session.add(connection)
        await session.commit()
    cluster = kubernetes_client()
    api = await cluster.api()
    failure = RuntimeError("Secret publication failed")
    deleted: list[str] = []

    async def apply(secret: registries.Secret) -> None:
        """Fail only the publication of the real active credential Secret."""

        assert secret.name == f"registry-{connection.id}"
        raise failure

    async def listed(**kwargs: object) -> AsyncIterator[registries.Secret]:
        """Expose a stale Secret that must survive a failed publication."""

        assert kwargs["namespace"] == f"longlink-compute-{organization.id.hex}"
        assert kwargs["label_selector"] == registries.REGISTRY_LABEL
        yield registries.Secret("registry-removed", api=api)

    async def delete(secret: registries.Secret) -> None:
        """Record destructive Kubernetes I/O without contacting a cluster."""

        deleted.append(secret.name)

    monkeypatch.setattr(registries, "apply", apply)
    monkeypatch.setattr(registries.Secret, "list", listed)
    monkeypatch.setattr(registries.Secret, "delete", delete)

    # Act
    with pytest.raises(RuntimeError, match="Secret publication failed") as error:
        await registries.synchronize(cluster, organization.id)

    # Assert
    assert error.value is failure
    assert deleted == []
