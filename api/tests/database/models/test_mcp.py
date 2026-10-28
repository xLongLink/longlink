import pytest
from uuid import uuid4
from datetime import UTC, datetime, timedelta
from factories import create_solution, create_organization
from sqlalchemy.exc import IntegrityError
from src.database.session import session_scope
from src.database.models.mcp import MCPToken, MCPClient
from src.database.models.users import User


async def test_mcp_token_hash_cannot_identify_two_grants(users: tuple[User, User, User]) -> None:
    """Keep credential lookup unambiguous at the database boundary."""

    # Arrange
    owner, _, _ = users
    organization = await create_organization(owner)
    solution = await create_solution(organization)
    client = MCPClient(name="Local client", redirects=["http://localhost/callback"])
    values = {
        "hash": "a" * 64,
        "user_id": owner.id,
        "client_id": client.id,
        "solution_id": solution.id,
        "resource": f"https://platform.example/{solution.id}/mcp",
        # Authorization proofs remain bound to a password and an expiry.
        "fingerprint": "b" * 64,
        "expires_at": datetime.now(UTC) + timedelta(minutes=5),
    }
    async with session_scope() as session:
        session.add(client)
        await session.flush()
        session.add(MCPToken(**values))
        await session.commit()

    # Act / Assert
    async with session_scope() as session:
        session.add(MCPToken(id=uuid4(), **values))
        with pytest.raises(IntegrityError):
            await session.flush()
