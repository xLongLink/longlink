import httpx2
import asyncio
import secrets
from uuid import UUID
from typing import Literal
from pathlib import Path
from datetime import UTC, datetime
from pydantic import Field, BaseModel
from src.utils import stripe
from sqlalchemy import select
from src.models import pricing
from src.database import session
from src.operations import invoices
from src.environments import env
from src.models.roles import OrganizationRoles
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.database.services import users, payments, organizations
from src.models.organizations import OrganizationInvitationCreate
from src.database.models.invoices import Invoice
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization

API_ENVIRONMENT = Path(__file__).resolve().parents[2] / "api" / ".env"
DEVELOPMENT_COMPUTE = "development compute"
DEVELOPMENT_ORGANIZATION = "acme-ink"
INVITED_ORGANIZATION = "acme-studio"
SAMPLE_SOLUTION = "invoices"


class Resource(BaseModel):
    """Describe the resource fields used by local provisioning."""

    # Identifier
    id: UUID

    # Metadata
    name: str | None = None
    slug: str | None = None

    # State
    status: Literal["creating", "failed", "running"] | None = None


class Page(BaseModel):
    """Describe one paginated API response."""

    # Results
    items: list[Resource]


class Operation(BaseModel):
    """Describe the cleanup state needed before recreating a sample."""

    # Reference
    target_id: UUID

    # State
    status: Literal["active", "completed", "failed", "scheduled"]
    failed: str | None = None


class OperationPage(BaseModel):
    """Validate the administrator cleanup operation listing."""

    # Results
    items: list[Operation]


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

    model_config = SettingsConfigDict(env_file=API_ENVIRONMENT, env_file_encoding="utf-8", extra="ignore")


async def development_compute(client: httpx2.AsyncClient) -> Resource | None:
    """Return the local development Compute when registered."""

    response = await client.get("/api/v1/computes", params={"page_size": 100})
    response.raise_for_status()
    computes = Page.model_validate(response.json()).items
    return next((compute for compute in computes if compute.name == DEVELOPMENT_COMPUTE), None)


async def register_compute(client: httpx2.AsyncClient, settings: SeedSettings) -> None:
    """Create the local Compute when absent."""

    # Reuse the registered local Compute.
    compute = await development_compute(client)
    if compute is not None:
        return

    # Register the fixed local infrastructure through the same API contract as an administrator.
    response = await client.post(
        "/api/v1/computes",
        json={
            "name": DEVELOPMENT_COMPUTE,
            "kubeconfig": settings.KUBECONFIG.read_text(encoding="utf-8"),
            "gateway_url": "https://127.0.0.1:8443",
            # Controller endpoint reachable from the host; administrator keys are read from the cluster.
            "storage_endpoint": "https://storage.localhost:9443",
        },
    )
    if response.status_code != 409:
        response.raise_for_status()
        return

    # Accept a concurrent registration only when the local Compute now exists.
    compute = await development_compute(client)
    if compute is None:
        raise RuntimeError("Local Compute registration was not recorded")


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

    # Create the development Organization with Platform-owned infrastructure defaults.
    response = await client.post("/api/v1/organizations", json={"name": "ACME Ink"})
    if response.status_code != 409:
        response.raise_for_status()
        return Resource.model_validate(response.json())

    organization = await development_organization(client)
    if organization is None:
        raise RuntimeError("Local Organization creation was not recorded")
    return organization


