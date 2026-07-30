import pytest
from longlink.storage import assets


@pytest.mark.parametrize("path", ["", ".", "/brand/logo.svg", "../logo.svg", "brand/../logo.svg"])
def test_normalize_asset_path_rejects_unsafe_paths(path: str) -> None:
    """Reject asset paths outside the shared storage prefix."""

    # Validate each unsafe path at the organization asset boundary.
    with pytest.raises(ValueError, match="relative paths"):
        assets.normalize_asset_path(path)
