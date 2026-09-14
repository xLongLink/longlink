from uuid import UUID
from sqlmodel import col
from sqlalchemy import update
from collections.abc import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.organizations import Organization


async def request_user_sync(session: AsyncSession, organization_ids: Sequence[UUID]) -> None:
    """Durably request shared-user projections in stable Organization order."""

    # Keep sleeping databases asleep while the caller's transaction records projection demand.
    for organization_id in sorted(organization_ids):
        await session.execute(
            update(Organization).where(col(Organization.id) == organization_id).values(database_sync_pending=True)
        )
