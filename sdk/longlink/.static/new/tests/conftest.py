import os
import sys
from pathlib import Path


def pytest_configure() -> None:
    """Enable a blank app test environment."""

    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    os.environ["ENV"] = "testing"
