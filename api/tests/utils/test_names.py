import pytest
from fastapi import HTTPException
from src.utils import names

pytestmark = pytest.mark.no_db


def test_slugify_normalizes_to_url_slug() -> None:
    """Normalize mixed user input into a lowercase URL slug."""

    assert names.slugify("  Acme Team / Reports  ") == "acme-team-reports"


@pytest.mark.parametrize("value", [" !!! ", "a" * 64])
def test_slugify_rejects_invalid_slug(value: str) -> None:
    """Reject names that cannot produce one URL slug."""

    with pytest.raises(HTTPException) as exc:
        names.slugify(value)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Invalid name"
