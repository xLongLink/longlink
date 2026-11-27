import json
import pytest
import stripe
import asyncio
import contextlib
from uuid import UUID
from types import SimpleNamespace
from decimal import ROUND_HALF_UP, Decimal
from fastapi import HTTPException
from datetime import UTC, datetime
from factories import create_organization
from sqlalchemy import select
from urllib.parse import parse_qs, urlsplit
from src.operations import invoices
from src.environments import env
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import DatabaseState
from src.database.models.users import User
from src.database.models.invoices import Invoice
from src.database.models.organizations import Organization


@pytest.mark.parametrize("status", [Status.running, Status.creating, Status.failed])
async def test_snapshot_freezes_total_allocations_once_without_measuring_consumption(
    users: tuple[User, User, User], status: Status
) -> None:
    """Freeze allocations once without requiring available databases, storage, or per-user usage."""

    # Arrange
    organization = await create_organization(users[0])
    period_end = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.status = status
        persisted.stripe_customer_id = "cus_usage"
        persisted.stripe_payment_method_id = "pm_usage"
        persisted.compute_cpu_millicores = 2000
        persisted.compute_ram_bytes = 1_750_000_000
        persisted.storage_bytes = 12_500_000_000
        persisted.database_cpu_millicores = 1000
        persisted.database_ram_bytes = 1024**3
        persisted.database_storage_bytes = 5 * 1024**3
        persisted.provisioned_at = period_end
        persisted.database_state = DatabaseState.failed

        # Make the captured Organization eligible for the closed billing period.
        persisted.invoice_due_at = period_end
        await session.commit()

    # Act
    await invoices.snapshot(organization.id, period_end)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.compute_cpu_millicores = 3000
        await session.commit()
    await invoices.snapshot(organization.id, period_end)

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(Invoice))
        invoice = result.one()
        assert invoice.organization_id == organization.id
        assert invoice.customer_id == "cus_usage"
        assert invoice.period_end == period_end
        assert invoice.pricing_version == 3
        assert (invoice.cpu_millicores, invoice.ram_bytes, invoice.storage_bytes) == (3000, 2_823_741_824, 17_868_709_120)
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None

        # Capturing usage advances the next billing boundary once.
        assert persisted.invoice_due_at == invoices.dates.next_month(period_end)


@pytest.mark.parametrize("missing", ["card", "allocation"])
async def test_snapshot_skips_cardless_or_unprovisioned_periods(users: tuple[User, User, User], missing: str) -> None:
    """Do not retroactively charge months before consent or successful provisioning."""

    # Arrange
    organization = await create_organization(users[0])
    period_end = datetime(2026, 11, 1, tzinfo=UTC)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.status = Status.running
        persisted.stripe_customer_id = "cus_unconsented"
        persisted.invoice_due_at = period_end
        if missing == "card":
            persisted.provisioned_at = period_end
        else:
            persisted.stripe_payment_method_id = "pm_new_consent"
        await session.commit()

    # Act
    await invoices.snapshot(organization.id, period_end)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.stripe_payment_method_id = "pm_new_consent"
        persisted.provisioned_at = period_end
        await session.commit()
    await invoices.snapshot(organization.id, period_end)

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(Invoice))
        assert result.all() == []
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.invoice_due_at == datetime(2026, 12, 1, tzinfo=UTC)


async def test_capture_and_confirmed_allocation_update_share_the_callers_transaction(users: tuple[User, User, User]) -> None:
    """Capture the closed month before publishing new totals, without committing the caller's work."""

    # Arrange
    organization = await create_organization(users[0])
    period_end = datetime(2026, 11, 1, tzinfo=UTC)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.stripe_customer_id = "cus_transition"
        persisted.stripe_payment_method_id = "pm_transition"
        persisted.invoice_due_at = period_end
        persisted.provisioned_at = period_end
        persisted.compute_cpu_millicores = 1000
        persisted.database_cpu_millicores = 1000
        persisted.compute_ram_bytes = 1_000_000_000
        persisted.database_ram_bytes = 1_000_000_000
        persisted.storage_bytes = 5_000_000_000
        persisted.database_storage_bytes = 5_000_000_000
        await session.commit()

    # Act
    async with session_scope() as session:
        persisted = await organizations.lock(session, organization.id)
        invoices.capture(session, persisted, period_end)
        persisted.compute_cpu_millicores = 3000
        persisted.compute_ram_bytes = 3_000_000_000
        persisted.storage_bytes = 15_000_000_000
        result = await session.scalars(select(Invoice))
        captured = result.one()

        # Assert
        assert (captured.cpu_millicores, captured.ram_bytes, captured.storage_bytes) == (2000, 2_000_000_000, 10_000_000_000)
        await session.rollback()

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(Invoice))
        assert result.all() == []
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.invoice_due_at == period_end
        assert persisted.compute_cpu_millicores == 1000
        assert persisted.provisioned_at == period_end


