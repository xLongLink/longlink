from pydantic import BaseModel


class DockerRegistryCreate(BaseModel):
    """Request body for creating a Docker registry pull secret."""

    name: str
    server: str
    username: str
    password: str
    email: str
