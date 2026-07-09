import pytest
from pathlib import Path
from tenant.storage import assets as organization_assets

from longlink import assets


def test_logo_returns_development_fallback_asset(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Return the bundled logo asset in development and testing runtimes."""

    logo_path = tmp_path / "logo.svg"
    logo_path.write_bytes(b"<svg />")
    monkeypatch.setattr(assets._env, "ENV", "testing")
    monkeypatch.setattr(assets, "LOCAL_LOGO_PATH", logo_path)

    logo = assets.logo()

    assert logo == organization_assets.OrganizationAsset(
        path=organization_assets.logo_path(),
        content=b"<svg />",
        content_type=organization_assets.LOGO_CONTENT_TYPE,
    )


def test_logo_requires_shared_bucket_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    """Require a configured shared bucket before reading production assets."""

    monkeypatch.setattr(assets._env, "ENV", "production")
    monkeypatch.setattr(assets._env, "STORAGE_SHARED_BUCKET", None)

    try:
        assets.logo()
    except ValueError as exc:
        assert "STORAGE_SHARED_BUCKET" in str(exc)
    else:
        raise AssertionError("Production logo should require shared storage")
