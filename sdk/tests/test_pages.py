import pytest
from longlink.pages import page_stem_route


@pytest.mark.parametrize(
    ("page_stem", "expected_route"),
    [
        pytest.param("index", "/", id="root-index"),
        pytest.param("admin/index", "/admin", id="nested-index"),
        pytest.param("issues/[issue]", "/issues/:issue", id="dynamic-segment"),
        pytest.param("settings/profile", "/settings/profile", id="nested-static-segments"),
    ],
)
def test_page_stem_route_converts_valid_page_paths(page_stem: str, expected_route: str) -> None:
    """Convert supported filesystem page names into exact browser routes."""

    # Act
    route = page_stem_route(page_stem)

    # Assert
    assert route == expected_route


@pytest.mark.parametrize(
    ("page_stem", "message"),
    [
        pytest.param("", "include a file name", id="empty"),
        pytest.param("issues/[]", "cannot be empty", id="empty-parameter"),
        pytest.param("issues/[issue-id]", "valid identifier names", id="invalid-parameter"),
        pytest.param(":settings", "cannot contain route parameters", id="static-parameter"),
        pytest.param("issues/{id}", "cannot contain route parameters", id="brace-parameter"),
        pytest.param("files/*", "cannot contain route parameters", id="wildcard"),
    ],
)
def test_page_stem_route_rejects_invalid_route_segments(page_stem: str, message: str) -> None:
    """Reject filesystem page names that could create ambiguous browser routes."""

    with pytest.raises(ValueError, match=message):
        page_stem_route(page_stem)
