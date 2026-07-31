import pytest
import longlink.assets as assets
from pathlib import Path
from longlink import Envs, create_fs
from longlink.storage import assets as organization_assets


def test_logo_returns_development_fallback_asset(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Return the bundled logo asset in development and testing runtimes."""

    # Arrange
    logo_path = tmp_path / ".static" / "assets" / "logo.svg"
    logo_path.parent.mkdir(parents=True)
    logo_path.write_bytes(b"<svg />")
    monkeypatch.setattr(assets, "ROOT", tmp_path)
    env = Envs(ENV="testing")

    # Act
    logo = assets.logo(env, create_fs(env, "", ""))

    # Assert
    assert logo == organization_assets.OrganizationAsset(
        path=organization_assets.LOGO_PATH,
        content=b"<svg />",
        content_type=organization_assets.LOGO_CONTENT_TYPE,
    )


def test_logo_requires_shared_storage_scope_in_production() -> None:
    """Require the Organization bucket and shared prefix before reading production assets."""

    # Arrange
    env = Envs(ENV="production", STORAGE_BUCKET=None, STORAGE_SHARED_PREFIX="shared/")

    # Act and assert
    with pytest.raises(ValueError, match="LONGLINK_STORAGE_BUCKET and LONGLINK_STORAGE_SHARED_PREFIX"):
        assets.logo(env, create_fs(Envs(ENV="testing"), "", ""))
