import pytest
from src.utils.namespace import dbname, k8name


def test_dbname_returns_managed_database_name() -> None:
    """Prefix organization slugs for managed PostgreSQL databases."""

    assert dbname("acme-team") == "longlink_acme-team"


def test_dbname_rejects_invalid_source_name() -> None:
    """Reject database source names that are not runtime-safe slugs."""

    with pytest.raises(ValueError, match="Database source name"):
        dbname("Acme Team")


def test_dbname_rejects_overlong_database_name() -> None:
    """Reject database names longer than PostgreSQL's identifier limit."""

    with pytest.raises(ValueError, match="Database name must be at most 63 characters"):
        dbname("a" * 55)


def test_k8name_returns_managed_kubernetes_name() -> None:
    """Prefix organization slugs for managed Kubernetes namespaces."""

    assert k8name("acme-team") == "longlink-acme-team"


def test_k8name_allows_maximum_length_name() -> None:
    """Allow final Kubernetes names exactly at the DNS label limit."""

    assert k8name("a" * 54) == f"longlink-{'a' * 54}"


def test_k8name_rejects_overlong_name() -> None:
    """Reject final Kubernetes names longer than one DNS label."""

    with pytest.raises(ValueError, match="Kubernetes name must be at most 63 characters"):
        k8name("a" * 55)
