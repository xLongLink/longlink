import pytest
import pytest_asyncio
from httpx2 import AsyncClient
from conftest import create_client
from factories import add_member, create_solution, create_organization
from src.models.roles import OrganizationRoles
from longlink.permissions import Catalog
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.permissions import SolutionMemberAccess


@pytest_asyncio.fixture
async def permission_solution(users: tuple[User, User, User]) -> tuple[Solution, User, User]:
    """Persist a deployed catalog, regular administrators, and independent tenant members."""

    # Arrange ordinary identities without Platform administrator privileges.
    administrator = users[1]
    maintainer = users[2]
    member = User(name="Solution Member", email="solution-member@example.com", password=administrator.password)
    foreign_owner = User(name="Foreign Owner", email="foreign-owner@example.com", password=administrator.password)
    async with session_scope() as session:
        session.add_all([member, foreign_owner])
        await session.commit()

    # Keep the administrator below owner and the maintainer below administrator.
    organization = await create_organization(administrator)
    async with session_scope() as session:
        membership = await session.get(UserOrganization, (administrator.id, organization.id))
        assert membership is not None
        membership.role = OrganizationRoles.admin
        await session.commit()
    await add_member(user=maintainer, organization=organization, role=OrganizationRoles.maintain)
    await add_member(user=member, organization=organization, role=OrganizationRoles.read)
    await create_organization(foreign_owner, name="unrelated-tenant")

    # Use actual revision creation and catalog persistence without deployment infrastructure.
    catalog = Catalog.model_validate(
        {"endpoints": [{"key": "POST /api/approve", "path": "/api/approve", "method": "POST", "roles": ["approver"]}]}
    )
    solution = await create_solution(organization, catalog=catalog)
    return solution, member, foreign_owner


@pytest.mark.parametrize(("actor", "detail"), [("maintainer", "Permission required"), ("foreign-owner", "Access required")])
async def test_permission_management_requires_administration_in_the_solution_organization(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    permission_solution: tuple[Solution, User, User],
    actor: str,
    detail: str,
) -> None:
    """Reject unauthorized inspection and otherwise-valid writes without changing saved access."""

    # Arrange
    solution, member, foreign_owner = permission_solution
    revision_id = str(solution.deployed_revision_id)
    settings_url = f"/api/v1/solutions/{solution.id}/permissions"
    access_url = f"/api/v1/solutions/{solution.id}/members/{member.id}/access"
    async with session_scope() as session:
        assignment = SolutionMemberAccess(user_id=member.id, solution_id=solution.id, organization_id=solution.organization_id, role="read")
        session.add(assignment)
        await session.commit()

    # Establish that the same existing resource and member are readable by a regular Organization administrator.
    settings = await clients[1].get(settings_url)
    access = await clients[1].get(access_url)
    assert settings.status_code == 200
    assert settings.json() == {"roles": ["approver", "read", "write"], "revision_id": revision_id}
    assert access.status_code == 200
    assert access.json() == {"role": "read", "revision_id": revision_id}

    # Act
    caller = users[2] if actor == "maintainer" else foreign_owner
    async with create_client(caller) as client:
        denied_settings = await client.get(settings_url)
        denied_access = await client.get(access_url)
        denied_update = await client.put(access_url, json={"role": "approver", "revision_id": revision_id})

    # Assert
    assert denied_settings.status_code == 403
    assert denied_settings.json() == {"detail": detail}
    assert denied_access.status_code == 403
    assert denied_access.json() == {"detail": detail}
    assert denied_update.status_code == 403
    assert denied_update.json() == {"detail": detail}
    async with session_scope() as session:
        saved_access = await session.get(SolutionMemberAccess, (member.id, solution.id))
        assert saved_access is not None
        assert saved_access.role == "read"


async def test_administrator_can_assign_declared_role_and_explicitly_disable_member_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], permission_solution: tuple[Solution, User, User]
) -> None:
    """Commit declared roles, preserve them on invalid writes, and retain explicit disabled assignments."""

    # Arrange
    solution, member, _foreign_owner = permission_solution
    revision_id = str(solution.deployed_revision_id)
    access_url = f"/api/v1/solutions/{solution.id}/members/{member.id}/access"
    client = clients[1]
    async with session_scope() as session:
        initial_access = await session.get(SolutionMemberAccess, (member.id, solution.id))
        assert initial_access is None

    # Act
    assigned = await client.put(access_url, json={"role": "approver", "revision_id": revision_id})
    access = await client.get(access_url)

    # Assert
    assert assigned.status_code == 204
    assert assigned.content == b""
    assert access.status_code == 200
    assert access.json() == {"role": "approver", "revision_id": revision_id}
    async with session_scope() as session:
        saved_access = await session.get(SolutionMemberAccess, (member.id, solution.id))
        assert saved_access is not None
        assert saved_access.role == "approver"

    # Act
    rejected = await client.put(access_url, json={"role": "unknown", "revision_id": revision_id})

    # Assert
    assert rejected.status_code == 422
    assert rejected.json() == {"detail": "Unknown Solution role"}
    async with session_scope() as session:
        unchanged_access = await session.get(SolutionMemberAccess, (member.id, solution.id))
        assert unchanged_access is not None
        assert unchanged_access.role == "approver"

    # Act
    disabled = await client.put(access_url, json={"role": None, "revision_id": revision_id})
    access = await client.get(access_url)

    # Assert
    assert disabled.status_code == 204
    assert disabled.content == b""
    assert access.status_code == 200
    assert access.json() == {"role": None, "revision_id": revision_id}
    async with session_scope() as session:
        disabled_access = await session.get(SolutionMemberAccess, (member.id, solution.id))
        assert disabled_access is not None
        assert disabled_access.role is None
