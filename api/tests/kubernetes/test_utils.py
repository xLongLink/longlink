from types import SimpleNamespace
import pytest
from src.kubernetes.utils import deployment_is_ready


READY_STATUS = {
    "observedGeneration": 3,
    "replicas": 2,
    "updatedReplicas": 2,
    "readyReplicas": 2,
    "availableReplicas": 2,
}


@pytest.mark.parametrize(
    ("generation", "replicas", "status", "expected"),
    [
        pytest.param(3, 2, READY_STATUS, True, id="current"),
        pytest.param(None, 2, READY_STATUS, False, id="missing-generation"),
        pytest.param(3, None, READY_STATUS, False, id="missing-replicas"),
        pytest.param(3, 2, READY_STATUS | {"observedGeneration": 2}, False, id="stale-generation"),
        pytest.param(3, 2, READY_STATUS | {"replicas": 1}, False, id="pending-replicas"),
        pytest.param(3, 2, READY_STATUS | {"updatedReplicas": 1}, False, id="stale-replicas"),
        pytest.param(3, 2, READY_STATUS | {"readyReplicas": 1}, False, id="unready-replicas"),
        pytest.param(3, 2, READY_STATUS | {"availableReplicas": 1}, False, id="unavailable-replicas"),
    ],
)
def test_deployment_is_ready_requires_current_replicas(
    generation: int | None,
    replicas: int | None,
    status: dict[str, int],
    expected: bool,
) -> None:
    """Require every requested replica to belong to the current Deployment generation."""

    # Arrange
    deployment = SimpleNamespace(
        metadata={"generation": generation},
        spec={"replicas": replicas},
        raw={"status": status},
    )

    # Act
    result = deployment_is_ready(deployment)

    # Assert
    assert result is expected
