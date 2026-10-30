from src import auth
from uuid import UUID
from fastapi import APIRouter
from src.models.tags import SolutionTagsWrite, OrganizationTagMove, OrganizationTagWrite, OrganizationTagResponse
from src.database.services import tags

router = APIRouter()


@router.get("/organizations/{organization_id}/tags", response_model=list[OrganizationTagResponse])
async def get_tags(session: auth.Session, membership: auth.OrganizationMember):
    """List categories visible to every Organization member."""

    return await tags.fetch(session, membership.organization_id)


@router.post("/organizations/{organization_id}/tags", response_model=OrganizationTagResponse, status_code=201)
async def create_tag(session: auth.Session, payload: OrganizationTagWrite, membership: auth.OrganizationMaintainer):
    """Create a shared category without deploying any Solutions."""

    tag = await tags.save(session, membership.organization_id, membership.user_id, payload)
    await session.commit()
    return tag


@router.patch("/organizations/{organization_id}/tags/{tag_id}", response_model=OrganizationTagResponse)
async def update_tag(session: auth.Session, tag_id: UUID, payload: OrganizationTagWrite, membership: auth.OrganizationMaintainer):
    """Update a category's name and icon while preserving its assignments."""

    tag = await tags.save(session, membership.organization_id, membership.user_id, payload, tag_id)
    await session.commit()
    return tag


@router.delete("/organizations/{organization_id}/tags/{tag_id}", status_code=204)
async def delete_tag(session: auth.Session, tag_id: UUID, membership: auth.OrganizationMaintainer):
    """Remove only the category and its assignments."""

    await tags.remove(session, membership.organization_id, membership.user_id, tag_id)
    await session.commit()


@router.post("/organizations/{organization_id}/tags/{tag_id}/move", status_code=204)
async def move_tag(session: auth.Session, tag_id: UUID, payload: OrganizationTagMove, membership: auth.OrganizationMaintainer):
    """Persist a one-place tab move without changing its contents."""

    await tags.move(session, membership.organization_id, membership.user_id, tag_id, payload.direction)
    await session.commit()


@router.patch("/organizations/{organization_id}/solutions/{solution_id}/tags", status_code=204)
async def assign_tags(session: auth.Session, solution_id: UUID, payload: SolutionTagsWrite, membership: auth.OrganizationMaintainer):
    """Replace a Solution's shared categories atomically."""

    await tags.assign(session, membership.organization_id, membership.user_id, solution_id, payload.tag_ids)
    await session.commit()
