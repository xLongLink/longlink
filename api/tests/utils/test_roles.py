import pytest
from src.utils import roles
from src.models.roles import OrganizationRoles

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("role_value", "expected_rank"),
    [
        (OrganizationRoles.read, 1),
        (OrganizationRoles.write, 2),
        (OrganizationRoles.maintain, 3),
        (OrganizationRoles.admin, 4),
        (OrganizationRoles.owner, 5),
        (None, 0),
    ],
)
def test_role_rank_returns_scope_rank(role_value, expected_rank: int) -> None:
    """Return the configured numeric Organization role rank."""

    assert roles.rank(role_value) == expected_rank


def test_role_atleast_allows_roles_inside_scope() -> None:
    """Allow roles that satisfy the required scope rank."""

    assert roles.atleast(OrganizationRoles.admin, OrganizationRoles.maintain) is True


@pytest.mark.parametrize(
    ("role_value", "required_role"),
    [
        (None, OrganizationRoles.read),
        (OrganizationRoles.write, OrganizationRoles.maintain),
    ],
)
def test_role_atleast_rejects_insufficient_roles(role_value, required_role) -> None:
    """Return false when the role does not satisfy the requirement."""

    assert roles.atleast(role_value, required_role) is False
