from longlink.pages import page_file_route


def test_index_page_uses_root_route() -> None:
    """Map the root index page to an empty browser route."""

    assert page_file_route("index.xml") == ""
