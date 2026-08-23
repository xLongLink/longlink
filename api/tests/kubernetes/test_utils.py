import pytest
from types import SimpleNamespace
from src.kubernetes.utils import apply, deployment_is_ready

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


@pytest.mark.parametrize(
    ("exists", "expected_calls"),
    [
        pytest.param(False, [("create", None)], id="missing"),
        pytest.param(True, [("patch", {"metadata": {"name": "dashboard"}})], id="existing"),
    ],
)
async def test_apply_creates_missing_resources_and_repairs_existing_ones(
    exists: bool, expected_calls: list[tuple[str, object | None]]
) -> None:
    """Create absent resources and patch existing resources with their desired manifest."""

    # Arrange
    calls: list[tuple[str, object | None]] = []

    class Resource:
        """Record Kubernetes resource mutation requests."""

        raw = {"metadata": {"name": "dashboard"}}

        async def exists(self) -> bool:
            """Return the configured resource state."""

            return exists

        async def create(self) -> None:
            """Record resource creation."""

            calls.append(("create", None))

        async def patch(self, manifest: object) -> None:
            """Record a drift-repair manifest."""

            calls.append(("patch", manifest))

    # Act
    await apply(Resource())  # type: ignore[arg-type]

    # Assert
    assert calls == expected_calls
