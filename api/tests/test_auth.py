import pytest
from src import auth
from uuid import uuid4
from httpx2 import AsyncClient, ASGITransport
from typing import Annotated
from fastapi import Depends, FastAPI
from collections.abc import Callable
from src.models.roles import OrganizationRoles
from src.database.models.association import UserOrganization

pytestmark = pytest.mark.no_db

INSUFFICIENT_ORGANIZATION_ROLES = [
    pytest.param(auth.authmaintainer, OrganizationRoles.write, id="maintainer"),
    pytest.param(auth.authorganizationadmin, OrganizationRoles.maintain, id="administrator"),
    pytest.param(auth.authowner, OrganizationRoles.admin, id="owner"),
]


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
