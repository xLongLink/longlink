import mimetypes
from pathlib import PurePosixPath
from dataclasses import dataclass

LOGO_CONTENT_TYPE = "image/svg+xml"
LOGO_PATH = "brand/logo.svg"


@dataclass(frozen=True)
class OrganizationAsset:
    """Represent one read-only Organization asset."""

    path: str
    content: bytes
    content_type: str


def logo_path() -> str:
    """Return the path for the Organization logo within shared storage."""

    return LOGO_PATH


def organization_asset(
    path: str,
    content: bytes,
    *,
    default_content_type: str = "application/octet-stream",
) -> OrganizationAsset:
    """Return normalized organization asset data."""

    asset_path = normalize_asset_path(path)
    return OrganizationAsset(
        path=asset_path,
        content=content,
        content_type=asset_content_type(asset_path, default_content_type=default_content_type),
    )


def asset_content_type(path: str, *, default_content_type: str = "application/octet-stream") -> str:
    """Return the content type for one organization asset path."""

    return mimetypes.guess_type(path)[0] or default_content_type


def normalize_asset_path(path: str) -> str:
    """Return a safe asset path relative to the shared storage prefix."""

    asset_path = path.strip()
    parsed_path = PurePosixPath(asset_path)

    # Asset paths stay relative to the shared prefix, never a filesystem root or parent.
    if not asset_path or parsed_path.is_absolute() or not parsed_path.parts or ".." in parsed_path.parts:
        raise ValueError("Organization asset paths must be relative paths inside the shared storage prefix")

    return parsed_path.as_posix()
