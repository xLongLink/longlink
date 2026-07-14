from longlink import User as PublicUser
from longlink.shared import User
from longlink.shared.models import shared_users_table
from longlink.shared.constants import SHARED_USERS_TABLE


def test_shared_user_has_one_sdk_table_mapping() -> None:
    """Use one SDK model for shared migrations and application reads."""

    # Keep application reads and shared-schema writes on one SDK model identity.
    assert User is PublicUser
    assert shared_users_table is getattr(User, "__table__")
    assert shared_users_table.name == SHARED_USERS_TABLE
    assert {"id", "name", "email", "avatar", "role", "created_at", "updated_at", "deleted_at"} <= set(
        shared_users_table.c.keys()
    )
