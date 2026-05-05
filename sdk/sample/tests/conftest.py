import os
import sys
from pathlib import Path


def pytest_configure() -> None:
    """Enable DEV mode for sample app tests."""

    sample_root = Path(__file__).resolve().parents[1]
    if str(sample_root) not in sys.path:
        sys.path.insert(0, str(sample_root))

    os.environ["ENV"] = "testing"
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
