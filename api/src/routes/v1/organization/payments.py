from src import auth
from fastapi import APIRouter
from datetime import UTC, datetime
from sqlmodel import col
from src.utils import stripe
from sqlalchemy import select
from src.context import Context
from src.environments import env
from src.models.roles import OrganizationRoles
from src.models.payments import PaymentCard, PaymentInvoice, PaymentRedirect
from src.database.services import payments, organizations
from src.database.models.organizations import Organization

router = APIRouter()


@router.get("/organizations/{organization_id}/cards", response_model=list[PaymentCard])
async def get_cards(ctx: Context, membership: auth.OrganizationOwner):
    """List masked saved cards for the current Organization owner."""

    # Resolve ownership before accessing the Organization's Stripe customer.
    customer_id = await ctx.database.scalar(
        select(col(Organization.stripe_customer_id)).where(col(Organization.id) == membership.organization_id)
    )
    if not env.stripe_enabled or customer_id is None:
        return []

    # Read current Stripe details rather than persisting duplicate card metadata.
    async with stripe.client() as connection:
        customer = await connection.v1.customers.retrieve_async(customer_id)
        if customer.to_dict().get("deleted", False):
            return []
        default = customer.invoice_settings.default_payment_method if customer.invoice_settings is not None else None
        methods = await connection.v1.payment_methods.list_async({"customer": customer_id, "type": "card", "limit": 100})
        return [
            {
                "id": method.id,
                "brand": method.card.brand,
                "last4": method.card.last4,
                "exp_year": method.card.exp_year,
                "exp_month": method.card.exp_month,
                "is_default": method.id == default,
            }
            async for method in methods.auto_paging_iter()
            if method.card is not None
        ]


@router.get("/organizations/{organization_id}/invoices", response_model=list[PaymentInvoice])
async def get_invoices(ctx: Context, membership: auth.OrganizationOwner):
    """List issued invoices and hosted documents for the current Organization owner."""

    # Keep accounting documents private to owners of the mapped Organization.
    customer_id = await ctx.database.scalar(
        select(col(Organization.stripe_customer_id)).where(col(Organization.id) == membership.organization_id)
    )
    if not env.stripe_enabled or customer_id is None:
        return []

    # Stripe remains authoritative for invoice status, payment outcomes, and document URLs.
    async with stripe.client() as connection:
        invoices = await connection.v1.invoices.list_async({"customer": customer_id, "limit": 100})
        return [
            {
                "id": invoice.id,
                "total": invoice.total,
                "number": invoice.number,
                "status": invoice.status,
                "currency": invoice.currency,
                "created_at": datetime.fromtimestamp(invoice.created, UTC),
                "invoice_pdf": invoice.invoice_pdf,
                "hosted_invoice_url": invoice.hosted_invoice_url,
            }
            async for invoice in invoices.auto_paging_iter()
            if invoice.status in {"open", "paid", "void", "uncollectible"}
        ]


@router.post("/organizations/{organization_id}/cards/checkout", response_model=PaymentRedirect)
async def create_checkout(ctx: Context, membership: auth.OrganizationOwner):
    """Save an invoice payment method without taking an immediate payment."""

    # Serialize card registration with membership changes and deletion.
    organization_id = membership.organization_id
    organization = await organizations.lock(ctx.database, organization_id)
    await organizations.locked_membership(ctx.database, membership.user_id, organization_id, OrganizationRoles.owner)
    async with stripe.client() as connection:
        url = await payments.checkout(ctx.database, organization, membership.user_id, connection)
    await ctx.database.commit()
    return {"url": url}
