import pytest
from uuid import uuid4
from src.models.resources import OrganizationSolutionSummary

pytestmark = pytest.mark.no_db


def test_solution_summary_keeps_observed_version_separate_from_desired_release() -> None:
    """Represent a queued upgrade without presenting its version as deployed."""

    # Arrange
    desired_revision = uuid4()
    payload = {
        "id": uuid4(),
        "name": "Dashboard",
        "status": "running",
        "deployment_pending": True,
        "desired_revision_id": desired_revision,
        "deployed_version": "1.0.0",
    }

    # Act
    summary = OrganizationSolutionSummary.model_validate(payload)

    # Assert
    response = summary.model_dump(mode="json")
    assert response["deployment_pending"] is True
    assert response["desired_revision_id"] == str(desired_revision)
    assert response["deployed_version"] == "1.0.0"
