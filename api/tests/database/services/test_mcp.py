import pytest
from src.database.services import mcp

pytestmark = pytest.mark.no_db


def test_redirect_preserves_callback_query_and_encodes_oauth_state() -> None:
    """Append proof without treating characters in state as query parameters."""

    # Act
    redirect = mcp.redirect("https://client.example/callback?tenant=acme&empty=", {"code": "proof", "state": "a&b=c"})

    # Assert
    assert redirect == "https://client.example/callback?tenant=acme&empty=&code=proof&state=a%26b%3Dc"
