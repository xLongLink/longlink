from decimal import ROUND_HALF_UP, Decimal

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


def allocation_amounts(
    cpu_millicores: int, ram_bytes: int, storage_bytes: int, *, byte_unit: int = GIB_BYTES
) -> tuple[Decimal, Decimal, Decimal]:
    """Price aggregate allocations, rounding each resource to CHF centimes."""

    # Round after combining pools, not after pricing each pool separately.
    cpu = (Decimal(cpu_millicores) * CPU_MONTHLY_PRICE / 1000).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    ram = (Decimal(ram_bytes) * RAM_GIB_MONTHLY_PRICE / byte_unit).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    storage = (Decimal(storage_bytes) * STORAGE_GIB_MONTHLY_PRICE / byte_unit).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return cpu, ram, storage
