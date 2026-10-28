from uuid import UUID
from typing import Literal
from fastapi import HTTPException
from sqlmodel import col
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from collections.abc import Sequence
from src.models.tags import TagIcon, TagKind
from src.models.roles import OrganizationRoles
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.tags import SolutionTag, OrganizationTag
from src.database.models.solutions import Solution


async def fetch(session: AsyncSession, organization_id: UUID) -> Sequence[OrganizationTag]:
    """List categories in their saved navigation order."""

    # Keep navigation stable even if two imported rows share a position.
    result = await session.scalars(
        select(OrganizationTag)
        .where(col(OrganizationTag.organization_id) == organization_id)
        .order_by(col(OrganizationTag.position), col(OrganizationTag.id))
    )
    return result.all()


async def lock(session: AsyncSession, organization_id: UUID, user_id: UUID) -> None:
    """Serialize category commands with Organization deletion and access changes."""

    # Recheck current membership only after taking the Organization lock.
    organization = await organizations.lock(session, organization_id)
    if organization.deleted_at is not None:
        raise HTTPException(status_code=403, detail="Access required")
    await organizations.locked_membership(session, user_id, organization_id, OrganizationRoles.maintain)


async def save(
    session: AsyncSession, organization_id: UUID, user_id: UUID, name: str, icon: TagIcon, tag_id: UUID | None = None
) -> OrganizationTag:
    """Create or edit a category under its Organization lock."""

    # Scope both name uniqueness and identity to the authorized Organization.
    await lock(session, organization_id, user_id)
    tag = await session.get(OrganizationTag, tag_id) if tag_id is not None else None
    if tag_id is not None and (tag is None or tag.organization_id != organization_id):
        raise HTTPException(status_code=404, detail="Tag not found")

    # Reject case-insensitive duplicates, including Unicode names.
    existing = await fetch(session, organization_id)
    if any(item.id != tag_id and item.name.casefold() == name.casefold() for item in existing):
        raise HTTPException(status_code=409, detail="Tag already exists")

    # Preserve assignments and translate backend-specific collation conflicts.
    try:
        async with session.begin_nested():

            # New tags belong to the locked Organization.
            if tag is None:
                tag = OrganizationTag(
                    organization_id=organization_id,
                    name=name,
                    icon=icon,
                    position=max((item.position for item in existing), default=-1) + 1,
                )

                # Publish new tag metadata within the savepoint.
                session.add(tag)
            else:
                tag.name = name
                tag.icon = icon
            await session.flush()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Tag already exists")
    return tag


async def move(session: AsyncSession, organization_id: UUID, user_id: UUID, tag_id: UUID, direction: Literal["up", "down"]) -> None:
    """Move one tab relative to the current order under the Organization lock."""

    # Resolve the target only within the caller's serialized Organization state.
    await lock(session, organization_id, user_id)
    ordered = list(await fetch(session, organization_id))
    index = next((index for index, tag in enumerate(ordered) if tag.id == tag_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Moving beyond either edge is a harmless no-op.
    destination = index - 1 if direction == "up" else index + 1
    if destination < 0 or destination >= len(ordered):
        return

    # Normalize positions after the swap, including gaps left by deleted tabs.
    ordered[index], ordered[destination] = ordered[destination], ordered[index]
    for position, tag in enumerate(ordered):
        tag.position = position


async def remove(session: AsyncSession, organization_id: UUID, user_id: UUID, tag_id: UUID) -> None:
    """Delete a category and its assignments, never its Solutions."""

    # Serialize with assignment replacement so deleted tags cannot be reassigned.
    await lock(session, organization_id, user_id)
    tag = await session.get(OrganizationTag, tag_id)
    if tag is None or tag.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Tag not found")
    await session.delete(tag)


async def assign(session: AsyncSession, organization_id: UUID, user_id: UUID, solution_id: UUID, tag_ids: Sequence[UUID]) -> None:
    """Replace all tags without changing a Solution's deployment state."""

    # Lock the Organization before resolving the active Solution and its categories.
    await lock(session, organization_id, user_id)
    active_solution_id = await session.scalar(
        select(col(Solution.id)).where(
            col(Solution.id) == solution_id, col(Solution.organization_id) == organization_id, col(Solution.deleted_at).is_(None)
        )
    )
    if active_solution_id is None:
        raise HTTPException(status_code=404, detail="Solution not found")

    # Validate every identity before removing any previous assignment.
    unique_ids = set(tag_ids)
    if unique_ids:
        result = await session.scalars(
            select(col(OrganizationTag.id)).where(
                col(OrganizationTag.organization_id) == organization_id,
                col(OrganizationTag.kind) == TagKind.tag,
                col(OrganizationTag.id).in_(unique_ids),
            )
        )

        # Every requested identifier must resolve within this Organization.
        if set(result.all()) != unique_ids:
            raise HTTPException(status_code=404, detail="Tag not found")

    # Replace the set atomically in the caller's transaction.
    await session.execute(
        delete(SolutionTag).where(col(SolutionTag.organization_id) == organization_id, col(SolutionTag.solution_id) == solution_id)
    )
    session.add_all(SolutionTag(organization_id=organization_id, solution_id=solution_id, tag_id=tag_id) for tag_id in unique_ids)
