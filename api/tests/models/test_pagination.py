import pytest
from src.models.pagination import Pagination

pytestmark = pytest.mark.no_db


def test_pagination_computes_zero_based_offset() -> None:
    """Translate one-based API page numbers into query offsets."""

    # Act
    pagination = Pagination(page=3, page_size=100)

    # Assert
    assert pagination.offset == 200
