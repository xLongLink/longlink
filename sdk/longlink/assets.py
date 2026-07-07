from tenant.storage import assets as organization_assets
from longlink.constants import ROOT
from longlink.storage import create_shared_fs
from longlink.utils.settings import Envs

LOCAL_LOGO_PATH = ROOT / ".static" / "assets" / "logo.svg"

_env = Envs()
_shared_fs = create_shared_fs(_env)


def logo() -> organization_assets.OrganizationAsset:
    """Return the organization logo asset."""

    asset_path = organization_assets.logo_path()

    # Local runtimes use the SDK-managed fallback while production reads the organization bucket.
    if _env.ENV in {"development", "testing"}:
        content = LOCAL_LOGO_PATH.read_bytes()
    else:
        if _env.STORAGE_SHARED_BUCKET is None:
            raise ValueError("Organization assets require LONGLINK_STORAGE_SHARED_BUCKET in production")

        with _shared_fs.open(asset_path, "rb") as asset_file:
            content = asset_file.read()

    return organization_assets.organization_asset(
        asset_path,
        content,
        default_content_type=organization_assets.LOGO_CONTENT_TYPE,
    )
