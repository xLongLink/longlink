from tenant.database.models.users import SharedUser, shared_users_table
from tenant.database.constants import SHARED_USERS_TABLE


def test_shared_user_is_tenant_database_table() -> None:
    """Map shared users to the tenant users table resolved by search path."""

    assert SharedUser.__tablename__ == SHARED_USERS_TABLE
    assert shared_users_table.name == SHARED_USERS_TABLE
    assert shared_users_table.schema is None
    assert {"id", "name", "email", "avatar", "role_name", "created_at", "updated_at", "deleted_at"} <= set(
        shared_users_table.c.keys()
    )
