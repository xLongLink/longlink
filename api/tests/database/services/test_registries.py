import pytest
from uuid import UUID
from fastapi import HTTPException
from factories import create_organization
from src.utils import images
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.database.session import session_scope
from src.database.services import registries
from src.database.models.users import User
from src.database.models.registries import RegistryConnection


async def test_private_image_fallback_never_uses_foreign_credentials(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Retry denied local credentials without disclosing another Organization's token."""

    # Arrange
    organization = await create_organization(users[0])
    foreign_organization = await create_organization(users[2], name="foreign")

    # Put foreign credentials first so removing tenant scoping cannot hide behind local success.
    foreign = RegistryConnection(id=UUID(int=1), organization_id=foreign_organization.id, username="foreign", credential="foreign-token")
    denied = RegistryConnection(id=UUID(int=2), organization_id=organization.id, username="denied", credential="denied-token")
    accepted = RegistryConnection(id=UUID(int=3), organization_id=organization.id, username="accepted", credential="accepted-token")
    async with session_scope() as session:
        session.add_all([foreign, denied, accepted])
        await session.commit()
    image = Image("ghcr.io/acme/private:latest")
    metadata = LongLinkMetadata(image=Image("ghcr.io/acme/private@sha256:resolved"))
    attempts: list[str | None] = []

    async def required_metadata(requested: Image, connection: RegistryConnection | None = None) -> LongLinkMetadata:
        """Model anonymous denial, a rejected local token, and an accepted local token."""

        assert requested == image
        attempts.append(connection.credential if connection is not None else None)
        if connection is None or connection.id == denied.id:
            raise HTTPException(status_code=403, detail="Registry denied access")
        assert connection.organization_id == organization.id
        assert connection.id == accepted.id
        return metadata

    # Replace only external registry inspection, leaving credential selection real.
    monkeypatch.setattr(images, "required_metadata", required_metadata)

    # Act
    async with session_scope() as session:
        result = await registries.inspect(session, organization.id, image)

    # Assert
    assert result == (metadata, accepted.id)
    assert attempts == [None, "denied-token", "accepted-token"]


@pytest.mark.parametrize("failure_after_authentication", [False, True])
async def test_private_image_fallback_stops_on_invalid_metadata(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, failure_after_authentication: bool
) -> None:
    """Propagate invalid metadata without sending any further saved credentials."""

    # Arrange
    organization = await create_organization(users[0])
    first = RegistryConnection(id=UUID(int=1), organization_id=organization.id, username="first", credential="first-token")
    later = RegistryConnection(id=UUID(int=2), organization_id=organization.id, username="later", credential="later-token")
    async with session_scope() as session:
        session.add_all([first, later])
        await session.commit()
    failure = HTTPException(status_code=422, detail="Image is missing required LongLink metadata")
    attempts: list[str | None] = []

    async def required_metadata(image: Image, connection: RegistryConnection | None = None) -> LongLinkMetadata:
        """Deny anonymous access only for the credentialed failure scenario."""

        attempts.append(connection.credential if connection is not None else None)
        if connection is None and failure_after_authentication:
            raise HTTPException(status_code=403, detail="Registry denied access")
        raise failure

    monkeypatch.setattr(images, "required_metadata", required_metadata)

    # Act
    async with session_scope() as session:
        with pytest.raises(HTTPException, match="422: Image is missing required LongLink metadata") as raised:
            await registries.inspect(session, organization.id, Image("ghcr.io/acme/private:latest"))

    # Assert
    assert raised.value is failure
    assert attempts == ([None, "first-token"] if failure_after_authentication else [None])
