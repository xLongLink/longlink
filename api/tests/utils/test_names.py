import pytest

from src.utils import names


def test_slugify_normalizes_to_dns_label() -> None:
    """Normalize mixed user input into a lowercase DNS label slug."""

    assert names.slugify("  Acme Team / Reports  ") == "acme-team-reports"


def test_slugify_rejects_empty_slug() -> None:
    """Reject names that have no slug-safe characters."""

    with pytest.raises(ValueError, match="Application name must contain at least one lowercase letter or number"):
        names.slugify(" !!! ", "Application name")


def test_slugify_rejects_overlong_slug() -> None:
    """Reject slugs that exceed one Kubernetes DNS label."""

    with pytest.raises(ValueError, match="Application name must be at most 63 characters"):
        names.slugify("a" * 64, "Application name")


def test_knames_returns_valid_dns_label() -> None:
    """Return valid Kubernetes DNS labels unchanged."""

    assert names.knames("dashboard-api", "Application name") == "dashboard-api"


@pytest.mark.parametrize("value", ["", "Dashboard", "dashboard_api", "dashboard-", "-dashboard"])
def test_knames_rejects_invalid_dns_label(value: str) -> None:
    """Reject values that Kubernetes cannot use as DNS labels."""

    with pytest.raises(ValueError):
        names.knames(value, "Application name")


def test_knames_rejects_overlong_dns_label() -> None:
    """Reject Kubernetes DNS labels longer than 63 characters."""

    with pytest.raises(ValueError, match="Application name must be at most 63 characters"):
        names.knames("a" * 64, "Application name")
