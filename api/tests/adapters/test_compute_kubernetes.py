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


async def test_application_waits_for_ready_endpoints(monkeypatch) -> None:
    """Wait for the application service endpoints before returning the proxy URL."""

    # Arrange
    sleep_calls: list[int] = []

    class FakeResource:
        def __init__(self, kind: str, namespaced: bool) -> None:
            self.kind = kind
            self.namespaced = namespaced

        def get(self, name: str, namespace: str | None = None):
            raise ApiException(status=404, reason="Not Found")

        def patch(self, **kwargs):
            raise AssertionError("patch should not be called when resources are missing")

        def create(self, body, namespace: str | None = None):
            return None

    class FakeCoreApi:
        def __init__(self) -> None:
            self.endpoint_checks = 0

        def create_namespaced_secret(self, namespace, body):
            return None

        def patch_namespaced_secret(self, name, namespace, body):
            raise ApiException(status=404, reason="Not Found")

        def create_namespaced_service(self, namespace, body):
            return None

        def patch_namespaced_service(self, name, namespace, body):
            raise ApiException(status=404, reason="Not Found")

        def read_namespaced_endpoints(self, name: str, namespace: str):
            self.endpoint_checks += 1
            if self.endpoint_checks == 1:
                raise ApiException(status=404, reason="Not Found")

            class FakeSubset:
                def __init__(self) -> None:
                    self.addresses = [object()]

            class FakeEndpoints:
                def __init__(self) -> None:
                    self.subsets = [FakeSubset()]

            return FakeEndpoints()

    class FakeAppsApi:
        def create_namespaced_deployment(self, namespace, body):
            return None

        def patch_namespaced_deployment(self, name, namespace, body):
            raise ApiException(status=404, reason="Not Found")

    class FakeResources:
        def get(self, *, api_version: str, kind: str):
            return FakeResource(kind, kind != "ClusterRoleBinding")

    class FakeDynamicClient:
        def __init__(self, api_client) -> None:
            self.resources = FakeResources()

    class FakeConfiguration:
        def __init__(self) -> None:
            self.host = "http://0.0.0.0:8001"

    class FakeLoader:
        def __init__(self, kubeconfig) -> None:
            self.kubeconfig = kubeconfig

        def load_and_set(self, configuration) -> None:
            return None

    async def fake_sleep(seconds: int) -> None:
        sleep_calls.append(seconds)

    monkeypatch.setattr("src.adapters.compute.k8s.asyncio.sleep", fake_sleep)
    monkeypatch.setattr("src.adapters.compute.k8s.client.Configuration", FakeConfiguration)
    monkeypatch.setattr("src.adapters.compute.k8s.config.kube_config.KubeConfigLoader", FakeLoader)
    monkeypatch.setattr("src.adapters.compute.k8s.client.ApiClient", lambda configuration: type("ApiClient", (), {"configuration": configuration})())
    monkeypatch.setattr("src.adapters.compute.k8s.client.CoreV1Api", lambda api_client: FakeCoreApi())
    monkeypatch.setattr("src.adapters.compute.k8s.client.AppsV1Api", lambda api_client: FakeAppsApi())
    monkeypatch.setattr("src.adapters.compute.k8s.DynamicClient", FakeDynamicClient)
    adapter = K8s("apiVersion: v1\nclusters: []\n", "shared-secret")

    # Act
    result = await adapter.application("acme", "dashboard", "ghcr.io/longlink/dashboard:latest", 80, {"REQUIRED": "value"})

    # Assert
    assert result == "http://localhost:8001/api/v1/namespaces/longlink-acme/services/dashboard:80/proxy/"
    assert sleep_calls == [1]
