import pytest
from src.environments import (Env, _environment_files, _development_enabled,
                              resolve_cors_origins, validate_production_settings)


def production_settings(**overrides: object) -> Env:
    """Build a secure baseline API environment for validation tests."""

    settings = {
        "DEVELOPMENT": False,
        "DATABASE_URL": "sqlite+aiosqlite:///./dev.db",
        "SESSION_KEY": "production-session-key-that-is-long-enough",
        "OIDC_CLIENT_ID": "longlink-api",
        "OIDC_CLIENT_SECRET": "longlink-secret",
        "OIDC_ISSUER": "https://identity.example/realms/prod",
        "OIDC_REDIRECT_URI": "https://app.example/auth/oidc",
    }
    settings.update(overrides)
    return Env(**settings)


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


def test_cors_defaults_are_development_only() -> None:
    """Do not enable localhost credentialed CORS outside development by default."""

    assert resolve_cors_origins(False, ()) == ()
    assert resolve_cors_origins(True, ()) == (
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    )


def test_explicit_cors_origins_override_development_defaults() -> None:
    """Respect configured production CORS origins when they are provided."""

    assert resolve_cors_origins(False, ("https://app.example",)) == ("https://app.example",)
    assert resolve_cors_origins(True, ("https://app.example",)) == ("https://app.example",)


def test_validate_production_settings_accepts_secure_values() -> None:
    """Accept production settings with strong secrets and HTTPS OIDC URLs."""

    validate_production_settings(production_settings())


@pytest.mark.parametrize("session_key", ["1234", "replace-with-a-long-random-secret"])
def test_validate_production_settings_rejects_weak_session_keys(session_key: str) -> None:
    """Reject short and placeholder session signing keys outside development."""

    with pytest.raises(RuntimeError, match="SESSION_KEY"):
        validate_production_settings(production_settings(SESSION_KEY=session_key))


def test_validate_production_settings_rejects_non_https_oidc_urls() -> None:
    """Reject non-HTTPS OIDC endpoints outside development."""

    settings = production_settings(
        OIDC_ISSUER="http://identity.example/realms/prod",
        OIDC_REDIRECT_URI="http://app.example/auth/oidc",
    )

    with pytest.raises(RuntimeError) as error:
        validate_production_settings(settings)

    message = str(error.value)
    assert "OIDC_ISSUER" in message
    assert "OIDC_REDIRECT_URI" in message


def test_validate_production_settings_allows_local_development_values() -> None:
    """Allow local auth and short secrets when development mode is enabled."""

    settings = production_settings(
        DEVELOPMENT=True,
        SESSION_KEY="1234",
        OIDC_ISSUER="http://localhost:18080/realms/dev",
        OIDC_REDIRECT_URI="http://localhost:5173/auth/oidc",
    )

    validate_production_settings(settings)
