from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import BigInteger, UniqueConstraint
from src.database.models.base import PlatformModel


class Invoice(PlatformModel, table=True):
    """Retain one Organization's month-end billing snapshot before contacting Stripe."""

    __tablename__: ClassVar[str] = "invoices"
    __table_args__ = (UniqueConstraint("organization_id", "period_end", name="uq_invoices_organization_period"),)

    # Identity and retained Stripe accounting references
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    customer_id: str = Field(max_length=255)
    organization_id: UUID | None = Field(default=None, foreign_key="organizations.id", ondelete="SET NULL", index=True)
    stripe_invoice_id: str | None = Field(default=None, max_length=255, unique=True)

    # Billing period and issuance timestamp
    issued_at: datetime | None = None
    period_end: datetime

    # Frozen allocation pricing version
    pricing_version: int = Field(default=3, ge=1)

    # Month-end organization allocation
    ram_bytes: int = Field(default=0, ge=0, sa_type=BigInteger)
    cpu_millicores: int = Field(default=0, ge=0)
    storage_bytes: int = Field(ge=0, sa_type=BigInteger)

    # Retained legacy metered usage
    users: int = Field(default=0, ge=0)
    database_bytes: int = Field(default=0, ge=0, sa_type=BigInteger)
