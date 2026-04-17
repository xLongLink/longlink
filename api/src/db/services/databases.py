from src.utils import database as database_utils
from src.models.databases import DatabaseOverviewMetric


class DatabasesService:
    """Service for database cluster metadata and overview metrics."""

    async def list_overview_metrics(self) -> list[DatabaseOverviewMetric]:
        """Return high-level database cluster metrics for settings UI."""
        return await database_utils.list_overview_metrics()
