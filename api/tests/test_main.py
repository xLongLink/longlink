import importlib

import main as main_module

from src.env import env


def test_headless_defaults_to_enabled() -> None:
    """Keep static frontend serving disabled unless explicitly turned off."""

    assert env.HEADLESS is True
    assert not any(route.name == "static" for route in main_module.app.router.routes)


def test_static_mount_is_registered_when_headless_is_disabled(monkeypatch) -> None:
    """Mount the SPA assets only when headless mode is disabled."""

    # Arrange
    monkeypatch.setattr(env, "HEADLESS", False)

    # Act
    reloaded_module = importlib.reload(main_module)

    # Assert
    assert any(route.name == "static" for route in reloaded_module.app.router.routes)
