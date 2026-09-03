import pytest
from longlink.views import view_stem_route


@pytest.mark.parametrize(
    ("view_stem", "expected_route"),
    [
        pytest.param("index", "/", id="root-index"),
        pytest.param("admin/index", "/admin", id="nested-index"),
        pytest.param("issues/[issue]", "/issues/:issue", id="dynamic-segment"),
        pytest.param("settings/profile", "/settings/profile", id="nested-static-segments"),
    ],
)
def test_view_stem_route_converts_valid_view_paths(view_stem: str, expected_route: str) -> None:
    """Convert supported filesystem view names into exact browser routes."""

    # Act
    route = view_stem_route(view_stem)

    # Assert
    assert route == expected_route


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
