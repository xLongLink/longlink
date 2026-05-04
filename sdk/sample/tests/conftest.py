import os


def pytest_configure() -> None:
    """Enable DEV mode for sample app tests."""
    os.environ["DEV"] = "true"
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
