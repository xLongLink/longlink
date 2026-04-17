import os


def pytest_configure() -> None:
    """Enable DEV mode defaults for SDK test runs."""

    # Force DEV mode for tests so config paths follow development behavior.
    os.environ["DEV"] = "true"
