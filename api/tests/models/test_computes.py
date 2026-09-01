import pytest
from pydantic import ValidationError
from src.models.computes import ComputeRegistryCreate

pytestmark = pytest.mark.no_db


def test_compute_registry_create_parses_yaml_kubeconfig() -> None:
    """Accept YAML kubeconfigs and persist their JSON-compatible mapping."""

    # Act
    payload = ComputeRegistryCreate.model_validate(
        {
            "name": "Compute",
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


def test_compute_registry_create_rejects_exec_authentication() -> None:
    """Reject kubeconfigs that can execute commands in the API worker."""

    # Act and assert
    with pytest.raises(ValidationError, match="exec authentication is not allowed"):
        ComputeRegistryCreate.model_validate(
            {
                "name": "Compute",
                "kubeconfig": {
                    "apiVersion": "v1",
                    "clusters": [{"name": "cluster", "cluster": {}}],
                    "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "worker"}}],
                    "current-context": "context",
                    "users": [
                        {
                            "name": "worker",
                            "user": {
                                "exec": {
                                    "apiVersion": "client.authentication.k8s.io/v1",
                                    "command": "untrusted-command",
                                }
                            },
                        }
                    ],
                },
            }
        )


@pytest.mark.parametrize(
    ("kubeconfig", "message"),
    [
        pytest.param("[", "valid YAML", id="invalid-yaml"),
        pytest.param([], "must be a mapping", id="non-mapping"),
        pytest.param({"cluster": object()}, "JSON-compatible", id="non-json-value"),
        pytest.param({}, "requires clusters, contexts, users, and current-context", id="incomplete"),
        pytest.param(
            {
                "clusters": [{"name": "cluster", "cluster": {}}],
                "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "missing-user"}}],
                "current-context": "context",
                "users": [{"name": "user", "user": {}}],
            },
            "current-context must reference a configured cluster and user",
            id="dangling-context-user",
        ),
    ],
)
def test_compute_registry_create_rejects_invalid_kubeconfigs(kubeconfig: object, message: str) -> None:
    """Reject kubeconfigs outside the persisted JSON mapping boundary."""

    # Act and assert
    with pytest.raises(ValidationError, match=message):
        ComputeRegistryCreate.model_validate({"name": "Compute", "kubeconfig": kubeconfig})
