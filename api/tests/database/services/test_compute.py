from factories import create_compute
from src.database.session import session_scope
from src.database.services import compute
from src.models.pagination import Pagination
from src.database.models.computes import ComputeRegistry


async def test_compute_search_treats_sql_wildcards_as_literal_characters() -> None:
    """Keep percent signs from broadening administrator searches."""

    # Arrange
    matching = await create_compute()
    await create_compute()
    async with session_scope() as session:
        row = await session.get(ComputeRegistry, matching.id)
        assert row is not None
        row.name = "100% dedicated"
        await session.commit()

    # Act
    async with session_scope() as session:
        items, total = await compute.fetch(session, Pagination(page_size=1), search="%")

    # Assert
    assert [item.id for item in items] == [matching.id]
    assert total == 1
