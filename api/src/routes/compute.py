import src.db as db
from fastapi import HTTPException
from src.router import router
from src.models.computes import (ComputeUsageSummary, ComputeConfigSummary,
                                 ComputeContainerCreate,
                                 ComputeSummaryResponse,
                                 ComputeContainerCreateResponse)
from kubernetes.client.exceptions import ApiException


def _pod_name_from_app_key(app_key: str, container_name: str) -> str:
    app_normalized = ''.join(character for character in app_key.lower() if character.isalnum() or character in {'-', '.'}).strip('-.')
    container_normalized = ''.join(character for character in container_name.lower() if character.isalnum() or character in {'-', '.'}).strip('-.')

    if not app_normalized or not container_normalized:
        raise ValueError('App key and container name must include valid lowercase characters')

    pod_name = f'{app_normalized}-{container_normalized}'
    return pod_name[:63].rstrip('-.')


@router.get('/compute')
async def get_compute_summary() -> ComputeSummaryResponse:
    try:
        config = db.computes.get_config()
    except ValueError:
        return ComputeSummaryResponse(configured=False)

    usage = ComputeUsageSummary()
    try:
        measured = await db.computes.usage()
        usage = ComputeUsageSummary(
            running_pods=measured.running_pods,
            namespaces=measured.namespaces,
            free_bytes=measured.free_bytes,
        )
    except (ValueError, ApiException):
        usage = ComputeUsageSummary()

    return ComputeSummaryResponse(
        configured=True,
        config=ComputeConfigSummary(
            api_server_url=config.api_server_url,
            admin_username=config.admin_username,
            default_namespace=config.default_namespace,
            verify_ssl=config.verify_ssl,
        ),
        usage=usage,
    )


@router.post('/compute/apps/{app_id}/containers')
async def create_compute_container_for_app(
    app_id: str,
    payload: ComputeContainerCreate,
) -> ComputeContainerCreateResponse:
    app = await db.apps.get_by_uuid(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")

    try:
        config = db.computes.get_config()
        namespace = payload.namespace or config.default_namespace
        pod_name = _pod_name_from_app_key(app.key, payload.container_name)
        await db.computes.create_container(
            namespace=namespace,
            pod_name=pod_name,
            image=payload.image,
            command=payload.command,
            args=payload.args,
            env={item.name: item.value for item in payload.env},
            container_port=payload.container_port,
        )
    except ValueError as error:
        detail = str(error)
        status_code = 400
        if 'not configured' in detail:
            status_code = 503
        raise HTTPException(status_code=status_code, detail=detail) from error
    except ApiException as error:
        detail = error.body or str(error)
        raise HTTPException(status_code=502, detail=f'Unable to create container: {detail}') from error

    return ComputeContainerCreateResponse(
        app_id=app.id,
        app_key=app.key,
        namespace=namespace,
        pod_name=pod_name,
        image=payload.image,
    )
