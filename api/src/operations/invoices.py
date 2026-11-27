import asyncio
import contextlib
from uuid import UUID
from stripe import InvalidRequestError
from decimal import ROUND_HALF_UP, Decimal
from fastapi import HTTPException
from datetime import UTC, datetime
from sqlmodel import col
from src.utils import dates, stripe
from sqlalchemy import select, update
from src.models import pricing
from src.environments import env
from src.database.session import session_scope
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.invoices import Invoice
from src.database.models.organizations import Organization


def storage_quantity(used: int) -> int:
    """Round nonnegative storage bytes up to whole MiB."""

    if used < 0:
        raise ValueError("Storage usage cannot be negative")
    return (used + 1024**2 - 1) // 1024**2


def capture(session: AsyncSession, organization: Organization, period_end: datetime) -> None:
    """Freeze a due month's confirmed allocations under the caller's Organization lock without committing."""

    # The persisted deadline serializes replicas and excludes pre-consent or already captured months.
    if organization.deleted_at is not None or organization.invoice_due_at is None or organization.invoice_due_at > period_end:
        return

    # Only renewed authorization and successful initial provisioning permit charges.
    if (
        organization.stripe_customer_id is not None
        and organization.stripe_payment_method_id is not None
        and organization.provisioned_at is not None
    ):
        invoice = Invoice(
            organization_id=organization.id,
            customer_id=organization.stripe_customer_id,
            period_end=period_end,
            cpu_millicores=organization.compute_cpu_millicores + organization.database_cpu_millicores,
            ram_bytes=organization.compute_ram_bytes + organization.database_ram_bytes,
            storage_bytes=organization.storage_bytes + organization.database_storage_bytes,
        )
        session.add(invoice)

    # Advance even unbilled months so later provisioning cannot fabricate historical allocations.
    organization.invoice_due_at = dates.next_month(period_end)


