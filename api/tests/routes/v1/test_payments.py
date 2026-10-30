import hmac
import json
import time
import pytest
import stripe
import hashlib
import pytest_asyncio
from httpx2 import AsyncClient
from conftest import reject_provider_construction
from factories import add_member, fetch_operations, create_organization, assert_no_new_operations
from src.utils import stripe as stripe_provider
from unittest.mock import AsyncMock, MagicMock
from src.environments import env
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.organizations import Organization


@pytest.fixture
def configured_stripe(monkeypatch: pytest.MonkeyPatch) -> None:
    """Configure test-mode credentials without contacting Stripe."""

    monkeypatch.setattr(env, "STRIPE_SECRET_KEY", "sk_test_payments")
    monkeypatch.setattr(env, "STRIPE_WEBHOOK_SECRET", "whsec_payments")


@pytest_asyncio.fixture
async def card_organization(users: tuple[User, User, User], configured_stripe: None) -> Organization:
    """Persist an owned Organization with a real customer and checkout mapping."""

    organization = await create_organization(users[1])
    async with session_scope() as session:
        organization = await session.get(Organization, organization.id)
        assert organization is not None
        organization.stripe_customer_id = "cus_acme"
        organization.stripe_checkout_id = "cs_acme"
        await session.commit()

    # Expose the persisted fixture after payment metadata commits.
    return organization


PAYMENT_ENDPOINTS = [
    pytest.param(
        "GET",
        "cards",
        [{"id": "pm_acme", "brand": "visa", "last4": "4242", "exp_year": 2030, "exp_month": 12, "is_default": True}],
        id="cards",
    ),
    pytest.param(
        "GET",
        # Exercise the Stripe invoice-list endpoint, not local invoice snapshots.
        "invoices",
        [
            {
                "id": "in_acme",
                "total": 1200,
                "number": "ACME-1",
                "status": "paid",
                "currency": "usd",
                "created_at": "2026-01-01T00:00:00Z",
                "has_pdf": True,
                "hosted_invoice_url": "https://stripe.example/invoice",
            }
        ],
        id="invoices",
    ),
    pytest.param("POST", "cards/checkout", {"url": "https://stripe.example/checkout"}, id="checkout"),
]


