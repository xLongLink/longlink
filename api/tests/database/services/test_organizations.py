import pytest
from uuid import uuid4
from sqlmodel import col
from factories import fetch_operations, create_application, create_organization, create_ready_infrastructure
from sqlalchemy import update
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from src.models.roles import OrganizationRoles
from src.models.types import Image, DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import invitations, applications, organizations
from src.models.pagination import Pagination
from longlink.shared.models import Audit
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.association import UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def test_create_persists_org_and_owner_membership(users: tuple[User, User, User]) -> None:
    """Persist a new org and link the creator as owner."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()

    # Act
    organization = await create_organization(owner, infrastructure=infrastructure)

    # Assert
    assert organization.compute_id == infrastructure.compute.id
    assert organization.database_id == infrastructure.database.id
    assert organization.storage_id == infrastructure.storage.id
    assert organization.status == Status.creating

    async with session_scope() as session:
        reloaded = await session.get(Organization, organization.id)
        assert reloaded is not None
        assert reloaded.deleted_at is None
        memberships = await organizations.members(session, organization.id)
    assert reloaded.name == "acme"
    assert reloaded.slug == "acme"
    assert [(membership.user.id, membership.role) for membership in memberships] == [(owner.id, OrganizationRoles.owner)]


async def test_members_returns_users_from_membership_table(users: tuple[User, User, User]) -> None:
    """Return org members loaded through the organization relationship."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)

    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        memberships = await organizations.members(session, organization.id)

    # Assert
    assert {membership.user.id for membership in memberships} == {owner.id, member.id}


async def test_membership_returns_active_membership_with_organization(users: tuple[User, User, User]) -> None:
    """Return an active member's organization-scoped access record."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        membership = await organizations.membership(session, users[0].id, organization.id)

    # Assert
    assert membership is not None
    assert membership.organization.id == organization.id
    assert membership.role == OrganizationRoles.owner


async def test_application_runtime_access_returns_member_and_compute_assignment(users: tuple[User, User, User]) -> None:
    """Return active runtime access with the assigned compute registry."""

    # Arrange
    organization = await create_organization(users[0])
    application = await create_application(organization)

    # Act
    async with session_scope() as session:
        access = await organizations.application_runtime_access(session, users[0].id, application.id)

    # Assert
    assert access is not None
    resolved_application, resolved_organization, role, compute = access
    assert resolved_application.id == application.id
    assert resolved_organization.id == organization.id
    assert role == OrganizationRoles.owner
    assert compute.id == organization.compute_id


async def test_infrastructure_returns_all_organization_registry_assignments(users: tuple[User, User, User]) -> None:
    """Return one Organization together with each assigned registry."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        resolved = await organizations.infrastructure(session, organization.id)

    # Assert
    assert resolved is not None
    assert resolved.organization.id == organization.id
    assert resolved.compute.id == organization.compute_id
    assert resolved.database.id == organization.database_id
    assert resolved.storage.id == organization.storage_id


async def test_application_infrastructure_returns_application_registry_assignments(users: tuple[User, User, User]) -> None:
    """Return an Application together with its Organization infrastructure."""

    # Arrange
    organization = await create_organization(users[0])
    application = await create_application(organization)

    # Act
    async with session_scope() as session:
        resolved = await organizations.application_infrastructure(session, application.id)

    # Assert
    assert resolved is not None
    resolved_application, infrastructure = resolved
    assert resolved_application.id == application.id
    assert infrastructure.organization.id == organization.id
    assert infrastructure.compute.id == organization.compute_id
    assert infrastructure.database.id == organization.database_id
    assert infrastructure.storage.id == organization.storage_id


