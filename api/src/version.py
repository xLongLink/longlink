import re

PLATFORM_VERSION_PATTERN = r"^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$"


def platform_version_key(version: str) -> tuple[int, int, int]:
    """Validate a strict LongLink Platform release tag and return its numeric ordering key."""

    # Persisted and configured versions use the exact release-tag format.
    match = re.fullmatch(PLATFORM_VERSION_PATTERN, version)
    if match is None:
        raise ValueError(f"Invalid Platform version {version!r}")
    major, minor, patch = match.groups()
    return int(major), int(minor), int(patch)


def latest_platform_version(*versions: str) -> str:
    """Select the newest validated LongLink Platform release for reconciliation affinity."""

    if not versions:
        raise ValueError("At least one Platform version is required")
    return max(versions, key=platform_version_key)
