import pytest
from conftest import FakeKubernetes
from src.kubernetes import organizations

pytestmark = pytest.mark.no_db


async def test_organization_apply_creates_namespace_boundary_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the Namespace, quota, and network policy for one Organization."""

    # Arrange
    applied: list[str] = []

    class Resource:
        """Keep one rendered resource manifest for assertions."""

        def __init__(self, raw: dict[str, str], **_kwargs: object) -> None:
            """Store the manifest supplied to the resource constructor."""

            self.raw = raw

    async def apply(resource: Resource) -> None:
        """Record the resource accepted by Kubernetes."""

        applied.append(resource.raw["kind"])

    monkeypatch.setattr(
        organizations.templates,
        "readyml_list",
        lambda *_args, **kwargs: (
            {"kind": "Namespace", "namespace": kwargs["namespace"]},
            {"kind": "ResourceQuota", "namespace": kwargs["namespace"]},
            {"kind": "NetworkPolicy", "namespace": kwargs["namespace"]},
        ),
    )
    monkeypatch.setattr(organizations, "Namespace", Resource)
    monkeypatch.setattr(organizations, "ResourceQuota", Resource)
    monkeypatch.setattr(organizations, "NetworkPolicy", Resource)
    monkeypatch.setattr(organizations, "apply", apply)

    # Act
    await organizations.Organizations(FakeKubernetes()).apply("acme")  # type: ignore[arg-type]

    # Assert
    assert applied == ["Namespace", "ResourceQuota", "NetworkPolicy"]


async def test_organization_delete_waits_for_namespace_termination(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete an Organization Namespace once and poll until it is absent."""

    # Arrange
    deleted: list[bool] = []
    sleeps: list[float] = []

    class Namespace:
        """Represent a Namespace through deletion and terminal absence."""

        def __init__(self, name: str, **_kwargs: object) -> None:
            """Store Namespace metadata used by the deletion loop."""

            assert name == "acme"
            self.metadata: dict[str, str] = {}
            self.checks = 0

        async def exists(self) -> bool:
            """Report the Namespace absent after two polling iterations."""

            self.checks += 1
            return self.checks < 3

        async def refresh(self) -> None:
            """Expose a deletion timestamp after the initial delete request."""

            if deleted:
                self.metadata["deletionTimestamp"] = "2026-08-23T00:00:00Z"

        async def delete(self) -> None:
            """Record the single deletion request."""

            deleted.append(True)

    async def sleep(delay: float) -> None:
        """Record polling without delaying the test."""

        sleeps.append(delay)

    monkeypatch.setattr(organizations, "Namespace", Namespace)
    monkeypatch.setattr(organizations.asyncio, "sleep", sleep)

    # Act
    await organizations.Organizations(FakeKubernetes()).delete("acme")  # type: ignore[arg-type]

    # Assert
    assert deleted == [True]
    assert sleeps == [5, 5]
