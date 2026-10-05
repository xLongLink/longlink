import pytest
from src.utils import names
from src.errors import ConflictError

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize("value", [" !!! ", "a" * 64])
def test_slugify_rejects_invalid_slug(value: str) -> None:
    """Reject names that cannot produce one URL slug."""

    with pytest.raises(ConflictError, match="Invalid name"):
        names.slugify(value)
