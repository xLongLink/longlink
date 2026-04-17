from src.utils import url


def test_normalize_adds_https_for_non_localhost():
    """URL helper should add https scheme for non-local addresses."""
    assert url.normalize("example.com/api") == "https://example.com/api"
