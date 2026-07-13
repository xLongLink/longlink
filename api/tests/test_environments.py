import pytest
from src.environments import _development_enabled

pytestmark = pytest.mark.no_db


def test_development_flag_enables_development(monkeypatch) -> None:
    """Enable development mode when the local development flag is true."""

    monkeypatch.setenv("DEVELOPMENT", "true")

    assert _development_enabled() is True


def test_environment_name_does_not_enable_development(monkeypatch) -> None:
    """Ignore the generic environment name when enabling local development."""

    monkeypatch.delenv("DEVELOPMENT", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")

    assert _development_enabled() is False