async def test_fetch_ignores_deleted_organizations(users: tuple[User, User, User]) -> None:
    """Return only active organizations from the collection service."""

    # Arrange
    owner = users[0]
    active_organization = await create_organization(owner)
    deleted_organization = await create_organization(owner, name="deleted")
    async with session_scope() as session:
        await organizations.soft_delete(session, deleted_organization.id, owner)
        await session.commit()

        # Act
        fetched, total = await organizations.fetch_page(session, Pagination())

    # Assert
    assert [organization.id for organization in fetched] == [active_organization.id]
    assert total == 1


@pytest.mark.parametrize("deleted", [False, True])
async def test_sync_users_skips_creating_and_deleted_organizations(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    deleted: bool,
) -> None:
    """Avoid connecting to Organization databases before activation or after deletion."""

    # Arrange
    organization = await create_organization(users[0])
    synchronized: list[tuple[str, object]] = []

    async def capture_sync(database_url: str, rows: object) -> None:
        """Record unexpected shared-database synchronization attempts."""

        synchronized.append((database_url, rows))

    monkeypatch.setattr(organizations.shared_audit, "sync", capture_sync)

    # Act
    async with session_scope() as session:
        if deleted:
            await organizations.soft_delete(session, organization.id, users[0])
            await session.commit()
        await organizations.sync_users(session, organization.id)

    # Assert
    assert synchronized == []


async def test_sync_users_projects_active_organization_members(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Publish the Platform-authoritative member snapshot for a running Organization."""

    # Arrange
    organization = await create_organization(users[0])
    synchronized: list[tuple[str, list[Audit]]] = []

    async def capture_sync(database_url: str, rows: list[Audit]) -> None:
        """Capture the shared-database projection without opening a connection."""

        synchronized.append((database_url, rows))

    monkeypatch.setattr(organizations.shared_audit, "sync", capture_sync)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.status = Status.running
        await session.commit()

    # Act
    async with session_scope() as session:
        await organizations.sync_users(session, organization.id)

    # Assert
    database_url, rows = synchronized[0]
    assert organization.id.hex in database_url
    assert [
        {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "role": row.role,
            "deleted_at": row.deleted_at,
        }
        for row in rows
    ] == [
        {
            "id": users[0].id,
            "name": users[0].name,
            "email": users[0].email,
            "role": OrganizationRoles.owner.value,
            "deleted_at": None,
        }
    ]


async def test_sync_users_projects_deleted_memberships_as_tombstones(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Publish deleted memberships as Organization database tombstones."""

    # Arrange
    organization = await create_organization(users[0])
    synchronized: list[list[Audit]] = []

    async def capture_sync(_database_url: str, rows: list[Audit]) -> None:
        """Capture projected membership rows without opening a connection."""

        synchronized.append(rows)

    monkeypatch.setattr(organizations.shared_audit, "sync", capture_sync)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        membership = await session.get(UserOrganization, (users[0].id, organization.id))
        assert persisted is not None
        assert membership is not None
        persisted.status = Status.running
        membership.deleted_at = membership.updated_at
        await session.commit()

    # Act
    async with session_scope() as session:
        await organizations.sync_users(session, organization.id)

    # Assert
    assert len(synchronized) == 1
    assert len(synchronized[0]) == 1
    assert synchronized[0][0].id == users[0].id
    assert synchronized[0][0].role == OrganizationRoles.owner.value
    assert synchronized[0][0].deleted_at is not None


async def test_update_member_role_rejects_missing_member(users: tuple[User, User, User]) -> None:
    """Reject role changes for absent organization members."""

    # Arrange
    owner, _, non_member = users
    organization = await create_organization(owner)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(NotFoundError):
            await organizations.update_member_role(
                session, organization.id, non_member.id, OrganizationRoles.read, owner
            )


async def test_update_member_role_rejects_owner_changes_from_non_owners(users: tuple[User, User, User]) -> None:
    """Require owner access to change an owner's Organization role."""

    # Arrange
    owner, administrator = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=administrator.id, organization_id=organization.id, role=OrganizationRoles.admin))
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ForbiddenError, match="Owner management permissions required"):
            await organizations.update_member_role(
                session,
                organization.id,
                owner.id,
                OrganizationRoles.read,
                administrator,
            )


