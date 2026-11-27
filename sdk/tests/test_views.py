import pytest
from uuid import UUID
from pathlib import Path
from longlink import User, LongLink, identity
from longlink.views import view_stem_route
from longlink.testclient import TestClient


def test_view_stem_route_preserves_nested_index_parent() -> None:
    """Preserve the parent route when stripping a nested index segment."""

    # Act
    route = view_stem_route("admin/index")

    # Assert
    assert route == "/admin"


@pytest.mark.parametrize(
    ("view_stem", "message"),
    [
        pytest.param("", "include a file name", id="empty"),
        pytest.param("issues/[]", "cannot be empty", id="empty-parameter"),
        pytest.param("issues/[issue-id]", "valid identifier names", id="invalid-parameter"),
        pytest.param(":settings", "cannot contain route parameters", id="static-parameter"),
        pytest.param("issues/{id}", "cannot contain route parameters", id="brace-parameter"),
        pytest.param("files/*", "cannot contain route parameters", id="wildcard"),
        # File routes cannot hide separators through encoding or platform-specific syntax.
        pytest.param("encoded%2Fsegment", "URL-safe file names", id="percent-encoding"),
        pytest.param("admin\\settings", "URL-safe file names", id="backslash"),
        pytest.param("search?tab", "URL-safe file names", id="query"),
        pytest.param("section#anchor", "URL-safe file names", id="fragment"),
        pytest.param("admin//settings", "URL-safe file names", id="empty-segment"),
        pytest.param("admin/.", "URL-safe file names", id="current-directory"),
        pytest.param("admin/..", "URL-safe file names", id="parent-directory"),
    ],
)
def test_view_stem_route_rejects_invalid_route_segments(view_stem: str, message: str) -> None:
    """Reject filesystem view names that could create ambiguous browser routes."""

    with pytest.raises(ValueError, match=message):
        view_stem_route(view_stem)


def test_view_width_is_published_per_registered_view(solution_source: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Carry per-View widths through the actual manifest response without widening other pages."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    for name in ("dashboard", "settings"):
        (solution_source / "views" / f"{name}.jsx").write_text("export default function Page() { return <Text>Content</Text>; }")
    app = LongLink()
    app.include_view("dashboard.jsx", width="wide")
    app.include_view("settings.jsx")
    client = TestClient(app)

    # Act
    with client:
        response = client.get("/views.json")

    # Assert
    assert response.status_code == 200
    definitions = {view["route"]: view for view in response.json()["views"]}
    assert definitions["/dashboard"]["width"] == "wide"
    assert definitions["/settings"]["width"] == "compact"


@pytest.mark.parametrize(
    ("role", "member", "trusted", "expected"),
    [
        ("reviewer", True, True, "reviewer"),
        ("read", True, True, "read"),
        (None, True, True, None),
        ("unknown", True, True, "unknown"),
        ("reviewer", False, True, None),
        ("write", True, False, None),
    ],
)
def test_manifest_role_is_request_specific_and_does_not_grant_access(
    solution_source: Path, monkeypatch: pytest.MonkeyPatch, role: str | None, member: bool, trusted: bool, expected: str | None
) -> None:
    """Expose only signed roles without changing endpoint grants or later requests."""

    # Arrange
    secret = "test-identity-secret-01234567890"
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    monkeypatch.setenv("LONGLINK_IDENTITY_SECRET", secret)
    app = LongLink()

    @app.post("/protected", response_model=int, roles=["reviewer", "write"])
    async def protected() -> int:
        """Represent an operation requiring explicit endpoint grants."""

        return 1

    user = User(id=UUID(int=1), name="Reviewer", email="reviewer@example.com") if member else None
    client = TestClient(app)

    # Act
    with client:
        catalog = app.state.permission_catalog
        token = identity.create_identity_token(
            user, secret if trusted else "forged-identity-secret-01234567890", catalog.access("unknown"), role=role
        )
        response = client.get("/views.json", headers={"x-longlink-identity": token, "x-longlink-role": "write"})
        rejected = client.post("/protected", headers={"x-longlink-identity": token}) if trusted else None
        subsequent = client.get("/views.json")

    # Assert
    assert response.status_code == 200
    assert response.json().get("role") == expected
    assert response.headers["cache-control"] == "no-store"
    assert subsequent.json().get("role") is None
    if rejected is not None:
        assert rejected.status_code == 403
