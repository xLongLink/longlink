import httpx2
import asyncio
from uuid import UUID
from typing import Literal
from pathlib import Path
from pydantic import Field, BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ENVIRONMENT = Path(__file__).resolve().parents[2] / "api" / ".env"
SEED_ENVIRONMENT = Path(__file__).resolve().parents[1] / ".env.seed"
DEVELOPMENT_COMPUTE = "development compute"
DEVELOPMENT_ORGANIZATION = "development"
SAMPLE_SOLUTION = "sample"


class Page[T](BaseModel):
    """Describe one paginated API response."""

    # Results
    items: list[T]


class Compute(BaseModel):
    """Describe the Compute state used by local provisioning."""

    # Identifier
    id: UUID

    # Metadata
    name: str

    # State
    status: Literal["creating", "failed", "running"]


class Organization(BaseModel):
    """Describe the Organization state used by local provisioning."""

    # Identifier
    id: UUID

    # Metadata
    slug: str


class Solution(BaseModel):
    """Describe the Solution state used by local provisioning."""

    # Identifier
    id: UUID

    # Metadata
    slug: str

    # State
    status: Literal["creating", "failed", "running"]


class SeedSettings(BaseSettings):
    """Define the local development API and infrastructure registration."""

    # API connection
    API_URL: str = "http://127.0.0.1:8000"
    PUBLIC_URL: str = "http://localhost:5173"
    COMPUTE_TIMEOUT_SECONDS: int = Field(default=300, ge=1)

    # Platform administrator
    ADMIN_EMAIL: str = Field(default="", min_length=1, validate_default=True)
    ADMIN_PASSWORD: str = Field(default="", min_length=1, validate_default=True)

    # Compute registry
    KUBECONFIG: Path = Path(__file__).resolve().parents[1] / "kubeconfig.yaml"
    GATEWAY_URL: str = "https://localhost:8443"
    GATEWAY_CERTIFICATE: str | None = None
    DATABASE_SIZE_GIB: int = 10
    DATABASE_INSTANCES: int = 1
    DATABASE_STORAGE_CLASS: str = "local-path"

    # Sample release configuration
    SAMPLE_ENVS: dict[str, str] = Field(default_factory=lambda: {"REQUIRED": "development"})

    # Shared Ceph storage; backing class must support raw Block PVCs and filesystem monitor PVCs.
    STORAGE_CLASS: str = "longlink-development"
    STORAGE_ENDPOINT: str = "https://storage.localhost:9443"
    STORAGE_SIZE_GIB: int = 1
    STORAGE_INSTANCES: int = 1
    STORAGE_CERTIFICATE: str | None = None
    BUCKET_SIZE_BYTES: int = 134217728
    BUCKET_MAX_OBJECTS: int = 1000
    STORAGE_RESERVE_PERCENT: int = 30
    STORAGE_OBJECT_OVERHEAD_BYTES: int = 65536

    model_config = SettingsConfigDict(
        env_file=(API_ENVIRONMENT, SEED_ENVIRONMENT),
        env_file_encoding="utf-8",
        extra="ignore",
    )


async def list_computes(client: httpx2.AsyncClient) -> list[Compute]:
    """Return every local Compute visible to the administrator."""

    response = await client.get("/api/v1/computes", params={"page_size": 100})
    response.raise_for_status()
    return Page[Compute].model_validate(response.json()).items


async def development_compute(client: httpx2.AsyncClient) -> Compute | None:
    """Return the local development Compute when registered."""

    computes = await list_computes(client)
    return next((compute for compute in computes if compute.name == DEVELOPMENT_COMPUTE), None)


async def register_compute(client: httpx2.AsyncClient, settings: SeedSettings) -> Compute:
    """Create the local Compute when absent and return its current state."""

    compute = await development_compute(client)
    if compute is not None:
        return compute

    # Register the local infrastructure through the same API contract as an administrator.
    response = await client.post(
        "/api/v1/computes",
        json={
            "name": DEVELOPMENT_COMPUTE,
            "kubeconfig": settings.KUBECONFIG.read_text(encoding="utf-8"),
            "gateway_url": settings.GATEWAY_URL,
            "gateway_certificate": settings.GATEWAY_CERTIFICATE,
            "database_storage_class": settings.DATABASE_STORAGE_CLASS,
            "database_size_gib": settings.DATABASE_SIZE_GIB,
            "database_instances": settings.DATABASE_INSTANCES,
            "storage_class": settings.STORAGE_CLASS,
            "storage_endpoint": settings.STORAGE_ENDPOINT,
            "storage_size_gib": settings.STORAGE_SIZE_GIB,
            "storage_instances": settings.STORAGE_INSTANCES,
            "storage_certificate": settings.STORAGE_CERTIFICATE,
            "bucket_size_bytes": settings.BUCKET_SIZE_BYTES,
            "bucket_max_objects": settings.BUCKET_MAX_OBJECTS,
            "storage_reserve_percent": settings.STORAGE_RESERVE_PERCENT,
            "storage_object_overhead_bytes": settings.STORAGE_OBJECT_OVERHEAD_BYTES,
        },
    )
    if response.status_code != 409:
        response.raise_for_status()

    compute = await development_compute(client)
    if compute is None:
        raise RuntimeError("Local Compute registration was not recorded")
    return compute