async def create_sample(client: httpx2.AsyncClient, settings: SeedSettings, organization: Resource) -> None:
    """Recreate the local sample with a fresh database and wait until it is ready."""

    # Find only the seeded sample; leave other Organization Solutions untouched.
    response = await client.get(f"/api/v1/organizations/{organization.id}/solutions")
    response.raise_for_status()
    solution = next(
        (solution for solution in (Resource.model_validate(payload) for payload in response.json()) if solution.slug == SAMPLE_SOLUTION),
        None,
    )
    if solution is not None:

        # Request normal lifecycle cleanup so the old schema, credentials, and attachments are removed together.
        print("Removing the local sample Solution, including its database and attachments.")
        response = await client.delete(f"/api/v1/solutions/{solution.id}")
        response.raise_for_status()

        # The slug remains reserved until cleanup completes, not merely until the tombstone is recorded.
        async with asyncio.timeout(300):
            while True:
                response = await client.get("/api/v1/operations", params={"search": "solution.delete", "page_size": 100})
                response.raise_for_status()
                operations = OperationPage.model_validate(response.json()).items

                # Wait for the actual deletion operation before recreating the sample.
                operation = next((operation for operation in operations if operation.target_id == solution.id), None)
                if operation is not None:

                    # Failed cleanup must not be mistaken for permission to recreate the sample.
                    if operation.status == "failed":
                        raise RuntimeError(f"Sample cleanup failed: {operation.failed}")

                    # Recreate the sample only after cleanup is terminally acknowledged.
                    if operation.status == "completed":
                        break
                await asyncio.sleep(1)

    # Create a new Solution identity so its initial migration runs against a fresh schema.
    print("Creating the local sample Solution from the current image.")
    response = await client.post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={
            "name": "Invoices",
            "image": "localhost:15000/sample:latest",
            "envs": settings.SAMPLE_ENVS,
            "description": "Track building projects and construction phases for ACME Ink.",
        },
    )

    # A missing local image requires the separate image-build workflow.
    if response.status_code == 404:
        raise RuntimeError("Sample image 'localhost:15000/sample:latest' was not found in the local registry; run 'make image' first")
    response.raise_for_status()

    # Do not report seed success while the new schema or View runtime is still being provisioned.
    async with asyncio.timeout(300):
        while True:
            response = await client.get(f"/api/v1/organizations/{organization.id}/solutions")
            response.raise_for_status()
            solution = next(
                (
                    solution
                    # Validate response entries before selecting the recreated sample.
                    for solution in (Resource.model_validate(payload) for payload in response.json())
                    if solution.slug == SAMPLE_SOLUTION
                ),
                None,
            )
            if solution is not None:

                # Surface a failed sample deployment instead of polling forever.
                if solution.status == "failed":
                    raise RuntimeError("Sample deployment failed. Review its logs in the Platform.")

                # Return only after the sample deployment becomes available.
                if solution.status == "running":
                    break
            await asyncio.sleep(1)

    print(f"Sample ready: {settings.PUBLIC_URL}/orgs/{DEVELOPMENT_ORGANIZATION}/solutions/{SAMPLE_SOLUTION}/projects")


async def create_invited_organization(settings: SeedSettings) -> None:
    """Restore a pending invitation for the administrator in a separately owned Organization."""

    # Bootstrap a separate owner without requiring email verification or known login credentials.
    async with session.session_scope() as database:
        owner = await users.by_email(database, "seed-owner@example.com")
        if owner is None:
            owner = await users.register(database, "Development Owner", "seed-owner@example.com", secrets.token_urlsafe(48))

        # Reuse only the dedicated invitation fixture Organization.
        organization = await database.scalar(select(Organization).where(Organization.slug == INVITED_ORGANIZATION))
        if organization is None:
            organization = await organizations.create(database, "ACME Studio", owner)

        # Reset accepted invitations so every seed run demonstrates the pending state again.
        administrator = await users.by_email(database, settings.ADMIN_EMAIL)
        if administrator is None:
            raise RuntimeError("Development administrator was not found")
        membership = await database.get(UserOrganization, (administrator.id, organization.id))
        if membership is not None:
            await organizations.remove_member(database, organization.id, administrator.id, owner.id)

        # Use the invitation service without delivering development-only email.
        invitation = OrganizationInvitationCreate(email=administrator.email, role=OrganizationRoles.maintain)
        await organizations.create_invitation(database, organization.id, invitation, owner.id)
        await database.commit()

    print(f"Pending invitation to ACME Studio ready: {settings.PUBLIC_URL}/orgs")