async def test_update_member_role_rejects_demoting_the_last_owner(users: tuple[User, User, User]) -> None:
    """Preserve at least one active owner for every Organization."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="Organization must have at least one owner"):
            await organizations.update_member_role(
                session,
                organization.id,
                owner.id,
                OrganizationRoles.maintain,
                owner,
            )


async def test_update_member_role_skips_unchanged_assignments(users: tuple[User, User, User]) -> None:
    """Avoid mutations when a member already has the requested role."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    async with session_scope() as session:
        changed = await organizations.update_member_role(
            session,
            organization.id,
            owner.id,
            OrganizationRoles.owner,
            owner,
        )

    # Assert
    assert changed is False


async def test_update_member_role_persists_owner_authorized_change(users: tuple[User, User, User]) -> None:
    """Allow owners to update an active member role."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.read))
        await session.commit()

    # Act
    async with session_scope() as session:
        changed = await organizations.update_member_role(
            session,
            organization.id,
            member.id,
            OrganizationRoles.maintain,
            owner,
        )
        await session.commit()

    # Assert
    assert changed is True
    async with session_scope() as session:
        membership = await session.get(UserOrganization, (member.id, organization.id))
    assert membership is not None
    assert membership.role == OrganizationRoles.maintain


async def test_update_member_role_allows_demoting_an_owner_when_another_owner_remains(
    users: tuple[User, User, User],
) -> None:
    """Allow an owner demotion while preserving a separate active owner."""

    # Arrange
    owner, second_owner = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=second_owner.id, organization_id=organization.id, role=OrganizationRoles.owner))
        await session.commit()

    # Act
    async with session_scope() as session:
        changed = await organizations.update_member_role(
            session,
            organization.id,
            second_owner.id,
            OrganizationRoles.maintain,
            owner,
        )
        await session.commit()

    # Assert
    assert changed is True
    async with session_scope() as session:
        membership = await session.get(UserOrganization, (second_owner.id, organization.id))
    assert membership is not None
    assert membership.role == OrganizationRoles.maintain


async def test_mutation_services_revalidate_revoked_administrator_access(users: tuple[User, User, User]) -> None:
    """Reject stale administrator requests while retaining the owner's current mutation access."""

    # Arrange an owner and a current administrator with access to every affected mutation.
    owner, administrator = users[1], users[2]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=administrator.id, organization_id=organization.id, role=OrganizationRoles.admin))
        await session.commit()

    # Preserve legitimate owner mutations before revoking the administrator.
    async with session_scope() as session:
        updated = await organizations.update(session, organization.id, "https://example.com/owner.png", owner)
        invitation = await organizations.create_invitation(
            session,
            organization.id,
            "owner-invited@example.com",
            OrganizationRoles.read,
            owner,
        )
        await session.commit()

    assert updated is not None
    assert invitation.id == organization.id

    # Revoke the administrator after an earlier request-level access check could have succeeded.
    async with session_scope() as session:
        membership = await session.get(UserOrganization, (administrator.id, organization.id))
        assert membership is not None
        membership.deleted_at = membership.updated_at
        await session.commit()

    # Act and assert every service rechecks the persisted membership under its Organization lock.
    async with session_scope() as session:
        with pytest.raises(ForbiddenError, match="Access required"):
            await organizations.update(session, organization.id, "https://example.com/blocked.png", administrator)
        with pytest.raises(ForbiddenError, match="Access required"):
            await organizations.create_invitation(
                session,
                organization.id,
                "blocked-invited@example.com",
                OrganizationRoles.read,
                administrator,
            )
        with pytest.raises(ForbiddenError, match="Access required"):
            await organizations.update_member_role(
                session,
                organization.id,
                owner.id,
                OrganizationRoles.admin,
                administrator,
            )


