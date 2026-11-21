import pytest
from uuid import UUID
from conftest import kubernetes_client
from src.kubernetes import utils as kubernetes_utils
from src.kubernetes import organizations
from collections.abc import AsyncGenerator

pytestmark = pytest.mark.no_db


@pytest.fixture(autouse=True)
def no_live_pods(monkeypatch: pytest.MonkeyPatch) -> None:
    """Default cluster-boundary tests to a namespace without running applications."""

    async def pods(**_kwargs: object) -> AsyncGenerator[organizations.Pod]:
        """Provide an empty external Pod listing."""

        if False:
            yield

    monkeypatch.setattr(organizations.Pod, "list", pods)


async def test_organization_apply_creates_namespace_boundary_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the Namespace and network policy for one Organization."""

    # Arrange
    applied: list[dict[str, object]] = []

    async def apply(resource: organizations.Namespace | organizations.NetworkPolicy | organizations.ResourceQuota) -> None:
        """Record the committed resource rendered for Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(organizations.utils, "apply", apply)

    async def refresh(resource: organizations.ResourceQuota) -> None:
        """Supply the current quota usage reported by Kubernetes."""

        resource.raw["status"] = {"used": {"limits.cpu": "250m", "limits.memory": "128Mi"}}

    monkeypatch.setattr(organizations.ResourceQuota, "refresh", refresh)

    # Act
    await organizations.apply(
        kubernetes_client(), UUID("00000000-0000-4000-8000-000000000001"), cpu_millicores=750, ram_bytes=1_000_000_000
    )

    # Assert
    assert [resource["kind"] for resource in applied] == ["Namespace", "ResourceQuota", "NetworkPolicy"]
    assert applied[0]["metadata"] == {
        "name": "longlink-compute-00000000000040008000000000000001",
        "labels": {"pod-security.kubernetes.io/enforce": "restricted"},
    }
    assert applied[1]["spec"]["hard"]["limits.cpu"] == "1650m"
    assert applied[1]["spec"]["hard"]["limits.memory"] == "1536870912"
    assert applied[1]["spec"]["hard"]["pods"] == "2"
    metadata = applied[2]["metadata"]
    assert isinstance(metadata, dict)
    assert metadata["namespace"] == "longlink-compute-00000000000040008000000000000001"
    spec = applied[2]["spec"]
    assert isinstance(spec, dict)
    assert spec["egress"][0]["ports"] == [{"protocol": "TCP", "port": 8443}]


async def test_organization_rejects_remainder_below_live_application_usage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Do not report a successful shrink while old Pods exceed the remainder."""

    # Arrange
    applied: list[str] = []

    async def apply(resource: organizations.Namespace) -> None:
        """Record boundary mutations."""

        applied.append(resource.kind)

    async def refresh(resource: organizations.ResourceQuota) -> None:
        """Expose existing app allocations."""

        resource.raw["status"] = {"used": {"limits.cpu": "2", "limits.memory": "500M"}}

    monkeypatch.setattr(organizations.utils, "apply", apply)
    monkeypatch.setattr(organizations.ResourceQuota, "refresh", refresh)

    # Act
    with pytest.raises(ValueError, match="below admitted"):
        await organizations.apply(kubernetes_client(), UUID(int=1), cpu_millicores=500, ram_bytes=1_000_000_000)

    # Assert
    assert applied == ["Namespace"]


async def test_quota_rejects_older_revision_with_unbounded_sidecar(monkeypatch: pytest.MonkeyPatch) -> None:
    """Never grandfather an unbounded sidecar when adding a namespace quota."""

    # Arrange
    applied: list[str] = []

    async def apply(resource: organizations.Namespace) -> None:
        """Record Kubernetes changes."""

        applied.append(resource.kind)

    async def pods(**_kwargs: object) -> AsyncGenerator[organizations.Pod]:
        """Expose an existing Pod whose injected sidecar lacks limits."""

        yield organizations.Pod(
            {
                "metadata": {"name": "old-revision"},
                "spec": {
                    "containers": [
                        {
                            "name": "solution",
                            "resources": {"requests": {"cpu": "100m", "memory": "128Mi"}, "limits": {"cpu": "500m", "memory": "256Mi"}},
                        },
                        {"name": "queue-proxy", "resources": {"requests": {"cpu": "25m", "memory": "64Mi"}}},
                    ]
                },
            },
            api=await kubernetes_client().api(),
        )

    monkeypatch.setattr(organizations.utils, "apply", apply)
    monkeypatch.setattr(organizations.Pod, "list", pods)

    # Act
    with pytest.raises(ValueError, match="sidecars must declare"):
        await organizations.apply(kubernetes_client(), UUID(int=1), cpu_millicores=1000, ram_bytes=1_000_000_000)

    # Assert
    assert applied == ["Namespace"]


@pytest.mark.parametrize("revisions", [2, 3])
async def test_quota_counts_overlapping_revisions_and_queue_proxies(monkeypatch: pytest.MonkeyPatch, revisions: int) -> None:
    """Admit one free-tier rollout overlap, but reject additional revision Pods."""

    # Arrange
    applied: list[str] = []

    async def apply(resource: organizations.Namespace) -> None:
        """Record Kubernetes changes."""

        applied.append(resource.kind)

    async def pods(**_kwargs: object) -> AsyncGenerator[organizations.Pod]:
        """Expose bounded old and new Knative revision Pods."""

        api = await kubernetes_client().api()
        for index in range(revisions):
            yield organizations.Pod(
                {
                    "metadata": {"name": f"revision-{index}"},
                    "status": {"phase": "Running"},
                    "spec": {
                        "containers": [
                            {
                                "name": "solution",
                                "resources": {"requests": {"cpu": "100m", "memory": "128Mi"}, "limits": {"cpu": "250m", "memory": "256Mi"}},
                            },
                            {
                                "name": "queue-proxy",
                                "resources": {"requests": {"cpu": "25m", "memory": "64Mi"}, "limits": {"cpu": "200m", "memory": "128Mi"}},
                            },
                        ]
                    },
                },
                api=api,
            )

    monkeypatch.setattr(organizations.utils, "apply", apply)
    monkeypatch.setattr(organizations.Pod, "list", pods)

    async def refresh(resource: organizations.ResourceQuota) -> None:
        """Represent a quota controller with no additional raced admissions."""

        resource.raw["status"] = {"used": {}}

    monkeypatch.setattr(organizations.ResourceQuota, "refresh", refresh)

    # Act
    if revisions > 2:
        with pytest.raises(ValueError, match="below admitted"):
            await organizations.apply(kubernetes_client(), UUID(int=1), cpu_millicores=250, ram_bytes=256 * 1024**2)
    else:
        await organizations.apply(kubernetes_client(), UUID(int=1), cpu_millicores=250, ram_bytes=256 * 1024**2)

    # Assert
    assert applied == (["Namespace"] if revisions > 2 else ["Namespace", "ResourceQuota", "NetworkPolicy"])


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
