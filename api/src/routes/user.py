import src.db as db
from fastapi import Depends
from src.auth import user
from src.types import OrgRead
from src.types import UserUpdate
from src.router import router


@router.get('/user')
async def get_user_details(current_user: db.User = Depends(user)):
    return current_user


@router.patch('/user')
async def patch_user_details(
    payload: UserUpdate,
    current_user: db.User = Depends(user),
):
    params = payload.model_dump(exclude_unset=True)
    if not params:
        return current_user

    updated_user = await db.users.update(current_user.id, **params)
    return updated_user


@router.get('/user/orgs', response_model=list[OrgRead])
async def get_user_orgs(current_user: db.User = Depends(user)):
    orgs = await db.users.orgs(current_user.id)
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