async def register_card(organization_id: UUID) -> None:
    """Register a reusable Stripe test Visa for the development Organization."""

    # Leave unconfigured development environments on the free allowance.
    if not env.stripe_enabled:
        print("Skipping test card: Stripe is not configured.")
        return

    # Preserve an existing card instead of creating another on every seed run.
    async with stripe.client() as connection, session.session_scope() as database:
        organization = await organizations.lock(database, organization_id)
        if organization.stripe_payment_method_id is not None:
            print("Development Organization already has a registered card.")
            return

        # Persist the customer before setup so interrupted runs reuse the same Stripe identity.
        if organization.stripe_customer_id is None:
            customer = await connection.v1.customers.create_async(
                {"name": organization.name, "metadata": {"organization_id": str(organization.id)}},
                options={"idempotency_key": f"customer:{organization.id}"},
            )
            organization.stripe_customer_id = customer.id
            await database.commit()
            organization = await organizations.lock(database, organization_id)

            # A competing setup attempt may already have registered the card.
            if organization.stripe_payment_method_id is not None:
                return

        # Stripe's test fixture completes setup without card details, Checkout, or a charge.
        intent = await connection.v1.setup_intents.create_async(
            {
                "customer": organization.stripe_customer_id,
                "confirm": True,
                "usage": "off_session",
                "payment_method": "pm_card_visa",
                "allowed_payment_method_types": ["card"],
                "metadata": {"organization_id": str(organization.id)},
            },
            # Repeated seeds reuse the same provider setup attempt.
            options={"idempotency_key": f"seed-card:v2:{organization.id}"},
        )
        await payments.save_setup_intent(database, organization, intent, connection)
        await database.commit()

    print("Stripe test Visa ending in 4242 registered for ACME Ink.")


async def create_invoice(organization_id: UUID) -> None:
    """Issue a reusable test invoice from illustrative usage, not measured resources."""

    # Invoice fixtures require the same test-mode Stripe configuration as the saved card.
    if not env.stripe_enabled:
        print("Skipping example invoice: Stripe is not configured.")
        return

    # Retain one invoice across seed runs and let normal issuance recover interrupted Stripe requests.
    async with session.session_scope() as database:
        organization = await organizations.lock(database, organization_id)
        invoice = await database.scalar(
            select(Invoice).where(Invoice.organization_id == organization_id).order_by(Invoice.period_end).limit(1)
        )
        if invoice is None:

            # Example invoicing requires completed development payment setup.
            if organization.stripe_customer_id is None or organization.stripe_payment_method_id is None:
                raise RuntimeError("Register the development test card before creating an example invoice")
            invoice = Invoice(
                organization_id=organization_id,
                customer_id=organization.stripe_customer_id,
                period_end=datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
                users=pricing.FREE_USERS + 2,
                # Example usage deliberately exceeds each free allowance.
                database_bytes=pricing.FREE_DATABASE_BYTES + 1024**3,
                storage_bytes=pricing.FREE_STORAGE_BYTES + 1024**3,
            )
            database.add(invoice)
            await database.commit()

        # Use the published rates, free-tier discount, and Stripe-hosted documents.
        await invoices.issue(database, invoice.id)

    print("Example Stripe test invoice ready for ACME Ink.")


async def seed(settings: SeedSettings) -> None:
    """Reuse local infrastructure and recreate the seeded sample Solution."""

    # Never provision development payment fixtures with live Stripe credentials.
    if env.STRIPE_SECRET_KEY is not None and not env.STRIPE_SECRET_KEY.startswith(("sk_test_", "rk_test_")):
        raise RuntimeError("Development seeding requires a Stripe test-mode key; live-mode credentials are refused")

    # Own the API client for the complete provisioning workflow.
    async with httpx2.AsyncClient(
        base_url=settings.API_URL, headers={"Origin": settings.PUBLIC_URL}, timeout=10, trust_env=False
    ) as client:

        # Release the fixture database connection even when API provisioning fails.
        try:

            # Authenticate with the administrator that the API initializes during startup.
            response = await client.post(
                "/api/v1/auth/password/login", json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}
            )
            response.raise_for_status()

            await register_compute(client, settings)
            await create_invited_organization(settings)

            organization = await create_organization(client)
            await register_card(organization.id)
            await create_invoice(organization.id)
            await create_sample(client, settings, organization)

        # Release the seed process's database pool after all API workflows finish.
        finally:
            await session.dispose_engine()


def main() -> None:
    """Seed local development from a synchronous entrypoint."""

    settings = SeedSettings()
    asyncio.run(seed(settings))


if __name__ == "__main__":
    main()
