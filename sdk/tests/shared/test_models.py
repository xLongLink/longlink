import pytest
from pydantic import TypeAdapter, ValidationError
from longlink.shared.models import Email

EMAIL = TypeAdapter(Email)


def test_email_normalizes_whitespace_and_case() -> None:
    """Expose a canonical email identity to SDK consumers."""

    # Act
    email = EMAIL.validate_python(" Ada@EXAMPLE.COM ")

    # Assert
    assert email == "ada@example.com"


def test_email_rejects_invalid_address() -> None:
    """Reject malformed email identities at the SDK model boundary."""

    # Act and assert
    with pytest.raises(ValidationError):
        EMAIL.validate_python("not-an-email")
