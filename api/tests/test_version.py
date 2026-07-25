import pytest
from src import version

pytestmark = pytest.mark.no_db


def test_platform_version_key_sorts_numeric_release_parts() -> None:
    """Order strict Platform release tags by numeric major, minor, and patch parts."""

    # Act
    latest = version.latest_platform_version("v1.2.9", "v1.10.0", "v1.2.10")

    # Assert
    assert version.platform_version_key("v1.10.0") > version.platform_version_key("v1.2.10")
    assert latest == "v1.10.0"


@pytest.mark.parametrize("value", ["1.2.3", "v01.2.3", "v1.2", "latest"])
def test_platform_version_key_rejects_malformed_versions(value: str) -> None:
    """Reject values outside the strict Platform release tag format."""

    # Act and assert
    with pytest.raises(ValueError, match="Invalid Platform version"):
        version.platform_version_key(value)


def test_latest_platform_version_requires_at_least_one_version() -> None:
    """Reject empty version selection."""

    # Act and assert
    with pytest.raises(ValueError, match="At least one Platform version is required"):
        version.latest_platform_version()
