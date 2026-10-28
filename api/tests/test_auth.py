import pytest
from src import auth
from uuid import uuid4
from httpx2 import AsyncClient, ASGITransport
from typing import Annotated
from fastapi import Depends, FastAPI, APIRouter
from collections.abc import Callable
from src.models.roles import OrganizationRoles
from src.database.models.users import User
from src.database.models.association import UserOrganization

pytestmark = pytest.mark.no_db

ADMINISTRATOR_ACCESS = [(False, 403, {"detail": "Permission required"}), (True, 200, {"administrator": True})]
INSUFFICIENT_ORGANIZATION_ROLES = [
    pytest.param(auth.authmaintainer, OrganizationRoles.write, id="maintainer"),
    pytest.param(auth.authorganizationadmin, OrganizationRoles.maintain, id="administrator"),
    pytest.param(auth.authowner, OrganizationRoles.admin, id="owner"),
]


@pytest.mark.parametrize(("administrator", "status", "payload"), ADMINISTRATOR_ACCESS)
async def test_administrator_dependency_requires_platform_role(administrator: bool, status: int, payload: dict[str, str | bool]) -> None:
    """Authorize an authenticated identity independently of browser credential validation."""

    # Arrange
    app = FastAPI()
    user = User(email="member@example.com", password="hashed-password", administrator=administrator)

    async def current_user() -> User:
        """Supply an authenticated identity at the dependency boundary."""

        return user

    app.dependency_overrides[auth.authuser] = current_user

    @app.get("/admin", response_model=dict[str, bool])
    async def administrator_only(user: auth.PlatformAdmin) -> dict[str, bool]:
        """Expose the identity admitted by the administrator dependency."""

        return {"administrator": user.administrator}

    # Act
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get("/admin")
    finally:
        app.dependency_overrides.clear()

    # Assert
    assert response.status_code == status
    assert response.json() == payload


async def test_organization_role_dependencies_reuse_router_membership() -> None:
    """Reuse one membership across router protection and all stricter role checks."""

    # Arrange
    app = FastAPI()
    router = APIRouter(dependencies=[Depends(auth.authmember)])
    membership = UserOrganization(user_id=uuid4(), organization_id=uuid4(), role=OrganizationRoles.owner)
    resolutions = 0

    async def current_membership() -> UserOrganization:
        """Supply one authenticated membership at the dependency boundary."""

        nonlocal resolutions
        resolutions += 1
        return membership

    app.dependency_overrides[auth.authmember] = current_membership

    @router.get("/organization", response_model=dict[str, bool])
    async def organization_roles(
        member: auth.OrganizationMember,
        maintainer: auth.OrganizationMaintainer,
        administrator: auth.OrganizationAdmin,
        owner: auth.OrganizationOwner,
    ) -> dict[str, bool]:
        """Expose whether every role check received the same membership."""

        return {"same_membership": member is maintainer is administrator is owner}

    app.include_router(router)

    # Act
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get("/organization")
    finally:
        app.dependency_overrides.clear()

    # Assert
    assert response.status_code == 200
    assert response.json() == {"same_membership": True}
    assert resolutions == 1


@pytest.mark.parametrize(("dependency", "role"), INSUFFICIENT_ORGANIZATION_ROLES)
async def test_organization_role_dependencies_reject_insufficient_privileges(
    dependency: Callable[[UserOrganization], UserOrganization], role: OrganizationRoles
) -> None:
    """Deny authenticated members immediately below each privileged role boundary."""

    # Arrange
    app = FastAPI()
    membership = UserOrganization(user_id=uuid4(), organization_id=uuid4(), role=role)

    async def current_membership() -> UserOrganization:
        """Supply an authenticated member without the requested privilege."""

        return membership

    app.dependency_overrides[auth.authmember] = current_membership

    @app.get("/organization", response_model=dict[str, str])
    async def privileged_organization(member: Annotated[UserOrganization, Depends(dependency)]) -> dict[str, str]:
        """Expose the role only if the privilege dependency accepts it."""

        return {"role": member.role}

    # Act
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get("/organization")
    finally:
        app.dependency_overrides.clear()

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
