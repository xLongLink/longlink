import src.db as db
from fastapi import APIRouter
from src.utils import kubectl
from src.models.compute import DockerRegistryCreate

router = APIRouter()


@router.post("/compute/registry")
async def create_registry(payload: DockerRegistryCreate) -> dict[str, bool]:
    """Create a Docker registry pull secret in the compute cluster."""
    await db.registries.create(
        name=payload.name,
        server=payload.server,
        username=payload.username,
        email=payload.email,
    )
    kubectl.registry(
        name=payload.name,
        server=payload.server,
        username=payload.username,
        password=payload.password,
        email=payload.email,
    )
    return {"ok": True}


@router.get("/compute/registries")
async def list_registries() -> list[dict[str, str]]:
    """List stored docker registries."""
    registries = await db.registries.list()
    return [
        {
            "name": registry.name,
            "server": registry.server,
            "username": registry.username,
            "email": registry.email,
        }
        for registry in registries
    ]
