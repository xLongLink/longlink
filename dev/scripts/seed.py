import httpx2
import asyncio
from uuid import UUID
from typing import Literal
from pathlib import Path
from pydantic import Field, BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ENVIRONMENT = Path(__file__).resolve().parents[2] / "api" / ".env"
LOCAL_GATEWAY_CERTIFICATE = Path(__file__).resolve().parents[1] / "certificates" / "gateway.crt"
LOCAL_STORAGE_CERTIFICATE = Path(__file__).resolve().parents[1] / "certificates" / "storage.crt"
DEVELOPMENT_COMPUTE = "development compute"
DEVELOPMENT_ORGANIZATION = "development"
SAMPLE_SOLUTION = "sample"


class Resource(BaseModel):
    """Describe the resource fields used by local provisioning."""

    # Identifier
    id: UUID

    # Metadata
    name: str | None = None
    slug: str | None = None

    # State
    status: Literal["creating", "failed", "running"]


class Page(BaseModel):
    """Describe one paginated API response."""

    # Results
    items: list[Resource]


class SeedSettings(BaseSettings):
    """Define the local development API and infrastructure registration."""

    # API connection
    API_URL: str = "http://127.0.0.1:8000"
    PUBLIC_URL: str = "http://localhost:5173"

    # Platform administrator
    ADMIN_EMAIL: str = Field(default="", min_length=1, validate_default=True)
    ADMIN_PASSWORD: str = Field(default="", min_length=1, validate_default=True)

    # Compute registry
    KUBECONFIG: Path = Path(__file__).resolve().parents[1] / "kubeconfig.yaml"

    # Sample release configuration
    SAMPLE_ENVS: dict[str, str] = Field(default_factory=lambda: {"REQUIRED": "development"})

    model_config = SettingsConfigDict(
        env_file=API_ENVIRONMENT,
        env_file_encoding="utf-8",
        extra="ignore",
    )


async def development_compute(client: httpx2.AsyncClient) -> Resource | None:
    """Return the local development Compute when registered."""

    response = await client.get("/api/v1/computes", params={"page_size": 100})
    response.raise_for_status()
    computes = Page.model_validate(response.json()).items
    return next((compute for compute in computes if compute.name == DEVELOPMENT_COMPUTE), None)


async def register_compute(client: httpx2.AsyncClient, settings: SeedSettings) -> Resource:
    """Create the local Compute when absent and return its current state."""

    compute = await development_compute(client)
    if compute is not None:
        return compute

    # Register the fixed local infrastructure through the same API contract as an administrator.
    gateway_certificate = LOCAL_GATEWAY_CERTIFICATE.read_text(encoding="utf-8")
    storage_certificate = LOCAL_STORAGE_CERTIFICATE.read_text(encoding="utf-8")
    response = await client.post(
        "/api/v1/computes",
        json={
            "name": DEVELOPMENT_COMPUTE,
            "kubeconfig": settings.KUBECONFIG.read_text(encoding="utf-8"),
            "gateway_url": "https://127.0.0.1:8443",
            "gateway_certificate": gateway_certificate,
            "database_storage_class": "local-path",
            "storage_endpoint": "https://storage.localhost:9443",
            "storage_access_key": "rustfsadmin",
            "storage_secret_key": "rustfsadmin",
            "storage_certificate": storage_certificate,
        },
    )
    if response.status_code != 409:
        response.raise_for_status()
        return Resource.model_validate(response.json())

    compute = await development_compute(client)
    if compute is None:
        raise RuntimeError("Local Compute registration was not recorded")
    return compute


async def development_organization(client: httpx2.AsyncClient) -> Resource | None:
    """Return the local development Organization when present."""

    response = await client.get("/api/v1/organizations", params={"page_size": 100})
    response.raise_for_status()
    organizations = Page.model_validate(response.json()).items
    return next((organization for organization in organizations if organization.slug == DEVELOPMENT_ORGANIZATION), None)


async def create_organization(client: httpx2.AsyncClient) -> Resource:
    """Create the local development Organization when absent."""

    organization = await development_organization(client)
    if organization is not None:
        return organization

    # Disable database hibernation for local development; zero keeps it awake.
    response = await client.post("/api/v1/organizations", json={"name": "Development", "database_idle_seconds": 0})
    if response.status_code != 409:
        response.raise_for_status()
        return Resource.model_validate(response.json())

    organization = await development_organization(client)
    if organization is None:
        raise RuntimeError("Local Organization creation was not recorded")
    return organization


async def create_sample(client: httpx2.AsyncClient, settings: SeedSettings, organization: Resource) -> None:
    """Create, retry, or redeploy the local sample Solution."""

    response = await client.get(f"/api/v1/organizations/{organization.id}/solutions")
    response.raise_for_status()
    solution = next(
        (solution for solution in (Resource.model_validate(payload) for payload in response.json()) if solution.slug == SAMPLE_SOLUTION),
        None,
    )
    if solution is None:
        # The API resolves and validates the immutable image metadata before recording the Solution.
        response = await client.post(
            f"/api/v1/organizations/{organization.id}/solutions",
            json={
                "name": "Sample",
                "image": "localhost:15000/sample:dev",
                "envs": settings.SAMPLE_ENVS,
                "min_scale": 1,
                "idle_seconds": 0,
                "description": "A sample solution for local development.",
            },
        )
        if response.status_code == 404:
            raise RuntimeError("Sample image 'localhost:15000/sample:dev' was not found in the local registry; run 'make image' first")
        response.raise_for_status()
        return

    if solution.status == "creating":
        # Leave in-flight provisioning alone; a later seed redeploys once it settles.
        return

    # Re-resolve the mutable development tag so a rebuilt image deploys a fresh revision.
    response = await client.post(
        f"/api/v1/solutions/{solution.id}/update",
        json={"envs": settings.SAMPLE_ENVS, "min_scale": 1, "idle_seconds": 0},
    )
    if response.status_code == 404:
        raise RuntimeError("Sample image 'localhost:15000/sample:dev' was not found in the local registry; run 'make image' first")
    if response.status_code == 409 and str(response.json().get("detail", "")).endswith("No revision was created."):
        # The rebuilt image matches the deployed snapshot, keeping repeated seeding idempotent.
        return
    response.raise_for_status()


async def seed(settings: SeedSettings, client: httpx2.AsyncClient) -> None:
    """Register local infrastructure and create or redeploy the local example Organization and Solution."""

    # Authenticate with the administrator that the API initializes during startup.
    response = await client.post(
        "/api/v1/auth/password/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
    )
    response.raise_for_status()

    await register_compute(client, settings)

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
