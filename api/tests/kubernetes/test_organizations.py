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
    await kubernetes_client().organizations.apply(UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert [resource["kind"] for resource in applied] == ["Namespace", "NetworkPolicy"]
    assert applied[0]["metadata"] == {
        "name": "longlink-compute-00000000000040008000000000000001",
        "labels": {"longlink.io/namespace": "compute", "pod-security.kubernetes.io/enforce": "restricted"},
    }
    metadata = applied[1]["metadata"]
    assert isinstance(metadata, dict)
    assert metadata["namespace"] == "longlink-compute-00000000000040008000000000000001"


async def test_organization_delete_waits_for_namespace_termination(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete an Organization Namespace once and wait until it is absent."""

    # Arrange
    deleted: list[bool] = []
    waits: list[str] = []

    class Namespace:
        """Represent a Namespace through deletion and terminal absence."""

        def __init__(self, name: str, **_kwargs: object) -> None:
            """Validate the Namespace."""

            assert name == "longlink-compute-00000000000040008000000000000001"

        async def delete(self) -> None:
            """Record the single deletion request."""

            deleted.append(True)

        async def wait(self, condition: str) -> None:
            """Record the terminal deletion wait."""

            waits.append(condition)

    monkeypatch.setattr(kubernetes_utils, "Namespace", Namespace)

    # Act
    await kubernetes_client().organizations.delete(UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert deleted == [True]
    assert waits == ["delete"]
