import pytest
from kr8s.asyncio.objects import Pod, Namespace
from src.kubernetes.client import Kubernetes

pytestmark = pytest.mark.no_db


async def test_kubernetes_namespaces_filters_system_namespaces() -> None:
    """Return only non-system namespaces from the resource boundary."""

    # Provide mixed tenant and system namespaces through a fake resource boundary.
    class NamespaceResource:
        """Minimal namespace resource for client delegation tests."""

        def __init__(self, name: str) -> None:
            """Store the namespace name."""

            self.name = name

    class Resources:
        """Record Kubernetes resource listing calls."""

        calls: list[tuple[object, str | None, dict[str, str] | None]]

        def __init__(self) -> None:
            """Initialize the call log."""

            self.calls = []

        async def list(
            self, resource_class: object, namespace: str | None = None, label_selector: dict[str, str] | None = None
        ) -> list[NamespaceResource]:
            """Return fake namespaces for the requested resource class."""

            self.calls.append((resource_class, namespace, label_selector))
            assert resource_class is Namespace
            return [
                NamespaceResource("acme"),
                NamespaceResource("kube-system"),
                NamespaceResource("longlink-system"),
                NamespaceResource("globex"),
            ]

    resources = Resources()
    client = Kubernetes("unused")
    client._resources = resources

    # Request the namespaces visible to Platform callers.
    namespaces = await client.namespaces()

    # Verify system namespaces are filtered from the delegated result.
    assert namespaces == ["acme", "globex"]
    assert resources.calls == [(Namespace, None, None)]


async def test_kubernetes_pods_delegates_to_namespace_listing() -> None:
    """List pods through the shared resource boundary for one namespace."""

    # Provide fake pods and record resource boundary calls.
    class Resources:
        """Return fake pods from the requested namespace."""

        calls: list[tuple[object, str | None, dict[str, str] | None]]

        def __init__(self) -> None:
            """Initialize fake pod data."""

            self.calls = []
            self.pods = [object(), object()]

        async def list(
            self, resource_class: object, namespace: str | None = None, label_selector: dict[str, str] | None = None
        ) -> list[object]:
            """Return fake pod resources."""

            self.calls.append((resource_class, namespace, label_selector))
            assert resource_class is Pod
            return self.pods

    resources = Resources()
    client = Kubernetes("unused")
    client._resources = resources

    # Request pods for one Organization namespace.
    pods = await client.pods("acme")

    # Verify pod listing delegates with the requested namespace.
    assert pods == resources.pods
    assert resources.calls == [(Pod, "acme", None)]
