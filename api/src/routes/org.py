from fastapi import Depends, HTTPException
from src.auth import user as get_user
from src.db import add_org, add_org_member, get_org_by_id, User
from src.router import router
from src.types import OrgCreate, OrgRead


@router.post("/org", response_model=OrgRead)
async def create_org(payload: OrgCreate, current_user: User = Depends(get_user)):
    org = await add_org(payload.name)
    await add_org_member(org.id, current_user.id, "owner")
    return OrgRead(
        id=org.id,
        name=org.name,
        date_creation=org.date_creation,
    )


@router.get("/org/{org_id}", response_model=OrgRead)
async def get_org(org_id: int, current_user: User = Depends(get_user)):
    org = await get_org_by_id(org_id)
    if org is None:
        raise HTTPException(404, "Organization not found")
    return OrgRead(
        id=org.id,
        name=org.name,
        date_creation=org.date_creation,
    )