async def test_soft_delete_revalidates_revoked_owner_access(users: tuple[User, User, User]) -> None:
    """Reject an organization deletion after the initiating owner has been revoked."""

    # Arrange and revoke a non-administrator owner so the tenant authorization path remains active.
    owner = users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        membership = await session.get(UserOrganization, (owner.id, organization.id))
        assert membership is not None
        membership.deleted_at = membership.updated_at
        await session.commit()

    # Act and assert the stale owner cannot tombstone the Organization.
    async with session_scope() as session:
        with pytest.raises(ForbiddenError, match="Access required"):
            await organizations.soft_delete(session, organization.id, owner)

    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
    assert persisted is not None
    assert persisted.deleted_at is None


async def test_create_allows_creating_compute(users: tuple[User, User, User]) -> None:
    """Create Organizations queued behind their creating compute target."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, infrastructure.compute.id)
        assert registry is not None
        registry.status = Status.creating
        await session.commit()

    # Act
    organization = await create_organization(owner, infrastructure=infrastructure)

    # Assert
    async with session_scope() as session:
        fetched, total = await organizations.fetch_page(session, Pagination())
        assert fetched == [organization]
        assert total == 1
        reloaded_compute = await session.get(ComputeRegistry, infrastructure.compute.id)
        assert reloaded_compute is not None
        assert reloaded_compute.status == Status.creating
        assert len(await fetch_operations()) == 1


async def test_create_default_selects_least_assigned_ready_infrastructure(users: tuple[User, User, User]) -> None:
    """Assign the least-used ready registry of each infrastructure type."""

    # Arrange
    owner = users[0]
    assigned_infrastructure = await create_ready_infrastructure()
    available_infrastructure = await create_ready_infrastructure()
    await create_organization(owner, infrastructure=assigned_infrastructure)

    # Act
    async with session_scope() as session:
        organization = await organizations.create_default(session, "balanced", owner)
        await session.commit()

    # Assert
    assert organization.compute_id == available_infrastructure.compute.id
    assert organization.database_id == available_infrastructure.database.id
    assert organization.storage_id == available_infrastructure.storage.id


async def test_create_default_rejects_missing_ready_compute(users: tuple[User, User, User]) -> None:
    """Require a ready compute registry before creating an Organization."""

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(UnavailableError, match="No ready compute registry available"):
            await organizations.create_default(session, "acme", users[0])


async def test_create_default_rejects_missing_database_registry(users: tuple[User, User, User]) -> None:
    """Require a database registry after selecting a ready compute."""

    # Arrange
    async with session_scope() as session:
        session.add(ComputeRegistry(name="Ready compute", kubeconfig={}, status=Status.running))
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(UnavailableError, match="No database registry available"):
            await organizations.create_default(session, "acme", users[0])


async def test_create_default_rejects_missing_storage_registry(users: tuple[User, User, User]) -> None:
    """Require a storage registry after selecting compute and database targets."""

    # Arrange
    async with session_scope() as session:
        session.add(ComputeRegistry(name="Ready compute", kubeconfig={}, status=Status.running))
        session.add(
            DatabaseRegistry(
                name="Ready database",
                host="database.example",
                port=5432,
                username="admin",
                password="secret",
                sslmode=DatabaseSSLMode.require,
            )
        )
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(UnavailableError, match="No storage registry available"):
            await organizations.create_default(session, "acme", users[0])


@pytest.mark.parametrize(
    ("registry", "error"),
    [
        pytest.param("compute", "No compute registry available", id="compute"),
        pytest.param("database", "No database registry available", id="database"),
        pytest.param("storage", "No storage registry available", id="storage"),
    ],
)
async def test_create_rejects_missing_assigned_infrastructure(
    users: tuple[User, User, User],
    registry: str,
    error: str,
) -> None:
    """Reject direct Organization creation when any assigned registry is absent."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    assignments = {
        "compute_id": infrastructure.compute.id,
        "database_id": infrastructure.database.id,
        "storage_id": infrastructure.storage.id,
    }
    assignments[f"{registry}_id"] = uuid4()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(UnavailableError, match=error):
            await organizations.create(session, "acme", users[0], **assignments)


