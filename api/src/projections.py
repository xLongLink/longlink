from longlink.shared import users as shared_users
from src.database.services import organizations
from src.database.models.organizations import Organization


async def sync_organization_users(organization: Organization) -> None:
    """Project API-owned organization users into the organization's shared schema."""

    # Read every membership from the API database so deactivations propagate one way.
    memberships = await organizations.members(organization.id, include_deleted=True)
    users: list[shared_users.UserRow] = []

    # Convert API user and membership state at the synchronization boundary.
    for user, membership in memberships:
        deleted_at = user.deleted_at

        # A projected user is inactive when either the account or membership is inactive.
        if membership.deleted_at is not None and (deleted_at is None or membership.deleted_at > deleted_at):
            deleted_at = membership.deleted_at

        updated_at = max(user.updated_at, membership.updated_at)

        # Deactivation must advance the projected row timestamp.
        if deleted_at is not None and deleted_at > updated_at:
            updated_at = deleted_at

        users.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "avatar": user.avatar,
                "role": membership.role.value,
                "created_at": membership.created_at,
                "updated_at": updated_at,
                "deleted_at": deleted_at,
            }
        )

    # The API is the source of truth; applications only receive read access to this projection.
    await shared_users.sync_url(organization.shared_schema_url, users)
