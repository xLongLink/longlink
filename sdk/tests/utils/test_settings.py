from longlink.utils.settings import Envs


def test_sdk_envs_read_longlink_prefixed_runtime_settings(monkeypatch) -> None:
    """Read SDK runtime settings from `LONGLINK_` process variables."""

    monkeypatch.setenv("ENV", "testing")
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.setenv("LONGLINK_DATABASE_URL", "postgresql://app:secret@db/longlink")
    monkeypatch.setenv("LONGLINK_DATABASE_SCHEMA", "dashboard")
    monkeypatch.setenv("LONGLINK_STORAGE_BUCKET", "longlink-acme-dashboard")
    monkeypatch.setenv("LONGLINK_STORAGE_SHARED_BUCKET", "longlink-acme-shared")

    settings = Envs()

    assert settings.ENV == "production"
    assert settings.DATABASE_URL == "postgresql://app:secret@db/longlink"
    assert settings.DATABASE_SCHEMA == "dashboard"
    assert settings.STORAGE_BUCKET == "longlink-acme-dashboard"
    assert settings.STORAGE_SHARED_BUCKET == "longlink-acme-shared"
