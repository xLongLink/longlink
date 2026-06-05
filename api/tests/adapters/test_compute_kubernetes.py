from kubernetes.client.rest import ApiException
from src.adapters.compute.k8s import K8s


async def test_init_bootstraps_cluster_proxy(monkeypatch) -> None:
    """Apply the cluster proxy manifests during Compute initialization."""

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

    class FakeCoreApi:
        def read_namespace(self, namespace: str):
            raise ApiException(status=404, reason="Not Found")

        def create_namespace(self, body):
            captured.append((body["kind"], body["metadata"]["name"], body["metadata"].get("namespace")))

    class FakeAppsApi:
        def create_namespaced_deployment(self, *args, **kwargs):
            raise AssertionError("deployment writes should happen through the dynamic client")

        def patch_namespaced_deployment(self, *args, **kwargs):
            raise AssertionError("deployment writes should happen through the dynamic client")

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

    monkeypatch.setattr("src.adapters.compute.k8s.client.Configuration", lambda: object())
    monkeypatch.setattr("src.adapters.compute.k8s.config.kube_config.KubeConfigLoader", FakeLoader)
    monkeypatch.setattr("src.adapters.compute.k8s.client.ApiClient", lambda configuration: object())
    monkeypatch.setattr("src.adapters.compute.k8s.client.CoreV1Api", lambda api_client: FakeCoreApi())
    monkeypatch.setattr("src.adapters.compute.k8s.client.AppsV1Api", lambda api_client: FakeAppsApi())
    monkeypatch.setattr("src.adapters.compute.k8s.DynamicClient", FakeDynamicClient)
    adapter = K8s("apiVersion: v1\nclusters: []\n", "shared-secret")

    # Act
    await adapter.setup()

    # Assert
    assert captured == [
        ("ConfigMap", "compute-router-script", "default"),
        ("ServiceAccount", "compute-router", "default"),
        ("Deployment", "compute-router", "default"),
        ("Service", "compute-router", "default"),
        ("ClusterRoleBinding", "compute-router-cluster-admin", None),
        ("Ingress", "control-ingress", "default"),
    ]
    token = adapter.authorization_header().removeprefix("Bearer ").strip()
    header, payload, signature = token.split(".")
    assert header
    assert payload
    assert signature
