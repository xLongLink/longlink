from uuid import UUID
from sqlmodel import col
from sqlalchemy import select
from src.database.session import session_scope
from src.adapters.storage.s3 import S3
from src.database.models.solutions import Solution


async def authorize(storage: S3, bucket: str, organization: UUID) -> None:
    """Reconcile bucket policy from persisted live identities in the serial operation worker."""

    # Include only provisioned identities so RGW can resolve every named policy principal.
    async with session_scope() as session:
        result = await session.scalars(
            select(Solution).where(col(Solution.organization_id) == organization, col(Solution.deleted_at).is_(None))
        )
        identities = [solution.id for solution in result.all() if "LONGLINK_STORAGE_USERNAME" in solution.secrets]
    await storage.authorize(bucket, identities)
