import pytest
from uuid import uuid4
from pydantic import ValidationError
from src.models.resources import OrganizationIdentity

pytestmark = pytest.mark.no_db


def test_resource_contract_rejects_unknown_lifecycle_state() -> None:
    """Prevent unsupported resource states from leaking into API responses."""

    # Arrange
    payload = {"id": uuid4(), "name": "Acme", "status": "deleted"}

    # Act / Assert
    with pytest.raises(ValidationError, match="status"):
        OrganizationIdentity.model_validate(payload)
