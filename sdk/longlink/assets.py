from typing import cast
from fsspec.spec import AbstractFileSystem
from longlink.storage import assets as organization_assets
from longlink.constants import ROOT
from longlink.utils.settings import Envs

LOCAL_LOGO_PATH = ROOT / ".static" / "assets" / "logo.svg"


def logo(env: Envs, shared_fs: AbstractFileSystem) -> organization_assets.OrganizationAsset:
    """Return the organization logo asset."""

    asset_path = organization_assets.logo_path()

    # Local runtimes use the SDK-managed fallback while production reads the organization bucket.
    if env.ENV in {"development", "testing"}:
        content = LOCAL_LOGO_PATH.read_bytes()

    # Production reads the organization asset from shared storage.
    else:
        # Fail early when production has no shared asset bucket configured.
        if env.STORAGE_SHARED_BUCKET is None:
            raise ValueError("Organization assets require LONGLINK_STORAGE_SHARED_BUCKET in production")

        # Read the organization asset from shared storage.
        with shared_fs.open(asset_path, "rb") as asset_file:
            content = cast(bytes, asset_file.read())

    return organization_assets.organization_asset(
        asset_path,
        content,
        default_content_type=organization_assets.LOGO_CONTENT_TYPE,
    )
