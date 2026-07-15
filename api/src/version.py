import re

PLATFORM_VERSION_PATTERN = r"^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$"


def platform_version_key(version: str) -> tuple[int, int, int]:
    """Return a sortable semantic release key for one Platform version."""

    # Persisted and configured versions use the exact release-tag format.
    match = re.fullmatch(PLATFORM_VERSION_PATTERN, version)
    if match is None:
        raise ValueError(f"Invalid Platform version {version!r}")
    major, minor, patch = match.groups()
    return int(major), int(minor), int(patch)


def latest_platform_version(*versions: str) -> str:
    """Return the newest Platform version without changing its stored spelling."""

    if not versions:
        raise ValueError("At least one Platform version is required")
    return max(versions, key=platform_version_key)
