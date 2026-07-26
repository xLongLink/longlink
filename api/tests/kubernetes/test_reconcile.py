import pytest
from uuid import UUID
from src.models.operations import ReconciliationScope
from src.kubernetes.reconcile import Reconciler, DesiredCompute, DesiredApplication, DesiredGatewayRoute, DesiredOrganization
from src.kubernetes.resources import KubernetesResources

pytestmark = pytest.mark.no_db


class FailingResources(KubernetesResources):
    """Fail if validation allows reconciliation to touch the cluster boundary."""

    def __init__(self) -> None:
        """Initialize without a real kubeconfig because validation should stop first."""

    async def read(self, *args: object, **kwargs: object) -> None:
        """Fail any attempted cluster read."""

        raise AssertionError("reconciliation should fail before reading cluster resources")

    async def apply(self, *args: object, **kwargs: object) -> None:
        """Fail any attempted cluster apply."""

        raise AssertionError("reconciliation should fail before applying cluster resources")


def organization(organization_id: str = "10000000-0000-4000-8000-000000000001", slug: str = "acme") -> DesiredOrganization:
    """Build one desired Organization for validation tests."""

    return DesiredOrganization(id=UUID(organization_id), slug=slug)


def application(
    application_id: str = "20000000-0000-4000-8000-000000000001",
    organization_id: str = "10000000-0000-4000-8000-000000000001",
    namespace: str = "acme",
    envs: dict[str, str] | None = None,
) -> DesiredApplication:
    """Build one desired Application for validation tests."""

    return DesiredApplication(
        id=UUID(application_id),
        organization_id=UUID(organization_id),
        namespace=namespace,
        image="ghcr.io/longlink/dashboard@sha256:" + "a" * 64,
        envs=envs or {"PORT": "8000"},
    )


def route(
    application_id: str = "20000000-0000-4000-8000-000000000001",
    namespace: str = "acme",
) -> DesiredGatewayRoute:
    """Build one desired gateway route for validation tests."""

    return DesiredGatewayRoute(id=UUID(application_id), namespace=namespace)


@pytest.mark.parametrize(
    ("desired", "proxy_secret", "message"),
    [
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(),
                organizations=(organization(),),
                applications=(),
                deleting=True,
            ),
            "proxy-secret",
            "Deleting compute desired state",
        ),
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(),
                organizations=(organization(slug="acme"), organization("10000000-0000-4000-8000-000000000002", "acme")),
                applications=(),
                application_ids=(),
                organizations_complete=True,
            ),
            "proxy-secret",
            "Duplicate desired organization namespace",
        ),
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(route(namespace="wrong"),),
                organizations=(organization(),),
                applications=(application(namespace="wrong"),),
                application_ids=(UUID("20000000-0000-4000-8000-000000000001"),),
            ),
            "proxy-secret",
            "namespace does not match",
        ),
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(route(),),
                organizations=(organization(),),
                applications=(application(envs={"BAD-NAME": "x"}),),
                application_ids=(UUID("20000000-0000-4000-8000-000000000001"),),
            ),
            "proxy-secret",
            "invalid environment names",
        ),
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                routes=(),
                organizations=(),
                applications=(),
                scope=ReconciliationScope.platform,
            ),
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
    """Validate desired compute snapshots before any cluster reads or writes."""

    # Act and assert
    with pytest.raises(ValueError, match=message):
        await Reconciler(FailingResources()).reconcile(desired, proxy_secret)
