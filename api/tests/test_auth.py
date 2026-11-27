import pytest
from src import auth
from uuid import uuid4
from httpx2 import AsyncClient, ASGITransport
from typing import Annotated
from fastapi import Depends, FastAPI
from sqlalchemy import text
from src.database import session
from collections.abc import Callable
from src.models.roles import OrganizationRoles
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.association import UserOrganization

pytestmark = pytest.mark.no_db

INSUFFICIENT_ORGANIZATION_ROLES = [
    pytest.param(auth.authmaintainer, OrganizationRoles.write, id="maintainer"),
    pytest.param(auth.authorganizationadmin, OrganizationRoles.maintain, id="administrator"),
    pytest.param(auth.authowner, OrganizationRoles.admin, id="owner"),
]


async def test_request_session_is_shared_and_preserves_caller_transactions(monkeypatch: pytest.MonkeyPatch) -> None:
    """Share one request session, roll back uncommitted work, and allow dependency overrides."""

    # Arrange
    monkeypatch.setattr(session.env, "DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    monkeypatch.setattr(session, "Session", None)
    app = FastAPI()

    @app.post("/session", response_model=bool)
    async def use_session(first: auth.Session, second: Annotated[AsyncSession, Depends(auth.get_session)], fail: bool = False) -> bool:
        """Write without committing through the shared dependency."""

        await first.execute(text("INSERT INTO request_work (id) VALUES (1)"))
        if fail:
            raise RuntimeError("Route failed after write")
        return first is second

    try:
        async with session.session_scope() as database:
            await database.execute(text("CREATE TABLE request_work (id INTEGER)"))
            await database.commit()

        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            with pytest.raises(RuntimeError, match="Route failed after write"):
                await client.post("/session", params={"fail": "true"})

            # Failed requests roll back before a new session or request starts.
            async with session.session_scope() as database:
                assert await database.scalar(text("SELECT COUNT(*) FROM request_work")) == 0

            response = await client.post("/session")

            # Assert
            assert response.status_code == 200
            assert response.json() is True
            async with session.session_scope() as database:
                assert await database.scalar(text("SELECT COUNT(*) FROM request_work")) == 0

                async def override_session() -> AsyncSession:
                    """Expose the caller-owned session through the public override key."""

                    return database

                # Route work stays in the caller's transaction when the dependency is overridden.
                app.dependency_overrides[auth.get_session] = override_session
                overridden = await client.post("/session")
                assert overridden.status_code == 200
                assert overridden.json() is True
                assert await database.scalar(text("SELECT COUNT(*) FROM request_work")) == 1
                await database.commit()

            # The explicit commit persists after the caller's context has closed.
            async with session.session_scope() as database:
                assert await database.scalar(text("SELECT COUNT(*) FROM request_work")) == 1
    finally:
        await session.dispose_engine()


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