async def snapshot(organization_id: UUID, period_end: datetime) -> None:
    """Freeze month-end allocation once in an isolated transaction under the Organization lock."""

    # Share the same capture boundary with successful provider reconciliation.
    async with session_scope() as session:
        organization = await organizations.lock(session, organization_id)
        capture(session, organization, period_end)
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

            # Recover an already-created invoice after a local commit interruption.
            async for candidate in existing.auto_paging_iter():
                if (candidate.to_dict().get("metadata") or {}).get("longlink_invoice_id") == str(invoice.id):
                    # Multiple remote matches require manual review, not another charge.
                    if remote is not None:
                        raise HTTPException(status_code=409, detail="Duplicate Stripe invoices require administrator review")
                    remote = candidate

        # Create only when no previously issued remote invoice can be recovered.
        if remote is None:
            remote = await connection.v1.invoices.create_async(
                {
                    "customer": invoice.customer_id,
                    "currency": "chf",
                    "auto_advance": False,
                    "collection_method": "charge_automatically",
                    "pending_invoice_items_behavior": "exclude",
                    # Stable metadata recovers the same remote invoice after interruptions.
                    "metadata": {"longlink_invoice_id": str(invoice.id), "period_end": invoice.period_end.isoformat()},
                },
                options={"idempotency_key": f"invoice:{invoice.id}"},
            )
        invoice.stripe_invoice_id = remote.id
        if remote.customer != invoice.customer_id or remote.currency != "chf":
            raise HTTPException(status_code=409, detail="Stripe invoice customer or currency does not match")

        # Unexpected provider states require review instead of automatic issuance.
        if remote.status not in {"draft", "open", "paid", "void", "uncollectible"}:
            raise HTTPException(status_code=409, detail="Stripe invoice state requires administrator review")

        # Already finalized invoices remain Stripe's responsibility; never create a replacement charge.
        if remote.status == "draft":
            items = await connection.v1.invoice_items.list_async({"invoice": remote.id, "limit": 100})
            existing_items = [item async for item in items.auto_paging_iter()]
            discount = 0
            total = 0

            # Historical pending invoices retain their original quantities, allowances, and recovery keys.
            if invoice.pricing_version == 1:
                resources = (
                    ("users", "Users", invoice.users, pricing.FREE_USERS, Decimal(pricing.USER_MONTHLY_PRICE)),
                    ("database", "Database (MiB)", invoice.database_bytes, pricing.FREE_DATABASE_BYTES, pricing.DATABASE_MIB_MONTHLY_PRICE),
                    ("storage", "File storage (MiB)", invoice.storage_bytes, pricing.FREE_STORAGE_BYTES, pricing.STORAGE_MIB_MONTHLY_PRICE),
                )

                # Preserve historical MiB ceilings and independently rounded gross and net amounts.
                charges: list[tuple[str, str, int, Decimal, int]] = []
                for resource, description, used, included, unit_price in resources:
                    quantity = storage_quantity(used) if resource != "users" else used
                    excess = max(0, used - included)
                    billable = storage_quantity(excess) if resource != "users" else excess
                    gross = int((quantity * unit_price).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                    net = int((billable * unit_price).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                    discount += gross - net
                    total += net
                    charges.append((resource, description, quantity, unit_price, gross))

            # Paid allocation invoices charge totals without free allowances or double-counting database allocations.
            elif invoice.pricing_version in {2, 3}:
                byte_unit = pricing.GB_BYTES if invoice.pricing_version == 2 else pricing.GIB_BYTES
                unit_name = "GB" if invoice.pricing_version == 2 else "GiB"
                cpu_amount, ram_amount, storage_amount = pricing.allocation_amounts(
                    invoice.cpu_millicores, invoice.ram_bytes, invoice.storage_bytes, byte_unit=byte_unit
                )
                charges = [
                    (
                        "cpu",
                        f"CPU: {Decimal(invoice.cpu_millicores) / 1000:f} vCPU × CHF {pricing.CPU_MONTHLY_PRICE / 100:f}/vCPU",
                        1,
                        cpu_amount,
                        int(cpu_amount),
                    ),
                    (
                        "ram",
                        f"RAM: {Decimal(invoice.ram_bytes) / byte_unit:f} {unit_name} "
                        f"× CHF {pricing.RAM_GIB_MONTHLY_PRICE / 100:f}/{unit_name}",
                        1,
                        ram_amount,
                        int(ram_amount),
                    ),
                    (
                        "storage",
                        f"Storage: {Decimal(invoice.storage_bytes) / byte_unit:f} {unit_name} "
                        f"× CHF {pricing.STORAGE_GIB_MONTHLY_PRICE / 100:f}/{unit_name}",
                        1,
                        storage_amount,
                        int(storage_amount),
                    ),
                ]
                total = int(cpu_amount) + int(ram_amount) + int(storage_amount)
            else:
                raise HTTPException(status_code=409, detail="Invoice pricing version requires administrator review")

            # Issue and recover concrete resource charges identically for every pricing version.
            for resource, description, quantity, unit_price, gross in charges:
                # Recover each resource line independently to avoid duplicate charges.
                matched = [item for item in existing_items if (item.to_dict().get("metadata") or {}).get("resource") == resource]

                # Recovered items must match the expected price and quantity exactly.
                if matched:
                    # Refuse ambiguous or modified invoice items instead of charging again.
                    if (
                        len(matched) != 1
                        or matched[0].amount != gross
                        or matched[0].quantity != quantity
                        # Resource matches must still belong to this exact measured invoice.
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
                        "unit_amount_decimal": unit_price,
                        "description": description,
                        "metadata": {"longlink_invoice_id": str(invoice.id), "resource": resource},
                    },
                    # Retried issuance must not duplicate a resource's line item.
                    options={"idempotency_key": f"invoice:{invoice.id}:{resource}"},
                )

            # Recover the same invoice-specific discount after interrupted requests.
            if discount > 0:
                coupon_id = f"free_{invoice.id.hex}"

                # A previous issuance attempt may already own this discount.
                try:
                    coupon = await connection.v1.coupons.retrieve_async(coupon_id)

                # Only a missing coupon permits creation during retry recovery.
                except InvalidRequestError as error:
                    # Authentication and provider failures must not trigger coupon creation.
                    if error.code != "resource_missing":
                        raise
                    coupon = await connection.v1.coupons.create_async(
                        {
                            # One invoice-specific coupon represents its free-tier allowance.
                            "id": coupon_id,
                            "name": "Free-tier discount",
                            "currency": "chf",
                            "duration": "once",
                            "amount_off": discount,
                            "metadata": {"longlink_invoice_id": str(invoice.id)},
                        },
                        options={"idempotency_key": f"invoice:{invoice.id}:coupon"},
                    )

                # Recovered discounts must match the expected free-tier credit.
                if (
                    coupon.amount_off != discount
                    or coupon.currency != "chf"
                    or (coupon.to_dict().get("metadata") or {}).get("longlink_invoice_id") != str(invoice.id)
                ):
                    raise HTTPException(status_code=409, detail="Stripe invoice discount does not match measured usage")

                # Apply only the verified invoice-specific allowance coupon.
                await connection.v1.invoices.update_async(
                    remote.id, {"discounts": [{"coupon": coupon.id}]}, options={"idempotency_key": f"invoice:{invoice.id}:discount"}
                )

            # Remove a recovered discount when no free-tier credit applies.
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

    # Mark issuance complete only after Stripe accepts the invoice.
    invoice.issued_at = datetime.now(UTC)


async def run() -> None:
    """Poll durable month-end deadlines and resume unfinished invoice issuance after restarts."""

    if not env.stripe_enabled:
        return
    while True:
        # Use the latest closed UTC month; outages never fabricate several months of historical usage.
        with contextlib.suppress(Exception):
            period_end = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            async with session_scope() as session:
                result = await session.scalars(
                    select(col(Organization.id)).where(
                        # Deleted Organizations never enter a new billing capture.
                        col(Organization.deleted_at).is_(None),
                        # Capture only Organizations whose current period has closed.
                        col(Organization.invoice_due_at) <= period_end,
                    )
                )
                organization_ids = result.all()

            # Isolate usage capture failures to their owning Organization.
            for organization_id in organization_ids:
                with contextlib.suppress(Exception):
                    await snapshot(organization_id, period_end)

            # Measured usage retries independently of later membership, storage changes, or deleted Organizations.
            async with session_scope() as session:
                result = await session.scalars(select(col(Invoice.id)).where(col(Invoice.issued_at).is_(None)))
                invoice_ids = result.all()

            # One failed Stripe request must not block other pending invoices.
            for invoice_id in invoice_ids:
                with contextlib.suppress(Exception):
                    # Each pending invoice gets an independent issuance transaction.
                    async with session_scope() as session:
                        await issue(session, invoice_id)
                        await session.commit()
        await asyncio.sleep(60)