async def wait_for_compute(client: httpx2.AsyncClient, compute: Compute, settings: SeedSettings) -> None:
    """Wait until the local Compute is ready for Organization assignment."""

    # The Organization API assigns only validated Compute registrations.
    try:
        async with asyncio.timeout(settings.COMPUTE_TIMEOUT_SECONDS):
            while compute.status == "creating":
                await asyncio.sleep(1)
                current = await development_compute(client)
                if current is None:
                    raise RuntimeError("Local Compute registration was removed")
                compute = current

            if compute.status == "failed":
                raise RuntimeError("Local Compute validation failed")
    except TimeoutError as exc:
        raise RuntimeError("Local Compute validation timed out") from exc


async def development_organization(client: httpx2.AsyncClient) -> Organization | None:
    """Return the local development Organization when present."""

    response = await client.get("/api/v1/organizations", params={"page_size": 100})
    response.raise_for_status()
    organizations = Page[Organization].model_validate(response.json()).items
    return next((organization for organization in organizations if organization.slug == DEVELOPMENT_ORGANIZATION), None)


async def create_organization(client: httpx2.AsyncClient) -> Organization:
    """Create the local development Organization when absent."""

    organization = await development_organization(client)
    if organization is not None:
        return organization

    # Let the API select the sole validated local Compute.
    response = await client.post("/api/v1/organizations", json={"name": "Development"})
    if response.status_code != 409:
        response.raise_for_status()

    organization = await development_organization(client)
    if organization is None:
        raise RuntimeError("Local Organization creation was not recorded")
    return organization


async def sample_solution(client: httpx2.AsyncClient, organization: Organization) -> Solution | None:
    """Return the local sample Solution when present."""

    response = await client.get(f"/api/v1/organizations/{organization.id}/solutions")
    response.raise_for_status()
    solutions = [Solution.model_validate(payload) for payload in response.json()]
    return next((solution for solution in solutions if solution.slug == SAMPLE_SOLUTION), None)


async def create_sample(client: httpx2.AsyncClient, settings: SeedSettings, organization: Organization) -> None:
    """Create or retry the local sample Solution."""

    solution = await sample_solution(client, organization)
    if solution is None:
        # The API resolves and validates the immutable image metadata before recording the Solution.
        response = await client.post(
            f"/api/v1/organizations/{organization.id}/solutions",
            json={
                "name": "Sample",
                "image": "localhost:15000/sample:dev",
                "envs": settings.SAMPLE_ENVS,
                "description": "A sample solution for local development.",
            },
        )
        response.raise_for_status()
        return

    if solution.status == "failed":
        # Retry failed sample provisioning through a fresh immutable revision.
        response = await client.put(
            f"/api/v1/solutions/{solution.id}",
            json={"image": "localhost:15000/sample:dev", "envs": settings.SAMPLE_ENVS},
        )
        response.raise_for_status()


async def seed(settings: SeedSettings, client: httpx2.AsyncClient) -> None:
    """Register local infrastructure and create the local example Organization and Solution."""

    # Authenticate with the administrator that the API initializes during startup.
    response = await client.post(
        "/api/v1/auth/password/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
    )
    response.raise_for_status()

    compute = await register_compute(client, settings)
    await wait_for_compute(client, compute, settings)

    organization = await create_organization(client)
    await create_sample(client, settings, organization)


async def run(settings: SeedSettings) -> None:
    """Run local seeding through the configured Platform API."""

    async with httpx2.AsyncClient(
        base_url=settings.API_URL,
        headers={"Origin": settings.PUBLIC_URL},
        timeout=10,
        trust_env=False,
    ) as client:
        await seed(settings, client)


def main() -> None:
    """Seed local development from a synchronous entrypoint."""

    asyncio.run(run(SeedSettings()))


if __name__ == "__main__":
    main()
