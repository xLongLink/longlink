import pytest
from pydantic import ValidationError
from src.models.organizations import OrganizationByteUsage, OrganizationUsageUpdate

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize("field", ["space_used", "quota_bytes"])
def test_usage_rejects_negative_bytes(field: str) -> None:
    """Do not publish impossible resource usage or capacity."""

    # Arrange
    payload = {"space_used": 0, "quota_bytes": 0, field: -1}

    # Act / Assert
    with pytest.raises(ValidationError, match=field):
        OrganizationByteUsage.model_validate(payload)


def test_capacity_price_limit_uses_gib_and_rounds_each_line() -> None:
    """Accept the largest RAM allocation below Stripe's rounded CHF amount limit."""

    # Arrange
    payload = {
        "compute_cpu_millicores": 250,
        "compute_ram_bytes": 214_747_285_689_466 - 256 * 1024**2,
        "storage_bytes": 1024**3,
        "database_cpu_millicores": 250,
        "database_ram_bytes": 256 * 1024**2,
        "database_storage_bytes": 1024**3,
    }

    # Act
    capacity = OrganizationUsageUpdate.model_validate(payload)

    # Assert
    assert capacity.compute_ram_bytes == payload["compute_ram_bytes"]

    # Act / Assert
    with pytest.raises(ValidationError, match="Monthly capacity price exceeds"):
        OrganizationUsageUpdate.model_validate({**payload, "compute_ram_bytes": payload["compute_ram_bytes"] + 1})
