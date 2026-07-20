import pytest
import longlink.assets as assets
from pathlib import Path
from longlink import Envs, create_fs
from longlink.storage import assets as organization_assets


def test_logo_returns_development_fallback_asset(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Return the bundled logo asset in development and testing runtimes."""

    # Arrange
    logo_path = tmp_path / "logo.svg"
    logo_path.write_bytes(b"<svg />")
    monkeypatch.setattr(assets, "LOCAL_LOGO_PATH", logo_path)
    env = Envs(ENV="testing")

    # Act
    logo = assets.logo(env, create_fs(env, "", ""))

    # Assert
    assert logo == organization_assets.OrganizationAsset(
        path=organization_assets.logo_path(),
        content=b"<svg />",
        content_type=organization_assets.LOGO_CONTENT_TYPE,
    )


@pytest.mark.parametrize(("bucket", "prefix"), [(None, "shared/"), ("acme", None)])
def test_logo_requires_shared_storage_scope_in_production(bucket: str | None, prefix: str | None) -> None:
    """Require the Organization bucket and shared prefix before reading production assets."""

    # Arrange
    env = Envs(ENV="production", STORAGE_BUCKET=bucket, STORAGE_SHARED_PREFIX=prefix)

    # Act and assert
    with pytest.raises(ValueError, match="LONGLINK_STORAGE_BUCKET and LONGLINK_STORAGE_SHARED_PREFIX"):
        assets.logo(env, create_fs(Envs(ENV="testing"), "", ""))
