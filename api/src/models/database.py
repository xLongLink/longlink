from pydantic import BaseModel


class DatabaseRegistryCreate(BaseModel):
    """Request body for creating a database registry."""

    name: str
    host: str
    port: int
    username: str
    password: str
    sslmode: str | None = None
    maintenance_database: str = "postgres"


class DatabaseRegistryResponse(BaseModel):
    """Represent one database registry in API responses."""

    name: str
    host: str
    port: int
    username: str
    sslmode: str | None = None
    maintenance_database: str = "postgres"
