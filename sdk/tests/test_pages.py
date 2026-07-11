from longlink.pages import (page_file_tab, page_file_route,
                            normalize_page_path, extract_longlink_metadata)


def test_page_metadata_helpers() -> None:
    """Normalize page routes and parse page navigation metadata."""

    assert normalize_page_path("pages/dashboard.xml") == "/pages/dashboard.xml"
    assert page_file_route("index.xml") == ""
    assert page_file_route("issues/[issue].xml") == "issues/:issue"
    assert page_file_route("issues/[issue]/comments.xml") == "issues/:issue/comments"
    assert page_file_tab("admin/users.xml") == "admin/users"
    assert page_file_tab("issues/[issue].xml") == "issues"
    assert page_file_tab("[issue].xml") == "issue"
    assert extract_longlink_metadata(
        '<longlink name=" Dashboard " icon=" layout-dashboard "><P i18n="dashboard.title" /></longlink>'
    ) == ("Dashboard", "layout-dashboard")
    assert extract_longlink_metadata("<unknown />") == (None, None)
