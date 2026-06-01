import base64
import json
import httpx
import os
import tempfile
import yaml
import src.db as db
import docker
from fastapi import (Depends, Request, Response, APIRouter, HTTPException,
                      status)
from src.auth import authuser, authadmin
from src.adapters.database import Postgre
from src.models.apps import AppCreate, AppResponse
from src.utils.utils import knames, slugify
from src.adapters.compute.k8s import K8s

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


def inspect_image_specs(image: str) -> dict[str, object] | None:
    """Inspect a built image and return LongLink labels if available."""

    try:
        client = docker.from_env()
        inspect_data = client.images.get(image).attrs
    except docker.errors.DockerException:
        return None

    labels = inspect_data.get("Config", {}).get("Labels") or {}
    if not isinstance(labels, dict):
        return None

    env_spec = labels.get("longlink.env.spec")
    inspected: dict[str, object] = {
        "name": labels.get("longlink.name"),
        "version": labels.get("longlink.version"),
        "description": labels.get("longlink.description"),
    }

    if env_spec is not None:
        try:
            inspected["env_spec"] = json.loads(env_spec)
        except json.JSONDecodeError:
            return None

    return {key: value for key, value in inspected.items() if value is not None}


@router.get("", response_model=list[AppResponse])
async def list_apps(organization: str, user: db.User = Depends(authuser)) -> list[AppResponse]:
    """Return the apps registered in one organization."""

    org_names = {org.name for org in user.orgs}
    if organization not in org_names:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    apps = await db.apps.list(organization, user.id)
    app_payloads: list[dict[str, object]] = []

    for app, role_name in apps:
        app_payload = {
            **app.model_dump(),
            "created_by": app.created_by or user,
            "updated_by": app.updated_by or app.created_by or user,
            "deleted_by": app.deleted_by,
            "role": role_name,
        }
        app_payloads.append(app_payload)

    return app_payloads


@router.post("", response_model=AppResponse)
async def create_app(
    organization: str,
    payload: AppCreate,
    user: db.User = Depends(authuser),
) -> AppResponse:
    """Register a new app in the database and deploy it on the compute cluster."""
    app_slug = slugify(payload.name)

    org = await db.orgs.get(organization)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")
    if org.location_id is None:
        raise HTTPException(status_code=400, detail=f"Org '{organization}' has no location configured")

    registries = await db.compute.list()
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Create the app database schema before the workload starts.
    database_registries = await db.database.list()
    if not database_registries:
        raise HTTPException(status_code=503, detail="No database configured")

    registry = next((registry for registry in registries if registry.location_id == org.location_id), None)
    if registry is None:
        raise HTTPException(status_code=503, detail=f"No compute cluster configured for location '{org.location_id}'")
    compute = K8s(registry.kubeconfig, registry.ingress_name)

    database_registry = next((registry for registry in database_registries if registry.location_id == org.location_id), None)
    if database_registry is None:
        raise HTTPException(status_code=503, detail=f"No database configured for location '{org.location_id}'")
    database = Postgre(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
        database_registry.maintenance_database,
    )

    await compute.namespace(organization)
    await database.schema(organization, app_slug)

    # Deploy the app on the compute cluster.
    await compute.application(organization, app_slug, payload.image, APP_SERVICE_PORT, {})

    # Print the built image labels so operators can verify the app contract.
    image_specs = inspect_image_specs(payload.image)
    if image_specs is not None:
        print(json.dumps(image_specs, indent=2))

    try:
        app = await db.apps.create(
            organization,
            payload.name,
            app_slug,
            image=payload.image,
            icon=payload.icon,
            user=user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        **app.model_dump(),
        "created_by": user,
        "updated_by": user,
        "deleted_by": None,
    }


@router.delete("/{app_id}", status_code=204)
async def delete_app(
    organization: str,
    app_id: int,
    _user: db.User = Depends(authadmin),
) -> None:
    """Delete an app registration and remove it from the compute cluster."""

    app = await db.apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    org = await db.orgs.get(organization)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")
    if org.location_id is None:
        raise HTTPException(status_code=400, detail=f"Org '{organization}' has no location configured")

    registries = await db.compute.list()
    registry = next((registry for registry in registries if registry.location_id == org.location_id), None)
    if registry is not None:
        compute = K8s(registry.kubeconfig, registry.ingress_name)
        await compute.remove(organization, app.slug)

    try:
        await db.apps.delete(organization, app_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc

    return


@router.api_route("/{app_id}/proxy", methods=["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"])
@router.api_route("/{app_id}/proxy/{path:path}", methods=["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"])
async def proxy_app_request(app_id: int, request: Request, path: str = "", user: db.User = Depends(authuser)) -> Response:
    """Proxy one request into the deployed application service."""

    app = await db.apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")

    org_names = {org.name for org in user.orgs}
    if app.organization not in org_names:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{app.organization}' not found")

    org = await db.orgs.get(app.organization)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{app.organization}' not found")
    if org.location_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Org '{app.organization}' has no location configured")

    registries = await db.compute.list()
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    registry = next((registry for registry in registries if registry.location_id == org.location_id), None)
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{org.location_id}'",
        )

    # Load client certificate and key from the compute registry's kubeconfig.
    kc = yaml.safe_load(registry.kubeconfig)
    user_entry = kc["users"][0]["user"]
    cert_data = base64.b64decode(user_entry["client-certificate-data"]).decode()
    key_data = base64.b64decode(user_entry["client-key-data"]).decode()

    cert_path = key_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".crt", delete=False) as cf:
            cf.write(cert_data)
            cert_path = cf.name
        with tempfile.NamedTemporaryFile(mode="w", suffix=".key", delete=False) as kf:
            kf.write(key_data)
            key_path = kf.name

        upstream_path = path.lstrip("/")
        namespace = knames(app.organization, "Org")
        name = knames(app.slug, "Application name")
        api_host = kc["clusters"][0]["cluster"]["server"].rstrip("/").replace("://0.0.0.0", "://localhost")
        base = f"{api_host}/api/v1/namespaces/{namespace}/services/{name}:{APP_SERVICE_PORT}/proxy/"
        forward_headers = {
            key: value
            for key, value in request.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS
        }

        async with httpx.AsyncClient(
            cert=(cert_path, key_path),
            verify=False,
        ) as api_client:
            upstream_response = await api_client.request(
                request.method,
                f"{base}{upstream_path}",
                params=list(request.query_params.multi_items()),
                headers=forward_headers,
                content=await request.body(),
            )
    finally:
        for p in (cert_path, key_path):
            if p is not None:
                os.unlink(p)

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers={
            key: value
            for key, value in upstream_response.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length"
        },
    )
