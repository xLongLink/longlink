import os


def pytest_configure() -> None:
    """Enable DEV mode for sample app tests."""

    # Ensure sample app loads `.env.sample` during test imports.
    os.environ["DEV"] = "true"
