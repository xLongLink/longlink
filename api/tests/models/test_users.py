import pytest
from pydantic import ValidationError
from src.models.types import Theme, Accent
from src.models.users import UserUpdate

pytestmark = pytest.mark.no_db


def test_user_update_accepts_simple_profile_preferences() -> None:
    """Accept mutable user profile preferences."""

    # Validate the profile update payload used by the web frontend.
    payload = UserUpdate(name="Updated User", theme=Theme.dark, accent=Accent.blue, radius=1.5)

    assert payload.name == "Updated User"
    assert payload.theme == Theme.dark
    assert payload.accent == Accent.blue
    assert payload.radius == 1.5


@pytest.mark.parametrize("payload", [{"name": ""}, {"radius": 2.0}])
def test_user_update_rejects_invalid_profile_values(payload: dict[str, object]) -> None:
    """Reject profile values outside the current user preference limits."""

    # Profile validation keeps invalid preferences out of persistence.
    with pytest.raises(ValidationError):
        UserUpdate.model_validate(payload)
