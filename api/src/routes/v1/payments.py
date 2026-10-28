from stripe import Webhook, SignatureVerificationError
from fastapi import Request, APIRouter, HTTPException
from sqlmodel import col
from src.utils import stripe
from sqlalchemy import select
from src.context import Context
from src.environments import env
from src.database.services import payments, organizations
from src.database.models.organizations import Organization

router = APIRouter()


@router.post("/stripe/webhook", status_code=204)
async def receive_webhook(ctx: Context, request: Request):
    """Verify card-registration events and apply them directly to the Organization."""

    # Signed webhooks do not use browser credentials, and unconfigured deployments reject them.
    if not env.stripe_enabled or env.STRIPE_WEBHOOK_SECRET is None:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 1024 * 1024:
            raise HTTPException(status_code=413, detail="Webhook too large")
    try:
        event = Webhook.construct_event(bytes(body), request.headers.get("stripe-signature", ""), env.STRIPE_WEBHOOK_SECRET)
    except (ValueError, SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature") from None
    live = (env.STRIPE_SECRET_KEY or "").startswith(("sk_live_", "rk_live_"))
    if event.livemode != live:
        raise HTTPException(status_code=400, detail="Stripe mode mismatch")

    # Checkout identity and Stripe idempotency make repeated events safe without an event ledger.
    if event.type != "checkout.session.completed":
        return
    checkout = event.data.object.to_dict()
    customer_id = checkout.get("customer")
    if not isinstance(customer_id, str) or not customer_id.startswith("cus_") or len(customer_id) > 255:
        return
    organization_id = await ctx.database.scalar(select(col(Organization.id)).where(col(Organization.stripe_customer_id) == customer_id))
    if organization_id is None:
        return
    organization = await organizations.lock(ctx.database, organization_id)
    if (
        organization.deleted_at is None
        and organization.stripe_checkout_id is not None
        and checkout.get("id") == organization.stripe_checkout_id
    ):
        async with stripe.client() as connection:
            hosted = await connection.v1.checkout.sessions.retrieve_async(organization.stripe_checkout_id)
            await payments.save_card(ctx.database, organization, hosted, connection)
    await ctx.database.commit()
