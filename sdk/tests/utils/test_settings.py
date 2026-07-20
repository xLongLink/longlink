from longlink.utils.settings import Envs


def test_sdk_envs_read_longlink_prefixed_runtime_settings(monkeypatch) -> None:
    """Read SDK runtime settings from `LONGLINK_` process variables."""

    monkeypatch.setenv("ENV", "testing")
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.setenv("LONGLINK_DATABASE_HOST", "db")
    monkeypatch.setenv("LONGLINK_DATABASE_NAME", "longlink")
    monkeypatch.setenv("LONGLINK_DATABASE_PORT", "5432")
    monkeypatch.setenv("LONGLINK_DATABASE_SCHEMA", "dashboard")
    monkeypatch.setenv("LONGLINK_DATABASE_PASSWORD", "secret")
    monkeypatch.setenv("LONGLINK_DATABASE_SSLMODE", "verify-full")
    monkeypatch.setenv("LONGLINK_DATABASE_USERNAME", "app")
    monkeypatch.setenv("LONGLINK_STORAGE_BUCKET", "acme")
    monkeypatch.setenv("LONGLINK_STORAGE_ENDPOINT_URL", "http://storage.runtime.longlink.internal:19000")
    monkeypatch.setenv("LONGLINK_STORAGE_PASSWORD", "storage-secret")
    monkeypatch.setenv("LONGLINK_STORAGE_PREFIX", "applications/dashboard/")
    monkeypatch.setenv("LONGLINK_STORAGE_REGION", "ch-gva-2")
    monkeypatch.setenv("LONGLINK_STORAGE_SHARED_PREFIX", "shared/")
    monkeypatch.setenv("LONGLINK_STORAGE_USERNAME", "storage-user")

    settings = Envs()

    assert settings.ENV == "production"
    assert settings.DATABASE_HOST == "db"
    assert settings.DATABASE_NAME == "longlink"
    assert settings.DATABASE_PORT == 5432
    assert settings.DATABASE_SCHEMA == "dashboard"
    assert settings.DATABASE_PASSWORD == "secret"
    assert settings.DATABASE_SSLMODE == "verify-full"
    assert settings.DATABASE_USERNAME == "app"
    assert settings.STORAGE_BUCKET == "acme"
    assert settings.STORAGE_ENDPOINT_URL == "http://storage.runtime.longlink.internal:19000"
    assert settings.STORAGE_PASSWORD == "storage-secret"
    assert settings.STORAGE_PREFIX == "applications/dashboard/"
    assert settings.STORAGE_REGION == "ch-gva-2"
    assert settings.STORAGE_SHARED_PREFIX == "shared/"
    assert settings.STORAGE_USERNAME == "storage-user"
