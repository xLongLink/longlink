import src.db as db
from fastapi import Depends, HTTPException, Query
from src.auth import user as get_user
from src.router import router
from src.types import OrgCreate, OrgRead


@router.post('/org', response_model=OrgRead)
async def create_org(payload: OrgCreate, current_user: db.User = Depends(get_user)):
    """Create a new organization, the user creating it will be the owner of the organization."""
    org = await db.orgs.create(
        payload.name,
        payload.country,
        payload.crn,
        payload.vat,
    )
    await db.orgs.add(org.id, current_user.id, db.OrgRole.owner)
    return OrgRead(
        id=org.id,
        name=org.name,
        url=f'/{org.name}',
        country=org.country,
        crn=org.crn,
        vat=org.vat,
        date_creation=org.date_creation,
    )


@router.get('/org/{org_name}', response_model=OrgRead)
async def get_org(
    org_name: str,
    current_user: db.User = Depends(get_user),
    country: str | None = Query(default=None),
):
    """Get an organization by its name, optionally scoped by country."""
    org = await db.orgs.get_by_name(org_name, country=country)
    if org is None:
        raise HTTPException(404, 'Organization not found')
    return OrgRead(
        id=org.id,
        name=org.name,
        url=f'/{org.name}',
        country=org.country,
        crn=org.crn,
        vat=org.vat,
        date_creation=org.date_creation,
    )
