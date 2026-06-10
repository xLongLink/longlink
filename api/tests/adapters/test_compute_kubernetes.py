from kubernetes.client.rest import ApiException
from src.adapters.compute.k8s import K8s


async def test_setup_is_noop(monkeypatch) -> None:
    """Keep cluster bootstrap empty for service-proxy routing."""

    # Arrange
    monkeypatch.setattr("src.adapters.compute.k8s.client.Configuration", lambda: object())
    monkeypatch.setattr("src.adapters.compute.k8s.client.ApiClient", lambda configuration: object())
    monkeypatch.setattr("src.adapters.compute.k8s.config.kube_config.KubeConfigLoader", lambda kubeconfig: type("Loader", (), {"load_and_set": lambda self, configuration: None})())
    monkeypatch.setattr("src.adapters.compute.k8s.client.CoreV1Api", lambda api_client: object())
    monkeypatch.setattr("src.adapters.compute.k8s.client.AppsV1Api", lambda api_client: object())
    adapter = K8s("apiVersion: v1\nclusters: []\n", "shared-secret")

    # Act
    await adapter.setup()

    # Assert
    assert adapter._proxy_secret == "shared-secret"


async def test_application_applies_service_resources(monkeypatch) -> None:
    """Provision the app with only Kubernetes service resources."""

    # Arrange
    captured: list[tuple[str, str, str | None]] = []

    class FakeCoreApi:
        def create_namespaced_secret(self, namespace, body):
            captured.append((body["kind"], body["metadata"]["name"], namespace))

        def patch_namespaced_secret(self, name, namespace, body):
            raise ApiException(status=404, reason="Not Found")

        def create_namespaced_service(self, namespace, body):
            captured.append((body["kind"], body["metadata"]["name"], namespace))

        def patch_namespaced_service(self, name, namespace, body):
            raise ApiException(status=404, reason="Not Found")

    class FakeAppsApi:
        def create_namespaced_deployment(self, namespace, body):
            captured.append((body["kind"], body["metadata"]["name"], namespace))

        def patch_namespaced_deployment(self, name, namespace, body):
            raise ApiException(status=404, reason="Not Found")

    class FakeConfiguration:
        def __init__(self) -> None:
            self.host = "http://0.0.0.0:8001"

    class FakeLoader:
        def __init__(self, kubeconfig) -> None:
            self.kubeconfig = kubeconfig

        def load_and_set(self, configuration) -> None:
            return None

    monkeypatch.setattr("src.adapters.compute.k8s.client.Configuration", FakeConfiguration)
    monkeypatch.setattr("src.adapters.compute.k8s.config.kube_config.KubeConfigLoader", FakeLoader)
    monkeypatch.setattr("src.adapters.compute.k8s.client.ApiClient", lambda configuration: type("ApiClient", (), {"configuration": configuration})())
    monkeypatch.setattr("src.adapters.compute.k8s.client.CoreV1Api", lambda api_client: FakeCoreApi())
    monkeypatch.setattr("src.adapters.compute.k8s.client.AppsV1Api", lambda api_client: FakeAppsApi())
    adapter = K8s("apiVersion: v1\nclusters: []\n", "shared-secret")

    # Act
    result = await adapter.application("acme", "dashboard", "ghcr.io/longlink/dashboard:latest", 80, {"REQUIRED": "value"})

    # Assert
    assert result == "/longlink-acme/dashboard/"
    assert captured == [
        ("Secret", "dashboard", "longlink-acme"),
        ("Deployment", "dashboard", "longlink-acme"),
        ("Service", "dashboard", "longlink-acme"),
    ]