@pytest.mark.parametrize(
    ("pricing_version", "crash_after"),
    [
        (1, "invoice"),
        (1, "item"),
        (1, "coupon"),
        (1, "finalize"),
        (2, "invoice"),
        (2, "item"),
        (2, "finalize"),
        (3, "invoice"),
        (3, "item"),
        (3, "finalize"),
    ],
)
async def test_issue_recovers_remote_success_after_crash_without_duplicate_charges(
    monkeypatch: pytest.MonkeyPatch, pricing_version: int, crash_after: str
) -> None:
    """Recover remote side effects after local rollback, even without retained idempotency keys."""

    # Arrange
    invoice = Invoice(
        pricing_version=pricing_version,
        customer_id="cus_retry",
        period_end=datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        users=7,
        cpu_millicores=2500,
        ram_bytes=7 * 1024**3 // 4 if pricing_version == 3 else 1_750_000_000,
        database_bytes=100 * 1024**2 + 1024**3,
        storage_bytes=2 * 1024**3 + 1 if pricing_version == 1 else 25 * 1024**3 // 2 if pricing_version == 3 else 12_500_000_000,
    )
    async with session_scope() as session:
        # Persist pending usage before exercising remote issuance retries.
        session.add(invoice)
        await session.commit()

    remote_invoices: list[dict] = []
    remote_items: list[dict] = []
    remote_coupons: dict[str, dict] = {}
    finalized_totals: list[int] = []
    monkeypatch.setattr(env, "STRIPE_SECRET_KEY", "sk_test_invoices")
    monkeypatch.setattr(env, "STRIPE_WEBHOOK_SECRET", "whsec_invoices")

    async def request(
        _self: stripe.HTTPXClient, method: str, url: str, _headers: object, post_data: str | None = None
    ) -> tuple[bytes, int, dict[str, str]]:
        """Emulate only Stripe HTTP, retaining remote effects across a lost response."""

        # Decode the real SDK's wire request; deliberately do not retain idempotency keys.
        path = urlsplit(url).path
        params = parse_qs(post_data or "", keep_blank_values=True)
        event = None
        if method == "get" and path == "/v1/invoices":
            assert parse_qs(urlsplit(url).query)["customer"] == ["cus_retry"]
            payload = {"object": "list", "data": remote_invoices, "has_more": False, "url": path}
        elif method == "post" and path == "/v1/invoices":
            # New invoices must not absorb unrelated pending customer items.
            assert params["customer"] == ["cus_retry"]
            assert params["pending_invoice_items_behavior"] == ["exclude"]
            remote = {
                "id": f"in_{len(remote_invoices) + 1}",
                "object": "invoice",
                "customer": params["customer"][0],
                "currency": params["currency"][0],
                "status": "draft",
                "metadata": {"longlink_invoice_id": params["metadata[longlink_invoice_id]"][0]},
                # Draft invoices have no finalized charge total yet.
                "total": 0,
            }
            remote_invoices.append(remote)
            payload = remote
            event = "invoice"
        elif method == "get" and path == "/v1/invoiceitems":
            assert parse_qs(urlsplit(url).query)["invoice"] == ["in_1"]

            # Return the provider's already-created invoice lines for retry recovery.
            payload = {"object": "list", "data": remote_items, "has_more": False, "url": path}
        elif method == "post" and path == "/v1/invoiceitems":
            assert params["invoice"] == ["in_1"]
            item = {
                "id": f"ii_{len(remote_items) + 1}",
                "object": "invoiceitem",
                # Simulate the amount Stripe computes from its submitted price and quantity.
                "amount": int(
                    (Decimal(params["unit_amount_decimal"][0]) * int(params["quantity"][0])).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
                ),
                "quantity": int(params["quantity"][0]),
                "unit_amount_decimal": params["unit_amount_decimal"][0],
                "description": params["description"][0],
                "metadata": {
                    "longlink_invoice_id": params["metadata[longlink_invoice_id]"][0],
                    "resource": params["metadata[resource]"][0],
                },
            }

            # Retain provider state so replayed requests observe their prior side effects.
            remote_items.append(item)
            remote_invoices[0]["total"] += item["amount"]
            payload = item
            event = "item"

        # Coupon lookups observe state retained by earlier issuance attempts.
        elif method == "get" and path.startswith("/v1/coupons/"):
            coupon_id = path.rsplit("/", 1)[1]

            # Stripe distinguishes a missing coupon from an empty successful response.
            if coupon_id not in remote_coupons:
                error = {"error": {"type": "invalid_request_error", "code": "resource_missing", "message": "No such coupon", "param": "id"}}
                return json.dumps(error).encode(), 404, {}
            payload = remote_coupons[coupon_id]

        # Retain created coupons for subsequent retry recovery.
        elif method == "post" and path == "/v1/coupons":
            coupon_id = params["id"][0]
            assert coupon_id not in remote_coupons

            # Return a provider-shaped coupon for the submitted invoice allowance.
            payload = {
                "id": coupon_id,
                "object": "coupon",
                "name": params["name"][0],
                # Preserve the actual submitted free-tier credit and invoice binding.
                "amount_off": int(params["amount_off"][0]),
                "currency": params["currency"][0],
                "duration": params["duration"][0],
                "metadata": {"longlink_invoice_id": params["metadata[longlink_invoice_id]"][0]},
            }
            remote_coupons[coupon_id] = payload
            event = "coupon"

        # Applying the allowance updates the remote invoice's actual charge total.
        elif method == "post" and path == "/v1/invoices/in_1":
            discount = 0
            if pricing_version == 1:
                coupon = remote_coupons[params["discounts[0][coupon]"][0]]
                discount = coupon["amount_off"]
            else:
                assert params["discounts"] == [""]
            remote_invoices[0]["total"] = sum(item["amount"] for item in remote_items) - discount

            # Subsequent retrieval observes the updated provider-side invoice.
            payload = remote_invoices[0]

        # Invoice reads return the accumulated remote state.
        elif method == "get" and path == "/v1/invoices/in_1":
            payload = remote_invoices[0]

        # Finalization records the total that would become chargeable.
        elif method == "post" and path == "/v1/invoices/in_1/finalize":
            # Finalization opts into Stripe's normal automatic collection lifecycle.
            assert params["auto_advance"] == ["true"]
            remote_invoices[0]["status"] = "open"
            finalized_totals.append(remote_invoices[0]["total"])
            payload = remote_invoices[0]
            event = "finalize"
        else:
            raise AssertionError(f"Unexpected Stripe request: {method} {url}")

        # A remote success followed by process interruption must leave local issuance uncommitted.
        if event == crash_after:
            raise RuntimeError("process interrupted after Stripe success")
        return json.dumps(payload).encode(), 200, {}

    monkeypatch.setattr(stripe.HTTPXClient, "request_async", request)

    # Act
    with pytest.raises(RuntimeError, match="process interrupted after Stripe success"):
        async with session_scope() as session:
            await invoices.issue(session, invoice.id)

    # Assert
    async with session_scope() as session:
        persisted = await session.get(Invoice, invoice.id)
        assert persisted is not None
        assert persisted.issued_at is None
        assert persisted.stripe_invoice_id is None
    assert len(remote_invoices) == 1

    # Act
    crash_after = ""
    async with session_scope() as session:
        await invoices.issue(session, invoice.id)
        await session.commit()
    async with session_scope() as session:
        await invoices.issue(session, invoice.id)
        await session.commit()

    # Assert
    async with session_scope() as session:
        persisted = await session.get(Invoice, invoice.id)
        assert persisted is not None
        assert persisted.stripe_invoice_id == "in_1"
        assert persisted.issued_at is not None
    assert len(remote_invoices) == 1
    assert all(item["metadata"]["longlink_invoice_id"] == str(invoice.id) for item in remote_items)
    if pricing_version in {2, 3}:
        assert finalized_totals == [3388]
        assert [(item["metadata"]["resource"], item["amount"]) for item in remote_items] == [("cpu", 2500), ("ram", 875), ("storage", 13)]
        assert [item["quantity"] for item in remote_items] == [1, 1, 1]
        assert [item["unit_amount_decimal"] for item in remote_items] == ["2500", "875", "13"]
        if pricing_version == 2:
            assert [item["description"] for item in remote_items] == [
                "CPU: 2.5 vCPU × CHF 10/vCPU",
                "RAM: 1.75 GB × CHF 5/GB",
                "Storage: 12.5 GB × CHF 0.01/GB",
            ]
        else:
            assert [item["description"] for item in remote_items] == [
                "CPU: 2.5 vCPU × CHF 10/vCPU",
                "RAM: 1.75 GiB × CHF 5/GiB",
                "Storage: 12.5 GiB × CHF 0.01/GiB",
            ]
        assert remote_coupons == {}
        return

    # Historical pending invoices retain their original free credits and integer-MiB rounding.
    assert finalized_totals == [2123]
    assert [(item["metadata"]["resource"], item["amount"]) for item in remote_items] == [
        ("users", 7000),
        ("database", 112),
        ("storage", 41),
    ]
    assert [item["quantity"] for item in remote_items] == [7, 1124, 2049]

    # Verify actual Stripe prices and the recovered free-allowance discount.
    assert [item["unit_amount_decimal"] for item in remote_items] == ["1000", "0.1", "0.02"]
    assert list(remote_coupons.values()) == [
        {
            "id": f"free_{invoice.id.hex}",
            "object": "coupon",
            "name": "Free-tier discount",
            "amount_off": 5030,
            "currency": "chf",
            "duration": "once",
            # The free-allowance coupon remains bound to this invoice.
            "metadata": {"longlink_invoice_id": str(invoice.id)},
        }
    ]


