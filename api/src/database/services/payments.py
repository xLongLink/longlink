import stripe
from uuid import UUID, uuid4
from fastapi import HTTPException
from datetime import UTC, datetime
from src.utils import dates
from src.models import pricing
from src.environments import env
from src.models.roles import OrganizationRoles
from src.database.services import operations, organizations
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.organizations import Organization


async def save_card(
    session: AsyncSession, organization: Organization, hosted: stripe.checkout.Session, connection: stripe.StripeClient
) -> None:
    """Save the verified invoice payment method directly on its Organization."""

    # A delayed or unrelated Checkout cannot replace this Organization's default card.
    if (
        hosted.id != organization.stripe_checkout_id
        or hosted.customer != organization.stripe_customer_id
        or hosted.mode != "setup"
        or hosted.status != "complete"
        or not isinstance(hosted.setup_intent, str)
        or organization.stripe_customer_id is None
    ):
        return
    intent = await connection.v1.setup_intents.retrieve_async(hosted.setup_intent)
    if intent.status != "succeeded" or intent.customer != organization.stripe_customer_id or not isinstance(intent.payment_method, str):
        raise HTTPException(status_code=409, detail="Card registration is not complete")

    # Stripe retains payment details; the local reference permits usage beyond the free allowance.
    await connection.v1.customers.update_async(
        organization.stripe_customer_id,
        {"invoice_settings": {"default_payment_method": intent.payment_method}},
        options={"idempotency_key": f"card:{hosted.id}"},
    )

    # First registration cannot charge for months before payment authorization.
    if organization.stripe_payment_method_id is None or organization.invoice_due_at is None:
        deadline = dates.next_month(datetime.now(UTC))
        organization.invoice_due_at = max(organization.invoice_due_at or deadline, deadline)
    organization.stripe_payment_method_id = intent.payment_method

    # Expand provisioned capacity without introducing plans or shrinking existing volumes.
    size_mib = max(organization.database_size_mib, pricing.REGISTERED_DATABASE_SIZE_MIB)
    storage_bytes = max(organization.storage_quota_bytes, pricing.REGISTERED_STORAGE_QUOTA_BYTES)
    if size_mib != organization.database_size_mib or storage_bytes != organization.storage_quota_bytes:
        organization.database_size_mib = size_mib
        organization.storage_quota_bytes = storage_bytes
        await operations.enqueue(session, kind=OperationKind.organization_create, target_id=organization.id, coalesce=False)


async def checkout(session: AsyncSession, organization: Organization, user_id: UUID, connection: stripe.StripeClient) -> str:
    """Create or reuse an owner-authorized, durable hosted card-registration attempt."""

    # Persist the Organization's customer before creating its hosted card-registration attempt.
    if organization.deleted_at is not None:
        raise HTTPException(status_code=403, detail="Organization unavailable")
    if organization.stripe_customer_id is None:
        customer = await connection.v1.customers.create_async(
            {"name": organization.name, "metadata": {"organization_id": str(organization.id)}},
            options={"idempotency_key": f"customer:{organization.id}"},
        )
        organization.stripe_customer_id = customer.id
        await session.commit()
        organization = await organizations.lock(session, organization.id)
        await organizations.locked_membership(session, user_id, organization.id, OrganizationRoles.owner)
        if organization.deleted_at is not None:
            raise HTTPException(status_code=403, detail="Organization unavailable")

    # Reuse open attempts and recover completed setup when a webhook was delayed.
    if organization.stripe_checkout_id is not None:
        existing = await connection.v1.checkout.sessions.retrieve_async(organization.stripe_checkout_id)
        if existing.status == "open":
            if existing.url is None:
                raise HTTPException(status_code=503, detail="Checkout URL unavailable")
            return existing.url
        await save_card(session, organization, existing, connection)
        organization.stripe_checkout_id = None
        organization.stripe_checkout_key = uuid4()

    # Persist the attempt before contacting Stripe, then reauthorize after releasing the lock.
    if organization.stripe_checkout_key is None:
        organization.stripe_checkout_key = uuid4()
    await session.commit()
    organization = await organizations.lock(session, organization.id)
    await organizations.locked_membership(session, user_id, organization.id, OrganizationRoles.owner)
    if organization.deleted_at is not None:
        raise HTTPException(status_code=403, detail="Organization unavailable")
    if organization.stripe_checkout_id is not None:
        existing = await connection.v1.checkout.sessions.retrieve_async(organization.stripe_checkout_id)
        if existing.status == "open" and existing.url is not None:
            return existing.url
        raise HTTPException(status_code=409, detail="Card registration already started. Refresh usage.")
    if organization.stripe_customer_id is None:
        raise HTTPException(status_code=409, detail="Stripe customer unavailable. Refresh usage.")

    # Hosted consent covers the published month-end usage charges, not a subscription or immediate payment.
    return_url = f"{env.PUBLIC_URL}/orgs/{organization.slug}/settings#payment-methods"
    hosted = await connection.v1.checkout.sessions.create_async(
        {
            "mode": "setup",
            "currency": "chf",
            "customer": organization.stripe_customer_id,
            "client_reference_id": str(organization.id),
            "allowed_payment_method_types": ["card"],
            "setup_intent_data": {"metadata": {"organization_id": str(organization.id)}},
            "custom_text": {
                "submit": {
                    "message": "By saving your card, you authorize LongLink to charge it monthly for your organization's "
                    "month-end users, database, and file storage above the free allowances at the published prices. "
                    "No payment is taken now."
                }
            },
            "success_url": return_url,
            "cancel_url": return_url,
        },
        options={"idempotency_key": f"card-checkout:{organization.stripe_checkout_key}"},
    )
    organization.stripe_checkout_id = hosted.id

    # Recovered remote attempts may already be complete or expired.
    if hosted.status != "open":
        await save_card(session, organization, hosted, connection)
        return return_url
    if hosted.url is None:
        raise HTTPException(status_code=503, detail="Checkout URL unavailable")
    return hosted.url
