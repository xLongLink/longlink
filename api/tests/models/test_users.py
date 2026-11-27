import pytest
from pydantic import ValidationError
from src.models.users import UserUpdate

pytestmark = pytest.mark.no_db


def test_profile_update_rejects_empty_name() -> None:
    """Do not replace a user's name with empty content."""

    # Act / Assert
    with pytest.raises(ValidationError, match="name"):
        UserUpdate(name="")
