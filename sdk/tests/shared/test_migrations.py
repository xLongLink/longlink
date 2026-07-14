from longlink.shared.migrations import alembic_script_location


def test_alembic_script_location_returns_sdk_owned_migrations() -> None:
    """Locate the shared-schema Alembic directory from the SDK package."""

    script_location = alembic_script_location()

    assert script_location.name == "alembic"
    assert (script_location / "env.py").exists()
    assert (script_location / "versions" / "20260713_0001_initial.py").exists()
