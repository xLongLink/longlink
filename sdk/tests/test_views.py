import pytest
from longlink.views import view_stem_route


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
