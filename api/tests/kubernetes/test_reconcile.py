import pytest
from uuid import UUID
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.reconcile import Reconciler, DesiredCompute, DesiredApplication, DesiredOrganization

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


@pytest.mark.parametrize(
    ("desired", "proxy_secret", "message"),
    [
        (
            DesiredCompute(id=UUID("00000000-0000-4000-8000-000000000001"), organizations=(organization(),), applications=(), deleting=True),
            "proxy-secret",
            "Deleting compute desired state",
        ),
        (
            DesiredCompute(
                id=UUID("00000000-0000-4000-8000-000000000001"),
                organizations=(organization(slug="acme"), organization("10000000-0000-4000-8000-000000000002", "acme")),
                applications=(),
            ),
            "proxy-secret",
            "Duplicate desired organization namespace",
        ),
        (
            DesiredCompute(id=UUID("00000000-0000-4000-8000-000000000001"), organizations=(organization(),), applications=(application(namespace="wrong"),)),
            "proxy-secret",
            "namespace does not match",
        ),
        (
            DesiredCompute(id=UUID("00000000-0000-4000-8000-000000000001"), organizations=(organization(),), applications=(application(envs={"BAD-NAME": "x"}),)),
            "proxy-secret",
            "invalid environment names",
        ),
        (
            DesiredCompute(id=UUID("00000000-0000-4000-8000-000000000001"), organizations=(), applications=()),
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
