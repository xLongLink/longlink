import pytest
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

pytestmark = pytest.mark.no_db


def test_longlink_metadata_tracks_runtime_image_outside_serialized_payload() -> None:
    """Keep resolved runtime image references out of public metadata serialization."""

    # Runtime image references are assigned after label parsing and should not appear in the API payload.
    metadata = LongLinkMetadata(title="Dashboard")
    metadata.image = "ghcr.io/longlink/dashboard@sha256:manifest"

    assert metadata.image == "ghcr.io/longlink/dashboard@sha256:manifest"
    assert "image" not in metadata.model_dump(mode="json")


def test_longlink_metadata_serializes_environment_metadata() -> None:
    """Serialize image-provided environment requirements for the web frontend."""

    # Environment metadata keeps required runtime configuration visible to deploy forms.
    metadata = LongLinkMetadata(
        title="Dashboard",
        environments=[EnvironmentMetadata(name="API_KEY", type="str", required=True, description="API key")],
    )

    assert metadata.model_dump(mode="json")["environments"] == [
        {"name": "API_KEY", "type": "str", "required": True, "description": "API key"}
    ]
