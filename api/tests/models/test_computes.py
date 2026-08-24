import pytest
from pydantic import ValidationError
from src.models.computes import ComputeRegistryCreate

pytestmark = pytest.mark.no_db


def test_compute_registry_create_parses_yaml_kubeconfig() -> None:
    """Accept YAML kubeconfigs and persist their JSON-compatible mapping."""

    # Act
    payload = ComputeRegistryCreate.model_validate({"name": "Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"})

    # Assert
    assert payload.kubeconfig == {"apiVersion": "v1", "clusters": []}


@pytest.mark.parametrize(
    ("kubeconfig", "message"),
    [
        pytest.param("[", "valid YAML", id="invalid-yaml"),
        pytest.param([], "must be a mapping", id="non-mapping"),
        pytest.param({"cluster": object()}, "JSON-compatible", id="non-json-value"),
    ],
)
def test_compute_registry_create_rejects_invalid_kubeconfigs(kubeconfig: object, message: str) -> None:
    """Reject kubeconfigs outside the persisted JSON mapping boundary."""

    # Act and assert
    with pytest.raises(ValidationError, match=message):
        ComputeRegistryCreate.model_validate({"name": "Compute", "kubeconfig": kubeconfig})
