from decimal import Decimal
from kubernetes.client.rest import ApiException
from src.adapters.compute.k8s import K8s, parse_quantity


def test_parse_quantity_uses_kubernetes_quantity_semantics() -> None:
    """Parse Kubernetes resource quantities with the Kubernetes utility parser."""

    # Act and assert
    assert parse_quantity("250m") == Decimal("0.250")
    assert parse_quantity("128Mi") == Decimal(128 * 1024 * 1024)
    assert parse_quantity("invalid") == Decimal(0)


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


async def test_proxy_passes_json_body_as_decoded_value(monkeypatch) -> None:
    """Pass JSON request bodies in the form expected by the Kubernetes client."""

    # Arrange
    captured: dict[str, object] = {}

    class FakeApiClient:
        def __init__(self, configuration) -> None:
            self.configuration = configuration

        def call_api(
            self,
            resource_path,
            method,
            query_params,
            header_params,
            body,
            auth_settings,
            _preload_content,
            _return_http_data_only,
        ):
            captured["resource_path"] = resource_path
            captured["method"] = method
            captured["headers"] = header_params
            captured["body"] = body
            response = type("Response", (), {"data": b"created"})()
            return response, 201, {"content-type": "application/json"}

    class FakeLoader:
        def __init__(self, kubeconfig) -> None:
            self.kubeconfig = kubeconfig

        def load_and_set(self, configuration) -> None:
            return None

    monkeypatch.setattr("src.adapters.compute.k8s.client.Configuration", lambda: object())
    monkeypatch.setattr("src.adapters.compute.k8s.config.kube_config.KubeConfigLoader", FakeLoader)
    monkeypatch.setattr("src.adapters.compute.k8s.client.ApiClient", FakeApiClient)
    monkeypatch.setattr("src.adapters.compute.k8s.client.CoreV1Api", lambda api_client: object())
    monkeypatch.setattr("src.adapters.compute.k8s.client.AppsV1Api", lambda api_client: object())
    adapter = K8s("apiVersion: v1\nclusters: []\n", "shared-secret")

    # Act
    body, status_code, response_headers = adapter.proxy(
        "acme",
        "dashboard",
        "inventory",
        "POST",
        [],
        {"content-type": "application/json", "content-length": "32"},
        b'{"sku":"sku-1","quantity":1}',
    )

    # Assert
    assert body == b"created"
    assert status_code == 201
    assert response_headers == {"content-type": "application/json"}
    assert captured["resource_path"] == "/api/v1/namespaces/longlink-acme/services/dashboard/proxy/inventory"
    assert captured["method"] == "POST"
    assert captured["headers"] == {"Content-Type": "application/json"}
    assert captured["body"] == {"sku": "sku-1", "quantity": 1}


async def test_proxy_sends_untyped_raw_body_as_octet_stream(monkeypatch) -> None:
    """Send raw request bytes without triggering the Kubernetes JSON encoder."""

    # Arrange
    captured: dict[str, object] = {}

    class FakeApiClient:
        def __init__(self, configuration) -> None:
            self.configuration = configuration

        def call_api(
            self,
            resource_path,
            method,
            query_params,
            header_params,
            body,
            auth_settings,
            _preload_content,
            _return_http_data_only,
        ):
            captured["headers"] = header_params
            captured["body"] = body
            response = type("Response", (), {"data": b"ok"})()
            return response, 200, {"content-type": "text/plain"}

    class FakeLoader:
        def __init__(self, kubeconfig) -> None:
            self.kubeconfig = kubeconfig

        def load_and_set(self, configuration) -> None:
            return None

    monkeypatch.setattr("src.adapters.compute.k8s.client.Configuration", lambda: object())
    monkeypatch.setattr("src.adapters.compute.k8s.config.kube_config.KubeConfigLoader", FakeLoader)
    monkeypatch.setattr("src.adapters.compute.k8s.client.ApiClient", FakeApiClient)
    monkeypatch.setattr("src.adapters.compute.k8s.client.CoreV1Api", lambda api_client: object())
    monkeypatch.setattr("src.adapters.compute.k8s.client.AppsV1Api", lambda api_client: object())
    adapter = K8s("apiVersion: v1\nclusters: []\n", "shared-secret")

    # Act
    adapter.proxy("acme", "dashboard", "upload", "POST", [], {}, b"raw-body")

    # Assert
    assert captured["headers"] == {"Content-Type": "application/octet-stream"}
    assert captured["body"] == b"raw-body"
