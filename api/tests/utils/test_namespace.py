import pytest

from src.utils.namespace import dbname, k8name, s3name


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


def test_s3name_returns_managed_bucket_name() -> None:
    """Prefix storage source names for managed S3 buckets."""

    assert s3name("acme-team-shared") == "longlink-acme-team-shared"


def test_s3name_allows_maximum_length_bucket_name() -> None:
    """Allow final S3 bucket names exactly at the backend limit."""

    assert s3name("a" * 54) == f"longlink-{'a' * 54}"


def test_s3name_rejects_overlong_bucket_name() -> None:
    """Reject S3 bucket names longer than 63 characters."""

    with pytest.raises(ValueError, match="S3 bucket name must be at most 63 characters"):
        s3name("a" * 55)


@pytest.mark.parametrize("value", ["Acme", "acme_team", "acme-"])
def test_s3name_rejects_invalid_bucket_name(value: str) -> None:
    """Reject bucket names that are not lowercase hyphenated names."""

    with pytest.raises(ValueError, match="S3 bucket name must contain only lowercase letters"):
        s3name(value)
