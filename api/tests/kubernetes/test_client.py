import pytest
from src.kubernetes import client as kubernetes_client

pytestmark = pytest.mark.no_db


async def test_kubernetes_api_is_lazy_and_cached(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create one cluster client only when a lifecycle component needs it."""

    # Arrange
    kubeconfig = {"apiVersion": "v1", "clusters": []}
    created: list[dict[str, object]] = []
    api = object()

    async def create_api(**kwargs: object) -> object:
        """Record one kr8s client construction."""

        created.append(kwargs)
        return api

    monkeypatch.setattr(kubernetes_client.kr8s.asyncio, "api", create_api)
    kubernetes = kubernetes_client.Kubernetes(kubeconfig)

    # Act
    first = await kubernetes.api()
    second = await kubernetes.api()

    # Assert
    assert first is api
    assert second is api
    assert created == [{"kubeconfig": kubeconfig, "serviceaccount": ""}]


async def test_kubernetes_client_closes_its_cached_http_session(monkeypatch: pytest.MonkeyPatch) -> None:
    """Close the HTTP session opened by the cached kr8s client."""

    # Arrange
    closed: list[bool] = []

    class Session:
        """Record asynchronous HTTP session closure."""

        async def aclose(self) -> None:
            """Record one session closure."""

            closed.append(True)

    class Api:
        """Expose the kr8s session retained by the client."""

        _session = Session()

    async def create_api(**_kwargs: object) -> Api:
        """Return one API with a closeable session."""

        return Api()

    monkeypatch.setattr(kubernetes_client.kr8s.asyncio, "api", create_api)
    kubernetes = kubernetes_client.Kubernetes({"apiVersion": "v1"})
    await kubernetes.api()

    # Act
    await kubernetes.aclose()

    # Assert
    assert closed == [True]
