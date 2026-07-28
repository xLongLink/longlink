import pytest
from src.models.types import Image

pytestmark = pytest.mark.no_db


def test_image_parses_registry_repository_and_tag() -> None:
    """Accept a fully-qualified tagged OCI image reference."""

    # Image values expose useful parsed parts for callers that need them.
    image = Image("ghcr.io/longlink/dashboard:latest")

    assert image.registry == "ghcr.io"
    assert image.repository == "longlink/dashboard"
    assert image.tag_or_digest == "latest"
    assert image == "ghcr.io/longlink/dashboard:latest"


@pytest.mark.parametrize("reference", ["longlink/dashboard", "https://ghcr.io/longlink/dashboard:latest", "ghcr.io/LongLink/dashboard:latest"])
def test_image_rejects_invalid_references(reference: str) -> None:
    """Reject image references that are ambiguous or not OCI-shaped."""

    # The API requires explicit, plain image references.
    with pytest.raises(ValueError):
        Image(reference)
