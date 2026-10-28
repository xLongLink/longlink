from decimal import Decimal
from pydantic import BaseModel

# Included monthly usage and rates in CHF centimes.
FREE_USERS = 5
FREE_DATABASE_BYTES = 100 * 1024**2
FREE_STORAGE_BYTES = 1024**3
USER_MONTHLY_PRICE = 1000
DATABASE_MIB_MONTHLY_PRICE = Decimal("0.1")
STORAGE_MIB_MONTHLY_PRICE = Decimal("0.02")

# Provisioned capacity after a payment method is registered, independent of pricing allowances.
REGISTERED_DATABASE_SIZE_MIB = 25 * 1024
REGISTERED_STORAGE_QUOTA_BYTES = 100 * 1024**3


class UsageRates(BaseModel):
    """Describe included usage and month-end prices in CHF centimes."""

    # Included usage
    free_users: int = FREE_USERS
    free_storage_bytes: int = FREE_STORAGE_BYTES
    free_database_bytes: int = FREE_DATABASE_BYTES

    # Monthly prices
    user_monthly_price: int = USER_MONTHLY_PRICE
    storage_mib_monthly_price: Decimal = STORAGE_MIB_MONTHLY_PRICE
    database_mib_monthly_price: Decimal = DATABASE_MIB_MONTHLY_PRICE
