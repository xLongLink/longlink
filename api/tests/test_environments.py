from src.environments import _environment_files, _development_enabled


def test_development_flag_enables_development_defaults(monkeypatch) -> None:
    """Enable development defaults when the local development flag is true."""

    monkeypatch.setenv("DEVELOPMENT", "true")

    assert _development_enabled() is True
    assert _environment_files() == (".env.sample", ".env")


def test_environment_name_enables_development_defaults(monkeypatch) -> None:
    """Enable development defaults when the local environment name is used."""

    monkeypatch.delenv("DEVELOPMENT", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")

    assert _development_enabled() is True
    assert _environment_files() == (".env.sample", ".env")


def test_development_flag_disables_development_defaults(monkeypatch) -> None:
    """Let an explicit development flag override the environment name."""

    monkeypatch.setenv("DEVELOPMENT", "false")
    monkeypatch.setenv("ENVIRONMENT", "development")

    assert _development_enabled() is False
    assert _environment_files() == (".env",)
