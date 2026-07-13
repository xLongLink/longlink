from longlink.tenant.database.migrations import alembic_script_location


def test_alembic_script_location_returns_packaged_migrations() -> None:
    """Locate the tenant Alembic script directory from the SDK package."""

    script_location = alembic_script_location()

    assert script_location.name == "alembic"
    assert (script_location / "env.py").exists()
    assert (script_location / "versions" / "20260713_0001_initial.py").exists()
