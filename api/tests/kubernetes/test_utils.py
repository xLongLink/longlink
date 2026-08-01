from types import SimpleNamespace
from src.kubernetes.utils import deployment_is_ready


def test_deployment_is_ready_requires_current_available_replicas() -> None:
    """Require every requested replica to belong to the current Deployment generation."""

    # Model one fully observed and available Deployment state.
    deployment = SimpleNamespace(
        metadata={"generation": 3},
        spec={"replicas": 2},
        raw={
            "status": {
                "observedGeneration": 3,
                "replicas": 2,
                "updatedReplicas": 2,
                "readyReplicas": 2,
                "availableReplicas": 2,
            }
        },
    )
    assert deployment_is_ready(deployment)

    # Reject the Deployment while one replica remains unavailable.
    deployment.raw["status"]["availableReplicas"] = 1
    assert not deployment_is_ready(deployment)
