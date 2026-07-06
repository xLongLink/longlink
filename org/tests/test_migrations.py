from tenant.database.migrations import alembic_script_location


def test_alembic_script_location_returns_packaged_migrations() -> None:
    """Locate the tenant Alembic script directory from the source tree."""

    # Act
    script_location = alembic_script_location()

    # Assert
    assert script_location.name == "alembic"
    assert (script_location / "env.py").exists()
    assert (script_location / "versions" / "20260706_0001_shared_users.py").exists()
