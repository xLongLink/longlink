import pytest
import longlink.assets as assets
from pathlib import Path
from longlink import Envs, create_fs
from longlink.storage import assets as organization_assets


def test_logo_returns_development_fallback_asset(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Return the bundled logo asset in development and testing runtimes."""

    logo_path = tmp_path / "logo.svg"
    logo_path.write_bytes(b"<svg />")
    monkeypatch.setattr(assets, "LOCAL_LOGO_PATH", logo_path)
    env = Envs(ENV="testing")

    logo = assets.logo(env, create_fs(env, ""))

    assert logo == organization_assets.OrganizationAsset(
        path=organization_assets.logo_path(),
        content=b"<svg />",
        content_type=organization_assets.LOGO_CONTENT_TYPE,
    )


def test_logo_requires_shared_bucket_in_production() -> None:
    """Require a configured shared bucket before reading production assets."""

    env = Envs(ENV="production")

    try:
        assets.logo(env, create_fs(Envs(ENV="testing"), ""))
    except ValueError as exc:
        assert "STORAGE_SHARED_BUCKET" in str(exc)
    else:
        raise AssertionError("Production logo should require shared storage")
