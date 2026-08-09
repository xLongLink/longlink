from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Enum, Column
from src.environments import env
from src.models.types import DatabaseSSLMode
from src.database.types import EncryptedType


from src.database.models.base import PlatformModel


class DatabaseRegistry(PlatformModel, table=True):
    """Persist one database backend available to Organizations.

    Reconciliation creates one database per Organization and one isolated schema and runtime role per LongLink Application.
    """

    __tablename__: ClassVar[str] = "database_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)

    # Connection
    host: str = Field(max_length=255)
    port: int
    password: str = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))
    sslmode: DatabaseSSLMode = Field(
        default=DatabaseSSLMode.require,
        sa_column=Column(
            Enum(
                DatabaseSSLMode,
                name="databasesslmode",
                native_enum=False,
                values_callable=lambda members: [member.value for member in members],
            ),
            nullable=False,
        ),
    )
    username: str = Field(max_length=255)
