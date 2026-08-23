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
