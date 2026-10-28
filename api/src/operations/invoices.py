import asyncio
import contextlib
from uuid import UUID
from stripe import InvalidRequestError
from decimal import ROUND_HALF_UP, Decimal
from fastapi import HTTPException
from datetime import UTC, datetime
from sqlmodel import col
from src.utils import s3, dates, stripe
from sqlalchemy import select, update
from src.models import pricing
from src.kubernetes import databases
from src.environments import env
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from sqlalchemy.ext.asyncio import AsyncSession
from src.kubernetes.storage import Storage
from src.models.organizations import DatabaseState
from src.database.models.invoices import Invoice
from src.database.models.organizations import Organization


def storage_quantity(used: int) -> int:
    """Round nonnegative storage bytes up to whole MiB."""

    if used < 0:
        raise ValueError("Storage usage cannot be negative")
    return (used + 1024**2 - 1) // 1024**2


async def snapshot(session: AsyncSession, organization_id: UUID, period_end: datetime) -> None:
    """Freeze month-end usage once under the Organization's membership lock."""

    # The persisted deadline serializes replicas and prevents charging a month before Organization creation.
    organization = await organizations.lock(session, organization_id)
    if (
        organization.deleted_at is not None
        or organization.invoice_due_at is None
        or organization.invoice_due_at > period_end
        or organization.status != Status.running
    ):
        return

    # Organizations without payment authorization cannot be charged retroactively after adding a card.
    if organization.stripe_customer_id is None or organization.stripe_payment_method_id is None:
        organization.invoice_due_at = dates.next_month(period_end)
        await session.commit()
        return
    customer_id = organization.stripe_customer_id
    target = await organizations.infrastructure(session, organization_id)
    if target is None or organization.database_state != DatabaseState.available:
        raise HTTPException(status_code=503, detail="Organization usage is unavailable for invoicing")
    organization, compute = target
    users = await organizations.member_count(session, organization_id)

    # A failed measurement never becomes zero usage or a partially calculated invoice.
    cluster = Kubernetes(compute.kubeconfig)
    credentials = s3.Credentials(compute.storage_access_key, compute.storage_secret_key)
    storage = s3.S3(compute.storage_endpoint, credentials, compute.storage_certificate)
    async with asyncio.timeout(60), cluster:
        database = await databases.connection(organization, cluster)
        database_bytes = await database.usage(organization_id)
        storage_bytes = await storage.usage(Storage.bucket_name(organization_id))

    # Retain measured usage for issuance and retries.
    invoice = Invoice(
        organization_id=organization_id,
        customer_id=customer_id,
        period_end=period_end,
        users=users,
        database_bytes=database_bytes,
        storage_bytes=storage_bytes,
    )
    session.add(invoice)
    organization.invoice_due_at = dates.next_month(period_end)
    await session.commit()


