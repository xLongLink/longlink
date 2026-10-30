from datetime import datetime
from pydantic import Field, HttpUrl, BaseModel


class PaymentRedirect(BaseModel):
    """Return a hosted Stripe card-registration URL."""

    # Navigation
    url: HttpUrl


class PaymentCard(BaseModel):
    """Expose only the saved card details needed to identify it."""

    # Identity and masked card details
    id: str
    brand: str
    last4: str = Field(pattern=r"^[0-9]{4}$")
    exp_year: int
    exp_month: int = Field(ge=1, le=12)
    is_default: bool


class PaymentInvoice(BaseModel):
    """Expose issued Stripe invoices without customer or payment-method identifiers."""

    # Invoice details
    id: str
    total: int
    number: str | None
    status: str | None
    currency: str = Field(pattern=r"^[a-z]{3}$")
    created_at: datetime

    # Documents
    has_pdf: bool
    hosted_invoice_url: HttpUrl | None
