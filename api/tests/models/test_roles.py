import pytest
from fastapi import HTTPException
from src.utils import roles
from src.models.roles import PlatformRoles, ApplicationRoles, OrganizationRoles


@pytest.mark.parametrize(
    ("role_value", "expected_rank"),
    [
        (PlatformRoles.user, 1),
        (PlatformRoles.support, 2),
        (PlatformRoles.administrator, 3),
        (OrganizationRoles.read, 1),
        (OrganizationRoles.write, 2),
        (OrganizationRoles.maintain, 3),
        (OrganizationRoles.admin, 4),
        (OrganizationRoles.owner, 5),
        (ApplicationRoles.read, 1),
        (ApplicationRoles.write, 2),
        (ApplicationRoles.maintain, 3),
        (ApplicationRoles.admin, 4),
        (None, 0),
    ],
)
def test_role_rank_returns_scope_rank(role_value, expected_rank: int) -> None:
    """Return the configured numeric role rank for each role scope."""

    assert roles.rank(role_value) == expected_rank


def test_role_atleast_allows_roles_inside_scope() -> None:
    """Allow roles that satisfy the required scope rank."""

    assert roles.atleast(OrganizationRoles.admin, OrganizationRoles.maintain) is True
    assert roles.atleast(ApplicationRoles.admin, ApplicationRoles.maintain) is True
    assert roles.atleast(PlatformRoles.administrator, PlatformRoles.support) is True


def test_role_atleast_returns_false_without_raising() -> None:
    """Return false for insufficient roles when raising is disabled."""

    assert roles.atleast(ApplicationRoles.read, ApplicationRoles.maintain, False) is False


@pytest.mark.parametrize(
    ("role_value", "required_role"),
    [
        (None, OrganizationRoles.read),
        (OrganizationRoles.write, OrganizationRoles.maintain),
        (OrganizationRoles.owner, ApplicationRoles.admin),
        (PlatformRoles.administrator, OrganizationRoles.read),
    ],
)
def test_role_atleast_raises_for_insufficient_roles(role_value, required_role) -> None:
    """Raise a forbidden HTTP error when the role does not satisfy the requirement."""

    with pytest.raises(HTTPException) as exc:
        roles.atleast(role_value, required_role)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Permission required"
