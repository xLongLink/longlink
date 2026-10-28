import json
import pytest
import stripe
from uuid import UUID
from decimal import ROUND_HALF_UP, Decimal
from conftest import DatabaseKubernetes
from datetime import UTC, datetime
from factories import create_organization
from sqlalchemy import select
from urllib.parse import parse_qs, urlsplit
from src.operations import invoices
from src.environments import env
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.organizations import DatabaseState
from src.database.models.users import User
from src.database.models.invoices import Invoice
from src.database.models.organizations import Organization


@pytest.mark.usefixtures("database_runtime")
@pytest.mark.parametrize("failed_measurement", ["database", "storage"])
async def test_snapshot_measurement_failure_preserves_deadline_until_complete_retry(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, failed_measurement: str
) -> None:
    """Never persist partial usage or skip a billing month when measurement fails."""

    # Arrange
    organization = await create_organization(users[0])
    period_end = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.status = Status.running
        persisted.database_state = DatabaseState.available
        persisted.stripe_customer_id = "cus_usage"
        persisted.stripe_payment_method_id = "pm_usage"

        # Make the captured Organization eligible for the closed billing period.
        persisted.invoice_due_at = period_end
        await session.commit()

    async def database_usage(self: object, organization_id: UUID) -> int:
        """Measure external SQL usage, with one recoverable outage."""

        assert organization_id == organization.id
        if failed_measurement == "database":
            raise OSError("database measurement unavailable")
        return 100 * 1024**2 + 1024**3

    async def storage_usage(self: object, bucket: str) -> int:
        """Measure external S3 usage, with one recoverable outage."""

        assert bucket == invoices.Storage.bucket_name(organization.id)
        if failed_measurement == "storage":
            raise OSError("storage measurement unavailable")
        return 2 * 1024**3

    monkeypatch.setattr(invoices, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(invoices.databases.postgres.Postgres, "usage", database_usage, raising=False)
    monkeypatch.setattr(invoices.s3.S3, "usage", storage_usage)

    # Act
    with pytest.raises(OSError, match=f"{failed_measurement} measurement unavailable"):
        async with session_scope() as session:
            await invoices.snapshot(session, organization.id, period_end)

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(Invoice))
        assert result.all() == []
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.invoice_due_at == period_end

    # Act
    failed_measurement = ""
    async with session_scope() as session:
        await invoices.snapshot(session, organization.id, period_end)
    async with session_scope() as session:
        await invoices.snapshot(session, organization.id, period_end)

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(Invoice))
        invoice = result.one()
        assert invoice.organization_id == organization.id
        assert invoice.customer_id == "cus_usage"
        assert invoice.period_end == period_end
        assert (invoice.users, invoice.database_bytes, invoice.storage_bytes) == (1, 100 * 1024**2 + 1024**3, 2 * 1024**3)
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None

        # Capturing usage advances the next billing boundary once.
        assert persisted.invoice_due_at == invoices.dates.next_month(period_end)


@pytest.mark.parametrize("crash_after", ["invoice", "item", "finalize"])
async def test_issue_recovers_remote_success_after_crash_without_duplicate_charges(
    monkeypatch: pytest.MonkeyPatch, crash_after: str
) -> None:
    """Recover remote side effects after local rollback, even without retained idempotency keys."""

    # Arrange
    invoice = Invoice(
        customer_id="cus_retry",
        period_end=datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        users=7,
        database_bytes=100 * 1024**2 + 1024**3,
        storage_bytes=2 * 1024**3 + 1,
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
        self: stripe.HTTPXClient, method: str, url: str, headers: object, post_data: str | None = None
    ) -> tuple[bytes, int, dict[str, str]]:
        """Emulate only Stripe HTTP, retaining remote effects across a lost response."""

        # Decode the real SDK's wire request; deliberately do not retain idempotency keys.
        path = urlsplit(url).path
        params = parse_qs(post_data or "")
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

        # Applying the allowance updates the remote invoice's actual charge total.
        elif method == "post" and path == "/v1/invoices/in_1":
            coupon = remote_coupons[params["discounts[0][coupon]"][0]]
            remote_invoices[0]["total"] = sum(item["amount"] for item in remote_items) - coupon["amount_off"]

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
    async with session_scope() as session:
        await invoices.issue(session, invoice.id)

    # Assert
    async with session_scope() as session:
        persisted = await session.get(Invoice, invoice.id)
        assert persisted is not None
        assert persisted.stripe_invoice_id == "in_1"
        assert persisted.issued_at is not None
    assert len(remote_invoices) == 1
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
    assert all(item["metadata"]["longlink_invoice_id"] == str(invoice.id) for item in remote_items)
