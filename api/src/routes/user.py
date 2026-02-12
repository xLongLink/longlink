import src.db as db
from fastapi import Depends
from src.auth import authuser
from src.types import OrgRead
from src.types import UserUpdate
from src.router import router


@router.get('/user')
async def get_user_details(user: db.User = Depends(authuser)):
    return user


@router.patch('/user')
async def patch_user_details( payload: UserUpdate, user: db.User = Depends(authuser)):
    params = payload.model_dump(exclude_unset=True)
    if not params:
        return user

    updated_user = await db.users.update(user.id, **params)
    return updated_user


@router.get('/user/orgs', response_model=list[OrgRead])
async def get_user_orgs(user: db.User = Depends(authuser)):
    orgs = await db.users.orgs(user.id)
    return [
        OrgRead(
            id=org.id,
            name=org.name,
            url=f'/{org.name}',
            country=org.country,
            crn=org.crn,
            vat=org.vat,
            date_creation=org.date_creation,
        )
        for org in orgs
    ]
