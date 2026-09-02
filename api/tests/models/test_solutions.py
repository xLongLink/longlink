import pytest
from pydantic import ValidationError
from src.models.solutions import SolutionCreate

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    "envs",
    [
        {"LONGLINK_DATABASE_HOST": "database.example"},
        {"BAD-NAME": "value"},
        {"A": "x" * 32769},
        {f"ENV_{index}": "value" for index in range(101)},
        {"A" * 254: "value"},
        {f"ENV_{index}": "x" * 32768 for index in range(17)},
    ],
)
def test_solution_create_rejects_invalid_environment_variables(envs: dict[str, str]) -> None:
    """Reject environment variables that the runtime cannot safely own."""

    # Invalid environment values fail at the API model boundary.
    with pytest.raises(ValidationError):
        SolutionCreate.model_validate({"name": "Dashboard", "image": "ghcr.io/longlink/dashboard:latest", "envs": envs})
