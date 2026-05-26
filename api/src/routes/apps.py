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
    app_payloads: list[AppResponse] = []

    # Build the response from the loaded audit relations instead of a name lookup.
    for app, role_name in apps:
        created_by = UserSummary.model_validate((app.created_by or user).model_dump())
        updated_by = UserSummary.model_validate((app.updated_by or app.created_by or user).model_dump())
        deleted_by = UserSummary.model_validate((app.deleted_by or app.updated_by or app.created_by or user).model_dump())

        app_payloads.append(
            AppResponse.model_validate(
                {
                    **app.model_dump(),
                    "created_by": created_by,
                    "updated_by": updated_by,
                    "deleted_by": deleted_by,
                    "role": role_name,
                }
            )
        )

    return APIResponse(
        success=True,
        detail="Apps fetched",
        data=app_payloads,
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
            user=user,
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
