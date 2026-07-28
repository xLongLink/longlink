import pytest
from src.utils import token

pytestmark = pytest.mark.no_db


def test_access_token_digest_is_deterministic_and_hides_raw_token() -> None:
    """Hash browser tokens before persistence."""

    # Act
    first = token.access_token_digest("browser-token")
    repeated = token.access_token_digest("browser-token")
    other = token.access_token_digest("other-token")

    # Assert
    assert first == repeated
    assert first != other
    assert first != "browser-token"
