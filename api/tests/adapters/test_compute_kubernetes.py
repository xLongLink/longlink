from kubernetes.client.rest import ApiException

from src.adapters.compute.kubernetes import Compute


async def test_create_cluster_proxy_applies_all_manifests(monkeypatch) -> None:
    """Apply the cluster proxy manifests with the Kubernetes client."""

    # Arrange
    captured: list[tuple[str, str, str | None]] = []

    class FakeResource:
        def __init__(self, kind: str, namespaced: bool) -> None:
            self.kind = kind
            self.namespaced = namespaced

        def get(self, name: str, namespace: str | None = None):
            raise ApiException(status=404, reason="Not Found")

        def patch(self, **kwargs):
            raise AssertionError("patch should not be called when resources are missing")

        def create(self, body, namespace: str | None = None):
            captured.append((body["kind"], body["metadata"]["name"], namespace))

    class FakeResources:
        def get(self, *, api_version: str, kind: str):
            return FakeResource(kind, kind != "ClusterRoleBinding")

    class FakeDynamicClient:
        def __init__(self, api_client) -> None:
            self.resources = FakeResources()

    class FakeLoader:
        def __init__(self, kubeconfig) -> None:
            self.kubeconfig = kubeconfig

        def load_and_set(self, configuration) -> None:
            return None

    monkeypatch.setattr("src.adapters.compute.kubernetes.client.Configuration", lambda: object())
    monkeypatch.setattr("src.adapters.compute.kubernetes.config.kube_config.KubeConfigLoader", FakeLoader)
    monkeypatch.setattr("src.adapters.compute.kubernetes.client.ApiClient", lambda configuration: object())
    monkeypatch.setattr("src.adapters.compute.kubernetes.client.CoreV1Api", lambda api_client: object())
    monkeypatch.setattr("src.adapters.compute.kubernetes.client.AppsV1Api", lambda api_client: object())
    monkeypatch.setattr("src.adapters.compute.kubernetes.DynamicClient", FakeDynamicClient)

    compute = Compute("apiVersion: v1\nclusters: []\n")

    # Act
    await compute.create_cluster_proxy("control-ingress")

    # Assert
    assert captured == [
        ("ServiceAccount", "compute-router", "default"),
        ("Deployment", "compute-router", "default"),
        ("Service", "compute-router", "default"),
        ("ClusterRoleBinding", "compute-router-cluster-admin", None),
        ("Ingress", "control-ingress", "default"),
    ]
