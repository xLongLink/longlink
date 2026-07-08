import pytest
from uuid import UUID
from fastapi import HTTPException
from longlink.auth import CurrentUser, has_minimum_role, require_role, role_rank


@pytest.mark.parametrize(
    ("role", "expected_rank"),
    [
        ("read", 1),
        ("write", 2),
        ("maintain", 3),
        ("admin", 4),
        ("owner", 5),
        (None, 0),
    ],
)
def test_role_rank_returns_runtime_rank(role: str | None, expected_rank: int) -> None:
    """Return the configured numeric SDK runtime role rank."""

    assert role_rank(role) == expected_rank


def test_has_minimum_role_compares_runtime_roles() -> None:
    """Compare runtime roles by their configured rank."""

    assert has_minimum_role("admin", "maintain") is True
    assert has_minimum_role("read", "write") is False


def test_require_role_uses_minimum_role_comparison() -> None:
    """Allow stronger roles and reject weaker roles for SDK route guards."""

    user = CurrentUser(id=UUID("00000000-0000-0000-0000-000000000001"), name="Admin", role="admin")

    require_role(user, "maintain")

    with pytest.raises(HTTPException) as exc:
        require_role(user, "owner")

    assert exc.value.status_code == 403
    assert exc.value.detail == "Owner access required"
