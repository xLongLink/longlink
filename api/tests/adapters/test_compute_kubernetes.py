from kubernetes.client.rest import ApiException
from src.adapters.compute.k8s import K8s


async def test_setup_installs_kong(monkeypatch) -> None:
    """Install Kong before the cluster is used for app routing."""

    # Arrange
    captured: list[tuple[str, bool, dict[str, str] | None]] = []

    async def fake_apply_remote_manifests(self, url: str, cluster_scoped: bool = False, replace: dict[str, str] | None = None) -> None:
        captured.append((url, cluster_scoped, replace))

    async def fake_wait_for_deployment(self, name: str, namespace: str) -> None:
        captured.append((f"wait:{namespace}/{name}", False, None))

    monkeypatch.setattr("src.adapters.compute.k8s.client.Configuration", lambda: object())
    monkeypatch.setattr("src.adapters.compute.k8s.client.ApiClient", lambda configuration: object())
    monkeypatch.setattr("src.adapters.compute.k8s.config.kube_config.KubeConfigLoader", lambda kubeconfig: type("Loader", (), {"load_and_set": lambda self, configuration: None})())
    monkeypatch.setattr("src.adapters.compute.k8s.client.CoreV1Api", lambda api_client: object())
    monkeypatch.setattr("src.adapters.compute.k8s.client.AppsV1Api", lambda api_client: object())
    monkeypatch.setattr("src.adapters.compute.k8s.DynamicClient", lambda api_client: object())
    monkeypatch.setattr(K8s, "_apply_remote_manifests", fake_apply_remote_manifests)
    monkeypatch.setattr(K8s, "_wait_for_deployment", fake_wait_for_deployment)
    adapter = K8s("apiVersion: v1\nclusters: []\n", "shared-secret")

    # Act
    await adapter.setup()

    # Assert
    assert [item[0] for item in captured[:-1]] == [
        "https://github.com/kong/kubernetes-configuration/config/crd/ingress-controller?ref=v1.5.2",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/base/namespace.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/rbac/leader_election_role.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/rbac/leader_election_role_binding.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/rbac/role.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/rbac/role_binding.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/base/serviceaccount.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/base/service.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/base/ingressclass.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/base/validation-service.yaml",
        "https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/v3.5.9/config/base/kong-ingress-dbless.yaml",
    ]
    assert captured[-1][0] == "wait:kong/ingress-kong"


async def test_application_applies_kong_manifests(monkeypatch) -> None:
    """Provision the app and expose it through Kong with a keyed route."""

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

    class FakeResources:
        def get(self, *, api_version: str, kind: str):
            return FakeResource(kind, True)

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
    assert result == "/longlink-acme/dashboard/"
    assert captured == [
        ("Secret", "dashboard", "longlink-acme"),
        ("Deployment", "dashboard", "longlink-acme"),
        ("Service", "dashboard", "longlink-acme"),
        ("Secret", "dashboard-kong-key-auth", "longlink-acme"),
        ("KongConsumer", "dashboard-kong-consumer", "longlink-acme"),
        ("KongPlugin", "dashboard-key-auth", "longlink-acme"),
        ("Ingress", "dashboard", "longlink-acme"),
    ]
