import pytest
from fastapi import HTTPException
from src.utils import names


def test_slugify_normalizes_to_dns_label() -> None:
    """Normalize mixed user input into a lowercase DNS label slug."""

    assert names.slugify("  Acme Team / Reports  ") == "acme-team-reports"


def test_slugify_rejects_empty_slug() -> None:
    """Reject names that have no slug-safe characters."""

    with pytest.raises(HTTPException) as exc:
        names.slugify(" !!! ")

    assert exc.value.status_code == 409
    assert exc.value.detail == "Invalid name"


def test_slugify_rejects_overlong_slug() -> None:
    """Reject slugs that exceed one Kubernetes DNS label."""

    with pytest.raises(HTTPException) as exc:
        names.slugify("a" * 64)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Invalid name"


def test_knames_returns_valid_dns_label() -> None:
    """Return valid Kubernetes DNS labels unchanged."""

    assert names.knames("dashboard-api") == "dashboard-api"


@pytest.mark.parametrize("value", ["", "Dashboard", "dashboard_api", "dashboard-", "-dashboard"])
def test_knames_rejects_invalid_dns_label(value: str) -> None:
    """Reject values that Kubernetes cannot use as DNS labels."""

    with pytest.raises(ValueError):
        names.knames(value)


def test_knames_rejects_overlong_dns_label() -> None:
    """Reject Kubernetes DNS labels longer than 63 characters."""

    with pytest.raises(ValueError, match="Value must be at most 63 characters"):
        names.knames("a" * 64)


def test_dbname_returns_managed_database_name() -> None:
    """Prefix organization slugs for managed PostgreSQL databases."""

    assert names.dbname("acme-team") == "longlink_acme-team"


def test_dbname_rejects_invalid_source_name() -> None:
    """Reject database source names that are not runtime-safe slugs."""

    with pytest.raises(ValueError, match="Value must contain only lowercase letters, numbers, and hyphens"):
        names.dbname("Acme Team")


def test_dbname_rejects_overlong_database_name() -> None:
    """Reject database names longer than PostgreSQL's identifier limit."""

    with pytest.raises(ValueError, match="Database name must be at most 63 characters"):
        names.dbname("a" * 55)


def test_k8name_returns_managed_kubernetes_name() -> None:
    """Prefix organization slugs for managed Kubernetes namespaces."""

    assert names.k8name("acme-team") == "longlink-acme-team"


def test_k8name_allows_maximum_length_name() -> None:
    """Allow final Kubernetes names exactly at the DNS label limit."""

    assert names.k8name("a" * 54) == f"longlink-{'a' * 54}"


def test_k8name_rejects_overlong_name() -> None:
    """Reject final Kubernetes names longer than one DNS label."""

    with pytest.raises(ValueError, match="Value must be at most 63 characters"):
        names.k8name("a" * 55)
