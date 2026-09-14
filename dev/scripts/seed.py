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
    COMPUTE_TIMEOUT_SECONDS: int = Field(default=300, ge=1)

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
        if compute.status != "failed":
            return compute

        # Re-register the local Compute after a completed validation failure.
        response = await client.delete(f"/api/v1/computes/{compute.id}")
        response.raise_for_status()

    # Register the fixed local infrastructure through the same API contract as an administrator.
    gateway_certificate = LOCAL_GATEWAY_CERTIFICATE.read_text(encoding="utf-8")
    storage_certificate = LOCAL_STORAGE_CERTIFICATE.read_text(encoding="utf-8")
    response = await client.post(
        "/api/v1/computes",
        json={
            "name": DEVELOPMENT_COMPUTE,
            "kubeconfig": settings.KUBECONFIG.read_text(encoding="utf-8"),
            "gateway_url": "https://localhost:8443",
            "gateway_certificate": gateway_certificate,
            "database_size_gib": 10,
            "database_instances": 1,
            "database_storage_class": "local-path",
            "storage_endpoint": "https://storage.localhost:9443",
            "storage_access_key": "rustfsadmin",
            "storage_secret_key": "rustfsadmin",
            "storage_certificate": storage_certificate,
            "bucket_size_bytes": 134217728,
        },
    )
    if response.status_code != 409:
        response.raise_for_status()
        return Resource.model_validate(response.json())

    compute = await development_compute(client)
    if compute is None:
        raise RuntimeError("Local Compute registration was not recorded")
    return compute


async def wait_for_compute(client: httpx2.AsyncClient, compute: Resource, settings: SeedSettings) -> None:
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

    # Let the API select the sole validated local Compute.
    response = await client.post("/api/v1/organizations", json={"name": "Development"})
    if response.status_code != 409:
        response.raise_for_status()
        return Resource.model_validate(response.json())

    organization = await development_organization(client)
    if organization is None:
        raise RuntimeError("Local Organization creation was not recorded")
    return organization


async def wait_for_organization(client: httpx2.AsyncClient, organization: Resource, settings: SeedSettings) -> Resource:
    """Wait until the local Organization accepts Solution provisioning."""

    # Wait for the asynchronous storage and Kubernetes boundary provisioning.
    try:
        async with asyncio.timeout(settings.COMPUTE_TIMEOUT_SECONDS):
            while organization.status == "creating":
                await asyncio.sleep(1)
                current = await development_organization(client)
                if current is None:
                    raise RuntimeError("Local Organization was removed")
                organization = current

            if organization.status == "failed":
                raise RuntimeError("Local Organization provisioning failed")
    except TimeoutError as exc:
        raise RuntimeError("Local Organization provisioning timed out") from exc

    return organization


async def create_sample(client: httpx2.AsyncClient, settings: SeedSettings, organization: Resource) -> None:
    """Create or retry the local sample Solution."""

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
                "description": "A sample solution for local development.",
            },
        )
        response.raise_for_status()
        return

    if solution.status == "failed":
        # Retry failed sample provisioning through a fresh revision of its persisted source.
        response = await client.post(
            f"/api/v1/solutions/{solution.id}/update",
            json={"envs": settings.SAMPLE_ENVS},
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
    organization = await wait_for_organization(client, organization, settings)
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
