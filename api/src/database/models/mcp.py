from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import JSON, Column
from src.database.models.base import PlatformModel


class MCPClient(PlatformModel, table=True):
    """Persist immutable public-client callbacks without client secrets."""

    __tablename__: ClassVar[str] = "mcp_clients"

    # Identity and approved callback destinations
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=128)
    redirects: list[str] = Field(sa_column=Column(JSON, nullable=False))


class MCPCode(PlatformModel, table=True):
    """Retain hashed, single-use authorization proof bound to PKCE and a resource."""

    __tablename__: ClassVar[str] = "mcp_codes"

    # Credential identity
    hash: str = Field(primary_key=True, max_length=64)
    user_id: UUID = Field(foreign_key="users.id")
    client_id: UUID = Field(foreign_key="mcp_clients.id")
    solution_id: UUID = Field(foreign_key="solutions.id")

    # Authorization binding
    resource: str = Field(max_length=2048)
    challenge: str = Field(max_length=43)
    fingerprint: str = Field(max_length=64)
    redirect_uri: str = Field(max_length=2048)

    # Lifetime
    expires_at: datetime = Field(index=True)


class MCPToken(PlatformModel, table=True):
    """Store only hashed access credentials; revocation deletes the record."""

    __tablename__: ClassVar[str] = "mcp_tokens"

    # Credential identity
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    hash: str = Field(unique=True, max_length=64)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    client_id: UUID = Field(foreign_key="mcp_clients.id")
    solution_id: UUID = Field(foreign_key="solutions.id")

    # Authorization binding
    resource: str = Field(max_length=2048)
    fingerprint: str = Field(max_length=64)

    # Lifetime
    expires_at: datetime = Field(index=True)
