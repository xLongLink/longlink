import os
import sys
import pytest
import subprocess
from pathlib import Path

pytestmark = pytest.mark.no_db


def test_development_mode_uses_the_development_flag() -> None:
    """Load the development constant from a clean process environment."""

    # Isolate module import state and configure the development mode under test.
    process_environment = os.environ.copy()
    process_environment.pop("DEVELOPMENT", None)
    process_environment["DEVELOPMENT"] = "true"
    process_environment.setdefault("ADMIN_NAME", "Test Administrator")
    process_environment.setdefault("ADMIN_EMAIL", "test-administrator@example.com")
    process_environment.setdefault("ADMIN_PASSWORD", "longlink-test-password")

    # Import the actual module constant once in a fresh interpreter.
    result = subprocess.run(
        [sys.executable, "-c", "from src.environments import DEVELOPMENT; print(DEVELOPMENT)"],
        cwd=Path(__file__).resolve().parents[1],
        env=process_environment,
        check=True,
        capture_output=True,
        text=True,
    )

    # Compare the isolated import result with the configured development mode.
    assert result.stdout.strip() == "True"