@pytest.mark.parametrize(("customer", "currency"), [("cus_foreign", "chf"), ("cus_recovered", "eur")])
async def test_issue_rejects_recovered_invoice_with_wrong_customer_or_currency(
    monkeypatch: pytest.MonkeyPatch, customer: str, currency: str
) -> None:
    """Reject mismatched recovered invoices before accepting remote finalization."""

    # Arrange
    invoice = Invoice(
        pricing_version=1,
        customer_id="cus_recovered",
        stripe_invoice_id="in_recovered",
        period_end=datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        users=7,
        database_bytes=0,
        storage_bytes=0,
    )
    async with session_scope() as session:
        session.add(invoice)
        await session.commit()

    monkeypatch.setattr(env, "STRIPE_SECRET_KEY", "sk_test_invoices")
    monkeypatch.setattr(env, "STRIPE_WEBHOOK_SECRET", "whsec_invoices")
    requests: list[tuple[str, str]] = []

    async def request(
        _self: stripe.HTTPXClient, method: str, url: str, _headers: object, _post_data: str | None = None
    ) -> tuple[bytes, int, dict[str, str]]:
        """Return an otherwise valid finalized invoice through the real Stripe SDK."""

        requests.append((method, urlsplit(url).path))
        assert (method, urlsplit(url).path) == ("get", "/v1/invoices/in_recovered")
        payload = {
            "id": "in_recovered",
            "object": "invoice",
            "customer": customer,
            "currency": currency,
            "status": "open",
            "total": 2000,
            "metadata": {"longlink_invoice_id": str(invoice.id)},
        }
        return json.dumps(payload).encode(), 200, {}

    monkeypatch.setattr(stripe.HTTPXClient, "request_async", request)

    # Act
    with pytest.raises(HTTPException) as error:
        async with session_scope() as session:
            await invoices.issue(session, invoice.id)

    # Assert
    assert error.value.status_code == 409
    assert error.value.detail == "Stripe invoice customer or currency does not match"
    assert requests == [("get", "/v1/invoices/in_recovered")]
    async with session_scope() as session:
        persisted = await session.get(Invoice, invoice.id)
        assert persisted is not None
        assert persisted.stripe_invoice_id == "in_recovered"
        assert persisted.issued_at is None


