import pytest
from src.utils.roles import atleast
from src.models.roles import OrganizationRoles

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("value", "required_role", "expected"),
    [
        pytest.param(OrganizationRoles.read, OrganizationRoles.read, True, id="read-satisfies-read"),
        pytest.param(OrganizationRoles.write, OrganizationRoles.read, True, id="write-satisfies-read"),
        pytest.param(OrganizationRoles.maintain, OrganizationRoles.write, True, id="maintain-satisfies-write"),
        pytest.param(OrganizationRoles.admin, OrganizationRoles.maintain, True, id="admin-satisfies-maintain"),
        pytest.param(OrganizationRoles.owner, OrganizationRoles.admin, True, id="owner-satisfies-admin"),
        pytest.param(OrganizationRoles.read, OrganizationRoles.write, False, id="read-rejects-write"),
        pytest.param(OrganizationRoles.write, OrganizationRoles.maintain, False, id="write-rejects-maintain"),
        pytest.param(OrganizationRoles.maintain, OrganizationRoles.admin, False, id="maintain-rejects-admin"),
        pytest.param(OrganizationRoles.admin, OrganizationRoles.owner, False, id="admin-rejects-owner"),
    ],
)
def test_atleast_enforces_organization_role_hierarchy(
    value: OrganizationRoles,
    required_role: OrganizationRoles,
    expected: bool,
) -> None:
    """Authorize only organization roles at or above the requested privilege."""

    # Assert
    assert atleast(value, required_role) is expected
