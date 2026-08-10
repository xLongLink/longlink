import os


def pytest_configure() -> None:
    """Enable LongLink test mode for minimal showcase app tests."""

    # Configure deterministic LongLink test mode for the scaffold application.
    os.environ["LONGLINK_ENV"] = "testing"