@pytest.mark.parametrize("pricing_version", [1, 2, 3])
async def test_issue_rejects_resource_line_owned_by_another_invoice(monkeypatch: pytest.MonkeyPatch, pricing_version: int) -> None:
    """Matching resource amounts and quantities cannot authorize a foreign invoice line."""

    # Arrange
    invoice = Invoice(
        pricing_version=pricing_version,
        customer_id="cus_recovered",
        stripe_invoice_id="in_recovered",
        period_end=datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        users=7,
        cpu_millicores=7000,
        database_bytes=0,
        storage_bytes=0,
    )
    async with session_scope() as session:
        session.add(invoice)
        await session.commit()

    monkeypatch.setattr(env, "STRIPE_SECRET_KEY", "sk_test_invoices")
    monkeypatch.setattr(env, "STRIPE_WEBHOOK_SECRET", "whsec_invoices")
    requests: list[tuple[str, str]] = []

    async def request(
        _self: stripe.HTTPXClient, method: str, url: str, _headers: object, _post_data: str | None = None
    ) -> tuple[bytes, int, dict[str, str]]:
        """Expose the foreign resource line without allowing provider mutations."""

        path = urlsplit(url).path
        requests.append((method, path))
        assert method == "get"
        if path == "/v1/invoices/in_recovered":
            payload = {
                "id": "in_recovered",
                "object": "invoice",
                "customer": "cus_recovered",
                "currency": "chf",
                "status": "draft",
                "total": 7000,
                "metadata": {"longlink_invoice_id": str(invoice.id)},
            }
        elif path == "/v1/invoiceitems":
            assert parse_qs(urlsplit(url).query)["invoice"] == ["in_recovered"]
            payload = {
                "object": "list",
                "url": path,
                "has_more": False,
                "data": [
                    {
                        "id": "ii_foreign",
                        "object": "invoiceitem",
                        "amount": 7000,
                        "quantity": 7 if pricing_version == 1 else 1,
                        "unit_amount_decimal": "1000" if pricing_version == 1 else "7000",
                        "metadata": {
                            "resource": "users" if pricing_version == 1 else "cpu",
                            "longlink_invoice_id": "00000000-0000-0000-0000-000000000001",
                        },
                    }
                ],
            }
        else:
            raise AssertionError(f"Unexpected Stripe request: {method} {url}")
        return json.dumps(payload).encode(), 200, {}

    monkeypatch.setattr(stripe.HTTPXClient, "request_async", request)

    # Act
    with pytest.raises(HTTPException) as error:
        async with session_scope() as session:
            await invoices.issue(session, invoice.id)

    # Assert
    assert error.value.status_code == 409
    assert error.value.detail == "Stripe invoice items require administrator review"
    assert requests == [("get", "/v1/invoices/in_recovered"), ("get", "/v1/invoiceitems")]
    async with session_scope() as session:
        persisted = await session.get(Invoice, invoice.id)
        assert persisted is not None
        assert persisted.stripe_invoice_id == "in_recovered"
        assert persisted.issued_at is None


