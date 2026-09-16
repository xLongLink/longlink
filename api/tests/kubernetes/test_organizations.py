import pytest
from uuid import UUID
from conftest import FakeKubernetes
from src.utils import templates
from src.kubernetes import organizations
from importlib.resources import files

pytestmark = pytest.mark.no_db


def test_organization_template_limits_ephemeral_storage() -> None:
    """Bound the aggregate temporary storage available to one Organization namespace."""

    # Arrange
    _, resource_quota, _ = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("solution", "organization.yml"),
        namespace="acme",
        cpu_limit=4,
        memory_limit_gib=3,
        ephemeral_limit_gib=4,
        pods=8,
    )

    # Assert
    resource_quota_spec = resource_quota["spec"]
    assert isinstance(resource_quota_spec, dict)
    resource_quota_hard = resource_quota_spec["hard"]
    assert isinstance(resource_quota_hard, dict)
    assert resource_quota_hard == {
        "limits.cpu": "4",
        "limits.ephemeral-storage": "4Gi",
        "limits.memory": "3Gi",
        "pods": "8",
        "requests.cpu": "1",
        "requests.ephemeral-storage": "3Gi",
        "requests.memory": "2Gi",
    }


async def test_organization_apply_creates_namespace_boundary_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the Namespace, quota, and network policy for one Organization."""

    # Arrange
    applied: list[dict[str, object]] = []

    async def apply(resource: organizations.Namespace | organizations.ResourceQuota | organizations.NetworkPolicy) -> None:
        """Record the committed resource rendered for Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(organizations.utils, "apply", apply)

    # Act
    await organizations.apply(FakeKubernetes(), UUID("00000000-0000-4000-8000-000000000001"))  # type: ignore[arg-type]

    # Assert
    assert [resource["kind"] for resource in applied] == ["Namespace", "ResourceQuota", "NetworkPolicy"]
    assert applied[0]["metadata"] == {
        "name": "longlink-compute-00000000000040008000000000000001",
        "labels": {"longlink.io/namespace": "compute", "pod-security.kubernetes.io/enforce": "restricted"},
    }
    for resource in applied[1:]:
        metadata = resource["metadata"]
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

    monkeypatch.setattr(organizations, "Namespace", Namespace)

    # Act
    await organizations.delete(FakeKubernetes(), UUID("00000000-0000-4000-8000-000000000001"))  # type: ignore[arg-type]

    # Assert
    assert deleted == [True]
    assert waits == ["delete"]
