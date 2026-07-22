import pytest
from src.models.types import Image, Country

pytestmark = pytest.mark.no_db


def test_country_accepts_uppercase_iso_code() -> None:
    """Accept the exact country code shape returned by the countries API."""

    # Country values preserve their validated string form.
    country = Country("CH")

    assert country == "CH"


@pytest.mark.parametrize("code", ["ch", "XX", "CHE"])
def test_country_rejects_invalid_codes(code: str) -> None:
    """Reject country values outside uppercase ISO alpha-2 codes."""

    # Invalid country values fail before model persistence.
    with pytest.raises(ValueError):
        Country(code)


def test_image_parses_registry_repository_and_tag() -> None:
    """Accept a fully-qualified tagged OCI image reference."""

    # Image values expose useful parsed parts for callers that need them.
    image = Image("ghcr.io/longlink/dashboard:latest")

    assert image.registry == "ghcr.io"
    assert image.repository == "longlink/dashboard"
    assert image.tag_or_digest == "latest"
    assert image.value == "ghcr.io/longlink/dashboard:latest"


@pytest.mark.parametrize("reference", ["longlink/dashboard", "https://ghcr.io/longlink/dashboard:latest", "ghcr.io/LongLink/dashboard:latest"])
def test_image_rejects_invalid_references(reference: str) -> None:
    """Reject image references that are ambiguous or not OCI-shaped."""

    # The API requires explicit, plain image references.
    with pytest.raises(ValueError):
        Image(reference)