async def test_polling_rolls_back_failed_invoice_and_commits_next_invoice(monkeypatch: pytest.MonkeyPatch) -> None:
    """One failed issuance rolls back independently without blocking other pending invoices."""

    # Arrange
    issued_at = datetime.now(UTC)
    period_end = issued_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first = Invoice(customer_id="cus_first", period_end=period_end, users=7, database_bytes=0, storage_bytes=0)
    second = Invoice(customer_id="cus_second", period_end=period_end, users=8, database_bytes=0, storage_bytes=0)
    async with session_scope() as session:
        session.add_all([first, second])
        await session.commit()

    monkeypatch.setattr(env, "STRIPE_SECRET_KEY", "sk_test_invoices")
    monkeypatch.setattr(env, "STRIPE_WEBHOOK_SECRET", "whsec_invoices")
    attempted: list[UUID] = []
    sleeping = asyncio.Event()
    stopped = asyncio.Event()

    async def issue(session: AsyncSession, invoice_id: UUID) -> None:
        """Flush real writes, failing whichever pending invoice is encountered first."""

        attempted.append(invoice_id)
        invoice = await session.get(Invoice, invoice_id)
        assert invoice is not None
        invoice.issued_at = issued_at
        invoice.stripe_invoice_id = f"in_{invoice_id.hex}"
        await session.flush()
        if len(attempted) == 1:
            raise RuntimeError("issuance interrupted after local write")

    async def sleep(_delay: float) -> None:
        """Park the poller after its first complete cycle until cancellation."""

        sleeping.set()
        await stopped.wait()

    monkeypatch.setattr(invoices, "issue", issue)
    monkeypatch.setattr(invoices, "asyncio", SimpleNamespace(sleep=sleep))

    # Act
    task = asyncio.create_task(invoices.run())
    try:
        await asyncio.wait_for(sleeping.wait(), timeout=5)

        # Assert
        assert len(attempted) == 2
        assert set(attempted) == {first.id, second.id}
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await asyncio.wait_for(task, timeout=5)

    # Assert
    async with session_scope() as session:
        failed = await session.get(Invoice, attempted[0])
        assert failed is not None
        assert failed.issued_at is None
        assert failed.stripe_invoice_id is None
    async with session_scope() as session:
        succeeded = await session.get(Invoice, attempted[1])
        assert succeeded is not None
        assert succeeded.issued_at == issued_at
        assert succeeded.stripe_invoice_id == f"in_{attempted[1].hex}"
