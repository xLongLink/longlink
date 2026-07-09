import pytest

from tenant.storage import assets


def test_logo_path_returns_shared_logo_key() -> None:
    """Return the stable shared-storage logo path."""

    assert assets.logo_path() == "brand/logo.svg"


def test_organization_asset_normalizes_path_and_content_type() -> None:
    """Build normalized organization asset metadata."""

    asset = assets.organization_asset(" brand/logo.svg ", b"<svg />")

    assert asset == assets.OrganizationAsset("brand/logo.svg", b"<svg />", "image/svg+xml")


def test_asset_content_type_uses_default_for_unknown_extensions() -> None:
    """Use the caller default when the MIME type cannot be guessed."""

    assert assets.asset_content_type("asset.unknown-extension", default_content_type="text/plain") == "text/plain"


@pytest.mark.parametrize("path", ["", "/brand/logo.svg", "../logo.svg", "brand/../logo.svg"])
def test_normalize_asset_path_rejects_unsafe_paths(path: str) -> None:
    """Reject asset paths outside shared storage."""

    with pytest.raises(ValueError, match="relative paths"):
        assets.normalize_asset_path(path)
