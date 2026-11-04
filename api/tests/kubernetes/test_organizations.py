import pytest
from uuid import UUID
from conftest import kubernetes_client
from src.kubernetes import utils as kubernetes_utils
from src.kubernetes import organizations

pytestmark = pytest.mark.no_db


async def test_organization_apply_creates_namespace_boundary_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the Namespace and network policy for one Organization."""

    # Arrange
    applied: list[dict[str, object]] = []

    async def apply(resource: organizations.Namespace | organizations.NetworkPolicy) -> None:
        """Record the committed resource rendered for Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(organizations.utils, "apply", apply)

    # Act
    await organizations.apply(kubernetes_client(), UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert [resource["kind"] for resource in applied] == ["Namespace", "NetworkPolicy"]
    assert applied[0]["metadata"] == {
        "name": "longlink-compute-00000000000040008000000000000001",
        "labels": {"pod-security.kubernetes.io/enforce": "restricted"},
    }
    metadata = applied[1]["metadata"]
    assert isinstance(metadata, dict)
    assert metadata["namespace"] == "longlink-compute-00000000000040008000000000000001"
    spec = applied[1]["spec"]
    assert isinstance(spec, dict)
    assert spec["egress"][0]["ports"] == [{"protocol": "TCP", "port": 8443}]


async def test_delete_namespace_waits_for_termination(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete an Organization Namespace once and wait until it is absent."""

    # Arrange
    deleted: list[str] = []
    waits: list[str] = []

    async def delete(resource: kubernetes_utils.Namespace) -> None:
        """Record the Namespace receiving the deletion request."""

        deleted.append(resource.name)

    async def wait(resource: kubernetes_utils.Namespace, condition: str) -> None:
        """Record the terminal deletion wait."""

        assert resource.name == "longlink-compute-00000000000040008000000000000001"
        waits.append(condition)

    monkeypatch.setattr(kubernetes_utils.Namespace, "delete", delete)
    monkeypatch.setattr(kubernetes_utils.Namespace, "wait", wait)

    # Act
    client = kubernetes_client()
    await kubernetes_utils.delete_namespace(await client.api(), "longlink-compute-00000000000040008000000000000001")

    # Assert
    assert deleted == ["longlink-compute-00000000000040008000000000000001"]
    assert waits == ["delete"]
