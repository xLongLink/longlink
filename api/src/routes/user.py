import src.db as db
from fastapi import Depends
from src.auth import user
from src.types import OrgRead
from src.router import router


@router.get('/user')
async def get_user_details(current_user: db.User = Depends(user)):
    return current_user


@router.get('/user/orgs', response_model=list[OrgRead])
async def get_user_orgs(current_user: db.User = Depends(user)):
    orgs = await db.users.orgs(current_user.id)
    return [
        OrgRead(
            id=org.id,
            name=org.name,
            date_creation=org.date_creation,
        )
        for org in orgs
    ]
