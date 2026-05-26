import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authuser
from src.models import APIResponse
from src.models.apps import AppCreate, AppResponse
from src.models.users import UserSummary

router = APIRouter(prefix="/api/apps")


@router.get("")
async def list_apps(organization: str, user: db.User = Depends(authuser)) -> APIResponse[list[AppResponse]]:
    """Return the apps registered in one organization."""

    if all(org.name != organization for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    apps = await db.apps.list(organization, user.id)

    # Resolve audit users once so the payload can embed nested user objects.
    audit_names: set[str] = set()
    for app, _role_name in apps:
        for value in (app.created_by, app.updated_by, app.deleted_by):
            if value:
                audit_names.add(value)

    audit_users: dict[str, UserSummary] = {}
    for audit_name in audit_names:
        audit_user = await db.users.get_by_name(audit_name)
        if audit_user is not None:
            audit_users[audit_name] = UserSummary.model_validate(audit_user.model_dump())

    created_by_user = audit_users.get(user.name) or UserSummary.model_validate(user.model_dump())
    updated_by_user = created_by_user
    deleted_by_user = created_by_user

    return APIResponse(
        success=True,
        detail="Apps fetched",
        data=[
            AppResponse.model_validate(
                {
                    **app.model_dump(),
                    "role": role_name,
                    "created_by": audit_users.get(app.created_by) or created_by_user,
                    "updated_by": audit_users.get(app.updated_by) or updated_by_user,
                    "deleted_by": audit_users.get(app.deleted_by) or deleted_by_user,
                }
            )
            for app, role_name in apps
        ],
    )


@router.post("")
async def create_app(
    organization: str,
    payload: AppCreate,
    user: db.User = Depends(authuser),
) -> APIResponse[AppResponse]:
    """Register a new app in the database."""
    app_url = f"/api/apps/{payload.name}"

    try:
        app = await db.apps.create(
            organization,
            payload.name,
            url=app_url,
            image=payload.image,
            created_by=user.name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return APIResponse(
        success=True,
        detail="App created",
        data=AppResponse.model_validate(
            {
                **app.model_dump(),
                "created_by": UserSummary.model_validate(user.model_dump()),
                "updated_by": UserSummary.model_validate(user.model_dump()),
                "deleted_by": UserSummary.model_validate(user.model_dump()),
            }
        ),
    )


@router.delete("/{app_id}", status_code=204)
async def delete_app(organization: str, app_id: int) -> Response:
    """Delete an app registration."""

    try:
        await db.apps.delete(organization, app_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
