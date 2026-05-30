import httpx
import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from src.auth import authuser
from src.models import APIResponse
from src.models.apps import AppCreate, AppResponse
from src.models.users import UserSummary
from src.utils.utils import normalize
from urllib.parse import urlparse

router = APIRouter(prefix="/api/apps")

APP_SERVICE_PORT = 80

HOP_BY_HOP_HEADERS = {
    "connection",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


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


@router.api_route("/{app_id}/proxy", methods=["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"])
@router.api_route("/{app_id}/proxy/{path:path}", methods=["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"])
async def proxy_app_request(app_id: int, request: Request, path: str = "", user: db.User = Depends(authuser)) -> Response:
    """Proxy one request into the deployed application service."""

    app = await db.apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")

    if all(org.name != app.organization for org in user.orgs):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{app.organization}' not found")

    registries = await db.compute.list()
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    registry = registries[0]
    ingress_url = normalize(registry.ingress_host)
    ingress_host = urlparse(ingress_url).hostname or ""
    verify_tls = ingress_host not in {"localhost", "127.0.0.1", "::1"}

    upstream_path = f"/{path.lstrip('/')}" if path else "/"
    upstream_url = (
        f"/api/v1/namespaces/{app.organization}/services/{app.name}:{APP_SERVICE_PORT}/proxy/"
        f"{upstream_path.lstrip('/')}"
    )
    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }

    async with httpx.AsyncClient(
        base_url=ingress_url,
        verify=verify_tls,
    ) as api_client:
        upstream_response = await api_client.request(
            request.method,
            upstream_url,
            params=list(request.query_params.multi_items()),
            headers=forward_headers,
            content=await request.body(),
        )

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers={
            key: value
            for key, value in upstream_response.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length"
        },
    )
