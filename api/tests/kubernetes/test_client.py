import pytest
from src.kubernetes import client as kubernetes_client

pytestmark = pytest.mark.no_db


async def test_kubernetes_api_is_lazy_and_cached(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create one cluster client only when a lifecycle component needs it."""

    # Arrange
    kubeconfig = {"apiVersion": "v1", "clusters": []}
    created: list[dict[str, object]] = []

    class Api:
        """Represent an acquired API before it opens an HTTP session."""

        _session = None

    api = Api()

    async def create_api(**kwargs: object) -> object:
        """Record one kr8s client construction."""

        created.append(kwargs)
        return api

    monkeypatch.setattr(kubernetes_client.kr8s.asyncio, "api", create_api)
    kubernetes = kubernetes_client.Kubernetes(kubeconfig)
    assert created == []

    # Act
    try:
        first = await kubernetes.api()
        second = await kubernetes.api()

        # Assert
        assert first is api
        assert second is api
        assert created == [{"kubeconfig": kubeconfig, "serviceaccount": ""}]
    finally:
        # Release this test loop's acquired client through the same owner as the Platform lifespan.
        await kubernetes_client.dispose_clients()


@pytest.mark.parametrize("metadata", [None, {"uid": ""}, {"uid": 123}])
async def test_cluster_uid_rejects_unavailable_namespace_identity(monkeypatch: pytest.MonkeyPatch, metadata: object) -> None:
    """Reject a cluster whose system Namespace has no usable stable UID."""

    # Arrange
    class SystemNamespace:
        """Provide a namespace with the configured API metadata."""

        def __init__(self, name: str, api: object) -> None:
            """Validate that the cluster identity comes from kube-system."""

            assert name == "kube-system"
            self.raw = {"metadata": metadata}

        async def refresh(self) -> None:
            """Return the configured namespace metadata."""

    async def api() -> object:
        """Provide a local Kubernetes API boundary."""

        return object()

    kubernetes = kubernetes_client.Kubernetes({"apiVersion": "v1"})
    monkeypatch.setattr(kubernetes, "api", api)
    monkeypatch.setattr(kubernetes_client, "Namespace", SystemNamespace)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes cluster identity is unavailable"):
        await kubernetes.cluster_uid()


async def test_kubernetes_clients_leave_shared_http_session_to_lifespan(monkeypatch: pytest.MonkeyPatch) -> None:
    """Close operation-local tunnels without disrupting another borrower, then dispose the shared transport once."""

    # Arrange
    closed: list[str] = []

    async def close_tunnel() -> None:
        """Record tunnel cleanup on the real connection exit stack."""

        # Record completion before the dependent HTTP session closes.
        closed.append("tunnel")

    class Session:
        """Record asynchronous HTTP session closure."""

        async def aclose(self) -> None:
            """Record one session closure."""

            # Record closure after dependent tunnels have finished cleanup.
            closed.append("http")

    class Api:
        """Expose the kr8s session retained by the client."""

        _session = Session()

    api = Api()

    async def create_api(**_kwargs: object) -> Api:
        """Share the same API between wrappers, matching the kr8s factory."""

        return api

    monkeypatch.setattr(kubernetes_client.kr8s.asyncio, "api", create_api)
    kubernetes = kubernetes_client.Kubernetes({"apiVersion": "v1"})
    other = kubernetes_client.Kubernetes({"apiVersion": "v1"})
    await kubernetes.api()
    assert await other.api() is api
    kubernetes._connections.push_async_callback(close_tunnel)

    # Act
    async with kubernetes:
        pass

    # Assert
    assert closed == ["tunnel"]
    assert await other.api() is api

    # Act
    await kubernetes.aclose()
    await other.aclose()

    # Assert
    assert closed == ["tunnel"]

    # Shut down only after both borrowers have finished, then repeat disposal to check idempotency.
    await kubernetes_client.dispose_clients()
    await kubernetes_client.dispose_clients()
    assert closed == ["tunnel", "http"]
