import os
import sys
import pytest
import subprocess
from pathlib import Path

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("development", "environment", "expected"),
    [
        pytest.param("true", None, "True", id="development-flag"),
        pytest.param(None, "development", "False", id="environment-name"),
    ],
)
def test_development_mode_uses_only_the_development_flag(
    development: str | None,
    environment: str | None,
    expected: str,
) -> None:
    """Load the development constant from a clean process environment."""

    # Isolate module import state and configure only the mode variables under test.
    process_environment = os.environ.copy()
    process_environment.pop("DEVELOPMENT", None)
    process_environment.pop("ENVIRONMENT", None)
    if development is not None:
        process_environment["DEVELOPMENT"] = development
    if environment is not None:
        process_environment["ENVIRONMENT"] = environment

    # Import the actual module constant once in a fresh interpreter.
    result = subprocess.run(
        [sys.executable, "-c", "from src.environments import DEVELOPMENT; print(DEVELOPMENT)"],
        cwd=Path(__file__).resolve().parents[1],
        env=process_environment,
        check=True,
        capture_output=True,
        text=True,
    )

    # Compare the isolated import result with the expected mode.
    assert result.stdout.strip() == expected
