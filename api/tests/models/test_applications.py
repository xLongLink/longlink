import pytest
from pydantic import ValidationError
from src.models.applications import ApplicationCreate

pytestmark = pytest.mark.no_db


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