async def issue(session: AsyncSession, invoice_id: UUID) -> None:
    """Create one itemized Stripe invoice and delegate collection and payment retries to Stripe."""

    # A no-op write serializes invoice issuance on SQLite as well as production databases.
    await session.execute(update(Invoice).where(col(Invoice.id) == invoice_id).values(users=col(Invoice.users)))
    invoice = await session.get(Invoice, invoice_id, populate_existing=True)
    if invoice is None or invoice.issued_at is not None:
        return

    # Remote metadata recovers successful requests even after Stripe's idempotency-key retention expires.
    async with stripe.client() as connection:
        remote = None
        if invoice.stripe_invoice_id is not None:
            remote = await connection.v1.invoices.retrieve_async(invoice.stripe_invoice_id)
        else:
            existing = await connection.v1.invoices.list_async({"customer": invoice.customer_id, "limit": 100})
            async for candidate in existing.auto_paging_iter():
                if (candidate.to_dict().get("metadata") or {}).get("longlink_invoice_id") == str(invoice.id):
                    if remote is not None:
                        raise HTTPException(status_code=409, detail="Duplicate Stripe invoices require administrator review")
                    remote = candidate
        if remote is None:
            remote = await connection.v1.invoices.create_async(
                {
                    "customer": invoice.customer_id,
                    "currency": "chf",
                    "auto_advance": False,
                    "collection_method": "charge_automatically",
                    "pending_invoice_items_behavior": "exclude",
                    "metadata": {"longlink_invoice_id": str(invoice.id), "period_end": invoice.period_end.isoformat()},
                },
                options={"idempotency_key": f"invoice:{invoice.id}"},
            )
        invoice.stripe_invoice_id = remote.id
        if remote.customer != invoice.customer_id or remote.currency != "chf":
            raise HTTPException(status_code=409, detail="Stripe invoice customer or currency does not match")
        if remote.status not in {"draft", "open", "paid", "void", "uncollectible"}:
            raise HTTPException(status_code=409, detail="Stripe invoice state requires administrator review")

        # Already finalized invoices remain Stripe's responsibility; never create a replacement charge.
        if remote.status == "draft":
            items = await connection.v1.invoice_items.list_async({"invoice": remote.id, "limit": 100})
            existing_items = [item async for item in items.auto_paging_iter()]
            lines = []
            discount = 0
            total = 0

            # Apply current pricing to the measured usage and cap free-tier credits at usage charges.
            for resource, label, used, included, rate, unit in (
                ("users", "Users", invoice.users, pricing.FREE_USERS, pricing.USER_MONTHLY_PRICE, "users"),
                ("database", "Database", invoice.database_bytes, pricing.FREE_DATABASE_BYTES, pricing.DATABASE_MIB_MONTHLY_PRICE, "MiB"),
                ("storage", "File storage", invoice.storage_bytes, pricing.FREE_STORAGE_BYTES, pricing.STORAGE_MIB_MONTHLY_PRICE, "MiB"),
            ):
                quantity = used if resource == "users" else storage_quantity(used)
                excess = max(0, used - included)
                billable = excess if resource == "users" else storage_quantity(excess)
                unit_price = Decimal(rate)
                gross = (quantity * unit_price).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
                net = (billable * unit_price).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
                description = label if resource == "users" else f"{label} ({unit})"
                lines.append((resource, description, quantity, unit_price, int(gross)))
                discount += int(gross - net)
                total += int(net)

            for resource, label, quantity, rate, amount in lines:
                matched = [item for item in existing_items if (item.to_dict().get("metadata") or {}).get("resource") == resource]
                if matched:
                    if (
                        len(matched) != 1
                        or matched[0].amount != amount
                        or matched[0].quantity != quantity
                        or (matched[0].to_dict().get("metadata") or {}).get("longlink_invoice_id") != str(invoice.id)
                    ):
                        raise HTTPException(status_code=409, detail="Stripe invoice items require administrator review")
                    continue

                # Each line belongs to this invoice, never to a customer's unrelated pending invoice items.
                await connection.v1.invoice_items.create_async(
                    {
                        "customer": invoice.customer_id,
                        "invoice": remote.id,
                        "currency": "chf",
                        "quantity": quantity,
                        "unit_amount_decimal": str(rate),
                        "description": label,
                        "metadata": {"longlink_invoice_id": str(invoice.id), "resource": resource},
                    },
                    options={"idempotency_key": f"invoice:{invoice.id}:{resource}"},
                )

            # Recover the same invoice-specific discount after interrupted requests.
            if discount > 0:
                coupon_id = f"free_{invoice.id.hex}"
                try:
                    coupon = await connection.v1.coupons.retrieve_async(coupon_id)
                except InvalidRequestError as error:
                    if error.code != "resource_missing":
                        raise
                    coupon = await connection.v1.coupons.create_async(
                        {
                            "id": coupon_id,
                            "name": "Free-tier discount",
                            "currency": "chf",
                            "duration": "once",
                            "amount_off": discount,
                            "metadata": {"longlink_invoice_id": str(invoice.id)},
                        },
                        options={"idempotency_key": f"invoice:{invoice.id}:coupon"},
                    )
                if (
                    coupon.amount_off != discount
                    or coupon.currency != "chf"
                    or (coupon.to_dict().get("metadata") or {}).get("longlink_invoice_id") != str(invoice.id)
                ):
                    raise HTTPException(status_code=409, detail="Stripe invoice discount does not match measured usage")
                await connection.v1.invoices.update_async(
                    remote.id, {"discounts": [{"coupon": coupon.id}]}, options={"idempotency_key": f"invoice:{invoice.id}:discount"}
                )
            else:
                await connection.v1.invoices.update_async(
                    remote.id, {"discounts": ""}, options={"idempotency_key": f"invoice:{invoice.id}:discount"}
                )

            # Reject unexpected edits that change the calculated invoice total.
            remote = await connection.v1.invoices.retrieve_async(remote.id)
            if remote.total != total:
                raise HTTPException(status_code=409, detail="Stripe invoice total does not match measured usage")
            await connection.v1.invoices.finalize_invoice_async(
                remote.id, {"auto_advance": True}, options={"idempotency_key": f"invoice:{invoice.id}:finalize"}
            )

    invoice.issued_at = datetime.now(UTC)
    await session.commit()


async def run() -> None:
    """Poll durable month-end deadlines and resume unfinished invoice issuance after restarts."""

    if not env.stripe_enabled:
        return
    while True:
        with contextlib.suppress(Exception):
            # Use the latest closed UTC month; outages never fabricate several months of historical usage.
            period_end = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            async with session_scope() as session:
                result = await session.scalars(
                    select(col(Organization.id)).where(
                        col(Organization.deleted_at).is_(None),
                        col(Organization.status) == Status.running,
                        col(Organization.invoice_due_at) <= period_end,
                    )
                )
                organization_ids = result.all()
            for organization_id in organization_ids:
                with contextlib.suppress(Exception):
                    async with session_scope() as session:
                        await snapshot(session, organization_id, period_end)

            # Measured usage retries independently of later membership, storage changes, or deleted Organizations.
            async with session_scope() as session:
                result = await session.scalars(select(col(Invoice.id)).where(col(Invoice.issued_at).is_(None)))
                invoice_ids = result.all()
            for invoice_id in invoice_ids:
                with contextlib.suppress(Exception):
                    async with session_scope() as session:
                        await issue(session, invoice_id)
        await asyncio.sleep(60)
