import pytest
from src.models.roles import role, ApplicationRoles, OrganizationRoles, PlatformRoles


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
        ("read", 1),
        ("write", 2),
        ("maintain", 3),
        ("admin", 4),
        ("owner", 5),
        (None, 0),
    ],
)
def test_role_rank_returns_scope_rank(role_value, expected_rank: int) -> None:
    """Return the configured numeric role rank for each role scope."""

    assert role.rank(role_value) == expected_rank


def test_role_atleast_compares_only_inside_scope() -> None:
    """Compare ranks only when the current and required roles share one scope."""

    assert role.atleast(OrganizationRoles.admin, OrganizationRoles.maintain) is True
    assert role.atleast(OrganizationRoles.write, OrganizationRoles.maintain) is False
    assert role.atleast(ApplicationRoles.admin, ApplicationRoles.maintain) is True
    assert role.atleast(PlatformRoles.administrator, PlatformRoles.support) is True
    assert role.atleast(OrganizationRoles.owner, ApplicationRoles.admin) is False
    assert role.atleast(PlatformRoles.administrator, OrganizationRoles.read) is False


def test_role_atleast_supports_runtime_strings() -> None:
    """Compare runtime role strings for proxy and SDK method checks."""

    assert role.atleast("owner", "maintain") is True
    assert role.atleast("read", "write") is False



def test_role_rank_rejects_unknown_runtime_roles() -> None:
    """Reject unknown runtime role strings instead of treating them as rank zero."""

    with pytest.raises(ValueError, match="Unknown role 'unknown'"):
        role.rank("unknown")
