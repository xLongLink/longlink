import pytest
from uuid import UUID
from src.kubernetes.reconcile import Reconciler, DesiredCompute, DesiredGatewayRoute
from src.kubernetes.resources import KubernetesResources

pytestmark = pytest.mark.no_db


class FailingResources(KubernetesResources):
    """Fail if validation allows reconciliation to touch the cluster boundary."""

    def __init__(self) -> None:
        """Initialize without a kubeconfig because validation should stop first."""

    async def read(self, *args: object, **kwargs: object) -> None:
        """Fail any attempted cluster read."""

        raise AssertionError("reconciliation should fail before reading cluster resources")

    async def apply(self, *args: object, **kwargs: object) -> None:
        """Fail any attempted cluster apply."""

        raise AssertionError("reconciliation should fail before applying cluster resources")


def route(application_id: str = "20000000-0000-4000-8000-000000000001", namespace: str = "acme") -> DesiredGatewayRoute:
    """Build one desired gateway route for validation tests."""

    return DesiredGatewayRoute(id=UUID(application_id), namespace=namespace)


@pytest.mark.parametrize(
    ("desired", "proxy_secret", "message"),
    [
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(route(),),
                deleting=True,
            ),
            "proxy-secret",
            "Deleting compute desired state",
        ),
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(route(), route()),
            ),
            "proxy-secret",
            "Duplicate desired gateway route",
        ),
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(route(namespace="Invalid_Namespace"),),
            ),
            "proxy-secret",
            "Value must contain only lowercase letters, numbers, and hyphens",
        ),
        (
            DesiredCompute(id=UUID("00000000-0000-4000-8000-000000000001"), routes=()),
            "bad secret",
            "Gateway proxy secret",
        ),
    ],
)
async def test_reconcile_rejects_invalid_desired_state_before_cluster_access(
    desired: DesiredCompute,
    proxy_secret: str,
    message: str,
) -> None:
    """Validate compute gateway snapshots before any cluster reads or writes."""

    # Act and assert
    with pytest.raises(ValueError, match=message):
        await Reconciler(FailingResources()).reconcile(desired, proxy_secret)
