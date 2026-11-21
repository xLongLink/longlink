from decimal import Decimal

# Monthly organization allocation prices in CHF centimes.
GIB_BYTES = 1024**3
CPU_MONTHLY_PRICE = Decimal("1000")
RAM_GIB_MONTHLY_PRICE = Decimal("500")
STORAGE_GIB_MONTHLY_PRICE = Decimal("1")

# Independent starter allocations exclude platform overhead.
DEFAULT_COMPUTE_CPU_MILLICORES = 250
DEFAULT_COMPUTE_RAM_BYTES = 256 * 1024**2
DEFAULT_STORAGE_BYTES = GIB_BYTES
DEFAULT_DATABASE_CPU_MILLICORES = 250
DEFAULT_DATABASE_RAM_BYTES = 256 * 1024**2
DEFAULT_DATABASE_STORAGE_BYTES = GIB_BYTES

# Retained decimal allocation unit for version 2 invoices.
GB_BYTES = 1_000_000_000

# Retained legacy invoice allowances and prices in CHF centimes.
FREE_USERS = 5
FREE_DATABASE_BYTES = 100 * 1024**2
FREE_STORAGE_BYTES = 1024**3
USER_MONTHLY_PRICE = 1000
DATABASE_MIB_MONTHLY_PRICE = Decimal("0.1")
STORAGE_MIB_MONTHLY_PRICE = Decimal("0.02")