async def test_create_rejects_duplicate_organization_name(users: tuple[User, User, User]) -> None:
    """Reject duplicate Organization names without persisting a second membership."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[0], infrastructure=infrastructure)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="Organization already exists"):
            await organizations.create(
                session,
                "acme",
                users[0],
                compute_id=infrastructure.compute.id,
                database_id=infrastructure.database.id,
                storage_id=infrastructure.storage.id,
            )


async def test_update_persists_changed_organization_avatar(users: tuple[User, User, User]) -> None:
    """Persist changed mutable Organization metadata with its actor."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        updated = await organizations.update(session, organization.id, "https://example.com/avatar.png", users[0])
        await session.commit()

    # Assert
    assert updated is not None
    assert updated.avatar == "https://example.com/avatar.png"
    assert updated.updated_id == users[0].id


async def test_update_returns_none_for_missing_organization(users: tuple[User, User, User]) -> None:
    """Treat updates to missing Organizations as absent resources."""

    # Act
    async with session_scope() as session:
        updated = await organizations.update(session, uuid4(), "https://example.com/avatar.png", users[0])

    # Assert
    assert updated is None


async def test_update_keeps_organization_unchanged_when_avatar_matches(users: tuple[User, User, User]) -> None:
    """Return the locked Organization without changing its audit actor for an identical avatar."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        updated = await organizations.update(session, organization.id, organization.avatar, users[0])

    # Assert
    assert updated is not None
    assert updated.updated_id == users[0].id


async def test_soft_delete_tombstones_applications_and_retains_memberships(users: tuple[User, User, User]) -> None:
    """Tombstone applications while retaining Organization memberships until purge."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await session.execute(update(Organization).where(col(Organization.id) == organization.id).values(status=Status.running))
        application = await applications.create(
            session,
            organization.id,
            "Dashboard",
            Image("ghcr.io/longlink/dashboard@sha256:test"),
            {},
            user_id=owner.id,
        )
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        result = await organizations.soft_delete(session, organization.id, owner)
        await session.commit()
        deleted_organization = await session.get(Organization, organization.id)
        deleted_application = await session.get(Application, application.id)
        second_delete = await organizations.soft_delete(session, organization.id, owner)
        missing_delete = await organizations.soft_delete(session, uuid4(), owner)
        await session.commit()

    # Assert
    assert result is not None
    assert result.deleted_id == owner.id
    assert deleted_organization is not None
    assert deleted_organization.deleted_id == owner.id
    async with session_scope() as session:
        members = await organizations.members(session, organization.id)
        assert await organizations.invitations(session, organization.id) == []
        assert await organizations.applications(session, organization.id) == []
        assert all(operation.target_id != application.id for operation in await fetch_operations())
    assert {member.user_id for member in members} == {owner.id, member.id}
    assert deleted_application is not None
    assert deleted_application.deleted_at is not None
    assert second_delete is not None
    assert second_delete.id == result.id
    assert missing_delete is None


async def test_purge_removes_tombstoned_organization(users: tuple[User, User, User]) -> None:
    """Remove an Organization only after it has been tombstoned."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await organizations.soft_delete(session, organization.id, owner)
        await session.commit()

    # Act
    async with session_scope() as session:
        await organizations.purge(session, organization.id)
        await session.commit()

    # Assert
    async with session_scope() as session:
        assert await session.get(Organization, organization.id) is None


async def test_purge_ignores_missing_organization() -> None:
    """Allow idempotent cleanup after an Organization was already removed."""

    # Act
    async with session_scope() as session:
        result = await organizations.purge(session, uuid4())
        await session.commit()

    # Assert
    assert result is None
