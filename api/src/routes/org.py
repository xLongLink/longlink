import src.db as db
from src.router import router
from src.auth import user as get_user
from src.types import OrgCreate, OrgRead
from fastapi import Depends, HTTPException


@router.post('/org', response_model=OrgRead)
async def create_org(payload: OrgCreate, current_user: db.User = Depends(get_user)):
    org = await db.orgs.create(payload.name)
    await db.orgs.add(org.id, current_user.id, 'owner')
    await db.apps.create(org.id, payload.name)
    return OrgRead(
        id=org.id,
        name=org.name,
        date_creation=org.date_creation,
    )


@router.get('/org/{org_id}', response_model=OrgRead)
async def get_org(org_id: int, current_user: db.User = Depends(get_user)):
    org = await db.orgs.get(org_id)
    if org is None:
        raise HTTPException(404, 'Organization not found')
    return OrgRead(
        id=org.id,
        name=org.name,
        date_creation=org.date_creation,
    )
