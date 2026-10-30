import httpx2
import asyncio
from src import auth
from fastapi import APIRouter, HTTPException
from datetime import UTC, datetime
from sqlmodel import col
from src.utils import stripe
from sqlalchemy import select
from src.context import Context
from src.environments import env
from fastapi.responses import Response
from src.models.payments import PaymentCard, PaymentInvoice, PaymentRedirect
from src.database.services import payments
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

        # Return card display metadata, never reusable payment credentials.
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
            # Ignore non-card payment methods returned by the provider.
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
                # Normalize provider timestamps at the response boundary.
                "created_at": datetime.fromtimestamp(invoice.created, UTC),
                "has_pdf": bool(invoice.invoice_pdf),
                "hosted_invoice_url": invoice.hosted_invoice_url,
            }
            async for invoice in invoices.auto_paging_iter()
            if invoice.status in {"open", "paid", "void", "uncollectible"}
        ]


@router.get(
    "/organizations/{organization_id}/invoices/{invoice_id}/pdf",
    response_class=Response,
    # The endpoint streams PDF bytes rather than a JSON response model.
    response_model=None,
    responses={200: {"content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}}},
)
async def get_invoice_pdf(invoice_id: str, ctx: Context, membership: auth.OrganizationOwner):
    """Display an owner's invoice PDF inline without forwarding Stripe's download headers."""

    # Authorize the invoice against this Organization's Stripe customer.
    customer_id = await ctx.database.scalar(
        select(col(Organization.stripe_customer_id)).where(col(Organization.id) == membership.organization_id)
    )
    if not env.stripe_enabled or customer_id is None:
        raise HTTPException(status_code=404, detail="Invoice PDF unavailable")
    async with stripe.client() as connection:
        invoice = await connection.v1.invoices.retrieve_async(invoice_id)

    # Only finalized invoices belonging to this customer may be downloaded.
    if invoice.customer != customer_id or invoice.status not in {"open", "paid", "void", "uncollectible"} or not invoice.invoice_pdf:
        raise HTTPException(status_code=404, detail="Invoice PDF unavailable")

    # Fetch only Stripe-provided invoice documents with bounded time and memory.
    url = httpx2.URL(invoice.invoice_pdf)
    if url.scheme != "https" or url.host not in {"invoice.stripe.com", "pay.stripe.com"}:
        raise HTTPException(status_code=502, detail="Invoice PDF unavailable")
    content = bytearray()
    try:

        # Fetch the provider PDF within bounded network and response-size limits.
        async with asyncio.timeout(30), httpx2.AsyncClient(timeout=15, trust_env=False, follow_redirects=True) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()

                # Enforce the PDF size ceiling while reading the provider response.
                async for chunk in response.aiter_bytes():

                    # Reject oversized PDFs before extending the response buffer.
                    if len(content) + len(chunk) > 10 * 1024**2:
                        raise HTTPException(status_code=502, detail="Invoice PDF is too large")
                    content.extend(chunk)

    # Provider PDF outages remain distinct from missing customer-owned invoices.
    except (httpx2.HTTPError, TimeoutError):
        raise HTTPException(status_code=503, detail="Invoice PDF unavailable. Please try again.") from None
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=502, detail="Invoice PDF unavailable")

    # Keep private accounting documents out of caches and let the browser display the PDF.
    return Response(
        content=bytes(content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="invoice.pdf"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/organizations/{organization_id}/cards/checkout", response_model=PaymentRedirect)
async def create_checkout(ctx: Context, membership: auth.OrganizationOwner):
    """Save an invoice payment method without taking an immediate payment."""

    # The service serializes card registration and revalidates ownership across its commits.
    async with stripe.client() as connection:
        url = await payments.checkout(ctx.database, membership.organization_id, membership.user_id, connection)
    await ctx.database.commit()
    return {"url": url}
