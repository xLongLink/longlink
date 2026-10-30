import pytest
from pydantic import ValidationError
from src.models.organizations import OrganizationByteUsage

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize("field", ["space_used", "quota_bytes"])
def test_usage_rejects_negative_bytes(field: str) -> None:
    """Do not publish impossible resource usage or capacity."""

    # Arrange
    payload = {"space_used": 0, "quota_bytes": 0, field: -1}

    # Act / Assert
    with pytest.raises(ValidationError, match=field):
        OrganizationByteUsage.model_validate(payload)
