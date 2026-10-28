import stripe
import asyncio
import contextlib
from fastapi import HTTPException
from collections.abc import AsyncGenerator
from src.environments import env


@contextlib.asynccontextmanager
async def client() -> AsyncGenerator[stripe.StripeClient]:
    """Own a bounded Stripe transport without modifying global SDK state."""

    # Unconfigured deployments cannot create customers or issue invoices.
    if not env.stripe_enabled or env.STRIPE_SECRET_KEY is None:
        raise HTTPException(status_code=503, detail="Stripe is not configured on this deployment")
    transport = stripe.HTTPXClient(timeout=10)
    connection = stripe.StripeClient(env.STRIPE_SECRET_KEY, http_client=transport, max_network_retries=2)

    # Retries remain bounded and shutdown cancellation releases the transport.
    try:
        async with asyncio.timeout(60):
            yield connection
    except (stripe.StripeError, TimeoutError):
        raise HTTPException(status_code=503, detail="Payment provider unavailable. Please try again.") from None

    # Close the provider transport even after cancellation or an API error.
    finally:
        await transport.close_async()
