import pytest
from pydantic import ValidationError
from src.models.applications import ApplicationCreate

pytestmark = pytest.mark.no_db


def test_application_create_accepts_simple_environment_variables() -> None:
    """Accept a minimal application creation payload with user-owned environment variables."""

    # Validate the current application creation payload shape.
    payload = ApplicationCreate.model_validate(
        {
            "name": "Dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "envs": {"API_KEY": "secret", "PORT": "8080"},
        }
    )

    assert payload.name == "Dashboard"
    assert payload.image == "ghcr.io/longlink/dashboard:latest"
    assert payload.envs == {"API_KEY": "secret", "PORT": "8080"}


@pytest.mark.parametrize(
    "envs",
    [
        {"LONGLINK_DATABASE_HOST": "database.example"},
        {"BAD-NAME": "value"},
        {"A": "x" * 32769},
    ],
)
def test_application_create_rejects_invalid_environment_variables(envs: dict[str, str]) -> None:
    """Reject environment variables that the runtime cannot safely own."""

    # Invalid environment values fail at the API model boundary.
    with pytest.raises(ValidationError):
        ApplicationCreate.model_validate({"name": "Dashboard", "image": "ghcr.io/longlink/dashboard:latest", "envs": envs})
