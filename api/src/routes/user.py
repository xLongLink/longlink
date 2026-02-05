import src.db as db
from fastapi import Depends
from src.router import router
from src.types import OrgRead
from src.auth import user as get_user


@router.get('/user')
async def get_user_details(current_user: db.User = Depends(get_user)):
    return current_user


@router.get('/user/orgs', response_model=list[OrgRead])
async def get_user_orgs(current_user: db.User = Depends(get_user)):
    orgs = await db.orgs.list_by_user(current_user.id)
    return [
        OrgRead(
            id=org.id,
            name=org.name,
            date_creation=org.date_creation,
        )
        for org in orgs
    ]
