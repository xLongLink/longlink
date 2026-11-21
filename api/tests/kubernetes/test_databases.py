import pytest
from kr8s import NotFoundError
from uuid import uuid4
from conftest import kubernetes_client
from src.kubernetes import databases
from kr8s.asyncio.objects import APIObject
from src.kubernetes.client import Kubernetes

pytestmark = pytest.mark.no_db


async def test_database_certificate_reads_cnpg_ca_in_database_namespace(monkeypatch: pytest.MonkeyPatch) -> None:
    """Do not use a gateway certificate or a different tenant's database CA."""

    # Arrange
    organization = uuid4()
    observed: list[tuple[str, str, str]] = []

    async def certificate(_client: Kubernetes, namespace: str, name: str, *, entry: str) -> str:
        """Capture the external trust lookup coordinates."""

        observed.append((namespace, name, entry))
        return "database-ca-pem"

    monkeypatch.setattr(databases.tls, "certificate", certificate)

    # Act
    result = await databases.certificate(kubernetes_client(), organization)

    # Assert
    assert result == "database-ca-pem"
    assert observed == [(f"longlink-database-{organization.hex}", "database-ca", "ca.crt")]


async def test_database_provisioning_applies_exact_allocations(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep decimal storage bytes and the database compute share exact."""

    # Arrange
    applied: list[APIObject] = []

    async def apply(resource: APIObject) -> None:
        """Record Kubernetes manifests without contacting a cluster."""

        applied.append(resource)

    monkeypatch.setattr(databases.utils, "apply", apply)

    async def refresh(_resource: APIObject) -> None:
        """Represent first provisioning without an existing CNPG cluster."""

        raise NotFoundError("missing")

    monkeypatch.setattr(databases.ClusterResource, "refresh", refresh)

    # Act
    await databases.apply(
        kubernetes_client(), uuid4(), "password", "standard", storage_bytes=1_000_000_000, cpu_millicores=250, ram_bytes=1024**3
    )

    # Assert
    cluster = next(resource for resource in applied if resource.kind == "Cluster")
    assert cluster.spec["storage"]["size"] == "1000000000"
    assert cluster.spec["resources"] == {
        "requests": {"cpu": "250m", "memory": "268435456"},
        "limits": {"cpu": "250m", "memory": "1073741824"},
    }


async def test_database_resize_rejects_shrink_before_mutation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Never lower a PVC size or alter quotas when the requested disk is smaller."""

    # Arrange
    mutations: list[object] = []

    async def refresh(resource: APIObject) -> None:
        """Expose the existing binary-sized disk from an older deployment."""

        resource.raw["spec"] = {"storage": {"size": "1Gi"}}

    async def patch(_resource: APIObject, payload: object) -> None:
        """Record unexpected external mutations."""

        mutations.append(payload)

    monkeypatch.setattr(databases.ClusterResource, "refresh", refresh)
    monkeypatch.setattr(databases.ClusterResource, "patch", patch)
    monkeypatch.setattr(databases.ResourceQuota, "patch", patch)

    # Act
    with pytest.raises(ValueError, match="cannot be reduced"):
        await databases.resize(kubernetes_client(), uuid4(), storage_bytes=1_000_000_000, cpu_millicores=500, ram_bytes=500_000_000)

    # Assert
    assert mutations == []


async def test_database_reprovisioning_cannot_bypass_disk_shrink_preflight(monkeypatch: pytest.MonkeyPatch) -> None:
    """A creating Organization with an existing cluster must not rerun bootstrap manifests."""

    # Arrange
    mutations: list[object] = []

    async def refresh(resource: APIObject) -> None:
        """Expose an existing database even though its Organization is creating."""

        resource.raw["spec"] = {"storage": {"size": "2Gi"}}

    async def apply(resource: APIObject) -> None:
        """Record unexpected bootstrap mutations."""

        mutations.append(resource.raw)

    monkeypatch.setattr(databases.ClusterResource, "refresh", refresh)
    monkeypatch.setattr(databases.utils, "apply", apply)

    # Act
    with pytest.raises(ValueError, match="cannot be reduced"):
        await databases.apply(
            kubernetes_client(), uuid4(), "password", "standard", storage_bytes=1_000_000_000, cpu_millicores=500, ram_bytes=500_000_000
        )

    # Assert
    assert mutations == []


async def test_database_resize_updates_live_compute_and_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Expand disk and replace compute resources without rewriting database credentials."""

    # Arrange
    mutations: list[tuple[str, object]] = []

    async def refresh(resource: APIObject) -> None:
        """Expose the live database allocation."""

        resource.raw["spec"] = {"storage": {"size": "1000000000"}}

    async def patch(resource: APIObject, payload: object) -> None:
        """Record quota and cluster updates in order."""

        mutations.append((resource.kind, payload))

    monkeypatch.setattr(databases.ClusterResource, "refresh", refresh)
    monkeypatch.setattr(databases.ClusterResource, "patch", patch)
    monkeypatch.setattr(databases.ResourceQuota, "patch", patch)

    # Act
    await databases.resize(kubernetes_client(), uuid4(), storage_bytes=2_000_000_000, cpu_millicores=750, ram_bytes=750_000_000)

    # Assert
    assert [kind for kind, _payload in mutations] == ["ResourceQuota", "Cluster"]
    assert mutations[1][1] == {
        "spec": {
            "storage": {"size": "2000000000"},
            "resources": {"requests": {"cpu": "750m", "memory": "268435456"}, "limits": {"cpu": "750m", "memory": "750000000"}},
        }
    }
