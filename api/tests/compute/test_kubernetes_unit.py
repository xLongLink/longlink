import pytest
from src.kubernetes.client import Kubernetes

pytestmark = pytest.mark.no_db


def test_kubernetes_components_share_cluster_resources() -> None:
    """Share one lazy cluster resource client across Kubernetes components."""

    client = Kubernetes("{}", "secret")

    assert client.gateway._resources is client._resources
    assert client.applications._resources is client._resources
