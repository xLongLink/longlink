from pydantic import TypeAdapter
from longlink.shared.models import Email

EMAIL = TypeAdapter(Email)


def test_email_normalizes_whitespace_and_case() -> None:
    """Expose a canonical email identity to SDK consumers."""

    # Act
    email = EMAIL.validate_python(" Ada@EXAMPLE.COM ")

    # Assert
    assert email == "ada@example.com"
