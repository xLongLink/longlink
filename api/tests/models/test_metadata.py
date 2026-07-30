import pytest
from src.models.metadata import LongLinkMetadata

pytestmark = pytest.mark.no_db


def test_longlink_metadata_excludes_resolved_image_from_public_payload() -> None:
    """Keep resolved runtime images out of public metadata responses."""

    # Runtime image references are needed after resolution but must not be exposed.
    metadata = LongLinkMetadata(image="ghcr.io/longlink/dashboard@sha256:manifest", title="Dashboard")

    assert metadata.image == "ghcr.io/longlink/dashboard@sha256:manifest"
    assert "image" not in metadata.model_dump()
