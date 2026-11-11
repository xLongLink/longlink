import pytest
from sqlmodel import SQLModel
from src.database import models

pytestmark = pytest.mark.no_db


def test_platform_metadata_is_isolated_from_solution_metadata() -> None:
    """Keep Platform models separate from a Solution's own schema."""

    # Assert
    assert models.metadata is not SQLModel.metadata