@pytest.mark.parametrize(("method", "endpoint", "expected"), PAYMENT_ENDPOINTS)
async def test_payment_endpoints_require_the_organizations_owner_before_stripe(
    method: str,
    endpoint: str,
    expected: object,
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    card_organization: Organization,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Allow the owner, but deny members and cross-tenant administrators before provider access."""

    # Arrange
    organization = card_organization
    await add_member(user=users[2], organization=organization, role=OrganizationRoles.admin)
    await create_organization(users[0], name="other-tenant")
    connection = MagicMock()
    connection.v1.customers.retrieve_async = AsyncMock(
        return_value=stripe.Customer.construct_from({"id": "cus_acme", "invoice_settings": {"default_payment_method": "pm_acme"}}, None)
    )
    connection.v1.payment_methods.list_async = AsyncMock(
        return_value=stripe.ListObject.construct_from(
            {
                "object": "list",
                "has_more": False,
                "data": [
                    {
                        "id": "pm_acme",
                        "object": "payment_method",
                        # Only display-safe card metadata is returned by the provider boundary.
                        "card": {"brand": "visa", "last4": "4242", "exp_year": 2030, "exp_month": 12},
                    }
                ],
            },
            None,
        )
    )
    connection.v1.invoices.list_async = AsyncMock(
        return_value=stripe.ListObject.construct_from(
            {
                "object": "list",
                "has_more": False,
                "data": [
                    {
                        "id": "in_acme",
                        "object": "invoice",
                        "total": 1200,
                        "number": "ACME-1",
                        "status": "paid",
                        "currency": "usd",
                        "created": 1767225600,
                        # Provider invoices expose their display and download links.
                        "invoice_pdf": "https://stripe.example/invoice.pdf",
                        "hosted_invoice_url": "https://stripe.example/invoice",
                    }
                ],
            },
            None,
        )
    )

    # Owner-only reads may resolve the Organization's outstanding hosted checkout.
    connection.v1.checkout.sessions.retrieve_async = AsyncMock(
        return_value=stripe.checkout.Session.construct_from(
            {"id": "cs_acme", "status": "open", "url": "https://stripe.example/checkout"}, None
        )
    )
    provider = MagicMock()
    provider.return_value.__aenter__.return_value = connection
    monkeypatch.setattr(stripe_provider, "client", provider)
    url = f"/api/v1/organizations/{organization.id}/{endpoint}"
    previous_operations = await fetch_operations()

    # Act
    owner_response = await clients[1].request(method, url)

    # Assert
    assert owner_response.status_code == 200
    assert owner_response.json() == expected
    provider.assert_called_once_with()

    # Act
    reject_provider_construction(monkeypatch, (stripe_provider, "client"))
    member_response = await clients[2].request(method, url)
    outsider_response = await clients[0].request(method, url)

    # Assert
    assert member_response.status_code == 403
    assert member_response.json() == {"detail": "Permission required"}
    assert outsider_response.status_code == 403
    assert outsider_response.json() == {"detail": "Access required"}
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.stripe_customer_id == "cus_acme"
        assert persisted.stripe_checkout_id == "cs_acme"

        # A hosted checkout is not yet a completed payment-method registration.
        assert persisted.stripe_checkout_key is None
        assert persisted.stripe_payment_method_id is None
    await assert_no_new_operations(previous_operations)


def signed_webhook(*, livemode: bool = False, secret: str = "whsec_payments") -> tuple[bytes, str]:
    """Sign an otherwise actionable checkout event with a current Stripe timestamp."""

    body = json.dumps(
        {
            "id": "evt_acme",
            "object": "event",
            "type": "checkout.session.completed",
            "livemode": livemode,
            "data": {"object": {"id": "cs_acme", "object": "checkout.session", "customer": "cus_acme"}},
        }
        # Stripe signs the exact encoded JSON body.
    ).encode()

    # Sign the exact webhook bytes using Stripe's timestamped signature format.
    timestamp = int(time.time())
    signature = hmac.new(secret.encode(), str(timestamp).encode() + b"." + body, hashlib.sha256).hexdigest()
    return body, f"t={timestamp},v1={signature}"


async def assert_card_registration_unchanged(organization: Organization) -> None:
    """Check rejected webhooks leave payment authorization and capacity unchanged."""

    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.stripe_customer_id == organization.stripe_customer_id
        assert persisted.stripe_checkout_id == organization.stripe_checkout_id
        assert persisted.stripe_payment_method_id is None
        assert persisted.invoice_due_at is None

        # Ignored events must not expand infrastructure quotas.
        assert persisted.database_size_mib == organization.database_size_mib
        assert persisted.storage_quota_bytes == organization.storage_quota_bytes


async def test_webhook_rejects_invalid_signature_without_registering_card(
    client: AsyncClient, card_organization: Organization, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject a correctly formed checkout event signed with the wrong secret."""

    # Arrange
    body, signature = signed_webhook(secret="whsec_attacker")
    previous_operations = await fetch_operations()
    reject_provider_construction(monkeypatch, (stripe_provider, "client"))

    # Act
    response = await client.post("/api/v1/stripe/webhook", content=body, headers={"stripe-signature": signature})

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid Stripe signature"}
    await assert_card_registration_unchanged(card_organization)
    await assert_no_new_operations(previous_operations)


async def test_webhook_rejects_signed_event_from_the_wrong_stripe_mode(
    client: AsyncClient, card_organization: Organization, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject a valid live-mode signature on a test-mode deployment."""

    # Arrange
    body, signature = signed_webhook(livemode=True)
    previous_operations = await fetch_operations()
    reject_provider_construction(monkeypatch, (stripe_provider, "client"))

    # Act
    response = await client.post("/api/v1/stripe/webhook", content=body, headers={"stripe-signature": signature})

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Stripe mode mismatch"}
    await assert_card_registration_unchanged(card_organization)
    await assert_no_new_operations(previous_operations)


WEBHOOK_SIZES = [(1024 * 1024, 400, "Invalid Stripe signature"), (1024 * 1024 + 1, 413, "Webhook too large")]


@pytest.mark.parametrize(("size", "status", "detail"), WEBHOOK_SIZES)
async def test_webhook_enforces_one_mebibyte_limit_before_signature_verification(
    size: int, status: int, detail: str, client: AsyncClient, card_organization: Organization, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Check the exact size boundary reaches verification, while oversized bodies do not."""

    # Arrange
    previous_operations = await fetch_operations()
    reject_provider_construction(monkeypatch, (stripe_provider, "client"))

    # Act
    response = await client.post("/api/v1/stripe/webhook", content=b"x" * size)

    # Assert
    assert response.status_code == status
    assert response.json() == {"detail": detail}
    await assert_card_registration_unchanged(card_organization)
    await assert_no_new_operations(previous_operations)
