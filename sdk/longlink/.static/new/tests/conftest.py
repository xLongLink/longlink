import os
import sys
from pathlib import Path


def pytest_configure() -> None:
    """Enable LongLink test mode for minimal showcase app tests."""

    sample_root = Path(__file__).resolve().parents[1]
    if str(sample_root) not in sys.path:
        sys.path.insert(0, str(sample_root))

    os.environ["LONGLINK_ENV"] = "testing"
    os.environ["REQUIRED"] = "required"
