import pytest
from fastapi import HTTPException
from src.utils import names

pytestmark = pytest.mark.no_db


def test_slugify_normalizes_to_dns_label() -> None:
    """Normalize mixed user input into a lowercase DNS label slug."""

    assert names.slugify("  Acme Team / Reports  ") == "acme-team-reports"


@pytest.mark.parametrize("value", [" !!! ", "a" * 64])
def test_slugify_rejects_invalid_slug(value: str) -> None:
    """Reject names that cannot produce one Kubernetes DNS label."""

    with pytest.raises(HTTPException) as exc:
        names.slugify(value)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Invalid name"


def test_knames_accepts_valid_dns_label() -> None:
    """Accept valid Kubernetes DNS labels."""

    names.knames("dashboard-api")


@pytest.mark.parametrize("value", ["", "Dashboard", "dashboard_api", "dashboard-", "-dashboard"])
def test_knames_rejects_invalid_dns_label(value: str) -> None:
    """Reject values that Kubernetes cannot use as DNS labels."""

    with pytest.raises(ValueError):
        names.knames(value)


def test_knames_rejects_overlong_dns_label() -> None:
    """Reject Kubernetes DNS labels longer than 63 characters."""

    with pytest.raises(ValueError, match="Value must be at most 63 characters"):
        names.knames("a" * 64)


def test_knames_rejects_system_namespace() -> None:
    """Reject Kubernetes system namespaces as runtime resource names."""

    with pytest.raises(ValueError, match="Value is reserved"):
        names.knames("kube-system")
