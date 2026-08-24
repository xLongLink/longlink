import pytest
from pydantic import BaseModel
from src.models.types import Image

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("reference", "tag_or_digest"),
    [
        pytest.param("ghcr.io/longlink/dashboard:latest", "latest", id="tagged"),
        pytest.param("ghcr.io/longlink/dashboard@sha256:abc123", "sha256:abc123", id="digest-pinned"),
    ],
)
def test_image_parses_valid_reference(reference: str, tag_or_digest: str) -> None:
    """Accept fully-qualified tagged and digest-pinned OCI image references."""

    # Act
    image = Image(reference)

    # Assert
    assert image.registry == "ghcr.io"
    assert image.repository == "longlink/dashboard"
    assert image.tag_or_digest == tag_or_digest


@pytest.mark.parametrize(
    ("reference", "message"),
    [
        pytest.param("", "required", id="empty"),
        pytest.param("g" * 256, "too long", id="too-long"),
        pytest.param("https://ghcr.io/longlink/dashboard:latest", "must not be a URL", id="url"),
        pytest.param("ghcr.io/longlink/dashboard:la test", "invalid characters", id="whitespace"),
        pytest.param("dashboard:latest", "registry host is required", id="missing-registry"),
        pytest.param("longlink/dashboard", "tag or digest is required", id="missing-tag"),
        pytest.param("ghcr.io/longlink/dashboard@sha256", "digest is invalid", id="invalid-digest"),
        pytest.param("user@ghcr.io/longlink/dashboard:latest", "registry is invalid", id="registry-credentials"),
        pytest.param("ghcr.io:invalid/longlink/dashboard:latest", "registry port is invalid", id="invalid-registry-port"),
        pytest.param("ghcr.io/LongLink/dashboard:latest", "repository is invalid", id="invalid-repository"),
        pytest.param("ghcr.io/longlink/dashboard:", "tag is invalid", id="invalid-tag"),
    ],
)
def test_image_rejects_invalid_references(reference: str, message: str) -> None:
    """Reject image references that are ambiguous or not OCI-shaped."""

    # The API requires explicit, plain image references.
    with pytest.raises(ValueError, match=message):
        Image(reference)


def test_image_normalizes_whitespace_and_preserves_validated_instances() -> None:
    """Strip boundary whitespace and avoid reparsing an existing Image value."""

    # Arrange
    reference = Image(" ghcr.io/longlink/dashboard:latest ")

    # Act
    reused_reference = Image(reference)

    # Assert
    assert reference == "ghcr.io/longlink/dashboard:latest"
    assert reused_reference is reference


def test_image_validates_and_serializes_as_a_pydantic_string() -> None:
    """Expose Image fields as validated strings in Pydantic models."""

    # Arrange
    class ImageModel(BaseModel):
        """Provide one Pydantic boundary for an image reference."""

        image: Image

    # Act
    model = ImageModel.model_validate({"image": "ghcr.io/longlink/dashboard:latest"})

    # Assert
    assert model.image == Image("ghcr.io/longlink/dashboard:latest")
    assert model.model_dump(mode="json") == {"image": "ghcr.io/longlink/dashboard:latest"}
