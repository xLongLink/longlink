import pytest
from pydantic import ValidationError
from src.models.computes import ComputeRegistryCreate

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    "gateway_url",
    [
        pytest.param("http://gateway.example", id="http-scheme"),
        pytest.param("https://user@gateway.example", id="username"),
        pytest.param("https://:secret@gateway.example", id="password"),
        pytest.param("https://gateway.example/ready", id="path"),
        # Endpoint configuration accepts origins, not resource-specific URLs.
        pytest.param("https://gateway.example?next=1", id="query"),
        pytest.param("https://gateway.example#ready", id="fragment"),
    ],
)
def test_compute_registry_create_rejects_non_origin_gateway_url(gateway_url: str) -> None:
    """Reject Compute gateway endpoints that are not bare HTTPS origins."""

    # Act and assert
    with pytest.raises(ValidationError, match="Endpoint must be an HTTPS origin"):
        ComputeRegistryCreate.model_validate(
            {
                "name": "Compute",
                "gateway_url": gateway_url,
                "storage_endpoint": "https://storage.example",
                "kubeconfig": {
                    "clusters": [{"name": "cluster", "cluster": {}}],
                    "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
                    "current-context": "context",
                    "users": [{"name": "user", "user": {}}],
                },
            }
        )


def test_compute_registry_create_parses_yaml_kubeconfig() -> None:
    """Accept YAML kubeconfigs and persist their JSON-compatible mapping."""

    # Act
    payload = ComputeRegistryCreate.model_validate(
        {
            "name": "Compute",
            "storage_endpoint": "https://storage.example",
            "gateway_url": "https://gateway.example",
            "kubeconfig": (
                "apiVersion: v1\n"
                "clusters:\n- name: cluster\n  cluster:\n    server: https://kubernetes.example\n"
                "contexts:\n- name: context\n  context:\n    cluster: cluster\n    user: user\n"
                "current-context: context\n"
                "users:\n- name: user\n  user:\n    token: secret\n"
            ),
        }
    )

    # Assert
    assert payload.kubeconfig["current-context"] == "context"


@pytest.mark.parametrize(
    ("kubeconfig", "message"),
    [
        pytest.param("[", "valid YAML", id="invalid-yaml"),
        pytest.param([], "must be a mapping", id="non-mapping"),
        pytest.param({"cluster": object()}, "JSON-compatible", id="non-json-value"),
        pytest.param({}, "requires clusters, contexts, users, and current-context", id="incomplete"),
        pytest.param(
            {
                "apiVersion": "v1",
                "clusters": [{"name": "cluster", "cluster": {}}],
                "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "worker"}}],
                "current-context": "context",
                "users": [
                    # Authentication data must never cause subprocess execution.
                    {"name": "worker", "user": {"exec": {"apiVersion": "client.authentication.k8s.io/v1", "command": "untrusted-command"}}}
                ],
            },
            # Executable authentication is rejected even in otherwise valid kubeconfig.
            "exec authentication is not allowed",
            id="exec-authentication",
        ),
        pytest.param(
            {
                "clusters": [{"name": "cluster", "cluster": {}}],
                "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "missing-user"}}],
                "current-context": "context",
                "users": [{"name": "user", "user": {}}],
            },
            # Contexts must resolve both their cluster and authentication identity.
            "current-context must reference a configured cluster and user",
            id="dangling-context-user",
        ),
    ],
)
def test_compute_registry_create_rejects_invalid_kubeconfigs(kubeconfig: object, message: str) -> None:
    """Reject kubeconfigs outside the persisted JSON mapping boundary."""

    # Act and assert
    with pytest.raises(ValidationError, match=message):
        ComputeRegistryCreate.model_validate(
            {
                "name": "Compute",
                "kubeconfig": kubeconfig,
                "gateway_url": "https://gateway.example",
                "storage_endpoint": "https://storage.example",
            }
        )


# Context references must use scalar names, not structured values.
@pytest.mark.parametrize("field", ["cluster", "user"])
@pytest.mark.parametrize("reference", [pytest.param([], id="list"), pytest.param({}, id="mapping")])
def test_compute_registry_create_rejects_non_string_context_references(field: str, reference: object) -> None:
    """Report malformed context references as validation errors rather than type errors."""

    # Arrange
    context: dict[str, object] = {"cluster": "cluster", "user": "user"}
    context[field] = reference
    kubeconfig = {
        "clusters": [{"name": "cluster", "cluster": {}}],
        "contexts": [{"name": "context", "context": context}],
        "current-context": "context",
        "users": [{"name": "user", "user": {}}],
    }

    # Act and assert
    with pytest.raises(ValidationError, match="current-context must reference a configured cluster and user"):
        ComputeRegistryCreate.model_validate(
            {
                "name": "Compute",
                "kubeconfig": kubeconfig,
                "gateway_url": "https://gateway.example",
                "storage_endpoint": "https://storage.example",
            }
        )
