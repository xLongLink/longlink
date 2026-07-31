import pytest
from src.utils import token
from src.database.models.users import User

pytestmark = pytest.mark.no_db


def test_auth_token_carries_the_current_user_and_password_fingerprint() -> None:
    """Sign browser authentication without persisting a server-side session."""

    # Create and validate a signed cookie payload for one local account.
    user = User(email="user@example.com", hashed_password="hashed-password")
    user_id, fingerprint = token.auth_token_claims(token.create_auth_token(user))

    assert user_id == user.id
    assert fingerprint == token.password_fingerprint(user.hashed_password)
